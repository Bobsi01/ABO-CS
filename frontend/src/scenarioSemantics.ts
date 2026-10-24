import type { Scenario } from './api/simulator'
import { number } from './presentation'

export function activeWindLabel(scenario: Scenario): string {

  return scenario.wind_profile?.length
    ? `Height-dependent wind · ${scenario.wind_profile.length} levels`
    : `Wind FROM ${number(scenario.wind_from_deg, 0)}° · ${number(scenario.wind_speed_m_s)} m/s`

}

export function hasUmbrellaHeuristic(scenario: Scenario): boolean {

  const heights = scenario.pulses?.map((p) => p.column_height_m) ?? [scenario.column_height_m]

  return (
    (scenario.umbrella_radius_m ?? 0) > scenario.initial_spread_m && Math.min(...heights) >= 3000
  )

}

export function releaseWeightLabel(scenario: Scenario): string {

  return hasUmbrellaHeuristic(scenario)
    ? 'Assumed Suzuki-style weights · heuristic stationary proximal and advected distal components'
    : 'Uniform release-height weights'

}
