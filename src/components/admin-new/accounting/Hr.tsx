import React, { useState, useEffect, useCallback } from 'react';
import { 
  Users, 
  PlayCircle, 
  Plus, 
  DollarSign, 
  ChevronDown, 
  X,
  CreditCard,
  Calendar,
  Building2,
  Mail,
  Phone,
  Briefcase,
  History,
  TrendingDown,
  RefreshCw,
  Search,
  CheckCircle2,
  Edit,
  Trash2,
  Camera,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../../lib/utils';
import { supabase } from '../../../lib/supabase';

// Premium Design Components
const Card = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={cn("rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md shadow-[0_8px_30px_rgb(0,0,0,0.12)] p-6 transition-all hover:bg-white/10", className)}>
    {children}
  </div>
);

const KpiCard = ({ icon: Icon, title, value, subValue, color }: any) => (
  <div className={cn("rounded-2xl p-6 text-white bg-gradient-to-br shadow-lg", color)}>
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm font-medium text-white/80 uppercase tracking-widest">{title}</p>
        <p className="mt-2 text-3xl font-bold">{value}</p>
        {subValue && <p className="mt-1 text-xs font-medium text-white/70">{subValue}</p>}
      </div>
      <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-white/20 backdrop-blur-md">
        <Icon className="h-7 w-7 text-white" />
      </div>
    </div>
  </div>
);

const DEPARTMENTS = ['SALES', 'ADMIN', 'LOGISTICS', 'IT', 'MANAGEMENT'];
const MONTHS = ['იანვარი', 'თებერვალი', 'მარტი', 'აპრილი', 'მაისი', 'ივნისი', 'ივლისი', 'აგვისტო', 'სექტემბერი', 'ოქტომბერი', 'ნოემბერი', 'დეკემბერი'];

export default function Hr() {
  const [activeTab, setActiveTab] = useState<'employees' | 'payroll'>('employees');
  const [employees, setEmployees] = useState<any[]>([]);
  const [runs, setRuns] = useState<any[]>([]);
  const [periods, setPeriods] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddEmp, setShowAddEmp] = useState(false);
  const [showRunForm, setShowRunForm] = useState(false);
  const [expandedRun, setExpandedRun] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const [empForm, setEmpForm] = useState({ 
    full_name: '', 
    personal_id: '', 
    position: '', 
    department: 'ADMIN', 
    gross_salary: '', 
    hire_date: new Date().toISOString().split('T')[0], 
    email: '', 
    phone: '',
    photo_url: ''
  });

  const [runForm, setRunForm] = useState({ 
    period_month: new Date().getMonth() + 1, 
    period_year: new Date().getFullYear(), 
    fiscal_period_id: '' 
  });

  const getToken = async () => (await supabase.auth.getSession()).data.session?.access_token || '';

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getToken();
      
      if (activeTab === 'employees') {
        const res = await fetch('/api/accounting/employees', { headers: { Authorization: `Bearer ${token}` } });
        const json = await res.json();
        setEmployees(json.employees || []);
      } else {
        const runsRes = await fetch('/api/accounting/payroll/runs', { headers: { Authorization: `Bearer ${token}` } });
        const runsJson = await runsRes.json();
        setRuns(runsJson.runs || []);

        const periodsRes = await fetch('/api/accounting/fiscal-periods', { headers: { Authorization: `Bearer ${token}` } });
        const periodsJson = await periodsRes.json();
        const open = (periodsJson.periods || []).filter((p: any) => p.status === 'OPEN');
        setPeriods(open);
        if (open.length > 0 && !runForm.fiscal_period_id) {
          setRunForm(f => ({ ...f, fiscal_period_id: open[0].id }));
        }
      }
    } catch (err) {
      console.error('HR fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [activeTab, runForm.fiscal_period_id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const showToast = (msg: string, type: 'ok' | 'err') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = await getToken();
      const url = editId ? `/api/accounting/employees/${editId}` : '/api/accounting/employees';
      const method = editId ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...empForm, gross_salary: Number(empForm.gross_salary) }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      
      showToast(`${json.employee.full_name} წარმატებით ${editId ? 'განახლდა' : 'დაემატა'}`, 'ok');
      setShowAddEmp(false);
      setEditId(null);
      setEmpForm({ 
        full_name: '', personal_id: '', position: '', department: 'ADMIN', 
        gross_salary: '', hire_date: new Date().toISOString().split('T')[0], 
        email: '', phone: '', photo_url: ''
      });
      fetchData();
    } catch (err: any) {
      showToast(err.message, 'err');
    }
  };

  const handleEditEmployee = (emp: any) => {
    setEditId(emp.id);
    setEmpForm({
      full_name: emp.full_name,
      personal_id: emp.personal_id || '',
      position: emp.position,
      department: emp.department || 'ADMIN',
      gross_salary: emp.gross_salary,
      hire_date: emp.hire_date,
      email: emp.email || '',
      phone: emp.phone || '',
      photo_url: emp.photo_url || ''
    });
    setShowAddEmp(true);
  };

  const handleDeleteEmployee = async (id: string, name: string) => {
    if (!confirm(`ნამდვილად გსურთ ${name}-ს მონაცემების შლა?`)) return;
    try {
      const token = await getToken();
      const res = await fetch(`/api/accounting/employees/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
         const json = await res.json();
         throw new Error(json.error || 'წაშლა ვერ მოხერხდა');
      }
      showToast(`${name} წაიშალა წარმატებით`, 'ok');
      fetchData();
    } catch (err: any) {
      showToast(err.message, 'err');
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    const file = e.target.files[0];
    setUploadingPhoto(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `employees/${Date.now()}_${Math.random()}.${fileExt}`;
      const { data, error } = await supabase.storage.from("product-images").upload(fileName, file);
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("product-images").getPublicUrl(fileName);
      setEmpForm(f => ({ ...f, photo_url: urlData.publicUrl }));
    } catch (err: any) {
      showToast("ფოტოს ატვირთვა ვერ მოხერხდა", 'err');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleRunPayroll = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = await getToken();
      const res = await fetch('/api/accounting/payroll/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(runForm),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      
      showToast(`პეიროლი წარმატებით დამუშავდა`, 'ok');
      setShowRunForm(false);
      fetchData();
    } catch (err: any) {
      showToast(err.message, 'err');
    }
  };

  const totalBudget = employees.filter(e => e.status === 'ACTIVE').reduce((s, e) => s + Number(e.gross_salary), 0);
  
  const filteredEmployees = employees.filter(e => 
    e.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    e.position?.toLowerCase().includes(search.toLowerCase()) ||
    e.employee_code?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: -20, x: 20 }}
            animate={{ opacity: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={cn(
              "fixed top-24 right-6 z-[60] px-6 py-3 rounded-2xl shadow-2xl border backdrop-blur-xl flex items-center gap-3",
              toast.type === 'ok' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" : "bg-rose-500/10 border-rose-500/20 text-rose-500"
            )}
          >
            <CheckCircle2 className="h-5 w-5" />
            <span className="font-medium">{toast.msg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header & Stats */}
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" /> HR & ხელფასები
          </h2>
          <p className="text-sm text-muted-foreground">თანამშრომელთა მართვა და სახელფასო უწყისების დამუშავება</p>
        </div>
        <div className="flex items-center gap-2">
          {activeTab === 'employees' ? (
            <button 
              onClick={() => {
                setEditId(null);
                setEmpForm({ 
                  full_name: '', personal_id: '', position: '', department: 'ADMIN', 
                  gross_salary: '', hire_date: new Date().toISOString().split('T')[0], 
                  email: '', phone: '', photo_url: '' 
                });
                setShowAddEmp(true);
              }}
              className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 hover:opacity-90 transition-all"
            >
              <Plus className="h-4 w-4" /> თანამშრომლის დამატება
            </button>
          ) : (
            <button 
              onClick={() => setShowRunForm(true)}
              className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 hover:opacity-90 transition-all"
            >
              <PlayCircle className="h-4 w-4" /> პეიროლის გაშვება
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard 
          icon={Users} 
          title="სულ თანამშრომელი" 
          value={employees.length} 
          subValue={`${employees.filter(e => e.status === 'ACTIVE').length} აქტიური`} 
          color="from-sky-500 to-blue-600" 
        />
        <KpiCard 
          icon={DollarSign} 
          title="სახელფასო ფონდი" 
          value={`₾ ${totalBudget.toLocaleString()}`} 
          subValue="ყოველთვიური (Gross)" 
          color="from-emerald-500 to-teal-600" 
        />
        <KpiCard 
          icon={CreditCard} 
          title="პეიროლის ციკლი" 
          value={runs.length} 
          subValue="ჩატარებული გაშვება" 
          color="from-violet-500 to-purple-600" 
        />
        <KpiCard 
          icon={History} 
          title="ბოლო გაშვება" 
          value={runs.length > 0 ? `${MONTHS[runs[0].period_month - 1]}` : "—"} 
          subValue={runs.length > 0 ? `${runs[0].period_year} წელი` : "მონაცემი არ არის"} 
          color="from-amber-400 to-orange-500" 
        />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 rounded-2xl border border-border/50 bg-card p-1 w-fit">
        {[
          { id: 'employees', label: 'თანამშრომელთა ბაზა', icon: Building2 },
          { id: 'payroll', label: 'პეიროლის ისტორია', icon: History },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id as any)}
            className={cn(
              "flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-semibold transition-all",
              activeTab === t.id 
                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" 
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-4"
      >
        {activeTab === 'employees' && (
          <>
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-card/30 p-4 rounded-2xl border border-border/50 backdrop-blur-md">
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input 
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="ძებნა სახელით, პოზიციით..."
                  className="w-full pl-10 pr-4 py-2 bg-background border border-border/50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div className="flex items-center gap-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                <span className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full bg-emerald-500" /> აქტიური: {employees.filter(e => e.status === 'ACTIVE').length}</span>
                <span className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full bg-muted" /> გათავისუფლებული: {employees.filter(e => e.status !== 'ACTIVE').length}</span>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {loading ? (
                Array(6).fill(0).map((_, i) => <div key={i} className="h-48 rounded-2xl bg-muted animate-pulse" />)
              ) : filteredEmployees.length === 0 ? (
                <div className="col-span-full py-20 text-center text-muted-foreground">თანამშრომლები არ მოიძებნა</div>
              ) : (
                filteredEmployees.map((emp) => (
                  <Card key={emp.id} className="group hover:border-primary/30 transition-all hover:shadow-lg relative overflow-hidden">
                    <div className={cn(
                      "absolute top-0 right-0 w-1 h-full",
                      emp.status === 'ACTIVE' ? "bg-emerald-500" : "bg-muted"
                    )} />
                    <div className="flex items-center gap-4 mb-4 relative">
                      <div className="relative group/avatar">
                        <img 
                          src={emp.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(emp.full_name)}&background=random&color=fff&size=128&font-size=0.33&bold=true`}
                          alt={emp.full_name}
                          className="h-14 w-14 rounded-2xl object-cover shadow-md border-2 border-white/10 group-hover:scale-105 transition-transform duration-300" 
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-foreground truncate group-hover:text-primary transition-colors">{emp.full_name}</h4>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Briefcase className="h-3 w-3" /> {emp.position}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2 text-[10px]">
                        <div className={cn(
                          "rounded-full px-2 py-0.5 font-black tracking-tighter border",
                          emp.status === 'ACTIVE' ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-muted text-muted-foreground"
                        )}>
                          {emp.status === 'ACTIVE' ? 'ACTIVE' : 'LEFT'}
                        </div>
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                           <button onClick={(e) => { e.stopPropagation(); handleEditEmployee(emp); }} className="text-primary hover:scale-110 transition-transform"><Edit className="h-4 w-4" /></button>
                           <button onClick={(e) => { e.stopPropagation(); handleDeleteEmployee(emp.id, emp.full_name); }} className="text-rose-500 hover:scale-110 transition-transform"><Trash2 className="h-4 w-4" /></button>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2.5 border-t border-border/50 pt-4">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground flex items-center gap-1.5"><Mail className="h-3 w-3" /> {emp.email || "No Email"}</span>
                        <span className="text-muted-foreground flex items-center gap-1.5"><Phone className="h-3 w-3" /> {emp.phone || "No Phone"}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                           <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">ხელფასი (Gross)</p>
                           <p className="text-lg font-black text-foreground font-mono">₾ {Number(emp.gross_salary).toLocaleString()}</p>
                        </div>
                        <div className="text-right space-y-0.5">
                           <p className="text-[10px] uppercase font-bold text-primary tracking-widest">დარიცხული (Net)</p>
                           <p className="text-lg font-black text-emerald-500 font-mono">₾ {(Number(emp.gross_salary) * 0.8).toLocaleString()}</p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between bg-muted/30 -mx-6 -mb-6 px-6 py-3">
                       <span className="text-[10px] font-bold text-muted-foreground uppercase">{emp.department}</span>
                       <span className="text-[10px] font-mono text-muted-foreground">ID: {emp.employee_code}</span>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </>
        )}

        {activeTab === 'payroll' && (
          <div className="space-y-4">
             {loading ? (
               Array(3).fill(0).map((_, i) => <div key={i} className="h-24 rounded-2xl bg-muted animate-pulse" />)
             ) : runs.length === 0 ? (
               <div className="py-20 text-center text-muted-foreground italic">პეიროლის გაშვებები არ მოიძებნა</div>
             ) : (
               runs.map((run) => (
                 <Card key={run.id} className="p-0 overflow-hidden border-border/40 group">
                   <button 
                     onClick={() => setExpandedRun(expandedRun === run.id ? null : run.id)}
                     className="w-full flex flex-col sm:flex-row sm:items-center justify-between p-6 hover:bg-muted/30 transition-all text-left"
                   >
                     <div className="flex items-center gap-5">
                       <div className="h-14 w-14 rounded-2xl bg-amber-500/10 text-amber-500 flex flex-col items-center justify-center border border-amber-500/20 group-hover:scale-105 transition-transform shadow-lg shadow-amber-500/5">
                         <span className="text-[10px] font-black uppercase leading-none">{run.period_year}</span>
                         <span className="text-lg font-black">{run.period_month}</span>
                       </div>
                       <div>
                         <div className="flex items-center gap-2">
                            <h4 className="text-lg font-bold text-foreground">{MONTHS[run.period_month - 1]} {run.period_year}</h4>
                            <span className={cn(
                              "rounded-full px-2.5 py-0.5 text-[10px] font-black tracking-tighter border",
                              run.status === 'PAID' ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                            )}>
                              {run.status}
                            </span>
                         </div>
                         <p className="text-xs text-muted-foreground font-mono mt-0.5">RUN CODE: {run.run_code}</p>
                       </div>
                     </div>

                     <div className="flex items-center gap-12 mt-4 sm:mt-0">
                        <div className="text-right">
                           <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">ჯამური ბიუჯეტი</p>
                           <p className="text-lg font-black text-foreground font-mono">₾ {Number(run.total_gross).toLocaleString()}</p>
                        </div>
                        <div className="text-right">
                           <p className="text-[10px] font-bold text-primary uppercase tracking-widest">გაცემული ნეტო</p>
                           <p className="text-xl font-black text-emerald-500 font-mono">₾ {Number(run.total_net).toLocaleString()}</p>
                        </div>
                        <ChevronDown className={cn("h-5 w-5 text-muted-foreground transition-transform duration-300", expandedRun === run.id && "rotate-180")} />
                     </div>
                   </button>

                   <AnimatePresence>
                     {expandedRun === run.id && (
                       <motion.div 
                         initial={{ height: 0, opacity: 0 }}
                         animate={{ height: 'auto', opacity: 1 }}
                         exit={{ height: 0, opacity: 0 }}
                         className="border-t border-border/50 bg-muted/10 overflow-hidden"
                       >
                         <div className="p-6">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="text-muted-foreground border-b border-border/30">
                                  <th className="py-3 text-left font-bold uppercase text-[10px] tracking-widest">თანამშრომელი</th>
                                  <th className="py-3 text-right font-bold uppercase text-[10px] tracking-widest">Gross</th>
                                  <th className="py-3 text-right font-bold uppercase text-[10px] tracking-widest text-rose-500">საშემოსავლო (20%)</th>
                                  <th className="py-3 text-right font-bold uppercase text-[10px] tracking-widest text-emerald-500">Net Salary</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-border/20">
                                {run.payroll_items?.map((item: any, idx: number) => (
                                  <tr key={idx} className="hover:bg-background/50 transition-colors">
                                    <td className="py-3">
                                      <div className="font-bold text-foreground">{item.employees?.full_name}</div>
                                      <div className="text-[10px] text-muted-foreground italic">{item.employees?.position}</div>
                                    </td>
                                    <td className="py-3 text-right font-mono font-medium">₾ {Number(item.gross_salary).toLocaleString()}</td>
                                    <td className="py-3 text-right font-mono text-rose-500">₾ {Number(item.income_tax).toLocaleString()}</td>
                                    <td className="py-3 text-right font-mono font-black text-emerald-500">₾ {Number(item.net_salary).toLocaleString()}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                         </div>
                       </motion.div>
                     )}
                   </AnimatePresence>
                 </Card>
               ))
             )}
          </div>
        )}
      </motion.div>

      {/* Modals */}
      <AnimatePresence>
        {showAddEmp && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddEmp(false)}
              className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-card border border-border/50 rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="px-8 py-6 border-b border-border/50 bg-muted/20 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-foreground">{editId ? 'თანამშრომლის რედაქტირება' : 'ახალი თანამშრომელი'}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{editId ? 'შეცვალეთ თანამშრომლის მონაცემები' : 'შეავსეთ ძირითადი მონაცემები ბაზაში დასამატებლად'}</p>
                </div>
                <button onClick={() => setShowAddEmp(false)} className="p-2 rounded-xl hover:bg-muted transition-colors">
                   <X className="h-5 w-5 text-muted-foreground" />
                </button>
              </div>

              <form onSubmit={handleAddEmployee} className="p-8 space-y-6">
                 
                 <div className="flex items-center gap-4 border border-border/50 bg-muted/10 p-4 rounded-xl">
                    <label className="cursor-pointer relative group block shrink-0">
                       <input type="file" accept="image/*" onChange={handlePhotoUpload} disabled={uploadingPhoto} className="hidden" />
                       <div className="h-16 w-16 rounded-2xl bg-muted overflow-hidden flex items-center justify-center border-2 border-border/50 group-hover:border-primary/50 transition-colors">
                          {empForm.photo_url ? (
                             <img src={empForm.photo_url} alt="Avatar" className="w-full h-full object-cover" />
                          ) : (
                             <Camera className="h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors" />
                          )}
                          {uploadingPhoto && (
                            <div className="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center">
                              <Loader2 className="h-5 w-5 animate-spin text-primary" />
                            </div>
                          )}
                       </div>
                    </label>
                    <div className="text-xs text-muted-foreground">
                        <p className="font-bold text-foreground">პროფილის სურათი</p>
                        <p>დააკლიკეთ ფოტოს ასატვირთად</p>
                    </div>
                 </div>

                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    {[
                      { key: 'full_name', label: 'სახელი და გვარი *', type: 'text', req: true },
                      { key: 'personal_id', label: 'პირადი ნომერი', type: 'text', req: false },
                      { key: 'position', label: 'თანამდებობა *', type: 'text', req: true },
                      { key: 'gross_salary', label: 'ხელფასი (Gross) *', type: 'number', req: true },
                      { key: 'email', label: 'ელ-ფოსტა', type: 'email', req: false },
                      { key: 'phone', label: 'ტელეფონი', type: 'text', req: false },
                      { key: 'hire_date', label: 'მიღების თარიღი *', type: 'date', req: true },
                    ].map((field) => (
                      <div key={field.key} className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">{field.label}</label>
                        <input 
                          type={field.type}
                          required={field.req}
                          value={(empForm as any)[field.key]}
                          onChange={e => setEmpForm(f => ({ ...f, [field.key]: e.target.value }))}
                          className="w-full bg-background border border-border/50 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                        />
                      </div>
                    ))}
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">დეპარტამენტი</label>
                      <select 
                        value={empForm.department}
                        onChange={e => setEmpForm(f => ({ ...f, department: e.target.value }))}
                        className="w-full bg-background border border-border/50 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                      >
                        {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                 </div>

                 <div className="flex justify-end gap-3 pt-4">
                    <button 
                      type="button" 
                      onClick={() => setShowAddEmp(false)}
                      className="px-6 py-2.5 rounded-xl border border-border/50 font-bold text-sm hover:bg-muted transition-all"
                    >
                      გაუქმება
                    </button>
                    <button 
                      type="submit"
                      disabled={uploadingPhoto}
                      className="px-8 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm shadow-lg shadow-primary/20 hover:opacity-90 transition-all disabled:opacity-50"
                    >
                      {editId ? 'შენახვა' : 'დამატება'}
                    </button>
                 </div>
              </form>
            </motion.div>
          </div>
        )}

        {showRunForm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowRunForm(false)}
              className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-card border border-border/50 rounded-3xl shadow-2xl overflow-hidden"
            >
               <div className="px-8 py-6 border-b border-border/50 bg-muted/20 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-foreground italic flex items-center gap-2">
                    <PlayCircle className="h-5 w-5 text-emerald-500" /> პეიროლის გაშვება
                  </h3>
                </div>
                <button onClick={() => setShowRunForm(false)} className="p-2 rounded-xl hover:bg-muted transition-colors">
                   <X className="h-5 w-5 text-muted-foreground" />
                </button>
              </div>

              <form onSubmit={handleRunPayroll} className="p-8 space-y-6">
                 <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">საანგარიშო პერიოდი (თვე)</label>
                      <select 
                        value={runForm.period_month}
                        onChange={e => setRunForm(f => ({ ...f, period_month: Number(e.target.value) }))}
                        className="w-full bg-background border border-border/50 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none font-bold"
                      >
                        {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">ფისკალური პერიოდი (DB)</label>
                      <select 
                        value={runForm.fiscal_period_id}
                        onChange={e => setRunForm(f => ({ ...f, fiscal_period_id: e.target.value }))}
                        required
                        className="w-full bg-background border border-border/50 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                      >
                        {periods.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </div>

                    <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 space-y-2">
                       <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">აქტიური თანამშრომელი</span>
                          <span className="text-sm font-black text-foreground">{employees.filter(e => e.status === 'ACTIVE').length}</span>
                       </div>
                       <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">ჯამური Gross ფონდი</span>
                          <span className="text-sm font-black text-foreground">₾ {totalBudget.toLocaleString()}</span>
                       </div>
                       <div className="pt-2 mt-2 border-t border-primary/10 flex items-center justify-between">
                          <span className="text-xs font-bold text-primary italic">ნეტო გასაცემი (Est.)</span>
                          <span className="text-lg font-black text-emerald-500">₾ {(totalBudget * 0.8).toLocaleString()}</span>
                       </div>
                    </div>
                 </div>

                 <button 
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 bg-emerald-600 text-white rounded-2xl font-black text-sm shadow-xl shadow-emerald-500/20 hover:bg-emerald-500 hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-3 uppercase tracking-wider"
                >
                  {loading ? <RefreshCw className="h-5 w-5 animate-spin" /> : <PlayCircle className="h-5 w-5" />}
                  პროცესის დაწყება
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}