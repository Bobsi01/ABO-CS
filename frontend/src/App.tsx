import { useEffect, useRef, useState } from 'react'

import { getHealth } from './api/health'
import type { HealthResponse } from './api/health'

type Connection =
  | { state: 'idle' }
  | { state: 'loading' }
  | { state: 'connected'; health: HealthResponse }
  | { state: 'error'; message: string }

export default function App() {
  const [connection, setConnection] = useState<Connection>({ state: 'idle' })
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const request = useRef<AbortController | null>(null)

  useEffect(() => () => request.current?.abort(), [])

  async function checkConnection() {
    request.current?.abort()
    const controller = new AbortController()
    request.current = controller
    const timeout = window.setTimeout(() => controller.abort(), 8000)
    setConnection({ state: 'loading' })

    try {
      const health = await getHealth(controller.signal)
      if (request.current === controller) setConnection({ state: 'connected', health })
    } catch (error) {
      if (request.current !== controller) return
      setConnection({
        state: 'error',
        message: controller.signal.aborted
          ? 'The Python connection timed out. Start the backend and check again.'
          : `${error instanceof Error ? error.message : 'Connection failed.'} Start the Python backend and check again.`,
      })
    } finally {
      window.clearTimeout(timeout)
    }
  }

  return (
    <div className="application" data-theme={theme}>
      <main>
        <header>
          <p className="course">CSE 103 · Computational Science</p>
          <h1>ABO</h1>
          <p className="description">Gaussian plume ashfall dispersion simulator</p>
          <p className="draft">Development starter: draft without direction.</p>
        </header>

        <section aria-labelledby="connection-heading">
          <h2 id="connection-heading">Connect React to Python</h2>
          <p>Check the local API before developing the numerical model.</p>
          <div className="connection-status" role="status" aria-live="polite">
            {connection.state === 'idle' && <p>Python connection has not been checked yet.</p>}
            {connection.state === 'loading' && <p>Checking the local Python API...</p>}
            {connection.state === 'connected' && (
              <p>Python API connected. {connection.health.service} API version {connection.health.version}.</p>
            )}
            {connection.state === 'error' && <p>{connection.message}</p>}
          </div>
          <button type="button" onClick={checkConnection} disabled={connection.state === 'loading'}>
            {connection.state === 'loading' ? 'Checking connection...' : 'Check Python connection'}
          </button>
        </section>

        <section aria-labelledby="simulation-heading">
          <h2 id="simulation-heading">Simulation is not implemented</h2>
          <p>
            No ashfall results are available. The next step is to document the deposition equations
            and manually curate the input sources. The map and municipality exposure table will
            follow that scientific specification.
          </p>
          <p className="academic">Academic simulation only. This is not a PHIVOLCS hazard advisory.</p>
        </section>

        <footer>
          <a href="https://docs.google.com/document/d/1dH4wl1l9PFE1Xj4CuJtWXPDA4vmmEpcGoh9cSXctCxg/edit?tab=t.if8cv8e8e5un">
            Read the project proposal
          </a>
          <button
            className="theme-button"
            type="button"
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
          >
            Use {theme === 'light' ? 'dark' : 'light'} theme
          </button>
        </footer>
      </main>
    </div>
  )
}
