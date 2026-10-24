export type TerrainAsset = {
  volcano_id: string
  origin: { lat: number; lon: number }
  east_m: number[]
  north_m: number[]
  elevation_m: number[][]
  land_mask: number[][]
  water_level_m: number[][]
  vent_ground_m: number
  source: {
    title: string
    url: string
    resolution_m: number
    datum: string
    review_status: string
    attribution?: string
  }
}

function record(value: unknown): value is Record<string, unknown> {

  return typeof value === 'object' && value !== null

}

function finite(value: unknown): value is number {

  return typeof value === 'number' && Number.isFinite(value)

}

function axis(value: unknown): value is number[] {

  return (
    Array.isArray(value) &&
    value.length >= 2 &&
    value.length <= 1025 &&
    value.every(
      (n, i) =>
        finite(n) &&
        (i === 0 || n > value[i - 1]) &&
        (i < 2 || Math.abs(n - value[i - 1] - (value[1] - value[0])) < 0.0001),
    )
  )

}

export function isTerrainAsset(value: unknown): value is TerrainAsset {

  if (
    !record(value) ||
    !record(value.origin) ||
    !finite(value.origin.lat) ||
    !finite(value.origin.lon) ||
    !axis(value.east_m) ||
    !axis(value.north_m) ||
    !finite(value.vent_ground_m) ||
    !record(value.source) ||
    typeof value.source.title !== 'string' ||
    typeof value.source.url !== 'string' ||
    typeof value.source.datum !== 'string' ||
    typeof value.source.review_status !== 'string' ||
    (value.source.attribution !== undefined && typeof value.source.attribution !== 'string') ||
    !finite(value.source.resolution_m)
  )
    return false
  const height = value.north_m.length,
    width = value.east_m.length
  const matrix = (data: unknown) =>
    Array.isArray(data) &&
    data.length === height &&
    data.every((row) => Array.isArray(row) && row.length === width && row.every(finite))

  return (
    typeof value.volcano_id === 'string' &&
    matrix(value.elevation_m) &&
    matrix(value.land_mask) &&
    matrix(value.water_level_m) &&
    (value.land_mask as number[][]).every((row) => row.every((n) => n === 0 || n === 1 || n === 2))
  )

}

export function matchesTerrainOrigin(
  asset: TerrainAsset,
  volcanoId: string,
  lat: number,
  lon: number,
): boolean {

  return (
    asset.volcano_id === volcanoId &&
    Math.abs(asset.origin.lat - lat) < 0.00001 &&
    Math.abs(asset.origin.lon - lon) < 0.00001
  )

}

/** Close-up display relief only; preserve water and taper before the surrounding caldera. */
export function terrainVertexHeightM(
  asset: TerrainAsset,
  x: number,
  y: number,
  emphasizeTaal = false,
): number {

  if (asset.land_mask[y][x] !== 1) return asset.water_level_m[y][x]
  const elevation = asset.elevation_m[y][x]

  if (!emphasizeTaal || asset.volcano_id !== 'taal' || elevation <= 3) return elevation
  const distance = Math.hypot(asset.east_m[x], asset.north_m[y])
  const taper = Math.max(0, Math.min(1, (distance - 3000) / 2000))
  const weight = 1 - taper * taper * (3 - 2 * taper)

  return 3 + (elevation - 3) * (1 + 5 * weight)

}

export function surfaceHeightM(
  asset: TerrainAsset,
  eastM: number,
  northM: number,
  emphasizeTaal = false,
): number | null {

  const { east_m: east, north_m: north } = asset

  if (eastM < east[0] || eastM > east.at(-1)! || northM < north[0] || northM > north.at(-1)!)
    return null
  const x = Math.min(east.length - 1, Math.round((eastM - east[0]) / (east[1] - east[0])))
  const y = Math.min(north.length - 1, Math.round((northM - north[0]) / (north[1] - north[0])))

  return terrainVertexHeightM(asset, x, y, emphasizeTaal)

}

export function maximumTerrainHeightM(asset: TerrainAsset, emphasizeTaal = false): number {

  return Math.max(
    ...asset.elevation_m.map((row, y) =>
      Math.max(...row.map((_elevation, x) => terrainVertexHeightM(asset, x, y, emphasizeTaal))),
    ),
  )

}
