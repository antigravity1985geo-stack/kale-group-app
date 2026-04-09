import React, { useState, useEffect, useCallback } from 'react';
import { BarChart2, PieChart, Scale, ListOrdered, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

const GEL = (v: number | string) => Number(v).toLocaleString('ka-GE', { minimumFractionDigits: 2 }) + ' ₾';

type ReportType = 'profit-loss' | 'balance-sheet' | 'trial-balance';

interface PLSummary { revenue: number; cogs: number; grossProfit: number; opex: number; netProfit: number; }
interface BSSummary { assets: number; liabilities: number; equity: number; balanced: boolean; }

export default function FinancialReports() {
  const [activeReport, setActiveReport] = useState<ReportType>('profit-loss');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const getToken = async () => (await supabase.auth.getSession()).data.session?.access_token || '';

  const fetchReport = useCallback(async (type: ReportType) => {
    setLoading(true);
    try {
      const token = await getToken();
      const endpoint = `/api/accounting/reports/${type}`;
      const res = await fetch(endpoint, { headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      setData(json);
    } catch (err) {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReport(activeReport);
  }, [activeReport, fetchReport]);

  const REPORTS: { id: ReportType; label: string; icon: any; desc: string }[] = [
    { id: 'profit-loss', label: 'P&L', icon: BarChart2, desc: 'მოგება-ზარ. ანგარიშგება' },
    { id: 'balance-sheet', label: 'ბალანსი', icon: Scale, desc: 'ბალანსის ანგარ.' },
    { id: 'trial-balance', label: 'Trial Balance', icon: ListOrdered, desc: 'საბ. ნაშთების ამონ.' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><BarChart2 size={22} /> ფინანსური ანგარიშგება</h2>
        <p className="text-slate-500 text-sm mt-1">სტანდ. ფინ. ანგ. · {new Date().getFullYear()}</p>
      </div>

      {/* Report selector */}
      <div className="grid grid-cols-3 gap-3">
        {REPORTS.map(r => (
          <button key={r.id} onClick={() => setActiveReport(r.id)}
            className={`p-4 rounded-xl border text-left transition-all ${activeReport === r.id ? 'bg-amber-900/30 border-amber-700/60 text-amber-300' : 'bg-white shadow-sm/60 border-slate-200 text-slate-500 hover:border-slate-300'}`}>
            <r.icon size={20} className="mb-2" />
            <p className="font-semibold text-sm">{r.label}</p>
            <p className="text-xs opacity-70 mt-0.5">{r.desc}</p>
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className="space-y-2">{Array(6).fill(0).map((_, i) => <div key={i} className="h-10 bg-white shadow-sm animate-pulse rounded-xl" />)}</div>
      )}

      {/* P&L Report */}
      {!loading && activeReport === 'profit-loss' && data && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              { label: 'შემოს.', value: data.summary?.revenue || 0, color: 'text-emerald-300', bg: 'bg-emerald-900/20 border-emerald-800/40', icon: TrendingUp },
              { label: 'COGS', value: data.summary?.cogs || 0, color: 'text-orange-300', bg: 'bg-orange-900/20 border-orange-800/40', icon: TrendingDown },
              { label: 'მთლ. მ.', value: data.summary?.grossProfit || 0, color: 'text-blue-300', bg: 'bg-blue-900/20 border-blue-800/40', icon: Minus },
              { label: 'ოპ. ხარ.', value: data.summary?.opex || 0, color: 'text-red-300', bg: 'bg-red-900/20 border-red-800/40', icon: TrendingDown },
              { label: 'ნეტ. მ.', value: data.summary?.netProfit || 0, color: Number(data.summary?.netProfit) >= 0 ? 'text-emerald-300' : 'text-red-300', bg: 'bg-stone-800 border-slate-300', icon: TrendingUp },
            ].map((s, i) => (
              <div key={i} className={`rounded-xl p-3 border ${s.bg}`}>
                <p className="text-slate-400 text-xs mb-1">{s.label}</p>
                <p className={`font-bold text-sm ${s.color}`}>{GEL(s.value)}</p>
              </div>
            ))}
          </div>

          {/* Gross Margin indicator */}
          {data.summary?.revenue > 0 && (
            <div className="bg-white shadow-sm/60 border border-slate-200 rounded-xl p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-slate-500 text-sm">Gross Margin</span>
                <span className="text-slate-800 font-semibold">{((data.summary.grossProfit / data.summary.revenue) * 100).toFixed(1)}%</span>
              </div>
              <div className="h-2 bg-stone-800 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-emerald-600 to-teal-500 rounded-full transition-all"
                  style={{ width: `${Math.min(100, Math.max(0, (data.summary.grossProfit / data.summary.revenue) * 100))}%` }} />
              </div>
            </div>
          )}

          {/* Detail lines by type */}
          {(['REVENUE', 'COGS', 'EXPENSE'] as const).map(type => {
            const typeLines = (data.lines || []).filter((l: any) => l.account_type === type);
            if (typeLines.length === 0) return null;
            const colors: Record<string, string> = { REVENUE: 'text-emerald-400 border-emerald-700', COGS: 'text-orange-400 border-orange-700', EXPENSE: 'text-red-400 border-red-700' };
            const labels: Record<string, string> = { REVENUE: '📈 შემოსავალი', COGS: '📦 COGS', EXPENSE: '💸 ოპ. ხარჯები' };
            return (
              <div key={type} className="bg-white shadow-sm/60 border border-slate-200 rounded-xl overflow-hidden">
                <div className={`px-5 py-3 border-b ${colors[type]?.split(' ')[1] || 'border-slate-300'} bg-stone-800/30`}>
                  <h4 className={`font-semibold text-sm ${colors[type]?.split(' ')[0] || 'text-slate-800'}`}>{labels[type]}</h4>
                </div>
                <table className="w-full text-sm">
                  <tbody>
                    {typeLines.map((line: any, i: number) => (
                      <tr key={i} className="border-b border-slate-200/40 hover:bg-slate-100/50/20">
                        <td className="py-2.5 px-5 font-mono text-slate-400 text-xs w-16">{line.code}</td>
                        <td className="py-2.5 px-3 text-slate-600">{line.name_ka}</td>
                        <td className="py-2.5 px-5 text-right text-slate-800">{GEL(line.amount || 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      )}

      {/* Balance Sheet Report */}
      {!loading && activeReport === 'balance-sheet' && data && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'სულ აქტ.', value: data.summary?.assets || 0, color: 'text-emerald-300', bg: 'bg-emerald-900/20 border-emerald-800/40' },
              { label: 'სულ ვალდ.', value: data.summary?.liabilities || 0, color: 'text-red-300', bg: 'bg-red-900/20 border-red-800/40' },
              { label: 'კაპ./ეკ.', value: data.summary?.equity || 0, color: 'text-blue-300', bg: 'bg-blue-900/20 border-blue-800/40' },
            ].map((s, i) => (
              <div key={i} className={`rounded-xl p-4 border ${s.bg}`}>
                <p className="text-slate-400 text-xs mb-1">{s.label}</p>
                <p className={`font-bold text-lg ${s.color}`}>{GEL(s.value)}</p>
              </div>
            ))}
          </div>

          {data.summary?.balanced !== undefined && (
            <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm border ${data.summary.balanced ? 'bg-emerald-900/20 border-emerald-700/40 text-emerald-300' : 'bg-red-900/20 border-red-700/40 text-red-300'}`}>
              {data.summary.balanced ? '✅ ბალანსი სწორია (A = L + E)' : '⚠️ ბალანსი არ ემთხვევა!'}
            </div>
          )}

          {(['ASSET', 'LIABILITY', 'EQUITY'] as const).map(type => {
            const lines = (data.lines || []).filter((l: any) => l.account_type === type && Number(l.balance) !== 0);
            if (lines.length === 0) return null;
            const labels: Record<string, string> = { ASSET: '🏛️ აქტივები', LIABILITY: '⚖️ ვალდებულებები', EQUITY: '💼 კაპიტალი' };
            const colors: Record<string, string> = { ASSET: 'text-emerald-400', LIABILITY: 'text-red-400', EQUITY: 'text-blue-400' };
            return (
              <div key={type} className="bg-white shadow-sm/60 border border-slate-200 rounded-xl overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-300 bg-stone-800/30">
                  <h4 className={`font-semibold text-sm ${colors[type]}`}>{labels[type]}</h4>
                </div>
                <table className="w-full text-sm">
                  <tbody>
                    {lines.map((line: any, i: number) => (
                      <tr key={i} className="border-b border-slate-200/40 hover:bg-slate-100/50/20">
                        <td className="py-2.5 px-5 font-mono text-slate-400 text-xs w-16">{line.code}</td>
                        <td className="py-2.5 px-3 text-slate-600">{line.name_ka}</td>
                        <td className="py-2.5 px-5 text-right text-slate-800">{GEL(line.balance || 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      )}

      {/* Trial Balance Report */}
      {!loading && activeReport === 'trial-balance' && data && (
        <div className="space-y-4">
          <div className={`flex items-center justify-between px-4 py-2 rounded-xl border text-sm ${data.balanced ? 'bg-emerald-900/20 border-emerald-700/40 text-emerald-300' : 'bg-red-900/20 border-red-700/40 text-red-300'}`}>
            <span>Debit სულ: <strong>{GEL(data.totalDebit)}</strong> | Credit სულ: <strong>{GEL(data.totalCredit)}</strong></span>
            <span>{data.balanced ? '✅ დაბალ.' : '⚠️ დაუბალ.'}</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-slate-400 text-xs border-b border-slate-200 bg-white shadow-sm/60">
                <th className="text-left py-3 px-4 w-16">კოდი</th>
                <th className="text-left py-3 px-4">ანგარიში</th>
                <th className="text-left py-3 px-4 w-20">ტიპი</th>
                <th className="text-right py-3 px-4 text-emerald-400">Debit</th>
                <th className="text-right py-3 px-4 text-red-400">Credit</th>
                <th className="text-right py-3 px-4">ნაშთი</th>
              </tr></thead>
              <tbody>
                {(data.accounts || []).filter((a: any) => Number(a.total_debit) > 0 || Number(a.total_credit) > 0).map((acc: any, i: number) => (
                  <tr key={i} className="border-b border-slate-200/40 hover:bg-slate-100/50/20">
                    <td className="py-2.5 px-4 font-mono text-amber-400 text-xs">{acc.code}</td>
                    <td className="py-2.5 px-4 text-slate-600">{acc.name_ka}</td>
                    <td className="py-2.5 px-4 text-slate-400 text-xs">{acc.account_type}</td>
                    <td className="py-2.5 px-4 text-right text-emerald-300">{Number(acc.total_debit) > 0 ? GEL(acc.total_debit) : ''}</td>
                    <td className="py-2.5 px-4 text-right text-red-300">{Number(acc.total_credit) > 0 ? GEL(acc.total_credit) : ''}</td>
                    <td className={`py-2.5 px-4 text-right font-medium ${Number(acc.balance) >= 0 ? 'text-slate-800' : 'text-red-300'}`}>{GEL(acc.balance || 0)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2 border-slate-300 font-semibold">
                <tr>
                  <td colSpan={3} className="py-3 px-4 text-slate-500 text-xs uppercase tracking-wider">სულ</td>
                  <td className="py-3 px-4 text-right text-emerald-300">{GEL(data.totalDebit)}</td>
                  <td className="py-3 px-4 text-right text-red-300">{GEL(data.totalCredit)}</td>
                  <td className="py-3 px-4 text-right" />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {!loading && !data && (
        <div className="text-center py-16 text-slate-400">
          <BarChart2 size={40} className="mx-auto mb-3 opacity-30" />
          <p>ანგ. ჩანაწ. ჯ. არ არის. შექმ. Journal Entry-ები.</p>
        </div>
      )}
    </div>
  );
}
