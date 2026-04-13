import { useState, useEffect, useCallback } from "react"
import { motion } from "framer-motion"
import { Loader2 } from "lucide-react"
import { Sidebar } from "@/src/components/admin-new/Sidebar"
import { Header } from "@/src/components/admin-new/Header"
import { Dashboard } from "@/src/components/admin-new/Dashboard"
import { Products } from "@/src/components/admin-new/Products"
import { Sales } from "@/src/components/admin-new/Sales"
import { Categories } from "@/src/components/admin-new/Categories"
import { Orders } from "@/src/components/admin-new/Orders"
import { POSModule } from "@/src/components/admin-new/POSModule"
import { Accounting } from "@/src/components/admin-new/Accounting"
import { Manufacturing } from "@/src/components/admin-new/Manufacturing"
import { Team } from "@/src/components/admin-new/Team"
import { Messages } from "@/src/components/admin-new/Messages"
import { Settings } from "@/src/components/admin-new/Settings"
import { Guide } from "@/src/components/admin-new/Guide"

import { supabase } from "@/src/lib/supabase"
import { useAuth } from "@/src/context/AuthContext"
import type { Product, Category } from "@/src/types/product"

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
  const { user, profile, isAdmin, isConsultant, isAccountant, isAuthorized, isLoading: authLoading, signIn, signOut } = useAuth()
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [activeTab, setActiveTab] = useState("statistics")
  const [searchQuery, setSearchQuery] = useState("")

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

  // ── Data Fetching ──
  useEffect(() => {
    if (isAuthorized && !authLoading) {
      fetchData()
    }
  }, [isAuthorized, authLoading])

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    try {
      const [prodRes, catRes, orderRes, msgRes] = await Promise.all([
        supabase.from("products").select("*").order("created_at", { ascending: false }),
        supabase.from("categories").select("*").order("created_at", { ascending: true }),
        supabase.from("orders").select("*").order("created_at", { ascending: false }),
        supabase.from("contact_messages").select("id", { count: "exact" }).eq("read", false),
      ])
      if (prodRes.data) setProducts(prodRes.data)
      if (catRes.data) setCategories(catRes.data)
      if (orderRes.data) setOrders(orderRes.data)
      if (msgRes.count !== null) setUnreadMessagesCount(msgRes.count)
    } catch (err) {
      console.error("Error fetching data:", err)
    } finally {
      setIsLoading(false)
    }
  }, [])

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

    if (isEditing && editId) {
      const { error } = await supabase.from("products").update(payload).eq("id", editId)
      if (error) {
        alert("შეცდომა განახლებისას: " + error.message)
        return false
      }
    } else {
      const { error } = await supabase.from("products").insert([payload])
      if (error) {
        alert("შეცდომა დამატებისას: " + error.message)
        return false
      }
    }

    await fetchData()
    setIsProductModalOpen(false)
    return true
  }

  const handleDeleteProduct = async (id: string) => {
    if (!confirm("ნამდვილად გსურთ პროდუქტის წაშლა?")) return
    const { error } = await supabase.from("products").delete().eq("id", id)
    if (error) {
      alert("შეცდომა: " + error.message)
      return
    }
    await fetchData()
  }

  const handleStopSale = async (id: string) => {
    if (!confirm("ნამდვილად გსურთ აქციის შეწყვეტა?")) return
    const { error } = await supabase.from("products").update({ is_on_sale: false }).eq("id", id)
    if (error) {
      alert("შეცდომა: " + error.message)
      return
    }
    await fetchData()
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
        const { error: catError } = await supabase.from("categories").update({
          name: catData.name,
          image: catData.image
        }).eq("id", editId)
        if (catError) throw catError

        // If name changed, update all products in this category
        if (oldName && oldName !== catData.name) {
          await supabase.from("products").update({ category: catData.name }).eq("category", oldName)
        }
      } else {
        const { error: catError } = await supabase.from("categories").insert([{
          name: catData.name,
          image: catData.image
        }])
        if (catError) throw catError
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

    const { error } = await supabase.from("categories").delete().eq("id", cat.id)
    if (error) {
      alert("შეცდომა: " + error.message)
      return
    }
    await fetchData()
  }

  // ── Order Handlers ──
  const handleStatusUpdate = async (orderId: string, newStatus: string, paymentMethod?: string) => {
    const updatePayload: any = { status: newStatus }
    if (paymentMethod) updatePayload.payment_method = paymentMethod

    const { error } = await supabase.from("orders").update(updatePayload).eq("id", orderId)
    if (error) {
      alert("შეცდომა სტატუსის შეცვლისას: " + error.message)
      return false
    }

    // If delivered, trigger accounting RPC
    if (newStatus === "delivered") {
      try {
        const { data: rpcResult, error: rpcError } = await supabase.rpc("process_order_sale", {
          p_order_id: orderId
        })
        if (rpcError) {
          console.error("Accounting entry error:", rpcError)
          alert("⚠️ შეკვეთა დასრულდა, მაგრამ ბუღალტრული გატარება ვერ მოხერხდა: " + rpcError.message)
        } else if (rpcResult && !rpcResult.success) {
          alert("⚠️ " + (rpcResult.error || "ბუღალტრული გატარება ვერ მოხერხდა"))
        }
      } catch (err) {
        console.error("RPC call failed:", err)
      }
    }

    await fetchData()
    return true
  }

  const handleDeleteOrder = async (id: string) => {
    if (!confirm("ნამდვილად გსურთ შეკვეთის წაშლა?")) return
    const { error } = await supabase.from("orders").delete().eq("id", id)
    if (error) {
      alert("შეცდომა: " + error.message)
      return
    }
    await fetchData()
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
  const renderContent = () => {
    switch (activeTab) {
      case "statistics":
        return <Dashboard orders={orders} products={products} />
      case "products":
        return (
          <Products
            products={products}
            categories={categories}
            searchQuery={searchQuery}
            onRefresh={fetchData}
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
        )
      case "sales":
        return <Sales products={products} onStopSale={handleStopSale} onEdit={handleOpenEditProduct} />
      case "categories":
        return (
          <Categories
            categories={categories}
            products={products}
            onRefresh={fetchData}
            onAdd={handleOpenAddCategory}
            onEdit={handleOpenEditCategory}
            onDelete={handleDeleteCategory}
            onSave={handleSaveCategory}
            onImageUpload={handleImageUpload}
            isModalOpen={isCategoryModalOpen}
            setIsModalOpen={setIsCategoryModalOpen}
            editingCategory={editingCategory}
          />
        )
      case "orders":
        return (
          <Orders
            orders={orders}
            searchQuery={searchQuery}
            onRefresh={fetchData}
            canDeleteOrders={canDeleteOrders}
            onStatusUpdate={handleStatusUpdate}
            onDeleteOrder={handleDeleteOrder}
          />
        )
      case "showroom":
        return (
          <POSModule
            products={products}
            onRefresh={fetchData}
            consultantId={user?.id}
          />
        )
      case "accounting":
        if (!canViewAccounting) {
          return (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-border/50 bg-card py-20">
              <p className="text-muted-foreground">თქვენ არ გაქვთ ბუღალტერიის ნახვის უფლება</p>
            </div>
          )
        }
        return <Accounting />
      case "manufacturing":
        return <Manufacturing />
      case "team":
        return <Team />
      case "messages":
        return <Messages />
      case "settings":
        return <Settings />
      case "guide":
        return <Guide />
      default:
        return <Dashboard orders={orders} products={products} />
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
            renderContent()
          )}
        </div>
      </main>
    </div>
  )
}

// Default export for App.tsx compatibility
export default AdminPanel
