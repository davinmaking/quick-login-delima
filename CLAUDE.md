# Quick Login DELIMa — Project Rules

> **Status:** LIVE at https://quicklogin.davinhub.com · repo github.com/davinmaking/quick-login-delima (PUBLIC) · Lighthouse a11y/BP/SEO = 100 on every page.

## PII RULE (NON-NEGOTIABLE — repo is PUBLIC)

- NEVER commit real student names, emails, or any `.xlsx` roster file
- `launcher/data/roster.js` ships ONLY as fake example data
- The in-browser generator is 100% client-side; uploaded xlsx and generated roster.js never touch a server
- Real class roster stays on the teacher's machine only

## Artifacts

**`launcher/`** — the downloadable, installable file:// launcher
- Distributed as a zip; teacher extracts and double-clicks `pasang.bat`

**`site/`** — static HTML on Cloudflare Pages (`quicklogin.davinhub.com`)
- Landing page, in-browser roster generator (`jana.html`), install guide, privacy page
- Mirrors the pattern of `~/Developer/smis-helper-site/`

## Launcher Tech Constraints

- Single-file static HTML — must work from `file://` on Windows (no local server)
- NO `fetch()` — blocked by CORS under `file://`
- NO build step — teacher edits or replaces `roster.js`, not compiled output
- Roster loaded via `<script src="data/roster.js">` which sets `window.ROSTER`
- Login link `continue=` parameter only accepts Google-owned domains (e.g. `classroom.google.com`)

## No-Admin Model

- `pasang.bat` creates a Desktop shortcut → `chrome.exe --incognito --start-maximized file:///C:/login-launcher/index.html` (NOT `--app=` — the login flow needs a normal window)
- Shortcut icon via `IconLocation` → `C:\login-launcher\quicklogin.ico` (the `.ico` is copied into the install folder; it is NOT in the robocopy `/XF` exclude list)
- Desktop path resolved with PowerShell `[Environment]::GetFolderPath('Desktop')` — school PCs usually redirect Desktop to OneDrive, so never hardcode `%USERPROFILE%\Desktop`
- Chrome incognito = clean slate between pupils + web-only login (no "Turn on sync?")
- Registry policy path (`...\SOFTWARE\Policies\Google\Chrome`) is admin-only in BOTH `HKLM` and `HKCU` — do NOT use it; the no-admin install relies on the shortcut + CLI flags only

## Deploy

- `site/` → Cloudflare Pages (davinmaking account), auto-deploy on push to `main`. Build command **`node tools/build-zip.mjs`**, output directory **`site`**, framework preset **None**.
- Custom domain `quicklogin.davinhub.com` via CNAME in the `davinhub.com` zone (same pattern as `smis-helper-site` → `smis.davinhub.com`)
- `site/muat-turun/*.zip` is gitignored — built fresh at deploy from `launcher/` (build-at-deploy; the artifact is never committed)

## Build & deploy gotchas (learned the hard way)

- **Cloudflare CI has no system `zip`.** `tools/build-zip.mjs` MUST zip with **fflate** (pure JS dep), never `execSync('zip ...')` — that fails with `zip: not found` (exit 127) in CI.
- **"Retry deployment" rebuilds the SAME old commit.** To ship a fix, push a NEW commit (an empty commit works); retry will not pick up newer code.
- **git push identity:** the local SSH key authenticates as `davinwzy`, but the repo is under `davinmaking` → SSH push is denied. Use an HTTPS remote + the gh token: `gh auth setup-git`, then `git remote set-url origin https://github.com/davinmaking/quick-login-delima.git`.
- **Lighthouse bar = a11y/BP/SEO 100 on every page.** Every page needs `<link rel="icon" href="favicon.png">`, else the browser's auto `/favicon.ico` request 404s and dings best-practices.

## Commands

- Build installer zip: `node tools/build-zip.mjs` (or `npm run build:zip`)
- Run parser tests: `npm test` (`node --test` → `tests/parser.test.mjs`)
- Local site preview: `cd site && python3 -m http.server 8777`
- Roster parser `site/js/jana.js` ports `~/Developer/makmal-komputer/login-launcher/build-roster-xlsx.py` (Tahun/Pra sheets; PPKI = two side-by-side blocks; GURU skipped)
