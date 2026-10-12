const fs = require('node:fs')
const path = require('node:path')
const assert = require('node:assert/strict')
const { chromium } = require('../../browser/playwright-runtime.cjs')
const base = process.env.ABO_QA_URL || 'http://127.0.0.1:8012'
const suffix = process.env.ABO_QA_SUFFIX || 'baseline'
const out = __dirname
const report = { started: new Date().toISOString(), base, mode: 'Headless installed Chrome functional and visual checks; no foreground GPU-performance or screen-reader certification', checks: [], findings: [], pageErrors: [] }
let browser, page, simulation, sequence, catalog
const save = () => fs.writeFileSync(path.join(out, `${suffix}-report.json`), JSON.stringify(report, null, 2))
const shot = async name => page.screenshot({ path: path.join(out, `${suffix}-${name}.png`), fullPage: true })
async function check(name, action) {
  const start = Date.now()
  try { const evidence = await action(); report.checks.push({ name, passed: true, duration_ms: Date.now() - start, evidence }) }
  catch (error) { report.checks.push({ name, passed: false, duration_ms: Date.now() - start, error: String(error.stack) }); await shot(`failure-${report.checks.length}`).catch(() => {}) }
  save()
}
async function run() {
  await page.getByRole('button', { name: 'Run simulation', exact: true }).click()
  await page.getByRole('button', { name: 'Play sequence', exact: true }).waitFor({ timeout: 120000 })
  await page.getByRole('button', { name: 'Run simulation', exact: true }).waitFor({ state: 'visible' })
  await page.waitForFunction(() => !document.querySelector('.status-line')?.textContent.includes('Computing'))
}
async function choose(name, option) {
  await page.getByRole('combobox', { name: new RegExp(`^${name}`) }).click()
  await page.getByRole('option', { name: option, exact: true }).click()
}
async function download(name, filename) {
  const waiting = page.waitForEvent('download')
  await page.getByRole('button', { name, exact: true }).click()
  const file = await waiting
  await file.saveAs(path.join(out, `${suffix}-${filename}`))
  return fs.readFileSync(await file.path(), 'utf8')
}
async function boot() {
  await page.goto(base)
  await page.getByRole('button', { name: 'Run simulation', exact: true }).waitFor()
}
;(async () => {
  browser = await chromium.launch({ channel: 'chrome', headless: true })
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true })
  report.browser = browser.version()
  page = await context.newPage()
  page.on('pageerror', error => { report.pageErrors.push({ time: new Date().toISOString(), message: error.message }); save() })
  page.on('response', async response => {
    if (response.status() !== 200) return
    try {
      if (response.url().endsWith('/api/simulations')) simulation = await response.json()
      if (response.url().endsWith('/api/eruption-sequences')) sequence = await response.json()
      if (response.url().endsWith('/api/catalog')) catalog = await response.json()
    } catch {}
  })
  await boot()
  report.assets = await page.locator('script[src]').evaluateAll(nodes => nodes.map(node => node.src))
  await check('Normal default Taal run traces same submitted context through grid and sequence', async () => {
    const requests = []
    const observe = request => { if (request.method() === 'POST' && /\/api\/(simulations|eruption-sequences)$/.test(request.url())) requests.push({ path: new URL(request.url()).pathname, body: request.postDataJSON() }) }
    page.on('request', observe)
    await run()
    page.off('request', observe)
    assert.equal(sequence.scenario.volcano_id, 'taal')
    assert.deepEqual(requests[1].body.simulation, requests[0].body)
    assert.deepEqual(sequence.scenario, simulation.scenario)
    assert.equal(await page.getByRole('button', { name: 'Pause sequence', exact: true }).count(), 0)
    await shot('taal-before-light')
    return { requests, summary: simulation.summary, lava: sequence.lava.enabled, frame_count: sequence.frames.length }
  })
  const defaultSimulation = structuredClone(simulation), defaultSequence = structuredClone(sequence)
  await check('Stage seeks and keyboard timeline select computed map snapshots', async () => {
    await page.getByRole('button', { name: 'During', exact: true }).click()
    const during = await page.locator('.map-status').first().innerText()
    await shot('taal-during-light')
    await page.getByRole('button', { name: 'After', exact: true }).click()
    const after = await page.locator('.map-status').first().innerText()
    const slider = page.getByRole('slider', { name: 'Eruption timeline' })
    await slider.focus(); await slider.press('End')
    assert.equal(await slider.inputValue(), String(defaultSequence.frames.length - 1))
    const last = defaultSequence.frames.at(-1)
    const reported = last.receptors.filter(row => row.kind === 'municipality' && row.reported).length
    assert.match(await page.locator('.map-status').first().innerText(), new RegExp(`${reported} municipal`))
    return { during, after, final: await slider.getAttribute('aria-valuetext'), computed_reported: reported }
  })
  await check('Keyboard selector, location inspector and CSV agree with final Python point samples', async () => {
    const control = page.getByRole('combobox', { name: /^Inspect location/ })
    await control.focus(); await control.press('Home'); await control.press('Enter')
    const chosen = await page.locator('.impact-detail').innerText()
    assert.match(chosen, /Ground load/)
    await page.getByText('Location table & exports', { exact: true }).click()
    const csv = await download('Final CSV', 'default.csv')
    assert.equal(csv.split('\r\n').length - 1, defaultSimulation.receptors.length)
    const row = defaultSimulation.receptors.find(r => r.name === 'Agoncillo')
    if (row) assert(csv.includes(`"${row.thickness_mm}"`))
    const exported = JSON.parse(await download('Scenario JSON', 'default-scenario.json'))
    assert.deepEqual(exported.scenario, defaultSimulation.scenario)
    await control.focus(); await control.press('ArrowDown'); await control.press('End'); await control.press('Escape')
    assert.equal(await control.getAttribute('aria-expanded'), 'false')
    return { inspector: chosen, exported_population: exported.population_year, rows: defaultSimulation.receptors.length }
  })
  await check('Stale edits and failed run preserve completed views and downloadable scenario', async () => {
    await page.getByLabel('Wind speed (m/s)', { exact: true }).fill('20')
    assert.match(await page.locator('.stale-message').innerText(), /last completed/)
    assert.match(await page.locator('.scene-caption').innerText(), /10 m\/s/)
    await page.route('**/api/simulations', route => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ detail: 'Synthetic QA unavailable calculation. Retry.' }) }))
    await page.getByRole('button', { name: 'Run simulation', exact: true }).click()
    await page.getByRole('alert').filter({ hasText: 'Synthetic QA' }).waitFor()
    const exported = JSON.parse(await download('Scenario JSON', 'failed-stale-scenario.json'))
    assert.equal(exported.scenario.wind_speed_m_s, 10)
    await page.unroute('**/api/simulations')
    await page.getByLabel('Wind speed (m/s)', { exact: true }).fill('10')
    await run()
    return { exported_wind: exported.scenario.wind_speed_m_s, recovery_error_count: await page.locator('.error-message').count() }
  })
  await check('Native input failure opens hidden invalid field and focuses it', async () => {
    await page.getByText('Dispersion & density', { exact: true }).click()
    const input = page.getByLabel('Bulk deposit density (kg/m³)', { exact: true })
    await input.fill('0')
    await page.getByText('Dispersion & density', { exact: true }).click()
    await page.getByRole('button', { name: 'Run simulation', exact: true }).click()
    assert.match(await page.locator('.error-message').innerText(), /Bulk deposit density/)
    assert.equal(await input.evaluate(node => document.activeElement === node), true)
    await input.fill('1000')
    return { focus: 'Bulk deposit density', error: await page.locator('.error-message').innerText() }
  })
  await check('Comparison error then valid manual winds remain quantitative and inspectable', async () => {
    await page.getByRole('button', { name: 'Wind comparison', exact: true }).click()
    await page.getByRole('button', { name: 'Compute wind comparison', exact: true }).click()
    assert.match(await page.locator('.error-message').innerText(), /Enter both manual wind profiles/)
    const boxes = page.locator('.manual-winds input')
    await boxes.nth(0).fill('10'); await boxes.nth(1).fill('45'); await boxes.nth(2).fill('15'); await boxes.nth(3).fill('225')
    await page.getByRole('button', { name: 'Compute wind comparison', exact: true }).click()
    await page.locator('.comparison-result').nth(1).waitFor({ timeout: 120000 })
    const descriptions = await page.locator('.comparison-result').allTextContents()
    await page.getByRole('button', { name: 'Inspect this wind result', exact: true }).first().click()
    assert.equal(await page.getByRole('slider', { name: 'Eruption timeline' }).count(), 0)
    assert.match(await page.locator('.scene-caption').innerText(), /45°/)
    return { descriptions, inspected_caption: await page.locator('.scene-caption').innerText() }
  })
  await check('Sweep handles bounded resource response and enables direction reuse when available', async () => {
    await page.getByRole('button', { name: 'Wind sweep', exact: true }).click()
    await page.getByRole('button', { name: 'Evaluate all wind directions', exact: true }).click()
    await page.waitForFunction(() => !document.querySelector('.status-line')?.textContent.includes('Evaluating'), { timeout: 120000 })
    const error = await page.locator('.error-message').allTextContents()
    const buttons = page.getByRole('button', { name: 'Use this direction', exact: true })
    if (!await buttons.count()) { report.findings.push({ severity: 'P1', title: 'Default bundled wind sweep rejects resource estimate', evidence: error }); throw new Error(`No sweep outcomes: ${error.join(' ')}`) }
    await buttons.first().click()
    return { rows: await buttons.count(), selected_tab: await page.locator('.view-tabs [aria-current]').innerText() }
  })
  await check('Historical blocked science retains derived traces and structured exports', async () => {
    await page.getByRole('button', { name: 'Taal 2020', exact: true }).click()
    await page.getByRole('button', { name: 'Check historical reference', exact: true }).click()
    await page.getByText('Derived reference contours & digitization uncertainty', { exact: true }).waitFor({ timeout: 30000 })
    const text = await page.locator('.historical-evaluation').innerText()
    assert.match(text, /Empirical evaluation remains source blocked/)
    assert.equal(await page.getByRole('button', { name: 'Inspect historical result', exact: true }).count(), 0)
    await page.getByText('Derived reference contours & digitization uncertainty', { exact: true }).click()
    assert.equal(await page.getByRole('button', { name: 'Trace GeoJSON', exact: true }).count(), 2)
    const exported = JSON.parse(await download('Evaluation JSON', 'historical-evaluation.json'))
    assert.equal(exported.available, false)
    await shot('historical-light')
    return { status: exported.validation_status, metrics: exported.metrics, svg_paths: await page.locator('.historical-reference-map svg path').count() }
  })
  await check('Mayon lava real workflow, effect switch, scene/camera controls and final timeline', async () => {
    await page.getByRole('button', { name: 'Simulation', exact: true }).click()
    await choose('Scenario', 'Mayon · teaching scenario')
    await run()
    assert.equal(sequence.lava.enabled, true)
    assert(sequence.lava.path.length > 1)
    await page.getByRole('button', { name: 'During', exact: true }).click()
    await choose('Map effect', 'Lava channel · teaching model')
    await page.getByRole('button', { name: 'Channel extent', exact: true }).click()
    await page.getByRole('button', { name: 'Reset map to volcano region', exact: true }).click()
    await choose('Camera view', 'Regional overview')
    await page.getByRole('button', { name: 'Reset camera', exact: true }).click()
    await choose('Camera view', 'Volcano close-up')
    await shot('mayon-lava-light')
    await page.getByRole('slider', { name: 'Eruption timeline' }).press('End')
    return { path_points: sequence.lava.path.length, stop_reason: sequence.lava.stop_reason, caption: await page.locator('.map-status').first().innerText() }
  })
  await check('Replay pauses on draft edit and actual reduced-motion preference transition', async () => {
    await page.getByRole('button', { name: 'Before', exact: true }).click()
    await page.getByRole('button', { name: 'Play sequence', exact: true }).click()
    await page.getByRole('button', { name: 'Pause sequence', exact: true }).waitFor()
    await page.getByLabel('Wind speed (m/s)', { exact: true }).fill('11')
    assert.equal(await page.getByRole('button', { name: 'Pause sequence', exact: true }).count(), 0)
    await page.getByRole('button', { name: 'Play sequence', exact: true }).click()
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.getByRole('button', { name: 'Play sequence', exact: true }).waitFor()
    const value = await page.getByRole('slider', { name: 'Eruption timeline' }).inputValue()
    await page.waitForTimeout(500)
    assert.equal(await page.getByRole('slider', { name: 'Eruption timeline' }).inputValue(), value)
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    return { reduced_motion_pause_value: value }
  })
  await check('320 px reflow in both themes with keyboard selection and eventual table', async () => {
    await page.setViewportSize({ width: 320, height: 900 })
    for (const theme of ['light', 'dark']) {
      if (theme === 'dark') await page.getByRole('button', { name: 'Dark theme', exact: true }).click()
      await page.getByText('Location table & exports', { exact: true }).click()
      const dimensions = await page.evaluate(() => ({ innerWidth, client: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth, body: document.body.scrollWidth }))
      assert(dimensions.scroll <= dimensions.innerWidth, JSON.stringify(dimensions))
      report.checks.push({ name: `320 px ${theme} dimensions`, passed: true, evidence: dimensions })
      await shot(`320-${theme}`)
      await page.getByText('Location table & exports', { exact: true }).click()
    }
    const cam = page.getByRole('combobox', { name: /^Camera view/ })
    await cam.focus(); await cam.press('End'); await cam.press('Enter')
    assert.match(await cam.innerText(), /Regional overview/)
    await page.setViewportSize({ width: 1440, height: 1000 })
    await page.getByRole('button', { name: 'Light theme', exact: true }).click()
    return { keyboard: 'End/Enter picks camera at 320 px' }
  })
  await check('Repeated scene/map unmount and remount keep one canvas and map', async () => {
    const errorsBefore = report.pageErrors.length
    for (let i = 0; i < 8; i++) {
      await page.getByRole('button', { name: 'Guide & sources', exact: true }).click()
      assert.equal(await page.locator('.scene-stage canvas').count(), 0)
      await page.getByRole('button', { name: 'Simulation', exact: true }).click()
      await page.locator('.scene-stage canvas').waitFor()
      assert.equal(await page.locator('.scene-stage canvas').count(), 1)
      assert.equal(await page.locator('.map-stage.leaflet-container').count(), 1)
    }
    assert.equal(report.pageErrors.length, errorsBefore)
    return { cycles: 8, errors_added: report.pageErrors.length - errorsBefore, note: 'DOM cleanup only; not retained GPU object or 30-minute soak proof' }
  })
  await check('WebGL context loss pauses and preserves map, stage slider and exports', async () => {
    await page.getByRole('button', { name: 'Before', exact: true }).click()
    await page.getByRole('button', { name: 'Play sequence', exact: true }).click()
    await page.locator('.scene-stage canvas').evaluate(node => node.dispatchEvent(new Event('webglcontextlost', { cancelable: true })))
    await page.getByText('3D needs WebGL 2', { exact: true }).waitFor()
    assert.equal(await page.getByRole('button', { name: 'Pause sequence', exact: true }).count(), 0)
    await page.getByRole('slider', { name: 'Eruption timeline' }).press('End')
    await page.getByText('Location table & exports', { exact: true }).click()
    const exported = JSON.parse(await download('Scenario JSON', 'context-loss-scenario.json'))
    assert.equal(exported.scenario.volcano_id, 'mayon')
    await page.getByRole('button', { name: 'Retry 3D', exact: true }).click()
    await page.locator('.scene-stage canvas').waitFor()
    return { export_preserved: exported.scenario.volcano_id, recovered_canvas: await page.locator('.scene-stage canvas').count(), note: 'Synthetic context-loss event, not native GPU reset' }
  })
  await check('Catalog network failure and retry recover', async () => {
    await page.route('**/api/catalog', route => route.abort())
    await page.reload()
    await page.locator('.error-message').waitFor()
    assert.match(await page.locator('.error-message').innerText(), /Start.*Python|Start ABO/)
    await page.unroute('**/api/catalog')
    await page.getByRole('button', { name: 'Retry catalog connection', exact: true }).click()
    await page.getByRole('button', { name: 'Run simulation', exact: true }).waitFor()
    return { recovered: true }
  })
  await check('Malformed grid response is rejected with retained completed results', async () => {
    await run()
    const invalid = structuredClone(defaultSimulation); invalid.grid.thickness_mm[0] = [123]
    await page.route('**/api/simulations', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(invalid) }))
    await page.getByRole('button', { name: 'Run simulation', exact: true }).click()
    await page.getByRole('alert').filter({ hasText: 'Unexpected Python response' }).waitFor()
    assert.equal(await page.getByRole('slider', { name: 'Eruption timeline' }).count(), 1)
    await page.unroute('**/api/simulations')
    return { retained_sequence: true }
  })
  await check('Malformed catalog criteria is rejected before rendering results', async () => {
    const invalid = structuredClone(catalog); invalid.criteria = null
    await page.route('**/api/catalog', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(invalid) }))
    await page.reload()
    if (await page.locator('.error-message').count()) {
      assert.match(await page.locator('.error-message').innerText(), /Unexpected Python response/)
      await page.unroute('**/api/catalog'); return { rejected: true }
    }
    await page.getByRole('button', { name: 'Run simulation', exact: true }).waitFor()
    const before = report.pageErrors.length
    await page.getByRole('button', { name: 'Run simulation', exact: true }).click()
    await page.waitForTimeout(7000)
    const evidence = { errors: report.pageErrors.slice(before), application_count: await page.locator('.application').count(), body_text: await page.locator('body').innerText() }
    await shot('malformed-catalog')
    await page.unroute('**/api/catalog')
    if (!evidence.application_count || evidence.errors.length) report.findings.push({ severity: 'P2', title: 'Catalog criteria omitted from runtime validator causes entire workspace crash', evidence })
    assert.equal(evidence.errors.length, 0, JSON.stringify(evidence))
    assert.equal(evidence.application_count, 1)
    return evidence
  })
  report.finished = new Date().toISOString(); save()
  await browser.close()
})().catch(async error => { report.fatal = String(error.stack); save(); await browser?.close(); process.exitCode = 1 })
