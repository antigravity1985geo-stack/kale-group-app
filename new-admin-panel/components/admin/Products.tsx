"use client"

import { motion } from "framer-motion"
import { Pencil, Trash2, Eye, Tag } from "lucide-react"
import { cn } from "@/lib/utils"

const mockProducts = [
  {
    id: "1",
    name: "პრემიუმ ტყავის დივანი",
    category: "დივნები",
    price: 2850,
    salePrice: 2450,
    isOnSale: true,
    discountPercent: 14,
    material: "ნატურალური ტყავი",
    warranty: "2 წელი",
    inStock: true,
    image: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=200&h=200&fit=crop",
  },
  {
    id: "2",
    name: "მოდერნ სექციური დივანი",
    category: "დივნები",
    price: 3200,
    salePrice: null,
    isOnSale: false,
    discountPercent: 0,
    material: "ხავერდი",
    warranty: "3 წელი",
    inStock: true,
    image: "https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?w=200&h=200&fit=crop",
  },
  {
    id: "3",
    name: "მინიმალისტური ყავის მაგიდა",
    category: "მაგიდები",
    price: 450,
    salePrice: 380,
    isOnSale: true,
    discountPercent: 16,
    material: "მუხა + მეტალი",
    warranty: "1 წელი",
    inStock: true,
    image: "https://images.unsplash.com/photo-1533090481720-856c6e3c1fdc?w=200&h=200&fit=crop",
  },
  {
    id: "4",
    name: "ერგონომიული სავარძელი",
    category: "სავარძლები",
    price: 1200,
    salePrice: null,
    isOnSale: false,
    discountPercent: 0,
    material: "ქსოვილი + ალუმინი",
    warranty: "5 წელი",
    inStock: false,
    image: "https://images.unsplash.com/photo-1580480055273-228ff5388ef8?w=200&h=200&fit=crop",
  },
  {
    id: "5",
    name: "საძინებლის კომოდი",
    category: "კომოდები",
    price: 680,
    salePrice: null,
    isOnSale: false,
    discountPercent: 0,
    material: "MDF + შპონი",
    warranty: "2 წელი",
    inStock: true,
    image: "https://images.unsplash.com/photo-1558997519-83ea9252edf8?w=200&h=200&fit=crop",
  },
]

interface ProductsProps {
  searchQuery: string
}

export function Products({ searchQuery }: ProductsProps) {
  const filteredProducts = mockProducts.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="rounded-2xl border border-border/50 bg-card overflow-hidden"
    >
      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border/50 bg-muted/50">
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                პროდუქტი
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                დეტალები
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                ფასი
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                მარაგი
              </th>
              <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                მოქმედება
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {filteredProducts.map((product, index) => (
              <motion.tr
                key={product.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="group transition-colors hover:bg-muted/50"
              >
                {/* Product Info */}
                <td className="px-6 py-4">
                  <div className="flex items-center gap-4">
                    <div className="relative h-16 w-16 overflow-hidden rounded-xl bg-muted">
                      <img
                        src={product.image}
                        alt={product.name}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                      />
                      {product.isOnSale && (
                        <div className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                          %
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{product.name}</p>
                      <p className="mt-0.5 text-sm text-muted-foreground">{product.category}</p>
                    </div>
                  </div>
                </td>

                {/* Details */}
                <td className="px-6 py-4">
                  <div className="space-y-1">
                    <p className="text-sm text-foreground">{product.material}</p>
                    <p className="text-xs text-muted-foreground">გარანტია: {product.warranty}</p>
                  </div>
                </td>

                {/* Price */}
                <td className="px-6 py-4">
                  <div className="space-y-1">
                    {product.isOnSale ? (
                      <>
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-bold text-foreground">₾ {product.salePrice}</span>
                          <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-500">
                            -{product.discountPercent}%
                          </span>
                        </div>
                        <span className="text-sm text-muted-foreground line-through">₾ {product.price}</span>
                      </>
                    ) : (
                      <span className="text-lg font-bold text-foreground">₾ {product.price}</span>
                    )}
                  </div>
                </td>

                {/* Stock */}
                <td className="px-6 py-4">
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
                      product.inStock
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : "bg-red-500/10 text-red-600 dark:text-red-400"
                    )}
                  >
                    {product.inStock ? "მარაგშია" : "არ არის"}
                  </span>
                </td>

                {/* Actions */}
                <td className="px-6 py-4">
                  <div className="flex items-center justify-end gap-2">
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                    >
                      <Eye className="h-4 w-4" />
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground transition-colors hover:bg-blue-500/10 hover:text-blue-500"
                    >
                      <Pencil className="h-4 w-4" />
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </motion.button>
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Empty State */}
      {filteredProducts.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16">
          <Tag className="h-12 w-12 text-muted-foreground/30" />
          <p className="mt-4 text-lg font-medium text-muted-foreground">პროდუქტი ვერ მოიძებნა</p>
          <p className="mt-1 text-sm text-muted-foreground/70">სცადეთ სხვა საძიებო სიტყვა</p>
        </div>
      )}
    </motion.div>
  )
}
