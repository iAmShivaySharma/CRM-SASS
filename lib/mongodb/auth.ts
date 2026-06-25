import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { type NextRequest } from 'next/server'
import {
  User,
  Workspace,
  WorkspaceMember,
  Role,
  Activity,
  type IUser,
} from './models'
import connectToMongoDB from './connection'
import { seedWorkspaceDefaults } from './seedDefaults'

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key'
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d'

export interface SignUpData {
  email: string
  password: string
  fullName: string
  workspaceName?: string
}

export interface SignInData {
  email: string
  password: string
}

export interface AuthResult {
  user?: IUser
  token?: string
  workspace?: any
  error?: string
}

export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12
  return await bcrypt.hash(password, saltRounds)
}

export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return await bcrypt.compare(password, hashedPassword)
}

export function generateToken(userId: string): string {
  const secret = process.env.JWT_SECRET || 'fallback-secret-key'
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d'
  return jwt.sign({ userId }, secret, { expiresIn } as jwt.SignOptions)
}

export function verifyToken(token: string): { userId: string } | null {
  try {
    const secret = process.env.JWT_SECRET || 'fallback-secret-key'
    const decoded = jwt.verify(token, secret) as { userId: string }
    return decoded
  } catch (error) {
    return null
  }
}

export async function signUp({
  email,
  password,
  fullName,
  workspaceName,
}: SignUpData): Promise<AuthResult> {
  try {
    await connectToMongoDB()

    const existingUser = await User.findOne({ email })
    if (existingUser) {
      return { error: 'User with this email already exists' }
    }

    const hashedPassword = await hashPassword(password)

    const user = new User({
      email,
      password: hashedPassword,
      fullName,
      emailConfirmed: true,
      emailConfirmedAt: new Date(),
    })

    await user.save()

    let workspace
    if (workspaceName) {
      const slug = workspaceName
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')

      workspace = new Workspace({
        name: workspaceName,
        slug,
        planId: 'free',
        createdBy: user._id,
      })
      await workspace.save()

      const ownerRole = new Role({
        workspaceId: workspace._id,
        name: 'Owner',
        description: 'Full access to workspace',
        permissions: ['*:*'],
        isDefault: false,
      })
      await ownerRole.save()

      const member = new WorkspaceMember({
        workspaceId: workspace._id,
        userId: user._id,
        roleId: ownerRole._id,
        status: 'active',
        joinedAt: new Date(),
      })
      await member.save()

      await seedWorkspaceDefaults(workspace._id, user._id)
    }

    const token = generateToken(user._id)

    return { user, token, workspace }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Sign up failed' }
  }
}

export async function signIn({
  email,
  password,
}: SignInData): Promise<AuthResult> {
  try {
    await connectToMongoDB()

    const user = await User.findOne({ email })
    if (!user) {
      return { error: 'Invalid email or password' }
    }

    const isValidPassword = await verifyPassword(password, user.password)
    if (!isValidPassword) {
      return { error: 'Invalid email or password' }
    }

    user.lastSignInAt = new Date()
    await user.save()

    try {
      const userMemberships = await WorkspaceMember.find({
        userId: user._id,
        status: 'active',
      })

      for (const membership of userMemberships) {
        await Activity.create({
          workspaceId: membership.workspaceId,
          performedBy: user._id,
          activityType: 'created',
          entityType: 'user',
          entityId: user._id,
          description: `${user.fullName} signed in`,
          metadata: {
            userEmail: user.email,
            signInTime: new Date().toISOString(),
            activitySubType: 'user_signed_in',
          },
        })
      }
    } catch (activityError) {}

    let workspace = null
    const workspaceMembership = await WorkspaceMember.findOne({
      userId: user._id,
      status: 'active',
    })
      .populate('workspaceId')
      .sort({ createdAt: 1 })

    if (workspaceMembership?.workspaceId) {
      workspace = workspaceMembership.workspaceId
    }

    const token = generateToken(user._id)

    return { user, token, workspace }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Sign in failed' }
  }
}

export async function verifyAuthToken(
  request: NextRequest
): Promise<{ user: IUser } | null> {
  try {
    let token: string | undefined

    const cookieToken = request.cookies.get('auth_token')
    if (cookieToken) {
      token = cookieToken.value
    } else {
      const authHeader = request.headers.get('authorization')
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7)
      }
    }

    if (!token) {
      return null
    }

    const decoded = verifyToken(token)
    if (!decoded) {
      return null
    }

    await connectToMongoDB()
    const user = await User.findById(decoded.userId)
    if (!user) {
      return null
    }

    return { user }
  } catch (error) {
    return null
  }
}

export function signOut(): void {}
