# 🏺 KALE GROUP - Premium Furniture E-commerce Platform

**KALE GROUP** არის მაღალი კლასის ონლაინ მაღაზია, რომელიც ორიენტირებულია პრემიუმ ხარისხის ავეჯის გაყიდვასა და ინდივიდუალურ შეკვეთებზე. პლატფორმა აერთიანებს დახვეწილ დიზაინს, თანამედროვე ტექნოლოგიებსა და მომხმარებელზე მორგებულ ფუნქციონალს.

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
- **Server:** [Node.js](https://nodejs.org/) + [Express](https://expressjs.com/) (Custom API)
- **Deployment:** Vercel Serverless Functions (`server.ts` ოპტიმიზებული Vercel-ისთვის)
- **AI Integration:** [Google Gemini AI API](https://ai.google.dev/) (გადატანილია Backend-ზე უსაფრთხოების მიზნით, იცავს API გასაღებს და ამცირებს Rate Limit/429 ერორებს).

### Database, Auth & Storage
- **BaaS (Backend as a Service):** [Supabase](https://supabase.com/) (ფოსტგრეს ბაზა, რეალურ-დროში სინქრონიზაცია)
- **Authentication:** Supabase Auth (JWT, Row Level Security გაძლიერებული კონტროლით)
- **Storage:** Supabase Storage bucket-ები სურათებისა და მედიის ასატვირთად უშუალოდ ადმინ-პანელიდან.

---

## ✨ ძირითადი ფუნქციონალი (Core Features)

### 1. მომხმარებლის ინტერფეისი (Storefront)
- **პრემიუმ კატალოგი:** პროდუქციის ფილტრაცია კატეგორიის (Category), მასალისა (Material) და ფერის მიხედვით. დახარისხება ფასის (ზრდადობით/კლებადობით) და პოპულარობის მიხედვით.
- **ჭკვიანი კალათა (Smart Cart):** Persistent (Local Storage-ზე დაფუძნებული) შესყიდვების კალათა, რომელიც ავტომატურად ითვალისწინებს ავეჯის ფასდაკლებებს (`sale_price`) და გენერირებს ზუსტ ჯამურ ღირებულებას.
- **რჩეულები (Wishlist):** მომხმარებლებს შეუძლიათ დაამატონ სასურველი ნივთები რეგისტრაციის გარეშე.
- **მულტილინგვალური სისტემა:** მთლიანი პლატფორმის (Footer, Header, პროდუქტის გვერდი, Checkout, კატალოგი) მყისიერი თარგმნა სამ ენაზე.
- **Premium UX/UI დეტალები:** "Glassmorphism" დიზაინი, Skeleton Loader-ები (ჩატვირთვის ანიმაციები), "Back to Top" ღილაკი, Inter/Outfit შრიფტების კოლაბორაცია.
- **AI ჩეთ-ასისტენტი:** პროექტში ჩაშენებულია პერსონალური ინტერიერის დიზაინ-კონსულტანტი (Gemini-ზე დაფუძნებული), სადაც პასუხები გარანტირებულად ემყარება Kale Group-ის ინვენტარს. აპლიკაციის Backend უზრუნველყოფს უსაფრთხო კომუნიკაციას.
- **Progressive Web App (PWA):** სისტემა მომხმარებელს სთავაზობს აპლიკაციის 홈-ეკრანზე ინსტალაციას (Desktop / Mobile), რაც აჩქარებს მუშაობას და ხდის ხელმისაწვდომს.

### 2. შეკვეთის გაფორმება & Payments (Checkout System)
- **Checkout Processing:** დახვეწილი ფორმა მარტივი შეკვეთისთვის. მონაცემების პირდაპირი ინტეგრაცია Supabase-ში.
- **ფასდაკლებებისა და აქციების მენეჯმენტი:** ავტომატური კალკულაცია, რომელიც უპირატესობას ანიჭებს საპრომოციო ფასებს სტანდარტულთან შედარებით.
- **PDF ქვითრები:** `jspdf`-ით გენერირებული ბრენდირებული PDF ინვოისი ქართული UTF-8 შრიფტის მხარდაჭერით.
- **Payment Gateways (მომზადებული ინფრასტრუქტურა):** საფუძველი ჩაყრილია BOG (საქართველოს ბანკი), TBC (tpay), და Credo-ბანკის განვადებებისა და ბარათით გადახდების ინტეგრაციისთვის Webhook Callback-ებზე დაფუძნებით.

### 3. ადმინ პანელი (Admin Dashboard)
- **როლებზე დაფუძნებული წვდომა (RBAC):** Supabase RLS-ით მართული 4 როლი:
  - *Admin:* სრული უფლებები (წაშლა, მოდიფიკაცია, ფინანსები).
  - *Consultant:* პროდუქტების რედაქტირების და შეკვეთების ნახვის უფლება (წაშლის გარეშე).
  - *Accountant:* ფინანსების და ბუღალტერიის მოდულზე ორიენტირება.
  - *Guest:* შესვლის გარეშე/მხოლოდ საჯარო მონაცემები.
- **პროდუქციის სრული მართვა (CRUD):** Live სურათების ატვირთვა Storage-ში, ახალი პროდუქტის/კატეგორიის წამებში დამატება დინამიური ფორმების მეშვეობით.
- **შეკვეთების მენეჯმენტი:** მომხმარებლის შეკვეთების აღრიცხვა, სტატუსების მართვა (Pending, Processing, Completed) გამოტანილი კომფორტული ცხრილის სახით.
- **ბიზნეს ანალიტიკა და ბუღალტერია:** RS.ge და ფინანსური მოდულის მონაცემთა ბազების წინასწარი კონფიგურაცია, მარაგების რეალურ დროში ჩვენება (`in_stock`).

---

## 📂 არქიტექტურა & პროექტის სტრუქტურა

```bash
KALE-GROUP--MAIN/
├── api/             # Vercel Serverless Function entry point-ები 
├── app/             # (Optional) Next.js/Mobile App components (თუ არსებობს)
├── public/          # სტატიკური ფაილები, ფონტები, ლოგოები, robots.txt, sitemap.xml
├── src/
│   ├── components/  # მოდულარული React კომპონენტები
│   │   ├── admin/   # ადმინ პანელის სექციები
│   │   ├── cart/    # კალათის სექციები & ლოგიკა
│   │   ├── layout/  # Header, Footer, Hero სექციები
│   │   ├── modals/  # Popup-ები (Auth, AI Chat)
│   │   ├── sections/# მთავარი გვერდის ბლოკები
│   │   ├── ui/      # უნივერსალური კომპონენტები (Buttons, Inputs, Skeletons)
│   │   └── wishlist/# რჩეულების მოდული
│   ├── context/     # Global State (Context API Providers)
│   ├── hooks/       # Custom React Hooks (Supabase Fetching, UI ლოგიკა)
│   ├── lib/         # Client Configurations (Supabase Client და ა.შ.)
│   ├── locales/     # i18n JSON ფაილები ტრანსლაციისთვის (en, ka, ru)
│   ├── pages/       # მთავარი Pages (Admin, Home, Products, Checkout)
│   ├── types/       # TypeScript Type/Interface დეფინიციები
│   └── utils/       # Utility ფაილები (Currency formatting, Validation, PDF)
├── server.ts        # Express Backend & AI Chat API Route-ები
├── vite.config.ts   # Vite კონფიგურაცია (+ PWA)
└── tailwind.config  # Tailwind v4 კონფიგურაცია
```

---

## 🛠️ უახლესი განახლებები / მიღწეული პროგრესი

1. **მთლიანი Backend მიგრაცია Supabase-ზე:** სრულად იქნა ჩანაცვლებული მოკ-მონაცემები რეალური, დინამიური მონაცემთა ბაზით. ამუშავდა Row Level Security.
2. **AI ასისტენტის რეფაქტორინგი:** Gemini AI კოდი კლიენტიდან მიგრირდა Node.js სერვერზე `server.ts`-ში, რამაც დაფარა API Keys და მოაგვარა Rate Limiting ერორები. გამართულია Vercel-ზე დეპლოის ფუნქცია.
3. **მულტილინგვალური მხარდაჭერა (i18next):** პლატფორმა ახლა 3 ენოვანია 100%-ით (ყველა UI კომპონენტითა და Alert შეტყობინებით).
4. **ფასდაკლების ლოგიკის გამართვა:** კალათასა და დეშბორდში სრულად გასწორდა ფასდაკლებული პროდუქციის კალკულაცია, რომელიც ახლა ზუსტად აღრიცხავს სააქციო პროდუქციას.
5. **ვიზუალური პრემიუმ-შტრიხები:** წარმატებით ჩაეშვა Premium UI, Smooth Scroll, Toast Notifications, Skeleton Loaders-ები მოლოდინის დროს, რაც აუმჯობესებს User Retention Rate-ს.

---

## 🔮 Roadmap (სამომავლო განვითარების გეგმა)

- [x] **Phase 1: Database, Security & Premium UI (Completed)**
  - Supabase-ზე სრული მიგრაცია. AI გადატანა Backend-ზე.
  - როლებზე დაფუძნებული წვდომა და ფასდაკლების სისტემა.
  - PWA და 3-ენოვანი (i18n) მხარდაჭერა.
  
- [ ] **Phase 2: Payment Gateways (In Progress)**
  - TBC, BOG, და Credo API-საბოლოო ტესტირება და Sandbox-იდან Production-ში გატანა.
  - Webhook ენდპოინტების დაცვა თაღლითური მოთხოვნებისგან.

- [ ] **Phase 3: RS.ge & ფისკალური ინტეგრაცია**
  - RS.ge-ს SOAP API-სთან ინტეგრაცია ბუღალტერიისთვის.
  - ზედნადებებისა და ინვოისების ავტომატური გენერაცია ადმინ-პანელიდან ერთი კლიკით.

- [ ] **Phase 4: გაფართოებული ბიზნეს-ანალიტიკა**
  - ფინანსური რეპორტების ვიზუალიზაცია ადმინ პანელში (გრაფიკები, Chart.js/Recharts).
  - მოგება/ზარალისა და გაყიდვების დინამიკის ექსპორტი PDF/Excel-ში.
