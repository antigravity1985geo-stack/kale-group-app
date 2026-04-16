import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Pencil, Trash2, FolderOpen, X, Loader2, Plus, Package, Globe } from "lucide-react"
import type { Product, Category, CategoryTranslations } from "@/src/types/product"

interface CategoriesProps {
  categories: Category[]
  products: Product[]
  onRefresh: () => Promise<void>
  onAdd: () => void
  onEdit: (cat: Category) => void
  onDelete: (cat: Category) => void
  onSave: (data: Partial<Category>, isEditing: boolean, editId?: string, oldName?: string) => Promise<boolean>
  onImageUpload: (file: File) => Promise<string | null>
  isModalOpen: boolean
  setIsModalOpen: (open: boolean) => void
  editingCategory: Category | null
}

export function Categories({
  categories,
  products,
  onRefresh,
  onAdd,
  onEdit,
  onDelete,
  onSave,
  onImageUpload,
  isModalOpen,
  setIsModalOpen,
  editingCategory,
}: CategoriesProps) {
  const [formData, setFormData] = useState<Partial<Category>>({ name: "", image: "", translations: {} })
  const [isSaving, setIsSaving] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [translationLang, setTranslationLang] = useState<'en' | 'ru'>('en')

  // Sync form when editingCategory changes
  if (isModalOpen && editingCategory && formData.name === "" && editingCategory.name !== "") {
    setFormData({ name: editingCategory.name, image: editingCategory.image, translations: editingCategory.translations || {} })
  }

  const getProductCount = (categoryName: string) => {
    return products.filter((p) => p.category === categoryName).length
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setIsUploading(true)
    const url = await onImageUpload(file)
    if (url) {
      setFormData({ ...formData, image: url })
    }
    setIsUploading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    const oldName = editingCategory?.name
    const success = await onSave(formData, !!editingCategory, editingCategory?.id, oldName)
    setIsSaving(false)
    if (success) {
      setFormData({ name: "", image: "", translations: {} })
    }
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map((cat, index) => (
          <motion.div
            key={cat.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="group relative overflow-hidden rounded-2xl border border-border/50 bg-card h-80"
          >
            {/* Category Image - Full Cover */}
            <img
              src={cat.image || "https://via.placeholder.com/400x300"}
              alt={cat.name}
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/10" />
            
            {/* Overlay Info */}
            <div className="absolute bottom-0 left-0 right-0 p-5">
              <h3 className="text-xl font-bold text-white shadow-sm shadow-black/20">{cat.name}</h3>
              <p className="text-sm text-white/80 flex items-center gap-1.5 mt-1 font-medium shadow-sm shadow-black/20">
                <Package className="h-4 w-4" />
                {getProductCount(cat.name)} პროდუქტი
              </p>
            </div>

            {/* Floating Actions */}
            <div className="absolute top-3 right-3 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={(e) => {
                  e.stopPropagation()
                  setFormData({ name: cat.name, image: cat.image })
                  onEdit(cat)
                }}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 backdrop-blur-md text-white hover:bg-blue-500/80 transition-colors shadow-lg"
              >
                <Pencil className="h-4 w-4" />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete(cat)
                }}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 backdrop-blur-md text-white hover:bg-red-500/80 transition-colors shadow-lg"
              >
                <Trash2 className="h-4 w-4" />
              </motion.button>
            </div>
          </motion.div>
        ))}

        {categories.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center rounded-2xl border border-border/50 bg-card py-20">
            <FolderOpen className="h-12 w-12 text-muted-foreground/30" />
            <p className="mt-4 text-lg font-medium text-muted-foreground">კატეგორია ვერ მოიძებნა</p>
          </div>
        )}
      </div>

      {/* Add/Edit Category Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setIsModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-2xl bg-card border border-border/50 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-border/50 px-6 py-4">
                <h3 className="text-lg font-semibold text-foreground">
                  {editingCategory ? "კატეგორიის რედაქტირება" : "ახალი კატეგორია"}
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                {/* Georgian Name (main/internal key) */}
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">კატეგორიის სახელი (ქართული) *</label>
                  <input
                    type="text"
                    required
                    value={formData.name || ""}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    placeholder="მაგ: სამზარეულოს ავეჯი"
                  />
                </div>

                {/* Translations Section */}
                <div className="rounded-xl border border-border/50 bg-muted/20 p-4 space-y-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-foreground">თარგმანები</span>
                  </div>
                  {/* Lang Tabs */}
                  <div className="flex gap-2 mb-3">
                    {(['en', 'ru'] as const).map(lang => (
                      <button
                        key={lang}
                        type="button"
                        onClick={() => setTranslationLang(lang)}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors ${
                          translationLang === lang
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {lang === 'en' ? '🇬🇧 English' : '🇷🇺 Русский'}
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    value={(formData.translations as CategoryTranslations)?.[translationLang] || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      translations: { ...(formData.translations || {}), [translationLang]: e.target.value }
                    })}
                    className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    placeholder={translationLang === 'en' ? 'e.g. Kitchen Furniture' : 'напр. Кухонная мебель'}
                  />
                </div>

                {/* Image Preview + Upload */}
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">კატეგორიის სურათი *</label>
                  {formData.image && (
                    <div className="relative mb-3 h-40 overflow-hidden rounded-xl border border-border/50">
                      <img src={formData.image} alt="" className="h-full w-full object-cover" />
                    </div>
                  )}
                  <label className="flex items-center justify-center gap-2 cursor-pointer rounded-xl border-2 border-dashed border-border py-3 text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors">
                    {isUploading ? (
                      <><Loader2 className="h-4 w-4 animate-spin" /> ატვირთვა...</>
                    ) : (
                      <><Plus className="h-4 w-4" /> სურათის ატვირთვა</>
                    )}
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  </label>
                  {/* Or paste URL */}
                  <input
                    type="text"
                    placeholder="ან ჩაწერეთ URL"
                    value={formData.image || ""}
                    onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                    className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                  />
                </div>

                {/* Submit */}
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => { setIsModalOpen(false); setFormData({ name: "", image: "", translations: {} }) }}
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
                    {editingCategory ? "განახლება" : "დამატება"}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
