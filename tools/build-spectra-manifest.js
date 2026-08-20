#!/usr/bin/env node
/* =====================================================================
   build-spectra-manifest.js — سازندهٔ فهرست تصاویر طیف
   ---------------------------------------------------------------------
   پوشهٔ assets/spectra را می‌خواند و data/spectra-manifest.js را می‌سازد.
   دلیل وجود: پیش‌تر field-ui.js برای هر ترکیب ۵ نام فایل حدسی می‌ساخت و
   با onerror موارد نبود را پنهان می‌کرد — یعنی برای ۲۰۰ ترکیب تا ۱۰۰۰
   درخواست ۴۰۴. با این فهرست، فقط تصاویری که واقعاً وجود دارند درخواست
   می‌شوند.

   اجرا (هر بار که تصویری اضافه/حذف شد):
       node tools/build-spectra-manifest.js

   قاعدهٔ نام‌گذاری فایل بدون تغییر است:
       assets/spectra/<slug>-<type>.(jpg|jpeg|png|webp|gif|avif)
   انواع شناخته‌شده: combo · ir · ms · h1 · c13
   ===================================================================== */
"use strict";
const fs = require("fs");
const path = require("path");

const ROOT     = path.resolve(__dirname, "..");
const SPEC_DIR = path.join(ROOT, "assets", "spectra");
const OUT_FILE = path.join(ROOT, "data", "spectra-manifest.js");

const TYPES = ["combo", "ir", "ms", "h1", "c13"];
const EXTS  = [".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif"];

function build() {
  let files = [];
  try {
    files = fs.readdirSync(SPEC_DIR);
  } catch (e) {
    console.warn("هشدار: پوشهٔ assets/spectra خوانده نشد (" + e.code + ") — فهرست خالی ساخته می‌شود.");
  }

  // slug → { type: "filename.ext" }
  const map = {};
  const skipped = [];
  files.forEach(name => {
    const ext = path.extname(name).toLowerCase();
    if (!EXTS.includes(ext)) return;
    const base = name.slice(0, -ext.length);
    // آخرین بخش پس از خط تیره، «نوع» است
    const dash = base.lastIndexOf("-");
    const type = dash === -1 ? null : base.slice(dash + 1).toLowerCase();
    const slug = dash === -1 ? null : base.slice(0, dash);
    if (!slug || !TYPES.includes(type)) { skipped.push(name); return; }
    (map[slug] || (map[slug] = {}))[type] = name;
  });

  const slugs = Object.keys(map).sort();
  let body = "";
  slugs.forEach(slug => {
    const entries = TYPES.filter(t => map[slug][t])
      .map(t => `${t}: ${JSON.stringify(map[slug][t])}`).join(", ");
    body += `    ${JSON.stringify(slug)}: { ${entries} },\n`;
  });

  const total = slugs.reduce((n, s) => n + Object.keys(map[s]).length, 0);
  const out =
`/* =====================================================================
   spectra-manifest.js — فهرست تصاویر طیفِ موجود روی دیسک
   ---------------------------------------------------------------------
   ⚠ این فایل ساخته‌شده است — دستی ویرایش نکنید.
   بازسازی:  node tools/build-spectra-manifest.js

   ساختار: DB.spectraManifest[slug][type] = نام فایل
   slug از نام انگلیسی ترکیب ساخته می‌شود (همان slugify در field-ui.js).
   وجودِ کلید = وجودِ فایل؛ پس field-ui.js هیچ درخواست ۴۰۴ نمی‌فرستد.

   تعداد ترکیب‌های دارای تصویر: ${slugs.length} · تعداد کل تصاویر: ${total}
   ===================================================================== */
(function (root) {
  "use strict";
  var DB = root.DB;
  if (!DB) { console.warn("spectra-manifest: DB یافت نشد؛ ترتیب <script> را بررسی کنید."); return; }

  DB.spectraDir = "assets/spectra/";
  DB.spectraManifest = {
${body}  };

  if (typeof console !== "undefined")
    console.info("spectra-manifest: ${slugs.length} ترکیب دارای تصویر، ${total} تصویر ثبت شد.");
})(typeof window !== "undefined" ? window : globalThis);
`;
  fs.writeFileSync(OUT_FILE, out, "utf8");
  console.log(`نوشته شد: data/spectra-manifest.js — ${slugs.length} ترکیب، ${total} تصویر.`);
  if (skipped.length) console.log(`نادیده گرفته شد (نام غیرمنطبق): ${skipped.join(", ")}`);
}

build();
