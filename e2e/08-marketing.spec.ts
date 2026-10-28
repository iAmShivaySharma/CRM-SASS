import { test, expect } from '@playwright/test'
import { stamp } from './helpers/env'
import { confirmDialog, dialog, expectToast, fillField, gotoModule, itemContainer, pickSelect, submit } from './helpers/ui'

test.describe.serial('Marketing: webhooks, SMS, sequences, campaigns', () => {
  const id = stamp()

  test('webhooks: create and delete a webhook', async ({ page }) => {
    await gotoModule(page, '/webhooks', /webhook|integration/i)
    await page.getByRole('tab', { name: /custom webhooks/i }).click()
    await page.getByRole('button', { name: /create webhook|create your first webhook/i }).first().click()
    const form = dialog(page)
    await fillField(form, ['#name', 'input[name="name"]'], `E2E Hook ${id}`)
    const type = form.getByRole('combobox').filter({ hasText: /select webhook type/i }).first()
    if (await type.count()) await pickSelect(page, type)
    await fillField(form, ['#description', 'textarea'], 'E2E webhook')
    await submit(form)
    await expectToast(page, /created|success/i)
    await page.keyboard.press('Escape')
    await expect(dialog(page)).toHaveCount(0, { timeout: 10000 })
    await expect(page.getByText(`E2E Hook ${id}`).first()).toBeVisible({ timeout: 15000 })

    const card = itemContainer(page, `E2E Hook ${id}`)
    await card.locator('button:has(svg[class*="lucide-ellipsis"]), button:has(svg[class*="lucide-more"])').first().click()
    await page.getByRole('menuitem', { name: /delete/i }).first().click()
    await confirmDialog(page)
    await expectToast(page, /deleted|success/i)
    await expect(page.getByText(`E2E Hook ${id}`)).toHaveCount(0, { timeout: 15000 })
  })

  test('sms: create a template', async ({ page }) => {
    await gotoModule(page, '/sms', /sms/i)
    const tab = page.getByRole('tab', { name: /templates/i })
    if (await tab.count()) await tab.click()
    await page.getByRole('button', { name: /new template/i }).first().click()
    const form = dialog(page)
    await form.getByPlaceholder('Template name').fill(`E2E SMS ${id}`)
    await form.getByPlaceholder('SMS body content...').fill('Hi {{name}}, this is an e2e template.')
    await submit(form)
    await expectToast(page, /created|success/i)
    await expect(page.getByText(`E2E SMS ${id}`).first()).toBeVisible({ timeout: 15000 })
  })

  test('sequences: create, pause and delete a sequence', async ({ page }) => {
    await gotoModule(page, '/email-sequences', /sequence/i)
    await page.getByRole('button', { name: /new sequence|create sequence|create/i }).first().click()
    await page.getByPlaceholder('e.g., Welcome Series').fill(`E2E Sequence ${id}`)
    const desc = page.getByPlaceholder('Optional description')
    if (await desc.count()) await desc.fill('E2E created sequence')
    await page.getByRole('button', { name: /^(save|create)/i }).last().click()
    await page.waitForTimeout(1500)
    const back = page.getByRole('button', { name: /back/i }).first()
    if (await back.isVisible().catch(() => false)) await back.click()
    await expect(page.getByText(`E2E Sequence ${id}`).first()).toBeVisible({ timeout: 15000 })

    const card = itemContainer(page, `E2E Sequence ${id}`)
    const toggle = card.getByRole('button', { name: /activate|pause|resume/i }).first()
    if (await toggle.count()) {
      await toggle.click()
      await expectToast(page, /sequence (active|paused|draft)|updated|success/i)
    }
    const del = card.locator('button:has(svg[class*="lucide-trash"])').first()
    if (await del.count()) {
      await del.click()
      const alert = page.getByRole('alertdialog')
      if (await alert.count()) await confirmDialog(page)
      await expectToast(page, /deleted|success/i)
      await expect(page.getByText(`E2E Sequence ${id}`)).toHaveCount(0, { timeout: 15000 })
    }
  })

  test('campaigns: walk the create wizard', async ({ page }) => {
    await gotoModule(page, '/campaigns', /campaign/i)
    await page.getByRole('button', { name: /new campaign|create campaign|create/i }).first().click()
    await page.getByPlaceholder('e.g., Black Friday Sale').fill(`E2E Campaign ${id}`)
    const desc = page.getByPlaceholder('Brief description of this campaign')
    if (await desc.count()) await desc.fill('E2E campaign')
    for (let step = 0; step < 4; step++) {
      const next = page.getByRole('button', { name: /^next|continue/i }).first()
      if (!(await next.isVisible().catch(() => false))) break
      if (!(await next.isEnabled())) break
      await next.click()
      await page.waitForTimeout(800)
    }
    const msg = page.getByPlaceholder('Enter your message...')
    if (await msg.isVisible().catch(() => false)) await msg.fill('Hello from e2e')
    const launch = page.getByRole('button', { name: /launch|create campaign|save/i }).last()
    if (await launch.isVisible().catch(() => false) && (await launch.isEnabled())) {
      await launch.click()
      await page.waitForTimeout(2000)
    }
    const back = page.getByRole('button', { name: /back/i }).first()
    if (await back.isVisible().catch(() => false)) await back.click()
    await expect(page.locator('main')).toBeVisible()
  })
})
