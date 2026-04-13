import React, { useState, useEffect, useCallback } from 'react';
import { Search, FileText, CheckCircle, Clock, XCircle, Send, RefreshCcw, UploadCloud } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { autoCreateAndSendEInvoice, syncInvoiceStatus } from '../../../services/rsge/rsge.service';

const GEL = (v: number | string) => Number(v).toLocaleString('ka-GE', { minimumFractionDigits: 2 }) + ' ₾';

const STATUS_CFG: Record<string, { label: string; cls: string; icon: any }> = {
  PENDING:   { label: 'მოლოდინი',  cls: 'bg-amber-50 text-amber-600 border-amber-100',   icon: Clock },
  PAID:      { label: 'გადახდილი', cls: 'bg-emerald-50 text-emerald-600 border-emerald-100', icon: CheckCircle },
  PARTIAL:   { label: 'ნაწილობ.',  cls: 'bg-indigo-50 text-admin-primary border-indigo-100',       icon: Clock },
  OVERDUE:   { label: 'ვადა გაც.', cls: 'bg-rose-50 text-rose-600 border-rose-100',           icon: XCircle },
  CANCELLED: { label: 'გაუქმ.',    cls: 'bg-stone-700/40 text-admin-muted border-stone-600/40',    icon: XCircle },
  REFUNDED:  { label: 'დაბრ.',     cls: 'bg-purple-900/40 text-purple-300 border-purple-700/40', icon: RotateCcw },
};

function RotateCcw({ size }: { size: number }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 .49-3" /></svg>; }

export default function InvoicesList() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const handleSendToRsge = async (e: React.MouseEvent, inv: any) => {
    e.stopPropagation();
    if (!inv.customer_tin && !window.confirm(`ეს ინვოისი ფიზიკურ პირზეა/TIN-ის გარეშეა. ნამდვილად გსურთ RS.ge-ზე გაგზავნა 00000000000 კოდით?`)) return;
    
    setActionLoadingId(inv.id);
    const res = await autoCreateAndSendEInvoice(inv.order_id, inv.id);
    setActionLoadingId(null);
    if (!res.success) alert(res.message);
    else fetchInvoices();
  };

  const handleSyncRsge = async (e: React.MouseEvent, inv: any) => {
    e.stopPropagation();
    setActionLoadingId(inv.id);
    const res = await syncInvoiceStatus(inv.id);
    setActionLoadingId(null);
    if (!res.success) alert(res.message);
    else fetchInvoices();
  };

  const getToken = async () => (await supabase.auth.getSession()).data.session?.access_token || '';

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    const token = await getToken();
    const params = new URLSearchParams({ limit: '50' });
    if (typeFilter) params.set('type', typeFilter);
    if (statusFilter) params.set('status', statusFilter);
    const res = await fetch(`/api/accounting/invoices?${params}`, { headers: { Authorization: `Bearer ${token}` } });
    const json = await res.json();
    setInvoices(json.invoices || []);
    setLoading(false);
  }, [typeFilter, statusFilter]);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

  const filtered = invoices.filter(inv =>
    inv.invoice_number?.toLowerCase().includes(search.toLowerCase()) ||
    inv.customer_name?.toLowerCase().includes(search.toLowerCase())
  );

  const totalPaid = filtered.filter(i => i.payment_status === 'PAID').reduce((s, i) => s + Number(i.total_amount), 0);
  const totalPending = filtered.filter(i => i.payment_status === 'PENDING').reduce((s, i) => s + Number(i.total_amount), 0);

  return (
    <div className="admin-fade-in space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-admin-text flex items-center gap-2"><FileText size={22} /> ინვოისები</h2>
        <p className="text-admin-muted text-sm mt-1">B2C / B2B გაყიდვის ინვოისები</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'სულ ინვოის.', value: filtered.length, color: 'text-admin-text', bg: 'bg-admin-bg' },
          { label: 'გადახდილი', value: GEL(totalPaid), color: 'text-emerald-300', bg: 'bg-white shadow-[0_8px_30px_rgba(0,0,0,0.02)] rounded-3xl p-6 border-l-4 border-l-emerald-500' },
          { label: 'მოლოდ.', value: GEL(totalPending), color: 'text-amber-300', bg: 'bg-white shadow-[0_8px_30px_rgba(0,0,0,0.02)] rounded-3xl p-6 border-l-4 border-l-amber-500' },
        ].map((s, i) => (
          <div key={i} className={`${s.bg} rounded-xl p-4`}>
            <p className="text-admin-muted text-xs mb-1">{s.label}</p>
            <p className={`${s.color} font-bold text-lg`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="ინვ. ნომ. ან კლიენტი..."
            className="w-full pl-9 pr-4 py-2.5 bg-white border-none shadow-sm rounded-2xl focus:ring-4 focus:ring-admin-primary/5 transition-all text-admin-text text-sm focus:outline-none focus:border-stone-600" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {['', 'B2C', 'B2B'].map(t => (
            <button key={t} onClick={() => setTypeFilter(t)} className={`px-3 py-2 rounded-xl text-xs border transition-all ${typeFilter === t ? 'bg-admin-primary text-white border-admin-primary shadow-lg shadow-admin-primary/20' : 'border-admin-muted/10 text-admin-muted hover:border-stone-600'}`}>
              {t || 'ყველა'}
            </button>
          ))}
          {['', 'PAID', 'PENDING', 'OVERDUE'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)} className={`px-3 py-2 rounded-xl text-xs border transition-all ${statusFilter === s ? 'bg-admin-primary text-white border-admin-primary shadow-lg shadow-admin-primary/20' : 'border-admin-muted/10 text-admin-muted hover:border-stone-600'}`}>
              {s ? (STATUS_CFG[s]?.label || s) : 'სტატ.'}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-2">{Array(6).fill(0).map((_, i) => <div key={i} className="h-14 bg-white shadow-sm rounded-xl animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400"><FileText size={40} className="mx-auto mb-3 opacity-30" /><p>ინვოისები არ მოიძებნა</p></div>
      ) : (
        <div className="space-y-2">
          {filtered.map(inv => {
            const cfg = STATUS_CFG[inv.payment_status] || STATUS_CFG.PENDING;
            const Icon = cfg.icon;
            return (
              <div key={inv.id} className="bg-white shadow-[0_8px_30px_rgba(0,0,0,0.02)] rounded-2xl border border-admin-muted/5 hover:shadow-lg transition-all overflow-hidden">
                <button onClick={() => setExpanded(expanded === inv.id ? null : inv.id)}
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-100/50/30 transition-colors text-left">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div>
                      <span className="font-mono text-amber-400 text-sm font-semibold">{inv.invoice_number}</span>
                      <span className="ml-3 text-xs px-2 py-0.5 bg-admin-bg text-admin-muted rounded-full">{inv.invoice_type}</span>
                    </div>
                    <span className="text-admin-text text-sm truncate">{inv.customer_name}</span>
                    <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border ${cfg.cls}`}>
                      <Icon size={10} /> {cfg.label}
                    </span>
                    {inv.rsge_status && (
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${inv.rsge_status === 'CONFIRMED' ? 'bg-blue-900/30 text-blue-300 border-blue-700/40' : 'bg-admin-bg text-slate-400 border-admin-muted/10/40'}`}>
                        RS.ge: {inv.rsge_status}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 ml-4 shrink-0">
                    <div className="flex items-center gap-2 mr-2">
                      {actionLoadingId === inv.id ? (
                        <div className="w-5 h-5 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
                      ) : (
                        <>
                          {inv.rsge_invoice_id ? (
                            <button
                              onClick={(e) => handleSyncRsge(e, inv)}
                              className="p-1.5 text-slate-400 hover:text-blue-500 bg-slate-100/50 hover:bg-blue-50 rounded-lg transition-colors"
                              title="RS.ge სტატუსის განახლება"
                            >
                              <RefreshCcw size={16} />
                            </button>
                          ) : (
                            <button
                              onClick={(e) => handleSendToRsge(e, inv)}
                              className="p-1.5 text-slate-400 hover:text-emerald-500 bg-slate-100/50 hover:bg-emerald-50 rounded-lg transition-colors"
                              title="RS.ge-ზე ფაქტურის გაგზავნა"
                            >
                              <UploadCloud size={16} />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-admin-text font-semibold text-sm">{GEL(inv.total_amount)}</p>
                      <p className="text-slate-400 text-xs">{inv.invoice_date}</p>
                    </div>
                  </div>
                </button>

                {expanded === inv.id && (
                  <div className="border-t border-admin-muted/10 px-5 py-4">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4 text-xs">
                      <div><span className="text-slate-400">ტელ:</span> <span className="text-slate-600">{inv.customer_phone || '–'}</span></div>
                      <div><span className="text-slate-400">Email:</span> <span className="text-slate-600">{inv.customer_email || '–'}</span></div>
                      <div><span className="text-slate-400">სს/კ:</span> <span className="text-slate-600">{inv.customer_tin || '–'}</span></div>
                      <div><span className="text-slate-400">გადახდა:</span> <span className="text-slate-600">{inv.payment_method || '–'}</span></div>
                      <div><span className="text-slate-400">დღგ:</span> <span className="text-amber-300">{GEL(inv.vat_amount)}</span></div>
                      <div><span className="text-slate-400">საბაზისო:</span> <span className="text-slate-600">{GEL(inv.subtotal)}</span></div>
                      <div><span className="text-slate-400">სულ:</span> <span className="text-emerald-300 font-semibold">{GEL(inv.total_amount)}</span></div>
                    </div>
                    {inv.invoice_items && inv.invoice_items.length > 0 && (
                      <table className="w-full text-xs border-t border-admin-muted/10 pt-3">
                        <thead><tr className="text-slate-400">
                          <th className="text-left py-1">პროდ.</th>
                          <th className="text-right py-1">რაოდ.</th>
                          <th className="text-right py-1">ფასი</th>
                          <th className="text-right py-1">სულ</th>
                        </tr></thead>
                        <tbody>
                          {inv.invoice_items.map((item: any, i: number) => (
                            <tr key={i} className="border-t border-admin-muted/10/50">
                              <td className="py-1.5 text-slate-600">{item.product_name}</td>
                              <td className="py-1.5 text-right text-admin-muted">{item.quantity}</td>
                              <td className="py-1.5 text-right text-slate-600">{GEL(item.unit_price)}</td>
                              <td className="py-1.5 text-right text-admin-text">{GEL(item.line_total)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
