console.log('🚀 Script starting...')

// Load environment variables
import dotenv from 'dotenv'
dotenv.config()

import connectToMongoDB from '../lib/mongodb/connection'
import {
  User,
  Workspace,
  WorkspaceMember,
  Role,
  Plan,
  Subscription,
} from '../lib/mongodb/models'
import { hashPassword } from '../lib/mongodb/auth'

console.log('📦 Imports loaded successfully')

async function seedDatabase() {
  try {
    console.log('🌱 Starting MongoDB database seeding...')
    console.log('📍 Current working directory:', process.cwd())
    console.log('🔗 MongoDB URI:', process.env.MONGODB_URI ? 'Set' : 'Not set')

    await connectToMongoDB()
    console.log('✅ Connected to MongoDB')

    // Clear existing data (optional - remove in production)
    console.log('🧹 Clearing existing data...')
    await User.deleteMany({})
    await Workspace.deleteMany({})
    await WorkspaceMember.deleteMany({})
    await Role.deleteMany({})
    await Plan.deleteMany({})
    await Subscription.deleteMany({})

    // 1. Create Plans
    console.log('📋 Creating plans...')
    const plans = [
      {
        _id: 'free',
        name: 'Free',
        description: 'Perfect for getting started',
        price: 0,
        interval: 'month',
        features: ['Up to 100 leads', 'Basic lead management', 'Email support'],
        limits: { leads: 100, users: 2, workspaces: 1 },
        sortOrder: 1,
        isActive: true,
      },
      {
        _id: 'starter',
        name: 'Starter',
        description: 'Great for small teams',
        price: 29,
        interval: 'month',
        features: [
          'Up to 1,000 leads',
          'Advanced lead management',
          'Role management',
          'Email support',
          'Basic analytics',
        ],
        limits: { leads: 1000, users: 5, workspaces: 1 },
        sortOrder: 2,
        isActive: true,
      },
      {
        _id: 'professional',
        name: 'Professional',
        description: 'For growing businesses',
        price: 79,
        interval: 'month',
        features: [
          'Up to 10,000 leads',
          'Advanced analytics',
          'Custom fields',
          'API access',
          'Priority support',
          'Webhooks',
        ],
        limits: { leads: 10000, users: 15, workspaces: 3 },
        sortOrder: 3,
        isActive: true,
      },
      {
        _id: 'enterprise',
        name: 'Enterprise',
        description: 'For large organizations',
        price: 199,
        interval: 'month',
        features: [
          'Unlimited leads',
          'Advanced integrations',
          'Custom branding',
          'Dedicated support',
          'SLA guarantee',
          'Advanced security',
        ],
        limits: { leads: -1, users: -1, workspaces: -1 },
        sortOrder: 4,
        isActive: true,
      },
    ]

    await Plan.insertMany(plans)
    console.log(`✅ Created ${plans.length} plans`)

    // 2. Create Admin User with Enhanced Security
    console.log('👤 Creating admin user...')
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin123!@#'
    const hashedAdminPassword = await hashPassword(adminPassword)

    const adminUser = new (User as any)({
      email: 'admin@crm.com',
      password: hashedAdminPassword,
      fullName: 'System Administrator',
      timezone: 'UTC',
      emailConfirmed: true,
      emailVerifiedAt: new Date(),
      lastSignInAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    await adminUser.save()
    console.log('✅ Created admin user: admin@crm.com')

    // Create additional test users for comprehensive testing
    console.log('👥 Creating test users...')

    const testUsers = [
      {
        email: 'manager@crm.com',
        fullName: 'Sales Manager',
        password: 'Manager123!@#',
      },
      {
        email: 'sales@crm.com',
        fullName: 'Sales Representative',
        password: 'Sales123!@#',
      },
      {
        email: 'demo@crm.com',
        fullName: 'Demo User',
        password: 'Demo123!@#',
      },
    ]

    const createdTestUsers = []
    for (const userData of testUsers) {
      const hashedPassword = await hashPassword(userData.password)
      const user = new (User as any)({
        email: userData.email,
        password: hashedPassword,
        fullName: userData.fullName,
        timezone: 'UTC',
        emailConfirmed: true,
        emailConfirmedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      await user.save()
      createdTestUsers.push(user)
      console.log(`✅ Test user created: ${user.email}`)
    }

    // 3. Create Admin Workspace with Enhanced Configuration
    console.log('🏢 Creating admin workspace...')
    const adminWorkspace = new (Workspace as any)({
      name: 'Admin Workspace',
      slug: 'admin-workspace',
      planId: 'enterprise',
      subscriptionStatus: 'active',
      createdBy: adminUser._id,
      settings: {
        allowInvitations: true,
        requireEmailVerification: true,
        maxUsers: 100,
        enableAuditLog: true,
        enableTwoFactor: false,
        sessionTimeout: 480, // 8 hours
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    await adminWorkspace.save()
    console.log('✅ Created admin workspace:', adminWorkspace.name)

    // 4. Create Default Roles
    console.log('🔐 Creating default roles...')
    const roles = [
      {
        workspaceId: adminWorkspace._id,
        name: 'Owner',
        description: 'Full access to workspace',
        permissions: ['*:*'],
        isDefault: false,
      },
      {
        workspaceId: adminWorkspace._id,
        name: 'Admin',
        description: 'Administrative access',
        permissions: [
          'leads:create',
          'leads:read',
          'leads:update',
          'leads:delete',
          'users:create',
          'users:read',
          'users:update',
          'users:delete',
          'roles:create',
          'roles:read',
          'roles:update',
          'roles:delete',
          'workspace:read',
          'workspace:update',
          'analytics:read',
        ],
        isDefault: false,
      },
      {
        workspaceId: adminWorkspace._id,
        name: 'Manager',
        description: 'Lead management and team oversight',
        permissions: [
          'leads:create',
          'leads:read',
          'leads:update',
          'leads:delete',
          'users:read',
          'analytics:read',
        ],
        isDefault: false,
      },
      {
        workspaceId: adminWorkspace._id,
        name: 'Sales Rep',
        description: 'Basic lead management',
        permissions: ['leads:create', 'leads:read', 'leads:update'],
        isDefault: true,
      },
    ]

    const createdRoles = await (Role as any).insertMany(roles)
    const ownerRole = createdRoles.find((role: any) => role.name === 'Owner')
    const managerRole = createdRoles.find(
      (role: any) => role.name === 'Manager'
    )
    const salesRole = createdRoles.find(
      (role: any) => role.name === 'Sales Rep'
    )
    console.log(`✅ Created ${roles.length} roles`)

    // 5. Add Admin as Workspace Owner
    console.log('👥 Adding admin to workspace...')
    const adminMember = new (WorkspaceMember as any)({
      workspaceId: adminWorkspace._id,
      userId: adminUser._id,
      roleId: ownerRole!._id,
      status: 'active',
      joinedAt: new Date(),
    })
    await adminMember.save()
    console.log('✅ Added admin as workspace owner')

    // Add test users to workspace with appropriate roles
    console.log('👥 Adding test users to workspace...')
    const userRoleMapping = [
      { user: createdTestUsers[0], role: managerRole }, // Sales Manager
      { user: createdTestUsers[1], role: salesRole }, // Sales Rep
      { user: createdTestUsers[2], role: salesRole }, // Demo User
    ]

    for (const mapping of userRoleMapping) {
      if (mapping.user && mapping.role) {
        const member = new (WorkspaceMember as any)({
          workspaceId: adminWorkspace._id,
          userId: mapping.user._id,
          roleId: mapping.role._id,
          status: 'active',
          joinedAt: new Date(),
        })
        await member.save()
        console.log(`✅ Added ${mapping.user.email} as ${mapping.role.name}`)
      }
    }

    // 6. Create Subscription for Admin Workspace
    console.log('💳 Creating admin subscription...')
    const adminSubscription = new (Subscription as any)({
      workspaceId: adminWorkspace._id,
      planId: 'enterprise',
      status: 'active',
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
      cancelAtPeriodEnd: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    await adminSubscription.save()

    console.log('🎉 Database seeding completed successfully!')
    console.log('\n📋 Seeded Data Summary:')
    console.log(`- Plans: ${plans.length}`)
    console.log(
      `- Users: ${1 + createdTestUsers.length} (1 admin + ${createdTestUsers.length} test users)`
    )
    console.log(`- Admin User: admin@crm.com (password: ${adminPassword})`)
    console.log(`- Test Users:`)
    testUsers.forEach(user => {
      console.log(`  - ${user.email} (password: ${user.password})`)
    })
    console.log(
      `- Admin Workspace: ${adminWorkspace.name} (${adminWorkspace.slug})`
    )
    console.log(`- Roles: ${roles.length}`)
    console.log(`- Workspace Members: ${1 + createdTestUsers.length}`)
    console.log(`- Subscription: Enterprise plan for admin workspace`)
    console.log('\n🔐 Security Features:')
    console.log('- All passwords are bcrypt hashed with 12 rounds')
    console.log('- Email verification enabled')
    console.log('- Audit logging enabled')
    console.log('- Role-based permissions configured')
    console.log('\n🚀 Ready for development and testing!')
  } catch (error) {
    console.error('❌ Seeding failed:', error)
    throw error
  }
}

// Run seeding if called directly
if (require.main === module) {
  seedDatabase()
    .then(() => {
      console.log('✅ Seeding completed')
      process.exit(0)
    })
    .catch(error => {
      console.error('❌ Seeding failed:', error)
      process.exit(1)
    })
}

export default seedDatabase
