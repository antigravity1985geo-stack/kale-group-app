import dotenv from 'dotenv';
dotenv.config();

import { createClient } from '@supabase/supabase-js';
import { processSuccessfulOrder } from '../src/api/services/payment.service';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env");
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log('--- Starting End-to-End Simulation ---');

  // 1. Ensure current fiscal period exists
  console.log('1. Checking Fiscal Period...');
  let { data: fiscalPeriod } = await supabaseAdmin.rpc('get_current_fiscal_period');
  if (!fiscalPeriod) {
    console.log('No fiscal period found, seeding fiscal year...');
    const { error: seedError } = await supabaseAdmin.rpc('seed_fiscal_year');
    if (seedError) {
      console.error('Failed to seed fiscal year:', seedError);
      process.exit(1);
    }
    const { data: newFp } = await supabaseAdmin.rpc('get_current_fiscal_period');
    fiscalPeriod = newFp;
    console.log('Fiscal period seeded:', fiscalPeriod);
  } else {
    console.log('Fiscal period exists:', fiscalPeriod);
  }

  // 2. Create or find dummy product
  console.log('2. Ensuring Dummy Product exists...');
  let { data: product } = await supabaseAdmin
    .from('products')
    .select('*')
    .eq('name', 'Test Product')
    .maybeSingle();

  if (!product) {
    const { data: newProd, error: prodErr } = await supabaseAdmin
      .from('products')
      .insert({
        name: 'Test Product',
        price: 100,
        cost_price: 60,
        category: 'accessories'
      })
      .select()
      .single();
    if (prodErr) throw prodErr;
    product = newProd;
    console.log('Created new product:', product.id);

    // Give it some opening stock
    const { error: invErr } = await supabaseAdmin
      .from('inventory_transactions')
      .insert({
        product_id: product.id,
        transaction_type: 'OPENING',
        quantity: 100,
        unit_cost: 60,
        total_cost: 6000,
        fiscal_period_id: fiscalPeriod,
        notes: 'Initial test simulation stock'
      });
    if (invErr) throw invErr;
    console.log('Added 100 opening stock for TEST-100');
  } else {
    console.log('Found dummy product:', product.id);
  }

  // 3. Ensure test user exists
  console.log('3. Ensuring Test User exists...');
  let { data: testUser } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('email', 'test@kalegroup.ge')
    .maybeSingle();

  if (!testUser) {
    // Generate a random UUID for the profile just for testing, 
    // or insert directly into auth.users (hard via client). 
    // Usually profiles are tied to auth.users, let's just make a dummy profile.
    const dummyId = '11111111-1111-1111-1111-111111111111'; // Dummy UUID
    const { data: prof, error: profErr } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: dummyId,
        email: 'test@kalegroup.ge',
        first_name: 'Test',
        last_name: 'User',
        role: 'customer'
      })
      .select('id')
      .single();
    if (profErr) {
       console.log('Profile creation skipped (might violate auth constraint), using fallback...');
    } else {
       testUser = prof;
    }
  }

  // 4. Create an Order
  console.log('4. Creating Dummy Order...');
  const { data: order, error: orderErr } = await supabaseAdmin
    .from('orders')
    .insert({
      customer_first_name: 'Test',
      customer_last_name: 'User',
      customer_email: 'test@kalegroup.ge',
      customer_phone: '555123456',
      total_price: 100,
      status: 'pending',
      payment_method: 'card',
      payment_type: 'online',
      payment_status: 'unpaid',
      invoice_status: 'pending',
      accounting_status: 'PENDING',
      customer_city: 'Tbilisi',
      customer_address: 'Test Str 1',
      delivery_method: 'pickup'
    })
    .select()
    .single();

  if (orderErr) throw orderErr;
  console.log('Created order:', order.id);

  // 5. Create Order Item
  const { error: itemErr } = await supabaseAdmin
    .from('order_items')
    .insert({
      order_id: order.id,
      product_id: product.id,
      product_name: product.name,
      quantity: 1,
      price_at_purchase: product.price
    });
  
  if (itemErr) throw itemErr;
  console.log('Created order item for order:', order.id);

  // 6. Simulate Webhook
  console.log('5. Simulating Payment Webhook (processSuccessfulOrder)...');
  await processSuccessfulOrder(order.id, 'tbc');

  // 7. Verify Results
  console.log('6. Verifying Results...');
  const { data: finalOrder } = await supabaseAdmin
    .from('orders')
    .select('status, payment_status, accounting_status')
    .eq('id', order.id)
    .single();
  console.log('Order Final State:', finalOrder);

  const { data: invoices } = await supabaseAdmin
    .from('invoices')
    .select('*')
    .eq('order_id', order.id);
  console.log(`Generated Invoices count: ${invoices?.length}`);

  const { data: journal } = await supabaseAdmin
    .from('journal_entries')
    .select('*, journal_lines(*)')
    .eq('reference_id', order.id);
  console.log(`Generated Journal Entries count: ${journal?.length}`);
  if (journal && journal.length > 0) {
     console.log(`Journal Lines for entry 1: ${journal[0].journal_lines.length}`);
  }

  const { data: inventoryTx } = await supabaseAdmin
    .from('inventory_transactions')
    .select('*')
    .eq('reference_id', order.id);
  console.log(`Generated Inventory Txs count: ${inventoryTx?.length}`);

  console.log('--- Simulation Complete ---');
}

main().catch(console.error);
