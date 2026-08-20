#!/usr/bin/env node
/* =====================================================================
   build-standalone.js — ساختِ نسخهٔ تک‌فایل
   ---------------------------------------------------------------------
   index.html را می‌خواند و CSS، همهٔ فایل‌های JavaScript و تصاویر طیف را
   داخل خودش جاسازی می‌کند. خروجی یک فایل HTML مستقل است که هرجا بگذارید
   (فلش، ایمیل، درایو مشترک) بدون هیچ فایل کنارییی کار می‌کند.

   اجرا:
       node tools/build-standalone.js

   نکته: فونت‌ها از قبل به‌صورت base64 داخل styles.css هستند، پس چیز
   دیگری برای جاسازی نمی‌ماند.
   ===================================================================== */
"use strict";
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "سامانه-تعیین-ساختار.html");

const MIME = {
  ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png",
  ".webp": "image/webp", ".gif": "image/gif", ".avif": "image/avif"
};

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

/* متن را طوری امن می‌کنیم که داخل <script> بسته نشود:
   رشتهٔ "</script" در محتوای JS باعث بسته‌شدن زودهنگام تگ می‌شود. */
function safeForInlineScript(js) {
  return js.replace(/<\/(script)/gi, "<\\/$1");
}

function build() {
  let html = read("index.html");
  const inlined = { css: 0, js: 0, images: 0 };

  // ---------- ۱) CSS ----------
  html = html.replace(/[ \t]*<link rel="stylesheet" href="([^"]+)">\s*/g, (m, href) => {
    const css = read(href);
    inlined.css++;
    return "<style>\n" + css + "\n</style>\n";
  });

  // ---------- ۲) تصاویر طیف → data URI ----------
  // نسخهٔ تک‌فایل نمی‌تواند از پوشهٔ assets بخواند، پس فهرست را با
  // data URI بازنویسی می‌کنیم. خودِ spectra-manifest.js دست‌نخورده
  // جاسازی می‌شود و این بلوک بعد از آن مقادیرش را جای‌گزین می‌کند.
  let overrideScript = "";
  try {
    const manifestSrc = read("data/spectra-manifest.js");
    const dirMatch = manifestSrc.match(/DB\.spectraDir\s*=\s*"([^"]+)"/);
    const dir = dirMatch ? dirMatch[1] : "assets/spectra/";
    const objMatch = manifestSrc.match(/DB\.spectraManifest\s*=\s*(\{[\s\S]*?\n\s*\};)/);
    if (objMatch) {
      // eslint-disable-next-line no-new-func
      const manifest = new Function("return " + objMatch[1].replace(/;$/, ""))();
      const asData = {};
      Object.keys(manifest).forEach(slug => {
        asData[slug] = {};
        Object.keys(manifest[slug]).forEach(type => {
          const file = manifest[slug][type];
          const abs = path.join(ROOT, dir, file);
          if (!fs.existsSync(abs)) return;
          const ext = path.extname(file).toLowerCase();
          const mime = MIME[ext];
          if (!mime) return;
          asData[slug][type] = "data:" + mime + ";base64," + fs.readFileSync(abs).toString("base64");
          inlined.images++;
        });
      });
      overrideScript =
        "<script>\n" +
        "/* نسخهٔ تک‌فایل: تصاویر طیف به data URI تبدیل شده‌اند، پس\n" +
        "   spectraDir خالی می‌شود و نام فایل‌ها جای خود data URI را می‌گیرند. */\n" +
        "(function (root) {\n" +
        "  var DB = root.DB; if (!DB) return;\n" +
        "  DB.spectraDir = \"\";\n" +
        "  DB.spectraManifest = " + JSON.stringify(asData, null, 2) + ";\n" +
        "})(window);\n" +
        "</script>\n";
    }
  } catch (e) {
    console.warn("هشدار: فهرست تصاویر جاسازی نشد (" + e.message + ") — بقیهٔ ساخت ادامه می‌یابد.");
  }

  // ---------- ۳) JavaScript ----------
  html = html.replace(/[ \t]*<script src="([^"]+)"><\/script>\s*/g, (m, src) => {
    let js;
    try {
      js = read(src);
    } catch (e) {
      console.warn("هشدار: " + src + " یافت نشد — رد شد.");
      return "";
    }
    inlined.js++;
    let out = "<script>\n" + safeForInlineScript(js) + "\n</script>\n";
    // بلافاصله بعد از فهرست تصاویر، بازنویسیِ data URI را تزریق کن
    if (src.indexOf("spectra-manifest") !== -1 && overrideScript) out += overrideScript;
    return out;
  });

  // ---------- ۴) نشانهٔ ساخت ----------
  html = html.replace(/<title>([^<]*)<\/title>/,
    "<title>$1</title>\n<!-- نسخهٔ تک‌فایل — ساخته‌شده با tools/build-standalone.js. رویش کار نکنید؛ منبع در js/ و data/ است. -->");

  fs.writeFileSync(OUT, html, "utf8");
  const kb = Math.round(Buffer.byteLength(html, "utf8") / 1024);
  console.log("ساخته شد: " + path.basename(OUT));
  console.log("  CSS: " + inlined.css + " · JS: " + inlined.js + " · تصویر: " + inlined.images);
  console.log("  حجم: " + kb + " KB");
  // ارجاع‌های بیرونیِ واقعی را بشمار — نه جای‌گیرهای ${...} داخل رشته‌های
  // قالبیِ JS (مثل src="${esc(src)}" در field-ui.js) که در زمان اجرا پر می‌شوند.
  const leftover = (html.match(/(?:src|href)="(?!data:|#|https?:)[^"]*"/g) || [])
    .filter(x => x.indexOf("${") === -1 && x.indexOf('=""') === -1);
  if (leftover.length) console.warn("  ⚠ ارجاع بیرونی باقی‌مانده: " + [...new Set(leftover)].join(", "));
  else console.log("  ✓ هیچ ارجاع بیرونی باقی نمانده — کاملاً مستقل.");
}

build();
