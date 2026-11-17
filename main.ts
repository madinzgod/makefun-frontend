// Hand-in program for the makefun-frontend-01 entry (Node 22, standard library only).
// Copies app/ and screenshots/ from this repository into the output directory
// (MAKEFUN_OUTPUT_DIR, or /output on the grader) and writes dossier.json there with
// buildDossier from the vendored kit library, under the scorer's own caps, so the
// dossier handed in is byte for byte the one the scorer rebuilds from the same files.
import { cpSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const repo = dirname(fileURLToPath(import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR || '/output';

for (const name of ['app', 'screenshots']) {
  rmSync(join(out, name), { recursive: true, force: true });
  cpSync(join(repo, name), join(out, name), { recursive: true });
}

writeFileSync(join(out, 'dossier.json'), buildDossier(out, {
  text_max_bytes: 163840,
  screenshots: { max: 3, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 16777216,
}));
