import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Check, RefreshCw, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { useCart } from '../context/CartContext';
import type { CustomerInfo } from '../types/product';
import { useTranslation } from 'react-i18next';

export default function CheckoutPage() {
  const { items, totalPrice, clearCart } = useCart();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [step, setStep] = useState<1 | 2>(1);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo>({
    customerType: 'physical',
    personalId: '',
    companyId: '',
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    address: '',
    city: 'თბილისი',
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
    
    // Basic formatting cleanups
    const phone = customerInfo.phone.replace(/\s+/g, '');
    const email = customerInfo.email?.trim();

    // Phone validation (simple Georgian format check)
    const phoneRegex = /^(\+?995)?5\d{8}$/;
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
      // Create Secure Order via Backend API
      const response = await fetch('/api/orders/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerInfo,
          items,
          paymentMethod: bank,
          paymentType: type
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'შეკვეთის გაფორმება ვერ მოხერხდა');
      }

      // Clear cart on success
      clearCart();
      
      // Navigate to success page with orderId
      navigate(`/payment/success?orderId=${data.orderId}`);
      
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
                      {/* Customer Type Selection */}
                      <div>
                        <label className="block text-xs font-bold tracking-widest text-brand-400 uppercase mb-3">მყიდველის ტიპი</label>
                        <div className="flex gap-4">
                          <label className={`cursor-pointer flex-1 text-center py-3 px-4 rounded-xl border-2 transition-all font-bold text-sm ${customerInfo.customerType === 'physical' ? 'border-brand-900 bg-brand-50 text-brand-900' : 'border-gray-200 bg-white text-brand-400 hover:border-gray-300'}`}>
                            <input type="radio" name="customerType" value="physical" checked={customerInfo.customerType === 'physical'} onChange={handleInputChange} className="hidden" />
                            ფიზიკური პირი
                          </label>
                          <label className={`cursor-pointer flex-1 text-center py-3 px-4 rounded-xl border-2 transition-all font-bold text-sm ${customerInfo.customerType === 'legal' ? 'border-brand-900 bg-brand-50 text-brand-900' : 'border-gray-200 bg-white text-brand-400 hover:border-gray-300'}`}>
                            <input type="radio" name="customerType" value="legal" checked={customerInfo.customerType === 'legal'} onChange={handleInputChange} className="hidden" />
                            იურიდიული პირი
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

                      {/* Dynamic ID Fields based on rules */}
                      <div>
                        {customerInfo.customerType === 'physical' ? (
                          <div>
                            <label className="block text-xs font-bold tracking-widest text-brand-400 uppercase mb-2">პირადი ნომერი *</label>
                            <input required type="text" name="personalId" value={customerInfo.personalId} onChange={handleInputChange} placeholder="11 ციფრიანი პირადი ნომერი" className="w-full bg-brand-50 border border-brand-100 rounded-xl px-4 py-3 text-brand-900 focus:outline-none focus:border-gold-400 focus:ring-1 focus:ring-gold-400 transition-all" />
                          </div>
                        ) : (
                          <div>
                            <label className="block text-xs font-bold tracking-widest text-brand-400 uppercase mb-2">საიდენტიფიკაციო კოდი *</label>
                            <input required type="text" name="companyId" value={customerInfo.companyId} onChange={handleInputChange} placeholder="კომპანიის საიდენტიფიკაციო კოდი" className="w-full bg-brand-50 border border-brand-100 rounded-xl px-4 py-3 text-brand-900 focus:outline-none focus:border-gold-400 focus:ring-1 focus:ring-gold-400 transition-all" />
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

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-xs font-bold tracking-widest text-brand-400 uppercase mb-2">{t('checkout.city')}</label>
                          <select required name="city" value={customerInfo.city} onChange={handleInputChange} className="w-full bg-brand-50 border border-brand-100 rounded-xl px-4 py-3 text-brand-900 focus:outline-none focus:border-gold-400 transition-all appearance-none cursor-pointer">
                            <option value="Tbilisi">თბილისი</option>
                            <option value="Rustavi">რუსთავი</option>
                            <option value="Batumi">ბათუმი</option>
                            <option value="Kutaisi">ქუთაისი</option>
                            <option value="Other">სხვა</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold tracking-widest text-brand-400 uppercase mb-2">{t('checkout.address')}</label>
                          <input required type="text" name="address" value={customerInfo.address} onChange={handleInputChange} className="w-full bg-brand-50 border border-brand-100 rounded-xl px-4 py-3 text-brand-900 focus:outline-none focus:border-gold-400 transition-all" />
                        </div>
                      </div>

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
                            <button 
                              onClick={() => handlePayment('bog', 'full')} 
                              disabled={isProcessingPayment} 
                              className="flex items-center justify-between p-6 bg-white border-2 border-brand-100 rounded-2xl hover:border-[#ff6b00] hover:shadow-md group transition-all disabled:opacity-50"
                            >
                              <span className="font-bold text-brand-900 group-hover:text-[#ff6b00] transition-colors">BOG Pay</span>
                              <ChevronRight size={20} className="text-brand-300 group-hover:translate-x-1 group-hover:text-[#ff6b00] transition-all"/>
                            </button>
                            
                            <button 
                              onClick={() => handlePayment('tbc', 'full')} 
                              disabled={isProcessingPayment} 
                              className="flex items-center justify-between p-6 bg-white border-2 border-brand-100 rounded-2xl hover:border-[#00a3e0] hover:shadow-md group transition-all disabled:opacity-50"
                            >
                              <span className="font-bold text-brand-900 group-hover:text-[#00a3e0] transition-colors">TBC Pay</span>
                              <ChevronRight size={20} className="text-brand-300 group-hover:translate-x-1 group-hover:text-[#00a3e0] transition-all"/>
                            </button>
                         </div>
                       </div>

                       {/* Installment */}
                       <div>
                         <h3 className="text-sm font-bold tracking-widest text-brand-400 uppercase mb-4">{t('checkout.onlineInstallment')}</h3>
                         <button 
                            onClick={() => handlePayment('credo', 'installment')} 
                            disabled={isProcessingPayment} 
                            className="w-full flex items-center justify-between p-6 bg-white border-2 border-brand-100 rounded-2xl hover:border-[#0081c5] hover:shadow-md group transition-all disabled:opacity-50"
                          >
                            <span className="font-bold text-brand-900 group-hover:text-[#0081c5] transition-colors">Credo Bank განვადება</span>
                            <ChevronRight size={20} className="text-brand-300 group-hover:translate-x-1 group-hover:text-[#0081c5] transition-all"/>
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
                      <p className="font-bold text-brand-900 text-sm">₾{(item.product.price * item.quantity).toLocaleString()}</p>
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
                  <span className="text-green-600 font-medium">{t('checkout.deliveryFree')}</span>
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
