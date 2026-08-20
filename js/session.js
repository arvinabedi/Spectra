/* =====================================================================
   session.js — پایداری کار + گزارش حل مسئله
   ---------------------------------------------------------------------
   دو کمبود عملی را پر می‌کند:

   ۱) حافظه: پیش‌تر هیچ چیزی ذخیره نمی‌شد. یک رفرش ساده، همهٔ تیک‌ها،
      همهٔ اعدادِ واردشده، فرمول فعال و نتیجهٔ استنتاج را پاک می‌کرد —
      برای ابزاری که حل یک مسئله در آن ۲۰ دقیقه و شش فاز طول می‌کشد،
      این جدی بود. اکنون برنامه صاف‌وساده «حافظه» دارد: کار خودبه‌خود
      در localStorage می‌نشیند و در بازگشتِ بعدی همان‌جا که بودید
      ادامه می‌دهید. هیچ دکمهٔ «ذخیره» وجود ندارد.

      سیستمِ «نسخهٔ نام‌دار» حذف شد. کاربر باید مسئله حل کند، نه این‌که
      یادش بماند ذخیره بزند و برای هر نسخه اسم بگذارد. از آن سیستم
      فقط یک چیز واقعاً لازم بود — تورِ ایمنی — و آن حالا «بازگرداندن»
      است: «شروع تازه» کارِ پاک‌شده را کنار می‌گذارد، پس اگر اشتباهی
      بود برمی‌گردد، حتی بعد از بستن و باز کردنِ برنامه.

   ۲) گزارش: خروجی قابل‌ارائه از استدلال — چه شواهدی ثبت شد، چه
      تناقض‌هایی بالا آمد، موتور به چه رسید — با دکمهٔ چاپ. در بیشتر
      درس‌ها همین «مسیر استدلال» است که تحویل داده می‌شود، نه فقط نام
      نهایی ترکیب.

   خوداتکا و آخرین اسکریپت بارگذاری‌شده: بازگردانی باید بعد از
   DOMContentLoaded همهٔ ماژول‌های دیگر اجرا شود، چون چک‌باکس‌های
   «یابنده»ها همان‌جا ساخته می‌شوند.
   ===================================================================== */
(function (root) {
  "use strict";
  const el = (id) => document.getElementById(id);
  const esc = (s) => String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const sub = (s) => String(s).replace(/(\d+)/g, "<sub>$1</sub>");

  const AUTO_KEY = "spectra.session.auto.v1";
  const UNDO_KEY = "spectra.session.undo.v1";
  const SAVE_DELAY = 500;

  /* ==================================================================
     ۱) گرفتن و گذاشتنِ کل وضعیت فرم
     ------------------------------------------------------------------
     State.data تنها بخشی از کار است (سیگنال‌های data-sig). اعداد
     ماشین‌حساب‌ها و ورودی‌های تحلیل‌گر خام در خودِ DOM زندگی می‌کنند،
     پس همهٔ کنترل‌های دارای id را هم برمی‌داریم.
     ================================================================== */
  function collect() {
    const controls = {};
    document.querySelectorAll("input[id], select[id], textarea[id]").forEach(n => {
      if (n.type === "checkbox" || n.type === "radio") controls[n.id] = { c: n.checked };
      else if (n.value !== "") controls[n.id] = { v: n.value };
    });
    // رادیوها/چک‌باکس‌های بدون id اما دارای data-sig هم مهم‌اند
    const sigs = {};
    document.querySelectorAll("[data-sig]").forEach(n => {
      if (n.type === "checkbox" || n.type === "radio") { if (n.checked) sigs[n.dataset.sig] = true; }
      else if (n.value !== "") sigs[n.dataset.sig] = n.value;
    });
    const formode = document.querySelector("input[name=formode]:checked");
    return {
      v: 1,
      when: new Date().toISOString(),
      controls, sigs,
      formode: formode ? formode.value : null,
      state: (root.State && root.State.data) ? Object.assign({}, root.State.data) : {},
      formulaObj: (root.State && root.State.formulaObj) || null,
      phase: (document.querySelector(".phase.active") || {}).id || "phase0"
    };
  }

  function apply(snap) {
    if (!snap || snap.v !== 1) return false;
    // ۱) حالت ورود فرمول را اول ست کن تا بلوک درست نمایان شود
    if (snap.formode) {
      const r = document.querySelector(`input[name=formode][value="${snap.formode}"]`);
      if (r) { r.checked = true; if (typeof root.toggleFormMode === "function") root.toggleFormMode(); }
    }
    // ۲) کنترل‌ها
    Object.keys(snap.controls || {}).forEach(id => {
      const n = el(id); if (!n) return;
      const rec = snap.controls[id];
      if ("c" in rec) n.checked = !!rec.c; else if ("v" in rec) n.value = rec.v;
    });
    // ۳) سیگنال‌های data-sig (ممکن است id نداشته باشند)
    document.querySelectorAll("[data-sig]").forEach(n => {
      const want = (snap.sigs || {})[n.dataset.sig];
      if (n.type === "checkbox" || n.type === "radio") n.checked = want === true;
      else if (typeof want === "string") n.value = want;
    });
    // ۴) وضعیت موتور
    if (root.State) {
      root.State.data = Object.assign({}, snap.state || {});
      root.State.formulaObj = snap.formulaObj || null;
      if (root.State.formulaObj && el("status-formula"))
        el("status-formula").innerHTML =
          `فرمول فعال: <b class="en">${sub(esc(root.State.formulaObj.formula))}</b> · IHD=<b>${esc(root.State.formulaObj.ihd)}</b>`;
    }
    // ۵) هم‌گام‌سازی نمایش‌ها
    if (typeof root.refreshEvidenceCount === "function") root.refreshEvidenceCount();
    if (root.LiveViz) { root.LiveViz.refresh(); root.LiveViz.drawCosy(); }
    // ۶) فاز فعال
    const phases = [...document.querySelectorAll(".phase")].map(p => p.id);
    const i = phases.indexOf(snap.phase);
    if (i >= 0 && typeof root.switchPhase === "function") {
      const btn = [...document.querySelectorAll(".phase-btn")][i];
      if (btn) root.switchPhase(snap.phase, btn);
    }
    return true;
  }

  /* ---------- ذخیرهٔ خودکار ---------- */
  let timer = null, dirty = false;
  function markDirty() {
    dirty = true;
    if (timer) clearTimeout(timer);
    timer = setTimeout(saveAuto, SAVE_DELAY);
  }
  function saveAuto() {
    try {
      const snap = collect();
      localStorage.setItem(AUTO_KEY, JSON.stringify(snap));
      dirty = false;
      lastSavedAt = snap.when;
      statusMode = "saved";
      renderSavedStatus();
    } catch (e) {
      statusMode = "failed";
      setStatus("ذخیره نشد — حافظهٔ مرورگر در دسترس نیست", "warn");
    }
  }
  function setStatus(txt, kind) {
    const n = el("session-status");
    if (!n) return;
    n.textContent = txt;
    n.className = "session-status " + (kind || "");
  }

  /* ---------- نشان‌دادنِ حافظه ----------
     حافظه‌ای که دیده نشود اعتماد نمی‌آورد؛ کاربر باز دنبالِ دکمهٔ «ذخیره»
     می‌گردد. پس وضعیت، زمانِ نسبیِ آخرین ذخیره را می‌گوید و هر نیم‌دقیقه
     خودش را تازه می‌کند. */
  let lastSavedAt = null;
  let statusMode = "idle";                 // idle | saved | failed

  function fmtNum(n) {
    return (root.Calc && typeof root.Calc.fmt === "function") ? root.Calc.fmt(n) : String(n);
  }
  function ago(iso) {
    const t = Date.parse(iso);
    if (!isFinite(t)) return "";
    const sec = Math.max(0, Math.round((Date.now() - t) / 1000));
    if (sec < 15) return "همین حالا";
    if (sec < 60) return "چند لحظه پیش";
    const min = Math.round(sec / 60);
    if (min < 60) return fmtNum(min) + " دقیقه پیش";
    const hr = Math.round(min / 60);
    if (hr < 24) return fmtNum(hr) + " ساعت پیش";
    return fmtNum(Math.round(hr / 24)) + " روز پیش";
  }
  function renderSavedStatus() {
    if (statusMode !== "saved" || !lastSavedAt) return;
    setStatus("کار شما ذخیره است — " + ago(lastSavedAt), "ok");
  }

  /* ---------- بازگرداندنِ کارِ پاک‌شده ---------- */
  function readUndo() {
    try { return JSON.parse(localStorage.getItem(UNDO_KEY) || "null"); }
    catch (e) { return null; }
  }
  /* در این عکس کارِ واقعی هست یا فرمِ خالی؟ تا «بازگرداندن» بی‌جهت
     پیشنهاد نشود. */
  function hasWork(snap) {
    if (!snap) return false;
    if (snap.formulaObj) return true;
    if (snap.sigs && Object.keys(snap.sigs).length) return true;
    const st = snap.state || {};
    return Object.keys(st).some(k =>
      st[k] === true || (typeof st[k] === "string" && st[k] !== ""));
  }
  function refreshUndoBtn() {
    const b = el("session-undo");
    if (b) b.hidden = !hasWork(readUndo());
  }
  function sessionUndo() {
    const snap = readUndo();
    if (!snap) return;
    apply(snap);
    try { localStorage.removeItem(UNDO_KEY); } catch (e) {}
    refreshUndoBtn();
    markDirty();
    setStatus("کارِ پاک‌شده برگشت", "ok");
  }

  /* ---------- شروع تازه ---------- */
  function sessionReset() {
    /* پیش از پاک‌کردن، عکسِ کار کنار گذاشته می‌شود: «شروع تازه» نباید
       درِ یک‌طرفه باشد. */
    try {
      const before = collect();
      if (hasWork(before)) localStorage.setItem(UNDO_KEY, JSON.stringify(before));
    } catch (e) {}
    document.querySelectorAll("[data-sig]").forEach(n => {
      if (n.type === "checkbox" || n.type === "radio") n.checked = false; else n.value = "";
    });
    document.querySelectorAll("input[id]:not([name=formode]), select[id], textarea[id]").forEach(n => {
      if (n.type === "checkbox" || n.type === "radio") n.checked = false;
      else if (n.tagName === "SELECT") n.selectedIndex = 0;
      else n.value = "";
    });
    if (root.State) { root.State.data = {}; root.State.formulaObj = null; }
    if (el("status-formula")) el("status-formula").textContent = "—";
    ["out-formula", "out-isotope", "out-fragment", "out-carbonyl", "out-uv", "out-integrals",
     "field-match", "hero-body"].forEach(id => { const n = el(id); if (n) { n.innerHTML = ""; n.classList.remove("show"); } });
    const hero = el("master-hero"); if (hero) hero.classList.remove("show");
    if (typeof root.refreshEvidenceCount === "function") root.refreshEvidenceCount();
    if (root.LiveViz) { root.LiveViz.refresh(); root.LiveViz.drawCosy(); }
    try { localStorage.removeItem(AUTO_KEY); } catch (e) {}
    lastSavedAt = null;
    statusMode = "idle";
    refreshUndoBtn();
    setStatus("کار پاک شد — اگر اشتباه بود «بازگرداندن» را بزنید", "ok");
  }

  /* ==================================================================
     ۲) گزارش حل مسئله
     ================================================================== */
  // برچسب خوانا برای یک کلید شاهد: از خود markup و جدول‌های DB می‌گیریم
  function labelFor(tag) {
    const box = document.querySelector(`input[data-sig="${tag}"]`);
    if (box) {
      const sp = box.closest("label") && box.closest("label").querySelector("span");
      if (sp) return sp.textContent.replace(/\s+/g, " ").trim();
    }
    const tables = [DB.irSmartZones, DB.h1SmartZones, DB.c13SmartZones, DB.jCouplingZones];
    for (const t of (tables || [])) {
      const hit = (t || []).find(z => z.tag === tag);
      if (hit) return hit.fa;
    }
    for (const g of (DB.lassaigne || [])) if (g.tag === tag) return "ذوب سدیم: " + g.fa;
    for (const g of (DB.solubilityClasses || [])) if (g.tag === tag) return "کلاس حلالیت " + g.id;
    for (const g of (DB.functionalTests || [])) {
      if (g.posTag === tag) return g.fa + " — مثبت";
      if (g.posTag && g.posTag.replace("_pos", "_neg") === tag) return g.fa + " — منفی";
    }
    for (const g of (DB.colorComplexTests || [])) if (g.posTag === tag) return g.target + " — تست رنگی مثبت";
    const frag = Object.keys(DB.ms.fragments || {}).find(k => DB.ms.fragments[k].id === tag);
    if (frag) return "قطعهٔ جرمی m/z " + frag + " — " + DB.ms.fragments[frag].ion;
    return tag;
  }
  const GROUPS = [
    { key: "ms_",   fa: "طیف جرمی" },
    { key: "ir_",   fa: "فروسرخ / UV" },
    { key: "c_",    fa: "کربن‌۱۳" },
    { key: "dept_", fa: "DEPT" },
    { key: "h_",    fa: "پروتون" },
    { key: "wet_",  fa: "آنالیز کلاسیک (شیمی‌تر)" }
  ];

  function buildReport() {
    const DBok = typeof root.Inference !== "undefined" && root.State;
    if (!DBok) return `<div class="empty-hint">موتور استنتاج در دسترس نیست.</div>`;
    const snap = root.State.snapshot();
    const res = root.Inference.analyze(snap);
    const ev = res.evidence.filter(k => k.indexOf("_") !== -1);
    const now = new Date();
    const stamp = now.toLocaleDateString("fa-IR") + " — " + now.toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" });

    let h = `<div class="report-head">
      <div>
        <h2>گزارش تعیین ساختار</h2>
        <div class="report-meta">${esc(stamp)}</div>
      </div>
      <div style="text-align:end">
        <div class="formula-chip">${res.formulaObj ? sub(esc(res.formulaObj.formula)) : "بدون فرمول"}</div>
        ${res.formulaObj ? `<div class="report-meta">IHD = ${esc(res.formulaObj.ihd)} · قاعدهٔ نیتروژن: ${res.formulaObj.nitrogenRule === "ok" ? "سازگار" : "ناسازگار"}</div>` : ""}
      </div>
    </div>`;

    // --- شواهد، گروه‌بندی‌شده ---
    h += `<div class="report-section">۱) شواهد ثبت‌شده (${ev.length})</div>`;
    if (!ev.length) h += `<div class="empty-hint">هیچ شاهدی تیک نخورده است.</div>`;
    else {
      GROUPS.forEach(g => {
        const mine = ev.filter(t => t.indexOf(g.key) === 0);
        if (!mine.length) return;
        h += `<div class="report-group"><b>${g.fa}</b><ul>` +
          mine.map(t => `<li>${esc(labelFor(t))}</li>`).join("") + `</ul></div>`;
      });
      const other = ev.filter(t => !GROUPS.some(g => t.indexOf(g.key) === 0));
      if (other.length) h += `<div class="report-group"><b>سایر</b><ul>` +
        other.map(t => `<li>${esc(labelFor(t))}</li>`).join("") + `</ul></div>`;
    }

    // --- تناقض‌ها ---
    h += `<div class="report-section">۲) تناقض‌های طیفی (${res.contradictions.length})</div>`;
    h += res.contradictions.length
      ? res.contradictions.map(c => `<div class="contradiction"><span>⚠</span><span>${c}</span></div>`).join("")
      : `<div class="note green">هیچ تناقضی بین شواهد پیدا نشد.</div>`;

    // --- انتگرال ---
    const integOut = el("out-integrals");
    if (integOut && integOut.classList.contains("show")) {
      h += `<div class="report-section">۳) آشتی انتگرال با فرمول</div>`;
      h += `<div class="report-embed">${integOut.innerHTML}</div>`;
    }

    // --- نتیجه ---
    h += `<div class="report-section">${integOut && integOut.classList.contains("show") ? "۴" : "۳"}) نتیجهٔ موتور استنتاج</div>`;
    if (!res.candidates.length) {
      h += `<div class="note amber">موتور با این شواهد ساختاری مونتاژ نکرد. توجه: موتور مونتاژ فقط زنجیره‌های خطی از بلوک‌های از پیش تعریف‌شده می‌سازد، پس «نساختن» همیشه به‌معنای ناسازگاری شواهد نیست — می‌تواند یعنی این اسکلت (انشعاب، حلقهٔ غیرمعمول، سیستم جوش‌خورده) در دامنهٔ بیانِ موتور نیست. به بخش مراجع پایین تکیه کنید.</div>`;
    } else {
      res.candidates.slice(0, 3).forEach((c, i) => {
        h += `<div class="report-cand">
          <div><b>#${i + 1} ${esc(c.ref ? c.ref.name : "ساختار سازگار")}</b>
            <span class="en">${esc(c.condensed)}</span>
            <span class="pill">امتیاز ${c.score}</span></div>
          ${(c.connectivity || []).map(x => `<div class="report-conn ${x.verdict}">${x.verdict === "supports" ? "✓" : "✗"} ${esc(x.fa)}</div>`).join("")}
        </div>`;
      });
    }
    if (res.references.length) {
      h += `<div class="report-section">مراجع نزدیک</div><ul>` +
        res.references.slice(0, 4).map(r => `<li>${esc(r.ref.name)} <span class="en">${esc(r.ref.formula)}</span> — ${r.hit}/${r.total} امضا</li>`).join("") +
        `</ul>`;
    }
    if (res.traps && res.traps.length) {
      h += `<div class="report-section">تله‌های مرتبط</div><ul>` +
        res.traps.slice(0, 5).map(t => `<li>${esc(t.title || t.trap)}</li>`).join("") + `</ul>`;
    }
    return h;
  }

  function reportBuild() {
    const box = el("solution-report");
    if (!box) return;
    box.innerHTML = buildReport();
    box.classList.add("show");
    if (box.scrollIntoView) box.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  function reportPrint() {
    const box = el("solution-report");
    if (!box || !box.classList.contains("show")) reportBuild();
    document.body.classList.add("report-print");
    setTimeout(() => {
      root.print();
      setTimeout(() => document.body.classList.remove("report-print"), 300);
    }, 60);
  }
  function reportCopy() {
    const box = el("solution-report");
    if (!box) return;
    const text = box.innerText.replace(/\n{3,}/g, "\n\n").trim();
    const done = () => setStatus("گزارش در حافظه کپی شد", "ok");
    if (root.navigator && navigator.clipboard) navigator.clipboard.writeText(text).then(done, () => fallback(text, done));
    else fallback(text, done);
  }
  function fallback(text, done) {
    const ta = document.createElement("textarea");
    ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.select();
    try { document.execCommand("copy"); done(); } catch (e) {}
    ta.remove();
  }

  /* ==================================================================
     راه‌اندازی
     ================================================================== */
  const DB = root.DB || {};
  function init() {
    // شنوندهٔ تغییر برای ذخیرهٔ خودکار
    document.addEventListener("change", markDirty, true);
    document.addEventListener("input", markDirty, true);
    root.addEventListener("beforeunload", () => { if (dirty) saveAuto(); });

    refreshUndoBtn();

    // بازگردانی کار قبلی — بعد از init همهٔ ماژول‌های دیگر
    let snap = null;
    try {
      const raw = localStorage.getItem(AUTO_KEY);
      if (raw) snap = JSON.parse(raw);
    } catch (e) { snap = null; }

    if (snap && apply(snap)) {
      lastSavedAt = snap.when;
      statusMode = "saved";
      setStatus("کار قبلی برگشت — ذخیره‌شده " + ago(snap.when), "ok");
    } else {
      setStatus("آماده — کار خودبه‌خود ذخیره می‌شود", "");
    }

    /* زمانِ نسبی را زنده نگه می‌دارد. سود جانبی: پیام‌های گذرا (مثل
       «گزارش کپی شد») بعد از یک تیک خودشان جای خود را به وضعیتِ
       پایدارِ حافظه می‌دهند. */
    setInterval(renderSavedStatus, 30000);
  }

  Object.assign(root, {
    sessionReset, sessionUndo,
    reportBuild, reportPrint, reportCopy
  });
  root.Session = { collect, apply, saveAuto };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})(typeof window !== "undefined" ? window : globalThis);
