import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Eye, Trash2, ShoppingCart, Clock, CheckCircle, Truck, XCircle,
  BarChart3, X, ChevronRight, CreditCard, Banknote, DollarSign, Loader2, Package
} from "lucide-react"
import { cn } from "@/src/lib/utils"
import { supabase } from "@/src/lib/supabase"
import OffcutLogger from "./OffcutLogger"

interface OrdersProps {
  orders: any[]
  searchQuery: string
  onRefresh: () => Promise<void>
  canDeleteOrders: boolean
  onStatusUpdate: (orderId: string, newStatus: string, paymentMethod?: string) => Promise<boolean>
  onDeleteOrder: (id: string) => void
}

const statusConfig: Record<string, { label: string; color: string; bgColor: string; icon: any }> = {
  pending: { label: "მოლოდინში", color: "text-yellow-500", bgColor: "bg-yellow-500/10", icon: Clock },
  processing: { label: "მუშავდება", color: "text-blue-500", bgColor: "bg-blue-500/10", icon: BarChart3 },
  shipped: { label: "გაგზავნილი", color: "text-violet-500", bgColor: "bg-violet-500/10", icon: Truck },
  delivered: { label: "მიწოდებული", color: "text-emerald-500", bgColor: "bg-emerald-500/10", icon: CheckCircle },
  cancelled: { label: "გაუქმებული", color: "text-red-500", bgColor: "bg-red-500/10", icon: XCircle },
}

const statusFlow: Record<string, string[]> = {
  pending: ["processing", "cancelled"],
  processing: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: [],
  cancelled: [],
}

const paymentMethods = [
  { id: "card_bog", label: "BoG ბარათი", icon: CreditCard },
  { id: "card_tbc", label: "TBC ბარათი", icon: CreditCard },
  { id: "credo", label: "Credo განვადება", icon: DollarSign },
  { id: "cash", label: "ნაღდი ანგარიშსწორება", icon: Banknote },
  { id: "transfer", label: "საბანკო გადარიცხვა", icon: DollarSign },
]

export function Orders({
  orders,
  searchQuery,
  onRefresh,
  canDeleteOrders,
  onStatusUpdate,
  onDeleteOrder,
}: OrdersProps) {
  const [selectedOrder, setSelectedOrder] = useState<any>(null)
  const [orderItems, setOrderItems] = useState<any[]>([])
  const [isLoadingItems, setIsLoadingItems] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [pendingDeliveryOrderId, setPendingDeliveryOrderId] = useState<string | null>(null)
  const [showOffcutLogger, setShowOffcutLogger] = useState(false)
  const [offcutOrderId, setOffcutOrderId] = useState<string | null>(null)

  const filteredOrders = orders.filter((o) => {
    const q = searchQuery.toLowerCase()
    return (
      (o.customer_first_name || "").toLowerCase().includes(q) ||
      (o.customer_last_name || "").toLowerCase().includes(q) ||
      (o.customer_phone || "").toLowerCase().includes(q) ||
      (o.id || "").toLowerCase().includes(q)
    )
  })

  const handleViewOrder = async (order: any) => {
    setSelectedOrder(order)
    setIsLoadingItems(true)
    try {
      const { data } = await supabase
        .from("order_items")
        .select("*, products(images)")
        .eq("order_id", order.id)
      setOrderItems(data || [])
    } catch (err) {
      console.error("Error fetching order items:", err)
    } finally {
      setIsLoadingItems(false)
    }
  }

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    // If changing to delivered, ask for payment method first
    if (newStatus === "delivered") {
      setPendingDeliveryOrderId(orderId)
      setShowPaymentModal(true)
      return
    }
    
    if (newStatus === "shipped") {
      setOffcutOrderId(orderId)
      setShowOffcutLogger(true)
      return
    }

    setIsUpdating(true)
    const success = await onStatusUpdate(orderId, newStatus)
    setIsUpdating(false)
    if (success && selectedOrder?.id === orderId) {
      setSelectedOrder({ ...selectedOrder, status: newStatus })
    }
  }

  const handleOffcutLogComplete = async () => {
    setShowOffcutLogger(false)
    if (!offcutOrderId) return
    setIsUpdating(true)
    const success = await onStatusUpdate(offcutOrderId, "shipped")
    setIsUpdating(false)
    if (success && selectedOrder?.id === offcutOrderId) {
      setSelectedOrder({ ...selectedOrder, status: "shipped" })
    }
    setOffcutOrderId(null)
  }

  const handleDeliveryConfirm = async (paymentMethod: string) => {
    if (!pendingDeliveryOrderId) return
    setIsUpdating(true)
    setShowPaymentModal(false)
    const success = await onStatusUpdate(pendingDeliveryOrderId, "delivered", paymentMethod)
    setIsUpdating(false)
    if (success && selectedOrder?.id === pendingDeliveryOrderId) {
      setSelectedOrder({ ...selectedOrder, status: "delivered", payment_method: paymentMethod })
    }
    setPendingDeliveryOrderId(null)
  }

  return (
    <>
      {/* Orders Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="rounded-2xl border border-border/50 bg-card overflow-hidden"
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/50 bg-muted/50">
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">კლიენტი</th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">ტელეფონი</th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">ქალაქი</th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">თანხა</th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">სტატუსი</th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">თარიღი</th>
                <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">მოქმედება</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {filteredOrders.map((order, index) => {
                const sc = statusConfig[order.status] || statusConfig.pending
                return (
                  <motion.tr
                    key={order.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className="group transition-colors hover:bg-muted/50 cursor-pointer"
                    onClick={() => handleViewOrder(order)}
                  >
                    <td className="px-6 py-4">
                      <p className="font-semibold text-foreground">{order.customer_first_name} {order.customer_last_name}</p>
                      {order.sale_source === "showroom" && (
                        <span className="mt-0.5 inline-block text-[10px] font-bold uppercase text-amber-500">შოურუმი</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{order.customer_phone}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{order.customer_city}</td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-semibold text-foreground">₾ {parseFloat(order.total_price).toLocaleString()}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium", sc.color, sc.bgColor)}>
                        <sc.icon className="h-3 w-3" />
                        {sc.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {new Date(order.created_at).toLocaleDateString("ka-GE")}
                    </td>
                    <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2">
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => handleViewOrder(order)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground hover:bg-blue-500/10 hover:text-blue-500 transition-colors"
                        >
                          <Eye className="h-4 w-4" />
                        </motion.button>
                        {canDeleteOrders && (
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => onDeleteOrder(order.id)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground hover:bg-red-500/10 hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </motion.button>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {filteredOrders.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20">
            <ShoppingCart className="h-12 w-12 text-muted-foreground/30" />
            <p className="mt-4 text-lg font-medium text-muted-foreground">შეკვეთა ვერ მოიძებნა</p>
          </div>
        )}
      </motion.div>

      {/* Order Detail Modal */}
      <AnimatePresence>
        {selectedOrder && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 backdrop-blur-sm p-4 pt-10"
            onClick={() => setSelectedOrder(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl rounded-2xl bg-card border border-border/50 shadow-2xl"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-border/50 px-6 py-4">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">შეკვეთის დეტალები</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">ID: {selectedOrder.id.slice(0, 8)}...</p>
                </div>
                <button onClick={() => setSelectedOrder(null)} className="text-muted-foreground hover:text-foreground">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="max-h-[70vh] overflow-y-auto p-6 space-y-5">
                {/* Customer Info */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-xs text-muted-foreground block">კლიენტი</span>
                    <p className="font-semibold text-foreground">{selectedOrder.customer_first_name} {selectedOrder.customer_last_name}</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block">ტელეფონი</span>
                    <p className="font-medium text-foreground">{selectedOrder.customer_phone}</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block">ელ-ფოსტა</span>
                    <p className="text-foreground">{selectedOrder.customer_email || "—"}</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block">ქალაქი</span>
                    <p className="text-foreground">{selectedOrder.customer_city}</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-xs text-muted-foreground block">მისამართი</span>
                    <p className="text-foreground">{selectedOrder.customer_address}</p>
                  </div>
                  {selectedOrder.customer_note && (
                    <div className="col-span-2">
                      <span className="text-xs text-muted-foreground block">შენიშვნა</span>
                      <p className="text-foreground italic">{selectedOrder.customer_note}</p>
                    </div>
                  )}
                </div>

                {/* Payment & Status Info */}
                <div className="grid grid-cols-3 gap-4 rounded-xl bg-muted/50 p-4 text-sm">
                  <div>
                    <span className="text-xs text-muted-foreground block">სულ თანხა</span>
                    <p className="text-xl font-bold text-foreground">₾ {parseFloat(selectedOrder.total_price).toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block">გადახდა</span>
                    <p className="font-medium text-foreground">{selectedOrder.payment_method || "—"}</p>
                    <p className="text-xs text-muted-foreground">{selectedOrder.payment_type || ""}</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block">წყარო</span>
                    <p className="font-medium text-foreground">{selectedOrder.sale_source === "showroom" ? "შოურუმი" : "ვებგვერდი"}</p>
                  </div>
                </div>

                {/* Order Items */}
                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-3">შეკვეთის პროდუქტები</h4>
                  {isLoadingItems ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  ) : orderItems.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">პროდუქტები არ მოიძებნა</p>
                  ) : (
                    <div className="space-y-2">
                      {orderItems.map((item) => (
                        <div key={item.id} className="flex items-center gap-3 rounded-xl border border-border/50 bg-muted/30 p-3">
                          <div className="h-12 w-12 overflow-hidden rounded-lg border border-border/50 bg-muted flex-shrink-0">
                            <img
                              src={item.products?.images?.[0] || "https://via.placeholder.com/100"}
                              alt={item.product_name}
                              className="h-full w-full object-cover"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-foreground text-sm truncate">{item.product_name}</p>
                            <p className="text-xs text-muted-foreground">{item.quantity} × ₾ {parseFloat(item.price_at_purchase).toLocaleString()}</p>
                          </div>
                          <p className="text-sm font-bold text-foreground">₾ {(item.quantity * parseFloat(item.price_at_purchase)).toLocaleString()}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Status Actions */}
                {statusFlow[selectedOrder.status]?.length > 0 && (
                  <div className="border-t border-border/50 pt-4">
                    <h4 className="text-sm font-semibold text-foreground mb-3">სტატუსის ცვლილება</h4>
                    <div className="flex flex-wrap gap-2">
                      {statusFlow[selectedOrder.status].map((nextStatus) => {
                        const sc = statusConfig[nextStatus]
                        return (
                          <button
                            key={nextStatus}
                            disabled={isUpdating}
                            onClick={() => handleStatusChange(selectedOrder.id, nextStatus)}
                            className={cn(
                              "flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors border",
                              nextStatus === "cancelled"
                                ? "border-red-500/20 bg-red-500/5 text-red-500 hover:bg-red-500/10"
                                : "border-primary/20 bg-primary/5 text-primary hover:bg-primary/10",
                              isUpdating && "opacity-50 cursor-not-allowed"
                            )}
                          >
                            {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : <sc.icon className="h-4 w-4" />}
                            <ChevronRight className="h-3 w-3" />
                            {sc.label}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Payment Method Modal (for delivery) */}
      <AnimatePresence>
        {showPaymentModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => { setShowPaymentModal(false); setPendingDeliveryOrderId(null) }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-2xl bg-card border border-border/50 shadow-2xl p-6 space-y-4"
            >
              <h3 className="text-lg font-semibold text-foreground text-center">გადახდის მეთოდი</h3>
              <p className="text-sm text-muted-foreground text-center">აირჩიეთ, როგორ გადაიხადა კლიენტმა</p>
              <div className="space-y-2">
                {paymentMethods.map((pm) => (
                  <button
                    key={pm.id}
                    onClick={() => handleDeliveryConfirm(pm.id)}
                    className="w-full flex items-center gap-3 rounded-xl border border-border/50 bg-muted/30 px-4 py-3 text-sm font-medium text-foreground hover:bg-primary/5 hover:border-primary/30 transition-colors"
                  >
                    <pm.icon className="h-5 w-5 text-muted-foreground" />
                    {pm.label}
                  </button>
                ))}
              </div>
              <button
                onClick={() => { setShowPaymentModal(false); setPendingDeliveryOrderId(null) }}
                className="w-full rounded-xl border border-border py-2.5 text-sm text-foreground hover:bg-muted transition-colors"
              >
                გაუქმება
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showOffcutLogger && offcutOrderId && (
          <OffcutLogger
            productionOrderId={offcutOrderId}
            onComplete={handleOffcutLogComplete}
            onSkip={handleOffcutLogComplete}
          />
        )}
      </AnimatePresence>
    </>
  )
}
