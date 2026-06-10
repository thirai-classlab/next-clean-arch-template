import { describe, it, expect } from 'vitest'
import { REGIONS, type Region } from './region'

describe('Region VO', () => {
  it('lists exactly the 3 supported regions', () => {
    expect(REGIONS).toEqual(['us-east-1', 'eu-west-1', 'ap-northeast-1'])
  })

  it('REGIONS is frozen at runtime', () => {
    expect(Object.isFrozen(REGIONS)).toBe(true)
  })

  it('Region literals are valid values', () => {
    const r: Region = 'ap-northeast-1'
    expect(REGIONS.includes(r)).toBe(true)
  })
})
