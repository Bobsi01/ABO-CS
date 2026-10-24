import type { ReplicationResult } from '../api/simulator'
import { download, number } from '../presentation'
import Icon from './Icon'
import { useState } from 'react'
import HistoricalFootprints from './HistoricalFootprints'

const metricLabels: Record<string, string> = {
  interval_rmse_mm: 'Interval-distance RMSE (mm)',
  midpoint_rmse_mm: 'Midpoint RMSE (mm)',
  interval_mae_mm: 'Interval-distance MAE (mm)',
  range_coverage: 'Predictions within observed intervals (fraction)',
  footprint_iou: '0.5 mm footprint intersection / union',
  observation_count: 'Evaluation observations',
  covered_observation_count: 'Evaluation observations in domain',
  outside_domain_observation_count: 'Evaluation observations outside domain',
  median_factor_error: 'Median factor error',
}

export default function HistoricalEvaluation({
  result,
  onInspect,
}: {
  result: ReplicationResult
  onInspect: () => void
}) {

  const rows = result.observation_results ?? []
  const traces = result.reference_footprints ?? []
  const footprint = result.footprint_evidence ?? {}
  const [showReferences, setShowReferences] = useState(false)
  const evidenceNumber = (key: string) =>
    typeof footprint[key] === 'number' ? number(footprint[key] as number, 3) : 'Unavailable'
  const metrics = Object.entries(result.metrics ?? {}).filter(
    ([key]) => key !== 'rmse_mm' || result.metrics?.interval_rmse_mm == null,
  )

  return (
    <div className="historical-evaluation">
      <p role="status">
        <strong>{result.validation_status.replaceAll('_', ' ')}</strong>. {result.reason}
      </p>
      {(result.assessment_reasons ?? []).length > 0 && (
        <ul>
          {result.assessment_reasons?.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      )}
      {metrics.length > 0 && (
        <dl className="evaluation-metrics">
          {metrics.map(([key, value]) => (
            <div key={key}>
              <dt>
                {metricLabels[key] ??
                  (key === 'rmse_mm' ? 'Interval-distance RMSE (mm)' : key.replaceAll('_', ' '))}
              </dt>
              <dd>{number(value)}</dd>
            </div>
          ))}
        </dl>
      )}
      {metrics.length > 0 && (
        <p className="view-note">
          Interval errors measure distance outside an observation's stated thickness range. Midpoint
          errors use the range center. A small error alone does not establish historical validation.
        </p>
      )}
      <div className="export-actions">
        {result.simulation && (
          <button type="button" onClick={onInspect}>
            Inspect historical result
          </button>
        )}
        <button
          type="button"
          onClick={() =>
            download(
              'abo-taal-evaluation.json',
              JSON.stringify(result, null, 2),
              'application/json',
            )
          }
        >
          <Icon name="download" />
          Evaluation JSON
        </button>
      </div>
      {rows.length > 0 ? (
        <details open>
          <summary>Observed and predicted thickness</summary>
          <div className="table-scroll">
            <table>
              <caption>
                Each row retains its spatial and source-dependency group. Calibration rows are
                excluded from evaluation metrics.
              </caption>
              <thead>
                <tr>
                  <th>Observation</th>
                  <th>Observed range (mm)</th>
                  <th>Predicted (mm)</th>
                  <th>Interval residual (mm)</th>
                  <th>Midpoint residual (mm)</th>
                  <th>Coverage</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.observation_id}>
                    <th scope="row">
                      {row.observation_id}
                      <small>
                        {row.split} · {row.spatial_group ?? 'Group unavailable'}
                        <br />
                        {row.dependency_group ?? 'Dependency unavailable'}
                      </small>
                    </th>
                    <td>
                      {number(row.lower_mm)}–{number(row.upper_mm)}
                    </td>
                    <td>{number(row.predicted_mm)}</td>
                    <td>{number(row.interval_residual_mm)}</td>
                    <td>{number(row.midpoint_residual_mm)}</td>
                    <td>
                      {row.in_domain ? 'In domain' : 'Outside domain'}
                      {row.reason && <small>{row.reason}</small>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      ) : (
        <p className="empty-note">
          No geolocated thickness observations have passed the evidence gate. Published summary
          areas cannot supply point residuals.
        </p>
      )}
      {traces.length > 0 && (
        <details onToggle={(event) => setShowReferences(event.currentTarget.open)}>
          <summary>Derived reference contours & digitization uncertainty</summary>
          <p>
            These are independently digitized outlines from the same publication, not independent
            observations or model predictions. Historical validation is not established.
          </p>
          {showReferences && <HistoricalFootprints traces={traces} />}
          <dl className="evaluation-metrics">
            <div>
              <dt>Digitization IoU</dt>
              <dd>{evidenceNumber('intertrace_iou')}</dd>
            </div>
            <div>
              <dt>Boundary disagreement (m)</dt>
              <dd>{evidenceNumber('boundary_hausdorff_m')}</dd>
            </div>
            <div>
              <dt>Area disagreement (km²)</dt>
              <dd>{evidenceNumber('absolute_area_difference_km2')}</dd>
            </div>
            <div>
              <dt>Independent observations</dt>
              <dd>{evidenceNumber('independent_observation_count')}</dd>
            </div>
          </dl>
          {typeof footprint.area_assessment === 'string' && <p>{footprint.area_assessment}</p>}
          {typeof footprint.uncertainty === 'string' && <p>{footprint.uncertainty}</p>}
          <ul>
            {traces.map((trace) => (
              <li key={trace.trace_id}>
                <strong>{trace.label}</strong> · {number(trace.threshold_mm)} mm ·{' '}
                {trace.dependency_group}
                <p>{trace.uncertainty_notes}</p>
                <p>Sources: {trace.source_ids.join(', ')}</p>
                <button
                  type="button"
                  onClick={() =>
                    download(
                      `${trace.trace_id}.geojson`,
                      JSON.stringify(trace.geojson, null, 2),
                      'application/geo+json',
                    )
                  }
                >
                  <Icon name="download" />
                  Trace GeoJSON
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}
      <details>
        <summary>Frozen protocol & source dependencies</summary>
        <p>Dataset: {result.dataset_id ?? 'Unavailable'}</p>
        {result.protocol ? (
          <>
            <p>
              {result.protocol.id} · {result.protocol.review_status} · frozen{' '}
              {result.protocol.frozen_at}
            </p>
            <p>{result.protocol.event_definition}</p>
            <p>
              {result.protocol.event_start_utc} to {result.protocol.event_end_utc} ·{' '}
              {number(result.protocol.duration_s, 0)} seconds
            </p>
            <ul>
              {result.protocol.evaluation_rules.map((rule) => (
                <li key={rule}>{rule}</li>
              ))}
            </ul>
            <p>Tolerance: {result.protocol.acceptance_tolerance}</p>
          </>
        ) : (
          <p>A frozen historical protocol is unavailable.</p>
        )}
        {(result.source_dependencies ?? []).map((group) => (
          <div key={group.group_id}>
            <h3>{group.group_id}</h3>
            <p>{group.disclosure}</p>
            <p>
              {group.dependent_quantities.join(', ')} · sources: {group.source_ids.join(', ')}
            </p>
          </div>
        ))}
      </details>
      {(result.sensitivity ?? []).length > 0 && (
        <details>
          <summary>Sensitivity results</summary>
          {result.sensitivity?.map((entry, index) => (
            <dl key={index}>
              {Object.entries(entry).map(([key, value]) => (
                <div key={key}>
                  <dt>{key.replaceAll('_', ' ')}</dt>
                  <dd>
                    {typeof value === 'number'
                      ? number(value)
                      : typeof value === 'object'
                        ? JSON.stringify(value)
                        : String(value)}
                  </dd>
                </div>
              ))}
            </dl>
          ))}
        </details>
      )}
    </div>
  )

}
