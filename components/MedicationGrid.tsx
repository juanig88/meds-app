"use client"

import { useMemo, useEffect } from "react"
import type { DoseEntry, DoseStatus, Medication } from "@/meds-tracker/types"

const LOG_PREFIX = "[meds-grid]"
import { getDoseAt } from "@/meds-tracker/lib/counters"
import {
  getWeeksInMonth,
  getWeekdayLabels,
  getDaysInMonth,
  toDateKey,
  isMedicationActiveOnDate,
} from "@/meds-tracker/lib/date"
import { useI18n } from "@/lib/i18n/I18nProvider"
import { cn } from "@/lib/utils"

const MIN_DAY_CELL_PX = 36
const STICKY_LABEL_WIDTH = 120

const ROW_COLORS: Record<NonNullable<Medication["colorHint"]>, string> = {
  green: "bg-emerald-100 dark:bg-emerald-950/50",
  red: "bg-red-100 dark:bg-red-950/50",
  yellow: "bg-amber-100 dark:bg-amber-950/50",
  blue: "bg-sky-100 dark:bg-sky-950/50",
  neutral: "bg-muted/50",
}

interface SlotRow {
  medication: Medication
  slotIndex: number
  label: string
}

interface MedicationGridProps {
  year: number
  month: number
  medications: Medication[]
  doses: DoseEntry[]
  onDoseClick: (
    medicationId: string,
    slotIndex: number,
    dateKey: string,
    current: DoseStatus | null
  ) => void
}

function buildSlotRows(medications: Medication[]): SlotRow[] {
  const rows: SlotRow[] = []
  for (const m of medications) {
    for (let i = 0; i < m.timesPerDay; i++) {
      const label = m.timesPerDay > 1 ? `${m.name} ${i + 1}` : m.name
      rows.push({ medication: m, slotIndex: i, label })
    }
  }
  return rows
}

export function MedicationGrid({
  year,
  month,
  medications,
  doses,
  onDoseClick,
}: MedicationGridProps) {
  const { t } = useI18n()
  const weeks = useMemo(() => getWeeksInMonth(year, month), [year, month])
  const daysInMonth = useMemo(() => getDaysInMonth(year, month), [year, month])
  const weekdayLabels = getWeekdayLabels()
  const slotRows = useMemo(() => buildSlotRows(medications), [medications])
  const gridMinWidth = STICKY_LABEL_WIDTH + weeks.length * 7 * MIN_DAY_CELL_PX

  useEffect(() => {
    console.log(
      LOG_PREFIX,
      "render | medicamentos:",
      medications.length,
      "| filas (slots):",
      slotRows.length,
      "| dosis:",
      doses.length,
      "| mes:",
      year + "-" + String(month).padStart(2, "0")
    )
  }, [medications.length, slotRows.length, doses.length, year, month])

  if (slotRows.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 text-center text-muted-foreground">
        {t("calendar.noMeds")}
      </div>
    )
  }

  return (
    <>
      {/* Vista móvil: lista por día (visible solo en pantallas chicas) */}
      <div className="space-y-3 md:hidden">
        {daysInMonth.map((day) => {
          const dateKey = toDateKey(day)
          const weekdayIndex = day.getDay() === 0 ? 6 : day.getDay() - 1
          return (
            <div
              key={dateKey}
              className="rounded-xl border border-border bg-card p-3"
            >
              <p className="mb-2 text-sm font-medium text-muted-foreground">
                {weekdayLabels[weekdayIndex]} {day.getDate()}
              </p>
              <ul className="space-y-1.5">
                {slotRows.map(({ medication, slotIndex, label }) => {
                  const active = isMedicationActiveOnDate(
                    medication.startDate,
                    medication.endDate,
                    dateKey
                  )
                  const status = active
                    ? getDoseAt(doses, medication.id, slotIndex, dateKey)
                    : null
                  const bg = medication.colorHint ? ROW_COLORS[medication.colorHint] : ROW_COLORS.neutral
                  return (
                    <li key={`${medication.id}-${slotIndex}`}>
                      <button
                        type="button"
                        disabled={!active}
                        onClick={() =>
                          active &&
                          onDoseClick(medication.id, slotIndex, dateKey, status)
                        }
                        className={cn(
                          "flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm",
                          bg,
                          active
                            ? "hover:bg-background/30 active:bg-background/50"
                            : "cursor-default opacity-60"
                        )}
                      >
                        <span className="font-medium text-foreground truncate pr-2">{label}</span>
                        <span className="shrink-0 text-muted-foreground">
                          {status === "given" ? t("calendar.givenShort") : status === "omitted" ? t("calendar.omittedShort") : "—"}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          )
        })}
      </div>

      {/* Vista escritorio: grid con scroll horizontal (oculto en móvil) */}
      <div className="hidden overflow-x-auto rounded-2xl border border-border bg-card md:block">
        <div style={{ minWidth: gridMinWidth }}>
          {/* Header: weekdays + day numbers */}
          <div className="grid border-b border-border bg-muted/50 text-xs font-medium text-muted-foreground">
            <div
              className="grid gap-0"
              style={{
                gridTemplateColumns: `${STICKY_LABEL_WIDTH}px repeat(${weeks.length}, minmax(0, 1fr))`,
              }}
            >
              <div className="sticky left-0 z-10 border-r border-border bg-muted/50 p-2" />
              {weeks.map((week, wi) => (
                <div
                  key={wi}
                  className="grid border-r border-border last:border-r-0"
                  style={{ gridTemplateColumns: `repeat(${week.length}, minmax(${MIN_DAY_CELL_PX}px, 1fr))` }}
                >
                  {week.map((day, di) => (
                    <div
                      key={di}
                      className="flex flex-col items-center border-l border-border/50 py-1 first:border-l-0"
                    >
                      <span className="text-[10px]">
                        {weekdayLabels[day.getDay() === 0 ? 6 : day.getDay() - 1]}
                      </span>
                      <span className="font-medium text-foreground">{day.getDate()}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* Rows: medication slot + cells */}
          {slotRows.map(({ medication, slotIndex, label }) => {
            const bg = medication.colorHint ? ROW_COLORS[medication.colorHint] : ROW_COLORS.neutral
            return (
              <div
                key={`${medication.id}-${slotIndex}`}
                className={cn("grid border-b border-border last:border-b-0", bg)}
                style={{
                  gridTemplateColumns: `${STICKY_LABEL_WIDTH}px repeat(${weeks.length}, minmax(0, 1fr))`,
                }}
              >
                <div className={cn("sticky left-0 z-10 border-r border-border p-2", bg)}>
                  <span className="text-sm font-medium text-foreground">{label}</span>
                </div>
                {weeks.map((week, wi) => (
                  <div
                    key={wi}
                    className="grid border-r border-border last:border-r-0"
                    style={{ gridTemplateColumns: `repeat(${week.length}, minmax(${MIN_DAY_CELL_PX}px, 1fr))` }}
                  >
                    {week.map((day, di) => {
                      const dateKey = toDateKey(day)
                      const inCurrentMonth =
                        day.getMonth() === month - 1 && day.getFullYear() === year
                      const active =
                        inCurrentMonth &&
                        isMedicationActiveOnDate(
                          medication.startDate,
                          medication.endDate,
                          dateKey
                        )
                      const status = active
                        ? getDoseAt(doses, medication.id, slotIndex, dateKey)
                        : null
                      const display = status === "given" ? "x" : status === "omitted" ? "–" : ""

                      return (
                        <button
                          key={di}
                          type="button"
                          disabled={!active}
                          onClick={() =>
                            active &&
                            onDoseClick(medication.id, slotIndex, dateKey, status)
                          }
                          className={cn(
                            "flex items-center justify-center border-l border-border/50 py-1.5 text-sm first:border-l-0",
                            active
                              ? "hover:bg-background/50 active:bg-background/70"
                              : "cursor-default bg-muted/30 text-muted-foreground"
                          )}
                        >
                          {display}
                        </button>
                      )
                    })}
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}
