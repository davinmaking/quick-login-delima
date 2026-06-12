// Zips launcher/ into site/muat-turun/quick-login-delima.zip using fflate
// (pure JS, ESM, no native deps) so it builds in Cloudflare CI. Run: node tools/build-zip.mjs
import { zipSync } from "fflate";
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, relative, sep } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const launcher = join(root, "launcher");
const outDir = join(root, "site", "muat-turun");

function collect(dir, files = {}) {
  for (const name of readdirSync(dir)) {
    if (name === ".DS_Store") continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) collect(full, files);
    else files[relative(launcher, full).split(sep).join("/")] = new Uint8Array(readFileSync(full));
  }
  return files;
}

const files = collect(launcher);
const zipped = zipSync(files, { level: 9 });
mkdirSync(outDir, { recursive: true });
const out = join(outDir, "quick-login-delima.zip");
writeFileSync(out, zipped);
console.log("built", out, `(${zipped.length} bytes, ${Object.keys(files).length} files)`);
