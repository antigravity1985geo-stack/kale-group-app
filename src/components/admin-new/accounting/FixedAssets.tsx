import React, { useState, useEffect, useCallback } from 'react';
import { 
  Plus, 
  Search, 
  Play, 
  CheckCircle2, 
  AlertCircle, 
  TrendingDown, 
  DollarSign, 
  Calculator,
  Calendar,
  Layers,
  Archive,
  MoreVertical,
  X,
  Clock,
  ArrowDownToLine,
  RefreshCw,
  Zap,
  ClipboardList
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../../lib/utils';
import { supabase } from '../../../lib/supabase';
import { safeFetch } from '../../../utils/safeFetch';

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

interface FixedAsset {
  id: string;
  code: string;
  name: string;
  category: string;
  purchase_date: string;
  purchase_price: number;
  lifespan_months: number;
  accumulated_depreciation: number;
  status: 'ACTIVE' | 'DISPOSED';
}

export default function FixedAssets() {
  const [assets, setAssets] = useState<FixedAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [depreciating, setDepreciating] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null);

  const [form, setForm] = useState({
    code: '',
    name: '',
    category: 'IT Equipment',
    purchase_date: new Date().toISOString().split('T')[0],
    purchase_price: '',
    lifespan_months: '36',
  });

  const fetchAssets = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('fixed_assets').select('*').order('created_at', { ascending: false });
      if (data) setAssets(data);
    } catch (err) {
      console.error('Fetch assets error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  const showMsg = (msg: string, type: 'ok' | 'err') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.purchase_price) return;
    
    try {
      await safeFetch('/api/fixed-assets', {
        method: 'POST',
        body: JSON.stringify({
          code: form.code || undefined,
          name: form.name,
          category: form.category,
          purchase_date: form.purchase_date,
          purchase_price: Number(form.purchase_price),
          lifespan_months: Number(form.lifespan_months),
        }),
      });

      showMsg('ძირითადი საშუალება წარმატებით დაემატა', 'ok');
      setShowForm(false);
      setForm({
        code: '', name: '', category: 'IT Equipment',
        purchase_date: new Date().toISOString().split('T')[0],
        purchase_price: '', lifespan_months: '36'
      });
      fetchAssets();
    } catch (err: any) {
      showMsg(err.message, 'err');
    }
  };

  const runDepreciation = async () => {
    setDepreciating(true);
    try {
      const result = await safeFetch<{ assets_depreciated: number; total_depreciation: number }>(
        '/api/fixed-assets/depreciation',
        { method: 'POST' }
      );
      showMsg(
        `ცვეთის დარიცხვა დასრულდა — ${result.assets_depreciated} აქტივი, ${result.total_depreciation.toFixed(2)} ₾`,
        'ok'
      );
      fetchAssets();
    } catch(e: any) {
      showMsg(e.message, 'err');
    } finally {
      setDepreciating(false);
    }
  };

  const filteredAssets = assets.filter(a => 
    a.name.toLowerCase().includes(search.toLowerCase()) || 
    a.category.toLowerCase().includes(search.toLowerCase()) ||
    a.code.toLowerCase().includes(search.toLowerCase())
  );

  const totalValue = assets.reduce((s, a) => s + Number(a.purchase_price), 0);
  const totalAccumulated = assets.reduce((s, a) => s + Number(a.accumulated_depreciation), 0);
  const netValue = totalValue - totalAccumulated;

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
            <TrendingDown className="h-6 w-6 text-primary" /> ძირითადი საშუალებები
          </h2>
          <p className="text-sm text-muted-foreground">Fixed Assets & Depreciation Management (ცვეთა)</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={runDepreciation}
            disabled={depreciating || loading}
            className="flex items-center gap-2 rounded-xl border border-border/50 bg-background px-4 py-2.5 text-sm font-semibold hover:bg-muted transition-all active:scale-95 disabled:opacity-50"
          >
            {depreciating ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4 text-amber-500" />}
            ცვეთის დარიცხვა
          </button>
          <button 
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 hover:opacity-90 transition-all active:scale-95"
          >
            {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            დამატება
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard 
          icon={Layers} 
          title="სულ აქტივები" 
          value={assets.length} 
          subValue={`${assets.filter(a => a.status === 'ACTIVE').length} აქტიური`} 
          color="from-blue-500 to-blue-600" 
        />
        <KpiCard 
          icon={DollarSign} 
          title="საწყისი ღირებულება" 
          value={`₾ ${totalValue.toLocaleString()}`} 
          subValue="Purchase Price (Cost)" 
          color="from-teal-500 to-emerald-600" 
        />
        <KpiCard 
          icon={TrendingDown} 
          title="დარიცხული ცვეთა" 
          value={`₾ ${totalAccumulated.toLocaleString()}`} 
          subValue="Accumulated Depr." 
          color="from-rose-500 to-rose-600" 
        />
        <KpiCard 
          icon={Calculator} 
          title="ნარჩენი ღირებულება" 
          value={`₾ ${netValue.toLocaleString()}`} 
          subValue="Net Book Value" 
          color="from-amber-500 to-orange-500" 
        />
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <Card className="bg-primary/[0.02] border-primary/20">
               <div className="flex items-center justify-between mb-6">
                 <div>
                    <h3 className="text-lg font-bold text-foreground">ახალი აქტივის დამატება</h3>
                    <p className="text-xs text-muted-foreground italic">ძირითადი საშუალების რეგისტრაცია ბუღალტერიაში</p>
                 </div>
                 <button onClick={() => setShowForm(false)} className="p-2 hover:bg-muted rounded-xl transition-colors">
                   <X className="h-4 w-4" />
                 </button>
               </div>

               <form onSubmit={handleAdd} className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 block">აქტივის კოდი</label>
                    <input 
                      value={form.code}
                      onChange={e => setForm({...form, code: e.target.value})}
                      placeholder="მაგ: IT-001"
                      className="w-full bg-background border border-border/50 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 block">დასახელება *</label>
                    <input 
                      value={form.name}
                      onChange={e => setForm({...form, name: e.target.value})}
                      required
                      placeholder="მაგ: MacBook Pro 16"
                      className="w-full bg-background border border-border/50 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none font-bold"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 block">კატეგორია</label>
                    <select 
                      value={form.category}
                      onChange={e => setForm({...form, category: e.target.value})}
                      className="w-full bg-background border border-border/50 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none cursor-pointer"
                    >
                      <option value="IT Equipment">IT აღჭურვილობა (3 წელი)</option>
                      <option value="Vehicles">ავტო-ტრანსპორტი (5 წელი)</option>
                      <option value="Furniture">ავეჯი და ინვენტარი (5 წელი)</option>
                      <option value="Buildings">შენობა-ნაგებობები (20 წელი)</option>
                      <option value="Manufacturing">მანქანა-დანადგარები (10 წელი)</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 block">შეძენის თარიღი</label>
                    <input 
                      type="date"
                      value={form.purchase_date}
                    onChange={e => setForm({...form, purchase_date: e.target.value})}
                      className="w-full bg-background border border-border/50 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 block">ღირებულება (GEL) *</label>
                    <input 
                      type="number"
                      step="0.01"
                      value={form.purchase_price}
                      onChange={e => setForm({...form, purchase_price: e.target.value})}
                      required
                      placeholder="0.00"
                      className="w-full bg-background border border-border/50 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none font-mono font-bold"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 block">ცვეთის ვადა (თვეებში)</label>
                    <input 
                      type="number"
                      value={form.lifespan_months}
                      onChange={e => setForm({...form, lifespan_months: e.target.value})}
                      className="w-full bg-background border border-border/50 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                    />
                  </div>
                  <div className="sm:col-span-2 lg:col-span-3 flex justify-end">
                    <button type="submit" className="px-8 py-2.5 bg-primary text-primary-foreground rounded-xl font-black text-sm shadow-lg shadow-primary/20 hover:opacity-90 active:scale-95 transition-all">
                       აქტივის დამატება
                    </button>
                  </div>
               </form>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <Card className="p-0 overflow-hidden border-border/40">
        <div className="p-6 border-b border-border/50 bg-muted/20 flex flex-col sm:flex-row gap-4 items-center justify-between">
            <h3 className="text-lg font-bold text-foreground italic flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-primary" /> აქტივების რეესტრი
            </h3>
            <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input 
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="ძებნა დასახელებით, კოდით..."
                  className="w-full pl-10 pr-4 py-2.5 bg-background border border-border/50 rounded-xl text-sm focus:outline-none"
                />
            </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/30 bg-muted/10 text-muted-foreground">
                <th className="px-6 py-4 text-left font-bold uppercase text-[10px] tracking-widest">დასახელება & კოდი</th>
                <th className="px-6 py-4 text-left font-bold uppercase text-[10px] tracking-widest">შეძენა & ვადა</th>
                <th className="px-6 py-4 text-right font-bold uppercase text-[10px] tracking-widest">ღირებულება</th>
                <th className="px-6 py-4 text-center font-bold uppercase text-[10px] tracking-widest">ცვეთის პროგრესი</th>
                <th className="px-6 py-4 text-right font-bold uppercase text-[10px] tracking-widest">ნარჩენი ღირ.</th>
                <th className="px-6 py-4 text-center font-bold uppercase text-[10px] tracking-widest">სტატუსი</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/20">
              {loading ? (
                Array(5).fill(0).map((_, i) => (
                  <tr key={i} className="animate-pulse"><td colSpan={6} className="px-6 py-8"><div className="h-10 bg-muted rounded-xl" /></td></tr>
                ))
              ) : filteredAssets.length === 0 ? (
                <tr><td colSpan={6} className="py-20 text-center text-muted-foreground italic">აქტივები ვერ მოიძებნა</td></tr>
              ) : (
                filteredAssets.map((asset) => {
                  const remaining = asset.purchase_price - asset.accumulated_depreciation;
                  const progress = (asset.accumulated_depreciation / asset.purchase_price) * 100;
                  const isFullyDepreciated = remaining <= 0.01;

                  return (
                    <tr key={asset.id} className="group hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                           <span className="font-bold text-foreground group-hover:text-primary transition-colors text-base">{asset.name}</span>
                           <span className="text-[10px] font-black text-muted-foreground font-mono uppercase tracking-widest">{asset.code} • {asset.category}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                          <Calendar className="h-3 w-3" /> {new Date(asset.purchase_date).toLocaleDateString()}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] font-bold text-foreground italic">
                          <Clock className="h-3 w-3" /> {asset.lifespan_months} თვე
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                         <div className="font-black text-foreground font-mono text-base">₾ {Number(asset.purchase_price).toLocaleString()}</div>
                         <div className="text-[10px] text-rose-500 font-bold flex items-center justify-end gap-1">
                           <TrendingDown className="h-3 w-3" /> -₾ {Number(asset.accumulated_depreciation).toLocaleString()}
                         </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="max-w-[120px] mx-auto space-y-1.5">
                           <div className="flex justify-between text-[10px] font-black font-mono">
                              <span className="text-muted-foreground">{Math.round(progress)}%</span>
                              <span className="text-primary italic">DEPR.</span>
                           </div>
                           <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden border border-border/30">
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${progress}%` }}
                                className={cn(
                                  "h-full rounded-full transition-all",
                                  isFullyDepreciated ? "bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]" : "bg-primary shadow-[0_0_10px_rgba(var(--primary),0.5)]"
                                )}
                              />
                           </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                         <div className={cn(
                           "font-black font-mono text-base",
                           isFullyDepreciated ? "text-muted-foreground/50 line-through" : "text-emerald-500 drop-shadow-sm"
                         )}>
                           ₾ {remaining.toLocaleString()}
                         </div>
                         {isFullyDepreciated && <span className="text-[9px] font-black text-amber-500 uppercase tracking-tighter bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">ჩამოწერილი</span>}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={cn(
                          "inline-flex px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border",
                          asset.status === 'ACTIVE' 
                            ? (isFullyDepreciated ? "bg-amber-500/10 text-amber-500 border-amber-500/20" : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20")
                            : "bg-rose-500/10 text-rose-500 border-rose-500/20 shadow-lg shadow-rose-500/10"
                        )}>
                          {asset.status === 'ACTIVE' ? (isFullyDepreciated ? 'DEPLETION' : 'ACTIVE') : 'DISPOSED'}
                        </span>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}