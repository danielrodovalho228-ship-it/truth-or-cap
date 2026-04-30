/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
    ],
  },
  experimental: {
    serverActions: { bodySizeLimit: '50mb' },
  },
  async redirects() {
    return [
      { source: '/amigos', destination: '/friends', permanent: true },
      { source: '/amigos/:path*', destination: '/friends/:path*', permanent: true },
      { source: '/jogo/select', destination: '/game/select', permanent: true },
      { source: '/jogo/novo', destination: '/game/new', permanent: true },
      { source: '/jogo/:path*', destination: '/game/:path*', permanent: true },
    ];
  },
};

module.exports = nextConfig;
