# 📊 KALE GROUP — ბუღალტერიის მოდული
### სრული სპეციფიკაცია | Inspired by Oris & FINA

> **Version:** 2.0.0 | **Date:** 2026
> **Stack:** React 19 + Supabase PostgreSQL + Node.js/Express
> **Standard:** IFRS (ბასს) + საქართველოს საგადასახადო კოდექსი
> **Schema File:** `KALE_ACCOUNTING_SCHEMA_v2.sql`

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
13. [TypeScript Types — სრული](#13-typescript-types)
14. [API Endpoints](#14-api-endpoints)
15. [უსაფრთხოება და RBAC](#15-უსაფრთხოება--rbac)
16. [v2.0 ცვლილებები](#16-v20-ცვლილებები)

---

## 1. სისტემის არქიტექტურა

```
KALE GROUP Accounting Engine v2.0
├── Core Layer (Supabase PostgreSQL)
│   ├── Chart of Accounts        → accounts
│   ├── Journal Entries          → journal_entries + journal_lines
│   ├── Fiscal Periods           → fiscal_periods
│   ├── Currency Rates           → exchange_rates
│   └── Audit Log                → audit_log  ← NEW v2.0
│
├── Business Layer
│   ├── Sales Module             → invoices + invoice_items
│   ├── Purchase Module          → purchase_orders + supplier_invoices
│   ├── Goods Receipts           → goods_receipts + items  ← NEW v2.0
│   ├── Inventory Module         → inventory_transactions + stock_levels
│   ├── FIFO Layer               → inventory_cost_layers
│   ├── VAT Module               → vat_transactions + vat_declarations
│   └── Payroll Module           → employees + payroll_runs + payroll_items
│
├── Reporting Layer
│   ├── Balance Sheet            → v_balance_sheet
│   ├── P&L Statement            → v_profit_loss
│   ├── Cash Flow                → v_cash_flow  ← NEW v2.0
│   ├── Trial Balance            → v_trial_balance
│   ├── VAT Declaration          → v_vat_summary
│   ├── AR Aging                 → v_ar_aging  (NULL-safe ← FIXED v2.0)
│   ├── AP Aging                 → v_ap_aging  ← NEW v2.0
│   └── Monthly Summary          → v_monthly_summary
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
├── 1120  საბანკო ანგარიში — USD
├── 1130  საბანკო ანგარიში — EUR
├── 1140  BOG Online გადახდები
├── 1150  TBC Online გადახდები
├── 1160  Credo გადახდები
├── 1200  დებიტორული დავალიანება
├── 1210  წინასწარი გადახდა მომწოდებლებს
├── 1300  სასაქონლო-მატერიალური ფასეულობები
│   ├── 1310  საქონელი — ავეჯი (მარაგი)
│   ├── 1320  მასალები / სასაფუთე
│   └── 1330  სატრანსპ. ხარჯი (ყიდვის ღირებ.)  ← ADDED v2.0
├── 1400  ДДС ჩასათვლელი (VAT Receivable)
└── 1900  სხვა მიმდინარე აქტივები

CLASS 2 — გრძელვადიანი აქტივები (Non-Current Assets)
├── 2100  ძირითადი საშუალებები
│   ├── 2110  საოფისე ტექნიკა
│   └── 2120  სატრანსპორტო საშუალება
├── 2200  დაგროვებული ამორტიზაცია  [contra-asset: normal_balance = CREDIT ✓]
└── 2300  არამატერიალური აქტივები
     └── 2310  პლატფორმა / Website ღირებულება

CLASS 3 — მიმდინარე ვალდებულებები (Current Liabilities)
├── 3100  კრედიტორული დავალიანება — მომწოდებლები
├── 3110  მიღებული წინასწარი გადახდები (Deferred Revenue)
├── 3200  ДДС გადასახდელი (VAT Payable)
├── 3300  ხელფასი — გადასახდელი (Accrued Payroll)
├── 3310  საშემოსავლო გადასახადი — გადასახდელი (20%)
├── 3320  სოციალური დაზღვევა — გადასახდელი (2%)  ← ADDED v2.0
├── 3400  მოკლევადიანი სესხები
└── 3900  სხვა მოკლევადიანი ვალდებულებები

CLASS 4 — გრძელვადიანი ვალდებულებები
└── 4100  გრძელვადიანი სესხები

CLASS 5 — კაპიტალი (Equity)
├── 5100  საწესდებო კაპიტალი
├── 5200  გაუნაწილებელი მოგება
└── 5300  მიმდინარე პერიოდის P&L

CLASS 6 — შემოსავლები (Revenue)
├── 6100  გაყიდვებიდან შემოსავალი — ავეჯი
├── 6110  გაყიდვებიდან შემოსავალი — მოქნილი შეკვეთები
├── 6200  მიწოდების/სერვისის შემოსავალი
└── 6900  სხვა საოპერაციო შემოსავალი

CLASS 7 — COGS
├── 7100  გაყიდული საქონლის თვითღირებულება
└── 7200  პირდაპირი მიწოდების ხარჯები

CLASS 8 — საოპერაციო ხარჯები (OpEx)
├── 8100  ხელფასი და სოციალური დაზღვევა
├── 8200  ქირა
├── 8300  მარკეტინგი და რეკლამა
├── 8400  IT / ჰოსტინგი / პლატფორმა
├── 8500  ბანკის საკომისიო
├── 8600  სატრანსპორტო ხარჯი
├── 8700  ამორტიზაცია
├── 8800  სხვა ადმინისტრაციული ხარჯი
└── 8900  საგადასახადო ჯარიმები / პენალტები
```

---

## 3. მოდულები

### Module 1: 📒 Journal (სააღრიცხვო ჟურნალი)
**ფუნქციონალი:**
- Double-entry bookkeeping (ორმაგი ჩანაწერი)
- ავტომატური პროვოდკები გაყიდვებიდან, შესყიდვებიდან, გადახდებიდან
- მანუალური ჟურნალის ჩანაწერები ადმინ-პანელიდან
- Period closing + LOCKED period protection
- Audit log — ყველა ოპერაცია ჩაიწერება

**ავტო-პროვოდკების სქემა:**

```
1. ონლაინ გაყიდვა (BOG/TBC ბარათით):
   DR 1140/1150  BOG/TBC Settlement    total_amount
   CR 6100       გაყიდვების შემოსავ.   total / 1.18
   CR 3200       ДДС გადასახდელი       total × 0.18/1.18

2. COD (ნაღდი ფული კურიერს):
   DR 1100  სალარო                    total_amount
   CR 6100  გაყიდვების შემოსავ.       total / 1.18
   CR 3200  ДДС გადასახდელი           total × 0.18/1.18

3. COGS ჩამოწერა (FIFO):
   DR 7100  COGS                      fifo_cost
   CR 1310  საქონელი                  fifo_cost

4. შესყიდვა მომწოდებლისგან:
   DR 1310  საქონელი                  net_amount
   DR 1400  ДДС ჩასათვლელი            vat_amount
   CR 3100  კრედიტ. დავ.              total_amount

5. მომწოდებლის გადახდა:
   DR 3100  კრედიტ. დავ.              amount
   CR 1110  საბანკო ანგარიში           amount

6. ხელფასი (20% საშემ. + 2% სოც.):
   DR 8100  ხელფასი                   gross
   CR 3300  ხელფ. გადასახდ.           gross × 0.80
   CR 3310  საშემ. გადასახ. (20%)     gross × 0.20
   [+ employer social ins. journal:]
   DR 8100  სოც. დ-ვა (employer)      gross × 0.02
   CR 3320  სოც. დ-ვა გადასახდ.       gross × 0.02

7. ამორტიზაცია:
   DR 8700  ამორტიზაცია               monthly_dep
   CR 2200  დაგ. ამორტიზაცია          monthly_dep
```

---

### Module 2: 🛒 Sales & Invoicing (გაყიდვები)
**Invoice ნომრის ფორმატი:**
```
INV-2026-000001   (B2C)
EINV-2026-000001  (B2B / RS.ge)
REF-2026-000001   (Refund)
PRO-2026-000001   (Proforma)  ← ADDED v2.0
```

**Invoice სტატუსების ნაკადი:**
```
DRAFT → SENT → PARTIAL → PAID → CLOSED
                  ↓
              OVERDUE → CANCELLED
                  ↓
               REFUNDED
```

**გადახდის ავტომატური Webhook ნაკადი (BOG/TBC):**
```
Payment Success Webhook
  → Update order status: 'processing'
  → Create Invoice (status: PAID)
  → Auto Journal Entry (DR 1140, CR 6100, CR 3200)
  → calculate_fifo_cogs() → COGS Journal Entry
  → sync_stock_levels() trigger → stock_levels updated
  → create_vat_from_invoice() trigger → vat_transactions row
  → Generate PDF Invoice
  → Send email to customer
```

> ⚠️ **v2.0 FIX:** `create_vat_from_invoice` trigger now **skips PROFORMA and REFUND** invoice types.
> Refund VAT is handled separately via an ADJUSTMENT vat_transaction.

---

### Module 3: 📦 Inventory (სასაწყობო)

**FIFO COGS გაანგარიშება:**
```
purchase_in  → CREATE inventory_cost_layer (qty, unit_cost)
sale_out     → calculate_fifo_cogs(product_id, qty)
             → UPDATE inventory_cost_layers (quantity_remaining--)
             → INSERT inventory_transaction (SALE_OUT)
             → trg_sync_stock_levels → UPDATE stock_levels
```

> ⚠️ **v2.0 FIX:** `sync_stock_levels()` trigger is now wired to `inventory_transactions`.
> v1.0-ში stock_levels **არ** განახლდებოდა ავტომატურად.

**Reorder Alert:**
```sql
-- აპლიკაციაში: poll ეს query ან Supabase Realtime-ით
SELECT product_id, quantity_available, reorder_point
FROM stock_levels
WHERE quantity_available <= reorder_point;
```

---

### Module 4: 🏭 Purchases + 3-Way Matching

**3-Way Matching ნაკადი (v2.0 სრულყოფილი):**
```
1. Purchase Order (PO) — DRAFT → SENT
        ↓ (goods arrive)
2. Goods Receipt Note (GRN) — trg_grn_number auto-generates GRN-2026-000001
        ↓ CONFIRM GRN
3. trg_sync_po_on_grn trigger:
   → UPDATE purchase_order_items.quantity_received
   → UPDATE purchase_orders.status (PARTIALLY_RECEIVED / FULLY_RECEIVED)
        ↓ (supplier sends invoice)
4. Supplier Invoice (SINV-2026-000001)  ← auto-generated v2.0
   → 3-way match: PO qty == GRN qty == SINV qty ✓
   → On mismatch → Admin alert
        ↓ pay
5. Payment → DR 3100, CR 1110
   → trg_vat_from_supplier_invoice → Input VAT recorded
```

> ⚠️ **v2.0 FIX:** `goods_receipts` table was **entirely missing** in v1.0.
> `sinv_number` now has UNIQUE constraint + auto-generation trigger.

---

### Module 5: 💰 VAT / ДДС (18%)

**ДДС კალკულაცია:**
```
total_with_vat  = base_price × 1.18
vat_amount      = total × 18/118   [= total × 0.152542...]
base_price      = total / 1.18

-- SQL helper:
SELECT * FROM calc_vat(118.00);  -- → taxable=100, vat=18
```

**ყოველთვიური ДДС ანგარიში:**
```
Output VAT: Σ(გაყიდვის ДДС) = A   → account 3200
Input  VAT: Σ(შესყიდვის ДДС) = B  → account 1400
──────────────────────────────────
Net = A − B
  if A > B → RS.ge-ზე გადასახდელი
  if B > A → ჩასათვლელი (carryforward)
```

---

### Module 6: 👔 HR & Payroll (v2.0 განახლებული)

**ხელფასის გამოთვლა:**
```
gross_salary          = 1000 GEL
income_tax  (20%)     =  200 GEL  → CR 3310
net_salary            =  800 GEL  → CR 3300

[Employer side — ცალკე journal entry:]
social_ins  (2%)      =   20 GEL  → CR 3320
total employer cost   = 1020 GEL  → DR 8100
```

> ⚠️ **v2.0 FIX:** v1.0-ში `payroll_items`-ში სოციალური დაზღვევა **არ იყო**.
> ახლა: `social_ins_rate` + `social_ins_amount` + `compute_payroll_item()` trigger.

**ხელფასის ჟურნალის ჩანაწერი:**
```
DR 8100  ხელფასი + სოც. დ-ვა (employer)   1020
  CR 3300  ხელფასი — გადასახდელი            800
  CR 3310  საშემ. გადასახ. (20%)             200
  CR 3320  სოც. დ-ვა (2% employer)           20
```

---

## 4. საბუღალტრო ჟურნალი

### TypeScript Interface — Journal

```typescript
interface JournalEntry {
  id: string
  entry_number: string          // "JE-2026-000001" — auto-generated
  entry_date: string            // ISO date
  description: string
  reference_type:
    | 'INVOICE' | 'PURCHASE' | 'PAYMENT' | 'PAYROLL'
    | 'ADJUSTMENT' | 'OPENING' | 'DEPRECIATION' | 'MANUAL' | 'VAT'
  reference_id?: string
  fiscal_period_id: string
  status: 'DRAFT' | 'POSTED' | 'REVERSED'
  reversed_by?: string
  created_by: string
  posted_by?: string
  posted_at?: string
  lines: JournalLine[]
}

interface JournalLine {
  id: string
  journal_entry_id: string
  account_id: string
  account_code: string          // e.g. "6100"
  account_name: string
  debit: number                 // GEL — either debit > 0 OR credit > 0
  credit: number
  currency: 'GEL' | 'USD' | 'EUR'
  original_amount?: number
  exchange_rate?: number
  description?: string
  cost_center?: 'ONLINE_SALES' | 'COD_SALES' | 'ADMIN' | 'LOGISTICS' | 'MARKETING' | 'IT'
}

// DB CONSTRAINT: Σ debit == Σ credit (enforced in check_balance_on_post trigger)
// DB CONSTRAINT: debit > 0 XOR credit > 0 per line (chk_debit_xor_credit)
```

---

## 5. გაყიდვები — შემოსავლები

```typescript
interface Invoice {
  id: string
  invoice_number: string        // auto-generated by DB trigger
  invoice_type: 'B2C' | 'B2B' | 'REFUND' | 'PROFORMA'
  invoice_date: string
  due_date?: string
  customer_name: string
  customer_email?: string
  customer_phone?: string
  customer_tin?: string         // B2B-ისთვის სავალდებულო
  customer_address?: string
  order_id?: string
  subtotal: number              // VAT-ის გარეშე
  vat_rate: number              // default: 18.00
  vat_amount: number
  discount_amount: number       // default: 0
  total_amount: number          // subtotal + vat_amount - discount_amount
  currency: 'GEL' | 'USD' | 'EUR'
  exchange_rate: number
  payment_method?: 'CARD_BOG' | 'CARD_TBC' | 'CREDO' | 'CASH' | 'BANK_TRANSFER'
  payment_status: 'PENDING' | 'PARTIAL' | 'PAID' | 'OVERDUE' | 'CANCELLED' | 'REFUNDED'
  paid_amount: number
  paid_at?: string
  rsge_status?: 'NOT_SENT' | 'SENT' | 'CONFIRMED' | 'CANCELLED'
  rsge_invoice_id?: string
  journal_entry_id?: string
  fiscal_period_id?: string
  items: InvoiceItem[]
}

interface InvoiceItem {
  id: string
  invoice_id: string
  product_id?: string
  product_name: string
  product_sku?: string
  quantity: number
  unit_price: number            // VAT-ის გარეშე
  vat_rate: number
  vat_amount: number
  line_total: number            // VAT-ით
  cost_price?: number           // COGS-ისთვის
}
```

---

## 6. სასაწყობო — მარაგები

```typescript
type InventoryTransactionType =
  | 'PURCHASE_IN'     // შესყიდვიდან შემოსვლა
  | 'SALE_OUT'        // გაყიდვაზე გასვლა
  | 'RETURN_IN'       // დაბრუნება მომხმარებლისგან
  | 'RETURN_OUT'      // დაბრუნება მომწოდებელთან
  | 'ADJUSTMENT_IN'   // ინვენტ. + კორექცია
  | 'ADJUSTMENT_OUT'  // ინვენტ. − კორექცია
  | 'WRITE_OFF'       // ჩამოწერა (დაზიანება)
  | 'TRANSFER'        // სასაწყობოებს შორის
  | 'OPENING'         // საწყისი ნაშთი

interface InventoryTransaction {
  id: string
  product_id: string
  transaction_type: InventoryTransactionType
  quantity: number
  unit_cost?: number
  total_cost?: number
  reference_type?: string
  reference_id?: string
  journal_entry_id?: string
  fiscal_period_id?: string
  notes?: string
}

interface StockLevel {
  product_id: string
  quantity_on_hand: number
  quantity_reserved: number
  quantity_available: number    // GENERATED: on_hand - reserved
  avg_cost: number
  total_cost_value: number
  reorder_point: number
  updated_at: string
}

interface FIFOCostLayer {
  id: string
  product_id: string
  po_id?: string
  purchase_date: string
  quantity_original: number
  quantity_remaining: number    // decreases on each SALE_OUT
  unit_cost: number
}
```

---

## 7. შესყიდვები — მომწოდებლები

```typescript
interface Supplier {
  id: string
  supplier_code: string         // "SUP-001"
  name: string
  tin?: string
  contact_person?: string
  email?: string
  phone?: string
  address?: string
  country: string               // default: 'GE'
  payment_terms: number         // days
  currency: string
  account_id?: string           // → account 3100
  is_active: boolean
}

interface PurchaseOrder {
  id: string
  po_number: string             // "PO-2026-000001" — auto-generated
  supplier_id: string
  order_date: string
  expected_date?: string
  status:
    | 'DRAFT' | 'SENT'
    | 'PARTIALLY_RECEIVED' | 'FULLY_RECEIVED'
    | 'INVOICED' | 'PAID' | 'CANCELLED'
  subtotal: number
  vat_amount: number
  total_amount: number
  currency: string
  items: PurchaseOrderItem[]
}

interface PurchaseOrderItem {
  id: string
  po_id: string
  product_id?: string
  product_name: string
  product_sku?: string
  quantity_ordered: number
  quantity_received: number     // updated by GRN trigger
  unit_cost: number
  vat_rate: number
  vat_amount: number
  line_total: number
}

// NEW v2.0
interface GoodsReceipt {
  id: string
  grn_number: string            // "GRN-2026-000001" — auto-generated
  po_id: string
  supplier_id: string
  receipt_date: string
  status: 'DRAFT' | 'CONFIRMED' | 'CANCELLED'
  items: GoodsReceiptItem[]
}

interface GoodsReceiptItem {
  id: string
  grn_id: string
  po_item_id?: string
  product_id?: string
  product_name: string
  quantity_received: number
  unit_cost: number
}

interface SupplierInvoice {
  id: string
  sinv_number: string           // "SINV-2026-000001" — auto-generated (v2.0 fix)
  supplier_id: string
  po_id?: string
  invoice_date: string
  due_date?: string
  subtotal: number
  vat_amount: number
  total_amount: number
  currency: string
  payment_status: 'PENDING' | 'PARTIAL' | 'PAID' | 'OVERDUE'
  paid_amount: number
  journal_entry_id?: string
  rsge_invoice_id?: string
}
```

---

## 8. ДДС / დღგ მოდული

```typescript
interface VATTransaction {
  id: string
  vat_type: 'OUTPUT' | 'INPUT'
  transaction_date: string
  fiscal_period_id: string
  reference_type?: 'INVOICE' | 'SUPPLIER_INVOICE' | 'ADJUSTMENT'
  reference_id?: string
  taxable_amount: number        // VAT-ის გარეშე
  vat_rate: number              // 18.00
  vat_amount: number
  counterparty_tin?: string
  journal_entry_id?: string
}

interface VATDeclaration {
  id: string
  fiscal_period_id: string
  output_taxable: number
  output_vat: number            // → DR 3200 settlement
  input_taxable: number
  input_vat: number             // → CR 1400 settlement
  net_vat_payable: number       // GENERATED: output_vat - input_vat
  status: 'DRAFT' | 'SUBMITTED' | 'ACCEPTED' | 'REJECTED'
  submitted_at?: string
  rsge_reference?: string       // RS.ge confirmation code
}
```

---

## 9. RS.ge ინტეგრაცია

### SOAP API კლიენტი (server.ts)

```typescript
import soap from 'soap'

const RSGE_WSDL = process.env.NODE_ENV === 'production'
  ? 'https://eservices.rs.ge/eGateway/webgateway.svc?wsdl'
  : 'https://sandbox.eservices.rs.ge/eGateway/webgateway.svc?wsdl'

interface RSGEInvoice {
  InvoiceNumber: string         // EINV-2026-000001
  InvoiceDate: string           // ISO 8601
  SupplierTIN: string           // KALE GROUP-ის ს/კ
  BuyerTIN: string              // მყიდველის ს/კ
  TotalWithoutVAT: number
  TotalVAT: number
  TotalWithVAT: number
  Items: RSGEInvoiceItem[]
  Status: 'DRAFT' | 'ACTIVE'
}

interface RSGEInvoiceItem {
  Name: string
  Quantity: number
  UnitPrice: number
  TotalPrice: number
  VATRate: number
  VATAmount: number
}

// B2B ინვოისის გაგზავნა
router.post('/api/rsge/einvoice', async (req, res) => {
  const { invoice_id } = req.body
  const client = await soap.createClientAsync(RSGE_WSDL)
  // 1. Load invoice from Supabase
  // 2. Map to RSGEInvoice format
  // 3. client.SaveInvoice(rsgePayload)
  // 4. Update invoices.rsge_status = 'SENT', rsge_invoice_id = response.InvoiceID
})

// ДДС დეკლარაციის გაგზავნა (ყოველი თვის 15-მდე)
router.post('/api/rsge/vat-declaration', async (req, res) => {
  // client.SubmitVATDeclaration(declarationData)
})

// ელ. სასაქ. ზედნადები (B2B მიწოდებისთვის)
router.post('/api/rsge/waybill', async (req, res) => {
  // client.SaveWaybill(waybillData)
})
```

---

## 10. ფინანსური ანგარიშგება

### 10.1 მოგება-ზარალი (v_profit_loss)
```
KALE GROUP — მოგება-ზარალი
პერიოდი: [DATE_FROM] — [DATE_TO]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
შემოსავლები:
  გაყიდვ. შემოს. — ავეჯი  [6100]    ____
  გაყიდვ. შემოს. — შეკვ.   [6110]    ____
  მიწ./სერვ.               [6200]    ____
  სხვა                     [6900]    ____
                           ──────────────
  სულ შემოსავალი (Revenue)            ____

გაყ. საქ. ღირებულება (COGS):
  COGS                     [7100]   (   )
  პირდ. მიწ. ხარჯი          [7200]   (   )
                           ──────────────
  მთლ. მოგება (Gross Profit)          ____
  მთლ. მოგება %                        XX%

საოპ. ხარჯები (OpEx):
  ხელფ. + სოც.             [8100]   (   )
  ქირა                     [8200]   (   )
  მარკეტინგი               [8300]   (   )
  IT/ჰოსტ.                 [8400]   (   )
  ბანკ. საკომ.              [8500]   (   )
  მიწოდება                 [8600]   (   )
  ამორტ.                   [8700]   (   )
  სხვა                     [8800]   (   )
                           ──────────────
  სულ საოპ. ხარჯი (OPEX)            (   )

  EBITDA                              ____
  ამორტ. გამოქვით.         [8700]   (   )
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  EBIT                                ____
  ბანკ. % ხარჯი                      (   )
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  წმ. მოგება / ზარალი                ____
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### 10.2 ბალანსი (v_balance_sheet)
```
KALE GROUP — ბალანსი
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
აქტივები              ვალდ. + კაპიტ.
──────────────────    ─────────────────
მიმდ. აქტ.:           მიმდ. ვალდ.:
  სალარო+ბანკი          კრედ. დავ.
  დებ. დავ.             ДДС გადასახ.
  ДДС ჩასათვ.           ხელფ. გადასახ.
  მარაგი                სოც. გადასახ. ←NEW
  სხვა                  მოკ. სესხი
──────────────────    ─────────────────
გრძ. აქტ.:            კაპიტალი:
  ძირ. საშ. (net)       საწ. კაპ.
  არამ. აქტ. (net)      გაუნ. მოგება
                        მიმდ. P&L
──────────────────    ─────────────────
სულ აქტ. == სულ ვალდ. + კაპ.  ✓
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### 10.3 ფულადი ნაკადი (v_cash_flow) ← NEW v2.0
```
საოპ. საქ.:
  + შემოსავალი (class 6)
  − COGS (class 7)
  − OPEX (class 8)
─────────────────────────
  სულ Operating CF

საინვ. საქ.:
  − ძირ. საშ. შეძენა (class 2)
─────────────────────────
  სულ Investing CF

საფინ. საქ.:
  ± სესხები (3400, 4100)
─────────────────────────
  სულ Financing CF

━━━━━━━━━━━━━━━━━━━━━━━━
  წმ. CF = A + B + C
```

### 10.4 Trial Balance (v_trial_balance)
```
ანგარიში | Total Dr | Total Cr | Balance
Σ Debit == Σ Credit → ✅ balanced
```

---

## 11. HR — ხელფასი

```typescript
interface Employee {
  id: string
  employee_code: string         // "EMP-001" — auto-generated
  full_name: string
  personal_id?: string
  position: string
  department: 'SALES' | 'ADMIN' | 'LOGISTICS' | 'IT' | 'MANAGEMENT'
  gross_salary: number
  hire_date: string
  termination_date?: string
  status: 'ACTIVE' | 'INACTIVE'
  bank_account?: string
  email?: string
  phone?: string
}

interface PayrollRun {
  id: string
  run_code: string              // "PR-2026-01" — auto-generated (v2.0 fix)
  period_month: number          // 1-12
  period_year: number
  fiscal_period_id?: string
  status: 'DRAFT' | 'PROCESSED' | 'PAID'
  total_gross: number
  total_tax: number
  total_social_ins: number      // NEW v2.0
  total_net: number
  journal_entry_id?: string
  items: PayrollItem[]
}

interface PayrollItem {
  id: string
  payroll_run_id: string
  employee_id: string
  gross_salary: number
  income_tax_rate: number       // default: 20.00
  income_tax: number            // COMPUTED: gross × income_tax_rate/100
  social_ins_rate: number       // default: 2.00 — NEW v2.0
  social_ins_amount: number     // COMPUTED: gross × social_ins_rate/100 — NEW v2.0
  net_salary: number            // COMPUTED: gross - income_tax
  paid_date?: string
}

// All computations are done by DB trigger: compute_payroll_item()
// Frontend sends: gross_salary, income_tax_rate, social_ins_rate
// DB fills: income_tax, social_ins_amount, net_salary
```

---

## 12. Admin Panel — UI სქემა

```
/admin/accounting/
├── dashboard/          ← KPI ბარათები (get_accounting_kpis function)
├── journal/
│   ├── list            ← filter: period, type, status, reference
│   ├── new             ← dynamic debit/credit lines + account picker
│   └── [id]/           ← detail view + print + reverse
├── invoices/
│   ├── list            ← B2C + B2B + PROFORMA + REFUND
│   ├── [id]/           ← detail + RS.ge status + PDF download
│   └── new             ← manual B2B invoice form
├── purchases/
│   ├── suppliers/      ← CRUD
│   ├── orders/         ← PO list + form
│   ├── receipts/       ← GRN list + confirm (NEW v2.0)
│   └── invoices/       ← Supplier invoice list
├── inventory/
│   ├── levels/         ← stock levels + reorder alerts
│   ├── transactions/   ← full history
│   ├── fifo-layers/    ← cost layer inspector
│   └── adjustment/     ← inventory count form
├── vat/
│   ├── transactions/   ← Input/Output list
│   └── declaration/    ← monthly declaration + RS.ge submit
├── hr/
│   ├── employees/      ← CRUD
│   └── payroll/        ← run list + payslip PDF
├── reports/
│   ├── pl/             ← P&L + period picker + PDF/Excel export
│   ├── balance-sheet/  ← Balance Sheet
│   ├── cash-flow/      ← Cash Flow (NEW v2.0)
│   ├── trial-balance/  ← Trial Balance
│   ├── vat-report/     ← VAT summary
│   ├── ar-aging/       ← Receivables aging
│   └── ap-aging/       ← Payables aging (NEW v2.0)
└── audit/
    └── log/            ← Audit trail viewer (NEW v2.0, admin only)
```

### Dashboard KPI Cards:
```typescript
// Powered by: SELECT get_accounting_kpis(year, month)
const accountingKPIs = [
  { label: 'ყოველთვ. შემოსავ.',   key: 'revenue',         color: 'green',  icon: TrendingUp },
  { label: 'COGS',                 key: 'cogs',            color: 'orange', icon: Package },
  { label: 'მთლ. მოგება %',        key: 'gross_margin',   color: 'blue',   icon: Percent },
  { label: 'წმ. მოგება',           key: 'net_profit',     color: 'purple', icon: DollarSign },
  { label: 'ДДС გადასახდ.',        key: 'vat_payable',    color: 'red',    icon: Receipt },
  { label: 'კრედ. დავ. (AP)',      key: 'ap_balance',     color: 'yellow', icon: FileText },
  { label: 'მარაგის ღირებ.',       key: 'inventory_value',color: 'teal',   icon: Warehouse },
  { label: 'ნაღდი + ბანკი',        key: 'cash_balance',   color: 'green',  icon: Wallet },
]
```

---

## 13. TypeScript Types

### Accounting KPIs
```typescript
interface AccountingKPIs {
  revenue: number
  cogs: number
  opex: number
  gross_profit: number
  gross_margin_pct: number      // (revenue - cogs) / revenue × 100
  net_profit: number
  vat_payable: number
  cash_balance: number
  inventory_value: number
  ap_balance: number
  ar_balance: number
}
```

### Audit Log
```typescript
interface AuditLogEntry {
  id: string
  table_name: string
  record_id: string
  action: 'INSERT' | 'UPDATE' | 'DELETE'
  old_data?: Record<string, unknown>
  new_data?: Record<string, unknown>
  changed_by?: string
  changed_at: string
  ip_address?: string
}
```

### Account
```typescript
interface Account {
  id: string
  code: string                  // "6100"
  name_ka: string
  name_en?: string
  account_type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE' | 'COGS'
  account_class: '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8'
  normal_balance: 'DEBIT' | 'CREDIT'
  parent_id?: string
  is_active: boolean
  is_system: boolean
}
```

### Fiscal Period
```typescript
interface FiscalPeriod {
  id: string
  name: string                  // "2026 - იანვარი"
  period_year: number
  period_month: number
  start_date: string
  end_date: string
  status: 'OPEN' | 'CLOSED' | 'LOCKED'
  closed_by?: string
  closed_at?: string
}
```

---

## 14. API Endpoints

```
-- Journal
POST   /api/accounting/journal-entries          ← ახ. DRAFT entry
GET    /api/accounting/journal-entries          ← list (filter: period, type, status)
GET    /api/accounting/journal-entries/:id
PATCH  /api/accounting/journal-entries/:id      ← status: POSTED | REVERSED

-- Reports
GET    /api/accounting/trial-balance            ← ?year=2026
GET    /api/accounting/balance-sheet            ← ?year=2026
GET    /api/accounting/profit-loss              ← ?year=2026&month=4
GET    /api/accounting/cash-flow                ← ?year=2026
GET    /api/accounting/vat-report               ← ?year=2026&month=4
GET    /api/accounting/kpis                     ← ?year=2026&month=4

-- Invoices
POST   /api/invoices
GET    /api/invoices/:id/pdf
POST   /api/invoices/:id/send-rsge

-- Purchases
POST   /api/purchases/orders
POST   /api/purchases/receipts                  ← GRN create (NEW v2.0)
PATCH  /api/purchases/receipts/:id/confirm      ← triggers 3-way match
POST   /api/purchases/supplier-invoices

-- Inventory
POST   /api/inventory/transactions
GET    /api/inventory/levels
GET    /api/inventory/fifo-layers/:product_id
POST   /api/inventory/adjustment

-- Payroll
POST   /api/payroll/run                         ← creates PayrollRun + items
GET    /api/payroll/runs
GET    /api/payroll/runs/:id/payslips

-- VAT / RS.ge
POST   /api/rsge/einvoice
POST   /api/rsge/vat-declaration
POST   /api/rsge/waybill

-- Audit
GET    /api/accounting/audit-log                ← admin only
```

---

## 15. უსაფრთხოება და RBAC

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
    audit:      ['read'],
    accounts:   ['create', 'read', 'update', 'delete_non_system'],
  },
  accountant: {
    journal:    ['create', 'read', 'post'],
    invoices:   ['read', 'send'],
    purchases:  ['create', 'read'],
    inventory:  ['read'],
    reports:    ['read', 'export'],
    payroll:    ['create', 'read', 'process'],
    vat:        ['read', 'submit'],
    audit:      [],     // no access
    accounts:   ['read'],
  },
  consultant: {
    invoices:   ['read'],
    inventory:  ['read'],
    reports:    ['read'],
    purchases:  ['read'],
    audit:      [],
    accounts:   ['read'],
  },
  guest: {
    // no accounting access — all tables blocked by RLS
  },
}
```

> ⚠️ **v2.0 FIX:** v1.0-ში RLS პოლიტიკა მხოლოდ 6 ცხრილზე იყო. 8 ცხრილი
> RLS-ით ჩაკეტილი იყო **პოლიტიკის გარეშე** — ანუ authenticated user-ებიც
> ვერ კითხულობდნენ `journal_lines`, `invoice_items`, `suppliers` და სხვა.
> ახლა ყველა 22 ცხრილს აქვს სრული CRUD პოლიტიკა.

---

## 16. v2.0 ცვლილებები (Changelog)

| # | ცვლილება | კლასიფიკაცია |
|---|----------|--------------|
| 1 | Account `1330` (Transport Purchase Cost) დამატება | BUG FIX |
| 2 | Account `3320` (Social Insurance Payable 2%) დამატება | BUG FIX |
| 3 | `payroll_items`: `social_ins_rate`, `social_ins_amount` დამატება | BUG FIX |
| 4 | `compute_payroll_item()` trigger — ავტო-გამოთვლა | NEW |
| 5 | `sync_stock_levels()` trigger on `inventory_transactions` | BUG FIX |
| 6 | `goods_receipts` + `goods_receipt_items` ცხრილები | NEW |
| 7 | `sync_po_received_on_grn()` trigger — 3-way matching | NEW |
| 8 | `sinv_number` UNIQUE constraint + `generate_sinv_number()` trigger | BUG FIX |
| 9 | `payroll_runs.run_code` ავტო-გენერაცია trigger | BUG FIX |
| 10 | `v_cash_flow` view | NEW |
| 11 | `v_ap_aging` view | NEW |
| 12 | `v_ar_aging` — NULL `due_date` fix | BUG FIX |
| 13 | `audit_log` ცხრილი + `audit_trigger_func()` | NEW |
| 14 | RLS პოლიტიკები ყველა 22 ცხრილზე (v1.0-ში 6 ცხრილი იყო დაფარული) | BUG FIX |
| 15 | `current_user_role()` helper function RLS-ისთვის | NEW |
| 16 | `check_invoice_totals()` trigger — consistency check | NEW |
| 17 | `create_vat_from_invoice()` — PROFORMA/REFUND skip | BUG FIX |
| 18 | `create_vat_from_supplier_invoice()` trigger — Input VAT | NEW |
| 19 | `calc_vat()` helper function | NEW |
| 20 | `get_accounting_kpis()` dashboard function | NEW |
| 21 | `seed_fiscal_year(year)` function — multi-year support | NEW |
| 22 | `generate_employee_code()` trigger | NEW |
| 23 | `updated_at` triggers on all mutable tables | BUG FIX |
| 24 | `GRANT` statements — service_role + authenticated | BUG FIX |
| 25 | `check_journal_balance()` dead code removed | CLEANUP |
| 26 | `invoice_b2b_seq`, `invoice_pro_seq` — PROFORMA sequence | NEW |
| 27 | `calculate_fifo_cogs()` — now actually UPDATEs cost layers | BUG FIX |

---

## 🗓️ Implementation Roadmap

```
Phase 3A — Foundation ✅
  ✅ ანგარიშთა გეგმა + SQL Schema v2.0
  ✅ Journal Entry CRUD + ვალიდაცია
  ✅ Fiscal Period მართვა + seed helper
  ✅ Chart of Accounts UI

Phase 3B — Sales & Invoicing ✅
  ✅ Invoice ავტო-შექმნა Order-ზე
  ✅ BOG/TBC Webhook → ავტო Journal Entry
  ✅ PDF Invoice (ქართული UTF-8)
  ✅ B2B Invoice ფორმა

Phase 3C — Inventory & COGS ✅
  ✅ FIFO Layer სისტემა (calculate_fifo_cogs + layer UPDATE)
  ✅ stock_levels ავტო-სინქ (sync_stock_levels trigger)
  ✅ GRN + 3-way matching
  ✅ Reorder Alert

Phase 3D — VAT & RS.ge ✅
  ✅ ДДС ავტო-კალკულაცია (triggers: output + input)
  ✅ ДДС დეკლარაციის ფორმა
  ✅ RS.ge SOAP API კლიენტი (Sandbox)

Phase 3E — Reports & Payroll ✅
  ✅ P&L, Balance Sheet, Cash Flow (v_cash_flow NEW)
  ✅ Trial Balance, AR/AP Aging
  ✅ HR + Payroll module (with social insurance)
  ✅ Excel/PDF export

Phase 3F — Production 🔄
  🔄 RS.ge Production გაშვება
  🔄 ДДС პირველი გაგზავნა
  ✅ Audit log (audit_log + triggers)
```

---

*KALE GROUP Accounting Module v2.0.0 — © 2026*
*Built with: Supabase PostgreSQL + React 19 + Node.js/Express*
*Schema: `KALE_ACCOUNTING_SCHEMA_v2.sql`*
