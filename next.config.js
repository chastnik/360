/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    DATABASE_URL: process.env.DATABASE_URL,
    JWT_SECRET: process.env.JWT_SECRET,
    MATTERMOST_URL: process.env.MATTERMOST_URL,
    MATTERMOST_TOKEN: process.env.MATTERMOST_TOKEN,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
      },
      {
        protocol: 'https',
        hostname: '*.mattermost.com',
      },
    ],
  },
}

module.exports = nextConfig 