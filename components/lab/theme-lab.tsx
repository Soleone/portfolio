"use client"

import { ProjectCard } from "@/components/portfolio/project-card"
import { cardProjects } from "@/components/portfolio/projects"
import { ThemePicker, ThemePreviewCard, useTheme } from "@/components/theme"

// A few real cards behind the picker, so trying a theme on shows what it does to the site.
const samples = ["LogDig", "Vibestep", "Pi Tasks"]
const cards = cardProjects.filter((project) => samples.includes(project.title))

export function ThemeLab() {
  const { themes } = useTheme()

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <span className="text-sm font-semibold tracking-tight">Theme lab</span>
          <ThemePicker />
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-16">
        <div className="text-xs font-medium tracking-wider text-muted-foreground uppercase">Lab</div>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Theme picker</h1>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground">
          Open the palette button or press T. Drag, fling, scroll or use the arrows; type to filter. Click the front
          card or press Enter to choose it and watch it spread over the page; click a side card to bring it forward.
        </p>

        <div className="mt-12 grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((project, index) => (
            <ProjectCard key={project.title} project={project} index={index} />
          ))}
        </div>

        <h2 className="mt-20 text-xl font-semibold tracking-tight">Every preview card</h2>
        <p className="mt-1 text-sm text-muted-foreground">Each one draws in its own theme, whatever the page is in.</p>
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {themes.map((theme) => (
            <ThemePreviewCard key={theme.name} theme={theme} className="h-60" />
          ))}
        </div>
      </div>
    </main>
  )
}
