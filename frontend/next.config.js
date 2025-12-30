/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  compress: true,
  poweredByHeader: false,
  
  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=()'
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: https:",
              "connect-src 'self' https://dmhca-worksheet.onrender.com https://eqeikrpqtzypfbcdzbrc.supabase.co",
              "frame-src 'none'",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'"
            ].join('; ')
          }
        ]
      }
    ]
  },
  
  images: {
    domains: ['localhost', 'dmhca-worksheet.onrender.com', 'dmhca-worksheet.vercel.app'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.vercel.app',
        port: '',
        pathname: '**',
      },
      {
        protocol: 'https',
        hostname: '*.onrender.com',
        port: '',
        pathname: '**',
      },
    ],
  },
  
  experimental: {
    optimizePackageImports: ['lucide-react'],
  }
}

module.exports = nextConfig