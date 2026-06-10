// src/lib/infrastructure/adapters/mock/mock-local-inference.adapter.spec.ts
import 'reflect-metadata'
import { describe, it, expect, beforeEach } from 'vitest'
import { MockLocalInferenceAdapter } from './mock-local-inference.adapter'

describe('MockLocalInferenceAdapter', () => {
  let adapter: MockLocalInferenceAdapter

  beforeEach(() => {
    adapter = new MockLocalInferenceAdapter()
  })

  it('generate echoes the prompt with a deterministic suffix', async () => {
    const r = await adapter.generate({ prompt: 'hello', model: 'mock-llm' })
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.value.text).toContain('hello')
      expect(r.value.tokensUsed).toBeGreaterThan(0)
    }
  })

  it('respects maxTokens', async () => {
    const r = await adapter.generate({
      prompt: 'a',
      model: 'mock-llm',
      maxTokens: 5,
    })
    if (r.ok) expect(r.value.tokensUsed).toBeLessThanOrEqual(5)
  })
})
