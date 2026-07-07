import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { WarningBanner } from './WarningBanner'

afterEach(cleanup)

describe('WarningBanner', () => {
  it('renders nothing when there are no warnings — no empty chrome', () => {
    const { container } = render(<WarningBanner warnings={[]} />)
    expect(container.firstChild).toBeNull()
  })

  it('gives danger an assertive role so screen readers interrupt for it, caution a polite one', () => {
    render(
      <WarningBanner
        warnings={[
          { id: 'heat', level: 'danger', text: 'Dangerous heat.' },
          { id: 'wind', level: 'caution', text: 'Strong wind.' },
        ]}
      />,
    )
    expect(screen.getByRole('alert').textContent).toContain('Dangerous heat.')
    expect(screen.getByRole('status').textContent).toContain('Strong wind.')
  })
})
