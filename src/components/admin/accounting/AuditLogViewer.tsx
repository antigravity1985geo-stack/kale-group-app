import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { ShieldAlert, Search, RefreshCw, Loader2, Database, FileDiff } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';

export default function AuditLogViewer() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [tableFilter, setTableFilter] = useState<string>('all');
  const { isAdmin } = useAuth();

  useEffect(() => {
    if (isAdmin) {
      fetchLogs();
    }
  }, [tableFilter, isAdmin]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('audit_log')
        .select(`
          *,
          changed_by_user:changed_by (email, full_name)
        `)
        .order('changed_at', { ascending: false })
        .limit(100);

      if (tableFilter !== 'all') {
        query = query.eq('table_name', tableFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      if (data) setLogs(data);
    } catch (error) {
      console.error("Error fetching audit logs:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center border border-red-500/20 bg-red-500/5 rounded-2xl">
        <ShieldAlert size={48} className="text-red-500 mb-4" />
        <h3 className="text-xl font-bold text-red-400 mb-2">წვდომა შეზღუდულია</h3>
        <p className="text-slate-500 max-w-md">
          აუდიტის ჟურნალის ნახვის უფლება აქვთ მხოლოდ სისტემის ადმინისტრატორებს.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-2xl font-serif text-slate-800 flex items-center gap-3">
            <ShieldAlert className="text-amber-500" />
            სისტემური აუდიტი
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            ყველა მნიშვნელოვანი სისტემური ცვლილების ჟურნალი (Insert, Update, Delete)
          </p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex justify-between items-center bg-white shadow-sm/50 p-4 rounded-xl border border-slate-200">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-slate-500">
            <Database size={16} />
            <select
              value={tableFilter}
              onChange={(e) => setTableFilter(e.target.value)}
              className="bg-white shadow-sm border border-slate-300 rounded-lg px-3 py-1.5 text-sm text-slate-800 focus:border-amber-500 transition-all outline-none"
            >
              <option value="all">ყველა ცხრილი</option>
              <option value="journal_entries">ჟურნალები</option>
              <option value="invoices">ინვოისები</option>
              <option value="vat_declarations">დღგ-ს დეკლარაციები</option>
              <option value="payroll_runs">ხელფასები</option>
            </select>
          </div>
        </div>
        
        <button onClick={fetchLogs} className="px-3 py-2 bg-stone-800 hover:bg-stone-700 text-slate-800 rounded-lg transition-colors border-none cursor-pointer outline-none flex items-center justify-center">
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Content Area */}
      <div className="bg-white shadow-sm rounded-xl border border-slate-200 overflow-hidden min-h-[400px]">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 text-amber-500">
            <Loader2 size={32} className="animate-spin mb-4" />
            <p className="text-sm font-bold tracking-widest uppercase text-slate-500">ჟურნალი იტვირთება...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                <tr>
                  <th className="px-6 py-4 font-semibold text-slate-600">დრო</th>
                  <th className="px-6 py-4 font-semibold text-slate-600">USER</th>
                  <th className="px-6 py-4 font-semibold text-slate-600">ACTION</th>
                  <th className="px-6 py-4 font-semibold text-slate-600">TABLE</th>
                  <th className="px-6 py-4 font-semibold text-slate-600">RECORD ID</th>
                  <th className="px-6 py-4 font-semibold text-slate-600 text-right">DETAILS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {logs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-100/50/50 transition-colors">
                    <td className="px-6 py-4 text-slate-600">
                      {new Date(log.changed_at).toLocaleString('ka-GE')}
                    </td>
                    <td className="px-6 py-4">
                      {log.changed_by_user ? (
                        <div className="flex flex-col">
                          <span className="text-slate-800 font-medium">{log.changed_by_user.full_name}</span>
                          <span className="text-[10px] text-slate-400">{log.changed_by_user.email}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 font-mono text-[10px]">SYSTEM</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-[10px] uppercase font-bold rounded ${
                         log.action === 'INSERT' ? 'bg-emerald-500/10 text-emerald-400' :
                         log.action === 'UPDATE' ? 'bg-blue-500/10 text-blue-400' :
                         'bg-red-500/10 text-red-400'
                       }`}>
                         {log.action}
                       </span>
                    </td>
                    <td className="px-6 py-4 font-mono text-slate-500 text-xs">{log.table_name}</td>
                    <td className="px-6 py-4 font-mono text-slate-500 text-xs text-ellipsis overflow-hidden max-w-[100px]" title={log.record_id}>
                      {log.record_id?.slice(0,8)}...
                    </td>
                    <td className="px-6 py-4 text-right">
                       <button 
                         className="p-2 text-slate-500 hover:text-slate-800 bg-stone-800 hover:bg-stone-700 rounded-lg transition-colors border-none cursor-pointer outline-none inline-flex items-center gap-2 text-xs"
                         onClick={() => alert(JSON.stringify({old: log.old_data, new: log.new_data}, null, 2))}
                       >
                         <FileDiff size={14} /> Diffs
                       </button>
                    </td>
                  </tr>
                ))}
                {logs.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                      ამ პარამეტრებით ჩანაწერები ვერ მოიძებნა
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
