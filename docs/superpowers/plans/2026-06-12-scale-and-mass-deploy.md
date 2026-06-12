# Scale to Any School + Mass Deployment — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Any Malaysian school (primary/secondary, up to 3000 pupils) can generate a personalized one-file installer zip in the browser, the launcher UI scales to 60+ classes, and labs with 100 PCs get a documented mass-deployment guide (USB relay / network share / Veyon).

**Architecture:** Four independent slices on the existing static stack: (1) generic-template path inside the pure parser `site/js/jana.js` (TDD), (2) template download + (3) personalized-zip build inside `site/jana.html` using fflate in the browser (fetch the deployed generic zip, swap `data/roster.js`, re-zip), (4) two-level class picker inside `launcher/index.html` (inline JS, zero config, auto-fallback for ≤12 classes), plus a new static guide page `site/panduan-makmal.html`. No build-pipeline change; `tools/build-zip.mjs` untouched.

**Tech Stack:** Vanilla HTML/CSS/JS; SheetJS (CDN, already on jana.html); fflate UMD via CDN (new, jana.html only); `node --test` for parser tests.

**Spec:** `docs/superpowers/specs/2026-06-12-scale-and-mass-deploy-design.md`

**PII rule (unchanged, non-negotiable):** repo is PUBLIC — only fake example data is ever committed; everything in jana.html stays client-side; personalized zips are never published on the internet.

---

## File Map

| File | Change |
|---|---|
| `site/js/jana.js` | Add generic `Kelas|Nama|Emel` sheet detection + parsing |
| `tests/parser.test.mjs` | New tests for the generic path |
| `site/jana.html` | Template download button; personalized-zip primary button; fflate CDN; copy updates |
| `site/panduan.html` | Rewrite happy path to one-artifact flow (6 steps → 5) |
| `launcher/index.html` | Two-level picker (`view-tahap`), threshold 12, grouping by class-name prefix |
| `site/panduan-makmal.html` | NEW mass-deployment guide (USB / share / Veyon) |
| `site/index.html` | Link to panduan-makmal; stale copy check |
| `site/sitemap.xml` | Add panduan-makmal.html |

---

### Task 1: Generic-template parser path in `site/js/jana.js` (TDD)

**Files:**
- Modify: `site/js/jana.js`
- Test: `tests/parser.test.mjs`

- [ ] **Step 1: Write the failing tests** — append to `tests/parser.test.mjs`:

```js
test("generic template sheet: header detected, class keys verbatim", () => {
  const sheets = { Senarai: [
    ["Kelas", "Nama", "Emel"],
    ["Tingkatan 4 Amanah", "Ali", "ali@moe-dl.edu.my"],
    ["Tingkatan 4  Amanah", "Abu", "abu@moe-dl.edu.my"],   // double space -> same class
    ["1 Bestari", "Mei Ling", "mei@moe-dl.edu.my"],
    ["", "Tiada Kelas", "x@moe-dl.edu.my"],                 // missing class -> dropped
    ["1 Bestari", "Rosak", "not-an-email"],                 // bad email -> dropped
  ]};
  const { roster, total, dropped } = buildRoster(sheets);
  assert.equal(total, 3);
  assert.equal(dropped, 2);
  assert.deepEqual(Object.keys(roster).sort(), ["1 Bestari", "Tingkatan 4 Amanah"]);
  assert.equal(roster["Tingkatan 4 Amanah"].length, 2);
});

test("generic header: case-insensitive, EMAIL variant, blank rows above header", () => {
  const sheets = { "Helaian 1": [
    [],
    ["", ""],
    ["KELAS", "NAMA", "EMAIL"],
    ["Pra Cempaka", "Dahlia", "dahlia@moe-dl.edu.my"],
  ]};
  const { roster, total } = buildRoster(sheets);
  assert.equal(total, 1);
  assert.deepEqual(roster["Pra Cempaka"], [{ nama: "DAHLIA", email: "dahlia@moe-dl.edu.my" }]);
});

test("legacy and generic sheets coexist in one workbook", () => {
  const sheets = {
    Tahun3:  [["1", "Siti", "siti@moe-dl.edu.my"]],
    Senarai: [["Kelas", "Nama", "Emel"], ["Tingkatan 1 Cerdik", "Ali", "ali2@moe-dl.edu.my"]],
  };
  const { roster, total } = buildRoster(sheets);
  assert.equal(total, 2);
  assert.ok("Tahun 3" in roster);
  assert.ok("Tingkatan 1 Cerdik" in roster);
});
```

- [ ] **Step 2: Run tests, verify the 3 new ones FAIL**

Run: `npm test`
Expected: existing 2 tests pass; the 3 new tests fail (generic rows are not parsed — totals are 0/0/1).

- [ ] **Step 3: Implement.** In `site/js/jana.js`, add below the `titleCase` helper:

```js
const HEADER_RE = [/^kelas$/, /^nama$/, /^e-?mel$|^email$/];
// returns index of a generic "Kelas|Nama|Emel" header row, or -1
function genericHeaderIndex(rows) {
  const i = rows.findIndex((r) => r && r.some((c) => String(c ?? "").trim() !== ""));
  if (i < 0) return -1;
  const h = [cell(rows[i], 0), cell(rows[i], 1), cell(rows[i], 2)].map((s) => s.toLowerCase());
  return HEADER_RE.every((re, j) => re.test(h[j])) ? i : -1;
}
```

Then in `buildRoster`, restructure the sheet loop so the generic check runs right after the GURU skip:

```js
  for (const [name, rows] of Object.entries(sheets)) {
    const up = name.toUpperCase();
    if (up === "GURU") continue;
    const hi = genericHeaderIndex(rows);
    if (hi >= 0) {
      for (const r of rows.slice(hi + 1)) {
        const kelas = cell(r, 0).replace(/\s+/g, " ");
        const nama = cell(r, 1), emel = cell(r, 2);
        if (!kelas) { if (nama || emel) dropped++; continue; }
        add(kelas, nama, emel);
      }
    } else if (up === "PPKI") {
```

(the PPKI / PRA / Tahun branches stay exactly as they are; only `if (up === "PPKI")` becomes `else if`.)

- [ ] **Step 4: Run tests, verify ALL pass**

Run: `npm test`
Expected: 5/5 pass.

- [ ] **Step 5: Commit**

```bash
git add site/js/jana.js tests/parser.test.mjs
git commit -m "feat(parser): generic Kelas|Nama|Emel template sheets, coexisting with legacy DELIMa layout"
```

---

### Task 2: "Muat turun templat" button on jana.html

**Files:**
- Modify: `site/jana.html` (upload card ~line 215-223, module script ~line 250)

- [ ] **Step 1: Add the button.** Inside the upload card, after the `<input type="file" id="xlsxInput" …/>` line:

```html
      <p class="templat-note">Format sekolah anda berbeza? Guna templat umum —
        isi tiga lajur <code>Kelas | Nama | Emel</code> dan muat naik semula:
        <button type="button" id="btnTemplat">⬇ Templat kosong (.xlsx)</button>
      </p>
```

Add to the `<style>` block (next to `.file-label` rules):

```css
    .templat-note { margin-top: 14px; font-size: .92rem; color: #555; }
    .templat-note button {
      font: inherit; color: inherit; background: none;
      border: none; padding: 0; cursor: pointer;
      text-decoration: underline; font-weight: 600;
    }
```

- [ ] **Step 2: Add the handler** at the end of the `<script type="module">` block:

```js
    document.getElementById("btnTemplat").addEventListener("click", () => {
      const rows = [
        ["Kelas", "Nama", "Emel"],
        ["Tahun 1 Bestari", "ALI BIN ABU (CONTOH)", "m-1234567@moe-dl.edu.my"],
        ["Tahun 1 Bestari", "SITI BINTI SU (CONTOH)", "m-2345678@moe-dl.edu.my"],
        ["Tingkatan 4 Amanah", "MEI LING (CONTOH)", "m-3456789@moe-dl.edu.my"],
      ];
      const ws = XLSX.utils.aoa_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Senarai");
      XLSX.writeFile(wb, "templat-roster.xlsx");
    });
```

- [ ] **Step 3: Manual check** — `cd site && python3 -m http.server 8777`, open `http://localhost:8777/jana.html`, click the templat button, open the downloaded xlsx, re-upload it: expect 3 murid / 2 kelas (the CONTOH rows parse via Task 1's generic path).

- [ ] **Step 4: Commit**

```bash
git add site/jana.html
git commit -m "feat(jana): downloadable generic xlsx template for any school"
```

---

### Task 3: Personalized installer zip (primary download on jana.html)

**Files:**
- Modify: `site/jana.html` (result card ~line 239, scripts ~line 247-313)

- [ ] **Step 1: Load fflate** — after the SheetJS `<script>` (line 247):

```html
  <!-- fflate — in-browser zip (same lib the deploy build uses) -->
  <script src="https://cdn.jsdelivr.net/npm/fflate@0.8.2/umd/index.js"></script>
```

- [ ] **Step 2: Replace the single download button** (line 239) with:

```html
        <button class="btn-download" id="btnZip">⬇ Muat turun pemasang penuh (.zip)</button>
        <p class="roster-only">atau <a href="#" id="lnkRoster">muat turun roster.js sahaja</a>
          — untuk kemas kini pemasangan sedia ada</p>
```

Add CSS next to `.btn-download` rules:

```css
    .roster-only { margin-top: 10px; font-size: .9rem; color: #555; }
    .roster-only a { color: inherit; font-weight: 600; }
```

- [ ] **Step 3: Rewrite the download handlers.** Replace the whole `btnDownload` click-handler block (lines 299-312) with:

```js
    function muatTurunFail(data, nama, jenis) {
      const url = URL.createObjectURL(new Blob([data], { type: jenis }));
      const a = document.createElement("a");
      a.href = url;
      a.download = nama;
      a.click();
      URL.revokeObjectURL(url);
    }

    document.getElementById("lnkRoster").addEventListener("click", (e) => {
      e.preventDefault();
      if (!_roster) return;
      muatTurunFail(rosterToJs(_roster), "roster.js", "text/javascript");
      document.getElementById("status").textContent =
        "roster.js dimuat turun. Salin ke login-launcher/data/ dan gantikan fail lama.";
    });

    document.getElementById("btnZip").addEventListener("click", async () => {
      if (!_roster) return;
      const status = document.getElementById("status");
      status.className = "";
      try {
        status.textContent = "Menyediakan pemasang...";
        const res = await fetch("muat-turun/quick-login-delima.zip");
        if (!res.ok) throw new Error("HTTP " + res.status);
        const files = fflate.unzipSync(new Uint8Array(await res.arrayBuffer()));
        files["data/roster.js"] = new TextEncoder().encode(rosterToJs(_roster));
        const out = fflate.zipSync(files, { level: 9 });
        muatTurunFail(out, "quick-login-delima-sekolah.zip", "application/zip");
        status.textContent =
          "✓ Pemasang dimuat turun — senarai murid anda sudah di dalamnya. " +
          "Ekstrak zip dan klik dua kali pasang.bat.";
      } catch (err) {
        console.error(err);
        status.className = "error";
        status.textContent = "Tidak dapat menyediakan zip penuh (" + err.message +
          "). Sila guna pautan 'roster.js sahaja' di bawah.";
      }
    });
```

- [ ] **Step 4: Manual check** — run `node tools/build-zip.mjs` first (so `site/muat-turun/…zip` exists locally), serve `site/`, upload an xlsx, click the zip button. Unzip the download; confirm `data/roster.js` contains the generated roster (not the example) and `pasang.bat`/`index.html` are intact. Also test the roster.js-only link, and the offline fallback (DevTools → Network → Offline → click zip button → error message shows).

- [ ] **Step 5: Commit**

```bash
git add site/jana.html
git commit -m "feat(jana): build personalized installer zip in-browser with fflate (one-artifact flow)"
```

---

### Task 4: One-artifact copy on panduan.html (+ index.html stale-copy check)

**Files:**
- Modify: `site/panduan.html` (steps list, lines 374-512; page-sub line 369-372)
- Modify: `site/index.html` (only if grep finds stale copy)

- [ ] **Step 1: Merge old steps 1-3 into two new cards.** Replace the three `<li>` cards `step-1`/`step-2`/`step-3` (lines 376-441) with:

```html
    <!-- LANGKAH 1 -->
    <li class="step-card step-1">
      <div class="step-header">
        <div class="step-num" aria-label="Langkah 1">1</div>
        <h2>Jana pemasang anda</h2>
      </div>
      <div class="step-body">
        <p>
          Pergi ke halaman <a href="jana.html">Jana senarai</a> dan muat naik fail
          <strong>ID DELIMa (.xlsx)</strong> sekolah anda. Klik
          <strong>"Muat turun pemasang penuh (.zip)"</strong> — anda akan mendapat
          <code>quick-login-delima-sekolah.zip</code> yang sudah mengandungi senarai murid anda.
        </p>
        <p>
          Format fail anda berbeza? Muat turun <strong>templat kosong</strong> di halaman
          yang sama, isi tiga lajur <code>Kelas | Nama | Emel</code>, dan muat naik semula.
        </p>
        <div class="callout" role="note">
          <span class="callout-icon" aria-hidden="true">&#128274;</span>
          <span>Fail <code>.xlsx</code> anda <strong>tidak dimuat naik ke mana-mana server</strong>.
          Semua pemprosesan berlaku dalam pelayar anda sendiri.</span>
        </div>
      </div>
    </li>

    <!-- LANGKAH 2 -->
    <li class="step-card step-2">
      <div class="step-header">
        <div class="step-num" aria-label="Langkah 2">2</div>
        <h2>Ekstrak fail zip</h2>
      </div>
      <div class="step-body">
        <p>
          Klik kanan <code>quick-login-delima-sekolah.zip</code> dan pilih
          <strong>"Extract All"</strong> untuk mengekstrak ke satu folder
          (atau terus ke pemacu USB jika mahu memasang di makmal).
        </p>
      </div>
    </li>
```

- [ ] **Step 2: Renumber the remaining cards.** In old cards 4/5/6 (now 3/4/5) change only the number bits, e.g. `aria-label="Langkah 4">4` → `aria-label="Langkah 3">3` (and 5→4, 6→5). Leave the `step-4`…`step-6` CSS classes as-is (they only set accent colors).

- [ ] **Step 3: Update the intro paragraph** (lines 369-372): "Ikut enam langkah" → "Ikut lima langkah".

- [ ] **Step 4: Add a yearly-update callout** before `</ol>` (after the last card):

```html
    <li class="step-card step-6">
      <div class="step-header">
        <div class="step-num" aria-label="Petua">↻</div>
        <h2>Tahun baharu, senarai baharu</h2>
      </div>
      <div class="step-body">
        <p>
          Jana semula pemasang di <a href="jana.html">Jana senarai</a> dengan fail xlsx terkini,
          kemudian jalankan <code>pasang.bat</code> sekali lagi — fail lama akan diganti secara automatik.
          Tidak perlu nyahpasang dahulu.
        </p>
      </div>
    </li>
```

- [ ] **Step 5: Stale-copy check on index.html**

Run: `grep -n "roster.js\|Salin\|salin" site/index.html`
For any hit that still describes the copy-roster.js-manually flow, update the sentence to the one-artifact wording ("muat turun pemasang penuh yang sudah mengandungi senarai murid anda"). The privacy wording at ~line 694 stays.

- [ ] **Step 6: Manual check** — serve site, read panduan.html top to bottom: numbering 1-5 contiguous, no reference to "salin roster.js ke data\" remains in the happy path.

- [ ] **Step 7: Commit**

```bash
git add site/panduan.html site/index.html
git commit -m "docs(site): panduan reflects one-artifact installer flow (5 steps + yearly update tip)"
```

---

### Task 5: Launcher two-level class picker (auto-fallback ≤12 classes)

**Files:**
- Modify: `launcher/index.html` (CSS ~lines 60-121, HTML ~line 287, JS ~lines 332-468)

- [ ] **Step 1: CSS.** Line 89 `#grid-kelas {` → `#grid-kelas, #grid-tahap {`. Add `#btn-back-tahap` everywhere `#btn-back` appears in a selector: line 60 (`button.tile, #btn-back, .huruf`), line 79 (`:focus-visible` list), line 112 (`#btn-back {`), lines 120-121 (hover/active) — e.g. `#btn-back, #btn-back-tahap {`.

- [ ] **Step 2: HTML.** Before `<section id="view-kelas">` (line 287) insert the new step-0 view, and give view-kelas a toolbar:

```html
  <!-- langkah 0 (sekolah besar sahaja) -->
  <section id="view-tahap" class="hidden">
    <div id="grid-tahap"></div>
  </section>

  <!-- langkah 1 -->
  <section id="view-kelas">
    <div class="toolbar hidden" id="bar-tahap">
      <button id="btn-back-tahap">← Kembali 返回</button>
      <div class="kelas-chip" id="nama-tahap"></div>
    </div>
    <div id="grid-kelas"></div>
  </section>
```

(the old `view-kelas` section is replaced by the block above.)

- [ ] **Step 3: JS — grouping.** After `var senaraiKelas = Object.keys(window.ROSTER);` (line 355) insert:

```js
  var AMBANG_DUA_ARAS = 12;
  var SUSUNAN = ['Prasekolah', 'Tahun 1', 'Tahun 2', 'Tahun 3', 'Tahun 4', 'Tahun 5',
    'Tahun 6', 'Peralihan', 'Tingkatan 1', 'Tingkatan 2', 'Tingkatan 3', 'Tingkatan 4',
    'Tingkatan 5', 'PPKI', 'Lain-lain'];

  function namaKumpulan(kelas) {
    var m;
    if ((m = kelas.match(/^tahun\s*(\d)/i))) return 'Tahun ' + m[1];
    if ((m = kelas.match(/^tingkatan\s*(\d)/i))) return 'Tingkatan ' + m[1];
    if (/^pra/i.test(kelas)) return 'Prasekolah';
    if (/^ppki/i.test(kelas)) return 'PPKI';
    if (/^peralihan/i.test(kelas)) return 'Peralihan';
    return 'Lain-lain';
  }

  var kumpulanKelas = {};
  senaraiKelas.forEach(function (kelas) {
    var k = namaKumpulan(kelas);
    (kumpulanKelas[k] = kumpulanKelas[k] || []).push(kelas);
  });
  var senaraiKumpulan = Object.keys(kumpulanKelas).sort(function (a, b) {
    return SUSUNAN.indexOf(a) - SUSUNAN.indexOf(b);
  });
  senaraiKumpulan.forEach(function (k) {
    kumpulanKelas[k].sort(function (a, b) {
      return a.localeCompare(b, undefined, { numeric: true });
    });
  });
  var duaAras = senaraiKelas.length > AMBANG_DUA_ARAS;
  var kumpulanSemasa = null;
```

Also add element refs next to the existing ones (line 332-344):

```js
  var viewTahap = document.getElementById('view-tahap');
  var gridTahap = document.getElementById('grid-tahap');
  var barTahap = document.getElementById('bar-tahap');
  var namaTahap = document.getElementById('nama-tahap');
```

- [ ] **Step 4: JS — views.** In `tunjuk` (line 373-378) change the hide list to `[viewTahap, viewKelas, viewNama, viewSah]`. Replace `showKelas` (line 380-383) and the bottom initial-render block (lines 453-468) with:

```js
  function showTahap() {
    kumpulanSemasa = null;
    tunjuk(viewTahap, 'Pilih tahun / tingkatan!', '选你的年级');
  }

  function showKelas() {
    binaGridKelas(duaAras ? kumpulanKelas[kumpulanSemasa] : senaraiKelas);
    tunjuk(viewKelas, 'Pilih kelas kamu!', '选你的班级');
    search.value = '';
  }

  function binaGridKelas(senarai) {
    gridKelas.innerHTML = '';
    if (duaAras) {
      barTahap.classList.remove('hidden');
      namaTahap.textContent = kumpulanSemasa;
      namaTahap.style.background = WARNA[senaraiKumpulan.indexOf(kumpulanSemasa) % WARNA.length];
    }
    senarai.forEach(function (kelas, i) {
      var b = document.createElement('button');
      b.className = 'tile kelas-tile';
      b.style.setProperty('--tile', warnaKelas(kelas));
      b.style.setProperty('--i', i);
      var big = document.createElement('span');
      big.className = 'big';
      big.textContent = labelBesar(kelas);
      var label = document.createElement('span');
      label.className = 'label';
      label.textContent = kelas;
      b.appendChild(big);
      b.appendChild(label);
      b.addEventListener('click', function () { showNama(kelas); });
      gridKelas.appendChild(b);
    });
  }

  function binaGridTahap() {
    senaraiKumpulan.forEach(function (k, i) {
      var b = document.createElement('button');
      b.className = 'tile kelas-tile';
      b.style.setProperty('--tile', WARNA[i % WARNA.length]);
      b.style.setProperty('--i', i);
      var big = document.createElement('span');
      big.className = 'big';
      big.textContent = labelBesar(k);
      var label = document.createElement('span');
      label.className = 'label';
      label.textContent = k + ' · ' + kumpulanKelas[k].length + ' kelas';
      b.appendChild(big);
      b.appendChild(label);
      b.addEventListener('click', function () { kumpulanSemasa = k; showKelas(); });
      gridTahap.appendChild(b);
    });
  }

  // paparan awal — tanpa tunjuk() supaya fokus tidak dialih semasa muat
  if (duaAras) {
    binaGridTahap();
    viewKelas.classList.add('hidden');
    viewTahap.classList.remove('hidden');
    tajuk.innerHTML = 'Pilih tahun / tingkatan!<span class="zh">选你的年级</span>';
  } else {
    binaGridKelas(senaraiKelas);
  }

  document.getElementById('btn-back-tahap').addEventListener('click', showTahap);
```

Note: `labelBesar` (line 367) already returns the first number found, so "Tingkatan 4" → "4" and "PPKI" → first letter; no change needed. Keep `document.getElementById('btn-back').addEventListener('click', showKelas);` and the `btn-bukan`/`btn-ya` handlers exactly as they are.

- [ ] **Step 5: Manual smoke — big school.** Generate a synthetic 60-class roster (do NOT commit):

```bash
node -e '
const r = {};
for (let t = 1; t <= 5; t++)
  for (const n of ["Amanah","Bakti","Cekal","Dedikasi","Ehsan","Fikrah","Gigih","Harmoni","Iltizam","Jujur"]) {
    r["Tingkatan " + t + " " + n] = [
      { nama: "MURID CONTOH A", email: "a" + t + n + "@moe-dl.edu.my" },
      { nama: "MURID CONTOH B", email: "b" + t + n + "@moe-dl.edu.my" }];
  }
r["Prasekolah Cempaka"] = [{ nama: "PRA CONTOH", email: "pra@moe-dl.edu.my" }];
r["PPKI Sunshine"] = [{ nama: "PPKI CONTOH", email: "ppki@moe-dl.edu.my" }];
require("fs").writeFileSync("launcher/data/roster.js",
  "window.ROSTER = " + JSON.stringify(r, null, 2) + ";\n");
console.log(Object.keys(r).length + " classes written");'
open launcher/index.html
```

Check: opens on "Pilih tahun / tingkatan" with 7 group tiles (Prasekolah, Tingkatan 1-5, PPKI); group → classes (back button visible, chip shows group); class → names → confirm flow unchanged; Tab/keyboard focus follows the existing pattern.

- [ ] **Step 6: Manual smoke — small school.** `git checkout -- launcher/data/roster.js`, reopen: flat grid exactly as today, no back bar.

- [ ] **Step 7: Commit**

```bash
git add launcher/index.html
git commit -m "feat(launcher): two-level class picker for big schools, auto flat grid when <=12 classes"
```

---

### Task 6: Mass-deployment guide `site/panduan-makmal.html` + links

**Files:**
- Create: `site/panduan-makmal.html` (from `site/panduan.html` shell)
- Modify: `site/panduan.html`, `site/index.html`, `site/sitemap.xml`

- [ ] **Step 1: Copy the shell**

```bash
cp site/panduan.html site/panduan-makmal.html
```

- [ ] **Step 2: Head.** In the copy, replace `<title>`, both descriptions, og:title/og:url:
  - title: `Panduan Makmal — Pasang Beramai-ramai — Quick Login DELIMa`
  - description: `Cara memasang Quick Login DELIMa pada 30–100 komputer makmal: USB bergilir, folder kongsi rangkaian, atau tolakan Veyon.`
  - og:url: `https://quicklogin.davinhub.com/panduan-makmal.html`

- [ ] **Step 3: Replace everything inside `<div class="page-wrap">` … `</div>` (keep nav + footer) with:**

```html
  <a href="panduan.html" class="back-link" aria-label="Kembali ke panduan pemasangan">
    &larr; Kembali ke panduan pemasangan
  </a>

  <div class="section-label">UNTUK GURU TMK / JURUTEKNIK</div>
  <h1 class="page-title">Pasang Beramai-ramai di Makmal</h1>
  <p class="page-sub">
    Ada 30–100 komputer? Jangan pasang satu-satu. Pilih SATU daripada tiga cara di bawah —
    semuanya bermula dengan <strong>pemasang penuh</strong> yang anda jana di
    halaman <a href="jana.html">Jana senarai</a>.
  </p>

  <div class="callout" role="note">
    <span class="callout-icon" aria-hidden="true">&#9888;&#65039;</span>
    <span><strong>Jangan sesekali</strong> muat naik zip pemasang anda ke internet terbuka
    (laman web, pautan Drive "anyone with link") — ia mengandungi nama dan emel murid.
    USB dan rangkaian dalaman sekolah sahaja.</span>
  </div>

  <ol class="steps-list" aria-label="Pilihan pemasangan beramai-ramai">

    <li class="step-card step-1">
      <div class="step-header">
        <div class="step-num" aria-label="Pilihan A">A</div>
        <h2>USB bergilir — tiada apa-apa prasyarat</h2>
      </div>
      <div class="step-body">
        <p>
          Ekstrak zip pemasang ke 2–3 pemacu USB. Semasa kelas, beri setiap murid
          beberapa komputer: cucuk USB, buka folder, <strong>klik dua kali
          <code>pasang.bat</code></strong> — siap dalam ~10 saat sekomputer, terus dari USB
          tanpa salin dahulu. 100 komputer &asymp; satu waktu kelas.
        </p>
      </div>
    </li>

    <li class="step-card step-2">
      <div class="step-header">
        <div class="step-num" aria-label="Pilihan B">B</div>
        <h2>Folder kongsi rangkaian</h2>
      </div>
      <div class="step-body">
        <p>
          Jika makmal anda ada pelayan / folder kongsi: letak folder pemasang (sudah diekstrak)
          di <code>\\PELAYAN\kongsi\quick-login\</code>. Di setiap komputer, buka folder itu dan
          jalankan <code>pasang.bat</code> terus dari situ.
        </p>
        <p>
          <strong>Tahun baharu?</strong> Ganti folder di pelayan dengan pemasang baharu,
          jalankan semula <code>pasang.bat</code> di setiap komputer. Data murid kekal
          dalam rangkaian sekolah.
        </p>
      </div>
    </li>

    <li class="step-card step-3">
      <div class="step-header">
        <div class="step-num" aria-label="Pilihan C">C</div>
        <h2>Veyon — satu klik untuk seluruh makmal</h2>
      </div>
      <div class="step-body">
        <p>
          Makmal yang sudah ada <a href="https://veyon.io" target="_blank" rel="noopener">Veyon</a>
          (perisian kawalan makmal — pemasangannya sekali sahaja oleh juruteknik) boleh menolak
          pemasangan ke <strong>semua komputer serentak</strong>. Gabungan terbaik:
          Veyon + folder kongsi (Pilihan B).
        </p>
        <p>
          Dalam Veyon Master, pilih semua komputer &rarr; <strong>Run program</strong> &rarr; taip:
        </p>
        <pre><code>cmd /c \\PELAYAN\kongsi\quick-login\pasang.bat &lt;NUL</code></pre>
        <p>
          (<code>&lt;NUL</code> melangkau tetingkap "tekan apa-apa kekunci" supaya pemasangan
          selesai tanpa sentuhan. Run program berjalan dalam sesi pengguna biasa —
          tiada hak admin diperlukan.)
        </p>
        <p>
          Tiada folder kongsi? Anda boleh tolak muat-turun pemasang <strong>contoh</strong>
          (tanpa senarai sebenar) ke Desktop setiap komputer, kemudian seorang murid
          klik <code>pasang.bat</code> di setiap satu:
        </p>
        <pre><code>powershell -NoProfile -Command "iwr 'https://quicklogin.davinhub.com/muat-turun/quick-login-delima.zip' -OutFile $env:TEMP\ql.zip; Expand-Archive $env:TEMP\ql.zip ([Environment]::GetFolderPath('Desktop')+'\quick-login') -Force"</code></pre>
        <p>
          Senarai murid sebenar kemudiannya perlu sampai melalui USB atau folder kongsi —
          bukan internet.
        </p>
      </div>
    </li>

  </ol>

  <!-- CTA -->
  <div class="cta-block">
    <h2>Belum jana pemasang anda?</h2>
    <p>Muat naik fail xlsx anda dan dapatkan pemasang penuh dalam satu klik.</p>
    <div class="cta-btns">
      <a href="jana.html" class="btn-primary">Jana senarai kelas</a>
      <a href="panduan.html" class="btn-secondary">Panduan asas</a>
    </div>
  </div>
```

panduan.html has no `pre`/`code` block styles, so add to the copied page's `<style>`:

```css
  pre { background: var(--ink); color: var(--paper); border-radius: 12px;
        padding: 14px 18px; overflow-x: auto; font-size: .88rem; margin: 12px 0; }
```

- [ ] **Step 4: Links in.**
  - `site/panduan.html`: after the new "Tahun baharu" card add a callout: `<div class="callout" role="note"><span class="callout-icon" aria-hidden="true">&#128187;</span><span>Banyak komputer di makmal? Lihat <a href="panduan-makmal.html"><strong>panduan pasang beramai-ramai</strong></a> (USB bergilir / rangkaian / Veyon).</span></div>`
  - `site/index.html` line ~659, after the `dl-guide` link: `<a href="panduan-makmal.html" class="dl-guide">Panduan makmal (banyak komputer)</a>`
  - `site/sitemap.xml`: add `<url><loc>https://quicklogin.davinhub.com/panduan-makmal.html</loc></url>`
  - Nav on BOTH panduan pages: no change (keep 3 links; the page is reachable from panduan + index).

- [ ] **Step 5: Manual check** — serve site; new page renders with correct styles, no console errors, favicon link present (came with the copied head), all internal links resolve.

- [ ] **Step 6: Commit**

```bash
git add site/panduan-makmal.html site/panduan.html site/index.html site/sitemap.xml
git commit -m "feat(site): mass-deployment guide (USB relay / network share / Veyon push)"
```

---

### Task 7: Final verification

- [ ] **Step 1:** `npm test` — 5/5 pass.
- [ ] **Step 2:** `node tools/build-zip.mjs` — builds; unzip output and confirm `data/roster.js` is still the FAKE example (PII rule).
- [ ] **Step 3:** Full browser pass on `http://localhost:8777`: index → jana (template download, upload, personalized zip, roster-only link, offline fallback) → panduan (5 steps) → panduan-makmal → privacy.
- [ ] **Step 4:** Launcher smoke from `file://` (NOT the http server): both big-roster (two-level) and example-roster (flat) per Task 5 steps 5-6; confirm login link still goes to `accounts.google.com/AccountChooser`.
- [ ] **Step 5:** Lighthouse on jana.html and panduan-makmal.html (production after deploy, or local) — a11y/BP/SEO 100.
- [ ] **Step 6:** Windows-only items for Davin at school (cannot be done on this Mac — record as known-pending): run `pasang.bat` from a USB stick and from a UNC share path; confirm the Veyon `<NUL` command on a real Veyon master.
- [ ] **Step 7:** Final commit of any fixups; remind Davin to `git push` (Cloudflare auto-deploys `main`; pushing publishes the new pages and the jana flow).
