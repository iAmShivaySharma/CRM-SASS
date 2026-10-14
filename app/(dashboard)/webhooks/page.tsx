'use client'

import { useState } from 'react'
import { WebhookList } from '@/components/webhooks/WebhookList'
import { WebhookForm } from '@/components/webhooks/WebhookForm'
import { ConnectedPlatforms } from '@/components/integrations/ConnectedPlatforms'
import { LeadSubmissions } from '@/components/integrations/LeadSubmissions'
import { type Webhook } from '@/lib/api/webhookApi'
import { usePermissions, Permission } from '@/hooks/usePermissions'
import { AccessDenied } from '@/components/ui/access-denied'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

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
      <div>
        <h1 className="text-2xl font-bold text-foreground sm:text-3xl">Webhooks & Integrations</h1>
        <p className="mt-1 text-muted-foreground">Connect platforms and manage webhooks</p>
      </div>

      <Tabs defaultValue="platforms">
        <TabsList>
          <TabsTrigger value="platforms">Platform Integrations</TabsTrigger>
          <TabsTrigger value="submissions">Lead Submissions</TabsTrigger>
          <TabsTrigger value="webhooks">Custom Webhooks</TabsTrigger>
        </TabsList>

        <TabsContent value="platforms">
          <ConnectedPlatforms />
        </TabsContent>

        <TabsContent value="submissions">
          <LeadSubmissions />
        </TabsContent>

        <TabsContent value="webhooks">
          <WebhookList
            onCreateWebhook={handleCreateWebhook}
            onEditWebhook={handleEditWebhook}
          />
          <WebhookForm
            open={isFormOpen}
            onClose={handleCloseForm}
            webhook={editingWebhook}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
