// Categories that sell physical goods and share the same posting flow:
// mandatory photos, shipping charge, payment methods, and stock/photo-count checks.
// 2026-07-31: created this shared list (previously 'boutique'/'jewelry' were checked
// separately, inline, in PostServiceScreen.tsx and EditListing.tsx) and added
// 'indian groceries' so it gets the same flow.
export const PRODUCT_SALE_CATEGORIES = ['boutique', 'jewelry', 'indian groceries'];

export function isProductCategory(categoryName?: string | null): boolean {
  const normalized = categoryName?.toLowerCase().trim();
  return !!normalized && PRODUCT_SALE_CATEGORIES.includes(normalized);
}
