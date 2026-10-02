import { describe, expect, it } from 'vitest'
import { parseIsoDate, toBsDate, toIsoDate, combineLocal, splitLocal } from './dates'

describe('dates', () => {
  it('round-trips ISO dates without timezone drift', () => {
    expect(toIsoDate(parseIsoDate('2026-10-02')!)).toBe('2026-10-02')
    expect(parseIsoDate('not a date')).toBeNull()
  })

  it('converts AD to BS', () => {
    expect(toBsDate('2026-10-02')).toBe('2083-06-16')
  })
})

describe('combineLocal / splitLocal', () => {
  it('round-trips a local date and time', () => {
    expect(splitLocal(combineLocal('2026-10-02', '09:05'))).toEqual({ date: '2026-10-02', time: '09:05' })
  })
  it('treats missing or bad values as empty', () => {
    expect(splitLocal(null)).toEqual({ date: '', time: '' })
    expect(splitLocal('nope')).toEqual({ date: '', time: '' })
  })
})
