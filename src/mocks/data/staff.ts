import type { StaffMember } from '@/lib/api/staff'

const campusNames: Record<number, string> = { 1: 'Main Campus', 2: 'Lalitpur Branch', 3: '+2 Science Campus', 4: 'Putalisadak Campus' }

function staff(
  partial: Omit<StaffMember, 'full_name' | 'campus_name' | 'organization' | 'created_at' | 'updated_at'>,
): StaffMember {
  return {
    ...partial,
    organization: 1,
    full_name: [partial.first_name, partial.middle_name, partial.last_name].filter(Boolean).join(' '),
    campus_name: campusNames[partial.campus] ?? 'Main Campus',
    created_at: '2023-05-01T04:00:00Z',
    updated_at: '2026-01-05T04:00:00Z',
  }
}

export const mockStaff: StaffMember[] = [
  staff({ id: 1, employee_number: 'EMP-001', first_name: 'Rajan', middle_name: '', last_name: 'Thapa', date_of_birth: '1988-03-12', gender: 'male', email: 'rajan.thapa@greenwoodschool.edu.np', phone: '9841234567', address: 'Baneshwor, Kathmandu', campus: 1, staff_type: 'teaching', designation: 'Senior Mathematics Teacher', status: 'active', joined_on: '2023-06-10', left_on: null, user: 3 }),
  staff({ id: 2, employee_number: 'EMP-002', first_name: 'Sarita', middle_name: '', last_name: 'Pandey', date_of_birth: '1990-08-21', gender: 'female', email: 'sarita.pandey@greenwoodschool.edu.np', phone: '9812223344', address: 'Chabahil, Kathmandu', campus: 1, staff_type: 'teaching', designation: 'English Teacher', status: 'active', joined_on: '2023-07-01', left_on: null, user: null }),
  staff({ id: 3, employee_number: 'EMP-003', first_name: 'Nisha', middle_name: '', last_name: 'Gurung', date_of_birth: '1985-11-05', gender: 'female', email: 'nisha.gurung@greenwoodschool.edu.np', phone: '9856677889', address: 'Sinamangal, Kathmandu', campus: 1, staff_type: 'non_teaching', designation: 'Admissions Officer', status: 'active', joined_on: '2023-09-01', left_on: null, user: 4 }),
  staff({ id: 4, employee_number: 'EMP-004', first_name: 'Dipesh', middle_name: '', last_name: 'Rana', date_of_birth: '1987-02-17', gender: 'male', email: 'dipesh.rana@greenwoodschool.edu.np', phone: '9847712233', address: 'Patan, Lalitpur', campus: 2, staff_type: 'teaching', designation: 'Science Teacher', status: 'on_leave', joined_on: '2023-08-15', left_on: null, user: null }),
  staff({ id: 5, employee_number: 'EMP-005', first_name: 'Binod', middle_name: '', last_name: 'Adhikari', date_of_birth: '1982-04-09', gender: 'male', email: 'binod.adhikari@greenwoodschool.edu.np', phone: '9801122334', address: 'Boudha, Kathmandu', campus: 1, staff_type: 'teaching', designation: 'Social Studies Teacher', status: 'left', joined_on: '2022-02-14', left_on: '2025-08-01', user: 5 }),
  staff({ id: 6, employee_number: 'EMP-006', first_name: 'Anita', middle_name: '', last_name: 'Bhandari', date_of_birth: '1991-06-30', gender: 'female', email: 'anita.bhandari@greenwoodschool.edu.np', phone: '9861234567', address: 'New Baneshwor, Kathmandu', campus: 3, staff_type: 'teaching', designation: 'Physics Lecturer', status: 'active', joined_on: '2023-06-01', left_on: null, user: null }),
  staff({ id: 7, employee_number: 'EMP-007', first_name: 'Kamal', middle_name: '', last_name: 'Shahi', date_of_birth: '1989-09-14', gender: 'male', email: 'kamal.shahi@greenwoodschool.edu.np', phone: '9812345670', address: 'Kalanki, Kathmandu', campus: 1, staff_type: 'non_teaching', designation: 'Accountant', status: 'active', joined_on: '2023-04-20', left_on: null, user: null }),
]
