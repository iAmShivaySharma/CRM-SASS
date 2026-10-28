import { test, expect } from '@playwright/test'
import { stamp } from './helpers/env'
import { confirmDialog, dialog, expectToast, fillField, gotoModule, itemContainer, pickSelect, submit } from './helpers/ui'

test.describe.serial('Lead statuses, tags, invoices, appointments', () => {
  const id = stamp()

  test('lead statuses: create, edit and delete a status', async ({ page }) => {
    await gotoModule(page, '/leads/statuses', /status/i)
    await page.getByRole('button', { name: /create status|add status|new status/i }).first().click()
    const form = dialog(page)
    await form.locator('#name').fill(`E2E Status ${id}`)
    const desc = form.locator('#description')
    if (await desc.count()) await desc.fill('E2E status')
    await submit(form)
    await expectToast(page, /created|success/i)
    await expect(page.getByText(`E2E Status ${id}`).first()).toBeVisible({ timeout: 15000 })

    const card = itemContainer(page, `E2E Status ${id}`)
    const edit = card.locator('button:has(svg[class*="lucide-pencil"]), button:has(svg[class*="lucide-edit"]), button:has(svg[class*="lucide-square-pen"])').first()
    if (await edit.count()) {
      await edit.click()
      const ef = dialog(page)
      await ef.locator('#name').fill(`E2E Status ${id} Edited`)
      await submit(ef)
      await expectToast(page, /updated|success/i)
      await expect(page.getByText(`E2E Status ${id} Edited`).first()).toBeVisible({ timeout: 15000 })
    }
    const card2 = itemContainer(page, `E2E Status ${id}`)
    await card2.locator('button:has(svg[class*="lucide-trash"])').first().click()
    const alert = page.getByRole('alertdialog')
    if (await alert.count()) await confirmDialog(page)
    await expectToast(page, /deleted|success/i)
  })

  test('tags: create and delete a tag', async ({ page }) => {
    await gotoModule(page, '/leads/tags', /tag/i)
    await page.getByRole('button', { name: /create tag|add tag|new tag/i }).first().click()
    const form = dialog(page)
    await form.locator('#name').fill(`E2E Tag ${id}`)
    await submit(form)
    await expectToast(page, /created|success/i)
    await expect(page.getByText(`E2E Tag ${id}`).first()).toBeVisible({ timeout: 15000 })
    const card = itemContainer(page, `E2E Tag ${id}`)
    await card.locator('button:has(svg[class*="lucide-trash"])').first().click()
    const alert = page.getByRole('alertdialog')
    if (await alert.count()) await confirmDialog(page)
    await expectToast(page, /deleted|success/i)
  })

  test('invoices: create an invoice with one item, then delete it', async ({ page }) => {
    await gotoModule(page, '/invoices', /invoice/i)
    await page.getByRole('button', { name: /create invoice|new invoice|add invoice/i }).first().click()
    const form = dialog(page)
    await expect(form.getByText(/create new invoice/i)).toBeVisible()
    await form.getByPlaceholder('Customer name').fill(`E2E Customer ${id}`)
    const email = form.getByPlaceholder('customer@email.com')
    if (await email.count()) await email.fill(`customer.${id}@example.com`)
    const item = form.getByPlaceholder('Item / Service').first()
    if (await item.count()) await item.fill('E2E consulting')
    const qty = form.locator('input[type="number"]').first()
    if (await qty.count()) await qty.fill('1')
    const priceInputs = form.locator('input[type="number"]')
    if ((await priceInputs.count()) >= 2) await priceInputs.nth(1).fill('1000')
    await submit(form)
    await expectToast(page, /created|success/i)
    await expect(page.getByText(`E2E Customer ${id}`).first()).toBeVisible({ timeout: 15000 })
    const row = page.getByRole('row').filter({ hasText: `E2E Customer ${id}` }).first()
    const del = row.locator('button:has(svg[class*="lucide-trash"])').first()
    if (await del.count()) {
      await del.click()
      await confirmDialog(page)
      await expectToast(page, /deleted|success/i)
    }
  })

  test('appointments: add and delete an appointment', async ({ page }) => {
    await gotoModule(page, '/appointments', /appointment/i)
    await page.getByRole('button', { name: /add appointment/i }).first().click()
    const form = dialog(page)
    await form.getByPlaceholder('Full name').fill(`E2E Visitor ${id}`)
    const email = form.getByPlaceholder('email@example.com')
    if (await email.count()) await email.fill(`visitor.${id}@example.com`)
    const service = form.getByPlaceholder('Service or product name')
    if (await service.count()) await service.fill('Demo call')
    const dt = form.locator('input[type="datetime-local"], input[type="date"]').first()
    if (await dt.count()) {
      const d = new Date(Date.now() + 3 * 86400000)
      const isoDate = d.toISOString().slice(0, 10)
      const type = await dt.getAttribute('type')
      await dt.fill(type === 'date' ? isoDate : `${isoDate}T10:00`)
    }
    await submit(form)
    await expectToast(page, /created|booked|scheduled|success/i)
    await expect(page.getByText(`E2E Visitor ${id}`).first()).toBeVisible({ timeout: 15000 })
    const row = itemContainer(page, `E2E Visitor ${id}`)
    const del = row.locator('button:has(svg[class*="lucide-trash"])').first()
    if (await del.count()) {
      await del.click()
      await confirmDialog(page)
      await expectToast(page, /deleted|cancelled|success/i)
    }
  })
})
