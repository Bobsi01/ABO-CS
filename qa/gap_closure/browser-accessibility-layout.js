;async (page) => {

  const evidence = { browser: await page.context().browser().version(), checks: [] }
  const add = (name, data) => evidence.checks.push({ name, ...data })
  const assert = (value, message) => {

    if (!value) throw new Error(message)

  }

  try {
    await page.getByRole('button', { name: 'Before', exact: true }).click()
    const scenario = page.getByRole('combobox', { name: /^Scenario / })

    await scenario.focus()
    await scenario.press('ArrowDown')
    assert((await page.getByRole('listbox').count()) === 1, 'Keyboard did not open scenario list')
    const optionNames = await page.getByRole('option').allTextContents()

    await scenario.press('Escape')
    assert((await page.getByRole('listbox').count()) === 0, 'Escape did not close scenario list')
    assert(
      await scenario.evaluate((node) => node === document.activeElement),
      'Escape did not restore combobox focus',
    )
    add('Custom scenario list keyboard and focus', { pass: true, options: optionNames })
    const canvas = page.locator('.scene-stage canvas')

    await canvas.focus()
    const before = await canvas.screenshot()

    await canvas.press('ArrowRight')
    await page.waitForTimeout(500)
    const after = await canvas.screenshot()

    assert(!before.equals(after), 'Keyboard camera arrow did not visibly change scene')
    add('Keyboard canvas camera', {
      pass: true,
      name: await canvas.getAttribute('aria-label'),
      tabIndex: await canvas.getAttribute('tabindex'),
    })
    await page.setViewportSize({ width: 1440, height: 1000 })
    await page.screenshot({ path: 'qa/gap_closure/browser-desktop-light.png' })
    for (const theme of ['light', 'dark']) {
      const toggle = page.getByRole('button', {
        name: theme === 'dark' ? 'Dark theme' : 'Light theme',
        exact: true,
      })

      if (await toggle.count()) await toggle.click()
      await page.setViewportSize({ width: 320, height: 800 })
      await page.waitForTimeout(500)
      const metrics = await page.evaluate(() => ({
        width: innerWidth,
        scrollWidth: document.documentElement.scrollWidth,
        bodyWidth: document.body.scrollWidth,
        theme: document.documentElement.dataset.theme ?? document.body.dataset.theme,
        nativeSelects: document.querySelectorAll('select').length,
      }))

      assert(
        metrics.scrollWidth <= metrics.width + 1 && metrics.bodyWidth <= metrics.width + 1,
        `${theme} 320px body overflows`,
      )
      await page.screenshot({ path: `qa/gap_closure/browser-320-${theme}.png`, fullPage: true })
      add('320px layout', { pass: true, theme, ...metrics })
    }
    await page.setViewportSize({ width: 1440, height: 1000 })
    await page.evaluate(() => {

      document.body.style.zoom = '2'

    })
    const zoom = await page.evaluate(() => ({
      cssZoom: getComputedStyle(document.body).zoom,
      width: innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }))

    await page.screenshot({ path: 'qa/gap_closure/browser-css-zoom-200.png' })
    add('200% CSS zoom proxy', {
      pass: zoom.scrollWidth <= zoom.width + 1,
      ...zoom,
      limitation:
        'CSS zoom reflow inspected; native browser zoom and actual screen-reader speech are not established.',
    })
    await page.evaluate(() => {

      document.body.style.zoom = ''

    })
    const ax = await page.context().newCDPSession(page)
    const tree = await ax.send('Accessibility.getFullAXTree')

    evidence.ax = {
      unnamedImages: tree.nodes.filter((node) => node.role?.value === 'image' && !node.name?.value)
        .length,
      namedControls: tree.nodes.filter(
        (node) => ['button', 'combobox', 'slider'].includes(node.role?.value) && node.name?.value,
      ).length,
    }
    await ax.detach()
    evidence.nonColorLegend = await page.getByLabel('Deposit thickness color legend').innerText()
    evidence.canvasAlternative = await page
      .getByRole('heading', { name: 'Municipal and facility exposure' })
      .textContent()
  } catch (error) {
    evidence.failure = error.message
  }

  return evidence

}
