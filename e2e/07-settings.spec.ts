import { test, expect } from '@playwright/test'
import { stamp } from './helpers/env'
import { confirmDialog, dialog, expectToast, fillField, gotoModule, itemContainer, pickSelect, submit } from './helpers/ui'

test.describe.serial('Settings, workspace and roles', () => {
  const id = stamp()
  const roleName = `E2E Role ${id}`

  test('settings: update profile name', async ({ page }) => {
    await gotoModule(page, '/settings', /settings/i)
    const fullName = page.locator('#fullName').first()
    await expect(fullName).toBeVisible({ timeout: 15000 })
    await fullName.fill(`E2E Runner ${id}`)
    await page.getByRole('button', { name: /save changes/i }).first().click()
    await expectToast(page, /updated|saved|success/i)
    await fullName.fill('E2E Runner')
    await page.getByRole('button', { name: /save changes/i }).first().click()
    await expectToast(page, /updated|saved|success/i)
  })

  test('workspace: rename, toggle auto-deal, invite a member', async ({ page }) => {
    await gotoModule(page, '/workspace', /workspace/i)
    const name = page.locator('#workspaceName')
    await expect(name).toBeVisible({ timeout: 15000 })
    await name.fill(`E2E Workspace ${id}`)
    await page.getByRole('button', { name: /save changes/i }).first().click()
    await expectToast(page, /updated|success/i)
    await name.fill('E2E Workspace')
    await page.getByRole('button', { name: /save changes/i }).first().click()
    await expectToast(page, /updated|success/i)

    const autoDeal = page.locator('#autoCreateDeal')
    await expect(autoDeal).toBeVisible()
    await autoDeal.click()
    await expectToast(page, /deal|automatic|success/i)
    await autoDeal.click()
    await expectToast(page, /deal|automatic|success/i)

    await page.getByRole('button', { name: /team members/i }).first().click()
    await page.getByRole('button', { name: /invite member/i }).first().click()
    const form = dialog(page)
    await expect(form.getByText(/invite team member/i)).toBeVisible()
    await fillField(form, ['#email', 'input[type="email"]', '[placeholder="Enter email address"]'], `invitee.${id}@example.com`)
    const role = form.getByRole('combobox').first()
    if (await role.count()) await pickSelect(page, role)
    await submit(form)
    await expectToast(page, /invit|sent|success/i)
  })

  test('roles: create and delete a role', async ({ page }) => {
    await gotoModule(page, '/roles', /role/i)
    await page.getByRole('button', { name: /create role/i }).first().click()
    const form = dialog(page)
    await expect(form.getByText(/create new role/i)).toBeVisible()
    await fillField(form, ['#name', 'input[name="name"]'], roleName)
    await fillField(form, ['#description', 'textarea'], 'E2E created role')
    const firstPermission = form.locator('button[role="checkbox"], input[type="checkbox"]').first()
    if (await firstPermission.count()) await firstPermission.click()
    await submit(form)
    await expectToast(page, /created|success/i)
    await expect(page.getByText(roleName).first()).toBeVisible({ timeout: 15000 })

    const card = itemContainer(page, roleName)
    const del = card.locator('button:has(svg[class*="lucide-trash"])').first()
    await del.click()
    const alert = page.getByRole('alertdialog')
    if (await alert.count()) await confirmDialog(page)
    await expectToast(page, /deleted|success/i)
    await expect(page.getByText(roleName)).toHaveCount(0, { timeout: 15000 })
  })

  test('notifications: mark all read', async ({ page }) => {
    await gotoModule(page, '/notifications', /notifications/i)
    const markAll = page.getByRole('button', { name: /mark all read/i }).first()
    if (await markAll.isEnabled().catch(() => false)) {
      await markAll.click()
      await expectToast(page, /marked|read|success/i)
    }
  })
})
