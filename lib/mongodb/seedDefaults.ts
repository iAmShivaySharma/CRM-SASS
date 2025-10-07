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
      name: 'Owner',
      description: 'Full system access and workspace ownership',
      permissions: [
        // All core permissions
        'leads.view',
        'leads.create',
        'leads.edit',
        'leads.delete',
        'leads.assign',
        'leads.export',
        'users.view',
        'users.create',
        'users.edit',
        'users.delete',
        'workspace.view',
        'workspace.edit',
        'workspace.delete',
        'workspace.invite',
        'members.view',
        'members.invite',
        'members.edit',
        'members.remove',
        'roles.view',
        'roles.create',
        'roles.edit',
        'roles.delete',
        'permissions.view',
        'permissions.create',
        'permissions.edit',
        'permissions.delete',
        'chat.view',
        'chat.send',
        'chat.create_room',
        'chat.manage_room',
        'chat.delete_messages',
        'chat.upload_files',
        'chat.moderate',
        'analytics.view',
        'reports.view',
        'reports.export',
        'settings.view',
        'settings.edit',
        'billing.view',
        'billing.edit',
        'webhooks.view',
        'webhooks.create',
        'webhooks.edit',
        'webhooks.delete',
        'activities.view',
        'notifications.view',
        'notifications.manage',
      ],
      isDefault: true,
      createdBy: userId,
    },
    {
      workspaceId,
      name: 'Admin',
      description: 'Administrative access to manage workspace',
      permissions: [
        'leads.view',
        'leads.create',
        'leads.edit',
        'leads.delete',
        'leads.assign',
        'leads.export',
        'users.view',
        'users.create',
        'users.edit',
        'workspace.view',
        'workspace.edit',
        'workspace.invite',
        'members.view',
        'members.invite',
        'members.edit',
        'members.remove',
        'roles.view',
        'roles.create',
        'roles.edit',
        'roles.delete',
        'permissions.view',
        'chat.view',
        'chat.send',
        'chat.create_room',
        'chat.manage_room',
        'chat.delete_messages',
        'chat.upload_files',
        'chat.moderate',
        'analytics.view',
        'reports.view',
        'reports.export',
        'settings.view',
        'settings.edit',
        'webhooks.view',
        'webhooks.create',
        'webhooks.edit',
        'webhooks.delete',
        'activities.view',
        'notifications.view',
        'notifications.manage',
      ],
      isDefault: false,
      createdBy: userId,
    },
    {
      workspaceId,
      name: 'Sales Manager',
      description: 'Manage sales team and leads',
      permissions: [
        'leads.view',
        'leads.create',
        'leads.edit',
        'leads.delete',
        'leads.assign',
        'leads.export',
        'users.view',
        'workspace.view',
        'members.view',
        'chat.view',
        'chat.send',
        'chat.create_room',
        'chat.manage_room',
        'chat.upload_files',
        'analytics.view',
        'reports.view',
        'reports.export',
        'settings.view',
        'activities.view',
        'notifications.view',
      ],
      isDefault: false,
      createdBy: userId,
    },
    {
      workspaceId,
      name: 'Sales Rep',
      description: 'Basic sales representative access',
      permissions: [
        'leads.view',
        'leads.create',
        'leads.edit',
        'workspace.view',
        'members.view',
        'chat.view',
        'chat.send',
        'chat.upload_files',
        'analytics.view',
        'settings.view',
        'activities.view',
        'notifications.view',
      ],
      isDefault: false,
      createdBy: userId,
    },
    {
      workspaceId,
      name: 'Viewer',
      description: 'Read-only access to workspace',
      permissions: [
        'leads.view',
        'workspace.view',
        'members.view',
        'chat.view',
        'analytics.view',
        'settings.view',
        'activities.view',
        'notifications.view',
      ],
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
