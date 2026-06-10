import '@testing-library/jest-dom'
import { expect } from 'vitest'
import * as matchers from 'vitest-axe/matchers'

// Register vitest-axe matchers globally (toHaveNoViolations)
expect.extend(matchers)

// ResizeObserver polyfill for jsdom (required by Radix UI Select and other components)
class ResizeObserverPolyfill {
  observe() {}
  unobserve() {}
  disconnect() {}
}

if (typeof global.ResizeObserver === 'undefined') {
  global.ResizeObserver = ResizeObserverPolyfill
}

// IntersectionObserver polyfill for jsdom (required by Chakra v3 @zag-js/carousel,
// which reads win.IntersectionObserver — GalleryClient gallery carousel)
class IntersectionObserverPolyfill {
  readonly root = null
  readonly rootMargin = ''
  readonly thresholds: ReadonlyArray<number> = []
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords(): IntersectionObserverEntry[] {
    return []
  }
}

if (typeof global.IntersectionObserver === 'undefined') {
  global.IntersectionObserver =
    IntersectionObserverPolyfill as unknown as typeof IntersectionObserver
}
if (typeof window !== 'undefined' && typeof window.IntersectionObserver === 'undefined') {
  window.IntersectionObserver =
    IntersectionObserverPolyfill as unknown as typeof IntersectionObserver
}

// scrollIntoView polyfill for jsdom (required by cmdk@1.x virtual list)
if (typeof window !== 'undefined' && !window.HTMLElement.prototype.scrollIntoView) {
  window.HTMLElement.prototype.scrollIntoView = function () {}
}

// matchMedia mock for jsdom
if (typeof window !== 'undefined' && !window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  })
}
