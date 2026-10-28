import { test, expect } from '@playwright/test'
import { stamp } from './helpers/env'
import { confirmDialog, dialog, expectToast, gotoModule, itemContainer } from './helpers/ui'

test.describe.serial('WhatsApp module', () => {
  const id = stamp()
  const accountName = `E2E Account ${id}`
  const templateName = `e2e_tpl_${id}`
  const flowName = `E2E Flow ${id}`

  test('accounts tab: connect manually, edit, disconnect', async ({ page }) => {
    await gotoModule(page, '/whatsapp', /whatsapp/i)
    await page.getByRole('tab', { name: /accounts/i }).click()
    await page.getByRole('button', { name: /connect manually/i }).first().click()
    const form = dialog(page)
    await form.getByPlaceholder('My Business').fill(accountName)
    await form.getByPlaceholder('+1234567890').fill(`91${id.padEnd(10, '0').slice(0, 10)}`)
    await form.getByPlaceholder('Meta Phone Number ID').fill(`pn_${id}`)
    await form.getByPlaceholder('WhatsApp Business Account ID').fill(`waba_${id}`)
    await form.getByPlaceholder('Meta Access Token').fill('EAAfaketoken')
    await form.getByRole('button', { name: /connect|save|create/i }).last().click()
    await expectToast(page, /connected|saved|success/i)
    await expect(page.getByText(accountName).first()).toBeVisible({ timeout: 15000 })

    const card = page.locator('div').filter({ hasText: accountName }).locator('button:has(svg[class*="lucide-pencil"]), button:has(svg[class*="lucide-settings"]), button:has(svg[class*="lucide-edit"]), button:has(svg[class*="lucide-square-pen"])').first()
    if (await card.count()) {
      await card.click()
      const edit = dialog(page)
      await edit.getByPlaceholder('My Business').fill(`${accountName} Edited`)
      await edit.getByRole('button', { name: /save|update|connect/i }).last().click()
      await expectToast(page, /updated|saved|success/i)
      await expect(page.getByText(`${accountName} Edited`).first()).toBeVisible({ timeout: 15000 })
    }
  })

  test('templates tab: create and delete a template', async ({ page }) => {
    await gotoModule(page, '/whatsapp', /whatsapp/i)
    await page.getByRole('tab', { name: /templates/i }).click()
    await page.getByRole('button', { name: /new template|create template/i }).first().click()
    const sheet = dialog(page)
    await expect(sheet.getByText(/new template/i)).toBeVisible()
    await sheet.getByPlaceholder('e.g. order_confirmation').fill(templateName)
    await sheet.getByPlaceholder(/message body/i).fill('Hello {{1}}, your order is confirmed.')
    await sheet.getByRole('button', { name: /create|save/i }).last().click()
    await expectToast(page, /created|success/i)
    await expect(page.getByText(templateName).first()).toBeVisible({ timeout: 15000 })

    const tplCard = itemContainer(page, templateName)
    await tplCard.locator('button:has(svg[class*="lucide-trash"])').first().click()
    const alert = page.getByRole('alertdialog')
    if (await alert.count()) await confirmDialog(page)
    await expectToast(page, /deleted|success/i)
    await expect(page.getByText(templateName)).toHaveCount(0, { timeout: 15000 })
  })

  test('bot flows tab: create, toggle, edit and delete a flow', async ({ page }) => {
    await gotoModule(page, '/whatsapp', /whatsapp/i)
    await page.getByRole('tab', { name: /bot flows?/i }).click()
    await page.getByRole('button', { name: /new flow|create flow|add flow|create bot flow/i }).first().click()
    await page.getByPlaceholder('e.g. Welcome Flow').fill(flowName)
    const accountSelect = page.getByRole('combobox').filter({ hasText: /select account/i }).first()
    if (await accountSelect.count()) {
      await accountSelect.click()
      await page.getByRole('option').first().click()
    }
    await page.getByRole('button', { name: /create|save|continue|next/i }).last().click()
    await page.waitForTimeout(1500)
    const saveFlow = page.getByRole('button', { name: /save flow|save/i }).last()
    if (await saveFlow.count()) await saveFlow.click()
    await page.waitForTimeout(1500)
    await page.getByRole('tab', { name: /bot flows?/i }).click()
    await expect(page.getByText(flowName).first()).toBeVisible({ timeout: 15000 })

    const card = itemContainer(page, flowName)
    await card.getByRole('button', { name: /deactivate|activate/i }).first().click()
    await expectToast(page, /activated|deactivated|success/i)
    await card.getByRole('button', { name: /edit/i }).first().click()
    await page.waitForTimeout(1500)
    const back = page.getByRole('button', { name: /back|cancel/i }).first()
    if (await back.count()) await back.click()
    await page.getByRole('tab', { name: /bot flows?/i }).click()
    const card2 = itemContainer(page, flowName)
    await card2.locator('button:has(svg[class*="lucide-trash"])').first().click()
    const alert = page.getByRole('alertdialog')
    if (await alert.count()) await confirmDialog(page)
    await expectToast(page, /deleted|success/i)
    await expect(page.getByText(flowName)).toHaveCount(0, { timeout: 15000 })
  })

  test('accounts tab: disconnect the test account', async ({ page }) => {
    await gotoModule(page, '/whatsapp', /whatsapp/i)
    await page.getByRole('tab', { name: /accounts/i }).click()
    const card = itemContainer(page, accountName)
    await card.locator('button:has(svg[class*="lucide-trash"])').first().click()
    const alert = page.getByRole('alertdialog')
    if (await alert.count()) await confirmDialog(page)
    await expectToast(page, /disconnected|deleted|success/i)
    await expect(page.getByText(accountName)).toHaveCount(0, { timeout: 15000 })
  })
})
