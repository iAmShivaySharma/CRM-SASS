'use client'

import { useState } from 'react'
import {
  User,
  Settings,
  LogOut,
  Crown,
  CreditCard,
  HelpCircle,
  ChevronUp,
  Zap,
  Star,
  Clock,
  Timer,
  Loader2,
} from 'lucide-react'
import { useAppSelector } from '@/lib/hooks'
import { useLogoutMutation } from '@/lib/api/authApi'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { AttendanceWidget } from '@/components/attendance/AttendanceWidget'

interface UserProfileProps {
  compact?: boolean
  className?: string
}

const defaultPlan = {
  name: 'Free',
  type: 'free',
  features: [] as string[],
  usage: {
    leads: { current: 0, limit: 0 },
    storage: { current: 0, limit: 0 },
    users: { current: 0, limit: 0 },
  },
}

function getPlanIcon(planType: string) {
  switch (planType) {
    case 'enterprise':
      return <Crown className="h-4 w-4 text-purple-500" />
    case 'pro':
      return <Zap className="h-4 w-4 text-blue-500" />
    case 'premium':
      return <Star className="h-4 w-4 text-yellow-500" />
    default:
      return null
  }
}

function getPlanColor(planType: string) {
  switch (planType) {
    case 'enterprise':
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300'
    case 'pro':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300'
    case 'premium':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300'
    default:
      return 'bg-muted text-foreground'
  }
}

export function UserProfile({ compact = false, className }: UserProfileProps) {
  const { user } = useAppSelector(state => state.auth)
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false)
  const [logoutUser, { isLoading: isLoggingOut }] = useLogoutMutation()

  const currentUser = {
    name: user?.fullName || user?.email || 'User',
    email: user?.email || '',
    avatar: null,
    role: (user as any)?.role || 'Member',
    plan: (user as any)?.plan || defaultPlan,
  }

  const userName = currentUser?.name || currentUser?.email || 'User'
  const userInitials = userName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()

  const handleLogout = async () => {
    try {
      await logoutUser().unwrap()
    } catch {}
    window.location.href = '/login'
  }

  const handleSettings = () => {
    window.location.href = '/settings'
  }

  const handleProfile = () => {
    window.location.href = '/profile'
  }

  const handleUpgrade = () => {
    setShowUpgradeDialog(true)
  }

  if (compact) {
    return (
      <div
        className={cn('border-t border-primary-foreground/20 pt-3', className)}
      >
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="mx-auto flex h-10 w-10 items-center justify-center rounded-full p-0 hover:!bg-primary-foreground/10 hover:!text-primary-foreground"
              title={`${currentUser.name} - ${currentUser?.plan.name} Plan`}
            >
              <Avatar className="h-8 w-8 border border-primary-foreground/30">
                <AvatarImage src={currentUser?.avatar || undefined} />
                <AvatarFallback className="bg-primary-foreground/20 text-xs font-medium text-primary-foreground">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            side="right"
            align="end"
            className="w-64 [&_[role=menuitem]:focus]:bg-primary [&_[role=menuitem]:focus]:text-primary-foreground"
          >
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">
                  {currentUser.name}
                </p>
                <p className="text-xs leading-none text-muted-foreground">
                  {currentUser.email}
                </p>
                <Badge
                  className={cn(
                    'mt-1 w-fit',
                    getPlanColor(currentUser?.plan.type)
                  )}
                >
                  {getPlanIcon(currentUser?.plan.type)}
                  <span className="ml-1">{currentUser?.plan.name}</span>
                </Badge>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleProfile}>
              <User className="mr-2 h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleSettings}>
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleUpgrade}>
              <CreditCard className="mr-2 h-4 w-4" />
              Upgrade Plan
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <HelpCircle className="mr-2 h-4 w-4" />
              Help & Support
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={isLoggingOut}
              onClick={handleLogout}
              className="text-red-600"
            >
              {isLoggingOut ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <LogOut className="mr-2 h-4 w-4" />
              )}
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    )
  }

  return (
    <div
      className={cn('border-t border-primary-foreground/20 pt-4', className)}
    >
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="h-auto w-full justify-between p-3 text-primary-foreground hover:!bg-primary-foreground/10 hover:!text-primary-foreground"
          >
            <div className="flex min-w-0 items-center space-x-3">
              <Avatar className="h-9 w-9 border border-primary-foreground/30">
                <AvatarImage src={currentUser?.avatar || undefined} />
                <AvatarFallback className="bg-primary-foreground/20 text-sm font-medium text-primary-foreground">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1 text-left">
                <p className="truncate text-sm font-medium text-primary-foreground">
                  {currentUser.name}
                </p>
                <div className="mt-0.5 flex items-center space-x-2">
                  <Badge
                    className={cn(
                      'text-xs',
                      getPlanColor(currentUser?.plan.type)
                    )}
                  >
                    {currentUser?.plan.name}
                  </Badge>
                  <span className="truncate text-xs text-primary-foreground/70">
                    {currentUser.role}
                  </span>
                </div>
              </div>
            </div>
            <ChevronUp className="h-4 w-4 text-primary-foreground/70" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          side="top"
          align="start"
          className="mb-2 w-80 [&_[role=menuitem]:focus]:bg-primary [&_[role=menuitem]:focus]:text-primary-foreground"
        >
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-2">
              <div className="flex items-center space-x-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={currentUser?.avatar || undefined} />
                  <AvatarFallback className="text-sm font-medium">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium leading-none">
                    {currentUser.name}
                  </p>
                  <p className="mt-1 break-all text-xs leading-tight text-muted-foreground">
                    {currentUser.email}
                  </p>
                </div>
              </div>

              {/* Attendance Widget */}
              <div className="border-t pt-3">
                <AttendanceWidget compact={true} showDetails={false} />
              </div>

              {/* Plan Usage */}
              <div className="space-y-2 border-t pt-2">
                <div className="flex items-center justify-between">
                  <Badge
                    className={cn(
                      'text-xs',
                      getPlanColor(currentUser?.plan.type)
                    )}
                  >
                    {getPlanIcon(currentUser?.plan.type)}
                    <span className="ml-1">{currentUser?.plan.name} Plan</span>
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={handleUpgrade}
                  >
                    Upgrade
                  </Button>
                </div>

                {/* Usage Stats */}
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Leads</span>
                    <span>
                      {currentUser?.plan.usage.leads.current.toLocaleString()} /{' '}
                      {currentUser?.plan.usage.leads.limit.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Team</span>
                    <span>
                      {currentUser?.plan.usage.users.current} /{' '}
                      {currentUser?.plan.usage.users.limit}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Storage</span>
                    <span>
                      {currentUser?.plan?.usage.storage.current}GB /{' '}
                      {currentUser?.plan.usage.storage.limit}GB
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleProfile}>
            <User className="mr-2 h-4 w-4" />
            Profile Settings
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleSettings}>
            <Settings className="mr-2 h-4 w-4" />
            Account Settings
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleUpgrade}>
            <CreditCard className="mr-2 h-4 w-4" />
            Billing & Plans
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem>
            <HelpCircle className="mr-2 h-4 w-4" />
            Help & Support
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={isLoggingOut}
            onClick={handleLogout}
            className="text-red-600"
          >
            {isLoggingOut ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <LogOut className="mr-2 h-4 w-4" />
            )}
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Upgrade Dialog */}
      <Dialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upgrade Your Plan</DialogTitle>
            <DialogDescription>
              Unlock more features and increase your limits with a higher plan.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              You&apos;re currently on the {currentUser?.plan?.name} plan.
              Upgrade to get access to more features and higher limits.
            </p>
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setShowUpgradeDialog(false)}
              >
                Maybe Later
              </Button>
              <Button
                onClick={() => {
                  setShowUpgradeDialog(false)
                  window.location.href = '/plans'
                }}
              >
                View Plans
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
