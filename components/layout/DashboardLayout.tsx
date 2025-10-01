'use client'

import { useState } from 'react'
import { useAppSelector, useAppDispatch } from '@/lib/hooks'
import { toggleSidebar } from '@/lib/slices/themeSlice'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { SocketProvider } from '@/lib/context/SocketContext'
import { cn } from '@/lib/utils'

interface DashboardLayoutProps {
  children: React.ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { sidebarCollapsed } = useAppSelector(state => state.theme)
  const dispatch = useAppDispatch()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <SocketProvider>
      <div className="min-h-screen bg-background dark:bg-gray-900">
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
          <Header onMobileMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)} />
          <main className="w-full p-4 sm:p-6 lg:p-8">
            <div className="w-full">{children}</div>
          </main>
        </div>
      </div>
    </SocketProvider>
  )
}
