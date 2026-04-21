import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

// Use the environment variables from the test context or system
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

test.describe('RLS Boundaries', () => {
  test('should prevent anonymous inserts into order_items', async () => {
    // We only run this test if the variables are set
    test.skip(!supabaseUrl || !supabaseAnonKey, 'Supabase credentials not available');

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false }
    });

    // Attempt to insert as anonymous user (which used to be allowed by order_items_public_insert)
    const { error } = await supabase.from('order_items').insert({
      order_id: '11111111-1111-1111-1111-111111111111',
      product_id: '11111111-1111-1111-1111-111111111111',
      quantity: 1,
      price: 100
    });

    // We expect an error due to RLS violation
    expect(error).not.toBeNull();
    // Usually RLS violation returns code 42501
    expect(error?.code).toBe('42501');
  });

  test('should prevent anonymous users from reading contact_messages', async () => {
    test.skip(!supabaseUrl || !supabaseAnonKey, 'Supabase credentials not available');

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false }
    });

    const { data, error } = await supabase.from('contact_messages').select('*');
    
    // As anon, we shouldn't get any data or we should get an error depending on how RLS is configured.
    // Usually, reading without permission just returns an empty array, or throws 42501 if no policy allows it at all.
    if (error) {
       expect(error.code).toBe('42501');
    } else {
       expect(data?.length).toBe(0);
    }
  });
});
