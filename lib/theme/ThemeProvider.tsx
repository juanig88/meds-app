"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react"

const STORAGE_KEY = "meds-theme"
type Theme = "light" | "dark" | "system"

function getStoredTheme(): Theme {
  if (typeof window === "undefined") return "system"
  const stored = window.localStorage.getItem(STORAGE_KEY)
  if (stored === "light" || stored === "dark" || stored === "system") return stored
  return "system"
}

function getEffectiveDark(theme: Theme): boolean {
  if (theme === "light") return false
  if (theme === "dark") return true
  return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches
}

type ThemeContextValue = {
  theme: Theme
  setTheme: (t: Theme) => void
  resolvedDark: boolean
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() =>
    typeof window === "undefined" ? "system" : getStoredTheme()
  )
  const [resolvedDark, setResolvedDark] = useState(false)

  useEffect(() => {
    const root = document.documentElement
    const dark = getEffectiveDark(theme)
    setResolvedDark(dark)
    if (dark) root.classList.add("dark")
    else root.classList.remove("dark")
  }, [theme])

  useEffect(() => {
    if (theme !== "system") return
    const mq = window.matchMedia("(prefers-color-scheme: dark)")
    const handler = () => setResolvedDark(mq.matches)
    mq.addEventListener("change", handler)
    return () => mq.removeEventListener("change", handler)
  }, [theme])

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t)
    if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, t)
  }, [])

  const value: ThemeContextValue = { theme, setTheme, resolvedDark }

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider")
  return ctx
}
