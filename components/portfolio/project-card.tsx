"use client"

import {
  animate,
  motion,
  useMotionValue,
  useInView,
  useReducedMotion,
  useTransform,
  type MotionValue,
} from "motion/react"
import { ArrowUpRight, Play, RotateCcw } from "lucide-react"
import { useRef, useState, type CSSProperties, type PointerEvent, type ReactNode } from "react"
import type { ProjectMedia } from "@/lib/showcase"
import { useTuning } from "./card-tuning"
import { GithubIcon } from "./github-icon"
import { springEasing } from "./spring-easing"

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

const spring = (stiffness: number, damping: number) => ({ type: "spring" as const, stiffness, damping })
const easeOutQuint = [0.22, 1, 0.36, 1] as const

// Deterministic so server and client agree; a dealt hand never lands perfectly square.
const dealAngle = (index: number) => ((index * 37) % 17) - 8

// The drop shadow is a gradient, not a blurred element: a CSS blur filter renders a full-size offscreen
// surface every frame, and a box-shadow leaves a hole under the card. This falls off like the blur it replaced.
const softShadow =
  "radial-gradient(closest-side, rgb(0 0 0 / 1) 0%, rgb(0 0 0 / 1) 40%, rgb(0 0 0 / 0.5) 71%, rgb(0 0 0 / 0.2) 88%, transparent 100%)"

// SVG grain makes the surface read as a material instead of a flat fill.
export const grain =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.55'/%3E%3C/svg%3E\")"

export function ProjectCard({ project, index }: { project: CardProject; index: number }) {
  const { tuning: t } = useTuning()
  const reduced = useReducedMotion() ?? false
  const dealRef = useRef<HTMLDivElement>(null)
  const hitRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const pressed = useRef(false)
  const hovered = useRef(false)
  // A touch has no hover: a sideways drag tilts the card instead (up and down still scroll the page).
  const touch = useRef({ x: 0, y: 0, tilting: false })
  const [turns, setTurns] = useState(0)

  // Pointer position on the card, 0..1. Springs keep the glare from snapping when the pointer jumps.
  const px = useMotionValue(0.5)
  const py = useMotionValue(0.5)
  // -1 pressed into the table, 0 resting, 1 lifted toward the viewer. Drives scale and shadow together.
  const lift = useMotionValue(0)
  const shine = useMotionValue(0)
  const flip = useMotionValue(0)

  const tiltMax = reduced ? 0 : t.tiltMax

  // Tilt is derived from the pointer, so one spring per axis drives tilt, glare and rim together.
  const rx = useTransform(py, (v) => (0.5 - v) * 2 * tiltMax)
  const ry = useTransform(px, (v) => (v - 0.5) * 2 * tiltMax)

  const flipArc = useTransform(flip, (deg) => Math.abs(Math.sin((deg * Math.PI) / 180)))
  const rotateY = useTransform([ry, flip], ([tilt, turn]: number[]) => tilt + turn)
  const scale = useTransform([lift, flipArc], ([l, arc]: number[]) => {
    const base = l >= 0 ? 1 + l * (t.hoverScale - 1) : 1 + l * (1 - t.pressScale)
    return base * (1 + arc * t.flipLift)
  })

  // A light sits above and slightly toward the viewer: tilt pushes the shadow the other way,
  // lifting softens and drops it, pressing pulls it tight under the card.
  const shadowX = useTransform(ry, (deg) => -deg * 1.6)
  const shadowY = useTransform([lift, rx, flipArc], ([l, deg, arc]: number[]) => 12 + l * 14 + deg * 0.8 + arc * 22)
  const shadowScaleX = useTransform([lift, flipArc], ([l, arc]: number[]) => (1 + l * 0.04) * (1 - arc * 0.55))
  const shadowOpacity = useTransform([lift, flipArc], ([l, arc]: number[]) => 0.38 - l * 0.08 - arc * 0.12)

  // Glare and rim move by transform only, so following the pointer never repaints a gradient.
  // The glare layer is twice the card's size, so a 50% shift of itself is one card width.
  const glareX = useTransform(px, (v) => `${(v - 0.5) * 50}%`)
  const glareY = useTransform(py, (v) => `${(v - 0.5) * 50}%`)
  const rimAngle = useTransform([px, py], ([x, y]: number[]) => (Math.atan2(y - 0.5, x - 0.5) * 180) / Math.PI + 90)
  const rimOpacity = useTransform(shine, [0, 1], [0.25, 1])
  const sheen = { glareX, glareY, rimAngle, shine, rimOpacity, glare: t.glare, rim: t.rim, rimWidth: t.rimWidth }

  // Clicking the GitHub link collects it like a coin: it hops up while spinning once. The spin is a squash
  // on X, not a rotateY, so the card's backface-hidden layers never blank it out halfway through a turn.
  const coinSpin = useMotionValue(0)
  const coinY = useMotionValue(0)
  const coinScaleX = useTransform(coinSpin, (deg) => Math.cos((deg * Math.PI) / 180))

  const follow = spring(t.followStiffness, t.followDamping)
  const release = spring(t.releaseStiffness, t.releaseDamping)
  const press = spring(t.pressStiffness, t.pressDamping)
  // Popping back up after a press is the same spring with less damping, so it overshoots.
  const pop = spring(t.pressStiffness * 0.6, t.pressDamping * 0.45)

  const aim = (event: PointerEvent) => {
    const rect = hitRef.current?.getBoundingClientRect()
    if (!rect) return
    const x = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width))
    const y = Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height))
    animate(px, x, follow)
    animate(py, y, follow)
  }

  const onEnter = (event: PointerEvent) => {
    hovered.current = true
    animate(shine, 1, { duration: 0.35, ease: easeOutQuint })
    if (!pressed.current) animate(lift, 1, follow)
    videoRef.current?.play().catch(() => {})
    if (event.pointerType !== "touch") aim(event)
  }

  const onMove = (event: PointerEvent) => {
    if (event.pointerType !== "touch") return aim(event)
    const { current } = touch
    if (!current.tilting) {
      const dx = event.clientX - current.x
      const dy = event.clientY - current.y
      // Wait until it is clearly sideways, so the start of a scroll never twitches the card.
      if (Math.abs(dx) < 8 || Math.abs(dx) < Math.abs(dy)) return
      // From here it is a hover: the card lifts toward the finger instead of staying pressed in.
      current.tilting = true
      pressed.current = false
      animate(lift, 1, follow)
    }
    aim(event)
  }

  const onLeave = () => {
    hovered.current = false
    pressed.current = false
    animate(shine, 0, { duration: 0.6, ease: easeOutQuint })
    animate(lift, 0, release)
    animate(px, 0.5, release)
    animate(py, 0.5, release)
    videoRef.current?.pause()
  }

  const onDown = (event: PointerEvent) => {
    touch.current = { x: event.clientX, y: event.clientY, tilting: false }
    pressed.current = true
    animate(lift, -1, press)
  }

  const onUp = () => {
    if (!pressed.current) return
    pressed.current = false
    animate(lift, hovered.current ? 1 : 0, pop)
  }

  const collect = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (reduced) return
    coinSpin.set(0)
    animate(coinSpin, 360, { duration: 0.45, ease: "easeOut" })
    animate(coinY, [0, -12, 0], { duration: 0.45, times: [0, 0.4, 1], ease: ["easeOut", "easeIn"] })
    // The new tab takes focus at once and would hide the coin, so a plain click opens it once the coin lands.
    // Modified clicks open a background tab anyway and keep their native behavior.
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    const href = event.currentTarget.href
    setTimeout(() => window.open(href, "_blank", "noreferrer"), 450)
  }

  const turn = () => {
    const next = turns + 1
    setTurns(next)
    animate(flip, next * 180, reduced ? { duration: 0 } : spring(t.flipStiffness, t.flipDamping))
  }

  const onClick = (event: React.MouseEvent) => {
    if (!t.flip || touch.current.tilting || (event.target as HTMLElement).closest("a, button")) return
    turn()
  }

  // Each row deals as it scrolls into view, so only cards within a row (up to three) wait on each other.
  // The deal is a CSS transition, not a JS spring: transform and opacity then run on the compositor and
  // the card, with all its 3D layers, is not repainted every frame while it flies in.
  const dealt = useInView(dealRef, { once: true, amount: 0.25 })
  const dealDelay = (index % 3) * t.dealStagger * 1000
  const deal = springEasing(t.dealStiffness, t.dealDamping)
  const showingBack = turns % 2 === 1
  const surface: CSSProperties = {
    // Tinted from the theme's card color, so every theme gets its own take on the project tint.
    background: `linear-gradient(160deg, color-mix(in oklch, var(--card) 86%, var(--tint)) 0%, var(--card) 55%, color-mix(in oklch, var(--card) 80%, color-mix(in oklch, var(--tint-end, var(--tint)), black 20%)) 100%)`,
  }
  const layer = (share: number): CSSProperties => ({ transform: `translateZ(${t.depth * share}px)` })

  return (
    <div
      ref={dealRef}
      // Cards off screen are skipped entirely (no layout, paint or 3D layers). That clips to the box, so the
      // padding gives the shadow and tilt room, with a matching negative margin to keep the grid layout.
      // Only the card itself takes pointer events, or the padding would cover its neighbors.
      className="pointer-events-none relative -m-28 p-28 [contain-intrinsic-height:auto_440px] [content-visibility:auto]"
      style={
        {
          // A project's own brand colors win over the theme's tint for its card.
          "--tint": project.colors?.[0] ?? `var(--tint-${project.tint})`,
          ...(project.colors?.[1] ? { "--tint-end": project.colors[1] } : {}),
          ...(reduced
            ? {}
            : {
                opacity: dealt ? 1 : 0,
                transform: dealt ? "none" : `translateY(140px) rotate(${dealAngle(index)}deg) scale(0.86)`,
                transition: dealt
                  ? `transform ${deal.duration}ms ${deal.easing} ${dealDelay}ms, opacity 300ms cubic-bezier(0.22, 1, 0.36, 1) ${dealDelay}ms`
                  : "none",
              }),
        } as CSSProperties
      }
    >
      {/* Sized from the card, not the padded wrapper: a shadow reaching past the gap would paint over the
          neighbor, because each wrapper is its own stacking context and later cards paint on top. Lighter on
          light themes, where black reads as dirt. Its own layer, so moving or fading it never repaints. */}
      <div aria-hidden className="pointer-events-none absolute inset-28 opacity-45 dark:opacity-100">
        <motion.div
          className="absolute -inset-x-3 top-[12%] -bottom-10 will-change-[transform,opacity]"
          style={{ x: shadowX, y: shadowY, scaleX: shadowScaleX, opacity: shadowOpacity, background: softShadow }}
        />
      </div>

      <div
        ref={hitRef}
        className="pointer-events-auto relative cursor-pointer touch-pan-y select-none"
        style={{ perspective: t.perspective }}
        onPointerEnter={onEnter}
        onPointerMove={onMove}
        onPointerLeave={onLeave}
        onPointerDown={onDown}
        onPointerUp={onUp}
        onPointerCancel={onLeave}
        onClick={onClick}
      >
        {/* Scaling during a flip or press makes Chrome re-raster every layer of the card each frame. On touch
            screens the hint pins the raster scale instead; on desktop it would soften the hover scale. */}
        <motion.div
          className="relative transform-3d pointer-coarse:will-change-transform"
          style={{ rotateX: rx, rotateY, scale }}
        >
          {/* Front */}
          <Face className="relative" style={surface} hidden={showingBack}>
            <div className="relative p-1.5" style={layer(0.3)}>
              <div className="relative aspect-[16/10] overflow-hidden rounded-[calc(var(--radius-3xl)-0.375rem)] bg-black/80 shadow-well ring-1 ring-black/10">
                <Media project={project} videoRef={videoRef} />
                <div className="pointer-events-none absolute inset-0 rounded-[calc(var(--radius-3xl)-0.375rem)] shadow-well-bezel" />
              </div>
            </div>

            {/* Fixed-height slots keep every card the same size whatever the copy: one-line title, three-line pitch. */}
            <div className="px-5 pt-2 pb-4" style={layer(0.55)}>
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
            </div>

            <div className="flex items-center gap-2 pr-1.5 pb-3.5 pl-5" style={layer(1)}>
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
              <a
                href={project.repo}
                target="_blank"
                rel="noreferrer"
                aria-label={`${project.title} source code`}
                onClick={collect}
                className="grid size-8 place-items-center rounded-full bg-foreground/[0.06] transition-colors hover:bg-foreground/10"
              >
                <motion.span className="block" style={{ scaleX: coinScaleX, y: coinY }}>
                  <GithubIcon className="size-4" />
                </motion.span>
              </a>
              {t.flip && (
                <button
                  type="button"
                  onClick={turn}
                  aria-label="Show details"
                  className="ml-auto grid size-8 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-foreground/[0.06] hover:text-foreground"
                >
                  <RotateCcw className="size-4" />
                </button>
              )}
            </div>
            <Sheen {...sheen} />
          </Face>

          {/* Back */}
          <Face className="absolute inset-0" style={{ ...surface, transform: "rotateY(180deg)" }} hidden={!showingBack}>
            <div className="flex flex-1 flex-col px-5 py-6" style={layer(0.55)}>
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
            </div>
            <div className="flex items-center gap-2 pr-1.5 pb-3.5 pl-5" style={layer(1)}>
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
              <button
                type="button"
                onClick={turn}
                aria-label="Show front"
                className="ml-auto grid size-8 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-foreground/[0.06] hover:text-foreground"
              >
                <RotateCcw className="size-4" />
              </button>
            </div>
            <Sheen {...sheen} />
          </Face>
        </motion.div>
      </div>
    </div>
  )
}

// One side of the card. Every descendant hides its backface too: with preserve-3d each layer
// is its own plane, so hiding only the face would let its floating layers show through the back.
function Face({
  children,
  className,
  style,
  hidden,
}: {
  children: React.ReactNode
  className: string
  style: CSSProperties
  hidden: boolean
}) {
  return (
    <div
      aria-hidden={hidden}
      inert={hidden}
      className={`${className} flex flex-col rounded-3xl border border-black/[0.07] backface-hidden transform-3d dark:border-white/10 [&_*]:backface-hidden`}
      style={style}
    >
      <div
        className="pointer-events-none absolute inset-0 rounded-3xl opacity-7 mix-blend-multiply dark:opacity-12 dark:mix-blend-screen"
        style={{ backgroundImage: grain }}
      />
      {children}
    </div>
  )
}

// Cuts the rim gradient down to a ring as thick as the padding. Longhands only: the `mask` shorthand resets mask-composite.
const ring: CSSProperties = {
  maskImage: "linear-gradient(#000 0 0), linear-gradient(#000 0 0)",
  maskClip: "content-box, border-box",
  maskComposite: "exclude",
}

function Sheen({
  glareX,
  glareY,
  rimAngle,
  shine,
  rimOpacity,
  glare,
  rim,
  rimWidth,
}: {
  glareX: MotionValue<string>
  glareY: MotionValue<string>
  rimAngle: MotionValue<number>
  shine: MotionValue<number>
  rimOpacity: MotionValue<number>
  glare: number
  rim: number
  rimWidth: number
}) {
  return (
    <>
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl mix-blend-soft-light"
        style={{ opacity: shine }}
      >
        <motion.div
          className="absolute -inset-1/2"
          style={{
            x: glareX,
            y: glareY,
            background: `radial-gradient(circle closest-side, rgb(255 255 255 / ${glare * 0.55}) 0%, rgb(255 255 255 / ${glare * 0.12}) 35%, transparent 85%)`,
          }}
        />
      </motion.div>
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl"
        style={{ opacity: rimOpacity, padding: rimWidth, ...ring }}
      >
        {/* A square big enough to cover the card at any angle; rotating it turns the highlight toward the light. */}
        <motion.div
          className="absolute top-1/2 left-1/2 aspect-square w-[200%]"
          style={{
            x: "-50%",
            y: "-50%",
            rotate: rimAngle,
            background: `linear-gradient(0deg, rgb(255 255 255 / ${rim}) 16%, rgb(255 255 255 / 0) 45%)`,
          }}
        />
      </motion.div>
    </>
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
