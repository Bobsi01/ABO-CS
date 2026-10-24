const { chromium } = require('../../browser/playwright-runtime.cjs')
const fs = require('node:fs')
;
(async () => {

  const b = await chromium.launch({ headless: true })
  const p = await b.newPage({ viewport: { width: 1920, height: 1080 } })
  const results = { errors: [], cases: [] }

  p.on('pageerror', (e) => results.errors.push(e.message))
  await p.goto('http://127.0.0.1:8000/')
  await p.getByRole('img', { name: /Deposit distribution/ }).waitFor({ timeout: 90000 })
  const dimensions = () =>
    p.evaluate(() => ({
      w: innerWidth,
      h: innerHeight,
      sw: document.documentElement.scrollWidth,
      sh: document.documentElement.scrollHeight,
      canvases: document.querySelectorAll('canvas').length,
    }))

  for (const [w, h] of [
    [1920, 1080],
    [1440, 900],
    [1366, 768],
    [320, 800],
  ]) {
    await p.setViewportSize({ width: w, height: h })
    results.cases.push({ viewport: [w, h], ...(await dimensions()) })
    if (w === 320 || w === 1366)
      await p.screenshot({ path: 'output/playwright/dashboard-independent-' + w + '.png' })
  }
  await p.setViewportSize({ width: 1920, height: 1080 })
  await p.getByRole('button', { name: /Talisay, Batangas,/ }).click()
  results.cases.push({ selection: await p.locator('.chart-reading').innerText() })
  await p.getByRole('button', { name: 'View raw data' }).click()
  await p.getByLabel('Search location').fill('Laurel')
  results.cases.push({
    filteredRows: await p.locator('.data-scroll tbody tr').count(),
    row: await p.locator('.data-scroll tbody').innerText(),
  })
  const down = p.waitForEvent('download')

  await p.getByRole('button', { name: 'Export CSV', exact: true }).click()
  const d = await down

  results.cases.push({ csv: fs.readFileSync(await d.path(), 'utf8') })
  await p.getByRole('button', { name: 'Event snapshots', exact: true }).click()
  results.cases.push({
    snapshotsHeader: await p.locator('.dialog-heading').innerText(),
    snapshotRows: await p.locator('.data-scroll tbody tr').count(),
    first: await p.locator('.data-scroll tbody tr').first().innerText(),
    last: await p.locator('.data-scroll tbody tr').last().innerText(),
  })
  await p.keyboard.press('Escape')
  results.cases.push({
    modalClosed: await p.locator('dialog').evaluate((e) => !e.open),
    focus: await p.evaluate(() => document.activeElement.textContent),
  })
  await p.getByRole('button', { name: 'Dark theme', exact: true }).click()
  await p.screenshot({ path: 'output/playwright/dashboard-independent-dark-1080p.png' })
  results.cases.push({ dark: await dimensions() })
  await p.locator('.dashboard-actions select').selectOption('mayon-teaching')
  await p.getByRole('img', { name: /Deposit distribution/ }).waitFor({ timeout: 90000 })
  results.cases.push({
    preset: await p.locator('.dashboard-actions select').inputValue(),
    context: await p.locator('.dashboard-context').innerText(),
  })
  fs.writeFileSync(
    'qa/current_review/dashboard_independent_20261017/browser.json',
    JSON.stringify(results, null, 2),
  )
  console.log(JSON.stringify(results, null, 2))
  await b.close()

})().catch((e) => {

  console.error(e)
  process.exit(1)

})
