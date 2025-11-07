import { NextRequest, NextResponse } from 'next/server'
import { wallpaperService } from '@/lib/services/wallpaperService'
import { log } from '@/lib/logging/logger'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category') || undefined
    const featured = searchParams.get('featured') === 'true'

    const wallpaper = await wallpaperService.getRandomWallpaper(category, featured)

    return NextResponse.json(wallpaper)
  } catch (error: any) {
    log.error('Failed to get random wallpaper:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch wallpaper',
        message: error.message
      },
      { status: 500 }
    )
  }
}