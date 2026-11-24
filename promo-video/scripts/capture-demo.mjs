import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const EXT_PATH = path.resolve(ROOT, '../dist');
const PUBLIC_DIR = path.resolve(ROOT, 'public');
const SHOTS_DIR = path.resolve(PUBLIC_DIR, 'screenshots');
const FOOTAGE_DIR = path.resolve(PUBLIC_DIR, 'footage');
const RAW_DIR = path.resolve(ROOT, '.raw-captures');

fs.mkdirSync(SHOTS_DIR, { recursive: true });
fs.mkdirSync(FOOTAGE_DIR, { recursive: true });
fs.mkdirSync(RAW_DIR, { recursive: true });

function findFfmpeg() {
  const candidates = [
    path.resolve(ROOT, 'node_modules/@remotion/compositor-win32-x64-msvc/ffmpeg.exe'),
    path.resolve(ROOT, 'node_modules/@remotion/compositor-darwin-arm64/ffmpeg'),
    path.resolve(ROOT, 'node_modules/@remotion/compositor-linux-x64-gnu/ffmpeg'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return 'ffmpeg';
}

function favicon(domain) {
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
}

function buildSeedData() {
  const now = Date.now();
  const day = 86400000;

  const spaces = [
    {
      id: 'space-ai',
      name: 'AI Research',
      icon: '🔥',
      color: '#10b981',
      section: 'RESEARCH',
      sectionOrder: 0,
      description: 'Transformer papers, model benchmarks & inference optimization',
      order: 0,
      createdAt: now - 5 * day,
      updatedAt: now - 10000,
      isArchived: false,
    },
    {
      id: 'space-sys',
      name: 'System Design',
      icon: '📚',
      color: '#06b6d4',
      section: 'RESEARCH',
      sectionOrder: 0,
      description: 'Distributed consensus, caching layers & storage engines',
      order: 1,
      createdAt: now - 4 * day,
      updatedAt: now - 20000,
      isArchived: false,
    },
    {
      id: 'space-launch',
      name: 'Product Launch',
      icon: '🚀',
      color: '#8b5cf6',
      section: 'DEVELOPMENT',
      sectionOrder: 1,
      description: 'SpaceTabs v1.4 release roadmap, PR reviews & launch assets',
      order: 2,
      createdAt: now - 6 * day,
      updatedAt: now - 5000,
      isArchived: false,
    },
    {
      id: 'space-api',
      name: 'API Architecture',
      icon: '⚙️',
      color: '#3b82f6',
      section: 'DEVELOPMENT',
      sectionOrder: 1,
      description: 'Edge workers, telemetry & schema migrations',
      order: 3,
      createdAt: now - 3 * day,
      updatedAt: now - 30000,
      isArchived: false,
    },
    {
      id: 'space-design',
      name: 'Brand & UI Kit',
      icon: '🎨',
      color: '#ec4899',
      section: 'DESIGN',
      sectionOrder: 2,
      description: 'Color palettes, motion tokens & Chrome Web Store graphics',
      order: 4,
      createdAt: now - 2 * day,
      updatedAt: now - 40000,
      isArchived: false,
    },
    {
      id: 'space-focus',
      name: 'Deep Work',
      icon: '⚡',
      color: '#f59e0b',
      section: 'PERSONAL',
      sectionOrder: 3,
      description: 'Daily planning, ambient focus playlists & reading list',
      order: 5,
      createdAt: now - day,
      updatedAt: now - 50000,
      isArchived: false,
    },
  ];

  const tabs = [
    // AI Research
    {
      id: 'tab-ai-1',
      spaceId: 'space-ai',
      title: 'Attention Is All You Need — arXiv',
      url: 'https://arxiv.org/abs/1706.03762',
      favIconUrl: favicon('arxiv.org'),
      order: 0,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'tab-ai-2',
      spaceId: 'space-ai',
      title: 'Hugging Face — Open Models & Datasets Hub',
      url: 'https://huggingface.co/models',
      favIconUrl: favicon('huggingface.co'),
      order: 1,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'tab-ai-3',
      spaceId: 'space-ai',
      title: 'PyTorch 2.6 — torch.compile Performance Guide',
      url: 'https://pytorch.org/docs/stable/index.html',
      favIconUrl: favicon('pytorch.org'),
      order: 2,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'tab-ai-4',
      spaceId: 'space-ai',
      title: 'Weights & Biases — Training Run Dashboard',
      url: 'https://wandb.ai/site',
      favIconUrl: favicon('wandb.ai'),
      order: 3,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'tab-ai-5',
      spaceId: 'space-ai',
      title: 'Papers With Code — State-of-the-Art Benchmarks',
      url: 'https://paperswithcode.com/',
      favIconUrl: favicon('paperswithcode.com'),
      order: 4,
      createdAt: now,
      updatedAt: now,
    },

    // Product Launch
    {
      id: 'tab-launch-1',
      spaceId: 'space-launch',
      title: 'React — Modern UI Library & Documentation',
      url: 'https://react.dev/',
      favIconUrl: favicon('react.dev'),
      order: 0,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'tab-launch-2',
      spaceId: 'space-launch',
      title: 'Figma — SpaceTabs Theme System & Launch Kit',
      url: 'https://www.figma.com/',
      favIconUrl: favicon('figma.com'),
      order: 1,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'tab-launch-3',
      spaceId: 'space-launch',
      title: 'WXT — Next-Gen Web Extension Framework',
      url: 'https://wxt.dev/',
      favIconUrl: favicon('wxt.dev'),
      order: 2,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'tab-launch-4',
      spaceId: 'space-launch',
      title: 'Linear — Plan and Build Products',
      url: 'https://linear.app/',
      favIconUrl: favicon('linear.app'),
      order: 3,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'tab-launch-5',
      spaceId: 'space-launch',
      title: 'Chrome Web Store — Extensions & Themes',
      url: 'https://chromewebstore.google.com/',
      favIconUrl: favicon('chromewebstore.google.com'),
      order: 4,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'tab-launch-6',
      spaceId: 'space-launch',
      title: 'Tailwind CSS — Rapidly Build Modern Websites',
      url: 'https://tailwindcss.com/',
      favIconUrl: favicon('tailwindcss.com'),
      order: 5,
      createdAt: now,
      updatedAt: now,
    },

    // System Design
    {
      id: 'tab-sys-1',
      spaceId: 'space-sys',
      title: 'Redis — In-Memory Data Structure Internals',
      url: 'https://redis.io/docs/latest/',
      favIconUrl: favicon('redis.io'),
      order: 0,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'tab-sys-2',
      spaceId: 'space-sys',
      title: 'Cloudflare Engineering Blog — Edge Architecture',
      url: 'https://blog.cloudflare.com/',
      favIconUrl: favicon('cloudflare.com'),
      order: 1,
      createdAt: now,
      updatedAt: now,
    },

    // API Architecture
    {
      id: 'tab-api-1',
      spaceId: 'space-api',
      title: 'PostgreSQL 17 Documentation — Query Planner',
      url: 'https://www.postgresql.org/docs/',
      favIconUrl: favicon('postgresql.org'),
      order: 0,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'tab-api-2',
      spaceId: 'space-api',
      title: 'OpenAPI 3.1 Specification Reference',
      url: 'https://swagger.io/specification/',
      favIconUrl: favicon('swagger.io'),
      order: 1,
      createdAt: now,
      updatedAt: now,
    },

    // Design
    {
      id: 'tab-des-1',
      spaceId: 'space-design',
      title: 'Tailwind CSS — Theme Variables & Color Palettes',
      url: 'https://tailwindcss.com/docs',
      favIconUrl: favicon('tailwindcss.com'),
      order: 0,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'tab-des-2',
      spaceId: 'space-design',
      title: 'Lucide Icons — Crisp Open-Source Icon Library',
      url: 'https://lucide.dev/icons/',
      favIconUrl: favicon('lucide.dev'),
      order: 1,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'tab-des-3',
      spaceId: 'space-design',
      title: 'Figma — SpaceTabs Color Tokens & Motion Guidelines',
      url: 'https://www.figma.com/',
      favIconUrl: favicon('figma.com'),
      order: 2,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'tab-des-4',
      spaceId: 'space-design',
      title: 'Radix UI — Accessible Primitives & Colors',
      url: 'https://www.radix-ui.com/',
      favIconUrl: favicon('radix-ui.com'),
      order: 3,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'tab-des-5',
      spaceId: 'space-design',
      title: 'Dribbble — Dark Cosmic Studio UI Inspiration',
      url: 'https://dribbble.com/',
      favIconUrl: favicon('dribbble.com'),
      order: 4,
      createdAt: now,
      updatedAt: now,
    },

    // Deep Work
    {
      id: 'tab-focus-1',
      spaceId: 'space-focus',
      title: 'Notion — Weekly Focus Plan & Deep Work Log',
      url: 'https://www.notion.so/',
      favIconUrl: favicon('notion.so'),
      order: 0,
      createdAt: now,
      updatedAt: now,
    },
  ];

  const resourceSections = [
    {
      id: 'res-sec-1',
      spaceId: 'space-launch',
      title: 'Core Launch Docs & Specs',
      order: 0,
      updatedAt: now,
    },
    {
      id: 'res-sec-2',
      spaceId: 'space-launch',
      title: 'Design System & Store Assets',
      order: 1,
      updatedAt: now,
    },
    {
      id: 'res-sec-ai',
      spaceId: 'space-ai',
      title: 'Reference Papers & Datasets',
      order: 0,
      updatedAt: now,
    },
  ];

  const resourceItems = [
    {
      id: 'res-item-1',
      sectionId: 'res-sec-1',
      title: 'SpaceTabs v1.4 Launch Spec & Architecture PRD',
      url: 'https://docs.google.com/document/d/spacetabs-prd',
      favIconUrl: favicon('docs.google.com'),
      type: 'doc',
      order: 0,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'res-item-2',
      sectionId: 'res-sec-1',
      title: 'Launch Metrics & Conversion Tracker Sheet',
      url: 'https://docs.google.com/spreadsheets/d/launch-metrics',
      favIconUrl: favicon('sheets.google.com'),
      type: 'sheet',
      order: 1,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'res-item-3',
      sectionId: 'res-sec-1',
      title: 'Chrome Web Store Submission & Review Guide',
      url: 'https://developer.chrome.com/docs/webstore',
      favIconUrl: favicon('developer.chrome.com'),
      type: 'link',
      order: 2,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'res-item-4',
      sectionId: 'res-sec-2',
      title: '14 Surface Palettes & Accent Tokens (Figma)',
      url: 'https://www.figma.com/file/spacetabs-palettes',
      favIconUrl: favicon('figma.com'),
      type: 'link',
      order: 0,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'res-item-5',
      sectionId: 'res-sec-2',
      title: 'GitHub Releases — Changelog & Distribution ZIP',
      url: 'https://github.com/abu-dojana/tab-manager/releases',
      favIconUrl: favicon('github.com'),
      type: 'link',
      order: 1,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'res-item-ai-1',
      sectionId: 'res-sec-ai',
      title: 'FlashAttention-3 Implementation Benchmarks',
      url: 'https://arxiv.org/abs/2407.08608',
      favIconUrl: favicon('arxiv.org'),
      type: 'link',
      order: 0,
      createdAt: now,
      updatedAt: now,
    },
  ];

  const notes = [
    {
      id: 'note-launch-1',
      spaceId: 'space-launch',
      title: '🚀 v1.4 Launch Playbook & Architecture',
      content: `# SpaceTabs v1.4 Launch Highlights

Local-first workspace & tab manager with **zero paywalls** and native Chromium memory savings.

## Key Shipped Features
- **14 Curated Palettes**: 7 Dark tones (Midnight OLED, Forest Dark, Purple Space) + 7 Light tones
- **Smart Memory Saver**: Cold-restores dormant tabs with \`chrome.tabs.discard()\`
- **Private Google Drive Sync**: Direct \`drive.file\` REST API — zero middleman servers

## Launch Checklist
- [x] Finalize Manifest V3 bundle & audit permissions
- [x] Verify tombstone-aware Google Drive merge
- [ ] Publish promo video to Chrome Web Store`,
      createdAt: now - day,
      updatedAt: now - 1000,
    },
    {
      id: 'note-launch-2',
      spaceId: 'space-launch',
      title: 'Marketing Copy & Taglines',
      content: `## Hero Copy\n\n> Local-first, unlimited workspaces for Chromium browsers.\n\n- **Zero subscriptions**\n- **Instant space switching**`,
      createdAt: now - 2 * day,
      updatedAt: now - 50000,
    },
    {
      id: 'note-ai-1',
      spaceId: 'space-ai',
      title: 'Sparse Attention Notes',
      content: `# KV Cache Compression\n\n- Sliding window attention reduces memory from $O(N^2)$ to $O(N \\cdot W)$.\n- Grouped-query attention cuts KV bandwidth by 4x.`,
      createdAt: now - day,
      updatedAt: now - 20000,
    },
  ];

  const tasks = [
    {
      id: 'task-launch-1',
      spaceId: 'space-launch',
      text: 'Finalize 14 Dark & Light surface palettes',
      completed: true,
      order: 0,
      dueDate: now - day,
      createdAt: now - 3 * day,
      updatedAt: now - day,
    },
    {
      id: 'task-launch-2',
      spaceId: 'space-launch',
      text: 'Verify zero-loss Chromium native tab discarding',
      completed: true,
      order: 1,
      dueDate: now,
      createdAt: now - 2 * day,
      updatedAt: now - 3600000,
    },
    {
      id: 'task-launch-3',
      spaceId: 'space-launch',
      text: 'Test bi-directional Google Drive sync across devices',
      completed: true,
      order: 2,
      dueDate: now,
      createdAt: now - 2 * day,
      updatedAt: now - 1800000,
    },
    {
      id: 'task-launch-4',
      spaceId: 'space-launch',
      text: 'Record & publish SpaceTabs launch promo video',
      completed: false,
      order: 3,
      dueDate: now + day,
      createdAt: now - day,
      updatedAt: now,
    },
    {
      id: 'task-launch-5',
      spaceId: 'space-launch',
      text: 'Update Chrome Web Store listing screenshots & changelog',
      completed: false,
      order: 4,
      dueDate: now + 2 * day,
      createdAt: now - day,
      updatedAt: now,
    },
    {
      id: 'task-launch-6',
      spaceId: 'space-launch',
      text: 'Announce v1.4 release on Product Hunt & GitHub',
      completed: false,
      order: 5,
      dueDate: now + 3 * day,
      createdAt: now - day,
      updatedAt: now,
    },
  ];

  const defaultSettings = {
    autoSuspendEnabled: true,
    idleThresholdMinutes: 15,
    defaultOpenInNewWindow: false,
    discardOnSpaceSwitch: true,
    showTabFavicons: true,
    sidebarTheme: 'dark',
    dashboardTheme: 'dark',
    accentColor: '#10b981',
    darkPalette: 'forest',
    lightPalette: 'sakura',
    sidebarWidth: 268,
    rightFloatingPanel: false,
    rightPanelWidth: 240,
    showSectionActiveDot: true,
    patreonUrl: 'https://www.patreon.com/abudojana',
  };

  const mockDriveProfile = {
    id: 'demo-user-01',
    email: 'alex.chen@gmail.com',
    name: 'Alex Chen',
    connectedAt: now - 7 * day,
  };

  const mockDriveSettings = {
    enabled: true,
    autoSync: true,
    syncIntervalMinutes: 15,
    syncOnStartup: true,
  };

  const mockDriveMeta = {
    lastSyncTime: now - 42000,
    folderId: '1SpaceTabsDemoFolderId',
    fileId: '1SpaceTabsDemoDataJsonId',
    folderUrl: 'https://drive.google.com/drive/folders/1SpaceTabsDemoFolderId',
    lastError: null,
  };

  return {
    spaces,
    tabs,
    resourceSections,
    resourceItems,
    notes,
    tasks,
    defaultSettings,
    mockDriveProfile,
    mockDriveSettings,
    mockDriveMeta,
  };
}

async function getExtensionId(context) {
  let sw = context.serviceWorkers()[0];
  if (!sw) {
    sw = await context.waitForEvent('serviceworker', { timeout: 15000 });
  }
  const url = sw.url();
  const match = url.match(/chrome-extension:\/\/([^/]+)/);
  if (!match) throw new Error(`Could not extract extension ID from ${url}`);
  return match[1];
}

async function seedDatabaseAndStorage(page, seed) {
  await page.evaluate(async (data) => {
    // 1. Seed chrome.storage.local (settings + demo connected Drive status)
    await chrome.storage.local.set({
      spacetabs_user_settings: data.defaultSettings,
      spacetabs_google_profile: data.mockDriveProfile,
      spacetabs_sync_settings: data.mockDriveSettings,
      spacetabs_sync_meta: data.mockDriveMeta,
    });

    // 2. Seed IndexedDB TabManagerDB cleanly
    await new Promise((resolve, reject) => {
      const req = indexedDB.open('TabManagerDB');
      req.onerror = () => reject(req.error);
      req.onsuccess = () => {
        const db = req.result;
        const storeNames = ['spaces', 'tabs', 'resourceSections', 'resourceItems', 'notes', 'tasks'];
        const tx = db.transaction(storeNames, 'readwrite');
        tx.onerror = () => reject(tx.error);
        tx.oncomplete = () => {
          db.close();
          resolve(true);
        };
        for (const name of storeNames) {
          const store = tx.objectStore(name);
          store.clear();
          for (const item of data[name]) {
            store.put(item);
          }
        }
      };
    });

    // 3. Bind active window to space-ai
    const win = await chrome.windows.getCurrent();
    if (win?.id) {
      await chrome.storage.session.set({
        [`window_${win.id}_space`]: 'space-ai',
      });
    }
  }, seed);
}

async function applyThemeAndReload(page, partialSettings, activeSpaceId = 'space-launch') {
  await page.evaluate(
    async ({ partial, spaceId }) => {
      const res = await chrome.storage.local.get('spacetabs_user_settings');
      const merged = { ...(res.spacetabs_user_settings || {}), ...partial };
      await chrome.storage.local.set({ spacetabs_user_settings: merged });
      const win = await chrome.windows.getCurrent();
      if (win?.id && spaceId) {
        await chrome.storage.session.set({ [`window_${win.id}_space`]: spaceId });
      }
    },
    { partial: partialSettings, spaceId: activeSpaceId }
  );
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(450);
}

// Inject sleek Screen-Studio-style synthetic cursor + click ripples for live video captures
async function installDemoCursor(page) {
  await page.evaluate(() => {
    if (document.getElementById('spacetabs-demo-cursor')) return;
    const style = document.createElement('style');
    style.id = 'spacetabs-demo-cursor-style';
    style.textContent = `
      #spacetabs-demo-cursor {
        position: fixed;
        top: 0;
        left: 0;
        width: 26px;
        height: 26px;
        pointer-events: none;
        z-index: 999999;
        transform: translate3d(-100px, -100px, 0);
        transition: opacity 0.2s ease;
        filter: drop-shadow(0 4px 10px rgba(0,0,0,0.65));
      }
      .spacetabs-demo-ripple {
        position: fixed;
        width: 34px;
        height: 34px;
        margin-left: -17px;
        margin-top: -17px;
        border-radius: 9999px;
        border: 2.5px solid rgba(244, 63, 94, 0.9);
        background: rgba(244, 63, 94, 0.2);
        pointer-events: none;
        z-index: 999998;
        animation: stRipple 0.45s cubic-bezier(0.22, 1, 0.36, 1) forwards;
      }
      @keyframes stRipple {
        0% { transform: scale(0.35); opacity: 0.95; }
        100% { transform: scale(1.65); opacity: 0; }
      }
    `;
    document.head.appendChild(style);

    const cursor = document.createElement('div');
    cursor.id = 'spacetabs-demo-cursor';
    cursor.innerHTML = `<svg width="26" height="26" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M5.5 3.5L22.5 14.2L14.4 15.8L10.6 23.2L5.5 3.5Z" fill="#FFFFFF" stroke="#0F172A" stroke-width="2" stroke-linejoin="round"/>
    </svg>`;
    document.body.appendChild(cursor);

    window.__demoCursorPos = { x: 720, y: 405 };
    cursor.style.transform = 'translate3d(720px, 405px, 0)';
  });
}

async function moveAndClick(page, locator, { durationMs = 420, pauseAfter = 350, click = true, offset = { x: 0, y: 0 } } = {}) {
  await locator.scrollIntoViewIfNeeded().catch(() => {});
  const box = await locator.boundingBox();
  if (!box) throw new Error('Target element not visible for moveAndClick');
  const tx = box.x + box.width / 2 + offset.x;
  const ty = box.y + box.height / 2 + offset.y;

  const steps = Math.max(12, Math.round(durationMs / 16));
  const start = await page.evaluate(() => window.__demoCursorPos || { x: 720, y: 405 });
  const cx = (start.x + tx) / 2 + (ty - start.y) * 0.08;
  const cy = (start.y + ty) / 2 - (tx - start.x) * 0.08;

  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    // Ease in-out cubic
    const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    const x = (1 - e) * (1 - e) * start.x + 2 * (1 - e) * e * cx + e * e * tx;
    const y = (1 - e) * (1 - e) * start.y + 2 * (1 - e) * e * cy + e * e * ty;
    await page.mouse.move(x, y);
    await page.evaluate(
      ({ px, py }) => {
        window.__demoCursorPos = { x: px, y: py };
        const el = document.getElementById('spacetabs-demo-cursor');
        if (el) el.style.transform = `translate3d(${px}px, ${py}px, 0)`;
      },
      { px: x, py: y }
    );
    await page.waitForTimeout(16);
  }

  if (click) {
    await page.evaluate(
      ({ px, py }) => {
        const rip = document.createElement('div');
        rip.className = 'spacetabs-demo-ripple';
        rip.style.left = `${px}px`;
        rip.style.top = `${py}px`;
        document.body.appendChild(rip);
        setTimeout(() => rip.remove(), 500);
      },
      { px: tx, py: ty }
    );
    await page.mouse.click(tx, ty);
  }
  if (pauseAfter > 0) await page.waitForTimeout(pauseAfter);
}

function transcodeToMp4(ffmpeg, inputWebm, outputMp4, trimStartSec = 0.0, maxDurationSec = null) {
  const args = ['-y'];
  if (trimStartSec > 0) {
    args.push('-ss', trimStartSec.toFixed(2));
  }
  args.push('-i', inputWebm);
  if (maxDurationSec) {
    args.push('-t', maxDurationSec.toFixed(2));
  }
  args.push(
    '-c:v', 'libx264',
    '-preset', 'medium',
    '-crf', '16',
    '-pix_fmt', 'yuv420p',
    '-r', '30',
    '-g', '15',
    '-an',
    outputMp4
  );
  execFileSync(ffmpeg, args, { stdio: 'pipe' });
}

async function main() {
  const ffmpeg = findFfmpeg();
  console.log('Using FFmpeg:', ffmpeg);

  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'spacetabs-promo-'));
  console.log('Temporary Chrome profile:', userDataDir);

  const seed = buildSeedData();

  try {
    // =========================================================================
    // PHASE 1: Seed + Capture Ultra-Sharp 2x Retina Theme & Settings Screenshots
    // =========================================================================
    console.log('\n--- PHASE 1: Seeding & 2x Retina Screenshots ---');
    const shotCtx = await chromium.launchPersistentContext(userDataDir, {
      channel: 'chromium',
      headless: true,
      viewport: { width: 1440, height: 810 },
      deviceScaleFactor: 2,
      args: [
        `--disable-extensions-except=${EXT_PATH}`,
        `--load-extension=${EXT_PATH}`,
        '--no-first-run',
        '--no-default-browser-check',
      ],
    });

    const extId = await getExtensionId(shotCtx);
    const dashboardUrl = `chrome-extension://${extId}/dashboard.html`;
    console.log('Extension loaded! ID:', extId);

    const page = await shotCtx.newPage();
    await page.goto(dashboardUrl, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);

    // Seed IndexedDB + chrome.storage
    await seedDatabaseAndStorage(page, seed);
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(900);

    // Capture 6 distinct Full-Dashboard Themes from Appearance!
    const themesToShot = [
      {
        file: 'theme-forest-emerald.png',
        space: 'space-ai',
        settings: { sidebarTheme: 'dark', dashboardTheme: 'dark', darkPalette: 'forest', accentColor: '#10b981' },
      },
      {
        file: 'theme-purple-space.png',
        space: 'space-launch',
        settings: { sidebarTheme: 'dark', dashboardTheme: 'dark', darkPalette: 'purplespace', accentColor: '#8b5cf6' },
      },
      {
        file: 'theme-midnight-oled.png',
        space: 'space-launch',
        settings: { sidebarTheme: 'dark', dashboardTheme: 'dark', darkPalette: 'midnight', accentColor: '#06b6d4' },
      },
      {
        file: 'theme-split-indigo.png',
        space: 'space-launch',
        settings: { sidebarTheme: 'dark', dashboardTheme: 'light', darkPalette: 'indigo', lightPalette: 'snow', accentColor: '#6366f1' },
      },
      {
        file: 'theme-sakura-rose.png',
        space: 'space-design',
        settings: { sidebarTheme: 'light', dashboardTheme: 'light', lightPalette: 'sakura', accentColor: '#f43f5e' },
      },
      {
        file: 'theme-fresh-mint.png',
        space: 'space-launch',
        settings: { sidebarTheme: 'light', dashboardTheme: 'light', lightPalette: 'mint', accentColor: '#10b981' },
      },
    ];

    for (const t of themesToShot) {
      console.log(`Capturing ${t.file}...`);
      await applyThemeAndReload(page, t.settings, t.space);
      await page.waitForTimeout(500);
      await page.screenshot({ path: path.join(SHOTS_DIR, t.file) });
    }

    // Capture Settings -> Memory Saver & Google Drive Sync (in sleek Space Indigo + Ocean Cyan theme)
    console.log('Capturing settings-memory-saver.png & settings-drive-sync.png...');
    await applyThemeAndReload(
      page,
      { sidebarTheme: 'dark', dashboardTheme: 'dark', darkPalette: 'indigo', accentColor: '#06b6d4' },
      'space-launch'
    );
    await page.getByRole('button', { name: 'Settings' }).click();
    await page.waitForTimeout(350);

    await page.getByRole('button', { name: 'Memory Saver' }).click();
    await page.waitForTimeout(350);
    await page.screenshot({ path: path.join(SHOTS_DIR, 'settings-memory-saver.png') });

    await page.getByRole('button', { name: 'Google Drive Sync' }).click();
    await page.waitForTimeout(350);
    await page.screenshot({ path: path.join(SHOTS_DIR, 'settings-drive-sync.png') });

    // Restore initial Forest Dark + Emerald theme on space-ai before live video recordings
    await applyThemeAndReload(
      page,
      { sidebarTheme: 'dark', dashboardTheme: 'dark', darkPalette: 'forest', accentColor: '#10b981' },
      'space-ai'
    );
    await shotCtx.close();

    // =========================================================================
    // PHASE 2: Record Live Interactive Video Clips (1440x810 @ 16:9)
    // =========================================================================
    const tempDirs = [userDataDir];

    const recordClip = async (clipName, setupFn, actionFn) => {
      console.log(`\n--- Recording live clip: ${clipName} ---`);
      const clipProfile = fs.mkdtempSync(path.join(os.tmpdir(), `spacetabs-${clipName}-`));
      tempDirs.push(clipProfile);

      const recCtx = await chromium.launchPersistentContext(clipProfile, {
        channel: 'chromium',
        headless: true,
        viewport: { width: 1440, height: 810 },
        recordVideo: { dir: RAW_DIR, size: { width: 1440, height: 810 } },
        args: [
          `--disable-extensions-except=${EXT_PATH}`,
          `--load-extension=${EXT_PATH}`,
          '--no-first-run',
          '--no-default-browser-check',
        ],
      });

      let rawWebm;
      let elapsedSec = 5;
      try {
        const id = await getExtensionId(recCtx);
        const recPage = await recCtx.newPage();
        await recPage.goto(`chrome-extension://${id}/dashboard.html`, { waitUntil: 'networkidle' });
        await recPage.waitForTimeout(600);
        await seedDatabaseAndStorage(recPage, seed);

        if (setupFn) {
          await setupFn(recPage);
        } else {
          await recPage.reload({ waitUntil: 'networkidle' });
          await recPage.waitForTimeout(450);
        }

        await installDemoCursor(recPage);
        const tStart = Date.now();
        await actionFn(recPage);
        elapsedSec = (Date.now() - tStart) / 1000;
        console.log(`Action duration for ${clipName}: ${elapsedSec.toFixed(2)}s`);

        const video = recPage.video();
        await recPage.close();
        rawWebm = path.join(RAW_DIR, `${clipName}.webm`);
        await video.saveAs(rawWebm);
      } finally {
        await recCtx.close().catch(() => {});
      }

      const outMp4 = path.join(FOOTAGE_DIR, `${clipName}.mp4`);
      let totalDur = elapsedSec + 1.0;
      try {
        execFileSync(ffmpeg, ['-i', rawWebm], { stdio: 'pipe' });
      } catch (err) {
        const stderr = err.stderr ? err.stderr.toString() : '';
        const m = stderr.match(/Duration:\s+(\d+):(\d+):(\d+\.\d+)/);
        if (m) {
          totalDur = Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]);
        }
      }
      const trimStart = Math.max(0, totalDur - elapsedSec - 0.12);
      console.log(`Transcoding ${clipName} (total=${totalDur.toFixed(2)}s, trimStart=${trimStart.toFixed(2)}s) -> ${outMp4}`);
      transcodeToMp4(ffmpeg, rawWebm, outMp4, trimStart);
    };

    // CLIP 1: Spaces Switching + Batch Selection + Instant Global Cross-Space Search (~7.8s)
    await recordClip(
      'clip-spaces',
      async (p) => {
        await applyThemeAndReload(
          p,
          { sidebarTheme: 'dark', dashboardTheme: 'dark', darkPalette: 'forest', accentColor: '#10b981' },
          'space-ai'
        );
      },
      async (p) => {
        await p.waitForTimeout(650);
        // Click "Product Launch" in sidebar -> live space switch!
        await moveAndClick(p, p.locator('aside').getByText('Product Launch').first(), {
          durationMs: 550,
          pauseAfter: 900,
        });

        // Select two tab checkboxes to trigger Batch Action Bar
        const tabCheckboxes = p.locator('.tab-manager-card input[type="checkbox"]');
        await moveAndClick(p, tabCheckboxes.nth(1), { durationMs: 380, pauseAfter: 250 });
        await moveAndClick(p, tabCheckboxes.nth(2), { durationMs: 320, pauseAfter: 900 });

        // Uncheck them via master or click search directly
        const searchInput = p.getByPlaceholder('Search tabs, notes, tasks, resources...');
        await moveAndClick(p, searchInput, { durationMs: 420, pauseAfter: 180 });
        await p.keyboard.type('launch', { delay: 75 });
        await p.waitForTimeout(1600);
      }
    );

    // CLIP 2: Resources Hub -> Markdown Notes Split Editor -> Live Tasks Progress (~8.6s)
    await recordClip(
      'clip-workspace',
      async (p) => {
        await applyThemeAndReload(
          p,
          { sidebarTheme: 'dark', dashboardTheme: 'dark', darkPalette: 'indigo', accentColor: '#8b5cf6' },
          'space-launch'
        );
      },
      async (p) => {
        await p.waitForTimeout(450);
        // 1. Click Resources tab
        await moveAndClick(p, p.locator('header nav').getByRole('button', { name: 'Resources' }), {
          durationMs: 420,
          pauseAfter: 1350,
        });

        // 2. Click Notes tab -> switch to Split view -> type a live Markdown line
        await moveAndClick(p, p.locator('header nav').getByRole('button', { name: 'Notes' }), {
          durationMs: 380,
          pauseAfter: 550,
        });
        await moveAndClick(p, p.getByRole('button', { name: 'Split', exact: true }), {
          durationMs: 360,
          pauseAfter: 450,
        });
        const editor = p.locator('textarea').first();
        await moveAndClick(p, editor, { durationMs: 320, pauseAfter: 120 });
        await p.keyboard.press('End');
        await p.keyboard.press('Control+End');
        await p.keyboard.type('\n- [x] **100% Free & Local-First**', { delay: 32 });
        await p.waitForTimeout(1000);

        // 3. Click Tasks tab -> check off 2 tasks live and watch progress bar jump!
        await moveAndClick(p, p.locator('header nav').getByRole('button', { name: 'Tasks' }), {
          durationMs: 380,
          pauseAfter: 500,
        });
        const incompleteBtns = p.locator('button[title="Mark complete"]');
        await moveAndClick(p, incompleteBtns.first(), { durationMs: 360, pauseAfter: 450 });
        await moveAndClick(p, incompleteBtns.first(), { durationMs: 340, pauseAfter: 1100 });
      }
    );

    // CLIP 3: Appearance Settings & Live Multi-Theme Switching (~8.5s)
    await recordClip(
      'clip-appearance',
      async (p) => {
        await applyThemeAndReload(
          p,
          { sidebarTheme: 'dark', dashboardTheme: 'dark', darkPalette: 'forest', accentColor: '#10b981' },
          'space-launch'
        );
        // Pre-open Settings -> Appearance so the clip starts cleanly on Appearance!
        await p.getByRole('button', { name: 'Settings' }).click();
        await p.waitForTimeout(200);
        await p.getByRole('button', { name: 'Appearance' }).click();
        await p.waitForTimeout(350);
      },
      async (p) => {
        await p.waitForTimeout(450);

        // Scroll Appearance right pane down smoothly so Accent Color, Dark Mode Palettes & Light Mode Palettes are all visible!
        const scrollPane = p.locator('.fixed.inset-0 .overflow-y-auto').first();
        await scrollPane.evaluate((el) => {
          el.scrollTo({ top: 760, behavior: 'smooth' });
        });
        await p.waitForTimeout(650);

        // 1. Click Violet Purple accent + Purple Space dark palette
        await moveAndClick(p, p.getByRole('button', { name: 'Violet Purple' }), {
          durationMs: 380,
          pauseAfter: 250,
        });
        await moveAndClick(p, p.getByText('Purple Space', { exact: true }), {
          durationMs: 380,
          pauseAfter: 750,
        });

        // 2. Click Ocean Cyan accent + Midnight OLED palette
        await moveAndClick(p, p.getByRole('button', { name: 'Ocean Cyan' }), {
          durationMs: 340,
          pauseAfter: 200,
        });
        await moveAndClick(p, p.getByText('Midnight OLED', { exact: true }), {
          durationMs: 340,
          pauseAfter: 700,
        });

        // 3. Scroll slightly further to show Light Mode Palettes clearly, switch to All Light -> Sakura Blossom + Crimson Rose!
        await scrollPane.evaluate((el) => {
          el.scrollTo({ top: 1160, behavior: 'smooth' });
        });
        await p.waitForTimeout(450);
        // Switch dashboard + sidebar to light via quick click on Light Mode palette after scrolling, or set All Light!
        // Let's scroll up briefly? Even cleaner: click Light Dashboard or Quick Style Preset "All Light" OR scroll up?
        // Wait: if we click "Sakura Blossom" while still in dark mode, lightPalette changes in background until dashboardTheme='light'!
        // So let's scroll up to Quick Style Presets? Actually let's scroll smoothly to top -> click "All Light" -> scroll down to Light Mode Tone & Palette -> click Sakura Blossom -> Fresh Mint -> Purple Serenity!
        await scrollPane.evaluate((el) => {
          el.scrollTo({ top: 0, behavior: 'smooth' });
        });
        await p.waitForTimeout(420);
        await moveAndClick(p, p.getByRole('button', { name: 'All Light' }), {
          durationMs: 340,
          pauseAfter: 350,
        });
        await scrollPane.evaluate((el) => {
          el.scrollTo({ top: 1080, behavior: 'smooth' });
        });
        await p.waitForTimeout(450);
        await moveAndClick(p, p.getByText('Sakura Blossom', { exact: true }).last(), {
          durationMs: 340,
          pauseAfter: 650,
        });
        await moveAndClick(p, p.getByText('Fresh Mint', { exact: true }), {
          durationMs: 320,
          pauseAfter: 650,
        });
        await moveAndClick(p, p.getByText('Purple Serenity', { exact: true }), {
          durationMs: 320,
          pauseAfter: 700,
        });
      }
    );

    console.log('\nAll screenshots & live extension video clips captured successfully!');
  } finally {
    try {
      fs.rmSync(RAW_DIR, { recursive: true, force: true });
    } catch {}
    try {
      fs.rmSync(userDataDir, { recursive: true, force: true });
    } catch {}
  }
}

main().catch((err) => {
  console.error('Capture failed:', err);
  process.exit(1);
});
