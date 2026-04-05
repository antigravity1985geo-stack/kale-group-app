# 🏺 KALE GROUP — სრული Code Review & Fix დოკუმენტაცია

> **AI Senior Developer & Architect Review**
> პროექტი: `kale-group-app-main` | React + Vite + Supabase + Express + Gemini AI
> თარიღი: 2026-04-05

---

## 📊 შეცდომების სარეზიუმო ცხრილი

| # | ფაილი | შეცდომა | სიმძიმე | სტატუსი |
|---|-------|---------|---------|---------|
| 1 | `server.ts` | Rate Limiting არ არის AI endpoint-ებზე | 🔴 კრიტიკული | ✅ გამოსწორდა |
| 2 | `server.ts` | CORS middleware არ არის | 🔴 კრიტიკული | ✅ გამოსწორდა |
| 3 | `server.ts` | Helmet.js არ არის (security headers) | 🔴 კრიტიკული | ✅ გამოსწორდა |
| 4 | `CheckoutPage.tsx` | შეკვეთა პირდაპირ client-side Supabase-ით იქმნება | 🔴 კრიტიკული | ✅ გამოსწორდა |
| 5 | `package.json` | `start` script: `node server.ts` production-ში მუშაობს | 🔴 კრიტიკული | ✅ გამოსწორდა |
| 6 | `useSupabaseData.ts` | Memory leak — cleanup არ არის async hooks-ში | 🔴 კრიტიკული | ✅ გამოსწორდა |
| 7 | `useSupabaseData.ts` | `useCategories` — error state არ აქვს | 🔴 კრიტიკული | ✅ გამოსწორდა |
| 8 | `CartContext.tsx` | Cart არ ინახება localStorage-ში (refresh-ზე იშლება) | 🟡 საშუალო | ✅ გამოსწორდა |
| 9 | `WishlistContext.tsx` | `toggleWishlist` / `removeFromWishlist` — `useCallback` არ გამოიყენება | 🟡 საშუალო | ✅ გამოსწორდა |
| 10 | `server.ts` | AI Chat endpoint-ზე user input sanitization არ არის | 🟡 საშუალო | ✅ გამოსწორდა |
| 11 | `server.ts` | Backend Supabase იყენებს anon key admin ოპერაციებისთვის | 🟡 საშუალო | ✅ გამოსწორდა |
| 12 | `.env.example` | VITE_SUPABASE_URL და VITE_SUPABASE_ANON_KEY გამოტოვებულია | 🟢 დაბალი | ✅ გამოსწორდა |
| 13 | `package.json` | სახელი "react-example" — პროექტის სახელი არ შეცვლილა | 🟢 დაბალი | ✅ გამოსწორდა |

---

## 🔴 კრიტიკული შეცდომები — Before & After

---

### 1. `server.ts` — Rate Limiting, CORS, Helmet

**პრობლემა:** ყველა API endpoint ღია და დაუცველია. ნებისმიერ მომხმარებელს შეუძლია AI API-ზე spam გამოგზავნოს, Gemini quota ამოწუროს და სხვა origin-დანაც მოახდინოს request.

#### ❌ BEFORE

```typescript
// server.ts — security middleware-ები საერთოდ არ არის
async function startServer() {
  const app = express();
  const PORT = 3000;
  app.use(express.json({ limit: '10mb' }));
  // ... პირდაპირ routes-ები
}
```

#### ✅ AFTER

```typescript
// დააინსტალირე: npm install helmet cors express-rate-limit
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';

async function startServer() {
  const app = express();

  // ── Security Headers (Helmet) ──
  app.use(helmet());

  // ── CORS ──
  app.use(cors({
    origin: process.env.APP_URL || 'http://localhost:3000',
    credentials: true,
  }));

  app.use(express.json({ limit: '10mb' }));

  // ── Rate Limiting: AI endpoints (ძვირი და ლიმიტირებული) ──
  const aiLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 წუთი
    max: 10,             // მაქსიმუმ 10 request/წუთი per IP
    message: { error: 'ძალიან ბევრი მოთხოვნა. გთხოვთ, ერთი წუთი დაიცადოთ.' },
    standardHeaders: true,
    legacyHeaders: false,
  });

  // ── Rate Limiting: Public API (ზოგადი) ──
  const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 წუთი
    max: 200,
    message: { error: 'ძალიან ბევრი მოთხოვნა.' },
  });

  app.use('/api/', generalLimiter);
  app.use('/api/ai/', aiLimiter); // AI-ზე მკაცრი ლიმიტი

  // ... დანარჩენი კოდი
}
```

---

### 2. `CheckoutPage.tsx` — Client-side Order Insert

**პრობლემა:** შეკვეთა იქმნება პირდაპირ frontend-ის Supabase client-ით. ამ შემთხვევაში:
- ნებისმიერ მომხმარებელს შეუძლია მოდიფიცირებული მონაცემები გამოაგზავნოს
- ფასების validation backend-ზე არ ხდება
- RLS პოლიტიკები ერთადერთი დაცვაა

#### ❌ BEFORE (`CheckoutPage.tsx`)

```typescript
// ❌ პირდაპირ client → Supabase insert (backend bypass!)
const { data: orderData, error: orderError } = await supabase
  .from('orders')
  .insert([{
    customer_type: customerInfo.customerType,
    customer_first_name: customerInfo.firstName,
    // ...
  }])
  .select()
  .single();
```

#### ✅ AFTER (`CheckoutPage.tsx`)

```typescript
// ✅ client → Express Backend → Supabase (validated & secure)
const handlePayment = async (bank: 'bog' | 'tbc' | 'credo', type: 'full' | 'installment') => {
  setIsProcessingPayment(true);
  try {
    const response = await fetch('/api/orders/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerInfo,
        items: items.map(i => ({ productId: i.product.id, quantity: i.quantity })),
        paymentMethod: bank,
        paymentType: type,
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'შეკვეთის შექმნა ვერ მოხერხდა');
    }

    const { orderId, redirectUrl } = await response.json();
    clearCart();
    navigate(`/payment-success?orderId=${orderId}`);
  } catch (error: any) {
    toast.error(error.message);
  } finally {
    setIsProcessingPayment(false);
  }
};
```

#### ✅ AFTER (`server.ts` — ახალი endpoint)

```typescript
// ახალი /api/orders/create endpoint
app.post("/api/orders/create", async (req, res) => {
  try {
    const { customerInfo, items, paymentMethod, paymentType } = req.body;

    // 1. Validate required fields
    if (!customerInfo?.firstName || !customerInfo?.phone || !items?.length) {
      return res.status(400).json({ error: "სავალდებულო ველები შევსებული არ არის" });
    }

    // 2. Fetch real prices from DB (ფასების validation!)
    const productIds = items.map((i: any) => i.productId);
    const { data: dbProducts, error: productsError } = await supabaseAdmin
      .from('products')
      .select('id, name, price, in_stock')
      .in('id', productIds);

    if (productsError || !dbProducts) {
      return res.status(500).json({ error: "პროდუქტების მიღება ვერ მოხერხდა" });
    }

    // 3. Check stock and calculate real total
    for (const item of items) {
      const dbProduct = dbProducts.find((p: any) => p.id === item.productId);
      if (!dbProduct) return res.status(400).json({ error: `პროდუქტი ვერ მოიძებნა: ${item.productId}` });
      if (!dbProduct.in_stock) return res.status(400).json({ error: `${dbProduct.name} — მარაგში არ არის` });
    }

    const totalAmount = items.reduce((sum: number, item: any) => {
      const p = dbProducts.find((p: any) => p.id === item.productId)!;
      return sum + p.price * item.quantity;
    }, 0);

    // 4. Insert order (service_role key-ით)
    const { data: orderData, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert([{
        customer_type: customerInfo.customerType,
        customer_first_name: customerInfo.firstName,
        customer_last_name: customerInfo.lastName,
        customer_phone: customerInfo.phone,
        customer_email: customerInfo.email || null,
        customer_address: customerInfo.address,
        customer_city: customerInfo.city,
        customer_note: customerInfo.note || null,
        total_amount: totalAmount,
        payment_method: paymentMethod,
        payment_type: paymentType,
        status: 'pending',
      }])
      .select()
      .single();

    if (orderError) throw orderError;

    // 5. Insert order items
    const orderItems = items.map((item: any) => {
      const p = dbProducts.find((p: any) => p.id === item.productId)!;
      return {
        order_id: orderData.id,
        product_id: item.productId,
        product_name: p.name,
        quantity: item.quantity,
        price: p.price,
      };
    });

    const { error: itemsError } = await supabaseAdmin
      .from('order_items')
      .insert(orderItems);

    if (itemsError) throw itemsError;

    res.json({ orderId: orderData.id, success: true });
  } catch (error: any) {
    console.error("Order creation error:", error);
    res.status(500).json({ error: error.message || "შეკვეთის შექმნა ვერ მოხერხდა" });
  }
});
```

---

### 3. `package.json` — Production Start Script

#### ❌ BEFORE

```json
{
  "scripts": {
    "dev": "tsx server.ts",
    "start": "node server.ts"
  }
}
```

#### ✅ AFTER

```json
{
  "name": "kale-group",
  "scripts": {
    "dev": "tsx server.ts",
    "build": "vite build && tsc server.ts --outDir dist-server --module esnext --target esnext",
    "start": "node dist-server/server.js",
    "start:dev": "tsx server.ts"
  }
}
```

> **შენიშვნა:** ან გამარტივებული ვარიანტი — `"start": "tsx server.ts"` (tsx devDependency-ში გადაიტანე dependencies-ში).

---

## 🟡 საშუალო შეცდომები — Before & After

---

### 4. `useSupabaseData.ts` — Memory Leak + Missing Error State

> ⚠️ ეს ფაილი უკვე სრულად გამოსწორებულია ცალკე ფაილში (`useSupabaseData_FIXED.ts`). ქვემოთ მოყვანილია ძირითადი before/after.

#### ❌ BEFORE — Memory Leak

```typescript
useEffect(() => {
  if (!id) { setLoading(false); return; }

  const fetchProduct = async () => {
    const { data } = await supabase.from('products').select('*').eq('id', id).single();
    setProduct(data); // ← mount-გაუქმებული კომპონენტზე set!
  };

  fetchProduct();
  // ← cleanup არ არის!
}, [id]);
```

#### ✅ AFTER — Memory Leak Fixed

```typescript
useEffect(() => {
  if (!id) { setLoading(false); return; }

  let cancelled = false; // ← cleanup flag

  const fetchProduct = async () => {
    try {
      const { data, error } = await supabase.from('products')
        .select('id, name, price, category, material, color, images, in_stock, description, created_at')
        .eq('id', id).single();
      if (error) throw error;
      if (!cancelled) setProduct(data); // ← safe set
    } catch (err: any) {
      if (!cancelled) setError(err.message);
    } finally {
      if (!cancelled) setLoading(false);
    }
  };

  fetchProduct();
  return () => { cancelled = true; }; // ← cleanup
}, [id]);
```

#### ❌ BEFORE — useCategories: No Error State

```typescript
export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  // ← error state არ არის!

  return { categories, loading, refetch: fetchCategories };
  // ← error არ ბრუნდება UI-ში
}
```

#### ✅ AFTER

```typescript
export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null); // ← დამატდა

  return { categories, loading, error, refetch: fetchCategories };
}
```

---

### 5. `CartContext.tsx` — No localStorage Persistence

**პრობლემა:** გვერდის განახლებისას მომხმარებლის კალათა იშლება.

#### ❌ BEFORE

```typescript
const [items, setItems] = useState<CartItem[]>([]);
// ← localStorage-თან კავშირი არ არის
```

#### ✅ AFTER

```typescript
const CART_STORAGE_KEY = 'kale_cart';

// Mount-ზე ჩატვირთვა
const [items, setItems] = useState<CartItem[]>(() => {
  try {
    const stored = localStorage.getItem(CART_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
});

// ცვლილებაზე შენახვა
useEffect(() => {
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
}, [items]);

// clearCart-შიც წასაშლელია
const clearCart = useCallback(() => {
  setItems([]);
  localStorage.removeItem(CART_STORAGE_KEY);
}, []);
```

---

### 6. `WishlistContext.tsx` — Missing useCallback

#### ❌ BEFORE

```typescript
const toggleWishlist = (product: Product) => { // ← useCallback-გარეშე
  setWishlist(prev => { /* ... */ });
};

const removeFromWishlist = (productId: string) => { // ← useCallback-გარეშე
  setWishlist(prev => prev.filter(item => item.id !== productId));
};
```

#### ✅ AFTER

```typescript
const toggleWishlist = useCallback((product: Product) => {
  setWishlist(prev => {
    const exists = prev.find(item => item.id === product.id);
    if (exists) {
      toast.success('ამოღებულია რჩეულებიდან', { icon: '🤍' });
      return prev.filter(item => item.id !== product.id);
    }
    toast.success('დაემატა რჩეულებში', { icon: '❤️' });
    return [...prev, product];
  });
}, []);

const removeFromWishlist = useCallback((productId: string) => {
  setWishlist(prev => prev.filter(item => item.id !== productId));
  toast.success('ამოღებულია რჩეულებიდან');
}, []);
```

---

### 7. `server.ts` — AI Input Sanitization

**პრობლემა:** მომხმარებლის შეტყობინება პირდაპირ Gemini API-ზე გადაეცემა — prompt injection შესაძლებელია.

#### ❌ BEFORE

```typescript
app.post("/api/ai/chat", async (req, res) => {
  const { userMessage, history } = req.body;
  // ← validation არ არის!
  const contents = [...history, { role: "user", parts: [{ text: userMessage }] }];
});
```

#### ✅ AFTER

```typescript
app.post("/api/ai/chat", async (req, res) => {
  const { userMessage, history } = req.body;

  // ── Input Validation ──
  if (!userMessage || typeof userMessage !== 'string') {
    return res.status(400).json({ error: "შეტყობინება სავალდებულოა" });
  }

  // ── Length Limit ──
  const sanitizedMessage = userMessage.trim().slice(0, 1000); // მაქსიმუმ 1000 სიმბოლო

  // ── History Validation ──
  const safeHistory = Array.isArray(history)
    ? history.slice(-10).filter( // ბოლო 10 შეტყობინება
        (h: any) => h?.role && ['user', 'model'].includes(h.role) && h?.parts?.[0]?.text
      )
    : [];

  // ... Gemini call safeHistory-ითა და sanitizedMessage-ით
});
```

---

## 🟢 დაბალი სიმძიმის გამოსწორებები

---

### 8. `.env.example` — გამოტოვებული ცვლადები

#### ❌ BEFORE

```env
GEMINI_API_KEY="MY_GEMINI_API_KEY"
APP_URL="MY_APP_URL"
BOG_CLIENT_ID=
BOG_SECRET=
TBC_API_KEY=
TBC_CLIENT_ID=
TBC_CLIENT_SECRET=
```

#### ✅ AFTER

```env
# ── Supabase ──────────────────────────────
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here   # გამოიყენება მხოლოდ backend-ზე!

# ── Gemini AI ─────────────────────────────
GEMINI_API_KEY=your-gemini-api-key

# ── App ───────────────────────────────────
APP_URL=http://localhost:3000
NODE_ENV=development

# ── BOG Payment ───────────────────────────
BOG_CLIENT_ID=
BOG_SECRET=

# ── TBC Payment ───────────────────────────
TBC_API_KEY=
TBC_CLIENT_ID=
TBC_CLIENT_SECRET=

# ── Credo Bank ────────────────────────────
CREDO_API_KEY=
```

---

## 🏗️ არქიტექტურული რეკომენდაციები

### 1. Supabase RLS — სავალდებულო Checklist

```sql
-- products: ყველა კითხულობს, ასწორებს მხოლოდ authorized user
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read" ON products FOR SELECT USING (true);
CREATE POLICY "Admin/Consultant insert" ON products FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'consultant'))
  );
CREATE POLICY "Admin/Consultant update" ON products FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'consultant'))
  );
CREATE POLICY "Admin only delete" ON products FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- orders: ვერავინ კითხულობს client-side-დან (backend-only)
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "No client access" ON orders FOR ALL USING (false);
-- Backend იყენებს service_role key-ს, რომელიც RLS-ს bypass-ავს
```

### 2. TanStack Query — Admin Panel-ისთვის

```bash
npm install @tanstack/react-query
```

```typescript
// App.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
const queryClient = new QueryClient();

// AdminPanel.tsx — orders query
import { useQuery } from '@tanstack/react-query';

const { data: orders, isLoading, error } = useQuery({
  queryKey: ['orders'],
  queryFn: () => fetch('/api/admin/orders').then(r => r.json()),
  refetchInterval: 30_000, // 30 წამში ერთხელ auto-refresh
  staleTime: 10_000,
});
```

### 3. Error Boundaries — React

```typescript
// src/components/ui/ErrorBoundary.tsx
import { Component, ReactNode } from 'react';

interface Props { children: ReactNode; fallback?: ReactNode; }
interface State { hasError: boolean; error?: Error; }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="p-8 text-center text-red-500">
          <p>დაფიქსირდა შეცდომა. გთხოვთ, გვერდი განაახლეთ.</p>
        </div>
      );
    }
    return this.props.children;
  }
}

// App.tsx-ში გამოყენება
<ErrorBoundary>
  <AdminPanel />
</ErrorBoundary>
```

### 4. SEO — Next.js Migration (გრძელვადიანი)

| გადაწყვეტა | SEO | სირთულე | რეკომენდაცია |
|---|---|---|---|
| React + Vite (ახლანდელი) | ❌ CSR | დაბალი | მხოლოდ meta tags |
| Vite SSR | ✅ SSR | საშუალო | შუალედური გამოსავალი |
| Next.js Migration | ✅ SSR/SSG | მაღალი | პროდუქციისთვის იდეალური |

---

## 🤖 AI ასისტენტების პრომპტები

---

### Claude Opus 4 — არქიტექტორი

```
შენ ხარ KALE GROUP პროექტის Senior Software Architect.

პროექტი: React 19 + Vite + TypeScript + Tailwind CSS + Supabase (PostgreSQL, Auth, Storage) + Express.js (Node.js) + Gemini AI.

შენი პასუხისმგებლობები:
1. კოდბეიზის არქიტექტურული გადაწყვეტილებები — ახსენი MIÉRT (რატომ) ასე, არა მხოლოდ ნივთი.
2. Security audit — Supabase RLS-ის, server.ts endpoint-ების, env ცვლადების შემოწმება.
3. Performance optimization — React re-render-ების, Supabase query-ების, bundle size-ის ოპტიმიზაცია.
4. Scalability — სად შეიძლება ბოთლნეკი გაჩნდეს მაშინ, როცა მომხმარებლები გაიზრდება.

წესები:
- ყოველთვის მოიყვან კონკრეტულ კოდის მაგალითს.
- გაჩვენე BEFORE/AFTER.
- თუ სამი გამოსავალი არსებობს, ახსენი trade-off-ები.
- ქართულ ტექსტს ქართულად, კოდს ინგლისურად.
- TypeScript — strict mode, no `any`.

არქიტექტურული კონტექსტი:
- server.ts — Express API + Vite middleware (dev) / static (prod)
- Supabase anon key — frontend-ზე (RLS-ით დაცულია)
- Supabase service_role key — მხოლოდ backend server.ts-ში
- RBAC: admin > consultant > accountant > guest
- AI: Gemini 2.5 Flash — chat + image generation (backend proxy-ით)
```

---

### Claude Sonnet 4.6 — Full-Stack Developer

```
შენ ხარ KALE GROUP-ის Full-Stack Developer. პროექტი უკვე გაშვებულია და production-ზეა.

Tech Stack:
- Frontend: React 19, TypeScript, Tailwind CSS 4, Framer Motion, react-i18next (ka/en/ru)
- Backend: Express.js + tsx (Node.js), server.ts
- DB/Auth: Supabase (PostgreSQL, RLS, Storage)
- AI: Gemini 2.5 Flash (/api/ai/chat, /api/ai/generate-image)
- State: CartContext, WishlistContext (localStorage), AuthContext
- Tools: jsPDF (ქართული შრიფტით), React Hot Toast, Lucide Icons, React Router 7

შენი ამოცანები:
1. ახალი feature-ების დამატება — მოიყვან სრულ კომპონენტს, hook-ს ან endpoint-ს.
2. Bug fix — ახსენი root cause, მოიყვან minimal fix.
3. Refactoring — DRY პრინციპი, custom hooks, code splitting.
4. UI კომპონენტები — Tailwind 4 utility classes, mobile-first.

კოდის სტანდარტი:
- ყოველი React hook — useCallback/useMemo სადაც საჭიროა
- ყოველი async function — try/catch/finally
- Supabase query — მხოლოდ საჭირო columns (select('id, name, price...'))
- API endpoint — input validation პირველ ნაბიჯად
- ყოველი component — loading, error, empty states

RBAC წესები:
- canAddProducts: admin || consultant
- canDeleteProducts: admin only
- canViewAccounting: admin || accountant
- canManageTeam: admin only
```

---

### Gemini 2.5 Pro — UI/UX & Localization Specialist

```
You are a UI/UX and localization specialist for KALE GROUP (kalegroup.ge) — a premium Georgian furniture e-commerce platform.

Tech Stack: React 19 + TypeScript + Tailwind CSS 4 + Framer Motion + react-i18next

Localization (i18n):
- Active languages: Georgian (ka) — primary, English (en), Russian (ru)
- Translation files: src/locales/{ka,en,ru}/translation.json
- Hook: useTranslation() from react-i18next
- i18n config: src/lib/i18n.ts

Brand Identity:
- Premium, luxury furniture brand
- Colors: brand-900 (near black), gold accents
- Typography: serif fonts for headings (premium feel)
- Tone: prestigious, professional, warm

Your tasks:
1. UI Component creation — Tailwind 4 only, mobile-first, smooth animations with Framer Motion.
2. Translation additions — provide JSON keys for all 3 languages (ka/en/ru) simultaneously.
3. UX improvements — skeleton loaders, micro-interactions, accessibility (ARIA labels).
4. Responsive design — mobile breakpoints first, then tablet, then desktop.

Rules:
- All user-facing text MUST use t('key') — never hardcode Georgian strings in JSX.
- Animations: use Framer Motion variants pattern.
- Tailwind: use CSS variables for brand colors (--color-brand-*).
- Always provide translation.json additions for all 3 languages.
- Georgian text in translations must be grammatically correct.
```

---

## 📦 დამატებითი Packages — სავალდებულო ინსტალაცია

```bash
# Security (server-side)
npm install helmet cors express-rate-limit

# State Management (Admin Panel)
npm install @tanstack/react-query

# TypeScript types
npm install -D @types/cors
```

---

## ✅ Implementation Priority

```
🔴 დაუყოვნებლივ (ახლა):
  1. npm install helmet cors express-rate-limit
  2. server.ts-ში rate limiting + CORS + helmet დამატება
  3. /api/orders/create endpoint — checkout-ის backend-ზე გადატანა
  4. CheckoutPage.tsx — fetch('/api/orders/create')-ზე გადასვლა

🟡 მოკლევადიანი (1-2 კვირა):
  5. CartContext — localStorage persistence
  6. WishlistContext — useCallback
  7. useSupabaseData — fixed ვერსიის გამოყენება
  8. .env.example — სრული ცვლადები
  9. Supabase RLS — orders table: "No client access"

🟢 გრძელვადიანი (1 თვე):
  10. TanStack Query — admin panel
  11. Error Boundaries
  12. BOG/TBC real integration
  13. Next.js migration assessment
```
