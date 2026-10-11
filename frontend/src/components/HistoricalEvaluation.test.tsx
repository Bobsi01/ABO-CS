import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import HistoricalEvaluation from './HistoricalEvaluation'
import type { ReplicationResult } from '../api/simulator'

afterEach(cleanup)
vi.mock('./HistoricalFootprints', () => ({ default: () => <div>Reference map</div> }))
it('distinguishes interval and midpoint errors without repeating the compatibility alias', () => {
  const result = { available: true, reason: 'Synthetic interval test', validation_status: 'evaluated_not_validated', metrics: { rmse_mm: 0, interval_rmse_mm: 0, midpoint_rmse_mm: 1 }, observation_results: [{ observation_id: 'QA-interval', spatial_group: 'west', dependency_group: 'single-study', split: 'evaluation', lat: 14, lon: 121, lower_mm: 1, upper_mm: 3, in_domain: true, predicted_mm: 3, interval_residual_mm: 0, midpoint_residual_mm: 1, reason: '' }] } as ReplicationResult
  render(<HistoricalEvaluation result={result} onInspect={vi.fn()} />)
  expect(screen.getAllByText('Interval-distance RMSE (mm)')).toHaveLength(1)
  expect(screen.getByText('Midpoint RMSE (mm)')).toBeTruthy()
  expect(screen.getByText('QA-interval')).toBeTruthy()
  expect(screen.getByText(/small error alone does not establish historical validation/)).toBeTruthy()
  expect(screen.getByText(/Calibration rows are excluded from evaluation metrics/)).toBeTruthy()
})
it('labels repeated source traces as digitization evidence while predictions remain unavailable', () => {
  const result = { available: false, reason: 'Inputs blocked', validation_status: 'source_blocked', metrics: {}, reference_footprints: [{ trace_id: 'trace-a', label: 'First outline', threshold_mm: 0.5, geojson: { type: 'FeatureCollection', features: [] }, source_ids: ['one-study'], dependency_group: 'one-study', uncertainty_notes: 'Derived outline' }], footprint_evidence: { intertrace_iou: 0.99, independent_observation_count: 0 } } as ReplicationResult
  render(<HistoricalEvaluation result={result} onInspect={vi.fn()} />)
  expect(screen.getByText('Digitization IoU')).toBeTruthy()
  expect(screen.getByText(/not independent observations or model predictions/)).toBeTruthy()
  expect(screen.queryByRole('button', { name: 'Inspect historical result' })).toBeNull()
})
