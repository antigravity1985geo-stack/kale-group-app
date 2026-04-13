# 🔴 STRICT AI IMPLEMENTATION PLAN — DO NOT DEVIATE

> **ეს გეგმა შექმნილია Senior AI Architect-ის მიერ (Claude Opus 4.6).**
> **თუ სხვა AI მუშაობს ამ გეგმაზე — ბოლომდე გაჰყევი ამ ინსტრუქციებს. არ შეცვალო არქიტექტურა, არ შემოიტანო ახალი ბიბლიოთეკები, არ შეცვალო ფაილების სტრუქტურა.**

## 📂 პროექტის სტრუქტურა (არ შეცვალო)

```
src/components/admin-new/     ← ახალი ადმინ პანელი (აქ ვმუშაობთ)
src/components/admin/         ← ძველი ადმინ პანელი (მხოლოდ REFERENCE-ისთვის)
src/services/rsge/            ← RS.ge სერვისის ფაილები (უკვე არსებობს)
src/types/rsge.types.ts       ← RS.ge ტიპები (უკვე არსებობს)
src/lib/supabase.ts           ← Supabase client (არ შეცვალო)
src/context/AuthContext.tsx   ← Auth context (არ შეცვალო)
```

## 🎨 დიზაინის წესები (MANDATORY)

ახალი პანელი იყენებს **shadcn/ui სტილის** CSS ცვლადებს. **არ გამოიყენო** ძველი პანელის ფერები (admin-bg, admin-card, admin-text). 

ახალი პანელის კლასები:
- ფონი: `bg-card`, `bg-background`, `bg-muted`, `bg-muted/50`
- ტექსტი: `text-foreground`, `text-muted-foreground`
- ბორდერი: `border-border/50`, `border-border`
- პრაიმერი: `bg-primary`, `text-primary`, `text-primary-foreground`
- ტოპოლოგია: `rounded-2xl`, `rounded-xl`, `shadow-lg shadow-primary/25`
- ანიმაცია: `framer-motion` — `motion.div` init/animate

**არ გამოიყენო**: `bg-admin-bg`, `bg-admin-card`, `text-admin-text`, `bg-brand-900`, `shadow-[0_18px_40px...]` — ეს ძველი სტილებია!

---

# ════════════════════════════════════════════
# დავალება 1: საბანკო ამონაწერის იმპორტი
# ════════════════════════════════════════════

## რა უნდა გაკეთდეს:
Accounting.tsx ფაილში, "journal" ტაბზე, დაამატე "საბანკო იმპორტის" ღილაკი, რომელიც ხსნის მოდალს. მოდალი საშუალებას იძლევა CSV ფაილი ატვირთოს, ტრანზაქციები ნახოს და ბუღალტერიაში (journal_entries + journal_lines) გაატაროს.

## ფაილი: `src/components/admin-new/Accounting.tsx`

### ნაბიჯი 1.1 — იმპორტების დამატება (ფაილის დასაწყისში)

მოძებნე ეს ხაზი:
```tsx
import {
  BarChart3, BookOpen, FileText, Package, Building2, Users, RotateCcw, Truck,
  Landmark, Receipt, FileBarChart, TrendingUp, DollarSign, Percent, CreditCard,
  Banknote, Calendar, Loader2, RefreshCw, AlertTriangle, CheckCircle, Clock,
  XCircle, ChevronDown, Eye
} from "lucide-react"
```

შეცვალე ამით (დაამატე `Upload, X, FileCheck`):
```tsx
import {
  BarChart3, BookOpen, FileText, Package, Building2, Users, RotateCcw, Truck,
  Landmark, Receipt, FileBarChart, TrendingUp, DollarSign, Percent, CreditCard,
  Banknote, Calendar, Loader2, RefreshCw, AlertTriangle, CheckCircle, Clock,
  XCircle, ChevronDown, Eye, Upload, X, FileCheck
} from "lucide-react"
```

### ნაბიჯი 1.2 — State-ების დამატება

მოძებნე ეს ხაზი `Accounting()` ფუნქციის შიგნით:
```tsx
const [activeTab, setActiveTab] = useState("dashboard")
const [isLoading, setIsLoading] = useState(true)
```

მის ქვემოთ დაამატე:
```tsx
// ── Bank Importer State ──
const [showBankImporter, setShowBankImporter] = useState(false)
const [bankCsvData, setBankCsvData] = useState<{
  id: string; date: string; beneficiary: string; payee: string;
  amount: number; type: 'IN' | 'OUT'; purpose: string; account_target: string;
}[]>([])
const [isBankImporting, setIsBankImporting] = useState(false)
const [bankImportError, setBankImportError] = useState("")
```

### ნაბიჯი 1.3 — CSV პარსერის ფუნქცია

მოძებნე `const fetchData = useCallback(async () => {` ხაზი.
**მის ზემოთ** (არა შიგნით!) დაამატე ეს ფუნქციები:

```tsx
// ── Bank CSV Upload Handler ──
const handleBankFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0]
  if (!file) return
  setBankImportError("")
  const reader = new FileReader()
  reader.onload = (event) => {
    try {
      const text = event.target?.result as string
      const lines = text.split('\n').filter(line => line.trim().length > 0)
      const parsed: typeof bankCsvData = []
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''))
        if (cols.length < 5) continue
        const debitAmt = parseFloat(cols[3]) || 0
        const creditAmt = parseFloat(cols[4]) || 0
        if (debitAmt === 0 && creditAmt === 0) continue
        parsed.push({
          id: Math.random().toString(36).substr(2, 9),
          date: cols[0],
          payee: cols[1],
          beneficiary: cols[2],
          amount: debitAmt > 0 ? debitAmt : creditAmt,
          type: debitAmt > 0 ? 'IN' : 'OUT',
          purpose: cols[5] || 'საბანკო ტრანზაქცია',
          account_target: ''
        })
      }
      setBankCsvData(parsed)
    } catch {
      setBankImportError('შეცდომა CSV ფაილის წაკითხვისას.')
    }
  }
  reader.readAsText(file)
}

const handleBankImport = async () => {
  const invalid = bankCsvData.find(t => !t.account_target)
  if (invalid) { setBankImportError('გთხოვთ მიუთითოთ კორესპონდენტი ანგარიში ყველა ტრანზაქციისთვის.'); return }
  setIsBankImporting(true)
  try {
    const bankAccId = accounts.find((a: any) => a.code === '1210')?.id
    if (!bankAccId) throw new Error("1210 ანგარიში ვერ მოიძებნა")
    for (const t of bankCsvData) {
      const { data: entry, error: entryErr } = await supabase.from('journal_entries').insert({
        entry_number: `BNK-${Date.now()}-${Math.floor(Math.random()*100)}`,
        entry_date: new Date().toISOString().split('T')[0],
        description: `[ბანკი] ${t.purpose} - ${t.type === 'IN' ? t.payee : t.beneficiary}`,
        reference_type: 'BANK_STATEMENT',
        status: 'POSTED'
      }).select().single()
      if (entryErr) throw entryErr
      if (t.type === 'IN') {
        await supabase.from('journal_lines').insert([
          { journal_entry_id: entry.id, account_id: bankAccId, debit: t.amount, credit: 0 },
          { journal_entry_id: entry.id, account_id: t.account_target, debit: 0, credit: t.amount }
        ])
      } else {
        await supabase.from('journal_lines').insert([
          { journal_entry_id: entry.id, account_id: t.account_target, debit: t.amount, credit: 0 },
          { journal_entry_id: entry.id, account_id: bankAccId, debit: 0, credit: t.amount }
        ])
      }
    }
    setShowBankImporter(false)
    setBankCsvData([])
    fetchData()
  } catch (err: any) {
    setBankImportError('შეცდომა: ' + err.message)
  } finally {
    setIsBankImporting(false)
  }
}
```

### ნაბიჯი 1.4 — ჟურნალ ტაბზე ღილაკის დამატება

Accounting.tsx-ში მოძებნე ხაზი სადაც journal ტაბის UI-ს არენდერებს. მოიძიე `journal` ტაბის სათაურის ხაზი (სადაც <BookOpen /> ან "ჟურნალი" ჩანს), და იქ header-ის მარჯვნივ დაამატე ღილაკი:

```tsx
<button
  onClick={() => setShowBankImporter(true)}
  className="flex items-center gap-2 rounded-xl bg-blue-500/10 px-4 py-2 text-xs font-bold text-blue-600 hover:bg-blue-500/20 transition-colors"
>
  <Upload className="h-4 w-4" /> საბანკო იმპორტი
</button>
```

### ნაბიჯი 1.5 — მოდალის JSX (Accounting.tsx-ის return-ის ბოლოს)

Accounting.tsx-ის `return (...)` ბლოკში, **ბოლო `</div>`-ის წინ**, დაამატე ეს მოდალი:

```tsx
{/* Bank Statement Importer Modal */}
{showBankImporter && (
  <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
    <div className="bg-card rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col max-h-[90vh] overflow-hidden border border-border/50">
      <div className="p-6 border-b border-border/50 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Upload className="h-5 w-5 text-blue-500" /> საბანკო ამონაწერის იმპორტი
          </h2>
          <p className="text-sm text-muted-foreground mt-1">აირჩიეთ .csv ფაილი (TBC/BOG ფორმატი)</p>
        </div>
        <button onClick={() => { setShowBankImporter(false); setBankCsvData([]); setBankImportError("") }} className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="p-6 flex-1 overflow-y-auto">
        {bankImportError && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-600 rounded-xl flex items-center gap-2 text-sm">
            <AlertTriangle className="h-4 w-4" /> {bankImportError}
          </div>
        )}

        {bankCsvData.length === 0 ? (
          <div className="border-2 border-dashed border-border rounded-2xl p-16 flex flex-col items-center justify-center text-muted-foreground hover:border-primary transition relative">
            <input type="file" accept=".csv" onChange={handleBankFileUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
            <FileText className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <p className="font-bold text-foreground mb-1">აირჩიეთ CSV ფაილი</p>
            <p className="text-xs text-center max-w-xs">TBC / BOG გამარტივებული ექსპორტის ფორმატი</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="font-bold text-foreground">ნაპოვნია {bankCsvData.length} ტრანზაქცია</h4>
              <button onClick={() => setBankCsvData([])} className="text-xs text-red-500 bg-red-500/10 px-3 py-1.5 rounded-lg font-bold hover:bg-red-500/20 transition">გასუფთავება</button>
            </div>
            <div className="rounded-xl border border-border/50 overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="p-3">თარიღი / დანიშნულება</th>
                    <th className="p-3 text-center">ტიპი</th>
                    <th className="p-3 text-right">თანხა</th>
                    <th className="p-3 w-1/3">კორესპ. ანგარიში</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {bankCsvData.map((t) => (
                    <tr key={t.id} className="hover:bg-muted/50 transition">
                      <td className="p-3">
                        <p className="font-mono text-xs text-muted-foreground">{t.date}</p>
                        <p className="text-sm font-medium text-foreground">{t.type === 'IN' ? t.payee : t.beneficiary}</p>
                        <p className="text-xs text-muted-foreground truncate max-w-xs">{t.purpose}</p>
                      </td>
                      <td className="p-3 text-center">
                        <span className={cn("px-2 py-1 rounded text-[10px] font-bold", t.type === 'IN' ? "bg-emerald-500/10 text-emerald-600" : "bg-red-500/10 text-red-600")}>
                          {t.type === 'IN' ? 'შემომავალი' : 'გამავალი'}
                        </span>
                      </td>
                      <td className={cn("p-3 text-right font-bold", t.type === 'IN' ? "text-emerald-600" : "text-foreground")}>
                        {t.type === 'IN' ? '+' : '-'}₾{t.amount.toFixed(2)}
                      </td>
                      <td className="p-3">
                        <select
                          value={t.account_target}
                          onChange={(e) => setBankCsvData(prev => prev.map(x => x.id === t.id ? { ...x, account_target: e.target.value } : x))}
                          className="w-full text-xs p-2 rounded-lg border border-border bg-background focus:border-primary outline-none"
                        >
                          <option value="">აირჩიეთ ანგარიში...</option>
                          {accounts.map((a: any) => <option key={a.id} value={a.id}>{a.code} - {a.name_ka}</option>)}
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

      <div className="p-6 border-t border-border/50 flex justify-end gap-3">
        <button onClick={() => { setShowBankImporter(false); setBankCsvData([]); setBankImportError("") }} className="px-6 py-2.5 rounded-xl text-muted-foreground text-sm font-bold bg-muted hover:bg-muted/80 transition">გაუქმება</button>
        <button disabled={bankCsvData.length === 0 || isBankImporting} onClick={handleBankImport}
          className="px-6 py-2.5 rounded-xl text-primary-foreground text-sm font-bold bg-primary hover:bg-primary/90 transition flex items-center gap-2 disabled:opacity-50 shadow-lg shadow-primary/25"
        >
          {isBankImporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileCheck className="h-4 w-4" />}
          სრული იმპორტი
        </button>
      </div>
    </div>
  </div>
)}
```

---

# ════════════════════════════════════════════
# დავალება 2: აუდიტის ლოგების ტაბის დამატება
# ════════════════════════════════════════════

## რა უნდა გაკეთდეს:
Accounting.tsx-ის accountingTabs მასივში დაამატე ახალი "audit" ტაბი. შემდეგ აგენერირე შესაბამისი UI, რომელიც `audit_log` ტაბლიციდან წამოიღებს მონაცემებს.

## ფაილი: `src/components/admin-new/Accounting.tsx`

### ნაბიჯი 2.1 — ტაბის დამატება

მოძებნე `accountingTabs` მასივი:
```tsx
const accountingTabs = [
  { id: "dashboard", label: "დეშბორდი", icon: <BarChart3 className="h-4 w-4" /> },
  ...
  { id: "reports", label: "ანგ.", icon: <FileBarChart className="h-4 w-4" /> },
]
```

**ბოლოს, `reports`-ის შემდეგ**, დაამატე:
```tsx
  { id: "audit", label: "აუდიტი", icon: <Eye className="h-4 w-4" /> },
```

### ნაბიჯი 2.2 — აუდიტის მონაცემების state

მოძებნე state-ების სექცია (სადაც `companySettings` განიმარტება) და დაამატე:
```tsx
const [auditLogs, setAuditLogs] = useState<any[]>([])
const [auditTableFilter, setAuditTableFilter] = useState("all")
```

### ნაბიჯი 2.3 — Fetch ლოგიკა

`fetchData` ფუნქციის შიგნით, `Promise.all` მასივში დაამატე:
```tsx
supabase.from("audit_log").select("*, changed_by_user:changed_by(email, full_name)").order("changed_at", { ascending: false }).limit(100),
```

და შესაბამის result-ის destructuring-ში დაამატე და set-ი:
```tsx
// ბოლო result ცვლადად:
if (auditRes?.data) setAuditLogs(auditRes.data)
```

**შენიშვნა**: თუ audit_log ტაბლიცა Supabase-ში არ არსებობს, ეს fetch უბრალოდ ცარიელ მასივს დააბრუნებს — პანელი არ დაიქრაშება (`?.data` null safety).

### ნაბიჯი 2.4 — აუდიტი ტაბის UI რენდერი

Accounting.tsx-ში მოძებნე ადგილი სადაც ტაბების შიგთავსი რენდერდება (მაგალითად `{activeTab === "reports" && (...)}` ბლოკის შემდეგ) და დაამატე:

```tsx
{activeTab === "audit" && (
  <div className="space-y-4">
    <div className="flex items-center justify-between bg-card p-4 rounded-xl border border-border/50">
      <h3 className="font-semibold text-foreground flex items-center gap-2">
        <Eye className="h-5 w-5 text-amber-500" /> სისტემური აუდიტი
      </h3>
      <select
        value={auditTableFilter}
        onChange={(e) => setAuditTableFilter(e.target.value)}
        className="text-xs rounded-lg border border-border bg-background px-3 py-2 focus:border-primary outline-none"
      >
        <option value="all">ყველა ცხრილი</option>
        <option value="journal_entries">ჟურნალები</option>
        <option value="invoices">ინვოისები</option>
        <option value="vat_declarations">დღგ</option>
        <option value="payroll_runs">ხელფასები</option>
        <option value="products">პროდუქტები</option>
      </select>
    </div>

    <div className="rounded-2xl border border-border/50 bg-card overflow-hidden">
      <table className="w-full text-left text-sm">
        <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
          <tr>
            <th className="px-4 py-3">დრო</th>
            <th className="px-4 py-3">მომხმარებელი</th>
            <th className="px-4 py-3">მოქმედება</th>
            <th className="px-4 py-3">ცხრილი</th>
            <th className="px-4 py-3">ჩანაწერი</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/50">
          {auditLogs
            .filter(l => auditTableFilter === "all" || l.table_name === auditTableFilter)
            .map(log => (
            <tr key={log.id} className="hover:bg-muted/50 transition-colors">
              <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(log.changed_at).toLocaleString('ka-GE')}</td>
              <td className="px-4 py-3">
                <p className="text-sm font-medium text-foreground">{log.changed_by_user?.full_name || 'SYSTEM'}</p>
                <p className="text-[10px] text-muted-foreground">{log.changed_by_user?.email || ''}</p>
              </td>
              <td className="px-4 py-3">
                <span className={cn(
                  "px-2 py-0.5 text-[10px] uppercase font-bold rounded",
                  log.action === 'INSERT' ? "bg-emerald-500/10 text-emerald-600" :
                  log.action === 'UPDATE' ? "bg-blue-500/10 text-blue-600" :
                  "bg-red-500/10 text-red-600"
                )}>{log.action}</span>
              </td>
              <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{log.table_name}</td>
              <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{log.record_id?.slice(0,8)}...</td>
            </tr>
          ))}
          {auditLogs.filter(l => auditTableFilter === "all" || l.table_name === auditTableFilter).length === 0 && (
            <tr><td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">ჩანაწერები ვერ მოიძებნა</td></tr>
          )}
        </tbody>
      </table>
    </div>
  </div>
)}
```

---

# ════════════════════════════════════════════
# დავალება 3: RS.ge სრული ინტეგრაცია
# ════════════════════════════════════════════

## რა უნდა გაკეთდეს:
Accounting.tsx-ის "waybills" (RS.ge) ტაბზე, ამჟამად მხოლოდ ტაბლიცაა. დაამატე:
1. ზედნადების **გააქტიურების** ღილაკი (DRAFT → ACTIVE)
2. ზედნადების **დახურვის** ღილაკი (ACTIVE → CLOSED)
3. ინფო-ბარათი RS.ge მოკის რეჟიმის შესახებ

## ფაილი: `src/components/admin-new/Accounting.tsx`

### ნაბიჯი 3.1 — RS.ge სერვისის იმპორტი

ფაილის დასაწყისში, იმპორტების შემდეგ (სადაც supabase იმპორტდება), დაამატე:
```tsx
import { activateOrderWaybill, closeOrderWaybill } from "@/src/services/rsge/rsge.service"
```

**თუ ეს ფაილი არ არსებობს ან იმპორტი ვერ მოხერხდა** — გამოიყენე პირდაპირ Supabase update:

```tsx
// Fallback - RS.ge service import-ის ნაცვლად
const handleActivateWaybill = async (waybillId: string) => {
  const { error } = await supabase.from("waybills").update({ status: "ACTIVE", activated_at: new Date().toISOString() }).eq("id", waybillId)
  if (error) alert("შეცდომა: " + error.message)
  else fetchData()
}
const handleCloseWaybill = async (waybillId: string) => {
  const { error } = await supabase.from("waybills").update({ status: "CLOSED", closed_at: new Date().toISOString() }).eq("id", waybillId)
  if (error) alert("შეცდომა: " + error.message)
  else fetchData()
}
```

### ნაბიჯი 3.2 — waybills ტაბის UI განახლება

Accounting.tsx-ში მოძებნე ადგილი სადაც `waybills` ტაბი რენდერდება. ტაბლიცაში **დაამატე ღილაკების სვეტი** Actions-ითვის. ტაბლიცის ბოლო `<th>` და `<td>`-ში:

**Header-ში:**
```tsx
<th className="px-4 py-3 text-right">მოქმედება</th>
```

**Body-ს row-ში:**
```tsx
<td className="px-4 py-3 text-right space-x-2">
  {w.status === 'DRAFT' && (
    <button
      onClick={() => handleActivateWaybill(w.id)}
      className="text-xs bg-emerald-500/10 text-emerald-600 px-3 py-1.5 rounded-lg font-bold hover:bg-emerald-500/20 transition"
    >
      გააქტიურება
    </button>
  )}
  {w.status === 'ACTIVE' && (
    <button
      onClick={() => handleCloseWaybill(w.id)}
      className="text-xs bg-amber-500/10 text-amber-600 px-3 py-1.5 rounded-lg font-bold hover:bg-amber-500/20 transition"
    >
      დახურვა
    </button>
  )}
  {(w.status === 'CLOSED' || w.status === 'CANCELLED') && (
    <span className="text-xs text-muted-foreground">—</span>
  )}
</td>
```

---

# ════════════════════════════════════════════
# დავალება 4: Manufacturing Excel ღილაკები
# ════════════════════════════════════════════

## რა უნდა გაკეთდეს:
Manufacturing.tsx-ის "raw-materials" ტაბზე დაამატე "ექსელით ატვირთვა" და "შაბლონის ჩამოტვირთვა" ღილაკები.

## ფაილი: `src/components/admin-new/Manufacturing.tsx`

### ნაბიჯი 4.1 — ref-ის დამატება

Manufacturing ფუნქციის შიგნით, სხვა state-ების გვერდზე, დაამატე (თუ უკვე არ არსებობს):
```tsx
const fileInputRef = useRef<HTMLInputElement>(null)
```

### ნაბიჯი 4.2 — Download Template ფუნქცია

`handleSaveRecipe` ფუნქციის ზემოთ ან ქვემოთ დაამატე:
```tsx
const downloadExcelTemplate = () => {
  const wsData = [
    { დასახელება: 'MDF 16მმ თეთრი', ერთეული: 'მ²', რაოდენობა: 0, მინ_ზღვარი: 5, ერთ_ფასი: 25.5, მეტრიკა_შეფუთვაში: 'ფილა', შეფუთვაში: 5.79, შენიშვნა: '' }
  ]
  const ws = XLSX.utils.json_to_sheet(wsData)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, "ნედლეული")
  XLSX.writeFile(wb, "nedleuli_shabloni.xlsx")
}

const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = async (evt) => {
    try {
      const bstr = evt.target?.result
      const wb = XLSX.read(bstr, { type: 'binary' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const data = XLSX.utils.sheet_to_json(ws)
      if (data.length === 0) { alert('ფაილი ცარიელია'); return }
      const materialsToInsert = data.map((row: any) => ({
        name: row['დასახელება'],
        unit: row['ერთეული'] || 'ცალი',
        quantity: Number(row['რაოდენობა'] || 0),
        reorder_point: Number(row['მინ_ზღვარი'] || 5),
        unit_cost: Number(row['ერთ_ფასი'] || 0),
        package_unit: row['მეტრიკა_შეფუთვაში'] || null,
        units_per_package: Number(row['შეფუთვაში'] || 0),
        notes: row['შენიშვნა'] || ''
      })).filter((m: any) => m.name)
      if (materialsToInsert.length === 0) { alert('ვალიდური მონაცემები ვერ მოიძებნა'); return }
      const { error } = await supabase.from('raw_materials').insert(materialsToInsert)
      if (error) throw error
      alert(`აიტვირთა ${materialsToInsert.length} ნედლეული ✓`)
      fetchData()
    } catch (err: any) {
      alert('შეცდომა: ' + err.message)
    }
    if (fileInputRef.current) fileInputRef.current.value = ''
  }
  reader.readAsBinaryString(file)
}
```

### ნაბიჯი 4.3 — ღილაკების UI

`renderRawMaterialsTab()` ფუნქციაში, header-ის ბლოკში (სადაც "ახალი ნედლეული" ღილაკია), **ღილაკის წინ** დაამატე:

```tsx
<button onClick={downloadExcelTemplate} className="flex items-center gap-2 text-xs font-bold text-muted-foreground bg-muted hover:bg-muted/80 px-3 py-2 rounded-lg transition">
  <Download size={14} /> შაბლონი
</button>
<button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 text-xs font-bold text-blue-600 bg-blue-500/10 hover:bg-blue-500/20 px-3 py-2 rounded-lg transition">
  <Upload size={14} /> ექსელით ატვირთვა
</button>
<input type="file" ref={fileInputRef} accept=".xlsx,.xls" onChange={handleExcelUpload} className="hidden" />
```

---

# ════════════════════════════════════════════
# ✅ ვერიფიკაციის ჩეკლისტი
# ════════════════════════════════════════════

დავალებების შესრულების შემდეგ გაუშვი `npm run dev` და გადაამოწმე:

1. [ ] **ბუღალტერია > ჟურნალი** — "საბანკო იმპორტი" ღილაკი ჩანს? დაკლიკვისას მოდალი იხსნება?
2. [ ] **ბუღალტერია > აუდიტი** — ახალი ტაბი ჩანს? ტაბლიცა იტვირთება? (თუ audit_log ტაბლიცა ცარიელია, "ჩანაწერები ვერ მოიძებნა" უნდა ჩანდეს)
3. [ ] **ბუღალტერია > RS.ge** — ზედნადებების ტაბლიცაში "გააქტიურება" / "დახურვა" ღილაკები ჩანს?
4. [ ] **წარმოება > ნედლეულის აღრიცხვა** — "შაბლონი" და "ექსელით ატვირთვა" ღილაკები ჩანს?
5. [ ] აპლიკაცია არ იქრაშება — console-ში წითელი შეცდომა არ არის?

---

# ⛔ რა არ უნდა გაკეთდეს:

- ❌ არ შექმნა ახალი ფაილები (ყველა ცვლილება არსებულ ფაილებშია)
- ❌ არ შეცვალო Sidebar.tsx, Header.tsx, AdminPanel.tsx — ტაბ-ნავიგაცია უკვე სრულია
- ❌ არ გამოიყენო ძველი ფერები (admin-bg, admin-text, admin-card, brand-900)
- ❌ არ წაშალო არსებული ფუნქციონალი
- ❌ არ დააინსტალირო ახალი npm პაკეტები
- ❌ არ შეცვალო Supabase-ის ტაბლიცების სტრუქტურა
- ❌ არ გამოიყენო TailwindCSS class-ები რომლებიც პროექტში არ არის კონფიგურირებული
