/* =====================================================================
   tools/derive-bonds.js — بازیابیِ گرافِ اتصالِ بلوک‌ها از روی ظرفیت‌ها
   ---------------------------------------------------------------------
   مسئله‌ای که این ابزار حل می‌کند:
     آرایهٔ chain فقط می‌گوید مولکول از چه بلوک‌هایی ساخته شده، نه این‌که
     کدام بلوک به کدام چسبیده. تا امروز inference.topology() ناچار بود
     اتصال را «حدس» بزند: خطی، یا حلقوی اگر ref.ring روشن بود. مولکولِ
     واقعی تقریباً هیچ‌وقت خطی نیست، و نتیجه‌اش این بود که ماژولِ تقارن
     روی ۱۵۲ ترکیب از ۳۳۹ سکوت می‌کرد — یعنی برندهٔ اصلیِ تفکیکِ ایزومرها
     روی نزدیک به نیمی از بانک خاموش بود:

        ۱۰۳  ظرفیتِ اعلام‌شدهٔ بلوک با تعدادِ همسایه در توپولوژیِ حدسی نمی‌خواند
         ۲۸  زنجیره کلِ مولکول را توصیف نمی‌کند
         ۱۴  چیدمانِ استخلاف‌ها یکتا نیست
          ۷  بلوک قالبِ اتمی ندارد

   ایدهٔ اصلی: حدس لازم نیست. blockStructures[id].attach از قبل می‌گوید هر
   بلوک چند نقطهٔ اتصال دارد، یعنی *دنبالهٔ درجهٔ* گراف از پیش معلوم است.
   پس همهٔ گراف‌های سادهٔ همبند با آن دنبالهٔ درجه شمرده می‌شوند. برای
   بیشترِ ترکیب‌ها فقط یک مولکول از این شمارش بیرون می‌آید و اتصال بدونِ
   هیچ دخالتِ انسانی قطعی است.

   قاعدهٔ صحت — همان قاعدهٔ inference.js: «نگفتن» از «غلط گفتن» بهتر است.
     • «یکتا» یعنی همهٔ سیم‌کشی‌های ممکن، پس از سرِهم‌شدن، به *یک مولکول
       تا حدِ ایزومورفیسم* می‌رسند. معیار، آزمونِ ایزومورفیسمِ دقیق است نه
       اثرانگشتِ تقریبی: دو سیم‌کشی می‌توانند اثرانگشتِ یکسان و مولکولِ
       متفاوت بدهند (همان تلهٔ ۱-WL که روی بنزنِ متا/پارا شناخته شده است).
     • اگر بیش از یک مولکول ممکن باشد، ابزار انتخاب نمی‌کند. نمونهٔ گویا:
       [methyl, ketone, ether_o, ethyl] هم اتیل استات است هم متیل
       پروپانوات — هر دو C4H8O2. تفاوتشان شیمی است نه شمارش، پس فقط
       دستِ آدم از جدولِ OVERRIDES پایین حل‌شان می‌کند.
     • اگر فرمولِ مولکولِ سرِهم‌شده با فرمولِ خودِ رکورد نخواند، سیم‌کشی
       دور انداخته می‌شود؛ زنجیره ناقص است و باید دستی تصحیح شود.

   اجرا:
     node tools/derive-bonds.js                 ساخت data/bond-graphs.js
     node tools/derive-bonds.js --report-only   فقط گزارش، بدون نوشتن
     node tools/derive-bonds.js --todo          فهرستِ کارِ باقی‌مانده برای آدم
   ===================================================================== */
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.join(__dirname, "..");

/* بالاتر از این تعداد سیم‌کشیِ خام، ابهام آن‌قدر زیاد است که شمارش
   ارزشی ندارد؛ رکورد به گزارشِ دستی می‌رود. */
const MAX_WIRINGS = 20000;
/* زنجیرهٔ بلندتر از این، فضای گراف را منفجر می‌کند. */
const MAX_CHAIN = 12;

/* ---------- ۱) بارگذاری، دقیقاً به ترتیبِ index.html ---------- */
function loadDB() {
  const sandbox = { console: { info() {}, warn() {}, log() {}, error() {} } };
  sandbox.window = sandbox; sandbox.self = sandbox;
  const ctx = vm.createContext(sandbox);
  const files = [
    "data/database.js", "data/field-data.js", "data/field-osfs-table.js",
    "data/database-expansion.js", "data/database-signatures.js",
    // عمداً bond-graphs.js بارگذاری نمی‌شود: خروجیِ خودِ این ابزار است
    // و اگر بار شود، اجرای دوم اتصالِ اجرای اول را «دست‌نویس» می‌بیند.
    "js/structure.js", "js/inference.js"
  ];
  for (const f of files) {
    vm.runInContext(fs.readFileSync(path.join(ROOT, f), "utf8"), ctx, { filename: f });
  }
  if (sandbox.DB && sandbox.DB.dedupeFieldProblems) sandbox.DB.dedupeFieldProblems();
  return sandbox;
}

/* ---------- ۲) شمارشِ گراف‌های سادهٔ همبند با دنبالهٔ درجهٔ داده‌شده ----------
   حلقهٔ ساده روی همهٔ زوج‌های (i<j): یا یال هست یا نیست. هرس‌ها لازم‌اند،
   وگرنه برای زنجیرهٔ ۱۰ بلوکی ۲^۴۵ حالت بررسی می‌شود. */
function enumerateWirings(deg, cap) {
  const n = deg.length;
  const pairs = [];
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) pairs.push([i, j]);
  /* ظرفیتِ باقی‌مانده از هر نقطه به بعد: اگر درجهٔ مانده از حداکثر یالِ
     ممکنِ باقی‌مانده بیشتر شود، شاخه مرده است. */
  const capLeft = new Array(pairs.length + 1).fill(0).map(() => new Int32Array(n));
  for (let p = pairs.length - 1; p >= 0; p--) {
    capLeft[p].set(capLeft[p + 1]);
    capLeft[p][pairs[p][0]]++;
    capLeft[p][pairs[p][1]]++;
  }
  const rem = Int32Array.from(deg);
  const edges = [], out = [];
  let overflow = false;

  (function go(p) {
    if (overflow) return;
    if (out.length >= cap) { overflow = true; return; }
    let done = true;
    for (let i = 0; i < n; i++) {
      if (rem[i] < 0) return;
      if (rem[i] > capLeft[p][i]) return;      // دیگر جای کافی نمانده
      if (rem[i] !== 0) done = false;
    }
    if (done) {
      const adj = Array.from({ length: n }, () => []);
      edges.forEach(e => { adj[e[0]].push(e[1]); adj[e[1]].push(e[0]); });
      const seen = new Set([0]), stack = [0];
      while (stack.length) {
        const k = stack.pop();
        for (const j of adj[k]) if (!seen.has(j)) { seen.add(j); stack.push(j); }
      }
      if (seen.size === n) out.push(edges.map(e => [e[0], e[1]]));
      return;
    }
    if (p >= pairs.length) return;
    const a = pairs[p][0], b = pairs[p][1];
    if (rem[a] > 0 && rem[b] > 0) {
      rem[a]--; rem[b]--; edges.push([a, b]);
      go(p + 1);
      edges.pop(); rem[a]++; rem[b]++;
    }
    go(p + 1);
  })(0);

  return overflow ? null : out;
}

/* ---------- ۳) ایزومورفیسمِ دقیقِ دو مولکول ----------
   اثرانگشتِ ۱-WL برای *گروه‌بندی* به کار می‌رود (سریع و بی‌خطا در ردکردن)،
   ولی تصمیمِ نهایی با نگاشتِ واقعی گرفته می‌شود، چون ۱-WL روی همین
   خانوادهٔ ترکیب‌ها (بنزنِ دواستخلافیِ متا در برابر پارا) شناخته‌شده
   برخورد می‌کند و اگر ملاکِ یکتایی می‌شد، ابزار دو مولکولِ متفاوت را یکی
   می‌دید و اتصالِ غلط را «قطعی» اعلام می‌کرد. */
function atomLabel(a) {
  return a.el + "|" + (a.arom ? "1" : "0") + "|" + (a.H || 0) + "|" + (a.charge || 0);
}
function adjacencyOf(mol) {
  const n = mol.atoms.length;
  const adj = Array.from({ length: n }, () => []);
  mol.bonds.forEach(b => {
    adj[b.a].push({ to: b.b, order: b.order });
    adj[b.b].push({ to: b.a, order: b.order });
  });
  return adj;
}
/* رنگ‌آمیزیِ WL.
   نکتهٔ حیاتی: نامِ رنگ‌ها باید *کانونی* باشد، یعنی فقط به گراف بستگی
   داشته باشد نه به ترتیبِ اتم‌ها. اگر شناسه‌ها به ترتیبِ اولین برخورد
   داده شوند، دو مولکولِ کاملاً یکسان که اتم‌هایشان جور دیگری شماره خورده
   باشند دو اثرانگشتِ متفاوت می‌گیرند — و آن‌وقت ابزار یک مولکول را دو
   مولکولِ رقیب می‌بیند و بی‌جهت «مبهم» اعلام می‌کند (ایندان دقیقاً همین
   شد: دو سیم‌کشیِ یک حلقهٔ چهارضلعی، هر دو ایندان، ولی دو اثرانگشت).
   پس رشته‌های متمایزِ هر دور مرتب می‌شوند و شناسه از روی همان ترتیب
   داده می‌شود. */
function wlColours(mol, adj, rounds) {
  let col = mol.atoms.map(atomLabel);
  for (let r = 0; r < (rounds || 3); r++) {
    const next = col.map((c, i) =>
      c + "(" + adj[i].map(e => e.order + ":" + col[e.to]).sort().join(",") + ")");
    const map = new Map();
    [...new Set(next)].sort().forEach((s, k) => map.set(s, "c" + k));
    col = next.map(s => map.get(s));
  }
  return col;
}
function multisetKey(arr) { return arr.slice().sort().join(""); }

function isomorphic(A, B) {
  if (A.atoms.length !== B.atoms.length) return false;
  if (A.bonds.length !== B.bonds.length) return false;
  const adjA = adjacencyOf(A), adjB = adjacencyOf(B);
  const colA = wlColours(A, adjA), colB = wlColours(B, adjB);
  if (multisetKey(colA) !== multisetKey(colB)) return false;

  const n = A.atoms.length;
  /* ترتیبِ جست‌وجو: اتم‌هایی که به بخشِ نگاشته‌شده وصل‌اند اول، تا هر
     انتخاب بلافاصله با یال‌ها بررسی شود و شاخه‌های مرده زود بمیرند. */
  const order = [];
  const placed = new Array(n).fill(false);
  while (order.length < n) {
    let best = -1, bestScore = -1;
    for (let i = 0; i < n; i++) {
      if (placed[i]) continue;
      const score = adjA[i].filter(e => placed[e.to]).length * 100 + adjA[i].length;
      if (score > bestScore) { bestScore = score; best = i; }
    }
    placed[best] = true; order.push(best);
  }

  const mapAB = new Array(n).fill(-1);
  const used = new Array(n).fill(false);
  const bondA = new Map();
  A.bonds.forEach(b => { bondA.set(b.a + "," + b.b, b.order); bondA.set(b.b + "," + b.a, b.order); });
  const bondB = new Map();
  B.bonds.forEach(b => { bondB.set(b.a + "," + b.b, b.order); bondB.set(b.b + "," + b.a, b.order); });

  function fits(ai, bi) {
    if (used[bi]) return false;
    if (colA[ai] !== colB[bi]) return false;
    if (adjA[ai].length !== adjB[bi].length) return false;
    for (const e of adjA[ai]) {
      const m = mapAB[e.to];
      if (m < 0) continue;                       // هنوز نگاشته نشده
      if (bondB.get(bi + "," + m) !== e.order) return false;
    }
    /* یالِ اضافه در B هم مجاز نیست: هر همسایهٔ نگاشته‌شدهٔ bi باید در A
       هم همسایه باشد، وگرنه نگاشت یال می‌سازد که در A نیست. */
    for (const e of adjB[bi]) {
      const src = mapAB.indexOf(e.to);
      if (src < 0) continue;
      if (bondA.get(ai + "," + src) !== e.order) return false;
    }
    return true;
  }

  let steps = 0;
  function walk(k) {
    if (++steps > 2e6) return false;             // گاردِ انفجار
    if (k === n) return true;
    const ai = order[k];
    for (let bi = 0; bi < n; bi++) {
      if (!fits(ai, bi)) continue;
      mapAB[ai] = bi; used[bi] = true;
      if (walk(k + 1)) return true;
      mapAB[ai] = -1; used[bi] = false;
    }
    return false;
  }
  return walk(0);
}

/* ---------- ۴) جدولِ اصلاحِ دستی ----------
   نامِ انگلیسیِ رکورد → { chain?, bonds, why }. این‌ها با اجرای دوبارهٔ
   ابزار پاک نمی‌شوند و بر شمارش اولویت دارند، چون شمارش نمی‌تواند
   اثباتشان کند — شیمیِ خودِ ترکیب تصمیم می‌گیرد.

   ولی «دستی» به معنیِ «بی‌بررسی» نیست: checkOverride هر ورودی را با
   همان معیارهای شمارش می‌سنجد. یک اشتباهِ تایپی در اندیس‌ها می‌تواند
   مولکولِ دیگری بسازد و چون از کانالِ «دستی» آمده هیچ‌کس شکش نمی‌کند —
   بدترین نوعِ خطای داده. پس هر خطا اجرای ابزار را متوقف می‌کند. */
const OVERRIDES = require("./structure-overrides.js");

function checkOverride(en, ov, rec, ST, blockById, INF) {
  const ids = ov.chain || rec.chain || [];
  const problems = [];
  if (!ids.length) problems.push("زنجیره خالی است");
  const missing = ids.filter(id => !ST[id] || !ST[id].smiles || !ST[id].attach);
  if (missing.length) problems.push("بلوکِ بدونِ قالب: " + [...new Set(missing)].join("، "));
  if (problems.length) return problems;

  const n = ids.length;
  const deg = new Array(n).fill(0);
  const seenEdge = new Set();
  for (const e of ov.bonds || []) {
    if (!Array.isArray(e) || e.length !== 2) { problems.push("یالِ بدشکل: " + JSON.stringify(e)); continue; }
    const [a, b] = e;
    if (!(a >= 0 && a < n && b >= 0 && b < n)) { problems.push("اندیسِ بیرون از بازه: [" + a + "," + b + "]"); continue; }
    if (a === b) { problems.push("یالِ حلقه به خود: [" + a + "," + b + "]"); continue; }
    const key = Math.min(a, b) + "," + Math.max(a, b);
    if (seenEdge.has(key)) { problems.push("یالِ تکراری: [" + a + "," + b + "]"); continue; }
    seenEdge.add(key);
    deg[a]++; deg[b]++;
  }
  if (problems.length) return problems;

  for (let i = 0; i < n; i++) {
    const want = ST[ids[i]].attach.length;
    if (deg[i] !== want)
      problems.push("بلوکِ " + i + " («" + ids[i] + "») " + deg[i] + " یال دارد ولی " + want + " نقطهٔ اتصال");
  }
  const adj = Array.from({ length: n }, () => []);
  (ov.bonds || []).forEach(e => { if (adj[e[0]] && adj[e[1]]) { adj[e[0]].push(e[1]); adj[e[1]].push(e[0]); } });
  const seen = new Set([0]), stack = [0];
  while (stack.length) { const k = stack.pop(); for (const j of adj[k]) if (!seen.has(j)) { seen.add(j); stack.push(j); } }
  if (seen.size !== n) problems.push("گراف تکه‌تکه است — " + (n - seen.size) + " بلوک به بقیه وصل نیست");
  if (problems.length) return problems;

  /* آزمونِ نهایی: مولکولِ سرِهم‌شده باید همان فرمولِ رکورد را بدهد. */
  /* slots اختیاری است ولی اگر باشد باید دقیقاً جایگشتِ همسایه‌های همان
     بلوک باشد؛ وگرنه موتور بی‌صدا نادیده‌اش می‌گیرد و ما فکر می‌کنیم
     ساختار میخ شده در حالی که نشده. */
  if (ov.slots) {
    for (const k of Object.keys(ov.slots)) {
      const i = Number(k);
      if (!(i >= 0 && i < n)) { problems.push("slots: بلوکِ " + k + " وجود ندارد"); continue; }
      const want = adj[i].slice().sort((a, b) => a - b).join();
      const got = ov.slots[k];
      if (!Array.isArray(got) || got.slice().sort((a, b) => a - b).join() !== want)
        problems.push("slots[" + k + "] باید جایگشتی از همسایه‌های [" + want +
                      "] باشد، ولی [" + got + "] است");
      else if (got.length !== ST[ids[i]].attach.length)
        problems.push("slots[" + k + "] طولش با نقطه‌های اتصالِ «" + ids[i] + "» نمی‌خواند");
    }
    if (problems.length) return problems;
  }

  const chainObjs = ids.map(id => blockById[id]);
  if (chainObjs.some(x => !x)) return ["بلوکی در DB.blocks نیست"];
  const probe = { chain: ids, bonds: ov.bonds, slots: ov.slots, ring: false, formula: rec.formula };
  let mols = null;
  try { mols = INF.blockAssemblies(chainObjs, probe); } catch (e) { return ["مونتاژ خطا داد: " + e.message]; }
  if (!mols || !mols.length) return ["مونتاژ هیچ مولکولی نساخت"];
  if (rec.formula) {
    const m0 = mols[0];
    const fa = m0.atoms.reduce((acc, a) => { acc[a.el] = (acc[a.el] || 0) + 1; return acc; }, {});
    fa.H = (fa.H || 0) + m0.atoms.reduce((s, a) => s + (a.H || 0), 0);
    const want = INF.parseFormula(rec.formula);
    const keys = new Set([...Object.keys(fa), ...Object.keys(want)]);
    for (const k of keys) {
      if ((fa[k] || 0) !== (want[k] || 0)) {
        problems.push("فرمولِ سرِهم‌شده " + INF.formulaString(fa) + " است ولی رکورد " + rec.formula + " می‌گوید");
        break;
      }
    }
  }
  return problems;
}

/* شمارِ محیط‌های کربنیِ یک دسته‌مولکول؛ اگر چیدمان‌ها اختلاف داشته باشند
   بازه گزارش می‌شود، چون همان چیزی است که predictSymmetry هم می‌بیند. */
let SREF = null;
function envCount(reps) {
  const ns = reps.map(m => {
    const cls = SREF.refineClasses(m);
    const s = new Set();
    m.atoms.forEach((a, k) => { if (a.el === "C") s.add(cls[k]); });
    return s.size;
  });
  const lo = Math.min.apply(null, ns), hi = Math.max.apply(null, ns);
  return lo === hi ? String(lo) : lo + "–" + hi + " (نامعین)";
}

/* ---------- ۵) اجرا ---------- */
function main() {
  const sandbox = loadDB();
  const DB = sandbox.DB, INF = sandbox.Inference;
  SREF = sandbox.Structure;
  const ST = DB.blockStructures || {};
  const explainArg = process.argv.find(a => a.indexOf("--explain=") === 0);
  const explain = explainArg ? explainArg.slice(10).toLowerCase() : null;
  const blockById = {};
  (DB.blocks || []).forEach(b => { blockById[b.id] = b; });

  /* یک ترکیب می‌تواند هم در reference و هم در fieldProblems باشد؛ اتصال
     باید به هر دو نسخه بچسبد، وگرنه نسخهٔ بی‌اتصال جلوی آن یکی را
     می‌گیرد — همان درسی که database-signatures.js قبلاً گرفته بود. */
  const records = [];
  (DB.reference || []).forEach(r => records.push({ src: "reference", r }));
  (DB.fieldProblems || []).forEach(r => records.push({ src: "field", r }));

  const derived = [];   // [نام, bonds, chain, 1=زنجیره جایگزین شود]
  const stat = { forced: 0, override: 0, handwritten: 0, ambiguous: 0, impossible: 0, skipped: 0, tooBig: 0 };
  const todo = { ambiguous: [], impossible: [], noTemplate: [], tooBig: [] };
  const badOverrides = [];
  const seenEn = new Set();
  const doneOverrides = new Set();
  const knownEn = new Set(records.map(x => x.r.en).filter(Boolean));
  for (const en of Object.keys(OVERRIDES)) {
    if (!knownEn.has(en))
      badOverrides.push({ en, problems: ["هیچ رکوردی با این نامِ انگلیسی در پایگاه نیست"] });
  }

  for (const { src, r } of records) {
    const en = r.en;
    const ids = r.chain || [];
    if (!en || !ids.length) { stat.skipped++; continue; }
    /* کلید نامِ تنها نیست. یک ترکیب می‌تواند دو رکورد با دو زنجیرهٔ
       متفاوت داشته باشد (۴-آمینواستوفنون: reference زنجیرهٔ سه‌بلوکی دارد
       و بانکِ سوال چهاربلوکی). اگر با نام کلید می‌زدیم، اتصالِ یکی روی
       زنجیرهٔ آن یکی می‌نشست و مولکولِ غلط می‌ساخت. */
    const key = en + "|" + ids.join(",");
    if (seenEn.has(key)) continue;
    seenEn.add(key);

    /* اصلاحِ دستی *پیش از* قاعدهٔ عدم‌تخریب بررسی می‌شود. کسی که نامی را
       در structure-overrides.js می‌نویسد صریحاً می‌گوید اسکلتِ موجود را
       عوض کن؛ و بخشی از این «اتصالِ موجود»ها اصلاً دست‌نویس نیستند بلکه
       derive-signatures.js تولیدشان کرده و فقط چیدمانِ اسلات را ندارند
       (تسیلاتِ تتراتیلن‌گلیکول دقیقاً همین بود). */
    if (OVERRIDES[en]) {
      /* اصلاحِ دستی زنجیره را هم جایگزین می‌کند، پس یک‌بار برای هر نام
         کافی است؛ رکوردهای هم‌نامِ دیگر همان زنجیره را می‌گیرند. */
      if (doneOverrides.has(en)) continue;
      doneOverrides.add(en);
      const ov = OVERRIDES[en];
      const bad = checkOverride(en, ov, r, ST, blockById, INF);
      if (bad.length) { badOverrides.push({ en, problems: bad }); continue; }
      derived.push([en, ov.bonds, ov.chain || ids, ov.chain ? 1 : 0, ov.slots || 0, 1]);
      stat.override++; continue;
    }

    /* قاعدهٔ عدم‌تخریب: اتصالِ دست‌نویسی که اصلاحِ صریح ندارد دست‌نخورده. */
    if (Array.isArray(r.bonds) && r.bonds.length && !r.derivedBonds) {
      stat.handwritten++; continue;
    }

    const missing = ids.filter(id => !ST[id] || !ST[id].smiles || !ST[id].attach);
    if (missing.length) {
      stat.skipped++;
      todo.noTemplate.push({ src, en, chain: ids, why: [...new Set(missing)].join("، ") });
      continue;
    }
    if (ids.length > MAX_CHAIN) {
      stat.tooBig++;
      todo.tooBig.push({ src, en, chain: ids });
      continue;
    }

    const deg = ids.map(id => ST[id].attach.length);
    const wirings = deg.reduce((a, b) => a + b, 0) % 2 ? [] : enumerateWirings(deg, MAX_WIRINGS);
    if (wirings === null) {
      stat.ambiguous++;
      todo.ambiguous.push({ src, en, chain: ids, n: ">" + MAX_WIRINGS });
      continue;
    }

    /* هر سیم‌کشی سرِهم می‌شود؛ سیم‌کشی‌ای که فرمولش با فرمولِ رکورد
       نخواند اصلاً کاندید نیست. blockAssemblies خودش چیدمانِ اسلات‌ها را
       باز می‌کند، پس نتیجه *همهٔ* مولکول‌های ممکن است نه یکی. */
    const chainObjs = ids.map(id => blockById[id]).filter(Boolean);
    if (chainObjs.length !== ids.length) {
      stat.skipped++;
      todo.noTemplate.push({ src, en, chain: ids, why: "بلوک در DB.blocks نیست" });
      continue;
    }
    const target = r.formula ? INF.parseFormula(r.formula) : null;

    /* یکتایی در سطحِ *سیم‌کشی* سنجیده می‌شود، نه در سطحِ تک‌مولکول.
       blockAssemblies برای یک سیم‌کشیِ ثابت هم چند مولکول برمی‌گرداند،
       چون نمی‌داند کدام همسایه به کدام اسلاتِ بلوک می‌نشیند (بنزنِ
       ۱،۲،۳-استخلافی سه اسلات دارد و ترتیبشان را زنجیره نمی‌گوید). آن
       ابهام به bonds ربطی ندارد — bonds بینِ اندیسِ بلوک‌هاست — و
       predictSymmetry خودش با آن کنار می‌آید: اگر همهٔ چیدمان‌ها به یک
       عدد نرسند سکوت می‌کند. اگر این‌جا هر چیدمان را یک «مولکولِ رقیب»
       بشماریم، سیم‌کشیِ کاملاً قطعی هم «مبهم» اعلام می‌شود و کلِ هدفِ
       ابزار از دست می‌رود. پس امضای هر سیم‌کشی = مجموعهٔ مولکول‌هایش،
       و دو سیم‌کشی وقتی هم‌ارزند که این مجموعه‌ها منطبق باشند. */
    const variants = [];
    for (const w of wirings) {
      const probe = Object.assign({}, r, { bonds: w, ring: false });
      let list = null;
      try { list = INF.blockAssemblies(chainObjs, probe); } catch (e) { list = null; }
      if (!list || !list.length) continue;
      if (target) {
        const m0 = list[0];
        const fa = m0.atoms.reduce((acc, a) => { acc[a.el] = (acc[a.el] || 0) + 1; return acc; }, {});
        fa.H = (fa.H || 0) + m0.atoms.reduce((s, a) => s + (a.H || 0), 0);
        const keys = new Set([...Object.keys(fa), ...Object.keys(target)]);
        let same = true;
        for (const k of keys) if ((fa[k] || 0) !== (target[k] || 0)) { same = false; break; }
        if (!same) continue;               // زنجیره کلِ مولکول را توصیف نمی‌کند
      }
      // مولکول‌های متمایزِ همین سیم‌کشی
      const reps = [];
      for (const m of list) {
        m.__fp = multisetKey(wlColours(m, adjacencyOf(m)));
        if (!reps.some(x => x.__fp === m.__fp && isomorphic(x, m))) reps.push(m);
      }
      variants.push({ wiring: w, reps });
    }

    if (!variants.length) {
      stat.impossible++;
      todo.impossible.push({
        src, en, chain: ids, formula: r.formula,
        why: !wirings.length
          ? "هیچ گرافِ همبندی با این ظرفیت‌ها ممکن نیست"
          : "فرمولِ هر سیم‌کشی با فرمولِ رکورد اختلاف دارد"
      });
      continue;
    }

    const sameSet = (a, b) => a.length === b.length &&
      a.every(x => b.some(y => x.__fp === y.__fp && isomorphic(x, y)));
    const groups = [];
    for (const v of variants) if (!groups.some(g => sameSet(g.reps, v.reps))) groups.push(v);

    if (groups.length === 1) {
      derived.push([en, groups[0].wiring, ids, 0, 0, 0]);
      stat.forced++;
    } else {
      stat.ambiguous++;
      todo.ambiguous.push({ src, en, chain: ids, formula: r.formula, n: groups.length });
    }

    if (explain && en.toLowerCase().indexOf(explain) !== -1) {
      console.log("\n=== " + en + "  " + (r.formula || "") + " ===");
      console.log("زنجیره: [" + ids.map((x, i) => i + ":" + x).join("، ") + "]");
      console.log("درجه‌ها: [" + deg.join("، ") + "]   سیم‌کشیِ خام: " + wirings.length +
                  "   مولکولِ متمایز: " + groups.length);
      groups.forEach((g, k) => {
        console.log("  (" + (k + 1) + ") bonds: " +
                    JSON.stringify(g.wiring).replace(/],\[/g, "], [") +
                    "   ¹³C=" + envCount(g.reps));
        console.log("       " + g.wiring.map(e => ids[e[0]] + "–" + ids[e[1]]).join("، "));
      });
    }
  }

  /* ---------- گزارش ---------- */
  const line = (k, v) => console.log("  " + String(v).padStart(4) + "  " + k);
  console.log("=== بازیابیِ گرافِ اتصال ===");
  line("اتصالِ قطعی از روی ظرفیت‌ها (خودکار)", stat.forced);
  line("از جدولِ اصلاحِ دستی OVERRIDES", stat.override);
  line("اتصالِ دست‌نویس در خودِ داده (دست‌نخورده)", stat.handwritten);
  line("مبهم — بیش از یک مولکولِ ممکن", stat.ambiguous);
  line("ناممکن — زنجیره غلط یا ناقص", stat.impossible);
  line("بلوکِ بدونِ قالبِ اتمی", todo.noTemplate.length);
  line("زنجیرهٔ بلندتر از " + MAX_CHAIN + " بلوک", stat.tooBig);

  if (process.argv.includes("--todo")) {
    const dump = (title, list, fmt) => {
      if (!list.length) return;
      console.log("\n--- " + title + " (" + list.length + ") ---");
      list.forEach(x => console.log("  " + fmt(x)));
    };
    dump("مبهم: کدام مولکول؟ در structure-overrides.js فقط bonds بنویسید", todo.ambiguous,
      x => String(x.n).padStart(3) + " مولکول  " + x.en + "  [" + x.chain.join(", ") + "]");
    dump("ناممکن: در structure-overrides.js هم chain و هم bonds بنویسید", todo.impossible,
      x => (x.formula || "?").padEnd(11) + " " + x.en + "  [" + x.chain.join(", ") + "]  ← " + x.why);
    dump("بلوکِ بدونِ قالبِ اتمی", todo.noTemplate,
      x => x.en + "  [" + x.chain.join(", ") + "]  ← " + x.why);
    dump("زنجیرهٔ خیلی بلند", todo.tooBig, x => x.en + "  (" + x.chain.length + " بلوک)");
  } else if (stat.ambiguous + stat.impossible + todo.noTemplate.length) {
    console.log("\n  برای فهرستِ کارِ باقی‌مانده:  node tools/derive-bonds.js --todo");
  }

  /* اصلاحِ دستیِ غلط بی‌صدا رد نمی‌شود: چیزی که از کانالِ «دستی» بیاید
     دیگر هیچ بررسیِ دیگری ندارد، پس اگر این‌جا نگیریمش هیچ‌جا گرفته
     نمی‌شود. فایلِ تولیدی هم نوشته نمی‌شود تا پایگاه نیمه‌درست نماند. */
  if (badOverrides.length) {
    console.log("\n=== خطا در structure-overrides.js (" + badOverrides.length + ") ===");
    badOverrides.forEach(b => {
      console.log("  ✗ " + b.en);
      b.problems.forEach(p => console.log("      " + p));
    });
    console.log("\nفایلِ data/bond-graphs.js نوشته نشد.");
    process.exitCode = 1;
    return;
  }

  /* ---------- اثرِ واقعی روی ماژولِ تقارن ----------
     تنها عددی که ارزشِ گزارش دارد: چند ترکیب که پیش‌تر ساکت بودند حالا
     شمارِ قطعی می‌دهند، و — مهم‌تر — آیا اتصالِ تازه جوابِ ترکیبی را که
     از قبل درست بود عوض کرده یا نه. عوض‌شدن یعنی یکی از دو جواب غلط است. */
  const byKeyDerived = new Map(derived.map(d =>
    [d[0] + "|" + (d[3] ? "*" : d[2].join(",")), { bonds: d[1], chain: d[2], slots: d[4] || undefined }]));
  let before = 0, gained = 0, changed = 0;
  const uniq = new Map();
  records.forEach(({ r }) => {
    const k = r.en + "|" + (r.chain || []).join(",");
    if (r.en && !uniq.has(k)) uniq.set(k, r);
  });
  for (const [, r] of uniq) {
    const en = r.en;
    const objs = ids => ids.map(id => blockById[id]).filter(Boolean);
    const predict = (chainIds, state) => {
      const o = objs(chainIds);
      if (o.length !== chainIds.length || !o.length) return null;
      try { return INF.predictSymmetry(o, state).predictedC13; } catch (e) { return null; }
    };
    const was = predict(r.chain || [], r);
    if (was != null) before++;
    const d = byKeyDerived.get(en + "|" + (r.chain || []).join(",")) ||
              byKeyDerived.get(en + "|*");
    const nowChain = (d && d.chain) || r.chain || [];
    const now = d ? predict(nowChain, Object.assign({}, r,
      { chain: nowChain, bonds: d.bonds, slots: d.slots, ring: false })) : was;
    if (was == null && now != null) gained++;
    if (was != null && now != null && was !== now) changed++;
  }
  console.log("\n  شمارِ قطعیِ محیط‌های ¹³C:  " + before + " → " + (before + gained) +
              "  (از " + uniq.size + " ترکیب یکتا)");
  if (changed) console.log("  ⚠ جوابِ " + changed + " ترکیب عوض شد — یکی از دو نسخه غلط است، بررسی کنید.");

  /* ---------- بررسیِ پایانی: آیا *ساختار* یکتاست؟ ----------
     شمارِ قطعیِ ¹³C کافی نیست. پیپرونال شش چیدمان دارد که سه سامانهٔ
     حلقویِ متفاوت می‌سازند (۵/۶، ۶/۶، ۶/۷) و هر سه هشت محیطِ کربن
     می‌دهند — پس predictSymmetry راضی است، ولی اگر یکی‌شان را بکشیم
     دو بار از سه بار ساختارِ غلط نشان داده‌ایم. این‌جا با همان آزمونِ
     ایزومورفیسمِ دقیق سنجیده می‌شود، چون فقط رسم به آن نیاز دارد. */
  const notUnique = [];
  {
    const done = new Set();
    for (const { r } of records) {
      const d = byKeyDerived.get(r.en + "|" + (r.chain || []).join(",")) ||
                byKeyDerived.get(r.en + "|*");
      const chainIds = (d && d.chain) || r.chain || [];
      if (!chainIds.length) continue;
      const k = r.en + "|" + chainIds.join(",");
      if (done.has(k)) continue;
      done.add(k);
      const objs = chainIds.map(id => blockById[id]);
      if (objs.some(x => !x)) continue;
      const state = d ? Object.assign({}, r, { chain: chainIds, bonds: d.bonds, slots: d.slots, ring: false }) : r;
      let mols = null;
      try { mols = INF.blockAssemblies(objs, state); } catch (e) { mols = null; }
      if (!mols || mols.length < 2) continue;
      const reps = [];
      for (const m of mols) {
        m.__fp = multisetKey(wlColours(m, adjacencyOf(m)));
        if (!reps.some(x => x.__fp === m.__fp && isomorphic(x, m))) reps.push(m);
      }
      if (reps.length > 1) notUnique.push({ en: r.en, chain: chainIds, n: reps.length });
    }
  }
  if (notUnique.length) {
    console.log("\n  ساختار یکتا نیست (شمارش درست است ولی رسم ممکن نیست): " + notUnique.length);
    if (process.argv.includes("--todo"))
      notUnique.forEach(x => console.log("    " + String(x.n).padStart(2) + " ساختار  " + x.en +
                                         "  [" + x.chain.join(", ") + "]"));
    else console.log("    (برای فهرست: --todo)");
  } else {
    console.log("\n  ساختارِ هر ترکیب یکتاست ✓");
  }

  if (process.argv.includes("--report-only")) return;

  /* ---------- نوشتنِ فایلِ تولیدی ---------- */
  const body = JSON.stringify(derived);
  const file = [
    "/* =====================================================================",
    "   bond-graphs.js — تولیدی؛ دستی ویرایش نکنید",
    "   با  node tools/derive-bonds.js  ساخته می‌شود.",
    "",
    "   گرافِ اتصالِ بلوک‌ها را به رکوردها می‌چسباند. تا پیش از این،",
    "   inference.topology() اتصال را خطی (یا حلقوی) حدس می‌زد و برای هر",
    "   ساختارِ حلقوی یا انشعابی غلط درمی‌آمد؛ نتیجه‌اش سکوتِ ماژولِ تقارن",
    "   روی نزدیک به نیمی از بانک بود.",
    "",
    "   هر سطر: [نامِ انگلیسی, bonds] و اگر زنجیرهٔ ثبت‌شده هم غلط بوده",
    "   [نامِ انگلیسی, bonds, chain]. اندیس‌ها روی همان آرایهٔ chain اند.",
    "   اتصالِ دست‌نویسِ داخلِ data/*.js بازنویسی نمی‌شود.",
    "   ===================================================================== */",
    "(function (root) {",
    '  "use strict";',
    "  var DB = root.DB;",
    '  if (!DB) { if (typeof console !== "undefined") console.warn("bond-graphs: DB یافت نشد"); return; }',
    "  var BONDS = " + body + ";",
    "  var byEn = {};",
    "  var index = function (rec) {",
    "    if (!rec || !rec.en) return;",
    "    (byEn[rec.en] = byEn[rec.en] || []).push(rec);",
    "  };",
    "  (DB.fieldProblems || []).forEach(index);",
    "  (DB.reference || []).forEach(index);",
    "  var applied = 0;",
    "  BONDS.forEach(function (row) {",
    "    var targets = byEn[row[0]];",
    "    if (!targets) return;",
    "    targets.forEach(function (t) {",
    "      // قاعدهٔ عدم‌تخریب: اتصالِ دست‌نویس دست‌نخورده می‌ماند — مگر",
    "      // این‌که سطر از اصلاحِ دستیِ صریح آمده باشد (row[5]).",
    "      if (!row[5] && t.bonds && t.bonds.length && !t.derivedBonds) return;",
    "      // اندیس‌های bonds روی زنجیرهٔ row[2] شمرده شده‌اند. اگر رکورد",
    "      // زنجیرهٔ دیگری دارد، همان اتصال روی آن معنیِ دیگری می‌دهد و",
    "      // مولکولِ غلط می‌سازد — پس یا زنجیره باید جایگزین شود (row[3])",
    "      // یا مو‌به‌مو همان باشد.",
    "      if (row[3]) { t.chain = row[2].slice(); t.correctedChain = true; }",
    "      else if (!t.chain || t.chain.join() !== row[2].join()) return;",
    "      t.bonds = row[1];",
    "      t.derivedBonds = true;",
    "      // میخِ چیدمانِ اسلات‌ها، فقط جایی که نقطه‌های اتصالِ بلوک",
    "      // هم‌ارز نیستند (مثلاً ester_co: کربنِ کربونیل در برابر اکسیژن).",
    "      if (row[4]) t.slots = row[4]; else if (t.slots) delete t.slots;",
    "      // اتصالِ صریح جای حدسِ حلقوی را می‌گیرد؛ اگر ring روشن بماند،",
    "      // topology() یالِ اضافهٔ n-1→0 را هم می‌زند و ظرفیت می‌شکند.",
    "      if (t.ring) t.ring = false;",
    "      applied++;",
    "    });",
    "  });",
    '  if (typeof console !== "undefined") {',
    '    console.info("bond-graphs: گرافِ اتصال برای " + applied + " رکورد اعمال شد.");',
    "  }",
    '})(typeof window !== "undefined" ? window : globalThis);',
    ""
  ].join("\n");
  fs.writeFileSync(path.join(ROOT, "data/bond-graphs.js"), file, "utf8");
  console.log("\nنوشته شد: data/bond-graphs.js  (" + derived.length + " ترکیب، " + file.length + " بایت)");
}

main();
