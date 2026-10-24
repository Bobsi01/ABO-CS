;async (page) => {

  const evidence = { checks: [] }
  const assert = (value, message) => {

    if (!value) throw new Error(message)

  }

  try {
    const completed = await page.getByText(/^Eventual totals:/).textContent()

    await page.route('**/terrain/taal.json', (route) =>
      route.fulfill({
        status: 503,
        contentType: 'text/plain',
        body: 'Independent injected terrain failure',
      }),
    )
    await page.getByRole('button', { name: 'Guide & sources', exact: true }).click()
    await page.getByRole('button', { name: 'Simulation', exact: true }).click()
    await page.getByRole('button', { name: 'Retry terrain', exact: true }).waitFor()
    assert(
      await page.getByRole('button', { name: 'Play sequence', exact: true }).isDisabled(),
      'Terrain failure left Play enabled',
    )
    assert(
      await page.getByLabel('Geographic ashfall map', { exact: true }).isVisible(),
      'Terrain failure lost map',
    )
    assert(
      (await page.getByText(/^Eventual totals:/).textContent()) === completed,
      'Terrain failure changed completed results',
    )
    await page.getByRole('button', { name: 'Use schematic terrain', exact: true }).click()
    await page.waitForTimeout(500)
    assert(
      await page.getByRole('button', { name: 'Play sequence', exact: true }).isEnabled(),
      'Explicit terrain fallback did not recover controls',
    )
    evidence.checks.push({
      name: 'HTTP 503 terrain failure and explicit schematic fallback',
      pass: true,
      completedResultsPreserved: true,
    })
    await page.unroute('**/terrain/taal.json')
    await page.getByRole('button', { name: 'Guide & sources', exact: true }).click()
    await page.getByRole('button', { name: 'Simulation', exact: true }).click()
    await page.waitForTimeout(500)
    assert(
      (await page.getByRole('button', { name: 'Retry terrain', exact: true }).count()) === 0,
      'Geographic terrain did not reload',
    )
    evidence.checks.push({
      name: 'Return to geographic terrain after source restoration',
      pass: true,
    })

    await page.addInitScript(() => {

      window.__qaOriginalGetContext = HTMLCanvasElement.prototype.getContext
      HTMLCanvasElement.prototype.getContext = function (kind, ...args) {

        if (kind === 'webgl2') return null

        return window.__qaOriginalGetContext.call(this, kind, ...args)

      }

    })
    await page.reload()
    await page.getByRole('heading', { name: '3D needs WebGL 2' }).waitFor()
    await page.getByRole('button', { name: 'Run simulation', exact: true }).click()
    await page.getByRole('heading', { name: 'Municipal and facility exposure' }).waitFor()
    assert(
      await page.getByRole('button', { name: 'Play sequence', exact: true }).isDisabled(),
      'Denied WebGL left replay enabled',
    )
    assert(
      await page.getByLabel('Geographic ashfall map', { exact: true }).isVisible(),
      'Denied WebGL lost map',
    )
    await page.getByText('Location table & exports', { exact: true }).click()
    assert(
      await page.getByRole('button', { name: 'Final CSV', exact: true }).isEnabled(),
      'Denied WebGL blocked CSV',
    )
    assert(
      await page.getByRole('button', { name: 'Scenario JSON', exact: true }).isEnabled(),
      'Denied WebGL blocked scenario export',
    )
    await page.evaluate(() => {

      HTMLCanvasElement.prototype.getContext = window.__qaOriginalGetContext

    })
    await page.getByRole('button', { name: 'Retry 3D', exact: true }).click()
    await page.locator('.scene-stage canvas').waitFor()
    await page.waitForTimeout(600)
    assert(
      await page.getByRole('button', { name: 'Play sequence', exact: true }).isEnabled(),
      'Restored WebGL did not recover',
    )
    evidence.checks.push({
      name: 'WebGL denied, normal computation/map/table/export controls, explicit recovery',
      pass: true,
      autoplay: false,
    })
    evidence.productionScripts = await page
      .locator('script[src]')
      .evaluateAll((nodes) => nodes.map((node) => node.src))
  } catch (error) {
    evidence.failure = error.message
  }

  return evidence

}
