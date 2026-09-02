/* =====================================================================
   tools/validate-database.js — ممیزیِ یکپارچگیِ پایگاه دانش
   ---------------------------------------------------------------------
   این ابزار پایگاه را همان‌طور که مرورگر بارگذاری می‌کند بالا می‌آورد و
   خطاهایی را می‌گیرد که با چشم دیده نمی‌شوند. هر بررسی، پاسخِ یک اشتباهِ
   واقعیِ پیداشده در ممیزیِ تکمیلِ پایگاه است:

     ۱) تگِ ارجاع‌شده در امضا که کاربر هیچ راهی برای ثبتش ندارد
        (امتیازِ آن مرجع همیشه زیرِ صد درصد قفل می‌ماند، چون امتیاز کسری
        از طولِ امضا است)
     ۲) تگی که در UI چک‌باکس دارد اما هیچ امضایی و هیچ قاعده‌ای نمی‌خواندش
        (کاربر تیک درست می‌زند و هیچ اتفاقی نمی‌افتد)
     ۳) امضایی که با فرمولِ مولکولیِ خودش در تناقض است
        (مثلاً ۱،۲-دی‌برمواتان که امضایش ms_br یعنی «یک برم» بود، در حالی
        که دو برم دارد و الگویش ۱:۲:۱ است)
     ۴) ترکیبِ تکراری و کلیدِ تکراری در جدول‌ها
     ۵) زنجیرهٔ بلوک که به بلوکِ ناموجود اشاره می‌کند، یا فرمولی که با
        مجموعِ اتم‌های زنجیره نمی‌خواند
     ۶) جدولی در پایگاه که هیچ مصرف‌کننده‌ای در js/ یا index.html ندارد
     ۷) متنِ طیفی که با فرمولِ خودِ رکورد نمی‌خواند: یونِ مولکولی، قاعدهٔ
        نیتروژن، جرمِ قطعه‌های MS، حسابِ خروجِ خنثی، مجموعِ انتگرالِ ¹H،
        شمارِ محیط‌های ¹³C و عددِ بیرون از بازهٔ فیزیکی
        (نمونه: رکوردِ «دی‌استیل» که طیفِ ۲،۳-پنتان‌دی‌اون را حمل می‌کرد)
     ۸) ترکیبِ تکراری با دو نامِ مترادف، که دِدآپِ نام‌محور نمی‌گیردش

   اجرا:  node tools/validate-database.js
   کدِ خروج ۱ اگر خطای دستهٔ «خطا» پیدا شود (برای استفاده در اسکریپتِ ساخت).
   ===================================================================== */
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.join(__dirname, "..");
const DATA_FILES = [
  "data/database.js", "data/field-data.js", "data/field-osfs-table.js",
  "data/database-expansion.js", "data/database-signatures.js",
  "data/bond-graphs.js"
];
const CODE_FILES = [
  "js/app.js", "js/inference.js", "js/calculators.js", "js/renderer.js",
  "js/structure.js", "js/predict.js", "js/live-viz.js", "js/practice.js", "js/field-ui.js",
  "js/session.js", "js/reference-tables.js", "index.html"
];

const errors = [], warnings = [];
function err(msg) { errors.push(msg); }
function warn(msg) { warnings.push(msg); }

/* ---------- بارگذاری ---------- */
const sandbox = { console: { info() {}, warn() {}, log() {}, error() {} } };
sandbox.window = sandbox; sandbox.self = sandbox;
const ctx = vm.createContext(sandbox);
/* dedupeFieldProblems وسطِ بارگذاری هم صدا زده می‌شود (انتهای
   field-osfs-table.js)، پس تا اینجا بعضی تکراری‌ها رفته‌اند. برای بررسیِ ۹
   باید فهرست را *پیش از هر جمع‌کردن* دید. تابع را عوض نمی‌کنیم، دورش
   می‌پیچیم: دِدآپِ واقعی سرِ جای خودش اجرا می‌شود تا ترتیبِ بارگذاری
   دقیقاً همانِ مرورگر بماند، و ما فقط قبلش یک تصویر برمی‌داریم. */
const preDedupeSnapshots = [];
let dedupeWrapped = false;
for (const f of DATA_FILES) {
  try { vm.runInContext(fs.readFileSync(path.join(ROOT, f), "utf8"), ctx, { filename: f }); }
  catch (e) { err("بارگذاری «" + f + "» شکست خورد: " + e.message); }
  if (!dedupeWrapped && sandbox.DB && typeof sandbox.DB.dedupeFieldProblems === "function") {
    const real = sandbox.DB.dedupeFieldProblems;
    const wrapper = function () {
      preDedupeSnapshots.push((sandbox.DB.fieldProblems || []).slice());
      return real.apply(this, arguments);
    };
    Object.assign(wrapper, real);        // canon و هر چیزِ دیگری که روی تابع نشسته
    sandbox.DB.dedupeFieldProblems = wrapper;
    dedupeWrapped = true;
  }
}
const DB = sandbox.DB;
if (!DB) { console.error("DB ساخته نشد — ممیزی متوقف شد."); process.exit(1); }
if (DB.dedupeFieldProblems) DB.dedupeFieldProblems();
/* همهٔ رکوردهایی که در هر مرحله وجود داشته‌اند، حتی اگر بعداً حذف شده‌اند */
const preDedupe = [];
{
  const byRef = new Set();
  preDedupeSnapshots.forEach(list => list.forEach(p => { if (!byRef.has(p)) { byRef.add(p); preDedupe.push(p); } }));
}

/* موتور استنتاج هم بارگذاری می‌شود تا بررسی‌های وابسته به «شواهد ضمنی»
   از همان impliedEvidence واقعی استفاده کنند، نه از کپیِ منطق. */
let Inference = null;
try {
  vm.runInContext(fs.readFileSync(path.join(ROOT, "js/inference.js"), "utf8"), ctx, { filename: "js/inference.js" });
  Inference = sandbox.Inference;
} catch (e) { warn("بارگذاری js/inference.js برای بررسی شواهد ضمنی نشد: " + e.message); }

/* ---------- قالبِ اتمیِ بلوک‌ها (DB.blockStructures) ----------
   ماژولِ تقارن مولکول را از این قالب‌ها می‌سازد، پس یک قالبِ غلط بی‌صدا
   به عددِ تقارنِ غلط تبدیل می‌شود. سه چیز سنجیده می‌شود:
     • SMILES خوانده شود،
     • اتم‌هایی که تولید می‌کند (پس از پُرکردنِ اسلات‌ها) دقیقاً همان
       چیزی باشد که خودِ بلوک در atoms اعلام کرده،
     • طولِ attach با slots یکی باشد.
   بلوکِ بی‌قالب فقط هشدار است: موتور در آن حالت عمداً سکوت می‌کند. */
{
  let St = null;
  try {
    vm.runInContext(fs.readFileSync(path.join(ROOT, "js/structure.js"), "utf8"), ctx, { filename: "js/structure.js" });
    St = sandbox.Structure;
  } catch (e) { warn("بارگذاری js/structure.js برای بررسی قالبِ بلوک‌ها نشد: " + e.message); }

  if (St && DB.blockStructures) {
    const noTemplate = [];
    (DB.blocks || []).forEach(b => {
      const t = DB.blockStructures[b.id];
      if (!t) { noTemplate.push(b.id); return; }
      if (!t.smiles || !Array.isArray(t.attach))
        return err("قالبِ بلوکِ «" + b.id + "» ناقص است (smiles/attach لازم است).");
      if (t.attach.length !== (b.slots || 1))
        err("قالبِ بلوکِ «" + b.id + "»: attach " + t.attach.length + " نقطه دارد ولی slots برابرِ " + (b.slots || 1) + " است.");
      let mol;
      try { mol = St.parseSMILES(t.smiles); }
      catch (e) { return err("SMILES بلوکِ «" + b.id + "» خوانده نشد: " + t.smiles); }
      const nReal = mol.atoms.length;
      if (!nReal) return err("SMILES بلوکِ «" + b.id + "» هیچ اتمی نداد: " + t.smiles);
      if (t.attach.some(i => !(i >= 0 && i < nReal)))
        return err("قالبِ بلوکِ «" + b.id + "»: attach به اتمی خارج از SMILES اشاره می‌کند.");
      // اسلات‌ها را با اتمِ ساختگی پُر می‌کنیم تا شمارِ هیدروژن واقعی شود
      t.attach.forEach(ai => {
        const d = mol.atoms.length;
        mol.atoms.push({ el: "H", arom: false, charge: 0, hExplicit: 0 });
        mol.bonds.push({ a: ai, b: d, order: 1 });
      });
      St.computeHydrogens(mol);
      const got = {};
      for (let i = 0; i < nReal; i++) {
        const a = mol.atoms[i];
        got[a.el] = (got[a.el] || 0) + 1;
        if (a.H) got.H = (got.H || 0) + a.H;
      }
      const keys = new Set(Object.keys(got).concat(Object.keys(b.atoms || {})));
      const off = [...keys].filter(k => (got[k] || 0) !== ((b.atoms || {})[k] || 0))
                           .map(k => k + ": قالب " + (got[k] || 0) + " ≠ اعلامِ بلوک " + ((b.atoms || {})[k] || 0));
      if (off.length)
        err("قالبِ بلوکِ «" + b.id + "» (" + t.smiles + ") با atoms خودش نمی‌خواند — " + off.join(" · "));
    });
    if (noTemplate.length)
      warn(noTemplate.length + " بلوک قالبِ اتمی ندارند، پس ماژولِ تقارن برایشان سکوت می‌کند: " +
           noTemplate.join("، ") + "  (اگر الگوی استخلافشان معلوم است، قالب اضافه کنید)");

    /* blockCarbonEnvCount در برابر همان قالبِ اتمی.
       این جدول دستی نوشته شده بود و دو مقدارش غلط بود (phenylene_m
       چهار به‌جای شش، naphthyl هفت به‌جای ده). حالا از گراف سنجیده
       می‌شود: هر اسلات با یک اتمِ کاوشگرِ متمایز پُر می‌شود تا شرطِ
       «در زنجیرهٔ غیرمتقارن» که تعریفِ خودِ جدول است برقرار شود. */
    const PROBE = ["F", "Cl", "Br", "I", "At", "Ts"];
    Object.keys(DB.blockCarbonEnvCount || {}).forEach(id => {
      const t = DB.blockStructures[id];
      if (!t) return;
      let mol;
      try { mol = St.parseSMILES(t.smiles); } catch (e) { return; }
      const nReal = mol.atoms.length;
      t.attach.forEach((ai, k) => {
        const d = mol.atoms.length;
        mol.atoms.push({ el: PROBE[k] || "F", arom: false, charge: 0, hExplicit: 0 });
        mol.bonds.push({ a: ai, b: d, order: 1 });
      });
      St.computeHydrogens(mol);
      const cls = St.refineClasses(mol);
      const cs = new Set();
      for (let i = 0; i < nReal; i++) if (mol.atoms[i].el === "C") cs.add(cls[i]);
      if (cs.size !== DB.blockCarbonEnvCount[id])
        err("blockCarbonEnvCount[\"" + id + "\"] برابرِ " + DB.blockCarbonEnvCount[id] +
            " است ولی گرافِ اتمیِ همان بلوک " + cs.size + " محیطِ کربن می‌دهد.");
    });
  }
}

/* ---------- IHD اعلام‌شده در برابر فرمول ----------
   IHD از فرمول یکتا به‌دست می‌آید، پس هر اختلافی خطای داده است. این
   بررسی نبود و ۱۴ رکورد با IHD غلط از آن رد شده بودند — از جمله سه
   سؤالِ بانکِ تمرین، که بد است چون prCheck در js/practice.js پاسخِ
   دانشجو را با همین عدد می‌سنجد و به IHDِ درست می‌گوید غلط.
   (نمونه: ۱-نیترونفتالین ۷ نوشته بود، درست ۸ است.)

   هر دو فهرست جدا سنجیده می‌شوند: dedupe بر پایهٔ نام، رکوردِ
   reference را جلوی fieldProblems می‌گذارد، پس اگر فقط روی استخرِ
   یکتاشده بسنجیم، غلط‌های بانکِ تمرین پشتِ نسخهٔ reference پنهان
   می‌مانند — دقیقاً همان تلهٔ سایه‌افتادنِ searchPool. */
["reference", "fieldProblems"].forEach(key => {
  (DB[key] || []).forEach(r => {
    if (r.ihd == null || !r.formula) return;
    const a = parseFormula(r.formula);
    const X = (a.F || 0) + (a.Cl || 0) + (a.Br || 0) + (a.I || 0);
    const want = (a.C || 0) - ((a.H || 0) + X) / 2 + ((a.N || 0) / 2) + 1;
    if (want !== Number(r.ihd))
      err("[" + key + "] «" + (r.en || r.name) + "» (" + r.formula + "): IHD اعلام‌شده " +
          r.ihd + " است ولی از فرمول " + want + " درمی‌آید.");
  });
});
/* جدول‌های مرجعِ فرمول‌دار (مثل DB.h1.aromaticCores) هم IHD دارند */
Object.keys(DB).forEach(k => {
  const t = DB[k];
  if (!t || typeof t !== "object") return;
  const scan = arr => (Array.isArray(arr) ? arr : []).forEach(row => {
    if (!row || row.ihd == null || !row.formula) return;
    const a = parseFormula(row.formula);
    const X = (a.F || 0) + (a.Cl || 0) + (a.Br || 0) + (a.I || 0);
    const want = (a.C || 0) - ((a.H || 0) + X) / 2 + ((a.N || 0) / 2) + 1;
    if (want !== Number(row.ihd))
      err("جدولِ «" + k + "» — «" + (row.id || row.fa || "?") + "» (" + row.formula +
          "): IHD اعلام‌شده " + row.ihd + " ≠ " + want + " از فرمول.");
  });
  if (Array.isArray(t)) scan(t);
  else Object.keys(t).forEach(sub => { if (Array.isArray(t[sub])) scan(t[sub]); });
});

/* ---------- ۷) متنِ طیفی در برابرِ فرمولِ خودِ رکورد ----------
   رکوردها متنِ آزادِ فارسی دارند، ولی بخشِ عددیِ همان متن با فرمول
   قابلِ راستی‌آزمایی است. ممیزیِ ۱۴۰۴/۰۶/۱۱ با همین بررسی‌ها هشت
   رکوردِ غلط پیدا کرد که هیچ آزمونِ دیگری نمی‌گرفت — از جمله رکوردی
   که کلاً طیفِ ترکیبِ دیگری را حمل می‌کرد («دی‌استیل» با دادهٔ
   ۲،۳-پنتان‌دی‌اون) و دو ترکیب که دو بار ثبت شده بودند.

   نکتهٔ روشِ کار: در همان ممیزی از هجده نشانه، هفت‌تا ایرادِ خودِ
   ابزار بود نه ایرادِ داده — جفتِ ایزوتوپیِ ۱۰۷/۱۰۹ که دو عدد خوانده
   شد، ثابتِ کوپلاژِ ۲۷۰Hz که شیفت شمرده شد، پیشوندِ «۹ سیگنال» که
   خودش شیفت شمرده شد، و بازهٔ ۲.۴-۲.۲ که عددِ منفی خوانده شد. پس هر
   بررسیِ این‌جا عمداً محافظه‌کار است: هرچه مبهم بخوانَد رد می‌کند، نه
   گزارش. اگر روزی نشانهٔ نادرست دیدید، اول همین نرمال‌سازی‌ها را شک کنید. */

/* ارقامِ فارسی/عربی/زیرنویس ← اسکی؛ منهای ریاضی و خط‌تیرهٔ بلند ← «-» */
function norm(s) {
  return String(s == null ? "" : s)
    .replace(/[۰-۹]/g, d => String(d.charCodeAt(0) - 0x06F0))
    .replace(/[٠-٩]/g, d => String(d.charCodeAt(0) - 0x0660))
    .replace(/[₀-₉]/g, d => String(d.charCodeAt(0) - 0x2080))
    .replace(/٫/g, ".")
    .replace(/[−–—]/g, "-");
}
/* ثابتِ کوپلاژ عدد است ولی شیفت نیست */
function stripJ(s) {
  return s.replace(/[0-9.]+\s*Hz/g, " ")
          .replace(/J[^\s،,]*\s*[=≈~]*\s*[0-9.]+/g, " ");
}
/* «۱۳۲-۱۲۳» و «۰ تا -۱» یک ورودی‌اند، نه دو عدد */
function collapseRanges(s) {
  return s.replace(/(-?\d+(?:\.\d+)?)\s*تا\s*(-?\d+(?:\.\d+)?)/g, "$1")
          .replace(/(-?\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)/g, "$1");
}
const NOMINAL = { C: 12, H: 1, N: 14, O: 16, F: 19, Cl: 35, Br: 79, I: 127, S: 32, P: 31 };
function nominalMass(atoms) {
  let m = 0;
  for (const el in atoms) { if (!(el in NOMINAL)) return null; m += NOMINAL[el] * atoms[el]; }
  return m;
}
/* فرمولِ قطعه فقط وقتی پذیرفته می‌شود که سرتاسر فرمول باشد */
function fragmentAtoms(txt) {
  const t = norm(txt).replace(/[⁺+•·]/g, "").trim();
  if (!/^(?:[A-Z][a-z]?\d*)+$/.test(t)) return null;
  const a = parseFormula(t);
  for (const el in a) if (!(el in NOMINAL)) return null;
  return a;
}

["reference", "fieldProblems"].forEach(key => {
  (DB[key] || []).forEach(r => {
    if (!r.formula) return;
    const at = parseFormula(r.formula);
    const M = nominalMass(at);
    if (M == null) return;                       // عنصرِ بیرون از جدولِ جرم
    const who = "[" + key + "] «" + (r.en || r.name) + "» (" + r.formula + ")";
    const ms = stripJ(norm(r.ms));

    /* الف) یونِ مولکولی. خوشهٔ ایزوتوپیِ «M=186/188/190» یک ادعا است نه
       سه‌تا: سبک‌ترین عضو با جرمِ نامیِ فرمول سنجیده می‌شود. */
    const mIon = ms.match(/M\s*=\s*(\d+)/) || ms.match(/(\d+)\s*\(\s*M\s*\)/);
    if (mIon) {
      const claimed = Number(mIon[1]);
      if (claimed !== M) {
        err(who + ": متنِ MS یونِ مولکولی را " + claimed + " می‌گوید، از فرمول " + M + " درمی‌آید.");
      } else if ((claimed % 2 === 1) !== ((at.N || 0) % 2 === 1)) {
        /* ب) قاعدهٔ نیتروژن — فقط وقتی M با فرمول خوانده باشد */
        err(who + ": M=" + claimed + " " + (claimed % 2 ? "فرد" : "زوج") +
            " است ولی مولکول " + (at.N || 0) + " نیتروژن دارد — قاعدهٔ نیتروژن نقض می‌شود.");
      }
    }

    /* ج) قطعه‌های فرمول‌دار: جرمشان باید یکی از m/zهای همان ادعا باشد
       (جفتِ ایزوتوپی مجاز است) و از والد بزرگ‌تر نباشند. */
    const FRAG = /((?:\d{2,3})(?:\s*\/\s*\d{2,3})*)\s*\(\s*([A-Za-z0-9]{1,14})\s*[⁺+]?\s*\)/g;
    let f;
    while ((f = FRAG.exec(ms)) !== null) {
      const fa = fragmentAtoms(f[2]);
      if (!fa) continue;
      const fm = nominalMass(fa);
      const listed = f[1].split("/").map(x => Number(x.trim()));
      if (fm != null && listed.indexOf(fm) === -1)
        err(who + ": قطعهٔ «" + f[2] + "» در m/z " + f[1] + " آمده ولی جرمش " + fm + " است.");
      for (const el in fa) {
        if (fa[el] > (at[el] || 0)) {
          err(who + ": قطعهٔ «" + f[2] + "» " + fa[el] + " اتمِ " + el +
              " دارد ولی خودِ مولکول " + (at[el] || 0) + " تا — قطعه از والد بزرگ‌تر نمی‌شود.");
          break;
        }
      }
    }

    /* د) حسابِ خروجِ خنثی: «121 (M−CH₃COO)» */
    const LOSS = /((?:\d{2,3})(?:\s*\/\s*\d{2,3})*)\s*\(\s*M\s*-\s*([A-Za-z0-9]{1,12})/g;
    let l;
    while ((l = LOSS.exec(ms)) !== null) {
      const la = fragmentAtoms(l[2]);
      if (!la) continue;
      const lm = nominalMass(la);
      const listed = l[1].split("/").map(x => Number(x.trim()));
      if (lm != null && listed.indexOf(M - lm) === -1)
        err(who + ": M−" + l[2] + " باید " + (M - lm) + " باشد ولی متن " + l[1] + " می‌گوید.");
    }

    /* هـ) مجموعِ انتگرال‌های ¹H = تعدادِ هیدروژنِ فرمول.
       فقط وقتی سنجیده می‌شود که *همهٔ* قله‌ها انتگرال داشته باشند؛ یک
       قلهٔ بی‌انتگرال یعنی فهرست ناقص است و مجموع بی‌معنا.

       استثنای D₂O: در حلالِ دوتره پروتون‌های تبادلی (OH/NH/COOH) محو
       می‌شوند، پس مجموع *باید* کمتر از فرمول باشد. گلیسیل‌گلیسین با
       ۴H در D₂O در برابرِ ۸H فرمول درست است، نه غلط. آن‌جا فقط
       بیشتربودن ایراد است. */
    if (r.h1) {
      const h1n = norm(r.h1);
      const inD2O = /D\s*2\s*O/i.test(h1n);
      const groups = h1n.match(/\([^()]*\)/g) || [];
      let sum = 0, missing = 0;
      groups.forEach(g => {
        const hit = g.match(/(\d+)\s*H\b/);
        if (hit) sum += Number(hit[1]); else missing++;
      });
      const H = at.H || 0;
      if (groups.length && !missing && (inD2O ? sum > H : sum !== H))
        err(who + ": انتگرال‌های ¹H روی هم " + sum + "H می‌شوند ولی فرمول " + H +
            "H دارد — " + (inD2O ? "در D₂O مجموع نمی‌تواند از فرمول بیشتر باشد."
                                 : "یا قله‌ای جا افتاده یا انتگرالی غلط است."));
    }

    /* و) شمارِ محیط‌های ¹³C از تعدادِ کربن بیشتر نمی‌شود.
       پیشوندِ «۹ سیگنال ¹³C:» خودش شیفت نیست و باید حذف شود. */
    if (r.c13 && at.C) {
      let body = norm(r.c13).replace(/^[^:：]*\d+\s*(?:سیگنال|پیک)[^:：]*[:：]/, " ");
      body = body.replace(/\([^()]*\)/g, " ").replace(/—[\s\S]*$/, " ");
      body = collapseRanges(stripJ(body));
      const vals = (body.match(/-?\d+(?:\.\d+)?/g) || [])
        .map(Number).filter(v => v >= -15 && v <= 235);
      const distinct = new Set(vals.map(v => v.toFixed(1)));
      if (distinct.size > at.C)
        err(who + ": متنِ ¹³C " + distinct.size + " شیفتِ متمایز دارد ولی مولکول " +
            at.C + " کربن — بیش از تعدادِ کربن، محیط ممکن نیست.");
    }

    /* ز) عددِ بیرون از بازهٔ فیزیکی (اشتباهِ تایپی یا واحدِ جابه‌جا) */
    [["h1", -1, 14, "شیفتِ ¹H"], ["c13", -15, 235, "شیفتِ ¹³C"], ["ir", 400, 4000, "عددِ موجیِ IR"]]
      .forEach(spec => {
        const fld = spec[0], lo = spec[1], hi = spec[2], label = spec[3];
        if (!r[fld]) return;
        let body = norm(r[fld]).replace(/\([^()]*\)/g, " ");
        body = collapseRanges(stripJ(body)).replace(/\d+(?:\.\d+)?\s*nm/g, " ");
        (body.match(/-?\d+(?:\.\d+)?/g) || []).map(Number).forEach(v => {
          if (fld === "ir" && v < 100) return;            // «دو نوار» — شمارش است نه باند
          if (fld !== "ir" && Math.abs(v) > 400) return;  // m/z که در همان متن ذکر شده
          if (v < lo || v > hi)
            err(who + ": " + label + " برابرِ " + v + " بیرون از بازهٔ ممکن (" +
                lo + " تا " + hi + ") است.");
        });
      });
  });
});

/* ---------- ۸) دو رکورد که از روی دادهٔ خودشان قابلِ تفکیک نیستند ----------
   دِدآپِ نام‌محور «Butan-2-one» و «2-Butanone (MEK)» را یک ترکیب نمی‌بیند،
   ولی طیفشان یکی است؛ فرمول + الگوی ¹H کلیدِ بهتری است. این دو، و همین‌طور
   GABA که زیرِ دو نام دو بار آمده بود، با همین بررسی پیدا شدند.

   دو نکته که این بررسی را از هشدارِ الکی نجات می‌دهد:
   ۱) هر فهرست جدا سنجیده می‌شود. بودنِ یک ترکیب هم در reference و هم در
      fieldProblems عمدی است (بانکِ تمرین و بانکِ مرجع مستقل‌اند)، پس
      مقایسهٔ میانِ دو فهرست هجده هشدارِ بی‌مورد می‌داد.
   ۲) نتیجه همیشه تکراری نیست: نِرول و ژرانیول ایزومرِ E/Z واقعی‌اند، ولی
      چون ¹Hشان عیناً یکسان ثبت شده، دانشجو از روی دادهٔ داده‌شده نمی‌تواند
      تفکیکشان کند — که خودش ایرادِ سؤال است. پس متنِ هشدار هر دو حالت را
      می‌گوید. */
["reference", "fieldProblems"].forEach(key => {
  const byPattern = new Map();
  (DB[key] || []).forEach(r => {
    if (!r.h1 || !r.formula) return;
    const k = r.formula + "|" + norm(r.h1).replace(/\s+/g, "").slice(0, 40);
    if (byPattern.has(k))
      warn("[" + key + "] «" + byPattern.get(k) + "» و «" + (r.en || r.name) + "» فرمول و " +
           "الگوی ¹H یکسان دارند — یا یک ترکیب با دو نام‌اند، یا دو ایزومر که از روی " +
           "دادهٔ ثبت‌شده قابلِ تفکیک نیستند.");
    else byPattern.set(k, r.en || r.name);
  });
});

/* ---------- ۹) دو رکوردِ یک ترکیب که با هم اختلاف دارند ----------
   dedupeFieldProblems رکوردی را که متنِ کوتاه‌تری دارد دور می‌ریزد. تا وقتی
   دو رکورد یک چیز بگویند بی‌ضرر است، ولی «بوتان-۲-اون» و «2-Butanone (MEK)»
   برای ¹³C دو عدد متفاوت می‌دادند (۳۷/۸ در برابرِ ۳۶/۷.۹) و GABA هم همین‌طور.
   یعنی یکی از دو رکورد غلط بود و انتخاب بر پایهٔ *طولِ متن* انجام می‌شد، نه
   درستی. این‌جا روی تصویرِ پیش از دِدآپ سنجیده می‌شود، وگرنه اصلاً دیده
   نمی‌شود؛ آن دو مورد با همین بررسی پیدا و یکی شدند. */
{
  /* همان کلیدی که خودِ dedupe با آن گروه می‌بندد — کپی نمی‌شود تا از هم نیفتند */
  const canon = (DB.dedupeFieldProblems && DB.dedupeFieldProblems.canon) ||
                (x => String(x || "").toLowerCase().replace(/\(.*?\)/g, " ").replace(/[^a-z0-9]/g, ""));
  const groups = new Map();
  preDedupe.forEach(p => {
    if (!p.formula || !p.en) return;
    const k = p.formula + "|" + canon(p.en);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(p);
  });
  groups.forEach(list => {
    if (list.length < 2) return;
    const differ = ["ir", "ms", "c13", "h1"].filter(fld => {
      const vals = new Set(list.filter(p => p[fld]).map(p => norm(p[fld]).replace(/\s+/g, "")));
      return vals.size > 1;
    });
    if (!differ.length) return;                 // دو کپیِ یکسان — بی‌ضرر
    const names = [...new Set(list.map(p => p.en))].join("» و «");
    warn("«" + names + "» یک ترکیب‌اند و دو بار ثبت شده‌اند، ولی " + differ.join("، ") +
         "شان یکی نیست — پس یکی از دو نسخه غلط است. dedupe رکوردی را نگه می‌دارد که متنِ " +
         "بلندتری دارد، نه رکوردِ درست را؛ خودتان یکی را انتخاب و آن‌یکی را حذف کنید.");
  });
}

const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
const code = CODE_FILES.map(f => {
  try { return fs.readFileSync(path.join(ROOT, f), "utf8"); } catch (e) { return ""; }
}).join("\n");

/* ---------- مجموعهٔ تگ‌هایی که کاربر می‌تواند تولید کند ---------- */
const SIGNAL_RE = /^(ir|c|h|ms|wet|dept|uv)_/;
const producible = new Set();
// (الف) چک‌باکس‌های ثابتِ index.html
[...html.matchAll(/data-sig="([A-Za-z0-9_]+)"/g)].forEach(m => producible.add(m[1]));

/* (ب) جدول‌هایی که رابط واقعاً از آن‌ها چک‌باکس می‌سازد.
   نکتهٔ مهمی که در ممیزی پیدا شد: «یابنده»های IR/¹H/¹³C از *SmartZones
   ساخته می‌شوند، نه از DB.ir.regions یا DB.h1.regions. پیش‌تر این ابزار
   هر id/tag موجود در پایگاه را «قابلِ تولید» می‌شمرد و همین باعث می‌شد
   نوارهایی که فقط در جدولِ بی‌مصرف ثبت شده‌اند سالم به نظر برسند.
   فهرست زیر باید با render*Finder در js/app.js هم‌گام بماند. */
const UI_TABLES = [
  "irSmartZones", "h1SmartZones", "c13SmartZones",
  "lassaigne", "solubilityClasses", "functionalTests", "colorComplexTests"
];
UI_TABLES.forEach(name => {
  const t = DB[name];
  if (!Array.isArray(t)) { warn("جدولِ رابطِ «DB." + name + "» پیدا نشد — فهرست UI_TABLES با app.js هم‌گام نیست."); return; }
  t.forEach(row => {
    ["tag", "posTag"].forEach(k => {
      if (typeof row[k] === "string" && SIGNAL_RE.test(row[k])) {
        producible.add(row[k]);
        producible.add(row[k].replace(/_pos$/, "_neg"));   // چک‌باکسِ «منفی»
      }
    });
  });
});
// منویِ تستِ طبقه‌بندی‌شده، علاوه بر posTag یک تگِ اختصاصی هم می‌سازد
// (classifyTag در app.js): wet_lucas_any + "3" → wet_lucas_3
(function () {
  const walkTests = node => {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) return node.forEach(walkTests);
    if (node.posTag && node.classify) {
      const base = String(node.posTag).replace(/_(any|pos|neg|\d+[a-z]*)$/, "");
      Object.keys(node.classify).forEach(k => producible.add(base + "_" + k));
    }
    Object.values(node).forEach(walkTests);
  };
  walkTests(DB);
})();

// (ج) قطعاتِ جرمی: با تایپِ عددِ m/z در کادرِ «قطعات» به دست می‌آیند —
// پس کلیدِ عددی قابلِ تولید است و کلیدِ حرفی هرگز دیده نمی‌شود.
Object.entries(DB.ms.fragments || {}).forEach(([key, fr]) => {
  if (/^\d+$/.test(key)) producible.add(fr.id);
  if (!/^\d+$/.test(key)) {
    producible.delete(fr.id);
    err("قطعهٔ جرمیِ «" + key + "» (" + fr.id + ") کلیدِ غیرعددی دارد؛ کادرِ m/z فقط عدد می‌پذیرد، پس هرگز فعال نمی‌شود. آن را با کلیدِ عددی ثبت کنید یا به‌عنوان alts زیرِ همان جرم بگذارید.");
  }
  (fr.alts || []).forEach(a => producible.add(a.id));
});

/* ---------- استخر ترکیب‌ها ---------- */
const compounds = [];
(DB.reference || []).forEach(r => compounds.push({ rec: r, src: "reference" }));
(DB.fieldProblems || []).forEach(p => compounds.push({ rec: p, src: "fieldProblem" }));

/* ---------- ۱) تگِ ارجاع‌شده اما غیرقابلِ تولید ---------- */
const referenced = new Set();
compounds.forEach(({ rec }) => (rec.signature || []).forEach(t => referenced.add(t)));
(DB.blocks || []).forEach(b => (b.evidence || []).forEach(t => referenced.add(t)));
// لایهٔ «شواهد ضمنی» هم مصرف‌کنندهٔ واقعیِ تگ است: تگی که از بلوک/فرمول/
// همسایگی نتیجه می‌شود، در امتیازدهی نقش دارد حتی اگر در هیچ امضایی نباشد.
Object.values(DB.blockImpliedEvidence || {}).forEach(list => (list || []).forEach(t => referenced.add(t)));
Object.values(DB.formulaImpliedEvidence || {}).forEach(list => (list || []).forEach(t => referenced.add(t)));
(DB.contextualEvidenceRules || []).forEach(r => {
  (r.tags || []).concat(r.elseTags || []).forEach(t => referenced.add(t));
});
[...referenced].sort().forEach(t => {
  if (!producible.has(t)) err("تگِ «" + t + "» در امضا/شواهد آمده اما هیچ چک‌باکس یا جدولی آن را تولید نمی‌کند — امضاهای وابسته هرگز کامل نمی‌شوند.");
});

/* ---------- ۲) تگِ مرده ---------- */
// قطعاتِ جرمی و کلاس‌های حلالیت، مصرف‌کنندهٔ دیگری هم دارند: ماشین‌حسابِ
// شکافت و پنلِ حلالیت مستقیم از جدول توضیح می‌سازند، پس «بی‌اثر» نیستند.
const fragmentIds = new Set();
Object.values(DB.ms.fragments || {}).forEach(fr => {
  fragmentIds.add(fr.id);
  (fr.alts || []).forEach(a => fragmentIds.add(a.id));
});
const solubilityIds = new Set((DB.solubilityClasses || []).map(c => c.tag));
// خانوادهٔ تستِ طبقه‌بندی‌شده: اگر یک عضو به کار رفته، بقیهٔ اعضا هم گزینهٔ
// معتبرِ همان منو هستند (wet_lucas_1/2/3)، نه تگِ فراموش‌شده.
const usedFamilies = new Set([...referenced]
  .map(t => t.replace(/_(any|pos|neg|\d+[a-z]*)$/, ""))
  .filter(Boolean));

[...producible].sort().forEach(t => {
  if (referenced.has(t)) return;
  if (code.includes('"' + t + '"') || code.includes("'" + t + "'")) return;
  if (fragmentIds.has(t)) return;      // ماشین‌حسابِ m/z آن را توضیح می‌دهد
  if (solubilityIds.has(t)) return;    // پنلِ حلالیت آن را توضیح می‌دهد
  if (usedFamilies.has(t.replace(/_(any|pos|neg|\d+[a-z]*)$/, ""))) return;
  warn("تگِ «" + t + "» در رابط قابلِ ثبت است اما هیچ امضایی از آن استفاده نمی‌کند و هیچ قاعده‌ای نمی‌خواندش — تیکِ بی‌اثر.");
});

/* ---------- ۳) تناقضِ امضا با فرمول ---------- */
function parseFormula(str) {
  const atoms = {};
  const re = /([A-Z][a-z]?)(\d*)/g;
  let m;
  while ((m = re.exec(String(str))) !== null) {
    if (!m[1]) continue;
    atoms[m[1]] = (atoms[m[1]] || 0) + (m[2] ? parseInt(m[2], 10) : 1);
  }
  return atoms;
}
// هر قاعده: تگ ⇒ شرطی که فرمول باید برآورده کند
const FORMULA_RULES = [
  { tag: "ms_cl",  ok: a => a.Cl === 1, why: "الگوی ۳:۱ یعنی دقیقاً یک کلر" },
  { tag: "ms_br",  ok: a => a.Br === 1, why: "الگوی ۱:۱ یعنی دقیقاً یک برم" },
  { tag: "ms_cl2", ok: a => a.Cl >= 2,  why: "الگوی ۹:۶:۱ یعنی دو کلر" },
  { tag: "ms_br2", ok: a => a.Br >= 2,  why: "الگوی ۱:۲:۱ یعنی دو برم" },
  { tag: "ms_127", ok: a => !!a.I,      why: "پیکِ ۱۲۷ یونِ ید است" },
  { tag: "ir_nh",  ok: a => !!a.N,      why: "کششِ N–H نیتروژن می‌خواهد" },
  { tag: "ir_triple_cn", ok: a => !!a.N, why: "نیتریل نیتروژن می‌خواهد" },
  { tag: "ir_nitro",     ok: a => a.N && a.O >= 2, why: "گروهِ نیترو یک N و دو O می‌خواهد" },
  { tag: "wet_elem_n",   ok: a => !!a.N, why: "تستِ لاسِنِ نیتروژن" },
  { tag: "wet_elem_s",   ok: a => !!a.S, why: "تستِ لاسِنِ گوگرد" },
  { tag: "wet_elem_cl",  ok: a => !!a.Cl, why: "تستِ لاسِنِ کلر" },
  { tag: "wet_elem_br",  ok: a => !!a.Br, why: "تستِ لاسِنِ برم" },
  { tag: "wet_elem_i",   ok: a => !!a.I,  why: "تستِ لاسِنِ ید" },
  { tag: "ir_so2",       ok: a => a.S && a.O >= 2, why: "گروهِ سولفونیل یک S و دو O می‌خواهد" },
  { tag: "ir_sh",        ok: a => !!a.S, why: "کششِ S–H گوگرد می‌خواهد" },
  { tag: "c_cf_quartet", ok: a => !!a.F, why: "کوپلاژِ C–F فلوئور می‌خواهد" },
  { tag: "c_heavy_i",    ok: a => !!a.I, why: "اثرِ اتمِ سنگین برای ید" },
  { tag: "ir_co_ketone", ok: a => !!a.O, why: "کربونیل اکسیژن می‌خواهد" },
  { tag: "ir_co_ester",  ok: a => a.O >= 2, why: "استر دو اکسیژن می‌خواهد" },
  { tag: "ir_oh_acid",   ok: a => a.O >= 2, why: "کربوکسیلیک اسید دو اکسیژن می‌خواهد" },
  { tag: "ir_oh_alc",    ok: a => !!a.O, why: "هیدروکسیل اکسیژن می‌خواهد" },
  { tag: "ir_anhydride", ok: a => a.O >= 3, why: "انیدرید سه اکسیژن می‌خواهد" }
];
compounds.forEach(({ rec, src }) => {
  if (!rec.formula || !rec.signature) return;
  const atoms = parseFormula(rec.formula);
  FORMULA_RULES.forEach(rule => {
    if (!rec.signature.includes(rule.tag)) return;
    if (rule.ok(atoms)) return;
    err("[" + src + "] «" + (rec.en || rec.name) + "» (" + rec.formula + ") امضایش «" + rule.tag + "» دارد اما فرمولش پشتیبانی نمی‌کند — " + rule.why + ".");
  });
});

/* ---------- ۳-ب) نتیجهٔ تستِ کلاسیک در برابر نوعِ ترکیب ----------
   قواعدِ «شواهد ضمنی» از مجاورتِ بلوک‌ها در زنجیره نتیجه می‌گیرند، و زنجیره
   خطی است — یعنی نمی‌داند استخلاف روی حلقه نشسته یا روی کربنِ جانبی. دو
   خطای واقعی از همین‌جا آمد: ۱-فنیل‌اتانول (الکلِ بنزیلی) «فنول» خوانده شد
   و FeCl₃ مثبتِ نادرست گرفت، و ۲-متیل-۴-نیتروفنول برعکس «الکل» خوانده شد.
   این بررسی از نامِ ترکیب به‌عنوان حقیقتِ مستقل استفاده می‌کند. */
if (Inference && Inference.impliedEvidence) {
  const evOf = rec => {
    try {
      const imp = Inference.impliedEvidence(rec);
      return new Set([...(rec.signature || []), ...imp]);
    } catch (e) { return new Set(rec.signature || []); }
  };
  const NAME_RULES = [
    { re: /phenol|cresol|catechol|thymol|carvacrol|resorcinol|hydroquinone/i,
      // «تیوفنول» نامش phenol دارد ولی تیول است (PhSH) — تستش نیتروپروساید
      // است نه FeCl₃؛ همچنین استرها/اترهای فنولی OH آزاد ندارند.
      skip: /thio|thiol|ether|acetate|ester|anisole|ate/i,
      must: "wet_fecl3_pos", mustNot: "wet_lucas_any",
      why: "فنول است: FeCl₃ مثبت و لوکاس بی‌معنا" },
    { re: /(\w+anol|\w+ol)/i, skip: /phenol|cresol|catechol|thymol|carvacrol|enol|glycol/i,
      must: "wet_lucas_any", mustNot: "wet_fecl3_pos",
      why: "الکل است: لوکاس مثبت و FeCl₃ منفی" },
    { re: /amide|anilide|urea|acetanilide|phenacetin/i,
      mustNot: "wet_dnp_pos",
      why: "آمید/اوره است: رزونانسِ نیتروژن کربونیل را غیرفعال می‌کند، ۲،۴-DNP منفی" }
  ];
  compounds.forEach(({ rec, src }) => {
    const name = rec.en || rec.name || "";
    if (!rec.chain || !rec.chain.length) return;
    NAME_RULES.forEach(rule => {
      if (!rule.re.test(name)) return;
      if (rule.skip && rule.skip.test(name)) return;
      const ev = evOf(rec);
      if (rule.must && !ev.has(rule.must))
        warn("[" + src + "] «" + name + "» " + rule.why + "، اما «" + rule.must + "» را نتیجه نمی‌دهد — ترتیبِ بلوک‌های زنجیره را بررسی کنید.");
      if (rule.mustNot && ev.has(rule.mustNot))
        err("[" + src + "] «" + name + "» " + rule.why + "، اما «" + rule.mustNot + "» را نتیجه می‌دهد — مجاورتِ بلوک‌ها در زنجیره گمراه‌کننده است.");
    });
  });
}

/* ---------- ۳-ج) درستیِ توپولوژیِ اتصال ----------
   اندیس‌های bonds به chain اشاره می‌کنند. اگر از بازه بیرون بزنند یا گراف
   دوپاره شود، «همسایگی» بی‌صدا غلط می‌شود و قواعدِ شیمیِ تر نتیجهٔ اشتباه
   می‌دهند — همان دسته‌ای که ۱-فنیل‌اتانول و ۲-متیل-۴-نیتروفنول را خراب کرد. */
compounds.forEach(({ rec, src }) => {
  if (!Array.isArray(rec.bonds) || !rec.bonds.length) return;
  const n = (rec.chain || []).length;
  const name = rec.en || rec.name;
  let broken = false;
  rec.bonds.forEach(pair => {
    if (!Array.isArray(pair) || pair.length < 2) { broken = true; return; }
    const [a, b] = pair;
    if (!Number.isInteger(a) || !Number.isInteger(b) || a === b || a < 0 || b < 0 || a >= n || b >= n) broken = true;
  });
  if (broken) {
    err("[" + src + "] «" + name + "» اتصالی دارد که به بلوکِ موجود اشاره نمی‌کند (طولِ زنجیره " + n + ").");
    return;
  }
  // گراف باید یک‌پارچه باشد؛ بلوکِ جدامانده یعنی مولکولِ دوتکه
  const adj = Array.from({ length: n }, () => []);
  rec.bonds.forEach(([a, b]) => { adj[a].push(b); adj[b].push(a); });
  const seenN = new Set([0]);
  const stack = [0];
  while (stack.length) {
    const cur = stack.pop();
    adj[cur].forEach(x => { if (!seenN.has(x)) { seenN.add(x); stack.push(x); } });
  }
  if (seenN.size !== n)
    err("[" + src + "] «" + name + "» گرافِ اتصالش یک‌پارچه نیست: " + (n - seenN.size) + " بلوک جدا مانده.");
});

/* توازنِ اتمیِ ترکیب‌هایی که توپولوژی را دستی اعلام کرده‌اند.
   برای زنجیرهٔ استنتاجی، کم‌بودنِ اتم طبیعی است (حلقه را نمی‌شود بیان کرد)،
   ولی وقتی کسی bonds را دست نوشته یعنی ساختار را کامل مدل کرده، پس هر
   اختلافی خطای داده است. همین بررسی، اکسیژنِ اتریِ جاافتادهٔ
   «(پارا-کرزیل)متیل فنیل کتون» را پیدا کرد. */
const blocksByIdEarly = new Map((DB.blocks || []).map(b => [b.id, b]));
compounds.forEach(({ rec, src }) => {
  if (!Array.isArray(rec.bonds) || !rec.bonds.length) return;
  if (!rec.formula || !rec.chain || !rec.chain.length) return;
  if (rec.chain.some(id => !blocksByIdEarly.has(id))) return;
  const sum = {};
  rec.chain.forEach(id => {
    const at = blocksByIdEarly.get(id).atoms || {};
    for (const [e, v] of Object.entries(at)) sum[e] = (sum[e] || 0) + v;
  });
  const want = parseFormula(rec.formula);
  const off = ["C", "H", "N", "O", "S", "Cl", "Br", "I", "F"]
    .filter(e => (sum[e] || 0) !== (want[e] || 0))
    .map(e => e + ": زنجیره " + (sum[e] || 0) + " ≠ فرمول " + (want[e] || 0));
  if (off.length)
    err("[" + src + "] «" + (rec.en || rec.name) + "» توپولوژی را دستی اعلام کرده اما اتم‌ها نمی‌خوانند — " + off.join(" · "));
});

/* توپولوژیِ حل‌نشده: ترکیبی که نه اتصالِ صریح دارد و نه موتور می‌تواند
   استنتاجش کند (چندحلقه‌ای، یا بلوکی که ظرفیتِ آزاد پیدا نمی‌کند). برای
   این‌ها خواندنِ خطی جای می‌گیرد و ممکن است استخلاف را به استخلاف بچسباند.
   از خودِ inferTopology موتور پرسیده می‌شود، نه از کپیِ منطق. */
if (Inference && Inference.inferTopology) {
  const RINGS = ["phenyl", "phenylene_p", "phenylene_o", "phenylene_m", "tolyl_p",
                 "naphthyl", "quinolinyl", "pyridin_3yl", "furan_2yl", "benzyl"];
  const unresolved = [];
  const seenName = new Set();
  compounds.forEach(({ rec }) => {
    const name = rec.en || rec.name;
    if (!name || seenName.has(name)) return;
    seenName.add(name);
    if (Array.isArray(rec.bonds) && rec.bonds.length) return;   // اعلانِ صریح
    if (rec.ring) return;
    const chain = rec.chain || [];
    if (chain.length < 4) return;
    if (!chain.some(id => RINGS.includes(id))) return;
    const subs = chain.filter(id => !RINGS.includes(id)).length;
    if (subs < 3) return;
    if (Inference.inferTopology(chain, false)) return;          // موتور حلش می‌کند
    unresolved.push(name);
  });
  if (unresolved.length) {
    warn(unresolved.length + " ترکیب حلقهٔ چنداستخلافی دارند که توپولوژی‌اش نه اعلام شده و نه " +
         "قابلِ استنتاج است (چندحلقه‌ای یا زنجیرهٔ تقریبی)؛ خواندنِ خطی جای می‌گیرد: " +
         unresolved.join("، ") + "  (رفع: bonds:[[0,i],…])");
  }
}

/* ---------- ۴) تکراری‌ها ---------- */
["reference", "fieldProblems"].forEach(key => {
  const seen = new Map();
  (DB[key] || []).forEach((r, i) => {
    const k = (r.en || r.name || "").trim().toLowerCase();
    if (!k) return;
    if (seen.has(k)) err("ترکیبِ تکراری در DB." + key + ": «" + (r.en || r.name) + "» (اندیس " + seen.get(k) + " و " + i + ").");
    else seen.set(k, i);
  });
});
/* تکراریِ هم‌نام‌نشده: دِدآپِ موجود بر پایهٔ نام انگلیسی است، پس یک ترکیب
   که با دو نامِ مترادف ثبت شده باشد (Butyl ethyl ether / Ethyl butyl ether)
   از فیلتر رد می‌شود و در رتبه‌بندی با خودش رقابت می‌کند. اثرِ انگشتِ
   «فرمول + امضا + زنجیره» این حالت را می‌گیرد. */
{
  const fp = new Map();
  compounds.forEach(({ rec }) => {
    if (!rec.formula || !rec.signature || !rec.signature.length) return;
    const key = rec.formula + "|" + [...rec.signature].sort().join(",") + "|" + (rec.chain || []).join(",");
    const name = rec.en || rec.name;
    const prev = fp.get(key);
    if (prev && prev !== name) {
      warn("«" + prev + "» و «" + name + "» فرمول، امضا و زنجیرهٔ یکسان دارند — احتمالاً یک ترکیب با دو نامِ مترادف است؛ دِدآپِ نام‌محور آن را نمی‌گیرد.");
    } else if (!prev) fp.set(key, name);
  });
}

{
  const ids = new Map();
  (DB.blocks || []).forEach(b => {
    if (ids.has(b.id)) err("بلوکِ تکراری: «" + b.id + "».");
    else ids.set(b.id, true);
  });
}

/* ---------- ۵) زنجیره در برابر بلوک‌ها و فرمول ---------- */
const blockById = new Map((DB.blocks || []).map(b => [b.id, b]));
const partialChains = [];
compounds.forEach(({ rec, src }) => {
  (rec.chain || []).forEach(id => {
    if (!blockById.has(id)) err("[" + src + "] «" + (rec.en || rec.name) + "» زنجیره‌اش به بلوکِ ناموجودِ «" + id + "» اشاره می‌کند.");
  });
  // شمارشِ اتم‌ها فقط برای ساختارهای خطی معنا دارد؛ حلقوی‌ها هیدروژنِ کمتری
  // دارند، پس اختلاف را هشدار (نه خطا) می‌گیریم و فقط وقتی کربن نمی‌خواند.
  if (!rec.formula || !rec.chain || !rec.chain.length) return;
  if (rec.chain.some(id => !blockById.has(id))) return;
  const sum = {};
  rec.chain.forEach(id => {
    const at = blockById.get(id).atoms || {};
    Object.entries(at).forEach(([e, n]) => { sum[e] = (sum[e] || 0) + n; });
  });
  const want = parseFormula(rec.formula);
  const cc = sum.C || 0, cf = want.C || 0;
  if (cc > cf) {
    // بیشتربودن از فرمول ناممکن است: یعنی یک اتم دو بار شمرده شده.
    // نمونهٔ واقعی: اتیل‌فرمات با زنجیرهٔ ["aldehyde","ester_co","ethyl"] که
    // کربنِ کربونیل را دو بار می‌شمرد.
    err("[" + src + "] «" + (rec.en || rec.name) + "»: زنجیره " + cc + " کربن دارد اما فرمول " +
        cf + " — یک بلوک اتمِ تکراری می‌شمارد.");
  } else if (cc < cf) {
    // کمتربودن برای ساختارِ حلقوی یا انشعابی طبیعی است (مونتاژ خطی است)؛
    // فقط شمارش می‌شود تا گزارش پر از هشدارِ بی‌اثر نشود.
    partialChains.push((rec.en || rec.name) + " (" + cc + "/" + cf + ")");
  }
});

/* ---------- ۶) جدولِ بی‌مصرف ---------- */
Object.keys(DB).forEach(k => {
  if (typeof DB[k] === "function") return;
  const re = new RegExp("\\bDB\\." + k + "\\b");
  if (!re.test(code)) warn("جدولِ «DB." + k + "» هیچ مصرف‌کننده‌ای در js/ یا index.html ندارد — دادهٔ واردشده به کاربر نمایش داده نمی‌شود.");
});

/* ---------- گزارش ---------- */
const matchable = compounds.filter(c => c.rec.signature && c.rec.signature.length).length;
console.log("=== ممیزیِ پایگاه دانش ===");
console.log("جدول‌ها: " + Object.keys(DB).length +
            " | بلوک‌ها: " + (DB.blocks || []).length +
            " | مراجع: " + (DB.reference || []).length +
            " | بانکِ سوال: " + (DB.fieldProblems || []).length);
console.log("ترکیب‌های قابلِ تطبیق برای موتور: " + matchable + " از " + compounds.length);
console.log("تگ‌های قابلِ تولید: " + producible.size + " | تگ‌های به‌کاررفته در امضاها: " + referenced.size);
console.log("");
if (errors.length) {
  console.log("خطا (" + errors.length + "):");
  errors.forEach(e => console.log("  ✗ " + e));
} else {
  console.log("خطا: ندارد ✓");
}
if (partialChains.length) {
  console.log("\nزنجیرهٔ ناقص (طبیعی برای ساختارِ حلقوی/انشعابی — مونتاژ خطی است): " +
              partialChains.length + " ترکیب");
  if (process.argv.includes("--verbose")) partialChains.forEach(c => console.log("    · " + c));
  else console.log("    (برای فهرست: --verbose)");
}
if (warnings.length) {
  console.log("\nهشدار (" + warnings.length + "):");
  warnings.forEach(w => console.log("  ! " + w));
}
process.exit(errors.length ? 1 : 0);
