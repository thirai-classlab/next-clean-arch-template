import { describe, it, expect } from 'vitest'
import { BOT_STATUSES, type BotStatus } from './bot-status'

describe('BotStatus VO', () => {
  it('lists exactly the 7 expected Recall.ai bot lifecycle statuses', () => {
    expect(BOT_STATUSES).toEqual([
      'ready',
      'joining_call',
      'in_call_not_recording',
      'in_call_recording',
      'call_ended',
      'done',
      'fatal',
    ])
  })

  it('BOT_STATUSES is frozen at runtime', () => {
    expect(Object.isFrozen(BOT_STATUSES)).toBe(true)
  })

  it('BotStatus literals are valid values', () => {
    const s: BotStatus = 'in_call_recording'
    expect(BOT_STATUSES.includes(s)).toBe(true)
  })
})
