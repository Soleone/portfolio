"use client"

import { useReducedMotion } from "motion/react"
import dynamic from "next/dynamic"
import { ArrowLeft, ArrowUpRight, Search, X } from "lucide-react"
import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent } from "react"
import { useTheme } from "@/components/soleone/theme"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandItem, CommandList } from "@/components/ui/command"
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group"
import { Kbd } from "@/components/ui/kbd"
import { projects } from "@/lib/portfolio"
import { buildGraph, neighborsOf, searchGraph, slug, type OutlineRow, type SkillGraph as Graph, type SkillNode, type Vec3 } from "@/lib/skill-graph"
import { cn } from "@/lib/utils"
import type { GraphColors } from "./skill-graph-scene"

// Keep all three.js code behind this boundary, including color conversion.
const Scene = dynamic(() => import("./skill-graph-scene"), { ssr: false })

// Each field takes one of the theme's eight tints; everything in it shares the color.
export const fieldToken = (field: number) => `var(--tint-${(field % 8) + 1})`
const tokenOf = (node: Pick<SkillNode, "fields">) => fieldToken(node.fields[0] ?? 0)

// A swatch in a field's tint. The tint arrives as a CSS variable, so it is handed over as one.
export function Dot({ color, className }: { color: string; className?: string }) {
  return <span className={cn("size-2 shrink-0 rounded-full bg-(--dot)", className)} style={{ "--dot": color } as CSSProperties} />
}

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
      return `rgb(${r}, ${g}, ${b})`
    }
    setColors({
      fields: Array.from({ length: fieldCount }, (_, field) => read(fieldToken(field))),
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
    // Warm the graphics code ahead of a scroll without starting a WebGL renderer off screen.
    const preload = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        void import("./skill-graph-scene")
        preload.disconnect()
      },
      { rootMargin: "1000px" }
    )
    preload.observe(ref.current)
    return () => {
      observer.disconnect()
      preload.disconnect()
    }
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
  layout,
  stacked = false,
  selected,
  onFocusChange,
  search,
}: {
  outline: OutlineRow[]
  // The public page settles its layout at build time; the live outliner still computes its own.
  layout?: [string, Vec3][]
  // One column, panel under the stage, for narrow hosts like the outliner's preview.
  stacked?: boolean
  // Lets a host (the outliner) point the graph at a node, and hear where the visitor walks.
  selected?: string | null
  onFocusChange?: (id: string | null) => void
  // A host with its own search box passes its query; without one the graph shows its own box.
  search?: string
}) {
  const [ownQuery, setOwnQuery] = useState("")
  const [trail, setTrail] = useState<string[]>([])
  const [hover, setHover] = useState<string | null>(null)
  const [webgl, setWebgl] = useState(true)
  const [stage, near] = useNearViewport<HTMLDivElement>()
  const reducedMotion = useReducedMotion() ?? false
  const graph = useMemo(() => buildGraph(outline, projects), [outline])
  const colors = useGraphColors(graph.fields.length)
  // Nodes can leave the graph (an entry deleted in the outliner); the path skips them.
  const path = useMemo(() => trail.filter((id) => graph.byId.has(id)), [trail, graph])
  const focus = path.at(-1) ?? null
  const query = search ?? ownQuery
  const matches = useMemo(() => (query.trim() ? searchGraph(graph, query) : null), [graph, query])
  // Search matches are what the scene picks out.
  const highlight = useMemo(() => (matches ? new Set(matches.map((node) => node.id)) : null), [matches])

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

  function onSearch(value: string) {
    setOwnQuery(value)
    setHover(null)
    // A focused node outshines everything else, so a new search lets go of it.
    if (value.trim() && focus) clear()
  }

  function onKeyDown(event: KeyboardEvent) {
    const typing = event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement
    if (typing && event.key !== "Escape") return
    if (event.key === "Escape" && focus) clear()
    else if (event.key === "Escape" && ownQuery) onSearch("")
    else if (event.key === "Backspace" && focus) {
      event.preventDefault()
      back()
    }
  }

  return (
    <div className={cn("grid gap-4", !stacked && "mt-10 lg:grid-cols-[minmax(0,1fr)_300px]")} onKeyDown={onKeyDown}>
      <div className="flex flex-col gap-3">
        <div
          ref={stage}
          className={cn(
            "relative isolate",
            // On the page the map sits straight on the background; in the outliner it keeps a frame.
            stacked ? "h-[440px] overflow-hidden rounded-xl border border-border bg-card/40" : "h-[420px] sm:h-[540px]"
          )}
        >
          {/* A soft well of light behind the graph, in the theme's own brand color. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10 bg-radial from-primary/12 to-transparent to-65% opacity-60"
          />
          {/* Unframed, the edges fade out instead of cutting the map off. */}
          <div className={cn("absolute inset-0", !stacked && "mask-radial-from-55% mask-radial-to-80%")}>
            {near.ever && webgl && colors ? (
              <Scene
                graph={graph}
                layout={layout}
                paused={!near.now}
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
          </div>

          {path.length > 0 && (
            <div className="absolute inset-x-3 bottom-3 z-20 flex">
              <div className="rounded-md bg-background/70 px-2 py-1 backdrop-blur-sm">
                <Breadcrumb aria-label="Your path through the map">
                  <BreadcrumbList>
                    {path.map((id, index) => (
                      <Fragment key={`${id}-${index}`}>
                        {index > 0 && <BreadcrumbSeparator />}
                        <BreadcrumbItem>
                          {index === path.length - 1 ? (
                            <BreadcrumbPage>{graph.byId.get(id)?.label}</BreadcrumbPage>
                          ) : (
                            <BreadcrumbLink render={<button type="button" onClick={() => select(id)} />}>
                              {graph.byId.get(id)?.label}
                            </BreadcrumbLink>
                          )}
                        </BreadcrumbItem>
                      </Fragment>
                    ))}
                  </BreadcrumbList>
                </Breadcrumb>
              </div>
            </div>
          )}
        </div>

        <p className="hidden text-center text-xs text-muted-foreground sm:block">
          Fields round a core, specifics further out · drag to turn, Shift + scroll to zoom
        </p>
      </div>

      <aside
        aria-live="polite"
        className={cn(
          "flex min-h-0 flex-col overflow-hidden",
          stacked
            ? "max-h-[300px] rounded-xl border border-border bg-card empty:hidden"
            : "max-h-[540px] border-t border-border pt-4 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-4"
        )}
      >
        {search === undefined && (
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
        )}
        {/* While searching, the matches take the panel; stacked, the host has its own intro. */}
        {search === undefined && matches ? null : focus ? (
          <FocusPanel
            graph={graph}
            node={graph.byId.get(focus)!}
            canGoBack={path.length > 1}
            onSelect={select}
            onHover={setHover}
            onBack={back}
            onClear={clear}
          />
        ) : (
          !stacked && <IntroPanel graph={graph} onSelect={select} />
        )}
      </aside>
    </div>
  )
}

// Typing lights up every match in the scene; the list flies to one.
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
  const searching = query.trim() !== ""

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

  return (
    // The ranking is the graph's own, so the list shows matches as given.
    <Command
      shouldFilter={false}
      onValueChange={(id) => onHover(id || null)}
      className={cn("-mx-1 size-auto", searching && "min-h-0 flex-1")}
    >
      {/* A plain input: Command steers its list from any key pressed inside it. */}
      <InputGroup>
        <InputGroupAddon>
          <Search />
        </InputGroupAddon>
        <InputGroupInput
          ref={input}
          aria-label="Search the map"
          placeholder="Search the map"
          autoComplete="off"
          spellCheck={false}
          value={query}
          onChange={(event) => onQuery(event.target.value)}
          onKeyDown={(event) => {
            // Esc lets go of the query first; on an empty box it reaches the graph, which closes the node.
            if (event.key === "Escape" && query) {
              event.stopPropagation()
              onQuery("")
            }
          }}
        />
        <InputGroupAddon align="inline-end">
          {query ? (
            <InputGroupButton
              size="icon-xs"
              aria-label="Clear search"
              onClick={() => {
                onQuery("")
                input.current?.focus()
              }}
            >
              <X />
            </InputGroupButton>
          ) : (
            shortcut && <Kbd>/</Kbd>
          )}
        </InputGroupAddon>
      </InputGroup>
      {searching && (
        <>
          <CommandList className="max-h-none flex-1" onPointerLeave={() => onHover(null)}>
            <CommandEmpty>Not on the map</CommandEmpty>
            {matches.map((node) => (
              <CommandItem key={node.id} value={node.id} onSelect={onSelect}>
                <Dot color={tokenOf(node)} />
                <span className="shrink-0">{node.label}</span>
                <span className="truncate text-xs text-muted-foreground">
                  {node.kind === "field" ? "Field" : node.paths[0]?.join(" › ")}
                </span>
              </CommandItem>
            ))}
          </CommandList>
          {matches.length > 0 && (
            <p className="border-t border-border px-2 py-1.5 text-xs text-muted-foreground">
              {matches.length} {matches.length === 1 ? "match" : "matches"}, lit up in the map · Enter to fly there
            </p>
          )}
        </>
      )}
    </Command>
  )
}

function IntroPanel({ graph, onSelect }: { graph: Graph; onSelect: (id: string) => void }) {
  const things = graph.nodes.filter((node) => node.kind !== "field").length
  return (
    <div className="flex flex-col gap-5 py-5">
      <div className="flex flex-col gap-2">
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
    </div>
  )
}

function FocusPanel({
  graph,
  node,
  canGoBack,
  onSelect,
  onHover,
  onBack,
  onClear,
}: {
  graph: Graph
  node: SkillNode
  canGoBack: boolean
  onSelect: (id: string) => void
  onHover: (id: string | null) => void
  onBack: () => void
  onClear: () => void
}) {
  const sections = [
    { title: "Inside", items: node.children.map((id) => graph.byId.get(id)!).filter(Boolean) },
    // Where else it sits, beyond the path shown in the header.
    { title: "Also part of", items: node.paths.slice(1).map((path) => graph.byId.get(slug(path.at(-1) ?? ""))!).filter(Boolean) },
  ].filter((section) => section.items.length > 0)
  const crumbs = node.paths[0] ?? []

  return (
    <>
      <div className="flex items-start justify-between gap-3 border-b border-border py-4">
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex items-center gap-2">
            <Dot color={tokenOf(node)} />
            <Breadcrumb>
              <BreadcrumbList>
                {node.kind === "field" && <BreadcrumbItem>Field</BreadcrumbItem>}
                {crumbs.map((label, index) => (
                  <Fragment key={label}>
                    {index > 0 && <BreadcrumbSeparator />}
                    <BreadcrumbItem>
                      <BreadcrumbLink render={<button type="button" onClick={() => onSelect(slug(label))} />}>
                        {label}
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                  </Fragment>
                ))}
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          <h3 className="truncate text-xl font-semibold tracking-tight">{node.label}</h3>
        </div>
        <div className="flex shrink-0 gap-1">
          <Button variant="ghost" size="icon-sm" onClick={onBack} disabled={!canGoBack} aria-label="Back" title="Back (Backspace)">
            <ArrowLeft />
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={onClear} aria-label="Close" title="Close (Esc)">
            <X />
          </Button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto py-4">
        {sections.map((section) => (
          <div key={section.title} className="flex flex-col gap-2">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{section.title}</span>
            <div className="flex flex-wrap gap-1.5">
              {section.items.map((item) => (
                <Button
                  key={item.id}
                  variant="outline"
                  size="xs"
                  onClick={() => onSelect(item.id)}
                  onPointerEnter={() => onHover(item.id)}
                  onPointerLeave={() => onHover(null)}
                  onFocus={() => onHover(item.id)}
                  onBlur={() => onHover(null)}
                >
                  <Dot color={tokenOf(item)} className="size-1.5" />
                  {item.label}
                  {/* How much more there is to find in there. */}
                  {item.children.length > 0 && <span className="tabular-nums text-muted-foreground">{item.children.length}</span>}
                </Button>
              ))}
            </div>
          </div>
        ))}
        {sections.length === 0 && node.projects.length === 0 && (
          <p className="text-sm text-muted-foreground">Nothing further in here.</p>
        )}
      </div>

      {node.projects.length > 0 && (
        <div className="flex flex-col gap-2 border-t border-border py-4">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Built with it</span>
          <div className="flex flex-wrap gap-1.5">
            {node.projects.map((project) => (
              <Button
                key={project.href}
                variant="outline"
                size="xs"
                nativeButton={false}
                render={<a href={project.href} target="_blank" rel="noreferrer" />}
              >
                {project.title}
                <ArrowUpRight />
              </Button>
            ))}
          </div>
        </div>
      )}

      <p className="hidden border-t border-border py-2 text-2xs text-muted-foreground lg:block">
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
        <Button
          key={node.id}
          // The focus stands out, what is out of reach recedes.
          variant={
            node.id === focus
              ? "secondary"
              : (focus ? !near.has(node.id) : !!highlight && !highlight.has(node.id))
                ? "ghost"
                : "outline"
          }
          size="xs"
          onClick={() => onSelect(node.id)}
        >
          <Dot color={tokenOf(node)} />
          {node.label}
        </Button>
      ))}
    </div>
  )
}
