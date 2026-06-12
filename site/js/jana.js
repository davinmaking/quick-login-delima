const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const cell = (row, i) => (row && row[i] != null ? String(row[i]).trim() : "");
const titleCase = (s) => s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

// sheets: { name: rows[][] }  ->  { roster, total, dropped }
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
