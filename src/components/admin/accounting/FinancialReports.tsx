import React, { useState, useEffect, useCallback } from 'react';
import { BarChart2, PieChart, Scale, ListOrdered, TrendingUp, TrendingDown, Minus, Calendar, Download, Filter } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

const GEL = (v: number | string) => Number(v).toLocaleString('ka-GE', { minimumFractionDigits: 2 }) + ' ₾';

type ReportType = 'profit-loss' | 'balance-sheet' | 'trial-balance';

interface PLSummary { revenue: number; cogs: number; grossProfit: number; opex: number; netProfit: number; }
interface BSSummary { assets: number; liabilities: number; equity: number; balanced: boolean; }

export default function FinancialReports() {
  const [activeReport, setActiveReport] = useState<ReportType>('profit-loss');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  
  // Date Filters
  const [filters, setFilters] = useState({
    startDate: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    asOfDate: new Date().toISOString().split('T')[0]
  });

  const getToken = async () => (await supabase.auth.getSession()).data.session?.access_token || '';

  const fetchReport = useCallback(async (type: ReportType, f: typeof filters) => {
    setLoading(true);
    try {
      const token = await getToken();
      let query = '';
      if (type === 'balance-sheet') {
        query = `?date=${f.asOfDate}`;
      } else {
        query = `?startDate=${f.startDate}&endDate=${f.endDate}`;
      }
      
      const res = await fetch(`/api/accounting/reports/${type}${query}`, { 
        headers: { Authorization: `Bearer ${token}` } 
      });
      const json = await res.json();
      setData(json);
    } catch (err) {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReport(activeReport, filters);
  }, [activeReport, filters, fetchReport]);

  const exportToCSV = () => {
    if (!data) return;
    
    let csvContent = "";
    let fileName = `report_${activeReport}_${new Date().toISOString().split('T')[0]}.csv`;
    
    if (activeReport === 'trial-balance') {
      csvContent = "Code,Account Name,Type,Debit,Credit,Balance\n";
      (data.accounts || []).forEach((a: any) => {
        csvContent += `${a.code},"${a.name_ka}",${a.account_type},${a.total_debit},${a.total_credit},${a.balance}\n`;
      });
    } else if (activeReport === 'profit-loss') {
      csvContent = "Code,Account Name,Type,Amount\n";
      (data.lines || []).forEach((l: any) => {
        csvContent += `${l.code},"${l.name_ka}",${l.account_type},${l.amount}\n`;
      });
    } else if (activeReport === 'balance-sheet') {
      csvContent = "Code,Account Name,Type,Balance\n";
      (data.lines || []).forEach((l: any) => {
        csvContent += `${l.code},"${l.name_ka}",${l.account_type},${l.balance}\n`;
      });
    }

    const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const REPORTS: { id: ReportType; label: string; icon: any; desc: string }[] = [
    { id: 'profit-loss', label: 'P&L', icon: BarChart2, desc: 'მოგება-ზარ. ანგარიშგება' },
    { id: 'balance-sheet', label: 'ბალანსი', icon: Scale, desc: 'ბალანსის ანგარ.' },
    { id: 'trial-balance', label: 'Trial Balance', icon: ListOrdered, desc: 'საბ. ნაშთების ამონ.' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><BarChart2 size={22} /> ფინანსური ანგარიშგება</h2>
          <p className="text-slate-500 text-sm mt-1">სტანდარტული ფინანსური ანგარიშგება · {new Date().getFullYear()}</p>
        </div>
        
        <button 
          onClick={exportToCSV}
          disabled={!data || loading}
          className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-semibold transition-all shadow-lg shadow-brand-600/20 disabled:opacity-50"
        >
          <Download size={18} />
          ექსპორტი (CSV)
        </button>
      </div>

      {/* Date Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-wrap items-end gap-6">
        {activeReport === 'balance-sheet' ? (
          <div className="flex-1 min-w-[200px]">
            <label className="text-slate-500 text-xs mb-1.5 block font-medium uppercase tracking-wider">თარიღისთვის (As of)</label>
            <div className="relative">
              <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="date" value={filters.asOfDate} onChange={e => setFilters({...filters, asOfDate: e.target.value})}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-slate-800 text-sm focus:ring-2 focus:ring-brand-500/20 outline-none transition-all" />
            </div>
          </div>
        ) : (
          <>
            <div className="flex-1 min-w-[160px]">
              <label className="text-slate-500 text-xs mb-1.5 block font-medium uppercase tracking-wider">დან (Start Date)</label>
              <div className="relative">
                <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="date" value={filters.startDate} onChange={e => setFilters({...filters, startDate: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-slate-800 text-sm focus:ring-2 focus:ring-brand-500/20 outline-none transition-all" />
              </div>
            </div>
            <div className="flex-1 min-w-[160px]">
              <label className="text-slate-500 text-xs mb-1.5 block font-medium uppercase tracking-wider">მდე (End Date)</label>
              <div className="relative">
                <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="date" value={filters.endDate} onChange={e => setFilters({...filters, endDate: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-slate-800 text-sm focus:ring-2 focus:ring-brand-500/20 outline-none transition-all" />
              </div>
            </div>
          </>
        )}
        <div className="flex items-center gap-2">
           <button onClick={() => fetchReport(activeReport, filters)} className="p-2.5 bg-slate-800 text-white rounded-xl hover:bg-slate-700 transition-all shadow-md">
             <Filter size={20} />
           </button>
        </div>
      </div>

      {/* Report selector */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {REPORTS.map(r => (
          <button key={r.id} onClick={() => setActiveReport(r.id)}
            className={`p-4 rounded-xl border text-left transition-all relative overflow-hidden group ${activeReport === r.id ? 'bg-brand-600 border-brand-500 text-white shadow-xl shadow-brand-600/20' : 'bg-white shadow-sm border-slate-200 text-slate-500 hover:border-slate-300'}`}>
            {activeReport === r.id && <div className="absolute right-0 top-0 w-24 h-24 bg-white/10 rounded-full -mr-12 -mt-12 transition-transform group-hover:scale-110" />}
            <r.icon size={20} className={`mb-3 ${activeReport === r.id ? 'text-white' : 'text-brand-600'}`} />
            <p className="font-bold text-sm tracking-tight">{r.label}</p>
            <p className={`text-xs mt-1 ${activeReport === r.id ? 'text-brand-100' : 'text-slate-400'}`}>{r.desc}</p>
          </button>
        ))}
      </div>

      {/* Report Content */}
      <div className="min-h-[400px]">
        {loading ? (
          <div className="space-y-4 animate-pulse">
            <div className="h-20 bg-slate-100 rounded-2xl" />
            <div className="h-64 bg-slate-50 rounded-2xl" />
          </div>
        ) : !data ? (
          <div className="text-center py-20 bg-slate-50 rounded-3xl border border-dashed border-slate-300">
            <BarChart2 size={48} className="mx-auto mb-4 text-slate-300" />
            <p className="text-slate-500 font-medium">მონაცემები ვერ მოიძებნა მითითებული პერიოდისთვის</p>
          </div>
        ) : (
          <>
            {activeReport === 'profit-loss' && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {[
                    { label: 'შემოსავალი', value: data.summary?.revenue || 0, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-100' },
                    { label: 'COGS', value: data.summary?.cogs || 0, color: 'text-orange-600', bg: 'bg-orange-50 border-orange-100' },
                    { label: 'საოპ. ხარჯი', value: data.summary?.opex || 0, color: 'text-red-600', bg: 'bg-red-50 border-red-100' },
                    { label: 'მთლიანი მოგება', value: data.summary?.grossProfit || 0, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-100' },
                    { label: 'წმინდა მოგება', value: data.summary?.netProfit || 0, color: 'text-white', bg: 'bg-slate-800 border-slate-700 font-bold' },
                  ].map((s, i) => (
                    <div key={i} className={`rounded-2xl p-4 border transition-transform hover:scale-[1.02] ${s.bg}`}>
                      <p className={`text-[10px] uppercase font-bold tracking-wider mb-1 ${i === 4 ? 'text-slate-400' : 'text-slate-500'}`}>{s.label}</p>
                      <p className={`text-base font-bold truncate ${s.color}`}>{GEL(s.value)}</p>
                    </div>
                  ))}
                </div>

                {data.summary?.revenue > 0 && (
                  <div className="bg-white shadow-sm border border-slate-200 rounded-2xl p-5">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-slate-600 text-sm font-semibold">Gross Profit Margin</span>
                      <span className="text-brand-600 font-bold text-lg">{((data.summary.grossProfit / data.summary.revenue) * 100).toFixed(1)}%</span>
                    </div>
                    <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-brand-600 to-emerald-500 rounded-full transition-all duration-700"
                        style={{ width: `${Math.min(100, Math.max(0, (data.summary.grossProfit / data.summary.revenue) * 100))}%` }} />
                    </div>
                  </div>
                )}

                {(['REVENUE', 'COGS', 'EXPENSE'] as const).map(type => {
                  const typeLines = (data.lines || []).filter((l: any) => l.account_type === type);
                  if (typeLines.length === 0) return null;
                  const colors: Record<string, string> = { REVENUE: 'text-emerald-600 bg-emerald-50', COGS: 'text-orange-600 bg-orange-50', EXPENSE: 'text-red-600 bg-red-50' };
                  const labels: Record<string, string> = { REVENUE: 'შემოსავლები', COGS: 'COGS', EXPENSE: 'საოპერაციო ხარჯები' };
                  return (
                    <div key={type} className="bg-white shadow-sm border border-slate-200 rounded-2xl overflow-hidden">
                      <div className={`px-6 py-4 border-b border-slate-100 flex items-center justify-between`}>
                        <h4 className="font-bold text-slate-800 text-sm">{labels[type]}</h4>
                        <span className={`text-[10px] font-bold px-2 py-1 rounded-lg uppercase ${colors[type]}`}>{type}</span>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <tbody>
                            {typeLines.map((line: any, i: number) => (
                              <tr key={i} className="border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors">
                                <td className="py-3 px-6 font-mono text-slate-400 text-xs w-20">{line.code}</td>
                                <td className="py-3 px-2 text-slate-700 text-sm font-medium">{line.name_ka}</td>
                                <td className="py-3 px-6 text-right text-slate-900 font-bold text-sm tracking-tight">{GEL(line.amount || 0)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {activeReport === 'balance-sheet' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { label: 'ჯამური აქტივები', value: data.summary?.assets || 0, icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                    { label: 'ჯამური ვალდებულებები', value: data.summary?.liabilities || 0, icon: TrendingDown, color: 'text-red-600', bg: 'bg-red-50' },
                    { label: 'კაპიტალი & მოგება', value: data.summary?.equity || 0, icon: Scale, color: 'text-brand-600', bg: 'bg-brand-50' },
                  ].map((s, i) => (
                    <div key={i} className={`rounded-3xl p-6 border border-white/50 shadow-sm ${s.bg}`}>
                      <div className="flex items-center gap-3 mb-4">
                        <div className={`p-2.5 rounded-2xl bg-white shadow-sm ${s.color}`}><s.icon size={20} /></div>
                        <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">{s.label}</p>
                      </div>
                      <p className={`text-2xl font-black ${s.color}`}>{GEL(s.value)}</p>
                    </div>
                  ))}
                </div>

                <div className={`flex items-center gap-3 px-6 py-4 rounded-2xl text-sm font-bold shadow-sm border ${data.summary?.balanced ? 'bg-emerald-500 text-white border-emerald-400' : 'bg-red-500 text-white border-red-400'}`}>
                  {data.summary?.balanced ? '✅ ბალანსი დაცულია: Assets = Liabilities + Equity' : '⚠️ ყურადღება: ბალანსი არ ემთხვევა!'}
                </div>

                {(['ASSET', 'LIABILITY', 'EQUITY'] as const).map(type => {
                  const lines = (data.lines || []).filter((l: any) => l.account_type === type && Math.abs(Number(l.balance)) > 0);
                  if (lines.length === 0) return null;
                  const labels: Record<string, string> = { ASSET: 'აქტივები', LIABILITY: 'ვალდებულებები', EQUITY: 'კაპიტალი და მოგება' };
                  const colors: Record<string, string> = { ASSET: 'text-emerald-600 border-emerald-100', LIABILITY: 'text-red-600 border-red-100', EQUITY: 'text-brand-600 border-brand-100' };
                  
                  return (
                    <div key={type} className="bg-white shadow-sm border border-slate-200 rounded-3xl overflow-hidden">
                      <div className="px-8 py-5 border-b border-slate-100 bg-slate-50/50">
                        <h4 className="font-black text-slate-800 text-xs uppercase tracking-widest">{labels[type]}</h4>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <tbody>
                            {lines.map((line: any, i: number) => (
                              <tr key={i} className="border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors">
                                <td className="py-4 px-8 font-mono text-slate-400 text-[10px] w-24">{line.code}</td>
                                <td className="py-4 px-2 text-slate-700 text-sm font-semibold">{line.name_ka}</td>
                                <td className="py-4 px-8 text-right text-slate-900 font-black text-sm">{GEL(line.balance || 0)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {activeReport === 'trial-balance' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between bg-slate-800 text-white px-8 py-6 rounded-3xl shadow-xl overflow-hidden relative">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16" />
                  <div className="space-y-1">
                    <p className="text-slate-400 text-[10px] uppercase font-bold tracking-[0.2em]">სულ ნეტი ნაშთი</p>
                    <div className="flex items-center gap-6">
                       <div>
                         <p className="text-xs text-emerald-400 font-semibold mb-0.5">Debit</p>
                         <p className="text-xl font-black">{GEL(data.totalDebit)}</p>
                       </div>
                       <div className="w-px h-10 bg-slate-700" />
                       <div>
                         <p className="text-xs text-red-500 font-semibold mb-0.5">Credit</p>
                         <p className="text-xl font-black">{GEL(data.totalCredit)}</p>
                       </div>
                    </div>
                  </div>
                  <div className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest ${data.balanced ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
                    {data.balanced ? 'დაბალანსებულია' : 'დაუბალანსებელი'}
                  </div>
                </div>

                <div className="bg-white shadow-xl border border-slate-200 rounded-3xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100 text-slate-500">
                          <th className="text-left py-4 px-8 font-bold text-[10px] uppercase tracking-wider">კოდი</th>
                          <th className="text-left py-4 px-4 font-bold text-[10px] uppercase tracking-wider">ანგარიში</th>
                          <th className="text-right py-4 px-4 font-bold text-[10px] uppercase tracking-wider text-emerald-600">Debit</th>
                          <th className="text-right py-4 px-4 font-bold text-[10px] uppercase tracking-wider text-red-600">Credit</th>
                          <th className="text-right py-4 px-8 font-bold text-[10px] uppercase tracking-wider">ბალანსი</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(data.accounts || []).filter((a: any) => Math.abs(Number(a.balance)) > 0 || Number(a.total_debit) > 0 || Number(a.total_credit) > 0).map((acc: any, i: number) => (
                          <tr key={i} className="border-b border-slate-50 last:border-0 hover:bg-brand-50/30 transition-colors">
                            <td className="py-4 px-8 font-mono text-brand-600 text-xs font-bold">{acc.code}</td>
                            <td className="py-4 px-4">
                              <p className="text-slate-800 font-bold text-sm">{acc.name_ka}</p>
                              <p className="text-[10px] text-slate-400 font-medium tracking-tight">{acc.account_type}</p>
                            </td>
                            <td className="py-4 px-4 text-right text-emerald-600 font-bold">{Number(acc.total_debit) > 0 ? GEL(acc.total_debit) : '—'}</td>
                            <td className="py-4 px-4 text-right text-red-600 font-bold">{Number(acc.total_credit) > 0 ? GEL(acc.total_credit) : '—'}</td>
                            <td className={`py-4 px-8 text-right font-black text-sm ${Number(acc.balance) >= 0 ? 'text-slate-900' : 'text-red-500'}`}>{GEL(acc.balance || 0)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}       <td className="py-3 px-4 text-right text-red-300">{GEL(data.totalCredit)}</td>
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
