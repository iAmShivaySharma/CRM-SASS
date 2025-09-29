import { NextRequest, NextResponse } from 'next/server'

const mockPermissions = [
  // Leads permissions
  {
    id: '1',
    name: 'Create Lead',
    resource: 'leads',
    action: 'create' as const,
  },
  { id: '2', name: 'Read Lead', resource: 'leads', action: 'read' as const },
  {
    id: '3',
    name: 'Update Lead',
    resource: 'leads',
    action: 'update' as const,
  },
  {
    id: '4',
    name: 'Delete Lead',
    resource: 'leads',
    action: 'delete' as const,
  },

  // Users permissions
  {
    id: '5',
    name: 'Create User',
    resource: 'users',
    action: 'create' as const,
  },
  { id: '6', name: 'Read User', resource: 'users', action: 'read' as const },
  {
    id: '7',
    name: 'Update User',
    resource: 'users',
    action: 'update' as const,
  },
  {
    id: '8',
    name: 'Delete User',
    resource: 'users',
    action: 'delete' as const,
  },

  // Roles permissions
  {
    id: '9',
    name: 'Create Role',
    resource: 'roles',
    action: 'create' as const,
  },
  { id: '10', name: 'Read Role', resource: 'roles', action: 'read' as const },
  {
    id: '11',
    name: 'Update Role',
    resource: 'roles',
    action: 'update' as const,
  },
  {
    id: '12',
    name: 'Delete Role',
    resource: 'roles',
    action: 'delete' as const,
  },

  // Workspace permissions
  {
    id: '13',
    name: 'Create Workspace',
    resource: 'workspace',
    action: 'create' as const,
  },
  {
    id: '14',
    name: 'Read Workspace',
    resource: 'workspace',
    action: 'read' as const,
  },
  {
    id: '15',
    name: 'Update Workspace',
    resource: 'workspace',
    action: 'update' as const,
  },
  {
    id: '16',
    name: 'Delete Workspace',
    resource: 'workspace',
    action: 'delete' as const,
  },
]

export async function GET(request: NextRequest) {
  return NextResponse.json(mockPermissions)
}
