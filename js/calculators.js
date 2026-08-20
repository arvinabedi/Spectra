/* =====================================================================
   حالت سراسری + ماشین‌حساب‌های تخصصی هر فاز — Calculators & Store
   ===================================================================== */
(function (root) {
  const DB = root.DB;

  /* ---------- حالت سراسری ---------- */
  const State = {
    data: {},          // همه سیگنال‌ها (data-sig) اینجا جمع می‌شوند
    formulaObj: null,  // فرمول تأییدشده فاز ۰
    set(k, v) { this.data[k] = v; },
    get(k) { return this.data[k]; },
    snapshot() { return Object.assign({}, this.data, { formulaObj: this.formulaObj }); }
  };

  const fmt = (x, d = 0) => Number(x).toLocaleString("fa-IR", { maximumFractionDigits: d });

  /* =================================================================
     ماشین‌حساب ۱: دینامیک ارتعاشی کربونیل (IR)
     ================================================================= */
  function carbonylIR(baseId, mods) {
    const base = DB.ir.carbonylBase[baseId];
    if (!base) return null;
    let freq = base.freq;
    const steps = [`فرکانس پایه (${base.fa}): <b class="en">${base.freq} cm⁻¹</b>`];
    for (const m of mods) {
      const mod = DB.ir.modifiers[m];
      if (!mod) continue;
      freq += mod.delta;
      // علامت را صریح می‌سازیم و عدد را ltr جدا می‌کنیم؛ وگرنه در متن
      // راست‌به‌چپ، «-۳۰ cm⁻¹» به‌شکل «۳۰ cm⁻¹ -» دیده می‌شد.
      const sign = mod.delta > 0 ? "+" : "−";
      steps.push(`${mod.fa}: <b class="en" dir="ltr">${sign}${Math.abs(mod.delta)} cm⁻¹</b>`);
    }
    return { freq, steps, base };
  }

  /* =================================================================
     ماشین‌حساب ۲: قواعد وودوارد-فایزر (UV-Vis)
     ================================================================= */
  function woodwardFieser(baseNm, ext, exo, alkylA, alkylB, alkylG, homo) {
    let lambda = baseNm + ext * 30 + exo * 5;
    const steps = [`کروموفور پایه: <b class="en">${baseNm} nm</b>`];
    if (ext) steps.push(`${ext} پیوند دوگانه افزاینده مزدوج: <b class="en">+${ext * 30} nm</b>`);
    if (exo) steps.push(`${exo} پیوند اگزوسیکلیک: <b class="en">+${exo * 5} nm</b>`);
    if (homo) { lambda += 39; steps.push(`دی‌ان هوموآنولار: <b class="en">+39 nm</b>`); }
    const isDiene = baseNm === 214 || baseNm === 253;
    if (isDiene) {
      const total = alkylA + alkylB + alkylG;
      if (total) { lambda += total * 5; steps.push(`${total} استخلاف آلکیل/باقیمانده حلقه (دی‌ان): <b class="en">+${total * 5} nm</b>`); }
    } else {
      if (alkylA) { lambda += alkylA * 10; steps.push(`${alkylA} استخلاف α: <b class="en">+${alkylA * 10} nm</b>`); }
      if (alkylB) { lambda += alkylB * 12; steps.push(`${alkylB} استخلاف β: <b class="en">+${alkylB * 12} nm</b>`); }
      if (alkylG) { lambda += alkylG * 18; steps.push(`${alkylG} استخلاف γ و بالاتر: <b class="en">+${alkylG * 18} nm</b>`); }
    }
    return { lambda, steps, isDiene };
  }

  /* =================================================================
     ماشین‌حساب ۳: تحلیل شکافت جرمی (افت خنثی + قطعه)
     ================================================================= */
  function fragmentAnalysis(parent, frag, frag2) {
    const loss = parent - frag;
    const out = { loss, lossType: loss % 2 === 0 ? "even" : "odd", lines: [] };
    if (loss % 2 === 0) {
      out.lines.push({ cls: "info", txt: `افت جرم <b>${loss}</b> زوج است ← خروج مولکول خنثی کامل (نوآرایی مانند مک‌لافرتی یا RDA، شکست دو پیوند).` });
    } else {
      out.lines.push({ cls: "info", txt: `افت جرم <b>${loss}</b> فرد است ← شکافت ساده و خروج یک رادیکال (مثل شکافت آلفا).` });
    }
    // جدول کوچک DB.ms.losses فقط ۷ افت دارد؛ اگر افت در آن نبود به کتابخانهٔ
    // جامع DB.msNeutralLosses رجوع می‌کنیم (۲۷+ افت). پیش‌تر افت‌های رایجی مثل
    // −۱۷، −۲۷، −۴۴ و −۷۹ هیچ توضیحی نمی‌گرفتند در حالی که پایگاه آن‌ها را داشت.
    if (DB.ms.losses[String(loss)]) {
      out.lines.push({ cls: "", txt: `<span class="en">−${loss}</span>: ${DB.ms.losses[String(loss)]}` });
    } else {
      (DB.msNeutralLosses || []).filter(l => l.loss === loss).forEach(l => {
        out.lines.push({ cls: "", txt: `<span class="en">−${loss}</span> = <b>${l.frag}</b> ← ${l.implies}` });
      });
    }
    const advMech = DB.msAdvancedMechanisms.find(m => m.loss === loss);
    if (advMech) out.lines.push({ cls: "purple", txt: `مکانیسم پیشرفته محتمل: <b>${advMech.mechanism}</b> (${advMech.fragment})<br><span style="font-size:var(--fs-xs);color:var(--muted)">شرط ساختاری: ${advMech.condition}</span>` });
    const finfo = DB.ms.fragments[String(frag)];
    if (finfo) {
      out.lines.push({ cls: "ok", txt: `قطعه <span class="en">m/z=${frag}</span> = <b>${finfo.ion}</b> ← ${finfo.implies}` });
      (finfo.alts || []).forEach(a => out.lines.push({ cls: "warn", txt: `تفسیر هم‌جرمِ دیگر برای <span class="en">m/z=${frag}</span>: <b>${a.ion}</b> ← ${a.implies}` }));
    }
    if (frag2 && frag2 < frag) {
      const mStar = (frag2 * frag2 / frag);
      out.metastable = mStar;
      out.lines.push({ cls: "purple", txt: `اگر <span class="en">${frag}→${frag2}</span> در ناحیه بدون میدان رخ دهد، پیک شبه‌پایدار در <b class="en">m* = ${mStar.toFixed(2)}</b> ظاهر می‌شود.` });
    }
    return out;
  }

  /* =================================================================
     ماشین‌حساب ۴: یون شبه‌پایدار
     ================================================================= */
  function metastable(m1, m2) { return (m2 * m2) / m1; }

  /* =================================================================
     ماشین‌حساب ۵: DNMR — معادله آیرینگ (سد چرخش/وارونگی)
     ================================================================= */
  function dnmrEyring(va, vb, tc) {
    const dv = Math.abs(va - vb);
    const kc = (Math.PI * dv) / Math.SQRT2;             // k_c = 2.22·Δν
    const dG = 19.14e-3 * tc * (9.97 + Math.log10(tc / dv)); // kJ/mol
    return { dv, kc, dG };
  }

  /* =================================================================
     ماشین‌حساب ۶: کولن‌سنجی (اصلاح باگ getExponential نسخه قبلی)
     ================================================================= */
  function coulometry(t, current = 0.005) {
    const Q = current * t;
    const mol = Q / 96485;
    return { Q, mol, current };
  }

  /* =================================================================
     داده شبیه‌ساز DEPT (فاز پیک‌ها در حالت‌های مختلف)
     ================================================================= */
  const DEPT_PEAKS = [
    { id: "cq1", x: 12, label: "C=O 205", type: "Cq",  color: "var(--red)" },
    { id: "cq2", x: 30, label: "Cᵢₚₛₒ 138", type: "Cq", color: "var(--orange)" },
    { id: "ch",  x: 48, label: "CH 128",   type: "CH",  color: "var(--text)" },
    { id: "ch2", x: 66, label: "CH₂ 62",   type: "CH2", color: "var(--blue)" },
    { id: "ch3", x: 84, label: "CH₃ 21",   type: "CH3", color: "var(--green)" }
  ];
  function deptState(mode) {
    return DEPT_PEAKS.map(p => {
      let dir = 0; // 0 محو، 1 بالا، -1 پایین
      if (mode === "normal") dir = 1;
      else if (mode === "dept90") dir = (p.type === "CH") ? 1 : 0;
      else if (mode === "dept135") dir = (p.type === "Cq") ? 0 : (p.type === "CH2" ? -1 : 1);
      return Object.assign({}, p, { dir });
    });
  }

  /* ---------- ناحیه شیفت پروتون (برای خط‌کش) ---------- */
  function protonZone(ppm) {
    const z = [
      [10.5, 14, "اسید کربوکسیلیک / انول کلاته", "پروتون فوق‌دی‌شیلد به‌خاطر پیوند هیدروژنی قوی؛ سینگلت پهن، با D₂O محو می‌شود."],
      [8.5, 10.5, "آلدهیدی", "پروتون CHO؛ دی‌شیلدینگ ماکزیمم القایی + آنیزوتروپی. کوپلاژ دوربرد ظریف با Hα."],
      [6.5, 8.5, "آروماتیک", "تحت جریان حلقه؛ 5H مولتی‌پلت = تک‌استخلافی، دو دوتایی 4H = پارا (AA'BB')."],
      [4.5, 6.5, "وینیلی", "روی C=C؛ J تفکیک‌گر: ترانس ۱۲–۱۸، سیس ۶–۱۲، ژمینال ۰–۳ هرتز."],
      [3.0, 4.5, "متصل به O/N/X", "اثر القایی؛ سینگلت 3H در ~۳.۸ = متوکسی OCH₃."],
      [1.5, 3.0, "آلفای کربونیل/آلیلی/بنزیلی", "دی‌شیلدینگ ضعیف آنیزوتروپیک."],
      [0, 1.5, "آلیفاتیک ساده", "متیل/متیلن/متین؛ سینگلت 9H = ترت-بوتیل."]
    ];
    for (const [lo, hi, t, d] of z) if (ppm >= lo && ppm < hi) return { title: t, desc: d };
    return z[z.length - 1] && { title: z[6][2], desc: z[6][3] };
  }

  /* =================================================================
     ماشین‌حساب ۷: کولن‌سنجی (اصلاح باگ getExponential) — قبلاً موجود
     ================================================================= */
  // (تابع coulometry بالاتر تعریف شده است)

  /* =================================================================
     موتورهای تحلیل‌گر هوشمند داده خام — Smart Raw-Data Engines
     این توابع خالص (بدون دستکاری DOM) هستند: عدد/رشته خام می‌گیرند و
     شیء نتیجه برمی‌گردانند. app.js آن‌ها را به HTML و State وصل می‌کند.
     ================================================================= */

  // ابزار کمکی: تطبیق یک عدد با آرایه‌ای از بازه‌های {min,max,...}
  function matchZones(value, zones) {
    return zones.filter(z => value >= z.min && value <= z.max);
  }

  /* ---------- تحلیل‌گر پیک‌های IR ---------- */
  function smartIR(peaksArr) {
    return peaksArr.map(peak => {
      const hits = matchZones(peak, DB.irSmartZones);
      let ringNote = null;
      if (peak >= 1730 && peak <= 1830) {
        const rz = DB.irRingStrainZones.filter(z => peak >= z.min && peak <= z.max && z.ring < 6);
        if (rz.length) ringNote = rz[0];
      }
      return { peak, hits, ringNote };
    });
  }

  /* ---------- تحلیل‌گر قطعات جرمی (بدون نیاز به یون والد) ---------- */
  function smartMassFragments(masses) {
    return masses.map(m => ({ mass: m, info: DB.ms.fragments[String(m)] || null }));
  }

  /* ---------- تحلیل نسبت ایزوتوپی M/M+2 ---------- */
  function isotopeRatio(mIntensity, m2Intensity) {
    if (!mIntensity || !m2Intensity) return { error: "هر دو شدت لازم است." };
    const ratio = mIntensity / m2Intensity;
    const hit = DB.isotopePatternZones.find(z => ratio >= z.ratioMin && ratio <= z.ratioMax);
    return { ratio, hit };
  }

  /* ---------- تحلیل شیفت و شکافت ¹H («۱.۲(t), ۳.۵(s)») ---------- */
  /* ---------- رفع ابهام الگوی شکافت ----------
     ورودی کاربر (ترجیحاً داخل پرانتز) با «طولانی‌ترین تطبیق» به کلید
     استاندارد نگاشت می‌شود تا s(سینگلت) از sext/sept و q(کوارتت) از
     quint جدا شود. مثال: 2.0(sext) → sext ، 1.5(sept) → sept. */
  const SPLIT_ALIASES = [
    { keys: ["singlet", "sing", "s"], code: "s" },
    { keys: ["doublet", "doub", "d"], code: "d" },
    { keys: ["triplet", "trip", "t"], code: "t" },
    { keys: ["quartet", "quart", "quar", "q"], code: "q" },
    { keys: ["quintet", "quint", "quin", "pentet", "pent", "p"], code: "p" },
    { keys: ["sextet", "sext", "sxt"], code: "sext" },
    { keys: ["septet", "sept", "heptet", "hept", "hep", "sep"], code: "sept" },
    { keys: ["multiplet", "mult", "mplet", "m"], code: "m" },
    { keys: ["dddd"], code: "ddd" }, { keys: ["ddd"], code: "ddd" },
    { keys: ["dtd", "dt"], code: "dt" }, { keys: ["td"], code: "td" },
    { keys: ["dd"], code: "dd" },
    { keys: ["broad", "brs", "brd", "bs", "br", "b"], code: "br" }
  ];
  function resolveSplit(token) {
    const tok = String(token || "").toLowerCase().replace(/[^a-z]/g, "");
    if (!tok) return null;
    let best = null;
    SPLIT_ALIASES.forEach(a => a.keys.forEach(k => {
      if (tok.startsWith(k) && (!best || k.length > best.len)) best = { code: a.code, len: k.length };
    }));
    return best ? best.code : null;
  }

  function smartNMR(str) {
    const peaks = String(str).split(/[,\n؛]/).map(s => s.trim()).filter(Boolean);
    return peaks.map(raw => {
      const ppmMatch = raw.match(/-?\d+(\.\d+)?/);
      const ppm = ppmMatch ? parseFloat(ppmMatch[0]) : null;
      // اولویت با محتوای داخل پرانتز؛ در نبود آن، حروف بعد از عدد
      const paren = raw.match(/\(([^)]*)\)/);
      let token = paren ? paren[1] : (raw.replace(/-?\d+(\.\d+)?/g, "").trim());
      const splitKey = resolveSplit(token);
      const zone = ppm !== null ? protonZone(ppm) : null;
      const smart = ppm !== null ? matchZones(ppm, DB.h1SmartZones)[0] : null;
      const split = splitKey ? DB.splittingRules[splitKey] : null;
      return { raw, ppm, zone, smart, splitKey, split };
    }).filter(p => p.ppm !== null);
  }

  /* ---------- تحلیل شیفت ¹³C ---------- */
  function smartC13(str) {
    const peaks = String(str).match(/\d+(\.\d+)?/g) || [];
    return peaks.map(p => {
      const ppm = parseFloat(p);
      const hits = matchZones(ppm, DB.c13SmartZones);
      return { ppm, hits };
    });
  }

  /* ---------- تحلیل ثابت‌های کوپلاژ J ---------- */
  function smartJCoupling(jArr) {
    return jArr.map(j => ({ j, hits: matchZones(j, DB.jCouplingZones) }));
  }

  /* ---------- معادله کارپلاس معکوس: J → زاویه دی‌هدرال φ ----------
     ارتقا: به‌جای یک مجموعه ثابت ضرایب، از مدل هاسنوت (تصحیح‌شده با
     الکترونگاتیوی) استفاده می‌شود. فرم: J(φ) = A·cos²φ − B·cosφ + C.
     خروجی زوایا در بازه‌های پیوسته گروه‌بندی می‌شود (نه فهرست خام). */
  function karplusAngle(jValue, systemType = "aliphatic") {
    const coeffs = (DB.karplusHaasnoot && DB.karplusHaasnoot[systemType]) || DB.karplusHaasnoot.aliphatic;
    const { A, B, C } = coeffs;
    const solutions = [];
    for (let angle = 0; angle <= 180; angle++) {
      const rad = (angle * Math.PI) / 180;
      const cos = Math.cos(rad);
      const calcJ = A * cos * cos - B * cos + C;   // فرم هاسنوت
      if (Math.abs(calcJ - jValue) <= 0.5) solutions.push(angle);
    }
    // گروه‌بندی زوایای پیوسته در بازه‌ها
    const ranges = [];
    let start = null, prev = null;
    solutions.forEach(a => {
      if (start === null) { start = a; prev = a; }
      else if (a - prev <= 2) prev = a;
      else { ranges.push({ min: start, max: prev }); start = a; prev = a; }
    });
    if (start !== null) ranges.push({ min: start, max: prev });
    return {
      solutions, ranges, systemType, coeffs,
      min: solutions.length ? Math.min(...solutions) : null,
      max: solutions.length ? Math.max(...solutions) : null
    };
  }

  /* ---------- تحلیل سیستم اسپینی NMR (فصل ۹.۴ فیلد) ---------- */
  // تبدیل شیفت: δ(ppm) = ν(Hz) / فرکانس دستگاه(MHz)
  function chemShiftConvert(hz, mhz) {
    if (!(mhz > 0)) return null;
    return Math.round((hz / mhz) * 1000) / 1000;
  }
  function hzFromPpm(ppm, mhz) { return Math.round(ppm * mhz * 10) / 10; }

  // آزمون مرتبه‌اول: Δν/J ≥ ۳ ؟
  function firstOrderCheck(deltaNu, j) {
    if (!(j > 0)) return { error: "J باید بزرگ‌تر از صفر باشد." };
    const ratio = Math.round((Math.abs(deltaNu) / j) * 10) / 10;
    const firstOrder = ratio >= 3;
    return {
      ratio, firstOrder,
      verdict: firstOrder
        ? "Δν/J ≥ ۳ → تحلیل مرتبه‌اول مجاز است (تعدد و شدت‌ها تقریباً از قاعده n+1 پیروی می‌کنند)."
        : "Δν/J < ۳ → سیستم مرتبه‌دوم؛ اثر شیروانی، خطوط اضافی و شدت‌های نامتقارن؛ تحلیل سادهٔ n+1 معتبر نیست."
    };
  }

  // تبدیل چند پیک از Hz به ppm (برای استخراج δ از طیف با محور Hz)
  function analyzeSpinSystem(peaks, freqMHz) {
    return (peaks || []).map(p => ({ label: p.label, hz: p.hz, ppm: chemShiftConvert(p.hz, freqMHz) }));
  }

  // استریوشیمی/موقعیت از روی ثابت کوپلاژ J
  function jToStereochem(j) {
    return DB.jCouplingZones.filter(z => j >= z.min && j <= z.max);
  }

  /* ---------- تطابق J با حلقه‌های هترو-آروماتیک ----------
     DB.jCouplingHeterocyclic (فوران/پیرول/تیوفن/…) از قبل در دادگان
     بارگذاری می‌شد اما هیچ مصرف‌کننده‌ای نداشت. برای مسائل هتروسیکل،
     خودِ عدد J موضع استخلاف را لو می‌دهد (مثلاً در تیوفن J₂,₃ > J₃,₄
     است ولی در فوران/پیرول برعکس)، پس ارزش تشخیصی بالایی دارد. */
  function jHeterocyclicMatches(j, tol) {
    tol = (tol == null) ? 0.6 : tol;
    const out = [];
    (DB.jCouplingHeterocyclic || []).forEach(r => {
      [["j23", "J(2,3)"], ["j34", "J(3,4)"], ["j24", "J(2,4)"], ["j25", "J(2,5)"]].forEach(([k, lbl]) => {
        if (r[k] != null && Math.abs(r[k] - j) <= tol)
          out.push({ ring: r.ring, fa: r.fa, pair: lbl, value: r[k], note: r.note || null, ref: r.ref || null });
      });
    });
    return out;
  }

  /* ---------- تطابق J با جدول بنزن/ناجورهسته (H–F، H–P، ¹J C–H) ----------
     DB.jCouplingBenzeneAndHetero هم بارگذاری می‌شد و مصرف نمی‌شد. */
  function jHeteronuclearMatches(j) {
    const t = DB.jCouplingBenzeneAndHetero || {};
    return Object.keys(t).map(k => {
      const z = t[k];
      const inRange = (z.min != null && z.max != null) ? (j >= z.min && j <= z.max)
                    : (z.typical != null ? Math.abs(z.typical - j) <= 1 : false);
      return inRange ? { id: k, fa: z.fa, min: z.min, max: z.max, typical: z.typical, ref: z.ref || null } : null;
    }).filter(Boolean);
  }

  /* ---------- پیش‌بینی افزایشی شیفت پروتون (قواعد شولری) ----------
     ثابت‌های σ همان جدول استانداردِ شولری/سیلوراشتاین‌اند و درست‌اند —
     دست‌کاری‌شان یعنی جعل داده. اما دقتِ خودِ روش یکنواخت نیست و نسخهٔ
     قبلی یک عدد تک بدون هیچ نشانی از عدم‌قطعیت برمی‌گرداند. کالیبراسیون
     روی ۱۵ ترکیب مرجع (پایین) نشان می‌دهد:
        • با دو استخلاف واقعی:  میانگین خطا −۰٫۰۵ ، RMS ۰٫۲۷ ppm
        • با یک استخلاف + آلکیل: میانگین خطا −۰٫۲۸ ، RMS ۰٫۳۸ ppm
          (پایهٔ ۱٫۲۵ فرض می‌کند دو طرف CH₂ استخلاف کربنی دارد، پس در
           حالت تک‌استخلافی اثر هترواتم کم‌شمرده می‌شود.)
        • دو هترواتم قوی روی یک کربن (مثل ClCH₂OR): افزایش‌پذیری
          می‌شکند و تا ۰٫۷ ppm کم‌برآورد می‌کند.
     بنابراین اکنون یک «بازهٔ اطمینان» کالیبره‌شده و هشدارهای دامنهٔ
     اعتبار هم برگردانده می‌شود، به‌جای عددی که دقیق‌تر از واقع به‌نظر برسد. */
  const SHOOLERY_EWG = ["oh", "or", "ocor", "cl", "br", "i", "no2", "nhcor"];
  function predictProtonShift(baseType, subIds) {
    const base = (DB.h1Shoolery.base[baseType] != null) ? DB.h1Shoolery.base[baseType] : DB.h1Shoolery.base.ch2;
    const label = baseType === "ch" ? "CH" : baseType === "ch3" ? "CH₃" : "CH₂";
    const steps = [`پایه ${label}: <b class="en">${base}</b> ppm`];
    let d = base;
    const used = [];
    (subIds || []).forEach(id => {
      const c = DB.h1Shoolery.constants.find(x => x.id === id);
      if (!c) return;
      used.push(c);
      d += c.sigma;
      steps.push(`${c.fa}: <b class="en" dir="ltr">${c.sigma >= 0 ? "+" : "−"}${Math.abs(c.sigma)}</b>`);
    });

    /* --- تصحیح انحراف سیستماتیک + بازهٔ اطمینان ---
       اعداد زیر از کالیبراسیون روی ۱۵ ترکیب مرجع درآمده‌اند (نه حدس):
         دواستخلافی        → میانگین خطا −۰٫۰۵ ، RMS ۰٫۲۷  ⇒ بدون تصحیح، ±۰٫۳
         تک‌استخلافی/متیل   → میانگین خطا −۰٫۲۸ ، RMS ۰٫۳۸  ⇒ تصحیح +۰٫۲۸ ، ±۰٫۴
         آلفا-هالواتر (O و هالوژن روی یک کربن) → خطا تا −۰٫۷  ⇒ ±۰٫۸
       تصحیح انحراف، «جعل داده» نیست: ثابت‌های σ دست‌نخورده می‌مانند و
       فقط انحرافِ اندازه‌گیری‌شدهٔ خودِ روش در حالتی که خارج از دامنهٔ
       کالیبراسیونش به‌کار می‌رود جبران می‌شود. */
    const real = used.filter(c => c.sigma > 0).length;
    const O_TYPE = ["oh", "or", "ocor"], X_TYPE = ["cl", "br", "i"];
    const ewg = used.filter(c => SHOOLERY_EWG.indexOf(c.id) !== -1).length;
    const hasO = used.some(c => O_TYPE.indexOf(c.id) !== -1);
    const hasX = used.some(c => X_TYPE.indexOf(c.id) !== -1);
    const caveats = [];
    let tol = 0.3, bias = 0;

    if (hasO && hasX) {
      tol = 0.8;
      caveats.push("اکسیژن و هالوژن هم‌زمان روی یک کربن (آلفا-هالواتر): افزایش‌پذیری خطی این‌جا می‌شکند و مقدار واقعی تا ~۰٫۷ ppm بالاتر می‌افتد — مثال سنجیده‌شده <span class=\"en\">ClCH₂OR</span>: افزایشی ۴٫۷۵، واقعی ۵٫۴۵.");
    } else if (ewg >= 2) {
      tol = 0.6;
      caveats.push("دو گروه الکترون‌کشندهٔ قوی روی یک کربن؛ در این ناحیه پراکندگی روش بیشتر است.");
    } else if (baseType === "ch3" || real <= 1) {
      bias = 0.28;
      // متیلِ مستقیماً روی اکسیژن (متانول، متوکسی) ضعیف‌ترین گوشهٔ دامنهٔ
      // روش است — هیچ کربنی بین متیل و هترواتم نیست. متانول واقعی ۳٫۳۹
      // است در برابر افزایشیِ ۲٫۸۵، پس بازه این‌جا پهن‌تر گرفته می‌شود.
      tol = (baseType === "ch3" && hasO) ? 0.6 : 0.4;
      caveats.push(baseType === "ch3"
        ? "متیل ذاتاً تک‌استخلافی است و بیرون از دامنهٔ کالیبراسیون پایهٔ شولری قرار می‌گیرد؛ تصحیح سیستماتیک <span class=\"en\" dir=\"ltr\">+۰٫۲۸</span> ppm اعمال شد."
        : "فقط یک استخلاف واقعی وارد شده؛ پایهٔ ۱٫۲۵ برای کربنِ دواستخلافی کالیبره شده، پس روش حدود ۰٫۳ ppm کم‌برآورد می‌کند. تصحیح سیستماتیک <span class=\"en\" dir=\"ltr\">+۰٫۲۸</span> ppm اعمال شد.");
    }
    if (bias) steps.push(`تصحیح انحراف کالیبراسیون: <b class="en" dir="ltr">+${bias}</b>`);
    d += bias;

    if (d > 6.5) caveats.push("خارج از دامنهٔ اعتبار: قواعد شولری برای پروتون‌های آروماتیک، وینیلی، آلدهیدی و اسیدی معتبر نیست.");
    if (!real) caveats.push("هیچ استخلاف مؤثری انتخاب نشده — عدد بازگشتی همان مقدار پایه است.");

    const shift = Math.round(d * 100) / 100;
    const lo = Math.round((d - tol) * 100) / 100;
    const hi = Math.round((d + tol) * 100) / 100;

    // مرجع‌دهی: گروه‌های اندازه‌گیری‌شده‌ای که بازهٔ کتابخانه‌شان با این بازه همپوشانی دارد
    const lit = (DB.h1PeakLibrary || [])
      .filter(z => z.hi >= lo && z.lo <= hi)
      .slice(0, 4)
      .map(z => ({ group: z.group, fa: z.fa, lo: z.lo, hi: z.hi, mult: z.mult }));

    return { shift, range: [lo, hi], tol, steps, caveats, lit, realSubs: real };
  }

  /* ---------- آشتی‌دادن انتگرال با تعداد هیدروژن فرمول ----------
     طیف ¹H انتگرال «نسبی» می‌دهد، نه مطلق. دانشجو باید آن را به تعداد
     واقعی پروتون تبدیل کند و این همان جایی است که بیشترین خطا رخ می‌دهد.
     دو فرضِ مقیاس امتحان می‌شود:
       (الف) همهٔ هیدروژن‌ها دیده شده‌اند  → مقیاس = H_فرمول ÷ Σانتگرال
       (ب)  کوچک‌ترین سیگنال k پروتون است → مقیاس = k ÷ min(انتگرال)
              (k = ۱، ۲، ۳ — همان کاری که دست‌ی انجام می‌شود)
     بهترین فرض آن است که انتگرال‌ها را به عدد صحیح نزدیک‌تر می‌برد؛ در
     تساوی، فرضی که مجموعش به H فرمول نزدیک‌تر است. اگر مجموع از H فرمول
     کمتر دربیاید، اختلاف احتمالاً پروتون تبادلی (OH/NH) است که پهن شده یا
     با D₂O شسته شده — و همین نکتهٔ تشخیصی مهمی است. */
  function reconcileIntegrals(rawList, totalH) {
    const raw = (rawList || []).map(Number).filter(x => x > 0);
    if (!raw.length) return { error: "حداقل یک انتگرال مثبت وارد کنید." };
    if (!(totalH > 0)) return { error: "تعداد هیدروژن فرمول لازم است — ابتدا در فاز ۰ فرمول را تأیید کنید یا دستی وارد کنید." };

    const sum = raw.reduce((a, b) => a + b, 0);
    const minR = Math.min(...raw);
    const candidates = [];
    const consider = (scale, basis) => {
      if (!(scale > 0) || !isFinite(scale)) return;
      const protons = raw.map(r => r * scale);
      const rounded = protons.map(p => Math.round(p));
      if (rounded.some(p => p < 1)) return;                 // سیگنال صفر پروتونی بی‌معناست
      const dev = Math.max(...protons.map((p, i) => Math.abs(p - rounded[i])));
      const tot = rounded.reduce((a, b) => a + b, 0);
      candidates.push({ scale, basis, protons, rounded, dev, total: tot, miss: totalH - tot });
    };
    consider(totalH / sum, "همهٔ پروتون‌ها دیده شده (Σ انتگرال = H فرمول)");
    [1, 2, 3].forEach(k => consider(k / minR, "کوچک‌ترین سیگنال = " + k + "H"));

    if (!candidates.length) return { error: "هیچ مقیاس معناداری پیدا نشد؛ اعداد انتگرال را بازبینی کنید." };
    // اول کمترین انحراف از عدد صحیح، بعد نزدیک‌ترین مجموع به H فرمول
    candidates.sort((a, b) => (a.dev - b.dev) || (Math.abs(a.miss) - Math.abs(b.miss)));
    const best = candidates[0];

    const warnings = [];
    let verdict;
    if (best.dev > 0.18) {
      verdict = "انتگرال‌ها به نسبت عدد صحیح خوبی نمی‌رسند — یا اندازه‌گیری خطا دارد، یا دو سیگنال روی هم افتاده‌اند، یا فرمول درست نیست.";
      warnings.push("بیشترین انحراف از عدد صحیح: " + best.dev.toFixed(2) + " پروتون.");
    } else if (best.miss === 0) {
      verdict = "سازگار: انتگرال‌ها دقیقاً به " + totalH + " هیدروژن فرمول می‌رسند.";
    } else if (best.miss > 0) {
      verdict = best.miss + " هیدروژن در طیف دیده نشده است. محتمل‌ترین توضیح: پروتون تبادلی (OH/NH/SH) که پهن شده یا با D₂O محو شده — این خودش یک شاهد است، نه فقط خطا.";
      warnings.push("اگر شاهد O–H/N–H در IR دارید، همین " + best.miss + " پروتون گم‌شده آن را تأیید می‌کند.");
    } else {
      verdict = "مجموع پروتون‌های شمرده‌شده (" + best.total + ") از هیدروژن فرمول (" + totalH + ") بیشتر است — این ناممکن است؛ فرمول یا انتگرال‌ها را بازبینی کنید.";
    }
    return {
      totalH, sum, best, candidates: candidates.slice(0, 4), verdict, warnings,
      rows: raw.map((r, i) => ({
        raw: r,
        protons: Math.round(best.protons[i] * 100) / 100,
        assigned: best.rounded[i],
        off: Math.round((best.protons[i] - best.rounded[i]) * 100) / 100
      }))
    };
  }

  /* ---------- شناسایی محیط کربنی از جدول تفصیلی ¹³C ---------- */
  function classifyC13Detailed(ppm) {
    return DB.c13Detailed.filter(z => ppm >= z.min && ppm <= z.max);
  }

  /* ---------- شناسایی افت خنثی از تفاضل جرم (کتابخانه جامع) ---------- */
  function identifyLoss(parent, daughter) {
    const loss = parent - daughter;
    const hit = DB.msNeutralLosses.find(l => l.loss === loss);
    return { loss, hit };
  }

  /* ---------- معکوس UV: از λmax (و ε اختیاری) به کروموفور محتمل ---------- */
  function uvReverseLookup(lambda, eps) {
    if (!(lambda > 0)) return { error: "λmax معتبر وارد کنید." };
    const hits = DB.uvChromophores.filter(z => lambda >= z.min && lambda <= z.max);
    let epsNote = null;
    if (eps > 0) {
      if (eps >= 5000) epsNote = "ε بالا ⇒ انتقال مجاز π→π* (سیستم مزدوج یا آروماتیک قوی).";
      else if (eps >= 1000) epsNote = "ε متوسط ⇒ اغلب نوار B آروماتیک یا انتقال نیمه‌مجاز.";
      else epsNote = "ε پایین ⇒ انتقال ممنوعهٔ n→π* (کربونیل ایزوله؛ جفت ناپیوندی).";
    }
    return { lambda, eps, hits, epsNote };
  }

  /* ---------- بسط وودوارد-فایزر: کربونیل‌های آروماتیک (قواعد اسکات) ----------
     baseType: 'ketone'|'aldehyde'|'acid' ؛ subs: [{id, position:'o'|'m'|'p'}] */
  function woodwardFieserAromatic(baseType, subs) {
    const base = DB.uvAromatic.bases[baseType];
    if (!base) return null;
    let lambda = base.nm;
    const steps = [`کروموفور پایه (${base.fa}): <b class="en">${base.nm} nm</b>`];
    const posName = { o: "ارتو", m: "متا", p: "پارا" };
    (subs || []).forEach(s => {
      const def = DB.uvAromatic.substituents.find(x => x.id === s.id);
      if (!def) return;
      const inc = def[s.position] || 0;
      lambda += inc;
      steps.push(`${def.fa} در موقعیت ${posName[s.position]}: <b class="en">+${inc} nm</b>`);
    });
    return { lambda, steps, base };
  }

  /* ---------- پروفایل جرمی اسکلت هیدروکربنی (سری‌های ۱۴n) ----------
     بدون نیاز به گروه عاملی: مانده‌ی پیمانه‌ی ۱۴ قطعات را طبقه‌بندی می‌کند. */
  function smartHydrocarbonProfile(masses) {
    const tally = {};
    DB.hydrocarbonMS.forEach(s => tally[s.id] = 0);
    masses.forEach(m => {
      const r = ((m % 14) + 14) % 14;
      const series = DB.hydrocarbonMS.find(s => s.residue === r);
      if (series) tally[series.id]++;
    });
    // تشخیص افت ۱۵ (خروج متیل) — نشانه انشعاب/متیل انتهایی
    let hasLoss15 = false;
    for (let i = 0; i < masses.length; i++)
      for (let j = 0; j < masses.length; j++)
        if (masses[i] - masses[j] === 15) hasLoss15 = true;
    const ranked = DB.hydrocarbonMS
      .map(s => ({ series: s, count: tally[s.id] }))
      .filter(x => x.count > 0)
      .sort((a, b) => b.count - a.count);
    return { ranked, hasLoss15, dominant: ranked[0] ? ranked[0].series : null };
  }

  /* ---------- تفسیر جفت‌های COSY («۱.۲-۳.۵, ۷.۱-۷.۸») ---------- */
  function smartCOSY(str) {
    const pairs = String(str).split(",").map(s => s.trim()).filter(Boolean);
    return pairs.map(pair => {
      const parts = pair.split("-").map(s => parseFloat(s.trim()));
      if (parts.length !== 2 || parts.some(isNaN)) return null;
      const [a, b] = parts;
      return { a, b, zoneA: protonZone(a), zoneB: protonZone(b) };
    }).filter(Boolean);
  }

  /* ---------- ردیاب خنثی جرمی پیشرفته (اثر ارتو / RDA / مک‌لافرتی) ---------- */
  function advancedNeutralLoss(deltaM) {
    return DB.msAdvancedMechanisms.find(m => m.loss === deltaM) || null;
  }

  /* =================================================================
     ماژول تقارن (مستقل از موتور مونتاژ) — پیش‌بینی/تحلیل شمارش پیک ¹³C
     ================================================================= */

  /* ---------- پیش‌بینی تعداد محیط ¹³C از روی یک زنجیرهٔ بلوکی دلخواه ----------
     نسخهٔ عمومیِ همان منطق predictSymmetry در inference.js؛ اینجا برای
     استفادهٔ مستقیم UI (بدون نیاز به موتور مونتاژ کامل) در دسترس است. */
  function predictNMRSymmetry(chain) {
    const ids = chain.map(b => b.id);
    const rev = [...ids].reverse();
    const mirror = ids.join(">") === rev.join(">") && chain.length > 1;
    const n = chain.length;
    let cCount = 0, hCount = 0;
    const CENV = DB.blockCarbonEnvCount || {}, HENV = DB.blockProtonEnvCount || {};
    if (mirror) {
      const half = Math.floor(n / 2);
      for (let i = 0; i < half; i++) { cCount += CENV[chain[i].id] || 0; hCount += HENV[chain[i].id] || 0; }
      if (n % 2 === 1) {
        const mid = chain[half];
        cCount += CENV[mid.id] || 0;
        hCount += (mid.id === "phenylene_p") ? 1 : (HENV[mid.id] || 0);
      }
    } else {
      chain.forEach(b => {
        cCount += CENV[b.id] || 0;
        hCount += (b.id === "phenylene_p") ? 2 : (HENV[b.id] || 0);
      });
    }
    return { mirror, predictedC13: cCount, predictedH1: hCount };
  }

  /* ---------- تحلیل‌گر مستقل: از روی «تعداد کل کربن» + «تعداد پیک واقعی طیف» ----------
     ابزار فاز ۲ برای دانشجو: کاربر تعداد کربن فرمول و تعداد پیک واقعی طیف را
     می‌دهد؛ سیستم فاکتور تقارن و توضیح فیزیکی برمی‌گرداند. */
  function analyzeCarbonSymmetry(totalC, observedPeaks) {
    if (!(totalC > 0) || !(observedPeaks > 0)) return { error: "هر دو مقدار باید بزرگ‌تر از صفر باشند." };
    if (observedPeaks > totalC) return { error: "تعداد پیک مشاهده‌شده نمی‌تواند از تعداد کل کربن‌های فرمول بیشتر باشد — یا فرمول اشتباه است یا شمارش پیک نادرست است." };
    const ratio = totalC / observedPeaks;
    const divisors = [];
    for (let d = 2; d <= totalC; d++) if (totalC % d === 0) divisors.push(d);
    const isExact = Number.isInteger(ratio);
    let verdict;
    if (observedPeaks === totalC) {
      verdict = "بدون تقارن قابل‌تشخیص — همهٔ کربن‌ها در محیط شیمیایی متفاوتی هستند.";
    } else if (isExact) {
      verdict = `تقارن دقیق با فاکتور ${ratio}: مولکول احتمالاً ${ratio} گروه از کربن‌های کاملاً هم‌ارز دارد (یک صفحه/محور تقارن با تکرار ${ratio}‌تایی). مثال‌های رایج: فاکتور ۲ = پارا-دواستخلافی یکسان یا زنجیرهٔ خطی متقارن (مثل ۱،۲-دی‌برمواتان یا ۳-پنتانون)؛ فاکتور ۳ یا بیشتر = چند گروه آلکیل یکسان روی یک مرکز (مثل ترت-بوتیل یا تری‌متیل‌بنزن).`;
    } else {
      verdict = "تقارن جزئی یا هم‌پوشانی تصادفی: برخی پیک‌ها احتمالاً روی هم افتاده‌اند بدون اینکه تقارن ساختاری واقعی وجود داشته باشد؛ با احتیاط بیشتری ساختار را بررسی کنید (شاید دو کربن متفاوت به‌طور اتفاقی shift مشابه دارند).";
    }
    return { totalC, observedPeaks, ratio: Math.round(ratio * 100) / 100, isExact, divisors, verdict };
  }

  /* =================================================================
     بررسی سازگاری مزدوج‌شدگی کربونیل (رفع تلهٔ فرکانس در برابر فنیل)
     ================================================================= */
  function checkConjugationConsistency(freq, hasArylAdjacentClaim) {
    if (!(freq > 0)) return { error: "فرکانس کربونیل را وارد کنید." };
    const conjugatedRange = freq >= 1660 && freq <= 1700;
    const isolatedRange = freq > 1700;
    let verdict, consistent;
    if (hasArylAdjacentClaim) {
      if (conjugatedRange) { verdict = "سازگار: فرکانس در بازهٔ مزدوج (۱۶۶۰-۱۷۰۰) است، پس اتصال مستقیم کربونیل به حلقه با IR تأیید می‌شود."; consistent = true; }
      else { verdict = `ناسازگار: ادعای اتصال مستقیم کربونیل به حلقه (آریل‌کتون/آلدهید) وجود دارد اما فرکانس (${freq}) بالای ۱۷۰۰ است. رزونانس باید فرکانس را ۲۰-۳۰ واحد پایین بیاورد؛ به احتمال زیاد یک کربن sp³ حائل بین کربونیل و حلقه قرار دارد (مثل Ph-CH(CH₃)-CHO) و کربونیل مزدوج نیست.`; consistent = false; }
    } else {
      if (isolatedRange) { verdict = "سازگار: فرکانس در بازهٔ کربونیل آلیفاتیک/غیرمزدوج (بالای ۱۷۰۰) است."; consistent = true; }
      else { verdict = `توجه: فرکانس (${freq}) در بازهٔ مزدوج (۱۶۶۰-۱۷۰۰) افتاده؛ حتی اگر گمان می‌کنید حلقهٔ آروماتیک مستقیماً به کربونیل نچسبیده، این عدد نشانهٔ وجود نوعی مزدوج‌شدگی (با آروماتیک، آلکن، یا هترواتم دهندهٔ الکترون مثل آمید) است.`; consistent = null; }
    }
    return { freq, conjugatedRange, isolatedRange, consistent, verdict };
  }

  /* =================================================================
     رفع باگ: Calc.formulaHalogens تعریف نشده بود اما app.js (تابع
     syncHalideChecklist، هم روی بارگذاری صفحه و هم بعد از هر بار
     محاسبهٔ فرمول) آن را صدا می‌زد → هر بار خطای «Calc.formulaHalogens
     is not a function» در کنسول رخ می‌داد و کل قابلیت قفل/هشدار
     چک‌باکس‌های هالید (Cl/Br/F/I در بخش‌های IR و ¹³C) کاملاً از کار
     افتاده بود. اینجا با ورودی atoms (شیء فرمول فعال یا null) کار می‌کند.
     ================================================================= */
  function formulaHalogens(atoms) {
    if (!atoms) return { Cl: false, Br: false, F: false, I: false };
    return {
      Cl: !!(atoms.Cl > 0),
      Br: !!(atoms.Br > 0),
      F:  !!(atoms.F  > 0),
      I:  !!(atoms.I  > 0)
    };
  }

  root.Calc = {
    carbonylIR, woodwardFieser, fragmentAnalysis, metastable,
    dnmrEyring, coulometry, deptState, protonZone, DEPT_PEAKS, fmt,
    smartIR, smartMassFragments, isotopeRatio, smartNMR, smartC13,
    smartJCoupling, karplusAngle, smartCOSY, advancedNeutralLoss,
    woodwardFieserAromatic, smartHydrocarbonProfile, uvReverseLookup,
    predictProtonShift, classifyC13Detailed, identifyLoss, reconcileIntegrals,
    chemShiftConvert, hzFromPpm, firstOrderCheck, analyzeSpinSystem, jToStereochem,
    jHeterocyclicMatches, jHeteronuclearMatches,
    predictNMRSymmetry, analyzeCarbonSymmetry, checkConjugationConsistency,
    formulaHalogens
  };
  root.State = State;
  if (typeof module !== "undefined" && module.exports) module.exports = { Calc: root.Calc, State };
})(typeof window !== "undefined" ? window : globalThis);
/* calculators-extended.js
   مرحلهٔ ۱.۵ ارتقا — پل بین جداول جدید database-extended.js و منطق محاسباتی.
   بر خلاف خود جداول (که صرفاً داده هستند)، توابع این فایل واقعاً از آن‌ها
   برای محاسبه/تشخیص استفاده می‌کنند. هیچ تابع موجود در calculators.js
   تغییر یا بازنویسی نمی‌شود؛ فقط به root.Calc اضافه می‌شوند.
   ترتیب بارگذاری: بعد از database-extended.js و calculators.js           */
(function (root) {
  const DB = root.DB;
  if (!root.Calc) { console.warn("calculators-extended: root.Calc یافت نشد؛ باید بعد از calculators.js بارگذاری شود."); return; }

  /* ------------------------------------------------------------------
     ۱) پیش‌بینی شیفت کربن-۱۳ حلقهٔ بنزن با جمع‌پذیری Z + تصحیح فضایی
        substituents: [{ sub: "OCH3", pos: 1 }, { sub: "NO2", pos: 4 }, ...]
        pos از ۱ تا ۶ (بدون اهمیت جهت چرخش، فقط فاصلهٔ نسبی مهم است)
     ------------------------------------------------------------------ */
  function predictBenzeneC13(substituents) {
    const table = DB.c13BenzeneIncrements || [];
    const zMap = {};
    table.forEach(z => { zMap[z.sub] = z; });

    const isOrtho = (p1, p2) => { const d = Math.abs(p1 - p2); return d === 1 || d === 5; };
    // آیا این استخلاف با یک استخلاف غیر H/F در موقعیت اورتوی خودش مواجه است؟
    const stericFlags = substituents.map((s, i) =>
      substituents.some((t, j) => j !== i && isOrtho(s.pos, t.pos) && t.sub !== "F")
    );
    const stericFactor = (DB.stericHindranceFactor && (DB.stericHindranceFactor.min + DB.stericHindranceFactor.max) / 2) || 0.875;

    const results = [];
    for (let c = 1; c <= 6; c++) {
      let shift = 128.5;
      const terms = [];
      substituents.forEach((s, i) => {
        const z = zMap[s.sub];
        if (!z) { terms.push({ sub: s.sub, pos: s.pos, warning: "استخلاف در جدول c13BenzeneIncrements موجود نیست" }); return; }
        const d = Math.abs(c - s.pos);
        const dist = Math.min(d, 6 - d); // 0=ipso 1=ortho 2=meta 3=para
        const key = dist === 0 ? "ipso" : dist === 1 ? "ortho" : dist === 2 ? "meta" : "para";
        let val = z[key];
        let factor = 1;
        if (stericFlags[i] && (key === "ortho" || key === "para")) { factor = stericFactor; }
        const contrib = val * factor;
        shift += contrib;
        terms.push({ sub: s.sub, subPos: s.pos, type: key, zRaw: val, stericFactor: factor, contrib: Math.round(contrib * 100) / 100 });
      });
      results.push({ carbon: c, shift: Math.round(shift * 10) / 10, terms });
    }
    return results;
  }

  /* ------------------------------------------------------------------
     ۲) تشخیص الگوی استخلافی بنزن از روی فرکانس‌های OOP مشاهده‌شده
        freqs: آرایه‌ای از اعداد موجی مشاهده‌شده در ناحیهٔ ۶۷۵-۹۰۰
        بازمی‌گرداند: لیست الگوهای محتمل به‌ترتیب امتیاز تطابق (نزولی)
     ------------------------------------------------------------------ */
  function lookupOOPPattern(freqs) {
    const zones = DB.irOOPZones || [];
    if (!Array.isArray(freqs) || !freqs.length) return [];
    const TOL = 10; // cm⁻¹ رواداری تطبیق
    const scored = zones.map(z => {
      let hits = 0;
      const matchedBands = [];
      z.bands.forEach(([lo, hi]) => {
        const hit = freqs.some(f => f >= lo - TOL && f <= hi + TOL);
        if (hit) { hits++; matchedBands.push([lo, hi]); }
      });
      return {
        pattern: z.pattern, fa: z.fa,
        // sig / intensity / adjacentH / isolatedH پیش‌تر در خروجی پاس داده نمی‌شدند،
        // بنابراین app.js (runOOPPattern) که آن‌ها را می‌خواند همیشه undefined می‌گرفت:
        // خط «شدت/هیدروژن مجاور» هرگز نمایش داده نمی‌شد و تیک خودکار الگوی
        // استخلاف (که به r.sig نیاز دارد) هیچ‌وقت فعال نمی‌شد.
        sig: z.sig || null,
        intensity: z.intensity || null,
        adjacentH: z.adjacentH || null,
        isolatedH: z.isolatedH || null,
        score: hits / z.bands.length,
        matchedBands, totalBands: z.bands.length, note: z.note
      };
    });
    return scored.filter(s => s.score > 0).sort((a, b) => b.score - a.score);
  }

  /* ------------------------------------------------------------------
     ۳) مرجع سریع مک‌لافرتی/استیونسون/RDA برای نمایش در توضیح کاندیدا
     ------------------------------------------------------------------ */
  function mcLaffertyReferenceFor(clsFa) {
    const ex = (DB.msMcLaffertyReference && DB.msMcLaffertyReference.examplesByClass) || [];
    return ex.find(e => e.cls.includes(clsFa)) || null;
  }
  function stevensonReferenceFor(nameFa) {
    const ex = (DB.msStevensonRule && DB.msStevensonRule.examples) || [];
    return ex.find(e => e.molecule.includes(nameFa)) || null;
  }
  function rdaReferenceFor(nameFa) {
    const ex = (DB.msRDAReference && DB.msRDAReference.examples) || [];
    return ex.find(e => e.molecule.includes(nameFa)) || null;
  }

  /* ------------------------------------------------------------------
     ۴) شیفت پایهٔ هترو-آروماتیک + اثر پروتوناسیون (برای پیریدین/پیریدینیوم)
     ------------------------------------------------------------------ */
  function heteroaromaticShift(ringId, protonated) {
    const h1 = (DB.heteroaromaticBaseShifts && DB.heteroaromaticBaseShifts.h1 || []).find(r => r.ring === (protonated ? ringId + "ium" : ringId));
    const c13 = (DB.heteroaromaticBaseShifts && DB.heteroaromaticBaseShifts.c13 || []).find(r => r.ring === (protonated ? ringId + "ium" : ringId));
    return { h1: h1 || null, c13: c13 || null };
  }

  Object.assign(root.Calc, {
    predictBenzeneC13,
    lookupOOPPattern,
    mcLaffertyReferenceFor,
    stevensonReferenceFor,
    rdaReferenceFor,
    heteroaromaticShift
  });

  if (typeof console !== "undefined") console.info("calculators-extended: predictBenzeneC13 / lookupOOPPattern / مراجع MS به Calc اضافه شد.");
})(typeof window !== "undefined" ? window : globalThis);