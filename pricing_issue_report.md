# 🛑 პრობლემის აღწერა: ფასდაკლების ფასი კალათაში და Checkout გვერდზე

## 🔍 ხარვეზი
სისტემაში პროდუქციის ფასდაკლების (SALE) მოდული დამატებულია, თუმცა კალათაში (Cart) და გადახდის (Checkout) გვერდზე ჯამური თანხის დათვლისას პროგრამა კვლავ იყენებს პროდუქტის **საწყის ფასს (`price`)** და არა **ფასდაკლებულ ფასს (`sale_price`)**.

ეს ხდება მაშინაც კი, როდესაც `is_on_sale` არის `true`.

---

## 📂 ჩართული ფაილები და მათი როლი:
1.  **`src/types/product.ts`**: აქ არის განსაზღვრული `Product` ინტერფეისი, რომელიც შეიცავს `price`, `is_on_sale` და `sale_price` ველებს.
2.  **`src/context/CartContext.tsx`**: აქ ხდება `totalPrice`-ს დათვლა `items.reduce` მეთოდით.
3.  **`src/components/cart/CartDrawer.tsx`**: აქ ხდება თითოეული პროდუქტის ფასის ჩვენება მომხმარებლისთვის.
4.  **`src/pages/CheckoutPage.tsx`**: აქ ხდება შეკვეთის საბოლოო შეჯამება და გადახდისთვის გაგზავნა.

---

## 🛠️ მოგვარების დეტალური გეგმა (Implementation Roadmap):

### ნაბიჯი 1: ფასის განსაზღვრის უტილიტა
შევქმნათ ახალი ფაილი `src/utils/price.ts`, რომელიც მოახდენს ფასის ლოგიკის ცენტრალიზებას:
```typescript
import { Product } from '../types/product';

export const getEffectivePrice = (product: Product): number => {
  if (product.is_on_sale && product.sale_price !== undefined && product.sale_price !== null) {
    return product.sale_price;
  }
  return product.price;
};
```

### ნაბიჯი 2: CartContext-ის განახლება
`src/context/CartContext.tsx`-ში შევცვალოთ `totalPrice`-ს გამოთვლის ლოგიკა:
```typescript
// ძველი ვერსია:
// const totalPrice = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

// ახალი ვერსია:
const totalPrice = items.reduce((sum, item) => sum + getEffectivePrice(item.product) * item.quantity, 0);
```

### ნაბიჯი 3: CartDrawer UI-ს შესწორება
`src/components/cart/CartDrawer.tsx`-ში თითოეული ელემენტის ფასის ჩვენებისას გამოვიყენოთ `getEffectivePrice`:
```tsx
// ნაცვლად: item.product.price * item.quantity
// გამოვიყენოთ: getEffectivePrice(item.product) * item.quantity
```

### ნაბიჯი 4: CheckoutPage-ს განახლება
`src/pages/CheckoutPage.tsx`-ში შეკვეთის შეჯამების სექციაში (Summary) გამოვიყენოთ იგივე `getEffectivePrice` ფუნქცია. ასევე გადავამოწმოთ backend-ისთვის გადაცემული `items` ობიექტი.

---

## ✅ მოსალოდნელი შედეგი:
კალათაში და Checkout გვერდზე მომხმარებელი დაინახავს ფასდაკლებულ ფასს, ხოლო ჯამური თანხა დაითვლება სწორად, აქციების გათვალისწინებით.

> [!NOTE]
> ეს ცვლილება უზრუნველყოფს, რომ ნებისმიერი მომავალი აქცია (Sale) ავტომატურად აისახოს კალათის ლოგიკაში დამატებითი კოდის წერის გარეშე.
