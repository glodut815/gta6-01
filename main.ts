// Sunspire Bay — The Meridian Job: the entry program for make.fun gta6-01.
//
// Node 22, standard library only. It takes the game (game/) and the
// screenshots (screenshots/) that sit beside this file, copies them into the
// output directory, and writes /output/dossier.json with the vendored
// make.fun library — the summary the judge reads.
//
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Fail early with a plain message when an input is missing, instead of
// writing a half-empty output directory the gate would reject later.
if (!existsSync(join(here, 'game', 'index.html'))) {
  throw new Error('missing game/index.html — nothing to package');
}
const shotDir = join(here, 'screenshots');
if (!existsSync(shotDir)) {
  throw new Error('missing screenshots/ — the entry needs 1-4 screenshots');
}
const shots = readdirSync(shotDir).filter((f) => /\.jpe?g$/i.test(f));
if (shots.length === 0 || shots.length > 4) {
  throw new Error(`screenshots/ must hold 1-4 JPEGs, found ${shots.length}`);
}
for (const f of shots) {
  if (statSync(join(shotDir, f)).size > 262144) {
    throw new Error(`screenshot ${f} is over the 256 KiB limit`);
  }
}

// Start from a clean output directory so a second run writes the same bytes.
// Never remove the output directory itself: in the grader it is a mounted
// volume (/output), and rmSync on a mount point throws EBUSY ("Device or
// resource busy") even with force:true. Empty its contents instead.
mkdirSync(outDir, { recursive: true });
for (const f of readdirSync(outDir)) {
  rmSync(join(outDir, f), { recursive: true, force: true });
}

// The game itself: plain static files, no build step, no network.
cpSync(join(here, 'game'), join(outDir, 'game'), { recursive: true });

// The screenshots, first by name is the cover.
mkdirSync(join(outDir, 'screenshots'), { recursive: true });
cpSync(shotDir, join(outDir, 'screenshots'), { recursive: true });

// The dossier the gate checks byte for byte. Caps come from the competition's
// own limits: at most 4 screenshots of 256 KiB, game/ at most 993 files and
// 48 MiB, the dossier text at most 160 KiB.
const dossier = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(join(outDir, 'dossier.json'), dossier);
console.log(`Sunspire Bay packaged: ${shots.length} screenshot(s), dossier ${dossier.length} bytes -> ${outDir}`);
