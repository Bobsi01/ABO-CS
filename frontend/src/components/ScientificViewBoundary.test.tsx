import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import ScientificViewBoundary from './ScientificViewBoundary'

afterEach(() => {

  cleanup()
  vi.restoreAllMocks()

})
it('contains a view failure without removing the completed result or controls', () => {

  vi.spyOn(console, 'error').mockImplementation(() => {})
  let fail = true
  const onFailure = vi.fn(),
    onRecovery = vi.fn()

  function FailedView() {

    if (fail) throw new Error('Dynamic import unavailable')

    return <p>Recovered view</p>

  }

  render(
    <>
      <button>Run simulation</button>
      <ScientificViewBoundary onFailure={onFailure} onRecovery={onRecovery}>
        <FailedView />
      </ScientificViewBoundary>
      <table>
        <tbody>
          <tr>
            <td>Completed scientific result</td>
          </tr>
        </tbody>
      </table>
    </>,
  )
  expect(screen.getByRole('alert').textContent).toContain('This view could not load')
  expect(screen.getByRole('button', { name: 'Retry this view' })).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Run simulation' })).toBeTruthy()
  expect(screen.getByText('Completed scientific result')).toBeTruthy()
  expect(onFailure).toHaveBeenCalledOnce()
  fail = false
  fireEvent.click(screen.getByRole('button', { name: 'Retry this view' }))
  expect(onRecovery).toHaveBeenCalledOnce()
  expect(screen.getByText('Recovered view')).toBeTruthy()
  expect(screen.getByText('Completed scientific result')).toBeTruthy()

})
