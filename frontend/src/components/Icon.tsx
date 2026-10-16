import type { ReactNode } from 'react'

const shapes = {
  volcano: <><path d="m3 20 6-11 3 4 3-4 6 11H3Z" /><path d="M10 6V4m4 2V2M8 16h8" /></>,
  map: <><path d="m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2V5Z" /><path d="M9 3v16m6-14v16" /></>,
  compare: <><path d="M3 7h18l-4-4m4 14H3l4 4M21 7l-4 4M3 17l4-4" /></>,
  compass: <><circle cx="12" cy="12" r="9" /><path d="m16 8-2 6-6 2 2-6 6-2Z" /></>,
  history: <><path d="M3 11a9 9 0 1 1 3 8M3 4v7h7m2-5v6l4 2" /></>,
  book: <><path d="M12 5C9 3 6 3 3 4v15c3-1 6-1 9 1 3-2 6-2 9-1V4c-3-1-6-1-9 1Zm0 0v15" /></>,
  moon: <path d="M20 15A9 9 0 0 1 9 4a9 9 0 1 0 11 11Z" />,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" /></>,
  calculate: <><rect x="5" y="2" width="14" height="20" rx="2" /><path d="M8 6h8M8 11h2m4 0h2m-8 4h2m4 0h2m-8 4h2m4 0h2" /></>,
  download: <><path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5" /></>,
  code: <><path d="m8 6-6 6 6 6m8-12 6 6-6 6m-3-16-2 20" /></>,
  play: <path d="m8 4 13 8-13 8V4Z" />,
  pause: <><path d="M7 4v16M17 4v16" /></>,
  reset: <><path d="M3 11a9 9 0 1 1 3 8M3 4v7h7" /></>,
  settings: <><path d="M3 6h18M3 12h18M3 18h18" /><path d="M8 3v6m8 0v6m-6 0v6" /></>,
  wind: <><path d="M3 8h12a3 3 0 1 0-3-3M3 12h15a3 3 0 1 1-3 3M3 16h6" /></>,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v6m0-10v.5" /></>,
  close: <path d="m6 6 12 12M6 18 18 6" />,
  chevronDown: <path d="m6 9 6 6 6-6" />,
  chevronRight: <path d="m9 18 6-6-6-6" />,
} satisfies Record<string, ReactNode>

export type IconName = keyof typeof shapes

export default function Icon({ name }: { name: IconName }) {
  return <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="square" strokeLinejoin="round" aria-hidden="true" focusable="false">{shapes[name]}</svg>
}
