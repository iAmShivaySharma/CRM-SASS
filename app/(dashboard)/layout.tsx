'use client'

import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { PushNotificationProvider } from '@/components/providers/PushNotificationProvider'

export default function DashboardLayoutPage({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <PushNotificationProvider>
      <DashboardLayout>{children}</DashboardLayout>
    </PushNotificationProvider>
  )
}
