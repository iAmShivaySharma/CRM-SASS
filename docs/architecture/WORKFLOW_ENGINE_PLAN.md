# Prebuilt Workflow Engine — Plan

## Context

The CRM SaaS has a working n8n integration (catalog, execution, cost tracking, dynamic inputs). The goal is to give end users a **visual workflow builder** with prebuilt AI/LLM templates — simpler than n8n's UI.

---

## Alternatives Evaluated

| Option | Embedding | Multi-tenant | AI Focus | Dev Effort | UX Quality |
|--------|-----------|-------------|----------|------------|------------|
| **Activepieces** | iframe SDK (styling seam) | Good (projects) | Medium | Medium-High | Good but iframe |
| **Flowise** | No embed SDK | No native support | Excellent | High | Good for AI only |
| **Langflow** | No embed SDK | No native support | Excellent | Very High (Python mismatch) | Good for AI only |
| **Custom React Flow** | Native React | Full control | Full control | Very High (need execution engine) | Best |
| **n8n + Custom Builder** | Native React | Via your app layer | Full (n8n has LangChain nodes) | **Medium** | **Best** |

### Why NOT the others:
- **Activepieces**: iframe embedding creates UX seam with your shadcn/ui design. Requires PostgreSQL + Redis. Would replace your existing working execution pipeline.
- **Flowise/Langflow**: AI-only — can't handle your Marketing, Webhook, API Integration workflow categories. No multi-tenancy. Flowise has no builder embed SDK. Langflow is Python (stack mismatch).
- **Custom from scratch**: The execution engine (graph traversal, retries, error handling, async, webhooks) is months of work. You already have this via n8n.

---

## Recommendation: Keep n8n + Build Custom React Flow Builder

**Why:** You already have a production execution engine. The visual builder is the easy part (React Flow). n8n handles the hard part (execution). Native React = perfect shadcn/ui integration. No iframe, no new infrastructure.

**How it works:**
```
User builds workflow in React Flow builder
  → Translator converts to n8n workflow JSON
    → n8n API creates/executes the workflow
      → Existing execution pipeline handles tracking, cost, inputs
```

---

## Implementation

### Phase 1: Builder Core
- Add `@xyflow/react` dependency
- Create `/components/engines/builder/` with:
  - `WorkflowBuilder.tsx` — React Flow canvas
  - `NodePalette.tsx` — drag-and-drop node sidebar
  - `NodeConfigPanel.tsx` — side panel for node settings (reuse shadcn/ui form patterns from `ExecuteWorkflowModal.tsx`)
- Define curated node types: `TriggerNode`, `AINode`, `ActionNode`, `ConditionNode`, `OutputNode`
- Serialize builder state to `WorkflowDefinition` type

### Phase 2: n8n Translation Layer
- Create `/lib/n8n/translator.ts` — converts builder format → n8n workflow JSON
- Map each simplified node to n8n node config (e.g., `AINode` → `@n8n/n8n-nodes-langchain.lmChatOpenAi`)
- Extend `N8nApiClient` (`/lib/n8n/client.ts`) with `createWorkflow()` and `updateWorkflow()` methods

### Phase 3: User Workflow Management
- Extend `WorkflowCatalog` model with `ownerId`, `isTemplate`, `builderDefinition` fields
- New API routes at `/app/api/engines/workflows/` for user CRUD
- Builder page at `/app/(dashboard)/engines/builder/page.tsx`

### Phase 4: Template System
- Existing catalog entries become templates (`isTemplate: true`)
- "Use Template" clones into user-owned workflow
- Builder opens with cloned workflow for customization
- Ship 5-10 prebuilt AI workflow templates

### Phase 5: Polish
- Workflow validation (prevent invalid connections)
- Test each node type's n8n translation end-to-end
- Curate initial node library (8-10 nodes covering primary use cases)

---

## Key Files to Modify
- `/lib/n8n/client.ts` — add `createWorkflow()`, `updateWorkflow()`
- `/lib/mongodb/models/WorkflowCatalog.ts` — add `ownerId`, `isTemplate`, `builderDefinition`
- `/components/engines/ExecuteWorkflowModal.tsx` — reference for form patterns
- `/app/api/engines/execute/route.ts` — execution pipeline (must stay compatible)

## Key Design Decisions
1. Store **both** builder format and generated n8n JSON in WorkflowCatalog (so builder can reload without reverse-translating)
2. Start with 8-10 curated node types, not all 400+ n8n nodes
3. Users never see n8n — your builder is the only interface
4. Execution path unchanged: existing cost tracking, credential injection, dynamic input all preserved

## Verification
- Build a simple 3-node workflow (trigger → AI node → output) in the builder
- Verify translator produces valid n8n JSON
- Execute via existing pipeline, confirm cost tracking and results work
- Clone a prebuilt template, modify it, execute the modified version
