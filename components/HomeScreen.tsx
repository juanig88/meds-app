"use client"

import { PawPrint } from "lucide-react"
import type { Patient, Medication } from "@/meds-tracker/types"
import { MedsBottomNav, type MedsNavScreen } from "./MedsBottomNav"
import { useI18n } from "@/lib/i18n/I18nProvider"
import { cn } from "@/lib/utils"

interface HomeScreenProps {
  patients: Patient[]
  medications: Medication[]
  onSelectPatient: (patient: Patient) => void
  activeNav: MedsNavScreen
  onNavigate: (screen: MedsNavScreen) => void
}

function medCountForPatient(medications: Medication[], patientId: string): number {
  return medications.filter((m) => m.patientId === patientId).length
}

export function HomeScreen({
  patients,
  medications,
  onSelectPatient,
  activeNav,
  onNavigate,
}: HomeScreenProps) {
  const { t } = useI18n()
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg">
        <div className="px-5 pb-3 pt-safe-top">
          <h1 className="pt-4 text-lg font-semibold text-foreground">
            {t("nav.home")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t("home.tapPatient")}
          </p>
        </div>
      </header>

      <main className="flex-1 px-5 pb-28">
        {patients.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-8 text-center text-muted-foreground">
            <PawPrint className="mx-auto mb-3 h-12 w-12 opacity-50" />
            <p className="mb-2">{t("home.noPatients")}</p>
            <p className="text-sm">
              {t("home.goToPatientsHint")}
            </p>
            <button
              type="button"
              onClick={() => onNavigate("patients")}
              className="mt-4 text-sm font-medium text-primary hover:underline"
            >
              {t("home.goToPatients")}
            </button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {patients.map((p) => {
              const medCount = medCountForPatient(medications, p.id)
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onSelectPatient(p)}
                  className={cn(
                    "flex flex-col items-start rounded-2xl border border-border bg-card p-4 text-left transition-colors",
                    "hover:bg-muted/30 active:bg-muted/50"
                  )}
                >
                  <div className="mb-2 flex size-12 items-center justify-center rounded-xl bg-primary/10">
                    <PawPrint className="h-6 w-6 text-primary" />
                  </div>
                  <p className="font-semibold text-foreground">{p.name}</p>
                  {p.description && (
                    <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
                      {p.description}
                    </p>
                  )}
                  <p className="mt-2 text-xs text-muted-foreground">
                    {medCount === 0
                      ? t("home.noMeds")
                      : medCount === 1
                        ? t("home.oneMed")
                        : t("home.medsCount", { count: medCount })}
                  </p>
                </button>
              )
            })}
          </div>
        )}
      </main>
      <MedsBottomNav activeScreen={activeNav} onNavigate={onNavigate} />
    </div>
  )
}
