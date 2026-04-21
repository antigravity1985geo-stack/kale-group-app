import React, { useState, useEffect, useCallback, Suspense } from "react"
import { useQuery } from "@tanstack/react-query"
import { Helmet } from "react-helmet-async"
import { motion } from "framer-motion"
import { Loader2 } from "lucide-react"
import { Sidebar } from "@/src/components/admin-new/Sidebar"
import { Header } from "@/src/components/admin-new/Header"

// Lazy loaded components for code splitting
const Dashboard = React.lazy(() => import("@/src/components/admin-new/Dashboard").then(m => ({ default: m.Dashboard })));
const Products = React.lazy(() => import("@/src/components/admin-new/Products").then(m => ({ default: m.Products })));
const Sales = React.lazy(() => import("@/src/components/admin-new/Sales").then(m => ({ default: m.Sales })));
const Categories = React.lazy(() => import("@/src/components/admin-new/Categories").then(m => ({ default: m.Categories })));
const Orders = React.lazy(() => import("@/src/components/admin-new/Orders").then(m => ({ default: m.Orders })));
const POSModule = React.lazy(() => import("@/src/components/admin-new/POSModule").then(m => ({ default: m.POSModule })));
const Accounting = React.lazy(() => import("@/src/components/admin-new/Accounting").then(m => ({ default: m.Accounting })));
const Manufacturing = React.lazy(() => import("@/src/components/admin-new/Manufacturing").then(m => ({ default: m.Manufacturing })));
const Team = React.lazy(() => import("@/src/components/admin-new/Team").then(m => ({ default: m.Team })));
const Messages = React.lazy(() => import("@/src/components/admin-new/Messages").then(m => ({ default: m.Messages })));
const Settings = React.lazy(() => import("@/src/components/admin-new/Settings").then(m => ({ default: m.Settings })));
const Guide = React.lazy(() => import("@/src/components/admin-new/Guide").then(m => ({ default: m.Guide })));
const AdminAIChatbot = React.lazy(() => import("@/src/components/admin-new/AdminAIChatbot").then(m => ({ default: m.AdminAIChatbot })));

import { supabase } from "@/src/lib/supabase"
import { safeFetch } from "@/src/utils/safeFetch"
import { useAuth } from "@/src/context/AuthContext"
import ProtectedRoute from "@/src/components/ProtectedRoute"
import { ErrorBoundary } from "@/src/components/ui/ErrorBoundary"
import type { Product, Category } from "@/src/types/product"
import { RealtimeNotifications } from "@/src/components/admin-new/RealtimeNotifications"

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

// Role-based tab permissions
const ROLE_TABS: Record<string, string[]> = {
  admin: ["statistics", "products", "sales", "categories", "orders", "showroom", "accounting", "manufacturing", "team", "messages", "settings", "guide"],
  accountant: ["statistics", "accounting", "guide"],
  consultant: ["statistics", "products", "sales", "categories", "orders", "showroom", "messages", "guide"],
}

const DEFAULT_TAB: Record<string, string> = {
  admin: "statistics",
  accountant: "accounting",
  consultant: "showroom",
}

export function AdminPanel() {
  const { user, profile, isAdmin, isConsultant, isAccountant, isAuthorized, isLoading: authLoading, signIn, signOut } = useAuth()
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [activeTab, setActiveTab] = useState("statistics")
  const [searchQuery, setSearchQuery] = useState("")

  // Determine user role string
  const userRole: "admin" | "consultant" | "accountant" = isAdmin ? "admin" : isAccountant ? "accountant" : "consultant"
  const allowedTabs = ROLE_TABS[userRole] || ROLE_TABS.consultant

  // Set default tab based on role when profile loads
  useEffect(() => {
    if (profile?.role) {
      const defaultTab = DEFAULT_TAB[profile.role] || "statistics"
      setActiveTab(defaultTab)
    }
  }, [profile?.role])

  // Core data
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [orders, setOrders] = useState<any[]>([])
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  // Auth form
  const [authForm, setAuthForm] = useState({ email: "", password: "" })

  // Product modal
  const [isProductModalOpen, setIsProductModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)

  // Category modal
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)

  // Permission helpers
  const canAddProducts = isAdmin || isConsultant
  const canEditProducts = isAdmin || isConsultant
  const canDeleteProducts = isAdmin
  const canDeleteOrders = isAdmin
  const canManageTeam = isAdmin
  const canViewAccounting = isAdmin || isAccountant

  // ── Theme ──
  useEffect(() => {
    const savedTheme = localStorage.getItem("adminTheme")
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
    const shouldBeDark = savedTheme === "dark" || (!savedTheme && prefersDark)
    setIsDarkMode(shouldBeDark)
    document.documentElement.classList.toggle("dark", shouldBeDark)
    document.body.classList.toggle("admin-dark-mode", shouldBeDark)
  }, [])

  const toggleTheme = () => {
    const newMode = !isDarkMode
    setIsDarkMode(newMode)
    document.documentElement.classList.toggle("dark", newMode)
    document.body.classList.toggle("admin-dark-mode", newMode)
    localStorage.setItem("adminTheme", newMode ? "dark" : "light")
  }

  // ── Data Fetching with React Query ──
  const { data: adminData, isLoading: queryLoading, refetch: fetchData } = useQuery({
    queryKey: ['adminData'],
    queryFn: async () => {
      const [prodRes, catRes, orderRes, msgRes] = await Promise.all([
        supabase.from("products").select("*").order("created_at", { ascending: false }),
        supabase.from("categories").select("*").order("created_at", { ascending: true }),
        supabase.from("orders").select("*").order("created_at", { ascending: false }),
        supabase.from("contact_messages").select("id", { count: "exact", head: true }).eq("read", false),
      ])
      return {
        products: prodRes.data || [],
        categories: catRes.data || [],
        orders: orderRes.data || [],
        unreadMessagesCount: msgRes.count || 0
      }
    },
    enabled: isAuthorized && !authLoading,
  })

  // Wrapper for child components expecting () => Promise<void>
  const handleRefresh = async () => {
    await fetchData()
  }

  // Sync query data with local state to preserve existing logic
  useEffect(() => {
    if (adminData) {
      setProducts(adminData.products)
      setCategories(adminData.categories)
      setOrders(adminData.orders)
      setUnreadMessagesCount(adminData.unreadMessagesCount)
    }
  }, [adminData])

  useEffect(() => {
    if (queryLoading !== undefined) {
      setIsLoading(queryLoading)
    }
  }, [queryLoading])

  // ── Auth Handlers ──
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const { error } = await signIn(authForm.email, authForm.password)
      if (error) throw error
    } catch (err: any) {
      alert("შესვლა ვერ მოხერხდა: " + err.message)
    }
  }

  const handleLogout = async () => {
    await signOut()
    window.location.href = "/"
  }

  // ── Product CRUD ──
  const handleOpenAddProduct = () => {
    setEditingProduct(null)
    setIsProductModalOpen(true)
  }

  const handleOpenEditProduct = (product: Product) => {
    setEditingProduct(product)
    setIsProductModalOpen(true)
  }

  const handleSaveProduct = async (productData: Partial<Product>, isEditing: boolean, editId?: string) => {
    const imageArray = (productData.images && productData.images.length > 0)
      ? productData.images
      : ['https://via.placeholder.com/800x600?text=No+Image']

    const payload = {
      name: productData.name,
      category: productData.category,
      price: productData.price,
      description: productData.description || null,
      material: productData.material || null,
      warranty: productData.warranty || null,
      delivery: productData.delivery || null,
      manufacturing: productData.manufacturing || null,
      in_stock: productData.in_stock ?? true,
      is_on_sale: productData.is_on_sale ?? false,
      discount_percentage: productData.discount_percentage || 0,
      sale_price: productData.sale_price || null,
      sale_start_date: productData.sale_start_date || null,
      sale_end_date: productData.sale_end_date || null,
      images: imageArray,
      colors: productData.colors || [],
    }

    try {
      if (isEditing && editId) {
        await safeFetch(`/api/products/${editId}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        })
      } else {
        await safeFetch("/api/products", {
          method: "POST",
          body: JSON.stringify(payload),
        })
      }
    } catch (err: any) {
      alert((isEditing ? "შეცდომა განახლებისას: " : "შეცდომა დამატებისას: ") + err.message)
      return false
    }

    await fetchData()
    setIsProductModalOpen(false)
    return true
  }

  const handleDeleteProduct = async (id: string) => {
    if (!confirm("ნამდვილად გსურთ პროდუქტის წაშლა?")) return
    try {
      await safeFetch(`/api/products/${id}`, { method: "DELETE" })
      await fetchData()
    } catch (err: any) {
      alert("შეცდომა: " + err.message)
    }
  }

  const handleStopSale = async (id: string) => {
    if (!confirm("ნამდვილად გსურთ აქციის შეწყვეტა?")) return
    try {
      await safeFetch(`/api/products/${id}/stop-sale`, { method: "PATCH" })
      await fetchData()
    } catch (err: any) {
      alert("შეცდომა: " + err.message)
    }
  }

  // ── Category CRUD ──
  const handleOpenAddCategory = () => {
    setEditingCategory(null)
    setIsCategoryModalOpen(true)
  }

  const handleOpenEditCategory = (cat: Category) => {
    setEditingCategory(cat)
    setIsCategoryModalOpen(true)
  }

  const handleSaveCategory = async (catData: Partial<Category>, isEditing: boolean, editId?: string, oldName?: string) => {
    if (!catData.name || !catData.image) {
      alert("გთხოვთ მიუთითოთ კატეგორიის სახელი და ატვირთოთ სურათი.")
      return false
    }

    try {
      if (isEditing && editId) {
        await safeFetch(`/api/categories/${editId}`, {
          method: "PUT",
          body: JSON.stringify({
            name: catData.name,
            image: catData.image,
            oldName: oldName,
          }),
        })
      } else {
        await safeFetch("/api/categories", {
          method: "POST",
          body: JSON.stringify({ name: catData.name, image: catData.image }),
        })
      }

      await fetchData()
      setIsCategoryModalOpen(false)
      return true
    } catch (err: any) {
      alert("შეცდომა კატეგორიის შენახვისას: " + err.message)
      return false
    }
  }

  const handleDeleteCategory = async (cat: Category) => {
    const hasProducts = products.some(p => p.category === cat.name)
    if (hasProducts) {
      if (!confirm(`ამ კატეგორიაში არის პროდუქტები. ნამდვილად გსურთ წაშლა?`)) return
    } else {
      if (!confirm("ნამდვილად გსურთ კატეგორიის წაშლა?")) return
    }

    try {
      await safeFetch(`/api/categories/${cat.id}`, { method: "DELETE" })
      await fetchData()
    } catch (err: any) {
      alert("შეცდომა: " + err.message)
    }
  }

  // ── Order Handlers ──
  const handleStatusUpdate = async (orderId: string, newStatus: string, paymentMethod?: string) => {
    try {
      const result = await safeFetch<{ accounting?: any }>(`/api/orders/${orderId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus, ...(paymentMethod ? { payment_method: paymentMethod } : {}) }),
      })

      if (newStatus === "delivered" && result.accounting && result.accounting.success === false) {
        alert("⚠️ " + (result.accounting.error || "ბუღალტრული გატარება ვერ მოხერხდა"))
      }

      await fetchData()
      return true
    } catch (err: any) {
      alert("შეცდომა სტატუსის შეცვლისას: " + err.message)
      return false
    }
  }

  const handleDeleteOrder = async (id: string) => {
    if (!confirm("ნამდვილად გსურთ შეკვეთის წაშლა?")) return
    try {
      await safeFetch(`/api/orders/${id}`, { method: "DELETE" })
      await fetchData()
    } catch (err: any) {
      alert("შეცდომა: " + err.message)
    }
  }

  // ── Image Upload ──
  const handleImageUpload = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split(".").pop()
      const fileName = `${Math.random()}.${fileExt}`
      const { error: uploadError } = await supabase.storage.from("product-images").upload(fileName, file)
      if (uploadError) throw uploadError
      const { data } = supabase.storage.from("product-images").getPublicUrl(fileName)
      return data.publicUrl
    } catch (error: any) {
      alert("ატვირთვის შეცდომა: " + error.message)
      return null
    }
  }

  const currentConfig = tabConfig[activeTab] || tabConfig.statistics

  // ── Render Tab Content ──
  // Access denied component
  const AccessDenied = () => (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-border/50 bg-card py-20">
      <div className="text-4xl mb-4">🔒</div>
      <p className="text-foreground font-semibold text-lg">წვდომა შეზღუდულია</p>
      <p className="text-muted-foreground mt-2 text-sm">თქვენ არ გაქვთ ამ განყოფილების ნახვის უფლება</p>
    </div>
  )

  const renderContent = () => {
    // Check if the current tab is allowed for this role
    if (!allowedTabs.includes(activeTab)) {
      return <AccessDenied />
    }

    switch (activeTab) {
      case "statistics":
        return (
          <ProtectedRoute allowedRoles={["admin", "consultant", "accountant"]}>
            <Dashboard orders={orders} products={products} />
          </ProtectedRoute>
        )
      case "products":
        return (
          <ProtectedRoute allowedRoles={["admin", "consultant"]}>
            <Products
              products={products}
              categories={categories}
              searchQuery={searchQuery}
              onRefresh={handleRefresh}
              canEdit={canEditProducts}
              canDelete={canDeleteProducts}
              canAdd={canAddProducts}
              onAdd={handleOpenAddProduct}
              onEdit={handleOpenEditProduct}
              onDelete={handleDeleteProduct}
              onSave={handleSaveProduct}
              onImageUpload={handleImageUpload}
              isModalOpen={isProductModalOpen}
              setIsModalOpen={setIsProductModalOpen}
              editingProduct={editingProduct}
            />
          </ProtectedRoute>
        )
      case "sales":
        return (
          <ProtectedRoute allowedRoles={["admin", "consultant"]}>
            <Sales products={products} onStopSale={handleStopSale} onEdit={handleOpenEditProduct} />
          </ProtectedRoute>
        )
      case "categories":
        return (
          <ProtectedRoute allowedRoles={["admin", "consultant"]}>
            <Categories
              categories={categories}
              products={products}
              onRefresh={handleRefresh}
              onAdd={handleOpenAddCategory}
              onEdit={handleOpenEditCategory}
              onDelete={handleDeleteCategory}
              onSave={handleSaveCategory}
              onImageUpload={handleImageUpload}
              isModalOpen={isCategoryModalOpen}
              setIsModalOpen={setIsCategoryModalOpen}
              editingCategory={editingCategory}
            />
          </ProtectedRoute>
        )
      case "orders":
        return (
          <ProtectedRoute allowedRoles={["admin", "consultant"]}>
            <Orders
              orders={orders}
              searchQuery={searchQuery}
              onRefresh={handleRefresh}
              canDeleteOrders={canDeleteOrders}
              onStatusUpdate={handleStatusUpdate}
              onDeleteOrder={handleDeleteOrder}
            />
          </ProtectedRoute>
        )
      case "showroom":
        return (
          <ProtectedRoute allowedRoles={["admin", "consultant"]}>
            <POSModule
              products={products}
              onRefresh={handleRefresh}
              consultantId={user?.id}
            />
          </ProtectedRoute>
        )
      case "accounting":
        return (
          <ProtectedRoute allowedRoles={["admin", "accountant"]}>
            <Accounting />
          </ProtectedRoute>
        )
      case "manufacturing":
        return (
          <ProtectedRoute allowedRoles={["admin"]}>
            <Manufacturing />
          </ProtectedRoute>
        )
      case "team":
        return (
          <ProtectedRoute allowedRoles={["admin"]}>
            <Team />
          </ProtectedRoute>
        )
      case "messages":
        return (
          <ProtectedRoute allowedRoles={["admin", "consultant"]}>
            <Messages />
          </ProtectedRoute>
        )
      case "settings":
        return (
          <ProtectedRoute allowedRoles={["admin"]}>
            <Settings />
          </ProtectedRoute>
        )
      case "guide":
        return (
          <ProtectedRoute allowedRoles={["admin", "consultant", "accountant"]}>
            <Guide />
          </ProtectedRoute>
        )
      default:
        return (
          <ProtectedRoute allowedRoles={["admin", "consultant", "accountant"]}>
            <Dashboard orders={orders} products={products} />
          </ProtectedRoute>
        )
    }
  }

  // ── Loading State ──
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground text-sm tracking-widest uppercase">იტვირთება...</p>
      </div>
    )
  }

  // ── Login Screen ──
  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <Helmet>
          <meta name="robots" content="noindex, nofollow" />
          <title>Kale Group — Admin Panel</title>
        </Helmet>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-card p-8 rounded-2xl shadow-2xl border border-border/50"
        >
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary/10 flex items-center justify-center">
              <span className="text-3xl font-bold text-primary">K</span>
            </div>
            <h2 className="text-2xl font-bold text-foreground">Kale Group</h2>
            <p className="text-muted-foreground mt-1">ადმინ პანელში შესვლა</p>
          </div>

          {user && !isAuthorized && (
            <div className="mb-4 p-4 bg-destructive/10 border border-destructive/20 rounded-xl text-sm text-destructive">
              ⚠️ თქვენ არ გაქვთ ადმინისტრატორის ან კონსულტანტის უფლება.
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">ელ-ფოსტა</label>
              <input
                type="email"
                value={authForm.email}
                onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                placeholder="admin@example.com"
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">პაროლი</label>
              <input
                type="password"
                value={authForm.password}
                onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                placeholder="••••••••"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-all shadow-lg shadow-primary/25"
            >
              შესვლა
            </button>
          </form>
        </motion.div>
      </div>
    )
  }

  // ── Main Layout ──
  return (
    <div className="flex min-h-screen bg-background">
      <Helmet>
        <meta name="robots" content="noindex, nofollow" />
        <title>Kale Group — Admin Panel</title>
      </Helmet>
      {/* Ambient Background Blobs */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <motion.div
          animate={{ x: [0, 30, 0], y: [0, -20, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-amber-500/10 dark:bg-amber-500/5 blur-[120px] rounded-full"
        />
        <motion.div
          animate={{ x: [0, -20, 0], y: [0, 30, 0] }}
          transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/2 -left-40 w-[400px] h-[400px] bg-blue-500/10 dark:bg-blue-500/5 blur-[120px] rounded-full"
        />
        <motion.div
          animate={{ x: [0, 20, 0], y: [0, 20, 0] }}
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
        userRole={userRole}
        onLogout={handleLogout}
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
          onAdd={
            activeTab === "products" && canAddProducts ? handleOpenAddProduct :
            activeTab === "categories" && canAddProducts ? handleOpenAddCategory :
            undefined
          }
          addLabel={
            activeTab === "products" && canAddProducts ? currentConfig.addLabel :
            activeTab === "categories" && canAddProducts ? currentConfig.addLabel :
            undefined
          }
          onRefresh={fetchData}
          onLogout={handleLogout}
          userName={(profile as any)?.full_name || user?.email || ""}
          userRole={isAdmin ? "ადმინი" : isAccountant ? "ბუღალტერი" : "კონსულტანტი"}
          unreadMessagesCount={unreadMessagesCount}
        />

        <div className="p-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
              <p className="text-muted-foreground text-sm">მონაცემები იტვირთება...</p>
            </div>
          ) : (
            <ErrorBoundary
              fallback={
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="w-12 h-12 mb-3 rounded-full bg-destructive/10 flex items-center justify-center">
                    <svg className="w-6 h-6 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">მოდულის ჩატვირთვისას მოხდა შეცდომა</h3>
                  <p className="text-sm text-muted-foreground mt-2">გთხოვთ, სცადოთ სხვა ტაბის გახსნა ან გადატვირთოთ გვერდი.</p>
                  <button
                    onClick={() => window.location.reload()}
                    className="mt-4 px-4 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    განახლება
                  </button>
                </div>
              }
            >
              <Suspense fallback={
                <div className="flex flex-col items-center justify-center py-20">
                  <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
                  <p className="text-muted-foreground text-sm">მოდული იტვირთება...</p>
                </div>
              }>
                {renderContent()}
              </Suspense>
            </ErrorBoundary>
          )}
        </div>
      </main>

      <Suspense fallback={null}>
        <AdminAIChatbot />
      </Suspense>
      <RealtimeNotifications />
    </div>
  )
}

// Default export for App.tsx compatibility
export default AdminPanel
