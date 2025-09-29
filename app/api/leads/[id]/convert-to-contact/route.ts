import { NextRequest, NextResponse } from 'next/server'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { Lead, Contact, WorkspaceMember, Activity } from '@/lib/mongodb/client'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import {
  withLogging,
  withSecurityLogging,
  logUserActivity,
  logBusinessEvent,
} from '@/lib/logging/middleware'
import { log } from '@/lib/logging/logger'

// POST /api/leads/[id]/convert-to-contact - Convert a lead to a contact
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

        const leadId = params.id
        const url = new URL(request.url)
        const workspaceId = url.searchParams.get('workspaceId')

        if (!workspaceId) {
          return NextResponse.json(
            { message: 'Workspace ID is required' },
            { status: 400 }
          )
        }

        // Check if user has access to this workspace
        const userMembership = await WorkspaceMember.findOne({
          workspaceId,
          userId: auth.user.id,
          status: 'active',
        })

        if (!userMembership) {
          return NextResponse.json(
            { message: 'Access denied' },
            { status: 403 }
          )
        }

        // Find the lead
        const lead = await Lead.findOne({ _id: leadId, workspaceId })
          .populate('statusId', 'name color')
          .populate('tagIds', 'name color')
          .populate('assignedTo', 'fullName email')

        if (!lead) {
          return NextResponse.json(
            { message: 'Lead not found' },
            { status: 404 }
          )
        }

        // Check if lead is already converted
        const existingContact = await Contact.findOne({
          originalLeadId: leadId,
        })
        if (existingContact) {
          return NextResponse.json(
            {
              message: 'Lead has already been converted to a contact',
              contact: existingContact,
            },
            { status: 400 }
          )
        }

        // Create contact from lead data
        const contactData = {
          workspaceId,
          name: lead.name,
          email: lead.email,
          phone: lead.phone,
          company: lead.company,
          position: lead.position,

          // Lead conversion specific fields
          originalLeadId: leadId,
          convertedFromLead: true,
          leadConversionDate: new Date(),

          // Transfer lead fields to contact
          tagIds: lead.tagIds,
          assignedTo: lead.assignedTo,
          priority: lead.priority,
          notes: lead.notes,

          // Transfer custom data
          customData: lead.customData || {},

          // Set default contact values
          category: 'prospect',
          status: 'active',

          // Metadata
          createdBy: auth.user.id,
          createdAt: new Date(),
          updatedAt: new Date(),
        }

        // Create the contact
        const contact = await Contact.create(contactData)

        // Populate the created contact
        const populatedContact = await Contact.findById(contact._id)
          .populate('tagIds', 'name color')
          .populate('assignedTo', 'fullName email')
          .populate('accountManager', 'fullName email')
          .populate('createdBy', 'fullName email')
          .populate('originalLeadId', 'name email company')

        // Update the lead to mark it as converted
        await Lead.findByIdAndUpdate(leadId, {
          status: 'converted',
          convertedToContactId: contact._id,
          convertedAt: new Date(),
          updatedAt: new Date(),
        })

        // Log activities for both lead and contact
        try {
          // Log lead conversion activity
          await Activity.create({
            workspaceId,
            performedBy: auth.user.id,
            activityType: 'converted',
            entityType: 'lead',
            entityId: leadId,
            description: `${auth.user.fullName} converted lead "${lead.name}" to contact`,
            metadata: {
              leadName: lead.name,
              contactId: contact._id,
              conversionDate: new Date(),
            },
          })

          // Log contact creation activity
          await Activity.create({
            workspaceId,
            performedBy: auth.user.id,
            activityType: 'created',
            entityType: 'contact',
            entityId: contact._id,
            description: `${auth.user.fullName} created contact "${contact.name}" from lead conversion`,
            metadata: {
              contactName: contact.name,
              originalLeadId: leadId,
              convertedFromLead: true,
            },
          })
        } catch (activityError) {
          console.error('Failed to log conversion activities:', activityError)
        }

        // Log user activity
        logUserActivity(
          auth.user.id,
          'lead_converted_to_contact',
          'conversion',
          {
            leadId,
            contactId: contact._id,
            leadName: lead.name,
            contactName: contact.name,
            workspaceId,
          }
        )

        // Log business event
        logBusinessEvent(
          'lead_converted_to_contact',
          auth.user.id,
          workspaceId,
          {
            leadId,
            contactId: contact._id,
            leadName: lead.name,
            contactName: contact.name,
            leadSource: lead.source,
            leadPriority: lead.priority,
            conversionDuration: Date.now() - new Date(lead.createdAt).getTime(),
            processingDuration: Date.now() - startTime,
          }
        )

        return NextResponse.json(
          {
            success: true,
            message: 'Lead successfully converted to contact',
            contact: populatedContact,
            leadId: leadId,
          },
          { status: 201 }
        )
      } catch (error) {
        log.error('Convert lead to contact error:', error)
        return NextResponse.json(
          {
            message: 'Internal server error',
            error: error instanceof Error ? error.message : 'Unknown error',
          },
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
