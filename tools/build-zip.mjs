// Zips launcher/ into site/muat-turun/quick-login-delima.zip (the installer the site serves).
// Pure-Node (archiver) so it runs in CI without a system `zip`. Run: node tools/build-zip.mjs
import archiver from "archiver";
import { createWriteStream, mkdirSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const launcher = join(root, "launcher");
const outDir = join(root, "site", "muat-turun");
const out = join(outDir, "quick-login-delima.zip");

mkdirSync(outDir, { recursive: true });
rmSync(out, { force: true });

const output = createWriteStream(out);
const archive = archiver("zip", { zlib: { level: 9 } });

output.on("close", () => console.log("built", out, `(${archive.pointer()} bytes)`));
archive.on("warning", (err) => { throw err; });
archive.on("error", (err) => { throw err; });

archive.pipe(output);
// add launcher/ contents at the zip root; skip macOS junk
archive.glob("**/*", { cwd: launcher, dot: false, ignore: ["**/.DS_Store", "**/__MACOSX/**"] });
await archive.finalize();
