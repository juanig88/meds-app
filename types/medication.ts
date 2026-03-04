/**
 * Medicamento asignado a un paciente.
 * timesPerDay: 1 = una vez al día (ej. Clopidogrel), 2 = dos veces (ej. Enoxaparina 1 y 2).
 * Cuando endDate está definida, el tratamiento está finalizado y no se muestra en días posteriores.
 */
export interface Medication {
  id: string
  patientId: string
  name: string
  /** Veces por día (1, 2, ...). En el grid se muestra como "Nombre 1", "Nombre 2", etc. */
  timesPerDay: number
  /** Fecha de inicio del tratamiento (YYYY-MM-DD). */
  startDate: string
  /** Fecha de fin del tratamiento. Si existe, no se muestran días posteriores. */
  endDate: string | null
  /** Color de fila en el grid (opcional). */
  colorHint?: "green" | "red" | "yellow" | "blue" | "neutral"
  createdAt: string
}
