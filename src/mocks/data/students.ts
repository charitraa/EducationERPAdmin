import type { EnrollmentRef, Student } from '@/lib/api/students'

const campusNames: Record<number, string> = { 1: 'Main Campus', 2: 'Lalitpur Branch', 3: '+2 Science Campus', 4: 'Putalisadak Campus' }

function student(partial: Omit<Student, 'full_name' | 'campus_name' | 'organization' | 'current_enrollment' | 'created_at' | 'updated_at'> & { section?: string }): Student {
  const { section, ...s } = partial
  return {
    ...s,
    organization: 1,
    full_name: [s.first_name, s.middle_name, s.last_name].filter(Boolean).join(' '),
    campus_name: campusNames[s.campus] ?? 'Main Campus',
    current_enrollment:
      s.status === 'active' || s.status === 'suspended'
        ? {
            id: s.id * 10,
            section: s.id * 100,
            section_name: section ?? 'Grade 8 A',
            status: s.status === 'suspended' ? 'suspended' : 'active',
            started_on: s.admitted_on ?? '2024-04-15',
            ended_on: null,
          }
        : null,
    created_at: '2024-04-15T04:00:00Z',
    updated_at: '2026-01-05T04:00:00Z',
  }
}

export const mockStudents: Student[] = [
  student({ id: 1, student_number: 'GIS-2024-001', first_name: 'Aayush', middle_name: '', last_name: 'Basnet', date_of_birth: '2012-03-14', gender: 'male', email: 'aayush.basnet@student.greenwoodschool.edu.np', phone: '', address: 'Koteshwor, Kathmandu', campus: 1, status: 'active', admitted_on: '2024-04-15', user: null, section: 'Grade 8 A' }),
  student({ id: 2, student_number: 'GIS-2024-002', first_name: 'Kripa', middle_name: '', last_name: 'Shrestha', date_of_birth: '2012-07-22', gender: 'female', email: 'kripa.shrestha@student.greenwoodschool.edu.np', phone: '', address: 'Baneshwor, Kathmandu', campus: 1, status: 'active', admitted_on: '2024-04-15', user: null, section: 'Grade 8 A' }),
  student({ id: 3, student_number: 'GIS-2024-003', first_name: 'Sujal', middle_name: '', last_name: 'Maharjan', date_of_birth: '2011-11-02', gender: 'male', email: '', phone: '9812345671', address: 'Patan, Lalitpur', campus: 2, status: 'active', admitted_on: '2024-04-16', user: null, section: 'Grade 9 B' }),
  student({ id: 4, student_number: 'GIS-2024-004', first_name: 'Anjali', middle_name: '', last_name: 'Rai', date_of_birth: '2012-01-30', gender: 'female', email: '', phone: '', address: 'Chabahil, Kathmandu', campus: 1, status: 'suspended', admitted_on: '2024-04-15', user: null, section: 'Grade 8 B' }),
  student({ id: 5, student_number: 'GIS-2023-045', first_name: 'Bibek', middle_name: 'Kumar', last_name: 'Tamang', date_of_birth: '2010-05-18', gender: 'male', email: '', phone: '', address: 'Boudha, Kathmandu', campus: 1, status: 'graduated', admitted_on: '2022-04-10', user: null }),
  student({ id: 6, student_number: 'GIS-2024-005', first_name: 'Muskan', middle_name: '', last_name: 'Khadka', date_of_birth: '2013-02-11', gender: 'female', email: '', phone: '', address: 'Kalanki, Kathmandu', campus: 3, status: 'active', admitted_on: '2024-05-01', user: null, section: 'Grade 11 Science A' }),
  student({ id: 7, student_number: 'GIS-2022-010', first_name: 'Yubraj', middle_name: '', last_name: 'Poudel', date_of_birth: '2009-09-09', gender: 'male', email: '', phone: '', address: 'Gongabu, Kathmandu', campus: 1, status: 'withdrawn', admitted_on: '2021-04-01', user: null }),
  student({ id: 8, student_number: 'GIS-2024-006', first_name: 'Prisha', middle_name: '', last_name: 'Lama', date_of_birth: '2012-12-25', gender: 'female', email: '', phone: '', address: 'Sinamangal, Kathmandu', campus: 1, status: 'active', admitted_on: '2024-04-15', user: null, section: 'Grade 8 A' }),
  student({ id: 9, student_number: 'GIS-2024-007', first_name: 'Sandesh', middle_name: '', last_name: 'Ghimire', date_of_birth: '2011-06-06', gender: 'male', email: '', phone: '', address: 'Tinkune, Kathmandu', campus: 2, status: 'active', admitted_on: '2024-04-16', user: null, section: 'Grade 9 B' }),
  student({ id: 10, student_number: 'GIS-2024-008', first_name: 'Ritika', middle_name: '', last_name: 'Bista', date_of_birth: '2013-04-19', gender: 'female', email: '', phone: '', address: 'New Baneshwor, Kathmandu', campus: 3, status: 'active', admitted_on: '2024-05-01', user: null, section: 'Grade 11 Science A' }),
]

export const mockEnrollments: Record<number, EnrollmentRef[]> = {
  1: [{ id: 10, section: 100, section_name: 'Grade 8 A', status: 'active', started_on: '2024-04-15', ended_on: null }],
  4: [
    { id: 39, section: 80, section_name: 'Grade 7 B', status: 'promoted', started_on: '2023-04-16', ended_on: '2024-04-14' },
    { id: 40, section: 40, section_name: 'Grade 8 B', status: 'suspended', started_on: '2024-04-15', ended_on: null },
  ],
  5: [
    { id: 20, section: 20, section_name: 'Grade 9 A', status: 'promoted', started_on: '2022-04-10', ended_on: '2023-04-14' },
    { id: 21, section: 21, section_name: 'Grade 10 A', status: 'graduated', started_on: '2023-04-15', ended_on: '2024-04-10' },
  ],
  7: [{ id: 7, section: 7, section_name: 'Grade 6 A', status: 'withdrawn', started_on: '2021-04-01', ended_on: '2023-01-15' }],
}
