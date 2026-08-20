/* =====================================================================
   spectra-manifest.js — فهرست تصاویر طیفِ موجود روی دیسک
   ---------------------------------------------------------------------
   ⚠ این فایل ساخته‌شده است — دستی ویرایش نکنید.
   بازسازی:  node tools/build-spectra-manifest.js

   ساختار: DB.spectraManifest[slug][type] = نام فایل
   slug از نام انگلیسی ترکیب ساخته می‌شود (همان slugify در field-ui.js).
   وجودِ کلید = وجودِ فایل؛ پس field-ui.js هیچ درخواست ۴۰۴ نمی‌فرستد.

   تعداد ترکیب‌های دارای تصویر: 1 · تعداد کل تصاویر: 1
   ===================================================================== */
(function (root) {
  "use strict";
  var DB = root.DB;
  if (!DB) { console.warn("spectra-manifest: DB یافت نشد؛ ترتیب <script> را بررسی کنید."); return; }

  DB.spectraDir = "assets/spectra/";
  DB.spectraManifest = {
    "1-2-dibromoethane": { ir: "1-2-dibromoethane-ir.jpg" },
  };

  if (typeof console !== "undefined")
    console.info("spectra-manifest: 1 ترکیب دارای تصویر، 1 تصویر ثبت شد.");
})(typeof window !== "undefined" ? window : globalThis);
