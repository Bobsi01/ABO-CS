import * as THREE from 'three'
import type { DisplayParcel, LavaPoint } from './eruptionReplay'
import type { TerrainAsset } from './terrain'
import { terrainVertexHeightM } from './terrain'

/** Deterministic display detail, never a physical turbulence or concentration field. */
export function visualSeed(id: string): number {

  let hash = 2166136261

  for (const character of id) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619)

  return (hash >>> 0) / 4294967296

}

export function cloudTexture(): THREE.DataTexture {

  const size = 128,
    data = new Uint8Array(size * size * 4)
  const hash = (x: number, y: number) => visualSeed(`${x}:${y}`)
  const smooth = (x: number) => x * x * (3 - 2 * x)
  const noise = (x: number, y: number) => {

    const ix = Math.floor(x),
      iy = Math.floor(y),
      fx = smooth(x - ix),
      fy = smooth(y - iy)
    const a = hash(ix, iy) * (1 - fx) + hash(ix + 1, iy) * fx
    const b = hash(ix, iy + 1) * (1 - fx) + hash(ix + 1, iy + 1) * fx

    return a * (1 - fy) + b * fy

  }

  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const u = (x / (size - 1)) * 2 - 1,
        v = (y / (size - 1)) * 2 - 1
      const texture =
        noise(x / 21, y / 21) * 0.55 + noise(x / 9, y / 9) * 0.3 + noise(x / 4, y / 4) * 0.15
      const edge = Math.max(0, 1 - Math.hypot(u, v) / (0.8 + texture * 0.24))
      const i = (y * size + x) * 4

      data[i] = data[i + 1] = data[i + 2] = Math.round(145 + texture * 100)
      data[i + 3] = Math.round(Math.min(1, edge * 2.8) * (0.5 + texture * 0.5) * 255)
    }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat)

  texture.minFilter = texture.magFilter = THREE.LinearFilter
  texture.needsUpdate = true

  return texture

}

/** Sparse markers stay around Python cohort centers; they are not individual histories. */
export function ashMarkers(
  parcels: DisplayParcel[],
  reduced: boolean,
  diameters: readonly number[],
) {

  const maximum = Math.max(1, ...diameters)
  const stride = Math.max(1, Math.ceil(parcels.length / (reduced ? 96 : 240)))

  return parcels
    .filter((_parcel, i) => i % stride === 0)
    .map((parcel) => {

      const seed = visualSeed(parcel.parcel_id),
        angle = seed * Math.PI * 2
      const offset = parcel.radius_m * 0.42

      return {
        position: [
          (parcel.east_m + Math.cos(angle) * offset) / 1000,
          Math.max(0.01, parcel.height_m / 1000),
          -(parcel.north_m + Math.sin(angle) * offset) / 1000,
        ],
        size:
          (0.008 + Math.sqrt((diameters[parcel.grain_index] ?? 0) / maximum) * 0.016) *
          Math.sqrt(parcel.visibility),
        grain: parcel.grain_index,
      }

    })

}

/** Match the displayed DEM's triangle split, including reduced-detail stride. */
export function renderedTerrainHeight(
  asset: TerrainAsset,
  east: number,
  north: number,
  reduced: boolean,
  emphasize: boolean,
): number | null {

  const stride = reduced ? 2 : 1
  const xs = asset.east_m,
    ys = asset.north_m
  const maxX = Math.floor((xs.length - 1) / stride) * stride
  const maxY = Math.floor((ys.length - 1) / stride) * stride

  if (east < xs[0] || north < ys[0] || east > xs[maxX] || north > ys[maxY]) return null
  const dx = (xs[1] - xs[0]) * stride,
    dy = (ys[1] - ys[0]) * stride
  const x = Math.min(maxX - stride, Math.floor((east - xs[0]) / dx) * stride)
  const y = Math.min(maxY - stride, Math.floor((north - ys[0]) / dy) * stride)
  const fx = (east - xs[x]) / dx,
    fy = (north - ys[y]) / dy
  const a = terrainVertexHeightM(asset, x, y, emphasize),
    b = terrainVertexHeightM(asset, x + stride, y, emphasize)
  const c = terrainVertexHeightM(asset, x, y + stride, emphasize),
    d = terrainVertexHeightM(asset, x + stride, y + stride, emphasize)

  return fx + fy <= 1
    ? a + fx * (b - a) + fy * (c - a)
    : d + (1 - fx) * (c - d) + (1 - fy) * (b - d)

}

/** Display ribbon follows the supplied route/front. Width enlargement has no map effect. */
export function lavaRibbon(
  path: LavaPoint[],
  terrain: TerrainAsset | null,
  reduced: boolean,
  emphasize: boolean,
  hot: boolean,
  cooling: boolean,
) {

  const points: LavaPoint[] = []

  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1],
      b = path[i]
    const steps = Math.max(
      1,
      Math.ceil(Math.hypot(b.east_m - a.east_m, b.north_m - a.north_m) / (reduced ? 100 : 40)),
    )

    for (let j = 0; j < steps; j++) {
      const t = j / steps,
        mix = (x: number, y: number) => x + (y - x) * t

      points.push({
        ...a,
        east_m: mix(a.east_m, b.east_m),
        north_m: mix(a.north_m, b.north_m),
        elevation_m: mix(a.elevation_m, b.elevation_m),
        thickness_m: mix(a.thickness_m, b.thickness_m),
        width_m: mix(a.width_m, b.width_m),
      })
    }
  }
  if (path.length) points.push(path.at(-1)!)
  const bands = [-1, -0.6, 0, 0.6, 1],
    positions: number[] = [],
    colors: number[] = [],
    uv: number[] = [],
    indices: number[] = []
  const crust = new THREE.Color('#342d2b'),
    core = new THREE.Color(hot ? '#ef9b38' : cooling ? '#974320' : '#50403a')
  let distance = 0

  points.forEach((point, i) => {

    const previous = points[Math.max(0, i - 1)],
      next = points[Math.min(points.length - 1, i + 1)]
    const dx = next.east_m - previous.east_m,
      dy = next.north_m - previous.north_m,
      length = Math.hypot(dx, dy) || 1

    if (i) distance += Math.hypot(point.east_m - previous.east_m, point.north_m - previous.north_m)
    const half = Math.max(65, point.width_m / 2)

    bands.forEach((band, j) => {

      const east = point.east_m - (dy / length) * half * band,
        north = point.north_m + (dx / length) * half * band
      const ground = terrain
        ? renderedTerrainHeight(terrain, east, north, reduced, emphasize)
        : null

      positions.push(
        east / 1000,
        ((ground ?? point.elevation_m) + 4 + point.thickness_m * (1 - Math.abs(band))) / 1000,
        -north / 1000,
      )
      const color = crust
        .clone()
        .lerp(core, (1 - Math.abs(band)) * (0.83 + 0.17 * Math.sin(distance / 95)))

      colors.push(color.r, color.g, color.b)
      uv.push((band + 1) / 2, distance / 200)
      if (i && j < bands.length - 1) {
        const a = (i - 1) * bands.length + j,
          b = i * bands.length + j

        indices.push(a, b, a + 1, a + 1, b, b + 1)
      }

    })

  })
  const geometry = new THREE.BufferGeometry()

  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()

  return geometry

}
