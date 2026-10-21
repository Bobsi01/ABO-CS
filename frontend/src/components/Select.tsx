import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { KeyboardEvent } from 'react'

type Option = { value: string; label: string; disabled?: boolean }

/** Single-select listbox: focus stays on the trigger; options use active descendant. */
export default function Select({ label, value, onChange, options, id, disabled = false }: {
  label: string; value: string; onChange: (value: string) => void; options: Option[]; id?: string; disabled?: boolean
}) {
  const generated = useId(), controlId = id ?? generated, listId = `${controlId}-list`
  const trigger = useRef<HTMLButtonElement>(null), menu = useRef<HTMLDivElement>(null)
  const search = useRef({ text: '', time: 0 })
  const [open, setOpen] = useState(false), [active, setActive] = useState(0)
  const [position, setPosition] = useState<{ left: number; top?: number; bottom?: number; width: number; height: number }>({ left: 8, top: 8, width: 240, height: 280 })
  const [theme, setTheme] = useState('light')
  const current = options.findIndex(o => o.value === value)

  function place() {
    const bounds = trigger.current?.getBoundingClientRect()
    if (!bounds) return
    const below = window.innerHeight - bounds.bottom - 12, above = bounds.top - 12
    const up = below < Math.min(280, options.length * 44 + 10) && above > below
    const height = Math.max(0, Math.min(280, up ? above : below))
    const width = Math.max(bounds.width, Math.min(220, window.innerWidth - 16))
    const left = Math.max(8, Math.min(bounds.left, window.innerWidth - width - 8))
    setPosition({ left, ...(up ? { bottom: window.innerHeight - bounds.top + 4 } : { top: bounds.bottom + 4 }), width, height })
    setTheme(trigger.current?.closest('[data-theme]')?.getAttribute('data-theme') ?? 'light')
  }
  function reveal(index = current >= 0 && !options[current].disabled ? current : options.findIndex(o => !o.disabled)) {
    place(); setActive(Math.max(0, index)); setOpen(true)
  }
  function commit(index: number) {
    if (!options[index] || options[index].disabled) return
    onChange(options[index].value); setOpen(false); trigger.current?.focus()
  }
  function move(direction: number) {
    let next = active
    for (let count = 0; count < options.length; count++) {
      next = (next + direction + options.length) % options.length
      if (!options[next].disabled) { setActive(next); break }
    }
  }
  function keyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (['ArrowDown', 'ArrowUp', 'Home', 'End', 'Enter', ' '].includes(event.key)) event.preventDefault()
    if (event.key === 'Escape') { setOpen(false); return }
    if (event.key === 'Tab') { setOpen(false); return }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { if (!open) reveal(); else move(event.key === 'ArrowDown' ? 1 : -1); return }
    if (event.key === 'Home' || event.key === 'End') {
      const index = event.key === 'Home' ? options.findIndex(o => !o.disabled) : options.reduce((found, option, i) => option.disabled ? found : i, -1)
      if (!open) reveal(index); else setActive(index)
      return
    }
    if (event.key === 'Enter' || event.key === ' ') { if (open) commit(active); else reveal(); return }
    if (event.key.length === 1 && !event.altKey && !event.ctrlKey && !event.metaKey) {
      event.preventDefault()
      const now = Date.now(), prefix = now - search.current.time > 650 ? event.key : search.current.text + event.key
      search.current = { text: prefix, time: now }
      const repeated = [...prefix.toLowerCase()].every(letter => letter === prefix[0].toLowerCase())
      const query = repeated ? event.key.toLowerCase() : prefix.toLowerCase()
      const start = repeated ? (open ? active : current) + 1 : 0
      for (let offset = 0; offset < options.length; offset++) {
        const index = (Math.max(0, start) + offset) % options.length
        if (!options[index].disabled && options[index].label.toLowerCase().startsWith(query)) {
          if (open) setActive(index); else onChange(options[index].value)
          break
        }
      }
    }
  }
  useEffect(() => {
    if (!open) return
    function dismiss(event: PointerEvent) {
      if (!trigger.current?.contains(event.target as Node) && !menu.current?.contains(event.target as Node)) setOpen(false)
    }
    function close() { setOpen(false) }
    document.addEventListener('pointerdown', dismiss)
    window.addEventListener('resize', close)
    // Close on ancestor scrolling so a floating menu never loses its trigger.
    function scroll(event: Event) { if (!menu.current?.contains(event.target as Node)) close() }
    document.addEventListener('scroll', scroll, true)
    return () => { document.removeEventListener('pointerdown', dismiss); window.removeEventListener('resize', close); document.removeEventListener('scroll', scroll, true) }
  }, [open])
  useEffect(() => { if (open) document.getElementById(`${listId}-${active}`)?.scrollIntoView?.({ block: 'nearest' }) }, [active, listId, open])

  return <div className="select-control">
    <label id={`${controlId}-label`} htmlFor={controlId}>{label}</label>
    <button ref={trigger} id={controlId} type="button" className="select-trigger" role="combobox" aria-haspopup="listbox" aria-labelledby={`${controlId}-label ${controlId}-value`} aria-controls={open ? listId : undefined} aria-expanded={open} aria-activedescendant={open ? `${listId}-${active}` : undefined} disabled={disabled} onClick={() => open ? setOpen(false) : reveal()} onKeyDown={keyDown} onBlur={() => setOpen(false)}>
      <span id={`${controlId}-value`}>{options[current]?.label ?? 'Choose…'}</span><svg viewBox="0 0 16 16" aria-hidden="true"><path d="m4 6 4 4 4-4" /></svg>
    </button>
    {open && !disabled && createPortal(<div className="application select-portal" data-theme={theme} ref={menu} style={{ left: position.left, top: position.top, bottom: position.bottom, width: position.width, maxHeight: position.height }}>
      <ul id={listId} role="listbox" aria-labelledby={`${controlId}-label`}>{options.map((option, index) => <li id={`${listId}-${index}`} key={option.value} role="option" aria-selected={option.value === value} aria-disabled={option.disabled || undefined} className={active === index ? 'active-option' : ''} onPointerMove={() => { if (!option.disabled) setActive(index) }} onMouseDown={event => event.preventDefault()} onClick={() => commit(index)}>{option.label}<span aria-hidden="true">{option.value === value ? '✓' : ''}</span></li>)}</ul>
    </div>, document.body)}
  </div>
}
