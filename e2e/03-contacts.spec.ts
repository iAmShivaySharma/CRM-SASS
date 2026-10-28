import { test, expect } from '@playwright/test'
import { stamp } from './helpers/env'
import { confirmDialog, dialog, expectToast, fillField, gotoModule, itemContainer, search, submit } from './helpers/ui'

test.describe.serial('Contacts CRUD', () => {
  const id = stamp()
  const name = `E2E Contact ${id}`
  const updated = `E2E Contact ${id} Updated`

  test('create a contact', async ({ page }) => {
    await gotoModule(page, '/contacts', /contacts/i)
    await page.getByRole('button', { name: /add contact/i }).click()
    const form = dialog(page)
    await expect(form.getByText(/create new contact/i)).toBeVisible()
    await fillField(form, ['#name', 'input[name="name"]', '[placeholder="Full name"]'], name)
    await fillField(form, ['#email', 'input[name="email"]'], `contact.${id}@example.com`)
    await fillField(form, ['#phone', 'input[name="phone"]'], '9876501234')
    await fillField(form, ['#company', 'input[name="company"]'], `Globex ${id}`)
    await submit(form)
    await expectToast(page, /created|success/i)
    await search(page, name)
    await expect(page.getByText(name).first()).toBeVisible({ timeout: 15000 })
  })

  test('edit the contact', async ({ page }) => {
    await gotoModule(page, '/contacts', /contacts/i)
    await search(page, name)
    const row = itemContainer(page, name)
    await expect(row).toBeVisible({ timeout: 15000 })
    const editBtn = row.getByRole('button', { name: /edit/i }).or(row.locator('button:has(svg[class*="lucide-pencil"]), button:has(svg[class*="lucide-edit"]), button:has(svg[class*="lucide-square-pen"])')).first()
    if (await editBtn.count()) {
      await editBtn.click()
    } else {
      await row.click()
      await page.getByRole('button', { name: /^edit$/i }).first().click()
    }
    const form = dialog(page)
    await expect(form.getByText(/edit contact/i)).toBeVisible()
    await fillField(form, ['#name', 'input[name="name"]'], updated)
    await submit(form)
    await expectToast(page, /updated|success/i)
    await search(page, updated)
    await expect(page.getByText(updated).first()).toBeVisible({ timeout: 15000 })
  })

  test('delete the contact', async ({ page }) => {
    await gotoModule(page, '/contacts', /contacts/i)
    await search(page, updated)
    const row = itemContainer(page, updated)
    await expect(row).toBeVisible({ timeout: 15000 })
    const del = row.locator('button:has(svg[class*="lucide-trash"])').first()
    if (await del.count()) {
      await del.click()
    } else {
      await row.click()
      await page.locator('[role="dialog"] button:has(svg[class*="lucide-trash"])').first().click()
    }
    await confirmDialog(page)
    await expectToast(page, /deleted|success/i)
    await search(page, updated)
    await expect(page.getByText(updated)).toHaveCount(0)
  })
})
