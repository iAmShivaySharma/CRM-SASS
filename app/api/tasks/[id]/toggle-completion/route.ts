import { NextRequest, NextResponse } from 'next/server'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { MongoDBClient } from '@/lib/mongodb/client'
import { Task } from '@/lib/mongodb/models'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import { NotificationService } from '@/lib/services/notificationService'
import { emailService } from '@/lib/services/emailService'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToMongoDB()

    const auth = await verifyAuthToken(request)
    if (!auth) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      )
    }

    const { completed } = await request.json()
    const { id: taskId } = await params

    if (typeof completed !== 'boolean') {
      return NextResponse.json(
        { message: 'Completed status must be a boolean' },
        { status: 400 }
      )
    }

    // Get the current task
    const currentTask = await Task.findById(taskId)
    if (!currentTask) {
      return NextResponse.json(
        { message: 'Task not found' },
        { status: 404 }
      )
    }

    // Update task completion status
    const updateData: any = {
      completed,
    }

    if (completed) {
      updateData.completedAt = new Date()
      updateData.completedBy = auth.user._id
    } else {
      updateData.completedAt = undefined
      updateData.completedBy = undefined
    }

    const updatedTask = await Task.findByIdAndUpdate(
      taskId,
      updateData,
      { new: true }
    ).populate('assigneeId', 'fullName email avatarUrl')

    if (!updatedTask) {
      return NextResponse.json(
        { message: 'Failed to update task' },
        { status: 500 }
      )
    }

    // Create activity notification
    const activityTitle = completed
      ? 'Task Completed'
      : 'Task Reopened'

    const activityMessage = completed
      ? `Task "${updatedTask.title}" has been marked as completed`
      : `Task "${updatedTask.title}" has been reopened`

    // Send notification to task assignee and workspace members
    try {
      await NotificationService.createNotification({
        workspaceId: updatedTask.workspaceId.toString(),
        title: activityTitle,
        message: activityMessage,
        type: completed ? 'success' : 'info',
        entityType: 'task',
        entityId: updatedTask._id.toString(),
        createdBy: auth.user._id,
        notificationLevel: 'personal',
        targetUserIds: updatedTask.assigneeId ? [updatedTask.assigneeId] : undefined,
        metadata: {
          taskId: updatedTask._id.toString(),
          taskTitle: updatedTask.title,
          completed,
          projectId: updatedTask.projectId,
          priority: updatedTask.priority,
        }
      })
    } catch (notificationError) {
      console.error('Failed to create notification:', notificationError)
    }

    // Send email notification if task has assignee and it's not the same person
    if (updatedTask.assigneeId && updatedTask.assigneeId !== auth.user._id) {
      try {
        const { User } = require('@/lib/mongodb/models')
        const assignee = await User.findById(updatedTask.assigneeId)
        if (assignee && emailService.isReady()) {
          const subject = completed
            ? `Task Completed: ${updatedTask.title}`
            : `Task Reopened: ${updatedTask.title}`

          const emailContent = `
            <h2>${activityTitle}</h2>
            <p>Hello ${assignee.fullName},</p>
            <p>${activityMessage} by ${auth.user.fullName || auth.user.email}.</p>
            <p><strong>Task Details:</strong></p>
            <ul>
              <li><strong>Title:</strong> ${updatedTask.title}</li>
              <li><strong>Priority:</strong> ${updatedTask.priority}</li>
              <li><strong>Status:</strong> ${updatedTask.status}</li>
              ${updatedTask.dueDate ? `<li><strong>Due Date:</strong> ${new Date(updatedTask.dueDate).toLocaleDateString()}</li>` : ''}
            </ul>
            <p>You can view the task details in your CRM dashboard.</p>
            <p>Best regards,<br>CRM Team</p>
          `

          await emailService.sendEmail({
            to: assignee.email,
            subject,
            html: emailContent,
          })
        }
      } catch (emailError) {
        console.error('Failed to send email notification:', emailError)
      }
    }

    return NextResponse.json({
      task: {
        ...updatedTask.toJSON(),
        id: updatedTask._id,
        assignee: updatedTask.assigneeId,
      }
    })

  } catch (error) {
    console.error('Error toggling task completion:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}