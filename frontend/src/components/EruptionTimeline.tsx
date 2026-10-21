import { useEffect, useState } from 'react'
import type { EruptionSequence } from '../api/simulator'
import Icon from './Icon'
import { phaseLabel } from './eruptionResearch'
import { scenarioClock } from './eruptionReplay'

const SEQUENCE_DISPLAY_SECONDS = 36

type TaalTimelineEvent = {
  review_status?: string
  date_phst: string
  event_type: string
  duration: string
  plume_height_m: number
  so2_t_day: number
  alert_level: number
  source: string
  disclaimer: string
}

export default function EruptionTimeline({ sequence, index, playing, onIndex, onPlaying, sceneAvailable = true, compact = false }: {
  sequence: EruptionSequence; index: number; playing: boolean; onIndex: (index: number) => void; onPlaying: (playing: boolean) => void; sceneAvailable?: boolean; compact?: boolean
}) {
  const [events, setEvents] = useState<TaalTimelineEvent[]>([])
  const [selectedEvent, setSelectedEvent] = useState<TaalTimelineEvent | null>(null)

  useEffect(() => {
    if (sequence.scenario.volcano_id !== 'taal') return
    const controller = new AbortController()
    fetch('/taal_eruption_timeline_2021_2024.json', { signal: controller.signal, cache: 'no-store' })
      .then(r => r.ok ? (r.json() as Promise<TaalTimelineEvent[]>) : [])
      .then(data => setEvents(Array.isArray(data) ? data.filter(entry => entry.review_status === 'reviewed') : []))
      .catch(() => {})
    return () => controller.abort()
  }, [sequence.scenario.volcano_id])

  useEffect(() => {
    if (!selectedEvent) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedEvent(null)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedEvent])

  const frames = sequence.frames, last = frames.length - 1
  const current = frames[Math.min(last, Math.floor(index))]
  useEffect(() => {
    if (!playing) return
    let raf = 0, previous = 0, position = index
    const tick = (now: number) => {
      if (previous) position = Math.min(last, position + Math.min((now - previous) / 1000, 0.1) * last / SEQUENCE_DISPLAY_SECONDS)
      previous = now
      onIndex(position)
      if (position >= last) onPlaying(false)
      else raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
    // Starting a replay captures its current index; ordinary ticks must not restart the clock.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, sequence, last])
  function seek(value: number) { onPlaying(false); onIndex(value) }
  const during = frames.reduce((best, frame, i) => Math.abs(frame.elapsed_s - sequence.scenario.duration_s / 2) < Math.abs(frames[best].elapsed_s - sequence.scenario.duration_s / 2) ? i : best, 0)
  const after = frames.findIndex(f => f.phase === 'settling')
  const stage = current.phase === 'before' ? 0 : current.phase === 'erupting' ? 1 : 2
  return <section className={`eruption-timeline${compact ? ' eruption-timeline-compact' : ''}`} aria-label="Eruption sequence">
    <div className="timeline-top"><div className="phase-choices" aria-label="Jump to eruption stage">{['Before', 'During', 'After'].map((label, i) => <button type="button" aria-pressed={stage === i} key={label} onClick={() => seek(i === 0 ? 0 : i === 1 ? during : after >= 0 ? after : last)}>{label}</button>)}</div>
      <button type="button" className="timeline-play-button" disabled={!sceneAvailable} onClick={() => { if (!playing && index >= last) onIndex(0); onPlaying(!playing) }}><Icon name={playing ? 'pause' : 'play'} />{playing ? 'Pause sequence' : index >= last ? 'Replay sequence' : 'Play sequence'}</button></div>
    <label className="timeline-slider"><span className="timeline-slider-label">{compact ? `${scenarioClock(current.elapsed_s)} / ${scenarioClock(frames[last].elapsed_s)}` : phaseLabel(current.phase)}</span><input type="range" min="0" max={last} step="1" value={Math.floor(index)} aria-label="Eruption timeline" aria-valuetext={`${phaseLabel(current.phase)}, map snapshot at ${scenarioClock(current.elapsed_s).replace(' h', ' hours')}`} onChange={event => seek(Number(event.target.value))} /></label>
    {!compact && <div className="timeline-readout"><span>Map snapshot: {scenarioClock(current.elapsed_s)} / {scenarioClock(frames[last].elapsed_s)}</span><span>Emission duration: {scenarioClock(sequence.scenario.duration_s)}</span></div>}
    {!compact && <details className="timeline-explanation"><summary>Replay timing & reference notes</summary><p className="view-note">{SEQUENCE_DISPLAY_SECONDS}-second accelerated replay. The 3D illustration interpolates between nonuniform snapshots; the map shows the preceding computed snapshot. Billows and fountains are schematic.</p>
    {sequence.scenario.volcano_id === 'taal' && events.length === 0 && <p className="view-note">Historical activity bookmarks are unavailable until their source values are reviewed.</p>}
    </details>}
    {!compact && sequence.scenario.volcano_id === 'taal' && events.length > 0 && (
      <div className="historical-bookmarks" aria-label="Historical activity reference">
        <div className="bookmarks-header">
          <span className="bookmarks-title"><Icon name="history" />Historical Activity Bookmarks (2021–2024)</span>
          <span className="reference-badge">Reference overlay · non-model</span>
        </div>
        <div className="bookmarks-pills" role="group" aria-label="Taal historical eruption events">
          {events.map((evt, idx) => (
            <button
              type="button"
              key={idx}
              className={`bookmark-pill ${selectedEvent === evt ? 'active' : ''}`}
              onClick={() => setSelectedEvent(selectedEvent === evt ? null : evt)}
              aria-expanded={selectedEvent === evt}
            >
              <span className="pill-date">{evt.date_phst.split(' ')[0]}</span>
              <span className="pill-plume">{evt.plume_height_m} m</span>
              <span className={`pill-alert alert-${evt.alert_level}`}>AL{evt.alert_level}</span>
            </button>
          ))}
        </div>
        {selectedEvent && (
          <div className="bookmark-detail-card" role="region" aria-label="Event details">
            <div className="detail-header">
              <strong>{selectedEvent.date_phst}</strong>
              <span className={`pill-alert alert-${selectedEvent.alert_level}`}>Alert Level {selectedEvent.alert_level}</span>
              <button type="button" className="close-button" onClick={() => setSelectedEvent(null)} aria-label="Close event details">×</button>
            </div>
            <div className="detail-grid">
              <div><span className="detail-label">Type:</span> {selectedEvent.event_type.replace(/_/g, ' ')}</div>
              <div><span className="detail-label">Duration:</span> {selectedEvent.duration}</div>
              <div><span className="detail-label">Plume Height:</span> {selectedEvent.plume_height_m.toLocaleString()} m</div>
              <div><span className="detail-label">SO₂ Flux:</span> {selectedEvent.so2_t_day.toLocaleString()} t/day</div>
              <div className="full-width"><span className="detail-label">Source:</span> {selectedEvent.source}</div>
            </div>
            <p className="reference-disclaimer">{selectedEvent.disclaimer}</p>
          </div>
        )}
      </div>
    )}
  </section>
}
