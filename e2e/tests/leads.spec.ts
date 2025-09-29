import { test, expect } from '../fixtures/auth'

test.describe('Lead Management', () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    // Navigate to leads page
    await authenticatedPage.goto('/leads')
    await expect(
      authenticatedPage.locator('[data-testid="leads-page"]')
    ).toBeVisible()
  })

  test('should display leads list', async ({ authenticatedPage }) => {
    // Check if leads table is visible
    await expect(
      authenticatedPage.locator('[data-testid="leads-table"]')
    ).toBeVisible()

    // Check table headers
    await expect(authenticatedPage.locator('th:has-text("Name")')).toBeVisible()
    await expect(
      authenticatedPage.locator('th:has-text("Email")')
    ).toBeVisible()
    await expect(
      authenticatedPage.locator('th:has-text("Company")')
    ).toBeVisible()
    await expect(
      authenticatedPage.locator('th:has-text("Status")')
    ).toBeVisible()
    await expect(
      authenticatedPage.locator('th:has-text("Priority")')
    ).toBeVisible()
    await expect(
      authenticatedPage.locator('th:has-text("Value")')
    ).toBeVisible()
  })

  test('should create a new lead', async ({ authenticatedPage }) => {
    // Click create lead button
    await authenticatedPage.click('[data-testid="create-lead-button"]')

    // Verify form is open
    await expect(
      authenticatedPage.locator('[data-testid="lead-form"]')
    ).toBeVisible()

    // Fill lead form
    await authenticatedPage.fill('[data-testid="lead-name-input"]', 'John Doe')
    await authenticatedPage.fill(
      '[data-testid="lead-email-input"]',
      'john.doe@example.com'
    )
    await authenticatedPage.fill(
      '[data-testid="lead-phone-input"]',
      '+1234567890'
    )
    await authenticatedPage.fill(
      '[data-testid="lead-company-input"]',
      'Example Corp'
    )
    await authenticatedPage.fill('[data-testid="lead-value-input"]', '5000')
    await authenticatedPage.fill('[data-testid="lead-source-input"]', 'website')

    // Select status
    await authenticatedPage.click('[data-testid="lead-status-select"]')
    await authenticatedPage.click('[data-testid="status-option-new"]')

    // Select priority
    await authenticatedPage.click('[data-testid="lead-priority-select"]')
    await authenticatedPage.click('[data-testid="priority-option-high"]')

    // Save lead
    await authenticatedPage.click('[data-testid="save-lead-button"]')

    // Verify lead was created
    await expect(
      authenticatedPage.locator('[data-testid="success-message"]')
    ).toContainText('Lead created successfully')

    // Verify lead appears in table
    await expect(
      authenticatedPage.locator('[data-testid="leads-table"]')
    ).toContainText('John Doe')
    await expect(
      authenticatedPage.locator('[data-testid="leads-table"]')
    ).toContainText('john.doe@example.com')
    await expect(
      authenticatedPage.locator('[data-testid="leads-table"]')
    ).toContainText('Example Corp')
  })

  test('should validate required fields when creating lead', async ({
    authenticatedPage,
  }) => {
    await authenticatedPage.click('[data-testid="create-lead-button"]')

    // Try to save without required fields
    await authenticatedPage.click('[data-testid="save-lead-button"]')

    // Check for validation errors
    await expect(
      authenticatedPage.locator('[data-testid="name-error"]')
    ).toContainText('Name is required')
    await expect(
      authenticatedPage.locator('[data-testid="source-error"]')
    ).toContainText('Source is required')
  })

  test('should validate email format', async ({ authenticatedPage }) => {
    await authenticatedPage.click('[data-testid="create-lead-button"]')

    await authenticatedPage.fill('[data-testid="lead-name-input"]', 'Test Lead')
    await authenticatedPage.fill(
      '[data-testid="lead-email-input"]',
      'invalid-email'
    )
    await authenticatedPage.fill('[data-testid="lead-source-input"]', 'test')
    await authenticatedPage.click('[data-testid="save-lead-button"]')

    await expect(
      authenticatedPage.locator('[data-testid="email-error"]')
    ).toContainText('Invalid email format')
  })

  test('should edit an existing lead', async ({ authenticatedPage }) => {
    // First create a lead to edit
    await authenticatedPage.click('[data-testid="create-lead-button"]')
    await authenticatedPage.fill(
      '[data-testid="lead-name-input"]',
      'Original Name'
    )
    await authenticatedPage.fill(
      '[data-testid="lead-email-input"]',
      'original@example.com'
    )
    await authenticatedPage.fill('[data-testid="lead-source-input"]', 'test')
    await authenticatedPage.click('[data-testid="save-lead-button"]')

    // Wait for lead to appear in table
    await expect(
      authenticatedPage.locator('[data-testid="leads-table"]')
    ).toContainText('Original Name')

    // Click edit button for the lead
    await authenticatedPage.click(
      '[data-testid="lead-row"]:has-text("Original Name") [data-testid="edit-button"]'
    )

    // Update lead information
    await authenticatedPage.fill(
      '[data-testid="lead-name-input"]',
      'Updated Name'
    )
    await authenticatedPage.fill(
      '[data-testid="lead-company-input"]',
      'Updated Company'
    )
    await authenticatedPage.click('[data-testid="save-lead-button"]')

    // Verify lead was updated
    await expect(
      authenticatedPage.locator('[data-testid="success-message"]')
    ).toContainText('Lead updated successfully')
    await expect(
      authenticatedPage.locator('[data-testid="leads-table"]')
    ).toContainText('Updated Name')
    await expect(
      authenticatedPage.locator('[data-testid="leads-table"]')
    ).toContainText('Updated Company')
  })

  test('should delete a lead', async ({ authenticatedPage }) => {
    // First create a lead to delete
    await authenticatedPage.click('[data-testid="create-lead-button"]')
    await authenticatedPage.fill('[data-testid="lead-name-input"]', 'To Delete')
    await authenticatedPage.fill(
      '[data-testid="lead-email-input"]',
      'delete@example.com'
    )
    await authenticatedPage.fill('[data-testid="lead-source-input"]', 'test')
    await authenticatedPage.click('[data-testid="save-lead-button"]')

    // Wait for lead to appear
    await expect(
      authenticatedPage.locator('[data-testid="leads-table"]')
    ).toContainText('To Delete')

    // Click delete button
    await authenticatedPage.click(
      '[data-testid="lead-row"]:has-text("To Delete") [data-testid="delete-button"]'
    )

    // Confirm deletion
    await expect(
      authenticatedPage.locator('[data-testid="delete-confirmation"]')
    ).toBeVisible()
    await authenticatedPage.click('[data-testid="confirm-delete-button"]')

    // Verify lead was deleted
    await expect(
      authenticatedPage.locator('[data-testid="success-message"]')
    ).toContainText('Lead deleted successfully')
    await expect(
      authenticatedPage.locator('[data-testid="leads-table"]')
    ).not.toContainText('To Delete')
  })

  test('should search leads', async ({ authenticatedPage }) => {
    // Create multiple leads for search testing
    const leads = [
      {
        name: 'Alice Johnson',
        email: 'alice@example.com',
        company: 'Tech Corp',
      },
      { name: 'Bob Smith', email: 'bob@sample.com', company: 'Marketing Inc' },
      {
        name: 'Charlie Brown',
        email: 'charlie@test.com',
        company: 'Sales LLC',
      },
    ]

    for (const lead of leads) {
      await authenticatedPage.click('[data-testid="create-lead-button"]')
      await authenticatedPage.fill('[data-testid="lead-name-input"]', lead.name)
      await authenticatedPage.fill(
        '[data-testid="lead-email-input"]',
        lead.email
      )
      await authenticatedPage.fill(
        '[data-testid="lead-company-input"]',
        lead.company
      )
      await authenticatedPage.fill('[data-testid="lead-source-input"]', 'test')
      await authenticatedPage.click('[data-testid="save-lead-button"]')
      await authenticatedPage.waitForTimeout(500) // Small delay between creations
    }

    // Search for specific lead
    await authenticatedPage.fill('[data-testid="search-input"]', 'Alice')
    await authenticatedPage.click('[data-testid="search-button"]')

    // Verify search results
    await expect(
      authenticatedPage.locator('[data-testid="leads-table"]')
    ).toContainText('Alice Johnson')
    await expect(
      authenticatedPage.locator('[data-testid="leads-table"]')
    ).not.toContainText('Bob Smith')
    await expect(
      authenticatedPage.locator('[data-testid="leads-table"]')
    ).not.toContainText('Charlie Brown')

    // Clear search
    await authenticatedPage.fill('[data-testid="search-input"]', '')
    await authenticatedPage.click('[data-testid="search-button"]')

    // All leads should be visible again
    await expect(
      authenticatedPage.locator('[data-testid="leads-table"]')
    ).toContainText('Alice Johnson')
    await expect(
      authenticatedPage.locator('[data-testid="leads-table"]')
    ).toContainText('Bob Smith')
    await expect(
      authenticatedPage.locator('[data-testid="leads-table"]')
    ).toContainText('Charlie Brown')
  })

  test('should filter leads by status', async ({ authenticatedPage }) => {
    // Create leads with different statuses
    await authenticatedPage.click('[data-testid="create-lead-button"]')
    await authenticatedPage.fill('[data-testid="lead-name-input"]', 'New Lead')
    await authenticatedPage.fill('[data-testid="lead-source-input"]', 'test')
    await authenticatedPage.click('[data-testid="lead-status-select"]')
    await authenticatedPage.click('[data-testid="status-option-new"]')
    await authenticatedPage.click('[data-testid="save-lead-button"]')

    await authenticatedPage.click('[data-testid="create-lead-button"]')
    await authenticatedPage.fill(
      '[data-testid="lead-name-input"]',
      'Contacted Lead'
    )
    await authenticatedPage.fill('[data-testid="lead-source-input"]', 'test')
    await authenticatedPage.click('[data-testid="lead-status-select"]')
    await authenticatedPage.click('[data-testid="status-option-contacted"]')
    await authenticatedPage.click('[data-testid="save-lead-button"]')

    // Filter by status
    await authenticatedPage.click('[data-testid="status-filter"]')
    await authenticatedPage.click('[data-testid="filter-option-new"]')

    // Verify filtered results
    await expect(
      authenticatedPage.locator('[data-testid="leads-table"]')
    ).toContainText('New Lead')
    await expect(
      authenticatedPage.locator('[data-testid="leads-table"]')
    ).not.toContainText('Contacted Lead')
  })

  test('should convert lead to contact', async ({ authenticatedPage }) => {
    // Create a lead to convert
    await authenticatedPage.click('[data-testid="create-lead-button"]')
    await authenticatedPage.fill(
      '[data-testid="lead-name-input"]',
      'Convert Me'
    )
    await authenticatedPage.fill(
      '[data-testid="lead-email-input"]',
      'convert@example.com'
    )
    await authenticatedPage.fill(
      '[data-testid="lead-company-input"]',
      'Convert Corp'
    )
    await authenticatedPage.fill('[data-testid="lead-source-input"]', 'test')
    await authenticatedPage.click('[data-testid="save-lead-button"]')

    // Find and convert the lead
    await authenticatedPage.click(
      '[data-testid="lead-row"]:has-text("Convert Me") [data-testid="convert-button"]'
    )

    // Fill conversion form
    await expect(
      authenticatedPage.locator('[data-testid="conversion-form"]')
    ).toBeVisible()
    await authenticatedPage.click('[data-testid="contact-category-select"]')
    await authenticatedPage.click('[data-testid="category-option-client"]')
    await authenticatedPage.fill('[data-testid="total-revenue-input"]', '10000')
    await authenticatedPage.click('[data-testid="confirm-conversion-button"]')

    // Verify conversion success
    await expect(
      authenticatedPage.locator('[data-testid="success-message"]')
    ).toContainText('Lead converted to contact')

    // Verify lead is marked as converted
    await expect(
      authenticatedPage.locator(
        '[data-testid="lead-row"]:has-text("Convert Me")'
      )
    ).toContainText('Converted')
  })

  test('should handle bulk operations', async ({ authenticatedPage }) => {
    // Create multiple leads
    const leadNames = ['Bulk Lead 1', 'Bulk Lead 2', 'Bulk Lead 3']

    for (const name of leadNames) {
      await authenticatedPage.click('[data-testid="create-lead-button"]')
      await authenticatedPage.fill('[data-testid="lead-name-input"]', name)
      await authenticatedPage.fill('[data-testid="lead-source-input"]', 'test')
      await authenticatedPage.click('[data-testid="save-lead-button"]')
    }

    // Select multiple leads
    await authenticatedPage.check('[data-testid="select-all-checkbox"]')

    // Verify all leads are selected
    for (const name of leadNames) {
      await expect(
        authenticatedPage.locator(
          `[data-testid="lead-row"]:has-text("${name}") input[type="checkbox"]`
        )
      ).toBeChecked()
    }

    // Perform bulk action
    await authenticatedPage.click('[data-testid="bulk-actions-button"]')
    await authenticatedPage.click('[data-testid="bulk-delete-option"]')
    await authenticatedPage.click('[data-testid="confirm-bulk-delete"]')

    // Verify bulk deletion
    await expect(
      authenticatedPage.locator('[data-testid="success-message"]')
    ).toContainText('3 leads deleted')
    for (const name of leadNames) {
      await expect(
        authenticatedPage.locator('[data-testid="leads-table"]')
      ).not.toContainText(name)
    }
  })

  test('should handle pagination', async ({ authenticatedPage }) => {
    // This test assumes pagination is implemented
    // Create enough leads to trigger pagination (if implemented)

    // Check pagination controls
    if (
      await authenticatedPage.locator('[data-testid="pagination"]').isVisible()
    ) {
      await expect(
        authenticatedPage.locator('[data-testid="page-info"]')
      ).toBeVisible()
      await expect(
        authenticatedPage.locator('[data-testid="next-page-button"]')
      ).toBeVisible()
      await expect(
        authenticatedPage.locator('[data-testid="prev-page-button"]')
      ).toBeVisible()

      // Test page navigation
      if (
        await authenticatedPage
          .locator('[data-testid="next-page-button"]')
          .isEnabled()
      ) {
        await authenticatedPage.click('[data-testid="next-page-button"]')
        await expect(
          authenticatedPage.locator('[data-testid="page-info"]')
        ).toContainText('Page 2')
      }
    }
  })

  test('should export leads data', async ({ authenticatedPage }) => {
    // Create a lead for export
    await authenticatedPage.click('[data-testid="create-lead-button"]')
    await authenticatedPage.fill(
      '[data-testid="lead-name-input"]',
      'Export Lead'
    )
    await authenticatedPage.fill(
      '[data-testid="lead-email-input"]',
      'export@example.com'
    )
    await authenticatedPage.fill('[data-testid="lead-source-input"]', 'test')
    await authenticatedPage.click('[data-testid="save-lead-button"]')

    // Start download
    const downloadPromise = authenticatedPage.waitForEvent('download')
    await authenticatedPage.click('[data-testid="export-button"]')
    await authenticatedPage.click('[data-testid="export-csv-option"]')

    const download = await downloadPromise
    expect(download.suggestedFilename()).toContain('leads')
    expect(download.suggestedFilename()).toContain('.csv')
  })
})
