import { afterEach, describe, expect, it, vi } from 'vitest'

import { getHealth } from './health'

afterEach(() => vi.unstubAllGlobals())

describe('Python health connection', () => {
  it('reads the actual health contract and forwards cancellation', async () => {
    const value = {
      status: 'ok',
      service: 'ABO',
      version: '0.1.0',
      model_status: 'implemented',
      validation_status: 'not_historically_validated',
    }
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(value)))
    vi.stubGlobal('fetch', fetchMock)
    const controller = new AbortController()

    await expect(getHealth(controller.signal)).resolves.toEqual(value)
    expect(fetchMock).toHaveBeenCalledWith('/api/health', { signal: controller.signal })
  })

  it('rejects an unavailable backend instead of treating it as connected', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 503 })))
    await expect(getHealth()).rejects.toThrow('HTTP 503')
  })

  it('rejects a response that misrepresents an implemented model', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ status: 'ok', model_status: 'ready' }))),
    )
    await expect(getHealth()).rejects.toThrow('unexpected health response')
  })
})
