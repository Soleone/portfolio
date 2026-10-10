// Adapter from showcase's feed.json (written by `showcase collect`) onto the site's Project type.
// Regenerate the feed with `pnpm showcase`; it is committed so builds never need the local checkouts.
import feedJson from "@/public/showcase/feed.json"
import type { Project, ProjectPriority } from "@/lib/portfolio"

export type ShowcaseTier = "D" | "C" | "B" | "A" | "S"

export type FeedProject = {
  id: string
  priority: ProjectPriority | null
  type: string | null
  title: string
  pitch?: string
  kind?: string
  year?: number
  tech?: string[]
  repo?: string
  live?: string
  media?: { hero?: string; motion?: string; video?: string; screenshots?: string[] }
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

export type ProjectMedia = { hero?: string; motion?: string; video?: string }

// All resolved media for a repo, for cards that pick their own still/loop/video.
export function feedMedia(repo: string, { projects: entries }: ShowcaseFeed = feed): ProjectMedia {
  const media = entries.find((entry) => repoKey(entry.repo) === repoKey(repo))?.media
  return { hero: mediaUrl(media?.hero), motion: mediaUrl(media?.motion), video: mediaUrl(media?.video) }
}

export function feedToProject(entry: FeedProject): Project {
  return {
    title: entry.title,
    description: entry.pitch ?? "",
    year: entry.year ? String(entry.year) : "",
    priority: entry.priority ?? "low",
    type: entry.type ?? entry.kind ?? "",
    tech: entry.tech ?? [],
    href: entry.repo ?? entry.live ?? "#",
    image: mediaUrl(entry.media?.motion ?? entry.media?.hero),
    live: entry.live,
  }
}

// Curated projects keep their copy and get media and a live link from the feed (matched by repo).
// Feed projects with a priority that the curated list lacks are appended.
export function withShowcase(projects: Project[], { projects: entries }: ShowcaseFeed = feed): Project[] {
  const byRepo = new Map(entries.filter((entry) => entry.repo).map((entry) => [repoKey(entry.repo), entry]))
  const curated = new Set(projects.map((project) => repoKey(project.href)))
  const enriched = projects.map((project) => {
    const entry = byRepo.get(repoKey(project.href))
    if (!entry) return project
    const { image, live } = feedToProject(entry)
    return { ...project, image: project.image ?? image, live: project.live ?? live }
  })
  const added = entries.filter((entry) => entry.priority && !curated.has(repoKey(entry.repo))).map(feedToProject)
  return [...enriched, ...added]
}
