import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Users, Mail, Shield, UserPlus, Clock, CheckCircle, XCircle, Loader2, Copy, AlertTriangle } from "lucide-react"
import { cn } from "@/src/lib/utils"
import { supabase } from "@/src/lib/supabase"
import { useAuth } from "@/src/context/AuthContext"

interface Profile {
  id: string
  email: string
  full_name: string | null
  role: string
  avatar_url: string | null
  phone: string | null
  created_at: string
}

interface Invitation {
  id: string
  email: string
  role: string
  status: string
  token: string
  created_at: string
  expires_at: string
}

const roleLabels: Record<string, { label: string; color: string }> = {
  admin: { label: "ადმინი", color: "text-red-500 bg-red-500/10" },
  consultant: { label: "კონსულტანტი", color: "text-blue-500 bg-blue-500/10" },
  accountant: { label: "ბუღალტერი", color: "text-emerald-500 bg-emerald-500/10" },
  guest: { label: "სტუმარი", color: "text-gray-500 bg-gray-500/10" }
}

export function Team() {
  const { isAdmin, user } = useAuth()
  const [members, setMembers] = useState<Profile[]>([])
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isInviting, setIsInviting] = useState(false)

  // Invite form
  const [inviteForm, setInviteForm] = useState({ email: "", role: "consultant" })
  const [showInviteForm, setShowInviteForm] = useState(false)

  useEffect(() => {
    fetchTeamData()
  }, [])

  const fetchTeamData = async () => {
    setIsLoading(true)
    try {
      const [profilesRes, invRes] = await Promise.all([
        supabase.from("profiles").select("*").in("role", ["admin", "consultant", "accountant"]).order("created_at"),
        supabase.from("invitations").select("*").order("created_at", { ascending: false }),
      ])
      if (profilesRes.data) setMembers(profilesRes.data)
      if (invRes.data) setInvitations(invRes.data)
    } catch (err) {
      console.error("Error fetching team:", err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleInvite = async () => {
    if (!inviteForm.email) return
    setIsInviting(true)
    try {
      const { error } = await supabase.from("invitations").insert([{
        email: inviteForm.email,
        role: inviteForm.role,
        invited_by: user?.id,
      }])
      if (error) throw error
      setInviteForm({ email: "", role: "consultant" })
      setShowInviteForm(false)
      await fetchTeamData()
    } catch (err: any) {
      alert("შეცდომა: " + err.message)
    } finally {
      setIsInviting(false)
    }
  }

  const handleDeleteInvitation = async (id: string) => {
    if (!confirm("ნამდვილად გსურთ მოწვევის წაშლა?")) return
    const { error } = await supabase.from("invitations").delete().eq("id", id)
    if (!error) setInvitations((prev) => prev.filter((i) => i.id !== id))
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
        <p className="text-muted-foreground text-sm">გუნდის მონაცემები იტვირთება...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Team Members */}
      <div className="rounded-2xl border border-border/50 bg-card overflow-hidden">
        <div className="flex items-center justify-between border-b border-border/50 px-6 py-4">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            გუნდის წევრები ({members.length})
          </h3>
          {isAdmin && (
            <button
              onClick={() => setShowInviteForm(!showInviteForm)}
              className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <UserPlus className="h-3.5 w-3.5" />
              მოწვევა
            </button>
          )}
        </div>

        {/* Invite Form */}
        {showInviteForm && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-b border-border/50 bg-muted/30 p-5"
          >
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <label className="text-xs font-medium text-foreground mb-1 block">ელ-ფოსტა</label>
                <input
                  type="email"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
                  placeholder="user@example.com"
                />
              </div>
              <div className="w-40">
                <label className="text-xs font-medium text-foreground mb-1 block">როლი</label>
                <select
                  value={inviteForm.role}
                  onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
                >
                  <option value="consultant">კონსულტანტი</option>
                  <option value="accountant">ბუღალტერი</option>
                  <option value="admin">ადმინი</option>
                </select>
              </div>
              <button
                onClick={handleInvite}
                disabled={isInviting}
                className="rounded-lg bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isInviting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                გაგზავნა
              </button>
            </div>
          </motion.div>
        )}

        <div className="divide-y divide-border/50">
          {members.map((member, i) => {
            const rl = roleLabels[member.role] || roleLabels.guest
            return (
              <motion.div
                key={member.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center gap-4 px-6 py-4 hover:bg-muted/50 transition-colors"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-sm">
                  {(member.full_name || member.email).slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground">{member.full_name || "—"}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    {member.email}
                  </p>
                </div>
                <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium", rl.color)}>
                  <Shield className="h-3 w-3" />
                  {rl.label}
                </span>
                <span className="text-xs text-muted-foreground">
                  {new Date(member.created_at).toLocaleDateString("ka-GE")}
                </span>
              </motion.div>
            )
          })}

          {members.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16">
              <Users className="h-10 w-10 text-muted-foreground/30" />
              <p className="mt-3 text-sm text-muted-foreground">წევრი არ მოიძებნა</p>
            </div>
          )}
        </div>
      </div>

      {/* Invitations */}
      {invitations.length > 0 && (
        <div className="rounded-2xl border border-border/50 bg-card overflow-hidden">
          <div className="border-b border-border/50 px-6 py-4">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-blue-500" />
              მოწვევები ({invitations.length})
            </h3>
          </div>
          <div className="divide-y divide-border/50">
            {invitations.map((inv) => {
              const isExpired = new Date(inv.expires_at) < new Date()
              const rl = roleLabels[inv.role] || roleLabels.guest
              return (
                <div key={inv.id} className="flex items-center gap-4 px-6 py-4 hover:bg-muted/50 transition-colors">
                  <div className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full",
                    inv.status === "accepted" ? "bg-emerald-500/10 text-emerald-500" :
                    isExpired ? "bg-red-500/10 text-red-500" :
                    "bg-yellow-500/10 text-yellow-500"
                  )}>
                    {inv.status === "accepted" ? <CheckCircle className="h-4 w-4" /> :
                     isExpired ? <AlertTriangle className="h-4 w-4" /> :
                     <Clock className="h-4 w-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{inv.email}</p>
                    <p className="text-xs text-muted-foreground">
                      {inv.status === "accepted" ? "მიღებულია" :
                       isExpired ? "ვადაგასულია" :
                       "მოლოდინში"}
                    </p>
                  </div>
                  <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", rl.color)}>{rl.label}</span>
                  {isAdmin && inv.status === "pending" && !isExpired && (
                    <button
                      onClick={() => handleDeleteInvitation(inv.id)}
                      className="text-xs text-red-500 hover:underline"
                    >
                      წაშლა
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
