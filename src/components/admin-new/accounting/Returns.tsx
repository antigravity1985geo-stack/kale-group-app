import React, { useState, useEffect } from 'react';
import { 
  History, 
  RotateCcw, 
  Search, 
  Plus, 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  User, 
  Package, 
  ArrowRight,
  ChevronRight,
  Save,
  X,
  FileText,
  Filter
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../../lib/utils';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../context/AuthContext';

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

export default function Returns() {
  const { user } = useAuth();
  const [returns, setReturns] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null);

  // Smart Search logic
  const [orderQuery, setOrderQuery] = useState('');
  const [orderResults, setOrderResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [orderItems, setOrderItems] = useState<any[]>([]);
  const [maxQuantity, setMaxQuantity] = useState(1);

  const [newReturn, setNewReturn] = useState({
    order_id: '',
    product_id: '',
    quantity: 1,
    return_reason: '',
    condition: 'RESELLABLE'
  });

  useEffect(() => {
    fetchReturns();
  }, []);

  useEffect(() => {
    const searchOrders = async () => {
      if (selectedOrder || orderQuery.length < 2) {
        setOrderResults([]);
        return;
      }
      setIsSearching(true);
      try {
        const { data } = await supabase
          .from('orders')
          .select('*')
          .or(`customer_first_name.ilike.%${orderQuery}%,customer_last_name.ilike.%${orderQuery}%,customer_phone.ilike.%${orderQuery}%,personal_id.ilike.%${orderQuery}%`)
          .order('created_at', { ascending: false })
          .limit(10);
        setOrderResults(data || []);
      } catch (err) {
        console.error('Search error', err);
      } finally {
        setIsSearching(false);
      }
    };
    const to = setTimeout(searchOrders, 300);
    return () => clearTimeout(to);
  }, [orderQuery, selectedOrder]);

  const fetchReturns = async () => {
    setIsLoading(true);
    try {
      const { data } = await supabase
        .from('product_returns')
        .select('*, order:order_id(id, customer_first_name, customer_last_name, customer_phone), product:product_id(name, images)')
        .order('created_at', { ascending: false });
      if (data) setReturns(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const showToast = (msg: string, type: 'ok' | 'err') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSelectOrder = async (order: any) => {
    setSelectedOrder(order);
    setNewReturn({ ...newReturn, order_id: order.id, product_id: '', quantity: 1 });
    setOrderQuery(`${order.customer_first_name} ${order.customer_last_name} (#${order.id.slice(0,8)})`);
    setOrderResults([]);
    
    // Fetch products actually purchased in this order
    const { data } = await supabase
      .from('order_items')
      .select('*, product:product_id(name, category)')
      .eq('order_id', order.id);
      
    if (data) setOrderItems(data);
  };

  const handleClearOrderSelection = () => {
    setSelectedOrder(null);
    setOrderQuery('');
    setOrderItems([]);
    setNewReturn({ ...newReturn, order_id: '', product_id: '', quantity: 1 });
  };

  const handleSelectProduct = (productId: string) => {
    const item = orderItems.find(i => i.product_id === productId);
    const maxQty = item ? item.quantity : 1;
    setMaxQuantity(maxQty);
    setNewReturn({ ...newReturn, product_id: productId, quantity: 1 });
  };

  const handleCreateReturn = async () => {
    if(!newReturn.order_id || !newReturn.product_id || !newReturn.return_reason) {
       showToast('გთხოვთ შეავსოთ ყველა ველი', 'err');
       return;
    }
    try {
      const { error } = await supabase.from('product_returns').insert([newReturn]);
      if (error) throw error;
      
      showToast('დაბრუნების მოთხოვნა წარმატებით შეიქმნა', 'ok');
      setIsAdding(false);
      handleClearOrderSelection();
      fetchReturns();
    } catch (err: any) {
       showToast(err.message, 'err');
    }
  };

  const processReturn = async (returnId: string) => {
    try {
      const { data: fiscal, error: fErr } = await supabase
        .from('fiscal_periods')
        .select('id')
        .eq('status', 'OPEN')
        .order('start_date', { ascending: false })
        .limit(1)
        .single();
      
      if (fErr || !fiscal) {
         showToast('ღია ფისკალური პერიოდი ვერ მოიძებნა!', 'err');
         return;
      }

      const { error } = await supabase.rpc('process_return', {
         p_return_id: returnId,
         p_user_id: user?.id,
         p_fiscal_period_id: fiscal.id
      });
      if (error) throw error;

      showToast('დაბრუნება წარმატებით აისახა ბუღალტერიაში', 'ok');
      fetchReturns();
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

      {/* Header & Stats */}
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <RotateCcw className="h-6 w-6 text-primary" /> დაბრუნებები (RMA)
          </h2>
          <p className="text-sm text-muted-foreground">პროდუქციის უკან დაბრუნების პროცესები და ბუღალტრული ასახვა</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsAdding(!isAdding)}
            className={cn(
               "flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all shadow-lg active:scale-95",
               isAdding 
                ? "bg-muted text-foreground border border-border/50 shadow-none" 
                : "bg-primary text-primary-foreground shadow-primary/20 hover:opacity-90"
            )}
          >
            {isAdding ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {isAdding ? "გაუქმება" : "ახალი მოთხოვნა"}
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard 
          icon={RotateCcw} 
          title="სულ დაბრუნება" 
          value={returns.length} 
          subValue="ყველა პერიოდი" 
          color="from-sky-500 to-blue-600" 
        />
        <KpiCard 
          icon={AlertTriangle} 
          title="მოლოდინში" 
          value={returns.filter(r => r.status === 'PENDING').length} 
          subValue="პროცესირებას საჭიროებს" 
          color="from-amber-400 to-orange-500" 
        />
        <KpiCard 
          icon={CheckCircle2} 
          title="დასრულებული" 
          value={returns.filter(r => r.status === 'PROCESSED').length} 
          subValue="ასახულია ბაზაში" 
          color="from-emerald-500 to-teal-600" 
        />
        <KpiCard 
          icon={FileText} 
          title="ამ თვეში" 
          value={returns.filter(r => new Date(r.created_at).getMonth() === new Date().getMonth()).length} 
          subValue="მიმდინარე პერიოდი" 
          color="from-violet-500 to-purple-600" 
        />
      </div>

      {/* New Return Form Section */}
      <AnimatePresence>
        {isAdding && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            <Card className="bg-primary/[0.02] border-primary/20">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <RefreshCw className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground italic">დაბრუნების ინიცირება</h3>
                  <p className="text-xs text-muted-foreground">დააკავშირეთ დაბრუნება არსებულ შეკვეთასთან</p>
                </div>
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <div className="space-y-5">
                  <div className="relative">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 mb-2 block">შეკვეთის ძებნა *</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <input 
                        value={orderQuery}
                        onChange={e => {
                          setOrderQuery(e.target.value);
                          if (selectedOrder) handleClearOrderSelection();
                        }}
                        placeholder="კლიენტის სახელი, ტელეფონი ან პირადი ნომერი..."
                        className="w-full pl-10 pr-10 py-3 bg-background border border-border/50 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                      />
                      {orderQuery && (
                        <button onClick={handleClearOrderSelection} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded-md transition-colors">
                          <X className="h-4 w-4 text-muted-foreground" />
                        </button>
                      )}
                      {isSearching && <RefreshCw className="absolute right-10 top-1/2 -translate-y-1/2 h-4 w-4 text-primary animate-spin" />}
                    </div>

                    {/* Search Results Dropdown */}
                    <AnimatePresence>
                      {orderResults.length > 0 && !selectedOrder && (
                        <motion.div 
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 5 }}
                          className="absolute z-50 w-full mt-2 bg-card border border-border/50 rounded-2xl shadow-2xl max-h-64 overflow-y-auto backdrop-blur-xl shadow-primary/10"
                        >
                          {orderResults.map(o => (
                            <button
                              key={o.id}
                              onClick={() => handleSelectOrder(o)}
                              className="w-full flex items-center justify-between px-5 py-4 hover:bg-primary/5 text-left border-b border-border/30 last:border-0 transition-colors group"
                            >
                              <div>
                                <div className="font-bold text-foreground flex items-center gap-2 group-hover:text-primary transition-colors">
                                  <User className="h-4 w-4" /> {o.customer_first_name} {o.customer_last_name}
                                </div>
                                <div className="text-[10px] text-muted-foreground font-mono mt-1">ID: #{o.id.slice(0,8)} • {o.customer_phone || "No Phone"}</div>
                              </div>
                              <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 block">შეძენილი პროდუქტი</label>
                    <div className="relative">
                      <Package className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <select 
                        value={newReturn.product_id}
                        onChange={e => handleSelectProduct(e.target.value)}
                        disabled={!selectedOrder || orderItems.length === 0}
                        className="w-full pl-10 pr-4 py-3 bg-background border border-border/50 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 transition-all outline-none disabled:opacity-50 appearance-none cursor-pointer"
                      >
                        <option value="">-- აირჩიეთ პროდუქტი შეკვეთიდან --</option>
                        {orderItems.map(item => (
                          <option key={item.product_id} value={item.product_id}>
                            {item.product?.name} (Bought: {item.quantity})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 block">რაოდენობა</label>
                       <input 
                         type="number" 
                         min="1" 
                         max={maxQuantity}
                         value={newReturn.quantity}
                         onChange={e => {
                           let val = parseInt(e.target.value);
                           if (val > maxQuantity) val = maxQuantity;
                           if (val < 1) val = 1;
                           setNewReturn(r => ({ ...r, quantity: val }));
                         }}
                         disabled={!newReturn.product_id}
                         className="w-full px-4 py-3 bg-background border border-border/50 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 transition-all outline-none disabled:opacity-50"
                       />
                       {newReturn.product_id && (
                         <p className="text-[10px] text-primary font-bold ml-1 flex items-center gap-1">
                           <AlertTriangle className="h-3 w-3" /> Max available: {maxQuantity}
                         </p>
                       )}
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 block">მდგომარეობა</label>
                      <select 
                        value={newReturn.condition}
                        onChange={e => setNewReturn(r => ({ ...r, condition: e.target.value }))}
                        className="w-full px-4 py-3 bg-background border border-border/50 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 transition-all outline-none cursor-pointer"
                      >
                        <option value="RESELLABLE">რეალიზებადი (RESELLABLE)</option>
                        <option value="DEFECTIVE">წუნდებული (DEFECTIVE)</option>
                        <option value="DAMAGED">დაზიანებული (DAMAGED)</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col justify-between">
                  <div className="space-y-2 flex-grow">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 block">დაბრუნების მიზეზი / კომენტარი</label>
                    <textarea 
                      value={newReturn.return_reason}
                      onChange={e => setNewReturn(r => ({ ...r, return_reason: e.target.value }))}
                      placeholder="დაწერეთ მიზეზი..."
                      className="w-full h-[155px] px-4 py-4 bg-background border border-border/50 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 transition-all outline-none resize-none"
                    />
                  </div>
                  <button 
                    onClick={handleCreateReturn}
                    className="mt-4 w-full py-3.5 bg-primary text-primary-foreground rounded-2xl font-black text-sm shadow-xl shadow-primary/20 hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-3 uppercase tracking-wider"
                  >
                    <Save className="h-5 w-5" />
                    დაბრუნების ინიცირება
                  </button>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Returns List Section */}
      <Card className="p-0 overflow-hidden">
        <div className="p-6 border-b border-border/50 bg-muted/20 flex flex-col sm:flex-row gap-4 items-center justify-between">
           <h3 className="text-lg font-bold text-foreground">დაბრუნებების ისტორია</h3>
           <div className="flex items-center gap-2">
             <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input 
                  placeholder="ფილტრი..."
                  className="w-full pl-10 pr-4 py-2 bg-background border border-border/50 rounded-xl text-sm focus:outline-none"
                />
             </div>
             <button onClick={fetchReturns} className="p-2.5 rounded-xl border border-border/50 hover:bg-muted transition-all active:scale-95">
               <RefreshCw className={cn("h-4 w-4 text-muted-foreground", isLoading && "animate-spin")} />
             </button>
           </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/30 bg-muted/10 text-muted-foreground">
                <th className="px-6 py-4 text-left font-bold uppercase text-[10px] tracking-widest whitespace-nowrap">დაბრუნება #</th>
                <th className="px-6 py-4 text-left font-bold uppercase text-[10px] tracking-widest">პროდუქტი & კლიენტი</th>
                <th className="px-6 py-4 text-center font-bold uppercase text-[10px] tracking-widest">რაოდენობა</th>
                <th className="px-6 py-4 text-left font-bold uppercase text-[10px] tracking-widest">მიზეზი</th>
                <th className="px-6 py-4 text-center font-bold uppercase text-[10px] tracking-widest">მდგომარეობა</th>
                <th className="px-6 py-4 text-center font-bold uppercase text-[10px] tracking-widest">სტატუსი</th>
                <th className="px-6 py-4 text-right font-bold uppercase text-[10px] tracking-widest">მოქმედება</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/20">
              {isLoading ? (
                Array(5).fill(0).map((_, i) => (
                  <tr key={i} className="animate-pulse"><td colSpan={7} className="px-6 py-6"><div className="h-12 bg-muted rounded-xl" /></td></tr>
                ))
              ) : returns.length === 0 ? (
                <tr><td colSpan={7} className="py-20 text-center text-muted-foreground italic">მონაცემები არ მოიძებნა</td></tr>
              ) : (
                returns.map((r, i) => (
                  <tr key={r.id} className="group hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-mono text-[10px] font-black text-primary bg-primary/5 px-2 py-1 rounded-lg border border-primary/10 tracking-widest">
                        {r.id.split('-')[0].toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                         <div className="h-10 w-10 rounded-lg border border-border/50 bg-muted overflow-hidden shrink-0 hidden sm:block">
                            <img 
                              src={r.product?.images?.[0] || "https://via.placeholder.com/40"} 
                              alt="" 
                              className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-500" 
                            />
                         </div>
                         <div className="flex flex-col min-w-0">
                            <span className="font-bold text-foreground truncate max-w-[180px]">{r.product?.name}</span>
                            <span className="text-[10px] text-muted-foreground italic flex items-center gap-1">
                              <User className="h-3 w-3" /> {r.order?.customer_first_name} {r.order?.customer_last_name}
                            </span>
                         </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center font-black text-foreground">{r.quantity} ც.</td>
                    <td className="px-6 py-4">
                       <p className="text-xs text-muted-foreground max-w-[200px] truncate group-hover:whitespace-normal group-hover:overflow-visible transition-all" title={r.return_reason}>
                         {r.return_reason}
                       </p>
                    </td>
                    <td className="px-6 py-4 text-center">
                       <span className={cn(
                          "inline-flex px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border",
                          r.condition === 'RESELLABLE' ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : 
                          r.condition === 'DEFECTIVE' ? "bg-amber-500/10 text-amber-500 border-amber-500/20" : 
                          "bg-rose-500/10 text-rose-500 border-rose-500/20"
                       )}>
                         {r.condition}
                       </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                       {r.status === 'PENDING' && (
                         <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-[10px] font-black uppercase text-amber-500 border border-amber-500/20">
                            <div className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" /> მოლოდინში
                         </div>
                       )}
                       {r.status === 'PROCESSED' && (
                         <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-[10px] font-black uppercase text-emerald-500 border border-emerald-500/20">
                            <CheckCircle2 className="h-3 w-3" /> დასრულებული
                         </div>
                       )}
                    </td>
                    <td className="px-6 py-4 text-right">
                       <AnimatePresence>
                         {r.status === 'PENDING' ? (
                           <motion.button 
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => processReturn(r.id)}
                              className="inline-flex p-2.5 bg-primary shadow-lg shadow-primary/20 rounded-xl text-primary-foreground hover:opacity-90 transition-all border-none outline-none group/btn" 
                              title="ბუღალტერიაში გატარება"
                           >
                              <RefreshCw size={16} className="group-hover/btn:rotate-180 transition-transform duration-700" />
                           </motion.button>
                         ) : (
                           <div className="flex justify-end p-2.5 text-muted-foreground opacity-50">
                              <CheckCircle2 size={18} />
                           </div>
                         )}
                       </AnimatePresence>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}