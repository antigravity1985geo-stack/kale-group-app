# 🔒 KALE GROUP ERP — მკაცრი რემედიაციის გეგმა v1.0

> [!CAUTION]
> ## ⛔ აბსოლუტური წესი
> **ეს გეგმა არის MANDATORY და SEQUENTIAL.** ნაბიჯების გადახტომა, თანმიმდევრობის შეცვლა, ან "საკუთარი ინტერპრეტაცია" **კატეგორიულად აკრძალულია.**
> 
> თითოეული ნაბიჯი შეიცავს:
> 1. 📁 ზუსტი ფაილის გზა
> 2. 📍 ზუსტი ხაზის ნომრები
> 3. ❌ წასაშლელი/შესაცვლელი კოდი (სიტყვასიტყვით)
> 4. ✅ ჩასანაცვლებელი კოდი (სიტყვასიტყვით)
> 5. 🧪 ვერიფიკაციის ბრძანება
>
> **ყოველი ნაბიჯის შემდეგ** გაუშვი ვერიფიკაცია. თუ fail → STOP. არ გააგრძელო.

---

## 📋 რას არ ეხება ეს გეგმა (EXCLUDED)

| გამორიცხული | მიზეზი |
|-------------|--------|
| TBC Payment Callback Verification | API Key არ არის |
| Credo Payment Callback Verification | API Key არ არის |
| RS.GE (`rsge.service.ts`) → supabaseAdmin | RS.GE API Key არ არის |
| RS.GE SOAP Client fixes | RS.GE API Key არ არის |

> ეს საკითხები მოგვიანებით, API Key-ების მიღების შემდეგ დამუშავდება ცალკე გეგმით.

---

## სტრუქტურა

```
ფაზა A: კრიტიკული ფიქსები (ნაბიჯები 1-5)    — ფუნქციური რეგრესიები, უსაფრთხოება
ფაზა B: უსაფრთხოების გამკაცრება (ნაბიჯები 6-9)  — ეშაფეჩეჯი (defense-in-depth)
ფაზა C: Database Hygiene (ნაბიჯები 10-12)       — RLS ოპტიმიზაცია, cleanup
```

---

# ფაზა A: კრიტიკული ფიქსები

---

## ნაბიჯი 1: `requireAdmin` ფუნქციური რეგრესიის გამოსწორება

> [!CAUTION]
> **პრიორიტეტი: P0 — BLOCKING BUG**
> ყველა admin endpoint (`/api/admin/*`) ამჟამად აბრუნებს 401. ადმინ პანელის მოწვევები, კონსულტანტების სია, RS.GE რეინვოისი — არცერთი არ მუშაობს.

### პრობლემა
`admin.routes.ts:9` იძახებს `router.use(requireAdmin)`, მაგრამ `requireAdmin` (auth.middleware.ts:30) ამოწმებს `req.user`-ს, რომელიც მხოლოდ `requireAuth`-ის მიერ ინიშნება. **`requireAuth` არასდროს იძახება `requireAdmin`-ის წინ.**

### ფაილი: `src/api/routes/admin.routes.ts`
### ხაზი: 3 და 9

**ნაბიჯი 1.1 — შეცვალე import (ხაზი 3):**

❌ ძველი:
```typescript
import { requireAdmin } from "../middleware/auth.middleware.js";
```

✅ ახალი:
```typescript
import { requireAuth, requireAdmin } from "../middleware/auth.middleware.js";
```

**ნაბიჯი 1.2 — შეცვალე middleware chain (ხაზი 9):**

❌ ძველი:
```typescript
router.use(requireAdmin);
```

✅ ახალი:
```typescript
router.use(requireAuth, requireAdmin);
```

### 🧪 ვერიფიკაცია:
```bash
npx tsc --noEmit
```
**მოსალოდნელი:** 0 error. თუ error → STOP.

---

## ნაბიჯი 2: `supabaseAdmin` — ჩუმი fallback-ის აღმოფხვრა

> [!WARNING]
> **პრიორიტეტი: P0 — SILENT DATA CORRUPTION**
> თუ Vercel-ზე `SUPABASE_SERVICE_ROLE_KEY` არ არის, `supabaseAdmin` ჩუმად ეცემა anon key-ზე. ყველა admin ოპერაცია (invoice creation, journal entries, payroll) ჩუმად fail-დება RLS-ის გამო.

### ფაილი: `src/api/services/supabase.service.ts`
### ხაზი: 14-21 (მთლიანი `if` ბლოკი)

❌ ძველი:
```typescript
  if (process.env.VITE_SUPABASE_URL && (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY)) {
    supabaseAdmin = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );
  }
```

✅ ახალი:
```typescript
  if (process.env.VITE_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    supabaseAdmin = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );
  } else if (process.env.VITE_SUPABASE_URL) {
    console.error("[CRITICAL] SUPABASE_SERVICE_ROLE_KEY is not set! supabaseAdmin will be null. All admin operations will fail.");
  }
```

### 🧪 ვერიფიკაცია:
```bash
npx tsc --noEmit
```
**მოსალოდნელი:** 0 error. თუ error → STOP.

---

## ნაბიჯი 3: AI Chat History Injection — სანიტიზაცია

> [!WARNING]
> **პრიორიტეტი: P0 — SECURITY VULNERABILITY**
> Public endpoint `/api/ai/chat` იღებს `history` მასივს მომხმარებლისგან ფილტრაციის გარეშე. ატაკერს შეუძლია ფეიკ `role: "model"` ან `role: "system"` მესიჯების ინექცია.

### ფაილი: `src/api/routes/ai.routes.ts`

**ნაბიჯი 3.1 — დაამატე sanitization ფუნქცია (ხაზი 6-ის შემდეგ, `const router = Router();`-ის შემდეგ):**

✅ დამატებული კოდი (ჩასმა ხაზი 7-ის ადგილას, ანუ `const router` და `const requireAccountingRead` შორის):
```typescript

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

```

**ნაბიჯი 3.2 — შეცვალე public chat history usage (ძველი ხაზი 81-82):**

❌ ძველი:
```typescript
    const contents = [
      ...history,
```

✅ ახალი:
```typescript
    const contents = [
      ...sanitizeHistory(history || []),
```

**ნაბიჯი 3.3 — შეცვალე admin-chat history usage (ძველი ხაზი 316-317):**

❌ ძველი:
```typescript
    const contents = [
      ...history,
```

✅ ახალი:
```typescript
    const contents = [
      ...sanitizeHistory(history || []),
```

### 🧪 ვერიფიკაცია:
```bash
npx tsc --noEmit
```
**მოსალოდნელი:** 0 error. თუ error → STOP.

---

## ნაბიჯი 4: Stock Update — Silent Error Swallow-ის აღმოფხვრა

> [!IMPORTANT]
> **პრიორიტეტი: P1 — DATA INTEGRITY**
> `accounting.routes.ts:304`-ზე `.catch(() => {})` ჩუმად იგნორებს stock update error-ს. ბუღალტერიაში ტრანზაქცია ჩაიწერება, მაგრამ მარაგი არ განახლდება.

### ფაილი: `src/api/routes/accounting.routes.ts`
### ხაზი: 304

❌ ძველი:
```typescript
    await supabaseAdmin.rpc('update_stock_level', { p_product_id: product_id, p_delta: quantity * direction }).catch(() => {});
```

✅ ახალი:
```typescript
    const stockResult = await supabaseAdmin.rpc('update_stock_level', { p_product_id: product_id, p_delta: quantity * direction });
    if (stockResult.error) {
      console.error('[Inventory Adjustment] Stock level update failed:', stockResult.error);
      // ტრანზაქცია უკვე ჩაიწერა, მაგრამ stock_levels არ განახლდა — ლოგი საჭიროა
    }
```

### 🧪 ვერიფიკაცია:
```bash
npx tsc --noEmit
```
**მოსალოდნელი:** 0 error.

---

## ნაბიჯი 5: Global Error Handler დამატება

> [!IMPORTANT]
> **პრიორიტეტი: P1 — INFORMATION LEAK**
> Express-ს არ აქვს global error handler. Unhandled exception-ზე stack trace ჩანს response-ში.

### ფაილი: `server.ts`
### ხაზი: 88-ის შემდეგ (ანუ ბოლო `app.use` route mount-ის შემდეგ)

**ნაბიჯი 5.1 — დაამატე შემდეგი კოდი `app.use("/api/rs-ge", rsgeRoutes);`-ის შემდეგ (ხაზ 88-ის შემდეგ):**

✅ ჩასამატებელი კოდი:
```typescript

  // ── Global Error Handler (must be after all routes) ──
  app.use((err: any, req: any, res: any, next: any) => {
    // CORS errors
    if (err.message && err.message.includes('CORS')) {
      return res.status(403).json({ error: 'CORS: origin not allowed' });
    }
    // All other unhandled errors
    console.error('[Global Error Handler]', err.message || err);
    res.status(err.status || 500).json({ 
      error: process.env.NODE_ENV === 'production' 
        ? 'სერვერის შეცდომა. გთხოვთ, სცადოთ მოგვიანებით.' 
        : err.message || 'Internal Server Error'
    });
  });

```

### 🧪 ვერიფიკაცია:
```bash
npx tsc --noEmit
```
**მოსალოდნელი:** 0 error.

---

## 🛑 ფაზა A ჩეკპოინტი

ფაზა A-ის დასრულების შემდეგ **გაუშვი სრული TypeScript შემოწმება:**

```bash
npx tsc --noEmit
```

**თუ 0 error → გააგრძელე ფაზა B.**
**თუ error-ები არის → STOP. გამოასწორე error-ები სანამ გააგრძელებ.**

---

# ფაზა B: უსაფრთხოების გამკაცრება

---

## ნაბიჯი 6: Duplicate `requireAccountingRead` — DRY ფიქსი

> [!NOTE]
> **პრიორიტეტი: P2 — MAINTAINABILITY**
> `ai.routes.ts`-ში copy-paste-ით დუბლირებულია `requireAccountingRead`. ამის ნაცვლად უნდა გამოიყენოს `accounting.routes.ts`-დან ექსპორტირებული ვერსია.

### ფაილი: `src/api/routes/ai.routes.ts`

**ნაბიჯი 6.1 — შეცვალე import (ხაზი 2):**

❌ ძველი:
```typescript
import { supabase, supabaseAdmin } from "../services/supabase.service.js";
```

✅ ახალი:
```typescript
import { supabase, supabaseAdmin } from "../services/supabase.service.js";
import { requireAccountingRead } from "./accounting.routes.js";
```

**ნაბიჯი 6.2 — წაშალე ლოკალური `requireAccountingRead` (ხაზები 8-23):**

❌ წასაშლელი (მთლიანი ბლოკი):
```typescript
// Middleware: check accountant or admin or consultant role for admin-chat
const requireAccountingRead = async (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ error: 'არაავტორიზებული მოთხოვნა' });
  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return res.status(401).json({ error: 'არაავტორიზებული მოთხოვნა' });

  const { data: profile } = await supabaseAdmin.from('profiles').select('role').eq('id', user.id).single();
  if (!profile || !['admin', 'accountant', 'consultant'].includes(profile.role)) {
    return res.status(403).json({ error: 'წვდომა შეზღუდულია' });
  }
  req.userProfile = profile;
  req.userId = user.id;
  next();
};
```

✅ ჩანაცვლება: (ცარიელი — წაიშალა, import-ით შემოდის)

### 🧪 ვერიფიკაცია:
```bash
npx tsc --noEmit
```

---

## ნაბიჯი 7: Supabase Auth — Leaked Password Protection ჩართვა

> [!IMPORTANT]
> **პრიორიტეტი: P1 — SECURITY CONFIG**
> Supabase Security Advisor ადასტურებს, რომ Leaked Password Protection გამორთულია.

### ფაილი: არა — Supabase Dashboard

### ინსტრუქცია:
1. გადადი: `https://supabase.com/dashboard/project/cjvhoadkvjqsmoiypndw/auth/settings`
2. იპოვე **"Password Strength"** სექცია
3. ჩართე **"Enable Leaked Password Protection"**
4. დააჭირე **Save**

### 🧪 ვერიფიკაცია:
Supabase Dashboard-ში ნახე რომ toggle ჩართულია.

---

## ნაბიჯი 8: Storage Bucket — Public Listing-ის შეზღუდვა

> [!IMPORTANT]
> **პრიორიტეტი: P1 — SECURITY CONFIG**
> `product-images` bucket-ს აქვს broad SELECT policy, რომელიც სრულ file listing-ს უშვებს.

### ფაილი: არა — Supabase Dashboard

### ინსტრუქცია:
1. გადადი: `https://supabase.com/dashboard/project/cjvhoadkvjqsmoiypndw/storage/policies`
2. იპოვე `product-images` bucket
3. იპოვე **"Public Access"** SELECT policy
4. შეცვალე policy: `bucket_id = 'product-images'` → დაამატე condition: `(auth.role() = 'authenticated')` ან წაშალე SELECT policy სრულად (public bucket-ს URL-ით წვდომა ისედაც შეიძლება listing-ის გარეშე)

### 🧪 ვერიფიკაცია:
ტესტი: `curl "https://cjvhoadkvjqsmoiypndw.supabase.co/storage/v1/object/list/product-images"` — უნდა დააბრუნოს 401 ან ცარიელი სია, არა ფაილების სრული ჩამონათვალი.

---

## ნაბიჯი 9: `processSuccessfulOrder` — accounting_status error handling

> [!NOTE]
> **პრიორიტეტი: P2 — ERROR HANDLING**
> `payment.service.ts:247-249`-ში catch ბლოკი მხოლოდ console.error-ს აკეთებს. `accounting_status` არ ინიშნება "FAILED"-ად.

### ფაილი: `src/api/services/payment.service.ts`
### ხაზი: 247-249

❌ ძველი:
```typescript
  } catch (error: any) {
    console.error('Error in processSuccessfulOrder:', error);
  }
```

✅ ახალი:
```typescript
  } catch (error: any) {
    console.error('[processSuccessfulOrder] CRITICAL ERROR:', error);
    try {
      await supabaseAdmin.from('orders').update({ 
        accounting_status: 'FAILED', 
        accounting_error: error.message || 'Unknown accounting error' 
      }).eq('id', orderId);
    } catch (updateErr: any) {
      console.error('[processSuccessfulOrder] Failed to update accounting_status:', updateErr);
    }
  }
```

### 🧪 ვერიფიკაცია:
```bash
npx tsc --noEmit
```

---

## 🛑 ფაზა B ჩეკპოინტი

```bash
npx tsc --noEmit
```

**თუ 0 error → გააგრძელე ფაზა C.**

---

# ფაზა C: Database Hygiene

---

## ნაბიჯი 10: RLS InitPlan ფიქსი (4 ცხრილი)

> [!NOTE]
> **პრიორიტეტი: P2 — PERFORMANCE**
> 4 ცხრილის RLS policies იყენებს `auth.uid()`-ს `(SELECT auth.uid())`-ის ნაცვლად, რაც ყოველი row-ისთვის თავიდან evaluates.

### ფაილი: არა — Supabase SQL Editor / Migration

### SQL (გაუშვი Supabase SQL Editor-ში ან `apply_migration`-ით):

```sql
-- ნაბიჯი 10: Fix RLS InitPlan — wrap auth.uid() in subquery
-- ცხრილი: invitations
DROP POLICY IF EXISTS "invitations_access" ON public.invitations;
CREATE POLICY "invitations_access" ON public.invitations
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role IN ('admin')
    )
  );

-- ცხრილი: goods_receipt_items
DROP POLICY IF EXISTS "goods_receipt_items_access" ON public.goods_receipt_items;
CREATE POLICY "goods_receipt_items_access" ON public.goods_receipt_items
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role IN ('admin', 'accountant')
    )
  );

-- ცხრილი: goods_receipts
DROP POLICY IF EXISTS "goods_receipts_access" ON public.goods_receipts;
CREATE POLICY "goods_receipts_access" ON public.goods_receipts
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role IN ('admin', 'accountant')
    )
  );

-- ცხრილი: manufacturing_orders
DROP POLICY IF EXISTS "Enable full access for admins and accountants" ON public.manufacturing_orders;
CREATE POLICY "Enable full access for admins and accountants" ON public.manufacturing_orders
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role IN ('admin', 'accountant')
    )
  );
```

### 🧪 ვერიფიკაცია:
მიგრაცია უნდა დასრულდეს error-ის გარეშე.

---

## ნაბიჯი 11: Unindexed FK ფიქსი

> [!NOTE]
> **პრიორიტეტი: P3 — PERFORMANCE**

### SQL:
```sql
-- ნაბიჯი 11: Index missing FK
CREATE INDEX IF NOT EXISTS idx_manufacturing_orders_created_by 
  ON public.manufacturing_orders (created_by);
```

### 🧪 ვერიფიკაცია:
მიგრაცია უნდა დასრულდეს error-ის გარეშე.

---

## ნაბიჯი 12: Orphaned `accounting_entries` ცხრილის წაშლა

> [!NOTE]
> **პრიორიტეტი: P3 — CLEANUP**
> `accounting_entries` ცხრილს 0 row აქვს და არსად არ გამოიყენება კოდში. რეალური სისტემა `journal_entries` + `journal_lines`-ს იყენებს.

### SQL:
```sql
-- ნაბიჯი 12: Drop orphaned table
DROP TABLE IF EXISTS public.accounting_entries CASCADE;
```

### 🧪 ვერიფიკაცია:
```bash
npx tsc --noEmit
```
**და** Supabase Dashboard-ში შეამოწმე რომ ცხრილი აღარ არსებობს.

---

# ✅ ფინალური ვერიფიკაცია (სავალდებულო)

ყველა 12 ნაბიჯის შემდეგ:

### 1. TypeScript Compilation
```bash
npx tsc --noEmit
```
**მოსალოდნელი:** 0 error.

### 2. Server Startup Test
```bash
npx tsx server.ts
```
**მოსალოდნელი:** `Server running on http://localhost:3000` — არანაირი crash.

### 3. Health Check
```bash
curl http://localhost:3000/api/health
```
**მოსალოდნელი:** `{"status":"ok"}`

---

# 📊 ნაბიჯების შეჯამება

| # | ფაზა | ფაილი | პრობლემა | ტიპი |
|---|------|-------|----------|------|
| 1 | A | `admin.routes.ts` | requireAdmin regression fix | კოდი |
| 2 | A | `supabase.service.ts` | supabaseAdmin fallback removal | კოდი |
| 3 | A | `ai.routes.ts` | History injection sanitization | კოდი |
| 4 | A | `accounting.routes.ts` | Silent error swallow fix | კოდი |
| 5 | A | `server.ts` | Global error handler | კოდი |
| 6 | B | `ai.routes.ts` | Duplicate middleware removal | კოდი |
| 7 | B | Supabase Dashboard | Leaked Password Protection | Config |
| 8 | B | Supabase Dashboard | Storage bucket listing | Config |
| 9 | B | `payment.service.ts` | Accounting error status fix | კოდი |
| 10 | C | Supabase Migration | RLS InitPlan fix (4 tables) | DB |
| 11 | C | Supabase Migration | Unindexed FK fix | DB |
| 12 | C | Supabase Migration | Drop orphaned table | DB |

> [!CAUTION]
> ## მომდევნო აგენტისთვის
> 1. **არ შეცვალო** არცერთი ფაილი, რომელიც ამ გეგმაში არ არის ნახსენები.
> 2. **არ დაამატო** ახალი ფუნქციონალი. ეს არის **მხოლოდ bug fix და security hardening.**
> 3. **ყოველი ნაბიჯის შემდეგ** `npx tsc --noEmit` — 0 error.
> 4. **თუ error** → STOP და მოახსენე, რა error დაფიქსირდა.
> 5. ნაბიჯი 3 და 6 **ერთ ფაილში** ცვლილებებია (`ai.routes.ts`). გაითვალისწინე ხაზების ცვლილება.
> 6. ნაბიჯები 10-12 არის **SQL მიგრაციები** — Supabase SQL Editor ან `apply_migration` MCP tool-ით.
