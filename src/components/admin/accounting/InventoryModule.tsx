import React, { useState, useEffect, useCallback } from 'react';
import { Warehouse, AlertTriangle, Plus, Search, ArrowDownCircle, ArrowUpCircle, RefreshCw } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

const GEL = (v: number | string) => Number(v).toLocaleString('ka-GE', { minimumFractionDigits: 2 }) + ' ₾';

const TRANSACTION_TYPES = [
  'PURCHASE_IN','SALE_OUT','RETURN_IN','RETURN_OUT',
  'ADJUSTMENT_IN','ADJUSTMENT_OUT','WRITE_OFF','OPENING'
];

const TYPE_STYLES: Record<string, string> = {
  PURCHASE_IN:    'text-emerald-300 bg-emerald-900/30 border-emerald-700/40',
  SALE_OUT:       'text-red-300 bg-red-900/30 border-red-700/40',
  RETURN_IN:      'text-blue-300 bg-blue-900/30 border-blue-700/40',
  RETURN_OUT:     'text-orange-300 bg-orange-900/30 border-orange-700/40',
  ADJUSTMENT_IN:  'text-teal-300 bg-teal-900/30 border-teal-700/40',
  ADJUSTMENT_OUT: 'text-amber-300 bg-amber-900/30 border-amber-700/40',
  WRITE_OFF:      'text-red-400 bg-red-900/20 border-red-800/40',
  OPENING:        'text-slate-600 bg-stone-800/50 border-slate-300/40',
};

export default function InventoryModule() {
  const [tab, setTab] = useState<'levels' | 'transactions' | 'adjust'>('levels');
  const [levels, setLevels] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null);

  // Adjustment form
  const [adjForm, setAdjForm] = useState({
    product_id: '', quantity: '', type: 'ADJUSTMENT_IN', unit_cost: '', notes: ''
  });
  const [products, setProducts] = useState<any[]>([]);

  const getToken = async () => (await supabase.auth.getSession()).data.session?.access_token || '';

  const fetchLevels = useCallback(async () => {
    setLoading(true);
    const token = await getToken();
    const res = await fetch('/api/accounting/inventory/levels', { headers: { Authorization: `Bearer ${token}` } });
    const json = await res.json();
    setLevels(json.levels || []);
    setLoading(false);
  }, []);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    const token = await getToken();
    const res = await fetch('/api/accounting/inventory/transactions?limit=50', { headers: { Authorization: `Bearer ${token}` } });
    const json = await res.json();
    setTransactions(json.transactions || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (tab === 'levels') fetchLevels();
    else if (tab === 'transactions') fetchTransactions();
    else {
      // fetch products for adjustment
      supabase.from('products').select('id, name').then(({ data }) => setProducts(data || []));
    }
  }, [tab, fetchLevels, fetchTransactions]);

  const showToast = (msg: string, type: 'ok' | 'err') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = await getToken();
    const res = await fetch('/api/accounting/inventory/adjustment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ ...adjForm, quantity: Number(adjForm.quantity), unit_cost: adjForm.unit_cost ? Number(adjForm.unit_cost) : null }),
    });
    const json = await res.json();
    if (!res.ok) return showToast(json.error, 'err');
    showToast('კორექტირება შეიქმნა ✓', 'ok');
    setAdjForm({ product_id: '', quantity: '', type: 'ADJUSTMENT_IN', unit_cost: '', notes: '' });
    fetchLevels();
  };

  const filteredLevels = levels.filter(l =>
    l.products?.name?.toLowerCase().includes(search.toLowerCase()) ||
    l.product_id?.toLowerCase().includes(search.toLowerCase())
  );

  const totalInventoryValue = levels.reduce((s, l) => s + Number(l.total_cost_value || 0), 0);
  const lowStock = levels.filter(l => Number(l.quantity_available) <= Number(l.reorder_point));

  return (
    <div className="space-y-6">
      {toast && (
        <div className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-xl text-sm font-medium shadow-xl border ${toast.type === 'ok' ? 'bg-emerald-900 text-emerald-200 border-emerald-700' : 'bg-red-900 text-red-200 border-red-700'}`}>{toast.msg}</div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><Warehouse size={22} /> სასაქონლო მარაგი</h2>
          <p className="text-slate-500 text-sm mt-1">Stock Levels · FIFO · Adjustments</p>
        </div>
        <div className="text-right">
          <p className="text-slate-400 text-xs">სულ ღირ.</p>
          <p className="text-emerald-300 font-bold text-lg">{GEL(totalInventoryValue)}</p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white shadow-sm border border-slate-200 rounded-xl p-4">
          <p className="text-slate-500 text-xs mb-1">სულ პოზიცია</p>
          <p className="text-slate-800 font-bold text-xl">{levels.length}</p>
        </div>
        <div className={`rounded-xl p-4 border ${lowStock.length > 0 ? 'bg-red-900/20 border-red-800/40' : 'bg-white shadow-sm border-slate-200'}`}>
          <p className="text-slate-500 text-xs mb-1 flex items-center gap-1">{lowStock.length > 0 && <AlertTriangle size={12} className="text-red-400" />}Low Stock</p>
          <p className={`font-bold text-xl ${lowStock.length > 0 ? 'text-red-300' : 'text-emerald-300'}`}>{lowStock.length}</p>
        </div>
        <div className="bg-white shadow-sm border border-slate-200 rounded-xl p-4">
          <p className="text-slate-500 text-xs mb-1">მარაგის ღირ.</p>
          <p className="text-teal-300 font-bold text-xl">{GEL(totalInventoryValue)}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white shadow-sm/50 border border-slate-200 p-1 rounded-xl w-fit">
        {([['levels', 'Stock Levels'], ['transactions', 'ტრანზაქც.'], ['adjust', 'კორ.ჩანაწ.']] as const).map(([t, l]) => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-lg text-sm transition-all ${tab === t ? 'bg-brand-600 text-slate-800' : 'text-slate-500 hover:text-slate-800'}`}>{l}</button>
        ))}
      </div>

      {/* Stock Levels Tab */}
      {tab === 'levels' && (
        <>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="პროდუქტის ძება..."
              className="w-full pl-9 pr-4 py-2.5 bg-white shadow-sm border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:border-stone-600" />
          </div>
          {loading ? (
            <div className="space-y-2">{Array(5).fill(0).map((_, i) => <div key={i} className="h-14 bg-white shadow-sm animate-pulse rounded-xl" />)}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-slate-400 text-xs border-b border-slate-200">
                  <th className="text-left py-3 px-4">პროდუქტი</th>
                  <th className="text-right py-3 px-4">ხელთ</th>
                  <th className="text-right py-3 px-4">რეზ.</th>
                  <th className="text-right py-3 px-4">ხელმისაწ.</th>
                  <th className="text-right py-3 px-4">შეკვ. ზღ.</th>
                  <th className="text-right py-3 px-4">სშ. ღირ.</th>
                  <th className="text-right py-3 px-4">სულ ღირ.</th>
                  <th className="text-center py-3 px-4">სტატ.</th>
                </tr></thead>
                <tbody>
                  {filteredLevels.map(l => {
                    const isLow = Number(l.quantity_available) <= Number(l.reorder_point);
                    return (
                      <tr key={l.id} className={`border-b border-slate-200/50 hover:bg-slate-100/50/20 transition-colors ${isLow ? 'bg-red-900/5' : ''}`}>
                        <td className="py-3 px-4 text-slate-800">{l.products?.name || l.product_id?.slice(0, 8) + '...'}</td>
                        <td className="py-3 px-4 text-right text-slate-600">{l.quantity_on_hand}</td>
                        <td className="py-3 px-4 text-right text-amber-400">{l.quantity_reserved}</td>
                        <td className={`py-3 px-4 text-right font-semibold ${isLow ? 'text-red-300' : 'text-emerald-300'}`}>{l.quantity_available}</td>
                        <td className="py-3 px-4 text-right text-slate-500">{l.reorder_point}</td>
                        <td className="py-3 px-4 text-right text-slate-600">{GEL(l.avg_cost || 0)}</td>
                        <td className="py-3 px-4 text-right text-teal-300">{GEL(l.total_cost_value || 0)}</td>
                        <td className="py-3 px-4 text-center">
                          {isLow
                            ? <span className="flex items-center justify-center gap-1 text-xs text-red-400"><AlertTriangle size={12} /> low</span>
                            : <span className="text-xs text-emerald-400">✓</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Transactions Tab */}
      {tab === 'transactions' && (
        loading ? (
          <div className="space-y-2">{Array(5).fill(0).map((_, i) => <div key={i} className="h-14 bg-white shadow-sm animate-pulse rounded-xl" />)}</div>
        ) : (
          <div className="space-y-2">
            {transactions.map(t => {
              const isIn = t.transaction_type.includes('IN') || t.transaction_type === 'OPENING';
              return (
                <div key={t.id} className="flex items-center gap-4 bg-white shadow-sm/80 border border-slate-200/50 rounded-xl px-5 py-3">
                  {isIn ? <ArrowDownCircle size={20} className="text-emerald-400 shrink-0" /> : <ArrowUpCircle size={20} className="text-red-400 shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-800 text-sm">{t.products?.name || 'პროდ. ' + t.product_id?.slice(0, 8)}</p>
                    <p className="text-slate-400 text-xs">{t.notes || '—'}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${TYPE_STYLES[t.transaction_type] || ''}`}>{t.transaction_type}</span>
                  <div className="text-right">
                    <p className={`font-semibold text-sm ${isIn ? 'text-emerald-300' : 'text-red-300'}`}>{isIn ? '+' : '-'}{t.quantity}</p>
                    {t.total_cost && <p className="text-slate-400 text-xs">{GEL(t.total_cost)}</p>}
                  </div>
                  <p className="text-slate-400 text-xs w-24 text-right">{new Date(t.created_at).toLocaleDateString('ka-GE')}</p>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* Adjustment Tab */}
      {tab === 'adjust' && (
        <form onSubmit={handleAdjust} className="bg-white shadow-sm/80 border border-slate-200 rounded-2xl p-6 space-y-4 max-w-lg">
          <h3 className="text-slate-800 font-semibold">📦 მარაგის კორექტირება</h3>
          <div>
            <label className="text-slate-500 text-xs mb-1 block">პროდუქტი *</label>
            <select value={adjForm.product_id} onChange={e => setAdjForm({ ...adjForm, product_id: e.target.value })} required
              className="w-full bg-stone-800 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 text-sm focus:outline-none focus:border-amber-600">
              <option value="">— პროდუქტი —</option>
              {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-slate-500 text-xs mb-1 block">ტიპი *</label>
              <select value={adjForm.type} onChange={e => setAdjForm({ ...adjForm, type: e.target.value })}
                className="w-full bg-stone-800 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 text-sm focus:outline-none focus:border-amber-600">
                {TRANSACTION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-slate-500 text-xs mb-1 block">რაოდ. *</label>
              <input type="number" min="0.01" step="0.01" value={adjForm.quantity} onChange={e => setAdjForm({ ...adjForm, quantity: e.target.value })} required
                className="w-full bg-stone-800 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 text-sm focus:outline-none focus:border-amber-600" placeholder="0" />
            </div>
          </div>
          <div>
            <label className="text-slate-500 text-xs mb-1 block">ერთ. ღირ. (ლარი)</label>
            <input type="number" min="0" step="0.01" value={adjForm.unit_cost} onChange={e => setAdjForm({ ...adjForm, unit_cost: e.target.value })}
              className="w-full bg-stone-800 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 text-sm focus:outline-none focus:border-amber-600" placeholder="0.00" />
          </div>
          <div>
            <label className="text-slate-500 text-xs mb-1 block">შენიშვნა</label>
            <input value={adjForm.notes} onChange={e => setAdjForm({ ...adjForm, notes: e.target.value })}
              className="w-full bg-stone-800 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 text-sm focus:outline-none focus:border-amber-600" placeholder="კორ. მიზეზი..." />
          </div>
          <button type="submit" className="w-full py-2.5 bg-brand-600 hover:bg-brand-500 text-slate-800 rounded-xl text-sm font-medium transition-all">
            <Plus size={16} className="inline mr-2" />კორ. ჩანაწ. შექმნა
          </button>
        </form>
      )}
    </div>
  );
}
