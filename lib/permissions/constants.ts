
export interface PermissionDefinition {
  name: string
  displayName: string
  description: string
  category: PermissionCategory
  dependencies?: Permission[]
  conflictsWith?: Permission[]
}

export enum PermissionCategory {
  CORE = 'Core',
  SALES = 'Sales',
  ADMIN = 'Admin',
  ANALYTICS = 'Analytics',
  INTEGRATION = 'Integration',
  COMMUNICATION = 'Communication',
  PROJECTS = 'Projects'
}

/**
 * All Available Permissions - Enum ensures type safety
 * Format: RESOURCE_ACTION = 'resource.action'
 */
export enum Permission {
  // ============= CORE PERMISSIONS =============
  WORKSPACE_VIEW = 'workspace.view',
  WORKSPACE_EDIT = 'workspace.edit',
  WORKSPACE_DELETE = 'workspace.delete',
  WORKSPACE_INVITE = 'workspace.invite',

  ACTIVITIES_VIEW = 'activities.view',
  NOTIFICATIONS_VIEW = 'notifications.view',
  NOTIFICATIONS_MANAGE = 'notifications.manage',
  SETTINGS_VIEW = 'settings.view',
  SETTINGS_EDIT = 'settings.edit',

  // ============= SALES PERMISSIONS =============
  // Leads
  LEADS_VIEW = 'leads.view',
  LEADS_CREATE = 'leads.create',
  LEADS_EDIT = 'leads.edit',
  LEADS_DELETE = 'leads.delete',
  LEADS_ASSIGN = 'leads.assign',
  LEADS_EXPORT = 'leads.export',
  LEADS_CONVERT = 'leads.convert',

  // Contacts (Missing from original!)
  CONTACTS_VIEW = 'contacts.view',
  CONTACTS_CREATE = 'contacts.create',
  CONTACTS_EDIT = 'contacts.edit',
  CONTACTS_DELETE = 'contacts.delete',
  CONTACTS_EXPORT = 'contacts.export',

  // Lead Notes
  LEAD_NOTES_VIEW = 'lead_notes.view',
  LEAD_NOTES_CREATE = 'lead_notes.create',
  LEAD_NOTES_EDIT = 'lead_notes.edit',
  LEAD_NOTES_DELETE = 'lead_notes.delete',

  // Lead Activities
  LEAD_ACTIVITIES_VIEW = 'lead_activities.view',

  // Lead Statuses (Missing from original!)
  LEAD_STATUSES_VIEW = 'lead_statuses.view',
  LEAD_STATUSES_CREATE = 'lead_statuses.create',
  LEAD_STATUSES_EDIT = 'lead_statuses.edit',
  LEAD_STATUSES_DELETE = 'lead_statuses.delete',

  // Tags (Missing from original!)
  TAGS_VIEW = 'tags.view',
  TAGS_CREATE = 'tags.create',
  TAGS_EDIT = 'tags.edit',
  TAGS_DELETE = 'tags.delete',

  // ============= ADMIN PERMISSIONS =============
  // Users
  USERS_VIEW = 'users.view',
  USERS_CREATE = 'users.create',
  USERS_EDIT = 'users.edit',
  USERS_DELETE = 'users.delete',

  // Members
  MEMBERS_VIEW = 'members.view',
  MEMBERS_INVITE = 'members.invite',
  MEMBERS_EDIT = 'members.edit',
  MEMBERS_REMOVE = 'members.remove',

  // Roles
  ROLES_VIEW = 'roles.view',
  ROLES_CREATE = 'roles.create',
  ROLES_EDIT = 'roles.edit',
  ROLES_DELETE = 'roles.delete',

  // Permissions (Read-only!)
  PERMISSIONS_VIEW = 'permissions.view',

  // Billing
  BILLING_VIEW = 'billing.view',
  BILLING_EDIT = 'billing.edit',

  // Invitations
  INVITATIONS_VIEW = 'invitations.view',
  INVITATIONS_CREATE = 'invitations.create',
  INVITATIONS_CANCEL = 'invitations.cancel',

  // ============= COMMUNICATION PERMISSIONS =============
  CHAT_VIEW = 'chat.view',
  CHAT_SEND = 'chat.send',
  CHAT_CREATE_ROOM = 'chat.create_room',
  CHAT_MANAGE_ROOM = 'chat.manage_room',
  CHAT_DELETE_MESSAGES = 'chat.delete_messages',
  CHAT_UPLOAD_FILES = 'chat.upload_files',
  CHAT_MODERATE = 'chat.moderate',

  // ============= ANALYTICS PERMISSIONS =============
  ANALYTICS_VIEW = 'analytics.view',
  REPORTS_VIEW = 'reports.view',
  REPORTS_EXPORT = 'reports.export',

  // ============= INTEGRATION PERMISSIONS =============
  WEBHOOKS_VIEW = 'webhooks.view',
  WEBHOOKS_CREATE = 'webhooks.create',
  WEBHOOKS_EDIT = 'webhooks.edit',
  WEBHOOKS_DELETE = 'webhooks.delete',

  // ============= PROJECTS PERMISSIONS =============
  // Projects
  PROJECTS_VIEW = 'projects.view',
  PROJECTS_CREATE = 'projects.create',
  PROJECTS_EDIT = 'projects.edit',
  PROJECTS_DELETE = 'projects.delete',
  PROJECTS_MANAGE = 'projects.manage',

  // Project Members
  PROJECT_MEMBERS_VIEW = 'project_members.view',
  PROJECT_MEMBERS_INVITE = 'project_members.invite',
  PROJECT_MEMBERS_EDIT = 'project_members.edit',
  PROJECT_MEMBERS_REMOVE = 'project_members.remove',
  PROJECT_MEMBERS_MANAGE = 'project_members.manage',

  // Tasks
  TASKS_VIEW = 'tasks.view',
  TASKS_CREATE = 'tasks.create',
  TASKS_EDIT = 'tasks.edit',
  TASKS_DELETE = 'tasks.delete',
  TASKS_ASSIGN = 'tasks.assign',
  TASKS_MANAGE = 'tasks.manage',

  // Documents
  DOCUMENTS_VIEW = 'documents.view',
  DOCUMENTS_CREATE = 'documents.create',
  DOCUMENTS_EDIT = 'documents.edit',
  DOCUMENTS_DELETE = 'documents.delete',
  DOCUMENTS_SHARE = 'documents.share',
  DOCUMENTS_MANAGE = 'documents.manage',

  // Columns (Missing from original!)
  COLUMNS_VIEW = 'columns.view',
  COLUMNS_CREATE = 'columns.create',
  COLUMNS_EDIT = 'columns.edit',
  COLUMNS_DELETE = 'columns.delete'
}

/**
 * Permission Definitions with metadata
 * This is the ONLY place where permissions are defined
 */
export const PERMISSION_DEFINITIONS: Record<Permission, PermissionDefinition> = {
  // ============= CORE PERMISSIONS =============
  [Permission.WORKSPACE_VIEW]: {
    name: Permission.WORKSPACE_VIEW,
    displayName: 'View Workspace',
    description: 'View workspace information and settings',
    category: PermissionCategory.CORE
  },
  [Permission.WORKSPACE_EDIT]: {
    name: Permission.WORKSPACE_EDIT,
    displayName: 'Edit Workspace',
    description: 'Modify workspace settings and configuration',
    category: PermissionCategory.ADMIN,
    dependencies: [Permission.WORKSPACE_VIEW]
  },
  [Permission.WORKSPACE_DELETE]: {
    name: Permission.WORKSPACE_DELETE,
    displayName: 'Delete Workspace',
    description: 'Delete the entire workspace',
    category: PermissionCategory.ADMIN,
    dependencies: [Permission.WORKSPACE_VIEW]
  },
  [Permission.WORKSPACE_INVITE]: {
    name: Permission.WORKSPACE_INVITE,
    displayName: 'Invite to Workspace',
    description: 'Send invitations to join the workspace',
    category: PermissionCategory.ADMIN,
    dependencies: [Permission.WORKSPACE_VIEW]
  },
  [Permission.ACTIVITIES_VIEW]: {
    name: Permission.ACTIVITIES_VIEW,
    displayName: 'View Activities',
    description: 'View activity logs and history',
    category: PermissionCategory.CORE
  },
  [Permission.NOTIFICATIONS_VIEW]: {
    name: Permission.NOTIFICATIONS_VIEW,
    displayName: 'View Notifications',
    description: 'View system notifications',
    category: PermissionCategory.CORE
  },
  [Permission.NOTIFICATIONS_MANAGE]: {
    name: Permission.NOTIFICATIONS_MANAGE,
    displayName: 'Manage Notifications',
    description: 'Configure notification settings',
    category: PermissionCategory.CORE,
    dependencies: [Permission.NOTIFICATIONS_VIEW]
  },
  [Permission.SETTINGS_VIEW]: {
    name: Permission.SETTINGS_VIEW,
    displayName: 'View Settings',
    description: 'View application settings and preferences',
    category: PermissionCategory.CORE
  },
  [Permission.SETTINGS_EDIT]: {
    name: Permission.SETTINGS_EDIT,
    displayName: 'Edit Settings',
    description: 'Modify application settings and preferences',
    category: PermissionCategory.ADMIN,
    dependencies: [Permission.SETTINGS_VIEW]
  },

  // ============= SALES PERMISSIONS =============
  [Permission.LEADS_VIEW]: {
    name: Permission.LEADS_VIEW,
    displayName: 'View Leads',
    description: 'View lead information and details',
    category: PermissionCategory.SALES
  },
  [Permission.LEADS_CREATE]: {
    name: Permission.LEADS_CREATE,
    displayName: 'Create Leads',
    description: 'Create new leads in the system',
    category: PermissionCategory.SALES,
    dependencies: [Permission.LEADS_VIEW]
  },
  [Permission.LEADS_EDIT]: {
    name: Permission.LEADS_EDIT,
    displayName: 'Edit Leads',
    description: 'Modify existing lead information',
    category: PermissionCategory.SALES,
    dependencies: [Permission.LEADS_VIEW]
  },
  [Permission.LEADS_DELETE]: {
    name: Permission.LEADS_DELETE,
    displayName: 'Delete Leads',
    description: 'Remove leads from the system',
    category: PermissionCategory.SALES,
    dependencies: [Permission.LEADS_VIEW]
  },
  [Permission.LEADS_ASSIGN]: {
    name: Permission.LEADS_ASSIGN,
    displayName: 'Assign Leads',
    description: 'Assign leads to team members',
    category: PermissionCategory.SALES,
    dependencies: [Permission.LEADS_VIEW, Permission.MEMBERS_VIEW]
  },
  [Permission.LEADS_EXPORT]: {
    name: Permission.LEADS_EXPORT,
    displayName: 'Export Leads',
    description: 'Export lead data to external formats',
    category: PermissionCategory.SALES,
    dependencies: [Permission.LEADS_VIEW]
  },
  [Permission.LEADS_CONVERT]: {
    name: Permission.LEADS_CONVERT,
    displayName: 'Convert Leads',
    description: 'Convert leads to contacts',
    category: PermissionCategory.SALES,
    dependencies: [Permission.LEADS_VIEW, Permission.CONTACTS_CREATE]
  },

  // Contacts
  [Permission.CONTACTS_VIEW]: {
    name: Permission.CONTACTS_VIEW,
    displayName: 'View Contacts',
    description: 'View contact information and details',
    category: PermissionCategory.SALES
  },
  [Permission.CONTACTS_CREATE]: {
    name: Permission.CONTACTS_CREATE,
    displayName: 'Create Contacts',
    description: 'Create new contacts in the system',
    category: PermissionCategory.SALES,
    dependencies: [Permission.CONTACTS_VIEW]
  },
  [Permission.CONTACTS_EDIT]: {
    name: Permission.CONTACTS_EDIT,
    displayName: 'Edit Contacts',
    description: 'Modify existing contact information',
    category: PermissionCategory.SALES,
    dependencies: [Permission.CONTACTS_VIEW]
  },
  [Permission.CONTACTS_DELETE]: {
    name: Permission.CONTACTS_DELETE,
    displayName: 'Delete Contacts',
    description: 'Remove contacts from the system',
    category: PermissionCategory.SALES,
    dependencies: [Permission.CONTACTS_VIEW]
  },
  [Permission.CONTACTS_EXPORT]: {
    name: Permission.CONTACTS_EXPORT,
    displayName: 'Export Contacts',
    description: 'Export contact data to external formats',
    category: PermissionCategory.SALES,
    dependencies: [Permission.CONTACTS_VIEW]
  },

  // Lead Notes
  [Permission.LEAD_NOTES_VIEW]: {
    name: Permission.LEAD_NOTES_VIEW,
    displayName: 'View Lead Notes',
    description: 'View notes and comments on leads',
    category: PermissionCategory.SALES,
    dependencies: [Permission.LEADS_VIEW]
  },
  [Permission.LEAD_NOTES_CREATE]: {
    name: Permission.LEAD_NOTES_CREATE,
    displayName: 'Create Lead Notes',
    description: 'Add notes and comments to leads',
    category: PermissionCategory.SALES,
    dependencies: [Permission.LEAD_NOTES_VIEW]
  },
  [Permission.LEAD_NOTES_EDIT]: {
    name: Permission.LEAD_NOTES_EDIT,
    displayName: 'Edit Lead Notes',
    description: 'Modify existing lead notes',
    category: PermissionCategory.SALES,
    dependencies: [Permission.LEAD_NOTES_VIEW]
  },
  [Permission.LEAD_NOTES_DELETE]: {
    name: Permission.LEAD_NOTES_DELETE,
    displayName: 'Delete Lead Notes',
    description: 'Remove lead notes',
    category: PermissionCategory.SALES,
    dependencies: [Permission.LEAD_NOTES_VIEW]
  },

  // Lead Activities
  [Permission.LEAD_ACTIVITIES_VIEW]: {
    name: Permission.LEAD_ACTIVITIES_VIEW,
    displayName: 'View Lead Activities',
    description: 'View activity history for leads',
    category: PermissionCategory.SALES,
    dependencies: [Permission.LEADS_VIEW]
  },

  // Lead Statuses
  [Permission.LEAD_STATUSES_VIEW]: {
    name: Permission.LEAD_STATUSES_VIEW,
    displayName: 'View Lead Statuses',
    description: 'View available lead status options',
    category: PermissionCategory.SALES
  },
  [Permission.LEAD_STATUSES_CREATE]: {
    name: Permission.LEAD_STATUSES_CREATE,
    displayName: 'Create Lead Statuses',
    description: 'Create new lead status options',
    category: PermissionCategory.ADMIN,
    dependencies: [Permission.LEAD_STATUSES_VIEW]
  },
  [Permission.LEAD_STATUSES_EDIT]: {
    name: Permission.LEAD_STATUSES_EDIT,
    displayName: 'Edit Lead Statuses',
    description: 'Modify existing lead status options',
    category: PermissionCategory.ADMIN,
    dependencies: [Permission.LEAD_STATUSES_VIEW]
  },
  [Permission.LEAD_STATUSES_DELETE]: {
    name: Permission.LEAD_STATUSES_DELETE,
    displayName: 'Delete Lead Statuses',
    description: 'Remove lead status options',
    category: PermissionCategory.ADMIN,
    dependencies: [Permission.LEAD_STATUSES_VIEW]
  },

  // Tags
  [Permission.TAGS_VIEW]: {
    name: Permission.TAGS_VIEW,
    displayName: 'View Tags',
    description: 'View available tags for organizing data',
    category: PermissionCategory.CORE
  },
  [Permission.TAGS_CREATE]: {
    name: Permission.TAGS_CREATE,
    displayName: 'Create Tags',
    description: 'Create new tags for organizing data',
    category: PermissionCategory.CORE,
    dependencies: [Permission.TAGS_VIEW]
  },
  [Permission.TAGS_EDIT]: {
    name: Permission.TAGS_EDIT,
    displayName: 'Edit Tags',
    description: 'Modify existing tags',
    category: PermissionCategory.CORE,
    dependencies: [Permission.TAGS_VIEW]
  },
  [Permission.TAGS_DELETE]: {
    name: Permission.TAGS_DELETE,
    displayName: 'Delete Tags',
    description: 'Remove tags from the system',
    category: PermissionCategory.CORE,
    dependencies: [Permission.TAGS_VIEW]
  },

  // ============= ADMIN PERMISSIONS =============
  [Permission.USERS_VIEW]: {
    name: Permission.USERS_VIEW,
    displayName: 'View Users',
    description: 'View user profiles and information',
    category: PermissionCategory.ADMIN
  },
  [Permission.USERS_CREATE]: {
    name: Permission.USERS_CREATE,
    displayName: 'Create Users',
    description: 'Create new user accounts',
    category: PermissionCategory.ADMIN,
    dependencies: [Permission.USERS_VIEW]
  },
  [Permission.USERS_EDIT]: {
    name: Permission.USERS_EDIT,
    displayName: 'Edit Users',
    description: 'Modify user account information',
    category: PermissionCategory.ADMIN,
    dependencies: [Permission.USERS_VIEW]
  },
  [Permission.USERS_DELETE]: {
    name: Permission.USERS_DELETE,
    displayName: 'Delete Users',
    description: 'Remove user accounts from the system',
    category: PermissionCategory.ADMIN,
    dependencies: [Permission.USERS_VIEW]
  },

  [Permission.MEMBERS_VIEW]: {
    name: Permission.MEMBERS_VIEW,
    displayName: 'View Members',
    description: 'View workspace member list and details',
    category: PermissionCategory.ADMIN
  },
  [Permission.MEMBERS_INVITE]: {
    name: Permission.MEMBERS_INVITE,
    displayName: 'Invite Members',
    description: 'Send invitations to new members',
    category: PermissionCategory.ADMIN,
    dependencies: [Permission.MEMBERS_VIEW]
  },
  [Permission.MEMBERS_EDIT]: {
    name: Permission.MEMBERS_EDIT,
    displayName: 'Edit Members',
    description: 'Modify member roles and permissions',
    category: PermissionCategory.ADMIN,
    dependencies: [Permission.MEMBERS_VIEW]
  },
  [Permission.MEMBERS_REMOVE]: {
    name: Permission.MEMBERS_REMOVE,
    displayName: 'Remove Members',
    description: 'Remove members from the workspace',
    category: PermissionCategory.ADMIN,
    dependencies: [Permission.MEMBERS_VIEW]
  },

  [Permission.ROLES_VIEW]: {
    name: Permission.ROLES_VIEW,
    displayName: 'View Roles',
    description: 'View role definitions and permissions',
    category: PermissionCategory.ADMIN
  },
  [Permission.ROLES_CREATE]: {
    name: Permission.ROLES_CREATE,
    displayName: 'Create Roles',
    description: 'Create new custom roles',
    category: PermissionCategory.ADMIN,
    dependencies: [Permission.ROLES_VIEW]
  },
  [Permission.ROLES_EDIT]: {
    name: Permission.ROLES_EDIT,
    displayName: 'Edit Roles',
    description: 'Modify existing role permissions',
    category: PermissionCategory.ADMIN,
    dependencies: [Permission.ROLES_VIEW]
  },
  [Permission.ROLES_DELETE]: {
    name: Permission.ROLES_DELETE,
    displayName: 'Delete Roles',
    description: 'Remove custom roles from the system',
    category: PermissionCategory.ADMIN,
    dependencies: [Permission.ROLES_VIEW]
  },

  [Permission.PERMISSIONS_VIEW]: {
    name: Permission.PERMISSIONS_VIEW,
    displayName: 'View Permissions',
    description: 'View available permissions (read-only)',
    category: PermissionCategory.ADMIN
  },

  [Permission.BILLING_VIEW]: {
    name: Permission.BILLING_VIEW,
    displayName: 'View Billing',
    description: 'View billing information and subscription details',
    category: PermissionCategory.ADMIN
  },
  [Permission.BILLING_EDIT]: {
    name: Permission.BILLING_EDIT,
    displayName: 'Edit Billing',
    description: 'Modify billing settings and subscription',
    category: PermissionCategory.ADMIN,
    dependencies: [Permission.BILLING_VIEW]
  },

  [Permission.INVITATIONS_VIEW]: {
    name: Permission.INVITATIONS_VIEW,
    displayName: 'View Invitations',
    description: 'View pending workspace invitations',
    category: PermissionCategory.ADMIN
  },
  [Permission.INVITATIONS_CREATE]: {
    name: Permission.INVITATIONS_CREATE,
    displayName: 'Create Invitations',
    description: 'Send workspace invitations',
    category: PermissionCategory.ADMIN,
    dependencies: [Permission.INVITATIONS_VIEW]
  },
  [Permission.INVITATIONS_CANCEL]: {
    name: Permission.INVITATIONS_CANCEL,
    displayName: 'Cancel Invitations',
    description: 'Cancel pending invitations',
    category: PermissionCategory.ADMIN,
    dependencies: [Permission.INVITATIONS_VIEW]
  },

  // ============= COMMUNICATION PERMISSIONS =============
  [Permission.CHAT_VIEW]: {
    name: Permission.CHAT_VIEW,
    displayName: 'View Chat',
    description: 'Access chat rooms and view messages',
    category: PermissionCategory.COMMUNICATION
  },
  [Permission.CHAT_SEND]: {
    name: Permission.CHAT_SEND,
    displayName: 'Send Messages',
    description: 'Send messages in chat rooms',
    category: PermissionCategory.COMMUNICATION,
    dependencies: [Permission.CHAT_VIEW]
  },
  [Permission.CHAT_CREATE_ROOM]: {
    name: Permission.CHAT_CREATE_ROOM,
    displayName: 'Create Chat Rooms',
    description: 'Create new chat rooms',
    category: PermissionCategory.COMMUNICATION,
    dependencies: [Permission.CHAT_VIEW]
  },
  [Permission.CHAT_MANAGE_ROOM]: {
    name: Permission.CHAT_MANAGE_ROOM,
    displayName: 'Manage Chat Rooms',
    description: 'Edit room settings, add/remove members',
    category: PermissionCategory.COMMUNICATION,
    dependencies: [Permission.CHAT_VIEW]
  },
  [Permission.CHAT_DELETE_MESSAGES]: {
    name: Permission.CHAT_DELETE_MESSAGES,
    displayName: 'Delete Messages',
    description: 'Delete messages from chat rooms',
    category: PermissionCategory.COMMUNICATION,
    dependencies: [Permission.CHAT_VIEW]
  },
  [Permission.CHAT_UPLOAD_FILES]: {
    name: Permission.CHAT_UPLOAD_FILES,
    displayName: 'Upload Files',
    description: 'Upload files and attachments to chat',
    category: PermissionCategory.COMMUNICATION,
    dependencies: [Permission.CHAT_SEND]
  },
  [Permission.CHAT_MODERATE]: {
    name: Permission.CHAT_MODERATE,
    displayName: 'Moderate Chat',
    description: 'Moderate chat rooms and manage user behavior',
    category: PermissionCategory.COMMUNICATION,
    dependencies: [Permission.CHAT_VIEW, Permission.CHAT_DELETE_MESSAGES]
  },

  // ============= ANALYTICS PERMISSIONS =============
  [Permission.ANALYTICS_VIEW]: {
    name: Permission.ANALYTICS_VIEW,
    displayName: 'View Analytics',
    description: 'Access analytics dashboard and reports',
    category: PermissionCategory.ANALYTICS
  },
  [Permission.REPORTS_VIEW]: {
    name: Permission.REPORTS_VIEW,
    displayName: 'View Reports',
    description: 'Access detailed reporting features',
    category: PermissionCategory.ANALYTICS
  },
  [Permission.REPORTS_EXPORT]: {
    name: Permission.REPORTS_EXPORT,
    displayName: 'Export Reports',
    description: 'Export reports to external formats',
    category: PermissionCategory.ANALYTICS,
    dependencies: [Permission.REPORTS_VIEW]
  },

  // ============= INTEGRATION PERMISSIONS =============
  [Permission.WEBHOOKS_VIEW]: {
    name: Permission.WEBHOOKS_VIEW,
    displayName: 'View Webhooks',
    description: 'View webhook configurations and logs',
    category: PermissionCategory.INTEGRATION
  },
  [Permission.WEBHOOKS_CREATE]: {
    name: Permission.WEBHOOKS_CREATE,
    displayName: 'Create Webhooks',
    description: 'Create new webhook endpoints',
    category: PermissionCategory.INTEGRATION,
    dependencies: [Permission.WEBHOOKS_VIEW]
  },
  [Permission.WEBHOOKS_EDIT]: {
    name: Permission.WEBHOOKS_EDIT,
    displayName: 'Edit Webhooks',
    description: 'Modify webhook configurations',
    category: PermissionCategory.INTEGRATION,
    dependencies: [Permission.WEBHOOKS_VIEW]
  },
  [Permission.WEBHOOKS_DELETE]: {
    name: Permission.WEBHOOKS_DELETE,
    displayName: 'Delete Webhooks',
    description: 'Remove webhook endpoints',
    category: PermissionCategory.INTEGRATION,
    dependencies: [Permission.WEBHOOKS_VIEW]
  },

  // ============= PROJECTS PERMISSIONS =============
  [Permission.PROJECTS_VIEW]: {
    name: Permission.PROJECTS_VIEW,
    displayName: 'View Projects',
    description: 'View projects and their details',
    category: PermissionCategory.PROJECTS
  },
  [Permission.PROJECTS_CREATE]: {
    name: Permission.PROJECTS_CREATE,
    displayName: 'Create Projects',
    description: 'Create new projects',
    category: PermissionCategory.PROJECTS,
    dependencies: [Permission.PROJECTS_VIEW]
  },
  [Permission.PROJECTS_EDIT]: {
    name: Permission.PROJECTS_EDIT,
    displayName: 'Edit Projects',
    description: 'Modify project details and settings',
    category: PermissionCategory.PROJECTS,
    dependencies: [Permission.PROJECTS_VIEW]
  },
  [Permission.PROJECTS_DELETE]: {
    name: Permission.PROJECTS_DELETE,
    displayName: 'Delete Projects',
    description: 'Delete projects and all associated data',
    category: PermissionCategory.PROJECTS,
    dependencies: [Permission.PROJECTS_VIEW]
  },
  [Permission.PROJECTS_MANAGE]: {
    name: Permission.PROJECTS_MANAGE,
    displayName: 'Manage Projects',
    description: 'Full project management access',
    category: PermissionCategory.PROJECTS,
    dependencies: [Permission.PROJECTS_VIEW, Permission.PROJECTS_EDIT]
  },

  [Permission.PROJECT_MEMBERS_VIEW]: {
    name: Permission.PROJECT_MEMBERS_VIEW,
    displayName: 'View Project Members',
    description: 'View project member list and roles',
    category: PermissionCategory.PROJECTS,
    dependencies: [Permission.PROJECTS_VIEW]
  },
  [Permission.PROJECT_MEMBERS_INVITE]: {
    name: Permission.PROJECT_MEMBERS_INVITE,
    displayName: 'Invite Project Members',
    description: 'Send invitations to join projects',
    category: PermissionCategory.PROJECTS,
    dependencies: [Permission.PROJECT_MEMBERS_VIEW]
  },
  [Permission.PROJECT_MEMBERS_EDIT]: {
    name: Permission.PROJECT_MEMBERS_EDIT,
    displayName: 'Edit Project Members',
    description: 'Modify project member roles and permissions',
    category: PermissionCategory.PROJECTS,
    dependencies: [Permission.PROJECT_MEMBERS_VIEW]
  },
  [Permission.PROJECT_MEMBERS_REMOVE]: {
    name: Permission.PROJECT_MEMBERS_REMOVE,
    displayName: 'Remove Project Members',
    description: 'Remove members from projects',
    category: PermissionCategory.PROJECTS,
    dependencies: [Permission.PROJECT_MEMBERS_VIEW]
  },
  [Permission.PROJECT_MEMBERS_MANAGE]: {
    name: Permission.PROJECT_MEMBERS_MANAGE,
    displayName: 'Manage Project Members',
    description: 'Full project member management',
    category: PermissionCategory.PROJECTS,
    dependencies: [Permission.PROJECT_MEMBERS_VIEW, Permission.PROJECT_MEMBERS_INVITE, Permission.PROJECT_MEMBERS_REMOVE]
  },

  [Permission.TASKS_VIEW]: {
    name: Permission.TASKS_VIEW,
    displayName: 'View Tasks',
    description: 'View tasks and their details',
    category: PermissionCategory.PROJECTS,
    dependencies: [Permission.PROJECTS_VIEW]
  },
  [Permission.TASKS_CREATE]: {
    name: Permission.TASKS_CREATE,
    displayName: 'Create Tasks',
    description: 'Create new tasks in projects',
    category: PermissionCategory.PROJECTS,
    dependencies: [Permission.TASKS_VIEW]
  },
  [Permission.TASKS_EDIT]: {
    name: Permission.TASKS_EDIT,
    displayName: 'Edit Tasks',
    description: 'Modify task details and status',
    category: PermissionCategory.PROJECTS,
    dependencies: [Permission.TASKS_VIEW]
  },
  [Permission.TASKS_DELETE]: {
    name: Permission.TASKS_DELETE,
    displayName: 'Delete Tasks',
    description: 'Delete tasks from projects',
    category: PermissionCategory.PROJECTS,
    dependencies: [Permission.TASKS_VIEW]
  },
  [Permission.TASKS_ASSIGN]: {
    name: Permission.TASKS_ASSIGN,
    displayName: 'Assign Tasks',
    description: 'Assign tasks to project members',
    category: PermissionCategory.PROJECTS,
    dependencies: [Permission.TASKS_EDIT, Permission.PROJECT_MEMBERS_VIEW]
  },
  [Permission.TASKS_MANAGE]: {
    name: Permission.TASKS_MANAGE,
    displayName: 'Manage Tasks',
    description: 'Full task management access',
    category: PermissionCategory.PROJECTS,
    dependencies: [Permission.TASKS_VIEW, Permission.TASKS_EDIT, Permission.TASKS_ASSIGN]
  },

  [Permission.DOCUMENTS_VIEW]: {
    name: Permission.DOCUMENTS_VIEW,
    displayName: 'View Documents',
    description: 'View project documents and content',
    category: PermissionCategory.PROJECTS,
    dependencies: [Permission.PROJECTS_VIEW]
  },
  [Permission.DOCUMENTS_CREATE]: {
    name: Permission.DOCUMENTS_CREATE,
    displayName: 'Create Documents',
    description: 'Create new documents in projects',
    category: PermissionCategory.PROJECTS,
    dependencies: [Permission.DOCUMENTS_VIEW]
  },
  [Permission.DOCUMENTS_EDIT]: {
    name: Permission.DOCUMENTS_EDIT,
    displayName: 'Edit Documents',
    description: 'Modify document content and properties',
    category: PermissionCategory.PROJECTS,
    dependencies: [Permission.DOCUMENTS_VIEW]
  },
  [Permission.DOCUMENTS_DELETE]: {
    name: Permission.DOCUMENTS_DELETE,
    displayName: 'Delete Documents',
    description: 'Delete documents from projects',
    category: PermissionCategory.PROJECTS,
    dependencies: [Permission.DOCUMENTS_VIEW]
  },
  [Permission.DOCUMENTS_SHARE]: {
    name: Permission.DOCUMENTS_SHARE,
    displayName: 'Share Documents',
    description: 'Share documents with external users',
    category: PermissionCategory.PROJECTS,
    dependencies: [Permission.DOCUMENTS_VIEW]
  },
  [Permission.DOCUMENTS_MANAGE]: {
    name: Permission.DOCUMENTS_MANAGE,
    displayName: 'Manage Documents',
    description: 'Full document management access',
    category: PermissionCategory.PROJECTS,
    dependencies: [Permission.DOCUMENTS_VIEW, Permission.DOCUMENTS_EDIT, Permission.DOCUMENTS_SHARE]
  },

  [Permission.COLUMNS_VIEW]: {
    name: Permission.COLUMNS_VIEW,
    displayName: 'View Columns',
    description: 'View project board columns',
    category: PermissionCategory.PROJECTS,
    dependencies: [Permission.PROJECTS_VIEW]
  },
  [Permission.COLUMNS_CREATE]: {
    name: Permission.COLUMNS_CREATE,
    displayName: 'Create Columns',
    description: 'Create new project board columns',
    category: PermissionCategory.PROJECTS,
    dependencies: [Permission.COLUMNS_VIEW]
  },
  [Permission.COLUMNS_EDIT]: {
    name: Permission.COLUMNS_EDIT,
    displayName: 'Edit Columns',
    description: 'Modify project board columns',
    category: PermissionCategory.PROJECTS,
    dependencies: [Permission.COLUMNS_VIEW]
  },
  [Permission.COLUMNS_DELETE]: {
    name: Permission.COLUMNS_DELETE,
    displayName: 'Delete Columns',
    description: 'Remove project board columns',
    category: PermissionCategory.PROJECTS,
    dependencies: [Permission.COLUMNS_VIEW]
  }
}

// ============= UTILITY FUNCTIONS =============

/**
 * Get all permissions as an array
 */
export function getAllPermissions(): PermissionDefinition[] {
  return Object.values(PERMISSION_DEFINITIONS)
}

/**
 * Get permissions in API format for role management UI
 * Converts static permissions to the format expected by role API
 */
export function getPermissionsForAPI(): Array<{
  id: string
  name: string
  resource: string
  action: string
  category: string
  description?: string
  dependencies?: string[]
  conflictsWith?: string[]
  isSystemPermission: boolean
}> {
  return getAllPermissions().map(permission => {
    const [resource, action] = permission.name.split('.')
    return {
      id: permission.name,
      name: permission.displayName,
      resource,
      action,
      category: permission.category,
      description: permission.description,
      dependencies: permission.dependencies?.map(dep => dep.toString()) || [],
      conflictsWith: permission.conflictsWith?.map(conf => conf.toString()) || [],
      isSystemPermission: true // All our permissions are system permissions
    }
  })
}