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
- **Deployment:** Vercel Serverless Functions (`api/index.ts` ოპტიმიზებული Vercel-ისთვის სრული საბუღალტრო სინქრონიზაციით)
- **AI Integration:** [Google Gemini AI API](https://ai.google.dev/) (Backend-ზე — API Key დაცული)
- **Payment Gateways:** BOG (Bank of Georgia), TBC (tpay), Credo Bank — სრული Webhook ინტეგრაცია + HMAC-SHA256 ვერიფიკაცია
- **Auto Accounting Engine:** `processSuccessfulOrder()` — ავტომატური გატარება, ინვოისი, COGS, VAT, Stock sync
- **Estonian Tax Engine:** ავტომატური 15%-იანი მოგების გადასახადის გაანგარიშება დივიდენდების გაცემისას (Net / 0.85 * 0.15).
- **Payroll Automation:** ერთი კლიკით ხელფასების დარიცხვა და 20%-იანი საშემოსავლოს ავტო-ფორმირება.

### Database, Auth & Security
- **BaaS:** [Supabase](https://supabase.com/) (PostgreSQL v3.0 სქემა, 37 ცხრილი, 9 View, 16 Trigger, 3 Dynamic RPC Reporting Functions)
- **Authentication:** Supabase Auth (JWT + Row Level Security — 22 RLS პოლიტიკა)
- **Security:** Git ისტორიის სრული გაწმენდა მგრძნობიარე მონაცემებისგან, დაცული Edge Environment Variables, API keys როტაცია. 

---

## ✨ ძირითადი ფუნქციონალი (Core Features)

### 1. მომხმარებლის ინტერფეისი (Storefront)
- **პრემიუმ კატალოგი:** პროდუქციის ფილტრაცია კატეგორიის, მასალისა და ფერის მიხედვით. დახარისხება ფასის (ზრდადობით/კლებადობით) და პოპულარობის მიხედვით.
- **ჭკვიანი კალათა (Smart Cart):** Persistent (Local Storage) შესყიდვების კალათა — ავტომატური ფასდაკლების კალკულაცია (`sale_price`).
- **მულტილინგვალური სისტემა:** მთლიანი პლატფორმის მყისიერი თარგმნა 3 ენაზე (ქართული, English, Русский).
- **AI ჩეთ-ასისტენტი:** Gemini-ზე დაფუძნებული ინტერიერ-დიზაინ კონსულტანტი — Kale Group-ის სინამდვილის ინვენტარზე მორგებული.

### 2. შიდა ERP და ავტომატური ბუღალტერია (Auto Accounting Engine)

გადახდის დადასტურებისას (`Webhook Callback` BOG/TBC) სისტემა ავტომატურად ასრულებს:

1. **Webhook ვერიფიკაცია** → ბაზაში გადახდის არსებობისა და Signature-ის შემოწმება.
2. **შეკვეთის დადასტურება** → `status: confirmed`, `payment_status: paid`
3. **გაყიდვების ინვოისის გენერაცია** → `invoices` ცხრილი (18% VAT-ის ჩათვლით)
4. **ორმაგი საბუღალტრო გატარება** → `journal_entries` + `journal_lines`:
   - 📥 **Debit:** Cash/Bank + COGS 
   - 📤 **Credit:** Sales + VAT + Inventory
5. **საწყობიდან ჩამოწერა** → `inventory_transactions` ავტომატური რეზერვირება

### 3. ადმინ პანელი & მოდულები (Admin Dashboard)

| მოდული | ფუნქციონალი |
|--------|------------|
| 📊 დეშბორდი | KPI ბარათები, Revenue, Gross Profit, VAT, Inventory Value |
| 📒 ჟურნალი | Double-entry ჩანაწერები — DRAFT/POST/REVERSE |
| 🧾 ინვოისები | Sales & Purchase ინვოისები + RS.ge B2B ატვირთვა |
| 📦 ინვენტარი | Stock Levels, FIFO Layers, RS.ge Waybill Mapping |
| 🛒 შესყიდვები | Suppliers CRUD, Purchase Orders, GRN (3-way match) |
| 📈 რეპორტები | P&L, BS, Trial Balance (დინამიური ფილტრი + CSV Export) |
| 🏛 დღგ | VAT Transactions, Summary, Declarations |
| 💎 გადასახადი | ესტონური მოდელი (Profit Tax 15%) |
| 👥 HR/ხელფასი | Employees, Payroll Runs (Income Tax 20%), Slips |
| 🏭 წარმოება | BOM (Bill of Materials), Production Runs |
| 🔁 დაბრუნება | RMA — Refused/Damaged/Resellable ავტო-გატარებები |
| 🛡 აუდიტი | `audit_log` — ყველა მოქმედების ვინ/როდის ჩაწერა |

---

## 🛠️ განახლებების ისტორია

| ვერსია | ცვლილება |
|--------|---------|
| v1.0 | Supabase მიგრაცია, Auth/RLS, პრემიუმ UI |
| v2.0 | Double-Entry Accounting Schema |
| v2.1 | Payment Gateways — BOG, TBC, Credo Webhooks |
| v2.2 - 2.4 | მოდულები: Manufacturing, Purchases, Returns, Audit Log |
| v2.5 | RS.ge SOAP Integration — ელ-ინვოისებისა და ზედნადებების ინტეგრაცია |
| v2.6 | Security Hardening (P0): API Secret Rotation, GitHub Audit, Vercel Production Sync |
| **v3.0** | **Estonian Tax Model, Automated Payroll (20% Income Tax), Dynamic Financial Reporting (Date Range), CSV Export & RS.ge Waybill Mapping.** |

---

## 🔮 Roadmap

- [x] **Phase 1:** Database, Security, Premium UI, PWA, i18n ✅
- [x] **Phase 2:** Payment Gateways (BOG, TBC, Credo) + Webhooks ✅
- [x] **Phase 3:** ERP/Accounting Engine, Manufacturing, RMA, Audit ✅
- [x] **Phase 4:** Securing the Platform (Secrets Rotation, Vercel Environment, Payment Validation) ✅
- [ ] **Phase 5:** Rate Limiting with Upstash Redis (Vercel-ზე `express-rate-limit` მიგრაცია) ⏳
- [ ] **Phase 6:** PWA Icons/Manifest ოპტიმიზაცია (SVG -> PNG) ⏳
