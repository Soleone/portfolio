"use client"

import { animate, motion, useMotionValue, useReducedMotion, useTransform } from "motion/react"
import { useSyncExternalStore, type MouseEvent, type ReactNode } from "react"

// Coins are the GitHub links visitors click on the project cards. The count lives in memory, so it lasts one visit.
let coins = 0
const listeners = new Set<() => void>()
const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function collectCoin() {
  coins += 1
  listeners.forEach((listener) => listener())
}

// A Mario-style HUD in the header: hidden until the first coin, then it pops in and the coin spins on each new one.
export function CoinCounter() {
  const count = useSyncExternalStore(subscribe, () => coins, () => 0)
  const reduced = useReducedMotion() ?? false
  if (count === 0) return null

  return (
    <motion.div
      initial={reduced ? false : { scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: "spring", stiffness: 500, damping: 18 }}
      title={`${count} ${count === 1 ? "project" : "projects"} checked out`}
      className="flex items-center gap-1 text-sm font-semibold tabular-nums"
    >
      <motion.span
        key={count}
        aria-hidden
        animate={reduced ? undefined : { scaleX: [1, -1, 1] }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="grid size-3.5 place-items-center rounded-full bg-coin ring-1 ring-coin-edge/50 ring-inset"
      >
        <span className="h-1.5 w-0.5 rounded-full bg-coin-edge/60" />
      </motion.span>
      <span className="sr-only">Projects checked out:</span>×{count}
    </motion.div>
  )
}

// A link that collects a coin when it is clicked: the whole link hops up while spinning once. The spin is a squash
// on X, not a rotateY, so a 3D card's backface-hidden layers never blank it out halfway through a turn.
export function CoinLink({
  href,
  className,
  children,
  "aria-label": label,
}: {
  href: string
  className?: string
  children: ReactNode
  "aria-label"?: string
}) {
  const reduced = useReducedMotion() ?? false
  const spin = useMotionValue(0)
  const y = useMotionValue(0)
  const scaleX = useTransform(spin, (deg) => Math.cos((deg * Math.PI) / 180))

  const collect = (event: MouseEvent<HTMLAnchorElement>) => {
    collectCoin()
    if (reduced) return
    spin.set(0)
    animate(spin, 360, { duration: 0.45, ease: "easeOut" })
    animate(y, [0, -12, 0], { duration: 0.45, times: [0, 0.4, 1], ease: ["easeOut", "easeIn"] })
    // The new tab takes focus at once and would hide the coin, so a plain click opens it once the coin lands.
    // Modified clicks open a background tab anyway and keep their native behavior.
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    const target = event.currentTarget.href
    setTimeout(() => window.open(target, "_blank", "noreferrer"), 450)
  }

  return (
    <motion.a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label={label}
      onClick={collect}
      style={{ scaleX, y }}
      className={className}
    >
      {children}
    </motion.a>
  )
}
