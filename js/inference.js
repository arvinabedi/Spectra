/* =====================================================================
   موتور استنتاج ساختار — Inference Engine
   این ماژول «مغز» نرم‌افزار است:
     • استخراج فرمول و IHD
     • جمع‌آوری شواهد طیفی از حالت برنامه
     • مونتاژ واقعی ساختار از بلوک‌های سازنده (نظریه گراف ساده‌شده)
     • تطبیق با مولکول‌های مرجع
     • تشخیص تناقض طیفی
     • رتبه‌بندی کاندیدها
   قابل اجرا هم در مرورگر (window) و هم در Node (module.exports) برای تست.
   ===================================================================== */
(function (root) {
  const DB = root.DB || (typeof require !== "undefined" ? require("../data/database.js") : null);

  /* ---------- ابزار اتمی ---------- */
  function emptyAtoms() { return {}; }
  function addAtoms(a, b, sign = 1) {
    const r = Object.assign({}, a);
    for (const k in b) r[k] = (r[k] || 0) + sign * b[k];
    return r;
  }
  function atomsEqual(a, b) {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    for (const k of keys) if ((a[k] || 0) !== (b[k] || 0)) return false;
    return true;
  }
  function atomsMass(a) {
    let m = 0; for (const k in a) m += (DB.atomicMass[k] || 0) * a[k]; return m;
  }
  function formulaString(a) {
    const order = ["C", "H", "N", "O", "F", "Cl", "Br", "I", "S", "P"];
    let s = "";
    for (const el of order) if (a[el]) s += el + (a[el] > 1 ? a[el] : "");
    return s || "—";
  }
  // تجزیه رشته فرمول مثل "C8H8O2" به شیء اتمی
  function parseFormula(str) {
    const out = {}; const re = /([A-Z][a-z]?)(\d*)/g; let m;
    while ((m = re.exec(str)) !== null) {
      if (!m[1]) continue;
      out[m[1]] = (out[m[1]] || 0) + (m[2] ? parseInt(m[2]) : 1);
    }
    return out;
  }

  /* ---------- ۱. استخراج فرمول از جرم یا اتم‌های مستقیم ----------
     قاعده ۱۳ خام برای ترکیبات غیراشباع/آروماتیک فرمول نامعتبر (H بیش از حد،
     IHD منفی) می‌دهد. اینجا همه فرمول‌های سازگار با جرم را می‌شماریم و
     فقط معتبرها (ظرفیت درست، IHD ≥ ۰) را نگه می‌داریم — دقیقاً کاری که یک
     نرم‌افزار MS واقعی پیش از HRMS انجام می‌دهد. */
  function massToFormulas(mass, n = 0, o = 0, halType = "none", halCount = 0) {
    const hMass = { Cl: 35, Br: 79, F: 19, I: 127 };
    const x = halType !== "none" ? halCount : 0;
    let eff = mass - n * 14 - o * 16 - (x ? hMass[halType] * halCount : 0);
    if (eff < 12) return { error: "جرم هترواتم‌ها با جرم کل هم‌خوان نیست.", list: [] };
    const list = [];
    for (let c = 1; c <= Math.floor(eff / 12); c++) {
      const h = eff - 12 * c;
      if (h < 0) continue;
      const maxH = 2 * c + 2 + n - x;      // بیشینه هیدروژن ممکن (ظرفیت)
      if (h > maxH) continue;
      const ihd = c + 1 - (h + x) / 2 + n / 2;
      if (ihd < 0) continue;
      if (Math.abs(ihd - Math.round(ihd)) > 1e-9) continue; // IHD باید صحیح باشد
      const atoms = { C: c, H: h };
      if (n) atoms.N = n;
      if (o) atoms.O = o;
      if (x) atoms[halType] = halCount;
      list.push({ atoms, formula: formulaString(atoms), mass, ihd,
        nitrogenRule: nitrogenCheck(mass, n), isAromaticLikely: ihd >= 4 });
    }
    // مرتب‌سازی: نزدیک به آروماتیک/معقول بالاتر — کمترین انحراف H از حالت متعارف
    list.sort((a, b) => plausibility(b) - plausibility(a));
    return { error: null, list };
  }
  function plausibility(f) {
    const c = f.atoms.C, h = f.atoms.H || 0;
    // ترکیب‌های واقعی معمولاً نسبت H/C بین ~۱ تا ۲.۵ دارند
    const ratio = h / c;
    let s = 10 - Math.abs(ratio - 1.6) * 4;   // جریمه انحراف از نسبت متعارف
    if (f.ihd >= 4) s += 1;                    // احتمال آروماتیک
    return s;
  }
  function nitrogenCheck(mass, n) {
    const massOdd = mass % 2 !== 0, nOdd = n % 2 !== 0;
    if (massOdd !== nOdd) return "conflict";
    return "ok";
  }
  // سازگاری قدیمی: بهترین فرمول از جرم
  function deriveFromMass(mass, n = 0, o = 0, halType = "none", halCount = 0) {
    const r = massToFormulas(mass, n, o, halType, halCount);
    if (r.error) return { error: r.error };
    if (!r.list.length) return { error: "هیچ فرمول معتبری برای این جرم یافت نشد." };
    const best = r.list[0];
    best.alternatives = r.list.slice(1, 4);
    return best;
  }
  function deriveFromAtoms(atoms, providedMass) {
    return finalizeFormula(atoms, providedMass || atomsMass(atoms));
  }
  function finalizeFormula(atoms, mass) {
    const c = atoms.C || 0, h = atoms.H || 0, n = atoms.N || 0;
    const x = (atoms.F || 0) + (atoms.Cl || 0) + (atoms.Br || 0) + (atoms.I || 0);
    const ihd = c + 1 - (h + x) / 2 + n / 2;
    return { atoms, formula: formulaString(atoms), mass, ihd,
      nitrogenRule: nitrogenCheck(mass, n), isAromaticLikely: ihd >= 4 };
  }

  /* ---------- ۲. جمع‌آوری شواهد ---------- */
  // state: شیء کلیدی → بولین/مقدار، از store برنامه می‌آید
  function collectEvidence(state) {
    const set = new Set();
    for (const k in state) if (state[k] === true) set.add(k);
    // شواهد مشتق از ورودی‌های عددی/متنی
    if (state.msFragments) {
      String(state.msFragments).split(",").map(s => s.trim()).forEach(f => {
        const fr = DB.ms.fragments[f];
        if (!fr) return;
        set.add(fr.id);
        // یک m/z می‌تواند چند یونِ هم‌جرمِ متفاوت باشد (مثلاً ۱۰۵ = بنزویل یا
        // C₈H₉⁺ بنزیلی). همهٔ تفسیرها به‌عنوان شاهد وارد می‌شوند و تفکیکِ
        // نهایی به IR/¹³C سپرده می‌شود؛ وگرنه امضای مراجعی که به تفسیر دوم
        // اشاره می‌کنند هرگز کامل نمی‌شد.
        (fr.alts || []).forEach(a => set.add(a.id));
      });
    }
    return set;
  }

  /* ---------- ۳. تشخیص هسته عاملی از شواهد ---------- */
  function detectCore(ev) {
    // بالاترین اولویت: تست‌های کلاسیک قطعی (شیمی تر)
    if (ev.has("wet_tollens_pos")) return "aldehyde";               // آینه نقره = آلدهید
    if (ev.has("wet_hydroxamic_pos")) return "ester_co";            // هیدروکسامیک = استر
    if (ev.has("wet_sol_a1")) return "cooh";                        // محلول در NaHCO₃ = اسید
    if (ev.has("wet_dnp_pos") && !ev.has("ir_oh_acid")) return "ketone"; // DNP بدون اسید = کربونیل کتونی
    if (ev.has("wet_fecl3_pos")) return "hydroxyl";                 // FeCl₃ بنفش = فنول
    if (ev.has("wet_hinsberg_1") || ev.has("wet_sol_b")) return "amine1";
    // سپس امضاهای دستگاهی
    if (ev.has("ir_oh_acid") || ev.has("h_acid")) return "cooh";
    if (ev.has("ir_aldehyde") || ev.has("h_ald")) return "aldehyde";
    // افزودهٔ فاز ۹: گروه‌های عاملی که پیش‌تر امضای اختصاصی نداشتند
    if (ev.has("ir_isocyanate")) return "isocyanate";
    if (ev.has("ir_urea")) return "urea";
    if (ev.has("ir_acidcl")) return "acidchloride";
    if (ev.has("ir_anhydride")) return "anhydride";
    if (ev.has("ir_ester_aryl")) return "ester_co";
    if (ev.has("ir_co_amide") || (ev.has("c_ester") && ev.has("ir_nh"))) return "amide";
    if (ev.has("ir_co_ester") || (ev.has("c_ester") && ev.has("ir_co_single"))) return "ester_co";
    if (ev.has("ir_co_ketone") || ev.has("c_ketone")) return "ketone";
    if (ev.has("ir_triple_cn")) return "nitrile";
    if (ev.has("ir_nitro")) return "nitro";
    if (ev.has("ir_oh_alc")) return "hydroxyl";
    return null;
  }

  /* ---------- ۴. موتور مونتاژ ساختار ---------- */
  function block(id) { return DB.blocks.find(b => b.id === id); }

  function assemble(formulaObj, ev, obs) {
    const target = formulaObj.atoms;
    const targetIHD = formulaObj.ihd;
    const candidates = [];

    // استخر بلوک‌های ترمینال و لینکر برای امتحان
    const confirmed = DB.blocks.filter(b => b.evidence.some(e => ev.has(e)));
    const genericTerminals = ["methyl", "ethyl", "npropyl", "isopropyl", "tbutyl",
      "phenyl", "benzyl", "hydroxyl", "methoxy", "amine1", "chloro", "bromo",
      "nitrile", "aldehyde", "cooh", "amide", "nitro", "vinyl", "tolyl_p", "acyl",
      "cf3", "acetoxy", "pyridin_3yl", "furan_2yl"]
      .map(block).filter(Boolean);
    const linkers = ["ketone", "ester_co", "ether_o", "phenylene_p"].map(block);
    const repeatLinker = block("ch2"); // لینکر تکرارپذیر برای زنجیره‌های ۴ و ۵ بلوکی

    // مجموعه ترمینال‌ها = تاییدشده‌ها + عمومی‌ها (یکتا)
    const termPool = uniqueBlocks([...confirmed.filter(b => b.kind === "terminal"), ...genericTerminals]);
    const coreHint = detectCore(ev);

    const seen = new Set();
    function tryCandidate(chain) {
      // chain: آرایه بلوک‌ها به‌ترتیب پیوند خطی
      // اعتبار ظرفیت: انتها ≥۱ اسلات، میانی‌ها ≥۲
      for (let i = 0; i < chain.length; i++) {
        const need = (i === 0 || i === chain.length - 1) ? 1 : 2;
        if (chain[i].slots < need) return;
      }
      let atoms = emptyAtoms(), ihd = 0;
      chain.forEach(b => { atoms = addAtoms(atoms, b.atoms); ihd += b.ihd; });
      if (!atomsEqual(atoms, target)) return;
      if (Math.abs(ihd - targetIHD) > 0.001) return;
      const key = canonicalKey(chain);
      if (seen.has(key)) return; seen.add(key);
      candidates.push(scoreCandidate(chain, ev, coreHint, formulaObj, obs));
    }

    // الگو ۱: تک‌بلوک (مثلاً خودِ یک گروه بزرگ) — نادر
    // الگو ۲: دو بلوک ترمینال مستقیم (R–R')
    for (let i = 0; i < termPool.length; i++)
      for (let j = i; j < termPool.length; j++)
        tryCandidate([termPool[i], termPool[j]]);

    // الگو ۳: ترمینال – لینکر – ترمینال (ترتیب مهم برای لینکرهای نامتقارن)
    for (const L of linkers) {
      for (let i = 0; i < termPool.length; i++)
        for (let j = 0; j < termPool.length; j++)
          tryCandidate([termPool[i], L, termPool[j]]);
    }

    /* الگو ۴ (زنجیرهٔ ۴بلوکی): ترمینال-CH₂-CH₂-ترمینال — دی‌هالیدها/دی‌نیتریل‌ها
       رفع باگ: گیت قبلی target.C >= 4 بود، اما این الگو فقط به دو کربنِ
       لینکرهای CH₂ نیاز دارد. در نتیجه ۱،۲-دی‌برمواتان (C2H4Br2) و
       ۱،۲-دی‌کلرواتان هیچ کاندیدی نمی‌گرفتند — با آن‌که در بانک فیلد
       هستند و در یادداشت‌های همین فایل به‌عنوان نمونهٔ صحت‌سنجی‌شده ذکر
       شده‌اند. گیت درست «حداقل کربن لازم برای دو CH₂» است. تطابق دقیق
       فرمول و IHD در tryCandidate هر کاندید نامعتبر را حذف می‌کند، پس
       شل‌کردن گیت کاندید کاذب نمی‌سازد. */
    if ((target.C || 0) >= 2) {
      for (let i = 0; i < termPool.length; i++)
        for (let j = 0; j < termPool.length; j++)
          tryCandidate([termPool[i], repeatLinker, repeatLinker, termPool[j]]);
    }

    // الگو ۵ (زنجیرهٔ ۵بلوکی): ترمینال-لینکر-CH₂-لینکر-ترمینال — دی‌استرهای مالونات‌مانند
    // (همان اصلاح گیت: کمینهٔ کربن لازم یک CH₂ است، نه ۵)
    if ((target.C || 0) >= 1) {
      for (const L of linkers) {
        for (let i = 0; i < termPool.length; i++)
          for (let j = 0; j < termPool.length; j++)
            tryCandidate([termPool[i], L, repeatLinker, L, termPool[j]]);
      }
    }

    // مرتب‌سازی نزولی بر اساس امتیاز
    candidates.sort((a, b) => b.score - a.score);
    // حذف کاندیدهای بسیار ضعیف اگر کاندید قوی داریم
    return candidates.slice(0, 8);
  }

  function uniqueBlocks(arr) {
    const seen = new Set(); const out = [];
    for (const b of arr) if (b && !seen.has(b.id)) { seen.add(b.id); out.push(b); }
    return out;
  }
  function canonicalKey(chain) {
    // برای لینکرهای متقارن، معکوس زنجیره یکسان است (طول ۳ و ۵ هم پوشش داده می‌شود)
    const ids = chain.map(b => b.id);
    const rev = [...ids].reverse();
    const symLinkers = new Set(["ketone", "ether_o", "phenylene_p", "ch2"]);
    if ((chain.length === 3 || chain.length === 5) && symLinkers.has(chain[Math.floor(chain.length / 2)].id)) {
      return [ids, rev].map(a => a.join(">")).sort()[0];
    }
    if (chain.length === 2 || chain.length === 4) return [ids, rev].map(a => a.join(">")).sort()[0];
    return ids.join(">");
  }

  /* ---------- وزن شاهد ----------
     یک تست کلاسیک قطعی (شیمی تر) وزن به‌مراتب بالاتری از یک پیک دستگاهی
     دارد؛ این دقیقاً همان اولویتی است که یک شیمیدان در آزمایشگاه قائل می‌شود. */
  function evidenceWeight(e) {
    if (e.indexOf("wet_") === 0) return 8;   // تست آزمایشگاهی کلاسیک (قطعی)
    if (e.indexOf("ms_") === 0) return 4;    // قطعه جرمی مشخص
    return 3;                                 // پیک/ناحیه دستگاهی معمول
  }

  /* ---------- ماژول تقارن: پیش‌بینی تعداد پیک ¹³C از گرافِ اتمی ----------
     نسخهٔ پیشین محیط‌ها را بلوک‌به‌بلوک از DB.blockCarbonEnvCount جمع
     می‌زد و اگر آرایهٔ chain آینه‌ای بود نصف می‌کرد. آن روش نمی‌توانست
     درست باشد: تقارن خاصیتِ کلِ مولکول است نه جمعِ خاصیتِ قطعه‌ها، و
     «آینه‌بودنِ آرایه» هم تقارنِ واقعی نیست — پارا-زایلن و اورتو-زایلن
     آرایهٔ یکسانی دارند ولی هر دو چهار محیط دارند، در حالی‌که آرایهٔ
     [methyl, phenylene_p, methyl] آینه‌ای است و [methyl, benzene_124,…]
     نه. سنجش هم همین را نشان داد: ۳۶٪ دقیق، و در ۶۳ ترکیب از ۱۶۴
     کم‌تر از واقعیت — که بدترین جهتِ خطاست، چون شاخهٔ «غیرممکن»
     (score -= 10) دقیقاً وقتی می‌گیرد که پاسخِ درست است.

     حالا مولکول واقعاً سرِهم می‌شود: هر بلوک ساختارِ اتمیِ خودش را از
     DB.blockStructures می‌آورد، اتصال‌ها از topology(ref) خوانده
     می‌شوند (همان گرافی که bonds/ring/inferTopology می‌سازند)، و
     تقارن با Structure.refineClasses روی گرافِ اتمی شمرده می‌شود —
     همان موتوری که با RDKit راستی‌آزمایی شده و tools/test-structure.js
     قفلش کرده است.

     دو گاردِ صداقت، چون «نگفتن» از «غلط گفتن» بهتر است:
       ۱) هر بلوکی قالبِ اتمی نداشته باشد یا اتصال‌ها از ظرفیتِ اعلام‌شده
          بگذرند یا گراف تکه‌تکه باشد → پیش‌بینی نمی‌کنیم.
       ۲) اگر فرمولِ مولکولِ سرِهم‌شده با فرمولِ خودِ ترکیب نخواند، یعنی
          زنجیره همهٔ مولکول را توصیف نمی‌کند (۵۱ ترکیبِ «زنجیرهٔ ناقص»)
          → باز هم پیش‌بینی نمی‌کنیم.
     در هر دو حالت predictedC13 برابرِ null است و امتیازدهی سکوت می‌کند. */
  /* سقفِ تعدادِ چیدمان‌ها. بالاتر از این، ابهام آن‌قدر زیاد است که
     نتیجه ارزشِ محاسبه ندارد (و در UI هم باید سریع بماند). */
  const MAX_ASSEMBLIES = 1000;

  /* همهٔ جایگشت‌های یک آرایهٔ کوچک؛ cb روی هر جایگشت صدا زده می‌شود. */
  function permute(arr, cb, k) {
    k = k || 0;
    if (k === arr.length) { cb(arr); return; }
    for (let i = k; i < arr.length; i++) {
      [arr[k], arr[i]] = [arr[i], arr[k]];
      permute(arr, cb, k + 1);
      [arr[k], arr[i]] = [arr[i], arr[k]];
    }
  }

  function blockAssemblies(chain, ref) {
    const S = root.Structure;
    const ST = DB.blockStructures;
    if (!S || !S.parseSMILES || !ST) return null;
    const n = chain.length;
    if (!n) return null;

    const tpl = [];
    for (const b of chain) {
      const t = ST[b.id];
      if (!t || !t.smiles || !t.attach) return null;   // بلوکِ بدونِ قالب
      tpl.push(t);
    }

    let adj;
    if (ref) adj = topology(ref);
    else {
      adj = Array.from({ length: n }, () => []);
      for (let i = 0; i < n - 1; i++) { adj[i].push(i + 1); adj[i + 1].push(i); }
    }
    if (!adj || adj.length !== n) return null;

    // گرافِ بلوکی باید یک‌تکه باشد، وگرنه یک مولکول را توصیف نمی‌کند
    const seen = new Set([0]), stack = [0];
    while (stack.length) {
      const k = stack.pop();
      for (const j of adj[k]) if (!seen.has(j)) { seen.add(j); stack.push(j); }
    }
    if (seen.size !== n) return null;

    /* کدام همسایه به کدام اسلات؟ آرایهٔ chain این را نمی‌گوید، و
       حدس‌زدنش خطای واقعی می‌سازد:
         • دی‌اتیل مالونات [ethyl, ester_co, ch2, ester_co, ethyl] —
           اگر «همسایهٔ کم‌اندیس‌تر به اسلاتِ اول» بگیریم، استرِ چپ
           برعکسِ استرِ راست سرِهم می‌شود و مولکولِ متقارن نامتقارن
           درمی‌آید: ۷ محیط به‌جای ۴.
         • ۲،۶-دی‌برومو‌آنیلین [benzene_123, amine1, bromo, bromo] —
           آمین باید وسطِ الگوی ۱،۲،۳ بنشیند نه کنارش؛ ترتیبِ ثابت
           ۶ محیط می‌دهد به‌جای ۴.

       پس به‌جای حدس، همهٔ چیدمان‌های ممکن ساخته می‌شود. اگر همه به یک
       عدد برسند، آن عدد قطعی است؛ اگر نه، عددِ قطعی نداریم — ولی
       بیشینه‌شان همچنان معتبر است، چون هیچ چیدمانی نمی‌تواند بیش از آن
       محیط بدهد. امتیازدهی از همین برای آزمونِ «غیرممکن» استفاده می‌کند.

       چیدمان‌هایی که به نگاشتِ اتمیِ یکسان می‌رسند یکی شمرده می‌شوند،
       پس ch2 با attach:[0,0] فقط یک حالت دارد نه دو. */
    const choices = [];
    let combos = 1;
    for (let i = 0; i < n; i++) {
      const list = adj[i].slice().sort((a, b) => a - b);
      const att = tpl[i].attach;
      if (list.length !== att.length) return null;     // ظرفیتِ اعلام‌شده نمی‌خواند
      const opts = [], seenKey = new Set();
      permute(att.slice(), arr => {
        const key = arr.join(",");
        if (seenKey.has(key)) return;
        seenKey.add(key);
        const m = new Map();
        list.forEach((j, k) => m.set(j, arr[k]));
        opts.push(m);
      });
      choices.push(opts);
      combos *= opts.length;
      if (combos > MAX_ASSEMBLIES) return null;        // بیش از حدِ مبهم
    }

    /* اسکلتِ ثابت: اتم‌ها و پیوندهای درونِ خودِ بلوک‌ها، یک‌بار پارس
       می‌شود و برای هر چیدمان فقط کپیِ سبک گرفته می‌شود. */
    const base = [], innerBonds = [], off = [];
    for (let i = 0; i < n; i++) {
      const m = S.parseSMILES(tpl[i].smiles);
      off[i] = base.length;
      m.atoms.forEach(a => base.push(a));
      m.bonds.forEach(b => innerBonds.push({ a: b.a + off[i], b: b.b + off[i], order: b.order }));
    }

    const mols = [];
    const pick = new Array(n);
    (function walk(i) {
      if (mols.length > MAX_ASSEMBLIES) return;
      if (i === n) {
        const atoms = base.map(a => ({ el: a.el, arom: a.arom, charge: a.charge, hExplicit: a.hExplicit }));
        const bonds = innerBonds.slice();
        for (let x = 0; x < n; x++) {
          for (const y of adj[x]) {
            if (y <= x) continue;
            bonds.push({ a: off[x] + pick[x].get(y), b: off[y] + pick[y].get(x), order: 1 });
          }
        }
        mols.push(S.computeHydrogens({ atoms, bonds }));
        return;
      }
      for (const opt of choices[i]) { pick[i] = opt; walk(i + 1); }
    })(0);

    return mols.length ? mols : null;
  }

  function predictSymmetry(chain, ref) {
    const out = {
      mirror: false, predictedC13: null, predictedH1: null,
      maxC13: null, minC13: null, assemblies: 0, basis: "declined"
    };
    const S = root.Structure;
    const mols = blockAssemblies(chain, ref);
    if (!mols) { out.reason = "بدونِ قالبِ اتمی یا توپولوژیِ نامعتبر"; return out; }

    // فرمولِ همهٔ چیدمان‌ها یکی است، پس یک‌بار بررسی می‌شود
    const first = mols[0];
    const fa = first.atoms.reduce((m, a) => { m[a.el] = (m[a.el] || 0) + 1; return m; }, {});
    fa.H = (fa.H || 0) + first.atoms.reduce((s, a) => s + (a.H || 0), 0);
    if (ref && ref.formula && !atomsEqual(fa, parseFormula(ref.formula))) {
      out.reason = "زنجیره کلِ مولکول را توصیف نمی‌کند";
      out.assembled = formulaString(fa);
      return out;
    }

    const cCounts = [], hCounts = [];
    let nC = 0;
    mols.forEach(mol => {
      const cls = S.refineClasses(mol);
      const cSet = new Set(), hSet = new Set();
      nC = 0;
      mol.atoms.forEach((a, k) => {
        if (a.el === "C") { nC++; cSet.add(cls[k]); }
        if (a.H > 0) hSet.add(cls[k]);
      });
      cCounts.push(cSet.size);
      hCounts.push(hSet.size);
    });

    out.basis = "graph";
    out.assemblies = mols.length;
    out.formula = formulaString(fa);
    out.maxC13 = Math.max.apply(null, cCounts);
    out.minC13 = Math.min.apply(null, cCounts);
    /* عددِ قطعی فقط وقتی اعلام می‌شود که همهٔ چیدمان‌ها به آن برسند.
       اگر نه، minC13/maxC13 همچنان معتبرند و آزمونِ «غیرممکن» از
       maxC13 استفاده می‌کند — هیچ چیدمانی بیش از آن محیط نمی‌دهد. */
    if (out.maxC13 === out.minC13) {
      out.predictedC13 = out.maxC13;
      out.mirror = out.maxC13 < nC;
    } else {
      out.reason = "چیدمانِ استخلاف‌ها روی این زنجیره یکتا نیست";
    }
    /* محیط‌های ¹H واقعی. عمداً در امتیازدهی به کار نمی‌رود: آن‌چه دانشجو
       در طیف «می‌شمارد» سیگنالِ قابل‌تفکیک است نه محیطِ شیمیایی — حلقهٔ
       تک‌استخلافی معمولاً یک مولتی‌پلتِ ۵H دیده می‌شود نه سه سیگنال.
       همان تمایزی که DB.blockProtonEnvCount مدل می‌کند. */
    const hMax = Math.max.apply(null, hCounts), hMin = Math.min.apply(null, hCounts);
    if (hMax === hMin) out.predictedH1 = hMax;
    return out;
  }

  /* ---------- قیدهای اتصالِ برآمده از قطعات جرمی ----------
     یک قطعهٔ جرمی می‌گوید کدام بلوک به کدام بلوک چسبیده، نه فقط این‌که
     کدام بلوک هست. این تابع همان اطلاعات جهت‌دار را به امتیاز تبدیل
     می‌کند و تنها راهی است که موتور می‌تواند ایزومرهای هم‌بلوک (مثل
     اتیل بنزوات در برابر فنیل پروپانوات) را از هم جدا کند. */
  function connectivityScore(chain, ev) {
    const rules = DB.msConnectivityRules || [];
    const ids = chain.map(b => b.id);
    const has = (id) => ids.indexOf(id) !== -1;
    const adjacent = (a, b) => ids.some((x, i) =>
      (x === a && ids[i + 1] === b) || (x === b && ids[i + 1] === a));
    const precedes = (a, b) => ids.some((x, i) => x === a && ids[i + 1] === b);
    const ok = (cond) =>
      cond.present  ? cond.present.every(has) :
      cond.adjacent ? adjacent(cond.adjacent[0], cond.adjacent[1]) :
      cond.precedes ? precedes(cond.precedes[0], cond.precedes[1]) : false;

    let delta = 0;
    const explain = [];
    rules.forEach(r => {
      if (!ev.has(r.tag)) return;
      const satisfied = (r.satisfy || []).some(ok);
      if (satisfied) {
        delta += r.bonus || 0;
        explain.push({ tag: r.tag, fa: r.fa, verdict: "supports", note: r.note });
        return;
      }
      // جریمه فقط وقتی همهٔ بلوک‌های دخیل در کاندید حاضرند ولی آرایش،
      // تولید این قطعه را ناممکن می‌کند. اگر بلوکی غایب است، قطعه
      // می‌تواند از مسیر دیگری آمده باشد، پس سکوت می‌کنیم.
      // penalizeIf: اگر قاعده صریحاً گفته «حضور این بلوک‌ها برای جریمه کافی
      // است» همان را می‌سنجیم؛ وگرنه پیش‌فرض «حداقل دو بلوک دخیل حاضر باشد».
      const trigger = r.penalizeIf
        ? r.penalizeIf.every(has)
        : (r.involves || []).filter(has).length >= 2;
      if ((r.penalty || 0) > 0 && trigger) {
        delta -= r.penalty;
        explain.push({ tag: r.tag, fa: r.fa, verdict: "conflicts", note: r.note });
      }
    });
    return { delta, explain };
  }

  /* ---------- ۵. امتیازدهی کاندید ---------- */
  function scoreCandidate(chain, ev, coreHint, formulaObj, obs) {
    let score = 0;
    const explained = new Set();
    chain.forEach(b => b.evidence.forEach(e => { if (ev.has(e)) { score += evidenceWeight(e); explained.add(e); } }));
    // پاداش هماهنگی هسته
    if (coreHint && chain.some(b => b.id === coreHint)) score += 4;
    // پاداش تطبیق با مولکول مرجع
    const ids = chain.map(b => b.id).join(">");
    // نکته رفع باگ: r.chain هم برای همان مراجع «فقط‌کیفی» تعریف نشده؛
    // بدون بررسی r.chain، sameChain(undefined, ...) با خطای «Cannot read
    // properties of undefined (reading 'length')» کل مونتاژ را متوقف می‌کرد.
    const ref = DB.reference.find(r => r.chain && sameChain(r.chain, chain.map(b => b.id)));
    if (ref) score += 6;
    // جریمه بلوک‌های ناسازگار با شواهد قوی
    // اگر شاهد آلدهید قطعی داریم اما کاندید کتون دارد
    if ((ev.has("ir_aldehyde") || ev.has("h_ald")) && chain.some(b => b.id === "ketone")) score -= 5;

    /* --- سازگاری الگوی استخلاف حلقه ---
       رفع باگ: شواهد الگوی استخلاف (ir_para/h_para/ir_ortho/ir_meta در
       برابر ir_mono/h_ar_mono) در امتیازدهی هیچ نقشی نداشتند. نتیجه:
       برای ۴-متیل‌استوفنون (با شاهد پارا) کاندید «فنیل‌استون» که حلقهٔ
       تک‌استخلافی دارد رتبهٔ ۱ می‌گرفت — در حالی که حلقهٔ تک‌استخلافی
       اصلاً نمی‌تواند الگوی AA′BB′ پارا بدهد. */
    const MONO_RING = new Set(["phenyl", "benzyl"]);              // حلقهٔ تک‌استخلافی
    const MULTI_RING = new Set(["phenylene_p", "phenylene_o", "tolyl_p"]); // دو یا چنداستخلافی
    const hasMono = chain.some(b => MONO_RING.has(b.id));
    const hasMulti = chain.some(b => MULTI_RING.has(b.id));
    const evSubstituted = ev.has("ir_para") || ev.has("h_para") ||
                          ev.has("ir_ortho") || ev.has("ir_meta") ||
                          ev.has("ir_tri123") || ev.has("ir_tri124") || ev.has("ir_tri135");
    const evMono = ev.has("ir_mono") || ev.has("h_ar_mono");
    if (evSubstituted && hasMono && !hasMulti) score -= 8;   // شاهد چنداستخلافی، کاندید تک‌استخلافی
    if (evMono && hasMulti && !hasMono) score -= 8;           // شاهد تک‌استخلافی، کاندید چنداستخلافی

    // --- قیدهای اتصال از قطعات جرمی (تفکیک ایزومرهای هم‌بلوک) ---
    const conn = connectivityScore(chain, ev);
    score += conn.delta;

    // --- امتیازدهی تقارن: مقایسهٔ پیش‌بینیِ گرافی با شمارش واقعی کاربر ---
    /* وقتی predictedC13 برابرِ null است یعنی ماژول تقارن خودش اعلام کرده
       که این زنجیره را نمی‌تواند به مولکولِ کامل ترجمه کند. در آن حالت
       سکوت می‌کنیم؛ پیش از این با عددِ ناقصِ صفر مقایسه می‌شد و شاخهٔ
       «غیرممکن» به هر کاندیدی که کاربر عددِ ¹³C داده بود جریمه می‌زد. */
    const sym = predictSymmetry(chain, ref);
    if (obs && obs.c13Count) {
      if (sym.predictedC13 != null && obs.c13Count === sym.predictedC13) score += 8;
      // «غیرممکن» با بیشینهٔ چیدمان‌ها سنجیده می‌شود، پس حتی وقتی عددِ
      // قطعی نداریم هم این آزمون معتبر می‌ماند.
      else if (sym.maxC13 != null && obs.c13Count > sym.maxC13) score -= 10;
      else if (sym.predictedC13 != null && obs.c13Count < sym.predictedC13) score -= 3;
    }

    // پوشش شواهد (چند درصد شواهد بلوکی توضیح داده شد)
    const coverage = explained.size;
    return {
      chain, score, coverage, explained: [...explained], symmetry: sym,
      connectivity: conn.explain,
      formula: formulaString(chain.reduce((a, b) => addAtoms(a, b.atoms), {})),
      ref: ref ? { name: ref.name, en: ref.en, note: ref.note } : null,
      condensed: chainToCondensed(chain)
    };
  }
  function sameChain(a, b) {
    if (a.length !== b.length) return false;
    const eq = a.every((x, i) => x === b[i]);
    // برای زنجیره‌های دارای لینکر نامتقارن (استر)، جهت مهم است
    const asym = a.length === 3 && a[1] === "ester_co";
    if (asym) return eq;
    const rev = a.every((x, i) => x === b[b.length - 1 - i]);
    return eq || rev;
  }
  function chainToCondensed(chain) {
    return chain.map(b => b.en.replace(/^-|-$/g, "")).join("–");
  }

  /* ---------- ۵-الف. توپولوژیِ اتصالِ یک مرجع ----------
     مسئله‌ای که حل می‌کند: `chain` یک آرایهٔ مرتب است، پس «همسایگی» را با
     ترتیبِ آرایه می‌سنجیدیم. برای مولکولِ خطی درست است، ولی برای حلقهٔ
     استخلاف‌دار نه — و همین دو باگِ واقعی ساخت: ۱-فنیل‌اتانول (که
     هیدروکسیلش کنارِ حلقه افتاده بود) «فنول» خوانده شد، و
     ۲-متیل-۴-نیتروفنول برعکس «الکل»، چون OH در آرایه از حلقه دور بود.

     حالا هر مرجع می‌تواند اتصالِ واقعی را اعلام کند:
       bonds: [[0,1],[1,2],[1,5]]   فهرستِ صریحِ پیوندها (انشعاب هم می‌شود)
       ring: true                    میان‌بر: زنجیرهٔ خطی + بستنِ حلقه
     اگر هیچ‌کدام نبود، همان زنجیرهٔ خطی فرض می‌شود، پس همهٔ دادهٔ موجود
     بی‌تغییر کار می‌کند. */
  /* استنتاجِ توپولوژی از آرایهٔ خطی، با شمارشِ ظرفیتِ اتصالِ بلوک‌ها.
     چرا لازم است: آرایهٔ chain «توالیِ استخلاف‌ها» را می‌نویسد، نه اتصال را.
     خواندنِ سرِ‌به‌سر (۰-۱، ۱-۲، …) برای مولکولِ خطی درست است ولی روی حلقهٔ
     چنداستخلافی استخلافِ دوم را به استخلافِ اول می‌چسباند به‌جای حلقه.

     قاعده — همان چیزی که این آرایه‌ها با آن نوشته شده‌اند:
       • حلقه (اگر دقیقاً یکی باشد) قطبِ اتصال است و ظرفیتش نامحدود فرض
         می‌شود، چون بلوک‌های حلقه موقعیت‌های حلقه را مدل نمی‌کنند
         (phenyl با slots=1 در عمل سه استخلاف می‌گیرد).
       • بقیه به‌ترتیب خوانده می‌شوند و هرکدام به نزدیک‌ترین بلوکِ پیشین که
         ظرفیتِ آزاد دارد وصل می‌شود (پشته)، وگرنه به قطب.
         terminal=۱، linker=۲، branch=۳ ظرفیت دارند.

     نمونهٔ گویا — ۱-فنیل‌اتانول [phenyl, ch, hydroxyl, methyl]:
       ch به حلقه، هیدروکسیل به ch، و متیل هم به ch (که یک ظرفیتِ آزاد
       دارد) — یعنی Ph–CH(OH)CH₃. خواندنِ خطی متیل را به هیدروکسیل
       می‌بست و خواندنِ ستاره‌ایِ ساده به حلقه.

     محافظه‌کار است: بی‌حلقه یا چندحلقه‌ای، یا هر بلوکی که والدی پیدا نکند،
     یعنی زنجیره تقریبی است → null و بازگشت به خواندنِ خطی. */
  /* از فهرستِ یگانهٔ پایگاه خوانده می‌شود (DB.aromaticRingBlocks)؛ نسخهٔ
     درون‌خطی فقط پشتیبانِ حالتی است که فایلِ افزوده بارگذاری نشده باشد. */
  const RING_HUBS_FALLBACK = ["phenyl", "phenylene_p", "phenylene_o", "phenylene_m",
                              "tolyl_p", "naphthyl", "quinolinyl", "pyridin_3yl", "furan_2yl"];
  function ringHubs() {
    return (DB.aromaticRingBlocks || RING_HUBS_FALLBACK).concat(["benzyl"]);
  }
  function inferTopology(chain, isRing) {
    const n = chain.length;
    if (isRing || n < 3) return null;                  // حلقهٔ اعلام‌شده مسیرِ خودش را دارد
    const hubs = [];
    const RING_HUBS = ringHubs();
    chain.forEach((id, i) => { if (RING_HUBS.includes(id)) hubs.push(i); });
    if (hubs.length !== 1) return null;                // بی‌حلقه یا چندحلقه‌ای → مبهم
    const hub = hubs[0];
    const blockById = new Map((DB.blocks || []).map(b => [b.id, b]));
    const hubBlock = blockById.get(chain[hub]);
    if (!hubBlock) return null;
    /* ظرفیتِ قطب همان چیزی است که بلوک اعلام کرده، نه بی‌نهایت. همین قید
       تعیین‌کننده است: `phenyl` با slots=1 یعنی نویسندهٔ داده فقط یک
       استخلافِ حلقه در نظر داشته. اگر بیش از آن بخواهد به حلقه بچسبد،
       یعنی زنجیره تقریبی است و حدس‌زدن خطرناک.
       نمونهٔ واقعی: ۲-فنیل‌اتانول [phenyl, ethyl, hydroxyl]. بلوکِ ethyl
       انتهایی است و نمی‌تواند OH را بگیرد، پس OH به حلقه می‌افتاد و
       ترکیب «فنول» خوانده می‌شد — در حالی که الکلِ نوع اول است. با احترام
       به ظرفیتِ حلقه، استنتاج کنار می‌کشد و خواندنِ خطی (OH روی اتیل)
       که این‌جا درست است جای می‌گیرد. */
    let hubFree = hubBlock.slots || 1;
    const bonds = [];
    const stack = [];                       // نقاطِ اتصالِ باز: {i, free}
    for (let i = 0; i < n; i++) {
      if (i === hub) continue;
      while (stack.length && stack[stack.length - 1].free <= 0) stack.pop();
      const parent = stack.length ? stack[stack.length - 1] : null;
      if (parent) { parent.free -= 1; bonds.push([parent.i, i]); }
      else {
        if (hubFree <= 0) return null;      // حلقه جا ندارد → زنجیره تقریبی است
        hubFree -= 1;
        bonds.push([hub, i]);
      }
      const b = blockById.get(chain[i]);
      if (!b) return null;
      const slots = b.slots || 1;
      if (slots > 1) stack.push({ i, free: slots - 1 });
    }
    if (bonds.length !== n - 1) return null;
    return bonds;
  }

  const topoCache = new WeakMap();
  function topology(ref) {
    if (topoCache.has(ref)) return topoCache.get(ref);
    const chain = ref.chain || [];
    const n = chain.length;
    const adj = Array.from({ length: n }, () => []);
    const link = (a, b) => {
      if (a === b || a < 0 || b < 0 || a >= n || b >= n) return;
      if (adj[a].indexOf(b) < 0) adj[a].push(b);
      if (adj[b].indexOf(a) < 0) adj[b].push(a);
    };
    if (Array.isArray(ref.bonds) && ref.bonds.length) {
      ref.bonds.forEach(pair => { if (Array.isArray(pair)) link(pair[0], pair[1]); });
    } else {
      const inferred = inferTopology(chain, !!ref.ring);
      if (inferred) inferred.forEach(pair => link(pair[0], pair[1]));
      else {
        for (let i = 0; i < n - 1; i++) link(i, i + 1);      // خطیِ ساده
        if (ref.ring && n > 2) link(n - 1, 0);
      }
    }
    topoCache.set(ref, adj);
    return adj;
  }

  /* همسایه‌های یک بلوک، بر پایهٔ توپولوژی (نه ترتیبِ آرایه) */
  function neighboursOf(ref, blockId) {
    const chain = ref.chain || [];
    const adj = topology(ref);
    const out = new Set();
    chain.forEach((id, i) => {
      if (id !== blockId) return;
      (adj[i] || []).forEach(j => out.add(chain[j]));
    });
    return out;
  }

  /* ---------- ۵-ب. شواهد ضمنیِ یک مرجع (از بلوک‌ها و فرمول) ---------- */
  const impliedCache = new WeakMap();
  function impliedEvidence(ref) {
    if (impliedCache.has(ref)) return impliedCache.get(ref);
    const out = new Set();
    const chain = ref.chain || [];
    const map = DB.blockImpliedEvidence || {};
    chain.forEach(id => (map[id] || []).forEach(t => out.add(t)));

    // h_alpha وابسته به موقعیت است: فقط وقتی یک بلوک آلکیل در زنجیره
    // مجاور یک بلوک کربونیل باشد، پروتون ۱.۵–۲.۵ قطعی است.
    const alpha = DB.alphaCapableBlocks || [];
    const carbonyl = DB.carbonylBlocks || [];
    const adj = topology(ref);
    for (let i = 0; i < chain.length; i++) {
      if (!carbonyl.includes(chain[i])) continue;
      if ((adj[i] || []).some(j => alpha.includes(chain[j]))) { out.add("h_alpha"); break; }
    }
    // بلوک acyl (–COCH₃) خودش کربونیل و متیل آلفا را با هم دارد
    if (chain.includes("acyl")) out.add("h_alpha");

    // قواعدِ وابسته به همسایه: یک بلوک به‌تنهایی نمی‌تواند نتیجهٔ تست را
    // بگوید. مثلاً هیدروکسیل روی حلقهٔ آروماتیک فنول است (FeCl₃ بنفش) و
    // روی زنجیره الکل (تستِ لوکاس) — دو نتیجهٔ ناسازگار از یک بلوک.
    (DB.contextualEvidenceRules || []).forEach(rule => {
      const at = [];
      chain.forEach((id, i) => { if (id === rule.block) at.push(i); });
      if (!at.length) return;
      // همسایگی از گرافِ اتصال، نه از ترتیبِ آرایه
      const nb = neighboursOf(ref, rule.block);
      const touches = near => near.some(x => nb.has(x));
      // شکلِ چندحالته: نخستین حالتِ منطبق برنده است (مثلاً هیدروکسیل که
      // بر پایهٔ همسایه فنول/انول/الکل می‌شود و هر سه تستِ متفاوتی دارند)
      if (rule.cases) {
        const hit = rule.cases.find(cs => touches(cs.near || []));
        ((hit && hit.tags) || rule.elseTags || []).forEach(t => out.add(t));
        return;
      }
      // شکلِ دوحالتهٔ ساده
      (touches(rule.near || []) ? (rule.tags || []) : (rule.elseTags || [])).forEach(t => out.add(t));
    });

    // شواهد برخاسته از فرمول (تست عنصری لاسِن، اثر اتم سنگین)
    const fmap = DB.formulaImpliedEvidence || {};
    if (ref.formula) {
      const atoms = parseFormula(ref.formula);
      Object.keys(fmap).forEach(el => { if (atoms[el]) fmap[el].forEach(t => out.add(t)); });
    }
    // تگ‌هایی که همین‌حالا در امضای صریح هستند، دوباره شمرده نشوند
    (ref.signature || []).forEach(t => out.delete(t));
    impliedCache.set(ref, out);
    return out;
  }

  /* ---------- ۶. تطبیق مولکول مرجع (مستقل از مونتاژ) ---------- */
  /* دامنهٔ جست‌وجو: پیش‌تر فقط DB.reference بود، پس ۱۵۰+ ترکیبِ بانکِ سوالات
     (DB.fieldProblems) هرگز به‌عنوان کاندید ظاهر نمی‌شدند و تنها با جست‌وجوی
     «فرمولِ دقیق» پیدا می‌شدند. حالا که ابزارِ derive-signatures امضا و
     زنجیرهٔ ماشین‌خوان به آن‌ها داده، وارد همان رتبه‌بندی می‌شوند. دِدآپ بر
     پایهٔ نام انگلیسی انجام می‌شود چون بخشی از بانک در هر دو فهرست هست. */
  function searchPool() {
    const pool = [], seen = new Set();
    (DB.reference || []).forEach(r => {
      const k = r.en || r.name;
      if (k && seen.has(k)) return;
      if (k) seen.add(k);
      pool.push(r);
    });
    (DB.fieldProblems || []).forEach(p => {
      const k = p.en || p.name;
      if (k && seen.has(k)) return;
      if (k) seen.add(k);
      if (p.signature && p.signature.length) pool.push(p);
    });
    return pool;
  }

  // فقط تگ‌هایی که پیشوندِ شناخته‌شدهٔ طیفی دارند شمرده می‌شوند؛ حالتِ رابط
  // (سوئیچ‌ها و پرچم‌های نمایش) نباید مخرجِ «توضیح‌داده‌شده» را باد کند.
  const SIGNAL_PREFIX = /^(ir|c|h|ms|wet|dept|uv)_/;

  /* وزنِ تشخیصیِ هر تگ (IDF)
     مسئله: همهٔ شواهد هم‌ارزش نیستند. «O–H اسیدی» را ده‌ها ترکیبِ کتابخانه
     دارند، اما «خمشِ OOP سیس» فقط یکی. وقتی هر برخورد یک واحد شمرده می‌شد،
     یک شاهدِ نادر و قاطع به‌اندازهٔ یک شاهدِ عمومی می‌ارزید — و مثلاً برای
     طیفِ مالئیک اسید، بنزوئیک اسید (با امضای کوتاه و عمومی) بالاتر می‌نشست.
     وزن = log(N / df) با هموارسازی: هرچه تگ نادرتر، تشخیصی‌تر. */
  let idfCache = null;
  function idf() {
    if (idfCache) return idfCache;
    const df = new Map();
    const pool = searchPool();
    pool.forEach(r => new Set(r.signature || []).forEach(t => df.set(t, (df.get(t) || 0) + 1)));
    const N = Math.max(1, pool.length);
    idfCache = { N, weight: t => Math.log((N + 1) / ((df.get(t) || 0) + 1)) + 0.25 };
    return idfCache;
  }
  function sumW(tags) {
    const w = idf().weight;
    let t = 0;
    tags.forEach(x => { t += w(x); });
    return t;
  }

  function matchReferences(ev, formulaObj) {
    const observed = [...ev].filter(t => SIGNAL_PREFIX.test(t));
    const observedCount = observed.length;
    const observedWeight = sumW(observed);
    const results = searchPool().map(r => {
      // نکته رفع باگ: برخی مراجع (مثل TABLE2_REFS در field-data.js) عمداً
      // بدون آرایه signature ثبت شده‌اند چون فقط توصیف کیفی دارند، نه
      // امضای طیفی دقیق. قبلاً اینجا فرض می‌شد signature همیشه وجود دارد
      // و r.signature.filter(...) روی این ورودی‌ها بلافاصله خطای
      // «Cannot read properties of undefined» می‌داد و کل Inference.analyze
      // (و در نتیجه دکمهٔ «ساخت و رتبه‌بندی ساختارها») را متوقف می‌کرد.
      const sig = r.signature || [];
      const hit = sig.filter(s => ev.has(s));

      // امتیازدهی: پیش‌تر فقط «کسری از امضا» بود (hit/sig.length) و همین،
      // مراجعِ دارای امضای بلند را نظام‌مند جریمه می‌کرد. مثال واقعی:
      // برای طیفِ سالیسیل‌آلدهید، خودِ سالیسیل‌آلدهید با ۷ برخورد از ۱۵
      // (۰.۴۷) پایین‌ترِ استالدهید با ۲ از ۴ (۰.۵۰) می‌نشست — یعنی هرچه
      // دادهٔ یک ترکیب کامل‌تر بود، شانسِ کمتری داشت.
      // اکنون میانگینِ هماهنگِ دو سنجه گرفته می‌شود:
      //   coverage = چه کسری از امضای مرجع دیده شده
      //   explained = چه کسری از مشاهداتِ کاربر با این مرجع توضیح داده می‌شود
      // مرجعی که همهٔ مشاهدات را توضیح دهد بالا می‌آید، حتی اگر امضایش بلند
      // باشد؛ و مرجعِ کم‌امضا که تنها بخشی را توضیح می‌دهد بالا نمی‌آید.
      const wHit = sumW(hit);
      const coverage = sig.length ? wHit / sumW(sig) : 0;
      const explained = observedWeight ? wHit / observedWeight : 0;
      let score = (coverage + explained) ? (2 * coverage * explained) / (coverage + explained) : 0;

      // شواهد ضمنی (فاز تکمیل پایگاه): ناحیه‌های پایهٔ ¹H/¹³C و تست‌های
      // عنصری که از بلوک‌های زنجیره و فرمول مرجع نتیجه می‌شوند. اگر این‌ها
      // را داخل sig می‌ریختیم مخرج بزرگ می‌شد و نزدنِ یک تیک بدیهی امتیاز
      // مرجعِ درست را پایین می‌آورد؛ پس به‌صورت پاداشِ سقف‌دار اضافه می‌شوند.
      const implied = impliedEvidence(r);
      const impliedHit = [...implied].filter(t => ev.has(t)).length;
      if (implied.size) score += 0.3 * (impliedHit / implied.size);
      /* چرا شمارشِ پیکِ ¹³C در رتبه‌بندیِ مراجع دخالت نمی‌کند:
         روی کاغذ این تنها سنجه‌ای است که ایزومرهای هم‌بلوک را جدا می‌کند
         (اورتو-زایلن چهار محیط، متا-زایلن پنج). اما دقتِ predictSymmetry
         روی همین کتابخانه اندازه‌گیری شد: ۳۷٪ تطابقِ دقیق و ۶۵٪ با خطای ±۱،
         و از ۱۶۷ نمونه در ۵۹ مورد کم‌تر از واقعیت پیش‌بینی می‌کند
         (فلوئورنون: پیش‌بینی ۱، واقعیت ۷). چون جریمهٔ «مشاهده > پیش‌بینی»
         دقیقاً در همین موارد فعال می‌شود، کاربری که عددِ درست را وارد کند
         پاسخِ درست را پایین می‌برد — بدتر از نداشتنِ این سنجه.
         ریشه همان محدودیتِ زنجیرهٔ خطی است (حلقه و انشعاب را نمی‌تواند
         بیان کند)؛ تا وقتی تقارن از گرافِ اتصال محاسبه نشود، این عدد
         نباید در امتیاز دخالت کند. شمارشِ پیک هنوز به موتور می‌رسد و
         بررسیِ تناقضِ «پیک بیش از کربنِ فرمول» را فعال می‌کند — آن یکی
         روی فرمول حساب می‌شود، نه روی این پیش‌بینی، پس قابل‌اعتماد است. */

      // اگر فرمول داریم و می‌خواند، پاداش
      if (formulaObj && formulaObj.formula && r.formula) {
        const same = atomsEqual(parseFormula(r.formula), formulaObj.atoms);
        if (same) score += 0.5;
        else if (Object.keys(formulaObj.atoms).length) score -= 0.15;
      }
      return { ref: r, score, hit: hit.length, total: sig.length,
               impliedHit, impliedTotal: implied.size };
      // دروازهٔ نمایش: پیش‌تر فقط hit>0 بود، یعنی کاربری که هنوز هیچ تیک
      // «تشخیصی» نزده و تنها ناحیه‌های پایه را علامت زده، فهرست خالی می‌گرفت.
    }).filter(x => x.hit > 0 || x.impliedHit > 0);
    results.sort((a, b) => b.score - a.score);
    return results.slice(0, 5);
  }

  /* ---------- ۷. تشخیص تناقض طیفی ---------- */
  function detectContradictions(ev, formulaObj, obs) {
    const c = [];
    if (obs && obs.c13Count && formulaObj && formulaObj.atoms && obs.c13Count > (formulaObj.atoms.C || 0))
      c.push(`تعداد پیک ¹³C مشاهده‌شده (${obs.c13Count}) از تعداد کل کربن‌های فرمول (${formulaObj.atoms.C}) بیشتر است — این از نظر شیمیایی غیرممکن است؛ فرمول یا شمارش پیک را بازبینی کنید.`);
    if (ev.has("ir_aldehyde") && !ev.has("h_ald"))
      c.push("IR رزونانس فرمی (آلدهید) را نشان می‌دهد اما پروتون آلدهیدی (۹–۱۰ ppm) غایب است؛ احتمالاً پیک IR اورتون است، نه فرمیل.");
    if (ev.has("h_ald") && !ev.has("ir_aldehyde") && !ev.has("c_ketone"))
      c.push("پیک ۹–۱۰ ppm بدون تأیید IR/¹³C؛ ممکن است پروتون آروماتیک دی‌شیلد باشد نه آلدهید.");
    if (ev.has("ir_co_ester") && ev.has("ir_co_ketone"))
      c.push("هم‌زمان استر و کتون تیک خورده — یک پیک کربونیل نمی‌تواند هر دو باشد؛ عدد دقیق فرکانس را بازبینی کنید.");
    if (ev.has("ir_para") && ev.has("h_ar_mono"))
      c.push("IR پارا-دواستخلافی را می‌گوید اما ¹H الگوی تک‌استخلافی (5H) دارد — تناقض در الگوی استخلاف.");
    if (ev.has("ir_para") && ev.has("h_ar_ortho_co"))
      c.push("IR الگوی جانشینی پارا را نشان می‌دهد اما ¹H الگوی پروتون آروماتیک مجاور کربونیل به‌سبک ارتو (استخلاف ۱،۲) دارد — دو الگوی جانشینی هم‌زمان ممکن نیست؛ یکی از دو مشاهده را بازبینی کنید.");
    if (ev.has("ir_co_conj") && !(ev.has("ir_co_ketone") || ev.has("ir_co_ester") || ev.has("ir_co_amide") || ev.has("c_ketone") || ev.has("c_ester")))
      c.push("افت فرکانس کربونیل به‌دلیل مزدوج‌شدن (ir_co_conj) تیک خورده اما هیچ کربونیل پایه‌ای (کتون/استر/آمید) تأیید نشده؛ ابتدا نوع کربونیل پایه را در بخش C=O مشخص کنید تا این مقدار تفسیر معنی‌دار پیدا کند.");
    if (ev.has("h_acetal") && !ev.has("c_acetal"))
      c.push("پروتون استالی (CH حدود ۴.۵–۵.۵ ppm) تیک خورده اما کربن استالی هم‌ردیف در ¹³C (حدود ۹۵–۱۰۵ ppm) تأیید نشده؛ برای اثبات قطعی استال هر دو شاهد لازم است.");
    if (ev.has("c_acetal") && !ev.has("h_acetal"))
      c.push("کربن در ناحیهٔ استالی ¹³C (حدود ۹۵–۱۰۵ ppm) تیک خورده اما پروتون استالی متناظر در ¹H تأیید نشده؛ این ناحیه با کربن آنومریک قندها هم همپوشانی دارد — شواهد بیشتری بررسی کنید.");
    if (formulaObj && formulaObj.nitrogenRule === "conflict")
      c.push("نقض قاعده نیتروژن: زوج/فرد بودن جرم با تعداد نیتروژن هم‌خوان نیست.");
    if (ev.has("ir_oh_acid") && formulaObj && (formulaObj.atoms.O || 0) < 2)
      c.push("امضای کربوکسیلیک اسید نیاز به حداقل ۲ اکسیژن دارد اما فرمول کمتر دارد.");

    /* --- تناقض‌های دستگاهی در برابر کلاسیک (راستی‌آزمایی متقاطع) --- */
    if ((ev.has("ir_co_ketone") || ev.has("c_ketone")) && ev.has("wet_dnp_neg"))
      c.push("IR/¹³C کربونیل کتونی را نشان می‌دهد اما تست ۲،۴-DNP منفی است؛ یک C=O واقعی باید DNP مثبت بدهد. تفسیر پیک کربونیل را بازبینی کنید (شاید اورتون یا C=C باشد).");
    if ((ev.has("ir_aldehyde") || ev.has("h_ald")) && ev.has("wet_tollens_neg"))
      c.push("شواهد آلدهید هست اما تست تولنس منفی است؛ آلدهیدها باید آینه نقره بدهند. احتمالاً کتون یا پروتون آروماتیک دی‌شیلد است، نه آلدهید.");
    if (ev.has("ir_co_ester") && ev.has("wet_hydroxamic_neg"))
      c.push("IR استر را می‌گوید اما تست اسید هیدروکسامیک منفی است؛ تأیید مستقل استر شکست خورد — کربونیل ممکن است کتون/اسید باشد.");
    if (ev.has("wet_dnp_pos") && ev.has("wet_tollens_pos") && ev.has("wet_fehling_neg"))
      c.push("DNP و تولنس مثبت اما فهلینگ منفی: الگوی کلاسیک آلدهیدِ آروماتیک (رزونانس حلقه، اکسایش با Cu(II) دشوار).");

    /* --- قید عنصری از تست ذوب سدیم (لاسِن) در برابر فرمول --- */
    if (formulaObj && formulaObj.atoms) {
      const need = [["wet_elem_n", "N", "نیتروژن"], ["wet_elem_s", "S", "گوگرد"],
        ["wet_elem_cl", "Cl", "کلر"], ["wet_elem_br", "Br", "برم"], ["wet_elem_i", "I", "ید"]];
      need.forEach(([tag, el, fa]) => {
        if (ev.has(tag) && !(formulaObj.atoms[el] > 0))
          c.push(`تست ذوب سدیم حضور ${fa} را قطعی کرده است اما فرمول مولکولی فعلی فاقد ${el} است؛ فرمول را در فاز ۰ اصلاح کنید.`);
      });
    }
    /* --- کلاس حلالیت در برابر شواهد گروه عاملی --- */
    if (ev.has("wet_sol_a1") && formulaObj && (formulaObj.atoms.O || 0) < 2)
      c.push("کلاس حلالیت A1 (اسید کربوکسیلیک) با فرمولی که کمتر از ۲ اکسیژن دارد سازگار نیست.");
    if (ev.has("wet_fecl3_pos") && !(ev.has("h_ar_mono") || ev.has("h_para") || ev.has("ir_aromatic") || (formulaObj && formulaObj.ihd >= 4)))
      c.push("تست FeCl₃ مثبت (فنول) است اما هیچ شاهد آروماتیکی ثبت نشده؛ فنول به حلقه بنزن نیاز دارد.");
    return c;
  }

  /* ---------- ۸. تشخیص تله‌های امتحانی قابل‌اعمال ----------
     برخلاف detectContradictions (که ناسازگاری قطعی را نشان می‌دهد)، این
     تابع نکات آموزشی/هشدارهای پیشگیرانه‌ای را برمی‌گرداند که با شواهد فعلی
     مرتبط‌اند — مستقیماً از DB.examTraps (مستخرج از تحلیل مسائل حل‌شده). */
  function detectExamTraps(ev) {
    if (!DB.examTraps) return [];
    return DB.examTraps.filter(t => (t.relatedTags || []).some(tag => ev.has(tag)));
  }

  /* ---------- ۸. تحلیل جامع (نقطه ورود اصلی) ---------- */
  function analyze(state) {
    const ev = collectEvidence(state);
    let formulaObj = state.formulaObj || null;
    // ورودی‌های data-sig رشته‌اند؛ بدونِ عددی‌سازی، مقایسهٔ === با
    // predictedC13 همیشه false می‌شد و پاداشِ تقارن بی‌اثر می‌ماند.
    const num = v => { const n = parseInt(v, 10); return Number.isFinite(n) && n > 0 ? n : null; };
    const obs = { c13Count: num(state.obsC13Count), h1Count: num(state.obsH1Count) };
    const contradictions = detectContradictions(ev, formulaObj, obs);
    const references = matchReferences(ev, formulaObj);
    const traps = detectExamTraps(ev);
    let candidates = [];
    if (formulaObj && formulaObj.atoms && (formulaObj.atoms.C || 0) > 0) {
      candidates = assemble(formulaObj, ev, obs);
    }
    return { evidence: [...ev], formulaObj, contradictions, references, candidates, traps };
  }

  const API = {
    deriveFromMass, massToFormulas, deriveFromAtoms, parseFormula, formulaString,
    impliedEvidence, topology, neighboursOf, inferTopology,   // بیرون‌داده برای ابزارهای ممیزی (tools/) atomsMass,
    collectEvidence, detectCore, assemble, matchReferences, connectivityScore,
    detectContradictions, detectExamTraps, predictSymmetry, blockAssemblies, analyze
  };

  if (typeof module !== "undefined" && module.exports) module.exports = API;
  root.Inference = API;
})(typeof window !== "undefined" ? window : globalThis);