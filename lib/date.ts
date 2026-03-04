import { addDays, endOfMonth, format, startOfMonth } from "date-fns"

const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
]

const WEEKDAY_LABELS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"]

export function getMonthName(monthIndex: number): string {
  return MONTH_NAMES[monthIndex] ?? ""
}

export function getMonthNameFromDate(date: Date): string {
  return MONTH_NAMES[date.getMonth()]
}

export function getWeekdayLabels(): string[] {
  return WEEKDAY_LABELS
}

/** Devuelve los días del mes agrupados por semana (lunes a domingo). Cada semana tiene 7 días. */
export function getWeeksInMonth(year: number, month: number): Date[][] {
  const start = startOfMonth(new Date(year, month - 1, 1))
  const end = endOfMonth(start)
  const weeks: Date[][] = []
  let week: Date[] = []
  let d = new Date(start.getTime())

  // Recorrer solo los días del mes
  while (d.getTime() <= end.getTime()) {
    if (week.length === 7) {
      weeks.push(week)
      week = []
    }
    week.push(new Date(d.getTime()))
    d = addDays(d, 1)
  }

  // Rellenar la última semana con días del mes siguiente hasta completar 7 (máximo 6 iteraciones)
  const toPad = week.length > 0 ? 7 - week.length : 0
  for (let i = 0; i < toPad; i++) {
    const last = week[week.length - 1]
    week.push(addDays(last, 1))
  }
  if (week.length > 0) weeks.push(week)
  return weeks
}

/** Lista de días del mes (solo días del mes, ordenados). */
export function getDaysInMonth(year: number, month: number): Date[] {
  const weeks = getWeeksInMonth(year, month)
  const days: Date[] = []
  for (const week of weeks) {
    for (const day of week) {
      if (day.getMonth() === month - 1 && day.getFullYear() === year) {
        days.push(day)
      }
    }
  }
  return days
}

/** Fecha en YYYY-MM-DD. */
export function toDateKey(date: Date): string {
  return format(date, "yyyy-MM-dd")
}

/** Si la fecha del medicamento (start/end) aplica para este día. */
export function isMedicationActiveOnDate(
  startDate: string,
  endDate: string | null,
  dayKey: string
): boolean {
  if (dayKey < startDate) return false
  if (endDate && dayKey > endDate) return false
  return true
}

export { MONTH_NAMES, WEEKDAY_LABELS }
