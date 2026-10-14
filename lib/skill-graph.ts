// The skills section draws a map of the world as I see it, holding only what I have worked with.
// content/skills.md is the source of truth: a nested bullet list, where nesting places a thing in
// the world and draws its edges. A name that appears in two places is one node under both parents.
// Projects join in from their tech lists. Pure, so it runs on the server, in the browser and in the
// outliner's preview.
import type { Project } from "@/lib/portfolio"

export type OutlineRow = { depth: number; text: string }
// The file is a comment (kept as is) followed by the list.
export type Outline = { preamble: string; rows: OutlineRow[] }

const ROW = /^(\s*)[-*+]\s+(.*?)\s*$/

export function parseOutline(source: string): Outline {
  const lines = source.split(/\r?\n/)
  const first = lines.findIndex((line) => ROW.test(line))
  const rows: OutlineRow[] = []
  for (const line of first === -1 ? [] : lines.slice(first)) {
    const match = ROW.exec(line)
    if (!match) continue
    rows.push({ depth: Math.floor(match[1].replace(/\t/g, "  ").length / 2), text: match[2] })
  }
  return { preamble: (first === -1 ? source : lines.slice(0, first).join("\n")).trim(), rows: tidy(rows) }
}

/** No empty rows, and none more than one level deeper than the row above it. */
export function tidy(rows: OutlineRow[]): OutlineRow[] {
  const out: OutlineRow[] = []
  for (const row of rows) {
    const text = row.text.trim()
    if (!text) continue
    const deepest = out.length ? out[out.length - 1].depth + 1 : 0
    out.push({ depth: Math.max(0, Math.min(row.depth, deepest)), text })
  }
  return out
}

export function formatOutline({ preamble, rows }: Outline) {
  const list = tidy(rows)
    .map((row) => `${"  ".repeat(row.depth)}- ${row.text}`)
    .join("\n")
  return `${preamble ? `${preamble}\n\n` : ""}${list}\n`
}

export const slug = (label: string) =>
  label
    .toLowerCase()
    .replace(/\+/g, "p")
    .replace(/#/g, "sharp")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")

export type ProjectRef = { title: string; href: string }

export type SkillNode = {
  id: string
  label: string
  // A field is a top-level entry, an area holds other entries, a skill holds none.
  kind: "field" | "area" | "skill"
  // The shallowest level it appears at.
  depth: number
  // Fields it sits under (by index into graph.fields); the first one colors it.
  fields: number[]
  // Labels from the field down to its parent, once per place it appears.
  paths: string[][]
  parents: string[]
  children: string[]
  // Projects whose tech lists it.
  projects: ProjectRef[]
}

// Parent to child.
export type SkillEdge = { source: string; target: string }

export type SkillGraph = {
  fields: SkillNode[]
  nodes: SkillNode[]
  edges: SkillEdge[]
  byId: Map<string, SkillNode>
  adjacency: Map<string, string[]>
}

export type Vec3 = [number, number, number]

// Project tech lists are free text; these name the node they mean when the spelling differs.
const techAliases: Record<string, string> = {
  tailwind: "Tailwind CSS",
  pi: "Pi agent",
  "chrome extension": "Chrome extensions",
  gem: "Gems",
}
const spelling = (text: string) =>
  text
    .toLowerCase()
    .replace(/\.js$/, "")
    .replace(/[^a-z0-9+#]/g, "")

export function buildGraph(rows: OutlineRow[], projects: Project[]): SkillGraph {
  const byId = new Map<string, SkillNode>()
  const nodes: SkillNode[] = []
  const fields: SkillNode[] = []
  const edges = new Map<string, SkillEdge>()
  const link = (source: SkillNode, target: SkillNode) => {
    const key = `${source.id}>${target.id}`
    if (source === target || edges.has(key)) return
    edges.set(key, { source: source.id, target: target.id })
    if (!source.children.includes(target.id)) source.children.push(target.id)
    if (!target.parents.includes(source.id)) target.parents.push(source.id)
  }

  // Ancestors of the current row, by depth.
  const stack: SkillNode[] = []
  for (const row of tidy(rows)) {
    const id = slug(row.text) || row.text
    let node = byId.get(id)
    if (!node) {
      node = { id, label: row.text, kind: "skill", depth: row.depth, fields: [], paths: [], parents: [], children: [], projects: [] }
      byId.set(id, node)
      nodes.push(node)
    }
    stack.length = row.depth
    if (row.depth === 0 && !fields.includes(node)) fields.push(node)
    const parent = stack[row.depth - 1]
    if (parent) link(parent, node)
    const field = fields.indexOf(stack[0] ?? node)
    if (!node.fields.includes(field)) node.fields.push(field)
    node.depth = Math.min(node.depth, row.depth)
    node.paths.push(stack.map((ancestor) => ancestor.label))
    stack[row.depth] = node
  }
  for (const node of nodes) node.kind = fields.includes(node) ? "field" : node.children.length ? "area" : "skill"

  const byName = new Map(nodes.map((node) => [spelling(node.label), node]))
  for (const project of projects) {
    const used = [...new Set(project.tech.map((tech) => byName.get(spelling(techAliases[tech.toLowerCase()] ?? tech))))].filter(
      (node) => node !== undefined
    )
    for (const node of used) node.projects.push({ title: project.title, href: project.href })
  }

  const adjacency = new Map<string, string[]>(nodes.map((node) => [node.id, []]))
  for (const edge of edges.values()) {
    adjacency.get(edge.source)!.push(edge.target)
    adjacency.get(edge.target)!.push(edge.source)
  }

  return { fields, nodes, edges: [...edges.values()], byId, adjacency }
}

export const neighborsOf = (graph: SkillGraph, id: string) => graph.adjacency.get(id) ?? []

// Search ignores case, spaces and punctuation, so "nextjs" finds Next.js and "tail" finds Tailwind CSS.
const searchable = (text: string) => text.toLowerCase().replace(/[^a-z0-9+#]/g, "")

/** How well a label answers a query: 0 for the name itself, then prefix, word start, anywhere; null for no match. */
export function matchRank(label: string, query: string) {
  const want = searchable(query)
  const have = searchable(label)
  if (!want) return null
  if (have === want) return 0
  if (have.startsWith(want)) return 1
  if (label.toLowerCase().split(/[^a-z0-9+#]+/).some((word) => word.startsWith(want))) return 2
  return have.includes(want) ? 3 : null
}

const kindOrder: Record<SkillNode["kind"], number> = { field: 0, area: 1, skill: 2 }

/** Nodes matching a query, best first: closer matches, then broader things, then shorter names. */
export function searchGraph(graph: SkillGraph, query: string) {
  return graph.nodes
    .map((node) => ({ node, rank: matchRank(node.label, query) }))
    .filter((hit): hit is { node: SkillNode; rank: number } => hit.rank !== null)
    .sort(
      (a, b) =>
        a.rank - b.rank ||
        kindOrder[a.node.kind] - kindOrder[b.node.kind] ||
        a.node.label.length - b.node.label.length ||
        a.node.label.localeCompare(b.node.label)
    )
    .map((hit) => hit.node)
}

// The layout. Each node starts from a spot seeded by its id, so the map is the same on every load
// and barely moves when a node is added elsewhere.

/** How far the outermost node sits from the center, in scene units. */
export const RADIUS = 6.5

function seeded(text: string) {
  let seed = 7
  for (const char of text) seed = (seed * 31 + char.charCodeAt(0)) % 2147483647
  seed = seed || 1
  return () => {
    seed = (seed * 16807) % 2147483647
    return seed / 2147483647
  }
}

// Points spread evenly over a sphere, for any number of anchors.
function sphere(count: number, radius: number): Vec3[] {
  return Array.from({ length: count }, (_, i) => {
    const y = count === 1 ? 0 : 1 - (2 * i) / (count - 1)
    const ring = Math.sqrt(1 - y * y)
    const angle = i * Math.PI * (3 - Math.sqrt(5))
    return [Math.cos(angle) * ring * radius, y * radius * 0.85, Math.sin(angle) * ring * radius]
  })
}

type Pull = { anchors: Map<string, Vec3>; strength: number }

function settle(graph: SkillGraph, pull: Pull, iterations = 260): Map<string, Vec3> {
  const { nodes, edges } = graph
  if (nodes.length === 0) return new Map()
  const position = nodes.map((node): Vec3 => [...(pull.anchors.get(node.id) ?? [0, 0, 0])])
  const index = new Map(nodes.map((node, i) => [node.id, i]))
  const springs = edges.map((edge) => [index.get(edge.source)!, index.get(edge.target)!] as const)
  const force = nodes.map((): Vec3 => [0, 0, 0])

  for (let step = 0; step < iterations; step++) {
    const cooling = 1 - step / iterations
    for (const f of force) f.fill(0)

    for (let i = 0; i < nodes.length; i++) {
      const p = position[i]
      for (let j = i + 1; j < nodes.length; j++) {
        const q = position[j]
        const dx = p[0] - q[0]
        const dy = p[1] - q[1]
        const dz = p[2] - q[2]
        const push = 1.6 / Math.max(dx * dx + dy * dy + dz * dz, 0.01)
        force[i][0] += dx * push
        force[i][1] += dy * push
        force[i][2] += dz * push
        force[j][0] -= dx * push
        force[j][1] -= dy * push
        force[j][2] -= dz * push
      }
    }

    for (const [i, j] of springs) {
      const d = [0, 1, 2].map((axis) => position[j][axis] - position[i][axis])
      const stretch = (Math.hypot(d[0], d[1], d[2]) - 2) * 0.08
      for (let axis = 0; axis < 3; axis++) {
        force[i][axis] += d[axis] * stretch
        force[j][axis] -= d[axis] * stretch
      }
    }

    nodes.forEach((node, i) => {
      const anchor = pull.anchors.get(node.id)
      for (let axis = 0; axis < 3; axis++) {
        // A faint pull to the middle keeps loose ends from drifting off.
        force[i][axis] -= position[i][axis] * 0.04
        if (anchor) force[i][axis] += (anchor[axis] - position[i][axis]) * pull.strength
        position[i][axis] += Math.max(-0.6, Math.min(0.6, force[i][axis] * 0.08)) * cooling
      }
    })
  }

  // Center the result so the camera can orbit the middle, and size it to one radius so the camera
  // frames it the same whatever the outline holds.
  const center = [0, 1, 2].map((axis) => position.reduce((sum, p) => sum + p[axis], 0) / position.length)
  const centered = position.map((p) => p.map((value, axis) => value - center[axis]) as Vec3)
  const scale = RADIUS / (Math.max(...centered.map((p) => Math.hypot(...p))) || 1)
  return new Map(nodes.map((node, i) => [node.id, centered[i].map((value) => value * scale) as Vec3]))
}

// The map: fields round a core, and every level further out in the direction of its parents, so a
// field reads as a continent and its specifics as the coast.
const SHELLS = [2.6, 4.6, 6.3, 7.6, 8.6]

function byMap(graph: SkillGraph) {
  const anchors = new Map<string, Vec3>()
  const points = sphere(graph.fields.length, SHELLS[0])
  graph.fields.forEach((field, i) => anchors.set(field.id, points[i]))
  const rest = graph.nodes.filter((node) => !anchors.has(node.id)).sort((a, b) => a.depth - b.depth)
  for (const node of rest) {
    const from = node.parents.map((id) => anchors.get(id)).filter((anchor) => anchor !== undefined)
    const random = seeded(node.id)
    // Siblings start a little apart, so they fan out instead of stacking on their parent's line.
    const direction = [0, 1, 2].map((axis) => from.reduce((sum, anchor) => sum + anchor[axis], 0) + (random() - 0.5) * 1.2)
    const length = Math.hypot(...direction) || 1
    const shell = SHELLS[Math.min(node.depth, SHELLS.length - 1)]
    anchors.set(node.id, direction.map((value) => (value / length) * shell) as Vec3)
  }
  return settle(graph, { anchors, strength: 0.3 })
}

const layouts = new WeakMap<SkillGraph, Map<string, Vec3>>()

export function layoutFor(graph: SkillGraph): Map<string, Vec3> {
  let layout = layouts.get(graph)
  if (!layout) layouts.set(graph, (layout = byMap(graph)))
  return layout
}
