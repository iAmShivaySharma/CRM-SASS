'use client'

import React, { useState, useEffect, useCallback, memo } from 'react'
import { WallpaperPreferences, wallpaperService } from '@/lib/services/wallpaperService'
import { cn } from '@/lib/utils'

interface OptimizedWallpaperProps {
  preferences: WallpaperPreferences
  className?: string
}

function OptimizedWallpaper({ preferences, className }: OptimizedWallpaperProps) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [currentImageUrl, setCurrentImageUrl] = useState<string>('')

  const preloadImage = useCallback((url: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve()
      img.onerror = reject
      img.src = url
    })
  }, [])

  useEffect(() => {
    if (!preferences.enabled || !preferences.imageUrl) {
      setIsLoaded(false)
      setCurrentImageUrl('')
      return
    }

    // Optimize the image URL for better performance
    const optimizedUrl = wallpaperService.optimizeImageUrl(preferences.imageUrl)

    if (optimizedUrl === currentImageUrl) {
      return
    }

    setIsLoading(true)
    setIsLoaded(false)

    preloadImage(optimizedUrl)
      .then(() => {
        setCurrentImageUrl(optimizedUrl)
        setIsLoaded(true)
      })
      .catch(() => {
        setIsLoaded(false)
      })
      .finally(() => {
        setIsLoading(false)
      })
  }, [preferences.enabled, preferences.imageUrl, preloadImage, currentImageUrl])

  if (!preferences.enabled || !currentImageUrl) {
    return null
  }

  const generateOptimizedStyle = (): React.CSSProperties => {
    const style: React.CSSProperties = {
      backgroundImage: `url(${currentImageUrl})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      backgroundAttachment: 'fixed',
      willChange: 'transform, opacity',
      transform: 'translateZ(0)', // Force hardware acceleration
    }

    // Apply filters more efficiently
    const filters: string[] = []

    if (preferences.blurAmount > 0) {
      filters.push(`blur(${preferences.blurAmount}px)`)
    }

    if (preferences.transparency < 100) {
      style.opacity = preferences.transparency / 100
    }

    if (filters.length > 0) {
      style.filter = filters.join(' ')
    }

    // Handle overlay color with better performance
    if (preferences.overlayColor && preferences.overlayColor !== 'transparent') {
      style.background = `linear-gradient(${preferences.overlayColor}, ${preferences.overlayColor}), url(${currentImageUrl})`
      style.backgroundBlendMode = 'overlay'
      style.backgroundSize = 'cover, cover'
      style.backgroundPosition = 'center, center'
      style.backgroundRepeat = 'no-repeat, no-repeat'
      style.backgroundAttachment = 'fixed, fixed'
    }

    return style
  }

  return (
    <>
      {/* Loading placeholder */}
      {isLoading && !isLoaded && (
        <div className="fixed inset-0 z-0 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 animate-pulse" />
      )}

      {/* Optimized wallpaper */}
      <div
        className={cn(
          'fixed inset-0 z-0 transition-opacity duration-500 wallpaper-optimized',
          isLoaded ? 'opacity-100' : 'opacity-0',
          className
        )}
        style={generateOptimizedStyle()}
        role="img"
        aria-label="Dashboard wallpaper"
      />
    </>
  )
}

export default memo(OptimizedWallpaper)