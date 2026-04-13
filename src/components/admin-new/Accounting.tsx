import { useState, useEffect, useMemo, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  BarChart3, BookOpen, FileText, Package, Building2, Users, RotateCcw, Truck,
  Landmark, Receipt, FileBarChart, TrendingUp, DollarSign, Percent, CreditCard,
  Banknote, Calendar, Loader2, RefreshCw, AlertTriangle, CheckCircle, Clock,
  XCircle, ChevronDown, Eye, Upload, X, FileCheck, ShoppingCart
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
  const [bankCsvData, setBankCsvData] = useState<any[]>([])

  // ── Data State ──
  const [journalEntries, setJournalEntries] = useState<any[]>([])
  const [journalLines, setJournalLines] = useState<any[]>([])
  const [accounts, setAccounts] = useState<any[]>([])
  const [orders, setOrders] = useState<any[]>([])
  const [invoices, setInvoices] = useState<any[]>([])

  useEffect(() => {
    fetchInitialData()
  }, [])

  const fetchInitialData = async () => {
    setIsLoading(true)
    try {
      const { data: ent } = await supabase.from('journal_entries').select('*').order('entry_date', { ascending: false })
      const { data: lns } = await supabase.from('journal_lines').select('*, accounts(code, name_ka)').order('id')
      const { data: acc } = await supabase.from('accounts').select('*').order('code')
      const { data: ord } = await supabase.from('orders').select('*, order_items(*, products(*, images))')
      const { data: inv } = await supabase.from('invoices').select('*').filter('status', 'eq', 'pending')

      setJournalEntries(ent || [])
      setJournalLines(lns || [])
      setAccounts(acc || [])
      setOrders(ord || [])
      setInvoices(inv || [])
    } finally {
      setIsLoading(false)
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

  // ── Components ──
  const StatusBadge = ({ status }: { status: string }) => {
    const colors = status === 'completed' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20';
    return (
      <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase", colors)}>
        {status === 'completed' ? 'დასრულებული' : 'პროცესში'}
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
        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <span className="text-primary/50">ბუღალტერია</span>
              <span className="text-muted-foreground/30 font-light">/</span>
              <span>ფინანსური მართვა</span>
            </h1>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium">Kale Group ERP · საბუღალტრო მოდული</p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-muted/30 rounded-2xl border border-border/50">
          {accountingTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 rounded-xl px-3 py-1.5 text-[11px] font-bold transition-all",
                activeTab === tab.id
                  ? "bg-background text-primary shadow-sm border border-border/50"
                  : "text-muted-foreground hover:bg-background/50"
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
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
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.98 }} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Income */}
              <div className="relative overflow-hidden rounded-3xl border border-emerald-500/20 bg-gradient-to-br from-[#0a1510] to-[#040806] p-6 shadow-xl group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform"><TrendingUp size={48} className="text-emerald-500" /></div>
                <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-4 border border-emerald-500/20">
                  <TrendingUp size={20} />
                </div>
                <h4 className="text-[10px] font-bold text-emerald-500/60 uppercase tracking-widest">მთლიანი შემოსავალი</h4>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-foreground">₾ 142,500</span>
                  <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">+12%</span>
                </div>
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500/40 to-transparent" />
              </div>

              {/* Expense */}
              <div className="relative overflow-hidden rounded-3xl border border-rose-500/20 bg-gradient-to-br from-[#1a0b0d] to-[#080405] p-6 shadow-xl group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform"><RotateCcw size={48} className="text-rose-500" /></div>
                <div className="h-10 w-10 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center mb-4 border border-rose-500/20">
                  <Banknote size={20} />
                </div>
                <h4 className="text-[10px] font-bold text-rose-500/60 uppercase tracking-widest">მთლიანი ხარჯი</h4>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-foreground">₾ 89,200</span>
                  <span className="text-[10px] font-bold text-rose-500 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20">+4%</span>
                </div>
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500/40 to-transparent" />
              </div>

              {/* Profit */}
              <div className="relative overflow-hidden rounded-3xl border border-blue-500/20 bg-gradient-to-br from-[#0b101a] to-[#040508] p-6 shadow-xl group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform"><DollarSign size={48} className="text-blue-500" /></div>
                <div className="h-10 w-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center mb-4 border border-blue-500/20">
                  <DollarSign size={20} />
                </div>
                <h4 className="text-[10px] font-bold text-blue-500/60 uppercase tracking-widest">წმინდა მოგება</h4>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-foreground">₾ 53,300</span>
                  <span className="text-[10px] font-bold text-blue-500 bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20">+18%</span>
                </div>
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500/40 to-transparent" />
              </div>

              {/* VAT */}
              <div className="relative overflow-hidden rounded-3xl border border-amber-500/20 bg-gradient-to-br from-[#1a130b] to-[#080604] p-6 shadow-xl group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform"><Percent size={48} className="text-amber-500" /></div>
                <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center mb-4 border border-amber-500/20">
                  <Receipt size={20} />
                </div>
                <h4 className="text-[10px] font-bold text-amber-500/60 uppercase tracking-widest">დღგ-ს ვალდებულება</h4>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-foreground">₾ 12,450</span>
                  <span className="text-[10px] font-bold text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">დღგ</span>
                </div>
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500/40 to-transparent" />
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
                </div>
              )}
            </motion.div>
          )}

          {/* ═══════════════════ OTHER TABS ═══════════════════ */}
          {activeTab === "invoices" && <Invoices />}
          {activeTab === "inventory" && <Inventory />}
          {activeTab === "vat" && <Vat />}
          {activeTab === "hr" && <Hr />}
          {activeTab === "returns" && <Returns />}
          {activeTab === "waybills" && <Waybills />}
          {activeTab === "fixed-assets" && <FixedAssets />}
          {activeTab === "taxes" && <Taxes />}

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
                       {accounts.map(acc => (
                         <tr key={acc.id} className="hover:bg-muted/20 cursor-pointer" onClick={() => setSelectedDrillDownAccount(acc)}>
                           <td className="px-6 py-3 font-mono text-primary">{acc.code}</td>
                           <td className="px-6 py-3">{acc.name_ka}</td>
                           <td className="px-6 py-3 text-right font-mono font-bold">₾ 0.00</td>
                         </tr>
                       ))}
                     </tbody>
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
              {/* Drill down logic here */}
              <EmptyState icon={Clock} text="ამ ანგარიშზე ჩანაწერები არ იძებნება" />
            </div>
          </motion.div>
        </div>
      )}

      {/* ── Order Details Modal ── */}
      {selectedJournalOrder && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-md p-4">
          {/* Order Details UI ... same as before but inside Accounting */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-card p-8 rounded-3xl border border-border shadow-2xl relative">
            <button onClick={() => setSelectedJournalOrder(null)} className="absolute top-4 right-4"><X /></button>
            <h2 className="text-2xl font-bold mb-4">შეკვეთის დეტალები: {selectedJournalOrder.order_number}</h2>
            {/* Show items ... */}
            <p>მომხმარებელი: {selectedJournalOrder.customer_name}</p>
            <p className="text-xl font-bold mt-4">ჯამი: ₾ {selectedJournalOrder.total_amount}</p>
          </motion.div>
        </div>
      )}

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
