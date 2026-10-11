import { describe, expect, it } from 'vitest'
import { pathPosition, replayDuration } from './settlingReplay'

describe('one physical demonstration clock', () => {
  const fast = { settling_time_s: 100, points_m: [[0, 0, 1000], [1000, 0, 0]] }
  const slow = { settling_time_s: 400, points_m: [[0, 0, 1000], [4000, 0, 0]] }
  it('lands a faster class while a slower class is still aloft at the same physical time', () => {
    expect(pathPosition(fast, 100)).toEqual([1000, 0, 0])
    expect(pathPosition(slow, 100)).toEqual([1000, 0, 750])
  })
  it('uses the longest backend falling time as the finite replay end and clamps landed classes', () => {
    expect(replayDuration([fast, slow])).toBe(400)
    expect(pathPosition(fast, 400)).toEqual([1000, 0, 0])
    expect(pathPosition(slow, 400)).toEqual([4000, 0, 0])
  })
  it('keeps negative replay times at the source and interpolates actual backend samples', () => {
    expect(pathPosition(fast, -1)).toEqual([0, 0, 1000])
    expect(pathPosition({ settling_time_s: 100, points_m: [[0, 0, 1000], [600, 30, 500], [1000, 0, 0]] }, 25)).toEqual([300, 15, 750])
  })
})
