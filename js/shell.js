/* =====================================================================
   پوستهٔ برنامه — shell.js
   ---------------------------------------------------------------------
   این ماژول به علمِ برنامه دست نمی‌زند؛ معماریِ اطلاعات و رفتارِ پوسته را
   می‌سازد:

     ۱) آیکون‌ها — یک خانوادهٔ واحد (خطی، ۲۴px، ضخامت ۱.۷) که این‌جا
        تعریف شده و در نوارِ کنار و پالتِ فرمان استفاده می‌شود.
     ۲) سرِ مرحله — شمارهٔ مرحله، عنوان، و خلاصه‌ای که از همان <strong>
        ابتدای بنرِ آموزشیِ موجود بیرون کشیده می‌شود (محتوای تازه ساخته
        نمی‌شود). بقیهٔ بنر به ستونِ زمینه می‌رود.
     ۳) افشای پله‌ای — پنل‌های درجهٔ دومِ هر مرحله در گروه‌های تاشو
        می‌روند؛ جدولِ IA پایین می‌گوید کدام باز بماند.
     ۴) یک کنشِ اصلی در هر مرحله — دکمه‌ها پیش‌فرض آرام‌اند و فقط یکی
        primary می‌شود. مرحله‌هایی که کارشان تیک‌زدنِ شواهد است، کنشِ
        اصلی‌شان «مرحلهٔ بعد» است.
     ۵) خلاصهٔ ترکیب — پنلِ ماندگارِ ستونِ زمینه: فرمول، IHD، جرم، قاعدهٔ
        نیتروژن، اتم‌ها، سرنخِ ایزوتوپی، شواهد به تفکیک تکنیک، و کاندیدِ
        نخستِ موتور. همه از داده‌های واقعیِ State و DOM؛ هیچ عددی ساخته
        نمی‌شود.
     ۶) کاشیِ الگوی ایزوتوپی — پنج ردیفِ چک‌باکسی به کاشی‌هایی با امضای
        میله‌ایِ خوشه تبدیل می‌شود. همان <input> اصلی جابه‌جا می‌شود، پس
        data-sig و نشست دست‌نخورده می‌مانند.
     ۷) پوسته روشن/تاریک، جمع‌شدن نوارِ کنار، و پالتِ فرمان (Ctrl+K).

   وابستگی: هیچ. فقط DOM. باید بعد از ماژول‌هایی بارگذاری شود که کارت
   تزریق می‌کنند (nmr-peak-library، field-ui، reference-tables، practice)
   و پیش از session.js که فازِ ذخیره‌شده را برمی‌گرداند.
   ===================================================================== */
(function (root) {
  "use strict";

  var FA = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
  function faNum(n) {
    return String(n).split("").map(function (c) {
      return /[0-9]/.test(c) ? FA[+c] : c;
    }).join("");
  }
  function el(id) { return document.getElementById(id); }
  function esc(t) {
    return String(t).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  /* ==================================================================
     ۱) آیکون‌ها — یک خانواده، ضخامتِ یکسان، بی‌تزئین
     ================================================================== */
  function svg(d) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" ' +
      'stroke-linecap="round" stroke-linejoin="round">' + d + "</svg>";
  }
  var ICONS = {
    /* اتم — جرمی و فرمول */
    phase0: svg('<circle cx="12" cy="12" r="2.2"/><ellipse cx="12" cy="12" rx="9.5" ry="4.2"/>' +
                '<ellipse cx="12" cy="12" rx="9.5" ry="4.2" transform="rotate(60 12 12)"/>' +
                '<ellipse cx="12" cy="12" rx="9.5" ry="4.2" transform="rotate(120 12 12)"/>'),
    /* موجِ جذب — فروسرخ و UV */
    phase1: svg('<path d="M2 15c2.2 0 2.4-7 4.6-7s2.4 7 4.6 7 2.4-9 4.6-9S18.2 15 22 15"/>'),
    /* حلقهٔ کربنی — کربن‑۱۳ */
    phase2: svg('<path d="M12 2.8 20 7.4v9.2L12 21.2 4 16.6V7.4z"/><circle cx="12" cy="12" r="1.6"/>'),
    /* خطوطِ طیف — پروتون */
    phase3: svg('<path d="M4 20V9M8.6 20V4.4M13.2 20v-8.4M17.8 20V6.6M22 20v-4"/>'),
    /* شبکهٔ همبستگی — دوبعدی */
    phase4: svg('<rect x="3.2" y="3.2" width="17.6" height="17.6" rx="2.4"/>' +
                '<path d="M3.2 9.6h17.6M3.2 15h17.6M9.6 3.2v17.6M15 3.2v17.6"/>'),
    /* بالنِ آزمایش — آنالیز کلاسیک */
    phase6: svg('<path d="M9.4 3v4.6L5 16a1.9 1.9 0 0 0 1.6 2.9h10.8A1.9 1.9 0 0 0 19 16l-4.4-8.4V3"/>' +
                '<path d="M8.2 3h7.6M7.6 13.2h8.8"/>'),
    /* گره‌های مولکول — استنتاج ساختار */
    phase5: svg('<circle cx="6" cy="6.6" r="2.4"/><circle cx="18" cy="6.6" r="2.4"/>' +
                '<circle cx="12" cy="17.4" r="2.4"/><path d="M7.7 8.4l2.6 6.8M16.3 8.4l-2.6 6.8M8.4 6.6h7.2"/>'),
    /* لایه‌ها — بانک سوالات */
    phase7: svg('<path d="M12 3 3 7.6l9 4.6 9-4.6z"/><path d="M3 12.4l9 4.6 9-4.6M3 17l9 4.6 9-4.6"/>'),
    /* هدف — تمرین */
    phase8: svg('<circle cx="12" cy="12" r="8.4"/><circle cx="12" cy="12" r="4"/>' +
                '<circle cx="12" cy="12" r=".9" fill="currentColor" stroke="none"/>'),
    /* جدول — مرجع */
    phase9: svg('<rect x="3.2" y="4" width="17.6" height="16" rx="2.2"/><path d="M3.2 9.4h17.6M9.6 9.4V20"/>'),

    search: svg('<circle cx="10.8" cy="10.8" r="6.6"/><path d="M15.6 15.6 21 21"/>'),
    chevron: svg('<path d="M14.5 6 8.5 12l6 6"/>'),
    menu: svg('<path d="M4 7h16M4 12h16M4 17h16"/>'),
    sun: svg('<circle cx="12" cy="12" r="4.2"/><path d="M12 2.6v2.2M12 19.2v2.2M2.6 12h2.2M19.2 12h2.2' +
             'M5.4 5.4l1.6 1.6M17 17l1.6 1.6M18.6 5.4 17 7M7 17l-1.6 1.6"/>'),
    moon: svg('<path d="M20.4 14.4A8.6 8.6 0 1 1 9.6 3.6a6.8 6.8 0 0 0 10.8 10.8z"/>'),
    play: svg('<path d="M7.5 4.8v14.4l12-7.2z"/>'),
    doc: svg('<path d="M14 3.2H7.4A2.2 2.2 0 0 0 5.2 5.4v13.2a2.2 2.2 0 0 0 2.2 2.2h9.2a2.2 2.2 0 0 0 2.2-2.2V8z"/>' +
             '<path d="M14 3.2V8h4.8M8.8 13h6.4M8.8 16.6h4.4"/>'),
    reset: svg('<path d="M3.6 12a8.4 8.4 0 1 0 2.6-6.1"/><path d="M3.4 4.6v4.2h4.2"/>'),
    panel: svg('<rect x="3.2" y="4" width="17.6" height="16" rx="2.2"/><path d="M14.6 4v16"/>')
  };

  /* ==================================================================
     ۲) معماریِ اطلاعات
     ------------------------------------------------------------------
     open    : چند پنلِ نخست باز بماند
     groups  : [برچسب، اندیسِ شروع، اندیسِ پایان] — بازهٔ بسته
     primary : انتخابگرِ کنشِ اصلی (روی onclick، نه روی جای کارت، چون
               تزریقِ سرِ مرحله جای خواهر-برادرها را عوض می‌کند)
     kind    : step = گردش‌کار · tool = ابزار/مرجع
     ================================================================== */
  var IA = {
    phase0: {
      title: "فرمول و طیف جرمی", kind: "step", open: 2,
      groups: [["قطعات یونی، افت خنثی و اسکلت", 2, 4], ["لنگرگاه‌ها و تله‌های بانک", 5, 99]],
      primary: '#phase0 [onclick*="runFormula"]'
    },
    phase1: {
      title: "فروسرخ و UV", kind: "step", open: 2,
      groups: [["طیف IR و ماشین‌حساب کربونیل", 2, 3],
               ["چک‌لیست تفصیلی و UV-Vis", 4, 5],
               ["لنگرگاه‌ها و تله‌های بانک", 6, 99]]
    },
    phase2: {
      title: "کربن‑۱۳ و DEPT", kind: "step", open: 2,
      groups: [["بررسی تقارن و شمارندهٔ محیط‌ها", 2, 3], ["چک‌لیست، کتابخانه و بانک", 4, 99]]
    },
    phase3: {
      title: "پروتون ¹H", kind: "step", open: 2,
      groups: [["انتگرال و ثابت کوپلاژ J", 2, 3],
               ["ابزارهای تفصیلی: یابنده، شولری، مخلوط", 4, 6],
               ["لنگرگاه‌ها، کتابخانه و بانک", 7, 99]]
    },
    phase4: {
      title: "همبستگی دوبعدی", kind: "step", open: 1,
      groups: [["تحلیل فضایی و دینامیک", 1, 2], ["نمونه‌های کارشدهٔ مرجع", 3, 99]]
    },
    phase6: {
      title: "آنالیز کلاسیک", kind: "step", open: 2,
      groups: [["تست‌های طبقه‌بندی، مشتق‌سازی و کمپلکس رنگی", 2, 4],
               ["هینزبرگ، لوکاس، تله‌ها و ردیاب", 5, 99]]
    },
    phase5: {
      title: "استنتاج ساختار", kind: "step", open: 99,
      primary: '#phase5 [onclick*="runMaster"]'
    },
    phase7: {
      title: "بانک سوالات فیلد", kind: "tool", open: 2,
      groups: [["تله‌های امتحانی و جدول‌های مرجع", 2, 99]]
    },
    phase8: { title: "تمرین", kind: "tool", open: 99, primary: '#phase8 [onclick*="prCheck"]' },
    phase9: { title: "جدول‌های مرجع", kind: "tool", open: 1, index: true }
  };

  var ORDER = ["phase0", "phase1", "phase2", "phase3", "phase4", "phase6", "phase5",
    "phase7", "phase8", "phase9"];
  var STEPS = ORDER.filter(function (id) { return IA[id].kind === "step"; });
  /* مرحلهٔ ۵ نتیجه است نه ورودی، پس در شمارشِ پیشرفت نمی‌آید. */
  var COUNTED = STEPS.filter(function (id) { return id !== "phase5"; });

  function phaseNumber(id) { return faNum(id.replace("phase", "")); }

  /* ==================================================================
     ۳) پنل‌ها و عنوان‌ها
     ================================================================== */
  function panelsOf(phase) {
    var out = [];
    Array.prototype.forEach.call(phase.children, function (child) {
      if (child.classList.contains("card")) out.push(child);
      else if (child.classList.contains("grid")) {
        Array.prototype.forEach.call(child.children, function (g) {
          if (g.classList.contains("card")) out.push(g);
        });
      }
    });
    return out;
  }

  function splitHeading(h3) {
    if (!h3 || h3.dataset.pnum) return;
    var first = h3.firstChild;
    if (!first || first.nodeType !== 3) { h3.dataset.pnum = "0"; return; }
    var m = first.nodeValue.match(/^\s*([۰-۹0-9]{1,2})\)\s*/);
    if (!m) { h3.dataset.pnum = "0"; return; }
    first.nodeValue = first.nodeValue.slice(m[0].length);
    var tag = document.createElement("span");
    tag.className = "pnum";
    tag.textContent = m[1];
    h3.insertBefore(tag, h3.firstChild);
    h3.dataset.pnum = "1";
  }

  /* دویدنِ چهار تیکِ پشت‌سرهم یا بیشتر → شبکهٔ ستونی. یک فهرستِ بلندِ
     ردیف‌های تقریباً یک‌شکل، در دو ستون با یک نگاه خوانده می‌شود. */
  function columnizeChecks(panel) {
    var runs = [], run = [];
    Array.prototype.forEach.call(panel.children, function (n) {
      if (n.classList && n.classList.contains("chk")) run.push(n);
      else { if (run.length) runs.push(run); run = []; }
    });
    if (run.length) runs.push(run);
    runs.forEach(function (r) {
      if (r.length < 4) return;
      var box = document.createElement("div");
      box.className = "chk-cols";
      r[0].parentNode.insertBefore(box, r[0]);
      r.forEach(function (c) { box.appendChild(c); });
    });
  }

  /* ==================================================================
     ۴) کاشیِ الگوی ایزوتوپی
     ------------------------------------------------------------------
     نسبت از خودِ متنِ برچسب خوانده می‌شود («۳:۱»، «۹:۶:۱»)، پس چیزی
     اختراع نمی‌شود. <input> اصلی جابه‌جا می‌شود تا data-sig، نشست و
     شنونده‌های سراسری دست‌نخورده بمانند.
     ================================================================== */
  function isotopeTiles(panel) {
    var rows = Array.prototype.filter.call(panel.children, function (n) {
      return n.classList && n.classList.contains("chk") &&
             n.querySelector('input[type="checkbox"][data-sig^="ms_"]');
    });
    if (rows.length < 3) return;
    var grid = document.createElement("div");
    grid.className = "iso-grid";
    rows[0].parentNode.insertBefore(grid, rows[0]);

    rows.forEach(function (row) {
      var input = row.querySelector("input");
      var b = row.querySelector("b");
      var ratio = b ? b.textContent.trim() : "";
      var name = row.textContent.replace(ratio, "").replace(/^[\s—–-]+|[\s—–-]+$/g, "").trim();

      var tile = document.createElement("label");
      tile.className = "iso-tile";
      var sig = document.createElement("span");
      sig.className = "iso-sig";
      var parts = ratio.replace(/[۰-۹]/g, function (d) { return String(FA.indexOf(d)); })
                       .split(":").map(function (x) { return parseFloat(x); })
                       .filter(function (x) { return isFinite(x) && x > 0; });
      if (!parts.length) parts = [1];
      var max = Math.max.apply(null, parts);
      parts.forEach(function (v) {
        var bar = document.createElement("i");
        bar.style.height = Math.max(12, Math.round((v / max) * 100)) + "%";
        sig.appendChild(bar);
      });
      var rat = document.createElement("span");
      rat.className = "iso-ratio";
      rat.textContent = ratio || "—";
      var nm = document.createElement("span");
      nm.className = "iso-name";
      nm.textContent = name;

      tile.appendChild(input);
      tile.appendChild(sig);
      tile.appendChild(rat);
      tile.appendChild(nm);
      grid.appendChild(tile);
      row.remove();
    });
  }

  /* ==================================================================
     ۵) سرِ مرحله و راهنمای آن
     ================================================================== */
  function buildHead(phase, meta) {
    if (phase.querySelector(":scope > .stage-head")) return;
    var intro = phase.querySelector(":scope > .intro");
    var lead = "";
    if (intro) {
      var strong = intro.querySelector("strong");
      if (strong) {
        lead = strong.textContent.trim();
        var after = strong.nextSibling;
        if (after && after.nodeType === 3) {
          var sentence = after.nodeValue.split("؛")[0].split(".")[0].trim();
          if (sentence.length > 12) lead += " " + sentence;
        }
        strong.remove();
      }
    }
    var head = document.createElement("div");
    head.className = "stage-head";
    head.innerHTML =
      '<span class="stage-eyebrow">' +
        (meta.kind === "step" ? "مرحلهٔ " + phaseNumber(phase.id) : "ابزار") +
      "</span><h2>" + esc(meta.title) + "</h2>" +
      (lead ? '<p class="stage-lead"></p>' : "");
    if (lead) head.querySelector(".stage-lead").textContent = lead;
    phase.insertBefore(head, phase.firstChild);

    if (intro) {
      intro.classList.remove("intro");
      intro.classList.add("stage-brief");
      var body = document.createElement("div");
      body.className = "brief-body";
      while (intro.firstChild) body.appendChild(intro.firstChild);
      var title = document.createElement("p");
      title.className = "stage-brief-title";
      title.textContent = "روشِ این مرحله";
      var toggle = document.createElement("button");
      toggle.type = "button";
      toggle.className = "brief-toggle";
      toggle.setAttribute("aria-expanded", "false");
      toggle.textContent = "روشِ این مرحله";
      toggle.addEventListener("click", function () {
        var open = intro.classList.toggle("open");
        toggle.setAttribute("aria-expanded", open ? "true" : "false");
      });
      intro.appendChild(title);
      intro.appendChild(toggle);
      intro.appendChild(body);
      intro.dataset.brief = phase.id;
      phase.appendChild(intro);   /* بعداً به ستونِ زمینه منتقل می‌شود */
    }
  }

  /* ==================================================================
     ۶) گروه‌های تاشو
     ================================================================== */
  function makeGroup(label, panels) {
    if (!panels.length) return null;
    var d = document.createElement("details");
    d.className = "group";
    var s = document.createElement("summary");
    s.innerHTML = "<span>" + esc(label) + '</span><span class="count">' +
      faNum(panels.length) + "</span>";
    var body = document.createElement("div");
    body.className = "group-body";
    d.appendChild(s);
    d.appendChild(body);
    panels[0].parentNode.insertBefore(d, panels[0]);
    panels.forEach(function (p) { body.appendChild(p); });
    return d;
  }

  function applyDisclosure(phase, meta) {
    var panels = panelsOf(phase);
    /* ترتیب مهم است: کاشیِ ایزوتوپی پیش از ستون‌بندی، وگرنه ردیف‌ها داخلِ
       .chk-cols رفته‌اند و دیگر فرزندِ مستقیمِ پنل نیستند. */
    if (phase.id === "phase0" && panels[1]) isotopeTiles(panels[1]);
    panels.forEach(function (p) {
      splitHeading(p.querySelector(":scope > h3"));
      columnizeChecks(p);
    });

    if (meta.index) {
      panels.slice(meta.open).forEach(function (p) {
        var h3 = p.querySelector(":scope > h3");
        var label = h3 ? h3.textContent.trim() : "جدول";
        makeGroup(label, [p]);
        if (h3) h3.remove();
      });
      return;
    }
    (meta.groups || []).forEach(function (g) {
      var slice = panels.slice(g[1], g[2] + 1).filter(function (p) { return p.isConnected; });
      makeGroup(g[0], slice);
    });
  }

  /* ==================================================================
     ۷) یک کنشِ اصلی + «قدمِ بعد»
     ================================================================== */
  function nextStep(id) {
    var i = STEPS.indexOf(id);
    return i > -1 && i < STEPS.length - 1 ? STEPS[i + 1] : null;
  }
  function buildFoot(phase, meta) {
    if (phase.querySelector(":scope > .stage-foot")) return;
    var primary = meta.primary ? document.querySelector(meta.primary) : null;
    if (primary) primary.classList.add("primary");
    if (meta.kind !== "step") return;

    var nid = nextStep(phase.id);
    var foot = document.createElement("div");
    foot.className = "stage-foot";
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn" + (primary ? "" : " primary");
    if (nid) {
      btn.textContent = "مرحلهٔ بعد: " + IA[nid].title;
      btn.addEventListener("click", function () { root.switchPhase(nid); });
    } else {
      btn.textContent = "ساخت گزارش حل مسئله";
      btn.addEventListener("click", function () {
        if (typeof root.reportBuild === "function") root.reportBuild();
        var r = el("solution-report");
        if (r) r.scrollIntoView({ block: "center", behavior: "smooth" });
      });
    }
    foot.appendChild(btn);
    if (phase.id !== "phase5") {
      var skip = document.createElement("button");
      skip.type = "button";
      skip.className = "btn quiet";
      skip.textContent = "رفتن به استنتاج";
      skip.addEventListener("click", function () { root.switchPhase("phase5"); });
      foot.appendChild(skip);
    }
    phase.appendChild(foot);
  }

  function enhance(phase) {
    if (!phase || phase.dataset.enhanced) return;
    var meta = IA[phase.id];
    if (!meta) return;
    phase.dataset.enhanced = "1";
    buildHead(phase, meta);
    applyDisclosure(phase, meta);
    buildFoot(phase, meta);
  }

  /* ==================================================================
     ۸) حالتِ نوارِ کنار و نوارِ فرمان
     ================================================================== */
  function railButton(id) {
    var list = document.querySelectorAll(".side-nav .phase-btn");
    for (var i = 0; i < list.length; i++) {
      if ((list[i].getAttribute("onclick") || "").indexOf("'" + id + "'") !== -1) return list[i];
    }
    return null;
  }
  function evidenceIn(phase) { return phase.querySelectorAll("[data-sig]:checked").length; }
  function hasFormula() { return !!(root.State && root.State.formulaObj); }

  function syncRail() {
    var done = 0;
    ORDER.forEach(function (id) {
      var phase = el(id), btn = railButton(id);
      if (!phase || !btn) return;
      var st = btn.querySelector(".state");
      var n = evidenceIn(phase);
      var filled = id === "phase0" ? hasFormula() : n > 0;

      btn.classList.toggle("filled", filled && id !== "phase5");
      btn.classList.remove("pending");
      if (st) {
        if (id === "phase0") st.innerHTML = filled ? '<i class="state-dot"></i>' : "";
        else if (id === "phase5") st.innerHTML = "";
        else st.textContent = n ? faNum(n) : "";
      }
      if (COUNTED.indexOf(id) > -1 && filled) done++;
    });

    var total = COUNTED.length;
    var pct = total ? done / total : 0;
    var lbl = el("rail-progress-label");
    if (lbl) lbl.textContent = faNum(done) + " از " + faNum(total) + " مرحله";
    var arc = el("prog-arc");
    if (arc) arc.style.strokeDashoffset = String(98 - 98 * pct);
    var pctEl = el("prog-pct");
    if (pctEl) pctEl.textContent = faNum(Math.round(pct * 100));
    var hint = el("prog-hint");
    if (hint) {
      hint.textContent = !hasFormula() ? "با فرمول مولکولی شروع کنید"
        : done < total ? "شواهد مرحله‌های بعد را ثبت کنید"
        : "آمادهٔ اجرای موتور استنتاج";
    }

    /* مرحلهٔ استنتاج: تا فرمول نباشد «در انتظار» است. */
    var p5 = railButton("phase5");
    if (p5) {
      var ready = hasFormula();
      var s5 = p5.querySelector(".state");
      p5.classList.toggle("pending", !ready);
      p5.classList.toggle("filled", ready);
      if (s5) s5.textContent = ready ? "آماده" : "فرمول لازم";
    }
    syncCompound();
  }

  function activePhase() { return document.querySelector(".phase.active"); }

  function syncContext() {
    var phase = activePhase();
    if (!phase) return;
    enhance(phase);
    var meta = IA[phase.id];
    if (meta) {
      var t = el("ctx-title");
      if (t) t.textContent = meta.title;
      var s = el("tb-step");
      if (s) s.textContent = meta.kind === "step" ? "مرحلهٔ " + phaseNumber(phase.id) : "ابزار";
    }
    /* راهنمای همین مرحله به ستونِ زمینه می‌رود؛ بقیه پنهان می‌مانند. */
    var slot = el("brief-slot");
    if (slot) {
      var brief = phase.querySelector('[data-brief="' + phase.id + '"]');
      if (brief && brief.parentNode !== slot) slot.appendChild(brief);
      Array.prototype.forEach.call(slot.children, function (c) {
        c.hidden = c.dataset.brief !== phase.id;
      });
    }
    syncRail();
  }

  /* ==================================================================
     ۹) خلاصهٔ ترکیب
     همه از داده‌های واقعی: State.formulaObj (فرمول، اتم‌ها، جرم، IHD،
     قاعدهٔ نیتروژن)، تیک‌های data-sig، و کاندیدِ رندرشدهٔ موتور.
     ================================================================== */
  var EV_ROWS = [
    ["phase0", "طیف جرمی"], ["phase1", "فروسرخ و UV"], ["phase2", "کربن‑۱۳"],
    ["phase3", "پروتون ¹H"], ["phase4", "دوبعدی"], ["phase6", "آنالیز کلاسیک"]
  ];
  var ISO_LABEL = {
    ms_cl: "یک کلر", ms_br: "یک برم", ms_cl2: "دو کلر", ms_br2: "دو برم",
    ms_127: "ید", ms_sulfur: "گوگرد", ms_34: "گوگرد"
  };
  function subFormula(f) { return esc(f).replace(/(\d+)/g, "<sub>$1</sub>"); }
  var lastFormula = "";

  function syncCompound() {
    var f = root.State && root.State.formulaObj;
    var box = el("cmp-formula");
    if (box) {
      if (f && f.formula) {
        box.dataset.empty = "0";
        box.innerHTML = subFormula(f.formula);
        if (f.formula !== lastFormula) {
          box.classList.remove("flash");
          void box.offsetWidth;
          box.classList.add("flash");
          lastFormula = f.formula;
        }
      } else {
        box.dataset.empty = "1";
        box.innerHTML = '<span class="cmp-empty">فرمول تعیین نشده</span>';
        lastFormula = "";
      }
    }
    var set = function (id, txt, cls) {
      var n = el(id);
      if (!n) return;
      n.textContent = txt;
      n.className = "metric-v" + (cls ? " " + cls : "");
    };
    set("cmp-ihd", f ? faNum(f.ihd) : "—");
    set("cmp-mass", f && f.mass ? faNum(Math.round(f.mass)) : "—");
    if (f && f.nitrogenRule) {
      var okN = f.nitrogenRule !== "conflict";
      set("cmp-nrule", okN ? "سازگار" : "ناسازگار", okN ? "ok" : "warn");
    } else set("cmp-nrule", "—");

    /* اتم‌ها */
    var ew = el("cmp-elements-wrap"), ebox = el("cmp-elements");
    if (ew && ebox) {
      if (f && f.atoms) {
        var keys = Object.keys(f.atoms).filter(function (k) { return f.atoms[k]; });
        ebox.innerHTML = keys.map(function (k) {
          return '<span class="echip">' + esc(k) + "<i>" + esc(f.atoms[k]) + "</i></span>";
        }).join("");
        ew.hidden = !keys.length;
      } else ew.hidden = true;
    }

    /* سرنخِ ایزوتوپی — از تیک‌های واقعی */
    var iw = el("cmp-iso-wrap"), ibox = el("cmp-iso");
    if (iw && ibox) {
      var clues = [];
      Object.keys(ISO_LABEL).forEach(function (sig) {
        var n = document.querySelector('[data-sig="' + sig + '"]');
        if (n && n.checked && clues.indexOf(ISO_LABEL[sig]) === -1) clues.push(ISO_LABEL[sig]);
      });
      ibox.innerHTML = clues.map(function (c) {
        return '<span class="iso-clue">' + esc(c) + "</span>";
      }).join("");
      iw.hidden = !clues.length;
    }

    /* شواهد به تفکیک تکنیک */
    var evbox = el("cmp-evidence");
    if (evbox) {
      var counts = EV_ROWS.map(function (r) {
        var p = el(r[0]);
        return { id: r[0], label: r[1], n: p ? evidenceIn(p) : 0 };
      });
      var max = Math.max(1, Math.max.apply(null, counts.map(function (c) { return c.n; })));
      if (!evbox.dataset.built) {
        evbox.innerHTML = counts.map(function (c) {
          return '<button type="button" class="evrow" data-go="' + c.id + '">' +
            "<span>" + esc(c.label) + "</span>" +
            '<span class="evbar"><i></i></span><b></b></button>';
        }).join("");
        evbox.dataset.built = "1";
        evbox.addEventListener("click", function (e) {
          var b = e.target.closest("[data-go]");
          if (b) root.switchPhase(b.dataset.go);
        });
      }
      var rows = evbox.querySelectorAll(".evrow");
      counts.forEach(function (c, i) {
        var r = rows[i];
        if (!r) return;
        r.classList.toggle("zero", c.n === 0);
        r.querySelector("i").style.width = (c.n ? Math.max(8, (c.n / max) * 100) : 0) + "%";
        r.querySelector("b").textContent = c.n ? faNum(c.n) : "۰";
      });
    }

    /* کاندیدِ نخست — خوانده از نتیجهٔ رندرشدهٔ موتور، نه ساخته */
    var rw = el("cmp-result-wrap"), rbtn = el("cmp-result");
    if (rw && rbtn) {
      var top = document.querySelector("#phase5 .candidate.rank1");
      if (top) {
        var nm = top.querySelector(".cand-name");
        var sc = top.querySelector(".cand-score");
        rbtn.innerHTML = "<b>" + esc(nm ? nm.textContent.trim() : "—") + "</b>" +
          "<span>" + esc(sc ? sc.textContent.trim() : "") + "</span>";
        rw.hidden = false;
      } else rw.hidden = true;
    }

    /* حالتِ کلی */
    var st = el("cmp-state");
    if (st) {
      var anyConflict = !!document.querySelector("#phase5 .contradiction");
      var evTotal = EV_ROWS.reduce(function (a, r) {
        var p = el(r[0]); return a + (p ? evidenceIn(p) : 0);
      }, 0);
      if (anyConflict) { st.textContent = "تناقض در شواهد"; st.dataset.kind = "bad"; }
      else if (f && evTotal >= 3) { st.textContent = "آمادهٔ استنتاج"; st.dataset.kind = "ok"; }
      else if (f) { st.textContent = "شواهد کم است"; st.dataset.kind = "pending"; }
      else { st.textContent = "در انتظار داده"; st.dataset.kind = "idle"; }
    }
  }

  /* چیپِ فرمول در نوارِ فرمان — تنها راهِ نوشتن، تا app.js و session.js
     دو شکلِ متفاوت از یک واقعیت نسازند. */
  function setFormula(formula, ihd) {
    var box = el("status-formula");
    if (box) {
      if (!formula) {
        box.innerHTML = '<span class="fchip-k">فرمول</span><b class="fchip-v none">تعیین نشده</b>';
      } else {
        box.innerHTML = '<span class="fchip-k">فرمول</span><b class="fchip-v ok"></b>' +
          '<span class="fchip-sep">·</span><span class="fchip-k">IHD</span><b class="fchip-v"></b>';
        var v = box.querySelectorAll(".fchip-v");
        v[0].textContent = formula;
        v[1].textContent = ihd;
      }
    }
    syncRail();
  }

  /* ==================================================================
     ۱۰) پوسته: روشن/تاریک
     ================================================================== */
  var THEME_KEY = "spectra.theme.v1";
  function isDark() {
    var a = document.documentElement.getAttribute("data-theme");
    if (a === "dark") return true;
    if (a === "light") return false;
    return matchMedia("(prefers-color-scheme: dark)").matches;
  }
  function applyTheme(mode) {
    var r = document.documentElement;
    if (mode === "light" || mode === "dark") r.setAttribute("data-theme", mode);
    else r.removeAttribute("data-theme");
    var btn = el("theme-btn");
    if (btn) {
      btn.innerHTML = isDark() ? ICONS.sun : ICONS.moon;
      btn.title = isDark() ? "پوستهٔ روشن" : "پوستهٔ تاریک";
    }
  }
  /* پیش‌فرض روشن است، نه «خودکار»: هویتِ محصول روشن‌محور است و تاریک یک
     انتخابِ آگاهانه که به خاطر سپرده می‌شود. */
  function currentTheme() {
    try { return localStorage.getItem(THEME_KEY) || "light"; } catch (e) { return "light"; }
  }
  function toggleTheme() {
    var next = isDark() ? "light" : "dark";
    try { localStorage.setItem(THEME_KEY, next); } catch (e) {}
    applyTheme(next);
  }

  /* ==================================================================
     ۱۱) نوارِ کنار: جمع‌شدن و کشو
     ================================================================== */
  var COLLAPSE_KEY = "spectra.side.v1";
  function shell() { return document.querySelector(".shell"); }
  function setCollapsed(on) {
    shell().classList.toggle("side-collapsed", on);
    try { localStorage.setItem(COLLAPSE_KEY, on ? "1" : "0"); } catch (e) {}
  }
  function drawerOpen(on) {
    var side = el("side");
    if (!side) return;
    side.classList.toggle("open", on);
    var scrim = document.querySelector(".scrim");
    if (on && !scrim) {
      scrim = document.createElement("div");
      scrim.className = "scrim";
      scrim.addEventListener("click", function () { drawerOpen(false); });
      /* پرده باید *کنارِ خودِ کشو* بنشیند، نه روی body.
         .shell با z-index:1 یک بافتِ چینشِ تازه می‌سازد، پس z-index:120
         کشو فقط درونِ همان بافت معنی دارد. پرده روی body یعنی مقایسهٔ
         واقعی «۱۱۰ پرده در برابر ۱ شل» است و پرده روی کلِ برنامه —
         از جمله روی خودِ کشو — می‌افتد: منو تار می‌شد و کلیک هم
         نمی‌گرفت. داخلِ shell، همان ۱۱۰ در برابر ۱۲۰ قرار می‌گیرد و
         ترتیب درست می‌شود. */
      (side.parentElement || document.body).appendChild(scrim);
    } else if (!on && scrim) scrim.remove();
  }

  /* ==================================================================
     ۱۲) پالتِ فرمان
     ================================================================== */
  function commands() {
    var list = ORDER.map(function (id) {
      return {
        icon: ICONS[id], label: IA[id].title,
        hint: IA[id].kind === "step" ? "مرحلهٔ " + phaseNumber(id) : "ابزار",
        run: function () { root.switchPhase(id); }
      };
    });
    list.push({ icon: ICONS.play, label: "اجرای موتور استنتاج", hint: "فرمان",
      run: function () {
        root.switchPhase("phase5");
        if (typeof root.runMaster === "function") root.runMaster();
      } });
    list.push({ icon: ICONS.doc, label: "ساخت گزارش حل مسئله", hint: "فرمان",
      run: function () {
        root.switchPhase("phase5");
        if (typeof root.reportBuild === "function") root.reportBuild();
      } });
    list.push({ icon: ICONS.moon, label: "تغییر پوستهٔ روشن و تاریک", hint: "نمایش",
      run: toggleTheme });
    list.push({ icon: ICONS.panel, label: "جمع‌کردن یا بازکردن نوار کنار", hint: "نمایش",
      run: function () { setCollapsed(!shell().classList.contains("side-collapsed")); } });
    list.push({ icon: ICONS.reset, label: "شروع تازه و پاک‌کردن کار", hint: "فرمان",
      run: function () { if (typeof root.sessionReset === "function") root.sessionReset(); } });
    return list;
  }
  var cmdIdx = 0, cmdShown = [];
  function cmdkRender(q) {
    var all = commands();
    var norm = function (t) { return t.replace(/[ًٌٍَُِّْ‌]/g, "").toLowerCase(); };
    cmdShown = !q ? all : all.filter(function (c) {
      return norm(c.label + " " + c.hint).indexOf(norm(q)) > -1;
    });
    cmdIdx = 0;
    var ul = el("cmdk-list");
    if (!cmdShown.length) { ul.innerHTML = '<li class="cmdk-empty">چیزی پیدا نشد</li>'; return; }
    ul.innerHTML = cmdShown.map(function (c, i) {
      return '<li><button type="button" class="cmdk-item" role="option" data-i="' + i + '"' +
        (i === 0 ? ' aria-selected="true"' : "") + '>' +
        '<span class="ico">' + c.icon + "</span><span>" + esc(c.label) + "</span>" +
        "<small>" + esc(c.hint) + "</small></button></li>";
    }).join("");
  }
  function cmdkMove(d) {
    var items = el("cmdk-list").querySelectorAll(".cmdk-item");
    if (!items.length) return;
    items[cmdIdx].removeAttribute("aria-selected");
    cmdIdx = (cmdIdx + d + items.length) % items.length;
    items[cmdIdx].setAttribute("aria-selected", "true");
    items[cmdIdx].scrollIntoView({ block: "nearest" });
  }
  function cmdkOpen(on) {
    var box = el("cmdk");
    if (!box) return;
    box.hidden = !on;
    if (on) {
      cmdkRender("");
      var i = el("cmdk-input");
      i.value = "";
      i.focus();
    }
  }
  function cmdkRun() {
    var c = cmdShown[cmdIdx];
    cmdkOpen(false);
    if (c) c.run();
  }

  /* ==================================================================
     ۱۳) نخستین اجرا
     ================================================================== */
  var SEEN = "spectra.firstrun.v1";
  function buildFirstRun() {
    var seen = false;
    try { seen = localStorage.getItem(SEEN) === "1"; } catch (e) { seen = true; }
    if (seen) return;
    var phase = el("phase0");
    if (!phase) return;
    var box = document.createElement("div");
    box.className = "first-run";
    box.innerHTML =
      "<h2>از طیف به ساختار، در شش مرحله</h2>" +
      "<p>داده‌های طیفی را مرحله‌به‌مرحله ثبت می‌کنید. موتور از همان شواهد قطعات " +
      "سازنده را بیرون می‌کشد، ساختارهای ممکن را با حفظ ظرفیت و فرمول و IHD سرِ هم " +
      "می‌کند، تناقض‌ها را علامت می‌زند و کاندیدها را رتبه می‌دهد.</p>" +
      '<ul class="fr-steps">' +
      "<li><i>۱</i><span>در همین مرحله جرم یون مولکولی یا اتم‌ها را بدهید تا " +
      "<b>فرمول و IHD</b> قطعی شود.</span></li>" +
      "<li><i>۲</i><span>در مرحله‌های ۱ تا ۶ شواهد هر تکنیک را تیک بزنید — شمارِ " +
      "شواهد هر مرحله در نوار کنار دیده می‌شود.</span></li>" +
      "<li><i>۳</i><span>در مرحلهٔ ۵ موتور را اجرا کنید و <b>گزارش حل مسئله</b> " +
      "را بگیرید.</span></li>" +
      "</ul>" +
      '<div class="btn-row">' +
      '<button type="button" class="btn" data-fr="start">شروع از فرمول</button>' +
      '<button type="button" class="btn quiet" data-fr="skip">بستن</button></div>';
    var head = phase.querySelector(":scope > .stage-head");
    phase.insertBefore(box, head ? head.nextSibling : phase.firstChild);

    function dismiss() {
      try { localStorage.setItem(SEEN, "1"); } catch (e) {}
      box.remove();
    }
    box.querySelector('[data-fr="skip"]').addEventListener("click", dismiss);
    box.querySelector('[data-fr="start"]').addEventListener("click", function () {
      dismiss();
      var f = el("f-mass");
      if (f) { f.scrollIntoView({ block: "center", behavior: "smooth" }); f.focus(); }
    });
  }

  /* ==================================================================
     ۱۴) راه‌اندازی
     ================================================================== */
  function paintIcons() {
    document.querySelectorAll(".phase-btn[data-ico]").forEach(function (b) {
      var i = b.querySelector(".ico");
      if (i && ICONS[b.dataset.ico]) i.innerHTML = ICONS[b.dataset.ico];
    });
    var m = { "side-collapse": ICONS.chevron, "side-open": ICONS.menu };
    Object.keys(m).forEach(function (id) { var n = el(id); if (n) n.innerHTML = m[id]; });
    var c = document.querySelector(".cmd-ico"); if (c) c.innerHTML = ICONS.search;
    var ci = document.querySelector(".cmdk-ico"); if (ci) ci.innerHTML = ICONS.search;
  }

  function init() {
    applyTheme(currentTheme());
    paintIcons();

    var collapsed = false;
    try { collapsed = localStorage.getItem(COLLAPSE_KEY) === "1"; } catch (e) {}
    if (collapsed) shell().classList.add("side-collapsed");

    ORDER.forEach(function (id) { enhance(el(id)); });
    buildFirstRun();
    syncContext();

    /* تعویضِ فاز از هر مسیری (کلیک، popstate، بازگردانیِ نشست) */
    var work = el("work");
    if (work && root.MutationObserver) {
      new MutationObserver(function () { syncContext(); })
        .observe(work, { attributes: true, attributeFilter: ["class"], subtree: true });
    }
    document.addEventListener("change", syncRail);
    document.addEventListener("input", syncRail);

    /* نتیجهٔ موتور با کلیک ساخته می‌شود، نه با change؛ پس خودِ ظرفِ نتیجه
       را می‌پاییم تا خلاصهٔ ترکیب همان لحظه کاندیدِ نخست را نشان دهد. */
    var hero = el("master-hero");
    if (hero && root.MutationObserver) {
      new MutationObserver(function () { syncCompound(); })
        .observe(hero, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });
    }

    /* روی گوشی، انتخابِ مرحله باید کشو را ببندد */
    document.querySelectorAll(".side-nav .phase-btn").forEach(function (b) {
      b.addEventListener("click", function () {
        if (matchMedia("(max-width: 820px)").matches) drawerOpen(false);
      });
    });

    var tb = el("theme-btn"); if (tb) tb.addEventListener("click", toggleTheme);
    var sc = el("side-collapse");
    if (sc) sc.addEventListener("click", function () {
      if (matchMedia("(max-width: 820px)").matches) drawerOpen(false);
      else setCollapsed(!shell().classList.contains("side-collapsed"));
    });
    var so = el("side-open"); if (so) so.addEventListener("click", function () { drawerOpen(true); });
    var co = el("cmd-open"); if (co) co.addEventListener("click", function () { cmdkOpen(true); });

    var ci = el("cmdk-input");
    if (ci) {
      ci.addEventListener("input", function () { cmdkRender(ci.value.trim()); });
      ci.addEventListener("keydown", function (e) {
        if (e.key === "ArrowDown") { e.preventDefault(); cmdkMove(1); }
        else if (e.key === "ArrowUp") { e.preventDefault(); cmdkMove(-1); }
        else if (e.key === "Enter") { e.preventDefault(); cmdkRun(); }
      });
    }
    var cl = el("cmdk-list");
    if (cl) cl.addEventListener("click", function (e) {
      var b = e.target.closest(".cmdk-item");
      if (b) { cmdIdx = +b.dataset.i; cmdkRun(); }
    });
    var ck = el("cmdk");
    if (ck) ck.addEventListener("click", function (e) { if (e.target === ck) cmdkOpen(false); });

    document.addEventListener("keydown", function (e) {
      var k = (e.key || "").toLowerCase();
      if ((e.ctrlKey || e.metaKey) && k === "k") { e.preventDefault(); cmdkOpen(el("cmdk").hidden); }
      else if ((e.ctrlKey || e.metaKey) && k === "b") { e.preventDefault();
        setCollapsed(!shell().classList.contains("side-collapsed")); }
      else if (k === "escape") {
        if (el("cmdk") && !el("cmdk").hidden) cmdkOpen(false);
        else if (el("side") && el("side").classList.contains("open")) drawerOpen(false);
      }
    });

    /* نشانِ ذخیره در پای نوارِ کنار، هم‌گام با کلاسی که session.js می‌گذارد */
    var ss = el("session-status");
    if (ss && root.MutationObserver) {
      var row = ss.closest(".save");
      var sync = function () {
        if (!row) return;
        row.classList.toggle("is-ok", ss.classList.contains("ok"));
        row.classList.toggle("is-warn", ss.classList.contains("warn"));
      };
      new MutationObserver(sync).observe(ss, { attributes: true, attributeFilter: ["class"] });
      sync();
    }
  }

  root.Shell = { setFormula: setFormula, syncRail: syncRail, faNum: faNum, icons: ICONS };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})(window);
