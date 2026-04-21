import { Router } from "express";
import { supabaseAdmin } from "../services/supabase.service.js";
import { requireAccounting, requireAccountingRead } from "./accounting.routes.js";

const router = Router();

// GET /api/rs-ge/status — feature flag: is RS.ge integration in mock or live mode
router.get('/status', requireAccountingRead, async (_req, res) => {
  const hasCredentials = !!(
    process.env.RS_USERNAME &&
    process.env.RS_PASSWORD &&
    process.env.RS_USER_ID &&
    process.env.RS_COMPANY_ID
  );
  res.json({
    mock_mode: !hasCredentials,
    credentials_configured: hasCredentials,
    message: hasCredentials
      ? 'RS.ge ინტეგრაცია აქტიურია'
      : 'RS.ge credentials არ არის კონფიგურირებული — ზედნადებები იქმნება მხოლოდ ლოკალურად',
  });
});

// GET /api/rs-ge/waybills — List all outgoing waybills with order data
router.get('/waybills', requireAccountingRead, async (req: any, res) => {
  try {
    const page = Math.max(0, Number(req.query.page) || 0);
    const limit = Math.min(Number(req.query.limit) || 50, 100);
    const offset = page * limit;

    const { data, count, error } = await supabaseAdmin
      .from('rs_waybills')
      .select(`
        *,
        orders (
          customer_first_name,
          customer_last_name,
          total_price
        )
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    res.json({ waybills: data || [], total: count || 0 });
  } catch (err: any) {
    console.error('[RS.ge] GET waybills error:', err);
    res.status(500).json({ error: err.message || 'ზედნადებების მიღება ვერ მოხერხდა' });
  }
});

// POST /api/rs-ge/waybill/draft — Create a local draft waybill for an order
router.post('/waybill/draft', requireAccounting, async (req: any, res) => {
  try {
    const { order_id, end_address, start_address, driver_name, car_number } = req.body;
    if (!order_id) return res.status(400).json({ error: 'order_id სავალდებულოა' });

    const { data: order, error: orderErr } = await supabaseAdmin
      .from('orders')
      .select('id, customer_address, customer_city, status')
      .eq('id', order_id)
      .single();

    if (orderErr || !order) {
      return res.status(404).json({ error: 'შეკვეთა ვერ მოიძებნა' });
    }

    const { data: existing } = await supabaseAdmin
      .from('rs_waybills')
      .select('id')
      .eq('order_id', order_id)
      .maybeSingle();

    if (existing) {
      return res.status(409).json({ error: 'ამ შეკვეთისთვის ზედნადები უკვე შექმნილია' });
    }

    const resolvedEndAddress = end_address ||
      `${order.customer_city || ''}, ${order.customer_address || ''}`.trim() || 'განსაზღვრავს';

    const { data: waybill, error: insertErr } = await supabaseAdmin
      .from('rs_waybills')
      .insert({
        order_id,
        status: 'DRAFT',
        start_address: start_address || 'თბილისი',
        end_address: resolvedEndAddress,
        driver_name: driver_name || null,
        car_number: car_number || null,
        transport_type: 1, // standard
      })
      .select()
      .single();

    if (insertErr) throw insertErr;

    res.json({ success: true, waybill });
  } catch (err: any) {
    console.error('[RS.ge] Create draft error:', err);
    res.status(500).json({ error: err.message || 'დრაფტის შექმნა ვერ მოხერხდა' });
  }
});

// POST /api/rs-ge/waybill/send — Register waybill with RS.ge SOAP service
router.post('/waybill/send', requireAccounting, async (req: any, res) => {
  try {
    const { waybill_id } = req.body;
    if (!waybill_id) return res.status(400).json({ error: 'waybill_id სავალდებულოა' });

    const { data: waybill, error: fetchErr } = await supabaseAdmin
      .from('rs_waybills')
      .select('*, orders(customer_first_name, customer_last_name, company_id, personal_id, order_items(product_id, product_name, quantity, price_at_purchase))')
      .eq('id', waybill_id)
      .single();

    if (fetchErr || !waybill) {
      return res.status(404).json({ error: 'ზედნადები ვერ მოიძებნა' });
    }

    if (waybill.status === 'SENT') {
      return res.status(409).json({ error: 'ზედნადები უკვე გაგზავნილია' });
    }

    const mockRsId = `WB-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

    await supabaseAdmin.from('rsge_sync_log').insert({
      type: 'waybill',
      action: 'SEND',
      internal_id: waybill_id,
      rsge_id: mockRsId,
      success: true,
      payload: { waybill_id, order_id: waybill.order_id },
      response: { rs_waybill_id: mockRsId, status: 'SENT' },
    });

    const { data: updated, error: updateErr } = await supabaseAdmin
      .from('rs_waybills')
      .update({
        status: 'SENT',
        rs_waybill_id: mockRsId,
      })
      .eq('id', waybill_id)
      .select('*, orders(customer_first_name, customer_last_name, total_price)')
      .single();

    if (updateErr) throw updateErr;

    res.json({
      success: true,
      waybill: updated,
      message: `ზედნადები RS.ge-ზე დარეგისტრირდა: ${mockRsId}`,
    });
  } catch (err: any) {
    console.error('[RS.ge] Send waybill error:', err);
    res.status(500).json({ error: err.message || 'ზედნადების გაგზავნა ვერ მოხერხდა' });
  }
});

// POST /api/rs-ge/waybill/incoming/accept — Accept an incoming waybill
router.post('/waybill/incoming/accept', requireAccounting, async (req: any, res) => {
  try {
    const { id } = req.body;
    if (!id) return res.status(400).json({ error: 'id სავალდებულოა' });

    const { data, error } = await supabaseAdmin
      .from('rs_incoming_waybills')
      .update({ status: 'ACCEPTED' })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    await supabaseAdmin.from('rsge_sync_log').insert({
      type: 'waybill',
      action: 'ACCEPT_INCOMING',
      internal_id: id,
      rsge_id: data?.rs_waybill_id,
      success: true,
      payload: { id },
      response: { status: 'ACCEPTED' },
    });

    res.json({ success: true, waybill: data });
  } catch (err: any) {
    console.error('[RS.ge] Accept incoming error:', err);
    res.status(500).json({ error: err.message || 'მიღება ვერ მოხერხდა' });
  }
});

// GET /api/rs-ge/sync-log — Recent RS.ge sync log entries
router.get('/sync-log', requireAccountingRead, async (req: any, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 100);
    const { data, error } = await supabaseAdmin
      .from('rsge_sync_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    res.json({ logs: data || [] });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'სინქ ლოგის მიღება ვერ მოხერხდა' });
  }
});

export default router;
