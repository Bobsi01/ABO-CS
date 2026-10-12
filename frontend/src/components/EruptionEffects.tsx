import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import type { EruptionSequence } from '../api/simulator'
import { eruptionDisplayFrame, lavaVisiblePath } from './eruptionReplay'
import { ashMarkers, cloudTexture, lavaRibbon, visualSeed } from './eruptionVisuals'
import type { TerrainAsset } from './terrain'

type Billow = { center: number[]; radius: number; vertical: number; seed: number; visibility: number }

function Billows({ clouds, steam, reduced }: { clouds: Billow[]; steam?: boolean; reduced: boolean }) {
  const mesh = useRef<THREE.InstancedMesh>(null)
  const texture = useMemo(() => cloudTexture(), [])
  const geometry = useMemo(() => {
    const value = new THREE.PlaneGeometry(2, 2)
    value.setAttribute('detail', new THREE.InstancedBufferAttribute(new Float32Array(1024 * 2), 2))
    return value
  }, [])
  const material = useMemo(() => new THREE.ShaderMaterial({
    uniforms: { cloudMap: { value: texture }, tint: { value: new THREE.Color(steam ? '#b2b4b7' : '#596069') }, opacity: { value: steam ? 0.45 : 0.13 } },
    vertexShader: `
      attribute vec2 detail;
      varying vec2 cloudUv;
      varying vec2 cloudDetail;
      void main() {
        cloudUv = uv; cloudDetail = detail;
        vec4 center = modelViewMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
        vec2 size = vec2(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz));
        center.xy += position.xy * size;
        gl_Position = projectionMatrix * center;
      }`,
    fragmentShader: `
      uniform sampler2D cloudMap;
      uniform vec3 tint;
      uniform float opacity;
      varying vec2 cloudUv;
      varying vec2 cloudDetail;
      void main() {
        float angle = cloudDetail.x * 6.2831853;
        vec2 p = cloudUv - 0.5;
        vec2 rotated = mat2(cos(angle), -sin(angle), sin(angle), cos(angle)) * p + 0.5;
        vec4 cloud = texture2D(cloudMap, rotated);
        float alpha = cloud.a * opacity * cloudDetail.y;
        if (alpha < 0.004) discard;
        gl_FragColor = vec4(tint * (0.85 + cloud.r * 0.25), alpha);
        #include <colorspace_fragment>
      }`,
    transparent: true, depthWrite: false, side: THREE.DoubleSide, toneMapped: false,
  }), [steam, texture])
  useEffect(() => {
    const instance = mesh.current
    return () => { instance?.dispose(); geometry.dispose(); material.dispose(); texture.dispose() }
  }, [geometry, material, texture])
  const { invalidate } = useThree()
  useEffect(() => {
    if (!mesh.current) return
    const object = new THREE.Object3D()
    const count = reduced ? 2 : 3, detail = geometry.getAttribute('detail') as THREE.InstancedBufferAttribute
    clouds.forEach(({ center, radius, vertical, seed, visibility }, index) => {
      for (let lobe = 0; lobe < count; lobe++) {
        const angle = (seed + lobe / count) * Math.PI * 2, scale = lobe === 0 ? 1 : 0.8
        object.position.set(center[0] + Math.cos(angle) * radius * 0.32, center[1] + Math.sin(angle * 1.3) * vertical * 0.16, center[2] + Math.sin(angle) * radius * 0.32)
        object.scale.set(radius * scale, vertical * scale, 1); object.updateMatrix()
        const slot = index * count + lobe
        mesh.current!.setMatrixAt(slot, object.matrix)
        detail.setXY(slot, (seed + lobe * 0.37) % 1, visibility)
      }
    })
    mesh.current.count = clouds.length * count
    mesh.current.instanceMatrix.needsUpdate = true
    detail.needsUpdate = true
    invalidate()
  }, [clouds, reduced, invalidate, geometry])
  return <instancedMesh ref={mesh} args={[geometry, material, 1024]} frustumCulled={false} dispose={null} />
}

function AshGrains({ parcels, reduced, diameters }: { parcels: Parameters<typeof ashMarkers>[0]; reduced: boolean; diameters: readonly number[] }) {
  const mesh = useRef<THREE.InstancedMesh>(null), { invalidate } = useThree()
  const markers = useMemo(() => ashMarkers(parcels, reduced, diameters), [parcels, reduced, diameters])
  useEffect(() => {
    if (!mesh.current) return
    const object = new THREE.Object3D()
    markers.forEach(({ position, size, grain }, index) => {
      object.position.fromArray(position); object.scale.setScalar(size); object.updateMatrix()
      mesh.current!.setMatrixAt(index, object.matrix)
      mesh.current!.setColorAt(index, new THREE.Color(grain < 2 ? '#403d37' : '#737a7e'))
    })
    mesh.current.count = markers.length; mesh.current.instanceMatrix.needsUpdate = true
    if (mesh.current.instanceColor) mesh.current.instanceColor.needsUpdate = true
    invalidate()
  }, [markers, invalidate])
  return <instancedMesh ref={mesh} args={[undefined, undefined, 240]} frustumCulled={false}><icosahedronGeometry args={[1, 0]} /><meshBasicMaterial /></instancedMesh>
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

function LavaChannel({ sequence, elapsedS, phase, terrain, reduced, emphasizeTaal }: { sequence: EruptionSequence; elapsedS: number; phase: string; terrain: TerrainAsset | null; reduced: boolean; emphasizeTaal: boolean }) {
  const visible = useMemo(() => lavaVisiblePath(sequence.lava.path, elapsedS), [sequence.lava.path, elapsedS])
  const geometry = useMemo(() => {
    if (!sequence.lava.enabled || visible.length < 2 || phase === 'before') return null
    return lavaRibbon(visible, terrain, reduced, emphasizeTaal, phase === 'erupting', phase === 'settling')
  }, [sequence.lava.enabled, visible, phase, terrain, reduced, emphasizeTaal])
  useEffect(() => () => geometry?.dispose(), [geometry])
  if (!geometry) return null
  const hot = phase === 'erupting', cooling = phase === 'settling'
  return <mesh geometry={geometry}><meshStandardMaterial vertexColors emissive={hot ? '#be3b0d' : cooling ? '#351108' : '#000000'} emissiveIntensity={hot ? 0.5 : 0.15} roughness={0.9} side={THREE.DoubleSide} /></mesh>
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

export default function EruptionEffects({ sequence, frameIndex, baseM, reduced, playing, onPerformance, terrain, emphasizeTaal, wind }: { sequence: EruptionSequence; frameIndex: number; baseM: number; reduced: boolean; playing: boolean; onPerformance: (fps: number, pacing: number) => void; terrain: TerrainAsset | null; emphasizeTaal: boolean; wind: readonly [number, number] }) {
  const frame = useMemo(() => eruptionDisplayFrame(sequence, frameIndex), [sequence, frameIndex])
  const ash = useMemo(() => {
    if (sequence.scenario.mass_rate_kg_s === 0) return []
    const maximum = reduced ? 96 : 256
    const stride = Math.max(1, Math.ceil(frame.parcels.length / maximum))
    return frame.parcels.filter((_parcel, index) => index % stride === 0).map(parcel => {
      const radius = parcel.radius_m / 1000
      return { center: [parcel.east_m / 1000, parcel.height_m / 1000, -parcel.north_m / 1000], radius, vertical: Math.min(radius * 0.65, Math.max(0.025, parcel.height_m / 1800)), seed: visualSeed(parcel.parcel_id), visibility: parcel.visibility }
    })
  }, [frame.parcels, sequence.scenario.mass_rate_kg_s, reduced])
  const steam = useMemo(() => {
    if (frame.phase !== 'erupting' || frame.columnTopM <= 0 || sequence.scenario.mass_rate_kg_s === 0) return []
    const layers = reduced ? 14 : 28
    return Array.from({ length: layers }, (_, i) => {
      const fraction = (i + 0.5) / layers, height = frame.columnTopM / 1000
      const radius = 0.04 + Math.min(0.8, height * 0.15) * fraction ** 1.3
      // A bounded wind cue for the schematic ascent; numerical release remains instantaneous.
      const bend = fraction ** 3 * height / Math.max(1, sequence.options.plume_rise_speed_m_s) * 0.35
      const wobble = Math.sin(fraction * 17 + frameIndex * 0.8) * radius * 0.12
      return { center: [wind[0] * bend + wobble, height * fraction, -wind[1] * bend], radius, vertical: Math.max(radius * 1.15, height / layers), seed: (i * 0.618) % 1, visibility: 1 }
    })
  }, [frame.phase, frame.columnTopM, sequence.scenario.mass_rate_kg_s, sequence.options.plume_rise_speed_m_s, reduced, wind, frameIndex])
  return <>
    <RenderMonitor playing={playing} onPerformance={onPerformance} />
    <group position={[0, baseM / 1000, 0]}>
      <Billows clouds={ash} reduced={reduced} />
      <Billows clouds={steam} steam reduced={reduced} />
      <AshGrains parcels={frame.parcels} reduced={reduced} diameters={sequence.scenario.grains.map(grain => grain.diameter_um)} />
      {frame.phase === 'erupting' && sequence.scenario.mass_rate_kg_s > 0 && <group scale={4}><FountainPaths paths={sequence.fountain_paths_m} /><FountainFragments positions={frame.fountain} /></group>}
    </group>
    <LavaChannel sequence={sequence} elapsedS={frame.elapsedS} phase={frame.phase} terrain={terrain} reduced={reduced} emphasizeTaal={emphasizeTaal} />
  </>
}
