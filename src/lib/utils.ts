import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function isProductOnSale(product: { is_on_sale?: boolean, sale_start_date?: string, sale_end_date?: string }): boolean {
  if (!product.is_on_sale) return false;
  
  const now = new Date();
  
  if (product.sale_start_date) {
    const startDate = new Date(product.sale_start_date);
    if (now < startDate) return false;
  }
  
  if (product.sale_end_date) {
    const endDate = new Date(product.sale_end_date);
    // Add 1 day to the end date to include the whole entire day of the sale_end_date, if it's set as just a date.
    // Assuming sale_end_date is datetime, we compare directly.
    if (now > endDate) return false;
  }
  
  return true;
}
