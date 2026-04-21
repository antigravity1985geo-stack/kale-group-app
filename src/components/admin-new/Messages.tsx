import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Mail, MailOpen, Phone, User, Clock, Loader2, Trash2, MessageSquare } from "lucide-react"
import { cn } from "@/src/lib/utils"
import { supabase } from "@/src/lib/supabase"
import { safeFetch } from "@/src/utils/safeFetch"

interface ContactMessage {
  id: string
  name: string
  phone: string
  message: string
  read: boolean
  created_at: string
}

export function Messages() {
  const [messages, setMessages] = useState<ContactMessage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null)

  useEffect(() => {
    fetchMessages()
  }, [])

  const fetchMessages = async () => {
    setIsLoading(true)
    const { data, error } = await supabase
      .from("contact_messages")
      .select("*")
      .order("created_at", { ascending: false })
    if (data) setMessages(data)
    if (error) console.error("Error fetching messages:", error)
    setIsLoading(false)
  }

  const toggleRead = async (msg: ContactMessage) => {
    const newRead = !msg.read
    try {
      await safeFetch(`/api/messages/${msg.id}`, {
        method: "PATCH",
        body: JSON.stringify({ read: newRead }),
      })
      setMessages((prev) => prev.map((m) => m.id === msg.id ? { ...m, read: newRead } : m))
      if (selectedMessage?.id === msg.id) {
        setSelectedMessage({ ...selectedMessage, read: newRead })
      }
    } catch (err) {
      console.error("Error toggling read:", err)
    }
  }

  const deleteMessage = async (id: string) => {
    if (!confirm("ნამდვილად გსურთ წაშლა?")) return
    try {
      await safeFetch(`/api/messages/${id}`, { method: "DELETE" })
      setMessages((prev) => prev.filter((m) => m.id !== id))
      if (selectedMessage?.id === id) setSelectedMessage(null)
    } catch (err) {
      console.error("Error deleting message:", err)
    }
  }

  const unreadCount = messages.filter((m) => !m.read).length

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
        <p className="text-muted-foreground text-sm">შეტყობინებები იტვირთება...</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Messages List */}
      <div className="lg:col-span-1 rounded-2xl border border-border/50 bg-card overflow-hidden">
        <div className="flex items-center justify-between border-b border-border/50 px-5 py-4">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-primary" />
            შეტყობინებები
          </h3>
          {unreadCount > 0 && (
            <span className="rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-bold text-primary-foreground">
              {unreadCount}
            </span>
          )}
        </div>

        <div className="max-h-[600px] overflow-y-auto divide-y divide-border/50">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Mail className="h-10 w-10 text-muted-foreground/30" />
              <p className="mt-3 text-sm text-muted-foreground">შეტყობინება არ არის</p>
            </div>
          ) : (
            messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                onClick={() => { setSelectedMessage(msg); if (!msg.read) toggleRead(msg) }}
                className={cn(
                  "flex items-start gap-3 px-5 py-4 cursor-pointer transition-colors hover:bg-muted/50",
                  !msg.read && "bg-primary/5",
                  selectedMessage?.id === msg.id && "bg-muted"
                )}
              >
                <div className={cn(
                  "mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full",
                  !msg.read ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                )}>
                  {!msg.read ? <Mail className="h-3.5 w-3.5" /> : <MailOpen className="h-3.5 w-3.5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className={cn("text-sm font-medium truncate", !msg.read ? "text-foreground" : "text-muted-foreground")}>
                      {msg.name}
                    </p>
                    <span className="text-[10px] text-muted-foreground flex-shrink-0 ml-2">
                      {new Date(msg.created_at).toLocaleDateString("ka-GE")}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{msg.message}</p>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>

      {/* Message Detail */}
      <div className="lg:col-span-2 rounded-2xl border border-border/50 bg-card overflow-hidden">
        {selectedMessage ? (
          <div className="h-full flex flex-col">
            <div className="flex items-center justify-between border-b border-border/50 px-6 py-4">
              <div>
                <h3 className="font-semibold text-foreground">{selectedMessage.name}</h3>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                  <Clock className="h-3 w-3" />
                  {new Date(selectedMessage.created_at).toLocaleString("ka-GE")}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleRead(selectedMessage)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground hover:bg-blue-500/10 hover:text-blue-500 transition-colors"
                  title={selectedMessage.read ? "წაუკითხავად" : "წაკითხულად"}
                >
                  {selectedMessage.read ? <Mail className="h-4 w-4" /> : <MailOpen className="h-4 w-4" />}
                </button>
                <button
                  onClick={() => deleteMessage(selectedMessage.id)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground hover:bg-red-500/10 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <User className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium text-foreground">{selectedMessage.name}</p>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    {selectedMessage.phone}
                  </p>
                </div>
              </div>

              <div className="rounded-xl bg-muted/50 p-5">
                <p className="text-foreground whitespace-pre-wrap leading-relaxed">{selectedMessage.message}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-24">
            <Mail className="h-12 w-12 text-muted-foreground/20 mb-4" />
            <p className="text-muted-foreground">აირჩიეთ შეტყობინება სანახავად</p>
          </div>
        )}
      </div>
    </div>
  )
}
