import { describe, expect, it } from 'vitest'
import { ApiError } from '@/shared/api/errors'
import { errorMessage } from './errors'

const forbidden = (code: string, message: string) => new ApiError({ code, message, details: null }, 403)

describe('errorMessage', () => {
  it('words a bare permission denial our way', () => {
    expect(errorMessage(forbidden('permission_denied', 'You do not have permission to perform this action.'))).not.toContain('perform this action')
  })

  it("shows a business rule's own 403 message", () => {
    expect(errorMessage(forbidden('too_far', "You're too far from the class to scan this code."))).toBe("You're too far from the class to scan this code.")
  })
})
