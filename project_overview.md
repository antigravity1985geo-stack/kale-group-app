# 🏺 KALE GROUP - Premium Furniture E-commerce & ERP Platform

**KALE GROUP** არის მაღალი კლასის ონლაინ მაღაზია, რომელიც ორიენტირებულია პრემიუმ ხარისხის ავეჯის გაყიდვასა და ინდივიდუალურ შეკვეთებზე. პლატფორმა აერთიანებს დახვეწილ დიზაინს, სრულყოფილ ERP საბუღალტრო სისტემას, თანამედროვე ტექნოლოგიებსა და მომხმარებელზე მორგებულ ფუნქციონალს.

---

## 🚀 ტექნოლოგიური სთეკი (Tech Stack)

### Frontend (User Interface & Experience)
- **Framework:** [React 19](https://react.dev/) + [Vite](https://vitejs.dev/)
- **Styling:** [Tailwind CSS v4](https://tailwindcss.com/) + [Framer Motion](https://www.framer.com/motion/) (პრემიუმ ანიმაციები, სმუთ-ტექნოლოგიები)
- **PWA (Progressive Web App):** `vite-plugin-pwa` ინტეგრაცია offline მხარდაჭერისა და აპლიკაციის სახით ინსტალაციისთვის.
- **State Management:** React Context API (Cart, Wishlist, Language)
- **Internationalization (i18n):** `i18next` + `react-i18next` (სრული მულტი-ენოვანი მხარდაჭერა - GEO, ENG, RUS)
- **SEO & Head Management:** React Helmet Async (დინამიური მეტა ტეგებისთვის)

### Backend & API
- **Server:** [Node.js](https://nodejs.org/) + [Express](https://expressjs.com/) (`server.ts` — Custom Secured API)
- **Deployment:** Vercel Serverless Functions (ოპტიმიზებული Vercel-ისთვის)
- **AI Integration:** [Google Gemini AI API](https://ai.google.dev/) (Backend-ზე — API Key დაცული, Rate Limiting კონტროლი)
- **Payment Gateways:** BOG (Bank of Georgia), TBC (tpay), Credo Bank — სრული Webhook ინტეგრაცია
- **Auto Accounting Engine:** `processSuccessfulOrder()` — ავტომატური გატარება, ინვოისი, COGS, VAT, Stock sync

### Database, Auth & Storage
- **BaaS:** [Supabase](https://supabase.com/) (PostgreSQL v2.0 სქემა, 37 ცხრილი, 9 View, 16 Trigger)
- **Authentication:** Supabase Auth (JWT + Row Level Security — 22 RLS პოლიტიკა)
- **Storage:** Supabase Storage bucket-ები სურათებისა და მედიის ასატვირთად

---

## ✨ ძირითადი ფუნქციონალი (Core Features)

### 1. მომხმარებლის ინტერფეისი (Storefront)
- **პრემიუმ კატალოგი:** პროდუქციის ფილტრაცია კატეგორიის, მასალისა და ფერის მიხედვით. დახარისხება ფასის (ზრდადობით/კლებადობით) და პოპულარობის მიხედვით.
- **ჭკვიანი კალათა (Smart Cart):** Persistent (Local Storage) შესყიდვების კალათა — ავტომატური ფასდაკლების კალკულაცია (`sale_price`).
- **რჩეულები (Wishlist):** სასურველი ნივთების შენახვა რეგისტრაციის გარეშე.
- **მულტილინგვალური სისტემა:** მთლიანი პლატფორმის მყისიერი თარგმნა 3 ენაზე (ქართული, English, Русский).
- **Premium UX/UI:** Glassmorphism დიზაინი, Skeleton Loaders, Toast Notifications, Back-to-Top, Inter/Outfit შრიფტები.
- **AI ჩეთ-ასისტენტი:** Gemini-ზე დაფუძნებული ინტერიერ-დიზაინ კონსულტანტი — Kale Group-ის სინამდვილის ინვენტარზე მირჩეულია.
- **Progressive Web App (PWA):** Home Screen ინსტალაცია, Offline მხარდაჭერა.

### 2. შეკვეთა & გადახდა (Checkout & Payments)
- **Checkout:** სრული ფორმა ფიზიკური/იურიდიული პირისთვის, Supabase-ში წერა.
- **ფასდაკლების ლოგიკა:** ავტომატური `sale_price` VS `price` პრიორიტეტი Backend-ზე (Server-side ვალიდაცია).
- **PDF ქვითრები:** `jspdf`-ით ბრენდირებული ინვოისი ქართული UTF-8 შრიფტით.
- **Payment Gateways (Live):**
  - **BOG (Bank of Georgia):** სრული გადახდა + განვადება (OAuth2)
  - **TBC (tpay):** ბარათი, QR, Apple Pay, განვადება
  - **Credo Bank:** Installment

### 3. ავტომატური საბუღალტრო სისტემა (Auto Accounting Engine)

გადახდის დადასტურებისას (`Webhook Callback`) სისტემა ავტომატურად ასრულებს:

1. **შეკვეთის დადასტურება** → `status: confirmed`, `payment_status: paid`
2. **გაყიდვების ინვოისის გენერაცია** → `invoices` ცხრილი (18% VAT-ის ჩათვლით)
3. **COGS კალკულაცია** → `cost_price`-ზე დაყრდნობით
4. **ორმაგი საბუღალტრო გატარება** → `journal_entries` + `journal_lines`:
   - 📥 **Debit:** ბანკის ანგარიში (Cash/Bank) + COGS ხარჯი
   - 📤 **Credit:** გაყიდვების შემოსავალი + დღგ-ს ვალი + ინვენტარი
5. **საწყობიდან ჩამოწერა** → `inventory_transactions` → `sync_stock_levels` Trigger

### 4. ადმინ პანელი & ERP მოდულები (Admin Dashboard)

**როლებზე დაფუძნებული წვდომა (RBAC):** 4 როლი — Admin, Consultant, Accountant, Guest.

| მოდული | ჩანართი | ფუნქციონალი |
|--------|---------|------------|
| 📊 დეშბორდი | `acc-dashboard` | KPI ბარათები, Revenue, Gross Profit, VAT, Inventory Value |
| 📒 ჟურნალი | `journal` | Double-entry ჩანაწერები — DRAFT/POST/REVERSE |
| 🧾 ინვოისები | `invoices` | Sales & Purchase ინვოისები |
| 📦 ინვენტარი | `inventory` | Stock Levels, Transactions, Manual Adjustments |
| 🛒 შესყიდვები | `purchases` | Suppliers CRUD, Purchase Orders, GRN (3-way match) |
| 🏛 დღგ | `vat` | VAT Transactions, Summary, Declarations |
| 👥 HR/ხელფასი | `hr` | Employees, Payroll Runs, Slips |
| 🏭 წარმოება | `manufacturing` | BOM (Bill of Materials), Production Runs |
| 🔁 დაბრუნება | `returns` | RMA — Refused/Damaged/Resellable ავტო-გატარებები |
| 📈 რეპორტები | `reports` | Trial Balance, P&L, Balance Sheet, Cash Flow |
| 🛡 აუდიტი | `audit` | `audit_log` — ყველა INSERT/UPDATE/DELETE-ის ვინ/როდის/Diffs |

---

## 📂 არქიტექტურა & პროექტის სტრუქტურა

```bash
KALE-GROUP--MAIN/
├── api/             # Vercel Serverless Function entry point-ები
├── public/          # სტატიკური ფაილები, PWA icons, robots.txt, sitemap.xml
├── src/
│   ├── components/
│   │   ├── admin/
│   │   │   └── accounting/   # ბუღალტრული მოდულების კომპონენტები
│   │   │       ├── AccountingDashboard.tsx
│   │   │       ├── JournalEntries.tsx
│   │   │       ├── InvoicesModule.tsx
│   │   │       ├── InventoryModule.tsx
│   │   │       ├── PurchasesModule.tsx     ← Suppliers/PO/GRN
│   │   │       ├── VATModule.tsx
│   │   │       ├── HRPayrollModule.tsx
│   │   │       ├── RSGeModule.tsx          ← RS.ge SOAP Integration
│   │   │       ├── ReturnsModule.tsx       ← RMA/Auto Journal
│   │   │       ├── FinancialReports.tsx
│   │   │       └── AuditLogViewer.tsx      ← System Audit Log
│   │   ├── cart/
│   │   ├── layout/
│   │   ├── modals/
│   │   ├── sections/
│   │   ├── ui/
│   │   └── wishlist/
│   ├── context/     # Global State (Cart, Wishlist, Auth, Language)
│   ├── hooks/       # Custom React Hooks
│   ├── lib/         # Supabase Client
│   ├── locales/     # i18n JSON (en, ka, ru)
│   ├── pages/       # Routes (Home, Products, Checkout, Admin)
│   ├── services/
│   │   └── rsge/    # RS.ge SOAP (mock & live) + Service Logics
│   ├── types/       # TypeScript Interfaces
│   └── utils/       # Helpers (Currency, PDF, getEffectivePrice)
├── server.ts        # Express Backend — AI, Payments, Accounting API, RS.ge Auth
├── vite.config.ts   # Vite + PWA Config
└── tailwind.config  # Tailwind v4 Config
```

---

## 🛠️ განახლებების ისტორია

| ვერსია | ცვლილება |
|--------|---------|
| v1.0 | Supabase მიგრაცია, Auth/RLS, პრემიუმ UI |
| v1.1 | AI Backend-ზე გადატანა, Gemini Rate Limit მოგვარება |
| v1.2 | i18n (3-ენა), PWA, ფასდაკლების ლოგიკის გამართვა |
| v2.0 | Double-Entry Accounting Schema (37 ცხრილი, 9 View, 16 Trigger) |
| v2.1 | Payment Gateways — BOG, TBC, Credo Webhooks |
| v2.2 | Manufacturing (BOM) & Returns (RMA) მოდულები |
| v2.3 | `PurchasesModule` — Suppliers, PO, GRN (3-way matching) |
| v2.4 | `AuditLogViewer` — სისტემური აუდიტ-ჟურნალი |
| v2.4 | `processSuccessfulOrder()` — ავტომატური ინვოისი + Double-Entry + COGS + VAT + Stock |
| **v2.5** | **RS.ge SOAP Integration — ელ-ინვოისებისა და ზედნადებების სრული ავტომატიზაცია (Phase 4)** |

---

## 🔮 Roadmap

- [x] **Phase 1:** Database, Security, Premium UI, PWA, i18n ✅
- [x] **Phase 2:** Payment Gateways (BOG, TBC, Credo) + Webhooks ✅
- [x] **Phase 3:** სრული ERP/Accounting Engine, Manufacturing, RMA, Audit, Auto Journal ✅
- [x] **Phase 4:** RS.ge SOAP Integration — ელ-ინვოისი, ზედნადები, VAT დეკლარაციები (Mock -> Live) ✅
