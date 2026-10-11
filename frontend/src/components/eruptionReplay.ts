import type { EruptionSequence } from '../api/simulator'

export type EruptionFrame = EruptionSequence['frames'][number]
export type PlumeParcel = EruptionFrame['plume_parcels'][number]
export type LavaPoint = EruptionSequence['lava']['path'][number]
export type DisplayParcel = PlumeParcel & { visibility: number }

export function eruptionFramePair(sequence: EruptionSequence, frameIndex: number) {
  const index = Math.max(0, Math.min(sequence.frames.length - 1, Number.isFinite(frameIndex) ? frameIndex : 0))
  const lower = Math.floor(index), upper = Math.min(sequence.frames.length - 1, lower + 1)
  return { current: sequence.frames[lower], next: sequence.frames[upper], blend: index - lower }
}

/** Matching quantile-cloud centers provides smooth display interpolation, not particle histories. */
export function eruptionDisplayFrame(sequence: EruptionSequence, frameIndex: number) {
  const { current, next, blend } = eruptionFramePair(sequence, frameIndex)
  const mix = (a: number, b: number) => a + (b - a) * blend
  const elapsedS = mix(current.elapsed_s, next.elapsed_s)
  if (current.phase === 'before') return { phase: current.phase, elapsedS, columnTopM: 0, parcels: [] as DisplayParcel[], fountain: [] as number[][] }
  const future = new Map(next.plume_parcels.map(parcel => [parcel.parcel_id, parcel]))
  const parcels: DisplayParcel[] = current.plume_parcels.filter(parcel => parcel.mass_kg > 0).map(parcel => {
    const target = future.get(parcel.parcel_id)
    future.delete(parcel.parcel_id)
    return target ? { ...parcel, east_m: mix(parcel.east_m, target.east_m), north_m: mix(parcel.north_m, target.north_m), height_m: mix(parcel.height_m, target.height_m), radius_m: mix(parcel.radius_m, target.radius_m), visibility: 1 } : { ...parcel, visibility: 1 - blend }
  })
  if (blend > 0) for (const parcel of future.values()) if (parcel.mass_kg > 0) parcels.push({ ...parcel, visibility: blend })
  const fountain = current.phase === 'erupting' ? current.fountain_particles_m.map((point, index) => point.map((n, axis) => mix(n, next.fountain_particles_m[index]?.[axis] ?? n))) : []
  return { phase: current.phase, elapsedS, columnTopM: mix(current.column_top_m, next.column_top_m), parcels, fountain }
}

/** Clip the Python route at its supplied arrival times, interpolating only the moving front. */
export function lavaVisiblePath(path: LavaPoint[], elapsedS: number): LavaPoint[] {
  if (!path.length || elapsedS < path[0].arrival_s) return []
  const upper = path.findIndex(point => point.arrival_s > elapsedS)
  if (upper < 0) return path
  const visible = path.slice(0, upper), lower = path[upper - 1], next = path[upper]
  if (!lower || elapsedS === lower.arrival_s) return visible
  const blend = (elapsedS - lower.arrival_s) / (next.arrival_s - lower.arrival_s)
  const mix = (a: number, b: number) => a + (b - a) * blend
  return [...visible, { ...lower, east_m: mix(lower.east_m, next.east_m), north_m: mix(lower.north_m, next.north_m), elevation_m: mix(lower.elevation_m, next.elevation_m), arrival_s: elapsedS, width_m: mix(lower.width_m, next.width_m), thickness_m: mix(lower.thickness_m, next.thickness_m) }]
}
