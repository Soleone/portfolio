import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { priorityRank, projects } from "@/lib/portfolio"
import {
  ArrowUpRight,
  Bot,
  BrainCircuit,
  Gamepad2,
  Gem,
  MessageSquare,
  Mic2,
  Puzzle,
  ScrollText,
  Wrench,
  CirclePlay,
  type LucideIcon,
} from "lucide-react"
import { SectionHeading } from "./section-heading"

const orderedProjects = [...projects].sort((a, b) => {
  const priority = priorityRank[a.priority] - priorityRank[b.priority]

  if (priority !== 0) return priority

  return Number(b.year) - Number(a.year)
})

const cardThemes = [
  "from-fuchsia-500/30 via-rose-500/15 to-amber-400/25",
  "from-sky-500/30 via-cyan-400/15 to-emerald-400/25",
  "from-violet-500/30 via-indigo-400/15 to-sky-400/25",
  "from-orange-500/30 via-red-400/15 to-fuchsia-400/25",
]

const projectIcons: Record<string, LucideIcon> = {
  "Pi Tasks": Wrench,
  GigQuest: Gamepad2,
  Topdeck: Mic2,
  Pixelpics: Puzzle,
  SoulsLike: Gamepad2,
  "YouTube Playlist Downloader": CirclePlay,
  "Agent Memory": BrainCircuit,
  "Agent Coach": Bot,
  "Pi Multiplayer": Bot,
  Gunchained: Gem,
  "Better YouTube": CirclePlay,
  GameFAQs: ScrollText,
  SC2Ranks: Gem,
  "Pi Extensions": Wrench,
  "Agentic Workflow": ScrollText,
  Phony: MessageSquare,
}

export function Projects() {
  return (
    <section id="work" className="mx-auto max-w-6xl px-6 py-16 md:py-24">
      <SectionHeading label="Selected work" title="Projects" />

      <div className="mt-10 grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        {orderedProjects.map((project, index) => {
          const isHero = index === 0
          const theme = cardThemes[index % cardThemes.length]
          const Icon = projectIcons[project.title] ?? Wrench

          return (
            <Card
              key={project.title}
              className={`group relative overflow-hidden bg-card/80 p-0 shadow-sm transition-all duration-300 [transform-style:preserve-3d] hover:-translate-y-1 hover:border-primary/40 hover:shadow-2xl hover:shadow-primary/10 ${
                isHero ? "lg:row-span-2" : ""
              }`}
            >
              <a href={project.href} className="block h-full" target="_blank" rel="noreferrer">
                <div
                  className={`relative min-h-44 overflow-hidden border-b border-border bg-gradient-to-br ${theme} ${
                    isHero ? "lg:min-h-80" : ""
                  }`}
                >
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,white_0,transparent_26%),linear-gradient(135deg,transparent_0,transparent_45%,rgb(255_255_255/0.18)_45%,transparent_46%)] opacity-50" />
                  <div className="absolute -right-12 -top-12 size-44 rounded-full bg-background/40 blur-2xl transition-transform duration-500 group-hover:scale-125" />
                  <div className="absolute bottom-5 left-5 right-5 flex items-end justify-between gap-6">
                    <div className="grid size-20 place-items-center overflow-hidden rounded-2xl border border-white/20 bg-background/70 p-3 shadow-xl backdrop-blur md:size-24">
                      {project.icon ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={project.icon}
                          alt=""
                          className="max-h-full max-w-full object-contain"
                          aria-hidden
                        />
                      ) : (
                        <Icon className="size-9 text-primary md:size-11" strokeWidth={1.75} />
                      )}
                    </div>
                    <span className="rounded-full border border-white/20 bg-background/70 px-3 py-1 text-sm text-muted-foreground backdrop-blur">
                      {project.year}
                    </span>
                  </div>
                </div>

                <CardContent className={isHero ? "p-6 md:p-8" : "p-5"}>
                  <div className="flex items-start justify-between gap-4">
                    <h3 className="flex items-center gap-1.5 text-xl font-semibold tracking-tight">
                      {project.title}
                      <ArrowUpRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </h3>
                    <span className="shrink-0 rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground">
                      {index + 1}
                    </span>
                  </div>
                  <p className="mt-3 text-pretty leading-relaxed text-muted-foreground">
                    {project.description}
                  </p>
                  <div className="mt-5 flex flex-wrap gap-2">
                    <Badge className="bg-primary/10 text-primary hover:bg-primary/15">
                      {project.type}
                    </Badge>
                    {project.tech.map((tag) => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </a>
            </Card>
          )
        })}
      </div>
    </section>
  )
}
