import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight, ShoppingBag, ArrowLeft, Heart, Loader2 } from 'lucide-react';
import { useProduct, useProducts, useCategories } from '../hooks/useSupabaseData';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useTranslation } from 'react-i18next';
import { Countdown } from '../components/sections/ProductsSection';
import ProtectedImage from '../components/ui/ProtectedImage';
import { isProductOnActiveSale } from '../utils/promotions';
import { getProductName, getProductDescription, getLocalizedCategoryName } from '../utils/i18n';

export default function ProductPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const { product, loading, error } = useProduct(id);
  const { addToCart, setIsCartOpen } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();
  const { categories } = useCategories();
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const { products: categoryProducts, loading: relatedLoading } = useProducts(product?.category || '');
  
  // Filter related products (exclude current, get up to 4).
  const relatedProducts = categoryProducts.filter(p => p.id !== product?.id).slice(0, 4);


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
        <title>{getProductName(product, lang)} | Kale Group</title>
        <meta name="description" content={getProductDescription(product, lang) || `${product.name} - ${t('hero.badge')}`} />
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
              
              {isProductOnActiveSale(product) && product.discount_percentage ? (
                <div className="absolute top-6 left-6 z-10">
                  <span className="bg-red-500 text-white text-[13px] font-bold px-4 py-2 rounded-xl uppercase tracking-widest shadow-xl">
                    -{product.discount_percentage}%
                  </span>
                </div>
              ) : null}

              {isProductOnActiveSale(product) && product.sale_end_date && new Date(product.sale_end_date).getTime() > new Date().getTime() && (
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
            <p className="text-xs tracking-[0.4em] uppercase font-bold mb-4" style={{color:'#c9a227'}}>{getLocalizedCategoryName(product.category, categories, lang)}</p>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif text-brand-900 mb-6 leading-tight">{getProductName(product, lang)}</h1>
            
            <div className="mb-8">
              {isProductOnActiveSale(product) && product.sale_price ? (
                <div className="flex flex-col gap-1">
                  <p className="text-xl font-bold text-gray-400 line-through">₾{product.price.toLocaleString()}</p>
                  <p className="text-4xl lg:text-5xl font-bold text-red-600">₾{product.sale_price.toLocaleString()}</p>
                </div>
              ) : (
                <p className="text-3xl font-bold text-brand-900">₾{product.price.toLocaleString()}</p>
              )}
            </div>
            
            <p className="text-brand-600 leading-relaxed text-lg mb-10">
              {getProductDescription(product, lang) || t('product.notFoundDesc')}
            </p>

            {/* Product Specifications with Glassmorphism & Animations */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-12"
            >
              {/* Dimensions */}
              {product.dimensions && (
                <div className="bg-brand-50/50 p-5 rounded-2xl border border-brand-100 flex items-center justify-between group hover:bg-brand-50 transition-colors">
                  <span className="text-[11px] font-bold tracking-[0.2em] text-brand-400 uppercase">{t('products.size')}</span>
                  <span className="text-sm font-semibold text-brand-900">{product.dimensions}</span>
                </div>
              )}

              {/* Material */}
              {product.material && (
                <div className="bg-brand-50/50 p-5 rounded-2xl border border-brand-100 flex items-center justify-between group hover:bg-brand-50 transition-colors">
                  <span className="text-[11px] font-bold tracking-[0.2em] text-brand-400 uppercase">{t('product.material')}</span>
                  <span className="text-sm font-semibold text-brand-900">{product.material}</span>
                </div>
              )}

              {/* Colors */}
              {product.colors && product.colors.length > 0 && (
                <div className="bg-brand-50/50 p-5 rounded-2xl border border-brand-100 flex items-center justify-between sm:col-span-2 group hover:bg-brand-50 transition-colors">
                  <span className="text-[11px] font-bold tracking-[0.2em] text-brand-400 uppercase">{t('products.availableColors')}</span>
                  <div className="flex flex-wrap gap-2 justify-end">
                    {product.colors.map((c, i) => (
                      <span key={i} className="px-3 py-1 bg-white text-brand-900 shadow-sm border border-brand-100 text-[11px] font-bold rounded-lg uppercase tracking-wider">{c}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Common specs */}
              <div className="bg-brand-50/50 p-5 rounded-2xl border border-brand-100 flex items-center justify-between group hover:bg-brand-50 transition-colors">
                <span className="text-[11px] font-bold tracking-[0.2em] text-brand-400 uppercase">{t('product.warranty')}</span>
                <span className="text-sm font-semibold text-brand-900">{product.warranty || t('product.warrantyDefault', '5 years')}</span>
              </div>
              <div className="bg-brand-50/50 p-5 rounded-2xl border border-brand-100 flex items-center justify-between group hover:bg-brand-50 transition-colors">
                <span className="text-[11px] font-bold tracking-[0.2em] text-brand-400 uppercase">{t('product.delivery')}</span>
                <span className="text-sm font-semibold text-brand-900">{product.delivery || t('product.deliveryDefault', '7 days')}</span>
              </div>
            </motion.div>

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

      {/* Related Products Section */}
      {!relatedLoading && relatedProducts.length > 0 && (
        <div className="bg-brand-50/30 py-24 border-t border-brand-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <p className="text-xs tracking-[0.4em] uppercase font-bold mb-3" style={{color:'#c9a227'}}>{t('products.discover')}</p>
              <h2 className="text-3xl md:text-4xl font-serif text-brand-900">{t('products.similar')}</h2>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 lg:gap-8">
              {relatedProducts.map(relProduct => (
                <Link 
                  key={relProduct.id} 
                  to={`/product/${relProduct.id}`}
                  className="group block"
                >
                  <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-white shadow-sm group-hover:shadow-xl transition-all duration-300 mb-5">
                    <ProtectedImage 
                      src={relProduct.images[0]} 
                      alt={relProduct.name} 
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                      watermarkText=""
                    />
                    {isProductOnActiveSale(relProduct) && relProduct.discount_percentage ? (
                      <div className="absolute top-4 left-4 z-10">
                        <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-lg uppercase tracking-widest shadow-lg">
                          -{relProduct.discount_percentage}%
                        </span>
                      </div>
                    ) : null}
                  </div>
                  <div>
                    <h3 className="text-lg font-serif text-brand-900 group-hover:text-gold-500 transition-colors truncate">{getProductName(relProduct, lang)}</h3>
                    <p className="text-[10px] font-bold tracking-widest text-brand-400 uppercase mt-1 mb-2 truncate">{getLocalizedCategoryName(relProduct.category, categories, lang)}</p>
                    <div className="flex items-center justify-between">
                      {isProductOnActiveSale(relProduct) && relProduct.sale_price ? (
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-red-600">₾{relProduct.sale_price.toLocaleString()}</span>
                          <span className="text-[10px] font-bold text-gray-400 line-through">₾{relProduct.price.toLocaleString()}</span>
                        </div>
                      ) : (
                        <span className="text-sm font-bold text-brand-900">₾{relProduct.price.toLocaleString()}</span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
