import type { Product } from '../types/product';

/**
 * Returns the effective price of a product, taking into account any active sale.
 * If the product is on sale and has a valid sale_price, returns sale_price.
 * Otherwise, returns the regular price.
 */
import { isProductOnActiveSale } from './promotions';

export const getEffectivePrice = (product: Product): number => {
  if (isProductOnActiveSale(product)) {
    return product.sale_price!;
  }
  return product.price;
};

/**
 * Formats a number as a GEL price string (e.g., ₾1,200).
 */
export const formatPrice = (price: number): string => {
  return `₾${price.toLocaleString()}`;
};
