'use client'

import { Key } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ApiKeyManagementButtonProps {
  onClick?: () => void
}

export function ApiKeyManagementButton({ onClick }: ApiKeyManagementButtonProps) {
  const handleClick = () => {
    if (onClick) {
      onClick()
    } else {
      // Navigate to API keys page
      window.location.href = '/engines/api-keys'
    }
  }

  return (
    <Button
      variant="outline"
      onClick={handleClick}
      className="border-primary/20 hover:border-primary/40"
    >
      <Key className="mr-2 h-4 w-4" />
      Manage API Keys
    </Button>
  )
}