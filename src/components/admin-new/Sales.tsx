import { useMemo } from "react"
import { motion } from "framer-motion"
import { TagIcon, TrendingDown, Clock, CheckCircle, Percent, AlertTriangle, Pencil, StopCircle } from "lucide-react"
import { cn } from "@/src/lib/utils"
import type { Product } from "@/src/types/product"

interface SalesProps {
  products: Product[]
  onStopSale: (id: string) => void
  onEdit: (product: Product) => void
}

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

export function Sales({ products, onStopSale, onEdit }: SalesProps) {
  const saleProducts = useMemo(() => {
    return products.filter((p) => p.is_on_sale)
  }, [products])

  const now = new Date()

  const activeSales = saleProducts.filter((p) => {
    if (!p.sale_end_date) return true
    return new Date(p.sale_end_date) > now
  })

  const expiredSales = saleProducts.filter((p) => {
    if (!p.sale_end_date) return false
    return new Date(p.sale_end_date) <= now
  })

  const totalDiscount = saleProducts.reduce((acc, p) => acc + ((p.price - (p.sale_price || p.price)) * 1), 0)

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KpiCard 
          icon={CheckCircle} 
          title="აქტიური აქციები" 
          value={activeSales.length} 
          subValue="ამჟამად მოქმედი" 
          color="from-emerald-500 to-teal-600" 
        />
        <KpiCard 
          icon={AlertTriangle} 
          title="ვადაგასული" 
          value={expiredSales.length} 
          subValue="მოითხოვს ყურადღებას" 
          color="from-rose-500 to-red-600" 
        />
        <KpiCard 
          icon={Percent} 
          title="სულ აქციაზე" 
          value={saleProducts.length} 
          subValue="ჯამური რაოდენობა" 
          color="from-blue-500 to-indigo-600" 
        />
        <KpiCard 
          icon={TrendingDown} 
          title="სულ ფასდაკლება" 
          value={`₾ ${totalDiscount.toLocaleString()}`} 
          subValue="დაზოგილი თანხა" 
          color="from-amber-400 to-orange-500" 
        />
      </div>

      {/* Active Sales */}
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-emerald-500" />
          აქტიური აქციები ({activeSales.length})
        </h3>

        {activeSales.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-border/50 bg-card py-16">
            <TagIcon className="h-12 w-12 text-muted-foreground/30" />
            <p className="mt-4 text-muted-foreground">ამჟამად აქტიური აქცია არ არის</p>
            <p className="text-sm text-muted-foreground mt-1">პროდუქტის რედაქტირებით შეგიძლიათ აქცია დაამატოთ</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeSales.map((product, index) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="group rounded-2xl border border-border/50 bg-card overflow-hidden"
              >
                <div className="relative h-96 overflow-hidden">
                  <img
                    src={product.images?.[0] || "https://via.placeholder.com/400x300"}
                    alt={product.name}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/10" />

                  {/* Discount tag top right */}
                  <div className="absolute top-3 right-3 flex items-center gap-1 rounded-full bg-red-500 px-3 py-1 text-xs font-black text-white shadow-lg shadow-black/30">
                    <Percent className="h-3 w-3" />
                    {product.discount_percentage || 0}%
                  </div>

                  {/* Textual Overlay */}
                  <div className="absolute bottom-0 left-0 right-0 p-5 space-y-2">
                    <div>
                      <h4 className="font-bold text-white truncate text-lg shadow-sm">{product.name}</h4>
                      <p className="text-xs text-white/80 font-medium">{product.category}</p>
                    </div>

                    <div className="flex items-baseline justify-between mt-2">
                      <div>
                        <span className="text-xl font-black text-emerald-400">₾ {(product.sale_price || product.price).toLocaleString()}</span>
                        <span className="ml-2 text-sm text-white/50 line-through">₾ {Number(product.price).toLocaleString()}</span>
                      </div>
                    </div>

                    {product.sale_end_date && (
                      <div className="flex items-center gap-1.5 text-xs text-white/70 font-medium">
                        <Clock className="h-3.5 w-3.5" />
                        {new Date(product.sale_end_date).toLocaleDateString("ka-GE")} — მდე
                      </div>
                    )}
                  </div>

                  {/* Hover Actions Float (Top Left) */}
                  <div className="absolute top-3 left-3 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onEdit(product)
                      }}
                      className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 backdrop-blur-md text-white hover:bg-blue-500/80 transition-colors shadow-lg"
                      title="რედაქტირება"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onStopSale(product.id)
                      }}
                      className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 backdrop-blur-md text-white hover:bg-red-500/80 transition-colors shadow-lg"
                      title="შეწყვეტა"
                    >
                      <StopCircle className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Expired Sales */}
      {expiredSales.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            ვადაგასული აქციები ({expiredSales.length})
          </h3>
          <div className="rounded-2xl border border-border/50 bg-card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/50 bg-muted/50">
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">პროდუქტი</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">ფასდაკლება</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">ვადა გასული</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">მოქმედება</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {expiredSales.map((product) => (
                  <tr key={product.id} className="hover:bg-muted/50 transition-colors">
                    <td className="px-6 py-3">
                      <span className="font-medium text-foreground">{product.name}</span>
                    </td>
                    <td className="px-6 py-3 text-sm text-muted-foreground">{product.discount_percentage}%</td>
                    <td className="px-6 py-3 text-sm text-muted-foreground">
                      {product.sale_end_date ? new Date(product.sale_end_date).toLocaleDateString("ka-GE") : "—"}
                    </td>
                    <td className="px-6 py-3 text-right">
                      <button
                        onClick={() => onStopSale(product.id)}
                        className="text-xs text-red-500 hover:underline"
                      >
                        აქციის მოხსნა
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
