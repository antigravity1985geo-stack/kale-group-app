"use client"

import { motion } from "framer-motion"
import { Eye, Trash2, Clock, AlertCircle, Truck, CheckCircle2, XCircle, FileText, Phone, Mail, MapPin } from "lucide-react"
import { cn } from "@/lib/utils"

const mockOrders = [
  {
    id: "ORD-A1B2C3D4",
    customer: { firstName: "გიორგი", lastName: "მელიქიძე", phone: "+995 555 123 456", email: "giorgi@email.com" },
    date: "2026-04-11 14:30",
    city: "თბილისი",
    address: "რუსთაველის გამზ. 12",
    total: 1250,
    status: "pending",
    items: 3,
  },
  {
    id: "ORD-E5F6G7H8",
    customer: { firstName: "ნინო", lastName: "ბერიძე", phone: "+995 555 234 567", email: "nino@email.com" },
    date: "2026-04-11 12:15",
    city: "ბათუმი",
    address: "ჭავჭავაძის ქ. 45",
    total: 890,
    status: "processing",
    items: 2,
  },
  {
    id: "ORD-I9J0K1L2",
    customer: { firstName: "დავით", lastName: "ჩხეიძე", phone: "+995 555 345 678", email: "davit@email.com" },
    date: "2026-04-10 18:45",
    city: "ქუთაისი",
    address: "წერეთლის ქ. 78",
    total: 2100,
    status: "shipped",
    items: 4,
  },
  {
    id: "ORD-M3N4O5P6",
    customer: { firstName: "მარიამ", lastName: "გიორგაძე", phone: "+995 555 456 789", email: "mariam@email.com" },
    date: "2026-04-10 09:20",
    city: "თბილისი",
    address: "პეკინის ქ. 23",
    total: 560,
    status: "delivered",
    items: 1,
  },
  {
    id: "ORD-Q7R8S9T0",
    customer: { firstName: "ალექსი", lastName: "წერეთელი", phone: "+995 555 567 890", email: "alex@email.com" },
    date: "2026-04-09 16:30",
    city: "რუსთავი",
    address: "თავისუფლების მოედ. 5",
    total: 1800,
    status: "cancelled",
    items: 3,
  },
  {
    id: "ORD-U1V2W3X4",
    customer: { firstName: "თამარ", lastName: "კაპანაძე", phone: "+995 555 678 901", email: "tamar@email.com" },
    date: "2026-04-09 11:00",
    city: "თბილისი",
    address: "აღმაშენებლის ქ. 156",
    total: 3400,
    status: "delivered",
    items: 5,
  },
]

const statusConfig: Record<string, { label: string; color: string; bgColor: string; icon: React.ReactNode }> = {
  pending: { 
    label: "ახალი", 
    color: "text-amber-600 dark:text-amber-400", 
    bgColor: "bg-amber-100 dark:bg-amber-500/20",
    icon: <Clock className="h-3.5 w-3.5" />
  },
  processing: { 
    label: "მუშავდება", 
    color: "text-blue-600 dark:text-blue-400", 
    bgColor: "bg-blue-100 dark:bg-blue-500/20",
    icon: <AlertCircle className="h-3.5 w-3.5" />
  },
  shipped: { 
    label: "გაგზავნილი", 
    color: "text-indigo-600 dark:text-indigo-400", 
    bgColor: "bg-indigo-100 dark:bg-indigo-500/20",
    icon: <Truck className="h-3.5 w-3.5" />
  },
  delivered: { 
    label: "დასრულებული", 
    color: "text-emerald-600 dark:text-emerald-400", 
    bgColor: "bg-emerald-100 dark:bg-emerald-500/20",
    icon: <CheckCircle2 className="h-3.5 w-3.5" />
  },
  cancelled: { 
    label: "გაუქმებული", 
    color: "text-red-600 dark:text-red-400", 
    bgColor: "bg-red-100 dark:bg-red-500/20",
    icon: <XCircle className="h-3.5 w-3.5" />
  },
}

interface OrdersProps {
  searchQuery: string
}

export function Orders({ searchQuery }: OrdersProps) {
  const filteredOrders = mockOrders.filter(
    (o) =>
      o.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.customer.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.customer.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.customer.phone.includes(searchQuery)
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
                შეკვეთა #
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                კლიენტი
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                თარიღი
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                მდებარეობა
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                ჯამი
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                სტატუსი
              </th>
              <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                მოქმედება
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {filteredOrders.map((order, index) => {
              const config = statusConfig[order.status]
              return (
                <motion.tr
                  key={order.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="group transition-colors hover:bg-muted/50"
                >
                  {/* Order ID */}
                  <td className="px-6 py-4">
                    <span className="font-mono text-sm font-semibold text-foreground">
                      {order.id.slice(0, 12)}
                    </span>
                  </td>

                  {/* Customer */}
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <p className="font-medium text-foreground">
                        {order.customer.firstName} {order.customer.lastName}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {order.customer.phone}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* Date */}
                  <td className="px-6 py-4">
                    <span className="text-sm text-muted-foreground">{order.date}</span>
                  </td>

                  {/* Location */}
                  <td className="px-6 py-4">
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium text-foreground">{order.city}</p>
                      <p className="text-xs text-muted-foreground">{order.address}</p>
                    </div>
                  </td>

                  {/* Total */}
                  <td className="px-6 py-4">
                    <div className="space-y-0.5">
                      <span className="text-lg font-bold text-foreground">₾ {order.total.toLocaleString()}</span>
                      <p className="text-xs text-muted-foreground">{order.items} პროდუქტი</p>
                    </div>
                  </td>

                  {/* Status */}
                  <td className="px-6 py-4">
                    <span className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium",
                      config.bgColor,
                      config.color
                    )}>
                      {config.icon}
                      {config.label}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                        title="ნახვა"
                      >
                        <Eye className="h-4 w-4" />
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground transition-colors hover:bg-emerald-500/10 hover:text-emerald-500"
                        title="PDF ქვითარი"
                      >
                        <FileText className="h-4 w-4" />
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-500"
                        title="წაშლა"
                      >
                        <Trash2 className="h-4 w-4" />
                      </motion.button>
                    </div>
                  </td>
                </motion.tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Empty State */}
      {filteredOrders.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16">
          <FileText className="h-12 w-12 text-muted-foreground/30" />
          <p className="mt-4 text-lg font-medium text-muted-foreground">შეკვეთა ვერ მოიძებნა</p>
          <p className="mt-1 text-sm text-muted-foreground/70">სცადეთ სხვა საძიებო სიტყვა</p>
        </div>
      )}
    </motion.div>
  )
}
