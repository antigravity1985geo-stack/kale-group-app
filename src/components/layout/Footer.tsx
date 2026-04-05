import React, { useState } from 'react';
import { Instagram, Facebook, ArrowRight, Check } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useTranslation } from 'react-i18next';

export default function Footer() {
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterSuccess, setNewsletterSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const location = useLocation();
  const { t } = useTranslation();

  if (location.pathname.startsWith('/admin')) return null;

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail) return;
    setIsSubmitting(true);
    
    try {
      const { error } = await supabase.from('newsletter_subscribers').insert([{ email: newsletterEmail }]);
      if (error && error.code !== '23505') { // Ignore unique violation if already subscribed
        throw error;
      }
      setNewsletterSuccess(true);
      setNewsletterEmail('');
      setTimeout(() => setNewsletterSuccess(false), 5000);
    } catch (error) {
      console.error('Newsletter error', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const navLinks = [
    { name: t('nav.home'), href: '/' },
    { name: t('nav.products'), href: '/#products' },
    { name: t('nav.aiDesign'), href: '/#ai-generator' },
    { name: t('nav.contact'), href: '/#contact' },
  ];

  return (
    <footer className="bg-brand-950 pt-24 pb-12 relative overflow-hidden border-t border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-16 mb-20">
          {/* Column 1: Logo & Vision */}
          <div className="lg:col-span-1">
            <Link to="/" className="text-3xl font-serif font-bold tracking-tight text-white mb-8 block">
              KALE<span className="text-gold-400 font-light">GROUP</span>
            </Link>
            <p className="text-white/40 text-sm leading-relaxed mb-10">
              {t('about.description')}
            </p>
            <div className="flex gap-4">
              <a href="#" className="w-12 h-12 rounded-full glass-dark flex items-center justify-center text-white/50 hover:text-gold-400 hover:border-gold-400/50 border border-white/10 transition-all hover:-translate-y-1">
                <Instagram size={18} />
              </a>
              <a href="#" className="w-12 h-12 rounded-full glass-dark flex items-center justify-center text-white/50 hover:text-gold-400 hover:border-gold-400/50 border border-white/10 transition-all hover:-translate-y-1">
                <Facebook size={18} />
              </a>
            </div>
          </div>

          {/* Column 2: Navigation */}
          <div>
            <h4 className="text-white text-xs font-bold tracking-[0.3em] uppercase mb-10">{t('footer.navigation')}</h4>
            <ul className="space-y-4">
              {navLinks.map(l => (
                <li key={l.name}>
                  <a href={l.href} className="text-white/50 hover:text-white transition-colors text-sm font-medium tracking-wide">
                    {l.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Contact Info */}
          <div>
            <h4 className="text-white text-xs font-bold tracking-[0.3em] uppercase mb-10">{t('nav.contact')}</h4>
            <p className="text-white/50 text-sm leading-loose">
              {t('footer.address')}<br/>
              <span className="text-white font-bold inline-block mt-4">+995 555 12 34 56</span><br/>
              info@kalegroup.ge
            </p>
          </div>

          {/* Column 4: Newsletter */}
          <div>
            <h4 className="text-white text-xs font-bold tracking-[0.3em] uppercase mb-10">{t('footer.newsletter')}</h4>
            <p className="text-white/40 text-sm mb-6">{t('footer.newsletterDesc')}</p>
            <form onSubmit={handleNewsletterSubmit} className="relative group">
              <input 
                type="email" 
                required 
                value={newsletterEmail} 
                onChange={(e) => setNewsletterEmail(e.target.value)} 
                placeholder={t('checkout.emailOptional')} 
                className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-4 text-white focus:outline-none focus:border-gold-400/50 transition-all placeholder:text-white/10" 
              />
              <button type="submit" disabled={isSubmitting} className="absolute right-2 top-2 bottom-2 bg-gold-400 text-brand-950 px-4 rounded-lg hover:bg-white transition-colors disabled:opacity-50">
                {newsletterSuccess ? <Check size={18} /> : <ArrowRight size={18} />}
              </button>
            </form>
            {newsletterSuccess && (
              <p className="text-gold-400 text-[10px] mt-4 font-bold tracking-widest uppercase">
                {t('footer.thanks')}
              </p>
            )}
          </div>
        </div>

        <div className="pt-12 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-white/20 text-xs font-medium uppercase tracking-[0.2em]">
            © {new Date().getFullYear()} KALE GROUP. {t('footer.rights')}
          </p>
          <div className="flex gap-8">
            <a href="#" className="text-white/20 hover:text-white/40 text-[10px] font-bold uppercase tracking-widest transition-colors">{t('footer.privacy')}</a>
            <a href="#" className="text-white/20 hover:text-white/40 text-[10px] font-bold uppercase tracking-widest transition-colors">{t('footer.terms')}</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
