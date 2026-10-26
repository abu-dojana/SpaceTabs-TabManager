import { defineConfig } from 'wxt';

export default defineConfig({
  srcDir: 'src',
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'SpaceTabs — Tab Manager',
    description: 'Local-first, unlimited tab & workspace manager with Google Drive sync.',
    version: '1.2.0',
    icons: {
      16: 'icon-16.png',
      32: 'icon-32.png',
      48: 'icon-48.png',
      128: 'icon-128.png',
    },
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
      client_id: '406048483721-fgfj05bbbm9ingrja36578ieik7ig0hq.apps.googleusercontent.com',
      scopes: [
        'https://www.googleapis.com/auth/drive.file',
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile',
      ],
    },
  },
});
