'use client'

import { useState } from 'react'
import { WebhookList } from '@/components/webhooks/WebhookList'
import { WebhookForm } from '@/components/webhooks/WebhookForm'
import { type Webhook } from '@/lib/api/webhookApi'
import { usePermissions, Permission } from '@/hooks/usePermissions'
import { AccessDenied } from '@/components/ui/access-denied'

export default function WebhooksPage() {
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingWebhook, setEditingWebhook] = useState<Webhook | null>(null)
  const { hasPermission, isLoading: permissionsLoading } = usePermissions()

  if (!permissionsLoading && !hasPermission(Permission.WEBHOOKS_VIEW)) {
    return <AccessDenied />
  }

  const handleCreateWebhook = () => {
    setEditingWebhook(null)
    setIsFormOpen(true)
  }

  const handleEditWebhook = (webhook: Webhook) => {
    setEditingWebhook(webhook)
    setIsFormOpen(true)
  }

  const handleCloseForm = () => {
    setIsFormOpen(false)
    setEditingWebhook(null)
  }

  return (
    <div className="w-full space-y-6">
      <WebhookList
        onCreateWebhook={handleCreateWebhook}
        onEditWebhook={handleEditWebhook}
      />

      <WebhookForm
        open={isFormOpen}
        onClose={handleCloseForm}
        webhook={editingWebhook}
      />
    </div>
  )
}
