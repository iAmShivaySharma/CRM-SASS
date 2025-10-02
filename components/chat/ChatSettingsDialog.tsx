'use client'

import React, { useState, useEffect } from 'react'
import { useSelector } from 'react-redux'
import { RootState } from '@/lib/store'
import { ChatRoom, useUpdateChatRoomMutation } from '@/lib/api/chatApi'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Settings,
  Loader2,
  Save
} from 'lucide-react'

interface ChatSettingsDialogProps {
  chatRoom: ChatRoom
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const ChatSettingsDialog: React.FC<ChatSettingsDialogProps> = ({
  chatRoom,
  open,
  onOpenChange,
}) => {
  const [formData, setFormData] = useState({
    name: chatRoom.name,
    description: chatRoom.description || '',
    allowFileSharing: chatRoom.settings?.allowFileSharing ?? true,
    allowReactions: chatRoom.settings?.allowReactions ?? true,
    notifications: chatRoom.settings?.notifications ?? true,
    retentionDays: chatRoom.settings?.retentionDays || 90,
  })
  const [isUpdating, setIsUpdating] = useState(false)

  const workspace = useSelector((state: RootState) => state.workspace)
  const [updateChatRoom] = useUpdateChatRoomMutation()

  // Reset form when dialog opens with new chatRoom data
  useEffect(() => {
    if (open) {
      setFormData({
        name: chatRoom.name,
        description: chatRoom.description || '',
        allowFileSharing: chatRoom.settings?.allowFileSharing ?? true,
        allowReactions: chatRoom.settings?.allowReactions ?? true,
        notifications: chatRoom.settings?.notifications ?? true,
        retentionDays: chatRoom.settings?.retentionDays || 90,
      })
    }
  }, [open, chatRoom])

  const handleSaveSettings = async () => {
    if (!workspace.currentWorkspace?.id) return

    setIsUpdating(true)
    try {
      await updateChatRoom({
        id: chatRoom.id,
        workspaceId: workspace.currentWorkspace.id,
        name: formData.name,
        description: formData.description,
        settings: {
          allowFileSharing: formData.allowFileSharing,
          allowReactions: formData.allowReactions,
          notifications: formData.notifications,
          retentionDays: formData.retentionDays,
        },
      }).unwrap()

      onOpenChange(false)
    } catch (error) {
      console.error('Failed to update chat settings:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleClose = () => {
    // Reset form to original values
    setFormData({
      name: chatRoom.name,
      description: chatRoom.description || '',
      allowFileSharing: chatRoom.settings?.allowFileSharing ?? true,
      allowReactions: chatRoom.settings?.allowReactions ?? true,
      notifications: chatRoom.settings?.notifications ?? true,
      retentionDays: chatRoom.settings?.retentionDays || 90,
    })
    onOpenChange(false)
  }

  const hasChanges = () => {
    return (
      formData.name !== chatRoom.name ||
      formData.description !== (chatRoom.description || '') ||
      formData.allowFileSharing !== (chatRoom.settings?.allowFileSharing ?? true) ||
      formData.allowReactions !== (chatRoom.settings?.allowReactions ?? true) ||
      formData.notifications !== (chatRoom.settings?.notifications ?? true) ||
      formData.retentionDays !== (chatRoom.settings?.retentionDays || 90)
    )
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Chat Settings
          </DialogTitle>
          <DialogDescription>
            Manage settings for &quot;{chatRoom.name}&quot;
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Basic Information</h3>

            <div className="space-y-2">
              <Label htmlFor="chat-name">Chat Name</Label>
              <Input
                id="chat-name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter chat name"
                disabled={chatRoom.type === 'general'}
              />
              {chatRoom.type === 'general' && (
                <p className="text-xs text-muted-foreground">General chat name cannot be changed</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="chat-description">Description</Label>
              <Textarea
                id="chat-description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Enter chat description"
                rows={3}
              />
            </div>
          </div>

          {/* Chat Features */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Chat Features</h3>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="allow-file-sharing">File Sharing</Label>
                  <p className="text-xs text-muted-foreground">
                    Allow members to upload and share files
                  </p>
                </div>
                <Switch
                  id="allow-file-sharing"
                  checked={formData.allowFileSharing}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, allowFileSharing: checked }))}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="allow-reactions">Message Reactions</Label>
                  <p className="text-xs text-muted-foreground">
                    Allow members to react to messages with emojis
                  </p>
                </div>
                <Switch
                  id="allow-reactions"
                  checked={formData.allowReactions}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, allowReactions: checked }))}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="notifications">Notifications</Label>
                  <p className="text-xs text-muted-foreground">
                    Enable notifications for this chat
                  </p>
                </div>
                <Switch
                  id="notifications"
                  checked={formData.notifications}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, notifications: checked }))}
                />
              </div>
            </div>
          </div>

          {/* Data Retention */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Data Retention</h3>

            <div className="space-y-2">
              <Label htmlFor="retention-days">Message Retention Period</Label>
              <Select
                value={formData.retentionDays.toString()}
                onValueChange={(value) => setFormData(prev => ({ ...prev, retentionDays: parseInt(value) }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 days</SelectItem>
                  <SelectItem value="30">30 days</SelectItem>
                  <SelectItem value="90">90 days (default)</SelectItem>
                  <SelectItem value="180">180 days</SelectItem>
                  <SelectItem value="365">1 year</SelectItem>
                  <SelectItem value="-1">Never delete</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                How long to keep messages before automatic deletion
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSaveSettings}
            disabled={!hasChanges() || isUpdating || !formData.name.trim()}
          >
            {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Save className="mr-2 h-4 w-4" />
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}