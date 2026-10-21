import { Component, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { ThreeEvent } from '@react-three/fiber'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import type { EruptionSequence, Scenario, SimulationResult, Trajectory } from '../api/simulator'
import { calculateFamiliesAffected, depositColor, download, number } from '../presentation'
import Legend from './Legend'
import Icon from './Icon'
import { pathPosition, replayDuration, REPLAY_DISPLAY_SECONDS } from './settlingReplay'
import TerrainBackdrop from './TerrainBackdrop'
import { isTerrainAsset, matchesTerrainOrigin, maximumTerrainHeightM, surfaceHeightM } from './terrain'
import type { TerrainAsset } from './terrain'
import Select from './Select'
import EruptionEffects from './EruptionEffects'
import { eruptionFramePair } from './eruptionReplay'
import { guardRenderer } from './rendererLifecycle'
import { disposeOrbitControls } from './orbitControlsLifecycle'

type View = 'regional' | 'close' | 'tagaytay' | 'crosswind'
type Props = { scenario: Scenario; result: SimulationResult | null; selected: string | null; onSelect: (id: string) => void; eruptionSequence?: EruptionSequence | null; frameIndex?: number; sequencePlaying?: boolean; onAvailabilityChange?: (available: boolean) => void }

// Categorical colors identify grain classes; deposit thickness retains its sequential scale.
const GRAIN_COLORS = ['#274c58', '#85341d', '#354778', '#64451c', '#39542c']
const GEOGRAPHIC_NAMES: Record<string, string> = { taal: 'Taal · Lake Taal', mayon: 'Mayon · Albay Gulf', kanlaon: 'Kanlaon · Negros' }

class SceneBoundary extends Component<{ children: ReactNode; onFailure: () => void; onRetry: () => void }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch() { this.props.onFailure() }
  render() { return this.state.failed ? <div className="fallback" role="alert"><h3>3D renderer stopped</h3><p>Playback has paused. Completed results, map and exports remain available.</p><button type="button" onClick={this.props.onRetry}>Retry 3D</button></div> : this.props.children }
}

function supportsWebGL2() {
  try { const canvas = document.createElement('canvas'); const gl = canvas.getContext('webgl2'); if (!gl) return false; gl.getExtension('WEBGL_lose_context')?.loseContext(); return true } catch { return false }
}

function Camera({ view, reset, height, base, emphasizeTaal, lavaDirection, windFromDeg }: { view: View; reset: number; height: number; base: number; emphasizeTaal: boolean; lavaDirection: readonly number[] | null; windFromDeg: number }) {
  const { camera, gl, invalidate } = useThree()
  useEffect(() => {
    const controls = new OrbitControls(camera, gl.domElement)
    const controlsRoot = gl.domElement.getRootNode()
    controls.enableDamping = false
    controls.minDistance = 3
    controls.maxDistance = 420
    controls.maxPolarAngle = Math.PI / 2 - 0.04
    if (view === 'tagaytay') {
      // Overlooking lake and Volcano Island from northern caldera rim (~600 m ASL)
      const dist = Math.max(16, height * 1.8)
      camera.position.set(0, base + Math.max(3.2, height * 0.45), -dist)
      controls.target.set(0, base + height * 0.25, 0)
    } else if (view === 'crosswind') {
      // Perpendicular to downwind transport vector to expose plume column rise and bend
      const transportDeg = (windFromDeg + 180) % 360
      const crossDeg = (transportDeg + 90) % 360
      const rad = (crossDeg * Math.PI) / 180
      const dist = Math.max(14, height * 2.2)
      camera.position.set(dist * Math.sin(rad), base + height * 0.7, -dist * Math.cos(rad))
      controls.target.set(0, base + height * 0.4, 0)
    } else if (emphasizeTaal) {
      const extent = Math.max(8, height * 1.55)
      camera.position.set(extent * 0.65, base + extent, extent * 0.95)
      controls.target.set(0, base + height * 0.32, 0)
    } else if (view === 'close') {
      const extent = Math.max(10, height * 1.7)
      // Stay on the routed slope's side, with an oblique view to expose its downhill length.
      if (lavaDirection) {
        const length = Math.hypot(...lavaDirection), east = lavaDirection[0] / length, south = -lavaDirection[1] / length
        const angle = Math.PI / 5
        camera.position.set(extent * 1.5 * (east * Math.cos(angle) + south * Math.sin(angle)), base + extent * 0.7, extent * 1.5 * (south * Math.cos(angle) - east * Math.sin(angle)))
      }
      else camera.position.set(extent, base + extent * 0.8, extent * 1.2)
      controls.target.set(0, base + height * 0.3, 0)
    } else {
      camera.position.set(145, 130, 160)
      controls.target.set(0, 0, 0)
    }
    controls.update()
    const change = () => invalidate()
    controls.addEventListener('change', change)
    const key = (event: KeyboardEvent) => {
      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', '+', '-', '='].includes(event.key)) return
      event.preventDefault()
      const offset = camera.position.clone().sub(controls.target)
      if (event.key === '+' || event.key === '=') offset.multiplyScalar(0.9)
      else if (event.key === '-') offset.multiplyScalar(1.1)
      else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), event.key === 'ArrowLeft' ? 0.1 : -0.1)
      else offset.y = Math.max(1, offset.y + (event.key === 'ArrowUp' ? 2 : -2))
      camera.position.copy(controls.target).add(offset)
      controls.update()
      invalidate()
    }
    gl.domElement.setAttribute('tabindex', '0')
    gl.domElement.setAttribute('aria-label', 'Volcano illustration. Arrow keys rotate and raise the camera, plus and minus zoom. Drag to orbit.')
    gl.domElement.addEventListener('keydown', key)
    invalidate()
    return () => { controls.removeEventListener('change', change); gl.domElement.removeEventListener('keydown', key); disposeOrbitControls(controls, gl.domElement, controlsRoot) }
  }, [camera, gl, invalidate, view, reset, height, base, emphasizeTaal, lavaDirection, windFromDeg])
  return null
}

function Volcano({ id, scale }: { id: string; scale: number }) {
  // All profiles are schematic enlarged landmarks, not DEM terrain or solver topography.
  if (id === 'taal') return <group scale={scale}>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}><circleGeometry args={[10, 64]} /><meshStandardMaterial color="#789493" /></mesh>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.1, 0]}><ringGeometry args={[10, 13, 64]} /><meshStandardMaterial color="#6c7660" side={THREE.DoubleSide} /></mesh>
    <mesh position={[0, 0.65, 0]}><cylinderGeometry args={[1.6, 3.5, 1.3, 48]} /><meshStandardMaterial color="#82735d" flatShading /></mesh>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 1.32, 0]}><ringGeometry args={[0.8, 1.6, 48]} /><meshStandardMaterial color="#544d42" side={THREE.DoubleSide} /></mesh>
  </group>
  if (id === 'kanlaon') return <group scale={scale}>
    <mesh position={[0, 2.5, 0]} rotation={[0, 0.2, 0]} scale={[1.25, 1, 0.85]}><cylinderGeometry args={[0.7, 8, 5, 14]} /><meshStandardMaterial color="#69705e" flatShading /></mesh>
    <mesh position={[-2, 1.5, 1]}><coneGeometry args={[5, 3, 12]} /><meshStandardMaterial color="#7d806d" flatShading /></mesh>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 5.02, 0]}><ringGeometry args={[0.3, 0.7, 24]} /><meshStandardMaterial color="#544d42" side={THREE.DoubleSide} /></mesh>
  </group>
  return <group scale={scale}>
    <mesh position={[0, 3, 0]}><cylinderGeometry args={[0.45, 7, 6, 64]} /><meshStandardMaterial color="#807360" /></mesh>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 6.02, 0]}><ringGeometry args={[0.22, 0.45, 32]} /><meshStandardMaterial color="#544d42" side={THREE.DoubleSide} /></mesh>
  </group>
}

function Deposit({ result, height }: { result: SimulationResult; height: number }) {
  const texture = useMemo(() => {
    const height = result.grid.thickness_mm.length
    const width = result.grid.east_m.length
    const bytes = new Uint8Array(width * height * 4)
    result.grid.thickness_mm.forEach((row, y) => row.forEach((mm, x) => {
      const color = new THREE.Color(depositColor(mm))
      color.convertLinearToSRGB()
      const index = (y * width + x) * 4
      bytes[index] = Math.round(color.r * 255); bytes[index + 1] = Math.round(color.g * 255); bytes[index + 2] = Math.round(color.b * 255); bytes[index + 3] = mm >= 0.5 ? 190 : 0
    }))
    const value = new THREE.DataTexture(bytes, width, height)
    value.colorSpace = THREE.SRGBColorSpace
    value.magFilter = THREE.NearestFilter
    value.needsUpdate = true
    return value
  }, [result])
  useEffect(() => () => texture.dispose(), [texture])
  return <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, height, 0]}>
    <planeGeometry args={[result.scenario.domain_km, result.scenario.domain_km]} />
    <meshBasicMaterial map={texture} side={THREE.DoubleSide} transparent depthWrite={false} />
  </mesh>
}

function Path({ path }: { path: Trajectory }) {
  const geometry = useMemo(() => new THREE.BufferGeometry().setFromPoints(path.points_m.map(([east, north, height]) => new THREE.Vector3(east / 1000, height / 1000, -north / 1000))), [path])
  const line = useMemo(() => new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: GRAIN_COLORS[path.grain_index % GRAIN_COLORS.length] })), [geometry, path.grain_index])
  useEffect(() => () => { geometry.dispose(); line.material.dispose() }, [geometry, line])
  return <primitive object={line} />
}

function Ash({ paths, playing, replay, reduced, onDone, onPerformance, onClock }: { paths: Trajectory[]; playing: boolean; replay: number; reduced: boolean; onDone: () => void; onPerformance: (fps: number, pacing: number) => void; onClock: (seconds: number) => void }) {
  const mesh = useRef<THREE.InstancedMesh>(null)
  const progress = useRef(0)
  const frame = useRef({ frames: 0, seconds: 0, last: 0 })
  const scheduler = useRef({ frames: 0, start: 0 })
  const { invalidate, setDpr } = useThree()
  const object = useMemo(() => new THREE.Object3D(), [])
  const particlesPerClass = reduced ? 8 : 24
  const count = paths.length * particlesPerClass
  const durationS = replayDuration(paths)
  useEffect(() => { progress.current = 0; onClock(0); invalidate() }, [replay, paths, invalidate, onClock])
  useEffect(() => {
    if (!mesh.current) return
    paths.forEach((path, index) => {
      const color = new THREE.Color(GRAIN_COLORS[path.grain_index % GRAIN_COLORS.length])
      for (let particle = 0; particle < particlesPerClass; particle++) mesh.current!.setColorAt(index * particlesPerClass + particle, color)
    })
    if (mesh.current.instanceColor) mesh.current.instanceColor.needsUpdate = true
    invalidate()
  }, [paths, particlesPerClass, invalidate])
  useFrame(() => {
    if (!mesh.current || !paths.length) return
    if (playing) {
      const now = performance.now()
      const delta = frame.current.last ? (now - frame.current.last) / 1000 : 0
      if (frame.current.last) frame.current.frames++
      frame.current.last = now
      progress.current = Math.min(1, progress.current + delta / REPLAY_DISPLAY_SECONDS)
      frame.current.seconds += delta
      if (frame.current.seconds > 2) {
        const fps = frame.current.frames / frame.current.seconds
        const pacing = scheduler.current.frames * 1000 / (now - scheduler.current.start)
        onPerformance(fps, pacing)
        onClock(progress.current * durationS)
        scheduler.current = { frames: 0, start: now }
        if (fps < 30) setDpr(1)
        frame.current = { frames: 0, seconds: 0, last: now }
      }
      if (progress.current === 1) { onClock(durationS); onDone() }
      else invalidate()
    }
    paths.forEach((path, index) => {
      const [east, north, height] = pathPosition(path, progress.current * durationS)
      for (let particle = 0; particle < particlesPerClass; particle++) {
        // Sub-pixel marker separation has no physical dispersion meaning.
        const angle = particle * Math.PI * 2 / particlesPerClass
        object.position.set(east / 1000 + Math.cos(angle) * 0.03, Math.max(0.015, height / 1000), -north / 1000 + Math.sin(angle) * 0.03)
        object.scale.setScalar(0.025 + index * 0.008)
        object.updateMatrix()
        mesh.current!.setMatrixAt(index * particlesPerClass + particle, object.matrix)
      }
    })
    mesh.current.instanceMatrix.needsUpdate = true
  })
  useEffect(() => {
    frame.current = { frames: 0, seconds: 0, last: 0 }
    scheduler.current = { frames: 0, start: performance.now() }
    if (!playing) { invalidate(); return }
    let raf = 0
    const next = () => { scheduler.current.frames++; invalidate(); raf = requestAnimationFrame(next) }
    raf = requestAnimationFrame(next)
    return () => cancelAnimationFrame(raf)
  }, [playing, replay, invalidate])
  return <instancedMesh ref={mesh} args={[undefined, undefined, count]} frustumCulled={false}><sphereGeometry args={[1, reduced ? 4 : 6, reduced ? 3 : 4]} /><meshStandardMaterial /></instancedMesh>
}

function ReceptorMarkers({
  result,
  terrain,
  emphasizeTaal,
  selected,
  onSelect,
  showPopulation3D = false,
}: {
  result: SimulationResult
  terrain: TerrainAsset | null
  emphasizeTaal: boolean
  selected: string | null
  onSelect: (id: string) => void
  showPopulation3D?: boolean
}) {
  const mesh = useRef<THREE.InstancedMesh>(null)
  const receptors = useMemo(
    () => (result.receptors ?? []).filter(r => r.in_domain && (!terrain || surfaceHeightM(terrain, r.east_m, r.north_m) !== null)),
    [result, terrain]
  )
  const { invalidate } = useThree()

  useEffect(() => {
    if (!mesh.current) return
    const object = new THREE.Object3D()
    receptors.forEach((r, index) => {
      const groundM = terrain ? surfaceHeightM(terrain, r.east_m, r.north_m, emphasizeTaal) ?? 0 : 0
      const groundY = groundM / 1000
      const thickness = r.thickness_mm ?? 0
      const isAffected = thickness >= 0.5
      const hasTrace = thickness >= 0.01
      const pop = r.population ?? 0

      if (showPopulation3D) {
        // Height scaled logarithmically with population
        const colHeight = pop > 0 ? Math.max(0.25, Math.log10(Math.max(10, pop)) * 0.28) : 0.2
        const radius = selected === r.id ? 0.25 : 0.12
        object.position.set(r.east_m / 1000, groundY + colHeight / 2, -r.north_m / 1000)
        object.rotation.set(0, 0, 0)
        object.scale.set(radius, colHeight, radius)
        object.updateMatrix()
        mesh.current!.setMatrixAt(index, object.matrix)

        let colorHex = '#475569'
        if (selected === r.id) {
          colorHex = '#2563eb'
        } else if (isAffected) {
          colorHex = thickness >= 5.0 ? '#dc2626' : thickness >= 2.0 ? '#ea580c' : '#d97706'
        } else if (hasTrace) {
          colorHex = '#ca8a04'
        }
        mesh.current!.setColorAt(index, new THREE.Color(colorHex))
      } else {
        object.position.set(r.east_m / 1000, groundY + 0.025, -r.north_m / 1000)
        object.rotation.set(-Math.PI / 2, 0, 0)
        object.scale.setScalar(selected === r.id ? 0.18 : 0.07)
        object.updateMatrix()
        mesh.current!.setMatrixAt(index, object.matrix)
        mesh.current!.setColorAt(index, new THREE.Color(selected === r.id ? '#1b5cad' : isAffected ? '#d97706' : hasTrace ? '#ca8a04' : '#274863'))
      }
    })
    mesh.current.instanceMatrix.needsUpdate = true
    if (mesh.current.instanceColor) mesh.current.instanceColor.needsUpdate = true
    mesh.current.computeBoundingSphere()
    invalidate()
  }, [receptors, terrain, selected, invalidate, emphasizeTaal, showPopulation3D])

  useEffect(() => () => {
    if (mesh.current) {
      mesh.current.geometry.dispose()
      if (mesh.current.material instanceof THREE.Material) {
        mesh.current.material.dispose()
      }
    }
  }, [showPopulation3D])

  function select(event: ThreeEvent<MouseEvent>) {
    event.stopPropagation()
    if (event.instanceId != null && receptors[event.instanceId]) {
      onSelect(receptors[event.instanceId].id)
    }
  }

  if (receptors.length === 0) return null

  return (
    <instancedMesh
      key={showPopulation3D ? 'population-columns' : 'receptor-disks'}
      ref={mesh}
      args={[undefined, undefined, receptors.length]}
      onClick={select}
      frustumCulled={false}
    >
      {showPopulation3D ? <cylinderGeometry args={[1, 1, 1, 12]} /> : <circleGeometry args={[1, 12]} />}
      <meshStandardMaterial roughness={0.4} metalness={0.1} side={THREE.DoubleSide} />
    </instancedMesh>
  )
}

function Wind({ result, height, view }: { result: SimulationResult; height: number; view: View }) {
  const label = useRef<HTMLSpanElement | null>(null)
  const { camera, gl, size, invalidate } = useThree()
  const projected = useMemo(() => new THREE.Vector3(), [])
  const length = view === 'regional' ? 8 : 2
  const arrow = useMemo(() => {
    const direction = new THREE.Vector3(result.illustration.wind_east_m_s, 0, -result.illustration.wind_north_m_s)
    if (direction.length() === 0) return null
    // Direction cue only: arrow length is a view-dependent display size, never wind speed.
    return new THREE.ArrowHelper(direction.normalize(), new THREE.Vector3(0, height, 0), length, '#324f53', length * 0.15, length * 0.075)
  }, [result, height, length])
  useEffect(() => () => arrow?.dispose(), [arrow])
  useEffect(() => {
    if (!arrow || !gl.domElement.parentElement) return
    const element = document.createElement('span')
    element.className = 'scene-arrow-label'
    element.textContent = 'Wind / ash transport'
    element.style.visibility = 'hidden'
    gl.domElement.parentElement.appendChild(element)
    label.current = element
    invalidate()
    return () => { element.remove(); label.current = null }
  }, [arrow, gl, invalidate])
  useFrame(() => {
    if (!arrow || !label.current) return
    projected.set(0, length, 0)
    arrow.localToWorld(projected).project(camera)
    const x = (projected.x + 1) * size.width / 2, y = (1 - projected.y) * size.height / 2
    const visible = projected.z >= -1 && projected.z <= 1 && x >= 0 && x <= size.width && y >= 0 && y <= size.height
    label.current.style.visibility = visible ? 'visible' : 'hidden'
    const left = Math.max(8, Math.min(size.width - label.current.offsetWidth - 8, x + 8))
    let top = Math.max(8, Math.min(size.height - label.current.offsetHeight - 8, y - label.current.offsetHeight - 5))
    const hud = gl.domElement.closest('.scene-stage')?.querySelector<HTMLElement>('.scene-hud')
    if (hud && left < hud.offsetLeft + hud.offsetWidth && left + label.current.offsetWidth > hud.offsetLeft && top < hud.offsetTop + hud.offsetHeight && top + label.current.offsetHeight > hud.offsetTop) {
      top = Math.min(size.height - label.current.offsetHeight - 8, hud.offsetTop + hud.offsetHeight + 8)
    }
    label.current.style.transform = `translate(${left}px, ${top}px)`
  })
  return arrow ? <primitive object={arrow} /> : null
}

function DatumConnector({ surface, base }: { surface: number; base: number }) {
  const line = useMemo(() => {
    const geometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, surface, 0), new THREE.Vector3(0, base, 0)])
    const value = new THREE.Line(geometry, new THREE.LineDashedMaterial({ color: '#354b65', dashSize: 0.025, gapSize: 0.02 }))
    value.computeLineDistances()
    return value
  }, [surface, base])
  useEffect(() => () => { line.geometry.dispose(); line.material.dispose() }, [line])
  return Math.abs(base - surface) > 0.025 ? <primitive object={line} /> : null
}

function Compass({ view, height, base }: { view: View; height: number; base: number }) {
  const group = useMemo(() => {
    const value = new THREE.Group()
    const extent = Math.max(10, height * 1.7)
    const isClose = view !== 'regional'
    const length = isClose ? extent * 0.15 : 20
    const origin = new THREE.Vector3(isClose ? -extent * 0.45 : -65, base + 0.3, isClose ? extent * 0.4 : 65)
    for (const direction of [new THREE.Vector3(0, 0, -1), new THREE.Vector3(1, 0, 0)]) {
      const arrow = new THREE.ArrowHelper(direction, origin, length, '#173b63', length * 0.1, length * 0.05)
      for (const material of [arrow.line.material, arrow.cone.material].flat()) {
        material.depthTest = false; material.toneMapped = false
        if (material instanceof THREE.LineBasicMaterial || material instanceof THREE.MeshBasicMaterial) material.fog = false
      }
      arrow.line.renderOrder = 2; arrow.cone.renderOrder = 2
      value.add(arrow)
    }
    for (const [letter, x, z] of [['N', origin.x, origin.z - length * 1.2], ['E', origin.x + length * 1.2, origin.z]] as const) {
      const canvas = document.createElement('canvas'); canvas.width = 128; canvas.height = 128
      const context = canvas.getContext('2d')!
      context.fillStyle = '#ffffff'; context.beginPath(); context.arc(64, 64, 61, 0, Math.PI * 2); context.fill()
      context.font = 'bold 90px Segoe UI'; context.textAlign = 'center'; context.textBaseline = 'middle'; context.fillStyle = '#173b63'; context.fillText(letter, 64, 64)
      const texture = new THREE.CanvasTexture(canvas)
      texture.colorSpace = THREE.SRGBColorSpace
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, depthTest: false, depthWrite: false, toneMapped: false, fog: false }))
      // Sprite's built-in geometry is global; own this copy so its renderer
      // disposal listeners cannot retain a previous Canvas and eruption data.
      sprite.geometry = sprite.geometry.clone()
      sprite.position.set(x, base + 0.3, z); sprite.scale.set(length * 0.4, length * 0.4, 1); sprite.renderOrder = 3; value.add(sprite)
    }
    return value
  }, [view, height, base])
  useEffect(() => () => group.children.forEach(child => {
    if (child instanceof THREE.Sprite) { child.geometry.dispose(); child.material.map?.dispose(); child.material.dispose() }
    else if (child instanceof THREE.ArrowHelper) child.dispose()
  }), [group])
  return <primitive object={group} />
}

type Earthquake = {
  id: string
  time: string
  latitude: number
  longitude: number
  depth_km: number
  magnitude: number
  place: string
  source: string
}

function SubsurfaceSeismicity({
  scenario,
  show,
  depthFilter = 'all',
  onInspectQuake,
  onQuakesLoaded,
}: {
  scenario: Scenario
  show: boolean
  depthFilter?: 'all' | 'shallow' | 'deep'
  onInspectQuake: (quake: Earthquake | null) => void
  onQuakesLoaded?: (quakes: Earthquake[]) => void
}) {
  const [quakes, setQuakes] = useState<Earthquake[]>([])
  const mesh = useRef<THREE.InstancedMesh>(null)
  const { invalidate } = useThree()

  useEffect(() => {
    if (!show || scenario.volcano_id !== 'taal') return
    const controller = new AbortController()
    fetch('/taal_earthquakes_2021_2024.json', { signal: controller.signal, cache: 'no-store' })
      .then(r => r.ok ? (r.json() as Promise<Earthquake[]>) : [])
      .then(data => {
        setQuakes(data)
        onQuakesLoaded?.(data)
        invalidate()
      })
      .catch(() => {})
    return () => controller.abort()
  }, [show, scenario.volcano_id, onQuakesLoaded, invalidate])

  const filteredQuakes = useMemo(() => {
    if (depthFilter === 'shallow') return quakes.filter(q => q.depth_km <= 15)
    if (depthFilter === 'deep') return quakes.filter(q => q.depth_km > 15)
    return quakes
  }, [quakes, depthFilter])

  // R3F owns the declarative mesh, geometry and material. Its reconciler disposes
  // replaced/unmounted instances; filter changes must not dispose live children.
  useEffect(() => {
    if (!mesh.current || filteredQuakes.length === 0) return
    const object = new THREE.Object3D()
    filteredQuakes.forEach((q, index) => {
      const dLat = (q.latitude - scenario.vent_lat) * 111.0
      const dLon = (q.longitude - scenario.vent_lon) * 111.0 * Math.cos((scenario.vent_lat * Math.PI) / 180)
      const displayDepth = Math.min(35, q.depth_km)
      const y = -displayDepth
      const radius = Math.max(0.2, (q.magnitude - 1.5) * 0.25)
      object.position.set(dLon, y, -dLat)
      object.scale.setScalar(radius)
      object.updateMatrix()
      mesh.current!.setMatrixAt(index, object.matrix)
      const color = new THREE.Color(q.depth_km <= 5 ? '#e04f32' : q.depth_km <= 15 ? '#e68a2e' : '#3d72a4')
      mesh.current!.setColorAt(index, color)
    })
    mesh.current.count = filteredQuakes.length
    mesh.current.instanceMatrix.needsUpdate = true
    if (mesh.current.instanceColor) mesh.current.instanceColor.needsUpdate = true
    invalidate()
  }, [filteredQuakes, scenario.vent_lat, scenario.vent_lon, invalidate])

  if (!show || scenario.volcano_id !== 'taal' || filteredQuakes.length === 0) return null

  function handleClick(event: ThreeEvent<MouseEvent>) {
    event.stopPropagation()
    if (event.instanceId != null && filteredQuakes[event.instanceId]) {
      onInspectQuake(filteredQuakes[event.instanceId])
    }
  }

  return (
    <instancedMesh
      ref={mesh}
      args={[undefined, undefined, filteredQuakes.length]}
      onClick={handleClick}
      frustumCulled={false}
      renderOrder={999}
    >
      <sphereGeometry args={[1, 14, 14]} />
      <meshStandardMaterial transparent opacity={0.85} depthTest={false} depthWrite={false} roughness={0.6} />
    </instancedMesh>
  )
}

function TaalPDZ3D({ scenario, terrain, emphasizeTaal, show }: { scenario: Scenario; terrain: TerrainAsset | null; emphasizeTaal: boolean; show: boolean }) {
  const [points, setPoints] = useState<THREE.Vector3[]>([])
  const { invalidate } = useThree()

  useEffect(() => {
    if (!show || scenario.volcano_id !== 'taal') return
    const controller = new AbortController()
    fetch('/taal_pdz.geojson', { signal: controller.signal, cache: 'no-store' })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        const ring: [number, number][] = data?.features?.[0]?.geometry?.coordinates?.[0]
        if (!ring) return
        const pts = ring.map(([lon, lat]) => {
          const east_m = (lon - scenario.vent_lon) * 111000 * Math.cos((scenario.vent_lat * Math.PI) / 180)
          const north_m = (lat - scenario.vent_lat) * 111000
          const groundM = terrain ? surfaceHeightM(terrain, east_m, north_m, emphasizeTaal) ?? 3 : 3
          return new THREE.Vector3(east_m / 1000, groundM / 1000 + 0.04, -north_m / 1000)
        })
        setPoints(pts)
        invalidate()
      })
      .catch(() => {})
    return () => controller.abort()
  }, [show, scenario.volcano_id, scenario.vent_lat, scenario.vent_lon, terrain, emphasizeTaal, invalidate])

  const line = useMemo(() => {
    if (points.length < 2) return null
    const geometry = new THREE.BufferGeometry().setFromPoints(points)
    const material = new THREE.LineDashedMaterial({ color: '#6b3d87', dashSize: 0.15, gapSize: 0.1 })
    const lineObj = new THREE.Line(geometry, material)
    lineObj.computeLineDistances()
    return lineObj
  }, [points])

  useEffect(() => () => { line?.geometry.dispose(); line?.material.dispose() }, [line])

  if (!show || scenario.volcano_id !== 'taal' || !line) return null
  return <primitive object={line} />
}

function TaalDikeVector3D({ scenario, base, show }: { scenario: Scenario; base: number; show: boolean }) {
  const [data, setData] = useState<{ dike_azimuth_deg: number; dike_length_km: number } | null>(null)
  const { invalidate } = useThree()

  useEffect(() => {
    if (!show || scenario.volcano_id !== 'taal') return
    const controller = new AbortController()
    fetch('/taal_deformation_bato2021.json', { signal: controller.signal, cache: 'no-store' })
      .then(r => r.ok ? r.json() : null)
      .then(json => {
        if (json?.dike_azimuth_deg && json?.dike_length_km) {
          setData({ dike_azimuth_deg: json.dike_azimuth_deg, dike_length_km: json.dike_length_km })
          invalidate()
        }
      })
      .catch(() => {})
    return () => controller.abort()
  }, [show, scenario.volcano_id, invalidate])

  const arrow = useMemo(() => {
    if (!data) return null
    const rad = (data.dike_azimuth_deg * Math.PI) / 180
    const dir = new THREE.Vector3(Math.sin(rad), 0, -Math.cos(rad)).normalize()
    const origin = new THREE.Vector3(0, base - 1.2, 0)
    const length = data.dike_length_km
    return new THREE.ArrowHelper(dir, origin, length, '#d97706', length * 0.2, length * 0.1)
  }, [data, base])

  useEffect(() => () => arrow?.dispose(), [arrow])

  if (!show || scenario.volcano_id !== 'taal' || !arrow) return null
  return <primitive object={arrow} />
}

type ActivityEntry = { date: string; alert_level: number; so2_t_day: number; plume_height_m: number; event_type: string; source: string; review_status?: string }

function TaalAlertLevelRing3D({ scenario, base, show }: { scenario: Scenario; base: number; show: boolean }) {
  const [latest, setLatest] = useState<ActivityEntry | null>(null)
  const { invalidate } = useThree()

  useEffect(() => {
    if (!show || scenario.volcano_id !== 'taal') return
    const controller = new AbortController()
    fetch('/taal_activity_log_2021_2024.json', { signal: controller.signal, cache: 'no-store' })
      .then(r => r.ok ? (r.json() as Promise<ActivityEntry[]>) : [])
      .then(entries => {
        const reviewed = Array.isArray(entries) ? entries.filter(entry => entry.review_status === 'reviewed') : []
        if (reviewed.length > 0) {
          setLatest(reviewed[reviewed.length - 1])
          invalidate()
        }
      })
      .catch(() => {})
    return () => controller.abort()
  }, [show, scenario.volcano_id, invalidate])

  const ring = useMemo(() => {
    if (!latest) return null
    const color = latest.alert_level === 3 ? '#dc2626' : latest.alert_level === 2 ? '#f59e0b' : '#16a34a'
    const geometry = new THREE.RingGeometry(2.3, 2.5, 48)
    const material = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, transparent: true, opacity: 0.6, depthWrite: false })
    const mesh = new THREE.Mesh(geometry, material)
    mesh.rotation.x = -Math.PI / 2
    mesh.position.y = base + 0.05
    return mesh
  }, [latest, base])

  useEffect(() => () => { ring?.geometry.dispose(); if (ring?.material instanceof THREE.Material) ring.material.dispose() }, [ring])

  if (!show || scenario.volcano_id !== 'taal' || !ring) return null
  return <primitive object={ring} />
}

function TaalTropomiPlumeCue({ scenario, height, show }: { scenario: Scenario; height: number; show: boolean }) {
  const [azimuth, setAzimuth] = useState<number | null>(null)
  const { invalidate } = useThree()

  useEffect(() => {
    if (!show || scenario.volcano_id !== 'taal') return
    const controller = new AbortController()
    fetch('/taal_tropomi_july2021.json', { signal: controller.signal, cache: 'no-store' })
      .then(r => r.ok ? r.json() : null)
      .then(json => {
        if (json?.review_status === 'reviewed' && Number.isFinite(json?.plume_from_bearing_deg)) {
          setAzimuth(json.plume_from_bearing_deg)
          invalidate()
        }
      })
      .catch(() => {})
    return () => controller.abort()
  }, [show, scenario.volcano_id, invalidate])

  const arrow = useMemo(() => {
    if (azimuth == null) return null
    const transportDeg = (azimuth + 180) % 360
    const rad = (transportDeg * Math.PI) / 180
    const dir = new THREE.Vector3(Math.sin(rad), 0, -Math.cos(rad)).normalize()
    return new THREE.ArrowHelper(dir, new THREE.Vector3(0, height, 0), 6, '#0284c7', 0.9, 0.45)
  }, [azimuth, height])

  useEffect(() => () => arrow?.dispose(), [arrow])

  if (!show || scenario.volcano_id !== 'taal' || !arrow) return null
  return <primitive object={arrow} />
}

function ColumnAltimeter({ base, height, show }: { base: number; height: number; show: boolean }) {
  const rulerGroup = useMemo(() => {
    if (!show) return null
    const group = new THREE.Group()
    const maxHeight = Math.max(height, 20)
    const points: THREE.Vector3[] = []
    const x = -1.5
    // Main vertical axis line
    points.push(new THREE.Vector3(x, base, 0))
    points.push(new THREE.Vector3(x, base + maxHeight, 0))

    // Ticks every 5 km ASL
    const tickPoints: THREE.Vector3[] = []
    for (let h = 5; h <= maxHeight; h += 5) {
      tickPoints.push(new THREE.Vector3(x, base + h, 0))
      tickPoints.push(new THREE.Vector3(x - 0.4, base + h, 0))
    }

    const axisGeom = new THREE.BufferGeometry().setFromPoints(points)
    const axisMat = new THREE.LineBasicMaterial({ color: '#2563eb', transparent: true, opacity: 0.75 })
    group.add(new THREE.Line(axisGeom, axisMat))

    const tickGeom = new THREE.BufferGeometry().setFromPoints(tickPoints)
    const tickMat = new THREE.LineBasicMaterial({ color: '#2563eb', transparent: true, opacity: 0.85 })
    group.add(new THREE.LineSegments(tickGeom, tickMat))

    const flightLevels: Record<number, string> = { 5: '5 km · FL160', 10: '10 km · FL330', 15: '15 km · FL490', 20: '20 km · FL650' }
    for (let h = 5; h <= maxHeight; h += 5) {
      const text = flightLevels[h] ?? `${h} km`
      const canvas = document.createElement('canvas')
      canvas.width = 256
      canvas.height = 64
      const ctx = canvas.getContext('2d')!
      ctx.fillStyle = '#ffffffd8'
      ctx.fillRect(0, 0, 256, 64)
      ctx.strokeStyle = '#93c5fd'
      ctx.lineWidth = 4
      ctx.strokeRect(2, 2, 252, 60)
      ctx.font = 'bold 26px Segoe UI, sans-serif'
      ctx.fillStyle = '#1e3a8a'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(text, 128, 32)
      const texture = new THREE.CanvasTexture(canvas)
      texture.colorSpace = THREE.SRGBColorSpace
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false }))
      sprite.geometry = sprite.geometry.clone()
      sprite.position.set(x - 1.5, base + h, 0)
      sprite.scale.set(1.8, 0.45, 1)
      group.add(sprite)
    }

    return group
  }, [base, height, show])

  useEffect(() => () => {
    if (!rulerGroup) return
    rulerGroup.children.forEach(child => {
      if (child instanceof THREE.Line || child instanceof THREE.LineSegments) {
        child.geometry.dispose()
        if (child.material instanceof THREE.Material) child.material.dispose()
      } else if (child instanceof THREE.Sprite) {
        child.geometry.dispose()
        child.material.map?.dispose()
        child.material.dispose()
      }
    })
  }, [rulerGroup])

  if (!show || !rulerGroup) return null
  return <primitive object={rulerGroup} />
}

export default function VolcanoScene({ scenario, result, selected, onSelect, eruptionSequence = null, frameIndex = 0, sequencePlaying = false, onAvailabilityChange }: Props) {
  const [supported, setSupported] = useState(supportsWebGL2)
  const [rendererFailed, setRendererFailed] = useState(false)
  const [graphicsAttempt, setGraphicsAttempt] = useState(0)
  const [terrainAttempt, setTerrainAttempt] = useState(0)
  const [acceptedTerrainFallback, setAcceptedTerrainFallback] = useState('')
  const [playing, setPlaying] = useState(false)
  const [replay, setReplay] = useState(0)
  const [view, setView] = useState<View>('close')
  const [reset, setReset] = useState(0)
  const [fps, setFps] = useState<{ render: number; pacing: number } | null>(null)
  const [reduced, setReduced] = useState(false)
  const [physicalElapsed, setPhysicalElapsed] = useState(0)
  const [showDeposit, setShowDeposit] = useState(false)
  const [showGrains, setShowGrains] = useState(false)
  const [showAltimeter, setShowAltimeter] = useState(false)
  const [showSeismicity, setShowSeismicity] = useState(false)
  const [quakeDepthFilter, setQuakeDepthFilter] = useState<'all' | 'shallow' | 'deep'>('all')
  const [showPDZ3D, setShowPDZ3D] = useState(false)
  const [showDike, setShowDike] = useState(false)
  const [showAlertRing, setShowAlertRing] = useState(false)
  const [showTropomi, setShowTropomi] = useState(false)
  const [showPopulation3D, setShowPopulation3D] = useState(true)
  const [inspectedQuake, setInspectedQuake] = useState<Earthquake | null>(null)
  const [availableQuakes, setAvailableQuakes] = useState<Earthquake[]>([])
  const [terrainState, setTerrainState] = useState<{ key: string; asset: TerrainAsset | null; error: string }>({ key: '', asset: null, error: '' })

  useEffect(() => {
    if (!showSeismicity || scenario.volcano_id !== 'taal') {
      setInspectedQuake(null)
    }
  }, [showSeismicity, scenario.volcano_id])

  useEffect(() => {
    if (!inspectedQuake) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setInspectedQuake(null)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [inspectedQuake])

  const cameraOptions = useMemo(() => {
    const list: { value: View; label: string }[] = [{ value: 'close', label: 'Volcano close-up' }]
    if (scenario.volcano_id === 'taal') {
      list.push({ value: 'tagaytay', label: 'Tagaytay Ridge (caldera rim)' })
    }
    list.push({ value: 'crosswind', label: 'Cross-wind plume profile' })
    list.push({ value: 'regional', label: 'Regional overview' })
    return list
  }, [scenario.volcano_id])

  useEffect(() => {
    if (view === 'tagaytay' && scenario.volcano_id !== 'taal') {
      setView('close')
    }
  }, [view, scenario.volcano_id])
  const terrainKey = `${scenario.volcano_id}:${scenario.vent_lat}:${scenario.vent_lon}`
  const terrain = terrainState.key === terrainKey ? terrainState.asset : null
  const terrainStatus = terrain ? 'Geographic terrain · ash uses flat model ground' : !['taal', 'mayon', 'kanlaon'].includes(scenario.volcano_id) ? 'Schematic terrain fallback · no geographic asset for this vent' : terrainState.key === terrainKey && terrainState.error ? 'Schematic terrain fallback · geographic terrain unavailable; see source details' : 'Loading geographic terrain · temporary schematic view'
  useEffect(() => {
    if (!['taal', 'mayon', 'kanlaon'].includes(scenario.volcano_id)) return
    const controller = new AbortController()
    fetch(`/terrain/${scenario.volcano_id}.json`, { signal: controller.signal, cache: 'no-store' }).then(async response => {
      if (!response.ok) throw new Error('Local terrain asset is unavailable')
      const asset: unknown = await response.json()
      if (!isTerrainAsset(asset)) throw new Error('Local terrain asset has an unexpected structure')
      if (!matchesTerrainOrigin(asset, scenario.volcano_id, scenario.vent_lat, scenario.vent_lon)) throw new Error('The edited vent differs from the fixed terrain origin; geographic terrain is hidden')
      setTerrainState({ key: terrainKey, asset, error: '' })
    }).catch(error => { if (!controller.signal.aborted) setTerrainState({ key: terrainKey, asset: null, error: error instanceof Error ? error.message : 'Terrain could not be loaded' }) })
    return () => controller.abort()
  }, [scenario.volcano_id, scenario.vent_lat, scenario.vent_lon, terrainKey, terrainAttempt])
  const terrainFailed = terrainState.key === terrainKey && Boolean(terrainState.error)
  const available = supported && !rendererFailed && (!terrainFailed || acceptedTerrainFallback === terrainKey)
  useEffect(() => { onAvailabilityChange?.(available) }, [available, onAvailabilityChange])
  function retryGraphics() { setPlaying(false); setRendererFailed(false); setSupported(supportsWebGL2()); setGraphicsAttempt(v => v + 1) }
  const canvasElement = useRef<HTMLCanvasElement | null>(null)
  const rendererCleanup = useRef<(() => void) | null>(null)
  useEffect(() => {
    if (!supported || rendererFailed) { rendererCleanup.current?.(); rendererCleanup.current = null }
    return () => { rendererCleanup.current?.(); rendererCleanup.current = null }
  }, [supported, rendererFailed, graphicsAttempt])
  const contextLost = useCallback(function handleContextLost(event: Event) {
    event.preventDefault()
    if (event.currentTarget instanceof HTMLCanvasElement) event.currentTarget.removeEventListener('webglcontextlost', handleContextLost)
    canvasElement.current = null
    setPlaying(false)
    setSupported(false)
  }, [])
  useEffect(() => {
    const stop = () => setPlaying(false)
    const pause = () => { if (document.hidden) setPlaying(false) }
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
    const reduce = () => { if (preference.matches) setPlaying(false) }
    document.addEventListener('visibilitychange', pause)
    window.addEventListener('blur', stop); window.addEventListener('pagehide', stop)
    preference.addEventListener('change', reduce)
    return () => {
      document.removeEventListener('visibilitychange', pause)
      window.removeEventListener('blur', stop); window.removeEventListener('pagehide', stop)
      preference.removeEventListener('change', reduce)
      canvasElement.current?.removeEventListener('webglcontextlost', contextLost)
    }
  }, [contextLost])
  const height = scenario.column_height_m / 1000
  const base = terrain ? scenario.vent_elevation_m / 1000 : 0
  const emphasizeTaal = Boolean(terrain && scenario.volcano_id === 'taal' && view === 'close')
  const depositHeight = useMemo(() => terrain ? maximumTerrainHeightM(terrain, emphasizeTaal) / 1000 + 0.1 : 0.015, [terrain, emphasizeTaal])
  const ventSurface = terrain ? surfaceHeightM(terrain, 0, 0) : null
  const ventDisplaySurface = terrain ? surfaceHeightM(terrain, 0, 0, emphasizeTaal) : null
  const framePair = eruptionSequence?.frames.length ? eruptionFramePair(eruptionSequence, frameIndex) : null
  const sequenceFrame = framePair?.current ?? null
  const frameResult = useMemo(() => sequenceFrame && sequenceFrame.phase !== 'before' && sequenceFrame.phase !== 'after' && result ? { ...result, grid: sequenceFrame.grid, receptors: sequenceFrame.receptors } : result, [result, sequenceFrame])
  const columnTopM = framePair ? framePair.current.column_top_m + (framePair.next.column_top_m - framePair.current.column_top_m) * framePair.blend : scenario.column_height_m
  const showSource = !sequenceFrame || sequenceFrame.phase !== 'before'
  const lavaDirection = useMemo(() => {
    const end = eruptionSequence?.lava.path.at(-1)
    return end && Math.hypot(end.east_m, end.north_m) > 0 ? [end.east_m, end.north_m] : null
  }, [eruptionSequence])
  const reportPerformance = useCallback((render: number, pacing: number) => setFps({ render, pacing }), [])

  const inDomainReceptors = useMemo(() => {
    return (frameResult?.receptors ?? []).filter(r => r.in_domain)
  }, [frameResult])

  const exposedReceptors = useMemo(() => {
    return inDomainReceptors.filter(r => (r.thickness_mm ?? 0) >= 0.5)
  }, [inDomainReceptors])

  const traceReceptors = useMemo(() => {
    return inDomainReceptors.filter(r => (r.thickness_mm ?? 0) >= 0.01)
  }, [inDomainReceptors])

  const realTimeStats = useMemo(() => {
    const active = exposedReceptors.length > 0 ? exposedReceptors : traceReceptors
    const isTraceOnly = exposedReceptors.length === 0 && traceReceptors.length > 0
    const count = active.length
    const reportedCount = exposedReceptors.length
    const traceCount = traceReceptors.length
    const totalInDomain = inDomainReceptors.length
    const pop = active.reduce((sum, r) => sum + (r.population ?? 0), 0)
    const families = calculateFamiliesAffected(pop)
    let peakName = ''
    let peakMm = 0
    for (const r of inDomainReceptors) {
      const mm = r.thickness_mm ?? 0
      if (mm > peakMm) {
        peakMm = mm
        peakName = r.name.split(',')[0]
      }
    }
    return { count, reportedCount, traceCount, isTraceOnly, totalInDomain, pop, families, peakName, peakMm }
  }, [exposedReceptors, traceReceptors, inDomainReceptors])

  const selectedReceptor = useMemo(() => {
    if (!selected || !frameResult?.receptors) return null
    return frameResult.receptors.find(r => r.id === selected) ?? null
  }, [selected, frameResult])

  useEffect(() => {
    if (!selected) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onSelect('')
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selected, onSelect])
  const qaMode = new URLSearchParams(window.location.search).get('qa') === '1'
  return <div className="scene-wrap">
    {qaMode && <button type="button" disabled={!supported} onClick={() => { const raw = canvasElement.current?.getAttribute('data-frame-evidence'); if (raw) download('abo-frame-timing.json', JSON.stringify({ ...JSON.parse(raw), captured_at: new Date().toISOString(), viewport: [window.innerWidth, window.innerHeight], device_pixel_ratio: window.devicePixelRatio, hidden: document.hidden, has_focus: document.hasFocus(), camera: view, reduced_detail: reduced, scenario, eruption_options: eruptionSequence?.options ?? null, assets: [...document.querySelectorAll<HTMLScriptElement>('script[src]')].map(script => script.src) }, null, 2), 'application/json') }}>Download frame timing JSON</button>}
    <div className="scene-stage">
      <div className="scene-hud"><strong>{emphasizeTaal ? 'Taal · Volcano Island' : GEOGRAPHIC_NAMES[scenario.volcano_id] ?? scenario.volcano_id ?? 'Custom volcano'}</strong><span>{terrain ? emphasizeTaal ? 'Island relief ×6 · horizontal 1:1' : 'Terrain scale 1:1' : 'Schematic geographic fallback'}</span>{eruptionSequence?.lava.enabled && <span>Lava width enlarged</span>}{eruptionSequence && eruptionSequence.fountain_paths_m.length > 0 && sequenceFrame?.phase === 'erupting' && <span>Fountain illustration ×4</span>}</div>
      {inspectedQuake && (
        <div className="scene-inspection-card" role="region" aria-label="Selected earthquake details">
          <strong>USGS Seismicity (FDSN)</strong>
          <span>M {number(inspectedQuake.magnitude, 1)} · Depth {number(inspectedQuake.depth_km, 1)} km</span>
          <span>{inspectedQuake.time.slice(0, 10)} {inspectedQuake.time.slice(11, 19)} UTC</span>
          <span>{inspectedQuake.place}</span>
          <button type="button" onClick={() => setInspectedQuake(null)}>Close</button>
        </div>
      )}
      {selectedReceptor && !inspectedQuake && (
        <div className="scene-inspection-card" role="region" aria-label="Selected municipality details">
          <strong>{selectedReceptor.name}</strong>
          <span>{selectedReceptor.kind} · {selectedReceptor.in_domain ? 'In domain' : 'Outside domain'}</span>
          <span>Ash thickness: {selectedReceptor.thickness_mm != null ? `${number(selectedReceptor.thickness_mm, 2)} mm` : 'Undetected (<0.5 mm)'}</span>
          {selectedReceptor.population != null ? (
            <>
              <span>Population ({selectedReceptor.population_year ?? 2020}): {number(selectedReceptor.population, 0)}</span>
              <span>Est. families: {number(calculateFamiliesAffected(selectedReceptor.population), 0)} (PSA 4.1/family)</span>
            </>
          ) : (
            <span>Population: Unknown census count</span>
          )}
          <button type="button" onClick={() => onSelect('')}>Close</button>
        </div>
      )}
      {!selectedReceptor && !inspectedQuake && showPopulation3D && frameResult && inDomainReceptors.length > 0 && (
        <div className="scene-impact-hud" role="status" aria-label="Real-time municipal exposure and affected families">
          <div className="impact-hud-title">
            <strong>Real-Time Exposure Tally</strong>
            {sequenceFrame && <span className="impact-hud-phase">{sequenceFrame.phase}</span>}
          </div>
          <div className="impact-hud-grid">
            <div className="impact-stat">
              <span className="impact-label">Municipalities reached</span>
              <span className="impact-value">{number(realTimeStats.count, 0)}<small> / {number(realTimeStats.totalInDomain, 0)}{realTimeStats.isTraceOnly ? ' (trace ≥0.01 mm)' : ''}</small></span>
            </div>
            <div className="impact-stat">
              <span className="impact-label">Peak centroid ash</span>
              <span className="impact-value">{number(realTimeStats.peakMm, 3)} mm{realTimeStats.peakName ? <small> · {realTimeStats.peakName}</small> : null}</span>
            </div>
            <div className="impact-stat">
              <span className="impact-label">Indicative population</span>
              <span className="impact-value">{number(realTimeStats.pop, 0)}</span>
            </div>
            <div className="impact-stat highlight-stat">
              <span className="impact-label">Est. families affected</span>
              <span className="impact-value">{number(realTimeStats.families, 0)}</span>
            </div>
          </div>
          <p className="impact-disclaimer">
            {realTimeStats.isTraceOnly ? `0 ≥0.5 mm reporting cutoff; showing ${realTimeStats.traceCount} trace (≥0.01 mm). ` : ''}PSA 2020 CPH · 4.1 persons/family (Region IV-A). Centroid screening, not evacuation tally.
          </p>
        </div>
      )}
      {supported && !rendererFailed ? <SceneBoundary key={graphicsAttempt} onFailure={() => { setPlaying(false); setRendererFailed(true) }} onRetry={retryGraphics}><Canvas camera={{ fov: 45, position: [145, 130, 160], near: 0.1, far: 1200 }} dpr={reduced ? 1 : [1, 1.5]} frameloop="demand" gl={{ antialias: true }} onCreated={({ gl }) => {
        canvasElement.current?.removeEventListener('webglcontextlost', contextLost)
        canvasElement.current = gl.domElement
        gl.domElement.addEventListener('webglcontextlost', contextLost)
        rendererCleanup.current?.()
        rendererCleanup.current = guardRenderer(gl, () => { setPlaying(false); setRendererFailed(true) })
      }} fallback={<p>3D unavailable. Use map and table.</p>}>
        <color attach="background" args={['#e8f0fa']} />
        <fog attach="fog" args={['#e8f0fa', 180, 650]} />
        <ambientLight intensity={0.5} /><hemisphereLight args={['#ffffff', '#8fa3be', 0.5]} /><directionalLight position={[-18, 32, 25]} intensity={1.7} />
        <Camera view={view} reset={reset} height={height} base={base} emphasizeTaal={emphasizeTaal} lavaDirection={lavaDirection} windFromDeg={scenario.wind_from_deg} />
        <Compass view={view} height={height} base={base} />
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]}><planeGeometry args={[scenario.domain_km, scenario.domain_km]} /><meshStandardMaterial color="#dce5ef" side={THREE.DoubleSide} /></mesh>
        {terrain ? <TerrainBackdrop asset={terrain} reduced={reduced} emphasizeTaal={emphasizeTaal} /> : <Volcano id={scenario.volcano_id} scale={Math.min(1, height / 24)} />}
        {showSource && ventDisplaySurface !== null && <DatumConnector surface={ventDisplaySurface / 1000} base={base} />}
        {frameResult && showDeposit && showSource && <Deposit result={frameResult} height={depositHeight} />}
        <group position={[0, base, 0]}>{!eruptionSequence && <mesh position={[0, height / 2, 0]}><cylinderGeometry args={[0.7, 0.08, height, 24]} /><meshStandardMaterial color="#aaa69e" transparent opacity={0.35} depthWrite={false} /></mesh>}
          {result && showSource && <><Wind result={result} height={Math.max(0.1, columnTopM / 1000)} view={view} />{(!eruptionSequence || showGrains) && result.illustration.paths.map(path => <Path key={path.grain_index} path={path} />)}{!eruptionSequence && <Ash paths={result.illustration.paths} playing={playing} replay={replay} reduced={reduced} onDone={() => setPlaying(false)} onPerformance={reportPerformance} onClock={setPhysicalElapsed} />}</>}
        </group>
        {eruptionSequence && <EruptionEffects sequence={eruptionSequence} frameIndex={frameIndex} baseM={base * 1000} reduced={reduced} playing={sequencePlaying} onPerformance={reportPerformance} terrain={terrain} emphasizeTaal={emphasizeTaal} wind={[result?.illustration.wind_east_m_s ?? 0, result?.illustration.wind_north_m_s ?? 0]} />}
        {showAltimeter && <ColumnAltimeter base={base} height={Math.max(0.1, columnTopM / 1000)} show />}
        {scenario.volcano_id === 'taal' && <>
          {showSeismicity && <SubsurfaceSeismicity scenario={scenario} show depthFilter={quakeDepthFilter} onInspectQuake={setInspectedQuake} onQuakesLoaded={setAvailableQuakes} />}
          {showPDZ3D && <TaalPDZ3D scenario={scenario} terrain={terrain} emphasizeTaal={emphasizeTaal} show />}
          {showDike && <TaalDikeVector3D scenario={scenario} base={base} show />}
          {showAlertRing && <TaalAlertLevelRing3D scenario={scenario} base={base} show />}
          {showTropomi && <TaalTropomiPlumeCue scenario={scenario} height={Math.max(0.1, columnTopM / 1000)} show />}
        </>}
        {frameResult && <ReceptorMarkers result={frameResult} terrain={terrain} emphasizeTaal={emphasizeTaal} selected={selected} onSelect={onSelect} showPopulation3D={showPopulation3D} />}
      </Canvas></SceneBoundary> : <div className="fallback" role="alert"><h3>{rendererFailed ? '3D renderer stopped' : '3D needs WebGL 2'}</h3><p>Playback is paused. Run simulations normally, then use the map, stage slider, and location table.</p><button type="button" onClick={retryGraphics}>Retry 3D</button></div>}
      <div className="scene-caption"><span><Icon name="wind" />Wind FROM {number(scenario.wind_from_deg, 0)}° · {number(scenario.wind_speed_m_s)} m/s</span><span>{sequenceFrame ? sequenceFrame.phase === 'before' ? 'Before eruption · clear source' : sequenceFrame.phase === 'erupting' ? `Rising source column ${number(columnTopM / 1000)} km` : sequenceFrame.phase === 'settling' ? 'Source stopped · ash drifts and settles' : 'After eruption · accumulated deposits' : `Column ${number(scenario.column_height_m / 1000)} km above ground`}</span></div>
    </div>
    <div className="spatial-card-sidebar">
      <h2 id="terrain-title">Eruption & terrain</h2>
      <div className="scene-toolbar">
        <div className="scene-view-controls">
          <Select label="Camera view" disabled={!supported} value={view} onChange={value => { setView(value as View); setReset(v => v + 1) }} options={cameraOptions} />
          <button className="icon-button" type="button" aria-label="Reset camera" title="Reset camera" disabled={!supported} onClick={() => setReset(v => v + 1)}><Icon name="reset" /></button>
        </div>
        {!eruptionSequence && <div className="playback-controls"><button type="button" disabled={!result || !supported} onClick={() => {
          if (!playing && result && physicalElapsed >= replayDuration(result.illustration.paths)) setReplay(v => v + 1)
          setPlaying(v => !v)
        }}><Icon name={playing ? 'pause' : 'play'} />{playing ? 'Pause' : 'Play settling'}</button>
        <button className="icon-button" type="button" aria-label="Replay from start" title="Replay from start" disabled={!result || !supported} onClick={() => { setPlaying(false); setReplay(v => v + 1) }}><Icon name="history" /></button></div>}
      </div>
      {terrainFailed && acceptedTerrainFallback !== terrainKey && <div className="fallback" role="alert"><p>{terrainState.error}. Playback is paused until you choose a terrain view.</p><button type="button" onClick={() => { setTerrainState({ key: '', asset: null, error: '' }); setTerrainAttempt(v => v + 1) }}>Retry terrain</button><button type="button" onClick={() => setAcceptedTerrainFallback(terrainKey)}>Use schematic terrain</button></div>}
      {showDeposit && <><Legend /><p className="view-note spatial-sidebar-note">The flat quantitative layer floats {number(depositHeight)} km above sea level for visibility; its height is a display offset, not airborne ash.</p></>}
      <p className="view-note spatial-sidebar-note" role="status">{terrainStatus} · {eruptionSequence ? 'qualitative ash / condensed-steam cloud' : 'enlarged class markers'}{result && !eruptionSequence && <> · clock {number(physicalElapsed, 0)}/{number(replayDuration(result.illustration.paths), 0)} physical seconds in {REPLAY_DISPLAY_SECONDS} display seconds</>}.</p>
      {terrain?.source.attribution && <p className="view-note"><small>{terrain.source.attribution}</small></p>}
      <div className="scene-details"><details><summary>Illustration guide</summary>
      <p className="view-note">Drag to orbit. Focus the canvas for arrow keys and +/− zoom. The N/E compass rotates with the scene. Wind arrows show transport direction; their length is a display cue.</p>
      {eruptionSequence ? <><p className="view-note">The 3D illustration interpolates between Python snapshots; the map and its location inspector show the preceding computed snapshot. The folded table and CSV show eventual deposition. Python supplies ash-cloud centers and spread, fountain positions, and timed ground deposition. Gray billows and white condensed steam are qualitative shapes; volcanic gas itself is not rendered as a measured concentration. Cloud edges, opacity and vertical billow shape are artistic, not a CFD solution.</p><p className="view-note">{eruptionSequence.fountain_paths_m.length > 0 && <>{eruptionSequence.fountain_label} </>}{eruptionSequence.lava.enabled ? 'The lava front follows Python arrival times along the actual DEM route. Its width is enlarged to at least 130 m for visibility; hot and cooled colors are schematic, not temperature predictions. The close-up faces the routed slope.' : 'No downslope lava channel is enabled for this scenario.'}</p></> : <p className="view-note">Python supplies representative class centerlines and falling times; all classes share one physical clock. The adjacent map shows eventual deposition, not animated accumulation.</p>}
      <p className="view-note">Terrain does not change ash transport in the flat-ground solver. The optional class paths describe final representative settling paths.</p>
      {eruptionSequence && eruptionSequence.fountain_paths_m.length > 0 && <p className="view-note">Fountain arcs are enlarged 4× with 100 m display fragments for visibility. These assumed paths do not predict ballistic ranges.</p>}
      {ventSurface !== null && Math.abs(scenario.vent_elevation_m - ventSurface) > 25 && <p className="view-note">The column starts at the submitted {number(scenario.vent_elevation_m, 0)} m ASL model datum; the sampled vent surface is {number(ventSurface, 0)} m. The dashed connector shows this display offset, without changing the model.</p>}
      <div className="scene-layer-controls">
        <label className="checkbox-label"><input type="checkbox" checked={showDeposit} disabled={!result} onChange={event => setShowDeposit(event.target.checked)} /><span>Show detached deposit layer</span></label>
        {eruptionSequence && <label className="checkbox-label"><input type="checkbox" checked={showGrains} disabled={!result} onChange={event => setShowGrains(event.target.checked)} /><span>Show final grain-class paths</span></label>}
        <label className="checkbox-label"><input type="checkbox" checked={showAltimeter} onChange={event => setShowAltimeter(event.target.checked)} /><span>Show vertical altitude scale (flight levels)</span></label>
        {scenario.volcano_id === 'taal' && (
          <div className="seismicity-layer-wrap">
            <label className="checkbox-label"><input type="checkbox" checked={showSeismicity} onChange={event => setShowSeismicity(event.target.checked)} /><span>Show 2021-2024 hypocenters (USGS context)</span></label>
            {showSeismicity && (
              <>
                <div className="sublayer-filter" role="radiogroup" aria-label="Seismicity depth filter">
                  <label className="radio-label"><input type="radio" name="depth-filter" value="all" checked={quakeDepthFilter === 'all'} onChange={() => setQuakeDepthFilter('all')} />All depths</label>
                  <label className="radio-label"><input type="radio" name="depth-filter" value="shallow" checked={quakeDepthFilter === 'shallow'} onChange={() => setQuakeDepthFilter('shallow')} />Conduit (≤15 km)</label>
                  <label className="radio-label"><input type="radio" name="depth-filter" value="deep" checked={quakeDepthFilter === 'deep'} onChange={() => setQuakeDepthFilter('deep')} />Subduction (&gt;15 km)</label>
                </div>
                {availableQuakes.length > 0 && (
                  <div className="seismicity-accessible-select">
                    <label htmlFor="quake-inspect-select" className="view-note">Keyboard inspection:</label>
                    <select
                      id="quake-inspect-select"
                      value={inspectedQuake ? `${inspectedQuake.time}_${inspectedQuake.magnitude}` : ''}
                      onChange={e => {
                        const val = e.target.value
                        if (!val) setInspectedQuake(null)
                        else {
                          const match = availableQuakes.find(q => `${q.time}_${q.magnitude}` === val)
                          setInspectedQuake(match ?? null)
                        }
                      }}
                      aria-label="Select earthquake hypocenter for keyboard inspection"
                    >
                      <option value="">Inspect hypocenter (keyboard accessible)…</option>
                      {(quakeDepthFilter === 'shallow'
                        ? availableQuakes.filter(q => q.depth_km <= 15)
                        : quakeDepthFilter === 'deep'
                        ? availableQuakes.filter(q => q.depth_km > 15)
                        : availableQuakes
                      ).map((q, idx) => (
                        <option key={`${q.time}_${idx}`} value={`${q.time}_${q.magnitude}`}>
                          M{number(q.magnitude, 1)} · Depth {number(q.depth_km, 1)} km · {q.time.slice(0, 10)}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </>
            )}
          </div>
        )}
        {scenario.volcano_id === 'taal' && <label className="checkbox-label"><input type="checkbox" checked={showPDZ3D} onChange={event => setShowPDZ3D(event.target.checked)} /><span>Show PHIVOLCS PDZ (3D boundary)</span></label>}
        {scenario.volcano_id === 'taal' && <label className="checkbox-label"><input type="checkbox" disabled checked={showAlertRing} onChange={event => setShowAlertRing(event.target.checked)} /><span>Show Alert Level ring (source review pending)</span></label>}
        {scenario.volcano_id === 'taal' && <label className="checkbox-label"><input type="checkbox" checked={showDike} onChange={event => setShowDike(event.target.checked)} /><span>Show 2020 dike intrusion (Bato et al. 2021)</span></label>}
        {scenario.volcano_id === 'taal' && <label className="checkbox-label"><input type="checkbox" disabled checked={showTropomi} onChange={event => setShowTropomi(event.target.checked)} /><span>Show Sentinel-5P observed plume bearing (source review pending)</span></label>}
        <label className="checkbox-label"><input type="checkbox" checked={showPopulation3D} onChange={event => setShowPopulation3D(event.target.checked)} /><span>Show 3D population columns & affected families</span></label>
        {showPopulation3D && frameResult && inDomainReceptors.length > 0 && (
          <div className="population-accessible-select">
            <label htmlFor="municipality-inspect-select" className="view-note">Keyboard inspection:</label>
            <select
              id="municipality-inspect-select"
              value={selected ?? ''}
              onChange={e => onSelect(e.target.value)}
              aria-label="Select municipality for keyboard inspection"
            >
              <option value="">Inspect municipality (keyboard accessible)…</option>
              {inDomainReceptors.map(r => (
                <option key={r.id} value={r.id}>
                  {r.name} · {r.thickness_mm != null ? `${number(r.thickness_mm, 2)} mm` : '0 mm'} · {r.population != null ? `${number(r.population, 0)} pop` : 'no pop'}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
      {showAltimeter && <p className="view-note">Blue vertical ruler marks altitude above vent (5 km ~ FL160, 10 km ~ FL330 commercial jet cruising altitude, 15 km ~ FL490, 20 km ~ FL650 lower stratosphere). Contextual reference overlay.</p>}
      {showPopulation3D && <p className="view-note">Extruded 3D columns show municipal population and dynamic ash arrival. Column colors indicate deposit intensity (Amber: ≥0.5 mm, Red: ≥5 mm). Families estimated via PSA 2020 Region IV-A average of 4.1 persons/household. Centroid screening sample, not an evacuation tally.</p>}
      {showSeismicity && scenario.volcano_id === 'taal' && <p className="view-note">Subsurface spheres show USGS FDSN catalog context (48 of 49 events represent deep subduction zone earthquakes 47–234 km clamped to 35 km for visual scale; shallow volcanic conduit micro-seismicity is monitored by PHIVOLCS TVN/WOVOdat; click sphere or use keyboard selector for details). Contextual reference overlay - not a computed result of the ash model.</p>}
      {showPDZ3D && scenario.volcano_id === 'taal' && <p className="view-note">Purple dashed line is an OpenStreetMap shoreline approximation of Volcano Island, not official PHIVOLCS hazard GIS. The dated PDZ reference is distinct from the temporary 14 km evacuation buffer. Contextual reference overlay - not a computed result of the ash model.</p>}
      {showAlertRing && scenario.volcano_id === 'taal' && <p className="view-note">Base ring indicates curated Alert Level (Green: AL1, Amber: AL2, Red: AL3) from GVP/PHIVOLCS bulletin archives. Contextual reference overlay - not a computed result of the ash model.</p>}
      {showDike && scenario.volcano_id === 'taal' && <p className="view-note">Amber vector shows the 21 km length of the 21 × 8 km modeled dike (Bato et al. 2021, page 8, section 5). Southwest azimuth 225°, origin and display depth are schematic, not the fitted intrusion geometry. Contextual reference overlay - not a computed result of the ash model.</p>}
      {showTropomi && scenario.volcano_id === 'taal' && <p className="view-note">Blue arrow indicates satellite-observed plume transport towards 45° NE (wind from 225° SW) from Copernicus Sentinel-5P TROPOMI (July 2021). Contextual reference overlay - not a computed result of the ash model.</p>}
      {result && <ul aria-label="Grain-class legend">{result.illustration.paths.map(path => <li key={path.grain_index}><span aria-hidden="true" style={{ display: 'inline-block', width: '1.5rem', height: '0.2rem', background: GRAIN_COLORS[path.grain_index % GRAIN_COLORS.length], verticalAlign: 'middle', marginRight: '0.5rem' }} />Class {path.grain_index + 1} · {number(path.diameter_um)} µm · {number(scenario.grains[path.grain_index]?.settling_speed_m_s)} m/s · representative fall {number(path.settling_time_s)} s</li>)}</ul>}</details>
    <details><summary>Terrain source & graphics</summary>{terrain ? <><p>{terrain.source.title} · {terrain.source.resolution_m} m display sampling · {terrain.source.datum}. {emphasizeTaal ? 'Volcano Island relief is enlarged 6× for visibility, tapering to normal scale outside the island. Water levels and horizontal geography retain their source scale. Regional overview restores true relief; the simulation and eruption column height are unchanged.' : 'No vertical exaggeration.'}</p><p>Asset origin: {number(terrain.origin.lat, 5)}° N, {number(terrain.origin.lon, 5)}° E. Geographic coverage: 100 × 100 km. Outside it, the neutral plane indicates unavailable terrain. Ash paths use a flat datum translated by {scenario.vent_elevation_m} m ASL; they are not bent to terrain. The optional lava route uses raw terrain elevations.</p>{Math.abs(scenario.vent_elevation_m - terrain.vent_ground_m) > 0.01 && <p>Submitted vent elevation differs from the {terrain.vent_ground_m} m source-profile reference. The illustration uses your submitted datum.</p>}<a href={terrain.source.url} target="_blank" rel="noreferrer">Terrain source</a></> : <p>{!['taal', 'mayon', 'kanlaon'].includes(scenario.volcano_id) ? 'No geographic terrain asset is registered for this custom volcano.' : terrainState.key === terrainKey ? terrainState.error : 'Loading the local geographic terrain asset…'}</p>}<button type="button" aria-pressed={reduced} disabled={!supported} onClick={() => setReduced(v => !v)}>{reduced ? 'Restore visual detail' : 'Reduce visual detail'}</button>{fps !== null && <p className="performance-note">Replay: {number(fps.render, 0)} fps · browser callbacks: {number(fps.pacing, 0)}/s (recent two-second window). {fps.render < 30 ? 'Below the 30 fps target. Reduce detail or use a foreground browser with hardware acceleration.' : ''}</p>}</details></div>
    </div>
  </div>
}
