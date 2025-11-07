'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { Shuffle, Download, Eye, EyeOff, Search, Palette, Clock } from 'lucide-react'
import { WallpaperImage, wallpaperService } from '@/lib/services/wallpaperService'
import { useGetUserPreferencesQuery, usePatchUserPreferencesMutation } from '@/lib/api/userPreferencesApi'

interface WallpaperSettingsProps {
  className?: string
}

const CATEGORIES = [
  'nature', 'city', 'architecture', 'business', 'technology', 'abstract',
  'minimal', 'space', 'ocean', 'mountains', 'forest', 'sunset'
]

const OVERLAY_COLORS = [
  { name: 'None', value: 'transparent' },
  { name: 'Dark', value: 'rgba(0,0,0,0.3)' },
  { name: 'Light', value: 'rgba(255,255,255,0.3)' },
  { name: 'Blue', value: 'rgba(59,130,246,0.3)' },
  { name: 'Green', value: 'rgba(34,197,94,0.3)' },
  { name: 'Purple', value: 'rgba(168,85,247,0.3)' },
]

export default function WallpaperSettings({ className }: WallpaperSettingsProps) {
  const { data: userPreferences, isLoading: preferencesLoading } = useGetUserPreferencesQuery()
  const [patchPreferences] = usePatchUserPreferencesMutation()

  const [isLoading, setIsLoading] = useState(false)
  const [wallpapers, setWallpapers] = useState<WallpaperImage[]>([])
  const [collections, setCollections] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState('random')
  const [previewMode, setPreviewMode] = useState(false)

  const preferences = useMemo(() => {
    const defaultPrefs = wallpaperService.getDefaultPreferences()
    return {
      ...defaultPrefs,
      ...userPreferences?.preferences?.wallpaper
    }
  }, [userPreferences])

  // Debounced update for performance-sensitive settings like transparency
  const timeoutRef = useRef<NodeJS.Timeout>()

  const updatePreferences = async (updates: Partial<typeof preferences>) => {
    try {
      await patchPreferences({
        wallpaper: { ...preferences, ...updates }
      }).unwrap()
      toast.success('Wallpaper settings updated!')
    } catch (error) {
      toast.error('Failed to update wallpaper settings')
    }
  }

  const debouncedUpdatePreferences = useCallback(
    (updates: Partial<typeof preferences>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      timeoutRef.current = setTimeout(() => {
        updatePreferences(updates)
      }, 300) // 300ms debounce
    },
    [updatePreferences]
  )

  const loadFeaturedCollections = useCallback(async () => {
    try {
      setIsLoading(true)
      const data = await fetch('/api/wallpaper/collections').then(res => res.json())
      setCollections(data)
    } catch (error) {
      toast.error('Failed to load wallpaper collections')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadFeaturedCollections()

    // Cleanup timeout on unmount
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [loadFeaturedCollections])

  const loadRandomWallpaper = async (category?: string) => {
    try {
      setIsLoading(true)

      if (preferences.source === 'fallback') {
        const fallbackWallpaper = wallpaperService.getRandomFallbackWallpaper()
        await updatePreferences({
          imageUrl: fallbackWallpaper.urls.regular,
          imageId: fallbackWallpaper.id,
          source: 'fallback'
        })
        return
      }

      const params = new URLSearchParams()
      if (category) params.set('category', category)

      const response = await fetch(`/api/wallpaper/random?${params}`)
      const wallpaper = await response.json()

      if (response.ok) {
        await updatePreferences({
          imageUrl: wallpaper.urls.regular,
          imageId: wallpaper.id,
          source: 'unsplash'
        })
      } else {
        throw new Error(wallpaper.message)
      }
    } catch (error) {
      toast.error('Failed to load random wallpaper')
    } finally {
      setIsLoading(false)
    }
  }

  const searchWallpapers = async () => {
    if (!searchQuery.trim()) return

    try {
      setIsLoading(true)

      if (preferences.source === 'fallback') {
        const fallbackWallpapers = wallpaperService.getFallbackWallpapers()
        setWallpapers(fallbackWallpapers)
        setActiveTab('search')
        return
      }

      const params = new URLSearchParams({
        q: searchQuery,
        per_page: '20'
      })

      const response = await fetch(`/api/wallpaper/search?${params}`)
      const data = await response.json()

      if (response.ok) {
        setWallpapers(data.results)
        setActiveTab('search')
      } else {
        throw new Error(data.message)
      }
    } catch (error) {
      toast.error('Failed to search wallpapers')
    } finally {
      setIsLoading(false)
    }
  }

  const selectWallpaper = async (wallpaper: WallpaperImage) => {
    await updatePreferences({
      imageUrl: wallpaper.urls.regular,
      imageId: wallpaper.id,
      source: preferences.source === 'fallback' ? 'fallback' : 'unsplash'
    })
  }

  const backgroundStyle = useMemo(() =>
    wallpaperService.generateBackgroundStyle(preferences),
    [preferences]
  )

  return (
    <div className="space-y-6">
      {/* Preview */}
      {previewMode && preferences.enabled && preferences.imageUrl && (
        <div
          className="fixed inset-0 z-40 pointer-events-none"
          style={backgroundStyle}
        />
      )}

      {/* Main Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Live Wallpaper Settings
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPreviewMode(!previewMode)}
              >
                {previewMode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                {previewMode ? 'Hide Preview' : 'Preview'}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Enable/Disable */}
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="enable-wallpaper">Enable Live Wallpaper</Label>
              <p className="text-sm text-muted-foreground">
                Display a background wallpaper on your dashboard
              </p>
            </div>
            <Switch
              id="enable-wallpaper"
              checked={preferences.enabled}
              onCheckedChange={(enabled) => updatePreferences({ enabled })}
            />
          </div>

          {preferences.enabled && (
            <>
              {/* Current Wallpaper Preview */}
              {preferences.imageUrl && (
                <div className="space-y-2">
                  <Label>Current Wallpaper</Label>
                  <div
                    className="w-full h-32 rounded-lg bg-cover bg-center border-2 border-dashed border-muted-foreground/20"
                    style={{
                      backgroundImage: `url(${preferences.imageUrl})`,
                      ...backgroundStyle
                    }}
                  />
                </div>
              )}

              {/* Source Selection */}
              <div className="space-y-2">
                <Label>Wallpaper Source</Label>
                <Select
                  value={preferences.source}
                  onValueChange={(source: 'unsplash' | 'custom' | 'fallback' | 'none') =>
                    updatePreferences({ source })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unsplash">Unsplash Photos</SelectItem>
                    <SelectItem value="fallback">Static Wallpapers</SelectItem>
                    <SelectItem value="custom">Custom URL</SelectItem>
                    <SelectItem value="none">None</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Custom URL Input */}
              {preferences.source === 'custom' && (
                <div className="space-y-2">
                  <Label htmlFor="custom-url">Custom Image URL</Label>
                  <Input
                    id="custom-url"
                    type="url"
                    placeholder="https://example.com/wallpaper.jpg"
                    value={preferences.customUrl || ''}
                    onChange={(e) => updatePreferences({
                      customUrl: e.target.value,
                      imageUrl: e.target.value
                    })}
                  />
                </div>
              )}

              {/* Fallback Wallpapers */}
              {preferences.source === 'fallback' && (
                <div className="space-y-2">
                  <Label>Static Wallpapers</Label>
                  <p className="text-sm text-muted-foreground">
                    Select from a curated collection of high-quality wallpapers
                  </p>
                  <Button
                    onClick={() => {
                      const fallbackWallpaper = wallpaperService.getRandomFallbackWallpaper()
                      updatePreferences({
                        imageUrl: fallbackWallpaper.urls.regular,
                        imageId: fallbackWallpaper.id,
                        source: 'fallback'
                      })
                    }}
                    className="w-full"
                  >
                    <Shuffle className="h-4 w-4 mr-2" />
                    Get Random Static Wallpaper
                  </Button>
                </div>
              )}

              {/* Transparency Control */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Transparency: {preferences.transparency}%</Label>
                  <span className="text-sm text-muted-foreground">
                    {preferences.transparency < 30 ? 'Very Light' :
                     preferences.transparency < 60 ? 'Light' :
                     preferences.transparency < 85 ? 'Medium' : 'Heavy'}
                  </span>
                </div>
                <Slider
                  value={[preferences.transparency]}
                  onValueChange={([transparency]) => debouncedUpdatePreferences({ transparency })}
                  max={100}
                  min={5}
                  step={5}
                  className="w-full"
                />
              </div>

              {/* Blur Control */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Blur Amount: {preferences.blurAmount}px</Label>
                </div>
                <Slider
                  value={[preferences.blurAmount]}
                  onValueChange={([blurAmount]) => debouncedUpdatePreferences({ blurAmount })}
                  max={20}
                  min={0}
                  step={1}
                  className="w-full"
                />
              </div>

              {/* Overlay Color */}
              <div className="space-y-2">
                <Label>Overlay Color</Label>
                <Select
                  value={preferences.overlayColor}
                  onValueChange={(overlayColor) => updatePreferences({ overlayColor })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {OVERLAY_COLORS.map((color) => (
                      <SelectItem key={color.value} value={color.value}>
                        {color.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Auto Change Settings */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="auto-change">Auto Change Wallpaper</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically change wallpaper at intervals
                    </p>
                  </div>
                  <Switch
                    id="auto-change"
                    checked={preferences.autoChange}
                    onCheckedChange={(autoChange) => updatePreferences({ autoChange })}
                  />
                </div>

                {preferences.autoChange && (
                  <div className="space-y-2">
                    <Label>Change Interval (minutes)</Label>
                    <Select
                      value={preferences.changeInterval.toString()}
                      onValueChange={(value) => updatePreferences({
                        changeInterval: parseInt(value)
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="15">15 minutes</SelectItem>
                        <SelectItem value="30">30 minutes</SelectItem>
                        <SelectItem value="60">1 hour</SelectItem>
                        <SelectItem value="180">3 hours</SelectItem>
                        <SelectItem value="360">6 hours</SelectItem>
                        <SelectItem value="720">12 hours</SelectItem>
                        <SelectItem value="1440">24 hours</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Wallpaper Browser */}
      {preferences.enabled && (preferences.source === 'unsplash' || preferences.source === 'fallback') && (
        <Card>
          <CardHeader>
            <CardTitle>Browse Wallpapers</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="random">Random</TabsTrigger>
                <TabsTrigger value="search">Search</TabsTrigger>
                <TabsTrigger value="collections">Collections</TabsTrigger>
              </TabsList>

              <TabsContent value="random" className="space-y-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select
                      value={preferences.category}
                      onValueChange={(category) => updatePreferences({ category })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category.charAt(0).toUpperCase() + category.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    onClick={() => loadRandomWallpaper(preferences.category)}
                    disabled={isLoading}
                    className="w-full"
                  >
                    <Shuffle className="h-4 w-4 mr-2" />
                    {isLoading ? 'Loading...' : 'Get Random Wallpaper'}
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="search" className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Search for wallpapers..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && searchWallpapers()}
                  />
                  <Button onClick={searchWallpapers} disabled={isLoading}>
                    <Search className="h-4 w-4" />
                  </Button>
                </div>

                {wallpapers.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {wallpapers.map((wallpaper) => (
                      <div key={wallpaper.id} className="group relative">
                        <img
                          src={wallpaper.urls.thumb}
                          alt={wallpaper.alt_description || 'Wallpaper thumbnail'}
                          className="w-full h-24 object-cover rounded cursor-pointer transition-opacity group-hover:opacity-75"
                          onClick={() => selectWallpaper(wallpaper)}
                        />
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button size="sm" variant="secondary">
                            Select
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="collections" className="space-y-4">
                {isLoading ? (
                  <div className="space-y-4">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Skeleton key={i} className="h-24 w-full" />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {collections.map((collection) => (
                      <Card key={collection.id} className="p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-medium">{collection.title}</h4>
                            <p className="text-sm text-muted-foreground">
                              {collection.description}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => loadRandomWallpaper(collection.title)}
                          >
                            Use Collection
                          </Button>
                        </div>
                        {collection.preview_photos.length > 0 && (
                          <div className="flex gap-2 mt-3">
                            {collection.preview_photos.slice(0, 4).map((photo: WallpaperImage) => (
                              <img
                                key={photo.id}
                                src={photo.urls.thumb}
                                alt={photo.alt_description || 'Collection preview'}
                                className="w-16 h-12 object-cover rounded"
                              />
                            ))}
                          </div>
                        )}
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  )
}