"use client"

import { useState } from "react"
import { TuningProvider } from "@/components/portfolio/card-tuning"
import { ProjectCard } from "@/components/portfolio/project-card"
import { cardProjects } from "@/components/portfolio/projects"
import { TuningPanel } from "./tuning-panel"

// One of each media situation: video, animated loop, external still, icon only, nothing.
const samples = ["LogDig", "Vibestep", "Pi Tasks", "GigQuest", "SoulsLike"]
const cards = cardProjects.filter((project) => samples.includes(project.title))

export function CardLab() {
  const [deal, setDeal] = useState(0)

  return (
    <TuningProvider>
      <main className="min-h-screen bg-background px-6 py-16 text-foreground">
        <div className="mx-auto max-w-6xl">
          <div className="text-xs font-medium tracking-wider text-muted-foreground uppercase">Lab</div>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Project cards</h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Hover, press and click the cards. Tune the feel in the panel, then copy the diff. Press D to toggle the theme.
          </p>

          <div key={deal} className="mt-12 grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
            {cards.map((project, index) => (
              <ProjectCard key={project.title} project={project} index={index} />
            ))}
          </div>
        </div>
      </main>
      <TuningPanel onDeal={() => setDeal(deal + 1)} />
    </TuningProvider>
  )
}
