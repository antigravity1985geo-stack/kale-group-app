"use client"

import { motion } from "framer-motion"
import { Pencil, Trash2, Package } from "lucide-react"

const mockCategories = [
  {
    id: "1",
    name: "დივნები",
    image: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&h=300&fit=crop",
    productCount: 24,
  },
  {
    id: "2",
    name: "სავარძლები",
    image: "https://images.unsplash.com/photo-1580480055273-228ff5388ef8?w=400&h=300&fit=crop",
    productCount: 18,
  },
  {
    id: "3",
    name: "მაგიდები",
    image: "https://images.unsplash.com/photo-1533090481720-856c6e3c1fdc?w=400&h=300&fit=crop",
    productCount: 32,
  },
  {
    id: "4",
    name: "კომოდები",
    image: "https://images.unsplash.com/photo-1558997519-83ea9252edf8?w=400&h=300&fit=crop",
    productCount: 15,
  },
  {
    id: "5",
    name: "საწოლები",
    image: "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=400&h=300&fit=crop",
    productCount: 21,
  },
  {
    id: "6",
    name: "კარადები",
    image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop",
    productCount: 12,
  },
  {
    id: "7",
    name: "სამზარეულო",
    image: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=300&fit=crop",
    productCount: 28,
  },
  {
    id: "8",
    name: "აქსესუარები",
    image: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=300&fit=crop",
    productCount: 45,
  },
]

export function Categories() {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {mockCategories.map((category, index) => (
        <motion.div
          key={category.id}
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: index * 0.05, duration: 0.4 }}
          whileHover={{ y: -4 }}
          className="group relative overflow-hidden rounded-2xl border border-border/50 bg-card"
        >
          {/* Image */}
          <div className="relative aspect-video overflow-hidden">
            <img
              src={category.image}
              alt={category.name}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
            
            {/* Overlay on hover */}
            <div className="absolute inset-0 flex items-center justify-center gap-3 bg-black/60 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-sm transition-colors hover:bg-white/30"
              >
                <Pencil className="h-4 w-4" />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/80 text-white backdrop-blur-sm transition-colors hover:bg-red-500"
              >
                <Trash2 className="h-4 w-4" />
              </motion.button>
            </div>

            {/* Product count badge */}
            <div className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm">
              <Package className="h-3.5 w-3.5" />
              {category.productCount}
            </div>
          </div>

          {/* Info */}
          <div className="p-4">
            <h3 className="text-lg font-semibold text-foreground">{category.name}</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {category.productCount} პროდუქტი
            </p>
          </div>
        </motion.div>
      ))}
    </div>
  )
}
