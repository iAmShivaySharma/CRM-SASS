import { useMemo } from 'react'
import { useSelector } from 'react-redux'
import { RootState } from '@/lib/store'
import { useGetRolesQuery } from '@/lib/api/roleApi'
import { useGetLastActiveWorkspaceQuery } from '@/lib/api/workspaceApi'
import {
  Permission,
  PermissionCategory,
  PERMISSION_DEFINITIONS,
} from '@/lib/permissions/constants'

export interface UserPermissions {
  hasPermission: (permission: Permission) => boolean
  hasAnyPermission: (permissions: Permission[]) => boolean
  hasAllPermissions: (permissions: Permission[]) => boolean

  getPermissionsByCategory: (category: PermissionCategory) => Permission[]
  getDependentPermissions: (permission: Permission) => Permission[]
  getConflictingPermissions: (permission: Permission) => Permission[]

  getUserRole: () => string | null
  getRolePermissions: (roleId?: string) => Permission[]
  canAccessResource: (resource: string, action: string) => boolean

  isLoading: boolean
  isError: boolean

  userPermissions: Permission[]
  allRoles: any[]
  currentWorkspace: any
}

export function usePermissions(): UserPermissions {
  const { user, isAuthenticated } = useSelector(
    (state: RootState) => state.auth
  )

  const { data: workspaceData, isLoading: workspaceLoading } =
    useGetLastActiveWorkspaceQuery(undefined, {
      skip: !isAuthenticated,
    })

  const {
    data: rolesData,
    isLoading: rolesLoading,
    isError: rolesError,
  } = useGetRolesQuery(undefined, {
    skip: !isAuthenticated || !workspaceData?.workspace,
  })

  const userPermissions = useMemo((): Permission[] => {
    if (!user?.permissions) return []

    return user.permissions.filter((perm: Permission): perm is Permission =>
      Object.values(Permission).includes(perm as Permission)
    )
  }, [user?.permissions])

  const hasPermission = useMemo(
    () =>
      (permission: Permission): boolean => {
        if (!isAuthenticated || !user) return false
        if (user.permissions?.includes('*:*')) return true
        const [resource] = (permission as string).split('.')
        if (userPermissions.includes(`${resource}.*` as Permission)) return true
        return userPermissions.includes(permission)
      },
    [isAuthenticated, user, userPermissions]
  )

  const hasAnyPermission = useMemo(
    () =>
      (permissions: Permission[]): boolean => {
        if (!isAuthenticated || !user) return false
        return permissions.some(permission =>
          userPermissions.includes(permission)
        )
      },
    [isAuthenticated, user, userPermissions]
  )

  const hasAllPermissions = useMemo(
    () =>
      (permissions: Permission[]): boolean => {
        if (!isAuthenticated || !user) return false
        return permissions.every(permission =>
          userPermissions.includes(permission)
        )
      },
    [isAuthenticated, user, userPermissions]
  )

  const getPermissionsByCategory = useMemo(
    () =>
      (category: PermissionCategory): Permission[] => {
        return Object.values(Permission).filter(
          permission =>
            PERMISSION_DEFINITIONS[permission]?.category === category
        )
      },
    []
  )

  const getDependentPermissions = useMemo(
    () =>
      (permission: Permission): Permission[] => {
        const definition = PERMISSION_DEFINITIONS[permission]
        return definition?.dependencies || []
      },
    []
  )

  const getConflictingPermissions = useMemo(
    () =>
      (permission: Permission): Permission[] => {
        const definition = PERMISSION_DEFINITIONS[permission]
        return definition?.conflictsWith || []
      },
    []
  )

  const getUserRole = useMemo(
    () => (): string | null => {
      return user?.role || null
    },
    [user?.role]
  )

  const getRolePermissions = useMemo(
    () =>
      (roleId?: string): Permission[] => {
        if (!rolesData) return []

        const targetRoleId = roleId || user?.role
        if (!targetRoleId) return []

        const role = rolesData.find(r => r.id === targetRoleId)
        if (!role) return []

        return role.permissions.filter((perm): perm is Permission =>
          Object.values(Permission).includes(perm as Permission)
        )
      },
    [rolesData, user?.role]
  )

  const canAccessResource = useMemo(
    () =>
      (resource: string, action: string): boolean => {
        const permissionKey = `${resource}.${action}` as Permission
        return hasPermission(permissionKey)
      },
    [hasPermission]
  )

  const isLoading = workspaceLoading || rolesLoading
  const isError = rolesError || !isAuthenticated

  return {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,

    getPermissionsByCategory,
    getDependentPermissions,
    getConflictingPermissions,

    getUserRole,
    getRolePermissions,
    canAccessResource,

    isLoading,
    isError,

    userPermissions,
    allRoles: rolesData || [],
    currentWorkspace: workspaceData?.workspace || null,
  }
}

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

export function useCanAccessResource(
  resource: string,
  action: string
): boolean {
  const { canAccessResource } = usePermissions()
  return canAccessResource(resource, action)
}

export {
  Permission,
  PermissionCategory,
  PERMISSION_DEFINITIONS,
} from '@/lib/permissions/constants'
