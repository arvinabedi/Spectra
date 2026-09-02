/* =====================================================================
   tools/test-predict.js — دقتِ پیش‌بینِ شیفتِ ¹³C روی خودِ بانک
   ---------------------------------------------------------------------
   js/predict.js عدد می‌دهد؛ این ابزار می‌گوید آن عدد چقدر می‌ارزد.
   بدونِ این، هر تغییری در قاعده‌ها یک قمار است: ممکن است ده ترکیب بهتر
   شود و بیست‌تا بدتر و کسی نفهمد.

   روشِ سنجش: برای هر رکوردی که هم ساختارِ قطعی دارد و هم فهرستِ تمیزِ
   شیفت، پیش‌بینی‌ها و شیفت‌های ثبت‌شده هر دو نزولی مرتب و یک‌به‌یک جفت
   می‌شوند. این ساده‌ترین انتساب است و همان کاری است که دانشجو می‌کند.
   جفت‌کردن فقط وقتی انجام می‌شود که تعدادِ دو طرف برابر باشد؛ وگرنه
   انتساب بی‌معنا می‌شود و رکورد کنار گذاشته می‌شود.

   متن‌هایی که نثر دارند («۸ پیک»، «۲ محیط»، «آروماتیک») کنار گذاشته
   می‌شوند: عددهای داخلِ نثر شیفت نیستند و اگر شمرده شوند، خطای ابزار
   به حسابِ خطای پیش‌بین نوشته می‌شود.

   اجرا:  node tools/test-predict.js  [--worst N] [--compound NAME]
   ===================================================================== */
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.join(__dirname, "..");
const FILES = [
  "data/database.js", "data/field-data.js", "data/field-osfs-table.js",
  "data/database-expansion.js", "data/database-signatures.js", "data/bond-graphs.js",
  "js/structure.js", "js/inference.js", "js/predict.js"
];

const sandbox = { console: { info() {}, warn() {}, log() {}, error() {} } };
sandbox.window = sandbox; sandbox.self = sandbox;
const ctx = vm.createContext(sandbox);
for (const f of FILES) vm.runInContext(fs.readFileSync(path.join(ROOT, f), "utf8"), ctx, { filename: f });
const DB = sandbox.DB, INF = sandbox.Inference, S = sandbox.Structure, P = sandbox.Predict;
if (DB.dedupeFieldProblems) DB.dedupeFieldProblems();

const norm = s => String(s == null ? "" : s)
  .replace(/[۰-۹]/g, d => String(d.charCodeAt(0) - 0x06F0))
  .replace(/[₀-₉]/g, d => String(d.charCodeAt(0) - 0x2080))
  .replace(/٫/g, ".").replace(/[−–—]/g, "-");

/* فهرستِ شیفت‌ها فقط وقتی پذیرفته می‌شود که متن نثر نداشته باشد */
const PROSE = /سیگنال|پیک|محیط|آروماتیک|کربن|فقط|تنها|همه|حدود/;
function statedShifts(txt) {
  const raw = norm(txt);
  if (PROSE.test(raw)) return null;
  const body = raw.replace(/\([^()]*\)/g, " ").replace(/[0-9.]+\s*Hz/g, " ");
  const v = (body.match(/-?\d+(?:\.\d+)?/g) || []).map(Number).filter(x => x >= -15 && x <= 235);
  if (!v.length) return null;
  return [...new Set(v.map(x => x.toFixed(1)))].map(Number).sort((a, b) => b - a);
}

const byId = {};
(DB.blocks || []).forEach(b => { byId[b.id] = b; });

const only = (() => {
  const i = process.argv.indexOf("--compound");
  return i > 0 ? process.argv[i + 1] : null;
})();
const worstN = (() => {
  const i = process.argv.indexOf("--worst");
  return i > 0 ? Number(process.argv[i + 1]) : 12;
})();

const rows = [];
let noStructure = 0, noShifts = 0, countMismatch = 0, incomplete = 0;
const seen = new Set();

[...(DB.reference || []), ...(DB.fieldProblems || [])].forEach(r => {
  if (!r.en || seen.has(r.en) || !r.c13) return;
  seen.add(r.en);
  if (only && r.en !== only) return;

  const mol = INF.moleculeOf(r);
  if (!mol) { noStructure++; return; }
  const stated = statedShifts(r.c13);
  if (!stated) { noShifts++; return; }

  const pred = P.carbon13(mol, DB);
  if (pred.some((p, i) => mol.atoms[i].el === "C" && !p)) { incomplete++; return; }

  /* یک شیفت به ازای هر *محیط*، نه هر اتم */
  const cls = S.refineClasses(mol);
  const byClass = new Map();
  mol.atoms.forEach((a, i) => {
    if (a.el !== "C") return;
    if (!byClass.has(cls[i])) byClass.set(cls[i], pred[i]);
  });
  const predicted = [...byClass.values()].map(p => p.delta).sort((a, b) => b - a);

  if (predicted.length !== stated.length) { countMismatch++; return; }

  const errs = predicted.map((p, k) => Math.abs(p - stated[k]));
  rows.push({
    en: r.en, formula: r.formula, n: predicted.length,
    mae: errs.reduce((s, x) => s + x, 0) / errs.length,
    max: Math.max.apply(null, errs),
    pairs: predicted.map((p, k) => [stated[k], p])
  });
});

if (only) {
  const row = rows[0];
  if (!row) { console.log("رکوردی برای «" + only + "» سنجیده نشد."); process.exit(0); }
  console.log("=== " + row.en + "  " + row.formula + " ===");
  console.log("  ثبت‌شده   پیش‌بینی   اختلاف");
  row.pairs.forEach(p => console.log(
    "  " + String(p[0]).padStart(7) + "   " + p[1].toFixed(1).padStart(7) +
    "   " + (p[1] - p[0]).toFixed(1).padStart(6)));
  console.log("  MAE " + row.mae.toFixed(2) + "   بدترین " + row.max.toFixed(1));
  process.exit(0);
}

const all = rows.reduce((s, r) => s.concat(r.pairs.map(p => Math.abs(p[1] - p[0]))), []);
const mae = all.reduce((s, x) => s + x, 0) / (all.length || 1);
const within = t => (100 * all.filter(x => x <= t).length / (all.length || 1)).toFixed(0);

console.log("=== دقتِ پیش‌بینِ ¹³C ===");
console.log("  ترکیب‌های سنجیده‌شده : " + rows.length);
console.log("  شیفت‌های مقایسه‌شده  : " + all.length);
console.log("  میانگینِ قدرمطلقِ خطا : " + mae.toFixed(2) + " ppm");
console.log("  در ۵ppm  : " + within(5) + "%");
console.log("  در ۱۰ppm : " + within(10) + "%");
console.log("  در ۲۰ppm : " + within(20) + "%");
console.log("\n  کنار گذاشته شد — بدونِ ساختارِ قطعی: " + noStructure +
            " · بدونِ فهرستِ تمیزِ شیفت: " + noShifts +
            " · کربنِ بی‌قاعده: " + incomplete +
            " · تعدادِ شیفت با تعدادِ محیط نمی‌خواند: " + countMismatch);

rows.sort((a, b) => b.mae - a.mae);
console.log("\n--- بدترین " + worstN + " ترکیب (برای بهبودِ قاعده‌ها) ---");
rows.slice(0, worstN).forEach(r => console.log(
  "  MAE " + r.mae.toFixed(1).padStart(5) + "  بدترین " + r.max.toFixed(0).padStart(3) +
  "  " + r.en));
console.log("\n  جزئیاتِ یک ترکیب:  node tools/test-predict.js --compound \"NAME\"");
