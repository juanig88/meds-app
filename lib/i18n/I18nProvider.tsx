"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react"
import { translations, type Locale } from "./translations"

const STORAGE_KEY = "meds-locale"

function getStoredLocale(): Locale {
  if (typeof window === "undefined") return "es"
  const stored = window.localStorage.getItem(STORAGE_KEY)
  if (stored === "es" || stored === "en") return stored
  return "es"
}

type TParams = Record<string, string | number>

type I18nContextValue = {
  locale: Locale
  setLocale: (l: Locale) => void
  t: (key: string, params?: TParams) => string
}

const I18nContext = createContext<I18nContextValue | null>(null)

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() =>
    typeof window === "undefined" ? "es" : getStoredLocale()
  )

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l)
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, l)
      document.documentElement.lang = l === "es" ? "es" : "en"
    }
  }, [])

  useEffect(() => {
    document.documentElement.lang = locale === "es" ? "es" : "en"
  }, [locale])

  const t = useCallback(
    (key: string, params?: TParams): string => {
      const dict = translations[locale]
      let s = dict[key] ?? translations.es[key] ?? key
      if (params) {
        for (const [k, v] of Object.entries(params)) {
          s = s.replace(new RegExp(`\\{${k}\\}`, "g"), String(v))
        }
      }
      return s
    },
    [locale]
  )

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n() {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error("useI18n must be used within I18nProvider")
  return ctx
}
