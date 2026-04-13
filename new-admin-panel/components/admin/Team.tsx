"use client"

import { motion } from "framer-motion"
import { Mail, Clock, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"

const mockTeam = [
  { id: "1", name: "გიორგი მელიქიძე", email: "giorgi@kalegroup.ge", role: "admin", createdAt: "2025-01-15" },
  { id: "2", name: "ნინო ბერიძე", email: "nino@kalegroup.ge", role: "consultant", createdAt: "2025-02-20" },
  { id: "3", name: "დავით ჩხეიძე", email: "davit@kalegroup.ge", role: "consultant", createdAt: "2025-03-10" },
  { id: "4", name: "მარიამ გიორგაძე", email: "mariam@kalegroup.ge", role: "accountant", createdAt: "2025-04-01" },
  { id: "5", name: "ალექსი წერეთელი", email: "alex@kalegroup.ge", role: "consultant", createdAt: "2025-04-05" },
]

const mockInvitations = [
  { id: "1", email: "newuser@email.com", role: "consultant", status: "pending", createdAt: "2026-04-10", expiresAt: "2026-04-17" },
  { id: "2", email: "accountant@email.com", role: "accountant", status: "pending", createdAt: "2026-04-09", expiresAt: "2026-04-16" },
]

const roleConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  admin: { label: "ადმინისტრატორი", color: "text-indigo-600 dark:text-indigo-400", bgColor: "bg-indigo-100 dark:bg-indigo-500/20" },
  consultant: { label: "კონსულტანტი", color: "text-blue-600 dark:text-blue-400", bgColor: "bg-blue-100 dark:bg-blue-500/20" },
  accountant: { label: "ბუღალტერი", color: "text-emerald-600 dark:text-emerald-400", bgColor: "bg-emerald-100 dark:bg-emerald-500/20" },
}

const statusConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  pending: { label: "მოლოდინში", color: "text-amber-600 dark:text-amber-400", bgColor: "bg-amber-100 dark:bg-amber-500/20" },
  accepted: { label: "მიღებული", color: "text-emerald-600 dark:text-emerald-400", bgColor: "bg-emerald-100 dark:bg-emerald-500/20" },
  expired: { label: "ვადაგასული", color: "text-red-600 dark:text-red-400", bgColor: "bg-red-100 dark:bg-red-500/20" },
}

export function Team() {
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
  }

  return (
    <div className="space-y-6">
      {/* Team Members */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="rounded-2xl border border-border/50 bg-card overflow-hidden"
      >
        <div className="border-b border-border/50 p-6">
          <h3 className="text-lg font-semibold text-foreground">გუნდის წევრები</h3>
          <p className="mt-1 text-sm text-muted-foreground">{mockTeam.length} აქტიური წევრი</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/50 bg-muted/50">
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  წევრი
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  ელ. ფოსტა
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  როლი
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  დარეგისტრირდა
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {mockTeam.map((member, index) => {
                const role = roleConfig[member.role]
                return (
                  <motion.tr
                    key={member.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="group transition-colors hover:bg-muted/50"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                          {getInitials(member.name)}
                        </div>
                        <span className="font-medium text-foreground">{member.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Mail className="h-4 w-4" />
                        {member.email}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium",
                        role.bgColor,
                        role.color
                      )}>
                        {role.label}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-muted-foreground">{member.createdAt}</span>
                    </td>
                  </motion.tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Pending Invitations */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.4 }}
        className="rounded-2xl border border-border/50 bg-card overflow-hidden"
      >
        <div className="border-b border-border/50 p-6">
          <h3 className="text-lg font-semibold text-foreground">გაგზავნილი მოწვევები</h3>
          <p className="mt-1 text-sm text-muted-foreground">{mockInvitations.length} მოლოდინში</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/50 bg-muted/50">
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  ელ. ფოსტა
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  როლი
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  სტატუსი
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  გაგზავნის თარიღი
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  ვადა
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  მოქმედება
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {mockInvitations.map((invitation, index) => {
                const role = roleConfig[invitation.role]
                const status = statusConfig[invitation.status]
                return (
                  <motion.tr
                    key={invitation.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + index * 0.05 }}
                    className="group transition-colors hover:bg-muted/50"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium text-foreground">{invitation.email}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium",
                        role.bgColor,
                        role.color
                      )}>
                        {role.label}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium",
                        status.bgColor,
                        status.color
                      )}>
                        {status.label}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-muted-foreground">{invitation.createdAt}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" />
                        {invitation.expiresAt}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end">
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
                )
              })}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  )
}
