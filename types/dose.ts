/**
 * Estado de una dosis: administrada (x) u omitida (-).
 */
export type DoseStatus = "given" | "omitted"

/**
 * Registro de una dosis en un día concreto.
 * slotIndex: 0 = primera toma del día (ej. Enoxaparina 1), 1 = segunda (Enoxaparina 2).
 */
export interface DoseEntry {
  id: string
  patientId: string
  medicationId: string
  slotIndex: number
  date: string
  status: DoseStatus
}
