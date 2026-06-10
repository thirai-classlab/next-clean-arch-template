// src/lib/domain/events/domain-event.test.ts
// DomainEvent base type の structural test。
// readonly 性質と generic parameter narrowing を確認する。

import { describe, it, expect, expectTypeOf } from 'vitest'
import type { DomainEvent } from './domain-event'

describe('DomainEvent<T, P> base type', () => {
  it('generic parameters narrow eventType (literal) and payload structurally', () => {
    type Sample = DomainEvent<'SampleEvent', { foo: string; bar: number }>
    const ev: Sample = {
      eventType: 'SampleEvent',
      occurredAt: new Date('2026-01-01T00:00:00Z'),
      payload: { foo: 'hello', bar: 42 },
    }

    expect(ev.eventType).toBe('SampleEvent')
    expect(ev.payload.foo).toBe('hello')
    expect(ev.payload.bar).toBe(42)
    expect(ev.occurredAt.toISOString()).toBe('2026-01-01T00:00:00.000Z')
  })

  it('eventType field is a readonly literal at type level', () => {
    type Sample = DomainEvent<'SampleEvent', { foo: string }>
    expectTypeOf<Sample['eventType']>().toEqualTypeOf<'SampleEvent'>()
  })

  it('payload field is Readonly at type level (mutation produces type error)', () => {
    type Sample = DomainEvent<'SampleEvent', { foo: string }>
    // Readonly は型レベルの制約 (shallow)。runtime mutation は防げないが、tsc で
    // 直接代入が型エラーになることで意図しない mutation を compile-time に防ぐ。
    expectTypeOf<Sample['payload']>().toEqualTypeOf<Readonly<{ foo: string }>>()
  })

  it('default generics keep eventType string and payload unknown', () => {
    type Default = DomainEvent
    expectTypeOf<Default['eventType']>().toEqualTypeOf<string>()
    expectTypeOf<Default['payload']>().toEqualTypeOf<Readonly<unknown>>()
  })
})
