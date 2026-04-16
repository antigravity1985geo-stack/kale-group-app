import type { Product, Category } from '../types/product';

/**
 * Returns the localized name for a product.
 * Falls back to the Georgian name (product.name) if no translation exists.
 */
export function getProductName(product: Product, lang: string): string {
  if (lang === 'ka' || !product.translations) return product.name;
  return product.translations[lang]?.name || product.name;
}

/**
 * Returns the localized description for a product.
 * Falls back to the Georgian description if no translation exists.
 */
export function getProductDescription(product: Product, lang: string): string {
  const fallback = product.description ?? '';
  if (lang === 'ka' || !product.translations) return fallback;
  return product.translations[lang]?.description || fallback;
}

/**
 * Returns the localized name for a category.
 * Falls back to the Georgian name (category.name) if no translation exists.
 */
export function getCategoryName(category: Category, lang: string): string {
  if (lang === 'ka' || !category.translations) return category.name;
  return category.translations[lang] || category.name;
}

/**
 * Returns a localized display name for a product's category string.
 * Used when we only have the raw category string (e.g. from product.category),
 * and a list of all categories with their translations.
 */
export function getLocalizedCategoryName(
  categoryName: string,
  categories: Category[],
  lang: string
): string {
  if (lang === 'ka') return categoryName;
  const cat = categories.find((c) => c.name === categoryName);
  if (!cat) return categoryName;
  return getCategoryName(cat, lang);
}
