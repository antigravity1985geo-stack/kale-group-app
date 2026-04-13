import React, { useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { Upload, FileText, CheckCircle2, AlertCircle, X, ArrowRight, Loader2 } from 'lucide-react';

interface ParsedTransaction {
  id: string; // temp string
  date: string;
  beneficiary: string;
  payee: string;
  tin: string;
  amount: number;
  type: 'IN' | 'OUT'; // IN = Debit Bank, OUT = Credit Bank
  purpose: string;
  account_target?: string; // the guess for double entry
}

export default function BankStatementImporter({ onClose, onImportSuccess }: { onClose: () => void, onImportSuccess: () => void }) {
  const [csvData, setCsvData] = useState<ParsedTransaction[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState('');

  React.useEffect(() => {
    supabase.from('accounts').select('id, code, name_ka').order('code').then(({ data }) => {
      if (data) setAccounts(data);
    });
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsParsing(true);
    setError('');
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        // Basic naive CSV parsing for BOG / TBC formats
        const lines = text.split('\n').filter(line => line.trim().length > 0);
        
        const parsed: ParsedTransaction[] = [];
        
        // Skip header
        for (let i = 1; i < lines.length; i++) {
          // simple split by comma, ignoring quotes for speed in this MVP
          const cols = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
          // Typical: Date, Doc, Tin, Beneficiary, Payer, Debit, Credit, Currency, Purpose
          if (cols.length < 5) continue; 
          
          // Let's assume standard BOG simplified export
          // 0: Date, 1: Payer, 2: Beneficiary, 3: Amount In (Credit to account), 4: Amount Out (Debit), 5: Purpose
          const debitAmt = parseFloat(cols[3]) || 0; // Money coming IN to the bank
          const creditAmt = parseFloat(cols[4]) || 0; // Money going OUT of the bank
          
          if (debitAmt === 0 && creditAmt === 0) continue;

          parsed.push({
            id: Math.random().toString(36).substr(2, 9),
            date: cols[0],
            payee: cols[1],
            beneficiary: cols[2],
            tin: '',
            amount: debitAmt > 0 ? debitAmt : creditAmt,
            type: debitAmt > 0 ? 'IN' : 'OUT',
            purpose: cols[5] || 'საბანკო ტრანზაქცია',
            account_target: ''
          });
        }
        
        setCsvData(parsed);
      } catch (err) {
        setError('შეცდომა CSV ფაილის წაკითხვისას. დარწმუნდით რომ სწორი ფორმატია.');
      } finally {
        setIsParsing(false);
      }
    };
    reader.readAsText(file);
  };

  const updateTargetAccount = (id: string, accountId: string) => {
    setCsvData(prev => prev.map(t => t.id === id ? { ...t, account_target: accountId } : t));
  };

  const importToJournal = async () => {
    const invalid = csvData.find(t => !t.account_target);
    if (invalid) {
      setError('გთხოვთ მიუთითოთ კორესპონდენტი ანგარიში ყველა ტრანზაქციისთვის.');
      return;
    }

    setIsImporting(true);
    try {
      const bankAccId = accounts.find(a => a.code === '1210')?.id; // Bank account
      if (!bankAccId) throw new Error("1210 ეროვნული ვალუტა ბანკში ანგარიში ვერ მოიძებნა");

      const { data: period } = await supabase.from('fiscal_periods').select('id').eq('status', 'OPEN').order('period_year', { ascending: false }).limit(1).single();
      if (!period) throw new Error("ღია ფისკალური პერიოდი ვერ მოიძებნა");

      for (const t of csvData) {
        // Create entry
        const { data: entry, error: entryErr } = await supabase.from('journal_entries').insert({
            entry_number: `BNK-${Math.floor(Date.now() / 1000)}-${Math.floor(Math.random()*100)}`,
            entry_date: new Date().toISOString().split('T')[0],
            description: `[ბანკი ექსპორტი] ${t.purpose} - ${t.type === 'IN' ? t.payee : t.beneficiary}`,
            reference_type: 'BANK_STATEMENT',
            fiscal_period_id: period.id,
            status: 'POSTED'
        }).select().single();

        if (entryErr) throw entryErr;

        // Lines
        if (t.type === 'IN') {
           // Debit Bank (1210), Credit Target (e.g. 1410 Buyer debt)
           await supabase.from('journal_lines').insert([
             { journal_entry_id: entry.id, account_id: bankAccId, debit: t.amount, credit: 0 },
             { journal_entry_id: entry.id, account_id: t.account_target, debit: 0, credit: t.amount }
           ]);
        } else {
           // OUT: Credit Bank (1210), Debit Target (e.g. 3100 Supplier payload)
           await supabase.from('journal_lines').insert([
            { journal_entry_id: entry.id, account_id: t.account_target, debit: t.amount, credit: 0 },
            { journal_entry_id: entry.id, account_id: bankAccId, debit: 0, credit: t.amount }
          ]);
        }
      }

      onImportSuccess();
    } catch (err: any) {
      setError('შეცდომა იმპორტისას: ' + err.message);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl flex flex-col max-h-[90vh] overflow-hidden border border-admin-muted/10">
        <div className="p-6 border-b border-admin-muted/10 flex justify-between items-center bg-slate-50">
          <div>
            <h2 className="text-xl font-bold text-admin-text flex items-center gap-2">
              <Upload size={22} className="text-blue-500" />
              საბანკო ამონაწერის იმპორტი
            </h2>
            <p className="text-sm text-admin-muted mt-1">აირჩიეთ ბანკიდან ჩამოტვირთული .csv ფაილი</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition bg-transparent border-none cursor-pointer">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto bg-slate-50/50">
          {error && (
            <div className="mb-6 p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl flex items-center gap-3 text-sm font-medium">
              <AlertCircle size={18} />
              {error}
            </div>
          )}

          {csvData.length === 0 ? (
            <div className="border-2 border-dashed border-admin-muted/10 rounded-2xl p-16 flex flex-col items-center justify-center text-admin-muted hover:border-blue-400 transition cursor-pointer relative bg-white">
              <input type="file" accept=".csv" onChange={handleFileUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
              {isParsing ? (
                <Loader2 size={48} className="text-slate-300 mb-4 animate-spin" />
              ) : (
                <FileText size={48} className="text-slate-300 mb-4" />
              )}
              <p className="font-bold text-slate-700 mb-1">{isParsing ? 'მუშავდება...' : 'აირჩიეთ CSV ფაილი'}</p>
              <p className="text-xs text-slate-400 text-center max-w-xs">
                გთხოვთ გამოიყენოთ გამარტივებული ექსპორტის ფორმატი (TBC / BOG Simplified CSV)
              </p>
            </div>
          ) : (
            <div className="admin-fade-in space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="font-bold text-admin-text">ნაპოვნია {csvData.length} ტრანზაქცია</h4>
                <button
                  onClick={() => setCsvData([])}
                  className="text-xs text-rose-500 bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-100 font-bold hover:bg-rose-100 transition cursor-pointer"
                >
                  გასუფთავება
                </button>
              </div>

              <div className="bg-white border border-admin-muted/10 rounded-2xl overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-admin-muted/10 text-xs uppercase tracking-widest text-admin-muted">
                      <th className="p-4 font-semibold">თარიღი/დანიშნულება</th>
                      <th className="p-4 font-semibold text-center">ტიპი</th>
                      <th className="p-4 font-semibold text-right">თანხა</th>
                      <th className="p-4 font-semibold w-1/3">კორესპ. ანგარიში</th>
                    </tr>
                  </thead>
                  <tbody>
                    {csvData.map((t) => (
                      <tr key={t.id} className="border-b border-admin-muted/10 last:border-0 hover:bg-slate-50 transition">
                        <td className="p-4">
                          <p className="font-mono text-xs text-slate-400 mb-1">{t.date}</p>
                          <p className="text-sm font-semibold text-admin-text">{t.type === 'IN' ? t.payee : t.beneficiary}</p>
                          <p className="text-xs text-admin-muted mt-0.5 truncate max-w-xs" title={t.purpose}>{t.purpose}</p>
                        </td>
                        <td className="p-4 text-center">
                          {t.type === 'IN' ? (
                            <span className="bg-emerald-50 text-emerald-600 px-2 py-1 rounded text-[10px] font-bold border border-emerald-100">შემომავალი (IN)</span>
                          ) : (
                            <span className="bg-rose-50 text-rose-600 px-2 py-1 rounded text-[10px] font-bold border border-rose-100">გამავალი (OUT)</span>
                          )}
                        </td>
                        <td className="p-4 text-right">
                          <p className={`font-bold ${t.type === 'IN' ? 'text-emerald-600' : 'text-admin-text'}`}>
                            {t.type === 'IN' ? '+' : '-'}₾{t.amount.toFixed(2)}
                          </p>
                        </td>
                        <td className="p-4">
                          <select
                            value={t.account_target}
                            onChange={(e) => updateTargetAccount(t.id, e.target.value)}
                            className="w-full text-xs p-2 rounded-xl border border-admin-muted/10 bg-slate-50 focus:bg-white transition"
                          >
                            <option value="">აირჩიეთ ანგარიში...</option>
                            {accounts.map(a => (
                              <option key={a.id} value={a.id}>
                                {a.code} - {a.name_ka}
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-admin-muted/10 bg-white flex justify-end gap-3">
          <button onClick={onClose} className="px-6 py-2.5 rounded-xl text-slate-600 text-sm font-bold bg-slate-100 hover:bg-slate-200 transition border-none cursor-pointer">
            გაუქმება
          </button>
          
          <button 
            disabled={csvData.length === 0 || isImporting}
            onClick={importToJournal}
            className="px-6 py-2.5 rounded-xl text-white text-sm font-bold bg-brand-600 hover:bg-brand-700 transition flex items-center gap-2 border-none cursor-pointer disabled:opacity-50"
          >
            {isImporting ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
            სრული იმპორტი
          </button>
        </div>
      </div>
    </div>
  );
}
