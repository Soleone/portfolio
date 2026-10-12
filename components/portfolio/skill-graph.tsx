"use client"

import { useReducedMotion } from "motion/react"
import dynamic from "next/dynamic"
import { ArrowLeft, ArrowUpRight, Diamond, Footprints, Pause, Search, X } from "lucide-react"
import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent } from "react"
import { Color } from "three"
import { useTheme } from "@/components/theme"
import { Button } from "@/components/ui/button"
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group"
import { Kbd } from "@/components/ui/kbd"
import { Toggle } from "@/components/ui/toggle"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { projects } from "@/lib/portfolio"
import { buildGraph, neighborsOf, searchGraph, slug, type Arrangement, type OutlineRow, type SkillGraph as Graph, type SkillNode } from "@/lib/skill-graph"
import { cn } from "@/lib/utils"
import type { GraphColors } from "./skill-graph-scene"

// three.js is heavy, so the scene loads once the section comes near the viewport, and never on the server.
const Scene = dynamic(() => import("./skill-graph-scene"), { ssr: false })

const arrangements: { value: Arrangement; label: string; hint: string }[] = [
  { value: "map", label: "Map", hint: "Fields round a core, specifics further out" },
  { value: "web", label: "Web", hint: "Settled only by what connects" },
]

// Each field takes one of the theme's eight tints; everything in it shares the color. Projects are
// drawn in an ink color and told apart by shape.
export const fieldToken = (field: number) => `var(--tint-${(field % 8) + 1})`
export const tokenOf = (node: Pick<SkillNode, "kind" | "fields">) =>
  node.kind === "project" ? "var(--muted-foreground)" : fieldToken(node.fields[0] ?? 0)

// A swatch in a field's tint. The tint arrives as a CSS variable, so it is handed over as one.
export function Dot({ color, className }: { color: string; className?: string }) {
  return <span className={cn("size-2 shrink-0 rounded-full bg-(--dot)", className)} style={{ "--dot": color } as CSSProperties} />
}

const WANDER_MS = 2600

// The scene needs real colors, so the tokens are resolved through the browser (which also turns
// oklch and color-mix into plain sRGB) whenever the theme changes.
function useGraphColors(fieldCount: number): GraphColors | undefined {
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
      fields: Array.from({ length: fieldCount }, (_, field) => read(fieldToken(field))),
      project: read("var(--muted-foreground)"),
      edge: read("var(--muted-foreground)"),
    })
    probe.remove()
  }, [theme, resolvedMode, fieldCount])

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

export function SkillGraph({
  outline,
  stacked = false,
  selected,
  onFocusChange,
  search,
}: {
  outline: OutlineRow[]
  // One column, panel under the stage, for narrow hosts like the outliner's preview.
  stacked?: boolean
  // Lets a host (the outliner) point the graph at a node, and hear where the visitor walks.
  selected?: string | null
  onFocusChange?: (id: string | null) => void
  // A host with its own search box passes its query; without one the graph shows its own box.
  search?: string
}) {
  const [arrangement, setArrangement] = useState<Arrangement>("map")
  const [withProjects, setWithProjects] = useState(false)
  const [filter, setFilter] = useState<number | null>(null)
  const [ownQuery, setOwnQuery] = useState("")
  const [trail, setTrail] = useState<string[]>([])
  const [hover, setHover] = useState<string | null>(null)
  const [wandering, setWandering] = useState(false)
  const [webgl, setWebgl] = useState(true)
  const [stage, near] = useNearViewport<HTMLDivElement>()
  const reducedMotion = useReducedMotion() ?? false
  const graph = useMemo(() => buildGraph(outline, projects, { withProjects }), [outline, withProjects])
  const colors = useGraphColors(graph.fields.length)
  // Nodes can leave the graph (projects switched off, an entry deleted in the outliner); the path skips them.
  const path = useMemo(() => trail.filter((id) => graph.byId.has(id)), [trail, graph])
  const focus = path.at(-1) ?? null
  const query = search ?? ownQuery
  const matches = useMemo(() => (query.trim() ? searchGraph(graph, query) : null), [graph, query])
  // Search matches, or else the chosen field, are what the scene picks out.
  const highlight = useMemo(() => {
    if (matches) return new Set(matches.map((node) => node.id))
    if (filter === null) return null
    return new Set(graph.nodes.filter((node) => node.fields.includes(filter)).map((node) => node.id))
  }, [matches, filter, graph])
  const latest = useRef(graph)
  latest.current = graph

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
    setTrail(path.slice(0, -1))
  }
  const clear = useCallback(() => {
    setWandering(false)
    setHover(null)
    setTrail([])
  }, [])

  // Only a new request from the host moves the graph; the focus moving on its own must not bounce back.
  const requested = useRef(selected)
  useEffect(() => {
    if (selected === requested.current) return
    requested.current = selected
    if (selected === undefined || selected === focus) return
    if (selected === null) setTrail([])
    else visit(selected)
  }, [selected, focus, visit])

  useEffect(() => onFocusChange?.(focus), [focus, onFocusChange])

  // Wandering takes a step every few seconds to a neighbour it has not just come from.
  useEffect(() => {
    if (!wandering) return
    const id = setInterval(() => {
      const graph = latest.current
      setTrail((trail) => {
        const start = graph.fields[Math.floor(Math.random() * graph.fields.length)]
        const here = trail.filter((id) => graph.byId.has(id)).at(-1) ?? start?.id
        if (!here) return trail
        if (!trail.length) return [here]
        const recent = new Set(trail.slice(-5))
        const options = neighborsOf(graph, here)
        const fresh = options.filter((id) => !recent.has(id))
        const pool = fresh.length ? fresh : options
        if (!pool.length) return trail
        // A wander keeps a short memory, so the trail stays readable.
        return [...trail, pool[Math.floor(Math.random() * pool.length)]].slice(-8)
      })
    }, WANDER_MS)
    return () => clearInterval(id)
  }, [wandering])

  function onSearch(value: string) {
    setOwnQuery(value)
    setFilter(null)
    // A focused node outshines everything else, so a new search lets go of it.
    if (value.trim() && focus) clear()
  }

  function onKeyDown(event: KeyboardEvent) {
    const typing = event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement
    if (typing && event.key !== "Escape") return
    if (event.key === "Escape" && focus) clear()
    else if (event.key === "Escape" && (filter !== null || ownQuery)) {
      setFilter(null)
      setOwnQuery("")
    } else if (event.key === "Backspace" && focus) {
      event.preventDefault()
      setWandering(false)
      back()
    }
  }

  return (
    <div className={cn("flex flex-col gap-4", !stacked && "mt-10")} onKeyDown={onKeyDown}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        {search === undefined ? (
          <SkillSearch
            query={ownQuery}
            matches={matches ?? []}
            shortcut={!stacked}
            onQuery={onSearch}
            onSelect={(id) => {
              setOwnQuery("")
              select(id)
            }}
            onHover={setHover}
          />
        ) : (
          <span />
        )}
        <div className="flex flex-wrap items-center gap-2">
          <Toggle
            pressed={withProjects}
            onPressedChange={setWithProjects}
            variant="outline"
            size="sm"
            title="Show the projects built with each thing"
          >
            <Diamond />
            Projects
          </Toggle>
          <ToggleGroup
            value={[arrangement]}
            onValueChange={(value) => value[0] && setArrangement(value[0] as Arrangement)}
            variant="outline"
            size="sm"
            spacing={0}
            aria-label="Arrange as"
          >
            {arrangements.map((option) => (
              <ToggleGroupItem key={option.value} value={option.value} title={option.hint}>
                {option.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Highlight a field">
        {graph.fields.map((field, index) => (
          <button
            key={field.id}
            type="button"
            aria-pressed={filter === index}
            onClick={() => {
              setFilter(filter === index ? null : index)
              setOwnQuery("")
              clear()
            }}
            className={cn(
              "inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium transition-colors",
              filter === index
                ? "border-foreground/30 bg-secondary text-secondary-foreground"
                : "border-border text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Dot color={fieldToken(index)} />
            {field.label}
          </button>
        ))}
      </div>

      <div className={cn("grid gap-4", !stacked && "lg:grid-cols-[minmax(0,1fr)_300px]")}>
        <div
          ref={stage}
          className={cn(
            "relative isolate overflow-hidden rounded-xl border border-border bg-card/40",
            stacked ? "h-[440px]" : "h-[420px] sm:h-[540px]"
          )}
        >
          {/* A soft well of light behind the graph, in the theme's own brand color. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10 bg-radial from-primary/12 to-transparent to-65% opacity-60"
          />
          {near.ever && webgl && colors ? (
            <Scene
              graph={graph}
              paused={!near.now}
              arrangement={arrangement}
              focus={focus}
              hover={hover}
              highlight={highlight}
              colors={colors}
              reducedMotion={reducedMotion}
              onSelect={select}
              onHover={setHover}
              onClear={clear}
            />
          ) : (
            !webgl && <FlatGraph graph={graph} focus={focus} highlight={highlight} onSelect={select} />
          )}

          {path.length > 0 && (
            <nav
              aria-label="Your path through the map"
              className="absolute inset-x-3 bottom-3 z-20 flex flex-wrap items-center gap-1 text-xs"
            >
              {path.map((id, index) => (
                <span key={`${id}-${index}`} className="flex items-center gap-1">
                  {index > 0 && <span className="text-muted-foreground">→</span>}
                  <button
                    type="button"
                    onClick={() => select(id)}
                    aria-current={index === path.length - 1 ? "step" : undefined}
                    className={cn(
                      "rounded-full border px-2 py-0.5 backdrop-blur-sm transition-colors",
                      index === path.length - 1
                        ? "border-primary/50 bg-background/70 text-foreground"
                        : "border-border bg-background/50 text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {graph.byId.get(id)?.label}
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
          className={cn(
            "flex min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-card",
            stacked ? "max-h-[300px] empty:hidden" : "max-h-[540px]"
          )}
        >
          {/* Stacked, the host has its own intro; the panel only appears for a node. */}
          {focus ? (
            <FocusPanel
              graph={graph}
              node={graph.byId.get(focus)!}
              canGoBack={path.length > 1}
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
            !stacked && <IntroPanel graph={graph} onSelect={select} onWander={() => setWandering(true)} />
          )}
        </aside>
      </div>
    </div>
  )
}

const SHOWN_MATCHES = 8

// Typing lights up every match in the scene; the list under the box flies to one.
function SkillSearch({
  query,
  matches,
  shortcut,
  onQuery,
  onSelect,
  onHover,
}: {
  query: string
  matches: SkillNode[]
  // Whether "/" anywhere on the page jumps into the box.
  shortcut: boolean
  onQuery: (query: string) => void
  onSelect: (id: string) => void
  onHover: (id: string | null) => void
}) {
  const input = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const shown = matches.slice(0, SHOWN_MATCHES)
  const expanded = open && query.trim() !== ""

  useEffect(() => {
    if (!shortcut) return
    const onKey = (event: globalThis.KeyboardEvent) => {
      const target = event.target as HTMLElement
      if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) return
      if (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return
      event.preventDefault()
      input.current?.focus()
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [shortcut])

  const choose = (node: SkillNode | undefined) => {
    if (!node) return
    onHover(null)
    setOpen(false)
    onSelect(node.id)
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault()
      if (!shown.length) return
      setOpen(true)
      setActive((active) => (active + (event.key === "ArrowDown" ? 1 : shown.length - 1)) % shown.length)
    } else if (event.key === "Enter") {
      event.preventDefault()
      choose(shown[active])
    } else if (event.key === "Escape" && query) {
      // Esc lets go of the query first; on an empty box it reaches the graph, which closes the node.
      event.stopPropagation()
      onQuery("")
    }
  }

  return (
    <div className="relative w-full sm:w-72">
      <InputGroup className="h-8">
        <InputGroupAddon>
          <Search />
        </InputGroupAddon>
        <InputGroupInput
          ref={input}
          type="text"
          role="combobox"
          aria-label="Search the map"
          aria-expanded={expanded}
          aria-controls="skill-search-results"
          aria-activedescendant={expanded && shown[active] ? `skill-search-${shown[active].id}` : undefined}
          aria-autocomplete="list"
          autoComplete="off"
          spellCheck={false}
          placeholder="Search the map"
          value={query}
          onChange={(event) => {
            onQuery(event.target.value)
            setActive(0)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            setOpen(false)
            onHover(null)
          }}
          onKeyDown={onKeyDown}
        />
        <InputGroupAddon align="inline-end">
          {query ? (
            <InputGroupButton size="icon-xs" aria-label="Clear search" onClick={() => onQuery("")}>
              <X />
            </InputGroupButton>
          ) : (
            shortcut && <Kbd>/</Kbd>
          )}
        </InputGroupAddon>
      </InputGroup>

      {expanded && (
        <div className="absolute inset-x-0 top-full z-30 mt-1 overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-lg">
          <ul id="skill-search-results" role="listbox" aria-label="Matches" className={cn("flex flex-col p-1", !shown.length && "hidden")}>
            {shown.map((node, index) => (
              <li
                key={node.id}
                id={`skill-search-${node.id}`}
                role="option"
                aria-selected={index === active}
                // Keeps the input focused, so the click lands before the list closes.
                onPointerDown={(event) => event.preventDefault()}
                onClick={() => choose(node)}
                onPointerEnter={() => {
                  setActive(index)
                  onHover(node.id)
                }}
                onPointerLeave={() => onHover(null)}
                className={cn(
                  "flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm",
                  index === active && "bg-muted"
                )}
              >
                <Dot color={tokenOf(node)} />
                <span className={cn("shrink-0", node.kind === "project" && "italic")}>{node.label}</span>
                <span className="truncate text-xs text-muted-foreground">
                  {node.kind === "field" ? "Field" : node.kind === "project" ? `Project · ${node.project?.year}` : node.paths[0]?.join(" › ")}
                </span>
              </li>
            ))}
          </ul>
          <p className={cn("border-border px-3 py-1.5 text-xs text-muted-foreground", shown.length > 0 && "border-t")}>
            {matches.length === 0
              ? "Not on the map"
              : matches.length > shown.length
                ? `${matches.length} matches, lit up in the map`
                : `${matches.length} ${matches.length === 1 ? "match" : "matches"} · Enter to fly there`}
          </p>
        </div>
      )}
    </div>
  )
}

function IntroPanel({ graph, onSelect, onWander }: { graph: Graph; onSelect: (id: string) => void; onWander: () => void }) {
  const things = graph.nodes.filter((node) => node.kind === "skill" || node.kind === "area").length
  return (
    <div className="flex flex-col gap-5 p-5">
      <div className="flex flex-col gap-2">
        <h3 className="font-semibold tracking-tight">A map of what I know</h3>
        <p className="text-pretty text-sm leading-relaxed text-muted-foreground">
          The software world as I see it, with only the parts I have worked in: {things} things across{" "}
          {graph.fields.length} fields. Fly into a field, then follow what sits inside it.
        </p>
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Start somewhere</span>
        <div className="grid grid-cols-2 gap-2">
          {graph.fields.map((field, index) => (
            <Button key={field.id} variant="outline" size="sm" onClick={() => onSelect(field.id)} className="justify-start">
              <Dot color={fieldToken(index)} />
              {field.label}
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
  graph,
  node,
  canGoBack,
  wandering,
  onSelect,
  onHover,
  onBack,
  onClear,
  onWander,
}: {
  graph: Graph
  node: SkillNode
  canGoBack: boolean
  wandering: boolean
  onSelect: (id: string) => void
  onHover: (id: string | null) => void
  onBack: () => void
  onClear: () => void
  onWander: () => void
}) {
  const nodesOf = (ids: string[]) => ids.map((id) => graph.byId.get(id)!).filter(Boolean)
  // A project lists what it was built with; anything else lists what sits inside it, and its projects.
  const inside = nodesOf(node.children)
  const builtWith = node.kind === "project" ? inside : []
  const sections = [
    { title: node.kind === "project" ? "Built with" : "Inside", items: node.kind === "project" ? builtWith : inside.filter((child) => child.kind !== "project") },
    { title: "Projects", items: node.kind === "project" ? [] : nodesOf(node.parents).filter((parent) => parent.kind === "project") },
    // Where else it sits, beyond the path shown in the header.
    { title: "Also part of", items: node.paths.slice(1).map((path) => graph.byId.get(slug(path.at(-1) ?? ""))!).filter(Boolean) },
  ].filter((section) => section.items.length > 0)
  const crumbs = node.paths[0] ?? []

  return (
    <>
      <div className="flex items-start justify-between gap-3 border-b border-border p-5">
        <div className="flex min-w-0 flex-col gap-1">
          <span className="flex flex-wrap items-center gap-x-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <Dot color={tokenOf(node)} className="mr-0.5" />
            {node.kind === "project" && `Project · ${node.project?.year}`}
            {node.kind === "field" && "Field"}
            {crumbs.map((label, index) => (
              <Fragment key={label}>
                {index > 0 && <span aria-hidden>›</span>}
                <button type="button" onClick={() => onSelect(slug(label))} className="uppercase transition-colors hover:text-foreground">
                  {label}
                </button>
              </Fragment>
            ))}
          </span>
          <h3 className="truncate text-xl font-semibold tracking-tight">{node.label}</h3>
          {node.project && <p className="text-pretty text-sm leading-relaxed text-muted-foreground">{node.project.description}</p>}
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

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
        {sections.map((section) => (
          <div key={section.title} className="flex flex-col gap-2">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{section.title}</span>
            <div className="flex flex-wrap gap-1.5">
              {section.items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelect(item.id)}
                  onPointerEnter={() => onHover(item.id)}
                  onPointerLeave={() => onHover(null)}
                  onFocus={() => onHover(item.id)}
                  onBlur={() => onHover(null)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs transition-colors hover:bg-muted",
                    item.kind === "project" && "italic"
                  )}
                >
                  <Dot color={tokenOf(item)} className="size-1.5" />
                  {item.label}
                  {/* How much more there is to find in there. */}
                  {item.children.length > 0 && item.kind !== "project" && (
                    <span className="tabular-nums text-muted-foreground">{item.children.length}</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        ))}
        {sections.length === 0 && node.projects.length === 0 && (
          <p className="text-sm text-muted-foreground">Nothing further in here.</p>
        )}
      </div>

      {(node.project || node.projects.length > 0) && (
        <div className="flex flex-col gap-2 border-t border-border p-4">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {node.project ? "Open it" : "Built with it"}
          </span>
          <div className="flex flex-wrap gap-1.5">
            {(node.project
              ? [
                  { title: "Repository", href: node.project.href },
                  ...(node.project.live ? [{ title: "Live", href: node.project.live }] : []),
                ]
              : node.projects
            ).map((project) => (
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

      <p className="hidden border-t border-border px-4 py-2 text-2xs text-muted-foreground lg:block">
        <Kbd>Backspace</Kbd> back · <Kbd>Esc</Kbd> close
      </p>
    </>
  )
}

// Without WebGL the map is a flat list in the same colors; the panel still walks it.
function FlatGraph({
  graph,
  focus,
  highlight,
  onSelect,
}: {
  graph: Graph
  focus: string | null
  highlight: ReadonlySet<string> | null
  onSelect: (id: string) => void
}) {
  const near = new Set(focus ? neighborsOf(graph, focus) : [])
  return (
    <div className="flex h-full flex-wrap content-center justify-center gap-2 overflow-y-auto p-6">
      {graph.nodes.map((node) => (
        <button
          key={node.id}
          type="button"
          onClick={() => onSelect(node.id)}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs transition-opacity",
            node.kind === "field" && "font-semibold uppercase",
            node.id === focus && "border-primary text-foreground",
            (focus ? node.id !== focus && !near.has(node.id) : !!highlight && !highlight.has(node.id)) && "opacity-30"
          )}
        >
          <Dot color={tokenOf(node)} />
          {node.label}
        </button>
      ))}
    </div>
  )
}
