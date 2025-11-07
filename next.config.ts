
import type {NextConfig} from 'next';

const isProd = process.env.NODE_ENV === 'production';

// Automatically determine the repository name from GitHub Actions environment variables
const repo = process.env.GITHUB_REPOSITORY ? process.env.GITHUB_REPOSITORY.split('/')[1] : '';

const assetPrefix = isProd && repo ? `/${repo}/` : '';
const basePath = isProd && repo ? `/${repo}` : '';

const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
});

const nextConfig: NextConfig = {
  output: 'export',
  assetPrefix: assetPrefix,
  basePath: basePath,
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'media.api-sports.io',
        port: '',
        pathname: '/**',
      },
    ],
  },
  env: {
    NEXT_PUBLIC_API_FOOTBALL_KEY: "e931ffb3ccda478e60b74c6e36913c90",
    NEXT_PUBLIC_FIREBASE_API_KEY: "AIzaSyDKQK4mfCGlSCwJS7oOdMhJa0SIJAv3nXM",
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: "nabd-d71ab.firebaseapp.com",
    NEXT_PUBLIC_FIREBASE_DATABASE_URL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: "nabd-d71ab",
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: "nabd-d71ab.appspot.com",
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: "529236633123",
    NEXT_PUBLIC_FIREBASE_APP_ID: "1:529236633123:web:7d4945daae4d51038e3396",
    NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID: "G-X5SY2K798F",
  }
};

export default withPWA(nextConfig);
