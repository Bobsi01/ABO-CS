import { useEffect, useState } from 'react'

type ActivityEntry = {
  date: string
  alert_level: number
  so2_t_day: number
  plume_height_m: number
  event_type: string
  source: string
  disclaimer: string
}

type WovodatMetadata = {
  volcano: string
  gvp_volcano_number: string
  observatory: string
  portal_urls: { wovodat: string; phivolcs_lava: string }
  monitoring_networks: Record<string, { status: string; description: string; stations?: string[] }>
  license: string
  disclaimer: string
  note: string
}

type HdxDataset = {
  id: string
  title: string
  publisher: string
  url: string
  format: string
  date?: string
  disclaimer: string
}

type HdxMetadata = {
  source: string
  portal_url: string
  datasets: HdxDataset[]
  disclaimer: string
}

export default function HistoricalReferences({
  blocked,
  tables,
  volcanoId = 'taal',
}: {
  blocked: string[]
  tables: Record<string, unknown>[]
  volcanoId?: string
}) {
  const [activity, setActivity] = useState<ActivityEntry[]>([])
  const [wovodat, setWovodat] = useState<WovodatMetadata | null>(null)
  const [hdx, setHdx] = useState<HdxMetadata | null>(null)

  useEffect(() => {
    if (volcanoId !== 'taal') return
    const controller = new AbortController()
    fetch('/taal_activity_log_2021_2024.json', { signal: controller.signal, cache: 'no-store' })
      .then(r => r.ok ? (r.json() as Promise<ActivityEntry[]>) : [])
      .then(data => setActivity(data))
      .catch(() => {})

    fetch('/taal_wovodat_metadata.json', { signal: controller.signal, cache: 'no-store' })
      .then(r => r.ok ? (r.json() as Promise<WovodatMetadata>) : null)
      .then(data => setWovodat(data))
      .catch(() => {})

    fetch('/taal_hdx_damage_proxy_metadata.json', { signal: controller.signal, cache: 'no-store' })
      .then(r => r.ok ? (r.json() as Promise<HdxMetadata>) : null)
      .then(data => setHdx(data))
      .catch(() => {})

    return () => controller.abort()
  }, [volcanoId])

  return (
    <div className="historical-references">
      {blocked.length > 0 && (
        <>
          <h3>Inputs still requiring review</h3>
          <ul>{blocked.map(value => <li key={value}>{value}</li>)}</ul>
        </>
      )}
      {tables.length > 0 && <p className="muted">Published quantities are reference evidence, not a computed historical validation.</p>}
      {tables.map((reference, i) => (
        <details key={i}>
          <summary>{typeof reference.title === 'string' ? reference.title : 'Published reference'}</summary>
          <dl>
            {Object.entries(reference).filter(([key]) => key !== 'title').map(([key, value]) => (
              <div key={key}>
                <dt>{key.replaceAll('_', ' ')}</dt>
                <dd>{Array.isArray(value) ? value.join(', ') : typeof value === 'object' ? JSON.stringify(value) : String(value)}</dd>
              </div>
            ))}
          </dl>
        </details>
      ))}

      {volcanoId === 'taal' && (
        <section className="curated-evidence-section" aria-label="Curated Taal observation evidence">
          <div className="evidence-section-header">
            <h3>Curated Taal Multi-Parameter Observation Evidence</h3>
            <span className="reference-badge">Reference evidence · non-model</span>
          </div>
          <p className="view-note">
            The open-source observational records below (PHIVOLCS, GVP, WOVOdat, NASA-JPL ARIA / HDX) provide independent volcanic context and ground-truth bounds for teaching and research. They are decoupled from the Gaussian ash dispersion solver.
          </p>

          {activity.length > 0 && (
            <details className="evidence-accordion">
              <summary>
                <strong>Recent Volcanic Unrest Activity Log (2021–2024 · PHIVOLCS / GVP)</strong>
                <span className="summary-count">{activity.length} logged events</span>
              </summary>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th scope="col">Date</th>
                      <th scope="col">Alert Level</th>
                      <th scope="col">SO₂ Flux (t/day)</th>
                      <th scope="col">Plume Height (m)</th>
                      <th scope="col">Event Type</th>
                      <th scope="col">Source</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activity.map((entry, idx) => (
                      <tr key={idx}>
                        <td><strong>{entry.date}</strong></td>
                        <td><span className={`pill-alert alert-${entry.alert_level}`}>AL{entry.alert_level}</span></td>
                        <td>{entry.so2_t_day.toLocaleString()}</td>
                        <td>{entry.plume_height_m.toLocaleString()}</td>
                        <td>{entry.event_type.replace(/_/g, ' ')}</td>
                        <td><small>{entry.source}</small></td>
                      </tr>
                    ))}
                  </tbody>
                  <caption>Observational chronology from PHIVOLCS bulletins and Smithsonian GVP reports. SI units: metric tonnes/day, meters above vent. Non-model reference.</caption>
                </table>
              </div>
            </details>
          )}

          {wovodat && (
            <details className="evidence-accordion">
              <summary>
                <strong>Observatory Monitoring Infrastructure (WOVOdat / PHIVOLCS)</strong>
                <span className="summary-count">GVP #{wovodat.gvp_volcano_number}</span>
              </summary>
              <dl>
                <div>
                  <dt>Observatory</dt>
                  <dd>{wovodat.observatory}</dd>
                </div>
                <div>
                  <dt>Portal References</dt>
                  <dd>
                    <a href={wovodat.portal_urls.wovodat} target="_blank" rel="noopener noreferrer">WOVOdat Global Database</a> ·{' '}
                    <a href={wovodat.portal_urls.phivolcs_lava} target="_blank" rel="noopener noreferrer">PHIVOLCS LAVA Portal</a>
                  </dd>
                </div>
                {Object.entries(wovodat.monitoring_networks).map(([netKey, net]) => (
                  <div key={netKey}>
                    <dt>{netKey.replaceAll('_', ' ').toUpperCase()}</dt>
                    <dd>
                      <span className="badge-status">{net.status}</span> {net.description}
                      {net.stations && (
                        <div className="station-pills">
                          <span className="muted">Stations:</span> {net.stations.join(', ')}
                        </div>
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
              <p className="reference-disclaimer">{wovodat.disclaimer}</p>
            </details>
          )}

          {hdx && (
            <details className="evidence-accordion">
              <summary>
                <strong>Exposure & Damage Proxy Datasets (HDX / NASA-JPL ARIA / Copernicus)</strong>
                <span className="summary-count">{hdx.datasets.length} datasets</span>
              </summary>
              <dl>
                <div>
                  <dt>Repository</dt>
                  <dd><a href={hdx.portal_url} target="_blank" rel="noopener noreferrer">{hdx.source}</a></dd>
                </div>
                {hdx.datasets.map((ds) => (
                  <div key={ds.id}>
                    <dt>{ds.format}</dt>
                    <dd>
                      <strong><a href={ds.url} target="_blank" rel="noopener noreferrer">{ds.title}</a></strong>
                      <div><small className="muted">Publisher: {ds.publisher}{ds.date ? ` · Date: ${ds.date}` : ''}</small></div>
                    </dd>
                  </div>
                ))}
              </dl>
              <p className="reference-disclaimer">{hdx.disclaimer}</p>
            </details>
          )}
        </section>
      )}
    </div>
  )
}
