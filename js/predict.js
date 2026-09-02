/* =====================================================================
   predict.js — پیش‌بینیِ شیفتِ ¹³C برای *هر اتم*، با نشان‌دادنِ حساب
   ---------------------------------------------------------------------
   موتورِ تقارن می‌گوید مولکول چند محیطِ کربن دارد. این ماژول یک قدم
   جلوتر می‌رود و می‌گوید هر کربن *کجا* می‌افتد، و مهم‌تر از عدد، جمعی که
   به آن عدد رسیده را برمی‌گرداند:

       ۱۲۸.۵ (بنزن) + ۲۶.۹ (ایپسوی OH) + ۰.۷ (اورتوی CH₃)
                    + ۴.۲ (پارای کتون) = ۱۶۰.۳

   همین «رسید» است که ارزشِ آموزشی دارد؛ عددِ تنها را هر جدولی می‌دهد.

   قاعدهٔ صحت، همان قاعدهٔ بقیهٔ موتور: هر کربنی که به یکی از الگوهای
   شناخته‌شده نخورد null برمی‌گردد، نه عددِ حدسی. پیش‌بینیِ غلط از
   نبودِ پیش‌بینی بدتر است، چون دانشجو رویش حساب می‌کند.

   دقتِ سنجیده‌شده روی خودِ بانک با tools/test-predict.js گزارش می‌شود؛
   اگر قاعده‌ای عوض شد، همان ابزار می‌گوید بهتر شده یا بدتر.

   منابعِ عددی:
     • آروماتیک — DB.c13BenzeneIncrements (همان جدولِ داخلِ برنامه)
     • آلیفاتیک — قاعدهٔ افزایشیِ گرانت-پاول با تصحیحِ فضایی
     • کربونیل/نیتریل/آلکن — پایه‌های استانداردِ کلاسِ عاملی
   ===================================================================== */
(function (root) {
  "use strict";

  const BENZENE = 128.5;
  const GP = { base: -2.3, alpha: 9.1, beta: 9.4, gamma: -2.5, delta: 0.3 };

  /* تصحیحِ فضاییِ گرانت-پاول: [درجهٔ کربنِ موردنظر][درجهٔ همسایهٔ آلفا].
     بدونِ این، کربن‌های شاخه‌دار ۱۰ تا ۱۵ppm بالا می‌افتند. */
  const STERIC = {
    1: { 1: 0, 2: 0, 3: -1.1, 4: -3.4 },
    2: { 1: 0, 2: -2.5, 3: -9.5, 4: -15.0 },
    3: { 1: -1.1, 2: -9.5, 3: -16.5, 4: -16.5 },
    4: { 1: -3.4, 2: -15.0, 3: -16.5, 4: -16.5 }
  };

  /* اثرِ هترواتم روی کربنِ sp³ در فاصلهٔ آلفا/بتا/گاما */
  const HETERO = {
    OH:   { a: 48, b: 10, g: -5, fa: "هیدروکسیل" },
    OR:   { a: 58, b: 8, g: -4, fa: "اکسیژنِ اتری/استری" },
    N:    { a: 28, b: 11, g: -5, fa: "آمین" },
    NAM:  { a: 20, b: 8, g: -4, fa: "نیتروژنِ آمیدی" },
    NO2:  { a: 63, b: 4, g: -4, fa: "نیترو" },
    F:    { a: 68, b: 9, g: -4, fa: "فلوئور" },
    Cl:   { a: 31, b: 11, g: -4, fa: "کلر" },
    Br:   { a: 20, b: 11, g: -3, fa: "برم" },
    I:    { a: -6, b: 11, g: -2, fa: "ید" },
    S:    { a: 11, b: 12, g: -6, fa: "گوگرد" },
    CO:   { a: 22, b: 3, g: -3, fa: "کربونیلِ مجاور" },
    CN:   { a: 3, b: 3, g: -3, fa: "نیتریل" }
  };

  /* پایهٔ کربنِ کربونیل به تفکیکِ کلاس. مزدوج‌شدن با حلقه یا آلکن
     حدودِ ۷ واحد پایین می‌آوردش — همان چیزی که IR هم نشان می‌دهد. */
  const CARBONYL = {
    ketone:   { d: 207, fa: "کتون" },
    aldehyde: { d: 201, fa: "آلدهید" },
    acid:     { d: 178, fa: "کربوکسیلیک اسید" },
    ester:    { d: 171, fa: "استر" },
    amide:    { d: 170, fa: "آمید" },
    acyl_cl:  { d: 170, fa: "کلریدِ اسید" },
    anhydride:{ d: 165, fa: "انیدرید" },
    /* کربناتِ دی‌آلکیل دو اکسیژنِ تک‌پیوندی دارد و کربونیلش با هر دو
       رزونانس می‌کند، پس بسیار بالاتر شیلد می‌شود: ~۱۵۵ نه ۱۷۱ استری. */
    carbonate:{ d: 155, fa: "کربنات" }
  };

  function adjacency(mol) {
    const adj = mol.atoms.map(() => []);
    mol.bonds.forEach(b => {
      adj[b.a].push({ to: b.b, order: b.order });
      adj[b.b].push({ to: b.a, order: b.order });
    });
    return adj;
  }

  /* ---------- شناساییِ گروهِ استخلافی برای جدولِ آروماتیک ----------
     ورودی: اتمی که به حلقه چسبیده. خروجی: کلیدِ همان جدول یا null. */
  function substituentKey(mol, adj, at, from) {
    const a = mol.atoms[at];
    const nb = adj[at].filter(e => e.to !== from);
    if (a.el === "F" || a.el === "Cl" || a.el === "Br" || a.el === "I") return a.el;
    if (a.el === "O") return a.H > 0 ? "OH" : "OCH3";        // اتر و متوکسی یک ردیف دارند
    if (a.el === "N") {
      const hasO2 = nb.filter(e => mol.atoms[e.to].el === "O").length >= 2;
      if (hasO2 || a.charge > 0) return "NO2";
      const acyl = nb.some(e => mol.atoms[e.to].el === "C" &&
        adj[e.to].some(x => x.order === 2 && mol.atoms[x.to].el === "O"));
      if (acyl) return "NHCOCH3";
      if (a.H >= 2) return "NH2";
      return "N(CH3)2";
    }
    if (a.el === "C") {
      const trip = adj[at].find(e => e.order === 3 && mol.atoms[e.to].el === "N");
      if (trip) return "CN";
      const dblO = nb.find(e => e.order === 2 && mol.atoms[e.to].el === "O");
      if (dblO) {
        const singleO = nb.find(e => e.order === 1 && mol.atoms[e.to].el === "O");
        if (singleO) return mol.atoms[singleO.to].H > 0 ? "COOH" : "COOR";
        if (a.H > 0) return "CHO";
        return "COR";
      }
      return "CH3";                                          // هر آلکیلی، تقریبِ متیل
    }
    return null;
  }

  /* ---------- کربنِ آروماتیک ----------
     فاصله روی خودِ حلقه شمرده می‌شود: ۰ ایپسو، ۱ اورتو، ۲ متا، ۳ پارا.
     BFS محدود به پیوندهای آروماتیک است، پس نیازی به یافتنِ حلقه نیست. */
  function aromaticShift(mol, adj, i, INCR) {
    const n = mol.atoms.length;
    const dist = new Array(n).fill(-1);
    dist[i] = 0;
    const q = [i];
    while (q.length) {
      const v = q.shift();
      if (dist[v] >= 3) continue;
      for (const e of adj[v]) {
        if (!mol.atoms[e.to].arom) continue;
        if (dist[e.to] !== -1) continue;
        dist[e.to] = dist[v] + 1;
        q.push(e.to);
      }
    }
    const terms = [{ fa: "بنزن (پایه)", v: BENZENE }];
    let total = BENZENE, unknown = false;
    for (let j = 0; j < n; j++) {
      if (dist[j] < 0 || dist[j] > 3) continue;
      if (!mol.atoms[j].arom) continue;
      // استخلاف‌های اتمِ j: همسایه‌هایی که در حلقه نیستند
      for (const e of adj[j]) {
        if (mol.atoms[e.to].arom) continue;
        const key = substituentKey(mol, adj, e.to, j);
        if (!key) { unknown = true; continue; }
        const row = INCR.find(x => x.sub === key);
        if (!row) { unknown = true; continue; }
        const pos = ["ipso", "ortho", "meta", "para"][dist[j]];
        const posFa = ["ایپسو", "اورتو", "متا", "پارا"][dist[j]];
        const v = row[pos];
        if (typeof v !== "number") { unknown = true; continue; }
        total += v;
        terms.push({ fa: posFa + "ی " + (row.fa || key), v: v });
      }
    }
    if (unknown) return null;
    return { delta: total, terms: terms, kind: "آروماتیک" };
  }

  /* ---------- کربنِ کربونیل ---------- */
  function carbonylShift(mol, adj, i) {
    const nb = adj[i];
    const dblO = nb.find(e => e.order === 2 && mol.atoms[e.to].el === "O");
    if (!dblO) return null;
    const rest = nb.filter(e => e !== dblO);
    const singleO = rest.filter(e => mol.atoms[e.to].el === "O");
    const nitro = rest.filter(e => mol.atoms[e.to].el === "N");
    const chlor = rest.filter(e => mol.atoms[e.to].el === "Cl");
    let kind;
    if (singleO.length === 2) kind = "carbonate";     // RO–CO–OR، نه استر
    else if (singleO.length === 1) {
      // اکسیژنی که خودش به کربونیلِ دیگری وصل است یعنی انیدرید
      const other = adj[singleO[0].to].find(e => e.to !== i && mol.atoms[e.to].el === "C" &&
        adj[e.to].some(x => x.order === 2 && mol.atoms[x.to].el === "O"));
      if (other) kind = "anhydride";
      else kind = mol.atoms[singleO[0].to].H > 0 ? "acid" : "ester";
    } else if (nitro.length) kind = "amide";
    else if (chlor.length) kind = "acyl_cl";
    else if (mol.atoms[i].H > 0) kind = "aldehyde";
    else kind = "ketone";

    const base = CARBONYL[kind];
    const terms = [{ fa: base.fa + " (پایه)", v: base.d }];
    let total = base.d;
    // مزدوج‌شدن با حلقه یا پیوندِ دوگانه
    const conj = rest.some(e => mol.atoms[e.to].arom ||
      adj[e.to].some(x => x.order === 2 && mol.atoms[x.to].el === "C" && x.to !== i));
    if (conj) { total -= 7; terms.push({ fa: "مزدوج با حلقه/آلکن", v: -7 }); }
    /* دو کربونیلِ چسبیده (دی‌استیل، اگزالات) هم‌دیگر را شیلد می‌کنند:
       بی‌استیل ۱۹۷ است نه ۲۰۷. */
    const nextToCO = rest.some(e => mol.atoms[e.to].el === "C" &&
      adj[e.to].some(x => x.order === 2 && mol.atoms[x.to].el === "O"));
    if (nextToCO) { total -= 10; terms.push({ fa: "کربونیلِ چسبیده", v: -10 }); }
    return { delta: total, terms: terms, kind: base.fa };
  }

  /* ---------- کربنِ آلکنی و نیتریل ---------- */
  function alkeneShift(mol, adj, i) {
    const dbl = adj[i].find(e => e.order === 2 && mol.atoms[e.to].el === "C");
    if (!dbl) return null;
    const partner = dbl.to;
    const terms = [{ fa: "اتیلن (پایه)", v: 123.3 }];
    let total = 123.3;
    const own = adj[i].filter(e => e.to !== partner && mol.atoms[e.to].el === "C").length;
    const far = adj[partner].filter(e => e.to !== i && mol.atoms[e.to].el === "C").length;
    if (own) { total += 10.6 * own; terms.push({ fa: own + " کربنِ روی همین کربن", v: 10.6 * own }); }
    if (far) { total -= 7.9 * far; terms.push({ fa: far + " کربنِ روی کربنِ مقابل", v: -7.9 * far }); }
    // هترواتمِ مستقیم روی کربنِ آلکنی (انول، اتر وینیلی)
    let het = 0;
    adj[i].forEach(e => {
      const el = mol.atoms[e.to].el;
      if (e.to === partner) return;
      if (el === "O") het += 30;
      else if (el === "N") het += 15;
    });
    if (het) { total += het; terms.push({ fa: "هترواتمِ روی کربنِ آلکنی", v: het }); }
    /* آلکنِ مزدوج با کربونیل قطبی می‌شود: کربنِ بتا الکترون از دست می‌دهد
       و تا ~۱۶۵ پایین می‌رود، کربنِ آلفا بالا می‌ماند. سیکلوپنتنون بدونِ
       این تصحیح ۴۰ppm خطا می‌داد. */
    const iIsAlpha = adj[i].some(e => e.to !== partner && mol.atoms[e.to].el === "C" &&
      adj[e.to].some(x => x.order === 2 && mol.atoms[x.to].el === "O"));
    const farIsAlpha = adj[partner].some(e => e.to !== i && mol.atoms[e.to].el === "C" &&
      adj[e.to].some(x => x.order === 2 && mol.atoms[x.to].el === "O"));
    if (iIsAlpha) { total -= 8; terms.push({ fa: "آلفای کربونیلِ مزدوج", v: -8 }); }
    else if (farIsAlpha) { total += 15; terms.push({ fa: "بتای کربونیلِ مزدوج", v: 15 }); }
    return { delta: total, terms: terms, kind: "آلکن" };
  }

  /* ---------- کربنِ sp³ (گرانت-پاول) ---------- */
  function heteroKeyOf(mol, adj, at, from) {
    const a = mol.atoms[at];
    if (a.el === "O") {
      // اکسیژنِ متصل به کربونیل → استری، وگرنه الکل/اتر
      return a.H > 0 ? "OH" : "OR";
    }
    if (a.el === "N") {
      const hasO2 = adj[at].filter(e => mol.atoms[e.to].el === "O").length >= 2;
      if (hasO2 || a.charge > 0) return "NO2";
      // نیتروژنی که به کربونیل چسبیده جفتش را خرجِ رزونانس می‌کند و
      // اثرِ آلفایش روی کربنِ مجاور کم‌تر از آمینِ آزاد است
      const amide = adj[at].some(e => mol.atoms[e.to].el === "C" &&
        adj[e.to].some(x => x.order === 2 && mol.atoms[x.to].el === "O"));
      return amide ? "NAM" : "N";
    }
    if (a.el === "S") return "S";
    if (a.el === "F" || a.el === "Cl" || a.el === "Br" || a.el === "I") return a.el;
    if (a.el === "C") {
      if (adj[at].some(e => e.order === 3 && mol.atoms[e.to].el === "N")) return "CN";
      if (adj[at].some(e => e.order === 2 && mol.atoms[e.to].el === "O")) return "CO";
    }
    return null;
  }

  /* ---------- استال و کتال ----------
     دو اکسیژنِ آلفا روی یک کربن جمع‌پذیر نیستند: قاعدهٔ افزایشی برای
     O–CH₂–O عددِ ~۱۲۱ می‌دهد در حالی که ۱،۳-دی‌اکسان ۹۳.۸ است. علتش
     اشباعِ اثرِ القایی است. این خانواده پایهٔ خودش را می‌گیرد. */
  function acetalShift(mol, adj, i) {
    const oxy = adj[i].filter(e => e.order === 1 && mol.atoms[e.to].el === "O");
    if (oxy.length < 2) return null;
    const nC = adj[i].filter(e => mol.atoms[e.to].el === "C").length;
    const base = 95 + 5 * nC;
    return {
      delta: base,
      terms: [{ fa: "استال/کتال (دو اکسیژنِ آلفا)", v: base }],
      kind: "استال"
    };
  }

  function sp3Shift(mol, adj, i) {
    const n = mol.atoms.length;
    // فاصلهٔ همهٔ اتم‌ها از i (تا ۳)
    const dist = new Array(n).fill(-1);
    dist[i] = 0;
    const q = [i];
    while (q.length) {
      const v = q.shift();
      if (dist[v] >= 4) continue;
      for (const e of adj[v]) {
        if (dist[e.to] !== -1) continue;
        dist[e.to] = dist[v] + 1;
        q.push(e.to);
      }
    }
    const cAt = d => {
      let c = 0;
      for (let j = 0; j < n; j++) if (dist[j] === d && mol.atoms[j].el === "C") c++;
      return c;
    };
    const a = cAt(1), b = cAt(2), g = cAt(3), dd = cAt(4);
    const terms = [{ fa: "پایهٔ گرانت-پاول", v: GP.base }];
    let total = GP.base;
    if (a) { total += GP.alpha * a; terms.push({ fa: a + " کربنِ آلفا", v: GP.alpha * a }); }
    if (b) { total += GP.beta * b; terms.push({ fa: b + " کربنِ بتا", v: GP.beta * b }); }
    if (g) { total += GP.gamma * g; terms.push({ fa: g + " کربنِ گاما", v: GP.gamma * g }); }
    if (dd) { total += GP.delta * dd; terms.push({ fa: dd + " کربنِ دلتا", v: GP.delta * dd }); }

    /* اثرِ هترواتم‌ها به تفکیکِ فاصله.
       اثرها جمع‌پذیرِ کامل نیستند: دومین گروهِ همسان کم‌تر از اولی اثر
       می‌گذارد و سومی باز کم‌تر (اشباعِ القایی). مالونات نمونهٔ روشن است —
       متینِ بینِ دو استر با جمعِ ساده ۲۵ppm بالاتر از واقعیت درمی‌آمد. */
    const SAT = [1, 0.55, 0.4, 0.3];
    let unknown = false;
    const usedCount = {};
    for (let j = 0; j < n; j++) {
      if (dist[j] < 1 || dist[j] > 3) continue;
      const key = heteroKeyOf(mol, adj, j, i);
      if (!key) continue;
      const h = HETERO[key];
      if (!h) { unknown = true; continue; }
      const slot = key + "@" + dist[j];
      const nth = (usedCount[slot] = (usedCount[slot] || 0) + 1) - 1;
      const raw = dist[j] === 1 ? h.a : dist[j] === 2 ? h.b : h.g;
      const v = raw * (SAT[Math.min(nth, SAT.length - 1)]);
      total += v;
      terms.push({
        fa: ["", "آلفا", "بتا", "گاما"][dist[j]] + "ی " + h.fa + (nth ? " (اشباع‌شده)" : ""),
        v: Math.round(v * 10) / 10
      });
    }
    if (unknown) return null;

    // تصحیحِ فضایی: درجهٔ خودِ کربن در برابرِ درجهٔ هر همسایهٔ کربنی
    const degOf = k => Math.min(4, Math.max(1, adj[k].filter(e => mol.atoms[e.to].el === "C").length));
    const me = degOf(i);
    let steric = 0;
    adj[i].forEach(e => {
      if (mol.atoms[e.to].el !== "C") return;
      const t = (STERIC[me] || {})[degOf(e.to)];
      if (typeof t === "number") steric += t;
    });
    if (steric) { total += steric; terms.push({ fa: "تصحیحِ فضایی (انشعاب)", v: steric }); }

    return { delta: total, terms: terms, kind: "اشباع (sp³)" };
  }

  /* ---------- ورودیِ اصلی ---------- */
  function carbon13(mol, DB) {
    DB = DB || root.DB;
    const INCR = (DB && DB.c13BenzeneIncrements) || [];
    const adj = adjacency(mol);
    return mol.atoms.map((a, i) => {
      if (a.el !== "C") return null;
      if (adj[i].some(e => e.order === 3 && mol.atoms[e.to].el === "N"))
        return { delta: 118, terms: [{ fa: "نیتریل (پایه)", v: 118 }], kind: "نیتریل" };
      if (a.arom) return aromaticShift(mol, adj, i, INCR);
      const co = carbonylShift(mol, adj, i);
      if (co) return co;
      const alk = alkeneShift(mol, adj, i);
      if (alk) return alk;
      if (adj[i].some(e => e.order === 3)) return null;      // آلکین: قاعده ندارد
      const ac = acetalShift(mol, adj, i);
      if (ac) return ac;
      return sp3Shift(mol, adj, i);
    });
  }

  root.Predict = { carbon13 };
  if (typeof module !== "undefined" && module.exports) module.exports = root.Predict;
})(typeof window !== "undefined" ? window : globalThis);
