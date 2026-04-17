import React, { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Truck, FileText, Plus, RefreshCw, Loader2, Package, Search, X, Trash2, Eye, CheckCircle, AlertTriangle } from "lucide-react"
import { supabase } from "@/src/lib/supabase"
import { cn } from "@/src/lib/utils"

// ==================== TYPES ====================
interface Supplier {
  id: string
  name: string
  email?: string
  phone?: string
  address?: string
}

interface POItem {
  id?: string
  product_id?: string
  product_name: string
  product_sku?: string
  quantity_ordered: number
  quantity_received?: number
  unit_cost: number
  vat_rate: number
  vat_amount: number
  line_total: number
}

interface PurchaseOrder {
  id: string
  po_number: string
  supplier_id: string
  order_date: string
  expected_date?: string
  status: string
  subtotal: number
  vat_amount: number
  total_amount: number
  currency: string
  notes?: string
  suppliers?: { name: string }
  purchase_order_items?: POItem[]
}

interface GoodsReceipt {
  id: string
  grn_number: string
  po_id: string
  supplier_id: string
  receipt_date: string
  status: string
  notes?: string
  suppliers?: { name: string }
  purchase_orders?: { po_number: string }
  goods_receipt_items?: GRNItem[]
}

interface GRNItem {
  id?: string
  po_item_id?: string
  product_id?: string
  product_name: string
  quantity_received: number
  unit_cost: number
  notes?: string
}

// ==================== SUB-COMPONENTS ====================

// ---------- PO DETAIL VIEW ----------
function PODetailView({ po, onClose, onRefresh }: { po: PurchaseOrder; onClose: () => void; onRefresh: () => void }) {
  const [items, setItems] = useState<POItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadItems()
  }, [po.id])

  const loadItems = async () => {
    setLoading(true)
    const { data } = await supabase
      .from("purchase_order_items")
      .select("*")
      .eq("po_id", po.id)
    setItems(data || [])
    setLoading(false)
  }

  const handleStatusChange = async (newStatus: string) => {
    await supabase.from("purchase_orders").update({ status: newStatus }).eq("id", po.id)
    onRefresh()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-card rounded-2xl shadow-2xl border border-border/50 w-full max-w-3xl max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-card/95 backdrop-blur-md p-6 border-b border-border/50 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
              <FileText size={20} className="text-primary" /> {po.po_number}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">{po.suppliers?.name || "უცნობი მომწოდებელი"}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className={cn(
              "px-3 py-1 text-xs uppercase font-bold rounded-full",
              po.status === 'DRAFT' ? 'bg-muted text-muted-foreground' :
              po.status === 'SENT' ? 'bg-blue-500/10 text-blue-500' :
              po.status === 'FULLY_RECEIVED' ? 'bg-emerald-500/10 text-emerald-500' :
              po.status === 'CANCELLED' ? 'bg-red-500/10 text-red-500' :
              'bg-amber-500/10 text-amber-500'
            )}>{po.status}</span>
            <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg transition-colors">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Details */}
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-muted/30 p-3 rounded-lg">
              <p className="text-xs text-muted-foreground">თარიღი</p>
              <p className="font-semibold text-sm">{new Date(po.order_date).toLocaleDateString('ka-GE')}</p>
            </div>
            <div className="bg-muted/30 p-3 rounded-lg">
              <p className="text-xs text-muted-foreground">მოსალოდნელი</p>
              <p className="font-semibold text-sm">{po.expected_date ? new Date(po.expected_date).toLocaleDateString('ka-GE') : '—'}</p>
            </div>
            <div className="bg-muted/30 p-3 rounded-lg">
              <p className="text-xs text-muted-foreground">ქვეჯამი</p>
              <p className="font-semibold text-sm text-emerald-500">₾{Number(po.subtotal).toLocaleString()}</p>
            </div>
            <div className="bg-muted/30 p-3 rounded-lg">
              <p className="text-xs text-muted-foreground">ჯამი (დღგ-ით)</p>
              <p className="font-semibold text-sm text-emerald-500">₾{Number(po.total_amount).toLocaleString()}</p>
            </div>
          </div>

          {po.notes && (
            <div className="bg-muted/20 p-4 rounded-lg border border-border/30">
              <p className="text-xs text-muted-foreground mb-1">შენიშვნა</p>
              <p className="text-sm">{po.notes}</p>
            </div>
          )}

          {/* Items Table */}
          <div>
            <h4 className="text-sm font-bold text-foreground mb-3">პროდუქცია ({items.length})</h4>
            {loading ? (
              <div className="flex items-center justify-center py-8"><Loader2 size={24} className="animate-spin text-primary" /></div>
            ) : (
              <div className="border border-border/50 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 text-left">პროდუქტი</th>
                      <th className="px-4 py-3 text-right">რაოდენობა</th>
                      <th className="px-4 py-3 text-right">მიღებული</th>
                      <th className="px-4 py-3 text-right">ფასი</th>
                      <th className="px-4 py-3 text-right">დღგ</th>
                      <th className="px-4 py-3 text-right">ჯამი</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30">
                    {items.map((item, i) => (
                      <tr key={item.id || i} className="hover:bg-muted/10">
                        <td className="px-4 py-3 font-medium">{item.product_name}</td>
                        <td className="px-4 py-3 text-right">{Number(item.quantity_ordered)}</td>
                        <td className="px-4 py-3 text-right">{Number(item.quantity_received || 0)}</td>
                        <td className="px-4 py-3 text-right">₾{Number(item.unit_cost).toLocaleString()}</td>
                        <td className="px-4 py-3 text-right text-muted-foreground">₾{Number(item.vat_amount).toLocaleString()}</td>
                        <td className="px-4 py-3 text-right font-semibold text-emerald-500">₾{Number(item.line_total).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Actions */}
          {po.status === 'DRAFT' && (
            <div className="flex gap-2 pt-2">
              <button onClick={() => handleStatusChange('SENT')} className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-sm transition-colors">
                გაგზავნა მომწოდებლისთვის
              </button>
              <button onClick={() => handleStatusChange('CANCELLED')} className="px-6 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg font-semibold text-sm transition-colors">
                გაუქმება
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}

// ---------- CREATE PO MODAL ----------
function CreatePOModal({ suppliers, onClose, onCreated }: { suppliers: Supplier[]; onClose: () => void; onCreated: () => void }) {
  const [supplierId, setSupplierId] = useState("")
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0])
  const [expectedDate, setExpectedDate] = useState("")
  const [notes, setNotes] = useState("")
  const [items, setItems] = useState<POItem[]>([{ product_name: "", quantity_ordered: 1, unit_cost: 0, vat_rate: 18, vat_amount: 0, line_total: 0 }])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const recalcItem = (item: POItem): POItem => {
    const subtotal = item.quantity_ordered * item.unit_cost
    const vatAmt = subtotal * (item.vat_rate / 100)
    return { ...item, vat_amount: Math.round(vatAmt * 100) / 100, line_total: Math.round((subtotal + vatAmt) * 100) / 100 }
  }

  const updateItem = (index: number, field: string, value: any) => {
    const updated = [...items]
    updated[index] = { ...updated[index], [field]: value }
    updated[index] = recalcItem(updated[index])
    setItems(updated)
  }

  const addItem = () => {
    setItems([...items, { product_name: "", quantity_ordered: 1, unit_cost: 0, vat_rate: 18, vat_amount: 0, line_total: 0 }])
  }

  const removeItem = (index: number) => {
    if (items.length <= 1) return
    setItems(items.filter((_, i) => i !== index))
  }

  const totals = items.reduce((acc, item) => {
    const sub = item.quantity_ordered * item.unit_cost
    return { subtotal: acc.subtotal + sub, vat: acc.vat + item.vat_amount, total: acc.total + item.line_total }
  }, { subtotal: 0, vat: 0, total: 0 })

  const handleSave = async () => {
    setError("")
    if (!supplierId) { setError("აირჩიეთ მომწოდებელი"); return }
    if (items.some(i => !i.product_name.trim())) { setError("შეავსეთ ყველა პროდუქტის სახელი"); return }
    if (items.some(i => i.quantity_ordered <= 0 || i.unit_cost <= 0)) { setError("რაოდენობა და ფასი უნდა იყოს 0-ზე მეტი"); return }

    setSaving(true)
    try {
      // Create PO (po_number auto-generated by DB trigger)
      const { data: po, error: poErr } = await supabase
        .from("purchase_orders")
        .insert({
          po_number: "", // trigger generates it
          supplier_id: supplierId,
          order_date: orderDate,
          expected_date: expectedDate || null,
          status: "DRAFT",
          subtotal: Math.round(totals.subtotal * 100) / 100,
          vat_amount: Math.round(totals.vat * 100) / 100,
          total_amount: Math.round(totals.total * 100) / 100,
          currency: "GEL",
          notes: notes || null,
        })
        .select()
        .single()

      if (poErr) throw poErr

      // Insert items
      const poItems = items.map(item => ({
        po_id: po.id,
        product_name: item.product_name,
        product_sku: item.product_sku || null,
        quantity_ordered: item.quantity_ordered,
        unit_cost: item.unit_cost,
        vat_rate: item.vat_rate,
        vat_amount: item.vat_amount,
        line_total: item.line_total,
      }))

      const { error: itemsErr } = await supabase
        .from("purchase_order_items")
        .insert(poItems)

      if (itemsErr) throw itemsErr

      onCreated()
      onClose()
    } catch (err: any) {
      setError(err.message || "შეცდომა PO-ს შექმნისას")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="bg-card rounded-2xl shadow-2xl border border-border/50 w-full max-w-3xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 bg-card/95 backdrop-blur-md p-6 border-b border-border/50 flex items-center justify-between">
          <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Plus size={20} className="text-primary" /> ახალი შესყიდვის ორდერი (PO)
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg transition-colors"><X size={18} /></button>
        </div>

        <div className="p-6 space-y-5">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 flex items-center gap-2 text-red-500 text-sm">
              <AlertTriangle size={16} /> {error}
            </div>
          )}

          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5">მომწოდებელი *</label>
              <select
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className="w-full bg-background border border-border/50 rounded-lg px-3 py-2.5 text-sm focus:border-primary transition-all outline-none"
              >
                <option value="">— აირჩიეთ —</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5">შეკვეთის თარიღი</label>
              <input type="date" value={orderDate} onChange={(e) => setOrderDate(e.target.value)}
                className="w-full bg-background border border-border/50 rounded-lg px-3 py-2.5 text-sm focus:border-primary transition-all outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5">მოსალოდნელი მიღების თარიღი</label>
              <input type="date" value={expectedDate} onChange={(e) => setExpectedDate(e.target.value)}
                className="w-full bg-background border border-border/50 rounded-lg px-3 py-2.5 text-sm focus:border-primary transition-all outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5">შენიშვნა</label>
              <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="არასავალდებულო"
                className="w-full bg-background border border-border/50 rounded-lg px-3 py-2.5 text-sm focus:border-primary transition-all outline-none" />
            </div>
          </div>

          {/* Items */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-bold text-foreground">პროდუქცია</h4>
              <button onClick={addItem} className="text-xs px-3 py-1.5 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors font-semibold">
                + დამატება
              </button>
            </div>

            <div className="space-y-3">
              {items.map((item, index) => (
                <div key={index} className="bg-muted/20 border border-border/30 rounded-lg p-4">
                  <div className="grid grid-cols-12 gap-3 items-end">
                    <div className="col-span-12 md:col-span-4">
                      <label className="block text-[10px] uppercase font-semibold text-muted-foreground mb-1">პროდუქტი *</label>
                      <input type="text" value={item.product_name} onChange={(e) => updateItem(index, 'product_name', e.target.value)}
                        placeholder="მაგ: MDF ფილა 18მმ"
                        className="w-full bg-background border border-border/50 rounded-lg px-3 py-2 text-sm focus:border-primary transition-all outline-none" />
                    </div>
                    <div className="col-span-4 md:col-span-2">
                      <label className="block text-[10px] uppercase font-semibold text-muted-foreground mb-1">რაოდენობა</label>
                      <input type="number" min="1" value={item.quantity_ordered} onChange={(e) => updateItem(index, 'quantity_ordered', parseFloat(e.target.value) || 0)}
                        className="w-full bg-background border border-border/50 rounded-lg px-3 py-2 text-sm focus:border-primary transition-all outline-none" />
                    </div>
                    <div className="col-span-4 md:col-span-2">
                      <label className="block text-[10px] uppercase font-semibold text-muted-foreground mb-1">ფასი (₾)</label>
                      <input type="number" min="0" step="0.01" value={item.unit_cost} onChange={(e) => updateItem(index, 'unit_cost', parseFloat(e.target.value) || 0)}
                        className="w-full bg-background border border-border/50 rounded-lg px-3 py-2 text-sm focus:border-primary transition-all outline-none" />
                    </div>
                    <div className="col-span-3 md:col-span-2">
                      <label className="block text-[10px] uppercase font-semibold text-muted-foreground mb-1">დღგ %</label>
                      <input type="number" min="0" value={item.vat_rate} onChange={(e) => updateItem(index, 'vat_rate', parseFloat(e.target.value) || 0)}
                        className="w-full bg-background border border-border/50 rounded-lg px-3 py-2 text-sm focus:border-primary transition-all outline-none" />
                    </div>
                    <div className="col-span-1 md:col-span-1 flex items-end">
                      <p className="text-sm font-semibold text-emerald-500 py-2">₾{item.line_total.toFixed(2)}</p>
                    </div>
                    <div className="col-span-1 flex items-end justify-end">
                      <button onClick={() => removeItem(index)} disabled={items.length <= 1}
                        className="p-2 text-red-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div className="bg-muted/30 rounded-lg p-4 border border-border/30">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-muted-foreground">ქვეჯამი:</span>
              <span className="font-semibold">₾{totals.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-muted-foreground">დღგ:</span>
              <span className="font-semibold">₾{totals.vat.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-base pt-2 border-t border-border/30">
              <span className="font-bold">სულ ჯამი:</span>
              <span className="font-bold text-emerald-500">₾{totals.total.toFixed(2)}</span>
            </div>
          </div>

          {/* Save */}
          <button onClick={handleSave} disabled={saving}
            className="w-full py-3.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-bold text-sm transition-all shadow-md disabled:opacity-50 flex items-center justify-center gap-2">
            {saving ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
            {saving ? "ინახება..." : "შექმნა"}
          </button>
        </div>
      </motion.div>
    </div>
  )
}

// ---------- CREATE GRN MODAL ----------
function CreateGRNModal({ suppliers, purchaseOrders, onClose, onCreated }: { suppliers: Supplier[]; purchaseOrders: PurchaseOrder[]; onClose: () => void; onCreated: () => void }) {
  const [selectedPOId, setSelectedPOId] = useState("")
  const [receiptDate, setReceiptDate] = useState(new Date().toISOString().split('T')[0])
  const [notes, setNotes] = useState("")
  const [items, setItems] = useState<GRNItem[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [loadingItems, setLoadingItems] = useState(false)

  // Filter out CANCELLED POs and already FULLY_RECEIVED
  const eligiblePOs = purchaseOrders.filter(po => po.status !== 'CANCELLED' && po.status !== 'FULLY_RECEIVED')

  const handlePOChange = async (poId: string) => {
    setSelectedPOId(poId)
    if (!poId) { setItems([]); return }

    setLoadingItems(true)
    const { data } = await supabase
      .from("purchase_order_items")
      .select("*")
      .eq("po_id", poId)

    if (data) {
      setItems(data.map(item => ({
        po_item_id: item.id,
        product_id: item.product_id,
        product_name: item.product_name,
        quantity_received: Math.max(0, Number(item.quantity_ordered) - Number(item.quantity_received || 0)),
        unit_cost: Number(item.unit_cost),
      })))
    }
    setLoadingItems(false)
  }

  const updateItem = (index: number, field: string, value: any) => {
    const updated = [...items]
    updated[index] = { ...updated[index], [field]: value }
    setItems(updated)
  }

  const handleSave = async () => {
    setError("")
    if (!selectedPOId) { setError("აირჩიეთ შესყიდვის ორდერი (PO)"); return }
    if (items.length === 0) { setError("PO-ს პროდუქცია არ მოიძებნა"); return }
    if (items.every(i => i.quantity_received <= 0)) { setError("მიუთითეთ მინიმუმ 1 პროდუქტის მიღებული რაოდენობა"); return }

    setSaving(true)
    try {
      const selectedPO = purchaseOrders.find(po => po.id === selectedPOId)
      if (!selectedPO) throw new Error("PO ვერ მოიძებნა")

      // Create GRN (grn_number auto-generated by DB trigger)
      const { data: grn, error: grnErr } = await supabase
        .from("goods_receipts")
        .insert({
          grn_number: "", // trigger generates it
          po_id: selectedPOId,
          supplier_id: selectedPO.supplier_id,
          receipt_date: receiptDate,
          status: "DRAFT",
          notes: notes || null,
        })
        .select()
        .single()

      if (grnErr) throw grnErr

      // Insert GRN items (only where quantity > 0)
      const grnItems = items
        .filter(item => item.quantity_received > 0)
        .map(item => ({
          grn_id: grn.id,
          po_item_id: item.po_item_id || null,
          product_id: item.product_id || null,
          product_name: item.product_name,
          quantity_received: item.quantity_received,
          unit_cost: item.unit_cost,
          notes: item.notes || null,
        }))

      const { error: itemsErr } = await supabase
        .from("goods_receipt_items")
        .insert(grnItems)

      if (itemsErr) throw itemsErr

      onCreated()
      onClose()
    } catch (err: any) {
      setError(err.message || "შეცდომა GRN-ის შექმნისას")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="bg-card rounded-2xl shadow-2xl border border-border/50 w-full max-w-3xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 bg-card/95 backdrop-blur-md p-6 border-b border-border/50 flex items-center justify-between">
          <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Package size={20} className="text-primary" /> ახალი მიღება-ჩაბარება (GRN)
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg transition-colors"><X size={18} /></button>
        </div>

        <div className="p-6 space-y-5">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 flex items-center gap-2 text-red-500 text-sm">
              <AlertTriangle size={16} /> {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5">შესყიდვის ორდერი (PO) *</label>
              <select
                value={selectedPOId}
                onChange={(e) => handlePOChange(e.target.value)}
                className="w-full bg-background border border-border/50 rounded-lg px-3 py-2.5 text-sm focus:border-primary transition-all outline-none"
              >
                <option value="">— აირჩიეთ PO —</option>
                {eligiblePOs.map(po => (
                  <option key={po.id} value={po.id}>
                    {po.po_number} — {po.suppliers?.name || "უცნობი"} (₾{Number(po.total_amount).toLocaleString()})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5">მიღების თარიღი</label>
              <input type="date" value={receiptDate} onChange={(e) => setReceiptDate(e.target.value)}
                className="w-full bg-background border border-border/50 rounded-lg px-3 py-2.5 text-sm focus:border-primary transition-all outline-none" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5">შენიშვნა</label>
              <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="არასავალდებულო"
                className="w-full bg-background border border-border/50 rounded-lg px-3 py-2.5 text-sm focus:border-primary transition-all outline-none" />
            </div>
          </div>

          {/* Items from PO */}
          {loadingItems ? (
            <div className="flex items-center justify-center py-8"><Loader2 size={24} className="animate-spin text-primary" /></div>
          ) : items.length > 0 && (
            <div>
              <h4 className="text-sm font-bold text-foreground mb-3">მისაღები პროდუქცია</h4>
              <div className="border border-border/50 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 text-left">პროდუქტი</th>
                      <th className="px-4 py-3 text-right">მისაღები რაოდ.</th>
                      <th className="px-4 py-3 text-right">ერთეულის ფასი</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30">
                    {items.map((item, i) => (
                      <tr key={i} className="hover:bg-muted/10">
                        <td className="px-4 py-3 font-medium">{item.product_name}</td>
                        <td className="px-4 py-3 text-right">
                          <input type="number" min="0" value={item.quantity_received}
                            onChange={(e) => updateItem(i, 'quantity_received', parseFloat(e.target.value) || 0)}
                            className="w-24 bg-background border border-border/50 rounded-lg px-2 py-1.5 text-sm text-right focus:border-primary transition-all outline-none" />
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-emerald-500">₾{Number(item.unit_cost).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {selectedPOId && items.length === 0 && !loadingItems && (
            <div className="text-center py-8 text-muted-foreground text-sm">ამ PO-ს პროდუქცია არ მოიძებნა</div>
          )}

          {/* Save */}
          <button onClick={handleSave} disabled={saving || !selectedPOId}
            className="w-full py-3.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-bold text-sm transition-all shadow-md disabled:opacity-50 flex items-center justify-center gap-2">
            {saving ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
            {saving ? "ინახება..." : "შექმნა"}
          </button>
        </div>
      </motion.div>
    </div>
  )
}

// ---------- GRN DETAIL VIEW ----------
function GRNDetailView({ grn, onClose, onRefresh }: { grn: GoodsReceipt; onClose: () => void; onRefresh: () => void }) {
  const [items, setItems] = useState<GRNItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadItems()
  }, [grn.id])

  const loadItems = async () => {
    setLoading(true)
    const { data } = await supabase
      .from("goods_receipt_items")
      .select("*")
      .eq("grn_id", grn.id)
    setItems(data || [])
    setLoading(false)
  }

  const handleConfirm = async () => {
    // Confirming GRN triggers DB function sync_po_received_on_grn
    await supabase.from("goods_receipts").update({ status: "CONFIRMED" }).eq("id", grn.id)
    onRefresh()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-card rounded-2xl shadow-2xl border border-border/50 w-full max-w-3xl max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 bg-card/95 backdrop-blur-md p-6 border-b border-border/50 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Package size={20} className="text-primary" /> {grn.grn_number}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">{grn.suppliers?.name} · PO: {grn.purchase_orders?.po_number}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className={cn(
              "px-3 py-1 text-xs uppercase font-bold rounded-full",
              grn.status === 'DRAFT' ? 'bg-muted text-muted-foreground' :
              grn.status === 'CONFIRMED' ? 'bg-emerald-500/10 text-emerald-500' :
              'bg-red-500/10 text-red-500'
            )}>{grn.status}</span>
            <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg transition-colors"><X size={18} /></button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-muted/30 p-3 rounded-lg">
              <p className="text-xs text-muted-foreground">მიღების თარიღი</p>
              <p className="font-semibold text-sm">{new Date(grn.receipt_date).toLocaleDateString('ka-GE')}</p>
            </div>
            <div className="bg-muted/30 p-3 rounded-lg">
              <p className="text-xs text-muted-foreground">სტატუსი</p>
              <p className="font-semibold text-sm">{grn.status === 'CONFIRMED' ? '✅ დადასტურებული' : grn.status === 'DRAFT' ? '📝 შავი ვარიანტი' : '❌ გაუქმებული'}</p>
            </div>
          </div>

          {grn.notes && (
            <div className="bg-muted/20 p-4 rounded-lg border border-border/30">
              <p className="text-xs text-muted-foreground mb-1">შენიშვნა</p>
              <p className="text-sm">{grn.notes}</p>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-8"><Loader2 size={24} className="animate-spin text-primary" /></div>
          ) : (
            <div>
              <h4 className="text-sm font-bold text-foreground mb-3">მიღებული პროდუქცია ({items.length})</h4>
              <div className="border border-border/50 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 text-left">პროდუქტი</th>
                      <th className="px-4 py-3 text-right">რაოდენობა</th>
                      <th className="px-4 py-3 text-right">ფასი</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30">
                    {items.map((item, i) => (
                      <tr key={item.id || i} className="hover:bg-muted/10">
                        <td className="px-4 py-3 font-medium">{item.product_name}</td>
                        <td className="px-4 py-3 text-right">{Number(item.quantity_received)}</td>
                        <td className="px-4 py-3 text-right font-medium text-emerald-500">₾{Number(item.unit_cost).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {grn.status === 'DRAFT' && (
            <button onClick={handleConfirm}
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm transition-all shadow-md flex items-center justify-center gap-2">
              <CheckCircle size={18} /> დადასტურება (საწყობში შეტანა)
            </button>
          )}
        </div>
      </motion.div>
    </div>
  )
}

// ==================== MAIN COMPONENT ====================
export default function Procurement() {
  const [activeTab, setActiveTab] = useState<"orders" | "receipts">("orders")
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")

  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([])
  const [goodsReceipts, setGoodsReceipts] = useState<GoodsReceipt[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])

  // Modal states
  const [showCreatePO, setShowCreatePO] = useState(false)
  const [showCreateGRN, setShowCreateGRN] = useState(false)
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null)
  const [selectedGRN, setSelectedGRN] = useState<GoodsReceipt | null>(null)

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const [poRes, grRes, supRes] = await Promise.all([
        supabase.from("purchase_orders").select("*, suppliers(name)").order("order_date", { ascending: false }),
        supabase.from("goods_receipts").select("*, suppliers(name), purchase_orders(po_number)").order("receipt_date", { ascending: false }),
        supabase.from("suppliers").select("*").order("name")
      ])
      
      if (poRes.data) setPurchaseOrders(poRes.data)
      if (grRes.data) setGoodsReceipts(grRes.data)
      if (supRes.data) setSuppliers(supRes.data)
    } catch (err) {
      console.error("Fetch procurement error:", err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Filtered data
  const q = searchQuery.toLowerCase()
  const filteredPOs = purchaseOrders.filter(po =>
    (po.po_number || "").toLowerCase().includes(q) ||
    (po.suppliers?.name || "").toLowerCase().includes(q)
  )
  const filteredGRNs = goodsReceipts.filter(gr =>
    (gr.grn_number || "").toLowerCase().includes(q) ||
    (gr.suppliers?.name || "").toLowerCase().includes(q)
  )

  const handleAddClick = () => {
    if (activeTab === 'orders') setShowCreatePO(true)
    else setShowCreateGRN(true)
  }

  return (
    <div className="space-y-6">
      {/* Header & Navigation */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-card p-4 rounded-xl border border-border/50 shadow-sm">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2 text-foreground">
            <Truck className="text-primary" /> შესყიდვები (Procurement)
          </h2>
          <p className="text-sm text-muted-foreground mt-1">მართეთ შესყიდვის ორდერები (PO) და მიღება-ჩაბარების აქტები (GRN)</p>
        </div>
        
        <div className="flex bg-muted/50 p-1 rounded-xl border border-border/50">
          {[
            { id: "orders", label: "PO (ორდერები)", icon: <FileText size={16} /> },
            { id: "receipts", label: "GRN (მიღება-ჩაბარება)", icon: <Package size={16} /> }
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all outline-none",
                activeTab === t.id 
                  ? "bg-primary text-primary-foreground shadow-sm" 
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex justify-between items-center bg-card shadow-sm p-4 rounded-xl border border-border/50">
        <div className="relative w-72">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input 
            type="text" 
            placeholder="ძიება..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-background border border-border/50 rounded-lg pl-10 pr-4 py-2 text-sm text-foreground focus:border-primary transition-all outline-none"
          />
        </div>
        
        <div className="flex gap-2">
          <button onClick={fetchData} className="px-3 py-2 bg-muted hover:bg-muted/80 text-foreground rounded-lg transition-colors border border-border/50 outline-none flex items-center justify-center">
            <RefreshCw size={16} className={isLoading ? 'animate-spin cursor-not-allowed' : ''} />
          </button>
          <button onClick={handleAddClick} className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-semibold text-sm transition-all border-none outline-none shadow-sm">
            <Plus size={16} /> 
            {activeTab === 'orders' ? 'ახალი PO' : 'ახალი მიღება'}
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="bg-card shadow-sm rounded-xl border border-border/50 overflow-hidden min-h-[400px]">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-64 text-primary">
            <Loader2 size={32} className="animate-spin mb-4" />
            <p className="text-sm font-bold tracking-widest uppercase text-muted-foreground">მონაცემები იტვირთება...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            {activeTab === 'orders' && (
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/50 text-muted-foreground text-xs uppercase">
                  <tr>
                    <th className="px-6 py-4 font-semibold">PO #</th>
                    <th className="px-6 py-4 font-semibold">თარიღი</th>
                    <th className="px-6 py-4 font-semibold">მომწოდებელი</th>
                    <th className="px-6 py-4 font-semibold text-right">ჯამი</th>
                    <th className="px-6 py-4 font-semibold text-right">სტატუსი</th>
                    <th className="px-6 py-4 font-semibold text-center">მოქმედება</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {filteredPOs.map(po => (
                    <tr key={po.id} className="hover:bg-muted/20 transition-colors cursor-pointer" onClick={() => setSelectedPO(po)}>
                      <td className="px-6 py-4 font-mono text-primary font-semibold">{po.po_number || po.id.slice(0,8)}</td>
                      <td className="px-6 py-4">{new Date(po.order_date).toLocaleDateString('ka-GE')}</td>
                      <td className="px-6 py-4 font-semibold">{po.suppliers?.name || "უცნობი"}</td>
                      <td className="px-6 py-4 text-right font-medium text-emerald-500">₾{Number(po.total_amount || 0).toLocaleString()}</td>
                      <td className="px-6 py-4 text-right">
                         <span className={cn(
                           "px-2 py-1 text-[10px] uppercase font-bold rounded",
                           po.status === 'DRAFT' ? 'bg-muted text-muted-foreground' :
                           po.status === 'SENT' ? 'bg-blue-500/10 text-blue-500' :
                           po.status === 'FULLY_RECEIVED' ? 'bg-emerald-500/10 text-emerald-500' :
                           po.status === 'CANCELLED' ? 'bg-red-500/10 text-red-500' :
                           'bg-amber-500/10 text-amber-500'
                         )}>
                           {po.status || "DRAFT"}
                         </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button onClick={(e) => { e.stopPropagation(); setSelectedPO(po) }}
                          className="p-1.5 hover:bg-muted rounded-lg transition-colors text-muted-foreground hover:text-foreground">
                          <Eye size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredPOs.length === 0 && (
                    <tr><td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">PO ორდერები ვერ მოიძებნა</td></tr>
                  )}
                </tbody>
              </table>
            )}

            {activeTab === 'receipts' && (
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/50 text-muted-foreground text-xs uppercase">
                  <tr>
                    <th className="px-6 py-4 font-semibold">GRN #</th>
                    <th className="px-6 py-4 font-semibold">თარიღი</th>
                    <th className="px-6 py-4 font-semibold">მომწოდებელი</th>
                    <th className="px-6 py-4 font-semibold">PO</th>
                    <th className="px-6 py-4 font-semibold text-right">სტატუსი</th>
                    <th className="px-6 py-4 font-semibold text-center">მოქმედება</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {filteredGRNs.map(gr => (
                    <tr key={gr.id} className="hover:bg-muted/20 transition-colors cursor-pointer" onClick={() => setSelectedGRN(gr)}>
                      <td className="px-6 py-4 font-mono text-primary font-semibold">{gr.grn_number || gr.id.slice(0,8)}</td>
                      <td className="px-6 py-4">{new Date(gr.receipt_date).toLocaleDateString('ka-GE')}</td>
                      <td className="px-6 py-4 font-semibold">{gr.suppliers?.name || "უცნობი"}</td>
                      <td className="px-6 py-4 font-mono text-xs">{gr.purchase_orders?.po_number || "—"}</td>
                      <td className="px-6 py-4 text-right">
                         <span className={cn(
                           "px-2 py-1 text-[10px] uppercase font-bold rounded",
                           gr.status === 'DRAFT' ? 'bg-muted text-muted-foreground' :
                           gr.status === 'CONFIRMED' ? 'bg-emerald-500/10 text-emerald-500' :
                           'bg-red-500/10 text-red-500'
                         )}>
                           {gr.status || "DRAFT"}
                         </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button onClick={(e) => { e.stopPropagation(); setSelectedGRN(gr) }}
                          className="p-1.5 hover:bg-muted rounded-lg transition-colors text-muted-foreground hover:text-foreground">
                          <Eye size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredGRNs.length === 0 && (
                    <tr><td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">მიღება-ჩაბარების აქტები ვერ მოიძებნა</td></tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showCreatePO && (
          <CreatePOModal
            suppliers={suppliers}
            onClose={() => setShowCreatePO(false)}
            onCreated={fetchData}
          />
        )}
        {showCreateGRN && (
          <CreateGRNModal
            suppliers={suppliers}
            purchaseOrders={purchaseOrders}
            onClose={() => setShowCreateGRN(false)}
            onCreated={fetchData}
          />
        )}
        {selectedPO && (
          <PODetailView
            po={selectedPO}
            onClose={() => setSelectedPO(null)}
            onRefresh={fetchData}
          />
        )}
        {selectedGRN && (
          <GRNDetailView
            grn={selectedGRN}
            onClose={() => setSelectedGRN(null)}
            onRefresh={fetchData}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
