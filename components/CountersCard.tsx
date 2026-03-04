"use client"

import { computeMedicationCounts } from "@/meds-tracker/lib/counters"
import type { DoseEntry, Medication } from "@/meds-tracker/types"

interface CountersCardProps {
  medications: Medication[]
  doses: DoseEntry[]
  /** Título opcional (ej. "Dadas este mes") */
  title?: string
}

export function CountersCard({
  medications,
  doses,
  title = "Dosis por medicamento",
}: CountersCardProps) {
  const counts = computeMedicationCounts(medications, doses)

  if (counts.length === 0) return null

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <h3 className="mb-3 text-sm font-medium text-muted-foreground">
        {title}
      </h3>
      <div className="flex flex-wrap gap-4">
        {counts.map((c) => (
          <div key={c.medicationId} className="min-w-[100px]">
            <p className="text-xs text-muted-foreground">{c.medicationName}</p>
            <p className="text-lg font-semibold tabular-nums text-foreground">
              {c.given + c.omitted}
              <span className="ml-1 text-sm font-normal text-muted-foreground">
                (x{c.given} –{c.omitted})
              </span>
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
