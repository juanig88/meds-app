"use client"

import { useState } from "react"
import type { User } from "@supabase/supabase-js"
import { Button } from "@/components/ui/button"
import { LogOut, Download, ChevronDown } from "lucide-react"
import { ThemeToggle } from "@/components/ThemeToggle"
import { LocaleToggle } from "@/components/LocaleToggle"
import { useI18n } from "@/lib/i18n/I18nProvider"
import { cn } from "@/lib/utils"

function getInitials(user: User): string {
  const name = user.user_metadata?.full_name ?? user.user_metadata?.name
  if (name && typeof name === "string") {
    const parts = name.trim().split(/\s+/)
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    if (parts[0]) return parts[0].slice(0, 2).toUpperCase()
  }
  const email = user.email ?? ""
  const local = email.split("@")[0]
  if (local.length >= 2) return local.slice(0, 2).toUpperCase()
  return email.slice(0, 2).toUpperCase() || "?"
}

export function UserMenu({
  user,
  onExportCsv,
  onSignOut,
}: {
  user: User
  onExportCsv: () => void
  onSignOut: () => void
}) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)

  const displayName =
    (user.user_metadata?.full_name ?? user.user_metadata?.name) as string | undefined
  const avatarUrl = user.user_metadata?.avatar_url as string | undefined

  return (
    <div className="relative flex items-center gap-2">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={cn(
          "flex items-center gap-2 rounded-full pr-2",
          open && "bg-muted"
        )}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="true"
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt=""
            className="h-8 w-8 rounded-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/20 text-sm font-medium text-primary">
            {getInitials(user)}
          </span>
        )}
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
      </Button>

      {open && (
        <>
          {/* Fondo: cierra al hacer clic y deja el menú por encima de todo */}
          <button
            type="button"
            aria-label="Cerrar menú"
            className="fixed inset-0 z-9998 bg-black/20 backdrop-blur-[1px]"
            onClick={() => setOpen(false)}
          />
          <div
            className="fixed right-4 top-4 z-9999 mt-12 w-72 rounded-xl border border-border bg-card py-2 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-border px-4 pb-3">
              <p className="truncate font-medium text-foreground">
                {displayName || user.email}
              </p>
              {displayName && user.email && (
                <p className="truncate text-sm text-muted-foreground">{user.email}</p>
              )}
            </div>
            <div className="flex flex-col gap-0.5 px-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="justify-start gap-2"
                onClick={() => { onExportCsv(); setOpen(false) }}
              >
                <Download className="h-4 w-4" />
                {t("common.exportCsv")}
              </Button>
              <div className="flex items-center justify-between gap-2 px-2 py-1">
                <span className="text-xs text-muted-foreground">{t("common.theme")}</span>
                <ThemeToggle />
              </div>
              <div className="flex items-center justify-between gap-2 px-2 py-1">
                <span className="text-xs text-muted-foreground">{t("common.language")}</span>
                <LocaleToggle />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="justify-start gap-2 text-destructive hover:text-destructive"
                onClick={() => { onSignOut(); setOpen(false) }}
              >
                <LogOut className="h-4 w-4" />
                {t("common.signOut")}
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
