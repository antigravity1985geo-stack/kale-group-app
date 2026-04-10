import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { MessageSquare, Phone, Clock, CheckCheck, RefreshCw, Loader2, Inbox } from 'lucide-react';

interface ContactMessage {
  id: string;
  name: string;
  phone: string;
  message: string;
  read: boolean;
  created_at: string;
}

export default function ContactMessages() {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');

  useEffect(() => { fetchMessages(); }, []);

  const fetchMessages = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('contact_messages')
      .select('*')
      .order('created_at', { ascending: false });
    setMessages(data || []);
    setLoading(false);
  };

  const markRead = async (id: string, current: boolean) => {
    await supabase.from('contact_messages').update({ read: !current }).eq('id', id);
    setMessages(prev => prev.map(m => m.id === id ? { ...m, read: !current } : m));
  };

  const filtered = messages.filter(m =>
    filter === 'all' ? true : filter === 'unread' ? !m.read : m.read
  );

  const unreadCount = messages.filter(m => !m.read).length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-violet-100 rounded-xl flex items-center justify-center">
            <MessageSquare size={20} className="text-violet-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">კონტაქტ-შეტყობინებები</h2>
            {unreadCount > 0 && (
              <p className="text-xs text-violet-600 font-semibold">{unreadCount} წაუკითხავი</p>
            )}
          </div>
        </div>
        <button onClick={fetchMessages}
          className="p-2.5 bg-slate-100 rounded-xl hover:bg-slate-200 transition border-none cursor-pointer text-slate-500">
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {(['all', 'unread', 'read'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all border-none cursor-pointer ${filter === f ? 'bg-white text-slate-800 shadow-sm' : 'bg-transparent text-slate-500 hover:text-slate-700'}`}>
            {f === 'all' ? `ყველა (${messages.length})` : f === 'unread' ? `წაუკითხავი (${unreadCount})` : `წაკითხული (${messages.length - unreadCount})`}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="animate-spin text-slate-400" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
          <Inbox size={48} className="mx-auto mb-4 text-slate-300" />
          <p className="text-slate-500 font-semibold">შეტყობინება არ მოძებნეს</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(msg => (
            <div key={msg.id}
              className={`bg-white rounded-2xl p-5 border shadow-sm hover:shadow-md transition-all ${!msg.read ? 'border-violet-200 border-l-4 border-l-violet-400' : 'border-slate-100'}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-bold text-slate-800 text-sm">{msg.name}</span>
                    {!msg.read && (
                      <span className="text-[9px] font-bold bg-violet-100 text-violet-600 px-1.5 py-0.5 rounded-full uppercase tracking-widest">
                        ახალი
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-400 mb-3">
                    <span className="flex items-center gap-1"><Phone size={11} />{msg.phone}</span>
                    <span className="flex items-center gap-1">
                      <Clock size={11} />
                      {new Date(msg.created_at).toLocaleDateString('ka-GE', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 rounded-xl p-3">{msg.message}</p>
                </div>
                <button
                  onClick={() => markRead(msg.id, msg.read)}
                  title={msg.read ? 'წაუკითხავად მონიშვნა' : 'წაკითხულად მონიშვნა'}
                  className={`p-2.5 rounded-xl flex-shrink-0 border-none cursor-pointer transition ${msg.read ? 'bg-slate-100 text-slate-400 hover:bg-slate-200' : 'bg-violet-100 text-violet-600 hover:bg-violet-600 hover:text-white'}`}>
                  <CheckCheck size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
