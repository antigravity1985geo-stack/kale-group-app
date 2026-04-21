import crypto from "crypto";
import { supabaseAdmin } from "./supabase.service.js";

// Helper: Extract client IP
export function getClientIp(req: any): string {
  return (
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.connection?.remoteAddress ||
    req.ip ||
    ''
  );
}

// ── Bank IP Allowlists (defense-in-depth pending API keys) ──
const TBC_ALLOWED_IPS = (process.env.TBC_ALLOWED_IPS || "").split(",").map(s => s.trim()).filter(Boolean);
const CREDO_ALLOWED_IPS = (process.env.CREDO_ALLOWED_IPS || "").split(",").map(s => s.trim()).filter(Boolean);

export function verifyTbcCallback(req: any): boolean {
  if (TBC_ALLOWED_IPS.length === 0) {
    console.error('[TBC Callback] CRITICAL: TBC_ALLOWED_IPS not configured. Rejecting for safety.');
    return false;
  }
  const ip = getClientIp(req);
  const ok = TBC_ALLOWED_IPS.includes(ip);
  if (!ok) console.error(`[TBC Callback] REJECTED: IP ${ip} not in allowlist`);
  return ok;
}

export function verifyCredoCallback(req: any): boolean {
  if (CREDO_ALLOWED_IPS.length === 0) {
    console.error('[Credo Callback] CRITICAL: CREDO_ALLOWED_IPS not configured. Rejecting for safety.');
    return false;
  }
  const ip = getClientIp(req);
  const ok = CREDO_ALLOWED_IPS.includes(ip);
  if (!ok) console.error(`[Credo Callback] REJECTED: IP ${ip} not in allowlist`);
  return ok;
}

// BOG Webhook Verification (RSA-SHA256)
export function verifyBogCallback(req: any): boolean {
  const pubKey = process.env.BOG_PUBLIC_KEY;
  if (!pubKey) {
    console.error('[BOG] BOG_PUBLIC_KEY is not set — refusing to verify callback');
    return false;
  }

  const signatureB64 = req.headers['callback-signature'] || req.headers['Callback-Signature'];
  if (!signatureB64 || typeof signatureB64 !== 'string') {
    console.warn('[BOG] Missing Callback-Signature header');
    return false;
  }

  const rawBody: Buffer | undefined = req.rawBody;
  if (!rawBody || !Buffer.isBuffer(rawBody)) {
    console.error('[BOG] req.rawBody missing — server.ts verify() hook not wired');
    return false;
  }

  try {
    const verifier = crypto.createVerify('RSA-SHA256');
    verifier.update(rawBody);
    verifier.end();
    const ok = verifier.verify(pubKey.replace(/\\n/g, '\n'), signatureB64, 'base64');
    if (!ok) console.warn('[BOG] RSA signature verification FAILED');
    return ok;
  } catch (err) {
    console.error('[BOG] Signature verification error:', err);
    return false;
  }
}

// Verify Payment Exists in DB
export async function verifyPaymentExists(externalId: string, provider: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from('payments')
    .select('id')
    .eq('external_id', externalId)
    .eq('provider', provider)
    .eq('status', 'pending')
    .single();
  return !!data;
}

// BOG Token Generation
export async function getBOGToken(): Promise<string> {
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
  if (!data.access_token) throw new Error('BOG Token მიღება ვერ მოხერხდა');
  return data.access_token;
}

// TBC Token Generation
let tbcTokenCache: { token: string; expires: number } | null = null;
export async function getTBCToken(): Promise<string> {
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
  if (!data.access_token) throw new Error('TBC Token მიღება ვერ მოხერხდა');

  tbcTokenCache = {
    token: data.access_token,
    expires: Date.now() + (23 * 60 * 60 * 1000), // 23 საათი
  };
  return data.access_token;
}

// Process Successful Order (Accounting & Inventory)
export async function processSuccessfulOrder(orderId: string, provider: string): Promise<void> {
  try {
    const { data: order } = await supabaseAdmin
      .from('orders')
      .select(`*, order_items(*, products(category, cost_price))`)
      .eq('id', orderId)
      .single();

    if (!order) return;

    const { data: existingJournal } = await supabaseAdmin
      .from('journal_entries')
      .select('id')
      .eq('reference_type', 'SALES_ORDER')
      .eq('reference_id', orderId)
      .maybeSingle();
      
    if (existingJournal) return; // Already processed

    const { data: vatSetting, error: settingsError } = await supabaseAdmin
      .from('company_settings')
      .select('value')
      .eq('key', 'vat_registered')
      .maybeSingle();

    if (settingsError) {
      console.error('[processSuccessfulOrder] company_settings load failed:', settingsError);
      await supabaseAdmin.from('orders').update({ accounting_status: 'FAILED', accounting_error: 'company_settings unavailable' }).eq('id', orderId);
      return;
    }

    const vatEnabled = vatSetting?.value === true || vatSetting?.value === 'true';
    const vatRate = vatEnabled ? 0.18 : 0; 
    
    const totalAmount = order.total_price;
    const vatAmount = vatRate > 0 ? parseFloat((totalAmount * vatRate / (1 + vatRate)).toFixed(2)) : 0;
    const revenueAmount = parseFloat((totalAmount - vatAmount).toFixed(2));

    let totalCogs = 0;
    order.order_items.forEach((item: any) => {
       const cost = item.products?.cost_price || 0;
       totalCogs += (cost * item.quantity);
    });

    const { data: currPeriod } = await supabaseAdmin.rpc('get_current_fiscal_period');

    if (!currPeriod) {
      console.error(`[processSuccessfulOrder] No fiscal period for current month. Order ${orderId} accounting skipped. Run seed_fiscal_year().`);
      await supabaseAdmin.from('orders').update({ status: 'confirmed', payment_status: 'paid', payment_provider: provider, accounting_status: 'FAILED', accounting_error: 'No fiscal period' }).eq('id', orderId);
      return;
    }

    const accountCodesToFetch = ['1110', '1310', '6100', '7100'];
    if (vatRate > 0) accountCodesToFetch.push('3200');

    const { data: accounts } = await supabaseAdmin.from('accounts').select('id, code').in('code', accountCodesToFetch);
    const accCash = accounts?.find((a: any) => a.code === '1110')?.id; 
    const accInventory = accounts?.find((a: any) => a.code === '1310')?.id; 
    const accVat = accounts?.find((a: any) => a.code === '3200')?.id; 
    const accRev = accounts?.find((a: any) => a.code === '6100')?.id; 
    const accCogs = accounts?.find((a: any) => a.code === '7100')?.id; 

    const vatAccountRequired = vatRate > 0;

    if (!accCash || !accInventory || !accRev || !accCogs || (vatAccountRequired && !accVat)) {
      await supabaseAdmin.from('orders').update({ accounting_status: 'FAILED', accounting_error: 'Missing account codes' }).eq('id', orderId);
      return;
    }

    const invoiceData = {
      invoice_type: 'B2C',
      invoice_number: `INV-WEB-${orderId.substring(0,6).toUpperCase()}`,
      customer_name: `${order.customer_first_name} ${order.customer_last_name}`,
      invoice_date: new Date().toISOString().split('T')[0],
      due_date: new Date().toISOString().split('T')[0],
      subtotal: revenueAmount,
      vat_rate: vatRate * 100,
      vat_amount: vatAmount,
      total_amount: totalAmount,
      paid_amount: totalAmount,
      payment_status: 'PAID',
      fiscal_period_id: currPeriod,
      notes: `E-commerce order via ${provider}`
    };

    const invoiceItems = order.order_items.map((item: any) => {
      const lineTotal = item.price_at_purchase * item.quantity;
      const lineVat = vatRate > 0 ? parseFloat((lineTotal * vatRate / (1 + vatRate)).toFixed(2)) : 0;
      return {
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: item.quantity,
        unit_price: item.price_at_purchase,
        line_total: lineTotal,
        vat_rate: vatRate * 100,
        vat_amount: lineVat
      };
    });

    const journalData = {
      entry_date: new Date().toISOString().split('T')[0],
      description: `SALE - E-commerce Order #${orderId.substring(0,8)}`,
      reference_type: 'SALES_ORDER',
      fiscal_period_id: currPeriod,
      status: 'POSTED',
    };

    const journalLines = [
      { account_id: accCash, debit: totalAmount, credit: 0, description: 'Payment Received' },
      { account_id: accRev, debit: 0, credit: revenueAmount, description: 'Sales Revenue' },
      ...(vatAmount > 0 && accVat ? [{ account_id: accVat, debit: 0, credit: vatAmount, description: 'VAT on Sale' }] : []),
      { account_id: accCogs, debit: totalCogs, credit: 0, description: 'Cost of Goods Sold' },
      { account_id: accInventory, debit: 0, credit: totalCogs, description: 'Inventory Reduction' },
    ];

    let inventoryTx = null;
    if (totalCogs > 0) {
      inventoryTx = order.order_items.map((item: any) => ({
        product_id: item.product_id,
        quantity: item.quantity,
        transaction_type: 'SALE_OUT',
        unit_cost: item.products?.cost_price || 0,
        total_cost: (item.products?.cost_price || 0) * item.quantity,
        reference_type: 'SALES_ORDER',
        notes: `Order fulfillment via Website`,
        fiscal_period_id: currPeriod
      }));
    }

    const { error: rpcError } = await supabaseAdmin.rpc('process_order_transaction', {
      p_order_id: orderId,
      p_provider: provider,
      p_invoice_data: invoiceData,
      p_invoice_items: invoiceItems,
      p_journal_data: journalData,
      p_journal_lines: journalLines,
      p_inventory_transactions: inventoryTx
    });

    if (rpcError) {
      console.error('[processSuccessfulOrder] RPC Transaction Failed:', rpcError);
      throw rpcError;
    }

    await supabaseAdmin.from('orders').update({ accounting_status: 'POSTED' }).eq('id', orderId);

  } catch (error: any) {
    console.error('Error in processSuccessfulOrder:', error);
    await supabaseAdmin.from('orders')
      .update({ accounting_status: 'FAILED', accounting_error: error.message || 'Unknown error' })
      .eq('id', orderId);
  }
}
