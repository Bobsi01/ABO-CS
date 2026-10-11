import { CONTOUR_LEVELS, depositColor } from '../presentation'

export default function Legend() {
  return <div className="legend" aria-label="Deposit thickness color legend">
    <span className="legend-title">Deposit thickness · mm</span>
    <span><i style={{ background: depositColor(0) }} />&lt;0.5</span>
    {CONTOUR_LEVELS.map((value) => <span key={value}><i style={{ background: depositColor(value) }} />{value}+</span>)}
    <small>Colors indicate thickness, not hazard severity.</small>
  </div>
}
