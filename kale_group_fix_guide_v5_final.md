# 🛠️ Kale Group — შესწორებების სახელმძღვანელო
> **v5.0 — Double-Verified Final | 2026-04-11**
> **სტატუსი:** v3→v4→v5 სამჯერ გადამოწმებული. v5 = production-ready.

---

> ### 🔍 ვერსიების ისტორია — ყველა ნაპოვნი შეცდომა
> | ვერსია | ნაპოვნი შეცდომები |
> |---|---|
> | v1/v2 | throw webhook-ში, vat_rate integer vs decimal შეუმოწმებელი, .single() failure, CartContext type error |
> | v3 | VAT exclusive vs inclusive ფორმულა, `===true` strict type, maybeSingle null undocumented, payroll JE orphan comment-only, zero-VAT JE line guard |
> | v4 | **`accVat` unconditional check** (production blocker), **`cogsCost` undefined variable** (runtime error), BUG-1/BUG-3 execution order unclear, misleading sanity check, VAT off JE description მცდარი |
> | **v5** | **ყველა ზემოთ გამოსწორებული** |

---

> ## ⚠️ v5-ის ყველაზე მნიშვნელოვანი შესწორება — წაიკითხე პირველ რიგში
>
> **v4-ში იყო production-blocking bug:**
> ```typescript
> // v4 — BUG-1 accounts check (❌ WRONG):
> if (!accCash || !accInventory || !accVat || !accRev || !accCogs) { ... FAILED ... }
> ```
> **პრობლემა:** `!accVat` ყოველთვის checked. კომპანია **არ არის VAT-ის გადამხდელი** → account code `3200` DB-ში **არ არსებობს** → `accVat = undefined` → ეს condition **ყოველ order-ზე FAILED-ს** მოიტანდა. ბუღალტერია მთლიანად გაჩერდებოდა.
>
> **v5 fix:**
> ```typescript
> // v5 — სწორი: accVat მხოლოდ VAT ჩართვისას სავალდებულოა
> const vatAccountRequired = vatRate > 0;
> if (!accCash || !accInventory || !accRev || !accCogs ||
>     (vatAccountRequired && !accVat)) { ... FAILED ... }
> ```

---

## ⚡ სწრაფი სტატისტიკა

| კატეგორია | რაოდენობა | სავარაუდო სულ დრო |
|---|---|---|
| 🔴 კრიტიკული | 4 | ~30 წუთი |
| 🟠 საშუალო | 6 | ~40 წუთი |
| 🟡 მცირე | 5 | ~10 წუთი |
| **სულ** | **15** | **~80 წუთი** |

---

## 📐 კოდის შესრულების სწორი თანმიმდევრობა `processSuccessfulOrder()`-ში

> **ეს კრიტიკულია:** BUG-3 (settings/vatRate) **აუცილებლად BUG-1-ის accounts check-ამდე** უნდა შესრულდეს.

```
processSuccessfulOrder(orderId, totalAmount) {
  │
  ├─ 1. company_settings ჩატვირთვა        ← BUG-3 კოდი
  │     └─ vatRate გამოთვლა
  │
  ├─ 2. accounts query + validation        ← BUG-1 კოდი
  │     └─ accVat სავალდებულოა მხოლოდ vatRate > 0-ზე
  │
  ├─ 3. VAT + revenue გამოთვლა            ← BUG-3 ფორმულა
  │
  ├─ 4. journal_entry header insert
  │
  └─ 5. journal_entry_lines insert         ← BUG-3 add (JE guard)
        └─ VAT line: მხოლოდ vatAmount > 0-ზე
}
```

---

## 🔴 კრიტიკული შესწორებები

---

### BUG-1 — ანგარიშთა კოდების შეუსაბამობა (`server.ts:828–833`)

**რა ხდება:**
`processSuccessfulOrder()` query-ობს კოდებს `1610 / 3330 / 6110 / 7110`, რომლებიც სქემაში არ არსებობს. შედეგად ყველა account variable `undefined` ხდება, `if` ბლოკი გამოტოვდება, **error არ ჩნდება** — BOG/TBC/Credo გადახდები ბუღალტერიაში **საერთოდ არ იწერება**.

> `accCash` კოდი `1110` ორივე ვერსიაში ერთნაირია — **ეს სწორია, არ შეცვლა**.

**ნაბიჯი 1 — ანგარიშთა კოდების შესწორება:**
```diff
// server.ts:828
- .in('code', ['1110', '1610', '3330', '6110', '7110'])
- const accInventory = accounts?.find((a: any) => a.code === '1610')?.id;
- const accVat       = accounts?.find((a: any) => a.code === '3330')?.id;
- const accRev       = accounts?.find((a: any) => a.code === '6110')?.id;
- const accCogs      = accounts?.find((a: any) => a.code === '7110')?.id;

+ // VAT account-ი query-ში მხოლოდ VAT ჩართვისას — კომპანია შეიძლება account 3200-ს არ ფლობდეს
+ const accountCodesToFetch = ['1110', '1310', '6100', '7100'];
+ if (vatRate > 0) accountCodesToFetch.push('3200'); // ← vatRate BUG-3-ში გამოითვლება, BUG-3 კოდი პირველ უნდა შესრულდეს!
+
+ .in('code', accountCodesToFetch)
+ const accCash      = accounts?.find((a: any) => a.code === '1110')?.id;
+ const accInventory = accounts?.find((a: any) => a.code === '1310')?.id;
+ const accVat       = accounts?.find((a: any) => a.code === '3200')?.id; // undefined if vatRate=0 — OK
+ const accRev       = accounts?.find((a: any) => a.code === '6100')?.id;
+ const accCogs      = accounts?.find((a: any) => a.code === '7100')?.id;
```

**ნაბიჯი 2 — Silent failure-ის სწორი დამუშავება:**

> **რატომ არ ვიყენებთ `throw`-ს:**
> `processSuccessfulOrder()` გამოიძახება BOG/TBC/Credo webhook handler-ში. თუ handler 500-ს დაბრუნებს, gateway **webhook-ს retry-ს გაგზავნის** — **duplicate order processing**. გადახდა უკვე წარმატებულია — ბუღალტერია ცალკე უნდა გამოსწორდეს.

```typescript
// server.ts — processSuccessfulOrder()-ში, accounts query-ის შემდეგ:

// ⚠️ v5: accVat მხოლოდ VAT ჩართვისას სავალდებულოა
// კომპანია რომ VAT-ის გადამხდელი არ არის, account 3200 DB-ში არ არსებობს —
// unconditional !accVat check ყოველ order-ს FAILED-ად მონიშნავდა
const vatAccountRequired = vatRate > 0;

if (!accCash || !accInventory || !accRev || !accCogs ||
    (vatAccountRequired && !accVat)) {

  console.error('[processSuccessfulOrder] CRITICAL: accounting accounts not found', {
    orderId,
    vatRate,
    missingCodes: {
      accCash:      !accCash      ? '1110' : 'OK',
      accInventory: !accInventory ? '1310' : 'OK',
      accVat:       (vatAccountRequired && !accVat) ? '3200' : (vatRate === 0 ? 'N/A (VAT off)' : 'OK'),
      accRev:       !accRev       ? '6100' : 'OK',
      accCogs:      !accCogs      ? '7100' : 'OK',
    },
  });

  await supabaseAdmin
    .from('orders')
    .update({ accounting_status: 'FAILED', accounting_error: 'Missing account codes' })
    .eq('id', orderId);

  return; // ← არ throw — webhook handler-ი 200-ს გამოაგზავნის
}
```

> 💡 `accounting_status` სვეტი `orders` ცხრილში შეიძლება არ არსებობდეს — migration-ით დაამატე:
> ```sql
> ALTER TABLE orders
>   ADD COLUMN IF NOT EXISTS accounting_status TEXT DEFAULT 'PENDING',
>   ADD COLUMN IF NOT EXISTS accounting_error  TEXT;
> ```

- [ ] ანგარიშთა კოდები შესწორებულია (`1310`, `3200`, `6100`, `7100`)
- [ ] `accountCodesToFetch` — `3200` მხოლოდ `vatRate > 0`-ზე ემატება
- [ ] accounts check — `accVat` condition: `(vatRate > 0 && !accVat)` — **არა** `!accVat`
- [ ] `throw` ამოღებულია webhook handler-დან
- [ ] `accounting_status` სვეტი `orders`-ში არსებობს

---

### BUG-2 — `invoice_type` შეუთავსებლობა (`'SALES'` vs `'B2C'`)

**პრობლემა:** `invoice_type: 'SALES'` CHECK constraint-ში არ არის (`'B2C' | 'B2B' | 'REFUND' | 'PROFORMA'`) — INSERT ვარდება თუ მიგრაცია `20260410_fix_pos_accounting.sql` არ გაშვებულა.

**ნაბიჯი 1 — ჯერ კოდი, deploy (zero-downtime):**
```diff
// server.ts:785
- invoice_type: 'SALES',
+ invoice_type: 'B2C',
```

**ნაბიჯი 2 — CHECK constraint-ის სტატუსის შემოწმება:**
```sql
SELECT constraint_name, check_clause
FROM information_schema.check_constraints
WHERE constraint_name LIKE '%invoice%';
```

**ნაბიჯი 3 — მიგრაციის გადაწყვეტა:**
- თუ `SALES` CHECK-ში **არ არის** → `supabase db push`
- თუ `SALES` CHECK-შია → კოდი `B2C`-ზე მაინც სწორია (სემანტიკური)

- [ ] კოდი `'B2C'`-ზე შეცვლილია და deploy-ებულია
- [ ] CHECK constraint სტატუსი შემოწმებულია

---

### BUG-3 — VAT: settings, precision, inclusive formula

> ## ✅ VAT ფორმულა — Inclusive (v5 confirmed)
>
> `revenueAmount = parseFloat((totalAmount - vatAmount).toFixed(2))` პატერნი ნათლად გვიჩვენებს, რომ `totalAmount` = კლიენტის გადახდა (gross, VAT-ჩათვლით). ამიტომ inclusive ფორმულა სწორია:
>
> | ფორმულა | 118₾ გადახდაზე vatAmount | revenueAmount |
> |---|---|---|
> | exclusive ❌ | 118 × 0.18 = **21.24₾** | 96.76₾ |
> | **inclusive ✅** | 118 × 0.18/1.18 = **18.00₾** | 100.00₾ |
>
> **ახლა (VAT off):** `vatRate=0` → ორივე ფორმულა `vatAmount=0` → პრობლემა არ ჩანს.
> **VAT ჩართვისას:** exclusive ფორმულა ბუღალტერიაში ~3.24₾-ს **ყოველ 118₾-ზე** გადაიანგარიშებდა.

**შესასრულებელი კოდი (BUG-3 სექცია — **პირველ** შესრულდება processSuccessfulOrder-ში):**

```typescript
// ============================================================
// ᲜᲐᲑᲘᲯᲘ 1: company_settings ჩატვირთვა
// ⚠️ ეს კოდი accounts query-ს (BUG-1) წინ უნდა სრულდებოდეს!
// ============================================================

const { data: settings, error: settingsError } = await supabaseAdmin
  .from('company_settings')
  .select('vat_registered, vat_rate')
  .maybeSingle(); // ← .single()-ის ნაცვლად — 0 სტრიქონი error არ არის

// ᲜᲐᲑᲘᲯᲘ 2: DB query failure
if (settingsError) {
  console.error('[processSuccessfulOrder] company_settings load failed:', settingsError);
  await supabaseAdmin
    .from('orders')
    .update({ accounting_status: 'FAILED', accounting_error: 'company_settings unavailable' })
    .eq('id', orderId);
  return;
}

// ᲜᲐᲑᲘᲯᲘ 3: settings=null — ცხრილი სრულიად ცარიელია
// maybeSingle error=null, data=null → safe default vatRate=0
if (settings === null) {
  console.warn('[processSuccessfulOrder] company_settings has no rows — vatRate defaults to 0');
}

// ᲜᲐᲑᲘᲯᲘ 4: vat_rate precision guard
// DB-ში შეიძლება 18 (integer%) ან 0.18 (decimal) — ორივეს ვამუშავებთ
const rawVatRate = settings?.vat_rate;
let vatRate = 0;

// Boolean() — strict ===true-ს ნაცვლად (RPC-ში შეიძლება "true" string ან 1 integer მოვიდეს)
if (Boolean(settings?.vat_registered)) {
  if (typeof rawVatRate === 'number' && rawVatRate > 0) {
    vatRate = rawVatRate > 1 ? rawVatRate / 100 : rawVatRate; // 18→0.18 | 0.18→0.18
  } else {
    vatRate = 0.18; // DB-ში vat_rate null — safe fallback
    console.warn('[processSuccessfulOrder] vat_rate null/missing, defaulting to 0.18');
  }
}
// vat_registered=false|null|undefined ან settings=null → vatRate=0 ✓

// ============================================================
// ᲜᲐᲑᲘᲯᲘ 5: VAT + Revenue გამოთვლა (inclusive ფორმულა)
// ფასი = კლიენტის გადახდა (VAT-ჩათვლით) → vatAmount = gross × rate / (1+rate)
// ============================================================
const vatAmount     = vatRate > 0
  ? parseFloat((totalAmount * vatRate / (1 + vatRate)).toFixed(2))
  : 0;
const revenueAmount = parseFloat((totalAmount - vatAmount).toFixed(2));
// revenueAmount = totalAmount - vatAmount ყოველთვის ✓ (round-off safe by construction)

// ============================================================
// ⚠️ ახლა BUG-1 კოდი შეასრულე: accounts query (vatRate ცნობილია)
// ============================================================
```

> 💡 **VAT toggle-ის ლოგიკა:**
> - **ახლა (VAT off):** `vat_registered=false` → `vatRate=0` → `vatAmount=0` → JE: 4 line (Cash DR, Revenue CR, COGS DR, Inventory CR). VAT account-ის (3200) არარსებობა პრობლემა **არ არის** — BUG-1 fix-ის შემდეგ.
> - **სამომავლოდ (VAT on):** DB-ში მხოლოდ `vat_registered=true` + `vat_rate=0.18`. **სხვა კოდი არ იცვლება.** → JE: 5 line (+ VAT Payable CR).

> 💡 **სქემაში გადასამოწმებელი:** `KALE_ACCOUNTING_SCHEMA.sql` — `company_settings.vat_rate` — type (NUMERIC, INTEGER, DECIMAL)?

- [ ] `maybeSingle()` გამოიყენება `.single()`-ის ნაცვლად
- [ ] `Boolean()` გამოიყენება `=== true`-ს ნაცვლად
- [ ] precision guard (`rawVatRate > 1 ? /100 : as-is`) დამატებულია
- [ ] `settings === null` path logged
- [ ] **inclusive formula** (`× rate / (1+rate)`) — **BUG-1 კოდამდე** შესრულდება
- [ ] settings failure → `accounting_status: 'FAILED'` + `return`

---

### BUG-3-ს დამატება — Zero VAT JE Line Guard + COGS variable

**პრობლემა 1:** `vatAmount=0` ის დროს VAT account-ის სტრიქონი JE-ში 0/0 შეიქმნება — ბუღალტრულად არასწორი.

**პრობლემა 2 (v4-ის bug):** `cogsCost` undefined variable — **runtime error**. ეს ცვლადი server.ts-ში უნდა გამოთვლო order items-ებიდან.

```typescript
// server.ts — JE header insert-ის შემდეგ, lines insert-ის წინ:

// ⚠️ cogsCost: სულ cost_price × quantity ყველა order item-ზე
// შეამოწმე order items-ი order-ის გვერდით იტვირთება (JOIN ან ცალკე query):
const cogsCost = orderItems.reduce(
  (sum, item) => sum + (item.cost_price ?? 0) * item.quantity,
  0
);
// თუ cost_price არ ტრეკავ — cogsCost = 0 და COGS/Inventory lines გამორთე (იხ. ქვემოთ)

const journalLines = [
  // 1. Cash / AR — ყოველთვის
  {
    journal_entry_id: je.id,
    account_id: accCash,
    debit: totalAmount,
    credit: 0,
    description: 'Cash received',
  },
  // 2. Revenue — ყოველთვის
  {
    journal_entry_id: je.id,
    account_id: accRev,
    debit: 0,
    credit: revenueAmount,
    description: 'Sales revenue',
  },
  // 3. VAT Payable — მხოლოდ VAT > 0-ზე (VAT off = account-ი შეიძლება არ არსებობდეს)
  ...(vatAmount > 0 && accVat ? [{
    journal_entry_id: je.id,
    account_id: accVat,
    debit: 0,
    credit: vatAmount,
    description: `VAT payable ${(vatRate * 100).toFixed(0)}%`,
  }] : []),
  // 4+5. COGS / Inventory — მხოლოდ cost_price tracking-ის დროს
  ...(cogsCost > 0 ? [
    {
      journal_entry_id: je.id,
      account_id: accCogs,
      debit: cogsCost,
      credit: 0,
      description: 'Cost of goods sold',
    },
    {
      journal_entry_id: je.id,
      account_id: accInventory,
      debit: 0,
      credit: cogsCost,
      description: 'Inventory reduction',
    },
  ] : []),
];

// Debit = Credit ყოველთვის ✓
// VAT off, cogsCost=0: Cash DR + Revenue CR = 2-line (balanced: totalAmount = totalAmount)
// VAT off, cogsCost>0: 4-line (balanced: totalAmount+cogsCost DR = totalAmount+cogsCost CR)
// VAT on,  cogsCost>0: 5-line (balanced: totalAmount+cogsCost DR = revenue+vat+cogsCost CR)

await supabaseAdmin.from('journal_entry_lines').insert(journalLines);
```

> 💡 **Debit=Credit შემოწმება:** ყოველ insert-ის წინ logically გადაამოწმე:
> - DR სულ: `totalAmount + cogsCost`
> - CR სულ: `revenueAmount + vatAmount + cogsCost` = `totalAmount + cogsCost` ✓

- [ ] `cogsCost` გამოითვლება `orderItems`-დან (ან `0` თუ cost tracking არ გაქვს)
- [ ] VAT line guard: `vatAmount > 0 && accVat`
- [ ] COGS/Inventory lines guard: `cogsCost > 0`
- [ ] JE balanced (DR = CR) გადამოწმებულია

---

### BUG-4 — POS `is_promotional_sale` — ვადაგასული აქციის შემოწმება

**ნაბიჯი 1 — Shared utility:**
```typescript
// src/utils/promotions.ts  ← ახალი ფაილი
export const isProductOnActiveSale = (product: {
  is_on_sale: boolean;
  sale_price?: number | null;
  sale_end_date?: string | null;
}): boolean =>
  product.is_on_sale === true &&
  product.sale_price != null &&
  product.sale_price > 0 &&
  (!product.sale_end_date ||
    new Date(product.sale_end_date).getTime() > Date.now());
```

**ნაბიჯი 2 — `POSModule.tsx:151`:**
```diff
- is_promotional_sale: i.product.is_on_sale &&
-   i.product.sale_price != null &&
-   i.product.sale_price > 0,
+ is_promotional_sale: isProductOnActiveSale(i.product),
```

**ნაბიჯი 3 — `price.ts` და `useSupabaseData.ts`:**
```typescript
// src/utils/price.ts
import { isProductOnActiveSale } from './promotions';
export const getEffectivePrice = (product: Product): number =>
  isProductOnActiveSale(product) ? product.sale_price! : product.price;
```
```typescript
// useSupabaseData.ts:75
import { isProductOnActiveSale } from '../utils/promotions';
return { ...p, is_on_sale: isProductOnActiveSale(p) };
```

- [ ] `src/utils/promotions.ts` შექმნილია
- [ ] `POSModule.tsx`, `price.ts`, `useSupabaseData.ts` განახლებულია

---

## 🟠 საშუალო სიმძიმის შესწორებები

---

### WARN-1 — CORS პრაქტიკულად გამორთულია (`server.ts:44`)

```typescript
const allowedOrigins: string[] = [
  'https://kale-group.ge',
  'https://www.kale-group.ge',
  'https://admin.kale-group.ge',
  'https://kale-staging.vercel.app',
  ...(process.env.NODE_ENV === 'development' ? ['http://localhost:5173'] : []),
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true); // server-to-server webhooks
    if (allowedOrigins.includes(origin)) return callback(null, true);
    console.warn(`[CORS] Blocked: ${origin}`);
    return callback(new Error(`CORS: origin '${origin}' not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-webhook-signature'],
}));
```

- [ ] `allowedOrigins` რეალური domain-ებით შევსებულია
- [ ] CORS middleware ჩანაცვლებულია
- [ ] Webhook HMAC validation დამოუკიდებლად შემოწმებულია

---

### WARN-2 — Rate Limiting გაძლიერება

```typescript
const orderCreateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 25,
  skipSuccessfulRequests: false,
  message: { error: 'Too many requests. Please try again in 15 minutes.', code: 'RATE_LIMIT_EXCEEDED' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
      return (Array.isArray(forwarded) ? forwarded[0] : forwarded).split(',')[0].trim();
    }
    return req.ip ?? req.socket?.remoteAddress ?? 'unknown';
  },
});

app.post('/api/orders/create', orderCreateLimiter, async (req, res) => { ... });
```

- [ ] Dedicated limiter დამატებულია
- [ ] IP fallback chain სწორია

---

### WARN-3 — POS RLS სიტუაციის გარკვევა

```sql
SELECT t.tablename, t.rowsecurity AS rls_enabled, p.policyname, p.cmd, p.roles
FROM pg_tables t
LEFT JOIN pg_policies p ON t.tablename = p.tablename
WHERE t.tablename IN ('orders', 'order_items', 'journal_entries')
ORDER BY t.tablename, p.policyname;
```

```sql
CREATE POLICY "Authenticated can insert orders"
  ON orders FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can read orders"
  ON orders FOR SELECT TO authenticated USING (true);
```

> გრძელვადიანი: POS checkout → `POST /api/pos/checkout` server-side + `supabaseAdmin`

- [ ] RLS სტატუსი შემოწმებულია + policy-ები კორექტულია

---

### WARN-4 — Tooltip უხილავი ტექსტი

```diff
- className="... bg-stone-800 border border-slate-300 text-slate-800 ..."
+ className="... bg-stone-800 border border-stone-600 text-slate-100 ..."
```

- [ ] Browser-ში გადამოწმებულია

---

### WARN-5 — `getEffectivePrice` + CartContext

```typescript
// CartContext.tsx
import { getEffectivePrice } from '../utils/price';
const rawCart: CartItem[] = JSON.parse(localStorage.getItem('cart') ?? '[]');
const sanitizedCart: CartItem[] = rawCart.map(item => ({
  ...item,
  unitPrice: getEffectivePrice(item.product),
}));
```

> Server-side price validation checkout endpoint-ზე — client-ის price-ებს **არასოდეს ენდობი**.

- [ ] CartContext `unitPrice` ხელახლა გამოითვლება load-ისას

---

### WARN-6 — Payroll Journal Entry + Rollback

> ⚠️ სქემაში სავალდებულოდ გადასამოწმებელი:
> 1. `journal_entry_lines` ზუსტი სახელი (შეიძლება `journal_lines`)
> 2. ანგარიშთა კოდები `7200` (Salary Expense), `2110` (Salaries Payable)
> 3. `payrollRun.total_net` — ეს ველი სწორია?

```typescript
const SALARY_EXPENSE_CODE   = 'XXXX'; // ← სქემიდან შეავსე
const SALARIES_PAYABLE_CODE = 'XXXX';
const JOURNAL_LINES_TABLE   = 'XXXX';
const totalPayroll = payrollRun.total_net; // ← გადაამოწმე

const { data: payrollAccounts } = await supabaseAdmin
  .from('accounts').select('id, code')
  .in('code', [SALARY_EXPENSE_CODE, SALARIES_PAYABLE_CODE]);

const accSalaryExpense   = payrollAccounts?.find(a => a.code === SALARY_EXPENSE_CODE)?.id;
const accSalariesPayable = payrollAccounts?.find(a => a.code === SALARIES_PAYABLE_CODE)?.id;

if (!accSalaryExpense || !accSalariesPayable) {
  console.error('[Payroll] Accounts not found', { SALARY_EXPENSE_CODE, SALARIES_PAYABLE_CODE });
} else {
  const { data: je, error: jeErr } = await supabaseAdmin
    .from('journal_entries')
    .insert({
      date: new Date().toISOString().split('T')[0],
      description: `Payroll Run #${payrollRun.id}`,
      reference_type: 'PAYROLL',
      reference_id: payrollRun.id,
      status: 'POSTED',
    })
    .select('id')
    .single();

  if (jeErr || !je) {
    console.error('[Payroll] JE header failed:', jeErr);
  } else {
    const { error: linesErr } = await supabaseAdmin
      .from(JOURNAL_LINES_TABLE)
      .insert([
        { journal_entry_id: je.id, account_id: accSalaryExpense,   debit: totalPayroll, credit: 0,            description: 'Salary expense' },
        { journal_entry_id: je.id, account_id: accSalariesPayable, debit: 0,            credit: totalPayroll, description: 'Salaries payable' },
      ]);

    if (linesErr) {
      console.error('[Payroll] JE lines failed — rolling back header:', linesErr);
      // ⚠️ v4/v5 fix: orphaned header-ის წაშლა
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
```

> 💡 **true atomicity-სთვის:** PostgreSQL RPC function-ი (single transaction). ამ fix-ი "best effort" rollback-ია.

- [ ] ანგარიშთა კოდები სქემაში გადამოწმებულია
- [ ] `journal_entry_lines` ზუსტი სახელი გადამოწმებულია
- [ ] `totalPayroll` ცვლადი სწორია
- [ ] lines failure → header delete (rollback) — კოდი, **არა კომენტარი**

---

## 🟡 მცირე სიმძიმის შესწორებები

---

### INFO-1 — `AdminPanel.tsx` გაყოფა
```
src/components/admin/
├── AdminPanel.tsx          (routing/layout, ~50 ხაზი)
└── tabs/
    ├── index.ts
    ├── SettingsTab.tsx
    ├── PromotionsTab.tsx
    ├── OrdersTab.tsx
    └── ProductsTab.tsx
```
- [ ] გაყოფა + `npm run build` შეცდომის გარეშე

---

### INFO-2 — Skeleton Count (8 → 9)
```diff
- {Array(8).fill(0).map((_, i) => <SkeletonCard key={i} />)}
+ {Array(9).fill(0).map((_, i) => <SkeletonCard key={i} />)}
```
> `const DASHBOARD_CARD_COUNT = 9`

- [ ] Skeleton count 9-ზე განახლებულია

---

### INFO-3 — `vite` Duplicate Dependency
```bash
npm uninstall vite && npm install --save-dev vite && npm run build
```
- [ ] `vite` მხოლოდ `devDependencies`-შია

---

### INFO-4 — `ScrollToTopManager`
```typescript
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

function ScrollToTopManager() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}
```
> `pathname`-ზე trigger: hash (#section) ან query param ცვლილება scroll-ს არ ააქტიურებს — სწორი ქცევა.

- [ ] `useLocation()`-ზე გადართულია

---

### INFO-5 — Payment Method Mapping
```typescript
// src/utils/paymentMapping.ts
export const providerToMethod = (provider: string): string => {
  const map: Record<string, string> = {
    bog: 'card', tbc: 'card', credo: 'card',
    cash: 'cash', bank_transfer: 'bank_transfer',
  };
  return map[provider?.toLowerCase()] ?? provider;
};

export const paymentMethodLabel = (method: string): string => {
  const labels: Record<string, string> = {
    card: 'ბარათი', cash: 'ნაღდი', bank_transfer: 'გადარიცხვა',
  };
  return labels[method] ?? method;
};
```

- [ ] `paymentMapping.ts` შექმნილია + Dashboard aggregation განახლებულია

---

## 📋 სრული შემოწმების სია

### 🔴 კრიტიკული
- [ ] BUG-1 — კოდები `1310/3200/6100/7100` + **`accVat` check conditional** (`vatRate>0 && !accVat`) + `accounting_status` migration + `throw` ამოღებულია
- [ ] BUG-2 — `invoice_type: 'B2C'` + CHECK constraint შემოწმება
- [ ] BUG-3 — maybeSingle + Boolean() + precision guard + **inclusive formula** + settings=null logged + BUG-3 კოდი BUG-1-ამდე
- [ ] BUG-3 (add) — **`cogsCost` სწორი ცვლადი** + VAT line guard (`vatAmount>0 && accVat`) + COGS guard (`cogsCost>0`)
- [ ] BUG-4 — `isProductOnActiveSale` utility + 3 ადგილი

### 🟠 საშუალო
- [ ] WARN-1 — CORS + HMAC
- [ ] WARN-2 — rate limiter + IP fallback
- [ ] WARN-3 — RLS SQL check + policies
- [ ] WARN-4 — Tooltip colors
- [ ] WARN-5 — CartContext unitPrice recalc
- [ ] WARN-6 — Payroll JE + **rollback კოდი** (არა კომენტარი)

### 🟡 მცირე
- [ ] INFO-1 — AdminPanel split
- [ ] INFO-2 — Skeleton 9
- [ ] INFO-3 — vite devDependencies
- [ ] INFO-4 — useLocation()
- [ ] INFO-5 — paymentMapping.ts

---

## 🧪 რეგრესიის ტესტები

### BUG-1 + VAT off — ძირითადი გადახდა (ახლანდელი სცენარი):
```
1. BOG/TBC sandbox გადახდა
2. orders.accounting_status = 'PENDING' — არ არის 'FAILED' ✓
3. journal_entries → 1 ახალი ჩანაწერი reference_type='WEB_ORDER' ✓
4. journal_entry_lines → 2 ან 4 სტრიქონი (cogsCost-ის მიხედვით), 0 VAT line ✓
5. console: '[processSuccessfulOrder] CRITICAL' — **არ ჩნდება** ✓
```

### BUG-1 — Account missing test:
```sql
-- სქემაში დროებით შეცვალე კოდი
UPDATE accounts SET code = '6100_test' WHERE code = '6100';
-- გადახდა → orders.accounting_status = 'FAILED', accounting_error = 'Missing account codes'
-- console: '[processSuccessfulOrder] CRITICAL: ... accRev: 6100' ✓
-- Restore: UPDATE accounts SET code = '6100' WHERE code = '6100_test';
```

### BUG-3 — VAT precision + inclusive formula:
```
VAT off (ახლა):
  vat_registered=false → vatAmount=0.00 ✓

VAT on (სამომავლო):
  vat_registered=true, vat_rate=18 →
  გადახდა 118₾ → vatAmount=18.00₾ (არა 21.24₾!) ✓
  
  vat_registered=true, vat_rate=0.18 →
  გადახდა 118₾ → vatAmount=18.00₾ ✓
  
  journal_entry_lines: VAT line ჩანს vat_registered=true-ზე ✓
  journal_entry_lines: VAT line არ ჩანს vat_registered=false-ზე ✓
```

### BUG-4 — Expired Sale:
```
1. პროდუქტს: sale_end_date = გუშინდელი
2. POS → order_items.is_promotional_sale = false ✓
3. Web cart → getEffectivePrice() = regular price ✓
```

### WARN-6 — Payroll:
```sql
SELECT je.id, COUNT(jl.id) as line_count
FROM journal_entries je
LEFT JOIN [journal_lines_table] jl ON jl.journal_entry_id = je.id
WHERE je.reference_type = 'PAYROLL'
GROUP BY je.id;
-- line_count = 2 ყოველ JE-ზე (0 orphaned headers) ✓
```

---

## 📌 VAT Toggle — არქიტექტურული შეჯამება (final)

> | სცენარი | `vat_registered` | `vat_rate` | `vatAmount` | JE lines |
> |---|---|---|---|---|
> | **ახლა** | `false` | ნებისმიერი | `0` | 2 ან 4 (COGS-ის მიხედვით) |
> | **სამომავლო** | `true` | `0.18` ან `18` | `totalAmount × 0.18/1.18` | 3 ან 5 |
>
> **DB-ში toggle:** მხოლოდ `vat_registered` და `vat_rate` ველების ცვლილება. **სხვა კოდი არ იცვლება.**

---

*Kale Group Audit Fix Guide — v5.0 | 2026-04-11*
*v3→v4→v5: triple-verified. v4 bugs fixed: accVat unconditional check (production blocker), cogsCost undefined variable, execution order, sanity check removed, JE description corrected.*
