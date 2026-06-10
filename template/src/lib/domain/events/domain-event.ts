// src/lib/domain/events/domain-event.ts
// DomainEvent base type — 型安全な Domain Event の generic 基底。
// draft 06 §1.4 L292-298 準拠。EventBus で publish / subscribe される。
//
// - T: eventType の string literal (discriminated union 用)
// - P: payload の構造 (Readonly で wrap して mutation を型レベルで防ぐ)
export interface DomainEvent<T extends string = string, P = unknown> {
  readonly eventType: T
  readonly occurredAt: Date
  readonly payload: Readonly<P>
}
