import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { Loader2, RefreshCcw, CheckCircle, XCircle, AlertTriangle, Plus, Save } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';

export default function ReturnsModule() {
  const { user } = useAuth();
  const [returns, setReturns] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);

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

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [retRes, ordRes, prodRes] = await Promise.all([
        supabase.from('product_returns').select('*, order:order_id(id, customer_first_name, customer_last_name), product:product_id(name)').order('created_at', { ascending: false }),
        supabase.from('orders').select('*').order('created_at', { ascending: false }),
        supabase.from('products').select('*')
      ]);
      
      if (retRes.data) setReturns(retRes.data);
      if (ordRes.data) setOrders(ordRes.data);
      if (prodRes.data) setProducts(prodRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
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
      setNewReturn({ order_id: '', product_id: '', quantity: 1, return_reason: '', condition: 'RESELLABLE' });
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
        <h2 className="text-2xl font-serif text-white">პროდუქციის დაბრუნება (RMA)</h2>
        <button onClick={() => setIsAdding(!isAdding)} className="px-4 py-2 bg-amber-600 rounded-xl text-xs font-bold uppercase transition flex items-center gap-2 hover:bg-amber-500 text-white border-none cursor-pointer outline-none">
           {isAdding ? 'გაუქმება' : <><Plus size={16}/> მოთხოვნის დამატება</>}
        </button>
      </div>

      {isAdding && (
         <div className="bg-stone-900 border border-stone-800 rounded-xl p-6 mb-6">
            <h3 className="text-sm font-semibold text-white mb-4">ახალი დაბრუნება</h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
               <div>
                  <label className="block text-xs uppercase text-stone-400 mb-2">შეკვეთა</label>
                  <select value={newReturn.order_id} onChange={e => setNewReturn({...newReturn, order_id: e.target.value})} className="w-full bg-stone-950 border border-stone-800 rounded-xl p-3 text-white outline-none">
                     <option value="">-- აირჩიეთ შეკვეთა --</option>
                     {orders.map(o => <option key={o.id} value={o.id}>#{o.id.slice(0,8)} - {o.customer_first_name} {o.customer_last_name}</option>)}
                  </select>
               </div>
               <div>
                  <label className="block text-xs uppercase text-stone-400 mb-2">პროდუქტი</label>
                  <select value={newReturn.product_id} onChange={e => setNewReturn({...newReturn, product_id: e.target.value})} className="w-full bg-stone-950 border border-stone-800 rounded-xl p-3 text-white outline-none">
                     <option value="">-- აირჩიეთ პროდუქტი --</option>
                     {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
               </div>
               <div>
                  <label className="block text-xs uppercase text-stone-400 mb-2">რაოდენობა</label>
                  <input type="number" min="1" value={newReturn.quantity} onChange={e => setNewReturn({...newReturn, quantity: parseInt(e.target.value)})} className="w-full bg-stone-950 border border-stone-800 rounded-xl p-3 text-white outline-none" />
               </div>
               <div>
                  <label className="block text-xs uppercase text-stone-400 mb-2">ფიზიკური მდგომარეობა</label>
                  <select value={newReturn.condition} onChange={e => setNewReturn({...newReturn, condition: e.target.value})} className="w-full bg-stone-950 border border-stone-800 rounded-xl p-3 text-white outline-none">
                     <option value="RESELLABLE">რეალიზებადი (RESELLABLE)</option>
                     <option value="DEFECTIVE">წუნდებული (DEFECTIVE)</option>
                     <option value="DAMAGED">დაზიანებული (DAMAGED)</option>
                  </select>
               </div>
            </div>
            <div className="mb-4">
               <label className="block text-xs uppercase text-stone-400 mb-2">დაბრუნების მიზეზი / კომენტარი</label>
               <textarea value={newReturn.return_reason} onChange={e => setNewReturn({...newReturn, return_reason: e.target.value})} className="w-full bg-stone-950 border border-stone-800 rounded-xl p-3 text-white outline-none h-24"></textarea>
            </div>
            <button onClick={handleCreateReturn} className="px-6 py-3 bg-brand-600 rounded-xl text-white text-xs font-bold uppercase hover:bg-brand-500 cursor-pointer border-none outline-none flex items-center gap-2">
               <Save size={16}/> შენახვა / ინიცირება
            </button>
         </div>
      )}

      <div className="bg-stone-900 border border-stone-800 rounded-xl overflow-hidden">
        <table className="w-full text-left text-sm text-stone-300">
           <thead className="bg-stone-950 text-xs uppercase text-stone-500">
              <tr>
                 <th className="px-6 py-4">ID</th>
                 <th className="px-6 py-4">პროდუქტი</th>
                 <th className="px-6 py-4">რაოდენობა</th>
                 <th className="px-6 py-4">მიზეზი</th>
                 <th className="px-6 py-4">მდგომარეობა</th>
                 <th className="px-6 py-4">სტატუსი</th>
                 <th className="px-6 py-4 text-right">მოქმედება</th>
              </tr>
           </thead>
           <tbody className="divide-y divide-stone-800">
              {returns.map(r => (
                 <tr key={r.id} className="hover:bg-stone-800 transition">
                    <td className="px-6 py-4 font-mono text-xs">{r.id.split('-')[0]}</td>
                    <td className="px-6 py-4">{r.product?.name} <br/><span className="text-xs text-stone-500">შეკვეთა: {r.order?.customer_first_name}</span></td>
                    <td className="px-6 py-4">{r.quantity}</td>
                    <td className="px-6 py-4 truncate max-w-[150px]">{r.return_reason}</td>
                    <td className="px-6 py-4">
                       <span className={`px-2 py-1 rounded text-xs font-bold ${r.condition === 'RESELLABLE' ? 'bg-emerald-900/50 text-emerald-400' : 'bg-red-900/50 text-red-500'}`}>
                          {r.condition}
                       </span>
                    </td>
                    <td className="px-6 py-4">
                       {r.status === 'PENDING' && <span className="text-amber-500 flex items-center gap-1"><AlertTriangle size={14}/> მოლოდინში</span>}
                       {r.status === 'PROCESSED' && <span className="text-emerald-500 flex items-center gap-1"><CheckCircle size={14}/> დასრულებული</span>}
                       {r.status === 'REJECTED' && <span className="text-red-500 flex items-center gap-1"><XCircle size={14}/> უარყოფილი</span>}
                    </td>
                    <td className="px-6 py-4 text-right">
                       {r.status === 'PENDING' && (
                          <button onClick={() => processReturn(r.id)} className="p-2 bg-emerald-600 rounded text-white hover:bg-emerald-500 transition outline-none border-none cursor-pointer" title="ბუღალტერიაში გატარება">
                             <RefreshCcw size={16} />
                          </button>
                       )}
                    </td>
                 </tr>
              ))}
              {returns.length === 0 && (
                 <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-stone-500">დაბრუნებები არ არის</td>
                 </tr>
              )}
           </tbody>
        </table>
      </div>
    </div>
  );
}
