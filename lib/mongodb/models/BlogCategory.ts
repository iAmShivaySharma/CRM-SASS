import mongoose, { Schema, Document } from 'mongoose'

export interface IBlogCategory extends Omit<Document, '_id'> {
  _id: string
  name: string
  slug: string
  description: string
  metaTitle: string
  metaDescription: string
  parentId?: string
  order: number
  isActive: boolean
  postCount: number
  createdAt: Date
  updatedAt: Date
}

const BlogCategorySchema = new Schema<IBlogCategory>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    },
    description: {
      type: String,
      default: '',
      maxlength: 500,
    },
    metaTitle: {
      type: String,
      default: '',
      maxlength: 70,
    },
    metaDescription: {
      type: String,
      default: '',
      maxlength: 160,
    },
    parentId: {
      type: String,
      ref: 'BlogCategory',
    },
    order: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    postCount: {
      type: Number,
      default: 0,
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

if (typeof window === 'undefined') {
  BlogCategorySchema.index({ slug: 1 }, { unique: true })
  BlogCategorySchema.index({ isActive: 1, order: 1 })
  BlogCategorySchema.index({ parentId: 1 })
}

export const BlogCategory =
  mongoose.models?.BlogCategory ||
  mongoose.model<IBlogCategory>('BlogCategory', BlogCategorySchema)
