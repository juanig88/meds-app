import { NextResponse } from "next/server"

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"

export async function GET(request: Request) {
  const clientId = process.env.GOOGLE_CLIENT_ID
  if (!clientId) {
    return NextResponse.redirect(new URL("/?error=config", request.url))
  }

  const { origin } = new URL(request.url)
  const redirectUri = `${origin}/auth/callback`

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
  })

  const url = `${GOOGLE_AUTH_URL}?${params.toString()}`
  return NextResponse.redirect(url)
}
