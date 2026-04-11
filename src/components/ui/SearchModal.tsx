import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, X, ShoppingBag, ArrowRight } from 'lucide-react';
import { useProducts } from '../../hooks/useSupabaseData';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { formatPrice } from '../../utils/price';
import { isProductOnActiveSale } from '../../utils/promotions';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const [query, setQuery] = useState('');
  const { products } = useProducts();
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
      setQuery('');
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  const filteredProducts = query.trim() === '' 
    ? [] 
    : products.filter(p => 
        p.name.toLowerCase().includes(query.toLowerCase()) ||
        p.category.toLowerCase().includes(query.toLowerCase()) ||
        (p.description && p.description.toLowerCase().includes(query.toLowerCase()))
      ).slice(0, 8);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-20 px-4 sm:pt-32">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-brand-900/40 backdrop-blur-md cursor-pointer"
          />

          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl shadow-brand-900/20 overflow-hidden border border-brand-100"
          >
            {/* Search Header */}
            <div className="relative p-6 border-b border-brand-100">
              <Search className="absolute left-10 top-1/2 -translate-y-1/2 text-brand-400 w-5 h-5" />
              <input
                ref={inputRef}
                type="text"
                placeholder={t('search.placeholder', 'ძიება...')}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full bg-brand-50 text-brand-900 text-lg font-medium pl-12 pr-12 py-4 rounded-2xl border-none focus:ring-2 focus:ring-brand-900 transition-all outline-none"
              />
              <button
                onClick={onClose}
                className="absolute right-10 top-1/2 -translate-y-1/2 p-2 text-brand-400 hover:text-brand-900 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Results */}
            <div className="max-h-[60vh] overflow-y-auto p-4 custom-scrollbar">
              {query.trim() === '' ? (
                <div className="py-12 text-center space-y-4">
                  <div className="w-16 h-16 bg-brand-50 rounded-full flex items-center justify-center mx-auto">
                    <Search className="w-8 h-8 text-brand-200" />
                  </div>
                  <p className="text-brand-400 font-medium">{t('search.startTyping', 'დაიწყეთ წერა მოსაძებნად')}</p>
                </div>
              ) : filteredProducts.length > 0 ? (
                <div className="space-y-2">
                  <div className="px-4 py-2">
                    <p className="text-[10px] font-bold text-brand-400 uppercase tracking-widest">
                      {t('search.resultsLabel', 'ნაპოვნია')} {filteredProducts.length} {t('search.resultsCount', 'პროდუქტი')}
                    </p>
                  </div>
                  {filteredProducts.map((product) => (
                    <Link
                      key={product.id}
                      to={`/product/${product.id}`}
                      onClick={onClose}
                      className="flex items-center gap-4 p-4 rounded-2xl hover:bg-brand-50 group transition-all"
                    >
                      <div className="w-16 h-16 rounded-xl overflow-hidden bg-brand-100 flex-shrink-0">
                        <img
                          src={product.images[0]}
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-brand-900 font-semibold truncate group-hover:text-brand-600 transition-colors">
                          {product.name}
                        </h4>
                        <p className="text-xs text-brand-400 font-medium">{product.category}</p>
                      </div>
                      <div className="text-right flex flex-col items-end gap-1">
                        <span className="text-brand-900 font-bold whitespace-nowrap">
                          {formatPrice(isProductOnActiveSale(product) ? product.sale_price! : product.price)}
                        </span>
                        <ArrowRight size={16} className="text-brand-200 group-hover:text-brand-900 group-hover:translate-x-1 transition-all" />
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center space-y-4">
                  <div className="w-16 h-16 bg-brand-50 rounded-full flex items-center justify-center mx-auto">
                    <ShoppingBag className="w-8 h-8 text-brand-200" />
                  </div>
                  <p className="text-brand-400 font-medium">
                    {t('search.noResults', 'პროდუქტი ვერ მოიძებნა')} "{query}"
                  </p>
                </div>
              )}
            </div>

            {/* Footer / Shortcuts */}
            <div className="p-4 bg-brand-50/50 border-t border-brand-100 flex justify-between items-center text-[10px] font-bold text-brand-400 uppercase tracking-widest px-8">
              <div className="flex gap-4">
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 rounded border border-brand-200 bg-white shadow-sm font-sans lowercase">esc</kbd> {t('search.close', 'დახურვა')}
                </span>
              </div>
              <Link to="/#products" onClick={onClose} className="text-brand-900 hover:underline">
                {t('search.viewAll', 'ყველას ნახვა')}
              </Link>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
