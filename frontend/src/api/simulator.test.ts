import { afterEach, describe, expect, it, vi } from 'vitest'
import { eruption, getCatalog, replicate, simulate } from './simulator'
import type { Scenario } from './simulator'
import curatedCatalog from '../../../data/catalog.json'

const scenario: Scenario = { volcano_id: 'taal', label: 'Synthetic contract fixture', input_status: 'illustrative', vent_lat: 14, vent_lon: 121, vent_elevation_m: 300, column_height_m: 3000, mass_rate_kg_s: 100, duration_s: 3600, wind_speed_m_s: 10, wind_from_deg: 180, diffusivity_m2_s: 1000, initial_spread_m: 500, bulk_density_kg_m3: 1000, grains: [{ diameter_um: 10, fraction: 0.2, settling_speed_m_s: 1 }, { diameter_um: 100, fraction: 0.3, settling_speed_m_s: 2 }, { diameter_um: 1000, fraction: 0.5, settling_speed_m_s: 5 }], domain_km: 200, cell_km: 1, release_layers: 16 }
function fixture() {
  return { scenario, grid: { east_m: [0, 1000], north_m: [0, 1000], thickness_mm: [[0, 1], [2, 3]], load_kg_m2: [[0, 1], [2, 3]], cell_m: 1000, extent_m: [-500, -500, 1500, 1500] }, contours: { type: 'FeatureCollection', features: [] }, receptors: [], illustration: { wind_east_m_s: 0, wind_north_m_s: 10, paths: [{ grain_index: 0, diameter_um: 10, settling_time_s: 1500, points_m: [[0, 0, 1500], [0, 15000, 0]] }] }, summary: { reporting_cutoff_mm: 0.5, receptors_total: 0, receptors_covered: 0, municipalities_reported: 0, indicative_population: 0, reported_population_unknown: 0 }, diagnostics: { elapsed_ms: 10, retained_fraction: 1, outside_domain_mass_kg: 0, validation_status: 'not_historically_validated' }, provenance: { solver_version: 'test', dataset_revision: 'test', input_status: 'illustrative', assumptions: [], warnings: [] } }
}
function sequenceFixture() {
  const base = fixture(), empty = { type: 'FeatureCollection', features: [] }
  return { scenario, options: { frame_count: 25, plume_rise_speed_m_s: 30, include_lava: false, lava_effusion_m3_s: 5, lava_width_m: 20, lava_viscosity_pa_s: 1000, lava_density_kg_m3: 2600, lava_max_distance_m: 20000 }, final_grid: base.grid,
    frames: Array.from({ length: 25 }, (_, i) => ({ elapsed_s: i * 1000, phase: i === 0 ? 'before' : i === 24 ? 'after' : 'settling', grid: base.grid, contours: empty, receptors: [], diagnostics: { emitted_mass_kg: 0, deposited_mass_kg: 0, airborne_mass_kg: 0, inside_domain_mass_kg: 0, outside_domain_mass_kg: 0 }, plume_parcels: [], column_top_m: 0, fountain_particles_m: [], lava_footprint: empty, lava_affected_receptor_ids: [] })),
    lava: { enabled: false, path: [], footprint: empty, affected_receptor_ids: [], model_label: 'Synthetic fixture', stop_reason: 'not_requested', warnings: [] }, fountain_paths_m: [], fountain_flight_time_s: 6, fountain_label: 'Synthetic', provenance: base.provenance, warnings: [], assumptions: [] }
}
afterEach(() => vi.unstubAllGlobals())
describe('Python simulation boundary', () => {
  it('accepts the curated catalog including its derived GeoJSON Feature reference traces', async () => {
    expect(curatedCatalog.historical.reference_footprints[0].geojson.type).toBe('Feature')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(curatedCatalog))))
    await expect(getCatalog(new AbortController().signal)).resolves.toEqual(curatedCatalog)
    const invalid = { ...curatedCatalog, historical: { ...curatedCatalog.historical, reference_footprints: [{ ...curatedCatalog.historical.reference_footprints[0], geojson: { type: 'Feature', geometry: { type: 'Polygon', coordinates: [[['bad', 14], [121, 14]]] } } }] } }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(invalid))))
    await expect(getCatalog(new AbortController().signal)).rejects.toThrow('Unexpected Python response')
  })
  it('explains how to recover from a stopped server', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
    await expect(simulate(scenario, new AbortController().signal)).rejects.toThrow('Start ABO with scripts/start.ps1, then retry')
  })
  it('forwards explicit SI scenario and cancellation, accepting a structurally valid result', async () => {
    const value = fixture(), fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(value)))
    vi.stubGlobal('fetch', fetchMock)
    const controller = new AbortController()
    await expect(simulate(scenario, controller.signal)).resolves.toEqual(value)
    expect(fetchMock).toHaveBeenCalledWith('/api/simulations', expect.objectContaining({ method: 'POST', signal: controller.signal, body: JSON.stringify({ scenario }) }))
  })
  it('submits the same condition and census context to the grid and finite sequence workflows', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(fixture())))
    vi.stubGlobal('fetch', fetchMock)
    const signal = new AbortController().signal, reporting = { screening_context: { ash_condition: 'dry' }, population_year: 2020 as const }
    await simulate(scenario, signal, reporting)
    expect(fetchMock.mock.calls[0][1].body).toBe(JSON.stringify({ scenario, ...reporting }))
    fetchMock.mockResolvedValue(new Response(JSON.stringify(sequenceFixture())))
    await eruption(scenario, {}, signal, reporting)
    expect(fetchMock.mock.calls[1][1].body).toBe(JSON.stringify({ simulation: { scenario, ...reporting }, options: {} }))
  })
  it('rejects reversed historical thickness intervals and malformed residuals at the API boundary', async () => {
    const row = { observation_id: 'synthetic', spatial_group: 'a', dependency_group: 'study', split: 'evaluation', lat: 14, lon: 121, lower_mm: 2, upper_mm: 1, in_domain: true, predicted_mm: 1, interval_residual_mm: 0, midpoint_residual_mm: 0, reason: 'Synthetic contract test' }
    const value = { available: true, reason: 'Synthetic fixture', validation_status: 'evaluated_not_validated', metrics: {}, observation_results: [row] }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(value))))
    await expect(replicate(new AbortController().signal)).rejects.toThrow('Unexpected Python response')
    row.upper_mm = 3
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(value))))
    await expect(replicate(new AbortController().signal)).resolves.toEqual(value)
    const invalid = { ...value, observation_results: [{ ...row, predicted_mm: 'not a number' }] }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(invalid))))
    await expect(replicate(new AbortController().signal)).rejects.toThrow('Unexpected Python response')
  })
  it('rejects malformed grid dimensions before they reach a renderer', async () => {
    const value = fixture(); value.grid.thickness_mm[0] = [1]
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(value))))
    await expect(simulate(scenario, new AbortController().signal)).rejects.toThrow('Unexpected Python response')
  })
  it('rejects malformed trajectories before 3D interpolation', async () => {
    const value = fixture(); value.illustration.paths[0].points_m[0] = [0, 1]
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(value))))
    await expect(simulate(scenario, new AbortController().signal)).rejects.toThrow('Unexpected Python response')
  })
  it('shows backend field-validation errors as actionable text', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ detail: [{ loc: ['body', 'scenario', 'grains'], msg: 'Fractions must sum to one' }] }), { status: 422 })))
    await expect(simulate(scenario, new AbortController().signal)).rejects.toThrow('body.scenario.grains: Fractions must sum to one')
  })
  it('rejects missing or nonpositive physical playback durations', async () => {
    const value = fixture(); value.illustration.paths[0].settling_time_s = 0
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(value))))
    await expect(simulate(scenario, new AbortController().signal)).rejects.toThrow('Unexpected Python response')
  })
  it('accepts a finite sequence and rejects reversed clocks before rendering', async () => {
    const value = sequenceFixture()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(value))))
    await expect(eruption(scenario, {}, new AbortController().signal)).resolves.toEqual(value)
    value.frames[2].elapsed_s = value.frames[1].elapsed_s
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(value))))
    await expect(eruption(scenario, {}, new AbortController().signal)).rejects.toThrow('Unexpected Python response')
  })
  it('rejects malformed lava polygons before Leaflet can interpret them', async () => {
    const value = sequenceFixture()
    const invalid = { ...value, frames: value.frames.map(f => ({ ...f, lava_footprint: { type: 'FeatureCollection', features: [{ type: 'Feature', geometry: { type: 'Polygon', coordinates: [[[0, 'bad'], [1, 0], [1, 1], [0, 'bad']]] } }] } })) }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(invalid))))
    await expect(eruption(scenario, {}, new AbortController().signal)).rejects.toThrow('Unexpected Python response')
  })
})
