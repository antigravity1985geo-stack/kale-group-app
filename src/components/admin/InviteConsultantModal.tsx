import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Send, Loader2, UserPlus, Mail, CheckCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface InviteConsultantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInviteSent: () => void;
}

export default function InviteConsultantModal({ isOpen, onClose, onInviteSent }: InviteConsultantModalProps) {
  const [email, setEmail] = useState('');
  const [selectedRole, setSelectedRole] = useState<'consultant' | 'accountant'>('consultant');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      // Get session token for server-side auth verification
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('სესია ვერ მოიძებნა. გთხოვთ, თავიდან შედით.');
      }

      const response = await fetch('/api/admin/invite', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ email, role: selectedRole }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'მოწვევა ვერ გაიგზავნა');
      }

      setSuccess(true);
      onInviteSent();
      
      setTimeout(() => {
        setEmail('');
        setSelectedRole('consultant');
        setSuccess(false);
        onClose();
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'დაფიქსირდა შეცდომა');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setEmail('');
      setSelectedRole('consultant');
      setError('');
      setSuccess(false);
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-950/60 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden"
          >
            {/* Header */}
            <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-brand-900 to-brand-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gold-400/20 flex items-center justify-center">
                  <UserPlus size={20} className="text-admin-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-sans font-bold text-white">თანამშრომლის მოწვევა</h3>
                  <p className="text-[10px] text-brand-300 tracking-widest uppercase">ელ. ფოსტით მოწვევა</p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="text-brand-300 hover:text-white p-2 rounded-full transition-colors outline-none cursor-pointer bg-transparent border-none hover:bg-white/10"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="p-8">
              {success ? (
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="flex flex-col items-center justify-center py-8 text-center"
                >
                  <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
                    <CheckCircle size={32} className="text-green-500" />
                  </div>
                  <h4 className="text-xl font-sans font-bold text-admin-text mb-2">მოწვევა გაიგზავნა!</h4>
                  <p className="text-sm text-admin-muted">
                    {selectedRole === 'consultant' ? 'კონსულტანტი' : 'ბუღალტერი'} მიიღებს ემეილს რეგისტრაციის ბმულით
                  </p>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit} className="admin-fade-in space-y-6">
                  <div>
                    <label className="block text-xs font-bold text-admin-muted tracking-widest uppercase mb-2">
                      ელ. ფოსტა
                    </label>
                    <div className="relative">
                      <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => { setEmail(e.target.value); setError(''); }}
                        placeholder="consultant@example.com"
                        className="w-full pl-12 pr-4 py-4 bg-admin-bg text-admin-muted rounded-2xl hover:bg-white hover:text-admin-primary transition-all shadow-sm text-sm focus:outline-none focus:border-gold-400 focus:bg-white focus:ring-4 focus:ring-gold-400/10 transition-all"
                      />
                    </div>
                  </div>

                  {/* Role Selector */}
                  <div>
                    <label className="block text-xs font-bold text-admin-muted tracking-widest uppercase mb-2">
                      როლი
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setSelectedRole('consultant')}
                        className={`p-4 rounded-xl border-2 text-center transition-all cursor-pointer outline-none ${
                          selectedRole === 'consultant'
                            ? 'border-blue-400 bg-blue-50 text-blue-700'
                            : 'border-gray-200 bg-gray-50 text-admin-muted hover:border-gray-300'
                        }`}
                      >
                        <p className="text-sm font-bold">🛋️ კონსულტანტი</p>
                        <p className="text-[10px] mt-1 opacity-70">პროდუქციის მართვა</p>
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedRole('accountant')}
                        className={`p-4 rounded-xl border-2 text-center transition-all cursor-pointer outline-none ${
                          selectedRole === 'accountant'
                            ? 'border-emerald-400 bg-emerald-50 text-emerald-700'
                            : 'border-gray-200 bg-gray-50 text-admin-muted hover:border-gray-300'
                        }`}
                      >
                        <p className="text-sm font-bold">📊 ბუღალტერი</p>
                        <p className="text-[10px] mt-1 opacity-70">ბუღალტერია & RS.ge</p>
                      </button>
                    </div>
                  </div>

                  <div className="bg-admin-bg/50 p-4 rounded-xl border border-brand-100/50">
                    <p className="text-xs text-brand-600 leading-relaxed">
                      <span className="font-bold">ℹ️ როგორ მუშაობს:</span> მითითებულ ემეილზე გაიგზავნება 
                      მოწვევის ბმული. {selectedRole === 'consultant' ? 'კონსულტანტი' : 'ბუღალტერი'} დაარეგისტრირდება და ავტომატურად მიენიჭება 
                      <span className="font-bold text-admin-text"> „{selectedRole === 'consultant' ? 'კონსულტანტის' : 'ბუღალტერის'}"</span> როლი.
                    </p>
                  </div>

                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 font-medium"
                    >
                      ⚠️ {error}
                    </motion.div>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmitting || !email}
                    className="w-full py-4 bg-admin-primary text-white rounded-2xl hover:bg-admin-primary-hover shadow-lg shadow-admin-primary/20 transition-all uppercase tracking-widest font-bold text-sm hover:bg-brand-950 shadow-xl shadow-brand-900/20 disabled:opacity-60 disabled:cursor-not-allowed transition-all hover:-translate-y-0.5 outline-none border-none cursor-pointer flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        იგზავნება...
                      </>
                    ) : (
                      <>
                        <Send size={16} />
                        მოწვევის გაგზავნა
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
