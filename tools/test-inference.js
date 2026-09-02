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
  top1: 0.94,          // امروز ۰.۹۶۵
  top3: 0.99,          // امروز ۱.۰۰
  scenarios: 1.0,      // همهٔ سناریوهای دستی باید رتبهٔ ۱ بدهند
  /* تقارن: امروز ۸۴٪ دقیق و صفر موردِ «کم‌تر از واقعیت».
     پیش از بازنویسیِ گرافیِ predictSymmetry این دو عدد ۳۶٪ و ۶۳ بود. */
  symmetryExact: 0.78,
  symmetryUnder: 0.03  // عملاً یعنی «تقریباً هرگز» — جهتِ خطرناکِ خطا
};

/* ---------- بارگذاری ---------- */
function load() {
  const sandbox = { console: { info() {}, warn() {}, log() {}, error() {} } };
  sandbox.window = sandbox; sandbox.self = sandbox;
  const ctx = vm.createContext(sandbox);
  for (const f of ["data/database.js", "data/field-data.js", "data/field-osfs-table.js",
                   "data/database-expansion.js", "data/database-signatures.js",
                   "data/bond-graphs.js",
                   "js/structure.js",          // ماژولِ تقارن موتور از این می‌خواند
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
     predictSymmetry حالا مولکول را از گرافِ اتمی می‌سازد و هرجا نتواند
     (بلوکِ بی‌قالب، ظرفیتِ پُر، یا فرمولی که با ترکیب نمی‌خواند) عمداً
     سکوت می‌کند. پس دو عدد مهم است: چند ترکیب را پاسخ داد، و از آن‌ها
     چند درصد درست بود. عددِ دومی است که در امتیازدهی به کار می‌رود. */
  const FA = "۰۱۲۳۴۵۶۷۸۹";
  const lat = t => String(t).replace(/[۰-۹]/g, d => FA.indexOf(d));
  /* شمردنِ شیفت‌های واقعی از متنِ فارسیِ ¹³C. سه چیز باید بیرون بریزد،
     وگرنه عددِ مرجع خودش غلط می‌شود — و می‌شد: پیش از این ۲-پروپانول
     «۳ محیط» و اتان‌تیول «۴ محیط» شمرده می‌شدند، که از تعدادِ کربنشان
     هم بیش‌تر است.
       • داخلِ پرانتز: برچسبِ کربن‌هاست نه شیفت — «(CH₃ ×۲)» رقم‌های
         ۳ و ۲ را وارد می‌کرد.
       • «۶ پیک» / «۹ سیگنال»: خودِ شمارش است، نه یک شیفت.
       • ثابتِ کوپلاژ بر حسبِ Hz. */
  /* پرانتزها تودرتو می‌شوند — «(N(CH۳)۲)» با یک regexِ ساده فقط تا
     نخستین «)» پاک می‌شد و رقمِ ۲ بیرون می‌ماند و یک شیفتِ جعلی
     می‌ساخت. پس با شمارشِ عمق پاک می‌شوند. */
  function stripParens(t) {
    let out = "", depth = 0;
    for (const ch of t) {
      if (ch === "(") depth++;
      else if (ch === ")") { if (depth) depth--; else out += " "; }
      else if (!depth) out += ch;
    }
    return out;
  }
  function shiftCount(txt) {
    const cleaned = stripParens(lat(txt))
      .replace(/\d+(?:\.\d+)?\s*(?:پیک|سیگنال|محیط)/g, " ")
      .replace(/\d+(?:\.\d+)?\s*Hz/gi, " ");
    const nums = (cleaned.match(/\d+(?:\.\d+)?/g) || []).map(Number).filter(v => v >= 0 && v <= 230);
    /* بدونِ گِردکردن: «۱۲۷.۵» و «۱۲۸» دو کربنِ متفاوت‌اند و گِردکردن
       یکی‌شان می‌کرد — همین باعث می‌شد بنزیل سیانید و بنزیلیک اسید و
       ۱،۲،۳،۴-تترامتیل‌بنزن الکی «بیش‌ازواقعیت» شمرده شوند. */
    return new Set(nums).size;
  }
  let n = 0, exact = 0, near = 0, under = 0, over = 0, declined = 0, unusable = 0;
  pool.forEach(r => {
    if (!r.c13 || !r.chain || !r.chain.length) return;
    if (r.chain.some(id => !byId.has(id))) return;
    const T = shiftCount(r.c13);
    if (T < 2) return;
    /* گاردِ نهایی: یک ترکیب نمی‌تواند بیش از تعدادِ کربنش محیط داشته
       باشد. هر رکوردی که این را نقض کند متنِ ¹³C‌اش قابلِ اتکا نیست
       (یا خودش غلط است، مثل «۲۰۰، ۱۹۸، ۳۱، ۲۳، ۷» برای دی‌استیل که
       فقط چهار کربن دارد) — پس مرجعِ سنجش نمی‌شود. */
    const nC = (r.formula.match(/^C(\d*)/) || [])[1];
    const carbons = nC === undefined ? 0 : (nC === "" ? 1 : parseInt(nC, 10));
    if (carbons && T > carbons) { unusable++; return; }
    const P = Inf.predictSymmetry(r.chain.map(id => ({ id })), r).predictedC13;
    if (P == null) { declined++; return; }
    n++;
    if (P === T) exact++;
    if (Math.abs(P - T) <= 1) near++;
    if (P < T) under++;
    if (P > T) over++;
  });
  if (n) {
    const pctExact = 100 * exact / n;
    console.log("  predictSymmetry: روی " + n + " ترکیب پاسخ داد (" + declined +
                " مورد سکوت کرد، " + unusable + " مورد متنِ ¹³C ناسازگار داشت)");
    console.log("    " + pctExact.toFixed(0) + "% دقیق، " + (100 * near / n).toFixed(0) +
                "% با خطای ±۱ — " + under + " کم‌تر از واقعیت، " + over + " بیش‌تر");
    const exactOK = pctExact / 100 >= THRESHOLDS.symmetryExact;
    /* «کم‌تر از واقعیت» بدترین جهتِ خطاست: شاخهٔ «غیرممکن» در امتیازدهی
       دقیقاً همان‌جا جریمهٔ ۱۰- می‌زند، یعنی روی پاسخِ درست. سقفِ جدا دارد. */
    const underOK = under / n <= THRESHOLDS.symmetryUnder;
    ok("دقتِ تقارن: " + pctExact.toFixed(0) + "%", exactOK,
       "(آستانه " + (100 * THRESHOLDS.symmetryExact).toFixed(0) + "%)");
    ok("کم‌تر از واقعیت: " + under + " از " + n, underOK,
       "(آستانه " + (100 * THRESHOLDS.symmetryUnder).toFixed(0) + "%)");
    if (!exactOK || !underOK) failed++;
  }
}

/* =====================================================================
   ۵) تقارن در برابر RDKit — مرجعِ بیرونی، نه متنِ خودِ پایگاه
   ---------------------------------------------------------------------
   بخشِ ۴ با شمردنِ شیفت‌های متنِ فارسی می‌سنجد، و آن متن گاهی ناحیهٔ
   آروماتیک را خلاصه می‌کند («آروماتیک» به‌جای فهرستِ پیک‌ها). پس برای
   قضاوتِ درستیِ موتور کافی نیست.

   این جدول ساختارِ واقعیِ ترکیب را به SMILES دارد و عددِ مرجعش با
   RDKit 2026.03.5 گرفته شده — شمارِ کلاس‌های هم‌ارزیِ توپولوژیک از
   Chem.CanonicalRankAtoms(breakTies=False, includeChirality=False).
   SMILES هرکدام با مقایسهٔ فرمولِ RDKit با فرمولِ خودِ رکورد بررسی شده،
   پس غلطِ تایپی در SMILES بی‌صدا رد نمی‌شود.

   دو چیز سنجیده می‌شود:
     • هر جا موتور عددِ قطعی می‌دهد، باید دقیقاً همان عددِ RDKit باشد.
     • maxC13 هرگز نباید کمتر از عددِ واقعی باشد — این مهم‌ترین ضمانت
       است، چون امتیازدهی با maxC13 شاخهٔ «غیرممکن» (۱۰-) را می‌زند و
       اگر maxC13 کم بیفتد، جریمه دقیقاً روی پاسخِ درست می‌نشیند.
   ===================================================================== */
{
  console.log("\n۵) تقارن در برابر RDKit");
  console.log("─".repeat(20));
  /* [نامِ انگلیسیِ رکورد, SMILES ساختارِ واقعی, محیط‌های ¹³C طبقِ RDKit] */
  const RDKIT = [
  ["(Trifluoromethyl)benzene", "FC(F)(F)c1ccccc1", 5],
  ["1,2,3,4-Tetramethylbenzene", "Cc1ccc(C)c(C)c1C", 5],
  ["1,2,3,5-Tetramethylbenzene", "Cc1cc(C)c(C)c(C)c1", 7],
  ["1,2,3-Trimethoxybenzene", "COc1cccc(OC)c1OC", 6],
  ["1,2,3-Trimethylbenzene", "Cc1cccc(C)c1C", 6],
  ["1,2,4-Trimethylbenzene", "Cc1ccc(C)c(C)c1", 9],
  ["1,2-Dibromoethane", "BrCCBr", 1],
  ["1,3,5-Triethynylbenzene", "C#Cc1cc(C#C)cc(C#C)c1", 4],
  ["1,4-Dibromobenzene", "Brc1ccc(Br)cc1", 2],
  ["1-Nitronaphthalene", "[O-][N+](=O)c1cccc2ccccc12", 10],
  ["1-Phenylethanol", "CC(O)c1ccccc1", 6],
  ["2,2,3,3-Tetramethylbutane", "CC(C)(C)C(C)(C)C", 2],
  ["2,4,5-Trichloroaniline", "Nc1cc(Cl)c(Cl)cc1Cl", 6],
  ["2,4,5-Trichlorotoluene", "Cc1cc(Cl)c(Cl)cc1Cl", 7],
  ["2,5-Hexanedione", "CC(=O)CCC(C)=O", 3],
  ["2,6-Dibromoaniline", "Nc1c(Br)cccc1Br", 4],
  ["2-Bromopropane", "CC(C)Br", 2],
  ["3,3-Dimethylbutyric acid", "CC(C)(C)CC(O)=O", 4],
  ["3-Nitro-o-xylene", "Cc1cccc([N+](=O)[O-])c1C", 8],
  ["3-Pentanone", "CCC(=O)CC", 3],
  ["4,4'-Dibromobiphenyl", "Brc1ccc(-c2ccc(Br)cc2)cc1", 4],
  ["4,6-Diiodo-1,3-dimethoxybenzene", "COc1cc(OC)c(I)cc1I", 5],
  ["4-Ethylbenzaldehyde", "CCc1ccc(C=O)cc1", 7],
  ["4-Methoxybenzaldehyde (p-anisaldehyde)", "COc1ccc(C=O)cc1", 6],
  ["4-Nitroanisole", "COc1ccc([N+](=O)[O-])cc1", 5],
  ["Acetaldehyde", "CC=O", 2],
  ["Acetamide", "CC(N)=O", 2],
  ["Acetone", "CC(C)=O", 2],
  ["Acetophenone", "CC(=O)c1ccccc1", 6],
  ["Aniline", "Nc1ccccc1", 4],
  ["Anisole", "COc1ccccc1", 5],
  ["Aspirin", "CC(=O)Oc1ccccc1C(O)=O", 9],
  ["Benzaldehyde", "O=Cc1ccccc1", 5],
  ["Benzaldehyde dimethyl acetal", "COC(OC)c1ccccc1", 6],
  ["Benzil", "O=C(C(=O)c1ccccc1)c1ccccc1", 5],
  ["Benzilic acid", "OC(C(O)=O)(c1ccccc1)c1ccccc1", 6],
  ["Benzoic acid", "OC(=O)c1ccccc1", 5],
  ["Benzonitrile", "N#Cc1ccccc1", 5],
  ["Benzyl alcohol", "OCc1ccccc1", 5],
  ["Benzyl bromide", "BrCc1ccccc1", 5],
  ["Benzyl chloride", "ClCc1ccccc1", 5],
  ["Benzyl phenylacetate", "O=C(Cc1ccccc1)OCc1ccccc1", 11],
  ["Benzylamine", "NCc1ccccc1", 5],
  ["Biacetyl", "CC(=O)C(C)=O", 2],
  ["Bibenzyl", "C(Cc1ccccc1)c1ccccc1", 5],
  ["Butan-2-one (MEK)", "CCC(C)=O", 4],
  ["Butyric anhydride", "CCCC(=O)OC(=O)CCC", 4],
  ["Butyrophenone", "CCCC(=O)c1ccccc1", 8],
  ["Diethyl carbonate", "CCOC(=O)OCC", 3],
  ["Diethyl malonate", "CCOC(=O)CC(=O)OCC", 4],
  ["Durene", "Cc1cc(C)c(C)cc1C", 3],
  ["Ethanol", "CCO", 2],
  ["Ethyl acetate", "CCOC(C)=O", 4],
  ["Ethyl butyl ether", "CCOCCCC", 6],
  ["Ethyl formate", "CCOC=O", 3],
  ["Ethyl nicotinate", "CCOC(=O)c1cccnc1", 8],
  ["Ethylbenzene", "CCc1ccccc1", 6],
  ["Ethylene glycol diacetate", "CC(=O)OCCOC(C)=O", 3],
  ["Hexamethylbenzene", "Cc1c(C)c(C)c(C)c(C)c1C", 2],
  ["Isobutyl acetate", "CC(=O)OCC(C)C", 5],
  ["Mesitylene", "Cc1cc(C)cc(C)c1", 3],
  ["Methyl benzoate", "COC(=O)c1ccccc1", 6],
  ["Methyl propanoate", "CCC(=O)OC", 4],
  ["Methyl vinyl ketone (but-3-en-2-one)", "C=CC(C)=O", 4],
  ["Pentan-2-one", "CCCC(C)=O", 5],
  ["Phenol", "Oc1ccccc1", 4],
  ["Phenylacetone", "CC(=O)Cc1ccccc1", 7],
  ["Phenylacetonitrile", "N#CCc1ccccc1", 6],
  ["Propan-2-ol", "CC(C)O", 2],
  ["Propanoic acid", "CCC(O)=O", 3],
  ["Propionic anhydride", "CCC(=O)OC(=O)CC", 3],
  ["Propiophenone", "CCC(=O)c1ccccc1", 7],
  ["Succinonitrile", "N#CCCC#N", 2],
  ["Tetraethylene glycol ditosylate", "Cc1ccc(cc1)S(=O)(=O)OCCOCCOCCOCCOS(=O)(=O)c1ccc(C)cc1", 9],
  ["Toluene", "Cc1ccccc1", 5],
  ["alpha,alpha-Dichlorotoluene (Benzal chloride)", "ClC(Cl)c1ccccc1", 5],
  ["o-Anisic acid", "COc1ccccc1C(O)=O", 8],
  ["p-Cresol", "Cc1ccc(O)cc1", 5],
  ["p-Nitrotoluene", "Cc1ccc([N+](=O)[O-])cc1", 5],
  ["t-Butyl acetoacetate", "CC(=O)CC(=O)OC(C)(C)C", 6],
  ["tert-Butylbenzene", "CC(C)(C)c1ccccc1", 6],
  ];
  const byEn = new Map();
  pool.forEach(r => { if (r.en) byEn.set(r.en, r); });

  let agree = 0, wrong = [], unbounded = [], absent = [], quiet = [];
  RDKIT.forEach(([en, smi, trueC]) => {
    const r = byEn.get(en);
    if (!r) { absent.push(en); return; }
    const sym = Inf.predictSymmetry(r.chain.map(id => ({ id })), r);
    if (sym.maxC13 != null && sym.maxC13 < trueC) unbounded.push(`${en}: maxC13=${sym.maxC13} < ${trueC}`);
    if (sym.predictedC13 == null) { quiet.push(en); return; }
    if (sym.predictedC13 === trueC) agree++;
    else wrong.push(`${en}: موتور ${sym.predictedC13}، RDKit ${trueC}  [${r.chain.join(",")}]`);
  });

  ok("مطابق RDKit: " + agree + " از " + (agree + wrong.length), !wrong.length,
     quiet.length ? "(" + quiet.length + " مورد سکوت کرد)" : "");
  wrong.forEach(w => console.log("     ✗ " + w));
  ok("کرانِ maxC13 معتبر", !unbounded.length,
     unbounded.length ? "" : "(هیچ ترکیبی محیطِ واقعی‌اش از سقف بیش‌تر نیست)");
  unbounded.forEach(u => console.log("     ✗ " + u));
  if (absent.length) console.log("     (در پایگاه پیدا نشد: " + absent.join("، ") + ")");
  if (wrong.length || unbounded.length || absent.length) failed++;
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
