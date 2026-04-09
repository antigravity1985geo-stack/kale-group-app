import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Filter, Check, RotateCcw, ChevronDown, X, BookOpen, AlertCircle } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

type Status = 'DRAFT' | 'POSTED' | 'REVERSED';

interface JournalLine { account_id: string; debit: number; credit: number; currency: string; description?: string; accounts?: { code: string; name_ka: string } }
interface JournalEntry { id: string; entry_number: string; entry_date: string; description: string; status: Status; reference_type?: string; fiscal_periods?: { name: string }; journal_lines?: JournalLine[]; }
interface Account { id: string; code: string; name_ka: string; account_type: string; }

const STATUS_STYLES: Record<Status, string> = {
  DRAFT: 'bg-amber-900/40 text-amber-300 border-amber-700/50',
  POSTED: 'bg-emerald-900/40 text-emerald-300 border-emerald-700/50',
  REVERSED: 'bg-stone-700/40 text-slate-500 border-stone-600/50',
};
const STATUS_LABELS: Record<Status, string> = { DRAFT: 'მოლოდინში', POSTED: 'განთავსებული', REVERSED: 'გაუქმებული' };

export default function JournalEntries() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null);

  // Form state
  const [form, setForm] = useState({
    entry_date: new Date().toISOString().split('T')[0],
    description: '',
    reference_type: 'MANUAL',
    fiscal_period_id: '',
  });
  const [lines, setLines] = useState([
    { account_id: '', debit: '', credit: '', currency: 'GEL', description: '' },
    { account_id: '', debit: '', credit: '', currency: 'GEL', description: '' },
  ]);
  const [periods, setPeriods] = useState<any[]>([]);

  const getToken = async () => (await supabase.auth.getSession()).data.session?.access_token || '';

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    const token = await getToken();
    const params = new URLSearchParams({ limit: '50' });
    if (statusFilter) params.set('status', statusFilter);
    const res = await fetch(`/api/accounting/journal-entries?${params}`, { headers: { Authorization: `Bearer ${token}` } });
    const json = await res.json();
    setEntries(json.entries || []);
    setLoading(false);
  }, [statusFilter]);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  useEffect(() => {
    getToken().then(async (token) => {
      const [accRes, perRes] = await Promise.all([
        fetch('/api/accounting/accounts', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/accounting/fiscal-periods', { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const accJson = await accRes.json(); setAccounts(accJson.accounts || []);
      const perJson = await perRes.json();
      const open = (perJson.periods || []).filter((p: any) => p.status === 'OPEN');
      setPeriods(open);
      if (open.length > 0) setForm(f => ({ ...f, fiscal_period_id: open.find((p: any) => {
        const d = new Date(); return p.period_month === d.getMonth() + 1 && p.period_year === d.getFullYear();
      })?.id || open[0].id }));
    });
  }, []);

  const showToast = (msg: string, type: 'ok' | 'err') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleAction = async (id: string, action: 'post' | 'reverse') => {
    setActionLoading(id + action);
    try {
      const token = await getToken();
      const res = await fetch(`/api/accounting/journal-entries/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      showToast(action === 'post' ? 'ჩანაწერი განთავსდა ✓' : 'ჩანაწერი გაუქმდა ✓', 'ok');
      fetchEntries();
    } catch (e: any) { showToast(e.message, 'err'); }
    finally { setActionLoading(null); }
  };

  const debitTotal = lines.reduce((s, l) => s + (Number(l.debit) || 0), 0);
  const creditTotal = lines.reduce((s, l) => s + (Number(l.credit) || 0), 0);
  const isBalanced = Math.abs(debitTotal - creditTotal) < 0.01 && debitTotal > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isBalanced) return showToast('ჟურნალი დაბალანსებული არ არის!', 'err');
    const token = await getToken();
    const payload = {
      ...form,
      lines: lines.map(l => ({ ...l, debit: Number(l.debit) || 0, credit: Number(l.credit) || 0 })).filter(l => l.account_id),
    };
    const res = await fetch('/api/accounting/journal-entries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok) return showToast(json.error, 'err');
    showToast(`ჩანაწ. შეიქმნა: ${json.entry_number} ✓`, 'ok');
    setShowForm(false);
    setLines([
      { account_id: '', debit: '', credit: '', currency: 'GEL', description: '' },
      { account_id: '', debit: '', credit: '', currency: 'GEL', description: '' },
    ]);
    fetchEntries();
  };

  const filtered = entries.filter(e =>
    e.entry_number?.toLowerCase().includes(search.toLowerCase()) ||
    e.description?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-xl text-sm font-medium shadow-xl border animate-in slide-in-from-top-2 ${
          toast.type === 'ok' ? 'bg-emerald-900 text-emerald-200 border-emerald-700' : 'bg-red-900 text-red-200 border-red-700'
        }`}>{toast.msg}</div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><BookOpen size={22} /> სააღრიცხვო ჟურნალი</h2>
          <p className="text-slate-500 text-sm mt-1">Double-entry bookkeeping — Debit / Credit</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-500 text-slate-800 rounded-xl text-sm font-medium transition-all shadow-lg shadow-amber-900/30">
          <Plus size={16} /> {showForm ? 'გაკეთება' : 'ახალი ჩანაწ.'}
        </button>
      </div>

      {/* New Entry Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white shadow-sm/90 border border-slate-200 rounded-2xl p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-slate-800 font-semibold">📝 ახალი Journal Entry</h3>
            <button type="button" onClick={() => setShowForm(false)}><X size={18} className="text-slate-400 hover:text-slate-800" /></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div><label className="text-slate-500 text-xs mb-1 block">თარიღი</label>
              <input type="date" value={form.entry_date} onChange={e => setForm({ ...form, entry_date: e.target.value })}
                className="w-full bg-stone-800 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 text-sm focus:outline-none focus:border-amber-600" required />
            </div>
            <div><label className="text-slate-500 text-xs mb-1 block">ტიპი</label>
              <select value={form.reference_type} onChange={e => setForm({ ...form, reference_type: e.target.value })}
                className="w-full bg-stone-800 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 text-sm focus:outline-none focus:border-amber-600">
                {['MANUAL','INVOICE','PURCHASE','PAYMENT','PAYROLL','ADJUSTMENT','DEPRECIATION','OPENING','VAT'].map(t =>
                  <option key={t} value={t}>{t}</option>
                )}
              </select>
            </div>
            <div><label className="text-slate-500 text-xs mb-1 block">ფისკ. პერიოდი</label>
              <select value={form.fiscal_period_id} onChange={e => setForm({ ...form, fiscal_period_id: e.target.value })}
                className="w-full bg-stone-800 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 text-sm focus:outline-none focus:border-amber-600" required>
                {periods.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          </div>
          <div><label className="text-slate-500 text-xs mb-1 block">აღწერა *</label>
            <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
              className="w-full bg-stone-800 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 text-sm focus:outline-none focus:border-amber-600"
              placeholder="ჟურნ. ჩანაწ. დასახელება..." required />
          </div>

          {/* Journal Lines */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-slate-500 text-xs font-medium uppercase tracking-wider">ხაზები</span>
              <button type="button" onClick={() => setLines([...lines, { account_id: '', debit: '', credit: '', currency: 'GEL', description: '' }])}
                className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1"><Plus size={12} /> ხაზის დამ.</button>
            </div>
            <div className="space-y-2">
              {/* Column headers */}
              <div className="grid grid-cols-12 gap-2 text-xs text-slate-400 px-1">
                <div className="col-span-4">ანგარიში</div>
                <div className="col-span-2">Debit ₾</div>
                <div className="col-span-2">Credit ₾</div>
                <div className="col-span-3">აღწ.</div>
                <div className="col-span-1" />
              </div>
              {lines.map((line, i) => (
                <div key={i} className="grid grid-cols-12 gap-2">
                  <select value={line.account_id} onChange={e => { const nl = [...lines]; nl[i].account_id = e.target.value; setLines(nl); }}
                    className="col-span-4 bg-stone-800 border border-slate-300 rounded-lg px-2 py-1.5 text-slate-800 text-xs focus:outline-none focus:border-amber-600">
                    <option value="">— ანგარიში —</option>
                    {accounts.map(a => <option key={a.id} value={a.id}>{a.code} — {a.name_ka}</option>)}
                  </select>
                  <input type="number" min="0" step="0.01" placeholder="0.00" value={line.debit}
                    onChange={e => { const nl = [...lines]; nl[i].debit = e.target.value; if (e.target.value) nl[i].credit = ''; setLines(nl); }}
                    className="col-span-2 bg-stone-800 border border-slate-300 rounded-lg px-2 py-1.5 text-emerald-300 text-xs focus:outline-none focus:border-emerald-600" />
                  <input type="number" min="0" step="0.01" placeholder="0.00" value={line.credit}
                    onChange={e => { const nl = [...lines]; nl[i].credit = e.target.value; if (e.target.value) nl[i].debit = ''; setLines(nl); }}
                    className="col-span-2 bg-stone-800 border border-slate-300 rounded-lg px-2 py-1.5 text-red-300 text-xs focus:outline-none focus:border-red-600" />
                  <input placeholder="შენიშვნა" value={line.description}
                    onChange={e => { const nl = [...lines]; nl[i].description = e.target.value; setLines(nl); }}
                    className="col-span-3 bg-stone-800 border border-slate-300 rounded-lg px-2 py-1.5 text-slate-800 text-xs focus:outline-none focus:border-amber-600" />
                  <button type="button" onClick={() => setLines(lines.filter((_, j) => j !== i))} className="col-span-1 flex items-center justify-center text-stone-600 hover:text-red-400">
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>

            {/* Balance check */}
            <div className={`mt-3 flex items-center justify-between px-3 py-2 rounded-xl border text-xs ${isBalanced ? 'bg-emerald-900/20 border-emerald-700/40 text-emerald-300' : 'bg-red-900/20 border-red-700/40 text-red-300'}`}>
              <span>სულ: Debit <strong>{debitTotal.toFixed(2)}</strong> | Credit <strong>{creditTotal.toFixed(2)}</strong></span>
              <span>{isBalanced ? '✅ ბალანსი სწორია' : '⚠️ დაუბალანსებელი'}</span>
            </div>
          </div>

          <div className="flex gap-3 justify-end">
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-slate-500 hover:text-slate-800 border border-slate-300 rounded-xl">გაუქმება</button>
            <button type="submit" disabled={!isBalanced} className="px-5 py-2 bg-brand-600 hover:bg-brand-500 disabled:opacity-40 text-slate-800 text-sm rounded-xl font-medium transition-all">შენახვა</button>
          </div>
        </form>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="ძება ნომრით ან აღწ..."
            className="w-full pl-9 pr-4 py-2.5 bg-white shadow-sm border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:border-stone-600" />
        </div>
        <div className="flex gap-2">
          {(['', 'DRAFT', 'POSTED', 'REVERSED'] as const).map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-2 rounded-xl text-xs border transition-all ${statusFilter === s ? 'bg-brand-600 border-amber-500 text-slate-800' : 'border-slate-300 text-slate-500 hover:border-stone-600'}`}>
              {s || 'ყველა'}
            </button>
          ))}
        </div>
      </div>

      {/* Entries Table */}
      {loading ? (
        <div className="space-y-2">{Array(5).fill(0).map((_, i) => <div key={i} className="h-14 bg-white shadow-sm animate-pulse rounded-xl" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400"><BookOpen size={40} className="mx-auto mb-3 opacity-30" /><p>ჩანაწერები არ მოიძებნა</p></div>
      ) : (
        <div className="space-y-2">
          {filtered.map(entry => (
            <div key={entry.id} className="bg-white shadow-sm/80 border border-slate-200/50 rounded-xl overflow-hidden">
              <button
                onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-100/50/30 transition-colors text-left"
              >
                <div className="flex items-center gap-4">
                  <span className="font-mono text-amber-400 text-sm font-semibold">{entry.entry_number}</span>
                  <span className="text-slate-800 text-sm">{entry.description}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs border ${STATUS_STYLES[entry.status] || STATUS_STYLES.DRAFT}`}>{STATUS_LABELS[entry.status] || entry.status}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-slate-400 text-xs">{entry.entry_date}</span>
                  {/* Actions */}
                  {entry.status === 'DRAFT' && (
                    <button onClick={e => { e.stopPropagation(); handleAction(entry.id, 'post'); }}
                      disabled={actionLoading === entry.id + 'post'}
                      className="flex items-center gap-1 px-3 py-1 bg-emerald-800/50 hover:bg-emerald-700/50 text-emerald-300 rounded-lg text-xs border border-emerald-700/40">
                      <Check size={12} /> {actionLoading === entry.id + 'post' ? '...' : 'Post'}
                    </button>
                  )}
                  {entry.status === 'POSTED' && (
                    <button onClick={e => { e.stopPropagation(); handleAction(entry.id, 'reverse'); }}
                      disabled={actionLoading === entry.id + 'reverse'}
                      className="flex items-center gap-1 px-3 py-1 bg-stone-700/50 hover:bg-stone-600/50 text-slate-600 rounded-lg text-xs border border-stone-600/40">
                      <RotateCcw size={12} /> {actionLoading === entry.id + 'reverse' ? '...' : 'Reverse'}
                    </button>
                  )}
                  <ChevronDown size={16} className={`text-stone-600 transition-transform ${expandedId === entry.id ? 'rotate-180' : ''}`} />
                </div>
              </button>

              {expandedId === entry.id && entry.journal_lines && entry.journal_lines.length > 0 && (
                <div className="border-t border-slate-200 px-5 py-3">
                  <table className="w-full text-xs">
                    <thead><tr className="text-slate-400">
                      <th className="text-left py-1 w-24">ანგ. კოდი</th>
                      <th className="text-left py-1">სახელი</th>
                      <th className="text-right py-1 text-emerald-400 w-28">Debit ₾</th>
                      <th className="text-right py-1 text-red-400 w-28">Credit ₾</th>
                    </tr></thead>
                    <tbody>
                      {entry.journal_lines.map((l, i) => (
                        <tr key={i} className="border-t border-slate-200/50">
                          <td className="py-1.5 font-mono text-amber-500">{l.accounts?.code}</td>
                          <td className="py-1.5 text-slate-600">{l.accounts?.name_ka}</td>
                          <td className="py-1.5 text-right text-emerald-300">{l.debit > 0 ? l.debit.toFixed(2) : ''}</td>
                          <td className="py-1.5 text-right text-red-300">{l.credit > 0 ? l.credit.toFixed(2) : ''}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
