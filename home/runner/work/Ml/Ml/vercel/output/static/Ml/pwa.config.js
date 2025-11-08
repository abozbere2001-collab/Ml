
/** @type {import('next-pwa').PWAConfig} */
const pwaConfig = {
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV !== 'production',
  publicExcludes: ['!sw.js', '!sw.js.map', '!workbox-*.js', '!workbox-*.js.map'],
  scope: '/Ml/', // Hardcoded for GitHub Pages
  sw: '/Ml/sw.js',   // Hardcoded for GitHub Pages
  buildExcludes: [/app-build-manifest\.json$/],
};

export default pwaConfig;
