import type { DoseEntry, Medication, Patient } from "@/meds-tracker/types"

function escapeCsvCell(value: string | number): string {
  const s = String(value)
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

export function buildPatientsCsv(patients: Patient[]): string {
  const header = "id,name,description,created_at"
  const rows = patients.map((p) =>
    [p.id, p.name, p.description ?? "", p.createdAt].map(escapeCsvCell).join(",")
  )
  return [header, ...rows].join("\n")
}

export function buildMedicationsCsv(
  medications: Medication[],
  patients: Patient[]
): string {
  const patientNames = new Map(patients.map((p) => [p.id, p.name]))
  const header = "id,patient_id,patient_name,name,times_per_day,start_date,end_date,created_at"
  const rows = medications.map((m) =>
    [
      m.id,
      m.patientId,
      patientNames.get(m.patientId) ?? "",
      m.name,
      m.timesPerDay,
      m.startDate,
      m.endDate ?? "",
      m.createdAt,
    ]
      .map(escapeCsvCell)
      .join(",")
  )
  return [header, ...rows].join("\n")
}

export function buildDosesCsv(
  doses: DoseEntry[],
  medications: Medication[],
  patients: Patient[]
): string {
  const medNames = new Map(medications.map((m) => [m.id, m.name]))
  const patientNames = new Map(patients.map((p) => [p.id, p.name]))
  const header = "id,patient_id,patient_name,medication_id,medication_name,slot_index,date,status"
  const rows = doses.map((d) =>
    [
      d.id,
      d.patientId,
      patientNames.get(d.patientId) ?? "",
      d.medicationId,
      medNames.get(d.medicationId) ?? "",
      d.slotIndex,
      d.date,
      d.status,
    ]
      .map(escapeCsvCell)
      .join(",")
  )
  return [header, ...rows].join("\n")
}

export function downloadCsv(content: string, filename: string): void {
  const blob = new Blob(["\uFEFF" + content], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function exportAllToCsv(
  patients: Patient[],
  medications: Medication[],
  doses: DoseEntry[]
): void {
  const date = new Date().toISOString().slice(0, 10)
  downloadCsv(buildPatientsCsv(patients), `meds-pacientes-${date}.csv`)
  downloadCsv(
    buildMedicationsCsv(medications, patients),
    `meds-medicamentos-${date}.csv`
  )
  downloadCsv(buildDosesCsv(doses, medications, patients), `meds-dosis-${date}.csv`)
}
