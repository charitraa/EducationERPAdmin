import { describe, expect, it } from 'vitest'
import { parseIsoDate, toBsDate, toIsoDate } from './dates'

describe('dates', () => {
  it('round-trips ISO dates without timezone drift', () => {
    expect(toIsoDate(parseIsoDate('2026-10-02')!)).toBe('2026-10-02')
    expect(parseIsoDate('not a date')).toBeNull()
  })

  it('converts AD to BS', () => {
    expect(toBsDate('2026-10-02')).toBe('2083-06-16')
  })
})
