import { priorityRank, projects, type Project } from "@/lib/portfolio"
import { feedMedia, showcaseRank, withShowcase } from "@/lib/showcase"
import {
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
import { ProjectCard, type CardProject } from "./project-card"
import { SectionHeading } from "./section-heading"

// Only projects the showcase grades A or S are shown. They sort by priority, then tier (S before A), then the registry order (reordered with `showcase manage`), then year.
const orderedProjects = withShowcase(projects)
  .filter((project) => showcaseRank(project) < 2)
  .sort((a, b) => {
    const priority = priorityRank[a.priority] - priorityRank[b.priority]

    if (priority !== 0) return priority

    const showcase = showcaseRank(a) - showcaseRank(b)

    if (showcase !== 0) return showcase

    const order = (a.feedOrder ?? Infinity) - (b.feedOrder ?? Infinity)

    if (order !== 0 && !Number.isNaN(order)) return order

    return Number(b.year) - Number(a.year)
  })

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
  "Better Youtube": CirclePlay,
  Vibestep: Gamepad2,
  GameFAQs: ScrollText,
  SC2Ranks: Gem,
  "Pi Extensions": Wrench,
  "Agentic Workflow": ScrollText,
  Phony: MessageSquare,
}

export function toCardProject(project: Project, index: number): CardProject {
  const Icon = projectIcons[project.title] ?? Wrench
  const media = feedMedia(project.href)

  return {
    title: project.title,
    pitch: project.description,
    details: project.details,
    year: project.year,
    type: project.type,
    stage: project.stage,
    tech: project.tech,
    repo: project.href,
    live: project.live,
    // Curated images stand in when the feed has no capture for the repo.
    media: media.hero || media.motion || media.video ? media : { hero: project.image },
    icon: project.icon,
    glyph: <Icon strokeWidth={1.75} />,
    // The theme decides what color each of the eight tints is.
    tint: (index % 8) + 1,
  }
}

export const cardProjects = orderedProjects.map(toCardProject)

export function Projects() {
  return (
    <section id="work" className="mx-auto max-w-6xl px-6 py-16 md:py-24">
      <SectionHeading label="Selected work" title="Projects" />

      <div className="mt-12 grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
        {cardProjects.map((project, index) => (
          <ProjectCard key={project.title} project={project} index={index} />
        ))}
      </div>
    </section>
  )
}
