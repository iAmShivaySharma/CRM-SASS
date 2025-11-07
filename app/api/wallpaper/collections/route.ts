import { NextRequest, NextResponse } from 'next/server'
import { wallpaperService } from '@/lib/services/wallpaperService'
import { log } from '@/lib/logging/logger'

export async function GET(request: NextRequest) {
  try {
    const collections = await wallpaperService.getFeaturedCollections()

    return NextResponse.json(collections)
  } catch (error: any) {
    log.error('Failed to get wallpaper collections:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch collections',
        message: error.message
      },
      { status: 500 }
    )
  }
}