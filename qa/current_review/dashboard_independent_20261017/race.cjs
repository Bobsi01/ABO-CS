const { chromium } = require('../../browser/playwright-runtime.cjs')
const fs = require('fs')
;
(async () => {

  let b = await chromium.launch({ headless: true })
  let p = await b.newPage()

  await p.goto('http://127.0.0.1:8000/')
  await p.getByRole('img', { name: /Deposit distribution/ }).waitFor({ timeout: 90000 })
  await p.route('**/api/simulations', async (r) => {

    let body = r.request().postDataJSON()

    if (body.scenario.volcano_id === 'taal') {
      await new Promise((resolve) => setTimeout(resolve, 500))
    }
    try {
      await r.continue()
    } catch {}

  })
  await p.locator('.dashboard-actions select').selectOption('taal-teaching')
  await p.locator('.dashboard-actions select').selectOption('mayon-teaching')
  await p.getByRole('img', { name: /Deposit distribution/ }).waitFor({ timeout: 90000 })
  await p.waitForTimeout(800)
  let out = {
    preset: await p.locator('.dashboard-actions select').inputValue(),
    context: await p.locator('.dashboard-context').innerText(),
    subtitle: await p.locator('.dashboard-heading').innerText(),
    alerts: await p.getByRole('alert').count(),
  }

  fs.writeFileSync(
    'qa/current_review/dashboard_independent_20261017/race.json',
    JSON.stringify(out, null, 2),
  )
  console.log(out)
  await b.close()

})().catch((e) => {

  console.error(e)
  process.exit(1)

})
