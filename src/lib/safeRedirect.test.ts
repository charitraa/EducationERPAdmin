import { describe, expect, it } from 'vitest'
import { safeBack } from './safeRedirect'

describe('safeBack', () => {
  it('keeps paths inside the app, with their query and hash', () => {
    expect(safeBack('/students/12')).toBe('/students/12')
    expect(safeBack('/scan/class?t=abc#x')).toBe('/scan/class?t=abc#x')
  })

  it('refuses anything a browser would read as another site', () => {
    for (const to of ['//evil.example', '/\\evil.example', '/\\/evil.example', 'https://evil.example', 'javascript:alert(1)', 'evil'])
      expect(safeBack(to)).toBe('/')
  })
})
