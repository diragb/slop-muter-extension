import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    permissions: ['storage', 'activeTab'],
    name: 'Slop Blocker',
    short_name: 'Slop Blocker',
    description: 'Block slop on your X feed.',
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
    homepage_url: 'https://slop-blocker.diragb.dev',
  },
});
