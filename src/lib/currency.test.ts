import { describe, expect, it } from 'vitest'
import { formatMoney, fromPaisa, sumMoney, toPaisa } from './currency'

describe('currency', () => {
  it('parses decimal strings to paisa without floats', () => {
    expect(toPaisa('1500.00')).toBe(150000n)
    expect(toPaisa('0.1')).toBe(10n)
    expect(toPaisa('-12.5')).toBe(-1250n)
    expect(toPaisa('abc')).toBeNull()
  })

  it('sums exactly', () => {
    expect(sumMoney(['0.10', '0.20'])).toBe('0.30')
    expect(fromPaisa(toPaisa('999999999999.99')! + 1n)).toBe('1000000000000.00')
  })

  it('formats for display', () => {
    expect(formatMoney('1500.00')).toBe('NPR 1,500.00')
    expect(formatMoney('1234567.5', { grouping: 'lakh' })).toBe('NPR 12,34,567.50')
    expect(formatMoney('-20')).toBe('−NPR 20.00')
    expect(formatMoney(null)).toBe('—')
  })
})
