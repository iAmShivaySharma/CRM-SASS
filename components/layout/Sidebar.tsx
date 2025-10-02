'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import {
  LayoutDashboard,
  Users,
  UserCheck,
  Settings,
  Building,
  CreditCard,
  Menu,
  ChevronLeft,
  ChevronDown,
  ChevronRight,
  Briefcase,
  BarChart3,
  Webhook,
  Tag,
  Circle,
  Contact,
  TrendingUp,
  UserPlus,
  Settings2,
  Phone,
  Mail,
  MessageSquare,
  FolderKanban,
  Folder,
  CheckSquare,
  FileText,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { WorkspaceSwitcher } from './WorkspaceSwitcher'
import { UserProfile } from './UserProfile'

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
  mobileMenuOpen?: boolean
  onMobileMenuToggle?: () => void
}

const navigation = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    category: 'main',
  },

  // Sales Section
  {
    name: 'Sales',
    href: '/sales',
    icon: TrendingUp,
    category: 'section',
    id: 'sales',
  },
  {
    name: 'Leads',
    href: '/leads',
    icon: Users,
    category: 'sales',
    parent: 'sales',
  },
  {
    name: 'Contacts',
    href: '/contacts',
    icon: Contact,
    category: 'sales',
    parent: 'sales',
  },
  {
    name: 'Lead Statuses',
    href: '/leads/statuses',
    icon: Circle,
    category: 'sales',
    parent: 'sales',
  },
  {
    name: 'Lead Tags',
    href: '/leads/tags',
    icon: Tag,
    category: 'sales',
    parent: 'sales',
  },
  {
    name: 'Webhooks',
    href: '/webhooks',
    icon: Webhook,
    category: 'sales',
    parent: 'sales',
  },

  // HR and Engines as regular tabs
  { name: 'HR', href: '/hr', icon: UserPlus, category: 'main' },
  { name: 'Engines', href: '/engines', icon: Settings2, category: 'main' },

  // Communication
  { name: 'Chat', href: '/chat', icon: MessageSquare, category: 'main' },
  { name: 'Calls', href: '/calls', icon: Phone, category: 'main' },
  { name: 'Email', href: '/email', icon: Mail, category: 'main' },

  // Project Management Section
  {
    name: 'Project',
    href: '/projects',
    icon: FolderKanban,
    category: 'section',
    id: 'projects',
  },
  {
    name: 'Projects',
    href: '/projects',
    icon: Folder,
    category: 'projects',
    parent: 'projects',
  },
  {
    name: 'Tasks',
    href: '/projects/tasks',
    icon: CheckSquare,
    category: 'projects',
    parent: 'projects',
  },
  {
    name: 'Members',
    href: '/projects/members',
    icon: Users,
    category: 'projects',
    parent: 'projects',
  },
  {
    name: 'Documents',
    href: '/projects/documents',
    icon: FileText,
    category: 'projects',
    parent: 'projects',
  },

  // Other sections
  { name: 'Analytics', href: '/analytics', icon: BarChart3, category: 'main' },
  { name: 'Roles', href: '/roles', icon: UserCheck, category: 'main' },
  { name: 'Workspace', href: '/workspace', icon: Building, category: 'main' },
  // { name: 'Plans', href: '/plans', icon: CreditCard }, // Hidden for now
  { name: 'Settings', href: '/settings', icon: Settings, category: 'main' },
]

export function Sidebar({
  collapsed,
  onToggle,
  mobileMenuOpen,
  onMobileMenuToggle,
}: SidebarProps) {
  const pathname = usePathname()
  const [expandedSections, setExpandedSections] = useState<
    Record<string, boolean>
  >({
    sales: false, // All sections collapsed by default
    projects: false,
    hr: false,
    engines: false,
  })

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }))
  }

  const renderNavItem = (item: any) => {
    const isActive = pathname === item.href
    const isSection = item.category === 'section'
    const isSubItem = item.parent
    const isExpanded = item.id ? expandedSections[item.id] : false
    const hasSubItems = navigation.some(nav => nav.parent === item.id)

    // Don't render sub-items if their parent section is collapsed
    if (isSubItem && !expandedSections[item.parent]) {
      return null
    }

    if (isSection) {
      return (
        <div key={item.name} className="mb-2">
          <button
            onClick={() => hasSubItems && toggleSection(item.id)}
            className={cn(
              'group mb-2 mt-4 flex w-full items-center rounded-xl px-3 py-3 text-sm font-semibold transition-all duration-300',
              hasSubItems
                ? 'cursor-pointer hover:scale-[1.01] hover:transform hover:bg-primary/30 hover:text-white hover:shadow-md dark:hover:bg-primary/40 dark:hover:text-white'
                : 'cursor-default',
              'text-xs uppercase tracking-wider text-gray-600 dark:text-gray-400'
            )}
          >
            <item.icon
              className={cn(
                'h-5 w-5 shrink-0 transition-all duration-300',
                collapsed ? 'mx-auto' : 'mr-3',
                'text-gray-500 group-hover:text-white dark:text-gray-500 dark:group-hover:text-white'
              )}
            />
            {!collapsed && (
              <>
                <span className="flex-1 text-left">{item.name}</span>
                {hasSubItems && (
                  <span className="ml-auto transition-all duration-300 group-hover:scale-110">
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-gray-500 group-hover:text-white dark:text-gray-500 dark:group-hover:text-white" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-gray-500 group-hover:text-white dark:text-gray-500 dark:group-hover:text-white" />
                    )}
                  </span>
                )}
              </>
            )}
          </button>
        </div>
      )
    }

    return (
      <Link
        key={item.name}
        href={item.href}
        className={cn(
          'group relative flex items-center overflow-hidden rounded-xl px-3 py-3 text-sm font-medium transition-all duration-300',
          isSubItem && 'ml-6 rounded-lg py-2.5',
          isActive
            ? 'scale-[1.02] transform bg-gradient-to-r from-primary to-primary/90 text-white shadow-lg shadow-primary/25'
            : 'text-gray-700 hover:scale-[1.01] hover:transform hover:bg-primary/30 hover:text-white hover:shadow-md dark:text-gray-300 dark:hover:bg-primary/40 dark:hover:text-white'
        )}
      >
        {isSubItem && !collapsed && (
          <div className="mr-2 flex items-center">
            <div className="h-3 w-3 rounded-bl-sm border-b-2 border-l-2 border-gray-400 group-hover:border-white dark:border-gray-500"></div>
          </div>
        )}
        <item.icon
          className={cn(
            'h-5 w-5 shrink-0 transition-all duration-300',
            collapsed ? 'mx-auto' : isSubItem ? 'mr-3' : 'mr-3',
            isActive
              ? 'text-white drop-shadow-sm'
              : 'text-gray-500 group-hover:text-white dark:text-gray-400 dark:group-hover:text-white'
          )}
        />
        {!collapsed && (
          <span className="font-medium tracking-wide">{item.name}</span>
        )}
        {isActive && !collapsed && (
          <div className="absolute right-2 h-6 w-1 rounded-full bg-white/30"></div>
        )}
      </Link>
    )
  }

  return (
    <div
      className={cn(
        'fixed inset-y-0 left-0 z-50 bg-white shadow-xl transition-all duration-300 dark:bg-gray-950',
        // Desktop behavior
        'hidden flex-col lg:flex',
        collapsed ? 'lg:w-16' : 'lg:w-64',
        // Mobile behavior - overlay when open
        mobileMenuOpen && 'flex w-64 flex-col',
        !mobileMenuOpen && 'lg:flex'
      )}
    >
      <div className="flex h-full flex-col">
        <div className="flex h-16 shrink-0 items-center justify-between bg-gradient-to-r from-primary/10 to-primary/5 px-4 dark:from-primary/20 dark:to-primary/10">
          {!collapsed && (
            <div className="flex items-center space-x-3">
              <div className="rounded-lg bg-primary p-1.5 shadow-lg">
                <Briefcase className="h-6 w-6 text-white" />
              </div>
              <div>
                <span className="bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-xl font-bold text-transparent">
                  CRM Pro
                </span>
              </div>
            </div>
          )}
          {collapsed && (
            <div className="mx-auto rounded-lg bg-primary p-1.5 shadow-lg">
              <Briefcase className="h-6 w-6 text-white" />
            </div>
          )}
          {/* Only show toggle on desktop */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggle}
            className="hidden h-9 w-9 rounded-lg p-0 transition-all duration-200 hover:bg-primary/10 dark:hover:bg-primary/20 lg:flex"
          >
            {collapsed ? (
              <Menu className="h-4 w-4 text-gray-600 dark:text-gray-300" />
            ) : (
              <ChevronLeft className="h-4 w-4 text-gray-600 dark:text-gray-300" />
            )}
          </Button>
        </div>

        {/* Workspace Switcher */}
        {!collapsed && (
          <div className="bg-gray-50/50 px-3 py-3 dark:bg-gray-900/30">
            <div className="group rounded-lg px-2 py-1 transition-all duration-200 hover:bg-primary/30 hover:text-white dark:hover:bg-primary/40">
              <WorkspaceSwitcher
                className="[&_*]:group-hover:text-white [&_svg]:group-hover:text-white"
                showCreateButton={true}
                compact={false}
              />
            </div>
          </div>
        )}

        {/* Collapsed workspace indicator */}
        {collapsed && (
          <div className="bg-gray-50/50 px-2 py-3 dark:bg-gray-900/30">
            <div className="group rounded-lg px-2 py-1 transition-all duration-200 hover:bg-primary/30 hover:text-white dark:hover:bg-primary/40">
              <WorkspaceSwitcher
                className="[&_*]:group-hover:text-white [&_svg]:group-hover:text-white"
                showCreateButton={false}
                compact={true}
              />
            </div>
          </div>
        )}

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <div className="space-y-1">
            {navigation.map(item => renderNavItem(item))}
          </div>
        </nav>

        {/* User Profile - Bottom of sidebar */}
        <div className="mt-auto bg-gradient-to-t from-gray-50/80 to-transparent p-3 dark:from-gray-900/50">
          <UserProfile compact={collapsed} />
        </div>
      </div>
    </div>
  )
}
