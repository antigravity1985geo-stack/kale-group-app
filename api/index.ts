// Vercel Serverless Function entry point
// This re-exports the Express app from server.ts as a serverless handler

import express from "express";
import { GoogleGenAI } from "@google/genai";
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
  res.json({ status: "ok", time: new Date().toISOString() });
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
    const { order_id, status, external_order_id } = req.body;
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
      await supabaseAdmin
        .from("orders")
        .update({ status: "confirmed", payment_status: "paid", payment_provider: "bog" })
        .eq("id", external_order_id);
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
    const isSuccess = Status === "Succeeded";
    await supabaseAdmin
      .from("payments")
      .update({
        status: isSuccess ? "paid" : "failed",
        callback_data: req.body,
        paid_at: isSuccess ? new Date().toISOString() : null,
      })
      .eq("external_id", PayId);
    if (isSuccess)
      await supabaseAdmin
        .from("orders")
        .update({ status: "confirmed", payment_status: "paid", payment_provider: "tbc" })
        .eq("id", Extra);
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
    const isSuccess = status === "approved" || status === "completed";
    await supabaseAdmin
      .from("payments")
      .update({
        status: isSuccess ? "paid" : "failed",
        callback_data: req.body,
        paid_at: isSuccess ? new Date().toISOString() : null,
      })
      .eq("external_id", application_id);
    if (isSuccess)
      await supabaseAdmin
        .from("orders")
        .update({ status: "confirmed", payment_status: "paid", payment_provider: "credo" })
        .eq("id", merchant_order_id);
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
    if (!supabase)
      return res.status(500).json({ error: "Supabase კავშირი არ არის დაყენებული." });

    const { data: products } = await supabase
      .from("products")
      .select("name, price, category, material, in_stock");
    const productContext =
      products && products.length > 0
        ? `CURRENT INVENTORY:\n${products
            .map(
              (p: any) =>
                `- ${p.name} (${p.category}): ${p.price} GEL, Material: ${p.material}, Stock: ${p.in_stock ? "Yes" : "No"}`
            )
            .join("\n")}`
        : "Inventory data is currently unavailable.";

    const SYSTEM_PROMPT = `შენ ხარ Kale Group-ის (kalegroup.ge) ექსპერტი AI ასისტენტი, პრესტიჟული და მაღალპროფესიონალური კონსულტანტი და ინტერიერის დიზაინერი.`;

    const contents = [...history, { role: "user", parts: [{ text: userMessage }] }];
    const result = await genAI.models.generateContent({
      model: "gemini-2.5-flash",
      contents,
      config: {
        systemInstruction: `${SYSTEM_PROMPT}\n\n=== LIVE INVENTORY ===\n${productContext}\n======================`,
      },
    });

    const responseText =
      result.candidates?.[0]?.content?.parts?.[0]?.text ||
      "ბოდიშს გიხდით, პასუხის მომზადება ვერ მოხერხდა.";
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

app.get("/api/accounting/reports/trial-balance", requireAccountingRead, async (_req: any, res) => {
  try {
    const { data, error } = await supabaseAdmin.from("v_trial_balance").select("*");
    if (error) throw error;
    const totalDebit = (data || []).reduce((s: number, r: any) => s + Number(r.total_debit), 0);
    const totalCredit = (data || []).reduce((s: number, r: any) => s + Number(r.total_credit), 0);
    res.json({ accounts: data || [], totalDebit, totalCredit, balanced: Math.abs(totalDebit - totalCredit) < 0.01 });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/accounting/reports/profit-loss", requireAccountingRead, async (_req: any, res) => {
  try {
    const { data, error } = await supabaseAdmin.from("v_profit_loss").select("*");
    if (error) throw error;
    const revenue = (data || []).filter((r: any) => r.account_type === "REVENUE").reduce((s: number, r: any) => s + Number(r.amount), 0);
    const cogs = (data || []).filter((r: any) => r.account_type === "COGS").reduce((s: number, r: any) => s + Number(r.amount), 0);
    const opex = (data || []).filter((r: any) => r.account_type === "EXPENSE").reduce((s: number, r: any) => s + Number(r.amount), 0);
    res.json({ lines: data || [], summary: { revenue, cogs, grossProfit: revenue - cogs, opex, netProfit: revenue - cogs - opex } });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/accounting/reports/balance-sheet", requireAccountingRead, async (_req: any, res) => {
  try {
    const { data, error } = await supabaseAdmin.from("v_balance_sheet").select("*");
    if (error) throw error;
    const assets = (data || []).filter((r: any) => r.account_type === "ASSET").reduce((s: number, r: any) => s + Number(r.balance), 0);
    const liabilities = (data || []).filter((r: any) => r.account_type === "LIABILITY").reduce((s: number, r: any) => s + Number(r.balance), 0);
    const equity = (data || []).filter((r: any) => r.account_type === "EQUITY").reduce((s: number, r: any) => s + Number(r.balance), 0);
    res.json({ lines: data || [], summary: { assets, liabilities, equity, balanced: Math.abs(assets - liabilities - equity) < 0.01 } });
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

// ── Export for Vercel ──
export default app;
