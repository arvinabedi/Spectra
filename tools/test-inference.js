/* =====================================================================
   tools/test-inference.js — آزمونِ رگرسیونِ موتورِ استنتاج
   ---------------------------------------------------------------------
   چرا این فایل وجود دارد:
     همین بررسی‌ها پیش‌تر به‌صورت اسکریپت‌های یک‌بارمصرف در پوشهٔ موقت
     نوشته می‌شدند. دو مشکل داشت: بین نشست‌ها گم می‌شدند، و یکی از آن‌ها
     منطقِ impliedEvidence را کپی کرده بود و وقتی موتور عوض شد، بی‌صدا از
     آن جدا افتاد و خطا داد. اینجا همه‌شان ماندگار شده‌اند و همه از
     خودِ موتور می‌خوانند، نه از کپیِ منطق.

   اجرا:  node tools/test-inference.js
          node tools/test-inference.js --verbose     (فهرستِ کاملِ خطاها)
   کدِ خروج ۱ اگر معیارها افت کنند، پس می‌شود در زنجیرهٔ ساخت گذاشتش:
       derive-signatures → validate-database → test-inference → build
   ===================================================================== */
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.join(__dirname, "..");
const VERBOSE = process.argv.includes("--verbose");

/* آستانه‌ها: عددِ امروز منهای کمی حاشیه. اگر تغییری این‌ها را بشکند،
   یعنی کیفیتِ تشخیص افت کرده و باید عمداً بازبینی شود. */
const THRESHOLDS = {
  top1: 0.94,      // امروز ۰.۹۶۵
  top3: 0.99,      // امروز ۱.۰۰
  scenarios: 1.0   // همهٔ سناریوهای دستی باید رتبهٔ ۱ بدهند
};

/* ---------- بارگذاری ---------- */
function load() {
  const sandbox = { console: { info() {}, warn() {}, log() {}, error() {} } };
  sandbox.window = sandbox; sandbox.self = sandbox;
  const ctx = vm.createContext(sandbox);
  for (const f of ["data/database.js", "data/field-data.js", "data/field-osfs-table.js",
                   "data/database-expansion.js", "data/database-signatures.js",
                   "js/inference.js"]) {
    vm.runInContext(fs.readFileSync(path.join(ROOT, f), "utf8"), ctx, { filename: f });
  }
  const DB = sandbox.DB;
  if (DB.dedupeFieldProblems) DB.dedupeFieldProblems();
  return { DB, Inf: sandbox.Inference };
}
const { DB, Inf } = load();

/* استخرِ جست‌وجو با همان قاعدهٔ دِدآپِ موتور */
const seen = new Set(), pool = [];
DB.reference.concat(DB.fieldProblems).forEach(r => {
  const k = r.en || r.name;
  if (!k || seen.has(k)) return;
  seen.add(k);
  pool.push(r);
});
const withSig = pool.filter(r => r.signature && r.signature.length);
const find = n => pool.find(r => (r.en || r.name) === n);

let failed = 0;
const section = t => console.log("\n" + t + "\n" + "─".repeat(t.length));
const ok = (label, pass, detail) =>
  console.log("  " + (pass ? "✓" : "✗") + " " + label + (detail ? "  " + detail : ""));

/* =====================================================================
   ۱) خودسازگاری: هر ترکیب با امضای خودش باید خودش را اول بیاورد
   ===================================================================== */
section("۱) خودسازگاری روی کلِ کتابخانه");
{
  let t1 = 0, t3 = 0;
  const misses = [];
  withSig.forEach(r => {
    const st = {};
    r.signature.forEach(t => { st[t] = true; });
    const names = Inf.analyze(st, {}).references.map(x => x.ref.en || x.ref.name);
    const me = r.en || r.name;
    const i = names.indexOf(me);
    if (i === 0) t1++;
    if (i >= 0 && i < 3) t3++;
    if (i !== 0) misses.push(me + "  → رتبهٔ " + (i < 0 ? ">5" : i + 1) + "، بالاتر: " + (names[0] || "—"));
  });
  const r1 = t1 / withSig.length, r3 = t3 / withSig.length;
  console.log("  ترکیب‌های آزموده‌شده: " + withSig.length);
  ok("رتبهٔ ۱: " + (100 * r1).toFixed(1) + "%", r1 >= THRESHOLDS.top1, "(آستانه " + (100 * THRESHOLDS.top1).toFixed(0) + "%)");
  ok("سه‌تای اول: " + (100 * r3).toFixed(1) + "%", r3 >= THRESHOLDS.top3, "(آستانه " + (100 * THRESHOLDS.top3).toFixed(0) + "%)");
  if (r1 < THRESHOLDS.top1 || r3 < THRESHOLDS.top3) failed++;
  if (misses.length) {
    console.log("  " + misses.length + " مورد رتبهٔ ۱ نشدند (جفت‌های ایزومرِ نزدیک):");
    (VERBOSE ? misses : misses.slice(0, 5)).forEach(m => console.log("      · " + m));
    if (!VERBOSE && misses.length > 5) console.log("      … (--verbose برای فهرست کامل)");
  }
}

/* =====================================================================
   ۲) سناریوهای دستی: طیفِ واقعی، پاسخِ معلوم
   ===================================================================== */
section("۲) سناریوهای دستیِ تشخیص");
{
  const SCENARIOS = [
    { want: "p-Toluenesulfonamide", why: "گوگرد: دو نوارِ SO₂ + پارا + تسیل",
      state: { ir_so2: true, ir_nh: true, ir_para: true, h_para: true, wet_elem_s: true, wet_elem_n: true, msFragments: "155,91" } },
    { want: "Salicylaldehyde", why: "اثرِ اورتو: OH کِلاته + شاخکِ فرمی",
      state: { ir_aldehyde: true, ir_oh_alc: true, ir_ortho: true, h_acid: true, c_ketone: true, msFragments: "122,121" } },
    { want: "Iodobenzene", why: "اثرِ اتمِ سنگین + پیکِ ۱۲۷",
      state: { c_heavy_i: true, ir_aromatic: true, ir_mono: true, h_ar: true, wet_elem_i: true, msFragments: "204,127,77" } },
    { want: "Acetanilide", why: "آمیدِ نوع دوم: یک نوارِ N–H + آمید II",
      state: { ir_nh: true, ir_co_amide: true, ir_amide_ii: true, h_ar: true, wet_elem_n: true, msFragments: "135,93,43" } },
    { want: "Maleic acid", why: "هندسهٔ سیس: خمشِ OOP ۷۰۰",
      state: { ir_oh_acid: true, ir_oop_cis: true, h_acid: true, c_ester: true, msFragments: "116,98,72" } },
    { want: "Diethyl sulfide", why: "تیواتر: بدونِ S–H، پیکِ ۶۱",
      state: { wet_elem_s: true, c_alkyl: true, h_alpha: true, msFragments: "90,75,61,47" } },
    { want: "Acetic anhydride", why: "دو نوارِ کربونیلِ انیدرید",
      state: { ir_anhydride: true, c_ester: true, h_alpha: true, msFragments: "102,43" } },
    { want: "1,2-Dibromoethane", why: "الگوی ۱:۲:۱ دو برم",
      state: { ms_br2: true, c_alkyl: true, h_hetero: true, msFragments: "107,27" } },
    { want: "Piperonal", why: "استالِ حلقوی + آلدهیدِ آروماتیک",
      state: { ir_aldehyde: true, h_ald: true, h_acetal: true, ir_co_single: true, msFragments: "150,149,121" } },
    { want: "Fluorenone", why: "کتونِ آریلیِ حلقوی، افتِ CO",
      state: { ir_co_conj: true, c_ketone: true, h_ar: true, ir_aromatic: true, msFragments: "180,152" } }
  ];
  let pass = 0;
  SCENARIOS.forEach(sc => {
    const top = Inf.analyze(sc.state, {}).references.map(x => x.ref.en || x.ref.name);
    const good = top[0] === sc.want;
    if (good) pass++;
    ok(sc.want + " — " + sc.why, good, good ? "" : "→ به‌جایش: " + (top[0] || "هیچ"));
  });
  const rate = pass / SCENARIOS.length;
  console.log("  " + pass + " از " + SCENARIOS.length);
  if (rate < THRESHOLDS.scenarios) failed++;
}

/* =====================================================================
   ۳) قواعدِ شیمیِ تر: تستِ درست روی ترکیبِ درست
   هر ردیف یک اشتباهِ واقعیِ رفع‌شده است، پس نباید برگردد.
   ===================================================================== */
section("۳) قواعدِ شواهدِ ضمنی (تستِ کلاسیک)");
{
  const CASES = [
    { name: "Glycylglycine",   must: ["wet_biuret_pos"], why: "پیوندِ پپتیدی" },
    { name: "Acetanilide",     mustNot: ["wet_dnp_pos", "wet_iodoform_pos"], why: "N-استیل آمید است، نه متیل‌کتون" },
    { name: "Tetramethylurea", mustNot: ["wet_dnp_pos"], why: "اوره؛ کربونیلِ غیرفعال" },
    { name: "Diethyl oxalate", mustNot: ["wet_dnp_pos"], why: "دی‌استر" },
    { name: "1-Phenylethanol", must: ["wet_lucas_any"], mustNot: ["wet_fecl3_pos"], why: "الکلِ بنزیلی است، نه فنول" },
    { name: "4-Nitro-o-cresol", must: ["wet_fecl3_pos"], mustNot: ["wet_lucas_any"], why: "فنول است" },
    { name: "2-Hydroxycyclohex-2-en-1-one", must: ["wet_fecl3_pos"], mustNot: ["wet_lucas_any"], why: "انول؛ FeCl₃ مثبت و لوکاس بی‌معنا" },
    { name: "Salicylaldehyde", must: ["wet_dnp_pos", "wet_fecl3_pos"], why: "هم آلدهیدِ آزاد، هم فنول" },
    { name: "Phenol",          mustNot: ["wet_lucas_any"], why: "فنول" },
    { name: "Iodobenzene",     must: ["wet_agno3_1"], why: "هالیدِ آریلی با AgNO₃ رسوب نمی‌دهد" },
    { name: "Acetophenone",    must: ["wet_iodoform_pos"], why: "متیل‌کتون" }
  ];
  CASES.forEach(c => {
    const rec = find(c.name);
    if (!rec) { ok(c.name, false, "در کتابخانه پیدا نشد"); failed++; return; }
    const ev = new Set([...(rec.signature || []), ...Inf.impliedEvidence(rec)]);
    const bad = [];
    (c.must || []).forEach(t => { if (!ev.has(t)) bad.push("ندارد: " + t); });
    (c.mustNot || []).forEach(t => { if (ev.has(t)) bad.push("نباید داشته باشد: " + t); });
    if (bad.length) failed++;
    ok(c.name + " — " + c.why, !bad.length, bad.join(" · "));
  });
}

/* =====================================================================
   ۴) معیارهای اطلاعاتی (بی‌آستانه) — برای دیدنِ روند
   ===================================================================== */
section("۴) معیارهای اطلاعاتی");
{
  const byId = new Map(DB.blocks.map(b => [b.id, b]));
  const parse = str => {
    const a = {}; let m; const re = /([A-Z][a-z]?)(\d*)/g;
    while ((m = re.exec(String(str))) !== null) { if (!m[1]) continue; a[m[1]] = (a[m[1]] || 0) + (m[2] ? +m[2] : 1); }
    return a;
  };
  let complete = 0, partial = 0;
  pool.forEach(r => {
    if (!r.formula || !r.chain || !r.chain.length) return;
    if (r.chain.some(id => !byId.has(id))) return;
    const sum = {};
    r.chain.forEach(id => { const at = byId.get(id).atoms || {};
      for (const [e, v] of Object.entries(at)) sum[e] = (sum[e] || 0) + v; });
    ((sum.C || 0) === (parse(r.formula).C || 0)) ? complete++ : partial++;
  });
  console.log("  زنجیرهٔ کامل: " + complete + "   ناقص: " + partial +
              "  (" + (100 * complete / (complete + partial)).toFixed(0) + "% کامل)");

  /* دقتِ پیش‌بینیِ تقارن، سنجیده با شمارشِ شیفت‌های متنِ ¹³C.
     این عدد عمداً گزارش می‌شود و در امتیازدهی دخالت ندارد — با ۳۷٪ تطابقِ
     دقیق، جریمه‌دادن بر پایه‌اش پاسخِ درست را پایین می‌برد. */
  const FA = "۰۱۲۳۴۵۶۷۸۹";
  const lat = t => String(t).replace(/[۰-۹]/g, d => FA.indexOf(d));
  let n = 0, exact = 0, near = 0, under = 0;
  pool.forEach(r => {
    if (!r.c13 || !r.chain || !r.chain.length) return;
    if (r.chain.some(id => !byId.has(id))) return;
    const nums = (lat(r.c13).replace(/\d+(?:\.\d+)?\s*Hz/gi, " ").match(/\d+(?:\.\d+)?/g) || [])
      .map(Number).filter(v => v >= 0 && v <= 230);
    const T = new Set(nums.map(Math.round)).size;
    if (T < 2) return;
    const P = Inf.predictSymmetry(r.chain.map(id => ({ id }))).predictedC13;
    if (!P) return;
    n++;
    if (P === T) exact++;
    if (Math.abs(P - T) <= 1) near++;
    if (P < T) under++;
  });
  if (n) {
    console.log("  دقتِ predictSymmetry روی " + n + " ترکیب: " +
                (100 * exact / n).toFixed(0) + "% دقیق، " + (100 * near / n).toFixed(0) + "% با خطای ±۱، " +
                under + " مورد کم‌تر از واقعیت");
    console.log("    (اطلاعاتی؛ عمداً در رتبه‌بندی دخالت نمی‌کند — توضیح در inference.js)");
  }
}

/* =====================================================================
   خلاصه
   ===================================================================== */
console.log("\n" + "═".repeat(46));
if (failed) {
  console.log(failed + " دستهٔ آزمون شکست خورد.");
  process.exit(1);
}
console.log("همهٔ آزمون‌ها گذشت ✓");
