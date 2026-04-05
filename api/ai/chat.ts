import { GoogleGenAI } from "@google/genai";
import { createClient } from "@supabase/supabase-js";

export default async function handler(req: any, res: any) {
  // CORS configuration (optional, if Vercel doesn't handle it)
  res.setHeader('Access-Control-Allow-Credentials', true)
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT')
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  )
  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { userMessage, history } = req.body;

    if (!userMessage || userMessage.length > 1000) {
      return res.status(400).json({ error: "შეტყობინება ძალიან გრძელია ან ცარიელია." });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: "API გასაღები არ არის დაყენებული (GEMINI_API_KEY)." });
    }

    if (!process.env.VITE_SUPABASE_URL || !process.env.VITE_SUPABASE_ANON_KEY) {
      return res.status(500).json({ error: "Supabase კავშირი არ არის დაყენებული (VITE_SUPABASE_URL)." });
    }

    const supabase = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.VITE_SUPABASE_ANON_KEY
    );

    const genAI = new GoogleGenAI({ 
      apiKey: process.env.GEMINI_API_KEY
    });

    // Fetch real-time products for context
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

    res.status(200).json({ text: responseText });
  } catch (error: any) {
    console.error("AI Chat Error:", error.message || error);
    const isQuotaError = error.status === 429 || (error.message && error.message.includes("429"));
    
    if (isQuotaError) {
      return res.status(429).json({ error: "Gemini API-ის დღიური ლიმიტი ამოიწურა (429). გთხოვთ, გამოიყენოთ სხვა API გასაღები ან სცადოთ მოგვიანებით." });
    }
    
    res.status(500).json({ error: "ჩეთთან დაკავშირება ვერ მოხერხდა. გთხოვთ, სცადოთ მოგვიანებით." });
  }
}
