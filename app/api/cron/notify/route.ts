import { NextRequest, NextResponse } from "next/server"
import { Resend } from "resend"
import { createServiceClient } from "@/lib/supabase/service"
import { getHourForSlot } from "@/lib/notifications/dose-schedule"

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? "Meds App <onboarding@resend.dev>"
const TIMEZONE = process.env.NOTIFY_TIMEZONE ?? "America/Argentina/Buenos_Aires"

type DbUser = { id: string; email: string | null }
type DbPatient = { id: string; user_id: string; name: string }
type DbMedication = {
  id: string
  patient_id: string
  name: string
  times_per_day: number
  start_date: string
  end_date: string | null
}
type DbDose = { patient_id: string; medication_id: string; slot_index: number; date: string }

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization")
  const secret = process.env.CRON_SECRET
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: "RESEND_API_KEY not set" },
      { status: 500 }
    )
  }

  const resend = new Resend(apiKey)
  const now = new Date()
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    hour: "numeric",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
  const parts = formatter.formatToParts(now)
  const getPart = (type: string) => parts.find((p) => p.type === type)?.value ?? "0"
  const hour = parseInt(getPart("hour"), 10)
  const today = `${getPart("year")}-${getPart("month")}-${getPart("day")}`

  const supabase = createServiceClient()

  const { data: users, error: usersError } = await supabase
    .from("users")
    .select("id, email")
  if (usersError || !users?.length) {
    return NextResponse.json(
      { error: "Failed to fetch users", detail: usersError?.message },
      { status: 500 }
    )
  }

  const userIds = (users as DbUser[]).filter((u) => u.email).map((u) => u.id)
  if (userIds.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, message: "No users with email" })
  }

  const { data: patients, error: patientsError } = await supabase
    .from("patients")
    .select("id, user_id, name")
    .in("user_id", userIds)
  if (patientsError) {
    return NextResponse.json(
      { error: "Failed to fetch patients", detail: patientsError?.message },
      { status: 500 }
    )
  }
  const patientList = (patients ?? []) as DbPatient[]

  const patientIds = patientList.map((p) => p.id)
  if (patientIds.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, message: "No patients" })
  }

  const { data: medications, error: medsError } = await supabase
    .from("medications")
    .select("id, patient_id, name, times_per_day, start_date, end_date")
    .in("patient_id", patientIds)
  if (medsError) {
    return NextResponse.json(
      { error: "Failed to fetch medications", detail: medsError?.message },
      { status: 500 }
    )
  }
  const medList = (medications ?? []) as DbMedication[]

  const activeMeds = medList.filter((m) => {
    if (m.start_date > today) return false
    if (m.end_date != null && m.end_date < today) return false
    return true
  })

  const { data: dosesToday, error: dosesError } = await supabase
    .from("doses")
    .select("patient_id, medication_id, slot_index, date")
    .in("patient_id", patientIds)
    .eq("date", today)
  if (dosesError) {
    return NextResponse.json(
      { error: "Failed to fetch doses", detail: dosesError?.message },
      { status: 500 }
    )
  }
  const givenOrOmitted = new Set(
    (dosesToday ?? []).map((d: DbDose) =>
      [d.patient_id, d.medication_id, d.slot_index].join("|")
    )
  )

  type Reminder = { patientName: string; medicationName: string }
  const byUser = new Map<string, Reminder[]>()
  for (const u of users as DbUser[]) {
    if (!u.email) continue
    byUser.set(u.id, [])
  }

  for (const med of activeMeds) {
    const patient = patientList.find((p) => p.id === med.patient_id)
    if (!patient) continue
    const userId = patient.user_id
    if (!byUser.has(userId)) continue

    for (let slot = 0; slot < med.times_per_day; slot++) {
      const slotHour = getHourForSlot(med.times_per_day, slot)
      if (slotHour !== hour) continue
      const key = `${med.patient_id}|${med.id}|${slot}`
      if (givenOrOmitted.has(key)) continue

      const slotLabel =
        med.times_per_day > 1 ? ` (${slot + 1}/${med.times_per_day})` : ""
      byUser.get(userId)!.push({
        patientName: patient.name,
        medicationName: med.name + slotLabel,
      })
    }
  }

  let sent = 0
  const appName = process.env.NEXT_PUBLIC_APP_NAME ?? "Meds App"
  for (const u of users as DbUser[]) {
    if (!u.email) continue
    const reminders = byUser.get(u.id) ?? []
    if (reminders.length === 0) continue

    const list = reminders
      .map(
        (r) =>
          `• ${r.medicationName} — ${r.patientName}`
      )
      .join("\n")
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [u.email],
      subject: `${appName} — Recordatorio: ${reminders.length} dosis pendiente(s) hoy`,
      html: `
        <p>Hola,</p>
        <p>Te recordamos dar las siguientes dosis:</p>
        <pre style="font-family:sans-serif; white-space:pre-wrap;">${list}</pre>
        <p><a href="${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}">Abrir Meds App</a></p>
      `,
    })
    if (error) {
      console.error("[cron/notify] Resend error for", u.email, error)
      continue
    }
    sent++
  }

  return NextResponse.json({
    ok: true,
    sent,
    hour,
    today,
    reminders: Array.from(byUser.entries()).reduce(
      (acc, [id, list]) => ({ ...acc, [id]: list.length }),
      {} as Record<string, number>
    ),
  })
}
