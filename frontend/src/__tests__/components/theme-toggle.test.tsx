import { render, screen, fireEvent } from '@testing-library/react'
import { ThemeProvider } from 'next-themes'
import { ThemeToggle } from '@/components/theme-toggle'

// Mock next-themes
jest.mock('next-themes', () => ({
  useTheme: jest.fn(() => ({
    theme: 'light',
    setTheme: jest.fn(),
  })),
  ThemeProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

describe('ThemeToggle', () => {
  it('renders theme toggle button', () => {
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    )

    const button = screen.getByRole('button', { name: /toggle theme/i })
    expect(button).toBeInTheDocument()
  })

  it('toggles between light and dark theme', () => {
    const mockSetTheme = jest.fn()
    const { useTheme } = require('next-themes')
    useTheme.mockReturnValue({
      theme: 'light',
      setTheme: mockSetTheme,
    })

    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    )

    const button = screen.getByRole('button', { name: /toggle theme/i })
    
    // Click to switch to dark
    fireEvent.click(button)
    expect(mockSetTheme).toHaveBeenCalledWith('dark')

    // Update mock to return dark theme
    useTheme.mockReturnValue({
      theme: 'dark',
      setTheme: mockSetTheme,
    })

    // Click to switch to light
    fireEvent.click(button)
    expect(mockSetTheme).toHaveBeenCalledWith('light')
  })

  it('shows sun icon for light theme', () => {
    const { useTheme } = require('next-themes')
    useTheme.mockReturnValue({
      theme: 'light',
      setTheme: jest.fn(),
    })

    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    )

    // Sun icon should be visible in light theme
    const sunIcon = screen.getByTestId('sun-icon')
    expect(sunIcon).toBeInTheDocument()
  })

  it('shows moon icon for dark theme', () => {
    const { useTheme } = require('next-themes')
    useTheme.mockReturnValue({
      theme: 'dark',
      setTheme: jest.fn(),
    })

    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    )

    // Moon icon should be visible in dark theme
    const moonIcon = screen.getByTestId('moon-icon')
    expect(moonIcon).toBeInTheDocument()
  })
})