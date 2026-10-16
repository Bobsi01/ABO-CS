import { CONTOUR_LEVELS, depositColor } from '../presentation'

export default function Legend() {
  return <div className="legend" aria-label="Deposit thickness color legend">
    <span className="legend-title">Deposit thickness · mm</span>
    <span><i style={{ background: depositColor(0) }} />0</span>
    <span><i style={{ background: depositColor(0.01) }} />0.01–0.49 (trace)</span>
    {CONTOUR_LEVELS.map((value) => <span key={value}><i style={{ background: depositColor(value) }} />{value}+</span>)}
    <small>Colors indicate thickness, not hazard severity.</small>
  </div>
}
