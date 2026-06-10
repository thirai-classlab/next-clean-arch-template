import { describe, it, expect } from 'vitest'
import type { Bot } from './bot'

describe('Bot entity', () => {
  it('構造一致: 全 field が型付け meetingUrl / platform / status / region / Date を持つ', () => {
    const bot: Bot = {
      id: 'bot-1',
      meetingUrl: 'https://zoom.us/j/123456789',
      platform: 'zoom',
      status: 'ready',
      region: 'us-east-1',
      createdAt: new Date('2026-01-01T00:00:00Z'),
      statusUpdatedAt: new Date('2026-01-01T00:00:00Z'),
    }

    expect(bot.id).toBe('bot-1')
    expect(bot.meetingUrl).toBe('https://zoom.us/j/123456789')
    expect(bot.platform).toBe('zoom')
    expect(bot.status).toBe('ready')
    expect(bot.region).toBe('us-east-1')
    expect(bot.createdAt).toBeInstanceOf(Date)
    expect(bot.statusUpdatedAt).toBeInstanceOf(Date)
  })

  it('readonly: status mutation は型エラー', () => {
    const bot: Bot = {
      id: 'bot-2',
      meetingUrl: 'https://meet.google.com/abc',
      platform: 'google_meet',
      status: 'joining_call',
      region: 'eu-west-1',
      createdAt: new Date(),
      statusUpdatedAt: new Date(),
    }

    // @ts-expect-error - status is readonly
    bot.status = 'in_call_recording'
    expect(bot.status).toBe('in_call_recording')
  })

  it('platform / region VO type 制約: 不正値は型エラー', () => {
    const bot: Bot = {
      id: 'bot-3',
      // @ts-expect-error - invalid platform
      platform: 'discord',
      meetingUrl: 'https://example.com',
      status: 'done',
      region: 'ap-northeast-1',
      createdAt: new Date(),
      statusUpdatedAt: new Date(),
    }
    expect(bot.platform).toBe('discord')
  })
})
