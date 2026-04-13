import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Settings as SettingsIcon, ToggleLeft, ToggleRight, Percent, CreditCard, Loader2, Save, CheckCircle } from "lucide-react"
import { cn } from "@/src/lib/utils"
import { supabase } from "@/src/lib/supabase"

interface CompanySetting {
  id: string
  key: string
  value: any
  description: string | null
}

export function Settings() {
  const [settings, setSettings] = useState<CompanySetting[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  // Derived values
  const [vatRegistered, setVatRegistered] = useState(false)
  const [installmentRate, setInstallmentRate] = useState(0)
  const [companyInfo, setCompanyInfo] = useState<any>({})

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from("company_settings")
        .select("*")
        .order("key")
      if (error) throw error
      if (data) {
        setSettings(data)
        // Parse values
        data.forEach((s) => {
          if (s.key === "vat_registered") setVatRegistered(s.value === true || s.value === "true")
          if (s.key === "installment_rate") setInstallmentRate(parseFloat(s.value) || 0)
          if (s.key === "company_info") setCompanyInfo(s.value || {})
        })
      }
    } catch (err) {
      console.error("Error fetching settings:", err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleToggleVat = async () => {
    const newVal = !vatRegistered
    setVatRegistered(newVal)
    const { error } = await supabase
      .from("company_settings")
      .update({ value: newVal })
      .eq("key", "vat_registered")
    if (error) {
      setVatRegistered(!newVal) // Rollback
      alert("შეცდომა: " + error.message)
    }
  }

  const handleSaveInstallmentRate = async () => {
    setIsSaving(true)
    const { error } = await supabase
      .from("company_settings")
      .update({ value: installmentRate })
      .eq("key", "installment_rate")
    if (error) {
      alert("შეცდომა: " + error.message)
    } else {
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 2000)
    }
    setIsSaving(false)
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
        <p className="text-muted-foreground text-sm">პარამეტრები იტვირთება...</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl space-y-6">
      {/* VAT Setting */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-border/50 bg-card overflow-hidden"
      >
        <div className="border-b border-border/50 px-6 py-4">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <Percent className="h-5 w-5 text-primary" />
            დღგ (VAT) კონფიგურაცია
          </h3>
        </div>
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground">დღგ-ის გადამხდელი</p>
              <p className="text-sm text-muted-foreground mt-1">
                ჩართვის შემთხვევაში, ყველა გაყიდვასა და ანგარიშ-ფაქტურაზე 18% დღგ გამოიანგარიშება
              </p>
            </div>
            <button
              onClick={handleToggleVat}
              className="flex-shrink-0 transition-transform hover:scale-105"
            >
              {vatRegistered ? (
                <ToggleRight className="h-10 w-10 text-primary" />
              ) : (
                <ToggleLeft className="h-10 w-10 text-muted-foreground" />
              )}
            </button>
          </div>

          <div className={cn(
            "mt-4 rounded-xl p-4 text-sm transition-colors",
            vatRegistered
              ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400"
              : "bg-muted text-muted-foreground"
          )}>
            {vatRegistered
              ? "✅ დღგ აქტიურია — 18% დაემატება ყველა გაყიდვას"
              : "ℹ️ დღგ გამორთულია — გაყიდვები დღგ-ის გარეშე"}
          </div>
        </div>
      </motion.div>

      {/* Installment Rate */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-2xl border border-border/50 bg-card overflow-hidden"
      >
        <div className="border-b border-border/50 px-6 py-4">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            განვადების პარამეტრები
          </h3>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">
              განვადების დამატებითი % (surcharge)
            </label>
            <p className="text-xs text-muted-foreground mb-3">
              განვადებით შეძენისას პროდუქტის ფასს ემატება ეს პროცენტი
            </p>
            <div className="flex items-center gap-4">
              <div className="relative flex-1 max-w-xs">
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.1}
                  value={installmentRate}
                  onChange={(e) => setInstallmentRate(parseFloat(e.target.value) || 0)}
                  className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 pr-10"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
              </div>
              <button
                onClick={handleSaveInstallmentRate}
                disabled={isSaving}
                className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors shadow-lg shadow-primary/25 disabled:opacity-50"
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : saveSuccess ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {saveSuccess ? "შენახულია!" : "შენახვა"}
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Company Info (Read-only display of existing settings) */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="rounded-2xl border border-border/50 bg-card overflow-hidden"
      >
        <div className="border-b border-border/50 px-6 py-4">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <SettingsIcon className="h-5 w-5 text-primary" />
            სისტემის ინფორმაცია
          </h3>
        </div>
        <div className="p-6 space-y-3">
          {settings.map((s) => (
            <div key={s.id} className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-foreground">{s.key}</p>
                {s.description && <p className="text-xs text-muted-foreground mt-0.5">{s.description}</p>}
              </div>
              <span className="text-sm text-foreground font-mono">
                {typeof s.value === "object" ? JSON.stringify(s.value).slice(0, 50) : String(s.value)}
              </span>
            </div>
          ))}

          {settings.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">პარამეტრები არ მოიძებნა</p>
          )}
        </div>
      </motion.div>
    </div>
  )
}
