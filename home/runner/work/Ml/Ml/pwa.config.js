
const isProd = process.env.NODE_ENV === 'production';
const basePath = isProd ? process.env.NEXT_PUBLIC_BASE_PATH || '' : '';

/** @type {import('next-pwa').PWAConfig} */
const pwaConfig = {
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: !isProd,
  buildExcludes: [/app-build-manifest\.json$/, /manifest\.json$/], // Keep manifest untouched
  scope: basePath || '/',
  sw: 'sw.js',
};

export default pwaConfig;
