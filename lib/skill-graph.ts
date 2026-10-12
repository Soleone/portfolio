// The skills section draws the toolkit as a graph: skills and the domains they serve are nodes, and
// every edge says why two of them belong together. Projects that use both skills add themselves to
// the reason, so the graph stays honest as the project list grows. Pure, so it runs on the server.
import { focusAreas, projects, skillGroups } from "@/lib/portfolio"

export type SkillNode = {
  id: string
  label: string
  kind: "skill" | "domain"
  // Index into skillGroups for skills; domains have none.
  group?: number
  // Projects (title and repo) whose tech lists this skill.
  projects: { title: string; href: string }[]
}

export type SkillEdge = {
  source: string
  target: string
  note?: string
  // Projects that list both ends.
  projects: string[]
}

export type Arrangement = "web" | "kind" | "domain"
export type Vec3 = [number, number, number]

// Project tech is free text; these spell it the way the skill list does.
const aliases: Record<string, string> = {
  Node: "Node.js",
  Tailwind: "Tailwind CSS",
  Pi: "Pi agent",
}

// Curated reasons. The first two entries name nodes by label; the note reads from either end.
const relations: [string, string, string][] = [
  ["TypeScript", "JavaScript", "TypeScript is JavaScript with types"],
  ["Java", "JavaScript", "Only the name in common"],
  ["Java", "C++", "C-family siblings, managed and unmanaged"],
  ["JavaScript", "Node.js", "Node runs JavaScript outside the browser"],
  ["JavaScript", "Vue", "Vue runs straight from a script tag"],
  ["JavaScript", "Three.js", "Three.js is WebGL from JavaScript"],
  ["TypeScript", "React", "Typed components"],
  ["React", "Next.js", "Next.js is React with routing, rendering and a server"],
  ["React", "Remix", "Remix is React built on web standards"],
  ["React", "Three.js", "React Three Fiber draws this graph"],
  ["Ruby", "Rails", "Rails is Ruby's web framework"],
  ["Rails", "SQL", "Active Record sits on SQL"],
  ["Rails", "React", "Rails back ends, React front ends"],
  ["C++", "Unreal Engine", "Gameplay code in Unreal is C++"],
  ["Three.js", "Unreal Engine", "Real-time 3D, browser and native"],
  ["Next.js", "Vercel", "Vercel makes Next.js and hosts this site"],
  ["Next.js", "Tailwind CSS", "This site's stack"],
  ["Tailwind CSS", "CSS", "Tailwind's utility classes compile to CSS"],
  ["shadcn/ui", "Tailwind CSS", "shadcn/ui is styled with Tailwind"],
  ["shadcn/ui", "React", "shadcn/ui is React components you own, not a dependency"],
  ["Framer Motion", "React", "Framer Motion makes animation React state"],
  ["Framer Motion", "CSS", "Springs where CSS transitions stop"],
  ["Git", "Unix", "Both live in the terminal"],
  ["Git", "Vercel", "Every push to main deploys"],
  ["Docker", "Unix", "Containers are Linux processes"],
  ["Docker", "SQL", "A database per container"],
  ["Playwright", "TypeScript", "End-to-end tests in TypeScript"],
  ["Playwright", "Claude", "Playwright lets an agent check its work in a real browser"],
  ["Pi agent", "TypeScript", "Pi extensions are TypeScript"],
  ["Pi agent", "Node.js", "Pi runs on Node"],
  ["Pi agent", "Unix", "Agents work in the shell"],
  ["Pi agent", "Claude", "Claude is one of the models Pi drives"],
  ["Cursor", "Claude", "Cursor puts the model inside the editor"],
  ["Cursor", "Git", "Agents propose, Git keeps score"],
  // Domains, keyed by focus area label.
  ["AI", "Pi agent", "Extensions for tasks, git, memory and subagents"],
  ["AI", "Claude", "Daily driver"],
  ["AI", "Cursor", "Where agent coding started"],
  ["AI", "TypeScript", "Most agent tooling is TypeScript"],
  ["E-commerce", "Ruby", "Nearly 20 years at Shopify"],
  ["E-commerce", "Rails", "Shopify runs on Rails"],
  ["E-commerce", "React", "Shopify admin and the Shop app"],
  ["E-commerce", "SQL", "Payments are rows that must add up"],
  ["Blockchain", "Vue", "Pixelpics and Gunchained"],
  ["Blockchain", "JavaScript", "On-chain levels for a puzzle game"],
  ["Gaming", "Unreal Engine", "A Souls-like prototype"],
  ["Gaming", "C++", "Real-time game code"],
  ["Gaming", "Three.js", "3D in the browser"],
  ["Gaming", "React", "Vibestep and GigQuest"],
  ["Gaming", "Vue", "Pixelpics"],
  ["Gaming", "Ruby", "GameFAQs and SC2Ranks gems"],
]

const slug = (label: string) =>
  label
    .toLowerCase()
    .replace(/\+/g, "p")
    .replace(/[^a-z0-9]+/g, "-")

function buildGraph() {
  const nodes: SkillNode[] = [
    ...skillGroups.flatMap((group, index) =>
      group.items.map((label) => ({ id: slug(label), label, kind: "skill" as const, group: index, projects: [] }))
    ),
    ...focusAreas.map((area) => ({ id: `domain-${slug(area.label)}`, label: area.label, kind: "domain" as const, projects: [] })),
  ]
  const byLabel = new Map<string, SkillNode>()
  // Domains first, so a skill that shares a domain's name (none today) still wins the plain label.
  for (const node of [...nodes].reverse()) byLabel.set(node.label, node)

  for (const project of projects) {
    for (const tech of project.tech) {
      const node = byLabel.get(aliases[tech] ?? tech)
      // Some projects tag a domain ("Gaming") as tech; domains speak through their edges instead.
      if (node?.kind === "skill") node.projects.push({ title: project.title, href: project.href })
    }
  }

  const edges = new Map<string, SkillEdge>()
  const key = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`)
  const link = (a: SkillNode, b: SkillNode) => {
    const id = key(a.id, b.id)
    const edge = edges.get(id) ?? { source: a.id, target: b.id, projects: [] }
    edges.set(id, edge)
    return edge
  }

  for (const [a, b, note] of relations) {
    const from = byLabel.get(a)
    const to = byLabel.get(b)
    if (from && to) link(from, to).note = note
  }

  // Skills used together in a project are connected, whatever the curated list says.
  for (const project of projects) {
    const used = [...new Set(project.tech.map((tech) => byLabel.get(aliases[tech] ?? tech)).filter((node) => node?.kind === "skill"))] as SkillNode[]
    used.forEach((a, i) => used.slice(i + 1).forEach((b) => link(a, b).projects.push(project.title)))
  }

  return { nodes, edges: [...edges.values()] }
}

export const skillGraph = buildGraph()

export const nodeById = new Map(skillGraph.nodes.map((node) => [node.id, node]))

export function neighborsOf(id: string) {
  return skillGraph.edges.flatMap((edge) =>
    edge.source === id ? [{ id: edge.target, edge }] : edge.target === id ? [{ id: edge.source, edge }] : []
  )
}

// Layouts. Each arrangement is the same graph settled under a different pull, so switching one
// moves every node from where it is to where it now belongs. A seeded random start keeps the
// layouts identical on every load.

function seeded(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647
    return seed / 2147483647
  }
}

/** How far the outermost node sits from the center, in scene units. */
export const RADIUS = 6.5

type Pull = { anchors: Map<string, Vec3>; strength: number; pinned?: Set<string> }

function settle(pull?: Pull, iterations = 400): Map<string, Vec3> {
  const { nodes, edges } = skillGraph
  const random = seeded(7)
  const position = nodes.map((node): Vec3 => {
    const anchor = pull?.anchors.get(node.id)
    if (anchor && pull?.pinned?.has(node.id)) return [...anchor]
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
        force[i][axis] += (d[axis] / distance) * stretch * distance
        force[j][axis] -= (d[axis] / distance) * stretch * distance
      }
    }

    nodes.forEach((node, i) => {
      const anchor = pull?.anchors.get(node.id)
      for (let axis = 0; axis < 3; axis++) {
        // A faint pull to the middle keeps loose ends from drifting off.
        force[i][axis] -= position[i][axis] * 0.04
        if (anchor) force[i][axis] += (anchor[axis] - position[i][axis]) * pull!.strength
      }
      if (pull?.pinned?.has(node.id)) return
      for (let axis = 0; axis < 3; axis++) {
        position[i][axis] += Math.max(-0.6, Math.min(0.6, force[i][axis] * 0.08)) * cooling
      }
    })
  }

  // Center the result so the camera can orbit the middle, and size it to one radius so every
  // arrangement fills the same frame.
  const center = [0, 1, 2].map((axis) => position.reduce((sum, p) => sum + p[axis], 0) / position.length)
  const centered = position.map((p) => p.map((value, axis) => value - center[axis]) as Vec3)
  const scale = RADIUS / Math.max(...centered.map((p) => Math.hypot(...p)))
  return new Map(nodes.map((node, i) => [node.id, centered[i].map((value) => value * scale) as Vec3]))
}

function byKind() {
  // Each skill group gathers round its own anchor; domains sit where their skills pull them. Five
  // anchors on a bipyramid (three round the middle, one above, one below) stay apart from any angle.
  const anchors = new Map<string, Vec3>()
  const points: Vec3[] = [0, 1, 2].map((i): Vec3 => {
    const angle = (i / 3) * Math.PI * 2
    return [Math.cos(angle) * 6, 0, Math.sin(angle) * 6]
  })
  points.push([0, 5.5, 0], [0, -5.5, 0])
  for (const node of skillGraph.nodes) if (node.group !== undefined) anchors.set(node.id, points[node.group % points.length])
  return settle({ anchors, strength: 1.2 })
}

function byDomain() {
  // Domains are pinned to the corners of a tetrahedron. A skill sits at the middle of the domains it
  // serves, so one shared by two domains lands between them; skills that serve none drift to the center.
  const domains = skillGraph.nodes.filter((node) => node.kind === "domain")
  const corners: Vec3[] = [
    [1, 1, 1],
    [-1, -1, 1],
    [-1, 1, -1],
    [1, -1, -1],
  ].map((corner) => corner.map((value) => value * 4.8) as Vec3)
  const corner = new Map<string, Vec3>(domains.map((domain, i) => [domain.id, corners[i % corners.length]]))
  const anchors = new Map(corner)
  for (const node of skillGraph.nodes) {
    if (node.kind === "domain") continue
    const served = neighborsOf(node.id).flatMap(({ id }) => (corner.has(id) ? [corner.get(id)!] : []))
    if (served.length === 0) continue
    anchors.set(node.id, [0, 1, 2].map((axis) => (served.reduce((sum, a) => sum + a[axis], 0) / served.length) * 0.82) as Vec3)
  }
  return settle({ anchors, strength: 0.6, pinned: new Set(domains.map((domain) => domain.id)) })
}

export function layoutFor(arrangement: Arrangement): Map<string, Vec3> {
  if (arrangement === "kind") return byKind()
  if (arrangement === "domain") return byDomain()
  return settle()
}
