import { NextRequest, NextResponse } from "next/server"
import webpush from "web-push"
import { createServiceClient } from "@/lib/supabase/service"
import { isMorningSlot, isEveningSlot } from "@/lib/notifications/dose-schedule"

const TIMEZONE = process.env.NOTIFY_TIMEZONE ?? "America/Argentina/Buenos_Aires"

type DbUser = { id: string }
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
type DbPushSub = { user_id: string; endpoint: string; p256dh: string; auth: string }

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization")
  const secret = process.env.CRON_SECRET
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const publicKey = process.env.VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  if (!publicKey || !privateKey) {
    return NextResponse.json(
      { error: "VAPID_PUBLIC_KEY or VAPID_PRIVATE_KEY not set" },
      { status: 500 }
    )
  }

  webpush.setVapidDetails(
    "mailto:meds-app@localhost",
    publicKey,
    privateKey
  )

  const now = new Date()
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
  const parts = formatter.formatToParts(now)
  const getPart = (type: string) => parts.find((p) => p.type === type)?.value ?? "0"
  const today = `${getPart("year")}-${getPart("month")}-${getPart("day")}`

  const supabase = createServiceClient()

  const { data: users, error: usersError } = await supabase.from("users").select("id")
  if (usersError || !users?.length) {
    return NextResponse.json(
      { error: "Failed to fetch users", detail: usersError?.message },
      { status: 500 }
    )
  }

  const userIds = (users as DbUser[]).map((u) => u.id)
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
  const morningByUser = new Map<string, Reminder[]>()
  const eveningByUser = new Map<string, Reminder[]>()
  for (const u of users as DbUser[]) {
    morningByUser.set(u.id, [])
    eveningByUser.set(u.id, [])
  }

  for (const med of activeMeds) {
    const patient = patientList.find((p) => p.id === med.patient_id)
    if (!patient) continue
    const userId = patient.user_id

    for (let slot = 0; slot < med.times_per_day; slot++) {
      const key = `${med.patient_id}|${med.id}|${slot}`
      if (givenOrOmitted.has(key)) continue

      const slotLabel =
        med.times_per_day > 1 ? ` (${slot + 1}/${med.times_per_day})` : ""
      const item: Reminder = { patientName: patient.name, medicationName: med.name + slotLabel }
      if (isMorningSlot(med.times_per_day, slot)) morningByUser.get(userId)!.push(item)
      if (isEveningSlot(med.times_per_day, slot)) eveningByUser.get(userId)!.push(item)
    }
  }

  const { data: subs, error: subsError } = await supabase
    .from("push_subscriptions")
    .select("user_id, endpoint, p256dh, auth")
  if (subsError) {
    return NextResponse.json(
      { error: "Failed to fetch push subscriptions", detail: subsError?.message },
      { status: 500 }
    )
  }
  const subscriptionList = (subs ?? []) as DbPushSub[]

  const appName = process.env.NEXT_PUBLIC_APP_NAME ?? "Meds App"
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://localhost:3000"
  let sent = 0
  for (const sub of subscriptionList) {
    const morning = morningByUser.get(sub.user_id) ?? []
    const evening = eveningByUser.get(sub.user_id) ?? []
    if (morning.length === 0 && evening.length === 0) continue

    const parts: string[] = []
    if (morning.length > 0) {
      parts.push("Mañana: " + morning.map((r) => `${r.medicationName} — ${r.patientName}`).join(", "))
    }
    if (evening.length > 0) {
      parts.push("Noche: " + evening.map((r) => `${r.medicationName} — ${r.patientName}`).join(", "))
    }
    const body = parts.join(". ")
    const payload = JSON.stringify({
      title: `${appName} — Recordatorio del día`,
      body: body.slice(0, 200) + (body.length > 200 ? "…" : ""),
      url: appUrl,
    })

    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        payload,
        { TTL: 3600 }
      )
      sent++
    } catch (err) {
      console.error("[cron/notify] web-push error for", sub.endpoint.slice(0, 50), err)
    }
  }

  return NextResponse.json({
    ok: true,
    sent,
    today,
  })
}
