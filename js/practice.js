/* =====================================================================
   practice.js — حالت تمرین (فاز ۸)
   ---------------------------------------------------------------------
   بانک فاز ۷ یک «مرجع» است که همه‌چیز را نشان می‌دهد. این ماژول همان
   دادهٔ ۱۸۸ ترکیبی را به یک «آزمون» تبدیل می‌کند: فرمول و چهار طیف
   دیده می‌شود، اما نام، قطعات و تلهٔ امتحانی پنهان می‌ماند تا دانشجو
   خودش استنتاج کند.

   دو چیز آن را از یک فلش‌کارت ساده جدا می‌کند:
     ۱) اگر پاسخ را به‌صورت SMILES بدهد، همان‌جا خودکار سنجیده می‌شود —
        فرمول مولکولی و درجهٔ غیراشباعی با مسئله مقایسه و تعداد محیط‌های
        ¹³C/¹H پیشنهادی محاسبه می‌شود (با موتور تقارن structure.js).
        این یک بازخورد عینی است، نه خودارزیابی.
     ۲) پیشرفت (حل‌شده/اشتباه) در localStorage می‌ماند، پس می‌توان
        «فقط حل‌نشده‌ها» یا «فقط اشتباه‌های قبلی» را تمرین کرد.

   خوداتکا: IIFE مستقل با DOMContentLoaded خودش، مطابق الگوی field-ui.js.
   ===================================================================== */
(function (root) {
  "use strict";
  const el = (id) => document.getElementById(id);
  const esc = (s) => String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const sub = (s) => String(s).replace(/(\d+)/g, "<sub>$1</sub>");
  const KEY = "spectra.practice.v1";

  const DB = root.DB;
  if (!DB) { console.warn("practice.js: DB بارگذاری نشده."); return; }

  /* ---------- پیشرفت ---------- */
  let progress = {};           // key(problem) -> "correct" | "wrong"
  function pkey(p) { return p.formula + "|" + (p.en || p.name); }
  function loadProgress() {
    try { progress = JSON.parse(localStorage.getItem(KEY) || "{}") || {}; }
    catch (e) { progress = {}; }
  }
  function saveProgress() {
    try { localStorage.setItem(KEY, JSON.stringify(progress)); }
    catch (e) { /* حالت خصوصی مرورگر — بی‌صدا رد می‌شویم */ }
  }

  /* ---------- وضعیت جاری ---------- */
  let queue = [];               // مسائل انتخاب‌شده
  let idx = -1;                 // اندیس جاری در queue
  let revealed = false;

  function current() { return (idx >= 0 && idx < queue.length) ? queue[idx] : null; }

  /* ---------- ساخت صف بر پایهٔ فیلترها ---------- */
  function ihdBucket(v) {
    const n = Number(v);
    if (!isFinite(n)) return "all";
    if (n === 0) return "0";
    if (n >= 1 && n <= 3) return "1-3";
    if (n === 4) return "4";
    return "5+";
  }
  function buildQueue() {
    const cls = (el("pr-cls") || {}).value || "all";
    const ihd = (el("pr-ihd") || {}).value || "all";
    const mode = (el("pr-mode") || {}).value || "unseen";
    let list = (DB.fieldProblems || []).filter(p => {
      if (cls !== "all" && p.cls !== cls) return false;
      if (ihd !== "all" && ihdBucket(p.ihd) !== ihd) return false;
      const st = progress[pkey(p)];
      if (mode === "unseen" && st) return false;
      if (mode === "wrong" && st !== "wrong") return false;
      return true;
    });
    // ترتیب تصادفی تا حفظ‌کردن ترتیب بانک کمکی نکند
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
    return list;
  }

  /* ---------- رندر ---------- */
  function renderScore() {
    const box = el("pr-score");
    if (!box) return;
    const total = (DB.fieldProblems || []).length;
    const keys = Object.keys(progress);
    const correct = keys.filter(k => progress[k] === "correct").length;
    const wrong = keys.filter(k => progress[k] === "wrong").length;
    const attempted = correct + wrong;
    const pct = attempted ? Math.round((correct / attempted) * 100) : 0;
    box.innerHTML = `<div style="display:flex;gap:20px;flex-wrap:wrap;align-items:flex-end">
      <div><span style="font-size:var(--fs-2xs);color:var(--muted)">تلاش‌شده</span><br><b class="big-num">${attempted}</b>
        <span style="font-size:var(--fs-2xs);color:var(--muted)"> از ${total}</span></div>
      <div><span style="font-size:var(--fs-2xs);color:var(--muted)">درست</span><br><b class="big-num" style="color:var(--t-h1)">${correct}</b></div>
      <div><span style="font-size:var(--fs-2xs);color:var(--muted)">اشتباه</span><br><b class="big-num" style="color:var(--red)">${wrong}</b></div>
      <div><span style="font-size:var(--fs-2xs);color:var(--muted)">دقت</span><br><b class="big-num">${pct}%</b></div>
    </div>
    <div class="cand-bar" style="margin-top:10px"><span style="width:${attempted ? pct : 0}%"></span></div>`;
  }

  function renderProblem() {
    const box = el("pr-problem"), counter = el("pr-counter");
    const card = el("pr-answer-card");
    if (!box) return;
    const p = current();
    if (!p) {
      box.innerHTML = `<div class="empty-hint">مسئله‌ای با این فیلترها نماند. فیلتر را عوض کنید یا «همه» را انتخاب کنید.</div>`;
      if (counter) counter.textContent = "";
      if (card) card.style.display = "none";
      return;
    }
    if (counter) counter.textContent = `${idx + 1} از ${queue.length}`;
    if (card) card.style.display = "";
    const st = progress[pkey(p)];
    box.innerHTML = `
      <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-bottom:12px">
        <span class="formula-chip">${sub(esc(p.formula))}</span>
        <span class="tag-info">IHD ${esc(p.ihd)}</span>
        ${st ? `<span class="${st === "correct" ? "tag-ok" : "tag-warn"}">${st === "correct" ? "قبلاً درست" : "قبلاً اشتباه"}</span>` : ""}
        <span class="pill">نام و قطعات پنهان است</span>
      </div>
      <table style="margin:0">
        <tr><th style="width:46px">IR</th><td class="en">${esc(p.ir)}</td></tr>
        <tr><th>MS</th><td class="en">${esc(p.ms)}</td></tr>
        <tr><th>¹³C</th><td class="en">${esc(p.c13)}</td></tr>
        <tr><th>¹H</th><td class="en">${esc(p.h1)}</td></tr>
        <tr><th>UV</th><td class="en">${esc(p.uv)}</td></tr>
      </table>
      <div class="field-toolbar" style="margin-top:12px">
        <button class="btn ghost" style="width:auto;padding:8px 14px;margin:0" onclick="prPrev()">◀ قبلی</button>
        <button class="btn ghost" style="width:auto;padding:8px 14px;margin:0" onclick="prNext()">بعدی ▶</button>
      </div>`;
    // پاک‌کردن پاسخ قبلی
    revealed = false;
    ["pr-guess-name", "pr-guess-smiles"].forEach(id => { const n = el(id); if (n) n.value = ""; });
    ["pr-check", "pr-reveal"].forEach(id => { const n = el(id); if (n) { n.innerHTML = ""; n.classList.remove("show"); } });
  }

  /* ---------- سنجش SMILES (بازخورد عینی) ---------- */
  function normFormula(str) {
    const re = /([A-Z][a-z]?)(\d*)/g; const a = {}; let m;
    const t = String(str).replace(/\s/g, "");
    while ((m = re.exec(t)) !== null) { if (!m[1]) continue; a[m[1]] = (a[m[1]] || 0) + (m[2] ? parseInt(m[2]) : 1); }
    const order = ["C", "H", "N", "O", "F", "Cl", "Br", "I", "S", "P"];
    let s = ""; for (const e of order) if (a[e]) s += e + (a[e] > 1 ? a[e] : "");
    for (const e in a) if (order.indexOf(e) === -1) s += e + (a[e] > 1 ? a[e] : "");
    return s;
  }

  function prCheck() {
    const out = el("pr-check"), p = current();
    if (!out || !p) return;
    const smi = (el("pr-guess-smiles") || {}).value.trim();
    if (!smi) {
      out.innerHTML = `<span class="tag-warn">برای سنجش خودکار، ساختار را به SMILES بدهید. (بدون آن هم می‌توانید «نمایش پاسخ» را بزنید و خودتان مقایسه کنید.)</span>`;
      out.classList.add("show"); return;
    }
    if (typeof root.Structure === "undefined") {
      out.innerHTML = `<span class="tag-warn">ماژول ساختار بارگذاری نشده.</span>`; out.classList.add("show"); return;
    }
    const r = Structure.countEnvironments(smi);
    if (r.error) {
      out.innerHTML = `<span class="tag-warn">${esc(r.error)} — نگارش SMILES را بررسی کنید.</span>`;
      out.classList.add("show"); return;
    }
    const mine = normFormula(r.formula), theirs = normFormula(p.formula);
    const fOK = mine === theirs;
    const dbeOK = Math.abs(r.dbe - Number(p.ihd)) < 1e-9;
    let h = `<strong>سنجش ساختار پیشنهادی شما:</strong>`;
    h += `<table style="margin-top:8px"><tr><th>سنجه</th><th>ساختار شما</th><th>مسئله</th><th></th></tr>
      <tr><td>فرمول مولکولی</td><td class="en">${sub(esc(mine))}</td><td class="en">${sub(esc(theirs))}</td>
          <td>${fOK ? '<span class="tag-ok">✓</span>' : '<span class="tag-warn">✗</span>'}</td></tr>
      <tr><td>درجهٔ غیراشباعی</td><td class="en">${r.dbe}</td><td class="en">${esc(p.ihd)}</td>
          <td>${dbeOK ? '<span class="tag-ok">✓</span>' : '<span class="tag-warn">✗</span>'}</td></tr>
      </table>`;
    h += `<div class="note blue" style="margin-top:8px">ساختار شما <b>${r.carbons}</b> محیط ¹³C و <b>${r.protons}</b> محیط ¹H دارد.
      این دو عدد را با سطرهای ¹³C و ¹H مسئله مقایسه کنید — اگر تعداد سیگنال‌ها نمی‌خواند، تقارن ساختارتان با طیف سازگار نیست.</div>`;
    if (fOK && dbeOK)
      h += `<div class="note green">فرمول و IHD می‌خوانند. این ساختار <b>ممکن</b> است — ولی اثباتش تطابق تعداد سیگنال‌ها و شیفت‌هاست، که بالا آمده.</div>`;
    else if (!fOK)
      h += `<div class="note amber">فرمول نمی‌خواند، پس این ساختار نمی‌تواند پاسخ باشد؛ تعداد اتم‌ها را بازبینی کنید.</div>`;
    else
      h += `<div class="note amber">فرمول درست است اما درجهٔ غیراشباعی نه — تعداد حلقه‌ها یا پیوندهای π را بازبینی کنید.</div>`;
    out.innerHTML = h; out.classList.add("show");
  }

  /* ---------- نمایش پاسخ + خودارزیابی ---------- */
  function prReveal() {
    const box = el("pr-reveal"), p = current();
    if (!box || !p) return;
    revealed = true;
    box.innerHTML = `
      <div class="hero-section-title" style="margin:14px 0 8px">◆ پاسخ</div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:baseline;margin-bottom:8px">
        <b style="font-size:var(--fs-md)">${esc(p.name)}</b>
        <span class="en" style="color:var(--muted)">${esc(p.en || "")}</span>
        <span class="pill">فیلد ${esc(p.field)}</span>
      </div>
      <div style="font-size:var(--fs-xs);color:var(--muted);margin-bottom:8px">قطعات سازنده:
        ${(p.blocks || []).map(b => `<span class="frag-chip">${esc(b)}</span>`).join("")}</div>
      <div class="note amber"><b>تلهٔ امتحانی:</b> ${esc(p.trap)}</div>
      <div class="field-toolbar" style="margin-top:12px">
        <span style="font-size:var(--fs-sm);color:var(--muted);align-self:center">پاسخ شما درست بود؟</span>
        <button class="btn green" style="width:auto;padding:8px 16px;margin:0" onclick="prMark('correct')">✓ درست بود</button>
        <button class="btn ghost" style="width:auto;padding:8px 16px;margin:0" onclick="prMark('wrong')">✗ نبود</button>
      </div>`;
  }

  function prMark(verdict) {
    const p = current();
    if (!p) return;
    progress[pkey(p)] = verdict;
    saveProgress();
    renderScore();
    prNext();
  }

  /* ---------- ناوبری ---------- */
  function prStart() {
    queue = buildQueue();
    idx = queue.length ? 0 : -1;
    renderProblem(); renderScore();
  }
  function prNext() {
    if (!queue.length) return;
    idx = (idx + 1) % queue.length;
    renderProblem();
  }
  function prPrev() {
    if (!queue.length) return;
    idx = (idx - 1 + queue.length) % queue.length;
    renderProblem();
  }
  function prRandom() {
    if (!queue.length) queue = buildQueue();
    if (!queue.length) { renderProblem(); return; }
    idx = Math.floor(Math.random() * queue.length);
    renderProblem();
  }
  function prResetProgress() {
    progress = {};
    saveProgress();
    renderScore();
    prStart();
  }

  /* ---------- بردن فرمول مسئله به فاز ۰ ----------
     تا دانشجو بتواند همهٔ ابزارهای فازهای ۰ تا ۶ را روی همین مسئله به‌کار
     ببرد (موتور استنتاج فاز ۵ به فرمول فعال نیاز دارد). */
  function prSendToPhase0() {
    const p = current();
    if (!p || typeof root.Inference === "undefined" || typeof root.State === "undefined") return;
    const atoms = {};
    const re = /([A-Z][a-z]?)(\d*)/g; let m;
    while ((m = re.exec(p.formula)) !== null) {
      if (!m[1]) continue;
      atoms[m[1]] = (atoms[m[1]] || 0) + (m[2] ? parseInt(m[2]) : 1);
    }
    State.formulaObj = Inference.deriveFromAtoms(atoms);
    // فیلدهای فاز ۰ را هم پر کن تا کاربر همان اعداد را ببیند
    const radio = document.querySelector('input[name=formode][value=atoms]');
    if (radio) { radio.checked = true; if (typeof root.toggleFormMode === "function") toggleFormMode(); }
    [["a-c", "C"], ["a-h", "H"], ["a-n", "N"], ["a-o", "O"]].forEach(([id, e]) => {
      const n = el(id); if (n) n.value = atoms[e] || 0;
    });
    const halo = ["Cl", "Br", "F", "I"].find(x => atoms[x]);
    if (halo) { const hs = el("a-hal"), hc = el("a-halc"); if (hs) hs.value = halo; if (hc) hc.value = atoms[halo]; }
    if (typeof root.runFormula === "function") runFormula();
    const btn = document.querySelector(".phase-nav .phase-btn");
    if (typeof root.switchPhase === "function" && btn) switchPhase("phase0", btn);
  }

  /* ---------- راه‌اندازی ---------- */
  function init() {
    if (!DB.fieldProblems || !el("pr-problem")) return;
    loadProgress();
    // پرکردن منوی گروه عاملی از خودِ بانک
    const sel = el("pr-cls");
    if (sel) {
      const CLS_FA = {
        halide: "هالید", alcohol: "الکل", carbonyl: "کربونیل", ester: "استر", acid: "اسید",
        anhydride: "انیدرید", aromatic: "آروماتیک", nitrogen: "نیتروژن‌دار", nitrile: "نیتریل",
        ether: "اتر", alkyne: "آلکین", diene: "دی‌ان", alkane: "آلکان",
        amide: "آمید", amine: "آمین", aminoacid: "آمینواسید"
      };
      const present = [...new Set(DB.fieldProblems.map(p => p.cls))].filter(Boolean).sort();
      sel.innerHTML = `<option value="all">همه</option>` +
        present.map(c => `<option value="${esc(c)}">${esc(CLS_FA[c] || c)}</option>`).join("");
    }
    renderScore();
  }

  Object.assign(root, {
    prStart, prNext, prPrev, prRandom, prReveal, prMark, prCheck,
    prResetProgress, prSendToPhase0
  });
  root.Practice = { progress: () => progress, reset: prResetProgress };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})(typeof window !== "undefined" ? window : globalThis);
