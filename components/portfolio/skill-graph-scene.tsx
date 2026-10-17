"use client"

import { OrbitControls } from "@react-three/drei"
import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { useEffect, useMemo, useRef, type ComponentRef, type RefObject } from "react"
import * as THREE from "three"
import { cn } from "@/lib/utils"
import { layoutFor, neighborsOf, RADIUS, type SkillGraph, type SkillNode, type Vec3 } from "@/lib/skill-graph"

export type GraphColors = { fields: string[]; edge: string }

export type SceneProps = {
  graph: SkillGraph
  layout?: [string, Vec3][]
  focus: string | null
  hover: string | null
  // Nodes to pick out (a field's members, or search matches); null when nothing is picked out.
  highlight: ReadonlySet<string> | null
  colors: GraphColors
  reducedMotion: boolean
  // Off screen, the scene stops drawing.
  paused: boolean
  onSelect: (id: string) => void
  onHover: (id: string | null) => void
  onClear: () => void
}

// How loud a node or edge is: the one in focus, its neighbours, everything else, and what a highlight or focus pushes back.
type Emphasis = "focus" | "near" | "rest" | "faded"

const SEGMENTS = 10 // straight pieces per curved edge
const PULSES = 64

// The graph by index, which is how the buffers and the frame loop address it.
type Topology = {
  nodes: SkillNode[]
  index: Map<string, number>
  ends: (readonly [number, number])[]
  radius: number[]
}

function topologyOf(graph: SkillGraph): Topology {
  const index = new Map(graph.nodes.map((node, i) => [node.id, i]))
  return {
    nodes: graph.nodes,
    index,
    ends: graph.edges.map((edge) => [index.get(edge.source)!, index.get(edge.target)!] as const),
    radius: graph.nodes.map((node) => (node.kind === "field" ? 0.26 : node.kind === "area" ? 0.15 : 0.1)),
  }
}

// Frame-rate independent easing toward a target.
const ease = (rate: number, delta: number) => 1 - Math.exp(-rate * delta)

function emphasisFor(graph: SkillGraph, { focus, hover, highlight }: Pick<SceneProps, "focus" | "hover" | "highlight">) {
  const active = hover ?? focus
  const lit = new Set(active ? [active, ...neighborsOf(graph, active)] : [])
  const inFilter = (node?: SkillNode) => !highlight || (!!node && highlight.has(node.id))

  const node = graph.nodes.map((node): Emphasis => {
    if (node.id === active || node.id === focus) return "focus"
    if (active) return lit.has(node.id) ? "near" : "faded"
    if (highlight) return inFilter(node) ? "near" : "faded"
    return "rest"
  })
  const edge = graph.edges.map((edge): Emphasis => {
    if (active) return edge.source === active || edge.target === active ? "focus" : "faded"
    if (highlight) return inFilter(graph.byId.get(edge.source)) && inFilter(graph.byId.get(edge.target)) ? "near" : "faded"
    return "rest"
  })
  return { node, edge, active }
}

const nodeOpacity: Record<Emphasis, number> = { focus: 1, near: 1, rest: 0.85, faded: 0.14 }
const edgeOpacity: Record<Emphasis, number> = { focus: 0.9, near: 0.55, rest: 0.22, faded: 0.04 }

// Edges bow away from the middle, so the graph reads as a mesh around a core rather than a tangle of chords.
function curvePoint(a: THREE.Vector3, b: THREE.Vector3, t: number, out: THREE.Vector3) {
  const mid = scratch.mid.addVectors(a, b).multiplyScalar(0.5)
  const bend = mid.lengthSq() > 0.25 ? scratch.bend.copy(mid).normalize() : scratch.bend.set(0, 1, 0)
  const control = bend.multiplyScalar(a.distanceTo(b) * 0.22).add(mid)
  const u = 1 - t
  return out
    .copy(a)
    .multiplyScalar(u * u)
    .addScaledVector(control, 2 * u * t)
    .addScaledVector(b, t * t)
}
const scratch = { mid: new THREE.Vector3(), bend: new THREE.Vector3(), point: new THREE.Vector3(), color: new THREE.Color() }

// A node popped by four quick clicks: it swells and bursts like a bubble, a ring and droplets fly off it,
// and the blast throws its neighbours outward with a shake before the layout pulls them back.
type Pop = { index: number; at: number; burst: boolean }
const POP = { swell: 0.12, gone: 0.45, back: 0.8, wave: 0.5, recover: 1.8 } // seconds
const DROPLETS = 10

// The popped node's size over time: swells, bursts, stays gone a moment, then grows back with a little overshoot.
function bubble(t: number) {
  if (t < 0 || t >= POP.back) return 1
  if (t < POP.swell) return 1 + 0.8 * Math.sin(((t / POP.swell) * Math.PI) / 2)
  if (t < POP.gone) return 0.001
  const u = (t - POP.gone) / (POP.back - POP.gone) - 1
  return 1 + 2.70158 * u ** 3 + 1.70158 * u ** 2
}

let ringTexture: THREE.Texture | undefined
function ring() {
  if (ringTexture) return ringTexture
  const canvas = document.createElement("canvas")
  canvas.width = canvas.height = 128
  const context = canvas.getContext("2d")!
  context.strokeStyle = "white"
  context.shadowColor = "white"
  context.shadowBlur = 10
  context.lineWidth = 6
  context.beginPath()
  context.arc(64, 64, 50, 0, Math.PI * 2)
  context.stroke()
  ringTexture = new THREE.CanvasTexture(canvas)
  return ringTexture
}

let glowTexture: THREE.Texture | undefined
function glow() {
  if (glowTexture) return glowTexture
  const canvas = document.createElement("canvas")
  canvas.width = canvas.height = 64
  const context = canvas.getContext("2d")!
  const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32)
  gradient.addColorStop(0, "rgba(255,255,255,1)")
  gradient.addColorStop(0.25, "rgba(255,255,255,0.45)")
  gradient.addColorStop(1, "rgba(255,255,255,0)")
  context.fillStyle = gradient
  context.fillRect(0, 0, 64, 64)
  glowTexture = new THREE.CanvasTexture(canvas)
  return glowTexture
}

export default function SkillGraphScene(props: SceneProps) {
  const { graph, focus, hover, highlight } = props
  const topology = useMemo(() => topologyOf(graph), [graph])
  const emphasis = useMemo(() => emphasisFor(graph, { focus, hover, highlight }), [graph, focus, hover, highlight])
  const labels = useRef<(HTMLButtonElement | null)[]>([])
  const colors = useMemo(
    () => ({ fields: props.colors.fields.map((color) => new THREE.Color(color)), edge: new THREE.Color(props.colors.edge) }),
    [props.colors]
  )

  // Four quick clicks on the same node pop the graph: its neighbours fly apart and snap back into place.
  const clicks = useRef({ id: "", count: 0, at: 0 })
  const popped = useRef<string | null>(null)
  const select = (id: string) => {
    const now = performance.now()
    const run = clicks.current
    run.count = run.id === id && now - run.at < 450 ? run.count + 1 : 1
    Object.assign(run, { id, at: now })
    if (run.count === 4 && !props.reducedMotion) popped.current = id
    props.onSelect(id)
  }

  return (
    <div data-skill-scene className="relative size-full">
      <Canvas
        flat
        frameloop={props.paused ? "never" : "always"}
        dpr={[1, 2]}
        camera={{ position: [0, 3, 16], fov: 42 }}
        gl={{ antialias: true, alpha: true }}
        onPointerMissed={props.onClear}
        className="touch-pan-y"
      >
        <Graph {...props} colors={colors} onSelect={select} popped={popped} topology={topology} emphasis={emphasis} labels={labels} />
      </Canvas>
      {/* Labels are plain DOM over the canvas, placed each frame, so they use the page's type and tokens. */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {graph.nodes.map((node, i) => (
          <button
            key={node.id}
            ref={(element) => {
              labels.current[i] = element
            }}
            type="button"
            tabIndex={-1}
            onClick={() => select(node.id)}
            onPointerEnter={() => props.onHover(node.id)}
            onPointerLeave={() => props.onHover(null)}
            className={cn(
              "pointer-events-auto absolute top-0 left-0 cursor-pointer whitespace-nowrap rounded px-1 text-xs leading-tight transition-colors duration-300 select-none will-change-transform",
              node.kind === "field" && "text-2xs font-semibold uppercase tracking-wider",
              node.kind === "area" && "font-medium",
              emphasis.node[i] === "focus" && "font-semibold text-foreground",
              emphasis.node[i] === "near" && "text-foreground",
              emphasis.node[i] !== "focus" && emphasis.node[i] !== "near" && "text-muted-foreground"
            )}
            style={{ transform: "translate3d(-9999px, 0, 0)" }}
          >
            {node.label}
          </button>
        ))}
      </div>
    </div>
  )
}

type NodeGeometries = {
  sphere: THREE.SphereGeometry
  target: THREE.SphereGeometry
  shell: THREE.IcosahedronGeometry
}

type GraphProps = Omit<SceneProps, "colors"> & {
  colors: { fields: THREE.Color[]; edge: THREE.Color }
  topology: Topology
  emphasis: ReturnType<typeof emphasisFor>
  labels: RefObject<(HTMLButtonElement | null)[]>
  popped: RefObject<string | null>
}

function Graph({ graph, layout, focus, hover, highlight, colors, reducedMotion, onSelect, onHover, topology, emphasis, labels, popped }: GraphProps) {
  const target = useMemo(() => (layout ? new Map(layout) : layoutFor(graph)), [graph, layout])
  // Unit geometry is uploaded once per shape, rather than once for every node and hit target.
  const geometries = useMemo<NodeGeometries>(
    () => ({
      sphere: new THREE.SphereGeometry(1, 24, 24),
      target: new THREE.SphereGeometry(1, 8, 8),
      shell: new THREE.IcosahedronGeometry(1, 1),
    }),
    []
  )
  useEffect(
    () => () => {
      for (const geometry of Object.values(geometries)) geometry.dispose()
    },
    [geometries]
  )
  // Where each node is drawn this frame. Positions outlive a change to the graph, so nodes travel from
  // wherever they were to where they now belong, and a new node starts where it will settle.
  const drawn = useRef(new Map<string, THREE.Vector3>())
  const positions = useMemo(
    () =>
      topology.nodes.map((node) => {
        const known = drawn.current.get(node.id)
        if (known) return known
        const fresh = new THREE.Vector3(...(target.get(node.id) ?? [0, 0, 0]))
        drawn.current.set(node.id, fresh)
        return fresh
      }),
    [topology, target]
  )
  const colorOf = (i: number) => {
    const node = topology.nodes[i]
    return colors.fields[node.fields[0] ?? 0] ?? colors.edge
  }

  const pop = useRef<Pop>({ index: -1, at: -Infinity, burst: true })
  const velocity = useMemo(() => topology.nodes.map(() => new THREE.Vector3()), [topology])
  // Seconds left until the graph is back to its usual pace after a blast.
  const recovering = useRef(0)

  useFrame((state, delta) => {
    const now = state.clock.elapsedTime
    const clicked = popped.current === null ? undefined : topology.index.get(popped.current)
    popped.current = null
    if (clicked !== undefined) pop.current = { index: clicked, at: now, burst: false }

    // The blast goes off as the bubble bursts: away from it, scattered a little, nearer nodes the hardest.
    const { index, at, burst } = pop.current
    if (!burst && now - at >= POP.swell && positions[index]) {
      pop.current.burst = true
      positions.forEach((position, i) => {
        if (i === index) return
        const away = scratch.point.subVectors(position, positions[index])
        const distance = away.length()
        away.normalize().add(scratch.bend.randomDirection().multiplyScalar(0.6)).normalize()
        velocity[i].copy(away).multiplyScalar((28 / (1 + distance * 0.35)) * (0.7 + Math.random() * 0.6))
      })
      recovering.current = POP.recover
    }

    recovering.current = Math.max(0, recovering.current - delta)
    const drag = Math.exp(-6 * delta)
    // The flung nodes shake for the first half second, less and less.
    const shake = Math.max(0, recovering.current - (POP.recover - 0.5)) * 0.15
    positions.forEach((position, i) => {
      position.addScaledVector(velocity[i], delta)
      velocity[i].multiplyScalar(drag)
      if (shake > 0 && i !== index) position.add(scratch.bend.randomDirection().multiplyScalar(shake * Math.random()))
    })

    const step = reducedMotion ? 1 : ease(recovering.current > 0 ? 2 : 2.4, delta)
    topology.nodes.forEach((node, i) => positions[i].lerp(scratch.point.set(...((target.get(node.id) ?? [0, 0, 0]) as Vec3)), step))
  })

  return (
    <>
      <Edges topology={topology} positions={positions} emphasis={emphasis.edge} color={colors.edge} />
      <Pulses topology={topology} positions={positions} active={emphasis.active} highlight={highlight} colorOf={colorOf} reducedMotion={reducedMotion} />
      {topology.nodes.map((node, i) => (
        <NodeMark
          key={node.id}
          index={i}
          pop={pop}
          node={node}
          position={positions[i]}
          radius={topology.radius[i]}
          geometries={geometries}
          color={colorOf(i)}
          emphasis={emphasis.node[i]}
          onSelect={onSelect}
          onHover={onHover}
        />
      ))}
      <Burst pop={pop} positions={positions} radius={topology.radius} colorOf={colorOf} />
      <Rig topology={topology} positions={positions} focus={focus} highlight={highlight} hover={hover} reducedMotion={reducedMotion} />
      {/* After the rig, so labels are placed for the camera this frame is drawn from. */}
      <LabelTracker topology={topology} positions={positions} emphasis={emphasis.node} labels={labels} />
    </>
  )
}

function LabelTracker({
  topology,
  positions,
  emphasis,
  labels,
}: {
  topology: Topology
  positions: THREE.Vector3[]
  emphasis: Emphasis[]
  labels: RefObject<(HTMLButtonElement | null)[]>
}) {
  const camera = useThree((state) => state.camera as THREE.PerspectiveCamera)
  const size = useThree((state) => state.size)
  const controls = useThree((state) => state.controls) as unknown as { target: THREE.Vector3 } | null

  // Labels follow their nodes on screen. Nearer ones sit on top and read louder, which is most of the
  // depth cue. Like a map, detail comes with closeness: fields always show their names, areas once
  // nearer, and single skills only up close, in focus or highlighted.
  useFrame(() => {
    camera.updateMatrixWorld()
    const pixelsPerUnit = size.height / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)))
    const middle = controls ? camera.position.distanceTo(controls.target) : camera.position.length()
    topology.nodes.forEach((node, i) => {
      const label = labels.current[i]
      if (!label || !positions[i]) return
      const distance = camera.position.distanceTo(positions[i])
      const point = scratch.bend.copy(positions[i]).project(camera)
      if (point.z > 1) {
        label.style.transform = "translate3d(-9999px, 0, 0)"
        return
      }
      const x = (point.x * 0.5 + 0.5) * size.width
      const y = (-point.y * 0.5 + 0.5) * size.height + (topology.radius[i] * (node.kind === "field" ? 1.9 : 1.5) * pixelsPerUnit) / distance + 2
      label.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translateX(-50%)`
      label.style.zIndex = String(Math.round(1000 - distance * 10))
      const depth = THREE.MathUtils.clamp((distance - (middle - RADIUS)) / (2 * RADIUS), 0, 1)
      const level = emphasis[i]
      const reach = node.kind === "field" ? Infinity : node.kind === "area" ? middle + 2 : middle - 2.5
      const near = THREE.MathUtils.clamp((reach - distance) / 2, 0, 1)
      const opacity = level === "focus" || level === "near" ? 1 : level === "faded" ? 0.15 * near : (1 - depth * 0.6) * near
      label.style.opacity = opacity.toFixed(2)
      label.style.pointerEvents = opacity > 0.3 ? "auto" : "none"
    })
  })

  return null
}

function NodeMark({
  index,
  pop,
  node,
  position,
  radius,
  geometries,
  color,
  emphasis,
  onSelect,
  onHover,
}: {
  index: number
  pop: RefObject<Pop>
  node: SkillNode
  position: THREE.Vector3
  radius: number
  geometries: NodeGeometries
  color: THREE.Color
  emphasis: Emphasis
  onSelect: (id: string) => void
  onHover: (id: string | null) => void
}) {
  const group = useRef<THREE.Group>(null)
  // The size it eases toward from its emphasis; a pop plays on top of it.
  const size = useRef(1)
  const core = useRef<THREE.MeshBasicMaterial>(null)
  const halo = useRef<THREE.SpriteMaterial>(null)
  const spin = useRef<THREE.Mesh>(null)

  useFrame((state, delta) => {
    if (!group.current || !core.current) return
    group.current.position.copy(position)
    const step = ease(8, delta)
    const scale = emphasis === "focus" ? (node.kind === "field" ? 1.2 : 1.5) : emphasis === "near" ? 1.15 : 1
    size.current = THREE.MathUtils.lerp(size.current, scale, step)
    const popping = pop.current.index === index ? bubble(state.clock.elapsedTime - pop.current.at) : 1
    group.current.scale.setScalar(size.current * popping)
    core.current.opacity = THREE.MathUtils.lerp(core.current.opacity, nodeOpacity[emphasis], step)
    // The focused node breathes.
    const breath = emphasis === "focus" ? 0.55 + Math.sin(state.clock.elapsedTime * 3) * 0.15 : emphasis === "faded" ? 0.05 : 0.32
    if (halo.current) halo.current.opacity = THREE.MathUtils.lerp(halo.current.opacity, breath, step)
    if (spin.current) spin.current.rotation.y += delta * 0.4
  })

  const handlers = {
    onClick: (event: { stopPropagation: () => void }) => {
      event.stopPropagation()
      onSelect(node.id)
    },
    onPointerOver: (event: { stopPropagation: () => void }) => {
      event.stopPropagation()
      onHover(node.id)
      document.body.style.cursor = "pointer"
    },
    onPointerOut: () => {
      onHover(null)
      document.body.style.cursor = ""
    },
  }

  return (
    <group ref={group}>
      {/* Skills and areas are spheres, fields a sphere in a wireframe shell. */}
      <mesh geometry={geometries.sphere} scale={radius}>
        <meshBasicMaterial ref={core} color={color} transparent opacity={0.85} />
      </mesh>
      {node.kind === "field" && (
        <mesh ref={spin} geometry={geometries.shell} scale={radius * 1.8}>
          <meshBasicMaterial color={color} wireframe transparent opacity={emphasis === "faded" ? 0.05 : 0.22} />
        </mesh>
      )}
      <sprite scale={radius * 7}>
        <spriteMaterial ref={halo} map={glow()} color={color} transparent opacity={0.3} depthWrite={false} />
      </sprite>
      {/* A larger, invisible target: the dots alone are too small to hit. */}
      <mesh {...handlers} geometry={geometries.target} scale={Math.max(radius * 2.4, 0.45)}>
        <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
      </mesh>
    </group>
  )
}

// What flies off a bursting node: a ring that races outward and a spray of droplets, both in its color.
function Burst({
  pop,
  positions,
  radius,
  colorOf,
}: {
  pop: RefObject<Pop>
  positions: THREE.Vector3[]
  radius: number[]
  colorOf: (i: number) => THREE.Color
}) {
  const wave = useRef<THREE.Sprite>(null)
  const spray = useRef<THREE.Group>(null)
  const directions = useMemo(() => Array.from({ length: DROPLETS }, () => new THREE.Vector3()), [])
  const sprayed = useRef(-Infinity)

  useFrame((state) => {
    if (!wave.current || !spray.current) return
    const { index, at } = pop.current
    const t = (state.clock.elapsedTime - at - POP.swell) / POP.wave
    const live = index >= 0 && t >= 0 && t <= 1 && !!positions[index]
    wave.current.visible = spray.current.visible = live
    if (!live) return

    if (sprayed.current !== at) {
      sprayed.current = at
      directions.forEach((direction) => direction.randomDirection().multiplyScalar(0.6 + Math.random() * 0.8))
    }
    const out = 1 - (1 - t) ** 3
    const fade = (1 - t) ** 2
    const color = colorOf(index)
    const size = radius[index]

    wave.current.position.copy(positions[index])
    wave.current.scale.setScalar(size * (3 + 14 * out))
    const material = wave.current.material as THREE.SpriteMaterial
    material.color.copy(color)
    material.opacity = 0.9 * fade

    spray.current.position.copy(positions[index])
    spray.current.children.forEach((child, i) => {
      const droplet = child as THREE.Sprite
      droplet.position.copy(directions[i]).multiplyScalar(size * 12 * out)
      droplet.scale.setScalar(size * 2.2 * (1 - t))
      const dropletMaterial = droplet.material as THREE.SpriteMaterial
      dropletMaterial.color.copy(color)
      dropletMaterial.opacity = fade
    })
  })

  return (
    <>
      <sprite ref={wave} visible={false}>
        <spriteMaterial map={ring()} transparent depthWrite={false} />
      </sprite>
      <group ref={spray} visible={false}>
        {directions.map((_, i) => (
          <sprite key={i}>
            <spriteMaterial map={glow()} transparent depthWrite={false} />
          </sprite>
        ))}
      </group>
    </>
  )
}

function Edges({
  topology,
  positions,
  emphasis,
  color,
}: {
  topology: Topology
  positions: THREE.Vector3[]
  emphasis: Emphasis[]
  color: THREE.Color
}) {
  const count = topology.ends.length
  const geometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry()
    const vertices = Math.max(count, 1) * SEGMENTS * 2
    geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(vertices * 3), 3))
    geometry.setAttribute("color", new THREE.BufferAttribute(new Float32Array(vertices * 4), 4))
    geometry.setDrawRange(0, count * SEGMENTS * 2)
    return geometry
  }, [count])
  // Opacity per edge, eased each frame; edges added later fade in from nothing.
  const opacity = useRef<number[]>([])

  useEffect(() => () => geometry.dispose(), [geometry])

  useFrame((_, delta) => {
    const position = geometry.getAttribute("position") as THREE.BufferAttribute
    const tint = geometry.getAttribute("color") as THREE.BufferAttribute
    const step = ease(6, delta)
    const from = new THREE.Vector3()
    const to = new THREE.Vector3()
    topology.ends.forEach(([a, b], i) => {
      if (!positions[a] || !positions[b]) return
      opacity.current[i] = THREE.MathUtils.lerp(opacity.current[i] ?? 0, edgeOpacity[emphasis[i] ?? "rest"], step)
      for (let s = 0; s < SEGMENTS; s++) {
        curvePoint(positions[a], positions[b], s / SEGMENTS, from)
        curvePoint(positions[a], positions[b], (s + 1) / SEGMENTS, to)
        const v = (i * SEGMENTS + s) * 2
        position.setXYZ(v, from.x, from.y, from.z)
        position.setXYZ(v + 1, to.x, to.y, to.z)
        tint.setXYZW(v, color.r, color.g, color.b, opacity.current[i])
        tint.setXYZW(v + 1, color.r, color.g, color.b, opacity.current[i])
      }
    })
    position.needsUpdate = true
    tint.needsUpdate = true
  })

  return (
    <lineSegments geometry={geometry} frustumCulled={false}>
      <lineBasicMaterial vertexColors transparent depthWrite={false} />
    </lineSegments>
  )
}

type Pulse = { edge: number; from: number; to: number; t: number; speed: number }

// Signals travel the edges. Idle, they fire at random; with a node in focus they leave it for its
// neighbours, so the eye follows the connections outward.
function Pulses({
  topology,
  positions,
  active,
  highlight,
  colorOf,
  reducedMotion,
}: {
  topology: Topology
  positions: THREE.Vector3[]
  active: string | null
  highlight: ReadonlySet<string> | null
  colorOf: (i: number) => THREE.Color
  reducedMotion: boolean
}) {
  const geometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(PULSES * 3), 3))
    geometry.setAttribute("color", new THREE.BufferAttribute(new Float32Array(PULSES * 4), 4))
    return geometry
  }, [])
  const pulses = useRef<Pulse[]>(Array.from({ length: PULSES }, () => ({ edge: 0, from: 0, to: 0, t: 1, speed: 1 })))
  const timer = useRef(0)

  useEffect(() => () => geometry.dispose(), [geometry])

  // Pulses in flight address the old graph by index, so a changed graph starts quiet.
  useEffect(() => {
    for (const pulse of pulses.current) pulse.t = 1
  }, [topology])

  // A newly focused node fires all its edges at once.
  useEffect(() => {
    const source = active ? topology.index.get(active) : undefined
    if (source === undefined || reducedMotion) return
    topology.ends.forEach(([a, b], edge) => {
      if (a === source || b === source) launch(pulses.current, topology, edge, source, 1.1)
    })
  }, [active, reducedMotion, topology])

  useFrame((_, delta) => {
    const position = geometry.getAttribute("position") as THREE.BufferAttribute
    const tint = geometry.getAttribute("color") as THREE.BufferAttribute

    if (!reducedMotion) {
      timer.current -= delta
      if (timer.current <= 0) {
        const source = active ? topology.index.get(active) : undefined
        const touches = (i: number) => !highlight || highlight.has(topology.nodes[i].id)
        const candidates = topology.ends
          .map((ends, edge) => ({ ends, edge }))
          .filter(({ ends: [a, b] }) => (source !== undefined ? a === source || b === source : touches(a) || touches(b)))
        const pick = candidates[Math.floor(Math.random() * candidates.length)]
        if (pick) {
          const from = source ?? pick.ends[Math.random() < 0.5 ? 0 : 1]
          launch(pulses.current, topology, pick.edge, from, 0.5 + Math.random() * 0.5)
        }
        timer.current = source !== undefined ? 0.18 : 0.12
      }
    }

    pulses.current.forEach((pulse, i) => {
      pulse.t = Math.min(1, pulse.t + delta * pulse.speed)
      const live = pulse.t < 1 && positions[pulse.from] !== undefined && positions[pulse.to] !== undefined
      if (live) curvePoint(positions[pulse.from], positions[pulse.to], pulse.t, scratch.point)
      position.setXYZ(i, scratch.point.x, scratch.point.y, scratch.point.z)
      const color = live ? colorOf(pulse.from) : scratch.color
      // Fade in leaving the source, fade out arriving.
      tint.setXYZW(i, color.r, color.g, color.b, live ? Math.sin(pulse.t * Math.PI) : 0)
    })
    position.needsUpdate = true
    tint.needsUpdate = true
  })

  return (
    <points geometry={geometry} frustumCulled={false}>
      <pointsMaterial map={glow()} size={0.42} vertexColors transparent depthWrite={false} sizeAttenuation />
    </points>
  )
}

function launch(pool: Pulse[], topology: Topology, edge: number, from: number, speed: number) {
  const pulse = pool.find((candidate) => candidate.t >= 1)
  if (!pulse) return
  const [a, b] = topology.ends[edge]
  Object.assign(pulse, { edge, from, to: from === a ? b : a, t: 0, speed })
}

// The camera orbits whatever is in view: the focused node, the highlighted group, or the whole graph,
// and moves closer the narrower that is. Turning stays with the visitor. The plain wheel scrolls the page;
// Shift with it zooms. Ctrl would be the usual key, but browsers take that for zooming the whole page.
function Rig({
  topology,
  positions,
  focus,
  highlight,
  hover,
  reducedMotion,
}: {
  topology: Topology
  positions: THREE.Vector3[]
  focus: string | null
  highlight: ReadonlySet<string> | null
  hover: string | null
  reducedMotion: boolean
}) {
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null)
  const camera = useThree((state) => state.camera)
  const size = useThree((state) => state.size)
  const goal = useMemo(() => new THREE.Vector3(), [])
  const shift = useMemo(() => new THREE.Vector3(), [])
  // The visitor's zoom on top of ours, starting over whenever the view moves somewhere else.
  const zoom = useRef(1)

  useEffect(() => {
    zoom.current = 1
  }, [focus, highlight])

  useEffect(() => {
    const element = controls.current?.domElement
    if (!controls.current || !element) return
    // One finger scrolls the page past the graph; two fingers turn it.
    controls.current.touches = { ONE: undefined as unknown as THREE.TOUCH, TWO: THREE.TOUCH.ROTATE }
    element.style.touchAction = "pan-y"
    const onWheel = (event: WheelEvent) => {
      if (!event.shiftKey) return
      event.preventDefault()
      // Some browsers turn a shifted wheel sideways, so the delta can arrive on either axis.
      const delta = event.deltaY || event.deltaX
      zoom.current = THREE.MathUtils.clamp(zoom.current * Math.exp(delta * 0.003), 0.6, 1.6)
    }
    // On the wrapper, so the wheel zooms over the labels too.
    const scene = element.closest("[data-skill-scene]") ?? element
    scene.addEventListener("wheel", onWheel as EventListener, { passive: false })
    return () => scene.removeEventListener("wheel", onWheel as EventListener)
  }, [])

  useFrame((_, delta) => {
    const orbit = controls.current
    if (!orbit) return

    let distance = 17.5
    goal.set(0, 0, 0)
    const focused = focus ? topology.index.get(focus) : undefined
    const members = highlight ? positions.filter((_, i) => topology.nodes[i] && highlight.has(topology.nodes[i].id)) : []
    if (focused !== undefined) {
      goal.copy(positions[focused])
      // Close enough that the node and its neighbours fill the stage; a field has more around it.
      const kind = topology.nodes[focused]?.kind
      distance = kind === "field" ? 8.5 : kind === "area" ? 7.5 : 6.5
    } else if (members.length > 0) {
      members.forEach((member) => goal.add(member))
      goal.divideScalar(members.length)
      // Close in on a tight group, stay back for a scattered one.
      const spread = Math.max(...members.map((member) => member.distanceTo(goal)))
      distance = THREE.MathUtils.clamp(6 + spread * 1.1, 9, 14)
    }

    // A portrait stage is narrower than it is tall, so the camera backs off to keep the sides in.
    distance /= Math.min(1, size.width / size.height / 0.95)
    distance *= zoom.current

    const step = reducedMotion ? 1 : ease(2.2, delta)
    shift.copy(goal).sub(orbit.target).multiplyScalar(step)
    orbit.target.add(shift)
    camera.position.add(shift)

    const offset = scratch.mid.copy(camera.position).sub(orbit.target)
    offset.setLength(THREE.MathUtils.lerp(offset.length(), distance, step))
    camera.position.copy(orbit.target).add(offset)

    orbit.autoRotate = !reducedMotion && hover === null
  })

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enableZoom={false}
      enablePan={false}
      enableDamping
      autoRotateSpeed={focus ? 0.35 : 0.6}
      minPolarAngle={Math.PI * 0.18}
      maxPolarAngle={Math.PI * 0.82}
    />
  )
}
