"use client"

import { ArrowUpRight, Play } from "lucide-react"
import { useRef, type ReactNode } from "react"
import { FlipCard, FlipCardLayer, FlipCardTurn } from "@/components/soleone/flip-card"
import type { ProjectMedia } from "@/lib/showcase"
import { CoinLink } from "./coins"
import { GithubIcon } from "./github-icon"

export type CardProject = {
  title: string
  pitch: string
  details?: string // the back's longer copy; the front already shows the pitch
  year: string
  type: string
  stage?: string | null
  tech: string[]
  repo: string
  live?: string
  media: ProjectMedia
  icon?: string
  colors?: string[] // brand colors, primary first: the first tints the card, the second shades it
  glyph: ReactNode // a rendered icon, so server components can pass it
  tint: number // 1..8, which --tint-* token colors this card
}

// Stage colors are fixed across themes: green is shipped, yellow is a proof of concept, red is the least finished.
const stagePills: Record<string, string> = {
  product: "bg-emerald-500/15 text-emerald-700 ring-emerald-500/30 dark:text-emerald-300",
  "proof of concept": "bg-amber-400/20 text-amber-800 ring-amber-500/30 dark:text-amber-300",
  prototype: "bg-red-500/15 text-red-700 ring-red-500/30 dark:text-red-300",
}

export function ProjectCard({ project, index }: { project: CardProject; index: number }) {
  const videoRef = useRef<HTMLVideoElement>(null)

  return (
    <FlipCard
      index={index}
      // A project's own brand colors win over the theme's tint for its card.
      tint={project.colors?.[0] ?? `var(--tint-${project.tint})`}
      tintEnd={project.colors?.[1]}
      onHoverChange={(hovered) => {
        if (hovered) videoRef.current?.play().catch(() => {})
        else videoRef.current?.pause()
      }}
      front={
        <>
          <FlipCardLayer depth={0.3} className="relative p-1.5">
            <div className="relative aspect-[16/10] overflow-hidden rounded-[calc(var(--radius-3xl)-0.375rem)] bg-black/80 shadow-well ring-1 ring-black/10">
              <Media project={project} videoRef={videoRef} />
              <div className="pointer-events-none absolute inset-0 rounded-[calc(var(--radius-3xl)-0.375rem)] shadow-well-bezel" />
            </div>
          </FlipCardLayer>

          {/* Fixed-height slots keep every card the same size whatever the copy: one-line title, three-line pitch. */}
          <FlipCardLayer depth={0.55} className="px-5 pt-2 pb-4">
            <div className="flex items-center gap-2 text-2xs font-medium tracking-wider text-muted-foreground uppercase">
              <span>{project.type}</span>
              <span className="size-1 rounded-full bg-current opacity-40" />
              <span className="tabular-nums">{project.year}</span>
              {project.stage && (
                <span
                  className={`ml-auto rounded-full px-2 py-0.5 text-3xs font-semibold tracking-wide ring-1 normal-case ${stagePills[project.stage] ?? "bg-foreground/[0.06] ring-foreground/10"}`}
                >
                  {project.stage}
                </span>
              )}
            </div>
            <div className="mt-1.5 flex items-center gap-2">
              {project.icon && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={project.icon} alt="" draggable={false} className="size-6 shrink-0 rounded-md object-contain" />
              )}
              <h3 className="truncate text-xl font-semibold tracking-tight">{project.title}</h3>
            </div>
            <p className="mt-1.5 line-clamp-3 h-[4.875em] text-sm leading-relaxed text-pretty text-muted-foreground">
              {project.pitch}
            </p>
          </FlipCardLayer>

          <FlipCardLayer depth={1} className="flex items-center gap-2 pr-1.5 pb-3.5 pl-5">
            {project.live && (
              <a
                href={project.live}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-1.5 text-sm font-medium text-primary-foreground shadow-glow transition-transform active:scale-95"
              >
                <Play className="size-3.5 fill-current" />
                Try it
              </a>
            )}
            <CoinLink
              href={project.repo}
              aria-label={`${project.title} source code`}
              className="grid size-8 place-items-center rounded-full bg-foreground/[0.06] transition-colors hover:bg-foreground/10"
            >
              <GithubIcon className="size-4" />
            </CoinLink>
            <FlipCardTurn aria-label="Show details" />
          </FlipCardLayer>
        </>
      }
      back={
        <>
          <FlipCardLayer depth={0.55} className="flex flex-1 flex-col px-5 py-6">
            <div className="flex items-center gap-3">
              <div className="grid size-11 place-items-center rounded-xl bg-foreground/[0.06]">
                {project.icon ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={project.icon} alt="" draggable={false} className="size-7 rounded-md object-contain" />
                ) : (
                  <span className="[&_svg]:size-5">{project.glyph}</span>
                )}
              </div>
              <div>
                <h3 className="text-lg leading-tight font-semibold tracking-tight">{project.title}</h3>
                <div className="text-xs text-muted-foreground">
                  {project.type} · {project.year}
                </div>
              </div>
            </div>
            {project.details && (
              <p className="mt-5 line-clamp-6 text-sm leading-relaxed text-pretty">{project.details}</p>
            )}
            <div className="mt-5 text-2xs font-medium tracking-wider text-muted-foreground uppercase">Built with</div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {project.tech.map((tag) => (
                <span key={tag} className="rounded-full bg-foreground/[0.06] px-2 py-0.5 text-xs font-medium">
                  {tag}
                </span>
              ))}
            </div>
          </FlipCardLayer>
          <FlipCardLayer depth={1} className="flex items-center gap-2 pr-1.5 pb-3.5 pl-5">
            <a
              href={project.repo}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 rounded-full bg-foreground px-3.5 py-1.5 text-sm font-medium text-background"
            >
              Source <ArrowUpRight className="size-3.5" />
            </a>
            {project.live && (
              <a
                href={project.live}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-full bg-primary px-3.5 py-1.5 text-sm font-medium text-primary-foreground"
              >
                Live <ArrowUpRight className="size-3.5" />
              </a>
            )}
            <FlipCardTurn aria-label="Show front" />
          </FlipCardLayer>
        </>
      }
    />
  )
}

// Media is fixed to the card like a printed photo: it tilts with the card and never slides in its frame.
function Media({
  project,
  videoRef,
}: {
  project: CardProject
  videoRef: React.RefObject<HTMLVideoElement | null>
}) {
  const { media } = project
  const fill = "absolute inset-0 size-full object-cover object-left-top"

  if (media.video)
    return (
      <video
        ref={videoRef}
        src={media.video}
        poster={media.hero}
        muted
        loop
        playsInline
        preload="metadata"
        className={fill}
      />
    )

  const still = media.motion ?? media.hero
  // eslint-disable-next-line @next/next/no-img-element
  if (still) return <img src={still} alt="" draggable={false} className={fill} />

  // No capture yet: a typographic cover that still looks deliberate.
  return (
    <div
      className="absolute inset-0 grid place-items-center"
      style={{
        background:
          "radial-gradient(120% 90% at 20% 10%, var(--tint) 0%, color-mix(in oklch, var(--tint), black 40%) 55%, color-mix(in oklch, var(--tint) 33%, black) 100%)",
      }}
    >
      <div className="absolute inset-0 opacity-25 [background-image:linear-gradient(rgb(255_255_255/0.25)_1px,transparent_1px),linear-gradient(90deg,rgb(255_255_255/0.25)_1px,transparent_1px)] [background-size:22px_22px] [mask-image:radial-gradient(circle_at_50%_40%,black,transparent_75%)]" />
      <div className="relative flex flex-col items-center gap-3">
        <div className="grid size-16 place-items-center rounded-2xl border border-white/25 bg-white/20 shadow-xl">
          {project.icon ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={project.icon} alt="" className="max-h-10 max-w-10 object-contain" />
          ) : (
            <span className="text-white [&_svg]:size-8">{project.glyph}</span>
          )}
        </div>
        <div className="text-2xl font-bold tracking-tight text-white/95 drop-shadow">{project.title}</div>
      </div>
    </div>
  )
}
