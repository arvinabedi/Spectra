/* =====================================================================
   live-viz.js — سیم‌کشی شماتیک‌های زنده و لنگرگاه‌های بانک فیلد
   ---------------------------------------------------------------------
   این ماژول ظرف‌هایی را پر می‌کند که در index.html وعده داده شده بودند
   ولی هیچ کدی به آن‌ها نمی‌نوشت و همیشه خالی می‌ماندند:

     #iso-viz        نمودار خوشهٔ ایزوتوپی M/M+2/M+4  (Renderer.renderIsotopePattern)
     #ir-viz         طیفِ زندهٔ IR ۴۰۰۰–۴۰۰ cm⁻¹       (Renderer.spectrumTrace، kind=ir)
     #c13-viz        طیفِ زندهٔ ¹³C ۰–۲۲۰ ppm          (Renderer.spectrumTrace، kind=nmr)
     #h1-viz         طیفِ زندهٔ ¹H ۰–۱۳ ppm            (Renderer.spectrumTrace + انتگرال)
     #cosy-viz       نقشهٔ COSY + تابع drawCosy()        (Renderer.renderCorrelationGrid)
     #field-hooks-ms / -ir / -c13 / -h1
                     لنگرگاه‌ها و تله‌های هر تکنیک از بانک فیلد
     #mixture-viz    آنالیز مخلوط از انتگرال ¹H          (Renderer.renderMixtureBars)

   الگوی پیاده‌سازی همان الگوی خوداتکای field-ui.js است: IIFE مستقل با
   DOMContentLoaded خودش، بدون بازنویسی هیچ تابعی از app.js. اگر ظرفی در
   DOM نبود، بی‌صدا رد می‌شود.
   ===================================================================== */
(function (root) {
  "use strict";
  const el = (id) => document.getElementById(id);
  const DB = root.DB;
  if (!DB) { console.warn("live-viz.js: DB بارگذاری نشده — ترتیب <script> را بررسی کنید."); return; }

  const on = (tag) => !!(root.State && root.State.data && root.State.data[tag] === true);

  /* ==================================================================
     بازه‌های نمایشی تکمیلی برای نوارها
     ------------------------------------------------------------------
     این‌ها ادعای طیف‌سنجی جدیدی نیستند: عدد هرکدام عیناً از برچسب همان
     چک‌باکس در index.html برداشته شده (که خودش از جداول مرجع می‌آید) و
     فقط برای ترسیم نوار به بازهٔ عددی تبدیل شده است. تگ‌هایی که از قبل
     در DB.irSmartZones / DB.h1SmartZones / DB.c13SmartZones بازهٔ عددی
     دارند این‌جا تکرار نمی‌شوند.
     ================================================================== */
  const IR_EXTRA = {
    ir_anhydride: { bands: [[1740, 1770], [1800, 1840]], fa: "انیدرید — جفت‌پیک ۱۸۲۰ و ۱۷۵۵" },
    ir_cn_ring:   { bands: [[1620, 1650]],               fa: "C=N حلقه (پیریدین) ~۱۶۳۷" }
  };
  const C13_EXTRA = {
    c_cf_quartet: { bands: [[110, 130]], fa: "چهارتایی CF₃ (¹J~۲۷۰Hz)" },
    c_heavy_i:    { bands: [[-5, 20]],   fa: "C–I — شیفت اثر اتم سنگین" },
    c_acetal:     { bands: [[88, 105]],  fa: "کربن استال (روی دو O)" }
  };
  const H1_EXTRA = {
    h_pyridine_alpha: { bands: [[9.0, 9.4]],              fa: "سینگلت ~۹.۲ — α-پیریدین" },
    h_ar_ortho_co:    { bands: [[7.8, 8.2]],              fa: "دوتایی ~۸.۰ — ارتو به کربونیل/نیترو" },
    h_ar_mono:        { bands: [[7.0, 7.4]],              fa: "مولتی‌پلت 5H ~۷.۲ — تک‌استخلافی" },
    h_para:           { bands: [[6.8, 8.1]],              fa: "دو دوتایی متقارن 4H — پارا (AA′BB′)" },
    h_acetal:         { bands: [[5.2, 5.6]],              fa: "سینگلت 1H ~۵.۴ — استال" },
    h_methoxy:        { bands: [[3.7, 3.9]],              fa: "سینگلت تیز 3H ~۳.۸ — متوکسی" },
    h_ethyl:          { bands: [[1.0, 1.4], [2.3, 4.3]],  fa: "اتیل — سه‌تایی 3H + چهارتایی 2H" },
    h_iso:            { bands: [[1.0, 1.4], [2.5, 3.2]],  fa: "ایزوپروپیل — دوتایی 6H + هفت‌تایی 1H" },
    h_tbu:            { bands: [[0.9, 1.2]],              fa: "سینگلت 9H ~۱.۰ — ترت‌بوتیل" },
    h_sextet:         { bands: [[1.4, 1.8]],              fa: "سکستت 2H — CH₂ میانی nPr" },
    h_quintet:        { bands: [[1.8, 2.2]],              fa: "کوینتت 2H — CH₂ مرکزی ۱،۳-" },
    h_methyl:         { bands: [[1.9, 2.6]],              fa: "سینگلت 3H — متیل مجزا" },
    h_d2o:            { bands: [[0.5, 5.5]],              fa: "تبادلی (OH/NH) — با D₂O محو" }
  };

  /* جمع‌آوری باندها: از جدول زون‌های DB + جدول تکمیلی + (برای IR) الگوهای OOP.
     کلید تجمیع «تگ» است، نه بازه: یک تگ می‌تواند در چند جدول و با چند بازه
     ثبت شده باشد (مثلاً ir_mono هم در irSmartZones و هم در irOOPZones با دو
     باند، یا h_alkyl دو بار در h1SmartZones). بدون تجمیع، یک تیک چند ردیف
     افسانهٔ تکراری می‌ساخت. */
  function collectBands(zoneTable, extra, color, oopZones) {
    const byTag = new Map();
    const add = (tag, ranges, label) => {
      if (!tag) return;
      let e = byTag.get(tag);
      if (!e) { e = { tag, ranges: [], labels: [], color, on: on(tag) }; byTag.set(tag, e); }
      ranges.forEach(r => {
        if (!e.ranges.some(x => x[0] === r[0] && x[1] === r[1])) e.ranges.push(r);
      });
      if (label && e.labels.indexOf(label) === -1) e.labels.push(label);
    };
    (zoneTable || []).forEach(z => add(z.tag, [[z.min, z.max]], z.fa));
    Object.keys(extra).forEach(tag => add(tag, extra[tag].bands, extra[tag].fa));
    (oopZones || []).forEach(z => add(z.sig, z.bands, z.fa));
    return [...byTag.values()].map(e => ({
      ranges: e.ranges, color: e.color, on: e.on,
      label: e.labels.join(" · ")
    }));
  }

  /* ---------- نوار IR ---------- */
  function drawIR() {
    const box = el("ir-viz");
    if (!box || !root.Renderer || !Renderer.spectrumTrace) return;
    box.innerHTML = Renderer.spectrumTrace({
      kind: "ir",                     // خط پایه بالا، جذب‌ها به‌صورت فرورفتگی
      min: 400, max: 4000, unit: "cm⁻¹",
      ticks: [4000, 3500, 3000, 2500, 2000, 1700, 1500, 1000, 400],
      bands: collectBands(DB.irSmartZones, IR_EXTRA, "var(--t-ir)", DB.irOOPZones),
      emptyHint: "باندی تیک نخورده — با تیک‌زدن کربونیل/گروه‌های عاملی بالا، طیف شکل می‌گیرد."
    });
  }

  /* ---------- نوار ¹³C ---------- */
  function drawC13() {
    const box = el("c13-viz");
    if (!box || !root.Renderer || !Renderer.spectrumTrace) return;
    box.innerHTML = Renderer.spectrumTrace({
      kind: "nmr",                    // ¹³C: خطوطِ تیزِ منفرد (بدونِ انتگرال)
      min: 0, max: 220, unit: "ppm",
      ticks: [220, 190, 150, 100, 90, 50, 40, 0],
      bands: collectBands(DB.c13SmartZones, C13_EXTRA, "var(--t-c13)"),
      emptyHint: "ناحیه‌ای تیک نخورده — با تیک‌زدن نواحی شیفت بالا، قله‌ها ظاهر می‌شوند."
    });
  }

  /* ---------- نوار ¹H ---------- */
  function drawH1() {
    const box = el("h1-viz");
    if (!box || !root.Renderer || !Renderer.spectrumTrace) return;
    box.innerHTML = Renderer.spectrumTrace({
      kind: "nmr", integrate: true,   // ¹H: مولتی‌پلت + پله‌ی انتگرال
      min: 0, max: 13, unit: "ppm",
      ticks: [13, 10, 8.5, 6.5, 4.5, 3, 1.5, 0],
      bands: collectBands(DB.h1SmartZones, H1_EXTRA, "var(--t-h1)"),
      emptyHint: "الگویی تیک نخورده — با تیک‌زدن الگوهای طلایی بالا، مولتی‌پلت‌ها و پله‌ی انتگرال ظاهر می‌شوند."
    });
  }

  /* ---------- خوشهٔ ایزوتوپی ----------
     تعداد هالوژن از چک‌باکس‌های خوشه استنتاج می‌شود؛ اگر کاربر شدت M و
     M+2 را هم وارد کرده باشد، همان اعداد (نرمال‌شده) جای الگوی نظری
     دوجمله‌ای نمایش داده می‌شوند تا نمودار «با شدت‌هایی که وارد می‌کنید»
     زنده شود — همان چیزی که متن کارت وعده می‌دهد. */
  function drawIsotope() {
    const box = el("iso-viz");
    if (!box || !root.Renderer || !Renderer.renderIsotopePattern) return;
    const nCl = on("ms_cl2") ? 2 : on("ms_cl") ? 1 : 0;
    const nBr = on("ms_br2") ? 2 : on("ms_br") ? 1 : 0;

    const mI  = parseFloat((el("iso-m")  || {}).value);
    const m2I = parseFloat((el("iso-m2") || {}).value);
    let clusters = null, caption = "";

    if (mI > 0 && m2I > 0) {
      const mx = Math.max(mI, m2I);
      clusters = [
        { label: "M",   massOffset: 0, relIntensity: Math.round((mI  / mx) * 100) },
        { label: "M+2", massOffset: 2, relIntensity: Math.round((m2I / mx) * 100) }
      ];
      caption = "بر پایهٔ شدت‌های واردشدهٔ شما (نرمال‌شده به بلندترین پیک).";
    } else if ((nCl || nBr) && root.Structure && Structure.halogenIsotopePattern) {
      const atoms = {};
      if (nCl) atoms.Cl = nCl;
      if (nBr) atoms.Br = nBr;
      clusters = Structure.halogenIsotopePattern(atoms);
      caption = "الگوی نظری از بسط دوجمله‌ای فراوانی ایزوتوپی " +
        [nCl ? nCl + "×Cl" : "", nBr ? nBr + "×Br" : ""].filter(Boolean).join(" + ") + ".";
    }

    if (!clusters) {
      box.innerHTML = `<div class="empty-hint" style="font-size:var(--fs-sm)">خوشهٔ هالوژن را تیک بزنید یا شدت M و M+2 را وارد کنید تا نمودار رسم شود.</div>`;
      return;
    }
    const baseMass = State.formulaObj ? State.formulaObj.mass : null;
    box.innerHTML = Renderer.renderIsotopePattern(clusters, baseMass) +
      `<div style="font-size:var(--fs-xs);color:var(--muted);margin-top:2px">${caption}</div>`;
  }

  /* ---------- نقشهٔ COSY ----------
     index.html با oninput="drawCosy&&drawCosy()" این تابع را صدا می‌زند
     ولی هرگز تعریف نشده بود (به‌لطف گارد && فقط بی‌صدا کاری نمی‌کرد). */
  function drawCosy() {
    const box = el("cosy-viz");
    if (!box || !root.Renderer || !Renderer.renderCorrelationGrid) return;
    const raw = (el("adv-cosy-input") || {}).value || "";
    const pairs = (root.Calc && Calc.smartCOSY) ? Calc.smartCOSY(raw) : [];
    if (!pairs.length) {
      box.innerHTML = `<div class="empty-hint" style="font-size:var(--fs-sm)">جفت‌های همبستگی را به شکل <span class="en">1.2-3.5, 7.1-7.8</span> وارد کنید.</div>`;
      return;
    }
    const all = [];
    pairs.forEach(p => { all.push(p.a, p.b); });
    const lo = Math.max(0, Math.floor(Math.min(...all) - 0.6));
    const hi = Math.ceil(Math.max(...all) + 0.6);
    const peaks = [...new Set(all)].sort((x, y) => x - y).map(v => ({ ppm: v, label: String(v) }));
    // COSY متقارن است: هر جفت دو لکه (بالا و پایین قطر) + لکه‌های قطری
    const cross = [];
    pairs.forEach(p => { cross.push({ x: p.a, y: p.b }); cross.push({ x: p.b, y: p.a }); });
    peaks.forEach(p => cross.push({ x: p.ppm, y: p.ppm }));
    box.innerHTML = Renderer.renderCorrelationGrid({
      title: "نقشهٔ COSY (H–H، ³J)",
      xLabel: "δ¹H (ppm)", yLabel: "δ¹H (ppm)",
      xPeaks: peaks, yPeaks: peaks,
      xRange: [lo, hi], yRange: [lo, hi],
      cross
    }) + `<div style="font-size:var(--fs-xs);color:var(--muted)">${pairs.length} جفت همبستگی · لکه‌های قطری = خودِ سیگنال‌ها، لکه‌های خارج قطر = مجاورت ³J.</div>`;
  }

  /* ==================================================================
     لنگرگاه‌ها و تله‌های بانک فیلد، به تفکیک تکنیک (۴ ظرف فاز ۰–۳)
     ================================================================== */
  const HOOK_TARGETS = [
    { box: "field-hooks-ms",  color: "amber",  match: /^(جرمی|MS)/,        diag: ["MS"] },
    { box: "field-hooks-ir",  color: "cyan",   match: /^(IR|UV|فروسرخ)/,   diag: ["IR"] },
    { box: "field-hooks-c13", color: "purple", match: /^(¹³C|کربن)/,       diag: ["¹³C", "¹H/¹³C"] },
    { box: "field-hooks-h1",  color: "green",  match: /^(¹H|پروتون|NMR)/,  diag: ["¹H", "¹H/¹³C"] }
  ];
  function renderFieldHooks() {
    HOOK_TARGETS.forEach(t => {
      const box = el(t.box);
      if (!box) return;
      const anchors = (DB.diagnosticPatterns || []).filter(d => t.diag.indexOf(d.tech) !== -1);
      const traps   = (DB.examTraps || []).filter(x => t.match.test(String(x.tech || "")));
      if (!anchors.length && !traps.length) {
        box.innerHTML = `<div class="empty-hint" style="font-size:var(--fs-sm)">لنگرگاهی برای این تکنیک در بانک ثبت نشده.</div>`;
        return;
      }
      let h = "";
      if (anchors.length) {
        h += `<div style="font-size:var(--fs-sm);color:var(--muted);margin-bottom:6px">لنگرگاه‌های تشخیصی (${anchors.length}) — «اگر این را دیدی → این نتیجه»:</div>`;
        h += `<table style="margin:0 0 12px"><tr><th>اگر این را دیدی…</th><th>نتیجه</th></tr>` +
          anchors.map(a => `<tr><td class="en" style="font-size:var(--fs-xs)">${a.see}</td><td style="font-size:var(--fs-xs)"><b>${a.conclude}</b></td></tr>`).join("") +
          `</table>`;
      }
      if (traps.length) {
        h += `<div style="font-size:var(--fs-sm);color:var(--muted);margin-bottom:6px">⚠ تله‌های امتحانی این تکنیک (${traps.length}):</div>`;
        h += traps.map(x => {
          const head = x.trap || x.title || "تله";
          const rule = x.rule || x.correct || "";
          return `<div class="note amber" style="margin-bottom:6px;font-size:var(--fs-sm)"><b>${head}</b><br>${rule}</div>`;
        }).join("");
      }
      box.innerHTML = h;
    });
  }

  /* ==================================================================
     آنالیز مخلوط از انتگرال ¹H  (Renderer.renderMixtureBars)
     مول٪ هر جزء = (انتگرال ÷ تعداد پروتون آن سیگنال) نرمال‌شده به ۱۰۰.
     ================================================================== */
  function runMixture() {
    const out = el("out-mixture"), box = el("mixture-viz");
    if (!out) return;
    const raw = (el("mixture-input") || {}).value || "";
    // قالب: نام:انتگرال:تعدادپروتون  (با کاما جدا)
    const comps = raw.split(/[,،\n]/).map(s => s.trim()).filter(Boolean).map(tok => {
      const parts = tok.split(":").map(p => p.trim());
      if (parts.length < 2) return null;
      const integ = parseFloat(parts[1]);
      const nH = parts.length > 2 ? parseFloat(parts[2]) : 1;
      if (!(integ > 0) || !(nH > 0)) return null;
      return { label: parts[0] || "?", integ, nH, moles: integ / nH };
    }).filter(Boolean);

    if (comps.length < 2) {
      out.innerHTML = `<span class="tag-warn">حداقل دو جزء به شکل <span class="en">نام:انتگرال:تعدادپروتون</span> وارد کنید (مثال: <span class="en">تولوئن:3:3, بنزن:2:6</span>).</span>`;
      out.classList.add("show");
      if (box) box.innerHTML = "";
      return;
    }
    const total = comps.reduce((s, c) => s + c.moles, 0);
    comps.forEach(c => c.molPercent = (c.moles / total) * 100);
    comps.sort((a, b) => b.molPercent - a.molPercent);

    let h = `<strong>نسبت مولی اجزای مخلوط:</strong><table style="margin-top:8px"><tr><th>جزء</th><th>انتگرال</th><th>H</th><th>مول نسبی</th><th>مول٪</th></tr>`;
    comps.forEach(c => h += `<tr><td>${c.label}</td><td class="en">${c.integ}</td><td class="en">${c.nH}</td><td class="en">${c.moles.toFixed(3)}</td><td class="en"><b>${c.molPercent.toFixed(1)}%</b></td></tr>`);
    h += `</table><div style="font-size:var(--fs-xs);color:var(--muted);margin-top:6px">مول نسبی = انتگرال ÷ تعداد پروتون آن سیگنال؛ سپس نرمال‌سازی به ۱۰۰٪.</div>`;
    out.innerHTML = h; out.classList.add("show");
    if (box && root.Renderer && Renderer.renderMixtureBars) {
      const palette = ["var(--t-h1)", "var(--t-ir)", "var(--t-c13)", "var(--t-ms)", "var(--t-2d)"];
      box.innerHTML = Renderer.renderMixtureBars(comps.map((c, i) =>
        ({ label: c.label, molPercent: c.molPercent, color: palette[i % palette.length] })));
    }
  }

  /* ---------- به‌روزرسانی همهٔ شماتیک‌های وابسته به State ---------- */
  function refresh() { drawIR(); drawC13(); drawH1(); drawIsotope(); }

  root.LiveViz = { refresh, drawIsotope, drawCosy, renderFieldHooks, runMixture };
  root.drawCosy = drawCosy;       // برای oninput موجود در index.html
  root.runMixture = runMixture;

  function init() {
    refresh();
    drawCosy();
    renderFieldHooks();
    // شدت‌های ایزوتوپی data-sig ندارند، پس شنوندهٔ سراسری app.js آن‌ها را
    // نمی‌گیرد؛ این‌جا مستقیم وصل می‌شویم.
    ["iso-m", "iso-m2"].forEach(id => {
      const n = el(id);
      if (n) n.addEventListener("input", drawIsotope);
    });
    if (typeof root.refreshEvidenceCount === "function") root.refreshEvidenceCount();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})(typeof window !== "undefined" ? window : globalThis);
