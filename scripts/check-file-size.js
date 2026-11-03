import fs from 'node:fs';
import path from 'node:path';

const WARN_THRESHOLD = 400;
const ERROR_THRESHOLD = 600;

/**
 * Temporary ceiling for existing monolithic files before they are split in Phases 4–5.
 * Entries are removed as each file is modularized below 600 lines.
 */
const BASELINE_LIMITS = {
  'src/components/modals/SettingsModal.tsx': 2600,
  'src/components/sidebar/Sidebar.tsx': 1460,
  'src/services/driveSync.ts': 1370,
  'src/components/canvas/NotesView.tsx': 1070,
  'src/components/canvas/ResourcesView.tsx': 990,
};

function walkDir(dir, results = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkDir(fullPath, results);
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      results.push(fullPath);
    }
  }
  return results;
}

const files = walkDir(path.resolve('src'));
let hasError = false;
const warnings = [];

for (const file of files) {
  const relPath = path.relative(process.cwd(), file).replace(/\\/g, '/');
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n').length;
  const baselineMax = BASELINE_LIMITS[relPath];

  if (baselineMax !== undefined) {
    if (lines > baselineMax) {
      console.error(
        `[FAIL] ${relPath}: ${lines} lines exceeds baseline ceiling (${baselineMax} lines)`
      );
      hasError = true;
    } else if (lines <= ERROR_THRESHOLD) {
      console.log(
        `[INFO] ${relPath}: ${lines} lines is now <= ${ERROR_THRESHOLD} (can be removed from BASELINE_LIMITS)`
      );
    }
    continue;
  }

  if (lines > ERROR_THRESHOLD) {
    console.error(
      `[FAIL] ${relPath}: ${lines} lines exceeds max threshold (${ERROR_THRESHOLD} lines)`
    );
    hasError = true;
  } else if (lines > WARN_THRESHOLD) {
    warnings.push(`[WARN] ${relPath}: ${lines} lines (warn threshold: ${WARN_THRESHOLD})`);
  }
}

for (const w of warnings) {
  console.warn(w);
}

if (hasError) {
  process.exit(1);
} else {
  console.log(`[OK] File size check passed (${files.length} files scanned in src/).`);
}
