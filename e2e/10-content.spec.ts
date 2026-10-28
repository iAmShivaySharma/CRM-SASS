import { test, expect } from '@playwright/test'
import { stamp } from './helpers/env'
import { confirmDialog, dialog, expectToast, fillField, gotoModule, itemContainer, pickSelect, submit } from './helpers/ui'

test.describe.serial('Blog, compliance and inventory', () => {
  const id = stamp()

  test('blog: create a category, a draft post, then delete both', async ({ page }) => {
    await gotoModule(page, '/blogs/categories', /categor/i)
    await page.getByRole('button', { name: /new category/i }).first().click()
    await page.locator('#cat-name').fill(`E2E Category ${id}`)
    await page.getByRole('button', { name: /^(create|save)/i }).first().click()
    await expectToast(page, /created|success/i)
    await expect(page.getByText(`E2E Category ${id}`).first()).toBeVisible({ timeout: 15000 })

    await gotoModule(page, '/blogs', /blog/i)
    await page.getByRole('button', { name: /new post/i }).first().click()
    await page.waitForURL(/\/blogs\/new/)
    await page.locator('#title').fill(`E2E Post ${id}`)
    const excerpt = page.locator('#excerpt')
    if (await excerpt.count()) await excerpt.fill('E2E excerpt')
    const editor = page.locator('.ProseMirror, [contenteditable="true"]').first()
    await editor.click()
    await page.keyboard.type('E2E blog body content.')
    const category = page.getByRole('combobox').filter({ hasText: /select category/i }).first()
    await pickSelect(page, category, new RegExp(`E2E Category ${id}`))
    await page.locator('#authorName').fill('E2E Author')
    await page.getByRole('button', { name: /save draft/i }).first().click()
    await expectToast(page, /created|saved|success/i)
    await page.waitForURL(/\/blogs$/)
    await page.getByPlaceholder('Search posts...').fill(`E2E Post ${id}`)
    await expect(page.getByText(`E2E Post ${id}`).first()).toBeVisible({ timeout: 15000 })
    const row = itemContainer(page, `E2E Post ${id}`)
    const menu = row.locator('button:has(svg[class*="lucide-ellipsis"]), button:has(svg[class*="lucide-more"])').first()
    if (await menu.count()) {
      await menu.click()
      await page.getByRole('menuitem', { name: /delete/i }).first().click()
    } else {
      await row.locator('button:has(svg[class*="lucide-trash"])').first().click()
    }
    const alert = page.getByRole('alertdialog')
    if (await alert.count()) await confirmDialog(page)
    await expectToast(page, /deleted|success/i)

    await gotoModule(page, '/blogs/categories', /categor/i)
    const cat = itemContainer(page, `E2E Category ${id}`)
    await cat.locator('button:has(svg[class*="lucide-trash"])').first().click()
    await expectToast(page, /deleted|success/i)
  })

  test('compliance: add a task and a document, then delete them', async ({ page }) => {
    await gotoModule(page, '/compliance', /compliance/i)
    await page.getByRole('button', { name: /add task/i }).first().click()
    let form = dialog(page)
    await form.locator('#taskTitle').fill(`E2E Compliance ${id}`)
    const cat = form.getByRole('combobox').filter({ hasText: /category/i }).first()
    if (await cat.count()) await pickSelect(page, cat)
    await form.locator('#dueDate').fill(new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10))
    await submit(form)
    await expectToast(page, /created|added|success/i)
    await expect(page.getByText(`E2E Compliance ${id}`).first()).toBeVisible({ timeout: 15000 })

    const docsTab = page.getByRole('tab', { name: /document/i })
    await expect(async () => {
      await docsTab.click()
      await expect(docsTab).toHaveAttribute('aria-selected', 'true', { timeout: 2000 })
    }).toPass({ timeout: 15000 })
    await page.getByRole('button', { name: /add document/i }).first().click()
    form = dialog(page)
    await form.locator('#docName').fill(`E2E Doc ${id}`)
    const dcat = form.getByRole('combobox').filter({ hasText: /category/i }).first()
    if (await dcat.count()) await pickSelect(page, dcat)
    await submit(form)
    await expectToast(page, /created|added|success/i)
    await expect(page.getByText(`E2E Doc ${id}`).first()).toBeVisible({ timeout: 15000 })
    const docRow = itemContainer(page, `E2E Doc ${id}`)
    await docRow.locator('button:has(svg[class*="lucide-ellipsis"]), button:has(svg[class*="lucide-more"])').first().click()
    await page.getByRole('menuitem', { name: /delete/i }).first().click()
    await confirmDialog(page)
    await expectToast(page, /deleted|success/i)

    const tasksTab = page.getByRole('tab', { name: /tasks/i })
    await expect(async () => {
      await tasksTab.click()
      await expect(tasksTab).toHaveAttribute('aria-selected', 'true', { timeout: 2000 })
    }).toPass({ timeout: 15000 })
    const taskRow = itemContainer(page, `E2E Compliance ${id}`)
    await taskRow.locator('button:has(svg[class*="lucide-ellipsis"]), button:has(svg[class*="lucide-more"])').first().click()
    await page.getByRole('menuitem', { name: /delete/i }).first().click()
    await confirmDialog(page)
    await expectToast(page, /deleted|success/i)
  })

  test('inventory: products and low stock sections render', async ({ page }) => {
    await gotoModule(page, '/inventory', /inventory/i)
    await expect(page.getByText(/^products$/i).first()).toBeVisible()
    await expect(page.getByText(/low stock alerts/i).first()).toBeVisible()
  })
})
