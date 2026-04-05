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
  app.use(cors()); // Allow all origins for the Vercel serverless function to prevent blocking
  app.use(express.json({ limit: '10mb' }));

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

  // BOG Payment Initiation (Mocked structure for real integration)
  app.post("/api/pay/bog", async (req, res) => {
    try {
      const { productId, amount } = req.body;
      const clientId = process.env.BOG_CLIENT_ID;
      const secret = process.env.BOG_SECRET;

      if (!clientId || !secret) {
        return res.status(500).json({ error: "BOG API keys are not configured in the environment." });
      }

      // 1. Get OAuth Token
      // const tokenResponse = await fetch('https://oauth2.bog.ge/auth/realms/bog/protocol/openid-connect/token', { ... });
      // const token = await tokenResponse.json();

      // 2. Create Order
      // const orderResponse = await fetch('https://api.bog.ge/payments/v1/ecommerce/orders', { ... });
      // const order = await orderResponse.json();

      // Mock response for now
      console.log(`Initiating BOG payment for product ${productId}, amount: ${amount}`);
      res.json({ 
        success: true, 
        redirectUrl: "https://ecommerce.bog.ge/payment/mock-redirect",
        message: "BOG Payment initiated successfully" 
      });
    } catch (error) {
      console.error("BOG Payment Error:", error);
      res.status(500).json({ error: "Failed to initiate BOG payment" });
    }
  });

  // TBC Payment Initiation (Mocked structure for real integration)
  app.post("/api/pay/tbc", async (req, res) => {
    try {
      const { productId, amount } = req.body;
      const apiKey = process.env.TBC_API_KEY;
      const clientId = process.env.TBC_CLIENT_ID;
      const clientSecret = process.env.TBC_CLIENT_SECRET;

      if (!apiKey || !clientId || !clientSecret) {
        return res.status(500).json({ error: "TBC API keys are not configured in the environment." });
      }

      // 1. Get Access Token
      // const tokenResponse = await fetch('https://api.tbcbank.ge/v1/tpay/access-token', { ... });
      // const token = await tokenResponse.json();

      // 2. Create Payment
      // const paymentResponse = await fetch('https://api.tbcbank.ge/v1/tpay/payments', { ... });
      // const payment = await paymentResponse.json();

      // Mock response for now
      console.log(`Initiating TBC payment for product ${productId}, amount: ${amount}`);
      res.json({ 
        success: true, 
        redirectUrl: "https://tpay.tbcbank.ge/mock-redirect",
        message: "TBC Payment initiated successfully" 
      });
    } catch (error) {
      console.error("TBC Payment Error:", error);
      res.status(500).json({ error: "Failed to initiate TBC payment" });
    }
  });

  // Credo Bank Installment Initiation (Mocked structure for real integration)
  app.post("/api/pay/credo", async (req, res) => {
    try {
      const { items, totalAmount } = req.body;
      const apiKey = process.env.CREDO_API_KEY;

      if (!apiKey) {
        return res.status(500).json({ error: "Credo API key is not configured in the environment." });
      }

      // 1. Initiate Installment Application
      // const installmentResponse = await fetch('https://api.credo.ge/v1/installments/initiate', { ... });
      // const installment = await installmentResponse.json();

      // Mock response for now
      console.log(`Initiating Credo installment for amount: ${totalAmount}`);
      res.json({ 
        success: true, 
        redirectUrl: "https://installment.credobank.ge/mock-redirect",
        message: "Credo Installment initiated successfully" 
      });
    } catch (error) {
      console.error("Credo Installment Error:", error);
      res.status(500).json({ error: "Failed to initiate Credo installment" });
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
        ? `CURRENT INVENTORY:\n${products.map(p => `- ${p.name} (${p.category}): ${p.price} GEL, Material: ${p.material}, Stock: ${p.in_stock ? 'Yes' : 'No'}`).join('\n')}`
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
