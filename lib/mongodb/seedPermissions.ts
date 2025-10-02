import { Permission } from './models/Permission'

export interface PermissionDefinition {
  resource: string
  action: string
  displayName: string
  description?: string
  category: string
  dependencies?: string[]
  conflictsWith?: string[]
}

// System permissions that should be available in all workspaces
export const SYSTEM_PERMISSIONS: PermissionDefinition[] = [
  // Lead Management
  {
    resource: 'leads',
    action: 'view',
    displayName: 'View Leads',
    description: 'View lead information and details',
    category: 'Sales',
  },
  {
    resource: 'leads',
    action: 'create',
    displayName: 'Create Leads',
    description: 'Create new leads in the system',
    category: 'Sales',
    dependencies: ['leads.view'],
  },
  {
    resource: 'leads',
    action: 'edit',
    displayName: 'Edit Leads',
    description: 'Modify existing lead information',
    category: 'Sales',
    dependencies: ['leads.view'],
  },
  {
    resource: 'leads',
    action: 'delete',
    displayName: 'Delete Leads',
    description: 'Remove leads from the system',
    category: 'Sales',
    dependencies: ['leads.view'],
  },
  {
    resource: 'leads',
    action: 'assign',
    displayName: 'Assign Leads',
    description: 'Assign leads to team members',
    category: 'Sales',
    dependencies: ['leads.view', 'members.view'],
  },
  {
    resource: 'leads',
    action: 'export',
    displayName: 'Export Leads',
    description: 'Export lead data to external formats',
    category: 'Sales',
    dependencies: ['leads.view'],
  },

  // User Management
  {
    resource: 'users',
    action: 'view',
    displayName: 'View Users',
    description: 'View user profiles and information',
    category: 'Admin',
  },
  {
    resource: 'users',
    action: 'create',
    displayName: 'Create Users',
    description: 'Create new user accounts',
    category: 'Admin',
    dependencies: ['users.view'],
  },
  {
    resource: 'users',
    action: 'edit',
    displayName: 'Edit Users',
    description: 'Modify user account information',
    category: 'Admin',
    dependencies: ['users.view'],
  },
  {
    resource: 'users',
    action: 'delete',
    displayName: 'Delete Users',
    description: 'Remove user accounts from the system',
    category: 'Admin',
    dependencies: ['users.view'],
  },

  // Workspace Management
  {
    resource: 'workspace',
    action: 'view',
    displayName: 'View Workspace',
    description: 'View workspace information and settings',
    category: 'Core',
  },
  {
    resource: 'workspace',
    action: 'edit',
    displayName: 'Edit Workspace',
    description: 'Modify workspace settings and configuration',
    category: 'Admin',
    dependencies: ['workspace.view'],
  },
  {
    resource: 'workspace',
    action: 'delete',
    displayName: 'Delete Workspace',
    description: 'Delete the entire workspace',
    category: 'Admin',
    dependencies: ['workspace.view'],
  },
  {
    resource: 'workspace',
    action: 'invite',
    displayName: 'Invite to Workspace',
    description: 'Send invitations to join the workspace',
    category: 'Admin',
    dependencies: ['workspace.view'],
  },

  // Member Management
  {
    resource: 'members',
    action: 'view',
    displayName: 'View Members',
    description: 'View workspace member list and details',
    category: 'Admin',
  },
  {
    resource: 'members',
    action: 'invite',
    displayName: 'Invite Members',
    description: 'Send invitations to new members',
    category: 'Admin',
    dependencies: ['members.view'],
  },
  {
    resource: 'members',
    action: 'edit',
    displayName: 'Edit Members',
    description: 'Modify member roles and permissions',
    category: 'Admin',
    dependencies: ['members.view'],
  },
  {
    resource: 'members',
    action: 'remove',
    displayName: 'Remove Members',
    description: 'Remove members from the workspace',
    category: 'Admin',
    dependencies: ['members.view'],
  },

  // Role Management
  {
    resource: 'roles',
    action: 'view',
    displayName: 'View Roles',
    description: 'View role definitions and permissions',
    category: 'Admin',
  },
  {
    resource: 'roles',
    action: 'create',
    displayName: 'Create Roles',
    description: 'Create new custom roles',
    category: 'Admin',
    dependencies: ['roles.view'],
  },
  {
    resource: 'roles',
    action: 'edit',
    displayName: 'Edit Roles',
    description: 'Modify existing role permissions',
    category: 'Admin',
    dependencies: ['roles.view'],
  },
  {
    resource: 'roles',
    action: 'delete',
    displayName: 'Delete Roles',
    description: 'Remove custom roles from the system',
    category: 'Admin',
    dependencies: ['roles.view'],
  },

  // Permission Management
  {
    resource: 'permissions',
    action: 'view',
    displayName: 'View Permissions',
    description: 'View available permissions and their details',
    category: 'Admin',
  },
  {
    resource: 'permissions',
    action: 'create',
    displayName: 'Create Permissions',
    description: 'Create new custom permissions',
    category: 'Admin',
    dependencies: ['permissions.view'],
  },
  {
    resource: 'permissions',
    action: 'edit',
    displayName: 'Edit Permissions',
    description: 'Modify existing permission definitions',
    category: 'Admin',
    dependencies: ['permissions.view'],
  },
  {
    resource: 'permissions',
    action: 'delete',
    displayName: 'Delete Permissions',
    description: 'Remove custom permissions from the system',
    category: 'Admin',
    dependencies: ['permissions.view'],
  },

  // Chat System
  {
    resource: 'chat',
    action: 'view',
    displayName: 'View Chat',
    description: 'Access chat rooms and view messages',
    category: 'Communication',
  },
  {
    resource: 'chat',
    action: 'send',
    displayName: 'Send Messages',
    description: 'Send messages in chat rooms',
    category: 'Communication',
    dependencies: ['chat.view'],
  },
  {
    resource: 'chat',
    action: 'create_room',
    displayName: 'Create Chat Rooms',
    description: 'Create new chat rooms',
    category: 'Communication',
    dependencies: ['chat.view'],
  },
  {
    resource: 'chat',
    action: 'manage_room',
    displayName: 'Manage Chat Rooms',
    description: 'Edit room settings, add/remove members',
    category: 'Communication',
    dependencies: ['chat.view'],
  },
  {
    resource: 'chat',
    action: 'delete_messages',
    displayName: 'Delete Messages',
    description: 'Delete messages from chat rooms',
    category: 'Communication',
    dependencies: ['chat.view'],
  },
  {
    resource: 'chat',
    action: 'upload_files',
    displayName: 'Upload Files',
    description: 'Upload files and attachments to chat',
    category: 'Communication',
    dependencies: ['chat.send'],
  },
  {
    resource: 'chat',
    action: 'moderate',
    displayName: 'Moderate Chat',
    description: 'Moderate chat rooms and manage user behavior',
    category: 'Communication',
    dependencies: ['chat.view', 'chat.delete_messages'],
  },

  // Analytics & Reports
  {
    resource: 'analytics',
    action: 'view',
    displayName: 'View Analytics',
    description: 'Access analytics dashboard and reports',
    category: 'Analytics',
  },
  {
    resource: 'reports',
    action: 'view',
    displayName: 'View Reports',
    description: 'Access detailed reporting features',
    category: 'Analytics',
  },
  {
    resource: 'reports',
    action: 'export',
    displayName: 'Export Reports',
    description: 'Export reports to external formats',
    category: 'Analytics',
    dependencies: ['reports.view'],
  },

  // Settings
  {
    resource: 'settings',
    action: 'view',
    displayName: 'View Settings',
    description: 'View application settings and preferences',
    category: 'Core',
  },
  {
    resource: 'settings',
    action: 'edit',
    displayName: 'Edit Settings',
    description: 'Modify application settings and preferences',
    category: 'Admin',
    dependencies: ['settings.view'],
  },

  // Billing (Owner only)
  {
    resource: 'billing',
    action: 'view',
    displayName: 'View Billing',
    description: 'View billing information and subscription details',
    category: 'Admin',
  },
  {
    resource: 'billing',
    action: 'edit',
    displayName: 'Edit Billing',
    description: 'Modify billing settings and subscription',
    category: 'Admin',
    dependencies: ['billing.view'],
  },

  // Webhooks
  {
    resource: 'webhooks',
    action: 'view',
    displayName: 'View Webhooks',
    description: 'View webhook configurations and logs',
    category: 'Integration',
  },
  {
    resource: 'webhooks',
    action: 'create',
    displayName: 'Create Webhooks',
    description: 'Create new webhook endpoints',
    category: 'Integration',
    dependencies: ['webhooks.view'],
  },
  {
    resource: 'webhooks',
    action: 'edit',
    displayName: 'Edit Webhooks',
    description: 'Modify webhook configurations',
    category: 'Integration',
    dependencies: ['webhooks.view'],
  },
  {
    resource: 'webhooks',
    action: 'delete',
    displayName: 'Delete Webhooks',
    description: 'Remove webhook endpoints',
    category: 'Integration',
    dependencies: ['webhooks.view'],
  },

  // Activities & Notifications
  {
    resource: 'activities',
    action: 'view',
    displayName: 'View Activities',
    description: 'View activity logs and history',
    category: 'Core',
  },
  {
    resource: 'notifications',
    action: 'view',
    displayName: 'View Notifications',
    description: 'View system notifications',
    category: 'Core',
  },
  {
    resource: 'notifications',
    action: 'manage',
    displayName: 'Manage Notifications',
    description: 'Configure notification settings',
    category: 'Core',
    dependencies: ['notifications.view'],
  },

  // Project Management
  {
    resource: 'projects',
    action: 'view',
    displayName: 'View Projects',
    description: 'View projects and their details',
    category: 'Projects',
  },
  {
    resource: 'projects',
    action: 'create',
    displayName: 'Create Projects',
    description: 'Create new projects',
    category: 'Projects',
    dependencies: ['projects.view'],
  },
  {
    resource: 'projects',
    action: 'edit',
    displayName: 'Edit Projects',
    description: 'Modify project details and settings',
    category: 'Projects',
    dependencies: ['projects.view'],
  },
  {
    resource: 'projects',
    action: 'delete',
    displayName: 'Delete Projects',
    description: 'Delete projects and all associated data',
    category: 'Projects',
    dependencies: ['projects.view'],
  },
  {
    resource: 'projects',
    action: 'manage',
    displayName: 'Manage Projects',
    description: 'Full project management access',
    category: 'Projects',
    dependencies: ['projects.view', 'projects.edit'],
  },

  // Project Members
  {
    resource: 'project_members',
    action: 'view',
    displayName: 'View Project Members',
    description: 'View project member list and roles',
    category: 'Projects',
    dependencies: ['projects.view'],
  },
  {
    resource: 'project_members',
    action: 'invite',
    displayName: 'Invite Project Members',
    description: 'Send invitations to join projects',
    category: 'Projects',
    dependencies: ['project_members.view'],
  },
  {
    resource: 'project_members',
    action: 'edit',
    displayName: 'Edit Project Members',
    description: 'Modify project member roles and permissions',
    category: 'Projects',
    dependencies: ['project_members.view'],
  },
  {
    resource: 'project_members',
    action: 'remove',
    displayName: 'Remove Project Members',
    description: 'Remove members from projects',
    category: 'Projects',
    dependencies: ['project_members.view'],
  },
  {
    resource: 'project_members',
    action: 'manage',
    displayName: 'Manage Project Members',
    description: 'Full project member management',
    category: 'Projects',
    dependencies: ['project_members.view', 'project_members.invite', 'project_members.remove'],
  },

  // Tasks
  {
    resource: 'tasks',
    action: 'view',
    displayName: 'View Tasks',
    description: 'View tasks and their details',
    category: 'Projects',
    dependencies: ['projects.view'],
  },
  {
    resource: 'tasks',
    action: 'create',
    displayName: 'Create Tasks',
    description: 'Create new tasks in projects',
    category: 'Projects',
    dependencies: ['tasks.view'],
  },
  {
    resource: 'tasks',
    action: 'edit',
    displayName: 'Edit Tasks',
    description: 'Modify task details and status',
    category: 'Projects',
    dependencies: ['tasks.view'],
  },
  {
    resource: 'tasks',
    action: 'delete',
    displayName: 'Delete Tasks',
    description: 'Delete tasks from projects',
    category: 'Projects',
    dependencies: ['tasks.view'],
  },
  {
    resource: 'tasks',
    action: 'assign',
    displayName: 'Assign Tasks',
    description: 'Assign tasks to project members',
    category: 'Projects',
    dependencies: ['tasks.edit', 'project_members.view'],
  },
  {
    resource: 'tasks',
    action: 'manage',
    displayName: 'Manage Tasks',
    description: 'Full task management access',
    category: 'Projects',
    dependencies: ['tasks.view', 'tasks.edit', 'tasks.assign'],
  },

  // Documents
  {
    resource: 'documents',
    action: 'view',
    displayName: 'View Documents',
    description: 'View project documents and content',
    category: 'Projects',
    dependencies: ['projects.view'],
  },
  {
    resource: 'documents',
    action: 'create',
    displayName: 'Create Documents',
    description: 'Create new documents in projects',
    category: 'Projects',
    dependencies: ['documents.view'],
  },
  {
    resource: 'documents',
    action: 'edit',
    displayName: 'Edit Documents',
    description: 'Modify document content and properties',
    category: 'Projects',
    dependencies: ['documents.view'],
  },
  {
    resource: 'documents',
    action: 'delete',
    displayName: 'Delete Documents',
    description: 'Delete documents from projects',
    category: 'Projects',
    dependencies: ['documents.view'],
  },
  {
    resource: 'documents',
    action: 'share',
    displayName: 'Share Documents',
    description: 'Share documents with external users',
    category: 'Projects',
    dependencies: ['documents.view'],
  },
  {
    resource: 'documents',
    action: 'manage',
    displayName: 'Manage Documents',
    description: 'Full document management access',
    category: 'Projects',
    dependencies: ['documents.view', 'documents.edit', 'documents.share'],
  },
]

export async function seedSystemPermissions() {
  try {
    console.log('Seeding system permissions...')

    for (const permDef of SYSTEM_PERMISSIONS) {
      const name = `${permDef.resource}.${permDef.action}`

      // Check if permission already exists
      const existingPermission = await Permission.findOne({
        name,
        isSystemPermission: true,
      })

      if (!existingPermission) {
        await Permission.create({
          ...permDef,
          name,
          isSystemPermission: true,
          isActive: true,
          workspaceId: null, // System permissions are workspace-agnostic
        })
        console.log(`Created system permission: ${name}`)
      }
    }

    console.log('System permissions seeded successfully')
  } catch (error) {
    console.error('Error seeding system permissions:', error)
    throw error
  }
}


// Get available permissions for a workspace
export async function getAvailablePermissions(workspaceId?: string) {
  const query = workspaceId
    ? {
        $or: [
          { workspaceId, isActive: true },
          { isSystemPermission: true, isActive: true }
        ]
      }
    : { isSystemPermission: true, isActive: true }

  return await Permission.find(query)
    .sort({ category: 1, resource: 1, action: 1 })
    .lean()
}

// Validation functions
export function validatePermissionDependencies(
  requestedPermissions: string[],
  allPermissions: any[]
): { valid: boolean; missingDependencies: string[] } {
  const missingDependencies: string[] = []

  for (const permName of requestedPermissions) {
    const permission = allPermissions.find(p => p.name === permName)
    if (permission?.dependencies) {
      for (const dep of permission.dependencies) {
        if (!requestedPermissions.includes(dep)) {
          missingDependencies.push(dep)
        }
      }
    }
  }

  return {
    valid: missingDependencies.length === 0,
    missingDependencies: Array.from(new Set(missingDependencies))
  }
}

export function validatePermissionConflicts(
  requestedPermissions: string[],
  allPermissions: any[]
): { valid: boolean; conflicts: Array<{ permission: string; conflictsWith: string }> } {
  const conflicts: Array<{ permission: string; conflictsWith: string }> = []

  for (const permName of requestedPermissions) {
    const permission = allPermissions.find(p => p.name === permName)
    if (permission?.conflictsWith) {
      for (const conflict of permission.conflictsWith) {
        if (requestedPermissions.includes(conflict)) {
          conflicts.push({ permission: permName, conflictsWith: conflict })
        }
      }
    }
  }

  return {
    valid: conflicts.length === 0,
    conflicts
  }
}