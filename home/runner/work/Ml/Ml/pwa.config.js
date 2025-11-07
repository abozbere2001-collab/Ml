
const isProd = process.env.NODE_ENV === 'production';
const basePath = isProd ? process.env.NEXT_PUBLIC_BASE_PATH || '' : '';

/** @type {import('next-pwa').PWAConfig} */
const pwaConfig = {
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: !isProd,
  publicExcludes: ['!sw.js', '!sw.js.map', '!workbox-*.js', '!workbox-*.js.map'],
  scope: '/Ml/',
  sw: 'sw.js',
  buildExcludes: [/app-build-manifest\.json$/],
};

export default pwaConfig;
