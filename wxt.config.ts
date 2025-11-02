import { defineConfig } from 'wxt'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    permissions: ['storage', 'activeTab'],
    name: 'SlopMuter',
    short_name: 'SlopMuter',
    description: 'Browser extension that automatically blocks slop posts on your X/Twitter feed.',
    version: '0.1.0',
    author: {
      email: 'hey@diragb.dev'
    },
    action: {
      default_icon: {
        16: '/icon/16.png',
        32: '/icon/32.png',
        48: '/icon/48.png',
        96: '/icon/96.png',
        128: '/icon/128.png',
      },
    },
    icons: {
      16: '/icon/16.png',
      32: '/icon/32.png',
      48: '/icon/48.png',
      96: '/icon/96.png',
      128: '/icon/128.png',
    },
    host_permissions: ['*://*.x.com/*', '*://*.twitter.com/*'],
    content_security_policy: {
      extension_pages: "script-src 'self'; object-src 'self'",
      sandbox: "sandbox allow-scripts allow-forms allow-popups allow-modals; script-src 'self' 'unsafe-inline'; child-src 'self';"
    },
    homepage_url: 'https://slopmuter.diragb.dev',
  },
  vite: () => ({
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './'),
      },
    },
  }),
})
