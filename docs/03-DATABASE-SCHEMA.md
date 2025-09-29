# CRM-X-SHIVAY Documentation

## Volume 3: Database Schema & Models

---

### 📖 Navigation

- [← Volume 2: API Reference](./02-API-REFERENCE.md)
- [→ Volume 4: Development Guide](./04-DEVELOPMENT-GUIDE.md)

---

## 🗄️ Database Overview

CRM-X-SHIVAY uses MongoDB as its primary database with Mongoose ODM for object modeling. The schema is designed for scalability, performance, and data integrity.

### 🏗️ Architecture Principles

- **Multi-tenant**: All data is workspace-scoped
- **Audit Trail**: Comprehensive activity logging
- **Soft Deletes**: Important records are marked as inactive rather than deleted
- **Indexing**: Strategic indexes for query performance
- **Validation**: Schema-level and application-level validation
- **Relationships**: Proper references and population support

---

## 👤 User Collection

**Collection**: `users`

```javascript
{
  _id: ObjectId,
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    maxlength: 255
  },
  password: {
    type: String,
    required: true,
    minlength: 8
  },
  fullName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  avatar: {
    type: String,
    default: null
  },
  timezone: {
    type: String,
    default: 'UTC'
  },
  language: {
    type: String,
    default: 'en'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  emailConfirmed: {
    type: Boolean,
    default: false
  },
  emailConfirmationToken: String,
  passwordResetToken: String,
  passwordResetExpires: Date,
  lastLoginAt: Date,
  lastActiveAt: Date,
  loginCount: {
    type: Number,
    default: 0
  },
  preferences: {
    theme: {
      type: String,
      enum: ['light', 'dark', 'system'],
      default: 'system'
    },
    notifications: {
      email: { type: Boolean, default: true },
      push: { type: Boolean, default: true },
      sms: { type: Boolean, default: false }
    },
    dashboardLayout: {
      type: String,
      enum: ['compact', 'comfortable', 'spacious'],
      default: 'comfortable'
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}
```

**Indexes:**

- `{ email: 1 }` (unique)
- `{ lastLoginAt: -1 }`
- `{ isActive: 1, emailConfirmed: 1 }`

---

## 🏢 Workspace Collection

**Collection**: `workspaces`

```javascript
{
  _id: ObjectId,
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  description: {
    type: String,
    maxlength: 500
  },
  logo: String,
  website: String,
  currency: {
    type: String,
    default: 'USD',
    maxlength: 3
  },
  timezone: {
    type: String,
    default: 'UTC'
  },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String
  },
  settings: {
    allowPublicSignup: {
      type: Boolean,
      default: false
    },
    leadAutoAssignment: {
      type: Boolean,
      default: false
    },
    requireLeadApproval: {
      type: Boolean,
      default: false
    },
    defaultLeadStatus: {
      type: String,
      default: 'new'
    },
    emailIntegration: {
      enabled: { type: Boolean, default: false },
      provider: String,
      settings: Object
    }
  },
  subscription: {
    planId: {
      type: ObjectId,
      ref: 'Plan'
    },
    status: {
      type: String,
      enum: ['trial', 'active', 'cancelled', 'expired'],
      default: 'trial'
    },
    startDate: Date,
    endDate: Date,
    nextBillingDate: Date
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}
```

**Indexes:**

- `{ slug: 1 }` (unique)
- `{ createdBy: 1 }`
- `{ 'subscription.status': 1, 'subscription.endDate': 1 }`

---

## 👥 WorkspaceMember Collection

**Collection**: `workspacemembers`

```javascript
{
  _id: ObjectId,
  workspaceId: {
    type: ObjectId,
    ref: 'Workspace',
    required: true
  },
  userId: {
    type: ObjectId,
    ref: 'User',
    required: true
  },
  roleId: {
    type: ObjectId,
    ref: 'Role',
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'pending'],
    default: 'active'
  },
  joinedAt: {
    type: Date,
    default: Date.now
  },
  invitedBy: {
    type: ObjectId,
    ref: 'User'
  },
  invitedAt: Date,
  permissions: [String], // Additional permissions beyond role
  isOwner: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}
```

**Indexes:**

- `{ workspaceId: 1, userId: 1 }` (unique)
- `{ userId: 1 }`
- `{ workspaceId: 1, status: 1 }`

---

## 🎭 Role Collection

**Collection**: `roles`

```javascript
{
  _id: ObjectId,
  workspaceId: {
    type: ObjectId,
    ref: 'Workspace',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },
  description: {
    type: String,
    maxlength: 200
  },
  permissions: [{
    type: String,
    required: true
  }],
  isDefault: {
    type: Boolean,
    default: false
  },
  isSystem: {
    type: Boolean,
    default: false
  },
  color: {
    type: String,
    default: '#6b7280'
  },
  createdBy: {
    type: ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}
```

**Available Permissions:**

- `leads:read`, `leads:write`, `leads:delete`
- `contacts:read`, `contacts:write`, `contacts:delete`
- `users:read`, `users:write`, `users:invite`, `users:delete`
- `roles:read`, `roles:write`, `roles:delete`
- `webhooks:read`, `webhooks:write`, `webhooks:delete`
- `reports:read`, `reports:write`
- `settings:read`, `settings:write`
- `workspace:admin`

**Indexes:**

- `{ workspaceId: 1, name: 1 }` (unique)
- `{ workspaceId: 1, isDefault: 1 }`

---

## 📋 Lead Collection

**Collection**: `leads`

```javascript
{
  _id: ObjectId,
  workspaceId: {
    type: ObjectId,
    ref: 'Workspace',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    maxlength: 255
  },
  phone: {
    type: String,
    trim: true,
    maxlength: 20
  },
  company: {
    type: String,
    trim: true,
    maxlength: 100
  },
  position: {
    type: String,
    trim: true,
    maxlength: 100
  },
  website: String,
  source: {
    type: String,
    required: true,
    maxlength: 50
  },
  campaign: String,
  medium: String,
  status: {
    type: String,
    required: true,
    default: 'new'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  value: {
    type: Number,
    min: 0,
    default: 0
  },
  probability: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  expectedCloseDate: Date,
  actualCloseDate: Date,
  assignedTo: {
    type: ObjectId,
    ref: 'User'
  },
  tagIds: [{
    type: ObjectId,
    ref: 'Tag'
  }],
  customFields: {
    type: Map,
    of: String
  },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String
  },
  socialProfiles: {
    linkedin: String,
    twitter: String,
    facebook: String
  },
  notes: String,
  isConverted: {
    type: Boolean,
    default: false
  },
  convertedAt: Date,
  convertedToContactId: {
    type: ObjectId,
    ref: 'Contact'
  },
  lastContactedAt: Date,
  nextFollowUpDate: Date,
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}
```

**Indexes:**

- `{ workspaceId: 1, status: 1 }`
- `{ workspaceId: 1, assignedTo: 1 }`
- `{ workspaceId: 1, createdAt: -1 }`
- `{ email: 1, workspaceId: 1 }`
- `{ workspaceId: 1, isActive: 1, isConverted: 1 }`

---

## 👥 Contact Collection

**Collection**: `contacts`

```javascript
{
  _id: ObjectId,
  workspaceId: {
    type: ObjectId,
    ref: 'Workspace',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    maxlength: 255
  },
  phone: {
    type: String,
    trim: true,
    maxlength: 20
  },
  company: {
    type: String,
    trim: true,
    maxlength: 100
  },
  position: {
    type: String,
    trim: true,
    maxlength: 100
  },
  category: {
    type: String,
    enum: ['client', 'prospect', 'partner', 'vendor', 'other'],
    default: 'prospect'
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'archived'],
    default: 'active'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  totalRevenue: {
    type: Number,
    min: 0,
    default: 0
  },
  totalPayments: {
    type: Number,
    min: 0,
    default: 0
  },
  lastPaymentDate: Date,
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String
  },
  website: String,
  socialProfiles: {
    linkedIn: String,
    twitter: String,
    facebook: String
  },
  assignedTo: {
    type: ObjectId,
    ref: 'User'
  },
  accountManager: {
    type: ObjectId,
    ref: 'User'
  },
  tagIds: [{
    type: ObjectId,
    ref: 'Tag'
  }],
  customData: {
    type: Map,
    of: String
  },
  notes: String,
  lastContactDate: Date,
  nextFollowUpDate: Date,
  // Lead conversion tracking
  originalLeadId: {
    type: ObjectId,
    ref: 'Lead'
  },
  convertedFromLead: {
    type: Boolean,
    default: false
  },
  leadConversionDate: Date,
  createdBy: {
    type: ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}
```

**Indexes:**

- `{ workspaceId: 1, status: 1 }`
- `{ workspaceId: 1, category: 1 }`
- `{ workspaceId: 1, assignedTo: 1 }`
- `{ email: 1, workspaceId: 1 }`

---

## 🏷️ Tag Collection

**Collection**: `tags`

```javascript
{
  _id: ObjectId,
  workspaceId: {
    type: ObjectId,
    ref: 'Workspace',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },
  color: {
    type: String,
    required: true,
    match: /^#[0-9A-F]{6}$/i
  },
  description: {
    type: String,
    maxlength: 200
  },
  usageCount: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}
```

**Indexes:**

- `{ workspaceId: 1, name: 1 }` (unique)
- `{ workspaceId: 1, isActive: 1 }`

---

## 📊 LeadStatus Collection

**Collection**: `leadstatuses`

```javascript
{
  _id: ObjectId,
  workspaceId: {
    type: ObjectId,
    ref: 'Workspace',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },
  color: {
    type: String,
    required: true,
    match: /^#[0-9A-F]{6}$/i
  },
  description: {
    type: String,
    maxlength: 200
  },
  order: {
    type: Number,
    required: true,
    min: 0
  },
  isDefault: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  usageCount: {
    type: Number,
    default: 0
  },
  createdBy: {
    type: ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}
```

**Indexes:**

- `{ workspaceId: 1, name: 1 }` (unique)
- `{ workspaceId: 1, order: 1 }`

---

## 📝 LeadNote Collection

**Collection**: `leadnotes`

```javascript
{
  _id: ObjectId,
  leadId: {
    type: ObjectId,
    ref: 'Lead',
    required: true
  },
  workspaceId: {
    type: ObjectId,
    ref: 'Workspace',
    required: true
  },
  content: {
    type: String,
    required: true,
    maxlength: 2000
  },
  type: {
    type: String,
    enum: ['note', 'call', 'email', 'meeting', 'task'],
    default: 'note'
  },
  isPrivate: {
    type: Boolean,
    default: false
  },
  createdBy: {
    type: ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}
```

**Indexes:**

- `{ leadId: 1, createdAt: -1 }`
- `{ workspaceId: 1, createdBy: 1 }`

---

## 📈 Activity Collection

**Collection**: `activities`

```javascript
{
  _id: ObjectId,
  workspaceId: {
    type: ObjectId,
    ref: 'Workspace',
    required: true
  },
  performedBy: {
    type: ObjectId,
    ref: 'User',
    required: true
  },
  activityType: {
    type: String,
    required: true,
    enum: [
      'created', 'updated', 'deleted', 'assigned',
      'status_changed', 'note_added', 'called', 'emailed',
      'meeting_scheduled', 'converted', 'imported'
    ]
  },
  entityType: {
    type: String,
    required: true,
    enum: ['lead', 'contact', 'user', 'workspace', 'role', 'tag', 'webhook']
  },
  entityId: {
    type: ObjectId,
    required: true
  },
  description: {
    type: String,
    required: true,
    maxlength: 500
  },
  metadata: {
    type: Map,
    of: String
  },
  ipAddress: String,
  userAgent: String,
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 7776000 // 90 days TTL
  }
}
```

**Indexes:**

- `{ workspaceId: 1, createdAt: -1 }`
- `{ entityType: 1, entityId: 1, createdAt: -1 }`
- `{ performedBy: 1, createdAt: -1 }`

---

## 🔗 Webhook Collection

**Collection**: `webhooks`

```javascript
{
  _id: ObjectId,
  workspaceId: {
    type: ObjectId,
    ref: 'Workspace',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    maxlength: 500
  },
  webhookType: {
    type: String,
    enum: ['facebook', 'google-forms', 'zapier', 'swipepages', 'hubspot', 'linkedin', 'generic'],
    default: 'generic'
  },
  events: [{
    type: String,
    enum: ['lead.created', 'lead.updated', 'contact.created', 'contact.updated']
  }],
  secret: String,
  isActive: {
    type: Boolean,
    default: true
  },
  totalRequests: {
    type: Number,
    default: 0
  },
  successfulRequests: {
    type: Number,
    default: 0
  },
  failedRequests: {
    type: Number,
    default: 0
  },
  lastTriggered: Date,
  lastError: String,
  configuration: {
    type: Map,
    of: String
  },
  createdBy: {
    type: ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}
```

**Indexes:**

- `{ workspaceId: 1, isActive: 1 }`
- `{ workspaceId: 1, webhookType: 1 }`

---

## 📊 WebhookLog Collection

**Collection**: `webhooklogs`

```javascript
{
  _id: ObjectId,
  webhookId: {
    type: ObjectId,
    ref: 'Webhook',
    required: true
  },
  workspaceId: {
    type: ObjectId,
    ref: 'Workspace',
    required: true
  },
  method: String,
  url: String,
  headers: Object,
  body: Object,
  responseStatus: Number,
  responseBody: Object,
  processingTime: Number, // milliseconds
  success: Boolean,
  errorMessage: String,
  leadId: String,
  userAgent: String,
  ipAddress: String,
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 7776000 // 90 days TTL
  }
}
```

**Indexes:**

- `{ webhookId: 1, createdAt: -1 }`
- `{ workspaceId: 1, success: 1, createdAt: -1 }`

---

## 💳 Plan Collection

**Collection**: `plans`

```javascript
{
  _id: ObjectId,
  name: {
    type: String,
    required: true,
    unique: true
  },
  description: String,
  price: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'USD'
  },
  billingCycle: {
    type: String,
    enum: ['monthly', 'yearly'],
    default: 'monthly'
  },
  features: {
    maxUsers: { type: Number, default: -1 }, // -1 = unlimited
    maxLeads: { type: Number, default: -1 },
    maxContacts: { type: Number, default: -1 },
    maxWebhooks: { type: Number, default: -1 },
    advancedReports: { type: Boolean, default: false },
    apiAccess: { type: Boolean, default: true },
    customFields: { type: Boolean, default: true },
    emailIntegration: { type: Boolean, default: false },
    smsIntegration: { type: Boolean, default: false },
    whitelabeling: { type: Boolean, default: false }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  sortOrder: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}
```

---

## 📧 Invitation Collection

**Collection**: `invitations`

```javascript
{
  _id: ObjectId,
  workspaceId: {
    type: ObjectId,
    ref: 'Workspace',
    required: true
  },
  email: {
    type: String,
    required: true,
    lowercase: true
  },
  roleId: {
    type: ObjectId,
    ref: 'Role',
    required: true
  },
  invitedBy: {
    type: ObjectId,
    ref: 'User',
    required: true
  },
  token: {
    type: String,
    required: true,
    unique: true
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'declined', 'expired'],
    default: 'pending'
  },
  expiresAt: {
    type: Date,
    required: true
  },
  acceptedAt: Date,
  acceptedBy: {
    type: ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}
```

**Indexes:**

- `{ token: 1 }` (unique)
- `{ workspaceId: 1, status: 1 }`
- `{ expiresAt: 1 }` (TTL index)

---

## 🔧 Database Configuration

### Connection Settings

```javascript
// MongoDB connection options
{
  useNewUrlParser: true,
  useUnifiedTopology: true,
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  bufferCommands: false,
  bufferMaxEntries: 0
}
```

### Performance Optimizations

1. **Compound Indexes**: Strategic compound indexes for complex queries
2. **TTL Indexes**: Automatic cleanup of logs and temporary data
3. **Sparse Indexes**: For optional fields that are frequently queried
4. **Text Indexes**: For full-text search capabilities

### Data Retention Policies

- **Activity Logs**: 90 days (TTL)
- **Webhook Logs**: 90 days (TTL)
- **User Sessions**: 30 days
- **Invitation Tokens**: 7 days (TTL)

---

**Next**: [Volume 4: Development Guide](./04-DEVELOPMENT-GUIDE.md)

**Last Updated**: 2025-09-23
**Version**: 2.0.0
