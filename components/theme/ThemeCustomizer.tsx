'use client'

import { useState, useCallback } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useAppSelector, useAppDispatch } from '@/lib/hooks'
import {
  setThemeMode,
  setPrimaryColor,
  setPreset,
  updateThemeColors,
  updateTypography,
  updateSpacing,
  setBorderRadius,
  toggleAnimations,
  resetTheme,
} from '@/lib/slices/themeSlice'
import { usePatchUserPreferencesMutation } from '@/lib/api/userPreferencesApi'
import {
  Palette,
  Type,
  Layout,
  Zap,
  RotateCcw,
  Download,
  Upload,
  Eye,
  Monitor,
  Sun,
  Moon,
} from 'lucide-react'
import { toast } from 'sonner'

const colorInputs = [
  { key: 'primary', label: 'Primary', description: 'Main brand color' },
  { key: 'secondary', label: 'Secondary', description: 'Secondary elements' },
  { key: 'accent', label: 'Accent', description: 'Highlights and CTAs' },
  { key: 'text', label: 'Text', description: 'Main text color' },
  { key: 'success', label: 'Success', description: 'Success states' },
  { key: 'warning', label: 'Warning', description: 'Warning states' },
  { key: 'error', label: 'Error', description: 'Error states' },
]

const fontOptions = [
  { value: 'Inter', label: 'Inter' },
  { value: 'Roboto', label: 'Roboto' },
  { value: 'Open Sans', label: 'Open Sans' },
  { value: 'Lato', label: 'Lato' },
  { value: 'Poppins', label: 'Poppins' },
  { value: 'Montserrat', label: 'Montserrat' },
]

export function ThemeCustomizer() {
  const theme = useAppSelector(state => state.theme)
  const dispatch = useAppDispatch()
  const [previewMode, setPreviewMode] = useState(false)
  const [patchPreferences] = usePatchUserPreferencesMutation()

  const saveThemePreferences = useCallback(async () => {
    try {
      const result = await patchPreferences({
        theme: {
          mode: theme.mode,
          primaryColor: theme.primaryColor,
          preset: theme.preset,
          customTheme: theme.customTheme,
        },
      }).unwrap()

      console.log('Theme preferences saved successfully:', result)
      toast.success('Theme preferences saved')
    } catch (error: any) {
      console.error('Failed to save theme preferences:', error)
      const errorMessage =
        error?.data?.message ||
        error?.message ||
        'Failed to save theme preferences'
      toast.error(errorMessage)
    }
  }, [theme, patchPreferences])

  const handleColorChange = useCallback(
    async (colorKey: string, value: string) => {
      dispatch(updateThemeColors({ [colorKey]: value }))

      // If changing primary color, also update the main primary color state
      if (colorKey === 'primary') {
        dispatch(setPrimaryColor(value))
      }

      // Save immediately using current state
      try {
        await patchPreferences({
          theme: {
            mode: theme.mode,
            primaryColor: colorKey === 'primary' ? value : theme.primaryColor,
            preset: 'custom', // Mark as custom when colors are changed
            customTheme: {
              ...theme.customTheme,
              colors: {
                ...theme.customTheme.colors,
                [colorKey]: value,
              },
            },
          },
        }).unwrap()
        toast.success('Color updated')
      } catch (error) {
        console.error('Failed to save color change:', error)
      }
    },
    [dispatch, theme, patchPreferences]
  )

  const handlePresetChange = useCallback(
    async (presetId: string) => {
      const selectedPreset = theme.presets.find((p: any) => p.id === presetId)
      dispatch(setPreset(presetId))

      if (selectedPreset) {
        // Save immediately with preset data
        try {
          await patchPreferences({
            theme: {
              mode: theme.mode,
              primaryColor: selectedPreset.primaryColor,
              preset: presetId,
              customTheme: {
                ...theme.customTheme,
                colors: {
                  ...theme.customTheme.colors,
                  primary: selectedPreset.primaryColor,
                  secondary: selectedPreset.secondaryColor,
                  accent: selectedPreset.accentColor,
                  background: selectedPreset.backgroundColor,
                  surface: selectedPreset.surfaceColor,
                  text: selectedPreset.textColor,
                  border: selectedPreset.borderColor,
                },
              },
            },
          }).unwrap()
          toast.success(`Applied ${selectedPreset.name} theme`)
        } catch (error) {
          console.error('Failed to save preset change:', error)
          toast.error('Failed to save theme preset')
        }
      }
    },
    [theme, dispatch, patchPreferences]
  )

  const handleThemeModeChange = useCallback(
    async (mode: 'light' | 'dark' | 'auto') => {
      dispatch(setThemeMode(mode))

      // Save immediately
      try {
        await patchPreferences({
          theme: {
            mode: mode,
            primaryColor: theme.primaryColor,
            preset: theme.preset,
            customTheme: theme.customTheme,
          },
        }).unwrap()
        toast.success(`Switched to ${mode} mode`)
      } catch (error) {
        console.error('Failed to save theme mode:', error)
      }
    },
    [dispatch, theme, patchPreferences]
  )

  const handleExportTheme = () => {
    const themeData = {
      mode: theme.mode,
      preset: theme.preset,
      customTheme: theme.customTheme,
    }

    const blob = new Blob([JSON.stringify(themeData, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'theme-config.json'
    a.click()
    URL.revokeObjectURL(url)

    toast.success('Theme exported successfully')
  }

  const handleImportTheme = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = e => {
      try {
        const themeData = JSON.parse(e.target?.result as string)
        dispatch(setThemeMode(themeData.mode))
        dispatch(setPreset(themeData.preset))
        // TODO: Add action to import full custom theme
        toast.success('Theme imported successfully')
      } catch (error) {
        toast.error('Invalid theme file')
      }
    }
    reader.readAsText(file)
  }

  const handleReset = () => {
    dispatch(resetTheme())
    toast.success('Theme reset to default')
    // Auto-save after reset
    setTimeout(saveThemePreferences, 500)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground dark:text-white">
            Theme Customizer
          </h2>
          <p className="text-muted-foreground dark:text-gray-400">
            Customize the appearance of your dashboard
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPreviewMode(!previewMode)}
          >
            <Eye className="mr-2 h-4 w-4" />
            {previewMode ? 'Exit Preview' : 'Preview'}
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportTheme}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <label>
            <Button variant="outline" size="sm" asChild>
              <span>
                <Upload className="mr-2 h-4 w-4" />
                Import
              </span>
            </Button>
            <input
              type="file"
              accept=".json"
              onChange={handleImportTheme}
              className="hidden"
            />
          </label>
          <Button variant="outline" size="sm" onClick={handleReset}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset
          </Button>
        </div>
      </div>

      <Tabs defaultValue="presets" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
          <TabsTrigger value="presets">Presets</TabsTrigger>
          <TabsTrigger value="colors">Colors</TabsTrigger>
          <TabsTrigger value="typography">Typography</TabsTrigger>
          <TabsTrigger value="layout">Layout</TabsTrigger>
        </TabsList>

        <TabsContent value="presets" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Palette className="h-5 w-5" />
                <span>Theme Mode</span>
              </CardTitle>
              <CardDescription>
                Choose your preferred theme mode
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {[
                  { value: 'light', label: 'Light', icon: Sun },
                  { value: 'dark', label: 'Dark', icon: Moon },
                  { value: 'auto', label: 'Auto', icon: Monitor },
                ].map(mode => (
                  <button
                    key={mode.value}
                    onClick={() => handleThemeModeChange(mode.value as any)}
                    className={`flex flex-col items-center space-y-2 rounded-lg border p-4 transition-colors ${
                      theme.mode === mode.value
                        ? 'border-primary bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary'
                        : 'border-border bg-card text-foreground hover:border-border/80 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:border-gray-600'
                    }`}
                  >
                    <mode.icon className="h-6 w-6" />
                    <span className="text-sm font-medium">{mode.label}</span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Color Presets</CardTitle>
              <CardDescription>
                Choose from predefined color schemes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {theme.presets.map((preset: any) => (
                  <button
                    key={preset.id}
                    onClick={() => handlePresetChange(preset.id)}
                    className={`rounded-lg border p-4 transition-colors ${
                      theme.preset === preset.id
                        ? 'border-primary bg-primary/10 dark:bg-primary/20'
                        : 'border-border bg-card hover:border-border/80 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-gray-600'
                    }`}
                  >
                    <div className="mb-2 flex items-center space-x-2">
                      <div
                        className="h-4 w-4 rounded-full"
                        style={{ backgroundColor: preset.primaryColor }}
                      />
                      <span className="text-sm font-medium">{preset.name}</span>
                    </div>
                    <div className="flex space-x-1">
                      {[
                        preset.primaryColor,
                        preset.secondaryColor,
                        preset.accentColor,
                      ].map((color, index) => (
                        <div
                          key={index}
                          className="h-6 w-6 rounded border"
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="colors" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Custom Colors</CardTitle>
              <CardDescription>Fine-tune your color palette</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {colorInputs.map(colorInput => (
                  <div key={colorInput.key} className="space-y-2">
                    <Label htmlFor={colorInput.key}>{colorInput.label}</Label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="color"
                        id={colorInput.key}
                        value={
                          theme.customTheme.colors[
                            colorInput.key as keyof typeof theme.customTheme.colors
                          ]
                        }
                        onChange={e =>
                          handleColorChange(colorInput.key, e.target.value)
                        }
                        className="h-10 w-12 cursor-pointer rounded border border-border bg-background dark:border-gray-600 dark:bg-gray-800"
                      />
                      <Input
                        value={
                          theme.customTheme.colors[
                            colorInput.key as keyof typeof theme.customTheme.colors
                          ]
                        }
                        onChange={e =>
                          handleColorChange(colorInput.key, e.target.value)
                        }
                        className="flex-1"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground dark:text-gray-400">
                      {colorInput.description}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="typography" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Type className="h-5 w-5" />
                <span>Typography Settings</span>
              </CardTitle>
              <CardDescription>Customize fonts and text sizing</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Font Family</Label>
                  <Select
                    value={theme.customTheme.typography.fontFamily}
                    onValueChange={value => {
                      dispatch(updateTypography({ fontFamily: value }))
                      setTimeout(saveThemePreferences, 500)
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {fontOptions.map(font => (
                        <SelectItem key={font.value} value={font.value}>
                          {font.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Font Size</Label>
                  <Select
                    value={theme.customTheme.typography.fontSize}
                    onValueChange={value => {
                      dispatch(updateTypography({ fontSize: value as any }))
                      setTimeout(saveThemePreferences, 500)
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="small">Small</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="large">Large</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="layout" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Layout className="h-5 w-5" />
                <span>Layout Settings</span>
              </CardTitle>
              <CardDescription>
                Adjust spacing, borders, and animations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Spacing Density</Label>
                  <Select
                    value={theme.customTheme.spacing.density}
                    onValueChange={value => {
                      dispatch(updateSpacing({ density: value as any }))
                      setTimeout(saveThemePreferences, 500)
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="compact">Compact</SelectItem>
                      <SelectItem value="comfortable">Comfortable</SelectItem>
                      <SelectItem value="spacious">Spacious</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Border Radius</Label>
                  <Select
                    value={theme.customTheme.borderRadius}
                    onValueChange={value => {
                      dispatch(setBorderRadius(value as any))
                      setTimeout(saveThemePreferences, 500)
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="small">Small</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="large">Large</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">Animations</Label>
                    <p className="text-sm text-muted-foreground dark:text-gray-400">
                      Enable smooth transitions and animations
                    </p>
                  </div>
                  <Switch
                    checked={theme.customTheme.animations}
                    onCheckedChange={() => {
                      dispatch(toggleAnimations())
                      setTimeout(saveThemePreferences, 500)
                    }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {previewMode && (
        <Card className="border-blue-200 bg-blue-50 dark:bg-blue-900/20">
          <CardHeader>
            <CardTitle className="text-blue-800 dark:text-blue-200">
              Preview Mode Active
            </CardTitle>
            <CardDescription className="text-blue-600 dark:text-blue-300">
              You&apos;re currently previewing theme changes. Changes are
              applied in real-time.
            </CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  )
}
