'use client'

import { useState, useEffect } from 'react'
import { Copy, Gift, Users, Check, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useAppSelector } from '@/lib/hooks'

export default function ReferralsPage() {
  const { currentWorkspace } = useAppSelector(state => state.workspace)
  const [loading, setLoading] = useState(true)
  const [referralLink, setReferralLink] = useState('')
  const [referralCode, setReferralCode] = useState('')
  const [referrals, setReferrals] = useState<any[]>([])
  const [stats, setStats] = useState({
    totalReferred: 0,
    signedUp: 0,
    converted: 0,
    rewarded: 0,
  })
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!currentWorkspace?.id) return

    const fetchReferrals = async () => {
      try {
        const res = await fetch(
          `/api/referrals?workspaceId=${currentWorkspace.id}`
        )
        const data = await res.json()
        if (data.success) {
          setReferralLink(data.referralLink)
          setReferralCode(data.referralCode)
          setReferrals(data.referrals)
          setStats(data.stats)
        }
      } catch {}
      setLoading(false)
    }

    fetchReferrals()
  }, [currentWorkspace?.id])

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink)
    setCopied(true)
    toast.success('Referral link copied!')
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Referral Program</h1>
        <p className="text-muted-foreground">
          Invite friends and earn rewards when they sign up.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-primary" />
            Your Referral Link
          </CardTitle>
          <CardDescription>
            Share this link with friends and colleagues.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={referralLink}
              readOnly
              className="font-mono text-sm"
            />
            <Button onClick={handleCopy} variant="outline">
              {copied ? (
                <Check className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Code:{' '}
            <code className="rounded bg-muted px-1 py-0.5">{referralCode}</code>
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-3xl font-bold">{stats.totalReferred}</p>
            <p className="text-sm text-muted-foreground">Total Referred</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-3xl font-bold text-blue-600">{stats.signedUp}</p>
            <p className="text-sm text-muted-foreground">Signed Up</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-3xl font-bold text-green-600">
              {stats.converted}
            </p>
            <p className="text-sm text-muted-foreground">Converted</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-3xl font-bold text-yellow-600">
              {stats.rewarded}
            </p>
            <p className="text-sm text-muted-foreground">Rewarded</p>
          </CardContent>
        </Card>
      </div>

      {referrals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Referred Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {referrals.map((ref: any) => (
                <div
                  key={ref.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {ref.referredEmail || 'Unknown'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(ref.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge
                    variant={
                      ref.status === 'converted' || ref.status === 'rewarded'
                        ? 'default'
                        : 'secondary'
                    }
                  >
                    {ref.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
