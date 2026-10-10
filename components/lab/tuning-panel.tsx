"use client"

import { useState } from "react"
import { defaultTuning, useTuning, type Tuning } from "@/components/portfolio/card-tuning"

type Knob = { key: keyof Tuning; label: string; min: number; max: number; step: number }

const groups: { title: string; knobs: Knob[] }[] = [
  {
    title: "Shape",
    knobs: [
      { key: "tiltMax", label: "Tilt", min: 0, max: 30, step: 0.5 },
      { key: "perspective", label: "Perspective", min: 300, max: 2400, step: 50 },
      { key: "depth", label: "Depth", min: 0, max: 90, step: 1 },
      { key: "hoverScale", label: "Hover scale", min: 1, max: 1.12, step: 0.005 },
      { key: "pressScale", label: "Press scale", min: 0.85, max: 1, step: 0.005 },
      { key: "glare", label: "Glare", min: 0, max: 1, step: 0.05 },
      { key: "rim", label: "Rim light", min: 0, max: 1, step: 0.05 },
      { key: "rimWidth", label: "Rim width", min: 0.25, max: 2, step: 0.25 },
    ],
  },
  {
    title: "Springs",
    knobs: [
      { key: "followStiffness", label: "Follow stiff", min: 50, max: 1000, step: 10 },
      { key: "followDamping", label: "Follow damp", min: 2, max: 60, step: 1 },
      { key: "releaseStiffness", label: "Release stiff", min: 50, max: 1000, step: 10 },
      { key: "releaseDamping", label: "Release damp", min: 2, max: 60, step: 1 },
      { key: "pressStiffness", label: "Press stiff", min: 100, max: 1500, step: 10 },
      { key: "pressDamping", label: "Press damp", min: 2, max: 60, step: 1 },
      { key: "flipStiffness", label: "Flip stiff", min: 40, max: 600, step: 10 },
      { key: "flipDamping", label: "Flip damp", min: 2, max: 60, step: 1 },
      { key: "flipLift", label: "Flip lift", min: 0, max: 0.25, step: 0.01 },
    ],
  },
  {
    title: "Deal",
    knobs: [
      { key: "dealStagger", label: "Stagger", min: 0, max: 0.3, step: 0.01 },
      { key: "dealStiffness", label: "Stiffness", min: 50, max: 800, step: 10 },
      { key: "dealDamping", label: "Damping", min: 2, max: 60, step: 1 },
    ],
  },
]

export function TuningPanel({ onDeal }: { onDeal: () => void }) {
  const { tuning, setTuning } = useTuning()
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    const changed = Object.fromEntries(
      Object.entries(tuning).filter(([key, value]) => defaultTuning[key as keyof Tuning] !== value),
    )
    await navigator.clipboard.writeText(JSON.stringify(changed, null, 2))
    setCopied(true)
    setTimeout(() => setCopied(false), 1200)
  }

  return (
    <aside className="fixed right-4 bottom-4 z-50 w-72 max-w-[calc(100vw-2rem)] rounded-xl border bg-popover/90 text-popover-foreground shadow-2xl backdrop-blur-md">
      <div className="flex items-center gap-2 border-b px-3 py-2">
        <button className="text-sm font-semibold" onClick={() => setOpen(!open)}>
          Tuning {open ? "−" : "+"}
        </button>
        <div className="ml-auto flex gap-1.5 text-xs">
          <button className="rounded-md bg-secondary px-2 py-1" onClick={onDeal}>
            Deal
          </button>
          <button className="rounded-md bg-secondary px-2 py-1" onClick={() => setTuning(defaultTuning)}>
            Reset
          </button>
          <button className="rounded-md bg-primary px-2 py-1 text-primary-foreground" onClick={copy}>
            {copied ? "Copied" : "Copy diff"}
          </button>
        </div>
      </div>
      {open && (
        <div className="max-h-[70vh] space-y-4 overflow-y-auto p-3">
          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={tuning.flip}
              onChange={(event) => setTuning({ ...tuning, flip: event.target.checked })}
            />
            Flip on click
          </label>
          {groups.map((group) => (
            <div key={group.title} className="space-y-1.5">
              <div className="text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
                {group.title}
              </div>
              {group.knobs.map((knob) => (
                <label key={knob.key} className="grid grid-cols-[6.5rem_1fr_2.75rem] items-center gap-2 text-xs">
                  <span>{knob.label}</span>
                  <input
                    type="range"
                    min={knob.min}
                    max={knob.max}
                    step={knob.step}
                    value={tuning[knob.key] as number}
                    onChange={(event) => setTuning({ ...tuning, [knob.key]: Number(event.target.value) })}
                    className="accent-primary"
                  />
                  <span className="text-right tabular-nums text-muted-foreground">{tuning[knob.key] as number}</span>
                </label>
              ))}
            </div>
          ))}
        </div>
      )}
    </aside>
  )
}
