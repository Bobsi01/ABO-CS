const fs = require('node:fs'), path = require('node:path')
const { chromium } = require('../../browser/playwright-runtime.cjs')
const base = process.env.ABO_QA_URL || 'http://127.0.0.1:8012', suffix = process.env.ABO_QA_SUFFIX || 'final'
const report = { started: new Date().toISOString(), base, scope: 'Headless forced-GC remount-only controls: both views, 3D import denied, map import denied; no repeated computation. Deliberate lazy-module denials are synthetic fixtures.', modes: [] }
const write = () => fs.writeFileSync(path.join(__dirname, `${suffix}-retention-attribution.json`), JSON.stringify(report, null, 2))
let browser
;(async () => {
  for (const mode of ['both', 'map-only', 'scene-only']) {
    browser = await chromium.launch({ channel: 'chrome', headless: true })
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
    const page = await context.newPage(), errors = []
    page.on('pageerror', error => errors.push(error.message))
    if (mode === 'map-only') await page.route('**/assets/VolcanoScene-*.js', route => route.abort())
    if (mode === 'scene-only') await page.route('**/assets/GeographicMap-*.js', route => route.abort())
    await page.goto(base); await page.getByRole('button', { name: 'Run simulation', exact: true }).waitFor()
    await page.getByRole('button', { name: 'Run simulation', exact: true }).click()
    await page.waitForFunction(() => document.querySelector('.eruption-timeline') && !document.querySelector('.status-line')?.textContent.includes('Computing'), null, { timeout: 120000 })
    const cdp = await context.newCDPSession(page); await cdp.send('Performance.enable')
    async function sample(cycle) {
      await page.waitForTimeout(1500); await cdp.send('HeapProfiler.collectGarbage'); await page.waitForTimeout(250)
      const metrics = Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.filter(m => ['Documents', 'Nodes', 'JSEventListeners', 'JSHeapUsedSize'].includes(m.name)).map(m => [m.name, m.value]))
      return { cycle, metrics, ...(await page.evaluate(() => ({ visible_nodes: document.querySelectorAll('*').length, canvases: document.querySelectorAll('.scene-stage canvas').length, maps: document.querySelectorAll('.map-stage.leaflet-container').length }))) }
    }
    const result = { mode, errors, samples: [await sample(0)] }; report.modes.push(result)
    for (let cycle = 1; cycle <= 10; cycle++) {
      await page.getByRole('button', { name: 'Guide & sources', exact: true }).click(); await page.getByRole('button', { name: 'Simulation', exact: true }).click()
      if (cycle % 5 === 0) { result.samples.push(await sample(cycle)); write() }
    }
    await page.getByRole('button', { name: 'Guide & sources', exact: true }).click()
    result.unmounted = await sample('guide-unmounted')
    const first = result.samples[0], last = result.samples.at(-1)
    result.delta = Object.fromEntries(Object.keys(first.metrics).map(key => [key, last.metrics[key] - first.metrics[key]]))
    if (mode === 'both') {
      const file = path.join(__dirname, `${suffix}-guide-unmounted.heapsnapshot`), chunks = []
      cdp.on('HeapProfiler.addHeapSnapshotChunk', ({ chunk }) => chunks.push(chunk))
      await cdp.send('HeapProfiler.enable'); await cdp.send('HeapProfiler.takeHeapSnapshot', { reportProgress: false })
      fs.writeFileSync(file, chunks.join(''))
      result.heap_snapshot = { path: file, bytes: fs.statSync(file).size, state: 'Guide tab; zero application canvas/map DOM; one completed result remains intentionally in Workspace state' }
    }
    write(); await browser.close(); browser = null
  }
  report.finished = new Date().toISOString(); write()
})().catch(async error => { report.fatal = error.stack; write(); await browser?.close(); process.exitCode = 1 })
