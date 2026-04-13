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

interface IncomingWaybill {
  id: string;
  supplier_name: string;
  supplier_tin: string;
  rs_waybill_id: string;
  total_amount: number;
  status: 'PENDING_ACCEPTANCE' | 'ACCEPTED' | 'REJECTED';
  received_at: string;
}

export default function WaybillsModule() {
  const [activeTab, setActiveTab] = useState<'outgoing' | 'incoming'>('outgoing');
  const [waybills, setWaybills] = useState<Waybill[]>([]);
  const [incomingWaybills, setIncomingWaybills] = useState<IncomingWaybill[]>([]);
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
        .select('id, customer_first_name, customer_last_name, total_price, customer_address, customer_city, created_at')
        .in('status', ['confirmed', 'shipped', 'delivered', 'completed'])
        .order('created_at', { ascending: false })
        .limit(50);
        
      if (ords && data.waybills) {
        // Filter out orders that already have a waybill
        const waybillOrderIds = data.waybills.map((w: any) => w.order_id);
        const pendingOrders = ords.filter(o => !waybillOrderIds.includes(o.id));
        setOrders(pendingOrders);
      }

      // 3. Fetch incoming waybills
      const { data: incoming } = await supabase
        .from('rs_incoming_waybills')
        .select('*')
        .order('received_at', { ascending: false });
      if (incoming) setIncomingWaybills(incoming as IncomingWaybill[]);

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
          end_address: `${order.customer_city || ''}, ${order.customer_address || ''}`.trim(),
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

  const acceptIncoming = async (id: string) => {
    try {
      const res = await fetch('/api/rs-ge/waybill/incoming/accept', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        },
        body: JSON.stringify({ id })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      alert('მიღება დადასტურებულია!');
      fetchData();
    } catch (err: any) {
      alert('შეცდომა: ' + err.message);
    }
  };

  if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-admin-muted" /></div>;

  return (
    <div className="admin-fade-in space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-sans font-bold text-admin-text flex items-center gap-2 mb-1">
            <Truck size={24} /> RS.ge ზედნადებები
          </h2>
          <p className="text-sm text-admin-muted">მზა პროდუქციის და ნედლეულის ტრანსპორტირების მართვა</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchData} className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-200 transition border-none cursor-pointer flex items-center gap-2">
            <RefreshCw size={16} /> Update
          </button>
        </div>
      </div>

      <div className="flex gap-2 bg-slate-50 border border-admin-muted/10 p-1 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('outgoing')}
          className={`px-6 py-2 rounded-lg text-sm font-bold transition border-none cursor-pointer ${
            activeTab === 'outgoing' ? 'bg-white shadow text-admin-text' : 'bg-transparent text-admin-muted hover:text-slate-700'
          }`}
        >
          📤 გამავალი (გაყიდვები)
        </button>
        <button
          onClick={() => setActiveTab('incoming')}
          className={`px-6 py-2 rounded-lg text-sm font-bold transition border-none cursor-pointer ${
            activeTab === 'incoming' ? 'bg-white shadow text-admin-text' : 'bg-transparent text-admin-muted hover:text-slate-700'
          }`}
        >
          📥 შემომავალი (შესყიდვები)
        </button>
      </div>

      {activeTab === 'outgoing' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Outstanding Orders */}
        <div className="bg-white border border-admin-muted/10 rounded-2xl p-5 shadow-sm">
          <h3 className="font-bold text-admin-text mb-4 flex items-center gap-2">
            <AlertTriangle size={18} className="text-amber-500" /> გასაგზავნი შეკვეთები (დრაფტის გარეშე)
          </h3>
          
          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
            {orders.length === 0 ? (
              <p className="text-sm text-slate-400 p-4text-center bg-slate-50 border border-admin-muted/10 rounded-xl">
                გასაგზავნი შეკვეთები არ არის
              </p>
            ) : (
              orders.map(o => (
                <div key={o.id} className="bg-slate-50 border border-admin-muted/10 p-3 rounded-xl flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wider mb-0.5">#{o.id.split('-')[0]}</p>
                    <p className="text-sm font-semibold text-admin-text">{o.customer_first_name} {o.customer_last_name}</p>
                    <p className="text-xs text-admin-muted mt-0.5 truncate w-48" title={o.customer_address}>{o.customer_city || '—'} / {o.customer_address || '—'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-teal-600 mb-2">₾{(o.total_price || 0).toLocaleString()}</p>
                    <button 
                      onClick={() => createDraft(o)}
                      disabled={isDrafting === o.id}
                      className="px-3 py-1.5 bg-brand-900 text-admin-primary text-xs font-bold rounded-lg uppercase border-none cursor-pointer hover:bg-brand-950 transition disabled:opacity-50"
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
        <div className="bg-white border border-admin-muted/10 rounded-2xl p-5 shadow-sm">
          <h3 className="font-bold text-admin-text mb-4 flex items-center gap-2">
            <FileText size={18} className="text-blue-500" /> შექმნილი ზედნადებები
          </h3>
          
          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
            {waybills.length === 0 ? (
              <p className="text-sm text-slate-400 p-4 text-center bg-slate-50 border border-admin-muted/10 rounded-xl">
                ზედნადებები არ მოიძებნა
              </p>
            ) : (
              waybills.map(w => (
                <div key={w.id} className="border border-admin-muted/10 p-4 rounded-xl relative overflow-hidden group">
                  {w.status === 'SENT' && <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500" />}
                  {w.status === 'DRAFT' && <div className="absolute top-0 left-0 w-1 h-full bg-amber-400" />}
                  
                  <div className="flex justify-between items-start mb-3 pl-2">
                    <div>
                      <p className="text-xs text-slate-400 uppercase tracking-widest mb-1">
                        #{w.order_id.split('-')[0]}
                      </p>
                      <p className="text-sm font-bold text-admin-text">
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
                      <p className="mt-2"><strong className="font-medium text-slate-400">RS ID:</strong> <span className="font-mono bg-slate-100 px-1 rounded text-admin-text">{w.rs_waybill_id}</span></p>
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
      ) : (
        <div className="bg-white border border-admin-muted/10 rounded-2xl p-5 shadow-sm">
          <h3 className="font-bold text-admin-text mb-4 flex items-center gap-2">
            <Truck size={18} className="text-brand-500" /> მომწოდებლებისგან მიღებული ზედნადებები (RS.ge)
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-admin-muted/10 text-sm text-admin-muted">
                  <th className="pb-3 text-xs uppercase tracking-wider font-semibold">RS Waybill ID</th>
                  <th className="pb-3 text-xs uppercase tracking-wider font-semibold">მომწოდებელი</th>
                  <th className="pb-3 text-xs uppercase tracking-wider font-semibold text-right">თანხა</th>
                  <th className="pb-3 text-xs uppercase tracking-wider font-semibold text-center">სტატუსი</th>
                  <th className="pb-3 text-xs uppercase tracking-wider font-semibold">თარიღი</th>
                  <th className="pb-3"></th>
                </tr>
              </thead>
              <tbody>
                {incomingWaybills.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400 text-sm">შემომავალი ზედნადებები არ მოიძებნა</td>
                  </tr>
                ) : (
                  incomingWaybills.map(w => (
                    <tr key={w.id} className="border-b border-admin-muted/10 hover:bg-slate-50 transition">
                      <td className="py-3 font-mono text-sm text-slate-600">{w.rs_waybill_id}</td>
                      <td className="py-3">
                        <div className="text-sm font-bold text-admin-text">{w.supplier_name}</div>
                        <div className="text-xs text-admin-muted">ს/ნ: {w.supplier_tin}</div>
                      </td>
                      <td className="py-3 text-right font-bold text-admin-text">₾{w.total_amount.toLocaleString()}</td>
                      <td className="py-3 text-center">
                        {w.status === 'ACCEPTED' ? (
                          <span className="px-2 py-1 bg-emerald-50 text-emerald-600 rounded text-xs font-bold border border-emerald-100">დადასტურებული</span>
                        ) : w.status === 'PENDING_ACCEPTANCE' ? (
                          <span className="px-2 py-1 bg-amber-50 text-amber-600 rounded text-xs font-bold border border-amber-100">მოლოდინში</span>
                        ) : (
                          <span className="px-2 py-1 bg-rose-50 text-rose-600 rounded text-xs font-bold border border-rose-100">უარყოფილი</span>
                        )}
                      </td>
                      <td className="py-3 text-sm text-admin-muted">{new Date(w.received_at).toLocaleDateString('ka-GE')}</td>
                      <td className="py-3 text-right">
                        {w.status === 'PENDING_ACCEPTANCE' && (
                          <button
                            onClick={() => acceptIncoming(w.id)}
                            className="bg-brand-600 hover:bg-brand-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition border-none cursor-pointer"
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
        </div>
      )}
    </div>
  );
}
