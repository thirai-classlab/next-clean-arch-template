// src/lib/utils.ts — Display helpers shared across components.

/** Pad a number with leading zero. */
export function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

/**
 * Format duration in seconds as `m:ss` (< 1h) or `h m` (>= 1h).
 * Port: app2/ui.jsx fmtDur
 */
export function fmtDur(sec: number): string {
  if (sec >= 3600) {
    const h = Math.floor(sec / 3600)
    const m = Math.floor((sec % 3600) / 60)
    return `${h}h ${pad2(m)}m`
  }
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${pad2(s)}`
}

/**
 * Format byte size with binary prefixes (B / KB / MB / GB).
 * Port: app2/ui.jsx fmtBytes
 */
export function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`
}

/**
 * Format a time offset (relative to the stable demo origin) as `HH:MM:SS`.
 * The origin is fixed so the demo state stays reproducible across reloads.
 */
export function relTime(secOffset: number): string {
  // Stable demo time: 2026-05-23 12:47:30 (matches design import seed)
  const now = new Date(2026, 4, 23, 12, 47, 30)
  const d = new Date(now.getTime() + secOffset * 1000)
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`
}

/** Classnames helper (filter falsy, join with space). */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ')
}

/**
 * Weighted random pick from a list of items with a frequency field.
 * Port: app/store.jsx pickWeighted
 */
export function pickWeighted<T extends { freq: number }>(items: readonly T[]): T {
  const total = items.reduce((s, x) => s + x.freq, 0)
  let r = Math.random() * total
  for (const it of items) {
    r -= it.freq
    if (r < 0) return it
  }
  return items[items.length - 1] as T
}

/** Prepend an item to an array, then trim to `cap`. */
export function prependCapped<T>(arr: readonly T[], item: T, cap: number): T[] {
  const next = [item, ...arr]
  return next.length > cap ? next.slice(0, cap) : next
}
