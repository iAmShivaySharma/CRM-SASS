'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
// Profile setup functionality will be implemented with MongoDB
import { toast } from 'sonner'
import { Briefcase, User, Building, Mail, Users } from 'lucide-react'

interface SetupFormData {
  fullName: string
  workspaceName: string
  createWorkspace: boolean
}

export default function AuthSetupPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [userEmail, setUserEmail] = useState('')
  const [userId, setUserId] = useState('')
  const [pendingInvitations, setPendingInvitations] = useState<any[]>([])
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<SetupFormData>({
    defaultValues: {
      createWorkspace: true,
    },
  })

  const createWorkspace = watch('createWorkspace')

  useEffect(() => {
    const checkUserAndSetup = async () => {
      try {
        // Check if user is authenticated via cookie
        const response = await fetch('/api/auth/verify', {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        })

        if (!response.ok || !(await response.json()).valid) {
          toast.error('Please sign in first')
          router.push('/login')
          return
        }

        // For now, redirect to dashboard since we're using complete signup flow
        // In the future, you can implement profile completion here
        router.push('/dashboard')
      } catch (error) {
        console.error('Setup check error:', error)
        toast.error('Failed to load user information')
        router.push('/login')
      } finally {
        setInitialLoading(false)
      }
    }

    checkUserAndSetup()
  }, [router])

  const onSubmit = async (data: SetupFormData) => {
    if (!userId) {
      toast.error('User not found')
      return
    }

    setLoading(true)
    try {
      // TODO: Implement profile setup with MongoDB
      // For now, just redirect to dashboard since signup flow is complete
      toast.success('Profile setup completed successfully!')
      router.push('/dashboard')
    } catch (error: any) {
      toast.error('Setup failed')
    } finally {
      setLoading(false)
    }
  }

  if (initialLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-32 w-32 animate-spin rounded-full border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="space-y-1 text-center">
          <div className="mb-4 flex items-center justify-center">
            <div className="flex items-center space-x-2">
              <Briefcase className="h-8 w-8 text-blue-600" />
              <span className="text-2xl font-bold text-gray-900 dark:text-white">
                CRM Pro
              </span>
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">
            Complete Your Setup
          </CardTitle>
          <CardDescription>
            Welcome! Let&apos;s set up your profile and workspace
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* User Email Display */}
            <div className="space-y-2">
              <Label className="text-sm text-gray-600">Email</Label>
              <div className="flex items-center space-x-2 rounded-md bg-gray-50 p-2">
                <User className="h-4 w-4 text-gray-400" />
                <span className="text-sm">{userEmail}</span>
              </div>
            </div>

            {/* Full Name */}
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name *</Label>
              <Input
                id="fullName"
                type="text"
                placeholder="Enter your full name"
                {...register('fullName', {
                  required: 'Full name is required',
                  minLength: {
                    value: 2,
                    message: 'Name must be at least 2 characters',
                  },
                })}
              />
              {errors.fullName && (
                <p className="text-sm text-red-600">
                  {errors.fullName.message}
                </p>
              )}
            </div>

            {/* Pending Invitations Display */}
            {pendingInvitations.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Pending Invitations
                </Label>
                <div className="space-y-2">
                  {pendingInvitations.map(invitation => (
                    <div
                      key={invitation.id}
                      className="flex items-center space-x-2 rounded-md bg-blue-50 p-2"
                    >
                      <Mail className="h-4 w-4 text-blue-500" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">
                          {invitation.workspaces?.name}
                        </p>
                        <p className="text-xs text-gray-600">
                          Role: {invitation.roles?.name}
                        </p>
                      </div>
                      <Users className="h-4 w-4 text-blue-500" />
                    </div>
                  ))}
                </div>
                <p className="text-xs text-blue-600">
                  These invitations will be automatically accepted when you
                  complete setup.
                </p>
              </div>
            )}

            {/* Create Workspace Option */}
            <div className="flex items-center space-x-2">
              <Checkbox id="createWorkspace" {...register('createWorkspace')} />
              <Label htmlFor="createWorkspace" className="text-sm">
                Create a new workspace
                {pendingInvitations.length > 0 && (
                  <span className="block text-xs text-gray-500">
                    (You can join existing workspaces from your invitations)
                  </span>
                )}
              </Label>
            </div>

            {/* Workspace Name (conditional) */}
            {createWorkspace && (
              <div className="space-y-2">
                <Label htmlFor="workspaceName">Workspace Name *</Label>
                <div className="relative">
                  <Building className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="workspaceName"
                    type="text"
                    placeholder="Enter workspace name"
                    className="pl-10"
                    {...register('workspaceName', {
                      required: createWorkspace
                        ? 'Workspace name is required'
                        : false,
                      minLength: {
                        value: 2,
                        message: 'Workspace name must be at least 2 characters',
                      },
                    })}
                  />
                </div>
                {errors.workspaceName && (
                  <p className="text-sm text-red-600">
                    {errors.workspaceName.message}
                  </p>
                )}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Setting up...' : 'Complete Setup'}
            </Button>
          </form>

          <div className="mt-4 text-center">
            <p className="text-sm text-gray-600">
              {!createWorkspace &&
                'You can join existing workspaces later via invitations'}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
