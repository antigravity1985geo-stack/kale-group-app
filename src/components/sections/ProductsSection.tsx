import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, ShoppingBag, Heart, Filter, ChevronDown, ListFilter, LayoutGrid, Grid, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useProducts, useCategories } from '../../hooks/useSupabaseData';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';
import ProductSkeleton from '../ui/ProductSkeleton';
import { useNavigate } from 'react-router-dom';
import type { Product } from '../../types/product';
import { useTranslation } from 'react-i18next';
import ProtectedImage from '../ui/ProtectedImage';
import { isProductOnActiveSale } from '../../utils/promotions';

export const Countdown = ({ endDate }: { endDate: string }) => {
  const [timeLeft, setTimeLeft] = React.useState('');

  React.useEffect(() => {
    const calc = () => {
      const end = new Date(endDate).getTime();
      const now = new Date().getTime();
      const diff = end - now;
      if (diff <= 0) return 'დასრულდა';
      const d = Math.floor(diff / (1000 * 60 * 60 * 24));
      const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      if (d > 0) return `${d} დღე ${h} სთ`;
      return `${h} სთ ${m} წთ`;
    };
    setTimeLeft(calc());
    const interval = setInterval(() => setTimeLeft(calc()), 60000);
    return () => clearInterval(interval);
  }, [endDate]);

  if (!timeLeft) return null;
  return <span className="bg-red-500/90 backdrop-blur-md text-white px-2.5 py-1.5 rounded-lg text-[9px] md:text-[11px] font-bold uppercase tracking-widest shadow-lg flex items-center gap-2 whitespace-nowrap"><span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span> {timeLeft}</span>;
};

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
  
  // State for controls
  const [sortBy, setSortBy] = React.useState<'default' | 'price-asc' | 'price-desc'>('default');
  const [itemsPerPage, setItemsPerPage] = React.useState(12);
  const [currentPage, setCurrentPage] = React.useState(1);
  const [showFilters, setShowFilters] = React.useState(false);
  
  // Advanced filters
  const [priceRange, setPriceRange] = React.useState<[number, number]>([0, 10000]);
  const [onlyOnSale, setOnlyOnSale] = React.useState(false);
  const [onlyInStock, setOnlyInStock] = React.useState(false);
  const [selectedMaterial, setSelectedMaterial] = React.useState<string>(t('products.all'));
  const [selectedColor, setSelectedColor] = React.useState<string>(t('products.all'));

  // Reset page when category or filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [activeCategory, sortBy, itemsPerPage, priceRange, onlyOnSale, onlyInStock, selectedMaterial, selectedColor]);

  const filterCategories = [t('products.all'), ...categories.map(c => c.name)];
  const materials = [t('products.all'), ...Array.from(new Set(products.map(p => p.material).filter(Boolean))) as string[]];
  const colors = [t('products.all'), ...Array.from(new Set(products.flatMap(p => p.colors || []).filter(Boolean))) as string[]];

  // Derived filtered products
  const filteredProducts = React.useMemo(() => {
    let result = [...products];

    // Filter by material
    if (selectedMaterial !== t('products.all')) {
      result = result.filter(p => p.material === selectedMaterial);
    }
    // Filter by color
    if (selectedColor !== t('products.all')) {
      result = result.filter(p => p.colors?.includes(selectedColor));
    }
    // Filter by sale status
    if (onlyOnSale) {
      result = result.filter(p => isProductOnActiveSale(p));
    }
    // Filter by stock status
    if (onlyInStock) {
      result = result.filter(p => p.in_stock);
    }
    // Filter by price range
    result = result.filter(p => {
      const cost = isProductOnActiveSale(p) && p.sale_price ? p.sale_price : p.price;
      return cost >= priceRange[0] && cost <= priceRange[1];
    });

    // Sort
    if (sortBy === 'price-asc') {
      result.sort((a, b) => {
        const p1 = isProductOnActiveSale(a) && a.sale_price ? a.sale_price : a.price;
        const p2 = isProductOnActiveSale(b) && b.sale_price ? b.sale_price : b.price;
        return p1 - p2;
      });
    } else if (sortBy === 'price-desc') {
      result.sort((a, b) => {
        const p1 = isProductOnActiveSale(a) && a.sale_price ? a.sale_price : a.price;
        const p2 = isProductOnActiveSale(b) && b.sale_price ? b.sale_price : b.price;
        return p2 - p1;
      });
    }

    return result;
  }, [products, sortBy, selectedMaterial, selectedColor, onlyOnSale, onlyInStock, priceRange, t]);

  // Pagination logic
  const totalItems = filteredProducts.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const currentProducts = filteredProducts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const scrollToTop = () => {
    const productsRoot = document.getElementById('products-root');
    if (productsRoot) {
      productsRoot.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handlePageChange = (p: number) => {
    setCurrentPage(p);
    scrollToTop();
  };

  return (
    <section id="products" className="py-24 bg-white">
      <div id="products-root" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header Section */}
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
          <p className="text-xs tracking-[0.4em] uppercase font-bold mb-3" style={{color:'#c9a227'}}>{t('products.badge')}</p>
          <h2 className="text-4xl md:text-5xl font-serif text-brand-900 mb-10">{t('products.title')} <span className="italic text-brand-400 font-light">{t('products.titleHighlight')}</span></h2>
          
          <div className="flex flex-wrap justify-center gap-3">
            {filterCategories.map(c => (
              <button 
                key={c} 
                onClick={() => setActiveCategory(c)} 
                className={`px-6 py-2.5 md:px-8 md:py-3 rounded-full text-[9px] md:text-[10px] font-bold tracking-[0.2em] uppercase transition-all ${
                  activeCategory === c 
                    ? 'bg-brand-900 text-white shadow-xl scale-105' 
                    : 'bg-brand-50 text-brand-400 hover:bg-brand-100'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Filters and Controls Toolbar */}
        <div className="flex flex-col lg:flex-row gap-8">
          
          {/* Sidebar Filters (Desktop) / Dropdown (Mobile) */}
          <aside className={`lg:w-64 flex-shrink-0 space-y-8 ${showFilters ? 'block' : 'hidden lg:block'}`}>
            <div className="flex items-center justify-between lg:hidden mb-4">
              <h3 className="font-serif text-xl">{t('products.filterLabel')}</h3>
              <button onClick={() => setShowFilters(false)} className="p-2"><X size={20}/></button>
            </div>

            {/* Price Filter */}
            <div className="bg-brand-50/30 p-6 rounded-2xl border border-brand-100/50">
              <h4 className="text-[10px] font-extrabold tracking-[0.2em] uppercase text-brand-900 mb-6 flex items-center gap-2">
                <span className="w-1 h-4 bg-gold-500 rounded-full" /> {t('products.priceFilter') || 'ფასით გაფილტვრა'}
              </h4>
              <div className="space-y-4">
                <div className="flex justify-between text-xs font-bold text-brand-400">
                  <span>₾0</span>
                  <span>₾{priceRange[1].toLocaleString()}</span>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="10000" 
                  step="100"
                  value={priceRange[1]}
                  onChange={(e) => setPriceRange([0, parseInt(e.target.value)])}
                  className="w-full h-1.5 bg-brand-100 rounded-lg appearance-none cursor-pointer accent-gold-600"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div className="bg-brand-50/30 p-6 rounded-2xl border border-brand-100/50">
              <h4 className="text-[10px] font-extrabold tracking-[0.2em] uppercase text-brand-900 mb-6 flex items-center gap-2">
                <span className="w-1 h-4 bg-gold-500 rounded-full" /> {t('products.statusFilter') || 'სტატუსი'}
              </h4>
              <div className="space-y-4">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${onlyOnSale ? 'bg-red-500 border-red-500' : 'bg-white border-brand-200'}`}>
                    {onlyOnSale && <div className="w-2 h-2 bg-white rounded-full" />}
                  </div>
                  <input type="checkbox" checked={onlyOnSale} onChange={() => setOnlyOnSale(!onlyOnSale)} className="hidden" />
                  <span className="text-xs font-bold text-brand-600 group-hover:text-red-500 transition-colors uppercase tracking-wider">{t('products.onSale') || 'ფასდაკლებით'}</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${onlyInStock ? 'bg-brand-900 border-brand-900' : 'bg-white border-brand-200'}`}>
                    {onlyInStock && <div className="w-2 h-2 bg-white rounded-full" />}
                  </div>
                  <input type="checkbox" checked={onlyInStock} onChange={() => setOnlyInStock(!onlyInStock)} className="hidden" />
                  <span className="text-xs font-bold text-brand-600 group-hover:text-brand-900 transition-colors uppercase tracking-wider">{t('products.inStock') || 'მარაგშია'}</span>
                </label>
              </div>
            </div>

            {/* Additional filters (Material/Color) can be added here */}
          </aside>

          {/* Main Grid Section */}
          <div className="flex-1">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-10 bg-white border border-brand-100 p-4 rounded-2xl shadow-sm">
              <div className="flex items-center gap-6">
                <button 
                  onClick={() => setShowFilters(!showFilters)}
                  className="lg:hidden flex items-center gap-2 text-[9px] font-bold tracking-widest text-brand-900 uppercase"
                >
                  <Filter size={16} /> {t('products.filterLabel')}
                </button>
                <div className="hidden sm:flex items-center gap-3 text-[10px] font-bold tracking-widest uppercase text-brand-400">
                  <span>{t('products.show') || 'გამოჩნდეს'}:</span>
                  <div className="flex gap-2">
                    {[9, 12, 18, 24].map(num => (
                      <button 
                        key={num} 
                        onClick={() => setItemsPerPage(num)}
                        className={`transition-colors ${itemsPerPage === num ? 'text-brand-900 underline' : 'hover:text-brand-900'}`}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="hidden sm:flex items-center gap-2 border-r border-brand-100 pr-4">
                  <LayoutGrid size={18} className="text-brand-900 cursor-pointer" />
                  <Grid size={18} className="text-brand-200 cursor-pointer hover:text-brand-600" />
                </div>
                <select 
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="bg-transparent text-[10px] font-bold tracking-widest uppercase text-brand-900 outline-none cursor-pointer"
                >
                  <option value="default">{t('products.sortDefault')}</option>
                  <option value="price-asc">{t('products.sortPriceLow')}</option>
                  <option value="price-desc">{t('products.sortPriceHigh')}</option>
                </select>
              </div>
            </div>

            {loading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6 lg:gap-8">
                {[...Array(itemsPerPage)].map((_, i) => <ProductSkeleton key={i} />)}
              </div>
            ) : totalItems === 0 ? (
              <div className="text-center py-20 flex flex-col items-center">
                <ListFilter size={48} className="text-brand-100 mb-4" />
                <p className="text-brand-400 text-lg font-serif">{t('product.notFound')}</p>
                <button 
                  onClick={() => { setOnlyOnSale(false); setOnlyInStock(false); setPriceRange([0, 10000]); setSortBy('default'); setActiveCategory(t('products.all')); }}
                  className="mt-4 text-xs font-bold text-gold-500 border-b border-gold-500 uppercase tracking-widest"
                >
                  {t('products.all')}
                </button>
              </div>
            ) : (
              <>
                <motion.div layout className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6 lg:gap-8">
                  <AnimatePresence mode="popLayout">
                    {currentProducts.map((product, i) => (
                      <motion.div 
                        layout 
                        key={product.id} 
                        initial={{ opacity: 0, scale: 0.95 }} 
                        animate={{ opacity: 1, scale: 1 }} 
                        exit={{ opacity: 0, scale: 0.9 }} 
                        transition={{ duration: 0.3 }}
                        className="group relative" 
                      >
                        <div 
                          className="relative aspect-[4/5] overflow-hidden rounded-xl md:rounded-2xl bg-brand-100 shadow-md md:shadow-lg cursor-pointer"
                          onClick={() => navigate(`/product/${product.id}`)}
                        >
                          <ProtectedImage 
                            src={product.images[0]} 
                            alt={product.name} 
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                            loading="lazy"
                          />
                          <div className="absolute inset-0 bg-brand-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <div className="w-10 h-10 md:w-16 md:h-16 bg-white rounded-full flex items-center justify-center scale-75 group-hover:scale-100 transition-transform shadow-2xl">
                              <ArrowRight className="text-brand-900 w-4 h-4 md:w-6 md:h-6" />
                            </div>
                          </div>
                          
                          {/* Action Buttons */}
                          <div className="absolute top-3 right-3 md:top-6 md:right-6 flex flex-col gap-2 md:gap-3">
                            <button 
                              onClick={(e) => { e.stopPropagation(); toggleWishlist(product); }}
                              className={`w-8 h-8 md:w-12 md:h-12 rounded-full flex items-center justify-center shadow-lg transition-all scale-0 group-hover:scale-100 duration-300 ${
                                isInWishlist(product.id) ? 'bg-red-500 text-white' : 'bg-white text-brand-300 hover:text-red-500'
                              }`}
                            >
                              <Heart size={14} className={isInWishlist(product.id) ? 'fill-white md:w-5 md:h-5' : 'md:w-5 md:h-5'} />
                            </button>
                            <button 
                              onClick={(e) => { e.stopPropagation(); addToCart(product); }} 
                              className="w-8 h-8 md:w-12 md:h-12 rounded-full flex items-center justify-center shadow-lg transition-all scale-0 group-hover:scale-100 duration-300 delay-75 bg-white hover:bg-brand-900 hover:text-white text-brand-900 active:scale-95"
                            >
                              <ShoppingBag size={14} className="md:w-5 md:h-5" />
                            </button>
                          </div>

                          {/* Sale Badge */}
                          {isProductOnActiveSale(product) && product.discount_percentage ? (
                            <div className="absolute top-3 left-3 md:top-6 md:left-6 z-10">
                              <span className="bg-red-500 text-white text-[8px] md:text-[11px] font-bold px-2 py-1 md:px-3 md:py-1.5 rounded md:rounded-lg uppercase tracking-widest shadow-lg">
                                -{product.discount_percentage}%
                              </span>
                            </div>
                          ) : null}

                          {/* Countdown */}
                          {isProductOnActiveSale(product) && product.sale_end_date && new Date(product.sale_end_date).getTime() > new Date().getTime() && (
                            <div className="absolute bottom-3 right-3 md:bottom-6 md:right-6 z-10">
                              <Countdown endDate={product.sale_end_date} />
                            </div>
                          )}
                        </div>
                        
                        <div className="mt-4 md:mt-6 flex justify-between items-start">
                          <div className="flex-1 min-w-0 pr-2">
                            <h3 
                              className="text-sm md:text-xl font-serif text-brand-900 truncate hover:text-gold-500 transition-colors cursor-pointer"
                              onClick={() => navigate(`/product/${product.id}`)}
                            >
                              {product.name}
                            </h3>
                            <div className="flex items-center gap-2 mt-1 md:mt-2 overflow-hidden">
                              <p className="text-[8px] md:text-[10px] font-bold tracking-widest text-brand-400 uppercase truncate">{product.category}</p>
                              {product.material && (
                                <>
                                  <span className="w-0.5 h-0.5 rounded-full bg-brand-200 flex-shrink-0" />
                                  <p className="text-[8px] md:text-[10px] font-bold tracking-widest text-brand-400 uppercase truncate">{product.material}</p>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            {isProductOnActiveSale(product) && product.sale_price ? (
                              <div className="flex flex-col">
                                <span className="text-[10px] md:text-sm font-bold text-gray-400 line-through">₾{product.price.toLocaleString()}</span>
                                <span className="text-sm md:text-lg font-bold text-red-600">₾{product.sale_price.toLocaleString()}</span>
                              </div>
                            ) : (
                              <p className="text-sm md:text-lg font-bold text-brand-900">₾{product.price.toLocaleString()}</p>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </motion.div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="mt-16 flex items-center justify-center gap-3">
                    <button 
                      onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="w-10 h-10 rounded-full flex items-center justify-center border border-brand-100 text-brand-900 disabled:opacity-30 hover:bg-brand-50 transition-colors"
                    >
                      <ChevronLeft size={20} />
                    </button>
                    
                    <div className="flex items-center gap-2">
                      {[...Array(totalPages)].map((_, i) => (
                        <button
                          key={i}
                          onClick={() => handlePageChange(i + 1)}
                          className={`w-10 h-10 rounded-full text-xs font-bold transition-all ${currentPage === i + 1 ? 'bg-brand-900 text-white shadow-lg scale-110' : 'bg-brand-50 text-brand-400 hover:bg-brand-100'}`}
                        >
                          {i + 1}
                        </button>
                      ))}
                    </div>

                    <button 
                      onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className="w-10 h-10 rounded-full flex items-center justify-center border border-brand-100 text-brand-900 disabled:opacity-30 hover:bg-brand-50 transition-colors"
                    >
                      <ChevronRight size={20} />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
