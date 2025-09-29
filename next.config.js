/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { unoptimized: true },
  experimental: {
    serverComponentsExternalPackages: ['mongoose'],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Handle MongoDB optional dependencies
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
