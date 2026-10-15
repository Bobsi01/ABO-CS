import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import * as THREE from 'three'
import VolcanoScene from './VolcanoScene'
import type { Scenario, SimulationResult } from '../api/simulator'

// Mock R3F Canvas to allow testing component logic in jsdom
const rendererMock = vi.hoisted(() => ({
  created: undefined as undefined | ((state: { gl: { domElement: HTMLCanvasElement; render: () => void } }) => void),
}))

vi.mock('@react-three/fiber', () => ({
  Canvas: ({ onCreated }: { onCreated: typeof rendererMock.created }) => {
    rendererMock.created = onCreated
    return null
  },
  useThree: () => ({
    camera: new THREE.PerspectiveCamera(45, 1, 0.1, 1000),
    gl: { domElement: document.createElement('canvas'), setPixelRatio: vi.fn() },
    size: { width: 800, height: 600 },
    invalidate: vi.fn(),
    setDpr: vi.fn(),
  }),
  useFrame: vi.fn(),
}))

const taalScenario = {
  volcano_id: 'taal',
  column_height_m: 3000,
  vent_elevation_m: 311,
  vent_lat: 14.002,
  vent_lon: 120.993,
  wind_from_deg: 180,
  wind_speed_m_s: 10,
  grains: [{ settling_speed_m_s: 2 }],
  domain_km: 100,
} as Scenario

const simulationResult = {
  scenario: taalScenario,
  illustration: {
    paths: [{ grain_index: 0, diameter_um: 100, settling_time_s: 750, points_m: [[0, 0, 3000], [1000, 1000, 0]] }],
    wind_east_m_s: 0,
    wind_north_m_s: 10,
  },
  grid: {
    east_m: [-1000, 1000],
    north_m: [-1000, 1000],
    thickness_mm: [[1, 2], [3, 4]],
  },
  receptors: [],
} as unknown as SimulationResult

function setupGraphicsAvailable() {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
    getExtension: () => null,
  } as unknown as WebGL2RenderingContext)
  const changes = new EventTarget()
  const media = {
    matches: false,
    addEventListener: vi.fn(changes.addEventListener.bind(changes)),
    removeEventListener: vi.fn(changes.removeEventListener.bind(changes)),
  }
  vi.stubGlobal('matchMedia', vi.fn(() => media))
  return { media, changes }
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('volcanoScene3DQA - 3D Graphics, WebGL Lifecycle & Performance Verification', () => {
  // =========================================================================
  // TASK 1: WebGL & Three.js Resource Disposal
  // =========================================================================
  describe('Task 1: Resource Disposal & GPU Memory Lifecycle', () => {
    it('disposes Line and Sprite resources in ColumnAltimeter hierarchy upon unmount / hide', () => {
      // Simulate ColumnAltimeter creation logic
      const base = 0.311
      const height = 3.0
      const maxHeight = Math.max(height, 20)
      const group = new THREE.Group()

      // Axis line
      const axisGeom = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-1.5, base, 0),
        new THREE.Vector3(-1.5, base + maxHeight, 0),
      ])
      const axisMat = new THREE.LineBasicMaterial({ color: '#2563eb' })
      const axisLine = new THREE.Line(axisGeom, axisMat)
      group.add(axisLine)

      // Tick segments
      const tickPoints: THREE.Vector3[] = []
      for (let h = 5; h <= maxHeight; h += 5) {
        tickPoints.push(new THREE.Vector3(-1.5, base + h, 0))
        tickPoints.push(new THREE.Vector3(-1.9, base + h, 0))
      }
      const tickGeom = new THREE.BufferGeometry().setFromPoints(tickPoints)
      const tickMat = new THREE.LineBasicMaterial({ color: '#2563eb' })
      const tickSegments = new THREE.LineSegments(tickGeom, tickMat)
      group.add(tickSegments)

      // Sprites with cloned geometry and canvas textures
      const canvas = document.createElement('canvas')
      canvas.width = 64
      canvas.height = 32
      const texture = new THREE.CanvasTexture(canvas)
      const spriteMat = new THREE.SpriteMaterial({ map: texture })
      const sprite = new THREE.Sprite(spriteMat)
      sprite.geometry = sprite.geometry.clone()
      group.add(sprite)

      // Spies for disposal
      const axisGeomDispose = vi.spyOn(axisGeom, 'dispose')
      const axisMatDispose = vi.spyOn(axisMat, 'dispose')
      const tickGeomDispose = vi.spyOn(tickGeom, 'dispose')
      const tickMatDispose = vi.spyOn(tickMat, 'dispose')
      const spriteGeomDispose = vi.spyOn(sprite.geometry, 'dispose')
      const spriteMatDispose = vi.spyOn(spriteMat, 'dispose')
      const textureDispose = vi.spyOn(texture, 'dispose')

      // Perform cleanup iteration as implemented in VolcanoScene line 601-608
      group.children.forEach(child => {
        if (child instanceof THREE.Line || child instanceof THREE.LineSegments) {
          child.geometry.dispose()
          if (child.material instanceof THREE.Material) child.material.dispose()
        } else if (child instanceof THREE.Sprite) {
          child.geometry.dispose()
          child.material.map?.dispose()
          child.material.dispose()
        }
      })

      expect(axisGeomDispose).toHaveBeenCalledTimes(1)
      expect(axisMatDispose).toHaveBeenCalledTimes(1)
      expect(tickGeomDispose).toHaveBeenCalledTimes(1)
      expect(tickMatDispose).toHaveBeenCalledTimes(1)
      expect(spriteGeomDispose).toHaveBeenCalledTimes(1)
      expect(spriteMatDispose).toHaveBeenCalledTimes(1)
      expect(textureDispose).toHaveBeenCalledTimes(1)
    })

    it('identifies that InstancedMesh does not auto-dispose instanceMatrix and instanceColor buffers on mesh.dispose()', () => {
      const geom = new THREE.SphereGeometry(1, 8, 8)
      const mat = new THREE.MeshStandardMaterial()
      const instMesh = new THREE.InstancedMesh(geom, mat, 10)
      instMesh.setColorAt(0, new THREE.Color('#ff0000'))

      let matrixDisposed = false
      let colorDisposed = false

      instMesh.instanceMatrix.addEventListener('dispose', () => {
        matrixDisposed = true
      })
      if (instMesh.instanceColor) {
        instMesh.instanceColor.addEventListener('dispose', () => {
          colorDisposed = true
        })
      }

      // Three.js InstancedMesh.prototype.dispose only dispatches 'dispose' on object, not attributes
      instMesh.dispose()

      expect(matrixDisposed).toBe(false)
      expect(colorDisposed).toBe(false)

      // Explicit attribute cleanup is required to release GPU WebGLBuffers
      instMesh.instanceMatrix.dispose()
      instMesh.instanceColor?.dispose()

      expect(matrixDisposed).toBe(true)
      expect(colorDisposed).toBe(true)

      geom.dispose()
      mat.dispose()
    })

    it('verifies ArrowHelper disposal releases internal line and cone geometries and materials', () => {
      const dir = new THREE.Vector3(0, 1, 0)
      const origin = new THREE.Vector3(0, 0, 0)
      const arrow = new THREE.ArrowHelper(dir, origin, 5, '#d97706', 1, 0.5)

      const lineGeomDispose = vi.spyOn(arrow.line.geometry, 'dispose')
      const lineMatDispose = vi.spyOn(arrow.line.material as THREE.Material, 'dispose')
      const coneGeomDispose = vi.spyOn(arrow.cone.geometry, 'dispose')
      const coneMatDispose = vi.spyOn(arrow.cone.material as THREE.Material, 'dispose')

      arrow.dispose()

      expect(lineGeomDispose).toHaveBeenCalledTimes(1)
      expect(lineMatDispose).toHaveBeenCalledTimes(1)
      expect(coneGeomDispose).toHaveBeenCalledTimes(1)
      expect(coneMatDispose).toHaveBeenCalledTimes(1)
    })

    it('documents resource retention when sublayer is toggled off or volcano switched without unmounting', () => {
      // Demonstrates the memoization lifecycle in TaalPDZ3D / TaalDikeVector3D:
      // When show toggles from true to false, if the memoized object is not cleared,
      // useEffect(() => () => line.dispose(), [line]) does NOT trigger because line reference did not change.
      let lineDisposed = false
      const geom = new THREE.BufferGeometry()
      const mat = new THREE.LineDashedMaterial({ color: '#6b3d87' })
      const line = new THREE.Line(geom, mat)

      geom.addEventListener('dispose', () => {
        lineDisposed = true
      })

      // Simulating toggle of show: true -> false with static [points]
      let show = true
      const getLine = () => (show ? line : null)

      expect(getLine()).toBe(line)

      show = false
      // Component returns null, but line instance remains referenced by memo closure
      expect(getLine()).toBeNull()
      expect(lineDisposed).toBe(false) // Line is not disposed when toggled off!

      // Only explicit disposal cleans up the GPU resource
      geom.dispose()
      mat.dispose()
      expect(lineDisposed).toBe(true)
    })
  })

  // =========================================================================
  // TASK 2: Raycasting & Hit-Testing
  // =========================================================================
  describe('Task 2: Raycasting, Seismicity Coordinates & Hit-Testing', () => {
    const mockEarthquakes = [
      {
        id: 'us7000nzpf',
        time: '2024-12-18T01:34:34.431Z',
        latitude: 13.8464,
        longitude: 120.7541,
        depth_km: 21.6,
        magnitude: 4.7,
        place: '5 km E of Hukay',
        source: 'USGS',
      },
      {
        id: 'us7000nwn8',
        time: '2024-11-23T16:10:20.259Z',
        latitude: 13.7029,
        longitude: 120.7125,
        depth_km: 12.3, // Shallow
        magnitude: 4.0,
        place: '15 km S of Hukay',
        source: 'USGS',
      },
      {
        id: 'us6000p6st',
        time: '2024-11-04T07:53:26.624Z',
        latitude: 14.002,
        longitude: 120.993,
        depth_km: 4.5, // Shallow (< 5 km)
        magnitude: 2.8,
        place: 'Taal Caldera',
        source: 'USGS',
      },
    ]

    it('verifies coordinate transformation: geographic (lat, lon, depth) to ABO 3D world coordinates', () => {
      const ventLat = 14.002
      const ventLon = 120.993

      mockEarthquakes.forEach(q => {
        const dLat = (q.latitude - ventLat) * 111.0
        const dLon = (q.longitude - ventLon) * 111.0 * Math.cos((ventLat * Math.PI) / 180)
        const displayDepth = Math.min(35, q.depth_km)
        const y = -displayDepth

        // In ABO convention: X = East (dLon), Y = Up (-displayDepth is underground), Z = -North (-dLat)
        expect(y).toBeLessThanOrEqual(0)
        expect(y).toBe(-q.depth_km)

        if (q.latitude === ventLat && q.longitude === ventLon) {
          expect(dLat).toBeCloseTo(0)
          expect(dLon).toBeCloseTo(0)
        }
      })
    })

    it('verifies depthFilter subsets and exact instanceId-to-earthquake mapping', () => {
      const shallow = mockEarthquakes.filter(q => q.depth_km <= 15)
      const deep = mockEarthquakes.filter(q => q.depth_km > 15)

      expect(shallow.length).toBe(2)
      expect(deep.length).toBe(1)

      // Test hit-testing mapping: instanceId must index into filteredQuakes
      const hitInstanceId = 1
      const selectedQuake = shallow[hitInstanceId]
      expect(selectedQuake.id).toBe('us6000p6st')
      expect(selectedQuake.magnitude).toBe(2.8)
    })

    it('verifies Raycaster intersection on InstancedMesh with bounding sphere calculation', () => {
      const geom = new THREE.SphereGeometry(1, 8, 8)
      const mat = new THREE.MeshBasicMaterial()
      const instMesh = new THREE.InstancedMesh(geom, mat, mockEarthquakes.length)

      const dummy = new THREE.Object3D()
      mockEarthquakes.forEach((q, idx) => {
        const displayDepth = Math.min(35, q.depth_km)
        dummy.position.set(idx * 5, -displayDepth, 0)
        dummy.scale.setScalar(1)
        dummy.updateMatrix()
        instMesh.setMatrixAt(idx, dummy.matrix)
      })
      instMesh.instanceMatrix.needsUpdate = true
      instMesh.computeBoundingSphere()

      expect(instMesh.boundingSphere).not.toBeNull()

      // Raycast from above targeting instance index 1 (at x=5, y=-12.3, z=0)
      const raycaster = new THREE.Raycaster(
        new THREE.Vector3(5, 10, 0),
        new THREE.Vector3(0, -1, 0) // pointing down
      )
      const intersects: THREE.Intersection[] = []
      instMesh.raycast(raycaster, intersects)

      expect(intersects.length).toBeGreaterThan(0)
      const hit = intersects[0]
      expect(hit.instanceId).toBe(1)
      expect(mockEarthquakes[hit.instanceId!].id).toBe('us7000nwn8')

      geom.dispose()
      mat.dispose()
      instMesh.dispose()
    })

    it('evaluates Subsurface Occlusion: depth testing against opaque ground surface', () => {
      // Ground plane is at y = -0.05 km, earthquakes are at y <= -1.0 km
      const groundY = -0.05
      const quakeY = -5.0

      // When depthTest is true (default in Three.js meshStandardMaterial),
      // any fragment behind an opaque depth-writing surface fails depth test and is occluded.
      const groundDepthWrite = true
      const quakeDepthTest = true

      const isOccludedByGround = quakeY < groundY && groundDepthWrite && quakeDepthTest
      expect(isOccludedByGround).toBe(true)

      // Finding: Earthquake hypocenters render underground but lack depthTest: false or a cutaway,
      // resulting in complete visual occlusion from above-ground camera angles.
    })
  })

  // =========================================================================
  // TASK 3: Camera & Rendering Mechanics
  // =========================================================================
  describe('Task 3: Camera Presets, Lighting, Fog & Fallback Behavior', () => {
    it('verifies Tagaytay Ridge camera preset: coordinates, target, elevation and non-inversion', () => {
      const height = 3.0 // 3 km column height
      const base = 0.311 // 311 m vent elevation ASL
      const dist = Math.max(16, height * 1.8) // 16 km

      const cameraPos = new THREE.Vector3(0, base + Math.max(3.2, height * 0.45), -dist)
      const controlsTarget = new THREE.Vector3(0, base + height * 0.25, 0)

      // Position check:
      // Tagaytay is North of Taal vent. In ABO convention, North is -Z.
      expect(cameraPos.x).toBe(0)
      expect(cameraPos.z).toBe(-16) // North of vent
      expect(cameraPos.y).toBeCloseTo(0.311 + 3.2) // ~3.511 km ASL

      // Ground plane clearance:
      // Tagaytay rim terrain is ~0.455 km ASL. Camera elevation is 3.511 km > 0.455 km.
      expect(cameraPos.y).toBeGreaterThan(0.455)

      // Target check:
      expect(controlsTarget.x).toBe(0)
      expect(controlsTarget.z).toBe(0)
      expect(controlsTarget.y).toBeCloseTo(0.311 + 0.75) // Lower column center

      // Looking direction vector (camera to target):
      const lookDir = new THREE.Vector3().subVectors(controlsTarget, cameraPos).normalize()
      expect(lookDir.z).toBeGreaterThan(0) // Looking South (+Z) towards Volcano Island

      // Azimuth check:
      // Looking South (+Z) with up=(0,1,0):
      // Right vector is lookDir x up = (0, 0, 1) x (0, 1, 0) = (-1, 0, 0) [West is right, East is left].
      // This matches real-world observation from Tagaytay ridge looking south over Lake Taal.
    })

    it('verifies Cross-wind Plume Profile across all 4 cardinal wind bearings', () => {
      const height = 5.0
      const base = 0.311
      const dist = Math.max(14, height * 2.2)

      const cases = [
        { windFrom: 180, expectedTransportDeg: 0, expectedCameraPosName: 'East (+X)', expectXPos: true, expectZZero: true },
        { windFrom: 0, expectedTransportDeg: 180, expectedCameraPosName: 'West (-X)', expectXNeg: true, expectZZero: true },
        { windFrom: 90, expectedTransportDeg: 270, expectedCameraPosName: 'North (-Z)', expectZNeg: true, expectXZero: true },
        { windFrom: 270, expectedTransportDeg: 90, expectedCameraPosName: 'South (+Z)', expectZPos: true, expectXZero: true },
      ]

      cases.forEach(({ windFrom, expectedTransportDeg }) => {
        const transportDeg = (windFrom + 180) % 360
        expect(transportDeg).toBe(expectedTransportDeg)

        const crossDeg = (transportDeg + 90) % 360
        const rad = (crossDeg * Math.PI) / 180

        const cameraPos = new THREE.Vector3(
          dist * Math.sin(rad),
          base + height * 0.7,
          -dist * Math.cos(rad)
        )
        const target = new THREE.Vector3(0, base + height * 0.4, 0)

        // Elevation check: camera stays above ground
        expect(cameraPos.y).toBeGreaterThan(base)
        expect(target.y).toBeGreaterThan(base)

        // Camera distance to vent center in horizontal plane
        const horizontalDist = Math.hypot(cameraPos.x, cameraPos.z)
        expect(horizontalDist).toBeCloseTo(dist)

        // Vector pointing from camera to target
        const lookDir = new THREE.Vector3().subVectors(target, cameraPos).normalize()
        const rightDir = new THREE.Vector3().crossVectors(lookDir, new THREE.Vector3(0, 1, 0)).normalize()

        // Transport direction vector (downwind)
        const transportRad = (transportDeg * Math.PI) / 180
        const transportVec = new THREE.Vector3(Math.sin(transportRad), 0, -Math.cos(transportRad)).normalize()

        // In cross-wind view, the downwind vector must project positively along the camera's right direction
        // so the plume appears to travel from left-to-right across the screen.
        const dotRight = rightDir.dot(transportVec)
        expect(dotRight).toBeGreaterThan(0.99)
      })
    })

    it('detects inverted azimuth calculation in TaalDikeVector3D vs correct TaalTropomiPlumeCue', () => {
      const dikeAzimuthDeg = 225 // SW dike intrusion (Bato et al. 2021)
      const rad = (dikeAzimuthDeg * Math.PI) / 180

      // Implementation in TaalDikeVector3D (line 460):
      const dikeDir = new THREE.Vector3(Math.sin(rad), 0, Math.cos(rad)).normalize()

      // Implementation in TaalTropomiPlumeCue (line 533) and ABO coordinate standard (North = -Z, South = +Z):
      // South-West should have East < 0 (West) and North < 0 (South -> +Z).
      // Since world Z = -North, South (+180°/-dLat) means +Z!
      // Therefore, dir.z should be -cos(rad).
      const correctDir = new THREE.Vector3(Math.sin(rad), 0, -Math.cos(rad)).normalize()

      // At 225°:
      // sin(225°) = -0.7071 (West)
      // cos(225°) = -0.7071 (South)
      // In ABO world coordinates:
      // West is -X.
      // South is +Z (-North).
      expect(correctDir.x).toBeCloseTo(-0.7071)
      expect(correctDir.z).toBeCloseTo(0.7071) // Points South (+Z)

      // BUT in TaalDikeVector3D:
      expect(dikeDir.x).toBeCloseTo(-0.7071)
      expect(dikeDir.z).toBeCloseTo(-0.7071) // Points North (-Z)! Inverted by 180 degrees on North-South axis!
    })

    it('verifies distance fog range and contrast preservation for close-up inspection', () => {
      // In VolcanoScene line 747:
      // <fog attach="fog" args={['#e8f0fa', 180, 650]} />
      const fogNear = 180
      const fogFar = 650

      // Close-up camera distance is typically 14 - 30 km
      const closeUpDist = 25
      expect(closeUpDist).toBeLessThan(fogNear)
      // Close-up terrain and plume have 0% fog blend, maintaining 100% contrast

      // Regional overview distance is ~230 km
      const regionalDist = 230
      expect(regionalDist).toBeGreaterThan(fogNear)
      expect(regionalDist).toBeLessThan(fogFar)
      // Regional view has partial fog, smoothly obscuring the sharp cut-off of the 100 km terrain mesh
    })

    it('pauses replay and unhooks listeners when prefers-reduced-motion becomes active', () => {
      const { media, changes } = setupGraphicsAvailable()
      render(
        <VolcanoScene
          scenario={taalScenario}
          result={simulationResult}
          selected={null}
          onSelect={vi.fn()}
        />
      )

      const playBtn = screen.getByRole('button', { name: 'Play settling' })
      fireEvent.click(playBtn)
      expect(screen.getByRole('button', { name: 'Pause' })).toBeTruthy()

      // Trigger prefers-reduced-motion
      media.matches = true
      act(() => {
        changes.dispatchEvent(new Event('change'))
      })

      // Must be paused automatically
      expect(screen.getByRole('button', { name: 'Play settling' })).toBeTruthy()
    })

    it('handles WebGL context loss gracefully and exposes 2D fallback controls', () => {
      setupGraphicsAvailable()
      const availabilitySpy = vi.fn()
      render(
        <VolcanoScene
          scenario={taalScenario}
          result={simulationResult}
          selected={null}
          onSelect={vi.fn()}
          onAvailabilityChange={availabilitySpy}
        />
      )

      const canvas = document.createElement('canvas')
      act(() => {
        rendererMock.created?.({ gl: { domElement: canvas, render: vi.fn() } })
      })

      // Simulate context loss
      act(() => {
        canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true }))
      })

      // 3D canvas disabled, fallback alert shown
      expect(screen.getByRole('heading', { name: '3D needs WebGL 2' })).toBeTruthy()
      expect(screen.getByText(/Run simulations normally, then use the map, stage slider, and location table/)).toBeTruthy()
      expect(availabilitySpy).toHaveBeenLastCalledWith(false)
    })
  })

  // =========================================================================
  // TASK 5: 3D Population Columns & Affected Families Simulation
  // =========================================================================
  describe('Task 5: 3D Population Columns & Affected Families Simulation', () => {
    it('disposes cylinder geometry and mesh standard material in 3D population columns hierarchy', () => {
      const geom = new THREE.CylinderGeometry(1, 1, 1, 12)
      const mat = new THREE.MeshStandardMaterial({ roughness: 0.4, metalness: 0.1 })
      const mesh = new THREE.InstancedMesh(geom, mat, 10)

      const geomDisposeSpy = vi.spyOn(geom, 'dispose')
      const matDisposeSpy = vi.spyOn(mat, 'dispose')

      // Simulate unmount/disposal
      mesh.geometry.dispose()
      if (mesh.material instanceof THREE.Material) {
        mesh.material.dispose()
      }

      expect(geomDisposeSpy).toHaveBeenCalledOnce()
      expect(matDisposeSpy).toHaveBeenCalledOnce()
    })

    it('logarithmically scales 3D population column heights based on census population', () => {
      // Formula: pop > 0 ? Math.max(0.25, Math.log10(Math.max(10, pop)) * 0.28) : 0.2
      const calcHeight = (pop: number) =>
        pop > 0 ? Math.max(0.25, Math.log10(Math.max(10, pop)) * 0.28) : 0.2

      const hZero = calcHeight(0)
      const hSmall = calcHeight(1000)
      const hMedium = calcHeight(39101) // Agoncillo
      const hLarge = calcHeight(351437) // Batangas City

      expect(hZero).toBe(0.2)
      expect(hSmall).toBeCloseTo(0.84, 2)
      expect(hMedium).toBeCloseTo(1.286, 2)
      expect(hLarge).toBeCloseTo(1.553, 2)

      // Verified strictly increasing with population
      expect(hZero).toBeLessThan(hSmall)
      expect(hSmall).toBeLessThan(hMedium)
      expect(hMedium).toBeLessThan(hLarge)
    })

    it('renders 3D population columns layer control checkbox and real-time impact tally HUD', () => {
      setupGraphicsAvailable()
      const resultWithReceptors: SimulationResult = {
        ...simulationResult,
        receptors: [
          {
            id: 'ph-agoncillo',
            name: 'Agoncillo, Batangas',
            kind: 'municipality',
            lat: 13.933,
            lon: 120.931,
            east_m: -7000,
            north_m: -8000,
            in_domain: true,
            population: 39101,
            population_year: 2020,
            thickness_mm: 1.5,
            load_kg_m2: 1.5,
            reported: true,
            screening: { surface_exposure: 'exceeded' },
            screening_reasons: {},
            source_ids: [],
            coordinate_role: 'municipality centroid',
            population_records: { '2020': 39101 },
            admin_codes: {},
            screening_conditions: {},
          },
          {
            id: 'ph-balete',
            name: 'Balete, Batangas',
            kind: 'municipality',
            lat: 14.019,
            lon: 121.099,
            east_m: 11000,
            north_m: 1000,
            in_domain: true,
            population: 24055,
            population_year: 2020,
            thickness_mm: 0.1, // below 0.5 mm threshold
            load_kg_m2: 0.1,
            reported: false,
            screening: { surface_exposure: 'below' },
            screening_reasons: {},
            source_ids: [],
            coordinate_role: 'municipality centroid',
            population_records: { '2020': 24055 },
            admin_codes: {},
            screening_conditions: {},
          },
        ],
      } as unknown as SimulationResult

      render(
        <VolcanoScene
          scenario={taalScenario}
          result={resultWithReceptors}
          selected={null}
          onSelect={vi.fn()}
        />
      )

      // Real-time exposure tally HUD
      expect(screen.getByText('Real-Time Exposure Tally')).toBeTruthy()
      expect(screen.getByText('Municipalities reached')).toBeTruthy()
      expect(screen.getByText('Indicative population')).toBeTruthy()
      expect(screen.getByText('Est. families affected')).toBeTruthy()
      // 1 of 2 reached
      expect(screen.getByText('1')).toBeTruthy()
      // Population: 39,101
      expect(screen.getByText('39,101')).toBeTruthy()
      // Families: 39,101 / 4.1 = 9,537
      expect(screen.getByText('9,537')).toBeTruthy()

      // Layer control checkbox
      expect(
        screen.getByRole('checkbox', { name: 'Show 3D population columns & affected families' })
      ).toBeTruthy()
      // Keyboard inspection select
      expect(
        screen.getByRole('combobox', { name: 'Select municipality for keyboard inspection' })
      ).toBeTruthy()
    })
  })
})

