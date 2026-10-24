const { chromium } = require('../../browser/playwright-runtime.cjs')
const fs = require('fs')
;
(async () => {

  const b = await chromium.launch({ headless: true })
  const p = await b.newPage({ viewport: { width: 1920, height: 1080 } })

  await p.goto('http://127.0.0.1:8000/')
  await p.getByRole('img', { name: /Deposit distribution/ }).waitFor({ timeout: 90000 })
  const out = []

  await p.route('**/api/simulations', (r) =>
    r.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ detail: 'Independent QA injected unavailable backend' }),
    }),
  )
  await p.locator('.dashboard-actions select').selectOption('mayon-teaching')
  await p.getByRole('alert').waitFor()
  out.push({
    failure: await p.getByRole('alert').innerText(),
    charts: await p.getByRole('img', { name: /Deposit distribution/ }).count(),
    rawDisabled: await p.getByRole('button', { name: 'View raw data' }).isDisabled(),
  })
  await p.unroute('**/api/simulations')
  await p.getByRole('button', { name: 'Retry preset' }).click()
  await p.getByRole('img', { name: /Deposit distribution/ }).waitFor({ timeout: 90000 })
  out.push({ recovered: await p.locator('.dashboard-context').innerText() })
  await p.locator('.dashboard-actions select').selectOption('taal-regional')
  await p.getByRole('img', { name: /Deposit distribution/ }).waitFor()
  await p.getByRole('button', { name: 'View raw data' }).click()
  await p.setViewportSize({ width: 320, height: 800 })
  await p.screenshot({ path: 'output/playwright/dashboard-independent-modal-320.png' })
  out.push({
    mobileModal: await p.locator('dialog').evaluate((e) => ({
      left: e.getBoundingClientRect().left,
      right: e.getBoundingClientRect().right,
      width: innerWidth,
      scrollWidth: e.scrollWidth,
      clientWidth: e.clientWidth,
    })),
  })
  await p.keyboard.press('Escape')
  await p.setViewportSize({ width: 1920, height: 1080 })
  await p.getByRole('button', { name: 'Simulation', exact: true }).click()
  await p.getByRole('button', { name: 'Run simulation', exact: true }).click()
  await p.getByRole('slider', { name: 'Eruption timeline' }).waitFor({ timeout: 90000 })
  out.push({
    spatial: await p
      .locator('.scene-stage,.map-stage')
      .evaluateAll((es) => es.map((e) => ({ rect: e.getBoundingClientRect().toJSON() }))),
  })
  await p.getByRole('button', { name: 'Dashboard', exact: true }).click()
  out.push({ dashboardCanvasAfterReturn: await p.locator('canvas').count() })
  fs.writeFileSync(
    'qa/current_review/dashboard_independent_20261017/resilience.json',
    JSON.stringify(out, null, 2),
  )
  console.log(JSON.stringify(out, null, 2))
  await b.close()

})().catch((e) => {

  console.error(e)
  process.exit(1)

})
