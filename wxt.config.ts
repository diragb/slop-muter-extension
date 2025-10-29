import { defineConfig } from 'wxt'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    permissions: ['storage', 'activeTab'],
    name: 'Slop Muter',
    short_name: 'Slop Muter',
    description: 'Browser extension that blocks slop posts on your X/Twitter feed for you.',
    version: '0.1.0',
    author: {
      email: 'hey@diragb.dev'
    },
    action: {},
    page_action: {},
    host_permissions: ['*://*.x.com/*'],
    content_security_policy: {
      extension_pages: "script-src 'self'; object-src 'self'",
      sandbox: "sandbox allow-scripts allow-forms allow-popups allow-modals; script-src 'self' 'unsafe-inline' 'unsafe-eval'; child-src 'self';"
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
