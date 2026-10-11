import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import type { EruptionSequence } from '../api/simulator'
import { eruptionDisplayFrame, lavaVisiblePath } from './eruptionReplay'

type Billow = { center: number[]; radius: number; vertical: number }
const LOBES = [[0, 0, 0, 1], [-0.4, 0.15, 0.1, 0.72], [0.4, 0.15, 0.1, 0.72], [0, 0.3, -0.35, 0.65]]

function Billows({ clouds, steam, reduced }: { clouds: Billow[]; steam?: boolean; reduced: boolean }) {
  const mesh = useRef<THREE.InstancedMesh>(null)
  const { invalidate } = useThree()
  useEffect(() => {
    if (!mesh.current) return
    const object = new THREE.Object3D()
    const lobes = reduced ? LOBES.slice(0, 2) : LOBES
    clouds.forEach(({ center, radius, vertical }, index) => lobes.forEach(([x, y, z, scale], lobe) => {
      const variation = 0.9 + 0.16 * Math.sin(index * 1.7 + lobe * 2.1)
      object.position.set(center[0] + x * radius, center[1] + y * vertical, center[2] + z * radius)
      object.scale.set(radius * scale * variation, vertical * scale, radius * scale / variation)
      object.updateMatrix()
      mesh.current!.setMatrixAt(index * lobes.length + lobe, object.matrix)
    }))
    mesh.current.count = clouds.length * lobes.length
    mesh.current.instanceMatrix.needsUpdate = true
    invalidate()
  }, [clouds, reduced, invalidate])
  return <instancedMesh ref={mesh} args={[undefined, undefined, 1024]} frustumCulled={false}>
    <sphereGeometry args={[1, reduced ? 7 : 12, reduced ? 5 : 8]} />
    <meshStandardMaterial color={steam ? '#d6dadd' : '#65686b'} transparent opacity={steam ? 0.3 : 0.14} roughness={1} depthWrite={false} />
  </instancedMesh>
}

function FountainPaths({ paths }: { paths: number[][][] }) {
  const group = useMemo(() => {
    const value = new THREE.Group()
    for (const points of paths) {
      const geometry = new THREE.BufferGeometry().setFromPoints(points.map(([east, north, height]) => new THREE.Vector3(east / 1000, height / 1000, -north / 1000)))
      value.add(new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: '#b34918', transparent: true, opacity: 0.65 })))
    }
    return value
  }, [paths])
  useEffect(() => () => group.children.forEach(child => {
    if (child instanceof THREE.Line) { child.geometry.dispose(); for (const material of [child.material].flat()) material.dispose() }
  }), [group])
  return <primitive object={group} />
}

function FountainFragments({ positions }: { positions: number[][] }) {
  const mesh = useRef<THREE.InstancedMesh>(null)
  const { invalidate } = useThree()
  useEffect(() => {
    if (!mesh.current) return
    const object = new THREE.Object3D()
    positions.slice(0, 256).forEach(([east, north, height], index) => {
      object.position.set(east / 1000, height / 1000, -north / 1000)
      object.scale.setScalar(0.025)
      object.updateMatrix()
      mesh.current!.setMatrixAt(index, object.matrix)
    })
    mesh.current.count = Math.min(256, positions.length)
    mesh.current.instanceMatrix.needsUpdate = true
    invalidate()
  }, [positions, invalidate])
  return <instancedMesh ref={mesh} args={[undefined, undefined, 256]} frustumCulled={false}><sphereGeometry args={[1, 6, 4]} /><meshStandardMaterial color="#d9651c" emissive="#d34711" emissiveIntensity={1.5} /></instancedMesh>
}

function LavaChannel({ sequence, elapsedS, phase }: { sequence: EruptionSequence; elapsedS: number; phase: string }) {
  const visible = useMemo(() => lavaVisiblePath(sequence.lava.path, elapsedS), [sequence.lava.path, elapsedS])
  const geometry = useMemo(() => {
    if (!sequence.lava.enabled || visible.length < 2 || phase === 'before') return null
    const curve = new THREE.CurvePath<THREE.Vector3>()
    const vertices = visible.map(point => new THREE.Vector3(point.east_m / 1000, (point.elevation_m + Math.max(3, point.thickness_m / 2)) / 1000, -point.north_m / 1000))
    for (let i = 1; i < vertices.length; i++) curve.add(new THREE.LineCurve3(vertices[i - 1], vertices[i]))
    const radius = Math.max(0.065, visible.reduce((sum, point) => sum + point.width_m, 0) / visible.length / 2000)
    return new THREE.TubeGeometry(curve, Math.max(8, vertices.length * 2), radius, 6, false)
  }, [sequence.lava.enabled, visible, phase])
  useEffect(() => () => geometry?.dispose(), [geometry])
  if (!geometry) return null
  const hot = phase === 'erupting', cooling = phase === 'settling'
  return <mesh geometry={geometry}><meshStandardMaterial color={hot ? '#d2641d' : cooling ? '#87452a' : '#473d38'} emissive={hot ? '#a4300d' : cooling ? '#351108' : '#000000'} emissiveIntensity={hot ? 1.4 : 0.3} roughness={hot ? 0.6 : 1} /></mesh>
}

function RenderMonitor({ playing, onPerformance }: { playing: boolean; onPerformance: (fps: number, pacing: number) => void }) {
  const counter = useRef({ frames: 0, callbacks: 0, start: 0 })
  const samples = useRef({ started: 0, callbacks: [] as number[], rendered: [] as number[] })
  const qa = new URLSearchParams(window.location.search).get('qa') === '1'
  const { setDpr, invalidate, gl } = useThree()
  useEffect(() => {
    counter.current = { frames: 0, callbacks: 0, start: performance.now() }
    if (!playing) { if (qa) gl.domElement.setAttribute('data-frame-evidence', JSON.stringify({ ...samples.current, playing: false, finished: performance.now() })); return }
    if (qa) samples.current = { started: performance.now(), callbacks: [], rendered: [] }
    let raf = 0
    const next = (now: number) => { counter.current.callbacks++; if (qa && samples.current.callbacks.length < 6000) samples.current.callbacks.push(now); invalidate(); raf = requestAnimationFrame(next) }
    raf = requestAnimationFrame(next)
    return () => cancelAnimationFrame(raf)
  }, [playing, invalidate, gl, qa])
  useFrame(() => {
    if (!playing) return
    const now = performance.now()
    if (qa && samples.current.rendered.length < 6000) samples.current.rendered.push(now)
    counter.current.frames++
    const elapsed = now - counter.current.start
    if (elapsed >= 2000) {
      const fps = counter.current.frames * 1000 / elapsed
      onPerformance(fps, counter.current.callbacks * 1000 / elapsed)
      if (qa) gl.domElement.setAttribute('data-frame-evidence', JSON.stringify({ ...samples.current, playing: true, sampled: now, dpr: gl.getPixelRatio() }))
      if (fps < 30) setDpr(1)
      counter.current = { frames: 0, callbacks: 0, start: now }
    }
  })
  return null
}

export default function EruptionEffects({ sequence, frameIndex, baseM, reduced, playing, onPerformance }: { sequence: EruptionSequence; frameIndex: number; baseM: number; reduced: boolean; playing: boolean; onPerformance: (fps: number, pacing: number) => void }) {
  const frame = useMemo(() => eruptionDisplayFrame(sequence, frameIndex), [sequence, frameIndex])
  const ash = useMemo(() => {
    if (sequence.scenario.mass_rate_kg_s === 0) return []
    const maximum = reduced ? 96 : 256
    const stride = Math.max(1, Math.ceil(frame.parcels.length / maximum))
    return frame.parcels.filter((_parcel, index) => index % stride === 0).map(parcel => {
      const radius = parcel.radius_m / 1000 * Math.sqrt(parcel.visibility)
      return { center: [parcel.east_m / 1000, parcel.height_m / 1000, -parcel.north_m / 1000], radius, vertical: Math.min(radius * 0.8, Math.max(0.025, parcel.height_m / 1500)) }
    })
  }, [frame.parcels, sequence.scenario.mass_rate_kg_s, reduced])
  const steam = useMemo(() => {
    if (frame.phase !== 'erupting' || frame.columnTopM <= 0 || sequence.scenario.mass_rate_kg_s === 0) return []
    const layers = reduced ? 8 : 16
    return Array.from({ length: layers }, (_, i) => {
      const fraction = (i + 0.5) / layers, height = frame.columnTopM / 1000
      const radius = 0.07 + Math.min(0.6, height * 0.12) * fraction
      return { center: [0, height * fraction, 0], radius, vertical: Math.max(radius, height / layers * 0.8) }
    })
  }, [frame.phase, frame.columnTopM, sequence.scenario.mass_rate_kg_s, reduced])
  return <>
    <RenderMonitor playing={playing} onPerformance={onPerformance} />
    <group position={[0, baseM / 1000, 0]}>
      <Billows clouds={ash} reduced={reduced} />
      <Billows clouds={steam} steam reduced={reduced} />
      {frame.phase === 'erupting' && sequence.scenario.mass_rate_kg_s > 0 && <group scale={4}><FountainPaths paths={sequence.fountain_paths_m} /><FountainFragments positions={frame.fountain} /></group>}
    </group>
    <LavaChannel sequence={sequence} elapsedS={frame.elapsedS} phase={frame.phase} />
  </>
}
