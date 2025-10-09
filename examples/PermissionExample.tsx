import React from 'react'
import { usePermissions, useHasPermission, Permission } from '@/hooks/usePermissions'

// Example component showing different ways to use the permission hook
export function PermissionExample() {
  const {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    getUserRole,
    getPermissionsByCategory,
    canAccessResource,
    userPermissions,
    isLoading
  } = usePermissions()

  // Using convenience hook
  const canViewLeads = useHasPermission(Permission.LEADS_VIEW)
  const canEditLeads = useHasPermission(Permission.LEADS_EDIT)

  if (isLoading) {
    return <div>Loading permissions...</div>
  }

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-xl font-bold">Permission Examples</h2>

      {/* Basic permission checking */}
      <div className="space-y-2">
        <h3 className="font-semibold">Basic Permission Checks:</h3>
        <p>Can view leads: {canViewLeads ? 'Yes' : 'No'}</p>
        <p>Can edit leads: {canEditLeads ? 'Yes' : 'No'}</p>
        <p>Can delete leads: {hasPermission(Permission.LEADS_DELETE) ? 'Yes' : 'No'}</p>
      </div>

      {/* Multiple permission checking */}
      <div className="space-y-2">
        <h3 className="font-semibold">Multiple Permission Checks:</h3>
        <p>
          Can view OR edit leads: {
            hasAnyPermission([Permission.LEADS_VIEW, Permission.LEADS_EDIT]) ? 'Yes' : 'No'
          }
        </p>
        <p>
          Can view AND edit leads: {
            hasAllPermissions([Permission.LEADS_VIEW, Permission.LEADS_EDIT]) ? 'Yes' : 'No'
          }
        </p>
      </div>

      {/* Resource-based checking */}
      <div className="space-y-2">
        <h3 className="font-semibold">Resource-based Checks:</h3>
        <p>Can access leads.view: {canAccessResource('leads', 'view') ? 'Yes' : 'No'}</p>
        <p>Can access roles.create: {canAccessResource('roles', 'create') ? 'Yes' : 'No'}</p>
      </div>

      {/* User role info */}
      <div className="space-y-2">
        <h3 className="font-semibold">User Role:</h3>
        <p>Current role: {getUserRole() || 'No role assigned'}</p>
      </div>

      {/* User permissions list */}
      <div className="space-y-2">
        <h3 className="font-semibold">User Permissions ({userPermissions.length}):</h3>
        <div className="max-h-40 overflow-y-auto text-sm">
          {userPermissions.map(permission => (
            <div key={permission} className="py-1">
              {permission}
            </div>
          ))}
        </div>
      </div>

      {/* Conditional rendering examples */}
      <div className="space-y-2">
        <h3 className="font-semibold">Conditional Rendering:</h3>

        {hasPermission(Permission.LEADS_CREATE) && (
          <button className="bg-blue-500 text-white px-4 py-2 rounded">
            Create Lead
          </button>
        )}

        {hasPermission(Permission.ROLES_VIEW) && (
          <button className="bg-green-500 text-white px-4 py-2 rounded ml-2">
            Manage Roles
          </button>
        )}

        {hasAnyPermission([Permission.ANALYTICS_VIEW, Permission.REPORTS_VIEW]) && (
          <button className="bg-purple-500 text-white px-4 py-2 rounded ml-2">
            View Reports
          </button>
        )}
      </div>
    </div>
  )
}

// Example of using permissions in a form component
export function LeadForm() {
  const { hasPermission } = usePermissions()

  const canEdit = hasPermission(Permission.LEADS_EDIT)
  const canDelete = hasPermission(Permission.LEADS_DELETE)
  const canAssign = hasPermission(Permission.LEADS_ASSIGN)

  return (
    <form className="space-y-4 p-4">
      <div>
        <label htmlFor="name">Lead Name:</label>
        <input
          id="name"
          type="text"
          disabled={!canEdit}
          className="block w-full mt-1 p-2 border rounded"
        />
      </div>

      <div>
        <label htmlFor="status">Status:</label>
        <select
          id="status"
          disabled={!canEdit}
          className="block w-full mt-1 p-2 border rounded"
        >
          <option>New</option>
          <option>Contacted</option>
          <option>Qualified</option>
        </select>
      </div>

      {canAssign && (
        <div>
          <label htmlFor="assignee">Assign to:</label>
          <select
            id="assignee"
            className="block w-full mt-1 p-2 border rounded"
          >
            <option>Select user...</option>
          </select>
        </div>
      )}

      <div className="flex space-x-2">
        {canEdit && (
          <button
            type="submit"
            className="bg-blue-500 text-white px-4 py-2 rounded"
          >
            Save
          </button>
        )}

        {canDelete && (
          <button
            type="button"
            className="bg-red-500 text-white px-4 py-2 rounded"
          >
            Delete
          </button>
        )}
      </div>
    </form>
  )
}