# Quick Login DELIMa — Project Rules

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

- Desktop shortcut launches `chrome.exe --incognito --app=<launcher path>`
- Chrome incognito = clean slate between pupils; no cached sessions
- Registry policy path (`SOFTWARE\Policies\Google\Chrome`) is admin-only in BOTH `HKLM` and `HKCU` — do NOT use it; the no-admin install must rely on CLI flags only

## Deploy

- `site/` → Cloudflare Pages, auto-deploy on push to `main`
- Custom domain `quicklogin.davinhub.com` via CNAME in the `davinhub.com` zone (same pattern as `smis-helper-site` → `smis.davinhub.com`)
- `site/muat-turun/*.zip` is gitignored (built artifact); zip is rebuilt by `tools/build-zip.js` before release

## Commands

- Build installer zip: `node tools/build-zip.js`
- Local site preview: `cd site && python3 -m http.server 8777`
