import { Router } from "express";
import { z } from "zod";
import { supabase, supabaseAdmin } from "../services/supabase.service.js";
import { requireAccounting } from "./accounting.routes.js";

const router = Router();

const posCustomerSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().min(3),
  email: z.string().email().optional().nullable().or(z.literal('')),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  note: z.string().optional().nullable(),
  personalId: z.string().optional().nullable(),
  paymentMethod: z.string(),
  paymentType: z.string(),
});

const posItemSchema = z.object({
  product_id: z.string().uuid(),
  quantity: z.number().int().positive(),
});

const posSaleSchema = z.object({
  customer: posCustomerSchema,
  items: z.array(posItemSchema).min(1),
  consultant_id: z.string().uuid().optional().nullable(),
});

// POST /api/pos/sale — atomic POS sale (order + items + accounting RPC)
router.post('/sale', requireAccounting, async (req: any, res) => {
  const parsed = posSaleSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'არასწორი მონაცემები', details: parsed.error.issues });
  }

  const { customer, items, consultant_id } = parsed.data;

  try {
    // 1. Validate prices server-side
    let calculatedTotal = 0;
    const validItems: any[] = [];

    for (const item of items) {
      const { data: product } = await supabase
        .from('products')
        .select('id, name, price, is_on_sale, sale_price, sale_end_date')
        .eq('id', item.product_id)
        .single();

      if (!product) {
        return res.status(404).json({ error: `პროდუქტი ვერ მოიძებნა (${item.product_id})` });
      }

      const isOnActiveSale = product.is_on_sale
        && product.sale_price != null
        && product.sale_price > 0
        && (!product.sale_end_date || new Date(product.sale_end_date).getTime() > Date.now());
      const effectivePrice = isOnActiveSale ? product.sale_price : product.price;

      calculatedTotal += effectivePrice * item.quantity;

      validItems.push({
        product_id: product.id,
        product_name: product.name,
        quantity: item.quantity,
        price_at_purchase: effectivePrice,
        is_promotional_sale: isOnActiveSale,
      });
    }

    // 2. Create order
    const { data: order, error: orderErr } = await supabaseAdmin
      .from('orders')
      .insert({
        customer_first_name: customer.firstName,
        customer_last_name: customer.lastName,
        customer_phone: customer.phone,
        customer_email: customer.email || null,
        customer_address: customer.address || 'შოურუმი',
        customer_city: customer.city || 'თბილისი',
        customer_note: customer.note || null,
        personal_id: customer.personalId || null,
        total_price: calculatedTotal,
        status: 'delivered',
        payment_status: 'paid',
        payment_method: customer.paymentMethod,
        payment_type: customer.paymentType,
        sale_source: 'showroom',
        consultant_id: consultant_id || null,
      })
      .select('id')
      .single();

    if (orderErr) return res.status(500).json({ error: orderErr.message });

    // 3. Create order items
    const orderItems = validItems.map((i) => ({ ...i, order_id: order.id }));
    const { error: itemsErr } = await supabaseAdmin.from('order_items').insert(orderItems);

    if (itemsErr) {
      await supabaseAdmin.from('orders').delete().eq('id', order.id);
      return res.status(500).json({ error: itemsErr.message });
    }

    // 4. Trigger accounting RPC
    let accountingError: string | null = null;
    const { error: rpcError } = await supabaseAdmin.rpc('process_order_sale', { p_order_id: order.id });
    if (rpcError) accountingError = rpcError.message;

    res.json({
      success: true,
      order_id: order.id,
      total_price: calculatedTotal,
      accounting_error: accountingError,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'POS გაყიდვის გატარება ვერ მოხერხდა' });
  }
});

export default router;
