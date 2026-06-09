// src/lib/infrastructure/adapters/mock/mock-continuous-monitoring.adapter.spec.ts
import 'reflect-metadata'
import { describe, it, expect, beforeEach } from 'vitest'
import { MockContinuousMonitoringAdapter } from './mock-continuous-monitoring.adapter'

describe('MockContinuousMonitoringAdapter', () => {
  let adapter: MockContinuousMonitoringAdapter

  beforeEach(() => {
    adapter = new MockContinuousMonitoringAdapter()
  })

  it('log records entries by severity', () => {
    adapter.log('info', 'hello', { user: 'u1' })
    adapter.log('error', 'boom')
    expect(adapter.logs).toHaveLength(2)
    expect(adapter.logs[0]?.severity).toBe('info')
    expect(adapter.logs[1]?.severity).toBe('error')
  })

  it('recordMetric stores metric entries', async () => {
    const r = await adapter.recordMetric({
      name: 'request.count',
      value: 1,
      tags: { route: '/api/bot' },
    })
    expect(r.ok).toBe(true)
    expect(adapter.metrics).toHaveLength(1)
  })
})
