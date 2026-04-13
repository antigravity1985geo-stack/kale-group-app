import { useMemo } from "react"
import { motion } from "framer-motion"
import {
  DollarSign, ShoppingCart, Package, TrendingUp, Clock, CheckCircle, Truck, XCircle,
  BarChart3, ArrowUpRight, ArrowDownRight, Percent
} from "lucide-react"
import { cn } from "@/src/lib/utils"
import type { Product } from "@/src/types/product"

interface DashboardProps {
  orders: any[]
  products: Product[]
}

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: "მოლოდინში", color: "text-yellow-500", icon: Clock },
  processing: { label: "მუშავდება", color: "text-blue-500", icon: BarChart3 },
  shipped: { label: "გაგზავნილი", color: "text-violet-500", icon: Truck },
  delivered: { label: "მიწოდებული", color: "text-emerald-500", icon: CheckCircle },
  cancelled: { label: "გაუქმებული", color: "text-red-500", icon: XCircle },
}

export function Dashboard({ orders, products }: DashboardProps) {
  const metrics = useMemo(() => {
    const delivered = orders.filter(o => o.status === "delivered")
    const pending = orders.filter(o => o.status === "pending")

    const totalRevenue = delivered.reduce((sum, o) => sum + (parseFloat(o.total_price) || 0), 0)

    // This month vs last month
    const now = new Date()
    const thisMonth = now.getMonth()
    const thisYear = now.getFullYear()

    const thisMonthOrders = orders.filter(o => {
      const d = new Date(o.created_at)
      return d.getMonth() === thisMonth && d.getFullYear() === thisYear
    })
    const lastMonthOrders = orders.filter(o => {
      const d = new Date(o.created_at)
      const lastMonthVal = thisMonth === 0 ? 11 : thisMonth - 1
      const lastYear = thisMonth === 0 ? thisYear - 1 : thisYear
      return d.getMonth() === lastMonthVal && d.getFullYear() === lastYear
    })

    const thisMonthRevenue = thisMonthOrders
      .filter(o => o.status === "delivered")
      .reduce((sum, o) => sum + (parseFloat(o.total_price) || 0), 0)
    const lastMonthRevenue = lastMonthOrders
      .filter(o => o.status === "delivered")
      .reduce((sum, o) => sum + (parseFloat(o.total_price) || 0), 0)

    const revenueChange = lastMonthRevenue > 0
      ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue * 100).toFixed(1)
      : thisMonthRevenue > 0 ? "100" : "0"

    const avgOrderValue = delivered.length > 0 ? totalRevenue / delivered.length : 0
    const onSaleProducts = products.filter(p => p.is_on_sale).length

    return {
      totalRevenue,
      orderCount: orders.length,
      pendingCount: pending.length,
      deliveredCount: delivered.length,
      productCount: products.length,
      onSaleProducts,
      thisMonthRevenue,
      revenueChange: parseFloat(revenueChange as string),
      avgOrderValue,
      thisMonthOrders: thisMonthOrders.length,
    }
  }, [orders, products])

  // Order status distribution for the chart
  const statusDistribution = useMemo(() => {
    const dist: Record<string, number> = {}
    orders.forEach(o => {
      dist[o.status] = (dist[o.status] || 0) + 1
    })
    return Object.entries(dist).map(([status, count]) => ({
      status,
      count,
      config: statusConfig[status] || { label: status, color: "text-muted-foreground", icon: BarChart3 },
      percentage: orders.length > 0 ? Math.round((count / orders.length) * 100) : 0,
    }))
  }, [orders])

  // Monthly revenue chart data (last 6 months)
  const monthlyData = useMemo(() => {
    const months: { label: string; revenue: number; orders: number }[] = []
    const now = new Date()
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthOrders = orders.filter(o => {
        const od = new Date(o.created_at)
        return od.getMonth() === d.getMonth() && od.getFullYear() === d.getFullYear()
      })
      const revenue = monthOrders
        .filter(o => o.status === "delivered")
        .reduce((sum, o) => sum + (parseFloat(o.total_price) || 0), 0)

      months.push({
        label: d.toLocaleDateString("ka-GE", { month: "short" }),
        revenue,
        orders: monthOrders.length,
      })
    }
    return months
  }, [orders])

  const maxRevenue = Math.max(...monthlyData.map(m => m.revenue), 1)

  // Recent orders
  const recentOrders = orders.slice(0, 5)

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            title: "სულ შემოსავალი",
            value: `₾ ${metrics.totalRevenue.toLocaleString()}`,
            icon: DollarSign,
            change: metrics.revenueChange,
            gradient: "from-emerald-500 to-emerald-600",
          },
          {
            title: "სულ შეკვეთები",
            value: metrics.orderCount,
            icon: ShoppingCart,
            subtitle: `${metrics.thisMonthOrders} ამ თვეში`,
            gradient: "from-blue-500 to-blue-600",
          },
          {
            title: "პროდუქცია",
            value: metrics.productCount,
            icon: Package,
            subtitle: `${metrics.onSaleProducts} აქციაზე`,
            gradient: "from-violet-500 to-violet-600",
          },
          {
            title: "საშუალო შეკვეთა",
            value: `₾ ${Math.round(metrics.avgOrderValue).toLocaleString()}`,
            icon: TrendingUp,
            subtitle: `${metrics.deliveredCount} მიწოდ.`,
            gradient: "from-amber-500 to-amber-600",
          },
        ].map((kpi, i) => (
          <motion.div
            key={kpi.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className={cn("rounded-2xl p-10 text-white bg-gradient-to-br shadow-lg", kpi.gradient)}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-white/80">{kpi.title}</p>
                <p className="mt-2 text-2xl font-bold">{kpi.value}</p>
                {kpi.change !== undefined && (
                  <div className="mt-1 flex items-center gap-1 text-xs font-medium text-white/90">
                    {kpi.change >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                    {Math.abs(kpi.change)}% გასულ თვესთან
                  </div>
                )}
                {kpi.subtitle && (
                  <p className="mt-1 text-xs text-white/60">{kpi.subtitle}</p>
                )}
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur-md">
                <kpi.icon className="h-6 w-6 text-white" />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Revenue Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-2 rounded-2xl border border-border/50 bg-card p-6"
        >
          <h3 className="text-sm font-semibold text-foreground mb-6">შემოსავალი (ბოლო 6 თვე)</h3>
          <div className="flex items-end justify-between gap-3" style={{ height: "200px" }}>
            {monthlyData.map((month, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground">
                  {month.revenue > 0 ? `₾${(month.revenue / 1000).toFixed(0)}K` : "—"}
                </span>
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${Math.max((month.revenue / maxRevenue) * 160, 4)}px` }}
                  transition={{ delay: 0.3 + i * 0.05, duration: 0.6, ease: "easeOut" }}
                  className={cn(
                    "w-full rounded-t-lg bg-gradient-to-t",
                    month.revenue > 0 ? "from-primary/80 to-primary" : "from-muted to-muted"
                  )}
                />
                <span className="text-[10px] text-muted-foreground">{month.label}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Status Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="rounded-2xl border border-border/50 bg-card p-6"
        >
          <h3 className="text-sm font-semibold text-foreground mb-6">შეკვეთების სტატუსი</h3>

          {statusDistribution.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-sm text-muted-foreground">შეკვეთები არ არის</p>
            </div>
          ) : (
            <div className="space-y-4">
              {statusDistribution.map((item, i) => (
                <div key={item.status} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <item.config.icon className={cn("h-4 w-4", item.config.color)} />
                      <span className="text-sm font-medium text-foreground">{item.config.label}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">{item.count} ({item.percentage}%)</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${item.percentage}%` }}
                      transition={{ delay: 0.4 + i * 0.1, duration: 0.6 }}
                      className={cn("h-full rounded-full",
                        item.status === "delivered" ? "bg-emerald-500" :
                        item.status === "pending" ? "bg-yellow-500" :
                        item.status === "processing" ? "bg-blue-500" :
                        item.status === "shipped" ? "bg-violet-500" :
                        "bg-red-500"
                      )}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* Recent Orders */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="rounded-2xl border border-border/50 bg-card overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-border/50">
          <h3 className="text-sm font-semibold text-foreground">ბოლო შეკვეთები</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/50 bg-muted/50">
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">კლიენტი</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">ტელეფონი</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">თანხა</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">სტატუსი</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">თარიღი</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {recentOrders.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">შეკვეთები ჯერ არ არის</td>
                </tr>
              ) : (
                recentOrders.map((order) => {
                  const sc = statusConfig[order.status] || statusConfig.pending
                  return (
                    <tr key={order.id} className="hover:bg-muted/50 transition-colors">
                      <td className="px-6 py-3">
                        <span className="font-medium text-foreground">
                          {order.customer_first_name} {order.customer_last_name}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-sm text-muted-foreground">{order.customer_phone}</td>
                      <td className="px-6 py-3 text-sm font-semibold text-foreground">₾ {parseFloat(order.total_price).toLocaleString()}</td>
                      <td className="px-6 py-3">
                        <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium", sc.color,
                          order.status === "delivered" ? "bg-emerald-500/10" :
                          order.status === "pending" ? "bg-yellow-500/10" :
                          order.status === "processing" ? "bg-blue-500/10" :
                          order.status === "shipped" ? "bg-violet-500/10" :
                          "bg-red-500/10"
                        )}>
                          <sc.icon className="h-3 w-3" />
                          {sc.label}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-sm text-muted-foreground">
                        {new Date(order.created_at).toLocaleDateString("ka-GE")}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  )
}
