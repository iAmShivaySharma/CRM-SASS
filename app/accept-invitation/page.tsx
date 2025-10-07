'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Mail,
  UserPlus,
  LogIn,
} from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import Link from 'next/link'

interface InvitationData {
  id: string
  email: string
  workspace: {
    id: string
    name: string
  }
  role: {
    id: string
    name: string
  }
  invitedBy: {
    name: string
    email: string
  }
  expiresAt: string
}

interface AcceptanceResult {
  success: boolean
  message: string
  workspace?: {
    id: string
    name: string
  }
  role?: {
    id: string
    name: string
  }
  requireLogin?: boolean
}

type UserState = 'loading' | 'guest' | 'wrong-user' | 'correct-user' | 'error'

export default function AcceptInvitationPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams?.get('token')

  const [userState, setUserState] = useState<UserState>('loading')
  const [invitation, setInvitation] = useState<InvitationData | null>(null)
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<AcceptanceResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Registration form state
  const [fullName, setFullName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const validateInvitationAndUserState = useCallback(async () => {
    if (!token) return

    try {
      // First, validate the invitation token (no auth required)
      const invitationResponse = await fetch('/api/invitations/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })

      const invitationData = await invitationResponse.json()

      if (!invitationResponse.ok || !invitationData.valid) {
        setError(invitationData.message || 'Invalid invitation')
        setUserState('error')
        return
      }

      setInvitation(invitationData.invitation)

      // Check if user is authenticated and if it's the correct user
      try {
        const authResponse = await fetch('/api/auth/verify', {
          method: 'GET',
          credentials: 'include',
        })

        if (authResponse.ok) {
          const userData = await authResponse.json()
          setCurrentUserEmail(userData.user.email)

          if (userData.user.email === invitationData.invitation.email) {
            setUserState('correct-user')
          } else {
            setUserState('wrong-user')
          }
        } else {
          // User not authenticated
          setUserState('guest')
        }
      } catch (authError) {
        // Authentication check failed, treat as guest
        setUserState('guest')
      }
    } catch (err) {
      setError('Failed to validate invitation. Please try again.')
      setUserState('error')
      console.error('Error validating invitation:', err)
    }
  }, [token])

  useEffect(() => {
    if (!token) {
      setError('No invitation token provided in the URL')
      setUserState('error')
      return
    }

    // Validate invitation token and check user authentication state
    validateInvitationAndUserState()
  }, [token, validateInvitationAndUserState])

  const handleAcceptInvitation = async () => {
    if (!token) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/invitations/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })

      const data = await response.json()

      if (response.ok) {
        setResult(data)
        setTimeout(() => router.push('/dashboard'), 3000)
      } else {
        setError(data.message || 'Failed to accept invitation')
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.')
      console.error('Error accepting invitation:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRegistrationAndAccept = async () => {
    if (!token || !fullName || !password) return

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(
        '/api/invitations/accept-with-registration',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token,
            fullName: fullName.trim(),
            password,
          }),
        }
      )

      const data = await response.json()

      if (response.ok) {
        setResult(data)
        setTimeout(
          () => router.push('/auth/login?message=account-created'),
          3000
        )
      } else {
        if (data.requireLogin) {
          setError(
            'An account already exists. Please log in with the correct account.'
          )
          setUserState('guest')
        } else {
          setError(
            data.message || 'Failed to create account and accept invitation'
          )
        }
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.')
      console.error('Error creating account:', err)
    } finally {
      setIsLoading(false)
    }
  }

  // Loading state
  if (userState === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">Validating invitation...</span>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Error state
  if (userState === 'error' || !invitation) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
            <CardTitle>Invalid Invitation</CardTitle>
            <CardDescription>
              {error || 'This invitation link is invalid or has expired.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => router.push('/auth/login')}
              className="w-full"
              variant="outline"
            >
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Success state
  if (result?.success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
            </div>
            <CardTitle>
              {userState === 'guest'
                ? 'Account Created!'
                : 'Invitation Accepted!'}
            </CardTitle>
            <CardDescription>
              Welcome to {result.workspace?.name}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center text-sm text-gray-600">
              <p>
                You&apos;ve been added to the workspace as a{' '}
                <strong>{result.role?.name}</strong>.
              </p>
              <p className="mt-2">
                {userState === 'guest'
                  ? 'Redirecting you to login...'
                  : 'Redirecting you to the dashboard...'}
              </p>
            </div>
            <Button
              onClick={() =>
                router.push(
                  userState === 'guest' ? '/auth/login' : '/dashboard'
                )
              }
              className="w-full"
            >
              {userState === 'guest' ? 'Go to Login' : 'Go to Dashboard'}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Wrong user logged in
  if (userState === 'wrong-user') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100">
              <AlertCircle className="h-6 w-6 text-yellow-600" />
            </div>
            <CardTitle>Wrong Account</CardTitle>
            <CardDescription>
              This invitation was sent to <strong>{invitation.email}</strong>,
              but you&apos;re logged in as <strong>{currentUserEmail}</strong>.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-blue-50 p-4">
              <h3 className="mb-2 text-sm font-semibold">
                Invitation Details:
              </h3>
              <p className="text-sm text-gray-600">
                <strong>Workspace:</strong> {invitation.workspace.name}
                <br />
                <strong>Role:</strong> {invitation.role.name}
                <br />
                <strong>Invited by:</strong> {invitation.invitedBy.name}
              </p>
            </div>

            <div className="space-y-2">
              <Button
                onClick={() =>
                  router.push(
                    '/auth/logout?redirect=' +
                      encodeURIComponent(window.location.href)
                  )
                }
                className="w-full"
                variant="outline"
              >
                <LogIn className="mr-2 h-4 w-4" />
                Log Out & Log In as {invitation.email}
              </Button>
              <Button
                onClick={() => router.push('/dashboard')}
                className="w-full"
                variant="ghost"
              >
                Go to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Correct user logged in
  if (userState === 'correct-user') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
              <Mail className="h-6 w-6 text-blue-600" />
            </div>
            <CardTitle>Accept Workspace Invitation</CardTitle>
            <CardDescription>
              You&apos;ve been invited to join{' '}
              <strong>{invitation.workspace.name}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-blue-50 p-4">
              <h3 className="mb-2 text-sm font-semibold">
                Invitation Details:
              </h3>
              <p className="text-sm text-gray-600">
                <strong>Workspace:</strong> {invitation.workspace.name}
                <br />
                <strong>Role:</strong> {invitation.role.name}
                <br />
                <strong>Invited by:</strong> {invitation.invitedBy.name}
              </p>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button
              onClick={handleAcceptInvitation}
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Accepting Invitation...
                </>
              ) : (
                'Accept Invitation'
              )}
            </Button>

            <div className="text-center">
              <Button
                onClick={() => router.push('/dashboard')}
                variant="ghost"
                className="text-sm"
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Guest user - show registration form
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
            <UserPlus className="h-6 w-6 text-green-600" />
          </div>
          <CardTitle>Create Account & Join Workspace</CardTitle>
          <CardDescription>
            You&apos;ve been invited to join{' '}
            <strong>{invitation.workspace.name}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-blue-50 p-4">
            <h3 className="mb-2 text-sm font-semibold">Invitation Details:</h3>
            <p className="text-sm text-gray-600">
              <strong>Email:</strong> {invitation.email}
              <br />
              <strong>Workspace:</strong> {invitation.workspace.name}
              <br />
              <strong>Role:</strong> {invitation.role.name}
              <br />
              <strong>Invited by:</strong> {invitation.invitedBy.name}
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                type="text"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="Enter your full name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Choose a secure password"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                required
              />
            </div>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button
            onClick={handleRegistrationAndAccept}
            disabled={isLoading || !fullName || !password || !confirmPassword}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating Account...
              </>
            ) : (
              'Create Account & Accept Invitation'
            )}
          </Button>

          <div className="space-y-2 text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <Link
                href={`/auth/login?redirect=${encodeURIComponent(window.location.href)}`}
                className="text-blue-600 hover:underline"
              >
                Log in instead
              </Link>
            </p>
            <Button
              onClick={() => router.push('/auth/login')}
              variant="ghost"
              className="text-sm"
            >
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
