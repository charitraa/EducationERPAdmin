import { describe, expect, it } from 'vitest'
import { readImportRows, type ImportColumn } from './importRows'

const COLUMNS: ImportColumn[] = [
  { key: 'student_number', label: 'Student no.', required: true, unique: true, aliases: ['Reg No'] },
  { key: 'first_name', label: 'First name', required: true },
  { key: 'last_name', label: 'Last name', required: true, aliases: ['Surname'] },
  { key: 'gender', label: 'Gender', kind: 'gender', aliases: ['Sex'] },
  { key: 'date_of_birth', label: 'Date of birth', kind: 'date', aliases: ['DOB'] },
  { key: 'email', label: 'Email', kind: 'email' },
  { key: 'staff_type', label: 'Staff type', kind: 'choice', choices: { teaching: 'teaching', teacher: 'teaching', nonteaching: 'non_teaching' } },
  { key: 'is_mentor', label: 'Mentor', kind: 'bool' },
]

describe('readImportRows', () => {
  it('matches keys, English labels and aliases', () => {
    const { rows, ignored, missing } = readImportRows(
      [
        ['Reg No', 'First Name', 'Surname', 'Sex', 'DOB', 'Remarks'],
        ['S-1', 'Asha', 'Tamang', 'F', '2010-04-13', 'monitor'],
      ],
      COLUMNS,
    )
    expect(missing).toEqual([])
    expect(ignored).toEqual(['Remarks'])
    expect(rows[0]!.problems).toEqual([])
    expect(rows[0]!.input).toEqual({ student_number: 'S-1', first_name: 'Asha', last_name: 'Tamang', gender: 'female', date_of_birth: '2010-04-13' })
  })

  it('reports missing required columns', () => {
    expect(readImportRows([['first_name', 'last_name']], COLUMNS).missing).toEqual(['Student no.'])
  })

  it('flags bad rows with the line they are on', () => {
    const { rows } = readImportRows(
      [
        ['student_number', 'first_name', 'last_name', 'gender', 'date_of_birth', 'email', 'staff_type', 'is_mentor'],
        ['A1', 'Ram', 'Shrestha', 'male', '2010-02-30', 'ram@', 'Teacher', 'yes'],
        ['a1', '', 'Thapa', 'x', '', '', 'cook', 'maybe'],
      ],
      COLUMNS,
    )
    expect(rows[0]!.line).toBe(2)
    expect(rows[0]!.problems).toEqual(['Date of birth should be an AD date like 2010-04-13.', 'Email doesn’t look like an email address.'])
    expect(rows[0]!.input).toMatchObject({ staff_type: 'teaching', is_mentor: true })
    expect(rows[1]!.problems).toEqual([
      'Same Student no. as line 2.',
      'First name is empty.',
      'Gender “x” isn’t one of male, female, other.',
      'Staff type “cook” isn’t one of teaching, non_teaching.',
      'Mentor should be yes or no.',
    ])
  })

  it('leaves empty optional fields out of the request', () => {
    const { rows } = readImportRows([['student_number', 'first_name', 'last_name', 'email'], ['B2', 'Sita', 'Rai', '']], COLUMNS)
    expect(rows[0]!.input).toEqual({ student_number: 'B2', first_name: 'Sita', last_name: 'Rai' })
  })
})
