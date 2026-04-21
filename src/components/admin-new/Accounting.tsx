import React, { useState, useEffect, useMemo, useCallback, Suspense, lazy } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  BarChart3, BookOpen, FileText, Package, Building2, Users, RotateCcw, Truck,
  Landmark, Receipt, FileBarChart, TrendingUp, DollarSign, Percent, CreditCard,
  Banknote, Calendar, Loader2, RefreshCw, AlertTriangle, CheckCircle, Clock,
  XCircle, ChevronDown, Eye, Upload, X, FileCheck, ShoppingCart, Warehouse, Globe, Download
} from "lucide-react"
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from "recharts"
import { cn } from "@/src/lib/utils"
import { supabase } from "@/src/lib/supabase"
import { downloadExcel } from "@/src/lib/export"

// Lazy-loaded sub-tabs (each becomes its own chunk — won't load until user opens that tab)
const Invoices = lazy(() => import("./accounting/Invoices"))
const Inventory = lazy(() => import("./accounting/Inventory"))
const Vat = lazy(() => import("./accounting/Vat"))
const Hr = lazy(() => import("./accounting/Hr"))
const Returns = lazy(() => import("./accounting/Returns"))
const Waybills = lazy(() => import("./accounting/Waybills"))
const FixedAssets = lazy(() => import("./accounting/FixedAssets"))
const Taxes = lazy(() => import("./accounting/Taxes"))

const TabLoadingFallback = () => (
  <div className="flex flex-col items-center justify-center py-16">
    <Loader2 className="h-6 w-6 animate-spin text-primary mb-2" />
    <p className="text-muted-foreground text-xs">ქვე-მოდული იტვირთება...</p>
  </div>
)

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
  
  // ── Export States ──
  const [exportStartDate, setExportStartDate] = useState("")
  const [exportEndDate, setExportEndDate] = useState("")
  
  // ── Pagination State ──
  const [journalPage, setJournalPage] = useState(0)
  const [hasMoreJournal, setHasMoreJournal] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)

  // ── Bank Importer State ──
  const [showBankImporter, setShowBankImporter] = useState(false)
  const [bankCsvData, setBankCsvData] = useState<any[]>([])

  // ── Data State ──
  const [journalEntries, setJournalEntries] = useState<any[]>([])
  const [journalLines, setJournalLines] = useState<any[]>([])
  const [accounts, setAccounts] = useState<any[]>([])
  const [orders, setOrders] = useState<any[]>([])
  const [invoices, setInvoices] = useState<any[]>([])
  const [dashboardData, setDashboardData] = useState<any>(null)
  const [trialBalanceData, setTrialBalanceData] = useState<any>(null)

  useEffect(() => {
    fetchInitialData()
    fetchDashboardData()
  }, [])

  useEffect(() => {
    if (activeTab === 'reports' && !trialBalanceData) {
      fetchTrialBalance()
    }
  }, [activeTab])

  const fetchDashboardData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/accounting/dashboard', {
        headers: { Authorization: `Bearer ${session?.access_token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setDashboardData(data)
      }
    } catch (err) {
      console.error("Dashboard fetch error:", err)
    }
  }

  const fetchTrialBalance = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/accounting/reports/trial-balance', {
        headers: { Authorization: `Bearer ${session?.access_token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setTrialBalanceData(data)
      }
    } catch (err) {
      console.error("Trial Balance fetch error:", err)
    }
  }

  const fetchInitialData = async () => {
    setIsLoading(true)
    try {
      const from = 0;
      const to = 49;

      const { data: ent } = await supabase.from('journal_entries').select('*').order('entry_date', { ascending: false }).range(from, to)
      
      const entryIds = ent?.map(e => e.id) || [];
      const { data: lns } = entryIds.length > 0 
        ? await supabase.from('journal_lines').select('*, accounts(code, name_ka)').in('journal_entry_id', entryIds).order('id')
        : { data: [] };

      const { data: acc } = await supabase.from('accounts').select('*').order('code')
      const { data: ord } = await supabase.from('orders').select('*, order_items(*, products(*, images))').order('created_at', { ascending: false }).range(from, to)
      const { data: inv } = await supabase.from('invoices').select('*').filter('status', 'eq', 'pending').range(0, 99)

      setJournalEntries(ent || [])
      setJournalLines(lns || [])
      setAccounts(acc || [])
      setOrders(ord || [])
      setInvoices(inv || [])
      
      setJournalPage(0)
      setHasMoreJournal((ent?.length || 0) === 50)
    } finally {
      setIsLoading(false)
    }
  }

  const loadMoreJournalEntries = async () => {
    if (isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      const nextPage = journalPage + 1;
      const from = nextPage * 50;
      const to = from + 49;

      const { data: ent } = await supabase.from('journal_entries').select('*').order('entry_date', { ascending: false }).range(from, to);
      
      const entryIds = ent?.map(e => e.id) || [];
      let newLines: any[] = [];
      if (entryIds.length > 0) {
        const { data: lns } = await supabase.from('journal_lines').select('*, accounts(code, name_ka)').in('journal_entry_id', entryIds).order('id');
        newLines = lns || [];
      }

      setJournalEntries(prev => [...prev, ...(ent || [])]);
      setJournalLines(prev => [...prev, ...newLines]);
      setJournalPage(nextPage);
      setHasMoreJournal((ent?.length || 0) === 50);
    } finally {
      setIsLoadingMore(false);
    }
  }

  // ── Bank Reconciliation Logic ──
  const handleBankFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Simulation of CSV parsing and matching
    const mockData = [
      { id: '1', date: '2024-03-10', beneficiary: 'KALE GROUP', payee: 'CUSTOMER-001', amount: 1540.00, type: 'IN', purpose: 'Invoice INV-2024-001 PAYMENT' },
      { id: '2', date: '2024-03-11', beneficiary: 'ELECTRICITY LLC', payee: 'KALE GROUP', amount: 450.00, type: 'OUT', purpose: 'Electricity Utility March' },
      { id: '3', date: '2024-03-12', beneficiary: 'KALE GROUP', payee: 'RENTAL PROPERTIES', amount: 2000.00, type: 'OUT', purpose: 'Showroom Rent' }
    ];

    const processed = mockData.map(row => {
      const match = invoices.find(inv => row.purpose.includes(inv.invoice_number) || (inv.total_amount === row.amount && row.type === 'IN'));
      return {
        ...row,
        account_target: match ? '1210' : row.type === 'OUT' ? '7110' : '1410',
        matched_invoice_id: match?.id,
        match_reason: match ? `Matches ${match.invoice_number}` : 'No exact match'
      }
    });

    setBankCsvData(processed);
  }

  // ── Export Logic ──
  const handleExportExcel = async () => {
    let dataToExport: any[] = [];
    const filename = `Kale_ERP_${activeTab}_export`;

    // Filter wrapper based on date picker
    const filterByDate = (itemDateString: string) => {
      if (!exportStartDate && !exportEndDate) return true;
      const d = new Date(itemDateString).getTime();
      const s = exportStartDate ? new Date(exportStartDate).getTime() : 0;
      const e = exportEndDate ? new Date(exportEndDate).getTime() : Infinity;
      return d >= s && d <= e;
    };

    if (activeTab === "journal") {
      dataToExport = journalEntries
        .filter(entry => filterByDate(entry.entry_date))
        .map(entry => ({
          'ნომერი': entry.entry_number || entry.id.substring(0, 8),
          'თარიღი': new Date(entry.entry_date).toLocaleDateString('ka-GE'),
          'აღწერა': entry.description,
          'ტიპი': entry.reference_type,
          'სტატუსი': ['completed', 'posted'].includes(entry.status?.toLowerCase() || '') ? 'დასრულებული/გატარებული' : 'პროცესში'
        }));
    } else if (activeTab === "invoices") {
      dataToExport = invoices
        .filter(inv => filterByDate(inv.created_at))
        .map(inv => ({
          'ინვოისის N': inv.invoice_number,
          'თარიღი': new Date(inv.created_at).toLocaleDateString('ka-GE'),
          'თანხა': inv.total_amount,
          'გადასახ.': inv.tax_amount,
          'სტატუსი': inv.status
        }));
    } else if (activeTab === "dashboard") {
      dataToExport = (dashboardData?.monthlySummary || []).map((m: any) => ({
        'თვე': m.month,
        'შემოსავალი': m.revenue,
        'ნეტო მოგება': m.net_profit
      }));
    } else {
      // Default / mock fallback for other tabs
      dataToExport = [{ message: "მონაცემები მუშავდება ამ ტაბისთვის..." }];
    }

    downloadExcel(dataToExport, filename);
  };

  // ── Components ──
  const StatusBadge = ({ status }: { status: string }) => {
    let colors = 'bg-amber-500/10 text-amber-500 border-amber-500/20';
    let label = 'პროცესში';
    const s = status?.toLowerCase() || '';

    if (s === 'completed' || s === 'posted') {
      colors = 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
      label = s === 'posted' ? 'გატარებული' : 'დასრულებული';
    } else if (s === 'draft') {
      colors = 'bg-slate-500/10 text-slate-500 border-slate-500/20';
      label = 'მონახაზი';
    }

    return (
      <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase", colors)}>
        {label}
      </span>
    );
  };

  const EmptyState = ({ icon: Icon, text }: { icon: any, text: string }) => (
    <div className="flex flex-col items-center justify-center py-20 rounded-3xl border border-dashed border-border/60 bg-muted/10 opacity-60">
      <Icon className="h-10 w-10 text-muted-foreground mb-4" />
      <p className="text-sm font-medium text-muted-foreground">{text}</p>
    </div>
  );

  return (
    <div className="flex min-h-screen w-full flex-col bg-background p-6">
      {/* ── HEADER ── */}
      <div className="mb-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shadow-lg shadow-primary/20">
            {accountingTabs.find(t => t.id === activeTab)?.icon}
          </div>
          <div className="flex flex-col">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {activeTab === "dashboard" && "ბუღალტერიის დეშბორდი"}
              {activeTab === "journal" && "ბუღალტრული ჟურნალი"}
              {activeTab === "invoices" && "ინვოისების მართვა"}
              {activeTab === "inventory" && "მარაგების მართვა"}
              {activeTab === "vat" && "დღგ-ს მართვა"}
              {activeTab === "hr" && "ხელფასები და პერსონალი"}
              {activeTab === "returns" && "პროდუქციის დაბრუნება (RMA)"}
              {activeTab === "waybills" && "RS.ge ზედნადებები"}
              {activeTab === "fixed-assets" && "ძირითადი აქტივები"}
              {activeTab === "taxes" && "გადასახადების მართვა"}
              {activeTab === "reports" && "ფინანსური ანგარიშგება"}
            </h1>
            <p className="text-xs text-muted-foreground font-medium">
              {activeTab === "dashboard" && "რეალური ფინანსური მაჩვენებლების ანალიზი"}
              {activeTab === "journal" && "გატარებების ისტორია და რეესტრი"}
              {activeTab === "invoices" && "გაყიდვების დოკუმენტაცია და სტატუსები"}
              {activeTab === "inventory" && "ნედლეული, მასალები და მზა პროდუქცია"}
              {activeTab === "vat" && "საგადასახადო ვალდებულებები და დეკლარირება"}
              {activeTab === "hr" && "თანამშრომელთა ბარათები, ხელფასები და უწყისები"}
              {activeTab === "returns" && "დაბრუნებების ისტორია და აღრიცხვა"}
              {activeTab === "waybills" && "ინტეგრაცია შემოსავლების სამსახურთან"}
              {activeTab === "fixed-assets" && "აქტივების რეესტრი და ამორტიზაცია"}
              {activeTab === "taxes" && "ბიუჯეტთან ანგარიშსწორება"}
              {activeTab === "reports" && "ბალანსი, მოგება-ზარალი და საცდელი ბალანსი"}
            </p>
          </div>
        </div>
        
        
        <div className="flex flex-col gap-3 items-end">
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-muted/30 border border-border/50 rounded-xl px-2 py-1 gap-2">
              <Calendar className="text-muted-foreground w-4 h-4 ml-1" />
              <input 
                type="date" 
                value={exportStartDate}
                onChange={(e) => setExportStartDate(e.target.value)}
                className="bg-transparent text-xs text-foreground outline-none" 
              />
              <span className="text-muted-foreground">-</span>
              <input 
                type="date" 
                value={exportEndDate}
                onChange={(e) => setExportEndDate(e.target.value)}
                className="bg-transparent text-xs text-foreground outline-none" 
              />
            </div>
            <button
               onClick={handleExportExcel}
               className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-500/20 transition-all"
            >
               <Download size={14} />
               Excel ექსპორტი
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-muted/30 rounded-2xl border border-border/50">
            {accountingTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-2 rounded-xl px-3 py-1.5 text-[11px] font-bold transition-all",
                  activeTab === tab.id
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-105"
                    : "text-muted-foreground hover:bg-background/50"
                )}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-1 items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm font-medium text-muted-foreground">მონაცემები იტვირთება...</p>
          </div>
        </div>
      ) : (
        <AnimatePresence mode="wait">
          {/* ═══════════════════ DASHBOARD ═══════════════════ */}
          {activeTab === "dashboard" && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.98 }} className="space-y-8">
              {/* 9 Vibrant KPI Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-9 gap-4">
                {[
                  { label: 'შემოსავალი', value: `₾ ${Number(dashboardData?.kpis?.revenue || 0).toLocaleString()}`, icon: <TrendingUp size={16}/>, color: 'bg-emerald-500', trend: '' },
                  { label: 'COGS', value: `₾ ${Number(dashboardData?.kpis?.cogs || 0).toLocaleString()}`, icon: <Package size={16}/>, color: 'bg-orange-500', trend: '' },
                  { label: 'მარჟა %', value: `${dashboardData?.kpis?.grossMarginPct || 0}%`, icon: <Percent size={16}/>, color: 'bg-blue-500', trend: '' },
                  { label: 'მთლ. მოგება', value: `₾ ${Number(dashboardData?.kpis?.grossProfit || 0).toLocaleString()}`, icon: <DollarSign size={16}/>, color: 'bg-violet-500', trend: '' },
                  { label: 'დღგ გადასახ.', value: `₾ ${Number(dashboardData?.kpis?.vatPayable || 0).toLocaleString()}`, icon: <Receipt size={16}/>, color: 'bg-rose-500', trend: '' },
                  { label: 'გადახ. ინვ.', value: `₾ ${Number(dashboardData?.kpis?.totalPaidRevenue || 0).toLocaleString()}`, icon: <FileCheck size={16}/>, color: 'bg-cyan-500', trend: '' },
                  { label: 'მარაგის ღირ.', value: `₾ ${Number(dashboardData?.kpis?.inventoryValue || 0).toLocaleString()}`, icon: <Warehouse size={16}/>, color: 'bg-teal-500', trend: '' },
                  { label: 'ნეტო მოგება', value: `₾ ${Number(dashboardData?.kpis?.netProfit || 0).toLocaleString()}`, icon: <Landmark size={16}/>, color: 'bg-indigo-500', trend: '' },
                  { label: 'აქცია გაყ.', value: `₾ ${Number(dashboardData?.kpis?.promotionalSales || 0).toLocaleString()}`, icon: <Percent size={16}/>, color: 'bg-pink-500', trend: '' },
                ].map((card, i) => (
                  <div key={i} className={cn("relative overflow-hidden rounded-2xl p-4 shadow-lg group transition-transform hover:-translate-y-1", card.color)}>
                    <div className="absolute top-0 right-0 p-2 opacity-20 group-hover:scale-125 transition-transform text-white">{card.icon}</div>
                    <p className="text-[9px] font-bold text-white/70 uppercase tracking-tighter mb-1">{card.label}</p>
                    <p className="text-sm font-bold text-white whitespace-nowrap">{card.value}</p>
                    {card.trend && <span className="text-[8px] font-bold text-white bg-white/20 px-1 py-0.5 rounded mt-1 inline-block">{card.trend}</span>}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Payment Breakthrough Frame */}
                <div className="bg-card/40 backdrop-blur-md border border-border/40 rounded-3xl p-6 shadow-xl space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold flex items-center gap-2"><CreditCard size={18} className="text-primary"/> გადახდის მეთოდების დაშლა</h3>
                    <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">ბოლო 30 დღე</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { 
                        label: 'საქართველოს ბანკი', 
                        val: `₾ ${Number(dashboardData?.paymentBreakdown?.bog?.total || 0).toLocaleString()}`, 
                        count: (dashboardData?.paymentBreakdown?.bog?.count || 0), 
                        online: `₾ ${Number(dashboardData?.paymentBreakdown?.bog?.onlineTotal || 0).toLocaleString()}`,
                        showroom: `₾ ${Number(dashboardData?.paymentBreakdown?.bog?.showroomTotal || 0).toLocaleString()}`,
                        color: 'bg-orange-500' 
                      },
                      { 
                        label: 'თიბისი ბანკი', 
                        val: `₾ ${Number(dashboardData?.paymentBreakdown?.tbc?.total || 0).toLocaleString()}`, 
                        count: (dashboardData?.paymentBreakdown?.tbc?.count || 0), 
                        online: `₾ ${Number(dashboardData?.paymentBreakdown?.tbc?.onlineTotal || 0).toLocaleString()}`,
                        showroom: `₾ ${Number(dashboardData?.paymentBreakdown?.tbc?.showroomTotal || 0).toLocaleString()}`,
                        color: 'bg-blue-500' 
                      },
                      { 
                        label: 'კრედო (განვადება)', 
                        val: `₾ ${Number(dashboardData?.paymentBreakdown?.credo?.total || 0).toLocaleString()}`, 
                        count: (dashboardData?.paymentBreakdown?.credo?.count || 0), 
                        online: `₾ ${Number(dashboardData?.paymentBreakdown?.credo?.onlineTotal || 0).toLocaleString()}`,
                        showroom: `₾ ${Number(dashboardData?.paymentBreakdown?.credo?.showroomTotal || 0).toLocaleString()}`,
                        color: 'bg-blue-600' 
                      },
                      { 
                        label: 'ნაღდი (შოურუმი)', 
                        val: `₾ ${Number(dashboardData?.paymentBreakdown?.cash?.total || 0).toLocaleString()}`, 
                        count: (dashboardData?.paymentBreakdown?.cash?.count || 0), 
                        online: `₾ 0`, // Cash is usually showroom only
                        showroom: `₾ ${Number(dashboardData?.paymentBreakdown?.cash?.total || 0).toLocaleString()}`,
                        color: 'bg-emerald-500' 
                      },
                    ].map(pm => (
                      <div key={pm.label} className="p-4 rounded-2xl bg-muted/10 border border-border/20 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <div className={cn("w-2 h-2 rounded-full", pm.color)} />
                            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-tight">{pm.label}</span>
                          </div>
                          <p className="text-lg font-bold">{pm.val}</p>
                          <p className="text-[9px] text-muted-foreground mt-1 font-medium">{pm.count} ტრანზაქცია</p>
                        </div>
                        <div className="mt-3 pt-3 border-t border-border/20 flex flex-col gap-1.5">
                          <div className="flex items-center justify-between text-[10px] font-bold">
                            <span className="flex items-center gap-1 text-muted-foreground"><Globe size={10}/> ონლაინ:</span>
                            <span>{pm.online}</span>
                          </div>
                          <div className="flex items-center justify-between text-[10px] font-bold">
                            <span className="flex items-center gap-1 text-muted-foreground"><Building2 size={10}/> შოურუმი:</span>
                            <span>{pm.showroom}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="h-3 w-full bg-muted/20 rounded-full overflow-hidden flex">
                    {/* Visual breakdown bar */}
                    {(Object.values(dashboardData?.paymentBreakdown || {}) as any[]).map((data: any, i: number) => {
                      const total: number = (Object.values(dashboardData?.paymentBreakdown || {}) as any[]).reduce((acc: number, cur: any) => acc + (cur.total || 0), 0);
                      const pct = total > 0 ? (data.total / total) * 100 : 0;
                      const colors = ['bg-orange-500', 'bg-blue-500', 'bg-blue-600', 'bg-emerald-500', 'bg-violet-500', 'bg-gray-400'];
                      if (pct === 0) return null;
                      return <div key={i} className={cn("h-full", colors[i % colors.length])} style={{ width: `${pct}%` }} />
                    })}
                  </div>
                  {!dashboardData?.paymentBreakdown && <div className="h-3 w-full animate-pulse bg-muted/20 rounded-full" />}
                </div>

                {/* Monthly Statistics Chart Frame */}
                <div className="bg-card/40 backdrop-blur-md border border-border/40 rounded-3xl p-6 shadow-xl">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold flex items-center gap-2"><FileBarChart size={18} className="text-primary"/> ყოველთვიური სტატისტიკა</h3>
                  </div>
                  <div className="h-64">
                    {(dashboardData?.monthlySummary || []).length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={dashboardData.monthlySummary.slice(-8).map((m: any) => {
                          const monthNames = ['იანვ', 'თებ', 'მარ', 'აპრ', 'მაი', 'ივნ', 'ივლ', 'აგვ', 'სექ', 'ოქტ', 'ნოე', 'დეკ'];
                          return { month: monthNames[m.month - 1] || m.month, revenue: m.revenue || 0, profit: m.net_profit || 0 };
                        })}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.3} />
                          <XAxis dataKey="month" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `₾${(v / 1000).toFixed(0)}k`} />
                          <Tooltip
                            contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px', fontSize: 12 }}
                            formatter={(value: number) => [`₾ ${value.toLocaleString()}`, '']}
                          />
                          <Legend wrapperStyle={{ fontSize: 11 }} />
                          <Bar dataKey="revenue" name="შემოსავალი" fill="#10b981" radius={[6, 6, 0, 0]} />
                          <Bar dataKey="profit" name="მოგება" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center">
                        <div className="flex flex-col items-center gap-3 opacity-40">
                          <FileBarChart size={32} className="text-muted-foreground" />
                          <p className="text-sm text-muted-foreground">მონაცემები იტვირთება...</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
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
                <div className="space-y-4">
                  {journalEntries.map((entry) => {
                    const lines = journalLines.filter(l => l.journal_entry_id === entry.id)
                    const entryOrder = entry.reference_type === 'SALES_ORDER' ? orders.find(o => o.id === entry.reference_id) : null;
                    
                    const getEntryIcon = () => {
                      if (entry.reference_type === 'SALES_ORDER') return <ShoppingCart className="h-4 w-4" />;
                      if (entry.reference_type === 'BANK_STATEMENT') return <Building2 className="h-4 w-4" />;
                      if (entry.reference_type === 'PAYROLL') return <Users className="h-4 w-4" />;
                      if (entry.reference_type === 'INVOICE') return <FileText className="h-4 w-4" />;
                      return <BookOpen className="h-4 w-4" />;
                    };

                    const statusColor = entry.status === 'completed' ? 'bg-emerald-500' : 'bg-amber-500';

                    return (
                      <motion.div 
                        key={entry.id} 
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="relative overflow-hidden rounded-2xl border border-border/40 bg-card/40 backdrop-blur-sm transition-all hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5 group"
                      >
                        <div className={cn("absolute left-0 top-0 bottom-0 w-1", statusColor)} />

                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-6 py-4 border-b border-border/30 bg-muted/20">
                          <div className="flex items-center gap-4">
                            <div className="flex flex-col">
                              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">გატარების ნომერი</span>
                              <span className="text-xs font-mono text-primary font-bold">{entry.entry_number || entry.id.slice(0, 8)}</span>
                            </div>
                            <div className="h-8 w-[1px] bg-border/50 mx-2 hidden sm:block" />
                            <div className="flex items-center gap-3">
                              <div className="h-9 w-9 flex items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
                                {getEntryIcon()}
                              </div>
                              <div className="flex flex-col">
                                <span className="text-sm font-bold text-foreground leading-tight">{entry.description}</span>
                                <span className="text-[10px] text-muted-foreground">{entry.reference_type}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-4 self-end sm:self-center">
                            <div className="flex flex-col items-end">
                              <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">თარიღი</span>
                              <span className="text-xs font-medium text-foreground">{new Date(entry.entry_date).toLocaleDateString("ka-GE")}</span>
                            </div>
                            <StatusBadge status={entry.status} />
                            {entryOrder && (
                              <button 
                                onClick={(e) => { e.stopPropagation(); setSelectedJournalOrder(entryOrder) }} 
                                className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 transition-all border border-blue-500/20 shadow-sm"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr className="bg-muted/5">
                                <th className="px-6 py-2 text-left text-[10px] uppercase tracking-wider text-muted-foreground font-bold">ანგარიში</th>
                                <th className="px-6 py-2 text-left text-[10px] uppercase tracking-wider text-muted-foreground font-bold">დასახელება / აღწერა</th>
                                <th className="px-6 py-2 text-right text-[10px] uppercase tracking-wider text-muted-foreground font-bold">დებეტი</th>
                                <th className="px-6 py-2 text-right text-[10px] uppercase tracking-wider text-muted-foreground font-bold">კრედიტი</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border/20">
                              {lines.map((line, idx) => (
                                <tr key={idx} className="hover:bg-primary/5 transition-colors">
                                  <td className="px-6 py-2.5">
                                    <span className="text-sm font-mono font-bold text-primary bg-primary/5 px-2 py-0.5 rounded border border-primary/10">
                                      {line.account_code || line.accounts?.code || "—"}
                                    </span>
                                  </td>
                                  <td className="px-6 py-2.5">
                                    <div className="flex flex-col">
                                      <span className="text-sm font-medium text-foreground">{line.accounts?.name_ka || "ანგარიში"}</span>
                                      {line.description && <span className="text-[10px] text-muted-foreground italic">{line.description}</span>}
                                    </div>
                                  </td>
                                  <td className="px-6 py-2.5 text-right">
                                    {line.debit > 0 ? (
                                      <div className="inline-flex flex-col items-end">
                                        <span className="text-sm font-mono font-bold text-emerald-500">
                                          ₾ {line.debit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </span>
                                        <span className="text-[9px] text-emerald-600/60 font-bold uppercase tracking-tighter">DEBIT</span>
                                      </div>
                                    ) : <span className="text-muted-foreground/30">—</span>}
                                  </td>
                                  <td className="px-6 py-2.5 text-right">
                                    {line.credit > 0 ? (
                                      <div className="inline-flex flex-col items-end">
                                        <span className="text-sm font-mono font-bold text-amber-500">
                                          ₾ {line.credit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </span>
                                        <span className="text-[9px] text-amber-600/60 font-bold uppercase tracking-tighter">CREDIT</span>
                                      </div>
                                    ) : <span className="text-muted-foreground/30">—</span>}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </motion.div>
                    )
                  })}
                  
                  {hasMoreJournal && (
                    <div className="flex justify-center pt-4 pb-8">
                      <button 
                        onClick={loadMoreJournalEntries} 
                        disabled={isLoadingMore}
                        className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-muted/50 hover:bg-muted text-sm font-bold text-foreground transition-all disabled:opacity-50 border border-border"
                      >
                        {isLoadingMore ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                        {isLoadingMore ? "იტვირთება..." : "მეტის ჩატვირთვა"}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}

          {/* ═══════════════════ OTHER TABS (lazy-loaded) ═══════════════════ */}
          <Suspense fallback={<TabLoadingFallback />}>
            {activeTab === "invoices" && <Invoices />}
            {activeTab === "inventory" && <Inventory />}
            {activeTab === "vat" && <Vat />}
            {activeTab === "hr" && <Hr />}
            {activeTab === "returns" && <Returns />}
            {activeTab === "waybills" && <Waybills />}
            {activeTab === "fixed-assets" && <FixedAssets />}
            {activeTab === "taxes" && <Taxes />}
          </Suspense>

          {/* ═══════════════════ REPORTS ═══════════════════ */}
          {activeTab === "reports" && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground">ფინანსური ანგარიშგება</h3>
              <div className="rounded-2xl border border-border/50 bg-card overflow-hidden">
                <div className="px-6 py-4 border-b border-border/50 bg-muted/30">
                  <h4 className="text-sm font-semibold text-foreground">საცდელი ბალანსი</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">{accounts.length} ანგარიში</p>
                </div>
                {/* Simplified Trial Balance */}
                <div className="overflow-x-auto">
                   <table className="w-full text-sm">
                     <thead>
                       <tr className="bg-muted/50 text-muted-foreground text-[10px] uppercase font-bold">
                         <th className="px-6 py-3 text-left">კოდი</th>
                         <th className="px-6 py-3 text-left">დასახელება</th>
                         <th className="px-6 py-3 text-right">ბალანსი</th>
                       </tr>
                     </thead>
                     <tbody className="divide-y divide-border/30">
                       {(trialBalanceData?.accounts || accounts).map((acc: any) => {
                         const balance = Number(acc.total_debit || 0) - Number(acc.total_credit || 0);
                         return (
                           <tr key={acc.id || acc.code} className="hover:bg-muted/20 cursor-pointer" onClick={() => setSelectedDrillDownAccount(acc)}>
                             <td className="px-6 py-3 font-mono text-primary">{acc.code}</td>
                             <td className="px-6 py-3">{acc.name_ka || acc.name}</td>
                             <td className={cn("px-6 py-3 text-right font-mono font-bold", balance > 0 ? "text-emerald-500" : balance < 0 ? "text-red-500" : "text-muted-foreground")}>
                               ₾ {Math.abs(balance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                             </td>
                           </tr>
                         );
                       })}
                     </tbody>
                     <tfoot className="bg-muted/50 border-t-2 border-border">
                       <tr>
                         <td className="px-6 py-3 font-bold text-sm" colSpan={2}>ჯამი</td>
                         <td className="px-6 py-3 text-right font-mono font-bold text-sm">
                           {trialBalanceData ? (
                             <span className={trialBalanceData.balanced ? "text-emerald-500" : "text-red-500"}>
                               {trialBalanceData.balanced ? "✓ ბალანსი სწორია" : "✗ ბალანსი არაზუსტია"}
                             </span>
                           ) : "იტვირთება..."}
                         </td>
                       </tr>
                     </tfoot>
                   </table>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* ── Drill-down Modal ── */}
      {selectedDrillDownAccount && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-md p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-4xl max-h-[80vh] bg-card rounded-3xl border border-border shadow-2xl overflow-hidden flex flex-col"
          >
            <div className="p-6 border-b border-border flex items-center justify-between bg-muted/20">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold text-lg">
                  {selectedDrillDownAccount.code}
                </div>
                <div>
                  <h3 className="text-xl font-bold">{selectedDrillDownAccount.name_ka}</h3>
                  <p className="text-xs text-muted-foreground">დეტალური ტრანზაქციების ისტორია</p>
                </div>
              </div>
              <button onClick={() => setSelectedDrillDownAccount(null)} className="h-10 w-10 flex items-center justify-center rounded-xl hover:bg-muted transition-colors"><X /></button>
            </div>
            <div className="flex-1 overflow-auto p-6">
              {(() => {
                const accountLines = journalLines.filter(l => l.account_id === selectedDrillDownAccount.id);
                if (accountLines.length === 0) {
                  return <EmptyState icon={Clock} text="ამ ანგარიშზე ჩანაწერები არ იძებნება" />;
                }
                const totalDebit = accountLines.reduce((s, l) => s + Number(l.debit || 0), 0);
                const totalCredit = accountLines.reduce((s, l) => s + Number(l.credit || 0), 0);
                return (
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/20 p-4">
                        <p className="text-[10px] text-emerald-500 font-bold uppercase">სულ დებეტი</p>
                        <p className="text-xl font-bold text-emerald-500 mt-1">₾ {totalDebit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                      </div>
                      <div className="rounded-2xl bg-amber-500/10 border border-amber-500/20 p-4">
                        <p className="text-[10px] text-amber-500 font-bold uppercase">სულ კრედიტი</p>
                        <p className="text-xl font-bold text-amber-500 mt-1">₾ {totalCredit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                      </div>
                      <div className="rounded-2xl bg-primary/10 border border-primary/20 p-4">
                        <p className="text-[10px] text-primary font-bold uppercase">ბალანსი</p>
                        <p className="text-xl font-bold text-primary mt-1">₾ {(totalDebit - totalCredit).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                      </div>
                    </div>
                    <div className="rounded-2xl border border-border/40 overflow-hidden">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-muted/50 text-[10px] uppercase font-bold text-muted-foreground">
                            <th className="px-6 py-3 text-left">თარიღი</th>
                            <th className="px-6 py-3 text-left">აღწერა</th>
                            <th className="px-6 py-3 text-right">დებეტი</th>
                            <th className="px-6 py-3 text-right">კრედიტი</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/20">
                          {accountLines.map((line, idx) => {
                            const entry = journalEntries.find(e => e.id === line.journal_entry_id);
                            return (
                              <tr key={idx} className="hover:bg-muted/20 transition-colors">
                                <td className="px-6 py-3 font-mono text-xs">{entry ? new Date(entry.entry_date).toLocaleDateString('ka-GE') : '—'}</td>
                                <td className="px-6 py-3">{line.description || entry?.description || '—'}</td>
                                <td className="px-6 py-3 text-right font-mono font-bold text-emerald-500">
                                  {line.debit > 0 ? `₾ ${Number(line.debit).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '—'}
                                </td>
                                <td className="px-6 py-3 text-right font-mono font-bold text-amber-500">
                                  {line.credit > 0 ? `₾ ${Number(line.credit).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '—'}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })()}
            </div>
          </motion.div>
        </div>
      )}

      {/* ── Order Details Modal ── */}
      <AnimatePresence>
        {selectedJournalOrder && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setSelectedJournalOrder(null)}>
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card w-full max-w-3xl rounded-3xl border border-border shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            >
              <div className="p-6 border-b border-border/50 bg-muted/20 flex items-center justify-between sticky top-0 z-10 backdrop-blur-md">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
                    <ShoppingCart size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-foreground">
                      შეკვეთა #{selectedJournalOrder.id.slice(0, 8)}
                    </h2>
                    <p className="text-sm text-muted-foreground">{new Date(selectedJournalOrder.created_at).toLocaleString('ka-GE')}</p>
                  </div>
                </div>
                <button onClick={() => setSelectedJournalOrder(null)} className="h-10 w-10 flex items-center justify-center rounded-xl hover:bg-muted text-muted-foreground transition-colors">
                  <X size={20} />
                </button>
              </div>
              
              <div className="p-6 overflow-y-auto space-y-6">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-muted/30 p-4 rounded-2xl border border-border/30">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">მომხმარებელი</p>
                    <p className="font-semibold text-sm text-foreground">{selectedJournalOrder.customer_first_name} {selectedJournalOrder.customer_last_name}</p>
                    {selectedJournalOrder.customer_phone && <p className="text-xs text-muted-foreground mt-0.5">{selectedJournalOrder.customer_phone}</p>}
                  </div>
                  <div className="bg-muted/30 p-4 rounded-2xl border border-border/30">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">სტატუსი</p>
                    <p className="font-semibold text-sm text-foreground capitalize">{selectedJournalOrder.status}</p>
                  </div>
                  <div className="bg-muted/30 p-4 rounded-2xl border border-border/30">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">გადახდა</p>
                    <p className="font-semibold text-sm text-foreground capitalize">{selectedJournalOrder.payment_method}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{selectedJournalOrder.payment_status}</p>
                  </div>
                  <div className="bg-emerald-500/10 p-4 rounded-2xl border border-emerald-500/20">
                    <p className="text-[10px] uppercase font-bold text-emerald-600/80 mb-1">ჯამი</p>
                    <p className="font-bold text-lg text-emerald-500">₾ {Number(selectedJournalOrder.total_price).toLocaleString('ka-GE', {minimumFractionDigits: 2})}</p>
                  </div>
                </div>

                {selectedJournalOrder.order_items && selectedJournalOrder.order_items.length > 0 && (
                  <div>
                    <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                      <Package size={16} className="text-primary" /> შეკვეთილი პროდუქცია
                    </h3>
                    <div className="rounded-2xl border border-border/50 overflow-hidden">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-muted/40 text-[10px] uppercase font-bold text-muted-foreground">
                          <tr>
                            <th className="px-6 py-3">პროდუქტი</th>
                            <th className="px-6 py-3 text-right">ფასი</th>
                            <th className="px-6 py-3 text-right">რაოდ.</th>
                            <th className="px-6 py-3 text-right">ჯამი</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/30">
                          {selectedJournalOrder.order_items.map((item: any) => (
                            <tr key={item.id} className="hover:bg-muted/10 transition-colors">
                              <td className="px-6 py-3 font-medium text-foreground">
                                {item.products?.name_ka || item.products?.name || "უცნობი პროდუქტი"}
                              </td>
                              <td className="px-6 py-3 text-right font-mono text-muted-foreground">₾ {Number(item.price_at_purchase || item.price || 0).toLocaleString('ka-GE')}</td>
                              <td className="px-6 py-3 text-right font-medium">{item.quantity}</td>
                              <td className="px-6 py-3 text-right font-mono font-bold text-emerald-500">
                                ₾ {(Number(item.price_at_purchase || item.price || 0) * Number(item.quantity)).toLocaleString('ka-GE')}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Bank Importer Modal ── */}
      {showBankImporter && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-md p-4">
          <motion.div 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-5xl bg-card rounded-3xl border border-border shadow-2xl overflow-hidden"
          >
            <div className="p-6 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-xl text-blue-500"><Landmark /></div>
                <h3 className="text-xl font-bold">საბანკო ამონაწერის იმპორტი</h3>
              </div>
              <button onClick={() => setShowBankImporter(false)}><X /></button>
            </div>
            
            <div className="p-8">
              {!bankCsvData.length ? (
                <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-border rounded-3xl bg-muted/10">
                  <input type="file" id="bank-csv" hidden onChange={handleBankFileUpload} />
                  <label htmlFor="bank-csv" className="flex flex-col items-center gap-4 cursor-pointer">
                    <div className="h-16 w-16 bg-blue-500 text-white rounded-full flex items-center justify-center shadow-lg shadow-blue-500/20"><Upload size={32} /></div>
                    <p className="text-lg font-bold">აირჩიეთ საბანკო CSV ფაილი</p>
                    <p className="text-xs text-muted-foreground">მხარდაჭერილია: საქართველოს ბანკი, TBC (.csv)</p>
                  </label>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-border overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted text-[10px] font-bold uppercase">
                        <tr>
                          <th className="px-6 py-3 text-left">თარიღი</th>
                          <th className="px-6 py-3 text-left">დასახელება</th>
                          <th className="px-6 py-3 text-right">თანხა</th>
                          <th className="px-6 py-3 text-center">სტატუსი</th>
                          <th className="px-6 py-3 text-right">ანგარიში</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bankCsvData.map((row, idx) => (
                          <tr key={idx} className="border-t border-border/50 hover:bg-muted/30">
                            <td className="px-6 py-4 font-mono">{row.date}</td>
                            <td className="px-6 py-4 flex flex-col">
                              <span className="font-bold">{row.payee}</span>
                              <span className="text-[10px] text-muted-foreground">{row.purpose.slice(0, 40)}...</span>
                            </td>
                            <td className={cn("px-6 py-4 text-right font-bold", row.type === 'IN' ? 'text-emerald-500' : 'text-red-500')}>
                              {row.type === 'IN' ? '+' : '-'} ₾ {row.amount}
                            </td>
                            <td className="px-6 py-4 text-center">
                              {row.matched_invoice_id ? 
                                <span className="px-2 py-1 bg-emerald-500/10 text-emerald-500 text-[10px] font-bold rounded-lg border border-emerald-500/20 flex items-center justify-center gap-1"><FileCheck size={12}/> {row.match_reason}</span> :
                                <span className="px-2 py-1 bg-amber-500/10 text-amber-500 text-[10px] font-bold rounded-lg border border-amber-500/20">აღმოუჩენელი</span>
                              }
                            </td>
                            <td className="px-6 py-4 text-right">
                              <select defaultValue={row.account_target} className="bg-muted/50 border border-border rounded-lg text-xs p-1">
                                {accounts.map(acc => <option key={acc.id} value={acc.code}>{acc.code} - {acc.name_ka}</option>)}
                              </select>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex justify-end gap-3 mt-6">
                    <button onClick={() => setBankCsvData([])} className="px-6 py-2 rounded-xl border border-border font-bold text-sm">გაუქმება</button>
                    <button className="px-6 py-2 rounded-xl bg-primary text-primary-foreground font-bold text-sm shadow-xl shadow-primary/20">იმპორტის დადასტურება</button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
