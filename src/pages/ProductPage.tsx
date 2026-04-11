import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight, ShoppingBag, ArrowLeft, Heart, Loader2 } from 'lucide-react';
import { useProduct } from '../hooks/useSupabaseData';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useTranslation } from 'react-i18next';
import { Countdown } from '../components/sections/ProductsSection';
import ProtectedImage from '../components/ui/ProtectedImage';
export default function ProductPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { product, loading, error } = useProduct(id);
  const { addToCart, setIsCartOpen } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();
  
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-24 pb-12">
        <Loader2 className="w-12 h-12 text-brand-900 animate-spin" />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center pt-24 pb-12 text-center px-4">
        <h2 className="text-3xl font-serif text-brand-900 mb-4">{t('product.notFound')}</h2>
        <p className="text-brand-500 mb-8">{t('product.notFoundDesc')}</p>
        <Link to="/" className="px-8 py-3 bg-brand-900 text-white text-xs font-bold uppercase tracking-widest rounded-xl hover:bg-brand-800 transition-colors">
          {t('product.backToHome')}
        </Link>
      </div>
    );
  }

  const handleDirectBuy = () => {
    addToCart(product);
    navigate('/checkout');
  };

  const handleAddToCart = () => {
    addToCart(product);
    setIsCartOpen(true);
  };

  return (
    <>
      <Helmet>
        <title>{product.name} | Kale Group</title>
        <meta name="description" content={product.description || `${product.name} - ${t('hero.badge')}`} />
      </Helmet>
      
      <div className="pt-32 pb-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 min-h-screen flex flex-col">
        <button 
          onClick={() => navigate(-1)} 
          className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-brand-400 hover:text-brand-900 transition-colors mb-10 w-max"
        >
          <ArrowLeft size={16} /> {t('product.back')}
        </button>

        <div className="flex flex-col lg:flex-row gap-12 lg:gap-20">
          {/* Images Section */}
          <div className="w-full lg:w-1/2 flex flex-col gap-6">
            <div className="relative aspect-square md:aspect-[4/3] lg:aspect-square rounded-3xl overflow-hidden bg-brand-100 shadow-xl group">
               <AnimatePresence mode="wait">
                <motion.div
                  key={activeImageIndex}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
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
              
              {product.is_on_sale && product.discount_percentage ? (
                <div className="absolute top-6 left-6 z-10">
                  <span className="bg-red-500 text-white text-[13px] font-bold px-4 py-2 rounded-xl uppercase tracking-widest shadow-xl">
                    -{product.discount_percentage}%
                  </span>
                </div>
              ) : null}

              {product.is_on_sale && product.sale_end_date && new Date(product.sale_end_date).getTime() > new Date().getTime() && (
                 <div className="absolute bottom-6 left-6 z-10">
                    <Countdown endDate={product.sale_end_date} />
                 </div>
              )}

              {product.images.length > 1 && (
                <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-between px-6 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => setActiveImageIndex(p => p === 0 ? product.images.length - 1 : p - 1)} className="w-12 h-12 glass rounded-full flex items-center justify-center text-brand-900 hover:bg-white shadow-xl transition-all"><ChevronLeft size={20}/></button>
                  <button onClick={() => setActiveImageIndex(p => p === product.images.length - 1 ? 0 : p + 1)} className="w-12 h-12 glass rounded-full flex items-center justify-center text-brand-900 hover:bg-white shadow-xl transition-all"><ChevronRight size={20}/></button>
                </div>
              )}

              <button 
                onClick={() => toggleWishlist(product)}
                className={`absolute top-6 right-6 w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 ${
                  isInWishlist(product.id) ? 'bg-red-500 text-white' : 'bg-white/80 text-brand-900 hover:bg-white'
                }`}
              >
                <Heart size={20} className={isInWishlist(product.id) ? 'fill-white' : ''} />
              </button>
            </div>

            {/* Thumbnails */}
            <div className="flex gap-4 overflow-x-auto pb-2 px-1 scrollbar-hide">
              {product.images.map((img, i) => (
                 <button 
                  key={i} 
                  onClick={() => setActiveImageIndex(i)} 
                  className={`flex-shrink-0 w-24 h-24 sm:w-32 sm:h-32 rounded-2xl overflow-hidden border-2 transition-all ${activeImageIndex === i ? 'border-brand-900 shadow-lg scale-105' : 'border-transparent opacity-60 hover:opacity-100'}`}
                >
                  <ProtectedImage src={img} className="w-full h-full object-cover" alt={`${product.name} ${i + 1}`} watermarkText="" />
                </button>
              ))}
            </div>
          </div>

          {/* Details Section */}
          <div className="w-full lg:w-1/2 flex flex-col">
            <p className="text-xs tracking-[0.4em] uppercase font-bold mb-4" style={{color:'#c9a227'}}>{product.category}</p>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif text-brand-900 mb-6 leading-tight">{product.name}</h1>
            
            <div className="mb-8">
              {product.is_on_sale && product.sale_price ? (
                <div className="flex flex-col gap-1">
                  <p className="text-xl font-bold text-gray-400 line-through">₾{product.price.toLocaleString()}</p>
                  <p className="text-4xl lg:text-5xl font-bold text-red-600">₾{product.sale_price.toLocaleString()}</p>
                </div>
              ) : (
                <p className="text-3xl font-bold text-brand-900">₾{product.price.toLocaleString()}</p>
              )}
            </div>
            
            <p className="text-brand-600 leading-relaxed text-lg mb-10">
              {product.description || t('product.notFoundDesc')}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-12 mb-12 bg-white p-8 rounded-3xl border border-brand-100 shadow-sm">
              {[ 
                { label: t('product.material'), value: product.material || 'მუხა' }, 
                { label: t('product.warranty'), value: product.warranty || '5 წელი' }, 
                { label: t('product.delivery'), value: product.delivery || '7 დღე' }, 
                { label: t('product.manufacturing'), value: product.manufacturing || t('product.individual') } 
              ].map((item, idx) => (
                <div key={idx} className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold tracking-[0.2em] text-brand-300 uppercase">{item.label}</span>
                  <span className="text-base font-medium text-brand-900">{item.value}</span>
                </div>
              ))}
            </div>

            <div className="mt-auto flex flex-col sm:flex-row gap-5">
              <button 
                onClick={handleAddToCart}
                className="flex-1 py-5 border-2 border-brand-900 text-brand-900 text-xs font-bold tracking-[0.2em] uppercase rounded-xl hover:bg-brand-50 transition-all flex items-center justify-center gap-3"
              >
                <ShoppingBag size={18} /> {t('products.btnAddToCart')}
              </button>
              <button 
                onClick={handleDirectBuy} 
                className="flex-1 py-5 bg-brand-900 text-white text-xs font-bold tracking-[0.2em] uppercase rounded-xl hover:bg-brand-800 transition-all shadow-xl shadow-brand-900/20 active:scale-95"
              >
                {t('products.btnBuyNow')}
              </button>
            </div>
            
            {!product.in_stock && (
              <p className="mt-6 text-red-500 text-sm font-bold tracking-widest uppercase text-center">
                {t('product.outOfStockLarge')}
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
