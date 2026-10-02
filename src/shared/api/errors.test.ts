import { describe, expect, it } from 'vitest'
import { ApiError } from './errors'

describe('ApiError', () => {
  it('maps list, string and nested field details to readable messages', () => {
    const e = new ApiError(
      {
        code: 'invalid',
        message: 'Invalid input.',
        details: {
          name: ['This field may not be blank.'],
          code: { code: 'This code is already in use in this organization.' },
          email: 'Enter a valid email.',
          non_field_errors: ['Dates overlap.'],
        },
      },
      400,
    )
    expect(e.fieldErrors).toEqual({
      name: 'This field may not be blank.',
      code: 'This code is already in use in this organization.',
      email: 'Enter a valid email.',
    })
    expect(e.generalErrors).toEqual(['Dates overlap.'])
  })

  it('treats a list of details as general errors', () => {
    const e = new ApiError({ code: 'invalid', message: 'Invalid input.', details: ['A', 'B'] }, 400)
    expect(e.fieldErrors).toEqual({})
    expect(e.generalErrors).toEqual(['A', 'B'])
  })
})
