import { useState, useMemo, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  ShoppingCart, Plus, Minus, Trash2, Search, CreditCard, Banknote, DollarSign,
  CheckCircle, X, Loader2, Package, User, Phone, MapPin, Hash, ScanBarcode
} from "lucide-react"
import { cn, isProductOnSale } from "@/src/lib/utils"
import { supabase } from "@/src/lib/supabase"
import { safeFetch } from "@/src/utils/safeFetch"
import { createWaybillForOrder } from "@/src/services/rsge/rsge.service"
import type { Product } from "@/src/types/product"

interface POSModuleProps {
  products: Product[]
  onRefresh: () => Promise<void>
  consultantId?: string
}

interface CartItem {
  product: Product
  quantity: number
}

const paymentMethods = [
  { id: "cash", label: "ნაღდი", icon: Banknote },
  { id: "card_bog", label: "BoG ბარათი", icon: CreditCard },
  { id: "card_tbc", label: "TBC ბარათი", icon: CreditCard },
  { id: "credo", label: "განვადება", icon: DollarSign },
  { id: "transfer", label: "გადარიცხვა", icon: DollarSign },
]

export function POSModule({ products, onRefresh, consultantId }: POSModuleProps) {
  const [cart, setCart] = useState<CartItem[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [checkoutSuccess, setCheckoutSuccess] = useState(false)
  const [createdOrderId, setCreatedOrderId] = useState<string | null>(null)

  // Waybill state for POS
  const [isGeneratingWaybill, setIsGeneratingWaybill] = useState(false)
  const [waybillResult, setWaybillResult] = useState<{ success: boolean; message: string } | null>(null)

  // Customer form
  const [customer, setCustomer] = useState({
    firstName: "", lastName: "", phone: "", email: "",
    address: "", city: "თბილისი", note: "", personalId: "",
    paymentMethod: "cash", paymentType: "full",
  })

  const filteredProducts = useMemo(() => {
    const q = searchQuery.toLowerCase()
    return products.filter((p) =>
      p.name.toLowerCase().includes(q) || 
      p.category.toLowerCase().includes(q) ||
      (p.barcode && p.barcode.toLowerCase().includes(q))
    )
  }, [products, searchQuery])

  // ── Global Barcode Scanner Listener ──
  const [scannedCode, setScannedCode] = useState("")
  const scanTimeout = useRef<any>(null)

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is currently typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.key === "Enter") {
        if (scannedCode.length > 2) {
          const product = products.find(p => p.barcode === scannedCode || p.id.startsWith(scannedCode));
          if (product) {
            // Found product, automatically add to cart
            setCart((prev) => {
              const existing = prev.find((c) => c.product.id === product.id)
              if (existing) return prev.map((c) => c.product.id === product.id ? { ...c, quantity: c.quantity + 1 } : c)
              return [...prev, { product, quantity: 1 }]
            });
          }
        }
        setScannedCode("");
      } else if (e.key.length === 1) {
        setScannedCode(prev => prev + e.key);
        
        if (scanTimeout.current) clearTimeout(scanTimeout.current);
        scanTimeout.current = setTimeout(() => {
          setScannedCode("");
        }, 100); // Scanners type very fast, 100ms is a safe window
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [scannedCode, products]);

  const cartTotal = cart.reduce((sum, item) => {
    const price = isProductOnSale(item.product) ? (item.product.sale_price || item.product.price) : item.product.price
    return sum + Number(price) * item.quantity
  }, 0)

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.product.id === product.id)
      if (existing) {
        return prev.map((c) => c.product.id === product.id ? { ...c, quantity: c.quantity + 1 } : c)
      }
      return [...prev, { product, quantity: 1 }]
    })
  }

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((c) => c.product.id !== productId))
  }

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) => prev.map((c) => {
      if (c.product.id === productId) {
        const newQty = c.quantity + delta
        return newQty <= 0 ? c : { ...c, quantity: newQty }
      }
      return c
    }).filter((c) => c.quantity > 0))
  }

  const handleCheckout = async () => {
    if (!customer.firstName || !customer.lastName || !customer.phone) {
      alert("გთხოვთ შეავსოთ კლიენტის მონაცემები (სახელი, გვარი, ტელეფონი)")
      return
    }

    setIsProcessing(true)
    try {
      // 1. Atomic POS sale: server creates order + items + triggers accounting
      const saleResult = await safeFetch<{ order_id: string; accounting_error?: string | null }>(
        "/api/pos/sale",
        {
          method: "POST",
          body: JSON.stringify({
            customer,
            items: cart.map((c) => ({
              product_id: c.product.id,
              quantity: c.quantity,
            })),
            consultant_id: consultantId || null,
          }),
        }
      )

      setCreatedOrderId(saleResult.order_id)

      if (saleResult.accounting_error) {
        console.error("Accounting RPC error:", saleResult.accounting_error)
      }

      // 2. Sync stock_levels via existing inventory-adjustment API
      try {
        for (const c of cart) {
          const costParam = c.product.price ? Number(c.product.price) : 0
          await safeFetch("/api/accounting/inventory/adjustment", {
            method: "POST",
            body: JSON.stringify({
              product_id: c.product.id,
              quantity: c.quantity,
              type: "SALE_OUT",
              unit_cost: costParam,
              notes: `POS გაყიდვა - შეკვეთა #${saleResult.order_id}`,
            }),
          })
        }
      } catch (stockErr) {
        console.error("Stock sync error:", stockErr)
      }

      // 3. Success
      setCheckoutSuccess(true)
      setCart([])
      setCustomer({
        firstName: "", lastName: "", phone: "", email: "",
        address: "", city: "თბილისი", note: "", personalId: "",
        paymentMethod: "cash", paymentType: "full",
      })

      await onRefresh()

      // Don't auto-close if the user might want a waybill
      // setTimeout(() => {
      //   setCheckoutSuccess(false)
      //   setIsCheckoutOpen(false)
      // }, 3000)
    } catch (err: any) {
      alert("შეცდომა: " + err.message)
    } finally {
      setIsProcessing(false)
    }
  }

  const handlePOSWaybill = async () => {
    if (!createdOrderId) return
    setIsGeneratingWaybill(true)
    setWaybillResult(null)
    try {
      const res = await createWaybillForOrder(createdOrderId, {
        startAddress: "თბილისი", // Default city
        endAddress: customer.address || "თბილისი",
        transport: { transportType: 'HAND' }
      })
      setWaybillResult({ success: res.success, message: res.message })
    } catch (err: any) {
      setWaybillResult({ success: false, message: err.message })
    } finally {
      setIsGeneratingWaybill(false)
    }
  }

  const handleCloseSuccess = () => {
    setCheckoutSuccess(false)
    setCreatedOrderId(null)
    setWaybillResult(null)
    setIsCheckoutOpen(false)
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Product Catalog */}
      <div className="lg:col-span-2 space-y-4">
        {/* Search */}
        <div className="relative flex items-center justify-between gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="პროდუქტის ძიება (სახელი, კატეგორია, ბარკოდი)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-border bg-card pl-10 pr-4 py-3 text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div className="hidden sm:flex items-center gap-2 px-4 py-3 rounded-xl bg-muted/30 border border-border/50 text-xs text-muted-foreground font-medium">
             <ScanBarcode className="h-4 w-4 text-primary" />
             <span>ბარკოდის სკანერი აქტიურია</span>
          </div>
        </div>

        {/* Product Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {filteredProducts.map((product, i) => {
            const price = isProductOnSale(product) ? (product.sale_price || product.price) : product.price
            const inCart = cart.find((c) => c.product.id === product.id)
            return (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.02 }}
                onClick={() => addToCart(product)}
                className={cn(
                  "group cursor-pointer rounded-xl border bg-card overflow-hidden transition-all hover:shadow-lg",
                  inCart ? "border-primary/50 ring-2 ring-primary/20" : "border-border/50",
                  product.in_stock === false && "opacity-50 pointer-events-none"
                )}
              >
                <div className="relative aspect-[3/4] overflow-hidden">
                  <img
                    src={product.images?.[0] || "https://via.placeholder.com/300x300"}
                    alt={product.name}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/5" />

                  {/* Badges top right */}
                  {isProductOnSale(product) && (
                    <span className="absolute top-2 right-2 rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-black text-white shadow-md">
                      -{product.discount_percentage}%
                    </span>
                  )}
                  {inCart && (
                    <span className="absolute top-2 left-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground shadow-md">
                      {inCart.quantity}
                    </span>
                  )}

                  {/* Overlaid Info */}
                  <div className="absolute bottom-0 left-0 right-0 p-3 leading-tight">
                    <p className="text-sm font-bold text-white truncate drop-shadow-md">{product.name}</p>
                    <div className="flex items-baseline gap-1.5 mt-0.5">
                      <span className="text-sm font-black text-emerald-400 drop-shadow-md">₾ {Number(price).toLocaleString()}</span>
                      {isProductOnSale(product) && (
                        <span className="text-[10px] text-white/60 line-through">₾ {Number(product.price).toLocaleString()}</span>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* Cart Panel */}
      <div className="lg:col-span-1">
        <div className="sticky top-6 rounded-2xl border border-border/50 bg-card overflow-hidden">
          <div className="flex items-center gap-2 border-b border-border/50 px-5 py-4">
            <ShoppingCart className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-foreground">კალათა</h3>
            <span className="ml-auto rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">
              {cart.length}
            </span>
          </div>

          <div className="max-h-[400px] overflow-y-auto p-4 space-y-3">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Package className="h-8 w-8 mb-2 opacity-30" />
                <p className="text-sm">კალათა ცარიელია</p>
              </div>
            ) : (
              cart.map((item) => {
                const price = isProductOnSale(item.product) ? (item.product.sale_price || item.product.price) : item.product.price
                return (
                  <div key={item.product.id} className="flex items-center gap-3 rounded-xl bg-muted/50 p-3">
                    <div className="h-10 w-10 overflow-hidden rounded-lg border border-border/50">
                      <img src={item.product.images?.[0] || ""} alt="" className="h-full w-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{item.product.name}</p>
                      <p className="text-xs text-muted-foreground">₾ {Number(price).toLocaleString()}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => updateQuantity(item.product.id, -1)} className="flex h-6 w-6 items-center justify-center rounded-md bg-muted hover:bg-muted-foreground/10 text-foreground">
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="w-6 text-center text-xs font-bold text-foreground">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.product.id, 1)} className="flex h-6 w-6 items-center justify-center rounded-md bg-muted hover:bg-muted-foreground/10 text-foreground">
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                    <button onClick={() => removeFromCart(item.product.id)} className="text-muted-foreground hover:text-red-500">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )
              })
            )}
          </div>

          {cart.length > 0 && (
            <div className="border-t border-border/50 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">სულ:</span>
                <span className="text-xl font-bold text-foreground">₾ {cartTotal.toLocaleString()}</span>
              </div>
              <button
                onClick={() => setIsCheckoutOpen(true)}
                className="w-full rounded-xl bg-primary py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors shadow-lg shadow-primary/25"
              >
                გაყიდვა
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Checkout Modal */}
      <AnimatePresence>
        {isCheckoutOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => !isProcessing && setIsCheckoutOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg rounded-2xl bg-card border border-border/50 shadow-2xl"
            >
              {checkoutSuccess ? (
                <div className="flex flex-col items-center justify-center py-16 px-6">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", delay: 0.1 }}
                  >
                    <CheckCircle className="h-16 w-16 text-emerald-500 mb-4" />
                  </motion.div>
                  <h3 className="text-xl font-bold text-foreground">გაყიდვა წარმატებით!</h3>
                  <p className="text-sm text-muted-foreground mt-2">შეკვეთა #{createdOrderId?.slice(0, 8)}</p>

                  <div className="mt-8 w-full space-y-3">
                    {!waybillResult?.success ? (
                      <button
                        onClick={handlePOSWaybill}
                        disabled={isGeneratingWaybill}
                        className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary/10 border border-primary/20 py-3 text-sm font-bold text-primary hover:bg-primary/20 transition-all"
                      >
                        {isGeneratingWaybill ? <Loader2 className="h-4 w-4 animate-spin" /> : <Package className="h-4 w-4" />}
                        RS.ge ზედნადების გაწერა
                      </button>
                    ) : (
                      <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3 text-emerald-500 text-xs font-bold justify-center">
                        <CheckCircle className="h-4 w-4" />
                        ზედნადები გაწერილია: {waybillResult.message}
                      </div>
                    )}

                    <button
                      onClick={handleCloseSuccess}
                      className="w-full rounded-xl border border-border py-3 text-sm font-medium text-foreground hover:bg-muted transition-colors"
                    >
                      დახურვა
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between border-b border-border/50 px-6 py-4">
                    <h3 className="text-lg font-semibold text-foreground">გაყიდვის დასრულება</h3>
                    <button onClick={() => setIsCheckoutOpen(false)} className="text-muted-foreground hover:text-foreground">
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="max-h-[60vh] overflow-y-auto p-6 space-y-4">
                    {/* Customer Info */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-medium text-foreground mb-1 block">სახელი *</label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                          <input
                            type="text"
                            required
                            value={customer.firstName}
                            onChange={(e) => setCustomer({ ...customer, firstName: e.target.value })}
                            className="w-full rounded-lg border border-border bg-background pl-9 pr-3 py-2 text-sm focus:border-primary focus:outline-none"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-foreground mb-1 block">გვარი *</label>
                        <input
                          type="text"
                          required
                          value={customer.lastName}
                          onChange={(e) => setCustomer({ ...customer, lastName: e.target.value })}
                          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-foreground mb-1 block">ტელეფონი *</label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                          <input
                            type="tel"
                            required
                            value={customer.phone}
                            onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
                            className="w-full rounded-lg border border-border bg-background pl-9 pr-3 py-2 text-sm focus:border-primary focus:outline-none"
                            placeholder="5XX XXX XXX"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-foreground mb-1 block">პ/ნ</label>
                        <div className="relative">
                          <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                          <input
                            type="text"
                            value={customer.personalId}
                            onChange={(e) => setCustomer({ ...customer, personalId: e.target.value })}
                            className="w-full rounded-lg border border-border bg-background pl-9 pr-3 py-2 text-sm focus:border-primary focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Payment Method */}
                    <div>
                      <label className="text-xs font-medium text-foreground mb-2 block">გადახდის მეთოდი</label>
                      <div className="grid grid-cols-3 gap-2">
                        {paymentMethods.map((pm) => (
                          <button
                            key={pm.id}
                            type="button"
                            onClick={() => setCustomer({ ...customer, paymentMethod: pm.id })}
                            className={cn(
                              "flex flex-col items-center gap-1 rounded-xl border px-3 py-3 text-xs font-medium transition-colors",
                              customer.paymentMethod === pm.id
                                ? "border-primary bg-primary/5 text-primary"
                                : "border-border text-muted-foreground hover:border-border/80"
                            )}
                          >
                            <pm.icon className="h-4 w-4" />
                            {pm.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Order Summary */}
                    <div className="rounded-xl bg-muted/50 p-4 space-y-2">
                      {cart.map((item) => {
                        const price = isProductOnSale(item.product) ? (item.product.sale_price || item.product.price) : item.product.price
                        return (
                          <div key={item.product.id} className="flex items-center justify-between text-sm">
                            <span className="text-foreground">{item.product.name} × {item.quantity}</span>
                            <span className="font-medium text-foreground">₾ {(Number(price) * item.quantity).toLocaleString()}</span>
                          </div>
                        )
                      })}
                      <div className="border-t border-border/50 pt-2 mt-2 flex items-center justify-between">
                        <span className="font-semibold text-foreground">სულ:</span>
                        <span className="text-lg font-bold text-primary">₾ {cartTotal.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="border-t border-border/50 p-4 flex justify-end gap-3">
                    <button
                      onClick={() => setIsCheckoutOpen(false)}
                      className="rounded-xl border border-border px-6 py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors"
                    >
                      გაუქმება
                    </button>
                    <button
                      disabled={isProcessing}
                      onClick={handleCheckout}
                      className="rounded-xl bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors shadow-lg shadow-primary/25 disabled:opacity-50 flex items-center gap-2"
                    >
                      {isProcessing && <Loader2 className="h-4 w-4 animate-spin" />}
                      გაყიდვის დასრულება
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
