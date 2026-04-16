import React, { useState, useEffect, useCallback } from 'react';
import { 
  Package, 
  AlertTriangle, 
  Plus, 
  Search, 
  ArrowDownCircle, 
  ArrowUpCircle, 
  RefreshCw,
  History,
  Settings2,
  Filter,
  TrendingDown,
  TrendingUp,
  DollarSign,
  Layers,
  FileText
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

const TRANSACTION_TYPES = [
  'PURCHASE_IN', 'SALE_OUT', 'RETURN_IN', 'RETURN_OUT',
  'ADJUSTMENT_IN', 'ADJUSTMENT_OUT', 'WRITE_OFF', 'OPENING'
];

const TYPE_STYLES: Record<string, { color: string; label: string }> = {
  PURCHASE_IN:    { color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20', label: 'შესყიდვა' },
  SALE_OUT:       { color: 'text-rose-500 bg-rose-500/10 border-rose-500/20', label: 'გაყიდვა' },
  RETURN_IN:      { color: 'text-blue-500 bg-blue-500/10 border-blue-500/20', label: 'დაბრუნება (In)' },
  RETURN_OUT:     { color: 'text-orange-500 bg-orange-500/10 border-orange-500/20', label: 'დაბრუნება (Out)' },
  ADJUSTMENT_IN:  { color: 'text-teal-500 bg-teal-500/10 border-teal-500/20', label: 'კორექტირება (+)' },
  ADJUSTMENT_OUT: { color: 'text-amber-500 bg-amber-500/10 border-amber-500/20', label: 'კორექტირება (-)' },
  WRITE_OFF:      { color: 'text-red-500 bg-red-500/10 border-red-500/20', label: 'ჩამოწერა' },
  OPENING:        { color: 'text-slate-500 bg-slate-500/10 border-slate-500/20', label: 'საწყისი ნაშთი' },
};

export default function Inventory() {
  const [activeTab, setActiveTab] = useState<'levels' | 'transactions' | 'adjust'>('levels');
  const [levels, setLevels] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null);

  // Adjustment form
  const [adjForm, setAdjForm] = useState({
    product_id: '', 
    quantity: '', 
    type: 'ADJUSTMENT_IN', 
    unit_cost: '', 
    notes: ''
  });

  const getToken = async () => (await supabase.auth.getSession()).data.session?.access_token || '';

  // Safe fetch: never crashes on HTML error responses (e.g. Vercel 404)
  const safeFetch = async (url: string, options?: RequestInit) => {
    const res = await fetch(url, options);
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      throw new Error(`Endpoint ${url} returned non-JSON (${res.status}). Check server.`);
    }
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `Request failed: ${res.status}`);
    return data;
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getToken();
      
      if (activeTab === 'levels') {
        const json = await safeFetch('/api/accounting/inventory/levels', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setLevels(json.levels || []);
      } else if (activeTab === 'transactions') {
        const json = await safeFetch('/api/accounting/inventory/transactions?limit=100', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setTransactions(json.transactions || []);
      } else {
        const { data } = await supabase.from('products').select('id, name').order('name');
        setProducts(data || []);
      }
    } catch (err) {
      console.error('Inventory fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const showToast = (msg: string, type: 'ok' | 'err') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjForm.product_id || !adjForm.quantity) return;

    try {
      const token = await getToken();
      await safeFetch('/api/accounting/inventory/adjustment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          ...adjForm,
          quantity: Number(adjForm.quantity),
          unit_cost: adjForm.unit_cost ? Number(adjForm.unit_cost) : null
        }),
      });
      showToast('კორექტირება წარმატებით განხორციელდა', 'ok');
      setAdjForm({ product_id: '', quantity: '', type: 'ADJUSTMENT_IN', unit_cost: '', notes: '' });
      setActiveTab('levels');
    } catch (err: any) {
      showToast(err.message || 'შეცდომა კორექტირებისას', 'err');
    }
  };

  const filteredLevels = levels.filter(l =>
    l.products?.name?.toLowerCase().includes(search.toLowerCase()) ||
    l.products?.sku?.toLowerCase().includes(search.toLowerCase())
  );

  const totalValue = levels.reduce((s, l) => s + Number(l.total_cost_value || 0), 0);
  const lowStockItems = levels.filter(l => Number(l.quantity_available) <= Number(l.reorder_point));

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
            {toast.type === 'ok' ? <RefreshCw className="h-5 w-5 animate-spin" /> : <AlertTriangle className="h-5 w-5" />}
            <span className="font-medium">{toast.msg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header & Stats */}
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Package className="h-6 w-6 text-primary" /> სასაქონლო მარაგი
          </h2>
          <p className="text-sm text-muted-foreground">მარაგების მართვა, FIFO აღრიცხვა და კორექტირება</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setActiveTab('adjust')}
            className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 hover:opacity-90 transition-all active:scale-95"
          >
            <Plus className="h-4 w-4" /> კორექტირება
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard 
          icon={Layers} 
          title="სულ პოზიცია" 
          value={levels.length} 
          subValue="აქტიური SKU" 
          color="from-sky-500 to-blue-600" 
        />
        <KpiCard 
          icon={DollarSign} 
          title="მარაგის ღირებულება" 
          value={`₾ ${totalValue.toLocaleString()}`} 
          subValue="FIFO შეფასება" 
          color="from-emerald-500 to-teal-600" 
        />
        <KpiCard 
          icon={AlertTriangle} 
          title="დაბალი მარაგი" 
          value={lowStockItems.length} 
          subValue="საჭიროებს შევსებას" 
          color={lowStockItems.length > 0 ? "from-red-500 to-rose-600" : "from-slate-500 to-slate-600"} 
        />
        <KpiCard 
          icon={History} 
          title="ბოლო ტრანზაქციები" 
          value={transactions.length > 0 ? transactions.length : "0"} 
          subValue="უკანასკნელი 30 დღე" 
          color="from-violet-500 to-purple-600" 
        />
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1 rounded-2xl border border-border/50 bg-card p-1 w-fit">
        {[
          { id: 'levels', label: 'ნაშთები', icon: Layers },
          { id: 'transactions', label: 'მოძრაობა', icon: History },
          { id: 'adjust', label: 'კორექტირება', icon: Settings2 },
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

      {/* Content Area */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="space-y-4"
      >
        {activeTab === 'levels' && (
          <Card className="p-0 overflow-hidden border-border/40">
            <div className="p-6 border-b border-border/50 bg-muted/20 flex flex-col sm:flex-row gap-4 items-center justify-between">
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input 
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="ძებნა დასახელებით ან SKU..."
                  className="w-full pl-10 pr-4 py-2 bg-background border border-border/50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>
              <div className="flex items-center gap-2">
                <button className="p-2 rounded-lg border border-border/50 hover:bg-muted transition-colors">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                </button>
                <button onClick={fetchData} className="p-2 rounded-lg border border-border/50 hover:bg-muted transition-colors">
                  <RefreshCw className={cn("h-4 w-4 text-muted-foreground", loading && "animate-spin")} />
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/30 bg-muted/10 text-muted-foreground">
                    <th className="px-6 py-4 text-left font-semibold">პროდუქტი</th>
                    <th className="px-6 py-4 text-right font-semibold">ნაშთი</th>
                    <th className="px-6 py-4 text-right font-semibold">რეზერვი</th>
                    <th className="px-6 py-4 text-right font-semibold">ხელმისაწ.</th>
                    <th className="px-6 py-4 text-right font-semibold">სშ. ღირებულება</th>
                    <th className="px-6 py-4 text-right font-semibold">ჯამური ღირ.</th>
                    <th className="px-6 py-4 text-center font-semibold">სტატუსი</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {loading ? (
                    Array(5).fill(0).map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td colSpan={7} className="px-6 py-4"><div className="h-10 bg-muted rounded-lg" /></td>
                      </tr>
                    ))
                  ) : filteredLevels.length === 0 ? (
                    <tr><td colSpan={7} className="px-6 py-20 text-center text-muted-foreground">მონაცემები არ მოიძებნა</td></tr>
                  ) : (
                    filteredLevels.map((l) => {
                      const isLow = Number(l.quantity_available) <= Number(l.reorder_point);
                      return (
                        <tr key={l.id} className={cn("group hover:bg-muted/30 transition-colors", isLow && "bg-rose-500/5")}>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="h-12 w-12 rounded-lg border border-border/50 bg-muted overflow-hidden shrink-0">
                                <img 
                                  src={l.products?.images?.[0] || "https://via.placeholder.com/48"} 
                                  alt="" 
                                  className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-500" 
                                />
                              </div>
                              <div className="flex flex-col">
                                <span className="font-semibold text-foreground">{l.products?.name}</span>
                                <span className="text-xs text-muted-foreground font-mono uppercase">{l.products?.sku || "No SKU"}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right font-medium text-muted-foreground">{Number(l.quantity_on_hand).toLocaleString()}</td>
                          <td className="px-6 py-4 text-right font-medium text-amber-500">{Number(l.quantity_reserved).toLocaleString()}</td>
                          <td className="px-6 py-4 text-right font-bold">
                            <span className={isLow ? "text-rose-500" : "text-emerald-500"}>
                              {Number(l.quantity_available).toLocaleString()}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right text-muted-foreground font-mono text-xs">₾ {Number(l.avg_cost).toLocaleString()}</td>
                          <td className="px-6 py-4 text-right font-bold text-foreground font-mono">₾ {Number(l.total_cost_value).toLocaleString()}</td>
                          <td className="px-6 py-4 text-center">
                            {isLow ? (
                              <div className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/10 px-2.5 py-1 text-xs font-bold text-rose-500 border border-rose-500/20">
                                <TrendingDown className="h-3 w-3" /> დაბალი
                              </div>
                            ) : (
                              <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-bold text-emerald-500 border border-emerald-500/20">
                                <TrendingUp className="h-3 w-3" /> ნორმა
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {activeTab === 'transactions' && (
          <div className="space-y-3">
            {transactions.map((t, idx) => {
              const isIn = t.transaction_type.includes('IN') || t.transaction_type === 'OPENING';
              return (
                <Card key={t.id} className={cn("p-4 hover:bg-muted/20 transition-all border-l-4 group", isIn ? "border-l-emerald-500" : "border-l-rose-500")}>
                  <div className="flex items-center gap-4">
                    <div className={cn("p-3 rounded-2xl group-hover:scale-110 transition-transform duration-300", isIn ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500")}>
                      {isIn ? <ArrowDownCircle className="h-6 w-6" /> : <ArrowUpCircle className="h-6 w-6" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-foreground">{t.products?.name}</span>
                        <div className={cn("rounded-full px-2.5 py-0.5 text-[10px] font-bold border uppercase tracking-wider", TYPE_STYLES[t.transaction_type]?.color)}>
                          {TYPE_STYLES[t.transaction_type]?.label}
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5 mt-0.5 line-clamp-1 italic">{t.notes || "შენიშვნის გარეშე"}</p>
                    </div>
                    <div className="text-right flex flex-col items-end gap-1">
                      <div className={cn("text-lg font-black tracking-tighter", isIn ? "text-emerald-500" : "text-rose-500")}>
                        {isIn ? '+' : '-'}{Number(t.quantity).toLocaleString()}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground uppercase">
                         <span className="flex items-center gap-1"><DollarSign className="h-3 w-3" /> {Number(t.total_cost || 0).toLocaleString()}</span>
                         <span>•</span>
                         <span>{new Date(t.created_at).toLocaleString('ka-GE')}</span>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {activeTab === 'adjust' && (
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <Settings2 className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-bold text-foreground">მარაგის კორექტირება</h3>
              </div>

              <form onSubmit={handleAdjust} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">პროდუქტი *</label>
                  <select 
                    value={adjForm.product_id}
                    onChange={e => setAdjForm({ ...adjForm, product_id: e.target.value })}
                    required
                    className="w-full bg-background border border-border/50 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  >
                    <option value="">აირჩიეთ პროდუქტი</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">ტიპი *</label>
                    <select 
                      value={adjForm.type}
                      onChange={e => setAdjForm({ ...adjForm, type: e.target.value })}
                      className="w-full bg-background border border-border/50 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                    >
                      {TRANSACTION_TYPES.map(t => <option key={t} value={t}>{TYPE_STYLES[t]?.label || t}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">რაოდენობა *</label>
                    <input 
                      type="number"
                      step="0.01"
                      value={adjForm.quantity}
                      onChange={e => setAdjForm({ ...adjForm, quantity: e.target.value })}
                      placeholder="0.00"
                      required
                      className="w-full bg-background border border-border/50 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">ერთეულის ღირებულება (ლარი)</label>
                  <input 
                    type="number"
                    step="0.01"
                    value={adjForm.unit_cost}
                    onChange={e => setAdjForm({ ...adjForm, unit_cost: e.target.value })}
                    placeholder="0.00"
                    className="w-full bg-background border border-border/50 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all font-mono"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">შენიშვნა</label>
                  <textarea 
                    value={adjForm.notes}
                    onChange={e => setAdjForm({ ...adjForm, notes: e.target.value })}
                    placeholder="რატომ ხორციელდება კორექტირება?"
                    rows={3}
                    className="w-full bg-background border border-border/50 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all resize-none"
                  />
                </div>

                <button 
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-bold shadow-lg shadow-primary/20 hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  {loading ? <RefreshCw className="h-5 w-5 animate-spin" /> : <Plus className="h-5 w-5" />}
                  კორექტირების შენახვა
                </button>
              </form>
            </Card>

            <div className="space-y-4">
               <Card className="bg-amber-500/5 border-amber-500/20">
                  <div className="flex gap-4">
                    <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                      <AlertTriangle className="h-5 w-5" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-bold text-amber-500">მნიშვნელოვანი შენიშვნა</h4>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        მარაგის კორექტირება პირდაპირ მოქმედებს თქვენს ფინანსურ ბალანსზე და FIFO რიგებზე. 
                        გამოიყენეთ მხოლოდ ინვენტარიზაციის, დაზიანებული საქონლის ჩამოწერის ან შეცდომის გასწორების შემთხვევაში.
                      </p>
                    </div>
                  </div>
               </Card>

               <Card className="space-y-4">
                  <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" /> ბოლო კორექტირებები
                  </h4>
                  <div className="space-y-3">
                    {transactions
                      .filter(t => t.transaction_type.includes('ADJUSTMENT') || t.transaction_type === 'WRITE_OFF')
                      .slice(0, 5)
                      .map(t => (
                        <div key={t.id} className="flex items-center justify-between text-sm py-2 border-b border-border/30 last:border-0">
                          <div className="flex flex-col">
                            <span className="font-medium text-foreground">{t.products?.name}</span>
                            <span className="text-[10px] text-muted-foreground italic truncate max-w-[150px]">{t.notes}</span>
                          </div>
                          <div className="text-right">
                             <div className={cn("font-bold font-mono", t.transaction_type === 'ADJUSTMENT_IN' ? "text-emerald-500" : "text-rose-500")}>
                               {t.transaction_type === 'ADJUSTMENT_IN' ? '+' : '-'}{t.quantity}
                             </div>
                             <div className="text-[10px] text-muted-foreground">{new Date(t.created_at).toLocaleDateString('ka-GE')}</div>
                          </div>
                        </div>
                      ))
                    }
                    {transactions.filter(t => t.transaction_type.includes('ADJUSTMENT')).length === 0 && (
                      <p className="text-xs text-muted-foreground py-4 text-center italic">კორექტირებები არ მოიძებნა</p>
                    )}
                  </div>
               </Card>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}