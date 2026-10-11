import type { Trajectory } from '../api/simulator'

export const REPLAY_DISPLAY_SECONDS = 20

/** All classes share one physical clock; the backend supplies each falling time. */
export function replayDuration(paths: Pick<Trajectory, 'settling_time_s'>[]): number {
  return Math.max(0, ...paths.map(path => path.settling_time_s))
}

/** Interpolation of backend samples is presentation, not a second transport solver. */
export function pathPosition(path: Pick<Trajectory, 'settling_time_s' | 'points_m'>, physicalElapsedS: number): number[] {
  const fraction = path.settling_time_s > 0 ? Math.max(0, Math.min(physicalElapsedS / path.settling_time_s, 1)) : 1
  const raw = fraction * (path.points_m.length - 1)
  const lower = Math.floor(raw), upper = Math.min(path.points_m.length - 1, lower + 1)
  const blend = raw - lower
  return path.points_m[lower].map((coordinate, axis) => coordinate + (path.points_m[upper][axis] - coordinate) * blend)
}
