import React, { useState, useEffect } from 'react';
import { 
  Landmark, 
  FileCheck2, 
  Plus,
  Calculator, 
  LogOut, 
  ChevronRight,
  TrendingUp,
  ArrowRight,
  Info,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Zap,
  DollarSign,
  PieChart
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

export default function Taxes() {
  const [loading, setLoading] = useState(false);
  const [periods, setPeriods] = useState<any[]>([]);
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null);

  const [form, setForm] = useState({
    amount: '',
    date: new Date().toISOString().split('T')[0],
    fiscal_period_id: ''
  });

  const getToken = async () => (await supabase.auth.getSession()).data.session?.access_token || '';

  useEffect(() => {
    getToken().then(async token => {
      const res = await fetch('/api/accounting/fiscal-periods', { headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      const open = (json.periods || []).filter((p: any) => p.status === 'OPEN');
      setPeriods(open);
      if (open.length > 0) setForm(f => ({ ...f, fiscal_period_id: open[0].id }));
    });
  }, []);

  const showToast = (msg: string, type: 'ok' | 'err') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleDeclare = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const token = await getToken();
      const res = await fetch('/api/accounting/dividends/declare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      
      if (!res.ok) throw new Error(json.error);
      
      showToast(`მოგება წარმატებით დადეკლარირდა. Profit Tax (15%): ₾${json.profit_tax.toLocaleString()}`, 'ok');
      setForm({ ...form, amount: '' });
    } catch (err: any) {
      showToast(err.message, 'err');
    } finally {
      setLoading(false);
    }
  };

  const amountNum = Number(form.amount || 0);
  const grossAmount = amountNum / 0.85;
  const profitTax = grossAmount * 0.15;
  const totalDeduction = amountNum + profitTax;

  return (
    <div className="space-y-6">
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

      {/* Header */}
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Landmark className="h-6 w-6 text-primary" /> გადასახადები & დივიდენდები
          </h2>
          <p className="text-sm text-muted-foreground">მოგების განაწილება და დეკლარირება (ესტონური მოდელი)</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard 
          icon={Calculator} 
          title="Profit Tax" 
          value="15%" 
          subValue="განაწილებულ მოგებაზე" 
          color="from-sky-500 to-blue-600" 
        />
        <KpiCard 
          icon={PieChart} 
          title="Income Tax" 
          value="20%" 
          subValue="სახელფასო ფონდიდან" 
          color="from-violet-500 to-purple-600" 
        />
        <KpiCard 
          icon={Landmark} 
          title="VAT / დღგ" 
          value="18%" 
          subValue="დამატებული ღირებულება" 
          color="from-emerald-500 to-teal-600" 
        />
        <KpiCard 
          icon={Info} 
          title="ფისკალური ციკლი" 
          value={periods.length} 
          subValue="აქტიური პერიოდი" 
          color="from-amber-400 to-orange-500" 
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Declare Form */}
        <Card className="relative overflow-hidden group border-primary/20 bg-primary/[0.02]">
          <div className="flex items-center gap-3 mb-8">
            <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <LogOut className="h-5 w-5 rotate-90" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground italic">დივიდენდის დეკლარირება</h3>
              <p className="text-xs text-muted-foreground">პარტნიორებზე გასაცემი წმინდა მოგება</p>
            </div>
          </div>

          <form onSubmit={handleDeclare} className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 block">ოპერაციის თარიღი</label>
                <input 
                  type="date"
                  required
                  value={form.date}
                  onChange={e => setForm({...form, date: e.target.value})}
                  className="w-full bg-background border border-border/50 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 block">ფისკალური პერიოდი</label>
                <select 
                  required 
                  value={form.fiscal_period_id}
                  onChange={e => setForm({...form, fiscal_period_id: e.target.value})}
                  className="w-full bg-background border border-border/50 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none cursor-pointer appearance-none"
                >
                  {periods.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 block">გასაცემი თანხა (NET, ₾) *</label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <input 
                  type="number"
                  step="0.01"
                  min="1"
                  required
                  placeholder="0.00"
                  value={form.amount}
                  onChange={e => setForm({...form, amount: e.target.value})}
                  className="w-full pl-10 pr-4 py-4 bg-background border border-border/50 rounded-2xl text-xl font-black font-mono focus:ring-2 focus:ring-primary/20 outline-none transition-all placeholder:text-muted-foreground/30"
                />
              </div>
              <p className="text-[10px] text-muted-foreground italic ml-2 mt-2 flex items-center gap-1">
                <Info className="h-3 w-3" /> თანხა, რომელიც რეალურად აკლდება სალაროს ან ბანკს.
              </p>
            </div>

            <button 
              type="submit" 
              disabled={loading || !form.amount}
              className="w-full py-4 bg-primary text-primary-foreground rounded-2xl font-black text-sm shadow-xl shadow-primary/20 hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-3 uppercase tracking-wider"
            >
              {loading ? <RefreshCw className="h-5 w-5 animate-spin" /> : <FileCheck2 className="h-5 w-5" />}
              დეკლარირების დადასტურება
            </button>
          </form>
        </Card>

        {/* Calculation Visualizer */}
        <div className="space-y-6">
          <Card className="bg-gradient-to-br from-primary/5 to-transparent border-primary/20 h-full flex flex-col justify-between">
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <Calculator className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">კალკულატორი</h3>
                  <p className="text-xs text-muted-foreground italic">Tax Calculation Visualizer</p>
                </div>
              </div>

              <div className="space-y-4">
                 <div className="flex items-center justify-between p-4 bg-background/50 rounded-2xl border border-border/30">
                    <div>
                       <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">გასაცემი (Net)</p>
                       <p className="text-2xl font-black font-mono text-foreground">₾ {amountNum.toLocaleString()}</p>
                    </div>
                    <CheckCircle2 className="h-6 w-6 text-emerald-500 opacity-50" />
                 </div>

                 <div className="flex justify-center -my-2 relative z-10">
                    <div className="h-8 w-8 rounded-full bg-muted border border-border/50 flex items-center justify-center">
                       <Plus className="h-4 w-4 text-muted-foreground" />
                    </div>
                 </div>

                 <div className="flex items-center justify-between p-4 bg-amber-500/5 rounded-2xl border border-amber-500/20 shadow-inner">
                    <div>
                       <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest flex items-center gap-1.5">
                         მოგების გადასახადი (15%) <Zap className="h-3 w-3 fill-amber-500" />
                       </p>
                       <p className="text-2xl font-black font-mono text-amber-500">₾ {profitTax.toLocaleString()}</p>
                       <p className="text-[9px] text-amber-500/60 font-mono italic mt-1">{amountNum.toLocaleString()} / 0.85 × 0.15</p>
                    </div>
                 </div>

                 <div className="flex justify-center -my-2 relative z-10">
                    <div className="h-8 w-8 rounded-full bg-foreground border border-border/50 flex items-center justify-center">
                       <ArrowRight className="h-4 w-4 text-background rotate-90" />
                    </div>
                 </div>

                 <div className="flex items-center justify-between p-5 bg-card rounded-2xl border-2 border-primary/30 shadow-2xl shadow-primary/5">
                    <div>
                       <p className="text-[10px] font-black text-primary uppercase tracking-widest">ჯამური ჩამოწერა (Gross)</p>
                       <p className="text-3xl font-black font-mono text-primary italic underline decoration-primary/30">₾ {totalDeduction.toLocaleString()}</p>
                       <p className="text-[9px] text-muted-foreground mt-1">აკლდება გაუნაწილებელ მოგებას (A/C 5200)</p>
                    </div>
                 </div>
              </div>
            </div>

            <div className="mt-8 p-4 rounded-2xl bg-blue-500/5 border border-blue-500/10 flex gap-4">
               <div className="h-10 w-10 shrink-0 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center font-black">💡</div>
               <div className="space-y-1">
                  <p className="text-xs font-bold text-foreground">ბუღალტრული ასახვა</p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    ესტონური მოდელის მიხედვით, გაუნაწილებელი მოგება იბეგრება მხოლოდ განაწილებისას.
                    სისტემა ავტომატურად გაატარებს: 
                    <span className="font-mono text-primary font-bold"> Dr 5200</span>, 
                    <span className="font-mono text-primary font-bold"> Dr 8950</span>, 
                    <span className="font-mono text-primary font-bold"> Cr 3330</span>, 
                    <span className="font-mono text-primary font-bold"> Cr 3320</span>.
                  </p>
               </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}