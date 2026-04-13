import React, { useState, useEffect, useCallback } from 'react';
import { 
  Receipt, 
  TrendingUp, 
  TrendingDown, 
  ArrowUpDown, 
  Calendar,
  Filter,
  RefreshCw,
  ArrowRight,
  Database,
  BarChart3,
  CheckCircle2,
  Info,
  ToggleLeft,
  ToggleRight,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../../lib/utils';
import { supabase } from '../../../lib/supabase';

// Premium Design Components
const Card = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={cn("rounded-2xl border border-border/50 bg-card/50 backdrop-blur-xl p-6 shadow-sm", className)}>
    {children}
  </div>
);

const KpiCard = ({ icon: Icon, title, value, subValue, color }: any) => (
  <div className={cn("rounded-2xl p-6 text-white bg-gradient-to-br shadow-lg", color)}>
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm font-medium text-white/80 uppercase tracking-widest">{title}</p>
        <p className="mt-2 text-3xl font-bold">{value}</p>
        {subValue && <p className="mt-1 text-xs font-medium text-white/70">{subValue}</p>}
      </div>
      <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-white/20 backdrop-blur-md">
        <Icon className="h-7 w-7 text-white" />
      </div>
    </div>
  </div>
);

const MONTH_NAMES = ['იანვარი', 'თებერვალი', 'მარტი', 'აპრილი', 'მაისი', 'ივნისი', 'ივლისი', 'აგვისტო', 'სექტემბერი', 'ოქტომბერი', 'ნოემბერი', 'დეკემბერი'];

export default function Vat() {
  const [activeTab, setActiveTab] = useState<'summary' | 'transactions'>('summary');
  const [summary, setSummary] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [vatTypeFilter, setVatTypeFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [isVatRegistered, setIsVatRegistered] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null);

  const getToken = async () => (await supabase.auth.getSession()).data.session?.access_token || '';

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getToken();
      
      // Fetch settings to check VAT status (Corrected to key-value schema)
      const { data: settings } = await supabase
        .from('company_settings')
        .select('*')
        .eq('key', 'vat_registered');
      
      if (settings && settings.length > 0) {
        setIsVatRegistered(settings[0].value === true || settings[0].value === 'true');
      }

      if (activeTab === 'summary') {
        const res = await fetch('/api/accounting/vat/summary', { 
          headers: { Authorization: `Bearer ${token}` } 
        });
        const json = await res.json();
        setSummary(json.summary || []);
      } else {
        const params = new URLSearchParams({ limit: '100' });
        if (vatTypeFilter) params.set('vat_type', vatTypeFilter);
        const res = await fetch(`/api/accounting/vat/transactions?${params}`, { 
          headers: { Authorization: `Bearer ${token}` } 
        });
        const json = await res.json();
        setTransactions(json.transactions || []);
      }
    } catch (err) {
      console.error('VAT fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [activeTab, vatTypeFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const showToast = (msg: string, type: 'ok' | 'err') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleToggleVat = async () => {
    if (isUpdating) return;
    const newVal = !isVatRegistered;
    setIsVatRegistered(newVal); // Optimistic update
    setIsUpdating(true);
    
    try {
      const { error } = await supabase
        .from('company_settings')
        .update({ value: newVal })
        .eq('key', 'vat_registered');
      
      if (error) throw error;
      showToast(newVal ? 'დღგ-ს სტატუსი გააქტიურდა' : 'დღგ-ს სტატუსი გამოირთო', 'ok');
    } catch (err: any) {
      setIsVatRegistered(!newVal); // Rollback
      showToast('შეცდომა განახლებისას: ' + err.message, 'err');
    } finally {
      setIsUpdating(false);
    }
  };

  // Totals
  const ytdOutput = summary.reduce((s, r) => s + Number(r.output_vat || 0), 0);
  const ytdInput = summary.reduce((s, r) => s + Number(r.input_vat || 0), 0);
  const ytdNet = ytdOutput - ytdInput;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Receipt className="h-6 w-6 text-primary" /> დღგ-ს მართვა
          </h2>
          <p className="text-sm text-muted-foreground">დამატებული ღირებულების გადასახადის აღრიცხვა და დეკლარირება</p>
        </div>
        
        <div className="flex items-center gap-4">
          <button 
            onClick={handleToggleVat}
            disabled={isUpdating}
            className={cn(
              "flex items-center gap-3 px-4 py-2 rounded-xl text-xs font-bold ring-1 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50",
              isVatRegistered 
                ? "bg-emerald-500/10 text-emerald-500 ring-emerald-500/20 shadow-lg shadow-emerald-500/10" 
                : "bg-muted text-muted-foreground ring-border/50"
            )}
          >
            {isVatRegistered ? (
              <>
                <ToggleRight className="h-5 w-5" /> რეგისტრირებული გადამხდელი (18%)
              </>
            ) : (
              <>
                <ToggleLeft className="h-5 w-5" /> დღგ-ს გარეშე (არაგადამხდელი)
              </>
            )}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: -20, x: 20 }}
            animate={{ opacity: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={cn(
              "fixed top-24 right-6 z-[60] px-6 py-3 rounded-2xl shadow-2xl border backdrop-blur-xl flex items-center gap-3",
              toast.type === 'ok' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" : "bg-rose-500/10 border-rose-500/20 text-rose-500"
            )}
          >
            {toast.type === 'ok' ? <CheckCircle2 className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
            <span className="font-medium text-sm">{toast.msg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* YTD Dashboard */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <KpiCard 
          icon={TrendingUp} 
          title="Output VAT (YTD)" 
          value={`₾ ${ytdOutput.toLocaleString()}`} 
          subValue="რეალიზაციიდან დარიცხული" 
          color="from-rose-500 to-rose-600" 
        />
        <KpiCard 
          icon={TrendingDown} 
          title="Input VAT (YTD)" 
          value={`₾ ${ytdInput.toLocaleString()}`} 
          subValue="შესყიდვებიდან ჩათვლილი" 
          color="from-emerald-500 to-teal-600" 
        />
        <KpiCard 
          icon={ArrowUpDown} 
          title="სანეტო გადასახდელი" 
          value={`₾ ${Math.abs(ytdNet).toLocaleString()}`} 
          subValue={ytdNet > 0 ? "ბიუჯეტში გადასახდელი" : "ზედმეტობა (ჩასათვლელი)"} 
          color={ytdNet > 0 ? "from-amber-400 to-orange-500" : "from-sky-500 to-blue-600"} 
        />
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 rounded-2xl border border-border/50 bg-card p-1">
          {[
            { id: 'summary', label: 'პერიოდული შეჯამება', icon: BarChart3 },
            { id: 'transactions', label: 'ტრანზაქციების ჟურნალი', icon: Database },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={cn(
                "flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-semibold transition-all",
                activeTab === t.id 
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" 
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <t.icon className="h-4 w-4" />
              {t.label}
            </button>
          ))}
        </div>

        <button 
          onClick={fetchData}
          className="p-2.5 rounded-xl border border-border/50 hover:bg-muted transition-all active:scale-95"
          title="Refresh"
        >
          <RefreshCw className={cn("h-5 w-5 text-muted-foreground", loading && "animate-spin")} />
        </button>
      </div>

      {/* Content */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-4"
      >
        {activeTab === 'summary' && (
          <Card className="p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/30 bg-muted/20 text-muted-foreground">
                    <th className="px-6 py-4 text-left font-bold uppercase tracking-wider text-xs">პერიოდი</th>
                    <th className="px-6 py-4 text-right font-bold uppercase tracking-wider text-xs text-rose-500">Output (გასავალი)</th>
                    <th className="px-6 py-4 text-right font-bold uppercase tracking-wider text-xs text-emerald-500">Input (შესავალი)</th>
                    <th className="px-6 py-4 text-right font-bold uppercase tracking-wider text-xs">სანეტო</th>
                    <th className="px-6 py-4 text-center font-bold uppercase tracking-wider text-xs text-primary">სტატუსი</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {loading ? (
                    Array(3).fill(0).map((_, i) => (
                      <tr key={i} className="animate-pulse"><td colSpan={5} className="px-6 py-6"><div className="h-10 bg-muted rounded-xl" /></td></tr>
                    ))
                  ) : summary.length === 0 ? (
                    <tr><td colSpan={5} className="py-20 text-center text-muted-foreground italic">მონაცემები არ მოიძებნა</td></tr>
                  ) : (
                    summary.map((row, i) => {
                      const net = Number(row.net_vat_payable || 0);
                      return (
                        <tr key={i} className="group hover:bg-muted/30 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                                <Calendar className="h-4 w-4" />
                              </div>
                              <span className="font-bold text-foreground">
                                {MONTH_NAMES[(row.period_month || 1) - 1]} {row.period_year}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right font-mono font-bold text-rose-500">₾ {Number(row.output_vat).toLocaleString()}</td>
                          <td className="px-6 py-4 text-right font-mono font-bold text-emerald-500">₾ {Number(row.input_vat).toLocaleString()}</td>
                          <td className="px-6 py-4 text-right">
                             <div className={cn("font-black font-mono inline-flex items-center gap-1", net > 0 ? "text-amber-500" : "text-emerald-500")}>
                               ₾ {Math.abs(net).toLocaleString()}
                               {net > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                             </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                             <span className="rounded-full bg-primary/10 px-3 py-1 text-[10px] font-black uppercase text-primary border border-primary/20">
                               DRAFT
                             </span>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
                {summary.length > 0 && (
                  <tfoot className="bg-muted/30 border-t border-border/50">
                    <tr className="font-black text-foreground">
                      <td className="px-6 py-4 uppercase tracking-tighter text-xs">YTD ჯამური მაჩვენებელი</td>
                      <td className="px-6 py-4 text-right font-mono text-rose-500">₾ {ytdOutput.toLocaleString()}</td>
                      <td className="px-6 py-4 text-right font-mono text-emerald-500">₾ {ytdInput.toLocaleString()}</td>
                      <td className={cn("px-6 py-4 text-right font-mono text-lg", ytdNet > 0 ? "text-amber-500" : "text-emerald-500")}>₾ {Math.abs(ytdNet).toLocaleString()}</td>
                      <td />
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </Card>
        )}

        {activeTab === 'transactions' && (
          <div className="space-y-4">
             <div className="flex items-center gap-2">
                {[
                  { id: '', label: 'ყველა' },
                  { id: 'OUTPUT', label: 'გასავალი (გაყიდვა)' },
                  { id: 'INPUT', label: 'შესავალი (შესყიდვა)' },
                ].map(type => (
                  <button
                    key={type.id}
                    onClick={() => setVatTypeFilter(type.id)}
                    className={cn(
                      "px-4 py-2 rounded-xl text-xs font-bold ring-1 transition-all",
                      vatTypeFilter === type.id 
                        ? "bg-primary text-primary-foreground ring-primary shadow-lg shadow-primary/20" 
                        : "bg-card text-muted-foreground ring-border/50 hover:bg-muted"
                    )}
                  >
                    {type.label}
                  </button>
                ))
                }
             </div>

             <div className="space-y-3">
                {loading ? (
                  Array(5).fill(0).map((_, i) => <div key={i} className="h-20 bg-muted animate-pulse rounded-2xl" />)
                ) : transactions.length === 0 ? (
                  <Card className="py-20 text-center text-muted-foreground">ტრანზაქციები არ მოიძებნა</Card>
                ) : (
                  transactions.map((t, idx) => (
                    <Card key={idx} className="p-4 hover:bg-muted/20 transition-all group overflow-hidden relative">
                      <div className={cn(
                        "absolute top-0 left-0 w-1 h-full",
                        t.vat_type === 'OUTPUT' ? "bg-rose-500" : "bg-emerald-500"
                      )} />
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                           <div className={cn(
                             "h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 border",
                             t.vat_type === 'OUTPUT' ? "bg-rose-500/10 text-rose-500 border-rose-500/20" : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                           )}>
                             <Receipt className="h-6 w-6" />
                           </div>
                           <div className="space-y-0.5">
                              <div className="flex items-center gap-2">
                                <span className={cn("text-[10px] font-black uppercase tracking-widest", t.vat_type === 'OUTPUT' ? "text-rose-500" : "text-emerald-500")}>
                                  {t.vat_type === 'OUTPUT' ? 'გასავალი' : 'შესავალი'}
                                </span>
                                <span className="text-xs text-muted-foreground">•</span>
                                <span className="text-xs font-mono text-muted-foreground">{new Date(t.transaction_date).toLocaleDateString('ka-GE')}</span>
                              </div>
                              <h4 className="font-bold text-foreground flex items-center gap-2">
                                {t.reference_type}
                                <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                              </h4>
                              {t.counterparty_tin && (
                                <p className="text-[10px] text-muted-foreground font-mono">საიდენტიფიკაციო: {t.counterparty_tin}</p>
                              )}
                           </div>
                        </div>

                        <div className="flex items-center gap-8 sm:text-right">
                           <div className="space-y-0.5">
                              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">დასაბეგრი</p>
                              <p className="text-sm font-bold text-foreground font-mono">₾ {Number(t.taxable_amount).toLocaleString()}</p>
                           </div>
                           <div className="space-y-0.5">
                              <p className="text-[10px] text-primary font-bold uppercase tracking-widest">დღგ ({t.vat_rate}%)</p>
                              <p className="text-lg font-black text-foreground font-mono">₾ {Number(t.vat_amount).toLocaleString()}</p>
                           </div>
                        </div>
                      </div>
                    </Card>
                  ))
                )}
             </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}