import { NextRequest, NextResponse } from 'next/server'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import { verifyAuthToken } from '@/lib/mongodb/auth'

// POST - Validate API key
export async function POST(request: NextRequest) {
  try {
    await connectToMongoDB()

    const auth = await verifyAuthToken(request)
    if (!auth) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { apiKey, provider } = await request.json()

    if (!apiKey || !provider) {
      return NextResponse.json(
        { error: 'API key and provider are required' },
        { status: 400 }
      )
    }

    let isValid = false
    let detectedProvider = provider

    // Validate based on provider
    if (provider === 'openrouter') {
      // Basic format validation for OpenRouter
      isValid = apiKey.startsWith('sk-or-v1-') && apiKey.length > 20

      // Could add actual API call validation here
      if (isValid) {
        try {
          // Test the API key with a simple request to OpenRouter
          const response = await fetch('https://openrouter.ai/api/v1/models', {
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json'
            }
          })

          isValid = response.ok
        } catch (error) {
          console.error('OpenRouter API validation error:', error)
          isValid = false
        }
      }
    } else {
      // Auto-detect provider based on key format
      if (apiKey.startsWith('sk-or-v1-')) {
        detectedProvider = 'openrouter'
        isValid = apiKey.length > 20
      } else if (apiKey.startsWith('sk-') && apiKey.length > 40) {
        detectedProvider = 'openai'
        isValid = true // Basic format check
      } else {
        isValid = false
      }
    }

    return NextResponse.json({
      success: true,
      valid: isValid,
      provider: detectedProvider
    })

  } catch (error) {
    console.error('Validate API key error:', error)

    return NextResponse.json({
      success: false,
      error: 'Failed to validate API key',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}