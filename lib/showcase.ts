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

// Only projects the showcase grades S or A are listed (rank 0 and 1). S comes first, then A.
export function showcaseRank(project: Pick<Project, "showcaseTier">): number {
  if (project.showcaseTier === "S") return 0
  if (project.showcaseTier === "A") return 1
  return 2
}

export function feedToProject(entry: FeedProject): Project {
  return {
    showcaseTier: entry.tier,
    title: entry.title,
    description: entry.pitch ?? "",
    details: entry.description,
    year: entry.year ? String(entry.year) : "",
    priority: entry.priority ?? "low",
    type: entry.stage ?? entry.kind ?? "",
    tech: entry.tech ?? [],
    href: entry.repo ?? entry.live ?? "#",
    image: mediaUrl(entry.media?.motion ?? entry.media?.hero),
    live: entry.live,
  }
}

// Curated projects keep their copy and get media and a live link from the feed (matched by repo), unless the
// project's own showcase.json supplies the copy.
// Feed projects with a priority that the curated list lacks are appended.
export function withShowcase(projects: Project[], { projects: entries }: ShowcaseFeed = feed): Project[] {
  const byRepo = new Map(entries.filter((entry) => entry.repo).map((entry) => [repoKey(entry.repo), entry]))
  const curated = new Set(projects.map((project) => repoKey(project.href)))
  const enriched = projects.map((project) => {
    const entry = byRepo.get(repoKey(project.href))
    if (!entry) return project
    const { image, live, description, details } = feedToProject(entry)
    // A project with its own showcase.json has written its pitch and description for the card, so those win over curated copy.
    const own = entry.source === "showcase.json"
    return {
      ...project,
      description: own ? description : project.description,
      details: own ? details : (project.details ?? details),
      image: project.image ?? image,
      live: project.live ?? live,
      showcaseTier: entry.tier,
    }
  })
  const added = entries.filter((entry) => entry.priority && !curated.has(repoKey(entry.repo))).map(feedToProject)
  return [...enriched, ...added]
}
