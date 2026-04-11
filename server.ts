import express from "express";
import crypto from "crypto";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI } from "@google/genai";
import { createClient } from "@supabase/supabase-js";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import "dotenv/config";
import { autoCreateAndSendEInvoice } from './src/services/rsge/rsge.service.js';

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
  console.log(`[Server] Starting in ${process.env.NODE_ENV || 'development'} mode...`);
  console.log(`[Server] Directory: ${currentDirName}`);

  app.use(helmet({ contentSecurityPolicy: false })); // Disabled CSP for React hot-reloading in dev
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:5173',
    'https://kalegroup.vercel.app',
    process.env.APP_URL,
  ].filter(Boolean);

  app.use(cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g., curl, Postman, same-origin Vercel serverless)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      callback(null, true); // permissive on Vercel — tighten if needed
    },
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
        // Find product strictly from supabase — including sale fields to correctly apply discounts
        const { data: product } = await supabase
          .from("products")
          .select("id, name, price, is_on_sale, sale_price")
          .eq("id", item.product.id)
          .single();

        if (!product) {
          return res.status(404).json({ error: `პროდუქტი ვერ მოიძებნა ბაზაში (ID: ${item.product.id})` });
        }

        // Use sale_price if product is on sale and has a valid sale_price (mirrors frontend getEffectivePrice logic)
        const effectivePrice =
          product.is_on_sale && product.sale_price != null && product.sale_price > 0
            ? product.sale_price
            : product.price;

        // Add to total cost using effective (discounted) price
        calculatedTotal += effectivePrice * item.quantity;
        
        validItems.push({
          product_id: product.id,
          product_name: product.name,
          quantity: item.quantity,
          price_at_purchase: effectivePrice,  // records the actual price paid (sale or regular)
          is_promotional_sale: product.is_on_sale && product.sale_price != null && product.sale_price > 0
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

      // Ensure HTTPS and non-localhost for BOG Validation
      const isDev = !process.env.NODE_ENV || process.env.NODE_ENV === 'development';
      const baseUrl = isDev ? 'https://kalegroup.vercel.app' : (process.env.APP_URL || 'https://kalegroup.ge').replace(/^http:/, 'https:');
      const safeRedirectUrl = isDev ? 'https://kalegroup.vercel.app' : (redirectUrl || baseUrl).replace(/^http:/, 'https:');

      const orderResponse = await fetch(
        'https://api.bog.ge/payments/v1/ecommerce/orders',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept-Language': 'ka',
          },
          body: JSON.stringify({
            callback_url: `${baseUrl}/api/pay/bog/callback`,
            external_order_id: orderId,
            purchase_units: {
              currency: 'GEL',
              total_amount: amount,
              basket: [{ quantity: 1, unit_price: amount, product_id: orderId }],
            },
            redirect_urls: {
              fail: `${safeRedirectUrl}?status=failed`,
              success: `${safeRedirectUrl}/payment/success?orderId=${orderId}`,
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

  // ══════════════════════════════════════════════
  // ── Webhook Verification Helpers ──
  // ══════════════════════════════════════════════

  function getClientIp(req: any): string {
    return (
      req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
      req.connection?.remoteAddress ||
      req.ip ||
      ''
    );
  }

  function verifyBogCallback(req: any): boolean {
    if (!process.env.BOG_CLIENT_SECRET) return true;
    const signature = req.headers['callback-signature'] || req.headers['x-bog-signature'];
    if (!signature) {
      console.warn('[BOG Callback] No signature header — will verify via DB lookup');
      return true;
    }
    try {
      const payload = JSON.stringify(req.body);
      const expectedSig = crypto
        .createHmac('sha256', process.env.BOG_CLIENT_SECRET!)
        .update(payload)
        .digest('hex');
      return crypto.timingSafeEqual(
        Buffer.from(signature, 'hex'),
        Buffer.from(expectedSig, 'hex')
      );
    } catch {
      return false;
    }
  }

  async function verifyPaymentExists(externalId: string, provider: string): Promise<boolean> {
    const { data } = await supabaseAdmin
      .from('payments')
      .select('id')
      .eq('external_id', externalId)
      .eq('provider', provider)
      .eq('status', 'pending')
      .single();
    return !!data;
  }

  // BOG Callback (Webhook) — with signature + DB verification
  app.post("/api/pay/bog/callback", async (req, res) => {
    try {
      if (!verifyBogCallback(req)) {
        console.error('[BOG Callback] Signature verification FAILED from IP:', getClientIp(req));
        return res.status(403).json({ error: 'Invalid callback signature' });
      }

      const { order_id, status, external_order_id } = req.body;

      const paymentValid = await verifyPaymentExists(order_id, 'bog');
      if (!paymentValid) {
        console.error('[BOG Callback] Unknown payment external_id:', order_id);
        return res.status(404).json({ error: 'Payment not found' });
      }

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
        await processSuccessfulOrder(external_order_id, 'bog');
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

      // Ensure HTTPS and non-localhost for BOG Validation
      const isDev = !process.env.NODE_ENV || process.env.NODE_ENV === 'development';
      const baseUrl = isDev ? 'https://kalegroup.vercel.app' : (process.env.APP_URL || 'https://kalegroup.ge').replace(/^http:/, 'https:');

      const response = await fetch(
        'https://api.bog.ge/loans/v1/online-installments',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept-Language': 'ka',
          },
          body: JSON.stringify({
            external_order_id: orderId,
            loan_amount: amount,
            campaign_id: process.env.BOG_CAMPAIGN_ID || null,
            callback_url: `${baseUrl}/api/pay/bog/callback`,
            redirect_url: `${baseUrl}/payment/success?orderId=${orderId}`,
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

  // TBC Callback — with DB verification
  app.post("/api/pay/tbc/callback", async (req, res) => {
    try {
      const { PayId, Status, Extra } = req.body;

      const paymentValid = await verifyPaymentExists(PayId, 'tbc');
      if (!paymentValid) {
        console.error('[TBC Callback] Unknown payment PayId:', PayId);
        return res.status(404).json({ error: 'Payment not found' });
      }

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
        await processSuccessfulOrder(Extra, 'tbc');
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

  // Credo Callback — with DB verification
  app.post("/api/pay/credo/callback", async (req, res) => {
    try {
      const { application_id, status, merchant_order_id } = req.body;

      const paymentValid = await verifyPaymentExists(application_id, 'credo');
      if (!paymentValid) {
        console.error('[Credo Callback] Unknown payment application_id:', application_id);
        return res.status(404).json({ error: 'Payment not found' });
      }

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
        await processSuccessfulOrder(merchant_order_id, 'credo');
      }

      res.status(200).json({ received: true });
    } catch (error) {
      console.error('Credo Callback Error:', error);
      res.status(500).json({ error: 'Callback processing failed' });
    }
  });

  // ══════════════════════════════════════════════
  // ── Auto Accounting & RS.GE Integration ──
  // ══════════════════════════════════════════════

  async function processSuccessfulOrder(orderId: string, provider: string): Promise<void> {
    try {
      // 1. Update Order Status
      await supabaseAdmin
        .from('orders')
        .update({ status: 'confirmed', payment_status: 'paid', payment_provider: provider })
        .eq('id', orderId);

      // 2. Fetch Order Details
      const { data: order } = await supabaseAdmin
        .from('orders')
        .select(`*, order_items(*, products(category, cost_price))`)
        .eq('id', orderId)
        .single();

      if (!order) return;

      // Ensure we don't double-process the journal
      const { data: existingJournal } = await supabaseAdmin
        .from('journal_entries')
        .select('id')
        .eq('reference_type', 'SALES_ORDER')
        .eq('reference_id', orderId)
        .single();
        
      if (existingJournal) return; // Already processed

      // 3. Create System Invoice for the Order
      const { data: currPeriod } = await supabaseAdmin.rpc('get_current_fiscal_period');
      
      const { data: invoice } = await supabaseAdmin
        .from('invoices')
        .insert({
          invoice_type: 'SALES',
          invoice_number: `INV-WEB-${orderId.substring(0,6).toUpperCase()}`,
          customer_id: null, // Web guest
          customer_name: `${order.customer_first_name} ${order.customer_last_name}`,
          invoice_date: new Date().toISOString().split('T')[0],
          due_date: new Date().toISOString().split('T')[0],
          total_amount: order.total_price,
          tax_amount: parseFloat((order.total_price * 0.18).toFixed(2)), // 18% VAT
          paid_amount: order.total_price,
          payment_status: 'PAID',
          fiscal_period_id: currPeriod,
          notes: `E-commerce order via ${provider}`
        })
        .select().single();

      if (invoice) {
        // Insert Invoice Items
        const invoiceItems = order.order_items.map((item: any) => ({
          invoice_id: invoice.id,
          product_id: item.product_id,
          description: item.product_name,
          quantity: item.quantity,
          unit_price: item.price_at_purchase,
          total_price: item.price_at_purchase * item.quantity,
          tax_rate: 18,
          tax_amount: parseFloat(((item.price_at_purchase * item.quantity) * 0.18).toFixed(2))
        }));
        await supabaseAdmin.from('invoice_items').insert(invoiceItems);
      }

      // 4. Generate Double-Entry Journal Document
      const totalAmount = order.total_price;
      const vatAmount = parseFloat((totalAmount * 0.18).toFixed(2));
      const revenueAmount = parseFloat((totalAmount - vatAmount).toFixed(2));
      
      // Calculate COGS (Cost of Goods Sold)
      let totalCogs = 0;
      order.order_items.forEach((item: any) => {
         const cost = item.products?.cost_price || 0;
         totalCogs += (cost * item.quantity);
      });

      // Fetch vital accounts
      const { data: accounts } = await supabaseAdmin.from('accounts').select('id, code').in('code', ['1110', '1610', '3330', '6110', '7110']);
      const accCash = accounts?.find((a: any) => a.code === '1110')?.id; // National Currency in Bank
      const accInventory = accounts?.find((a: any) => a.code === '1610')?.id; // Inventory
      const accVat = accounts?.find((a: any) => a.code === '3330')?.id; // VAT Payable
      const accRev = accounts?.find((a: any) => a.code === '6110')?.id; // Revenue from Sales
      const accCogs = accounts?.find((a: any) => a.code === '7110')?.id; // Cost of Goods Sold

      if (accCash && accInventory && accVat && accRev && accCogs) {
        // Create Posted Journal Entry
        const { data: journal } = await supabaseAdmin
          .from('journal_entries')
          .insert({
            entry_date: new Date().toISOString().split('T')[0],
            description: `SALE - E-commerce Order #${orderId.substring(0,8)}`,
            reference_type: 'SALES_ORDER',
            reference_id: orderId,
            fiscal_period_id: currPeriod,
            status: 'POSTED',
          })
          .select().single();

        if (journal) {
          const jLines = [
            // Cash Asset Increases (Debit)
            { journal_entry_id: journal.id, account_id: accCash, debit: totalAmount, credit: 0, description: 'Payment Received' },
            // Revenue Increases (Credit)
            { journal_entry_id: journal.id, account_id: accRev, debit: 0, credit: revenueAmount, description: 'Sales Revenue' },
            // VAT Payable Liability Increases (Credit)
            { journal_entry_id: journal.id, account_id: accVat, debit: 0, credit: vatAmount, description: 'VAT on Sale' },
          ];

          if (totalCogs > 0) {
            // COGS Expense Increases (Debit)
            jLines.push({ journal_entry_id: journal.id, account_id: accCogs, debit: totalCogs, credit: 0, description: 'Cost of Goods Sold' });
            // Inventory Asset Decreases (Credit)
            jLines.push({ journal_entry_id: journal.id, account_id: accInventory, debit: 0, credit: totalCogs, description: 'Inventory Out' });
            
            // Note: Inventory sync trigger usually handles stock_levels, but since this relies on manual `inventory_transactions`, we must create them!
            const invTx = order.order_items.map((item: any) => ({
              product_id: item.product_id,
              quantity: item.quantity,
              transaction_type: 'SALE_OUT',
              unit_cost: item.products?.cost_price || 0,
              total_cost: (item.products?.cost_price || 0) * item.quantity,
              reference_type: 'SALES_ORDER',
              reference_id: orderId,
              notes: `Order fulfillment via Website`,
              fiscal_period_id: currPeriod
            }));
            await supabaseAdmin.from('inventory_transactions').insert(invTx);
            
            // The `sync_stock_levels` trigger on `inventory_transactions` will automatically decrement stock_levels.
          }
          
          await supabaseAdmin.from('journal_lines').insert(jLines);
        }
      }
      // 5. Fire RS.GE Logic (Phase 4 Integration)
      try {
        if (invoice) {
          const rsgeResult = await autoCreateAndSendEInvoice(orderId, invoice.id);
          console.log('[RS.ge]', rsgeResult.success ? '✅' : '❌', rsgeResult.message);
        }
      } catch (rsgeErr) {
        // RS.ge failure MUST NOT block the order confirmation
        console.error('[RS.ge] Non-blocking error:', rsgeErr);
      }

    } catch (err) {
      console.error("Auto Accounting Error for Order:", orderId, err);
    }
  }

  // Admin: RS.GE ინვოისის ხელახლა გაგზავნა
  app.post("/api/admin/rs/reinvoice/:orderId", async (req, res) => {
    try {
      const user = await getUserFromToken(req);
      if (!user || !(await isUserAdmin(user.id))) {
        return res.status(403).json({ error: 'წვდომა აკრძალულია' });
      }
      const invoice = await supabaseAdmin.from('invoices').select('id').eq('order_id', req.params.orderId).single();
      if (!invoice.data?.id) return res.status(404).json({ error: 'ინვოისი ვერ მოიძებნა' });
      const result = await autoCreateAndSendEInvoice(req.params.orderId, invoice.data.id);
      res.json({ success: result.success, message: result.message });
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

  // ══════════════════════════════════════════════════════════
  // ── ACCOUNTING MODULE API ROUTES ──
  // ══════════════════════════════════════════════════════════

  // Middleware: check accountant or admin role
  const requireAccounting = async (req: any, res: any, next: any) => {
    const user = await getUserFromToken(req);
    if (!user) return res.status(401).json({ error: 'არაავტორიზებული მოთხოვნა' });
    const { data: profile } = await supabaseAdmin.from('profiles').select('role').eq('id', user.id).single();
    if (!profile || !['admin', 'accountant'].includes(profile.role)) {
      return res.status(403).json({ error: 'ბუღალტერიის მოდულზე წვდომა შეზღუდულია' });
    }
    req.userProfile = profile;
    req.userId = user.id;
    next();
  };

  const requireAccountingRead = async (req: any, res: any, next: any) => {
    const user = await getUserFromToken(req);
    if (!user) return res.status(401).json({ error: 'არაავტორიზებული მოთხოვნა' });
    const { data: profile } = await supabaseAdmin.from('profiles').select('role').eq('id', user.id).single();
    if (!profile || !['admin', 'accountant', 'consultant'].includes(profile.role)) {
      return res.status(403).json({ error: 'წვდომა შეზღუდულია' });
    }
    req.userProfile = profile;
    req.userId = user.id;
    next();
  };

  // ── B1: Dashboard KPI ──
  app.get('/api/accounting/dashboard', requireAccountingRead, async (req: any, res) => {
    try {
      const [
        revenueRes, cogsRes, invoicesRes, stockRes, vatRes, paymentBreakdownRes, promoSalesRes
      ] = await Promise.all([
        supabaseAdmin.from('v_profit_loss').select('account_type,amount').eq('account_type', 'REVENUE'),
        supabaseAdmin.from('v_profit_loss').select('account_type,amount').eq('account_type', 'COGS'),
        supabaseAdmin.from('invoices').select('total_amount, paid_amount, payment_status').eq('payment_status', 'PAID'),
        supabaseAdmin.from('stock_levels').select('total_cost_value'),
        supabaseAdmin.from('v_vat_summary').select('net_vat_payable').order('period_year', { ascending: false }).order('period_month', { ascending: false }).limit(1),
        // Payment method breakdown from orders
        supabaseAdmin
          .from('orders')
          .select('payment_method, total_price, status')
          .in('status', ['delivered', 'confirmed', 'completed']),
        supabaseAdmin.from('order_items').select('price_at_purchase, quantity').eq('is_promotional_sale', true)
      ]);

      const revenue = (revenueRes.data || []).reduce((s: number, r: any) => s + Number(r.amount || 0), 0);
      const cogs = (cogsRes.data || []).reduce((s: number, r: any) => s + Number(r.amount || 0), 0);
      const grossProfit = revenue - cogs;
      const grossMarginPct = revenue > 0 ? ((grossProfit / revenue) * 100).toFixed(1) : '0.0';
      const totalPaidRevenue = (invoicesRes.data || []).reduce((s: number, r: any) => s + Number(r.total_amount || 0), 0);
      const inventoryValue = (stockRes.data || []).reduce((s: number, r: any) => s + Number(r.total_cost_value || 0), 0);
      const latestVatPayable = vatRes.data?.[0]?.net_vat_payable || 0;
      const promotionalSales = (promoSalesRes?.data || []).reduce((sum: number, item: any) => sum + ((Number(item.price_at_purchase) || 0) * (Number(item.quantity) || 1)), 0);

      // Compute payment method breakdown
      const orders = paymentBreakdownRes.data || [];
      const paymentBreakdown: Record<string, { count: number; total: number }> = {
        cash: { count: 0, total: 0 },
        card: { count: 0, total: 0 },
        bank_transfer: { count: 0, total: 0 },
        installment: { count: 0, total: 0 },
        other: { count: 0, total: 0 },
      };
      for (const o of orders) {
        const method = o.payment_method || 'other';
        const key = method in paymentBreakdown ? method : 'other';
        paymentBreakdown[key].count += 1;
        paymentBreakdown[key].total += Number(o.total_price || 0);
      }

      // Monthly summary for chart
      const { data: monthlySummary } = await supabaseAdmin.from('v_monthly_summary').select('*').order('year').order('month');

      res.json({
        kpis: {
          revenue: revenue.toFixed(2),
          cogs: cogs.toFixed(2),
          grossProfit: grossProfit.toFixed(2),
          grossMarginPct,
          netProfit: (grossProfit - 0).toFixed(2), // OPEX will be subtracted when available
          totalPaidRevenue: totalPaidRevenue.toFixed(2),
          inventoryValue: inventoryValue.toFixed(2),
          vatPayable: Number(latestVatPayable).toFixed(2),
          promotionalSales: promotionalSales.toFixed(2),
        },
        paymentBreakdown,
        monthlySummary: monthlySummary || [],
      });
    } catch (err: any) {
      console.error('Accounting Dashboard Error:', err);
      res.status(500).json({ error: err.message || 'Dashboard მონაცემების მიღება ვერ მოხერხდა' });
    }
  });

  // ── B2: Journal Entries ──

  // List journal entries
  app.get('/api/accounting/journal-entries', requireAccountingRead, async (req: any, res) => {
    try {
      const { period_id, status, type, page = '1', limit = '20' } = req.query;
      let query = supabaseAdmin
        .from('journal_entries')
        .select('*, journal_lines(*, accounts(code, name_ka)), fiscal_periods(name)')
        .order('entry_date', { ascending: false })
        .range((Number(page) - 1) * Number(limit), Number(page) * Number(limit) - 1);

      if (period_id) query = query.eq('fiscal_period_id', period_id);
      if (status) query = query.eq('status', status);
      if (type) query = query.eq('reference_type', type);

      const { data, error, count } = await query;
      if (error) throw error;
      res.json({ entries: data || [], total: count || 0 });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'ჟურნალის მიღება ვერ მოხერხდა' });
    }
  });

  // Get single journal entry
  app.get('/api/accounting/journal-entries/:id', requireAccountingRead, async (req: any, res) => {
    try {
      const { data, error } = await supabaseAdmin
        .from('journal_entries')
        .select('*, journal_lines(*, accounts(code, name_ka, account_type)), fiscal_periods(name, status)')
        .eq('id', req.params.id)
        .single();
      if (error) throw error;
      res.json({ entry: data });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Create journal entry (DRAFT)
  app.post('/api/accounting/journal-entries', requireAccounting, async (req: any, res) => {
    try {
      const { entry_date, description, reference_type, reference_id, fiscal_period_id, lines } = req.body;
      if (!lines || lines.length < 2) return res.status(400).json({ error: 'მინიმუმ 2 ხაზი სავალდებულოა' });

      // Validate period is open
      const { data: period } = await supabaseAdmin.from('fiscal_periods').select('status').eq('id', fiscal_period_id).single();
      if (period?.status === 'LOCKED') return res.status(400).json({ error: 'ფისკალური პერიოდი დახურულია' });

      const { data: entry, error: entryError } = await supabaseAdmin
        .from('journal_entries')
        .insert({ entry_date, description, reference_type, reference_id, fiscal_period_id, created_by: req.userId })
        .select().single();
      if (entryError) throw entryError;

      const linesInsert = lines.map((l: any) => ({ ...l, journal_entry_id: entry.id }));
      const { error: linesError } = await supabaseAdmin.from('journal_lines').insert(linesInsert);
      if (linesError) throw linesError;

      res.json({ success: true, entry_id: entry.id, entry_number: entry.entry_number });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'ჩანაწერის შექმნა ვერ მოხერხდა' });
    }
  });

  // Post or Reverse journal entry
  app.patch('/api/accounting/journal-entries/:id', requireAccounting, async (req: any, res) => {
    try {
      const { action } = req.body; // 'post' | 'reverse'
      if (!['post', 'reverse'].includes(action)) return res.status(400).json({ error: 'მოქმედება არასწორია' });

      if (action === 'post') {
        const { data, error } = await supabaseAdmin
          .from('journal_entries')
          .update({ status: 'POSTED', posted_by: req.userId })
          .eq('id', req.params.id)
          .select().single();
        if (error) throw error;
        res.json({ success: true, entry: data });
      } else {
        // Reverse: create a counter-entry
        const { data: original } = await supabaseAdmin
          .from('journal_entries')
          .select('*, journal_lines(*)')
          .eq('id', req.params.id).single();
        if (!original || original.status !== 'POSTED') return res.status(400).json({ error: 'მხოლოდ posted ჩანაწ. შეიძლება გაუქმება' });

        const { data: reversal, error: rErr } = await supabaseAdmin
          .from('journal_entries')
          .insert({
            entry_date: new Date().toISOString().split('T')[0],
            description: `[გაუქმება] ${original.description}`,
            reference_type: 'ADJUSTMENT',
            reference_id: original.id,
            fiscal_period_id: original.fiscal_period_id,
            created_by: req.userId,
          }).select().single();
        if (rErr) throw rErr;

        const reversalLines = (original.journal_lines || []).map((l: any) => ({
          journal_entry_id: reversal.id,
          account_id: l.account_id,
          debit: l.credit,
          credit: l.debit,
          currency: l.currency,
          description: `[გაუქმება] ${l.description || ''}`,
        }));
        await supabaseAdmin.from('journal_lines').insert(reversalLines);

        // Mark original as reversed
        await supabaseAdmin.from('journal_entries').update({ status: 'REVERSED', reversed_by: reversal.id }).eq('id', req.params.id);
        await supabaseAdmin.from('journal_entries').update({ status: 'POSTED', posted_by: req.userId }).eq('id', reversal.id);

        res.json({ success: true, reversal_id: reversal.id, reversal_number: reversal.entry_number });
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'ოპერაცია ვერ მოხერხდა' });
    }
  });

  // ── B3: Invoices ──

  app.get('/api/accounting/invoices', requireAccountingRead, async (req: any, res) => {
    try {
      const { type, status, page = '1', limit = '20' } = req.query;
      let query = supabaseAdmin
        .from('invoices')
        .select('*, invoice_items(*)')
        .order('invoice_date', { ascending: false })
        .range((Number(page) - 1) * Number(limit), Number(page) * Number(limit) - 1);
      if (type) query = query.eq('invoice_type', type);
      if (status) query = query.eq('payment_status', status);
      const { data, error } = await query;
      if (error) throw error;
      res.json({ invoices: data || [] });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/accounting/invoices/:id', requireAccountingRead, async (req: any, res) => {
    try {
      const { data, error } = await supabaseAdmin
        .from('invoices')
        .select('*, invoice_items(*)')
        .eq('id', req.params.id).single();
      if (error) throw error;
      res.json({ invoice: data });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── B4: Inventory ──

  app.get('/api/accounting/inventory/levels', requireAccountingRead, async (req: any, res) => {
    try {
      const { data, error } = await supabaseAdmin
        .from('stock_levels')
        .select('*, products(name, category)')
        .order('updated_at', { ascending: false });
      if (error) throw error;
      res.json({ levels: data || [] });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/accounting/inventory/transactions', requireAccountingRead, async (req: any, res) => {
    try {
      const { product_id, type, page = '1', limit = '30' } = req.query;
      let query = supabaseAdmin
        .from('inventory_transactions')
        .select('*, products(name)')
        .order('created_at', { ascending: false })
        .range((Number(page) - 1) * Number(limit), Number(page) * Number(limit) - 1);
      if (product_id) query = query.eq('product_id', product_id);
      if (type) query = query.eq('transaction_type', type);
      const { data, error } = await query;
      if (error) throw error;
      res.json({ transactions: data || [] });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/accounting/inventory/adjustment', requireAccounting, async (req: any, res) => {
    try {
      const { product_id, quantity, type, unit_cost, notes } = req.body;
      if (!product_id || !quantity || !type) return res.status(400).json({ error: 'სავალდებულო ველები აკლია' });

      const { data, error } = await supabaseAdmin
        .from('inventory_transactions')
        .insert({
          product_id, quantity, transaction_type: type,
          unit_cost, total_cost: unit_cost ? unit_cost * quantity : null,
          reference_type: 'ADJUSTMENT', notes,
          fiscal_period_id: await supabaseAdmin.rpc('get_current_fiscal_period').then((r: any) => r.data),
          created_by: req.userId,
        }).select().single();
      if (error) throw error;

      // Sync stock_levels
      const direction = ['PURCHASE_IN','RETURN_IN','ADJUSTMENT_IN','OPENING'].includes(type) ? 1 : -1;
      await supabaseAdmin.rpc('update_stock_level', { p_product_id: product_id, p_delta: quantity * direction }).catch(() => {});

      res.json({ success: true, transaction: data });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── B5: VAT ──

  app.get('/api/accounting/vat/summary', requireAccountingRead, async (req: any, res) => {
    try {
      const { data, error } = await supabaseAdmin.from('v_vat_summary').select('*');
      if (error) throw error;
      res.json({ summary: data || [] });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/accounting/vat/transactions', requireAccountingRead, async (req: any, res) => {
    try {
      const { period_id, vat_type, page = '1', limit = '30' } = req.query;
      let query = supabaseAdmin
        .from('vat_transactions')
        .select('*')
        .order('transaction_date', { ascending: false })
        .range((Number(page) - 1) * Number(limit), Number(page) * Number(limit) - 1);
      if (period_id) query = query.eq('fiscal_period_id', period_id);
      if (vat_type) query = query.eq('vat_type', vat_type);
      const { data, error } = await query;
      if (error) throw error;
      res.json({ transactions: data || [] });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── B6: Employees & Payroll ──

  app.get('/api/accounting/employees', requireAccounting, async (req: any, res) => {
    try {
      const { data, error } = await supabaseAdmin.from('employees').select('*').order('full_name');
      if (error) throw error;
      res.json({ employees: data || [] });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/accounting/employees', requireAccounting, async (req: any, res) => {
    try {
      if (req.userProfile?.role !== 'admin') return res.status(403).json({ error: 'მხოლოდ ადმინი ამატებს თანამშრომლებს' });
      const { data, error } = await supabaseAdmin.from('employees').insert(req.body).select().single();
      if (error) throw error;
      res.json({ success: true, employee: data });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/accounting/payroll/runs', requireAccounting, async (req: any, res) => {
    try {
      const { data, error } = await supabaseAdmin
        .from('payroll_runs')
        .select('*, payroll_items(*, employees(full_name, position))')
        .order('period_year', { ascending: false })
        .order('period_month', { ascending: false });
      if (error) throw error;
      res.json({ runs: data || [] });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Run payroll for a period
  app.post('/api/accounting/payroll/run', requireAccounting, async (req: any, res) => {
    try {
      const { period_month, period_year, fiscal_period_id } = req.body;
      // Fetch active employees
      const { data: employees, error: empErr } = await supabaseAdmin
        .from('employees').select('*').eq('status', 'ACTIVE');
      if (empErr) throw empErr;
      if (!employees || employees.length === 0) return res.status(400).json({ error: 'აქტიური თანამშრომლები ვერ მოიძებნა' });

      const items = employees.map((e: any) => {
        const gross = Number(e.gross_salary);
        const tax = parseFloat((gross * 0.20).toFixed(2));
        const net = parseFloat((gross - tax).toFixed(2));
        return { employee_id: e.id, gross_salary: gross, income_tax_rate: 20, income_tax: tax, net_salary: net };
      });
      const totalGross = items.reduce((s: number, i: any) => s + i.gross_salary, 0);
      const totalTax = items.reduce((s: number, i: any) => s + i.income_tax, 0);
      const totalNet = items.reduce((s: number, i: any) => s + i.net_salary, 0);

      const { data: run, error: runErr } = await supabaseAdmin
        .from('payroll_runs')
        .insert({
          period_month, period_year, fiscal_period_id,
          total_gross: totalGross, total_tax: totalTax, total_net: totalNet,
          status: 'PROCESSED', processed_by: req.userId,
        }).select().single();
      if (runErr) throw runErr;

      const runItems = items.map((i: any) => ({ ...i, payroll_run_id: run.id }));
      await supabaseAdmin.from('payroll_items').insert(runItems);

      res.json({ success: true, run_id: run.id, run_code: run.run_code, total_gross: totalGross, total_net: totalNet });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'ხელფასის გაანგარიშება ვერ მოხერხდა' });
    }
  });

  // ── B7: Financial Reports ──

  app.get('/api/accounting/reports/trial-balance', requireAccountingRead, async (req: any, res) => {
    try {
      const { data, error } = await supabaseAdmin.from('v_trial_balance').select('*');
      if (error) throw error;
      const totalDebit = (data || []).reduce((s: number, r: any) => s + Number(r.total_debit), 0);
      const totalCredit = (data || []).reduce((s: number, r: any) => s + Number(r.total_credit), 0);
      res.json({ accounts: data || [], totalDebit, totalCredit, balanced: Math.abs(totalDebit - totalCredit) < 0.01 });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/accounting/reports/profit-loss', requireAccountingRead, async (req: any, res) => {
    try {
      const { data, error } = await supabaseAdmin.from('v_profit_loss').select('*');
      if (error) throw error;
      const revenue = (data || []).filter((r: any) => r.account_type === 'REVENUE').reduce((s: number, r: any) => s + Number(r.amount), 0);
      const cogs = (data || []).filter((r: any) => r.account_type === 'COGS').reduce((s: number, r: any) => s + Number(r.amount), 0);
      const opex = (data || []).filter((r: any) => r.account_type === 'EXPENSE').reduce((s: number, r: any) => s + Number(r.amount), 0);
      res.json({ lines: data || [], summary: { revenue, cogs, grossProfit: revenue - cogs, opex, netProfit: revenue - cogs - opex } });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/accounting/reports/balance-sheet', requireAccountingRead, async (req: any, res) => {
    try {
      const { data, error } = await supabaseAdmin.from('v_balance_sheet').select('*');
      if (error) throw error;
      const assets = (data || []).filter((r: any) => r.account_type === 'ASSET').reduce((s: number, r: any) => s + Number(r.balance), 0);
      const liabilities = (data || []).filter((r: any) => r.account_type === 'LIABILITY').reduce((s: number, r: any) => s + Number(r.balance), 0);
      const equity = (data || []).filter((r: any) => r.account_type === 'EQUITY').reduce((s: number, r: any) => s + Number(r.balance), 0);
      res.json({ lines: data || [], summary: { assets, liabilities, equity, balanced: Math.abs(assets - liabilities - equity) < 0.01 } });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/accounting/reports/monthly', requireAccountingRead, async (req: any, res) => {
    try {
      const { data, error } = await supabaseAdmin.from('v_monthly_summary').select('*').order('year').order('month');
      if (error) throw error;
      res.json({ summary: data || [] });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Fiscal periods list
  app.get('/api/accounting/fiscal-periods', requireAccountingRead, async (req: any, res) => {
    try {
      const { data, error } = await supabaseAdmin.from('fiscal_periods').select('*').order('period_year').order('period_month');
      if (error) throw error;
      res.json({ periods: data || [] });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Chart of accounts
  app.get('/api/accounting/accounts', requireAccountingRead, async (req: any, res) => {
    try {
      const { data, error } = await supabaseAdmin.from('accounts').select('*').eq('is_active', true).order('code');
      if (error) throw error;
      res.json({ accounts: data || [] });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
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

