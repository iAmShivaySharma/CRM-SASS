import { expect, type Page, type Locator } from '@playwright/test'

export function attachApiLogger(page: Page) {
  page.on('response', async res => {
    if (res.url().includes('/api/') && (res.request().method() !== 'GET' || res.status() >= 400)) {
      const body = res.status() >= 400 ? await res.text().catch(() => '') : ''
      console.log(`[api ${res.status()}] ${res.request().method()} ${new URL(res.url()).pathname}${body ? ` -> ${body.slice(0, 300)}` : ''}`)
    }
  })
}

export async function gotoModule(page: Page, path: string, heading?: RegExp) {
  const errors: string[] = []
  page.on('pageerror', err => errors.push(err.message))
  page.on('dialog', d => d.accept().catch(() => undefined))
  attachApiLogger(page)
  await page.goto(path)
  await page.waitForLoadState('networkidle')
  if (heading) {
    await expect(page.getByRole('heading', { name: heading }).first()).toBeVisible({ timeout: 20000 })
  }
  expect(errors, `client errors on ${path}`).toEqual([])
}

export async function expectToast(page: Page, text: RegExp) {
  await expect(page.locator('[data-sonner-toast]').filter({ hasText: text }).first()).toBeVisible({ timeout: 15000 })
}

export async function pickSelect(page: Page, trigger: Locator, option?: RegExp | string) {
  await trigger.click()
  const options = page.getByRole('option')
  await expect(options.first()).toBeVisible({ timeout: 10000 })
  if (option) {
    await page.getByRole('option', { name: option }).first().click()
  } else {
    await options.first().click()
  }
}

export async function confirmDialog(page: Page, name: RegExp = /delete|confirm|remove|yes|continue/i) {
  const dlg = page.getByRole('alertdialog')
  const appeared = await dlg.waitFor({ state: 'visible', timeout: 4000 }).then(() => true).catch(() => false)
  if (!appeared) return false
  await dlg.getByRole('button', { name }).first().click()
  return true
}

export function dialog(page: Page) {
  return page.getByRole('dialog').last()
}

export function iconButton(scope: Locator | Page, icon: string) {
  const base = icon.replace(/-(\d+)$/, '$1')
  return scope.locator(`button:has(svg.lucide-${icon}), button:has(svg.lucide-${base}), button:has(svg[class*="lucide-${base}"])`)
}

export function itemContainer(page: Page, text: string) {
  return page.getByText(text, { exact: true }).locator('visible=true').first().locator('xpath=ancestor::*[.//button][1]')
}

export async function fillField(scope: Locator | Page, candidates: string[], value: string) {
  for (const c of candidates) {
    const loc = scope.locator(c).first()
    if (await loc.count()) {
      await loc.fill(value)
      return
    }
  }
  throw new Error(`no field matched: ${candidates.join(' | ')}`)
}

export async function submit(scope: Locator, name: RegExp = /^(create|save|add|submit|send|invite|update|confirm)/i) {
  const byType = scope.locator('button[type="submit"]').last()
  if (await byType.count()) {
    await byType.click()
    return
  }
  await scope.getByRole('button', { name }).last().click()
}

export async function search(page: Page, text: string) {
  const box = page.getByPlaceholder(/search/i).first()
  await box.fill(text)
  await page.waitForTimeout(800)
}

export async function openRowMenu(page: Page, rowText: string) {
  const row = page.getByRole('row').filter({ hasText: rowText }).first()
  const menu = iconButton(row, 'ellipsis').or(iconButton(row, 'more-horizontal')).or(iconButton(row, 'more-vertical')).first()
  await menu.click()
  return row
}
