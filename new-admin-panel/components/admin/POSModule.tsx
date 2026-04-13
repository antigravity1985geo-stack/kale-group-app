"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Search, ShoppingCart, Plus, Minus, Trash2, CreditCard, Banknote, Calendar, Building2, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"

const mockProducts = [
  { id: "1", name: "პრემიუმ ტყავის დივანი", category: "დივნები", price: 2850, salePrice: 2450, isOnSale: true, image: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=200&h=200&fit=crop" },
  { id: "2", name: "მოდერნ სექციური დივანი", category: "დივნები", price: 3200, salePrice: null, isOnSale: false, image: "https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?w=200&h=200&fit=crop" },
  { id: "3", name: "მინიმალისტური ყავის მაგიდა", category: "მაგიდები", price: 450, salePrice: 380, isOnSale: true, image: "https://images.unsplash.com/photo-1533090481720-856c6e3c1fdc?w=200&h=200&fit=crop" },
  { id: "4", name: "ერგონომიული სავარძელი", category: "სავარძლები", price: 1200, salePrice: null, isOnSale: false, image: "https://images.unsplash.com/photo-1580480055273-228ff5388ef8?w=200&h=200&fit=crop" },
  { id: "5", name: "საძინებლის კომოდი", category: "კომოდები", price: 680, salePrice: null, isOnSale: false, image: "https://images.unsplash.com/photo-1558997519-83ea9252edf8?w=200&h=200&fit=crop" },
  { id: "6", name: "თანამედროვე საწოლი", category: "საწოლები", price: 1850, salePrice: 1600, isOnSale: true, image: "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=200&h=200&fit=crop" },
]

type CartItem = {
  id: string
  name: string
  price: number
  quantity: number
  image: string
}

type PaymentMethod = "cash" | "card" | "installment" | "bank_transfer"

export function POSModule() {
  const [searchQuery, setSearchQuery] = useState("")
  const [cart, setCart] = useState<CartItem[]>([])
  const [customerName, setCustomerName] = useState("")
  const [customerPhone, setCustomerPhone] = useState("")
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash")
  const [showSuccess, setShowSuccess] = useState(false)

  const filteredProducts = mockProducts.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const addToCart = (product: typeof mockProducts[0]) => {
    const price = product.isOnSale && product.salePrice ? product.salePrice : product.price
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id)
      if (existing) {
        return prev.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        )
      }
      return [...prev, { id: product.id, name: product.name, price, quantity: 1, image: product.image }]
    })
  }

  const updateQuantity = (id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.id === id ? { ...item, quantity: Math.max(0, item.quantity + delta) } : item
        )
        .filter((item) => item.quantity > 0)
    )
  }

  const clearCart = () => setCart([])

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const installmentFee = paymentMethod === "installment" ? subtotal * 0.05 : 0
  const total = subtotal + installmentFee

  const handleCheckout = () => {
    if (cart.length === 0 || !customerName) return
    setShowSuccess(true)
    setTimeout(() => {
      setShowSuccess(false)
      setCart([])
      setCustomerName("")
      setCustomerPhone("")
      setPaymentMethod("cash")
    }, 3000)
  }

  const paymentMethods: { id: PaymentMethod; label: string; icon: React.ReactNode }[] = [
    { id: "cash", label: "ნაღდი", icon: <Banknote className="h-4 w-4" /> },
    { id: "card", label: "ბარათი", icon: <CreditCard className="h-4 w-4" /> },
    { id: "installment", label: "განვადება", icon: <Calendar className="h-4 w-4" /> },
    { id: "bank_transfer", label: "გადარიცხვა", icon: <Building2 className="h-4 w-4" /> },
  ]

  return (
    <div className="flex gap-6 h-[calc(100vh-180px)]">
      {/* Products Grid */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="პროდუქტის ძიება..."
            className="w-full rounded-xl border border-border bg-card py-3 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        {/* Products */}
        <div className="flex-1 overflow-y-auto rounded-2xl border border-border/50 bg-card p-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredProducts.map((product, index) => {
              const cartItem = cart.find((item) => item.id === product.id)
              return (
                <motion.button
                  key={product.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.03 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => addToCart(product)}
                  className="group relative overflow-hidden rounded-xl border border-border/50 bg-background p-3 text-left transition-all hover:border-primary/50 hover:shadow-lg"
                >
                  {/* Image */}
                  <div className="relative aspect-square overflow-hidden rounded-lg">
                    <img
                      src={product.image}
                      alt={product.name}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                    />
                    {product.isOnSale && (
                      <span className="absolute left-2 top-2 rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white">
                        SALE
                      </span>
                    )}
                    {cartItem && (
                      <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                        {cartItem.quantity}
                      </span>
                    )}
                  </div>

                  {/* Info */}
                  <div className="mt-3">
                    <p className="text-xs text-muted-foreground">{product.category}</p>
                    <p className="mt-0.5 font-medium text-foreground line-clamp-1">{product.name}</p>
                    <div className="mt-2 flex items-center gap-2">
                      {product.isOnSale && product.salePrice ? (
                        <>
                          <span className="text-lg font-bold text-foreground">₾ {product.salePrice}</span>
                          <span className="text-sm text-muted-foreground line-through">₾ {product.price}</span>
                        </>
                      ) : (
                        <span className="text-lg font-bold text-foreground">₾ {product.price}</span>
                      )}
                    </div>
                  </div>
                </motion.button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Cart Sidebar */}
      <motion.div
        initial={{ x: 50, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className="w-96 flex flex-col rounded-2xl border border-border/50 bg-card overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/50 p-4">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-primary" />
            <span className="font-semibold text-foreground">კალათა</span>
            {cart.length > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-bold text-primary-foreground">
                {cart.reduce((sum, item) => sum + item.quantity, 0)}
              </span>
            )}
          </div>
          {cart.length > 0 && (
            <button
              onClick={clearCart}
              className="text-sm text-red-500 hover:text-red-600"
            >
              გასუფთავება
            </button>
          )}
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-4">
          <AnimatePresence mode="popLayout">
            {cart.map((item) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="mb-3 flex items-center gap-3 rounded-xl border border-border/50 bg-background p-3"
              >
                <img
                  src={item.image}
                  alt={item.name}
                  className="h-12 w-12 rounded-lg object-cover"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground line-clamp-1">{item.name}</p>
                  <p className="text-sm font-bold text-primary">₾ {item.price}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => updateQuantity(item.id, -1)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted text-muted-foreground hover:bg-secondary"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <span className="w-8 text-center text-sm font-medium text-foreground">{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item.id, 1)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted text-muted-foreground hover:bg-secondary"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {cart.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <ShoppingCart className="h-12 w-12 text-muted-foreground/30" />
              <p className="mt-4 text-muted-foreground">კალათა ცარიელია</p>
            </div>
          )}
        </div>

        {/* Checkout Form */}
        {cart.length > 0 && (
          <div className="border-t border-border/50 p-4 space-y-4">
            {/* Customer Info */}
            <div className="space-y-3">
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="მომხმარებლის სახელი *"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
              />
              <input
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="ტელეფონი (არასავალდებულო)"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
              />
            </div>

            {/* Payment Methods */}
            <div className="grid grid-cols-2 gap-2">
              {paymentMethods.map((method) => (
                <button
                  key={method.id}
                  onClick={() => setPaymentMethod(method.id)}
                  className={cn(
                    "flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-all",
                    paymentMethod === method.id
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-background text-muted-foreground hover:bg-muted"
                  )}
                >
                  {method.icon}
                  {method.label}
                </button>
              ))}
            </div>

            {/* Totals */}
            <div className="space-y-2 rounded-lg bg-muted/50 p-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">ქვეჯამი</span>
                <span className="text-foreground">₾ {subtotal.toLocaleString()}</span>
              </div>
              {installmentFee > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">განვადების საკომისიო (+5%)</span>
                  <span className="text-amber-600 dark:text-amber-400">₾ {installmentFee.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-border pt-2 text-lg font-bold">
                <span className="text-foreground">სულ</span>
                <span className="text-primary">₾ {total.toLocaleString()}</span>
              </div>
            </div>

            {/* Checkout Button */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleCheckout}
              disabled={!customerName}
              className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              გაყიდვის დასრულება
            </motion.button>
          </div>
        )}
      </motion.div>

      {/* Success Modal */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="rounded-2xl bg-card p-8 text-center shadow-2xl"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20"
              >
                <CheckCircle2 className="h-8 w-8 text-emerald-500" />
              </motion.div>
              <h3 className="mt-4 text-xl font-bold text-foreground">გაყიდვა დასრულდა!</h3>
              <p className="mt-2 text-muted-foreground">შეკვეთა წარმატებით შეიქმნა</p>
              <p className="mt-4 text-2xl font-bold text-primary">₾ {total.toLocaleString()}</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
