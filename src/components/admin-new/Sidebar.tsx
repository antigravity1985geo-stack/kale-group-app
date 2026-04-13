import { motion } from "framer-motion"
import {
  BarChart3,
  Package,
  Tags,
  FolderTree,
  ShoppingCart,
  Store,
  Calculator,
  Factory,
  Users,
  MessageSquare,
  Settings,
  BookOpen,
  LogOut,
  ChevronRight,
} from "lucide-react"
import { cn } from "@/src/lib/utils"

type NavItem = {
  id: string
  label: string
  icon: React.ReactNode
  badge?: number
}

const navItems: NavItem[] = [
  { id: "statistics", label: "სტატისტიკა", icon: <BarChart3 className="h-5 w-5" /> },
  { id: "products", label: "პროდუქცია", icon: <Package className="h-5 w-5" /> },
  { id: "sales", label: "აქციები", icon: <Tags className="h-5 w-5" /> },
  { id: "categories", label: "კატეგორიები", icon: <FolderTree className="h-5 w-5" /> },
  { id: "orders", label: "შეკვეთები", icon: <ShoppingCart className="h-5 w-5" />, badge: 3 },
  { id: "showroom", label: "შოურუმი (POS)", icon: <Store className="h-5 w-5" /> },
  { id: "accounting", label: "ბუღალტერია", icon: <Calculator className="h-5 w-5" /> },
  { id: "manufacturing", label: "წარმოება და საწყობი", icon: <Factory className="h-5 w-5" /> },
  { id: "team", label: "თანამშრომლები", icon: <Users className="h-5 w-5" /> },
  { id: "messages", label: "შეტყობინებები", icon: <MessageSquare className="h-5 w-5" />, badge: 5 },
  { id: "settings", label: "პარამეტრები", icon: <Settings className="h-5 w-5" /> },
  { id: "guide", label: "სახელმძღვანელო", icon: <BookOpen className="h-5 w-5" /> },
]

interface SidebarProps {
  activeTab: string
  onTabChange: (tab: string) => void
  userRole?: "admin" | "consultant" | "accountant"
}

export function Sidebar({ activeTab, onTabChange, userRole = "admin" }: SidebarProps) {
  const roleColors = {
    admin: "bg-sidebar-primary/20 text-sidebar-primary border-sidebar-primary/30",
    consultant: "bg-teal-500/20 text-teal-400 border-teal-500/30 dark:bg-teal-500/20 dark:text-teal-400",
    accountant: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30 dark:bg-emerald-500/20 dark:text-emerald-400",
  }

  const roleLabels = {
    admin: "ადმინისტრატორი",
    consultant: "კონსულტანტი",
    accountant: "ბუღალტერი",
  }

  return (
    <motion.aside
      initial={{ x: -300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="fixed left-0 top-0 z-40 flex h-screen w-[280px] flex-col bg-sidebar"
    >
      {/* Logo & User Section */}
      <div className="flex flex-col items-center gap-4 border-b border-sidebar-border px-6 py-8">
        {/* Logo */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          className="relative"
        >
          <div className="absolute -inset-3 rounded-full bg-sidebar-primary/20 blur-xl animate-glow" />
          <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-sidebar-primary to-sidebar-primary/70 shadow-lg shadow-sidebar-primary/25">
            <span className="text-2xl font-bold text-sidebar-primary-foreground">K</span>
          </div>
        </motion.div>
        
        <div className="text-center">
          <h1 className="text-xl font-bold text-sidebar-foreground">KaleAdmin</h1>
          <div className={cn(
            "mt-2 inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium",
            roleColors[userRole]
          )}>
            {roleLabels[userRole]}
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-6">
        <div className="space-y-1">
          {navItems.map((item, index) => (
            <motion.button
              key={item.id}
              initial={{ x: -50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.1 + index * 0.03, duration: 0.3 }}
              onClick={() => onTabChange(item.id)}
              className={cn(
                "group relative flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-300",
                activeTab === item.id
                  ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-lg shadow-sidebar-primary/25"
                  : "text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground"
              )}
            >
              {/* Active indicator */}
              {activeTab === item.id && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-sidebar-primary-foreground"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
              
              <span className={cn(
                "transition-transform duration-300",
                activeTab === item.id ? "scale-110" : "group-hover:scale-110"
              )}>
                {item.icon}
              </span>
              
              <span className="flex-1 text-left">{item.label}</span>
              
              {item.badge && (
                <span className={cn(
                  "flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold",
                  activeTab === item.id
                    ? "bg-sidebar-foreground/20 text-sidebar-primary-foreground"
                    : "bg-sidebar-primary/20 text-sidebar-primary"
                )}>
                  {item.badge}
                </span>
              )}
              
              <ChevronRight className={cn(
                "h-4 w-4 opacity-0 transition-all duration-300",
                activeTab === item.id ? "opacity-100" : "group-hover:opacity-50"
              )} />
            </motion.button>
          ))}
        </div>
      </nav>

      {/* Logout Button */}
      <div className="border-t border-sidebar-border p-4">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="flex w-full items-center gap-3 rounded-xl bg-red-500/10 px-4 py-3 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/20 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20"
        >
          <LogOut className="h-5 w-5" />
          <span>გასვლა</span>
        </motion.button>
      </div>
    </motion.aside>
  )
}
