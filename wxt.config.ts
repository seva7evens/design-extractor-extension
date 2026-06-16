import { defineConfig } from 'wxt';

export default defineConfig({
  srcDir: 'src',
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'Design MD',
    description: 'Extract the current page into DESIGN.md with a BYOK Gemini workflow.',
    action: {
      default_title: 'Design MD',
      default_popup: 'popup.html'
    },
    commands: {
      _execute_action: {
        suggested_key: {
          default: 'Ctrl+Shift+Y',
          mac: 'Command+Shift+Y'
        },
        description: 'Open Design MD'
      }
    },
    permissions: ['activeTab', 'scripting', 'storage', 'tabs', 'downloads', 'offscreen'],
    host_permissions: ['https://generativelanguage.googleapis.com/*'],
    content_security_policy: {
      extension_pages: "script-src 'self'; object-src 'self'; connect-src https://generativelanguage.googleapis.com"
    }
  },
  hooks: {
    'build:manifestGenerated': (_, manifest) => {
      manifest.content_scripts = [];
      manifest.host_permissions = ['https://generativelanguage.googleapis.com/*'];
    }
  }
});
