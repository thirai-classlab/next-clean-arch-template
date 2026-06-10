// src/lib/infrastructure/repositories/in-memory/in-memory-base.ts
// Shared Map-based storage helper for the 8 InMemory repositories
// (draft 06 §3 Infrastructure spec, minimal Profile = in-memory persistence).
//
// Why an abstract helper instead of inheritance:
//   - The 8 Repository ports diverge on `save` semantics (ConflictError vs upsert)
//     and on the set of secondary queries (findByEmail / findByStatus etc.).
//   - A thin protected `Map<string, T>` + `clone()` keeps each concrete repo small
//     while preserving the immutability contract (entities are deep-frozen on read).

export abstract class InMemoryRepositoryBase<T extends { readonly id: string }> {
  /**
   * Backing store. Subclasses may override this with a process-global Map
   * (e.g. `globalThis`-keyed) to survive Next.js App Router module isolation
   * between Server Actions and Server Components in the same process.
   *
   * Default: a fresh in-process Map (sufficient for unit tests and non-MOCK
   * deployments that have real DB adapters).
   */
  protected readonly store: Map<string, T> = new Map<string, T>()

  /** Deep-freeze a copy so external mutations cannot leak into the store. */
  protected clone(entity: T): T {
    return Object.freeze({ ...entity })
  }

  /** Insert or update by primary id; returns the stored snapshot. */
  protected putById(entity: T): T {
    const snapshot = this.clone(entity)
    this.store.set(entity.id, snapshot)
    return snapshot
  }

  protected getById(id: string): T | undefined {
    return this.store.get(id)
  }

  protected removeById(id: string): boolean {
    return this.store.delete(id)
  }

  protected list(): ReadonlyArray<T> {
    return Object.freeze(Array.from(this.store.values()))
  }
}
