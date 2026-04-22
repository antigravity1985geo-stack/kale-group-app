import { supabaseAdmin } from "./supabase.service.js";

export async function autoCreateInvoiceForOrder(orderId: string, journalEntryId?: string) {
  try {
    // 1. Fetch order and items
    const { data: order, error: orderErr } = await supabaseAdmin
      .from('orders')
      .select(`*, order_items(*, products(category, cost_price))`)
      .eq('id', orderId)
      .single();

    if (orderErr || !order) {
      console.error('[AutoInvoice] Order fetch failed:', orderErr);
      return false;
    }

    // 2. Check if invoice already exists
    const { data: existingInv } = await supabaseAdmin
      .from('invoices')
      .select('id')
      .eq('order_id', orderId)
      .maybeSingle();

    if (existingInv) return true; // Already exists

    // 3. Get VAT settings
    const { data: vatSetting } = await supabaseAdmin
      .from('company_settings')
      .select('value')
      .eq('key', 'vat_registered')
      .maybeSingle();

    const vatEnabled = vatSetting?.value === true || vatSetting?.value === 'true';
    const vatRate = vatEnabled ? 0.18 : 0; 
    
    const totalAmount = order.total_price;
    const vatAmount = vatRate > 0 ? parseFloat((totalAmount * vatRate / (1 + vatRate)).toFixed(2)) : 0;
    const revenueAmount = parseFloat((totalAmount - vatAmount).toFixed(2));

    // 4. Get Current Fiscal Period
    const { data: currPeriod } = await supabaseAdmin.rpc('get_current_fiscal_period');

    const invoiceType = order.company_id ? 'B2B' : 'B2C';
    const customerName = `${order.customer_first_name || ''} ${order.customer_last_name || ''}`.trim();
    const customerAddress = [order.customer_city, order.customer_address].filter(Boolean).join(', ');

    // 5. Insert Invoice
    const invoiceData = {
      invoice_type: invoiceType,
      invoice_number: `INV-POS-${orderId.substring(0,6).toUpperCase()}`,
      customer_name: customerName || 'მომხმარებელი',
      customer_email: order.customer_email || null,
      customer_phone: order.customer_phone || null,
      customer_tin: order.company_id || order.personal_id || null,
      customer_address: customerAddress || null,
      order_id: orderId,
      invoice_date: new Date().toISOString().split('T')[0],
      due_date: new Date().toISOString().split('T')[0],
      subtotal: revenueAmount,
      vat_rate: vatRate * 100,
      vat_amount: vatAmount,
      total_amount: totalAmount,
      currency: 'GEL',
      exchange_rate: 1,
      payment_method: order.payment_method || 'cash',
      payment_status: 'PAID',
      paid_amount: totalAmount,
      journal_entry_id: journalEntryId || null,
      fiscal_period_id: currPeriod || null,
      notes: 'შოურუმის / ავტომატური ინვოისი'
    };

    const { data: newInvoice, error: invErr } = await supabaseAdmin
      .from('invoices')
      .insert(invoiceData)
      .select('id')
      .single();

    if (invErr || !newInvoice) {
      console.error('[AutoInvoice] Failed to create invoice:', invErr);
      return false;
    }

    // 6. Insert Invoice Items
    const invoiceItems = order.order_items.map((item: any) => {
      const lineTotal = item.price_at_purchase * item.quantity;
      const lineVat = vatRate > 0 ? parseFloat((lineTotal * vatRate / (1 + vatRate)).toFixed(2)) : 0;
      return {
        invoice_id: newInvoice.id,
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: item.quantity,
        unit_price: item.price_at_purchase,
        line_total: lineTotal,
        vat_rate: vatRate * 100,
        vat_amount: lineVat
      };
    });

    if (invoiceItems.length > 0) {
      await supabaseAdmin.from('invoice_items').insert(invoiceItems);
    }

    return true;
  } catch (error) {
    console.error('[AutoInvoice] Exception:', error);
    return false;
  }
}
