import type { Product } from '../types/product';

/**
 * Returns the effective price of a product, taking into account any active sale.
 * If the product is on sale and has a valid sale_price, returns sale_price.
 * Otherwise, returns the regular price.
 */
export const getEffectivePrice = (product: Product): number => {
  if (
    product.is_on_sale &&
    product.sale_price !== undefined &&
    product.sale_price !== null &&
    product.sale_price > 0
  ) {
    return product.sale_price;
  }
  return product.price;
};
