/* =====================================================================
   tools/test-fragment.js — شکستِ محاسبه‌شده در برابرِ MS ثبت‌شده
   ---------------------------------------------------------------------
   دو چیز را می‌سنجد:

     ۱) پوشش — چند تا از m/zهایی که در متنِ MS نوشته شده، از روی گراف هم
        درمی‌آید. عددِ پایین لزوماً بد نیست (مسیرهای نادر مدل نشده‌اند)،
        ولی افتِ ناگهانی‌اش یعنی چیزی شکسته.

     ۲) ادعای مک‌لافرتیِ ناممکن — رکوردی که «مک‌لافرتی» می‌نویسد ولی
        مولکولش γ-هیدروژن ندارد. این خطای واقعی است، نه سلیقه: حالتِ
        گذارِ شش‌عضوی بدونِ آن هیدروژن بسته نمی‌شود. پروپیونیک اسید یک‌بار
        با چشم گرفته شد؛ این بررسی خودکارش می‌کند.

   اجرا:  node tools/test-fragment.js [--verbose]
   کدِ خروج ۱ اگر ادعای ناممکنی پیدا شود.
   ===================================================================== */
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.join(__dirname, "..");
const FILES = [
  "data/database.js", "data/field-data.js", "data/field-osfs-table.js",
  "data/database-expansion.js", "data/database-signatures.js", "data/bond-graphs.js",
  "js/structure.js", "js/inference.js", "js/fragment.js"
];
const sandbox = { console: { info() {}, warn() {}, log() {}, error() {} } };
sandbox.window = sandbox; sandbox.self = sandbox;
const ctx = vm.createContext(sandbox);
for (const f of FILES) vm.runInContext(fs.readFileSync(path.join(ROOT, f), "utf8"), ctx, { filename: f });
const DB = sandbox.DB, INF = sandbox.Inference, F = sandbox.Fragment;
if (DB.dedupeFieldProblems) DB.dedupeFieldProblems();

const VERBOSE = process.argv.includes("--verbose");
const norm = s => String(s == null ? "" : s)
  .replace(/[۰-۹]/g, d => String(d.charCodeAt(0) - 0x06F0))
  .replace(/[₀-₉]/g, d => String(d.charCodeAt(0) - 0x2080))
  .replace(/٫/g, ".").replace(/[−–—]/g, "-");

/* m/zهای ذکرشده در متن: عددهای صحیحِ دو تا چهار رقمی بیرون از پرانتز */
function statedMz(txt) {
  const body = norm(txt).replace(/\([^()]*\)/g, " ");
  return [...new Set((body.match(/\b\d{2,4}\b/g) || []).map(Number).filter(n => n >= 15 && n <= 999))];
}

let compounds = 0, statedTotal = 0, matched = 0;
const impossible = [];
const seen = new Set();

[...(DB.reference || []), ...(DB.fieldProblems || [])].forEach(r => {
  if (!r.en || seen.has(r.en) || !r.ms) return;
  seen.add(r.en);
  const mol = INF.moleculeOf(r);
  if (!mol) return;
  const pred = F.predict(mol);
  if (!pred) return;
  compounds++;

  const claimsMcL = /مک‌لافرتی|مک لافرتی|McLafferty/i.test(r.ms);
  /* متنی که خودش می‌گوید مک‌لافرتی *ممکن نیست* ادعا نیست، توضیح است. */
  const deniesMcL = /ممکن نیست|ندارد|نه مک/.test(r.ms);
  if (claimsMcL && !deniesMcL && !pred.hasGammaH)
    impossible.push({ en: r.en, formula: r.formula, ms: r.ms });

  const stated = statedMz(r.ms);
  const have = new Set(pred.fragments.map(f => f.mz).concat([pred.M]));
  stated.forEach(m => { statedTotal++; if (have.has(m)) matched++; });

  if (VERBOSE) {
    console.log("\n" + r.en + "  " + r.formula + "  M=" + pred.M);
    pred.fragments.slice(0, 8).forEach(f =>
      console.log("    m/z " + String(f.mz).padStart(4) + "  " + f.fa +
                  "   (خروجِ " + f.lost + ")"));
  }
});

console.log("=== شکستِ جرمی در برابرِ MS ثبت‌شده ===");
console.log("  ترکیب‌های سنجیده‌شده        : " + compounds);
console.log("  m/z های ذکرشده در متن‌ها   : " + statedTotal);
console.log("  از روی گراف هم درآمد       : " + matched +
            "  (" + (100 * matched / (statedTotal || 1)).toFixed(0) + "%)");

if (impossible.length) {
  console.log("\n✗ ادعای مک‌لافرتی بدونِ γ-هیدروژن (" + impossible.length + "):");
  impossible.forEach(x => {
    console.log("   " + x.en + "  " + x.formula);
    console.log("      " + x.ms);
  });
  process.exitCode = 1;
} else {
  console.log("\n✓ هیچ ادعای مک‌لافرتیِ ناممکنی نیست");
}
