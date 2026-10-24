import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import Select from './Select'

afterEach(() => {

  cleanup()
  vi.restoreAllMocks()

})
const options = [
  { value: 'a', label: 'Amihan' },
  { value: 'x', label: 'Unavailable', disabled: true },
  { value: 'h', label: 'Habagat' },
  { value: 'm', label: 'Manual' },
]

describe('custom single-select', () => {

  it('skips disabled options, commits by keyboard, and keeps focus', () => {

    const change = vi.fn()

    render(<Select label="Wind" value="a" options={options} onChange={change} />)
    const control = screen.getByRole('combobox')

    control.focus()
    fireEvent.keyDown(control, { key: 'ArrowDown' })
    fireEvent.keyDown(control, { key: 'ArrowDown' })
    fireEvent.keyDown(control, { key: 'Enter' })
    expect(change).toHaveBeenCalledWith('h')
    expect(document.activeElement).toBe(control)
    expect(screen.queryByRole('listbox')).toBeNull()

  })
  it('supports Home, End, typeahead and Escape without committing', () => {

    const change = vi.fn()

    render(<Select label="Wind" value="a" options={options} onChange={change} />)
    const control = screen.getByRole('combobox')

    fireEvent.keyDown(control, { key: 'End' })
    expect(control.getAttribute('aria-activedescendant')).toMatch(/-3$/)
    fireEvent.keyDown(control, { key: 'Home' })
    expect(control.getAttribute('aria-activedescendant')).toMatch(/-0$/)
    fireEvent.keyDown(control, { key: 'h' })
    expect(control.getAttribute('aria-activedescendant')).toMatch(/-2$/)
    fireEvent.keyDown(control, { key: 'Escape' })
    expect(change).not.toHaveBeenCalled()
    expect(control.getAttribute('aria-expanded')).toBe('false')

  })
  it('dismisses on Tab and outside pointer while allowing pointer selection', () => {

    const change = vi.fn()

    render(<Select label="Wind" value="a" options={options} onChange={change} />)
    const control = screen.getByRole('combobox')

    fireEvent.click(control)
    fireEvent.click(screen.getByRole('option', { name: 'Manual' }))
    expect(change).toHaveBeenCalledWith('m')
    fireEvent.click(control)
    fireEvent.keyDown(control, { key: 'Tab' })
    expect(screen.queryByRole('listbox')).toBeNull()
    fireEvent.click(control)
    fireEvent.pointerDown(document.body)
    expect(screen.queryByRole('listbox')).toBeNull()

  })
  it('opens a long location list above a low trigger and keeps it inside the viewport', () => {

    render(
      <Select
        label="Location"
        value="0"
        options={Array.from({ length: 123 }, (_, i) => ({
          value: String(i),
          label: `Location ${i}`,
        }))}
        onChange={vi.fn()}
      />,
    )
    const control = screen.getByRole('combobox')

    vi.spyOn(control, 'getBoundingClientRect').mockReturnValue({
      top: window.innerHeight - 244,
      bottom: window.innerHeight - 200,
      left: 30,
      width: 240,
    } as DOMRect)
    fireEvent.click(control)
    const style = (screen.getByRole('listbox').parentElement as HTMLElement).style

    expect(style.top).toBe('')
    expect(Number.parseFloat(style.bottom)).toBe(248)
    expect(Number.parseFloat(style.maxHeight)).toBeLessThanOrEqual(window.innerHeight - 256)

  })

})
