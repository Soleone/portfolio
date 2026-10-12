"use client"

import { motion, useReducedMotion } from "motion/react"
import { useSyncExternalStore } from "react"

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
