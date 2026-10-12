import { useEffect } from 'react'
import type { EruptionSequence } from '../api/simulator'
import Icon from './Icon'
import { phaseLabel } from './eruptionResearch'
import { scenarioClock } from './eruptionReplay'

const SEQUENCE_DISPLAY_SECONDS = 36

export default function EruptionTimeline({ sequence, index, playing, onIndex, onPlaying, sceneAvailable = true }: {
  sequence: EruptionSequence; index: number; playing: boolean; onIndex: (index: number) => void; onPlaying: (playing: boolean) => void; sceneAvailable?: boolean
}) {
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
  return <section className="eruption-timeline" aria-label="Eruption sequence">
    <div className="timeline-top"><div className="phase-choices" aria-label="Jump to eruption stage">{['Before', 'During', 'After'].map((label, i) => <button type="button" aria-pressed={stage === i} key={label} onClick={() => seek(i === 0 ? 0 : i === 1 ? during : after >= 0 ? after : last)}>{label}</button>)}</div>
      <button type="button" disabled={!sceneAvailable} onClick={() => { if (!playing && index >= last) onIndex(0); onPlaying(!playing) }}><Icon name={playing ? 'pause' : 'play'} />{playing ? 'Pause sequence' : index >= last ? 'Replay sequence' : 'Play sequence'}</button></div>
    <label className="timeline-slider">{phaseLabel(current.phase)}<input type="range" min="0" max={last} step="1" value={Math.floor(index)} aria-label="Eruption timeline" aria-valuetext={`${phaseLabel(current.phase)}, ${scenarioClock(current.elapsed_s)} elapsed hours, minutes and seconds`} onChange={event => seek(Number(event.target.value))} /></label>
    <div className="timeline-readout"><span>Model time (h:mm:ss): {scenarioClock(current.elapsed_s)} / {scenarioClock(frames[last].elapsed_s)}</span><span>Emission duration: {scenarioClock(sequence.scenario.duration_s)}</span></div>
    <p className="view-note">{SEQUENCE_DISPLAY_SECONDS}-second accelerated replay with nonuniform model-time steps. Billows and fountain shapes are schematic; accumulated ash is computed in Python.</p>
  </section>
}
