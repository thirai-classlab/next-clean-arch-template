// Test-only type declarations (#16 pre-existing tsc cleanup).
//
// This file is a *module* (note the top-level `import`), which is required for
// the `declare module 'vitest'` block below to perform interface *merging*
// (augmentation) rather than declaring a brand-new ambient module.
import 'vitest'
import type { AxeMatchers } from 'vitest-axe/matchers'

// 1. vitest-axe matcher augmentation.
//    `expect.extend(matchers)` registers `toHaveNoViolations` at runtime
//    (src/test-setup.ts). vitest-axe@0.1.0 only augments the legacy global
//    `Vi.Assertion` namespace, which vitest@2.x no longer resolves for
//    `expect(...)` — `await axe(container)` yields `Assertion<AxeResults>` from
//    the `vitest` module's `Assertion<T>` interface. We augment that interface
//    directly with vitest-axe's own `AxeMatchers`. Runtime behavior is unchanged.
declare module 'vitest' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface Assertion<T = unknown> extends AxeMatchers {}
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface AsymmetricMatchersContaining extends AxeMatchers {}
}

// 2. The `madge` ambient module declaration lives in src/madge.d.ts (it must be
//    a global ambient file, which this module-form file cannot be).
