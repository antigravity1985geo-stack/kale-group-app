import React from 'react';
import { motion } from 'motion/react';
import { ChevronRight, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useCategories } from '../../hooks/useSupabaseData';

interface CategoriesSectionProps {
  onCategorySelected: (category: string) => void;
}

export default function CategoriesSection({ onCategorySelected }: CategoriesSectionProps) {
  const { t } = useTranslation();
  const { categories, loading } = useCategories();

  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
          <p className="text-xs tracking-[0.3em] uppercase font-bold mb-3" style={{color:'#c9a227'}}>{t('categories.badge')}</p>
          <h2 className="text-4xl md:text-5xl font-serif text-brand-900 mb-6">{t('categories.title')}</h2>
          <div className="w-20 h-1 bg-brand-900 mx-auto" />
        </motion.div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="w-10 h-10 animate-spin text-brand-300 mb-4" />
            <p className="text-brand-400 text-sm tracking-widest uppercase">{t('categories.loading')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {categories.map((cat, i) => (
              <motion.div 
                key={cat.name} 
                initial={{ opacity: 0, scale: 0.9 }} 
                whileInView={{ opacity: 1, scale: 1 }} 
                viewport={{ once: true }} 
                transition={{ delay: i * 0.1 }} 
                onClick={() => {
                  onCategorySelected(cat.name);
                  document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' });
                }} 
                className="group cursor-pointer relative h-[450px] overflow-hidden rounded-2xl shadow-xl"
              >
                <img 
                  src={cat.image} 
                  alt={`${cat.name} - ${t('categories.badge')} Kale Group`} 
                  className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" 
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-brand-950 via-brand-950/20 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-8">
                  <h3 className="text-2xl font-serif text-white mb-2">{cat.name}</h3>
                  <div className="flex items-center gap-2 text-white/60 text-xs font-bold tracking-widest uppercase transition-colors group-hover:text-gold-400" style={{color: i % 2 === 0 ? '' : '#c9a227'}}>
                    {t('categories.view')} <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
