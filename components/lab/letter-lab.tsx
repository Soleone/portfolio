"use client"

import { useEffect, useRef, useState } from "react"
import { Play, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Letter } from "@/components/portfolio/letter"

const initial = {
  name: "Ada Lovelace",
  email: "ada@example.com",
  message: "Hello from the lab. Nothing here is actually sent, it just plays the animation.",
}

// Stands in for the mail server so the letter can be sent as often as you like.
const deliver = () => new Promise<{ ok: true }>((resolve) => setTimeout(() => resolve({ ok: true }), 250))

export function LetterLab() {
  // Remounting the letter starts it over; a play also sends it once it is back on the desk.
  const [run, setRun] = useState({ id: 0, send: false })
  const stage = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (run.send) stage.current?.querySelector("form")?.requestSubmit()
  }, [run])

  return (
    <main className="min-h-screen bg-background px-6 py-16 text-foreground">
      <div className="mx-auto max-w-lg">
        <div className="text-xs font-medium tracking-wider text-muted-foreground uppercase">Lab</div>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Letter</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Play folds, stamps and sends a prefilled letter. Nothing is emailed.
        </p>

        <div className="mt-6 flex gap-3">
          <Button onClick={() => setRun({ id: run.id + 1, send: true })}>
            <Play data-icon="inline-start" />
            Play
          </Button>
          <Button variant="outline" onClick={() => setRun({ id: run.id + 1, send: false })}>
            <RotateCcw data-icon="inline-start" />
            Reset
          </Button>
        </div>

        <div ref={stage} className="mt-10">
          <Letter key={run.id} initial={initial} deliver={deliver} />
        </div>
      </div>
    </main>
  )
}
