import type { components } from './schema'

export type HealthResponse = components['schemas']['HealthResponse']

function isHealthResponse(value: unknown): value is HealthResponse {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Record<string, unknown>
  return (
    candidate.status === 'ok' &&
    candidate.service === 'ABO' &&
    typeof candidate.version === 'string' &&
    candidate.version.length > 0 &&
    candidate.model_status === 'implemented' &&
    candidate.validation_status === 'not_historically_validated'
  )
}

export async function getHealth(signal?: AbortSignal): Promise<HealthResponse> {
  const response = await fetch('/api/health', { signal })
  if (!response.ok) throw new Error(`Python API returned HTTP ${response.status}.`)

  const value: unknown = await response.json()
  if (!isHealthResponse(value)) throw new Error('Python API returned an unexpected health response.')
  return value
}
