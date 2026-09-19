'use client'

import { useState, useMemo } from 'react'
import { useAppSelector } from '@/lib/hooks'
import {
  useGetSocialAccountsQuery,
  useConnectSocialAccountMutation,
  useDisconnectSocialAccountMutation,
  useGetSocialPostsQuery,
  useCreateSocialPostMutation,
  useUpdateSocialPostMutation,
  useDeleteSocialPostMutation,
  useGenerateAIPostMutation,
  type SocialPost,
  type SocialAccount,
} from '@/lib/api/socialApi'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import {
  Share2,
  Plus,
  Trash2,
  Edit,
  Sparkles,
  Send,
  Clock,
  ChevronLeft,
  ChevronRight,
  Facebook,
  Instagram,
  Linkedin,
  Twitter,
  Loader2,
  ImagePlus,
  X,
  Unplug,
} from 'lucide-react'

const PLATFORMS = [
  { value: 'facebook' as const, label: 'Facebook', icon: Facebook },
  { value: 'instagram' as const, label: 'Instagram', icon: Instagram },
  { value: 'linkedin' as const, label: 'LinkedIn', icon: Linkedin },
  { value: 'twitter' as const, label: 'Twitter/X', icon: Twitter },
]

function getPlatformIcon(platform: string) {
  const found = PLATFORMS.find(p => p.value === platform)
  if (!found) {
    return Share2
  }
  return found.icon
}

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, string> = {
    draft: 'bg-muted text-muted-foreground',
    scheduled: 'bg-primary/10 text-primary',
    publishing: 'bg-primary/10 text-primary',
    published: 'bg-primary/20 text-primary',
    failed: 'bg-destructive/10 text-destructive',
  }
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize',
        variants[status] || 'bg-muted text-muted-foreground'
      )}
    >
      {status}
    </span>
  )
}

function ComposeTab({
  accounts,
  workspaceId,
}: {
  accounts: SocialAccount[]
  workspaceId: string
}) {
  const [content, setContent] = useState('')
  const [selectedPlatforms, setSelectedPlatforms] = useState<
    Record<
      string,
      { checked: boolean; accountId: string; customContent: string }
    >
  >({})
  const [scheduledAt, setScheduledAt] = useState('')
  const [mediaUrls, setMediaUrls] = useState<string[]>([])
  const [mediaInput, setMediaInput] = useState('')
  const [aiOpen, setAiOpen] = useState(false)
  const [aiTopic, setAiTopic] = useState('')
  const [aiTone, setAiTone] = useState('professional')
  const [aiPlatform, setAiPlatform] = useState('linkedin')
  const [aiBrand, setAiBrand] = useState('')
  const [aiHashtags, setAiHashtags] = useState(true)
  const [aiEmoji, setAiEmoji] = useState(false)
  const [customizing, setCustomizing] = useState<string | null>(null)

  const [createPost, { isLoading: creating }] = useCreateSocialPostMutation()
  const [generateAI, { isLoading: generating }] = useGenerateAIPostMutation()

  const activeAccounts = accounts.filter(a => a.isActive)

  const accountsByPlatform = useMemo(() => {
    const map: Record<string, SocialAccount[]> = {}
    activeAccounts.forEach(a => {
      if (!map[a.platform]) {
        map[a.platform] = []
      }
      map[a.platform].push(a)
    })
    return map
  }, [activeAccounts])

  const togglePlatform = (platform: string, accountId: string) => {
    setSelectedPlatforms(prev => ({
      ...prev,
      [platform]: {
        checked: !prev[platform]?.checked,
        accountId,
        customContent: prev[platform]?.customContent || '',
      },
    }))
  }

  const addMedia = () => {
    if (mediaInput.trim()) {
      setMediaUrls(prev => [...prev, mediaInput.trim()])
      setMediaInput('')
    }
  }

  const removeMedia = (index: number) => {
    setMediaUrls(prev => prev.filter((_, i) => i !== index))
  }

  const handleGenerate = async () => {
    if (!aiTopic.trim()) {
      return
    }
    try {
      const result = await generateAI({
        workspaceId,
        topic: aiTopic,
        platform: aiPlatform,
        tone: aiTone,
        brandName: aiBrand || undefined,
        includeHashtags: aiHashtags,
        includeEmoji: aiEmoji,
      }).unwrap()
      setContent(result.content)
      setAiOpen(false)
      toast.success('Content generated')
    } catch {
      toast.error('Failed to generate content')
    }
  }

  const handleSubmit = async (postNow: boolean) => {
    if (!content.trim()) {
      toast.error('Content is required')
      return
    }

    const platforms = Object.entries(selectedPlatforms)
      .filter(([, v]) => v.checked)
      .map(([platform, v]) => ({
        platform,
        accountId: v.accountId,
        customContent: v.customContent || undefined,
      }))

    if (platforms.length === 0) {
      toast.error('Select at least one platform')
      return
    }

    try {
      await createPost({
        workspaceId,
        content,
        mediaUrls: mediaUrls.length > 0 ? mediaUrls : undefined,
        platforms,
        scheduledAt: postNow ? undefined : scheduledAt || undefined,
        status: postNow ? 'publishing' : scheduledAt ? 'scheduled' : 'draft',
      }).unwrap()
      toast.success(
        postNow
          ? 'Post queued for publishing'
          : scheduledAt
            ? 'Post scheduled'
            : 'Draft saved'
      )
      setContent('')
      setSelectedPlatforms({})
      setScheduledAt('')
      setMediaUrls([])
    } catch {
      toast.error('Failed to create post')
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="rounded-lg border bg-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">
            Compose Post
          </h3>
          <Popover open={aiOpen} onOpenChange={setAiOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">
                <Sparkles className="mr-2 h-4 w-4" />
                AI Generate
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="end">
              <div className="space-y-3">
                <h4 className="font-medium text-foreground">
                  AI Content Generator
                </h4>
                <div>
                  <Label className="text-muted-foreground">Topic</Label>
                  <Input
                    value={aiTopic}
                    onChange={e => setAiTopic(e.target.value)}
                    placeholder="What should the post be about?"
                  />
                </div>
                <div>
                  <Label className="text-muted-foreground">Platform</Label>
                  <Select value={aiPlatform} onValueChange={setAiPlatform}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PLATFORMS.map(p => (
                        <SelectItem key={p.value} value={p.value}>
                          {p.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-muted-foreground">Tone</Label>
                  <Select value={aiTone} onValueChange={setAiTone}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="professional">Professional</SelectItem>
                      <SelectItem value="casual">Casual</SelectItem>
                      <SelectItem value="fun">Fun</SelectItem>
                      <SelectItem value="inspirational">
                        Inspirational
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-muted-foreground">
                    Brand Name (optional)
                  </Label>
                  <Input
                    value={aiBrand}
                    onChange={e => setAiBrand(e.target.value)}
                    placeholder="Your brand name"
                  />
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Checkbox
                      id="ai-hashtags"
                      checked={aiHashtags}
                      onCheckedChange={v => setAiHashtags(!!v)}
                    />
                    <Label htmlFor="ai-hashtags">Hashtags</Label>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Checkbox
                      id="ai-emoji"
                      checked={aiEmoji}
                      onCheckedChange={v => setAiEmoji(!!v)}
                    />
                    <Label htmlFor="ai-emoji">Emoji</Label>
                  </div>
                </div>
                <Button
                  onClick={handleGenerate}
                  disabled={generating || !aiTopic.trim()}
                  className="w-full"
                >
                  {generating && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Generate
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        <Textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="What do you want to share?"
          className="min-h-[150px] resize-none"
          maxLength={5000}
        />
        <div className="mt-1 text-right text-xs text-muted-foreground">
          {content.length}/5000
        </div>

        <div className="mt-4">
          <Label className="text-muted-foreground">Platforms</Label>
          <div className="mt-2 flex flex-wrap gap-3">
            {PLATFORMS.map(p => {
              const platformAccounts = accountsByPlatform[p.value] || []
              const hasAccounts = platformAccounts.length > 0
              const Icon = p.icon
              const isSelected = selectedPlatforms[p.value]?.checked
              return (
                <div key={p.value} className="flex flex-col gap-1.5">
                  <button
                    type="button"
                    disabled={!hasAccounts}
                    onClick={() => {
                      if (hasAccounts) {
                        togglePlatform(p.value, platformAccounts[0].id)
                      }
                    }}
                    className={cn(
                      'flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors',
                      !hasAccounts && 'cursor-not-allowed opacity-40',
                      isSelected
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-background text-muted-foreground hover:bg-muted'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {p.label}
                    {!hasAccounts && (
                      <span className="text-[10px]">(no account)</span>
                    )}
                  </button>
                  {isSelected && platformAccounts.length >= 1 && (
                    <Select
                      value={selectedPlatforms[p.value]?.accountId}
                      onValueChange={v =>
                        setSelectedPlatforms(prev => ({
                          ...prev,
                          [p.value]: { ...prev[p.value], accountId: v },
                        }))
                      }
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Select account..." />
                      </SelectTrigger>
                      <SelectContent>
                        {platformAccounts.map(a => (
                          <SelectItem key={a.id} value={a.id}>
                            {a.accountName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {isSelected && (
                    <button
                      type="button"
                      onClick={() =>
                        setCustomizing(customizing === p.value ? null : p.value)
                      }
                      className="text-xs text-primary hover:underline"
                    >
                      {customizing === p.value
                        ? 'Hide custom text'
                        : 'Custom text'}
                    </button>
                  )}
                  {isSelected && customizing === p.value && (
                    <Textarea
                      value={selectedPlatforms[p.value]?.customContent || ''}
                      onChange={e =>
                        setSelectedPlatforms(prev => ({
                          ...prev,
                          [p.value]: {
                            ...prev[p.value],
                            customContent: e.target.value,
                          },
                        }))
                      }
                      placeholder={`Custom content for ${p.label}`}
                      className="min-h-[80px] text-sm"
                    />
                  )}
                </div>
              )
            })}
            {Object.keys(accountsByPlatform).length === 0 && (
              <p className="text-sm text-muted-foreground">
                No accounts connected. Go to the Accounts tab to connect one.
              </p>
            )}
          </div>
        </div>

        <div className="mt-4">
          <Label className="text-muted-foreground">Media URLs</Label>
          <div className="mt-2 flex gap-2">
            <Input
              value={mediaInput}
              onChange={e => setMediaInput(e.target.value)}
              placeholder="Paste image/video URL"
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addMedia()
                }
              }}
            />
            <Button type="button" variant="outline" onClick={addMedia}>
              <ImagePlus className="h-4 w-4" />
            </Button>
          </div>
          {mediaUrls.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {mediaUrls.map((url, i) => (
                <div
                  key={i}
                  className="flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground"
                >
                  <span className="max-w-[200px] truncate">{url}</span>
                  <button type="button" onClick={() => removeMedia(i)}>
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-4">
          <Label className="text-muted-foreground">Schedule</Label>
          <Input
            type="datetime-local"
            value={scheduledAt}
            onChange={e => setScheduledAt(e.target.value)}
            className="mt-2 w-auto"
          />
        </div>

        <div className="mt-6 flex gap-3">
          <Button
            onClick={() => handleSubmit(false)}
            disabled={creating}
            variant="outline"
          >
            {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Clock className="mr-2 h-4 w-4" />
            {scheduledAt ? 'Schedule Post' : 'Save Draft'}
          </Button>
          <Button onClick={() => handleSubmit(true)} disabled={creating}>
            {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Send className="mr-2 h-4 w-4" />
            Post Now
          </Button>
        </div>
      </div>
    </div>
  )
}

function CalendarTab({
  posts,
  workspaceId: _workspaceId,
}: {
  posts: SocialPost[]
  workspaceId: string
}) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [editingPost, setEditingPost] = useState<SocialPost | null>(null)
  const [editContent, setEditContent] = useState('')
  const [editScheduledAt, setEditScheduledAt] = useState('')

  const [updatePost, { isLoading: updating }] = useUpdateSocialPostMutation()

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const monthName = currentDate.toLocaleString('default', { month: 'long' })

  const days = useMemo(() => {
    const arr: (number | null)[] = []
    for (let i = 0; i < firstDay; i++) {
      arr.push(null)
    }
    for (let i = 1; i <= daysInMonth; i++) {
      arr.push(i)
    }
    return arr
  }, [firstDay, daysInMonth])

  const postsByDate = useMemo(() => {
    const map: Record<number, SocialPost[]> = {}
    posts.forEach(post => {
      const dateStr = post.scheduledAt || post.createdAt
      if (!dateStr) {
        return
      }
      const d = new Date(dateStr)
      if (d.getFullYear() === year && d.getMonth() === month) {
        const day = d.getDate()
        if (!map[day]) {
          map[day] = []
        }
        map[day].push(post)
      }
    })
    return map
  }, [posts, year, month])

  const openEdit = (post: SocialPost) => {
    setEditingPost(post)
    setEditContent(post.content)
    setEditScheduledAt(
      post.scheduledAt
        ? new Date(post.scheduledAt).toISOString().slice(0, 16)
        : ''
    )
  }

  const handleUpdate = async () => {
    if (!editingPost) {
      return
    }
    try {
      await updatePost({
        id: editingPost.id,
        content: editContent,
        scheduledAt: editScheduledAt || undefined,
        status: editScheduledAt ? 'scheduled' : editingPost.status,
      }).unwrap()
      toast.success('Post updated')
      setEditingPost(null)
    } catch {
      toast.error('Failed to update post')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setCurrentDate(new Date(year, month - 1, 1))}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h3 className="text-lg font-semibold text-foreground">
          {monthName} {year}
        </h3>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setCurrentDate(new Date(year, month + 1, 1))}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg border bg-border">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
          <div
            key={d}
            className="bg-muted px-2 py-2 text-center text-xs font-medium text-muted-foreground"
          >
            {d}
          </div>
        ))}
        {days.map((day, i) => (
          <div
            key={i}
            className={cn('min-h-[100px] bg-card p-1', !day && 'bg-muted/50')}
          >
            {day && (
              <>
                <div className="text-right text-xs text-muted-foreground">
                  {day}
                </div>
                <div className="mt-1 space-y-1">
                  {(postsByDate[day] || []).slice(0, 3).map(post => (
                    <button
                      key={post.id}
                      type="button"
                      onClick={() => openEdit(post)}
                      className="w-full truncate rounded bg-primary/10 px-1 py-0.5 text-left text-[10px] text-primary hover:bg-primary/20"
                    >
                      <span className="flex items-center gap-1">
                        {post.platforms.map(p => {
                          const Icon = getPlatformIcon(p.platform)
                          return (
                            <Icon
                              key={p.platform}
                              className="inline h-2.5 w-2.5"
                            />
                          )
                        })}
                        <span className="truncate">
                          {post.content.slice(0, 30)}
                        </span>
                      </span>
                    </button>
                  ))}
                  {(postsByDate[day]?.length || 0) > 3 && (
                    <div className="text-center text-[10px] text-muted-foreground">
                      +{postsByDate[day].length - 3} more
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      <Dialog
        open={!!editingPost}
        onOpenChange={open => {
          if (!open) {
            setEditingPost(null)
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Post</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              value={editContent}
              onChange={e => setEditContent(e.target.value)}
              className="min-h-[120px]"
            />
            <div>
              <Label className="text-muted-foreground">Scheduled At</Label>
              <Input
                type="datetime-local"
                value={editScheduledAt}
                onChange={e => setEditScheduledAt(e.target.value)}
                className="mt-1"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditingPost(null)}>
                Cancel
              </Button>
              <Button onClick={handleUpdate} disabled={updating}>
                {updating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function PostsTab({
  posts,
  workspaceId: _workspaceId,
}: {
  posts: SocialPost[]
  workspaceId: string
}) {
  const [statusFilter, setStatusFilter] = useState('all')
  const [editingPost, setEditingPost] = useState<SocialPost | null>(null)
  const [editContent, setEditContent] = useState('')

  const [updatePost, { isLoading: updating }] = useUpdateSocialPostMutation()
  const [deletePost] = useDeleteSocialPostMutation()

  const filtered = useMemo(() => {
    if (statusFilter === 'all') {
      return posts
    }
    return posts.filter(p => p.status === statusFilter)
  }, [posts, statusFilter])

  const openEdit = (post: SocialPost) => {
    setEditingPost(post)
    setEditContent(post.content)
  }

  const handleUpdate = async () => {
    if (!editingPost) {
      return
    }
    try {
      await updatePost({
        id: editingPost.id,
        content: editContent,
      }).unwrap()
      toast.success('Post updated')
      setEditingPost(null)
    } catch {
      toast.error('Failed to update post')
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deletePost(id).unwrap()
      toast.success('Post deleted')
    } catch {
      toast.error('Failed to delete post')
    }
  }

  const statuses = ['all', 'draft', 'scheduled', 'published', 'failed']

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {statuses.map(s => (
          <Button
            key={s}
            variant={statusFilter === s ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter(s)}
            className="capitalize"
          >
            {s}
          </Button>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="rounded-lg border bg-card py-12 text-center">
          <Share2 className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <p className="mt-2 text-muted-foreground">No posts found</p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map(post => (
          <div
            key={post.id}
            className="flex flex-col rounded-lg border bg-card p-4"
          >
            <div className="mb-2 flex items-center justify-between">
              <StatusBadge status={post.status} />
              <div className="flex gap-1">
                {post.platforms.map(p => {
                  const Icon = getPlatformIcon(p.platform)
                  return (
                    <Icon
                      key={p.platform}
                      className="h-4 w-4 text-muted-foreground"
                    />
                  )
                })}
              </div>
            </div>
            <p className="line-clamp-4 flex-1 text-sm text-foreground">
              {post.content}
            </p>
            <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {post.scheduledAt
                  ? new Date(post.scheduledAt).toLocaleDateString()
                  : new Date(post.createdAt).toLocaleDateString()}
              </span>
              {post.aiGenerated && (
                <Badge variant="outline" className="text-xs">
                  <Sparkles className="mr-1 h-3 w-3" />
                  AI
                </Badge>
              )}
            </div>
            <div className="mt-3 flex gap-2 border-t pt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => openEdit(post)}
                className="flex-1"
              >
                <Edit className="mr-1 h-3 w-3" />
                Edit
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDelete(post.id)}
                className="text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Dialog
        open={!!editingPost}
        onOpenChange={open => {
          if (!open) {
            setEditingPost(null)
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Post</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              value={editContent}
              onChange={e => setEditContent(e.target.value)}
              className="min-h-[120px]"
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditingPost(null)}>
                Cancel
              </Button>
              <Button onClick={handleUpdate} disabled={updating}>
                {updating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function AccountsTab({
  accounts,
  workspaceId,
}: {
  accounts: SocialAccount[]
  workspaceId: string
}) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [platform, setPlatform] = useState<string>('facebook')
  const [accountName, setAccountName] = useState('')
  const [accountId, setAccountId] = useState('')
  const [accessToken, setAccessToken] = useState('')
  const [profileUrl, setProfileUrl] = useState('')

  const [connectAccount, { isLoading: connecting }] =
    useConnectSocialAccountMutation()
  const [disconnectAccount] = useDisconnectSocialAccountMutation()

  const handleConnect = async () => {
    if (!accountName.trim() || !accountId.trim() || !accessToken.trim()) {
      toast.error('All required fields must be filled')
      return
    }
    try {
      await connectAccount({
        workspaceId,
        platform,
        accountName,
        accountId,
        accessToken,
        profileUrl: profileUrl || undefined,
      }).unwrap()
      toast.success('Account connected')
      setDialogOpen(false)
      setAccountName('')
      setAccountId('')
      setAccessToken('')
      setProfileUrl('')
    } catch {
      toast.error('Failed to connect account')
    }
  }

  const handleDisconnect = async (id: string) => {
    try {
      await disconnectAccount(id).unwrap()
      toast.success('Account disconnected')
    } catch {
      toast.error('Failed to disconnect account')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Connect Account
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Connect Social Account</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label className="text-muted-foreground">Platform</Label>
                <Select value={platform} onValueChange={setPlatform}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PLATFORMS.map(p => (
                      <SelectItem key={p.value} value={p.value}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-muted-foreground">Account Name</Label>
                <Input
                  value={accountName}
                  onChange={e => setAccountName(e.target.value)}
                  placeholder="e.g. My Business Page"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-muted-foreground">Account ID</Label>
                <Input
                  value={accountId}
                  onChange={e => setAccountId(e.target.value)}
                  placeholder="Platform account/page ID"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-muted-foreground">Access Token</Label>
                <Input
                  value={accessToken}
                  onChange={e => setAccessToken(e.target.value)}
                  placeholder="API access token"
                  type="password"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-muted-foreground">
                  Profile URL (optional)
                </Label>
                <Input
                  value={profileUrl}
                  onChange={e => setProfileUrl(e.target.value)}
                  placeholder="https://..."
                  className="mt-1"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleConnect} disabled={connecting}>
                  {connecting && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Connect
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {accounts.length === 0 && (
        <div className="rounded-lg border bg-card py-12 text-center">
          <Unplug className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <p className="mt-2 text-muted-foreground">
            No social accounts connected yet
          </p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {accounts.map(account => {
          const Icon = getPlatformIcon(account.platform)
          return (
            <div
              key={account.id}
              className="flex items-start gap-4 rounded-lg border bg-card p-4"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="truncate font-medium text-foreground">
                  {account.accountName}
                </h4>
                <p className="text-sm capitalize text-muted-foreground">
                  {account.platform}
                </p>
                <div className="mt-1">
                  {account.isActive ? (
                    <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                      Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-destructive/10 px-2 py-0.5 text-xs text-destructive">
                      Inactive
                    </span>
                  )}
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDisconnect(account.id)}
                className="text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function SocialMediaPage() {
  const { currentWorkspace } = useAppSelector(state => state.workspace)
  const workspaceId = currentWorkspace?.id || ''

  const { data: accountsData, isLoading: accountsLoading } =
    useGetSocialAccountsQuery({ workspaceId }, { skip: !workspaceId })

  const { data: postsData, isLoading: postsLoading } = useGetSocialPostsQuery(
    { workspaceId, limit: 100 },
    { skip: !workspaceId }
  )

  const accounts = accountsData?.accounts || []
  const posts = postsData?.posts || []

  if (!currentWorkspace) {
    return (
      <div className="flex h-96 items-center justify-center">
        <p className="text-muted-foreground">Select a workspace to continue</p>
      </div>
    )
  }

  if (accountsLoading || postsLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <Share2 className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Social Media</h1>
          <p className="text-sm text-muted-foreground">
            Compose, schedule, and manage your social media posts
          </p>
        </div>
      </div>

      <Tabs defaultValue="compose">
        <TabsList>
          <TabsTrigger value="compose">Compose</TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
          <TabsTrigger value="posts">Posts</TabsTrigger>
          <TabsTrigger value="accounts">Accounts</TabsTrigger>
        </TabsList>

        <TabsContent value="compose" className="mt-6">
          <ComposeTab accounts={accounts} workspaceId={workspaceId} />
        </TabsContent>

        <TabsContent value="calendar" className="mt-6">
          <CalendarTab posts={posts} workspaceId={workspaceId} />
        </TabsContent>

        <TabsContent value="posts" className="mt-6">
          <PostsTab posts={posts} workspaceId={workspaceId} />
        </TabsContent>

        <TabsContent value="accounts" className="mt-6">
          <AccountsTab accounts={accounts} workspaceId={workspaceId} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
