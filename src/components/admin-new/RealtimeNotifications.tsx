import toast from 'react-hot-toast';
import { ShoppingCart, Mail } from 'lucide-react';
import { useRealtime } from '../../hooks/useRealtime';
import { useAuth } from '../../context/AuthContext';

export function RealtimeNotifications() {
  const { profile } = useAuth();
  const shouldSubscribe = profile && ['admin', 'consultant'].includes(profile.role);

  useRealtime('orders', 'INSERT', (payload) => {
    if (!shouldSubscribe) return;
    const o = payload.new as any;
    toast.custom(() => (
      <div className="bg-card border border-primary/30 rounded-xl p-4 shadow-xl flex items-center gap-3">
        <ShoppingCart className="h-5 w-5 text-primary" />
        <div>
          <p className="font-semibold">ახალი შეკვეთა</p>
          <p className="text-xs text-muted-foreground">
            {o.customer_first_name} {o.customer_last_name} — ₾{Number(o.total_price).toFixed(2)}
          </p>
        </div>
      </div>
    ));
  });

  useRealtime('contact_messages', 'INSERT', (payload) => {
    if (!shouldSubscribe) return;
    const m = payload.new as any;
    toast.custom(() => (
      <div className="bg-card border border-emerald-500/30 rounded-xl p-4 shadow-xl flex items-center gap-3">
        <Mail className="h-5 w-5 text-emerald-500" />
        <div>
          <p className="font-semibold">ახალი შეტყობინება</p>
          <p className="text-xs text-muted-foreground">{m.name} — {m.phone}</p>
        </div>
      </div>
    ));
  });

  return null;
}
