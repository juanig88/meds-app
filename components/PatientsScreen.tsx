"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, ChevronRight, Pencil, Trash2 } from "lucide-react"
import type { Patient } from "@/meds-tracker/types"
import { MedsBottomNav, type MedsNavScreen } from "./MedsBottomNav"
import { useI18n } from "@/lib/i18n/I18nProvider"
import { cn } from "@/lib/utils"

const LOG_PREFIX = "[meds-patients]"

interface PatientsScreenProps {
  patients: Patient[]
  onAddPatient: (name: string, description?: string) => string | Promise<string>
  onUpdatePatient: (
    patientId: string,
    updates: { name?: string; description?: string }
  ) => Promise<void>
  onDeletePatient: (patientId: string) => Promise<void>
  onSelectPatient: (patient: Patient) => void
  activeNav: MedsNavScreen
  onNavigate: (screen: MedsNavScreen) => void
  maxPatients: number
}

export function PatientsScreen({
  patients,
  onAddPatient,
  onUpdatePatient,
  onDeletePatient,
  onSelectPatient,
  activeNav,
  onNavigate,
  maxPatients,
}: PatientsScreenProps) {
  const { t } = useI18n()
  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState("")
  const [newDesc, setNewDesc] = useState("")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState("")
  const [editDesc, setEditDesc] = useState("")
  const [error, setError] = useState<string | null>(null)

  const atLimit = patients.length >= maxPatients

  const handleAdd = async () => {
    const name = newName.trim()
    if (!name) return
    setError(null)
    try {
      await onAddPatient(name, newDesc.trim() || undefined)
      setNewName("")
      setNewDesc("")
      setShowAdd(false)
    } catch (e) {
      setError(
        e instanceof Error && e.message === "MAX_PATIENTS"
          ? t("patients.limit", { max: maxPatients })
          : t("patients.errorAdd")
      )
    }
  }

  const startEdit = (p: Patient) => {
    setEditingId(p.id)
    setEditName(p.name)
    setEditDesc(p.description ?? "")
  }

  const saveEdit = async () => {
    if (!editingId) return
    const name = editName.trim()
    if (!name) return
    setError(null)
    try {
      await onUpdatePatient(editingId, {
        name,
        description: editDesc.trim() || undefined,
      })
      setEditingId(null)
    } catch {
      setError(t("patients.errorSave"))
    }
  }

  const handleDelete = async (e: React.MouseEvent, p: Patient) => {
    e.stopPropagation()
    if (
      typeof window === "undefined" ||
      !window.confirm(t("patients.deleteConfirm", { name: p.name }))
    )
      return
    setError(null)
    try {
      await onDeletePatient(p.id)
    } catch {
      setError(t("patients.errorDelete"))
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg pr-44">
        <div className="flex flex-wrap items-center gap-2 px-5 pb-3 pt-safe-top">
          <h1 className="pt-4 text-lg font-semibold text-foreground">
            {t("patients.title")}
          </h1>
          {patients.length > 0 && (
            <Button
              variant="default"
              size="sm"
              className="mt-4 gap-1.5"
              onClick={() => { setShowAdd(!showAdd); setError(null) }}
              disabled={atLimit}
              title={atLimit ? t("patients.limit", { max: maxPatients }) : t("patients.add")}
            >
              <Plus className="h-4 w-4" />
              {t("patients.add")}
            </Button>
          )}
        </div>
      </header>

      <main className="flex-1 px-5 pb-28">
        {error && (
          <p className="mb-3 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}
        {atLimit && (
          <p className="mb-3 text-sm text-muted-foreground">
            {t("patients.limit", { max: maxPatients })}
          </p>
        )}
        {showAdd && (
          <div className="mb-4 rounded-2xl border border-border bg-card p-4">
            <Input
              placeholder={t("patients.namePlaceholder")}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="mb-2"
            />
            <Input
              placeholder={t("patients.descPlaceholder")}
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              className="mb-3"
            />
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowAdd(false)}>
                {t("common.cancel")}
              </Button>
              <Button size="sm" onClick={handleAdd} disabled={!newName.trim()}>
                {t("patients.agregar")}
              </Button>
            </div>
          </div>
        )}

        {patients.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <p className="mb-2 text-muted-foreground">{t("patients.empty")}</p>
            <p className="mb-5 text-sm text-muted-foreground">
              {t("patients.emptyHint")}
            </p>
            <Button
              onClick={() => { setShowAdd(true); setError(null) }}
              disabled={atLimit}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              {t("patients.addFirst")}
            </Button>
          </div>
        ) : (
          <ul className="space-y-2">
            {patients.map((p) => (
              <li key={p.id}>
                {editingId === p.id ? (
                  <div className="rounded-2xl border border-border bg-card p-4">
                    <Input
                      placeholder={t("patients.namePlaceholder")}
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="mb-2"
                    />
                    <Input
                      placeholder={t("patients.descPlaceholder")}
                      value={editDesc}
                      onChange={(e) => setEditDesc(e.target.value)}
                      className="mb-3"
                    />
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingId(null)}
                      >
                        {t("common.cancel")}
                      </Button>
                      <Button size="sm" onClick={saveEdit} disabled={!editName.trim()}>
                        {t("common.save")}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div
                    className={cn(
                      "flex items-center justify-between gap-2 rounded-2xl border border-border bg-card px-4 py-3",
                      "transition-colors"
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        console.log(LOG_PREFIX, "clic en paciente:", p.name, "| id:", p.id)
                        onSelectPatient(p)
                      }}
                      className="min-w-0 flex-1 text-left"
                    >
                      <p className="font-medium text-foreground">{p.name}</p>
                      {p.description && (
                        <p className="text-sm text-muted-foreground">{p.description}</p>
                      )}
                    </button>
                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9"
                        onClick={(e) => {
                          e.stopPropagation()
                          startEdit(p)
                        }}
                        title="Editar"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-destructive hover:text-destructive"
                        onClick={(e) => handleDelete(e, p)}
                        title="Eliminar"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <ChevronRight
                        className="h-5 w-5 text-muted-foreground"
                        aria-hidden
                      />
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </main>
      <MedsBottomNav activeScreen={activeNav} onNavigate={onNavigate} />
    </div>
  )
}
