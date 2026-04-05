import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { UserPlus, Users, Clock, CheckCircle, XCircle, Loader2, Mail, Shield, Trash2, Calculator } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Profile } from '../../context/AuthContext';

interface Invitation {
  id: string;
  email: string;
  role: string;
  status: 'pending' | 'accepted' | 'expired';
  created_at: string;
  expires_at: string;
  invited_by: string;
}

interface ConsultantsListProps {
  onInviteClick: () => void;
}

export default function ConsultantsList({ onInviteClick }: ConsultantsListProps) {
  const [consultants, setConsultants] = useState<Profile[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [profilesRes, invitationsRes] = await Promise.all([
        supabase.from('profiles').select('*').in('role', ['consultant', 'admin', 'accountant']).order('created_at', { ascending: false }),
        supabase.from('invitations').select('*').order('created_at', { ascending: false }),
      ]);

      if (profilesRes.data) setConsultants(profilesRes.data as Profile[]);
      if (invitationsRes.data) setInvitations(invitationsRes.data as Invitation[]);
    } catch (err) {
      console.error('Error fetching team data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDeleteInvitation = async (id: string) => {
    if (!confirm('ნამდვილად გსურთ მოწვევის წაშლა?')) return;
    const { error } = await supabase.from('invitations').delete().eq('id', id);
    if (error) {
      alert('შეცდომა: ' + error.message);
    } else {
      await fetchData();
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-600 border border-amber-200">
            <Clock size={12} /> მოლოდინში
          </span>
        );
      case 'accepted':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-green-50 text-green-600 border border-green-200">
            <CheckCircle size={12} /> მიღებული
          </span>
        );
      case 'expired':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-red-50 text-red-500 border border-red-200">
            <XCircle size={12} /> ვადაგასული
          </span>
        );
      default:
        return null;
    }
  };

  const getRoleBadge = (role: string) => {
    if (role === 'admin') {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-brand-900 text-gold-400">
          <Shield size={11} /> ადმინი
        </span>
      );
    }
    if (role === 'accountant') {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-600 border border-emerald-200">
          <Calculator size={11} /> ბუღალტერი
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-600 border border-blue-200">
        <Users size={11} /> კონსულტანტი
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-32">
        <Loader2 className="w-12 h-12 animate-spin text-gold-400 mb-4" />
        <p className="text-brand-400 text-sm tracking-widest uppercase font-semibold">იტვირთება...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Active Team Members */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-900 flex items-center justify-center">
              <Users size={20} className="text-gold-400" />
            </div>
            <div>
              <h3 className="text-lg font-serif text-brand-900">გუნდის წევრები</h3>
              <p className="text-xs text-brand-400">{consultants.length} აქტიური წევრი</p>
            </div>
          </div>
          <button
            onClick={onInviteClick}
            className="flex items-center gap-2 px-5 py-3 bg-brand-900 text-gold-400 rounded-xl hover:bg-brand-950 transition-all font-bold tracking-wider text-xs uppercase shadow-lg shadow-brand-900/20 outline-none border-none cursor-pointer"
          >
            <UserPlus size={16} /> მოწვევა
          </button>
        </div>

        <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100 text-[11px] text-brand-400 uppercase tracking-widest">
                <th className="px-6 py-5 font-bold">მომხმარებელი</th>
                <th className="px-6 py-5 font-bold">ელ. ფოსტა</th>
                <th className="px-6 py-5 font-bold">როლი</th>
                <th className="px-6 py-5 font-bold">თარიღი</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {consultants.map((member, idx) => (
                <motion.tr
                  key={member.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="hover:bg-brand-50/30 transition-colors"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-200 to-brand-300 flex items-center justify-center text-brand-700 font-bold text-sm uppercase">
                        {member.full_name ? member.full_name.charAt(0) : member.email.charAt(0)}
                      </div>
                      <p className="font-semibold text-brand-900 text-sm">
                        {member.full_name || 'სახელი არ არის'}
                      </p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-brand-500">{member.email}</td>
                  <td className="px-6 py-4">{getRoleBadge(member.role)}</td>
                  <td className="px-6 py-4 text-xs text-brand-400">
                    {new Date(member.created_at).toLocaleDateString('ka-GE')}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
          {consultants.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <Users size={48} className="mb-3 opacity-20" />
              <p className="text-lg font-serif text-brand-800">გუნდის წევრები ვერ მოიძებნა</p>
            </div>
          )}
        </div>
      </div>

      {/* Pending Invitations */}
      {invitations.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
              <Mail size={20} className="text-amber-500" />
            </div>
            <div>
              <h3 className="text-lg font-serif text-brand-900">გაგზავნილი მოწვევები</h3>
              <p className="text-xs text-brand-400">{invitations.filter(i => i.status === 'pending').length} მოლოდინში</p>
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100 text-[11px] text-brand-400 uppercase tracking-widest">
                  <th className="px-6 py-5 font-bold">ელ. ფოსტა</th>
                  <th className="px-6 py-5 font-bold">როლი</th>
                  <th className="px-6 py-5 font-bold">სტატუსი</th>
                  <th className="px-6 py-5 font-bold">გაგზავნის თარიღი</th>
                  <th className="px-6 py-5 font-bold">ვადა</th>
                  <th className="px-6 py-5 font-bold text-right">მოქმედება</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {invitations.map((inv, idx) => (
                  <motion.tr
                    key={inv.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="hover:bg-brand-50/30 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Mail size={14} className="text-brand-300" />
                        <span className="text-sm font-medium text-brand-900">{inv.email}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">{getRoleBadge(inv.role)}</td>
                    <td className="px-6 py-4">{getStatusBadge(inv.status)}</td>
                    <td className="px-6 py-4 text-xs text-brand-400">
                      {new Date(inv.created_at).toLocaleDateString('ka-GE')}
                    </td>
                    <td className="px-6 py-4 text-xs text-brand-400">
                      {new Date(inv.expires_at).toLocaleDateString('ka-GE')}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {inv.status === 'pending' && (
                        <button
                          onClick={() => handleDeleteInvitation(inv.id)}
                          className="inline-flex p-2.5 text-red-500 bg-red-50 rounded-xl hover:bg-red-500 hover:text-white transition-all shadow-none outline-none border-none cursor-pointer"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
