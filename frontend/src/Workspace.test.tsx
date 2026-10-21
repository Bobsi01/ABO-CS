import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Workspace from './Workspace'
import { eruption, getCatalog, simulate } from './api/simulator'
import type { Catalog, EruptionSequence, Scenario, SimulationResult } from './api/simulator'

vi.mock('./api/simulator', () => ({ eruption: vi.fn(), getCatalog: vi.fn(), simulate: vi.fn(), sweep: vi.fn(), replicate: vi.fn() }))
vi.mock('./components/Dashboard', () => ({ default: () => <div>Dashboard</div> }))
vi.mock('./components/VolcanoScene', () => ({ default: ({ scenario }: { scenario: Scenario }) => <div>Completed-view wind: {scenario.wind_from_deg}°</div> }))
vi.mock('./components/GeographicMap', () => ({ default: () => <div>Computed map</div> }))

const scenario: Scenario = { volcano_id: 'taal', label: 'Synthetic UI workflow fixture', input_status: 'illustrative', vent_lat: 14, vent_lon: 121, vent_elevation_m: 300, column_height_m: 3000, mass_rate_kg_s: 100, duration_s: 3600, wind_speed_m_s: 10, wind_from_deg: 180, diffusivity_m2_s: 1000, initial_spread_m: 500, bulk_density_kg_m3: 1000, grains: [{ diameter_um: 10, fraction: 0.2, settling_speed_m_s: 1 }, { diameter_um: 100, fraction: 0.3, settling_speed_m_s: 2 }, { diameter_um: 1000, fraction: 0.5, settling_speed_m_s: 5 }], domain_km: 200, cell_km: 1, release_layers: 16 }
const catalog: Catalog = { revision: 'synthetic-ui-test', sources: [], volcanoes: [{ id: 'taal', name: 'Taal', lat: 14, lon: 121, elevation_m: 300, profile: 'caldera' }], scenarios: [{ id: 'test', name: 'Synthetic fixture', status: 'illustrative', scenario }], winds: [], receptors: [], criteria: [], historical: { available: false, reason: 'No real historical data in a UI fixture' } }
// The component test mocks its Python boundary; numerical correctness is tested in Python.
const result = { scenario, receptors: [], summary: { reporting_cutoff_mm: 0.5, receptors_total: 0, receptors_covered: 0, municipalities_reported: 0, indicative_population: 0, reported_population_unknown: 0 }, diagnostics: { elapsed_ms: 1, retained_fraction: 1, outside_domain_mass_kg: 0, validation_status: 'not_historically_validated' }, provenance: { solver_version: 'test', dataset_revision: 'synthetic-ui-test', input_status: 'illustrative', assumptions: [], warnings: [] } } as unknown as SimulationResult
const sequence = { scenario, frames: Array.from({ length: 25 }, (_, i) => ({ elapsed_s: i * 1000, phase: i === 0 ? 'before' : i < 4 ? 'erupting' : i === 24 ? 'after' : 'settling' })), options: { include_lava: false }, lava: { enabled: false, path: [], stop_reason: 'disabled', warnings: [] }, solver_version: 'synthetic-ui-sequence', assumptions: [], warnings: [] } as unknown as EruptionSequence

beforeEach(() => {
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })))
  vi.mocked(eruption).mockResolvedValue(sequence)
})
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.clearAllMocks() })
describe('completed-result workflow', () => {
  it('pauses the shared replay on window focus loss and never resumes automatically', async () => {
    vi.mocked(getCatalog).mockResolvedValue(catalog)
    vi.mocked(simulate).mockResolvedValue(result)
    render(<Workspace />)
    fireEvent.click(screen.getByRole('button', { name: /^Simulation$/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Edit parameters' }))
    await screen.findByRole('button', { name: 'Run simulation' })
    fireEvent.click(screen.getByRole('button', { name: 'Run simulation' }))
    await screen.findByRole('button', { name: 'Play sequence' })
    fireEvent.click(screen.getByRole('button', { name: 'Play sequence' }))
    expect(screen.getByRole('button', { name: 'Pause sequence' })).toBeTruthy()
    fireEvent.blur(window)
    expect(screen.getByRole('button', { name: 'Play sequence' })).toBeTruthy()
    fireEvent.focus(window)
    expect(screen.getByRole('button', { name: 'Play sequence' })).toBeTruthy()
  }, 25000)
  it('keeps previous computed views on parameter edits and backend failure', async () => {
    vi.mocked(getCatalog).mockResolvedValue(catalog)
    vi.mocked(simulate).mockResolvedValueOnce(result).mockRejectedValueOnce(new Error('Backend unavailable'))
    render(<Workspace />)
    fireEvent.click(screen.getByRole('button', { name: /^Simulation$/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Edit parameters' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Run simulation' }).hasAttribute('disabled')).toBe(false))
    fireEvent.click(screen.getByRole('button', { name: 'Run simulation' }))
    fireEvent.click(await screen.findByText('Detailed exposure & exports'))
    await screen.findByRole('heading', { name: 'Municipal and facility exposure' })
    fireEvent.change(screen.getByLabelText('Wind FROM (° clockwise from N)'), { target: { value: '90' } })
    expect(screen.getByText(/Parameters have changed/)).toBeTruthy()
    expect(screen.getByText('Completed-view wind: 180°')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Run simulation' }))
    await screen.findByRole('alert')
    expect(screen.getByText('Backend unavailable')).toBeTruthy()
    expect(screen.getByText('Completed-view wind: 180°')).toBeTruthy()
  })
  it('starts before eruption, exposes the shared clock, and preserves it on a failed sequence', async () => {
    vi.mocked(getCatalog).mockResolvedValue(catalog)
    vi.mocked(simulate).mockResolvedValue(result)
    vi.mocked(eruption).mockResolvedValueOnce(sequence).mockRejectedValueOnce(new Error('Event sequence failed'))
    render(<Workspace />)
    fireEvent.click(screen.getByRole('button', { name: /^Simulation$/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Edit parameters' }))
    await screen.findByRole('button', { name: 'Run simulation' })
    fireEvent.click(screen.getByRole('button', { name: 'Run simulation' }))
    await screen.findByRole('slider', { name: 'Eruption timeline' })
    expect(screen.getByRole('button', { name: /^Before$/ }).getAttribute('aria-pressed')).toBe('true')
    fireEvent.click(screen.getByRole('button', { name: /^During$/ }))
    expect(screen.getByRole('button', { name: /^During$/ }).getAttribute('aria-pressed')).toBe('true')
    fireEvent.click(screen.getByRole('button', { name: 'Run simulation' }))
    await screen.findByText('Event sequence failed')
    expect(screen.getByRole('button', { name: /^During$/ }).getAttribute('aria-pressed')).toBe('true')
  })
  it('labels Taal as the scientific focus without a validation claim', async () => {
    vi.mocked(getCatalog).mockResolvedValue(catalog)
    render(<Workspace />)
    fireEvent.click(screen.getByRole('button', { name: /^Simulation$/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Edit parameters' }))
    expect(await screen.findByText(/^Scientific focus\./)).toBeTruthy()
    expect(screen.queryByText(/validated/i)).toBeNull()
  })
})
