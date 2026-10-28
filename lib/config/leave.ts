export const LEAVE_REQUEST_TYPES = [
  { value: 'annual', label: 'Annual Leave' },
  { value: 'sick', label: 'Sick Leave' },
  { value: 'personal', label: 'Personal Leave' },
  { value: 'maternity', label: 'Maternity Leave' },
  { value: 'paternity', label: 'Paternity Leave' },
  { value: 'emergency', label: 'Emergency Leave' },
  { value: 'bereavement', label: 'Bereavement Leave' },
  { value: 'study', label: 'Study Leave' },
] as const

export type LeaveRequestType = (typeof LEAVE_REQUEST_TYPES)[number]['value']

export function leaveTypeLabel(value: string) {
  return LEAVE_REQUEST_TYPES.find(t => t.value === value)?.label ?? value
}
