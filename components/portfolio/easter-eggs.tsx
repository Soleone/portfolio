"use client"

import { AnimatePresence, motion, useReducedMotion } from "motion/react"
import { useEffect, useRef, useSyncExternalStore } from "react"
import { isInteractiveTarget, useTheme } from "@/components/theme"
import { DEFAULT_THEME } from "@/components/theme/config"
import { revealTheme } from "@/components/theme/picker"

const KONAMI = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"]
const SECRET_THEME = "game-boy"

// When the Game Boy theme was last unlocked, while its hint is up; 0 otherwise. The hint lives in the
// header under the theme picker, so the key listener and the hint share it here.
let hintSince = 0
let hintTimer: ReturnType<typeof setTimeout> | undefined
const hintListeners = new Set<() => void>()
const subscribeHint = (listener: () => void) => {
  hintListeners.add(listener)
  return () => hintListeners.delete(listener)
}
function setHint(since: number) {
  hintSince = since
  hintListeners.forEach((listener) => listener())
}
function showHint() {
  clearTimeout(hintTimer)
  setHint(Date.now())
  hintTimer = setTimeout(() => setHint(0), 5000)
}

// Strict Mode runs effects twice in development; the greeting should still print once.
let greeted = false

export function EasterEggs() {
  const { theme, setTheme } = useTheme()
  const reduced = useReducedMotion() ?? false
  const before = useRef<string | undefined>(undefined)

  useEffect(() => {
    if (greeted) return
    greeted = true
    console.log("%chey, you found the back door", "font: 600 14px system-ui; color: #d4af37")
    console.log("The source is open: https://github.com/Soleone/portfolio\nWhile you're here, try ↑ ↑ ↓ ↓ ← → ← → B A on the page.")
  }, [])

  // The Konami code switches to the Game Boy theme, spreading out from the middle of the screen, and back again.
  useEffect(() => {
    let progress = 0
    function onKeyDown(event: KeyboardEvent) {
      if (event.repeat || isInteractiveTarget(event.target)) return
      const key = event.key.length === 1 ? event.key.toLowerCase() : event.key
      // An extra up at the start keeps the two that count, since that is how people mash it.
      progress = key === KONAMI[progress] ? progress + 1 : key === "ArrowUp" ? Math.min(progress, 2) || 1 : 0
      if (progress < KONAMI.length) return
      progress = 0

      const leaving = theme === SECRET_THEME
      if (!leaving) before.current = theme
      const next = leaving ? (before.current ?? DEFAULT_THEME) : SECRET_THEME
      revealTheme(() => setTheme(next), { x: innerWidth / 2, y: innerHeight / 2 }, reduced)
      if (leaving) setHint(0)
      else showHint()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [theme, setTheme, reduced])

  return null
}

// Sits under the theme picker for five seconds after the Konami code, so the change does not look like a glitch.
export function SecretThemeHint() {
  const since = useSyncExternalStore(subscribeHint, () => hintSince, () => 0)

  return (
    <AnimatePresence>
      {since > 0 && (
        <motion.div
          key={since}
          role="status"
          initial={{ opacity: 0, y: -6, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -6, scale: 0.96 }}
          // Waits for the new theme to finish spreading over the page.
          transition={{ type: "spring", stiffness: 500, damping: 30, delay: 0.35 }}
          className="absolute top-full right-0 mt-3 w-max max-w-64 rounded-lg bg-card px-3 py-2 text-card-foreground shadow-lg ring-1 ring-foreground/10"
        >
          {/* The arrow points up at the picker button. */}
          <span className="absolute -top-1 right-3.5 size-2 rotate-45 bg-card [clip-path:polygon(0_0,100%_0,0_100%)]" />
          <div className="text-xs font-semibold">You unlocked the secret Game Boy theme</div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
