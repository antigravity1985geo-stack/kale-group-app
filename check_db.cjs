const fs = require('fs');
const content = fs.readFileSync('.env', 'utf8');
const url = (content.match(/VITE_SUPABASE_URL=['"]?(.*?)['"]?$/m) || [])[1]?.trim();
const key = (content.match(/VITE_SUPABASE_ANON_KEY=['"]?(.*?)['"]?$/m) || [])[1]?.trim();

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(url, key);

async function check() {
  const tables = ['purchase_orders', 'purchase_order_items', 'goods_receipts', 'goods_receipt_items', 'inventory_transactions'];
  for (const t of tables) {
    const { data, error } = await supabase.from(t).select('*').limit(1);
    if (error) console.log(t, 'ERROR', error.message);
    else console.log(t, 'EXISTS');
  }
}

check();
