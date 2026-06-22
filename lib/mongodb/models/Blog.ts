import mongoose, { Schema, Document } from 'mongoose'

export interface IBlog extends Omit<Document, '_id'> {
  _id: string
  title: string
  slug: string
  content: string
  excerpt: string
  featuredImage: string
  featuredImageAlt: string
  categoryId: string
  tags: string[]
  author: {
    name: string
    avatar: string
    bio: string
  }
  status: 'draft' | 'published' | 'archived'
  publishedAt: Date | null
  // SEO fields
  metaTitle: string
  metaDescription: string
  metaKeywords: string[]
  canonicalUrl: string
  ogTitle: string
  ogDescription: string
  ogImage: string
  twitterTitle: string
  twitterDescription: string
  twitterImage: string
  // Content metrics
  readTime: number
  wordCount: number
  // Schema.org structured data
  jsonLd: Record<string, any>
  // Performance
  priority: number // 0-1 for sitemap priority
  changeFrequency:
    | 'always'
    | 'hourly'
    | 'daily'
    | 'weekly'
    | 'monthly'
    | 'yearly'
    | 'never'
  // Engagement
  views: number
  // Internal
  isFeatured: boolean
  relatedSlugs: string[]
  tableOfContents: { id: string; text: string; level: number }[]
  createdAt: Date
  updatedAt: Date
}

const BlogSchema = new Schema<IBlog>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    },
    content: {
      type: String,
      required: true,
    },
    excerpt: {
      type: String,
      default: '',
      maxlength: 300,
    },
    featuredImage: {
      type: String,
      default: '',
    },
    featuredImageAlt: {
      type: String,
      default: '',
      maxlength: 200,
    },
    categoryId: {
      type: String,
      ref: 'BlogCategory',
      required: true,
    },
    tags: [
      {
        type: String,
        trim: true,
        lowercase: true,
      },
    ],
    author: {
      name: { type: String, required: true },
      avatar: { type: String, default: '' },
      bio: { type: String, default: '' },
    },
    status: {
      type: String,
      enum: ['draft', 'published', 'archived'],
      default: 'draft',
    },
    publishedAt: {
      type: Date,
      default: null,
    },
    // SEO fields
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
    metaKeywords: [
      {
        type: String,
        trim: true,
        lowercase: true,
      },
    ],
    canonicalUrl: {
      type: String,
      default: '',
    },
    ogTitle: {
      type: String,
      default: '',
      maxlength: 70,
    },
    ogDescription: {
      type: String,
      default: '',
      maxlength: 200,
    },
    ogImage: {
      type: String,
      default: '',
    },
    twitterTitle: {
      type: String,
      default: '',
      maxlength: 70,
    },
    twitterDescription: {
      type: String,
      default: '',
      maxlength: 200,
    },
    twitterImage: {
      type: String,
      default: '',
    },
    // Content metrics
    readTime: {
      type: Number,
      default: 0,
    },
    wordCount: {
      type: Number,
      default: 0,
    },
    // Schema.org
    jsonLd: {
      type: Schema.Types.Mixed,
      default: {},
    },
    // Sitemap
    priority: {
      type: Number,
      default: 0.7,
      min: 0,
      max: 1,
    },
    changeFrequency: {
      type: String,
      enum: [
        'always',
        'hourly',
        'daily',
        'weekly',
        'monthly',
        'yearly',
        'never',
      ],
      default: 'weekly',
    },
    // Engagement
    views: {
      type: Number,
      default: 0,
    },
    // Internal
    isFeatured: {
      type: Boolean,
      default: false,
    },
    relatedSlugs: [
      {
        type: String,
        trim: true,
      },
    ],
    tableOfContents: [
      {
        id: { type: String },
        text: { type: String },
        level: { type: Number },
      },
    ],
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

// Auto-calculate read time and word count before save
BlogSchema.pre('save', function (this: IBlog, next) {
  if (this.isModified('content')) {
    const plainText = this.content.replace(/<[^>]*>/g, '')
    const words = plainText.split(/\s+/).filter(Boolean)
    this.wordCount = words.length
    this.readTime = Math.max(1, Math.ceil(words.length / 200))
  }

  // Auto-set publishedAt when status changes to published
  if (
    this.isModified('status') &&
    this.status === 'published' &&
    !this.publishedAt
  ) {
    this.publishedAt = new Date()
  }

  next()
})

if (typeof window === 'undefined') {
  BlogSchema.index({ slug: 1 }, { unique: true })
  BlogSchema.index({ status: 1, publishedAt: -1 })
  BlogSchema.index({ categoryId: 1, status: 1 })
  BlogSchema.index({ tags: 1 })
  BlogSchema.index({ isFeatured: 1, status: 1 })
  BlogSchema.index({ status: 1, views: -1 })
  // Text index for search
  BlogSchema.index({ title: 'text', excerpt: 'text', tags: 'text' })
}

export const Blog =
  mongoose.models?.Blog || mongoose.model<IBlog>('Blog', BlogSchema)
