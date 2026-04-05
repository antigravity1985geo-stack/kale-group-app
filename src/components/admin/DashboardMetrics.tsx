import React, { useMemo } from 'react';
import { TrendingUp, ShoppingCart, Package, DollarSign } from 'lucide-react';

interface DashboardMetricsProps {
  orders: any[];
  products: any[];
}

export default function DashboardMetrics({ orders, products }: DashboardMetricsProps) {
  const metrics = useMemo(() => {
    const totalOrders = orders.length;
    const completedOrders = orders.filter(o => o.status === 'delivered');
    const totalRevenue = completedOrders.reduce((acc, current) => acc + Number(current.total_price || 0), 0);
    const averageOrderValue = completedOrders.length > 0 ? totalRevenue / completedOrders.length : 0;

    return {
      totalOrders,
      totalRevenue,
      totalProducts: products.length,
      averageOrderValue,
      pendingOrders: orders.filter(o => o.status === 'pending').length
    };
  }, [orders, products]);

  const cards = [
    {
      title: 'ჯამური გაყიდვები (დასრულებული)',
      value: `₾${metrics.totalRevenue.toLocaleString()}`,
      icon: <DollarSign size={24} className="text-green-500" />,
      bg: 'bg-green-50'
    },
    {
      title: 'შეკვეთების რაოდენობა',
      value: metrics.totalOrders,
      icon: <ShoppingCart size={24} className="text-blue-500" />,
      bg: 'bg-blue-50'
    },
    {
      title: 'ახალი შეკვეთები',
      value: metrics.pendingOrders,
      icon: <TrendingUp size={24} className="text-amber-500" />,
      bg: 'bg-amber-50'
    },
    {
      title: 'პროდუქცია ბაზაში',
      value: metrics.totalProducts,
      icon: <Package size={24} className="text-brand-500" />,
      bg: 'bg-brand-50'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
      {cards.map((card, idx) => (
        <div key={idx} className="bg-white rounded-3xl p-6 shadow-sm border border-brand-100 flex items-center gap-4 hover:-translate-y-1 transition-transform">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${card.bg}`}>
            {card.icon}
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{card.title}</p>
            <p className="text-2xl font-serif text-brand-900">{card.value}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
