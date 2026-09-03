'use client'

import { useState } from 'react'
import { Copy, CheckCheck, Linkedin } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { OAuthConnectButton } from '@/components/marketing/OAuthConnectButton'
import { useAppSelector } from '@/lib/hooks'

export default function LinkedInPage() {
  const [copied, setCopied] = useState(false)
  const [workflowCopied, setWorkflowCopied] = useState(false)
  const { currentWorkspace } = useAppSelector(state => state.workspace)
  const workspaceId = currentWorkspace?.id || ''

  const origin =
    typeof window !== 'undefined'
      ? window.location.origin
      : 'https://yourcrm.app'

  const webhookUrl = `${origin}/api/webhooks/linkedin`

  const workflowJson = JSON.stringify(
    {
      name: 'LinkedIn → CRM',
      nodes: [
        {
          type: 'n8n-nodes-base.linkedInTrigger',
          name: 'LinkedIn Lead',
          parameters: { event: 'newLead' },
        },
        {
          type: 'n8n-nodes-base.httpRequest',
          name: 'Send to CRM',
          parameters: {
            method: 'POST',
            url: webhookUrl,
            sendBody: true,
            bodyParameters: {
              parameters: [
                { name: 'firstName', value: '={{ $json.firstName }}' },
                { name: 'lastName', value: '={{ $json.lastName }}' },
                { name: 'email', value: '={{ $json.email }}' },
                { name: 'phone', value: '={{ $json.phone }}' },
                { name: 'company', value: '={{ $json.company }}' },
                { name: 'jobTitle', value: '={{ $json.jobTitle }}' },
              ],
            },
          },
        },
      ],
    },
    null,
    2
  )

  const handleCopy = () => {
    navigator.clipboard.writeText(webhookUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const handleWorkflowCopy = () => {
    navigator.clipboard.writeText(workflowJson).then(() => {
      setWorkflowCopied(true)
      setTimeout(() => setWorkflowCopied(false), 2000)
    })
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <Linkedin className="h-7 w-7 text-primary" />
        <h1 className="text-2xl font-bold">LinkedIn Integration</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Connect LinkedIn Account</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-muted-foreground">
            Connect your LinkedIn account to enable posting, lead capture, and
            outreach directly from the CRM.
          </p>
          {workspaceId && (
            <OAuthConnectButton
              provider="linkedin"
              workspaceId={workspaceId}
              label="LinkedIn"
              icon={<Linkedin className="mr-2 h-4 w-4" />}
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Webhook Setup</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Configure this URL in LinkedIn Campaign Manager → Lead Gen Forms →
            Integrations to automatically capture LinkedIn leads into your CRM.
          </p>
          <div className="flex items-center gap-2">
            <Input readOnly value={webhookUrl} className="font-mono text-sm" />
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="shrink-0"
            >
              {copied ? (
                <CheckCheck className="h-4 w-4 text-primary" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>How It Works</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="list-none space-y-3 text-sm text-muted-foreground">
            <li className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                1
              </span>
              <span>
                Set up a LinkedIn Lead Gen Form on LinkedIn Campaign Manager and
                attach it to your campaign.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                2
              </span>
              <span>
                In n8n, create a workflow: use the{' '}
                <strong>LinkedIn Lead Gen Form</strong> trigger node, then add
                an <strong>HTTP Request</strong> node that POSTs to the webhook
                URL above.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                3
              </span>
              <span>
                Leads automatically appear in your CRM with the tag{' '}
                <strong>linkedin-lead</strong>.
              </span>
            </li>
          </ol>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>n8n Workflow Template</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Copy this workflow JSON and import it in n8n (Menu → Import from
            clipboard). The webhook URL is already filled in for your workspace.
          </p>
          <div className="relative">
            <pre className="overflow-x-auto whitespace-pre-wrap break-all rounded-md border bg-muted p-4 font-mono text-xs">
              {workflowJson}
            </pre>
            <Button
              variant="outline"
              size="sm"
              onClick={handleWorkflowCopy}
              className="absolute right-2 top-2 gap-1.5"
            >
              {workflowCopied ? (
                <CheckCheck className="h-3.5 w-3.5 text-primary" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
              {workflowCopied ? 'Copied' : 'Copy'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>What Gets Captured</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              First Name
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              Last Name
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              Email
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              Phone
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              Company
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              Job Title
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              LinkedIn ID (mapped to customFields)
            </li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">
            For LinkedIn outreach and automated messaging, connect n8n with the
            LinkedIn trigger node to run outreach sequences.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
