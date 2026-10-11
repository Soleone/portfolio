"use client"

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useTheme } from "@/components/theme-provider"
import type { ThemeMode, ThemeOption } from "@/lib/themes/palette"

const groups: { mode: ThemeMode; label: string }[] = [
  { mode: "dark", label: "Dark" },
  { mode: "light", label: "Light" },
  { mode: "system", label: "Follows system" },
]

// Page canvas on one side, accent on the other: enough to see what a theme will do before choosing it.
function Swatch({ theme }: { theme: ThemeOption }) {
  return (
    <span
      aria-hidden
      className="size-4 shrink-0 rounded-full ring-1 ring-foreground/20"
      style={{ background: `linear-gradient(135deg, ${theme.canvas} 50%, ${theme.accent} 50%)` }}
    />
  )
}

export function ThemePicker() {
  const { theme, themes, setTheme } = useTheme()
  const active = themes.find((candidate) => candidate.name === theme)

  return (
    <Select value={theme ?? null} onValueChange={(name) => name && setTheme(name)}>
      <SelectTrigger size="sm" aria-label="Theme" className="dark:bg-transparent">
        <SelectValue>
          {active && (
            <>
              <Swatch theme={active} />
              <span className="hidden sm:inline">{active.label}</span>
            </>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent align="end" alignItemWithTrigger={false} className="min-w-48">
        {groups.map(({ mode, label }) => {
          const inGroup = themes.filter((candidate) => candidate.mode === mode)
          if (inGroup.length === 0) return null
          return (
            <SelectGroup key={mode}>
              <SelectLabel>{label}</SelectLabel>
              {inGroup.map((candidate) => (
                <SelectItem key={candidate.name} value={candidate.name} label={candidate.label}>
                  <Swatch theme={candidate} />
                  {candidate.label}
                </SelectItem>
              ))}
            </SelectGroup>
          )
        })}
      </SelectContent>
    </Select>
  )
}
