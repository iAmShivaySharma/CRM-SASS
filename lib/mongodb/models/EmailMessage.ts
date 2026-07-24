import mongoose, { Schema, Document } from 'mongoose'

export interface IEmailMessage extends Document {
  userId: mongoose.Types.ObjectId
  workspaceId: mongoose.Types.ObjectId
  emailAccountId: mongoose.Types.ObjectId

  messageId: string // Unique message ID from provider
  threadId?: string // Thread/conversation ID

  from: {
    name?: string
    email: string
  }
  to: Array<{
    name?: string
    email: string
  }>
  cc?: Array<{
    name?: string
    email: string
  }>
  bcc?: Array<{
    name?: string
    email: string
  }>
  replyTo?: {
    name?: string
    email: string
  }

  subject: string

  bodyText?: string
  bodyHtml?: string

  attachments: Array<{
    filename: string
    contentType: string
    size: number
    attachmentId: string // Reference to stored file
    isInline?: boolean
    contentId?: string
  }>

  direction: 'inbound' | 'outbound' | 'draft'
  status: 'draft' | 'sent' | 'delivered' | 'failed' | 'bounced' | 'read'
  priority: 'low' | 'normal' | 'high'

  sentAt?: Date
  receivedAt?: Date
  readAt?: Date

  folder: string
  labels: string[]

  isRead: boolean
  isStarred: boolean
  isImportant: boolean
  isSnoozed: boolean
  snoozeUntil?: Date

  linkedLeadId?: mongoose.Types.ObjectId
  linkedContactId?: mongoose.Types.ObjectId
  linkedProjectId?: mongoose.Types.ObjectId
  linkedTaskId?: mongoose.Types.ObjectId

  providerData: {
    rawHeaders?: any
    internalDate?: Date
    size?: number
    uid?: number
    flags?: string[]
    customLabels?: string[]
  }

  syncStatus: 'pending' | 'synced' | 'failed' | 'ignored'
  syncedAt?: Date
  syncError?: string

  createdAt: Date
  updatedAt: Date
}

const EmailMessageSchema = new Schema<IEmailMessage>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    workspaceId: {
      type: Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
      index: true,
    },
    emailAccountId: {
      type: Schema.Types.ObjectId,
      ref: 'EmailAccount',
      required: true,
      index: true,
    },

    messageId: {
      type: String,
      required: true,
      index: true,
    },
    threadId: {
      type: String,
      index: true,
    },

    from: {
      name: { type: String, trim: true },
      email: { type: String, required: true, lowercase: true, index: true },
    },
    to: [
      {
        name: { type: String, trim: true },
        email: { type: String, required: true, lowercase: true },
      },
    ],
    cc: [
      {
        name: { type: String, trim: true },
        email: { type: String, required: true, lowercase: true },
      },
    ],
    bcc: [
      {
        name: { type: String, trim: true },
        email: { type: String, required: true, lowercase: true },
      },
    ],
    replyTo: {
      name: { type: String, trim: true },
      email: { type: String, lowercase: true },
    },

    subject: {
      type: String,
      required: true,
      trim: true,
      index: 'text',
    },

    bodyText: {
      type: String,
      index: 'text',
    },
    bodyHtml: {
      type: String,
    },

    attachments: [
      {
        filename: { type: String, required: true },
        contentType: { type: String, required: true },
        size: { type: Number, required: true, min: 0 },
        attachmentId: { type: String, required: true },
        isInline: { type: Boolean, default: false },
        contentId: { type: String },
      },
    ],

    direction: {
      type: String,
      enum: ['inbound', 'outbound', 'draft'],
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['draft', 'sent', 'delivered', 'failed', 'bounced', 'read'],
      default: 'sent',
      index: true,
    },
    priority: {
      type: String,
      enum: ['low', 'normal', 'high'],
      default: 'normal',
      index: true,
    },

    sentAt: {
      type: Date,
      index: true,
    },
    receivedAt: {
      type: Date,
      index: true,
    },
    readAt: {
      type: Date,
    },

    folder: {
      type: String,
      required: true,
      default: 'INBOX',
      index: true,
    },
    labels: [
      {
        type: String,
        index: true,
      },
    ],

    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    isStarred: {
      type: Boolean,
      default: false,
      index: true,
    },
    isImportant: {
      type: Boolean,
      default: false,
      index: true,
    },
    isSnoozed: {
      type: Boolean,
      default: false,
      index: true,
    },
    snoozeUntil: {
      type: Date,
      index: true,
    },

    linkedLeadId: {
      type: Schema.Types.ObjectId,
      ref: 'Lead',
      index: true,
    },
    linkedContactId: {
      type: Schema.Types.ObjectId,
      ref: 'Contact',
      index: true,
    },
    linkedProjectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      index: true,
    },
    linkedTaskId: {
      type: Schema.Types.ObjectId,
      ref: 'Task',
      index: true,
    },

    providerData: {
      rawHeaders: { type: Schema.Types.Mixed },
      internalDate: { type: Date },
      size: { type: Number },
      uid: { type: Number },
      flags: [{ type: String }],
      customLabels: [{ type: String }],
    },

    syncStatus: {
      type: String,
      enum: ['pending', 'synced', 'failed', 'ignored'],
      default: 'synced',
      index: true,
    },
    syncedAt: {
      type: Date,
      default: Date.now,
    },
    syncError: {
      type: String,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
)

EmailMessageSchema.index({ userId: 1, workspaceId: 1, emailAccountId: 1 })
EmailMessageSchema.index({ messageId: 1, emailAccountId: 1 }, { unique: true })
EmailMessageSchema.index({ threadId: 1, emailAccountId: 1 })
EmailMessageSchema.index({
  userId: 1,
  workspaceId: 1,
  direction: 1,
  sentAt: -1,
})
EmailMessageSchema.index({
  userId: 1,
  workspaceId: 1,
  isRead: 1,
  receivedAt: -1,
})
EmailMessageSchema.index({
  userId: 1,
  workspaceId: 1,
  folder: 1,
  receivedAt: -1,
})
EmailMessageSchema.index({ 'from.email': 1, workspaceId: 1 })

EmailMessageSchema.index(
  {
    subject: 'text',
    bodyText: 'text',
    'from.name': 'text',
    'from.email': 'text',
  },
  {
    weights: {
      subject: 10,
      'from.name': 5,
      'from.email': 5,
      bodyText: 1,
    },
  }
)

EmailMessageSchema.virtual('threadCount', {
  ref: 'EmailMessage',
  localField: 'threadId',
  foreignField: 'threadId',
  count: true,
  match: function () {
    return { emailAccountId: this.emailAccountId }
  },
})

EmailMessageSchema.virtual('attachmentCount').get(function () {
  return this.attachments?.length || 0
})

EmailMessageSchema.virtual('fromDisplayName').get(function () {
  return this.from?.name || this.from?.email
})

EmailMessageSchema.virtual('totalSize').get(function () {
  const attachmentSize =
    this.attachments?.reduce((total, att) => total + att.size, 0) || 0
  return (this.providerData?.size || 0) + attachmentSize
})

EmailMessageSchema.methods.markAsRead = function () {
  this.isRead = true
  this.readAt = new Date()
  return this.save()
}

EmailMessageSchema.methods.markAsUnread = function () {
  this.isRead = false
  this.readAt = undefined
  return this.save()
}

EmailMessageSchema.methods.star = function () {
  this.isStarred = true
  return this.save()
}

EmailMessageSchema.methods.unstar = function () {
  this.isStarred = false
  return this.save()
}

EmailMessageSchema.methods.snooze = function (until: Date) {
  this.isSnoozed = true
  this.snoozeUntil = until
  return this.save()
}

EmailMessageSchema.methods.unsnooze = function () {
  this.isSnoozed = false
  this.snoozeUntil = undefined
  return this.save()
}

EmailMessageSchema.methods.moveToFolder = function (folder: string) {
  this.folder = folder
  return this.save()
}

EmailMessageSchema.methods.addLabel = function (label: string) {
  if (!this.labels.includes(label)) {
    this.labels.push(label)
    return this.save()
  }
  return Promise.resolve(this)
}

EmailMessageSchema.methods.removeLabel = function (label: string) {
  this.labels = this.labels.filter((l: string) => l !== label)
  return this.save()
}

EmailMessageSchema.methods.linkToLead = function (leadId: string) {
  this.linkedLeadId = new mongoose.Types.ObjectId(leadId)
  return this.save()
}

EmailMessageSchema.methods.linkToContact = function (contactId: string) {
  this.linkedContactId = new mongoose.Types.ObjectId(contactId)
  return this.save()
}

EmailMessageSchema.methods.unlinkFromCRM = function () {
  this.linkedLeadId = undefined
  this.linkedContactId = undefined
  this.linkedProjectId = undefined
  this.linkedTaskId = undefined
  return this.save()
}

EmailMessageSchema.statics.findByEmail = function (
  email: string,
  workspaceId: string
) {
  return this.find({
    workspaceId,
    $or: [
      { 'from.email': email },
      { 'to.email': email },
      { 'cc.email': email },
      { 'bcc.email': email },
    ],
  }).sort({ receivedAt: -1 })
}

EmailMessageSchema.statics.findUnread = function (
  userId: string,
  workspaceId: string
) {
  return this.find({
    userId,
    workspaceId,
    direction: 'inbound',
    isRead: false,
  }).sort({ receivedAt: -1 })
}

EmailMessageSchema.statics.findSnoozed = function (
  userId: string,
  workspaceId: string
) {
  return this.find({
    userId,
    workspaceId,
    isSnoozed: true,
    snoozeUntil: { $lte: new Date() },
  }).sort({ snoozeUntil: 1 })
}

EmailMessageSchema.statics.searchMessages = function (
  query: string,
  userId: string,
  workspaceId: string
) {
  return this.find(
    {
      userId,
      workspaceId,
      $text: { $search: query },
    },
    {
      score: { $meta: 'textScore' },
    }
  ).sort({
    score: { $meta: 'textScore' },
    receivedAt: -1,
  })
}

EmailMessageSchema.statics.getConversation = function (
  threadId: string,
  emailAccountId: string
) {
  return this.find({
    threadId,
    emailAccountId,
  }).sort({ receivedAt: 1 })
}

EmailMessageSchema.statics.getStatsForAccount = function (
  emailAccountId: string,
  days: number = 30
) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

  return this.aggregate([
    {
      $match: {
        emailAccountId: new mongoose.Types.ObjectId(emailAccountId),
        createdAt: { $gte: since },
      },
    },
    {
      $group: {
        _id: '$direction',
        count: { $sum: 1 },
        totalSize: { $sum: '$providerData.size' },
      },
    },
  ])
}

export default mongoose.models.EmailMessage ||
  mongoose.model<IEmailMessage>('EmailMessage', EmailMessageSchema)
