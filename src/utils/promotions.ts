export const isProductOnActiveSale = (product: {
  is_on_sale: boolean;
  sale_price?: number | null;
  sale_end_date?: string | null;
}): boolean => {
  return (
    product.is_on_sale === true &&
    product.sale_price != null &&
    product.sale_price > 0 &&
    (!product.sale_end_date || new Date(product.sale_end_date).getTime() > Date.now())
  );
};
