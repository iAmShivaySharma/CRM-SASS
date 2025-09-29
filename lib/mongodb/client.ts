import connectToMongoDB from './connection'
import {
  User,
  Workspace,
  WorkspaceMember,
  Role,
  Lead,
  Plan,
  Subscription,
  Activity,
  Invitation,
  type IUser,
  type IWorkspace,
  type IWorkspaceMember,
  type IRole,
  type ILead,
  type IPlan,
  type ISubscription,
  type IActivity,
  type IInvitation,
} from './models'
import { Webhook, type IWebhook } from './models/Webhook'
import { WebhookLog, type IWebhookLog } from './models/WebhookLog'
import { Tag, type ITag } from './models/Tag'
import { LeadNote, type ILeadNote } from './models/LeadNote'
import { LeadStatus, type ILeadStatus } from './models/LeadStatus'
import { LeadActivity, type ILeadActivity } from './models/LeadActivity'
import { Contact, type IContact } from './models/Contact'

// Database client class to replace Supabase functionality
export class MongoDBClient {
  constructor() {
    // Ensure connection on instantiation
    this.ensureConnection()
  }

  private async ensureConnection() {
    await connectToMongoDB()
  }

  // User operations
  async createUser(userData: Partial<IUser>): Promise<IUser> {
    await this.ensureConnection()
    const user = new User(userData)
    return await user.save()
  }

  async getUserById(id: string): Promise<IUser | null> {
    await this.ensureConnection()
    return await User.findById(id)
  }

  async findUserById(id: string): Promise<IUser | null> {
    await this.ensureConnection()
    return await User.findById(id)
  }

  async getUserByEmail(email: string): Promise<IUser | null> {
    await this.ensureConnection()
    return await User.findOne({ email })
  }

  async updateUser(id: string, updates: Partial<IUser>): Promise<IUser | null> {
    await this.ensureConnection()
    return await User.findByIdAndUpdate(id, updates, { new: true })
  }

  // Workspace operations
  async createWorkspace(
    workspaceData: Partial<IWorkspace>
  ): Promise<IWorkspace> {
    await this.ensureConnection()
    const workspace = new Workspace(workspaceData)
    return await workspace.save()
  }

  async getWorkspaceById(id: string): Promise<IWorkspace | null> {
    await this.ensureConnection()
    return await Workspace.findById(id)
  }

  async findWorkspaceById(id: string): Promise<IWorkspace | null> {
    await this.ensureConnection()
    return await Workspace.findById(id)
  }

  async getWorkspaceBySlug(slug: string): Promise<IWorkspace | null> {
    await this.ensureConnection()
    return await Workspace.findOne({ slug })
  }

  async findWorkspaceMember(
    workspaceId: string,
    userId: string
  ): Promise<IWorkspaceMember | null> {
    await this.ensureConnection()
    return await WorkspaceMember.findOne({
      workspaceId,
      userId,
      status: 'active',
    })
  }

  async getUserWorkspaces(userId: string): Promise<IWorkspace[]> {
    await this.ensureConnection()
    const members = await WorkspaceMember.find({
      userId,
      status: 'active',
    }).populate('workspaceId')
    return members.map((member: any) => member.workspaceId as IWorkspace)
  }

  // Lead operations
  async getLeads(
    workspaceId: string,
    filters?: { status?: string }
  ): Promise<ILead[]> {
    await this.ensureConnection()
    const query: any = { workspaceId }
    if (filters?.status) {
      query.status = filters.status
    }
    return await Lead.find(query).sort({ createdAt: -1 })
  }

  async createLead(leadData: Partial<ILead>): Promise<ILead> {
    await this.ensureConnection()
    const lead = new Lead(leadData)
    return await lead.save()
  }

  async updateLead(id: string, updates: Partial<ILead>): Promise<ILead | null> {
    await this.ensureConnection()
    return await Lead.findByIdAndUpdate(id, updates, { new: true })
  }

  async deleteLead(id: string): Promise<boolean> {
    await this.ensureConnection()
    const result = await Lead.findByIdAndDelete(id)
    return !!result
  }

  // Role operations
  async getRolesByWorkspace(workspaceId: string): Promise<IRole[]> {
    await this.ensureConnection()
    return await Role.find({ workspaceId })
  }

  async createRole(roleData: Partial<IRole>): Promise<IRole> {
    await this.ensureConnection()
    const role = new Role(roleData)
    return await role.save()
  }

  // Activity operations
  async createActivity(activityData: Partial<IActivity>): Promise<IActivity> {
    await this.ensureConnection()
    const activity = new Activity(activityData)
    return await activity.save()
  }

  async getActivities(
    workspaceId: string,
    limit: number = 50
  ): Promise<IActivity[]> {
    await this.ensureConnection()
    return await Activity.find({ workspaceId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('performedBy', 'fullName email')
  }

  // Webhook operations
  async getWebhooks(workspaceId: string): Promise<IWebhook[]> {
    await this.ensureConnection()
    return await Webhook.find({ workspaceId }).sort({ createdAt: -1 })
  }

  async createWebhook(webhookData: Partial<IWebhook>): Promise<IWebhook> {
    await this.ensureConnection()
    const webhook = new Webhook(webhookData)
    return await webhook.save()
  }

  async updateWebhook(
    id: string,
    updates: Partial<IWebhook>
  ): Promise<IWebhook | null> {
    await this.ensureConnection()
    return await Webhook.findByIdAndUpdate(id, updates, { new: true })
  }

  async deleteWebhook(id: string): Promise<boolean> {
    await this.ensureConnection()
    const result = await Webhook.findByIdAndDelete(id)
    return !!result
  }

  async getWebhookByUrl(url: string): Promise<IWebhook | null> {
    await this.ensureConnection()
    return await Webhook.findOne({ url, isActive: true })
  }

  // Webhook log operations
  async createWebhookLog(logData: Partial<IWebhookLog>): Promise<IWebhookLog> {
    await this.ensureConnection()
    const log = new WebhookLog(logData)
    return await log.save()
  }

  async getWebhookLogs(
    webhookId: string,
    limit: number = 100
  ): Promise<IWebhookLog[]> {
    await this.ensureConnection()
    return await WebhookLog.find({ webhookId })
      .sort({ createdAt: -1 })
      .limit(limit)
  }

  // Lead activity operations
  async createLeadActivity(
    activityData: Partial<ILeadActivity>
  ): Promise<ILeadActivity> {
    await this.ensureConnection()
    const activity = new LeadActivity(activityData)
    return await activity.save()
  }

  async getLeadActivities(
    leadId: string,
    limit: number = 50
  ): Promise<ILeadActivity[]> {
    await this.ensureConnection()
    return await LeadActivity.find({ leadId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('performedBy', 'fullName email avatar')
  }
}

// Create singleton instance
export const mongoClient = new MongoDBClient()

// Export models for direct use
export {
  User,
  Workspace,
  WorkspaceMember,
  Role,
  Lead,
  Plan,
  Subscription,
  Activity,
  Invitation,
  Webhook,
  WebhookLog,
  Tag,
  LeadNote,
  LeadStatus,
  LeadActivity,
  Contact,
}
