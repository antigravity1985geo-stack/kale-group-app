import React, { useState, useEffect, useCallback } from 'react';
import { Users, PlayCircle, Plus, DollarSign, ChevronDown, X } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

const GEL = (v: number | string) => Number(v).toLocaleString('ka-GE', { minimumFractionDigits: 2 }) + ' ₾';
const DEPARTMENTS = ['SALES', 'ADMIN', 'LOGISTICS', 'IT', 'MANAGEMENT'];
const MONTHS = ['იანვ', 'თებ', 'მარ', 'აპრ', 'მაი', 'ივნ', 'ივლ', 'აგვ', 'სექ', 'ოქტ', 'ნოე', 'დეკ'];

export default function HrPayroll() {
  const [tab, setTab] = useState<'employees' | 'payroll'>('employees');
  const [employees, setEmployees] = useState<any[]>([]);
  const [runs, setRuns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddEmp, setShowAddEmp] = useState(false);
  const [showRunForm, setShowRunForm] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null);
  const [expandedRun, setExpandedRun] = useState<string | null>(null);
  const [periods, setPeriods] = useState<any[]>([]);

  const [empForm, setEmpForm] = useState({ full_name: '', personal_id: '', position: '', department: 'ADMIN', gross_salary: '', hire_date: new Date().toISOString().split('T')[0], email: '', phone: '' });
  const [runForm, setRunForm] = useState({ period_month: new Date().getMonth() + 1, period_year: new Date().getFullYear(), fiscal_period_id: '' });

  const getToken = async () => (await supabase.auth.getSession()).data.session?.access_token || '';

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    const token = await getToken();
    const res = await fetch('/api/accounting/employees', { headers: { Authorization: `Bearer ${token}` } });
    const json = await res.json();
    setEmployees(json.employees || []);
    setLoading(false);
  }, []);

  const fetchRuns = useCallback(async () => {
    setLoading(true);
    const token = await getToken();
    const res = await fetch('/api/accounting/payroll/runs', { headers: { Authorization: `Bearer ${token}` } });
    const json = await res.json();
    setRuns(json.runs || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (tab === 'employees') fetchEmployees();
    else {
      fetchRuns();
      getToken().then(async token => {
        const res = await fetch('/api/accounting/fiscal-periods', { headers: { Authorization: `Bearer ${token}` } });
        const json = await res.json();
        const open = (json.periods || []).filter((p: any) => p.status === 'OPEN');
        setPeriods(open);
        if (open.length > 0) setRunForm(f => ({ ...f, fiscal_period_id: open[0].id }));
      });
    }
  }, [tab, fetchEmployees, fetchRuns]);

  const showToast = (msg: string, type: 'ok' | 'err') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = await getToken();
    const res = await fetch('/api/accounting/employees', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ ...empForm, gross_salary: Number(empForm.gross_salary) }),
    });
    const json = await res.json();
    if (!res.ok) return showToast(json.error, 'err');
    showToast(`${json.employee.full_name} დაემატა ✓`, 'ok');
    setShowAddEmp(false);
    setEmpForm({ full_name: '', personal_id: '', position: '', department: 'ADMIN', gross_salary: '', hire_date: new Date().toISOString().split('T')[0], email: '', phone: '' });
    fetchEmployees();
  };

  const handleRunPayroll = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = await getToken();
    const res = await fetch('/api/accounting/payroll/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(runForm),
    });
    const json = await res.json();
    if (!res.ok) return showToast(json.error, 'err');
    showToast(`პეიროლი დამუშავდა: ${GEL(json.total_net)} ✓`, 'ok');
    setShowRunForm(false);
    fetchRuns();
  };

  const totalSalaryBudget = employees.filter(e => e.status === 'ACTIVE').reduce((s, e) => s + Number(e.gross_salary), 0);
  const DEPT_COLORS: Record<string, string> = { SALES: 'text-emerald-300 bg-emerald-900/30', ADMIN: 'text-blue-300 bg-blue-900/30', LOGISTICS: 'text-orange-300 bg-orange-900/30', IT: 'text-violet-300 bg-violet-900/30', MANAGEMENT: 'text-amber-300 bg-amber-900/30' };

  return (
    <div className="space-y-6">
      {toast && <div className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-xl text-sm font-medium shadow-xl border ${toast.type === 'ok' ? 'bg-emerald-900 text-emerald-200 border-emerald-700' : 'bg-red-900 text-red-200 border-red-700'}`}>{toast.msg}</div>}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2"><Users size={22} /> HR & ხელფასი</h2>
          <p className="text-stone-400 text-sm mt-1">თანამშრომ. მართვა · Payroll Processing</p>
        </div>
        <div className="text-right">
          <p className="text-stone-500 text-xs">ყოველთვ. ფონდი</p>
          <p className="text-amber-300 font-bold text-lg">{GEL(totalSalaryBudget)}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-stone-900/50 border border-stone-800 p-1 rounded-xl w-fit">
        {([['employees', 'თანამ. ბაზა'], ['payroll', 'პეიროლი']] as const).map(([t, l]) => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-lg text-sm transition-all ${tab === t ? 'bg-amber-600 text-white' : 'text-stone-400 hover:text-white'}`}>{l}</button>
        ))}
      </div>

      {/* Employees Tab */}
      {tab === 'employees' && (
        <>
          <div className="flex justify-between items-center">
            <div className="flex gap-4 text-sm">
              <span className="text-stone-400">სულ: <strong className="text-white">{employees.length}</strong></span>
              <span className="text-stone-400">აქტ.: <strong className="text-emerald-300">{employees.filter(e => e.status === 'ACTIVE').length}</strong></span>
            </div>
            <button onClick={() => setShowAddEmp(!showAddEmp)} className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-sm font-medium transition-all">
              <Plus size={14} /> თანამშ. დამ.
            </button>
          </div>

          {showAddEmp && (
            <form onSubmit={handleAddEmployee} className="bg-stone-900/90 border border-stone-800 rounded-2xl p-6 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-white font-semibold">👤 ახალი თანამშრომელი</h3>
                <button type="button" onClick={() => setShowAddEmp(false)}><X size={18} className="text-stone-500" /></button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[
                  ['full_name', 'სრული სახ. *', 'text', true],
                  ['personal_id', 'პ/ნ', 'text', false],
                  ['position', 'პოზიცია *', 'text', true],
                  ['gross_salary', 'Gross ხელფ. (₾) *', 'number', true],
                  ['hire_date', 'მიღ. თ. *', 'date', true],
                  ['email', 'Email', 'email', false],
                  ['phone', 'ტელ.', 'text', false],
                ].map(([key, label, type, req]) => (
                  <div key={key as string}>
                    <label className="text-stone-400 text-xs mb-1 block">{label as string}</label>
                    <input type={type as string} required={req as boolean} value={(empForm as any)[key as string]} onChange={e => setEmpForm({ ...empForm, [key as string]: e.target.value })}
                      className="w-full bg-stone-800 border border-stone-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-600" />
                  </div>
                ))}
                <div>
                  <label className="text-stone-400 text-xs mb-1 block">დეპ.</label>
                  <select value={empForm.department} onChange={e => setEmpForm({ ...empForm, department: e.target.value })}
                    className="w-full bg-stone-800 border border-stone-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-600">
                    {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-3 justify-end">
                <button type="button" onClick={() => setShowAddEmp(false)} className="px-4 py-2 text-sm text-stone-400 border border-stone-700 rounded-xl">გ/ება</button>
                <button type="submit" className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white text-sm rounded-xl font-medium">შენახვა</button>
              </div>
            </form>
          )}

          {loading ? (
            <div className="space-y-2">{Array(4).fill(0).map((_, i) => <div key={i} className="h-16 bg-stone-900 animate-pulse rounded-xl" />)}</div>
          ) : (
            <div className="space-y-2">
              {employees.map(emp => (
                <div key={emp.id} className="flex items-center gap-4 bg-stone-900/80 border border-stone-800/50 rounded-xl px-5 py-4">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-600 to-orange-700 flex items-center justify-center text-white font-semibold text-sm shrink-0">
                    {emp.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium text-sm">{emp.full_name}</p>
                    <p className="text-stone-400 text-xs">{emp.position} · {emp.employee_code}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${DEPT_COLORS[emp.department] || 'text-stone-300 bg-stone-800'}`}>{emp.department}</span>
                  <div className="text-right">
                    <p className="text-white font-semibold text-sm">{GEL(emp.gross_salary)}</p>
                    <p className="text-stone-500 text-xs">სუფ: {GEL(emp.gross_salary * 0.8)}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${emp.status === 'ACTIVE' ? 'border-emerald-700/40 text-emerald-300 bg-emerald-900/30' : 'border-stone-600/40 text-stone-500 bg-stone-800/30'}`}>{emp.status === 'ACTIVE' ? 'აქტ.' : 'გათ.'}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Payroll Tab */}
      {tab === 'payroll' && (
        <>
          <div className="flex justify-end">
            <button onClick={() => setShowRunForm(!showRunForm)} className="flex items-center gap-2 px-5 py-2.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl text-sm font-medium transition-all shadow-lg shadow-emerald-900/30">
              <PlayCircle size={16} /> პეიროლის გაშვება
            </button>
          </div>

          {showRunForm && (
            <form onSubmit={handleRunPayroll} className="bg-stone-900/90 border border-stone-800 rounded-2xl p-6 space-y-4 max-w-sm">
              <div className="flex justify-between">
                <h3 className="text-white font-semibold">🚀 პეიროლ-ი</h3>
                <button type="button" onClick={() => setShowRunForm(false)}><X size={18} className="text-stone-500" /></button>
              </div>
              <div>
                <label className="text-stone-400 text-xs mb-1 block">თვე</label>
                <select value={runForm.period_month} onChange={e => setRunForm({ ...runForm, period_month: Number(e.target.value) })}
                  className="w-full bg-stone-800 border border-stone-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-600">
                  {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="text-stone-400 text-xs mb-1 block">ფისკ. პერ.</label>
                <select value={runForm.fiscal_period_id} onChange={e => setRunForm({ ...runForm, fiscal_period_id: e.target.value })}
                  className="w-full bg-stone-800 border border-stone-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-600" required>
                  {periods.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="bg-amber-900/20 border border-amber-800/40 rounded-xl p-3 text-xs text-amber-300">
                📢 {employees.filter(e => e.status === 'ACTIVE').length} თანამ. | ფონდი: {GEL(totalSalaryBudget)} (20% საშ.გ.)
              </div>
              <button type="submit" className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl text-sm font-medium">გაშვება</button>
            </form>
          )}

          {loading ? (
            <div className="space-y-2">{Array(3).fill(0).map((_, i) => <div key={i} className="h-16 bg-stone-900 animate-pulse rounded-xl" />)}</div>
          ) : runs.length === 0 ? (
            <div className="text-center py-16 text-stone-500"><DollarSign size={40} className="mx-auto mb-3 opacity-30" /><p>პეიროლ-ი ჯ. არ ჩატ.</p></div>
          ) : (
            <div className="space-y-3">
              {runs.map(run => (
                <div key={run.id} className="bg-stone-900/80 border border-stone-800/50 rounded-xl overflow-hidden">
                  <button onClick={() => setExpandedRun(expandedRun === run.id ? null : run.id)}
                    className="w-full flex items-center justify-between px-5 py-4 hover:bg-stone-800/30 transition-colors">
                    <div className="flex items-center gap-4">
                      <span className="font-mono text-amber-400 text-sm">{run.run_code}</span>
                      <span className="text-white">{MONTHS[run.period_month - 1]} {run.period_year}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${run.status === 'PAID' ? 'bg-emerald-900/30 text-emerald-300 border-emerald-700/40' : 'bg-amber-900/30 text-amber-300 border-amber-700/40'}`}>{run.status}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right text-sm">
                        <span className="text-stone-400">Gross: </span><span className="text-white">{GEL(run.total_gross)}</span>
                        <span className="text-stone-600 mx-2">|</span>
                        <span className="text-stone-400">Net: </span><span className="text-emerald-300 font-semibold">{GEL(run.total_net)}</span>
                      </div>
                      <ChevronDown size={16} className={`text-stone-600 transition-transform ${expandedRun === run.id ? 'rotate-180' : ''}`} />
                    </div>
                  </button>
                  {expandedRun === run.id && run.payroll_items?.length > 0 && (
                    <div className="border-t border-stone-800 px-5 py-3">
                      <table className="w-full text-xs">
                        <thead><tr className="text-stone-500"><th className="text-left py-1">თანამ.</th><th className="text-left py-1">პოზ.</th><th className="text-right py-1">Gross</th><th className="text-right py-1">სახ.გ.</th><th className="text-right py-1">Net</th></tr></thead>
                        <tbody>
                          {run.payroll_items.map((item: any, i: number) => (
                            <tr key={i} className="border-t border-stone-800/50">
                              <td className="py-1.5 text-white">{item.employees?.full_name}</td>
                              <td className="py-1.5 text-stone-400">{item.employees?.position}</td>
                              <td className="py-1.5 text-right text-stone-300">{GEL(item.gross_salary)}</td>
                              <td className="py-1.5 text-right text-red-300">{GEL(item.income_tax)}</td>
                              <td className="py-1.5 text-right text-emerald-300 font-semibold">{GEL(item.net_salary)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
