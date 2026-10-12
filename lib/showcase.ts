// Adapter from showcase's feed.json (written by `showcase collect`) onto the site's Project type.
// Regenerate the feed with `pnpm showcase`; it is committed so builds never need the local checkouts.
import feedJson from "@/public/showcase/feed.json"
import type { Project, ProjectPriority } from "@/lib/portfolio"

export type ShowcaseTier = "D" | "C" | "B" | "A" | "S"

export type FeedProject = {
  id: string
  priority: ProjectPriority | null
  stage: string | null
  title: string
  pitch?: string
  description?: string
  kind?: string
  year?: number
  tech?: string[]
  repo?: string
  live?: string
  media?: { hero?: string; motion?: string; video?: string; screenshots?: string[] }
  brand?: { icon?: string; logo?: string; wordmark?: string; colors?: string[] }
  tier: ShowcaseTier | null
  target: ShowcaseTier | null
  gap: string[]
  source: "showcase.json" | "draft" | null
}

export type ShowcaseFeed = { projects: FeedProject[] }

const feed = feedJson as ShowcaseFeed

// Feed media paths are relative to the feed folder; URLs pass through.
const mediaUrl = (src?: string) => (!src ? undefined : /^https?:\/\//.test(src) ? src : `/showcase/${src}`)
const repoKey = (url?: string) => url?.toLowerCase().replace(/\.git$/, "").replace(/\/$/, "")

// Card labels for showcase's kinds (what visitors get). "other" has no useful label, so the curated type stays.
const kindLabels: Partial<Record<string, string>> = {
  "web-app": "Web app",
  "local-web-app": "Local web app",
  cli: "CLI utility",
  library: "Library",
  "browser-extension": "Browser extension",
  "desktop-app": "Desktop app",
  "agent-extension": "Agent extension",
  game: "Game",
  service: "Service",
}

function kindLabel(kind?: string | null): string | undefined {
  return kind ? kindLabels[kind] : undefined
}

export type ProjectMedia = { hero?: string; motion?: string; video?: string }

// All resolved media for a repo, for cards that pick their own still/loop/video.
export function feedMedia(repo: string, { projects: entries }: ShowcaseFeed = feed): ProjectMedia {
  const media = entries.find((entry) => repoKey(entry.repo) === repoKey(repo))?.media
  return { hero: mediaUrl(media?.hero), motion: mediaUrl(media?.motion), video: mediaUrl(media?.video) }
}

// Only projects the showcase grades S or A are listed (rank 0 and 1). S comes first, then A.
export function showcaseRank(project: Pick<Project, "showcaseTier">): number {
  if (project.showcaseTier === "S") return 0
  if (project.showcaseTier === "A") return 1
  return 2
}

export function feedToProject(entry: FeedProject, feedOrder?: number): Project {
  return {
    feedOrder,
    showcaseTier: entry.tier,
    title: entry.title,
    description: entry.pitch ?? "",
    details: entry.description,
    year: entry.year ? String(entry.year) : "",
    priority: entry.priority ?? "low",
    type: kindLabel(entry.kind) ?? "",
    stage: entry.stage,
    tech: entry.tech ?? [],
    href: entry.repo ?? entry.live ?? "#",
    image: mediaUrl(entry.media?.motion ?? entry.media?.hero),
    icon: mediaUrl(entry.brand?.icon),
    colors: entry.brand?.colors,
    live: entry.live,
  }
}

// Curated projects keep their copy and get media and a live link from the feed (matched by repo), unless the
// project's own showcase.json supplies the copy and the kind label. A priority set in the portfolio registry wins over the curated one.
// Feed projects with a priority that the curated list lacks are appended.
export function withShowcase(projects: Project[], { projects: entries }: ShowcaseFeed = feed): Project[] {
  const byRepo = new Map(entries.filter((entry) => entry.repo).map((entry) => [repoKey(entry.repo), entry]))
  const curated = new Set(projects.map((project) => repoKey(project.href)))
  const enriched = projects.map((project) => {
    const entry = byRepo.get(repoKey(project.href))
    if (!entry) return project
    const { image, live, icon, colors, title, description, details, type: label } = feedToProject(entry)
    // A project with its own showcase.json has written its title, pitch, description and kind for the card, so those win over curated copy.
    // A draft's kind is only a guess, so drafts keep the curated type.
    const own = entry.source === "showcase.json"
    return {
      ...project,
      title: own ? title : project.title,
      description: own ? description : project.description,
      details: own ? details : (project.details ?? details),
      type: own && label ? label : project.type,
      stage: entry.stage ?? project.stage,
      image: project.image ?? image,
      icon: project.icon ?? icon,
      colors: colors ?? project.colors,
      live: project.live ?? live,
      priority: entry.priority ?? project.priority,
      showcaseTier: entry.tier,
      feedOrder: entries.indexOf(entry),
    }
  })
  const added = entries
    .map((entry, index) => ({ entry, index }))
    .filter(({ entry }) => entry.priority && !curated.has(repoKey(entry.repo)))
    .map(({ entry, index }) => feedToProject(entry, index))
  return [...enriched, ...added]
}
