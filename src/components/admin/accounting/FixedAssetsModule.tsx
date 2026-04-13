import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, Play, CheckCircle2, AlertCircle, TrendingDown, DollarSign } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

interface FixedAsset {
  id: string;
  code: string;
  name: string;
  category: string;
  purchase_date: string;
  purchase_price: number;
  lifespan_months: number;
  accumulated_depreciation: number;
  status: 'ACTIVE' | 'DISPOSED';
}

export default function FixedAssetsModule() {
  const [assets, setAssets] = useState<FixedAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [depreciating, setDepreciating] = useState(false);
  const [toast, setToast] = useState<{msg: string, type: 'ok'|'err'} | null>(null);

  const [form, setForm] = useState({
    code: '',
    name: '',
    category: 'IT Equipment',
    purchase_date: new Date().toISOString().split('T')[0],
    purchase_price: '',
    lifespan_months: '36',
  });

  const fetchAssets = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('fixed_assets').select('*').order('created_at', { ascending: false });
    if (data) setAssets(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchAssets();
  }, []);

  const showMsg = (msg: string, type: 'ok'|'err') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.purchase_price) return;
    
    const { error } = await supabase.from('fixed_assets').insert({
      code: form.code || `FA-${Math.floor(Date.now()/1000)}`,
      name: form.name,
      category: form.category,
      purchase_date: form.purchase_date,
      purchase_price: Number(form.purchase_price),
      lifespan_months: Number(form.lifespan_months),
      accumulated_depreciation: 0,
      status: 'ACTIVE'
    });

    if (error) {
       showMsg(error.message, 'err');
    } else {
       showMsg('ძირითადი საშუალება დამატებულია', 'ok');
       setShowForm(false);
       fetchAssets();
    }
  };

  const runDepreciation = async () => {
    if (!confirm('დარწმუნებული ხართ რომ გსურთ მიმდინარე თვის ცვეთის დარიცხვა ყელა აქტიურ საშუალებაზე?')) return;
    setDepreciating(true);
    try {
      // 1. Get Open Fiscal Period
      const { data: period } = await supabase.from('fiscal_periods').select('id').eq('status', 'OPEN').order('period_year', { ascending: false }).limit(1).single();
      if (!period) throw new Error("ღია ფისკალური პერიოდი ვერ მოიძებნა");

      // 2. We should ideally call a stored prod or backend route. For simplicity we will use our backend Vercel route if we had one. 
      // But we can do it directly: Find all Active Assets
      const activeAssets = assets.filter(a => a.status === 'ACTIVE' && a.accumulated_depreciation < a.purchase_price);
      if (activeAssets.length === 0) throw new Error("არ მოიძებნა ცვეთადი აქტივები");

      let totalDepreciation = 0;
      const updates = [];

      for (const asset of activeAssets) {
        const monthlyDepreciation = asset.purchase_price / asset.lifespan_months;
        const remaining = asset.purchase_price - asset.accumulated_depreciation;
        const toDepreciate = remaining < monthlyDepreciation ? remaining : monthlyDepreciation;
        
        if (toDepreciate > 0) {
          totalDepreciation += toDepreciate;
          updates.push({
            id: asset.id,
            accumulated_depreciation: asset.accumulated_depreciation + toDepreciate
          });
        }
      }

      if (updates.length > 0) {
         // Create Journal Entry
         const { data: accounts } = await supabase.from('accounts').select('id, code').in('code', ['7400', '2100']);
         // 7400 = Depreciation Expense, 2100 = Accumulated Depreciation
         const expId = accounts?.find(a => a.code === '7400')?.id;
         const accId = accounts?.find(a => a.code === '2100')?.id;

         if (expId && accId) {
            const { data: je, error: jeErr } = await supabase.from('journal_entries').insert({
               entry_number: `DEP-${Math.floor(Date.now() / 1000)}`,
               entry_date: new Date().toISOString().split('T')[0],
               description: `ყოველთვიური ცვეთის დარიცხვა (${updates.length} აქტივი)`,
               reference_type: 'DEPRECIATION',
               fiscal_period_id: period.id,
               status: 'POSTED'
            }).select().single();

            if (jeErr) throw jeErr;

            await supabase.from('journal_lines').insert([
               { journal_entry_id: je.id, account_id: expId, debit: totalDepreciation, credit: 0 },
               { journal_entry_id: je.id, account_id: accId, debit: 0, credit: totalDepreciation },
            ]);
            
            // Mass update assets (using repeated singles because Supabase UI client lacks mass update without eq)
            for (const upd of updates) {
               await supabase.from('fixed_assets').update({ accumulated_depreciation: upd.accumulated_depreciation }).eq('id', upd.id);
            }
         }
      }
      
      showMsg('ცვეთის დარიცხვა წარმატებით დასრულდა', 'ok');
      fetchAssets();
    } catch(e: any) {
      showMsg(e.message, 'err');
    } finally {
      setDepreciating(false);
    }
  };

  const filtered = assets.filter(a => a.name.toLowerCase().includes(search.toLowerCase()) || a.category.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="admin-fade-in space-y-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-xl text-sm font-medium shadow-xl border animate-in slide-in-from-top-2 ${
          toast.type === 'ok' ? 'bg-emerald-900 text-emerald-200 border-emerald-700' : 'bg-red-900 text-red-200 border-red-700'
        }`}>{toast.msg}</div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-admin-text flex items-center gap-2"><TrendingDown size={22} /> ძირითადი საშუალებები</h2>
          <p className="text-admin-muted text-sm mt-1">Fixed Assets & Depreciation Management</p>
        </div>
        <div className="flex gap-2">
           <button onClick={runDepreciation} disabled={depreciating} className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-bold transition-all shadow-sm border border-admin-muted/10 disabled:opacity-50">
             <Play size={16} /> 
             {depreciating ? 'მიმდინარეობს...' : 'ცვეთის დარიცხვა'}
           </button>
           <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-admin-bg0 text-admin-text rounded-xl text-sm font-medium transition-all shadow-lg shadow-amber-900/30">
             <Plus size={16} /> {showForm ? 'გაუქმება' : 'დამატება'}
           </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="bg-white shadow-sm/90 border border-admin-muted/10 rounded-2xl p-6 space-y-5 animate-in slide-in-from-top-4">
           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div><label className="text-brand-600 font-bold tracking-widest text-[10px] uppercase mb-2 block">კოდი (N)</label>
                <input value={form.code} onChange={e => setForm({...form, code: e.target.value})} placeholder="FA-001"
                  className="w-full bg-admin-bg border border-admin-muted/10 rounded-xl px-3 py-2 text-admin-text text-sm focus:outline-none focus:border-gold-500 focus:bg-white transition-all shadow-sm" />
              </div>
              <div><label className="text-brand-600 font-bold tracking-widest text-[10px] uppercase mb-2 block">დასახელება *</label>
                <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} required
                  className="w-full bg-admin-bg border border-admin-muted/10 rounded-xl px-3 py-2 text-admin-text text-sm focus:outline-none focus:border-gold-500 focus:bg-white transition-all shadow-sm" />
              </div>
              <div><label className="text-brand-600 font-bold tracking-widest text-[10px] uppercase mb-2 block">კატეგორია</label>
                 <select value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="w-full bg-admin-bg border border-admin-muted/10 rounded-xl px-3 py-2 text-admin-text text-sm focus:outline-none focus:border-gold-500 focus:bg-white transition-all shadow-sm">
                    <option value="IT Equipment">IT აღჭურვილობა (3 წელი)</option>
                    <option value="Vehicles">მანქანა-დანადგარები (5 წელი)</option>
                    <option value="Furniture">ავეჯი (5 წელი)</option>
                    <option value="Buildings">შენობა-ნაგებობები (20 წელი)</option>
                 </select>
              </div>
              <div><label className="text-brand-600 font-bold tracking-widest text-[10px] uppercase mb-2 block">შეძენის თარიღი</label>
                <input type="date" value={form.purchase_date} onChange={e => setForm({...form, purchase_date: e.target.value})} required
                  className="w-full bg-admin-bg border border-admin-muted/10 rounded-xl px-3 py-2 text-admin-text text-sm focus:outline-none focus:border-gold-500 focus:bg-white transition-all shadow-sm" />
              </div>
              <div><label className="text-brand-600 font-bold tracking-widest text-[10px] uppercase mb-2 block">ღირებულება *</label>
                <input type="number" step="0.01" value={form.purchase_price} onChange={e => setForm({...form, purchase_price: e.target.value})} required
                  className="w-full bg-admin-bg border border-admin-muted/10 rounded-xl px-3 py-2 text-admin-text text-sm focus:outline-none focus:border-gold-500 focus:bg-white transition-all shadow-sm" />
              </div>
              <div><label className="text-brand-600 font-bold tracking-widest text-[10px] uppercase mb-2 block">ცვეთის ვადა (თვე)</label>
                <input type="number" min="1" value={form.lifespan_months} onChange={e => setForm({...form, lifespan_months: e.target.value})} required
                  className="w-full bg-admin-bg border border-admin-muted/10 rounded-xl px-3 py-2 text-admin-text text-sm focus:outline-none focus:border-gold-500 focus:bg-white transition-all shadow-sm" />
              </div>
           </div>
           <div className="flex justify-end"><button type="submit" className="px-6 py-2 bg-brand-600 text-admin-text font-bold rounded-xl text-sm">დამატება</button></div>
        </form>
      )}

      {/* Filters & Search */}
      <div className="relative">
         <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
         <input value={search} onChange={e => setSearch(e.target.value)} placeholder="ძიება დასახელებით..."
            className="w-full sm:max-w-md pl-10 pr-4 py-2.5 bg-white border-none shadow-sm rounded-2xl focus:ring-4 focus:ring-admin-primary/5 transition-all text-admin-text text-sm focus:outline-none focus:border-brand-500" />
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-2">{Array(4).fill(0).map((_, i) => <div key={i} className="h-16 bg-white shadow-sm animate-pulse rounded-xl" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400 bg-white shadow-sm rounded-xl border border-admin-muted/10 border-dashed"><TrendingDown size={40} className="mx-auto mb-3 opacity-30" /><p>აქტივები არ მოიძებნა</p></div>
      ) : (
        <div className="bg-white shadow-sm border border-admin-muted/10 rounded-2xl overflow-hidden">
           <table className="w-full text-left border-collapse">
              <thead><tr className="bg-slate-50 text-admin-muted text-xs uppercase tracking-wider border-b border-admin-muted/10">
                 <th className="py-3 px-4 font-semibold">დასახელება</th>
                 <th className="py-3 px-4 font-semibold">შეძენა</th>
                 <th className="py-3 px-4 font-semibold text-right">ღირებულება</th>
                 <th className="py-3 px-4 font-semibold text-right">ნარჩენი ღირ.</th>
                 <th className="py-3 px-4 font-semibold text-center">სტატუსი</th>
              </tr></thead>
              <tbody>
                 {filtered.map(asset => {
                    const remaining = asset.purchase_price - asset.accumulated_depreciation;
                    const isFullyDepreciated = remaining <= 0.01;
                    return (
                       <tr key={asset.id} className="border-b border-admin-muted/10 last:border-0 hover:bg-slate-50 transition">
                          <td className="py-3 px-4">
                             <div className="font-semibold text-admin-text text-sm">{asset.name}</div>
                             <div className="text-[11px] text-slate-400 font-mono mt-0.5">{asset.code} • {asset.category}</div>
                          </td>
                          <td className="py-3 px-4">
                             <div className="text-slate-600 text-sm">{asset.purchase_date}</div>
                             <div className="text-slate-400 text-xs mt-0.5">{asset.lifespan_months} თვე</div>
                          </td>
                          <td className="py-3 px-4 text-right">
                             <div className="text-sm font-semibold text-admin-text">₾ {asset.purchase_price.toFixed(2)}</div>
                             <div className="text-xs text-rose-500 line-through decoration-rose-300 mt-0.5" title="დარიცხული ცვეთა">
                                - {asset.accumulated_depreciation.toFixed(2)}
                             </div>
                          </td>
                          <td className="py-3 px-4 text-right">
                             <div className={`text-sm font-bold ${isFullyDepreciated ? 'text-slate-400' : 'text-emerald-600'}`}>
                                ₾ {remaining.toFixed(2)}
                             </div>
                             {isFullyDepreciated && <div className="text-[10px] text-amber-500 mt-0.5 font-bold uppercase tracking-wider">ჩამოწერილი</div>}
                          </td>
                          <td className="py-3 px-4 text-center">
                             <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wider ${
                                asset.status === 'ACTIVE' 
                                  ? (isFullyDepreciated ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700')
                                  : 'bg-rose-100 text-rose-700'
                             }`}>
                                {asset.status === 'ACTIVE' ? (isFullyDepreciated ? 'FULLY DEPR' : 'ACTIVE') : 'DISPOSED'}
                             </span>
                          </td>
                       </tr>
                    )
                 })}
              </tbody>
           </table>
        </div>
      )}
    </div>
  );
}
