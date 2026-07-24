interface LeadData {
  name?: string
  email?: string
  phone?: string
  company?: string
  value?: number
  source?: string
  notes?: string
  customData?: Record<string, any>
  lastContactedAt?: Date
  nextFollowUpAt?: Date
}

interface ScoreResult {
  score: number
  factors: string[]
  priority: 'low' | 'medium' | 'high'
}

export function calculateLeadScore(lead: LeadData): ScoreResult {
  let score = 0
  const factors: string[] = []

  if (lead.email) {
    score += 15
    factors.push('Has email')
    if (
      lead.email.includes('@gmail.') ||
      lead.email.includes('@yahoo.') ||
      lead.email.includes('@hotmail.')
    ) {
      score += 0
    } else {
      score += 5
      factors.push('Business email')
    }
  }

  if (lead.phone) {
    score += 10
    factors.push('Has phone')
  }

  if (lead.company) {
    score += 15
    factors.push('Has company')
  }

  if (lead.value && lead.value > 0) {
    score += 10
    factors.push('Has deal value')
    if (lead.value >= 10000) {
      score += 10
      factors.push('High value deal')
    } else if (lead.value >= 1000) {
      score += 5
      factors.push('Medium value deal')
    }
  }

  if (lead.source) {
    const highValueSources = ['referral', 'website']
    const mediumValueSources = ['social', 'social_media', 'email']
    if (highValueSources.includes(lead.source)) {
      score += 10
      factors.push('High-value source')
    } else if (mediumValueSources.includes(lead.source)) {
      score += 5
      factors.push('Medium-value source')
    }
  }

  if (lead.notes && lead.notes.length > 20) {
    score += 5
    factors.push('Has detailed notes')
  }

  if (lead.lastContactedAt) {
    const daysSinceContact = Math.floor(
      (Date.now() - new Date(lead.lastContactedAt).getTime()) /
        (1000 * 60 * 60 * 24)
    )
    if (daysSinceContact <= 7) {
      score += 10
      factors.push('Recently contacted')
    } else if (daysSinceContact <= 30) {
      score += 5
      factors.push('Contacted this month')
    }
  }

  if (lead.nextFollowUpAt) {
    score += 5
    factors.push('Follow-up scheduled')
  }

  if (lead.customData && Object.keys(lead.customData).length > 0) {
    const fieldCount = Object.keys(lead.customData).filter(
      k => k !== '_originalPayload'
    ).length
    if (fieldCount >= 5) {
      score += 10
      factors.push('Rich profile data')
    } else if (fieldCount >= 2) {
      score += 5
      factors.push('Has custom data')
    }
  }

  score = Math.min(100, Math.max(0, score))

  let priority: 'low' | 'medium' | 'high' = 'low'
  if (score >= 60) {
    priority = 'high'
  } else if (score >= 30) {
    priority = 'medium'
  }

  return { score, factors, priority }
}
