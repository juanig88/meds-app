import type { SupabaseClient } from "@supabase/supabase-js"
import type { DoseEntry, DoseStatus, Medication, Patient } from "@/meds-tracker/types"

const LOG_PREFIX = "[meds-db]"

type DbPatient = { id: string; user_id: string; name: string; description: string | null; created_at: string }
type DbMedication = {
  id: string
  patient_id: string
  name: string
  times_per_day: number
  start_date: string
  end_date: string | null
  color_hint: string | null
  created_at: string
}
type DbDose = {
  id: string
  patient_id: string
  medication_id: string
  slot_index: number
  date: string
  status: string
  created_at: string
}

function toPatient(r: DbPatient): Patient {
  return {
    id: r.id,
    name: r.name,
    description: r.description ?? undefined,
    createdAt: r.created_at,
  }
}

function toMedication(r: DbMedication): Medication {
  return {
    id: r.id,
    patientId: r.patient_id,
    name: r.name,
    timesPerDay: r.times_per_day,
    startDate: r.start_date,
    endDate: r.end_date,
    colorHint: r.color_hint as Medication["colorHint"] | undefined,
    createdAt: r.created_at,
  }
}

function toDose(r: DbDose): DoseEntry {
  return {
    id: r.id,
    patientId: r.patient_id,
    medicationId: r.medication_id,
    slotIndex: r.slot_index,
    date: r.date,
    status: r.status as DoseStatus,
  }
}

export async function fetchPatients(supabase: SupabaseClient, userId: string): Promise<Patient[]> {
  const { data, error } = await supabase
    .from("patients")
    .select("id, user_id, name, description, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
  if (error) throw error
  const list = (data ?? []).map(toPatient)
  console.log(LOG_PREFIX, "fetchPatients →", list.length, "pacientes")
  return list
}

export async function fetchMedications(supabase: SupabaseClient, patientIds: string[]): Promise<Medication[]> {
  if (patientIds.length === 0) return []
  const { data, error } = await supabase
    .from("medications")
    .select("id, patient_id, name, times_per_day, start_date, end_date, color_hint, created_at")
    .in("patient_id", patientIds)
    .order("created_at", { ascending: true })
  if (error) throw error
  const list = (data ?? []).map(toMedication)
  console.log(LOG_PREFIX, "fetchMedications →", list.length, "medicamentos (patientIds:", patientIds.length, ")")
  return list
}

/** Rango opcional en formato YYYY-MM-DD. Si no se pasa, se traen todas las dosis (puede ser lento). */
export type DosesDateRange = { minDate: string; maxDate: string }

export async function fetchDoses(
  supabase: SupabaseClient,
  patientIds: string[],
  range?: DosesDateRange
): Promise<DoseEntry[]> {
  if (patientIds.length === 0) return []
  let q = supabase
    .from("doses")
    .select("id, patient_id, medication_id, slot_index, date, status, created_at")
    .in("patient_id", patientIds)
  if (range) {
    q = q.gte("date", range.minDate).lte("date", range.maxDate)
  }
  const { data, error } = await q
  if (error) throw error
  const list = (data ?? []).map(toDose)
  console.log(
    LOG_PREFIX,
    "fetchDoses →",
    list.length,
    "dosis (patientIds:",
    patientIds.length,
    range ? `| rango: ${range.minDate}..${range.maxDate})` : "| sin rango)"
  )
  return list
}

export async function insertPatient(
  supabase: SupabaseClient,
  userId: string,
  name: string,
  description?: string
): Promise<Patient> {
  const { data, error } = await supabase
    .from("patients")
    .insert({ user_id: userId, name, description: description ?? null })
    .select("id, user_id, name, description, created_at")
    .single()
  if (error) throw error
  return toPatient(data as DbPatient)
}

export async function updatePatient(
  supabase: SupabaseClient,
  patientId: string,
  updates: { name?: string; description?: string }
): Promise<Patient> {
  const { data, error } = await supabase
    .from("patients")
    .update({
      ...(updates.name !== undefined && { name: updates.name }),
      ...(updates.description !== undefined && { description: updates.description ?? null }),
    })
    .eq("id", patientId)
    .select("id, user_id, name, description, created_at")
    .single()
  if (error) throw error
  return toPatient(data as DbPatient)
}

export async function deletePatient(
  supabase: SupabaseClient,
  patientId: string
): Promise<void> {
  const { error } = await supabase.from("patients").delete().eq("id", patientId)
  if (error) throw error
}

export async function deleteMedication(
  supabase: SupabaseClient,
  medicationId: string
): Promise<void> {
  const { error } = await supabase.from("medications").delete().eq("id", medicationId)
  if (error) throw error
}

export async function insertMedication(
  supabase: SupabaseClient,
  patientId: string,
  name: string,
  timesPerDay: number,
  startDate: string,
  colorHint?: Medication["colorHint"]
): Promise<Medication> {
  const { data, error } = await supabase
    .from("medications")
    .insert({
      patient_id: patientId,
      name,
      times_per_day: timesPerDay,
      start_date: startDate,
      end_date: null,
      color_hint: colorHint ?? null,
    })
    .select()
    .single()
  if (error) throw error
  return toMedication(data as DbMedication)
}

export async function updateMedicationEndDate(
  supabase: SupabaseClient,
  medicationId: string,
  endDate: string | null
): Promise<void> {
  const { error } = await supabase
    .from("medications")
    .update({ end_date: endDate })
    .eq("id", medicationId)
  if (error) throw error
}

export async function upsertDose(
  supabase: SupabaseClient,
  patientId: string,
  medicationId: string,
  slotIndex: number,
  dateKey: string,
  status: DoseStatus
): Promise<DoseEntry> {
  const { data: existing } = await supabase
    .from("doses")
    .select("id, patient_id, medication_id, slot_index, date, status, created_at")
    .eq("patient_id", patientId)
    .eq("medication_id", medicationId)
    .eq("slot_index", slotIndex)
    .eq("date", dateKey)
    .maybeSingle()

  if (existing) {
    const { data, error } = await supabase
      .from("doses")
      .update({ status })
      .eq("id", existing.id)
      .select()
      .single()
    if (error) throw error
    return toDose(data as DbDose)
  }

  const { data, error } = await supabase
    .from("doses")
    .insert({
      patient_id: patientId,
      medication_id: medicationId,
      slot_index: slotIndex,
      date: dateKey,
      status,
    })
    .select()
    .single()
  if (error) throw error
  return toDose(data as DbDose)
}

/** Borra una dosis (para "cancelar" una marca de dada/omitida). */
export async function deleteDose(
  supabase: SupabaseClient,
  patientId: string,
  medicationId: string,
  slotIndex: number,
  dateKey: string
): Promise<void> {
  const { error } = await supabase
    .from("doses")
    .delete()
    .eq("patient_id", patientId)
    .eq("medication_id", medicationId)
    .eq("slot_index", slotIndex)
    .eq("date", dateKey)
  if (error) throw error
}
