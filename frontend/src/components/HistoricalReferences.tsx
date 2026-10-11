export default function HistoricalReferences({ blocked, tables }: { blocked: string[]; tables: Record<string, unknown>[] }) {
  return <div className="historical-references">
    {blocked.length > 0 && <><h3>Inputs still requiring review</h3><ul>{blocked.map(value => <li key={value}>{value}</li>)}</ul></>}
    {tables.length > 0 && <p className="muted">Published quantities are reference evidence, not a computed historical validation.</p>}
    {tables.map((reference, i) => <details key={i}><summary>{typeof reference.title === 'string' ? reference.title : 'Published reference'}</summary><dl>{Object.entries(reference).filter(([key]) => key !== 'title').map(([key, value]) => <div key={key}><dt>{key.replaceAll('_', ' ')}</dt><dd>{Array.isArray(value) ? value.join(', ') : typeof value === 'object' ? JSON.stringify(value) : String(value)}</dd></div>)}</dl></details>)}
  </div>
}
