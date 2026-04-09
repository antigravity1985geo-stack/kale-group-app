import React, { useState, useEffect } from 'react';
import { Landmark, FileCheck2, Calculator, LogOut, ChevronRight } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

const GEL = (v: number | string) => Number(v).toLocaleString('ka-GE', { minimumFractionDigits: 2 }) + ' ₾';

export default function TaxesModule() {
  const [loading, setLoading] = useState(false);
  const [periods, setPeriods] = useState<any[]>([]);
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null);

  const [form, setForm] = useState({
    amount: '',
    date: new Date().toISOString().split('T')[0],
    fiscal_period_id: ''
  });

  const getToken = async () => (await supabase.auth.getSession()).data.session?.access_token || '';

  useEffect(() => {
    getToken().then(async token => {
      const res = await fetch('/api/accounting/fiscal-periods', { headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      const open = (json.periods || []).filter((p: any) => p.status === 'OPEN');
      setPeriods(open);
      if (open.length > 0) setForm(f => ({ ...f, fiscal_period_id: open[0].id }));
    });
  }, []);

  const showToast = (msg: string, type: 'ok' | 'err') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleDeclare = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const token = await getToken();
    const res = await fetch('/api/accounting/dividends/declare', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(form),
    });
    const json = await res.json();
    setLoading(false);

    if (!res.ok) return showToast(json.error, 'err');
    showToast(`მოგება დადეკლარირდა. Profit Tax (15%): ${GEL(json.profit_tax)}`, 'ok');
    setForm({ ...form, amount: '' });
  };

  const amountNum = Number(form.amount || 0);
  const profitTax = (amountNum / 0.85) * 0.15;
  const totalDeduction = amountNum + profitTax;

  return (
    <div className="space-y-6">
      {toast && (
        <div className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-xl text-sm font-medium shadow-xl border ${toast.type === 'ok' ? 'bg-emerald-900 text-emerald-200 border-emerald-700' : 'bg-red-900 text-red-200 border-red-700'}`}>
          {toast.msg}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Landmark size={24} className="text-brand-600" /> 
            გადასახადები & დივიდენდები
          </h2>
          <p className="text-slate-500 text-sm mt-1">ჩამოწერეთ მოგება ესტონური მოდელით (15% მოგ. გადასახადი)</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Declare Form */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
          <h3 className="text-lg font-semibold text-slate-800 mb-6 flex items-center gap-2">
            <LogOut size={18} className="text-amber-500" />
            გასანაწილებელი მოგება (დივიდენდი)
          </h3>
          <form onSubmit={handleDeclare} className="space-y-4">
            <div>
              <label className="text-slate-500 text-xs mb-1 block">ოპერაციის თარიღი</label>
              <input type="date" required value={form.date} onChange={e => setForm({...form, date: e.target.value})}
                className="w-full bg-stone-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500" />
            </div>
            <div>
              <label className="text-slate-500 text-xs mb-1 block">ფისკალური პერიოდი</label>
              <select required value={form.fiscal_period_id} onChange={e => setForm({...form, fiscal_period_id: e.target.value})}
                className="w-full bg-stone-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500">
                {periods.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-slate-500 text-xs mb-1 block">გასაცემი თანხა (NET, ₾)</label>
              <input type="number" step="0.01" min="1" required placeholder="მაგ. 10000" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})}
                className="w-full bg-stone-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 font-semibold focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500" />
              <p className="text-xs text-slate-400 mt-1">თანხა, რომელიც გაიცემა პარტნიორებზე.</p>
            </div>

            <button type="submit" disabled={loading || !form.amount}
              className="w-full mt-2 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
              <FileCheck2 size={18} />
              {loading ? 'მუშავდება...' : 'გადასახადის დეკლარირება'}
            </button>
          </form>
        </div>

        {/* Info & Calculation Visuals */}
        <div className="bg-gradient-to-br from-brand-600/10 to-transparent rounded-2xl p-6 border border-brand-500/20">
          <h3 className="text-lg font-semibold text-slate-800 mb-6 flex items-center gap-2">
            <Calculator size={18} className="text-brand-600" />
            ესტონური მოდელის კალკულაცია
          </h3>

          <div className="space-y-4">
            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-brand-500/10 shadow-sm flex items-center justify-between">
              <span className="text-sm text-slate-500">ხელზე გასაცემი (Net)</span>
              <span className="font-semibold text-slate-800 text-lg">{GEL(amountNum)}</span>
            </div>

            <div className="bg-amber-500/10 rounded-xl p-4 border border-amber-500/20 shadow-inner flex items-center justify-between relative overflow-hidden">
              <div className="absolute top-0 right-0 p-2 opacity-10">
                <Calculator size={40} />
              </div>
              <div>
                <span className="text-sm text-amber-700 font-medium block">მოგების გადასახადი (15%)</span>
                <span className="text-xs text-amber-600/70">{GEL(amountNum)} / 0.85 × 0.15</span>
              </div>
              <span className="font-bold text-amber-600 text-xl">{GEL(profitTax)}</span>
            </div>

            <div className="flex justify-center py-1">
              <ChevronRight size={20} className="text-slate-300 rotate-90" />
            </div>

            <div className="bg-slate-800 rounded-xl p-5 border border-slate-700 shadow-md flex items-center justify-between text-white">
              <div>
                <span className="text-sm text-slate-300 block">ჯამური ჩამოწერა</span>
                <span className="text-xs text-slate-400">აკლდება გაუნაწილებელ მოგებას (5200)</span>
              </div>
              <span className="font-bold text-xl text-brand-400">{GEL(totalDeduction)}</span>
            </div>
          </div>
          
          <div className="mt-6 bg-blue-50 text-blue-800 text-xs p-4 rounded-xl border border-blue-100 flex gap-3">
            <div className="p-1.5 bg-blue-100 rounded-lg h-fit">💡</div>
            <p>
              ესფ-ის (Estonian Model) მიხედვით, მოგების გადასახადი (15%) გამოითვლება არა მიღებული წმინდა მოგებიდან, არამედ მხოლოდ <strong>განაწილებული დივიდენდიდან</strong>.
              ფორმა გააკეთებს ბუღალტრულ გატარებებს: <code>Dr 5200</code>, <code>Dr 8950</code>, <code>Cr 3330</code>, <code>Cr 3320</code>.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
