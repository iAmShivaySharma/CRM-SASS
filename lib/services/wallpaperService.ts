// Client-side logging utility
const log = {
  error: (message: string, error?: any) => {
    if (typeof window !== 'undefined') {
      console.error(message, error)
    }
  }
}

export interface WallpaperImage {
  id: string
  url: string
  urls: {
    raw: string
    full: string
    regular: string
    small: string
    thumb: string
  }
  alt_description: string
  user: {
    name: string
    username: string
  }
  width: number
  height: number
}

export interface WallpaperPreferences {
  enabled: boolean
  imageUrl: string
  imageId: string
  transparency: number // 0-100
  blurAmount: number // 0-20
  overlayColor: string
  autoChange: boolean
  changeInterval: number // minutes
  category: string
  customUrl?: string
  source: 'unsplash' | 'custom' | 'fallback' | 'none'
}

class WallpaperService {
  private readonly UNSPLASH_ACCESS_KEY = process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY || process.env.UNSPLASH_ACCESS_KEY
  private readonly UNSPLASH_API_URL = 'https://api.unsplash.com'

  // Static fallback wallpapers
  private readonly FALLBACK_WALLPAPERS = [
    {
      id: 'fallback-1',
      url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80',
      urls: {
        raw: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?ixlib=rb-4.0.3',
        full: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80',
        regular: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1080&q=80',
        small: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=400&q=80',
        thumb: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=200&q=80'
      },
      alt_description: 'Mountain landscape at sunset',
      user: {
        name: 'Fallback',
        username: 'fallback'
      },
      width: 2070,
      height: 1380
    },
    {
      id: 'fallback-2',
      url: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2071&q=80',
      urls: {
        raw: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?ixlib=rb-4.0.3',
        full: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2071&q=80',
        regular: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1080&q=80',
        small: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=400&q=80',
        thumb: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=200&q=80'
      },
      alt_description: 'Forest trees looking up',
      user: {
        name: 'Fallback',
        username: 'fallback'
      },
      width: 2071,
      height: 1380
    },
    {
      id: 'fallback-3',
      url: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2074&q=80',
      urls: {
        raw: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?ixlib=rb-4.0.3',
        full: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2074&q=80',
        regular: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1080&q=80',
        small: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=400&q=80',
        thumb: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=200&q=80'
      },
      alt_description: 'Ocean waves and sunset',
      user: {
        name: 'Fallback',
        username: 'fallback'
      },
      width: 2074,
      height: 1380
    }
  ]

  getFallbackWallpapers(): WallpaperImage[] {
    return this.FALLBACK_WALLPAPERS
  }

  getRandomFallbackWallpaper(): WallpaperImage {
    const randomIndex = Math.floor(Math.random() * this.FALLBACK_WALLPAPERS.length)
    return this.FALLBACK_WALLPAPERS[randomIndex]
  }

  async getRandomWallpaper(category?: string, featured?: boolean): Promise<WallpaperImage> {
    if (!this.UNSPLASH_ACCESS_KEY) {
      log.error('Unsplash access key not configured, using fallback wallpaper')
      return this.getRandomFallbackWallpaper()
    }

    try {
      const params = new URLSearchParams({
        client_id: this.UNSPLASH_ACCESS_KEY,
        orientation: 'landscape',
        w: '1920',
        h: '1080',
        fit: 'crop',
        ...(category && { query: category }),
        ...(featured && { featured: 'true' })
      })

      const response = await fetch(`${this.UNSPLASH_API_URL}/photos/random?${params}`)

      if (!response.ok) {
        throw new Error(`Unsplash API error: ${response.statusText}`)
      }

      const data = await response.json()
      return this.transformUnsplashImage(data)
    } catch (error) {
      log.error('Failed to fetch random wallpaper, using fallback:', error)
      return this.getRandomFallbackWallpaper()
    }
  }

  async searchWallpapers(query: string, page = 1, perPage = 20): Promise<{
    results: WallpaperImage[]
    total: number
    totalPages: number
  }> {
    if (!this.UNSPLASH_ACCESS_KEY) {
      log.error('Unsplash access key not configured, using fallback wallpapers')
      return {
        results: this.FALLBACK_WALLPAPERS,
        total: this.FALLBACK_WALLPAPERS.length,
        totalPages: 1
      }
    }

    try {
      const params = new URLSearchParams({
        client_id: this.UNSPLASH_ACCESS_KEY,
        query,
        page: page.toString(),
        per_page: perPage.toString(),
        orientation: 'landscape'
      })

      const response = await fetch(`${this.UNSPLASH_API_URL}/search/photos?${params}`)

      if (!response.ok) {
        throw new Error(`Unsplash API error: ${response.statusText}`)
      }

      const data = await response.json()

      return {
        results: data.results.map((img: any) => this.transformUnsplashImage(img)),
        total: data.total,
        totalPages: data.total_pages
      }
    } catch (error) {
      log.error('Failed to search wallpapers, using fallback:', error)
      return {
        results: this.FALLBACK_WALLPAPERS,
        total: this.FALLBACK_WALLPAPERS.length,
        totalPages: 1
      }
    }
  }

  getFallbackCollections(): {
    id: string
    title: string
    description: string
    preview_photos: WallpaperImage[]
  }[] {
    return [
      {
        id: 'fallback-nature',
        title: 'Nature Collection',
        description: 'Beautiful nature wallpapers including mountains, forests, and oceans',
        preview_photos: this.FALLBACK_WALLPAPERS
      }
    ]
  }

  async getFeaturedCollections(): Promise<{
    id: string
    title: string
    description: string
    preview_photos: WallpaperImage[]
  }[]> {
    if (!this.UNSPLASH_ACCESS_KEY) {
      log.error('Unsplash access key not configured, using fallback collections')
      return this.getFallbackCollections()
    }

    try {
      const params = new URLSearchParams({
        client_id: this.UNSPLASH_ACCESS_KEY,
        per_page: '10',
        page: '1'
      })

      const url = `${this.UNSPLASH_API_URL}/collections?${params}`

      const response = await fetch(url)

      if (!response.ok) {
        const errorText = await response.text()
        log.error('Unsplash API Error Response:', errorText)
        throw new Error(`Unsplash API error: ${response.status} ${response.statusText} - ${errorText}`)
      }

      const data = await response.json()

      return data.map((collection: any) => ({
        id: collection.id,
        title: collection.title,
        description: collection.description || '',
        preview_photos: collection.preview_photos?.map((img: any) => this.transformUnsplashImage(img)) || []
      }))
    } catch (error) {
      log.error('Failed to fetch featured collections, using fallback:', error)
      return this.getFallbackCollections()
    }
  }

  private transformUnsplashImage(data: any): WallpaperImage {
    return {
      id: data.id,
      url: data.urls.regular,
      urls: data.urls,
      alt_description: data.alt_description || data.description || 'Wallpaper',
      user: {
        name: data.user.name,
        username: data.user.username
      },
      width: data.width,
      height: data.height
    }
  }

  generateCssFilter(preferences: WallpaperPreferences): string {
    const filters = []

    if (preferences.blurAmount > 0) {
      filters.push(`blur(${preferences.blurAmount}px)`)
    }

    if (preferences.transparency < 100) {
      filters.push(`opacity(${preferences.transparency / 100})`)
    }

    return filters.length > 0 ? filters.join(' ') : 'none'
  }

  generateBackgroundStyle(preferences: WallpaperPreferences): React.CSSProperties {
    if (!preferences.enabled || !preferences.imageUrl) {
      return {}
    }

    const style: React.CSSProperties = {
      backgroundImage: `url(${preferences.imageUrl})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      backgroundAttachment: 'fixed',
      willChange: 'transform, opacity',
      transform: 'translateZ(0)', // Force hardware acceleration
    }

    if (preferences.blurAmount > 0 || preferences.transparency < 100) {
      style.filter = this.generateCssFilter(preferences)
    }

    if (preferences.overlayColor && preferences.overlayColor !== 'transparent') {
      style.backgroundBlendMode = 'overlay'
      style.backgroundColor = preferences.overlayColor
    }

    return style
  }

  // Optimize image URL for better performance
  optimizeImageUrl(url: string, width = 1920, quality = 80): string {
    // For Unsplash URLs, optimize the parameters
    if (url.includes('unsplash.com')) {
      const urlObj = new URL(url)
      urlObj.searchParams.set('w', width.toString())
      urlObj.searchParams.set('q', quality.toString())
      urlObj.searchParams.set('fm', 'webp') // Use WebP format for better compression
      urlObj.searchParams.set('fit', 'crop')
      return urlObj.toString()
    }
    return url
  }

  getDefaultPreferences(): WallpaperPreferences {
    return {
      enabled: false,
      imageUrl: '',
      imageId: '',
      transparency: 25,
      blurAmount: 0,
      overlayColor: 'transparent',
      autoChange: false,
      changeInterval: 60,
      category: 'nature',
      source: 'none'
    }
  }

  validateImageUrl(url: string): boolean {
    try {
      new URL(url)
      return /\.(jpg|jpeg|png|webp|gif)$/i.test(url)
    } catch {
      return false
    }
  }
}

export const wallpaperService = new WallpaperService()