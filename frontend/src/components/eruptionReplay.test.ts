import { describe, expect, it } from 'vitest'
import type { EruptionSequence } from '../api/simulator'
import {
  eruptionDisplayFrame,
  eruptionFramePair,
  lavaVisiblePath,
  scenarioClock,
} from './eruptionReplay'
import type { EruptionFrame, LavaPoint, PlumeParcel } from './eruptionReplay'

const parcel = (id: string, east: number): PlumeParcel => ({
  parcel_id: id,
  grain_index: 0,
  east_m: east,
  north_m: 20,
  height_m: 1000,
  radius_m: 200,
  mass_kg: 10,
})
const frame = (
  phase: EruptionFrame['phase'],
  elapsed_s: number,
  plume_parcels: PlumeParcel[],
): EruptionFrame =>
  ({
    phase,
    elapsed_s,
    plume_parcels,
    fountain_particles_m: [],
    column_top_m: 2000,
  }) as unknown as EruptionFrame
const sequence = (frames: EruptionFrame[]): EruptionSequence => ({ frames }) as EruptionSequence
const route = [
  { east_m: 0, north_m: 0, elevation_m: 2000, arrival_s: 10, width_m: 20, thickness_m: 1 },
  { east_m: 1000, north_m: 500, elevation_m: 1500, arrival_s: 20, width_m: 30, thickness_m: 2 },
] as LavaPoint[]

describe('backend eruption timeline interpolation', () => {

  it('shows elapsed scenario hours beyond a day without wrapping or losing the emission duration', () => {

    expect(scenarioClock(3600)).toBe('1 h')
    expect(scenarioClock(100475)).toBe('27.9 h')
    expect(scenarioClock(1883.4)).toBe('0.5 h')
    expect(scenarioClock(30)).toBe('<0.1 h')

  })
  it('keeps the before state clear even when its next frame contains ash', () => {

    const result = eruptionDisplayFrame(
      sequence([frame('before', 0, []), frame('erupting', 20, [parcel('a', 100)])]),
      0.8,
    )

    expect(result.parcels).toEqual([])
    expect(result.fountain).toEqual([])
    expect(result.columnTopM).toBe(0)

  })
  it('matches parcels by stable identifier despite reordered cohorts', () => {

    const result = eruptionDisplayFrame(
      sequence([
        frame('erupting', 10, [parcel('a', 0), parcel('b', 1000)]),
        frame('erupting', 30, [parcel('b', 1200), parcel('a', 400)]),
      ]),
      0.5,
    )

    expect(result.parcels.map((p) => [p.parcel_id, p.east_m])).toEqual([
      ['a', 200],
      ['b', 1100],
    ])
    expect(result.elapsedS).toBe(20)

  })
  it('fades entering and departing cohorts without moving one onto another', () => {

    const result = eruptionDisplayFrame(
      sequence([
        frame('settling', 10, [parcel('old', 100)]),
        frame('settling', 30, [parcel('new', 500)]),
      ]),
      0.25,
    )

    expect(result.parcels.map((p) => [p.parcel_id, p.east_m, p.visibility])).toEqual([
      ['old', 100, 0.75],
      ['new', 500, 0.25],
    ])

  })
  it('clamps timeline bounds and omits zero-mass cloud parcels', () => {

    const value = sequence([frame('after', 40, [{ ...parcel('zero', 0), mass_kg: 0 }])])

    expect(eruptionFramePair(value, 200).current.elapsed_s).toBe(40)
    expect(eruptionFramePair(value, -5).blend).toBe(0)
    expect(eruptionDisplayFrame(value, Number.NaN).parcels).toEqual([])

  })
  it('places the lava front using backend arrival times and absolute terrain heights', () => {

    expect(lavaVisiblePath(route, 9)).toEqual([])
    expect(lavaVisiblePath(route, 10)).toEqual([route[0]])
    const front = lavaVisiblePath(route, 15).at(-1)!

    expect([front.east_m, front.north_m, front.elevation_m]).toEqual([500, 250, 1750])
    expect(lavaVisiblePath(route, 100)).toEqual(route)

  })

})
