import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight, ChevronLeft, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useCategories } from '../../hooks/useSupabaseData';
import type { Category } from '../../types/product';
import { getCategoryName } from '../../utils/i18n';

// Reusable 3D Coverflow Component
const CoverflowCarousel = ({ categories, onSelect, t, lang }: { categories: Category[], onSelect: (name: string) => void, t: any, lang: string }) => {
  const [activeIndex, setActiveIndex] = useState(2 % categories.length || 0); // Start somewhere in middle
  const [isHovered, setIsHovered] = useState(false);

  const next = useCallback(() => {
    setActiveIndex((prev) => (prev + 1) % categories.length);
  }, [categories.length]);

  const prev = useCallback(() => {
    setActiveIndex((prev) => (prev - 1 + categories.length) % categories.length);
  }, [categories.length]);

  // Autoplay
  useEffect(() => {
    if (isHovered) return;
    const interval = setInterval(next, 3500); // 3.5s per slide
    return () => clearInterval(interval);
  }, [next, isHovered]);

  if (!categories || categories.length === 0) return null;

  return (
    <div 
      className="relative w-full h-[550px] flex items-center justify-center overflow-hidden"
      style={{ perspective: "1200px" }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onTouchStart={() => setIsHovered(true)}
      onTouchEnd={() => setIsHovered(false)}
    >
      {/* Navigation Arrows with Pulsing Light */}
      <button 
        onClick={prev}
        className="absolute left-2 md:left-12 z-50 p-2 md:p-3 bg-brand-900/60 backdrop-blur-md border border-white/10 rounded-full text-white hover:bg-brand-900 transition-all shadow-[0_0_15px_rgba(201,162,39,0.2)] hover:shadow-[0_0_25px_rgba(201,162,39,0.6)] animate-pulse-gold hidden md:flex items-center justify-center"
      >
        <ChevronLeft className="w-5 h-5 md:w-6 md:h-6" />
      </button>
      
      <button 
        onClick={next}
        className="absolute right-2 md:right-12 z-50 p-2 md:p-3 bg-brand-900/60 backdrop-blur-md border border-white/10 rounded-full text-white hover:bg-brand-900 transition-all shadow-[0_0_15px_rgba(201,162,39,0.2)] hover:shadow-[0_0_25px_rgba(201,162,39,0.6)] animate-pulse-gold hidden md:flex items-center justify-center"
      >
        <ChevronRight className="w-5 h-5 md:w-6 md:h-6" />
      </button>

      {/* 3D Stacking Context */}
      <div className="relative w-full max-w-sm h-full flex items-center justify-center" style={{ transformStyle: 'preserve-3d' }}>
        <AnimatePresence initial={false}>
          {categories.map((cat, i) => {
            // Find shortest path for circular array calculation
            let offset = i - activeIndex;
            const halfLength = Math.floor(categories.length / 2);
            if (offset > halfLength) offset -= categories.length;
            if (offset < -halfLength) offset += categories.length;

            const isActive = offset === 0;
            const absOffset = Math.abs(offset);
            
            // Limit rendered items to save performance (only render visible ones + 1 padding)
            if (absOffset > 3) return null;

            // 3D Math for Positioning
            // Size decreases for outer cards
            const scale = 1 - absOffset * 0.18;
            // X position shifts based on offset
            const x = offset * 110; // Mobile spacing, we will rely on motion transition
            // Z pushes cards backwards
            const z = -absOffset * 160;
            // Rotate Y for coverflow tilt
            const rotateY = offset === 0 ? 0 : offset > 0 ? -30 : 30;
            
            return (
              <motion.div
                key={cat.name}
                layoutId={`category-card-${cat.name}`}
                initial={false}
                animate={{
                  scale,
                  x: window.innerWidth < 768 ? offset * 110 : offset * 220, // Increased mobile spacing (from 70 to 110)
                  z,
                  rotateY,
                  zIndex: 50 - absOffset,
                  opacity: 1 - absOffset * 0.25,
                }}
                // Extremely soft and luxurious Premium Transition
                transition={{ 
                  type: "tween", 
                  ease: [0.25, 0.1, 0.25, 1], // Soft cubic-bezier ease
                  duration: 0.8 
                }}
                onClick={() => {
                  if (isActive) {
                    onSelect(cat.name);
                    // Action: Smooth scroll to products
                    document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' });
                  } else {
                    setActiveIndex(i); // Bring to front
                  }
                }}
                // Drag Logic for Mobile Swiping
                drag={isActive ? "x" : false}
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.2}
                onDragEnd={(e, { offset, velocity }) => {
                  if (offset.x < -40) next();
                  else if (offset.x > 40) prev();
                }}
                className={`absolute w-[240px] md:w-[320px] h-[360px] md:h-[460px] rounded-2xl overflow-hidden cursor-pointer shadow-2xl transition-all duration-300 ${isActive ? 'glow-gold ring-1 ring-gold-500/50' : 'ring-1 ring-white/10'}`}
                style={{
                  transformStyle: 'preserve-3d',
                  filter: isActive ? 'brightness(1.1)' : `brightness(${1 - absOffset * 0.2}) contrast(${1 - absOffset * 0.1})`
                }}
              >
                <img 
                  src={cat.image} 
                  alt={cat.name} 
                  className={`w-full h-full object-cover pointer-events-none transition-transform duration-700 ${isActive ? 'scale-105' : 'scale-100'}`} 
                  loading="lazy"
                  draggable={false}
                />
                
                {/* Dynamic Overlay Gradient */}
                <div className={`absolute inset-0 bg-gradient-to-t from-brand-950 via-brand-950/20 to-transparent transition-colors duration-500 ${isActive ? 'opacity-100' : 'opacity-80 via-brand-950/60'}`} />
                
                {/* Card Content */}
                <div className="absolute bottom-0 left-0 right-0 p-6 z-10">
                  <motion.h3 
                    layoutId={`category-title-${cat.name}`}
                    className={`font-serif text-white mb-2 transition-all duration-300 ${isActive ? 'text-2xl md:text-3xl' : 'text-xl'}`}
                  >
                    {getCategoryName(cat, lang)}
                  </motion.h3>
                  
                  {isActive && (
                    <motion.div 
                      key="active-indicator"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="flex items-center gap-2 text-gold-400 text-[10px] md:text-xs font-bold tracking-widest uppercase"
                    >
                      {t('categories.view')} <ChevronRight className="w-4 h-4" />
                    </motion.div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
};

interface CategoriesSectionProps {
  onCategorySelected: (category: string) => void;
}

export default function CategoriesSection({ onCategorySelected }: CategoriesSectionProps) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const { categories, loading } = useCategories();

  return (
    <section className="py-24 bg-brand-50 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-gold-500/5 blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-[20%] -right-[10%] w-[50%] h-[50%] rounded-full bg-brand-900/5 blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
          <p className="text-xs tracking-[0.3em] uppercase font-bold mb-3" style={{color:'#c9a227'}}>
            {t('categories.badge')}
          </p>
          <h2 className="text-4xl md:text-5xl font-serif text-brand-900 mb-6">
            {t('categories.title')}
          </h2>
          <div className="w-20 h-1 bg-brand-900 mx-auto rounded-full" />
        </motion.div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="w-10 h-10 animate-spin text-brand-300 mb-4" />
            <p className="text-brand-400 text-sm tracking-widest uppercase">{t('categories.loading')}</p>
          </div>
        ) : (
          <CoverflowCarousel 
            categories={categories} 
            onSelect={onCategorySelected} 
            t={t}
            lang={lang}
          />
        )}
      </div>
    </section>
  );
}
