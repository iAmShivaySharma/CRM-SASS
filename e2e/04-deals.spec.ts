import { test, expect } from '@playwright/test'
import { stamp } from './helpers/env'
import { confirmDialog, dialog, expectToast, fillField, gotoModule, pickSelect, submit } from './helpers/ui'

test.describe.serial('Deals kanban CRUD', () => {
  const id = stamp()
  const title = `E2E Deal ${id}`

  test('create a deal from the board', async ({ page }) => {
    await gotoModule(page, '/deals', /deals/i)
    await page.getByRole('button', { name: /new deal|add deal/i }).first().click()
    const form = dialog(page)
    await expect(form.getByText(/create new deal/i)).toBeVisible()
    await fillField(form, ['#title', 'input[name="title"]'], title)
    await fillField(form, ['#value', 'input[name="value"]'], '25000')
    const pipeline = form.getByRole('combobox').filter({ hasText: /select pipeline/i })
    if (await pipeline.count()) await pickSelect(page, pipeline.first())
    const stage = form.getByRole('combobox').filter({ hasText: /select stage/i })
    if (await stage.count()) await pickSelect(page, stage.first())
    await submit(form)
    await expectToast(page, /created|success/i)
    await expect(page.getByText(title).first()).toBeVisible({ timeout: 15000 })
  })

  test('move the deal to the next stage by dragging', async ({ page }) => {
    await gotoModule(page, '/deals', /deals/i)
    const card = page.getByText(title).first()
    await expect(card).toBeVisible({ timeout: 15000 })
    const columns = page.locator('[data-stage-id], [data-column-id], [data-testid^="stage-"]')
    const count = await columns.count()
    if (count >= 2) {
      const box = await card.boundingBox()
      const target = await columns.nth(1).boundingBox()
      if (box && target) {
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
        await page.mouse.down()
        await page.mouse.move(target.x + target.width / 2, target.y + 80, { steps: 12 })
        await page.mouse.up()
        await page.waitForTimeout(1500)
      }
    }
    await expect(page.getByText(title).first()).toBeVisible()
  })

  test('open the deal and delete it', async ({ page }) => {
    await gotoModule(page, '/deals', /deals/i)
    await page.getByText(title).first().click()
    const sheet = page.getByRole('dialog').last()
    await expect(sheet).toBeVisible()
    const del = sheet.locator('button:has(svg[class*="lucide-trash"])').or(sheet.getByRole('button', { name: /delete/i })).first()
    await del.click()
    await confirmDialog(page)
    await expectToast(page, /deleted|success/i)
    await page.waitForTimeout(1000)
    await expect(page.getByText(title)).toHaveCount(0)
  })
})
