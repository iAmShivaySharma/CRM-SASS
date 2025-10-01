# CRM Permission System Architecture

## Overview

This document provides comprehensive guidance on the CRM's granular permission system, designed for developers who need to understand, extend, and work with the permission architecture.

## Architecture Components

### 1. Database Models

#### Permission Model (`lib/mongodb/models/Permission.ts`)

```typescript
interface IPermission {
  _id: string
  workspaceId?: string              // null = system-wide permission
  name: string                      // Format: "resource.action"
  displayName: string               // Human-readable name
  description?: string              // What this permission grants
  resource: string                  // e.g., "leads", "users", "roles"
  action: string                    // e.g., "create", "read", "update", "delete"
  category: string                  // UI grouping: Core, Sales, Admin, etc.
  isSystemPermission: boolean       // Built-in vs custom permissions
  isActive: boolean                 // Enable/disable permissions
  dependencies?: string[]           // Required permissions
  conflictsWith?: string[]          // Mutually exclusive permissions
  createdBy?: string               // Creator user ID
  createdAt: Date
  updatedAt: Date
}
```

#### Role Model (Extended)
```typescript
interface IRole {
  // ... existing fields
  permissions: string[]  // Array of permission names (e.g., ["leads.create", "users.read"])
}
```

### 2. Permission Naming Convention

**Format**: `{resource}.{action}`

**Examples**:
- `leads.create` - Create new leads
- `leads.read` - View leads
- `users.delete` - Delete users
- `analytics.view` - View analytics dashboard
- `permissions.create` - Create custom permissions

### 3. Categories

- **Core**: Basic workspace functionality
- **Sales**: Lead and sales management
- **Admin**: User and workspace administration
- **Analytics**: Reports and analytics
- **Integration**: Webhooks and external integrations
- **Custom**: Workspace-specific permissions

## API Endpoints

### Getting Permissions

#### `GET /api/permissions`
Returns permissions in legacy format for backward compatibility.

```javascript
// Response format (legacy compatible)
[
  {
    id: "leads.create",
    name: "Create Leads",
    resource: "leads",
    action: "create",
    category: "Sales"
  }
]
```

#### `GET /api/permissions/manage?workspaceId={id}`
Returns detailed permission management data.

```javascript
// Response format
{
  success: true,
  permissions: {
    "Sales": [...],
    "Admin": [...],
    "Core": [...]
  },
  total: 25,
  systemCount: 20,
  customCount: 5
}
```

### Creating Permissions

#### `POST /api/permissions/manage?workspaceId={id}`

```javascript
// Request body
{
  resource: "reports",
  action: "export",
  displayName: "Export Reports",
  description: "Export reports to PDF/Excel formats",
  category: "Analytics",
  dependencies: ["reports.view"],
  conflictsWith: []
}
```

## Frontend Integration

### Using Permissions in Components

#### 1. Check User Permissions

```typescript
import { useAppSelector } from '@/lib/hooks'

function MyComponent() {
  const { userPermissions } = useAppSelector(state => state.auth)

  const canCreateLeads = userPermissions.includes('leads.create')
  const canViewAnalytics = userPermissions.includes('analytics.view')

  return (
    <div>
      {canCreateLeads && (
        <Button>Create Lead</Button>
      )}
      {canViewAnalytics && (
        <Link href="/analytics">Analytics</Link>
      )}
    </div>
  )
}
```

#### 2. Permission-based Rendering

```typescript
import { hasPermission } from '@/lib/security/auth-middleware'

function ProtectedComponent({ userPermissions, children }) {
  if (!hasPermission(userPermissions, 'leads.create')) {
    return <div>Access denied</div>
  }

  return children
}
```

#### 3. Using Permission Manager

```typescript
import { PermissionManager } from '@/components/permissions/PermissionManager'

function PermissionsPage() {
  return <PermissionManager />
}
```

### Updating Role Form

The existing `RoleForm` component automatically works with the new system due to backward compatibility. However, you can enhance it:

```typescript
// In RoleForm.tsx
import { useGetPermissionsQuery } from '@/lib/api/roleApi'

function RoleForm() {
  // This now fetches from the new permission system
  const { data: permissions } = useGetPermissionsQuery()

  // permissions will be in the same format as before
  // { id: "leads.create", name: "Create Leads", category: "Sales" }
}
```

## Backend Integration

### Permission Checking

#### 1. API Route Protection

```typescript
import { hasPermission } from '@/lib/security/auth-middleware'

export async function POST(request: NextRequest) {
  const auth = await verifyAuthToken(request)

  // Get user's role permissions
  const member = await WorkspaceMember.findOne({
    userId: auth.user.id,
    workspaceId
  }).populate('roleId')

  const userPermissions = member.roleId?.permissions || []

  if (!hasPermission(userPermissions, 'leads.create')) {
    return NextResponse.json(
      { message: 'Insufficient permissions' },
      { status: 403 }
    )
  }

  // Proceed with operation
}
```

#### 2. Middleware Integration

```typescript
import { requireAuth } from '@/lib/security/auth-middleware'

export const POST = withAuth(async (request, { user }) => {
  // User is already authenticated and permissions checked
}, 'leads.create') // Required permission
```

### Database Seeding

#### System Permissions

```typescript
import { seedSystemPermissions } from '@/lib/mongodb/seedPermissions'

// Run during initialization
await seedSystemPermissions()
```

#### Default Roles Update

```typescript
// In seedDefaults.ts
const defaultRoles = [
  {
    name: 'Admin',
    permissions: [
      'leads.create', 'leads.read', 'leads.update', 'leads.delete',
      'users.create', 'users.read', 'users.update', 'users.delete',
      'workspace.manage', 'roles.manage', 'permissions.view'
    ]
  }
]
```

## Setup and Migration

### Initial Setup

To set up the permission system in a new environment:

1. **Run permission migration** to populate system permissions:
   ```bash
   npm run db:migrate-permissions
   ```

2. **Run database seeding** to create default roles:
   ```bash
   npm run db:seed
   ```

### Migration from Old System

If migrating from the old hardcoded permission system:

1. **Run permission migration** with force flag to recreate permissions:
   ```bash
   npm run db:migrate-permissions -- --force
   ```

2. **Verify migration** by checking the database or using the Permission Manager UI

3. **Update any custom code** that referenced old permission names

### Permission Categories

The new system includes these categories with chat permissions:

- **Core**: Basic workspace functionality (workspace.view, activities.view, etc.)
- **Sales**: Lead and sales management (leads.view, leads.create, etc.)
- **Admin**: Administrative functions (users.create, roles.manage, etc.)
- **Communication**: Chat system (chat.view, chat.send, chat.moderate, etc.)
- **Analytics**: Reports and analytics (analytics.view, reports.export, etc.)
- **Integration**: Webhooks and external integrations (webhooks.create, etc.)
- **Custom**: Workspace-specific permissions created by users

## Advanced Features

### Permission Dependencies

Some permissions require others to function properly:

```typescript
// Creating a permission with dependencies
{
  name: "leads.assign",
  dependencies: ["leads.read", "users.read"]
}
```

When assigning roles, the system automatically validates dependencies.

### Permission Conflicts

Some permissions are mutually exclusive:

```typescript
// Creating conflicting permissions
{
  name: "leads.readonly",
  conflictsWith: ["leads.create", "leads.update", "leads.delete"]
}
```

### Validation Helpers

```typescript
import {
  validatePermissionDependencies,
  validatePermissionConflicts
} from '@/lib/mongodb/seedPermissions'

const validation = validatePermissionDependencies(
  selectedPermissions,
  allPermissions
)

if (!validation.valid) {
  console.log('Missing dependencies:', validation.missingDependencies)
}
```

## Best Practices

### 1. Permission Naming

- Use **lowercase** with **dots** separating resource and action
- Be **consistent** with naming patterns
- Use **clear, descriptive** action names

```typescript
// Good
"leads.create"
"users.delete"
"reports.export"

// Bad
"CreateLead"
"user_delete"
"reports-view"
```

### 2. Resource Granularity

- Group related functionality under **logical resources**
- Don't create too many **micro-permissions**
- Balance **flexibility** with **complexity**

```typescript
// Good granularity
"leads.create", "leads.read", "leads.update", "leads.delete"

// Too granular
"leads.create.form", "leads.create.submit", "leads.create.validate"

// Too broad
"leads.all"
```

### 3. Categories

- Use categories to **organize permissions** in the UI
- Stick to **standard categories** when possible
- Create **custom categories** only when necessary

### 4. Dependencies

- Define dependencies for **logical permission hierarchies**
- Don't create **circular dependencies**
- Keep dependency chains **reasonably short**

### 5. Error Handling

```typescript
// Always provide clear error messages
if (!hasPermission(userPermissions, 'leads.create')) {
  return NextResponse.json(
    {
      message: 'Insufficient permissions to create leads',
      required: 'leads.create',
      userPermissions
    },
    { status: 403 }
  )
}
```

## Troubleshooting

### Common Issues

#### 1. Permission Not Working
- Check if permission exists in database
- Verify user's role has the permission
- Check permission name spelling/format

#### 2. UI Not Updating
- Ensure permission data is being fetched
- Check if component is using correct permission name
- Verify state management updates

#### 3. API Returning 403
- Confirm user authentication
- Check workspace membership
- Verify permission checking logic

### Debug Helpers

```typescript
// Log user permissions
console.log('User permissions:', userPermissions)

// Check specific permission
const hasAccess = hasPermission(userPermissions, 'leads.create')
console.log('Can create leads:', hasAccess)

// Get all available permissions
const allPerms = await getAvailablePermissions(workspaceId)
console.log('Available permissions:', allPerms)
```

## Future Enhancements

### Planned Features

1. **Permission Templates**: Pre-defined permission sets for common roles
2. **Time-based Permissions**: Permissions that expire or activate on schedule
3. **Conditional Permissions**: Permissions based on data ownership or context
4. **Permission Audit Trail**: Track permission changes over time
5. **Bulk Permission Management**: Import/export permission configurations

### Extension Points

The system is designed to be extensible:

1. **Custom Validation**: Add custom validation rules for permissions
2. **External Integration**: Sync permissions with external systems
3. **Advanced UI**: Build more sophisticated permission management interfaces
4. **Analytics**: Track permission usage and access patterns

## Support

For questions or issues with the permission system:

1. Check this documentation first
2. Review the test files in `__tests__/`
3. Examine existing permission implementations
4. Consult the team or create an issue

Remember: The permission system is designed to be **backward compatible**, so existing functionality should continue to work while you gradually adopt new features.