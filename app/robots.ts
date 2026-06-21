import type { MetadataRoute } from 'next'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://crmprosaas.com'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/blog', '/blog/', '/home'],
        disallow: [
          '/api/',
          '/dashboard/',
          '/login',
          '/signup',
          '/auth/',
          '/settings/',
          '/leads/',
          '/projects/',
          '/contacts/',
          '/employees/',
          '/analytics/',
          '/chat/',
          '/email/',
          '/webhooks/',
          '/shared/',
          '/accept-invitation/',
          '/_next/',
          '/static/',
        ],
      },
      {
        userAgent: 'Googlebot',
        allow: ['/', '/blog', '/blog/', '/home'],
        disallow: ['/api/', '/dashboard/', '/auth/'],
      },
      {
        userAgent: 'Bingbot',
        allow: ['/', '/blog', '/blog/', '/home'],
        disallow: ['/api/', '/dashboard/', '/auth/'],
      },
    ],
    sitemap: `${APP_URL}/sitemap.xml`,
    host: APP_URL,
  }
}
