import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, Send, Command, Loader2, Minimize2, Maximize2, ShieldAlert } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useAuth } from '@/src/context/AuthContext';
import { supabase } from '@/src/lib/supabase';

export function AdminAIChatbot() {
  const { isAuthorized, user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'model', text: string }[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Initial greeting
    setMessages([{ role: 'model', text: "გამარჯობა! მე ვარ თქვენი შიდა AI ასისტენტი. რით შემიძლია დაგეხმაროთ დღეს?" }]);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen, isLoading]);

  if (!isAuthorized || !user) return null; // Only show if logged into Admin Panel

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const userMsg = inputValue;
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setInputValue('');
    setIsLoading(true);

    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      
      const history = messages.map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
      }));

      const res = await fetch('/api/ai/admin-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ userMessage: userMsg, history })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setMessages(prev => [...prev, { role: 'model', text: data.text }]);
    } catch (err: any) {
      setMessages(prev => [...prev, { role: 'model', text: 'შეცდომა: ' + err.message }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[9999] font-sans">
      <AnimatePresence>
        {isOpen && !isMinimized && (
          <motion.div 
            initial={{ opacity: 0, y: 20, scale: 0.95, transformOrigin: 'bottom right' }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="mb-4 w-[calc(100vw-2rem)] sm:w-[480px] h-[600px] bg-brand-950/95 backdrop-blur-xl border border-white/5 rounded-3xl shadow-2xl flex flex-col overflow-hidden ring-1 ring-gold-500/20"
          >
            {/* Header */}
            <div className="p-5 border-b border-white/5 bg-gradient-to-r from-brand-950 to-brand-900 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-b from-gold-400 to-gold-600 flex items-center justify-center text-brand-950 shadow-lg shadow-gold-500/20">
                  <Command size={20} />
                </div>
                <div>
                  <h3 className="text-white font-bold text-sm tracking-widest uppercase">Admin Intelligence</h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <ShieldAlert size={10} className="text-emerald-400" />
                    <span className="text-[10px] text-emerald-400 uppercase tracking-widest font-medium">Secure Line</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setIsMinimized(true)} className="p-2 hover:bg-white/5 rounded-lg text-white/40 hover:text-white transition-colors">
                  <Minimize2 size={16} />
                </button>
                <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-white/5 rounded-lg text-white/40 hover:text-red-400 transition-colors">
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-6 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full">
              {messages.map((m, i) => (
                <motion.div 
                  key={i} 
                  initial={{ opacity: 0, x: m.role === 'user' ? 20 : -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[85%] p-4 text-sm leading-relaxed ${
                    m.role === 'user' 
                    ? 'bg-gradient-to-br from-gold-400 to-gold-500 text-brand-950 font-medium rounded-2xl rounded-tr-sm shadow-md' 
                    : 'bg-white/5 text-white/90 border border-white/5 rounded-2xl rounded-tl-sm'
                  }`}>
                    {m.role === 'model' ? (
                      <div className="prose prose-invert prose-sm max-w-none prose-p:leading-relaxed prose-th:px-3 prose-th:py-2 prose-th:bg-brand-900 prose-th:border-gold-500/20 prose-td:px-3 prose-td:py-2 prose-td:border-white/10 prose-table:border prose-table:border-white/10 prose-table:rounded-lg prose-table:overflow-hidden">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {m.text}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <p>{m.text}</p>
                    )}
                  </div>
                </motion.div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white/5 p-4 rounded-2xl rounded-tl-sm border border-white/5">
                    <Loader2 className="w-5 h-5 text-gold-400 animate-spin" />
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <form onSubmit={handleSendMessage} className="p-5 bg-brand-950 border-t border-white/5">
              <div className="relative group">
                <input 
                  type="text" 
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Ask for stats, reports, or advice..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-4 pr-12 text-white text-sm focus:outline-none focus:border-gold-500/50 transition-all placeholder:text-white/20"
                />
                <button 
                  type="submit" 
                  disabled={!inputValue.trim() || isLoading}
                  className="absolute right-1.5 top-1.5 bottom-1.5 w-9 bg-gold-500/20 hover:bg-gold-500/40 rounded-lg flex items-center justify-center text-gold-400 transition-all disabled:opacity-30"
                >
                  <Send size={16} />
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Trigger Button */}
      <motion.button 
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => {
          setIsOpen(true);
          setIsMinimized(false);
        }}
        className={`w-14 h-14 rounded-full flex items-center justify-center shadow-2xl shadow-gold-500/20 transition-all duration-500 border border-gold-500/30 ${
          isOpen && !isMinimized ? 'bg-gold-400 text-brand-950 -rotate-90 opacity-0 pointer-events-none' : 'bg-brand-950 text-gold-400 backdrop-blur-md'
        }`}
      >
        <MessageSquare className="w-6 h-6" />
      </motion.button>

      {/* Minimized Bubble */}
      {isMinimized && isOpen && (
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          onClick={() => setIsMinimized(false)}
          className="w-14 h-14 rounded-full bg-gradient-to-r from-gold-400 to-gold-500 text-brand-950 flex items-center justify-center shadow-2xl hover:scale-105 transition-transform"
        >
          <Maximize2 size={24} />
        </motion.button>
      )}
    </div>
  );
}
