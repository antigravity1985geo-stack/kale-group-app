import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { Package, Plus, Search, FileText, FileCheck, Truck, ArrowRight, Loader2, RefreshCw } from 'lucide-react';

export default function PurchasesModule() {
  const [activeTab, setActiveTab] = useState<'suppliers' | 'orders' | 'receipts'>('orders');
  const [loading, setLoading] = useState(false);
  
  // Stubs for future data fetching
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [goodsReceipts, setGoodsReceipts] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'suppliers') {
        const { data } = await supabase.from('suppliers').select('*').order('name');
        if (data) setSuppliers(data);
      } else if (activeTab === 'orders') {
        const { data } = await supabase.from('purchase_orders')
          .select('*, suppliers(name)')
          .order('order_date', { ascending: false });
        if (data) setPurchaseOrders(data);
      } else if (activeTab === 'receipts') {
        const { data } = await supabase.from('goods_receipts')
          .select('*, suppliers(name)')
          .order('receipt_date', { ascending: false });
        if (data) setGoodsReceipts(data);
      }
    } catch (error) {
      console.error("Error fetching purchases data:", error);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'suppliers', label: 'მომწოდებლები', icon: <Package size={16} /> },
    { id: 'orders', label: 'შესყიდვის ორდერები (PO)', icon: <FileText size={16} /> },
    { id: 'receipts', label: 'მიღება-ჩაბარება (GRN)', icon: <Truck size={16} /> }
  ];

  return (
    <div className="space-y-6">
      {/* Header & Navigation */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-2xl font-serif text-slate-800 flex items-center gap-3">
            <Truck className="text-emerald-500" />
            შესყიდვები და მომწოდებლები
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            მართეთ მომწოდებლები, შესყიდვის შეკვეთები და მარაგების მიღება
          </p>
        </div>
        
        <div className="flex bg-white shadow-sm p-1 rounded-xl border border-slate-200">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all outline-none border-none cursor-pointer ${
                activeTab === tab.id 
                  ? 'bg-emerald-600 text-slate-800 shadow-lg' 
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/50 bg-transparent'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex justify-between items-center bg-white shadow-sm/50 p-4 rounded-xl border border-slate-200">
        <div className="relative w-72">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="ძიება..." 
            className="w-full bg-white shadow-sm border border-slate-300 rounded-lg pl-10 pr-4 py-2 text-sm text-slate-800 focus:border-emerald-500 transition-all outline-none"
          />
        </div>
        
        <div className="flex gap-2">
          <button onClick={fetchData} className="px-3 py-2 bg-stone-800 hover:bg-stone-700 text-slate-800 rounded-lg transition-colors border-none cursor-pointer outline-none flex items-center justify-center">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-slate-800 rounded-lg font-semibold text-sm transition-all border-none cursor-pointer outline-none">
            <Plus size={16} /> 
            {activeTab === 'suppliers' ? 'ახალი მომწოდებელი' : activeTab === 'orders' ? 'ახალი PO' : 'ახალი მიღება'}
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="bg-white shadow-sm rounded-xl border border-slate-200 overflow-hidden min-h-[400px]">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 text-emerald-500">
            <Loader2 size={32} className="animate-spin mb-4" />
            <p className="text-sm font-bold tracking-widest uppercase text-slate-500">მონაცემები იტვირთება...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            {activeTab === 'suppliers' && (
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                  <tr>
                    <th className="px-6 py-4 font-semibold text-slate-600">კოდი</th>
                    <th className="px-6 py-4 font-semibold text-slate-600">დასახელება</th>
                    <th className="px-6 py-4 font-semibold text-slate-600">საიდენტიფიკაციო კოდი</th>
                    <th className="px-6 py-4 font-semibold text-slate-600 text-right">სტატუსი</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {suppliers.map(sup => (
                    <tr key={sup.id} className="hover:bg-slate-100/50/50 transition-colors">
                      <td className="px-6 py-4 font-mono text-slate-500">{sup.supplier_code}</td>
                      <td className="px-6 py-4 font-semibold text-slate-800">{sup.name}</td>
                      <td className="px-6 py-4 text-slate-600">{sup.tax_id || '-'}</td>
                      <td className="px-6 py-4 text-right">
                         <span className="px-2 py-1 bg-emerald-500/10 text-emerald-400 text-[10px] uppercase font-bold rounded">აქტიური</span>
                      </td>
                    </tr>
                  ))}
                  {suppliers.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-slate-400">
                        მომწოდებლები ვერ მოიძებნა
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}

            {activeTab === 'orders' && (
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                  <tr>
                    <th className="px-6 py-4 font-semibold text-slate-600">PO #</th>
                    <th className="px-6 py-4 font-semibold text-slate-600">თარიღი</th>
                    <th className="px-6 py-4 font-semibold text-slate-600">მომწოდებელი</th>
                    <th className="px-6 py-4 font-semibold text-slate-600 text-right">ჯამი</th>
                    <th className="px-6 py-4 font-semibold text-slate-600 text-right">სტატუსი</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {purchaseOrders.map(po => (
                    <tr key={po.id} className="hover:bg-slate-100/50/50 transition-colors">
                      <td className="px-6 py-4 font-mono text-slate-500">{po.po_number}</td>
                      <td className="px-6 py-4 text-slate-600">{new Date(po.order_date).toLocaleDateString()}</td>
                      <td className="px-6 py-4 font-semibold text-slate-800">{po.suppliers?.name}</td>
                      <td className="px-6 py-4 text-right font-medium text-emerald-400">₾{Number(po.total_amount).toLocaleString()}</td>
                      <td className="px-6 py-4 text-right">
                         <span className={`px-2 py-1 text-[10px] uppercase font-bold rounded ${
                           po.status === 'DRAFT' ? 'bg-stone-800 text-slate-500' :
                           po.status === 'RECEIVED' ? 'bg-emerald-500/10 text-emerald-400' :
                           'bg-amber-500/10 text-amber-400'
                         }`}>
                           {po.status}
                         </span>
                      </td>
                    </tr>
                  ))}
                  {purchaseOrders.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                        შესყიდვის ორდერები ვერ მოიძებნა
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}

            {activeTab === 'receipts' && (
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                  <tr>
                    <th className="px-6 py-4 font-semibold text-slate-600">GRN #</th>
                    <th className="px-6 py-4 font-semibold text-slate-600">თარიღი</th>
                    <th className="px-6 py-4 font-semibold text-slate-600">მომწოდებელი</th>
                    <th className="px-6 py-4 font-semibold text-slate-600">საწყობი</th>
                    <th className="px-6 py-4 font-semibold text-slate-600 text-right">სტატუსი</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {goodsReceipts.map(gr => (
                    <tr key={gr.id} className="hover:bg-slate-100/50/50 transition-colors">
                      <td className="px-6 py-4 font-mono text-slate-500">{gr.grn_number}</td>
                      <td className="px-6 py-4 text-slate-600">{new Date(gr.receipt_date).toLocaleDateString()}</td>
                      <td className="px-6 py-4 font-semibold text-slate-800">{gr.suppliers?.name}</td>
                      <td className="px-6 py-4 text-slate-600">{gr.warehouse_destination}</td>
                      <td className="px-6 py-4 text-right">
                         <span className={`px-2 py-1 text-[10px] uppercase font-bold rounded ${
                           gr.status === 'DRAFT' ? 'bg-stone-800 text-slate-500' :
                           'bg-emerald-500/10 text-emerald-400'
                         }`}>
                           {gr.status}
                         </span>
                      </td>
                    </tr>
                  ))}
                  {goodsReceipts.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                        მიღება-ჩაბარების აქტები ვერ მოიძებნა
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
