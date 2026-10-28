import { test, expect } from '@playwright/test'

const MODULES: Array<[string, string]> = [
  ['/dashboard', 'Dashboard'],
  ['/leads', 'Leads'],
  ['/leads/statuses', 'Lead Statuses'],
  ['/leads/tags', 'Tags'],
  ['/contacts', 'Contacts'],
  ['/deals', 'Deals'],
  ['/invoices', 'Invoices'],
  ['/quotations', 'Quotations'],
  ['/webhooks', 'Webhooks & Integrations'],
  ['/hr', 'HR'],
  ['/employees', 'Employees'],
  ['/attendance', 'Attendance'],
  ['/leaves', 'Leaves'],
  ['/assets', 'Assets'],
  ['/engines', 'Engines'],
  ['/chat', 'Chat'],
  ['/calendar', 'Calendar'],
  ['/referrals', 'Referrals'],
  ['/sms', 'SMS'],
  ['/whatsapp', 'WhatsApp'],
  ['/calls', 'Calls'],
  ['/email', 'Email'],
  ['/email-sequences', 'Sequences'],
  ['/campaigns', 'Campaigns'],
  ['/linkedin', 'LinkedIn'],
  ['/social-media', 'Social Media'],
  ['/appointments', 'Appointments'],
  ['/inventory', 'Inventory'],
  ['/projects', 'Projects'],
  ['/projects/tasks', 'Tasks'],
  ['/projects/members', 'Members'],
  ['/projects/documents', 'Documents'],
  ['/blogs', 'Blog'],
  ['/compliance', 'Compliance'],
  ['/notifications', 'Notifications'],
  ['/plans', 'Plans'],
  ['/settings', 'Settings'],
  ['/workspace', 'Workspace'],
  ['/roles', 'Roles'],
]

for (const [path, label] of MODULES) {
  test(`smoke: ${label} (${path}) renders without client errors`, async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', err => errors.push(err.message))
    const failed: string[] = []
    page.on('response', res => {
      if (res.url().includes('/api/') && res.status() >= 500) failed.push(`${res.status()} ${res.request().method()} ${new URL(res.url()).pathname}`)
    })

    await page.goto(path)
    await page.waitForLoadState('networkidle')
    await expect(page).not.toHaveURL(/\/login/)
    await expect(page.locator('main')).toBeVisible()
    await page.waitForTimeout(1500)

    expect(errors, `client errors on ${path}`).toEqual([])
    expect(failed, `5xx responses on ${path}`).toEqual([])
  })
}

test('smoke: FMCG module is disabled', async ({ page }) => {
  await page.goto('/fmcg')
  await page.waitForURL(/\/dashboard/)
  await expect(page.getByRole('link', { name: /^fmcg$/i })).toHaveCount(0)
})
