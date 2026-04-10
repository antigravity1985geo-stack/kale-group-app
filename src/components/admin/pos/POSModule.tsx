import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../context/AuthContext';
import {
  ShoppingCart, Plus, Minus, Trash2, Search, CreditCard,
  Banknote, Calendar, CheckCircle2, Loader2, X, Package
} from 'lucide-react';

type PaymentMethod = 'cash' | 'card' | 'installment' | 'bank_transfer';

interface CartItem {
  product: any;
  quantity: number;
}

const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  cash: '💵 ნაღდი ფული',
  card: '💳 ბარათი / გადარიცხვა',
  installment: '📅 განვადება',
  bank_transfer: '🏦 საბანკო გადარიცხვა',
};

const INSTALLMENT_RATE = 0.05; // 5%

export default function POSModule() {
  const { user } = useAuth();
  const [products, setProducts] = useState<any[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerIdNumber, setCustomerIdNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successOrder, setSuccessOrder] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch installment rate from company_settings
  const [installmentRate, setInstallmentRate] = useState(INSTALLMENT_RATE);

  useEffect(() => {
    Promise.all([fetchProducts(), fetchSettings()]);
  }, []);

  const fetchSettings = async () => {
    const { data } = await supabase
      .from('company_settings')
      .select('key, value')
      .eq('key', 'installment_surcharge_rate')
      .single();
    if (data?.value) {
      setInstallmentRate(Number(data.value) / 100);
    }
  };

  const fetchProducts = async () => {
    setIsLoading(true);
    const { data } = await supabase
      .from('products')
      .select('*')
      .eq('in_stock', true)
      .order('category');
    setProducts(data || []);
    setIsLoading(false);
  };

  const addToCart = (product: any) => {
    setCart(prev => {
      const existing = prev.find(i => i.product.id === product.id);
      if (existing) {
        return prev.map(i =>
          i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateQty = (productId: string, delta: number) => {
    setCart(prev => prev
      .map(i => i.product.id === productId ? { ...i, quantity: i.quantity + delta } : i)
      .filter(i => i.quantity > 0)
    );
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(i => i.product.id !== productId));
  };

  const getProductPrice = (product: any) => {
    return product.is_on_sale && product.sale_price ? Number(product.sale_price) : Number(product.price);
  };

  const subtotal = cart.reduce((s, i) => s + getProductPrice(i.product) * i.quantity, 0);
  const installmentSurcharge = paymentMethod === 'installment' ? subtotal * installmentRate : 0;
  const total = subtotal + installmentSurcharge;

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.category.toLowerCase().includes(search.toLowerCase())
  );

  const handleCheckout = async () => {
    if (cart.length === 0) return alert('კალათა ცარიელია');
    if (!customerName.trim()) return alert('გთხოვთ მიუთითოთ მომხმარებლის სახელი');

    setIsSubmitting(true);
    try {
      // Create order
      const nameParts = customerName.trim().split(' ');
      const firstName = nameParts[0] || customerName;
      const lastName = nameParts.slice(1).join(' ') || '-';

      const { data: order, error: orderErr } = await supabase
        .from('orders')
        .insert({
          customer_first_name: firstName,
          customer_last_name: lastName,
          customer_phone: customerPhone || '+995000000000',
          customer_email: 'showroom@kalegroup.ge',
          personal_id: customerIdNumber || null,
          total_price: total,
          status: 'delivered', // showroom sales are immediate
          payment_method: paymentMethod,
          sale_source: 'showroom',
          installment_surcharge: installmentSurcharge,
          notes: notes || `შოურუმის გაყიდვა — ${PAYMENT_LABELS[paymentMethod]}`,
          consultant_id: user?.id,
          customer_address: 'შოურუმი',
          customer_city: 'თბილისი',
          payment_type: paymentMethod === 'installment' ? 'installment' : 'full',
          payment_status: paymentMethod === 'installment' ? 'pending' : 'paid',
          customer_type: 'physical',
        })
        .select()
        .single();

      if (orderErr) throw orderErr;

      // Insert order items
      const items = cart.map(i => ({
        order_id: order.id,
        product_id: i.product.id,
        product_name: i.product.name,
        quantity: i.quantity,
        price_at_purchase: getProductPrice(i.product),
      }));

      const { error: itemErr } = await supabase.from('order_items').insert(items);
      if (itemErr) throw itemErr;

      // Trigger accounting entry
      const { data: rpcResult, error: rpcErr } = await supabase.rpc('process_order_sale', {
        p_order_id: order.id,
      });
      if (rpcErr) {
        console.error('❌ Accounting RPC error:', rpcErr.message);
        alert('⚠️ გაყიდვა შესრულდა, მაგრამ ბუღალტრული გატარება ვერ მოხერხდა: ' + rpcErr.message);
      } else if (rpcResult && !rpcResult.success) {
        console.warn('⚠️ Accounting entry warning:', rpcResult.error);
        alert('⚠️ გაყიდვა შესრულდა, მაგრამ: ' + (rpcResult.error || 'ბუღალტრული გატარების პრობლემა'));
      } else if (rpcResult?.success) {
        console.log('✅ Accounting entry created:', rpcResult.entry_number, '| Payment:', rpcResult.payment_label);
      }

      setSuccessOrder({ ...order, items });
      setCart([]);
      setCustomerName('');
      setCustomerPhone('');
      setCustomerIdNumber('');
      setNotes('');
      setPaymentMethod('cash');
    } catch (err: any) {
      alert('შეცდომა: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (successOrder) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mb-6">
          <CheckCircle2 size={40} className="text-emerald-600" />
        </div>
        <h2 className="text-3xl font-serif text-brand-900 mb-2">გაყიდვა დასრულდა!</h2>
        <p className="text-brand-500 mb-1">შეკვეთა #{successOrder.id.slice(0, 8).toUpperCase()}</p>
        <p className="text-2xl font-bold text-brand-900 mb-6">₾{Number(successOrder.total_price).toLocaleString()}</p>
        <div className="flex gap-3">
          <button
            onClick={() => setSuccessOrder(null)}
            className="px-8 py-3 bg-brand-900 text-gold-400 rounded-xl font-bold text-sm uppercase tracking-widest hover:bg-brand-950 transition-all border-none cursor-pointer"
          >
            <Plus size={16} className="inline mr-2" />
            ახალი გაყიდვა
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-6 h-[calc(100vh-220px)]">
      {/* Left: Product Catalog */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="relative mb-4">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="პროდუქტის ძება..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gold-400 transition-all"
          />
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center flex-1">
            <Loader2 className="animate-spin text-brand-400" size={32} />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto grid grid-cols-2 lg:grid-cols-3 gap-3 pr-2">
            {filteredProducts.map(p => {
              const price = getProductPrice(p);
              const inCart = cart.find(i => i.product.id === p.id);
              return (
                <button
                  key={p.id}
                  onClick={() => addToCart(p)}
                  className={`relative text-left bg-white border rounded-2xl p-4 transition-all cursor-pointer hover:shadow-md hover:border-gold-400 group ${inCart ? 'border-gold-400 bg-amber-50/50' : 'border-gray-100'}`}
                >
                  {inCart && (
                    <span className="absolute top-2 right-2 w-6 h-6 bg-gold-400 text-brand-900 rounded-full text-xs font-bold flex items-center justify-center">
                      {inCart.quantity}
                    </span>
                  )}
                  <div className="w-full aspect-square rounded-xl overflow-hidden mb-3 bg-gray-50">
                    <img
                      src={p.images?.[0] || ''}
                      alt={p.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <p className="text-xs font-semibold text-brand-900 leading-tight mb-1 line-clamp-2">{p.name}</p>
                  <p className="text-[10px] text-brand-400 uppercase tracking-wider">{p.category}</p>
                  <p className="text-sm font-bold text-brand-900 mt-1">₾{price.toLocaleString()}</p>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Right: Cart & Checkout */}
      <div className="w-96 flex flex-col bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Cart Header */}
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-serif text-brand-900 text-lg flex items-center gap-2">
            <ShoppingCart size={20} /> კალათა
          </h3>
          {cart.length > 0 && (
            <button onClick={() => setCart([])} className="text-xs text-red-400 hover:text-red-600 flex items-center gap-1 border-none bg-transparent cursor-pointer">
              <X size={14} /> გასუფთავება
            </button>
          )}
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-300">
              <Package size={40} className="mb-2" />
              <p className="text-sm">კალათა ცარიელია</p>
              <p className="text-xs mt-1">პროდუქტზე დაჭერით დაამატეთ</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.product.id} className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
                <img
                  src={item.product.images?.[0]}
                  alt={item.product.name}
                  className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-brand-900 truncate">{item.product.name}</p>
                  <p className="text-xs text-brand-400">₾{getProductPrice(item.product).toLocaleString()} / ც.</p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => updateQty(item.product.id, -1)} className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center hover:bg-red-50 hover:border-red-200 text-gray-600 hover:text-red-500 transition-all cursor-pointer">
                    <Minus size={12} />
                  </button>
                  <span className="w-6 text-center text-sm font-bold text-brand-900">{item.quantity}</span>
                  <button onClick={() => updateQty(item.product.id, 1)} className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center hover:bg-green-50 hover:border-green-200 text-gray-600 hover:text-green-500 transition-all cursor-pointer">
                    <Plus size={12} />
                  </button>
                  <button onClick={() => removeFromCart(item.product.id)} className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center hover:bg-red-500 hover:border-red-500 text-gray-400 hover:text-white transition-all cursor-pointer ml-1">
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Checkout Form */}
        <div className="border-t border-gray-100 p-4 space-y-3">
          {/* Customer info */}
          <input
            type="text"
            placeholder="მომხმარებლის სახელი *"
            value={customerName}
            onChange={e => setCustomerName(e.target.value)}
            className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gold-400 transition-all"
          />
          <input
            type="text"
            placeholder="პირადი ნომერი (სურვ.)"
            value={customerIdNumber}
            onChange={e => setCustomerIdNumber(e.target.value)}
            className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gold-400 transition-all"
          />
          <input
            type="tel"
            placeholder="ტელეფონი (სურვ.)"
            value={customerPhone}
            onChange={e => setCustomerPhone(e.target.value)}
            className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gold-400 transition-all"
          />

          {/* Payment Method */}
          <div>
            <p className="text-xs font-semibold text-brand-500 uppercase tracking-widest mb-2">გადახდის მეთოდი</p>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(PAYMENT_LABELS) as PaymentMethod[]).map(method => (
                <button
                  key={method}
                  onClick={() => setPaymentMethod(method)}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold transition-all border cursor-pointer ${
                    paymentMethod === method
                      ? 'bg-brand-900 text-gold-400 border-brand-900'
                      : 'bg-gray-50 text-brand-500 border-gray-200 hover:border-brand-300'
                  }`}
                >
                  {PAYMENT_LABELS[method]}
                </button>
              ))}
            </div>
          </div>

          {/* Installment notice */}
          {paymentMethod === 'installment' && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700">
              <Calendar size={14} className="inline mr-1" />
              განვადების საკომისიო: <strong>+{(installmentRate * 100).toFixed(0)}%</strong> = ₾{installmentSurcharge.toLocaleString('ka-GE', { minimumFractionDigits: 2 })}
            </div>
          )}

          {/* Notes */}
          <input
            type="text"
            placeholder="შენიშვნა (სურვ.)"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gold-400 transition-all"
          />

          {/* Totals */}
          <div className="bg-gray-50 rounded-xl p-3 space-y-1">
            <div className="flex justify-between text-xs text-brand-500">
              <span>ქვეჯამი</span>
              <span>₾{subtotal.toLocaleString('ka-GE', { minimumFractionDigits: 2 })}</span>
            </div>
            {installmentSurcharge > 0 && (
              <div className="flex justify-between text-xs text-amber-600">
                <span>განვადება (+{(installmentRate * 100).toFixed(0)}%)</span>
                <span>+₾{installmentSurcharge.toLocaleString('ka-GE', { minimumFractionDigits: 2 })}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-brand-900 pt-1 border-t border-gray-200">
              <span>სულ</span>
              <span>₾{total.toLocaleString('ka-GE', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>

          <button
            onClick={handleCheckout}
            disabled={isSubmitting || cart.length === 0}
            className="w-full py-3.5 bg-brand-900 text-gold-400 rounded-xl font-bold text-sm uppercase tracking-widest hover:bg-brand-950 transition-all border-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <>
                {paymentMethod === 'cash' ? <Banknote size={18} /> : <CreditCard size={18} />}
                გაყიდვის დასრულება
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
