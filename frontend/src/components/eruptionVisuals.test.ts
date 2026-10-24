import { describe, expect, it } from 'vitest'
import { ashMarkers, cloudTexture, lavaRibbon, renderedTerrainHeight } from './eruptionVisuals'
import { lavaVisiblePath } from './eruptionReplay'
import type { DisplayParcel, LavaPoint } from './eruptionReplay'
import type { TerrainAsset } from './terrain'

const terrain = {
  volcano_id: 'mayon',
  east_m: [0, 100, 200],
  north_m: [0, 100, 200],
  elevation_m: [
    [0, 100, 200],
    [200, 400, 200],
    [200, 100, 0],
  ],
  land_mask: [
    [1, 1, 1],
    [1, 1, 1],
    [1, 1, 1],
  ],
  water_level_m: [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ],
} as TerrainAsset
const parcel = (grain_index: number): DisplayParcel => ({
  parcel_id: `grain-${grain_index}`,
  grain_index,
  east_m: 1000,
  north_m: 2000,
  height_m: 500,
  radius_m: 100,
  mass_kg: 10,
  visibility: 1,
})

describe('illustration remains anchored to computed quantities', () => {

  it('samples the actual displayed triangles rather than rounding to a terrain vertex', () => {

    expect(renderedTerrainHeight(terrain, 25, 25, false, false)).toBe(75)
    expect(renderedTerrainHeight(terrain, 75, 75, false, false)).toBe(275)
    expect(renderedTerrainHeight(terrain, 100, 100, true, false)).toBe(200)
    expect(renderedTerrainHeight(terrain, 201, 0, false, false)).toBeNull()

  })
  it('keeps the reached lava front and surface ribbon separate from its enlarged width', () => {

    const route = [
      { east_m: 50, north_m: 75, elevation_m: 200, arrival_s: 0, width_m: 20, thickness_m: 2 },
      { east_m: 150, north_m: 75, elevation_m: 200, arrival_s: 100, width_m: 20, thickness_m: 2 },
    ] as LavaPoint[]
    const original = JSON.stringify(route),
      visible = lavaVisiblePath(route, 50)
    const geometry = lavaRibbon(visible, terrain, false, false, true, false)
    const positions = geometry.getAttribute('position')

    for (let i = 0; i < positions.count; i++) {
      const east = positions.getX(i) * 1000,
        north = -positions.getZ(i) * 1000

      expect(east).toBeLessThanOrEqual(100.001)
      expect(positions.getY(i) * 1000).toBeGreaterThanOrEqual(
        renderedTerrainHeight(terrain, east, north, false, false)! + 3.99,
      )
    }
    expect(JSON.stringify(route)).toBe(original)
    geometry.dispose()

  })
  it('sizes sparse ash markers by submitted diameters even when classes are reordered', () => {

    const parcels = [parcel(0), parcel(1)],
      original = JSON.stringify(parcels)
    const markers = ashMarkers(parcels, false, [50, 1000])

    expect(markers[1].size).toBeGreaterThan(markers[0].size)
    expect(markers[0].position[1]).toBe(0.5)
    expect(markers[0].position[2]).toBeLessThan(0)
    expect(JSON.stringify(parcels)).toBe(original)
    expect(ashMarkers([{ ...parcel(0), visibility: 0 }], false, [50])[0].size).toBe(0)

  })
  it('gives smoke soft transparent boundaries, with deterministic texture and no rectangular edge', () => {

    const texture = cloudTexture(),
      pixels = texture.image.data

    if (!pixels) throw new Error('Cloud texture has no alpha data')
    expect(pixels[3]).toBe(0)
    expect(pixels[(127 * 128 + 127) * 4 + 3]).toBe(0)
    expect(pixels[(64 * 128 + 64) * 4 + 3]).toBeGreaterThan(100)
    const repeat = cloudTexture()

    expect(repeat.image.data).toEqual(pixels)
    texture.dispose()
    repeat.dispose()

  })

})
