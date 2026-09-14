/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Production builds write elsewhere so they cannot overwrite the chunks a
  // running `next dev` is still serving.
  distDir: process.env.NEXT_DIST_DIR || '.next',
  // A stray lockfile in the home directory makes Next guess the wrong root.
  outputFileTracingRoot: new URL('.', import.meta.url).pathname,
  poweredByHeader: false,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'ik.imagekit.io' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
  },
  async rewrites() {
    // Lets the browser call /api/* same-origin in development; in production the
    // API lives on its own Render service and NEXT_PUBLIC_API_URL points at it.
    const api = process.env.NEXT_PUBLIC_API_URL
    return api ? [{ source: '/proxy/:path*', destination: `${api}/:path*` }] : []
  },
}
export default nextConfig
