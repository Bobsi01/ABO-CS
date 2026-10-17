import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import Dashboard from './Dashboard'
import { eruption, simulate } from '../api/simulator'
import type { Catalog, EruptionSequence, Scenario, SimulationResult } from '../api/simulator'

vi.mock('../api/simulator', () => ({ simulate: vi.fn(), eruption: vi.fn() }))
const scenario = { label: 'Synthetic A', input_status: 'illustrative', column_height_m: 1000, wind_from_deg: 180, wind_speed_m_s: 10, duration_s: 3600 } as Scenario
const catalog = { scenarios: [{ id: 'a', name: 'Preset A', scenario }, { id: 'b', name: 'Preset B', scenario: { ...scenario, label: 'Synthetic B' } }] } as Catalog
const result = { scenario, receptors: [{ id: 'one', name: 'Synthetic municipality', kind: 'municipality', in_domain: true, thickness_mm: 2, population_year: 2024, screening: {}, screening_reasons: {} }], summary: { receptors_covered: 1, receptors_total: 1 }, diagnostics: { retained_fraction: 1 } } as SimulationResult
const sequence = { scenario, frames: [{ elapsed_s: 0, receptors: [{ id: 'one', thickness_mm: 0 }] }, { elapsed_s: 3600, receptors: [{ id: 'one', thickness_mm: 2 }] }] } as EruptionSequence

afterEach(() => { cleanup(); vi.resetAllMocks() })

describe('preset dashboard', () => {
  it('distinguishes finite-time snapshot scope from eventual totals in the data dialog', async () => {
    vi.mocked(simulate).mockResolvedValue(result)
    vi.mocked(eruption).mockResolvedValue(sequence)
    render(<Dashboard catalog={catalog} simulation={null} simulationSequence={null} />)
    await screen.findByRole('img', { name: /Deposit distribution/ })
    const dialog = screen.getByRole('dialog', { hidden: true })
    dialog.setAttribute('open', '')
    expect(within(dialog).getByText('Synthetic A · Eventual totals')).toBeTruthy()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Event snapshots' }))
    expect(within(dialog).getByText('Synthetic A · Computed event snapshots')).toBeTruthy()
    expect(within(dialog).queryByText('Synthetic A · Eventual totals')).toBeNull()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Locations' }))
    expect(within(dialog).getByText('Synthetic A · Eventual totals')).toBeTruthy()
  })
  it('calculates a preset and exposes numerical charts without spatial simulation', async () => {
    vi.mocked(simulate).mockResolvedValue(result)
    vi.mocked(eruption).mockResolvedValue(sequence)
    render(<Dashboard catalog={catalog} simulation={null} simulationSequence={null} />)
    expect(await screen.findByRole('img', { name: /Deposit distribution/ })).toBeTruthy()
    expect(screen.getByRole('img', { name: /Final sampled thickness 2/ })).toBeTruthy()
    expect(screen.getByRole('button', { name: /Synthetic municipality, 2 millimeters/ })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Run simulation' })).toBeNull()
    expect(screen.queryByRole('slider')).toBeNull()
  })
  it('hides prior charts when another preset fails and retries the selected preset', async () => {
    vi.mocked(simulate).mockResolvedValueOnce(result).mockRejectedValueOnce(new Error('Backend unavailable')).mockResolvedValueOnce({ ...result, scenario: catalog.scenarios[1].scenario })
    vi.mocked(eruption).mockResolvedValueOnce(sequence).mockResolvedValueOnce({ ...sequence, scenario: catalog.scenarios[1].scenario })
    render(<Dashboard catalog={catalog} simulation={null} simulationSequence={null} />)
    await screen.findByRole('img', { name: /Deposit distribution/ })
    fireEvent.change(screen.getByLabelText('Scenario'), { target: { value: 'b' } })
    await screen.findByRole('alert')
    expect(screen.queryByRole('img', { name: /Deposit distribution/ })).toBeNull()
    expect((screen.getByRole('button', { name: 'View raw data' }) as HTMLButtonElement).disabled).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: 'Retry preset' }))
    await waitFor(() => expect(screen.getByRole('img', { name: /Deposit distribution/ })).toBeTruthy())
    expect(vi.mocked(simulate).mock.calls.at(-1)?.[0].label).toBe('Synthetic B')
  })
})
