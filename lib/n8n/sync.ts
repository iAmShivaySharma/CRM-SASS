/**
 * n8n Workflow Sync Service
 * Syncs workflows from n8n instance to MongoDB
 */

import { createN8nClient, N8nWorkflow } from './client'
import { WorkflowCatalog, WorkflowCategory } from '@/lib/mongodb/models'
import { connectToMongoDB } from '@/lib/mongodb/connection'

export interface SyncResult {
  success: boolean
  syncedCount: number
  updatedCount: number
  errorCount: number
  errors: string[]
  workflows: string[]
}

export class WorkflowSyncService {
  private n8nClient = createN8nClient()

  async syncAllWorkflows(): Promise<SyncResult> {
    const result: SyncResult = {
      success: false,
      syncedCount: 0,
      updatedCount: 0,
      errorCount: 0,
      errors: [],
      workflows: []
    }

    try {
      await connectToMongoDB()

      // Test connection first
      const connectionTest = await this.n8nClient.testConnection()
      if (!connectionTest.success) {
        throw new Error('Failed to connect to n8n instance')
      }

      // Get all workflows from n8n
      const { data: n8nWorkflows } = await this.n8nClient.getWorkflows()

      console.log(`Found ${n8nWorkflows.length} workflows in n8n instance`)

      // Ensure default categories exist
      await this.ensureDefaultCategories()

      // Process each workflow
      for (const n8nWorkflow of n8nWorkflows) {
        try {
          const syncResult = await this.syncSingleWorkflow(n8nWorkflow)

          if (syncResult.wasUpdated) {
            result.updatedCount++
          } else {
            result.syncedCount++
          }

          result.workflows.push(n8nWorkflow.name)
        } catch (error) {
          console.error(`Error syncing workflow ${n8nWorkflow.name}:`, error)
          result.errorCount++
          result.errors.push(`${n8nWorkflow.name}: ${error.message}`)
        }
      }

      result.success = result.errorCount === 0 || (result.syncedCount + result.updatedCount) > 0

      console.log(`Sync completed: ${result.syncedCount} new, ${result.updatedCount} updated, ${result.errorCount} errors`)

      return result
    } catch (error) {
      console.error('Workflow sync failed:', error)
      result.errors.push(error.message)
      return result
    }
  }

  async syncSingleWorkflow(n8nWorkflow: N8nWorkflow): Promise<{ wasUpdated: boolean }> {
    // Check if workflow already exists
    let catalogWorkflow = await WorkflowCatalog.findOne({
      n8nWorkflowId: n8nWorkflow.id
    })

    // Analyze workflow to extract metadata
    const analysis = this.n8nClient.analyzeWorkflow(n8nWorkflow)

    // Get or create category
    const category = await this.getCategoryForWorkflow(analysis.category)

    if (catalogWorkflow) {
      // Update existing workflow
      await catalogWorkflow.syncFromN8n(n8nWorkflow, analysis)
      catalogWorkflow.category = category._id
      await catalogWorkflow.save()

      return { wasUpdated: true }
    } else {
      // Create new workflow
      catalogWorkflow = new WorkflowCatalog({
        n8nWorkflowId: n8nWorkflow.id,
        name: n8nWorkflow.name,
        description: this.generateDescription(n8nWorkflow),
        category: category._id,
        tags: this.extractTags(n8nWorkflow),
        inputSchema: analysis.inputSchema,
        outputSchema: analysis.outputSchema,
        requiresApiKey: analysis.requiresApiKey,
        estimatedCost: analysis.estimatedCost,
        apiKeyProvider: analysis.requiresApiKey ? 'openrouter' : 'platform',
        n8nData: {
          versionId: n8nWorkflow.versionId,
          nodes: n8nWorkflow.nodes,
          connections: n8nWorkflow.connections,
          settings: n8nWorkflow.settings,
          active: n8nWorkflow.active,
          lastSyncAt: new Date()
        },
        usage: {
          totalExecutions: 0,
          avgExecutionTime: 0,
          successRate: 100
        }
      })

      await catalogWorkflow.save()

      return { wasUpdated: false }
    }
  }

  private async ensureDefaultCategories() {
    const defaultCategories = [
      {
        name: 'Content Creation',
        description: 'AI-powered content generation workflows',
        icon: 'FileText',
        sortOrder: 1
      },
      {
        name: 'Data Processing',
        description: 'Data analysis and transformation workflows',
        icon: 'Database',
        sortOrder: 2
      },
      {
        name: 'Marketing',
        description: 'Marketing automation and campaign workflows',
        icon: 'Megaphone',
        sortOrder: 3
      },
      {
        name: 'Social Media',
        description: 'Social media management and posting workflows',
        icon: 'Share2',
        sortOrder: 4
      },
      {
        name: 'Sales',
        description: 'Sales automation and lead management workflows',
        icon: 'TrendingUp',
        sortOrder: 5
      },
      {
        name: 'Finance',
        description: 'Financial processing and reporting workflows',
        icon: 'DollarSign',
        sortOrder: 6
      },
      {
        name: 'API Integration',
        description: 'API calls and third-party integrations',
        icon: 'Link',
        sortOrder: 7
      },
      {
        name: 'Webhooks',
        description: 'Webhook processing and automation',
        icon: 'Webhook',
        sortOrder: 8
      },
      {
        name: 'General',
        description: 'General purpose automation workflows',
        icon: 'Settings',
        sortOrder: 9
      }
    ]

    for (const categoryData of defaultCategories) {
      await WorkflowCategory.findOneAndUpdate(
        { name: categoryData.name },
        categoryData,
        { upsert: true, new: true }
      )
    }
  }

  private async getCategoryForWorkflow(categoryName: string) {
    let category = await WorkflowCategory.findOne({ name: categoryName })

    if (!category) {
      // Default to 'General' if category doesn't exist
      category = await WorkflowCategory.findOne({ name: 'General' })

      if (!category) {
        // Create General category if it doesn't exist
        category = new WorkflowCategory({
          name: 'General',
          description: 'General purpose automation workflows',
          icon: 'Settings',
          sortOrder: 999
        })
        await category.save()
      }
    }

    return category
  }

  private generateDescription(workflow: N8nWorkflow): string {
    const nodeTypes = workflow.nodes?.map(node => node.type) || []
    const hasAI = nodeTypes.some(type =>
      type.toLowerCase().includes('openrouter') ||
      type.toLowerCase().includes('ai') ||
      type.toLowerCase().includes('openai')
    )

    const hasWebhook = nodeTypes.some(type => type.includes('Webhook'))
    const hasHttp = nodeTypes.some(type => type.includes('Http'))
    const hasEmail = nodeTypes.some(type => type.includes('Gmail') || type.includes('Email'))

    let description = `Automated workflow: ${workflow.name}`

    if (hasAI) {
      description += ' with AI-powered processing'
    }

    if (hasWebhook) {
      description += ' triggered by webhooks'
    }

    if (hasHttp) {
      description += ' with API integrations'
    }

    if (hasEmail) {
      description += ' including email functionality'
    }

    return description
  }

  private extractTags(workflow: N8nWorkflow): string[] {
    const tags: Set<string> = new Set()

    // Add tags from n8n workflow tags
    if (workflow.tags) {
      workflow.tags.forEach(tag => tags.add(tag.name))
    }

    // Add tags based on node types
    const nodeTypes = workflow.nodes?.map(node => node.type) || []

    nodeTypes.forEach(nodeType => {
      if (nodeType.includes('OpenRouter') || nodeType.includes('AI')) {
        tags.add('AI')
        tags.add('LLM')
      }
      if (nodeType.includes('Webhook')) {
        tags.add('Webhook')
      }
      if (nodeType.includes('Http')) {
        tags.add('API')
        tags.add('Integration')
      }
      if (nodeType.includes('Gmail') || nodeType.includes('Email')) {
        tags.add('Email')
        tags.add('Communication')
      }
      if (nodeType.includes('Spreadsheet') || nodeType.includes('CSV')) {
        tags.add('Data')
        tags.add('Spreadsheet')
      }
      if (nodeType.includes('Schedule')) {
        tags.add('Scheduled')
        tags.add('Automation')
      }
    })

    // Add general tags
    tags.add('Automation')

    return Array.from(tags).slice(0, 10) // Limit to 10 tags
  }

  async getWorkflowDetails(n8nWorkflowId: string) {
    try {
      const workflow = await this.n8nClient.getWorkflow(n8nWorkflowId)
      return workflow
    } catch (error) {
      console.error(`Error fetching workflow details for ${n8nWorkflowId}:`, error)
      throw error
    }
  }

  async testN8nConnection() {
    return await this.n8nClient.testConnection()
  }
}

export const workflowSyncService = new WorkflowSyncService()