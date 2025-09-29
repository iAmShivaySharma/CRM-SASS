# CRM-X-SHIVAY Documentation

## Volume 4: Development Guide

---

### 📖 Navigation

- [← Volume 3: Database Schema](./03-DATABASE-SCHEMA.md)
- [→ Volume 5: Deployment & Security](./05-DEPLOYMENT-SECURITY.md)

---

## 🚀 Quick Start

### Prerequisites

- **Node.js**: 18.0+ (LTS recommended)
- **npm**: 9.0+ (comes with Node.js)
- **MongoDB**: 5.0+ (local or cloud instance)
- **Git**: Latest version
- **VS Code**: Recommended IDE with TypeScript support

### Environment Setup

1. **Clone the Repository**

```bash
git clone <repository-url>
cd CRM-X-SHIVAY
```

2. **Install Dependencies**

```bash
npm install
```

3. **Environment Configuration**

```bash
# Copy environment file
cp .env.example .env

# Edit environment variables
nano .env  # or use your preferred editor
```

4. **Required Environment Variables**

```env
# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/crm_database

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d

# Optional: Dodo Payments Integration
DODO_API_KEY=your_dodo_api_key
NEXT_PUBLIC_DODO_PUBLIC_KEY=your_dodo_public_key
DODO_WEBHOOK_SECRET=your_dodo_webhook_secret

# Optional: CORS Configuration
CORS_ORIGINS=http://localhost:3000,https://yourdomain.com

# Optional: Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

5. **Database Seeding**

```bash
# Seed database with default data
npm run db:seed
```

6. **Start Development Server**

```bash
npm run dev
```

The application will be available at `http://localhost:3000`

### Default Login Credentials

After seeding, use these credentials:

- **Admin**: `admin@crm.com` / `Admin123!@#`
- **Manager**: `manager@crm.com` / `Manager123!@#`
- **Sales**: `sales@crm.com` / `Sales123!@#`

---

## 🏗️ Project Architecture

### Directory Structure

```
CRM-X-SHIVAY/
├── app/                          # Next.js app directory
│   ├── (auth)/                  # Authentication pages group
│   │   ├── login/
│   │   ├── register/
│   │   └── layout.tsx
│   ├── (dashboard)/             # Protected dashboard pages
│   │   ├── analytics/
│   │   ├── contacts/
│   │   ├── leads/
│   │   ├── settings/
│   │   ├── webhooks/
│   │   └── layout.tsx
│   ├── api/                     # API route handlers
│   │   ├── auth/               # Authentication endpoints
│   │   ├── leads/              # Lead management
│   │   ├── contacts/           # Contact management
│   │   ├── webhooks/           # Webhook processing
│   │   ├── roles/              # Role management
│   │   └── workspaces/         # Workspace management
│   ├── globals.css             # Global styles
│   ├── layout.tsx              # Root layout
│   └── page.tsx                # Landing page
├── components/                  # React components
│   ├── auth/                   # Authentication components
│   ├── contacts/               # Contact management
│   ├── dashboard/              # Dashboard components
│   ├── layout/                 # Layout components
│   ├── leads/                  # Lead management
│   ├── providers/              # Context providers
│   ├── roles/                  # Role management
│   ├── theme/                  # Theme components
│   ├── ui/                     # UI primitives (Radix)
│   └── webhooks/               # Webhook components
├── lib/                        # Utility libraries
│   ├── api/                    # API client layers
│   ├── hooks.ts                # Custom hooks
│   ├── logging/                # Logging system
│   ├── middleware/             # Custom middleware
│   ├── mongodb/                # Database layer
│   │   ├── client.ts           # MongoDB client
│   │   ├── connection.ts       # Connection management
│   │   └── models/             # Mongoose models
│   ├── security/               # Security utilities
│   ├── slices/                 # Redux slices
│   ├── utils/                  # Utility functions
│   ├── validation/             # Schema validation
│   ├── webhooks/               # Webhook processors
│   ├── store.ts                # Redux store
│   └── utils.ts                # Common utilities
├── docs/                       # Documentation
├── scripts/                    # Build and utility scripts
├── middleware.ts               # Next.js middleware
├── tailwind.config.ts          # Tailwind configuration
├── next.config.js              # Next.js configuration
├── tsconfig.json               # TypeScript configuration
└── package.json                # Dependencies and scripts
```

### Technology Stack Details

#### Frontend Stack

- **Next.js 13.5.1**: React framework with App Router
- **TypeScript**: Static type checking and IntelliSense
- **Tailwind CSS**: Utility-first styling framework
- **Radix UI**: Accessible component primitives
- **Redux Toolkit**: State management with RTK Query
- **React Hook Form**: Form handling with validation
- **Zod**: Schema validation library
- **Lucide Icons**: Icon library

#### Backend Stack

- **Next.js API Routes**: Server-side endpoints
- **MongoDB**: NoSQL database
- **Mongoose**: Object modeling for MongoDB
- **JWT (jose)**: Authentication tokens
- **Winston**: Logging framework
- **Crypto**: Webhook signature verification

#### Development Tools

- **ESLint**: Code linting and formatting
- **TypeScript**: Type checking
- **Postman**: API testing
- **VS Code**: Recommended IDE

---

## 💻 Development Workflow

### Available Scripts

```bash
# Development
npm run dev              # Start development server with hot reload
npm run build            # Build production version
npm run start            # Start production server
npm run lint             # Run ESLint checks

# Database
npm run db:seed          # Seed database with sample data
npm run db:reset         # Reset and re-seed database

# Testing
npm run test             # Run test suite (when implemented)
npm run test:watch       # Run tests in watch mode
```

### Code Style Guidelines

1. **TypeScript First**
   - Use TypeScript for all files
   - Define proper interfaces and types
   - Avoid `any` type usage
   - Use strict mode settings

2. **Component Structure**

   ```typescript
   // components/example/ExampleComponent.tsx
   import { useState } from 'react';
   import { Button } from '@/components/ui/button';

   interface ExampleComponentProps {
     title: string;
     onAction?: () => void;
   }

   export function ExampleComponent({ title, onAction }: ExampleComponentProps) {
     const [isLoading, setIsLoading] = useState(false);

     const handleClick = async () => {
       setIsLoading(true);
       try {
         await onAction?.();
       } finally {
         setIsLoading(false);
       }
     };

     return (
       <div className="space-y-4">
         <h2 className="text-xl font-semibold">{title}</h2>
         <Button onClick={handleClick} disabled={isLoading}>
           {isLoading ? 'Loading...' : 'Action'}
         </Button>
       </div>
     );
   }
   ```

3. **API Route Structure**

   ```typescript
   // app/api/example/route.ts
   import { NextRequest, NextResponse } from 'next/server'
   import { verifyAuthToken } from '@/lib/mongodb/auth'
   import { withLogging, withSecurityLogging } from '@/lib/logging/middleware'
   import { z } from 'zod'

   const requestSchema = z.object({
     name: z.string().min(1).max(100),
     email: z.string().email(),
   })

   export const GET = withSecurityLogging(
     withLogging(async (request: NextRequest) => {
       try {
         const auth = await verifyAuthToken(request)
         if (!auth) {
           return NextResponse.json(
             { message: 'Unauthorized' },
             { status: 401 }
           )
         }

         // Implementation here

         return NextResponse.json({ success: true, data: [] })
       } catch (error) {
         return NextResponse.json(
           { message: 'Internal server error' },
           { status: 500 }
         )
       }
     })
   )
   ```

4. **Database Model Structure**

   ```typescript
   // lib/mongodb/models/Example.ts
   import mongoose, { Schema, Document } from 'mongoose'

   export interface IExample extends Document {
     name: string
     workspaceId: string
     createdAt: Date
     updatedAt: Date
   }

   const ExampleSchema = new Schema(
     {
       name: { type: String, required: true, maxlength: 100 },
       workspaceId: {
         type: Schema.Types.ObjectId,
         ref: 'Workspace',
         required: true,
       },
     },
     {
       timestamps: true,
       toJSON: { virtuals: true },
       toObject: { virtuals: true },
     }
   )

   ExampleSchema.index({ workspaceId: 1, name: 1 })

   export const Example =
     mongoose.models.Example ||
     mongoose.model<IExample>('Example', ExampleSchema)
   ```

### Git Workflow

1. **Branch Naming**
   - `feature/feature-name` - New features
   - `bugfix/bug-description` - Bug fixes
   - `hotfix/critical-fix` - Critical fixes
   - `docs/documentation-update` - Documentation

2. **Commit Messages**

   ```
   feat: add user profile management
   fix: resolve webhook signature validation
   docs: update API documentation
   refactor: improve database query performance
   test: add unit tests for lead validation
   ```

3. **Pull Request Process**
   - Create feature branch from `main`
   - Implement feature with tests
   - Update documentation if needed
   - Submit PR with clear description
   - Code review and approval
   - Merge to main

---

## 🔧 Development Tools Setup

### VS Code Configuration

**Recommended Extensions:**

```json
{
  "recommendations": [
    "ms-vscode.vscode-typescript-next",
    "bradlc.vscode-tailwindcss",
    "esbenp.prettier-vscode",
    "ms-vscode.vscode-eslint",
    "mongodb.mongodb-vscode",
    "postman.postman-for-vscode"
  ]
}
```

**Settings (.vscode/settings.json):**

```json
{
  "typescript.preferences.importModuleSpecifier": "relative",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "tailwindCSS.experimental.classRegex": [["cn\\(([^)]*)\\)", "'([^']*)'"]]
}
```

### ESLint Configuration

The project uses ESLint with TypeScript and Next.js rules:

```javascript
// .eslintrc.json
{
  "extends": ["next/core-web-vitals", "@next/eslint-plugin-next"],
  "rules": {
    "@typescript-eslint/no-unused-vars": "error",
    "@typescript-eslint/no-explicit-any": "warn",
    "prefer-const": "error",
    "no-console": "warn"
  }
}
```

---

## 🗃️ Database Development

### MongoDB Setup

1. **Local Development**

   ```bash
   # Install MongoDB Community Edition
   # macOS
   brew install mongodb-community
   brew services start mongodb-community

   # Ubuntu
   sudo apt install mongodb
   sudo systemctl start mongod

   # Windows
   # Download and install from MongoDB website
   ```

2. **MongoDB Compass** (Recommended GUI)
   - Download from MongoDB website
   - Connect to `mongodb://localhost:27017`
   - Browse collections and data

3. **Database Seeding**

   ```bash
   # Reset and seed database
   npm run db:seed

   # Custom seeding
   node scripts/seed-mongodb.ts
   ```

### Model Development

1. **Creating New Models**

   ```typescript
   // 1. Define interface
   export interface INewModel extends Document {
     name: string
     workspaceId: string
   }

   // 2. Create schema
   const NewModelSchema = new Schema(
     {
       name: { type: String, required: true },
       workspaceId: {
         type: Schema.Types.ObjectId,
         ref: 'Workspace',
         required: true,
       },
     },
     { timestamps: true }
   )

   // 3. Add indexes
   NewModelSchema.index({ workspaceId: 1, name: 1 })

   // 4. Export model
   export const NewModel =
     mongoose.models.NewModel ||
     mongoose.model<INewModel>('NewModel', NewModelSchema)
   ```

2. **Adding to Client**

   ```typescript
   // lib/mongodb/client.ts
   import { NewModel } from './models/NewModel'

   class MongoDBClient {
     // Add CRUD methods
     async createNewModel(data: any) {
       return await NewModel.create(data)
     }

     async getNewModels(workspaceId: string) {
       return await NewModel.find({ workspaceId })
     }
   }
   ```

---

## 🔌 API Development

### Creating New Endpoints

1. **Create Route Handler**

   ```typescript
   // app/api/new-endpoint/route.ts
   import { NextRequest, NextResponse } from 'next/server'
   import { verifyAuthToken } from '@/lib/mongodb/auth'
   import { withLogging, withSecurityLogging } from '@/lib/logging/middleware'

   export const GET = withSecurityLogging(
     withLogging(async (request: NextRequest) => {
       // Implementation
     })
   )
   ```

2. **Add RTK Query Endpoint**

   ```typescript
   // lib/api/newApi.ts
   import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

   export const newApi = createApi({
     reducerPath: 'newApi',
     baseQuery: fetchBaseQuery({
       baseUrl: '/api/new-endpoint',
       prepareHeaders: (headers, { getState }) => {
         const token = (getState() as RootState).auth.token
         if (token) {
           headers.set('authorization', `Bearer ${token}`)
         }
         return headers
       },
     }),
     tagTypes: ['NewItem'],
     endpoints: builder => ({
       getNewItems: builder.query<any[], void>({
         query: () => '',
         providesTags: ['NewItem'],
       }),
       createNewItem: builder.mutation<any, any>({
         query: data => ({
           url: '',
           method: 'POST',
           body: data,
         }),
         invalidatesTags: ['NewItem'],
       }),
     }),
   })

   export const { useGetNewItemsQuery, useCreateNewItemMutation } = newApi
   ```

3. **Add to Store**

   ```typescript
   // lib/store.ts
   import { newApi } from './api/newApi'

   export const store = configureStore({
     reducer: {
       // ... existing reducers
       [newApi.reducerPath]: newApi.reducer,
     },
     middleware: getDefaultMiddleware =>
       getDefaultMiddleware().concat(
         // ... existing middleware
         newApi.middleware
       ),
   })
   ```

### Validation Patterns

1. **Input Validation**

   ```typescript
   import { z } from 'zod'

   const createItemSchema = z.object({
     name: z.string().min(1).max(100),
     email: z.string().email().optional(),
     workspaceId: z.string().regex(/^[a-f\d]{24}$/i),
   })

   // In route handler
   const validationResult = createItemSchema.safeParse(body)
   if (!validationResult.success) {
     return NextResponse.json(
       { message: 'Validation failed', errors: validationResult.error.errors },
       { status: 400 }
     )
   }
   ```

2. **Permission Checking**

   ```typescript
   // Check workspace access
   const member = await WorkspaceMember.findOne({
     userId: auth.user.id,
     workspaceId,
     status: 'active',
   })

   if (!member) {
     return NextResponse.json({ message: 'Access denied' }, { status: 403 })
   }

   // Check specific permissions
   if (!member.permissions.includes('leads:write')) {
     return NextResponse.json(
       { message: 'Insufficient permissions' },
       { status: 403 }
     )
   }
   ```

---

## 🎨 Frontend Development

### Component Development

1. **UI Components** (Radix + Tailwind)

   ```typescript
   // components/ui/custom-button.tsx
   import * as React from 'react';
   import { Slot } from '@radix-ui/react-slot';
   import { cn } from '@/lib/utils';

   export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
     asChild?: boolean;
     variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
     size?: 'default' | 'sm' | 'lg' | 'icon';
   }

   const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
     ({ className, variant = 'default', size = 'default', asChild = false, ...props }, ref) => {
       const Comp = asChild ? Slot : 'button';
       return (
         <Comp
           className={cn(buttonVariants({ variant, size, className }))}
           ref={ref}
           {...props}
         />
       );
     }
   );
   ```

2. **Feature Components**

   ```typescript
   // components/leads/LeadForm.tsx
   import { useForm } from 'react-hook-form';
   import { zodResolver } from '@hookform/resolvers/zod';
   import { useCreateLeadMutation } from '@/lib/api/mongoApi';

   export function LeadForm() {
     const [createLead, { isLoading }] = useCreateLeadMutation();

     const form = useForm({
       resolver: zodResolver(leadSchema),
       defaultValues: {
         name: '',
         email: '',
         // ...
       }
     });

     const onSubmit = async (data: any) => {
       try {
         await createLead(data).unwrap();
         // Handle success
       } catch (error) {
         // Handle error
       }
     };

     return (
       <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
         {/* Form fields */}
       </form>
     );
   }
   ```

### State Management

1. **Redux Slices**

   ```typescript
   // lib/slices/exampleSlice.ts
   import { createSlice, PayloadAction } from '@reduxjs/toolkit'

   interface ExampleState {
     items: any[]
     loading: boolean
     error: string | null
   }

   const initialState: ExampleState = {
     items: [],
     loading: false,
     error: null,
   }

   export const exampleSlice = createSlice({
     name: 'example',
     initialState,
     reducers: {
       setItems: (state, action: PayloadAction<any[]>) => {
         state.items = action.payload
       },
       setLoading: (state, action: PayloadAction<boolean>) => {
         state.loading = action.payload
       },
     },
   })
   ```

2. **Custom Hooks**

   ```typescript
   // lib/hooks.ts
   import { useSelector } from 'react-redux'
   import { RootState } from './store'

   export const useAuth = () => {
     return useSelector((state: RootState) => state.auth)
   }

   export const useWorkspace = () => {
     return useSelector((state: RootState) => state.workspace)
   }
   ```

---

## 🧪 Testing Strategy

### Unit Testing Setup

```bash
# Install testing dependencies
npm install --save-dev @testing-library/react @testing-library/jest-dom jest jest-environment-jsdom
```

### Component Testing

```typescript
// components/__tests__/Button.test.tsx
import { render, screen } from '@testing-library/react';
import { Button } from '../ui/button';

describe('Button Component', () => {
  it('renders correctly', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });
});
```

### API Testing

```typescript
// __tests__/api/leads.test.ts
import { createMocks } from 'node-mocks-http'
import handler from '../../app/api/leads/route'

describe('/api/leads', () => {
  it('should return leads', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      headers: { authorization: 'Bearer valid-token' },
    })

    await handler(req, res)
    expect(res._getStatusCode()).toBe(200)
  })
})
```

---

## 🚦 Performance Optimization

### Database Optimization

- Strategic indexing for frequent queries
- Pagination for large datasets
- Connection pooling
- Query optimization

### Frontend Optimization

- Component lazy loading
- Image optimization
- Bundle splitting
- Caching strategies

### API Optimization

- Response compression
- Rate limiting
- Caching headers
- Middleware optimization

---

**Next**: [Volume 5: Deployment & Security](./05-DEPLOYMENT-SECURITY.md)

**Last Updated**: 2025-09-23
**Version**: 2.0.0
