// Hand-in program for the makefun-frontend-01 entry (Node >= 22, standard library
// only; Node runs this TypeScript directly by type stripping).
//
// The frontend itself is the static app/ folder beside this file: plain HTML, CSS
// and ES modules with no build step, reading make.fun's public API. This program
// copies app/ and screenshots/ into the output directory (MAKEFUN_OUTPUT_DIR,
// default /output) and writes dossier.json there with the vendored library —
// byte for byte what the scorer rebuilds, so vendor/makefun-frontend.ts must
// stay exactly as the kit shipped it.
//
// Local check:  mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(join(out, 'app'), { recursive: true });
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });

mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

// The scorer's caps: at most 3 screenshots of 256 KiB, at most 993 files and
// directories or 16 MiB under app/; text_max_bytes is the one that shapes bytes.
const dossier = buildDossier(out, {
  text_max_bytes: 163840,
  screenshots: { max: 3, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 16777216,
});
writeFileSync(join(out, 'dossier.json'), dossier);
