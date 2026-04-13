import { supabase } from './src/lib/supabase';

async function testQuery() {
  const { data, error } = await supabase.from("order_items").select("*, orders!inner(*), products(name)").eq("orders.status", "delivered").limit(10);
  console.log("Error:", error);
  console.log("Data length:", data?.length);
  if (data && data.length > 0) {
    console.log("Sample:", JSON.stringify(data[0], null, 2));
  }
}

testQuery();
