import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { StoreProvider } from '@/components/providers/StoreProvider'
import { AuthInitializer } from '@/components/providers/AuthInitializer'
import { ThemeProvider } from '@/components/providers/ThemeProvider'
import { Toaster } from '@/components/ui/sonner'

const inter = Inter({ subsets: ['latin'] })

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || ''

export const metadata: Metadata = {
  title: {
    default: 'CRM Pro — AI-Powered CRM That Replaces 6 Tools',
    template: '%s | CRM Pro',
  },
  description: 'Professional CRM system with role management and lead tracking',
  metadataBase: APP_URL ? new URL(APP_URL) : undefined,
  alternates: {
    types: {
      'application/rss+xml': [{ url: '/feed.xml', title: 'CRM Pro Blog RSS Feed' }],
    },
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <StoreProvider>
          <AuthInitializer>
            <ThemeProvider>
              {children}
              <Toaster />
            </ThemeProvider>
          </AuthInitializer>
        </StoreProvider>
      </body>
    </html>
  )
}
