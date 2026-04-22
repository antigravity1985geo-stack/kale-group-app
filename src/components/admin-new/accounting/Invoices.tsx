import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, FileText, CheckCircle, Clock, XCircle, 
  Send, RefreshCcw, UploadCloud, ChevronDown, 
  ChevronUp, Filter, Download, Info, BookOpen
} from 'lucide-react';
import { supabase } from '@/src/lib/supabase';
import { autoCreateAndSendEInvoice, syncInvoiceStatus } from '@/src/services/rsge/rsge.service';
import { cn } from '@/src/lib/utils';
import { convertToGel } from '@/src/utils/currency';

const GEL = (v: number | string) => 
  new Intl.NumberFormat('ka-GE', { style: 'currency', currency: 'GEL' }).format(Number(v));

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

export default function Invoices() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || '';
      
      const params = new URLSearchParams({ limit: '50' });
      if (typeFilter) params.set('type', typeFilter);
      if (statusFilter) params.set('status', statusFilter);
      
      const res = await fetch(`/api/accounting/invoices?${params}`, { 
        headers: { Authorization: `Bearer ${token}` } 
      });
      const json = await res.json();
      setInvoices(json.invoices || []);
    } catch (error) {
      console.error('Error fetching invoices:', error);
    } finally {
      setLoading(false);
    }
  }, [typeFilter, statusFilter]);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

  const handleSendToRsge = async (e: React.MouseEvent, inv: any) => {
    e.stopPropagation();
    if (!inv.customer_tin && !window.confirm(`ეს ინვოისი ფიზიკურ პირზეა (TIN-ის გარეშე). ნამდვილად გსურთ RS.ge-ზე გაგზავნა 00000000000 კოდით?`)) return;
    
    setActionLoadingId(inv.id);
    const res = await autoCreateAndSendEInvoice(inv.order_id, inv.id);
    setActionLoadingId(null);
    if (!res.success) alert(res.message);
    else fetchInvoices();
  };

  const handleSyncRsge = async (e: React.MouseEvent, inv: any) => {
    e.stopPropagation();
    setActionLoadingId(inv.id);
    const res = await syncInvoiceStatus(inv.id);
    setActionLoadingId(null);
    if (!res.success) alert(res.message);
    else fetchInvoices();
  };

  const handlePostToJournal = async (e: React.MouseEvent, inv: any) => {
    e.stopPropagation();
    if (!window.confirm(`ნამდვილად გსურთ ინვოისის გატარება ბუღალტრულ ჟურნალში?`)) return;
    
    setActionLoadingId(inv.id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || '';
      
      const res = await fetch(`/api/accounting/invoices/${inv.id}/post`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const json = await res.json();
      
      if (json.success) {
        fetchInvoices();
      } else {
        alert(json.error || 'გატარება ვერ მოხერხდა');
      }
    } catch (err) {
      console.error('Post error:', err);
      alert('დაფიქსირდა შეცდომა');
    } finally {
      setActionLoadingId(null);
    }
  };

  const filtered = invoices.filter(inv =>
    inv.invoice_number?.toLowerCase().includes(search.toLowerCase()) ||
    inv.customer_name?.toLowerCase().includes(search.toLowerCase())
  );

  const totalPaid = filtered.filter(i => i.payment_status === 'PAID').reduce((s, i) => s + Number(i.total_amount), 0);
  const totalPending = filtered.filter(i => i.payment_status === 'PENDING').reduce((s, i) => s + Number(i.total_amount), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" /> ინვოისები
          </h2>
          <p className="text-sm text-muted-foreground">გაყიდვების ინვოისების მართვა და RS.ge სინქრონიზაცია</p>
        </div>
        <button 
          onClick={() => setIsCreateModalOpen(true)}
          className="px-4 py-2 bg-amber-500 text-black font-bold rounded-xl hover:bg-amber-400 transition-colors shadow-lg shadow-amber-500/20"
        >
          + ახალი ინვოისი
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard 
          icon={FileText} 
          title="სულ ინვოისი" 
          value={filtered.length} 
          subValue="ამ პერიოდში" 
          color="from-sky-500 to-blue-600" 
        />
        <KpiCard 
          icon={CheckCircle} 
          title="გადახდილი" 
          value={GEL(totalPaid)} 
          subValue="მიღებული თანხა" 
          color="from-emerald-500 to-teal-600" 
        />
        <KpiCard 
          icon={Clock} 
          title="მოლოდინში" 
          value={GEL(totalPending)} 
          subValue="მისაღებია" 
          color="from-amber-400 to-orange-500" 
        />
        <KpiCard 
          icon={BookOpen} 
          title="გატარებული" 
          value={filtered.filter(i => i.journal_entry_id).length} 
          subValue="ბუღალტრულ ჟურნალში" 
          color="from-violet-500 to-purple-600" 
        />
      </div>

      {/* Filters Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-card/30 backdrop-blur-md border border-border/50 p-4 rounded-2xl">
        <div className="relative md:col-span-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <input 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
            placeholder="ძებნა ნომრით ან კლიენტით..."
            className="w-full pl-10 pr-4 py-2 bg-background/50 border-border/50 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500/50 outline-none transition-all"
          />
        </div>
        
        <div className="flex gap-2">
          {['', 'B2C', 'B2B'].map(t => (
            <button 
              key={t} 
              onClick={() => setTypeFilter(t)}
              className={cn(
                "flex-1 px-3 py-2 rounded-xl text-xs font-medium border transition-all",
                typeFilter === t 
                  ? "bg-amber-500 text-black border-amber-500 shadow-lg shadow-amber-500/20" 
                  : "bg-background/40 border-border/50 text-muted-foreground hover:bg-background/60"
              )}
            >
              {t || 'ყველა'}
            </button>
          ))}
        </div>

        <select 
          value={statusFilter} 
          onChange={e => setStatusFilter(e.target.value)}
          className="bg-background/40 border-border/50 text-muted-foreground rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-amber-500/20 transition-all cursor-pointer"
        >
          <option value="">ყველა სტატუსი</option>
          <option value="PAID">გადახდილი</option>
          <option value="PENDING">მოლოდინი</option>
          <option value="OVERDUE">ვადაგადაცილებული</option>
        </select>
      </div>

      {/* Main Table/List */}
      <div className="bg-card/30 backdrop-blur-md border border-border/50 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center space-y-4">
            <div className="w-10 h-10 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-muted-foreground animate-pulse text-sm">მონაცემები იტვირთება...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-20 text-center space-y-4">
            <div className="inline-flex p-4 rounded-full bg-muted/50 text-muted-foreground">
              <FileText size={32} />
            </div>
            <p className="text-muted-foreground">ინვოისები არ მოიძებნა</p>
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {filtered.map(inv => (
              <InvoiceRow 
                key={inv.id} 
                inv={inv} 
                isExpanded={expandedId === inv.id}
                onToggle={() => setExpandedId(expandedId === inv.id ? null : inv.id)}
                onSync={handleSyncRsge}
                onSend={handleSendToRsge}
                onPost={handlePostToJournal}
                isActionLoading={actionLoadingId === inv.id}
              />
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {isCreateModalOpen && (
          <CreateInvoiceModal 
            onClose={() => setIsCreateModalOpen(false)} 
            onSuccess={() => { setIsCreateModalOpen(false); fetchInvoices(); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

const STATUS_CFG: Record<string, { label: string; color: string; icon: any }> = {
  PENDING:   { label: 'მოლოდინი',  color: 'text-amber-400 bg-amber-400/10 border-amber-400/20', icon: Clock },
  PAID:      { label: 'გადახდილი', color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20', icon: CheckCircle },
  PARTIAL:   { label: 'ნაწილობრივი', color: 'text-blue-400 bg-blue-400/10 border-blue-400/20', icon: Clock },
  OVERDUE:   { label: 'ვადაგადაცილებული', color: 'text-rose-400 bg-rose-400/10 border-rose-400/20', icon: XCircle },
  CANCELLED: { label: 'გაუქმებული', color: 'text-slate-400 bg-slate-400/10 border-slate-400/20', icon: XCircle },
  REFUNDED:  { label: 'დაბრუნებული', color: 'text-purple-400 bg-purple-400/10 border-purple-400/20', icon: RefreshCcw },
};

function InvoiceRow({ inv, isExpanded, onToggle, onSync, onSend, onPost, isActionLoading }: any) {
  const cfg = STATUS_CFG[inv.payment_status] || STATUS_CFG.PENDING;
  const StatusIcon = cfg.icon;

  return (
    <div className={cn(
      "group transition-all duration-300",
      isExpanded ? "bg-amber-500/5" : "hover:bg-white/5"
    )}>
      <div 
        onClick={onToggle}
        className="flex items-center justify-between p-4 cursor-pointer"
      >
        <div className="flex items-center gap-6 flex-1 min-w-0">
          <div className="shrink-0 w-10 h-10 rounded-xl bg-background/50 flex items-center justify-center border border-border/50 text-amber-500 group-hover:scale-110 transition-transform">
            <FileText size={20} />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-3 mb-1">
              <span className="font-mono text-amber-500 font-bold tracking-tight">{inv.invoice_number}</span>
              <span className={cn(
                "text-[10px] px-2 py-0.5 rounded-full border border-border/50 uppercase font-medium",
                inv.invoice_type === 'B2B' ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20" : "bg-background/50 text-muted-foreground"
              )}>
                {inv.invoice_type}
              </span>
              {inv.journal_entry_id && (
                <span className="flex items-center gap-1 text-[9px] px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full font-bold uppercase tracking-tighter">
                  <CheckCircle size={8} /> ჟურნალშია
                </span>
              )}
            </div>
            <p className="text-sm text-foreground truncate font-medium">{inv.customer_name}</p>
          </div>

          <div className="hidden lg:flex items-center gap-2">
            <span className={cn("inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium border shadow-sm", cfg.color)}>
              <StatusIcon size={12} /> {cfg.label}
            </span>
            {inv.rsge_status && (
              <span className={cn(
                "px-3 py-1 rounded-full border text-[11px] font-medium",
                inv.rsge_status === 'CONFIRMED' 
                  ? "text-blue-400 bg-blue-400/10 border-blue-400/20" 
                  : "text-muted-foreground bg-muted/20 border-border/50"
              )}>
                RS: {inv.rsge_status}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-6 ml-4 shrink-0">
          <div className="flex items-center gap-2">
            {isActionLoading ? (
              <div className="w-8 h-8 rounded-xl border-2 border-amber-500 border-t-transparent animate-spin" />
            ) : (
              <>
                {!inv.journal_entry_id && (
                  <button
                    onClick={(e) => onPost(e, inv)}
                    className="p-2 text-amber-400 hover:bg-amber-400/10 rounded-xl transition-all group/btn"
                    title="გატარება ჟურნალში"
                  >
                    <BookOpen size={18} className="group-hover/btn:scale-110 transition-transform" />
                  </button>
                )}
                
                {inv.rsge_invoice_id ? (
                  <button
                    onClick={(e) => onSync(e, inv)}
                    className="p-2 text-blue-400 hover:bg-blue-400/10 rounded-xl transition-all"
                    title="სტატუსის განახლება"
                  >
                    <RefreshCcw size={18} />
                  </button>
                ) : (
                  <button
                    onClick={(e) => onSend(e, inv)}
                    className="p-2 text-emerald-400 hover:bg-emerald-400/10 rounded-xl transition-all"
                    title="გაგზავნა RS.ge-ზე"
                  >
                    <UploadCloud size={18} />
                  </button>
                )}
              </>
            )}
          </div>

          <div className="text-right min-w-[100px]">
            <p className="text-base font-bold text-white tracking-tight">{GEL(inv.total_amount)}</p>
            <p className="text-[10px] text-muted-foreground font-mono">{inv.invoice_date}</p>
          </div>

          <div className="w-6 h-6 rounded-full hover:bg-white/5 flex items-center justify-center transition-colors">
            {isExpanded ? <ChevronUp className="text-muted-foreground" size={16} /> : <ChevronDown className="text-muted-foreground" size={16} />}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden bg-background/20"
          >
            <div className="p-6 border-t border-border/50">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
                <DetailItem label="ტელეფონი" value={inv.customer_phone} />
                <DetailItem label="იმეილი" value={inv.customer_email} />
                <DetailItem label="საკონტაქტო პირი" value={inv.customer_contact_name} />
                <DetailItem label="სს/კოდი" value={inv.customer_tin} />
                <DetailItem label="მისამართი" value={inv.customer_address} />
                <DetailItem label="გადახდის მეთოდი" value={inv.payment_method} />
                <DetailItem label="დღგ" value={GEL(inv.vat_amount)} color="text-amber-400" />
                <DetailItem label="სულ ჯამი" value={GEL(inv.total_amount)} color="text-emerald-400 font-bold" />
              </div>

              {inv.invoice_items && inv.invoice_items.length > 0 && (
                <div className="mt-4 rounded-xl border border-border/50 overflow-hidden">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-muted/30 text-[10px] uppercase tracking-wider text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3 font-semibold">პროდუქცია</th>
                        <th className="px-4 py-3 text-right">რაოდენობა</th>
                        <th className="px-4 py-3 text-right">ერთ. ფასი</th>
                        <th className="px-4 py-3 text-right">ჯამი</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {inv.invoice_items.map((item: any, i: number) => (
                        <tr key={i} className="hover:bg-white/5 transition-colors">
                          <td className="px-4 py-3 text-foreground font-medium">{item.product_name}</td>
                          <td className="px-4 py-3 text-right text-muted-foreground">{item.quantity}</td>
                          <td className="px-4 py-3 text-right text-muted-foreground">{GEL(item.unit_price)}</td>
                          <td className="px-4 py-3 text-right text-white font-medium">{GEL(item.line_total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function DetailItem({ label, value, color }: any) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] text-muted-foreground uppercase tracking-widest">{label}</p>
      <p className={cn("text-sm text-foreground", color)}>{value || '–'}</p>
    </div>
  );
}

function CreateInvoiceModal({ onClose, onSuccess }: { onClose: () => void, onSuccess: () => void }) {
  const [customerName, setCustomerName] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [currency, setCurrency] = useState('GEL');
  const [loading, setLoading] = useState(false);
  const [gelAmount, setGelAmount] = useState<number | null>(null);
  const [rate, setRate] = useState<number>(1);

  useEffect(() => {
    async function updateRate() {
      if (!totalAmount) return;
      if (currency === 'GEL') {
        setGelAmount(Number(totalAmount));
        setRate(1);
        return;
      }
      try {
        const amt = Number(totalAmount);
        const resGel = await convertToGel(amt, currency);
        setGelAmount(resGel);
        setRate(resGel / amt);
      } catch (err) {
        console.error(err);
      }
    }
    updateRate();
  }, [totalAmount, currency]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || !totalAmount) return;
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const vatRate = 0.18;
      const amountNum = Number(totalAmount);
      const subtotal = amountNum / (1 + vatRate);
      const vatAmount = amountNum - subtotal;
      
      const subtotalGel = (gelAmount || amountNum) / (1 + vatRate);
      const vatAmountGel = (gelAmount || amountNum) - subtotalGel;

      const { error } = await supabase.from('invoices').insert({
        invoice_type: 'B2C',
        invoice_number: `INV-MAN-${Date.now().toString().slice(-6)}`,
        customer_name: customerName,
        invoice_date: new Date().toISOString().split('T')[0],
        due_date: new Date().toISOString().split('T')[0],
        subtotal: subtotal,
        vat_rate: vatRate * 100,
        vat_amount: vatAmount,
        total_amount: amountNum,
        currency,
        exchange_rate: rate,
        subtotal_gel: subtotalGel,
        vat_amount_gel: vatAmountGel,
        total_amount_gel: gelAmount || amountNum,
        payment_method: 'cash',
        payment_status: 'PENDING',
        paid_amount: 0,
      });
      if (error) throw error;
      onSuccess();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-card w-full max-w-md border border-border rounded-2xl shadow-xl overflow-hidden"
      >
        <div className="p-6 border-b border-border flex justify-between items-center bg-muted/20">
          <h3 className="text-lg font-bold">ახალი ინვოისი</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <XCircle size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">კლიენტის სახელი</label>
            <input required value={customerName} onChange={e => setCustomerName(e.target.value)} className="w-full bg-background border border-border rounded-xl px-3 py-2 outline-none focus:border-amber-500" />
          </div>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-xs font-medium text-muted-foreground mb-1">თანხა</label>
              <input required type="number" step="0.01" value={totalAmount} onChange={e => setTotalAmount(e.target.value)} className="w-full bg-background border border-border rounded-xl px-3 py-2 outline-none focus:border-amber-500" />
            </div>
            <div className="w-24">
              <label className="block text-xs font-medium text-muted-foreground mb-1">ვალუტა</label>
              <select value={currency} onChange={e => setCurrency(e.target.value)} className="w-full bg-background border border-border rounded-xl px-3 py-2 outline-none focus:border-amber-500">
                <option value="GEL">GEL</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="RUB">RUB</option>
                <option value="TRY">TRY</option>
                <option value="GBP">GBP</option>
              </select>
            </div>
          </div>
          {currency !== 'GEL' && gelAmount !== null && (
            <div className="text-xs text-amber-500 bg-amber-500/10 p-2 rounded-lg font-medium">
              ≈ {GEL(gelAmount)} (კურსი: {rate.toFixed(4)})
            </div>
          )}
          <div className="pt-4 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-medium border hover:bg-muted">გაუქმება</button>
            <button type="submit" disabled={loading} className="px-4 py-2 rounded-xl text-sm font-bold bg-amber-500 text-black hover:bg-amber-400 disabled:opacity-50">
              {loading ? 'ინახება...' : 'შენახვა'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
