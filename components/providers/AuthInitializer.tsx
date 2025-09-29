'use client'

import { useEffect } from 'react'
import { useAppDispatch } from '@/lib/hooks'
import { loginSuccess, logout } from '@/lib/slices/authSlice'
import { setCurrentWorkspace } from '@/lib/slices/workspaceSlice'

export function AuthInitializer({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch()

  useEffect(() => {
    // Initialize authentication state from server
    const initializeAuth = async () => {
      try {
        const response = await fetch('/api/auth/verify', {
          method: 'POST',
          credentials: 'include', // Include cookies
          headers: {
            'Content-Type': 'application/json',
          },
        })

        if (response.ok) {
          const data = await response.json()

          if (data.valid && data.user) {
            // Restore user session in Redux (token is in HTTP-only cookie)
            dispatch(
              loginSuccess({
                user: data.user,
              })
            )

            // Restore workspace if available
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
          }
        } else {
          dispatch(logout())
        }
      } catch (error) {
        console.error('[AUTH] Error initializing auth:', error)
        dispatch(logout())
      }
    }

    initializeAuth()
  }, [dispatch])

  return <>{children}</>
}
