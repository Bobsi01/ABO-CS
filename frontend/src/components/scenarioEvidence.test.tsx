import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import type { Scenario } from '../api/simulator'
import ScenarioEvidence from './ScenarioEvidence'
import { activeWindLabel, hasUmbrellaHeuristic, releaseWeightLabel } from '../scenarioSemantics'

afterEach(cleanup)
const scenario = {
  label: 'Synthetic illustrative input',
  input_status: 'illustrative',
  column_height_m: 17000,
  duration_s: 36000,
  mass_rate_kg_s: 1.5e6,
  wind_speed_m_s: 18,
  wind_from_deg: 205,
  bulk_density_kg_m3: 1000,
  diffusivity_m2_s: 1000,
  initial_spread_m: 500,
  umbrella_radius_m: 20000,
  wind_profile: [
    { height_above_vent_m: 500, speed_m_s: 10, wind_from_deg: 270 },
    { height_above_vent_m: 2000, speed_m_s: 20, wind_from_deg: 180 },
  ],
} as Scenario

describe('scenario evidence follows active physics', () => {

  it('identifies profile winds and assumed umbrella physics without certifying a reconstruction', () => {

    render(<ScenarioEvidence scenario={scenario} />)
    expect(screen.getByText('Height-dependent wind · 2 levels')).toBeTruthy()
    expect(screen.getByText(/500 m: 10 m\/s FROM 270°/)).toBeTruthy()
    expect(screen.getByText(/uncalibrated two-component Gaussian teaching heuristic/)).toBeTruthy()
    expect(screen.getByText(/Historical predictive agreement remains unestablished/)).toBeTruthy()
    expect(screen.queryByText(/zero synthetic placeholders/)).toBeNull()

  })

  it('distinguishes uniform wind from inactive scalar metadata and mixed-height pulses', () => {

    expect(activeWindLabel({ ...scenario, wind_profile: null })).toContain('Wind FROM 205°')
    expect(releaseWeightLabel({ ...scenario, umbrella_radius_m: null })).toBe(
      'Uniform release-height weights',
    )
    expect(
      hasUmbrellaHeuristic({
        ...scenario,
        pulses: [
          { start_s: 0, duration_s: 1, mass_rate_kg_s: 1, column_height_m: 2000 },
          { start_s: 1, duration_s: 1, mass_rate_kg_s: 1, column_height_m: 17000 },
        ],
      }),
    ).toBe(false)

  })

})
