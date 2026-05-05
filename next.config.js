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
      // Friendly URLs that nav-style buttons / external links may point to.
      // The actual pages live at /challenge and /game/select.
      { source: '/daily', destination: '/challenge', permanent: false },
      { source: '/detector', destination: '/game/select', permanent: false },
    ];
  },
};

module.exports = nextConfig;
