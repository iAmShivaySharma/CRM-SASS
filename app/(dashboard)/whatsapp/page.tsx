'use client'

import { useAppSelector } from '@/lib/hooks'
import { Loader2, MessageCircle } from 'lucide-react'
import { useGetAccountsQuery, useGetConversationsQuery } from '@/lib/api/whatsappApi'

export default function WhatsAppPage() {
  const { currentWorkspace } = useAppSelector(state => state.workspace)

  const { data: accountsData, isLoading: accountsLoading } = useGetAccountsQuery(
    { workspaceId: currentWorkspace?._id ?? '' },
    { skip: !currentWorkspace }
  )

  const { data: conversationsData, isLoading: conversationsLoading } = useGetConversationsQuery(
    { workspaceId: currentWorkspace?._id ?? '' },
    { skip: !currentWorkspace }
  )

  if (!currentWorkspace) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <MessageCircle className="h-7 w-7 text-primary" />
        <h1 className="text-2xl font-bold">WhatsApp</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-xl border bg-card p-6">
          <h2 className="text-lg font-semibold mb-4">Connected Accounts</h2>
          {accountsLoading ? (
            <div className="flex items-center justify-center h-24">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-2">
              {(accountsData?.accounts ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">No WhatsApp accounts connected.</p>
              ) : (
                (accountsData?.accounts ?? []).map(account => (
                  <div key={account._id} className="flex items-center justify-between rounded-lg bg-muted px-4 py-3">
                    <div>
                      <p className="text-sm font-medium">{account.name}</p>
                      <p className="text-xs text-muted-foreground">{account.phoneNumber}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${account.isActive ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                      {account.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        <div className="rounded-xl border bg-card p-6">
          <h2 className="text-lg font-semibold mb-4">Conversations</h2>
          {conversationsLoading ? (
            <div className="flex items-center justify-center h-24">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-2">
              {(conversationsData?.conversations ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">No conversations yet.</p>
              ) : (
                (conversationsData?.conversations ?? []).slice(0, 10).map(conv => (
                  <div key={conv._id} className="flex items-center justify-between rounded-lg bg-muted px-4 py-3">
                    <div>
                      <p className="text-sm font-medium">{conv.contactName ?? conv.contactPhone}</p>
                      {conv.lastMessage && <p className="text-xs text-muted-foreground truncate max-w-[200px]">{conv.lastMessage}</p>}
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${conv.status === 'open' ? 'bg-primary/10 text-primary' : conv.status === 'pending' ? 'bg-muted text-muted-foreground' : 'bg-muted text-muted-foreground'}`}>
                      {conv.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
