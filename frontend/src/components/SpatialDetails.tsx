import { useEffect, useId, useRef, useState } from 'react'
import type { ReactNode, ReactEventHandler } from 'react'
import { createPortal } from 'react-dom'

export default function SpatialDetails({ title, children, className = '', open, onToggle }: {
  title: string
  children: ReactNode
  className?: string
  open?: boolean
  onToggle?: ReactEventHandler<HTMLDetailsElement>
}) {
  const disclosure = useRef<HTMLDetailsElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  const [expanded, setExpanded] = useState(false)
  const [root, setRoot] = useState<Element | null>(null)
  const [position, setPosition] = useState({ left: 16, top: 16, width: 480 })
  const heading = useId()
  const close = () => {
    if (disclosure.current) {
      disclosure.current.open = false
      disclosure.current.querySelector('summary')?.focus()
    }
    setExpanded(false)
  }

  useEffect(() => {
    if (!expanded) return
    const place = () => {
      const sidebar = disclosure.current?.closest('.spatial-card-sidebar')?.getBoundingClientRect()
      if (!sidebar) return
      const beside = window.innerWidth >= 1024
      const left = beside ? sidebar.right + 16 : 16
      const width = Math.min(480, window.innerWidth - left - 16)
      const height = Math.min(520, window.innerHeight - 24)
      setPosition({ left, width, top: Math.max(12, Math.min(sidebar.top, window.innerHeight - height - 12)) })
    }
    place()
    panel.current?.focus({ preventScroll: true })
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [expanded])

  return <>
    <details ref={disclosure} name="spatial-information" className={`spatial-disclosure ${className}`} open={open}
      onToggle={event => { setRoot(event.currentTarget.closest('.application') ?? document.body); setExpanded(event.currentTarget.open); onToggle?.(event) }}
      onKeyDown={event => { if (event.key === 'Escape' && expanded) { event.preventDefault(); close() } }}>
      <summary aria-controls={expanded ? heading : undefined}>{title}</summary>
      {!expanded && <div>{children}</div>}
    </details>
    {expanded && root && createPortal(<div ref={panel} className="spatial-details-panel" style={position} role="region" tabIndex={-1} aria-labelledby={`${heading}-title`} id={heading}
      onKeyDown={event => { if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close() } }}>
      <div className="spatial-details-header"><h3 id={`${heading}-title`}>{title}</h3><button type="button" onClick={close} aria-label={`Close ${title}`}>Close</button></div>
      <div className="spatial-details-content">{children}</div>
    </div>, root)}
  </>
}
