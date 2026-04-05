import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI } from "@google/genai";
import { createClient } from "@supabase/supabase-js";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import "dotenv/config";

// Optional fallback for Vercel CJS build vs ESM
let currentFileName = "";
let currentDirName = "";
try {
  currentFileName = fileURLToPath(import.meta.url);
  currentDirName = path.dirname(currentFileName);
} catch (e) {
  currentFileName = __filename;
  currentDirName = __dirname;
}

const app = express();

async function setupApp() {
  const PORT = 3000;

  app.use(helmet({ contentSecurityPolicy: false })); // Disabled CSP for React hot-reloading in dev
  app.use(cors({
    origin: process.env.APP_URL || 'http://localhost:3000',
    credentials: true,
  }));
  app.use(express.json({ limit: '10mb' }));

  // ── General Rate Limiting: All API endpoints ──
  const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 წუთი
    max: 200,
    message: { error: 'ძალიან ბევრი მოთხოვნა. გთხოვთ მოგვიანებით სცადოთ.' },
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use('/api/', generalLimiter);

  // Safely initialize Supabase clients
  let supabase: any = null;
  let supabaseAdmin: any = null;
  
  try {
    if (process.env.VITE_SUPABASE_URL && process.env.VITE_SUPABASE_ANON_KEY) {
      supabase = createClient(
        process.env.VITE_SUPABASE_URL,
        process.env.VITE_SUPABASE_ANON_KEY
      );
    }
    
    if (process.env.VITE_SUPABASE_URL && (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY)) {
      supabaseAdmin = createClient(
        process.env.VITE_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || "",
        { auth: { autoRefreshToken: false, persistSession: false } }
      );
    }
  } catch (err) {
    console.error("Failed to initialize Supabase clients:", err);
  }

  // Gemini AI Instance
  const genAI = new GoogleGenAI({ 
    apiKey: process.env.GEMINI_API_KEY || "dummy-key-to-prevent-crash"
  });

  // Helper: Extract user from Authorization header
  const getUserFromToken = async (req: any) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) return null;
    return user;
  };

  // Helper: Check if user is admin
  const isUserAdmin = async (userId: string) => {
    const { data } = await supabaseAdmin.from('profiles').select('role').eq('id', userId).single();
    return data?.role === 'admin';
  };

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Rate Limiting for AI Endpoint
  const aiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // limit each IP to 20 requests per windowMs
    message: { error: "დღიური ლიმიტი ამოიწურა, სცადეთ 15 წუთში" }
  });

  // ── Auth & Profile APIs ──

  // Get current user's profile
  app.get("/api/auth/profile", async (req, res) => {
    try {
      const user = await getUserFromToken(req);
      if (!user) return res.status(401).json({ error: "არაავტორიზებული მოთხოვნა" });

      const { data, error } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      res.json({ profile: data });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "პროფილის მიღება ვერ მოხერხდა" });
    }
  });

  // ── Admin: Invite Consultant ──
  app.post("/api/admin/invite", async (req, res) => {
    try {
      const user = await getUserFromToken(req);
      if (!user) return res.status(401).json({ error: "არაავტორიზებული მოთხოვნა" });

      // Check admin role
      const admin = await isUserAdmin(user.id);
      if (!admin) return res.status(403).json({ error: "მხოლოდ ადმინისტრატორს შეუძლია მოწვევის გაგზავნა" });

      const { email, role = 'consultant' } = req.body;
      if (!email) return res.status(400).json({ error: "ელ. ფოსტა სავალდებულოა" });

      // Check if email is already registered
      const { data: existingProfile } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('email', email)
        .single();

      if (existingProfile) {
        return res.status(400).json({ error: "ეს ელ. ფოსტა უკვე დარეგისტრირებულია სისტემაში" });
      }

      // Check if invitation already exists  
      const { data: existingInvite } = await supabaseAdmin
        .from('invitations')
        .select('id')
        .eq('email', email)
        .eq('status', 'pending')
        .single();

      if (existingInvite) {
        return res.status(400).json({ error: "ამ ელ. ფოსტაზე უკვე გაგზავნილია მოწვევა" });
      }

      // Create invitation record
      const { error: inviteError } = await supabaseAdmin
        .from('invitations')
        .insert({
          email,
          role: role || 'consultant',
          invited_by: user.id,
        });

      if (inviteError) throw inviteError;

      // Try to send Supabase Auth invite email
      if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
        const { error: authError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
          data: { role: role || 'consultant', invited_by: user.id },
          redirectTo: `${process.env.VITE_SUPABASE_URL ? req.headers.origin : 'http://localhost:3000'}/admin`,
        });
        
        if (authError) {
          console.error("Auth invite error:", authError.message);
          // Don't fail - invitation record is created, admin can share link manually
        }
      } else {
        console.warn("SUPABASE_SERVICE_ROLE_KEY not set - invitation record created but email not sent");
      }

      res.json({ 
        success: true, 
        message: `მოწვევა გაიგზავნა: ${email}` 
      });
    } catch (error: any) {
      console.error("Invite Error:", error);
      res.status(500).json({ error: error.message || "მოწვევის გაგზავნა ვერ მოხერხდა" });
    }
  });

  // ── Checkout / Orders API ──
  app.post("/api/orders/create", async (req, res) => {
    try {
      const { customerInfo, items, paymentMethod, paymentType } = req.body;

      if (!customerInfo || !items || items.length === 0) {
        return res.status(400).json({ error: "არასწორი მოთხოვნა: მონაცემები აკლია" });
      }

      // Check prices against database to prevent fake pricing client-side
      let calculatedTotal = 0;
      const validItems = [];

      for (const item of items) {
        // Find product strictly from supabase
        const { data: product } = await supabase
          .from("products")
          .select("id, name, price")
          .eq("id", item.product.id)
          .single();

        if (!product) {
          return res.status(404).json({ error: `პროდუქტი ვერ მოიძებნა ბაზაში (ID: ${item.product.id})` });
        }

        // Add to total cost
        calculatedTotal += product.price * item.quantity;
        
        validItems.push({
          product_id: product.id,
          product_name: product.name,
          quantity: item.quantity,
          price_at_purchase: product.price
        });
      }

      // 1. Create Order using Admin privileges to bypass Row Level Security if necessary, or just insert
      const { data: orderData, error: orderError } = await supabaseAdmin
        .from('orders')
        .insert([{
          customer_type: customerInfo.customerType,
          personal_id: customerInfo.customerType === 'physical' ? customerInfo.personalId : null,
          company_id: customerInfo.customerType === 'legal' ? customerInfo.companyId : null,
          customer_first_name: customerInfo.firstName,
          customer_last_name: customerInfo.lastName,
          customer_phone: customerInfo.phone,
          customer_email: customerInfo.email || null,
          customer_address: customerInfo.address,
          customer_city: customerInfo.city,
          customer_note: customerInfo.note || null,
          total_price: calculatedTotal,
          payment_method: paymentMethod,
          payment_type: paymentType,
          status: 'pending'
        }])
        .select()
        .single();

      if (orderError) throw orderError;

      // 2. Create Order Items
      const orderItemsInsert = validItems.map(item => ({
        ...item,
        order_id: orderData.id,
      }));

      const { error: itemsError } = await supabaseAdmin
        .from('order_items')
        .insert(orderItemsInsert);

      if (itemsError) throw itemsError;

      res.json({ success: true, orderId: orderData.id, total_price: calculatedTotal });
    } catch (error: any) {
      console.error("Order Creation Error:", error);
      res.status(500).json({ error: "შეკვეთის გაფორმებისას დაფიქსირდა შეცდომა." });
    }
  });

  // ── Admin: List consultants ──
  app.get("/api/admin/consultants", async (req, res) => {
    try {
      const user = await getUserFromToken(req);
      if (!user) return res.status(401).json({ error: "არაავტორიზებული მოთხოვნა" });

      const admin = await isUserAdmin(user.id);
      if (!admin) return res.status(403).json({ error: "წვდომა აკრძალულია" });

      const [profilesRes, invitationsRes] = await Promise.all([
        supabaseAdmin.from('profiles').select('*').in('role', ['admin', 'consultant']).order('created_at', { ascending: false }),
        supabaseAdmin.from('invitations').select('*').order('created_at', { ascending: false }),
      ]);

      res.json({
        profiles: profilesRes.data || [],
        invitations: invitationsRes.data || [],
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "მონაცემების მიღება ვერ მოხერხდა" });
    }
  });

  // ══════════════════════════════════════════════
  // ── BOG (Bank of Georgia) Payment Integration ──
  // ══════════════════════════════════════════════

  // BOG OAuth Token
  async function getBOGToken(): Promise<string> {
    const response = await fetch(
      'https://oauth2.bog.ge/auth/realms/bog/protocol/openid-connect/token',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: process.env.BOG_CLIENT_ID!,
          client_secret: process.env.BOG_CLIENT_SECRET!,
        }),
      }
    );
    const data = await response.json();
    if (!data.access_token) throw new Error('BOG Token მიღება ვერ მოხერხდა');
    return data.access_token;
  }

  // BOG Payment — სრული გადახდა
  app.post("/api/pay/bog", async (req, res) => {
    try {
      const { orderId, amount, redirectUrl } = req.body;

      if (!process.env.BOG_CLIENT_ID || !process.env.BOG_CLIENT_SECRET) {
        return res.status(503).json({ error: 'BOG გადახდა დროებით მიუწვდომელია' });
      }

      const token = await getBOGToken();

      const orderResponse = await fetch(
        'https://api.bog.ge/payments/v1/ecommerce/orders',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            callback_url: `${process.env.APP_URL || 'http://localhost:3000'}/api/pay/bog/callback`,
            external_order_id: orderId,
            purchase_units: {
              currency: 'GEL',
              total_amount: amount,
              basket: [{ quantity: 1, unit_price: amount, product_id: orderId }],
            },
            redirect_urls: {
              fail: `${redirectUrl || process.env.APP_URL}?status=failed`,
              success: `${redirectUrl || process.env.APP_URL}/payment/success?orderId=${orderId}`,
            },
          }),
        }
      );

      const orderData = await orderResponse.json();

      if (!orderResponse.ok) {
        throw new Error(orderData.message || 'BOG შეკვეთის შექმნა ვერ მოხერხდა');
      }

      // Save payment record
      await supabaseAdmin.from('payments').insert({
        order_id: orderId,
        provider: 'bog',
        external_id: orderData.id,
        amount,
        status: 'pending',
      });

      res.json({
        success: true,
        redirectUrl: orderData._links?.redirect?.href,
      });
    } catch (error: any) {
      console.error('BOG Payment Error:', error);
      res.status(500).json({ error: error.message || 'BOG გადახდის ინიცირება ვერ მოხერხდა' });
    }
  });

  // BOG Callback (Webhook)
  app.post("/api/pay/bog/callback", async (req, res) => {
    try {
      const { order_id, status, external_order_id } = req.body;
      const isSuccess = status === 'completed';

      await supabaseAdmin
        .from('payments')
        .update({
          status: isSuccess ? 'paid' : 'failed',
          callback_data: req.body,
          paid_at: isSuccess ? new Date().toISOString() : null,
        })
        .eq('external_id', order_id);

      if (isSuccess) {
        await supabaseAdmin
          .from('orders')
          .update({ status: 'confirmed', payment_status: 'paid', payment_provider: 'bog' })
          .eq('id', external_order_id);

        // RS.GE ავტომატური ინვოისი (გააქტიურდება credentials-ის შემდეგ)
        await createRSInvoice(external_order_id);
      }

      res.status(200).json({ received: true });
    } catch (error) {
      console.error('BOG Callback Error:', error);
      res.status(500).json({ error: 'Callback processing failed' });
    }
  });

  // BOG განვადება (Installment)
  app.post("/api/pay/bog/installment", async (req, res) => {
    try {
      const { orderId, amount } = req.body;

      if (!process.env.BOG_CLIENT_ID || !process.env.BOG_CLIENT_SECRET) {
        return res.status(503).json({ error: 'BOG განვადება დროებით მიუწვდომელია' });
      }

      const token = await getBOGToken();

      const response = await fetch(
        'https://api.bog.ge/loans/v1/online-installments',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            external_order_id: orderId,
            loan_amount: amount,
            campaign_id: process.env.BOG_CAMPAIGN_ID || null,
            callback_url: `${process.env.APP_URL || 'http://localhost:3000'}/api/pay/bog/callback`,
            redirect_url: `${process.env.APP_URL || 'http://localhost:3000'}/payment/success?orderId=${orderId}`,
          }),
        }
      );

      const data = await response.json();

      await supabaseAdmin.from('payments').insert({
        order_id: orderId,
        provider: 'bog',
        external_id: data.id || data.application_id,
        amount,
        payment_type: 'installment',
        status: 'pending',
      });

      res.json({ success: true, redirectUrl: data.redirect_url });
    } catch (error: any) {
      console.error('BOG Installment Error:', error);
      res.status(500).json({ error: error.message || 'BOG განვადების ინიცირება ვერ მოხერხდა' });
    }
  });

  // ══════════════════════════════════════════════
  // ── TBC Bank (tpay) Payment Integration ──
  // ══════════════════════════════════════════════

  // TBC Token Cache (1 day validity)
  let tbcTokenCache: { token: string; expires: number } | null = null;

  async function getTBCToken(): Promise<string> {
    if (tbcTokenCache && Date.now() < tbcTokenCache.expires) {
      return tbcTokenCache.token;
    }

    const response = await fetch('https://api.tbcbank.ge/v1/tpay/access-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'apikey': process.env.TBC_API_KEY!,
      },
      body: new URLSearchParams({
        client_id: process.env.TBC_CLIENT_ID!,
        client_secret: process.env.TBC_CLIENT_SECRET!,
      }),
    });

    const data = await response.json();
    if (!data.access_token) throw new Error('TBC Token მიღება ვერ მოხერხდა');

    tbcTokenCache = {
      token: data.access_token,
      expires: Date.now() + (23 * 60 * 60 * 1000), // 23 საათი
    };
    return data.access_token;
  }

  // TBC Payment
  app.post("/api/pay/tbc", async (req, res) => {
    try {
      const { orderId, amount, methods = [5] } = req.body;
      // methods: 4=QR, 5=Card, 6=Ertguli, 7=Internet Bank, 8=Installment, 9=Apple Pay

      if (!process.env.TBC_CLIENT_ID || !process.env.TBC_API_KEY || !process.env.TBC_CLIENT_SECRET) {
        return res.status(503).json({ error: 'TBC გადახდა დროებით მიუწვდომელია' });
      }

      const token = await getTBCToken();

      const response = await fetch('https://api.tbcbank.ge/v1/tpay/payments', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'apikey': process.env.TBC_API_KEY!,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: { currency: 'GEL', total: amount, subTotal: amount, tax: 0, shipping: 0 },
          returnurl: `${process.env.APP_URL || 'http://localhost:3000'}/payment/success?orderId=${orderId}`,
          extra: orderId,
          expirationMinutes: 30,
          methods,
          installmentProducts: methods.includes(8) ? [{
            Price: amount,
            Quantity: 1,
            Name: 'Kale Group შეკვეთა',
          }] : undefined,
          callbackUrl: `${process.env.APP_URL || 'http://localhost:3000'}/api/pay/tbc/callback`,
        }),
      });

      const data = await response.json();

      await supabaseAdmin.from('payments').insert({
        order_id: orderId,
        provider: 'tbc',
        external_id: data.payId,
        amount,
        payment_type: methods.includes(8) ? 'installment' : 'full',
        status: 'pending',
      });

      const paymentRedirectUrl = data.links?.find((l: any) => l.rel === 'approval_url')?.uri;

      res.json({ success: true, redirectUrl: paymentRedirectUrl, payId: data.payId });
    } catch (error: any) {
      console.error('TBC Payment Error:', error);
      res.status(500).json({ error: error.message || 'TBC გადახდის ინიცირება ვერ მოხერხდა' });
    }
  });

  // TBC Callback
  app.post("/api/pay/tbc/callback", async (req, res) => {
    try {
      const { PayId, Status, Extra } = req.body;
      const isSuccess = Status === 'Succeeded';

      await supabaseAdmin
        .from('payments')
        .update({
          status: isSuccess ? 'paid' : 'failed',
          callback_data: req.body,
          paid_at: isSuccess ? new Date().toISOString() : null,
        })
        .eq('external_id', PayId);

      if (isSuccess) {
        await supabaseAdmin
          .from('orders')
          .update({ status: 'confirmed', payment_status: 'paid', payment_provider: 'tbc' })
          .eq('id', Extra);

        await createRSInvoice(Extra);
      }

      res.status(200).json({ received: true });
    } catch (error) {
      console.error('TBC Callback Error:', error);
      res.status(500).json({ error: 'Callback processing failed' });
    }
  });

  // ══════════════════════════════════════════════
  // ── Credo Bank განვადება ──
  // ══════════════════════════════════════════════

  app.post("/api/pay/credo", async (req, res) => {
    try {
      const { orderId, items, amount } = req.body;

      if (!process.env.CREDO_API_KEY) {
        return res.status(503).json({ error: 'Credo განვადება დროებით მიუწვდომელია' });
      }

      const response = await fetch('https://api.credobank.ge/v1/installments/initiate', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.CREDO_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          merchant_order_id: orderId,
          amount,
          currency: 'GEL',
          items: items?.map((i: any) => ({
            name: i.product_name,
            quantity: i.quantity,
            price: i.price_at_purchase || i.price,
          })) || [],
          callback_url: `${process.env.APP_URL || 'http://localhost:3000'}/api/pay/credo/callback`,
          success_url: `${process.env.APP_URL || 'http://localhost:3000'}/payment/success?orderId=${orderId}`,
          fail_url: `${process.env.APP_URL || 'http://localhost:3000'}/checkout?error=payment_failed`,
        }),
      });

      const data = await response.json();

      await supabaseAdmin.from('payments').insert({
        order_id: orderId,
        provider: 'credo',
        external_id: data.application_id,
        amount,
        payment_type: 'installment',
        status: 'pending',
      });

      res.json({ success: true, redirectUrl: data.redirect_url });
    } catch (error: any) {
      console.error('Credo Payment Error:', error);
      res.status(500).json({ error: error.message || 'Credo განვადების ინიცირება ვერ მოხერხდა' });
    }
  });

  // Credo Callback
  app.post("/api/pay/credo/callback", async (req, res) => {
    try {
      const { application_id, status, merchant_order_id } = req.body;
      const isSuccess = status === 'approved' || status === 'completed';

      await supabaseAdmin
        .from('payments')
        .update({
          status: isSuccess ? 'paid' : 'failed',
          callback_data: req.body,
          paid_at: isSuccess ? new Date().toISOString() : null,
        })
        .eq('external_id', application_id);

      if (isSuccess) {
        await supabaseAdmin
          .from('orders')
          .update({ status: 'confirmed', payment_status: 'paid', payment_provider: 'credo' })
          .eq('id', merchant_order_id);

        await createRSInvoice(merchant_order_id);
      }

      res.status(200).json({ received: true });
    } catch (error) {
      console.error('Credo Callback Error:', error);
      res.status(500).json({ error: 'Callback processing failed' });
    }
  });

  // ══════════════════════════════════════════════
  // ── RS.GE ინვოისის ავტომატური შექმნა ──
  // ══════════════════════════════════════════════
  async function createRSInvoice(orderId: string): Promise<void> {
    try {
      if (!process.env.RS_USERNAME || !process.env.RS_PASSWORD) {
        console.warn('RS.GE credentials not configured — skipping invoice creation');
        return;
      }

      // RS.GE SOAP ინტეგრაცია გააქტიურდება credentials-ის შემდეგ
      // იხ. kalegroup-fix/kale-group-full-integration-plan.md — ნაწილი 3
      const { data: order } = await supabaseAdmin
        .from('orders')
        .select(`*, order_items(*, products(*))`)
        .eq('id', orderId)
        .single();

      if (!order) {
        console.warn(`RS.GE: Order not found: ${orderId}`);
        return;
      }

      console.log(`RS.GE Invoice creation pending for order: ${orderId} — SOAP integration will be activated with RS.GE credentials`);

      // Placeholder record — will be updated when SOAP is wired
      await supabaseAdmin.from('rs_invoices').insert({
        order_id: orderId,
        status: 'pending',
        invoice_data: { note: 'Awaiting RS.GE SOAP integration' },
        created_at: new Date().toISOString(),
      });

    } catch (error) {
      console.error('RS.GE Invoice Error:', error);
      await supabaseAdmin.from('rs_invoice_errors').insert({
        order_id: orderId,
        error: String(error),
        created_at: new Date().toISOString(),
      });
    }
  }

  // Admin: RS.GE ინვოისის ხელახლა გაგზავნა
  app.post("/api/admin/rs/reinvoice/:orderId", async (req, res) => {
    try {
      const user = await getUserFromToken(req);
      if (!user || !(await isUserAdmin(user.id))) {
        return res.status(403).json({ error: 'წვდომა აკრძალულია' });
      }
      await createRSInvoice(req.params.orderId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // AI Chat Assistant Route
  app.post("/api/ai/chat", aiLimiter, async (req, res) => {
    try {
      const { userMessage, history } = req.body;

      if (!userMessage || userMessage.length > 1000) {
        return res.status(400).json({ error: "შეტყობინება ძალიან გრძელია ან ცარიელია." });
      }

      if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === "dummy-key-to-prevent-crash") {
        return res.status(500).json({ error: "API გასაღები არ არის დაყენებული (GEMINI_API_KEY)." });
      }

      if (!supabase) {
        return res.status(500).json({ error: "Supabase კავშირი არ არის დაყენებული (VITE_SUPABASE_URL)." });
      }

      // 1. Fetch real-time products for context
      const { data: products } = await supabase.from('products').select('name, price, category, material, in_stock');
      
      const productContext = products && products.length > 0 
        ? `CURRENT INVENTORY:\n${products.map((p: any) => `- ${p.name} (${p.category}): ${p.price} GEL, Material: ${p.material}, Stock: ${p.in_stock ? 'Yes' : 'No'}`).join('\n')}`
        : 'Inventory data is currently unavailable.';

      const SYSTEM_PROMPT = `შენ ხარ Kale Group-ის (kalegroup.ge) ექსპერტი AI ასისტენტი, პრესტიჟული და მაღალპროფესიონალური კონსულტანტი და ინტერიერის დიზაინერი. 

შენი მახასიათებლები:
- ტონი: პრესტიჟული, პროფესიონალური, მეგობრული და კრეატიული.
- ენა: მუდმივად პასუხობ ქართულად (გამართული და დახვეწილი ქართულით), თუმცა გესმის ინგლისური და რუსულიც.
- მიზანი: მომხმარებელს დაეხმარო ავეჯის შერჩევაში kalegroup.ge-ს არსებული ინვენტარის მიხედვით.

მკაცრი წესები:
1. გამოიყენე მხოლოდ ის პროდუქტები და ფასები, რაც ქვევით მოცემულია "LIVE INVENTORY" სექციაში. 
2. არასოდეს მოიგონო ფასები, პროდუქტები ან ფასდაკლებები. თუ რამე არ გვაქვს ბაზაში (ან მოთხოვნა ბუნდოვანია), შესთავაზე მსგავსი პროდუქტები ბაზიდან ან შესთავაზე მომხმარებელს ჩვენი საიტის კატალოგის დათვალიერება.
3. წაახალისე მომხმარებელი, რომ შეიძინოს პროდუქცია პირდაპირ kalegroup.ge-ს პლატფორმაზე. მიაწოდე ზუსტი ინფორმაცია ავეჯის მასალაზე და ხარისხზე.
4. იყავი მოკლე, კონკრეტული და დახვეწილი. ნუ დაწერ ზედმეტად გრძელ ესეებს.`;

      const contents = [
        ...history,
        {
          role: "user",
          parts: [{ text: userMessage }]
        }
      ];

      const result = await genAI.models.generateContent({
        model: "gemini-2.5-flash",
        contents: contents,
        config: {
          systemInstruction: `${SYSTEM_PROMPT}\n\n=== LIVE INVENTORY ===\n${productContext}\n======================`
        }
      });

      const responseText = result.candidates?.[0]?.content?.parts?.[0]?.text || 
                           "ბოდიშს გიხდით, პასუხის მომზადება ვერ მოხერხდა.";

      res.json({ text: responseText });
    } catch (error: any) {
      console.error("AI Chat Error:", error.message || error);
      const isQuotaError = error.status === 429 || (error.message && error.message.includes("429"));
      
      if (isQuotaError) {
        return res.status(429).json({ error: "Gemini API-ის დღიური ლიმიტი ამოიწურა (429). გთხოვთ, გამოიყენოთ სხვა API გასაღები ან სცადოთ მოგვიანებით." });
      }
      
      res.status(500).json({ error: "ჩეთთან დაკავშირება ვერ მოხერხდა. გთხოვთ, სცადოთ მოგვიანებით." });
    }
  });

  // AI Image Generator Route
  app.post("/api/ai/generate-image", async (req, res) => {
    try {
      const { aiPrompt, uploadedRoomImage } = req.body;

      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error: "AI API key is missing on the server." });
      }

      if (!aiPrompt || !aiPrompt.trim()) {
        return res.status(400).json({ error: "Prompt is required." });
      }

      const parts: any[] = [];
      
      if (uploadedRoomImage) {
        parts.push({ inlineData: { data: uploadedRoomImage.data, mimeType: uploadedRoomImage.mimeType } });
        parts.push({ text: `Add the following furniture to this room: ${aiPrompt}. Make it look realistic, matching the lighting and perspective of the room.` });
      } else {
        parts.push({ text: `A high quality furniture photography of: ${aiPrompt}. Photorealistic, interior design, studio lighting.` });
      }

      const response = await genAI.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts }
      });

      let foundImage = false;
      let generatedImage = null;

      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          const base64EncodeString = part.inlineData.data;
          const mimeType = part.inlineData.mimeType || 'image/png';
          generatedImage = `data:${mimeType};base64,${base64EncodeString}`;
          foundImage = true;
          break;
        }
      }
      
      if (!foundImage || !generatedImage) {
        return res.status(500).json({ error: "სურათის გენერაცია ვერ მოხერხდა. სცადეთ თავიდან." });
      }

      res.json({ generatedImage });
    } catch (error) {
      console.error("AI Image Generation Error:", error);
      res.status(500).json({ error: "დაფიქსირდა შეცდომა გენერაციისას. სცადეთ მოგვიანებით." });
    }
  });

  // Handle front-end static files or Vite only if NOT running as Vercel serverless function
  if (!process.env.VERCEL) {
    if (process.env.NODE_ENV !== "production") {
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } else {
      const distPath = path.join(currentDirName, "dist");
      app.use(express.static(distPath));
      app.get("*", (req, res) => {
        res.sendFile(path.join(distPath, "index.html"));
      });
    }

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }
}

setupApp();

export default app;
