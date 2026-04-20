# 🏺 KALE GROUP — Premium Furniture E-commerce & ERP Platform

**KALE GROUP** არის მაღალი კლასის ონლაინ მაღაზია, რომელიც ორიენტირებულია პრემიუმ ხარისხის ავეჯის გაყიდვასა და ინდივიდუალურ შეკვეთებზე. პლატფორმა აერთიანებს დახვეწილ დიზაინს, სრულყოფილ ERP საბუღალტრო სისტემას, წარმოების მართვას (BOM, Cutting Plans, Offcut Management), თანამედროვე ტექნოლოგიებსა და მომხმარებელზე მორგებულ ფუნქციონალს.

> **Last Audit & Fixes:** 2026-04-20 (v4.8) — Senior AI Architect (Backend Architecture Hardening & Database Hygiene)

---

## 🚀 ტექნოლოგიური სთეკი (Tech Stack)

### Frontend (User Interface & Experience)
- **Framework:** [React 19](https://react.dev/) + [Vite](https://vitejs.dev/)
- **Styling:** [Tailwind CSS v4](https://tailwindcss.com/) + [Framer Motion](https://www.framer.com/motion/) (პრემიუმ ანიმაციები)
- **Design System:** "KaleAdmin Modern" — ღია/თეთრი ფონი, ფერადი გრადიენტის KPI ბარათები (მწვანე, ლურჯი, იისფერი, ნარინჯისფერი), მუქი navy sidebar მწვანე აქცენტებით
- **PWA (Progressive Web App):** `vite-plugin-pwa` ინტეგრაცია offline მხარდაჭერისა და აპლიკაციის სახით ინსტალაციისთვის
- **State Management:** React Context API (Cart, Wishlist, Language, Auth)
- **Internationalization (i18n):** `i18next` + `react-i18next` (სრული მულტი-ენოვანი მხარდაჭერა — GEO, ENG, RUS)
- **SEO & Head Management:** React Helmet Async (დინამიური მეტა ტეგები)

### Backend & API
- **Server:** [Node.js](https://nodejs.org/) + [Express](https://expressjs.com/) (`server.ts` — 1788 ხაზი, მოდულარიზაცია საჭირო)
- **Deployment:** Vercel Serverless Functions (`api/index.ts` — production endpoint)
- **AI Integration:** [Google Gemini AI API](https://ai.google.dev/) (Backend Proxy — API Key server-side only)
  - **KALE AI Expert:** ჩატ-ასისტენტი ბაზიდან live პროდუქტის კონტექსტით (ზომები, ფერები, გარანტია, ფასდაკლება, შოურუმი)
  - **AI Room Designer:** Imagen 3 (`imagen-3.0-generate-001`) + Gemini 1.5 Pro Vision — ორი-ეტაპიანი ოთახის სტილის ანალიზი + ფოტორეალისტური რენდერი
  - **Admin Intelligence:** Gemini-ზე დაფუძნებული, RBAC-სენსიტიური შიდა ასისტენტი — COO Mode (Admin), CFO Auditor Mode (Accountant)
- **Payment Gateways:** BOG (Bank of Georgia), TBC (tpay), Credo Bank — Webhook ინტეგრაცია + HMAC-SHA256 ვერიფიკაცია
- **Auto Accounting Engine:** `processSuccessfulOrder()` — Webhook → Invoice → Journal Entry → COGS → VAT → Inventory
- **Estonian Tax Engine:** 15%-იანი მოგების გადასახადი დივიდენდების გაცემისას (`Net / 0.85 * 0.15`)
- **Payroll Automation:** ხელფასების დარიცხვა + 20% საშემოსავლო გადასახადი

### Database, Auth & Security
- **BaaS:** [Supabase](https://supabase.com/) — Project ID: `cjvhoadkvjqsmoiypndw`
- **Schema:** PostgreSQL — **42 ცხრილი**, ყველა RLS ჩართული, 59 მიგრაცია
- **Authentication:** Supabase Auth (JWT + Row Level Security)
- **Role System:** `admin`, `consultant`, `accountant`, `guest` — profile-based RBAC
- **Security Posture:** `.env` არასოდეს ჩაკომიტებულა Git ისტორიაში ✅

---

## 📊 მონაცემთა ბაზის სრული სქემა (42 ცხრილი — Live Supabase)

### Core E-commerce

| ცხრილი | ჩანაწერები | აღწერა |
|--------|-----------|--------|
| `products` | 10 | პროდუქტების კატალოგი (ფასი, ფასდაკლება, ფერები, ზომები) |
| `categories` | 6 | პროდუქტის კატეგორიები |
| `orders` | 12 | მომხმარებლის შეკვეთები (website + showroom) |
| `order_items` | 15 | შეკვეთის პროდუქტები |
| `payments` | 5 | BOG/TBC/Credo გადახდები (status tracking) |
| `contact_messages` | 0 | კონტაქტ ფორმა |
| `newsletter_subscribers` | 0 | სიახლეების გამოწერა |

### Double-Entry Accounting (ორმაგი ჩაწერის ბუღალტერია)

| ცხრილი | ჩანაწერები | აღწერა |
|--------|-----------|--------|
| `accounts` | 49 | Chart of Accounts (ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE, COGS) |
| `journal_entries` | 14 | საბუღალტრო გატარებები (DRAFT → POSTED → REVERSED) |
| `journal_lines` | 25 | Debit/Credit ხაზები (multi-currency: GEL, USD, EUR) |
| `fiscal_periods` | 12 | 2026 Jan-Dec ფისკალური პერიოდები |
| `invoices` | 0 | გაყიდვის ინვოისები (B2C, B2B, REFUND, PROFORMA) |
| `invoice_items` | 0 | ინვოისის ხაზები |
| `accounting_entries` | 0 | Legacy საბუღალტრო ჩანაწერები |

### Procurement & Inventory (შესყიდვები და ინვენტარი)

| ცხრილი | ჩანაწერები | აღწერა |
|--------|-----------|--------|
| `suppliers` | 1 | მომწოდებლები (TIN, payment terms, currency) |
| `purchase_orders` | 0 | შესყიდვის ორდერები |
| `purchase_order_items` | 0 | PO ხაზები |
| `goods_receipts` | 0 | მიღების აქტები (GRN) |
| `goods_receipt_items` | 0 | GRN ხაზები |
| `supplier_invoices` | 0 | მომწოდებლის ინვოისები |
| `inventory_transactions` | 0 | საწყობის ტრანზაქციები (FIFO) |
| `inventory_cost_layers` | 0 | FIFO Cost Layers |
| `stock_levels` | 0 | მიმდინარე მარაგები |

### Manufacturing (წარმოების მართვა)

| ცხრილი | ჩანაწერები | აღწერა |
|--------|-----------|--------|
| `raw_materials` | 1 | ნედლეული (sheet, edge_band, hardware, consumable) |
| `production_recipes` | 1 | BOM — Bill of Materials |
| `recipe_ingredients` | 0 | რეცეპტის ინგრედიენტები (ზომები, grain direction) |
| `recipe_ingredient_edge_bands` | 0 | კრომკა/კიდის ბანდი |
| `cutting_plans` | 0 | ჭრის გეგმები (CutRite/Bazis import) |
| `material_offcuts` | 1 | ნარჩენი ფილები — QR ბარკოდი, quality grade, warehouse zone |
| `production_waste_actuals` | 0 | ფაქტიური ნარჩენები (recovery rate, material efficiency) |

### Tax & Compliance (გადასახადები)

| ცხრილი | ჩანაწერები | აღწერა |
|--------|-----------|--------|
| `vat_transactions` | 0 | დღგ ტრანზაქციები (OUTPUT/INPUT) |
| `vat_declarations` | 0 | დღგ დეკლარაციები |
| `vat_returns` | 0 | დღგ ანგარიშგება |
| `exchange_rates` | 0 | სავალუტო კურსები (NBG) |

### RS.GE Integration (ელექტრონული ანგარიშფაქტურა)

| ცხრილი | ჩანაწერები | აღწერა |
|--------|-----------|--------|
| `rs_invoices` | 0 | RS.GE ინვოისები |
| `rs_waybills` | 0 | RS.GE ზედნადებები |
| `rs_invoice_errors` | 0 | RS.GE შეცდომების ლოგი |
| `rs_incoming_waybills` | 0 | შემომავალი ზედნადებები |
| `rsge_sync_log` | 0 | RS.GE სინქრონიზაციის ჟურნალი |

### HR & Payroll (კადრები და ხელფასი)

| ცხრილი | ჩანაწერები | აღწერა |
|--------|-----------|--------|
| `employees` | 1 | თანამშრომლები (department, salary, bank account) |
| `payroll_runs` | 2 | ხელფასის გაშვებები |
| `payroll_items` | 0 | ხელფასის ხაზები |
| `fixed_assets` | 0 | ძირითადი საშუალებები (ამორტიზაცია) |

### Auth, Audit & Settings

| ცხრილი | ჩანაწერები | აღწერა |
|--------|-----------|--------|
| `profiles` | 1 | მომხმარებლის პროფილები (role-based) |
| `invitations` | 1 | მოწვევები (token + expiry) |
| `audit_log` | 28 | ყველა ცვლილების ჟურნალი (old_data → new_data) |
| `company_settings` | 3 | კომპანიის კონფიგურაცია (JSONB) |

---

## ✨ ძირითადი ფუნქციონალი (Core Features)

### 1. მომხმარებლის ინტერფეისი (Storefront)
- **პრემიუმ კატალოგი:** პროდუქციის ფილტრაცია კატეგორიის, მასალისა და ფერის მიხედვით
- **ჭკვიანი კალათა (Smart Cart):** Persistent (Local Storage) — ავტომატური ფასდაკლების კალკულაცია
- **მულტილინგვალური სისტემა:** მყისიერი თარგმნა 3 ენაზე (ქართული, English, Русский)
- **AI ჩეთ-ასისტენტი (KALE AI Expert):** Gemini 2.5 Flash — Live Inventory Context. იცის პროდუქტის ზომები, ფასდაკლებები, ფერები, გარანტია, შოურუმის ადგილმდებარეობა, განვადების პირობები
- **AI Room Designer:** ოთახის ფოტოს ატვირთვა → Gemini Vision ანალიზი → Imagen 3 ფოტორეალისტური ავეჯ-რენდერი
- **Admin Intelligence:** ადმინ-პანელის RBAC AI ასისტენტი — Markdown ცხრილების დახატვა + Live DB სტატისტიკა
- **Server-Side Price Validation:** Client-side ფასის manipulation-ის პრევენცია

### 2. Automated Accounting Pipeline

გადახდის დადასტურებისას (Webhook Callback) სისტემა ავტომატურად ასრულებს:

1. **Webhook ვერიფიკაცია** → HMAC-SHA256 Signature + `timingSafeEqual`
2. **შეკვეთის დადასტურება** → `status: confirmed`, `payment_status: paid`
3. **გაყიდვების ინვოისის გენერაცია** → `invoices` ცხრილი (18% VAT ჩათვლით)
4. **ორმაგი საბუღალტრო გატარება** → `journal_entries` + `journal_lines`:
   - 📥 **Debit:** Cash/Bank + COGS
   - 📤 **Credit:** Sales Revenue + VAT Payable + Inventory
5. **საწყობიდან ჩამოწერა** → `inventory_transactions` (FIFO cost layer)

### 3. ადმინ პანელი & მოდულები

| მოდული | ფუნქციონალი |
|--------|------------|
| 📊 დეშბორდი | KPI ბარათები — Revenue, Gross Profit, VAT, Inventory Value |
| 📒 ჟურნალი | Double-entry ჩანაწერები — DRAFT / POSTED / REVERSED |
| 🧾 ინვოისები | Sales & Purchase ინვოისები + RS.GE B2B ინტეგრაცია |
| 📦 ინვენტარი | Stock Levels, FIFO Layers, Reorder Points |
| 🛒 შესყიდვები | Suppliers CRUD, Purchase Orders, GRN (3-way match) |
| 📈 რეპორტები | P&L, Balance Sheet, Trial Balance (Date Range + CSV Export) |
| 🏛 დღგ | VAT Transactions, Summary, Declarations |
| 💎 გადასახადი | ესტონური მოდელი — Profit Tax 15% |
| 👥 HR/ხელფასი | Employees, Payroll Runs (Income Tax 20%), Slips |
| 🏭 წარმოება | BOM, Production Recipes, Cutting Plans, Offcut Logger |
| 🔁 დაბრუნება | RMA — Refused / Damaged / Resellable ავტო-გატარებები |
| 🛡 აუდიტი | `audit_log` — ვინ/როდის/რა ცვლილება (28 ჩანაწერი live) |
| ⚙️ კონფიგურაცია | Company Settings (JSONB), Exchange Rates |

### 4. Manufacturing & Material Management

- **Production Recipes (BOM):** მზა პროდუქტი → ინგრედიენტები → ნედლეული
- **Cutting Plans:** CutRite/Bazis import, sheets required, planned efficiency %
- **Offcut Management:** QR-coded offcuts — status tracking, reservation system, auto-expiry
- **Waste Analytics:** Theoretical vs actual consumption, recovery rate, material efficiency
- **Edge Band Tracking:** კრომკის მართვა ნაჭრის ყოველ კიდეზე (top/bottom/left/right)

---

## 🛡 უსაფრთხოების სტატუსი (Security Posture — 2026-04-16 v4.6)

### ✅ დადასტურებული — გამართული

| # | კომპონენტი | სტატუსი |
|---|-----------|---------|
| 1 | `.env` Git ისტორიაში | **არასოდეს ჩაკომიტებულა** ✅ — `git log --all -- .env` = ცარიელი |
| 2 | `.gitignore` | `.env*` — სწორად კონფიგურირებული ✅ |
| 3 | BOG HMAC-SHA256 | `timingSafeEqual` + **Hard-Fail** (unsigned rejected) ✅ |
| 4 | Credo HTTPS URLs | **HTTPS-safe baseUrl** (localhost fallback აღარ არის) ✅ |
| 5 | Helmet CSP | **Production-ში ჩართული** (XSS დაცვა) ✅ |
| 6 | Server-Side Price Validation | Client manipulation დაბლოკილი ✅ |
| 7 | RLS ყველა ცხრილზე | 42/42 ცხრილი — `rls_enabled: true` ✅ |
| 8 | RLS InitPlan Performance | 4 ცხრილი ოპტიმიზირებული — `(select auth.uid())` ✅ |
| 9 | Storage Policy | დუბლიკატი SELECT policy წაშლილია ✅ |
| 10 | Audit Trail | `audit_log` ტრიგერები აქტიური ✅ |

### ⚠️ დარჩენილი ფიქსები (არაკრიტიკული)

| # | პრობლემა | სიმძიმე | შენიშვნა |
|---|---------|---------|----------|
| 1 | `orders` / `order_items` RLS — public INSERT | 🟢 OK | E-commerce-სთვის მიზანმიმართულია — ყველამ უნდა შეძლოს შეკვეთა |
| 2 | Auth Leaked Password Protection | 🟡 P1 | Supabase Dashboard-ში ჩასართავია (Auth → Settings) |
| 3 | 30+ duplicate permissive RLS policies | 🟢 P2 | Performance — consolidation საჭირო |
| 4 | TBC Bank API | ⏸️ სამომავლო | API Key ჯერ არ არის, ინტეგრაცია მოლოდინშია |

---

## 🛠️ განახლებების ისტორია

| ვერსია | თარიღი | ცვლილება |
|--------|--------|---------|
| v1.0 | 2026-04-03 | Supabase მიგრაცია, Auth/RLS, პრემიუმ UI |
| v2.0 | 2026-04-06 | Double-Entry Accounting Schema (8 მიგრაცია) |
| v2.1 | 2026-04-05 | Payment Gateways — BOG, TBC, Credo Webhooks |
| v2.2–2.4 | 2026-04-09 | Manufacturing, Purchases, Returns, Audit Log |
| v2.5 | 2026-04-09 | RS.GE SOAP Integration — სქემა + სტაბები |
| v2.6 | 2026-04-10 | Security Hardening: RLS tightening, function search paths |
| v3.0 | 2026-04-11 | Estonian Tax, Payroll, Dynamic Reporting, CSV Export |
| v3.1 | 2026-04-12 | "Obsidian & Gilt" Design System — Admin Panel UI overhaul |
| v3.2 | 2026-04-13 | Accounting Dashboard — Sales Channel Analytics (Online/Showroom) |
| v3.3 | 2026-04-13 | Manufacturing modules — Offcut Logger, Cutting Plans, Waste Analytics |
| **v4.0** | **2026-04-15** | **სრული არქიტექტურული აუდიტი — 42 ცხრილი, 59 მიგრაცია, Supabase MCP ანალიზი** |
| v4.1 | 2026-04-15 | Barcode System, Excel Exports (Date Filtered), POS Global Scanner Integration |
| v4.2 | 2026-04-16 | Accounting Deep Dive: RS.ge profiles fix, RBAC verify, Returns/RMA inventory fix |
| **v4.3** | **2026-04-16** | **KALE AI Expert გაძლიერება:** Live Product Context (ზომები, ფასდაკლება, ფერები, გარანტია), Company Info, Showroom Details |
| **v4.4** | **2026-04-16** | **AI Room Designer Fix:** Imagen 3 (`imagen-3.0-generate-001`) + Gemini 1.5 Pro Vision — ოთახის ფოტო ანალიზი + ფოტორეალისტური ავეჯ-რენდერი |
| **v4.5** | **2026-04-16** | **Admin Intelligence:** RBAC-aware შიდა AI ჩატი Admin Panel-ში — Markdown Tables, COO & Auditor Mode, react-markdown |
| **v4.6** | **2026-04-16** | **Security Hardening (P0):** BOG Signature Hard-Fail, Credo HTTPS URLs, Helmet CSP Production Mode, RLS InitPlan optimization (4 ცხრილი), Storage policy cleanup |
| **v4.7** | **2026-04-20** | **Critical Security Fixes (Phase 1):** Dropped exposed `offcuts_backup_18042026`, secured `search_path` for SQL functions, fixed Mass Assignment in Employee CRUD with Zod, added AI Rate Limiting and Prompt Injection prevention |
| **v4.8** | **2026-04-20** | **Backend Stability & DB Hygiene:** Fixed `requireAdmin` regression, eliminated `supabaseAdmin` silent fallback, sanitized AI chat history, added global error handler, secured auth endpoint leaked passwords, added 6 missing FK indexes, optimized RLS with `get_auth_uid()`, and deleted orphaned `accounting_entries` table. |

#### მიგრაციების სტატისტიკა
- **სულ მიგრაციები:** 61 (2026-04-03 → 2026-04-16)
- **სქემის ზრდა:** 4 ცხრილი → 42 ცხრილი (13 დღეში)
- **უკანასკნელი მიგრაცია:** `fix_rls_initplan_performance` (2026-04-16)

---

## 🔮 Roadmap

### ✅ დასრულებული ფაზები

- [x] **Phase 1:** Database, Security, Premium UI, PWA, i18n ✅
- [x] **Phase 2:** Payment Gateways (BOG, TBC, Credo) + Webhooks ✅
- [x] **Phase 3:** ERP/Accounting Engine, Manufacturing, RMA, Audit ✅
- [x] **Phase 4:** Security Hardening (RLS, Function Search Paths, API Key Isolation) ✅

### ⏳ მიმდინარე / დაგეგმილი ფაზები

- [x] **Phase 5: Security Hardening** (v4.6 — ✅ დასრულებული)
  - [x] 5.1 — BOG Signature Hard-Fail (bypass fix) ✅
  - [x] 5.2 — Credo HTTPS baseUrl enforcement ✅
  - [x] 5.3 — Helmet CSP Production Mode ✅
  - [x] 5.4 — Storage bucket listing restriction (duplicate policy cleanup) ✅
  - [x] 5.5 — RLS InitPlan optimization (4 ცხრილი) ✅

- [x] **Phase 5.1: Critical Security Fixes (P0)** (v4.7 — ✅ დასრულებული)
  - [x] Database: Dropped exposed `offcuts_backup_18042026` table ✅
  - [x] Database: Secured `search_path` for `process_order_transaction` & `prevent_product_hard_delete` ✅
  - [x] API: Fixed Mass Assignment vulnerability in Employee CRUD using Zod schemas ✅
  - [x] AI Module: Added Rate Limiting (`aiImageLimiter`) for image generation ✅
  - [x] AI Module: Added Prompt Injection guardrails to Chat endpoint ✅

- [x] **Phase 5.2: Backend Stability & Database Hygiene** (v4.8 — ✅ დასრულებული)
  - [x] API: Fixed `requireAdmin` functional regression and added Global Error Handler ✅
  - [x] API: Eliminated `supabaseAdmin` silent fallback & sanitized AI Chat History ✅
  - [x] Database: Created `get_auth_uid()` STABLE function for RLS InitPlan optimization ✅
  - [x] Database: Added 6 missing unindexed Foreign Keys for join performance ✅
  - [x] Database: Dropped orphaned `accounting_entries` table ✅

- [x] **Phase 5B: Architecture Reform & Schema Alignment** (✅ დასრულებული)
  - [x] 5B.1 — Database: Align `orders` Schema with Types ✅
  - [x] 5B.2 — `server.ts` მოდულარიზაცია → `routes/`, `middleware/`, `services/` ✅
  - [x] 5B.3 — Duplicate RLS policy consolidation: 14 policy წაშლილი/ნორმალიზებული ✅
  - [x] 5B.4 — Dead code cleanup: `app/`, `kalegroup-fix/`, `new-admin-panel/`, old planning `.md`/`.sql` ✅
  - [x] 5B.5 — Enable Leaked Password Protection (Supabase Dashboard) — 🛑 Skipped (Requires Pro Plan)

- [ ] **Phase 6: Feature Activation** (3-5 კვირა)
  - [x] 6.1 — Invoice auto-generation debugging (invoices = 0) ✅
  - [x] 6.2 — Inventory deduction activation (stock_levels = 0) ✅
  - [x] 6.3 — OPEX integration → real Net Profit ✅
  - [ ] 6.4 — RS.GE SOAP production implementation (Requires API Key)
  - [x] 6.5 — Migration squash (59 → ~10) — 🛑 Skipped (Managed via Supabase Dashboard)

- [ ] **Phase 7: Full Autonomy** (1-2 თვე)
  - [ ] 7.1 — Multi-Currency (NBG API live rates)
  - [ ] 7.2 — E2E Tests (Playwright)
  - [x] 7.3 — AI Admin Assistant (Admin Intelligence — RBAC ✅ დასრულდა v4.5)
  - [ ] 7.4 — Real-time Notifications (Supabase Realtime)
  - [ ] 7.5 — Rate Limiting (Upstash Redis)

---

## 📐 არქიტექტურული დიაგრამა

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (React 19 + Vite)               │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────────┐  │
│  │Storefront│  │Admin ERP │  │Accounting│  │Manufacturing│  │
│  │(Public)  │  │(RBAC)    │  │(Double-E)│  │(BOM/Cut)   │  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └─────┬──────┘  │
│       │              │              │              │         │
│       └──────────────┴──────────────┴──────────────┘         │
│                          │                                   │
└──────────────────────────┼───────────────────────────────────┘
                           │ HTTPS
┌──────────────────────────┼───────────────────────────────────┐
│              BACKEND (Express / Vercel Serverless)            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────────┐  │
│  │Payment   │  │Gemini AI │  │RS.GE SOAP│  │processOrder │  │
│  │Webhooks  │  │Proxy     │  │(Stub)    │  │(Auto Acct.) │  │
│  │BOG/TBC/  │  │          │  │          │  │             │  │
│  │Credo     │  │          │  │          │  │             │  │
│  └────┬─────┘  └──────────┘  └──────────┘  └──────┬──────┘  │
│       │                                            │         │
└───────┼────────────────────────────────────────────┼─────────┘
        │                                            │
┌───────┼────────────────────────────────────────────┼─────────┐
│       ▼            SUPABASE (PostgreSQL)            ▼        │
│  ┌─────────┐  ┌──────────┐  ┌────────┐  ┌──────────────┐    │
│  │42 Tables│  │RLS on ALL│  │59 Migr.│  │Audit Triggers│    │
│  │         │  │          │  │        │  │              │    │
│  └─────────┘  └──────────┘  └────────┘  └──────────────┘    │
│  ┌─────────┐  ┌──────────┐  ┌────────────────────────┐      │
│  │Auth/JWT │  │Storage   │  │Realtime (future)       │      │
│  └─────────┘  └──────────┘  └────────────────────────┘      │
└──────────────────────────────────────────────────────────────┘
```

---

## 📝 აუდიტის შენიშვნები (2026-04-16 — v4.6)

> **აუდიტორი:** Senior AI Architect (Supabase MCP + GitHub API + Codebase + Security Advisors)
>
> **მეთოდოლოგია:** 4-წყაროიანი ჯვარედინი ვერიფიკაცია + Supabase Security & Performance Advisor API
>
> **ძირითადი დასკვნა:** პლატფორმა სოლიდურ საფუძველზეა აგებული — 42 ცხრილი ყველა RLS-ით, double-entry accounting (ყველა 15 entry ბალანსშია: Debit=Credit), comprehensive audit trail.
>
> **v4.6 Security Hardening:** სამივე P0 კრიტიკული ხარვეზი აღმოიფხვრა — BOG webhook signature bypass, Credo HTTP localhost fallback და CSP disabled. Supabase-ზე RLS performance ოპტიმიზირეულია 4 manufacturing ცხრილზე, storage policy დუბლიკატი წაშლილია.
>
> **v4.7 Critical Security Fixes:** აღმოიფხვრა P0 ხარვეზები — წაიშალა ღია ბექაფ ცხრილი, შეიზღუდა SQL ინექციის რისკები ფუნქციებში `search_path`-ის გაწერით, დაემატა Zod ვალიდაცია თანამშრომლების API-ში (Mass Assignment-ისგან დასაცავად), ასევე დაინერგა AI Rate Limiting და Prompt Injection-ისგან დაცვა.
>
> **v4.8 Backend Architecture Hardening:** გასწორდა ფუნქციური რეგრესიები (admin permissions, silent error swallows), დაემატა გლობალური error handler. ბაზის ჰიგიენის კუთხით შეიქმნა `get_auth_uid()` ფუნქცია, დაემატა აკლია Foreign Key ინდექსები და წაიშალა ობოლი `accounting_entries` ცხრილი.
> **VAT/დღგ:** კომპანია ამჟამად არ არის დღგ-ს გადამხდელი — ფუნქცია ჩაშენებულია სამომავლოდ (company_settings toggle).
>
> **TBC Bank:** API ინტეგრაცია მოლოდინშია (API Key ჯერ არ არის მიღებული).
>
> **დარჩენილი არქიტექტურული ვალი:** ყველა არქიტექტურული ვალი აღმოიფხვრა. (შენიშვნა: Leaked Password Protection გამოტოვებულია, რადგან Supabase-ის უფასო (Free) ვერსიაზე არ არის ხელმისაწვდომი).
