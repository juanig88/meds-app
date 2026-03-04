"use client"

import { Button } from "@/components/ui/button"
import { Moon, Sun, Monitor } from "lucide-react"
import { useTheme } from "@/lib/theme/ThemeProvider"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const cycle = () => {
    if (theme === "system") setTheme("dark")
    else if (theme === "dark") setTheme("light")
    else setTheme("system")
  }
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="h-9 w-9"
      onClick={cycle}
      title={
        theme === "system"
          ? "Tema: sistema"
          : theme === "dark"
            ? "Tema: oscuro"
            : "Tema: claro"
      }
    >
      {theme === "system" ? (
        <Monitor className="h-4 w-4" />
      ) : theme === "dark" ? (
        <Moon className="h-4 w-4" />
      ) : (
        <Sun className="h-4 w-4" />
      )}
      <span className="sr-only">Cambiar tema</span>
    </Button>
  )
}
