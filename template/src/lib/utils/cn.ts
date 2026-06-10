import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Merge class names with clsx + tailwind-merge.
 * Resolves Tailwind class conflicts (e.g. px-2 vs px-4 → keeps last).
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
