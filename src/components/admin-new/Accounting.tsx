import { useState, useEffect, useMemo, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  BarChart3, BookOpen, FileText, Package, Building2, Users, RotateCcw, Truck,
  Landmark, Receipt, FileBarChart, TrendingUp, DollarSign, Percent, CreditCard,
  Banknote, Calendar, Loader2, RefreshCw, AlertTriangle, CheckCircle, Clock,
  XCircle, ChevronDown, Eye, Upload, X, FileCheck
} from "lucide-react"
import { cn } from "@/src/lib/utils"
import { supabase } from "@/src/lib/supabase"
import Invoices from "./accounting/Invoices"
import Inventory from "./accounting/Inventory"
import Vat from "./accounting/Vat"
import Hr from "./accounting/Hr"
import Returns from "./accounting/Returns"
import Waybills from "./accounting/Waybills"
import FixedAssets from "./accounting/FixedAssets"
import Taxes from "./accounting/Taxes"

// ... (existing code remains, just adding imports at the top)


// ── Sub-tab config ──
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

export function Accounting() {
  const [activeTab, setActiveTab] = useState("dashboard")
  const [selectedJournalOrder, setSelectedJournalOrder] = useState<any>(null)
  const [selectedDrillDownAccount, setSelectedDrillDownAccount] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  // ── Bank Importer State ──
  const [showBankImporter, setShowBankImporter] = useState(false)
  const [bankCsvData, setBankCsvData] = useState<{
    id: string; date: string; beneficiary: string; payee: string;
    amount: number; type: 'IN' | 'OUT'; purpose: string; account_target: string;
    matched_invoice_id?: string; match_reason?: string;
  }[]>([])
  const [isBankImporting, setIsBankImporting] = useState(false)
  const [bankImportError, setBankImportError] = useState("")

  // ── Audit Log State ──
  const [auditLogs, setAuditLogs] = useState<any[]>([])
  const [auditTableFilter, setAuditTableFilter] = useState("all")

  // ── Core accounting data ──
  const [journalEntries, setJournalEntries] = useState<any[]>([])
  const [journalLines, setJournalLines] = useState<any[]>([])
  const [accounts, setAccounts] = useState<any[]>([])
  const [invoices, setInvoices] = useState<any[]>([])
  const [employees, setEmployees] = useState<any[]>([])
  const [payrollRuns, setPayrollRuns] = useState<any[]>([])
  const [payrollItems, setPayrollItems] = useState<any[]>([])
  const [productReturns, setProductReturns] = useState<any[]>([])
  const [waybills, setWaybills] = useState<any[]>([])
  const [fixedAssets, setFixedAssets] = useState<any[]>([])
  const [vatDeclarations, setVatDeclarations] = useState<any[]>([])
  const [vatTransactions, setVatTransactions] = useState<any[]>([])
  const [stockLevels, setStockLevels] = useState<any[]>([])
  const [orders, setOrders] = useState<any[]>([])
  const [companySettings, setCompanySettings] = useState<any[]>([])

  // ── Bank CSV Upload Handler ──
  const handleBankFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setBankImportError("")
    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string
        const lines = text.split('\n').filter(line => line.trim().length > 0)
        const parsed: typeof bankCsvData = []
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''))
          if (cols.length < 5) continue
          const debitAmt = parseFloat(cols[3]) || 0
          const creditAmt = parseFloat(cols[4]) || 0
          if (debitAmt === 0 && creditAmt === 0) continue
          
          const amount = debitAmt > 0 ? debitAmt : creditAmt
          const type = debitAmt > 0 ? 'IN' : 'OUT'
          const purpose = cols[5] || 'საბანკო ტრანზაქცია'
          const partnerName = type === 'IN' ? cols[1] : cols[2]

          // ── Intelligent Matching Logic ──
          let account_target = ''
          let matched_invoice_id = undefined
          let match_reason = undefined

          // 1. Match by Invoice Number in purpose (Search for KALE-XXXX or INV-XXXX)
          const invMatch = purpose.match(/(KALE|INV)-?\d+/i)
          if (invMatch) {
            const potentialInv = invoices.find(inv => inv.invoice_number?.includes(invMatch[0].toUpperCase()))
            if (potentialInv) {
              matched_invoice_id = potentialInv.id
              account_target = accounts.find(a => a.code === '1200')?.id || ''
              match_reason = `ნაპოვნია ინვოისის ნომრით: ${invMatch[0]}`
            }
          }

          // 2. Match by exact amount (if not already matched)
          if (!matched_invoice_id) {
            const amountMatch = invoices.find(inv => 
              inv.payment_status === 'PENDING' && 
              Math.abs(parseFloat(inv.total_amount) - amount) < 0.01
            )
            if (amountMatch) {
              matched_invoice_id = amountMatch.id
              account_target = accounts.find(a => a.code === '1200')?.id || ''
              match_reason = `ნაპოვნია ზუსტი თანხით (₾${amount})`
            }
          }

          parsed.push({
            id: Math.random().toString(36).substr(2, 9),
            date: cols[0],
            payee: cols[1],
            beneficiary: cols[2],
            amount,
            type,
            purpose,
            account_target,
            matched_invoice_id,
            match_reason
          })
        }
        setBankCsvData(parsed)
      } catch {
        setBankImportError('შეცდომა CSV ფაილის წაკითხვისას.')
      }
    }
    reader.readAsText(file)
  }

  const handleBankImport = async () => {
    const invalid = bankCsvData.find(t => !t.account_target)
    if (invalid) { setBankImportError('გთხოვთ მიუთითოთ კორესპონდენტი ანგარიში ყველა ტრანზაქციისთვის.'); return }
    setIsBankImporting(true)
    try {
      const bankAccId = accounts.find((a: any) => a.code === '1210')?.id
      if (!bankAccId) throw new Error("1210 ანგარიში ვერ მოიძებნა")
      for (const t of bankCsvData) {
        const { data: entry, error: entryErr } = await supabase.from('journal_entries').insert({
          entry_number: `BNK-${Date.now()}-${Math.floor(Math.random() * 100)}`,
          entry_date: new Date().toISOString().split('T')[0],
          description: `[ბანკი] ${t.purpose} - ${t.type === 'IN' ? t.payee : t.beneficiary}`,
          reference_type: 'BANK_STATEMENT',
          status: 'POSTED'
        }).select().single()
        if (entryErr) throw entryErr
        if (t.type === 'IN') {
          await supabase.from('journal_lines').insert([
            { journal_entry_id: entry.id, account_id: bankAccId, debit: t.amount, credit: 0 },
            { journal_entry_id: entry.id, account_id: t.account_target, debit: 0, credit: t.amount }
          ])
        } else {
          await supabase.from('journal_lines').insert([
            { journal_entry_id: entry.id, account_id: t.account_target, debit: t.amount, credit: 0 },
            { journal_entry_id: entry.id, account_id: bankAccId, debit: 0, credit: t.amount }
          ])
        }
      }
      setShowBankImporter(false)
      setBankCsvData([])
      fetchData()
    } catch (err: any) {
      setBankImportError('შეცდომა: ' + err.message)
    } finally {
      setIsBankImporting(false)
    }
  }

  // RS.ge Waybill status handlers — table: rs_waybills (matches fetchData)
  const handleActivateWaybill = async (waybillId: string) => {
    try {
      const { error } = await supabase
        .from("rs_waybills")
        .update({ status: "activated", activated_at: new Date().toISOString() })
        .eq("id", waybillId)
      if (error) throw error
      fetchData()
    } catch (err: any) {
      alert("გააქტიურების შეცდომა: " + err.message)
    }
  }
  const handleCloseWaybill = async (waybillId: string) => {
    try {
      const { error } = await supabase
        .from("rs_waybills")
        .update({ status: "closed", closed_at: new Date().toISOString() })
        .eq("id", waybillId)
      if (error) throw error
      fetchData()
    } catch (err: any) {
      alert("დახურვის შეცდომა: " + err.message)
    }
  }

  // ── Fetch all accounting data ──
  const fetchData = useCallback(async () => {
    setIsLoading(true)
    try {
      const [
        jeRes, jlRes, accRes, invRes, empRes, prRes, piRes,
        retRes, wbRes, faRes, vatdRes, vtRes, slRes, ordRes, csRes, auditRes
      ] = await Promise.all([
        supabase.from("journal_entries").select("*").order("entry_date", { ascending: false }),
        supabase.from("journal_lines").select("*, accounts(code, name_ka)").order("created_at", { ascending: false }),
        supabase.from("accounts").select("*").order("code"),
        supabase.from("invoices").select("*").order("invoice_date", { ascending: false }),
        supabase.from("employees").select("*").order("full_name"),
        supabase.from("payroll_runs").select("*").order("created_at", { ascending: false }),
        supabase.from("payroll_items").select("*, employees(full_name, position)").order("created_at", { ascending: false }),
        supabase.from("product_returns").select("*, orders(customer_first_name, customer_last_name), products(name, images)").order("created_at", { ascending: false }),
        supabase.from("rs_waybills").select("*, orders(customer_first_name, customer_last_name, customer_address, customer_city)").order("created_at", { ascending: false }),
        supabase.from("fixed_assets").select("*").order("purchase_date", { ascending: false }),
        supabase.from("vat_declarations").select("*, fiscal_periods(name, period_year, period_month)").order("created_at", { ascending: false }),
        supabase.from("vat_transactions").select("*").order("transaction_date", { ascending: false }),
        supabase.from("stock_levels").select("*, products:product_id(name, category, price, images)").order("updated_at", { ascending: false }),
        supabase.from("orders").select("*, order_items(*, products(name, images))").eq("status", "delivered").order("created_at", { ascending: false }),
        supabase.from("company_settings").select("*"),
        supabase.from("audit_log").select("*, changed_by_user:changed_by(email, full_name)").order("changed_at", { ascending: false }).limit(100),
      ])

      if (jeRes.data) setJournalEntries(jeRes.data)
      if (jlRes.data) setJournalLines(jlRes.data)
      if (accRes.data) setAccounts(accRes.data)
      if (invRes.data) setInvoices(invRes.data)
      if (empRes.data) setEmployees(empRes.data)
      if (prRes.data) setPayrollRuns(prRes.data)
      if (piRes.data) setPayrollItems(piRes.data)
      if (retRes.data) setProductReturns(retRes.data)
      if (wbRes.data) setWaybills(wbRes.data)
      if (faRes.data) setFixedAssets(faRes.data)
      if (vatdRes.data) setVatDeclarations(vatdRes.data)
      if (vtRes.data) setVatTransactions(vtRes.data)
      if (slRes.data) setStockLevels(slRes.data)
      if (ordRes.data) setOrders(ordRes.data)
      if (csRes.data) setCompanySettings(csRes.data)
      if (auditRes?.data) setAuditLogs(auditRes.data)
    } catch (err) {
      console.error("Accounting data fetch error:", err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  // ── Derived metrics ──
  const isVatRegistered = useMemo(() => {
    const setting = companySettings.find(s => s.key === "vat_registered")
    return setting?.value === true || setting?.value === "true"
  }, [companySettings])

  const totalRevenue = useMemo(() =>
    orders.reduce((sum, o) => sum + (parseFloat(o.total_price) || 0), 0)
    , [orders])

  const totalDebit = useMemo(() =>
    journalLines.reduce((sum, l) => sum + (parseFloat(l.debit) || 0), 0)
    , [journalLines])

  const totalCredit = useMemo(() =>
    journalLines.reduce((sum, l) => sum + (parseFloat(l.credit) || 0), 0)
    , [journalLines])

  const totalInvoiced = useMemo(() =>
    invoices.reduce((sum, i) => sum + (parseFloat(i.total_amount) || 0), 0)
    , [invoices])

  const paidInvoices = useMemo(() => invoices.filter(i => i.payment_status === "PAID"), [invoices])
  const pendingInvoices = useMemo(() => invoices.filter(i => i.payment_status === "PENDING"), [invoices])
  const overdueInvoices = useMemo(() => invoices.filter(i => i.payment_status === "OVERDUE"), [invoices])

  const totalPayroll = useMemo(() =>
    payrollRuns.reduce((sum, r) => sum + (parseFloat(r.total_gross) || 0), 0)
    , [payrollRuns])

  const inventoryValue = useMemo(() =>
    stockLevels.reduce((sum, s) => sum + (parseFloat(s.total_cost_value) || 0), 0)
    , [stockLevels])

  const outputVat = useMemo(() =>
    vatTransactions.filter(v => v.vat_type === "OUTPUT").reduce((s, v) => s + (parseFloat(v.vat_amount) || 0), 0)
    , [vatTransactions])

  const inputVat = useMemo(() =>
    vatTransactions.filter(v => v.vat_type === "INPUT").reduce((s, v) => s + (parseFloat(v.vat_amount) || 0), 0)
    , [vatTransactions])

  // ── Monthly revenue from delivered orders grouped by month ──
  const monthlyChart = useMemo(() => {
    const months: { label: string; revenue: number }[] = []
    const now = new Date()
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const rev = orders
        .filter(o => {
          const od = new Date(o.created_at)
          return od.getMonth() === d.getMonth() && od.getFullYear() === d.getFullYear()
        })
        .reduce((sum, o) => sum + (parseFloat(o.total_price) || 0), 0)
      months.push({ label: d.toLocaleDateString("ka-GE", { month: "short" }), revenue: rev })
    }
    return months
  }, [orders])

  const maxChartRevenue = Math.max(...monthlyChart.map(m => m.revenue), 1)

  // ── Payment methods breakdown from delivered orders ──
  const paymentBreakdown = useMemo(() => {
    const map: Record<string, { count: number; amount: number }> = {}
    orders.forEach(o => {
      const pm = o.payment_method || "unknown"
      if (!map[pm]) map[pm] = { count: 0, amount: 0 }
      map[pm].count++
      map[pm].amount += parseFloat(o.total_price) || 0
    })
    const labels: Record<string, string> = {
      cash: "ნაღდი", card_bog: "BoG ბარათი", card_tbc: "TBC ბარათი",
      credo: "განვადება", transfer: "გადარიცხვა", unknown: "სხვა"
    }
    const colors: Record<string, string> = {
      cash: "bg-emerald-500", card_bog: "bg-blue-500", card_tbc: "bg-cyan-500",
      credo: "bg-amber-500", transfer: "bg-violet-500", unknown: "bg-gray-500"
    }
    return Object.entries(map).map(([key, val]) => ({
      method: labels[key] || key,
      color: colors[key] || "bg-gray-500",
      ...val,
      percent: totalRevenue > 0 ? Math.round((val.amount / totalRevenue) * 100) : 0,
    })).sort((a, b) => b.amount - a.amount)
  }, [orders, totalRevenue])

  // ── Product Sales by Payment Method ──
  const productSalesData = useMemo(() => {
    const map: Record<string, {
      name: string,
      image: string,
      cash: number,
      card: number,
      transfer: number,
      installment: number,
      total: number
    }> = {}

    orders.forEach(o => {
      const pm = o.payment_method || "unknown"
      const items = o.order_items || []
      
      items.forEach((item: any) => {
        const pName = item.products?.name || item.product_name || "უცნობი პროდუქტი"
        const pImage = item.products?.images?.[0] || ""
        const pId = item.product_id || pName
        
        if (!map[pId]) {
          map[pId] = { name: pName, image: pImage, cash: 0, card: 0, transfer: 0, installment: 0, total: 0 }
        }
        
        const revenue = parseFloat(item.price_at_purchase) * item.quantity || 0
        map[pId].total += revenue
        
        if (pm === "cash") map[pId].cash += revenue
        else if (pm.startsWith("card_") || pm === "card") map[pId].card += revenue
        else if (pm === "transfer") map[pId].transfer += revenue
        else if (pm === "credo" || pm === "installment") map[pId].installment += revenue
      })
    })

    return Object.values(map).sort((a, b) => b.total - a.total)
  }, [orders])

  // ── Loading ──
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
        <p className="text-muted-foreground text-sm">ბუღალტერიის მონაცემები იტვირთება...</p>
      </div>
    )
  }

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
        <button
          onClick={fetchData}
          className="ml-auto flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
      </motion.div>

      {/* ═══════════════════ DASHBOARD ═══════════════════ */}
      {activeTab === "dashboard" && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { title: "სულ შემოსავალი", value: `₾ ${totalRevenue.toLocaleString()}`, icon: TrendingUp, gradient: "from-emerald-500 to-emerald-600" },
              { title: "ჟურნალის ჩანაწერები", value: journalEntries.length, icon: BookOpen, gradient: "from-blue-500 to-blue-600" },
              { title: "ინვოისები", value: invoices.length, icon: FileText, gradient: "from-violet-500 to-violet-600" },
              { title: "მარაგის ღირებულება", value: `₾ ${inventoryValue.toLocaleString()}`, icon: Package, gradient: "from-amber-500 to-amber-600" },
              { title: "სულ დებეტი", value: `₾ ${totalDebit.toLocaleString()}`, icon: TrendingUp, gradient: "from-emerald-500 to-emerald-600" },
              { title: "სულ კრედიტი", value: `₾ ${totalCredit.toLocaleString()}`, icon: DollarSign, gradient: "from-red-500 to-red-600" },
              { title: "ხელფასის ფონდი", value: `₾ ${totalPayroll.toLocaleString()}`, icon: Users, gradient: "from-indigo-500 to-indigo-600" },
              { title: "დღგ გადასახდელი", value: isVatRegistered ? `₾ ${(outputVat - inputVat).toLocaleString()}` : "არ არის", icon: Building2, gradient: "from-rose-500 to-rose-600" },
            ].map((kpi, i) => (
              <motion.div
                key={kpi.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className={cn("rounded-2xl p-6 text-white bg-gradient-to-br shadow-lg", kpi.gradient)}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-white/80">{kpi.title}</p>
                    <p className="mt-2 text-2xl font-bold">{kpi.value}</p>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur-md">
                    <kpi.icon className="h-6 w-6 text-white" />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Charts Row */}
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Monthly Revenue */}
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="lg:col-span-2 rounded-2xl border border-border/50 bg-card p-6"
            >
              <h3 className="text-sm font-semibold text-foreground mb-6">შემოსავალი (ბოლო 6 თვე)</h3>
              <div className="flex items-end justify-between gap-3" style={{ height: "200px" }}>
                {monthlyChart.map((m, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-2">
                    <span className="text-xs font-medium text-muted-foreground">
                      {m.revenue > 0 ? `₾${(m.revenue / 1000).toFixed(0)}K` : "—"}
                    </span>
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${Math.max((m.revenue / maxChartRevenue) * 160, 4)}px` }}
                      transition={{ delay: 0.4 + i * 0.05, duration: 0.6, ease: "easeOut" }}
                      className={cn("w-full rounded-t-lg bg-gradient-to-t",
                        m.revenue > 0 ? "from-primary/80 to-primary" : "from-muted to-muted"
                      )}
                    />
                    <span className="text-[10px] text-muted-foreground">{m.label}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Payment Methods */}
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="rounded-2xl border border-border/50 bg-card p-6"
            >
              <h3 className="text-sm font-semibold text-foreground mb-4">გადახდის მეთოდები</h3>
              {paymentBreakdown.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">მონაცემები არ არის</p>
              ) : (
                <div className="space-y-3">
                  {paymentBreakdown.map((pm, i) => (
                    <div key={pm.method} className="rounded-xl border border-border/50 bg-background p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={cn("h-2.5 w-2.5 rounded-full", pm.color)} />
                          <span className="text-sm font-medium text-foreground">{pm.method}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">{pm.count} ტრანზ.</span>
                      </div>
                      <div className="mt-1.5 flex items-center justify-between">
                        <span className="text-sm font-bold text-foreground">₾ {pm.amount.toLocaleString()}</span>
                        <span className="text-xs text-muted-foreground">{pm.percent}%</span>
                      </div>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pm.percent}%` }}
                          transition={{ delay: 0.5 + i * 0.1, duration: 0.5 }}
                          className={cn("h-full rounded-full", pm.color)}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </div>

          {/* Product Sales by Payment Method */}
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="rounded-2xl border border-border/50 bg-card p-6"
          >
            <h3 className="text-sm font-semibold text-foreground mb-4">პროდუქციის რეალიზაცია გადახდის მეთოდებით</h3>
            {productSalesData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">მონაცემები არ არის</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/50">
                      <th className="px-4 py-3 text-left font-semibold text-muted-foreground whitespace-nowrap">პროდუქტი</th>
                      <th className="px-4 py-3 text-right font-semibold text-emerald-500 whitespace-nowrap">ნაღდი</th>
                      <th className="px-4 py-3 text-right font-semibold text-blue-500 whitespace-nowrap">ბარათი</th>
                      <th className="px-4 py-3 text-right font-semibold text-violet-500 whitespace-nowrap">გადარიცხვა</th>
                      <th className="px-4 py-3 text-right font-semibold text-amber-500 whitespace-nowrap">განვადება</th>
                      <th className="px-4 py-3 text-right font-semibold text-foreground whitespace-nowrap">სულ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30">
                    {productSalesData.map((ps, i) => (
                      <tr key={i} className="hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3 min-w-[200px]">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 overflow-hidden rounded-md border border-border/50 bg-muted">
                              <img src={ps.image || "https://via.placeholder.com/40"} alt={ps.name} className="h-full w-full object-cover" />
                            </div>
                            <span className="font-medium text-foreground">{ps.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">{ps.cash > 0 ? `₾ ${ps.cash.toLocaleString()}` : "—"}</td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">{ps.card > 0 ? `₾ ${ps.card.toLocaleString()}` : "—"}</td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">{ps.transfer > 0 ? `₾ ${ps.transfer.toLocaleString()}` : "—"}</td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">{ps.installment > 0 ? `₾ ${ps.installment.toLocaleString()}` : "—"}</td>
                        <td className="px-4 py-3 text-right font-bold text-foreground whitespace-nowrap">₾ {ps.total.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>
        </div>
      )}

      {/* ═══════════════════ JOURNAL ═══════════════════ */}
      {activeTab === "journal" && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-foreground">ბუღალტრული ჟურნალი</h3>
              <p className="text-sm text-muted-foreground">{journalEntries.length} ჩანაწერი · {journalLines.length} ხაზი</p>
            </div>
            <button
              onClick={() => setShowBankImporter(true)}
              className="flex items-center gap-2 rounded-xl bg-blue-500/10 px-4 py-2 text-xs font-bold text-blue-600 hover:bg-blue-500/20 transition-colors"
            >
              <Upload className="h-4 w-4" /> საბანკო იმპორტი
            </button>
          </div>

          {journalEntries.length === 0 ? (
            <EmptyState icon={BookOpen} text="ჟურნალის ჩანაწერები არ მოიძებნა" />
          ) : (
            <div className="space-y-3">
              {journalEntries.map((entry) => {
                const lines = journalLines.filter(l => l.journal_entry_id === entry.id)
                const entryOrder = entry.reference_type === 'SALES_ORDER' ? orders.find(o => o.id === entry.reference_id) : null;
                const productImages = entryOrder?.order_items?.map((item: any) => item.products?.images?.[0]).filter(Boolean) || [];
                
                return (
                  <div key={entry.id} className="rounded-2xl border border-border/50 bg-card overflow-hidden">
                    <div className="flex items-center justify-between px-6 py-3 bg-muted/30">
                      <div className="flex items-center gap-4">
                        <span className="text-xs font-mono text-primary min-w-[120px]">{entry.entry_number || entry.id.slice(0, 8)}</span>
                        {productImages.length > 0 && (
                          <div className="flex -space-x-2">
                            {productImages.slice(0, 3).map((img, idx) => (
                              <img key={idx} src={img || "https://via.placeholder.com/40"} alt="Product" className="h-10 w-10 shrink-0 rounded-md object-cover border-2 border-background bg-muted" />
                            ))}
                            {productImages.length > 3 && (
                               <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border-2 border-background bg-muted text-xs font-medium text-muted-foreground">
                                 +{productImages.length - 3}
                               </div>
                            )}
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground">{entry.description}</span>
                          {entryOrder && (
                            <button 
                              onClick={(e) => { e.stopPropagation(); setSelectedJournalOrder(entryOrder) }} 
                              className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 transition-colors ml-1"
                              title="დეტალების ნახვა"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground">{new Date(entry.entry_date).toLocaleDateString("ka-GE")}</span>
                        <StatusBadge status={entry.status} />
                      </div>
                    </div>
                    {lines.length > 0 && (
                      <table className="w-full">
                        <thead>
                          <tr className="border-t border-border/50">
                            <th className="px-6 py-2 text-left text-xs text-muted-foreground">ანგარიში</th>
                            <th className="px-6 py-2 text-left text-xs text-muted-foreground">აღწერა</th>
                            <th className="px-6 py-2 text-right text-xs text-muted-foreground">დებეტი</th>
                            <th className="px-6 py-2 text-right text-xs text-muted-foreground">კრედიტი</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/30">
                          {lines.map((line) => (
                            <tr key={line.id} className="hover:bg-muted/20">
                              <td className="px-6 py-2 text-sm">
                                <span className="font-mono text-xs text-primary">{line.accounts?.code}</span>
                                <span className="ml-2 text-foreground">{line.accounts?.name_ka}</span>
                              </td>
                              <td className="px-6 py-2 text-sm text-muted-foreground">{line.description || "—"}</td>
                              <td className="px-6 py-2 text-right text-sm font-medium text-emerald-600">
                                {parseFloat(line.debit) > 0 ? `₾ ${parseFloat(line.debit).toLocaleString()}` : "—"}
                              </td>
                              <td className="px-6 py-2 text-right text-sm font-medium text-red-500">
                                {parseFloat(line.credit) > 0 ? `₾ ${parseFloat(line.credit).toLocaleString()}` : "—"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </motion.div>
      )}

      {/* ═══════════════════ INVOICES ═══════════════════ */}
      {activeTab === "invoices" && <Invoices />}

      {/* ═══════════════════ INVENTORY ═══════════════════ */}
      {activeTab === "inventory" && <Inventory />}

      {/* ═══════════════════ VAT ═══════════════════ */}
      {activeTab === "vat" && <Vat />}

      {/* ═══════════════════ HR / PAYROLL ═══════════════════ */}
      {activeTab === "hr" && <Hr />}

      {/* ═══════════════════ RETURNS ═══════════════════ */}
      {activeTab === "returns" && <Returns />}

      {/* ═══════════════════ WAYBILLS ═══════════════════ */}
      {activeTab === "waybills" && <Waybills />}

      {/* ═══════════════════ FIXED ASSETS ═══════════════════ */}
      {activeTab === "fixed-assets" && <FixedAssets />}

      {/* ═══════════════════ TAXES ═══════════════════ */}
      {activeTab === "taxes" && <Taxes />}

      {/* ═══════════════════ REPORTS ═══════════════════ */}
      {activeTab === "reports" && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground">ფინანსური ანგარიშგება</h3>

          {/* Trial Balance from accounts */}
          <div className="rounded-2xl border border-border/50 bg-card overflow-hidden">
            <div className="px-6 py-4 border-b border-border/50 bg-muted/30">
              <h4 className="text-sm font-semibold text-foreground">საცდელი ბალანსი (ანგარიშთა გეგმა)</h4>
              <p className="text-xs text-muted-foreground mt-0.5">{accounts.length} ანგარიში</p>
            </div>
            <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
              <table className="w-full">
                <thead className="sticky top-0 bg-card">
                  <tr className="border-b border-border/50">
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">კოდი</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">დასახელება</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">ტიპი</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">კლასი</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">ბალანსი</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {accounts.filter(a => a.is_active).map((acc) => {
                    const accLines = journalLines.filter(l => l.account_id === acc.id)
                    const accDebit = accLines.reduce((s, l) => s + (parseFloat(l.debit) || 0), 0)
                    const accCredit = accLines.reduce((s, l) => s + (parseFloat(l.credit) || 0), 0)
                    const balance = acc.normal_balance === "DEBIT" ? accDebit - accCredit : accCredit - accDebit
                    const typeColors: Record<string, string> = {
                      ASSET: "text-blue-600 bg-blue-500/10", LIABILITY: "text-red-600 bg-red-500/10",
                      EQUITY: "text-violet-600 bg-violet-500/10", REVENUE: "text-emerald-600 bg-emerald-500/10",
                      EXPENSE: "text-amber-600 bg-amber-500/10", COGS: "text-orange-600 bg-orange-500/10",
                    }

                    return (
                      <tr key={acc.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-6 py-2 text-sm font-mono text-primary">{acc.code}</td>
                        <td className="px-6 py-2 text-sm text-foreground">{acc.name_ka}</td>
                        <td className="px-6 py-2">
                          <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", typeColors[acc.account_type] || "")}>
                            {acc.account_type}
                          </span>
                        </td>
                        <td className="px-6 py-2 text-sm text-muted-foreground">{acc.account_class}</td>
                        <td className="px-6 py-2 text-sm font-medium text-foreground">
                          {balance !== 0 ? (
                            <button 
                              onClick={() => setSelectedDrillDownAccount(acc)}
                              className="group flex items-center gap-1.5 hover:text-primary transition-colors underline decoration-dotted underline-offset-4"
                            >
                              ₾ {balance.toLocaleString()}
                              <Eye className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </button>
                          ) : "—"}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      )}
      {/* ═══════════════════ AUDIT LOGS ═══════════════════ */}
      {activeTab === "audit" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-card p-4 rounded-xl border border-border/50">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <Eye className="h-5 w-5 text-amber-500" /> სისტემური აუდიტი
            </h3>
            <select
              value={auditTableFilter}
              onChange={(e) => setAuditTableFilter(e.target.value)}
              className="text-xs rounded-lg border border-border bg-background px-3 py-2 focus:border-primary outline-none"
            >
              <option value="all">ყველა ცხრილი</option>
              <option value="journal_entries">ჟურნალები</option>
              <option value="invoices">ინვოისები</option>
              <option value="vat_declarations">დღგ</option>
              <option value="payroll_runs">ხელფასები</option>
              <option value="products">პროდუქტები</option>
            </select>
          </div>

          <div className="rounded-2xl border border-border/50 bg-card overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">დრო</th>
                  <th className="px-4 py-3">მომხმარებელი</th>
                  <th className="px-4 py-3">მოქმედება</th>
                  <th className="px-4 py-3">ცხრილი</th>
                  <th className="px-4 py-3">ჩანაწერი</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {auditLogs
                  .filter(l => auditTableFilter === "all" || l.table_name === auditTableFilter)
                  .map(log => (
                    <tr key={log.id} className="hover:bg-muted/50 transition-colors">
                      <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(log.changed_at).toLocaleString('ka-GE')}</td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-foreground">{log.changed_by_user?.full_name || 'SYSTEM'}</p>
                        <p className="text-[10px] text-muted-foreground">{log.changed_by_user?.email || ''}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          "px-2 py-0.5 text-[10px] uppercase font-bold rounded",
                          log.action === 'INSERT' ? "bg-emerald-500/10 text-emerald-600" :
                            log.action === 'UPDATE' ? "bg-blue-500/10 text-blue-600" :
                              "bg-red-500/10 text-red-600"
                        )}>{log.action}</span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{log.table_name}</td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{log.record_id?.slice(0, 8)}...</td>
                    </tr>
                  ))}
                {auditLogs.filter(l => auditTableFilter === "all" || l.table_name === auditTableFilter).length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">ჩანაწერები ვერ მოიძებნა</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Bank Statement Importer Modal */}
      {showBankImporter && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col max-h-[90vh] overflow-hidden border border-border/50">
            <div className="p-6 border-b border-border/50 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                  <Upload className="h-5 w-5 text-blue-500" /> საბანკო ამონაწერის იმპორტი
                </h2>
                <p className="text-sm text-muted-foreground mt-1">აირჩიეთ .csv ფაილი (TBC/BOG ფორმატი)</p>
              </div>
              <button onClick={() => { setShowBankImporter(false); setBankCsvData([]); setBankImportError("") }} className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 flex-1 overflow-y-auto">
              {bankImportError && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-600 rounded-xl flex items-center gap-2 text-sm">
                  <AlertTriangle className="h-4 w-4" /> {bankImportError}
                </div>
              )}

              {bankCsvData.length === 0 ? (
                <div className="border-2 border-dashed border-border rounded-2xl p-16 flex flex-col items-center justify-center text-muted-foreground hover:border-primary transition relative">
                  <input type="file" accept=".csv" onChange={handleBankFileUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                  <FileText className="h-12 w-12 text-muted-foreground/30 mb-4" />
                  <p className="font-bold text-foreground mb-1">აირჩიეთ CSV ფაილი</p>
                  <p className="text-xs text-center max-w-xs">TBC / BOG გამარტივებული ექსპორტის ფორმატი</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="font-bold text-foreground">ნაპოვნია {bankCsvData.length} ტრანზაქცია</h4>
                    <button onClick={() => setBankCsvData([])} className="text-xs text-red-500 bg-red-500/10 px-3 py-1.5 rounded-lg font-bold hover:bg-red-500/20 transition">გასუფთავება</button>
                  </div>
                  <div className="rounded-xl border border-border/50 overflow-hidden">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                        <tr>
                          <th className="p-3">თარიღი / დანიშნულება</th>
                          <th className="p-3 text-center">ტიპი</th>
                          <th className="p-3 text-right">თანხა</th>
                          <th className="p-3 w-1/3">კორესპ. ანგარიში</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/50">
                        {bankCsvData.map((t) => (
                          <tr key={t.id} className="hover:bg-muted/50 transition">
                            <td className="p-3">
                              <p className="font-mono text-xs text-muted-foreground">{t.date}</p>
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium text-foreground">{t.type === 'IN' ? t.payee : t.beneficiary}</p>
                                {t.matched_invoice_id && (
                                  <span className="flex items-center gap-1 bg-emerald-500/10 text-emerald-600 text-[10px] px-2 py-0.5 rounded-full font-bold" title={t.match_reason}>
                                    <CheckCircle className="h-3 w-3" /> ავტო-დაწყვილება
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground truncate max-w-xs">{t.purpose}</p>
                            </td>
                            <td className="p-3 text-center">
                              <span className={cn("px-2 py-1 rounded text-[10px] font-bold", t.type === 'IN' ? "bg-emerald-500/10 text-emerald-600" : "bg-red-500/10 text-red-600")}>
                                {t.type === 'IN' ? 'შემომავალი' : 'გამავალი'}
                              </span>
                            </td>
                            <td className={cn("p-3 text-right font-bold", t.type === 'IN' ? "text-emerald-600" : "text-foreground")}>
                              {t.type === 'IN' ? '+' : '-'}₾{t.amount.toFixed(2)}
                            </td>
                            <td className="p-3">
                              <select
                                value={t.account_target}
                                onChange={(e) => setBankCsvData(prev => prev.map(x => x.id === t.id ? { ...x, account_target: e.target.value } : x))}
                                className="w-full text-xs p-2 rounded-lg border border-border bg-background focus:border-primary outline-none"
                              >
                                <option value="">აირჩიეთ ანგარიში...</option>
                                {accounts.map((a: any) => <option key={a.id} value={a.id}>{a.code} - {a.name_ka}</option>)}
                              </select>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-border/50 flex justify-end gap-3">
              <button onClick={() => { setShowBankImporter(false); setBankCsvData([]); setBankImportError("") }} className="px-6 py-2.5 rounded-xl text-muted-foreground text-sm font-bold bg-muted hover:bg-muted/80 transition">გაუქმება</button>
              <button disabled={bankCsvData.length === 0 || isBankImporting} onClick={handleBankImport}
                className="px-6 py-2.5 rounded-xl text-primary-foreground text-sm font-bold bg-primary hover:bg-primary/90 transition flex items-center gap-2 disabled:opacity-50 shadow-lg shadow-primary/25"
              >
                {isBankImporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileCheck className="h-4 w-4" />}
                სრული იმპორტი
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════ JOURNAL ORDER MODAL ═══════════════════ */}
      <AnimatePresence>
        {selectedJournalOrder && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-black/60 backdrop-blur-sm p-4 pt-10"
            onClick={() => setSelectedJournalOrder(null)}
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
                  <h3 className="text-lg font-semibold text-foreground">შეკვეთის დეტალები (ჟურნალიდან)</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">ID: {selectedJournalOrder.id.slice(0, 8)}...</p>
                </div>
                <button onClick={() => setSelectedJournalOrder(null)} className="text-muted-foreground hover:text-foreground">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="max-h-[70vh] overflow-y-auto p-6 space-y-5">
                {/* Customer Info */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-xs text-muted-foreground block">კლიენტი</span>
                    <p className="font-semibold text-foreground">{selectedJournalOrder.customer_first_name} {selectedJournalOrder.customer_last_name}</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block">ტელეფონი</span>
                    <p className="font-medium text-foreground">{selectedJournalOrder.customer_phone}</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block">ქალაქი</span>
                    <p className="text-foreground">{selectedJournalOrder.customer_city}</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block">თარიღი</span>
                    <p className="text-foreground">{new Date(selectedJournalOrder.created_at).toLocaleDateString("ka-GE")} {new Date(selectedJournalOrder.created_at).toLocaleTimeString("ka-GE")}</p>
                  </div>
                </div>

                {/* Payment & Status Info */}
                <div className="grid grid-cols-3 gap-4 rounded-xl bg-muted/50 p-4 text-sm">
                  <div>
                    <span className="text-xs text-muted-foreground block">სულ თანხა</span>
                    <p className="text-xl font-bold text-foreground">₾ {parseFloat(selectedJournalOrder.total_price).toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block">გადახდა</span>
                    <p className="font-medium text-foreground">{selectedJournalOrder.payment_method || "—"}</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block">წყარო</span>
                    <p className="font-medium text-foreground">{selectedJournalOrder.sale_source === "showroom" ? "შოურუმი" : "ვებგვერდი"}</p>
                  </div>
                </div>

                {/* Order Items */}
                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-3">გაყიდული პროდუქცია</h4>
                  {selectedJournalOrder.order_items?.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">პროდუქტები არ მოიძებნა</p>
                  ) : (
                    <div className="space-y-2">
                      {selectedJournalOrder.order_items?.map((item: any) => (
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
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* ═══════════════════ DRILL-DOWN MODAL ═══════════════════ */}
      <AnimatePresence>
        {selectedDrillDownAccount && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setSelectedDrillDownAccount(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl bg-card border border-border/50 shadow-2xl overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-border/50 px-6 py-4 bg-muted/20">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-xs font-mono font-bold">
                      {selectedDrillDownAccount.code}
                    </span>
                    <h3 className="text-lg font-bold text-foreground">{selectedDrillDownAccount.name_ka}</h3>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">ანგარიშის დეტალური გატარებები (General Ledger)</p>
                </div>
                <button 
                  onClick={() => setSelectedDrillDownAccount(null)} 
                  className="h-10 w-10 flex items-center justify-center rounded-full hover:bg-muted text-muted-foreground transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Transactions Table */}
              <div className="flex-1 overflow-y-auto p-0">
                <table className="w-full text-left text-sm relative">
                  <thead className="sticky top-0 bg-card/95 backdrop-blur-md shadow-sm z-10">
                    <tr className="border-b border-border/50">
                      <th className="px-6 py-3 font-semibold text-muted-foreground">თარიღი</th>
                      <th className="px-6 py-3 font-semibold text-muted-foreground">დოკუმენტი / აღწერა</th>
                      <th className="px-6 py-3 text-right font-semibold text-emerald-600">დებეტი</th>
                      <th className="px-6 py-3 text-right font-semibold text-red-500">კრედიტი</th>
                      <th className="px-6 py-3 text-right font-semibold text-foreground">ქმედება</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30">
                    {journalLines
                      .filter(l => l.account_id === selectedDrillDownAccount.id)
                      .map((line, idx) => {
                        const entry = journalEntries.find(e => e.id === line.journal_entry_id)
                        return (
                          <tr key={idx} className="hover:bg-muted/30 transition-colors group">
                            <td className="px-6 py-4 whitespace-nowrap text-muted-foreground font-mono text-xs">
                              {entry ? new Date(entry.entry_date).toLocaleDateString("ka-GE") : "—"}
                            </td>
                            <td className="px-6 py-4">
                              <p className="font-medium text-foreground">{line.description || entry?.description}</p>
                              <p className="text-[10px] text-muted-foreground uppercase opacity-70">
                                {entry?.reference_type} · {entry?.entry_number}
                              </p>
                            </td>
                            <td className="px-6 py-4 text-right font-medium text-emerald-600">
                              {parseFloat(line.debit) > 0 ? `₾ ${parseFloat(line.debit).toLocaleString()}` : "—"}
                            </td>
                            <td className="px-6 py-4 text-right font-medium text-red-500">
                              {parseFloat(line.credit) > 0 ? `₾ ${parseFloat(line.credit).toLocaleString()}` : "—"}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <button 
                                onClick={() => {
                                  setActiveTab("journal");
                                  setSelectedDrillDownAccount(null);
                                  // In a real app we would scroll to this entry, but here we just switch view
                                }}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all shadow-sm"
                                title="ჟურნალში ნახვა"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    {journalLines.filter(l => l.account_id === selectedDrillDownAccount.id).length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-6 py-20 text-center text-muted-foreground italic">
                          გატარებები ვერ მოიძებნა
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              
              {/* Footer Summary */}
              <div className="bg-muted/30 px-6 py-4 border-t border-border/50 grid grid-cols-3 gap-6">
                <div>
                  <p className="text-[10px] uppercase text-muted-foreground font-bold">ჯამური დებეტი</p>
                  <p className="text-lg font-bold text-emerald-600">
                    ₾ {journalLines.filter(l => l.account_id === selectedDrillDownAccount.id).reduce((s, l) => s + (parseFloat(l.debit) || 0), 0).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase text-muted-foreground font-bold">ჯამური კრედიტი</p>
                  <p className="text-lg font-bold text-red-500">
                    ₾ {journalLines.filter(l => l.account_id === selectedDrillDownAccount.id).reduce((s, l) => s + (parseFloat(l.credit) || 0), 0).toLocaleString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] uppercase text-muted-foreground font-bold">ბალანსი</p>
                  <p className="text-xl font-black text-primary">
                    ₾ {(() => {
                      const d = journalLines.filter(l => l.account_id === selectedDrillDownAccount.id).reduce((s, l) => s + (parseFloat(l.debit) || 0), 0);
                      const c = journalLines.filter(l => l.account_id === selectedDrillDownAccount.id).reduce((s, l) => s + (parseFloat(l.credit) || 0), 0);
                      return (selectedDrillDownAccount.normal_balance === "DEBIT" ? d - c : c - d).toLocaleString();
                    })()}
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  )
}

// ═══════════════ Helper Components ═══════════════

function EmptyState({ icon: Icon, text }: { icon: any; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-border/50 bg-card py-16">
      <Icon className="h-12 w-12 text-muted-foreground/20 mb-3" />
      <p className="text-muted-foreground">{text}</p>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; cls: string }> = {
    DRAFT: { label: "დრაფტი", cls: "bg-gray-500/10 text-gray-500" },
    POSTED: { label: "გატარებული", cls: "bg-emerald-500/10 text-emerald-600" },
    REVERSED: { label: "შებრუნებული", cls: "bg-red-500/10 text-red-500" },
    PROCESSED: { label: "დამუშავებული", cls: "bg-blue-500/10 text-blue-600" },
    PAID: { label: "გადახდილი", cls: "bg-emerald-500/10 text-emerald-600" },
    PENDING: { label: "მოლოდინში", cls: "bg-amber-500/10 text-amber-600" },
    REJECTED: { label: "უარყოფილი", cls: "bg-red-500/10 text-red-500" },
    SUBMITTED: { label: "გაგზავნილი", cls: "bg-blue-500/10 text-blue-600" },
    ACCEPTED: { label: "მიღებული", cls: "bg-emerald-500/10 text-emerald-600" },
    ACTIVE: { label: "აქტიური", cls: "bg-emerald-500/10 text-emerald-600" },
    created: { label: "შექმნილი", cls: "bg-gray-500/10 text-gray-500" },
    activated: { label: "აქტივირებული", cls: "bg-blue-500/10 text-blue-600" },
    closed: { label: "დახურული", cls: "bg-emerald-500/10 text-emerald-600" },
  }
  const c = config[status] || { label: status, cls: "bg-muted text-muted-foreground" }
  return <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", c.cls)}>{c.label}</span>
}

function PaymentStatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; cls: string }> = {
    PAID: { label: "გადახდილი", cls: "bg-emerald-500/10 text-emerald-600" },
    PENDING: { label: "მოლოდინში", cls: "bg-amber-500/10 text-amber-600" },
    OVERDUE: { label: "ვადაგასული", cls: "bg-red-500/10 text-red-600" },
    PARTIAL: { label: "ნაწილობრივ", cls: "bg-blue-500/10 text-blue-600" },
    CANCELLED: { label: "გაუქმებული", cls: "bg-gray-500/10 text-gray-500" },
    REFUNDED: { label: "დაბრუნებული", cls: "bg-violet-500/10 text-violet-500" },
  }
  const c = config[status] || { label: status, cls: "bg-muted text-muted-foreground" }
  return <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", c.cls)}>{c.label}</span>
}

function KpiMini({ icon: Icon, value, label, color }: { icon: any; value: any; label: string; color: string }) {
  return (
    <div className={cn("rounded-2xl p-6 text-white bg-gradient-to-br shadow-lg flex items-center gap-4", color)}>
      <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-white/20 backdrop-blur-md">
        <Icon className="h-6 w-6 text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-sm font-medium text-white/80">{label}</p>
      </div>
    </div>
  )
}

function SummaryCard({ title, value, count, color }: { title: string; value: string; count: number; color: string }) {
  return (
    <div className={cn("rounded-2xl p-6 text-white bg-gradient-to-br shadow-lg", color)}>
      <p className="text-sm font-medium text-white/80">{title}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
      <p className="text-sm text-white/60">{count} ინვოისი</p>
    </div>
  )
}

function DataTable({ headers, rows }: { headers: string[]; rows: React.ReactNode[][] }) {
  return (
    <div className="rounded-2xl border border-border/50 bg-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr>
              {headers.map((h, i) => (
                <th key={i} className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {rows.map((row, ri) => (
              <tr key={ri} className="hover:bg-muted/30 transition-colors">
                {row.map((cell, ci) => (
                  <td key={ci} className="px-6 py-3 text-sm text-foreground">{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
