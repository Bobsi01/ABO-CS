import { describe, expect, it } from 'vitest'
import { isTerrainAsset, matchesTerrainOrigin, surfaceHeightM } from './terrain'
import type { TerrainAsset } from './terrain'
const fixture: TerrainAsset = { volcano_id: 'taal', origin: { lat: 14, lon: 121 }, east_m: [-1000, 0, 1000], north_m: [-1000, 0, 1000], elevation_m: [[10, -20, 0], [20, 300, 30], [0, 0, 0]], land_mask: [[1, 2, 0], [1, 1, 1], [0, 0, 0]], water_level_m: [[0, 3, 0], [0, 0, 0], [0, 0, 0]], vent_ground_m: 311, source: { title: 'Synthetic shape fixture', url: 'https://example.com/fixture', resolution_m: 1000, datum: 'EGM96', review_status: 'synthetic test' } }
describe('static display terrain boundary', () => {
  it('checks axis order, matrix shape and finite data before geometry allocation', () => {
    expect(isTerrainAsset(fixture)).toBe(true)
    expect(isTerrainAsset({ ...fixture, elevation_m: [[10]] })).toBe(false)
    expect(isTerrainAsset({ ...fixture, east_m: [1000, 0, -1000] })).toBe(false)
    expect(isTerrainAsset({ ...fixture, east_m: [-1000, 0, 1100] })).toBe(false)
  })
  it('does not register a fixed volcano asset to an edited vent', () => {
    expect(matchesTerrainOrigin(fixture, 'taal', 14, 121)).toBe(true)
    expect(matchesTerrainOrigin(fixture, 'taal', 14.01, 121)).toBe(false)
  })
  it('places geographic markers at land/lake/sea heights and leaves uncovered locations unknown', () => {
    expect(surfaceHeightM(fixture, 0, 0)).toBe(300)
    expect(surfaceHeightM(fixture, 0, -1000)).toBe(3)
    expect(surfaceHeightM(fixture, 1000, -1000)).toBe(0)
    expect(surfaceHeightM(fixture, 1001, 0)).toBeNull()
  })
  it('enlarges Taal land relief without moving water, mutating the source or changing normal-scale queries', () => {
    const original = JSON.stringify(fixture)
    expect(surfaceHeightM(fixture, 0, 0, true)).toBe(1785)
    expect(surfaceHeightM(fixture, 0, -1000, true)).toBe(3)
    expect(surfaceHeightM(fixture, 1000, -1000, true)).toBe(0)
    expect(surfaceHeightM(fixture, 0, 0)).toBe(300)
    expect(JSON.stringify(fixture)).toBe(original)
  })
  it('preserves distant terrain and other volcanoes even when emphasis is requested', () => {
    expect(surfaceHeightM({ ...fixture, east_m: [9000, 10000, 11000] }, 10000, 0, true)).toBe(300)
    expect(surfaceHeightM({ ...fixture, volcano_id: 'mayon' }, 0, 0, true)).toBe(300)
  })
})
