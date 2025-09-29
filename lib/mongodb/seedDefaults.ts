import { LeadStatus, Tag, Role } from './client'

export async function seedDefaultLeadStatuses(
  workspaceId: string,
  userId: string
) {
  const defaultStatuses = [
    {
      workspaceId,
      name: 'New',
      color: '#3b82f6',
      description: 'Newly created leads',
      order: 1,
      isDefault: true,
      isActive: true,
      createdBy: userId,
    },
    {
      workspaceId,
      name: 'Contacted',
      color: '#f59e0b',
      description: 'Initial contact made',
      order: 2,
      isDefault: false,
      isActive: true,
      createdBy: userId,
    },
    {
      workspaceId,
      name: 'Qualified',
      color: '#10b981',
      description: 'Lead has been qualified',
      order: 3,
      isDefault: false,
      isActive: true,
      createdBy: userId,
    },
    {
      workspaceId,
      name: 'Proposal',
      color: '#8b5cf6',
      description: 'Proposal sent',
      order: 4,
      isDefault: false,
      isActive: true,
      createdBy: userId,
    },
    {
      workspaceId,
      name: 'Negotiation',
      color: '#f97316',
      description: 'In negotiation phase',
      order: 5,
      isDefault: false,
      isActive: true,
      createdBy: userId,
    },
    {
      workspaceId,
      name: 'Closed Won',
      color: '#22c55e',
      description: 'Successfully closed',
      order: 6,
      isDefault: false,
      isActive: true,
      createdBy: userId,
    },
    {
      workspaceId,
      name: 'Closed Lost',
      color: '#ef4444',
      description: 'Lost opportunity',
      order: 7,
      isDefault: false,
      isActive: true,
      createdBy: userId,
    },
  ]

  try {
    // Check if statuses already exist
    const existingCount = await LeadStatus.countDocuments({ workspaceId })
    if (existingCount === 0) {
      await LeadStatus.insertMany(defaultStatuses)
      console.log(
        `Created ${defaultStatuses.length} default lead statuses for workspace ${workspaceId}`
      )
    }
  } catch (error) {
    console.error('Error seeding default lead statuses:', error)
  }
}

export async function seedDefaultTags(workspaceId: string, userId: string) {
  const defaultTags = [
    {
      workspaceId,
      name: 'Hot Lead',
      color: '#ef4444',
      description: 'High priority leads',
      createdBy: userId,
    },
    {
      workspaceId,
      name: 'Warm Lead',
      color: '#f59e0b',
      description: 'Medium priority leads',
      createdBy: userId,
    },
    {
      workspaceId,
      name: 'Cold Lead',
      color: '#6b7280',
      description: 'Low priority leads',
      createdBy: userId,
    },
    {
      workspaceId,
      name: 'Enterprise',
      color: '#8b5cf6',
      description: 'Enterprise clients',
      createdBy: userId,
    },
    {
      workspaceId,
      name: 'SMB',
      color: '#10b981',
      description: 'Small and medium business',
      createdBy: userId,
    },
    {
      workspaceId,
      name: 'Follow Up',
      color: '#3b82f6',
      description: 'Requires follow up',
      createdBy: userId,
    },
  ]

  try {
    // Check if tags already exist
    const existingCount = await Tag.countDocuments({ workspaceId })
    if (existingCount === 0) {
      await Tag.insertMany(defaultTags)
      console.log(
        `Created ${defaultTags.length} default tags for workspace ${workspaceId}`
      )
    }
  } catch (error) {
    console.error('Error seeding default tags:', error)
  }
}

export async function seedDefaultRoles(workspaceId: string, userId: string) {
  const defaultRoles = [
    {
      workspaceId,
      name: 'Admin',
      description: 'Full access to all features',
      permissions: [
        'leads.create',
        'leads.read',
        'leads.update',
        'leads.delete',
        'users.create',
        'users.read',
        'users.update',
        'users.delete',
        'workspace.manage',
        'roles.manage',
        'webhooks.manage',
        'analytics.view',
      ],
      isDefault: true,
      createdBy: userId,
    },
    {
      workspaceId,
      name: 'Sales Manager',
      description: 'Manage sales team and leads',
      permissions: [
        'leads.create',
        'leads.read',
        'leads.update',
        'leads.delete',
        'users.read',
        'analytics.view',
      ],
      isDefault: false,
      createdBy: userId,
    },
    {
      workspaceId,
      name: 'Sales Rep',
      description: 'Basic sales representative access',
      permissions: ['leads.create', 'leads.read', 'leads.update'],
      isDefault: false,
      createdBy: userId,
    },
    {
      workspaceId,
      name: 'Viewer',
      description: 'Read-only access',
      permissions: ['leads.read', 'analytics.view'],
      isDefault: false,
      createdBy: userId,
    },
  ]

  try {
    // Check if roles already exist
    const existingCount = await Role.countDocuments({ workspaceId })
    if (existingCount === 0) {
      await Role.insertMany(defaultRoles)
      console.log(
        `Created ${defaultRoles.length} default roles for workspace ${workspaceId}`
      )
    }
  } catch (error) {
    console.error('Error seeding default roles:', error)
  }
}

export async function seedWorkspaceDefaults(
  workspaceId: string,
  userId: string
) {
  await Promise.all([
    seedDefaultLeadStatuses(workspaceId, userId),
    seedDefaultTags(workspaceId, userId),
    seedDefaultRoles(workspaceId, userId),
  ])
}
