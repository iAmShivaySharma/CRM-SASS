# CRM-X-SHIVAY Documentation

## Volume 2: API Reference & Endpoints

---

### 📖 Navigation

- [← Volume 1: Introduction](./01-INTRODUCTION.md)
- [→ Volume 3: Database Schema](./03-DATABASE-SCHEMA.md)

---

## 🔌 API Overview

The CRM-X-SHIVAY API follows RESTful principles with JSON request/response format. All endpoints require authentication except for the authentication endpoints themselves.

### 🔑 Authentication

All API requests (except auth endpoints) require a JWT token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

### 📊 Response Format

All API responses follow this consistent format:

```json
{
  "success": true|false,
  "message": "Human readable message",
  "data": {}, // Response data (varies by endpoint)
  "errors": [], // Validation errors (if any)
  "pagination": {} // Pagination info (for paginated endpoints)
}
```

### 🚨 Error Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (invalid/missing token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `409` - Conflict (duplicate data)
- `429` - Too Many Requests (rate limited)
- `500` - Internal Server Error

---

## 🔐 Authentication Endpoints

### POST /api/auth/login

Authenticate user and receive JWT token.

**Request Body:**

```json
{
  "email": "admin@crm.com",
  "password": "Admin123!@#"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "user_id",
    "email": "admin@crm.com",
    "fullName": "Admin User",
    "workspaceId": "workspace_id"
  }
}
```

### POST /api/auth/signup

Create new user account.

**Request Body:**

```json
{
  "email": "newuser@example.com",
  "password": "Password123!",
  "fullName": "New User",
  "timezone": "America/New_York"
}
```

### POST /api/auth/verify

Verify JWT token validity.

**Headers:**

```
Authorization: Bearer <token>
```

### POST /api/auth/logout

Logout user (invalidate token).

---

## 📋 Lead Management Endpoints

### GET /api/leads

Get all leads with filtering and pagination.

**Query Parameters:**

- `workspaceId` (required) - Workspace ID
- `page` (optional, default: 1) - Page number
- `limit` (optional, default: 20) - Items per page
- `search` (optional) - Search term
- `status` (optional) - Filter by status
- `priority` (optional) - Filter by priority
- `assignedTo` (optional) - Filter by assigned user
- `source` (optional) - Filter by lead source

**Response:**

```json
{
  "success": true,
  "leads": [
    {
      "_id": "lead_id",
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "+1234567890",
      "company": "Example Corp",
      "status": "new",
      "value": 5000,
      "priority": "high",
      "source": "website",
      "createdAt": "2025-09-23T10:00:00Z",
      "updatedAt": "2025-09-23T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 50,
    "pages": 3
  }
}
```

### POST /api/leads

Create a new lead.

**Request Body:**

```json
{
  "workspaceId": "workspace_id",
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+1234567890",
  "company": "Example Corp",
  "status": "new",
  "value": 5000,
  "priority": "high",
  "source": "website",
  "notes": "Interested in premium plan",
  "customFields": {
    "utm_source": "google",
    "utm_campaign": "summer2024"
  }
}
```

### GET /api/leads/[id]

Get lead by ID with full details.

### PUT /api/leads/[id]

Update existing lead.

### DELETE /api/leads/[id]

Delete a lead.

### POST /api/leads/[id]/convert-to-contact

Convert lead to contact.

**Request Body:**

```json
{
  "category": "client",
  "accountManager": "user_id",
  "totalRevenue": 10000,
  "notes": "Converted from qualified lead"
}
```

---

## 📝 Lead Notes Endpoints

### GET /api/leads/[id]/notes

Get notes for a specific lead.

**Query Parameters:**

- `page` (optional, default: 1)
- `limit` (optional, default: 20)

### POST /api/leads/[id]/notes

Add note to a lead.

**Request Body:**

```json
{
  "content": "Called lead, discussed requirements in detail",
  "type": "call",
  "isPrivate": false
}
```

---

## 📈 Lead Activities Endpoints

### GET /api/leads/[id]/activities

Get activity history for a specific lead.

---

## 👥 Contact Management Endpoints

### GET /api/contacts

Get all contacts with filtering and pagination.

**Query Parameters:**

- `workspaceId` (required)
- `page`, `limit`, `search` (same as leads)
- `status` - active, inactive, archived
- `category` - client, prospect, partner, vendor, other
- `assignedTo` - Filter by assigned user
- `priority` - low, medium, high

### POST /api/contacts

Create a new contact.

**Request Body:**

```json
{
  "workspaceId": "workspace_id",
  "name": "Jane Smith",
  "email": "jane@example.com",
  "phone": "+1987654321",
  "company": "Tech Solutions Inc",
  "position": "CTO",
  "category": "client",
  "status": "active",
  "priority": "high",
  "totalRevenue": 50000,
  "totalPayments": 45000,
  "address": {
    "street": "123 Tech Street",
    "city": "San Francisco",
    "state": "CA",
    "zipCode": "94105",
    "country": "USA"
  },
  "website": "https://techsolutions.com",
  "linkedIn": "https://linkedin.com/company/techsolutions",
  "assignedTo": "user_id",
  "accountManager": "user_id",
  "notes": "Key client for enterprise solutions",
  "customData": {
    "industry": "technology",
    "employees": "50-100"
  }
}
```

### GET /api/contacts/[id]

Get contact by ID.

### PUT /api/contacts/[id]

Update existing contact.

### DELETE /api/contacts/[id]

Delete a contact.

---

## 🏢 Workspace Management Endpoints

### GET /api/workspaces

Get user's workspaces.

### POST /api/workspaces

Create new workspace.

**Request Body:**

```json
{
  "name": "My Company CRM",
  "description": "Workspace for sales team",
  "currency": "USD",
  "timezone": "America/New_York"
}
```

### GET /api/workspaces/[id]

Get workspace details.

### PUT /api/workspaces/[id]

Update workspace.

### DELETE /api/workspaces/[id]

Delete workspace.

### GET /api/workspaces/[id]/members

Get workspace members.

### POST /api/workspaces/[id]/members

Add member to workspace.

### GET /api/workspaces/[id]/invites

Get pending invitations.

### POST /api/workspaces/[id]/invites

Invite user to workspace.

### GET /api/workspaces/[id]/roles

Get workspace-specific roles.

### GET /api/user/last-active-workspace

Get user's last active workspace information.

**Response:**

```json
{
  "lastActiveWorkspaceId": "workspace_id",
  "workspace": {
    "id": "workspace_id",
    "name": "My Workspace",
    "currency": "USD",
    "timezone": "America/New_York",
    "settings": {
      "dateFormat": "MM/DD/YYYY",
      "timeFormat": "12h",
      "weekStartsOn": 0,
      "language": "en"
    },
    "planId": "free",
    "createdAt": "2025-09-23T10:00:00Z"
  }
}
```

### POST /api/user/last-active-workspace

Update user's last active workspace.

**Request Body:**

```json
{
  "workspaceId": "workspace_id"
}
```

**Response:**

```json
{
  "message": "Last active workspace updated successfully"
}
```

---

## 🎭 Role Management Endpoints

### GET /api/roles

Get workspace roles.

**Query Parameters:**

- `workspaceId` (required)

**Response:**

```json
{
  "success": true,
  "roles": [
    {
      "_id": "role_id",
      "name": "Sales Manager",
      "description": "Can manage leads and view reports",
      "permissions": [
        "leads:read",
        "leads:write",
        "contacts:read",
        "contacts:write",
        "reports:read"
      ],
      "isDefault": false,
      "workspaceId": "workspace_id"
    }
  ]
}
```

### POST /api/roles

Create new role.

**Request Body:**

```json
{
  "workspaceId": "workspace_id",
  "name": "Custom Sales Role",
  "description": "Custom role for sales team",
  "permissions": ["leads:read", "leads:write", "contacts:read"]
}
```

### PUT /api/roles/[id]

Update role.

### DELETE /api/roles/[id]

Delete role.

---

## 🏷️ Tag Management Endpoints

### GET /api/tags

Get workspace tags.

**Query Parameters:**

- `workspaceId` (required)

### POST /api/tags

Create new tag.

**Request Body:**

```json
{
  "workspaceId": "workspace_id",
  "name": "Hot Lead",
  "color": "#ef4444",
  "description": "High priority leads"
}
```

### PUT /api/tags/[id]

Update tag.

### DELETE /api/tags/[id]

Delete tag.

---

## 📊 Lead Status Management Endpoints

### GET /api/lead-statuses

Get workspace lead statuses.

**Query Parameters:**

- `workspaceId` (required)

### POST /api/lead-statuses

Create new lead status.

**Request Body:**

```json
{
  "workspaceId": "workspace_id",
  "name": "Qualified",
  "color": "#10b981",
  "description": "Lead has been qualified by sales team",
  "order": 2,
  "isDefault": false
}
```

### PUT /api/lead-statuses/[id]

Update lead status.

### DELETE /api/lead-statuses/[id]

Delete lead status.

---

## 📈 Activity Tracking Endpoints

### GET /api/activities

Get activities with filtering.

**Query Parameters:**

- `workspaceId` (required)
- `entityType` (optional) - lead, contact, user, etc.
- `entityId` (optional) - Specific entity ID
- `performedBy` (optional) - User who performed action
- `page`, `limit` (pagination)

### POST /api/activities

Log new activity.

**Request Body:**

```json
{
  "workspaceId": "workspace_id",
  "activityType": "note",
  "entityType": "lead",
  "entityId": "lead_id",
  "description": "Called lead and discussed requirements",
  "metadata": {
    "duration": "15 minutes",
    "outcome": "positive"
  }
}
```

---

## 🔗 Webhook Management Endpoints

### GET /api/webhooks

Get workspace webhooks.

**Query Parameters:**

- `workspaceId` (required)

### POST /api/webhooks

Create new webhook.

**Request Body:**

```json
{
  "workspaceId": "workspace_id",
  "name": "Facebook Lead Webhook",
  "description": "Receives leads from Facebook Lead Ads",
  "webhookType": "facebook",
  "events": ["lead.created"],
  "isActive": true,
  "secret": "your-webhook-secret"
}
```

**Response:**

```json
{
  "success": true,
  "webhook": {
    "_id": "webhook_id",
    "name": "Facebook Lead Webhook",
    "webhookUrl": "https://your-domain.com/api/webhooks/receive/webhook_id",
    "secret": "your-webhook-secret",
    "isActive": true
  }
}
```

### PUT /api/webhooks/[id]

Update webhook.

### DELETE /api/webhooks/[id]

Delete webhook.

### POST /api/webhooks/receive/[id]

Webhook endpoint for receiving data from external sources.

**Supported Webhook Types:**

- `facebook` - Facebook Lead Ads
- `google-forms` - Google Forms
- `zapier` - Zapier webhooks
- `swipepages` - SwipePages
- `hubspot` - HubSpot
- `linkedin` - LinkedIn Lead Gen Forms
- `generic` - Generic webhook format

**Example Request (Generic):**

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+1234567890",
  "company": "Example Corp",
  "source": "website",
  "value": 5000,
  "custom_fields": {
    "utm_source": "google",
    "utm_campaign": "summer2024"
  }
}
```

---

## 👤 User Preferences Endpoints

### GET /api/users/preferences

Get user preferences.

### PUT /api/users/preferences

Update user preferences.

**Request Body:**

```json
{
  "theme": "dark",
  "timezone": "America/New_York",
  "language": "en",
  "notifications": {
    "email": true,
    "push": false,
    "sms": false
  },
  "dashboardLayout": "compact"
}
```

---

## 🔍 Permissions Endpoint

### GET /api/permissions

Get available permissions list.

**Response:**

```json
{
  "success": true,
  "permissions": {
    "leads": ["read", "write", "delete"],
    "contacts": ["read", "write", "delete"],
    "users": ["read", "write", "invite"],
    "roles": ["read", "write", "delete"],
    "webhooks": ["read", "write", "delete"],
    "reports": ["read"],
    "settings": ["read", "write"]
  }
}
```

---

## 🔔 Notifications Endpoints

### GET /api/notifications

Get user notifications with filtering and pagination.

**Query Parameters:**

- `workspaceId` (required) - Workspace ID
- `limit` (optional, default: 20) - Number of notifications to retrieve
- `offset` (optional, default: 0) - Offset for pagination
- `unreadOnly` (optional, default: false) - Show only unread notifications
- `entityType` (optional) - Filter by entity type (lead, contact, user, workspace, etc.)

**Response:**

```json
{
  "success": true,
  "notifications": [
    {
      "id": "notification_id",
      "title": "New Lead Created",
      "message": "A new lead 'John Doe' has been added to your workspace",
      "type": "info",
      "timestamp": "2025-09-28T10:00:00Z",
      "read": false,
      "actionUrl": "/leads/lead_id",
      "entityType": "lead",
      "entityId": "lead_id"
    }
  ],
  "total": 25,
  "unreadCount": 5,
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 25,
    "pages": 2
  }
}
```

### PATCH /api/notifications

Update notification status (mark as read, mark all as read).

**Request Body:**

```json
{
  "workspaceId": "workspace_id",
  "action": "markAsRead",
  "notificationId": "notification_id"
}
```

Or for marking all as read:

```json
{
  "workspaceId": "workspace_id",
  "action": "markAllAsRead"
}
```

**Response:**

```json
{
  "success": true,
  "result": true,
  "message": "Notification marked as read"
}
```

---

## 📈 Analytics Endpoints

### GET /api/analytics/dashboard

Get dashboard analytics data including key metrics and performance indicators.

**Query Parameters:**

- `workspaceId` (required) - Workspace ID
- `from` (optional) - Start date (ISO string, default: 30 days ago)
- `to` (optional) - End date (ISO string, default: now)
- `compareFrom` (optional) - Comparison period start date
- `compareTo` (optional) - Comparison period end date

**Response:**

```json
{
  "success": true,
  "data": {
    "totalLeads": 150,
    "totalLeadsPrevious": 120,
    "conversionRate": 23.5,
    "conversionRatePrevious": 19.2,
    "totalRevenue": 45000,
    "totalRevenuePrevious": 38000,
    "growth": 15.8,
    "growthPrevious": 12.3,
    "activeDeals": 47,
    "monthlyRevenue": 12400,
    "newLeads": 35,
    "salesTargetProgress": 78.5,
    "leadQualityScore": 85.2,
    "customerSatisfaction": 92.1
  }
}
```

### GET /api/analytics/pipeline

Get sales pipeline analytics showing lead distribution across different stages.

**Query Parameters:**

- `workspaceId` (required) - Workspace ID
- `from` (optional) - Start date (ISO string, default: 30 days ago)
- `to` (optional) - End date (ISO string, default: now)

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "statusName": "new",
      "count": 45,
      "percentage": 30.0,
      "value": 22500
    },
    {
      "statusName": "qualified",
      "count": 35,
      "percentage": 23.3,
      "value": 17500
    },
    {
      "statusName": "proposal",
      "count": 25,
      "percentage": 16.7,
      "value": 12500
    }
  ]
}
```

### GET /api/analytics/performance

Get detailed performance metrics including sales targets, lead quality, and efficiency measures.

**Query Parameters:**

- `workspaceId` (required) - Workspace ID
- `from` (optional) - Start date (ISO string, default: 30 days ago)
- `to` (optional) - End date (ISO string, default: now)

**Response:**

```json
{
  "success": true,
  "data": {
    "salesTargetProgress": 78.5,
    "leadQualityScore": 85.2,
    "customerSatisfaction": 92.1,
    "averageDealSize": 1875.5,
    "salesCycleLength": 14.3,
    "winRate": 23.8
  }
}
```

---

## 🧪 Testing Endpoints

### POST /api/test-leads

Create test leads for development/testing.

**Request Body:**

```json
{
  "workspaceId": "workspace_id",
  "count": 10,
  "source": "test-data"
}
```

---

## 📊 Rate Limiting

All endpoints are rate-limited to prevent abuse:

- **Authentication endpoints**: 5 requests per minute
- **Read endpoints**: 100 requests per minute
- **Write endpoints**: 30 requests per minute
- **Webhook endpoints**: 60 requests per minute

Rate limit headers are included in responses:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1234567890
```

---

**Next**: [Volume 3: Database Schema & Models](./03-DATABASE-SCHEMA.md)

**Last Updated**: 2025-09-28
**Version**: 2.0.0
