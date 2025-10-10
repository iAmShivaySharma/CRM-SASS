# Execution Engine Documentation Plan

## Overview
The Execution Engine is a customer-facing system that allows users to execute pre-built n8n workflows on-demand from a catalog of 200+ workflows. Customers can run any workflow multiple times and receive results via email if configured.

### Dual API Key System
- **Customer's Own API Key**: Users can provide their own OpenRouter API keys (no charges)
- **Platform API Key**: Users can use platform-provided API keys (charged usage)
- **Initial Phase**: Focus on OpenRouter integration for AI/LLM workflows
- **Billing Integration**: Track usage and charge customers using platform keys

## System Architecture

### Core Components

#### 1. Workflow Catalog System
- **Database Schema**: Store workflow metadata, categories, descriptions, and configurations
- **API Integration**: Sync with n8n instance to fetch workflow details
- **Categorization**: Organize workflows by type (data processing, integrations, automation, etc.)
- **Search & Filtering**: Allow customers to find relevant workflows quickly

#### 2. Execution Engine Core
- **Workflow Execution**: Trigger n8n workflows via API calls
- **Parameter Handling**: Pass customer-specific parameters to workflows
- **Status Tracking**: Monitor execution progress and completion
- **Result Processing**: Capture and format workflow outputs

#### 3. Results Management
- **Execution History**: Store all execution records with timestamps
- **Output Storage**: Save workflow results in structured format
- **Email Reporting**: Optional email delivery of execution results
- **Result Visualization**: Display results in user-friendly format

#### 4. User Management & Permissions
- **Usage Tracking**: Monitor how many times each customer uses workflows
- **Access Control**: Workspace-based permissions for workflow access
- **Rate Limiting**: Prevent abuse with execution limits
- **Audit Logging**: Track all user actions and executions

#### 5. API Key Management System
- **Customer API Keys**: Store and manage user-provided OpenRouter API keys
- **Platform API Keys**: Manage platform-owned API key pool
- **Usage Billing**: Track API usage for platform keys and generate charges
- **Key Validation**: Validate API keys before workflow execution
- **Cost Calculation**: Real-time cost tracking per execution

## MongoDB Schema Design

### Collections Required

#### `workflowCatalog`
```typescript
{
  _id: ObjectId,
  n8nWorkflowId: string, // Reference to n8n workflow
  name: string,
  description: string,
  category: ObjectId, // Reference to workflowCategories
  tags: string[],
  inputSchema: object, // Expected parameters JSON schema
  outputSchema: object, // Expected results format
  isActive: boolean,
  requiresApiKey: boolean, // Whether workflow needs OpenRouter API
  estimatedCost: number, // Estimated cost using platform API key
  apiKeyProvider: 'openrouter' | 'platform', // Default API provider
  emailTemplateId?: ObjectId, // Optional email template
  createdAt: Date,
  updatedAt: Date
}
```

#### `workflowExecutions`
```typescript
{
  _id: ObjectId,
  workflowCatalogId: ObjectId, // Reference to workflowCatalog
  userId: ObjectId, // Reference to users
  workspaceId: ObjectId, // Reference to workspaces
  n8nExecutionId: string,
  status: 'pending' | 'running' | 'completed' | 'failed',
  inputData: object,
  outputData: object,
  executionTimeMs: number,
  apiKeyUsed: {
    type: 'customer' | 'platform',
    provider: 'openrouter' | 'platform',
    keyId?: ObjectId, // Reference to customerApiKeys if customer key used
    cost?: number, // Actual cost incurred (for platform keys)
    tokensUsed?: number // Tokens consumed
  },
  emailSent: boolean,
  emailSentAt?: Date,
  errorMessage?: string,
  createdAt: Date,
  completedAt?: Date
}
```

#### `workflowCategories`
```typescript
{
  _id: ObjectId,
  name: string,
  description: string,
  icon: string,
  sortOrder: number,
  isActive: boolean,
  createdAt: Date,
  updatedAt: Date
}
```

#### `executionEmailTemplates`
```typescript
{
  _id: ObjectId,
  workflowCatalogId: ObjectId, // Reference to workflowCatalog
  subjectTemplate: string, // Handlebars template for subject
  bodyTemplate: string, // Handlebars template for body
  isActive: boolean,
  createdAt: Date,
  updatedAt: Date
}
```

#### `userWorkflowUsage`
```typescript
{
  _id: ObjectId,
  userId: ObjectId, // Reference to users
  workspaceId: ObjectId, // Reference to workspaces
  workflowCatalogId: ObjectId, // Reference to workflowCatalog
  totalExecutions: number,
  totalCost: number, // Total cost incurred using platform keys
  lastExecutedAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

#### `customerApiKeys`
```typescript
{
  _id: ObjectId,
  userId: ObjectId, // Reference to users
  workspaceId: ObjectId, // Reference to workspaces
  provider: 'openrouter', // Currently only OpenRouter
  keyName: string, // User-friendly name for the key
  encryptedApiKey: string, // Encrypted API key
  isActive: boolean,
  lastUsedAt?: Date,
  totalUsage: {
    executions: number,
    tokensUsed: number,
    lastResetAt: Date
  },
  createdAt: Date,
  updatedAt: Date
}
```

#### `platformUsageBilling`
```typescript
{
  _id: ObjectId,
  userId: ObjectId, // Reference to users
  workspaceId: ObjectId, // Reference to workspaces
  month: string, // Format: 'YYYY-MM'
  usage: {
    totalExecutions: number,
    totalCost: number,
    totalTokens: number,
    byWorkflow: [{
      workflowId: ObjectId,
      executions: number,
      cost: number,
      tokens: number
    }]
  },
  billingStatus: 'pending' | 'billed' | 'paid',
  billedAt?: Date,
  paidAt?: Date,
  createdAt: Date,
  updatedAt: Date
}
```

## API Design

### API Key Management APIs

#### 1. Customer API Key Management
```typescript
// Customer API key operations
GET /api/engines/api-keys - Get user's API keys
POST /api/engines/api-keys - Add new API key
PUT /api/engines/api-keys/{id} - Update API key
DELETE /api/engines/api-keys/{id} - Delete API key
POST /api/engines/api-keys/{id}/validate - Validate API key
```

#### 2. Usage & Billing APIs
```typescript
// Usage tracking and billing
GET /api/engines/usage/current - Current month usage
GET /api/engines/usage/history - Usage history
GET /api/engines/billing/current - Current billing status
GET /api/engines/billing/history - Billing history
```

### n8n Integration APIs

#### 1. Workflow Management
```typescript
// Sync workflows from n8n instance
GET /api/engines/sync-workflows
POST /api/engines/workflows/{id}/execute
GET /api/engines/workflows/{id}/status
```

#### 2. Execution Management
```typescript
// Customer-facing execution APIs
GET /api/engines/catalog - Get available workflows
POST /api/engines/execute/{workflowId} - Execute workflow with API key choice
// Body: { parameters: object, useCustomApiKey?: boolean, apiKeyId?: string }
GET /api/engines/executions - Get user's execution history
GET /api/engines/executions/{id} - Get specific execution details
GET /api/engines/executions/{id}/results - Get execution results
GET /api/engines/executions/{id}/cost - Get execution cost breakdown
POST /api/engines/executions/{id}/email - Send results via email
```

#### 3. Admin APIs
```typescript
// Admin workflow management
GET /api/admin/engines/workflows - Manage workflow catalog
PUT /api/admin/engines/workflows/{id} - Update workflow metadata
POST /api/admin/engines/categories - Manage categories
GET /api/admin/engines/usage - Usage analytics
```

## Frontend Components Structure

### 1. Workflow Catalog Page (`/engines`)
```
components/engines/
├── WorkflowCatalog.tsx - Main catalog view
├── WorkflowCard.tsx - Individual workflow display with cost info
├── WorkflowFilters.tsx - Category and search filters
├── WorkflowExecuteModal.tsx - Execution parameter input + API key selection
├── ExecutionHistory.tsx - User's execution history
├── ApiKeySelector.tsx - Choose between customer/platform API keys
└── CostEstimator.tsx - Show estimated execution cost
```

### 2. Workflow Detail Page (`/engines/workflow/[id]`)
```
components/engines/workflow/
├── WorkflowDetail.tsx - Workflow information
├── ParameterForm.tsx - Input parameter form
├── ExecutionButton.tsx - Execute workflow button
└── ResultsDisplay.tsx - Show execution results
```

### 3. Execution Monitoring (`/engines/executions`)
```
components/engines/executions/
├── ExecutionList.tsx - List of executions with cost info
├── ExecutionStatus.tsx - Status indicator
├── ExecutionResults.tsx - Results viewer
├── ExecutionCostBreakdown.tsx - Show cost details
├── EmailResultsButton.tsx - Send results via email
└── UsageDashboard.tsx - Monthly usage and billing overview
```

### 4. API Key Management (`/engines/api-keys`)
```
components/engines/api-keys/
├── ApiKeyList.tsx - List user's API keys
├── AddApiKeyModal.tsx - Add new OpenRouter API key
├── ApiKeyCard.tsx - Individual API key display
├── ApiKeyValidator.tsx - Validate API key functionality
└── UsageStats.tsx - API key usage statistics
```

### 5. Billing & Usage (`/engines/billing`)
```
components/engines/billing/
├── BillingDashboard.tsx - Current month overview
├── UsageChart.tsx - Usage visualization
├── BillingHistory.tsx - Past billing records
├── CostBreakdown.tsx - Detailed cost analysis
└── PaymentStatus.tsx - Payment status and actions
```

## Implementation Phases

### Phase 1: Core Infrastructure (Week 1-2)
1. **MongoDB Schema Setup**
   - Create all required MongoDB models
   - Set up indexes for performance
   - Create seed data for categories and sample workflows

2. **API Key Management System**
   - Create customer API key encryption/decryption utilities
   - Implement OpenRouter API key validation
   - Set up platform API key pool management

3. **n8n API Integration**
   - Create n8n API client in `lib/api/n8nApi.ts`
   - Implement workflow fetching and execution
   - Set up authentication with n8n instance

4. **Basic RTK Query Setup**
   - Create `enginesApi.ts` for workflow operations
   - Create `apiKeysApi.ts` for API key management
   - Add to Redux store configuration
   - Implement basic CRUD operations

### Phase 2: Workflow Catalog & API Key Management (Week 2-3)
1. **Workflow Sync System**
   - Admin command to sync workflows from n8n
   - Automatic categorization logic
   - Workflow metadata management with API requirements

2. **API Key Management Frontend**
   - API key addition and management interface
   - OpenRouter key validation and testing
   - Usage statistics display

3. **Catalog Frontend**
   - Workflow catalog page with cost indicators
   - Search and filtering functionality
   - Workflow detail views with API key requirements

4. **Basic Execution with API Key Selection**
   - API key selection during execution
   - Parameter input forms
   - Execution status tracking
   - Cost calculation and display

### Phase 3: Billing & Results System (Week 3-4)
1. **Usage Tracking & Billing**
   - Real-time cost calculation
   - Monthly usage aggregation
   - Billing record generation
   - Payment integration preparation

2. **Results Processing**
   - Capture and store execution outputs
   - Format results for display
   - Handle different output types
   - Cost breakdown per execution

3. **Email Integration**
   - Email template system
   - Result formatting for email
   - Email delivery tracking

4. **Execution History with Billing**
   - User execution history with costs
   - Result archiving
   - Performance metrics
   - Usage analytics dashboard

### Phase 4: Advanced Features & Optimization (Week 4-5)
1. **Advanced Billing Features**
   - Payment gateway integration
   - Automated billing cycles
   - Usage alerts and limits
   - Cost optimization recommendations

2. **Advanced Permissions**
   - Workspace-based access control
   - Rate limiting implementation
   - Usage quotas per workspace
   - API key sharing permissions

3. **Admin Dashboard**
   - Workflow management interface
   - Platform-wide usage analytics
   - Revenue tracking
   - Cost optimization insights
   - API key pool management

## Technical Considerations

### 1. n8n Instance Configuration
- **API Access**: Ensure n8n instance has API enabled
- **Webhooks**: Configure webhook URLs for execution status
- **Security**: Set up proper API key management
- **Scaling**: Consider n8n instance performance with high usage

### 2. Error Handling
- **n8n Connectivity**: Handle API failures gracefully
- **Workflow Failures**: Capture and display execution errors
- **Email Delivery**: Handle email service failures
- **Rate Limiting**: Implement queue system for high-volume usage

### 3. Performance Optimization
- **Caching**: Cache workflow metadata and results
- **Background Jobs**: Queue email sending and heavy operations
- **Database Indexing**: Optimize for execution history queries
- **Result Storage**: Consider file storage for large outputs

### 4. Security Measures
- **Input Validation**: Sanitize all workflow parameters
- **Output Filtering**: Filter sensitive data from results
- **Access Control**: Workspace-based permissions
- **Audit Logging**: Track all user actions

## Configuration Requirements

### Environment Variables
```env
# n8n Integration
N8N_BASE_URL=https://your-n8n-instance.com
N8N_API_KEY=your_n8n_api_key
N8N_WEBHOOK_URL=https://your-crm.com/api/webhooks/n8n

# OpenRouter Integration
OPENROUTER_API_URL=https://openrouter.ai/api/v1
PLATFORM_OPENROUTER_API_KEY=your_platform_openrouter_key
OPENROUTER_APP_NAME=CRM-X-SHIVAY
OPENROUTER_APP_URL=https://your-crm.com

# API Key Encryption
API_KEY_ENCRYPTION_SECRET=your_api_key_encryption_secret

# Email Configuration (for results)
SMTP_HOST=your-smtp-server.com
SMTP_PORT=587
SMTP_USER=your-smtp-user
SMTP_PASS=your-smtp-password

# Execution Engine Settings
MAX_EXECUTIONS_PER_USER_PER_HOUR=50
MAX_CONCURRENT_EXECUTIONS=10
RESULT_RETENTION_DAYS=90

# Billing Settings
PLATFORM_API_MARKUP_PERCENTAGE=20 # 20% markup on platform API usage
FREE_TIER_MONTHLY_ALLOWANCE=10 # $10 free per month
BILLING_CYCLE_DAY=1 # Bill on 1st of each month
```

### n8n Webhook Configuration
- Set up webhook endpoint to receive execution status updates
- Configure retry logic for failed webhook deliveries
- Implement signature verification for security

## Success Metrics

### Key Performance Indicators
1. **Usage Metrics**
   - Total workflow executions per day/week/month
   - Unique users executing workflows
   - Most popular workflows

2. **Performance Metrics**
   - Average execution time
   - Success rate (completed vs failed executions)
   - Email delivery success rate

3. **User Engagement**
   - Workflows per user
   - Return usage rate
   - User feedback on workflow results

## Future Enhancements

### Planned Features
1. **Workflow Scheduling**: Allow users to schedule recurring executions
2. **Custom Workflows**: Let users create their own workflows
3. **Workflow Marketplace**: Community sharing of workflows
4. **API Access**: Provide API for external integrations
5. **Mobile App**: Mobile interface for execution monitoring
6. **Real-time Notifications**: WebSocket-based status updates

## Risk Mitigation

### Potential Issues & Solutions
1. **n8n Instance Overload**: Implement execution queuing and rate limiting
2. **Large Result Sets**: Use pagination and result streaming
3. **Email Spam**: Implement email frequency limits and user preferences
4. **Data Privacy**: Ensure workflow results don't contain sensitive data
5. **API Key Security**: Encrypt customer API keys, secure key validation
6. **Cost Management**: Monitor and limit resource usage per workspace
7. **Billing Accuracy**: Ensure accurate cost tracking and billing
8. **API Key Abuse**: Implement rate limiting and usage monitoring
9. **OpenRouter Rate Limits**: Handle API rate limits gracefully
10. **Payment Failures**: Implement retry logic and grace periods

This execution engine will transform your n8n workflows into a customer-accessible service, providing value through automation while maintaining control and monitoring capabilities.