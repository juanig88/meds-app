"use client"

import { useState, useMemo, useEffect } from "react"
import { Button } from "@/components/ui/button"

const LOG_PREFIX = "[meds-calendar]"
import { ChevronLeft, ChevronRight, Plus } from "lucide-react"
import { MedicationGrid } from "./MedicationGrid"
import { CountersCard } from "./CountersCard"
import { MedsBottomNav, type MedsNavScreen } from "./MedsBottomNav"
import type { Patient, Medication, DoseStatus } from "@/meds-tracker/types"
import { getMonthName, toDateKey } from "@/meds-tracker/lib/date"
import { getPendingSlotsForDate } from "@/meds-tracker/lib/counters"
import { useI18n } from "@/lib/i18n/I18nProvider"
import { cn } from "@/lib/utils"

interface CalendarScreenProps {
  patients: Patient[]
  medications: Medication[]
  doses: import("@/meds-tracker/types").DoseEntry[]
  selectedPatientId: string | null
  onSelectPatient: (patientId: string | null) => void
  onAddMedication: (
    patientId: string,
    name: string,
    timesPerDay: number,
    startDate: string,
    colorHint?: Medication["colorHint"]
  ) => void | Promise<string | void>
  onSetDose: (
    patientId: string,
    medicationId: string,
    slotIndex: number,
    dateKey: string,
    status: DoseStatus
  ) => void
  onRemoveDose: (
    patientId: string,
    medicationId: string,
    slotIndex: number,
    dateKey: string
  ) => void | Promise<void>
  onSetMedicationEndDate: (medicationId: string, endDate: string | null) => void
  onDeleteMedication?: (medicationId: string) => Promise<void>
  onEnsureDosesForMonth?: (patientIds: string[], year: number, month: number) => void | Promise<void>
  activeNav: MedsNavScreen
  onNavigate: (screen: MedsNavScreen) => void
  maxMedications: number
}

export function CalendarScreen({
  patients,
  medications,
  doses,
  selectedPatientId,
  onSelectPatient,
  onAddMedication,
  onSetDose,
  onRemoveDose,
  onSetMedicationEndDate,
  onDeleteMedication,
  onEnsureDosesForMonth,
  activeNav,
  onNavigate,
  maxMedications,
}: CalendarScreenProps) {
  const { t } = useI18n()
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [showAddMed, setShowAddMed] = useState(false)
  const [medError, setMedError] = useState<string | null>(null)
  const minDate = useMemo(() => {
    const d = new Date(now.getFullYear(), now.getMonth() - 11, 1)
    return { year: d.getFullYear(), month: d.getMonth() + 1 }
  }, [now])
  const atMedLimit = medications.length >= maxMedications
  const canGoPrev = year > minDate.year || (year === minDate.year && month > minDate.month)
  const canGoNext = year < now.getFullYear() || (year === now.getFullYear() && month < now.getMonth() + 1)
  const [newMedName, setNewMedName] = useState("")
  const [newMedTimes, setNewMedTimes] = useState(1)
  const [newMedStart, setNewMedStart] = useState(
    now.toISOString().slice(0, 10)
  )
  const [newMedColor, setNewMedColor] = useState<Medication["colorHint"]>("neutral")

  const selectedPatient = useMemo(
    () => patients.find((p) => p.id === selectedPatientId) ?? null,
    [patients, selectedPatientId]
  )
  const patientMeds = useMemo(
    () => medications.filter((m) => m.patientId === selectedPatientId),
    [medications, selectedPatientId]
  )
  const patientDoses = useMemo(
    () => doses.filter((d) => d.patientId === selectedPatientId),
    [doses, selectedPatientId]
  )
  const monthPrefix = `${year}-${String(month).padStart(2, "0")}`
  const dosesThisMonth = useMemo(
    () => patientDoses.filter((d) => d.date.startsWith(monthPrefix)),
    [patientDoses, monthPrefix]
  )
  const todayKey = toDateKey(now)
  const pendingToday = useMemo(
    () => getPendingSlotsForDate(patientMeds, patientDoses, todayKey),
    [patientMeds, patientDoses, todayKey]
  )
  const isViewingCurrentMonth =
    now.getFullYear() === year && now.getMonth() + 1 === month

  useEffect(() => {
    if (selectedPatientId && selectedPatient) {
      console.log(
        LOG_PREFIX,
        "paciente seleccionado:",
        selectedPatient.name,
        "| medicamentos:",
        patientMeds.length,
        "| dosis (total paciente):",
        patientDoses.length
      )
    } else {
      console.log(LOG_PREFIX, "sin paciente seleccionado")
    }
  }, [selectedPatientId, selectedPatient?.name, patientMeds.length, patientDoses.length])

  // Cargar dosis del mes visible solo cuando hace falta (calendario más rápido)
  useEffect(() => {
    if (selectedPatientId && onEnsureDosesForMonth) {
      onEnsureDosesForMonth([selectedPatientId], year, month)
    }
  }, [selectedPatientId, year, month, onEnsureDosesForMonth])

  const prevMonth = () => {
    if (!canGoPrev) return
    if (month === 1) {
      setMonth(12)
      setYear((y) => y - 1)
    } else setMonth((m) => m - 1)
  }
  const nextMonth = () => {
    if (!canGoNext) return
    if (month === 12) {
      setMonth(1)
      setYear((y) => y + 1)
    } else setMonth((m) => m + 1)
  }

  const [doseClickPending, setDoseClickPending] = useState(false)
  const handleDoseClick = async (
    medicationId: string,
    slotIndex: number,
    dateKey: string,
    current: DoseStatus | null
  ) => {
    if (!selectedPatientId || doseClickPending) return
    // Vacío → dada → omitida. Clic en omitida = quitar dosis (borrar en DB). Esperar para que el estado se actualice antes del siguiente clic.
    if (current === null) {
      onSetDose(selectedPatientId, medicationId, slotIndex, dateKey, "given")
    } else if (current === "given") {
      onSetDose(selectedPatientId, medicationId, slotIndex, dateKey, "omitted")
    } else {
      setDoseClickPending(true)
      try {
        await onRemoveDose(selectedPatientId, medicationId, slotIndex, dateKey)
      } finally {
        setDoseClickPending(false)
      }
    }
  }

  const handleAddMed = async () => {
    const name = newMedName.trim()
    if (!name || !selectedPatientId) return
    setMedError(null)
    try {
      await onAddMedication(selectedPatientId, name, newMedTimes, newMedStart, newMedColor)
      setNewMedName("")
      setNewMedTimes(1)
      setNewMedStart(now.toISOString().slice(0, 10))
      setShowAddMed(false)
    } catch (e) {
      setMedError(
        e instanceof Error && e.message === "MAX_MEDICATIONS"
          ? t("calendar.medLimit", { max: maxMedications })
          : t("calendar.errorAddMed")
      )
    }
  }

  const handleDeleteMedication = async (med: Medication) => {
    if (typeof window === "undefined" || !onDeleteMedication) return
    if (!window.confirm(t("calendar.deleteMedConfirm", { name: med.name }))) return
    setMedError(null)
    try {
      await onDeleteMedication(med.id)
    } catch {
      setMedError(t("calendar.errorDeleteMed"))
    }
  }

  const endTreatment = (med: Medication) => {
    const today = now.toISOString().slice(0, 10)
    onSetMedicationEndDate(med.id, today)
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg">
        <div className="px-5 pb-2 pt-safe-top">
          <p className="pt-4 text-sm text-muted-foreground">{t("calendar.title")}</p>
        </div>

        {/* Patient selector */}
        <div className="px-5 pb-2">
          <select
            value={selectedPatientId ?? ""}
            onChange={(e) => onSelectPatient(e.target.value || null)}
            className="w-full rounded-xl border border-border bg-card px-4 py-2.5 text-base font-medium text-foreground"
          >
            <option value="">{t("calendar.selectPatientPlaceholder")}</option>
            {patients.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
                {p.description ? ` — ${p.description}` : ""}
              </option>
            ))}
          </select>
        </div>

        {selectedPatient && (
          <>
            <div className="flex items-center justify-between px-5 pb-2">
              <h2 className="text-lg font-semibold text-foreground">
                {selectedPatient.name}
              </h2>
              <Button
                variant="default"
                size="sm"
                className="gap-1.5"
                onClick={() => { setShowAddMed(!showAddMed); setMedError(null) }}
                disabled={atMedLimit}
                title={atMedLimit ? `Máximo ${maxMedications} medicamentos` : undefined}
              >
                <Plus className="h-4 w-4" />
                {t("calendar.addMedication")}
              </Button>
            </div>
            {medError && (
              <p className="mx-5 mb-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {medError}
              </p>
            )}
            {atMedLimit && (
              <p className="mx-5 mb-2 text-sm text-muted-foreground">
                {t("calendar.medLimit", { max: maxMedications })}
              </p>
            )}
            {showAddMed && (
              <div className="mx-5 mb-3 rounded-2xl border border-border bg-card p-4">
                <input
                  placeholder={t("calendar.medNamePlaceholder")}
                  value={newMedName}
                  onChange={(e) => setNewMedName(e.target.value)}
                  className="mb-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
                <div className="mb-2 flex items-center gap-2">
                  <label className="text-sm text-muted-foreground">{t("calendar.timesPerDay")}</label>
                  <select
                    value={newMedTimes}
                    onChange={(e) => setNewMedTimes(Number(e.target.value))}
                    className="rounded-md border border-input bg-background px-2 py-1 text-sm"
                  >
                    {[1, 2, 3].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="mb-2 flex items-center gap-2">
                  <label className="text-sm text-muted-foreground">{t("calendar.start")}</label>
                  <input
                    type="date"
                    value={newMedStart}
                    onChange={(e) => setNewMedStart(e.target.value)}
                    className="rounded-md border border-input bg-background px-2 py-1 text-sm"
                  />
                </div>
                <div className="mb-3 flex items-center gap-2">
                  <label className="text-sm text-muted-foreground">{t("calendar.rowColor")}</label>
                  <select
                    value={newMedColor ?? "neutral"}
                    onChange={(e) =>
                      setNewMedColor(e.target.value as Medication["colorHint"])
                    }
                    className="rounded-md border border-input bg-background px-2 py-1 text-sm"
                  >
                    <option value="neutral">Neutro</option>
                    <option value="green">Verde</option>
                    <option value="red">Rojo</option>
                    <option value="yellow">Amarillo</option>
                    <option value="blue">Azul</option>
                  </select>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setShowAddMed(false)}>
                    {t("common.cancel")}
                  </Button>
                  <Button size="sm" onClick={handleAddMed} disabled={!newMedName.trim()}>
                    {t("patients.agregar")}
                  </Button>
                </div>
              </div>
            )}
            {/* Medication list (short) */}
            {patientMeds.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-2 px-5">
                {patientMeds.map((m) => (
                  <span
                    key={m.id}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium",
                      m.colorHint === "green" && "bg-emerald-100 dark:bg-emerald-950/50",
                      m.colorHint === "red" && "bg-red-100 dark:bg-red-950/50",
                      m.colorHint === "yellow" && "bg-amber-100 dark:bg-amber-950/50",
                      m.colorHint === "blue" && "bg-sky-100 dark:bg-sky-950/50",
                      (!m.colorHint || m.colorHint === "neutral") && "bg-muted"
                    )}
                  >
                    {m.name}
                    {m.timesPerDay > 1 ? ` ×${m.timesPerDay}` : ""}
                    {m.endDate ? ` ${t("calendar.finished")}` : ""}
                    {!m.endDate && (
                      <button
                        type="button"
                        onClick={() => endTreatment(m)}
                        className="text-destructive hover:underline"
                      >
                        {t("calendar.finish")}
                      </button>
                    )}
                    {onDeleteMedication && (
                      <button
                        type="button"
                        onClick={() => handleDeleteMedication(m)}
                        className="text-destructive hover:underline"
                      >
                        {t("common.delete")}
                      </button>
                    )}
                  </span>
                ))}
              </div>
            )}
          </>
        )}

        {/* Month selector */}
        <div className="flex items-center justify-center gap-4 px-5 pb-4">
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-full"
            onClick={prevMonth}
            disabled={!canGoPrev}
            aria-label="Mes anterior"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h3 className="min-w-[160px] text-center text-xl font-semibold text-foreground">
            {getMonthName(month - 1)} {year}
          </h3>
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-full"
            onClick={nextMonth}
            disabled={!canGoNext}
            aria-label="Mes siguiente"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      </header>

      <main className="flex-1 px-5 pb-28">
        {!selectedPatientId ? (
          <div className="rounded-2xl border border-border bg-card p-8 text-center text-muted-foreground">
            {t("calendar.noPatientSelected")}
          </div>
        ) : (
          <>
            {/* Contadores del mes: una cuenta por cada pastilla */}
            <div className="mb-4">
              <CountersCard
                medications={patientMeds}
                doses={dosesThisMonth}
                title={t("calendar.dosesThisMonth")}
              />
            </div>

            {/* Próximas pastillas a dar (hoy) */}
            {isViewingCurrentMonth && pendingToday.length > 0 && (
              <div className="mb-4 rounded-2xl border border-border bg-card p-4">
                <h3 className="mb-2 text-sm font-medium text-muted-foreground">
                  {t("calendar.nextPillsToday")}
                </h3>
                <ul className="space-y-2">
                  {pendingToday.map(({ medicationId, slotIndex, label }) => (
                    <li
                      key={`${medicationId}-${slotIndex}`}
                      className="flex items-center justify-between gap-2 rounded-lg bg-muted/50 px-3 py-2"
                    >
                      <span className="text-sm font-medium text-foreground">
                        {label}
                      </span>
                      <div className="flex gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs"
                          onClick={() =>
                            selectedPatientId &&
                            onSetDose(
                              selectedPatientId,
                              medicationId,
                              slotIndex,
                              todayKey,
                              "given"
                            )
                          }
                        >
                          {t("calendar.doseGiven")}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs text-muted-foreground"
                          onClick={() =>
                            selectedPatientId &&
                            onSetDose(
                              selectedPatientId,
                              medicationId,
                              slotIndex,
                              todayKey,
                              "omitted"
                            )
                          }
                        >
                          {t("calendar.doseOmitted")}
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Calendario por día con detalle de cada medicamento y veces por día */}
            <div className="mb-4">
              <MedicationGrid
                year={year}
                month={month}
                medications={patientMeds}
                doses={patientDoses}
                onDoseClick={handleDoseClick}
              />
            </div>
          </>
        )}
      </main>

      <MedsBottomNav activeScreen={activeNav} onNavigate={onNavigate} />
    </div>
  )
}
