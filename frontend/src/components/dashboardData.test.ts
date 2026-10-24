import { describe, expect, it } from 'vitest'
import type { ReceptorResult } from '../api/simulator'
import { depositDistribution } from './dashboardData'

const point = (thickness: number | null, inDomain = true, kind = 'municipality') =>
  ({ thickness_mm: thickness, in_domain: inDomain, kind }) as ReceptorResult

describe('dashboard distribution semantics', () => {

  it('assigns boundary values exactly once and excludes unknown, outside and facilities', () => {

    const data = depositDistribution([
      point(0),
      point(0.009),
      point(0.01),
      point(0.499),
      point(0.5),
      point(0.999),
      point(1),
      point(4.999),
      point(5),
      point(null),
      point(null, false),
      point(100, true, 'airport'),
    ])

    expect(data.bands.map((b) => b.count)).toEqual([2, 2, 2, 2, 1])
    expect(data.known).toBe(9)
    expect(data.outside).toBe(1)
    expect(data.unknown).toBe(1)
    expect(data.bands.reduce((n, b) => n + b.count, 0)).toBe(data.known)

  })
  it('keeps an entirely unknown inventory separate from zero deposit', () => {

    const data = depositDistribution([point(null), point(null, false)])

    expect(data.known).toBe(0)
    expect(data.bands.every((b) => b.count === 0)).toBe(true)
    expect(data.unknown).toBe(1)
    expect(data.outside).toBe(1)

  })

})
