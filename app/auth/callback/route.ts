import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
const LOG_PREFIX = "[auth/callback]"

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const next = searchParams.get("next") ?? "/"

  if (!code) {
    console.error(LOG_PREFIX, "Falta code en la URL (redirect_uri puede no coincidir con Google Console)")
    return NextResponse.redirect(`${origin}/?error=auth`)
  }

  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    console.error(LOG_PREFIX, "Faltan GOOGLE_CLIENT_ID o GOOGLE_CLIENT_SECRET en .env.local")
    return NextResponse.redirect(`${origin}/?error=config`)
  }

  const redirectUri = `${origin}/auth/callback`

  const body = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
  })

  const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  })

  const data = (await tokenRes.json()) as { id_token?: string; error?: string; error_description?: string }
  if (!tokenRes.ok) {
    console.error(LOG_PREFIX, "Google token error:", tokenRes.status, data.error ?? data, data.error_description ?? "")
    return NextResponse.redirect(`${origin}/?error=auth`)
  }

  const idToken = data.id_token
  if (!idToken) {
    console.error(LOG_PREFIX, "Google no devolvió id_token. Keys:", Object.keys(data))
    return NextResponse.redirect(`${origin}/?error=auth`)
  }

  const supabase = await createClient()
  const maxAttempts = 2

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const { error } = await supabase.auth.signInWithIdToken({
        provider: "google",
        token: idToken,
      })
      if (error) {
        console.error(LOG_PREFIX, "Supabase signInWithIdToken:", error.message, error.status ?? "")
        return NextResponse.redirect(`${origin}/?error=auth`)
      }
      console.log(LOG_PREFIX, "OK, redirigiendo a", next)
      return NextResponse.redirect(`${origin}${next}`)
    } catch (err) {
      const cause = err instanceof Error && "cause" in err ? (err as Error & { cause?: Error }).cause : null
      const code = cause instanceof Error && "code" in cause ? (cause as NodeJS.ErrnoException).code : null
      console.error(LOG_PREFIX, "Supabase conexión fallida (intento", attempt, "):", (err as Error).message, code ?? cause)
      if (attempt === maxAttempts) {
        console.error(
          LOG_PREFIX,
          "ECONNRESET/red: comprobá que el proyecto Supabase no esté pausado (Dashboard), que NEXT_PUBLIC_SUPABASE_URL sea correcto y que no haya firewall/proxy bloqueando."
        )
        return NextResponse.redirect(`${origin}/?error=auth`)
      }
      await new Promise((r) => setTimeout(r, 800))
    }
  }

  return NextResponse.redirect(`${origin}/?error=auth`)
}
