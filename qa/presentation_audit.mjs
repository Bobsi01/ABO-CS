/** Independent scalar replay checks. Run: node qa/presentation_audit.mjs
 * Synthetic trajectories only; no volcanic or browser/GPU certification.
 */
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'

const requireFrontend = createRequire(new URL('../frontend/package.json', import.meta.url))
const ts = requireFrontend('typescript')
const source = await readFile(new URL('../frontend/src/components/settlingReplay.ts', import.meta.url), 'utf8')
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText
const { pathPosition, replayDuration } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`)

// Same source height and uniform wind: every unsettled class must have equal
// horizontal displacement at a shared elapsed time, despite different tau.
const fixture = [2, 5, 20].map(speed => {
  const tau = 1200 / speed
  return { settling_time_s: tau, points_m: [[0, 0, 1200], [3 * tau, -4 * tau, 0]] }
})
assert.equal(replayDuration(fixture), 600)
fixture.forEach((path, index) => {
  const point = pathPosition(path, 30)
  assert.deepEqual(point, [90, -120, 1200 - [2, 5, 20][index] * 30])
})
// A landed class retains its own end point while slower classes keep falling.
assert.deepEqual(pathPosition(fixture[2], 120), [180, -240, 0])
assert.deepEqual(pathPosition(fixture[0], 120), [360, -480, 960])
assert.deepEqual(pathPosition(fixture[0], 900), [1800, -2400, 0])
assert.deepEqual(pathPosition(fixture[1], -100), [0, 0, 1200])

// Coordinate order and piecewise interpolation must preserve supplied points.
const sampled = { settling_time_s: 80, points_m: [[7, -3, 100], [11, 5, 60], [23, -7, 0]] }
assert.deepEqual(pathPosition(sampled, 60), [17, -1, 30])

console.log(JSON.stringify({ status: 'PASS', assertions: 9, evidence: 'Independent synthetic interpolation and shared-clock assertions; no renderer or scientific calibration claim.' }))
