/* =====================================================================
   reference-tables.js — رساندنِ جدول‌های مرجع به رابط (فاز ۹)
   ---------------------------------------------------------------------
   چرا این ماژول لازم شد:
     در ممیزیِ پایگاه معلوم شد ده جدولِ کاملِ داده در DB وجود دارد که هیچ
     مصرف‌کننده‌ای در js/ یا index.html ندارد — یعنی داده وارد شده بود و
     هیچ‌وقت به کاربر نشان داده نمی‌شد:
       DB.solvingAlgorithm            الگوریتم استاندارد پنج‌گامی حل مسئله
       DB.h1 (regions/coupling/…)     ناحیه‌های شیفت ¹H و ثابت‌های کوپلاژ
       DB.karplus                     ضرایب معادلهٔ کارپلاس
       DB.spinSystems                 سیستم‌های اسپینی و مرتبهٔ اول
       DB.stevensonRule               قاعدهٔ استیونسون در شکست جرمی
       DB.fusedRingCores              هسته‌های حلقوی جوش‌خورده
       DB.uvExtendedRules             بسط وودوارد-فایزر و فیزر-کون
       DB.diastereotopicCalibration   کالیبراسیون Δδ و Jgem دیاسترئوتوپیک
       DB.branchingReferenceMolecules مولکول‌های مرجعِ گره‌های انشعاب
       DB.valence + DB.atomicMass     ظرفیت و جرم اتم‌ها

   ماژولِ خودبسنده و بی‌وابستگی؛ مثل بقیهٔ js/ یک IIFE است و باید در
   index.html پیش از session.js صدا زده شود.
   ===================================================================== */
(function () {
  "use strict";

  function el(id) { return document.getElementById(id); }
  function esc(v) {
    return String(v == null ? "" : v)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
  /* ارقام لاتینِ داده‌های عددی برای هم‌شکلی با بقیهٔ رابط فارسی می‌شوند */
  var FA = "۰۱۲۳۴۵۶۷۸۹";
  function fa(v) { return String(v == null ? "" : v).replace(/[0-9]/g, function (d) { return FA[+d]; }); }

  function table(headers, rows) {
    if (!rows.length) return "";
    return '<table><tr>' + headers.map(function (h) { return "<th>" + h + "</th>"; }).join("") + "</tr>" +
      rows.map(function (r) {
        return "<tr>" + r.map(function (c) { return "<td>" + c + "</td>"; }).join("") + "</tr>";
      }).join("") + "</table>";
  }

  /* ---------- الگوریتم حل مسئله ---------- */
  function renderSolvingAlgorithm() {
    var box = el("ref-solving-algorithm");
    if (!box || !DB.solvingAlgorithm) return;
    box.innerHTML = DB.solvingAlgorithm.map(function (s) {
      return '<div class="card" style="margin:0 0 10px">' +
        "<b>گام " + fa(s.step) + " — " + esc(s.title) + "</b>" +
        '<div style="margin-top:4px;font-size:var(--fs-sm)">' + esc(s.detail) + "</div></div>";
    }).join("");
  }

  /* ---------- ناحیه‌های ¹H، ثابت‌های کوپلاژ، الگوهای طلایی ---------- */
  function renderH1Tables() {
    var box = el("ref-h1-tables");
    if (!box || !DB.h1) return;
    var html = "";

    html += "<h4>ناحیه‌های شیفت</h4>" + table(["δ (ppm)", "معنا"],
      (DB.h1.regions || []).map(function (r) {
        return ['<span class="en">' + fa(r.range) + "</span>", esc(r.fa)];
      }));

    var cp = DB.h1.coupling || {};
    html += "<h4>ثابت‌های کوپلاژ</h4>" + table(["J", "حالت"],
      Object.keys(cp).map(function (k) {
        return ['<span class="en">' + fa(cp[k].j) + "</span>", esc(cp[k].fa)];
      }));

    html += "<h4>الگوهای طلایی (اثر انگشتِ قطعه)</h4>" + table(["الگو", "قطعهٔ اثبات‌شده"],
      (DB.h1.goldenPatterns || []).map(function (g) {
        var blk = (DB.blocks || []).filter(function (b) { return b.id === g.block; })[0];
        return [esc(g.fa), blk ? esc(blk.fa) + ' <span class="en">' + esc(blk.en) + "</span>" : esc(g.block || "—")];
      }));

    box.innerHTML = html;
  }

  /* ---------- سیستم‌های اسپینی ---------- */
  function renderSpinSystems() {
    var box = el("ref-spin-systems");
    if (!box || !DB.spinSystems) return;
    box.innerHTML = table(["سیستم", "توصیف"],
      DB.spinSystems.map(function (s) {
        return ['<b class="en">' + esc(s.label) + "</b>", esc(s.desc)];
      }));
  }

  /* ---------- کارپلاس ---------- */
  /* مهم: ضرایبِ DB.karplus برای فرمِ هاسنوت‌اند — J(φ) = A·cos²φ − B·cosφ + C —
     نه فرمِ کلاسیکِ A + B·cosφ + C·cos2φ. همان فرمی که karplusAngle در
     js/calculators.js حل می‌کند، این‌جا هم استفاده می‌شود تا جدولِ مرجع و
     ماشین‌حساب یک عدد بدهند. (با فرمِ کلاسیک، کمینه به‌جای ~۱ Hz روی ۶.۴
     می‌افتاد و منحنی معنای فیزیکی‌اش را از دست می‌داد.) */
  function karplusJ(c, deg) {
    var cos = Math.cos(deg * Math.PI / 180);
    return c.A * cos * cos - c.B * cos + c.C;
  }

  function renderKarplus() {
    var box = el("ref-karplus");
    if (!box) return;
    var k = DB.karplus || {};
    var html = '<div class="note blue">معادلهٔ کارپلاس ثابتِ کوپلاژِ سه‌پیوندی را به زاویهٔ دووجهی φ وصل می‌کند. صورتِ به‌کاررفته در این برنامه، صورتِ هاسنوت است:' +
      '<br><span class="en">³J = A·cos²φ − B·cosφ + C</span></div>';

    if (k.A != null) {
      html += table(["ضریب", "مقدار"], [
        ['<span class="en">A</span>', '<span class="en">' + fa(k.A) + "</span>"],
        ['<span class="en">B</span>', '<span class="en">' + fa(k.B) + "</span>"],
        ['<span class="en">C</span>', '<span class="en">' + fa(k.C) + "</span>"]
      ]);
      var angles = [0, 30, 60, 90, 120, 150, 180];
      html += "<h4>مقادیر شاخص</h4>" + table(["φ", "³J"],
        angles.map(function (d) {
          return ['<span class="en">' + fa(d) + "°</span>",
                  '<span class="en">' + fa(karplusJ(k, d).toFixed(1)) + " Hz</span>"];
        }));
      html += '<div style="font-size:var(--fs-xs);color:var(--muted);margin-top:6px">' +
        "کمینه روی ۹۰° است: دو پروتونِ عمود بر هم تقریباً کوپل نمی‌شوند. همین شکلِ منحنی، پایهٔ تفکیکِ آکسیال-آکسیال (φ≈۱۸۰°، J بزرگ ~۱۰ Hz) از آکسیال-اکواتوریال (φ≈۶۰°، J کوچک ~۳ Hz) در حلقهٔ شش‌عضوی است — و همان چیزی که ماشین‌حسابِ «J به زاویه» معکوسش را حل می‌کند." +
        "</div>";
    }

    if (DB.karplusHaasnoot) {
      html += "<h4>ضرایب به‌تفکیکِ نوعِ سیستم (تصحیح‌شده با الکترونگاتیوی)</h4>" +
        table(["سیستم", "A", "B", "C", "³J در ۱۸۰°", "³J در ۶۰°"],
          Object.keys(DB.karplusHaasnoot).map(function (sys) {
            var v = DB.karplusHaasnoot[sys];
            return [esc(v.fa || sys),
                    '<span class="en">' + fa(v.A) + "</span>",
                    '<span class="en">' + fa(v.B) + "</span>",
                    '<span class="en">' + fa(v.C) + "</span>",
                    '<span class="en">' + fa(karplusJ(v, 180).toFixed(1)) + "</span>",
                    '<span class="en">' + fa(karplusJ(v, 60).toFixed(1)) + "</span>"];
          }));
    }
    box.innerHTML = html;
  }

  /* ---------- قاعدهٔ استیونسون ---------- */
  function renderStevenson() {
    var box = el("ref-stevenson");
    if (!box || !DB.stevensonRule) return;
    var r = DB.stevensonRule;
    box.innerHTML = '<div class="note amber">' + esc(r.statement) + "</div>" +
      (r.examples && r.examples.length
        ? "<h4>مثال‌ها</h4><ul>" + r.examples.map(function (e) { return "<li>" + esc(e) + "</li>"; }).join("") + "</ul>"
        : "");
  }

  /* ---------- هسته‌های حلقوی جوش‌خورده ---------- */
  function renderFusedRings() {
    var box = el("ref-fused-rings");
    if (!box || !DB.fusedRingCores) return;
    box.innerHTML = table(["هسته", "فرمول", "IHD", "نکات طیفی"],
      DB.fusedRingCores.map(function (c) {
        var notes = [];
        if (c.positions) notes.push("موقعیت‌ها: " + esc(c.positions));
        if (c.ir) notes.push("IR: " + esc(c.ir));
        if (typeof c.h1 === "string") notes.push("¹H: " + esc(c.h1));
        else if (c.h1) notes.push("¹H: آلفا " + fa(c.h1.alpha) + " · بتا " + fa(c.h1.beta) + " ppm");
        return [esc(c.fa), '<span class="en">' + esc(c.formula) + "</span>", fa(c.ihd), notes.join("<br>")];
      }));
  }

  /* ---------- UV گسترده ---------- */
  function renderUVExtended() {
    var box = el("ref-uv-extended");
    if (!box || !DB.uvExtendedRules) return;
    var u = DB.uvExtendedRules, html = "";

    html += "<h4>مقادیر پایه</h4>" + table(["کروموفور", "λmax پایه"],
      (u.baseValues || []).map(function (b) {
        return [esc(b.chromophore), '<span class="en">' + fa(b.nm) + " nm</span>"];
      }));

    html += "<h4>افزایه‌ها</h4>" + table(["استخلاف / وضعیت", "+nm", "نکته"],
      (u.increments || []).map(function (i) {
        return [esc(i.fa), '<span class="en">+' + fa(i.nm) + "</span>", i.note ? esc(i.note) : "—"];
      }));

    if (u.fieserKuhn) {
      var f = u.fieserKuhn;
      html += "<h4>معادلهٔ فیزر-کون</h4>" +
        '<div class="note purple"><b>شرط:</b> ' + esc(f.condition) +
        '<br><b>رابطه:</b> <span class="en">' + esc(f.formula) + "</span></div>" +
        table(["متغیر", "معنا"], Object.keys(f.variables || {}).map(function (k) {
          return ['<span class="en">' + esc(k) + "</span>", esc(f.variables[k])];
        })) +
        (f.note ? '<div style="font-size:var(--fs-xs);color:var(--muted);margin-top:6px">' + esc(f.note) + "</div>" : "");
    }
    box.innerHTML = html;
  }

  /* ---------- دیاسترئوتوپیک ---------- */
  function renderDiastereotopic() {
    var box = el("ref-diastereotopic");
    if (!box || !DB.diastereotopicCalibration) return;
    box.innerHTML = '<div class="note blue">دو پروتونِ روی یک کربن وقتی «دیاسترئوتوپیک» می‌شوند که مولکول یک مرکز کایرال یا محدودیتِ حلقوی داشته باشد؛ آن‌وقت به‌جای یک سیگنالِ دوپروتونی، دو سیگنالِ جدا با کوپلاژِ ژمینالِ منفی می‌دهند.</div>' +
      table(["مولکول", "گروه", "Δδ", "Jgem"],
        DB.diastereotopicCalibration.map(function (d) {
          return [esc(d.molecule), esc(d.group),
                  '<span class="en">' + fa(d.deltaPpm) + "</span>",
                  '<span class="en">' + fa(d.jgem) + "</span>"];
        }));
  }

  /* ---------- مولکول‌های مرجع انشعاب ---------- */
  function renderBranching() {
    var box = el("ref-branching");
    if (!box || !DB.branchingReferenceMolecules) return;
    box.innerHTML = table(["#", "مولکول", "چه چیزی را کالیبره می‌کند"],
      DB.branchingReferenceMolecules.map(function (m) {
        return [fa(m.id), esc(m.fa), esc(m.note)];
      }));
  }

  /* ---------- اتم‌ها ---------- */
  function renderAtoms() {
    var box = el("ref-atoms");
    if (!box || !DB.atomicMass) return;
    var val = DB.valence || {};
    box.innerHTML = '<div class="note blue">جرم‌ها برای موتور استوکیومتری (استخراج فرمول از جرم مولکولی) و ظرفیت‌ها برای اعتبارسنجیِ ساختارِ مونتاژشده به کار می‌روند.</div>' +
      table(["عنصر", "جرم", "ظرفیت"],
        Object.keys(DB.atomicMass).map(function (e) {
          return ['<b class="en">' + esc(e) + "</b>",
                  '<span class="en">' + fa(DB.atomicMass[e]) + "</span>",
                  '<span class="en">' + (val[e] != null ? fa(val[e]) : "—") + "</span>"];
        }));
  }

  function init() {
    if (typeof window.DB === "undefined") return;
    renderSolvingAlgorithm();
    renderH1Tables();
    renderSpinSystems();
    renderKarplus();
    renderStevenson();
    renderFusedRings();
    renderUVExtended();
    renderDiastereotopic();
    renderBranching();
    renderAtoms();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
