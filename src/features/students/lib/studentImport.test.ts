import { describe, expect, it } from 'vitest'
import { readStudentRows } from './studentImport'

describe('readStudentRows', () => {
  it('matches the template and common header spellings', () => {
    const { rows, ignored, missing } = readStudentRows([
      ['Reg No', 'First Name', 'Surname', 'Sex', 'DOB', 'Remarks'],
      ['S-1', 'Asha', 'Tamang', 'F', '2010-04-13', 'monitor'],
    ])
    expect(missing).toEqual([])
    expect(ignored).toEqual(['Remarks'])
    expect(rows[0]!.problems).toEqual([])
    expect(rows[0]!.input).toMatchObject({ student_number: 'S-1', first_name: 'Asha', last_name: 'Tamang', gender: 'female', date_of_birth: '2010-04-13' })
  })

  it('reports missing required columns', () => {
    expect(readStudentRows([['first_name', 'last_name']]).missing).toEqual(['Student no.'])
  })

  it('flags bad rows with the line they are on', () => {
    const { rows } = readStudentRows([
      ['student_number', 'first_name', 'last_name', 'gender', 'date_of_birth', 'email'],
      ['A1', 'Ram', 'Shrestha', 'male', '2010-02-30', 'ram@'],
      ['a1', '', 'Thapa', 'x', '', ''],
    ])
    expect(rows[0]!.line).toBe(2)
    expect(rows[0]!.problems).toHaveLength(2)
    expect(rows[1]!.problems).toEqual(['First name is empty.', 'Gender “x” isn’t one of male, female, other.', 'Same student no. as line 2.'])
  })

  it('leaves optional empty fields out of the request', () => {
    const { rows } = readStudentRows([['student_number', 'first_name', 'last_name'], ['B2', 'Sita', 'Rai']])
    expect(rows[0]!.input).not.toHaveProperty('gender')
    expect(rows[0]!.input).not.toHaveProperty('email')
  })
})
