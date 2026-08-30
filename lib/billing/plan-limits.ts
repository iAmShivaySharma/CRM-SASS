import { Plan, Workspace, Lead, WorkspaceMember } from '@/lib/mongodb/client'
import { NextResponse } from 'next/server'

export const DEFAULT_LIMITS: Record<
  string,
  { leads: number; members: number; storage: number }
> = {
  free: { leads: 500, members: 3, storage: 1000 },
  starter: { leads: 5000, members: 10, storage: 10000 },
  pro: { leads: 50000, members: 25, storage: 50000 },
  enterprise: { leads: Infinity, members: Infinity, storage: 200000 },
}

async function getPlanLimits(planId: string) {
  const plan = await Plan.findById(planId)
  if (plan?.limits) {
    return {
      leads: plan.limits.leads ?? DEFAULT_LIMITS[planId]?.leads ?? 100,
      members: plan.limits.members ?? DEFAULT_LIMITS[planId]?.members ?? 2,
      storage: plan.limits.storage ?? DEFAULT_LIMITS[planId]?.storage ?? 500,
    }
  }
  return DEFAULT_LIMITS[planId] || DEFAULT_LIMITS.free
}

export async function checkLeadLimit(workspaceId: string) {
  const workspace = await Workspace.findById(workspaceId)
  if (!workspace) return null

  const limits = await getPlanLimits(workspace.planId || 'free')
  if (limits.leads === Infinity) return null

  const currentCount = await Lead.countDocuments({ workspaceId })
  if (currentCount >= limits.leads) {
    return NextResponse.json(
      {
        message: `Lead limit reached (${limits.leads}). Upgrade your plan to add more leads.`,
        code: 'PLAN_LIMIT_REACHED',
        limit: limits.leads,
        current: currentCount,
      },
      { status: 403 }
    )
  }
  return null
}

export async function checkMemberLimit(workspaceId: string) {
  const workspace = await Workspace.findById(workspaceId)
  if (!workspace) return null

  const limits = await getPlanLimits(workspace.planId || 'free')
  if (limits.members === Infinity) return null

  const currentCount = await WorkspaceMember.countDocuments({
    workspaceId,
    status: 'active',
  })
  if (currentCount >= limits.members) {
    return NextResponse.json(
      {
        message: `Member limit reached (${limits.members}). Upgrade your plan to invite more members.`,
        code: 'PLAN_LIMIT_REACHED',
        limit: limits.members,
        current: currentCount,
      },
      { status: 403 }
    )
  }
  return null
}

export async function getWorkspaceUsage(workspaceId: string) {
  const workspace = await Workspace.findById(workspaceId)
  const planId = workspace?.planId || 'free'
  const limits = await getPlanLimits(planId)

  const [leadCount, memberCount] = await Promise.all([
    Lead.countDocuments({ workspaceId }),
    WorkspaceMember.countDocuments({ workspaceId, status: 'active' }),
  ])

  return {
    leads: {
      used: leadCount,
      limit: limits.leads === Infinity ? -1 : limits.leads,
    },
    members: {
      used: memberCount,
      limit: limits.members === Infinity ? -1 : limits.members,
    },
    storage: { used: 0, limit: limits.storage },
  }
}
