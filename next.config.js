/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    unoptimized: true,
  },
  serverExternalPackages: [
    'mongoose',
    'imap',
    'nodemailer',
    'googleapis',
    '@microsoft/microsoft-graph-client',
    'mailparser',
    'socket.io',
    'socket.io-client',
  ],
  async headers() {
    return [
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/api/analytics/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 's-maxage=300, stale-while-revalidate=600',
          },
        ],
      },
      {
        source: '/api/leads/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate',
          },
        ],
      },
      {
        source: '/api/contacts/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate',
          },
        ],
      },
      {
        source: '/api/engines/catalog',
        headers: [
          {
            key: 'Cache-Control',
            value: 's-maxage=3600, stale-while-revalidate=7200',
          },
        ],
      },
    ]
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push({
        kerberos: 'commonjs kerberos',
        '@mongodb-js/zstd': 'commonjs @mongodb-js/zstd',
        '@aws-sdk/credential-providers':
          'commonjs @aws-sdk/credential-providers',
        'gcp-metadata': 'commonjs gcp-metadata',
        snappy: 'commonjs snappy',
        socks: 'commonjs socks',
        aws4: 'commonjs aws4',
        'mongodb-client-encryption': 'commonjs mongodb-client-encryption',
      })
    }
    return config
  },
}

module.exports = nextConfig
