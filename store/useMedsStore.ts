"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import type { DoseEntry, DoseStatus, Medication, Patient } from "@/meds-tracker/types"
import { createClient } from "@/lib/supabase/client"
import * as meds from "@/lib/supabase/meds"

const MAX_PATIENTS = 10
const MAX_MEDICATIONS = 50
const LOG_PREFIX = "[meds-store]"
/** Cache: no refetch inicial si los datos tienen menos de este tiempo (ms). */
const CACHE_MS = 90 * 1000

function toDateKey(d: Date): string {
  return d.toISOString().slice(0, 10)
}

/** Rango de un solo mes (YYYY-MM-01 a último día del mes). */
function getDosesRangeForMonth(year: number, month: number): { minDate: string; maxDate: string } {
  const min = new Date(year, month - 1, 1)
  const max = new Date(year, month, 0)
  return { minDate: toDateKey(min), maxDate: toDateKey(max) }
}

function monthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`
}

export function useMedsStore(userId: string | null) {
  const [patients, setPatients] = useState<Patient[]>([])
  const [medications, setMedications] = useState<Medication[]>([])
  const [doses, setDoses] = useState<DoseEntry[]>([])
  const [loading, setLoading] = useState(!!userId)
  const cacheTimeRef = useRef<number>(0)
  const fetchedMonthsRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (!userId) {
      console.log(LOG_PREFIX, "sin userId, limpiando estado")
      fetchedMonthsRef.current.clear()
      queueMicrotask(() => {
        setPatients([])
        setMedications([])
        setDoses([])
        setLoading(false)
      })
      return
    }
    const now = Date.now()
    if (cacheTimeRef.current > 0 && now - cacheTimeRef.current < CACHE_MS) {
      console.log(LOG_PREFIX, "usando caché (no refetch)")
      return
    }
    const supabase = createClient()
    if (!supabase) return
    console.log(LOG_PREFIX, "iniciando carga (solo pacientes + medicamentos + mes actual)")
    console.time(LOG_PREFIX + " fetch total")
    queueMicrotask(() => setLoading(true))
    const nowDate = new Date()
    const currentYear = nowDate.getFullYear()
    const currentMonth = nowDate.getMonth() + 1
    const range = getDosesRangeForMonth(currentYear, currentMonth)
    fetchedMonthsRef.current.add(monthKey(currentYear, currentMonth))
    meds
      .fetchPatients(supabase, userId)
      .then((patientsList) => {
        setPatients(patientsList)
        console.log(LOG_PREFIX, "pacientes cargados:", patientsList.length)
        const ids = patientsList.map((x) => x.id)
        return Promise.all([
          meds.fetchMedications(supabase, ids),
          meds.fetchDoses(supabase, ids, range),
        ]) as Promise<[Medication[], DoseEntry[]]>
      })
      .then(([medsList, dosesList]) => {
        setMedications(medsList)
        setDoses(dosesList)
        cacheTimeRef.current = Date.now()
        console.log(LOG_PREFIX, "medicamentos:", medsList.length, "| dosis (mes actual):", dosesList.length)
        console.timeEnd(LOG_PREFIX + " fetch total")
      })
      .catch((e) => {
        console.error(LOG_PREFIX, "Supabase load error", e)
        console.timeEnd(LOG_PREFIX + " fetch total")
      })
      .finally(() => setLoading(false))
  }, [userId])

  const ensureDosesForMonth = useCallback(
    async (patientIds: string[], year: number, month: number): Promise<void> => {
      if (!userId || patientIds.length === 0) return
      const key = monthKey(year, month)
      if (fetchedMonthsRef.current.has(key)) return
      const supabase = createClient()
      if (!supabase) return
      fetchedMonthsRef.current.add(key)
      const range = getDosesRangeForMonth(year, month)
      console.log(LOG_PREFIX, "cargando dosis mes:", key)
      try {
        const list = await meds.fetchDoses(supabase, patientIds, range)
        const prefix = `${year}-${String(month).padStart(2, "0")}`
        setDoses((prev) => {
          const rest = prev.filter(
            (d) => !(patientIds.includes(d.patientId) && d.date.startsWith(prefix))
          )
          return [...rest, ...list]
        })
      } catch (e) {
        fetchedMonthsRef.current.delete(key)
        console.error(LOG_PREFIX, "ensureDosesForMonth error", e)
      }
    },
    [userId]
  )

  const addPatient = useCallback(
    async (name: string, description?: string): Promise<string> => {
      if (!userId) throw new Error("Login required")
      if (patients.length >= MAX_PATIENTS) throw new Error("MAX_PATIENTS")
      const supabase = createClient()
      if (!supabase) throw new Error("Config missing")
      const newPatient = await meds.insertPatient(supabase, userId, name, description)
      setPatients((prev) => [...prev, newPatient])
      return newPatient.id
    },
    [userId, patients.length]
  )

  const updatePatient = useCallback(
    async (
      patientId: string,
      updates: { name?: string; description?: string }
    ): Promise<void> => {
      if (!userId) throw new Error("Login required")
      const supabase = createClient()
      if (!supabase) throw new Error("Config missing")
      const updated = await meds.updatePatient(supabase, patientId, updates)
      setPatients((prev) =>
        prev.map((p) => (p.id === patientId ? updated : p))
      )
    },
    [userId]
  )

  const deletePatient = useCallback(
    async (patientId: string): Promise<void> => {
      if (!userId) throw new Error("Login required")
      const supabase = createClient()
      if (!supabase) throw new Error("Config missing")
      await meds.deletePatient(supabase, patientId)
      setPatients((prev) => prev.filter((p) => p.id !== patientId))
      setMedications((prev) => prev.filter((m) => m.patientId !== patientId))
      setDoses((prev) => prev.filter((d) => d.patientId !== patientId))
    },
    [userId]
  )

  const addMedication = useCallback(
    async (
      patientId: string,
      name: string,
      timesPerDay: number,
      startDate: string,
      colorHint?: Medication["colorHint"]
    ): Promise<string> => {
      if (!userId) throw new Error("Login required")
      if (medications.length >= MAX_MEDICATIONS) throw new Error("MAX_MEDICATIONS")
      const supabase = createClient()
      if (!supabase) throw new Error("Config missing")
      const newMed = await meds.insertMedication(
        supabase,
        patientId,
        name,
        timesPerDay,
        startDate,
        colorHint
      )
      setMedications((prev) => [...prev, newMed])
      return newMed.id
    },
    [userId, medications.length]
  )

  const deleteMedication = useCallback(
    async (medicationId: string): Promise<void> => {
      if (!userId) throw new Error("Login required")
      const supabase = createClient()
      if (!supabase) throw new Error("Config missing")
      await meds.deleteMedication(supabase, medicationId)
      setMedications((prev) => prev.filter((m) => m.id !== medicationId))
      setDoses((prev) => prev.filter((d) => d.medicationId !== medicationId))
    },
    [userId]
  )

  const setMedicationEndDate = useCallback(
    async (medicationId: string, endDate: string | null) => {
      if (!userId) throw new Error("Login required")
      const supabase = createClient()
      if (!supabase) throw new Error("Config missing")
      await meds.updateMedicationEndDate(supabase, medicationId, endDate)
      setMedications((prev) =>
        prev.map((m) => (m.id === medicationId ? { ...m, endDate } : m))
      )
    },
    [userId]
  )

  const setDose = useCallback(
    async (
      patientId: string,
      medicationId: string,
      slotIndex: number,
      dateKey: string,
      status: DoseStatus
    ) => {
      if (!userId) throw new Error("Login required")
      const supabase = createClient()
      if (!supabase) throw new Error("Config missing")
      const entry = await meds.upsertDose(
        supabase,
        patientId,
        medicationId,
        slotIndex,
        dateKey,
        status
      )
      setDoses((prev) => {
        const rest = prev.filter(
          (d) =>
            !(
              d.patientId === patientId &&
              d.medicationId === medicationId &&
              d.slotIndex === slotIndex &&
              d.date === dateKey
            )
        )
        return [...rest, entry]
      })
    },
    [userId]
  )

  const removeDose = useCallback(
    async (
      patientId: string,
      medicationId: string,
      slotIndex: number,
      dateKey: string
    ): Promise<void> => {
      if (!userId) throw new Error("Login required")
      const supabase = createClient()
      if (!supabase) throw new Error("Config missing")
      await meds.deleteDose(supabase, patientId, medicationId, slotIndex, dateKey)
      setDoses((prev) =>
        prev.filter(
          (d) =>
            !(
              d.patientId === patientId &&
              d.medicationId === medicationId &&
              d.slotIndex === slotIndex &&
              d.date === dateKey
            )
        )
      )
    },
    [userId]
  )

  const medicationsForPatient = useCallback(
    (patientId: string) => medications.filter((m) => m.patientId === patientId),
    [medications]
  )

  const dosesForPatient = useCallback(
    (patientId: string) => doses.filter((d) => d.patientId === patientId),
    [doses]
  )

  return {
    patients,
    medications,
    doses,
    loading,
    addPatient,
    updatePatient,
    deletePatient,
    addMedication,
    deleteMedication,
    setMedicationEndDate,
    setDose,
    removeDose,
    ensureDosesForMonth,
    medicationsForPatient,
    dosesForPatient,
    limits: { maxPatients: MAX_PATIENTS, maxMedications: MAX_MEDICATIONS },
  }
}
