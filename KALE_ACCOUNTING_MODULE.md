# 📊 KALE GROUP — ბუღალტერიის მოდული
### სრული სპეციფიკაცია | Inspired by Oris & FINA

> **Version:** 1.0.0 | **Date:** 2026  
> **Stack:** React 19 + Supabase + Node.js/Express  
> **Standard:** IFRS (ბასს) + საქართველოს საგადასახადო კოდექსი

---

## 📋 შინაარსი

1. [სისტემის არქიტექტურა](#1-სისტემის-არქიტექტურა)
2. [ანგარიშთა გეგმა (Chart of Accounts)](#2-ანგარიშთა-გეგმა)
3. [მოდულები და ფუნქციონალი](#3-მოდულები)
4. [საბუღალტრო ჟურნალი](#4-საბუღალტრო-ჟურნალი)
5. [გაყიდვებისა და შემოსავლების მოდული](#5-გაყიდვები--შემოსავლები)
6. [სასაწყობო და მარაგების მოდული](#6-სასაწყობო--მარაგები)
7. [შესყიდვები და მომწოდებლები](#7-შესყიდვები--მომწოდებლები)
8. [ДДС / დღგ მოდული](#8-ддс--დღგ-მოდული)
9. [RS.ge ინტეგრაცია](#9-rsge-ინტეგრაცია)
10. [ფინანსური ანგარიშგება](#10-ფინანსური-ანგარიშგება)
11. [HR და ხელფასი](#11-hr--ხელფასი)
12. [Admin Panel — UI სქემა](#12-admin-panel--ui-სქემა)
13. [API Endpoints](#13-api-endpoints)
14. [უსაფრთხოება და RBAC](#14-უსაფრთხოება--rbac)

---

## 1. სისტემის არქიტექტურა

```
KALE GROUP Accounting Engine
├── Core Layer (Supabase PostgreSQL)
│   ├── Chart of Accounts        → accounts
│   ├── Journal Entries          → journal_entries + journal_lines
│   ├── Fiscal Periods           → fiscal_periods
│   └── Currency Rates           → exchange_rates
│
├── Business Layer
│   ├── Sales Module             → invoices + invoice_items
│   ├── Purchase Module          → purchase_orders + supplier_invoices
│   ├── Inventory Module         → inventory_transactions + stock_levels
│   ├── VAT Module               → vat_transactions + vat_declarations
│   └── Payroll Module           → employees + payroll_runs
│
├── Reporting Layer
│   ├── Balance Sheet            → (View: v_balance_sheet)
│   ├── P&L Statement            → (View: v_profit_loss)
│   ├── Cash Flow                → (View: v_cash_flow)
│   ├── Trial Balance            → (View: v_trial_balance)
│   └── VAT Declaration          → (View: v_vat_declaration)
│
└── Integration Layer
    ├── RS.ge SOAP API            → /api/rsge/*
    ├── BOG/TBC Webhooks          → /api/payments/webhook
    └── PDF Export                → /api/reports/export
```

---

## 2. ანგარიშთა გეგმა

### სტანდარტული ქართული ბუღალტრული ანგარიშთა გეგმა (KALE GROUP-ისთვის ადაპტირებული)

```
CLASS 1 — მიმდინარე აქტივები (Current Assets)
├── 1100  სალარო (Cash on Hand)
├── 1110  საბანკო ანგარიში — ლარი (Bank — GEL)
├── 1120  საბანკო ანგარიში — USD (Bank — USD)
├── 1130  საბანკო ანგარიში — EUR (Bank — EUR)
├── 1140  BOG Online გადახდები (BOG e-Commerce Settlement)
├── 1150  TBC Online გადახდები (TBC e-Commerce Settlement)
├── 1160  Credo გადახდები
├── 1200  დებიტორული დავალიანება — მომხმარებლები
├── 1210  წინასწარი გადახდა მომწოდებლებს
├── 1300  სასაქონლო-მატერიალური ფასეულობები
│   ├── 1310  საქონელი — ავეჯი (მარაგი)
│   ├── 1320  მასალები (ნედლეული / სასაფუთე)
│   └── 1330  სატრანსპორტო ხარჯი (ყიდვის ღირებულება)
├── 1400  ДДС (დღგ) ჩასათვლელი (VAT Receivable)
└── 1900  სხვა მიმდინარე აქტივები

CLASS 2 — გრძელვადიანი აქტივები (Non-Current Assets)
├── 2100  ძირითადი საშუალებები (Fixed Assets)
│   ├── 2110  საოფისე ტექნიკა
│   ├── 2120  სატრანსპორტო საშუალება
│   └── 2130  სხვა ძირითადი საშუალება
├── 2200  დაგროვებული ამორტიზაცია (Accumulated Depreciation)
└── 2300  არამატერიალური აქტივები (Intangible Assets)
     └── 2310  პროგრამული უზრუნველყოფა (Website / Platform)

CLASS 3 — მიმდინარე ვალდებულებები (Current Liabilities)
├── 3100  კრედიტორული დავალიანება — მომწოდებლები
├── 3110  მიღებული წინასწარი გადახდები (Deferred Revenue)
├── 3200  ДДС (დღგ) გადასახდელი (VAT Payable)
├── 3300  შრომის ანაზღაურება — გადასახდელი (Accrued Payroll)
├── 3310  საშემოსავლო გადასახადი — გადასახდელი
├── 3400  სასესხო ვალდებულებები (Short-term Loans)
└── 3900  სხვა მოკლევადიანი ვალდებულებები

CLASS 4 — გრძელვადიანი ვალდებულებები (Long-Term Liabilities)
└── 4100  გრძელვადიანი სესხები

CLASS 5 — კაპიტალი (Equity)
├── 5100  საწესდებო კაპიტალი (Share Capital)
├── 5200  გაუნაწილებელი მოგება (Retained Earnings)
└── 5300  მიმდინარე პერიოდის მოგება/ზარალი (Current Year P&L)

CLASS 6 — შემოსავლები (Revenue)
├── 6100  გაყიდვებიდან შემოსავალი — ავეჯი
├── 6110  გაყიდვებიდან შემოსავალი — მოქნილი შეკვეთები
├── 6200  მიწოდების/სერვისის შემოსავალი (Delivery Revenue)
└── 6900  სხვა საოპერაციო შემოსავალი

CLASS 7 — გაყიდული საქონლის ღირებულება (COGS)
├── 7100  გაყიდული საქონლის თვითღირებულება
└── 7200  პირდაპირი მიწოდების ხარჯები

CLASS 8 — საოპერაციო ხარჯები (Operating Expenses)
├── 8100  ხელფასი და სოციალური დაზღვევა
├── 8200  ქირა (Rent)
├── 8300  მარკეტინგი და რეკლამა
├── 8400  IT / ჰოსტინგი / პლატფორმა (Vercel, Supabase)
├── 8500  ბანკის საკომისიო (BOG / TBC processing fees)
├── 8600  სატრანსპორტო ხარჯი (მიწოდება)
├── 8700  ამორტიზაცია
├── 8800  სხვა ადმინისტრაციული ხარჯი
└── 8900  საგადასახადო ჯარიმები / პენალტები
```

---

## 3. მოდულები

### Module 1: 📒 Journal (სააღრიცხვო ჟურნალი)
**ფუნქციონალი:**
- Double-entry bookkeeping (ორმაგი ჩანაწერი — Debit/Credit)
- ავტომატური პროვოდკები გაყიდვებიდან, შესყიდვებიდან, გადახდებიდან
- მანუალური ჟურნალის ჩანაწერები ადმინ-პანელიდან
- რეკურენტული ჩანაწერები (ყოველთვიური ქირა, ამორტიზაცია)
- დოკუმენტის მიბმა (PDF/სკანი)
- ფისკალური პერიოდის ბლოკირება (period closing)

**ავტო-პროვოდკების სქემა:**

```
1. ონლაინ გაყიდვა (BOG/TBC ბარათით):
   DR 1140/1150  BOG/TBC Settlement    XXX
   CR 6100       გაყიდვების შემოსავალი  XXX * (1 / 1.18)
   CR 3200       ДДС გადასახდელი        XXX * 0.18/1.18

2. COD (ნაღდი ფული კურიერს):
   DR 1100  სალარო               XXX
   CR 6100  გაყიდვების შემოსავალი  XXX * (1/1.18)
   CR 3200  ДДС გადასახდელი        XXX * 0.18/1.18

3. შესყიდვა მომწოდებლისგან:
   DR 1310  საქონელი (მარაგი)     XXX
   DR 1400  ДДС ჩასათვლელი         XXX * 0.18
   CR 3100  კრედიტორული დავ.      XXX * 1.18

4. მომწოდებლის გადახდა:
   DR 3100  კრედიტორული დავ.      XXX
   CR 1110  საბანკო ანგარიში       XXX

5. ხელფასი:
   DR 8100  ხელფასი                XXX
   CR 3300  ხელფასი — გადასახდელი  XXX * 0.80
   CR 3310  საშემოსავლო გადასახადი  XXX * 0.20

6. ავეჯის ჩამოწერა (COGS):
   DR 7100  გაყიდ. საქ. ღირებულება  COST
   CR 1310  საქონელი (მარაგი)         COST
```

---

### Module 2: 🛒 Sales & Invoicing (გაყიდვები და ინვოისი)
**ფუნქციონალი:**
- B2C: ავტომატური ინვოისი შეკვეთის გაფორმებისას
- B2B: ელ. ინვოისი RS.ge-ზე გაგზავნით
- PDF ინვოისი — ბრენდირებული, ქართული UTF-8 (jsPDF)
- Sale/Refund მართვა
- Multi-currency (GEL, USD, EUR)
- გადახდის სტატუსი: Pending / Paid / Partial / Overdue / Refunded
- BOG/TBC Webhook-ით ავტო-დადასტურება
- ДДС-ის ავტომატური კალკულაცია (18%)

**Invoice ნომრის ფორმატი:**
```
INV-2026-0001   (B2C)
EINV-2026-0001  (B2B RS.ge)
REF-2026-0001   (Refund)
```

---

### Module 3: 📦 Inventory (სასაწყობო)
**ფუნქციონალი:**
- FIFO / Weighted Average ღირებულების მეთოდი
- სასაწყობო ოპერაციები: შემოსვლა, გასვლა, ჩამოწერა, ინვენტარიზაცია
- მინიმალური მარაგის ზღვარი (Reorder Point) + ავტო შეტყობინება
- პარტიების (Batch) არარად მიდევნება
- ადმინ-პანელიდან `in_stock` სინქრონიზაცია Products ცხრილთან
- მარაგის ანგარიში: ჭარბი/ნაკლები, ბრუნვის კოეფიციენტი

**FIFO COGS გაანგარიშება:**
```
ყოველი გაყიდვა → FIFO-ს მიხედვით COGS ავტო-გაანგარიშება
COGS = Σ(ყველა batch-ის ერთ. ღირებ. × გაყიდ. რაოდ.)
ბოლო დარჩენილი batch-ები → მარაგის ღირებულება
```

---

### Module 4: 🏭 Purchases (შესყიდვები)
**ფუნქციონალი:**
- მომწოდებლების ბაზა (Suppliers CRM)
- Purchase Order (PO) შექმნა და მართვა
- მომწოდებლის ინვოისის რეგისტრაცია
- 3-way matching: PO → Goods Receipt → Supplier Invoice
- კრედიტორული დავალიანების ანგარიში (Accounts Payable)
- გადახდის განრიგი (Payment Schedule)

---

### Module 5: 💰 VAT / ДДС (დღგ)
**ფუნქციონალი:**
- Input VAT (ДДС ჩასათვლელი) ავტო-აგრეგაცია
- Output VAT (ДДС გადასახდელი) ავტო-აგრეგაცია
- ყოველთვიური ДДС დეკლარაცია (RS.ge ფორმა)
- ДДС-ის ნეტო განსხვავება = Output - Input
- RS.ge eGateway-ზე ელ. ინვოისის გაგზავნა (B2B)

---

### Module 6: 👔 HR & Payroll (კადრები და ხელფასი)
**ფუნქციონალი:**
- თანამშრომლების ბაზა
- ხელფასის ფურცელი (Payslip) — PDF
- გამოქვითვები: საშემოსავლო 20%, სოციალური 2%
- ყოველთვიური ხელფასის გარიგება (Payroll Run)
- ჯამური შრომის ხარჯი P&L-ში

---

## 4. საბუღალტრო ჟურნალი

### UI კომპონენტი: `JournalEntryForm`

```typescript
interface JournalEntry {
  id: string
  entry_number: string        // JE-2026-0001
  entry_date: Date
  description: string
  reference_type: 'INVOICE' | 'PURCHASE' | 'PAYMENT' | 'PAYROLL' | 'ADJUSTMENT' | 'OPENING'
  reference_id?: string       // FK to invoices, purchase_orders, etc.
  fiscal_period_id: string
  status: 'DRAFT' | 'POSTED' | 'REVERSED'
  created_by: string          // user_id
  lines: JournalLine[]
}

interface JournalLine {
  id: string
  journal_entry_id: string
  account_id: string          // FK to accounts
  account_code: string        // e.g. "6100"
  account_name: string
  debit: number               // GEL amount
  credit: number              // GEL amount
  currency: 'GEL' | 'USD' | 'EUR'
  original_amount?: number    // original currency amount
  exchange_rate?: number
  description?: string
  cost_center?: string        // 'ONLINE_SALES' | 'COD' | 'ADMIN'
}
// CONSTRAINT: Σ debit == Σ credit (ჟურნალი ბალანსირებული უნდა იყოს)
```

---

## 5. გაყიდვები — შემოსავლები

### Invoice სტატუსების ნაკადი:
```
DRAFT → SENT → PARTIAL_PAID → PAID → CLOSED
                     ↓
                OVERDUE → CANCELLED
                     ↓
                  REFUNDED
```

### ავტომატური Webhook ნაკადი (BOG/TBC):
```
Payment Success Webhook
    → Update order status: 'processing'
    → Create Invoice (status: PAID)
    → Auto Journal Entry:
        DR 1140 BOG Settlement  = total_amount
        CR 6100 Revenue         = total_amount / 1.18
        CR 3200 VAT Payable     = total_amount * 0.18/1.18
    → Deduct inventory (FIFO)
    → Auto COGS Journal Entry:
        DR 7100 COGS  = cogs_amount
        CR 1310 Stock = cogs_amount
    → Generate PDF Invoice
    → Send email to customer
```

---

## 6. სასაწყობო — მარაგები

### Inventory Transaction Types:
```typescript
type InventoryTransactionType =
  | 'PURCHASE_IN'       // შესყიდვიდან შემოსვლა
  | 'SALE_OUT'          // გაყიდვაზე გასვლა
  | 'RETURN_IN'         // დაბრუნება (მომხმარებლისგან)
  | 'RETURN_OUT'        // დაბრუნება (მომწოდებელთან)
  | 'ADJUSTMENT_IN'     // ინვენტარიზაციის მიხედვით (პლუს)
  | 'ADJUSTMENT_OUT'    // ინვენტარიზაციის მიხედვით (მინუს)
  | 'WRITE_OFF'         // ჩამოწერა (დაზიანება/დანაკლისი)
  | 'TRANSFER'          // სასაწყობოებს შორის გადაცემა
```

### FIFO Cost Layer:
```sql
-- ყოველ შემოსვლაზე ახალი layer იქმნება
-- გაყიდვა ყველაზე ძველ layer-ს ჩამოწერს
-- COGS ავტო-გაიანგარიშება
```

---

## 7. შესყიდვები — მომწოდებლები

### Purchase Order სტატუსები:
```
DRAFT → SENT → PARTIALLY_RECEIVED → FULLY_RECEIVED → INVOICED → PAID
                                                         ↓
                                                      CANCELLED
```

### 3-Way Matching:
```
Purchase Order (PO)
    ↓ approve
Goods Receipt Note (GRN)  — physically received goods
    ↓ match
Supplier Invoice           — financial document
    ↓ match OK → ავტო Journal Entry
    ↓ mismatch → Alert to Admin
```

---

## 8. ДДС / დღგ მოდული

### ДДС კალკულაცია (18%):
```
ДДС-ით ფასი = ბაზისური ფასი × 1.18
ДДС თანხა  = ДДС-ით ფასი × 18/118
ბაზისური   = ДДС-ით ფასი / 1.18
```

### ყოველთვიური ДДС ანგარიში:
```
Output VAT (გამოყვანილი):
  Σ ყველა გაყიდვის ДДС                   = A

Input VAT (შეყვანილი):
  Σ ყველა შესყიდვის ДДС (RS.ge ინვოისი)  = B

Net VAT Payable/Receivable = A - B

if A > B → გადასახდელი RS.ge-ზე
if B > A → ჩასათვლელი მომავალ პერიოდში
```

---

## 9. RS.ge ინტეგრაცია

### SOAP API კლიენტი (server.ts):

```typescript
// endpoint: /api/rsge/einvoice
import soap from 'soap'

const RSGE_WSDL = process.env.NODE_ENV === 'production'
  ? 'https://eservices.rs.ge/eGateway/webgateway.svc?wsdl'
  : 'https://sandbox.eservices.rs.ge/eGateway/webgateway.svc?wsdl'

interface RSGEInvoice {
  InvoiceNumber: string        // EINV-2026-0001
  InvoiceDate: string          // ISO 8601
  SupplierTIN: string          // KALE GROUP-ის სს/კ
  BuyerTIN: string             // მყიდველის სს/კ (B2B)
  TotalWithoutVAT: number
  TotalVAT: number
  TotalWithVAT: number
  Items: RSGEInvoiceItem[]
  Status: 'DRAFT' | 'ACTIVE'
}

// B2B გაყიდვაზე ავტო-გაგზავნა
router.post('/api/rsge/einvoice', async (req, res) => {
  const client = await soap.createClientAsync(RSGE_WSDL)
  // ... სავაჭრო ინვოისი RS.ge-ზე
})
```

### ელ. სასაქონლო ზედნადები (eWaybill):
```typescript
// endpoint: /api/rsge/waybill
// — ყოველ მიწოდებაზე (B2B)
// — RS.ge eWaybill SOAP method: SaveWaybill
```

### ДДС დეკლარაცია:
```typescript
// endpoint: /api/rsge/vat-declaration
// ყოველი თვის 15-მდე წარდგენა
// RS.ge method: SubmitVATDeclaration
```

---

## 10. ფინანსური ანგარიშგება

### 10.1 მოგება-ზარალი (P&L Statement)

```
KALE GROUP — მოგება-ზარალი
პერიოდი: [თარიღი - თარიღი]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
შემოსავლები:
  გაყიდვებიდან შემოსავალი    [6100]    ____
  სხვა შემოსავალი              [6900]    ____
                              ──────────────
  სულ შემოსავალი (Revenue)              ____

გაყიდვ. საქ. ღირებულება (COGS):
  საქ. თვითღირებ.              [7100]   (   )
                              ──────────────
  მთლიანი მოგება (Gross Profit)         ____
  მთლ. მოგება %                          XX%

საოპერაციო ხარჯები:
  ხელფასი                      [8100]   (   )
  ქირა                         [8200]   (   )
  მარკეტინგი                   [8300]   (   )
  IT/ჰოსტინგი                  [8400]   (   )
  ბანკის საკომისიო              [8500]   (   )
  მიწოდების ხარჯი              [8600]   (   )
  ამორტიზაცია                  [8700]   (   )
  სხვა                         [8800]   (   )
                              ──────────────
  სულ საოპ. ხარჯი (OPEX)               (   )

  EBITDA                                 ____
  ამორტ. გამოქვით.                      (   )
  EBIT                                   ____
  ბანკის % ხარჯი                        (   )
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  წმ. მოგება / ზარალი (Net P&L)         ____
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### 10.2 ბალანსი (Balance Sheet)
```
KALE GROUP — ბალანსი
თარიღი: [DATE]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
აქტივები                   ვალდ. + კაპიტ.
─────────────────────────  ─────────────────────────
მიმდ. აქტ. (Current):       მიმდ. ვალდ.:
  სალარო + ბანკი              კრედიტ. დავ.
  დებიტ. დავ.                 ДДС გადასახ.
  ДДС ჩასათვ.                 ხელფ. გადასახ.
  მარაგი                      წინ. გადახდები
─────────────────────────  ─────────────────────────
გრძ. აქტ. (Non-Current):    კაპიტალი (Equity):
  ძირ. საშ. (net)             საწ. კაპიტ.
  არამ. აქტ. (net)            გაუნაწ. მოგება
                              მიმდ. წლ. P&L
─────────────────────────  ─────────────────────────
სულ აქტივი = სულ ვალდ. + კაპიტ.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### 10.3 ფულადი ნაკადი (Cash Flow Statement)
```
საოპერაციო საქმიანობა:
  + წმ. მოგება
  + ამორტიზაცია
  ± დებ/კრედ. ცვლილება
  ± მარაგის ცვლილება
  ± ДДС ნეტო
─────────────────
  სულ საოპ. ნაკადი (Operating CF)

საინვ. საქმიანობა:
  - ძირ. საშ. შეძენა
─────────────────
  სულ საინვ. ნაკადი (Investing CF)

საფინ. საქმიანობა:
  ± კაპიტ. ცვლილება
  ± სესხები
─────────────────
  სულ საფინ. ნაკადი (Financing CF)

━━━━━━━━━━━━━━━━━
  წმ. CF = A + B + C
  საწყ. ნაშთი + წმ. CF = საბოლ. ნაშთი
```

### 10.4 Trial Balance (სცადული ბალანსი)
```
ყველა ანგარიში | Debit Turnover | Credit Turnover | Dr Balance | Cr Balance
Σ Debit == Σ Credit → ✅ balanced
```

---

## 11. HR — ხელფასი

```typescript
interface Employee {
  id: string
  full_name: string
  personal_id: string    // პირადი ნომერი
  position: string
  department: 'SALES' | 'ADMIN' | 'LOGISTICS' | 'IT'
  gross_salary: number   // GEL — ბრუტო
  hire_date: Date
  status: 'ACTIVE' | 'INACTIVE'
}

interface PayrollRun {
  id: string
  period_month: number   // 1-12
  period_year: number
  status: 'DRAFT' | 'PROCESSED' | 'PAID'
  items: PayrollItem[]
}

interface PayrollItem {
  employee_id: string
  gross_salary: number
  income_tax: number      // 20% (საშემოსავლო)
  net_salary: number      // gross × 0.80
  paid_date?: Date
}
```

**ხელფასის ჟურნალის ჩანაწერი:**
```
DR 8100  ხელფასი                        1000
  CR 3300  ხელფასი — გადასახდელი          800
  CR 3310  საშემოსავლო გ-ადი (20%)       200
```

---

## 12. Admin Panel — UI სქემა

```
/admin/accounting/
├── dashboard/          ← KPI ბარათები: Revenue, COGS, Gross Margin, Net P&L
├── journal/
│   ├── list            ← ყველა ჟურნ. ჩანაწ. (filter by period, type, status)
│   ├── new             ← მანუალური ჩანაწ. ფორმა
│   └── [id]/           ← ჩანაწ. დეტალი, ბეჭდვა
├── invoices/
│   ├── list            ← B2C + B2B ინვოისები
│   ├── [id]/           ← ინვ. დეტალი + RS.ge სტატუსი + PDF
│   └── new             ← B2B მანუ. ინვოისი
├── purchases/
│   ├── suppliers/      ← მომწოდ. ბაზა (CRUD)
│   ├── orders/         ← PO სია და ფორმა
│   └── invoices/       ← მომ. ინვ. სია
├── inventory/
│   ├── levels/         ← მარაგის დონე + ინდიკატორები
│   ├── transactions/   ← ყველა ტრანზ.
│   └── adjustment/     ← ინვენტარიზაციის ფორმა
├── vat/
│   ├── transactions/   ← Input/Output ДДС ჩამონათვ.
│   └── declaration/    ← ДДС დეკლარაციის ფორმა + RS.ge გაგზავნა
├── hr/
│   ├── employees/      ← CRUD
│   └── payroll/        ← ხელფ. ფურ. + Run
└── reports/
    ├── pl/             ← P&L (period picker, export PDF/Excel)
    ├── balance-sheet/  ← ბალანსი
    ├── cash-flow/      ← ფულ. ნაკადი
    ├── trial-balance/  ← სცად. ბალანსი
    └── vat-report/     ← ДДС ანგარ.
```

### Dashboard KPI Cards:
```typescript
const accountingKPIs = [
  { label: 'ყოველთვიური შემოსავ.',  value: revenue,      color: 'green',  icon: TrendingUp },
  { label: 'COGS',                   value: cogs,          color: 'orange', icon: Package },
  { label: 'მთლ. მოგება %',          value: grossMargin,  color: 'blue',   icon: Percent },
  { label: 'წმ. მოგება',             value: netProfit,    color: 'purple', icon: DollarSign },
  { label: 'ДДС გადასახდელი',        value: vatPayable,   color: 'red',    icon: Receipt },
  { label: 'კრედ. დავ.',             value: apBalance,    color: 'yellow', icon: FileText },
  { label: 'მარაგის ღირებ.',         value: inventoryVal, color: 'teal',   icon: Warehouse },
  { label: 'ნაღდი ფული + ბანკი',    value: cashBalance,  color: 'green',  icon: Wallet },
]
```

---

## 13. API Endpoints

```
POST   /api/accounting/journal-entries          ← ახ. ჩანაწ. შექმნა
GET    /api/accounting/journal-entries          ← სია (filter, paginate)
GET    /api/accounting/journal-entries/:id      ← დეტალი
PATCH  /api/accounting/journal-entries/:id      ← სტატუსი (post/reverse)

GET    /api/accounting/trial-balance            ← სცადული ბალანსი
GET    /api/accounting/balance-sheet            ← ბალანსი
GET    /api/accounting/profit-loss              ← P&L
GET    /api/accounting/cash-flow                ← ფულ. ნაკადი
GET    /api/accounting/vat-report               ← ДДС ანგ.

POST   /api/invoices                            ← ინვ. შექმნა
GET    /api/invoices/:id/pdf                    ← PDF გენ.
POST   /api/invoices/:id/send-rsge              ← RS.ge-ზე გაგ.

POST   /api/inventory/transactions              ← ინვ. ტრანზ.
GET    /api/inventory/levels                    ← მარ. დონე
POST   /api/inventory/adjustment                ← კორ. ჩამ.

POST   /api/payroll/run                         ← ხელფ. გამოთვ.
GET    /api/payroll/runs                        ← ისტ.
GET    /api/payroll/runs/:id/payslips           ← ფ-ური
```

---

## 14. უსაფრთხოება და RBAC

```typescript
const accountingPermissions = {
  admin: {
    journal:    ['create', 'read', 'post', 'reverse'],
    invoices:   ['create', 'read', 'send', 'cancel'],
    purchases:  ['create', 'read', 'approve', 'pay'],
    inventory:  ['read', 'adjust', 'write_off'],
    reports:    ['read', 'export'],
    payroll:    ['create', 'read', 'process', 'pay'],
    vat:        ['read', 'submit'],
  },
  accountant: {
    journal:    ['create', 'read', 'post'],
    invoices:   ['read', 'send'],
    purchases:  ['create', 'read'],
    inventory:  ['read'],
    reports:    ['read', 'export'],
    payroll:    ['create', 'read', 'process'],
    vat:        ['read', 'submit'],
  },
  consultant: {
    invoices:   ['read'],
    inventory:  ['read'],
    reports:    ['read'],
  },
  guest: {
    reports:    [], // no access
  },
}
```

---

## 🗓️ Implementation Roadmap

```
Phase 3A — Foundation (2 კვირა)
  ✅ ანგარიშთა გეგმა + SQL Schema
  ✅ Journal Entry CRUD + ვალიდაცია
  ✅ Fiscal Period მართვა
  ✅ Chart of Accounts UI

Phase 3B — Sales & Invoicing (1 კვირა)
  ✅ Invoice ავტო-შექმნა Order-ზე
  ✅ BOG/TBC Webhook → ავტო Journal Entry
  ✅ PDF Invoice (ქართული)
  ✅ B2B Invoice ფორმა

Phase 3C — Inventory & COGS (1 კვირა)
  ✅ FIFO Layer სისტემა
  ✅ ავტო COGS Journal Entry გაყიდვაზე
  ✅ მარ. ანგარიში + Reorder Alert

Phase 3D — VAT & RS.ge (1 კვირა)
  ✅ ДДС ავტო-კალკულაცია
  ✅ ДДС დეკლარაციის ფორმა
  ✅ RS.ge SOAP API კლიენტი (Sandbox)

Phase 3E — Reports & Payroll (1 კვირა)
  ✅ P&L, Balance Sheet, Cash Flow
  ✅ Trial Balance
  ✅ HR + Payroll module
  ✅ Excel/PDF export

Phase 3F — Production (1 კვირა)
  ✅ RS.ge Production გაშვება
  ✅ ДДС პირველი გაგზავნა
  ✅ Audit log
```

---

*KALE GROUP Accounting Module — © 2026. Built with Supabase + React + Node.js*
