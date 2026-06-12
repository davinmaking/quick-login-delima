import { test } from "node:test";
import assert from "node:assert/strict";
import { buildRoster } from "../site/js/jana.js";

test("parses Tahun, skips GURU + bad emails, dedupes", () => {
  const sheets = {
    Tahun1: [["1", "Ali Bin Abu", "ali@moe-dl.edu.my"], ["2", "Siti", "bad-email"]],
    GURU:   [["1", "Cikgu X", "x@moe-dl.edu.my"]],
    Tahun2: [["1", "Ali Bin Abu", "ali@moe-dl.edu.my"]], // dup email -> dropped
  };
  const { roster, total, dropped } = buildRoster(sheets);
  assert.equal(total, 1);
  assert.equal(dropped, 2);
  assert.deepEqual(roster["Tahun 1"], [{ nama: "ALI BIN ABU", email: "ali@moe-dl.edu.my" }]);
  assert.ok(!("GURU" in roster));
});

test("PPKI two blocks with labels", () => {
  const sheets = { PPKI: [
    ["", "Sunshine", "",                  "", "Joyful", ""],
    ["", "Aiman",    "aiman@moe-dl.edu.my","", "Bala",  "bala@moe-dl.edu.my"],
  ]};
  const { roster } = buildRoster(sheets);
  assert.deepEqual(Object.keys(roster).sort(), ["PPKI Joyful", "PPKI Sunshine"]);
});

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
