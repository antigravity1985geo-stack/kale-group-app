import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Menu, X, ShoppingBag, Heart, Facebook, Instagram, Search } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';
import { useTranslation } from 'react-i18next';
import SearchModal from '../ui/SearchModal';

const TikTokIcon = ({ size = 24, className = "" }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
  </svg>
);

const LANGUAGES = [
  { code: 'ka', label: 'ქარ', flag: '🇬🇪' },
  { code: 'en', label: 'ENG', flag: '🇺🇸' },
  { code: 'ru', label: 'РУС', flag: '🇷🇺' },
];

export default function Header({ onOpenWishlist }: { onOpenWishlist: () => void }) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const { totalItems, setIsCartOpen } = useCart();
  const { wishlist } = useWishlist();
  const location = useLocation();
  const { t, i18n } = useTranslation();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const switchLang = (code: string) => {
    i18n.changeLanguage(code);
    localStorage.setItem('kalegroup-lang', code);
  };

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (location.pathname === '/admin') return null;

  const navLinks = [
    { name: t('nav.home'), href: '/' },
    { name: t('nav.products'), href: '/#products' },
    { name: t('nav.aiDesign'), href: '/#ai-generator' },
    { name: t('nav.contact'), href: '/#contact' },
  ];

  const socialLinks = [
    { icon: <Facebook size={20} />, href: "https://www.facebook.com/lasha.dolidze.1884", color: "hover:text-blue-600" },
    { icon: <Instagram size={20} />, href: "#", color: "hover:text-pink-600" },
    { icon: <TikTokIcon size={20} />, href: "#", color: "hover:text-black" },
  ];


  return (
    <>
      <nav
        className={`fixed w-full z-50 transition-all duration-500 ${
          isScrolled ? 'bg-white/80 backdrop-blur-xl shadow-lg border-b border-brand-100 py-3' : 'bg-transparent py-6'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <Link to="/" className="text-2xl font-serif font-bold tracking-tight text-brand-900 flex items-center gap-2 group">
            <div className="w-8 h-8 bg-brand-900 rounded-lg flex items-center justify-center group-hover:rotate-12 transition-transform">
              <div className="w-4 h-4 border-2 border-white rotate-45" />
            </div>
            <span>KALE<span className="text-brand-500 font-light">GROUP</span></span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center space-x-8 lg:space-x-10">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                className="text-xs font-semibold tracking-[0.2em] uppercase text-brand-900/70 hover:text-brand-900 transition-all relative group"
              >
                {link.name}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-brand-900 transition-all group-hover:w-full" />
              </a>
            ))}

            {/* Language Switcher */}
            <div className="flex items-center gap-1 bg-brand-50 rounded-full px-1 py-1 border border-brand-100">
              {LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => switchLang(lang.code)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase transition-all duration-200 ${
                    i18n.language === lang.code
                      ? 'bg-brand-900 text-gold-400 shadow-sm'
                      : 'text-brand-400 hover:text-brand-800'
                  }`}
                >
                  <span>{lang.flag}</span>
                  <span>{lang.label}</span>
                </button>
              ))}
            </div>

            
            <div className="flex items-center gap-4">
              {/* Social Icons Desktop */}
              <div className="flex items-center gap-3 border-r border-brand-100 pr-4 mr-2">
                {socialLinks.map((social, idx) => (
                  <a 
                    key={idx} 
                    href={social.href} 
                    className={`text-brand-400 transition-all duration-300 hover:scale-110 ${social.color}`}
                    target="_blank" 
                    rel="noopener noreferrer"
                  >
                    {social.icon}
                  </a>
                ))}
              </div>

              {/* Search Button */}
              <button
                onClick={() => setIsSearchOpen(true)}
                className="p-2 text-brand-900 hover:text-brand-600 transition-colors"
                title={`${t('search.title', 'ძიება')} (Ctrl+K)`}
              >
                <Search size={22} />
              </button>

              <button 
                onClick={onOpenWishlist}
                className="relative p-2 text-brand-900 hover:text-red-500 transition-colors"
              >
                <Heart size={22} className={wishlist.length > 0 ? 'fill-red-500 text-red-500' : ''} />
                {wishlist.length > 0 && (
                  <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center -translate-y-1 translate-x-1">
                    {wishlist.length}
                  </span>
                )}
              </button>

              <button 
                onClick={() => setIsCartOpen(true)}
                className="relative p-2 text-brand-900 hover:text-brand-600 transition-colors"
              >
                <ShoppingBag size={24} />
                {totalItems > 0 && (
                  <span className="absolute top-0 right-0 w-5 h-5 bg-gold-400 text-white text-[10px] font-bold rounded-full flex items-center justify-center -translate-y-1 translate-x-1">
                    {totalItems}
                  </span>
                )}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 md:hidden">
            <button 
              onClick={() => setIsSearchOpen(true)}
              className="p-2 text-brand-900"
            >
              <Search size={22} />
            </button>
            <button 
              onClick={onOpenWishlist}
              className="relative p-2 text-brand-900"
            >
              <Heart size={22} className={wishlist.length > 0 ? 'fill-red-500 text-red-500' : ''} />
            </button>
            <button 
              onClick={() => setIsCartOpen(true)}
              className="relative p-2 text-brand-900"
            >
              <ShoppingBag size={24} />
              {totalItems > 0 && (
                <span className="absolute top-0 right-0 w-5 h-5 bg-gold-400 text-white text-[10px] font-bold rounded-full flex items-center justify-center -translate-y-1 translate-x-1">
                  {totalItems}
                </span>
              )}
            </button>
            <button className="text-brand-900 p-2" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            className="fixed inset-0 z-40 bg-white pt-24 px-8 md:hidden overflow-y-auto"
          >
            <div className="flex flex-col space-y-8 pb-12">
              {/* Mobile Language Switcher */}
              <div className="flex items-center justify-center gap-2 bg-brand-50 rounded-2xl p-2 border border-brand-100">
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => {
                      switchLang(lang.code);
                      setMobileMenuOpen(false);
                    }}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold tracking-widest uppercase transition-all duration-200 ${
                      i18n.language === lang.code
                        ? 'bg-brand-900 text-gold-400 shadow-md'
                        : 'text-brand-400 hover:text-brand-800'
                    }`}
                  >
                    <span>{lang.flag}</span>
                    <span>{lang.label}</span>
                  </button>
                ))}
              </div>

              {navLinks.map((link) => (
                <a
                  key={link.name}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-4xl font-serif font-medium text-brand-900 border-b border-brand-100 pb-2"
                >
                  {link.name}
                </a>
              ))}
              
              {/* Social Icons Mobile */}
              <div className="flex items-center justify-center gap-8 pt-8">
                {socialLinks.map((social, idx) => (
                  <a 
                    key={idx} 
                    href={social.href} 
                    className="text-brand-900 p-4 bg-brand-50 rounded-2xl active:scale-95 transition-transform"
                    target="_blank" 
                    rel="noopener noreferrer"
                  >
                    {React.cloneElement(social.icon as React.ReactElement<any>, { size: 28 })}
                  </a>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <SearchModal 
        isOpen={isSearchOpen} 
        onClose={() => setIsSearchOpen(false)} 
      />
    </>
  );
}
