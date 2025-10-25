import { google } from 'googleapis'
import { Client } from '@microsoft/microsoft-graph-client'
import { AuthenticationProvider } from '@microsoft/microsoft-graph-client'

// OAuth Configuration
export interface OAuthConfig {
  clientId: string
  clientSecret: string
  redirectUri: string
  scopes: string[]
}

export interface OAuthTokens {
  accessToken: string
  refreshToken: string
  expiresIn: number
  scope?: string
}

// Google OAuth Provider
export class GoogleOAuthProvider {
  private oauth2Client: any

  constructor(config: OAuthConfig) {
    this.oauth2Client = new google.auth.OAuth2(
      config.clientId,
      config.clientSecret,
      config.redirectUri
    )
  }

  static create(): GoogleOAuthProvider {
    const config = {
      clientId: process.env.GOOGLE_OAUTH_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET!,
      redirectUri: process.env.GOOGLE_OAUTH_REDIRECT_URI!,
      scopes: []
    }
    return new GoogleOAuthProvider(config)
  }

  getAuthUrl(state?: string): string {
    const scopes = [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/gmail.modify',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile'
    ]

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      state: state,
      prompt: 'consent' // Force consent to get refresh token
    })
  }

  async exchangeCodeForTokens(code: string): Promise<OAuthTokens> {
    try {
      const { tokens } = await this.oauth2Client.getToken(code)

      return {
        accessToken: tokens.access_token!,
        refreshToken: tokens.refresh_token!,
        expiresIn: tokens.expiry_date! - Date.now(),
        scope: tokens.scope
      }
    } catch (error) {
      console.error('Error exchanging code for tokens:', error)
      throw new Error('Failed to exchange authorization code for tokens')
    }
  }

  async refreshAccessToken(refreshToken: string): Promise<OAuthTokens> {
    try {
      this.oauth2Client.setCredentials({
        refresh_token: refreshToken
      })

      const { credentials } = await this.oauth2Client.refreshAccessToken()

      return {
        accessToken: credentials.access_token!,
        refreshToken: credentials.refresh_token || refreshToken,
        expiresIn: credentials.expiry_date! - Date.now(),
        scope: credentials.scope
      }
    } catch (error) {
      console.error('Error refreshing access token:', error)
      throw new Error('Failed to refresh access token')
    }
  }

  async getUserInfo(accessToken: string): Promise<any> {
    try {
      this.oauth2Client.setCredentials({
        access_token: accessToken
      })

      const oauth2 = google.oauth2({ version: 'v2', auth: this.oauth2Client })
      const { data } = await oauth2.userinfo.get()

      return {
        id: data.id,
        email: data.email,
        name: data.name,
        picture: data.picture,
        verified_email: data.verified_email
      }
    } catch (error) {
      console.error('Error getting user info:', error)
      throw new Error('Failed to get user information')
    }
  }

  getGmailClient(accessToken: string) {
    this.oauth2Client.setCredentials({
      access_token: accessToken
    })

    return google.gmail({ version: 'v1', auth: this.oauth2Client })
  }
}

// Microsoft OAuth Provider
export class MicrosoftOAuthProvider {
  private config: OAuthConfig

  constructor(config: OAuthConfig) {
    this.config = config
  }

  static create(): MicrosoftOAuthProvider {
    const config = {
      clientId: process.env.MICROSOFT_OAUTH_CLIENT_ID!,
      clientSecret: process.env.MICROSOFT_OAUTH_CLIENT_SECRET!,
      redirectUri: process.env.MICROSOFT_OAUTH_REDIRECT_URI!,
      scopes: []
    }
    return new MicrosoftOAuthProvider(config)
  }

  getAuthUrl(state?: string): string {
    const scopes = [
      'https://graph.microsoft.com/Mail.ReadWrite',
      'https://graph.microsoft.com/Mail.Send',
      'https://graph.microsoft.com/User.Read',
      'offline_access'
    ]

    const params = new URLSearchParams({
      client_id: this.config.clientId,
      response_type: 'code',
      redirect_uri: this.config.redirectUri,
      scope: scopes.join(' '),
      response_mode: 'query',
      ...(state && { state })
    })

    return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params.toString()}`
  }

  async exchangeCodeForTokens(code: string): Promise<OAuthTokens> {
    try {
      const response = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
          code: code,
          redirect_uri: this.config.redirectUri,
          grant_type: 'authorization_code',
        }),
      })

      if (!response.ok) {
        throw new Error(`Token exchange failed: ${response.statusText}`)
      }

      const data = await response.json()

      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresIn: data.expires_in * 1000, // Convert to milliseconds
        scope: data.scope
      }
    } catch (error) {
      console.error('Error exchanging code for tokens:', error)
      throw new Error('Failed to exchange authorization code for tokens')
    }
  }

  async refreshAccessToken(refreshToken: string): Promise<OAuthTokens> {
    try {
      const response = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
          refresh_token: refreshToken,
          grant_type: 'refresh_token',
        }),
      })

      if (!response.ok) {
        throw new Error(`Token refresh failed: ${response.statusText}`)
      }

      const data = await response.json()

      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token || refreshToken,
        expiresIn: data.expires_in * 1000,
        scope: data.scope
      }
    } catch (error) {
      console.error('Error refreshing access token:', error)
      throw new Error('Failed to refresh access token')
    }
  }

  async getUserInfo(accessToken: string): Promise<any> {
    try {
      const response = await fetch('https://graph.microsoft.com/v1.0/me', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to get user info: ${response.statusText}`)
      }

      const data = await response.json()

      return {
        id: data.id,
        email: data.mail || data.userPrincipalName,
        name: data.displayName,
        givenName: data.givenName,
        surname: data.surname
      }
    } catch (error) {
      console.error('Error getting user info:', error)
      throw new Error('Failed to get user information')
    }
  }

  getGraphClient(accessToken: string) {
    const authProvider: AuthenticationProvider = {
      getAccessToken: async () => accessToken
    }

    return Client.initWithMiddleware({ authProvider })
  }
}

// OAuth Provider Factory
export class OAuthProviderFactory {
  static createProvider(provider: 'gmail' | 'outlook', config: OAuthConfig) {
    switch (provider) {
      case 'gmail':
        return new GoogleOAuthProvider(config)
      case 'outlook':
        return new MicrosoftOAuthProvider(config)
      default:
        throw new Error(`Unsupported OAuth provider: ${provider}`)
    }
  }

  static getConfig(provider: 'gmail' | 'outlook'): OAuthConfig {
    switch (provider) {
      case 'gmail':
        return {
          clientId: process.env.GOOGLE_OAUTH_CLIENT_ID!,
          clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET!,
          redirectUri: process.env.GOOGLE_OAUTH_REDIRECT_URI!,
          scopes: [
            'https://www.googleapis.com/auth/gmail.readonly',
            'https://www.googleapis.com/auth/gmail.send',
            'https://www.googleapis.com/auth/gmail.modify',
            'https://www.googleapis.com/auth/userinfo.email'
          ]
        }
      case 'outlook':
        return {
          clientId: process.env.MICROSOFT_OAUTH_CLIENT_ID!,
          clientSecret: process.env.MICROSOFT_OAUTH_CLIENT_SECRET!,
          redirectUri: process.env.MICROSOFT_OAUTH_REDIRECT_URI!,
          scopes: [
            'https://graph.microsoft.com/Mail.ReadWrite',
            'https://graph.microsoft.com/Mail.Send',
            'https://graph.microsoft.com/User.Read'
          ]
        }
      default:
        throw new Error(`Unsupported OAuth provider: ${provider}`)
    }
  }
}

// State management for OAuth flows
export interface OAuthState {
  provider: 'gmail' | 'outlook'
  userId: string
  workspaceId: string
  timestamp: number
  nonce: string
}

export class OAuthStateManager {
  private static states = new Map<string, OAuthState>()
  private static readonly STATE_EXPIRY = 10 * 60 * 1000 // 10 minutes

  static generateState(provider: 'gmail' | 'outlook', userId: string, workspaceId: string): string {
    const nonce = Math.random().toString(36).substring(2, 15)
    const timestamp = Date.now()

    const state: OAuthState = {
      provider,
      userId,
      workspaceId,
      timestamp,
      nonce
    }

    const stateId = Buffer.from(JSON.stringify({
      provider,
      userId,
      workspaceId,
      nonce,
      timestamp
    })).toString('base64url')

    this.states.set(stateId, state)

    // Clean up expired states
    this.cleanupExpiredStates()

    return stateId
  }

  static validateState(stateId: string): OAuthState | null {
    const state = this.states.get(stateId)

    if (!state) {
      return null
    }

    // Check if state has expired
    if (Date.now() - state.timestamp > this.STATE_EXPIRY) {
      this.states.delete(stateId)
      return null
    }

    // Remove state after validation (one-time use)
    this.states.delete(stateId)
    return state
  }

  private static cleanupExpiredStates() {
    const now = Date.now()
    for (const [stateId, state] of Array.from(this.states.entries())) {
      if (now - state.timestamp > this.STATE_EXPIRY) {
        this.states.delete(stateId)
      }
    }
  }
}