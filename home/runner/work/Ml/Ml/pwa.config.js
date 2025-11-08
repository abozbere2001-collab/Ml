
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
  // Ensure that workbox files are not excluded
  publicExcludes: ['!sw.js', '!sw.js.map', '!workbox-*.js', '!workbox-*.js.map'],
  // This is important to prevent next-pwa from overwriting our custom manifest
  buildExcludes: [/app-build-manifest\.json$/],
};

export default pwaConfig;
