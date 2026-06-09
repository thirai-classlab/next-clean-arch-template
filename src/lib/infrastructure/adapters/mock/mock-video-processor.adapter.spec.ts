// src/lib/infrastructure/adapters/mock/mock-video-processor.adapter.spec.ts
import 'reflect-metadata'
import { describe, it, expect, beforeEach } from 'vitest'
import { MockVideoProcessorAdapter } from './mock-video-processor.adapter'

describe('MockVideoProcessorAdapter', () => {
  let adapter: MockVideoProcessorAdapter

  beforeEach(() => {
    adapter = new MockVideoProcessorAdapter()
  })

  it('generateThumbnail returns a thumbnailKey derived from sourceKey + atSec', async () => {
    const r = await adapter.generateThumbnail({ sourceKey: 'rec/1.mp4', atSec: 12 })
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.value.thumbnailKey).toContain('rec/1.mp4')
      expect(r.value.thumbnailKey).toContain('12')
    }
  })

  it('generateChapters returns a deterministic chapter list', async () => {
    const r = await adapter.generateChapters({ sourceKey: 'rec/1.mp4' })
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.value.length).toBeGreaterThan(0)
      expect(r.value[0]?.title).toBeTruthy()
    }
  })
})
