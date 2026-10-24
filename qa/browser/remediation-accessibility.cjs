const fs = require('node:fs')
const path = require('node:path')
const { chromium } = require('./playwright-runtime.cjs')
const root = path.resolve(__dirname, '../..')
const target = path.join(root, 'output/playwright/remediation-20261015')
const source = process.env.ABO_AXE_SOURCE

if (!source || !fs.existsSync(source))
  throw new Error('Set ABO_AXE_SOURCE to the installed axe-core/axe.min.js')
const base = process.env.ABO_QA_URL ?? 'http://127.0.0.1:8067'
const report = {
  cases: [],
  errors: [],
  native_accessibility: 'Not evaluated by this automated audit',
}
const save = () =>
  fs.writeFileSync(path.join(target, 'a11y-workflows.json'), JSON.stringify(report, null, 2))

fs.mkdirSync(target, { recursive: true })
let browser
;
(async () => {

  browser = await chromium.launch({ channel: 'chrome', headless: true })
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })

  page.on('pageerror', (error) => report.errors.push(error.message))
  await page.goto(base)
  await page.getByRole('button', { name: 'Run simulation', exact: true }).waitFor()
  await page.addScriptTag({ path: source })

  async function audit(name) {

    const result = await page.evaluate(async () => {

      const result = await axe.run(document, {
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] },
      })

      return {
        tool: result.testEngine,
        violations: result.violations,
        incomplete: result.incomplete.map((r) => ({
          id: r.id,
          nodes: r.nodes.map((n) => n.target),
        })),
        passes: result.passes.length,
      }

    })

    report.cases.push({ name, viewport: page.viewportSize(), ...result })
    save()
    process.stdout.write(name + ': ' + result.violations.length + ' violations\n')

  }

  await audit('initial-desktop-light')
  await page.getByRole('button', { name: 'Run simulation', exact: true }).click()
  await page.getByRole('slider', { name: 'Eruption timeline' }).waitFor()
  await page.getByRole('button', { name: 'During', exact: true }).click()
  await page.locator('details').evaluateAll((elements) =>
    elements.forEach((el) => {

      el.open = true

    }),
  )
  await page.getByRole('checkbox', { name: 'Show 2021-2024 hypocenters (USGS context)' }).check()
  await page.getByRole('radio', { name: 'Conduit (≤15 km)', exact: true }).check()
  await audit('computed-desktop-light-expanded')
  await page.getByRole('button', { name: 'Dark theme' }).click()
  await audit('computed-desktop-dark-expanded')
  await page.setViewportSize({ width: 320, height: 900 })
  await audit('computed-mobile-dark-expanded')
  await page.getByRole('button', { name: 'Light theme' }).click()
  await audit('computed-mobile-light-expanded')
  await page.getByRole('button', { name: 'Taal 2020', exact: true }).click()
  await page.getByRole('button', { name: 'Check historical reference' }).click()
  await page.getByRole('button', { name: 'Evaluation JSON' }).waitFor()
  await page.locator('details').evaluateAll((elements) =>
    elements.forEach((el) => {

      el.open = true

    }),
  )
  await audit('historical-unavailable-mobile-light')
  await page.getByRole('button', { name: 'Guide & sources', exact: true }).click()
  await page.locator('details').evaluateAll((elements) =>
    elements.forEach((el) => {

      el.open = true

    }),
  )
  await audit('guide-mobile-light-expanded')
  const inventory = page.getByRole('region', {
    name: 'Administrative inventory coverage table',
    exact: true,
  })

  await inventory.focus()
  const scrollBefore = await inventory.evaluate((element) => element.scrollLeft)

  await page.keyboard.press('ArrowRight')
  await page.waitForTimeout(250)
  const scrollAfter = await inventory.evaluate((element) => element.scrollLeft)

  report.keyboard_inventory_scroll = {
    before: scrollBefore,
    after: scrollAfter,
    pass: scrollAfter > scrollBefore,
    focus: await inventory.evaluate((element) => element === document.activeElement),
  }
  if (!report.keyboard_inventory_scroll.pass)
    throw new Error('Inventory table did not scroll with keyboard')
  await page.screenshot({ path: path.join(target, 'inventory-keyboard-focus-320.png') })
  await page.getByRole('button', { name: 'Wind comparison', exact: true }).click()
  await audit('comparison-mobile-light')
  await page.getByRole('button', { name: 'Wind sweep', exact: true }).click()
  await page.getByRole('button', { name: 'Evaluate all wind directions' }).click()
  await page.getByRole('button', { name: 'Use this direction' }).first().waitFor()
  await audit('sweep-mobile-light')
  report.completed = true
  report.finished = new Date().toISOString()
  save()
  await browser.close()
  if (report.cases.some((c) => c.violations.length) || report.errors.length) process.exitCode = 1

})().catch(async (error) => {

  report.errors.push(error.stack)
  save()
  await browser?.close()
  process.exitCode = 1

})
