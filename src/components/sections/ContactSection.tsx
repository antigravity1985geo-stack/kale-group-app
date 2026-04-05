import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Phone, Mail, MapPin, Check, Send, RefreshCw } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useTranslation } from 'react-i18next';


export default function ContactSection() {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({ name: '', phone: '', message: '' });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const { error } = await supabase.from('contact_messages').insert([{
        name: formData.name,
        phone: formData.phone,
        message: formData.message
      }]);

      if (error) throw error;

      setSubmitSuccess(true);
      setFormData({ name: '', phone: '', message: '' });
      setTimeout(() => setSubmitSuccess(false), 5000);
    } catch (err) {
      console.error('Error submitting form', err);
      // Fallback or alert user could be added here
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  return (
    <section id="contact" className="py-32 relative bg-brand-950 overflow-hidden">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="flex flex-col lg:flex-row gap-20">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="lg:w-2/5">
            <p className="text-xs tracking-[0.4em] uppercase font-bold mb-4" style={{color:'#c9a227'}}>{t('contact.badge')} | Contact</p>
            <h2 className="text-4xl md:text-5xl font-serif text-white mb-8">{t('contact.title')}</h2>
            <div className="space-y-10 group/list">
              {[ 
                { icon: <Phone />, title: t('contact.phoneLabel'), value: '+995 555 12 34 56' }, 
                { icon: <Mail />, title: t('contact.emailLabel'), value: 'info@kalegroup.ge' }, 
                { icon: <MapPin />, title: t('contact.addressLabel'), value: t('contact.addressValue') } 
              ].map((c, i) => (
                <div key={i} className="flex gap-6 items-center group transition-transform hover:translate-x-2">
                  <div className="w-14 h-14 rounded-2xl glass-dark flex items-center justify-center text-gold-400 border border-white/10 group-hover:border-gold-400/50 transition-colors">
                    {React.cloneElement(c.icon as React.ReactElement<any>, { size: 22 })}
                  </div>
                  <div>
                    <p className="text-[10px] font-bold tracking-widest text-white/40 uppercase mb-1">{c.title}</p>
                    <p className="text-lg text-white/90">{c.value}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-16 p-8 rounded-2xl glass-dark border border-white/5 relative overflow-hidden group">
              <div className="relative z-10">
                <p className="text-white font-serif text-xl mb-2">{t('contact.visitShowroom')}</p>
                <p className="text-white/50 text-sm mb-6 leading-relaxed">{t('contact.showroomDesc')}</p>
                <div className="aspect-[21/9] rounded-xl bg-brand-900 border border-white/10 flex items-center justify-center overflow-hidden grayscale hover:grayscale-0 transition-all duration-700 relative">
                  {/* Using generic abstract location image, you can replace with map image if available */}
                  <img 
                    src="https://images.unsplash.com/photo-1524758631624-e2822e304c36?q=80&w=600" 
                    className="w-full h-full object-cover opacity-50" 
                    alt="Kale Group Showroom Location Tbilisi - შოურუმი თბილისში" 
                  />
                  <span className="absolute px-4 py-2 glass text-[10px] font-bold tracking-widest text-white uppercase">{t('contact.viewOnMap')}</span>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} className="lg:w-3/5">
            <div className="glass-dark p-10 md:p-16 rounded-[2.5rem] border border-white/10 relative shadow-2xl">
              {submitSuccess ? (
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="w-24 h-24 bg-gold-400 rounded-full flex items-center justify-center mb-8 shadow-lg shadow-gold-400/20">
                    <Check size={40} className="text-brand-950" />
                  </div>
                  <h3 className="text-3xl font-serif text-white mb-4">{t('contact.successMsgTitle')}</h3>
                  <p className="text-white/60 mb-10 text-lg">{t('contact.successMsgBody')}</p>
                  <button onClick={() => setSubmitSuccess(false)} className="text-gold-400 font-bold tracking-widest uppercase text-xs hover:underline">{t('contact.newForm')}</button>
                </motion.div>
              ) : (
                <>
                  <h3 className="text-3xl font-serif text-white mb-10">{t('contact.writeUs')}</h3>
                  <form onSubmit={handleFormSubmit} className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold tracking-[0.2em] text-white/50 uppercase">{t('contact.nameLabel')}</label>
                        <input type="text" id="name" required value={formData.name} onChange={handleInputChange} className="w-full bg-transparent border-b border-white/10 py-4 text-white focus:outline-none focus:border-gold-400 transition-all placeholder:text-white/10" placeholder={t('contact.namePlaceholder')} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold tracking-[0.2em] text-white/50 uppercase">{t('contact.phoneLabel')}</label>
                        <input type="tel" id="phone" required value={formData.phone} onChange={handleInputChange} className="w-full bg-transparent border-b border-white/10 py-4 text-white focus:outline-none focus:border-gold-400 transition-all placeholder:text-white/10" placeholder={t('contact.phonePlaceholder')} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold tracking-[0.2em] text-white/50 uppercase">{t('contact.ideaLabel')}</label>
                      <textarea id="message" rows={4} required value={formData.message} onChange={handleInputChange} className="w-full bg-transparent border-b border-white/10 py-4 text-white focus:outline-none focus:border-gold-400 transition-all placeholder:text-white/10 resize-none" placeholder={t('contact.messagePlaceholder')} />
                    </div>
                    <button type="submit" disabled={isSubmitting} className="w-full py-6 bg-white text-brand-950 font-bold tracking-[0.3em] uppercase rounded-xl hover:bg-gold-400 hover:text-brand-950 transition-all duration-500 shadow-xl flex items-center justify-center gap-4 text-xs group">
                      {isSubmitting ? <RefreshCw className="animate-spin" /> : <><Send size={16} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" /> {t('contact.btnSend')}</>}
                    </button>
                  </form>
                </>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
