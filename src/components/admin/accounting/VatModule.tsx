import React, { useState, useEffect, useCallback } from 'react';
import { Receipt, TrendingUp, TrendingDown, ArrowUpDown } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

const GEL = (v: number | string) => Number(v).toLocaleString('ka-GE', { minimumFractionDigits: 2 }) + ' ₾';
const MONTH_NAMES = ['იანვ', 'თებ', 'მარ', 'აპრ', 'მაი', 'ივნ', 'ივლ', 'აგვ', 'სექ', 'ოქტ', 'ნოე', 'დეკ'];

export default function VatModule() {
  const [tab, setTab] = useState<'summary' | 'transactions'>('summary');
  const [summary, setSummary] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [vatType, setVatType] = useState('');
  const [loading, setLoading] = useState(true);

  const getToken = async () => (await supabase.auth.getSession()).data.session?.access_token || '';

  const fetchSummary = useCallback(async () => {
    setLoading(true);
    const token = await getToken();
    const res = await fetch('/api/accounting/vat/summary', { headers: { Authorization: `Bearer ${token}` } });
    const json = await res.json();
    setSummary(json.summary || []);
    setLoading(false);
  }, []);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    const token = await getToken();
    const params = new URLSearchParams({ limit: '50' });
    if (vatType) params.set('vat_type', vatType);
    const res = await fetch(`/api/accounting/vat/transactions?${params}`, { headers: { Authorization: `Bearer ${token}` } });
    const json = await res.json();
    setTransactions(json.transactions || []);
    setLoading(false);
  }, [vatType]);

  useEffect(() => {
    if (tab === 'summary') fetchSummary();
    else fetchTransactions();
  }, [tab, fetchSummary, fetchTransactions]);

  // Totals from all periods (YTD)
  const ytdOutput = summary.reduce((s, r) => s + Number(r.output_vat || 0), 0);
  const ytdInput = summary.reduce((s, r) => s + Number(r.input_vat || 0), 0);
  const ytdNet = ytdOutput - ytdInput;

  // Current period (latest)
  const currentPeriod = summary[summary.length - 1];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><Receipt size={22} /> დღგ მოდული</h2>
        <p className="text-slate-500 text-sm mt-1">Output / Input VAT · ყოველთვიური დეკლარაცია</p>
      </div>

      {/* YTD KPI Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-red-900/20 border border-red-800/40 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={16} className="text-red-400" />
            <p className="text-slate-500 text-xs">Output VAT (YTD)</p>
          </div>
          <p className="text-red-300 font-bold text-2xl">{GEL(ytdOutput)}</p>
          <p className="text-stone-600 text-xs mt-1">გამოშვ. — გასაყ. ინვოის.</p>
        </div>
        <div className="bg-emerald-900/20 border border-emerald-800/40 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown size={16} className="text-emerald-400" />
            <p className="text-slate-500 text-xs">Input VAT (YTD)</p>
          </div>
          <p className="text-emerald-300 font-bold text-2xl">{GEL(ytdInput)}</p>
          <p className="text-stone-600 text-xs mt-1">შეყვ. — შესყიდვ. ინვ.</p>
        </div>
        <div className={`border rounded-xl p-5 ${ytdNet > 0 ? 'bg-amber-900/20 border-amber-800/40' : 'bg-emerald-900/10 border-emerald-800/30'}`}>
          <div className="flex items-center gap-2 mb-2">
            <ArrowUpDown size={16} className={ytdNet > 0 ? 'text-amber-400' : 'text-emerald-400'} />
            <p className="text-slate-500 text-xs">სანეტო (YTD)</p>
          </div>
          <p className={`font-bold text-2xl ${ytdNet > 0 ? 'text-amber-300' : 'text-emerald-300'}`}>{GEL(ytdNet)}</p>
          <p className="text-stone-600 text-xs mt-1">{ytdNet > 0 ? 'გადასახდელი' : 'ჩასათვლელი'}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white shadow-sm/50 border border-slate-200 p-1 rounded-xl w-fit">
        {([['summary', 'ყოველთვ. შეჯ.'], ['transactions', 'ტრანზ.']] as const).map(([t, l]) => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-lg text-sm transition-all ${tab === t ? 'bg-brand-600 text-slate-800' : 'text-slate-500 hover:text-slate-800'}`}>{l}</button>
        ))}
      </div>

      {/* Monthly Summary */}
      {tab === 'summary' && (
        loading ? (
          <div className="space-y-2">{Array(4).fill(0).map((_, i) => <div key={i} className="h-14 bg-white shadow-sm animate-pulse rounded-xl" />)}</div>
        ) : summary.length === 0 ? (
          <div className="text-center py-16 text-slate-400"><Receipt size={40} className="mx-auto mb-3 opacity-30" /><p>VAT მონ. ჯერ არ არის</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-slate-400 text-xs border-b border-slate-200">
                <th className="text-left py-3 px-4">პერიოდი</th>
                <th className="text-right py-3 px-4 text-red-400">Output VAT</th>
                <th className="text-right py-3 px-4 text-emerald-400">Input VAT</th>
                <th className="text-right py-3 px-4">სანეტო</th>
                <th className="text-center py-3 px-4">სტატ.</th>
              </tr></thead>
              <tbody>
                {summary.filter(r => r.output_vat > 0 || r.input_vat > 0).map((r, i) => {
                  const net = Number(r.net_vat_payable || 0);
                  return (
                    <tr key={i} className="border-b border-slate-200/50 hover:bg-slate-100/50/20">
                      <td className="py-3 px-4 text-slate-800">{MONTH_NAMES[(r.period_month || 1) - 1]} {r.period_year}</td>
                      <td className="py-3 px-4 text-right text-red-300">{GEL(r.output_vat)}</td>
                      <td className="py-3 px-4 text-right text-emerald-300">{GEL(r.input_vat)}</td>
                      <td className={`py-3 px-4 text-right font-semibold ${net > 0 ? 'text-amber-300' : 'text-emerald-300'}`}>{GEL(net)}</td>
                      <td className="py-3 px-4 text-center">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-stone-800 text-slate-500 border border-slate-300">DRAFT</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-300 font-semibold">
                  <td className="py-3 px-4 text-slate-600 text-xs uppercase tracking-wider">YTD სულ</td>
                  <td className="py-3 px-4 text-right text-red-300">{GEL(ytdOutput)}</td>
                  <td className="py-3 px-4 text-right text-emerald-300">{GEL(ytdInput)}</td>
                  <td className={`py-3 px-4 text-right ${ytdNet > 0 ? 'text-amber-300' : 'text-emerald-300'}`}>{GEL(ytdNet)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )
      )}

      {/* Transactions */}
      {tab === 'transactions' && (
        <>
          <div className="flex gap-2">
            {['', 'OUTPUT', 'INPUT'].map(t => (
              <button key={t} onClick={() => setVatType(t)} className={`px-3 py-2 rounded-xl text-xs border transition-all ${vatType === t ? 'bg-brand-600 border-amber-500 text-slate-800' : 'border-slate-300 text-slate-500'}`}>
                {t || 'ყველა'}
              </button>
            ))}
          </div>
          {loading ? (
            <div className="space-y-2">{Array(5).fill(0).map((_, i) => <div key={i} className="h-14 bg-white shadow-sm animate-pulse rounded-xl" />)}</div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-16 text-slate-400"><Receipt size={40} className="mx-auto mb-3 opacity-30" /><p>ტრანზ. არ მოიძ.</p></div>
          ) : (
            <div className="space-y-2">
              {transactions.map((t, i) => (
                <div key={i} className="flex items-center gap-4 bg-white shadow-sm/80 border border-slate-200/50 rounded-xl px-5 py-3">
                  <span className={`w-16 text-center text-xs px-2 py-1 rounded-full border font-medium shrink-0 ${t.vat_type === 'OUTPUT' ? 'bg-red-900/30 text-red-300 border-red-700/40' : 'bg-emerald-900/30 text-emerald-300 border-emerald-700/40'}`}>
                    {t.vat_type}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-600 text-sm">{t.reference_type || '—'}</p>
                    {t.counterparty_tin && <p className="text-slate-400 text-xs">სს/კ: {t.counterparty_tin}</p>}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-slate-500 text-xs">{GEL(t.taxable_amount)} × {t.vat_rate}%</p>
                    <p className="font-semibold text-slate-800">{GEL(t.vat_amount)}</p>
                  </div>
                  <p className="text-slate-400 text-xs w-24 text-right shrink-0">{new Date(t.transaction_date).toLocaleDateString('ka-GE')}</p>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
