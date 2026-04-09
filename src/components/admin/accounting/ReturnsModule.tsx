import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { Loader2, RefreshCcw, CheckCircle, XCircle, AlertTriangle, Plus, Save, Search, X } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';

export default function ReturnsModule() {
  const { user } = useAuth();
  const [returns, setReturns] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);

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
    fetchData();
  }, []);

  useEffect(() => {
    const searchOrders = async () => {
      // Don't search if we already selected an order or query is too short
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

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const { data } = await supabase
        .from('product_returns')
        .select('*, order:order_id(id, customer_first_name, customer_last_name), product:product_id(name)')
        .order('created_at', { ascending: false });
      if (data) setReturns(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectOrder = async (order: any) => {
    setSelectedOrder(order);
    setNewReturn({ ...newReturn, order_id: order.id, product_id: '', quantity: 1 });
    setOrderQuery(`${order.customer_first_name} ${order.customer_last_name} (#${order.id.slice(0,8)})`);
    setOrderResults([]);
    
    // Fetch products actually purchased in this order
    const { data } = await supabase
      .from('order_items')
      .select('*, product:product_id(name)')
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
       alert('გთხოვთ შეავსოთ ყველა ველი');
       return;
    }
    try {
      const { error } = await supabase.from('product_returns').insert([newReturn]);
      if (error) throw error;
      alert('დაბრუნების მოთხოვნა შეიქმნა!');
      setIsAdding(false);
      handleClearOrderSelection();
      fetchData();
    } catch (err: any) {
       alert('შეცდომა: ' + err.message);
    }
  };

  const processReturn = async (returnId: string) => {
    if (!confirm('ნამდვილად გსურთ დაბრუნების პროცესირება? (ეს განაახლებს ბუღალტერიას)')) return;
    try {
      const { data: fiscal, error: fErr } = await supabase.from('fiscal_periods').select('id').eq('status', 'OPEN').order('start_date', { ascending: false }).limit(1).single();
      if (fErr || !fiscal) {
         alert('ღია ფისკალური პერიოდი ვერ მოიძებნა! გთხოვთ ჯერ გახსნათ პერიოდი ბუღალტერიის დეშბორდიდან.');
         return;
      }

      const { error } = await supabase.rpc('process_return', {
         p_return_id: returnId,
         p_user_id: user?.id,
         p_fiscal_period_id: fiscal.id
      });
      if (error) throw error;

      alert('დაბრუნება წარმატებით აისახა ბუღალტერიაში!');
      fetchData();
    } catch (err: any) {
      alert('შეცდომა: ' + err.message);
    }
  };

  if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-brand-400" /></div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-serif text-slate-800 mb-1">პროდუქციის დაბრუნება (RMA)</h2>
          <p className="text-sm text-slate-500">მართეთ მომხმარებლის მიერ დაბრუნებული პროდუქცია</p>
        </div>
        <button onClick={() => setIsAdding(!isAdding)} className="px-5 py-2.5 bg-brand-600 rounded-xl text-xs font-bold uppercase transition flex items-center gap-2 hover:bg-brand-500 text-white border-none cursor-pointer outline-none shadow-sm hover:shadow-md">
           {isAdding ? 'გაუქმება' : <><Plus size={16}/> მოთხოვნის ახალი დამატება</>}
        </button>
      </div>

      {isAdding && (
         <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-8 mb-8 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 bg-brand-500 h-full"></div>
            <h3 className="text-base font-bold text-slate-800 mb-6 flex items-center gap-2">
              <RefreshCcw size={18} className="text-brand-500" />
              ახალი დაბრუნების პროცესირება
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
               <div className="relative">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">შეკვეთა (ძებნა P.N, სახელი...)</label>
                  <div className="relative">
                     <Search size={16} className="absolute left-4 top-3.5 text-slate-400" />
                     <input
                       type="text"
                       value={orderQuery}
                       onChange={e => {
                         setOrderQuery(e.target.value);
                         if (selectedOrder) handleClearOrderSelection();
                       }}
                       placeholder="მოძებნეთ კლიენტი..."
                       className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-12 pr-10 py-3 text-slate-800 outline-none focus:bg-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all font-medium"
                     />
                     {orderQuery && (
                       <button onClick={handleClearOrderSelection} className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-200 transition-colors">
                         <X size={16} />
                       </button>
                     )}
                     {isSearching && <Loader2 size={16} className="absolute right-10 top-3.5 text-brand-500 animate-spin" />}
                  </div>

                  {/* Search Dropdown */}
                  {orderResults.length > 0 && !selectedOrder && (
                    <div className="absolute top-full left-0 z-20 w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-xl max-h-60 overflow-y-auto">
                      {orderResults.map(o => (
                        <div
                          key={o.id}
                          onClick={() => handleSelectOrder(o)}
                          className="px-5 py-3 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-0 transition-colors"
                        >
                          <div className="text-sm font-bold text-slate-800">{o.customer_first_name} {o.customer_last_name}</div>
                          <div className="text-xs text-slate-500 font-medium mt-1">P.N: {o.personal_id} <span className="mx-2 text-slate-300">•</span> ID: #{o.id.slice(0,8)}</div>
                        </div>
                      ))}
                    </div>
                  )}
               </div>
               
               <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">შეძენილი პროდუქტი</label>
                  <select 
                    value={newReturn.product_id} 
                    onChange={e => handleSelectProduct(e.target.value)} 
                    disabled={!selectedOrder || orderItems.length === 0}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 outline-none disabled:opacity-50 focus:bg-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all font-medium cursor-pointer"
                  >
                     <option value="">-- აირჩიეთ პროდუქტი --</option>
                     {orderItems.map(item => (
                       <option key={item.product_id} value={item.product_id}>
                         {item.product?.name} (შეიძინა: {item.quantity} ცალი)
                       </option>
                     ))}
                  </select>
               </div>
               
               <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">დასაბრუნებელი რაოდენობა</label>
                  <input 
                    type="number" 
                    min="1" 
                    max={maxQuantity}
                    value={newReturn.quantity} 
                    onChange={e => {
                       let val = parseInt(e.target.value);
                       if (val > maxQuantity) val = maxQuantity;
                       if (val < 1) val = 1;
                       setNewReturn({...newReturn, quantity: val})
                    }} 
                    disabled={!newReturn.product_id}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 outline-none disabled:opacity-50 focus:bg-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all font-medium" 
                  />
                  {newReturn.product_id && <p className="text-[11px] font-medium text-brand-600 mt-2 flex items-center gap-1"><AlertTriangle size={12}/> მაქსიმალური რაოდენობა შეკვეთიდან: {maxQuantity}</p>}
               </div>
               
               <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">ფიზიკური მდგომარეობა</label>
                  <select value={newReturn.condition} onChange={e => setNewReturn({...newReturn, condition: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 outline-none focus:bg-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all font-medium cursor-pointer">
                     <option value="RESELLABLE">რეალიზებადი (RESELLABLE) - ბრუნდება მარაგში</option>
                     <option value="DEFECTIVE">წუნდებული (DEFECTIVE) - ბრაკი</option>
                     <option value="DAMAGED">დაზიანებული (DAMAGED) - ჩამოსაწერი</option>
                  </select>
               </div>
            </div>
            
            <div className="mb-6">
               <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">დაბრუნების მიზეზი / კომენტარი</label>
               <textarea 
                  value={newReturn.return_reason} 
                  onChange={e => setNewReturn({...newReturn, return_reason: e.target.value})} 
                  placeholder="დეტალურად აღწერეთ დაბრუნების მიზეზი პროდუქტისთვის..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-slate-800 outline-none min-h-[100px] focus:bg-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all font-medium resize-y"
               ></textarea>
            </div>
            
            <div className="pt-4 border-t border-slate-200 flex justify-end">
                <button onClick={handleCreateReturn} className="px-8 py-3 bg-slate-900 rounded-xl text-white text-sm font-bold shadow-md hover:shadow-lg hover:bg-black transition-all flex items-center gap-2 border-none cursor-pointer outline-none transform active:scale-[0.98]">
                   <Save size={18}/> დაბრუნების ინიცირება
                </button>
            </div>
         </div>
      )}

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
               <thead className="bg-slate-50 text-[11px] font-bold uppercase text-slate-500 tracking-wider">
                  <tr>
                     <th className="px-6 py-4 border-b border-slate-200"># ID</th>
                     <th className="px-6 py-4 border-b border-slate-200">პროდუქტი & შემსყიდველი</th>
                     <th className="px-6 py-4 border-b border-slate-200 text-center">რაოდენობა</th>
                     <th className="px-6 py-4 border-b border-slate-200">დაბრუნების მიზეზი</th>
                     <th className="px-6 py-4 border-b border-slate-200 text-center">მდგომარეობა</th>
                     <th className="px-6 py-4 border-b border-slate-200 text-center">სტატუსი</th>
                     <th className="px-6 py-4 border-b border-slate-200 text-right">ბუღალტერია</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-100">
                  {returns.map(r => (
                     <tr key={r.id} className="hover:bg-slate-50/80 transition-colors group">
                        <td className="px-6 py-4 font-mono text-[11px] font-semibold text-slate-400">{r.id.split('-')[0]}</td>
                        <td className="px-6 py-4">
                            <div className="font-bold text-slate-800 mb-0.5">{r.product?.name}</div>
                            <div className="text-[11px] font-medium text-slate-500">მომხმ: {r.order?.customer_first_name} {r.order?.customer_last_name}</div>
                        </td>
                        <td className="px-6 py-4 text-center font-bold text-slate-700">{r.quantity} ც</td>
                        <td className="px-6 py-4 text-xs font-medium text-slate-600 truncate max-w-[200px]" title={r.return_reason}>{r.return_reason}</td>
                        <td className="px-6 py-4 text-center">
                           <span className={`inline-flex px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${r.condition === 'RESELLABLE' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : r.condition === 'DEFECTIVE' ? 'bg-amber-50 text-amber-600 border border-amber-200' : 'bg-red-50 text-red-600 border border-red-200'}`}>
                              {r.condition}
                           </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                           {r.status === 'PENDING' && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold text-amber-600 bg-amber-50 border border-amber-200 rounded-lg"><AlertTriangle size={12}/> მოლოდინში</span>}
                           {r.status === 'PROCESSED' && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-lg"><CheckCircle size={12}/> დასრულებული</span>}
                           {r.status === 'REJECTED' && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold text-red-600 bg-red-50 border border-red-200 rounded-lg"><XCircle size={12}/> უარყოფილი</span>}
                        </td>
                        <td className="px-6 py-4 text-right">
                           {r.status === 'PENDING' ? (
                              <button onClick={() => processReturn(r.id)} className="inline-flex p-2.5 bg-white border border-slate-200 shadow-sm rounded-lg text-emerald-600 hover:bg-emerald-50 hover:border-emerald-200 transition-all outline-none cursor-pointer group-hover:shadow" title="ბუღალტერიაში გატარება">
                                 <RefreshCcw size={16} className="rotate-0 hover:rotate-180 transition-transform duration-500" />
                              </button>
                           ) : r.status === 'PROCESSED' ? (
                              <span className="inline-flex p-2.5 text-slate-300">
                                  <CheckCircle size={16} />
                              </span>
                           ) : null}
                        </td>
                     </tr>
                  ))}
                  {returns.length === 0 && (
                     <tr>
                        <td colSpan={7} className="px-6 py-16 text-center">
                            <div className="flex flex-col items-center justify-center text-slate-400">
                                <RefreshCcw size={48} className="mb-4 opacity-20" />
                                <p className="text-sm font-medium">დაბრუნებული პროდუქცია ჯერ არ არის</p>
                            </div>
                        </td>
                     </tr>
                  )}
               </tbody>
            </table>
        </div>
      </div>
    </div>
  );
}
