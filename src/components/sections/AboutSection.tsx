import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Shield, Truck, Award, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function AboutSection() {
  const { t } = useTranslation();
  const aboutRef = useRef<HTMLDivElement>(null);
  const [countersVisible, setCountersVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setCountersVisible(true); },
      { threshold: 0.3 }
    );
    if (aboutRef.current) observer.observe(aboutRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section id="about" className="py-28 bg-brand-50" ref={aboutRef}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row items-center gap-20">
          <motion.div initial={{ opacity: 0, x: -50 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="lg:w-1/2 relative">
            <div className="relative z-10 rounded-2xl overflow-hidden shadow-2xl">
              <img 
                src="https://images.unsplash.com/photo-1581428982868-e410dd047a90?q=80&w=1974" 
                alt={t('about.badge')} 
                className="w-full h-[600px] object-cover" 
                loading="lazy"
              />
            </div>
            <div className="absolute -bottom-10 -right-10 w-64 h-64 bg-gold-400/20 rounded-full blur-[80px] -z-0" />
            <div className="absolute -top-10 -left-10 bg-brand-900 text-white p-10 rounded-2xl shadow-2xl z-20">
              <p className="text-5xl font-serif font-bold mb-1" style={{color:'#c9a227'}}>{countersVisible ? '10+' : '0'}</p>
              <p className="text-[10px] font-bold tracking-[0.2em] uppercase opacity-70 leading-relaxed whitespace-pre-line">{t('about.experienceLabel')}</p>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 50 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="lg:w-1/2">
            <p className="text-xs tracking-[0.3em] uppercase font-bold mb-4" style={{color:'#c9a227'}}>{t('about.badge')}</p>
            <h2 className="text-4xl md:text-6xl font-serif text-brand-900 mb-8 leading-tight">{t('about.title')} <br/><span className="italic font-light text-brand-500">{t('about.titleHighlight')}</span></h2>
            <p className="text-brand-600 text-lg mb-8 leading-relaxed">{t('about.description')}</p>
            <div className="grid grid-cols-2 gap-6 mb-10">
              {[ 
                { icon: <Shield />, label: t('about.featureWarranty') }, 
                { icon: <Award />, label: t('about.featureQuality') }, 
                { icon: <Truck />, label: t('about.featureDelivery') }, 
                { icon: <Sparkles />, label: t('about.featureDesign') } 
              ].map((f, i) => (
                <div key={i} className="flex items-center gap-4 group">
                  <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center transition-all group-hover:bg-brand-900 group-hover:text-white" style={{color:'#c9a227'}}>
                    {React.cloneElement(f.icon as React.ReactElement<any>, { className: 'w-5 h-5' })}
                  </div>
                  <span className="font-bold text-sm tracking-widest uppercase text-brand-800">{f.label}</span>
                </div>
              ))}
            </div>
            <footer className="border-l-4 pl-6 py-2 border-gold-400 italic text-brand-500">{t('about.mission')}</footer>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
