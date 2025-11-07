import { NextRequest, NextResponse } from 'next/server'
import { wallpaperService } from '@/lib/services/wallpaperService'
import { log } from '@/lib/logging/logger'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')
    const page = parseInt(searchParams.get('page') || '1')
    const perPage = parseInt(searchParams.get('per_page') || '20')

    if (!query) {
      return NextResponse.json(
        { error: 'Search query is required' },
        { status: 400 }
      )
    }

    const results = await wallpaperService.searchWallpapers(query, page, perPage)

    return NextResponse.json(results)
  } catch (error: any) {
    log.error('Failed to search wallpapers:', error)
    return NextResponse.json(
      {
        error: 'Failed to search wallpapers',
        message: error.message
      },
      { status: 500 }
    )
  }
}