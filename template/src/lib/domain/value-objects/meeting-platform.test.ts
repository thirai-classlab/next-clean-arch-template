import { describe, it, expect } from 'vitest'
import { MEETING_PLATFORMS, type MeetingPlatform } from './meeting-platform'

describe('MeetingPlatform VO', () => {
  it('lists exactly the 6 supported meeting platforms', () => {
    expect(MEETING_PLATFORMS).toEqual([
      'zoom',
      'google_meet',
      'microsoft_teams',
      'webex',
      'slack_huddles',
      'goto',
    ])
  })

  it('MEETING_PLATFORMS is frozen at runtime', () => {
    expect(Object.isFrozen(MEETING_PLATFORMS)).toBe(true)
  })

  it('MeetingPlatform literals are valid values', () => {
    const p: MeetingPlatform = 'zoom'
    expect(MEETING_PLATFORMS.includes(p)).toBe(true)
  })
})
