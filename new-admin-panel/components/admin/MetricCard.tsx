"use client"

import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { TrendingUp, TrendingDown } from "lucide-react"

type CardVariant = 
  | "indigo"
  | "violet"
  | "coral" 
  | "gold" 
  | "sage" 
  | "teal" 
  | "olive" 
  | "rose" 
  | "cyan" 
  | "emerald" 
  | "blue" 
  | "pink"
  | "orange"

interface MetricCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: React.ReactNode
  variant?: CardVariant
  featured?: boolean
  trend?: {
    value: number
    isPositive: boolean
  }
  delay?: number
}

const variantStyles: Record<CardVariant, { 
  bg: string; 
  icon: string; 
  orb: string; 
  featuredBg: string;
  featuredIcon: string;
}> = {
  indigo: {
    bg: "from-indigo-500/10 to-indigo-500/5 dark:from-indigo-500/20 dark:to-indigo-500/5",
    icon: "bg-indigo-500/20 text-indigo-600 dark:bg-indigo-500/30 dark:text-indigo-400",
    orb: "bg-indigo-500/30",
    featuredBg: "bg-gradient-to-br from-indigo-500 to-indigo-600 dark:from-indigo-600 dark:to-indigo-700",
    featuredIcon: "bg-white/20 text-white",
  },
  violet: {
    bg: "from-violet-500/10 to-violet-500/5 dark:from-violet-500/20 dark:to-violet-500/5",
    icon: "bg-violet-500/20 text-violet-600 dark:bg-violet-500/30 dark:text-violet-400",
    orb: "bg-violet-500/30",
    featuredBg: "bg-gradient-to-br from-violet-500 to-violet-600 dark:from-violet-600 dark:to-violet-700",
    featuredIcon: "bg-white/20 text-white",
  },
  coral: {
    bg: "from-red-500/10 to-red-500/5 dark:from-red-500/20 dark:to-red-500/5",
    icon: "bg-red-500/20 text-red-600 dark:bg-red-500/30 dark:text-red-400",
    orb: "bg-red-500/30",
    featuredBg: "bg-gradient-to-br from-red-500 to-red-600 dark:from-red-600 dark:to-red-700",
    featuredIcon: "bg-white/20 text-white",
  },
  gold: {
    bg: "from-yellow-600/10 to-yellow-600/5 dark:from-yellow-500/20 dark:to-yellow-500/5",
    icon: "bg-yellow-600/20 text-yellow-700 dark:text-yellow-400",
    orb: "bg-yellow-500/30",
    featuredBg: "bg-gradient-to-br from-amber-500 to-amber-600 dark:from-amber-600 dark:to-amber-700",
    featuredIcon: "bg-white/20 text-white",
  },
  sage: {
    bg: "from-green-700/10 to-green-700/5 dark:from-green-600/20 dark:to-green-600/5",
    icon: "bg-green-700/20 text-green-800 dark:text-green-400",
    orb: "bg-green-600/30",
    featuredBg: "bg-gradient-to-br from-green-600 to-green-700 dark:from-green-700 dark:to-green-800",
    featuredIcon: "bg-white/20 text-white",
  },
  teal: {
    bg: "from-teal-600/10 to-teal-600/5 dark:from-teal-500/20 dark:to-teal-500/5",
    icon: "bg-teal-600/20 text-teal-700 dark:text-teal-400",
    orb: "bg-teal-500/30",
    featuredBg: "bg-gradient-to-br from-teal-500 to-teal-600 dark:from-teal-600 dark:to-teal-700",
    featuredIcon: "bg-white/20 text-white",
  },
  olive: {
    bg: "from-lime-700/10 to-lime-700/5 dark:from-lime-600/20 dark:to-lime-600/5",
    icon: "bg-lime-700/20 text-lime-800 dark:text-lime-400",
    orb: "bg-lime-600/30",
    featuredBg: "bg-gradient-to-br from-lime-600 to-lime-700 dark:from-lime-700 dark:to-lime-800",
    featuredIcon: "bg-white/20 text-white",
  },
  rose: {
    bg: "from-rose-500/10 to-rose-500/5 dark:from-rose-500/20 dark:to-rose-500/5",
    icon: "bg-rose-500/20 text-rose-600 dark:text-rose-400",
    orb: "bg-rose-500/30",
    featuredBg: "bg-gradient-to-br from-rose-500 to-rose-600 dark:from-rose-600 dark:to-rose-700",
    featuredIcon: "bg-white/20 text-white",
  },
  cyan: {
    bg: "from-cyan-600/10 to-cyan-600/5 dark:from-cyan-500/20 dark:to-cyan-500/5",
    icon: "bg-cyan-600/20 text-cyan-700 dark:text-cyan-400",
    orb: "bg-cyan-500/30",
    featuredBg: "bg-gradient-to-br from-cyan-500 to-cyan-600 dark:from-cyan-600 dark:to-cyan-700",
    featuredIcon: "bg-white/20 text-white",
  },
  emerald: {
    bg: "from-emerald-600/10 to-emerald-600/5 dark:from-emerald-500/20 dark:to-emerald-500/5",
    icon: "bg-emerald-600/20 text-emerald-700 dark:text-emerald-400",
    orb: "bg-emerald-500/30",
    featuredBg: "bg-gradient-to-br from-emerald-500 to-emerald-600 dark:from-emerald-600 dark:to-emerald-700",
    featuredIcon: "bg-white/20 text-white",
  },
  blue: {
    bg: "from-blue-600/10 to-blue-600/5 dark:from-blue-500/20 dark:to-blue-500/5",
    icon: "bg-blue-600/20 text-blue-700 dark:text-blue-400",
    orb: "bg-blue-500/30",
    featuredBg: "bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700",
    featuredIcon: "bg-white/20 text-white",
  },
  pink: {
    bg: "from-pink-500/10 to-pink-500/5 dark:from-pink-500/20 dark:to-pink-500/5",
    icon: "bg-pink-500/20 text-pink-600 dark:text-pink-400",
    orb: "bg-pink-500/30",
    featuredBg: "bg-gradient-to-br from-pink-500 to-pink-600 dark:from-pink-600 dark:to-pink-700",
    featuredIcon: "bg-white/20 text-white",
  },
  orange: {
    bg: "from-orange-500/10 to-orange-500/5 dark:from-orange-500/20 dark:to-orange-500/5",
    icon: "bg-orange-500/20 text-orange-600 dark:text-orange-400",
    orb: "bg-orange-500/30",
    featuredBg: "bg-gradient-to-br from-orange-500 to-orange-600 dark:from-orange-600 dark:to-orange-700",
    featuredIcon: "bg-white/20 text-white",
  },
}

export function MetricCard({
  title,
  value,
  subtitle,
  icon,
  variant = "gold",
  featured = false,
  trend,
  delay = 0,
}: MetricCardProps) {
  const styles = variantStyles[variant]

  return (
    <motion.div
      initial={{ y: 30, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay, duration: 0.4, ease: "easeOut" }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className={cn(
        "card-hover relative overflow-hidden rounded-2xl border p-6",
        featured 
          ? cn(styles.featuredBg, "border-transparent shadow-lg") 
          : "border-border/50 bg-card"
      )}
    >
      {/* Gradient Background - only for non-featured */}
      {!featured && (
        <div className={cn(
          "absolute inset-0 bg-gradient-to-br opacity-50",
          styles.bg
        )} />
      )}
      
      {/* Floating Orb */}
      <div className={cn(
        "absolute -right-8 -top-8 h-24 w-24 rounded-full blur-3xl animate-glow",
        featured ? "bg-white/20" : styles.orb
      )} />

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className={cn(
            "flex h-12 w-12 items-center justify-center rounded-xl",
            featured ? styles.featuredIcon : styles.icon
          )}>
            {icon}
          </div>
          
          {trend && (
            <div className={cn(
              "flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium",
              featured 
                ? "bg-white/20 text-white"
                : trend.isPositive 
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" 
                  : "bg-red-500/10 text-red-600 dark:text-red-400"
            )}>
              {trend.isPositive ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              <span>{trend.value}%</span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="mt-4">
          <p className={cn(
            "text-sm font-medium",
            featured ? "text-white/80" : "text-muted-foreground"
          )}>{title}</p>
          <p className={cn(
            "mt-1 text-3xl font-bold",
            featured ? "text-white" : "text-foreground"
          )}>{value}</p>
          {subtitle && (
            <p className={cn(
              "mt-1 text-xs",
              featured ? "text-white/70" : "text-muted-foreground"
            )}>{subtitle}</p>
          )}
        </div>
      </div>
    </motion.div>
  )
}
