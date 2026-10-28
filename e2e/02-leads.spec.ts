import { test, expect } from '@playwright/test'
import { stamp } from './helpers/env'
import { confirmDialog, dialog, expectToast, gotoModule, iconButton } from './helpers/ui'

test.describe.serial('Leads CRUD', () => {
  const id = stamp()
  const name = `E2E Lead ${id}`
  const company = `Acme ${id}`
  const updatedCompany = `Acme Updated ${id}`

  test('create a lead', async ({ page }) => {
    await gotoModule(page, '/leads', /leads/i)
    await page.getByRole('button', { name: /add lead/i }).click()
    const form = dialog(page)
    await expect(form.getByText(/create new lead/i)).toBeVisible()
    await form.locator('#name').fill(name)
    await form.locator('#email').fill(`lead.${id}@example.com`)
    await form.locator('#phone').fill('9876543210')
    await form.locator('#company').fill(company)
    await form.locator('#value').fill('15000')
    await form.getByRole('button', { name: /create lead|save|submit/i }).click()
    await expectToast(page, /created|success/i)
    await page.getByPlaceholder(/search/i).first().fill(name)
    await expect(page.getByText(name).first()).toBeVisible({ timeout: 15000 })
  })

  test('view and edit the lead', async ({ page }) => {
    await gotoModule(page, '/leads', /leads/i)
    await page.getByPlaceholder(/search/i).first().fill(name)
    await expect(page.getByText(name).first()).toBeVisible({ timeout: 15000 })
    await page.getByRole('button', { name: 'View' }).first().click()
    const sheet = page.getByRole('dialog')
    await expect(sheet.getByRole('heading', { name })).toBeVisible()
    await sheet.getByRole('button', { name: /edit lead/i }).click()
    const companyInput = sheet.locator('#edit-company, #company, input[name="company"]').first()
    await companyInput.fill(updatedCompany)
    await sheet.getByRole('button', { name: /save changes/i }).click()
    await expectToast(page, /updated|success/i)
    await page.keyboard.press('Escape')
    await page.getByPlaceholder(/search/i).first().fill(updatedCompany)
    await expect(page.getByText(updatedCompany).first()).toBeVisible({ timeout: 15000 })
  })

  test('delete the lead', async ({ page }) => {
    await gotoModule(page, '/leads', /leads/i)
    await page.getByPlaceholder(/search/i).first().fill(name)
    await expect(page.getByText(name).first()).toBeVisible({ timeout: 15000 })
    await page.getByRole('button', { name: 'View' }).first().click()
    const sheet = page.getByRole('dialog')
    await iconButton(sheet, 'trash-2').first().click()
    await confirmDialog(page)
    await expectToast(page, /deleted|success/i)
    await page.getByPlaceholder(/search/i).first().fill(name)
    await page.waitForTimeout(1500)
    await expect(page.getByText(name)).toHaveCount(0)
  })
})
