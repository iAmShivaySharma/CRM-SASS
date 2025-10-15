import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { User, WorkspaceMember, Attendance } from '@/lib/mongodb/models'
import { log } from '@/lib/logging/logger'

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get('workspaceId') || auth.user.lastActiveWorkspaceId

    if (!workspaceId) {
      return NextResponse.json({ error: 'No workspace selected' }, { status: 400 })
    }

    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const search = searchParams.get('search')
    const includeAttendance = searchParams.get('includeAttendance') === 'true'

    // Build query for workspace members
    const memberQuery: any = {
      workspaceId,
      status: 'active'
    }

    // Get workspace members with user details
    const membersAggregation = [
      { $match: memberQuery },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' },
      {
        $lookup: {
          from: 'roles',
          localField: 'roleId',
          foreignField: '_id',
          as: 'role'
        }
      },
      { $unwind: '$role' }
    ]

    // Add search filter if provided
    if (search) {
      membersAggregation.push({
        $match: {
          $or: [
            { 'user.fullName': { $regex: search, $options: 'i' } },
            { 'user.email': { $regex: search, $options: 'i' } },
            { 'role.name': { $regex: search, $options: 'i' } }
          ]
        }
      } as any)
    }

    // Get total count
    const totalPipeline = [...membersAggregation, { $count: 'total' }]
    const totalResult = await WorkspaceMember.aggregate(totalPipeline)
    const total = totalResult[0]?.total || 0

    // Add pagination
    membersAggregation.push(
      { $skip: (page - 1) * limit },
      { $limit: limit },
      {
        $project: {
          _id: 1,
          userId: '$user._id',
          fullName: '$user.fullName',
          email: '$user.email',
          avatar: '$user.avatar',
          role: {
            _id: '$role._id',
            name: '$role.name'
          },
          joinedAt: 1,
          status: 1,
          lastActive: '$user.lastSignInAt'
        }
      }
    )

    const employees = await WorkspaceMember.aggregate(membersAggregation)

    // If attendance data is requested, fetch today's attendance for each employee
    if (includeAttendance) {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)

      for (const employee of employees) {
        const attendance = await Attendance.findOne({
          userId: employee.userId,
          workspaceId,
          date: { $gte: today, $lt: tomorrow }
        }).populate('shiftId', 'name startTime endTime')

        employee.todayAttendance = attendance ? {
          _id: attendance._id,
          status: attendance.status,
          clockIn: attendance.clockIn,
          clockOut: attendance.clockOut,
          totalWorkTime: attendance.calculateTotalWorkTime(),
          workType: attendance.workType,
          shift: attendance.shiftId
        } : null
      }
    }

    return NextResponse.json({
      employees,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    log.error('Get employees error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch employees' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    const body = await request.json()
    const workspaceId = auth.user.lastActiveWorkspaceId

    if (!workspaceId) {
      return NextResponse.json({ error: 'No workspace selected' }, { status: 400 })
    }

    const {
      fullName,
      email,
      roleId,
      department,
      position,
      startDate
    } = body

    // Check if user with email already exists
    const existingUser = await User.findOne({ email })

    if (existingUser) {
      // Check if already a member of this workspace
      const existingMember = await WorkspaceMember.findOne({
        userId: existingUser._id,
        workspaceId
      })

      if (existingMember) {
        return NextResponse.json(
          { error: 'User is already a member of this workspace' },
          { status: 400 }
        )
      }

      // Add existing user to workspace
      const newMember = new WorkspaceMember({
        workspaceId,
        userId: existingUser._id,
        roleId,
        status: 'active',
        joinedAt: new Date(),
        metadata: {
          department,
          position,
          startDate: startDate ? new Date(startDate) : new Date()
        }
      })

      await newMember.save()
      await newMember.populate(['userId', 'roleId'])

      return NextResponse.json({
        success: true,
        employee: newMember,
        message: 'Existing user added to workspace'
      })
    }

    // Create new user (this would typically send an invitation email)
    const newUser = new User({
      email,
      fullName,
      emailConfirmed: false, // Will be confirmed when they set up their account
      createdAt: new Date(),
      updatedAt: new Date()
    })

    await newUser.save()

    // Add to workspace
    const newMember = new WorkspaceMember({
      workspaceId,
      userId: newUser._id,
      roleId,
      status: 'pending', // Pending until they accept invitation
      joinedAt: new Date(),
      metadata: {
        department,
        position,
        startDate: startDate ? new Date(startDate) : new Date()
      }
    })

    await newMember.save()
    await newMember.populate(['userId', 'roleId'])

    // TODO: Send invitation email here

    return NextResponse.json({
      success: true,
      employee: newMember,
      message: 'Employee invitation created successfully'
    })
  } catch (error) {
    log.error('Create employee error:', error)
    return NextResponse.json(
      { error: 'Failed to create employee' },
      { status: 500 }
    )
  }
}