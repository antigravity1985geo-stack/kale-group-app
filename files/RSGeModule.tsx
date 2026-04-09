// ============================================================
// RSGeModule.tsx — RS.ge Integration Admin Panel
// Phase 4: RS.ge SOAP Integration
// ============================================================
// Tabs: Dashboard | ელ-ინვოისი | ზედნადები | VAT | პარამეტრები
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import type {
  RSGeTab,
  EInvoiceRecord,
  WaybillRecord,
  VATReturnRecord,
  RSGeSyncResult,
} from '../../../types/rsge.types';
import {
  rsgeHealthCheck,
  RSGE_CONFIG,
} from '../../../services/rsge/rsge.soap.client';
import {
  autoCreateAndSendEInvoice,
  cancelEInvoice,
  syncInvoiceStatus,
  createWaybillForOrder,
  activateOrderWaybill,
  closeOrderWaybill,
  submitMonthlyVATReturn,
  getRecentSyncLog,
} from '../../../services/rsge/rsge.service';

// ─── Icons (inline SVG — no external dependency) ─────────────
const Icons = {
  Dashboard:  () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>,
  Invoice:    () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
  Truck:      () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10l2 .001M13 16l2 .001M13 16H9m4 0h2m0 0l.586-.586A2 2 0 0117 14h.5M17 16h2M3 16H1v-5l2-4h14v5.001" /></svg>,
  Tax:        () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>,
  Settings:   () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
  Check:      () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>,
  X:          () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>,
  Refresh:    () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>,
  Send:       () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>,
  Warning:    () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>,
};

// ─── Status Badge ─────────────────────────────────────────────
const StatusBadge = ({ status }: { status: string }) => {
  const colors: Record<string, string> = {
    DRAFT:     'bg-gray-100 text-gray-700',
    SENT:      'bg-blue-100 text-blue-700',
    CONFIRMED: 'bg-green-100 text-green-700',
    ACTIVE:    'bg-green-100 text-green-700',
    CLOSED:    'bg-gray-100 text-gray-600',
    CANCELLED: 'bg-red-100 text-red-700',
    REJECTED:  'bg-red-100 text-red-700',
    SUBMITTED: 'bg-blue-100 text-blue-700',
    ACCEPTED:  'bg-green-100 text-green-700',
    EXPIRED:   'bg-orange-100 text-orange-700',
    DELETED:   'bg-gray-100 text-gray-500',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colors[status] ?? 'bg-gray-100 text-gray-700'}`}>
      {status}
    </span>
  );
};

// ─── Mock Data for UI Demo ────────────────────────────────────
const MOCK_INVOICES: EInvoiceRecord[] = [
  { rsgeId: 'INV-1001', internalId: 'inv-abc', status: 'SENT', invoiceNumber: 'MOCK-INV-1001', issueDate: '2025-04-01', sellerTin: '200123456', buyerTin: '400987654', buyerName: 'შპს ტექნოჯი', totalAmount: 2360, vatAmount: 360, currency: 'GEL', createdAt: '2025-04-01T10:00:00Z', sentAt: '2025-04-01T10:01:00Z' },
  { rsgeId: 'INV-1002', internalId: 'inv-def', status: 'CONFIRMED', invoiceNumber: 'MOCK-INV-1002', issueDate: '2025-04-03', sellerTin: '200123456', buyerTin: '400111222', buyerName: 'ვახო გიორგაძე', totalAmount: 5900, vatAmount: 900, currency: 'GEL', createdAt: '2025-04-03T14:00:00Z', confirmedAt: '2025-04-04T09:00:00Z' },
  { rsgeId: 'INV-1003', internalId: 'inv-ghi', status: 'DRAFT', invoiceNumber: 'MOCK-INV-1003', issueDate: '2025-04-07', sellerTin: '200123456', buyerTin: '400333444', buyerName: 'შპს ალფა', totalAmount: 1180, vatAmount: 180, currency: 'GEL', createdAt: '2025-04-07T08:00:00Z' },
];

const MOCK_WAYBILLS: WaybillRecord[] = [
  { rsgeId: 'WB-2001', internalOrderId: 'ord-001', status: 'CLOSED', waybillNumber: 'WB-MOCK-2001', waybillType: 'STANDARD', activationDate: '2025-04-02', senderTin: '200123456', receiverTin: '400987654', receiverName: 'შპს ტექნოჯი', totalAmount: 2360, createdAt: '2025-04-02T09:00:00Z', activatedAt: '2025-04-02T09:30:00Z', closedAt: '2025-04-03T11:00:00Z' },
  { rsgeId: 'WB-2002', internalOrderId: 'ord-002', status: 'ACTIVE', waybillNumber: 'WB-MOCK-2002', waybillType: 'STANDARD', activationDate: '2025-04-07', senderTin: '200123456', receiverTin: '400111222', receiverName: 'ვახო გიორგაძე', totalAmount: 5900, createdAt: '2025-04-07T08:00:00Z', activatedAt: '2025-04-07T10:00:00Z' },
];

const MOCK_VAT: VATReturnRecord[] = [
  { rsgeId: 'VAT-301', period: { year: 2025, month: 3 }, status: 'ACCEPTED', outputVAT: 12400, inputVAT: 3200, netVAT: 9200, submittedAt: '2025-04-10T10:00:00Z', acceptedAt: '2025-04-11T14:00:00Z' },
  { rsgeId: undefined, period: { year: 2025, month: 4 }, status: 'DRAFT', outputVAT: 5400, inputVAT: 1800, netVAT: 3600 },
];

const MONTHS_GE = ['იანვარი','თებერვალი','მარტი','აპრილი','მაისი','ივნისი','ივლისი','აგვისტო','სექტემბერი','ოქტომბერი','ნოემბერი','დეკემბერი'];

// ─── Sub-panels ───────────────────────────────────────────────

function DashboardPanel({ health, syncLog, onRefresh }: {
  health: { auth: boolean; einvoice: boolean; waybill: boolean; mockMode: boolean } | null;
  syncLog: RSGeSyncResult[];
  onRefresh: () => void;
}) {
  const kpis = [
    { label: 'ელ-ინვოისები (გაგზავნილი)', value: MOCK_INVOICES.filter(i => i.status === 'SENT' || i.status === 'CONFIRMED').length, total: MOCK_INVOICES.length, color: 'text-blue-600' },
    { label: 'ზედნადები (აქტიური)', value: MOCK_WAYBILLS.filter(w => w.status === 'ACTIVE').length, total: MOCK_WAYBILLS.length, color: 'text-green-600' },
    { label: 'VAT დეკლარაციები', value: MOCK_VAT.filter(v => v.status === 'ACCEPTED').length, total: MOCK_VAT.length, color: 'text-purple-600' },
    { label: 'სინქრ. შეცდომები', value: syncLog.filter(l => !l.success).length, total: syncLog.length, color: 'text-red-600' },
  ];

  return (
    <div className="space-y-6">
      {/* Mock Mode Banner */}
      {health?.mockMode && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-lg p-4">
          <Icons.Warning />
          <div>
            <p className="font-semibold text-amber-800 text-sm">MOCK რეჟიმი აქტიურია</p>
            <p className="text-amber-700 text-xs mt-0.5">
              RS.ge-ს რეალური API გამოძახებები გამორთულია. Credentials-ების დამატებისთვის გახსენი{' '}
              <code className="bg-amber-100 px-1 rounded">src/services/rsge/rsge.soap.client.ts</code>{' '}
              და შეცვალე <code className="bg-amber-100 px-1 rounded">MOCK_MODE: false</code>.
            </p>
          </div>
        </div>
      )}

      {/* Service Health */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-800">RS.ge სერვისები</h3>
          <button onClick={onRefresh} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors">
            <Icons.Refresh /> განახლება
          </button>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[
            { name: 'Auth Service', ok: health?.auth },
            { name: 'ელ-ინვოისი', ok: health?.einvoice },
            { name: 'ზედნადები', ok: health?.waybill },
          ].map(svc => (
            <div key={svc.name} className="flex items-center gap-2 p-3 rounded-lg bg-gray-50">
              <span className={`flex-shrink-0 w-2 h-2 rounded-full ${svc.ok ? 'bg-green-400' : 'bg-red-400'}`} />
              <span className="text-sm text-gray-700">{svc.name}</span>
              <span className={`ml-auto text-xs font-medium ${svc.ok ? 'text-green-600' : 'text-red-600'}`}>
                {svc.ok ? 'OK' : 'DOWN'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(kpi => (
          <div key={kpi.label} className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 mb-1">{kpi.label}</p>
            <p className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</p>
            <p className="text-xs text-gray-400 mt-0.5">სულ: {kpi.total}</p>
          </div>
        ))}
      </div>

      {/* Recent sync log */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-800 mb-4">ბოლო სინქრონიზაციები</h3>
        {syncLog.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">სინქრ. ჯერ არ მომხდარა</p>
        ) : (
          <div className="space-y-2">
            {syncLog.slice(0, 8).map((log, i) => (
              <div key={i} className="flex items-center gap-3 text-sm py-2 border-b border-gray-50 last:border-0">
                <span className={`flex-shrink-0 ${log.success ? 'text-green-500' : 'text-red-500'}`}>
                  {log.success ? <Icons.Check /> : <Icons.X />}
                </span>
                <span className="font-mono text-xs text-gray-400 w-20 flex-shrink-0">{log.type.toUpperCase()}</span>
                <span className="text-gray-600 flex-1 truncate">{log.message}</span>
                <span className="text-gray-400 text-xs flex-shrink-0">
                  {new Date(log.timestamp).toLocaleTimeString('ka-GE')}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function EInvoicePanel({ onAction }: { onAction: (result: RSGeSyncResult) => void }) {
  const [invoices, setInvoices] = useState<EInvoiceRecord[]>(MOCK_INVOICES);
  const [loading, setLoading] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [orderId, setOrderId] = useState('');
  const [invoiceId, setInvoiceId] = useState('');

  const handleAutoCreate = async () => {
    if (!orderId || !invoiceId) return;
    setLoading('create');
    const result = await autoCreateAndSendEInvoice(orderId, invoiceId);
    onAction(result);
    setLoading(null);
    setShowCreateForm(false);
    setOrderId(''); setInvoiceId('');
  };

  const handleSyncStatus = async (inv: EInvoiceRecord) => {
    setLoading(inv.rsgeId);
    const result = await syncInvoiceStatus(inv.internalId);
    onAction(result);
    setLoading(null);
  };

  const handleCancel = async (inv: EInvoiceRecord) => {
    if (!window.confirm(`ინვოისი ${inv.rsgeId} გაუქმდეს?`)) return;
    setLoading(inv.rsgeId);
    const result = await cancelEInvoice(inv.internalId, 'Admin მიერ გაუქმებული');
    onAction(result);
    setInvoices(prev => prev.map(i => i.rsgeId === inv.rsgeId ? { ...i, status: 'CANCELLED' } : i));
    setLoading(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-800">ელ-ინვოისები RS.ge-ზე</h3>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
        >
          <Icons.Send /> ახლის გაგზავნა
        </button>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
          <p className="text-sm font-medium text-blue-800">შეკვეთიდან ინვოისის ავტო-გენერაცია</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">შეკვეთის ID (order uuid)</label>
              <input value={orderId} onChange={e => setOrderId(e.target.value)} placeholder="ord-xxxx" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 outline-none" />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">ინვოისის ID (invoice uuid)</label>
              <input value={invoiceId} onChange={e => setInvoiceId(e.target.value)} placeholder="inv-xxxx" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 outline-none" />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleAutoCreate} disabled={loading === 'create' || !orderId || !invoiceId}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors">
              {loading === 'create' ? 'იგზავნება...' : 'შექმნა & გაგზავნა'}
            </button>
            <button onClick={() => setShowCreateForm(false)} className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition-colors">გაუქმება</button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['RS.ge ID', 'ნომერი', 'მყიდველი', 'თარიღი', 'ჯამი', 'სტატუსი', 'მოქმედება'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {invoices.map(inv => (
              <tr key={inv.rsgeId} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 font-mono text-xs text-gray-500">{inv.rsgeId}</td>
                <td className="px-4 py-3 text-gray-700">{inv.invoiceNumber}</td>
                <td className="px-4 py-3 text-gray-700">{inv.buyerName}</td>
                <td className="px-4 py-3 text-gray-500">{inv.issueDate}</td>
                <td className="px-4 py-3 text-gray-800 font-medium">
                  {inv.totalAmount.toLocaleString()} ₾
                  <span className="text-xs text-gray-400 ml-1">(დღგ {inv.vatAmount.toLocaleString()})</span>
                </td>
                <td className="px-4 py-3"><StatusBadge status={inv.status} /></td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button onClick={() => handleSyncStatus(inv)} disabled={loading === inv.rsgeId}
                      className="text-xs text-blue-600 hover:text-blue-800 disabled:opacity-40 transition-colors">
                      {loading === inv.rsgeId ? '...' : 'სინქ.'}
                    </button>
                    {['DRAFT', 'SENT'].includes(inv.status) && (
                      <button onClick={() => handleCancel(inv)} disabled={loading === inv.rsgeId}
                        className="text-xs text-red-600 hover:text-red-800 disabled:opacity-40 transition-colors">
                        გაუქმება
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function WaybillPanel({ onAction }: { onAction: (result: RSGeSyncResult) => void }) {
  const [waybills, setWaybills] = useState<WaybillRecord[]>(MOCK_WAYBILLS);
  const [loading, setLoading] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ orderId: '', from: 'თბილისი, ვაჟა-ფშაველას 1', to: '' });

  const handleCreate = async () => {
    if (!form.orderId || !form.to) return;
    setLoading('create');
    const result = await createWaybillForOrder(form.orderId, { startAddress: form.from, endAddress: form.to });
    onAction(result);
    setLoading(null); setShowForm(false);
  };

  const handleActivate = async (wb: WaybillRecord) => {
    setLoading(wb.rsgeId);
    const result = await activateOrderWaybill(wb.internalOrderId!);
    onAction(result);
    setWaybills(prev => prev.map(w => w.rsgeId === wb.rsgeId ? { ...w, status: 'ACTIVE', activatedAt: new Date().toISOString() } : w));
    setLoading(null);
  };

  const handleClose = async (wb: WaybillRecord) => {
    if (!window.confirm(`ზედნადები ${wb.rsgeId} დაიხუროს?`)) return;
    setLoading(wb.rsgeId);
    const result = await closeOrderWaybill(wb.internalOrderId!);
    onAction(result);
    setWaybills(prev => prev.map(w => w.rsgeId === wb.rsgeId ? { ...w, status: 'CLOSED', closedAt: new Date().toISOString() } : w));
    setLoading(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-800">ზედნადები RS.ge-ზე</h3>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 transition-colors">
          <Icons.Truck /> ახალი ზედნადები
        </button>
      </div>

      {showForm && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-3">
          <p className="text-sm font-medium text-green-800">ახალი ზედნადების შექმნა</p>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">შეკვეთის ID</label>
              <input value={form.orderId} onChange={e => setForm(f => ({ ...f, orderId: e.target.value }))} placeholder="ord-xxxx" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-green-400" />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">გამგზავნი მისამართი</label>
              <input value={form.from} onChange={e => setForm(f => ({ ...f, from: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-green-400" />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">მიმღები მისამართი</label>
              <input value={form.to} onChange={e => setForm(f => ({ ...f, to: e.target.value }))} placeholder="ქ. ბათუმი, ..." className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-green-400" />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleCreate} disabled={loading === 'create'} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:opacity-50 transition-colors">
              {loading === 'create' ? 'იქმნება...' : 'შექმნა'}
            </button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition-colors">გაუქმება</button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['RS.ge ID', 'ნომერი', 'მიმღები', 'თარიღი', 'სულ', 'სტატუსი', 'მოქმედება'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {waybills.map(wb => (
              <tr key={wb.rsgeId} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 font-mono text-xs text-gray-500">{wb.rsgeId}</td>
                <td className="px-4 py-3 text-gray-700">{wb.waybillNumber}</td>
                <td className="px-4 py-3 text-gray-700">{wb.receiverName}</td>
                <td className="px-4 py-3 text-gray-500">{wb.activationDate}</td>
                <td className="px-4 py-3 font-medium text-gray-800">{wb.totalAmount.toLocaleString()} ₾</td>
                <td className="px-4 py-3"><StatusBadge status={wb.status} /></td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    {wb.status === 'DRAFT' && (
                      <button onClick={() => handleActivate(wb)} disabled={loading === wb.rsgeId} className="text-xs text-green-600 hover:text-green-800 disabled:opacity-40">
                        {loading === wb.rsgeId ? '...' : 'გააქტ.'}
                      </button>
                    )}
                    {wb.status === 'ACTIVE' && (
                      <button onClick={() => handleClose(wb)} disabled={loading === wb.rsgeId} className="text-xs text-blue-600 hover:text-blue-800 disabled:opacity-40">
                        {loading === wb.rsgeId ? '...' : 'დახურვა'}
                      </button>
                    )}
                    {wb.status === 'CLOSED' && <span className="text-xs text-gray-400">დასრულდა</span>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function VATPanel({ onAction }: { onAction: (result: RSGeSyncResult) => void }) {
  const [returns, setReturns] = useState<VATReturnRecord[]>(MOCK_VAT);
  const [loading, setLoading] = useState<string | null>(null);
  const now = new Date();

  const handleSubmit = async (r: VATReturnRecord) => {
    if (!window.confirm(`${MONTHS_GE[r.period.month - 1]} ${r.period.year} — დეკლარაცია წარდგეს?`)) return;
    const key = `${r.period.year}-${r.period.month}`;
    setLoading(key);
    const result = await submitMonthlyVATReturn(r.period.year, r.period.month);
    onAction(result);
    if (result.success) {
      setReturns(prev => prev.map(x =>
        x.period.year === r.period.year && x.period.month === r.period.month
          ? { ...x, status: 'SUBMITTED', rsgeId: result.rsgeId, submittedAt: new Date().toISOString() }
          : x
      ));
    }
    setLoading(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-800">დღგ-ის დეკლარაციები</h3>
        <p className="text-xs text-gray-400">RS.ge ავტომატური წარდგენა</p>
      </div>

      {/* Summary card for current period */}
      {(() => {
        const draft = returns.find(r => r.status === 'DRAFT');
        if (!draft) return null;
        return (
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-medium text-gray-700">
                {MONTHS_GE[draft.period.month - 1]} {draft.period.year} — მიმდინარე
              </h4>
              <button
                onClick={() => handleSubmit(draft)}
                disabled={loading === `${draft.period.year}-${draft.period.month}`}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 disabled:opacity-50 transition-colors"
              >
                <Icons.Send />
                {loading ? 'იგზავნება...' : 'RS.ge-ზე წარდგენა'}
              </button>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'გამოსასვლელი დღგ', val: draft.outputVAT, color: 'text-red-600' },
                { label: 'შესასვლელი დღგ',   val: draft.inputVAT,  color: 'text-green-600' },
                { label: 'გადასახდელი',       val: draft.netVAT,    color: 'text-gray-900' },
              ].map(item => (
                <div key={item.label} className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">{item.label}</p>
                  <p className={`text-xl font-bold mt-1 ${item.color}`}>{item.val.toLocaleString()} ₾</p>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* History */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['პერიოდი', 'RS.ge ID', 'გამოსასვლ.', 'შესასვლ.', 'გადასახდ.', 'სტატუსი', 'წარდგენა'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {returns.map(r => {
              const key = `${r.period.year}-${r.period.month}`;
              return (
                <tr key={key} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-700">{MONTHS_GE[r.period.month - 1]} {r.period.year}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-400">{r.rsgeId ?? '—'}</td>
                  <td className="px-4 py-3 text-red-600">{r.outputVAT.toLocaleString()} ₾</td>
                  <td className="px-4 py-3 text-green-600">{r.inputVAT.toLocaleString()} ₾</td>
                  <td className="px-4 py-3 font-bold text-gray-800">{r.netVAT.toLocaleString()} ₾</td>
                  <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                  <td className="px-4 py-3 text-xs text-gray-400">{r.submittedAt ? new Date(r.submittedAt).toLocaleDateString('ka-GE') : '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SettingsPanel() {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-800 mb-1">RS.ge API კავშირი</h3>
        <p className="text-sm text-gray-500 mb-5">შეიყვანე RS.ge პორტალის credentials. ეს მონაცემები Supabase Secrets-ში ინახება.</p>

        <div className="space-y-4">
          {[
            { label: 'RS.ge მომხმარებელი', env: 'VITE_RSGE_USERNAME', placeholder: 'mycompany@rs.ge' },
            { label: 'RS.ge პაროლი', env: 'VITE_RSGE_PASSWORD', placeholder: '••••••••', type: 'password' },
            { label: 'საიდენტიფიკაციო ნომერი (ს/ნ)', env: 'VITE_RSGE_TIN', placeholder: '200123456789' },
          ].map(field => (
            <div key={field.env}>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{field.label}</label>
              <div className="flex gap-2">
                <input
                  type={field.type ?? 'text'}
                  placeholder={field.placeholder}
                  disabled
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-400 cursor-not-allowed"
                />
                <span className="flex items-center px-3 text-xs text-gray-400 bg-gray-50 border border-gray-200 rounded-lg whitespace-nowrap">
                  {field.env}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 p-4 bg-blue-50 border border-blue-100 rounded-lg">
          <p className="text-sm font-medium text-blue-800 mb-2">Credentials-ების გააქტიურება:</p>
          <ol className="text-xs text-blue-700 space-y-1 list-decimal list-inside">
            <li>დაამატე <code className="bg-blue-100 px-1 rounded">.env</code> ფაილში: <code className="bg-blue-100 px-1 rounded">VITE_RSGE_USERNAME</code>, <code className="bg-blue-100 px-1 rounded">VITE_RSGE_PASSWORD</code>, <code className="bg-blue-100 px-1 rounded">VITE_RSGE_TIN</code></li>
            <li>გახსენი <code className="bg-blue-100 px-1 rounded">src/services/rsge/rsge.soap.client.ts</code></li>
            <li>შეცვალე <code className="bg-blue-100 px-1 rounded">MOCK_MODE: true</code> → <code className="bg-blue-100 px-1 rounded">false</code></li>
            <li>გაუქმება გააქვს <code className="bg-blue-100 px-1 rounded">// TODO:</code> კომენტარებს LIVE სექციებში</li>
            <li>XML parsing-ისთვის <code className="bg-blue-100 px-1 rounded">fast-xml-parser</code> დაამატე: <code className="bg-blue-100 px-1 rounded">npm i fast-xml-parser</code></li>
          </ol>
        </div>
      </div>

      {/* DB Migration reminder */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-800 mb-1">Supabase Migration</h3>
        <p className="text-sm text-gray-500 mb-4">დაამატე ეს columns/tables Supabase-ში RS.ge სინქრ.-სთვის:</p>
        <pre className="bg-gray-900 text-green-400 rounded-lg p-4 text-xs overflow-auto font-mono leading-relaxed">{`-- RS.ge sync columns on existing tables
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS rsge_invoice_id   text,
  ADD COLUMN IF NOT EXISTS rsge_status       text DEFAULT 'NONE',
  ADD COLUMN IF NOT EXISTS rsge_sent_at      timestamptz;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS rsge_waybill_id           text,
  ADD COLUMN IF NOT EXISTS rsge_waybill_status       text DEFAULT 'NONE',
  ADD COLUMN IF NOT EXISTS rsge_waybill_activated_at timestamptz,
  ADD COLUMN IF NOT EXISTS rsge_waybill_closed_at    timestamptz;

-- Sync audit log
CREATE TABLE IF NOT EXISTS public.rsge_sync_log (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  type        text NOT NULL,
  action      text NOT NULL,
  internal_id text,
  rsge_id     text,
  success     boolean NOT NULL,
  payload     jsonb,
  response    jsonb,
  error       text,
  created_at  timestamptz DEFAULT now()
);

-- VAT returns registry
CREATE TABLE IF NOT EXISTS public.vat_returns (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  period_year  int NOT NULL,
  period_month int NOT NULL,
  rsge_id      text,
  status       text DEFAULT 'DRAFT',
  output_vat   numeric(15,2) DEFAULT 0,
  input_vat    numeric(15,2) DEFAULT 0,
  net_vat      numeric(15,2) DEFAULT 0,
  submitted_at timestamptz,
  accepted_at  timestamptz,
  UNIQUE (period_year, period_month)
);`}</pre>
      </div>
    </div>
  );
}

// ─── Main Module Component ────────────────────────────────────
export default function RSGeModule() {
  const [activeTab, setActiveTab] = useState<RSGeTab>('dashboard');
  const [health, setHealth] = useState<{ auth: boolean; einvoice: boolean; waybill: boolean; mockMode: boolean } | null>(null);
  const [syncLog, setSyncLog] = useState<RSGeSyncResult[]>([]);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = (result: RSGeSyncResult) => {
    setSyncLog(prev => [result, ...prev]);
    setToast({ msg: result.message, ok: result.success });
    setTimeout(() => setToast(null), 4000);
  };

  const checkHealth = useCallback(async () => {
    const h = await rsgeHealthCheck();
    setHealth(h);
  }, []);

  useEffect(() => { checkHealth(); }, [checkHealth]);

  const tabs: { id: RSGeTab; label: string; icon: JSX.Element }[] = [
    { id: 'dashboard', label: 'დეშბორდი',      icon: <Icons.Dashboard /> },
    { id: 'einvoice',  label: 'ელ-ინვოისი',    icon: <Icons.Invoice /> },
    { id: 'waybill',   label: 'ზედნადები',     icon: <Icons.Truck /> },
    { id: 'vat',       label: 'დღგ',           icon: <Icons.Tax /> },
    { id: 'settings',  label: 'პარამეტრები',   icon: <Icons.Settings /> },
  ];

  return (
    <div className="relative">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium transition-all ${toast.ok ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
          {toast.ok ? <Icons.Check /> : <Icons.X />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">RS</div>
          <h2 className="text-xl font-bold text-gray-900">RS.ge ინტეგრაცია</h2>
          {health?.mockMode && (
            <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">MOCK</span>
          )}
          {!health?.mockMode && (
            <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">LIVE</span>
          )}
        </div>
        <p className="text-sm text-gray-500">ელ-ინვოისი · ზედნადები · VAT დეკლარაცია</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all flex-1 justify-center ${
              activeTab === tab.id
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.icon}
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Panel */}
      {activeTab === 'dashboard' && <DashboardPanel health={health} syncLog={syncLog} onRefresh={checkHealth} />}
      {activeTab === 'einvoice'  && <EInvoicePanel onAction={showToast} />}
      {activeTab === 'waybill'   && <WaybillPanel onAction={showToast} />}
      {activeTab === 'vat'       && <VATPanel onAction={showToast} />}
      {activeTab === 'settings'  && <SettingsPanel />}
    </div>
  );
}
