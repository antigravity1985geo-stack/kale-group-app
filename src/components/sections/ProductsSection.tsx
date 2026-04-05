import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, ShoppingBag, Loader2, Heart, Filter, ChevronDown, ListFilter } from 'lucide-react';
import { useProducts, useCategories } from '../../hooks/useSupabaseData';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';
import ProductSkeleton from '../ui/ProductSkeleton';
import { useNavigate } from 'react-router-dom';
import type { Product } from '../../types/product';
import { useTranslation } from 'react-i18next';

interface ProductsSectionProps {
  activeCategory: string;
  setActiveCategory: (category: string) => void;
}

export default function ProductsSection({ activeCategory, setActiveCategory }: ProductsSectionProps) {
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();
  const { products, loading } = useProducts(activeCategory);
  const { categories } = useCategories();
  const { t } = useTranslation();
  
  const [sortBy, setSortBy] = React.useState<'default' | 'price-asc' | 'price-desc'>('default');
  const [selectedMaterial, setSelectedMaterial] = React.useState<string>(t('products.all'));
  const [selectedColor, setSelectedColor] = React.useState<string>(t('products.all'));
  const [showFilters, setShowFilters] = React.useState(false);

  const filterCategories = [t('products.all'), ...categories.map(c => c.name)];
  
  // Derived unique materials and colors from current products for filters
  const materials = [t('products.all'), ...Array.from(new Set(products.map(p => p.material).filter(Boolean)))];
  const colors = [t('products.all'), ...Array.from(new Set(products.flatMap(p => p.colors || []).filter(Boolean)))];

  const processedProducts = React.useMemo(() => {
    let result = [...products];

    // Filter by material
    if (selectedMaterial !== t('products.all')) {
      result = result.filter(p => p.material === selectedMaterial);
    }

    // Filter by color
    if (selectedColor !== t('products.all')) {
      result = result.filter(p => p.colors?.includes(selectedColor));
    }

    // Sort
    if (sortBy === 'price-asc') {
      result.sort((a, b) => a.price - b.price);
    } else if (sortBy === 'price-desc') {
      result.sort((a, b) => b.price - a.price);
    }

    return result;
  }, [products, sortBy, selectedMaterial, selectedColor, t]);

  return (
    <section id="products" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
          <p className="text-xs tracking-[0.4em] uppercase font-bold mb-3" style={{color:'#c9a227'}}>{t('products.badge')}</p>
          <h2 className="text-4xl md:text-5xl font-serif text-brand-900 mb-10">{t('products.title')} <span className="italic text-brand-400 font-light">{t('products.titleHighlight')}</span></h2>
          <div className="flex flex-wrap justify-center gap-3">
            {filterCategories.map(c => (
              <button 
                key={c} 
                onClick={() => setActiveCategory(c)} 
                className={`px-8 py-3 rounded-full text-[10px] font-bold tracking-[0.2em] uppercase transition-all ${
                  activeCategory === c 
                    ? 'bg-brand-900 text-white shadow-xl scale-105' 
                    : 'bg-brand-50 text-brand-400 hover:bg-brand-100'
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          {/* Smart Filters Toggle */}
          <div className="mt-12 flex flex-col items-center">
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 text-[10px] font-bold tracking-widest text-brand-900 uppercase hover:text-gold-500 transition-colors"
            >
              <Filter size={16} /> {t('products.filterLabel')} <ChevronDown size={14} className={`transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
              {showFilters && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden w-full max-w-4xl"
                >
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8 py-8 px-4 border-t border-brand-100 mt-6">
                    {/* Sort */}
                    <div className="space-y-4">
                      <p className="text-[10px] font-bold text-brand-400 uppercase tracking-widest">{t('products.sortLabel')}</p>
                      <select 
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as any)}
                        className="w-full bg-brand-50/50 border border-brand-100 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-gold-400 transition-all"
                      >
                        <option value="default">{t('products.sortDefault')}</option>
                        <option value="price-asc">{t('products.sortPriceLow')}</option>
                        <option value="price-desc">{t('products.sortPriceHigh')}</option>
                      </select>
                    </div>

                    {/* Material */}
                    <div className="space-y-4">
                      <p className="text-[10px] font-bold text-brand-400 uppercase tracking-widest">{t('products.materialLabel')}</p>
                      <div className="flex flex-wrap gap-2">
                        {materials.map(m => m && (
                          <button 
                            key={m}
                            onClick={() => setSelectedMaterial(m)}
                            className={`px-3 py-1.5 rounded-lg text-xs transition-all ${selectedMaterial === m ? 'bg-brand-900 text-white' : 'bg-brand-50 text-brand-600 hover:bg-brand-100'}`}
                          >
                            {m}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Colors */}
                    <div className="space-y-4">
                      <p className="text-[10px] font-bold text-brand-400 uppercase tracking-widest">{t('products.colorLabel')}</p>
                      <div className="flex flex-wrap gap-2">
                        {colors.map(col => col && (
                          <button 
                            key={col}
                            onClick={() => setSelectedColor(col)}
                            className={`px-3 py-1.5 rounded-lg text-xs transition-all ${selectedColor === col ? 'bg-brand-900 text-white' : 'bg-brand-50 text-brand-600 hover:bg-brand-100'}`}
                          >
                            {col}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            {[...Array(6)].map((_, i) => <ProductSkeleton key={i} />)}
          </div>
        ) : processedProducts.length === 0 ? (
          <div className="text-center py-20 flex flex-col items-center">
            <ListFilter size={48} className="text-brand-100 mb-4" />
            <p className="text-brand-400 text-lg font-serif">{t('product.notFound')}</p>
            <button 
              onClick={() => { setSelectedMaterial(t('products.all')); setSelectedColor(t('products.all')); setSortBy('default'); }}
              className="mt-4 text-xs font-bold text-gold-500 border-b border-gold-500"
            >
              {t('checkout.backToCatalog')}
            </button>
          </div>
        ) : (
          <motion.div layout className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            <AnimatePresence mode="popLayout">
              {processedProducts.map((product, i) => (
                <motion.div 
                  layout 
                  key={product.id} 
                  initial={{ opacity: 0, y: 40 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  exit={{ opacity: 0, scale: 0.9 }} 
                  transition={{ delay: i * 0.05 }} 
                  className="group relative" 
                >
                  <div 
                    className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-brand-100 shadow-lg cursor-pointer"
                    onClick={() => navigate(`/product/${product.id}`)}
                  >
                    <img 
                      src={product.images[0]} 
                      alt={`${product.name} - ${product.category} - ${t('hero.badge')}`} 
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-brand-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center scale-75 group-hover:scale-100 transition-transform shadow-2xl">
                        <ArrowRight className="text-brand-900" />
                      </div>
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="absolute top-6 right-6 flex flex-col gap-3">
                      {/* Wishlist Toggle */}
                      <button 
                        onClick={(e) => { e.stopPropagation(); toggleWishlist(product); }}
                        className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all scale-0 group-hover:scale-100 duration-300 ${
                          isInWishlist(product.id) ? 'bg-red-500 text-white' : 'bg-white text-brand-300 hover:text-red-500'
                        }`}
                        title={isInWishlist(product.id) ? t('nav.removeWishlist') : t('nav.addWishlist')}
                      >
                        <Heart size={20} className={isInWishlist(product.id) ? 'fill-white' : ''} />
                      </button>

                      {/* Quick Add to Cart */}
                      <button 
                        onClick={(e) => { e.stopPropagation(); addToCart(product); }} 
                        className="w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all scale-0 group-hover:scale-100 duration-300 delay-75 bg-white hover:bg-brand-900 hover:text-white text-brand-900 active:scale-95"
                        title={t('products.btnAddToCart')}
                      >
                        <ShoppingBag size={20} />
                      </button>
                    </div>

                    {/* Stock Badge */}
                    {!product.in_stock && (
                      <div className="absolute bottom-6 left-6 px-4 py-2 bg-brand-950/80 backdrop-blur-md text-white text-[10px] font-bold uppercase tracking-widest rounded-lg">
                        {t('products.outOfStock')}
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-6 flex justify-between items-start">
                    <div>
                      <h3 
                        className="text-xl font-serif text-brand-900 cursor-pointer hover:text-gold-500 transition-colors"
                        onClick={() => navigate(`/product/${product.id}`)}
                      >
                        {product.name}
                      </h3>
                      <div className="flex items-center gap-3 mt-2">
                        <p className="text-[10px] font-bold tracking-widest text-brand-400 uppercase">{product.category}</p>
                        {product.material && (
                          <>
                            <span className="w-1 h-1 rounded-full bg-brand-200" />
                            <p className="text-[10px] font-bold tracking-widest text-brand-400 uppercase">{product.material}</p>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-brand-900">₾{product.price.toLocaleString()}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </section>
  );
}
