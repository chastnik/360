/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: true,
  },
  env: {
    DATABASE_URL: process.env.DATABASE_URL,
    JWT_SECRET: process.env.JWT_SECRET,
    MATTERMOST_URL: process.env.MATTERMOST_URL,
    MATTERMOST_TOKEN: process.env.MATTERMOST_TOKEN,
  },
  images: {
    domains: ['localhost'],
  },
}

module.exports = nextConfig 