/* =====================================================================
   کنترلر برنامه — App Controller
   ===================================================================== */
(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const el = (id) => document.getElementById(id);
  const show = (node, html) => { node.innerHTML = html; node.classList.add("show"); };

  /* ---------- ناوبری فازها ----------
     هر تعویضِ فاز یک ورودی در تاریخچه می‌گذارد. سودش دوگانه است: در
     مرورگر دکمهٔ «بازگشت» به فازِ پیشین برمی‌گردد (و نشانیِ #phase3
     قابل هم‌رسانی می‌شود)، و در برنامهٔ اندرویدی دکمهٔ بازگشتِ دستگاه
     هم همین کار را می‌کند — MainActivity فقط webView.goBack() را صدا
     می‌زند و لازم نیست چیزی از فازها بداند. پیش از این، بازگشت یک‌باره
     از برنامه بیرون می‌انداخت. */
  const DEFAULT_PHASE = "phase0";

  /* دکمهٔ هر فاز از روی onclick شناسایی می‌شود، تا بازگردانی از تاریخچه
     هم بدونِ داشتنِ ارجاعِ btn ممکن باشد. */
  function phaseButton(id) {
    return $$(".phase-btn").filter(b =>
      (b.getAttribute("onclick") || "").indexOf("'" + id + "'") !== -1)[0] || null;
  }

  /* تعویضِ ظاهریِ فاز — بدون دست‌زدن به تاریخچه. */
  function applyPhase(id, btn) {
    const target = el(id);
    if (!target) return false;
    $$(".phase").forEach(p => p.classList.remove("active"));
    $$(".phase-btn").forEach(b => b.classList.remove("active"));
    target.classList.add("active");
    const active = btn || phaseButton(id);
    if (active) {
      active.classList.add("active");
      /* روی گوشی نوارِ فازها افقی اسکرول می‌شود؛ دکمهٔ فعال باید خودش را
         در دید بیاورد، وگرنه کاربر نمی‌فهمد کجاست. */
      if (active.scrollIntoView) {
        active.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
      }
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
    return true;
  }

  function switchPhase(id, btn) {
    if (!applyPhase(id, btn)) return;
    /* روی مبدأِ file:// بعضی مرورگرها pushState را رد می‌کنند؛ آن‌وقت
       فقط تاریخچه نداریم و بقیهٔ برنامه سرِ جایش است. */
    try {
      if (!history.state || history.state.phase !== id) {
        history.pushState({ phase: id }, "");
      }
    } catch (e) {}
  }
  window.switchPhase = switchPhase;

  window.addEventListener("popstate", (ev) => {
    applyPhase((ev.state && ev.state.phase) || DEFAULT_PHASE, null);
  });

  /* ورودیِ نخستِ تاریخچه باید بداند روی کدام فاز ایستاده‌ایم، وگرنه
     بازگشت از فازِ دوم به حالتِ بی‌فاز می‌رسد. */
  try {
    if (!history.state || !history.state.phase) {
      history.replaceState({ phase: DEFAULT_PHASE }, "");
    }
  } catch (e) {}

  /* ---------- همگام‌سازی خودکار سیگنال‌ها ----------
     هر عنصری با data-sig هنگام تغییر، حالت را به‌روز می‌کند.
     این جایگزین سیم‌کشی دستی id‌ها (منشأ باگ‌های نسخه قبلی) است. */
  function syncSignal(node) {
    const key = node.dataset.sig;
    if (!key) return;
    if (node.type === "checkbox") State.set(key, node.checked);
    else State.set(key, node.value);
  }
  /* شمارندهٔ شواهد سرآیند — پیش‌تر #status-evidence هیچ‌وقت به‌روز نمی‌شد
     و همیشه «۰» می‌ماند. هر شاهد = یک کلید بولینِ true در State. */
  function refreshEvidenceCount() {
    const node = el("status-evidence");
    if (!node) return;
    const n = Object.keys(State.data).filter(k => State.data[k] === true).length;
    node.textContent = Calc.fmt(n);
  }
  function onSignalChange(e) {
    if (!(e.target.dataset && e.target.dataset.sig)) return;
    syncSignal(e.target);
    refreshEvidenceCount();
    if (window.LiveViz) LiveViz.refresh();
  }
  document.addEventListener("change", onSignalChange);
  document.addEventListener("input", onSignalChange);
  window.refreshEvidenceCount = refreshEvidenceCount;

  /* =================================================================
     فاز ۰ — فرمول و جرم
     ================================================================= */
  /* ورودیِ نامعتبر باید خودش هم علامت بخورد، نه فقط پیامِ زیرِ دکمه. */
  function invalid(id, yes) {
    const n = el(id);
    if (!n) return;
    if (yes) n.setAttribute("aria-invalid", "true");
    else n.removeAttribute("aria-invalid");
  }

  function runFormula() {
    const mode = $("input[name=formode]:checked").value;
    const out = el("out-formula");
    invalid("f-mass", false); invalid("a-c", false);
    let f;
    if (mode === "mass") {
      const m = parseInt(el("f-mass").value) || 0;
      const n = parseInt(el("f-n").value) || 0;
      const o = parseInt(el("f-o").value) || 0;
      const hal = el("f-hal").value;
      const hc = parseInt(el("f-halc").value) || 0;
      if (!m) { invalid("f-mass", true); return show(out, `<span class="tag-warn">جرم یون مولکولی را وارد کنید.</span>`); }
      const res = Inference.massToFormulas(m, n, o, hal === "none" ? "none" : hal, hal === "none" ? 0 : (hc || 1));
      if (res.error) return show(out, `<span class="tag-warn">${res.error}</span>`);
      if (!res.list.length) return show(out, `<span class="tag-warn">هیچ فرمول معتبری برای این جرم یافت نشد.</span>`);
      f = res.list[0];
      renderFormulaResult(out, f, res.list);
    } else {
      const atoms = {};
      ["C", "H", "N", "O"].forEach(elm => { const v = parseInt(el("a-" + elm.toLowerCase()).value) || 0; if (v) atoms[elm] = v; });
      const hal = el("a-hal").value, hc = parseInt(el("a-halc").value) || 0;
      if (hal !== "none" && hc) atoms[hal] = hc;
      if (!atoms.C) { invalid("a-c", true); return show(out, `<span class="tag-warn">حداقل تعداد کربن را وارد کنید.</span>`); }
      f = Inference.deriveFromAtoms(atoms);
      renderFormulaResult(out, f, [f]);
    }
    State.formulaObj = f;
    /* نوارِ زمینه یک‌جا نوشته می‌شود تا app.js و session.js دو شکلِ
       متفاوت از یک واقعیت نسازند. */
    if (window.Shell) Shell.setFormula(f.formula, f.ihd);
    syncHalideChecklist();
  }
  function renderFormulaResult(out, f, list) {
    let h = `<strong>فرمول تأییدشده:</strong> <span class="formula-chip">${sub(f.formula)}</span><br>`;
    h += `درجه غیراشباعی (<span class="en">IHD</span>): <span class="big-num">${f.ihd}</span><br>`;
    h += ihdMeaning(f.ihd);
    if (f.nitrogenRule === "conflict") h += `<br><span class="tag-warn">⚠ نقض قاعده نیتروژن: زوج/فرد بودن جرم با تعداد N ناسازگار است.</span>`;
    else h += `<br><span class="tag-ok">✓ قاعده نیتروژن سازگار است.</span>`;
    if (list.length > 1) {
      h += `<br><br><strong>فرمول‌های جایگزین سازگار با این جرم:</strong><ul>`;
      list.slice(1, 5).forEach(a => h += `<li><span class="en">${sub(a.formula)}</span> — IHD=${a.ihd}</li>`);
      h += `</ul><span style="font-size:var(--fs-sm);color:var(--muted)">برای انتخاب فرمول دیگر، از حالت «ورود مستقیم اتم‌ها» استفاده کنید.</span>`;
    }
    show(out, h);
  }
  function ihdMeaning(ihd) {
    if (ihd >= 4) return `<span class="tag-info">IHD ≥ 4:</span> احتمال قوی حضور حلقه بنزن (۳ پیوند π + ۱ حلقه). در IR دنبال پاهای فیل ۱۶۰۰/۱۴۵۰ و کشش >۳۰۰۰ باشید.`;
    if (ihd === 3) return `IHD = 3: ترکیبی از حلقه و پیوندهای دوگانه (مثلاً یک حلقه + یک کربونیل + یک پیوند دوگانه).`;
    if (ihd === 2) return `IHD = 2: یک پیوند سه‌گانه، یا دو دوگانه، یا دو حلقه.`;
    if (ihd === 1) return `IHD = 1: یک پیوند دوگانه (کربونیل/آلکن) یا یک حلقه آلیفاتیک.`;
    if (ihd === 0) return `IHD = 0: مولکول کاملاً اشباع، بدون حلقه یا پیوند π.`;
    return "";
  }

  /* =================================================================
     فاز ۰ — تحلیل شکافت و شبه‌پایدار
     ================================================================= */
  function runFragment() {
    const p = parseInt(el("frag-parent").value) || 0;
    const d = parseInt(el("frag-daughter").value) || 0;
    const d2 = parseInt(el("frag-daughter2").value) || 0;
    const out = el("out-fragment");
    if (!p || !d || d > p) return show(out, `<span class="tag-warn">جرم والد و دختر را درست وارد کنید (دختر < والد).</span>`);
    const r = Calc.fragmentAnalysis(p, d, d2);
    let h = `<strong>کالبدشکافی شکست (افت = <span class="en">${r.loss} Da</span>):</strong><ul>`;
    r.lines.forEach(L => h += `<li class="${L.cls === 'ok' ? 'tag-ok' : L.cls === 'purple' ? 'tag-info' : ''}">${L.txt}</li>`);
    h += `</ul>`;
    // تطبیق با کتابخانه جامع افت‌های خنثی
    const L1 = Calc.identifyLoss(p, d);
    if (L1.hit) h += `<div class="note blue">کتابخانه افت خنثی — افت <span class="en">${L1.loss}</span>: خروج <b>${L1.hit.frag}</b> ← ${L1.hit.implies}</div>`;
    if (d2) { const L2 = Calc.identifyLoss(d, d2); if (L2.hit) h += `<div class="note blue">افت مرحله دوم <span class="en">${L2.loss}</span>: خروج <b>${L2.hit.frag}</b> ← ${L2.hit.implies}</div>`; }
    show(out, h);
  }

  /* =================================================================
     فاز ۱ — دینامیک کربونیل IR
     ================================================================= */
  function runCarbonyl() {
    const base = el("ir-co-base").value;
    const mods = [];
    if (el("ir-conj").checked) mods.push("conjugation");
    if (el("ir-hbond").checked) mods.push("hbond");
    const ring = el("ir-ring").value;
    if (ring === "5") mods.push("ring5");
    if (ring === "4") mods.push("ring4");
    const out = el("out-carbonyl");
    if (base === "0") return show(out, `<span class="tag-warn">نوع کربونیل پایه را انتخاب کنید.</span>`);
    const r = Calc.carbonylIR(base, mods);
    let h = `<strong>تخمین فرکانس ارتعاشی C=O:</strong><ul>`;
    r.steps.forEach(s => h += `<li>${s}</li>`);
    h += `</ul><div style="margin-top:8px;padding-top:8px;border-top:1px solid var(--border)"><strong>فرکانس پیش‌بینی: <span class="big-num">~${r.freq} cm⁻¹</span></strong></div>`;
    show(out, h);
  }

  /* =================================================================
     فاز ۱ — وودوارد-فایزر UV
     ================================================================= */
  function runUV() {
    const base = parseInt(el("uv-base").value) || 0;
    const out = el("out-uv");
    if (!base) return show(out, `<span class="tag-warn">کروموفور پایه را انتخاب کنید.</span>`);
    const r = Calc.woodwardFieser(
      base,
      parseInt(el("uv-ext").value) || 0,
      parseInt(el("uv-exo").value) || 0,
      parseInt(el("uv-a").value) || 0,
      parseInt(el("uv-b").value) || 0,
      parseInt(el("uv-g").value) || 0,
      el("uv-homo").checked
    );
    let h = `<strong>تحلیل وودوارد-فایزر (${r.isDiene ? "دی‌ان" : "ان‌اون"}):</strong><ul>`;
    r.steps.forEach(s => h += `<li>${s}</li>`);
    h += `</ul><div style="margin-top:8px;padding-top:8px;border-top:1px solid var(--border)"><strong>λ<sub>max</sub> تئوری: <span class="big-num">${r.lambda} nm</span></strong></div>`;
    show(out, h);
  }

  /* =================================================================
     فاز ۴ — DNMR (آیرینگ) و شبه‌پایدار
     ================================================================= */
  function runDNMR() {
    const va = parseFloat(el("dnmr-va").value), vb = parseFloat(el("dnmr-vb").value), tc = parseFloat(el("dnmr-tc").value);
    const out = el("out-dnmr");
    if (!va || !vb || !tc) return show(out, `<span class="tag-warn">هر سه مقدار الزامی است.</span>`);
    const r = Calc.dnmrEyring(va, vb, tc);
    show(out, `<strong>خروجی معادله آیرینگ:</strong><ul>
      <li>Δν قفل‌شده: <b class="en">${r.dv.toFixed(2)} Hz</b></li>
      <li>ثابت سرعت هم‌گداخت k<sub>c</sub>: <b class="en">${r.kc.toFixed(2)} s⁻¹</b></li>
      <li>سد انرژی فعال‌سازی ΔG<sup>‡</sup>: <span class="big-num">${r.dG.toFixed(2)} kJ/mol</span></li></ul>`);
  }
  function runMeta() {
    const m1 = parseFloat(el("meta-m1").value), m2 = parseFloat(el("meta-m2").value);
    const out = el("out-meta");
    if (!m1 || !m2 || m2 >= m1) return show(out, `<span class="tag-warn">m₁ و m₂ را درست وارد کنید (m₂ < m₁).</span>`);
    show(out, `پیک شبه‌پایدار اثبات‌کننده مسیر <span class="en">${m1}→${m2}</span> در <strong><span class="en">m* = ${Calc.metastable(m1, m2).toFixed(2)}</span></strong> ظاهر می‌شود.`);
  }

  /* =================================================================
     شبیه‌ساز DEPT
     ================================================================= */
  function runDept(mode, btn) {
    $$("#dept-ctrl button").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    const peaks = Calc.deptState(mode);
    const canvas = el("dept-canvas");
    canvas.querySelectorAll(".dept-peak,.dept-lbl").forEach(n => n.remove());
    const axisY = 100;
    peaks.forEach(p => {
      const peak = document.createElement("div");
      peak.className = "dept-peak";
      const height = p.dir === 0 ? 0 : 58;
      peak.style.left = p.x + "%";
      peak.style.background = p.color;
      if (p.dir >= 0) { peak.style.bottom = "100px"; peak.style.height = height + "px"; }
      else { peak.style.top = "100px"; peak.style.height = height + "px"; }
      peak.style.opacity = p.dir === 0 ? "0.12" : "1";
      canvas.appendChild(peak);
      const lbl = document.createElement("div");
      lbl.className = "dept-lbl";
      lbl.style.left = (p.x - 3) + "%";
      lbl.style.bottom = "8px";
      lbl.innerHTML = `<span class="en">${p.label}</span>`;
      lbl.style.opacity = p.dir === 0 ? "0.3" : "1";
      canvas.appendChild(lbl);
    });
    el("dept-caption").innerHTML = DB.c13.deptRules[mode === "dept90" ? "DEPT-90" : mode === "dept135" ? "DEPT-135" : "normal"];
  }

  /* =================================================================
     خط‌کش شیفت پروتون
     ================================================================= */
  function updateRuler(v) {
    const z = Calc.protonZone(parseFloat(v));
    el("ruler-live").innerHTML = `<strong>محیط مغناطیسی: ${z.title}</strong><br><span style="font-size:var(--fs-sm);color:var(--muted)">${z.desc}</span>`;
  }

  /* =================================================================
     درخت تصمیم IR
     ================================================================= */
  function toggleTree(node) { node.classList.toggle("open"); }
  window.toggleTree = toggleTree;

  /* =================================================================
     موتور استنتاج نهایی — قهرمان
     ================================================================= */
  function runMaster() {
    const hero = el("master-hero");
    const snap = State.snapshot();
    const res = Inference.analyze(snap);
    let h = "";

    // سرآیند: فرمول
    const fchip = res.formulaObj ? sub(res.formulaObj.formula) : "—";
    el("hero-formula").innerHTML = fchip;
    el("hero-ihd").innerHTML = res.formulaObj ? `IHD ${res.formulaObj.ihd}` : "—";

    // تناقض‌ها
    if (res.contradictions.length) {
      h += `<div class="hero-section-title">⚠ تناقض‌های طیفی</div>`;
      res.contradictions.forEach(c => h += `<div class="contradiction"><span>⚠</span><span>${c}</span></div>`);
    }

    // تله‌های امتحانی مرتبط با شواهد فعلی
    // دو شکل داده در DB.examTraps هم‌زیستی دارند: شکل غنی database.js
    // (title/pattern/wrong/correct) و شکل کوتاه field-data.js
    // (tech/trap/rule/why). این‌جا هر دو را با fallback می‌خوانیم تا
    // هیچ تله‌ای «undefined» رندر نشود.
    if (res.traps && res.traps.length) {
      h += `<div class="hero-section-title">⚠ تله‌های امتحانی مرتبط</div>`;
      res.traps.forEach(t => {
        const title = t.title || t.trap || "تلهٔ امتحانی";
        const body  = t.correct || t.rule || "";
        const why   = t.why || t.pattern || "";
        h += `<div class="note amber" style="margin-bottom:6px">
        <b>${title}</b>${t.tech ? ` <span class="tag-info" style="font-size:var(--fs-2xs)">${t.tech}</span>` : ""}<br>
        <span style="font-size:var(--fs-sm)">${body}</span>
        ${why ? `<br><span style="font-size:var(--fs-xs);color:var(--muted)">چرا: ${why}</span>` : ""}
      </div>`;
      });
    }

    // ساختارهای کاندید (قهرمان)
    h += `<div class="hero-section-title">ساختارهای کاندید (مونتاژ از قطعات)</div>`;
    if (!res.formulaObj) {
      h += `<div class="empty-hint">ابتدا در فاز ۰ فرمول مولکولی را تأیید کنید تا موتور بتواند ساختار بسازد.</div>`;
    } else if (!res.candidates.length) {
      h += `<div class="empty-hint">با شواهد فعلی و این فرمول، ساختار سازگاری مونتاژ نشد. شواهد بیشتری در فازهای IR/NMR تیک بزنید یا فرمول را بازبینی کنید.</div>`;
    } else {
      const maxScore = res.candidates[0].score || 1;
      /* ساختارِ کاندید: اگر کاندید به یک مرجعِ شناخته‌شده وصل باشد و
         گرافِ اتصالش قطعی باشد، مولکولِ واقعی کشیده می‌شود. وگرنه همان
         نوارِ موتیف‌های قبلی می‌ماند — که ساختار نیست، ترتیبِ بلوک‌هاست،
         و برای کاندیدی که هنوز اتصالش معلوم نیست دقیقاً همان چیزی است
         که باید نشان داده شود. */
      const candidateStructure = (c) => {
        if (c.ref && window.Structure && Structure.depict &&
            Renderer.moleculeSVG && Inference.moleculeOf) {
          try {
            const mol = Inference.moleculeOf(c.ref);
            if (mol) return Renderer.moleculeSVG(Structure.depict(mol),
              { width: 300, height: 180, title: "ساختار " + (c.ref.en || c.ref.name || "") });
          } catch (e) { /* به نوارِ موتیف برمی‌گردیم */ }
        }
        return Renderer.renderChain(c.chain);
      };
      res.candidates.forEach((c, i) => {
        const pct = Math.max(8, Math.round((c.score / maxScore) * 100));
        const name = c.ref ? c.ref.name : "ساختار سازگار";
        h += `<div class="candidate ${i === 0 ? 'rank1' : ''}">
          <div class="cand-head">
            <span class="cand-rank">#${i + 1}</span>
            <span class="cand-name">${name}${c.ref ? ` <span class="en">(${c.ref.en})</span>` : ''}</span>
            <span class="cand-score">امتیاز سازگاری ${c.score} · <span class="en">${sub(c.formula)}</span></span>
          </div>
          <div class="cand-bar"><span style="width:${pct}%"></span></div>
          <div class="cand-svg">${candidateStructure(c)}</div>
          <div class="cand-note">فرمول فشرده: <span class="en">${c.condensed}</span>${c.ref && c.ref.note ? ` · <b>نکته تمایز:</b> ${c.ref.note}` : ''}</div>
          ${(c.connectivity && c.connectivity.length) ? `<div class="cand-conn">${c.connectivity.map(x =>
            `<span class="conn-row ${x.verdict}"><b>${x.verdict === "supports" ? "✓" : "✗"} ${x.fa}</b>${x.note ? `<span>${x.note}</span>` : ""}</span>`).join("")}</div>` : ''}
        </div>`;
      });
    }

    // قطعات کشف‌شده (با حذف زیرمجموعه‌های ضعیف‌تر برای کاهش نویز)
    const ev = new Set(res.evidence);
    let foundBlocks = DB.blocks
      .map(b => ({ b, fired: b.evidence.filter(e => ev.has(e)) }))
      .filter(x => x.fired.length > 0);
    foundBlocks = foundBlocks.filter(x => {
      // اگر بلوک دیگری همه شواهد این را دارد و شواهد بیشتری هم دارد، این را حذف کن
      return !foundBlocks.some(y =>
        y.b.id !== x.b.id &&
        x.fired.every(e => y.fired.includes(e)) &&
        y.fired.length > x.fired.length);
    });
    foundBlocks.sort((a, b) => b.fired.length - a.fired.length);
    const blocks = foundBlocks.map(x => x.b);
    if (blocks.length) {
      h += `<div class="hero-section-title">قطعات ساختاری کشف‌شده از شواهد</div>`;
      h += `<div>${Renderer.renderFragmentChips(blocks)}</div>`;
    }

    // مولکول‌های مرجع
    if (res.references.length) {
      h += `<div class="hero-section-title">نزدیک‌ترین مولکول‌های مرجع</div>`;
      const top = res.references[0];
      res.references.forEach(r => {
        const pct = Math.round(Math.min(1, r.score) * 100);
        h += `<div class="ref-row">
          <span class="cand-name" style="min-width:150px">${r.ref.name} <span class="en">${r.ref.formula}</span></span>
          <span class="ref-bar"><span style="width:${pct}%"></span></span>
          <span class="ref-score">${r.hit}/${r.total}</span>
        </div>`;
      });
    }

    if (!res.contradictions.length && !res.candidates.length && !foundBlocks.length && !res.references.length) {
      h += `<div class="empty-hint">هنوز شواهدی وارد نشده است. در فازهای مختلف مشاهدات طیفی را تیک بزنید، سپس این دکمه را دوباره بزنید.</div>`;
    }

    el("hero-body").innerHTML = h;
    hero.classList.add("show");
    if (hero.scrollIntoView) hero.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  /* ---------- کمک: تبدیل اعداد فرمول به زیرنویس ---------- */
  function sub(str) { return String(str).replace(/(\d+)/g, "<sub>$1</sub>"); }

  /* ---------- کمک: تیک زدن خودکار چک‌باکس متناظر با یک tag و ثبت در State ---------- */
  function autoTag(tag) {
    if (!tag) return true;
    const box = document.querySelector(`input[data-sig="${tag}"]`);
    // اگر این چک‌باکس به‌دلیل نبود هالوژن مربوطه در فرمول قفل شده، تیک نخور
    if (box && box.disabled) return false;
    State.set(tag, true);
    if (box && box.type === "checkbox") box.checked = true;
    refreshEvidenceCount();
    if (window.LiveViz) LiveViz.refresh();
    return true;
  }

  /* =================================================================
     همگام‌سازی چک‌باکس‌های هالید (IR/¹³C) با فرمول فعال فاز ۰.
     اگر فرمول تأییدشده فاقد Cl/Br/I/F باشد، چک‌باکس مربوطه غیرفعال و
     هشدار داده می‌شود تا کاربر اشتباهاً امضای هالیدی را تیک نزند.
     ================================================================= */
  function syncHalideChecklist() {
    const atoms = (State.formulaObj && State.formulaObj.atoms) || null;
    const hal = Calc.formulaHalogens(atoms);
    const map = [
      ["ir_cx",        atoms ? (hal.Cl || hal.Br || hal.I) : true, "ir-cx-warn"],
      ["c_ccl",        atoms ? hal.Cl : true,                       "c-ccl-warn"],
      ["c_cbr",        atoms ? hal.Br : true,                       "c-cbr-warn"],
      ["c_cf_quartet", atoms ? hal.F  : true,                       "c-cf-warn"],
      ["c_heavy_i",    atoms ? hal.I  : true,                       "c-ci-warn"]
    ];
    map.forEach(([tag, ok, warnId]) => {
      const box = document.querySelector(`input[data-sig="${tag}"]`);
      const warn = document.getElementById(warnId);
      if (!box) return;
      if (!ok) {
        box.checked = false;
        box.disabled = true;
        State.set(tag, false);
      } else {
        box.disabled = false;
      }
      if (warn) warn.style.display = ok ? "none" : "inline";
    });
    refreshEvidenceCount();
    if (window.LiveViz) LiveViz.refresh();
  }

  /* =================================================================
     موتورهای ورودی خام هوشمند — Smart Raw-Data Input Engines
     این بخش لایه‌ای روی چک‌باکس‌های دستی فازهای بالاست: کاربر عدد خام
     طیف را می‌دهد، اینجا هم به او توضیح فیزیکی می‌دهد و هم خودکار
     چک‌باکس/State متناظر را برای موتور استنتاج (فاز ۵) فعال می‌کند.
     ================================================================= */

  // ---------- فاز ۱: تحلیل‌گر هوشمند IR ----------
  function runSmartIR() {
    const raw = el("smart-ir-input").value;
    const out = el("out-smart-ir");
    const peaks = raw.split(",").map(s => parseFloat(s.trim())).filter(n => !isNaN(n));
    if (!peaks.length) return show(out, `<span class="tag-warn">حداقل یک عدد پیک (cm⁻¹) وارد کنید.</span>`);
    const results = Calc.smartIR(peaks);
    let h = `<strong>تحلیل پیک‌های وارد شده:</strong><ul>`;
    let tagged = 0, blocked = 0;
    results.forEach(r => {
      if (!r.hits.length) { h += `<li>پیک <b class="en">${r.peak} cm⁻¹</b>: در ناحیه اثر انگشت یا نامشخص — بررسی دستی پیشنهاد می‌شود.</li>`; return; }
      r.hits.forEach(hit => {
        h += `<li>پیک <b class="en">${r.peak} cm⁻¹</b> ← <b>${hit.fa}</b><br><span style="font-size:var(--fs-xs);color:var(--muted)">${hit.logic}</span></li>`;
        if (hit.tag) {
          const ok = autoTag(hit.tag);
          if (ok) tagged++;
          else { blocked++; h += `<li class="tag-warn">⚠ این پیک با امضای <b>${hit.fa}</b> مطابقت دارد اما چون فرمول فعال فاز ۰ فاقد هالوژن مربوطه است، تیک نخورد. اگر فرمول اشتباه وارد شده، اصلاحش کنید؛ در غیر این صورت این پیک را در ناحیهٔ خمش استخلاف آروماتیک (۶۹۰–۸۴۰) بررسی کنید.</li>`; }
        }
      });
      if (r.ringNote) h += `<li class="tag-info">⚠ خارج از بازه استاندارد کربونیل خطی؛ منطبق با: <b>${r.ringNote.fa}</b></li>`;
    });
    h += `</ul>`;
    if (tagged) h += `<div class="note blue">✓ ${tagged} شاهد به‌طور خودکار در چک‌باکس‌های این فاز تیک خورد و به موتور استنتاج (فاز ۵) تزریق شد.</div>`;
    if (blocked) h += `<div class="note amber">${blocked} شاهد به‌دلیل ناسازگاری با فرمول فعال، تیک نخورد (بالا مشخص شده).</div>`;
    show(out, h);
  }

  // ---------- فاز ۱: تشخیص ترکیبی الگوی استخلاف حلقه از روی چند باند OOP هم‌زمان ----------
  // برخلاف runSmartIR (که هر پیک را جدا تفسیر می‌کند)، این تابع کل مجموعهٔ پیک‌های
  // ناحیهٔ ۶۷۵-۹۰۰ cm⁻¹ را یک‌جا با DB.irOOPZones می‌سنجد و امتیاز تطابق هر الگوی
  // استخلافی (تک/اورتو/متا/پارا/سه‌گانه) را بر پایهٔ تعداد باندهای هم‌زمان یافت‌شده می‌دهد.
  function runOOPPattern() {
    const raw = el("oop-freqs-input").value;
    const out = el("out-oop-pattern");
    const freqs = raw.split(",").map(s => parseFloat(s.trim())).filter(n => !isNaN(n));
    if (!freqs.length) return show(out, `<span class="tag-warn">حداقل یک عدد موج (cm⁻¹) در ناحیهٔ ۶۷۵ تا ۹۰۰ وارد کنید.</span>`);
    const results = Calc.lookupOOPPattern(freqs);
    if (!results.length) return show(out, `<span class="tag-warn">هیچ الگوی استخلافی با این باندها مطابقت ندارد؛ بازهٔ ۶۷۵–۹۰۰ cm⁻¹ را بررسی کنید.</span>`);
    let h = `<strong>الگوهای محتمل استخلاف حلقه (به‌ترتیب امتیاز تطابق):</strong><ul>`;
    let tagged = false;
    results.forEach((r, i) => {
      const pct = Math.round(r.score * 100);
      const bandsTxt = r.matchedBands.map(b => `${b[0]}–${b[1]}`).join("، ");
      h += `<li><b>${r.fa}</b> — تطابق ${pct}% (${r.matchedBands.length}/${r.totalBands} باند: ${bandsTxt})`;
      if (r.intensity) h += `<br><span style="font-size:var(--fs-xs);color:var(--muted)">شدت: ${r.intensity}${r.adjacentH ? " · " + r.adjacentH + " هیدروژن مجاور" : ""}${r.isolatedH ? " · " + r.isolatedH + " هیدروژن منزوی" : ""}</span>`;
      if (r.note) h += `<br><span style="font-size:var(--fs-xs);color:var(--muted)">${r.note}</span>`;
      h += `</li>`;
      // فقط بهترین کاندیدا را در صورت تطابق کامل (همهٔ باندها) خودکار تیک می‌زنیم
      if (i === 0 && r.score === 1 && r.sig && !tagged) { const ok = autoTag(r.sig); if (ok) tagged = true; }
    });
    h += `</ul>`;
    if (results.length > 1 && results[0].score === results[1].score) {
      h += `<div class="note amber">⚠ چند الگو امتیاز یکسانی دارند؛ برای تمایز قطعی، ناحیهٔ اورتون/ترکیبی (۱۶۶۵–۲۰۰۰ cm⁻¹) را هم بررسی کنید (پایین همین کارت).</div>`;
    }
    if (tagged) h += `<div class="note blue">✓ بهترین تطابق به‌طور خودکار در چک‌باکس «الگوی استخلاف حلقه» بالا تیک خورد.</div>`;
    show(out, h);
  }

  // ---------- فاز ۰: تحلیل‌گر هوشمند قطعات جرمی ----------
  function runSmartMass() {
    const raw = el("smart-mass-input").value;
    const out = el("out-smart-mass");
    const masses = (raw.match(/\d+/g) || []).map(Number);
    if (!masses.length) return show(out, `<span class="tag-warn">حداقل یک عدد m/z وارد کنید.</span>`);
    const results = Calc.smartMassFragments(masses);
    let h = `<strong>تحلیل قطعات جرمی:</strong><ul>`;
    results.forEach(r => {
      if (r.info) {
        h += `<li>قطعه <b class="en">m/z=${r.mass}</b> = <b>${r.info.ion}</b><br><span style="font-size:var(--fs-xs);color:var(--muted)">${r.info.implies}</span></li>`;
        if (r.info.id) autoTag(r.info.id);
      } else {
        h += `<li>قطعه <b class="en">m/z=${r.mass}</b>: در دیتابیس قطعات رایج یافت نشد — می‌تواند یون مولکولی یا قطعه غیرمعمول باشد.</li>`;
      }
    });
    h += `</ul>`;
    show(out, h);
  }

  // ---------- فاز ۰: تحلیل‌گر نسبت ایزوتوپی M/M+2 ----------
  function runIsotope() {
    const m = parseFloat(el("iso-m").value);
    const m2 = parseFloat(el("iso-m2").value);
    const out = el("out-isotope");
    const r = Calc.isotopeRatio(m, m2);
    if (r.error) return show(out, `<span class="tag-warn">${r.error}</span>`);
    if (!r.hit) return show(out, `نسبت <b class="en">${r.ratio.toFixed(2)}</b>: با الگوهای رایج کلر/برم/گوگرد تطابق ندارد.`);
    show(out, `نسبت <b class="en">M/(M+2) = ${r.ratio.toFixed(2)}</b> ← احتمال قوی حضور <b>${r.hit.fa}</b><br><span style="font-size:var(--fs-sm);color:var(--muted)">${r.hit.logic}</span>`);
    if (r.hit.el === "Cl") autoTag("ms_cl");
    if (r.hit.el === "Br") autoTag("ms_br");
  }

  // ---------- فاز ۲: تحلیل‌گر هوشمند ¹³C ----------
  function runSmartC13() {
    const raw = el("smart-c13-input").value;
    const out = el("out-smart-c13");
    const results = Calc.smartC13(raw);
    if (!results.length) return show(out, `<span class="tag-warn">حداقل یک شیفت (ppm) وارد کنید.</span>`);
    let h = `<strong>محیط‌های کربنی شناسایی‌شده:</strong><ul>`;
    let blocked = 0;
    results.forEach(r => {
      if (!r.hits.length) { h += `<li>کربن در <b class="en">${r.ppm} ppm</b>: ناشناخته.</li>`; return; }
      r.hits.forEach(hit => {
        h += `<li>کربن در <b class="en">${r.ppm} ppm</b> ← <b>${hit.fa}</b><br><span style="font-size:var(--fs-xs);color:var(--muted)">${hit.logic}</span></li>`;
        const ok = autoTag(hit.tag);
        if (!ok) { blocked++; h += `<li class="tag-warn">⚠ امضای <b>${hit.fa}</b> چون در فرمول فعال آن هالوژن وجود ندارد، تیک نخورد؛ فرمول فاز ۰ را بازبینی کنید.</li>`; }
      });
      const det = Calc.classifyC13Detailed(r.ppm).filter(z => !r.hits.some(hh => hh.fa === z.fa));
      det.slice(0, 2).forEach(z => h += `<li style="opacity:.85">↳ جدول تفصیلی: <b>${z.fa}</b>${z.ex ? ` <span style="font-size:var(--fs-xs);color:var(--muted)">(${z.ex})</span>` : ""}</li>`);
    });
    h += `</ul><div class="note amber">یادآوری: کربن‌هایی که در طیف پهن‌باند هستند اما در DEPT-135 ظاهر نمی‌شوند، کربن نوع چهارم یا کربونیل‌اند.</div>`;
    show(out, h);
  }

  // ---------- فاز ۳: تحلیل‌گر هوشمند ¹H (شیفت + شکافت) ----------
  function runSmartNMR() {
    const raw = el("smart-nmr-input").value;
    const out = el("out-smart-nmr");
    const results = Calc.smartNMR(raw);
    if (!results.length) return show(out, `<span class="tag-warn">حداقل یک شیفت وارد کنید (مثال: 1.2(t), 3.5(s)).</span>`);
    let h = `<strong>تحلیل شیفت و شکافت:</strong><ul>`;
    results.forEach(r => {
      h += `<li>موقعیت <b class="en">${r.ppm} ppm</b>: <b>${r.zone.title}</b><br><span style="font-size:var(--fs-xs);color:var(--muted)">${r.zone.desc}</span>`;
      if (r.split) h += `<br><span style="font-size:var(--fs-xs);color:var(--green)">شکافت ${r.split.fa}: ${r.split.logic}</span>`;
      h += `</li>`;
      if (r.smart && r.smart.tag) autoTag(r.smart.tag);
    });
    h += `</ul>`;
    show(out, h);
  }

  // ---------- فاز ۴: کوپلاژ J + کارپلاس + COSY + دی‌استرئوتوپیک ----------
  function runAdvancedNMR() {
    const jRaw = el("adv-j-input").value;
    const cosyRaw = el("adv-cosy-input").value;
    const diastereo = el("adv-diastereo-chk").checked;
    const out = el("out-advanced-nmr");
    let h = "";

    const jVals = (jRaw.match(/\d+(\.\d+)?/g) || []).map(Number);
    if (jVals.length) {
      h += `<strong>ثابت‌های کوپلاژ:</strong><ul>`;
      Calc.smartJCoupling(jVals).forEach(r => {
        if (!r.hits.length) { h += `<li>J = <b class="en">${r.j} Hz</b>: الگوی پیچیده یا نامشخص.</li>`; return; }
        r.hits.forEach(hit => h += `<li>J = <b class="en">${r.j} Hz</b> ← <b>${hit.fa}</b><br><span style="font-size:var(--fs-xs);color:var(--muted)">${hit.logic}</span></li>`);
        const kp = Calc.karplusAngle(r.j);
        if (kp.solutions.length) h += `<li class="tag-info">معادله کارپلاس: زاویه دی‌هدرال محتمل بین <b class="en">${kp.min}°</b> تا <b class="en">${kp.max}°</b></li>`;
      });
      h += `</ul>`;
    }

    if (cosyRaw.trim()) {
      h += `<strong>همبستگی‌های COSY:</strong><ul>`;
      Calc.smartCOSY(cosyRaw).forEach(c => {
        h += `<li><span class="en">${c.a} ppm</span> (${c.zoneA.title}) ↔ <span class="en">${c.b} ppm</span> (${c.zoneB.title}) — این دو گروه از طریق ۳ پیوند (H–C–C–H) به هم متصل‌اند.</li>`;
      });
      h += `</ul>`;
    }

    if (diastereo) {
      h += `<div class="note amber"><b>هشدار دی‌استرئوتوپیک:</b> پروتون‌های −CH₂− مجاور مرکز کایرال از نظر مغناطیسی نامعادل‌اند؛ به‌جای یک سیگنال ساده، دو سیگنال با کوپلاژ ژمینال قوی (اغلب دو دوبلت درهم) دیده می‌شود.</div>`;
    }

    if (!h) h = `<span class="tag-warn">حداقل یکی از فیلدها را پر کنید.</span>`;
    show(out, h);
  }

  /* =================================================================
     فاز ۶ — آنالیز کلاسیک / شیمی تر
     ================================================================= */
  function renderWetChemUI() {
    const lb = el("lassaigne-list");
    if (lb) lb.innerHTML = DB.lassaigne.map(t => `
      <label class="chk good"><input type="checkbox" data-sig="${t.tag}"><span><b>${t.fa} (<span class="en">${t.el}</span>)</b> — ${t.positive}<br><span style="font-size:var(--fs-xs);color:var(--muted)">معرف: ${t.reagent}</span></span></label>`).join("");

    const ss = el("sol-class");
    if (ss) ss.innerHTML = `<option value="">— انتخاب کلاس —</option>` +
      DB.solubilityClasses.map(s => `<option value="${s.tag}" data-implies="${s.implies}">${s.id} — ${s.fa}</option>`).join("");

    const ft = el("functional-tests-list");
    if (ft) ft.innerHTML = DB.functionalTests.map(t => {
      if (t.classify) {
        const opts = Object.entries(t.classify).map(([k, v]) => `<option value="${k}">${v}</option>`).join("");
        return `<div class="card" style="margin:0">
          <b>${t.fa}</b> <span style="font-size:var(--fs-xs);color:var(--muted)">(${t.target})</span>
          <select data-testclassify="${t.id}" data-postag="${t.posTag}" style="margin-top:6px"><option value="">— نتیجه تست —</option>${opts}</select>
          ${t.note ? `<div style="font-size:var(--fs-xs);color:var(--muted);margin-top:4px">${t.note}</div>` : ""}</div>`;
      }
      const negTag = t.posTag.replace("_pos", "_neg");
      return `<div class="card" style="margin:0">
        <b>${t.fa}</b> <span style="font-size:var(--fs-xs);color:var(--muted)">(هدف: ${t.target})</span>
        <div style="display:flex;gap:16px;margin-top:6px">
          <label class="chk good"><input type="checkbox" data-sig="${t.posTag}"><span>مثبت ✓</span></label>
          <label class="chk"><input type="checkbox" data-sig="${negTag}"><span>منفی ✗</span></label>
        </div>
        <div style="font-size:var(--fs-xs);color:var(--muted);margin-top:4px">مثبت: ${t.positive}${t.note ? " · " + t.note : ""}</div></div>`;
    }).join("");

    const db = el("derivatization-list");
    if (db) db.innerHTML = DB.derivatization.map(d => `<tr><td>${d.group}</td><td>${d.reagent}</td><td>${d.product}</td></tr>`).join("");

    // پرکردن منوهای استخلاف در پنل UV آروماتیک
    const subOpts = `<option value="">— هیچ —</option>` + DB.uvAromatic.substituents.map(s => `<option value="${s.id}">${s.fa}</option>`).join("");
    ["uva-s1", "uva-s2"].forEach(id => { const n = el(id); if (n) n.innerHTML = subOpts; });

    // پرکردن جانشین‌های پیش‌بین شولری
    const shBox = el("shoolery-subs");
    if (shBox) shBox.innerHTML = DB.h1Shoolery.constants.filter(c => c.sigma > 0).map(c =>
      `<label class="chk" style="margin:0"><input type="checkbox" value="${c.id}"><span style="font-size:var(--fs-sm)">${c.fa} <span class="en">(+${c.sigma})</span></span></label>`).join("");
  }

  function runSolubility() {
    const sel = el("sol-class"), out = el("out-solubility");
    if (!sel.value) return show(out, `<span class="tag-warn">یک کلاس حلالیت انتخاب کنید.</span>`);
    autoTag(sel.value);
    const opt = sel.options[sel.selectedIndex];
    show(out, `کلاس <b>${opt.text}</b> ثبت شد.<br><span style="font-size:var(--fs-sm);color:var(--muted)">${opt.dataset.implies}</span><div class="note blue">✓ به موتور استنتاج (فاز ۵) تزریق شد.</div>`);
  }

  /* از posTag، پیشوندِ خانوادهٔ تست را می‌سازد و کلیدِ انتخاب‌شده را می‌چسباند:
     wet_lucas_any + "3"  → wet_lucas_3
     wet_hinsberg_1 + "2" → wet_hinsberg_2
     wet_hno2_1 + "1ar"   → wet_hno2_1ar
     پسوندِ _any/_pos/_<رقم> از انتهای posTag برداشته می‌شود. */
  function classifyTag(posTag, value) {
    const base = String(posTag || "").replace(/_(any|pos|neg|\d+[a-z]*)$/, "");
    return base + "_" + value;
  }

  function runWetChem() {
    const out = el("out-wetchem");
    // تستِ طبقه‌بندی‌شده (لوکاس، هینزبرگ، HNO₂، AgNO₃) دو شاهد می‌دهد:
    // «تست مثبت بود» و «نتیجه از کدام نوع بود». پیش‌تر فقط اولی ثبت می‌شد و
    // مقدارِ انتخاب‌شده دور ریخته می‌شد، پس تگ‌هایی که پایگاه برای تفکیکِ
    // ۱°/۲°/۳° داشت (wet_lucas_1/2/3، wet_hinsberg_2/3) هرگز فعال نمی‌شدند
    // و انتخابِ «واکنش فوری = الکل نوع سوم» با «بدون واکنش = نوع اول» برای
    // موتور یکسان بود.
    $$('select[data-testclassify]').forEach(sel => {
      if (!sel.value) return;
      autoTag(sel.dataset.postag);
      autoTag(classifyTag(sel.dataset.postag, sel.value));
    });
    const snap = State.snapshot();
    const active = Object.keys(snap).filter(k => k.indexOf("wet_") === 0 && snap[k] === true);
    if (!active.length) return show(out, `<span class="tag-warn">هنوز نتیجه‌ای ثبت نشده. تست‌ها را تیک بزنید یا نتیجهٔ طبقه‌بندی را انتخاب کنید.</span>`);
    const descMap = {};
    DB.lassaigne.forEach(t => descMap[t.tag] = `عنصر ${t.fa} (${t.el}) شناسایی شد`);
    DB.solubilityClasses.forEach(s => descMap[s.tag] = `کلاس حلالیت ${s.id}: ${s.implies}`);
    DB.functionalTests.forEach(t => { descMap[t.posTag] = `${t.fa} مثبت → ${t.target}`; descMap[t.posTag.replace('_pos', '_neg')] = `${t.fa} منفی`; });
    let h = `<strong>شواهد کلاسیک ثبت‌شده (${active.length}):</strong><ul>`;
    active.forEach(k => h += `<li>${descMap[k] || k}</li>`);
    h += `</ul><div class="note blue">✓ همهٔ این شواهد با <b>وزن بالا</b> وارد موتور استنتاج شدند. حالا به فاز ۵ بروید و «ساخت ساختارها» را بزنید.</div>`;
    show(out, h);
  }

  function runUVAromatic() {
    const base = el("uva-base").value, out = el("out-uv-aromatic");
    const subs = [];
    [["uva-s1", "uva-p1"], ["uva-s2", "uva-p2"]].forEach(([s, p]) => { const id = el(s).value; if (id) subs.push({ id, position: el(p).value }); });
    const r = Calc.woodwardFieserAromatic(base, subs);
    if (!r) return show(out, `<span class="tag-warn">پایه نامعتبر است.</span>`);
    let h = `<strong>محاسبهٔ قواعد اسکات (کربونیل آروماتیک):</strong><ul>` + r.steps.map(s => `<li>${s}</li>`).join("") + `</ul>`;
    h += `<div style="margin-top:8px;padding-top:8px;border-top:1px solid var(--border)"><strong>λ<sub>max</sub> تئوری (نوار K): <span class="big-num">${r.lambda} nm</span></strong></div>`;
    show(out, h);
  }

  function runHydrocarbon() {
    const raw = el("hc-input").value, out = el("out-hydrocarbon");
    const masses = (raw.match(/\d+/g) || []).map(Number);
    if (!masses.length) return show(out, `<span class="tag-warn">حداقل یک m/z وارد کنید.</span>`);
    const r = Calc.smartHydrocarbonProfile(masses);
    if (!r.ranked.length) return show(out, `قطعات وارد شده با سری‌های هیدروکربنی رایج تطابق روشنی ندارند؛ احتمالاً گروه عاملی/هترواتم دارید.`);
    let h = `<strong>طبقه‌بندی سری قطعات (مانده پیمانه ۱۴):</strong><ul>`;
    r.ranked.forEach(x => h += `<li><b>${x.series.klass}</b> — ${x.count} قطعه · <span class="en">${x.series.ions}</span><br><span style="font-size:var(--fs-xs);color:var(--muted)">${x.series.logic}</span></li>`);
    h += `</ul>`;
    if (r.hasLoss15) h += `<div class="note amber">افت <span class="en">M−15</span> شناسایی شد: خروج رادیکال متیل — نشانهٔ متیل انتهایی یا انشعاب.</div>`;
    if (r.dominant && r.dominant.tag) autoTag(r.dominant.tag);
    show(out, h);
  }

  function runShoolery() {
    const base = el("shoolery-base").value, out = el("out-shoolery");
    const subs = $$('#shoolery-subs input:checked').map(n => n.value);
    const r = Calc.predictProtonShift(base, subs);
    let h = `<strong>پیش‌بینی شیفت:</strong><ul>` + r.steps.map(s => `<li>${s}</li>`).join("") + `</ul>`;
    // بازهٔ اطمینان، نه یک عدد تک — دقت روش افزایشی محدود است
    h += `<div style="margin-top:8px;padding-top:8px;border-top:1px solid var(--border)">
      <strong>δ پیش‌بینی: <span class="big-num">${r.shift}</span> <span class="en" style="font-size:var(--fs-sm);color:var(--muted)">ppm</span></strong>
      <div style="margin-top:4px">بازهٔ محتمل: <b class="en" dir="ltr">${r.range[0]} – ${r.range[1]}</b>
        <span class="pill">±${r.tol}</span></div></div>`;
    (r.caveats || []).forEach(c => h += `<div class="note amber">⚠ ${c}</div>`);
    if (r.lit && r.lit.length) {
      h += `<div class="hero-section-title" style="margin:12px 0 6px;font-size:var(--fs-sm)">گروه‌های اندازه‌گیری‌شده در این بازه (کتابخانهٔ ¹H)</div>`;
      h += `<table style="margin:0"><tr><th>گروه</th><th>بازهٔ مرجع</th><th>تعدد</th></tr>` +
        r.lit.map(z => `<tr><td class="en">${z.group}</td><td class="en" dir="ltr">${z.lo}–${z.hi}</td><td class="en">${z.mult || "—"}</td></tr>`).join("") +
        `</table><div style="font-size:var(--fs-xs);color:var(--muted);margin-top:4px">این‌ها مقادیر واقعیِ جدول مرجع‌اند، نه محاسبهٔ افزایشی — برای صحت‌سنجی تخمین بالا.</div>`;
    }
    show(out, h);
  }

  function runUVReverse() {
    const lambda = parseFloat(el("uvr-lambda").value), out = el("out-uv-reverse");
    let eps = parseFloat(el("uvr-eps").value);
    const logeps = parseFloat(el("uvr-logeps").value);
    if (!(eps > 0) && logeps > 0) eps = Math.pow(10, logeps);
    const r = Calc.uvReverseLookup(lambda, eps);
    if (r.error) return show(out, `<span class="tag-warn">${r.error}</span>`);
    let h = `<strong>λ<sub>max</sub> = <span class="en">${r.lambda} nm</span>${eps > 0 ? ` · ε≈${Math.round(eps)}` : ""} — کروموفورهای محتمل:</strong><ul>`;
    if (!r.hits.length) h += `<li>در جدول استاندارد کروموفور یافت نشد.</li>`;
    r.hits.forEach(z => h += `<li><b>${z.fa}</b> <span style="font-size:var(--fs-xs);color:var(--muted)">(ε نوعی: ${z.epsHint})</span><br><span style="font-size:var(--fs-xs);color:var(--muted)">${z.note}</span></li>`);
    h += `</ul>`;
    if (r.epsNote) h += `<div class="note blue">تفسیر ε: ${r.epsNote}</div>`;
    show(out, h);
  }

  /* =================================================================
     تحلیل سیستم اسپینی NMR + رسم درخت شکافت
     ================================================================= */
  function runSpinSystem() {
    const freq = parseFloat(el("ss-freq").value), out = el("out-spin");
    const raw = el("ss-peaks").value;
    if (!(freq > 0)) return show(out, `<span class="tag-warn">فرکانس دستگاه (MHz) را وارد کنید.</span>`);
    const peaks = raw.split(/[,،\n]/).map(s => s.trim()).filter(Boolean).map(tok => {
      const m = tok.match(/([A-Za-z]\w*)\s*[:=]\s*(-?\d+(\.\d+)?)/);
      if (m) return { label: m[1], hz: parseFloat(m[2]) };
      const num = tok.match(/-?\d+(\.\d+)?/); return num ? { label: "?", hz: parseFloat(num[0]) } : null;
    }).filter(Boolean);
    if (!peaks.length) return show(out, `<span class="tag-warn">پیک‌ها را به شکل <span class="en">A:501, M:439</span> وارد کنید.</span>`);
    const rows = Calc.analyzeSpinSystem(peaks, freq);
    let h = `<strong>استخراج شیفت شیمیایی (δ = ν÷${freq}):</strong><table style="margin-top:8px"><tr><th>برچسب</th><th>ν (Hz)</th><th>δ (ppm)</th></tr>`;
    rows.forEach(r => h += `<tr><td>${r.label}</td><td class="en">${r.hz}</td><td class="en"><b>${r.ppm}</b></td></tr>`);
    h += `</table>`;
    // آزمون مرتبه‌اول برای هر زوج مجاور
    if (rows.length >= 2) {
      h += `<div style="margin-top:10px"><strong>آزمون مرتبه‌اول (Δν بین زوج‌ها، با فرض J نوعی ~۸Hz):</strong><ul>`;
      for (let i = 0; i < rows.length - 1; i++) {
        const dNu = Math.abs(rows[i].hz - rows[i + 1].hz);
        const fo = Calc.firstOrderCheck(dNu, 8);
        h += `<li>${rows[i].label}↔${rows[i + 1].label}: Δν=${dNu.toFixed(0)}Hz → Δν/J≈<b class="en">${fo.ratio}</b> ${fo.firstOrder ? '<span class="tag-ok">مرتبه‌اول ✓</span>' : '<span class="tag-warn">مرتبه‌دوم ⚠</span>'}</li>`;
      }
      h += `</ul><span style="font-size:var(--fs-xs);color:var(--muted)">برای J واقعی خودتان، از بخش درخت شکافت یا آنالیز پیشرفته J استفاده کنید.</span></div>`;
    }
    show(out, h);
  }

  function runEnvCount() {
    const smi = el("env-smiles").value.trim(), out = el("out-envcount");
    if (!smi) return show(out, `<span class="tag-warn">یک ساختار SMILES وارد کنید.</span>`);
    if (typeof Structure === "undefined") return show(out, `<span class="tag-warn">ماژول ساختار بارگذاری نشده.</span>`);
    const r = Structure.countEnvironments(smi);
    if (r.error) return show(out, `<span class="tag-warn">${r.error}</span>`);
    const af = Object.entries(r.formulaAtoms).map(([e, n]) => `${e}${n > 1 ? n : ""}`).join("");
    let h = `<div style="display:flex;gap:20px;flex-wrap:wrap;margin-bottom:10px">
      <div><span style="font-size:var(--fs-xs);color:var(--muted)">\u0645\u062d\u06cc\u0637\u200c\u0647\u0627\u06cc \u00b9\u00b3C</span><br><span class="big-num">${r.carbons}</span></div>
      <div><span style="font-size:var(--fs-xs);color:var(--muted)">\u0645\u062d\u06cc\u0637\u200c\u0647\u0627\u06cc \u00b9H</span><br><span class="big-num">${r.protons}</span></div>
      <div><span style="font-size:var(--fs-xs);color:var(--muted)">\u0641\u0631\u0645\u0648\u0644</span><br><b class="en">${af} \u00b7 H${r.totalH}</b></div>
    </div>`;
    h += `<strong>\u0645\u062d\u06cc\u0637\u200c\u0647\u0627\u06cc \u06a9\u0631\u0628\u0646:</strong><ul style="margin:4px 0">`;
    r.cEnvList.forEach(c => h += `<li>${c.kind}${c.arom ? " (\u0622\u0631\u0648\u0645\u0627\u062a\u06cc\u06a9)" : ""}${c.count > 1 ? ` \u00d7 ${c.count} \u06a9\u0631\u0628\u0646 \u0645\u0639\u0627\u062f\u0644` : ""}</li>`);
    h += `</ul><strong>\u0645\u062d\u06cc\u0637\u200c\u0647\u0627\u06cc \u067e\u0631\u0648\u062a\u0648\u0646:</strong><ul style="margin:4px 0">`;
    r.hEnvList.forEach(p => h += `<li>${p.kind}${p.exch ? " (\u062a\u0628\u0627\u062f\u0644\u06cc \u0628\u0627 D\u2082O)" : ""} \u2014 ${p.Htot}H${p.count > 1 ? ` (\u0627\u0632 ${p.count} \u06af\u0631\u0648\u0647 \u0645\u0639\u0627\u062f\u0644)` : ""}</li>`);
    h += `</ul>`;
    if (r.exchangeableEnvs) h += `<div class="note blue">${r.exchangeableEnvs} \u0645\u062d\u06cc\u0637 \u062a\u0628\u0627\u062f\u0644\u06cc (OH/NH) \u06a9\u0647 \u0628\u0627 \u0627\u0641\u0632\u0648\u062f\u0646 D\u2082O \u0645\u062d\u0648 \u0645\u06cc\u200c\u0634\u0648\u0646\u062f.</div>`;
    h += `<div class="note amber" style="font-size:var(--fs-xs)">\u062a\u0648\u062c\u0647: \u0634\u0645\u0627\u0631\u0634 \u0628\u0631 \u067e\u0627\u06cc\u0647\u0654 \u062a\u0642\u0627\u0631\u0646 \u0633\u0627\u062e\u062a\u0627\u0631\u06cc \u0627\u0633\u062a\u061b \u067e\u0631\u0648\u062a\u0648\u0646\u200c\u0647\u0627\u06cc \u062f\u06cc\u0627\u0633\u062a\u0631\u0648\u062a\u0648\u067e\u06cc\u06a9 \u062c\u062f\u0627\u06af\u0627\u0646\u0647 \u0634\u0645\u0631\u062f\u0647 \u0646\u0645\u06cc\u200c\u0634\u0648\u0646\u062f.</div>`;
    show(out, h);
    const symBox = el("sym-diagram");
    if (symBox && typeof Renderer !== "undefined" && Renderer.symmetrySVG) {
      /* مختصات از depict می‌آید نه از symmetryLayout: چیدمانِ فنری طولِ
         پیوندها را ناهموار و شش‌ضلعی را کج می‌کرد، و همان تصویری که قرار
         بود تقارن را *نشان* بدهد خودش نامتقارن درمی‌آمد. اگر depict در
         دسترس نبود (نسخهٔ قدیمی‌ترِ structure.js) به همان چیدمانِ فنری
         برمی‌گردیم تا این بخش هیچ‌وقت خالی نماند. */
      let lay = null;
      try {
        if (Structure.depict) {
          const mol = Structure.computeHydrogens(Structure.parseSMILES(smi));
          if (mol.atoms.length) lay = Structure.depict(mol);
        }
      } catch (e) { lay = null; }
      if (!lay) lay = Structure.symmetryLayout(smi);
      if (!lay.error) {
        const rs = (Renderer.moleculeSVG && lay.rings)
          ? Renderer.moleculeSVG(lay, { mode: "symmetry", width: 560, height: 320 })
          : Renderer.symmetrySVG(lay);
        const legend = lay.legend.map(l => {
          const col = rs.palette[l.classId % rs.palette.length];
          return `<span style="display:inline-flex;align-items:center;gap:5px;margin:2px 8px 2px 0;font-size:var(--fs-xs)"><span style="width:12px;height:12px;border-radius:50%;background:${col};display:inline-block"></span>${l.kind}${l.count > 1 ? " \u00d7" + l.count : ""}</span>`;
        }).join("");
        symBox.innerHTML = `<div style="font-size:var(--fs-sm);color:var(--muted);margin-bottom:6px">\u0646\u0642\u0634\u0647\u0654 \u062a\u0642\u0627\u0631\u0646 \u2014 \u0627\u062a\u0645\u200c\u0647\u0627\u06cc <b>\u0647\u0645\u200c\u0645\u062d\u06cc\u0637</b> \u0647\u0645\u200c\u0631\u0646\u06af\u200c\u0627\u0646\u062f (\u0647\u0631 \u0631\u0646\u06af = \u06cc\u06a9 \u0645\u062d\u06cc\u0637 \u0645\u062c\u0632\u0627):</div>${rs.svg}<div style="margin-top:8px">${legend}</div>`;
        symBox.style.display = "block";
      }
    }
  }

  function runSplitTree() {
    const raw = el("ss-jtree").value, out = el("out-splittree");
    const js = (raw.match(/\d+(\.\d+)?/g) || []).map(Number).filter(j => j > 0);
    if (!js.length) return show(out, `<span class="tag-warn">حداقل یک ثابت J (Hz) وارد کنید.</span>`);
    const couplings = js.map(j => ({ j, n: 1 }));
    const multiplicity = ["s", "d", "dd", "ddd", "dddd"][js.length] || `${js.length}×d`;
    out.innerHTML = `<div style="font-size:var(--fs-sm);color:var(--muted);margin-bottom:6px">با ${js.length} کوپلاژ نامعادل، الگوی حاصل یک <b>${multiplicity}</b> است (${Math.pow(2, js.length)} خط در حالت حل‌شده).</div>` + Renderer.splittingTree(couplings);
    out.style.display = "block";
  }

  /* =================================================================
     آشتی انتگرال ¹H با تعداد هیدروژن فرمول
     ================================================================= */
  function runIntegrals() {
    const out = el("out-integrals");
    const raw = (el("integ-input").value.match(/\d+(\.\d+)?/g) || []).map(Number);
    let totalH = parseInt(el("integ-totalh").value) || 0;
    if (!totalH && State.formulaObj && State.formulaObj.atoms) totalH = State.formulaObj.atoms.H || 0;
    const r = Calc.reconcileIntegrals(raw, totalH);
    if (r.error) return show(out, `<span class="tag-warn">${r.error}</span>`);

    let h = `<div style="display:flex;gap:18px;flex-wrap:wrap;margin-bottom:10px">
      <div><span style="font-size:var(--fs-2xs);color:var(--muted)">هیدروژن فرمول</span><br><b class="big-num">${r.totalH}</b></div>
      <div><span style="font-size:var(--fs-2xs);color:var(--muted)">پروتون شمرده‌شده</span><br><b class="big-num">${r.best.total}</b></div>
      <div><span style="font-size:var(--fs-2xs);color:var(--muted)">مقیاس</span><br><b class="en" dir="ltr">×${(Math.round(r.best.scale*1000)/1000)}</b></div>
    </div>`;
    h += `<div style="font-size:var(--fs-xs);color:var(--muted);margin-bottom:8px">فرض مقیاس: ${r.best.basis}</div>`;
    h += `<table style="margin:0"><tr><th>انتگرال خوانده‌شده</th><th>پروتون محاسبه‌شده</th><th>تخصیص</th><th>انحراف</th></tr>` +
      r.rows.map(x => `<tr><td class="en">${x.raw}</td><td class="en">${x.protons}</td><td class="en"><b>${x.assigned}H</b></td><td class="en">${x.off > 0 ? "+" : ""}${x.off}</td></tr>`).join("") +
      `</table>`;
    const cls = r.best.miss === 0 ? "green" : (r.best.miss > 0 ? "amber" : "amber");
    h += `<div class="note ${cls}" style="margin-top:10px">${r.verdict}</div>`;
    r.warnings.forEach(w => h += `<div class="note blue">${w}</div>`);
    // اگر پروتون گم‌شده داریم و شاهد تبادلی هم تیک خورده، صریح تأیید کن
    if (r.best.miss > 0 && (State.data.h_d2o || State.data.ir_oh_alc || State.data.ir_nh || State.data.ir_oh_acid))
      h += `<div class="note green">✓ شاهد تبادلی (OH/NH) از قبل تیک خورده است و با ${r.best.miss} پروتون گم‌شده می‌خواند.</div>`;
    show(out, h);
  }

  /* =================================================================
     پنل‌های شناسایی کلاسیک: تست‌های رنگی، هینزبرگ، لوکاس
     ================================================================= */
  function renderClassicalPanels() {
    const ct = el("color-tests-list");
    if (ct) ct.innerHTML = DB.colorComplexTests.map(t => `
      <div class="card" style="margin:0;border-color:var(--amber)">
        <b>${t.target}</b> <span style="font-size:var(--fs-xs);color:var(--muted)">— معرف: ${t.reagent}</span>
        <div style="margin:6px 0;font-size:var(--fs-sm)">رنگ: ${t.before !== "—" ? `<span style="opacity:.8">${t.before}</span> ← ` : ""}<b style="color:var(--amber)">${t.after}</b>${t.colorChange ? ' <span class="en" style="font-size:var(--fs-2xs);color:var(--muted)">(تغییر رنگ)</span>' : ""}</div>
        <div style="font-size:var(--fs-xs);color:var(--muted);margin-bottom:6px">کمپلکس: ${t.complex}<br>${t.logic}</div>
        <label class="chk good" style="margin:0"><input type="checkbox" data-sig="${t.posTag}"><span>نتیجه مثبت</span></label>
      </div>`).join("");

    const hb = el("hinsberg-detail");
    if (hb) {
      const d = DB.hinsbergDetail;
      hb.innerHTML = `<div class="note blue">معرف: <b>${d.reagent}</b><br>${d.principle}</div>
        <table style="margin-top:8px"><tr><th>نوع آمین</th><th>واکنش</th><th>در باز</th><th>با اسیدی‌کردن</th><th>نتیجه</th></tr>
        ${d.types.map(t => `<tr><td><b>${t.type}</b></td><td style="font-size:var(--fs-xs)">${t.reaction}</td><td style="font-size:var(--fs-xs)">${t.inBase}</td><td style="font-size:var(--fs-xs)">${t.onAcid}</td><td style="font-size:var(--fs-xs)"><b>${t.result}</b></td></tr>`).join("")}</table>
        <div class="note amber" style="margin-top:8px">⚠ تله: ${d.trap}</div>`;
    }

    const lc = el("lucas-detail");
    if (lc) {
      const d = DB.lucasDetail;
      lc.innerHTML = `<div class="note blue">معرف: <b>${d.reagent}</b><br><b>دامنه:</b> ${d.scope}</div>
        <div style="margin:8px 0"><b>مکانیسم (SN1):</b> <span style="font-size:var(--fs-sm)">${d.mechanism}</span></div>
        <table><tr><th>نوع الکل</th><th>سرعت واکنش</th><th>دلیل</th></tr>
        ${d.outcomes.map(o => `<tr><td><b>${o.type}</b></td><td>${o.rate}</td><td style="font-size:var(--fs-xs)">${o.why}</td></tr>`).join("")}</table>
        <div style="margin-top:8px"><b>استثناها و نکات کلیدی:</b><ul style="margin:6px 0">${d.exceptions.map(e => `<li style="font-size:var(--fs-sm)">${e}</li>`).join("")}</ul></div>
        <div class="note amber">محدودیت: ${d.limitation}</div>`;
    }

    const ee = el("env-examples-list");
    if (ee) ee.innerHTML = DB.nmrEnvironmentExamples.map(x =>
      `<tr><td>${x.name}</td><td class="en">${x.h}</td><td class="en">${x.c}</td><td style="font-size:var(--fs-xs);color:var(--muted)">${x.note || ""}</td></tr>`).join("");

    const fc = el("solubility-flowchart");
    if (fc && typeof Renderer !== "undefined" && Renderer.solubilityFlowchart) fc.innerHTML = Renderer.solubilityFlowchart();
  }

  /* =================================================================
     یابنده‌های تفصیلی پیک: IR ، ¹H ، ¹³C (چک‌لیست قابل‌تیک با جزئیات)
     ================================================================= */
  function fmtRange(a, b) { return `${a}–${b}`; }

  function renderIRFinder() {
    const box = el("ir-finder-list");
    if (!box) return;
    // مرتب‌سازی نواحی IR از فرکانس بالا به پایین + غنی‌سازی با شکل/شدت
    const zones = DB.irSmartZones.filter(z => z.tag).slice().sort((a, b) => b.max - a.max);
    box.innerHTML = zones.map(z => {
      // نزدیک‌ترین باند irCharacteristic برای شکل/شدت
      const c = DB.irCharacteristic.find(x => x.lo <= z.max && x.hi >= z.min &&
        (x.group.includes(z.fa.slice(0, 3)) || Math.abs((x.lo + x.hi) / 2 - (z.min + z.max) / 2) < 400));
      const meta = c ? ` · شدت: ${c.intensity}${c.shape ? " · شکل: " + c.shape : ""}` : "";
      return `<label class="chk good"><input type="checkbox" data-sig="${z.tag}"><span><b class="en">${fmtRange(z.min, z.max)} cm⁻¹</b> — ${z.fa}<span style="font-size:var(--fs-xs);color:var(--muted)">${meta}</span><br><span style="font-size:var(--fs-xs);color:var(--muted)">${z.logic}</span></span></label>`;
    }).join("");
  }

  function renderH1Finder() {
    const box = el("h1-finder-list");
    if (!box) return;
    box.innerHTML = DB.h1SmartZones.map(z =>
      `<label class="chk good"><input type="checkbox" data-sig="${z.tag}"><span><b class="en">δ ${fmtRange(z.min, z.max)} ppm</b> — ${z.fa}<br><span style="font-size:var(--fs-xs);color:var(--muted)">${z.logic}</span></span></label>`).join("");
  }

  function renderC13Finder() {
    const box = el("c13-finder-list");
    if (!box) return;
    box.innerHTML = DB.c13SmartZones.map(z => {
      const subs = DB.c13Detailed.filter(d => d.min >= z.min - 5 && d.max <= z.max + 5).slice(0, 3)
        .map(d => `${d.fa} (${d.ex || ""})`).join("؛ ");
      return `<label class="chk"><input type="checkbox" data-sig="${z.tag}"><span><b class="en">δ ${fmtRange(z.min, z.max)} ppm</b> — ${z.fa}<br><span style="font-size:var(--fs-xs);color:var(--muted)">${z.logic}${subs ? "<br>زیرناحیه‌ها: " + subs : ""}</span></span></label>`;
    }).join("");
  }

  /* ---------- مرجع: جدول باندهای اورتون/ترکیبی IR (۱۶۶۵-۲۰۰۰) + تبصرهٔ تداخل نیترو ---------- */
  function renderOOPReference() {
    const box = el("oop-overtone-list");
    if (box && DB.irOvertonePatterns) {
      box.innerHTML = DB.irOvertonePatterns.map(p =>
        `<tr><td>${p.fa}</td><td>${p.shape}</td></tr>`).join("");
    }
    const cav = el("oop-caveat-note");
    if (cav && DB.irOOPCaveats && DB.irOOPCaveats.length) {
      cav.innerHTML = DB.irOOPCaveats.map(c => `⚠ <b>${c.fa}:</b> ${c.note}`).join("<br>");
    }
  }

  /* ---------- مرجع ثابت: تله‌های تست کیفی + ردیاب واکنش‌ها (رندر یک‌بار از DB) ---------- */
  function renderReferenceTables() {
    const trapBox = el("qual-traps-list");
    if (trapBox) {
      trapBox.innerHTML = DB.qualitativeTraps.map(t => `
        <tr><td>${t.test}</td><td>${t.target}</td><td>${t.trap}<br><span style="font-size:var(--fs-xs);color:var(--muted)">${t.reason}</span></td></tr>
      `).join("");
    }
    const reactBox = el("reaction-tracking-list");
    if (reactBox) {
      reactBox.innerHTML = DB.reactionTracking.map(r => `
        <div class="tree-node"><strong>${r.reaction}</strong>
          <div class="desc" style="display:block;margin-top:8px">
            <ul style="margin:0;padding-inline-start:18px">${r.changes.map(c => `<li>${c}</li>`).join("")}</ul>
          </div>
        </div>`).join("");
    }
    const heteroBox = el("hetero2d-list");
    if (heteroBox) {
      heteroBox.innerHTML = DB.hetero2DPatterns.map(p => `
        <li><b>${p.type}</b> (<span class="en">${p.cShift}</span>، روش: <span class="en">${p.method}</span>)<br><span style="font-size:var(--fs-xs);color:var(--muted)">${p.note}</span></li>
      `).join("");
    }
  }

  /* =================================================================
     بررسی تقارن (دکمهٔ فاز ۲) — قبلاً تعریف نشده بود و دکمهٔ HTML
     onclick="runSymmetryCheck()" با خطای ReferenceError مواجه می‌شد.
     ================================================================= */
  function runSymmetryCheck() {
    const out = el("out-symmetry");
    const peaks = parseInt(el("sym-cpeaks").value) || 0;
    let totalC = parseInt(el("sym-cformula").value) || 0;
    if (!totalC && State.formulaObj && State.formulaObj.atoms) totalC = State.formulaObj.atoms.C || 0;
    if (!peaks || !totalC) return show(out, `<span class="tag-warn">تعداد پیک ¹³C مشاهده‌شده را وارد کنید و تعداد کربن فرمول را هم بدهید (یا ابتدا فرمول را در فاز ۰ تأیید کنید).</span>`);
    const r = Calc.analyzeCarbonSymmetry(totalC, peaks);
    if (r.error) return show(out, `<span class="tag-warn">${r.error}</span>`);
    let h = `<div style="display:flex;gap:16px;flex-wrap:wrap;margin-bottom:8px">
      <div><span style="font-size:var(--fs-xs);color:var(--muted)">کربن فرمول</span><br><b class="big-num">${r.totalC}</b></div>
      <div><span style="font-size:var(--fs-xs);color:var(--muted)">پیک مشاهده‌شده</span><br><b class="big-num">${r.observedPeaks}</b></div>
      <div><span style="font-size:var(--fs-xs);color:var(--muted)">نسبت</span><br><b class="big-num">${r.ratio}</b></div>
    </div>`;
    h += `<div class="note ${r.isExact ? "blue" : "amber"}">${r.verdict}</div>`;
    if (r.divisors.length) h += `<div style="font-size:var(--fs-xs);color:var(--muted);margin-top:6px">مقسوم‌علیه‌های ممکن برای فاکتور تقارن: ${r.divisors.join("، ")}</div>`;
    show(out, h);
  }

  /* =================================================================
     طبقه‌بندی سریع کوپلاژ J (دکمهٔ فاز ۳) — قبلاً تعریف نشده بود.
     ================================================================= */
  function runJClassify() {
    const out = el("out-jclassify");
    const raw = el("jc-input").value;
    const js = (raw.match(/\d+(\.\d+)?/g) || []).map(Number).filter(j => j > 0);
    if (!js.length) return show(out, `<span class="tag-warn">حداقل یک ثابت J (Hz) وارد کنید.</span>`);
    let h = `<table style="margin:0"><tr><th>J (Hz)</th><th>هندسه/سیستم محتمل</th></tr>`;
    js.forEach(j => {
      const zones = Calc.jToStereochem(j);
      let cell = zones.length
        ? zones.map(z => `<b>${z.kind ? `<span class="en">${z.kind}</span> · ` : ""}${z.fa}</b> <span style="color:var(--muted)">— ${z.logic}</span>`).join("<br>")
        : "در بازهٔ استاندارد شناخته‌شده‌ای قرار نمی‌گیرد.";
      // حلقه‌های هترو-آروماتیک: عدد J موضع استخلاف را مشخص می‌کند
      const het = Calc.jHeterocyclicMatches ? Calc.jHeterocyclicMatches(j) : [];
      if (het.length) {
        cell += `<br><span class="tag-info">حلقهٔ هترو</span> ` + het.map(x =>
          `<b>${x.fa}</b> <span class="en">${x.pair}=${x.value}</span>`).join(" · ");
        const withNote = het.find(x => x.note);
        if (withNote) cell += `<br><span style="font-size:var(--fs-xs);color:var(--muted)">${withNote.note}</span>`;
      }
      // کوپلاژ ناجورهسته (H–F، H–P، ¹J C–H) — برای Jهای غیرعادی بزرگ
      const hn = Calc.jHeteronuclearMatches ? Calc.jHeteronuclearMatches(j) : [];
      if (hn.length) {
        cell += `<br><span class="tag-warn">ناجورهسته</span> ` + hn.map(x => `<b>${x.fa}</b>`).join(" · ");
      }
      h += `<tr><td class="en">${j}</td><td style="font-size:var(--fs-sm)">${cell}</td></tr>`;
    });
    h += `</table>`;
    h += `<div class="note blue">برای یک عدد J چند تفسیر ممکن فهرست می‌شود؛ انتخاب نهایی با تقاطع‌دادن شیفت، انتگرال و تعدد است. مثلاً <span class="en">J≈۷</span> در زنجیرهٔ باز «ویسینال با چرخش آزاد» است، نه آلکن سیس.</div>`;
    show(out, h);
  }

  /* =================================================================
     جست‌وجوی سوالات فیلدِ هم‌فرمول (فاز ۵) — قبلاً تعریف نشده بود.
     از فرمول فعال (State.formulaObj، تأییدشده در فاز ۰) استفاده می‌کند
     و در DB.fieldProblems (بارگذاری‌شده توسط field-data.js) می‌گردد.
     ================================================================= */
  function runFieldMatch() {
    const out = el("field-match");
    if (!State.formulaObj) return show(out, `<span class="tag-warn">ابتدا در فاز ۰ یک فرمول را تأیید کنید.</span>`);
    if (typeof DB === "undefined" || !DB.fieldProblems) return show(out, `<span class="tag-warn">بانک سوالات فیلد بارگذاری نشده است.</span>`);
    const target = State.formulaObj.formula;
    const list = DB.fieldProblems.filter(p => p.formula === target);
    if (!list.length) return show(out, `<span class="tag-warn">هیچ سؤال فیلدی با فرمول ${sub(target)} در بانک یافت نشد.</span>`);
    let h = `<div class="note blue" style="margin-bottom:10px">${list.length} سؤال با فرمول <b class="en">${sub(target)}</b> پیدا شد:</div>`;
    h += list.map(p => `
      <div class="card" style="margin:0 0 10px">
        <div style="display:flex;justify-content:space-between;align-items:baseline;gap:8px;flex-wrap:wrap">
          <b>${p.name} <span class="en" style="font-weight:400;color:var(--muted)">${p.en || ""}</span></b>
          <span class="pill">فیلد ${p.field || "—"}</span>
        </div>
        <div style="margin:6px 0;font-size:var(--fs-sm);color:var(--muted)">IHD=${p.ihd ?? "—"} · قطعات: ${(p.blocks || []).join("، ") || "—"}</div>
        ${p.trap ? `<div class="note amber" style="font-size:var(--fs-sm)"><b>تلهٔ امتحانی:</b> ${p.trap}</div>` : ""}
      </div>`).join("");
    show(out, h);
  }

  /* ---------- ثبت رویدادها روی window برای دکمه‌های inline ---------- */
  Object.assign(window, {
    runFormula, runFragment, runCarbonyl, runUV, runDNMR, runMeta,
    runDept, updateRuler, runMaster,
    runSmartIR, runOOPPattern, runSmartMass, runIsotope, runSmartC13, runSmartNMR, runAdvancedNMR,
    runSolubility, runWetChem, runUVAromatic, runHydrocarbon, runUVReverse, runShoolery,
    runSpinSystem, runSplitTree, runEnvCount, runSymmetryCheck, runJClassify, runFieldMatch,
    runIntegrals,
    toggleFormMode: () => {
      const mode = $("input[name=formode]:checked").value;
      el("form-mass-block").style.display = mode === "mass" ? "block" : "none";
      el("form-atoms-block").style.display = mode === "atoms" ? "block" : "none";
    }
  });

  // مقداردهی اولیه پس از بارگذاری
  document.addEventListener("DOMContentLoaded", () => {
    runDept("normal", $("#dept-ctrl button"));
    updateRuler(7);
    renderReferenceTables();
    renderWetChemUI();
    renderClassicalPanels();
    renderIRFinder();
    renderH1Finder();
    renderC13Finder();
    renderOOPReference();
    syncHalideChecklist();
  });
})();