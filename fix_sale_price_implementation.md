# 🤖 AI Implementation Guide: Fix Sale Price in Cart & Checkout

## 🎯 Objective
Fix a bug where the cart and checkout pages calculate totals using the original `price` instead of the discounted `sale_price` when a product `is_on_sale = true`.

---

## 📋 Context & Rules

- **Do NOT ask for clarification** — follow this guide exactly as written.
- **Do NOT modify any file not listed here.**
- **Create the utility file first**, then update the other files in order.
- After each file change, verify the change is correct before moving on.

---

## 🗂️ Files to Touch

| # | File | Action |
|---|------|--------|
| 1 | `src/utils/price.ts` | **CREATE** (new file) |
| 2 | `src/context/CartContext.tsx` | **EDIT** |
| 3 | `src/components/cart/CartDrawer.tsx` | **EDIT** |
| 4 | `src/pages/CheckoutPage.tsx` | **EDIT** |

---

## 📐 Data Model Reference

The `Product` type (defined in `src/types/product.ts`) already has these fields — do NOT change this file:

```typescript
interface Product {
  price: number;          // original price
  is_on_sale: boolean;    // whether sale is active
  sale_price?: number;    // discounted price (may be undefined/null)
}
```

---

## 🛠️ Step-by-Step Implementation

---

### Step 1 — CREATE `src/utils/price.ts`

Create this file from scratch. It centralizes price logic so every part of the app uses one source of truth.

```typescript
import { Product } from '../types/product';

/**
 * Returns the effective price of a product.
 * If the product is on sale and has a valid sale_price, returns sale_price.
 * Otherwise, returns the original price.
 */
export const getEffectivePrice = (product: Product): number => {
  if (
    product.is_on_sale &&
    product.sale_price !== undefined &&
    product.sale_price !== null
  ) {
    return product.sale_price;
  }
  return product.price;
};
```

✅ **Verify:** File exists at `src/utils/price.ts` and exports `getEffectivePrice`.

---

### Step 2 — EDIT `src/context/CartContext.tsx`

**What to change:** The `totalPrice` calculation inside the `reduce()` call.

**Find this pattern (exact logic, may vary slightly in formatting):**
```typescript
const totalPrice = items.reduce(
  (sum, item) => sum + item.product.price * item.quantity,
  0
);
```

**Replace with:**
```typescript
import { getEffectivePrice } from '../utils/price';

// ...

const totalPrice = items.reduce(
  (sum, item) => sum + getEffectivePrice(item.product) * item.quantity,
  0
);
```

> ⚠️ Add the import at the top of the file with the other imports — do NOT place it inside the function body.

✅ **Verify:** `item.product.price` is no longer referenced in the `totalPrice` reduce. The import exists at the top.

---

### Step 3 — EDIT `src/components/cart/CartDrawer.tsx`

**What to change:** Anywhere the component renders the price of a single cart item (usually inside a `.map()` over cart items).

**Find this pattern:**
```tsx
{item.product.price * item.quantity}
```
or
```tsx
item.product.price
```
(used for display, not quantity-multiplied — look for both)

**Replace each occurrence with:**
```tsx
import { getEffectivePrice } from '../../utils/price';

// Per-item total:
{getEffectivePrice(item.product) * item.quantity}

// Per-item unit price (if shown separately):
{getEffectivePrice(item.product)}
```

> ⚠️ Add the import at the top. Adjust the relative path (`../../utils/price`) if the file is nested differently — count directory levels from `src/components/cart/` up to `src/`.

✅ **Verify:** No occurrence of `item.product.price` remains in this file for display/calculation purposes.

---

### Step 4 — EDIT `src/pages/CheckoutPage.tsx`

**Two sub-tasks in this file:**

#### 4a — Fix the order summary display

Find where individual item prices or subtotals are rendered in the summary section. Apply the same replacement:

```tsx
import { getEffectivePrice } from '../utils/price';

// Replace:
item.product.price * item.quantity
// With:
getEffectivePrice(item.product) * item.quantity
```

#### 4b — Fix the payload sent to the backend

Find where cart items are serialized into an object to be sent to the backend (look for `fetch`, `axios.post`, or similar). The item price in the payload must also use `getEffectivePrice`:

```typescript
// Find something like:
const payload = {
  items: cartItems.map(item => ({
    productId: item.product.id,
    price: item.product.price,      // ← WRONG
    quantity: item.quantity,
  }))
};

// Replace with:
const payload = {
  items: cartItems.map(item => ({
    productId: item.product.id,
    price: getEffectivePrice(item.product),   // ← CORRECT
    quantity: item.quantity,
  }))
};
```

✅ **Verify:** No `item.product.price` appears in display or payload logic. Import is present at the top.

---

## ✅ Final Checklist

Before finishing, confirm all of the following:

- [ ] `src/utils/price.ts` created with `getEffectivePrice` exported
- [ ] `CartContext.tsx` — `totalPrice` uses `getEffectivePrice`
- [ ] `CartDrawer.tsx` — item prices displayed using `getEffectivePrice`
- [ ] `CheckoutPage.tsx` — summary display uses `getEffectivePrice`
- [ ] `CheckoutPage.tsx` — backend payload uses `getEffectivePrice`
- [ ] All 4 edited files have the correct import: `import { getEffectivePrice } from '.../utils/price'`
- [ ] `src/types/product.ts` was **NOT modified**
- [ ] No TypeScript errors introduced

---

## 🚫 Do NOT

- Do not rename `price`, `sale_price`, or `is_on_sale` fields in the `Product` type
- Do not inline the sale price logic — always use `getEffectivePrice()` from the utility
- Do not modify any file not listed in this guide
- Do not hardcode price values anywhere

---

## 🧪 Expected Behavior After Fix

| Scenario | Before Fix | After Fix |
|----------|-----------|-----------|
| Product with `is_on_sale: true`, `sale_price: 15`, `price: 30` | Shows 30, total = 30×qty | Shows 15, total = 15×qty |
| Product with `is_on_sale: false` | Shows 30 (correct) | Shows 30 (unchanged) |
| Product with `is_on_sale: true`, `sale_price: null` | Shows 30 | Shows 30 (fallback to original price) |
| Backend payload price | Sends 30 | Sends 15 |
