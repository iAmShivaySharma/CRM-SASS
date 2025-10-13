import { NextRequest, NextResponse } from 'next/server'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { Task, Project, ProjectMember } from '@/lib/mongodb/client'
import { connectToMongoDB } from '@/lib/mongodb/connection'

async function checkProjectTaskAccess(projectId: string, userId: string) {
  const project = await Project.findById(projectId)
  if (!project) return null

  const projectMember = await ProjectMember.findOne({
    projectId,
    userId,
    status: 'active',
  })

  if (
    !projectMember &&
    project.visibility !== 'workspace' &&
    project.visibility !== 'public'
  ) {
    return null
  }

  return project
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToMongoDB()
    const auth = await verifyAuthToken(request)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: taskId } = await params

    // Find the task and update time tracking
    const task = await Task.findById(taskId)
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    // Check if user has access to this task's project
    const project = await checkProjectTaskAccess(task.projectId, auth.user.id)
    if (!project) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const now = new Date()

    // Initialize timeTracking if it doesn't exist
    if (!task.timeTracking) {
      task.timeTracking = {
        isActive: false,
        totalTracked: 0,
        sessions: [],
      }
    }

    // Stop any existing active session
    if (task.timeTracking.isActive && task.timeTracking.currentSessionStart) {
      const sessionDuration = Math.floor(
        (now.getTime() - new Date(task.timeTracking.currentSessionStart).getTime()) / 1000
      )

      // Add the completed session
      task.timeTracking.sessions.push({
        startedAt: task.timeTracking.currentSessionStart,
        endedAt: now,
        duration: sessionDuration,
        userId: auth.user.id,
      })

      task.timeTracking.totalTracked += sessionDuration
    }

    // Start new session
    task.timeTracking.isActive = true
    task.timeTracking.currentSessionStart = now

    console.log('Starting time tracking - before save:', {
      taskId,
      isActive: task.timeTracking.isActive,
      currentSessionStart: task.timeTracking.currentSessionStart,
      totalTracked: task.timeTracking.totalTracked
    })

    await task.save()

    console.log('Starting time tracking - after save:', {
      taskId,
      isActive: task.timeTracking.isActive,
      currentSessionStart: task.timeTracking.currentSessionStart,
      totalTracked: task.timeTracking.totalTracked
    })

    return NextResponse.json({
      success: true,
      task: {
        id: task._id.toString(),
        title: task.title,
        description: task.description,
        projectId: task.projectId,
        status: task.status,
        priority: task.priority,
        assigneeId: task.assigneeId,
        createdBy: task.createdBy,
        tags: task.tags,
        dueDate: task.dueDate?.toISOString(),
        estimatedHours: task.estimatedHours,
        actualHours: task.actualHours,
        timeTracking: {
          isActive: task.timeTracking.isActive,
          totalTracked: task.timeTracking.totalTracked,
          sessions: task.timeTracking.sessions.map((session: {
            startedAt: Date
            endedAt?: Date
            duration?: number
            userId: string
          }) => ({
            startedAt: session.startedAt.toISOString(),
            endedAt: session.endedAt?.toISOString(),
            duration: session.duration,
            userId: session.userId,
          })),
          currentSessionStart: task.timeTracking.currentSessionStart?.toISOString(),
        },
        order: task.order,
        dependencies: task.dependencies,
        attachments: task.attachments,
        customFields: task.customFields,
        workspaceId: task.workspaceId,
        createdAt: task.createdAt.toISOString(),
        updatedAt: task.updatedAt.toISOString(),
      },
    })
  } catch (error) {
    console.error('Error starting time tracking:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}