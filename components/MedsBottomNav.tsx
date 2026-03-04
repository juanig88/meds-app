"use client"

import { CalendarDays, Users, Home } from "lucide-react"
import { useI18n } from "@/lib/i18n/I18nProvider"

export type MedsNavScreen = "home" | "patients" | "calendar"

interface MedsBottomNavProps {
  onNavigate?: (screen: MedsNavScreen) => void
  activeScreen?: MedsNavScreen
}

export function MedsBottomNav({ onNavigate, activeScreen = "home" }: MedsBottomNavProps) {
  const { t } = useI18n()
  const isHome = activeScreen === "home"
  const isPatients = activeScreen === "patients"
  const isCalendar = activeScreen === "calendar"

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-card/80 backdrop-blur-lg">
      <div className="mx-auto flex max-w-md items-center justify-center gap-1 pb-safe-bottom">
        <button
          type="button"
          onClick={() => onNavigate?.("home")}
          className={`flex flex-1 items-center justify-center gap-2 py-3 transition-colors ${
            isHome ? "text-primary" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Home className={`h-5 w-5 ${isHome ? "stroke-[2.5]" : ""}`} />
          <span className={`text-sm ${isHome ? "font-medium" : ""}`}>{t("nav.home")}</span>
        </button>
        <button
          type="button"
          onClick={() => onNavigate?.("patients")}
          className={`flex flex-1 items-center justify-center gap-2 py-3 transition-colors ${
            isPatients ? "text-primary" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Users className={`h-5 w-5 ${isPatients ? "stroke-[2.5]" : ""}`} />
          <span className={`text-sm ${isPatients ? "font-medium" : ""}`}>{t("nav.patients")}</span>
        </button>
        <button
          type="button"
          onClick={() => onNavigate?.("calendar")}
          className={`flex flex-1 items-center justify-center gap-2 py-3 transition-colors ${
            isCalendar ? "text-primary" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <CalendarDays className={`h-5 w-5 ${isCalendar ? "stroke-[2.5]" : ""}`} />
          <span className={`text-sm ${isCalendar ? "font-medium" : ""}`}>{t("nav.calendar")}</span>
        </button>
      </div>
    </nav>
  )
}
