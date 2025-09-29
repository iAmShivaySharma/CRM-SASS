import { NextRequest, NextResponse } from 'next/server'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { Lead, LeadNote, WorkspaceMember } from '@/lib/mongodb/client'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import {
  withLogging,
  withSecurityLogging,
  logUserActivity,
  logBusinessEvent,
} from '@/lib/logging/middleware'
import { log } from '@/lib/logging/logger'
import { z } from 'zod'

const createNoteSchema = z.object({
  content: z.string().min(1).max(2000),
  type: z.enum(['note', 'call', 'email', 'meeting', 'task']).optional(),
  isPrivate: z.boolean().optional(),
})

// GET /api/leads/[id]/notes - Get notes for a lead
export const GET = withSecurityLogging(
  withLogging(
    async (request: NextRequest, { params }: { params: { id: string } }) => {
      const startTime = Date.now()

      try {
        await connectToMongoDB()

        const auth = await verifyAuthToken(request)
        if (!auth) {
          return NextResponse.json(
            { message: 'Authentication required' },
            { status: 401 }
          )
        }

        const { id: leadId } = params
        const url = new URL(request.url)
        const page = parseInt(url.searchParams.get('page') || '1')
        const limit = parseInt(url.searchParams.get('limit') || '20')
        const skip = (page - 1) * limit

        // Get lead
        const lead = await Lead.findById(leadId)
        if (!lead) {
          return NextResponse.json(
            { message: 'Lead not found' },
            { status: 404 }
          )
        }

        // Check if user has access to workspace
        const member = await WorkspaceMember.findOne({
          userId: auth.user.id,
          workspaceId: lead.workspaceId,
          status: 'active',
        })

        if (!member) {
          return NextResponse.json(
            { message: 'Access denied' },
            { status: 403 }
          )
        }

        // Get notes for the lead (exclude private notes from other users)
        const query: any = {
          leadId,
          $or: [
            { isPrivate: false },
            { isPrivate: true, createdBy: auth.user.id },
          ],
        }

        const [notes, total] = await Promise.all([
          LeadNote.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate('createdBy', 'fullName email'),
          LeadNote.countDocuments(query),
        ])

        logBusinessEvent('lead_notes_listed', auth.user.id, lead.workspaceId, {
          leadId,
          count: notes.length,
          page,
          duration: Date.now() - startTime,
        })

        return NextResponse.json({
          success: true,
          notes: notes.map(note => note.toJSON()),
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
            hasNext: page * limit < total,
            hasPrev: page > 1,
          },
        })
      } catch (error) {
        log.error('Get lead notes error:', error)
        return NextResponse.json(
          { message: 'Internal server error' },
          { status: 500 }
        )
      }
    },
    {
      logBody: false,
      logHeaders: true,
    }
  )
)

// POST /api/leads/[id]/notes - Create a new note for a lead
export const POST = withSecurityLogging(
  withLogging(
    async (request: NextRequest, { params }: { params: { id: string } }) => {
      const startTime = Date.now()

      try {
        await connectToMongoDB()

        const auth = await verifyAuthToken(request)
        if (!auth) {
          return NextResponse.json(
            { message: 'Authentication required' },
            { status: 401 }
          )
        }

        const { id: leadId } = params
        const body = await request.json()

        const validationResult = createNoteSchema.safeParse(body)
        if (!validationResult.success) {
          return NextResponse.json(
            {
              message: 'Validation failed',
              errors: validationResult.error.errors,
            },
            { status: 400 }
          )
        }

        // Get lead
        const lead = await Lead.findById(leadId)
        if (!lead) {
          return NextResponse.json(
            { message: 'Lead not found' },
            { status: 404 }
          )
        }

        // Check if user has access to workspace
        const member = await WorkspaceMember.findOne({
          userId: auth.user.id,
          workspaceId: lead.workspaceId,
          status: 'active',
        })

        if (!member) {
          return NextResponse.json(
            { message: 'Access denied' },
            { status: 403 }
          )
        }

        const { content, type, isPrivate } = validationResult.data

        // Create note
        const note = await LeadNote.create({
          leadId,
          workspaceId: lead.workspaceId,
          content,
          type: type || 'note',
          isPrivate: isPrivate || false,
          createdBy: auth.user.id,
        })

        // Update lead's last contacted date if it's a contact-related note
        if (type && ['call', 'email', 'meeting'].includes(type)) {
          await Lead.findByIdAndUpdate(leadId, { lastContactedAt: new Date() })
        }

        // Populate the created note
        const populatedNote = await LeadNote.findById(note._id).populate(
          'createdBy',
          'fullName email'
        )

        // Log activity
        logUserActivity(auth.user.id, 'lead_note_created', 'lead_note', {
          noteId: note._id,
          leadId,
          noteType: type || 'note',
          workspaceId: lead.workspaceId,
        })

        logBusinessEvent('lead_note_created', auth.user.id, lead.workspaceId, {
          leadId,
          noteType: type || 'note',
          isPrivate: isPrivate || false,
          duration: Date.now() - startTime,
        })

        return NextResponse.json(
          {
            success: true,
            message: 'Note created successfully',
            note: populatedNote?.toJSON(),
          },
          { status: 201 }
        )
      } catch (error) {
        log.error('Create lead note error:', error)
        return NextResponse.json(
          { message: 'Internal server error' },
          { status: 500 }
        )
      }
    },
    {
      logBody: true,
      logHeaders: true,
    }
  )
)
