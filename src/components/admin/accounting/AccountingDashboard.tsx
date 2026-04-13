import React, { useState, useEffect } from 'react';
import {
  TrendingUp, Package, Percent, DollarSign, Receipt, FileText,
  Warehouse, Wallet, ArrowUpRight, ArrowDownRight, RefreshCw, ToggleLeft, ToggleRight,
  Banknote, CreditCard, Building2, CalendarClock
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';

interface KPIs {
  revenue: string;
  cogs: string;
  grossProfit: string;
  grossMarginPct: string;
  netProfit: string;
  totalPaidRevenue: string;
  inventoryValue: string;
  vatPayable: string;
  promotionalSales: string;
}

interface PaymentMethodData {
  count: number;
  total: number;
}

interface PaymentBreakdown {
  cash: PaymentMethodData;
  card: PaymentMethodData;
  bank_transfer: PaymentMethodData;
  installment: PaymentMethodData;
  other: PaymentMethodData;
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
  const [paymentBreakdown, setPaymentBreakdown] = useState<PaymentBreakdown | null>(null);
  const [monthly, setMonthly] = useState<MonthlyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [vatEnabled, setVatEnabled] = useState(false);
  const [vatLoading, setVatLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      // Fetch VAT setting
      const { data: settingsData } = await supabase
        .from('company_settings')
        .select('value')
        .eq('key', 'vat_registered')
        .single();
      
      if (settingsData && settingsData.value === true) {
        setVatEnabled(true);
      } else {
        setVatEnabled(false);
      }

      const token = (await import('../../../lib/supabase')).supabase.auth.getSession().then((s: any) => s.data.session?.access_token);
      const jwt = await token;
      const res = await fetch('/api/accounting/dashboard', {
        headers: { Authorization: `Bearer ${jwt}` }
      });
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();
      setKpis(json.kpis);
      setPaymentBreakdown(json.payment_breakdown || json.paymentBreakdown || null);
      setMonthly(json.monthly_summary || json.monthlySummary || []);
    } catch (err: any) {
      setError(err.message || 'მონაცემების მიღება ვერ მოხერხდა');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const toggleVat = async () => {
    setVatLoading(true);
    const newValue = !vatEnabled;
    try {
      const { error } = await supabase
        .from('company_settings')
        .upsert({ 
          key: 'vat_registered', 
          value: newValue, 
          description: 'კომპანია დღგ-ს გადამხდელია თუ არა. true = დღგ ჩართულია, false = გამორთულია' 
        }, { onConflict: 'key' });
        
      if (error) throw error;
      setVatEnabled(newValue);
    } catch (err: any) {
      alert('ვერ მოხერხდა დღგ-ს სტატუსის შეცვლა: ' + err.message);
    } finally {
      setVatLoading(false);
    }
  };

  const cards = kpis ? [
    { label: 'ყოვ. შემოსავ.', value: GEL(kpis.revenue), variant: 'admin-card-emerald', icon: TrendingUp, trend: '+' },
    { label: 'COGS', value: GEL(kpis.cogs), variant: 'admin-card-orange', icon: Package, trend: '' },
    { label: 'მთლ. მოგება %', value: kpis.grossMarginPct + '%', variant: 'admin-card-blue', icon: Percent, trend: '' },
    { label: 'მთლ. მოგება', value: GEL(kpis.grossProfit), variant: 'admin-card-violet', icon: DollarSign, trend: '+' },
    { label: 'დღგ გადასახ.', value: GEL(kpis.vatPayable), variant: 'admin-card-rose', icon: Receipt, trend: '' },
    { label: 'გადახ. ინვოის.', value: GEL(kpis.totalPaidRevenue), variant: 'admin-card-cyan', icon: FileText, trend: '+' },
    { label: 'მარაგის ღირ.', value: GEL(kpis.inventoryValue), variant: 'admin-card-teal', icon: Warehouse, trend: '' },
    { label: 'ნეტო მოგება', value: GEL(kpis.netProfit), variant: 'admin-card-indigo', icon: Wallet, trend: '+' },
    { label: 'აქციით გაყიდვ.', value: GEL(kpis.promotionalSales), variant: 'admin-card-pink', icon: Percent, trend: '+' },
  ] : [];

  const paymentMethods = paymentBreakdown ? [
    {
      key: 'cash',
      label: 'ნაღდი ფული',
      icon: Banknote,
      count: paymentBreakdown.cash.count,
      total: paymentBreakdown.cash.total,
      variant: 'admin-card-emerald',
      color: 'from-emerald-500 to-emerald-400',
    },
    {
      key: 'card',
      label: 'საბანკო ბარათი',
      icon: CreditCard,
      count: paymentBreakdown.card.count,
      total: paymentBreakdown.card.total,
      variant: 'admin-card-blue',
      color: 'from-blue-500 to-blue-400',
    },
    {
      key: 'bank_transfer',
      label: 'საბანკო გადარიცხვა',
      icon: Building2,
      count: paymentBreakdown.bank_transfer.count,
      total: paymentBreakdown.bank_transfer.total,
      variant: 'admin-card-violet',
      color: 'from-violet-500 to-violet-400',
    },
    {
      key: 'installment',
      label: 'განვადება',
      icon: CalendarClock,
      count: paymentBreakdown.installment.count,
      total: paymentBreakdown.installment.total,
      variant: 'admin-card-orange',
      color: 'from-orange-500 to-orange-400',
    },
  ] : [];

  const grandTotal = paymentMethods.reduce((s, m) => s + m.total, 0);

  const maxRevenue = Math.max(...monthly.map(m => Number(m.revenue || 0)), 1);

  return (
    <div className="admin-fade-in space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-admin-text">📊 ბუღალტერიის დეშბორდი</h2>
          <p className="text-admin-muted text-sm mt-1">რეალური ფინანსური მონაცემები · {new Date().getFullYear()}</p>
        </div>
        <div className="flex items-center gap-4">
          {/* VAT Toggle */}
          <div className="flex items-center gap-2 bg-slate-50 border border-admin-muted/10 px-4 py-2 rounded-xl shadow-sm">
            <span className="text-sm font-medium text-slate-700">დღგ გადამხდელი</span>
            <button
              onClick={toggleVat}
              disabled={vatLoading || loading}
              className={`flex items-center justify-center transition-colors ${vatEnabled ? 'text-emerald-500 hover:text-emerald-600' : 'text-slate-400 hover:text-admin-muted'} disabled:opacity-50`}
              title={vatEnabled ? 'დღგ ჩართულია' : 'დღგ გამორთულია'}
            >
              {vatEnabled ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
            </button>
          </div>
          
          <button
            onClick={fetchData}
            className="flex items-center gap-2 px-4 py-2 bg-admin-primary text-white hover:bg-admin-primary-hover rounded-xl text-sm transition-all shadow-sm"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            განახლება
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-700/50 rounded-xl p-4 text-red-300 text-sm">{error}</div>
      )}

      {/* KPI Cards */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array(8).fill(0).map((_, i) => (
            <div key={i} className="bg-white shadow-sm/60 rounded-2xl p-5 animate-pulse h-28" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {cards.map((card, i) => (
            <div key={i} className={`admin-metric-card ${card.variant} admin-fade-in stagger-1 group`}>
              <div className="admin-card-orb"></div>
              <div className="flex items-center justify-between mb-3 relative z-10">
                <div className="card-icon-container p-2.5 rounded-xl transition-transform group-hover:scale-110">
                  <card.icon size={18} />
                </div>
              </div>
              <p className="admin-card-title">{card.label}</p>
              <p className="admin-card-value !text-xl">{card.value}</p>
              {card.trend && (
                <div className="flex items-center gap-1 mt-1 relative z-10">
                  <ArrowUpRight size={12} className="text-emerald-500" />
                  <span className="text-emerald-500 text-[10px] font-bold">YTD</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Payment Method Breakdown */}
      {!loading && paymentBreakdown && (
        <div className="bg-admin-card shadow-[0_18px_40px_rgba(112,144,176,0.12)] rounded-3xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-admin-text font-semibold">💳 გადახდის მეთოდების დაშლა</h3>
            <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">დასრულებული შეკვეთები</span>
          </div>
          
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {paymentMethods.map((pm) => (
              <div key={pm.key} className={`admin-metric-card ${pm.variant} group`}>
                <div className="admin-card-orb"></div>
                <div className="flex items-center gap-3 mb-4 relative z-10">
                   <div className="card-icon-container p-2.5 rounded-xl">
                     <pm.icon size={18} />
                   </div>
                   <span className="admin-card-title !mb-0">{pm.label}</span>
                </div>
                <p className="admin-card-value !text-lg">{GEL(pm.total)}</p>
                <p className="admin-card-sub">{pm.count} ტრანზაქცია</p>
              </div>
            ))}
          </div>

          {/* Payment Method Bar */}
          {grandTotal > 0 && (
            <div className="space-y-3">
              <div className="flex rounded-full overflow-hidden h-4 bg-slate-100">
                {paymentMethods.map((pm) => {
                  const pct = grandTotal > 0 ? (pm.total / grandTotal) * 100 : 0;
                  if (pct === 0) return null;
                  return (
                    <div
                      key={pm.key}
                      className={`bg-gradient-to-r ${pm.color} transition-all relative group`}
                      style={{ width: `${pct}%` }}
                      title={`${pm.label}: ${pct.toFixed(1)}%`}
                    >
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
                        {pm.label}: {pct.toFixed(1)}%
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center justify-center gap-5 text-xs text-admin-muted flex-wrap">
                {paymentMethods.map((pm) => {
                  const pct = grandTotal > 0 ? (pm.total / grandTotal) * 100 : 0;
                  return (
                    <div key={pm.key} className="flex items-center gap-1.5">
                      <div className={`w-2.5 h-2.5 rounded-sm bg-gradient-to-br ${pm.color}`} />
                      <span>{pm.label}</span>
                      <span className="font-bold text-slate-700">{pct.toFixed(1)}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Monthly Revenue Chart */}
      {monthly.length > 0 && (
        <div className="bg-admin-card shadow-[0_18px_40px_rgba(112,144,176,0.12)] rounded-3xl p-6">
          <h3 className="text-admin-text font-semibold mb-6">📈 ყოველთვიური შემოსავ. / მოგება</h3>
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
                  <span className="text-slate-400 text-xs">{MONTH_NAMES[(m.month || 1) - 1]}</span>
                  {/* Tooltip */}
                  <div className="absolute -top-16 left-1/2 -translate-x-1/2 bg-admin-bg border border-admin-muted/10 rounded-lg px-3 py-2 text-xs text-slate-200 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none shadow-xl">
                    <div className="text-emerald-400">შემოს: {GEL(m.revenue || 0)}</div>
                    <div className="text-violet-400">მოგება: {GEL(m.net_profit || 0)}</div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-6 mt-4 text-xs text-admin-muted">
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm bg-emerald-500" />შემოსავალი</div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm bg-violet-500" />ნეტო მოგება</div>
          </div>
        </div>
      )}

      {!loading && monthly.length === 0 && (
        <div className="bg-admin-card border-2 border-dashed border-admin-muted/20 rounded-3xl p-10 text-center">
          <div className="text-4xl mb-3">📭</div>
          <p className="text-admin-muted text-sm">ჟურნალის ჩანაწერები ჯერ არ არის. დაამატეთ პირველი Journal Entry.</p>
        </div>
      )}
    </div>
  );
}
