import { describe, it, expect } from 'vitest'
import type { AuditLog } from './audit-log'

describe('AuditLog entity', () => {
  it('構造一致: actorId / action / target / metadata / createdAt を持つ', () => {
    const log: AuditLog = {
      id: 'log-1',
      actorId: 'user-1',
      action: 'bot.create',
      targetId: 'bot-1',
      targetType: 'Bot',
      metadata: { meeting_url: 'https://zoom.us/j/1', region: 'us-east-1' },
      createdAt: new Date('2026-01-01T00:00:00Z'),
    }

    expect(log.id).toBe('log-1')
    expect(log.actorId).toBe('user-1')
    expect(log.action).toBe('bot.create')
    expect(log.targetId).toBe('bot-1')
    expect(log.targetType).toBe('Bot')
    expect(log.metadata.meeting_url).toBe('https://zoom.us/j/1')
    expect(log.createdAt).toBeInstanceOf(Date)
  })

  it('targetId / targetType は null 許容 (system action)', () => {
    const log: AuditLog = {
      id: 'log-2',
      actorId: 'system',
      action: 'health.check',
      targetId: null,
      targetType: null,
      metadata: {},
      createdAt: new Date(),
    }

    expect(log.targetId).toBeNull()
    expect(log.targetType).toBeNull()
  })

  it('readonly: action 差し替えは型エラー', () => {
    const log: AuditLog = {
      id: 'log-3',
      actorId: 'user-2',
      action: 'user.login',
      targetId: 'user-2',
      targetType: 'User',
      metadata: { ip: '10.0.0.1' },
      createdAt: new Date(),
    }

    // @ts-expect-error - action is readonly
    log.action = 'user.logout'
    expect(log.action).toBe('user.logout')
  })
})
