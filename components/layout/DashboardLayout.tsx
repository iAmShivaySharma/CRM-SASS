'use client'

import { useState, useMemo } from 'react'
import { useAppSelector, useAppDispatch } from '@/lib/hooks'
import { toggleSidebar } from '@/lib/slices/themeSlice'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { SocketProvider } from '@/lib/context/SocketContext'
import { useGetUserPreferencesQuery } from '@/lib/api/userPreferencesApi'
import { wallpaperService } from '@/lib/services/wallpaperService'
import { cn } from '@/lib/utils'

interface DashboardLayoutProps {
  children: React.ReactNode
  userId?: string
}

export default function DashboardLayout({ children, userId }: DashboardLayoutProps) {
  const { sidebarCollapsed } = useAppSelector(state => state.theme)
  const dispatch = useAppDispatch()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const { data: userPreferences } = useGetUserPreferencesQuery()

  const wallpaperPreferences = useMemo(() => {
    const defaultPrefs = wallpaperService.getDefaultPreferences()
    return {
      ...defaultPrefs,
      ...userPreferences?.preferences?.wallpaper
    }
  }, [userPreferences])

  const backgroundStyle = useMemo(() =>
    wallpaperService.generateBackgroundStyle(wallpaperPreferences),
    [wallpaperPreferences]
  )

  return (
    <SocketProvider>
      <div className="min-h-screen bg-background dark:bg-gray-900 relative">
        {/* Wallpaper Background */}
        {wallpaperPreferences.enabled && wallpaperPreferences.imageUrl && (
          <div
            className="fixed inset-0 z-0"
            style={backgroundStyle}
          />
        )}

        {/* Content Overlay */}
        <div className="relative z-10 min-h-screen">
          {/* Mobile overlay */}
          {mobileMenuOpen && (
            <div
              className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
              onClick={() => setMobileMenuOpen(false)}
            />
          )}

          <Sidebar
            collapsed={sidebarCollapsed}
            onToggle={() => dispatch(toggleSidebar())}
            mobileMenuOpen={mobileMenuOpen}
            onMobileMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)}
            wallpaperEnabled={wallpaperPreferences.enabled && !!wallpaperPreferences.imageUrl}
          />

          <div
            className={cn(
              'min-h-screen transition-all duration-300',
              // Desktop sidebar spacing
              'lg:ml-64',
              sidebarCollapsed && 'lg:ml-16',
              // Mobile: no left margin, sidebar is overlay
              'ml-0'
            )}
          >
            <Header
              onMobileMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)}
              wallpaperEnabled={wallpaperPreferences.enabled && !!wallpaperPreferences.imageUrl}
            />
            <main className="w-full p-4 sm:p-6 lg:p-8">
              <div
                className={cn(
                  "w-full",
                  wallpaperPreferences.enabled && wallpaperPreferences.imageUrl &&
                  "backdrop-blur-sm bg-background/80 dark:bg-gray-900/80 rounded-lg p-4"
                )}
              >
                {children}
              </div>
            </main>
          </div>
        </div>
      </div>
    </SocketProvider>
  )
}
