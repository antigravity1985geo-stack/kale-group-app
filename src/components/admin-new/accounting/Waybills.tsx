import React, { useState, useEffect, useCallback } from 'react';
import { 
  Truck, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Plus, 
  Send, 
  AlertTriangle, 
  CheckCircle2, 
  Loader2, 
  RefreshCw,
  Search,
  FileText,
  Building2,
  Calendar,
  ExternalLink,
  ChevronRight,
  MoreVertical,
  X,
  Clock,
  MapPin,
  ClipboardList,
  XCircle
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

interface Waybill {
  id: string;
  order_id: string;
  rs_waybill_id: string | null;
  transport_type: number;
  start_address: string;
  end_address: string;
  driver_name: string;
  car_number: string;
  status: 'DRAFT' | 'SENT' | 'SAVED';
  created_at: string;
  orders?: {
    customer_first_name: string;
    customer_last_name: string;
    total_price: number;
  } | null;
}

interface IncomingWaybill {
  id: string;
  supplier_name: string;
  supplier_tin: string;
  rs_waybill_id: string;
  total_amount: number;
  status: 'PENDING_ACCEPTANCE' | 'ACCEPTED' | 'REJECTED';
  received_at: string;
}

export default function Waybills() {
  const [activeTab, setActiveTab] = useState<'outgoing' | 'incoming'>('outgoing');
  const [waybills, setWaybills] = useState<Waybill[]>([]);
  const [incomingWaybills, setIncomingWaybills] = useState<IncomingWaybill[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState<string | null>(null);
  const [isDrafting, setIsDrafting] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      
      // 1. Fetch Outgoing Waybills
      const res = await fetch('/api/rs-ge/waybills', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.waybills) setWaybills(data.waybills);

      // 2. Fetch Orders without Waybills
      const { data: ords } = await supabase
        .from('orders')
        .select('id, customer_first_name, customer_last_name, total_price, customer_address, customer_city, created_at')
        .in('status', ['confirmed', 'shipped', 'delivered', 'completed'])
        .order('created_at', { ascending: false })
        .limit(50);
        
      if (ords && data.waybills) {
        const waybillOrderIds = data.waybills.map((w: any) => w.order_id);
        const pendingOrders = ords.filter(o => !waybillOrderIds.includes(o.id));
        setOrders(pendingOrders);
      }

      // 3. Fetch Incoming Waybills
      const { data: incoming } = await supabase
        .from('rs_incoming_waybills')
        .select('*')
        .order('received_at', { ascending: false });
      if (incoming) setIncomingWaybills(incoming as IncomingWaybill[]);

    } catch (err) {
      console.error('Waybills fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const showToast = (msg: string, type: 'ok' | 'err') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const createDraft = async (order: any) => {
    setIsDrafting(order.id);
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      const res = await fetch('/api/rs-ge/waybill/draft', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          order_id: order.id,
          end_address: `${order.customer_city || ''}, ${order.customer_address || ''}`.trim(),
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      showToast('დრაფტი წარმატებით შეიქმნა', 'ok');
      fetchData();
    } catch (err: any) {
      showToast(err.message, 'err');
    } finally {
      setIsDrafting(null);
    }
  };

  const sendWaybill = async (id: string) => {
    setIsSyncing(id);
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      const res = await fetch('/api/rs-ge/waybill/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ waybill_id: id })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      showToast(`RS.ge ზედნადები დარეგისტრირდა: ${data.waybill.rs_waybill_id}`, 'ok');
      fetchData();
    } catch (err: any) {
      showToast(err.message, 'err');
    } finally {
      setIsSyncing(null);
    }
  };

  const acceptIncoming = async (id: string) => {
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      const res = await fetch('/api/rs-ge/waybill/incoming/accept', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ id })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      showToast('მიღება წარმატებით დადასტურდა', 'ok');
      fetchData();
    } catch (err: any) {
      showToast(err.message, 'err');
    }
  };

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
            {toast.type === 'ok' ? <CheckCircle2 className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
            <span className="font-medium text-sm">{toast.msg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Truck className="h-6 w-6 text-primary" /> RS.ge ზედნადებები
          </h2>
          <p className="text-sm text-muted-foreground">გამავალი და შემომავალი ტვირთების მართვა (Integration)</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={fetchData} 
            className="flex items-center gap-2 rounded-xl border border-border/50 bg-background px-4 py-2.5 text-sm font-semibold hover:bg-muted transition-all active:scale-95"
          >
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} /> განახლება
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard 
          icon={Truck} 
          title="სულ რეგისტრირებული" 
          value={waybills.filter(w => w.status === 'SENT').length} 
          subValue="გამავალი ზედნადებები" 
          color="from-emerald-500 to-teal-600" 
        />
        <KpiCard 
          icon={ArrowUpRight} 
          title="გასაგზავნი (Draft)" 
          value={waybills.filter(w => w.status === 'DRAFT').length} 
          subValue="მზა პროდუქცია" 
          color="from-blue-500 to-blue-600" 
        />
        <KpiCard 
          icon={ArrowDownLeft} 
          title="მისაღები" 
          value={incomingWaybills.filter(w => w.status === 'PENDING_ACCEPTANCE').length} 
          subValue="მომწოდებლებისგან" 
          color="from-violet-500 to-purple-600" 
        />
        <KpiCard 
          icon={ClipboardList} 
          title="შეკვეთა უზედნადებოდ" 
          value={orders.length} 
          subValue="საჭიროებს დრაფტს" 
          color="from-rose-500 to-rose-600" 
        />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 rounded-2xl border border-border/50 bg-card p-1 w-fit">
        {[
          { id: 'outgoing', label: 'გამავალი (გაყიდვები)', icon: ArrowUpRight },
          { id: 'incoming', label: 'შემომავალი (შესყიდვები)', icon: ArrowDownLeft },
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

      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        {activeTab === 'outgoing' ? (
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Left Column: Outstanding Orders */}
            <div className="space-y-4">
              <div className="flex items-center justify-between px-2">
                 <h4 className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                   <AlertTriangle className="h-4 w-4 text-amber-500" /> გასაგზავნი შეკვეთები
                 </h4>
                 <span className="text-[10px] font-black bg-muted px-2 py-0.5 rounded-full">{orders.length}</span>
              </div>
              
              <div className="space-y-3 max-h-[700px] overflow-y-auto pr-2 custom-scrollbar">
                {orders.length === 0 ? (
                  <div className="text-center py-20 bg-muted/20 border border-dashed border-border/50 rounded-3xl">
                    <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-3 opacity-50" />
                    <p className="text-sm text-muted-foreground italic">ყველა შეკვეთას აქვს ზედნადები</p>
                  </div>
                ) : (
                  orders.map(o => (
                    <Card key={o.id} className="p-4 group hover:border-primary/30 transition-all">
                      <div className="flex items-center justify-between">
                         <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1">
                               <span className="text-[10px] font-black font-mono text-primary bg-primary/5 px-2 py-0.5 rounded border border-primary/10">#{o.id.split('-')[0].toUpperCase()}</span>
                               <span className="text-xs text-muted-foreground font-mono">{new Date(o.created_at).toLocaleDateString()}</span>
                            </div>
                            <h5 className="font-bold text-foreground truncate">{o.customer_first_name} {o.customer_last_name}</h5>
                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1 truncate">
                              <MapPin className="h-3 w-3 shrink-0" /> {o.customer_city || "—"}, {o.customer_address || "—"}
                            </p>
                         </div>
                         <div className="text-right ml-4">
                            <p className="text-lg font-black text-foreground font-mono mb-2">₾ {Number(o.total_price).toLocaleString()}</p>
                            <button 
                              onClick={() => createDraft(o)}
                              disabled={isDrafting === o.id}
                              className="w-full py-2 px-4 bg-primary text-primary-foreground rounded-xl text-[10px] font-black uppercase tracking-wider shadow-lg shadow-primary/10 hover:opacity-90 disabled:opacity-50 transition-all flex items-center gap-2 justify-center"
                            >
                              {isDrafting === o.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                              დრაფტი
                            </button>
                         </div>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </div>

            {/* Right Column: Waybills List */}
            <div className="space-y-4">
              <div className="flex items-center justify-between px-2">
                 <h4 className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                   <FileText className="h-4 w-4 text-blue-500" /> რეგისტრირებული & დრაფტები
                 </h4>
                 <span className="text-[10px] font-black bg-muted px-2 py-0.5 rounded-full">{waybills.length}</span>
              </div>

              <div className="space-y-3 max-h-[700px] overflow-y-auto pr-2 custom-scrollbar">
                {waybills.length === 0 ? (
                  <div className="text-center py-20 bg-muted/20 border border-dashed border-border/50 rounded-3xl">
                    <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-3 opacity-20" />
                    <p className="text-sm text-muted-foreground italic">ზედნადებები ჯერ არ არის</p>
                  </div>
                ) : (
                  waybills.map(w => (
                    <Card key={w.id} className="p-0 overflow-hidden relative group border-border/40">
                      <div className={cn(
                        "absolute left-0 top-0 w-1.5 h-full",
                        w.status === 'SENT' ? "bg-emerald-500" : "bg-amber-400"
                      )} />
                      <div className="p-5">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <div className="flex items-center gap-2 mb-1.5">
                               <span className="text-[10px] font-black text-muted-foreground font-mono">ORDER #{w.order_id.split('-')[0].toUpperCase()}</span>
                               <span className={cn(
                                 "text-[10px] font-black uppercase tracking-tighter px-2 py-0.5 rounded border",
                                 w.status === 'SENT' ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                               )}>
                                 {w.status === 'SENT' ? 'REGISTERED' : 'DRAFT'}
                               </span>
                            </div>
                            <h5 className="font-bold text-foreground text-lg">{w.orders?.customer_first_name} {w.orders?.customer_last_name}</h5>
                          </div>
                          <div className="text-right">
                             <p className="text-xs text-muted-foreground flex items-center justify-end gap-1 mb-1">
                               <Calendar className="h-3 w-3" /> {new Date(w.created_at).toLocaleDateString()}
                             </p>
                             <p className="font-black text-foreground font-mono">₾ {Number(w.orders?.total_price).toLocaleString()}</p>
                          </div>
                        </div>

                        <div className="space-y-2 mb-6">
                           <div className="flex items-start gap-3">
                              <div className="h-10 border-l border-dashed border-border/50 translate-x-1.5 mt-2 mr-1" />
                              <div className="space-y-1">
                                 <p className="text-[10px] font-black text-muted-foreground uppercase flex items-center gap-1.5"><div className="h-1.5 w-1.5 rounded-full bg-muted" /> საიდან:</p>
                                 <p className="text-xs font-medium text-foreground italic">{w.start_address}</p>
                              </div>
                           </div>
                           <div className="flex items-start gap-3">
                              <div className="space-y-1">
                                 <p className="text-[10px] font-black text-primary uppercase flex items-center gap-1.5"><div className="h-1.5 w-1.5 rounded-full bg-primary shadow-sm" /> სადაც:</p>
                                 <p className="text-xs font-medium text-foreground italic">{w.end_address || "—"}</p>
                              </div>
                           </div>
                        </div>

                        {w.rs_waybill_id && (
                          <div className="flex items-center gap-2 bg-muted/30 p-2.5 rounded-xl border border-border/30 mb-4 group-hover:bg-primary/5 transition-colors">
                             <span className="text-[10px] font-black text-muted-foreground uppercase">RS.GE ID:</span>
                             <span className="text-xs font-black text-primary font-mono select-all decoration-dotted underline underline-offset-4 decoration-primary/30">{w.rs_waybill_id}</span>
                             <ExternalLink className="h-3 w-3 text-muted-foreground ml-auto group-hover:text-primary" />
                          </div>
                        )}

                        {w.status === 'DRAFT' && (
                          <button 
                            onClick={() => sendWaybill(w.id)}
                            disabled={isSyncing === w.id}
                            className="w-full py-3 bg-emerald-600/10 text-emerald-600 border border-emerald-600/20 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-emerald-600 hover:text-white hover:shadow-lg hover:shadow-emerald-500/20 transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50"
                          >
                            {isSyncing === w.id ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                            რეგისტრაცია RS.GE-ზე
                          </button>
                        )}
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </div>
          </div>
        ) : (
          <Card className="p-0 overflow-hidden border-border/40">
             <div className="p-6 border-b border-border/50 bg-muted/20 flex flex-col sm:flex-row gap-4 items-center justify-between">
                <div>
                  <h4 className="text-base font-bold text-foreground">შემომავალი ზედნადებები</h4>
                  <p className="text-xs text-muted-foreground">მომწოდებლებისგან RS.ge პორტალით მიღებული დოკუმენტები</p>
                </div>
                <div className="relative w-full sm:w-64">
                   <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                   <input 
                     placeholder="ფილტრი ს/ნ ან დასახელებით..."
                     className="w-full pl-10 pr-4 py-2 bg-background border border-border/50 rounded-xl text-sm focus:outline-none"
                   />
                </div>
             </div>

             <div className="overflow-x-auto">
               <table className="w-full text-sm">
                 <thead>
                   <tr className="border-b border-border/30 bg-muted/10 text-muted-foreground">
                      <th className="px-6 py-4 text-left font-bold uppercase text-[10px] tracking-widest">RS Waybill ID</th>
                      <th className="px-6 py-4 text-left font-bold uppercase text-[10px] tracking-widest">მომწოდებელი</th>
                      <th className="px-6 py-4 text-right font-bold uppercase text-[10px] tracking-widest">თანხა</th>
                      <th className="px-6 py-4 text-center font-bold uppercase text-[10px] tracking-widest">სტატუსი</th>
                      <th className="px-6 py-4 text-left font-bold uppercase text-[10px] tracking-widest">მიღების თარიღი</th>
                      <th className="px-6 py-4 text-right font-bold uppercase text-[10px] tracking-widest">მოქმედება</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-border/20">
                   {incomingWaybills.length === 0 ? (
                     <tr><td colSpan={6} className="py-20 text-center text-muted-foreground italic">შემომავალი ზედნადებები ვერ მოიძებნა</td></tr>
                   ) : (
                     incomingWaybills.map(w => (
                       <tr key={w.id} className="group hover:bg-muted/30 transition-colors">
                          <td className="px-6 py-4">
                             <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4 text-muted-foreground" />
                                <span className="font-mono text-xs font-bold text-foreground bg-muted px-1.5 py-0.5 rounded select-all">{w.rs_waybill_id}</span>
                             </div>
                          </td>
                          <td className="px-6 py-4">
                             <div className="flex flex-col">
                                <span className="font-bold text-foreground flex items-center gap-2"><Building2 className="h-3.5 w-3.5 text-primary" /> {w.supplier_name}</span>
                                <span className="text-[10px] text-muted-foreground font-mono ml-5">TIN: {w.supplier_tin}</span>
                             </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                             <span className="font-black text-foreground font-mono">₾ {Number(w.total_amount).toLocaleString()}</span>
                          </td>
                          <td className="px-6 py-4 text-center">
                             {w.status === 'ACCEPTED' ? (
                               <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-[10px] font-black uppercase text-emerald-500 border border-emerald-500/20">
                                  <CheckCircle2 className="h-3 w-3" /> ACCEPTED
                               </div>
                             ) : w.status === 'PENDING_ACCEPTANCE' ? (
                               <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-[10px] font-black uppercase text-amber-500 border border-amber-500/20">
                                  <Clock className="h-3 w-3" /> PENDING
                               </div>
                             ) : (
                               <div className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/10 px-3 py-1 text-[10px] font-black uppercase text-rose-500 border border-rose-500/20">
                                  <XCircle className="h-3 w-3" /> REJECTED
                               </div>
                             )}
                          </td>
                          <td className="px-6 py-4">
                             <div className="flex items-center gap-2 text-xs text-muted-foreground italic">
                               <Calendar className="h-3.5 w-3.5" /> {new Date(w.received_at).toLocaleDateString()}
                             </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                             {w.status === 'PENDING_ACCEPTANCE' && (
                               <button
                                 onClick={() => acceptIncoming(w.id)}
                                 className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 hover:opacity-90 active:scale-95 transition-all"
                               >
                                 მიღება
                               </button>
                             )}
                          </td>
                       </tr>
                     ))
                   )}
                 </tbody>
               </table>
             </div>
          </Card>
        )}
      </motion.div>
    </div>
  );
}