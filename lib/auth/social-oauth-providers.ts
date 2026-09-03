export class LinkedInOAuthProvider {
  private clientId: string
  private clientSecret: string
  private redirectUri: string

  constructor() {
    this.clientId = process.env.LINKEDIN_CLIENT_ID!
    this.clientSecret = process.env.LINKEDIN_CLIENT_SECRET!
    this.redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/oauth/linkedin/callback`
  }

  getAuthUrl(state: string): string {
    const scopes = ['openid', 'profile', 'email', 'w_member_social']
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      scope: scopes.join(' '),
      state,
    })
    return `https://www.linkedin.com/oauth/v2/authorization?${params}`
  }

  async exchangeCodeForTokens(code: string): Promise<{
    accessToken: string
    refreshToken?: string
    expiresIn: number
    scope: string
  }> {
    const res = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: this.redirectUri,
        client_id: this.clientId,
        client_secret: this.clientSecret,
      }),
    })
    if (!res.ok) {
      throw new Error(`LinkedIn token exchange failed: ${res.statusText}`)
    }
    const data = await res.json()
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in * 1000,
      scope: data.scope ?? '',
    }
  }

  async getUserInfo(accessToken: string): Promise<{
    id: string
    name: string
    email: string
    picture?: string
  }> {
    const res = await fetch('https://api.linkedin.com/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!res.ok) {
      throw new Error(`LinkedIn userinfo failed: ${res.statusText}`)
    }
    const data = await res.json()
    return {
      id: data.sub,
      name:
        data.name ??
        `${data.given_name ?? ''} ${data.family_name ?? ''}`.trim(),
      email: data.email ?? '',
      picture: data.picture,
    }
  }
}

export class MetaOAuthProvider {
  private clientId: string
  private clientSecret: string
  private redirectUri: string

  constructor() {
    this.clientId = process.env.META_APP_ID!
    this.clientSecret = process.env.META_APP_SECRET!
    this.redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/oauth/meta/callback`
  }

  getAuthUrl(state: string): string {
    const scopes = [
      'whatsapp_business_management',
      'whatsapp_business_messaging',
      'business_management',
    ]
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      scope: scopes.join(','),
      response_type: 'code',
      state,
    })
    return `https://www.facebook.com/v18.0/dialog/oauth?${params}`
  }

  async exchangeCodeForTokens(code: string): Promise<{
    accessToken: string
    expiresIn: number
    scope: string
  }> {
    const params = new URLSearchParams({
      client_id: this.clientId,
      client_secret: this.clientSecret,
      redirect_uri: this.redirectUri,
      code,
    })
    const res = await fetch(
      `https://graph.facebook.com/v18.0/oauth/access_token?${params}`
    )
    if (!res.ok) {
      throw new Error(`Meta token exchange failed: ${res.statusText}`)
    }
    const data = await res.json()
    return {
      accessToken: data.access_token,
      expiresIn: (data.expires_in ?? 5183944) * 1000,
      scope: data.scope ?? '',
    }
  }

  async getUserInfo(accessToken: string): Promise<{
    id: string
    name: string
    email?: string
  }> {
    const res = await fetch(
      `https://graph.facebook.com/v18.0/me?fields=id,name,email&access_token=${accessToken}`
    )
    if (!res.ok) {
      throw new Error(`Meta userinfo failed: ${res.statusText}`)
    }
    return res.json()
  }
}
