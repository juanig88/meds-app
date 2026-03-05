"use client"

import { Suspense, useState, useEffect, useRef } from "react"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { HomeScreen } from "@/components/HomeScreen"

import { PatientsScreen } from "@/meds-tracker/components/PatientsScreen"
import { CalendarScreen } from "@/meds-tracker/components/CalendarScreen"
import { LoginScreen } from "@/components/LoginScreen"
import { useMedsStore } from "@/meds-tracker/store/useMedsStore"
import { useAuth } from "@/lib/auth/AuthProvider"
import type { Patient } from "@/meds-tracker/types"
import type { MedsNavScreen } from "@/components/MedsBottomNav"
import { UserMenu } from "@/components/UserMenu"
import { exportAllToCsv } from "@/lib/export-csv"

const LOG_PREFIX = "[meds-page]"
const VALID_VIEWS: MedsNavScreen[] = ["home", "patients", "calendar"]

function PageFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <p className="text-muted-foreground">Cargando...</p>
    </div>
  )
}

export default function MedsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }> | { error?: string }
}) {
  return (
    <Suspense fallback={<PageFallback />}>
      <MedsPageContent searchParams={searchParams} />
    </Suspense>
  )
}

function MedsPageContent({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }> | { error?: string }
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParamsClient = useSearchParams()

  const viewFromUrl = (() => {
    const v = searchParamsClient.get("view")
    return v && VALID_VIEWS.includes(v as MedsNavScreen) ? (v as MedsNavScreen) : "patients"
  })()
  const patientFromUrl = (() => {
    const p = searchParamsClient.get("patient")
    return p && /^[0-9a-f-]{36}$/i.test(p) ? p : null
  })()

  const [authError, setAuthError] = useState<string | null>(null)
  const [view, setViewState] = useState<MedsNavScreen>(() => viewFromUrl)
  const [selectedPatientId, setSelectedPatientIdState] = useState<string | null>(() => patientFromUrl)
  const urlSyncedRef = useRef(false)

  // When URL has no view param, write it once so refresh keeps place (no setState here)
  useEffect(() => {
    if (urlSyncedRef.current) return
    if (searchParamsClient.get("view")) return
    urlSyncedRef.current = true
    const params = new URLSearchParams()
    params.set("view", viewFromUrl)
    if (viewFromUrl === "calendar" && patientFromUrl) params.set("patient", patientFromUrl)
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }, [searchParamsClient, pathname, router, viewFromUrl, patientFromUrl])

  const setView = (newView: MedsNavScreen) => {
    setViewState(newView)
    const params = new URLSearchParams(searchParamsClient.toString())
    params.set("view", newView)
    if (newView !== "calendar") params.delete("patient")
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }
  const setSelectedPatientId = (id: string | null) => {
    setSelectedPatientIdState(id)
    setViewState("calendar")
    const params = new URLSearchParams(searchParamsClient.toString())
    params.set("view", "calendar")
    if (id) params.set("patient", id)
    else params.delete("patient")
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }

  const { user, loading, configMissing, signInWithGoogle, signOut } = useAuth()

  const {
    patients,
    medications,
    doses,
    loading: storeLoading,
    addPatient,
    updatePatient,
    deletePatient,
    addMedication,
    deleteMedication,
    setMedicationEndDate,
    setDose,
    removeDose,
    ensureDosesForMonth,
    limits,
  } = useMedsStore(user?.id ?? null)

  useEffect(() => {
    const paramsPromise: Promise<{ error?: string }> =
      searchParams instanceof Promise
        ? searchParams
        : Promise.resolve(searchParams ?? {})
    paramsPromise.then((params: { error?: string }) => {
      if (params?.error) {
        setAuthError("auth")
        // Quitar ?error= de la URL para no mostrar error tras un login exitoso
        if (typeof window !== "undefined" && window.history.replaceState) {
          const url = new URL(window.location.href)
          url.searchParams.delete("error")
          window.history.replaceState({}, "", url.pathname + url.search)
        }
      }
    })
  }, [searchParams])

  const prevViewRef = useRef<MedsNavScreen>(view)
  useEffect(() => {
    if (prevViewRef.current !== view) {
      console.log(LOG_PREFIX, "navegación:", prevViewRef.current, "→", view)
      prevViewRef.current = view
    }
  }, [view])

  const handleSelectPatient = (patient: Patient) => {
    console.log(LOG_PREFIX, "clic en paciente →", patient.name, "| id:", patient.id)
    setSelectedPatientId(patient.id)
  }

  if (configMissing) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6">
        <div className="max-w-md rounded-2xl border border-border bg-card p-6 text-center">
          <h1 className="text-lg font-semibold text-foreground">
            Configuración requerida
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Copiá <code className="rounded bg-muted px-1.5 py-0.5 text-xs">.env.local.example</code> a{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">.env.local</code> y completá{" "}
            <strong>NEXT_PUBLIC_SUPABASE_URL</strong> y{" "}
            <strong>NEXT_PUBLIC_SUPABASE_ANON_KEY</strong> con los valores de tu proyecto en Supabase (Project Settings → API). Luego reiniciá el servidor de desarrollo.
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Ver <code className="rounded bg-muted px-1 py-0.5">SUPABASE_SETUP.md</code> para más detalles.
          </p>
        </div>
      </div>
    )
  }

  if (loading || (user && storeLoading)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Cargando...</p>
      </div>
    )
  }

  if (!user) {
    return (
      <LoginScreen
        onSignInWithGoogle={signInWithGoogle}
        error={authError}
      />
    )
  }

  return (
    <>
      <header className="fixed right-4 top-4 z-30">
        <UserMenu
          user={user}
          onExportCsv={() => exportAllToCsv(patients, medications, doses)}
          onSignOut={() => signOut()}
        />
      </header>

      {view === "home" && (
        <HomeScreen
          patients={patients}
          medications={medications}
          onSelectPatient={handleSelectPatient}
          activeNav={view}
          onNavigate={setView}
        />
      )}
      {view === "patients" && (
        <PatientsScreen
          patients={patients}
          onAddPatient={addPatient}
          onUpdatePatient={updatePatient}
          onDeletePatient={deletePatient}
          onSelectPatient={handleSelectPatient}
          activeNav={view}
          onNavigate={setView}
          maxPatients={limits.maxPatients}
        />
      )}
      {view === "calendar" && (
        <CalendarScreen
          patients={patients}
          medications={medications}
          doses={doses}
          selectedPatientId={selectedPatientId}
          onSelectPatient={setSelectedPatientId}
          onAddMedication={addMedication}
          onDeleteMedication={deleteMedication}
          onSetDose={setDose}
          onRemoveDose={removeDose}
          onSetMedicationEndDate={setMedicationEndDate}
          onEnsureDosesForMonth={ensureDosesForMonth}
          activeNav={view}
          onNavigate={setView}
          maxMedications={limits.maxMedications}
        />
      )}
    </>
  )
}
