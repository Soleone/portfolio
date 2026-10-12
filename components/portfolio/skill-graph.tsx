"use client"

import { useReducedMotion } from "motion/react"
import dynamic from "next/dynamic"
import { ArrowLeft, ArrowUpRight, Footprints, Pause, X } from "lucide-react"
import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react"
import { Color } from "three"
import { useTheme } from "@/components/theme"
import { Button } from "@/components/ui/button"
import { Kbd } from "@/components/ui/kbd"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { skillGroups } from "@/lib/portfolio"
import { neighborsOf, nodeById, skillGraph, type Arrangement, type SkillNode } from "@/lib/skill-graph"
import { cn } from "@/lib/utils"
import type { GraphColors } from "./skill-graph-scene"

// three.js is heavy, so the scene loads once the section comes near the viewport, and never on the server.
const Scene = dynamic(() => import("./skill-graph-scene"), { ssr: false })

const arrangements: { value: Arrangement; label: string; hint: string }[] = [
  { value: "web", label: "Connections", hint: "Settled by what links to what" },
  { value: "kind", label: "Kind", hint: "Clustered by kind of skill" },
  { value: "domain", label: "Domain", hint: "Placed between the domains each one serves" },
]

// Group colors are the chart tokens, one per skill group; domains are drawn in the ink color.
const groupToken = (group: number) => `var(--chart-${(group % 5) + 1})`
const tokenOf = (node: SkillNode) => (node.group === undefined ? "var(--foreground)" : groupToken(node.group))
const kindOf = (node: SkillNode) => (node.group === undefined ? "Domain" : skillGroups[node.group].label)

const domains = skillGraph.nodes.filter((node) => node.kind === "domain")
const skillCount = skillGraph.nodes.length - domains.length
const WANDER_MS = 2600

// The scene needs real colors, so the tokens are resolved through the browser (which also turns
// oklch and color-mix into plain sRGB) whenever the theme changes.
function useGraphColors(): GraphColors | undefined {
  const { theme, resolvedMode } = useTheme()
  const [colors, setColors] = useState<GraphColors>()

  useEffect(() => {
    const probe = document.createElement("span")
    document.body.appendChild(probe)
    const canvas = document.createElement("canvas")
    canvas.width = canvas.height = 1
    const context = canvas.getContext("2d", { willReadFrequently: true })!
    const read = (token: string) => {
      probe.style.color = token
      context.clearRect(0, 0, 1, 1)
      context.fillStyle = getComputedStyle(probe).color
      context.fillRect(0, 0, 1, 1)
      const [r, g, b] = context.getImageData(0, 0, 1, 1).data
      return new Color(`rgb(${r}, ${g}, ${b})`)
    }
    setColors({
      groups: skillGroups.map((_, group) => read(groupToken(group))),
      domain: read("var(--foreground)"),
      edge: read("var(--muted-foreground)"),
    })
    probe.remove()
  }, [theme, resolvedMode])

  return colors
}

// Whether the stage has ever come near the viewport (load the scene) and whether it is near now (keep drawing).
function useNearViewport<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [near, setNear] = useState({ ever: false, now: false })

  useEffect(() => {
    if (!ref.current) return
    const observer = new IntersectionObserver(
      ([entry]) => setNear((near) => ({ ever: near.ever || entry.isIntersecting, now: entry.isIntersecting })),
      { rootMargin: "200px" }
    )
    observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])

  return [ref, near] as const
}

const hasWebGL = () => {
  try {
    return !!document.createElement("canvas").getContext("webgl2")
  } catch {
    return false
  }
}

export function SkillGraph() {
  const [arrangement, setArrangement] = useState<Arrangement>("web")
  const [filter, setFilter] = useState<number | null>(null)
  const [trail, setTrail] = useState<string[]>([])
  const [hover, setHover] = useState<string | null>(null)
  const [wandering, setWandering] = useState(false)
  const [webgl, setWebgl] = useState(true)
  const [stage, near] = useNearViewport<HTMLDivElement>()
  const reducedMotion = useReducedMotion() ?? false
  const colors = useGraphColors()
  const focus = trail.at(-1) ?? null

  useEffect(() => setWebgl(hasWebGL()), [])

  const visit = useCallback((id: string) => {
    setTrail((trail) => {
      if (trail.at(-1) === id) return trail
      // Walking back onto a node already on the trail rewinds to it instead of looping.
      const seen = trail.indexOf(id)
      return seen === -1 ? [...trail, id] : trail.slice(0, seen + 1)
    })
  }, [])

  // The panel rows that set a hover unmount when the focus moves, before they can clear it.
  const select = useCallback(
    (id: string) => {
      setWandering(false)
      setHover(null)
      visit(id)
    },
    [visit]
  )
  const back = () => {
    setHover(null)
    setTrail((trail) => trail.slice(0, -1))
  }
  const clear = useCallback(() => {
    setWandering(false)
    setHover(null)
    setTrail([])
  }, [])

  // Wandering takes a step every few seconds to a neighbour it has not just come from.
  useEffect(() => {
    if (!wandering) return
    const id = setInterval(() => {
      setTrail((trail) => {
        const here = trail.at(-1) ?? domains[Math.floor(Math.random() * domains.length)].id
        const recent = new Set(trail.slice(-5))
        const options = neighborsOf(here).map(({ id }) => id)
        const fresh = options.filter((id) => !recent.has(id))
        const pool = fresh.length ? fresh : options
        const next = pool[Math.floor(Math.random() * pool.length)]
        if (!trail.length) return [here]
        // A wander keeps a short memory, so the trail stays readable.
        return [...trail, next].slice(-8)
      })
    }, WANDER_MS)
    return () => clearInterval(id)
  }, [wandering])

  function onKeyDown(event: KeyboardEvent) {
    if (event.key === "Escape" && (focus || filter !== null)) {
      clear()
      setFilter(null)
    } else if (event.key === "Backspace" && focus && !(event.target instanceof HTMLInputElement)) {
      event.preventDefault()
      setWandering(false)
      back()
    }
  }

  return (
    <div className="mt-10 flex flex-col gap-4" onKeyDown={onKeyDown}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Highlight a kind of skill">
          {skillGroups.map((group, index) => (
            <button
              key={group.label}
              type="button"
              aria-pressed={filter === index}
              onClick={() => {
                setFilter(filter === index ? null : index)
                clear()
              }}
              className={cn(
                "inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium transition-colors",
                filter === index
                  ? "border-foreground/30 bg-secondary text-secondary-foreground"
                  : "border-border text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <span className="size-2 rounded-full" style={{ background: groupToken(index) }} />
              {group.label}
              <span className="tabular-nums opacity-60">{group.items.length}</span>
            </button>
          ))}
        </div>

        <ToggleGroup
          value={[arrangement]}
          onValueChange={(value) => value[0] && setArrangement(value[0] as Arrangement)}
          variant="outline"
          size="sm"
          spacing={0}
          aria-label="Arrange by"
        >
          {arrangements.map((option) => (
            <ToggleGroupItem key={option.value} value={option.value} title={option.hint} className="px-3 text-xs">
              {option.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div
          ref={stage}
          className="relative isolate h-[420px] overflow-hidden rounded-xl border border-border bg-card/40 sm:h-[540px]"
        >
          {/* A soft well of light behind the graph, in the theme's own brand color. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10 opacity-60"
            style={{ background: "radial-gradient(ellipse at center, color-mix(in oklab, var(--primary) 12%, transparent), transparent 65%)" }}
          />
          {near.ever && webgl && colors ? (
            <Scene
              paused={!near.now}
              arrangement={arrangement}
              focus={focus}
              hover={hover}
              filter={filter}
              colors={colors}
              reducedMotion={reducedMotion}
              onSelect={select}
              onHover={setHover}
              onClear={clear}
            />
          ) : (
            !webgl && <FlatGraph focus={focus} filter={filter} onSelect={select} />
          )}

          {trail.length > 0 && (
            <nav
              aria-label="Your path through the graph"
              className="absolute inset-x-3 bottom-3 z-20 flex flex-wrap items-center gap-1 text-xs"
            >
              {trail.map((id, index) => (
                <span key={`${id}-${index}`} className="flex items-center gap-1">
                  {index > 0 && <span className="text-muted-foreground">→</span>}
                  <button
                    type="button"
                    onClick={() => select(id)}
                    aria-current={index === trail.length - 1 ? "step" : undefined}
                    className={cn(
                      "rounded-full border px-2 py-0.5 backdrop-blur-sm transition-colors",
                      index === trail.length - 1
                        ? "border-primary/50 bg-background/70 text-foreground"
                        : "border-border bg-background/50 text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {nodeById.get(id)?.label}
                  </button>
                </span>
              ))}
            </nav>
          )}

          <p className="pointer-events-none absolute top-3 left-3 z-20 hidden text-xs text-muted-foreground sm:block">
            {arrangements.find((option) => option.value === arrangement)!.hint} · drag to turn
          </p>
        </div>

        <aside
          aria-live="polite"
          className="flex max-h-[540px] min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-card"
        >
          {focus ? (
            <FocusPanel
              node={nodeById.get(focus)!}
              canGoBack={trail.length > 1}
              wandering={wandering}
              onSelect={select}
              onHover={setHover}
              onBack={() => {
                setWandering(false)
                back()
              }}
              onClear={clear}
              onWander={() => setWandering(!wandering)}
            />
          ) : (
            <IntroPanel onSelect={select} onWander={() => setWandering(true)} />
          )}
        </aside>
      </div>
    </div>
  )
}

function IntroPanel({ onSelect, onWander }: { onSelect: (id: string) => void; onWander: () => void }) {
  return (
    <div className="flex flex-col gap-5 p-5">
      <div className="flex flex-col gap-2">
        <h3 className="font-semibold tracking-tight">Follow a thread</h3>
        <p className="text-pretty text-sm leading-relaxed text-muted-foreground">
          {skillCount} skills and {domains.length} domains, joined by {skillGraph.edges.length} connections. Every connection
          has a reason. Pick a node and walk to its neighbours, or rearrange the whole map by kind or by domain.
        </p>
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Start from a domain</span>
        <div className="grid grid-cols-2 gap-2">
          {domains.map((domain) => (
            <Button key={domain.id} variant="outline" size="sm" onClick={() => onSelect(domain.id)} className="justify-start">
              <span className="size-2 rounded-full bg-foreground" />
              {domain.label}
            </Button>
          ))}
        </div>
      </div>
      <Button variant="secondary" size="sm" onClick={onWander} className="self-start">
        <Footprints />
        Wander for me
      </Button>
    </div>
  )
}

function FocusPanel({
  node,
  canGoBack,
  wandering,
  onSelect,
  onHover,
  onBack,
  onClear,
  onWander,
}: {
  node: SkillNode
  canGoBack: boolean
  wandering: boolean
  onSelect: (id: string) => void
  onHover: (id: string | null) => void
  onBack: () => void
  onClear: () => void
  onWander: () => void
}) {
  // Domains first, then reasoned links, then the rest by name.
  const links = useMemo(
    () =>
      neighborsOf(node.id)
        .map(({ id, edge }) => ({ node: nodeById.get(id)!, edge }))
        .sort(
          (a, b) =>
            Number(b.node.kind === "domain") - Number(a.node.kind === "domain") ||
            Number(!!b.edge.note) - Number(!!a.edge.note) ||
            a.node.label.localeCompare(b.node.label)
        ),
    [node.id]
  )

  return (
    <>
      <div className="flex items-start justify-between gap-3 border-b border-border p-5">
        <div className="flex min-w-0 flex-col gap-1">
          <span className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <span className="size-2 rounded-full" style={{ background: tokenOf(node) }} />
            {kindOf(node)}
          </span>
          <h3 className="truncate text-xl font-semibold tracking-tight">{node.label}</h3>
          <span className="text-xs text-muted-foreground">
            {links.length} links
            {node.projects.length > 0 && ` · ${node.projects.length} project${node.projects.length === 1 ? "" : "s"}`}
          </span>
        </div>
        <div className="flex shrink-0 gap-1">
          <Button variant="ghost" size="icon-sm" onClick={onWander} aria-label={wandering ? "Stop wandering" : "Wander from here"} title={wandering ? "Stop wandering" : "Wander from here"}>
            {wandering ? <Pause /> : <Footprints />}
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={onBack} disabled={!canGoBack} aria-label="Back" title="Back (Backspace)">
            <ArrowLeft />
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={onClear} aria-label="Close" title="Close (Esc)">
            <X />
          </Button>
        </div>
      </div>

      <ul className="flex min-h-0 flex-1 flex-col overflow-y-auto p-2">
        {links.map(({ node: next, edge }) => {
          const why = [edge.note, edge.projects.length > 0 && `Together in ${edge.projects.join(", ")}`].filter(Boolean)
          return (
            <li key={next.id}>
              <button
                type="button"
                onClick={() => onSelect(next.id)}
                onPointerEnter={() => onHover(next.id)}
                onPointerLeave={() => onHover(null)}
                onFocus={() => onHover(next.id)}
                onBlur={() => onHover(null)}
                className="group flex w-full items-start gap-2.5 rounded-lg px-3 py-2 text-left transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
              >
                <span className="mt-1.5 size-2 shrink-0 rounded-full" style={{ background: tokenOf(next) }} />
                <span className="flex min-w-0 flex-col">
                  <span className="text-sm font-medium">{next.label}</span>
                  {why.map((line) => (
                    <span key={line as string} className="text-pretty text-xs leading-snug text-muted-foreground">
                      {line}
                    </span>
                  ))}
                </span>
              </button>
            </li>
          )
        })}
      </ul>

      {node.projects.length > 0 && (
        <div className="flex flex-col gap-2 border-t border-border p-4">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Built with it</span>
          <div className="flex flex-wrap gap-1.5">
            {node.projects.map((project) => (
              <a
                key={project.href}
                href={project.href}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-0.5 rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                {project.title}
                <ArrowUpRight className="size-3" />
              </a>
            ))}
          </div>
        </div>
      )}

      <p className="hidden border-t border-border px-4 py-2 text-[11px] text-muted-foreground lg:block">
        <Kbd>Backspace</Kbd> back · <Kbd>Esc</Kbd> close
      </p>
    </>
  )
}

// Without WebGL the graph is a flat list in the same colors; the panel still walks it.
function FlatGraph({ focus, filter, onSelect }: { focus: string | null; filter: number | null; onSelect: (id: string) => void }) {
  const near = new Set(focus ? neighborsOf(focus).map(({ id }) => id) : [])
  return (
    <div className="flex h-full flex-wrap content-center justify-center gap-2 p-6">
      {skillGraph.nodes.map((node) => (
        <button
          key={node.id}
          type="button"
          onClick={() => onSelect(node.id)}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs transition-opacity",
            node.id === focus && "border-primary text-foreground",
            (focus ? node.id !== focus && !near.has(node.id) : filter !== null && node.group !== filter) && "opacity-30"
          )}
        >
          <span className="size-2 rounded-full" style={{ background: tokenOf(node) }} />
          {node.label}
        </button>
      ))}
    </div>
  )
}
