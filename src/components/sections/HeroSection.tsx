import React from 'react';
import { motion } from 'motion/react';
import { ArrowRight, MessageCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function HeroSection() {
  const { t } = useTranslation();

  return (
    <section id="home" className="relative h-screen flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 z-0">
        <img 
          src="https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&q=80&w=1920" 
          alt="Kale Group Premium Furniture Design - პრემიუმ ავეჯის დამზადება საქართველოში" 
          className="w-full h-full object-cover scale-105" 
        />
        <div className="absolute inset-0 bg-gradient-to-b from-brand-950/70 via-brand-900/40 to-brand-950/80" />
      </div>
      
      <div className="relative z-10 text-center px-4 max-w-5xl mx-auto mt-16">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="inline-flex items-center gap-2 glass px-5 py-2 rounded-full mb-8">
          <span className="w-2 h-2 rounded-full bg-gold-400 animate-pulse-gold" style={{background:'#c9a227'}} />
          <span className="text-[10px] font-bold tracking-[0.3em] uppercase text-white/90">{t('hero.badge')}</span>
        </motion.div>

        <motion.h1 initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, delay: 0.2 }} className="text-4xl md:text-6xl lg:text-7xl font-serif text-white mb-8 leading-[1.3] drop-shadow-2xl tracking-wide">
          <span className="drop-shadow-md">{t('hero.title')}</span>
          <span className="block mt-2 md:mt-4 italic font-light text-shimmer opacity-90">{t('hero.titleSpan')}</span>
        </motion.h1>

        <motion.p initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="text-base md:text-lg text-white/80 mb-12 max-w-2xl mx-auto font-light leading-loose tracking-wide drop-shadow-md">
          {t('hero.subtitle')}
        </motion.p>

        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="flex flex-col sm:flex-row items-center justify-center gap-5 mb-20">
          <a href="#products" className="inline-flex items-center px-10 py-4 bg-white text-brand-900 text-xs font-bold tracking-[0.2em] uppercase hover:bg-brand-50 transition-all shadow-xl hover:-translate-y-1">
            {t('hero.btnProducts')} <ArrowRight className="ml-2 w-4 h-4" />
          </a>
          <a href="#contact" className="inline-flex items-center px-10 py-4 glass text-gold-400 text-xs font-bold tracking-[0.2em] uppercase hover:bg-gold-500/10 hover:text-gold-300 transition-all border border-gold-400/50 shadow-[0_0_15px_rgba(201,162,39,0.15)]">
            {t('hero.btnConsult')} <MessageCircle className="ml-2 w-4 h-4" />
          </a>
        </motion.div>

        <div className="flex items-center justify-center gap-12 md:gap-24 opacity-60">
          {[
            { v: '10+', l: t('hero.stats.experience') },
            { v: '500+', l: t('hero.stats.projects') },
            { v: '100%', l: t('hero.stats.quality') }
          ].map((s, i) => (
            <div key={i} className="text-center">
              <p className="text-2xl md:text-3xl font-serif font-bold text-white mb-1">{s.v}</p>
              <p className="text-[10px] text-white uppercase tracking-widest">{s.l}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-scroll-bounce flex flex-col items-center gap-2 opacity-40">
        <span className="text-[10px] text-white uppercase tracking-widest font-bold">Scroll</span>
        <div className="w-px h-12 bg-white" />
      </div>
    </section>
  );
}
