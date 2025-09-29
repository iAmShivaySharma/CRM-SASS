import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { StoreProvider } from '@/components/providers/StoreProvider'
import { AuthInitializer } from '@/components/providers/AuthInitializer'
import { ThemeProvider } from '@/components/providers/ThemeProvider'
import { Toaster } from '@/components/ui/sonner'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'CRM Pro - Sales Management System',
  description: 'Professional CRM system with role management and lead tracking',
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
