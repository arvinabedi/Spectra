/* =====================================================================
   field-ui.js — کنترلر رابط «بانک سوالات فیلد» (فاز ۷)
   ---------------------------------------------------------------------
   کاملاً خوداتکا: IIFE مستقل با DOMContentLoaded خودش. هیچ تابعی از
   app.js را بازنویسی نمی‌کند و فقط به window.DB (پس از field-data.js)
   و window.Inference متکی است. اگر ظرف‌های HTML موجود نباشند، بی‌صدا
   رد می‌شود (سازگاری رو به عقب).
   ===================================================================== */
(function () {
  "use strict";
  const el = (id) => document.getElementById(id);
  const esc = (s) => String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  // فرمول را به شیء اتمی تبدیل می‌کند: "C9H10O" → {C:9,H:10,O:1}
  function parseFormula(str) {
    const out = {}; const re = /([A-Z][a-z]?)(\d*)/g; let m;
    while ((m = re.exec(str)) !== null) {
      if (!m[1]) continue;
      out[m[1]] = (out[m[1]] || 0) + (m[2] ? parseInt(m[2]) : 1);
    }
    return out;
  }
  function normFormula(str) {
    const a = parseFormula(String(str).replace(/\s/g, "").toUpperCase()
      .replace(/CL/g, "Cl").replace(/BR/g, "Br"));
    const order = ["C", "H", "N", "O", "F", "Cl", "Br", "I", "S", "P"];
    let s = ""; for (const e of order) if (a[e]) s += e + (a[e] > 1 ? a[e] : "");
    // عناصر خارج از ترتیب استاندارد را هم اضافه کن
    for (const e in a) if (!order.includes(e)) s += e + (a[e] > 1 ? a[e] : "");
    return s;
  }
  const sub = (str) => String(str).replace(/(\d+)/g, "<sub>$1</sub>");

  /* ---------- تصاویر طیف (اسکرین‌شات‌های کتاب فیلد) ----------
     قاعدهٔ نام‌گذاری فایل: assets/spectra/<slug نام انگلیسی>-<نوع>.<پسوند>
     نوع‌ها: combo (تصویر کامل صفحه)، ir، ms، h1، c13

     پیش‌تر برای هر ترکیب ۵ نام فایل حدسی ساخته می‌شد و موارد نبود با
     onerror پنهان می‌شدند — یعنی برای ۲۰۰ ترکیب تا ۱۰۰۰ درخواست ۴۰۴.
     اکنون از DB.spectraManifest (ساختهٔ tools/build-spectra-manifest.js)
     خوانده می‌شود، پس فقط تصاویرِ موجود درخواست می‌شوند و هیچ ۴۰۴ای رخ
     نمی‌دهد. بعد از افزودن/حذف تصویر، فهرست را بازبسازید:
         node tools/build-spectra-manifest.js
     ------------------------------------------------------------- */
  const SPEC_TYPES = [
    { key: "combo", label: "تصویر کامل" },
    { key: "ir",    label: "IR" },
    { key: "ms",    label: "MS" },
    { key: "h1",    label: "¹H NMR" },
    { key: "c13",   label: "¹³C NMR" }
  ];
  function slugify(s) {
    return String(s || "")
      .toLowerCase()
      .normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }
  function spectrumThumbsHTML(p) {
    const manifest = (window.DB && DB.spectraManifest) || null;
    if (!manifest) return "";                        // فهرست بارگذاری نشده
    // نکته: با || نوشته نشود — نسخهٔ تک‌فایل spectraDir را عمداً "" می‌گذارد
    // (چون تصاویر data URI هستند) و رشتهٔ خالی falsy است، پس || مقدار
    // پیش‌فرض را برمی‌گرداند و مسیر به assets/spectra/data:image/... تبدیل می‌شد.
    const dir  = (window.DB && DB.spectraDir != null) ? DB.spectraDir : "assets/spectra/";
    const have = manifest[slugify(p.en || p.name)];
    if (!have) return "";                            // این ترکیب تصویری ندارد
    const thumbs = SPEC_TYPES.filter(t => have[t.key]).map(t => {
      const src = dir + have[t.key];
      const caption = `${p.name} (${p.en}) — ${t.label}`;
      return `<button type="button" class="spectrum-thumb" data-full="${esc(src)}" data-caption="${esc(caption)}">
        <!-- loading="lazy" حذف شد: کارت‌ها content-visibility:auto دارند و
             تصویرِ lazy داخل زیردرختِ رندرنشده هیچ‌وقت وارد ناحیهٔ دید نمی‌شود،
             پس اصلاً بارگذاری نمی‌شد. با فهرست تصاویر، تعداد درخواست‌ها از
             ~۱۰۰۰ به تعداد تصاویر واقعی رسیده، پس lazy دیگر لازم نیست. -->
        <img src="${esc(src)}" alt="${esc(t.label)}" decoding="async">
        <span>${esc(t.label)}</span>
      </button>`;
    }).join("");
    if (!thumbs) return "";
    return `<div class="spectrum-thumbs">${thumbs}</div>`;
  }

  /* ---------- لایت‌باکس نمایش بزرگ تصویر ---------- */
  function ensureLightbox() {
    if (el("spectrum-lightbox")) return;
    const div = document.createElement("div");
    div.id = "spectrum-lightbox";
    div.className = "lightbox-overlay";
    div.innerHTML = `<div class="lightbox-inner">
        <img id="lightbox-img" src="" alt="">
        <div class="lightbox-caption" id="lightbox-caption"></div>
        <button type="button" class="lightbox-close" aria-label="بستن">✕</button>
      </div>`;
    document.body.appendChild(div);
    div.addEventListener("click", (e) => {
      if (e.target === div || e.target.classList.contains("lightbox-close")) closeLightbox();
    });
  }
  function openLightbox(src, caption) {
    ensureLightbox();
    el("lightbox-img").src = src;
    el("lightbox-caption").textContent = caption || "";
    el("spectrum-lightbox").classList.add("show");
  }
  function closeLightbox() {
    const ov = el("spectrum-lightbox");
    if (ov) ov.classList.remove("show");
  }
  document.addEventListener("click", (e) => {
    const thumb = e.target.closest(".spectrum-thumb");
    if (thumb) openLightbox(thumb.dataset.full, thumb.dataset.caption);
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeLightbox(); });

  // نگاشت کلاس عاملی به برچسب فارسی
  const CLS_FA = {
    halide: "هالید", alcohol: "الکل", carbonyl: "کربونیل", ester: "استر",
    acid: "اسید", anhydride: "انیدرید", aromatic: "آروماتیک", nitrogen: "نیتروژن‌دار",
    nitrile: "نیتریل", ether: "اتر", alkyne: "آلکین", diene: "دی‌ان", alkane: "آلکان",
    // این سه کلاس در بانک وجود داشتند اما ترجمه نداشتند، پس دکمهٔ فیلترشان
    // کلید انگلیسی خام را بین بقیهٔ دکمه‌های فارسی نشان می‌داد.
    amide: "آمید", amine: "آمین", aminoacid: "آمینواسید"
  };
  const CLS_COLOR = {
    halide: "green", alcohol: "cyan", carbonyl: "amber", ester: "amber",
    acid: "amber", anhydride: "amber", aromatic: "purple", nitrogen: "blue",
    nitrile: "blue", ether: "cyan", alkyne: "green", diene: "purple", alkane: "green",
    amide: "blue", amine: "blue", aminoacid: "purple"
  };

  /* ---------- کارت یک سوال ----------
     ساختار <details>: سرصفحه (نام، فرمول، IHD، کلاس) همیشه دیده می‌شود و
     جزئیات طیفی با کلیک باز می‌شود. پیش‌تر همهٔ ۲۰۰ کارت کامل باز بودند و
     صفحه ~۵۰٬۰۰۰ پیکسل ارتفاع می‌گرفت؛ اسکن کردن بانک عملاً ناممکن بود.
     open را وقتی نتیجهٔ جست‌وجو کم است باز می‌گذاریم (کاربر دنبال همان
     یک مورد است)، نه در حالت مرور کامل. */
  /* ---------- ساختارِ اسکلتی + نوارِ پیوستهٔ ¹³C ----------
     تا پیش از این، کارتِ بانک فقط فهرستِ قطعاتِ فارسی را نشان می‌داد
     («پارا-فنیلن، کربونیل، متیل») و دانشجو باید خودش ساختار را در ذهن
     سرِهم می‌کرد. حالا که هر رکورد گرافِ اتصالِ راستی‌آزمایی‌شده دارد
     (data/bond-graphs.js)، همان مولکول کشیده می‌شود — و پیک‌های ¹³C به
     اتم‌ها وصل‌اند: روی هر پیک بروید، کربنِ متناظرش روشن می‌شود، و با
     کلیک، جمعی که به آن شیفت رسیده باز می‌شود.

     قاعدهٔ صداقت: moleculeOf فقط وقتی مولکول می‌دهد که همهٔ چیدمان‌های
     ممکن به یک ساختار برسند، و Predict برای کربنِ بی‌قاعده null
     برمی‌گرداند. اگر ساختار قطعی نباشد نموداری کشیده نمی‌شود، و اگر
     شیفتی قابلِ محاسبه نباشد پیکش کشیده نمی‌شود. عددِ حدسی نشان
     نمی‌دهیم. */
  function structureHTML(p) {
    if (!window.Inference || !window.Structure || !window.Renderer) return "";
    if (!Renderer.moleculeSVG || !Structure.depict || !Inference.moleculeOf) return "";
    let svg = "", strip = "", data = [], frags = [], frMeta = null;
    try {
      const mol = Inference.moleculeOf(p);
      if (!mol) return "";
      const lay = Structure.depict(mol);
      svg = Renderer.moleculeSVG(lay, {
        width: 300, height: 190, interactive: true,
        title: "ساختار " + (p.en || p.name || "")
      });
      if (window.Predict && Renderer.shiftStrip) {
        const pred = Predict.carbon13(mol, window.DB);
        const seenCls = {};
        lay.atoms.forEach((a, i) => {
          if (a.el !== "C" || !pred[i]) return;
          if (seenCls[a.classId]) return;
          seenCls[a.classId] = 1;
          data.push({ classId: a.classId, delta: pred[i].delta,
                      kind: pred[i].kind, terms: pred[i].terms });
        });
        if (data.length) strip = Renderer.shiftStrip(data, { width: 300 });
      }
      if (window.Fragment) {
        const fr = Fragment.predict(mol);
        if (fr && fr.fragments.length) {
          frags = fr.fragments.filter(f => f.cutBond >= 0).slice(0, 8);
          frMeta = { M: fr.M };
        }
      }
    } catch (e) { return ""; }
    if (!svg) return "";
    const payload = data.length
      ? ` data-c13='${esc(JSON.stringify(data)).replace(/'/g, "&#39;")}'` : "";
    return `<div class="pc-structure" style="text-align:center;margin:2px 0 10px"${payload}>
      ${svg}
      ${strip ? `<div class="pc-c13strip">${strip}</div>
        <div class="pc-c13hint" style="font-size:var(--fs-2xs);color:var(--muted)">
          پیش‌بینیِ شیفت — روی هر پیک بروید تا کربنش روشن شود، کلیک کنید تا حساب را ببینید
        </div>
        <div class="pc-c13detail" hidden></div>` : ""}
      ${frags.length ? `<div class="pc-frags" style="margin-top:8px">
        <div style="font-size:var(--fs-2xs);color:var(--muted);margin-bottom:4px">
          مسیرهای شکست (M=${frMeta.M}) — روی هر قطعه بروید تا پیوندی که پاره می‌شود دیده شود
        </div>
        ${frags.map(f => `<span class="frag-chip mzchip" data-bond="${f.cutBond}"
            data-keep="${f.keep.join(",")}" title="${esc(f.fa)}"
            style="cursor:pointer">${f.mz}</span>`).join("")}
      </div>` : ""}
    </div>`;
  }

  /* ---------- پیوندِ پیک ↔ اتم ----------
     یک شنوندهٔ واگذارشده برای کلِ صفحه: کارت‌ها پویا ساخته می‌شوند و
     بستنِ شنونده به تک‌تکشان با هر بار رندر نشت می‌کرد. */
  function markClass(box, cls, on) {
    box.querySelectorAll('.mol-atom[data-cls="' + cls + '"]').forEach(c => {
      c.setAttribute("fill", on ? "var(--focus)" : "transparent");
      c.setAttribute("fill-opacity", on ? "0.28" : "1");
    });
    box.querySelectorAll('.c13-peak[data-cls="' + cls + '"] line').forEach(l => {
      l.setAttribute("stroke-width", on ? "4.5" : "2.2");
    });
  }
  /* قطعهٔ جرمی: پیوندی که پاره می‌شود قرمز و بریده‌بریده می‌شود، و
     اتم‌هایی که *می‌مانند* روشن — یعنی همان چیزی که m/z را می‌سازد. */
  function markFragment(box, chip, on) {
    const bi = chip.getAttribute("data-bond");
    box.querySelectorAll('.mol-bond[data-bond="' + bi + '"]').forEach(l => {
      l.setAttribute("stroke", on ? "var(--plot-o)" : "transparent");
      l.setAttribute("stroke-dasharray", on ? "4 3" : "");
    });
    const keep = (chip.getAttribute("data-keep") || "").split(",").filter(Boolean);
    keep.forEach(i => {
      box.querySelectorAll('.mol-atom[data-atom="' + i + '"]').forEach(c => {
        c.setAttribute("fill", on ? "var(--focus)" : "transparent");
        c.setAttribute("fill-opacity", on ? "0.18" : "1");
      });
    });
  }

  function wireC13Linking() {
    document.addEventListener("pointerover", e => {
      const chip = e.target.closest && e.target.closest(".mzchip");
      if (chip) {
        const b = chip.closest(".pc-structure");
        if (b) markFragment(b, chip, true);
        return;
      }
      const t = e.target.closest && e.target.closest("[data-cls]");
      if (!t) return;
      const box = t.closest(".pc-structure");
      if (box) markClass(box, t.getAttribute("data-cls"), true);
    });
    document.addEventListener("pointerout", e => {
      const chip = e.target.closest && e.target.closest(".mzchip");
      if (chip) {
        const b = chip.closest(".pc-structure");
        if (b) markFragment(b, chip, false);
        return;
      }
      const t = e.target.closest && e.target.closest("[data-cls]");
      if (!t) return;
      const box = t.closest(".pc-structure");
      if (box) markClass(box, t.getAttribute("data-cls"), false);
    });
    document.addEventListener("click", e => {
      const t = e.target.closest && e.target.closest("[data-cls]");
      if (!t) return;
      const box = t.closest(".pc-structure");
      if (!box) return;
      const out = box.querySelector(".pc-c13detail");
      if (!out) return;
      let data;
      try { data = JSON.parse(box.getAttribute("data-c13") || "[]"); } catch (err) { return; }
      const row = data.find(d => String(d.classId) === t.getAttribute("data-cls"));
      if (!row) return;
      const rows = row.terms.map(x =>
        `<tr><td style="text-align:right">${esc(x.fa)}</td>` +
        `<td class="en" style="text-align:left;direction:ltr">${x.v > 0 ? "+" : ""}${x.v}</td></tr>`).join("");
      out.innerHTML = `<div class="note blue" style="margin-top:6px;text-align:right">
        <b>${esc(row.kind)} — پیش‌بینی ${row.delta.toFixed(1)} ppm</b>
        <table style="margin:6px 0 0;width:100%">${rows}
          <tr><th style="text-align:right">جمع</th>
              <th class="en" style="text-align:left;direction:ltr">${row.delta.toFixed(1)}</th></tr>
        </table>
        <small style="color:var(--muted)">قاعدهٔ افزایشی است، نه اندازه‌گیری؛ خطای میانگینش روی همین بانک ۳٫۴ ppm است و ۷۹٪ از شیفت‌ها زیر ۵ ppm.</small>
      </div>`;
      out.hidden = false;
    });
  }

  function problemCard(p, opts) {
    opts = opts || {};
    const clsFa = CLS_FA[p.cls] || p.cls || "";
    const color = CLS_COLOR[p.cls] || "blue";
    return `<details class="card problem-card"${opts.open ? " open" : ""} style="--accent:var(--${color})">
      <summary>
        <span class="pc-title">
          <b>${esc(p.name)}</b>
          <span class="en pc-en">${esc(p.en)}</span>
        </span>
        <span class="pc-meta">
          <span class="formula-chip">${sub(esc(p.formula))}</span>
          <span class="tag-info">IHD ${esc(p.ihd)}</span>
          <span class="tag-ok">${esc(clsFa)}</span>
          <span class="pill">فیلد ${esc(p.field)}</span>
        </span>
      </summary>
      <div class="pc-body">
        <div class="pc-blocks">قطعات: ${(p.blocks || []).map(b => `<span class="frag-chip">${esc(b)}</span>`).join("")}</div>
        ${structureHTML(p)}
        ${spectrumThumbsHTML(p)}
        <table class="pc-table">
          <tr><th>IR</th><td class="en">${esc(p.ir)}</td></tr>
          <tr><th>MS</th><td class="en">${esc(p.ms)}</td></tr>
          <tr><th>¹³C</th><td class="en">${esc(p.c13)}</td></tr>
          <tr><th>¹H</th><td class="en">${esc(p.h1)}</td></tr>
          <tr><th>UV</th><td class="en">${esc(p.uv)}</td></tr>
        </table>
        <div class="note amber"><b>تلهٔ امتحانی:</b> ${esc(p.trap)}</div>
      </div>
    </details>`;
  }

  /* ---------- رندر و فیلتر بانک ---------- */
  let activeCls = "all";
  function renderBank() {
    const box = el("field-bank-list");
    if (!box || !window.DB || !DB.fieldProblems) return;
    const q = (el("field-search") ? el("field-search").value : "").trim().toLowerCase();
    const qNorm = q ? normFormula(q) : "";
    const counter = el("field-bank-count");

    const list = DB.fieldProblems.filter(p => {
      if (activeCls !== "all" && p.cls !== activeCls) return false;
      if (!q) return true;
      // تطبیق فرمول دقیق یا جستجوی متنی در نام/فرمول/گروه/شماره/تله
      if (qNorm && normFormula(p.formula) === qNorm) return true;
      const hay = `${p.name} ${p.en} ${p.formula} ${CLS_FA[p.cls] || ""} ${p.cls} فیلد ${p.field} ${p.trap} ${p.ir} ${p.ms}`.toLowerCase();
      return hay.indexOf(q) !== -1;
    });

    if (counter) counter.textContent = list.length;
    box.innerHTML = list.length
      ? `<div class="grid bank-grid">${list.map(p => problemCard(p, { open: list.length <= 4 })).join("")}</div>`
      : `<div class="empty-hint">موردی برای «${esc(q)}» یافت نشد. با نام فارسی/انگلیسی، فرمول (مثل C9H10O)، گروه عاملی یا شمارهٔ فیلد جستجو کنید.</div>`;
  }

  /* ---------- دکمه‌های فیلتر دسته‌ای ---------- */
  function renderClsFilter() {
    const bar = el("field-cls-filter");
    if (!bar || !window.DB || !DB.fieldProblems) return;
    const present = [...new Set(DB.fieldProblems.map(p => p.cls))];
    const btn = (id, label) =>
      `<button class="btn ghost" data-cls="${id}" style="width:auto;padding:6px 12px;font-size:var(--fs-sm);${id === activeCls ? "border-color:var(--focus);color:var(--focus)" : ""}">${label}</button>`;
    bar.innerHTML = btn("all", "همه") + present.map(c => btn(c, CLS_FA[c] || c)).join("");
    bar.querySelectorAll("button").forEach(b => b.addEventListener("click", () => {
      activeCls = b.dataset.cls;
      renderClsFilter(); renderBank();
    }));
  }

  /* ---------- موتور «پاسخ سریع از فرمول» ---------- */
  function runQuickFormula() {
    const inp = el("field-quick-input"), out = el("field-quick-out");
    if (!out) return;
    const raw = inp ? inp.value.trim() : "";
    if (!raw) { out.innerHTML = `<span class="tag-warn">یک فرمول مولکولی وارد کنید (مثل C9H10O).</span>`; out.classList.add("show"); return; }
    const target = normFormula(raw);
    const atoms = parseFormula(target);
    const c = atoms.C || 0, h = atoms.H || 0, n = atoms.N || 0;
    const x = (atoms.F || 0) + (atoms.Cl || 0) + (atoms.Br || 0) + (atoms.I || 0);
    const ihd = c + 1 - (h + x) / 2 + n / 2;
    const ihdOk = ihd >= 0 && Math.abs(ihd - Math.round(ihd)) < 1e-9;

    let html = `<div style="display:flex;gap:16px;flex-wrap:wrap;align-items:center;margin-bottom:10px">
      <span class="formula-chip">${sub(esc(target))}</span>
      <span>IHD = <b class="en">${ihdOk ? ihd : "نامعتبر"}</b></span>
      <span style="font-size:var(--fs-sm);color:var(--muted)">${ihdMeaning(ihd)}</span>
    </div>`;

    // ۱) تطبیق در بانک سوالات فیلد
    const inBank = (DB.fieldProblems || []).filter(p => normFormula(p.formula) === target);
    if (inBank.length) {
      html += `<div class="hero-section-title" style="margin-top:6px">سوالات فیلد با این فرمول (${inBank.length})</div>`;
      html += `<div class="grid bank-grid">${inBank.map(p => problemCard(p, { open: inBank.length <= 4 })).join("")}</div>`;
    }

    // ۲) تطبیق مولکول‌های مرجع (مستقل از بانک، از موتور اصلی)
    const refs = (DB.reference || []).filter(r => normFormula(r.formula) === target);
    if (refs.length) {
      html += `<div class="hero-section-title">مولکول‌های مرجع هم‌فرمول (${refs.length})</div>`;
      html += refs.map(r => `<div class="ref-row" style="align-items:flex-start">
        <span class="cand-name" style="min-width:170px">${esc(r.name)} <span class="en">${esc(r.formula)}</span></span>
        <span style="flex:1;font-size:var(--fs-sm);color:var(--muted)">${esc(r.note || "")}</span>
      </div>`).join("");
    }

    // ۳) الگوهای تشخیصی مرتبط با تعداد ناغیراشباعی
    if (ihdOk) {
      const hints = [];
      if (ihd >= 4) hints.push("IHD ≥ ۴ → احتمال حلقهٔ بنزن (۴ درجه). دنبال ۵H~۷.۲ (مونو) یا ۴H متقارن (پارا) بگردید.");
      if (ihd === 0) hints.push("IHD = ۰ → کاملاً اشباع؛ هیچ C=C/C=O/حلقه‌ای وجود ندارد. هر پیک ~۱۶۰۰ مشکوک (رطوبت) است.");
      if (n % 2 === 1 && (h % 2 === 0)) hints.push("قاعدهٔ نیتروژن: با ۱ نیتروژن، جرم مولکولی فرد است.");
      if (x > 0) hints.push("هالوژن دارد → الگوی ایزوتوپی M/M+2 را در طیف جرمی بررسی کنید.");
      if (hints.length) {
        html += `<div class="hero-section-title">راهنمای سریع از فرمول</div>`;
        html += `<ul style="margin:4px 0 0;padding-inline-start:18px;font-size:var(--fs-sm)">${hints.map(x => `<li style="margin-bottom:4px">${esc(x)}</li>`).join("")}</ul>`;
      }
    } else {
      html += `<div class="note amber">این فرمول IHD صحیح و نامنفی نمی‌دهد؛ تعداد هیدروژن/هالوژن را بازبینی کنید.</div>`;
    }

    if (!inBank.length && !refs.length) {
      html += `<div class="empty-hint">این فرمول دقیقاً در بانک یا مراجع نبود، اما راهنمای IHD بالا کمک می‌کند. می‌توانید در کادر جستجوی بانک هم امتحان کنید.</div>`;
    }

    out.innerHTML = html; out.classList.add("show");
  }

  function ihdMeaning(ihd) {
    if (!(ihd >= 0)) return "";
    if (ihd === 0) return "اشباع کامل — بدون حلقه/π";
    if (ihd < 4) return `${ihd} حلقه یا پیوند π`;
    if (ihd === 4) return "احتمالاً یک حلقهٔ بنزن";
    return `احتمال حلقهٔ آروماتیک + ${ihd - 4} غیراشباعی دیگر`;
  }

  /* ---------- تله‌های امتحانی ---------- */
  function renderExamTraps() {
    const box = el("exam-traps-list");
    if (!box || !window.DB || !DB.examTraps) return;
    // DB.examTraps دو شکل دارد (غنیِ database.js و کوتاهِ field-data.js)؛
    // با fallback هر دو را نمایش می‌دهیم تا ۱۳ تلهٔ غنی هم این‌جا دیده شوند.
    box.innerHTML = DB.examTraps.map(t => {
      const head = t.trap || t.title || "تلهٔ امتحانی";
      const rule = t.rule || t.correct || "";
      const why  = t.why || t.pattern || "";
      const tech = t.tech || "";
      return `<div class="card" style="margin:0">
        <div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap">
          <b>${esc(head)}</b>${tech ? `<span class="tag-info">${esc(tech)}</span>` : ""}
        </div>
        ${t.wrong ? `<div style="margin:6px 0 0;font-size:var(--fs-xs);color:var(--muted)"><b>خطای رایج:</b> ${esc(t.wrong)}</div>` : ""}
        <div style="margin:6px 0;font-size:var(--fs-sm)"><b>قاعده:</b> ${esc(rule)}</div>
        ${why ? `<div style="font-size:var(--fs-xs);color:var(--muted)"><b>چرا:</b> ${esc(why)}</div>` : ""}
      </div>`;
    }).join("");
  }

  /* ---------- جدول تقارن ---------- */
  function renderSymmetry() {
    const box = el("symmetry-ref-list");
    if (!box || !window.DB || !DB.symmetryReference) return;
    box.innerHTML = `<table style="margin:0">
      <tr><th>ساختار</th><th>C فرمول</th><th>پیک ¹³C</th><th>پیک ¹H</th><th>عنصر تقارن</th><th>یادداشت</th></tr>
      ${DB.symmetryReference.map(s => `<tr>
        <td>${esc(s.name)}</td>
        <td class="en">${esc(s.cFormula)}</td>
        <td class="en"><b>${esc(s.cPeaks)}</b></td>
        <td class="en">${esc(s.hPeaks)}</td>
        <td class="en">${esc(s.element)}</td>
        <td style="font-size:var(--fs-xs);color:var(--muted)">${esc(s.note || "")}</td>
      </tr>`).join("")}
    </table>`;
  }

  /* ---------- الگوهای تشخیصی طلایی ---------- */
  function renderDiagnostics() {
    const box = el("diagnostic-patterns-list");
    if (!box || !window.DB || !DB.diagnosticPatterns) return;
    box.innerHTML = `<table style="margin:0">
      <tr><th>اگر این را دیدی…</th><th>تکنیک</th><th>نتیجه</th></tr>
      ${DB.diagnosticPatterns.map(d => `<tr>
        <td class="en">${esc(d.see)}</td>
        <td><span class="tag-info">${esc(d.tech)}</span></td>
        <td><b>${esc(d.conclude)}</b></td>
      </tr>`).join("")}
    </table>`;
  }

  /* ---------- ثبت روی window برای دکمه‌های inline ---------- */
  window.runQuickFormula = runQuickFormula;
  window.renderFieldBank = renderBank;

  /* ---------- مقداردهی اولیه ---------- */
  function init() {
    if (!window.DB || !DB.fieldProblems) return; // فاز جدید فعال نیست
    renderClsFilter();
    renderBank();
    renderExamTraps();
    renderSymmetry();
    renderDiagnostics();
    const s = el("field-search");
    if (s) s.addEventListener("input", renderBank);
    const qi = el("field-quick-input");
    if (qi) qi.addEventListener("keydown", (e) => { if (e.key === "Enter") runQuickFormula(); });
    wireC13Linking();
  }

  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", init);
  else init();
})();