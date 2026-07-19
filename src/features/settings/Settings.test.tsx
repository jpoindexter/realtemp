import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { Settings } from './Settings'

const valencia = { label: 'Valencia', latitude: 39.47, longitude: -0.376 }

afterEach(() => {
  cleanup()
})

describe('Settings', () => {
  it('keeps appearance choices in settings as explicit controls', () => {
    const onSetTheme = vi.fn()
    const onSetStyle = vi.fn()

    render(
      <Settings
        unit="c"
        onSetUnit={() => {}}
        theme="light"
        onSetTheme={onSetTheme}
        style="soft"
        onSetStyle={onSetStyle}
        location={valencia}
        onChangeLocation={() => {}}
        onBack={() => {}}
      />,
    )

    fireEvent.click(screen.getByLabelText('Dark'))
    expect(onSetTheme).toHaveBeenCalledWith('dark')

    fireEvent.click(screen.getByLabelText('Signal'))
    expect(onSetStyle).toHaveBeenCalledWith('signal')
  })
})
