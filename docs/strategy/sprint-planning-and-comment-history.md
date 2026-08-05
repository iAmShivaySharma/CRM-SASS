# Sprint Planning & Comment Edit History — Implementation Plan

## Overview

Two new features for the project & task management module:

1. **Sprint Planning** — Create sprints, assign tasks, track progress, view sprint history
2. **Comment Edit History** — Comments on tasks/projects with full edit audit trail

---

## Feature 1: Sprint Planning

### 1.1 New Model: Sprint

**Create**: `lib/mongodb/models/Sprint.ts`

```ts
interface ISprint {
  _id: string
  name: string // e.g., "Sprint 14"
  goal?: string // Sprint goal description
  projectId: string // ref: Project
  workspaceId: string // ref: Workspace
  status: 'planning' | 'active' | 'completed' | 'cancelled'
  startDate: Date
  endDate: Date
  createdBy: string // ref: User
  completedAt?: Date
  createdAt: Date
  updatedAt: Date
}
```

**Indexes:**

- `{ projectId: 1, status: 1 }`
- `{ workspaceId: 1, projectId: 1, startDate: -1 }`

**Constraint:** Only one sprint per project can be `active` at a time (enforced at application level).

### 1.2 Task Model Modification

**Modify**: `lib/mongodb/models/Task.ts`

Add field:

- `sprintId?: string` (ref: Sprint) — nullable, tasks without a sprint live in the backlog

Add index: `{ sprintId: 1, status: 1, order: 1 }`

### 1.3 Model Registration

**Modify:**

- `lib/mongodb/models/index.ts` — export Sprint
- `lib/mongodb/client.ts` — import and export Sprint

### 1.4 API Routes

**Create** under `app/api/sprints/`:

| Route                    | Methods          | Purpose                                                                                     |
| ------------------------ | ---------------- | ------------------------------------------------------------------------------------------- |
| `route.ts`               | GET, POST        | List sprints for a project / Create sprint                                                  |
| `[id]/route.ts`          | GET, PUT, DELETE | Get sprint with stats / Update / Delete (planning only)                                     |
| `[id]/start/route.ts`    | POST             | Transition from `planning` → `active` (validates no other active sprint)                    |
| `[id]/complete/route.ts` | POST             | Transition from `active` → `completed`, body: `{ moveIncompleteTo: 'backlog' \| sprintId }` |
| `[id]/tasks/route.ts`    | POST             | Bulk assign/unassign tasks: `{ taskIds, action: 'add' \| 'remove' }`                        |

**Modify existing:**

- `app/api/tasks/route.ts` — add `sprintId` to create schema & GET query filter
- `app/api/tasks/[id]/route.ts` — add `sprintId` to update schema (allow `null` to unassign)

### 1.5 RTK Query (Frontend API)

**Modify**: `lib/api/projectsApi.ts`

Add `'Sprint'` to `tagTypes`, add endpoints:

- `getSprints` — query `{ projectId, status? }`
- `getSprint` — query `{ id }`
- `createSprint` — mutation
- `updateSprint` — mutation
- `deleteSprint` — mutation
- `startSprint` — mutation, invalidates `['Sprint', 'Task']`
- `completeSprint` — mutation, invalidates `['Sprint', 'Task']`
- `assignTasksToSprint` — mutation, invalidates `['Sprint', 'Task']`

Update existing `Task` interface to include `sprintId?: string`.

### 1.6 Frontend Components

**Create** under `components/projects/`:

| Component                    | Purpose                                                                          |
| ---------------------------- | -------------------------------------------------------------------------------- |
| `SprintBoard.tsx`            | Main view — active sprint tasks + backlog, drag-and-drop between them            |
| `SprintManagementDialog.tsx` | Create/edit sprint form (name, goal, dates)                                      |
| `SprintHeader.tsx`           | Sprint info bar — name, goal, dates, progress bar, Start/Complete buttons        |
| `SprintCompletionDialog.tsx` | Completion summary — X done, Y incomplete, choose where to move incomplete tasks |
| `SprintHistory.tsx`          | List of past sprints with velocity (completed task count)                        |

### 1.7 Page Integration

**Modify**: `app/(dashboard)/projects/[id]/page.tsx`

Add a new **"Sprints"** tab alongside existing Tasks, Members, Documents tabs:

- Tab content renders `SprintBoard` (active sprint + backlog)
- Toggle to view `SprintHistory`

---

## Feature 2: Comment Edit History

### 2.1 New Model: Comment

**Create**: `lib/mongodb/models/Comment.ts`

```ts
interface IComment {
  _id: string
  content: string // Current content
  entityType: 'task' | 'project' | 'document'
  entityId: string // ID of the parent entity
  parentId?: string // For threaded replies (ref: Comment)
  workspaceId: string // ref: Workspace
  createdBy: string // ref: User
  isEdited: boolean
  editedAt?: Date
  editHistory: [
    {
      content: string // Previous content before this edit
      editedBy: string // ref: User
      editedAt: Date
    },
  ]
  isDeleted: boolean // Soft delete
  deletedAt?: Date
  deletedBy?: string // ref: User
  createdAt: Date
  updatedAt: Date
}
```

**Edit flow:**

1. Push current `content` into `editHistory` with `editedBy` and `editedAt`
2. Replace `content` with new text
3. Set `isEdited = true`, `editedAt = now`

**Indexes:**

- `{ entityType: 1, entityId: 1, createdAt: 1 }`
- `{ parentId: 1 }`

### 2.2 Model Registration

**Modify:**

- `lib/mongodb/models/index.ts` — export Comment
- `lib/mongodb/client.ts` — import and export Comment

### 2.3 API Routes

**Create** under `app/api/comments/`:

| Route                   | Methods          | Purpose                                                     |
| ----------------------- | ---------------- | ----------------------------------------------------------- |
| `route.ts`              | GET, POST        | List comments for an entity / Create comment                |
| `[id]/route.ts`         | GET, PUT, DELETE | Get single comment / Edit (pushes to history) / Soft delete |
| `[id]/history/route.ts` | GET              | Full edit history for a comment                             |

**Edit (PUT) logic:**

1. Load current comment
2. Push `{ content: current.content, editedBy: userId, editedAt: new Date() }` into `editHistory`
3. Set new content, `isEdited = true`, `editedAt = new Date()`
4. Only comment author or workspace admin can edit

### 2.4 RTK Query (Frontend API)

**Create**: `lib/api/commentsApi.ts`

```ts
// New API slice
reducerPath: 'commentsApi'
tagTypes: ['Comment']

Endpoints:
  getComments      — query { entityType, entityId }
  createComment    — mutation { content, entityType, entityId, parentId? }
  updateComment    — mutation { id, content }
  deleteComment    — mutation { id }
  getCommentHistory — query { commentId }
```

**Modify**: `lib/store.ts` — register `commentsApi` reducer and middleware

### 2.5 Frontend Components

**Create** under `components/projects/`:

| Component                      | Purpose                                                                                  |
| ------------------------------ | ---------------------------------------------------------------------------------------- |
| `CommentSection.tsx`           | Reusable comment list + input. Props: `{ entityType, entityId }`                         |
| `CommentItem.tsx`              | Single comment — avatar, name, timestamp, content, "(edited)" badge, edit/delete actions |
| `CommentInput.tsx`             | Textarea with submit — handles both new and edit modes                                   |
| `CommentEditHistoryDialog.tsx` | Dialog showing all versions with who edited and when                                     |

### 2.6 Page Integration

**Create**: `components/projects/TaskDetailDrawer.tsx`

- Opens when clicking a task card
- Shows full task details (title, description, assignee, status, etc.)
- Includes `CommentSection` at the bottom with `entityType="task"`

**Modify**: `components/projects/TaskCard.tsx` / `KanbanBoard.tsx`

- Wire click to open `TaskDetailDrawer`

---

## Implementation Order

### Phase 1: Comments (build first — simpler, establishes patterns)

1. `Comment` model + registration
2. Comment API routes (3 files)
3. `commentsApi.ts` + store registration
4. `CommentInput`, `CommentItem`, `CommentSection` components
5. `CommentEditHistoryDialog`
6. `TaskDetailDrawer` — integrate CommentSection
7. Wire TaskCard click → TaskDetailDrawer

### Phase 2: Sprint Planning

1. `Sprint` model + registration
2. Add `sprintId` to Task model
3. Sprint API routes (5 files)
4. Modify task API routes for sprintId support
5. Add Sprint endpoints to `projectsApi.ts`
6. `SprintManagementDialog`, `SprintHeader` components
7. `SprintBoard` with backlog + active sprint
8. `SprintCompletionDialog`
9. `SprintHistory`
10. Add Sprints tab to project detail page

### Phase 3: Polish

1. Sprint filter on global tasks page (`app/(dashboard)/projects/tasks/page.tsx`)
2. Sprint badge on `TaskCard.tsx`
3. Comment count indicator on `TaskCard.tsx`
4. Sprint velocity chart in project analytics

---

## Key Files to Modify

| File                                     | Change                                        |
| ---------------------------------------- | --------------------------------------------- |
| `lib/mongodb/models/Task.ts`             | Add `sprintId` field                          |
| `lib/mongodb/models/index.ts`            | Export Sprint, Comment                        |
| `lib/mongodb/client.ts`                  | Import/export Sprint, Comment                 |
| `lib/api/projectsApi.ts`                 | Add Sprint endpoints, update Task interface   |
| `lib/store.ts`                           | Register commentsApi                          |
| `app/api/tasks/route.ts`                 | Add `sprintId` to create schema & GET filter  |
| `app/api/tasks/[id]/route.ts`            | Add `sprintId` to update schema               |
| `app/(dashboard)/projects/[id]/page.tsx` | Add Sprints tab, TaskDetailDrawer integration |

## Patterns to Follow

| Concern          | Reference File                                                                |
| ---------------- | ----------------------------------------------------------------------------- |
| Model definition | `lib/mongodb/models/Task.ts` — string IDs, `toJSON` transform                 |
| API routes       | `app/api/tasks/route.ts` — `verifyAuthToken`, Zod, `withLogging`              |
| RTK Query        | `lib/api/projectsApi.ts` — `createApi`, tags, optimistic updates              |
| Edit tracking    | `lib/mongodb/models/Message.ts` — `isEdited`, `editedAt` pattern              |
| UI components    | shadcn/ui + dnd-kit (from `KanbanBoard.tsx`)                                  |
| Caching          | `lib/redis/cache.ts` — `cached()` for reads, `invalidateCache()` after writes |
