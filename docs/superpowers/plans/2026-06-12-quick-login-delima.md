# Quick Login DELIMa — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship "Quick Login DELIMa" — a rebranded no-admin login launcher plus a public static website (`quicklogin.davinhub.com`) where any Malaysian teacher generates their own class roster in-browser and downloads a ready-to-install package, with student PII never leaving their machine.

**Architecture:** One repo, two artifacts. (1) `launcher/` — the existing `makmal-komputer/login-launcher` file:// launcher, rebranded (name/logo/icon), shipping only an EXAMPLE roster. (2) `site/` — pure static HTML/CSS/JS on Cloudflare Pages (mirrors `smis-helper-site`), including a client-side roster generator (SheetJS) that converts a teacher's DELIMa `.xlsx` into `roster.js` locally. A Node script zips `launcher/` into the downloadable installer the site serves.

**Tech Stack:** Static HTML/CSS/JS (no framework, no build for the site — matches `smis-helper-site`); SheetJS (`xlsx`) via CDN for in-browser parsing; Windows `.bat` for install; Node only for the zip build + one parser unit test; Cloudflare Pages auto-deploy on push to `main`.

**PII RULE (CRITICAL, non-negotiable):** This repo is PUBLIC. NEVER commit a real roster, real names, or real emails. `launcher/data/roster.js` ships as FAKE example data only. The generator runs 100% client-side — the uploaded `.xlsx` and the generated `roster.js` never touch a server.

**Source references (read before implementing):**
- Launcher to rebrand: `/Users/davins/Developer/makmal-komputer/login-launcher/` (`index.html`, `pasang.bat`, `nyahpasang.bat`)
- Parser to port: `/Users/davins/Developer/makmal-komputer/login-launcher/build-roster-xlsx.py`
- Site pattern to mirror: `/Users/davins/Developer/smis-helper-site/` (static HTML, `_headers`, Cloudflare Pages, `smis.davinhub.com` via CNAME → `*.pages.dev`)
- Logo assets already produced: `assets/quicklogin.ico`, `assets/logo-master.png` (transparent), `assets/logo-512.png`

---

## File Structure

```
quick-login-delima/
├── CLAUDE.md                  # project rules (PII, deploy, gotchas)
├── PRODUCT.md                 # one-pager: problem, audience, scope
├── README.md
├── .gitignore                 # dist/*.zip build output, .DS_Store
├── assets/                    # brand master assets (logo .ico/.png) [exists]
├── launcher/                  # the downloadable, installable launcher
│   ├── index.html             # rebranded launcher UI
│   ├── data/roster.js         # EXAMPLE roster only (fake names) — shipped
│   ├── pasang.bat             # install (no admin): copy + desktop icon (incognito)
│   ├── nyahpasang.bat         # uninstall
│   ├── quicklogin.ico         # desktop-shortcut icon
│   └── BACA-SAYA.txt          # BM quick start for the teacher
├── site/                      # Cloudflare Pages root (public site)
│   ├── index.html             # landing: problem → how it works → download
│   ├── jana.html              # roster generator (upload xlsx → roster.js)
│   ├── panduan.html           # BM install guide
│   ├── privacy.html
│   ├── js/jana.js             # parser (port of build-roster-xlsx.py)
│   ├── _headers               # Cloudflare Pages headers
│   ├── robots.txt
│   ├── sitemap.xml
│   ├── favicon.png            # 32px from logo
│   ├── icon-512.png           # logo (PWA/og)
│   ├── og-image.png           # 1200×630 social card
│   └── muat-turun/quick-login-delima.zip  # installer (built, gitignored if large)
├── tools/
│   └── build-zip.mjs          # zips launcher/ → site/muat-turun/quick-login-delima.zip
└── tests/
    └── parser.test.mjs        # Node test for the parser logic (shared with jana.js)
```

---

## Task 0: Scaffold project + git + docs

**Files:**
- Create: `CLAUDE.md`, `PRODUCT.md`, `README.md`, `.gitignore`
- Move: `assets/quicklogin.ico` → also copy to `launcher/quicklogin.ico` (done in Task 1)

- [ ] **Step 1: Write `PRODUCT.md`**

```markdown
# Quick Login DELIMa

**Problem:** On shared school computers, pupils (6–12) waste class time typing
their long MOE/DELIMa email every login, and often mistype it. Teachers want a
fast, no-admin way for each pupil to log into their own Google/DELIMa account.

**Solution:** A name-board launcher — pupil taps their name, email is pre-filled,
they type only the password, lands in Google Classroom (or AINS NILAM via SSO).
Runs from a desktop "Quick Login" icon in Chrome incognito (clean slate between
pupils). No admin rights, no registry policy.

**Audience:** Malaysian primary-school teachers (BM-first). Each teacher installs
on their lab/class computers with their own class list.

**Distribution:** quicklogin.davinhub.com — landing + in-browser roster generator
(upload DELIMa xlsx → download roster.js) + installer download. PII stays local.

**Register:** product (tool) for the launcher; brand/marketing for the site.
```

- [ ] **Step 2: Write `CLAUDE.md`** (PII rule front-and-centre, deploy, gotchas — adapt from `makmal-komputer/CLAUDE.md` launcher gotchas: file:// only, no fetch/build, `continue=` Google-domain only, no-admin incognito model, `...\Policies` registry is admin-only so we don't use it). State this repo is PUBLIC and ships only example roster.

- [ ] **Step 3: Write `.gitignore`**

```
.DS_Store
node_modules/
site/muat-turun/*.zip
*.bak-*
```

- [ ] **Step 4: `git init` + first commit**

```bash
cd ~/Developer/quick-login-delima
git init -b main
git add CLAUDE.md PRODUCT.md README.md .gitignore assets/
git commit -m "chore: scaffold Quick Login DELIMa project + brand assets"
```
Expected: clean commit, no roster files staged.

---

## Task 1: Rebrand the launcher

**Files:**
- Copy from `makmal-komputer/login-launcher/` → `launcher/`: `index.html`, `pasang.bat`, `nyahpasang.bat`
- Create: `launcher/data/roster.js` (EXAMPLE, fake), `launcher/quicklogin.ico`, `launcher/BACA-SAYA.txt`

- [ ] **Step 1: Copy launcher files**

```bash
cd ~/Developer/quick-login-delima
mkdir -p launcher/data
cp ~/Developer/makmal-komputer/login-launcher/index.html launcher/index.html
cp ~/Developer/makmal-komputer/login-launcher/pasang.bat launcher/pasang.bat
cp ~/Developer/makmal-komputer/login-launcher/nyahpasang.bat launcher/nyahpasang.bat
cp assets/quicklogin.ico launcher/quicklogin.ico
```

- [ ] **Step 2: Write fake example roster** `launcher/data/roster.js` (so the shipped launcher renders without real data)

```javascript
// CONTOH sahaja — ganti dengan senarai kelas anda (jana di quicklogin.davinhub.com)
window.ROSTER = {
  "Tahun 1": [
    { "nama": "AINA BINTI AHMAD",   "email": "aina.contoh@moe-dl.edu.my" },
    { "nama": "BENG HUAT",          "email": "benghuat.contoh@moe-dl.edu.my" }
  ],
  "Tahun 2": [
    { "nama": "CHANDRAN A/L RAJU",  "email": "chandran.contoh@moe-dl.edu.my" }
  ]
};
```

- [ ] **Step 3: Rebrand `launcher/index.html`** — change `<title>` to `Quick Login DELIMa`, badge text `MAKMAL KOMPUTER` → `QUICK LOGIN`, footer to neutral wording. Keep all logic (name board, `loginUrl`, `CONTINUE_URL`, incognito flow) unchanged. Verify edits at `index.html` `<div class="badge">` and `<title>`.

- [ ] **Step 4: Update `launcher/pasang.bat`** — desktop shortcut name `LOG MASUK` → `Quick Login`, and point the icon at the bundled `.ico` instead of `chrome.exe`:

Change the shortcut line so the install copies `quicklogin.ico` (robocopy already copies the folder; it is NOT in the `/XF` exclude list, so it lands in `C:\login-launcher\`), and set:
```
$l.IconLocation='C:\login-launcher\quicklogin.ico'
```
Keep `--incognito --start-maximized` + `GetFolderPath('Desktop')`. Update `nyahpasang.bat` to remove the `Quick Login.lnk`.

- [ ] **Step 5: Write `launcher/BACA-SAYA.txt`** — 6-line BM quick start (double-click `pasang.bat`, no admin; uninstall with `nyahpasang.bat`; update names by replacing `data/roster.js`).

- [ ] **Step 6: Smoke-test the launcher locally**

```bash
open ~/Developer/quick-login-delima/launcher/index.html
```
Expected: name board renders with the 3 fake pupils; clicking a name → confirm card → would redirect to Google login. No console errors.

- [ ] **Step 7: Commit**

```bash
git add launcher/
git commit -m "feat: rebranded Quick Login DELIMa launcher with example roster + icon"
```

---

## Task 2: Installer ZIP build script

**Files:**
- Create: `tools/build-zip.mjs`, `package.json` (type module, one dep: `archiver` OR use system `zip`)

- [ ] **Step 1: Write `tools/build-zip.mjs`** — zip `launcher/` into `site/muat-turun/quick-login-delima.zip` (exclude `.DS_Store`). Prefer shelling to system `zip` to avoid a dep:

```javascript
import { execSync } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";
mkdirSync("site/muat-turun", { recursive: true });
rmSync("site/muat-turun/quick-login-delima.zip", { force: true });
execSync(
  `cd launcher && zip -r -X ../site/muat-turun/quick-login-delima.zip . -x '.DS_Store' -x '__MACOSX'`,
  { stdio: "inherit" }
);
console.log("built site/muat-turun/quick-login-delima.zip");
```

- [ ] **Step 2: Run it + verify contents**

```bash
cd ~/Developer/quick-login-delima && node tools/build-zip.mjs
unzip -l site/muat-turun/quick-login-delima.zip
```
Expected: lists `index.html`, `pasang.bat`, `nyahpasang.bat`, `quicklogin.ico`, `data/roster.js`, `BACA-SAYA.txt`. NO real names.

- [ ] **Step 3: Commit** (`git add tools/ package.json` — the zip itself is gitignored; built at deploy).

---

## Task 3: Roster generator (the core) — `site/jana.html` + `site/js/jana.js`

Port `build-roster-xlsx.py` to client-side JS. Rules to preserve exactly:
- Read every sheet as array-of-arrays (no header).
- Skip sheet named `GURU` (case-insensitive).
- `Tahun{N}` sheet → class `Tahun {N}`; per row: col index 1 = nama, col 2 = email.
- `PRA` sheet → class `Prasekolah`; col 1 = nama, col 2 = email.
- `PPKI` sheet → two side-by-side blocks: `(nama=col1,email=col2)` and `(nama=col4,email=col5)`. For each block, class label = first text cell that has a name but NO email, is not `password`, and does not start with `(` → Title-Case it; class = `PPKI {label}`.
- `add()`: trim nama; lowercase+trim email; validate `^[^@\s]+@[^@\s]+\.[^@\s]+$`; skip empty/invalid (count dropped); dedupe by email across the whole file; store `{ nama: NAMA_UPPERCASE, email }`.
- Sort each class by `nama`.
- Output text: `// Dijana oleh Quick Login DELIMa — JANGAN edit manual\nwindow.ROSTER = <json indent 2, unicode kept>;\n`.

**Files:**
- Create: `site/js/jana.js` (exports `buildRoster(workbookSheets)` where `workbookSheets` is `{ sheetName: rows[][] }`), `site/jana.html`

- [ ] **Step 1: Write the parser** `site/js/jana.js` as a pure function (no DOM), so it is testable:

```javascript
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const cell = (row, i) => (row && row[i] != null ? String(row[i]).trim() : "");
const titleCase = (s) => s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

// sheets: { name: rows[][] }  → { roster, total, dropped }
export function buildRoster(sheets) {
  const roster = {}, seen = {};
  let dropped = 0;
  const add = (kelas, nama, email) => {
    nama = (nama || "").trim();
    email = (email || "").trim().toLowerCase();
    if (!nama || !EMAIL_RE.test(email)) { if (nama || email) dropped++; return; }
    if (seen[email]) { dropped++; return; }
    seen[email] = kelas;
    (roster[kelas] ||= []).push({ nama: nama.toUpperCase(), email });
  };
  for (const [name, rows] of Object.entries(sheets)) {
    const up = name.toUpperCase();
    if (up === "GURU") continue;
    if (up === "PPKI") {
      for (const [nc, ec] of [[1, 2], [4, 5]]) {
        let label = "PPKI";
        for (const r of rows) {
          const n = cell(r, nc), e = cell(r, ec);
          if (n && !e && !n.toLowerCase().includes("password") && !n.startsWith("(")) { label = titleCase(n); break; }
        }
        const kelas = `PPKI ${label}`;
        for (const r of rows) add(kelas, cell(r, nc), cell(r, ec));
      }
    } else if (up === "PRA") {
      for (const r of rows) add("Prasekolah", cell(r, 1), cell(r, 2));
    } else if (name.toLowerCase().startsWith("tahun")) {
      const kelas = `Tahun ${name.slice(5).trim()}`;
      for (const r of rows) add(kelas, cell(r, 1), cell(r, 2));
    }
  }
  for (const k of Object.keys(roster)) roster[k].sort((a, b) => a.nama.localeCompare(b.nama));
  const total = Object.values(roster).reduce((s, v) => s + v.length, 0);
  return { roster, total, dropped };
}

export function rosterToJs(roster) {
  return "// Dijana oleh Quick Login DELIMa — JANGAN edit manual\n" +
    "window.ROSTER = " + JSON.stringify(roster, null, 2) + ";\n";
}
```

- [ ] **Step 2: Write the test** `tests/parser.test.mjs` (Node built-in test runner; feed synthetic sheet arrays, assert classes/dedupe/skip):

```javascript
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildRoster } from "../site/js/jana.js";

test("parses Tahun, skips GURU + bad emails, dedupes", () => {
  const sheets = {
    Tahun1: [["1", "Ali Bin Abu", "ali@moe-dl.edu.my"], ["2", "Siti", "bad-email"]],
    GURU:   [["1", "Cikgu X", "x@moe-dl.edu.my"]],
    Tahun2: [["1", "Ali Bin Abu", "ali@moe-dl.edu.my"]], // dup email → dropped
  };
  const { roster, total, dropped } = buildRoster(sheets);
  assert.equal(total, 1);
  assert.equal(dropped, 2);
  assert.deepEqual(roster["Tahun 1"], [{ nama: "ALI BIN ABU", email: "ali@moe-dl.edu.my" }]);
  assert.ok(!("GURU" in roster));
});

test("PPKI two blocks with labels", () => {
  const sheets = { PPKI: [
    ["", "Sunshine", "",                 "", "Joyful", ""],
    ["", "Aiman",    "aiman@moe-dl.edu.my","", "Bala",  "bala@moe-dl.edu.my"],
  ]};
  const { roster } = buildRoster(sheets);
  assert.deepEqual(Object.keys(roster).sort(), ["PPKI Joyful", "PPKI Sunshine"]);
});
```

- [ ] **Step 3: Run the test, expect PASS**

```bash
cd ~/Developer/quick-login-delima && node --test
```
Expected: 2 tests pass.

- [ ] **Step 4: Write `site/jana.html`** — load SheetJS from CDN, file input (accept `.xlsx`), parse to `{name: rows}` via `XLSX.utils.sheet_to_json(ws,{header:1})`, call `buildRoster`, show per-class counts + dropped count, and a "Muat turun roster.js" button (Blob download). All client-side. Big BM headings, matches the launcher's sticker style. Add a clear "Data anda tidak dimuat naik ke mana-mana — semuanya berlaku dalam pelayar anda." note.

```html
<script src="https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js"></script>
<script type="module">
  import { buildRoster, rosterToJs } from "./js/jana.js";
  // on file change: const wb = XLSX.read(await file.arrayBuffer());
  // const sheets = {}; wb.SheetNames.forEach(n => sheets[n] = XLSX.utils.sheet_to_json(wb.Sheets[n], {header:1, raw:false}));
  // const { roster, total, dropped } = buildRoster(sheets); ... download rosterToJs(roster)
</script>
```

- [ ] **Step 5: Manual smoke** — preview `python3 -m http.server 8777` in `site/`, open `jana.html`, drop a real DELIMa xlsx (locally, not committed), confirm counts match the Python tool's output and `roster.js` downloads. Verify the download has no network request (DevTools Network tab empty for the file).

- [ ] **Step 6: Commit** `git add site/js/jana.js site/jana.html tests/ && git commit -m "feat: client-side roster generator (SheetJS, PII stays local)"`

---

## Task 4: Landing page `site/index.html`

Mirror `smis-helper-site/index.html` structure + design system (read it first). Sections: hero (logo + tagline "Log masuk DELIMa pantas untuk murid"), the problem (typing long emails wastes class time), how it works (3 steps: jana senarai → pasang → murid klik nama), download CTA (→ `muat-turun/quick-login-delima.zip` + link to `panduan.html`), generator CTA (→ `jana.html`), FAQ, footer (Cikgu Davin / Telegram). BM-first, EN secondary. No framework. Reuse the launcher's sticker aesthetic (Fredoka, thick borders, hard shadows, `--ink`/yellow).

- [ ] **Step 1:** Read `smis-helper-site/index.html` head/CSS to match the design-system conventions and `_headers`/meta patterns.
- [ ] **Step 2:** Write `site/index.html` (hero → problem → how → download → FAQ → footer). Use `icon-512.png`.
- [ ] **Step 3:** Preview + check responsive at 375 / 768 / 1280.
- [ ] **Step 4:** Commit.

---

## Task 5: Guide + privacy

**Files:** `site/panduan.html`, `site/privacy.html`

- [ ] **Step 1:** `panduan.html` — BM step-by-step with screenshots placeholders: (1) jana roster.js, (2) muat turun + unzip, (3) ganti `data/roster.js`, (4) double-click `pasang.bat` (no admin), (5) murid guna ikon `Quick Login`. Reuse `smis-helper-site` `.step` pattern.
- [ ] **Step 2:** `privacy.html` — state plainly: generator is client-side, no upload, no tracking; site is static. Important because PII is the whole concern.
- [ ] **Step 3:** Commit.

---

## Task 6: SEO + meta + Cloudflare headers

**Files:** `site/_headers`, `site/robots.txt`, `site/sitemap.xml`, `site/favicon.png`, `site/icon-512.png`, `site/og-image.png`

- [ ] **Step 1:** Generate `favicon.png` (32) + `icon-512.png` from `assets/logo-master.png`:
```bash
sips -z 32 32 assets/logo-master.png --out site/favicon.png
sips -z 512 512 assets/logo-master.png --out site/icon-512.png
```
- [ ] **Step 2:** Build `og-image.png` (1200×630) via the HTML-template → Chrome screenshot → `sips` downscale method documented in `smis-helper-site/CLAUDE.md`.
- [ ] **Step 3:** Add `_headers` (cache static assets, security headers), `robots.txt` (allow), `sitemap.xml` (index/jana/panduan/privacy), JSON-LD `SoftwareApplication` in `index.html`. Add `<meta>` OG/twitter tags to every page.
- [ ] **Step 4:** Commit.

---

## Task 7: Deploy — Cloudflare Pages + `quicklogin.davinhub.com`

Follow the `smis-helper-site` pattern (Pages project under the davinmaking/davinhub Cloudflare account, build output = `site/`, auto-deploy on push to `main`, custom domain via CNAME in the `davinhub.com` zone).

- [ ] **Step 1:** Create GitHub repo (public) `quick-login-delima`, push `main`.
- [ ] **Step 2:** Cloudflare Pages → create project from the repo. Build command: none (or `node tools/build-zip.mjs` to produce the installer at deploy). Output directory: `site`. *(Confirm with Davin whether the zip is committed or built at deploy.)*
- [ ] **Step 3:** Add custom domain `quicklogin.davinhub.com` (CNAME → `quick-login-delima.pages.dev` in the `davinhub.com` zone).
- [ ] **Step 4:** Verify the live URL serves index, the generator works, and the zip downloads.

---

## Task 8: Final verification

- [ ] **Step 1:** Lighthouse on `index.html`, `jana.html`, `panduan.html`, `privacy.html` — target 100/100/100 (a11y/BP/SEO), matching the `smis-helper-site` bar. Fix regressions.
- [ ] **Step 2:** End-to-end on a real Windows machine: download zip → replace `data/roster.js` with one generated by `jana.html` → double-click `pasang.bat` (standard user, no admin) → desktop `Quick Login` icon appears with the smiley-key logo → opens launcher in incognito → name board → Google login.
- [ ] **Step 3:** PII audit before making the repo public: `git log -p | grep -iE '@moe-dl|@gmail' ` returns only the fake `*.contoh@*` example addresses. Confirm no real roster ever committed.
- [ ] **Step 4:** Tag `v1.0.0`, announce.

---

## Self-Review notes

- **Spec coverage:** launcher rebrand (T1), installer (T2), generator (T3, core), site/landing (T4), guide+privacy (T5), SEO/deploy (T6/T7), verify (T8). PII rule enforced in T0/T1/T3/T8.
- **Open decisions for Davin:** (a) zip committed vs built-at-deploy (T2/T7); (b) public GitHub repo name; (c) whether to keep `makmal-komputer/login-launcher` as-is or replace it with a thin pointer to this project once shipped.
- **Type consistency:** `buildRoster(sheets) → { roster, total, dropped }` and `rosterToJs(roster)` used identically in `jana.js`, `jana.html`, and `parser.test.mjs`.
