"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import {
  BarChart3,
  BookOpen,
  FileText,
  Package,
  Building2,
  Users,
  RotateCcw,
  Truck,
  Landmark,
  Receipt,
  FileBarChart,
  TrendingUp,
  DollarSign,
  Percent,
  CreditCard,
  Banknote,
  Calendar,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { MetricCard } from "./MetricCard"
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts"

const accountingTabs = [
  { id: "dashboard", label: "დეშბორდი", icon: <BarChart3 className="h-4 w-4" /> },
  { id: "journal", label: "ჟურნალი", icon: <BookOpen className="h-4 w-4" /> },
  { id: "invoices", label: "ინვოისები", icon: <FileText className="h-4 w-4" /> },
  { id: "inventory", label: "მარაგი", icon: <Package className="h-4 w-4" /> },
  { id: "vat", label: "დღგ", icon: <Building2 className="h-4 w-4" /> },
  { id: "hr", label: "HR/ხელფ.", icon: <Users className="h-4 w-4" /> },
  { id: "returns", label: "დაბრუნ.", icon: <RotateCcw className="h-4 w-4" /> },
  { id: "waybills", label: "RS.ge", icon: <Truck className="h-4 w-4" /> },
  { id: "fixed-assets", label: "ძირ. აქტ.", icon: <Landmark className="h-4 w-4" /> },
  { id: "taxes", label: "გადასახ.", icon: <Receipt className="h-4 w-4" /> },
  { id: "reports", label: "ანგ.", icon: <FileBarChart className="h-4 w-4" /> },
]

const monthlyData = [
  { month: "იანვ", revenue: 45000, profit: 12000 },
  { month: "თებ", revenue: 52000, profit: 15000 },
  { month: "მარ", revenue: 48000, profit: 13500 },
  { month: "აპრ", revenue: 61000, profit: 18000 },
  { month: "მაი", revenue: 55000, profit: 16200 },
  { month: "ივნ", revenue: 67000, profit: 21000 },
]

const paymentMethods = [
  { method: "ნაღდი", amount: 125600, count: 45, color: "bg-emerald-500", percent: 38 },
  { method: "ბარათი", amount: 89400, count: 32, color: "bg-blue-500", percent: 27 },
  { method: "გადარიცხვა", amount: 67200, count: 18, color: "bg-violet-500", percent: 20 },
  { method: "განვადება", amount: 45800, count: 12, color: "bg-amber-500", percent: 15 },
]

// Demo data for Journal
const journalEntries = [
  { id: "JE-001", date: "2024-01-15", description: "პროდუქციის გაყიდვა", debit: 12500, credit: 0, account: "შემოსავალი", type: "credit" },
  { id: "JE-002", date: "2024-01-15", description: "ბანკში ჩარიცხვა", debit: 12500, credit: 0, account: "ბანკი", type: "debit" },
  { id: "JE-003", date: "2024-01-14", description: "მომწოდებლის გადახდა", debit: 0, credit: 8400, account: "მომწოდებლები", type: "credit" },
  { id: "JE-004", date: "2024-01-14", description: "ხელფასის გაცემა", debit: 0, credit: 15600, account: "ხელფასი", type: "credit" },
  { id: "JE-005", date: "2024-01-13", description: "კლიენტის გადახდა", debit: 28000, credit: 0, account: "მოთხოვნები", type: "debit" },
]

// Demo data for Invoices
const invoices = [
  { id: "INV-2024-001", client: "შპს ტექნოლოგია", date: "2024-01-15", amount: 12500, status: "paid", dueDate: "2024-01-30" },
  { id: "INV-2024-002", client: "შპს მშენებელი", date: "2024-01-14", amount: 28400, status: "pending", dueDate: "2024-01-28" },
  { id: "INV-2024-003", client: "ი/მ გიორგაძე", date: "2024-01-12", amount: 5600, status: "overdue", dueDate: "2024-01-10" },
  { id: "INV-2024-004", client: "შპს დისტრიბუცია", date: "2024-01-10", amount: 45000, status: "paid", dueDate: "2024-01-25" },
  { id: "INV-2024-005", client: "შპს იმპორტი", date: "2024-01-08", amount: 18900, status: "pending", dueDate: "2024-01-22" },
]

// Demo data for Inventory
const inventoryItems = [
  { sku: "PROD-001", name: "ავეჯი - დივანი", quantity: 24, unit: "ცალი", cost: 1200, total: 28800, location: "საწყობი A" },
  { sku: "PROD-002", name: "ავეჯი - მაგიდა", quantity: 56, unit: "ცალი", cost: 450, total: 25200, location: "საწყობი A" },
  { sku: "PROD-003", name: "ავეჯი - სკამი", quantity: 120, unit: "ცალი", cost: 180, total: 21600, location: "საწყობი B" },
  { sku: "PROD-004", name: "ტექსტილი - ხალი", quantity: 45, unit: "ცალი", cost: 890, total: 40050, location: "საწყობი A" },
  { sku: "PROD-005", name: "აქსესუარი - ნათურა", quantity: 200, unit: "ცალი", cost: 65, total: 13000, location: "საწყობი C" },
]

// Demo data for HR
const employees = [
  { id: "EMP-001", name: "გიორგი მამულაშვილი", position: "გაყიდვების მენეჯერი", salary: 3500, bonus: 800, netPay: 3654, status: "paid" },
  { id: "EMP-002", name: "ნინო ბერიძე", position: "ბუღალტერი", salary: 2800, bonus: 400, netPay: 2716, status: "paid" },
  { id: "EMP-003", name: "დავით კვარაცხელია", position: "კონსულტანტი", salary: 2200, bonus: 600, netPay: 2378, status: "pending" },
  { id: "EMP-004", name: "მარიამ ჩიქოვანი", position: "ადმინისტრატორი", salary: 1800, bonus: 200, netPay: 1698, status: "paid" },
]

// Demo data for Returns
const returns = [
  { id: "RET-001", order: "ORD-2024-156", client: "შპს ტექნოლოგია", product: "დივანი მოდელი X", amount: 2400, reason: "დეფექტი", date: "2024-01-14", status: "approved" },
  { id: "RET-002", order: "ORD-2024-148", client: "ი/მ გიორგაძე", product: "მაგიდა ოფისი", amount: 890, reason: "არასწორი ზომა", date: "2024-01-13", status: "pending" },
  { id: "RET-003", order: "ORD-2024-142", client: "შპს იმპორტი", product: "სკამი კომფორტი", amount: 360, reason: "დაზიანებული", date: "2024-01-12", status: "refunded" },
]

export function Accounting() {
  const [activeTab, setActiveTab] = useState("dashboard")

  return (
    <div className="space-y-6">
      {/* Sub Navigation */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="flex gap-2 overflow-x-auto rounded-xl border border-border/50 bg-card p-2"
      >
        {accountingTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-all",
              activeTab === tab.id
                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </motion.div>

      {/* Dashboard Content */}
      {activeTab === "dashboard" && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <MetricCard
              title="ყოვ. შემოსავალი"
              value="₾ 328,460"
              icon={<TrendingUp className="h-6 w-6" />}
              variant="emerald"
              featured={true}
              trend={{ value: 12.5, isPositive: true }}
              delay={0}
            />
            <MetricCard
              title="COGS"
              value="₾ 156,200"
              subtitle="გაყიდული საქონლის ღირ."
              icon={<DollarSign className="h-6 w-6" />}
              variant="orange"
              featured={true}
              delay={0.05}
            />
            <MetricCard
              title="მთლ. მოგება %"
              value="52.4%"
              icon={<Percent className="h-6 w-6" />}
              variant="blue"
              featured={true}
              trend={{ value: 3.2, isPositive: true }}
              delay={0.1}
            />
            <MetricCard
              title="მთლ. მოგება"
              value="₾ 172,260"
              icon={<TrendingUp className="h-6 w-6" />}
              variant="violet"
              featured={true}
              delay={0.15}
            />
            <MetricCard
              title="დღგ გადასახდელი"
              value="₾ 28,450"
              subtitle="18% VAT"
              icon={<Building2 className="h-6 w-6" />}
              variant="rose"
              featured={true}
              delay={0.2}
            />
            <MetricCard
              title="გადახდილი ინვოისები"
              value="₾ 245,800"
              icon={<FileText className="h-6 w-6" />}
              variant="cyan"
              featured={true}
              delay={0.25}
            />
            <MetricCard
              title="მარაგის ღირებულება"
              value="₾ 89,600"
              icon={<Package className="h-6 w-6" />}
              variant="teal"
              featured={true}
              delay={0.3}
            />
            <MetricCard
              title="ნეტო მოგება"
              value="₾ 143,810"
              icon={<DollarSign className="h-6 w-6" />}
              variant="indigo"
              featured={true}
              trend={{ value: 8.7, isPositive: true }}
              delay={0.35}
            />
          </div>

          {/* Charts Row */}
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Monthly Revenue Chart */}
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.4 }}
              className="lg:col-span-2 rounded-2xl border border-border/50 bg-card p-6"
            >
              <h3 className="text-lg font-semibold text-foreground">ყოველთვიური შემოსავალი და მოგება</h3>
              <p className="mt-1 text-sm text-muted-foreground">ბოლო 6 თვის მონაცემები</p>

              <div className="mt-6 h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyData}>
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
                      }}
                      formatter={(value: number) => [`₾ ${value.toLocaleString()}`, '']}
                    />
                    <Legend />
                    <Bar dataKey="revenue" name="შემოსავალი" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="profit" name="მოგება" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

            {/* Payment Methods Breakdown */}
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.4 }}
              className="rounded-2xl border border-border/50 bg-card p-6"
            >
              <h3 className="text-lg font-semibold text-foreground">გადახდის მეთოდები</h3>
              <p className="mt-1 text-sm text-muted-foreground">თანხების დაშლა</p>

              <div className="mt-6 space-y-4">
                {paymentMethods.map((method, index) => (
                  <motion.div
                    key={method.method}
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.6 + index * 0.1 }}
                    className="rounded-xl border border-border/50 bg-background p-4"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={cn("h-3 w-3 rounded-full", method.color)} />
                        <span className="font-medium text-foreground">{method.method}</span>
                      </div>
                      <span className="text-sm text-muted-foreground">{method.count} ტრანზ.</span>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-lg font-bold text-foreground">
                        ₾ {method.amount.toLocaleString()}
                      </span>
                      <span className="text-sm font-medium text-muted-foreground">{method.percent}%</span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${method.percent}%` }}
                        transition={{ delay: 0.8 + index * 0.1, duration: 0.6 }}
                        className={cn("h-full rounded-full", method.color)}
                      />
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* VAT Toggle */}
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.4 }}
            className="rounded-2xl border border-border/50 bg-card p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-foreground">დღგ-ს გადამხდელი</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  ჩართვისას 18% დღგ ავტომატურად დაემატება ყველა ტრანზაქციას
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">გამორთულია</span>
                <button className="relative h-6 w-11 rounded-full bg-emerald-500 transition-colors">
                  <span className="absolute right-1 top-1 h-4 w-4 rounded-full bg-white shadow-sm" />
                </button>
                <span className="text-sm font-medium text-foreground">ჩართულია</span>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Journal Tab */}
      {activeTab === "journal" && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-foreground">ბუღალტრული ჟურნალი</h3>
              <p className="text-sm text-muted-foreground">ყველა ტრანზაქციის ჩანაწერი</p>
            </div>
            <button className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
              + ახალი ჩანაწერი
            </button>
          </div>
          <div className="rounded-2xl border border-border/50 bg-card overflow-hidden">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">ID</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">თარიღი</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">აღწერა</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">ანგარიში</th>
                  <th className="px-6 py-4 text-right text-sm font-medium text-muted-foreground">დებეტი</th>
                  <th className="px-6 py-4 text-right text-sm font-medium text-muted-foreground">კრედიტი</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {journalEntries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-foreground">{entry.id}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{entry.date}</td>
                    <td className="px-6 py-4 text-sm text-foreground">{entry.description}</td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "rounded-full px-2 py-1 text-xs font-medium",
                        entry.type === "debit" ? "bg-emerald-500/10 text-emerald-600" : "bg-blue-500/10 text-blue-600"
                      )}>
                        {entry.account}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-medium text-emerald-600">
                      {entry.debit > 0 ? `₾ ${entry.debit.toLocaleString()}` : "-"}
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-medium text-red-500">
                      {entry.credit > 0 ? `₾ ${entry.credit.toLocaleString()}` : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* Invoices Tab */}
      {activeTab === "invoices" && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-foreground">ინვოისები</h3>
              <p className="text-sm text-muted-foreground">გაცემული და მიღებული ინვოისები</p>
            </div>
            <button className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
              + ახალი ინვოისი
            </button>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4">
              <p className="text-sm text-emerald-600 dark:text-emerald-400">გადახდილი</p>
              <p className="mt-1 text-2xl font-bold text-emerald-700 dark:text-emerald-300">₾ 57,500</p>
              <p className="text-sm text-emerald-600/70">2 ინვოისი</p>
            </div>
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
              <p className="text-sm text-amber-600 dark:text-amber-400">მოლოდინში</p>
              <p className="mt-1 text-2xl font-bold text-amber-700 dark:text-amber-300">₾ 47,300</p>
              <p className="text-sm text-amber-600/70">2 ინვოისი</p>
            </div>
            <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4">
              <p className="text-sm text-red-600 dark:text-red-400">ვადაგასული</p>
              <p className="mt-1 text-2xl font-bold text-red-700 dark:text-red-300">₾ 5,600</p>
              <p className="text-sm text-red-600/70">1 ინვოისი</p>
            </div>
          </div>
          <div className="rounded-2xl border border-border/50 bg-card overflow-hidden">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">ინვოისი #</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">კლიენტი</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">თარიღი</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">ვადა</th>
                  <th className="px-6 py-4 text-right text-sm font-medium text-muted-foreground">თანხა</th>
                  <th className="px-6 py-4 text-center text-sm font-medium text-muted-foreground">სტატუსი</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-primary">{inv.id}</td>
                    <td className="px-6 py-4 text-sm text-foreground">{inv.client}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{inv.date}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{inv.dueDate}</td>
                    <td className="px-6 py-4 text-right text-sm font-bold text-foreground">₾ {inv.amount.toLocaleString()}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={cn(
                        "rounded-full px-3 py-1 text-xs font-medium",
                        inv.status === "paid" && "bg-emerald-500/10 text-emerald-600",
                        inv.status === "pending" && "bg-amber-500/10 text-amber-600",
                        inv.status === "overdue" && "bg-red-500/10 text-red-600"
                      )}>
                        {inv.status === "paid" ? "გადახდილი" : inv.status === "pending" ? "მოლოდინში" : "ვადაგასული"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* Inventory Tab */}
      {activeTab === "inventory" && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-foreground">მარაგის აღრიცხვა</h3>
              <p className="text-sm text-muted-foreground">საწყობში არსებული პროდუქცია</p>
            </div>
            <div className="flex gap-2">
              <button className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted">
                ექსპორტი
              </button>
              <button className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                + ახალი პროდუქტი
              </button>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-4">
            <div className="rounded-2xl border border-border/50 bg-card p-4">
              <Package className="h-8 w-8 text-primary" />
              <p className="mt-2 text-2xl font-bold text-foreground">445</p>
              <p className="text-sm text-muted-foreground">სულ ერთეული</p>
            </div>
            <div className="rounded-2xl border border-border/50 bg-card p-4">
              <DollarSign className="h-8 w-8 text-emerald-500" />
              <p className="mt-2 text-2xl font-bold text-foreground">₾ 128,650</p>
              <p className="text-sm text-muted-foreground">სულ ღირებულება</p>
            </div>
            <div className="rounded-2xl border border-border/50 bg-card p-4">
              <TrendingUp className="h-8 w-8 text-blue-500" />
              <p className="mt-2 text-2xl font-bold text-foreground">5</p>
              <p className="text-sm text-muted-foreground">კატეგორია</p>
            </div>
            <div className="rounded-2xl border border-border/50 bg-card p-4">
              <Building2 className="h-8 w-8 text-violet-500" />
              <p className="mt-2 text-2xl font-bold text-foreground">3</p>
              <p className="text-sm text-muted-foreground">საწყობი</p>
            </div>
          </div>
          <div className="rounded-2xl border border-border/50 bg-card overflow-hidden">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">SKU</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">დასახელება</th>
                  <th className="px-6 py-4 text-center text-sm font-medium text-muted-foreground">რაოდენობა</th>
                  <th className="px-6 py-4 text-right text-sm font-medium text-muted-foreground">ფასი</th>
                  <th className="px-6 py-4 text-right text-sm font-medium text-muted-foreground">სულ</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">ლოკაცია</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {inventoryItems.map((item) => (
                  <tr key={item.sku} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4 text-sm font-mono text-primary">{item.sku}</td>
                    <td className="px-6 py-4 text-sm font-medium text-foreground">{item.name}</td>
                    <td className="px-6 py-4 text-center">
                      <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
                        {item.quantity} {item.unit}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-sm text-muted-foreground">₾ {item.cost}</td>
                    <td className="px-6 py-4 text-right text-sm font-bold text-foreground">₾ {item.total.toLocaleString()}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{item.location}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* HR Tab */}
      {activeTab === "hr" && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-foreground">HR / ხელფასები</h3>
              <p className="text-sm text-muted-foreground">თანამშრომლების მართვა და ხელფასები</p>
            </div>
            <button className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
              + თანამშრომლის დამატება
            </button>
          </div>
          <div className="grid gap-4 sm:grid-cols-4">
            <div className="rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-600 p-4 text-white">
              <Users className="h-8 w-8" />
              <p className="mt-2 text-2xl font-bold">4</p>
              <p className="text-sm text-white/80">თანამშრომელი</p>
            </div>
            <div className="rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 p-4 text-white">
              <Banknote className="h-8 w-8" />
              <p className="mt-2 text-2xl font-bold">₾ 10,446</p>
              <p className="text-sm text-white/80">სულ ხელფასი</p>
            </div>
            <div className="rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 p-4 text-white">
              <CreditCard className="h-8 w-8" />
              <p className="mt-2 text-2xl font-bold">₾ 2,000</p>
              <p className="text-sm text-white/80">ბონუსები</p>
            </div>
            <div className="rounded-2xl bg-gradient-to-br from-rose-500 to-rose-600 p-4 text-white">
              <Calendar className="h-8 w-8" />
              <p className="mt-2 text-2xl font-bold">იანვარი</p>
              <p className="text-sm text-white/80">მიმდინარე პერიოდი</p>
            </div>
          </div>
          <div className="rounded-2xl border border-border/50 bg-card overflow-hidden">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">ID</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">თანამშრომელი</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">პოზიცია</th>
                  <th className="px-6 py-4 text-right text-sm font-medium text-muted-foreground">ხელფასი</th>
                  <th className="px-6 py-4 text-right text-sm font-medium text-muted-foreground">ბონუსი</th>
                  <th className="px-6 py-4 text-right text-sm font-medium text-muted-foreground">ნეტო</th>
                  <th className="px-6 py-4 text-center text-sm font-medium text-muted-foreground">სტატუსი</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {employees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4 text-sm font-mono text-muted-foreground">{emp.id}</td>
                    <td className="px-6 py-4 text-sm font-medium text-foreground">{emp.name}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{emp.position}</td>
                    <td className="px-6 py-4 text-right text-sm text-foreground">₾ {emp.salary.toLocaleString()}</td>
                    <td className="px-6 py-4 text-right text-sm text-emerald-600">+₾ {emp.bonus}</td>
                    <td className="px-6 py-4 text-right text-sm font-bold text-foreground">₾ {emp.netPay.toLocaleString()}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={cn(
                        "rounded-full px-3 py-1 text-xs font-medium",
                        emp.status === "paid" ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"
                      )}>
                        {emp.status === "paid" ? "გადახდილი" : "მოლოდინში"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* Returns Tab */}
      {activeTab === "returns" && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-foreground">დაბრუნებები</h3>
              <p className="text-sm text-muted-foreground">პროდუქციის დაბრუნების მართვა</p>
            </div>
            <button className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
              + ახალი დაბრუნება
            </button>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4">
              <p className="text-sm text-emerald-600 dark:text-emerald-400">დამტკიცებული</p>
              <p className="mt-1 text-2xl font-bold text-emerald-700 dark:text-emerald-300">₾ 2,400</p>
              <p className="text-sm text-emerald-600/70">1 მოთხოვნა</p>
            </div>
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
              <p className="text-sm text-amber-600 dark:text-amber-400">მოლოდინში</p>
              <p className="mt-1 text-2xl font-bold text-amber-700 dark:text-amber-300">₾ 890</p>
              <p className="text-sm text-amber-600/70">1 მოთხოვნა</p>
            </div>
            <div className="rounded-2xl border border-blue-500/30 bg-blue-500/10 p-4">
              <p className="text-sm text-blue-600 dark:text-blue-400">დაბრუნებული</p>
              <p className="mt-1 text-2xl font-bold text-blue-700 dark:text-blue-300">₾ 360</p>
              <p className="text-sm text-blue-600/70">1 მოთხოვნა</p>
            </div>
          </div>
          <div className="rounded-2xl border border-border/50 bg-card overflow-hidden">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">ID</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">შეკვეთა</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">კლიენტი</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">პროდუქტი</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">მიზეზი</th>
                  <th className="px-6 py-4 text-right text-sm font-medium text-muted-foreground">თანხა</th>
                  <th className="px-6 py-4 text-center text-sm font-medium text-muted-foreground">სტატუსი</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {returns.map((ret) => (
                  <tr key={ret.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4 text-sm font-mono text-primary">{ret.id}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{ret.order}</td>
                    <td className="px-6 py-4 text-sm text-foreground">{ret.client}</td>
                    <td className="px-6 py-4 text-sm text-foreground">{ret.product}</td>
                    <td className="px-6 py-4">
                      <span className="rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground">{ret.reason}</span>
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-bold text-foreground">₾ {ret.amount.toLocaleString()}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={cn(
                        "rounded-full px-3 py-1 text-xs font-medium",
                        ret.status === "approved" && "bg-emerald-500/10 text-emerald-600",
                        ret.status === "pending" && "bg-amber-500/10 text-amber-600",
                        ret.status === "refunded" && "bg-blue-500/10 text-blue-600"
                      )}>
                        {ret.status === "approved" ? "დამტკიცებული" : ret.status === "pending" ? "მოლოდინში" : "დაბრუნებული"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* VAT Tab */}
      {activeTab === "vat" && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-foreground">დღგ მართვა</h3>
              <p className="text-sm text-muted-foreground">დამატებული ღირებულების გადასახადი</p>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 p-6 text-white">
              <p className="text-sm text-white/80">მიღებული დღგ</p>
              <p className="mt-2 text-3xl font-bold">₾ 45,200</p>
              <p className="mt-1 text-sm text-white/70">გაყიდვებიდან</p>
            </div>
            <div className="rounded-2xl bg-gradient-to-br from-rose-500 to-rose-600 p-6 text-white">
              <p className="text-sm text-white/80">გადახდილი დღგ</p>
              <p className="mt-2 text-3xl font-bold">₾ 16,750</p>
              <p className="mt-1 text-sm text-white/70">შესყიდვებზე</p>
            </div>
            <div className="rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 p-6 text-white">
              <p className="text-sm text-white/80">გადასახდელი</p>
              <p className="mt-2 text-3xl font-bold">₾ 28,450</p>
              <p className="mt-1 text-sm text-white/70">ბიუჯეტში</p>
            </div>
          </div>
          <div className="rounded-2xl border border-border/50 bg-card p-6">
            <h4 className="font-semibold text-foreground">დღგ-ს პარამეტრები</h4>
            <div className="mt-4 space-y-4">
              <div className="flex items-center justify-between rounded-xl border border-border/50 bg-background p-4">
                <div>
                  <p className="font-medium text-foreground">დღგ-ს განაკვეთი</p>
                  <p className="text-sm text-muted-foreground">სტანდარტული განაკვეთი</p>
                </div>
                <span className="text-2xl font-bold text-primary">18%</span>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-border/50 bg-background p-4">
                <div>
                  <p className="font-medium text-foreground">დღგ-ს გადამხდელი</p>
                  <p className="text-sm text-muted-foreground">კომპანია რეგისტრირებულია დღგ-ს გადამხდელად</p>
                </div>
                <div className="flex h-6 w-11 items-center rounded-full bg-emerald-500 px-1">
                  <span className="ml-auto h-4 w-4 rounded-full bg-white shadow" />
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Placeholder for remaining tabs */}
      {!["dashboard", "journal", "invoices", "inventory", "hr", "returns", "vat"].includes(activeTab) && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center rounded-2xl border border-border/50 bg-card py-20"
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            {accountingTabs.find((t) => t.id === activeTab)?.icon}
          </div>
          <h3 className="mt-4 text-xl font-semibold text-foreground">
            {accountingTabs.find((t) => t.id === activeTab)?.label}
          </h3>
          <p className="mt-2 text-muted-foreground">ეს მოდული მალე დაემატება</p>
        </motion.div>
      )}
    </div>
  )
}
