"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Building2, Percent, Check, X } from "lucide-react"
import { cn } from "@/lib/utils"

export function Settings() {
  const [vatRegistered, setVatRegistered] = useState(true)
  const [installmentRate, setInstallmentRate] = useState(5)
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null)

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const handleVatToggle = () => {
    setVatRegistered(!vatRegistered)
    showToast(
      !vatRegistered ? "დღგ-ს გადამხდელი ჩართულია" : "დღგ-ს გადამხდელი გამორთულია",
      "success"
    )
  }

  const handleRateChange = (value: number) => {
    if (value >= 0 && value <= 50) {
      setInstallmentRate(value)
    }
  }

  const handleRateBlur = () => {
    showToast("განვადების საკომისიო შენახულია", "success")
  }

  const exampleTotal = 1000
  const exampleWithFee = exampleTotal + (exampleTotal * installmentRate) / 100

  return (
    <div className="space-y-6">
      {/* VAT Setting */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className={cn(
          "rounded-2xl border bg-card p-6 transition-all",
          vatRegistered ? "border-amber-500/50" : "border-border/50"
        )}
      >
        <div className="flex items-start gap-4">
          <div className={cn(
            "flex h-12 w-12 items-center justify-center rounded-xl",
            vatRegistered ? "bg-amber-500/20 text-amber-500" : "bg-muted text-muted-foreground"
          )}>
            <Building2 className="h-6 w-6" />
          </div>
          
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-foreground">დღგ-ს გადამხდელი</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  ჩართვისას 18% დღგ ავტომატურად გამოიანგარიშება ყველა ტრანზაქციაზე
                </p>
              </div>
              
              <button
                onClick={handleVatToggle}
                className={cn(
                  "relative h-7 w-12 rounded-full transition-colors",
                  vatRegistered ? "bg-amber-500" : "bg-muted"
                )}
              >
                <motion.span
                  layout
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  className={cn(
                    "absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm",
                    vatRegistered ? "right-1" : "left-1"
                  )}
                />
              </button>
            </div>

            {vatRegistered && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4 rounded-lg bg-amber-500/10 p-3 text-sm text-amber-600 dark:text-amber-400"
              >
                18% დღგ ავტომატურად დაემატება ყველა გაყიდვას და ინვოისს
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Installment Rate Setting */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.4 }}
        className="rounded-2xl border border-border/50 bg-card p-6"
      >
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-500/20 text-violet-500">
            <Percent className="h-6 w-6" />
          </div>
          
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-foreground">განვადების საკომისიო</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              განვადებით გადახდისას დამატებული პროცენტი
            </p>

            <div className="mt-4 flex items-center gap-4">
              <div className="relative w-32">
                <input
                  type="number"
                  min={0}
                  max={50}
                  step={0.5}
                  value={installmentRate}
                  onChange={(e) => handleRateChange(parseFloat(e.target.value))}
                  onBlur={handleRateBlur}
                  className="w-full rounded-lg border border-border bg-background px-4 py-2.5 pr-10 text-lg font-semibold text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
              </div>

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>მაგალითი:</span>
                <span className="font-medium text-foreground">₾ {exampleTotal.toLocaleString()}</span>
                <span>→</span>
                <span className="font-semibold text-primary">₾ {exampleWithFee.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: 20 }}
            animate={{ opacity: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, y: -20, x: 20 }}
            className={cn(
              "fixed right-6 top-6 z-50 flex items-center gap-3 rounded-xl px-4 py-3 shadow-lg",
              toast.type === "success"
                ? "bg-emerald-500 text-white"
                : "bg-red-500 text-white"
            )}
          >
            {toast.type === "success" ? (
              <Check className="h-5 w-5" />
            ) : (
              <X className="h-5 w-5" />
            )}
            <span className="text-sm font-medium">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
