import { Router } from "express";
import { z } from "zod";
import { supabase, supabaseAdmin } from "../services/supabase.service.js";
import { orderCreateLimiter } from "../middleware/rate-limit.middleware.js";

const router = Router();

const orderSchema = z.object({
  customerInfo: z.object({
    customerType: z.enum(['physical', 'legal']),
    personalId: z.string().optional().nullable(),
    companyId: z.string().optional().nullable(),
    firstName: z.string().min(1, "სახელი სავალდებულოა"),
    lastName: z.string().min(1, "გვარი სავალდებულოა"),
    phone: z.string().min(4, "ტელეფონი სავალდებულოა"),
    email: z.string().email("არასწორი ელ. ფოსტა").optional().or(z.literal('')),
    address: z.string().min(1, "მისამართი სავალდებულოა"),
    city: z.string().min(1, "ქალაქი სავალდებულოა"),
    note: z.string().optional().nullable()
  }),
  items: z.array(z.object({
    product: z.object({ id: z.string() }),
    quantity: z.number().int().positive()
  })).min(1, "კალათა ცარიელია"),
  paymentMethod: z.string(),
  paymentType: z.string(),
  deliveryMethod: z.enum(['delivery', 'pickup']).default('delivery')
});

router.post("/create", orderCreateLimiter, async (req: any, res) => {
  try {
    // Validate with Zod
    const parseResult = orderSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ 
        error: "არასწორი მონაცემები", 
        details: parseResult.error.issues 
      });
    }

    const { customerInfo, items, paymentMethod, paymentType, deliveryMethod } = parseResult.data;

    let calculatedTotal = 0;
    const validItems = [];

    for (const item of items) {
      const { data: product } = await supabase
        .from("products")
        .select("id, name, price, is_on_sale, sale_price, sale_end_date")
        .eq("id", item.product.id)
        .single();

      if (!product) {
        return res.status(404).json({ error: `პროდუქტი ვერ მოიძებნა ბაზაში (ID: ${item.product.id})` });
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
        is_promotional_sale: isOnActiveSale
      });
    }

    const { data: orderData, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert([{
        customer_type: customerInfo.customerType,
        personal_id: customerInfo.customerType === 'physical' ? customerInfo.personalId : null,
        company_id: customerInfo.customerType === 'legal' ? customerInfo.companyId : null,
        customer_first_name: customerInfo.firstName,
        customer_last_name: customerInfo.lastName,
        customer_phone: customerInfo.phone,
        customer_email: customerInfo.email || null,
        customer_address: customerInfo.address,
        customer_city: customerInfo.city,
        customer_note: customerInfo.note || null,
        total_price: calculatedTotal,
        payment_method: paymentMethod,
        payment_type: paymentType,
        delivery_method: deliveryMethod,
        status: 'pending'
      }])
      .select()
      .single();

    if (orderError) throw orderError;

    const orderItemsInsert = validItems.map(item => ({
      ...item,
      order_id: orderData.id,
    }));

    const { error: itemsError } = await supabaseAdmin
      .from('order_items')
      .insert(orderItemsInsert);

    if (itemsError) throw itemsError;

    res.json({ success: true, orderId: orderData.id, total_price: calculatedTotal });
  } catch (error: any) {
    console.error("Order Creation Error:", error);
    res.status(500).json({ error: "შეკვეთის გაფორმებისას დაფიქსირდა შეცდომა." });
  }
});

export default router;
