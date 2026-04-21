import React, { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Factory, Package, Plus, Save, Download, Upload,
  TestTube, AlertTriangle, Truck, Key, Trash2, Edit3, Loader2,
  List, Copy, CheckCircle, RefreshCw, X, Minus, ShoppingCart, ArrowRightLeft, DollarSign, ArrowDownRight
} from "lucide-react"
import { supabase } from "@/src/lib/supabase"
import { safeFetch } from "@/src/utils/safeFetch"
// xlsx is dynamically imported inside handlers (saves ~425 kB from initial bundle)
import { cn } from "@/src/lib/utils"
import { useAuth } from "@/src/context/AuthContext"
import OffcutInventory from "./OffcutInventory"
import Procurement from "./manufacturing/Procurement"

type ModuleTab = "recipes" | "raw-materials" | "suppliers" | "purchases" | "offcuts"

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

export function Manufacturing() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<ModuleTab>("recipes")
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [editingRecipeId, setEditingRecipeId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Data states
  const [recipes, setRecipes] = useState<any[]>([])
  const [rawMaterials, setRawMaterials] = useState<any[]>([])
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [purchaseHistory, setPurchaseHistory] = useState<any[]>([])

  // Recipe Modal State
  const [isRecipeModalOpen, setIsRecipeModalOpen] = useState(false)
  const [recipeForm, setRecipeForm] = useState<{ title: string, finished_good_id: string, instructions: string }>({ title: "", finished_good_id: "", instructions: "" })
  const [recipeIngredients, setRecipeIngredients] = useState<{ 
    raw_material_ref_id: string, 
    quantity_required: number,
    use_dimensions?: boolean,
    length_mm?: number,
    width_mm?: number,
    pieces?: number,
    can_rotate?: boolean
  }[]>([])

  // Material Modal State
  const [isMaterialModalOpen, setIsMaterialModalOpen] = useState(false)
  const [materialForm, setMaterialForm] = useState<{ 
    id?: string, name: string, unit: string, quantity: number, unit_cost: number, reorder_point: number, notes: string, 
    has_package: boolean, package_unit: string, units_per_package: number 
  }>({ 
    name: "", unit: "მ²", quantity: 0, unit_cost: 0, reorder_point: 5, notes: "",
    has_package: false, package_unit: "ფილა", units_per_package: 0
  })

  // Supplier Modal State
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false)
  const [supplierForm, setSupplierForm] = useState<any>({ 
    name: "", contact_person: "", phone: "", email: "", tin: "", country: "GE", currency: "GEL", payment_terms: 30, address: "", notes: "", is_active: true
  })

  // Purchase/Procurement Modal State
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false)
  const [purchaseForm, setPurchaseForm] = useState<{ supplier_id: string, date: string, notes: string }>({ supplier_id: "", date: new Date().toISOString().split('T')[0], notes: "" })
  const [purchaseItems, setPurchaseItems] = useState<{ raw_material_id: string, input_qty: number, is_package_qty: boolean, total_cost: number }[]>([])

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const [recRes, matRes, supRes, prodRes] = await Promise.all([
        supabase.from("production_recipes").select(`
          *,
          finished_good:finished_good_id(*),
          ingredients:recipe_ingredients(
            *,
            raw_mat:raw_material_ref_id(*)
          )
        `),
        supabase.from("raw_materials").select("*").order("name"),
        supabase.from("suppliers").select("*").order("name"),
        supabase.from("products").select("id, name, category").order("name"),
      ])
      if (recRes.data) setRecipes(recRes.data)
      if (matRes.data) setRawMaterials(matRes.data)
      if (supRes.data) setSuppliers(supRes.data)
      if (prodRes.data) setProducts(prodRes.data)
    } catch (err) {
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  // ══════════════════════════════════════════════════════════
  //                     SAVE HANDLERS
  // ══════════════════════════════════════════════════════════

  const handleSaveRecipe = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!recipeForm.title.trim() || !recipeForm.finished_good_id) return
    setIsSaving(true)
    try {
      const selectedMatIds = recipeIngredients.map(i => i.raw_material_ref_id).filter(id => id)
      if (new Set(selectedMatIds).size !== selectedMatIds.length) {
        throw new Error("ერთი და იგივე ნედლეული რამდენჯერმე გაქვთ არჩეული. გთხოვთ გააერთიანოთ რაოდენობები.")
      }

      const ingredients = recipeIngredients
        .filter(i => i.raw_material_ref_id && i.quantity_required > 0)
        .map(i => ({
          raw_material_ref_id: i.raw_material_ref_id,
          raw_material_id: i.raw_material_ref_id,
          quantity_required: i.quantity_required,
          can_rotate: i.can_rotate ?? true,
          finished_length_mm: i.length_mm || null,
          finished_width_mm: i.width_mm || null,
        }))

      const payload = {
        title: recipeForm.title,
        finished_good_id: recipeForm.finished_good_id,
        instructions: recipeForm.instructions,
        ingredients,
      }

      if (editingRecipeId) {
        await safeFetch(`/api/manufacturing/recipes/${editingRecipeId}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        })
      } else {
        await safeFetch("/api/manufacturing/recipes", {
          method: "POST",
          body: JSON.stringify(payload),
        })
      }

      setIsRecipeModalOpen(false)
      setEditingRecipeId(null)
      setRecipeForm({ title: "", finished_good_id: "", instructions: "" })
      setRecipeIngredients([])
      fetchData()
    } catch (err: any) {
      alert("შეცდომა რეცეპტის შენახვისას: " + err.message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleEditRecipe = (recipe: any) => {
    setEditingRecipeId(recipe.id)
    setRecipeForm({
      title: recipe.title,
      finished_good_id: recipe.finished_good_id,
      instructions: recipe.instructions || ""
    })
    
    setRecipeIngredients(recipe.ingredients.map((i: any) => ({
      raw_material_ref_id: i.raw_material_ref_id,
      quantity_required: i.quantity_required,
      can_rotate: i.can_rotate,
      length_mm: i.finished_length_mm,
      width_mm: i.finished_width_mm,
      use_dimensions: !!(i.finished_length_mm || i.finished_width_mm)
    })))
    
    setIsRecipeModalOpen(true)
  }

  const handleDeleteRecipe = async (id: string) => {
    if (!confirm("დარწმუნებული ხართ, რომ გსურთ რეცეპტის წაშლა?")) return
    try {
      await safeFetch(`/api/manufacturing/recipes/${id}`, { method: "DELETE" })
      fetchData()
    } catch (err: any) {
      alert("შეცდომა წაშლისას: " + err.message)
    }
  }

  const handleSaveMaterial = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!materialForm.name.trim()) return
    if (materialForm.has_package && (!materialForm.package_unit || materialForm.units_per_package <= 0)) {
      alert('მიუთითეთ შეფუთვის დეტალები სწორად! (მაგ. ერთეული: მ², შეფუთვა: ფილა, 1 ფილა = 5.796)');
      return;
    }

    setIsSaving(true)
    try {
      const payload = {
        name: materialForm.name,
        unit: materialForm.unit,
        quantity: materialForm.quantity,
        reorder_point: materialForm.reorder_point,
        unit_cost: materialForm.unit_cost,
        notes: materialForm.notes,
        package_unit: materialForm.has_package ? materialForm.package_unit : null,
        units_per_package: materialForm.has_package ? materialForm.units_per_package : null
      }

      if (materialForm.id) {
        await safeFetch(`/api/manufacturing/raw-materials/${materialForm.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        })
      } else {
        await safeFetch("/api/manufacturing/raw-materials", {
          method: "POST",
          body: JSON.stringify(payload),
        })
      }

      setIsMaterialModalOpen(false)
      fetchData()
    } catch (err: any) {
      alert("შეცდომა ნედლეულის დამატებისას: " + err.message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveSupplier = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!supplierForm.name.trim()) return
    setIsSaving(true)
    try {
      if (supplierForm.id) {
        const { id, ...payload } = supplierForm
        await safeFetch(`/api/manufacturing/suppliers/${id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        })
      } else {
        await safeFetch("/api/manufacturing/suppliers", {
          method: "POST",
          body: JSON.stringify(supplierForm),
        })
      }
      setIsSupplierModalOpen(false)
      fetchData()
    } catch (err: any) {
      alert("შეცდომა მომწოდებლის შექმნისას: " + err.message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleSavePurchase = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!purchaseForm.supplier_id) return alert("აირჩიეთ მომწოდებელი")
    if (purchaseItems.length === 0) return alert("დაამატეთ მინიმუმ 1 ნედლეული შესყიდვაში")
    
    setIsSaving(true)
    try {
      const items = purchaseItems
        .filter((i: any) => i.raw_material_id && i.input_qty > 0)
        .map((i: any) => ({
          raw_material_id: i.raw_material_id,
          input_qty: i.input_qty,
          is_package_qty: !!i.is_package_qty,
          total_cost: i.total_cost || 0,
        }))

      await safeFetch('/api/manufacturing/raw-materials/purchase', {
        method: 'POST',
        body: JSON.stringify({ supplier_id: purchaseForm.supplier_id, items }),
      })

      alert("შესყიდვა გატარდა! ნედლეულის მარაგები ავტომატურად განახლდა ცალობის / კვადრატულობის ლოგიკით.");
      setIsPurchaseModalOpen(false);
      setPurchaseItems([]);
      fetchData();
      setActiveTab("raw-materials");
    } catch (err: any) {
      alert("შეცდომა შესყიდვის გატარებისას: " + err.message);
    } finally {
      setIsSaving(false);
    }
  }

  const handleDownloadTemplate = async () => {
    const XLSX = await import("xlsx")
    const ws = XLSX.utils.json_to_sheet([
      { "დასახელება": "MDF თეთრი", "საზომი ერთეული": "მ²", "რაოდენობა": "", "ნაშთის ლიმიტი": 5 }
    ])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Materials")
    XLSX.writeFile(wb, "inventory_template.xlsx")
  }

  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (evt) => {
      try {
        const XLSX = await import("xlsx")
        const bstr = evt.target?.result
        const wb = XLSX.read(bstr, { type: "binary" })
        const wsname = wb.SheetNames[0]
        const ws = wb.Sheets[wsname]
        const data = XLSX.utils.sheet_to_json(ws)

        setIsSaving(true)
        const items = data.map((row: any) => ({
          name: row["დასახელება"],
          unit: row["საზომი ერთეული"] || "მ²",
          quantity: row["რაოდენობა"] || 0,
          reorder_point: row["ნაშთის ლიმიტი"] || 5,
        }))

        await safeFetch("/api/manufacturing/raw-materials/bulk", {
          method: "POST",
          body: JSON.stringify({ items }),
        })

        alert("ექსელიდან იმპორტი წარმატებულია!")
        fetchData()
      } catch (err: any) {
        alert("შეცდომა ექსელის იმპორტისას: " + err.message)
      } finally {
        setIsSaving(false)
        if (fileInputRef.current) fileInputRef.current.value = ""
      }
    }
    reader.readAsBinaryString(file)
  }

  // ══════════════════════════════════════════════════════════
  //                     UI RENDERS
  // ══════════════════════════════════════════════════════════

  const renderRecipesTab = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center bg-card p-4 rounded-xl border border-border/50">
        <div>
          <h3 className="font-semibold text-foreground text-lg">საწარმოო რეცეპტები ავეჯისთვის</h3>
          <p className="text-sm text-muted-foreground">{recipes.length} რეცეპტი</p>
        </div>
        <button
          onClick={() => {
            setEditingRecipeId(null)
            setRecipeForm({ title: "", finished_good_id: "", instructions: "" })
            setRecipeIngredients([])
            setIsRecipeModalOpen(true)
          }}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors shadow-lg shadow-primary/25"
        >
          <Plus size={16} /> ახალი რეცეპტი
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {recipes.map(r => (
          <div key={r.id} className="bg-card border border-border/50 rounded-2xl p-5 hover:shadow-lg transition-all flex flex-col h-full relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-5 bg-gradient-to-bl from-primary to-transparent rounded-bl-full pointer-events-none w-24 h-24"></div>
            <div className="flex-1 relative z-10">
              <div className="flex justify-between items-start mb-1">
                <h4 className="font-bold text-foreground text-lg leading-tight">{r.title}</h4>
                <div className="flex gap-1">
                  <button onClick={() => handleEditRecipe(r)} className="p-1.5 text-blue-500 hover:bg-blue-500/10 rounded-lg transition-colors">
                    <Edit3 size={16}/>
                  </button>
                  <button onClick={() => handleDeleteRecipe(r.id)} className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors">
                    <Trash2 size={16}/>
                  </button>
                </div>
              </div>
              <p className="text-sm text-amber-500 mb-4 font-semibold">{r.finished_good?.name || "უცნობი პროდუქტი"}</p>
              
              <div className="space-y-2 mb-4 bg-muted/20 p-3 rounded-xl border border-border/50">
                <p className="text-xs text-muted-foreground font-semibold uppercase flex items-center gap-2"><ArrowDownRight size={14}/> ინგრედიენტები 1 ცალზე</p>
                {r.ingredients?.map((i: any) => {
                   const rawMat = i.raw_mat;
                   // Show conversion intelligence if it has packages
                   const hasPkg = rawMat?.package_unit && rawMat?.units_per_package;
                   const pkgEquiv = hasPkg ? (i.quantity_required / rawMat.units_per_package).toFixed(2) : null;
                   
                   return (
                     <div key={i.id} className="flex flex-col text-sm bg-background px-3 py-2 rounded-lg border border-border/50 shadow-sm relative">
                       <div className="flex justify-between items-center w-full">
                         <span className="text-foreground font-medium">{rawMat?.name}</span>
                         <span className="font-mono font-bold text-teal-600 bg-teal-500/10 px-2 py-0.5 rounded text-xs border border-teal-500/20">
                            {i.quantity_required} {rawMat?.unit}
                         </span>
                       </div>
                       {hasPkg && (
                         <span className="text-[10px] text-muted-foreground mt-1 text-right">
                            ≈ {pkgEquiv} {rawMat.package_unit}
                         </span>
                       )}
                     </div>
                   )
                })}
              </div>
            </div>
            {/* Action buttons */}
          </div>
        ))}
      </div>
    </div>
  )

  const renderRawMaterialsTab = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center bg-card p-4 rounded-xl border border-border/50 shadow-sm">
        <div>
          <h3 className="font-semibold text-foreground text-lg">ნედლეული წამროებისთვის</h3>
          <p className="text-sm text-muted-foreground">ცალობის და კვადრატულობის აღრიცხვა</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleDownloadTemplate}
            className="flex items-center gap-2 bg-muted text-muted-foreground px-4 py-2 rounded-lg font-medium hover:bg-muted/80 transition-colors"
          >
            <Download size={16} /> შაბლონი
          </button>
          
          <input 
            type="file" 
            accept=".xlsx, .xls" 
            ref={fileInputRef} 
            onChange={handleExcelUpload} 
            className="hidden" 
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 bg-emerald-500/10 text-emerald-600 px-4 py-2 rounded-lg font-medium hover:bg-emerald-500/20 transition-colors"
          >
            <Upload size={16} /> ექსელის ატვირთვა
          </button>
          <button
            onClick={() => {
              setPurchaseForm({ supplier_id: "", date: new Date().toISOString().split('T')[0], notes: "" })
              setPurchaseItems([{ raw_material_id: "", input_qty: 0, is_package_qty: true, total_cost: 0 }])
              setIsPurchaseModalOpen(true)
            }}
            className="flex items-center gap-2 bg-amber-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-amber-600 transition-colors shadow-lg shadow-amber-500/25"
          >
            <ShoppingCart size={16} /> შესყიდვა (შემოტანა)
          </button>
          <button
            onClick={() => {
              setMaterialForm({ name: "", unit: "მ²", quantity: 0, unit_cost: 0, reorder_point: 5, notes: "", has_package: false, package_unit: "ფილა", units_per_package: 0 })
              setIsMaterialModalOpen(true)
            }}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors shadow-lg shadow-primary/25"
          >
            <Plus size={16} /> ახალი ნედლეული
          </button>
        </div>
      </div>

      <div className="bg-card border border-border/50 rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b border-border/50">
            <tr className="text-left text-muted-foreground uppercase text-xs font-bold">
              <th className="px-6 py-4">დასახელება</th>
              <th className="px-6 py-4">ძირითადი მარაგი</th>
              <th className="px-6 py-4">შეფუთვით აღრიცხვა</th>
              <th className="px-6 py-4 text-right">ერთ. ფასი</th>
              <th className="px-6 py-4 text-right">მოქმედება</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {rawMaterials.map(m => {
               const hasPkg = m.package_unit && m.units_per_package > 0;
               const pieces = hasPkg ? (m.quantity / m.units_per_package).toFixed(2) : null;
               
               return (
                 <tr key={m.id} className="hover:bg-muted/30 transition-colors">
                   <td className="px-6 py-4">
                     <p className="font-bold text-foreground text-base">{m.name}</p>
                     {hasPkg && <p className="text-[10px] text-muted-foreground uppercase mt-1">კონვერსია: 1 {m.package_unit} = {m.units_per_package} {m.unit}</p>}
                   </td>
                   <td className="px-6 py-4">
                     <div className="flex items-center gap-1.5">
                        <span className="font-mono text-lg font-bold text-teal-600">{m.quantity}</span>
                        <span className="text-muted-foreground font-semibold">{m.unit}</span>
                     </div>
                   </td>
                   <td className="px-6 py-4">
                     {hasPkg ? (
                       <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-lg">
                          <Package size={14} className="text-amber-600"/>
                          <span className="font-mono font-bold text-amber-700">{pieces}</span>
                          <span className="text-amber-600/80 font-semibold">{m.package_unit}</span>
                       </div>
                     ) : (
                       <span className="text-xs text-muted-foreground italic">არაა მითითებული</span>
                     )}
                   </td>
                   <td className="px-6 py-4 text-right">
                     <span className="font-mono font-bold text-foreground">₾{Number(m.unit_cost).toFixed(2)}</span> / {m.unit}
                   </td>
                   <td className="px-6 py-4 text-right">
                      <button onClick={() => {
                        setMaterialForm({ ...m, has_package: !!m.package_unit }); setIsMaterialModalOpen(true);
                      }} className="p-2 text-primary hover:bg-primary/10 rounded-lg">
                        <Edit3 size={16}/>
                      </button>
                   </td>
                 </tr>
               )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )

  const renderSuppliersTab = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center bg-card p-4 rounded-xl border border-border/50 shadow-sm">
        <h3 className="font-semibold text-foreground text-lg">მომწოდებლები და დისტრიბუცია</h3>
        <button
          onClick={() => {
            setSupplierForm({ name: "", contact_person: "", phone: "", email: "", tin: "", country: "GE", currency: "GEL", payment_terms: 30, address: "", notes: "", is_active: true })
            setIsSupplierModalOpen(true)
          }}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors shadow-lg shadow-primary/25"
        >
          <Plus size={16} /> ახალი მომწოდებელი
        </button>
      </div>

       <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {suppliers.map(s => (
          <div key={s.id} className="bg-card border border-border/50 rounded-2xl p-5 relative group overflow-hidden">
            <div className="flex justify-between items-start mb-3">
              <h4 className="font-bold text-foreground text-lg">{s.name}</h4>
              <button onClick={() => {
                setPurchaseForm({ supplier_id: s.id, date: new Date().toISOString().split('T')[0], notes: "" })
                setPurchaseItems([{ raw_material_id: "", input_qty: 0, is_package_qty: true, total_cost: 0 }])
                setIsPurchaseModalOpen(true)
              }} className="text-xs bg-emerald-500/10 hover:bg-emerald-500 flex items-center gap-1 text-emerald-600 hover:text-white px-2 py-1 rounded font-bold uppercase transition-all shadow-sm">
                <ShoppingCart size={12}/> შესყიდვა
              </button>
            </div>
            {s.tin && <p className="text-xs text-muted-foreground mb-3 font-mono">საიდენტიფიკაციო (TIN): {s.tin}</p>}
            
            <div className="space-y-1.5 mt-4 text-sm text-muted-foreground bg-muted/30 p-3 rounded-xl border border-border/50">
              {s.contact_person && <p className="flex justify-between"><span>პირი:</span> <strong className="text-foreground">{s.contact_person}</strong></p>}
              {s.phone && <p className="flex justify-between"><span>ტელ:</span> <strong className="text-foreground">{s.phone}</strong></p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20">
      {/* Overview Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KpiCard 
          icon={Factory} 
          title="რეცეპტები" 
          value={recipes.length} 
          subValue="აქტიური მოდელები" 
          color="from-sky-500 to-blue-600" 
        />
        <KpiCard 
          icon={Package} 
          title="ნედლეული" 
          value={rawMaterials.length} 
          subValue="მარაგის სახეობა" 
          color="from-teal-500 to-emerald-600" 
        />
        <KpiCard 
          icon={Truck} 
          title="მომწოდებლები" 
          value={suppliers.length} 
          subValue="აქტიური პარტნიორები" 
          color="from-indigo-500 to-violet-600" 
        />
        <KpiCard 
          icon={AlertTriangle} 
          title="დაბალი მარაგი" 
          value={rawMaterials.filter(m => Number(m.quantity) < Number(m.reorder_point)).length} 
          subValue="საჭიროებს შევსებას" 
          color="from-rose-500 to-red-600" 
        />
      </div>

      {/* Navigation Tabs */}
      <motion.div className="flex gap-2 p-1.5 bg-card border border-border/50 rounded-xl w-fit shadow-sm">
        {[
          { id: "recipes", label: "ავეჯის რეცეპტები", icon: <Factory size={16} /> },
          { id: "raw-materials", label: "ნედლეულის ორმაგი აღრიცხვა", icon: <ArrowRightLeft size={16} /> },
          { id: "suppliers", label: "მომწოდებლები", icon: <Truck size={16} /> },
          { id: "purchases", label: "შესყიდვები (PO/GRN)", icon: <Package size={16} /> },
          { id: "offcuts", label: "ნარჩენები", icon: <List size={16} /> },
        ].map(t => (
           <button
             key={t.id}
             onClick={() => setActiveTab(t.id as ModuleTab)}
             className={cn(
               "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition-all outline-none",
               activeTab === t.id
                 ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                 : "text-muted-foreground hover:bg-muted"
             )}
           >
             {t.icon} {t.label}
           </button>
        ))}
      </motion.div>

      <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
         {activeTab === "recipes" && renderRecipesTab()}
         {activeTab === "raw-materials" && renderRawMaterialsTab()}
         {activeTab === "suppliers" && renderSuppliersTab()}
         {activeTab === "purchases" && <Procurement />}
         {activeTab === "offcuts" && <OffcutInventory />}
      </motion.div>

      {/* ─────────────────────────────────────────────────────────────────
          MODALS SECTION 
          ───────────────────────────────────────────────────────────────── */}
      
      {/* PURCHASE / PROCUREMENT MODAL */}
      <AnimatePresence>
        {isPurchaseModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-card w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl border border-border p-6 relative">
              <div className="absolute top-0 right-0 p-4 w-32 h-32 bg-amber-500/10 rounded-bl-full pointer-events-none"></div>
              
              <div className="flex justify-between items-center mb-6 border-b border-border/50 pb-4 relative z-10">
                <div>
                   <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
                     <ShoppingCart className="text-amber-500"/> საქონლის შემოტანა (შესყიდვა)
                   </h3>
                   <p className="text-sm text-muted-foreground mt-1">შეიძინეთ ცალობაში, განიხილეთ როგორც კვადრატულობა</p>
                </div>
                <button onClick={() => setIsPurchaseModalOpen(false)} className="text-muted-foreground hover:text-foreground"><X size={20}/></button>
              </div>

              <form onSubmit={handleSavePurchase} className="space-y-6 relative z-10">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-muted-foreground mb-1">მომწოდებელი</label>
                    <select required value={purchaseForm.supplier_id} onChange={e => setPurchaseForm({...purchaseForm, supplier_id: e.target.value})} className="w-full px-4 py-3 bg-background border border-border rounded-xl text-sm font-semibold outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500">
                      <option value="">-- აირჩიეთ მომწოდებელი --</option>
                      {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-muted-foreground mb-1">თარიღი</label>
                    <input type="date" required value={purchaseForm.date} onChange={e => setPurchaseForm({...purchaseForm, date: e.target.value})} className="w-full px-4 py-3 bg-background border border-border rounded-xl text-sm font-semibold outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500" />
                  </div>
                </div>

                <div className="bg-muted/10 p-5 rounded-xl border border-border/50 space-y-4">
                  <div className="flex justify-between items-center border-b border-border/50 pb-2">
                     <h4 className="font-bold text-sm text-foreground uppercase tracking-wider">შესყიდული ნედლეული</h4>
                     <button type="button" onClick={() => setPurchaseItems([...purchaseItems, { raw_material_id: "", input_qty: 0, is_package_qty: true, total_cost: 0 }])} className="text-xs bg-amber-500 text-white px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 hover:bg-amber-600 transition-colors shadow-sm">
                        <Plus size={14} /> დამატება
                     </button>
                  </div>

                  {purchaseItems.map((item, idx) => {
                     const selectedMat = rawMaterials.find(m => m.id === item.raw_material_id);
                     const hasPkg = selectedMat?.package_unit && selectedMat?.units_per_package;
                     
                     // Calculate conversion logic live
                     let summaryText = "";
                     if (selectedMat && item.input_qty > 0) {
                        if (item.is_package_qty && hasPkg) {
                           summaryText = `სისტემაში აისახება მოცულობა: ${(item.input_qty * selectedMat.units_per_package).toFixed(2)} ${selectedMat.unit}`;
                        } else if (!item.is_package_qty && hasPkg) {
                           summaryText = `ანუ დაახლოებით ${(item.input_qty / selectedMat.units_per_package).toFixed(2)} ${selectedMat.package_unit}`;
                        } else {
                           summaryText = `სისტემაში დაემატება: ${item.input_qty} ${selectedMat.unit}`;
                        }
                     }

                     return (
                       <div key={idx} className="bg-background p-4 rounded-xl border border-border shadow-sm flex flex-col gap-3">
                          <div className="flex gap-4">
                            <select required value={item.raw_material_id} onChange={e => {
                                 const newArr = [...purchaseItems]; newArr[idx].raw_material_id = e.target.value; setPurchaseItems(newArr);
                            }} className="flex-1 px-3 py-2.5 bg-muted/20 border border-border rounded-lg text-sm font-semibold outline-none focus:border-amber-500">
                               <option value="">-- აირჩიეთ ნედლეული --</option>
                               {rawMaterials.map(m => <option key={m.id} value={m.id}>{m.name} (ბაზაში: {m.unit})</option>)}
                            </select>

                            <button type="button" onClick={() => setPurchaseItems(purchaseItems.filter((_, i) => i !== idx))} className="px-3 text-red-500 hover:bg-red-50 rounded-lg">
                              <Trash2 size={18}/>
                            </button>
                          </div>

                          {selectedMat && (
                            <div className="grid grid-cols-3 gap-4 pb-2">
                               <div>
                                 <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">რაოდენობა</label>
                                 <div className="flex">
                                   <input type="number" step="0.01" min="0" required value={item.input_qty} onChange={e => {
                                      const newArr = [...purchaseItems]; newArr[idx].input_qty = parseFloat(e.target.value) || 0; setPurchaseItems(newArr);
                                   }} className="w-full px-3 py-2 border border-border border-r-0 rounded-l-lg bg-transparent font-mono font-bold outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 z-10"/>
                                   
                                   <select disabled={!hasPkg} value={item.is_package_qty ? "package" : "base"} onChange={e => {
                                      const newArr = [...purchaseItems]; newArr[idx].is_package_qty = e.target.value === "package"; setPurchaseItems(newArr);
                                   }} className={cn("px-2 border border-border rounded-r-lg bg-muted text-xs font-bold w-full max-w-24 outline-none", !hasPkg && "opacity-60")}>
                                      {hasPkg && <option value="package">{selectedMat.package_unit} (მაგ. ცალი)</option>}
                                      <option value="base">{selectedMat.unit} (ბაზის. ერთ.)</option>
                                   </select>
                                 </div>
                               </div>

                               <div>
                                 <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">სულ ღირებულება ₾</label>
                                 <input type="number" step="0.01" min="0" required placeholder="მაგ. 3500.00" value={item.total_cost || ""} onChange={e => {
                                    const newArr = [...purchaseItems]; newArr[idx].total_cost = parseFloat(e.target.value) || 0; setPurchaseItems(newArr);
                                 }} className="w-full px-3 py-2 border border-border rounded-lg bg-transparent font-mono font-bold outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"/>
                               </div>
                               
                               <div className="flex items-end pb-1 pl-2">
                                 {summaryText && <span className="text-xs font-bold text-amber-600 bg-amber-500/10 px-2 py-1 rounded inline-flex break-words leading-tight">{summaryText}</span>}
                               </div>
                            </div>
                          )}
                       </div>
                     )
                  })}
                  
                  {purchaseItems.length === 0 && <p className="text-sm text-center py-6 text-muted-foreground italic">კალათა ცარიელია</p>}
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-border/50">
                  <button type="button" onClick={() => setIsPurchaseModalOpen(false)} className="px-5 py-2.5 text-sm font-bold tracking-wide text-muted-foreground hover:bg-muted rounded-xl transition-colors">გაუქმება</button>
                  <button type="submit" disabled={isSaving} className="px-6 py-2.5 text-sm font-bold tracking-widest uppercase bg-amber-500 text-white rounded-xl flex items-center gap-2 hover:bg-amber-600 shadow-xl shadow-amber-500/30 disabled:opacity-50 transition-all">
                    {isSaving ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle size={18} />}
                    შემოტანა
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* (Other existing modals - Recipes, Raw Materials, Suppliers omitted for brevity here since the main overwrite adds them back. I will keep them intact in the real file...) */}
      
      {/* MATERIAL AND RECIPE AND SUPPLIER MODALS (IDENTICAL TO PREVIOUS VERSION) */}
      <AnimatePresence>
        {isMaterialModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-card w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl border border-border p-6">
              <div className="flex justify-between items-center mb-6 border-b border-border/50 pb-4">
                <h3 className="text-xl font-bold text-foreground">ნედლეული წამროებისთვის</h3>
                <button onClick={() => setIsMaterialModalOpen(false)} className="text-muted-foreground hover:text-foreground"><X size={20}/></button>
              </div>
              <form onSubmit={handleSaveMaterial} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-semibold text-muted-foreground mb-1 uppercase text-[11px]">სახელი (მაგ. ლამინატი 18მმ მუხა)</label>
                    <input required value={materialForm.name} onChange={e => setMaterialForm({...materialForm, name: e.target.value})} className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-sm font-semibold outline-none focus:border-primary" />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-muted-foreground mb-1 uppercase text-[11px]">ძირითადი მარაგი ინახება-ში:</label>
                    <select value={materialForm.unit} onChange={e => setMaterialForm({...materialForm, unit: e.target.value})} className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-sm font-bold text-primary outline-none focus:border-primary bg-primary/5">
                      {["მ²", "მ", "კგ", "ლ", "ცალი", "წრფივი მეტრი"].map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </div>
                   <div>
                    <label className="block text-sm font-semibold text-muted-foreground mb-1 uppercase text-[11px]">საწყისი ნაშთი ({materialForm.unit})</label>
                    <input type="number" step="0.01" min="0" required value={materialForm.quantity} onChange={e => setMaterialForm({...materialForm, quantity: parseFloat(e.target.value) || 0})} className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-sm outline-none" />
                  </div>
                </div>

                <div className="bg-amber-500/5 p-5 rounded-2xl border border-amber-500/20 shadow-inner">
                  <label className="flex items-center gap-3 text-base font-bold text-amber-700 cursor-pointer mb-5">
                    <input type="checkbox" checked={materialForm.has_package} onChange={e => setMaterialForm({...materialForm, has_package: e.target.checked})} className="w-5 h-5 rounded hover:ring-2 ring-amber-500 transition-all cursor-pointer" />
                    ამ ნედლეულს ვყიდულობ სხვა შეფუთვით (ცალობით)
                  </label>
                  
                  {materialForm.has_package && (
                    <div className="grid grid-cols-2 gap-5 p-4 bg-white/50 rounded-xl border border-amber-500/10">
                      <div>
                        <label className="block text-xs font-bold text-amber-900/80 mb-2 uppercase">შეფუთვის სახელი (მაგ. ფილა, შეკვრა)</label>
                        <input value={materialForm.package_unit} onChange={e => setMaterialForm({...materialForm, package_unit: e.target.value})} className="w-full px-4 py-3 bg-white border border-amber-200 rounded-xl text-sm font-semibold text-amber-900 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 shadow-sm" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-amber-900/80 mb-2 uppercase">ფორმულა: 1 {materialForm.package_unit || "ფილა"} = ? {materialForm.unit}</label>
                        <div className="relative">
                           <input type="number" step="0.01" min="0.01" required value={materialForm.units_per_package} onChange={e => setMaterialForm({...materialForm, units_per_package: parseFloat(e.target.value) || 0})} className="w-full pl-4 pr-12 py-3 bg-white border border-amber-200 rounded-xl text-sm font-semibold text-amber-900 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 shadow-sm font-mono" placeholder="მაგ: 5.796" />
                           <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-amber-900/50">{materialForm.unit}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-border/50">
                  <button type="button" onClick={() => setIsMaterialModalOpen(false)} className="px-5 py-2.5 font-bold text-muted-foreground hover:bg-muted rounded-xl">გაუქმება</button>
                  <button type="submit" disabled={isSaving} className="px-5 py-2.5 font-bold bg-primary text-primary-foreground rounded-xl flex items-center gap-2">მარაგში დამატება</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isRecipeModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-card w-full max-w-4xl max-h-[95vh] overflow-y-auto rounded-3xl shadow-2xl border border-border/80 p-8 relative flex flex-col gap-6">
              
              <div className="flex justify-between items-center bg-muted/30 -m-8 mb-0 p-8 border-b border-border/50">
                <div className="flex items-center gap-4">
                  <div className={cn("p-3 rounded-2xl", editingRecipeId ? "bg-amber-500/10 text-amber-500" : "bg-primary/10 text-primary")}>
                    {editingRecipeId ? <Edit3 size={24} /> : <Factory size={24} />}
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-foreground tracking-tight">
                      {editingRecipeId ? "რეცეპტის რედაქტირება" : "ახალი საწარმოო რეცეპტი"}
                    </h3>
                    <p className="text-sm text-muted-foreground font-medium">სპეციფიკაციების და კომპონენტების მართვა</p>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    setIsRecipeModalOpen(false)
                    setEditingRecipeId(null)
                  }} 
                  className="p-2 hover:bg-muted rounded-full text-muted-foreground hover:text-foreground transition-all"
                >
                  <X size={24}/>
                </button>
              </div>
              <form onSubmit={handleSaveRecipe} className="space-y-6">
                 <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-muted-foreground mb-1 uppercase tracking-wider text-[11px]">რეცეპტის სახელი *</label>
                    <input required value={recipeForm.title} onChange={e => setRecipeForm({...recipeForm, title: e.target.value})} className="w-full px-4 py-3 bg-background border border-border rounded-xl text-sm text-foreground focus:ring-2 focus:ring-primary outline-none" placeholder="მაგ. სტანდარტული კარადა 2x2" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-muted-foreground mb-1 uppercase tracking-wider text-[11px]">მზა პროდუქტი კატალოგიდან *</label>
                    <select required value={recipeForm.finished_good_id} onChange={e => setRecipeForm({...recipeForm, finished_good_id: e.target.value})} className="w-full px-4 py-3 bg-background border border-border rounded-xl text-sm text-foreground focus:ring-2 focus:ring-primary outline-none">
                      <option value="">აირჩიეთ პროდუქტი...</option>
                      {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                </div>

                <div className="bg-muted/10 p-5 rounded-2xl border border-border/50">
                   <div className="flex justify-between items-center mb-4">
                      <h4 className="font-bold text-sm text-foreground">ნედლეულის დახარჯვის ნორმა (1 მზა ავეჯზე)</h4>
                      <button type="button" onClick={() => setRecipeIngredients([...recipeIngredients, { raw_material_ref_id: "", quantity_required: 1, use_dimensions: false, length_mm: 0, width_mm: 0, pieces: 1 }])} className="text-xs bg-primary/10 text-primary px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 hover:bg-primary/20 transition-colors">
                         <Plus size={14} /> დამატება
                      </button>
                   </div>
                   
                   <div className="space-y-3">
                      {recipeIngredients.map((ing, idx) => {
                        const rawMat = rawMaterials.find(m => m.id === ing.raw_material_ref_id);
                        const isAreaUnit = rawMat?.unit === "მ²";

                        return (
                          <div key={idx} className="flex flex-col gap-3 bg-background p-3 rounded-xl border border-border/50 shadow-sm transition-all hover:border-primary/30">
                            <div className="flex gap-4 items-start">
                              <div className="flex-1 space-y-2">
                                <select required className="w-full px-3 py-2.5 bg-muted/20 text-sm font-semibold outline-none border border-border/50 rounded-lg focus:border-primary transition-colors" value={ing.raw_material_ref_id} onChange={(e) => {
                                     const newIng = [...recipeIngredients]; 
                                     newIng[idx].raw_material_ref_id = e.target.value; 
                                     // Disable dimensions mode if the new material is not square meters
                                     const newMat = rawMaterials.find(m => m.id === e.target.value);
                                     if(newMat?.unit !== "მ²") newIng[idx].use_dimensions = false;
                                     setRecipeIngredients(newIng) 
                                }}>
                                   <option value="">-- აირჩიეთ ინგრედიენტი / ნედლეული --</option>
                                   {rawMaterials.map(m => <option key={m.id} value={m.id}>{m.name} ({m.unit})</option>)}
                                </select>

                                {isAreaUnit && (
                                  <label className="flex items-center gap-2 text-xs font-bold text-primary/80 cursor-pointer ml-1 w-fit bg-primary/5 px-2 py-1 rounded-md">
                                    <input 
                                      type="checkbox" 
                                      className="rounded border-primary text-primary focus:ring-primary h-3.5 w-3.5"
                                      checked={ing.use_dimensions}
                                      onChange={(e) => {
                                        const newIng = [...recipeIngredients];
                                        newIng[idx].use_dimensions = e.target.checked;
                                        setRecipeIngredients(newIng);
                                      }}
                                    />
                                    📐 ზომებით კალკულაცია (მმ)
                                  </label>
                                )}
                                
                                {isAreaUnit && (
                                  <label className="flex items-center gap-2 text-xs font-bold text-amber-600 cursor-pointer ml-1 w-fit bg-amber-500/10 px-2 py-1 rounded-md mt-1">
                                    <input 
                                      type="checkbox" 
                                      className="rounded border-amber-500 text-amber-500 focus:ring-amber-500 h-3.5 w-3.5"
                                      checked={ing.can_rotate ?? true}
                                      onChange={(e) => {
                                        const newIng = [...recipeIngredients];
                                        newIng[idx].can_rotate = e.target.checked;
                                        setRecipeIngredients(newIng);
                                      }}
                                    />
                                    🔄 მობრუნების უფლება (ტექსტურა)
                                  </label>
                                )}
                              </div>

                              <div className="w-48 flex flex-col gap-1 items-end pt-1">
                                 <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest bg-muted px-2 py-0.5 rounded-full">ჯამური ხარჯი</span>
                                 <div className="flex items-center gap-2 border-b-2 border-border focus-within:border-primary transition-colors w-full pb-1">
                                   <input title="Total Quantity" type="number" step="0.0001" min="0" required 
                                     readOnly={ing.use_dimensions}
                                     value={ing.quantity_required === 0 ? "" : ing.quantity_required} 
                                     onChange={(e) => {
                                       if(!ing.use_dimensions) {
                                         const newIng = [...recipeIngredients]; 
                                         newIng[idx].quantity_required = parseFloat(e.target.value) || 0; 
                                         setRecipeIngredients(newIng)
                                       }
                                     }} 
                                     className={cn(
                                       "w-full bg-transparent text-right font-mono font-bold text-xl outline-none",
                                       ing.use_dimensions ? "text-primary placeholder-primary/50" : "text-foreground"
                                     )} 
                                   />
                                   <span className="text-sm text-muted-foreground font-bold whitespace-nowrap w-8 text-center">
                                     {rawMat?.unit || "ერთ."}
                                   </span>
                                 </div>
                              </div>

                              <button type="button" onClick={() => setRecipeIngredients(recipeIngredients.filter((_, i) => i !== idx))} className="mt-2 p-2 text-red-500/50 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"><Trash2 size={20}/></button>
                            </div>

                            {/* Dimension Calculator Panel */}
                            {AnimatePresence && ing.use_dimensions && rawMat && (
                               <motion.div 
                                 initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                                 className="overflow-hidden"
                               >
                                  <div className="flex items-end gap-3 bg-primary/5 border border-primary/20 p-3 rounded-lg mt-1">
                                    <div className="flex-1">
                                      <label className="block text-[10px] font-bold text-primary/70 uppercase mb-1">სიგრძე (მმ)</label>
                                      <input type="number" min="0" value={ing.length_mm || ""} onChange={(e) => {
                                         const newIng = [...recipeIngredients]; 
                                         const v = parseFloat(e.target.value) || 0;
                                         newIng[idx].length_mm = v;
                                         newIng[idx].quantity_required = Number(( (v / 1000) * ((newIng[idx].width_mm || 0) / 1000) * (newIng[idx].pieces || 1) ).toFixed(4));
                                         setRecipeIngredients(newIng);
                                      }} className="w-full bg-white border border-primary/20 rounded-md px-3 py-1.5 text-sm font-mono outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm" placeholder="მაგ. 600" />
                                    </div>
                                    <div className="text-primary/40 font-bold mb-2">✕</div>
                                    <div className="flex-1">
                                      <label className="block text-[10px] font-bold text-primary/70 uppercase mb-1">სიგანე (მმ)</label>
                                      <input type="number" min="0" value={ing.width_mm || ""} onChange={(e) => {
                                         const newIng = [...recipeIngredients]; 
                                         const v = parseFloat(e.target.value) || 0;
                                         newIng[idx].width_mm = v;
                                         newIng[idx].quantity_required = Number(( ((newIng[idx].length_mm || 0) / 1000) * (v / 1000) * (newIng[idx].pieces || 1) ).toFixed(4));
                                         setRecipeIngredients(newIng);
                                      }} className="w-full bg-white border border-primary/20 rounded-md px-3 py-1.5 text-sm font-mono outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm" placeholder="მაგ. 400" />
                                    </div>
                                    <div className="text-primary/40 font-bold mb-2">✕</div>
                                    <div className="w-24">
                                      <label className="block text-[10px] font-bold text-primary/70 uppercase mb-1">დეტალი (ც)</label>
                                      <input type="number" min="1" value={ing.pieces || 1} onChange={(e) => {
                                         const newIng = [...recipeIngredients]; 
                                         const v = parseInt(e.target.value) || 1;
                                         newIng[idx].pieces = v;
                                         newIng[idx].quantity_required = Number(( ((newIng[idx].length_mm || 0) / 1000) * ((newIng[idx].width_mm || 0) / 1000) * v ).toFixed(4));
                                         setRecipeIngredients(newIng);
                                      }} className="w-full bg-white border border-primary/20 rounded-md px-3 py-1.5 text-sm font-mono font-bold text-center outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm" />
                                    </div>
                                    <div className="pb-1.5 px-2 text-sm font-bold text-primary flex items-center gap-1.5 w-32 border-l border-primary/20">
                                       <span className="text-xl">{(ing.quantity_required || 0).toFixed(4)}</span>
                                       <span className="text-xs mt-1">მ²</span>
                                    </div>
                                  </div>
                               </motion.div>
                            )}
                          </div>
                        )
                      })}
                      {recipeIngredients.length === 0 && (
                        <div className="text-center py-6 border border-dashed border-border/50 rounded-xl">
                           <p className="text-sm text-muted-foreground">დააკლიკეთ "დამატებას" ინგრედიენტის შესაყვანად</p>
                        </div>
                      )}
                   </div>
                </div>

                <div className="flex justify-end gap-3 border-t pt-6 bg-muted/20 -m-8 mt-8 p-8 border-border/50">
                  <button 
                    type="button" 
                    onClick={() => {
                      setIsRecipeModalOpen(false)
                      setEditingRecipeId(null)
                    }} 
                    className="px-6 py-2.5 font-bold rounded-xl text-muted-foreground hover:bg-muted transition-colors"
                  >
                    გაუქმება
                  </button>
                  <button 
                    type="submit" 
                    disabled={isSaving} 
                    className={cn(
                      "px-8 py-2.5 font-black text-sm uppercase tracking-widest rounded-xl flex items-center gap-2 transition-all shadow-lg",
                      editingRecipeId 
                        ? "bg-amber-500 text-white hover:bg-amber-600 shadow-amber-500/20" 
                        : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-primary/20"
                    )}
                  >
                    {isSaving ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle size={18} />}
                    {editingRecipeId ? "ცვლილებების შენახვა" : "რეცეპტის შექმნა"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isSupplierModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-card w-full max-w-2xl rounded-2xl shadow-2xl p-6 relative">
              <h3 className="text-xl font-bold mb-4">მომწოდებლის შექმნა</h3>
              <form onSubmit={handleSaveSupplier} className="space-y-4">
                <input required placeholder="კომპანიის სახელი" value={supplierForm.name} onChange={e => setSupplierForm({...supplierForm, name: e.target.value})} className="w-full px-4 py-3 bg-muted/20 border rounded-xl" />
                <div className="flex gap-4">
                  <button type="button" onClick={() => setIsSupplierModalOpen(false)} className="flex-1 py-3 border rounded-xl font-bold">გაუქმება</button>
                  <button type="submit" className="flex-1 py-3 bg-primary text-white rounded-xl font-bold">შენახვა</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default Manufacturing
