import { test, expect } from '@playwright/test'
import { stamp } from './helpers/env'
import { confirmDialog, dialog, expectToast, fillField, gotoModule, itemContainer, pickSelect, submit } from './helpers/ui'

test.describe.serial('Projects, tasks, documents and chat', () => {
  const id = stamp()
  const projectName = `E2E Project ${id}`
  const taskTitle = `E2E Task ${id}`
  const roomName = `e2e-room-${id}`

  test('projects: create a project', async ({ page }) => {
    await gotoModule(page, '/projects', /projects/i)
    await page.getByRole('button', { name: /new project|create project/i }).first().click()
    const form = dialog(page)
    await expect(form.getByText(/create new project/i)).toBeVisible()
    await fillField(form, ['#name', 'input[name="name"]', '[placeholder="My Awesome Project"]'], projectName)
    const vis = form.getByRole('combobox').filter({ hasText: /select visibility/i }).first()
    if (await vis.count()) await pickSelect(page, vis)
    await submit(form)
    await expectToast(page, /created|success/i)
    await expect(page.getByText(projectName).first()).toBeVisible({ timeout: 15000 })
  })

  test('tasks: create a task inside the project', async ({ page }) => {
    await gotoModule(page, '/projects/tasks', /tasks/i)
    const project = page.getByRole('combobox').filter({ hasNotText: /status/i }).first()
    await pickSelect(page, project, new RegExp(projectName))
    await page.getByRole('button', { name: /new task|create task/i }).and(page.locator('button:not([disabled])')).first().click()
    const form = dialog(page)
    await form.getByPlaceholder('Enter task title...').fill(taskTitle)
    const prio = form.getByRole('combobox').filter({ hasText: /select priority/i }).first()
    if (await prio.count()) await pickSelect(page, prio)
    await submit(form)
    await expectToast(page, /created|success/i)
    await expect(page.getByText(taskTitle).first()).toBeVisible({ timeout: 15000 })
  })

  test('documents: create, edit and save a document', async ({ page }) => {
    await gotoModule(page, '/projects/documents', /documents/i)
    const project = page.getByRole('combobox').filter({ hasNotText: /status|type/i }).first()
    await pickSelect(page, project, new RegExp(projectName))
    await page.getByRole('button', { name: /new document/i }).and(page.locator('button:not([disabled])')).first().click()
    await expectToast(page, /created|success/i)
    await page.waitForURL(/\/projects\/documents\/[a-f0-9]+/, { timeout: 15000 })
    const title = page.getByPlaceholder('Untitled Document').first()
    await expect(title).toBeVisible({ timeout: 15000 })
    await title.fill(`E2E Doc ${id}`)
    const editor = page.locator('.ProseMirror, [contenteditable="true"]').first()
    if (await editor.count()) {
      await editor.click()
      await page.keyboard.type('E2E document body')
    }
    await page.getByRole('button', { name: /^save$/i }).first().click()
    await expectToast(page, /saved|success/i)
    await page.getByRole('button', { name: /back to documents/i }).first().click()
    await expect(page.getByText(`E2E Doc ${id}`).first()).toBeVisible({ timeout: 15000 })
  })

  test('chat: create a room and send a message', async ({ page }) => {
    await gotoModule(page, '/chat', /chat/i)
    const general = page.getByRole('button', { name: /create general room/i })
    if (await general.isVisible().catch(() => false)) {
      await general.click()
      await page.waitForTimeout(1500)
    }
    const newRoom = page.locator('button:has(svg[class*="lucide-plus"])').first()
    await newRoom.click()
    const form = dialog(page)
    await fillField(form, ['#chat-name', '#name', '[placeholder="Enter room name..."]', '[placeholder="Enter chat name"]'], roomName)
    await submit(form)
    await page.waitForTimeout(1500)
    await expect(page.getByText(roomName).first()).toBeVisible({ timeout: 15000 })
    await page.getByText(roomName).first().click()
    const input = page.getByPlaceholder('Type a message...').first()
    await input.fill(`hello from e2e ${id}`)
    await input.press('Enter')
    await expect(page.getByText(`hello from e2e ${id}`).first()).toBeVisible({ timeout: 15000 })
  })

  test('projects: archive the project', async ({ page }) => {
    await gotoModule(page, '/projects', /projects/i)
    await expect(page.getByText(projectName).first()).toBeVisible({ timeout: 15000 })
    const row = page.getByRole('row').filter({ hasText: projectName }).first()
    const card = (await row.count()) ? row : itemContainer(page, projectName)
    await card.locator('button:has(svg[class*="lucide-ellipsis"]), button:has(svg[class*="lucide-more"])').first().click()
    await page.getByRole('menuitem', { name: /archive/i }).first().click()
    const alert = page.getByRole('alertdialog')
    if (await alert.count()) await confirmDialog(page, /archive|confirm|yes/i)
    await expectToast(page, /archived|success/i)
    const archived = page.getByRole('row').filter({ hasText: projectName }).first()
    if (await archived.count()) await expect(archived).toContainText(/archived/i, { timeout: 15000 })
  })
})
