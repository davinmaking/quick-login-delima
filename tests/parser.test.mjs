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
