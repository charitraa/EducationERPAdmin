import { describe, expect, it } from 'vitest'
import { parseCsv, toCsv } from './csv'

describe('csv', () => {
  it('parses plain rows and skips blank lines', () => {
    expect(parseCsv('a,b\r\n1,2\n\n3,\n')).toEqual([['a', 'b'], ['1', '2'], ['3', '']])
  })

  it('handles quotes, commas and line breaks inside quotes', () => {
    expect(parseCsv('"Shrestha, Ram","He said ""hi""","line\none"')).toEqual([['Shrestha, Ram', 'He said "hi"', 'line\none']])
  })

  it('drops the BOM Excel writes', () => {
    expect(parseCsv('﻿राम,श्रेष्ठ')).toEqual([['राम', 'श्रेष्ठ']])
  })

  it('round-trips', () => {
    const rows = [['a,b', 'c"d', 'e\nf', ''], ['1', '2', '3', '4']]
    expect(parseCsv(toCsv(rows))).toEqual(rows)
  })
})
