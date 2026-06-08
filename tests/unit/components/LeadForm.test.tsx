import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders, createMockStore } from '../../helpers/testUtils'
import { LeadForm } from '@/components/leads/LeadForm'

// Mock the API hooks
jest.mock('@/lib/api/mongoApi', () => ({
  useCreateLeadMutation: () => [
    jest
      .fn()
      .mockImplementation(() =>
        Promise.resolve({ unwrap: () => Promise.resolve({ id: 'test-lead' }) })
      ),
    { isLoading: false, error: null },
  ],
  useGetLeadStatusesQuery: () => ({
    data: {
      statuses: [
        { _id: 'status-1', name: 'New', color: '#3b82f6' },
        { _id: 'status-2', name: 'Contacted', color: '#10b981' },
      ],
    },
    isLoading: false,
    error: null,
  }),
  useGetTagsQuery: () => ({
    data: {
      tags: [
        { _id: 'tag-1', name: 'Hot Lead', color: '#ef4444' },
        { _id: 'tag-2', name: 'Enterprise', color: '#8b5cf6' },
      ],
    },
    isLoading: false,
    error: null,
  }),
}))

describe('LeadForm Component', () => {
  const mockOnSubmit = jest.fn()
  const mockOnCancel = jest.fn()

  const defaultProps = {
    onSubmit: mockOnSubmit,
    onCancel: mockOnCancel,
    isLoading: false,
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders all form fields', () => {
    renderWithProviders(<LeadForm {...defaultProps} />)

    expect(screen.getByLabelText(/name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/phone/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/company/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/status/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/priority/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/value/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/source/i)).toBeInTheDocument()

    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
  })

  it('submits form with valid data', async () => {
    const user = userEvent.setup()
    renderWithProviders(<LeadForm {...defaultProps} />)

    await user.type(screen.getByLabelText(/name/i), 'John Doe')
    await user.type(screen.getByLabelText(/email/i), 'john@example.com')
    await user.type(screen.getByLabelText(/phone/i), '+1234567890')
    await user.type(screen.getByLabelText(/company/i), 'Example Corp')
    await user.type(screen.getByLabelText(/value/i), '5000')
    await user.type(screen.getByLabelText(/source/i), 'website')

    await user.click(screen.getByRole('button', { name: /save/i }))

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'John Doe',
          email: 'john@example.com',
          phone: '+1234567890',
          company: 'Example Corp',
          value: 5000,
          source: 'website',
        })
      )
    })
  })

  it('shows validation errors for invalid data', async () => {
    const user = userEvent.setup()
    renderWithProviders(<LeadForm {...defaultProps} />)

    await user.click(screen.getByRole('button', { name: /save/i }))

    await waitFor(() => {
      expect(screen.getByText(/name is required/i)).toBeInTheDocument()
    })

    expect(mockOnSubmit).not.toHaveBeenCalled()
  })

  it('validates email format', async () => {
    const user = userEvent.setup()
    renderWithProviders(<LeadForm {...defaultProps} />)

    await user.type(screen.getByLabelText(/name/i), 'John Doe')
    await user.type(screen.getByLabelText(/email/i), 'invalid-email')

    await user.click(screen.getByRole('button', { name: /save/i }))

    await waitFor(() => {
      expect(screen.getByText(/invalid email/i)).toBeInTheDocument()
    })
  })

  it('calls onCancel when cancel button is clicked', async () => {
    const user = userEvent.setup()
    renderWithProviders(<LeadForm {...defaultProps} />)

    await user.click(screen.getByRole('button', { name: /cancel/i }))

    expect(mockOnCancel).toHaveBeenCalledTimes(1)
  })

  it('shows loading state when isLoading is true', () => {
    renderWithProviders(<LeadForm {...defaultProps} isLoading={true} />)

    const saveButton = screen.getByRole('button', { name: /save/i })
    expect(saveButton).toBeDisabled()
    expect(screen.getByText(/saving/i)).toBeInTheDocument()
  })

  it('populates form when editing existing lead', () => {
    const existingLead = {
      _id: 'lead-1',
      name: 'Existing Lead',
      email: 'existing@example.com',
      phone: '+1987654321',
      company: 'Existing Corp',
      status: 'contacted',
      priority: 'high',
      value: 10000,
      source: 'referral',
    }

    renderWithProviders(
      <LeadForm {...defaultProps} initialData={existingLead} />
    )

    expect(screen.getByDisplayValue('Existing Lead')).toBeInTheDocument()
    expect(screen.getByDisplayValue('existing@example.com')).toBeInTheDocument()
  })
})
