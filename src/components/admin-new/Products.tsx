import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Pencil, Trash2, Eye, Package, X, Plus, Loader2, ImageIcon, Percent } from "lucide-react"
import { cn, isProductOnSale } from "@/src/lib/utils"
import type { Product, Category } from "@/src/types/product"

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

interface ProductsProps {
  products: Product[]
  categories: Category[]
  searchQuery: string
  onRefresh: () => Promise<void>
  canEdit: boolean
  canDelete: boolean
  canAdd: boolean
  onAdd: () => void
  onEdit: (product: Product) => void
  onDelete: (id: string) => void
  onSave: (data: Partial<Product>, isEditing: boolean, editId?: string) => Promise<boolean>
  onImageUpload: (file: File) => Promise<string | null>
  isModalOpen: boolean
  setIsModalOpen: (open: boolean) => void
  editingProduct: Product | null
}

export function Products({
  products,
  categories,
  searchQuery,
  onRefresh,
  canEdit,
  canDelete,
  canAdd,
  onAdd,
  onEdit,
  onDelete,
  onSave,
  onImageUpload,
  isModalOpen,
  setIsModalOpen,
  editingProduct,
}: ProductsProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [showCategoryForm, setShowCategoryForm] = useState(false)

  const [formData, setFormData] = useState<Partial<Product>>({
    name: "", category: "", price: 0, images: [], colors: [],
    description: "", material: "", warranty: "", delivery: "", manufacturing: "",
    in_stock: true, is_on_sale: false, discount_percentage: 0, sale_price: 0,
    sale_start_date: "", sale_end_date: ""
  })

  // Reset form when modal opens
  const openModal = (product?: Product) => {
    if (product) {
      setFormData({
        ...product,
        colors: product.colors || [],
        in_stock: product.in_stock ?? true,
      })
    } else {
      setFormData({
        name: "", category: "", price: 0, images: [], colors: [],
        description: "", material: "", warranty: "", delivery: "", manufacturing: "",
        in_stock: true, is_on_sale: false, discount_percentage: 0, sale_price: 0,
        sale_start_date: "", sale_end_date: ""
      })
    }
  }

  // When editingProduct changes, update form
  useState(() => {
    openModal(editingProduct || undefined)
  })

  // Sync form when editingProduct or modal state changes
  if (isModalOpen && editingProduct && formData.name === "" && editingProduct.name !== "") {
    openModal(editingProduct)
  }
  if (isModalOpen && !editingProduct && formData.name !== "" && !isSaving) {
    // Check if we should reset -- only when opening for add
  }

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setIsUploading(true)
    const url = await onImageUpload(file)
    if (url) {
      setFormData({ ...formData, images: [...(formData.images || []), url] })
    }
    setIsUploading(false)
  }

  const handleRemoveImage = (index: number) => {
    const newImages = (formData.images || []).filter((_, i) => i !== index)
    setFormData({ ...formData, images: newImages })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.category) {
      alert("გთხოვთ აირჩიოთ კატეგორია.")
      return
    }
    setIsSaving(true)
    const success = await onSave(formData, !!editingProduct, editingProduct?.id)
    setIsSaving(false)
    if (success) {
      setFormData({
        name: "", category: "", price: 0, images: [], colors: [],
        description: "", material: "", warranty: "", delivery: "", manufacturing: "",
        in_stock: true, is_on_sale: false, discount_percentage: 0, sale_price: 0,
        sale_start_date: "", sale_end_date: ""
      })
    }
  }

  const outOfStock = products.filter(p => !p.in_stock).length;
  const avgPrice = products.length > 0 ? products.reduce((s, p) => s + Number(p.price), 0) / products.length : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KpiCard 
          icon={Package} 
          title="სულ პროდუქცია" 
          value={products.length} 
          subValue="კატალოგში" 
          color="from-sky-500 to-blue-600" 
        />
        <KpiCard 
          icon={X} 
          title="ამოწურული" 
          value={outOfStock} 
          subValue="მარაგის გარეშე" 
          color="from-rose-500 to-red-600" 
        />
        <KpiCard 
          icon={ImageIcon} 
          title="კატეგორიები" 
          value={categories.length} 
          subValue="აქტიური ჯგუფები" 
          color="from-violet-500 to-purple-600" 
        />
        <KpiCard 
          icon={Percent} 
          title="საშუალო ფასი" 
          value={`₾ ${Math.round(avgPrice).toLocaleString()}`} 
          subValue="ერთეულის ღირებულება" 
          color="from-amber-400 to-orange-500" 
        />
      </div>
      {/* Products Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="rounded-2xl border border-border/50 bg-card overflow-hidden"
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/50 bg-muted/50">
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">იმიჯი</th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">დასახელება / კატეგორია</th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">დეტალები</th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">ფასი</th>
                <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">მოქმედება</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {filteredProducts.map((product, index) => (
                <motion.tr
                  key={product.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className="group transition-colors hover:bg-muted/50"
                >
                  <td className="px-6 py-4">
                    <div className="relative h-16 w-16 overflow-hidden rounded-xl border border-border/50 bg-muted">
                      <img
                        src={product.images?.[0] || "https://via.placeholder.com/100"}
                        alt={product.name}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                      />
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-semibold text-foreground">{product.name}</p>
                    <span className="mt-1 inline-block rounded-full bg-muted px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      {product.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs text-muted-foreground space-y-1">
                    {product.material && <p><span className="font-semibold">მასალა:</span> {product.material}</p>}
                    {product.warranty && <p><span className="font-semibold">გარანტია:</span> {product.warranty}</p>}
                    <p>
                      <span className={cn(
                        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium",
                        product.in_stock !== false
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : "bg-red-500/10 text-red-600 dark:text-red-400"
                      )}>
                        {product.in_stock !== false ? "მარაგშია" : "არ არის მარაგში"}
                      </span>
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-lg font-bold text-foreground">₾ {Number(product.price).toLocaleString()}</p>
                    {isProductOnSale(product) && (
                      <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-red-500 px-2 py-0.5 text-[9px] font-black text-white uppercase">
                        <Percent className="h-2.5 w-2.5" />
                        {product.discount_percentage}% SALE
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {canEdit && (
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => { openModal(product); onEdit(product) }}
                          className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground transition-colors hover:bg-blue-500/10 hover:text-blue-500"
                        >
                          <Pencil className="h-4 w-4" />
                        </motion.button>
                      )}
                      {canDelete && (
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => onDelete(product.id)}
                          className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-500"
                        >
                          <Trash2 className="h-4 w-4" />
                        </motion.button>
                      )}
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredProducts.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20">
            <Package className="h-12 w-12 text-muted-foreground/30" />
            <p className="mt-4 text-lg font-medium text-muted-foreground">პროდუქტი ვერ მოიძებნა</p>
            {searchQuery && <p className="mt-2 text-sm text-muted-foreground">სცადეთ სხვა საძიებო სიტყვა</p>}
          </div>
        )}
      </motion.div>

      {/* Add/Edit Product Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 backdrop-blur-sm p-4 pt-10"
            onClick={() => setIsModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl rounded-2xl bg-card border border-border/50 shadow-2xl"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-border/50 px-6 py-4">
                <h3 className="text-lg font-semibold text-foreground">
                  {editingProduct ? "პროდუქტის რედაქტირება" : "ახალი პროდუქტი"}
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Modal Body */}
              <form onSubmit={handleSubmit} className="max-h-[70vh] overflow-y-auto p-6 space-y-4">
                {/* Name */}
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">დასახელება *</label>
                  <input
                    type="text"
                    required
                    value={formData.name || ""}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">კატეგორია *</label>
                  <select
                    required
                    value={formData.category || ""}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="">აირჩიეთ კატეგორია</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.name}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                {/* Price + Stock */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1 block">ფასი (₾) *</label>
                    <input
                      type="number"
                      required
                      min={0}
                      step={0.01}
                      value={formData.price || ""}
                      onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                      className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div className="flex items-end gap-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.in_stock !== false}
                        onChange={(e) => setFormData({ ...formData, in_stock: e.target.checked })}
                        className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                      />
                      <span className="text-sm text-foreground">მარაგშია</span>
                    </label>
                  </div>
                </div>

                {/* Images */}
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">სურათები</label>
                  <div className="flex flex-wrap gap-3">
                    {(formData.images || []).map((img, i) => (
                      <div key={i} className="group relative h-20 w-20 overflow-hidden rounded-xl border border-border/50">
                        <img src={img} alt="" className="h-full w-full object-cover" />
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(i)}
                          className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="h-4 w-4 text-white" />
                        </button>
                      </div>
                    ))}
                    <label className={cn(
                      "flex h-20 w-20 cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary transition-colors",
                      isUploading && "opacity-50 pointer-events-none"
                    )}>
                      {isUploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Plus className="h-5 w-5" />}
                      <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                    </label>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">აღწერა</label>
                  <textarea
                    rows={3}
                    value={formData.description || ""}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                  />
                </div>

                {/* Material / Warranty / Delivery */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1 block">მასალა</label>
                    <input
                      type="text"
                      value={formData.material || ""}
                      onChange={(e) => setFormData({ ...formData, material: e.target.value })}
                      className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1 block">გარანტია</label>
                    <input
                      type="text"
                      value={formData.warranty || ""}
                      onChange={(e) => setFormData({ ...formData, warranty: e.target.value })}
                      className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1 block">მიწოდება</label>
                    <input
                      type="text"
                      value={formData.delivery || ""}
                      onChange={(e) => setFormData({ ...formData, delivery: e.target.value })}
                      className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                </div>

                {/* Sale Section */}
                <div className="rounded-xl border border-border/50 bg-muted/30 p-4 space-y-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.is_on_sale || false}
                      onChange={(e) => setFormData({ ...formData, is_on_sale: e.target.checked })}
                      className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                    />
                    <span className="text-sm font-medium text-foreground">აქციაზეა</span>
                  </label>

                  {formData.is_on_sale && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">ფასდაკლება %</label>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={formData.discount_percentage || ""}
                          onChange={(e) => {
                            const pct = parseFloat(e.target.value) || 0
                            const sp = (formData.price || 0) * (1 - pct / 100)
                            setFormData({ ...formData, discount_percentage: pct, sale_price: Math.round(sp) })
                          }}
                          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">აქციის ფასი (₾)</label>
                        <input
                          type="number"
                          min={0}
                          value={formData.sale_price || ""}
                          onChange={(e) => setFormData({ ...formData, sale_price: parseFloat(e.target.value) || 0 })}
                          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">დაწყება</label>
                        <input
                          type="datetime-local"
                          value={formData.sale_start_date ? new Date(formData.sale_start_date).toISOString().slice(0, 16) : ""}
                          onChange={(e) => setFormData({ ...formData, sale_start_date: e.target.value })}
                          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">დასრულება</label>
                        <input
                          type="datetime-local"
                          value={formData.sale_end_date ? new Date(formData.sale_end_date).toISOString().slice(0, 16) : ""}
                          onChange={(e) => setFormData({ ...formData, sale_end_date: e.target.value })}
                          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Submit */}
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="rounded-xl border border-border px-6 py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors"
                  >
                    გაუქმება
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="rounded-xl bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors shadow-lg shadow-primary/25 disabled:opacity-50 flex items-center gap-2"
                  >
                    {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                    {editingProduct ? "განახლება" : "დამატება"}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
