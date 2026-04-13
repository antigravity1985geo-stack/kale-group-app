import React, { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Truck, FileText, Plus, RefreshCw, Loader2, Package, Search } from "lucide-react"
import { supabase } from "@/src/lib/supabase"
import { cn } from "@/src/lib/utils"

export default function Procurement() {
  const [activeTab, setActiveTab] = useState<"orders" | "receipts">("orders")
  const [isLoading, setIsLoading] = useState(true)

  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([])
  const [goodsReceipts, setGoodsReceipts] = useState<any[]>([])
  const [suppliers, setSuppliers] = useState<any[]>([])

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const [poRes, grRes, supRes] = await Promise.all([
        supabase.from("purchase_orders").select("*, suppliers(name)").order("order_date", { ascending: false }),
        supabase.from("goods_receipts").select("*, suppliers(name)").order("receipt_date", { ascending: false }),
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
            className="w-full bg-background border border-border/50 rounded-lg pl-10 pr-4 py-2 text-sm text-foreground focus:border-primary transition-all outline-none"
          />
        </div>
        
        <div className="flex gap-2">
          <button onClick={fetchData} className="px-3 py-2 bg-muted hover:bg-muted/80 text-foreground rounded-lg transition-colors border border-border/50 outline-none flex items-center justify-center">
            <RefreshCw size={16} className={isLoading ? 'animate-spin cursor-not-allowed' : ''} />
          </button>
          <button onClick={() => alert("მალე დაემატება (MOCK)")} className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-semibold text-sm transition-all border-none outline-none shadow-sm">
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
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {purchaseOrders.map(po => (
                    <tr key={po.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-6 py-4 font-mono text-muted-foreground">{po.po_number || po.id.slice(0,8)}</td>
                      <td className="px-6 py-4">{new Date(po.order_date).toLocaleDateString()}</td>
                      <td className="px-6 py-4 font-semibold">{po.suppliers?.name || "უცნობი"}</td>
                      <td className="px-6 py-4 text-right font-medium text-emerald-500">₾{Number(po.total_amount || 0).toLocaleString()}</td>
                      <td className="px-6 py-4 text-right">
                         <span className={cn(
                           "px-2 py-1 text-[10px] uppercase font-bold rounded",
                           po.status === 'DRAFT' ? 'bg-muted text-muted-foreground' :
                           po.status === 'RECEIVED' ? 'bg-emerald-500/10 text-emerald-500' :
                           'bg-amber-500/10 text-amber-500'
                         )}>
                           {po.status || "DRAFT"}
                         </span>
                      </td>
                    </tr>
                  ))}
                  {purchaseOrders.length === 0 && (
                    <tr><td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">PO ორდერები ვერ მოიძებნა</td></tr>
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
                    <th className="px-6 py-4 font-semibold">საწყობი</th>
                    <th className="px-6 py-4 font-semibold text-right">სტატუსი</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {goodsReceipts.map(gr => (
                    <tr key={gr.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-6 py-4 font-mono text-muted-foreground">{gr.grn_number || gr.id.slice(0,8)}</td>
                      <td className="px-6 py-4">{new Date(gr.receipt_date).toLocaleDateString()}</td>
                      <td className="px-6 py-4 font-semibold">{gr.suppliers?.name || "უცნობი"}</td>
                      <td className="px-6 py-4">{gr.warehouse_destination || "მთავარი"}</td>
                      <td className="px-6 py-4 text-right">
                         <span className={cn(
                           "px-2 py-1 text-[10px] uppercase font-bold rounded",
                           gr.status === 'DRAFT' ? 'bg-muted text-muted-foreground' :
                           'bg-emerald-500/10 text-emerald-500'
                         )}>
                           {gr.status || "DRAFT"}
                         </span>
                      </td>
                    </tr>
                  ))}
                  {goodsReceipts.length === 0 && (
                    <tr><td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">მიღება-ჩაბარების აქტები ვერ მოიძებნა</td></tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
