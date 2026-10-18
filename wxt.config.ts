import { defineConfig } from 'wxt';

export default defineConfig({
  srcDir: 'src',
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'SpaceTabs — Tab Manager',
    description: 'Local-first, unlimited tab & workspace manager with Google Drive sync.',
    version: '1.0.0',
    permissions: [
      'tabs',
      'tabGroups',
      'storage',
      'identity',
      'alarms',
      'commands',
      'favicon',
    ],
    host_permissions: ['https://www.googleapis.com/*'],
    commands: {
      'focus-dashboard': {
        suggested_key: {
          default: 'Alt+Shift+W',
          mac: 'Alt+Shift+W',
        },
        description: 'Focus or open the pinned Index Dashboard tab',
      },
    },
    oauth2: {
      client_id: 'sample-client-id.apps.googleusercontent.com',
      scopes: ['https://www.googleapis.com/auth/drive.file'],
    },
  },
});
