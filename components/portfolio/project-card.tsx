"use client"

import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
  type MotionValue,
} from "motion/react"
import { ArrowUpRight, CodeXml, Play, RotateCcw } from "lucide-react"
import { useRef, useState, type CSSProperties, type PointerEvent, type ReactNode } from "react"
import type { ProjectMedia } from "@/lib/showcase"
import { useTuning } from "./card-tuning"

export type CardProject = {
  title: string
  pitch: string
  year: string
  type: string
  tech: string[]
  repo: string
  live?: string
  media: ProjectMedia
  icon?: string
  glyph: ReactNode // a rendered icon, so server components can pass it
  hue: number
}

const spring = (stiffness: number, damping: number) => ({ type: "spring" as const, stiffness, damping })
const easeOutQuint = [0.22, 1, 0.36, 1] as const

// Deterministic so server and client agree; a dealt hand never lands perfectly square.
const dealAngle = (index: number) => ((index * 37) % 17) - 8

// SVG grain makes the surface read as a material instead of a flat fill.
const grain =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.55'/%3E%3C/svg%3E\")"

export function ProjectCard({ project, index }: { project: CardProject; index: number }) {
  const { tuning: t } = useTuning()
  const reduced = useReducedMotion() ?? false
  const hitRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const pressed = useRef(false)
  const hovered = useRef(false)
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
    if (event.pointerType !== "touch") aim(event)
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

  const onDown = () => {
    pressed.current = true
    animate(lift, -1, press)
  }

  const onUp = () => {
    if (!pressed.current) return
    pressed.current = false
    animate(lift, hovered.current ? 1 : 0, pop)
  }

  const turn = () => {
    const next = turns + 1
    setTurns(next)
    animate(flip, next * 180, reduced ? { duration: 0 } : spring(t.flipStiffness, t.flipDamping))
  }

  const onClick = (event: React.MouseEvent) => {
    if (!t.flip || (event.target as HTMLElement).closest("a, button")) return
    turn()
  }

  // Each row deals as it scrolls into view, so only cards within a row (up to three) wait on each other.
  const dealDelay = (index % 3) * t.dealStagger
  const showingBack = turns % 2 === 1
  const surface: CSSProperties = {
    // Tinted from the theme's card color so light and dark both get the project hue.
    background: `linear-gradient(160deg, color-mix(in oklch, var(--card) 86%, oklch(0.75 0.12 ${project.hue})) 0%, var(--card) 55%, color-mix(in oklch, var(--card) 80%, oklch(0.6 0.12 ${project.hue})) 100%)`,
  }
  const layer = (share: number): CSSProperties => ({ transform: `translateZ(${t.depth * share}px)` })

  return (
    <motion.div
      className="relative"
      initial={reduced ? false : { opacity: 0, y: 140, rotate: dealAngle(index), scale: 0.86 }}
      whileInView={{ opacity: 1, y: 0, rotate: 0, scale: 1 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{
        ...spring(t.dealStiffness, t.dealDamping),
        delay: dealDelay,
        opacity: { duration: 0.3, delay: dealDelay, ease: easeOutQuint },
      }}
    >
      <motion.div
        aria-hidden
        className="absolute inset-x-[7%] top-[10%] bottom-0 rounded-[28px] bg-black blur-2xl dark:bg-black"
        style={{ x: shadowX, y: shadowY, scaleX: shadowScaleX, opacity: shadowOpacity }}
      />

      <div
        ref={hitRef}
        className="relative cursor-pointer touch-pan-y select-none"
        style={{ perspective: t.perspective }}
        onPointerEnter={onEnter}
        onPointerMove={onMove}
        onPointerLeave={onLeave}
        onPointerDown={onDown}
        onPointerUp={onUp}
        onPointerCancel={onLeave}
        onClick={onClick}
      >
        <motion.div
          className="relative transform-3d"
          style={{ rotateX: rx, rotateY, scale }}
        >
          {/* Front */}
          <Face className="relative" style={surface} hidden={showingBack}>
            <div className="relative p-2.5" style={layer(0.3)}>
              <div className="relative aspect-[16/10] overflow-hidden rounded-[16px] bg-black/80 shadow-[inset_0_1px_3px_rgb(0_0_0/0.35)] ring-1 ring-black/10">
                <Media project={project} videoRef={videoRef} />
                <div className="pointer-events-none absolute inset-0 rounded-[16px] shadow-[inset_0_0_0_1px_rgb(255_255_255/0.08),inset_0_10px_24px_rgb(0_0_0/0.18)]" />
              </div>
            </div>

            {/* Fixed-height slots keep every card the same size whatever the copy: one-line title, three-line pitch, one row of tags. */}
            <div className="px-5 pt-2 pb-4" style={layer(0.55)}>
              <div className="flex items-center gap-2 text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
                <span>{project.type}</span>
                <span className="size-1 rounded-full bg-current opacity-40" />
                <span className="tabular-nums">{project.year}</span>
              </div>
              <h3 className="mt-1.5 truncate text-xl font-semibold tracking-tight">{project.title}</h3>
              <p className="mt-1.5 line-clamp-3 h-[4.875em] text-sm leading-relaxed text-pretty text-muted-foreground">
                {project.pitch}
              </p>
              <div className="mt-3 flex h-6 flex-wrap gap-1.5 overflow-hidden">
                {project.tech.slice(0, 4).map((tag) => (
                  <span key={tag} className="rounded-full bg-foreground/[0.06] px-2 py-0.5 text-[11px] font-medium">
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 px-5 pb-5" style={layer(1)}>
              {project.live && (
                <a
                  href={project.live}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-1.5 text-sm font-medium text-primary-foreground shadow-[0_6px_16px_-6px_var(--primary)] transition-transform active:scale-95"
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
                className="grid size-8 place-items-center rounded-full bg-foreground/[0.06] transition-colors hover:bg-foreground/10"
              >
                <CodeXml className="size-4" />
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
            <div className="flex flex-1 flex-col p-6" style={layer(0.55)}>
              <div className="flex items-center gap-3">
                <div className="grid size-11 place-items-center rounded-xl bg-foreground/[0.06]">
                  <span className="[&_svg]:size-5">{project.glyph}</span>
                </div>
                <div>
                  <h3 className="text-lg leading-tight font-semibold tracking-tight">{project.title}</h3>
                  <div className="text-xs text-muted-foreground">
                    {project.type} · {project.year}
                  </div>
                </div>
              </div>
              <p className="mt-5 text-sm leading-relaxed text-pretty">{project.pitch}</p>
              <div className="mt-5 text-[11px] font-medium tracking-wider text-muted-foreground uppercase">Built with</div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {project.tech.map((tag) => (
                  <span key={tag} className="rounded-full bg-foreground/[0.06] px-2 py-0.5 text-xs font-medium">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2 px-6 pb-6" style={layer(1)}>
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
    </motion.div>
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
      className={`${className} flex flex-col rounded-[22px] border border-black/[0.07] backface-hidden transform-3d dark:border-white/10 [&_*]:backface-hidden`}
      style={style}
    >
      <div
        className="pointer-events-none absolute inset-0 rounded-[22px] opacity-[0.07] mix-blend-multiply dark:opacity-[0.12] dark:mix-blend-screen"
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
        className="pointer-events-none absolute inset-0 overflow-hidden rounded-[22px] mix-blend-soft-light"
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
        className="pointer-events-none absolute inset-0 overflow-hidden rounded-[22px]"
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
        background: `radial-gradient(120% 90% at 20% 10%, oklch(0.78 0.13 ${project.hue}) 0%, oklch(0.45 0.12 ${project.hue + 30}) 55%, oklch(0.25 0.06 ${project.hue + 40}) 100%)`,
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
