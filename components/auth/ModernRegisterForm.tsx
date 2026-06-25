'use client'

import { useState, useCallback, useMemo, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import {
  Briefcase,
  Eye,
  EyeOff,
  Mail,
  Lock,
  User,
  Building,
  ArrowRight,
  Shield,
  CheckCircle,
  Zap,
  Globe,
  AlertTriangle,
  Check,
  X,
} from 'lucide-react'
import Link from 'next/link'
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
import { useAppDispatch } from '@/lib/hooks'
import { loginSuccess } from '@/lib/slices/authSlice'
import { setCurrentWorkspace } from '@/lib/slices/workspaceSlice'
import { useSignupMutation } from '@/lib/api/authApi'

const registerSchema = z
  .object({
    fullName: z
      .string()
      .min(1, 'Full name is required')
      .min(2, 'Name must be at least 2 characters')
      .max(100, 'Name is too long')
      .regex(
        /^[a-zA-Z\s'-]+$/,
        'Name can only contain letters, spaces, hyphens, and apostrophes'
      )
      .trim(),
    email: z
      .string()
      .min(1, 'Email is required')
      .email('Please enter a valid email address')
      .max(254, 'Email is too long')
      .toLowerCase()
      .trim(),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(128, 'Password is too long')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]*$/,
        'Password must contain uppercase, lowercase, number, and special character'
      ),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
    workspaceName: z
      .string()
      .min(1, 'Workspace name is required')
      .min(2, 'Workspace name must be at least 2 characters')
      .max(50, 'Workspace name is too long')
      .regex(
        /^[a-zA-Z0-9\s-_]+$/,
        'Workspace name can only contain letters, numbers, spaces, hyphens, and underscores'
      )
      .trim(),
    agreeToTerms: z
      .boolean()
      .refine(
        val => val === true,
        'You must agree to the terms and conditions'
      ),
  })
  .refine(data => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

type RegisterFormData = z.infer<typeof registerSchema>

export function ModernRegisterForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const dispatch = useAppDispatch()

  const [signupUser, { isLoading }] = useSignupMutation()

  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [attemptCount, setAttemptCount] = useState(0)
  const [isBlocked, setIsBlocked] = useState(false)
  const [blockTimeRemaining, setBlockTimeRemaining] = useState(0)
  const [passwordStrength, setPasswordStrength] = useState(0)

  const {
    register,
    handleSubmit,
    watch,
    control,
    formState: { errors, isValid, isDirty },
    setError,
    clearErrors,
    trigger,
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    mode: 'onChange',
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
      confirmPassword: '',
      workspaceName: '',
      agreeToTerms: false,
    },
  })

  const redirectUrl = useMemo(() => {
    const redirect = searchParams?.get('redirect')
    return redirect || '/dashboard'
  }, [searchParams])

  const watchedPassword = watch('password')
  const watchedEmail = watch('email')
  const watchedFullName = watch('fullName')

  useEffect(() => {
    if (attemptCount >= 3) {
      setIsBlocked(true)
      setBlockTimeRemaining(600)

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

  const calculatePasswordStrength = useCallback((password: string): number => {
    let strength = 0
    if (password.length >= 8) strength += 1
    if (password.length >= 12) strength += 1
    if (/[a-z]/.test(password)) strength += 1
    if (/[A-Z]/.test(password)) strength += 1
    if (/\d/.test(password)) strength += 1
    if (/[@$!%*?&]/.test(password)) strength += 1
    if (password.length >= 16) strength += 1
    return Math.min(strength, 5)
  }, [])

  useEffect(() => {
    if (watchedPassword) {
      const strength = calculatePasswordStrength(watchedPassword)
      setPasswordStrength(strength)
    } else {
      setPasswordStrength(0)
    }
  }, [watchedPassword, calculatePasswordStrength])

  const togglePasswordVisibility = useCallback(() => {
    setShowPassword(prev => !prev)
  }, [])

  const toggleConfirmPasswordVisibility = useCallback(() => {
    setShowConfirmPassword(prev => !prev)
  }, [])

  const onSubmit = useCallback(
    async (data: RegisterFormData) => {
      console.log('Form submitted with data:', data)
      console.log('Password strength:', passwordStrength)
      console.log('Is blocked:', isBlocked)

      if (isBlocked) {
        toast.error(
          `Too many failed attempts. Try again in ${Math.ceil(blockTimeRemaining / 60)} minutes.`
        )
        return
      }

      if (passwordStrength < 2) {
        toast.error('Please choose a stronger password')
        return
      }

      setLoading(true)
      clearErrors()

      try {
        const result = await signupUser({
          name: data.fullName.trim(),
          email: data.email.toLowerCase().trim(),
          password: data.password,
          workspaceName: data.workspaceName.trim(),
        }).unwrap()

        dispatch(
          loginSuccess({
            user: {
              id: result.user.id,
              email: result.user.email,
              name: result.user.fullName || result.user.email,
              role: result.user.role || 'Owner',
              roleId: result.user.roleId || '',
              workspaceId: result.workspace.id,
              permissions: result.user.permissions || ['*:*'],
            },
          })
        )

        dispatch(
          setCurrentWorkspace({
            id: result.workspace.id,
            name: result.workspace.name,
            plan: result.workspace.planId,
            memberCount: 1,
            createdAt: result.workspace.createdAt,
          })
        )

        console.log('Registration successful:', {
          userId: result.user.id,
          workspaceId: result.workspace.id,
          timestamp: new Date().toISOString(),
        })

        toast.success('Account created successfully! Welcome to your CRM!', {
          duration: 3000,
          icon: '🎉',
        })

        await router.prefetch(redirectUrl)

        setTimeout(() => {
          router.push(redirectUrl)
        }, 1000)
      } catch (error: any) {
        console.error('Registration error:', error)

        if (error?.status === 429) {
          toast.error('Too many registration attempts. Please try again later.')
          setIsBlocked(true)
        } else if (error?.status === 409) {
          setError('email', {
            type: 'manual',
            message: 'An account with this email already exists',
          })
          toast.error('Email already registered')
        } else {
          toast.error(
            error?.data?.message || 'Registration failed. Please try again.'
          )
        }

        setAttemptCount(prev => prev + 1)
      } finally {
        setLoading(false)
      }
    },
    [
      isBlocked,
      blockTimeRemaining,
      passwordStrength,
      clearErrors,
      dispatch,
      redirectUrl,
      router,
      setError,
      signupUser,
    ]
  )

  const getPasswordStrength = useCallback(
    (password: string) => {
      if (!password) {
        return {
          strength: 0,
          label: 'Enter password',
          color: 'bg-gray-300',
          percentage: 0,
        }
      }

      const strength = calculatePasswordStrength(password)
      const labels = [
        'Very Weak',
        'Weak',
        'Fair',
        'Good',
        'Strong',
        'Very Strong',
      ]
      const colors = [
        'bg-red-500',
        'bg-orange-500',
        'bg-yellow-500',
        'bg-blue-500',
        'bg-green-500',
        'bg-green-600',
      ]

      return {
        strength,
        label: labels[strength] || 'Very Weak',
        color: colors[strength] || 'bg-red-500',
        percentage: (strength / 5) * 100,
      }
    },
    [calculatePasswordStrength]
  )

  const currentPasswordStrength = useMemo(() => {
    return getPasswordStrength(watchedPassword || '')
  }, [watchedPassword, getPasswordStrength])

  return (
    <div className="flex min-h-screen">
      <div className="relative hidden overflow-hidden bg-gradient-to-br from-green-600 via-emerald-700 to-teal-800 lg:flex lg:w-1/2">
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
              Start your CRM journey today
            </h1>
            <p className="mb-8 text-xl text-green-100">
              Join thousands of businesses that trust CRM Pro to manage their
              customer relationships and drive growth.
            </p>
          </div>

          <div className="space-y-6">
            <div className="flex items-center space-x-4">
              <div className="rounded-lg bg-white/20 p-2 backdrop-blur-sm">
                <Zap className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-semibold">Quick Setup</h3>
                <p className="text-sm text-green-100">
                  Get started in under 5 minutes
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="rounded-lg bg-white/20 p-2 backdrop-blur-sm">
                <Shield className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-semibold">Secure & Reliable</h3>
                <p className="text-sm text-green-100">
                  Your data is protected with enterprise security
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="rounded-lg bg-white/20 p-2 backdrop-blur-sm">
                <Globe className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-semibold">Global Access</h3>
                <p className="text-sm text-green-100">
                  Access your CRM from anywhere
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="absolute right-0 top-0 h-64 w-64 -translate-y-32 translate-x-32 rounded-full bg-white/5"></div>
        <div className="absolute bottom-0 left-0 h-48 w-48 -translate-x-24 translate-y-24 rounded-full bg-white/5"></div>
      </div>

      <div className="flex flex-1 items-center justify-center bg-gray-50 px-4 py-12 dark:bg-gray-900 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center lg:hidden">
            <div className="mb-4 flex items-center justify-center space-x-2">
              <div className="rounded-lg bg-green-600 p-2">
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
                Create your account
              </CardTitle>
              <CardDescription className="text-gray-600 dark:text-gray-400">
                Start managing your business relationships today
              </CardDescription>
            </CardHeader>

            <CardContent className="px-6 pb-6">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label
                      htmlFor="fullName"
                      className="text-sm font-medium text-gray-700 dark:text-gray-300"
                    >
                      Full Name
                    </Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 transform text-gray-400" />
                      <Input
                        id="fullName"
                        type="text"
                        placeholder="Enter your full name"
                        className="h-12 rounded-lg border-gray-300 pl-11 focus:border-green-500 focus:ring-green-500 dark:border-gray-600"
                        {...register('fullName', {
                          required: 'Full name is required',
                          minLength: {
                            value: 2,
                            message: 'Name must be at least 2 characters',
                          },
                        })}
                      />
                    </div>
                    {errors.fullName && (
                      <p className="text-sm text-red-600">
                        {errors.fullName.message}
                      </p>
                    )}
                  </div>

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
                        className="h-12 rounded-lg border-gray-300 pl-11 focus:border-green-500 focus:ring-green-500 dark:border-gray-600"
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
                      <p className="text-sm text-red-600">
                        {errors.email.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="workspaceName"
                    className="text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Workspace Name
                  </Label>
                  <div className="relative">
                    <Building className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 transform text-gray-400" />
                    <Input
                      id="workspaceName"
                      type="text"
                      placeholder="Enter your company or workspace name"
                      className="h-12 rounded-lg border-gray-300 pl-11 focus:border-green-500 focus:ring-green-500 dark:border-gray-600"
                      {...register('workspaceName', {
                        required: 'Workspace name is required',
                        minLength: {
                          value: 2,
                          message:
                            'Workspace name must be at least 2 characters',
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

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                        placeholder="Create a strong password"
                        className="h-12 rounded-lg border-gray-300 pl-11 pr-12 focus:border-green-500 focus:ring-green-500 dark:border-gray-600"
                        {...register('password', {
                          required: 'Password is required',
                          minLength: {
                            value: 8,
                            message: 'Password must be at least 8 characters',
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
                      <p className="text-sm text-red-600">
                        {errors.password.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="confirmPassword"
                      className="text-sm font-medium text-gray-700 dark:text-gray-300"
                    >
                      Confirm Password
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 transform text-gray-400" />
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder="Confirm your password"
                        className="h-12 rounded-lg border-gray-300 pl-11 pr-12 focus:border-green-500 focus:ring-green-500 dark:border-gray-600"
                        {...register('confirmPassword', {
                          required: 'Please confirm your password',
                          validate: value =>
                            value === watchedPassword ||
                            'Passwords do not match',
                        })}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                        onClick={() =>
                          setShowConfirmPassword(!showConfirmPassword)
                        }
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-5 w-5 text-gray-400" />
                        ) : (
                          <Eye className="h-5 w-5 text-gray-400" />
                        )}
                      </Button>
                    </div>
                    {errors.confirmPassword && (
                      <p className="text-sm text-red-600">
                        {errors.confirmPassword.message}
                      </p>
                    )}
                  </div>
                </div>

                {watchedPassword && (
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <div className="h-2 flex-1 rounded-full bg-gray-200">
                        <div
                          className={`h-2 rounded-full transition-all duration-300 ${currentPasswordStrength.color}`}
                          style={{
                            width: `${currentPasswordStrength.percentage}%`,
                          }}
                        />
                      </div>
                      <span className="text-xs text-gray-600">
                        {currentPasswordStrength.label}
                      </span>
                    </div>
                  </div>
                )}

                <div className="flex items-center space-x-2">
                  <Controller
                    name="agreeToTerms"
                    control={control}
                    render={({ field }) => (
                      <Checkbox
                        id="agreeToTerms"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    )}
                  />
                  <Label
                    htmlFor="agreeToTerms"
                    className="text-sm text-gray-600 dark:text-gray-400"
                  >
                    I agree to the{' '}
                    <Link
                      href="/terms"
                      className="text-green-600 hover:text-green-700"
                    >
                      Terms of Service
                    </Link>{' '}
                    and{' '}
                    <Link
                      href="/privacy"
                      className="text-green-600 hover:text-green-700"
                    >
                      Privacy Policy
                    </Link>
                  </Label>
                </div>
                {errors.agreeToTerms && (
                  <p className="text-sm text-red-600">
                    You must agree to the terms and conditions
                  </p>
                )}

                <Button
                  type="submit"
                  className="h-12 w-full rounded-lg bg-green-600 font-medium text-white shadow-lg transition-all duration-200 hover:bg-green-700 hover:shadow-xl disabled:cursor-not-allowed disabled:bg-gray-400"
                  disabled={
                    loading ||
                    currentPasswordStrength.strength < 2 ||
                    isBlocked ||
                    !isValid
                  }
                >
                  {loading ? (
                    <div className="flex items-center space-x-2">
                      <div className="h-5 w-5 animate-spin rounded-full border-b-2 border-white"></div>
                      <span>Creating account...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <span>Create Account</span>
                      <ArrowRight className="h-5 w-5" />
                    </div>
                  )}
                </Button>
              </form>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-gray-300 dark:border-gray-600" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                    Or continue with
                  </span>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                className="h-12 w-full rounded-lg border-gray-300 font-medium dark:border-gray-600"
                disabled={loading}
                onClick={async () => {
                  try {
                    const res = await fetch('/api/auth/google?mode=register')
                    const data = await res.json()
                    if (data.url) {
                      window.location.href = data.url
                    } else {
                      toast.error('Failed to initialize Google signup')
                    }
                  } catch {
                    toast.error('Failed to connect to Google')
                  }
                }}
              >
                <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                Sign up with Google
              </Button>

              <div className="mt-6 text-center">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Already have an account?{' '}
                  <Link href="/login">
                    <Button
                      variant="link"
                      className="h-auto p-0 font-medium text-green-600 hover:text-green-700"
                    >
                      Sign in
                    </Button>
                  </Link>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
