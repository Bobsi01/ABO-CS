import { describe, expect, it } from 'vitest'
import { csvCell, depositColor, number } from './presentation'

describe('scientific presentation', () => {
  it('distinguishes unknown values from zero deposition', () => {
    expect(number(null)).toBe('Unknown')
    expect(number(0)).toBe('0')
  })
  it('keeps reporting threshold inclusive and below-footprint neutral', () => {
    expect(depositColor(0.499)).not.toBe(depositColor(0.5))
    expect(depositColor(0.5)).toBe(depositColor(0.999))
  })
  it('escapes exported labels and prevents spreadsheet formula execution', () => {
    expect(csvCell('Town "A", North')).toBe('"Town ""A"", North"')
    expect(csvCell('=SUM(A1)')).toBe('"\'=SUM(A1)"')
  })
})
