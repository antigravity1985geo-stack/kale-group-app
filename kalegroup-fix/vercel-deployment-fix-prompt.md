# Kale Group App — Vercel Deployment Fix

## პრობლემა
პროექტი localhost-ზე მუშაობს, მაგრამ Vercel-ზე `/api/health` და სხვა endpoint-ები აბრუნებს:
```
500: INTERNAL_SERVER_ERROR
Code: FUNCTION_INVOCATION_FAILED
```

## მიზეზი
`server.ts` არის long-running Express სერვერი (`app.listen(3000)`).  
Vercel კი Serverless პლატფორმაა — ის ელის მოკლე, იზოლირებულ ფუნქციებს და Express-ის ამ ფორმატს ვერ ემსახურება.

## Tech Stack
- Frontend: React 19 + Vite 6
- Backend: Node.js + Express (`server.ts`)
- Database/Auth: Supabase
- AI: Google Gemini (`/api/ai/chat`, `/api/ai/generate-image`)
- Styling: Tailwind CSS 4

---

## გზა 1 — Railway-ზე გადასვლა (✅ რეკომენდებული — ყველაზე მარტივი)

Railway Express/Node სერვერებს ნატიურად ემსახურება. კოდი **ცვლილების გარეშე** იმუშავებს.

### ნაბიჯები:
1. გადადი [railway.app](https://railway.app) → "New Project" → "Deploy from GitHub repo"
2. აირჩიე `kale-group-app` რეპო
3. Railway ავტომატურად აღმოაჩენს Node.js-ს
4. "Variables" ჩანართში დაამატე ეს env ცვლადები:

```env
VITE_SUPABASE_URL=შენი_supabase_url
VITE_SUPABASE_ANON_KEY=შენი_anon_key
SUPABASE_SERVICE_ROLE_KEY=შენი_service_role_key
GEMINI_API_KEY=შენი_gemini_key
NODE_ENV=production
APP_URL=https://შენი-პროექტი.railway.app
```

5. "Settings" → "Start Command":
```bash
npm run build && node server.ts
```

> ⚠️ `package.json`-ში `start` script უნდა იყოს: `"start": "tsx server.ts"`  
> Railway production-ში `npm start`-ს გაუშვებს.

### Railway-ის უპირატესობები ამ პროექტისთვის:
- Express სერვერი ზუსტად ისე მუშაობს როგორც localhost-ზე
- WebSocket მხარდაჭერა (მომავლისთვის)
- ადვილი env ცვლადების მართვა
- Free tier ხელმისაწვდომია

---

## გზა 2 — Vercel-ზე დარჩენა `vercel.json`-ით (Intermediate)

Vercel-ზე Express სერვერის გასამართად საჭიროა კოდში ცვლილებები.

### ნაბიჯი 1 — დააინსტალირე `@vercel/node` adapter

```bash
npm install @vercel/node
```

### ნაბიჯი 2 — შექმენი `vercel.json` root-ში

```json
{
  "version": 2,
  "buildCommand": "vite build",
  "outputDirectory": "dist",
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/api/index" }
  ]
}
```

### ნაბიჯი 3 — შექმენი `api/index.ts` ფაილი

`server.ts`-ის მთელი შიგთავსი გადაიტანე ახალ ფაილში `api/index.ts`, მაგრამ `app.listen()`-ის ნაცვლად export გააკეთე:

```typescript
// api/index.ts
import express from "express";
import { GoogleGenAI } from "@google/genai";
import { createClient } from "@supabase/supabase-js";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import "dotenv/config";

const app = express();

// ... (server.ts-ის ყველა middleware და route იგივე რჩება)

// ❌ წაშალე ეს:
// app.listen(PORT, "0.0.0.0", () => { ... });

// ✅ დაამატე ეს:
export default app;
```

### ნაბიჯი 4 — Vercel Dashboard-ში დაამატე env ცვლადები

Vercel → პროექტი → Settings → Environment Variables:
```
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
GEMINI_API_KEY
APP_URL=https://შენი-პროექტი.vercel.app
```

### ნაბიჯი 5 — Redeploy

```bash
git add .
git commit -m "fix: adapt Express for Vercel serverless"
git push
```

> ⚠️ შეზღუდვა: Vercel Serverless Functions-ს აქვს **10 წამიანი timeout** (Hobby plan).  
> Gemini image generation შესაძლოა timeout-ს გადააჭარბოს. Pro plan-ზე 60 წამია.

---

## გზა 3 — Hybrid: Vercel (Frontend) + Railway (Backend API)

ყველაზე production-ready გადაწყვეტა. Frontend Vercel-ზე, Backend Railway-ზე.

### არქიტექტურა:
```
Browser → Vercel (React/Vite static) → Railway (Express API)
                                              ↓
                                         Supabase + Gemini
```

### ნაბიჯი 1 — Backend Railway-ზე გაუშვი (იხ. გზა 1)

Railway URL-ს სახე ექნება: `https://kale-group-api.railway.app`

### ნაბიჯი 2 — Frontend-ში API URL-ი შეცვალე

შექმენი `src/config/api.ts`:

```typescript
export const API_BASE_URL = import.meta.env.VITE_API_URL || '';
```

ყველა `fetch('/api/...')` შეცვალე:

```typescript
// ❌ იყო:
fetch('/api/ai/chat', { ... })

// ✅ გახდა:
fetch(`${API_BASE_URL}/api/ai/chat`, { ... })
```

### ნაბიჯი 3 — Vercel-ზე დაამატე env ცვლადი

```
VITE_API_URL=https://kale-group-api.railway.app
```

### ნაბიჯი 4 — Railway-ზე CORS განაახლე

`server.ts`-ში:
```typescript
app.use(cors({
  origin: [
    'https://kale-group-app.vercel.app',  // Vercel frontend
    'http://localhost:3000'               // local dev
  ]
}));
```

---

## რეკომენდაცია

| | გზა 1 (Railway) | გზა 2 (Vercel only) | გზა 3 (Hybrid) |
|---|---|---|---|
| სირთულე | ✅ მარტივი | ⚠️ საშუალო | ⚠️ საშუალო |
| კოდის ცვლილება | ✅ არ არის საჭირო | ⚠️ საჭიროა | ⚠️ საჭიროა |
| Gemini timeout | ✅ პრობლემა არ არის | ⚠️ შესაძლო პრობლემა | ✅ პრობლემა არ არის |
| ფასი | Free tier ✅ | Free tier ✅ | Free tier ✅ |

**→ ამ პროექტისთვის გზა 1 (Railway) ან გზა 3 (Hybrid) ოპტიმალურია.**
