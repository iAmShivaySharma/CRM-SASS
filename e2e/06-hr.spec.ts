import { test, expect } from '@playwright/test'
import { stamp } from './helpers/env'
import { confirmDialog, dialog, expectToast, fillField, gotoModule, pickSelect, submit } from './helpers/ui'

test.describe.serial('HR module', () => {
  const id = stamp()

  test('attendance: clock in, take a break, clock out', async ({ page }) => {
    await gotoModule(page, '/attendance', /attendance/i)
    const clockIn = page.getByRole('button', { name: /clock in/i }).first()
    const clockOutEarly = page.getByRole('button', { name: /clock out/i }).first()
    await expect(clockIn.or(clockOutEarly)).toBeVisible({ timeout: 20000 })
    if (await clockIn.isVisible().catch(() => false)) {
      await clockIn.scrollIntoViewIfNeeded()
      await clockIn.click()
      const confirm = dialog(page).getByRole('button', { name: /clock in/i }).first()
      await expect(confirm).toBeVisible({ timeout: 10000 })
      await confirm.click()
      await expectToast(page, /clock|success/i)
    }
    const startBreak = page.getByRole('button', { name: /start break|break/i }).first()
    if (await startBreak.isVisible().catch(() => false)) {
      await startBreak.click()
      await expectToast(page, /break|success/i)
      const endBreak = page.getByRole('button', { name: /end break|resume/i }).first()
      if (await endBreak.isVisible().catch(() => false)) {
        await endBreak.click()
        await expectToast(page, /break|resumed|success/i)
      }
    }
    const clockOut = page.getByRole('button', { name: /clock out/i }).first()
    await expect(clockOut).toBeVisible({ timeout: 15000 })
    await clockOut.click()
    const confirmOut = dialog(page).getByRole('button', { name: /clock out/i }).first()
    if (await confirmOut.isVisible().catch(() => false)) await confirmOut.click()
    await expectToast(page, /clock|success/i)
  })

  test('leaves: submit a request and approve it', async ({ page }) => {
    await gotoModule(page, '/leaves', /leave/i)
    await page.getByRole('button', { name: /new request/i }).click()
    const form = dialog(page)
    await expect(form.getByText(/submit leave request/i)).toBeVisible()
    const type = form.getByRole('combobox').filter({ hasText: /select leave type/i }).first()
    if (await type.count()) await pickSelect(page, type)
    const pickers = form.getByRole('button', { name: /pick a date/i })
    for (let i = 0; i < 2; i++) {
      await pickers.first().click()
      const days = page.locator('[role="dialog"] button[name="day"]:not([disabled])')
      await expect(days.first()).toBeVisible({ timeout: 10000 })
      const count = await days.count()
      await days.nth(Math.min(count - 1, 10 + i)).click()
      await page.keyboard.press('Escape')
      await expect(form.getByText(/submit leave request/i)).toBeVisible()
    }
    await page.getByPlaceholder('Provide reason for leave...').fill(`E2E leave ${id}`)
    await page.getByRole('button', { name: /submit request/i }).click()
    await expectToast(page, /submitted|created|success/i)
    const row = page.getByRole('row').filter({ hasText: /pending/i }).first()
    await expect(row).toBeVisible({ timeout: 15000 })
    await row.locator('button:has(svg[class*="lucide-ellipsis"]), button:has(svg[class*="lucide-more"])').first().click()
    await page.getByRole('menuitem', { name: /approve/i }).first().click()
    const alert = page.getByRole('alertdialog')
    if (await alert.count()) await confirmDialog(page, /approve|confirm|yes/i)
    await expectToast(page, /approved|success/i)
    await expect(page.getByRole('row').filter({ hasText: /approved/i }).first()).toBeVisible({ timeout: 15000 })
  })

  test('assets: add, edit and delete an asset', async ({ page }) => {
    await gotoModule(page, '/assets', /asset/i)
    await page.getByRole('button', { name: /add asset/i }).click()
    const form = dialog(page)
    await expect(form.getByText(/add new asset/i)).toBeVisible()
    await form.getByPlaceholder('Enter asset name').fill(`E2E Laptop ${id}`)
    const cat = form.getByRole('combobox').filter({ hasText: /select category/i }).first()
    if (await cat.count()) await pickSelect(page, cat)
    await form.getByPlaceholder('Enter brand').fill('E2E Brand')
    await form.getByPlaceholder('Enter model').fill('E2E Model')
    await form.getByPlaceholder('Enter serial number').fill(`SN-${id}`)
    await form.getByPlaceholder('Enter purchase price').fill('1200')
    await form.getByRole('button', { name: /pick a date/i }).first().click()
    const days = page.locator('[role="dialog"] button[name="day"]:not([disabled])')
    await expect(days.first()).toBeVisible({ timeout: 10000 })
    await days.nth(Math.min((await days.count()) - 1, 10)).click()
    await page.keyboard.press('Escape')
    await expect(form.getByText(/add new asset/i)).toBeVisible()
    await form.getByPlaceholder('Enter current location').fill('HQ')
    await submit(form)
    await expectToast(page, /created|added|success/i)
    await expect(page.getByText(`E2E Laptop ${id}`).first()).toBeVisible({ timeout: 15000 })

    const row = page.getByRole('row').filter({ hasText: `E2E Laptop ${id}` }).first()
    const del = row.locator('button:has(svg[class*="lucide-trash"])').first()
    if (await del.count()) {
      await del.click()
      const alert = page.getByRole('alertdialog')
      if (await alert.count()) await confirmDialog(page)
      await expectToast(page, /deleted|success/i)
      await expect(page.getByText(`E2E Laptop ${id}`)).toHaveCount(0, { timeout: 15000 })
    }
  })

  test('employees: invite an employee', async ({ page }) => {
    await gotoModule(page, '/employees', /employees/i)
    const invite = page.getByRole('button', { name: /invite|add employee/i }).first()
    await invite.click()
    const form = dialog(page)
    await expect(form.getByText(/invite employee/i)).toBeVisible()
    await fillField(form, ['#invite-email', 'input[type="email"]'], `employee.${id}@example.com`)
    const role = form.getByRole('combobox').filter({ hasText: /select a role/i }).first()
    if (await role.count()) await pickSelect(page, role)
    await submit(form)
    await expectToast(page, /invit|sent|success/i)
  })
})
