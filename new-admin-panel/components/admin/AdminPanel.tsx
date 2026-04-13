"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Sidebar } from "./Sidebar"
import { Header } from "./Header"
import { Dashboard } from "./Dashboard"
import { Products } from "./Products"
import { Sales } from "./Sales"
import { Categories } from "./Categories"
import { Orders } from "./Orders"
import { POSModule } from "./POSModule"
import { Accounting } from "./Accounting"
import { Team } from "./Team"
import { Messages } from "./Messages"
import { Settings } from "./Settings"
import { Guide } from "./Guide"

const tabConfig: Record<string, { title: string; subtitle?: string; showSearch?: boolean; addLabel?: string }> = {
  statistics: { title: "სტატისტიკა", subtitle: "მთავარი მიმოხილვა და მეტრიკები", showSearch: false },
  products: { title: "პროდუქცია", subtitle: "პროდუქტების მართვა", showSearch: true, addLabel: "დამატება" },
  sales: { title: "აქციები", subtitle: "აქტიური აქციების მართვა", showSearch: false },
  categories: { title: "კატეგორიები", subtitle: "კატეგორიების მართვა", showSearch: false, addLabel: "ახალი კატეგორია" },
  orders: { title: "შეკვეთები", subtitle: "შეკვეთების ისტორია და მართვა", showSearch: true },
  showroom: { title: "შოურუმი (POS)", subtitle: "ადგილზე გაყიდვა", showSearch: false },
  accounting: { title: "ბუღალტერია", subtitle: "ფინანსური მართვა", showSearch: false },
  manufacturing: { title: "წარმოება და საწყობი", subtitle: "ნედლეული და წარმოება", showSearch: false },
  team: { title: "თანამშრომლები", subtitle: "გუნდის მართვა", showSearch: false, addLabel: "მოწვევა" },
  messages: { title: "შეტყობინებები", subtitle: "საკონტაქტო შეტყობინებები", showSearch: false },
  settings: { title: "პარამეტრები", subtitle: "კომპანიის პარამეტრები", showSearch: false },
  guide: { title: "სახელმძღვანელო", subtitle: "ადმინ პანელის გზამკვლევი", showSearch: false },
}

export function AdminPanel() {
  const [activeTab, setActiveTab] = useState("statistics")
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  // Initialize theme from localStorage and apply
  useEffect(() => {
    const savedTheme = localStorage.getItem("adminTheme")
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
    const shouldBeDark = savedTheme === "dark" || (!savedTheme && prefersDark)
    
    setIsDarkMode(shouldBeDark)
    document.documentElement.classList.toggle("dark", shouldBeDark)
  }, [])

  const toggleTheme = () => {
    const newMode = !isDarkMode
    setIsDarkMode(newMode)
    document.documentElement.classList.toggle("dark", newMode)
    localStorage.setItem("adminTheme", newMode ? "dark" : "light")
  }

  const currentConfig = tabConfig[activeTab] || tabConfig.statistics

  const renderContent = () => {
    switch (activeTab) {
      case "statistics":
        return <Dashboard />
      case "products":
        return <Products searchQuery={searchQuery} />
      case "sales":
        return <Sales />
      case "categories":
        return <Categories />
      case "orders":
        return <Orders searchQuery={searchQuery} />
      case "showroom":
        return <POSModule />
      case "accounting":
        return <Accounting />
      case "team":
        return <Team />
      case "messages":
        return <Messages />
      case "settings":
        return <Settings />
      case "guide":
        return <Guide />
      case "manufacturing":
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center rounded-2xl border border-border/50 bg-card py-20"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h3 className="mt-4 text-xl font-semibold text-foreground">წარმოება და საწყობი</h3>
            <p className="mt-2 text-muted-foreground">ეს მოდული მალე დაემატება</p>
          </motion.div>
        )
      default:
        return <Dashboard />
    }
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Ambient Background Blobs */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <motion.div
          animate={{
            x: [0, 30, 0],
            y: [0, -20, 0],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-amber-500/10 dark:bg-amber-500/5 blur-[120px] rounded-full"
        />
        <motion.div
          animate={{
            x: [0, -20, 0],
            y: [0, 30, 0],
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/2 -left-40 w-[400px] h-[400px] bg-blue-500/10 dark:bg-blue-500/5 blur-[120px] rounded-full"
        />
        <motion.div
          animate={{
            x: [0, 20, 0],
            y: [0, 20, 0],
          }}
          transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -bottom-40 right-1/4 w-[450px] h-[450px] bg-violet-500/10 dark:bg-violet-500/5 blur-[120px] rounded-full"
        />
      </div>

      {/* Sidebar */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab)
          setSearchQuery("")
        }}
      />

      {/* Main Content */}
      <main className="relative z-10 ml-[280px] flex-1 overflow-x-hidden">
        <Header
          title={currentConfig.title}
          subtitle={currentConfig.subtitle}
          isDarkMode={isDarkMode}
          onThemeToggle={toggleTheme}
          showSearch={currentConfig.showSearch}
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder={activeTab === "products" ? "პროდუქტის ძიება..." : "ძიება..."}
          onAdd={currentConfig.addLabel ? () => {} : undefined}
          addLabel={currentConfig.addLabel}
          onRefresh={() => {}}
        />

        <div className="p-6">
          {renderContent()}
        </div>
      </main>
    </div>
  )
}
