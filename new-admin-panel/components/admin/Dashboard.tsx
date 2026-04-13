"use client"

import { motion } from "framer-motion"
import {
  DollarSign,
  ShoppingCart,
  TrendingUp,
  Package,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  Truck,
  XCircle,
  AlertCircle,
} from "lucide-react"
import { MetricCard } from "./MetricCard"
import { cn } from "@/lib/utils"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
} from "recharts"

// Mock data
const monthlyRevenue = [
  { month: "იანვ", revenue: 45000 },
  { month: "თებ", revenue: 52000 },
  { month: "მარ", revenue: 48000 },
  { month: "აპრ", revenue: 61000 },
  { month: "მაი", revenue: 55000 },
  { month: "ივნ", revenue: 67000 },
]

const trafficData = [
  { name: "პირდაპირი", value: 40, color: "#6366F1" },
  { name: "სოციალური", value: 25, color: "#10B981" },
  { name: "ორგანული", value: 20, color: "#3B82F6" },
  { name: "რეფერალი", value: 15, color: "#8B5CF6" },
]

const recentOrders = [
  { id: "A1B2C3D4", customer: "გიორგი მელიქიძე", date: "დღეს, 14:30", city: "თბილისი", total: "₾ 1,250", status: "pending" },
  { id: "E5F6G7H8", customer: "ნინო ბერიძე", date: "დღეს, 12:15", city: "ბათუმი", total: "₾ 890", status: "processing" },
  { id: "I9J0K1L2", customer: "დავით ჩხეიძე", date: "გუშინ, 18:45", city: "ქუთაისი", total: "₾ 2,100", status: "shipped" },
  { id: "M3N4O5P6", customer: "მარიამ გიორგაძე", date: "გუშინ, 09:20", city: "თბილისი", total: "₾ 560", status: "delivered" },
  { id: "Q7R8S9T0", customer: "ალექსი წერეთელი", date: "2 დღის წინ", city: "რუსთავი", total: "₾ 1,800", status: "cancelled" },
]

const statusConfig: Record<string, { label: string; color: string; bgColor: string; icon: React.ReactNode }> = {
  pending: { 
    label: "მოლოდინი", 
    color: "text-amber-600 dark:text-amber-400", 
    bgColor: "bg-amber-100 dark:bg-amber-500/20",
    icon: <Clock className="h-3.5 w-3.5" />
  },
  processing: { 
    label: "მუშავდება", 
    color: "text-blue-600 dark:text-blue-400", 
    bgColor: "bg-blue-100 dark:bg-blue-500/20",
    icon: <AlertCircle className="h-3.5 w-3.5" />
  },
  shipped: { 
    label: "გაგზავნილი", 
    color: "text-indigo-600 dark:text-indigo-400", 
    bgColor: "bg-indigo-100 dark:bg-indigo-500/20",
    icon: <Truck className="h-3.5 w-3.5" />
  },
  delivered: { 
    label: "დასრულებული", 
    color: "text-emerald-600 dark:text-emerald-400", 
    bgColor: "bg-emerald-100 dark:bg-emerald-500/20",
    icon: <CheckCircle2 className="h-3.5 w-3.5" />
  },
  cancelled: { 
    label: "გაუქმებული", 
    color: "text-red-600 dark:text-red-400", 
    bgColor: "bg-red-100 dark:bg-red-500/20",
    icon: <XCircle className="h-3.5 w-3.5" />
  },
}

const statusBreakdown = [
  { status: "pending", count: 12, percent: 15 },
  { status: "processing", count: 28, percent: 35 },
  { status: "shipped", count: 18, percent: 23 },
  { status: "delivered", count: 15, percent: 19 },
  { status: "cancelled", count: 6, percent: 8 },
]

export function Dashboard() {
  return (
    <div className="space-y-6">
      {/* Metric Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="ჯამური გაყიდვები"
          value="₾ 328,460"
          subtitle="მხოლოდ მიტანილი შეკვეთები"
          icon={<DollarSign className="h-6 w-6" />}
          variant="indigo"
          featured={true}
          trend={{ value: 12.5, isPositive: true }}
          delay={0}
        />
        <MetricCard
          title="ყველა შეკვეთა"
          value="79"
          subtitle="12 ახალი მოლოდინში"
          icon={<ShoppingCart className="h-6 w-6" />}
          variant="teal"
          featured={true}
          trend={{ value: 8.2, isPositive: true }}
          delay={0.1}
        />
        <MetricCard
          title="საშ. შეკვეთის ღირ."
          value="₾ 4,156"
          subtitle="დასრულებული შეკვ.-დან"
          icon={<TrendingUp className="h-6 w-6" />}
          variant="coral"
          featured={true}
          trend={{ value: 3.1, isPositive: false }}
          delay={0.2}
        />
        <MetricCard
          title="პროდუქცია ბაზაში"
          value="156"
          subtitle="23 აქციაზე"
          icon={<Package className="h-6 w-6" />}
          variant="blue"
          featured={true}
          delay={0.3}
        />
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Revenue Chart */}
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.4 }}
          className="lg:col-span-2 rounded-2xl border border-border/50 bg-card p-6 relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent" />
          <div className="relative z-10 mb-6 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-foreground">ბოლო 6 თვის შემოსავალი</h3>
              <p className="mt-1 text-sm text-muted-foreground">თვიური შემოსავლის დინამიკა</p>
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 px-3 py-1.5 text-sm font-medium text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="h-4 w-4" />
              <span>+23%</span>
            </div>
          </div>
          
          <div className="relative z-10 h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyRevenue}>
                <defs>
                  <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-border/30" />
                <XAxis 
                  dataKey="month" 
                  stroke="currentColor" 
                  className="text-muted-foreground"
                  tick={{ fill: 'currentColor', fontSize: 12 }}
                />
                <YAxis 
                  stroke="currentColor" 
                  className="text-muted-foreground"
                  tick={{ fill: 'currentColor', fontSize: 12 }}
                  tickFormatter={(value) => `₾${value / 1000}k`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: '12px',
                    boxShadow: '0 10px 40px -10px rgba(0,0,0,0.2)',
                  }}
                  labelStyle={{ color: 'var(--foreground)', fontWeight: 600 }}
                  formatter={(value: number) => [`₾ ${value.toLocaleString()}`, 'შემოსავალი']}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="var(--chart-1)"
                  strokeWidth={3}
                  fill="url(#revenueGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Traffic Source */}
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.4 }}
          className="rounded-2xl border border-border/50 bg-card p-6 relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent" />
          <h3 className="relative z-10 text-lg font-semibold text-foreground">ტრაფიკის წყარო</h3>
          <p className="relative z-10 mt-1 text-sm text-muted-foreground">მომხმარებლების მოზიდვა</p>
          
          <div className="relative z-10 mt-6 h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={trafficData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {trafficData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: '12px',
                  }}
                  formatter={(value: number) => [`${value}%`, '']}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="relative z-10 mt-4 grid grid-cols-2 gap-2">
            {trafficData.map((item) => (
              <div key={item.name} className="flex items-center gap-2">
                <div 
                  className="h-2.5 w-2.5 rounded-full" 
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-xs text-muted-foreground">{item.name}</span>
                <span className="ml-auto text-xs font-medium text-foreground">{item.value}%</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Status Breakdown & Recent Orders */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Status Breakdown */}
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.4 }}
          className="rounded-2xl border border-border/50 bg-card p-6 relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent" />
          <h3 className="relative z-10 text-lg font-semibold text-foreground">შეკვეთების სტატუსი</h3>
          <p className="relative z-10 mt-1 text-sm text-muted-foreground">სტატუსების დაშლა</p>

          <div className="relative z-10 mt-6 space-y-4">
            {statusBreakdown.map((item) => {
              const config = statusConfig[item.status]
              return (
                <div key={item.status} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className={config.color}>{config.icon}</span>
                      <span className="text-foreground">{config.label}</span>
                    </div>
                    <span className="font-medium text-foreground">{item.count}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-secondary">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${item.percent}%` }}
                      transition={{ delay: 0.8, duration: 0.6, ease: "easeOut" }}
                      className={cn(
                        "h-full rounded-full",
                        item.status === "pending" && "bg-amber-500",
                        item.status === "processing" && "bg-blue-500",
                        item.status === "shipped" && "bg-indigo-500",
                        item.status === "delivered" && "bg-emerald-500",
                        item.status === "cancelled" && "bg-red-500"
                      )}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </motion.div>

        {/* Recent Orders Table */}
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.7, duration: 0.4 }}
          className="lg:col-span-2 rounded-2xl border border-border/50 bg-card overflow-hidden relative"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-teal-500/5 to-transparent" />
          <div className="relative z-10 border-b border-border/50 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-foreground">ბოლო შეკვეთები</h3>
                <p className="mt-1 text-sm text-muted-foreground">უახლესი 5 შეკვეთა</p>
              </div>
              <button className="flex items-center gap-1 text-sm font-medium text-primary hover:underline">
                ყველა ნახვა
                <ArrowUpRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="relative z-10 overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/50 bg-muted/50">
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    შეკვეთა #
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    კლიენტი
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    თარიღი
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    ქალაქი
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    ჯამი
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    სტატუსი
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {recentOrders.map((order, index) => {
                  const config = statusConfig[order.status]
                  return (
                    <motion.tr
                      key={order.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.8 + index * 0.05 }}
                      className="group transition-colors hover:bg-muted/50"
                    >
                      <td className="whitespace-nowrap px-6 py-4">
                        <span className="font-mono text-sm font-medium text-foreground">
                          #{order.id}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <span className="text-sm text-foreground">{order.customer}</span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <span className="text-sm text-muted-foreground">{order.date}</span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <span className="text-sm text-muted-foreground">{order.city}</span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <span className="text-sm font-semibold text-foreground">{order.total}</span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <span className={cn(
                          "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
                          config.bgColor,
                          config.color
                        )}>
                          {config.icon}
                          {config.label}
                        </span>
                      </td>
                    </motion.tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
