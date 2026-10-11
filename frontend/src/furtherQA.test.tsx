import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Workspace from './Workspace'
import { getCatalog } from './api/simulator'
import type { Catalog, Scenario } from './api/simulator'

vi.mock('./api/simulator', () => ({ getCatalog: vi.fn(), simulate: vi.fn(), eruption: vi.fn(), sweep: vi.fn(), replicate: vi.fn() }))
vi.mock('./components/VolcanoScene', () => ({ default: () => <div>QA scene boundary</div> }))
vi.mock('./components/GeographicMap', () => ({ default: () => <div>QA map boundary</div> }))

const scenario: Scenario = {
  volcano_id: 'taal', label: 'Synthetic invalid-input QA fixture', input_status: 'illustrative',
  vent_lat: 14, vent_lon: 121, vent_elevation_m: 300, column_height_m: 3000,
  mass_rate_kg_s: 100, duration_s: 3600, wind_speed_m_s: 10, wind_from_deg: 180,
  diffusivity_m2_s: 1000, initial_spread_m: 500, bulk_density_kg_m3: 1000,
  domain_km: 200, cell_km: 1, release_layers: 16,
  grains: [{ diameter_um: 10, fraction: 0.2, settling_speed_m_s: 1 }, { diameter_um: 100, fraction: 0.3, settling_speed_m_s: 2 }, { diameter_um: 1000, fraction: 0.5, settling_speed_m_s: 5 }],
}
const catalog: Catalog = {
  revision: 'further-ui-qa-synthetic', sources: [], winds: [], receptors: [], criteria: [],
  volcanoes: [{ id: 'taal', name: 'Taal', lat: 14, lon: 121, elevation_m: 300, profile: 'caldera' }],
  scenarios: [{ id: 'qa', name: scenario.label, status: 'illustrative', scenario }],
  historical: { available: false, reason: 'No historical observations in this fixture' },
}

beforeEach(() => {
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })))
  vi.mocked(getCatalog).mockResolvedValue(catalog)
})
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.clearAllMocks() })

describe('independent invalid-disclosure recovery', () => {
  it('reveals and names a native-invalid field after its advanced section was closed', async () => {
    render(<Workspace />)
    await screen.findByRole('button', { name: 'Run simulation' })
    const input = screen.getByLabelText('Initial spread σ₀ (m)') as HTMLInputElement
    const panel = input.closest('details')!
    panel.open = true
    fireEvent.change(input, { target: { value: '0' } })
    panel.open = false
    act(() => { expect(input.reportValidity()).toBe(false) })
    expect(panel.open).toBe(true)
    expect(document.activeElement).toBe(input)
    expect(screen.getByRole('alert').textContent).toContain('Initial spread σ₀ (m)')
    expect(screen.getByRole('alert').textContent).toContain(input.validationMessage)
  })

  it('keeps valid collapsed controls quiet instead of flagging every hidden field', async () => {
    render(<Workspace />)
    await screen.findByRole('button', { name: 'Run simulation' })
    const input = screen.getByLabelText('Initial spread σ₀ (m)') as HTMLInputElement
    const panel = input.closest('details')!
    expect(panel.open).toBe(false)
    expect(input.reportValidity()).toBe(true)
    expect(panel.open).toBe(false)
    expect(screen.queryByRole('alert')).toBeNull()
  })
})
