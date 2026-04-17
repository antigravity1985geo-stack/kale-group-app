import React from 'react';
import { motion } from 'motion/react';
import { Check, ArrowRight, Download, Loader2 } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { generateOrderReceipt } from '../utils/pdfGenerator';
import { useTranslation } from 'react-i18next';

export default function PaymentSuccessPage() {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('orderId');
  const [isGenerating, setIsGenerating] = React.useState(false);
  const { t } = useTranslation();

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
