import React from 'react';
import { motion } from 'motion/react';
import { Check, ArrowRight, Download, Loader2, XCircle, Clock } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { generateOrderReceipt } from '../utils/pdfGenerator';
import { useTranslation } from 'react-i18next';

type PaymentState = 'loading' | 'paid' | 'unpaid' | 'error';

export default function PaymentSuccessPage() {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('orderId');
  const urlStatus = searchParams.get('status'); // BOG sends ?status=failed on fail redirect
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [paymentState, setPaymentState] = React.useState<PaymentState>('loading');
  const { t } = useTranslation();

  // Poll the real payment_status from the database
  React.useEffect(() => {
    if (!orderId) {
      setPaymentState('error');
      return;
    }

    // If URL explicitly says failed, show immediately
    if (urlStatus === 'failed') {
      setPaymentState('unpaid');
      return;
    }

    let attempts = 0;
    const maxAttempts = 10; // 10 attempts × 3s = 30 seconds max wait
    
    const checkPaymentStatus = async () => {
      try {
        const { data: order, error } = await supabase
          .from('orders')
          .select('payment_status, status')
          .eq('id', orderId)
          .single();

        if (error || !order) {
          setPaymentState('error');
          return;
        }

        if (order.payment_status === 'paid') {
          setPaymentState('paid');
          return;
        }

        // Not paid yet — maybe the bank callback hasn't arrived yet
        attempts++;
        if (attempts >= maxAttempts) {
          // After 30s of waiting, show unpaid state
          setPaymentState('unpaid');
          return;
        }

        // Continue polling
        setTimeout(checkPaymentStatus, 3000);
      } catch {
        setPaymentState('error');
      }
    };

    checkPaymentStatus();
  }, [orderId, urlStatus]);

  const handleDownloadReceipt = async () => {
    if (!orderId) return;
    setIsGenerating(true);
    try {
      const { data: order, error: orderErr } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();
      
      if (orderErr) throw orderErr;

      const { data: items, error: itemsErr } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', orderId);
      
      if (itemsErr) throw itemsErr;

      await generateOrderReceipt(order, items || []);
    } catch (err) {
      console.error('Error generating PDF:', err);
      alert(t('payment.receiptError'));
    } finally {
      setIsGenerating(false);
    }
  };

  // Loading state — waiting for bank callback
  if (paymentState === 'loading') {
    return (
      <div className="min-h-screen bg-brand-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-3xl p-10 md:p-14 text-center shadow-xl border border-brand-100">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-8 text-blue-500 shadow-inner"
          >
            <Loader2 size={48} strokeWidth={2} />
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <h1 className="text-2xl font-serif text-brand-900 mb-4">გადახდა მოწმდება...</h1>
            <p className="text-brand-500 leading-relaxed">
              გთხოვთ მოიცადოთ, ბანკიდან დასტურს ველოდებით
            </p>
          </motion.div>
        </div>
      </div>
    );
  }

  // Payment failed / unpaid state
  if (paymentState === 'unpaid' || paymentState === 'error') {
    return (
      <div className="min-h-screen bg-brand-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-3xl p-10 md:p-14 text-center shadow-xl border border-brand-100">
          <motion.div 
            initial={{ scale: 0 }} 
            animate={{ scale: 1 }} 
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
            className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-8 text-red-500 shadow-inner"
          >
            <XCircle size={48} strokeWidth={2} />
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <h1 className="text-3xl font-serif text-brand-900 mb-4">გადახდა ვერ მოხერხდა</h1>
            <p className="text-brand-500 leading-relaxed mb-10">
              სამწუხაროდ, გადახდა ვერ დასტურდა. გთხოვთ სცადოთ თავიდან ან აირჩიოთ სხვა გადახდის მეთოდი.
            </p>
            <div className="flex flex-col gap-3">
              <Link 
                to="/#products" 
                className="w-full py-5 bg-brand-900 text-white font-bold tracking-[0.2em] uppercase rounded-xl hover:bg-brand-800 transition-all shadow-lg active:scale-95 flex items-center justify-center group"
              >
                თავიდან სცადეთ
                <ArrowRight size={18} className="ml-2 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link 
                to="/" 
                className="w-full py-4 bg-white border-2 border-brand-200 text-brand-700 font-bold tracking-[0.15em] uppercase rounded-xl hover:bg-brand-50 transition-all flex items-center justify-center"
              >
                მთავარ გვერდზე დაბრუნება
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  // Payment confirmed — real success
  return (
    <div className="min-h-screen bg-brand-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-3xl p-10 md:p-14 text-center shadow-xl border border-brand-100">
        <motion.div 
          initial={{ scale: 0 }} 
          animate={{ scale: 1 }} 
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
          className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-8 text-green-500 shadow-inner"
        >
          <Check size={48} strokeWidth={3} />
        </motion.div>
        
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <h1 className="text-3xl font-serif text-brand-900 mb-4">{t('payment.successTitle')}</h1>
          <p className="text-brand-500 leading-relaxed mb-10">
            {t('payment.successEmail')}
          </p>
          
          <div className="flex flex-col gap-3">
            {orderId && (
              <button 
                onClick={handleDownloadReceipt}
                disabled={isGenerating}
                className="w-full py-5 bg-white border-2 border-brand-900 text-brand-900 font-bold tracking-[0.2em] uppercase rounded-xl hover:bg-brand-50 transition-all flex items-center justify-center gap-2 group disabled:opacity-50"
              >
                {isGenerating ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                {t('payment.receiptDownload')}
              </button>
            )}

            <Link 
              to="/" 
              className="w-full py-5 bg-brand-900 text-white font-bold tracking-[0.2em] uppercase rounded-xl hover:bg-brand-800 transition-all shadow-lg active:scale-95 flex items-center justify-center group"
            >
              {t('payment.btnHome')}
              <ArrowRight size={18} className="ml-2 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
