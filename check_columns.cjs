const fs = require('fs');
const content = fs.readFileSync('.env', 'utf8');
const url = (content.match(/VITE_SUPABASE_URL=['"]?(.*?)['"]?$/m) || [])[1]?.trim();
const key = (content.match(/VITE_SUPABASE_ANON_KEY=['"]?(.*?)['"]?$/m) || [])[1]?.trim();

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(url, key);

async function check() {
  const tables = ['purchase_orders', 'purchase_order_items', 'goods_receipts', 'goods_receipt_items'];
  for (const t of tables) {
    const res = await supabase.rpc('get_table_columns', { table_name: t }).catch(() => null);
    console.log(t, 'RPC result:', res ? res.data : 'NO RPC');
    
    // If no RPC, try fetching 1 row
    const { data } = await supabase.from(t).select('*').limit(1);
    console.log(t, data && data.length ? Object.keys(data[0]) : 'Empty table');
  }
}

check();
