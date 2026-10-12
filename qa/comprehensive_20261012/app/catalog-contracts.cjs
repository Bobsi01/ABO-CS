const fs = require('node:fs'), path = require('node:path')
const { chromium } = require('../../browser/playwright-runtime.cjs')
const base = process.env.ABO_QA_URL || 'http://127.0.0.1:8012', suffix = process.env.ABO_QA_SUFFIX || 'baseline'
;(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true })
  const context = await browser.newContext()
  const catalog = await (await context.request.get(`${base}/api/catalog`)).json()
  const report = { started: new Date().toISOString(), base, fixtures: [] }
  const cases = [
    { name: 'historical-blocked-inputs-string', edit: value => { value.historical.blocked_inputs = 'unexpected string' }, tab: 'Taal 2020' },
    { name: 'historical-null-reference-table', edit: value => { value.historical.reference_tables = [null] }, tab: 'Taal 2020' },
    { name: 'parameter-evidence-object-value', edit: value => { value.parameter_evidence[0].value = { unknown: 1 } }, tab: 'Guide & sources', disclosure: 'Parameter evidence register' },
  ]
  for (const fixture of cases) {
    const page = await context.newPage(), value = structuredClone(catalog), errors = []
    fixture.edit(value)
    page.on('pageerror', error => errors.push(error.message))
    await page.route('**/api/catalog', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(value) }))
    await page.goto(base)
    await page.waitForTimeout(200)
    let rejected = await page.locator('.error-message').count() > 0
    if (!rejected) {
      await page.getByRole('button', { name: fixture.tab, exact: true }).click()
      if (fixture.disclosure && await page.locator('.application').count()) await page.getByText(fixture.disclosure, { exact: true }).click()
      await page.waitForTimeout(200)
    }
    const evidence = { name: fixture.name, rejected, application_count: await page.locator('.application').count(), errors, error_text: await page.locator('.error-message').allTextContents() }
    report.fixtures.push(evidence)
    await page.screenshot({ path: path.join(__dirname, `${suffix}-${fixture.name}.png`), fullPage: true })
    await page.close()
  }
  const historical = await (await context.request.post(`${base}/api/replications/taal-2020`, { data: {} })).json()
  for (const field of ['spatial_group', 'dependency_group']) {
    const page = await context.newPage(), errors = [], value = structuredClone(historical)
    value.observation_results = [{ observation_id: 'Synthetic malformed response fixture', spatial_group: 'synthetic', dependency_group: 'synthetic', split: 'evaluation', lat: 14, lon: 121, lower_mm: 0, upper_mm: 1, in_domain: true, predicted_mm: 0.5, interval_residual_mm: 0, midpoint_residual_mm: 0, reason: 'QA fixture, not scientific evidence', [field]: { invalid: 'object' } }]
    page.on('pageerror', error => errors.push(error.message))
    await page.route('**/api/replications/taal-2020', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(value) }))
    await page.goto(base); await page.getByRole('button', { name: 'Taal 2020', exact: true }).click()
    await page.getByRole('button', { name: 'Check historical reference', exact: true }).click()
    await page.waitForTimeout(250)
    report.fixtures.push({ name: `observation-${field}-object`, rejected: await page.locator('.error-message').count() > 0, application_count: await page.locator('.application').count(), errors, error_text: await page.locator('.error-message').allTextContents() })
    await page.screenshot({ path: path.join(__dirname, `${suffix}-observation-${field}-object.png`), fullPage: true })
    await page.close()
  }
  report.finished = new Date().toISOString()
  fs.writeFileSync(path.join(__dirname, `${suffix}-catalog-contracts.json`), JSON.stringify(report, null, 2))
  await browser.close()
})().catch(error => { console.error(error); process.exitCode = 1 })
