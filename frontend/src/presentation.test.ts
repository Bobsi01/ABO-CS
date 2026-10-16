import { describe, expect, it } from 'vitest'
import { calculateFamiliesAffected, csvCell, depositColor, number, PSA_REGION4A_HOUSEHOLD_SIZE } from './presentation'

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
  it('estimates families affected using PSA Region IV-A average household size (4.1 persons/family)', () => {
    expect(PSA_REGION4A_HOUSEHOLD_SIZE).toBe(4.1)
    expect(calculateFamiliesAffected(null)).toBe(0)
    expect(calculateFamiliesAffected(undefined)).toBe(0)
    expect(calculateFamiliesAffected(0)).toBe(0)
    expect(calculateFamiliesAffected(-50)).toBe(0)
    // 41,000 / 4.1 = 10,000 families
    expect(calculateFamiliesAffected(41000)).toBe(10000)
    // Agoncillo, Batangas (39,101 / 4.1 = 9536.8 -> 9537 families)
    expect(calculateFamiliesAffected(39101)).toBe(9537)
  })
})

