/**
 * @pdfstart/report — render contract snapshot (package side).
 *
 * Zero test-framework dependency: plain node assertions that pin the
 * published surface:
 *   - TEMPLATE_IDS in src/web.ts is exactly the 2 committed template IDs
 *   - the font policy in @pdfstart/core covers the 7 committed languages
 *     (en/de/es/fr/ja/ko/nl) plus zh as an extension language, with the CJK
 *     families (zh/ja/ko) explicitly registered (Noto Sans CJK SC/JP/KR,
 *     Regular + Bold) and the latin languages relying on engine fallback
 *     (no fetch) — so CJK documents never show missing glyphs.
 *
 * These are the same invariants the site-side snapshot checks against the
 * full engine, asserted here against the surface this package ships.
 *
 * Run: pnpm run snapshot
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const fail = (msg) => {
  console.error('FAIL: ' + msg);
  process.exit(1);
};
const check = (cond, okMsg) => {
  if (!cond) fail(okMsg);
  console.log('ok - ' + okMsg);
};

// --- 1. TEMPLATE_IDS from src/web.ts (static extraction, no build) ---
const webSrc = readFileSync(join(here, '../src/web.ts'), 'utf8');
const idMatch = webSrc.match(/export const TEMPLATE_IDS\s*=\s*\[([^\]]+)\]/);
check(!!idMatch, 'web.ts exposes TEMPLATE_IDS');
const templateIds = idMatch[1]
  .split(',')
  .map((s) => s.trim().replace(/^['"]|['"]$/g, ''))
  .filter(Boolean);
console.log('   TEMPLATE_IDS = ' + JSON.stringify(templateIds));
check(
  JSON.stringify(templateIds) === JSON.stringify(['modern-tech', 'classic-editorial']),
  'TEMPLATE_IDS is exactly [modern-tech, classic-editorial]'
);
for (const id of templateIds) {
  check(webSrc.includes(id), 'template "' + id + '" is inlined into the web entry');
}

// --- 2. Font policy from @pdfstart/core/src/fonts.ts ---
const fontsSrc = readFileSync(join(here, '../../core/src/fonts.ts'), 'utf8');
const langMatch = fontsSrc.match(/export type LangCode\s*=\s*(.+?);/);
check(!!langMatch, 'core fonts module defines the committed language set');
const langs = langMatch[1].split(/[|,]/).map((t) => t.replace(/[^a-z]/g, '')).filter((t) => t.length === 2);
console.log('   LangCode = ' + JSON.stringify(langs));
for (const code of ['en', 'de', 'es', 'fr', 'ja', 'ko', 'nl']) {
  check(langs.includes(code), 'committed language ' + code + ' is supported');
}
check(langs.includes('zh'), 'zh is available as an extension language');

// CJK families must be explicitly registered (fetch + register).
check(fontsSrc.includes('CJK_FONTS'), 'core exposes an explicit CJK font table');
const cjkFamilies = {
  zh: 'Noto Sans CJK SC',
  ja: 'Noto Sans CJK JP',
  ko: 'Noto Sans CJK KR',
};
for (const [lang, family] of Object.entries(cjkFamilies)) {
  const start = fontsSrc.indexOf(lang + ': [');
  check(start !== -1, lang + ' has an explicit font entry in the CJK table');
  const section = fontsSrc.slice(start, start + 900);
  check(
    section.includes(family) && section.includes('-Regular.otf') && section.includes('-Bold.otf'),
    lang + ' explicitly registers ' + family + ' (Regular + Bold)'
  );
}

// Latin languages are NOT fetch entries: the policy is engine fallback.
const fetchTable = fontsSrc.slice(fontsSrc.indexOf('CJK_FONTS'));
for (const code of ['en', 'de', 'es', 'fr', 'nl']) {
  check(!(fetchTable.indexOf(code + ': [') !== -1), code + ' has no font fetch entry (engine fallback)');
}

console.log('');
console.log('PASS - @pdfstart/report render contract snapshot holds.');
