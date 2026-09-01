/* =====================================================================
   structure.js — پارسر ساده SMILES + شمارندهٔ خودکار محیط‌های ¹H/¹³C
   بر پایهٔ تقارن توپولوژیک (پالایش رنگ / الگوریتم مورگان-وار).
   محدودیت: تقارن ساختاری (constitutional) را می‌شمارد؛ تفاوت‌های
   دیاستروتوپیک/فضایی را (که به کایرالیته وابسته‌اند) لحاظ نمی‌کند.
   UMD: هم در مرورگر (window.Structure) و هم در Node قابل استفاده.
   ===================================================================== */
(function (root) {
  "use strict";

  // ظرفیت نرمال برای محاسبهٔ هیدروژن ضمنی
  const VALENCE = { B: 3, C: 4, N: 3, O: 2, P: 3, S: 2, F: 1, Cl: 1, Br: 1, I: 1, H: 1 };
  const ORGANIC = ["Cl", "Br", "B", "C", "N", "O", "P", "S", "F", "I"]; // ترتیب مهم: دو‌حرفی‌ها اول
  const AROM = { c: "C", n: "N", o: "O", s: "S", p: "P" };

  /* ---------- پارسر SMILES (زیرمجموعهٔ کاربردی) ---------- */
  function parseSMILES(smi) {
    const atoms = [];   // {el, arom, charge, hExplicit, ringH}
    const bonds = [];   // {a, b, order}
    let i = 0, prev = null, pendingBond = null;
    const branch = [];
    const rings = {};   // digit -> {atom, bond}

    function addBond(a, b, order) {
      if (a == null || b == null) return;
      bonds.push({ a, b, order: order || 1 });
    }
    const bondOrder = ch => ({ "-": 1, "=": 2, "#": 3, ":": 1.5 }[ch] || 1);

    while (i < smi.length) {
      const ch = smi[i];

      if (ch === "(") { branch.push(prev); i++; continue; }
      if (ch === ")") { prev = branch.pop(); i++; continue; }
      // جداکنندهٔ جزء‌ها (نمک‌ها، هیدرات‌ها، مخلوط‌ها): پیوندی زده نمی‌شود.
      // پیش از این نویسهٔ «.» نادیده گرفته می‌شد و اتم بعدی به اتم قبلی می‌چسبید،
      // یعنی «CCO.CCO» به‌جای دو اتانول یک زنجیر چهارکربنه خوانده می‌شد.
      if (ch === ".") { prev = null; pendingBond = null; i++; continue; }
      if (ch === "-" || ch === "=" || ch === "#" || ch === ":" || ch === "/" || ch === "\\") {
        if (ch !== "/" && ch !== "\\") pendingBond = bondOrder(ch);
        i++; continue;
      }
      // بستن حلقه با رقم یا %nn
      if (/[0-9]/.test(ch) || ch === "%") {
        let num;
        if (ch === "%") { num = smi.substr(i + 1, 2); i += 3; }
        else { num = ch; i++; }
        if (rings[num] != null) {
          const other = rings[num].atom;
          const bothArom = atoms[prev] && atoms[other] && atoms[prev].arom && atoms[other].arom;
          addBond(prev, other, rings[num].bond || pendingBond || (bothArom ? 1.5 : 1));
          delete rings[num];
        } else {
          rings[num] = { atom: prev, bond: pendingBond };
        }
        pendingBond = null;
        continue;
      }
      // اتم داخل براکت [..]
      if (ch === "[") {
        const close = smi.indexOf("]", i);
        const inner = smi.slice(i + 1, close);
        const m = inner.match(/^(\d*)([A-Z][a-z]?|[cnops])(@{0,2})(H(\d*))?([+-]\d*|[+-]*)?/);
        let el = m ? m[2] : "C";
        const arom = /[cnops]/.test(el);
        if (arom) el = AROM[el] || el.toUpperCase();
        let hExplicit = 0;
        if (m && m[4]) hExplicit = m[5] ? parseInt(m[5]) : 1;
        let charge = 0;
        if (m && m[6]) {
          if (/^[+-]\d+$/.test(m[6])) charge = parseInt(m[6]);
          else charge = (m[6].match(/\+/g) || []).length - (m[6].match(/-/g) || []).length;
        }
        // نشانگر کایرالیته (@ یا @@) — قبلاً پارس می‌شد اما هرگز ذخیره نمی‌شد.
        // اکنون روی اتم نگه داشته می‌شود تا لایهٔ دیاستروتوپیک/پروکایرال بتواند از آن استفاده کند.
        const stereo = (m && m[3]) ? m[3] : null; // "@" یا "@@" یا null
        const idx = atoms.length;
        atoms.push({ el, arom, charge, hExplicit, stereo, bracket: true });
        if (prev != null) addBond(prev, idx, pendingBond || (arom && atoms[prev].arom ? 1.5 : 1));
        prev = idx; pendingBond = null;
        i = close + 1; continue;
      }
      // اتم ارگانیک بدون براکت
      let el = null, arom = false;
      const two = smi.substr(i, 2);
      if (two === "Cl" || two === "Br") { el = two; i += 2; }
      else {
        const c = smi[i];
        if (/[A-Z]/.test(c) && ORGANIC.includes(c)) { el = c; i++; }
        else if (AROM[c]) { el = AROM[c]; arom = true; i++; }
        else { i++; continue; } // نادیده‌گرفتن نویسه‌های ناشناخته
      }
      const idx = atoms.length;
      atoms.push({ el, arom, charge: 0, hExplicit: null });
      if (prev != null) addBond(prev, idx, pendingBond || ((arom && atoms[prev].arom) ? 1.5 : 1));
      prev = idx; pendingBond = null;
    }
    return { atoms, bonds };
  }

  /* ---------- محاسبهٔ هیدروژن ضمنی و درجه ---------- */
  function computeHydrogens(mol) {
    const { atoms, bonds } = mol;
    const deg = atoms.map(() => 0);       // تعداد همسایه‌های سنگین
    const orderSum = atoms.map(() => 0);  // مجموع مرتبهٔ پیوند
    atoms.forEach((a, k) => a._nbr = []);
    bonds.forEach(b => {
      deg[b.a]++; deg[b.b]++;
      orderSum[b.a] += b.order; orderSum[b.b] += b.order;
      atoms[b.a]._nbr.push({ n: b.b, o: b.order });
      atoms[b.b]._nbr.push({ n: b.a, o: b.order });
    });
    atoms.forEach((a, k) => {
      if (a.hExplicit != null) { a.H = a.hExplicit; a.deg = deg[k]; return; }
      let h;
      if (a.arom) {
        // آروماتیک: یک پیوند π ذاتی در نظر گرفته می‌شود
        if (a.el === "C") h = Math.max(0, 3 - deg[k]);
        else if (a.el === "N") h = Math.max(0, 2 - deg[k]);
        else h = 0;
      } else {
        const v = VALENCE[a.el] || 4;
        h = Math.max(0, v - Math.round(orderSum[k]) + (a.charge || 0) * (a.el === "N" ? 1 : 0));
      }
      a.H = h; a.deg = deg[k];
    });
    return mol;
  }

  /* ---------- یافتن حلقه‌های کوچک (تا ۸ عضو) ----------
     پیمایش عمق‌اول از هر اتم؛ هر حلقه فقط از کوچک‌ترین اندیسش شمرده
     می‌شود (شرط v > start) و با کلید مرتب‌شده یکتاسازی می‌گردد. */
  function findRings(mol, maxSize) {
    const { atoms } = mol;
    const n = atoms.length, seen = new Set(), rings = [];
    const path = [], onPath = new Array(n).fill(false);
    function dfs(start, cur, depth) {
      path.push(cur); onPath[cur] = true;
      for (const nb of atoms[cur]._nbr) {
        const v = nb.n;
        if (v === start && depth >= 3) {
          const key = path.slice().sort((x, y) => x - y).join(",");
          if (!seen.has(key)) { seen.add(key); rings.push(path.slice()); }
        } else if (v > start && !onPath[v] && depth < maxSize) {
          dfs(start, v, depth + 1);
        }
      }
      path.pop(); onPath[cur] = false;
    }
    for (let s = 0; s < n; s++) dfs(s, s, 1);
    return rings;
  }

  /* ---------- نرمال‌سازی رزونانسی مرتبهٔ پیوند در حلقه‌های مزدوج ----------
     تقارن باید مستقل از این باشد که کاربر ساختار را به شکل آروماتیک
     (c1ccccc1) نوشته یا به شکل کِکوله (C1=CC=CC=C1). در شکل کِکوله
     تناوب یک‌درمیانِ پیوندها اتم‌های واقعاً هم‌ارز را از هم جدا می‌کرد:
     تولوئن ۷ محیط ¹³C می‌داد به‌جای ۵، و نفتالین ۵ به‌جای ۳ — یعنی
     برنامه به دانشجویی که پاسخ درست را با ساختار کِکوله وارد کرده بود
     می‌گفت تعداد سیگنال‌هایش با طیف نمی‌خواند.

     راه‌حل: در حلقه‌ای که همهٔ اتم‌هایش sp² (یا هترواتمِ دهندهٔ جفت
     الکترون مانند O در فوران) هستند و دست‌کم یک پیوند دوگانهٔ درون‌حلقه
     دارد، مرتبهٔ همهٔ پیوندهای حلقه برای «نشانوندِ تقارن» ۱٫۵ گرفته
     می‌شود — یعنی میانگین‌گیری رزونانسی. این کار فقط کلاس‌ها را ادغام
     می‌کند و هرگز آن‌ها را نمی‌شکند.

     نکته: مرتبهٔ اصلی پیوند (x.o) دست‌نخورده می‌ماند؛ فقط x.res ساخته
     می‌شود. پس شمارش هیدروژن، فرمول مولکولی و DBE اصلاً تغییر نمی‌کنند. */
  const LONE_PAIR = { N: 1, O: 1, S: 1, P: 1 };
  function normalizeResonance(mol) {
    const { atoms } = mol;
    atoms.forEach(a => a._nbr.forEach(x => { x.res = x.o; }));
    const sp2 = atoms.map(a => a.arom || a._nbr.some(x => x.o >= 2));
    findRings(mol, 8).forEach(ring => {
      if (ring.length < 4) return;
      const inRing = new Set(ring);
      let nSp2 = 0;
      for (const k of ring) {
        if (sp2[k]) { nSp2++; continue; }
        if (!LONE_PAIR[atoms[k].el]) return;   // کربن sp³ در حلقه ⇒ مزدوج نیست
      }
      // حداکثر دو اتمِ دهندهٔ جفت الکترون؛ بقیه باید sp² باشند
      if (nSp2 < ring.length - 2) return;
      let doubles = 0;
      for (const k of ring)
        for (const x of atoms[k]._nbr)
          if (inRing.has(x.n) && x.o >= 2) doubles++;
      if (doubles < 2) return;                 // هر پیوند دوبار شمرده شده
      for (const k of ring)
        for (const x of atoms[k]._nbr)
          if (inRing.has(x.n)) x.res = 1.5;
    });
    return mol;
  }

  /* ---------- پالایش رنگ (مورگان-وار) برای یافتن اتم‌های هم‌ارز ---------- */
  function refineClasses(mol) {
    const { atoms } = mol;
    normalizeResonance(mol);
    // نشانوند اولیه: عنصر + آروماتیک + بار + H + درجه + چندگانهٔ مرتبهٔ پیوندها
    let labels = atoms.map(a => {
      const orders = a._nbr.map(x => x.res).sort().join(",");
      return `${a.el}|${a.arom ? "a" : ""}|${a.charge}|H${a.H}|d${a.deg}|b${orders}`;
    });
    const idOf = arr => { const m = {}; let c = 0; return arr.map(x => (m[x] == null ? (m[x] = c++) : m[x])); };
    let cls = idOf(labels);
    for (let iter = 0; iter < atoms.length + 2; iter++) {
      const next = atoms.map((a, k) => {
        const nb = a._nbr.map(x => `${cls[x.n]}:${x.res}`).sort().join(",");
        return `${cls[k]}|${nb}`;
      });
      const nc = idOf(next);
      if (new Set(nc).size === new Set(cls).size) { cls = nc; break; }
      cls = nc;
    }
    return cls;
  }

  /* ---------- درجهٔ اشباع‌نشدگی (DBE) و فرمول مولکولی ----------
     DBE = C - H/2 - X/2 + N/2 + 1   (O و S روی DBE اثر ندارند)
     این مقدار برای هر سؤال طیف‌سنجی حیاتی است چون مستقیماً از فرمول
     مولکولیِ به‌دست‌آمده از طیف جرمی (M+) قابل محاسبه است و باید با
     تعداد حلقه‌ها + پیوندهای π ساختار پیشنهادی مطابقت داده شود. */
  function degreeOfUnsaturation(formulaAtoms, totalH) {
    const C = formulaAtoms.C || 0;
    const N = formulaAtoms.N || 0;
    const X = (formulaAtoms.F || 0) + (formulaAtoms.Cl || 0) + (formulaAtoms.Br || 0) + (formulaAtoms.I || 0);
    const H = (totalH != null ? totalH : (formulaAtoms.H || 0)) + X; // هالوژن مانند H در فرمول DBE محسوب می‌شود
    return C - H / 2 + N / 2 + 1;
  }

  // فرمول مولکولی به ترتیب هیل (Hill system): C اول، H دوم، بقیه به‌ترتیب الفبا
  function molecularFormula(formulaAtoms, totalH) {
    const order = ["C", "H"].concat(Object.keys(formulaAtoms).filter(e => e !== "C" && e !== "H").sort());
    const counts = Object.assign({}, formulaAtoms, { H: totalH });
    let s = "";
    order.forEach(el => {
      const n = counts[el] || 0;
      if (n > 0) s += el + (n > 1 ? n : "");
    });
    return s;
  }

  /* ---------- الگوی ایزوتوپی هالوژن‌ها برای طیف جرمی (M, M+2, M+4, ...) ----------
     Cl: 35Cl/37Cl ≈ 3:1   |   Br: 79Br/81Br ≈ 1:1
     شدت نسبی هر خوشه از ضرایب دوجمله‌ای (a+b)^n به‌دست می‌آید که در آن
     a,b وزن ایزوتوپی طبیعی و n مجموع تعداد Cl و Br است. */
  function halogenIsotopePattern(formulaAtoms) {
    const nCl = formulaAtoms.Cl || 0, nBr = formulaAtoms.Br || 0;
    if (!nCl && !nBr) return null;
    // چند جمله‌ای احتمال را با کانولوشن می‌سازیم: هر Cl -> [3,1] (M,M+2)، هر Br -> [1,1]
    let dist = [1];
    const convolve = (base, add) => {
      const out = new Array(base.length + add.length - 1).fill(0);
      for (let i = 0; i < base.length; i++)
        for (let j = 0; j < add.length; j++) out[i + j] += base[i] * add[j];
      return out;
    };
    for (let i = 0; i < nCl; i++) dist = convolve(dist, [3, 1]);
    for (let i = 0; i < nBr; i++) dist = convolve(dist, [1, 1]);
    const max = Math.max(...dist);
    return dist.map((v, i) => ({ label: i === 0 ? "M" : `M+${2 * i}`, massOffset: 2 * i, relIntensity: Math.round((v / max) * 100) }));
  }

  /* ---------- پرچم ریسک دیاستروتوپیک/پروکایرال ----------
     محدودیت ذاتی refineClasses این است که فقط تقارن توپولوژیک
     (constitutional) را می‌بیند، نه فضایی. اگر مولکول حداقل یک
     مرکز کایرال («stereo» ثبت‌شده در پارسر) یا یک اتم حلقوی با
     جانشین‌های نامتقارن داشته باشد، گروه‌های CH2/NH2 که در یک محیط
     واحد ادغام شده‌اند ممکن است در واقعیت دو سیگنال متفاوت (پروتون‌های
     دیاستروتوپیک، مثلاً الگوی ABX) نشان دهند. این تابع فقط هشدار
     می‌دهد؛ ادعای دقتِ کامل CIP/توپولوژی فضایی ندارد. */
  function flagDiastereotopicRisk(mol, cls) {
    const { atoms } = mol;
    const hasStereocenter = atoms.some(a => a.stereo);
    const ringAtoms = new Set();
    // اتم‌هایی که در حداقل یک حلقه قرار دارند (heuristic ساده: دو همسایه با کلاس مشترک از طریق مسیر بسته)
    // در اینجا از شمارش پیوندهای هر اتم که در bonds اصلی حلقه ایجاد شده استفاده می‌کنیم (بازسازی نشده؛
    // چون parseSMILES خودش رقم‌های حلقه را می‌بندد، به‌سادگی اتم‌هایی با deg>=2 در ساختار غیرخطی را می‌آزماییم)
    const flagged = [];
    atoms.forEach((a, k) => {
      if (a.H === 2 && !a.arom) {
        const sameClassCount = atoms.filter((b, j) => cls[j] === cls[k]).length;
        if (sameClassCount === 1 && hasStereocenter) {
          flagged.push({ atomIndex: k, reason: "مولکول دارای مرکز کایرال است؛ دو H این CH₂/NH₂ می‌توانند دیاستروتوپیک (آنیزوکرون) باشند." });
        }
      }
    });
    return { hasStereocenter, candidates: flagged };
  }

  /* ---------- شمارش محیط‌های ¹H و ¹³C ---------- */
  function countEnvironments(smi) {
    const mol = computeHydrogens(parseSMILES(smi));
    const { atoms } = mol;
    if (!atoms.length) return { error: "ساختار SMILES خوانده نشد." };
    const cls = refineClasses(mol);

    // محیط‌های کربن: کلاس‌های یکتای کربن‌ها
    const carbonClasses = new Set();
    atoms.forEach((a, k) => { if (a.el === "C") carbonClasses.add(cls[k]); });

    // محیط‌های پروتون: کلاس‌های یکتای اتم‌های سنگینِ حامل H (C و هترو با H)
    const protonClasses = new Map(); // classId -> {el, count(atoms), Htotal}
    let exchangeable = 0;
    atoms.forEach((a, k) => {
      if (a.H > 0) {
        const key = cls[k];
        if (!protonClasses.has(key)) protonClasses.set(key, { el: a.el, atoms: 0, Htot: 0 });
        const e = protonClasses.get(key); e.atoms++; e.Htot += a.H;
        if (a.el === "O" || a.el === "N" || a.el === "S") exchangeable++;
      }
    });

    // ساخت توصیف محیط‌ها
    const cEnvList = [];
    carbonClasses.forEach(cid => {
      const members = atoms.map((a, k) => ({ a, k })).filter(x => cls[x.k] === cid && x.a.el === "C");
      const rep = members[0].a;
      cEnvList.push({ count: members.length, H: rep.H, arom: rep.arom, kind: rep.H === 3 ? "CH₃" : rep.H === 2 ? "CH₂" : rep.H === 1 ? "CH" : "C چهارتایی" });
    });
    const hEnvList = [];
    protonClasses.forEach((v, cid) => {
      const label = v.el === "C" ? (v.Htot / v.atoms === 3 ? "CH₃" : v.Htot / v.atoms === 2 ? "CH₂" : "CH") : (v.el === "O" ? "OH" : v.el === "N" ? "NH" : "SH");
      hEnvList.push({ count: v.atoms, Htot: v.Htot, kind: label, exch: (v.el !== "C") });
    });

    const totalH = atoms.reduce((s, a) => s + (a.H || 0), 0);
    const formulaAtoms = atoms.reduce((m, a) => { m[a.el] = (m[a.el] || 0) + 1; return m; }, {});
    const diastereotopic = flagDiastereotopicRisk(mol, cls);

    return {
      carbons: carbonClasses.size,
      protons: protonClasses.size,
      exchangeableEnvs: exchangeable,
      cEnvList, hEnvList,
      totalC: atoms.filter(a => a.el === "C").length,
      totalH,
      formulaAtoms,
      formula: molecularFormula(formulaAtoms, totalH),
      dbe: degreeOfUnsaturation(formulaAtoms, totalH),
      isotopePattern: halogenIsotopePattern(formulaAtoms),
      diastereotopicRisk: diastereotopic
    };
  }

  /* ---------- چیدمان نیرو-محور + رنگ‌بندی تقارن (برای دیاگرام SVG تقارن) ---------- */
  function symmetryLayout(smi) {
    const mol = computeHydrogens(parseSMILES(smi));
    const { atoms, bonds } = mol;
    if (!atoms.length) return { error: "ساختار SMILES خوانده نشد." };
    const cls = refineClasses(mol);
    const n = atoms.length;
    // مقداردهی اولیهٔ دایره‌ای
    const pos = atoms.map((_, i) => ({
      x: Math.cos((2 * Math.PI * i) / n) * 100,
      y: Math.sin((2 * Math.PI * i) / n) * 100
    }));
    const L = 60;          // طول ایده‌آل پیوند
    const kRep = 26000;    // ضریب دافعه
    const kSpr = 0.06;     // ضریب فنر
    for (let it = 0; it < 320; it++) {
      const f = pos.map(() => ({ x: 0, y: 0 }));
      // دافعهٔ کولنی بین همهٔ زوج‌ها
      for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
        let dx = pos[i].x - pos[j].x, dy = pos[i].y - pos[j].y;
        let d2 = dx * dx + dy * dy || 0.01, d = Math.sqrt(d2);
        const rep = kRep / d2;
        const ux = dx / d, uy = dy / d;
        f[i].x += ux * rep; f[i].y += uy * rep;
        f[j].x -= ux * rep; f[j].y -= uy * rep;
      }
      // کشش فنری روی پیوندها
      bonds.forEach(b => {
        let dx = pos[b.b].x - pos[b.a].x, dy = pos[b.b].y - pos[b.a].y;
        let d = Math.sqrt(dx * dx + dy * dy) || 0.01;
        const spr = (d - L) * kSpr;
        const ux = dx / d, uy = dy / d;
        f[b.a].x += ux * spr; f[b.a].y += uy * spr;
        f[b.b].x -= ux * spr; f[b.b].y -= uy * spr;
      });
      const damp = 0.85;
      for (let i = 0; i < n; i++) {
        pos[i].x += Math.max(-20, Math.min(20, f[i].x)) * damp * 0.15;
        pos[i].y += Math.max(-20, Math.min(20, f[i].y)) * damp * 0.15;
      }
    }
    // کلاس‌ها را به شناسهٔ فشرده (۰..k) نگاشت می‌کنیم
    const uniq = [...new Set(cls)];
    const classId = cls.map(c => uniq.indexOf(c));
    const outAtoms = atoms.map((a, i) => ({
      el: a.el, H: a.H, arom: a.arom, x: pos[i].x, y: pos[i].y, classId: classId[i]
    }));
    // شمارش محیط‌ها برای افسانهٔ رنگ (فقط اتم‌های سنگین)
    const legend = [];
    uniq.forEach((c, ci) => {
      const members = atoms.map((a, i) => ({ a, i })).filter(x => classId[x.i] === ci);
      const rep = members[0].a;
      legend.push({
        classId: ci, count: members.length, el: rep.el, H: rep.H, arom: rep.arom,
        kind: rep.el === "C" ? (rep.H === 3 ? "CH₃" : rep.H === 2 ? "CH₂" : rep.H === 1 ? "CH" : "C") : rep.el
      });
    });
    return { atoms: outAtoms, bonds, legend, nClasses: uniq.length };
  }

  root.Structure = {
    parseSMILES, computeHydrogens, refineClasses, countEnvironments,
    degreeOfUnsaturation, molecularFormula, halogenIsotopePattern, flagDiastereotopicRisk,
    symmetryLayout
  };
  if (typeof module !== "undefined" && module.exports) module.exports = root.Structure;
})(typeof window !== "undefined" ? window : globalThis);