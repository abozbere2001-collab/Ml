
const isProd = process.env.NODE_ENV === 'production';
const basePath = isProd ? process.env.NEXT_PUBLIC_BASE_PATH || '' : '';

/** @type {import('next-pwa').PWAConfig} */
const pwaConfig = {
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: !isProd,
  scope: basePath || '/',
  sw: 'sw.js',
  // This is important to prevent next-pwa from overwriting our custom manifest
  buildExcludes: [/app-build-manifest\.json$/],
  publicExcludes: ['!sw.js', '!sw.js.map', '!workbox-*.js', '!workbox-*.js.map'],
};

export default pwaConfig;
