import type { Catalog } from '../api/simulator'
import { number } from '../presentation'

export default function EvidenceDetails({ catalog }: { catalog: Catalog }) {

  const coverage = catalog.inventory_coverage ?? {}
  const domains =
    typeof coverage.domains === 'object' && coverage.domains !== null
      ? Object.entries(coverage.domains)
      : []

  return (
    <div className="evidence-details">
      <details>
        <summary>Parameter evidence register</summary>
        <p className="view-note">
          Input readiness is separate from numerical verification and historical agreement. Assumed
          teaching values remain illustrative.
        </p>
        <div className="table-scroll">
          <table>
            <caption>Reviewed classifications, units, datum and source dependencies.</caption>
            <thead>
              <tr>
                <th>Parameter</th>
                <th>Classification</th>
                <th>Value / units</th>
                <th>Readiness and evidence</th>
              </tr>
            </thead>
            <tbody>
              {(catalog.parameter_evidence ?? []).map((entry) => (
                <tr key={entry.id}>
                  <th scope="row">{entry.parameter}</th>
                  <td>{entry.classification}</td>
                  <td>
                    {entry.value == null
                      ? 'Unavailable'
                      : Array.isArray(entry.value)
                        ? entry.value.map((value) => number(value)).join(', ')
                        : typeof entry.value === 'number'
                          ? number(entry.value)
                          : entry.value}{' '}
                    {entry.units}
                    <small>{entry.datum}</small>
                  </td>
                  <td>
                    {entry.readiness.replaceAll('_', ' ')}
                    <details>
                      <summary>Evidence for {entry.parameter}</summary>
                      <p>{entry.notes}</p>
                      <p>Uncertainty: {entry.uncertainty}</p>
                      <p>Locator: {entry.locator}</p>
                      <p>Conversion: {entry.conversions}</p>
                      <p>License: {entry.license}</p>
                      <p>
                        Dependencies: {(entry.dependencies ?? []).join(', ') || 'None declared'}
                      </p>
                      {entry.source_ids.map((id) => {

                        const source = catalog.sources.find((item) => item.id === id)

                        return source ? (
                          <p key={id}>
                            <a href={source.url} target="_blank" rel="noreferrer">
                              {source.title}
                            </a>
                          </p>
                        ) : (
                          <p key={id}>Source {id} unavailable</p>
                        )

                      })}
                    </details>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
      <details>
        <summary>Administrative inventory coverage</summary>
        <p>
          {typeof coverage.inclusion_rule === 'string'
            ? coverage.inclusion_rule
            : 'Inventory inclusion rule is unavailable.'}
        </p>
        {domains.length > 0 && (
          <div
            className="table-scroll"
            tabIndex={0}
            role="region"
            aria-label="Administrative inventory coverage table"
          >
            <table>
              <caption>
                Areas intersecting each fixed domain. A polygon can intersect a domain while its
                centroid remains outside it.
              </caption>
              <thead>
                <tr>
                  <th>Domain</th>
                  <th>Intersecting areas</th>
                  <th>Included</th>
                  <th>Unresolved</th>
                </tr>
              </thead>
              <tbody>
                {domains.map(([id, value]) => {

                  const domain =
                    typeof value === 'object' && value !== null
                      ? (value as Record<string, unknown>)
                      : {}

                  return (
                    <tr key={id}>
                      <th scope="row">
                        {catalog.volcanoes.find((volcano) => volcano.id === id)?.name ?? id}
                      </th>
                      {['intersecting_administrative_polygons', 'included', 'unresolved'].map(
                        (key) => (
                          <td key={key}>
                            {typeof domain[key] === 'number' ? number(domain[key], 0) : 'Unknown'}
                          </td>
                        ),
                      )}
                    </tr>
                  )

                })}
              </tbody>
            </table>
          </div>
        )}
        {Array.isArray(coverage.limitations) && (
          <ul>
            {coverage.limitations
              .filter((entry): entry is string => typeof entry === 'string')
              .map((entry) => (
                <li key={entry}>{entry}</li>
              ))}
          </ul>
        )}
        <p className="view-note">
          Full included, omitted and unresolved identifiers are preserved in the local source
          manifest:{' '}
          {typeof coverage.manifest_path === 'string' ? coverage.manifest_path : 'unavailable'}.
        </p>
      </details>
    </div>
  )

}
