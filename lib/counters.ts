import type { DoseEntry, DoseStatus, Medication } from "@/meds-tracker/types"
import { isMedicationActiveOnDate } from "@/meds-tracker/lib/date"

/** Cuenta de dosis por medicamento (por nombre base, sumando todos los slots). */
export interface MedicationCounts {
  medicationId: string
  medicationName: string
  given: number
  omitted: number
  total: number
}

export function computeMedicationCounts(
  medications: Medication[],
  doses: DoseEntry[]
): MedicationCounts[] {
  const byMed: Record<string, { given: number; omitted: number; name: string }> = {}
  for (const m of medications) {
    byMed[m.id] = { given: 0, omitted: 0, name: m.name }
  }
  for (const d of doses) {
    if (!byMed[d.medicationId]) continue
    if (d.status === "given") byMed[d.medicationId].given++
    else byMed[d.medicationId].omitted++
  }
  return Object.entries(byMed).map(([id, v]) => ({
    medicationId: id,
    medicationName: v.name,
    given: v.given,
    omitted: v.omitted,
    total: v.given + v.omitted,
  }))
}

export function getDoseAt(
  doses: DoseEntry[],
  medicationId: string,
  slotIndex: number,
  dateKey: string
): DoseStatus | null {
  const entry = doses.find(
    (d) =>
      d.medicationId === medicationId &&
      d.slotIndex === slotIndex &&
      d.date === dateKey
  )
  return entry ? entry.status : null
}

/** Tomas pendientes para una fecha: medicamento+slot sin dosis registrada ese día. */
export interface PendingSlot {
  medicationId: string
  medicationName: string
  slotIndex: number
  label: string
}

export function getPendingSlotsForDate(
  medications: Medication[],
  doses: DoseEntry[],
  dateKey: string
): PendingSlot[] {
  const pending: PendingSlot[] = []
  for (const m of medications) {
    if (!isMedicationActiveOnDate(m.startDate, m.endDate, dateKey)) continue
    for (let i = 0; i < m.timesPerDay; i++) {
      if (getDoseAt(doses, m.id, i, dateKey) !== null) continue
      const label = m.timesPerDay > 1 ? `${m.name} ${i + 1}` : m.name
      pending.push({
        medicationId: m.id,
        medicationName: m.name,
        slotIndex: i,
        label,
      })
    }
  }
  return pending
}
