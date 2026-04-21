import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Check, RefreshCw, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { useCart } from '../context/CartContext';
import type { CustomerInfo } from '../types/product';
import { useTranslation } from 'react-i18next';
import { getEffectivePrice } from '../utils/price';
import { isProductOnActiveSale } from '../utils/promotions';

export default function CheckoutPage() {
  const { items, totalPrice, clearCart } = useCart();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [step, setStep] = useState<1 | 2>(1);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo>({
    customerType: 'physical',
    deliveryMethod: 'delivery',
    personalId: '',
    companyId: '',
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    address: '',
    city: 'Tbilisi',
    note: ''
  });

  if (items.length === 0 && !isProcessingPayment) {
    return (
      <div className="min-h-screen bg-brand-50 pt-32 pb-16 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-3xl font-serif text-brand-900 mb-6">{t('checkout.empty')}</h1>
          <button 
            onClick={() => navigate('/#products')}
            className="inline-flex items-center px-8 py-4 bg-brand-900 text-white rounded-xl hover:bg-brand-800 transition-colors"
          >
            <ArrowLeft className="mr-2" size={20} />
            {t('checkout.backToCatalog')}
          </button>
        </div>
      </div>
    );
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setCustomerInfo(prev => ({ ...prev, [name]: value }));
  };

  const handleInfoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const phone = customerInfo.phone.replace(/\s+/g, '');
    const email = customerInfo.email?.trim();

    const phoneRegex = /^\+?[0-9]{8,15}$/;
    if (!phoneRegex.test(phone)) {
      toast.error(t('checkout.errorPhone'), {
        style: { borderRadius: '12px', background: '#333', color: '#fff' }
      });
      return;
    }

    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        toast.error(t('checkout.errorEmail'), {
          style: { borderRadius: '12px', background: '#333', color: '#fff' }
        });
        return;
      }
    }

    setStep(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePayment = async (bank: 'bog' | 'tbc' | 'credo', type: 'full' | 'installment') => {
    setIsProcessingPayment(true);
    
    try {
      const payloadCustomerInfo = {
        ...customerInfo,
        address: customerInfo.deliveryMethod === 'pickup' ? 'წერეთლის 118 (შოურუმი)' : customerInfo.address,
        city: customerInfo.deliveryMethod === 'pickup' ? 'Tbilisi' : customerInfo.city,
      };

      const response = await fetch('/api/orders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          customerInfo: payloadCustomerInfo, 
          items, 
          paymentMethod: bank, 
          paymentType: type,
          deliveryMethod: customerInfo.deliveryMethod 
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || t('checkout.errorOrder'));
      }

      let payResponse;
      if (bank === 'bog' && type === 'full') {
        payResponse = await fetch('/api/pay/bog', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId: data.orderId, amount: data.total_price, redirectUrl: window.location.origin, statusToken: data.statusToken })
        });
      } else if (bank === 'bog' && type === 'installment') {
        payResponse = await fetch('/api/pay/bog/installment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId: data.orderId, amount: data.total_price, statusToken: data.statusToken })
        });
      } else if (bank === 'tbc') {
        payResponse = await fetch('/api/pay/tbc', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            orderId: data.orderId, 
            amount: data.total_price,
            methods: type === 'installment' ? [8] : [5],
            statusToken: data.statusToken
          })
        });
      } else if (bank === 'credo' && type === 'installment') {
        payResponse = await fetch('/api/pay/credo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId: data.orderId, amount: data.total_price, items, statusToken: data.statusToken })
        });
      }

      if (payResponse) {
        const payData = await payResponse.json();
        if (!payResponse.ok) throw new Error(payData.error);
        
        if (payData.redirectUrl) {
          clearCart();
          window.location.href = payData.redirectUrl;
          return;
        }
        
        // Bank returned success but no redirect URL — this is abnormal
        throw new Error('ბანკიდან გადამისამართების ლინკი ვერ მოიძებნა. გთხოვთ სცადოთ თავიდან.');
      }

      // Only reach here if payResponse was null (e.g. unsupported bank combination)
      throw new Error('გადახდის მეთოდი ვერ დამუშავდა. გთხოვთ აირჩიოთ სხვა მეთოდი.');
      
    } catch (error) {
      console.error(error);
      alert(t('checkout.errorOrder') + ': ' + (error as Error).message);
    } finally {
      setIsProcessingPayment(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-50 pt-32 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <button 
          onClick={() => step === 2 ? setStep(1) : navigate(-1)}
          className="flex items-center text-brand-500 hover:text-brand-900 transition-colors mb-8 text-sm font-bold tracking-widest uppercase"
        >
          <ArrowLeft size={16} className="mr-2" />
          {step === 2 ? t('product.back') : t('checkout.backToCatalog')}
        </button>

        <div className="flex flex-col lg:flex-row gap-12">
          
          {/* Main Content Area */}
          <div className="lg:w-2/3">
            <div className="bg-white rounded-3xl p-8 md:p-12 shadow-sm border border-brand-100">
              {/* Stepper */}
              <div className="flex items-center mb-10">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${step === 1 ? 'bg-brand-900 text-white' : 'bg-brand-100 text-brand-500'}`}>1</div>
                <div className={`h-1 flex-1 mx-4 rounded-full ${step === 2 ? 'bg-brand-900' : 'bg-brand-100'}`} />
                <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${step === 2 ? 'bg-brand-900 text-white' : 'bg-brand-100 text-brand-500'}`}>2</div>
              </div>

              <AnimatePresence mode="wait">
                {step === 1 && (
                  <motion.div key="step1" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                    <h2 className="text-3xl font-serif text-brand-900 mb-8">{t('checkout.stepContact')}</h2>
                    <form onSubmit={handleInfoSubmit} className="space-y-6">
                      {/* Customer Type */}
                      <div>
                        <label className="block text-xs font-bold tracking-widest text-brand-400 uppercase mb-3">{t('checkout.buyerType')}</label>
                        <div className="flex gap-4">
                          <label className={`cursor-pointer flex-1 text-center py-3 px-4 rounded-xl border-2 transition-all font-bold text-sm ${customerInfo.customerType === 'physical' ? 'border-brand-900 bg-brand-50 text-brand-900' : 'border-gray-200 bg-white text-brand-400 hover:border-gray-300'}`}>
                            <input type="radio" name="customerType" value="physical" checked={customerInfo.customerType === 'physical'} onChange={handleInputChange} className="hidden" />
                            {t('checkout.individual')}
                          </label>
                          <label className={`cursor-pointer flex-1 text-center py-3 px-4 rounded-xl border-2 transition-all font-bold text-sm ${customerInfo.customerType === 'legal' ? 'border-brand-900 bg-brand-50 text-brand-900' : 'border-gray-200 bg-white text-brand-400 hover:border-gray-300'}`}>
                            <input type="radio" name="customerType" value="legal" checked={customerInfo.customerType === 'legal'} onChange={handleInputChange} className="hidden" />
                            {t('checkout.company')}
                          </label>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-xs font-bold tracking-widest text-brand-400 uppercase mb-2">{t('checkout.firstName')}</label>
                          <input required type="text" name="firstName" value={customerInfo.firstName} onChange={handleInputChange} className="w-full bg-brand-50 border border-brand-100 rounded-xl px-4 py-3 text-brand-900 focus:outline-none focus:border-gold-400 focus:ring-1 focus:ring-gold-400 transition-all" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold tracking-widest text-brand-400 uppercase mb-2">{t('checkout.lastName')}</label>
                          <input required type="text" name="lastName" value={customerInfo.lastName} onChange={handleInputChange} className="w-full bg-brand-50 border border-brand-100 rounded-xl px-4 py-3 text-brand-900 focus:outline-none focus:border-gold-400 focus:ring-1 focus:ring-gold-400 transition-all" />
                        </div>
                      </div>

                      {/* Dynamic ID Fields */}
                      <div>
                        {customerInfo.customerType === 'physical' ? (
                          <div>
                            <label className="block text-xs font-bold tracking-widest text-brand-400 uppercase mb-2">{t('checkout.personalId')} *</label>
                            <input required type="text" name="personalId" value={customerInfo.personalId} onChange={handleInputChange} placeholder={t('checkout.personalIdPlaceholder')} className="w-full bg-brand-50 border border-brand-100 rounded-xl px-4 py-3 text-brand-900 focus:outline-none focus:border-gold-400 focus:ring-1 focus:ring-gold-400 transition-all" />
                          </div>
                        ) : (
                          <div>
                            <label className="block text-xs font-bold tracking-widest text-brand-400 uppercase mb-2">{t('checkout.companyId')} *</label>
                            <input required type="text" name="companyId" value={customerInfo.companyId} onChange={handleInputChange} placeholder={t('checkout.companyIdPlaceholder')} className="w-full bg-brand-50 border border-brand-100 rounded-xl px-4 py-3 text-brand-900 focus:outline-none focus:border-gold-400 focus:ring-1 focus:ring-gold-400 transition-all" />
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-xs font-bold tracking-widest text-brand-400 uppercase mb-2">{t('checkout.phone')}</label>
                          <input required type="tel" name="phone" value={customerInfo.phone} onChange={handleInputChange} placeholder="+995" className="w-full bg-brand-50 border border-brand-100 rounded-xl px-4 py-3 text-brand-900 focus:outline-none focus:border-gold-400 tracking-wider transition-all" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold tracking-widest text-brand-400 uppercase mb-2">{t('checkout.emailOptional')}</label>
                          <input type="email" name="email" value={customerInfo.email} onChange={handleInputChange} className="w-full bg-brand-50 border border-brand-100 rounded-xl px-4 py-3 text-brand-900 focus:outline-none focus:border-gold-400 transition-all" />
                        </div>
                      </div>

                      {/* Delivery Method */}
                      <div>
                        <label className="block text-xs font-bold tracking-widest text-brand-400 uppercase mb-3">{t('checkout.deliveryMethod', 'მიწოდების მეთოდი')}</label>
                        <div className="flex gap-4">
                          <label className={`cursor-pointer flex-1 text-center py-3 px-4 rounded-xl border-2 transition-all font-bold text-sm ${customerInfo.deliveryMethod === 'delivery' ? 'border-brand-900 bg-brand-50 text-brand-900' : 'border-gray-200 bg-white text-brand-400 hover:border-gray-300'}`}>
                            <input type="radio" name="deliveryMethod" value="delivery" checked={customerInfo.deliveryMethod === 'delivery'} onChange={handleInputChange} className="hidden" />
                            {t('checkout.methodDelivery', 'მისამართზე მიტანა')}
                          </label>
                          <label className={`cursor-pointer flex-1 text-center py-3 px-4 rounded-xl border-2 transition-all font-bold text-sm ${customerInfo.deliveryMethod === 'pickup' ? 'border-brand-900 bg-brand-50 text-brand-900' : 'border-gray-200 bg-white text-brand-400 hover:border-gray-300'}`}>
                            <input type="radio" name="deliveryMethod" value="pickup" checked={customerInfo.deliveryMethod === 'pickup'} onChange={handleInputChange} className="hidden" />
                            {t('checkout.methodPickup', 'ფილიალიდან გატანა')}
                          </label>
                        </div>
                      </div>
                      {customerInfo.deliveryMethod === 'delivery' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <label className="block text-xs font-bold tracking-widest text-brand-400 uppercase mb-2">{t('checkout.city')}</label>
                            <select required name="city" value={customerInfo.city} onChange={handleInputChange} className="w-full bg-brand-50 border border-brand-100 rounded-xl px-4 py-3 text-brand-900 focus:outline-none focus:border-gold-400 transition-all appearance-none cursor-pointer">
                              <option value="Tbilisi">Tbilisi</option>
                              <option value="Rustavi">Rustavi</option>
                              <option value="Batumi">Batumi</option>
                              <option value="Kutaisi">Kutaisi</option>
                              <option value="Other">{t('checkout.cityOther', 'Other')}</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-bold tracking-widest text-brand-400 uppercase mb-2">{t('checkout.address')}</label>
                            <input required type="text" name="address" value={customerInfo.address} onChange={handleInputChange} className="w-full bg-brand-50 border border-brand-100 rounded-xl px-4 py-3 text-brand-900 focus:outline-none focus:border-gold-400 transition-all" />
                          </div>
                        </div>
                      )}

                      <div>
                        <label className="block text-xs font-bold tracking-widest text-brand-400 uppercase mb-2">{t('checkout.note')}</label>
                        <textarea name="note" rows={3} value={customerInfo.note} onChange={handleInputChange} className="w-full bg-brand-50 border border-brand-100 rounded-xl px-4 py-3 text-brand-900 focus:outline-none focus:border-gold-400 transition-all resize-none" />
                      </div>

                      <div className="pt-6">
                        <button type="submit" className="w-full py-5 bg-brand-900 text-white font-bold tracking-[0.2em] uppercase rounded-xl hover:bg-brand-800 transition-all shadow-xl shadow-brand-900/20 active:scale-95 flex items-center justify-center group">
                          {t('checkout.btnPaymentMethods')}
                          <ChevronRight size={18} className="ml-2 group-hover:translate-x-1 transition-transform" />
                        </button>
                      </div>
                    </form>
                  </motion.div>
                )}

                {step === 2 && (
                  <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                    <h2 className="text-3xl font-serif text-brand-900 mb-8">{t('checkout.stepPayment')}</h2>
                    
                    <div className="space-y-8">
                      {/* Full Payment */}
                      <div>
                        <h3 className="text-sm font-bold tracking-widest text-brand-400 uppercase mb-4">{t('checkout.onlinePayment')}</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {/* BOG Pay */}
                          <button 
                            onClick={() => handlePayment('bog', 'full')} 
                            disabled={isProcessingPayment} 
                            className="flex items-center justify-between p-5 bg-white border-2 border-brand-100 rounded-2xl hover:border-[#E8480C] hover:shadow-lg group transition-all disabled:opacity-50"
                          >
                            <div className="flex items-center gap-3">
                              <svg width="52" height="34" viewBox="0 0 130 85" fill="none" xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0 rounded-lg">
                                <rect width="130" height="85" rx="6" fill="#E8480C"/>
                                <text x="65" y="38" textAnchor="middle" dominantBaseline="middle" fill="white" fontFamily="Arial Black, sans-serif" fontWeight="900" fontSize="28">BOG</text>
                                <text x="65" y="67" textAnchor="middle" dominantBaseline="middle" fill="rgba(255,255,255,0.85)" fontFamily="Arial, sans-serif" fontSize="11">Bank of Georgia</text>
                              </svg>
                              <div className="text-left">
                                <p className="font-bold text-brand-900 text-sm">BOG Pay</p>
                                <p className="text-[10px] text-brand-400">{t('checkout.fullPayment')}</p>
                              </div>
                            </div>
                            <ChevronRight size={18} className="text-brand-300 group-hover:translate-x-1 group-hover:text-[#E8480C] transition-all flex-shrink-0"/>
                          </button>
                          
                          {/* TBC Pay */}
                          <button 
                            onClick={() => handlePayment('tbc', 'full')} 
                            disabled={isProcessingPayment} 
                            className="flex items-center justify-between p-5 bg-white border-2 border-brand-100 rounded-2xl hover:border-[#00AEEF] hover:shadow-lg group transition-all disabled:opacity-50"
                          >
                            <div className="flex items-center gap-3">
                              <svg width="52" height="34" viewBox="0 0 130 85" fill="none" xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0 rounded-lg">
                                <rect width="130" height="85" rx="6" fill="#00AEEF"/>
                                <text x="65" y="38" textAnchor="middle" dominantBaseline="middle" fill="white" fontFamily="Arial Black, sans-serif" fontWeight="900" fontSize="28">TBC</text>
                                <text x="65" y="67" textAnchor="middle" dominantBaseline="middle" fill="rgba(255,255,255,0.85)" fontFamily="Arial, sans-serif" fontSize="11">TBC Bank</text>
                              </svg>
                              <div className="text-left">
                                <p className="font-bold text-brand-900 text-sm">TBC Pay</p>
                                <p className="text-[10px] text-brand-400">{t('checkout.fullPayment')}</p>
                              </div>
                            </div>
                            <ChevronRight size={18} className="text-brand-300 group-hover:translate-x-1 group-hover:text-[#00AEEF] transition-all flex-shrink-0"/>
                          </button>
                        </div>
                      </div>

                      {/* Installment */}
                      <div>
                        <h3 className="text-sm font-bold tracking-widest text-brand-400 uppercase mb-4">{t('checkout.onlineInstallment')}</h3>
                        {/* Credo Bank */}
                        <button 
                          onClick={() => handlePayment('credo', 'installment')} 
                          disabled={isProcessingPayment} 
                          className="w-full flex items-center justify-between p-5 bg-white border-2 border-brand-100 rounded-2xl hover:border-[#0081C5] hover:shadow-lg group transition-all disabled:opacity-50"
                        >
                          <div className="flex items-center gap-3">
                            <svg width="52" height="34" viewBox="0 0 130 85" fill="none" xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0 rounded-lg">
                              <rect width="130" height="85" rx="6" fill="#0081C5"/>
                              <text x="65" y="36" textAnchor="middle" dominantBaseline="middle" fill="white" fontFamily="Arial Black, sans-serif" fontWeight="900" fontSize="22">CREDO</text>
                              <text x="65" y="63" textAnchor="middle" dominantBaseline="middle" fill="rgba(255,255,255,0.85)" fontFamily="Arial, sans-serif" fontSize="11">Bank</text>
                            </svg>
                            <div className="text-left">
                              <p className="font-bold text-brand-900 text-sm">Credo Bank {t('checkout.installment')}</p>
                              <p className="text-[10px] text-brand-400">{t('checkout.installment')} — 0%</p>
                            </div>
                          </div>
                          <ChevronRight size={18} className="text-brand-300 group-hover:translate-x-1 group-hover:text-[#0081C5] transition-all flex-shrink-0"/>
                        </button>
                      </div>
                    </div>

                    {isProcessingPayment && (
                      <div className="mt-10 flex flex-col items-center gap-4 text-brand-500">
                        <RefreshCw className="animate-spin" size={32} />
                        <span className="text-sm font-bold tracking-widest text-brand-900 uppercase">{t('checkout.redirecting')}</span>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Order Summary Sidebar */}
          <div className="lg:w-1/3">
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-brand-100 sticky top-32">
              <h3 className="text-xl font-serif text-brand-900 mb-6">{t('checkout.summary')} ({items.length})</h3>
              
              <div className="space-y-4 mb-6 max-h-[40vh] overflow-y-auto pr-2 scrollbar-hide">
                {items.map(item => (
                  <div key={item.product.id} className="flex gap-4">
                    <img src={item.product.images[0]} alt={item.product.name} className="w-16 h-16 object-cover rounded-lg bg-brand-50" />
                    <div className="flex-1">
                      <p className="font-medium text-brand-900 text-sm">{item.product.name}</p>
                      <p className="text-[10px] text-brand-400 uppercase tracking-widest mt-1 mb-2">{t('checkout.quantity')}: {item.quantity}</p>
                      {isProductOnActiveSale(item.product) && item.product.sale_price && (
                        <p className="text-[11px] text-brand-300 line-through">
                          ₾{(item.product.price * item.quantity).toLocaleString()}
                        </p>
                      )}
                      <p className="font-bold text-brand-900 text-sm">₾{(getEffectivePrice(item.product) * item.quantity).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-brand-100 pt-6 space-y-3">
                <div className="flex justify-between text-sm text-brand-500">
                  <span>{t('checkout.total')}</span>
                  <span>₾{totalPrice.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm text-brand-500">
                  <span>{t('product.delivery')}</span>
                  <span className="text-brand-700 font-medium">{t('checkout.deliveryFree')}</span>
                </div>
                <div className="flex justify-between items-center pt-3 border-t border-brand-100 mt-3">
                  <span className="font-bold tracking-widest uppercase text-brand-900 text-sm">{t('checkout.grandTotal')}</span>
                  <span className="text-2xl font-serif font-bold text-brand-900">
                    ₾{totalPrice.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
