# Quick Login DELIMa — Scale to Any School + Mass Deployment (Design)

**Date:** 2026-06-12
**Status:** Approved direction; spec for implementation planning.

## Problem

The project currently fits one small school: the roster parser is hardcoded to one
DELIMa xlsx layout (`Tahun*`/`PRA`/`PPKI` sheets), the launcher shows a single flat
grid of classes (unusable at 60+ classes / 3000 pupils), the teacher must manually
copy `roster.js` into `login-launcher/data/` (the most error-prone step for
non-technical teachers), and installing on a 100-PC lab one machine at a time is
impractical — especially since rosters change every year.

## Goals

1. One-artifact flow: teacher uploads xlsx → downloads ONE personalized installer zip.
2. Any school (primary/secondary, any size) can produce a roster via a generic template.
3. Launcher UI scales to 60+ classes; small schools see no change.
4. Documented mass-deployment paths for 100-PC labs (USB relay / network share / Veyon).

**Non-goals:** parsing other schools' native export layouts (template covers them);
hosting personalized zips on any server (PII rule); auto-update; Veyon installation
itself (admin/technician territory).

**PII rule unchanged:** everything in the browser, nothing uploaded; personalized
zips are never published on the public site.

---

## A. jana.html builds a personalized installer zip

**Flow:** parse success → primary button **"Muat turun pemasang penuh (.zip)"**:

1. `fetch('/muat-turun/quick-login-delima.zip')` — same-origin on the https site
   (the `file://` no-fetch constraint applies only to the launcher, not the site).
2. Unzip in-browser with **fflate** (already a project dep for the build; load via
   CDN `<script>` on jana.html, pinned version, same pattern as SheetJS).
3. Replace `data/roster.js` bytes with the generated roster.
4. Re-zip → download as **`quick-login-delima-sekolah.zip`** (distinct name so the
   teacher can't confuse it with the generic zip).

**Secondary link** (small text below): "muat turun roster.js sahaja" — for teachers
updating an existing install by replacing one file.

**Error handling:** if the fetch fails (offline/CDN hiccup), show a BM message and
fall back to roster.js-only download. Parse errors keep current reporting
(total + dropped counts).

**Copy changes:** jana.html step text becomes "muat naik → muat turun zip → pasang";
the "salin ke data/" instruction disappears from the happy path.

## B. Generic template (any school)

- New button on jana.html: **"Muat turun templat kosong (.xlsx)"** — SheetJS
  generates `templat-roster.xlsx`: one sheet `Senarai`, header `Kelas | Nama | Emel`,
  3 fake example rows.
- **Parser detection (per sheet):** if the first non-empty row case-insensitively
  matches headers `kelas`/`nama`/`emel` (allow `email`) → generic path: every later
  row becomes `add(kelas, nama, emel)` with the class name verbatim (trimmed,
  whitespace-collapsed) as the roster key. Sheets not matching fall through to the
  existing legacy rules (`Tahun*`/`PRA`/`PPKI`, `GURU` skipped). Both paths can
  coexist in one workbook.
- Existing validation reused: email regex, dedupe by email, dropped counter,
  per-class sort.
- **Tests:** extend `tests/parser.test.mjs` — header detection (case/extra spaces),
  verbatim class keys, invalid email dropped, mixed legacy+generic workbook.

## C. Launcher two-level class picker with small-school fallback

In `launcher/index.html` (no roster.js format change, no config):

- **≤ 12 classes:** current single flat grid, unchanged.
- **> 12 classes:** step 0 "Pilih tahun/tingkatan" (group tiles with class counts) →
  step 1 classes within the group → existing student list → confirm.
- **Group derivation from class-name prefix (zero config):**
  - `/^tahun\s*(\d)/i` → `Tahun N`; `/^tingkatan\s*(\d)/i` → `Tingkatan N`
  - `/^pra/i` → `Prasekolah`; `/^ppki/i` → `PPKI`; `/^peralihan/i` → `Peralihan`
  - anything else → `Lain-lain`
- **Ordering:** Prasekolah, Tahun 1–6, Peralihan, Tingkatan 1–5, PPKI, Lain-lain;
  natural sort within a group.
- Keep existing patterns: programmatic `#tajuk` focus on step change, back buttons
  per level, `:focus-visible` outlines, `prefers-reduced-motion`, Lighthouse
  a11y/BP/SEO 100.

## D. Mass-deployment guide — new page `site/panduan-makmal.html`

Same visual style as `panduan.html`; linked from index + panduan; added to
sitemap.xml; meets the Lighthouse bar (favicon link, meta description, `<main>`).

Three options, presented as a decision list:

1. **USB relay (zero infrastructure, default).** Extract the personalized zip onto
   2–3 USB sticks; pupils each take a few PCs and double-click `pasang.bat` straight
   from the USB (`robocopy "%~dp0"` already supports this — no copy-to-disk first).
   100 PCs ≈ one lesson.
2. **Network share.** Put the extracted folder on `\\server\share\`; each PC runs
   `pasang.bat` from the share. Yearly update = replace the shared folder, re-run.
   PII never leaves the school LAN.
3. **Veyon push (for the juruteknik; RECOMMENDED combo = Veyon + share).** Veyon
   Master → Run Program on all clients: `\\server\share\quick-login\pasang.bat`.
   Runs in the logged-in user session, so the no-admin model still holds. Include a
   PowerShell fallback that downloads the GENERIC zip from the site for labs with
   internet but no share (roster then arrives via USB or share). Explicit warning:
   do NOT publish the personalized zip on the open internet (PII).

`pasang.bat` itself needs no code change; add a manual smoke-test item: run from a
UNC path on Windows (don't `cd` — `%~dp0` resolves fine from UNC).

---

## Testing & verification

- `npm test` — parser unit tests incl. new generic-template cases.
- Manual smoke (per project rules): jana.html full flow in browser (upload xlsx →
  download personalized zip → extract → confirm `data/roster.js` is the real one);
  launcher with a synthetic 60-class roster (two-level) and the example roster
  (flat fallback); `pasang.bat` from USB and UNC on a Windows machine.
- Lighthouse a11y/BP/SEO = 100 on jana.html and panduan-makmal.html.

## Build/deploy notes

- No build-pipeline change: `tools/build-zip.mjs` still produces the generic zip at
  deploy; jana.html consumes it at runtime.
- New CDN dep on jana.html only: fflate (pinned). Launcher gains no dependency.
