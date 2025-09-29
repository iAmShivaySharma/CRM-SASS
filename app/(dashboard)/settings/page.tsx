'use client'

import { useState, useEffect } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useAppSelector, useAppDispatch } from '@/lib/hooks'
import {
  toggleTheme,
  setPrimaryColor,
  loadThemeFromPreferences,
} from '@/lib/slices/themeSlice'
import { setCurrentWorkspace } from '@/lib/slices/workspaceSlice'
import { ThemeCustomizer } from '@/components/theme/ThemeCustomizer'
import {
  useGetUserPreferencesQuery,
  usePatchUserPreferencesMutation,
} from '@/lib/api/userPreferencesApi'
import {
  useGetWorkspaceQuery,
  useUpdateWorkspaceMutation,
} from '@/lib/api/mongoApi'
import {
  getSupportedCurrencies,
  getSupportedTimezones,
} from '@/lib/utils/workspace-formatting'
import {
  User,
  Bell,
  Shield,
  Palette,
  Globe,
  Key,
  Trash2,
  Save,
  Eye,
  EyeOff,
  Building2,
} from 'lucide-react'
import { toast } from 'sonner'

const colorOptions = [
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Green', value: '#10b981' },
  { name: 'Purple', value: '#8b5cf6' },
  { name: 'Red', value: '#ef4444' },
  { name: 'Orange', value: '#f59e0b' },
  { name: 'Pink', value: '#ec4899' },
]

export default function SettingsPage() {
  const { user } = useAppSelector(state => state.auth)
  const { currentWorkspace } = useAppSelector(state => state.workspace)
  const { mode, primaryColor } = useAppSelector(state => state.theme)
  const dispatch = useAppDispatch()

  const { data: userPreferences, isLoading: preferencesLoading } =
    useGetUserPreferencesQuery()
  const [patchPreferences] = usePatchUserPreferencesMutation()

  // Workspace settings
  const { data: workspaceData, isLoading: workspaceLoading } =
    useGetWorkspaceQuery(currentWorkspace?.id || '', {
      skip: !currentWorkspace?.id,
    })
  const [updateWorkspace] = useUpdateWorkspaceMutation()

  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [notifications, setNotifications] = useState({
    email: true,
    push: false,
    leadUpdates: true,
    teamActivity: true,
    weeklyReports: false,
  })

  // Workspace form state
  const [workspaceForm, setWorkspaceForm] = useState({
    name: '',
    description: '',
    currency: 'USD',
    timezone: 'UTC',
    settings: {
      dateFormat: 'MM/DD/YYYY',
      timeFormat: '12h',
      weekStartsOn: 0,
      language: 'en',
    },
  })

  // Load user preferences on mount (only if not already loaded from localStorage)
  useEffect(() => {
    if (userPreferences?.preferences && !preferencesLoading) {
      // Only load theme preferences if they differ from current state
      if (userPreferences.preferences.theme) {
        const serverTheme = userPreferences.preferences.theme
        const currentTheme = { mode, primaryColor }

        // Only update if server preferences are different
        if (
          serverTheme.mode !== currentTheme.mode ||
          serverTheme.primaryColor !== currentTheme.primaryColor
        ) {
          dispatch(loadThemeFromPreferences(userPreferences.preferences))
        }
      }

      // Load notification preferences
      if (userPreferences.preferences.notifications) {
        setNotifications(prev => ({
          ...prev,
          ...userPreferences.preferences.notifications,
        }))
      }
    }
  }, [userPreferences, dispatch, preferencesLoading, mode, primaryColor])

  // Load workspace data
  useEffect(() => {
    if (workspaceData?.workspace) {
      setWorkspaceForm({
        name: workspaceData.workspace.name || '',
        description: workspaceData.workspace.description || '',
        currency: workspaceData.workspace.currency || 'USD',
        timezone: workspaceData.workspace.timezone || 'UTC',
        settings: {
          dateFormat:
            workspaceData.workspace.settings?.dateFormat || 'MM/DD/YYYY',
          timeFormat: workspaceData.workspace.settings?.timeFormat || '12h',
          weekStartsOn: workspaceData.workspace.settings?.weekStartsOn || 0,
          language: workspaceData.workspace.settings?.language || 'en',
        },
      })
    }
  }, [workspaceData])

  const handleSaveProfile = () => {
    toast.success('Profile updated successfully')
  }

  const handleSavePassword = () => {
    toast.success('Password updated successfully')
  }

  const handleSaveNotifications = async () => {
    try {
      await patchPreferences({
        notifications,
      }).unwrap()
      toast.success('Notification preferences saved')
    } catch (error) {
      toast.error('Failed to save notification preferences')
    }
  }

  const handleSaveWorkspace = async () => {
    if (!currentWorkspace?.id) return

    try {
      const result = await updateWorkspace({
        id: currentWorkspace.id,
        ...workspaceForm,
      }).unwrap()

      if (result.success) {
        // Update Redux state with new workspace data
        dispatch(
          setCurrentWorkspace({
            ...currentWorkspace,
            currency: workspaceForm.currency,
            timezone: workspaceForm.timezone,
            settings: workspaceForm.settings,
          })
        )
      }

      toast.success('Workspace settings saved')
    } catch (error) {
      console.error('Failed to save workspace settings:', error)
      toast.error('Failed to save workspace settings')
    }
  }

  return (
    <div className="w-full space-y-6">
      <div className="w-full">
        <h1 className="text-2xl font-bold text-foreground dark:text-white sm:text-3xl">
          Settings
        </h1>
        <p className="mt-1 text-muted-foreground dark:text-gray-400">
          Manage your account settings and preferences
        </p>
      </div>

      <Tabs defaultValue="profile" className="w-full space-y-4">
        <TabsList className="grid w-full grid-cols-2 bg-muted dark:bg-gray-800 sm:grid-cols-3 lg:grid-cols-6">
          <TabsTrigger value="profile" className="flex items-center space-x-2">
            <User className="h-4 w-4" />
            <span>Profile</span>
          </TabsTrigger>
          <TabsTrigger
            value="workspace"
            className="flex items-center space-x-2"
          >
            <Building2 className="h-4 w-4" />
            <span>Workspace</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center space-x-2">
            <Shield className="h-4 w-4" />
            <span>Security</span>
          </TabsTrigger>
          <TabsTrigger
            value="notifications"
            className="flex items-center space-x-2"
          >
            <Bell className="h-4 w-4" />
            <span>Notifications</span>
          </TabsTrigger>
          <TabsTrigger
            value="appearance"
            className="flex items-center space-x-2"
          >
            <Palette className="h-4 w-4" />
            <span>Appearance</span>
          </TabsTrigger>
          <TabsTrigger value="advanced" className="flex items-center space-x-2">
            <Globe className="h-4 w-4" />
            <span>Advanced</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>
                Update your personal information and profile details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input id="fullName" defaultValue={user?.name} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" defaultValue={user?.email} />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  placeholder="Tell us about yourself..."
                  className="min-h-[100px]"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select defaultValue="UTC">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UTC">UTC</SelectItem>
                      <SelectItem value="EST">Eastern Time</SelectItem>
                      <SelectItem value="PST">Pacific Time</SelectItem>
                      <SelectItem value="GMT">Greenwich Mean Time</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="language">Language</Label>
                  <Select defaultValue="en">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="es">Spanish</SelectItem>
                      <SelectItem value="fr">French</SelectItem>
                      <SelectItem value="de">German</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button onClick={handleSaveProfile}>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="workspace" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Workspace Settings</CardTitle>
              <CardDescription>
                Configure your workspace preferences including currency,
                timezone, and regional settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {workspaceLoading ? (
                <div className="space-y-4">
                  <div className="h-4 animate-pulse rounded bg-gray-200"></div>
                  <div className="h-4 w-3/4 animate-pulse rounded bg-gray-200"></div>
                  <div className="h-4 w-1/2 animate-pulse rounded bg-gray-200"></div>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="workspace-name">Workspace Name</Label>
                      <Input
                        id="workspace-name"
                        value={workspaceForm.name}
                        onChange={e =>
                          setWorkspaceForm(prev => ({
                            ...prev,
                            name: e.target.value,
                          }))
                        }
                        placeholder="Enter workspace name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="workspace-currency">Currency</Label>
                      <Select
                        value={workspaceForm.currency}
                        onValueChange={value =>
                          setWorkspaceForm(prev => ({
                            ...prev,
                            currency: value,
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {getSupportedCurrencies().map(currency => (
                            <SelectItem
                              key={currency.code}
                              value={currency.code}
                            >
                              {currency.symbol} {currency.name} ({currency.code}
                              )
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="workspace-description">Description</Label>
                    <Textarea
                      id="workspace-description"
                      value={workspaceForm.description}
                      onChange={e =>
                        setWorkspaceForm(prev => ({
                          ...prev,
                          description: e.target.value,
                        }))
                      }
                      placeholder="Describe your workspace"
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="workspace-timezone">Timezone</Label>
                      <Select
                        value={workspaceForm.timezone}
                        onValueChange={value =>
                          setWorkspaceForm(prev => ({
                            ...prev,
                            timezone: value,
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {getSupportedTimezones().map(timezone => (
                            <SelectItem
                              key={timezone.value}
                              value={timezone.value}
                            >
                              {timezone.label} ({timezone.offset})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="date-format">Date Format</Label>
                      <Select
                        value={workspaceForm.settings.dateFormat}
                        onValueChange={value =>
                          setWorkspaceForm(prev => ({
                            ...prev,
                            settings: { ...prev.settings, dateFormat: value },
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                          <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                          <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                          <SelectItem value="DD-MM-YYYY">DD-MM-YYYY</SelectItem>
                          <SelectItem value="MM-DD-YYYY">MM-DD-YYYY</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="time-format">Time Format</Label>
                      <Select
                        value={workspaceForm.settings.timeFormat}
                        onValueChange={value =>
                          setWorkspaceForm(prev => ({
                            ...prev,
                            settings: { ...prev.settings, timeFormat: value },
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="12h">12 Hour (AM/PM)</SelectItem>
                          <SelectItem value="24h">24 Hour</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="week-starts">Week Starts On</Label>
                      <Select
                        value={workspaceForm.settings.weekStartsOn.toString()}
                        onValueChange={value =>
                          setWorkspaceForm(prev => ({
                            ...prev,
                            settings: {
                              ...prev.settings,
                              weekStartsOn: parseInt(value),
                            },
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">Sunday</SelectItem>
                          <SelectItem value="1">Monday</SelectItem>
                          <SelectItem value="2">Tuesday</SelectItem>
                          <SelectItem value="3">Wednesday</SelectItem>
                          <SelectItem value="4">Thursday</SelectItem>
                          <SelectItem value="5">Friday</SelectItem>
                          <SelectItem value="6">Saturday</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Button
                    onClick={handleSaveWorkspace}
                    className="w-full sm:w-auto"
                  >
                    <Save className="mr-2 h-4 w-4" />
                    Save Workspace Settings
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Change Password</CardTitle>
              <CardDescription>
                Update your password to keep your account secure
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Current Password</Label>
                <div className="relative">
                  <Input
                    id="currentPassword"
                    type={showCurrentPassword ? 'text' : 'password'}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  >
                    {showCurrentPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showNewPassword ? 'text' : 'password'}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                  >
                    {showNewPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input id="confirmPassword" type="password" />
              </div>

              <Button onClick={handleSavePassword}>
                <Key className="mr-2 h-4 w-4" />
                Update Password
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Two-Factor Authentication</CardTitle>
              <CardDescription>
                Add an extra layer of security to your account
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">SMS Authentication</p>
                  <p className="text-sm text-muted-foreground dark:text-gray-400">
                    Receive codes via SMS
                  </p>
                </div>
                <Switch />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Authenticator App</p>
                  <p className="text-sm text-muted-foreground dark:text-gray-400">
                    Use an authenticator app
                  </p>
                </div>
                <Switch />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>
                Choose how you want to be notified about updates
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Email Notifications</p>
                    <p className="text-sm text-muted-foreground dark:text-gray-400">
                      Receive notifications via email
                    </p>
                  </div>
                  <Switch
                    checked={notifications.email}
                    onCheckedChange={checked =>
                      setNotifications(prev => ({ ...prev, email: checked }))
                    }
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Lead Updates</p>
                    <p className="text-sm text-muted-foreground dark:text-gray-400">
                      New leads and status changes
                    </p>
                  </div>
                  <Switch
                    checked={notifications.leadUpdates}
                    onCheckedChange={checked =>
                      setNotifications(prev => ({
                        ...prev,
                        leadUpdates: checked,
                      }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Team Activity</p>
                    <p className="text-sm text-muted-foreground dark:text-gray-400">
                      Team member actions and updates
                    </p>
                  </div>
                  <Switch
                    checked={notifications.teamActivity}
                    onCheckedChange={checked =>
                      setNotifications(prev => ({
                        ...prev,
                        teamActivity: checked,
                      }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Weekly Reports</p>
                    <p className="text-sm text-muted-foreground dark:text-gray-400">
                      Weekly performance summaries
                    </p>
                  </div>
                  <Switch
                    checked={notifications.weeklyReports}
                    onCheckedChange={checked =>
                      setNotifications(prev => ({
                        ...prev,
                        weeklyReports: checked,
                      }))
                    }
                  />
                </div>
              </div>

              <Button onClick={handleSaveNotifications}>
                <Save className="mr-2 h-4 w-4" />
                Save Preferences
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance" className="space-y-4">
          <ThemeCustomizer />
        </TabsContent>

        <TabsContent value="advanced" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Advanced Settings</CardTitle>
              <CardDescription>Advanced configuration options</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">API Access</p>
                    <p className="text-sm text-muted-foreground dark:text-gray-400">
                      Enable API access for integrations
                    </p>
                  </div>
                  <Switch />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Data Export</p>
                    <p className="text-sm text-muted-foreground dark:text-gray-400">
                      Allow data export functionality
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-red-600">Danger Zone</h4>
                  <p className="text-sm text-muted-foreground dark:text-gray-400">
                    Irreversible and destructive actions
                  </p>
                </div>

                <Button variant="destructive" size="sm">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Account
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
