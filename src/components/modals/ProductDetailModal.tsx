import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ChevronLeft, ChevronRight, ShoppingBag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { Countdown } from '../sections/ProductsSection';
import type { Product } from '../../types/product';
import ProtectedImage from '../ui/ProtectedImage';
import { isProductOnActiveSale } from '../../utils/promotions';

interface ProductDetailModalProps {
  product: Product | null;
  onClose: () => void;
}

export default function ProductDetailModal({ product, onClose }: ProductDetailModalProps) {
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const { addToCart, setIsCartOpen } = useCart();
  const navigate = useNavigate();

  // Reset image index when product changes
  React.useEffect(() => {
    setActiveImageIndex(0);
  }, [product]);

  if (!product) return null;

  const handleDirectBuy = () => {
    addToCart(product);
    onClose();
    navigate('/checkout');
  };

  const handleAddToCart = () => {
    addToCart(product);
    onClose();
    setIsCartOpen(true);
  };

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }} 
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-brand-950/90 backdrop-blur-md" 
        onClick={onClose}
      >
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }} 
          animate={{ scale: 1, opacity: 1 }} 
          exit={{ scale: 0.9, opacity: 0 }} 
          onClick={(e) => e.stopPropagation()} 
          className="bg-white rounded-3xl overflow-hidden max-w-6xl w-full max-h-[90vh] flex flex-col md:flex-row shadow-2xl relative"
        >
          <button 
            onClick={onClose} 
            className="absolute top-6 right-6 p-4 bg-white/80 hover:bg-white rounded-full z-10 transition-all active:scale-90 shadow-xl text-brand-900 border border-brand-100"
          >
            <X size={20} />
          </button>

          <div className="w-full md:w-1/2 p-6 flex flex-col gap-4 bg-brand-50/50">
            <div className="relative aspect-square rounded-2xl overflow-hidden bg-white shadow-inner group">
               <AnimatePresence mode="wait">
                <motion.div
                  key={activeImageIndex}
                  initial={{ opacity: 0, scale: 1.1 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.1 }}
                  transition={{ duration: 0.4 }}
                  className="w-full h-full"
                >
                  <ProtectedImage 
                    src={product.images[activeImageIndex]} 
                    alt={product.name} 
                    className="w-full h-full object-cover" 
                  />
                </motion.div>
              </AnimatePresence>
              
              {isProductOnActiveSale(product) && product.discount_percentage ? (
                <div className="absolute top-6 left-6 z-10">
                  <span className="bg-red-500 text-white text-[13px] font-bold px-4 py-2 rounded-xl uppercase tracking-widest shadow-xl">
                    -{product.discount_percentage}%
                  </span>
                </div>
              ) : null}

              {isProductOnActiveSale(product) && product.sale_end_date && new Date(product.sale_end_date).getTime() > new Date().getTime() && (
                 <div className="absolute top-6 right-6 z-10">
                    <Countdown endDate={product.sale_end_date} />
                 </div>
              )}
              {product.images.length > 1 && (
                <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-between px-6">
                  <button onClick={() => setActiveImageIndex(p => p === 0 ? product.images.length - 1 : p - 1)} className="w-12 h-12 glass rounded-full flex items-center justify-center text-brand-900 hover:bg-white shadow-xl transition-all"><ChevronLeft size={20}/></button>
                  <button onClick={() => setActiveImageIndex(p => p === product.images.length - 1 ? 0 : p + 1)} className="w-12 h-12 glass rounded-full flex items-center justify-center text-brand-900 hover:bg-white shadow-xl transition-all"><ChevronRight size={20}/></button>
                </div>
              )}
            </div>
            <div className="flex gap-4 overflow-x-auto pb-2 px-2">
              {product.images.map((img: string, i: number) => (
                 <button 
                  key={i} 
                  onClick={() => setActiveImageIndex(i)} 
                  className={`flex-shrink-0 w-24 h-24 rounded-xl overflow-hidden border-2 transition-all ${activeImageIndex === i ? 'border-brand-900 scale-105 shadow-xl' : 'border-transparent opacity-50 hover:opacity-100'}`}
                >
                  <ProtectedImage src={img} className="w-full h-full object-cover" alt={`Thumbnail ${i}`} watermarkText=""  />
                </button>
              ))}
            </div>
          </div>

          <div className="w-full md:w-1/2 p-10 md:p-16 flex flex-col overflow-y-auto">
            <div className="mb-10">
              <p className="text-xs tracking-[0.4em] uppercase font-bold mb-4" style={{color:'#c9a227'}}>{product.category}</p>
              <h2 className="text-4xl md:text-5xl font-serif text-brand-900 mb-2 leading-tight">{product.name}</h2>
              <p className="text-xs font-mono text-brand-300">SKU: {product.id}</p>
            </div>

            <div className="space-y-8 mb-16">
              {isProductOnActiveSale(product) && product.sale_price ? (
                <div>
                  <p className="text-xl font-bold text-gray-400 line-through mb-1">₾{product.price.toLocaleString()}</p>
                  <p className="text-4xl font-bold text-red-600">₾{product.sale_price.toLocaleString()}</p>
                </div>
              ) : (
                <p className="text-4xl font-bold text-brand-900">₾{product.price.toLocaleString()}</p>
              )}
              <p className="text-brand-500 leading-relaxed text-lg">
                {product.description || 'ეს მოდელი გამოირჩევა თავისი დახვეწილი ხაზებით და უმაღლესი კომფორტით. თითოეული დეტალი არის საგულდაგულოდ დამუშავებული საუკეთესო ხის მასალისგან.'}
              </p>
              <div className="grid grid-cols-2 gap-y-4">
                {[ 
                  `მასალა: ${product.material || 'მუხა'}`, 
                  `გარანტია: ${product.warranty || '5 წელი'}`, 
                  `მიწოდება: ${product.delivery || '7 დღე'}`, 
                  `დამზადება: ${product.manufacturing || 'ინდივ.'}` 
                ].map((t, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-gold-400" />
                    <span className="text-sm font-semibold tracking-wider text-brand-800 uppercase">{t}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-auto flex flex-col sm:flex-row gap-4">
              <button 
                onClick={handleAddToCart}
                className="flex-1 py-5 border-2 border-brand-900 text-brand-900 text-xs font-bold tracking-[0.2em] uppercase rounded-xl hover:bg-brand-50 transition-all flex items-center justify-center gap-2"
              >
                <ShoppingBag size={18} />
                კალათაში
              </button>
              <button 
                onClick={handleDirectBuy} 
                className="flex-1 py-5 bg-brand-900 text-white text-xs font-bold tracking-[0.2em] uppercase rounded-xl hover:bg-brand-800 transition-all shadow-xl shadow-brand-900/20 active:scale-95"
              >
                ყიდვა ეხლავე
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
