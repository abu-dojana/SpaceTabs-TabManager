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
const RAW_DIR = path.resolve(ROOT, '.raw-additions');

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

function buildSeedData({ includeDuplicates = false, includeLegacySpace = false } = {}) {
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
    ...(includeLegacySpace
      ? [
          {
            id: 'space-legacy',
            name: 'Legacy Sprint v1',
            icon: '🧪',
            color: '#64748b',
            section: 'DEVELOPMENT',
            sectionOrder: 1,
            description: 'Old Q2 prototype ready to archive',
            order: 4,
            createdAt: now - 14 * day,
            updatedAt: now - 5 * day,
            isArchived: false,
          },
        ]
      : []),
    {
      id: 'space-design',
      name: 'Brand & UI Kit',
      icon: '🎨',
      color: '#ec4899',
      section: 'DESIGN',
      sectionOrder: 2,
      description: 'Color palettes, motion tokens & Chrome Web Store graphics',
      order: 5,
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
      order: 6,
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
    ...(includeDuplicates
      ? [
          {
            id: 'tab-launch-dup1',
            spaceId: 'space-launch',
            title: 'React — Modern UI Library & Documentation',
            url: 'https://react.dev/',
            favIconUrl: favicon('react.dev'),
            order: 2,
            createdAt: now,
            updatedAt: now,
          },
          {
            id: 'tab-launch-dup2',
            spaceId: 'space-launch',
            title: 'Figma — SpaceTabs Theme System & Launch Kit',
            url: 'https://www.figma.com/',
            favIconUrl: favicon('figma.com'),
            order: 3,
            createdAt: now,
            updatedAt: now,
          },
        ]
      : []),
    {
      id: 'tab-launch-3',
      spaceId: 'space-launch',
      title: 'WXT — Next-Gen Web Extension Framework',
      url: 'https://wxt.dev/',
      favIconUrl: favicon('wxt.dev'),
      order: 4,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'tab-launch-4',
      spaceId: 'space-launch',
      title: 'Linear — Plan and Build Products',
      url: 'https://linear.app/',
      favIconUrl: favicon('linear.app'),
      order: 5,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'tab-launch-5',
      spaceId: 'space-launch',
      title: 'Tailwind CSS — Theme Variables & Color Palettes',
      url: 'https://tailwindcss.com/',
      favIconUrl: favicon('tailwindcss.com'),
      order: 6,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'tab-launch-6',
      spaceId: 'space-launch',
      title: 'Chrome Web Store — Extensions & Themes',
      url: 'https://chromewebstore.google.com/',
      favIconUrl: favicon('chromewebstore.google.com'),
      order: 7,
      createdAt: now,
      updatedAt: now,
    },

    // Design
    {
      id: 'tab-des-1',
      spaceId: 'space-design',
      title: 'Lucide Icons — Crisp Open-Source Icon Library',
      url: 'https://lucide.dev/icons/',
      favIconUrl: favicon('lucide.dev'),
      order: 0,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'tab-des-2',
      spaceId: 'space-design',
      title: 'Radix UI — Accessible Primitives & Colors',
      url: 'https://www.radix-ui.com/',
      favIconUrl: favicon('radix-ui.com'),
      order: 1,
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
  ];

  const defaultSettings = {
    autoSuspendEnabled: true,
    idleThresholdMinutes: 15,
    defaultOpenInNewWindow: false,
    discardOnSpaceSwitch: true,
    showTabFavicons: true,
    sidebarTheme: 'dark',
    dashboardTheme: 'dark',
    accentColor: '#6366f1',
    darkPalette: 'indigo',
    lightPalette: 'sakura',
    sidebarWidth: 268,
    rightFloatingPanel: false,
    rightPanelWidth: 268,
    showSectionActiveDot: true,
    patreonUrl: 'https://www.patreon.com/abudojana',
  };

  return {
    spaces,
    tabs,
    resourceSections: [],
    resourceItems: [],
    notes: [],
    tasks: [],
    defaultSettings,
    mockDriveProfile: {
      id: 'demo-user-01',
      email: 'alex.chen@gmail.com',
      name: 'Alex Chen',
      connectedAt: now - 7 * day,
    },
    mockDriveSettings: {
      enabled: true,
      autoSync: true,
      syncIntervalMinutes: 15,
      syncOnStartup: true,
    },
    mockDriveMeta: {
      lastSyncTime: now - 42000,
      folderId: '1SpaceTabsDemoFolderId',
      fileId: '1SpaceTabsDemoDataJsonId',
      folderUrl: 'https://drive.google.com/drive/folders/1SpaceTabsDemoFolderId',
      lastError: null,
    },
  };
}

async function getExtensionId(context) {
  let sw = context.serviceWorkers()[0];
  if (!sw) {
    sw = await context.waitForEvent('serviceworker', { timeout: 15000 });
  }
  const match = sw.url().match(/chrome-extension:\/\/([^/]+)/);
  if (!match) throw new Error(`Could not extract extension ID from ${sw.url()}`);
  return match[1];
}

async function seedAll(page, seed, activeSpaceId = 'space-launch') {
  await page.evaluate(
    async ({ data, spaceId }) => {
      await chrome.storage.local.set({
        spacetabs_user_settings: data.defaultSettings,
        spacetabs_google_profile: data.mockDriveProfile,
        spacetabs_sync_settings: data.mockDriveSettings,
        spacetabs_sync_meta: data.mockDriveMeta,
      });

      await new Promise((resolve, reject) => {
        const req = indexedDB.open('TabManagerDB');
        req.onerror = () => reject(req.error);
        req.onsuccess = () => {
          const db = req.result;
          const stores = ['spaces', 'tabs', 'resourceSections', 'resourceItems', 'notes', 'tasks'];
          const tx = db.transaction(stores, 'readwrite');
          tx.onerror = () => reject(tx.error);
          tx.oncomplete = () => {
            db.close();
            resolve(true);
          };
          for (const name of stores) {
            const store = tx.objectStore(name);
            store.clear();
            for (const item of data[name]) store.put(item);
          }
        };
      });

      const win = await chrome.windows.getCurrent();
      if (win?.id) {
        await chrome.storage.session.set({ [`window_${win.id}_space`]: spaceId });
      }
    },
    { data: seed, spaceId: activeSpaceId }
  );
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(550);
}

async function installDemoCursor(page) {
  await page.evaluate(() => {
    if (document.getElementById('spacetabs-demo-cursor')) return;
    const style = document.createElement('style');
    style.textContent = `
      #spacetabs-demo-cursor {
        position: fixed; top: 0; left: 0; width: 26px; height: 26px;
        pointer-events: none; z-index: 999999;
        transform: translate3d(720px, 405px, 0);
        filter: drop-shadow(0 4px 10px rgba(0,0,0,0.65));
      }
      #spacetabs-drag-ghost {
        position: fixed; top: 0; left: 0;
        pointer-events: none; z-index: 999997;
        display: none; align-items: center; gap: 8px;
        padding: 8px 14px; border-radius: 10px;
        background: rgba(15, 23, 42, 0.96);
        border: 1.5px solid #38bdf8;
        box-shadow: 0 18px 42px rgba(0,0,0,0.65), 0 0 24px rgba(56,189,248,0.45);
        color: #f8fafc; font-size: 12px; font-weight: 700;
        font-family: Inter, system-ui, sans-serif;
        white-space: nowrap;
      }
      .spacetabs-demo-ripple {
        position: fixed; width: 34px; height: 34px; margin-left: -17px; margin-top: -17px;
        border-radius: 9999px; border: 2.5px solid rgba(244, 63, 94, 0.92);
        background: rgba(244, 63, 94, 0.22); pointer-events: none; z-index: 999998;
        animation: stRipple 0.45s cubic-bezier(0.22, 1, 0.36, 1) forwards;
      }
      @keyframes stRipple {
        0% { transform: scale(0.35); opacity: 0.95; }
        100% { transform: scale(1.65); opacity: 0; }
      }
    `;
    document.head.appendChild(style);

    const ghost = document.createElement('div');
    ghost.id = 'spacetabs-drag-ghost';
    document.body.appendChild(ghost);

    const cursor = document.createElement('div');
    cursor.id = 'spacetabs-demo-cursor';
    cursor.innerHTML = `<svg width="26" height="26" viewBox="0 0 28 28" fill="none">
      <path d="M5.5 3.5L22.5 14.2L14.4 15.8L10.6 23.2L5.5 3.5Z" fill="#FFFFFF" stroke="#0F172A" stroke-width="2" stroke-linejoin="round"/>
    </svg>`;
    document.body.appendChild(cursor);
    window.__demoCursorPos = { x: 720, y: 405 };
  });
}

async function moveCursorTo(page, tx, ty, durationMs = 400, ghostLabel = null) {
  const steps = Math.max(12, Math.round(durationMs / 16));
  const start = await page.evaluate(() => window.__demoCursorPos || { x: 720, y: 405 });
  const cx = (start.x + tx) / 2 + (ty - start.y) * 0.08;
  const cy = (start.y + ty) / 2 - (tx - start.x) * 0.08;

  if (ghostLabel) {
    await page.evaluate((label) => {
      const g = document.getElementById('spacetabs-drag-ghost');
      if (g) {
        g.textContent = label;
        g.style.display = 'flex';
      }
    }, ghostLabel);
  }

  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    const x = (1 - e) * (1 - e) * start.x + 2 * (1 - e) * e * cx + e * e * tx;
    const y = (1 - e) * (1 - e) * start.y + 2 * (1 - e) * e * cy + e * e * ty;
    await page.mouse.move(x, y);
    await page.evaluate(
      ({ px, py, hasGhost }) => {
        window.__demoCursorPos = { x: px, y: py };
        const el = document.getElementById('spacetabs-demo-cursor');
        if (el) el.style.transform = `translate3d(${px}px, ${py}px, 0)`;
        if (hasGhost) {
          const g = document.getElementById('spacetabs-drag-ghost');
          if (g) g.style.transform = `translate3d(${px + 18}px, ${py - 12}px, 0)`;
        }
      },
      { px: x, py: y, hasGhost: Boolean(ghostLabel) }
    );
    await page.waitForTimeout(16);
  }
}

async function moveAndClick(page, locator, { durationMs = 380, pauseAfter = 350, click = true } = {}) {
  await locator.scrollIntoViewIfNeeded().catch(() => {});
  const box = await locator.boundingBox();
  if (!box) throw new Error('Target element not visible for moveAndClick');
  const tx = box.x + box.width / 2;
  const ty = box.y + box.height / 2;
  await moveCursorTo(page, tx, ty, durationMs);
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

function transcodeToMp4(ffmpeg, inputWebm, outputMp4, trimStartSec = 0) {
  const args = ['-y'];
  if (trimStartSec > 0) args.push('-ss', trimStartSec.toFixed(2));
  args.push(
    '-i', inputWebm,
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

  // ===========================================================================
  // 1. 2x Retina Screenshots: Support Creator (Donations) + Real Multi-Window!
  // ===========================================================================
  console.log('\n--- PHASE A: Support Creator & Multi-Window 2x Retina Screenshots ---');
  const shotProfile = fs.mkdtempSync(path.join(os.tmpdir(), 'spacetabs-add-shots-'));
  const shotCtx = await chromium.launchPersistentContext(shotProfile, {
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

  try {
    const extId = await getExtensionId(shotCtx);
    const dashboardUrl = `chrome-extension://${extId}/dashboard.html`;
    const page1 = await shotCtx.newPage();
    await page1.goto(dashboardUrl, { waitUntil: 'networkidle' });
    await page1.waitForTimeout(600);

    const seed = buildSeedData();
    await seedAll(page1, seed, 'space-launch');

    // A1: Support Creator / Donation panel (Rose accent + Space Indigo backdrop!)
    console.log('Capturing settings-support-creator.png...');
    await page1.evaluate(async () => {
      const res = await chrome.storage.local.get('spacetabs_user_settings');
      await chrome.storage.local.set({
        spacetabs_user_settings: {
          ...res.spacetabs_user_settings,
          sidebarTheme: 'dark',
          dashboardTheme: 'dark',
          darkPalette: 'indigo',
          accentColor: '#f43f5e',
        },
      });
    });
    await page1.reload({ waitUntil: 'networkidle' });
    await page1.waitForTimeout(400);
    await page1.locator('aside').getByText('Support Creator').click();
    await page1.waitForTimeout(550);
    await page1.screenshot({ path: path.join(SHOTS_DIR, 'settings-support-creator.png') });

    // Close modal for Multi-Window capture
    await page1.locator('button[title="Close Settings"]').click();
    await page1.waitForTimeout(250);

    // A2: Real Multi-Window state (Window 1 = Product Launch, Window 2 = AI Research!)
    console.log('Creating real second Chrome window for Multi-Window captures...');
    await page1.evaluate(async () => {
      const res = await chrome.storage.local.get('spacetabs_user_settings');
      await chrome.storage.local.set({
        spacetabs_user_settings: {
          ...res.spacetabs_user_settings,
          darkPalette: 'forest',
          accentColor: '#10b981',
        },
      });
    });
    await page1.reload({ waitUntil: 'networkidle' });
    await page1.waitForTimeout(450);

    // Open a REAL second Chrome window with AI Research bound to it!
    const winInfo = await page1.evaluate(async (dashUrl) => {
      const win1 = await chrome.windows.getCurrent();
      const win2 = await chrome.windows.create({
        url: dashUrl,
        type: 'normal',
        width: 1440,
        height: 850,
        focused: false,
      });
      await chrome.storage.session.set({
        [`window_${win1.id}_space`]: 'space-launch',
        [`window_${win2.id}_space`]: 'space-ai',
      });
      return { win1Id: win1.id, win2Id: win2.id };
    }, dashboardUrl);
    console.log('Two Chrome windows active:', winInfo);

    await page1.waitForTimeout(900);
    // Find page2 corresponding to the second window dashboard
    const pages = shotCtx.pages().filter((p) => p.url().includes('/dashboard.html'));
    const page2 = pages.find((p) => p !== page1);
    if (!page2) throw new Error('Second window dashboard page not found');
    await page2.setViewportSize({ width: 1440, height: 810 });
    await page2.waitForTimeout(700);

    // Hover over "AI Research" in Window 1 briefly? No, keep both crisp showing live green & purple window dots!
    await page1.screenshot({ path: path.join(SHOTS_DIR, 'multiwin-window1.png') });
    await page2.screenshot({ path: path.join(SHOTS_DIR, 'multiwin-window2.png') });
    console.log('Captured multiwin-window1.png & multiwin-window2.png!');
  } finally {
    await shotCtx.close().catch(() => {});
    try { fs.rmSync(shotProfile, { recursive: true, force: true }); } catch {}
  }

  // Helper to record live clips cleanly
  const recordClip = async (clipName, seedOpts, initialSettings, activeSpace, actionFn) => {
    console.log(`\n--- Recording live clip: ${clipName} ---`);
    const prof = fs.mkdtempSync(path.join(os.tmpdir(), `spacetabs-${clipName}-`));
    const ctx = await chromium.launchPersistentContext(prof, {
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
    let elapsedSec = 6;
    try {
      const extId = await getExtensionId(ctx);
      const p = await ctx.newPage();
      await p.goto(`chrome-extension://${extId}/dashboard.html`, { waitUntil: 'networkidle' });
      await p.waitForTimeout(550);

      const seed = buildSeedData(seedOpts);
      seed.defaultSettings = { ...seed.defaultSettings, ...initialSettings };
      await seedAll(p, seed, activeSpace);
      await installDemoCursor(p);

      const t0 = Date.now();
      await actionFn(p);
      elapsedSec = (Date.now() - t0) / 1000;
      console.log(`Action duration for ${clipName}: ${elapsedSec.toFixed(2)}s`);

      const video = p.video();
      await p.close();
      rawWebm = path.join(RAW_DIR, `${clipName}.webm`);
      await video.saveAs(rawWebm);
    } finally {
      await ctx.close().catch(() => {});
      try { fs.rmSync(prof, { recursive: true, force: true }); } catch {}
    }

    const outMp4 = path.join(FOOTAGE_DIR, `${clipName}.mp4`);
    let totalDur = elapsedSec + 1.0;
    try {
      execFileSync(ffmpeg, ['-i', rawWebm], { stdio: 'pipe' });
    } catch (err) {
      const m = (err.stderr ? err.stderr.toString() : '').match(/Duration:\s+(\d+):(\d+):(\d+\.\d+)/);
      if (m) totalDur = Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]);
    }
    const trimStart = Math.max(0, totalDur - elapsedSec - 0.12);
    console.log(`Transcoding ${clipName} (total=${totalDur.toFixed(2)}s, trimStart=${trimStart.toFixed(2)}s) -> ${outMp4}`);
    transcodeToMp4(ffmpeg, rawWebm, outMp4, trimStart);
  };

  // ===========================================================================
  // 2. CLIP POWER ACTIONS: Close Duplicate Tabs + Drag & Drop + Archive Space!
  // ===========================================================================
  await recordClip(
    'clip-power-actions',
    { includeDuplicates: true, includeLegacySpace: true },
    { darkPalette: 'slate', accentColor: '#3b82f6' },
    'space-launch',
    async (p) => {
      await p.waitForTimeout(500);

      // STEP 1: Close Duplicate Tabs (Tabs (8) -> Tabs (6))
      await moveAndClick(p, p.locator('button[title="Tabs options"]'), {
        durationMs: 420,
        pauseAfter: 450,
      });
      await moveAndClick(p, p.getByRole('button', { name: 'Close duplicate tabs' }), {
        durationMs: 380,
        pauseAfter: 850,
      });

      // STEP 2: Drag & Drop "Tailwind CSS" tab onto "Brand & UI Kit" space in sidebar!
      const sourceRow = p.locator('.tab-manager-card [draggable="true"]', { hasText: 'Tailwind CSS' }).first();
      const targetSpaceBtn = p.locator('aside button', { hasText: 'Brand & UI Kit' }).first();
      const srcBox = await sourceRow.boundingBox();
      const tgtBox = await targetSpaceBtn.boundingBox();
      if (!srcBox || !tgtBox) throw new Error('Drag source or target not found');

      // Move cursor onto the tab row
      await moveCursorTo(p, srcBox.x + 220, srcBox.y + srcBox.height / 2, 420);
      await p.waitForTimeout(180);

      // Trigger real React HTML5 dragstart on sourceRow
      await p.evaluate(() => {
        const rows = Array.from(document.querySelectorAll('.tab-manager-card [draggable="true"]'));
        const src = rows.find((el) => el.textContent && el.textContent.includes('Tailwind CSS'));
        if (!src) return;
        const dt = new DataTransfer();
        window.__demoDT = dt;
        src.dispatchEvent(new DragEvent('dragstart', { bubbles: true, cancelable: true, dataTransfer: dt }));
      });

      // Glide cursor WITH sleek floating dragged tab ghost pill to Brand & UI Kit!
      await moveCursorTo(
        p,
        tgtBox.x + tgtBox.width / 2,
        tgtBox.y + tgtBox.height / 2,
        750,
        '⇄  Tailwind CSS — Theme Variables'
      );

      // Trigger real dragenter + dragover on targetSpaceBtn so SpaceTabs' blue glowing "Drop" pill appears!
      await p.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('aside button'));
        const tgt = btns.find((el) => el.textContent && el.textContent.includes('Brand & UI Kit'));
        if (!tgt || !window.__demoDT) return;
        tgt.dispatchEvent(new DragEvent('dragenter', { bubbles: true, cancelable: true, dataTransfer: window.__demoDT }));
        tgt.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: window.__demoDT }));
      });
      await p.waitForTimeout(550);

      // Fire real drop + dragend -> Tab moves cleanly into Brand & UI Kit!
      await p.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('aside button'));
        const tgt = btns.find((el) => el.textContent && el.textContent.includes('Brand & UI Kit'));
        const rows = Array.from(document.querySelectorAll('.tab-manager-card [draggable="true"]'));
        const src = rows.find((el) => el.textContent && el.textContent.includes('Tailwind CSS'));
        if (tgt && window.__demoDT) {
          tgt.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: window.__demoDT }));
        }
        if (src && window.__demoDT) {
          src.dispatchEvent(new DragEvent('dragend', { bubbles: true, cancelable: true, dataTransfer: window.__demoDT }));
        }
        const g = document.getElementById('spacetabs-drag-ghost');
        if (g) g.style.display = 'none';
      });
      await p.waitForTimeout(850);

      // STEP 3: Archive "Legacy Sprint v1" space & open Archive drawer to reveal it!
      const legacyRow = p.locator('aside button', { hasText: 'Legacy Sprint v1' }).first();
      const legBox = await legacyRow.boundingBox();
      if (!legBox) throw new Error('Legacy Sprint v1 row not found');
      await moveCursorTo(p, legBox.x + legBox.width - 20, legBox.y + legBox.height / 2, 420);
      await legacyRow.hover();
      await p.waitForTimeout(220);

      const spaceMenuBtn = legacyRow.locator('button[title="Space options"]');
      await moveAndClick(p, spaceMenuBtn, { durationMs: 260, pauseAfter: 350 });

      await moveAndClick(p, p.getByRole('button', { name: 'Archive', exact: true }).first(), {
        durationMs: 360,
        pauseAfter: 550,
      });

      // Open Archive drawer at bottom of sidebar & hover archived item to show green Restore icon
      const archiveDrawerBtn = p.locator('aside button', { hasText: 'Archive' }).last();
      await moveAndClick(p, archiveDrawerBtn, { durationMs: 400, pauseAfter: 450 });

      const archivedItem = p.locator('aside').getByText('Legacy Sprint v1').first();
      const archBox = await archivedItem.boundingBox();
      if (archBox) {
        await moveCursorTo(p, archBox.x + 150, archBox.y + archBox.height / 2, 340);
        await archivedItem.hover();
      }
      await p.waitForTimeout(950);
    }
  );

  // ===========================================================================
  // 3. CLIP RIGHT FLOATING PANEL: Compact sidebar + Right Floating Panel slide-out!
  // ===========================================================================
  await recordClip(
    'clip-right-panel',
    { includeDuplicates: false, includeLegacySpace: false },
    { darkPalette: 'indigo', accentColor: '#8b5cf6', rightFloatingPanel: true, rightPanelWidth: 272 },
    'space-launch',
    async (p) => {
      await p.waitForTimeout(450);

      // Click RESEARCH section in compact left sidebar -> Right Floating Panel slides open!
      await moveAndClick(p, p.locator('aside').getByText('RESEARCH', { exact: true }).first(), {
        durationMs: 420,
        pauseAfter: 750,
      });

      // Click "AI Research" inside the Right Floating Panel!
      const rightPanel = p.locator('main aside').first();
      await moveAndClick(p, rightPanel.getByText('AI Research').first(), {
        durationMs: 520,
        pauseAfter: 850,
      });

      // Click DEVELOPMENT section in left sidebar -> Right Floating Panel swaps to Development spaces!
      await moveAndClick(p, p.locator('aside').first().getByText('DEVELOPMENT', { exact: true }).first(), {
        durationMs: 480,
        pauseAfter: 700,
      });

      // Click "Product Launch" inside the Right Floating Panel!
      await moveAndClick(p, rightPanel.getByText('Product Launch').first(), {
        durationMs: 480,
        pauseAfter: 900,
      });
    }
  );

  try { fs.rmSync(RAW_DIR, { recursive: true, force: true }); } catch {}
  console.log('\nAll new feature captures completed cleanly!');
}

main().catch((err) => {
  console.error('Additions capture failed:', err);
  process.exit(1);
});
