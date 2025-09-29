'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
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
import { useAppDispatch } from '@/lib/hooks'
import { loginSuccess } from '@/lib/slices/authSlice'
import { setCurrentWorkspace } from '@/lib/slices/workspaceSlice'
import { useLoginMutation } from '@/lib/api/authApi'
import { toast } from 'sonner'
import {
  Briefcase,
  Eye,
  EyeOff,
  Mail,
  Lock,
  ArrowRight,
  Shield,
  BarChart3,
  Users,
  TrendingUp,
} from 'lucide-react'
import Link from 'next/link'

// Industry-standard validation schema
const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address')
    .max(254, 'Email is too long')
    .toLowerCase()
    .trim(),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password is too long'),
})

type LoginFormData = z.infer<typeof loginSchema>

export function ModernLoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const dispatch = useAppDispatch()

  // RTK Query mutation
  const [loginUser, { isLoading }] = useLoginMutation()

  // Performance optimized state management
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [attemptCount, setAttemptCount] = useState(0)
  const [isBlocked, setIsBlocked] = useState(false)
  const [blockTimeRemaining, setBlockTimeRemaining] = useState(0)

  // Enhanced form with validation
  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
    clearErrors,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    mode: 'onChange', // Real-time validation
    defaultValues: {
      email: '',
      password: '',
    },
  })

  // Performance optimization: memoize redirect URL
  const redirectUrl = useMemo(() => {
    const redirect = searchParams.get('redirect')
    const callbackUrl = searchParams.get('callbackUrl')
    return redirect || callbackUrl || '/dashboard'
  }, [searchParams])

  // Security: Monitor failed attempts
  useEffect(() => {
    if (attemptCount >= 3) {
      setIsBlocked(true)
      setBlockTimeRemaining(300) // 5 minutes

      const timer = setInterval(() => {
        setBlockTimeRemaining(prev => {
          if (prev <= 1) {
            setIsBlocked(false)
            setAttemptCount(0)
            clearInterval(timer)
            return 0
          }
          return prev - 1
        })
      }, 1000)

      return () => clearInterval(timer)
    }
  }, [attemptCount])

  // Enhanced submit function with security and performance optimizations
  const onSubmit = useCallback(
    async (data: LoginFormData) => {
      // Security: Check if blocked
      if (isBlocked) {
        toast.error(
          `Too many failed attempts. Try again in ${Math.ceil(blockTimeRemaining / 60)} minutes.`
        )
        return
      }

      setLoading(true)
      clearErrors()

      try {
        const result = await loginUser({
          email: data.email,
          password: data.password,
        }).unwrap()

        // RTK Query handles the response automatically, so we get here only on success

        // Update Redux state (token is now in HTTP-only cookie)
        dispatch(
          loginSuccess({
            user: {
              id: result.user.id,
              email: result.user.email,
              name: result.user.fullName || result.user.email,
              role: 'user',
              workspaceId: result.workspace?.id || '',
              permissions: [],
            },
          })
        )

        if (result.workspace) {
          dispatch(
            setCurrentWorkspace({
              id: result.workspace.id || result.workspace._id,
              name: result.workspace.name,
              plan: result.workspace.planId || 'free',
              memberCount: 1,
              currency: result.workspace.currency || 'USD',
              timezone: result.workspace.timezone || 'UTC',
              settings: result.workspace.settings || {
                dateFormat: 'MM/DD/YYYY',
                timeFormat: '12h',
                weekStartsOn: 0,
                language: 'en',
              },
              createdAt: result.workspace.createdAt,
            })
          )
        }

        // Security: Log successful login
        console.log('Login successful:', {
          userId: result.user.id,
          timestamp: new Date().toISOString(),
          redirectUrl,
        })

        toast.success('Welcome back! Redirecting...', {
          duration: 2000,
          icon: '🎉',
        })

        // Performance: Optimized redirect with preloading
        router.prefetch(redirectUrl)

        // Smooth transition delay for better UX
        setTimeout(() => {
          router.push(redirectUrl)
        }, 500)
      } catch (error: any) {
        console.error('Login error:', error)

        // Handle RTK Query errors
        if (error?.status === 429) {
          toast.error('Too many login attempts. Please try again later.')
          setIsBlocked(true)
        } else if (error?.status === 401) {
          setError('password', {
            type: 'manual',
            message: 'Invalid email or password',
          })
          toast.error('Invalid credentials')
        } else {
          toast.error(error?.data?.message || 'Login failed. Please try again.')
        }

        setAttemptCount(prev => prev + 1)
      } finally {
        setLoading(false)
      }
    },
    [
      isBlocked,
      blockTimeRemaining,
      clearErrors,
      dispatch,
      redirectUrl,
      router,
      setError,
      loginUser,
    ]
  )

  return (
    <div className="flex min-h-screen">
      {/* Left Side - Branding */}
      <div className="relative hidden overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 lg:flex lg:w-1/2">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative z-10 flex flex-col justify-center px-12 text-white">
          <div className="mb-8">
            <div className="mb-6 flex items-center space-x-3">
              <div className="rounded-xl bg-white/10 p-3 backdrop-blur-sm">
                <Briefcase className="h-8 w-8" />
              </div>
              <span className="text-3xl font-bold">CRM Pro</span>
            </div>
            <h1 className="mb-4 text-4xl font-bold leading-tight">
              Manage your business relationships with ease
            </h1>
            <p className="mb-8 text-xl text-blue-100">
              Streamline your sales process, track leads, and grow your business
              with our powerful CRM platform.
            </p>
          </div>

          <div className="space-y-6">
            <div className="flex items-center space-x-4">
              <div className="rounded-lg bg-white/20 p-2 backdrop-blur-sm">
                <Shield className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-semibold">Enterprise Security</h3>
                <p className="text-sm text-blue-100">
                  Bank-level encryption and security
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="rounded-lg bg-white/20 p-2 backdrop-blur-sm">
                <Users className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-semibold">Team Collaboration</h3>
                <p className="text-sm text-blue-100">
                  Work together seamlessly
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="rounded-lg bg-white/20 p-2 backdrop-blur-sm">
                <BarChart3 className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-semibold">Real-time Analytics</h3>
                <p className="text-sm text-blue-100">
                  Track performance and growth
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="rounded-lg bg-white/20 p-2 backdrop-blur-sm">
                <TrendingUp className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-semibold">Sales Pipeline</h3>
                <p className="text-sm text-blue-100">
                  Optimize your sales process
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute right-0 top-0 h-64 w-64 -translate-y-32 translate-x-32 rounded-full bg-white/5"></div>
        <div className="absolute bottom-0 left-0 h-48 w-48 -translate-x-24 translate-y-24 rounded-full bg-white/5"></div>
        <div className="absolute right-1/4 top-1/2 h-32 w-32 rounded-full bg-white/5"></div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex flex-1 items-center justify-center bg-gray-50 px-4 dark:bg-gray-900 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-8">
          {/* Mobile Logo */}
          <div className="text-center lg:hidden">
            <div className="mb-4 flex items-center justify-center space-x-2">
              <div className="rounded-lg bg-blue-600 p-2">
                <Briefcase className="h-6 w-6 text-white" />
              </div>
              <span className="text-2xl font-bold text-gray-900 dark:text-white">
                CRM Pro
              </span>
            </div>
          </div>

          <Card className="border-0 bg-white shadow-2xl dark:bg-gray-800">
            <CardHeader className="space-y-1 pb-6 text-center">
              <CardTitle className="text-3xl font-bold text-gray-900 dark:text-white">
                Welcome back
              </CardTitle>
              <CardDescription className="text-gray-600 dark:text-gray-400">
                Sign in to your account to continue
              </CardDescription>
            </CardHeader>

            <CardContent className="px-6 pb-6">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                <div className="space-y-2">
                  <Label
                    htmlFor="email"
                    className="text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Email Address
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 transform text-gray-400" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your email address"
                      className="h-12 rounded-lg border-gray-300 pl-11 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600"
                      {...register('email', {
                        required: 'Email is required',
                        pattern: {
                          value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                          message: 'Invalid email address',
                        },
                      })}
                    />
                  </div>
                  {errors.email && (
                    <p className="mt-1 flex items-center text-sm text-red-600">
                      {errors.email.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="password"
                    className="text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 transform text-gray-400" />
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter your password"
                      className="h-12 rounded-lg border-gray-300 pl-11 pr-12 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600"
                      {...register('password', {
                        required: 'Password is required',
                        minLength: {
                          value: 6,
                          message: 'Password must be at least 6 characters',
                        },
                      })}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5 text-gray-400" />
                      ) : (
                        <Eye className="h-5 w-5 text-gray-400" />
                      )}
                    </Button>
                  </div>
                  {errors.password && (
                    <p className="mt-1 flex items-center text-sm text-red-600">
                      {errors.password.message}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <Link href="/auth/forgot-password">
                    <Button
                      variant="link"
                      className="h-auto p-0 text-sm text-blue-600 hover:text-blue-700"
                    >
                      Forgot password?
                    </Button>
                  </Link>
                </div>

                <Button
                  type="submit"
                  className="h-12 w-full rounded-lg bg-blue-600 font-medium text-white shadow-lg transition-all duration-200 hover:bg-blue-700 hover:shadow-xl"
                  disabled={loading}
                >
                  {loading ? (
                    <div className="flex items-center space-x-2">
                      <div className="h-5 w-5 animate-pulse rounded bg-white/20"></div>
                      <span>Signing in...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <span>Sign In</span>
                      <ArrowRight className="h-5 w-5" />
                    </div>
                  )}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Don&apos;t have an account?{' '}
                  <Link href="/register">
                    <Button
                      variant="link"
                      className="h-auto p-0 font-medium text-blue-600 hover:text-blue-700"
                    >
                      Create account
                    </Button>
                  </Link>
                </p>
              </div>

              <div className="mt-4 text-center">
                <p className="rounded bg-gray-50 p-2 text-xs text-gray-500 dark:bg-gray-700">
                  Demo: admin@crmpro.com / password
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
