import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const REPO_ROOT = path.resolve(ROOT, '..');
const EXT_PATH = path.resolve(REPO_ROOT, 'dist');
const EXISTING_SHOTS = path.resolve(ROOT, 'public/screenshots');
const OUT_DIR = path.resolve(REPO_ROOT, 'docs/store-assets');
const RAW_UI_DIR = path.resolve(OUT_DIR, 'raw-ui');

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.mkdirSync(RAW_UI_DIR, { recursive: true });

function favicon(domain) {
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
}

function toDataUri(filePath) {
  const buf = fs.readFileSync(filePath);
  return `data:image/png;base64,${buf.toString('base64')}`;
}

async function getExtensionId(context) {
  let sw = context.serviceWorkers()[0];
  if (!sw) sw = await context.waitForEvent('serviceworker', { timeout: 15000 });
  const m = sw.url().match(/chrome-extension:\/\/([^/]+)/);
  if (!m) throw new Error('Extension ID not found');
  return m[1];
}

function buildSeed() {
  const now = Date.now();
  const day = 86400000;
  return {
    spaces: [
      { id: 'space-ai', name: 'AI Research', icon: '🔥', color: '#10b981', section: 'RESEARCH', sectionOrder: 0, description: 'Transformer papers, model benchmarks & inference optimization', order: 0, createdAt: now - 5 * day, updatedAt: now, isArchived: false },
      { id: 'space-sys', name: 'System Design', icon: '📚', color: '#06b6d4', section: 'RESEARCH', sectionOrder: 0, description: 'Distributed consensus & storage engines', order: 1, createdAt: now - 4 * day, updatedAt: now, isArchived: false },
      { id: 'space-launch', name: 'Product Launch', icon: '🚀', color: '#8b5cf6', section: 'DEVELOPMENT', sectionOrder: 1, description: 'SpaceTabs v1.4 release roadmap, PR reviews & launch assets', order: 2, createdAt: now - 6 * day, updatedAt: now, isArchived: false },
      { id: 'space-api', name: 'API Architecture', icon: '⚙️', color: '#3b82f6', section: 'DEVELOPMENT', sectionOrder: 1, description: 'Edge workers & schema migrations', order: 3, createdAt: now - 3 * day, updatedAt: now, isArchived: false },
      { id: 'space-design', name: 'Brand & UI Kit', icon: '🎨', color: '#ec4899', section: 'DESIGN', sectionOrder: 2, description: 'Color palettes, motion tokens & store graphics', order: 4, createdAt: now - 2 * day, updatedAt: now, isArchived: false },
      { id: 'space-focus', name: 'Deep Work', icon: '⚡', color: '#f59e0b', section: 'PERSONAL', sectionOrder: 3, description: 'Daily planning & reading list', order: 5, createdAt: now - day, updatedAt: now, isArchived: false },
    ],
    tabs: [
      { id: 't1', spaceId: 'space-launch', title: 'React — Modern UI Library & Documentation', url: 'https://react.dev/', favIconUrl: favicon('react.dev'), order: 0, createdAt: now, updatedAt: now },
      { id: 't2', spaceId: 'space-launch', title: 'Figma — SpaceTabs Theme System & Launch Kit', url: 'https://www.figma.com/', favIconUrl: favicon('figma.com'), order: 1, createdAt: now, updatedAt: now },
      { id: 't3', spaceId: 'space-launch', title: 'WXT — Next-Gen Web Extension Framework', url: 'https://wxt.dev/', favIconUrl: favicon('wxt.dev'), order: 2, createdAt: now, updatedAt: now },
      { id: 't4', spaceId: 'space-launch', title: 'Linear — Plan and Build Products', url: 'https://linear.app/', favIconUrl: favicon('linear.app'), order: 3, createdAt: now, updatedAt: now },
      { id: 't5', spaceId: 'space-launch', title: 'Chrome Web Store — Extensions & Themes', url: 'https://chromewebstore.google.com/', favIconUrl: favicon('chromewebstore.google.com'), order: 4, createdAt: now, updatedAt: now },
      { id: 't6', spaceId: 'space-launch', title: 'Tailwind CSS — Rapidly Build Modern Websites', url: 'https://tailwindcss.com/', favIconUrl: favicon('tailwindcss.com'), order: 5, createdAt: now, updatedAt: now },
      { id: 'a1', spaceId: 'space-ai', title: 'Attention Is All You Need — arXiv', url: 'https://arxiv.org/abs/1706.03762', favIconUrl: favicon('arxiv.org'), order: 0, createdAt: now, updatedAt: now },
      { id: 'a2', spaceId: 'space-ai', title: 'Hugging Face — Open Models & Datasets Hub', url: 'https://huggingface.co/models', favIconUrl: favicon('huggingface.co'), order: 1, createdAt: now, updatedAt: now },
      { id: 'a3', spaceId: 'space-ai', title: 'PyTorch 2.6 — torch.compile Performance Guide', url: 'https://pytorch.org/docs/stable/index.html', favIconUrl: favicon('pytorch.org'), order: 2, createdAt: now, updatedAt: now },
      { id: 'a4', spaceId: 'space-ai', title: 'Weights & Biases — Training Run Dashboard', url: 'https://wandb.ai/site', favIconUrl: favicon('wandb.ai'), order: 3, createdAt: now, updatedAt: now },
    ],
    resourceSections: [
      { id: 'rs1', spaceId: 'space-launch', title: 'Core Launch Docs & Specs', order: 0, updatedAt: now },
      { id: 'rs2', spaceId: 'space-launch', title: 'Design System & Store Assets', order: 1, updatedAt: now },
    ],
    resourceItems: [
      { id: 'ri1', sectionId: 'rs1', title: 'SpaceTabs v1.4 Launch Spec & Architecture PRD', url: 'https://docs.google.com/document/d/spacetabs-prd', favIconUrl: favicon('docs.google.com'), type: 'doc', order: 0, createdAt: now, updatedAt: now },
      { id: 'ri2', sectionId: 'rs1', title: 'Launch Metrics & Conversion Tracker Sheet', url: 'https://docs.google.com/spreadsheets/d/launch-metrics', favIconUrl: favicon('sheets.google.com'), type: 'sheet', order: 1, createdAt: now, updatedAt: now },
      { id: 'ri3', sectionId: 'rs2', title: '14 Surface Palettes & Accent Tokens (Figma)', url: 'https://www.figma.com/file/spacetabs-palettes', favIconUrl: favicon('figma.com'), type: 'link', order: 0, createdAt: now, updatedAt: now },
    ],
    notes: [
      {
        id: 'n1',
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
- [x] **100% Free, Unlimited & Local-First**`,
        createdAt: now - day,
        updatedAt: now,
      },
      {
        id: 'n2',
        spaceId: 'space-launch',
        title: 'Marketing Copy & Taglines',
        content: `## Hero Copy\n\n> Local-first, unlimited workspaces for Chromium browsers.`,
        createdAt: now - 2 * day,
        updatedAt: now - 50000,
      },
    ],
    tasks: [
      { id: 'tk1', spaceId: 'space-launch', text: 'Finalize 14 Dark & Light surface palettes', completed: true, order: 0, dueDate: now - day, createdAt: now, updatedAt: now },
      { id: 'tk2', spaceId: 'space-launch', text: 'Verify zero-loss Chromium native tab discarding', completed: true, order: 1, dueDate: now, createdAt: now, updatedAt: now },
      { id: 'tk3', spaceId: 'space-launch', text: 'Test bi-directional Google Drive sync across devices', completed: true, order: 2, dueDate: now, createdAt: now, updatedAt: now },
      { id: 'tk4', spaceId: 'space-launch', text: 'Publish Chrome Web Store promo video & screenshots', completed: true, order: 3, dueDate: now + day, createdAt: now, updatedAt: now },
      { id: 'tk5', spaceId: 'space-launch', text: 'Ship v1.4 release notes & changelog', completed: true, order: 4, dueDate: now + 2 * day, createdAt: now, updatedAt: now },
      { id: 'tk6', spaceId: 'space-launch', text: 'Share release with Product Hunt & GitHub community', completed: false, order: 5, dueDate: now + 3 * day, createdAt: now, updatedAt: now },
    ],
    settings: {
      autoSuspendEnabled: true,
      idleThresholdMinutes: 15,
      defaultOpenInNewWindow: false,
      discardOnSpaceSwitch: true,
      showTabFavicons: true,
      sidebarTheme: 'dark',
      dashboardTheme: 'light',
      accentColor: '#6366f1',
      darkPalette: 'indigo',
      lightPalette: 'snow',
      sidebarWidth: 320,
      rightFloatingPanel: false,
      rightPanelWidth: 272,
      showSectionActiveDot: true,
      patreonUrl: 'https://www.patreon.com/abudojana',
    },
    profile: { id: 'demo-user-01', email: 'alex.chen@gmail.com', name: 'Alex Chen', connectedAt: now - 7 * day },
    syncSettings: { enabled: true, autoSync: true, syncIntervalMinutes: 15, syncOnStartup: true },
    syncMeta: { lastSyncTime: now - 42000, folderId: '1SpaceTabsDemoFolderId', fileId: '1SpaceTabsDemoDataJsonId', folderUrl: 'https://drive.google.com/drive/folders/1SpaceTabsDemoFolderId', lastError: null },
  };
}

async function captureMissingRetinaShots() {
  console.log('--- Step 1: Capturing missing 2x Retina UI screenshots ---');
  const prof = fs.mkdtempSync(path.join(os.tmpdir(), 'spacetabs-store-shots-'));
  const ctx = await chromium.launchPersistentContext(prof, {
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
    const extId = await getExtensionId(ctx);
    const page = await ctx.newPage();
    await page.goto(`chrome-extension://${extId}/dashboard.html`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(550);

    const seed = buildSeed();
    await page.evaluate(async (d) => {
      await chrome.storage.local.set({
        spacetabs_user_settings: d.settings,
        spacetabs_google_profile: d.profile,
        spacetabs_sync_settings: d.syncSettings,
        spacetabs_sync_meta: d.syncMeta,
      });
      await new Promise((resolve, reject) => {
        const req = indexedDB.open('TabManagerDB');
        req.onerror = () => reject(req.error);
        req.onsuccess = () => {
          const db = req.result;
          const stores = ['spaces', 'tabs', 'resourceSections', 'resourceItems', 'notes', 'tasks'];
          const tx = db.transaction(stores, 'readwrite');
          tx.onerror = () => reject(tx.error);
          tx.oncomplete = () => { db.close(); resolve(true); };
          for (const s of stores) {
            const st = tx.objectStore(s);
            st.clear();
            for (const item of d[s]) st.put(item);
          }
        };
      });
      const win = await chrome.windows.getCurrent();
      if (win?.id) await chrome.storage.session.set({ [`window_${win.id}_space`]: 'space-launch' });
    }, seed);

    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(600);

    // 1. Global Search Dropdown Open (Dark Emerald)
    console.log('Capturing ui-global-search.png...');
    const searchInput = page.getByPlaceholder('Search tabs, notes, tasks, resources...');
    await searchInput.click();
    await page.keyboard.type('launch');
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(RAW_UI_DIR, 'ui-global-search.png') });
    await page.locator('button[title="Clear search"]').click();
    await page.waitForTimeout(200);

    // 2. Notes Split View (Space Indigo + Violet, All Dark, default sidebar width)
    console.log('Capturing ui-notes-split.png...');
    await page.evaluate(async () => {
      const res = await chrome.storage.local.get('spacetabs_user_settings');
      await chrome.storage.local.set({
        spacetabs_user_settings: {
          ...res.spacetabs_user_settings,
          sidebarTheme: 'dark',
          dashboardTheme: 'dark',
          darkPalette: 'indigo',
          accentColor: '#8b5cf6',
          sidebarWidth: 268,
        },
      });
    });
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(450);
    await page.locator('header nav').getByRole('button', { name: 'Notes' }).click();
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: 'Split', exact: true }).click();
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(RAW_UI_DIR, 'ui-notes-split.png') });

    // 3. Tasks Progress Checklist
    console.log('Capturing ui-tasks.png...');
    await page.locator('header nav').getByRole('button', { name: 'Tasks' }).click();
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(RAW_UI_DIR, 'ui-tasks.png') });

    // 4. Right Floating Panel Active (Space Indigo + Violet)
    console.log('Capturing ui-right-panel.png...');
    await page.evaluate(async () => {
      const res = await chrome.storage.local.get('spacetabs_user_settings');
      await chrome.storage.local.set({
        spacetabs_user_settings: { ...res.spacetabs_user_settings, rightFloatingPanel: true, rightPanelWidth: 272 },
      });
    });
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(750);
    // Ensure Right Floating Panel (<main> <aside>) is open showing DEVELOPMENT spaces
    if ((await page.locator('main aside').count()) === 0) {
      await page.locator('aside').first().getByText('DEVELOPMENT', { exact: true }).click();
    }
    await page.locator('main aside').first().waitFor({ state: 'visible', timeout: 5000 });
    await page.waitForTimeout(350);
    await page.screenshot({ path: path.join(RAW_UI_DIR, 'ui-right-panel.png') });

    // Copy existing crisp 2x Retina screenshots into raw-ui/ for user convenience
    for (const f of [
      'theme-forest-emerald.png',
      'theme-purple-space.png',
      'theme-midnight-oled.png',
      'theme-split-indigo.png',
      'theme-sakura-rose.png',
      'theme-fresh-mint.png',
      'settings-memory-saver.png',
      'settings-drive-sync.png',
      'settings-support-creator.png',
      'multiwin-window1.png',
      'multiwin-window2.png',
    ]) {
      const src = path.join(EXISTING_SHOTS, f);
      if (fs.existsSync(src)) fs.copyFileSync(src, path.join(RAW_UI_DIR, f));
    }
  } finally {
    await ctx.close().catch(() => {});
    try { fs.rmSync(prof, { recursive: true, force: true }); } catch {}
  }
}

const LOGO_SVG = (size = 56) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 128 128" style="display:block;filter:drop-shadow(0 10px 26px rgba(244,63,94,0.5))">
  <defs>
    <linearGradient id="stbg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FB7185" />
      <stop offset="48%" stop-color="#F43F5E" />
      <stop offset="100%" stop-color="#BE123C" />
    </linearGradient>
  </defs>
  <rect width="128" height="128" rx="30" fill="url(#stbg)"/>
  <rect x="1.5" y="1.5" width="125" height="125" rx="28.5" fill="none" stroke="rgba(255,255,255,0.28)" stroke-width="2"/>
  <g transform="translate(24, 24) scale(3.333)" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" fill="none">
    <path d="M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9A1 1 0 0 0 22 7.91a1 1 0 0 0 0-1.83z"/>
    <path d="M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12"/>
    <path d="M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17"/>
  </g>
</svg>`;

const BASE_CSS = `
* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  font-family: "Inter", "Segoe UI", system-ui, -apple-system, sans-serif;
  background: #050712;
  color: #f8fafc;
  overflow: hidden;
  -webkit-font-smoothing: antialiased;
}
.canvas {
  position: relative;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background: radial-gradient(ellipse 90% 80% at 50% 35%, #0e1430 0%, #050712 68%, #020309 100%);
}
.grid {
  position: absolute; inset: 0;
  background-image:
    linear-gradient(rgba(148,163,184,0.05) 1px, transparent 1px),
    linear-gradient(90deg, rgba(148,163,184,0.05) 1px, transparent 1px);
  background-size: 48px 48px;
  -webkit-mask-image: radial-gradient(ellipse 80% 75% at 50% 45%, rgba(0,0,0,0.85) 15%, transparent 85%);
}
.orb { position: absolute; border-radius: 50%; filter: blur(42px); pointer-events: none; }
.header {
  position: relative; z-index: 20;
  text-align: center;
  padding-top: 28px;
}
.eyebrow {
  display: inline-flex; align-items: center; gap: 7px;
  padding: 5px 13px; border-radius: 999px;
  font-size: 11.5px; font-weight: 800; letter-spacing: 0.11em; text-transform: uppercase;
  margin-bottom: 10px;
}
.dot { width: 7px; height: 7px; border-radius: 50%; display: inline-block; }
h1 {
  font-size: 42px; font-weight: 900; letter-spacing: -0.035em; line-height: 1.08;
  color: #ffffff;
  text-shadow: 0 8px 28px rgba(0,0,0,0.65);
}
.sub {
  margin-top: 8px; font-size: 16px; font-weight: 500; color: #cbd5e1;
}
.grad {
  background-clip: text; -webkit-background-clip: text;
  color: transparent; -webkit-text-fill-color: transparent;
}
.window {
  border-radius: 16px; overflow: hidden;
  background: #090d1a;
  box-shadow: 0 30px 90px rgba(0,0,0,0.78), inset 0 1px 0 rgba(255,255,255,0.14);
  display: flex; flex-direction: column;
}
.chrome-bar {
  height: 34px;
  background: linear-gradient(180deg, #131a2f 0%, #0c1120 100%);
  border-bottom: 1px solid rgba(255,255,255,0.08);
  display: flex; align-items: flex-end; justify-content: space-between;
  padding: 0 14px; flex-shrink: 0;
}
.lights { display: flex; gap: 6px; align-items: center; height: 100%; }
.lights span { width: 9.5px; height: 9.5px; border-radius: 50%; }
.tab-active {
  display: inline-flex; align-items: center; gap: 7px;
  height: 27px; padding: 0 13px;
  border-top-left-radius: 9px; border-top-right-radius: 9px;
  background: rgba(22,30,52,0.96);
  font-size: 11.5px; font-weight: 700; color: #f8fafc;
}
.tab-bg {
  display: inline-flex; align-items: center; gap: 5px;
  height: 24px; padding: 0 11px;
  border-top-left-radius: 7px; border-top-right-radius: 7px;
  background: rgba(255,255,255,0.035);
  color: #64748b; font-size: 10.5px; font-weight: 600;
}
.pill-row {
  position: absolute; bottom: 18px; left: 0; right: 0; z-index: 30;
  display: flex; justify-content: center; gap: 10px;
}
.pill {
  display: inline-flex; align-items: center; gap: 7px;
  padding: 7px 14px; border-radius: 999px;
  background: rgba(9, 14, 30, 0.88);
  font-size: 12.5px; font-weight: 700; color: #f1f5f9;
  box-shadow: 0 10px 26px rgba(0,0,0,0.55);
}
`;

async function renderGraphic(browser, html, width, height, outPath) {
  const page = await browser.newPage({
    viewport: { width, height },
    deviceScaleFactor: 1,
  });
  await page.setContent(html, { waitUntil: 'load' });
  await page.waitForTimeout(150);
  // Chrome Web Store requires 24-bit opaque PNG (no alpha channel transparency)
  await page.screenshot({ path: outPath, type: 'png', omitBackground: false });
  await page.close();
  console.log(`Rendered ${path.basename(outPath)} (${width}x${height})`);
}

async function main() {
  await captureMissingRetinaShots();

  console.log('\n--- Step 2: Composing Chrome Web Store Assets ---');
  const img = {
    emerald: toDataUri(path.join(RAW_UI_DIR, 'theme-forest-emerald.png')),
    purple: toDataUri(path.join(RAW_UI_DIR, 'theme-purple-space.png')),
    midnight: toDataUri(path.join(RAW_UI_DIR, 'theme-midnight-oled.png')),
    split: toDataUri(path.join(RAW_UI_DIR, 'theme-split-indigo.png')),
    sakura: toDataUri(path.join(RAW_UI_DIR, 'theme-sakura-rose.png')),
    mint: toDataUri(path.join(RAW_UI_DIR, 'theme-fresh-mint.png')),
    search: toDataUri(path.join(RAW_UI_DIR, 'ui-global-search.png')),
    notes: toDataUri(path.join(RAW_UI_DIR, 'ui-notes-split.png')),
    tasks: toDataUri(path.join(RAW_UI_DIR, 'ui-tasks.png')),
    rightPanel: toDataUri(path.join(RAW_UI_DIR, 'ui-right-panel.png')),
    win1: toDataUri(path.join(RAW_UI_DIR, 'multiwin-window1.png')),
    win2: toDataUri(path.join(RAW_UI_DIR, 'multiwin-window2.png')),
    memory: toDataUri(path.join(RAW_UI_DIR, 'settings-memory-saver.png')),
    drive: toDataUri(path.join(RAW_UI_DIR, 'settings-drive-sync.png')),
    support: toDataUri(path.join(RAW_UI_DIR, 'settings-support-creator.png')),
  };

  const browser = await chromium.launch({ channel: 'chromium', headless: true });

  try {
    // =========================================================================
    // SCREENSHOT 1 (1280x800): Hero — Split (Dark/Light) Mode, Medium Sidebar (320px), Dynamic Title & Search
    // =========================================================================
    await renderGraphic(
      browser,
      `<!doctype html><html><head><style>${BASE_CSS}</style></head><body>
      <div class="canvas">
        <div class="orb" style="width:760px;height:600px;left:-140px;top:-160px;background:radial-gradient(circle,#6366f148 0%,transparent 70%)"></div>
        <div class="orb" style="width:700px;height:560px;right:-160px;bottom:-180px;background:radial-gradient(circle,#38bdf838 0%,transparent 70%)"></div>
        <div class="grid"></div>
        <div class="header">
          <div class="eyebrow" style="background:rgba(99,102,241,0.18);border:1px solid rgba(99,102,241,0.52);color:#a5b4fc;">
            <span class="dot" style="background:#6366f1;box-shadow:0 0 8px #6366f1"></span>
            LOCAL-FIRST • UNLIMITED • FREE FOREVER
          </div>
          <h1>Organize Every Tab into <span class="grad" style="background-image:linear-gradient(120deg,#818cf8,#38bdf8)">Spaces</span></h1>
          <div class="sub">Instant cross-space search, drag &amp; drop, duplicate tab cleaner &amp; dynamic tab titles</div>
        </div>

        <div style="position:relative;z-index:20;display:flex;justify-content:center;margin-top:16px;">
          <div class="window" style="width:940px;border:1.5px solid rgba(99,102,241,0.6);box-shadow:0 28px 80px rgba(0,0,0,0.82),0 0 60px rgba(99,102,241,0.28)">
            <div class="chrome-bar">
              <div style="display:flex;align-items:flex-end;gap:8px;height:100%;">
                <div class="lights"><span style="background:#ff5f56"></span><span style="background:#ffbd2e"></span><span style="background:#27c93f"></span></div>
                <div class="tab-active" style="border-top:1.5px solid #6366f1;border-left:1px solid #6366f155;border-right:1px solid #6366f155;">
                  🚀 Product Launch — SpaceTabs
                </div>
                <div class="tab-bg">React</div>
                <div class="tab-bg">Figma</div>
                <div class="tab-bg">WXT</div>
                <div style="align-self:center;padding:2px 9px;border-radius:999px;background:rgba(99,102,241,0.22);border:1px solid rgba(129,140,248,0.65);font-size:10px;font-weight:800;color:#fff;">✦ Dynamic Tab Title</div>
              </div>
              <div style="align-self:center;font-size:10px;font-family:monospace;color:#64748b;padding:2px 7px;border-radius:5px;border:1px solid rgba(148,163,184,0.2)">Alt + Shift + W</div>
            </div>
            <img src="${img.search}" style="width:940px;height:528px;object-fit:cover;display:block;" />
          </div>
        </div>

        <div class="pill-row">
          <div class="pill" style="border:1px solid rgba(129,140,248,0.5)"><span class="dot" style="background:#818cf8"></span>Unlimited Spaces &amp; Sections</div>
          <div class="pill" style="border:1px solid rgba(56,189,248,0.45)"><span class="dot" style="background:#38bdf8"></span>Drag &amp; Drop + Close Duplicates</div>
          <div class="pill" style="border:1px solid rgba(52,211,153,0.45)"><span class="dot" style="background:#34d399"></span>Instant Cross-Space Search</div>
          <div class="pill" style="border:1px solid rgba(251,191,36,0.45)"><span class="dot" style="background:#fbbf24"></span>Safe Archive &amp; Restore</div>
        </div>
      </div></body></html>`,
      1280,
      800,
      path.join(OUT_DIR, '01-workspaces-and-search.png')
    );

    // =========================================================================
    // SCREENSHOT 2 (1280x800): Built-in Markdown Notes, Tasks & Resources
    // =========================================================================
    await renderGraphic(
      browser,
      `<!doctype html><html><head><style>${BASE_CSS}</style></head><body>
      <div class="canvas">
        <div class="orb" style="width:760px;height:600px;left:-140px;top:-160px;background:radial-gradient(circle,#8b5cf642 0%,transparent 70%)"></div>
        <div class="orb" style="width:700px;height:560px;right:-140px;bottom:-180px;background:radial-gradient(circle,#3b82f636 0%,transparent 70%)"></div>
        <div class="grid"></div>
        <div class="header">
          <div class="eyebrow" style="background:rgba(139,92,246,0.18);border:1px solid rgba(139,92,246,0.5);color:#c4b5fd;">
            <span class="dot" style="background:#a78bfa;box-shadow:0 0 8px #a78bfa"></span>
            ALL-IN-ONE WORKSPACE CANVAS
          </div>
          <h1><span class="grad" style="background-image:linear-gradient(120deg,#c4b5fd,#38bdf8)">Markdown Notes</span>, Tasks &amp; Resources</h1>
          <div class="sub">Split-pane Markdown preview, progress checklists &amp; pinned resources per Space</div>
        </div>

        <div style="position:relative;z-index:20;width:1180px;height:560px;margin:24px auto 0;">
          <!-- Primary Window: Split Markdown Notes -->
          <div class="window" style="position:absolute;left:16px;top:0;width:880px;border:1.5px solid rgba(139,92,246,0.55);box-shadow:0 28px 80px rgba(0,0,0,0.82),0 0 50px rgba(139,92,246,0.22)">
            <div class="chrome-bar">
              <div style="display:flex;align-items:flex-end;gap:8px;height:100%;">
                <div class="lights"><span style="background:#ff5f56"></span><span style="background:#ffbd2e"></span><span style="background:#27c93f"></span></div>
                <div class="tab-active" style="border-top:1.5px solid #8b5cf6;">📝 Split-Pane Markdown Notes — Auto-Saved</div>
              </div>
              <div style="align-self:center;font-size:10px;color:#34d399;font-weight:700;">✓ Saved Locally</div>
            </div>
            <img src="${img.notes}" style="width:880px;height:495px;object-fit:cover;display:block;" />
          </div>

          <!-- Floating Foreground Card: Tasks Progress Checklist -->
          <div class="window" style="position:absolute;right:12px;bottom:14px;width:475px;border:1.5px solid rgba(52,211,153,0.62);box-shadow:0 28px 85px rgba(0,0,0,0.92),0 0 42px rgba(16,185,129,0.28)">
            <div class="chrome-bar" style="height:28px;">
              <div class="lights"><span style="background:#ff5f56"></span><span style="background:#ffbd2e"></span><span style="background:#27c93f"></span></div>
              <div style="align-self:center;font-size:10.5px;font-weight:700;color:#6ee7b7;">✅ Space Tasks &amp; Progress (83%)</div>
              <div style="width:28px"></div>
            </div>
            <div style="width:475px;height:310px;overflow:hidden;position:relative;background:#0f0d24;">
              <img src="${img.tasks}" style="width:650px;height:366px;object-fit:cover;transform:translate(-156px,-46px);display:block;" />
            </div>
          </div>
        </div>

        <div class="pill-row">
          <div class="pill" style="border:1px solid rgba(167,139,250,0.45)"><span class="dot" style="background:#a78bfa"></span>Live Split-Pane Markdown Editor</div>
          <div class="pill" style="border:1px solid rgba(52,211,153,0.45)"><span class="dot" style="background:#34d399"></span>Task Checklists &amp; Due Dates</div>
          <div class="pill" style="border:1px solid rgba(56,189,248,0.45)"><span class="dot" style="background:#38bdf8"></span>Categorized Pinned Resources</div>
        </div>
      </div></body></html>`,
      1280,
      800,
      path.join(OUT_DIR, '02-notes-tasks-resources.png')
    );

    // =========================================================================
    // SCREENSHOT 3 (1280x800): 14 Curated Themes & 9 Accent Colors
    // =========================================================================
    await renderGraphic(
      browser,
      `<!doctype html><html><head><style>${BASE_CSS}</style></head><body>
      <div class="canvas">
        <div class="orb" style="width:640px;height:520px;left:-100px;top:60px;background:radial-gradient(circle,#10b9813b 0%,transparent 70%)"></div>
        <div class="orb" style="width:680px;height:540px;left:300px;top:-160px;background:radial-gradient(circle,#8b5cf648 0%,transparent 70%)"></div>
        <div class="orb" style="width:640px;height:520px;right:-100px;bottom:-80px;background:radial-gradient(circle,#f43f5e42 0%,transparent 70%)"></div>
        <div class="grid"></div>
        <div class="header">
          <div class="eyebrow" style="background:rgba(244,63,94,0.16);border:1px solid rgba(244,63,94,0.48);color:#fda4af;">
            <span class="dot" style="background:#f43f5e;box-shadow:0 0 8px #f43f5e"></span>
            APPEARANCE &amp; THEME STUDIO
          </div>
          <h1><span class="grad" style="background-image:linear-gradient(120deg,#34d399,#a78bfa,#fb7185)">14 Curated Palettes.</span> Dark, Light &amp; Split.</h1>
          <div class="sub">Independent sidebar &amp; canvas themes, 9 accents + custom hex picker</div>
        </div>

        <div style="position:relative;z-index:20;width:1240px;height:550px;margin:22px auto 0;">
          <!-- Left Angled: Dark Emerald -->
          <div class="window" style="position:absolute;left:10px;top:62px;width:540px;border:1.5px solid rgba(16,185,129,0.58);transform:rotate(-4deg);box-shadow:0 24px 70px rgba(0,0,0,0.8)">
            <div class="chrome-bar" style="height:26px;">
              <div class="lights"><span style="background:#ff5f56"></span><span style="background:#ffbd2e"></span><span style="background:#27c93f"></span></div>
              <div style="align-self:center;font-size:10px;font-weight:700;color:#6ee7b7;">Forest Dark • Emerald</div>
              <div style="width:20px"></div>
            </div>
            <img src="${img.emerald}" style="width:540px;height:304px;object-fit:cover;display:block;" />
          </div>

          <!-- Right Angled: Sakura Blossom Rose Light -->
          <div class="window" style="position:absolute;right:10px;top:62px;width:540px;border:1.5px solid rgba(244,63,94,0.62);transform:rotate(4deg);box-shadow:0 24px 70px rgba(0,0,0,0.8)">
            <div class="chrome-bar" style="height:26px;">
              <div class="lights"><span style="background:#ff5f56"></span><span style="background:#ffbd2e"></span><span style="background:#27c93f"></span></div>
              <div style="align-self:center;font-size:10px;font-weight:700;color:#fda4af;">Sakura Blossom • Crimson Rose</div>
              <div style="width:20px"></div>
            </div>
            <img src="${img.sakura}" style="width:540px;height:304px;object-fit:cover;display:block;" />
          </div>

          <!-- Center Hero: Purple Space -->
          <div class="window" style="position:absolute;left:50%;top:10px;transform:translateX(-50%);width:740px;z-index:10;border:1.5px solid rgba(139,92,246,0.72);box-shadow:0 36px 100px rgba(0,0,0,0.92),0 0 65px rgba(139,92,246,0.34)">
            <div class="chrome-bar" style="height:30px;">
              <div style="display:flex;align-items:flex-end;gap:8px;height:100%;">
                <div class="lights"><span style="background:#ff5f56"></span><span style="background:#ffbd2e"></span><span style="background:#27c93f"></span></div>
                <div class="tab-active" style="height:24px;border-top:1.5px solid #8b5cf6;font-size:11px;">🚀 Product Launch — Purple Space</div>
              </div>
              <div style="align-self:center;font-size:10px;color:#c4b5fd;font-weight:700;">Violet Purple Accent</div>
            </div>
            <img src="${img.purple}" style="width:740px;height:416px;object-fit:cover;display:block;" />
          </div>
        </div>

        <div class="pill-row">
          ${[
            ['Forest Dark', '#0b1a13', '#10b981'],
            ['Purple Space', '#1f0430', '#8b5cf6'],
            ['Midnight OLED', '#000000', '#06b6d4'],
            ['Split Mode', '#13102d', '#6366f1'],
            ['Sakura Blossom', '#fff0f3', '#f43f5e'],
            ['Fresh Mint', '#f0fdf4', '#10b981'],
          ]
            .map(
              ([name, bg, ac]) =>
                `<div class="pill" style="border:1px solid ${ac}66"><span style="width:12px;height:12px;border-radius:50%;background:linear-gradient(135deg,${bg} 38%,${ac} 100%);border:1.5px solid rgba(255,255,255,0.65);display:inline-block"></span>${name}</div>`
            )
            .join('')}
        </div>
      </div></body></html>`,
      1280,
      800,
      path.join(OUT_DIR, '03-themes-and-appearance.png')
    );

    // =========================================================================
    // SCREENSHOT 4 (1280x800): Right Floating Panel & Multi-Window Workspaces
    // =========================================================================
    await renderGraphic(
      browser,
      `<!doctype html><html><head><style>${BASE_CSS}</style></head><body>
      <div class="canvas">
        <div class="orb" style="width:700px;height:560px;left:-140px;top:-120px;background:radial-gradient(circle,#8b5cf63f 0%,transparent 70%)"></div>
        <div class="orb" style="width:700px;height:560px;right:-140px;bottom:-150px;background:radial-gradient(circle,#10b9813a 0%,transparent 70%)"></div>
        <div class="grid"></div>
        <div class="header">
          <div class="eyebrow" style="background:rgba(139,92,246,0.18);border:1px solid rgba(139,92,246,0.5);color:#c4b5fd;">
            <span class="dot" style="background:#a78bfa;box-shadow:0 0 8px #a78bfa"></span>
            POWER-USER LAYOUTS &amp; MULTI-WINDOW
          </div>
          <h1><span class="grad" style="background-image:linear-gradient(120deg,#a78bfa,#34d399)">Right Floating Panel</span> &amp; Multi-Window</h1>
          <div class="sub">Compact left sections, slide-out right space panel &amp; live multi-window indicators</div>
        </div>

        <div style="position:relative;z-index:20;display:flex;align-items:center;justify-content:center;gap:22px;margin-top:26px;padding:0 28px;">
          <!-- Left: Right Floating Panel -->
          <div style="display:flex;flex-direction:column;align-items:center;gap:9px;">
            <div style="padding:4px 12px;border-radius:999px;background:rgba(139,92,246,0.18);border:1px solid rgba(139,92,246,0.5);font-size:11px;font-weight:800;color:#d8b4fe;">
              SLIDE-OUT RIGHT FLOATING PANEL
            </div>
            <div class="window" style="width:620px;border:1.5px solid rgba(139,92,246,0.6);box-shadow:0 24px 70px rgba(0,0,0,0.82),0 0 40px rgba(139,92,246,0.22)">
              <div class="chrome-bar" style="height:28px;">
                <div style="display:flex;align-items:flex-end;gap:7px;height:100%;">
                  <div class="lights"><span style="background:#ff5f56"></span><span style="background:#ffbd2e"></span><span style="background:#27c93f"></span></div>
                  <div class="tab-active" style="height:22px;font-size:10px;border-top:1.5px solid #8b5cf6;">🚀 Product Launch — SpaceTabs</div>
                </div>
              </div>
              <img src="${img.rightPanel}" style="width:620px;height:349px;object-fit:cover;display:block;" />
            </div>
          </div>

          <!-- Right: Stacked Dual Multi-Window -->
          <div style="display:flex;flex-direction:column;align-items:center;gap:9px;">
            <div style="padding:4px 12px;border-radius:999px;background:rgba(16,185,129,0.16);border:1px solid rgba(16,185,129,0.5);font-size:11px;font-weight:800;color:#6ee7b7;">
              MULTIPLE WINDOWS SYNCED LIVE (🟢 THIS • 🟣 OTHER)
            </div>
            <div style="position:relative;width:576px;height:380px;">
              <div class="window" style="position:absolute;left:0;top:0;width:470px;border:1.5px solid rgba(16,185,129,0.58);box-shadow:0 18px 50px rgba(0,0,0,0.8)">
                <div class="chrome-bar" style="height:25px;">
                  <div style="display:flex;align-items:flex-end;gap:6px;height:100%;">
                    <div class="lights"><span style="background:#ff5f56"></span><span style="background:#ffbd2e"></span><span style="background:#27c93f"></span></div>
                    <div class="tab-active" style="height:20px;font-size:9.5px;border-top:1.5px solid #10b981;">Window 1: 🚀 Product Launch</div>
                  </div>
                </div>
                <img src="${img.win1}" style="width:470px;height:264px;object-fit:cover;display:block;" />
              </div>

              <div class="window" style="position:absolute;right:0;bottom:0;width:470px;border:1.5px solid rgba(168,85,247,0.68);box-shadow:0 24px 65px rgba(0,0,0,0.92),0 0 36px rgba(168,85,247,0.28)">
                <div class="chrome-bar" style="height:25px;">
                  <div style="display:flex;align-items:flex-end;gap:6px;height:100%;">
                    <div class="lights"><span style="background:#ff5f56"></span><span style="background:#ffbd2e"></span><span style="background:#27c93f"></span></div>
                    <div class="tab-active" style="height:20px;font-size:9.5px;border-top:1.5px solid #a855f7;">Window 2: 🔥 AI Research</div>
                  </div>
                </div>
                <img src="${img.win2}" style="width:470px;height:264px;object-fit:cover;display:block;" />
              </div>
            </div>
          </div>
        </div>

        <div class="pill-row">
          <div class="pill" style="border:1px solid rgba(167,139,250,0.45)"><span class="dot" style="background:#a78bfa"></span>Right Floating Panel Mode</div>
          <div class="pill" style="border:1px solid rgba(52,211,153,0.45)"><span class="dot" style="background:#34d399"></span>Open Spaces in Separate Windows (Ctrl+Click)</div>
          <div class="pill" style="border:1px solid rgba(56,189,248,0.45)"><span class="dot" style="background:#38bdf8"></span>Dynamic Per-Window Titles</div>
        </div>
      </div></body></html>`,
      1280,
      800,
      path.join(OUT_DIR, '04-right-panel-and-multiwindow.png')
    );

    // =========================================================================
    // SCREENSHOT 5 (1280x800): Memory Saver + Private Google Drive Sync + Zero Paywalls
    // =========================================================================
    await renderGraphic(
      browser,
      `<!doctype html><html><head><style>${BASE_CSS}</style></head><body>
      <div class="canvas">
        <div class="orb" style="width:720px;height:560px;left:-140px;top:-140px;background:radial-gradient(circle,#06b6d43e 0%,transparent 70%)"></div>
        <div class="orb" style="width:720px;height:560px;right:-140px;bottom:-160px;background:radial-gradient(circle,#10b9813d 0%,transparent 70%)"></div>
        <div class="grid"></div>
        <div class="header">
          <div class="eyebrow" style="background:rgba(6,182,212,0.16);border:1px solid rgba(6,182,212,0.45);color:#22d3ee;">
            <span class="dot" style="background:#06b6d4;box-shadow:0 0 8px #06b6d4"></span>
            PERFORMANCE &amp; PRIVACY FIRST
          </div>
          <h1>Save <span class="grad" style="background-image:linear-gradient(120deg,#22d3ee,#34d399)">80% RAM.</span> Sync Privately via Drive.</h1>
          <div class="sub">Zero tab loss Chromium discarding + direct personal Google Drive backup — zero middleman servers</div>
        </div>

        <div style="position:relative;z-index:20;display:flex;justify-content:center;gap:24px;margin-top:26px;padding:0 34px;">
          <!-- Left: Memory Saver -->
          <div class="window" style="width:592px;border:1.5px solid rgba(6,182,212,0.58);box-shadow:0 26px 75px rgba(0,0,0,0.84),0 0 42px rgba(6,182,212,0.2)">
            <div class="chrome-bar" style="height:30px;">
              <div class="lights"><span style="background:#ff5f56"></span><span style="background:#ffbd2e"></span><span style="background:#27c93f"></span></div>
              <div style="align-self:center;font-size:11px;font-weight:700;color:#22d3ee;">⚡ Chromium Native Memory Saver</div>
              <div style="width:28px"></div>
            </div>
            <div style="width:592px;height:446px;overflow:hidden;background:#0a0f1f;">
              <img src="${img.memory}" style="width:800px;height:450px;object-fit:cover;transform:translate(-112px, 0px);display:block;" />
            </div>
          </div>

          <!-- Right: Private Google Drive Sync -->
          <div class="window" style="width:592px;border:1.5px solid rgba(16,185,129,0.58);box-shadow:0 26px 75px rgba(0,0,0,0.84),0 0 42px rgba(16,185,129,0.2)">
            <div class="chrome-bar" style="height:30px;">
              <div class="lights"><span style="background:#ff5f56"></span><span style="background:#ffbd2e"></span><span style="background:#27c93f"></span></div>
              <div style="align-self:center;font-size:11px;font-weight:700;color:#34d399;">☁️ Direct Google Drive Cloud Backup</div>
              <div style="width:28px"></div>
            </div>
            <div style="width:592px;height:446px;overflow:hidden;background:#0a0f1f;">
              <img src="${img.drive}" style="width:800px;height:450px;object-fit:cover;transform:translate(-112px, 0px);display:block;" />
            </div>
          </div>
        </div>

        <div class="pill-row">
          <div class="pill" style="border:1px solid rgba(34,211,238,0.45)"><span class="dot" style="background:#22d3ee"></span>Zero Tab Loss Auto-Suspend</div>
          <div class="pill" style="border:1px solid rgba(52,211,153,0.45)"><span class="dot" style="background:#34d399"></span>Direct Google Drive (drive.file)</div>
          <div class="pill" style="border:1px solid rgba(251,113,133,0.45)"><span class="dot" style="background:#fb7185"></span>100% Free &amp; Open Source (GPL-3.0)</div>
        </div>
      </div></body></html>`,
      1280,
      800,
      path.join(OUT_DIR, '05-memory-saver-and-drive-sync.png')
    );

    // =========================================================================
    // SMALL PROMO TILE (440x280): Chrome Web Store Search Card
    // =========================================================================
    await renderGraphic(
      browser,
      `<!doctype html><html><head><style>${BASE_CSS}</style></head><body>
      <div class="canvas" style="display:flex;flex-direction:column;justify-content:space-between;padding:22px 24px;">
        <div class="orb" style="width:320px;height:260px;left:-90px;top:-90px;background:radial-gradient(circle,#f43f5e55 0%,transparent 70%)"></div>
        <div class="orb" style="width:320px;height:260px;right:-90px;bottom:-90px;background:radial-gradient(circle,#8b5cf650 0%,transparent 70%)"></div>
        <div class="grid" style="background-size:28px 28px;"></div>

        <!-- Subtle angled UI preview peeking on right -->
        <div style="position:absolute;right:-85px;bottom:-35px;width:270px;height:165px;border-radius:12px;overflow:hidden;border:1.5px solid rgba(139,92,246,0.65);transform:rotate(-8deg);box-shadow:0 16px 40px rgba(0,0,0,0.85);opacity:0.92;">
          <img src="${img.purple}" style="width:100%;height:100%;object-fit:cover;display:block;" />
        </div>

        <div style="position:relative;z-index:10;display:flex;align-items:center;gap:13px;">
          ${LOGO_SVG(54)}
          <div>
            <div style="font-size:28px;font-weight:900;letter-spacing:-0.04em;line-height:1;color:#fff;">SpaceTabs</div>
            <div style="font-size:12px;font-weight:700;color:#fda4af;margin-top:4px;letter-spacing:0.04em;text-transform:uppercase;">Tab &amp; Workspace Manager</div>
          </div>
        </div>

        <div style="position:relative;z-index:10;max-width:245px;">
          <div style="font-size:16px;font-weight:800;line-height:1.25;color:#f8fafc;margin-bottom:10px;">
            Unlimited Spaces.<br/>
            <span class="grad" style="background-image:linear-gradient(90deg,#34d399,#38bdf8)">Zero Paywalls.</span>
          </div>
          <div style="display:flex;flex-wrap:wrap;gap:5px;">
            <span style="padding:3px 8px;border-radius:999px;background:rgba(16,185,129,0.2);border:1px solid rgba(16,185,129,0.5);font-size:10px;font-weight:700;color:#6ee7b7;">RAM Saver</span>
            <span style="padding:3px 8px;border-radius:999px;background:rgba(56,189,248,0.2);border:1px solid rgba(56,189,248,0.5);font-size:10px;font-weight:700;color:#7dd3fc;">Drive Sync</span>
            <span style="padding:3px 8px;border-radius:999px;background:rgba(167,139,250,0.2);border:1px solid rgba(167,139,250,0.5);font-size:10px;font-weight:700;color:#ddd6fe;">14 Themes</span>
          </div>
        </div>
      </div></body></html>`,
      440,
      280,
      path.join(OUT_DIR, 'promo-tile-small-440x280.png')
    );

    // =========================================================================
    // MARQUEE PROMO TILE (1400x560): Chrome Web Store Hero Featured Banner
    // =========================================================================
    await renderGraphic(
      browser,
      `<!doctype html><html><head><style>${BASE_CSS}</style></head><body>
      <div class="canvas" style="display:flex;align-items:center;justify-content:space-between;padding:0 64px;">
        <div class="orb" style="width:760px;height:560px;left:-140px;top:-120px;background:radial-gradient(circle,#f43f5e48 0%,transparent 70%)"></div>
        <div class="orb" style="width:760px;height:560px;right:-100px;bottom:-140px;background:radial-gradient(circle,#8b5cf64a 0%,transparent 70%)"></div>
        <div class="grid"></div>

        <!-- Left Hero Copy -->
        <div style="position:relative;z-index:20;max-width:590px;">
          <div style="display:flex;align-items:center;gap:18px;margin-bottom:20px;">
            ${LOGO_SVG(78)}
            <div>
              <div style="font-size:52px;font-weight:900;letter-spacing:-0.04em;line-height:1;color:#fff;">SpaceTabs</div>
              <div style="font-size:15px;font-weight:800;color:#fda4af;letter-spacing:0.1em;text-transform:uppercase;margin-top:6px;">Tab &amp; Workspace Manager</div>
            </div>
          </div>

          <div style="font-size:30px;font-weight:800;letter-spacing:-0.025em;line-height:1.22;color:#f1f5f9;margin-bottom:22px;">
            Local-first, unlimited workspaces.<br/>
            <span class="grad" style="background-image:linear-gradient(90deg,#34d399,#38bdf8,#c084fc)">Free forever — zero paywalls.</span>
          </div>

          <div style="display:flex;flex-wrap:wrap;gap:10px;">
            <div class="pill" style="border:1px solid rgba(52,211,153,0.5);font-size:13px;"><span class="dot" style="background:#34d399"></span>Smart RAM Saver</div>
            <div class="pill" style="border:1px solid rgba(56,189,248,0.5);font-size:13px;"><span class="dot" style="background:#38bdf8"></span>Google Drive Sync</div>
            <div class="pill" style="border:1px solid rgba(167,139,250,0.5);font-size:13px;"><span class="dot" style="background:#a78bfa"></span>14 Curated Themes</div>
            <div class="pill" style="border:1px solid rgba(251,113,133,0.5);font-size:13px;"><span class="dot" style="background:#fb7185"></span>Notes, Tasks &amp; Multi-Window</div>
          </div>
        </div>

        <!-- Right 3D Fanned Theme Stack -->
        <div style="position:relative;z-index:20;width:660px;height:460px;">
          <div class="window" style="position:absolute;right:0;top:6px;width:440px;border:1.5px solid rgba(244,63,94,0.62);transform:rotate(5deg);box-shadow:0 24px 60px rgba(0,0,0,0.8)">
            <img src="${img.sakura}" style="width:440px;height:248px;object-fit:cover;display:block;" />
          </div>
          <div class="window" style="position:absolute;left:18px;top:36px;width:470px;border:1.5px solid rgba(16,185,129,0.6);transform:rotate(-4deg);box-shadow:0 24px 65px rgba(0,0,0,0.85)">
            <img src="${img.emerald}" style="width:470px;height:264px;object-fit:cover;display:block;" />
          </div>
          <div class="window" style="position:absolute;left:64px;bottom:8px;width:540px;z-index:10;border:1.5px solid rgba(139,92,246,0.75);box-shadow:0 32px 90px rgba(0,0,0,0.92),0 0 55px rgba(139,92,246,0.35)">
            <div class="chrome-bar" style="height:26px;">
              <div style="display:flex;align-items:flex-end;gap:6px;height:100%;">
                <div class="lights"><span style="background:#ff5f56"></span><span style="background:#ffbd2e"></span><span style="background:#27c93f"></span></div>
                <div class="tab-active" style="height:20px;font-size:10px;border-top:1.5px solid #8b5cf6;">🚀 Product Launch — SpaceTabs</div>
              </div>
            </div>
            <img src="${img.purple}" style="width:540px;height:304px;object-fit:cover;display:block;" />
          </div>
        </div>
      </div></body></html>`,
      1400,
      560,
      path.join(OUT_DIR, 'promo-tile-marquee-1400x560.png')
    );
  } finally {
    await browser.close();
  }

  console.log(`\nAll Chrome Web Store assets generated in: ${OUT_DIR}`);
}

main().catch((err) => {
  console.error('Store assets generation failed:', err);
  process.exit(1);
});
