# 🏺 KALE GROUP — სრული ინტეგრაციის გეგმა
## ონლაინ გადახდები (BOG / TBC / Credo) + RS.GE + ბუღალტერია

> **პროექტი:** kale-group-app | React + Vite + Express + Supabase  
> **დოკუმენტი:** AI Prompt / Technical Blueprint  
> **მიზანი:** ამ დოკუმენტი მიეცი AI-ს (Antigravity) — ის განახორციელებს ყველა ინტეგრაციას

---

## 📋 კონტექსტი AI-სთვის

```
პროექტი: kale-group-app — პრემიუმ ავეჯის ე-კომერცია
Tech Stack: React 19 + Vite 6 + Express (server.ts) + Supabase + TypeScript
არსებული სტრუქტურა:
  - /src/pages/CheckoutPage.tsx — checkout გვერდი
  - /server.ts — Express backend (ყველა API აქ)
  - /src/context/CartContext.tsx — კალათა
  - Supabase ცხრილები: products, orders, order_items, profiles

დავალება: დაამატე ქვემოთ აღწერილი ყველა ინტეგრაცია სრულად.
```

---

## 🏦 ნაწილი 1 — BOG (Bank of Georgia) ინტეგრაცია

### რეგისტრაცია (ეს ხელით უნდა გაკეთდეს)
1. გადადი → `businessmanager.bog.ge`
2. გახსენი მერჩანტი ანგარიში
3. მიიღე: `client_id` + `client_secret`
4. მიუთითე Callback URL: `https://შენი-დომენი/api/pay/bog/callback`

### BOG API ენდფოინთები
| მეთოდი | URL | მიზანი |
|--------|-----|--------|
| POST | `https://oauth2.bog.ge/auth/realms/bog/protocol/openid-connect/token` | Access Token |
| POST | `https://api.bog.ge/payments/v1/ecommerce/orders` | შეკვეთის შექმნა |
| GET | `https://api.bog.ge/payments/v1/ecommerce/orders/{order_id}` | სტატუსი |
| POST | `https://api.bog.ge/payments/v1/ecommerce/orders/{order_id}/refund` | თანხის დაბრუნება |
| POST | Webhook → `/api/pay/bog/callback` | Callback |

### server.ts-ში BOG იმპლემენტაცია

```typescript
// ── BOG Payment Implementation ──

// 1. Access Token მოძიება
async function getBOGToken(): Promise<string> {
  const response = await fetch(
    'https://oauth2.bog.ge/auth/realms/bog/protocol/openid-connect/token',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: process.env.BOG_CLIENT_ID!,
        client_secret: process.env.BOG_CLIENT_SECRET!,
      }),
    }
  );
  const data = await response.json();
  return data.access_token;
}

// 2. BOG Payment შექმნა
app.post('/api/pay/bog', async (req, res) => {
  try {
    const { orderId, amount, redirectUrl } = req.body;

    if (!process.env.BOG_CLIENT_ID || !process.env.BOG_CLIENT_SECRET) {
      return res.status(503).json({ error: 'BOG გადახდა დროებით მიუწვდომელია' });
    }

    const token = await getBOGToken();

    const orderResponse = await fetch(
      'https://api.bog.ge/payments/v1/ecommerce/orders',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          callback_url: `${process.env.APP_URL}/api/pay/bog/callback`,
          external_order_id: orderId,
          purchase_units: {
            currency: 'GEL',
            total_amount: amount,
            basket: [{ quantity: 1, unit_price: amount, product_id: orderId }],
          },
          redirect_urls: {
            fail: `${redirectUrl}?status=failed`,
            success: `${redirectUrl}?status=success`,
          },
        }),
      }
    );

    const orderData = await orderResponse.json();

    if (!orderResponse.ok) {
      throw new Error(orderData.message || 'BOG შეკვეთის შექმნა ვერ მოხერხდა');
    }

    // შეინახე payment record Supabase-ში
    await supabaseAdmin.from('payments').insert({
      order_id: orderId,
      provider: 'bog',
      external_id: orderData.id,
      amount,
      status: 'pending',
    });

    res.json({
      success: true,
      redirectUrl: orderData._links.redirect.href,
    });
  } catch (error: any) {
    console.error('BOG Payment Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 3. BOG Callback (Webhook)
app.post('/api/pay/bog/callback', async (req, res) => {
  try {
    const { order_id, status, external_order_id } = req.body;

    const isSuccess = status === 'completed';

    await supabaseAdmin
      .from('payments')
      .update({
        status: isSuccess ? 'paid' : 'failed',
        callback_data: req.body,
        paid_at: isSuccess ? new Date().toISOString() : null,
      })
      .eq('external_id', order_id);

    if (isSuccess) {
      await supabaseAdmin
        .from('orders')
        .update({ status: 'confirmed', payment_status: 'paid' })
        .eq('id', external_order_id);

      // RS.GE ავტომატური ინვოისი (იხ. ნაწილი 3)
      await createRSInvoice(external_order_id);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('BOG Callback Error:', error);
    res.status(500).json({ error: 'Callback processing failed' });
  }
});
```

### BOG განვადება (Installment)
```typescript
app.post('/api/pay/bog/installment', async (req, res) => {
  try {
    const { orderId, amount, months } = req.body;
    const token = await getBOGToken();

    const response = await fetch(
      'https://api.bog.ge/loans/v1/online-installments',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          external_order_id: orderId,
          loan_amount: amount,
          campaign_id: process.env.BOG_CAMPAIGN_ID || null,
          callback_url: `${process.env.APP_URL}/api/pay/bog/installment-callback`,
          redirect_url: `${process.env.APP_URL}/payment-success?orderId=${orderId}`,
        }),
      }
    );

    const data = await response.json();
    res.json({ success: true, redirectUrl: data.redirect_url });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
```

---

## 🏦 ნაწილი 2 — TBC Bank (tpay) ინტეგრაცია

### რეგისტრაცია
1. გადადი → `tbcpayments.ge/details/ecom/tbc`
2. გახსენი მერჩანტი ანგარიში
3. მიიღე: `client_id` + `client_secret` + `apiKey`
4. ასევე გადმოტვირთე Postman Collection: `developers.tbcbank.ge`

### TBC API ენდფოინთები
| მეთოდი | URL | მიზანი |
|--------|-----|--------|
| POST | `https://api.tbcbank.ge/v1/tpay/access-token` | Token |
| POST | `https://api.tbcbank.ge/v1/tpay/payments` | გადახდის შექმნა |
| GET | `https://api.tbcbank.ge/v1/tpay/payments/{payId}` | სტატუსი |
| POST | `https://api.tbcbank.ge/v1/tpay/payments/{payId}/cancel` | გაუქმება |
| POST | Webhook → `/api/pay/tbc/callback` | Callback |

### server.ts-ში TBC იმპლემენტაცია

```typescript
// TBC Token (1 დღე მოქმედებს, cache გამოიყენე)
let tbcTokenCache: { token: string; expires: number } | null = null;

async function getTBCToken(): Promise<string> {
  if (tbcTokenCache && Date.now() < tbcTokenCache.expires) {
    return tbcTokenCache.token;
  }

  const response = await fetch('https://api.tbcbank.ge/v1/tpay/access-token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'apikey': process.env.TBC_API_KEY!,
    },
    body: new URLSearchParams({
      client_id: process.env.TBC_CLIENT_ID!,
      client_secret: process.env.TBC_CLIENT_SECRET!,
    }),
  });

  const data = await response.json();
  tbcTokenCache = {
    token: data.access_token,
    expires: Date.now() + (23 * 60 * 60 * 1000), // 23 საათი
  };
  return data.access_token;
}

// TBC გადახდა
app.post('/api/pay/tbc', async (req, res) => {
  try {
    const { orderId, amount, methods = [5] } = req.body;
    // methods: 4=QR, 5=Card, 6=Ertguli Points, 7=Internet Bank, 8=Installment, 9=Apple Pay

    if (!process.env.TBC_CLIENT_ID) {
      return res.status(503).json({ error: 'TBC გადახდა დროებით მიუწვდომელია' });
    }

    const token = await getTBCToken();

    const response = await fetch('https://api.tbcbank.ge/v1/tpay/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'apikey': process.env.TBC_API_KEY!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: { currency: 'GEL', total: amount, subTotal: amount, tax: 0, shipping: 0 },
        returnurl: `${process.env.APP_URL}/payment-success?orderId=${orderId}`,
        extra: orderId, // merchant-ის ID (max 25 chars)
        expirationMinutes: 30,
        methods,
        installmentProducts: methods.includes(8) ? [{
          Price: amount,
          Quantity: 1,
          Name: 'Kale Group შეკვეთა',
        }] : undefined,
        callbackUrl: `${process.env.APP_URL}/api/pay/tbc/callback`,
      }),
    });

    const data = await response.json();

    await supabaseAdmin.from('payments').insert({
      order_id: orderId,
      provider: 'tbc',
      external_id: data.payId,
      amount,
      status: 'pending',
    });

    // approval_url — redirect მომხმარებლისთვის
    const redirectUrl = data.links?.find((l: any) => l.rel === 'approval_url')?.uri;

    res.json({ success: true, redirectUrl, payId: data.payId });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// TBC Callback
app.post('/api/pay/tbc/callback', async (req, res) => {
  try {
    const { PayId, Status, Extra } = req.body;
    const isSuccess = Status === 'Succeeded';

    await supabaseAdmin
      .from('payments')
      .update({ status: isSuccess ? 'paid' : 'failed', callback_data: req.body, paid_at: isSuccess ? new Date().toISOString() : null })
      .eq('external_id', PayId);

    if (isSuccess) {
      await supabaseAdmin.from('orders').update({ status: 'confirmed', payment_status: 'paid' }).eq('id', Extra);
      await createRSInvoice(Extra);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    res.status(500).json({ error: 'Callback processing failed' });
  }
});
```

---

## 🏦 ნაწილი 2B — Credo Bank განვადება

### რეგისტრაცია
- დაუკავშირდი Credo Bank-ს პირდაპირ: `credobank.ge`
- სთხოვე Online Installment API წვდომა

```typescript
app.post('/api/pay/credo', async (req, res) => {
  try {
    const { orderId, items, totalAmount } = req.body;

    if (!process.env.CREDO_API_KEY) {
      return res.status(503).json({ error: 'Credo განვადება დროებით მიუწვდომელია' });
    }

    const response = await fetch('https://api.credobank.ge/v1/installments/initiate', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.CREDO_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        merchant_order_id: orderId,
        amount: totalAmount,
        currency: 'GEL',
        items: items.map((i: any) => ({
          name: i.product_name,
          quantity: i.quantity,
          price: i.price_at_purchase,
        })),
        callback_url: `${process.env.APP_URL}/api/pay/credo/callback`,
        success_url: `${process.env.APP_URL}/payment-success?orderId=${orderId}`,
        fail_url: `${process.env.APP_URL}/checkout?error=payment_failed`,
      }),
    });

    const data = await response.json();

    await supabaseAdmin.from('payments').insert({
      order_id: orderId,
      provider: 'credo',
      external_id: data.application_id,
      amount: totalAmount,
      status: 'pending',
      payment_type: 'installment',
    });

    res.json({ success: true, redirectUrl: data.redirect_url });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
```

---

## 🏛️ ნაწილი 3 — RS.GE სრული ინტეგრაცია

### RS.GE Web Services — ტექნიკური დეტალები

RS.GE გთავაზობს **SOAP Web Services**-ს შემდეგი სერვისებისთვის:
- **eანგარიშ-ფაქტურა** (ელ. ინვოისი) — დღგ გადამხდელებისთვის სავალდებულო
- **eზედნადები** (სასაქონლო ზედნადები) — საქონლის გადაადგილებისთვის

### RS.GE API Endpoints

```
ა/ფაქტურა WSDL:
https://eservices.rs.ge/ws/invoice.asmx?WSDL

ზედნადები WSDL:
https://eservices.rs.ge/ws/overhead.asmx?WSDL
```

### RS.GE ინვოისის მთავარი მეთოდები

| მეთოდი | პარამეტრები | მიზანი |
|--------|------------|--------|
| `save_invoice` | seller_un_id, buyer_un_id, goods[], amount | ინვოისის შექმნა |
| `send_invoice` | inv_id, user_id, su, sp | ინვოისის გაგზავნა მყიდველთან |
| `get_invoice_status` | inv_id, su, sp | სტატუსის მოძიება |
| `delete_invoice` | inv_id, su, sp | ინვოისის წაშლა |
| `save_ntos_invoices_inv_nos` | invois_id, overhead_no | ზედნადების მიბმა ინვოისზე |

### server.ts-ში RS.GE იმპლემენტაცია

```typescript
import * as soap from 'soap'; // npm install soap

const RS_WSDL_INVOICE = 'https://eservices.rs.ge/ws/invoice.asmx?WSDL';
const RS_WSDL_OVERHEAD = 'https://eservices.rs.ge/ws/overhead.asmx?WSDL';

// RS.GE ინვოისის ავტომატური შექმნა გადახდის შემდეგ
async function createRSInvoice(orderId: string): Promise<void> {
  try {
    if (!process.env.RS_USERNAME || !process.env.RS_PASSWORD) {
      console.warn('RS.GE credentials not configured — skipping invoice creation');
      return;
    }

    // 1. შეკვეთის მონაცემების მიღება
    const { data: order } = await supabaseAdmin
      .from('orders')
      .select(`*, order_items(*, products(*))`)
      .eq('id', orderId)
      .single();

    if (!order) throw new Error(`Order not found: ${orderId}`);

    // 2. SOAP Client შექმნა
    const client = await soap.createClientAsync(RS_WSDL_INVOICE);

    // 3. ინვოისის შექმნა
    const invoiceArgs = {
      su: process.env.RS_USERNAME,        // RS.GE მომხმარებლის სახელი
      sp: process.env.RS_PASSWORD,        // RS.GE პაროლი
      seller_un_id: process.env.RS_COMPANY_ID,  // გამყიდველის საიდენტიფიკაციო კოდი
      buyer_un_id: order.company_id || order.personal_id,  // მყიდველის ID
      buyer_type: order.customer_type === 'legal' ? 1 : 0,  // 0=ფიზიკური, 1=იურიდიული
      currency: 'GEL',
      deal_type: 1,  // 1=ჩვეულებრივი გაყიდვა
      goods: order.order_items.map((item: any) => ({
        barcode: item.products.id,
        name: item.products.name,
        quantity: item.quantity,
        price: item.price_at_purchase,
        vat: item.price_at_purchase * item.quantity * 0.18,  // 18% დღგ
        total: item.price_at_purchase * item.quantity,
      })),
      total_amount: order.total_price,
      total_vat: order.total_price * 0.18,
    };

    const [saveResult] = await client.save_invoiceAsync(invoiceArgs);
    const invoiceId = saveResult?.save_invoiceResult;

    if (!invoiceId) throw new Error('RS.GE: ინვოისის ID ვერ მიღებულა');

    // 4. ინვოისის გაგზავნა
    const [sendResult] = await client.send_invoiceAsync({
      su: process.env.RS_USERNAME,
      sp: process.env.RS_PASSWORD,
      inv_id: invoiceId,
      user_id: process.env.RS_USER_ID,
    });

    // 5. Supabase-ში ჩაწერა
    await supabaseAdmin.from('rs_invoices').insert({
      order_id: orderId,
      rs_invoice_id: invoiceId,
      status: sendResult ? 'sent' : 'saved',
      invoice_data: invoiceArgs,
      created_at: new Date().toISOString(),
    });

    console.log(`RS.GE Invoice created: ${invoiceId} for order: ${orderId}`);
  } catch (error) {
    console.error('RS.GE Invoice Error:', error);
    // არ ვასვენებთ მთავარ flow-ს — ინვოისი შეიძლება ხელით შეიქმნას
    await supabaseAdmin.from('rs_invoice_errors').insert({
      order_id: orderId,
      error: String(error),
      created_at: new Date().toISOString(),
    });
  }
}

// ზედნადები (Waybill)
async function createRSWaybill(orderId: string, waybillData: any): Promise<void> {
  try {
    const client = await soap.createClientAsync(RS_WSDL_OVERHEAD);

    const args = {
      su: process.env.RS_USERNAME,
      sp: process.env.RS_PASSWORD,
      seller_un_id: process.env.RS_COMPANY_ID,
      buyer_un_id: waybillData.buyerUnId,
      transport_type: 1,  // 1=ავტო
      start_address: 'თბილისი, ...',
      end_address: waybillData.deliveryAddress,
      goods: waybillData.items.map((item: any) => ({
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        barcode: item.id,
      })),
    };

    const [result] = await client.save_overheadAsync(args);
    const waybillId = result?.save_overheadResult;

    await supabaseAdmin.from('rs_waybills').insert({
      order_id: orderId,
      rs_waybill_id: waybillId,
      status: 'created',
    });
  } catch (error) {
    console.error('RS.GE Waybill Error:', error);
  }
}

// Admin endpoint — ინვოისის ხელახლა გამოგზავნა
app.post('/api/admin/rs/reinvoice/:orderId', async (req, res) => {
  try {
    const user = await getUserFromToken(req);
    if (!user || !(await isUserAdmin(user.id))) {
      return res.status(403).json({ error: 'წვდომა აკრძალულია' });
    }

    await createRSInvoice(req.params.orderId);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Admin endpoint — ზედნადების შექმნა
app.post('/api/admin/rs/waybill/:orderId', async (req, res) => {
  try {
    const user = await getUserFromToken(req);
    if (!user || !(await isUserAdmin(user.id))) {
      return res.status(403).json({ error: 'წვდომა აკრძალულია' });
    }

    await createRSWaybill(req.params.orderId, req.body);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
```

---

## 🗄️ ნაწილი 4 — Supabase ცხრილები (SQL)

```sql
-- ════════════════════════════════════════════════
-- 1. PAYMENTS — ყველა გადახდის ტრანზაქცია
-- ════════════════════════════════════════════════
CREATE TABLE payments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  provider        TEXT NOT NULL CHECK (provider IN ('bog', 'tbc', 'credo', 'cash', 'transfer')),
  payment_type    TEXT NOT NULL DEFAULT 'full' CHECK (payment_type IN ('full', 'installment', 'preauth')),
  external_id     TEXT,                          -- BOG/TBC-ის transaction ID
  amount          NUMERIC(10,2) NOT NULL,
  currency        TEXT NOT NULL DEFAULT 'GEL',
  status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'paid', 'failed', 'refunded', 'cancelled')),
  callback_data   JSONB,                         -- Raw callback payload
  paid_at         TIMESTAMPTZ,
  refunded_at     TIMESTAMPTZ,
  refund_reason   TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ════════════════════════════════════════════════
-- 2. RS_INVOICES — RS.GE ანგარიშ-ფაქტურები
-- ════════════════════════════════════════════════
CREATE TABLE rs_invoices (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        UUID NOT NULL REFERENCES orders(id),
  rs_invoice_id   TEXT,                          -- RS.GE-ს მინიჭებული ID
  status          TEXT DEFAULT 'pending'
                    CHECK (status IN ('pending', 'saved', 'sent', 'confirmed', 'cancelled', 'error')),
  invoice_data    JSONB,                         -- გაგზავნილი payload
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ════════════════════════════════════════════════
-- 3. RS_WAYBILLS — RS.GE სასაქონლო ზედნადები
-- ════════════════════════════════════════════════
CREATE TABLE rs_waybills (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        UUID REFERENCES orders(id),
  rs_waybill_id   TEXT,
  transport_type  INT DEFAULT 1,                 -- 1=ავტო, 2=საჰაერო, 3=საზღვაო
  start_address   TEXT,
  end_address     TEXT,
  driver_name     TEXT,
  car_number      TEXT,
  status          TEXT DEFAULT 'created'
                    CHECK (status IN ('created', 'activated', 'closed', 'deleted')),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ════════════════════════════════════════════════
-- 4. RS_INVOICE_ERRORS — შეცდომების ლოგი
-- ════════════════════════════════════════════════
CREATE TABLE rs_invoice_errors (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id   UUID REFERENCES orders(id),
  error      TEXT,
  resolved   BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ════════════════════════════════════════════════
-- 5. ORDERS ცხრილის განახლება
-- ════════════════════════════════════════════════
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'unpaid'
  CHECK (payment_status IN ('unpaid', 'paid', 'refunded', 'partial'));

ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_provider TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS invoice_status TEXT DEFAULT 'pending'
  CHECK (invoice_status IN ('pending', 'issued', 'error', 'not_required'));

-- ════════════════════════════════════════════════
-- 6. ACCOUNTING — ბუღალტრული ჩანაწერები
-- ════════════════════════════════════════════════
CREATE TABLE accounting_entries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_type      TEXT NOT NULL CHECK (entry_type IN ('sale', 'refund', 'expense', 'tax', 'commission')),
  order_id        UUID REFERENCES orders(id),
  payment_id      UUID REFERENCES payments(id),
  amount          NUMERIC(10,2) NOT NULL,
  vat_amount      NUMERIC(10,2) DEFAULT 0,       -- 18% დღგ
  net_amount      NUMERIC(10,2),                 -- amount - vat
  description     TEXT,
  period_month    INT,                           -- 1-12
  period_year     INT,
  created_by      UUID REFERENCES profiles(id),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ════════════════════════════════════════════════
-- 7. DAILY/MONTHLY REPORTS VIEW
-- ════════════════════════════════════════════════
CREATE OR REPLACE VIEW accounting_summary AS
SELECT
  DATE_TRUNC('month', p.paid_at)    AS month,
  COUNT(DISTINCT p.id)              AS total_transactions,
  COUNT(DISTINCT o.id)              AS total_orders,
  SUM(p.amount)                     AS gross_revenue,
  SUM(p.amount * 0.18)              AS vat_amount,
  SUM(p.amount * 0.82)              AS net_revenue,
  SUM(CASE WHEN p.provider = 'bog' THEN p.amount ELSE 0 END) AS bog_revenue,
  SUM(CASE WHEN p.provider = 'tbc' THEN p.amount ELSE 0 END) AS tbc_revenue,
  SUM(CASE WHEN p.provider = 'credo' THEN p.amount ELSE 0 END) AS credo_revenue,
  SUM(CASE WHEN p.payment_type = 'installment' THEN p.amount ELSE 0 END) AS installment_revenue
FROM payments p
JOIN orders o ON p.order_id = o.id
WHERE p.status = 'paid'
GROUP BY DATE_TRUNC('month', p.paid_at)
ORDER BY month DESC;

-- ════════════════════════════════════════════════
-- 8. ROW LEVEL SECURITY
-- ════════════════════════════════════════════════
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE rs_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE rs_waybills ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounting_entries ENABLE ROW LEVEL SECURITY;

-- payments — admin/accountant ნებისმიერი, consultant — read only
CREATE POLICY "admin_full_payments" ON payments
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'accountant'))
  );

CREATE POLICY "consultant_read_payments" ON payments
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'consultant')
  );

-- rs_invoices — admin/accountant ნებისმიერი
CREATE POLICY "admin_rs_invoices" ON rs_invoices
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'accountant'))
  );
```

---

## 🖥️ ნაწილი 5 — Frontend ცვლილებები

### CheckoutPage.tsx — გადახდის მეთოდების UI

```typescript
// src/pages/CheckoutPage.tsx-ში დაამატე:

type PaymentProvider = 'bog' | 'tbc' | 'credo';
type PaymentType = 'full' | 'installment';

const handlePayment = async (provider: PaymentProvider, type: PaymentType) => {
  setIsProcessing(true);
  try {
    // 1. შეკვეთის შექმნა
    const orderResponse = await fetch('/api/orders/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerInfo,
        items: items.map(i => ({ product: { id: i.product.id }, quantity: i.quantity })),
        paymentMethod: provider,
        paymentType: type,
      }),
    });

    if (!orderResponse.ok) {
      const err = await orderResponse.json();
      throw new Error(err.error);
    }

    const { orderId, total_price } = await orderResponse.json();

    // 2. გადახდის ინიცირება
    let endpoint = `/api/pay/${provider}`;
    if (type === 'installment' && provider !== 'credo') {
      endpoint = `/api/pay/${provider}/installment`;
    }

    const payResponse = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId,
        amount: total_price,
        // TBC-სთვის: methods: type === 'installment' ? [8] : [5, 4, 9]
        methods: provider === 'tbc'
          ? (type === 'installment' ? [8] : [5, 4, 7, 9])
          : undefined,
        items: items.map(i => ({
          product_name: i.product.name,
          quantity: i.quantity,
          price_at_purchase: i.product.price,
        })),
        redirectUrl: `${window.location.origin}/payment-success?orderId=${orderId}`,
      }),
    });

    const payData = await payResponse.json();

    if (!payResponse.ok) throw new Error(payData.error);

    clearCart();
    // მომხმარებელს გადავამისამართებ ბანკის გვერდზე
    window.location.href = payData.redirectUrl;
  } catch (error: any) {
    toast.error(error.message || 'გადახდის პროცესი ვერ განხორციელდა');
  } finally {
    setIsProcessing(false);
  }
};
```

---

## 📊 ნაწილი 6 — Admin Panel — ბუღალტერიის მოდული

```typescript
// src/components/admin/AccountingModule.tsx

// ეს კომპონენტი AdminPanel-ში დაამატე ახალ ჩანართად

// ფუნქციები:
// 1. ყოველთვიური შემოსავლების სტატისტიკა (accounting_summary view-დან)
// 2. გადახდების სია ფილტრებით (provider, status, თარიღი, თანხა)
// 3. RS.GE ინვოისების სტატუსი (გამოწერილი / გაუგზავნელი / შეცდომა)
// 4. ხელახლა გაგზავნის ღილაკი შეცდომებისთვის
// 5. PDF ექსპორტი (ყოველთვიური ანგარიში bухгалтერისთვის)
// 6. Excel ექსპორტი (ტრანზაქციების სია)

const AccountingModule = () => {
  const [summary, setSummary] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [rsErrors, setRsErrors] = useState<any[]>([]);

  // ბუღალტრული ანგარიშის PDF ექსპორტი
  const exportMonthlyReport = async (month: string) => {
    const response = await fetch(`/api/admin/accounting/export?month=${month}`, {
      headers: { Authorization: `Bearer ${session?.access_token}` },
    });
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kale-group-accounting-${month}.pdf`;
    a.click();
  };

  return (
    // UI კომპონენტები:
    // - DashboardMetrics-ის მსგავსი ბარათები (გამოსახე accounting_summary view-ს მონაცემები)
    // - ცხრილი payments ცხრილიდან (ბოლო 100 ტრანზაქცია)
    // - RS.GE ინვოისების სტატუსი + ხელახლა გაგზავნის ღილაკი
    // - ყოველთვიური PDF ექსპორტი (jspdf + autotable)
    <div>...</div>
  );
};
```

---

## ⚙️ ნაწილი 7 — .env.example (განახლებული)

```env
# ── Supabase ──────────────────────────────────────────
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# ── Gemini AI ──────────────────────────────────────────
GEMINI_API_KEY=AIzaSy...

# ── App ────────────────────────────────────────────────
APP_URL=http://localhost:3000
NODE_ENV=development

# ── BOG (Bank of Georgia) ──────────────────────────────
# მიიღე: businessmanager.bog.ge → API Management
BOG_CLIENT_ID=
BOG_CLIENT_SECRET=
BOG_CAMPAIGN_ID=            # განვადების კამპანიის ID (სურვილისამებრ)

# ── TBC Bank ───────────────────────────────────────────
# მიიღე: developers.tbcbank.ge → My Apps
TBC_API_KEY=
TBC_CLIENT_ID=
TBC_CLIENT_SECRET=

# ── Credo Bank ─────────────────────────────────────────
# მიიღე: credobank.ge → B2B განვადება
CREDO_API_KEY=

# ── RS.GE (შემოსავლების სამსახური) ────────────────────
# მიიღე: eservices.rs.ge → ვებ-სერვისების მომხმარებელი
RS_USERNAME=                # ვებ-სერვისის მომხმარებელი (≠ ვებ-გვერდის)
RS_PASSWORD=                # ვებ-სერვისის პაროლი
RS_USER_ID=                 # ელ.დეკლარირების user_id
RS_COMPANY_ID=              # კომპანიის საიდენტიფიკაციო კოდი
```

---

## 📦 ნაწილი 8 — Dependencies

```bash
npm install soap           # RS.GE SOAP API-სთვის
npm install xlsx           # Excel ექსპორტისთვის (ბუღალტერია)
```

---

## 🗺️ განხორციელების გეგმა (Phase by Phase)

### Phase 1 — ინფრასტრუქტურა (ახლა)
- [ ] Supabase-ში ყველა ცხრილი შეიქმნა (SQL ნაწილი 4)
- [ ] `.env.example` განახლდა
- [ ] `npm install soap xlsx`

### Phase 2 — BOG (პირველი)
- [ ] BOG Merchant ანგარიშის გახსნა
- [ ] server.ts-ში BOG კოდი დაემატა
- [ ] Callback URL კონფიგურაცია
- [ ] Sandbox-ში ტესტი

### Phase 3 — TBC
- [ ] TBC Merchant ანგარიშის გახსნა
- [ ] server.ts-ში TBC კოდი დაემატა
- [ ] Token cache განხორციელება
- [ ] Sandbox-ში ტესტი

### Phase 4 — RS.GE
- [ ] RS.GE ვებ-სერვისის მომხმარებელი
- [ ] SOAP integration
- [ ] ავტომატური ინვოისი გადახდის შემდეგ
- [ ] Admin panel-ში ინვოისების მართვა

### Phase 5 — Credo
- [ ] Credo-სთან კომუნიკაცია
- [ ] განვადების integration

### Phase 6 — ბუღალტერიის მოდული
- [ ] AccountingModule კომპონენტი
- [ ] ყოველთვიური ანგარიში
- [ ] PDF/Excel ექსპორტი

---

## 🔗 სასარგებლო ბმულები

| სერვისი | Dashboard | API Docs |
|---------|-----------|----------|
| BOG | businessmanager.bog.ge | api.bog.ge/docs/en |
| TBC | tbcpayments.ge | developers.tbcbank.ge |
| Credo | credobank.ge | (პირდაპირი კონტაქტი) |
| RS.GE | eservices.rs.ge | eservices.rs.ge/Docs/invoice-protocol.pdf |
| RS.GE სასწავლო | e.rs.ge (test) | — |
