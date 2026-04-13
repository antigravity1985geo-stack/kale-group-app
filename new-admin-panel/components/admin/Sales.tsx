"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Pencil, XCircle, Tag, Clock, Calendar } from "lucide-react"
import { cn } from "@/lib/utils"

const mockSales = [
  {
    id: "1",
    name: "პრემიუმ ტყავის დივანი",
    category: "დივნები",
    originalPrice: 2850,
    salePrice: 2450,
    discountPercent: 14,
    endDate: "2026-04-30",
    image: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=200&h=200&fit=crop",
    isActive: true,
  },
  {
    id: "2",
    name: "მინიმალისტური ყავის მაგიდა",
    category: "მაგიდები",
    originalPrice: 450,
    salePrice: 380,
    discountPercent: 16,
    endDate: "2026-05-15",
    image: "https://images.unsplash.com/photo-1533090481720-856c6e3c1fdc?w=200&h=200&fit=crop",
    isActive: true,
  },
  {
    id: "3",
    name: "თანამედროვე საწოლი",
    category: "საწოლები",
    originalPrice: 1850,
    salePrice: 1600,
    discountPercent: 14,
    endDate: null,
    image: "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=200&h=200&fit=crop",
    isActive: true,
  },
  {
    id: "4",
    name: "კლასიკური სავარძელი",
    category: "სავარძლები",
    originalPrice: 890,
    salePrice: 712,
    discountPercent: 20,
    endDate: "2026-03-31",
    image: "https://images.unsplash.com/photo-1580480055273-228ff5388ef8?w=200&h=200&fit=crop",
    isActive: false,
  },
]

export function Sales() {
  const [activeTab, setActiveTab] = useState<"active" | "history">("active")

  const filteredSales = mockSales.filter((s) =>
    activeTab === "active" ? s.isActive : !s.isActive
  )

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="flex gap-2"
      >
        {[
          { id: "active", label: "აქტიური კამპანიები" },
          { id: "history", label: "ისტორია" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={cn(
              "flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all",
              activeTab === tab.id
                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                : "bg-card text-muted-foreground hover:bg-muted hover:text-foreground border border-border/50"
            )}
          >
            {tab.label}
          </button>
        ))}
      </motion.div>

      {/* Sales Table */}
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
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  პროდუქტი
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  ფასდაკლება
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  ფასი
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  სრულდება
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  მოქმედება
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {filteredSales.map((sale, index) => (
                <motion.tr
                  key={sale.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="group transition-colors hover:bg-muted/50"
                >
                  {/* Product */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      <div className="relative h-16 w-16 overflow-hidden rounded-xl bg-muted">
                        <img
                          src={sale.image}
                          alt={sale.name}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                        />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{sale.name}</p>
                        <p className="mt-0.5 text-sm text-muted-foreground">{sale.category}</p>
                      </div>
                    </div>
                  </td>

                  {/* Discount */}
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/10 px-3 py-1.5 text-sm font-semibold text-red-500">
                      <Tag className="h-3.5 w-3.5" />
                      -{sale.discountPercent}%
                    </span>
                  </td>

                  {/* Price */}
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <span className="text-lg font-bold text-foreground">₾ {sale.salePrice}</span>
                      <p className="text-sm text-muted-foreground line-through">₾ {sale.originalPrice}</p>
                    </div>
                  </td>

                  {/* End Date */}
                  <td className="px-6 py-4">
                    {sale.endDate ? (
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Calendar className="h-3.5 w-3.5" />
                        {sale.endDate}
                      </div>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                        <Clock className="h-3 w-3" />
                        უვადო
                      </span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground transition-colors hover:bg-blue-500/10 hover:text-blue-500"
                      >
                        <Pencil className="h-4 w-4" />
                      </motion.button>
                      {sale.isActive && (
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-500"
                        >
                          <XCircle className="h-4 w-4" />
                        </motion.button>
                      )}
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Empty State */}
        {filteredSales.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16">
            <Tag className="h-12 w-12 text-muted-foreground/30" />
            <p className="mt-4 text-lg font-medium text-muted-foreground">აქცია ვერ მოიძებნა</p>
          </div>
        )}
      </motion.div>
    </div>
  )
}
