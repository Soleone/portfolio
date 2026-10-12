"use client"

import { OrbitControls } from "@react-three/drei"
import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { useEffect, useMemo, useRef, type ComponentRef, type RefObject } from "react"
import * as THREE from "three"
import { cn } from "@/lib/utils"
import { layoutFor, neighborsOf, RADIUS, skillGraph, type Arrangement, type SkillNode, type Vec3 } from "@/lib/skill-graph"

export type GraphColors = { groups: THREE.Color[]; domain: THREE.Color; edge: THREE.Color }

export type SceneProps = {
  arrangement: Arrangement
  focus: string | null
  hover: string | null
  filter: number | null
  colors: GraphColors
  reducedMotion: boolean
  // Off screen, the scene stops drawing.
  paused: boolean
  onSelect: (id: string) => void
  onHover: (id: string | null) => void
  onClear: () => void
}

// How loud a node or edge is: the one in focus, its neighbours, everything else, and what a filter or focus pushes back.
type Emphasis = "focus" | "near" | "rest" | "faded"

const SEGMENTS = 10 // straight pieces per curved edge
const PULSES = 64

const { nodes, edges } = skillGraph
const nodeIndex = new Map(nodes.map((node, i) => [node.id, i]))
const edgeEnds = edges.map((edge) => [nodeIndex.get(edge.source)!, nodeIndex.get(edge.target)!] as const)
const degree = nodes.map((node) => neighborsOf(node.id).length)
const radiusOf = (i: number) => (nodes[i].kind === "domain" ? 0.24 : 0.13 + Math.min(degree[i], 8) * 0.012)

// Frame-rate independent easing toward a target.
const ease = (rate: number, delta: number) => 1 - Math.exp(-rate * delta)

function emphasisFor({ focus, hover, filter }: Pick<SceneProps, "focus" | "hover" | "filter">) {
  const active = hover ?? focus
  const lit = new Set(active ? [active, ...neighborsOf(active).map(({ id }) => id)] : [])
  const inFilter = (node: SkillNode) => filter === null || node.group === filter

  const node = nodes.map((node): Emphasis => {
    if (node.id === active || node.id === focus) return "focus"
    if (active) return lit.has(node.id) ? "near" : "faded"
    if (filter !== null) return inFilter(node) ? "near" : "faded"
    return "rest"
  })
  const edge = edges.map((edge, i): Emphasis => {
    if (active) return edge.source === active || edge.target === active ? "focus" : "faded"
    if (filter !== null) {
      const [a, b] = edgeEnds[i]
      return inFilter(nodes[a]) && inFilter(nodes[b]) ? "near" : "faded"
    }
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
const scratch = { mid: new THREE.Vector3(), bend: new THREE.Vector3(), point: new THREE.Vector3() }

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
  const emphasis = useMemo(
    () => emphasisFor({ focus: props.focus, hover: props.hover, filter: props.filter }),
    [props.focus, props.hover, props.filter]
  )
  const labels = useRef<(HTMLButtonElement | null)[]>([])

  return (
    <div className="relative size-full">
      <Canvas
        flat
        frameloop={props.paused ? "never" : "always"}
        dpr={[1, 2]}
        camera={{ position: [0, 3, 16], fov: 42 }}
        gl={{ antialias: true, alpha: true }}
        onPointerMissed={props.onClear}
        className="touch-pan-y"
      >
        <Graph {...props} emphasis={emphasis} labels={labels} />
      </Canvas>
      {/* Labels are plain DOM over the canvas, placed each frame, so they use the page's type and tokens. */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {nodes.map((node, i) => (
          <button
            key={node.id}
            ref={(element) => {
              labels.current[i] = element
            }}
            type="button"
            tabIndex={-1}
            onClick={() => props.onSelect(node.id)}
            onPointerEnter={() => props.onHover(node.id)}
            onPointerLeave={() => props.onHover(null)}
            className={cn(
              "pointer-events-auto absolute top-0 left-0 cursor-pointer whitespace-nowrap rounded px-1 text-xs leading-tight transition-colors duration-300 select-none will-change-transform",
              node.kind === "domain" && "text-[0.7rem] font-semibold uppercase tracking-wider",
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

type GraphProps = SceneProps & { emphasis: ReturnType<typeof emphasisFor>; labels: RefObject<(HTMLButtonElement | null)[]> }

function Graph({ arrangement, focus, hover, filter, colors, reducedMotion, onSelect, onHover, emphasis, labels }: GraphProps) {
  const layouts = useMemo(() => ({ web: layoutFor("web"), kind: layoutFor("kind"), domain: layoutFor("domain") }), [])
  const target = layouts[arrangement]
  // Where each node is drawn this frame; nodes travel there from wherever the last arrangement left them.
  const positions = useMemo(() => nodes.map((node) => new THREE.Vector3(...layouts.web.get(node.id)!)), [layouts])
  const colorOf = (i: number) => (nodes[i].kind === "domain" ? colors.domain : colors.groups[nodes[i].group!])
  useFrame((_, delta) => {
    const step = reducedMotion ? 1 : ease(2.4, delta)
    nodes.forEach((node, i) => positions[i].lerp(scratch.point.set(...(target.get(node.id) as Vec3)), step))
  })

  return (
    <>
      <Edges positions={positions} emphasis={emphasis.edge} color={colors.edge} />
      <Pulses positions={positions} active={emphasis.active} filter={filter} colorOf={colorOf} reducedMotion={reducedMotion} />
      {nodes.map((node, i) => (
        <NodeMark
          key={node.id}
          node={node}
          position={positions[i]}
          radius={radiusOf(i)}
          color={colorOf(i)}
          emphasis={emphasis.node[i]}
          onSelect={onSelect}
          onHover={onHover}
        />
      ))}
      <Rig positions={positions} focus={focus} filter={filter} hover={hover} reducedMotion={reducedMotion} />
      {/* After the rig, so labels are placed for the camera this frame is drawn from. */}
      <LabelTracker positions={positions} emphasis={emphasis.node} labels={labels} />
    </>
  )
}

function LabelTracker({
  positions,
  emphasis,
  labels,
}: {
  positions: THREE.Vector3[]
  emphasis: Emphasis[]
  labels: RefObject<(HTMLButtonElement | null)[]>
}) {
  const camera = useThree((state) => state.camera as THREE.PerspectiveCamera)
  const size = useThree((state) => state.size)
  const controls = useThree((state) => state.controls) as unknown as { target: THREE.Vector3 } | null

  // Labels follow their nodes on screen. Nearer ones sit on top and read louder, which is most of the depth cue.
  useFrame(() => {
    camera.updateMatrixWorld()
    const pixelsPerUnit = size.height / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)))
    const middle = controls ? camera.position.distanceTo(controls.target) : camera.position.length()
    nodes.forEach((_, i) => {
      const label = labels.current[i]
      if (!label) return
      const distance = camera.position.distanceTo(positions[i])
      const point = scratch.bend.copy(positions[i]).project(camera)
      if (point.z > 1) {
        label.style.transform = "translate3d(-9999px, 0, 0)"
        return
      }
      const x = (point.x * 0.5 + 0.5) * size.width
      const y = (-point.y * 0.5 + 0.5) * size.height + (radiusOf(i) * (nodes[i].kind === "domain" ? 1.9 : 1.5) * pixelsPerUnit) / distance + 2
      label.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translateX(-50%)`
      label.style.zIndex = String(Math.round(1000 - distance * 10))
      const depth = THREE.MathUtils.clamp((distance - (middle - RADIUS)) / (2 * RADIUS), 0, 1)
      const level = emphasis[i]
      label.style.opacity = String(level === "faded" ? 0.2 : level === "rest" ? 1 - depth * 0.6 : 1)
    })
  })

  return null
}

function NodeMark({
  node,
  position,
  radius,
  color,
  emphasis,
  onSelect,
  onHover,
}: {
  node: SkillNode
  position: THREE.Vector3
  radius: number
  color: THREE.Color
  emphasis: Emphasis
  onSelect: (id: string) => void
  onHover: (id: string | null) => void
}) {
  const group = useRef<THREE.Group>(null)
  const core = useRef<THREE.MeshBasicMaterial>(null)
  const halo = useRef<THREE.SpriteMaterial>(null)
  const shell = useRef<THREE.Mesh>(null)

  useFrame((state, delta) => {
    if (!group.current || !core.current) return
    group.current.position.copy(position)
    const step = ease(8, delta)
    const scale = emphasis === "focus" ? (node.kind === "domain" ? 1.2 : 1.5) : emphasis === "near" ? 1.15 : 1
    group.current.scale.setScalar(THREE.MathUtils.lerp(group.current.scale.x, scale, step))
    core.current.opacity = THREE.MathUtils.lerp(core.current.opacity, nodeOpacity[emphasis], step)
    // The focused node breathes.
    const breath = emphasis === "focus" ? 0.55 + Math.sin(state.clock.elapsedTime * 3) * 0.15 : emphasis === "faded" ? 0.05 : 0.32
    if (halo.current) halo.current.opacity = THREE.MathUtils.lerp(halo.current.opacity, breath, step)
    if (shell.current) shell.current.rotation.y += delta * 0.4
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
      <mesh>
        <sphereGeometry args={[radius, 24, 24]} />
        <meshBasicMaterial ref={core} color={color} transparent opacity={0.85} />
      </mesh>
      {node.kind === "domain" && (
        <mesh ref={shell}>
          <icosahedronGeometry args={[radius * 1.8, 1]} />
          <meshBasicMaterial color={color} wireframe transparent opacity={emphasis === "faded" ? 0.05 : 0.22} />
        </mesh>
      )}
      {/* Domains are drawn in the ink color, which would glow as a smudge on light themes; their shell marks them instead. */}
      {node.kind === "skill" && (
        <sprite scale={radius * 7}>
          <spriteMaterial ref={halo} map={glow()} color={color} transparent opacity={0.3} depthWrite={false} />
        </sprite>
      )}
      {/* A larger, invisible target: the dots alone are too small to hit. */}
      <mesh {...handlers}>
        <sphereGeometry args={[Math.max(radius * 2.4, 0.45), 8, 8]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
      </mesh>
    </group>
  )
}

function Edges({ positions, emphasis, color }: { positions: THREE.Vector3[]; emphasis: Emphasis[]; color: THREE.Color }) {
  const geometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry()
    const vertices = edges.length * SEGMENTS * 2
    geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(vertices * 3), 3))
    geometry.setAttribute("color", new THREE.BufferAttribute(new Float32Array(vertices * 4), 4))
    return geometry
  }, [])
  const opacity = useRef(edges.map(() => 0))

  useEffect(() => () => geometry.dispose(), [geometry])

  useFrame((_, delta) => {
    const position = geometry.getAttribute("position") as THREE.BufferAttribute
    const tint = geometry.getAttribute("color") as THREE.BufferAttribute
    const step = ease(6, delta)
    const from = new THREE.Vector3()
    const to = new THREE.Vector3()
    edgeEnds.forEach(([a, b], i) => {
      opacity.current[i] = THREE.MathUtils.lerp(opacity.current[i], edgeOpacity[emphasis[i]], step)
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

// Signals travel the edges. Idle, they fire at random; with a node in focus they leave it for its
// neighbours, so the eye follows the connections outward.
function Pulses({
  positions,
  active,
  filter,
  colorOf,
  reducedMotion,
}: {
  positions: THREE.Vector3[]
  active: string | null
  filter: number | null
  colorOf: (i: number) => THREE.Color
  reducedMotion: boolean
}) {
  const geometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(PULSES * 3), 3))
    geometry.setAttribute("color", new THREE.BufferAttribute(new Float32Array(PULSES * 4), 4))
    return geometry
  }, [])
  const pulses = useRef(Array.from({ length: PULSES }, () => ({ edge: 0, from: 0, to: 0, t: 1, speed: 1 })))
  const timer = useRef(0)

  useEffect(() => () => geometry.dispose(), [geometry])

  // A newly focused node fires all its edges at once.
  useEffect(() => {
    if (!active || reducedMotion) return
    const source = nodeIndex.get(active)!
    edgeEnds.forEach(([a, b], edge) => {
      if (a === source || b === source) launch(pulses.current, edge, source, 1.1)
    })
  }, [active, reducedMotion])

  useFrame((_, delta) => {
    const position = geometry.getAttribute("position") as THREE.BufferAttribute
    const tint = geometry.getAttribute("color") as THREE.BufferAttribute

    if (!reducedMotion) {
      timer.current -= delta
      if (timer.current <= 0) {
        const source = active ? nodeIndex.get(active)! : undefined
        const candidates = edgeEnds
          .map((ends, edge) => ({ ends, edge }))
          .filter(({ ends: [a, b] }) =>
            source !== undefined ? a === source || b === source : filter === null || nodes[a].group === filter || nodes[b].group === filter
          )
        const pick = candidates[Math.floor(Math.random() * candidates.length)]
        if (pick) {
          const from = source ?? pick.ends[Math.random() < 0.5 ? 0 : 1]
          launch(pulses.current, pick.edge, from, 0.5 + Math.random() * 0.5)
        }
        timer.current = source !== undefined ? 0.18 : 0.12
      }
    }

    pulses.current.forEach((pulse, i) => {
      pulse.t = Math.min(1, pulse.t + delta * pulse.speed)
      const live = pulse.t < 1
      if (live) curvePoint(positions[pulse.from], positions[pulse.to], pulse.t, scratch.point)
      position.setXYZ(i, scratch.point.x, scratch.point.y, scratch.point.z)
      const color = colorOf(pulse.from)
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

function launch(pool: { edge: number; from: number; to: number; t: number; speed: number }[], edge: number, from: number, speed: number) {
  const pulse = pool.find((candidate) => candidate.t >= 1)
  if (!pulse) return
  const [a, b] = edgeEnds[edge]
  Object.assign(pulse, { edge, from, to: from === a ? b : a, t: 0, speed })
}

// The camera orbits whatever is in view: the focused node, the filtered group, or the whole graph,
// and moves closer the narrower that is. Turning stays with the visitor; zoom is ours, so the wheel scrolls the page.
function Rig({
  positions,
  focus,
  filter,
  hover,
  reducedMotion,
}: {
  positions: THREE.Vector3[]
  focus: string | null
  filter: number | null
  hover: string | null
  reducedMotion: boolean
}) {
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null)
  const camera = useThree((state) => state.camera)
  const size = useThree((state) => state.size)
  const goal = useMemo(() => new THREE.Vector3(), [])
  const shift = useMemo(() => new THREE.Vector3(), [])

  useEffect(() => {
    const element = controls.current?.domElement
    if (!controls.current || !element) return
    // One finger scrolls the page past the graph; two fingers turn it.
    controls.current.touches = { ONE: undefined as unknown as THREE.TOUCH, TWO: THREE.TOUCH.ROTATE }
    element.style.touchAction = "pan-y"
  }, [])

  useFrame((_, delta) => {
    const orbit = controls.current
    if (!orbit) return

    let distance = 16.5
    goal.set(0, 0, 0)
    if (focus) {
      goal.copy(positions[nodeIndex.get(focus)!])
      distance = 10
    } else if (filter !== null) {
      const members = nodes.flatMap((node, i) => (node.group === filter ? [positions[i]] : []))
      members.forEach((member) => goal.add(member))
      goal.divideScalar(members.length)
      distance = 12.5
    }

    // A portrait stage is narrower than it is tall, so the camera backs off to keep the sides in.
    distance /= Math.min(1, size.width / size.height / 0.95)

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
