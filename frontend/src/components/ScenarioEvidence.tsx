import type { Scenario, SimulationResult } from '../api/simulator'
import { number } from '../presentation'
import { activeWindLabel, hasUmbrellaHeuristic, releaseWeightLabel } from '../scenarioSemantics'

export default function ScenarioEvidence({
  scenario,
  provenance,
}: {
  scenario: Scenario
  provenance?: SimulationResult['provenance']
}) {

  return (
    <section className="scientific-methods-card" aria-label="Active scenario assumptions">
      <h3>Active scenario assumptions</h3>
      <p>
        {scenario.label} · {scenario.input_status.replaceAll('_', ' ')} inputs
      </p>
      <p>
        Physical inputs are scenario assumptions unless individually established by the parameter
        evidence register. Source links provide context and do not certify these values.
      </p>
      <dl className="scenario-ledger">
        <div>
          <dt>Column above model ground</dt>
          <dd>{number(scenario.column_height_m)} m</dd>
        </div>
        <div>
          <dt>Modeled ash rate</dt>
          <dd>{number(scenario.mass_rate_kg_s)} kg/s</dd>
        </div>
        <div>
          <dt>Emission duration</dt>
          <dd>{number(scenario.duration_s / 3600)} h</dd>
        </div>
        <div>
          <dt>Deposit bulk density</dt>
          <dd>{number(scenario.bulk_density_kg_m3)} kg/m³</dd>
        </div>
        <div>
          <dt>Diffusivity</dt>
          <dd>{number(scenario.diffusivity_m2_s)} m²/s</dd>
        </div>
        <div>
          <dt>Active wind</dt>
          <dd>{activeWindLabel(scenario)}</dd>
        </div>
      </dl>
      <p>{releaseWeightLabel(scenario)}.</p>
      {scenario.wind_profile?.length ? (
        <details>
          <summary>Active wind levels and transport interpretation</summary>
          <p>
            Heights are above the vent. Endpoint winds extend beyond supplied levels.{' '}
            {hasUmbrellaHeuristic(scenario)
              ? 'Advected component winds use height-integrated profile means.'
              : 'Each component uses the wind interpolated at its release height.'}{' '}
            Scalar wind fields are profile rotation/speed references, not a uniform operative wind.
          </p>
          <ul>
            {scenario.wind_profile.map((level) => (
              <li key={level.height_above_vent_m}>
                {number(level.height_above_vent_m)} m: {number(level.speed_m_s)} m/s FROM{' '}
                {number(level.wind_from_deg)}°
              </li>
            ))}
          </ul>
        </details>
      ) : null}
      {hasUmbrellaHeuristic(scenario) && (
        <p>
          Umbrella spread parameter: {number(scenario.umbrella_radius_m)} m. This is an uncalibrated
          two-component Gaussian teaching heuristic, not solved umbrella-current dynamics or a
          maximum cloud radius. The stationary proximal fraction and other assumed coefficients are
          disclosed in the completed run assumptions below.
        </p>
      )}
      {provenance && (
        <details>
          <summary>Completed run assumptions and warnings</summary>
          <ul>
            {[...provenance.assumptions, ...provenance.warnings].map((text) => (
              <li key={text}>{text}</li>
            ))}
          </ul>
        </details>
      )}
      <p>
        Historical predictive agreement remains unestablished. The emission interval and population
        reference year do not reconstruct a historical event.
      </p>
    </section>
  )

}
