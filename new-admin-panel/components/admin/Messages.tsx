"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Phone, Check, MessageSquare } from "lucide-react"
import { cn } from "@/lib/utils"

const mockMessages = [
  { id: "1", name: "გიორგი მელიქიძე", phone: "+995 555 123 456", message: "გამარჯობა, მაინტერესებს ტყავის დივნის ფასი და მიწოდების ვადა თბილისში.", read: false, createdAt: "2026-04-11 14:30" },
  { id: "2", name: "ნინო ბერიძე", phone: "+995 555 234 567", message: "შესაძლებელია სავარძლის შეძენა განვადებით?", read: false, createdAt: "2026-04-11 12:15" },
  { id: "3", name: "დავით ჩხეიძე", phone: "+995 555 345 678", message: "გთხოვთ დამიკავშირდეთ ხვალ დილით, მაინტერესებს სამზარეულოს ავეჯი.", read: true, createdAt: "2026-04-10 18:45" },
  { id: "4", name: "მარიამ გიორგაძე", phone: "+995 555 456 789", message: "მადლობა სწრაფი მომსახურებისთვის! ძალიან კმაყოფილი ვარ შეძენით.", read: true, createdAt: "2026-04-10 09:20" },
  { id: "5", name: "ალექსი წერეთელი", phone: "+995 555 567 890", message: "რა ფერებშია ხელმისაწვდომი მოდერნ დივანი? გთხოვთ გამომიგზავნოთ ფოტოები.", read: false, createdAt: "2026-04-09 16:30" },
]

export function Messages() {
  const [filter, setFilter] = useState<"all" | "unread" | "read">("all")
  const [messages, setMessages] = useState(mockMessages)

  const filteredMessages = messages.filter((m) => {
    if (filter === "unread") return !m.read
    if (filter === "read") return m.read
    return true
  })

  const toggleRead = (id: string) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === id ? { ...m, read: !m.read } : m))
    )
  }

  const unreadCount = messages.filter((m) => !m.read).length

  return (
    <div className="space-y-6">
      {/* Filter Tabs */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="flex gap-2"
      >
        {[
          { id: "all", label: "ყველა", count: messages.length },
          { id: "unread", label: "წაუკითხავი", count: unreadCount },
          { id: "read", label: "წაკითხული", count: messages.length - unreadCount },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id as typeof filter)}
            className={cn(
              "flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all",
              filter === tab.id
                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                : "bg-card text-muted-foreground hover:bg-muted hover:text-foreground border border-border/50"
            )}
          >
            {tab.label}
            <span className={cn(
              "flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-xs",
              filter === tab.id
                ? "bg-white/20"
                : "bg-muted-foreground/10"
            )}>
              {tab.count}
            </span>
          </button>
        ))}
      </motion.div>

      {/* Messages List */}
      <div className="space-y-4">
        {filteredMessages.map((message, index) => (
          <motion.div
            key={message.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className={cn(
              "rounded-2xl border border-border/50 bg-card p-6 transition-all",
              !message.read && "border-primary/30 bg-primary/5"
            )}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                {/* Header */}
                <div className="flex items-center gap-3">
                  <h4 className="font-semibold text-foreground">{message.name}</h4>
                  {!message.read && (
                    <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
                      ახალი
                    </span>
                  )}
                </div>

                {/* Contact Info */}
                <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5" />
                    {message.phone}
                  </span>
                  <span>{message.createdAt}</span>
                </div>

                {/* Message */}
                <p className="mt-4 text-foreground">{message.message}</p>
              </div>

              {/* Mark as Read/Unread */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => toggleRead(message.id)}
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-xl transition-colors",
                  message.read
                    ? "bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary"
                    : "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20"
                )}
                title={message.read ? "მონიშვნა წაუკითხავად" : "მონიშვნა წაკითხულად"}
              >
                <Check className="h-5 w-5" />
              </motion.button>
            </div>
          </motion.div>
        ))}

        {/* Empty State */}
        {filteredMessages.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center rounded-2xl border border-border/50 bg-card py-16"
          >
            <MessageSquare className="h-12 w-12 text-muted-foreground/30" />
            <p className="mt-4 text-lg font-medium text-muted-foreground">შეტყობინება არ მოიძებნა</p>
          </motion.div>
        )}
      </div>
    </div>
  )
}
