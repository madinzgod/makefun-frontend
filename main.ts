// Hand-in driver for the makefun-frontend-01 entry.
//
// Copies app/ and screenshots/ from this repository into the output
// directory (MAKEFUN_OUTPUT_DIR, or /output under the grader) and writes
// the dossier the vendored library builds from them to dossier.json.
// The output depends only on the copied files, so two runs of this
// program write the same bytes.

import { cpSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

const dossier = buildDossier(out, {
  text_max_bytes: 163840,
  screenshots: { max: 3, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 16777216,
  app_path_max_bytes: 1000,
});
writeFileSync(join(out, 'dossier.json'), dossier);

// Print the dossier's Load Totals line so a run shows the entry's weight.
function findTotals(value: unknown): string | null {
  if (typeof value === 'string') {
    const line = value.split('\n').find((l) => l.startsWith('Totals:'));
    return line ?? null;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findTotals(item);
      if (found) return found;
    }
  } else if (value && typeof value === 'object') {
    for (const item of Object.values(value)) {
      const found = findTotals(item);
      if (found) return found;
    }
  }
  return null;
}

const parsed: unknown = JSON.parse(new TextDecoder().decode(dossier));
console.log(findTotals(parsed) ?? 'dossier written');
console.log('dossier.json: ' + dossier.length + ' bytes in ' + out);
