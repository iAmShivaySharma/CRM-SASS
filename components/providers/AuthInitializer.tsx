'use client'

import { useEffect, useState } from 'react'
import { useAppDispatch } from '@/lib/hooks'
import { loginSuccess, logout } from '@/lib/slices/authSlice'
import { setCurrentWorkspace } from '@/lib/slices/workspaceSlice'

export function AuthInitializer({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch()
  const [isVerified, setIsVerified] = useState(false)

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const response = await fetch('/api/auth/verify', {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        })

        if (response.ok) {
          const data = await response.json()

          if (data.valid && data.user) {
            dispatch(
              loginSuccess({
                user: {
                  id: data.user.id,
                  email: data.user.email,
                  name: data.user.fullName || data.user.name || data.user.email,
                  role: data.user.role || 'user',
                  roleId: data.user.roleId || '',
                  workspaceId:
                    data.user.workspaceId || data.workspace?.id || '',
                  permissions: data.user.permissions || [],
                },
              })
            )

            if (data.workspace) {
              dispatch(
                setCurrentWorkspace({
                  id: data.workspace.id,
                  name: data.workspace.name,
                  plan: data.workspace.planId || 'free',
                  memberCount: data.workspace.memberCount || 1,
                  currency: data.workspace.currency || 'USD',
                  timezone: data.workspace.timezone || 'UTC',
                  settings: data.workspace.settings || {
                    dateFormat: 'MM/DD/YYYY',
                    timeFormat: '12h',
                    weekStartsOn: 0,
                    language: 'en',
                  },
                  createdAt: data.workspace.createdAt,
                })
              )
            }
          } else {
            dispatch(logout())
            const pathname = window.location.pathname
            const isPublicPage =
              pathname === '/login' ||
              pathname === '/signup' ||
              pathname.startsWith('/shared') ||
              pathname.startsWith('/blog') ||
              pathname === '/'
            if (!isPublicPage) {
              window.location.href = `/login?redirect=${encodeURIComponent(pathname)}`
              return
            }
          }
        } else {
          dispatch(logout())
          const pathname = window.location.pathname
          const isPublicPage =
            pathname === '/login' ||
            pathname === '/signup' ||
            pathname.startsWith('/shared') ||
            pathname.startsWith('/blog') ||
            pathname === '/'
          if (!isPublicPage) {
            window.location.href = `/login?redirect=${encodeURIComponent(pathname)}`
            return
          }
        }
      } catch (error) {
        dispatch(logout())
      }

      setIsVerified(true)
    }

    initializeAuth()

    if (document.cookie.includes('oauth_user_data')) {
      document.cookie = 'oauth_user_data=; path=/; max-age=0'
    }
  }, [dispatch])

  if (!isVerified) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  return <>{children}</>
}
