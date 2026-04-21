import { Router } from "express";
import { supabaseAdmin } from "../services/supabase.service.js";
import { 
  getBOGToken, 
  verifyBogCallback, 
  verifyTbcCallback,
  verifyCredoCallback,
  verifyPaymentExists, 
  processSuccessfulOrder,
  getTBCToken,
  getClientIp
} from "../services/payment.service.js";

const router = Router();

// ══════════════════════════════════════════════
// ── BOG (Bank of Georgia) Payment Integration ──
// ══════════════════════════════════════════════

router.post("/bog", async (req: any, res) => {
  try {
    const { orderId, redirectUrl } = req.body;

    // Server-side amount validation
    const { data: orderRow, error: orderErr } = await supabaseAdmin
      .from('orders')
      .select('id, total_price, payment_status')
      .eq('id', orderId)
      .maybeSingle();

    if (orderErr || !orderRow) {
      return res.status(404).json({ error: 'შეკვეთა ვერ მოიძებნა.' });
    }
    if (orderRow.payment_status === 'paid') {
      return res.status(409).json({ error: 'ეს შეკვეთა უკვე გადახდილია.' });
    }

    const authoritativeAmount = Number(orderRow.total_price);
    if (!Number.isFinite(authoritativeAmount) || authoritativeAmount <= 0) {
      return res.status(400).json({ error: 'არასწორი თანხა შეკვეთაში.' });
    }

    if (!process.env.BOG_CLIENT_ID || !process.env.BOG_CLIENT_SECRET) {
      return res.status(503).json({ error: 'BOG გადახდა დროებით მიუწვდომელია' });
    }

    const token = await getBOGToken();

    const isDev = !process.env.NODE_ENV || process.env.NODE_ENV === 'development';
    const baseUrl = isDev ? 'https://kalegroup.vercel.app' : (process.env.APP_URL || 'https://kalegroup.ge').replace(/^http:/, 'https:');
    const safeRedirectUrl = isDev ? 'https://kalegroup.vercel.app' : (redirectUrl || baseUrl).replace(/^http:/, 'https:');

    const orderResponse = await fetch(
      'https://api.bog.ge/payments/v1/ecommerce/orders',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept-Language': 'ka',
        },
        body: JSON.stringify({
          callback_url: `${baseUrl}/api/pay/bog/callback`,
          external_order_id: orderId,
          purchase_units: {
            currency: 'GEL',
            total_amount: authoritativeAmount,
            basket: [{ quantity: 1, unit_price: authoritativeAmount, product_id: orderId }],
          },
          redirect_urls: {
            fail: `${safeRedirectUrl}/payment/success?orderId=${orderId}&status=failed`,
            success: `${safeRedirectUrl}/payment/success?orderId=${orderId}`,
          },
        }),
      }
    );

    const orderData = await orderResponse.json();

    if (!orderResponse.ok) {
      throw new Error(orderData.message || 'BOG შეკვეთის შექმნა ვერ მოხერხდა');
    }

    await supabaseAdmin.from('payments').insert({
      order_id: orderId,
      provider: 'bog',
      external_id: orderData.id,
      amount: authoritativeAmount,
      status: 'pending',
    });

    res.json({
      success: true,
      redirectUrl: orderData._links?.redirect?.href,
    });
  } catch (error: any) {
    console.error('BOG Payment Error:', error);
    res.status(500).json({ error: error.message || 'BOG გადახდის ინიცირება ვერ მოხერხდა' });
  }
});

router.post("/bog/callback", async (req: any, res) => {
  try {
    if (!verifyBogCallback(req)) {
      console.error('[BOG Callback] Signature verification FAILED from IP:', getClientIp(req));
      return res.status(403).json({ error: 'Invalid callback signature' });
    }

    const { order_id, status, external_order_id } = req.body;

    const paymentValid = await verifyPaymentExists(order_id, 'bog');
    if (!paymentValid) {
      console.error('[BOG Callback] Unknown payment external_id:', order_id);
      return res.status(404).json({ error: 'Payment not found' });
    }

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
      await processSuccessfulOrder(external_order_id, 'bog');
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('BOG Callback Error:', error);
    res.status(500).json({ error: 'Callback processing failed' });
  }
});

router.post("/bog/installment", async (req: any, res) => {
  try {
    const { orderId } = req.body;

    // Server-side amount validation
    const { data: orderRow, error: orderErr } = await supabaseAdmin
      .from('orders')
      .select('id, total_price, payment_status')
      .eq('id', orderId)
      .maybeSingle();

    if (orderErr || !orderRow) {
      return res.status(404).json({ error: 'შეკვეთა ვერ მოიძებნა.' });
    }
    if (orderRow.payment_status === 'paid') {
      return res.status(409).json({ error: 'ეს შეკვეთა უკვე გადახდილია.' });
    }

    const authoritativeAmount = Number(orderRow.total_price);
    if (!Number.isFinite(authoritativeAmount) || authoritativeAmount <= 0) {
      return res.status(400).json({ error: 'არასწორი თანხა შეკვეთაში.' });
    }

    if (!process.env.BOG_CLIENT_ID || !process.env.BOG_CLIENT_SECRET) {
      return res.status(503).json({ error: 'BOG განვადება დროებით მიუწვდომელია' });
    }

    const token = await getBOGToken();

    const isDev = !process.env.NODE_ENV || process.env.NODE_ENV === 'development';
    const baseUrl = isDev ? 'https://kalegroup.vercel.app' : (process.env.APP_URL || 'https://kalegroup.ge').replace(/^http:/, 'https:');

    const response = await fetch(
      'https://api.bog.ge/loans/v1/online-installments',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept-Language': 'ka',
        },
        body: JSON.stringify({
          external_order_id: orderId,
          loan_amount: authoritativeAmount,
          campaign_id: process.env.BOG_CAMPAIGN_ID || null,
          callback_url: `${baseUrl}/api/pay/bog/callback`,
          redirect_url: `${baseUrl}/payment/success?orderId=${orderId}`,
        }),
      }
    );

    const data = await response.json();

    await supabaseAdmin.from('payments').insert({
      order_id: orderId,
      provider: 'bog',
      external_id: data.id || data.application_id,
      amount: authoritativeAmount,
      payment_type: 'installment',
      status: 'pending',
    });

    res.json({ success: true, redirectUrl: data.redirect_url });
  } catch (error: any) {
    console.error('BOG Installment Error:', error);
    res.status(500).json({ error: error.message || 'BOG განვადების ინიცირება ვერ მოხერხდა' });
  }
});

// ══════════════════════════════════════════════
// ── TBC Bank (tpay) Payment Integration ──
// ══════════════════════════════════════════════

router.post("/tbc", async (req: any, res) => {
  try {
    const { orderId, amount, methods = [5] } = req.body;

    if (!process.env.TBC_CLIENT_ID || !process.env.TBC_API_KEY || !process.env.TBC_CLIENT_SECRET) {
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
        returnurl: `${process.env.APP_URL || 'http://localhost:3000'}/payment/success?orderId=${orderId}`,
        extra: orderId,
        expirationMinutes: 30,
        methods,
        installmentProducts: methods.includes(8) ? [{
          Price: amount,
          Quantity: 1,
          Name: 'Kale Group შეკვეთა',
        }] : undefined,
        callbackUrl: `${process.env.APP_URL || 'http://localhost:3000'}/api/pay/tbc/callback`,
      }),
    });

    const data = await response.json();

    await supabaseAdmin.from('payments').insert({
      order_id: orderId,
      provider: 'tbc',
      external_id: data.payId,
      amount,
      payment_type: methods.includes(8) ? 'installment' : 'full',
      status: 'pending',
    });

    const paymentRedirectUrl = data.links?.find((l: any) => l.rel === 'approval_url')?.uri;

    res.json({ success: true, redirectUrl: paymentRedirectUrl, payId: data.payId });
  } catch (error: any) {
    console.error('TBC Payment Error:', error);
    res.status(500).json({ error: error.message || 'TBC გადახდის ინიცირება ვერ მოხერხდა' });
  }
});

router.post("/tbc/callback", async (req: any, res) => {
  try {
    if (!verifyTbcCallback(req)) {
      return res.status(403).json({ error: 'Invalid callback origin' });
    }
    const { PayId, Status, Extra } = req.body;

    const paymentValid = await verifyPaymentExists(PayId, 'tbc');
    if (!paymentValid) {
      console.error('[TBC Callback] Unknown payment PayId:', PayId);
      return res.status(404).json({ error: 'Payment not found' });
    }

    const isSuccess = Status === 'Succeeded';

    await supabaseAdmin
      .from('payments')
      .update({
        status: isSuccess ? 'paid' : 'failed',
        callback_data: req.body,
        paid_at: isSuccess ? new Date().toISOString() : null,
      })
      .eq('external_id', PayId);

    if (isSuccess) {
      await processSuccessfulOrder(Extra, 'tbc');
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('TBC Callback Error:', error);
    res.status(500).json({ error: 'Callback processing failed' });
  }
});

// ══════════════════════════════════════════════
// ── Credo Bank განვადება ──
// ══════════════════════════════════════════════

router.post("/credo", async (req: any, res) => {
  try {
    const { orderId, items, amount } = req.body;

    if (!process.env.CREDO_API_KEY) {
      return res.status(503).json({ error: 'Credo განვადება დროებით მიუწვდომელია' });
    }

    const isDevEnv = !process.env.NODE_ENV || process.env.NODE_ENV === 'development';
    const credoBaseUrl = isDevEnv ? 'https://kalegroup.vercel.app' : (process.env.APP_URL || 'https://kale-group.ge').replace(/^http:/, 'https:');

    const response = await fetch('https://api.credobank.ge/v1/installments/initiate', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.CREDO_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        merchant_order_id: orderId,
        amount,
        currency: 'GEL',
        items: items?.map((i: any) => ({
          name: i.product_name,
          quantity: i.quantity,
          price: i.price_at_purchase || i.price,
        })) || [],
        callback_url: `${credoBaseUrl}/api/pay/credo/callback`,
        success_url: `${credoBaseUrl}/payment/success?orderId=${orderId}`,
        fail_url: `${credoBaseUrl}/checkout?error=payment_failed`,
      }),
    });

    const data = await response.json();

    await supabaseAdmin.from('payments').insert({
      order_id: orderId,
      provider: 'credo',
      external_id: data.application_id,
      amount,
      payment_type: 'installment',
      status: 'pending',
    });

    res.json({ success: true, redirectUrl: data.redirect_url });
  } catch (error: any) {
    console.error('Credo Payment Error:', error);
    res.status(500).json({ error: error.message || 'Credo განვადების ინიცირება ვერ მოხერხდა' });
  }
});

router.post("/credo/callback", async (req: any, res) => {
  try {
    if (!verifyCredoCallback(req)) {
      return res.status(403).json({ error: 'Invalid callback origin' });
    }
    const { application_id, status, merchant_order_id } = req.body;

    const paymentValid = await verifyPaymentExists(application_id, 'credo');
    if (!paymentValid) {
      console.error('[Credo Callback] Unknown payment application_id:', application_id);
      return res.status(404).json({ error: 'Payment not found' });
    }

    const isSuccess = status === 'approved' || status === 'completed';

    await supabaseAdmin
      .from('payments')
      .update({
        status: isSuccess ? 'paid' : 'failed',
        callback_data: req.body,
        paid_at: isSuccess ? new Date().toISOString() : null,
      })
      .eq('external_id', application_id);

    if (isSuccess) {
      await processSuccessfulOrder(merchant_order_id, 'credo');
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Credo Callback Error:', error);
    res.status(500).json({ error: 'Callback processing failed' });
  }
});

export default router;
