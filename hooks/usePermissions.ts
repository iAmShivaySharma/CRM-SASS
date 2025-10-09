import { useMemo } from 'react'
import { useSelector } from 'react-redux'
import { RootState } from '@/lib/store'
import { useGetRolesQuery } from '@/lib/api/roleApi'
import { useGetLastActiveWorkspaceQuery } from '@/lib/api/workspaceApi'
import { Permission, PermissionCategory, PERMISSION_DEFINITIONS } from '@/lib/permissions/constants'

export interface UserPermissions {
  // Permission checking
  hasPermission: (permission: Permission) => boolean
  hasAnyPermission: (permissions: Permission[]) => boolean
  hasAllPermissions: (permissions: Permission[]) => boolean

  // Permission utilities
  getPermissionsByCategory: (category: PermissionCategory) => Permission[]
  getDependentPermissions: (permission: Permission) => Permission[]
  getConflictingPermissions: (permission: Permission) => Permission[]

  // Role utilities
  getUserRole: () => string | null
  getRolePermissions: (roleId?: string) => Permission[]
  canAccessResource: (resource: string, action: string) => boolean

  // Loading states
  isLoading: boolean
  isError: boolean

  // Raw data access
  userPermissions: Permission[]
  allRoles: any[]
  currentWorkspace: any
}

/**
 * Comprehensive hook for role and permission management
 * Integrates with RTK Query for real-time data and provides utility functions
 */
export function usePermissions(): UserPermissions {
  // Get authentication state
  const { user, isAuthenticated } = useSelector((state: RootState) => state.auth)

  // Fetch workspace and roles data
  const { data: workspaceData, isLoading: workspaceLoading } = useGetLastActiveWorkspaceQuery(undefined, {
    skip: !isAuthenticated
  })

  const { data: rolesData, isLoading: rolesLoading, isError: rolesError } = useGetRolesQuery(undefined, {
    skip: !isAuthenticated || !workspaceData?.workspace
  })

  // Extract user permissions from auth state
  const userPermissions = useMemo((): Permission[] => {
    if (!user?.permissions) return []

    return user.permissions
      .filter((perm: Permission): perm is Permission =>
        Object.values(Permission).includes(perm as Permission)
      )
  }, [user?.permissions])

  // Permission checking functions
  const hasPermission = useMemo(() =>
    (permission: Permission): boolean => {
      if (!isAuthenticated || !user) return false
      return userPermissions.includes(permission)
    }, [isAuthenticated, user, userPermissions]
  )

  const hasAnyPermission = useMemo(() =>
    (permissions: Permission[]): boolean => {
      if (!isAuthenticated || !user) return false
      return permissions.some(permission => userPermissions.includes(permission))
    }, [isAuthenticated, user, userPermissions]
  )

  const hasAllPermissions = useMemo(() =>
    (permissions: Permission[]): boolean => {
      if (!isAuthenticated || !user) return false
      return permissions.every(permission => userPermissions.includes(permission))
    }, [isAuthenticated, user, userPermissions]
  )

  // Permission utility functions
  const getPermissionsByCategory = useMemo(() =>
    (category: PermissionCategory): Permission[] => {
      return Object.values(Permission).filter(permission =>
        PERMISSION_DEFINITIONS[permission]?.category === category
      )
    }, []
  )

  const getDependentPermissions = useMemo(() =>
    (permission: Permission): Permission[] => {
      const definition = PERMISSION_DEFINITIONS[permission]
      return definition?.dependencies || []
    }, []
  )

  const getConflictingPermissions = useMemo(() =>
    (permission: Permission): Permission[] => {
      const definition = PERMISSION_DEFINITIONS[permission]
      return definition?.conflictsWith || []
    }, []
  )

  // Role utility functions
  const getUserRole = useMemo(() =>
    (): string | null => {
      return user?.role || null
    }, [user?.role]
  )

  const getRolePermissions = useMemo(() =>
    (roleId?: string): Permission[] => {
      if (!rolesData) return []

      const targetRoleId = roleId || user?.role
      if (!targetRoleId) return []

      const role = rolesData.find(r => r.id === targetRoleId)
      if (!role) return []

      return role.permissions
        .filter((perm): perm is Permission =>
          Object.values(Permission).includes(perm as Permission)
        )
    }, [rolesData, user?.role]
  )

  const canAccessResource = useMemo(() =>
    (resource: string, action: string): boolean => {
      const permissionKey = `${resource}.${action}` as Permission
      return hasPermission(permissionKey)
    }, [hasPermission]
  )

  // Loading and error states
  const isLoading = workspaceLoading || rolesLoading
  const isError = rolesError || !isAuthenticated

  return {
    // Permission checking
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,

    // Permission utilities
    getPermissionsByCategory,
    getDependentPermissions,
    getConflictingPermissions,

    // Role utilities
    getUserRole,
    getRolePermissions,
    canAccessResource,

    // Loading states
    isLoading,
    isError,

    // Raw data access
    userPermissions,
    allRoles: rolesData || [],
    currentWorkspace: workspaceData?.workspace || null
  }
}

// Convenience hooks for common use cases
export function useHasPermission(permission: Permission): boolean {
  const { hasPermission } = usePermissions()
  return hasPermission(permission)
}

export function useHasAnyPermission(permissions: Permission[]): boolean {
  const { hasAnyPermission } = usePermissions()
  return hasAnyPermission(permissions)
}

export function useHasAllPermissions(permissions: Permission[]): boolean {
  const { hasAllPermissions } = usePermissions()
  return hasAllPermissions(permissions)
}

export function useCanAccessResource(resource: string, action: string): boolean {
  const { canAccessResource } = usePermissions()
  return canAccessResource(resource, action)
}

// Permission constants re-export for convenience
export { Permission, PermissionCategory, PERMISSION_DEFINITIONS } from '@/lib/permissions/constants'