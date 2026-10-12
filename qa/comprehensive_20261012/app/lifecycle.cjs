const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict')
const { chromium } = require('../../browser/playwright-runtime.cjs')
const base = process.env.ABO_QA_URL || 'http://127.0.0.1:8012', suffix = process.env.ABO_QA_SUFFIX || 'final'
const report = { started: new Date().toISOString(), base, errors: [], scope: 'One headed actual-tab-visibility check, then 20 headless run/view cycles with forced-GC JS heap/DOM/listener metrics and instrumented paused WebGL draw calls; no foreground FPS/30-minute/full-GPU certification' }
const write = () => fs.writeFileSync(path.join(__dirname, `${suffix}-lifecycle.json`), JSON.stringify(report, null, 2))
let browser, page
async function boot(context) {
  page = await context.newPage()
  page.on('pageerror', error => report.errors.push(error.message))
  await page.goto(`${base}/?qa=1`)
  await page.getByRole('button', { name: 'Run simulation', exact: true }).waitFor()
}
async function run() {
  await page.getByRole('button', { name: 'Run simulation', exact: true }).click()
  await page.waitForFunction(() => document.querySelector('.eruption-timeline') && !document.querySelector('.status-line')?.textContent.includes('Computing'), null, { timeout: 120000 })
}
;(async () => {
  browser = await chromium.launch({ channel: 'chrome', headless: false })
  const visibleContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
  await boot(visibleContext); await run()
  report.assets = await page.locator('script[src]').evaluateAll(nodes => nodes.map(node => node.src))
  await page.evaluate(() => { window.__aboVisibility = []; document.addEventListener('visibilitychange', () => window.__aboVisibility.push({ state: document.visibilityState, hidden: document.hidden, playing: [...document.querySelectorAll('button')].some(node => node.textContent.includes('Pause sequence')), time: performance.now() })) })
  await page.getByRole('button', { name: 'Before', exact: true }).click()
  await page.getByRole('button', { name: 'Play sequence', exact: true }).click()
  await page.getByRole('button', { name: 'Pause sequence', exact: true }).waitFor()
  await page.waitForTimeout(1100)
  const second = await visibleContext.newPage(); await second.goto('about:blank'); await second.bringToFront(); await second.waitForTimeout(700)
  const hiddenEvidence = await page.evaluate(() => ({ events: window.__aboVisibility, hidden: document.hidden, slider: document.querySelector('input[type=range]')?.value, playing: [...document.querySelectorAll('button')].some(node => node.textContent.includes('Pause sequence')) }))
  await page.bringToFront(); await page.waitForTimeout(200)
  const resumedEvidence = await page.evaluate(() => ({ events: window.__aboVisibility, hidden: document.hidden, slider: document.querySelector('input[type=range]')?.value, playing: [...document.querySelectorAll('button')].some(node => node.textContent.includes('Pause sequence')) }))
  report.visibility = { mode: 'headed installed Chrome, native tab foreground change', hiddenEvidence, resumedEvidence, observed_hidden_transition: hiddenEvidence.events.some(event => event.hidden), paused: !hiddenEvidence.playing && !resumedEvidence.playing }
  if (report.visibility.observed_hidden_transition) assert(report.visibility.paused)
  await page.screenshot({ path: path.join(__dirname, `${suffix}-headed-visibility.png`) })
  await browser.close(); write()
  browser = await chromium.launch({ channel: 'chrome', headless: true })
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
  await context.addInitScript(() => {
    window.__aboDraws = 0
    for (const type of [WebGLRenderingContext, WebGL2RenderingContext]) for (const method of ['drawArrays', 'drawElements', 'drawArraysInstanced', 'drawElementsInstanced']) {
      if (!Object.hasOwn(type.prototype, method)) continue
      const original = type.prototype[method]
      type.prototype[method] = function (...args) { window.__aboDraws++; return original.apply(this, args) }
    }
  })
  await boot(context); await run(); await page.waitForTimeout(500)
  const cdp = await context.newCDPSession(page)
  await cdp.send('Performance.enable')
  async function sample(cycle) {
    await cdp.send('HeapProfiler.collectGarbage'); await page.waitForTimeout(150)
    const all = (await cdp.send('Performance.getMetrics')).metrics
    const metrics = Object.fromEntries(all.filter(metric => ['JSHeapUsedSize', 'JSHeapTotalSize', 'Documents', 'Nodes', 'JSEventListeners'].includes(metric.name)).map(metric => [metric.name, metric.value]))
    const draws = await page.evaluate(() => window.__aboDraws)
    await page.waitForTimeout(400)
    const paused = await page.evaluate(() => ({ visible_nodes: document.querySelectorAll('*').length, canvas_count: document.querySelectorAll('.scene-stage canvas').length, map_count: document.querySelectorAll('.map-stage.leaflet-container').length, playing: [...document.querySelectorAll('button')].some(node => node.textContent.includes('Pause sequence')), draws: window.__aboDraws }))
    assert.equal(paused.playing, false); assert.equal(paused.canvas_count, 1); assert.equal(paused.map_count, 1)
    return { cycle, metrics, ...paused, paused_draw_calls_400ms: paused.draws - draws }
  }
  report.cleanup = { mode: 'headless installed Chrome', samples: [await sample(0)] }
  for (let cycle = 1; cycle <= 20; cycle++) {
    await run()
    await page.getByRole('button', { name: 'Guide & sources', exact: true }).click()
    assert.equal(await page.locator('.scene-stage canvas').count(), 0)
    await page.getByRole('button', { name: 'Simulation', exact: true }).click()
    await page.locator('.scene-stage canvas').waitFor()
    await page.waitForTimeout(250)
    if (cycle % 5 === 0) { report.cleanup.samples.push(await sample(cycle)); write() }
  }
  const first = report.cleanup.samples[0], last = report.cleanup.samples.at(-1)
  report.cleanup.delta = Object.fromEntries(Object.keys(first.metrics).map(key => [key, last.metrics[key] - first.metrics[key]]))
  report.cleanup.visible_nodes_delta = last.visible_nodes - first.visible_nodes
  report.cleanup.all_paused_draw_samples_zero = report.cleanup.samples.every(sample => sample.paused_draw_calls_400ms === 0)
  report.finished = new Date().toISOString(); write(); await browser.close()
})().catch(async error => { report.fatal = error.stack; write(); await browser?.close(); process.exitCode = 1 })
