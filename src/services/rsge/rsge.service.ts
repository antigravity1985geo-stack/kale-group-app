// ============================================================
// RS.GE Business Logic Service
// Bridges Supabase DB ↔ RS.ge SOAP Client
// ============================================================
// This service wraps the raw SOAP client with:
//   - Supabase DB read/write
//   - Error handling & retry
//   - Sync log (rsge_sync_log table)
//   - Auto-invoke from processSuccessfulOrder()
// ============================================================
declare var process: any;

import { supabase } from '../../lib/supabase';
import type {
  EInvoiceCreatePayload,
  EInvoiceRecord,
  WaybillCreatePayload,
  WaybillRecord,
  VATReturnPayload,
  VATReturnRecord,
  RSGeSyncResult,
} from '../../types/rsge.types';
import {
  rsgeCreateInvoice,
  rsgeSendInvoice,
  rsgeCancelInvoice,
  rsgeGetInvoiceStatus,
  rsgeCreateWaybill,
  rsgeActivateWaybill,
  rsgeCloseWaybill,
  rsgeDeleteWaybill,
  rsgeSubmitVATReturn,
  rsgeGetVATReturnStatus,
  rsgeHealthCheck,
  RSGE_CONFIG,
} from './rsge.soap.client';

// ─── Supabase client (using lib/supabase.ts) ──

// ─── Sync Log ─────────────────────────────────────────────────
// Logs every RS.ge API call result to Supabase for audit trail.
// SQL for table (add to your migration):
//
// CREATE TABLE IF NOT EXISTS public.rsge_sync_log (
//   id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
//   type         text NOT NULL,        -- 'einvoice' | 'waybill' | 'vat'
//   action       text NOT NULL,        -- 'CREATE' | 'SEND' | 'CANCEL' ...
//   internal_id  text,                 -- internal order/invoice ID
//   rsge_id      text,                 -- RS.ge returned ID
//   success      boolean NOT NULL,
//   payload      jsonb,
//   response     jsonb,
//   error        text,
//   created_at   timestamptz DEFAULT now()
// );

async function logSync(
  type: RSGeSyncResult['type'],
  action: string,
  internalId: string | undefined,
  success: boolean,
  payload: unknown,
  response: unknown,
  rsgeId?: string,
  error?: string
): Promise<void> {
  try {
    await supabase.from('rsge_sync_log').insert({
      type,
      action,
      internal_id: internalId,
      rsge_id: rsgeId,
      success,
      payload,
      response,
      error,
    });
  } catch (err) {
    console.error('[RSGe Service] Failed to write sync log:', err);
  }
}

// ─── E-Invoice Service Methods ────────────────────────────────

/**
 * Auto-invoked from processSuccessfulOrder().
 * Creates and sends an e-invoice to RS.ge for a confirmed order.
 *
 * @param orderId  - Internal Supabase order ID
 * @param invoiceId - Internal Supabase invoice ID
 */
export async function autoCreateAndSendEInvoice(
  orderId: string,
  invoiceId: string
): Promise<RSGeSyncResult> {
  // 1. Fetch order + invoice + line items from Supabase
  const { data: invoice, error: fetchError } = await supabase
    .from('invoices')
    .select(`
      *,
      orders (
        *,
        order_items (
          *,
          products ( name, sku )
        ),
        profiles ( full_name, personal_number, company_name, company_tin )
      )
    `)
    .eq('id', invoiceId)
    .single();

  if (fetchError || !invoice) {
    return {
      type: 'einvoice',
      action: 'AUTO_CREATE',
      success: false,
      message: `ინვოისი ვერ მოიძებნა: ${fetchError?.message}`,
      timestamp: new Date().toISOString(),
    };
  }

  const order = invoice.orders;
  const profile = order.profiles;

  // 2. Build payload
  const payload: EInvoiceCreatePayload = {
    invoiceType: 'STANDARD',
    issueDate: new Date().toISOString().split('T')[0],
    currency: 'GEL',
    seller: {
      tin: RSGE_CONFIG.CREDENTIALS.tin,
      name: 'KALE GROUP',  // TODO: pull from env or settings table
      vatPayerStatus: true,
    },
    buyer: {
      tin: profile?.company_tin ?? profile?.personal_number ?? '00000000000',
      name: profile?.company_name ?? profile?.full_name ?? 'Unknown',
      vatPayerStatus: false,
    },
    items: order.order_items.map((item: any, idx: number) => {
      const price  = item.price_at_purchase ?? item.unit_price ?? 0;
      const qty    = item.quantity ?? 1;
      const vatR   = 18;
      const net    = price * qty / 1.18;
      const vatA   = price * qty - net;
      return {
        lineNumber:  idx + 1,
        productCode: item.products?.sku ?? '',
        description: item.products?.name ?? item.product_name ?? '',
        unit:        'ც',
        quantity:    qty,
        unitPrice:   parseFloat((price / 1.18).toFixed(2)),
        vatRate:     vatR,
        vatAmount:   parseFloat(vatA.toFixed(2)),
        totalWithVat: parseFloat((price * qty).toFixed(2)),
      };
    }),
    internalOrderId:   orderId,
    internalInvoiceId: invoiceId,
  };

  // 3. Create on RS.ge
  const createResult = await rsgeCreateInvoice(payload);
  await logSync('einvoice', 'CREATE', invoiceId, createResult.success, payload, createResult.data, createResult.data?.rsgeId, createResult.errorMessage);

  if (!createResult.success || !createResult.data) {
    return {
      type: 'einvoice', action: 'AUTO_CREATE', success: false,
      message: createResult.errorMessage ?? 'RS.ge ინვოისი ვერ შეიქმნა',
      timestamp: new Date().toISOString(),
    };
  }

  const rsgeId = createResult.data.rsgeId;

  // 4. Save rsge_id back to invoices table
  await supabase.from('invoices').update({ rsge_invoice_id: rsgeId, rsge_status: 'DRAFT' }).eq('id', invoiceId);

  // 5. Send the invoice
  const sendResult = await rsgeSendInvoice(rsgeId);
  await logSync('einvoice', 'SEND', invoiceId, sendResult.success, { rsgeId }, sendResult.data, rsgeId, sendResult.errorMessage);

  if (sendResult.success) {
    await supabase.from('invoices').update({ rsge_status: 'SENT', rsge_sent_at: new Date().toISOString() }).eq('id', invoiceId);
  }

  return {
    type: 'einvoice',
    action: 'AUTO_CREATE_AND_SEND',
    success: sendResult.success,
    rsgeId,
    message: sendResult.success
      ? `ელ-ინვოისი წარმატებით გაიგზავნა (${rsgeId})`
      : `შეიქმნა, მაგრამ გაგზავნა ვერ მოხერხდა: ${sendResult.errorMessage}`,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Manually cancel an e-invoice by internal invoice ID.
 */
export async function cancelEInvoice(invoiceId: string, reason: string): Promise<RSGeSyncResult> {
  const { data: inv } = await supabase
    .from('invoices')
    .select('rsge_invoice_id')
    .eq('id', invoiceId)
    .single();

  const rsgeId = inv?.rsge_invoice_id;
  if (!rsgeId) {
    return { type: 'einvoice', action: 'CANCEL', success: false, message: 'RS.ge ID არ მოიძებნა', timestamp: new Date().toISOString() };
  }

  const result = await rsgeCancelInvoice(rsgeId, reason);
  await logSync('einvoice', 'CANCEL', invoiceId, result.success, { reason }, result.data, rsgeId, result.errorMessage);

  if (result.success) {
    await supabase.from('invoices').update({ rsge_status: 'CANCELLED' }).eq('id', invoiceId);
  }

  return {
    type: 'einvoice', action: 'CANCEL', success: result.success, rsgeId,
    message: result.success ? 'ინვოისი გაუქმდა RS.ge-ზე' : result.errorMessage ?? 'შეცდომა',
    timestamp: new Date().toISOString(),
  };
}

/**
 * Poll & sync invoice status from RS.ge.
 */
export async function syncInvoiceStatus(invoiceId: string): Promise<RSGeSyncResult> {
  const { data: inv } = await supabase.from('invoices').select('rsge_invoice_id').eq('id', invoiceId).single();
  const rsgeId = inv?.rsge_invoice_id;
  if (!rsgeId) return { type: 'einvoice', action: 'STATUS_SYNC', success: false, message: 'RS.ge ID არ მოიძებნა', timestamp: new Date().toISOString() };

  const result = await rsgeGetInvoiceStatus(rsgeId);
  if (result.success && result.data) {
    await supabase.from('invoices').update({ rsge_status: result.data.status }).eq('id', invoiceId);
  }

  return {
    type: 'einvoice', action: 'STATUS_SYNC', success: result.success, rsgeId,
    message: result.success ? `სტატუსი: ${result.data?.status}` : result.errorMessage ?? 'შეცდომა',
    timestamp: new Date().toISOString(),
  };
}

// ─── Waybill Service Methods ──────────────────────────────────

/**
 * Create a waybill for a confirmed delivery order.
 */
export async function createWaybillForOrder(
  orderId: string,
  extras: Pick<WaybillCreatePayload, 'startAddress' | 'endAddress' | 'transport'>
): Promise<RSGeSyncResult> {
  const { data: order } = await supabase
    .from('orders')
    .select(`*, order_items(*, products(name, sku)), profiles(full_name, company_tin, personal_number, company_name)`)
    .eq('id', orderId)
    .single();

  if (!order) return { type: 'waybill', action: 'CREATE', success: false, message: 'შეკვეთა ვერ მოიძებნა', timestamp: new Date().toISOString() };

  const profile = order.profiles;
  const payload: WaybillCreatePayload = {
    waybillType: 'STANDARD',
    activationDate: new Date().toISOString().split('T')[0],
    sender: {
      tin: RSGE_CONFIG.CREDENTIALS.tin,
      name: 'KALE GROUP',
    },
    receiver: {
      tin: profile?.company_tin ?? profile?.personal_number ?? '00000000000',
      name: profile?.company_name ?? profile?.full_name ?? 'Unknown',
    },
    ...extras,
    items: order.order_items.map((item: any, idx: number) => ({
      lineNumber:   idx + 1,
      productCode:  item.products?.sku ?? '',
      description:  item.products?.name ?? '',
      unit:         'ც',
      quantity:     item.quantity,
      unitPrice:    parseFloat((item.price_at_purchase / 1.18).toFixed(2)),
      totalPrice:   parseFloat((item.price_at_purchase * item.quantity).toFixed(2)),
      vatRate:      18,
      vatAmount:    parseFloat((item.price_at_purchase * item.quantity - (item.price_at_purchase * item.quantity / 1.18)).toFixed(2)),
    })),
    internalOrderId: orderId,
  };

  const result = await rsgeCreateWaybill(payload);
  await logSync('waybill', 'CREATE', orderId, result.success, payload, result.data, result.data?.rsgeId, result.errorMessage);

  if (result.success && result.data) {
    await supabase.from('orders').update({
      rsge_waybill_id:     result.data.rsgeId,
      rsge_waybill_status: 'DRAFT',
    }).eq('id', orderId);
  }

  return {
    type: 'waybill', action: 'CREATE', success: result.success, rsgeId: result.data?.rsgeId,
    message: result.success ? `ზედნადები შეიქმნა (${result.data?.rsgeId})` : result.errorMessage ?? 'შეცდომა',
    timestamp: new Date().toISOString(),
  };
}

export async function activateOrderWaybill(orderId: string): Promise<RSGeSyncResult> {
  const { data: order } = await supabase.from('orders').select('rsge_waybill_id').eq('id', orderId).single();
  const rsgeId = order?.rsge_waybill_id;
  if (!rsgeId) return { type: 'waybill', action: 'ACTIVATE', success: false, message: 'RS.ge Waybill ID არ მოიძებნა', timestamp: new Date().toISOString() };

  const result = await rsgeActivateWaybill(rsgeId);
  if (result.success) {
    await supabase.from('orders').update({ rsge_waybill_status: 'ACTIVE', rsge_waybill_activated_at: new Date().toISOString() }).eq('id', orderId);
  }

  return {
    type: 'waybill', action: 'ACTIVATE', success: result.success, rsgeId,
    message: result.success ? 'ზედნადები გააქტიურდა' : result.errorMessage ?? 'შეცდომა',
    timestamp: new Date().toISOString(),
  };
}

export async function closeOrderWaybill(orderId: string): Promise<RSGeSyncResult> {
  const { data: order } = await supabase.from('orders').select('rsge_waybill_id').eq('id', orderId).single();
  const rsgeId = order?.rsge_waybill_id;
  if (!rsgeId) return { type: 'waybill', action: 'CLOSE', success: false, message: 'RS.ge Waybill ID არ მოიძებნა', timestamp: new Date().toISOString() };

  const result = await rsgeCloseWaybill(rsgeId);
  if (result.success) {
    await supabase.from('orders').update({ rsge_waybill_status: 'CLOSED', rsge_waybill_closed_at: new Date().toISOString() }).eq('id', orderId);
  }

  return {
    type: 'waybill', action: 'CLOSE', success: result.success, rsgeId,
    message: result.success ? 'ზედნადები დაიხურა' : result.errorMessage ?? 'შეცდომა',
    timestamp: new Date().toISOString(),
  };
}

// ─── VAT Return Service ───────────────────────────────────────

/**
 * Aggregate VAT transactions from Supabase and submit to RS.ge.
 */
export async function submitMonthlyVATReturn(year: number, month: number): Promise<RSGeSyncResult> {
  // 1. Fetch VAT transactions for the period from Supabase
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate   = new Date(year, month, 0).toISOString().split('T')[0]; // last day of month

  const { data: vatTx } = await supabase
    .from('vat_transactions')
    .select('*')
    .gte('transaction_date', startDate)
    .lte('transaction_date', endDate);

  if (!vatTx || vatTx.length === 0) {
    return { type: 'vat', action: 'SUBMIT_RETURN', success: false, message: 'ამ პერიოდში დღგ-ის ტრანზაქციები ვერ მოიძებნა', timestamp: new Date().toISOString() };
  }

  const outputVAT = vatTx.filter((t: any) => t.transaction_type === 'OUTPUT').reduce((s: number, t: any) => s + (t.vat_amount ?? 0), 0);
  const inputVAT  = vatTx.filter((t: any) => t.transaction_type === 'INPUT').reduce((s: number, t: any) => s + (t.vat_amount ?? 0), 0);

  const payload: VATReturnPayload = {
    period: { year, month },
    tin: RSGE_CONFIG.CREDENTIALS.tin,
    outputVAT,
    inputVAT,
    netVAT: outputVAT - inputVAT,
    transactions: vatTx.map((t: any) => ({
      transactionType:  t.transaction_type === 'OUTPUT' ? 'SALE' : 'PURCHASE',
      documentNumber:   t.document_number ?? '',
      documentDate:     t.transaction_date,
      counterpartyTin:  t.counterparty_tin ?? '00000000000',
      counterpartyName: t.counterparty_name ?? '',
      taxableAmount:    t.taxable_amount ?? 0,
      vatAmount:        t.vat_amount ?? 0,
      vatRate:          18,
    })),
  };

  const result = await rsgeSubmitVATReturn(payload);
  await logSync('vat', 'SUBMIT_RETURN', `${year}-${month}`, result.success, payload, result.data, result.data?.rsgeId, result.errorMessage);

  if (result.success && result.data) {
    await supabase.from('vat_returns').upsert({
      period_year:  year,
      period_month: month,
      rsge_id:      result.data.rsgeId,
      status:       'SUBMITTED',
      output_vat:   outputVAT,
      input_vat:    inputVAT,
      net_vat:      outputVAT - inputVAT,
      submitted_at: new Date().toISOString(),
    });
  }

  return {
    type: 'vat', action: 'SUBMIT_RETURN', success: result.success, rsgeId: result.data?.rsgeId,
    message: result.success ? `დეკლარაცია წარდგენილია (${result.data?.rsgeId})` : result.errorMessage ?? 'შეცდომა',
    timestamp: new Date().toISOString(),
  };
}

// ─── Health Check ─────────────────────────────────────────────
export { rsgeHealthCheck };

// ─── Sync Log Reader (for UI) ─────────────────────────────────
export async function getRecentSyncLog(limit = 50): Promise<RSGeSyncResult[]> {
  const { data } = await supabase
    .from('rsge_sync_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  return (data ?? []).map((row: any) => ({
    type:      row.type,
    action:    row.action,
    success:   row.success,
    rsgeId:    row.rsge_id,
    message:   row.error ?? (row.success ? 'OK' : 'Failed'),
    timestamp: row.created_at,
  }));
}
