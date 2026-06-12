// Zips launcher/ into site/muat-turun/quick-login-delima.zip (the installer the site serves).
// Uses the system `zip` so there is no npm dependency. Run: node tools/build-zip.mjs
import { execSync } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "site", "muat-turun", "quick-login-delima.zip");

mkdirSync(join(root, "site", "muat-turun"), { recursive: true });
rmSync(out, { force: true });
execSync(`cd "${root}/launcher" && zip -r -X "${out}" . -x '.DS_Store' -x '__MACOSX/*'`, {
  stdio: "inherit",
});
console.log("built", out);
