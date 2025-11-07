
const isProd = process.env.NODE_ENV === 'production';
const basePath = isProd ? process.env.NEXT_PUBLIC_BASE_PATH || '' : '';

/** @type {import('next-pwa').PWAConfig} */
const pwaConfig = {
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: !isProd,
  publicExcludes: ['!sw.js', '!sw.js.map', '!workbox-*.js', '!workbox-*.js.map'],
  scope: basePath,
  sw: 'sw.js',
  buildExcludes: [/app-build-manifest\.json$/],
  // Add a manifest 'id' property. This is crucial for PWABuilder to generate a stable package name.
  // The value should be the root path of your application on its domain.
  manifest: {
    id: "/Ml/",
    start_url: ".",
    display: "standalone",
    icons: [
      {
        src: `${basePath}/icon-192x192.png`,
        sizes: "192x192",
        type: "image/png"
      },
      {
        src: `${basePath}/icon-512x512.png`,
        sizes: "512x512",
        type: "image/png"
      },
      {
        src: `${basePath}/icon-192x192.png`,
        sizes: "192x192",
        type: "image/png",
        purpose: "any maskable"
      }
    ]
  },
};

export default pwaConfig;
