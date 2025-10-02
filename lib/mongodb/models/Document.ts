import mongoose, { Schema, Document } from 'mongoose'

export interface IProjectDocument extends Document {
  _id: string
  title: string
  content: any[] | any // Block-based content (JSON array of blocks or Tiptap JSON object)
  projectId: string
  folderId?: string // For organizing documents in folders
  type: 'document' | 'template' | 'note'
  status: 'draft' | 'published' | 'archived'
  visibility: 'private' | 'project' | 'workspace'
  createdBy: string
  lastEditedBy?: string
  lastEditedAt?: Date
  tags?: string[]
  customProperties?: Record<string, any> // Custom key-value properties
  version: number
  templateId?: string // If created from template
  workspaceId: string
  createdAt: Date
  updatedAt: Date
}

export interface IDocumentVersion extends Document {
  _id: string
  documentId: string
  version: number
  title: string
  content: any[]
  createdBy: string
  createdAt: Date
}

const ProjectDocumentSchema = new Schema<IProjectDocument>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    content: {
      type: Schema.Types.Mixed,
      default: [],
    },
    projectId: {
      type: String,
      ref: 'Project',
      required: true,
    },
    folderId: {
      type: String,
      ref: 'DocumentFolder',
    },
    type: {
      type: String,
      enum: ['document', 'template', 'note'],
      default: 'document',
    },
    status: {
      type: String,
      enum: ['draft', 'published', 'archived'],
      default: 'draft',
    },
    visibility: {
      type: String,
      enum: ['private', 'project', 'workspace'],
      default: 'project',
    },
    createdBy: {
      type: String,
      ref: 'User',
      required: true,
    },
    lastEditedBy: {
      type: String,
      ref: 'User',
    },
    lastEditedAt: {
      type: Date,
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
    customProperties: {
      type: Schema.Types.Mixed,
      default: {},
    },
    version: {
      type: Number,
      default: 1,
    },
    templateId: {
      type: String,
      ref: 'ProjectDocument',
    },
    workspaceId: {
      type: String,
      ref: 'Workspace',
      required: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (doc: any, ret: any) {
        ret.id = ret._id
        delete ret._id
        delete ret.__v
        return ret
      },
    },
  }
)

const DocumentVersionSchema = new Schema<IDocumentVersion>(
  {
    documentId: {
      type: String,
      ref: 'ProjectDocument',
      required: true,
    },
    version: {
      type: Number,
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    content: {
      type: Schema.Types.Mixed,
      required: true,
    },
    createdBy: {
      type: String,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    toJSON: {
      transform: function (doc: any, ret: any) {
        ret.id = ret._id
        delete ret._id
        delete ret.__v
        return ret
      },
    },
  }
)

// Pre-save middleware to track versions and last edited
ProjectDocumentSchema.pre('save', function (this: IProjectDocument, next) {
  if (this.isModified('content') && !this.isNew) {
    this.version += 1
    this.lastEditedAt = new Date()
  }
  next()
})

// Optimized indexes for performance
if (typeof window === 'undefined') {
  ProjectDocumentSchema.index({ projectId: 1, status: 1 })
  ProjectDocumentSchema.index({ workspaceId: 1, type: 1 })
  ProjectDocumentSchema.index({ createdBy: 1 })
  ProjectDocumentSchema.index({ tags: 1 })
  ProjectDocumentSchema.index({ folderId: 1 })

  DocumentVersionSchema.index({ documentId: 1, version: 1 }, { unique: true })
}

export const ProjectDocument =
  mongoose.models?.ProjectDocument || mongoose.model<IProjectDocument>('ProjectDocument', ProjectDocumentSchema)

export const DocumentVersion =
  mongoose.models?.DocumentVersion || mongoose.model<IDocumentVersion>('DocumentVersion', DocumentVersionSchema)