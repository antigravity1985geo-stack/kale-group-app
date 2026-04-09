import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { FileText, Plus, Send, AlertTriangle, CheckCircle2, Loader2, Truck, RefreshCw } from 'lucide-react';

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

export default function WaybillsModule() {
  const [waybills, setWaybills] = useState<Waybill[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState<string | null>(null);
  const [isDrafting, setIsDrafting] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch existing waybills
      const res = await fetch('/api/rs-ge/waybills', {
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        }
      });
      const data = await res.json();
      if (data.waybills) setWaybills(data.waybills);

      // 2. Fetch completed orders that DO NOT have a waybill yet
      const { data: ords } = await supabase
        .from('orders')
        .select('id, customer_first_name, customer_last_name, total_price, shipping_address, city, created_at')
        .in('status', ['confirmed', 'shipped', 'delivered', 'completed'])
        .order('created_at', { ascending: false })
        .limit(50);
        
      if (ords && data.waybills) {
        // Filter out orders that already have a waybill
        const waybillOrderIds = data.waybills.map((w: any) => w.order_id);
        const pendingOrders = ords.filter(o => !waybillOrderIds.includes(o.id));
        setOrders(pendingOrders);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const createDraft = async (order: any) => {
    setIsDrafting(order.id);
    try {
      const res = await fetch('/api/rs-ge/waybill/draft', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        },
        body: JSON.stringify({
          order_id: order.id,
          end_address: `${order.city || ''}, ${order.shipping_address || ''}`.trim(),
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      alert('დრაფტი შეიქმნა');
      fetchData();
    } catch (err: any) {
      alert('შეცდომა: ' + err.message);
    } finally {
      setIsDrafting(null);
    }
  };

  const sendWaybill = async (id: string) => {
    setIsSyncing(id);
    try {
      const res = await fetch('/api/rs-ge/waybill/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        },
        body: JSON.stringify({ waybill_id: id })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      alert('RS.ge-ზე გაიგზავნა წარმატებით!\nზედნადების N: ' + data.waybill.rs_waybill_id);
      fetchData();
    } catch (err: any) {
      alert('შეცდომა: ' + err.message);
    } finally {
      setIsSyncing(null);
    }
  };

  if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-brand-400" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-serif text-slate-800 flex items-center gap-2 mb-1">
            <Truck size={24} /> RS.ge ზედნადებები
          </h2>
          <p className="text-sm text-slate-500">მზა პროდუქციის ტრანსპორტირების ზედნადებების მართვა</p>
        </div>
        <button onClick={fetchData} className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-200 transition border-none cursor-pointer flex items-center gap-2">
          <RefreshCw size={16} /> განახლება
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Outstanding Orders */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
            <AlertTriangle size={18} className="text-amber-500" /> გასაგზავნი შეკვეთები (დრაფტის გარეშე)
          </h3>
          
          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
            {orders.length === 0 ? (
              <p className="text-sm text-slate-400 p-4text-center bg-slate-50 border border-slate-100 rounded-xl">
                გასაგზავნი შეკვეთები არ არის
              </p>
            ) : (
              orders.map(o => (
                <div key={o.id} className="bg-slate-50 border border-slate-200 p-3 rounded-xl flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wider mb-0.5">#{o.id.split('-')[0]}</p>
                    <p className="text-sm font-semibold text-slate-800">{o.customer_first_name} {o.customer_last_name}</p>
                    <p className="text-xs text-slate-500 mt-0.5 truncate w-48" title={o.shipping_address}>{o.city || '—'} / {o.shipping_address || '—'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-teal-600 mb-2">₾{(o.total_price || 0).toLocaleString()}</p>
                    <button 
                      onClick={() => createDraft(o)}
                      disabled={isDrafting === o.id}
                      className="px-3 py-1.5 bg-brand-900 text-gold-400 text-xs font-bold rounded-lg uppercase border-none cursor-pointer hover:bg-brand-950 transition disabled:opacity-50"
                    >
                      {isDrafting === o.id ? <Loader2 size={12} className="animate-spin inline" /> : <Plus size={12} className="inline mr-1" />}
                      დრაფტი
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right: Waybills List */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
            <FileText size={18} className="text-blue-500" /> შექმნილი ზედნადებები
          </h3>
          
          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
            {waybills.length === 0 ? (
              <p className="text-sm text-slate-400 p-4 text-center bg-slate-50 border border-slate-100 rounded-xl">
                ზედნადებები არ მოიძებნა
              </p>
            ) : (
              waybills.map(w => (
                <div key={w.id} className="border border-slate-200 p-4 rounded-xl relative overflow-hidden group">
                  {w.status === 'SENT' && <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500" />}
                  {w.status === 'DRAFT' && <div className="absolute top-0 left-0 w-1 h-full bg-amber-400" />}
                  
                  <div className="flex justify-between items-start mb-3 pl-2">
                    <div>
                      <p className="text-xs text-slate-400 uppercase tracking-widest mb-1">
                        #{w.order_id.split('-')[0]}
                      </p>
                      <p className="text-sm font-bold text-slate-800">
                        {w.orders?.customer_first_name} {w.orders?.customer_last_name}
                      </p>
                    </div>
                    {w.status === 'SENT' ? (
                      <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100">
                        <CheckCircle2 size={12} /> SENT
                      </span>
                    ) : (
                      <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-lg border border-amber-100 uppercase">
                        Draft
                      </span>
                    )}
                  </div>
                  
                  <div className="pl-2 space-y-1 mb-4 text-xs text-slate-600">
                    <p><strong className="font-medium text-slate-400">საიდან:</strong> {w.start_address}</p>
                    <p><strong className="font-medium text-slate-400">სად:</strong> {w.end_address || '—'}</p>
                    {w.rs_waybill_id && (
                      <p className="mt-2"><strong className="font-medium text-slate-400">RS ID:</strong> <span className="font-mono bg-slate-100 px-1 rounded text-slate-800">{w.rs_waybill_id}</span></p>
                    )}
                  </div>

                  {w.status === 'DRAFT' && (
                    <button 
                      onClick={() => sendWaybill(w.id)}
                      disabled={isSyncing === w.id}
                      className="w-full flex justify-center items-center gap-2 py-2.5 bg-blue-50 text-blue-600 border border-blue-200 rounded-xl text-xs font-bold uppercase transition hover:bg-blue-600 hover:text-white cursor-pointer disabled:opacity-50"
                    >
                      {isSyncing === w.id ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Send size={16} />
                      )}
                      რეგისტრაცია (RS.ge)
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
