import { describe, it, expect } from 'vitest'
import * as aggregates from './index'

describe('aggregates barrel', () => {
  it('全 3 Aggregate factory + transitions が re-export されている', () => {
    expect(typeof aggregates.createUserAggregate).toBe('function')
    expect(typeof aggregates.approveUser).toBe('function')
    expect(typeof aggregates.rejectUser).toBe('function')
    expect(typeof aggregates.changeUserRole).toBe('function')

    expect(typeof aggregates.createBotAggregate).toBe('function')
    expect(typeof aggregates.updateBotStatus).toBe('function')
    expect(typeof aggregates.addRecording).toBe('function')
    expect(typeof aggregates.addTranscript).toBe('function')

    expect(typeof aggregates.createMeetingSessionAggregate).toBe('function')
    expect(typeof aggregates.scheduleBotJoin).toBe('function')
    expect(typeof aggregates.cancelBotJoin).toBe('function')
  })
})
