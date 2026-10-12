// The skills section draws the toolkit as a graph: skills and the domains they serve are nodes, and
// every edge says why two of them belong together. content/skills.json is the source of truth (edited
// at /skills in development); projects are joined in from their tech lists, so the graph stays honest
// as the project list grows. Pure, so it runs on the server, in the browser and in the editor's preview.
import data from "@/content/skills.json"
import type { Project } from "@/lib/portfolio"

export type SkillsData = {
  groups: { id: string; label: string }[]
  domains: { id: string; label: string }[]
  // Aliases are other spellings in project tech lists ("Node" for Node.js).
  skills: { id: string; label: string; group: string; aliases?: string[] }[]
  // Undirected; the note reads from either end.
  links: { a: string; b: string; note?: string }[]
}

export const skillsData = data as SkillsData

export type ProjectRef = { title: string; href: string }

export type SkillNode = {
  id: string
  label: string
  kind: "skill" | "domain" | "project"
  // Index into the graph's groups, for skills.
  group?: number
  // For skills: projects whose tech lists it.
  projects: ProjectRef[]
  // For project nodes.
  project?: { description: string; year: string; type: string; href: string; live?: string }
}

export type SkillEdge = {
  source: string
  target: string
  note?: string
  // Projects that list both ends, or the project an edge belongs to.
  projects: string[]
}

export type SkillGraph = {
  groups: SkillsData["groups"]
  nodes: SkillNode[]
  edges: SkillEdge[]
  byId: Map<string, SkillNode>
  adjacency: Map<string, { id: string; edge: SkillEdge }[]>
}

export type Arrangement = "web" | "kind" | "domain"
export type Vec3 = [number, number, number]

export const slug = (label: string) =>
  label
    .toLowerCase()
    .replace(/\+/g, "p")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")

export function buildGraph(data: SkillsData, projects: Project[], { withProjects = false } = {}): SkillGraph {
  const groupIndex = new Map(data.groups.map((group, index) => [group.id, index]))
  const nodes: SkillNode[] = [
    ...data.skills.map((skill): SkillNode => ({
      id: skill.id,
      label: skill.label,
      kind: "skill",
      group: groupIndex.get(skill.group),
      projects: [],
    })),
    ...data.domains.map((domain): SkillNode => ({ id: domain.id, label: domain.label, kind: "domain", projects: [] })),
  ]
  const byId = new Map(nodes.map((node) => [node.id, node]))
  const byName = new Map<string, SkillNode>()
  for (const skill of data.skills) {
    for (const name of [skill.label, ...(skill.aliases ?? [])]) byName.set(name.toLowerCase(), byId.get(skill.id)!)
  }

  const edges = new Map<string, SkillEdge>()
  const link = (a: SkillNode, b: SkillNode) => {
    const key = a.id < b.id ? `${a.id}|${b.id}` : `${b.id}|${a.id}`
    const edge = edges.get(key) ?? { source: a.id, target: b.id, projects: [] }
    edges.set(key, edge)
    return edge
  }

  for (const { a, b, note } of data.links) {
    const from = byId.get(a)
    const to = byId.get(b)
    if (from && to && from !== to) link(from, to).note = note
  }

  for (const project of projects) {
    const used = [...new Set(project.tech.map((tech) => byName.get(tech.toLowerCase())))].filter((node) => node !== undefined)
    if (used.length === 0) continue
    for (const skill of used) skill.projects.push({ title: project.title, href: project.href })

    if (withProjects) {
      // The project stands between its skills, so "used together" is a path through it.
      const node: SkillNode = {
        id: `project:${slug(project.title)}`,
        label: project.title,
        kind: "project",
        projects: [],
        project: { description: project.description, year: project.year, type: project.type, href: project.href, live: project.live },
      }
      nodes.push(node)
      byId.set(node.id, node)
      for (const skill of used) link(node, skill).projects.push(project.title)
    } else {
      // Skills used together in a project are connected, whatever the curated links say.
      used.forEach((a, i) => used.slice(i + 1).forEach((b) => link(a, b).projects.push(project.title)))
    }
  }

  const adjacency = new Map<string, { id: string; edge: SkillEdge }[]>(nodes.map((node) => [node.id, []]))
  for (const edge of edges.values()) {
    adjacency.get(edge.source)!.push({ id: edge.target, edge })
    adjacency.get(edge.target)!.push({ id: edge.source, edge })
  }

  return { groups: data.groups, nodes, edges: [...edges.values()], byId, adjacency }
}

export const neighborsOf = (graph: SkillGraph, id: string) => graph.adjacency.get(id) ?? []

export type Issue = { id?: string; message: string }

// What would make the file unreadable or a link point nowhere. The editor shows these and refuses to save.
export function validate(data: SkillsData): Issue[] {
  const issues: Issue[] = []
  const groupIds = new Set<string>()
  for (const group of data.groups) {
    if (!group.label.trim()) issues.push({ id: group.id, message: "A group has no name" })
    if (groupIds.has(group.id)) issues.push({ id: group.id, message: `Two groups share the id "${group.id}"` })
    groupIds.add(group.id)
  }

  const nodeIds = new Set<string>()
  for (const node of [...data.skills, ...data.domains]) {
    if (!node.id) issues.push({ message: `"${node.label}" has no id` })
    if (!node.label.trim()) issues.push({ id: node.id, message: `"${node.id}" has no name` })
    if (nodeIds.has(node.id)) issues.push({ id: node.id, message: `Two nodes share the id "${node.id}"` })
    nodeIds.add(node.id)
  }
  for (const skill of data.skills) {
    if (!groupIds.has(skill.group)) issues.push({ id: skill.id, message: `${skill.label} is in a group that does not exist` })
  }

  const pairs = new Set<string>()
  for (const { a, b } of data.links) {
    if (!nodeIds.has(a) || !nodeIds.has(b)) issues.push({ id: nodeIds.has(a) ? a : b, message: `A link points to a missing node (${a} and ${b})` })
    if (a === b) issues.push({ id: a, message: `${a} links to itself` })
    const key = a < b ? `${a}|${b}` : `${b}|${a}`
    if (pairs.has(key)) issues.push({ id: a, message: `${a} and ${b} are linked twice` })
    pairs.add(key)
  }
  return issues
}

// Only the known fields, trimmed, and nothing empty, so the file holds exactly what the graph reads.
export function normalize(data: SkillsData): SkillsData {
  const words = (list?: string[]) => (list ?? []).map((word) => word.trim()).filter(Boolean)
  return {
    groups: data.groups.map(({ id, label }) => ({ id, label: label.trim() })),
    domains: data.domains.map(({ id, label }) => ({ id, label: label.trim() })),
    skills: data.skills.map(({ id, label, group, aliases }) => ({
      id,
      label: label.trim(),
      group,
      ...(words(aliases).length ? { aliases: words(aliases) } : {}),
    })),
    links: data.links.map(({ a, b, note }) => ({ a, b, ...(note?.trim() ? { note: note.trim() } : {}) })),
  }
}

// One entry per line, so a change in the editor is a one-line diff.
export function formatSkillsData(data: SkillsData) {
  const tidy = normalize(data)
  const list = (items: object[]) => (items.length ? `[\n${items.map((item) => `    ${JSON.stringify(item)}`).join(",\n")}\n  ]` : "[]")
  const keys = ["groups", "domains", "skills", "links"] as const
  return `{\n${keys.map((key) => `  "${key}": ${list(tidy[key])}`).join(",\n")}\n}\n`
}

// Layouts. Each arrangement is the same graph settled under a different pull, so switching one
// moves every node from where it is to where it now belongs. Each node starts from a spot seeded by
// its id, so a layout is the same on every load and barely moves when a node is added elsewhere.

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

type Pull = { anchors: Map<string, Vec3>; strength: number; pinned?: Set<string> }

function settle(graph: SkillGraph, pull?: Pull, iterations = 400): Map<string, Vec3> {
  const { nodes, edges } = graph
  if (nodes.length === 0) return new Map()
  const position = nodes.map((node): Vec3 => {
    const anchor = pull?.anchors.get(node.id)
    if (anchor && pull?.pinned?.has(node.id)) return [...anchor]
    const random = seeded(node.id)
    const theta = random() * Math.PI * 2
    const phi = Math.acos(2 * random() - 1)
    const radius = 4 + random() * 2
    return [radius * Math.sin(phi) * Math.cos(theta), radius * Math.cos(phi), radius * Math.sin(phi) * Math.sin(theta)]
  })
  const index = new Map(nodes.map((node, i) => [node.id, i]))
  const springs = edges.map((edge) => [index.get(edge.source)!, index.get(edge.target)!] as const)

  for (let step = 0; step < iterations; step++) {
    const cooling = 1 - step / iterations
    const force = nodes.map((): Vec3 => [0, 0, 0])

    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const d = [0, 1, 2].map((axis) => position[i][axis] - position[j][axis])
        const distance2 = Math.max(d[0] ** 2 + d[1] ** 2 + d[2] ** 2, 0.01)
        const push = 1.6 / distance2
        for (let axis = 0; axis < 3; axis++) {
          force[i][axis] += d[axis] * push
          force[j][axis] -= d[axis] * push
        }
      }
    }

    for (const [i, j] of springs) {
      const d = [0, 1, 2].map((axis) => position[j][axis] - position[i][axis])
      const distance = Math.sqrt(d[0] ** 2 + d[1] ** 2 + d[2] ** 2) || 0.01
      const stretch = (distance - 2.6) * 0.08
      for (let axis = 0; axis < 3; axis++) {
        force[i][axis] += d[axis] * stretch
        force[j][axis] -= d[axis] * stretch
      }
    }

    nodes.forEach((node, i) => {
      if (pull?.pinned?.has(node.id)) return
      const anchor = pull?.anchors.get(node.id)
      for (let axis = 0; axis < 3; axis++) {
        // A faint pull to the middle keeps loose ends from drifting off.
        force[i][axis] -= position[i][axis] * 0.04
        if (anchor) force[i][axis] += (anchor[axis] - position[i][axis]) * pull!.strength
        position[i][axis] += Math.max(-0.6, Math.min(0.6, force[i][axis] * 0.08)) * cooling
      }
    })
  }

  // Center the result so the camera can orbit the middle, and size it to one radius so every
  // arrangement fills the same frame.
  const center = [0, 1, 2].map((axis) => position.reduce((sum, p) => sum + p[axis], 0) / position.length)
  const centered = position.map((p) => p.map((value, axis) => value - center[axis]) as Vec3)
  const scale = RADIUS / (Math.max(...centered.map((p) => Math.hypot(...p))) || 1)
  return new Map(nodes.map((node, i) => [node.id, centered[i].map((value) => value * scale) as Vec3]))
}

function byKind(graph: SkillGraph) {
  // Each skill group gathers round its own anchor; domains and projects sit where their skills pull them.
  const points = sphere(graph.groups.length, 6)
  const anchors = new Map<string, Vec3>()
  for (const node of graph.nodes) if (node.group !== undefined) anchors.set(node.id, points[node.group])
  return settle(graph, { anchors, strength: 1.2 })
}

function byDomain(graph: SkillGraph) {
  // Domains are pinned apart. A skill sits at the middle of the domains it serves, so one shared by
  // two domains lands between them; skills that serve none drift to the center.
  const domains = graph.nodes.filter((node) => node.kind === "domain")
  const points = sphere(domains.length, 4.8)
  const corner = new Map<string, Vec3>(domains.map((domain, i) => [domain.id, points[i]]))
  const anchors = new Map(corner)
  for (const node of graph.nodes) {
    if (node.kind !== "skill") continue
    const served = neighborsOf(graph, node.id).flatMap(({ id }) => (corner.has(id) ? [corner.get(id)!] : []))
    if (served.length === 0) continue
    anchors.set(node.id, [0, 1, 2].map((axis) => (served.reduce((sum, a) => sum + a[axis], 0) / served.length) * 0.82) as Vec3)
  }
  return settle(graph, { anchors, strength: 0.6, pinned: new Set(corner.keys()) })
}

const layouts = new WeakMap<SkillGraph, Partial<Record<Arrangement, Map<string, Vec3>>>>()

export function layoutFor(graph: SkillGraph, arrangement: Arrangement): Map<string, Vec3> {
  const cached = layouts.get(graph) ?? {}
  layouts.set(graph, cached)
  cached[arrangement] ??= arrangement === "kind" ? byKind(graph) : arrangement === "domain" ? byDomain(graph) : settle(graph)
  return cached[arrangement]
}
