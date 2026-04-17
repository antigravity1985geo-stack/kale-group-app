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
// Trust first proxy to fix express-rate-limit ERR_ERL_KEY_GEN_IPV6
app.set('trust proxy', 1);

async function setupApp() {
  const PORT = 3000;
  console.log(`[Server] Starting in ${process.env.NODE_ENV || 'development'} mode...`);
  console.log(`[Server] Directory: ${currentDirName}`);

  // CSP: disabled in development for hot-reloading, enabled in production for XSS protection
  const isProduction = process.env.NODE_ENV === 'production';
  app.use(helmet({
    contentSecurityPolicy: isProduction ? {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "blob:", "https://*.supabase.co", "https://*.googleapis.com"],
        connectSrc: ["'self'", "https://*.supabase.co", "https://generativelanguage.googleapis.com", "https://api.bog.ge", "https://api.tbcbank.ge", "https://api.credobank.ge"],
      },
    } : false,
  }));
  const allowedOrigins = [
    'https://kale-group.ge',
    'https://www.kale-group.ge',
    'https://admin.kale-group.ge',
    'https://kale-staging.vercel.app',
    process.env.APP_URL,
    ...(process.env.NODE_ENV === 'development' ? ['http://localhost:3000', 'http://localhost:5173'] : []),
  ].filter(Boolean) as string[];

  app.use(cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g., curl, Postman, same-origin Vercel serverless)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      console.warn(`[CORS] Blocked: ${origin}`);
      return callback(new Error(`CORS: origin '${origin}' not allowed`));
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
  const orderCreateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 25,
    skipSuccessfulRequests: false,
    message: { error: 'Too many requests. Please try again in 15 minutes.', code: 'RATE_LIMIT_EXCEEDED' },
    standardHeaders: true,
    legacyHeaders: false,
  });

  app.post("/api/orders/create", orderCreateLimiter, async (req, res) => {
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
          .select("id, name, price, is_on_sale, sale_price, sale_end_date")
          .eq("id", item.product.id)
          .single();

        if (!product) {
          return res.status(404).json({ error: `პროდუქტი ვერ მოიძებნა ბაზაში (ID: ${item.product.id})` });
        }

        // Mirror frontend isProductOnActiveSale logic — check sale_end_date too
        const isOnActiveSale = product.is_on_sale 
          && product.sale_price != null 
          && product.sale_price > 0
          && (!product.sale_end_date || new Date(product.sale_end_date).getTime() > Date.now());

        const effectivePrice = isOnActiveSale ? product.sale_price : product.price;

        // Add to total cost using effective (discounted) price
        calculatedTotal += effectivePrice * item.quantity;
        
        validItems.push({
          product_id: product.id,
          product_name: product.name,
          quantity: item.quantity,
          price_at_purchase: effectivePrice,  // records the actual price paid (sale or regular)
          is_promotional_sale: isOnActiveSale
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
    if (!process.env.BOG_CLIENT_SECRET) {
      console.error('[BOG Callback] CRITICAL: BOG_CLIENT_SECRET is not set. Rejecting callback for safety.');
      return false;
    }
    const signature = req.headers['callback-signature'] || req.headers['x-bog-signature'];
    if (!signature) {
      // HARD-FAIL: reject unsigned callbacks — prevents forged webhook attacks
      console.error('[BOG Callback] REJECTED: No signature header from IP:', getClientIp(req));
      return false;
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

      // Ensure HTTPS and non-localhost for Credo Validation (same pattern as BOG)
      const isDevEnv = !process.env.NODE_ENV || process.env.NODE_ENV === 'development';
      const credoBaseUrl = isDevEnv ? 'https://kalegroup.vercel.app' : (process.env.APP_URL || 'https://kale-group.ge').replace(/^http:/, 'https:');

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
          callback_url: `${credoBaseUrl}/api/pay/credo/callback`,
          success_url: `${credoBaseUrl}/payment/success?orderId=${orderId}`,
          fail_url: `${credoBaseUrl}/checkout?error=payment_failed`,
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

      // Guard: prevent duplicate invoice creation on retry/double callback
      const { data: existingInvoice } = await supabaseAdmin
        .from('invoices')
        .select('id')
        .eq('order_id', orderId)
        .maybeSingle();

      if (existingInvoice) {
        console.warn(`[processSuccessfulOrder] Invoice already exists for order ${orderId}, skipping.`);
        return;
      }

      // Ensure we don't double-process the journal
      const { data: existingJournal } = await supabaseAdmin
        .from('journal_entries')
        .select('id')
        .eq('reference_type', 'SALES_ORDER')
        .eq('reference_id', orderId)
        .single();
        
      if (existingJournal) return; // Already processed

      // 3. Load VAT Settings to dynamically calculate VAT (BUG-3 fix)
      const { data: vatSetting, error: settingsError } = await supabaseAdmin
        .from('company_settings')
        .select('value')
        .eq('key', 'vat_registered')
        .maybeSingle();

      if (settingsError) {
        console.error('[processSuccessfulOrder] company_settings load failed:', settingsError);
        await supabaseAdmin.from('orders').update({ accounting_status: 'FAILED', accounting_error: 'company_settings unavailable' }).eq('id', orderId);
        return;
      }

      const vatEnabled = vatSetting?.value === true || vatSetting?.value === 'true';
      const vatRate = vatEnabled ? 0.18 : 0; 
      
      const totalAmount = order.total_price;
      const vatAmount = vatRate > 0 ? parseFloat((totalAmount * vatRate / (1 + vatRate)).toFixed(2)) : 0;
      const revenueAmount = parseFloat((totalAmount - vatAmount).toFixed(2));

      // Calculate COGS
      let totalCogs = 0;
      order.order_items.forEach((item: any) => {
         const cost = item.products?.cost_price || 0;
         totalCogs += (cost * item.quantity);
      });

      // 4. Create System Invoice for the Order
      const { data: currPeriod } = await supabaseAdmin.rpc('get_current_fiscal_period');

      if (!currPeriod) {
        console.error(`[processSuccessfulOrder] No fiscal period for current month. Order ${orderId} accounting skipped. Run seed_fiscal_year().`);
        return;
      }
      
      const { data: invoice } = await supabaseAdmin
        .from('invoices')
        .insert({
          order_id: orderId,
          invoice_type: 'B2C',
          invoice_number: `INV-WEB-${orderId.substring(0,6).toUpperCase()}`,
          customer_name: `${order.customer_first_name} ${order.customer_last_name}`,
          invoice_date: new Date().toISOString().split('T')[0],
          due_date: new Date().toISOString().split('T')[0],
          subtotal: revenueAmount,
          vat_rate: vatRate * 100, // as percentage e.g. 18
          vat_amount: vatAmount,
          total_amount: totalAmount,
          paid_amount: totalAmount,
          payment_status: 'PAID',
          fiscal_period_id: currPeriod,
          notes: `E-commerce order via ${provider}`
        })
        .select().single();

      if (invoice) {
        // Insert Invoice Items (BUG-2 fix)
        const invoiceItems = order.order_items.map((item: any) => {
          const lineTotal = item.price_at_purchase * item.quantity;
          const lineVat = vatRate > 0 ? parseFloat((lineTotal * vatRate / (1 + vatRate)).toFixed(2)) : 0;
          return {
            invoice_id: invoice.id,
            product_id: item.product_id,
            product_name: item.product_name,
            quantity: item.quantity,
            unit_price: item.price_at_purchase,
            line_total: lineTotal,
            vat_rate: vatRate * 100,
            vat_amount: lineVat
          };
        });
        await supabaseAdmin.from('invoice_items').insert(invoiceItems);
      }

      // 5. Fetch vital accounts (BUG-1 fix)
      const accountCodesToFetch = ['1110', '1310', '6100', '7100'];
      if (vatRate > 0) accountCodesToFetch.push('3200');

      const { data: accounts } = await supabaseAdmin.from('accounts').select('id, code').in('code', accountCodesToFetch);
      const accCash = accounts?.find((a: any) => a.code === '1110')?.id; // National Currency in Bank
      const accInventory = accounts?.find((a: any) => a.code === '1310')?.id; // Inventory
      const accVat = accounts?.find((a: any) => a.code === '3200')?.id; // VAT Payable
      const accRev = accounts?.find((a: any) => a.code === '6100')?.id; // Revenue from Sales
      const accCogs = accounts?.find((a: any) => a.code === '7100')?.id; // Cost of Goods Sold

      const vatAccountRequired = vatRate > 0;

      if (!accCash || !accInventory || !accRev || !accCogs || (vatAccountRequired && !accVat)) {
        console.error('[processSuccessfulOrder] CRITICAL: accounting accounts not found', { orderId, vatRate, missingCodes: {
          accCash: !accCash ? '1110' : 'OK',
          accInventory: !accInventory ? '1310' : 'OK',
          accVat: (vatAccountRequired && !accVat) ? '3200' : 'OK',
          accRev: !accRev ? '6100' : 'OK',
          accCogs: !accCogs ? '7100' : 'OK',
        }});
        await supabaseAdmin.from('orders').update({ accounting_status: 'FAILED', accounting_error: 'Missing account codes' }).eq('id', orderId);
        return;
      }

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
          ...(vatAmount > 0 && accVat ? [{ journal_entry_id: journal.id, account_id: accVat, debit: 0, credit: vatAmount, description: 'VAT on Sale' }] : []),
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
        }
        
        await supabaseAdmin.from('journal_lines').insert(jLines);
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
      const { data: products } = await supabase.from('products').select('name, price, category, material, in_stock, description, dimensions, warranty, delivery, colors, discount_percentage, sale_price, is_on_sale');
      
      const productContext = products && products.length > 0 
        ? `CURRENT INVENTORY:\n${products.map((p: any) => {
            const saleInfo = p.is_on_sale ? `(SALE: ${p.sale_price} GEL / -${p.discount_percentage}%)` : '';
            const dimensions = p.dimensions ? `Dimensions: ${p.dimensions}` : '';
            const colors = p.colors && p.colors.length > 0 ? `Colors: ${p.colors.join(', ')}` : '';
            return `- ${p.name} (${p.category}): ${p.price} GEL ${saleInfo}. Material: ${p.material || 'N/A'}. Stock: ${p.in_stock ? 'Yes' : 'No'}. Warranty: ${p.warranty || 'N/A'}, Delivery: ${p.delivery || 'N/A'}. ${dimensions} | ${colors} | Desc: ${p.description || ''}`;
          }).join('\n')}`
        : 'Inventory data is currently unavailable.';

      // 2. Company & Showroom Info 
      const COMPANY_INFO = `
=== კორპორატიული ინფორმაცია და შოურუმი ===
კომპანია: Kale Group (Premium Furniture)
მისამართი: თბილისი, წერეთლის 118 (შოურუმი)
ტელეფონი: +995 555 12 34 56
ელ. ფოსტა: info@kalegroup.ge
მომსახურება: ჩვენ გთავაზობთ ავეჯის ონლაინ შეძენას, განვადებას (TBC, BOG, Credo) წამყვან ბანკებთან, ინდივიდუალურ შეკვეთებს, ხოლო მიწოდება ფასიანია და მისი ღირებულება ინდივიდუალურია ლოკაციის მიხედვით.
`;

      const SYSTEM_PROMPT = `შენ ხარ Kale Group-ის (kalegroup.ge) ექსპერტი AI ასისტენტი, პრესტიჟული და მაღალპროფესიონალური კონსულტანტი და ინტერიერის დიზაინერი.

შენი მახასიათებლები:
- ტონი: პრესტიჟული, პროფესიონალური, მეგობრული ეტიკეტით და დამაჯერებელი.
- ენა: მუდმივად პასუხობ ქართულად (გამართული და დახვეწილი ქართულით), თუმცა გესმის ინგლისური და რუსულიც.
- მიზანი: მომხმარებელს დაეხმარო ავეჯის იდეალურ შერჩევაში kalegroup.ge-ს წესების და არსებული ინვენტარის მიხედვით.

მკაცრი წესები:
1. გამოიყენე მხოლოდ ის პროდუქტები, ფასები (ფასდაკლებები), ზომები და ფერები რაც ქვევით მოცემულია "LIVE INVENTORY" სექციაში. 
2. არასოდეს მოიგონო ფასები ან პროდუქტები. თუ მომხმარებლის მიერ მოთხოვნილი ავეჯი მარაგში არ გვაქვს, შესთავაზე მსგავსი პროდუქტები ან ინდივიდუალური შეკვეთის შესაძლებლობა.
3. წაახალისე მომხმარებელი, რომ გვეწვიონ შოურუმში (გამოიყენე შოურუმის მისამართი). ასევე აუხსენი გარანტიის და მიწოდების დეტალები. 
4. იყავი მოკლე, კონკრეტული და დახვეწილი. ნუ დაწერ ზედმეტად გრძელ ესეებს თუ არ გთხოვეს დეტალური დიზაინ-კონსულტაცია.`;

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
          systemInstruction: `${SYSTEM_PROMPT}\n\n${COMPANY_INFO}\n\n=== LIVE INVENTORY ===\n${productContext}\n======================`
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

      let finalPrompt = aiPrompt;
      
      if (uploadedRoomImage) {
        // Step 1: Use vision model to analyze the image
        const visionResponse = await genAI.models.generateContent({
           model: 'gemini-1.5-pro',
           contents: [
             {
               role: 'user',
               parts: [
                 { inlineData: { data: uploadedRoomImage.data, mimeType: uploadedRoomImage.mimeType } },
                 { text: `Describe this room in 2 short sentences focusing on style, colors, and lighting. We want to place the following furniture in a similar room: ${aiPrompt}. Respond ONLY with a concise text prompt that can be fed to a text-to-image model to generate a photorealistic interior.` }
               ]
             }
           ]
        });
        
        finalPrompt = visionResponse.candidates?.[0]?.content?.parts?.[0]?.text || aiPrompt;
      } else {
        finalPrompt = `A high quality furniture photography of: ${aiPrompt}. Photorealistic, interior design, studio lighting.`;
      }

      // Step 2: Generate Image with Imagen 3
      const response = await genAI.models.generateImages({
        model: 'imagen-3.0-generate-001',
        prompt: finalPrompt,
        config: {
          numberOfImages: 1,
          outputMimeType: 'image/png'
        }
      });

      const base64EncodeString = response.generatedImages?.[0]?.image?.imageBytes;
      
      if (!base64EncodeString) {
        return res.status(500).json({ error: "სურათის გენერაცია ვერ მოხერხდა. სცადეთ თავიდან." });
      }

      const generatedImage = `data:image/png;base64,${base64EncodeString}`;

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

  // ── ADMIN AI CHAT (v2 — Full Financial Intelligence) ──
  app.post("/api/ai/admin-chat", requireAccountingRead, async (req: any, res: any) => {
    try {
      const { userMessage, history = [] } = req.body;
      const role = req.userProfile?.role || 'consultant';

      // ─── Gather Rich Context based on role ───
      let dbContext = '';

      if (role === 'admin' || role === 'accountant') {
        // ─── All queries in parallel to avoid Vercel timeout ───
        const [
          ordersRes, pnlRes, balanceSheetRes, monthlySummaryRes,
          journalEntriesRes, productsRes, stockLevelsRes, userCountRes, paymentsRes
        ] = await Promise.all([
          supabaseAdmin.from('orders')
            .select('id, total_price, created_at, sale_source, payment_method, payment_status, status, customer_first_name, customer_last_name')
            .order('created_at', { ascending: false }).limit(30),
          supabaseAdmin.from('v_profit_loss')
            .select('account_type, code, name_ka, amount'),
          supabaseAdmin.from('v_balance_sheet')
            .select('account_type, code, name_ka, balance'),
          supabaseAdmin.from('v_monthly_summary')
            .select('*').order('year').order('month'),
          supabaseAdmin.from('journal_entries')
            .select('id, entry_number, entry_date, status, description, currency')
            .order('entry_date', { ascending: false }).limit(20),
          supabaseAdmin.from('products')
            .select('name, price, category, in_stock, is_on_sale, sale_price, discount_percentage'),
          supabaseAdmin.from('stock_levels')
            .select('product_id, quantity_on_hand, total_cost_value, products(name)'),
          supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true }),
          supabaseAdmin.from('payments')
            .select('provider, status, amount, paid_at')
            .order('created_at', { ascending: false }).limit(30),
        ]);

        const orders = ordersRes.data || [];
        const pnl = pnlRes.data || [];
        const balanceSheet = balanceSheetRes.data || [];
        const monthlySummary = monthlySummaryRes.data || [];
        const journalEntries = journalEntriesRes.data || [];
        const products = productsRes.data || [];
        const stockLevels = stockLevelsRes.data || [];
        const userCount = userCountRes.count || 0;
        const payments = paymentsRes.data || [];

        // 10. Aggregate calculations
        const totalRevenue = (pnl || []).filter((r: any) => r.account_type === 'REVENUE').reduce((s: number, r: any) => s + Number(r.amount || 0), 0);
        const totalCOGS = (pnl || []).filter((r: any) => r.account_type === 'COGS').reduce((s: number, r: any) => s + Number(r.amount || 0), 0);
        const totalExpenses = (pnl || []).filter((r: any) => r.account_type === 'EXPENSE').reduce((s: number, r: any) => s + Number(r.amount || 0), 0);
        const grossProfit = totalRevenue - totalCOGS;
        const netProfit = grossProfit - totalExpenses;

        const totalAssets = (balanceSheet || []).filter((r: any) => r.account_type === 'ASSET').reduce((s: number, r: any) => s + Number(r.balance || 0), 0);
        const totalLiabilities = (balanceSheet || []).filter((r: any) => r.account_type === 'LIABILITY').reduce((s: number, r: any) => s + Number(r.balance || 0), 0);
        const totalEquity = (balanceSheet || []).filter((r: any) => r.account_type === 'EQUITY').reduce((s: number, r: any) => s + Number(r.balance || 0), 0);

        const inventoryValue = (stockLevels || []).reduce((s: number, r: any) => s + Number(r.total_cost_value || 0), 0);
        const orderCount = (orders || []).length;
        const paidOrders = (orders || []).filter((o: any) => o.payment_status === 'paid').length;

        dbContext = `
=== კომპანიის ფინანსური მონაცემები (LIVE) ===
📅 თარიღი: ${new Date().toLocaleDateString('ka-GE')}
👥 მომხმარებლების რაოდენობა: ${userCount || 0}

📊 მოგება-ზარალის ანგარიშგება (P&L):
  - მთლიანი შემოსავალი: ${totalRevenue.toFixed(2)} ₾
  - თვითღირებულება (COGS): ${totalCOGS.toFixed(2)} ₾
  - მთლიანი მოგება: ${grossProfit.toFixed(2)} ₾
  - საოპერაციო ხარჯები: ${totalExpenses.toFixed(2)} ₾
  - წმინდა მოგება: ${netProfit.toFixed(2)} ₾
  - მოგების მარჟა: ${totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : 0}%

დეტალური P&L ხაზები:
${JSON.stringify(pnl || [])}

📋 ბალანსი:
  - მთლიანი აქტივები: ${totalAssets.toFixed(2)} ₾
  - მთლიანი ვალდებულებები: ${totalLiabilities.toFixed(2)} ₾
  - საკუთარი კაპიტალი: ${totalEquity.toFixed(2)} ₾
  - ბალანსი დაბალანსებულია: ${Math.abs(totalAssets - totalLiabilities - totalEquity) < 0.01 ? 'დიახ ✅' : 'არა ❌'}

დეტალური ბალანსის ხაზები:
${JSON.stringify(balanceSheet || [])}

📦 ინვენტარი:
  - ინვენტარის ჯამური ღირებულება: ${inventoryValue.toFixed(2)} ₾
  - მარაგის დეტალები: ${JSON.stringify(stockLevels || [])}

🛒 შეკვეთები (ბოლო 30):
  - სულ: ${orderCount}
  - გადახდილი: ${paidOrders}
  - გადაუხდელი: ${orderCount - paidOrders}
  - შეკვეთების სია: ${JSON.stringify(orders || [])}

💳 გადახდები (ბოლო 30):
${JSON.stringify(payments || [])}

📈 თვიური ტრენდები:
${JSON.stringify(monthlySummary || [])}

📒 ბოლო 20 ჟურნალის ჩანაწერი:
${JSON.stringify(journalEntries || [])}

🛍️ პროდუქტის კატალოგი და ფასები:
${JSON.stringify((products || []).map((p: any) => ({ 
  name: p.name, price: p.price, category: p.category, 
  inStock: p.in_stock, onSale: p.is_on_sale, salePrice: p.sale_price 
})))}
=== მონაცემთა დასასრული ===
        `;
      }

      const SYSTEM_PROMPT = role === 'admin' 
        ? `შენ ხარ Kale Group-ის შიდა უმაღლესი AI ადმინისტრატორი (COO / ფინანსური დირექტორი).

შენი უნარები:
- სრული ბუღალტრული აუდიტის ჩატარება
- მოგება-ზარალის, ბალანსის და ფულადი ნაკადების ანალიზი
- შეკვეთების, გადახდების და ინვენტარის მონიტორინგი
- ბიზნეს რეკომენდაციების მომზადება
- ნებისმიერი ფინანსური მონაცემის ცხრილებში პრეზენტაცია

მკაცრი წესები:
1. ყოველთვის პასუხობ ქართულად, გამართული პროფესიონალური ენით.
2. მონაცემებს აჩვენებ Markdown ცხრილების (tables) სახით.
3. გამოიყენე მხოლოდ ის მონაცემები, რაც LIVE SYSTEM CONTEXT-ში არის მოცემული.
4. არასოდეს მოიგონო რიცხვები ან მონაცემები.
5. ნებისმიერ ფინანსურ ანალიზში გამოიყენე ₾ (ლარი) სიმბოლო.
6. როდესაც აუდიტი გთხოვენ, მოამზადე სტრუქტურირებული რეპორტი: (1) შეჯამება, (2) P&L, (3) ბალანსი, (4) შეკვეთების ანალიზი, (5) რისკები, (6) რეკომენდაციები.`
        : role === 'accountant'
        ? `შენ ხარ Kale Group-ის უფროსი ფინანსური აუდიტორი.

შენი უნარები:
- ჟურნალის ჩანაწერების ანალიზი და ვერიფიკაცია
- მოგება-ზარალის და ბალანსის წაკითხვა
- გადასახადების (VAT/დღგ) კონსულტაცია
- ინვენტარის ღირებულების ანალიზი

მკაცრი წესები:
1. ყოველთვის პასუხობ ქართულად.
2. მონაცემებს აჩვენებ Markdown ცხრილებში.
3. გამოიყენე მხოლოდ LIVE SYSTEM CONTEXT-ის მონაცემები.
4. იყავი მკაცრი, ზუსტი და პროფესიონალური.`
        : "შენ ხარ შიდა კონსულტანტის ასისტენტი. პასუხობ ქართულად.";

      const contents = [
        ...history,
        { role: "user", parts: [{ text: userMessage }] }
      ];

      const result = await genAI.models.generateContent({
        model: "gemini-2.5-flash",
        contents: contents,
        config: {
          systemInstruction: `${SYSTEM_PROMPT}\n\n${dbContext}`
        }
      });

      const responseText = result.candidates?.[0]?.content?.parts?.[0]?.text || "პასუხი ვერ გენერირდება.";
      res.json({ text: responseText });
    } catch (e: any) {
      console.error('Admin AI Error:', e);
      res.status(500).json({ error: "სერვერის შეცდომა." });
    }
  });

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
          .select('payment_method, payment_provider, sale_source, total_price, status')
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

      // Compute payment method breakdown — grouped by bank (bog, tbc, credo, cash)
      const ordersData = paymentBreakdownRes.data || [];
      const paymentBreakdown: Record<string, { count: number; total: number; onlineTotal: number; showroomTotal: number }> = {
        bog: { count: 0, total: 0, onlineTotal: 0, showroomTotal: 0 },
        tbc: { count: 0, total: 0, onlineTotal: 0, showroomTotal: 0 },
        credo: { count: 0, total: 0, onlineTotal: 0, showroomTotal: 0 },
        cash: { count: 0, total: 0, onlineTotal: 0, showroomTotal: 0 },
      };
      for (const o of ordersData) {
        // Determine bank key from payment_method or payment_provider
        const rawMethod = (o.payment_method || o.payment_provider || '').toLowerCase();
        let key = 'cash'; // default
        if (rawMethod.includes('bog') || rawMethod === 'bank_of_georgia') key = 'bog';
        else if (rawMethod.includes('tbc') || rawMethod === 'tpay') key = 'tbc';
        else if (rawMethod.includes('credo') || rawMethod === 'installment') key = 'credo';
        else if (rawMethod === 'card' || rawMethod === 'bank_transfer') key = 'bog'; // default card to bog
        else if (rawMethod === 'cash') key = 'cash';

        const amount = Number(o.total_price || 0);
        const source = (o.sale_source || 'website').toLowerCase();

        paymentBreakdown[key].count += 1;
        paymentBreakdown[key].total += amount;
        if (source === 'website' || source === 'online') {
          paymentBreakdown[key].onlineTotal += amount;
        } else {
          paymentBreakdown[key].showroomTotal += amount;
        }
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

  // ══════════════════════════════════════════════════════════
  // ── RS.GE WAYBILL API ROUTES ──
  // ══════════════════════════════════════════════════════════

  // GET /api/rs-ge/waybills — List all outgoing waybills with order data
  app.get('/api/rs-ge/waybills', requireAccountingRead, async (req: any, res) => {
    try {
      const page = Math.max(0, Number(req.query.page) || 0);
      const limit = Math.min(Number(req.query.limit) || 50, 100);
      const offset = page * limit;

      const { data, count, error } = await supabaseAdmin
        .from('rs_waybills')
        .select(`
          *,
          orders (
            customer_first_name,
            customer_last_name,
            total_price
          )
        `, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;
      res.json({ waybills: data || [], total: count || 0 });
    } catch (err: any) {
      console.error('[RS.ge] GET waybills error:', err);
      res.status(500).json({ error: err.message || 'ზედნადებების მიღება ვერ მოხერხდა' });
    }
  });

  // POST /api/rs-ge/waybill/draft — Create a local draft waybill for an order
  app.post('/api/rs-ge/waybill/draft', requireAccounting, async (req: any, res) => {
    try {
      const { order_id, end_address, start_address, driver_name, car_number } = req.body;
      if (!order_id) return res.status(400).json({ error: 'order_id სავალდებულოა' });

      // Verify order exists and is confirmed
      const { data: order, error: orderErr } = await supabaseAdmin
        .from('orders')
        .select('id, customer_address, customer_city, status')
        .eq('id', order_id)
        .single();

      if (orderErr || !order) {
        return res.status(404).json({ error: 'შეკვეთა ვერ მოიძებნა' });
      }

      // Check if draft already exists for this order
      const { data: existing } = await supabaseAdmin
        .from('rs_waybills')
        .select('id')
        .eq('order_id', order_id)
        .maybeSingle();

      if (existing) {
        return res.status(409).json({ error: 'ამ შეკვეთისთვის ზედნადები უკვე შექმნილია' });
      }

      const resolvedEndAddress = end_address ||
        `${order.customer_city || ''}, ${order.customer_address || ''}`.trim() || 'განსაზღვრავს';

      const { data: waybill, error: insertErr } = await supabaseAdmin
        .from('rs_waybills')
        .insert({
          order_id,
          status: 'DRAFT',
          start_address: start_address || 'თბილისი, ქ. კალე გრუპი',
          end_address: resolvedEndAddress,
          driver_name: driver_name || null,
          car_number: car_number || null,
          transport_type: 1, // standard
        })
        .select()
        .single();

      if (insertErr) throw insertErr;

      res.json({ success: true, waybill });
    } catch (err: any) {
      console.error('[RS.ge] Create draft error:', err);
      res.status(500).json({ error: err.message || 'დრაფტის შექმნა ვერ მოხერხდა' });
    }
  });

  // POST /api/rs-ge/waybill/send — Register waybill with RS.ge SOAP service
  app.post('/api/rs-ge/waybill/send', requireAccounting, async (req: any, res) => {
    try {
      const { waybill_id } = req.body;
      if (!waybill_id) return res.status(400).json({ error: 'waybill_id სავალდებულოა' });

      // Fetch the draft waybill
      const { data: waybill, error: fetchErr } = await supabaseAdmin
        .from('rs_waybills')
        .select('*, orders(customer_first_name, customer_last_name, company_id, personal_id, order_items(product_id, product_name, quantity, price_at_purchase))')
        .eq('id', waybill_id)
        .single();

      if (fetchErr || !waybill) {
        return res.status(404).json({ error: 'ზედნადები ვერ მოიძებნა' });
      }

      if (waybill.status === 'SENT') {
        return res.status(409).json({ error: 'ზედნადები უკვე გაგზავნილია' });
      }

      // ── Call RS.ge SOAP (mock — real credentials needed for production) ──
      // For now: generate a mock RS.ge waybill ID and mark as SENT
      // In production: replace with rsgeCreateWaybill() call
      const mockRsId = `WB-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

      // Log to audit trail (using supabaseAdmin — bypasses RLS)
      await supabaseAdmin.from('rsge_sync_log').insert({
        type: 'waybill',
        action: 'SEND',
        internal_id: waybill_id,
        rsge_id: mockRsId,
        success: true,
        payload: { waybill_id, order_id: waybill.order_id },
        response: { rs_waybill_id: mockRsId, status: 'SENT' },
      });

      // Mark waybill as SENT and save RS.ge ID
      const { data: updated, error: updateErr } = await supabaseAdmin
        .from('rs_waybills')
        .update({
          status: 'SENT',
          rs_waybill_id: mockRsId,
        })
        .eq('id', waybill_id)
        .select('*, orders(customer_first_name, customer_last_name, total_price)')
        .single();

      if (updateErr) throw updateErr;

      res.json({
        success: true,
        waybill: updated,
        message: `ზედნადები RS.ge-ზე დარეგისტრირდა: ${mockRsId}`,
      });
    } catch (err: any) {
      console.error('[RS.ge] Send waybill error:', err);
      res.status(500).json({ error: err.message || 'ზედნადების გაგზავნა ვერ მოხერხდა' });
    }
  });

  // POST /api/rs-ge/waybill/incoming/accept — Accept an incoming waybill
  app.post('/api/rs-ge/waybill/incoming/accept', requireAccounting, async (req: any, res) => {
    try {
      const { id } = req.body;
      if (!id) return res.status(400).json({ error: 'id სავალდებულოა' });

      const { data, error } = await supabaseAdmin
        .from('rs_incoming_waybills')
        .update({ status: 'ACCEPTED' })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Log acceptance
      await supabaseAdmin.from('rsge_sync_log').insert({
        type: 'waybill',
        action: 'ACCEPT_INCOMING',
        internal_id: id,
        rsge_id: data?.rs_waybill_id,
        success: true,
        payload: { id },
        response: { status: 'ACCEPTED' },
      });

      res.json({ success: true, waybill: data });
    } catch (err: any) {
      console.error('[RS.ge] Accept incoming error:', err);
      res.status(500).json({ error: err.message || 'მიღება ვერ მოხერხდა' });
    }
  });

  // GET /api/rs-ge/sync-log — Recent RS.ge sync log entries
  app.get('/api/rs-ge/sync-log', requireAccountingRead, async (req: any, res) => {
    try {
      const limit = Math.min(Number(req.query.limit) || 50, 100);
      const { data, error } = await supabaseAdmin
        .from('rsge_sync_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      res.json({ logs: data || [] });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'სინქ ლოგის მიღება ვერ მოხერხდა' });
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

  app.put('/api/accounting/employees/:id', requireAccounting, async (req: any, res) => {
    try {
      if (req.userProfile?.role !== 'admin') return res.status(403).json({ error: 'მხოლოდ ადმინი არედაქტირებს თანამშრომლებს' });
      const { data, error } = await supabaseAdmin.from('employees').update(req.body).eq('id', req.params.id).select().single();
      if (error) throw error;
      res.json({ success: true, employee: data });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/accounting/employees/:id', requireAccounting, async (req: any, res) => {
    try {
      if (req.userProfile?.role !== 'admin') return res.status(403).json({ error: 'მხოლოდ ადმინი შლის თანამშრომლებს' });
      const { error } = await supabaseAdmin.from('employees').delete().eq('id', req.params.id);
      if (error) throw error;
      res.json({ success: true });
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

      // Create Payroll Journal Entry
      const SALARY_EXPENSE_CODE = '8100'; 
      const SALARIES_PAYABLE_CODE = '3300';

      const { data: payrollAccounts } = await supabaseAdmin
        .from('accounts').select('id, code')
        .in('code', [SALARY_EXPENSE_CODE, SALARIES_PAYABLE_CODE]);

      const accSalaryExpense = payrollAccounts?.find((a: { code: string; id: string }) => a.code === SALARY_EXPENSE_CODE)?.id;
      const accSalariesPayable = payrollAccounts?.find((a: { code: string; id: string }) => a.code === SALARIES_PAYABLE_CODE)?.id;

      if (!accSalaryExpense || !accSalariesPayable) {
        console.error('[Payroll] Accounts not found', { SALARY_EXPENSE_CODE, SALARIES_PAYABLE_CODE });
      } else {
        const { data: je, error: jeErr } = await supabaseAdmin
          .from('journal_entries')
          .insert({
            entry_date: new Date().toISOString().split('T')[0],
            description: `Payroll Run #${run.run_code}`,
            reference_type: 'PAYROLL',
            reference_id: run.id,
            status: 'POSTED',
            fiscal_period_id
          })
          .select('id')
          .single();

        if (jeErr || !je) {
          console.error('[Payroll] JE header failed:', jeErr);
        } else {
          const { error: linesErr } = await supabaseAdmin
            .from('journal_lines')
            .insert([
              { journal_entry_id: je.id, account_id: accSalaryExpense,   debit: totalGross, credit: 0,            description: 'Salary expense' },
              { journal_entry_id: je.id, account_id: accSalariesPayable, debit: 0,            credit: totalGross, description: 'Salaries payable' },
            ]);

          if (linesErr) {
            console.error('[Payroll] JE lines failed — rolling back header:', linesErr);
            const { error: deleteErr } = await supabaseAdmin
              .from('journal_entries').delete().eq('id', je.id);
            if (deleteErr) {
              console.error('[Payroll] CRITICAL: rollback failed — manual cleanup needed', {
                journal_entry_id: je.id,
              });
            }
          }
        }
      }

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

const setupPromise = setupApp();

export { setupPromise };
export default app;
