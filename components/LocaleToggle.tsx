"use client"

import { useI18n } from "@/lib/i18n/I18nProvider"
import { Button } from "@/components/ui/button"

export function LocaleToggle() {
  const { locale, setLocale } = useI18n()
  return (
    <div className="flex rounded-lg border border-border bg-muted/30 p-0.5">
      <Button
        variant={locale === "es" ? "outline" : "ghost"}
        size="sm"
        className="h-8 px-2 text-xs"
        onClick={() => setLocale("es")}
      >
        ES
      </Button>
      <Button
        variant={locale === "en" ? "outline" : "ghost"}
        size="sm"
        className="h-8 px-2 text-xs"
        onClick={() => setLocale("en")}
      >
        EN
      </Button>
    </div>
  )
}
