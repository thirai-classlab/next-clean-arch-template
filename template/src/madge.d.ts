// Ambient module declaration for `madge` (#16 pre-existing tsc cleanup).
//
// madge ships no types and no `@types/madge` package exists on npm. The
// clean-architecture invariant spec (src/lib/__tests__/circular-dep.spec.ts)
// imports the default-exported factory and already narrows it via an explicit
// cast, so a minimal `unknown` module declaration silences TS7016.
//
// NOTE: this file is intentionally kept free of top-level import/export so it
// remains a *global* ambient declaration. A module-form file would turn this
// into a (no-op) augmentation of a non-existent module instead.
declare module 'madge' {
  const madge: unknown
  export default madge
}
