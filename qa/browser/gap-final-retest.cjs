// Orchestrator rerun of the independent evaluator's saved browser cases.
// Script authorship is independent; this execution is not a new independent review.
const fs = require('fs')
const path = require('path')
const { chromium } = require('./playwright-runtime.cjs')
const output = path.join(__dirname, 'gap-final-retest.json')
const evidence = { executor: 'orchestrator', started: new Date().toISOString(), cases: [], errors: [], requests: [] }
const save = () => fs.writeFileSync(output, JSON.stringify(evidence, null, 2))
let browser
;(async () => {
  browser = await chromium.launch({ channel: 'chrome', headless: false })
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'no-preference' })
  const page = await context.newPage()
  page.on('request', request => { if (request.method() === 'POST' && /\/api\/(simulations|eruption-sequences)$/.test(request.url())) evidence.requests.push(request.postDataJSON()) })
  await page.goto('http://127.0.0.1:8000/')
  await page.getByRole('button', { name: 'Run simulation', exact: true }).click()
  await page.getByRole('button', { name: 'Play sequence', exact: true }).waitFor({ timeout: 120000 })
  for (const file of ['browser-failure-motion.js', 'browser-denial-terrain.js', 'browser-accessibility-layout.js']) {
    const source = fs.readFileSync(path.join(__dirname, '../gap_closure', file), 'utf8').replaceAll('qa/gap_closure/browser-', 'qa/browser/gap-final-')
    const run = eval(`(${source})`)
    const result = await run(page)
    evidence.cases.push({ source: file, ...result })
    save()
    if (result.failure) throw new Error(`${file}: ${result.failure}`)
  }
  await page.getByText('Screening & population', { exact: true }).click()
  await page.getByRole('combobox', { name: /^Population year/ }).click()
  await page.getByRole('option', { name: '2020 · historical reporting', exact: true }).click()
  const completedResponse = page.waitForResponse(response => response.url().endsWith('/api/eruption-sequences') && response.request().postDataJSON()?.simulation?.population_year === 2020)
  await page.getByRole('button', { name: 'Run simulation', exact: true }).click()
  await completedResponse
  await page.getByRole('button', { name: 'Cancel calculation', exact: true }).waitFor({ state: 'hidden', timeout: 120000 })
  await page.getByRole('combobox', { name: /^Population year/ }).click()
  await page.getByRole('option', { name: '2024 · current scenarios', exact: true }).click()
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Scenario JSON', exact: true }).click()
  const download = await downloadPromise
  const scenarioPath = path.join(__dirname, 'gap-final-completed-scenario.json')
  await download.saveAs(scenarioPath)
  const exported = JSON.parse(fs.readFileSync(scenarioPath, 'utf8'))
  if (exported.population_year !== 2020 || !exported.screening_context) throw new Error('Export inherited an unsent census edit or omitted screening context')
  evidence.cases.push({ source: 'orchestrator export test', pass: true, completed_population_year: exported.population_year, unsent_population_year: 2024, screening_context: exported.screening_context })
  evidence.assets = await page.locator('script[src]').evaluateAll(nodes => nodes.map(node => node.src))
  evidence.finished = new Date().toISOString()
  evidence.completed = true
  save()
  await browser.close()
})().catch(async error => { evidence.errors.push(error.stack); evidence.completed = false; save(); await browser?.close(); process.stderr.write(error.stack + '\n'); process.exitCode = 1 })
