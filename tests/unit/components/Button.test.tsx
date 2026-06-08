import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from '@/components/ui/button'

describe('Button Component', () => {
  it('renders correctly with text', () => {
    render(<Button>Click me</Button>)

    const button = screen.getByRole('button')
    expect(button).toBeInTheDocument()
    expect(button).toHaveTextContent('Click me')
  })

  it('handles click events', async () => {
    const user = userEvent.setup()
    const handleClick = jest.fn()

    render(<Button onClick={handleClick}>Click me</Button>)

    const button = screen.getByRole('button')
    await user.click(button)

    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('applies correct variant classes', () => {
    render(<Button variant="destructive">Delete</Button>)

    const button = screen.getByRole('button')
    expect(button).toHaveClass('bg-destructive')
  })

  it('applies correct size classes', () => {
    render(<Button size="lg">Large Button</Button>)

    const button = screen.getByRole('button')
    expect(button).toHaveClass('h-11')
  })

  it('is disabled when disabled prop is true', () => {
    render(<Button disabled>Disabled Button</Button>)

    const button = screen.getByRole('button')
    expect(button).toBeDisabled()
  })

  it('does not call onClick when disabled', async () => {
    const user = userEvent.setup()
    const handleClick = jest.fn()

    render(
      <Button disabled onClick={handleClick}>
        Disabled Button
      </Button>
    )

    const button = screen.getByRole('button')
    await user.click(button)

    expect(handleClick).not.toHaveBeenCalled()
  })

  it('renders as child component when asChild is true', () => {
    render(
      <Button asChild>
        <a href="/">Link Button</a>
      </Button>
    )

    const link = screen.getByRole('link')
    expect(link).toBeInTheDocument()
    expect(link).toHaveTextContent('Link Button')
    expect(link).toHaveAttribute('href', '/')
  })

  it('forwards ref correctly', () => {
    const ref = jest.fn()

    render(<Button ref={ref}>Button with ref</Button>)

    expect(ref).toHaveBeenCalled()
  })

  it('applies custom className', () => {
    render(<Button className="custom-class">Custom Button</Button>)

    const button = screen.getByRole('button')
    expect(button).toHaveClass('custom-class')
  })

  it('supports all HTML button attributes', () => {
    render(
      <Button
        type="submit"
        form="test-form"
        aria-label="Submit form"
        data-testid="submit-button"
      >
        Submit
      </Button>
    )

    const button = screen.getByRole('button')
    expect(button).toHaveAttribute('type', 'submit')
    expect(button).toHaveAttribute('form', 'test-form')
    expect(button).toHaveAttribute('aria-label', 'Submit form')
    expect(button).toHaveAttribute('data-testid', 'submit-button')
  })

  describe('Variant styles', () => {
    const variants = [
      'default',
      'destructive',
      'outline',
      'secondary',
      'ghost',
      'link',
    ] as const

    variants.forEach(variant => {
      it(`renders ${variant} variant correctly`, () => {
        render(<Button variant={variant}>{variant} button</Button>)

        const button = screen.getByRole('button')
        expect(button).toBeInTheDocument()
        expect(button).toHaveTextContent(`${variant} button`)
      })
    })
  })

  describe('Size styles', () => {
    const sizes = ['default', 'sm', 'lg', 'icon'] as const

    sizes.forEach(size => {
      it(`renders ${size} size correctly`, () => {
        render(<Button size={size}>{size} button</Button>)

        const button = screen.getByRole('button')
        expect(button).toBeInTheDocument()
      })
    })
  })

  describe('Accessibility', () => {
    it('has proper ARIA attributes when disabled', () => {
      render(<Button disabled>Disabled Button</Button>)

      const button = screen.getByRole('button')
      expect(button).toBeDisabled()
    })

    it('is focusable by keyboard', async () => {
      const user = userEvent.setup()
      render(<Button>Focusable Button</Button>)

      const button = screen.getByRole('button')
      await user.tab()

      expect(button).toHaveFocus()
    })

    it('can be activated by Enter key', async () => {
      const user = userEvent.setup()
      const handleClick = jest.fn()

      render(<Button onClick={handleClick}>Enter Button</Button>)

      const button = screen.getByRole('button')
      button.focus()
      await user.keyboard('{Enter}')

      expect(handleClick).toHaveBeenCalledTimes(1)
    })

    it('can be activated by Space key', async () => {
      const user = userEvent.setup()
      const handleClick = jest.fn()

      render(<Button onClick={handleClick}>Space Button</Button>)

      const button = screen.getByRole('button')
      button.focus()
      await user.keyboard(' ')

      expect(handleClick).toHaveBeenCalledTimes(1)
    })
  })
})
