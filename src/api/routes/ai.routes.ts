import { Router } from "express";
import { supabase, supabaseAdmin } from "../services/supabase.service.js";
import { genAI } from "../services/gemini.service.js";
import { aiLimiter, aiImageLimiter } from "../middleware/rate-limit.middleware.js";
import { requireAccountingRead } from "./accounting.routes.js";
import { containsPromptInjection, sanitizeUserText } from "../services/promptGuard.service.js";

const router = Router();

// ── AI History Sanitization ──
function sanitizeHistory(history: any[]): { role: string; parts: { text: string }[] }[] {
  if (!Array.isArray(history)) return [];
  return history
    .filter((msg: any) => 
      msg && 
      typeof msg === 'object' && 
      (msg.role === 'user' || msg.role === 'model') &&
      Array.isArray(msg.parts) &&
      msg.parts.length > 0 &&
      msg.parts.every((p: any) => typeof p?.text === 'string' && p.text.length <= 2000)
    )
    .slice(-20) // მაქსიმუმ 20 მესიჯი history-ში
    .map((msg: any) => ({
      role: msg.role as string,
      parts: msg.parts
        .filter((p: any) => typeof p?.text === 'string')
        .map((p: any) => ({ text: p.text.slice(0, 2000) }))
    }));
}



// AI Chat Assistant Route (Public)
router.post("/chat", aiLimiter, async (req: any, res) => {
  try {
    const { userMessage, history } = req.body;

    if (!userMessage || userMessage.length > 1000) {
      return res.status(400).json({ error: "შეტყობინება ძალიან გრძელია ან ცარიელია." });
    }

    if (containsPromptInjection(userMessage)) {
      console.warn('[AI Chat] Blocked potential prompt injection attempt');
      return res.status(400).json({ error: "თქვენი მოთხოვნა დაბლოკილია უსაფრთხოების მიზნით." });
    }
    const safeUserMessage = sanitizeUserText(userMessage, 1000);

    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === "dummy-key-to-prevent-crash") {
      return res.status(500).json({ error: "API გასაღები არ არის დაყენებული (GEMINI_API_KEY)." });
    }

    if (!supabase) {
      return res.status(500).json({ error: "Supabase კავშირი არ არის დაყენებული (VITE_SUPABASE_URL)." });
    }

    const { data: products } = await supabase.from('products').select('name, price, category, material, in_stock, description, dimensions, warranty, delivery, colors, discount_percentage, sale_price, is_on_sale');
    
    const productContext = products && products.length > 0 
      ? `CURRENT INVENTORY:\n${products.map((p: any) => {
          const saleInfo = p.is_on_sale ? `(SALE: ${p.sale_price} GEL / -${p.discount_percentage}%)` : '';
          const dimensions = p.dimensions ? `Dimensions: ${p.dimensions}` : '';
          const colors = p.colors && p.colors.length > 0 ? `Colors: ${p.colors.join(', ')}` : '';
          return `- ${p.name} (${p.category}): ${p.price} GEL ${saleInfo}. Material: ${p.material || 'N/A'}. Stock: ${p.in_stock ? 'Yes' : 'No'}. Warranty: ${p.warranty || 'N/A'}, Delivery: ${p.delivery || 'N/A'}. ${dimensions} | ${colors} | Desc: ${p.description || ''}`;
        }).join('\n')}`
      : 'Inventory data is currently unavailable.';

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
      ...sanitizeHistory(history || []),
      {
        role: "user",
        parts: [{ text: safeUserMessage }]
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
router.post("/generate-image", aiImageLimiter, async (req: any, res) => {
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

// ADMIN AI CHAT (v2 — Full Financial Intelligence)
router.post("/admin-chat", requireAccountingRead, async (req: any, res: any) => {
  try {
    const { userMessage, history = [] } = req.body;
    const role = req.userProfile?.role || 'consultant';

    let dbContext = '';

    if (role === 'admin' || role === 'accountant') {
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

    if (containsPromptInjection(userMessage)) {
      return res.status(400).json({ error: "მოთხოვნა დაბლოკილია." });
    }
    const safeUserMessage = sanitizeUserText(userMessage, 1000);
    const contents = [
      ...sanitizeHistory(history || []),
      { role: "user", parts: [{ text: safeUserMessage }] }
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

export default router;
