"use client"

import { createContext, useContext, useState, type ReactNode } from "react"

// Every knob that shapes how a project card feels. Cards read these from context: the site uses the
// defaults, and /lab wraps cards in a TuningProvider with a panel to adjust them live. Springs are { stiffness, damping, mass } so motion can
// hand velocity from one to the next when an interaction interrupts another (hover -> press -> release).
export type Tuning = {
  tiltMax: number // degrees at the card edge
  perspective: number // px; lower is more dramatic
  depth: number // px the top layer floats above the card
  hoverScale: number
  pressScale: number
  glare: number // 0..1
  rim: number // 0..1
  rimWidth: number // px; 0.5 is one device pixel on 2x screens
  followStiffness: number // tilt while the pointer is on the card: snappy
  followDamping: number
  releaseStiffness: number // tilt settling after the pointer leaves: softer, a little wobble
  releaseDamping: number
  pressStiffness: number
  pressDamping: number
  flipStiffness: number
  flipDamping: number
  flipLift: number // extra scale at the middle of a flip
  dealStagger: number // seconds between cards
  dealStiffness: number
  dealDamping: number
  flip: boolean
}

export const defaultTuning: Tuning = {
  tiltMax: 5,
  perspective: 900,
  depth: 36,
  hoverScale: 1.025,
  pressScale: 0.975,
  glare: 0.55,
  rim: 0.7,
  rimWidth: 0.5,
  followStiffness: 320,
  followDamping: 26,
  releaseStiffness: 170,
  releaseDamping: 11,
  pressStiffness: 700,
  pressDamping: 30,
  flipStiffness: 150,
  flipDamping: 16,
  flipLift: 0.08,
  dealStagger: 0.07,
  dealStiffness: 210,
  dealDamping: 19,
  flip: true,
}

type TuningContext = {
  tuning: Tuning
  setTuning: (next: Tuning) => void
}

const Context = createContext<TuningContext>({ tuning: defaultTuning, setTuning: () => {} })

export function TuningProvider({ children }: { children: ReactNode }) {
  const [tuning, setTuning] = useState(defaultTuning)
  return <Context value={{ tuning, setTuning }}>{children}</Context>
}

export const useTuning = () => useContext(Context)
