import React, { useMemo } from 'react';
import { TrendingUp, ShoppingCart, Package, DollarSign, Clock, CheckCircle2, AlertCircle, BarChart3 } from 'lucide-react';
import { isProductOnActiveSale } from '../../utils/promotions';

interface DashboardMetricsProps {
  orders: any[];
  products: any[];
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pending:    { label: 'მოლოდინი',   color: 'text-amber-600',  bg: 'bg-amber-100' },
  confirmed:  { label: 'დადასტ.',    color: 'text-blue-600',   bg: 'bg-blue-100' },
  processing: { label: 'დამუშავება', color: 'text-purple-600', bg: 'bg-purple-100' },
  shipped:    { label: 'გამოგზ.',    color: 'text-cyan-600',   bg: 'bg-cyan-100' },
  delivered:  { label: 'მიტანილი',  color: 'text-emerald-600',bg: 'bg-emerald-100' },
  cancelled:  { label: 'გაუქმებ.',  color: 'text-red-500',    bg: 'bg-red-100' },
};

export default function DashboardMetrics({ orders, products }: DashboardMetricsProps) {
  const metrics = useMemo(() => {
    const totalOrders = orders.length;
    const completedOrders = orders.filter(o => o.status === 'delivered');
    const totalRevenue = completedOrders.reduce((acc, cur) => acc + Number(cur.total_price || 0), 0);
    const averageOrderValue = completedOrders.length > 0 ? totalRevenue / completedOrders.length : 0;
    const pendingOrders = orders.filter(o => o.status === 'pending').length;

    // Monthly revenue (last 6 months from order data)
    const now = new Date();
    const months: { label: string; revenue: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = d.toLocaleString('ka-GE', { month: 'short' });
      const revenue = orders
        .filter(o => {
          const od = new Date(o.created_at);
          return od.getFullYear() === d.getFullYear() && od.getMonth() === d.getMonth() && o.status === 'delivered';
        })
        .reduce((acc, o) => acc + Number(o.total_price || 0), 0);
      months.push({ label, revenue });
    }

    // Status breakdown
    const statusCounts: Record<string, number> = {};
    orders.forEach(o => {
      statusCounts[o.status] = (statusCounts[o.status] || 0) + 1;
    });

    return { totalOrders, totalRevenue, totalProducts: products.length, averageOrderValue, pendingOrders, months, statusCounts };
  }, [orders, products]);

  const maxRevenue = Math.max(...metrics.months.map(m => m.revenue), 1);

  const statCards = [
    {
      title: 'ჯამური გაყიდვები',
      value: `₾${metrics.totalRevenue.toLocaleString('ka-GE', { minimumFractionDigits: 0 })}`,
      sub: 'მხოლოდ მიტანილი შეკვეთები',
      icon: <DollarSign size={22} className="text-emerald-600" />,
      iconBg: 'bg-emerald-100',
      accent: 'border-l-emerald-400',
    },
    {
      title: 'ყველა შეკვეთა',
      value: metrics.totalOrders,
      sub: `${metrics.pendingOrders} ახალი მოლოდინში`,
      icon: <ShoppingCart size={22} className="text-blue-600" />,
      iconBg: 'bg-blue-100',
      accent: 'border-l-blue-400',
    },
    {
      title: 'საშ. შეკვეთის ღირ.',
      value: `₾${metrics.averageOrderValue.toLocaleString('ka-GE', { minimumFractionDigits: 0 })}`,
      sub: 'დასრულებული შეკვ.-დან',
      icon: <TrendingUp size={22} className="text-violet-600" />,
      iconBg: 'bg-violet-100',
      accent: 'border-l-violet-400',
    },
    {
      title: 'პროდუქცია ბაზაში',
      value: metrics.totalProducts,
      sub: `${products.filter(p => isProductOnActiveSale(p)).length} აქციაზე`,
      icon: <Package size={22} className="text-amber-600" />,
      iconBg: 'bg-amber-100',
      accent: 'border-l-amber-400',
    },
  ];

  const recentOrders = [...orders]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 6);

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, idx) => (
          <div key={idx} className={`bg-white rounded-2xl p-5 shadow-sm border border-slate-100 border-l-4 ${card.accent} hover:-translate-y-0.5 hover:shadow-md transition-all`}>
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${card.iconBg}`}>
                {card.icon}
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-800 mb-0.5">{card.value}</p>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">{card.title}</p>
            <p className="text-xs text-slate-500 mt-1">{card.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Revenue Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <div className="flex items-center gap-2 mb-5">
            <BarChart3 size={18} className="text-slate-500" />
            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-widest">ბოლო 6 თვის შემოსავალი</h3>
          </div>
          <div className="flex items-end gap-2 h-40">
            {metrics.months.map((m, i) => {
              const pct = maxRevenue > 0 ? (m.revenue / maxRevenue) * 100 : 0;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[10px] text-slate-400 font-mono">
                    {m.revenue > 0 ? `₾${(m.revenue / 1000).toFixed(0)}k` : ''}
                  </span>
                  <div className="w-full rounded-t-lg transition-all relative group" style={{ height: `${Math.max(pct, 2)}%`, background: pct > 0 ? 'linear-gradient(to top, #1a1714, #b8933f)' : '#f1f5f9' }}>
                    {pct > 0 && (
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition text-[10px] bg-slate-800 text-white px-2 py-1 rounded-lg whitespace-nowrap">
                        ₾{m.revenue.toLocaleString()}
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-500 font-semibold">{m.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Status Breakdown */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <h3 className="text-sm font-bold text-slate-700 uppercase tracking-widest mb-5">შეკვეთების სტატუსი</h3>
          <div className="space-y-2.5">
            {Object.entries(metrics.statusCounts).map(([status, count]) => {
              const cfg = STATUS_CONFIG[status] || { label: status, color: 'text-slate-600', bg: 'bg-slate-100' };
              const pct = metrics.totalOrders > 0 ? Math.round((count / metrics.totalOrders) * 100) : 0;
              return (
                <div key={status}>
                  <div className="flex justify-between items-center mb-1">
                    <span className={`text-xs font-semibold ${cfg.color}`}>{cfg.label}</span>
                    <span className="text-xs text-slate-500">{count} ({pct}%)</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${cfg.bg.replace('bg-', 'bg-').replace('-100', '-400')}`}
                      style={{ width: `${pct}%`, transition: 'width 0.8s ease' }} />
                  </div>
                </div>
              );
            })}
            {Object.keys(metrics.statusCounts).length === 0 && (
              <p className="text-sm text-slate-400 text-center py-4">შეკვეთები ჯერ არ არის</p>
            )}
          </div>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-50 flex items-center gap-2">
          <Clock size={16} className="text-slate-400" />
          <h3 className="text-sm font-bold text-slate-700 uppercase tracking-widest">ბოლო შეკვეთები</h3>
        </div>
        <div className="divide-y divide-slate-50">
          {recentOrders.length === 0 ? (
            <p className="text-center text-slate-400 py-8 text-sm">შეკვეთები ჯერ არ არის</p>
          ) : recentOrders.map(o => {
            const cfg = STATUS_CONFIG[o.status] || { label: o.status, color: 'text-slate-500', bg: 'bg-slate-100' };
            const date = new Date(o.created_at).toLocaleDateString('ka-GE', { month: 'short', day: 'numeric' });
            return (
              <div key={o.id} className="flex items-center justify-between px-6 py-3.5 hover:bg-slate-50/60 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${cfg.bg}`}>
                    {o.status === 'delivered' ? <CheckCircle2 size={14} className="text-emerald-600" /> :
                     o.status === 'cancelled' ? <AlertCircle size={14} className="text-red-500" /> :
                     <Clock size={14} className="text-amber-500" />}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      {o.customer_first_name} {o.customer_last_name}
                    </p>
                    <p className="text-xs text-slate-400">{date} · {o.customer_city}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-slate-800">₾{Number(o.total_price || 0).toLocaleString()}</p>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.color} ${cfg.bg}`}>
                    {cfg.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
