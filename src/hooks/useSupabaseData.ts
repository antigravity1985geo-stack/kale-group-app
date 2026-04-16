import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Product, Category } from '../types/product';
import { isProductOnActiveSale } from '../utils/promotions';

// ─────────────────────────────────────────────
// 🔧 Base Generic Hook (DRY)
// ─────────────────────────────────────────────
function useSupabaseQuery<T>(
  queryFn: () => PromiseLike<{ data: any; error: any }>,
  deps: React.DependencyList = []
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(async () => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    try {
      const { data: result, error: err } = await queryFn();
      if (err) throw err;
      if (!cancelled) setData(result);
    } catch (err: any) {
      console.error('[useSupabaseQuery] Error:', err);
      if (!cancelled) setError(err.message ?? 'მოხდა შეცდომა');
    } finally {
      if (!cancelled) setLoading(false);
    }
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    execute().then((c) => { cleanup = c; });
    return () => { cleanup?.(); };
  }, [execute]);

  return { data, loading, error, refetch: execute };
}

// NOTE: 'images' is a JSON array column in Supabase — matches Product.images: string[]
const PRODUCT_FIELDS = [
  'id', 'name', 'price', 'category',
  'material', 'colors', 'images',
  'in_stock', 'description',
  'warranty', 'delivery', 'manufacturing',
  'created_at',
  'is_on_sale', 'discount_percentage', 'sale_price',
  'sale_start_date', 'sale_end_date',
  'translations'
].join(', ');

// ─────────────────────────────────────────────
// 📦 useProducts
// ─────────────────────────────────────────────
export function useProducts(activeCategory?: string) {
  const { data, loading, error, refetch } = useSupabaseQuery<Product[]>(
    async () => {
      let query = supabase
        .from('products')
        .select(PRODUCT_FIELDS)
        .order('created_at', { ascending: false });
      if (activeCategory && !['ყველა', 'All', 'Все'].includes(activeCategory)) {
        query = query.eq('category', activeCategory);
      }
      return query;
    },
    [activeCategory]
  );

  const products = React.useMemo(() => {
    if (!data) return [];
    return data.map(p => {
      return { ...p, is_on_sale: isProductOnActiveSale(p) };
    });
  }, [data]);

  return { products, loading, error, refetch };
}

// ─────────────────────────────────────────────
// 🗂️ useCategories
// ─────────────────────────────────────────────
const CATEGORY_FIELDS = ['id', 'name', 'image', 'created_at', 'translations'].join(', ');

export function useCategories() {
  const { data, loading, error, refetch } = useSupabaseQuery<Category[]>(
    () =>
      supabase
        .from('categories')
        .select(CATEGORY_FIELDS)
        .order('created_at', { ascending: true }),
    []
  );
  return { categories: data ?? [], loading, error, refetch };
}

// ─────────────────────────────────────────────
// 🔍 useProduct (single)
// ─────────────────────────────────────────────
export function useProduct(id: string | undefined) {
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) { setLoading(false); return; }

    let cancelled = false;

    const fetchProduct = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error: err } = await supabase
          .from('products')
          .select(PRODUCT_FIELDS)
          .eq('id', id)
          .single();
        if (err) throw err;
        let p = data as unknown as Product;
        if (p.is_on_sale && p.sale_end_date && new Date(p.sale_end_date).getTime() <= new Date().getTime()) {
          p = { ...p, is_on_sale: false };
        }
        if (!cancelled) setProduct(p);
      } catch (err: any) {
        console.error('[useProduct] Error:', err);
        if (!cancelled) setError(err.message ?? 'პროდუქტი ვერ მოიძებნა');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchProduct();
    return () => { cancelled = true; };
  }, [id]);

  return { product, loading, error };
}
