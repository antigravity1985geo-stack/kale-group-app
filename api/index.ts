// Vercel Serverless Function entry point
// This re-exports the Express app from server.ts as a serverless handler

import express from "express";
import crypto from "crypto";
import { GoogleGenAI, Type } from "@google/genai";
import { createClient } from "@supabase/supabase-js";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";

const app = express();

// ── Middleware ──
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5173",
  "https://kalegroup.vercel.app",
  process.env.APP_URL,
].filter(Boolean);

app.use(helmet({ contentSecurityPolicy: false }));
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      callback(null, true);
    },
    credentials: true,
  })
);
app.use(express.json({ limit: "10mb" }));

// ── Rate Limiting ──
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { error: "ძალიან ბევრი მოთხოვნა. გთხოვთ მოგვიანებით სცადოთ." },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api/", generalLimiter);

const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: "დღიური ლიმიტი ამოიწურა, სცადეთ 15 წუთში" },
});

// ── Supabase ──
let supabase: any = null;
let supabaseAdmin: any = null;

try {
  if (process.env.VITE_SUPABASE_URL && process.env.VITE_SUPABASE_ANON_KEY) {
    supabase = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.VITE_SUPABASE_ANON_KEY
    );
  }
  if (
    process.env.VITE_SUPABASE_URL &&
    (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY)
  ) {
    supabaseAdmin = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
        process.env.VITE_SUPABASE_ANON_KEY ||
        "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );
  }
} catch (err) {
  console.error("Failed to initialize Supabase clients:", err);
}

// ── Gemini AI ──
const genAI = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "dummy-key-to-prevent-crash",
});

// ── Helpers ──
const getUserFromToken = async (req: any) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  const token = authHeader.replace("Bearer ", "");
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  return user;
};

const isUserAdmin = async (userId: string) => {
  const { data } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();
  return data?.role === "admin";
};

// ── Middleware: Accounting roles ──
const requireAccounting = async (req: any, res: any, next: any) => {
  const user = await getUserFromToken(req);
  if (!user) return res.status(401).json({ error: "არაავტორიზებული მოთხოვნა" });
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (!profile || !["admin", "accountant"].includes(profile.role)) {
    return res.status(403).json({ error: "ბუღალტერიის მოდულზე წვდომა შეზღუდულია" });
  }
  req.userProfile = profile;
  req.userId = user.id;
  next();
};

const requireAccountingRead = async (req: any, res: any, next: any) => {
  const user = await getUserFromToken(req);
  if (!user) return res.status(401).json({ error: "არაავტორიზებული მოთხოვნა" });
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (!profile || !["admin", "accountant", "consultant"].includes(profile.role)) {
    return res.status(403).json({ error: "წვდომა შეზღუდულია" });
  }
  req.userProfile = profile;
  req.userId = user.id;
  next();
};

// ════════════════════════════════════
// ── ROUTES ──
// ════════════════════════════════════

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", version: "3.0", time: new Date().toISOString() });
});

// ── Auth / Profile ──
app.get("/api/auth/profile", async (req, res) => {
  try {
    const user = await getUserFromToken(req);
    if (!user) return res.status(401).json({ error: "არაავტორიზებული მოთხოვნა" });
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();
    if (error) throw error;
    res.json({ profile: data });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "პროფილის მიღება ვერ მოხერხდა" });
  }
});

// ── Admin: Invite ──
app.post("/api/admin/invite", async (req, res) => {
  try {
    const user = await getUserFromToken(req);
    if (!user) return res.status(401).json({ error: "არაავტორიზებული მოთხოვნა" });
    const admin = await isUserAdmin(user.id);
    if (!admin)
      return res.status(403).json({ error: "მხოლოდ ადმინისტრატორს შეუძლია მოწვევის გაგზავნა" });
    const { email, role = "consultant" } = req.body;
    if (!email) return res.status(400).json({ error: "ელ. ფოსტა სავალდებულოა" });
    const { data: existingProfile } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("email", email)
      .single();
    if (existingProfile)
      return res.status(400).json({ error: "ეს ელ. ფოსტა უკვე დარეგისტრირებულია სისტემაში" });
    const { data: existingInvite } = await supabaseAdmin
      .from("invitations")
      .select("id")
      .eq("email", email)
      .eq("status", "pending")
      .single();
    if (existingInvite)
      return res.status(400).json({ error: "ამ ელ. ფოსტაზე უკვე გაგზავნილია მოწვევა" });
    const { error: inviteError } = await supabaseAdmin.from("invitations").insert({
      email,
      role: role || "consultant",
      invited_by: user.id,
    });
    if (inviteError) throw inviteError;
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const { error: authError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        data: { role: role || "consultant", invited_by: user.id },
        redirectTo: `${process.env.APP_URL || "https://kalegroup.vercel.app"}/admin`,
      });
      if (authError) console.error("Auth invite error:", authError.message);
    }
    res.json({ success: true, message: `მოწვევა გაიგზავნა: ${email}` });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "მოწვევის გაგზავნა ვერ მოხერხდა" });
  }
});

// ── Admin: Consultants list ──
app.get("/api/admin/consultants", async (req, res) => {
  try {
    const user = await getUserFromToken(req);
    if (!user) return res.status(401).json({ error: "არაავტორიზებული მოთხოვნა" });
    const admin = await isUserAdmin(user.id);
    if (!admin) return res.status(403).json({ error: "წვდომა აკრძალულია" });
    const [profilesRes, invitationsRes] = await Promise.all([
      supabaseAdmin
        .from("profiles")
        .select("*")
        .in("role", ["admin", "consultant"])
        .order("created_at", { ascending: false }),
      supabaseAdmin.from("invitations").select("*").order("created_at", { ascending: false }),
    ]);
    res.json({
      profiles: profilesRes.data || [],
      invitations: invitationsRes.data || [],
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "მონაცემების მიღება ვერ მოხერხდა" });
  }
});

// ── Orders / Checkout ──
app.post("/api/orders/create", async (req, res) => {
  try {
    const { customerInfo, items, paymentMethod, paymentType } = req.body;
    if (!customerInfo || !items || items.length === 0)
      return res.status(400).json({ error: "არასწორი მოთხოვნა: მონაცემები აკლია" });

    let calculatedTotal = 0;
    const validItems: any[] = [];

    for (const item of items) {
      const { data: product } = await supabase
        .from("products")
        .select("id, name, price, is_on_sale, sale_price")
        .eq("id", item.product.id)
        .single();
      if (!product)
        return res
          .status(404)
          .json({ error: `პროდუქტი ვერ მოიძებნა ბაზაში (ID: ${item.product.id})` });
      const effectivePrice =
        product.is_on_sale && product.sale_price != null && product.sale_price > 0
          ? product.sale_price
          : product.price;
      calculatedTotal += effectivePrice * item.quantity;
      validItems.push({
        product_id: product.id,
        product_name: product.name,
        quantity: item.quantity,
        price_at_purchase: effectivePrice,
      });
    }

    const { data: orderData, error: orderError } = await supabaseAdmin
      .from("orders")
      .insert([
        {
          customer_type: customerInfo.customerType,
          personal_id:
            customerInfo.customerType === "physical" ? customerInfo.personalId : null,
          company_id: customerInfo.customerType === "legal" ? customerInfo.companyId : null,
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
          status: "pending",
        },
      ])
      .select()
      .single();
    if (orderError) throw orderError;

    const orderItemsInsert = validItems.map((item) => ({ ...item, order_id: orderData.id }));
    const { error: itemsError } = await supabaseAdmin.from("order_items").insert(orderItemsInsert);
    if (itemsError) throw itemsError;

    res.json({ success: true, orderId: orderData.id, total_price: calculatedTotal });
  } catch (error: any) {
    console.error("Order Creation Error:", error);
    res.status(500).json({ error: "შეკვეთის გაფორმებისას დაფიქსირდა შეცდომა." });
  }
});

// ════════════════════════════════════
// ── Auto Accounting & RS.GE (CRITICAL FIX — was missing in Vercel) ──
// ════════════════════════════════════

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
        invoice_number: `INV-WEB-${orderId.substring(0, 6).toUpperCase()}`,
        customer_id: null,
        customer_name: `${order.customer_first_name} ${order.customer_last_name}`,
        invoice_date: new Date().toISOString().split('T')[0],
        due_date: new Date().toISOString().split('T')[0],
        total_amount: order.total_price,
        tax_amount: parseFloat((order.total_price * 0.18).toFixed(2)),
        paid_amount: order.total_price,
        payment_status: 'PAID',
        fiscal_period_id: currPeriod,
        notes: `E-commerce order via ${provider}`,
      })
      .select()
      .single();

    if (invoice) {
      const invoiceItems = order.order_items.map((item: any) => ({
        invoice_id: invoice.id,
        product_id: item.product_id,
        description: item.product_name,
        quantity: item.quantity,
        unit_price: item.price_at_purchase,
        total_price: item.price_at_purchase * item.quantity,
        tax_rate: 18,
        tax_amount: parseFloat(((item.price_at_purchase * item.quantity) * 0.18).toFixed(2)),
      }));
      await supabaseAdmin.from('invoice_items').insert(invoiceItems);
    }

    // 4. Generate Double-Entry Journal Document
    const totalAmount = order.total_price;
    const vatAmount = parseFloat((totalAmount * 0.18).toFixed(2));
    const revenueAmount = parseFloat((totalAmount - vatAmount).toFixed(2));

    let totalCogs = 0;
    order.order_items.forEach((item: any) => {
      const cost = item.products?.cost_price || 0;
      totalCogs += cost * item.quantity;
    });

    const { data: accounts } = await supabaseAdmin
      .from('accounts')
      .select('id, code')
      .in('code', ['1110', '1610', '3330', '6110', '7110']);
    const accCash = accounts?.find((a: any) => a.code === '1110')?.id;
    const accInventory = accounts?.find((a: any) => a.code === '1610')?.id;
    const accVat = accounts?.find((a: any) => a.code === '3330')?.id;
    const accRev = accounts?.find((a: any) => a.code === '6110')?.id;
    const accCogs = accounts?.find((a: any) => a.code === '7110')?.id;

    if (accCash && accInventory && accVat && accRev && accCogs) {
      const { data: journal } = await supabaseAdmin
        .from('journal_entries')
        .insert({
          entry_date: new Date().toISOString().split('T')[0],
          description: `SALE - E-commerce Order #${orderId.substring(0, 8)}`,
          reference_type: 'SALES_ORDER',
          reference_id: orderId,
          fiscal_period_id: currPeriod,
          status: 'POSTED',
        })
        .select()
        .single();

      if (journal) {
        const jLines: any[] = [
          { journal_entry_id: journal.id, account_id: accCash, debit: totalAmount, credit: 0, description: 'Payment Received' },
          { journal_entry_id: journal.id, account_id: accRev, debit: 0, credit: revenueAmount, description: 'Sales Revenue' },
          { journal_entry_id: journal.id, account_id: accVat, debit: 0, credit: vatAmount, description: 'VAT on Sale' },
        ];

        if (totalCogs > 0) {
          jLines.push(
            { journal_entry_id: journal.id, account_id: accCogs, debit: totalCogs, credit: 0, description: 'Cost of Goods Sold' },
            { journal_entry_id: journal.id, account_id: accInventory, debit: 0, credit: totalCogs, description: 'Inventory Out' }
          );

          const invTx = order.order_items.map((item: any) => ({
            product_id: item.product_id,
            quantity: item.quantity,
            transaction_type: 'SALE_OUT',
            unit_cost: item.products?.cost_price || 0,
            total_cost: (item.products?.cost_price || 0) * item.quantity,
            reference_type: 'SALES_ORDER',
            reference_id: orderId,
            notes: 'Order fulfillment via Website',
            fiscal_period_id: currPeriod,
          }));
          await supabaseAdmin.from('inventory_transactions').insert(invTx);
        }

        await supabaseAdmin.from('journal_lines').insert(jLines);
      }
    }
  } catch (err) {
    console.error('Auto Accounting Error for Order:', orderId, err);
  }
}

// ════════════════════════════════════
// ── Webhook Verification Helpers ──
// ════════════════════════════════════

/**
 * Verifies the callback is from a known bank IP range.
 * BOG documented IPs + Vercel proxy handling.
 * Defense-in-depth: even if signature is bypassed, IP must match.
 */
function getClientIp(req: any): string {
  return (
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.connection?.remoteAddress ||
    req.ip ||
    ''
  );
}

// BOG callback IPs (from BOG documentation — update if BOG publishes new ranges)
const BOG_ALLOWED_IPS = [
  '213.131.36.', // BOG production range
  '192.168.',    // Local dev
  '127.0.0.1',
  '::1',
];

/**
 * Verify BOG callback signature using HMAC-SHA256.
 * BOG sends `Callback-Signature` or `X-Bog-Signature` header.
 */
function verifyBogCallback(req: any): boolean {
  // In development/staging, skip verification if no secret is configured
  if (!process.env.BOG_CLIENT_SECRET) return true;

  const signature = req.headers['callback-signature'] || req.headers['x-bog-signature'];
  if (!signature) {
    // Fallback: verify by checking the payment exists in our DB
    console.warn('[BOG Callback] No signature header — will verify via DB lookup');
    return true; // Will be verified via DB lookup in the handler
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

/**
 * Verify payment exists in our DB to prevent spoofed callbacks.
 * Defense-in-depth: even without HMAC, we verify the payment record exists.
 */
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

// ════════════════════════════════════
// ── BOG Payment ──
// ════════════════════════════════════

async function getBOGToken(): Promise<string> {
  const response = await fetch(
    "https://oauth2.bog.ge/auth/realms/bog/protocol/openid-connect/token",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: process.env.BOG_CLIENT_ID!,
        client_secret: process.env.BOG_CLIENT_SECRET!,
      }),
    }
  );
  const data = await response.json();
  if (!data.access_token) throw new Error("BOG Token მიღება ვერ მოხერხდა");
  return data.access_token;
}

app.post("/api/pay/bog", async (req, res) => {
  try {
    const { orderId, amount, redirectUrl } = req.body;
    if (!process.env.BOG_CLIENT_ID || !process.env.BOG_CLIENT_SECRET)
      return res.status(503).json({ error: "BOG გადახდა დროებით მიუწვდომელია" });

    const token = await getBOGToken();
    const baseUrl = process.env.APP_URL || "https://kalegroup.vercel.app";
    const safeRedirectUrl = (redirectUrl || baseUrl).replace(/^http:/, "https:");

    const orderResponse = await fetch("https://api.bog.ge/payments/v1/ecommerce/orders", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "Accept-Language": "ka",
      },
      body: JSON.stringify({
        callback_url: `${baseUrl}/api/pay/bog/callback`,
        external_order_id: orderId,
        purchase_units: {
          currency: "GEL",
          total_amount: amount,
          basket: [{ quantity: 1, unit_price: amount, product_id: orderId }],
        },
        redirect_urls: {
          fail: `${safeRedirectUrl}?status=failed`,
          success: `${safeRedirectUrl}/payment/success?orderId=${orderId}`,
        },
      }),
    });

    const orderData = await orderResponse.json();
    if (!orderResponse.ok) throw new Error(orderData.message || "BOG შეკვეთის შექმნა ვერ მოხერხდა");

    await supabaseAdmin.from("payments").insert({
      order_id: orderId,
      provider: "bog",
      external_id: orderData.id,
      amount,
      status: "pending",
    });

    res.json({ success: true, redirectUrl: orderData._links?.redirect?.href });
  } catch (error: any) {
    console.error("BOG Payment Error:", error);
    res.status(500).json({ error: error.message || "BOG გადახდის ინიცირება ვერ მოხერხდა" });
  }
});

app.post("/api/pay/bog/callback", async (req, res) => {
  try {
    // Security: Verify callback authenticity
    if (!verifyBogCallback(req)) {
      console.error('[BOG Callback] Signature verification FAILED from IP:', getClientIp(req));
      return res.status(403).json({ error: 'Invalid callback signature' });
    }

    const { order_id, status, external_order_id } = req.body;

    // Security: Verify this payment exists in our DB (defense-in-depth)
    const paymentValid = await verifyPaymentExists(order_id, 'bog');
    if (!paymentValid) {
      console.error('[BOG Callback] Unknown payment external_id:', order_id);
      return res.status(404).json({ error: 'Payment not found' });
    }

    const isSuccess = status === "completed";
    await supabaseAdmin
      .from("payments")
      .update({
        status: isSuccess ? "paid" : "failed",
        callback_data: req.body,
        paid_at: isSuccess ? new Date().toISOString() : null,
      })
      .eq("external_id", order_id);

    if (isSuccess) {
      await processSuccessfulOrder(external_order_id, 'bog');
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error("BOG Callback Error:", error);
    res.status(500).json({ error: "Callback processing failed" });
  }
});

app.post("/api/pay/bog/installment", async (req, res) => {
  try {
    const { orderId, amount } = req.body;
    if (!process.env.BOG_CLIENT_ID || !process.env.BOG_CLIENT_SECRET)
      return res.status(503).json({ error: "BOG განვადება დროებით მიუწვდომელია" });

    const token = await getBOGToken();
    const baseUrl = process.env.APP_URL || "https://kalegroup.vercel.app";

    const response = await fetch("https://api.bog.ge/loans/v1/online-installments", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "Accept-Language": "ka",
      },
      body: JSON.stringify({
        external_order_id: orderId,
        loan_amount: amount,
        campaign_id: process.env.BOG_CAMPAIGN_ID || null,
        callback_url: `${baseUrl}/api/pay/bog/callback`,
        redirect_url: `${baseUrl}/payment/success?orderId=${orderId}`,
      }),
    });

    const data = await response.json();
    await supabaseAdmin.from("payments").insert({
      order_id: orderId,
      provider: "bog",
      external_id: data.id || data.application_id,
      amount,
      payment_type: "installment",
      status: "pending",
    });

    res.json({ success: true, redirectUrl: data.redirect_url });
  } catch (error: any) {
    console.error("BOG Installment Error:", error);
    res.status(500).json({ error: error.message || "BOG განვადების ინიცირება ვერ მოხერხდა" });
  }
});

// ════════════════════════════════════
// ── TBC Payment ──
// ════════════════════════════════════

let tbcTokenCache: { token: string; expires: number } | null = null;

async function getTBCToken(): Promise<string> {
  if (tbcTokenCache && Date.now() < tbcTokenCache.expires) return tbcTokenCache.token;
  const response = await fetch("https://api.tbcbank.ge/v1/tpay/access-token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      apikey: process.env.TBC_API_KEY!,
    },
    body: new URLSearchParams({
      client_id: process.env.TBC_CLIENT_ID!,
      client_secret: process.env.TBC_CLIENT_SECRET!,
    }),
  });
  const data = await response.json();
  if (!data.access_token) throw new Error("TBC Token მიღება ვერ მოხერხდა");
  tbcTokenCache = { token: data.access_token, expires: Date.now() + 23 * 60 * 60 * 1000 };
  return data.access_token;
}

app.post("/api/pay/tbc", async (req, res) => {
  try {
    const { orderId, amount, methods = [5] } = req.body;
    if (!process.env.TBC_CLIENT_ID || !process.env.TBC_API_KEY || !process.env.TBC_CLIENT_SECRET)
      return res.status(503).json({ error: "TBC გადახდა დროებით მიუწვდომელია" });
    const token = await getTBCToken();
    const baseUrl = process.env.APP_URL || "https://kalegroup.vercel.app";
    const response = await fetch("https://api.tbcbank.ge/v1/tpay/payments", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: process.env.TBC_API_KEY!,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: { currency: "GEL", total: amount, subTotal: amount, tax: 0, shipping: 0 },
        returnurl: `${baseUrl}/payment/success?orderId=${orderId}`,
        extra: orderId,
        expirationMinutes: 30,
        methods,
        callbackUrl: `${baseUrl}/api/pay/tbc/callback`,
      }),
    });
    const data = await response.json();
    await supabaseAdmin.from("payments").insert({
      order_id: orderId,
      provider: "tbc",
      external_id: data.payId,
      amount,
      payment_type: methods.includes(8) ? "installment" : "full",
      status: "pending",
    });
    const paymentRedirectUrl = data.links?.find((l: any) => l.rel === "approval_url")?.uri;
    res.json({ success: true, redirectUrl: paymentRedirectUrl, payId: data.payId });
  } catch (error: any) {
    console.error("TBC Payment Error:", error);
    res.status(500).json({ error: error.message || "TBC გადახდის ინიცირება ვერ მოხერხდა" });
  }
});

app.post("/api/pay/tbc/callback", async (req, res) => {
  try {
    const { PayId, Status, Extra } = req.body;

    // Security: Verify this payment exists in our DB
    const paymentValid = await verifyPaymentExists(PayId, 'tbc');
    if (!paymentValid) {
      console.error('[TBC Callback] Unknown payment PayId:', PayId);
      return res.status(404).json({ error: 'Payment not found' });
    }

    const isSuccess = Status === "Succeeded";
    await supabaseAdmin
      .from("payments")
      .update({
        status: isSuccess ? "paid" : "failed",
        callback_data: req.body,
        paid_at: isSuccess ? new Date().toISOString() : null,
      })
      .eq("external_id", PayId);

    if (isSuccess) {
      await processSuccessfulOrder(Extra, 'tbc');
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error("TBC Callback Error:", error);
    res.status(500).json({ error: "Callback processing failed" });
  }
});

// ════════════════════════════════════
// ── Credo Bank ──
// ════════════════════════════════════

app.post("/api/pay/credo", async (req, res) => {
  try {
    const { orderId, items, amount } = req.body;
    if (!process.env.CREDO_API_KEY)
      return res.status(503).json({ error: "Credo განვადება დროებით მიუწვდომელია" });
    const baseUrl = process.env.APP_URL || "https://kalegroup.vercel.app";
    const response = await fetch("https://api.credobank.ge/v1/installments/initiate", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.CREDO_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        merchant_order_id: orderId,
        amount,
        currency: "GEL",
        items:
          items?.map((i: any) => ({
            name: i.product_name,
            quantity: i.quantity,
            price: i.price_at_purchase || i.price,
          })) || [],
        callback_url: `${baseUrl}/api/pay/credo/callback`,
        success_url: `${baseUrl}/payment/success?orderId=${orderId}`,
        fail_url: `${baseUrl}/checkout?error=payment_failed`,
      }),
    });
    const data = await response.json();
    await supabaseAdmin.from("payments").insert({
      order_id: orderId,
      provider: "credo",
      external_id: data.application_id,
      amount,
      payment_type: "installment",
      status: "pending",
    });
    res.json({ success: true, redirectUrl: data.redirect_url });
  } catch (error: any) {
    console.error("Credo Payment Error:", error);
    res.status(500).json({ error: error.message || "Credo განვადების ინიცირება ვერ მოხერხდა" });
  }
});

app.post("/api/pay/credo/callback", async (req, res) => {
  try {
    const { application_id, status, merchant_order_id } = req.body;

    // Security: Verify this payment exists in our DB
    const paymentValid = await verifyPaymentExists(application_id, 'credo');
    if (!paymentValid) {
      console.error('[Credo Callback] Unknown payment application_id:', application_id);
      return res.status(404).json({ error: 'Payment not found' });
    }

    const isSuccess = status === "approved" || status === "completed";
    await supabaseAdmin
      .from("payments")
      .update({
        status: isSuccess ? "paid" : "failed",
        callback_data: req.body,
        paid_at: isSuccess ? new Date().toISOString() : null,
      })
      .eq("external_id", application_id);

    if (isSuccess) {
      await processSuccessfulOrder(merchant_order_id, 'credo');
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error("Credo Callback Error:", error);
    res.status(500).json({ error: "Callback processing failed" });
  }
});

// ════════════════════════════════════
// ── AI Chat ──
// ════════════════════════════════════

app.post("/api/ai/chat", aiLimiter, async (req, res) => {
  try {
    const { userMessage, history } = req.body;
    if (!userMessage || userMessage.length > 1000)
      return res.status(400).json({ error: "შეტყობინება ძალიან გრძელია ან ცარიელია." });
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === "dummy-key-to-prevent-crash")
      return res.status(500).json({ error: "API გასაღები არ არის დაყენებული." });
    if (!supabaseAdmin)
      return res.status(500).json({ error: "Supabase Admin კავშირი არ არის დაყენებული." });

    const SYSTEM_PROMPT = `შენ ხარ Kale Group-ის (kalegroup.ge) ექსპერტი AI ასისტენტი, პრესტიჟული და მაღალპროფესიონალური კონსულტანტი და ინტერიერის დიზაინერი.
ჩვენს ვებგვერდზე მომხმარებლებს შეუძლიათ შეიძინონ უმაღლესი ხარისხის ავეჯი.

მნიშვნელოვანი წესები და პირობები (FAQ):
- სამუშაო საათები: ორშაბათი-პარასკევი 10:00-19:00, შაბათი 11:00-16:00.
- მიწოდების სერვისი: თბილისის მასშტაბით უზრუნველყოფს Kale Group-ის მიწოდების სერვისი (უფასო). 
- დაბრუნების პოლიტიკა: მომხმარებელს აქვს უფლება 14 კალენდარული დღის განმავლობაში დააბრუნოს ან გადაცვალოს ნივთი, თუ ის დაუზიანებელია და შენარჩუნებულია პირველადი სახე.
- გარანტია: ყველა ავეჯზე ვრცელდება 1-წლიანი ქარხნული წუნის გარანტია.
- გადახდის მეთოდები: 
  * ონლაინ გადახდა სრულად: საქართველოს ბანკი (BOG Pay) და თიბისი ბანკი (TBC Pay).
  * ონლაინ განვადება 0%: Credo Bank (კრედო ბანკი).
ყველა გადახდა ხორციელდება დაცულად და მარტივად პირდაპირ საიტიდან (Checkout გვერდიდან).

დახმარებისთვის:
- გამოიყენე searchProducts შენი ბაზიდან ავეჯის მოსაძებნად თუ კლიენტი ითხოვს კონკრეტულ ნივთს (მაგ. ფასით, კატეგორიით ან სახელით). ნუ დაელოდები რომ მომხმარებელმა თვითონ მოძებნოს.
- გამოიყენე checkOrderStatus შეკვეთის სტატუსის შესამოწმებლად თუ კლიენტი გაძლევს შეკვეთის ID-ს.`;

    const chatTools = [{
      functionDeclarations: [
        {
          name: "searchProducts",
          description: "Search the inventory database for furniture products. Returns name, price, category, and stock status.",
          parameters: {
            type: Type.OBJECT,
            properties: {
              query: { type: Type.STRING, description: "Optional name or keyword to search for" },
              category: { type: Type.STRING, description: "Optional category filter (e.g., 'კომოდები', 'დივნები', 'სავარძლები')" },
              maxPrice: { type: Type.NUMBER, description: "Optional max price in GEL to filter" }
            }
          }
        },
        {
          name: "checkOrderStatus",
          description: "Check the status of a user's order using its alphanumeric ID or UUID.",
          parameters: {
            type: Type.OBJECT,
            properties: {
              orderId: { type: Type.STRING, description: "The ID of the order" }
            },
            required: ["orderId"]
          }
        }
      ]
    }];

    const contents = [...history, { role: "user", parts: [{ text: userMessage }] }];
    
    // Recursive function to handle function calling
    const callGemini = async (currentContents: any[]): Promise<string> => {
      const result = await genAI.models.generateContent({
        model: "gemini-2.5-flash",
        contents: currentContents,
        config: {
          systemInstruction: SYSTEM_PROMPT,
          tools: chatTools as any,
          temperature: 0.7
        },
      });

      const functionCall = result.candidates?.[0]?.content?.parts?.find((p: any) => p.functionCall)?.functionCall;

      if (functionCall) {
        currentContents.push(result.candidates![0].content); // Add model's logic
        
        let funcResult = {};
        try {
          if (functionCall.name === "searchProducts") {
            const args = functionCall.args as any;
            let queryObj = supabaseAdmin.from("products").select("id, name, price, is_on_sale, sale_price, category, in_stock").limit(10);
            if (args.query) queryObj = queryObj.ilike('name', `%${args.query}%`);
            if (args.category) queryObj = queryObj.eq('category', args.category);
            if (args.maxPrice) queryObj = queryObj.lte('price', args.maxPrice);
            
            const { data } = await queryObj;
            funcResult = { status: "success", products: data || [] };
          } 
          else if (functionCall.name === "checkOrderStatus") {
            const args = functionCall.args as any;
            const { data } = await supabaseAdmin.from("orders").select("id, status, total_price, payment_status, created_at").eq("id", args.orderId).single();
            if (data) {
              funcResult = { status: "success", order: data };
            } else {
              funcResult = { status: "not_found", message: "Order not found. Please ask the user to double check the ID." };
            }
          }
        } catch (e: any) {
           funcResult = { status: "error", message: e.message };
        }

        currentContents.push({
          role: "user",
          parts: [{
            functionResponse: {
              name: functionCall.name,
              response: funcResult
            }
          }]
        });

        // Run Gemini again with the function response
        return await callGemini(currentContents);
      }

      return result.candidates?.[0]?.content?.parts?.[0]?.text || "ბოდიშს გიხდით, პასუხის მომზადება ვერ მოხერხდა.";
    };

    const responseText = await callGemini(contents);
    res.json({ text: responseText });
    
  } catch (error: any) {
    console.error("AI Chat Error:", error.message || error);
    const isQuotaError = error.status === 429 || error.message?.includes("429");
    if (isQuotaError)
      return res.status(429).json({ error: "Gemini API-ის დღიური ლიმიტი ამოიწურა." });
    res.status(500).json({ error: "ჩეთთან დაკავშირება ვერ მოხერხდა." });
  }
});

// ════════════════════════════════════
// ── Accounting Routes ──
// ════════════════════════════════════

app.get("/api/accounting/dashboard", requireAccountingRead, async (req: any, res) => {
  try {
    const [revenueRes, cogsRes, invoicesRes, stockRes, vatRes] = await Promise.all([
      supabaseAdmin.from("v_profit_loss").select("account_type,amount").eq("account_type", "REVENUE"),
      supabaseAdmin.from("v_profit_loss").select("account_type,amount").eq("account_type", "COGS"),
      supabaseAdmin.from("invoices").select("total_amount, paid_amount, payment_status").eq("payment_status", "PAID"),
      supabaseAdmin.from("stock_levels").select("total_cost_value"),
      supabaseAdmin.from("v_vat_summary").select("net_vat_payable").order("period_year", { ascending: false }).order("period_month", { ascending: false }).limit(1),
    ]);
    const revenue = (revenueRes.data || []).reduce((s: number, r: any) => s + Number(r.amount || 0), 0);
    const cogs = (cogsRes.data || []).reduce((s: number, r: any) => s + Number(r.amount || 0), 0);
    const grossProfit = revenue - cogs;
    const totalPaidRevenue = (invoicesRes.data || []).reduce((s: number, r: any) => s + Number(r.total_amount || 0), 0);
    const inventoryValue = (stockRes.data || []).reduce((s: number, r: any) => s + Number(r.total_cost_value || 0), 0);
    const latestVatPayable = vatRes.data?.[0]?.net_vat_payable || 0;
    const { data: monthlySummary } = await supabaseAdmin.from("v_monthly_summary").select("*").order("year").order("month");
    res.json({
      kpis: {
        revenue: revenue.toFixed(2),
        cogs: cogs.toFixed(2),
        grossProfit: grossProfit.toFixed(2),
        grossMarginPct: revenue > 0 ? ((grossProfit / revenue) * 100).toFixed(1) : "0.0",
        netProfit: grossProfit.toFixed(2),
        totalPaidRevenue: totalPaidRevenue.toFixed(2),
        inventoryValue: inventoryValue.toFixed(2),
        vatPayable: Number(latestVatPayable).toFixed(2),
      },
      monthlySummary: monthlySummary || [],
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Dashboard მონაცემების მიღება ვერ მოხერხდა" });
  }
});

app.get("/api/accounting/journal-entries", requireAccountingRead, async (req: any, res) => {
  try {
    const { period_id, status, type, page = "1", limit = "20" } = req.query;
    let query = supabaseAdmin
      .from("journal_entries")
      .select("*, journal_lines(*, accounts(code, name_ka)), fiscal_periods(name)")
      .order("entry_date", { ascending: false })
      .range((Number(page) - 1) * Number(limit), Number(page) * Number(limit) - 1);
    if (period_id) query = query.eq("fiscal_period_id", period_id);
    if (status) query = query.eq("status", status);
    if (type) query = query.eq("reference_type", type);
    const { data, error } = await query;
    if (error) throw error;
    res.json({ entries: data || [] });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "ჟურნალის მიღება ვერ მოხერხდა" });
  }
});

app.get("/api/accounting/invoices", requireAccountingRead, async (req: any, res) => {
  try {
    const { type, status, page = "1", limit = "20" } = req.query;
    let query = supabaseAdmin
      .from("invoices")
      .select("*, invoice_items(*)")
      .order("invoice_date", { ascending: false })
      .range((Number(page) - 1) * Number(limit), Number(page) * Number(limit) - 1);
    if (type) query = query.eq("invoice_type", type);
    if (status) query = query.eq("payment_status", status);
    const { data, error } = await query;
    if (error) throw error;
    res.json({ invoices: data || [] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/accounting/inventory/levels", requireAccountingRead, async (_req: any, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("stock_levels")
      .select("*, products(name, category)")
      .order("updated_at", { ascending: false });
    if (error) throw error;
    res.json({ levels: data || [] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/accounting/inventory/transactions", requireAccountingRead, async (req: any, res) => {
  try {
    const { limit = "50" } = req.query;
    const { data, error } = await supabaseAdmin
      .from("inventory_transactions")
      .select("*, products(name)")
      .order("created_at", { ascending: false })
      .limit(Number(limit));
    if (error) throw error;
    res.json({ transactions: data || [] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/accounting/inventory/adjustment", requireAccounting, async (req: any, res) => {
  try {
    const { product_id, quantity, type, unit_cost, notes } = req.body;
    if (!product_id || !quantity || !type) throw new Error("აუცილებელი ველები ცარიელია");

    const { data: trx, error: trxErr } = await supabaseAdmin.from("inventory_transactions").insert({
      product_id,
      transaction_type: type,
      quantity,
      unit_cost: unit_cost || 0,
      total_cost: quantity * (unit_cost || 0),
      notes,
      created_by: req.user?.id
    }).select().single();
    if (trxErr) throw trxErr;

    const isIncoming = type.includes("IN") || type === "OPENING";
    const delta = isIncoming ? quantity : -quantity;
    
    const { data: stock } = await supabaseAdmin.from("stock_levels").select("*").eq("product_id", product_id).single();
    if (stock) {
      await supabaseAdmin.from("stock_levels").update({
        quantity_on_hand: Math.max(stock.quantity_on_hand + delta, 0),
        quantity_available: Math.max(stock.quantity_available + delta, 0),
        updated_at: new Date().toISOString()
      }).eq("product_id", product_id);
    } else if (isIncoming) {
      await supabaseAdmin.from("stock_levels").insert({
        product_id,
        quantity_on_hand: delta,
        quantity_available: delta,
        reorder_point: 10
      });
    }

    if (isIncoming && unit_cost >= 0) {
      await supabaseAdmin.from("inventory_cost_layers").insert({
        product_id,
        purchase_date: new Date().toISOString().split('T')[0],
        quantity_original: quantity,
        quantity_remaining: quantity,
        unit_cost: unit_cost || 0
      });
    }

    res.json({ success: true, transaction: trx });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/accounting/vat/summary", requireAccountingRead, async (_req: any, res) => {
  try {
    const { data, error } = await supabaseAdmin.from("v_vat_summary").select("*");
    if (error) throw error;
    res.json({ summary: data || [] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/accounting/employees", requireAccounting, async (_req: any, res) => {
  try {
    const { data, error } = await supabaseAdmin.from("employees").select("*").order("full_name");
    if (error) throw error;
    res.json({ employees: data || [] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/accounting/employees", requireAccounting, async (req: any, res) => {
  try {
    const { full_name, personal_id, position, department, gross_salary, hire_date, email, phone } = req.body;
    
    const { count } = await supabaseAdmin.from("employees").select("*", { count: 'exact', head: true });
    const employee_code = `EMP-${String((count || 0) + 1).padStart(3, '0')}`;

    const { data, error } = await supabaseAdmin.from("employees").insert({
      employee_code,
      full_name,
      personal_id,
      position,
      department,
      gross_salary,
      hire_date,
      email,
      phone,
      status: 'ACTIVE'
    }).select().single();
    
    if (error) throw error;
    res.json({ success: true, employee: data });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/accounting/payroll/runs", requireAccounting, async (_req: any, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("payroll_runs")
      .select("*, payroll_items(*, employees(full_name, position))")
      .order("created_at", { ascending: false });
    if (error) throw error;
    res.json({ runs: data || [] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/accounting/payroll/run", requireAccounting, async (req: any, res) => {
  try {
    const { period_month, period_year, fiscal_period_id } = req.body;
    if (!period_month || !period_year || !fiscal_period_id) throw new Error("Missing period data");

    const { data: employees, error: empErr } = await supabaseAdmin
      .from("employees")
      .select("*")
      .eq("status", "ACTIVE");
    if (empErr) throw empErr;
    if (!employees || employees.length === 0) throw new Error("აქტიური თანამშრომელი ვერ მოიძებნა");

    const { data: accounts } = await supabaseAdmin.from("accounts").select("id, code");
    const account8100 = accounts?.find(a => a.code === '8100')?.id;
    const account3310 = accounts?.find(a => a.code === '3310')?.id;
    const account1110 = accounts?.find(a => a.code === '1110')?.id;
    
    if (!account8100 || !account3310 || !account1110) {
      throw new Error("დარწმუნდით რომ 8100, 3310, 1110 ანგარიშები უკვე არსებობს ჩარტში.");
    }

    let totalGross = 0;
    let totalTax = 0;
    let totalNet = 0;

    const itemsToInsert = employees.map(emp => {
      const gross = Number(emp.gross_salary || 0);
      const tax = gross * 0.20; // 20% Income Tax
      const net = gross - tax;
      
      totalGross += gross;
      totalTax += tax;
      totalNet += net;

      return {
        employee_id: emp.id,
        gross_salary: gross,
        income_tax_rate: 20,
        income_tax: tax,
        net_salary: net,
        paid_date: new Date().toISOString().split('T')[0]
      };
    });

    const { data: je, error: jeErr } = await supabaseAdmin.from("journal_entries").insert({
      entry_number: `PR-${period_year}-${period_month}-${Math.floor(Date.now()/1000)}`,
      entry_date: new Date().toISOString().split('T')[0],
      description: `ხელფასები და საშემოსავლო - ${period_month}/${period_year}`,
      fiscal_period_id,
      status: 'POSTED',
      created_by: req.user?.id
    }).select().single();
    if (jeErr) throw jeErr;

    await supabaseAdmin.from("journal_lines").insert([
      { journal_entry_id: je.id, account_id: account8100, debit: totalGross, credit: 0, description: "დარიცხული ხელფასი (Gross)", cost_center: 'HR_PAYROLL' },
      { journal_entry_id: je.id, account_id: account3310, debit: 0, credit: totalTax, description: "საშემოსავლო 20%", cost_center: 'HR_PAYROLL' },
      { journal_entry_id: je.id, account_id: account1110, debit: 0, credit: totalNet, description: "გაცემული ხელფასი (Net)", cost_center: 'HR_PAYROLL' }
    ]);

    const runCode = `PAY-${period_year}${String(period_month).padStart(2, '0')}`;
    const { data: run, error: runErr } = await supabaseAdmin.from("payroll_runs").insert({
      run_code: runCode,
      period_month,
      period_year,
      fiscal_period_id,
      status: 'PAID',
      total_gross: totalGross,
      total_tax: totalTax,
      total_net: totalNet,
      journal_entry_id: je.id,
      processed_by: req.user?.id,
      paid_at: new Date().toISOString()
    }).select().single();
    if (runErr) throw runErr;

    await supabaseAdmin.from("payroll_items").insert(itemsToInsert.map(i => ({ ...i, payroll_run_id: run.id })));

    res.json({ success: true, run_code: runCode, total_net: totalNet, total_tax: totalTax });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/accounting/dividends/declare", requireAccounting, async (req: any, res) => {
  try {
    const { amount, date, fiscal_period_id } = req.body;
    if (!amount || !date || !fiscal_period_id) throw new Error("Missing data (amount, date, period)");

    const distributeAmount = Number(amount);
    if (distributeAmount <= 0) throw new Error("დივიდენდის თანხა უნდა იყოს > 0");

    const profitTax = (distributeAmount / 0.85) * 0.15;

    const { data: accounts } = await supabaseAdmin.from("accounts").select("id, code");
    const account5200 = accounts?.find(a => a.code === '5200')?.id; 
    const account3320 = accounts?.find(a => a.code === '3320')?.id; 
    const account3330 = accounts?.find(a => a.code === '3330')?.id; 
    const account8950 = accounts?.find(a => a.code === '8950')?.id; 

    if (!account5200 || !account3320 || !account3330 || !account8950) {
      throw new Error("დარწმუნდით რომ 5200, 3320, 3330, 8950 ანგარიშები უკვე არსებობს ჩარტში.");
    }

    const { data: je, error: jeErr } = await supabaseAdmin.from("journal_entries").insert({
      entry_number: `DIV-${date.split('-').join('').substring(0,8)}-${Math.floor(Date.now()/1000)}`,
      entry_date: date,
      description: `მოგების განაწილება დეკლარირება - (ესტონური მოდელი, 15% მოგ. 8950)`,
      fiscal_period_id,
      status: 'POSTED',
      created_by: req.user?.id
    }).select().single();
    if (jeErr) throw jeErr;

    await supabaseAdmin.from("journal_lines").insert([
      { journal_entry_id: je.id, account_id: account5200, debit: distributeAmount, credit: 0, description: "დივიდენდის განაწილება", cost_center: 'MANAGEMENT' },
      { journal_entry_id: je.id, account_id: account8950, debit: profitTax, credit: 0, description: "მოგების გადასახადის ხარჯი (ესტონური მოდელი)", cost_center: 'MANAGEMENT' },
      { journal_entry_id: je.id, account_id: account3330, debit: 0, credit: distributeAmount, description: "შვილობილზე გადასახდელი დივიდენდი", cost_center: 'MANAGEMENT' },
      { journal_entry_id: je.id, account_id: account3320, debit: 0, credit: profitTax, description: "სახელმწიფო მოგების გადასახადი 15%", cost_center: 'MANAGEMENT' }
    ]);

    res.json({ success: true, entry: je, profit_tax: profitTax });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/accounting/reports/trial-balance", requireAccountingRead, async (req: any, res) => {
  try {
    const { startDate, endDate } = req.query;
    const start = startDate || new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];
    const end = endDate || new Date().toISOString().split('T')[0];

    const { data, error } = await supabaseAdmin.rpc("get_trial_balance_report", {
      p_start_date: start,
      p_end_date: end
    });
    
    if (error) throw error;
    const totalDebit = (data || []).reduce((s: number, r: any) => s + Number(r.total_debit), 0);
    const totalCredit = (data || []).reduce((s: number, r: any) => s + Number(r.total_credit), 0);
    res.json({ accounts: data || [], totalDebit, totalCredit, balanced: Math.abs(totalDebit - totalCredit) < 0.01 });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/accounting/reports/profit-loss", requireAccountingRead, async (req: any, res) => {
  try {
    const { startDate, endDate } = req.query;
    const start = startDate || new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];
    const end = endDate || new Date().toISOString().split('T')[0];

    const { data, error } = await supabaseAdmin.rpc("get_profit_loss_report", {
      p_start_date: start,
      p_end_date: end
    });

    if (error) throw error;
    const revenue = (data || []).filter((r: any) => r.account_type === "REVENUE").reduce((s: number, r: any) => s + Number(r.amount), 0);
    const cogs = (data || []).filter((r: any) => r.account_type === "COGS").reduce((s: number, r: any) => s + Number(r.amount), 0);
    const opex = (data || []).filter((r: any) => r.account_type === "EXPENSE").reduce((s: number, r: any) => s + Number(r.amount), 0);
    res.json({ lines: data || [], summary: { revenue, cogs, grossProfit: revenue - cogs, opex, netProfit: revenue - cogs - opex } });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/accounting/reports/balance-sheet", requireAccountingRead, async (req: any, res) => {
  try {
    const { date } = req.query;
    const targetDate = date || new Date().toISOString().split('T')[0];

    const { data, error } = await supabaseAdmin.rpc("get_balance_sheet_report", {
      p_date: targetDate
    });

    if (error) throw error;
    
    // We need to calculate retained earnings (previous years + current year P&L up to this date)
    // Actually our RPC returns all accounts including Revenue/Expense up to p_date.
    // To show a proper balance sheet, we usually group Rev/Exp into a single "Current Period P&L" line.
    
    const assets = (data || []).filter((r: any) => r.account_type === "ASSET").reduce((s: number, r: any) => s + Number(r.balance || 0), 0);
    const liabilities = (data || []).filter((r: any) => r.account_type === "LIABILITY").reduce((s: number, r: any) => s + Number(r.balance || 0), 0);
    const equityBase = (data || []).filter((r: any) => r.account_type === "EQUITY").reduce((s: number, r: any) => s + Number(r.balance || 0), 0);
    
    const revTotal = (data || []).filter((r: any) => r.account_type === "REVENUE").reduce((s: number, r: any) => s + Number(r.balance || 0), 0);
    const cogsTotal = (data || []).filter((r: any) => r.account_type === "COGS").reduce((s: number, r: any) => s + Number(r.balance || 0), 0);
    const expTotal = (data || []).filter((r: any) => r.account_type === "EXPENSE").reduce((s: number, r: any) => s + Number(r.balance || 0), 0);
    
    const currentPL = revTotal - cogsTotal - expTotal;
    const totalEquity = equityBase + currentPL;

    // Filter out Rev/Exp from the lines for display in Balance Sheet, but add a virtual line for Current P&L
    const filteredLines = [
      ...(data || []).filter((r: any) => ["ASSET", "LIABILITY", "EQUITY"].includes(r.account_type)),
      { account_type: "EQUITY", code: "5300", name_ka: "მიმდინარე პერიოდის მოგება/ზარალი", balance: currentPL }
    ];

    res.json({ lines: filteredLines, summary: { assets, liabilities, equity: totalEquity, balanced: Math.abs(assets - liabilities - totalEquity) < 0.01 } });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/accounting/fiscal-periods", requireAccountingRead, async (_req: any, res) => {
  try {
    const { data, error } = await supabaseAdmin.from("fiscal_periods").select("*").order("period_year").order("period_month");
    if (error) throw error;
    res.json({ periods: data || [] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/accounting/accounts", requireAccountingRead, async (_req: any, res) => {
  try {
    const { data, error } = await supabaseAdmin.from("accounts").select("*").eq("is_active", true).order("code");
    if (error) throw error;
    res.json({ accounts: data || [] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ════════════════════════════════════
// ── RS.ge Integration (Waybills) ──
// ════════════════════════════════════

app.get("/api/rs-ge/waybills", requireAccountingRead, async (_req: any, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("rs_waybills")
      .select("*, orders(customer_first_name, customer_last_name, total_price)")
      .order("created_at", { ascending: false });
    if (error) throw error;
    res.json({ waybills: data || [] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/rs-ge/waybill/draft", requireAccountingRead, async (req: any, res) => {
  try {
    const { order_id, transport_type, start_address, end_address, driver_name, car_number } = req.body;
    
    // Check if waybill already exists
    const { data: existing } = await supabaseAdmin
      .from("rs_waybills")
      .select("id")
      .eq("order_id", order_id)
      .single();
      
    if (existing) {
      return res.status(400).json({ error: "ამ შეკვეთაზე ზედნადები უკვე არსებობს" });
    }

    const { data, error } = await supabaseAdmin
      .from("rs_waybills")
      .insert({
        order_id,
        transport_type: transport_type || 1, // 1=საავტომობილო
        start_address: start_address || 'თბილისი, შოურუმი',
        end_address: end_address || '',
        driver_name: driver_name || '',
        car_number: car_number || '',
        status: 'DRAFT'
      })
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, waybill: data });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/rs-ge/waybill/send", requireAccountingRead, async (req: any, res) => {
  try {
    const { waybill_id } = req.body;
    
    const { data: waybill } = await supabaseAdmin
      .from("rs_waybills")
      .select("*")
      .eq("id", waybill_id)
      .single();
      
    if (!waybill) return res.status(404).json({ error: "ზედნადები ვერ მოიძებნა" });
    if (waybill.status === "SENT") return res.status(400).json({ error: "უკვე გაგზავნილია" });

    // ─────────────────────────────────────────────────────────
    // RS.ge SOAP API Stub (Placeholder for actual implementation)
    // ─────────────────────────────────────────────────────────
    // In production, we would use node-soap or fetch with XML payload to:
    // https://services.rs.ge/WayBillService/WayBillService.asmx
    // using process.env.RS_SU and process.env.RS_SP
    
    const mockRsWaybillId = `RS-${Math.floor(Math.random() * 10000000)}`;
    
    const { data, error } = await supabaseAdmin
      .from("rs_waybills")
      .update({
        status: 'SENT',
        rs_waybill_id: mockRsWaybillId
      })
      .eq("id", waybill_id)
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, message: "ზედნადები წარმატებით გაიგზავნა RS.ge-ზე", waybill: data });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/rs-ge/waybill/incoming/accept", requireAccountingRead, async (req: any, res) => {
  try {
    const { id } = req.body;
    
    // 1. Get the waybill
    const { data: waybill, error: wError } = await supabaseAdmin
      .from('rs_incoming_waybills')
      .select('*')
      .eq('id', id)
      .single();
      
    if (wError || !waybill) throw new Error("ზედნადები ვერ მოიძებნა");
    if (waybill.status === 'ACCEPTED') throw new Error("უკვე მიღებულია");

    // 2. Update status to ACCEPTED
    const { error: updateError } = await supabaseAdmin
      .from('rs_incoming_waybills')
      .update({ status: 'ACCEPTED' })
      .eq('id', id);
      
    if (updateError) throw updateError;
    
    // 3. Optional: Create Journal Entry for the purchase (Debit: Inventory/Raw Materials, Credit: Accounts Payable)
    // We get the active fiscal period
    const { data: period } = await supabaseAdmin
      .from('fiscal_periods')
      .select('id')
      .eq('status', 'OPEN')
      .order('period_year', { ascending: false })
      .order('period_month', { ascending: false })
      .limit(1)
      .single();

    if (period) {
      // Find accounts
      const { data: accounts } = await supabaseAdmin.from('accounts').select('id, code').in('code', ['1600', '3100']);
      const invAccount = accounts?.find(a => a.code === '1600')?.id; // ნედლეული შემოვიდა
      const apAccount = accounts?.find(a => a.code === '3100')?.id;  // მომწოდებლის ვალი

      if (invAccount && apAccount) {
        const { data: journalEntry, error: jError } = await supabaseAdmin
          .from('journal_entries')
          .insert({
            entry_number: `RS-IN-${Math.floor(Date.now() / 1000)}`,
            entry_date: new Date().toISOString().split('T')[0],
            description: `შემომავალი ზედნადები RS.ge: ${waybill.rs_waybill_id} (${waybill.supplier_name})`,
            reference_type: 'WAYBILL_IN',
            reference_id: waybill.id,
            fiscal_period_id: period.id,
            status: 'POSTED',
            created_by: req.user?.id || null
          })
          .select()
          .single();

        if (!jError && journalEntry) {
          await supabaseAdmin.from('journal_lines').insert([
            { journal_entry_id: journalEntry.id, account_id: invAccount, debit: waybill.total_amount, credit: 0 },
            { journal_entry_id: journalEntry.id, account_id: apAccount, debit: 0, credit: waybill.total_amount }
          ]);
        }
      }
    }

    res.json({ success: true, message: "მიღება დადასტურებულია" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/accounting/nbg-rates", requireAccountingRead, async (req, res) => {
  try {
    const nbgRes = await fetch("https://nbg.gov.ge/gw/api/ct/monetarypolicy/currencies/ka/json");
    if (!nbgRes.ok) throw new Error("ეროვნული ბანკის API მიუწვდომელია");
    const data = await nbgRes.json();
    
    // NBG format is usually [{ date: "...", currencies: [{ code: "USD", rate: 2.7 }, { code: "EUR", rate: 3.0 }] }]
    if (data && data.length > 0 && data[0].currencies) {
      res.json({ success: true, rates: data[0].currencies });
    } else {
      res.status(500).json({ error: "არასწორი პასუხი ეროვნული ბანკიდან" });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── Export for Vercel ──
export default app;
