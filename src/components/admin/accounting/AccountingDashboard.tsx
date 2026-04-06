import React, { useState, useEffect } from 'react';
import {
  TrendingUp, Package, Percent, DollarSign, Receipt, FileText,
  Warehouse, Wallet, ArrowUpRight, ArrowDownRight, RefreshCw
} from 'lucide-react';

interface KPIs {
  revenue: string;
  cogs: string;
  grossProfit: string;
  grossMarginPct: string;
  netProfit: string;
  totalPaidRevenue: string;
  inventoryValue: string;
  vatPayable: string;
}

interface MonthlyData {
  year: number;
  month: number;
  revenue: number;
  cogs: number;
  gross_profit: number;
  net_profit: number;
}

const GEL = (v: string | number) =>
  Number(v).toLocaleString('ka-GE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ₾';

const MONTH_NAMES = ['იანვ', 'თებ', 'მარ', 'აპრ', 'მაი', 'ივნ', 'ივლ', 'აგვ', 'სექ', 'ოქტ', 'ნოე', 'დეკ'];

export default function AccountingDashboard() {
  const [kpis, setKpis] = useState<KPIs | null>(null);
  const [monthly, setMonthly] = useState<MonthlyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const token = (await import('../../../lib/supabase')).supabase.auth.getSession().then((s: any) => s.data.session?.access_token);
      const jwt = await token;
      const res = await fetch('/api/accounting/dashboard', {
        headers: { Authorization: `Bearer ${jwt}` }
      });
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();
      setKpis(json.kpis);
      setMonthly(json.monthlySummary || []);
    } catch (err: any) {
      setError(err.message || 'მონაცემების მიღება ვერ მოხერხდა');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const cards = kpis ? [
    { label: 'ყოვ. შემოსავ.', value: GEL(kpis.revenue), color: 'from-emerald-500 to-teal-600', icon: TrendingUp, trend: '+' },
    { label: 'COGS', value: GEL(kpis.cogs), color: 'from-orange-500 to-amber-600', icon: Package, trend: '' },
    { label: 'მთლ. მოგება %', value: kpis.grossMarginPct + '%', color: 'from-blue-500 to-indigo-600', icon: Percent, trend: '' },
    { label: 'მთლ. მოგება', value: GEL(kpis.grossProfit), color: 'from-violet-500 to-purple-600', icon: DollarSign, trend: '+' },
    { label: 'დღგ გადასახ.', value: GEL(kpis.vatPayable), color: 'from-red-500 to-rose-600', icon: Receipt, trend: '' },
    { label: 'გადახ. ინვოის.', value: GEL(kpis.totalPaidRevenue), color: 'from-cyan-500 to-sky-600', icon: FileText, trend: '+' },
    { label: 'მარაგის ღირ.', value: GEL(kpis.inventoryValue), color: 'from-teal-500 to-green-600', icon: Warehouse, trend: '' },
    { label: 'ნეტო მოგება', value: GEL(kpis.netProfit), color: 'from-green-500 to-emerald-700', icon: Wallet, trend: '+' },
  ] : [];

  const maxRevenue = Math.max(...monthly.map(m => Number(m.revenue || 0)), 1);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">📊 ბუღალტერიის დეშბორდი</h2>
          <p className="text-stone-400 text-sm mt-1">რეალური ფინანსური მონაცემები · {new Date().getFullYear()}</p>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-2 px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-xl text-sm transition-all"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          განახლება
        </button>
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-700/50 rounded-xl p-4 text-red-300 text-sm">{error}</div>
      )}

      {/* KPI Cards */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array(8).fill(0).map((_, i) => (
            <div key={i} className="bg-stone-900/60 rounded-2xl p-5 animate-pulse h-28" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {cards.map((card, i) => (
            <div key={i} className="relative overflow-hidden bg-stone-900/80 border border-stone-800/50 rounded-2xl p-5 group hover:border-stone-700 transition-all">
              <div className={`absolute -right-4 -top-4 w-20 h-20 rounded-full bg-gradient-to-br ${card.color} opacity-10 group-hover:opacity-20 transition-opacity`} />
              <div className={`inline-flex p-2 rounded-xl bg-gradient-to-br ${card.color} mb-3`}>
                <card.icon size={16} className="text-white" />
              </div>
              <p className="text-stone-400 text-xs mb-1">{card.label}</p>
              <p className="text-white font-bold text-lg leading-tight">{card.value}</p>
              {card.trend && (
                <div className="flex items-center gap-1 mt-1">
                  <ArrowUpRight size={12} className="text-emerald-400" />
                  <span className="text-emerald-400 text-xs">YTD</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Monthly Revenue Chart */}
      {monthly.length > 0 && (
        <div className="bg-stone-900/80 border border-stone-800/50 rounded-2xl p-6">
          <h3 className="text-white font-semibold mb-6">📈 ყოველთვიური შემოსავ. / მოგება</h3>
          <div className="flex items-end gap-3 h-48">
            {monthly.map((m, i) => {
              const revH = Math.round((Number(m.revenue || 0) / maxRevenue) * 160);
              const profH = Math.round((Math.max(Number(m.net_profit || 0), 0) / maxRevenue) * 160);
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                  <div className="flex items-end gap-0.5 h-40">
                    {/* Revenue bar */}
                    <div
                      className="w-4 bg-gradient-to-t from-emerald-600 to-emerald-400 rounded-t-sm group-hover:from-emerald-500 group-hover:to-emerald-300 transition-all"
                      style={{ height: revH || 2 }}
                    />
                    {/* Net profit bar */}
                    <div
                      className="w-4 bg-gradient-to-t from-violet-600 to-violet-400 rounded-t-sm group-hover:from-violet-500 group-hover:to-violet-300 transition-all"
                      style={{ height: profH || 2 }}
                    />
                  </div>
                  <span className="text-stone-500 text-xs">{MONTH_NAMES[(m.month || 1) - 1]}</span>
                  {/* Tooltip */}
                  <div className="absolute -top-16 left-1/2 -translate-x-1/2 bg-stone-800 border border-stone-700 rounded-lg px-3 py-2 text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
                    <div className="text-emerald-400">შემოს: {GEL(m.revenue || 0)}</div>
                    <div className="text-violet-400">მოგება: {GEL(m.net_profit || 0)}</div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-6 mt-4 text-xs text-stone-400">
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm bg-emerald-500" />შემოსავალი</div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm bg-violet-500" />ნეტო მოგება</div>
          </div>
        </div>
      )}

      {!loading && monthly.length === 0 && (
        <div className="bg-stone-900/50 border border-stone-800 border-dashed rounded-2xl p-10 text-center">
          <div className="text-4xl mb-3">📭</div>
          <p className="text-stone-400 text-sm">ჟურნალის ჩანაწერები ჯერ არ არის. დაამატეთ პირველი Journal Entry.</p>
        </div>
      )}
    </div>
  );
}
