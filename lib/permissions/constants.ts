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
  PROJECTS = 'Projects',
}

export enum Permission {
  WORKSPACE_VIEW = 'workspace.view',
  WORKSPACE_EDIT = 'workspace.edit',
  WORKSPACE_DELETE = 'workspace.delete',
  WORKSPACE_INVITE = 'workspace.invite',

  ACTIVITIES_VIEW = 'activities.view',
  NOTIFICATIONS_VIEW = 'notifications.view',
  NOTIFICATIONS_MANAGE = 'notifications.manage',
  SETTINGS_VIEW = 'settings.view',
  SETTINGS_EDIT = 'settings.edit',

  LEADS_VIEW = 'leads.view',
  LEADS_CREATE = 'leads.create',
  LEADS_EDIT = 'leads.edit',
  LEADS_DELETE = 'leads.delete',
  LEADS_ASSIGN = 'leads.assign',
  LEADS_EXPORT = 'leads.export',
  LEADS_CONVERT = 'leads.convert',

  CONTACTS_VIEW = 'contacts.view',
  CONTACTS_CREATE = 'contacts.create',
  CONTACTS_EDIT = 'contacts.edit',
  CONTACTS_DELETE = 'contacts.delete',
  CONTACTS_EXPORT = 'contacts.export',

  LEAD_NOTES_VIEW = 'lead_notes.view',
  LEAD_NOTES_CREATE = 'lead_notes.create',
  LEAD_NOTES_EDIT = 'lead_notes.edit',
  LEAD_NOTES_DELETE = 'lead_notes.delete',

  LEAD_ACTIVITIES_VIEW = 'lead_activities.view',

  LEAD_STATUSES_VIEW = 'lead_statuses.view',
  LEAD_STATUSES_CREATE = 'lead_statuses.create',
  LEAD_STATUSES_EDIT = 'lead_statuses.edit',
  LEAD_STATUSES_DELETE = 'lead_statuses.delete',

  TAGS_VIEW = 'tags.view',
  TAGS_CREATE = 'tags.create',
  TAGS_EDIT = 'tags.edit',
  TAGS_DELETE = 'tags.delete',

  USERS_VIEW = 'users.view',
  USERS_CREATE = 'users.create',
  USERS_EDIT = 'users.edit',
  USERS_DELETE = 'users.delete',

  MEMBERS_VIEW = 'members.view',
  MEMBERS_INVITE = 'members.invite',
  MEMBERS_EDIT = 'members.edit',
  MEMBERS_REMOVE = 'members.remove',

  ROLES_VIEW = 'roles.view',
  ROLES_CREATE = 'roles.create',
  ROLES_EDIT = 'roles.edit',
  ROLES_DELETE = 'roles.delete',

  PERMISSIONS_VIEW = 'permissions.view',

  BILLING_VIEW = 'billing.view',
  BILLING_EDIT = 'billing.edit',

  INVITATIONS_VIEW = 'invitations.view',
  INVITATIONS_CREATE = 'invitations.create',
  INVITATIONS_CANCEL = 'invitations.cancel',

  CHAT_VIEW = 'chat.view',
  CHAT_SEND = 'chat.send',
  CHAT_CREATE_ROOM = 'chat.create_room',
  CHAT_MANAGE_ROOM = 'chat.manage_room',
  CHAT_DELETE_MESSAGES = 'chat.delete_messages',
  CHAT_UPLOAD_FILES = 'chat.upload_files',
  CHAT_MODERATE = 'chat.moderate',

  ANALYTICS_VIEW = 'analytics.view',
  REPORTS_VIEW = 'reports.view',
  REPORTS_EXPORT = 'reports.export',

  WEBHOOKS_VIEW = 'webhooks.view',
  WEBHOOKS_CREATE = 'webhooks.create',
  WEBHOOKS_EDIT = 'webhooks.edit',
  WEBHOOKS_DELETE = 'webhooks.delete',

  PROJECTS_VIEW = 'projects.view',
  PROJECTS_CREATE = 'projects.create',
  PROJECTS_EDIT = 'projects.edit',
  PROJECTS_DELETE = 'projects.delete',
  PROJECTS_MANAGE = 'projects.manage',

  PROJECT_MEMBERS_VIEW = 'project_members.view',
  PROJECT_MEMBERS_INVITE = 'project_members.invite',
  PROJECT_MEMBERS_EDIT = 'project_members.edit',
  PROJECT_MEMBERS_REMOVE = 'project_members.remove',
  PROJECT_MEMBERS_MANAGE = 'project_members.manage',

  TASKS_VIEW = 'tasks.view',
  TASKS_CREATE = 'tasks.create',
  TASKS_EDIT = 'tasks.edit',
  TASKS_DELETE = 'tasks.delete',
  TASKS_ASSIGN = 'tasks.assign',
  TASKS_MANAGE = 'tasks.manage',

  DOCUMENTS_VIEW = 'documents.view',
  DOCUMENTS_CREATE = 'documents.create',
  DOCUMENTS_EDIT = 'documents.edit',
  DOCUMENTS_DELETE = 'documents.delete',
  DOCUMENTS_SHARE = 'documents.share',
  DOCUMENTS_MANAGE = 'documents.manage',

  COLUMNS_VIEW = 'columns.view',
  COLUMNS_CREATE = 'columns.create',
  COLUMNS_EDIT = 'columns.edit',
  COLUMNS_DELETE = 'columns.delete',

  DEALS_VIEW = 'deals.view',
  DEALS_CREATE = 'deals.create',
  DEALS_EDIT = 'deals.edit',
  DEALS_DELETE = 'deals.delete',
  INVOICES_VIEW = 'invoices.view',
  INVOICES_CREATE = 'invoices.create',
  INVOICES_EDIT = 'invoices.edit',
  INVOICES_DELETE = 'invoices.delete',
  QUOTATIONS_VIEW = 'quotations.view',
  QUOTATIONS_CREATE = 'quotations.create',
  QUOTATIONS_EDIT = 'quotations.edit',
  QUOTATIONS_DELETE = 'quotations.delete',
  PRODUCTS_VIEW = 'products.view',
  PRODUCTS_CREATE = 'products.create',
  PRODUCTS_EDIT = 'products.edit',
  PRODUCTS_DELETE = 'products.delete',
  CALENDAR_VIEW = 'calendar.view',
  CALENDAR_CREATE = 'calendar.create',
  CALENDAR_EDIT = 'calendar.edit',
  CALENDAR_DELETE = 'calendar.delete',
  MEETINGS_VIEW = 'meetings.view',
  MEETINGS_CREATE = 'meetings.create',
  MEETINGS_EDIT = 'meetings.edit',
  MEETINGS_DELETE = 'meetings.delete',
  COMMENTS_VIEW = 'comments.view',
  COMMENTS_CREATE = 'comments.create',
  COMMENTS_EDIT = 'comments.edit',
  COMMENTS_DELETE = 'comments.delete',
  CAMPAIGNS_VIEW = 'campaigns.view',
  CAMPAIGNS_CREATE = 'campaigns.create',
  CAMPAIGNS_EDIT = 'campaigns.edit',
  CAMPAIGNS_DELETE = 'campaigns.delete',
  SOCIAL_VIEW = 'social.view',
  SOCIAL_CREATE = 'social.create',
  SOCIAL_EDIT = 'social.edit',
  SOCIAL_DELETE = 'social.delete',
  CHAT_CREATE = 'chat.create',
  CHAT_EDIT = 'chat.edit',
  CHAT_DELETE = 'chat.delete',
  HR_VIEW = 'hr.view',
  HR_CREATE = 'hr.create',
  HR_EDIT = 'hr.edit',
  HR_DELETE = 'hr.delete',
  COMPLIANCE_VIEW = 'compliance.view',
  COMPLIANCE_CREATE = 'compliance.create',
  COMPLIANCE_EDIT = 'compliance.edit',
  COMPLIANCE_DELETE = 'compliance.delete',
  NOTIFICATIONS_CREATE = 'notifications.create',
  NOTIFICATIONS_DELETE = 'notifications.delete',
  SETTINGS_MANAGE = 'settings.manage',
  FMCG_PRODUCTS_VIEW = 'fmcg.products.view',
  FMCG_BATCHES_VIEW = 'fmcg.batches.view',
}

export const PERMISSION_DEFINITIONS: Record<Permission, PermissionDefinition> =
  {
    [Permission.WORKSPACE_VIEW]: {
      name: Permission.WORKSPACE_VIEW,
      displayName: 'View Workspace',
      description: 'View workspace information and settings',
      category: PermissionCategory.CORE,
    },
    [Permission.WORKSPACE_EDIT]: {
      name: Permission.WORKSPACE_EDIT,
      displayName: 'Edit Workspace',
      description: 'Modify workspace settings and configuration',
      category: PermissionCategory.ADMIN,
      dependencies: [Permission.WORKSPACE_VIEW],
    },
    [Permission.WORKSPACE_DELETE]: {
      name: Permission.WORKSPACE_DELETE,
      displayName: 'Delete Workspace',
      description: 'Delete the entire workspace',
      category: PermissionCategory.ADMIN,
      dependencies: [Permission.WORKSPACE_VIEW],
    },
    [Permission.WORKSPACE_INVITE]: {
      name: Permission.WORKSPACE_INVITE,
      displayName: 'Invite to Workspace',
      description: 'Send invitations to join the workspace',
      category: PermissionCategory.ADMIN,
      dependencies: [Permission.WORKSPACE_VIEW],
    },
    [Permission.ACTIVITIES_VIEW]: {
      name: Permission.ACTIVITIES_VIEW,
      displayName: 'View Activities',
      description: 'View activity logs and history',
      category: PermissionCategory.CORE,
    },
    [Permission.NOTIFICATIONS_VIEW]: {
      name: Permission.NOTIFICATIONS_VIEW,
      displayName: 'View Notifications',
      description: 'View system notifications',
      category: PermissionCategory.CORE,
    },
    [Permission.NOTIFICATIONS_MANAGE]: {
      name: Permission.NOTIFICATIONS_MANAGE,
      displayName: 'Manage Notifications',
      description: 'Configure notification settings',
      category: PermissionCategory.CORE,
      dependencies: [Permission.NOTIFICATIONS_VIEW],
    },
    [Permission.SETTINGS_VIEW]: {
      name: Permission.SETTINGS_VIEW,
      displayName: 'View Settings',
      description: 'View application settings and preferences',
      category: PermissionCategory.CORE,
    },
    [Permission.SETTINGS_EDIT]: {
      name: Permission.SETTINGS_EDIT,
      displayName: 'Edit Settings',
      description: 'Modify application settings and preferences',
      category: PermissionCategory.ADMIN,
      dependencies: [Permission.SETTINGS_VIEW],
    },

    // ============= SALES PERMISSIONS =============
    [Permission.LEADS_VIEW]: {
      name: Permission.LEADS_VIEW,
      displayName: 'View Leads',
      description: 'View lead information and details',
      category: PermissionCategory.SALES,
    },
    [Permission.LEADS_CREATE]: {
      name: Permission.LEADS_CREATE,
      displayName: 'Create Leads',
      description: 'Create new leads in the system',
      category: PermissionCategory.SALES,
      dependencies: [Permission.LEADS_VIEW],
    },
    [Permission.LEADS_EDIT]: {
      name: Permission.LEADS_EDIT,
      displayName: 'Edit Leads',
      description: 'Modify existing lead information',
      category: PermissionCategory.SALES,
      dependencies: [Permission.LEADS_VIEW],
    },
    [Permission.LEADS_DELETE]: {
      name: Permission.LEADS_DELETE,
      displayName: 'Delete Leads',
      description: 'Remove leads from the system',
      category: PermissionCategory.SALES,
      dependencies: [Permission.LEADS_VIEW],
    },
    [Permission.LEADS_ASSIGN]: {
      name: Permission.LEADS_ASSIGN,
      displayName: 'Assign Leads',
      description: 'Assign leads to team members',
      category: PermissionCategory.SALES,
      dependencies: [Permission.LEADS_VIEW, Permission.MEMBERS_VIEW],
    },
    [Permission.LEADS_EXPORT]: {
      name: Permission.LEADS_EXPORT,
      displayName: 'Export Leads',
      description: 'Export lead data to external formats',
      category: PermissionCategory.SALES,
      dependencies: [Permission.LEADS_VIEW],
    },
    [Permission.LEADS_CONVERT]: {
      name: Permission.LEADS_CONVERT,
      displayName: 'Convert Leads',
      description: 'Convert leads to contacts',
      category: PermissionCategory.SALES,
      dependencies: [Permission.LEADS_VIEW, Permission.CONTACTS_CREATE],
    },

    [Permission.CONTACTS_VIEW]: {
      name: Permission.CONTACTS_VIEW,
      displayName: 'View Contacts',
      description: 'View contact information and details',
      category: PermissionCategory.SALES,
    },
    [Permission.CONTACTS_CREATE]: {
      name: Permission.CONTACTS_CREATE,
      displayName: 'Create Contacts',
      description: 'Create new contacts in the system',
      category: PermissionCategory.SALES,
      dependencies: [Permission.CONTACTS_VIEW],
    },
    [Permission.CONTACTS_EDIT]: {
      name: Permission.CONTACTS_EDIT,
      displayName: 'Edit Contacts',
      description: 'Modify existing contact information',
      category: PermissionCategory.SALES,
      dependencies: [Permission.CONTACTS_VIEW],
    },
    [Permission.CONTACTS_DELETE]: {
      name: Permission.CONTACTS_DELETE,
      displayName: 'Delete Contacts',
      description: 'Remove contacts from the system',
      category: PermissionCategory.SALES,
      dependencies: [Permission.CONTACTS_VIEW],
    },
    [Permission.CONTACTS_EXPORT]: {
      name: Permission.CONTACTS_EXPORT,
      displayName: 'Export Contacts',
      description: 'Export contact data to external formats',
      category: PermissionCategory.SALES,
      dependencies: [Permission.CONTACTS_VIEW],
    },

    [Permission.LEAD_NOTES_VIEW]: {
      name: Permission.LEAD_NOTES_VIEW,
      displayName: 'View Lead Notes',
      description: 'View notes and comments on leads',
      category: PermissionCategory.SALES,
      dependencies: [Permission.LEADS_VIEW],
    },
    [Permission.LEAD_NOTES_CREATE]: {
      name: Permission.LEAD_NOTES_CREATE,
      displayName: 'Create Lead Notes',
      description: 'Add notes and comments to leads',
      category: PermissionCategory.SALES,
      dependencies: [Permission.LEAD_NOTES_VIEW],
    },
    [Permission.LEAD_NOTES_EDIT]: {
      name: Permission.LEAD_NOTES_EDIT,
      displayName: 'Edit Lead Notes',
      description: 'Modify existing lead notes',
      category: PermissionCategory.SALES,
      dependencies: [Permission.LEAD_NOTES_VIEW],
    },
    [Permission.LEAD_NOTES_DELETE]: {
      name: Permission.LEAD_NOTES_DELETE,
      displayName: 'Delete Lead Notes',
      description: 'Remove lead notes',
      category: PermissionCategory.SALES,
      dependencies: [Permission.LEAD_NOTES_VIEW],
    },

    [Permission.LEAD_ACTIVITIES_VIEW]: {
      name: Permission.LEAD_ACTIVITIES_VIEW,
      displayName: 'View Lead Activities',
      description: 'View activity history for leads',
      category: PermissionCategory.SALES,
      dependencies: [Permission.LEADS_VIEW],
    },

    // Lead Statuses
    [Permission.LEAD_STATUSES_VIEW]: {
      name: Permission.LEAD_STATUSES_VIEW,
      displayName: 'View Lead Statuses',
      description: 'View available lead status options',
      category: PermissionCategory.SALES,
    },
    [Permission.LEAD_STATUSES_CREATE]: {
      name: Permission.LEAD_STATUSES_CREATE,
      displayName: 'Create Lead Statuses',
      description: 'Create new lead status options',
      category: PermissionCategory.ADMIN,
      dependencies: [Permission.LEAD_STATUSES_VIEW],
    },
    [Permission.LEAD_STATUSES_EDIT]: {
      name: Permission.LEAD_STATUSES_EDIT,
      displayName: 'Edit Lead Statuses',
      description: 'Modify existing lead status options',
      category: PermissionCategory.ADMIN,
      dependencies: [Permission.LEAD_STATUSES_VIEW],
    },
    [Permission.LEAD_STATUSES_DELETE]: {
      name: Permission.LEAD_STATUSES_DELETE,
      displayName: 'Delete Lead Statuses',
      description: 'Remove lead status options',
      category: PermissionCategory.ADMIN,
      dependencies: [Permission.LEAD_STATUSES_VIEW],
    },

    // Tags
    [Permission.TAGS_VIEW]: {
      name: Permission.TAGS_VIEW,
      displayName: 'View Tags',
      description: 'View available tags for organizing data',
      category: PermissionCategory.CORE,
    },
    [Permission.TAGS_CREATE]: {
      name: Permission.TAGS_CREATE,
      displayName: 'Create Tags',
      description: 'Create new tags for organizing data',
      category: PermissionCategory.CORE,
      dependencies: [Permission.TAGS_VIEW],
    },
    [Permission.TAGS_EDIT]: {
      name: Permission.TAGS_EDIT,
      displayName: 'Edit Tags',
      description: 'Modify existing tags',
      category: PermissionCategory.CORE,
      dependencies: [Permission.TAGS_VIEW],
    },
    [Permission.TAGS_DELETE]: {
      name: Permission.TAGS_DELETE,
      displayName: 'Delete Tags',
      description: 'Remove tags from the system',
      category: PermissionCategory.CORE,
      dependencies: [Permission.TAGS_VIEW],
    },

    // ============= ADMIN PERMISSIONS =============
    [Permission.USERS_VIEW]: {
      name: Permission.USERS_VIEW,
      displayName: 'View Users',
      description: 'View user profiles and information',
      category: PermissionCategory.ADMIN,
    },
    [Permission.USERS_CREATE]: {
      name: Permission.USERS_CREATE,
      displayName: 'Create Users',
      description: 'Create new user accounts',
      category: PermissionCategory.ADMIN,
      dependencies: [Permission.USERS_VIEW],
    },
    [Permission.USERS_EDIT]: {
      name: Permission.USERS_EDIT,
      displayName: 'Edit Users',
      description: 'Modify user account information',
      category: PermissionCategory.ADMIN,
      dependencies: [Permission.USERS_VIEW],
    },
    [Permission.USERS_DELETE]: {
      name: Permission.USERS_DELETE,
      displayName: 'Delete Users',
      description: 'Remove user accounts from the system',
      category: PermissionCategory.ADMIN,
      dependencies: [Permission.USERS_VIEW],
    },

    [Permission.MEMBERS_VIEW]: {
      name: Permission.MEMBERS_VIEW,
      displayName: 'View Members',
      description: 'View workspace member list and details',
      category: PermissionCategory.ADMIN,
    },
    [Permission.MEMBERS_INVITE]: {
      name: Permission.MEMBERS_INVITE,
      displayName: 'Invite Members',
      description: 'Send invitations to new members',
      category: PermissionCategory.ADMIN,
      dependencies: [Permission.MEMBERS_VIEW],
    },
    [Permission.MEMBERS_EDIT]: {
      name: Permission.MEMBERS_EDIT,
      displayName: 'Edit Members',
      description: 'Modify member roles and permissions',
      category: PermissionCategory.ADMIN,
      dependencies: [Permission.MEMBERS_VIEW],
    },
    [Permission.MEMBERS_REMOVE]: {
      name: Permission.MEMBERS_REMOVE,
      displayName: 'Remove Members',
      description: 'Remove members from the workspace',
      category: PermissionCategory.ADMIN,
      dependencies: [Permission.MEMBERS_VIEW],
    },

    [Permission.ROLES_VIEW]: {
      name: Permission.ROLES_VIEW,
      displayName: 'View Roles',
      description: 'View role definitions and permissions',
      category: PermissionCategory.ADMIN,
    },
    [Permission.ROLES_CREATE]: {
      name: Permission.ROLES_CREATE,
      displayName: 'Create Roles',
      description: 'Create new custom roles',
      category: PermissionCategory.ADMIN,
      dependencies: [Permission.ROLES_VIEW],
    },
    [Permission.ROLES_EDIT]: {
      name: Permission.ROLES_EDIT,
      displayName: 'Edit Roles',
      description: 'Modify existing role permissions',
      category: PermissionCategory.ADMIN,
      dependencies: [Permission.ROLES_VIEW],
    },
    [Permission.ROLES_DELETE]: {
      name: Permission.ROLES_DELETE,
      displayName: 'Delete Roles',
      description: 'Remove custom roles from the system',
      category: PermissionCategory.ADMIN,
      dependencies: [Permission.ROLES_VIEW],
    },

    [Permission.PERMISSIONS_VIEW]: {
      name: Permission.PERMISSIONS_VIEW,
      displayName: 'View Permissions',
      description: 'View available permissions (read-only)',
      category: PermissionCategory.ADMIN,
    },

    [Permission.BILLING_VIEW]: {
      name: Permission.BILLING_VIEW,
      displayName: 'View Billing',
      description: 'View billing information and subscription details',
      category: PermissionCategory.ADMIN,
    },
    [Permission.BILLING_EDIT]: {
      name: Permission.BILLING_EDIT,
      displayName: 'Edit Billing',
      description: 'Modify billing settings and subscription',
      category: PermissionCategory.ADMIN,
      dependencies: [Permission.BILLING_VIEW],
    },

    [Permission.INVITATIONS_VIEW]: {
      name: Permission.INVITATIONS_VIEW,
      displayName: 'View Invitations',
      description: 'View pending workspace invitations',
      category: PermissionCategory.ADMIN,
    },
    [Permission.INVITATIONS_CREATE]: {
      name: Permission.INVITATIONS_CREATE,
      displayName: 'Create Invitations',
      description: 'Send workspace invitations',
      category: PermissionCategory.ADMIN,
      dependencies: [Permission.INVITATIONS_VIEW],
    },
    [Permission.INVITATIONS_CANCEL]: {
      name: Permission.INVITATIONS_CANCEL,
      displayName: 'Cancel Invitations',
      description: 'Cancel pending invitations',
      category: PermissionCategory.ADMIN,
      dependencies: [Permission.INVITATIONS_VIEW],
    },

    [Permission.CHAT_VIEW]: {
      name: Permission.CHAT_VIEW,
      displayName: 'View Chat',
      description: 'Access chat rooms and view messages',
      category: PermissionCategory.COMMUNICATION,
    },
    [Permission.CHAT_SEND]: {
      name: Permission.CHAT_SEND,
      displayName: 'Send Messages',
      description: 'Send messages in chat rooms',
      category: PermissionCategory.COMMUNICATION,
      dependencies: [Permission.CHAT_VIEW],
    },
    [Permission.CHAT_CREATE_ROOM]: {
      name: Permission.CHAT_CREATE_ROOM,
      displayName: 'Create Chat Rooms',
      description: 'Create new chat rooms',
      category: PermissionCategory.COMMUNICATION,
      dependencies: [Permission.CHAT_VIEW],
    },
    [Permission.CHAT_MANAGE_ROOM]: {
      name: Permission.CHAT_MANAGE_ROOM,
      displayName: 'Manage Chat Rooms',
      description: 'Edit room settings, add/remove members',
      category: PermissionCategory.COMMUNICATION,
      dependencies: [Permission.CHAT_VIEW],
    },
    [Permission.CHAT_DELETE_MESSAGES]: {
      name: Permission.CHAT_DELETE_MESSAGES,
      displayName: 'Delete Messages',
      description: 'Delete messages from chat rooms',
      category: PermissionCategory.COMMUNICATION,
      dependencies: [Permission.CHAT_VIEW],
    },
    [Permission.CHAT_UPLOAD_FILES]: {
      name: Permission.CHAT_UPLOAD_FILES,
      displayName: 'Upload Files',
      description: 'Upload files and attachments to chat',
      category: PermissionCategory.COMMUNICATION,
      dependencies: [Permission.CHAT_SEND],
    },
    [Permission.CHAT_MODERATE]: {
      name: Permission.CHAT_MODERATE,
      displayName: 'Moderate Chat',
      description: 'Moderate chat rooms and manage user behavior',
      category: PermissionCategory.COMMUNICATION,
      dependencies: [Permission.CHAT_VIEW, Permission.CHAT_DELETE_MESSAGES],
    },

    [Permission.ANALYTICS_VIEW]: {
      name: Permission.ANALYTICS_VIEW,
      displayName: 'View Analytics',
      description: 'Access analytics dashboard and reports',
      category: PermissionCategory.ANALYTICS,
    },
    [Permission.REPORTS_VIEW]: {
      name: Permission.REPORTS_VIEW,
      displayName: 'View Reports',
      description: 'Access detailed reporting features',
      category: PermissionCategory.ANALYTICS,
    },
    [Permission.REPORTS_EXPORT]: {
      name: Permission.REPORTS_EXPORT,
      displayName: 'Export Reports',
      description: 'Export reports to external formats',
      category: PermissionCategory.ANALYTICS,
      dependencies: [Permission.REPORTS_VIEW],
    },

    [Permission.WEBHOOKS_VIEW]: {
      name: Permission.WEBHOOKS_VIEW,
      displayName: 'View Webhooks',
      description: 'View webhook configurations and logs',
      category: PermissionCategory.INTEGRATION,
    },
    [Permission.WEBHOOKS_CREATE]: {
      name: Permission.WEBHOOKS_CREATE,
      displayName: 'Create Webhooks',
      description: 'Create new webhook endpoints',
      category: PermissionCategory.INTEGRATION,
      dependencies: [Permission.WEBHOOKS_VIEW],
    },
    [Permission.WEBHOOKS_EDIT]: {
      name: Permission.WEBHOOKS_EDIT,
      displayName: 'Edit Webhooks',
      description: 'Modify webhook configurations',
      category: PermissionCategory.INTEGRATION,
      dependencies: [Permission.WEBHOOKS_VIEW],
    },
    [Permission.WEBHOOKS_DELETE]: {
      name: Permission.WEBHOOKS_DELETE,
      displayName: 'Delete Webhooks',
      description: 'Remove webhook endpoints',
      category: PermissionCategory.INTEGRATION,
      dependencies: [Permission.WEBHOOKS_VIEW],
    },

    // ============= PROJECTS PERMISSIONS =============
    [Permission.PROJECTS_VIEW]: {
      name: Permission.PROJECTS_VIEW,
      displayName: 'View Projects',
      description: 'View projects and their details',
      category: PermissionCategory.PROJECTS,
    },
    [Permission.PROJECTS_CREATE]: {
      name: Permission.PROJECTS_CREATE,
      displayName: 'Create Projects',
      description: 'Create new projects',
      category: PermissionCategory.PROJECTS,
      dependencies: [Permission.PROJECTS_VIEW],
    },
    [Permission.PROJECTS_EDIT]: {
      name: Permission.PROJECTS_EDIT,
      displayName: 'Edit Projects',
      description: 'Modify project details and settings',
      category: PermissionCategory.PROJECTS,
      dependencies: [Permission.PROJECTS_VIEW],
    },
    [Permission.PROJECTS_DELETE]: {
      name: Permission.PROJECTS_DELETE,
      displayName: 'Delete Projects',
      description: 'Delete projects and all associated data',
      category: PermissionCategory.PROJECTS,
      dependencies: [Permission.PROJECTS_VIEW],
    },
    [Permission.PROJECTS_MANAGE]: {
      name: Permission.PROJECTS_MANAGE,
      displayName: 'Manage Projects',
      description: 'Full project management access',
      category: PermissionCategory.PROJECTS,
      dependencies: [Permission.PROJECTS_VIEW, Permission.PROJECTS_EDIT],
    },

    [Permission.PROJECT_MEMBERS_VIEW]: {
      name: Permission.PROJECT_MEMBERS_VIEW,
      displayName: 'View Project Members',
      description: 'View project member list and roles',
      category: PermissionCategory.PROJECTS,
      dependencies: [Permission.PROJECTS_VIEW],
    },
    [Permission.PROJECT_MEMBERS_INVITE]: {
      name: Permission.PROJECT_MEMBERS_INVITE,
      displayName: 'Invite Project Members',
      description: 'Send invitations to join projects',
      category: PermissionCategory.PROJECTS,
      dependencies: [Permission.PROJECT_MEMBERS_VIEW],
    },
    [Permission.PROJECT_MEMBERS_EDIT]: {
      name: Permission.PROJECT_MEMBERS_EDIT,
      displayName: 'Edit Project Members',
      description: 'Modify project member roles and permissions',
      category: PermissionCategory.PROJECTS,
      dependencies: [Permission.PROJECT_MEMBERS_VIEW],
    },
    [Permission.PROJECT_MEMBERS_REMOVE]: {
      name: Permission.PROJECT_MEMBERS_REMOVE,
      displayName: 'Remove Project Members',
      description: 'Remove members from projects',
      category: PermissionCategory.PROJECTS,
      dependencies: [Permission.PROJECT_MEMBERS_VIEW],
    },
    [Permission.PROJECT_MEMBERS_MANAGE]: {
      name: Permission.PROJECT_MEMBERS_MANAGE,
      displayName: 'Manage Project Members',
      description: 'Full project member management',
      category: PermissionCategory.PROJECTS,
      dependencies: [
        Permission.PROJECT_MEMBERS_VIEW,
        Permission.PROJECT_MEMBERS_INVITE,
        Permission.PROJECT_MEMBERS_REMOVE,
      ],
    },

    [Permission.TASKS_VIEW]: {
      name: Permission.TASKS_VIEW,
      displayName: 'View Tasks',
      description: 'View tasks and their details',
      category: PermissionCategory.PROJECTS,
      dependencies: [Permission.PROJECTS_VIEW],
    },
    [Permission.TASKS_CREATE]: {
      name: Permission.TASKS_CREATE,
      displayName: 'Create Tasks',
      description: 'Create new tasks in projects',
      category: PermissionCategory.PROJECTS,
      dependencies: [Permission.TASKS_VIEW],
    },
    [Permission.TASKS_EDIT]: {
      name: Permission.TASKS_EDIT,
      displayName: 'Edit Tasks',
      description: 'Modify task details and status',
      category: PermissionCategory.PROJECTS,
      dependencies: [Permission.TASKS_VIEW],
    },
    [Permission.TASKS_DELETE]: {
      name: Permission.TASKS_DELETE,
      displayName: 'Delete Tasks',
      description: 'Delete tasks from projects',
      category: PermissionCategory.PROJECTS,
      dependencies: [Permission.TASKS_VIEW],
    },
    [Permission.TASKS_ASSIGN]: {
      name: Permission.TASKS_ASSIGN,
      displayName: 'Assign Tasks',
      description: 'Assign tasks to project members',
      category: PermissionCategory.PROJECTS,
      dependencies: [Permission.TASKS_EDIT, Permission.PROJECT_MEMBERS_VIEW],
    },
    [Permission.TASKS_MANAGE]: {
      name: Permission.TASKS_MANAGE,
      displayName: 'Manage Tasks',
      description: 'Full task management access',
      category: PermissionCategory.PROJECTS,
      dependencies: [
        Permission.TASKS_VIEW,
        Permission.TASKS_EDIT,
        Permission.TASKS_ASSIGN,
      ],
    },

    [Permission.DOCUMENTS_VIEW]: {
      name: Permission.DOCUMENTS_VIEW,
      displayName: 'View Documents',
      description: 'View project documents and content',
      category: PermissionCategory.PROJECTS,
      dependencies: [Permission.PROJECTS_VIEW],
    },
    [Permission.DOCUMENTS_CREATE]: {
      name: Permission.DOCUMENTS_CREATE,
      displayName: 'Create Documents',
      description: 'Create new documents in projects',
      category: PermissionCategory.PROJECTS,
      dependencies: [Permission.DOCUMENTS_VIEW],
    },
    [Permission.DOCUMENTS_EDIT]: {
      name: Permission.DOCUMENTS_EDIT,
      displayName: 'Edit Documents',
      description: 'Modify document content and properties',
      category: PermissionCategory.PROJECTS,
      dependencies: [Permission.DOCUMENTS_VIEW],
    },
    [Permission.DOCUMENTS_DELETE]: {
      name: Permission.DOCUMENTS_DELETE,
      displayName: 'Delete Documents',
      description: 'Delete documents from projects',
      category: PermissionCategory.PROJECTS,
      dependencies: [Permission.DOCUMENTS_VIEW],
    },
    [Permission.DOCUMENTS_SHARE]: {
      name: Permission.DOCUMENTS_SHARE,
      displayName: 'Share Documents',
      description: 'Share documents with external users',
      category: PermissionCategory.PROJECTS,
      dependencies: [Permission.DOCUMENTS_VIEW],
    },
    [Permission.DOCUMENTS_MANAGE]: {
      name: Permission.DOCUMENTS_MANAGE,
      displayName: 'Manage Documents',
      description: 'Full document management access',
      category: PermissionCategory.PROJECTS,
      dependencies: [
        Permission.DOCUMENTS_VIEW,
        Permission.DOCUMENTS_EDIT,
        Permission.DOCUMENTS_SHARE,
      ],
    },

    [Permission.COLUMNS_VIEW]: {
      name: Permission.COLUMNS_VIEW,
      displayName: 'View Columns',
      description: 'View project board columns',
      category: PermissionCategory.PROJECTS,
      dependencies: [Permission.PROJECTS_VIEW],
    },
    [Permission.COLUMNS_CREATE]: {
      name: Permission.COLUMNS_CREATE,
      displayName: 'Create Columns',
      description: 'Create new project board columns',
      category: PermissionCategory.PROJECTS,
      dependencies: [Permission.COLUMNS_VIEW],
    },
    [Permission.COLUMNS_EDIT]: {
      name: Permission.COLUMNS_EDIT,
      displayName: 'Edit Columns',
      description: 'Modify project board columns',
      category: PermissionCategory.PROJECTS,
      dependencies: [Permission.COLUMNS_VIEW],
    },
    [Permission.COLUMNS_DELETE]: {
      name: Permission.COLUMNS_DELETE,
      displayName: 'Delete Columns',
      description: 'Remove project board columns',
      category: PermissionCategory.PROJECTS,
      dependencies: [Permission.COLUMNS_VIEW],
    },    [Permission.DEALS_VIEW]: {
      name: Permission.DEALS_VIEW,
      displayName: 'View Deals',
      description: 'View deals',
      category: PermissionCategory.SALES,
    },
    [Permission.DEALS_CREATE]: {
      name: Permission.DEALS_CREATE,
      displayName: 'Create Deals',
      description: 'Create deals',
      category: PermissionCategory.SALES,
      dependencies: [Permission.DEALS_VIEW],
    },
    [Permission.DEALS_EDIT]: {
      name: Permission.DEALS_EDIT,
      displayName: 'Edit Deals',
      description: 'Modify deals',
      category: PermissionCategory.SALES,
      dependencies: [Permission.DEALS_VIEW],
    },
    [Permission.DEALS_DELETE]: {
      name: Permission.DEALS_DELETE,
      displayName: 'Delete Deals',
      description: 'Remove deals',
      category: PermissionCategory.SALES,
      dependencies: [Permission.DEALS_VIEW],
    },
    [Permission.INVOICES_VIEW]: {
      name: Permission.INVOICES_VIEW,
      displayName: 'View Invoices',
      description: 'View invoices',
      category: PermissionCategory.SALES,
    },
    [Permission.INVOICES_CREATE]: {
      name: Permission.INVOICES_CREATE,
      displayName: 'Create Invoices',
      description: 'Create invoices',
      category: PermissionCategory.SALES,
      dependencies: [Permission.INVOICES_VIEW],
    },
    [Permission.INVOICES_EDIT]: {
      name: Permission.INVOICES_EDIT,
      displayName: 'Edit Invoices',
      description: 'Modify invoices',
      category: PermissionCategory.SALES,
      dependencies: [Permission.INVOICES_VIEW],
    },
    [Permission.INVOICES_DELETE]: {
      name: Permission.INVOICES_DELETE,
      displayName: 'Delete Invoices',
      description: 'Remove invoices',
      category: PermissionCategory.SALES,
      dependencies: [Permission.INVOICES_VIEW],
    },
    [Permission.QUOTATIONS_VIEW]: {
      name: Permission.QUOTATIONS_VIEW,
      displayName: 'View Quotations',
      description: 'View quotations',
      category: PermissionCategory.SALES,
    },
    [Permission.QUOTATIONS_CREATE]: {
      name: Permission.QUOTATIONS_CREATE,
      displayName: 'Create Quotations',
      description: 'Create quotations',
      category: PermissionCategory.SALES,
      dependencies: [Permission.QUOTATIONS_VIEW],
    },
    [Permission.QUOTATIONS_EDIT]: {
      name: Permission.QUOTATIONS_EDIT,
      displayName: 'Edit Quotations',
      description: 'Modify quotations',
      category: PermissionCategory.SALES,
      dependencies: [Permission.QUOTATIONS_VIEW],
    },
    [Permission.QUOTATIONS_DELETE]: {
      name: Permission.QUOTATIONS_DELETE,
      displayName: 'Delete Quotations',
      description: 'Remove quotations',
      category: PermissionCategory.SALES,
      dependencies: [Permission.QUOTATIONS_VIEW],
    },
    [Permission.PRODUCTS_VIEW]: {
      name: Permission.PRODUCTS_VIEW,
      displayName: 'View Products',
      description: 'View products',
      category: PermissionCategory.SALES,
    },
    [Permission.PRODUCTS_CREATE]: {
      name: Permission.PRODUCTS_CREATE,
      displayName: 'Create Products',
      description: 'Create products',
      category: PermissionCategory.SALES,
      dependencies: [Permission.PRODUCTS_VIEW],
    },
    [Permission.PRODUCTS_EDIT]: {
      name: Permission.PRODUCTS_EDIT,
      displayName: 'Edit Products',
      description: 'Modify products',
      category: PermissionCategory.SALES,
      dependencies: [Permission.PRODUCTS_VIEW],
    },
    [Permission.PRODUCTS_DELETE]: {
      name: Permission.PRODUCTS_DELETE,
      displayName: 'Delete Products',
      description: 'Remove products',
      category: PermissionCategory.SALES,
      dependencies: [Permission.PRODUCTS_VIEW],
    },
    [Permission.CALENDAR_VIEW]: {
      name: Permission.CALENDAR_VIEW,
      displayName: 'View Calendar Events',
      description: 'View calendar events',
      category: PermissionCategory.SALES,
    },
    [Permission.CALENDAR_CREATE]: {
      name: Permission.CALENDAR_CREATE,
      displayName: 'Create Calendar Events',
      description: 'Create calendar events',
      category: PermissionCategory.SALES,
      dependencies: [Permission.CALENDAR_VIEW],
    },
    [Permission.CALENDAR_EDIT]: {
      name: Permission.CALENDAR_EDIT,
      displayName: 'Edit Calendar Events',
      description: 'Modify calendar events',
      category: PermissionCategory.SALES,
      dependencies: [Permission.CALENDAR_VIEW],
    },
    [Permission.CALENDAR_DELETE]: {
      name: Permission.CALENDAR_DELETE,
      displayName: 'Delete Calendar Events',
      description: 'Remove calendar events',
      category: PermissionCategory.SALES,
      dependencies: [Permission.CALENDAR_VIEW],
    },
    [Permission.MEETINGS_VIEW]: {
      name: Permission.MEETINGS_VIEW,
      displayName: 'View Meetings',
      description: 'View meetings',
      category: PermissionCategory.PROJECTS,
    },
    [Permission.MEETINGS_CREATE]: {
      name: Permission.MEETINGS_CREATE,
      displayName: 'Create Meetings',
      description: 'Create meetings',
      category: PermissionCategory.PROJECTS,
      dependencies: [Permission.MEETINGS_VIEW],
    },
    [Permission.MEETINGS_EDIT]: {
      name: Permission.MEETINGS_EDIT,
      displayName: 'Edit Meetings',
      description: 'Modify meetings',
      category: PermissionCategory.PROJECTS,
      dependencies: [Permission.MEETINGS_VIEW],
    },
    [Permission.MEETINGS_DELETE]: {
      name: Permission.MEETINGS_DELETE,
      displayName: 'Delete Meetings',
      description: 'Remove meetings',
      category: PermissionCategory.PROJECTS,
      dependencies: [Permission.MEETINGS_VIEW],
    },
    [Permission.COMMENTS_VIEW]: {
      name: Permission.COMMENTS_VIEW,
      displayName: 'View Comments',
      description: 'View comments',
      category: PermissionCategory.PROJECTS,
    },
    [Permission.COMMENTS_CREATE]: {
      name: Permission.COMMENTS_CREATE,
      displayName: 'Create Comments',
      description: 'Create comments',
      category: PermissionCategory.PROJECTS,
      dependencies: [Permission.COMMENTS_VIEW],
    },
    [Permission.COMMENTS_EDIT]: {
      name: Permission.COMMENTS_EDIT,
      displayName: 'Edit Comments',
      description: 'Modify comments',
      category: PermissionCategory.PROJECTS,
      dependencies: [Permission.COMMENTS_VIEW],
    },
    [Permission.COMMENTS_DELETE]: {
      name: Permission.COMMENTS_DELETE,
      displayName: 'Delete Comments',
      description: 'Remove comments',
      category: PermissionCategory.PROJECTS,
      dependencies: [Permission.COMMENTS_VIEW],
    },
    [Permission.CAMPAIGNS_VIEW]: {
      name: Permission.CAMPAIGNS_VIEW,
      displayName: 'View Campaigns',
      description: 'View campaigns',
      category: PermissionCategory.COMMUNICATION,
    },
    [Permission.CAMPAIGNS_CREATE]: {
      name: Permission.CAMPAIGNS_CREATE,
      displayName: 'Create Campaigns',
      description: 'Create campaigns',
      category: PermissionCategory.COMMUNICATION,
      dependencies: [Permission.CAMPAIGNS_VIEW],
    },
    [Permission.CAMPAIGNS_EDIT]: {
      name: Permission.CAMPAIGNS_EDIT,
      displayName: 'Edit Campaigns',
      description: 'Modify campaigns',
      category: PermissionCategory.COMMUNICATION,
      dependencies: [Permission.CAMPAIGNS_VIEW],
    },
    [Permission.CAMPAIGNS_DELETE]: {
      name: Permission.CAMPAIGNS_DELETE,
      displayName: 'Delete Campaigns',
      description: 'Remove campaigns',
      category: PermissionCategory.COMMUNICATION,
      dependencies: [Permission.CAMPAIGNS_VIEW],
    },
    [Permission.SOCIAL_VIEW]: {
      name: Permission.SOCIAL_VIEW,
      displayName: 'View Social Media',
      description: 'View social media',
      category: PermissionCategory.COMMUNICATION,
    },
    [Permission.SOCIAL_CREATE]: {
      name: Permission.SOCIAL_CREATE,
      displayName: 'Create Social Media',
      description: 'Create social media',
      category: PermissionCategory.COMMUNICATION,
      dependencies: [Permission.SOCIAL_VIEW],
    },
    [Permission.SOCIAL_EDIT]: {
      name: Permission.SOCIAL_EDIT,
      displayName: 'Edit Social Media',
      description: 'Modify social media',
      category: PermissionCategory.COMMUNICATION,
      dependencies: [Permission.SOCIAL_VIEW],
    },
    [Permission.SOCIAL_DELETE]: {
      name: Permission.SOCIAL_DELETE,
      displayName: 'Delete Social Media',
      description: 'Remove social media',
      category: PermissionCategory.COMMUNICATION,
      dependencies: [Permission.SOCIAL_VIEW],
    },
    [Permission.CHAT_CREATE]: {
      name: Permission.CHAT_CREATE,
      displayName: 'Create Chat',
      description: 'Create chat',
      category: PermissionCategory.COMMUNICATION,
    },
    [Permission.CHAT_EDIT]: {
      name: Permission.CHAT_EDIT,
      displayName: 'Edit Chat',
      description: 'Modify chat',
      category: PermissionCategory.COMMUNICATION,
    },
    [Permission.CHAT_DELETE]: {
      name: Permission.CHAT_DELETE,
      displayName: 'Delete Chat',
      description: 'Remove chat',
      category: PermissionCategory.COMMUNICATION,
    },
    [Permission.HR_VIEW]: {
      name: Permission.HR_VIEW,
      displayName: 'View HR Records',
      description: 'View hr records',
      category: PermissionCategory.ADMIN,
    },
    [Permission.HR_CREATE]: {
      name: Permission.HR_CREATE,
      displayName: 'Create HR Records',
      description: 'Create hr records',
      category: PermissionCategory.ADMIN,
      dependencies: [Permission.HR_VIEW],
    },
    [Permission.HR_EDIT]: {
      name: Permission.HR_EDIT,
      displayName: 'Edit HR Records',
      description: 'Modify hr records',
      category: PermissionCategory.ADMIN,
      dependencies: [Permission.HR_VIEW],
    },
    [Permission.HR_DELETE]: {
      name: Permission.HR_DELETE,
      displayName: 'Delete HR Records',
      description: 'Remove hr records',
      category: PermissionCategory.ADMIN,
      dependencies: [Permission.HR_VIEW],
    },
    [Permission.COMPLIANCE_VIEW]: {
      name: Permission.COMPLIANCE_VIEW,
      displayName: 'View Compliance',
      description: 'View compliance',
      category: PermissionCategory.ADMIN,
    },
    [Permission.COMPLIANCE_CREATE]: {
      name: Permission.COMPLIANCE_CREATE,
      displayName: 'Create Compliance',
      description: 'Create compliance',
      category: PermissionCategory.ADMIN,
      dependencies: [Permission.COMPLIANCE_VIEW],
    },
    [Permission.COMPLIANCE_EDIT]: {
      name: Permission.COMPLIANCE_EDIT,
      displayName: 'Edit Compliance',
      description: 'Modify compliance',
      category: PermissionCategory.ADMIN,
      dependencies: [Permission.COMPLIANCE_VIEW],
    },
    [Permission.COMPLIANCE_DELETE]: {
      name: Permission.COMPLIANCE_DELETE,
      displayName: 'Delete Compliance',
      description: 'Remove compliance',
      category: PermissionCategory.ADMIN,
      dependencies: [Permission.COMPLIANCE_VIEW],
    },
    [Permission.NOTIFICATIONS_CREATE]: {
      name: Permission.NOTIFICATIONS_CREATE,
      displayName: 'Create Notifications',
      description: 'Create notifications',
      category: PermissionCategory.CORE,
    },
    [Permission.NOTIFICATIONS_DELETE]: {
      name: Permission.NOTIFICATIONS_DELETE,
      displayName: 'Delete Notifications',
      description: 'Remove notifications',
      category: PermissionCategory.CORE,
    },
    [Permission.SETTINGS_MANAGE]: {
      name: Permission.SETTINGS_MANAGE,
      displayName: 'Manage Settings',
      description: 'Manage all settings',
      category: PermissionCategory.ADMIN,
    },
    [Permission.FMCG_PRODUCTS_VIEW]: {
      name: Permission.FMCG_PRODUCTS_VIEW,
      displayName: 'View FMCG Products',
      description: 'View fmcg products',
      category: PermissionCategory.SALES,
    },
    [Permission.FMCG_BATCHES_VIEW]: {
      name: Permission.FMCG_BATCHES_VIEW,
      displayName: 'View FMCG Batches',
      description: 'View fmcg batches',
      category: PermissionCategory.SALES,
    },
  }

export function getAllPermissions(): PermissionDefinition[] {
  return Object.values(PERMISSION_DEFINITIONS)
}

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
      conflictsWith:
        permission.conflictsWith?.map(conf => conf.toString()) || [],
      isSystemPermission: true,
    }
  })
}

export const MODULE_ACTIONS = ['view', 'create', 'edit', 'delete'] as const
export type ModuleAction = (typeof MODULE_ACTIONS)[number]

export interface PermissionModule {
  id: string
  label: string
  actions: Partial<Record<ModuleAction, Permission[]>>
}

export const PERMISSION_MODULES: PermissionModule[] = [
  {
    id: 'leads',
    label: 'Leads',
    actions: {
      view: [
        Permission.LEADS_VIEW,
        Permission.LEAD_ACTIVITIES_VIEW,
        Permission.LEAD_NOTES_VIEW,
        Permission.LEADS_EXPORT,
      ],
      create: [Permission.LEADS_CREATE, Permission.LEAD_NOTES_CREATE],
      edit: [
        Permission.LEADS_EDIT,
        Permission.LEADS_ASSIGN,
        Permission.LEADS_CONVERT,
        Permission.LEAD_NOTES_EDIT,
      ],
      delete: [Permission.LEADS_DELETE, Permission.LEAD_NOTES_DELETE],
    },
  },
  {
    id: 'lead_setup',
    label: 'Lead Statuses & Tags',
    actions: {
      view: [Permission.LEAD_STATUSES_VIEW, Permission.TAGS_VIEW],
      create: [Permission.LEAD_STATUSES_CREATE, Permission.TAGS_CREATE],
      edit: [Permission.LEAD_STATUSES_EDIT, Permission.TAGS_EDIT],
      delete: [Permission.LEAD_STATUSES_DELETE, Permission.TAGS_DELETE],
    },
  },
  {
    id: 'contacts',
    label: 'Contacts',
    actions: {
      view: [Permission.CONTACTS_VIEW, Permission.CONTACTS_EXPORT],
      create: [Permission.CONTACTS_CREATE],
      edit: [Permission.CONTACTS_EDIT],
      delete: [Permission.CONTACTS_DELETE],
    },
  },
  {
    id: 'deals',
    label: 'Deals & Pipelines',
    actions: {
      view: [Permission.DEALS_VIEW],
      create: [Permission.DEALS_CREATE],
      edit: [Permission.DEALS_EDIT],
      delete: [Permission.DEALS_DELETE],
    },
  },
  {
    id: 'invoices',
    label: 'Invoices',
    actions: {
      view: [Permission.INVOICES_VIEW],
      create: [Permission.INVOICES_CREATE],
      edit: [Permission.INVOICES_EDIT],
      delete: [Permission.INVOICES_DELETE],
    },
  },
  {
    id: 'quotations',
    label: 'Quotations',
    actions: {
      view: [Permission.QUOTATIONS_VIEW],
      create: [Permission.QUOTATIONS_CREATE],
      edit: [Permission.QUOTATIONS_EDIT],
      delete: [Permission.QUOTATIONS_DELETE],
    },
  },
  {
    id: 'products',
    label: 'Products & Inventory',
    actions: {
      view: [
        Permission.PRODUCTS_VIEW,
        Permission.FMCG_PRODUCTS_VIEW,
        Permission.FMCG_BATCHES_VIEW,
      ],
      create: [Permission.PRODUCTS_CREATE],
      edit: [Permission.PRODUCTS_EDIT],
      delete: [Permission.PRODUCTS_DELETE],
    },
  },
  {
    id: 'calendar',
    label: 'Appointments, Calendar & Meetings',
    actions: {
      view: [Permission.CALENDAR_VIEW, Permission.MEETINGS_VIEW],
      create: [Permission.CALENDAR_CREATE, Permission.MEETINGS_CREATE],
      edit: [Permission.CALENDAR_EDIT, Permission.MEETINGS_EDIT],
      delete: [Permission.CALENDAR_DELETE, Permission.MEETINGS_DELETE],
    },
  },
  {
    id: 'marketing',
    label: 'Campaigns, Sequences, SMS & Webhooks',
    actions: {
      view: [Permission.CAMPAIGNS_VIEW, Permission.WEBHOOKS_VIEW],
      create: [Permission.CAMPAIGNS_CREATE, Permission.WEBHOOKS_CREATE],
      edit: [Permission.CAMPAIGNS_EDIT, Permission.WEBHOOKS_EDIT],
      delete: [Permission.CAMPAIGNS_DELETE, Permission.WEBHOOKS_DELETE],
    },
  },
  {
    id: 'social',
    label: 'Social Media',
    actions: {
      view: [Permission.SOCIAL_VIEW],
      create: [Permission.SOCIAL_CREATE],
      edit: [Permission.SOCIAL_EDIT],
      delete: [Permission.SOCIAL_DELETE],
    },
  },
  {
    id: 'projects',
    label: 'Projects & Members',
    actions: {
      view: [Permission.PROJECTS_VIEW, Permission.PROJECT_MEMBERS_VIEW],
      create: [Permission.PROJECTS_CREATE, Permission.PROJECT_MEMBERS_INVITE],
      edit: [
        Permission.PROJECTS_EDIT,
        Permission.PROJECTS_MANAGE,
        Permission.PROJECT_MEMBERS_EDIT,
        Permission.PROJECT_MEMBERS_MANAGE,
      ],
      delete: [Permission.PROJECTS_DELETE, Permission.PROJECT_MEMBERS_REMOVE],
    },
  },
  {
    id: 'tasks',
    label: 'Tasks, Boards & Comments',
    actions: {
      view: [
        Permission.TASKS_VIEW,
        Permission.COLUMNS_VIEW,
        Permission.COMMENTS_VIEW,
      ],
      create: [
        Permission.TASKS_CREATE,
        Permission.COLUMNS_CREATE,
        Permission.COMMENTS_CREATE,
      ],
      edit: [
        Permission.TASKS_EDIT,
        Permission.TASKS_ASSIGN,
        Permission.TASKS_MANAGE,
        Permission.COLUMNS_EDIT,
        Permission.COMMENTS_EDIT,
      ],
      delete: [
        Permission.TASKS_DELETE,
        Permission.COLUMNS_DELETE,
        Permission.COMMENTS_DELETE,
      ],
    },
  },
  {
    id: 'documents',
    label: 'Documents',
    actions: {
      view: [Permission.DOCUMENTS_VIEW],
      create: [Permission.DOCUMENTS_CREATE],
      edit: [
        Permission.DOCUMENTS_EDIT,
        Permission.DOCUMENTS_SHARE,
        Permission.DOCUMENTS_MANAGE,
      ],
      delete: [Permission.DOCUMENTS_DELETE],
    },
  },
  {
    id: 'chat',
    label: 'Chat',
    actions: {
      view: [Permission.CHAT_VIEW],
      create: [
        Permission.CHAT_SEND,
        Permission.CHAT_CREATE_ROOM,
        Permission.CHAT_UPLOAD_FILES,
        Permission.CHAT_CREATE,
      ],
      edit: [
        Permission.CHAT_MANAGE_ROOM,
        Permission.CHAT_MODERATE,
        Permission.CHAT_EDIT,
      ],
      delete: [Permission.CHAT_DELETE_MESSAGES, Permission.CHAT_DELETE],
    },
  },
  {
    id: 'hr',
    label: 'HR (Employees, Attendance, Leaves, Assets)',
    actions: {
      view: [Permission.HR_VIEW],
      create: [Permission.HR_CREATE],
      edit: [Permission.HR_EDIT],
      delete: [Permission.HR_DELETE],
    },
  },
  {
    id: 'compliance',
    label: 'Compliance',
    actions: {
      view: [Permission.COMPLIANCE_VIEW],
      create: [Permission.COMPLIANCE_CREATE],
      edit: [Permission.COMPLIANCE_EDIT],
      delete: [Permission.COMPLIANCE_DELETE],
    },
  },
  {
    id: 'analytics',
    label: 'Analytics & Reports',
    actions: {
      view: [
        Permission.ANALYTICS_VIEW,
        Permission.REPORTS_VIEW,
        Permission.REPORTS_EXPORT,
      ],
    },
  },
  {
    id: 'workspace',
    label: 'Workspace & Team Members',
    actions: {
      view: [
        Permission.WORKSPACE_VIEW,
        Permission.MEMBERS_VIEW,
        Permission.USERS_VIEW,
        Permission.INVITATIONS_VIEW,
      ],
      create: [
        Permission.WORKSPACE_INVITE,
        Permission.MEMBERS_INVITE,
        Permission.INVITATIONS_CREATE,
        Permission.USERS_CREATE,
      ],
      edit: [
        Permission.WORKSPACE_EDIT,
        Permission.MEMBERS_EDIT,
        Permission.USERS_EDIT,
      ],
      delete: [
        Permission.WORKSPACE_DELETE,
        Permission.MEMBERS_REMOVE,
        Permission.USERS_DELETE,
        Permission.INVITATIONS_CANCEL,
      ],
    },
  },
  {
    id: 'roles',
    label: 'Roles & Permissions',
    actions: {
      view: [Permission.ROLES_VIEW, Permission.PERMISSIONS_VIEW],
      create: [Permission.ROLES_CREATE],
      edit: [Permission.ROLES_EDIT],
      delete: [Permission.ROLES_DELETE],
    },
  },
  {
    id: 'settings',
    label: 'Settings & Notifications',
    actions: {
      view: [
        Permission.SETTINGS_VIEW,
        Permission.NOTIFICATIONS_VIEW,
        Permission.ACTIVITIES_VIEW,
      ],
      create: [Permission.NOTIFICATIONS_CREATE],
      edit: [
        Permission.SETTINGS_EDIT,
        Permission.SETTINGS_MANAGE,
        Permission.NOTIFICATIONS_MANAGE,
      ],
      delete: [Permission.NOTIFICATIONS_DELETE],
    },
  },
  {
    id: 'billing',
    label: 'Billing & Subscription',
    actions: {
      view: [Permission.BILLING_VIEW],
      edit: [Permission.BILLING_EDIT],
    },
  },
]

export type ModuleSelection = Record<string, ModuleAction[]>

const gridPermissionIds = new Set<string>(
  PERMISSION_MODULES.flatMap(module => Object.values(module.actions).flat())
)

export function getAdvancedPermissions(): PermissionDefinition[] {
  return getAllPermissions().filter(
    permission => !gridPermissionIds.has(permission.name)
  )
}

export function expandModuleSelection(selection: ModuleSelection): string[] {
  const ids = new Set<string>()
  for (const module of PERMISSION_MODULES) {
    for (const action of selection[module.id] ?? []) {
      for (const id of module.actions[action] ?? []) ids.add(id)
    }
  }
  return Array.from(ids)
}

export function collapseToModuleSelection(ids: string[]): {
  selection: ModuleSelection
  extras: string[]
} {
  const owned = new Set(ids)
  const selection: ModuleSelection = {}
  const covered = new Set<string>()
  for (const module of PERMISSION_MODULES) {
    const actions = MODULE_ACTIONS.filter(action => {
      const cell = module.actions[action]
      return cell?.length ? cell.every(id => owned.has(id)) : false
    })
    if (actions.length) selection[module.id] = actions
    for (const action of actions) {
      module.actions[action]?.forEach(id => covered.add(id))
    }
  }
  return { selection, extras: ids.filter(id => !covered.has(id)) }
}
