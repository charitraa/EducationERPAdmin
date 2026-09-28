import type { Child, Parent } from '@/lib/api/parents'

function parent(
  partial: Omit<Parent, 'full_name' | 'organization' | 'created_at' | 'updated_at'>,
): Parent {
  return {
    ...partial,
    organization: 1,
    full_name: [partial.first_name, partial.middle_name, partial.last_name].filter(Boolean).join(' '),
    created_at: '2024-04-10T04:00:00Z',
    updated_at: '2024-04-10T04:00:00Z',
  }
}

export const mockParents: Parent[] = [
  parent({ id: 1, first_name: 'Kiran', middle_name: '', last_name: 'Basnet', phone: '9801122001', email: 'kiran.basnet@gmail.com', occupation: 'Engineer', address: 'Koteshwor, Kathmandu', user: null }),
  parent({ id: 2, first_name: 'Sunita', middle_name: '', last_name: 'Shrestha', phone: '9801122002', email: 'sunita.shrestha@gmail.com', occupation: 'Business Owner', address: 'Baneshwor, Kathmandu', user: null }),
  parent({ id: 3, first_name: 'Ramesh', middle_name: '', last_name: 'Maharjan', phone: '9801122003', email: '', occupation: 'Farmer', address: 'Patan, Lalitpur', user: null }),
  parent({ id: 4, first_name: 'Gita', middle_name: '', last_name: 'Rai', phone: '9801122004', email: 'gita.rai@gmail.com', occupation: 'Nurse', address: 'Chabahil, Kathmandu', user: null }),
  parent({ id: 5, first_name: 'Deepak', middle_name: '', last_name: 'Khadka', phone: '9801122005', email: 'deepak.khadka@gmail.com', occupation: 'Government Employee', address: 'Kalanki, Kathmandu', user: null }),
]

export const mockParentChildren: Record<number, Child[]> = {
  1: [
    { student: 1, student_number: 'GIS-2024-001', full_name: 'Aayush Basnet', campus_name: 'Main Campus', status: 'active', relationship: 'father', is_primary_contact: true },
  ],
  2: [
    { student: 2, student_number: 'GIS-2024-002', full_name: 'Kripa Shrestha', campus_name: 'Main Campus', status: 'active', relationship: 'mother', is_primary_contact: true },
  ],
  3: [
    { student: 3, student_number: 'GIS-2024-003', full_name: 'Sujal Maharjan', campus_name: 'Lalitpur Branch', status: 'active', relationship: 'father', is_primary_contact: true },
    { student: 9, student_number: 'GIS-2024-007', full_name: 'Sandesh Ghimire', campus_name: 'Lalitpur Branch', status: 'active', relationship: 'guardian', is_primary_contact: false },
  ],
  4: [
    { student: 4, student_number: 'GIS-2024-004', full_name: 'Anjali Rai', campus_name: 'Main Campus', status: 'suspended', relationship: 'mother', is_primary_contact: true },
  ],
  5: [],
}
