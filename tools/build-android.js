#!/usr/bin/env node
/* =====================================================================
   build-android.js — ساختِ فایلِ نصبیِ اندروید (APK)
   ---------------------------------------------------------------------
   اجرا:
       node tools/build-android.js            (نسخهٔ debug — نصب‌شدنی)
       node tools/build-android.js --release   (نسخهٔ release — امضا لازم دارد)

   آینه فقط وقتی لازم است که مسیرِ پروژه غیرِ ASCII باشد.
   افزونهٔ رسمیِ اندروید (AGP) در آن حالت ساخت را رد می‌کند:

       Your project path contains non-ASCII characters.
       This will most likely cause the build to fail on Windows.

   و android.overridePathCheck فقط هشدار را خفه می‌کند؛ خودِ aapt2 باز هم
   روی مسیرِ غیرِ ASCII می‌شکند. پس در آن حالت این اسکریپت یک «آینه» با
   مسیرِ کاملاً ASCII می‌سازد، Gradle را آن‌جا اجرا می‌کند و APK را
   برمی‌گرداند کنارِ خودِ برنامه. چیدمانِ آینه با اصل یکی است، پس
   build.gradle هیچ فرقی نمی‌فهمد و لازم نیست چیزی درش شرطی شود.
   پوشه‌های build/ و .gradle/ در آینه دست‌نخورده می‌مانند تا ساختِ دوم به
   بعد افزایشی و سریع باشد.

   اگر مسیر ASCII باشد — که از وقتی پوشهٔ پروژه به «Spectra» تغییرِ نام
   داد همین‌طور است — آینه‌ای در کار نیست و Gradle مستقیم روی خودِ
   پروژه اجرا می‌شود. این هم سریع‌تر است و هم یک تلهٔ واقعی را برمی‌دارد:
   با آینه، Android Studio باید پوشهٔ آینه را باز می‌کرد نه پوشهٔ اصلی را،
   وگرنه ویرایش‌ها به جایی می‌رفت که ساخته نمی‌شد.

   تشخیص خودکار است، پس اسکریپت در هر دو حالت درست کار می‌کند و اگر
   پروژه دوباره به مسیرِ غیرِ ASCII منتقل شود خودش آینه را برمی‌گرداند.
   ===================================================================== */
"use strict";
const fs = require("fs");
const path = require("path");
const os = require("os");
const { spawnSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const MIRROR = path.join(process.env.LOCALAPPDATA || os.tmpdir(), "Spectra-Android-Build");

/* تنها معیار: آیا مسیر نویسهٔ غیرِ ASCII دارد؟ اگر نه، آینه بی‌فایده است. */
const NEEDS_MIRROR = /[^\x20-\x7E]/.test(ROOT);
const BUILD_ROOT = NEEDS_MIRROR ? MIRROR : ROOT;

/* همان فهرستی که build.gradle داخلِ assets/www می‌ریزد، به‌اضافهٔ خودِ
   پوشهٔ android. هر چیزِ دیگری (tools/، نسخهٔ تک‌فایل، فایل‌های cmd) در
   ساختِ اندروید نقشی ندارد. */
const WEB_ITEMS = ["index.html", "css", "js", "data", "assets"];

/* این‌ها نتیجهٔ ساخت‌اند، نه منبع: هنگام تازه‌سازیِ آینه نگه داشته
   می‌شوند تا Gradle مجبور نشود هر بار از صفر شروع کند. */
const KEEP_IN_MIRROR = new Set(["build", ".gradle"]);

const RELEASE = process.argv.includes("--release");
const VARIANT = RELEASE ? "release" : "debug";
const GRADLE_TASK = RELEASE ? "assembleRelease" : "assembleDebug";

/* --------------------------------------------------------------------
   یافتنِ JDK و Gradle
   -------------------------------------------------------------------- */
function firstExisting(candidates) {
  for (const c of candidates) if (c && fs.existsSync(c)) return c;
  return null;
}

const LOCAL_PROGRAMS = path.join(process.env.LOCALAPPDATA || "", "Programs");

const JAVA_HOME = firstExisting([
  process.env.JAVA_HOME,
  path.join(LOCAL_PROGRAMS, "jdk-17")
]);

const GRADLE_BIN = firstExisting([
  process.env.GRADLE_BIN,
  path.join(LOCAL_PROGRAMS, "gradle-dist", "gradle-8.9", "bin", "gradle.bat")
]);

function fail(msg) {
  console.error("\nخطا: " + msg);
  process.exit(1);
}

if (!JAVA_HOME) {
  fail("JDK 17 پیدا نشد.\n" +
       "  یا JAVA_HOME را تنظیم کنید، یا JDK را در این مسیر بگذارید:\n" +
       "  " + path.join(LOCAL_PROGRAMS, "jdk-17"));
}
if (!GRADLE_BIN) {
  fail("Gradle پیدا نشد.\n" +
       "  یا GRADLE_BIN را به gradle.bat اشاره دهید، یا توزیع را این‌جا باز کنید:\n" +
       "  " + path.join(LOCAL_PROGRAMS, "gradle-dist", "gradle-8.9"));
}

/* --------------------------------------------------------------------
   تازه‌سازیِ آینه
   -------------------------------------------------------------------- */
/* کپیِ بازگشتیِ دستی، عمداً به‌جای fs.cpSync.
   روی همین ماشین (Node 22.20 / ویندوز ۱۰) هر بار که cpSync را روی یک
   *پوشه* صدا بزنیم، فرایندِ Node با کد ۱۲۷ و بی‌هیچ پیامی می‌میرد؛ روی
   فایلِ تنها سالم کار می‌کند. با readdir + copyFileSync هیچ مشکلی نیست،
   و چیزی هم از دست نمی‌دهیم. */
function copyTree(src, dst) {
  if (fs.statSync(src).isDirectory()) {
    fs.mkdirSync(dst, { recursive: true });
    for (const name of fs.readdirSync(src)) {
      copyTree(path.join(src, name), path.join(dst, name));
    }
  } else {
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    fs.copyFileSync(src, dst);
  }
}

/** محتوای یک پوشه را پاک می‌کند، جز نام‌هایی که در keep آمده‌اند. */
function clearExcept(dir, keep = new Set()) {
  if (!fs.existsSync(dir)) return;
  for (const name of fs.readdirSync(dir)) {
    if (keep.has(name)) continue;
    fs.rmSync(path.join(dir, name), { recursive: true, force: true });
  }
}

function syncMirror() {
  fs.mkdirSync(MIRROR, { recursive: true });

  /* فایل‌های وب: کاملاً جای‌گزین می‌شوند تا فایلِ حذف‌شده در اصل، در آینه
     زامبی‌وار زنده نماند و داخل APK بیاید. */
  for (const item of WEB_ITEMS) {
    const src = path.join(ROOT, item);
    const dst = path.join(MIRROR, item);
    fs.rmSync(dst, { recursive: true, force: true });
    if (!fs.existsSync(src)) {
      if (item === "index.html") fail("index.html در " + ROOT + " نیست.");
      continue;                       // assets/ می‌تواند نباشد
    }
    copyTree(src, dst);
  }

  /* پروژهٔ اندروید: همه‌چیز نو می‌شود جز خروجی‌های ساخت. */
  const srcAndroid = path.join(ROOT, "android");
  const dstAndroid = path.join(MIRROR, "android");
  if (!fs.existsSync(srcAndroid)) fail("پوشهٔ android/ در " + ROOT + " نیست.");
  clearExcept(dstAndroid, KEEP_IN_MIRROR);
  fs.mkdirSync(dstAndroid, { recursive: true });
  for (const name of fs.readdirSync(srcAndroid)) {
    if (KEEP_IN_MIRROR.has(name)) continue;   // build/ و .gradle/ اصل را نبر
    copyTree(path.join(srcAndroid, name), path.join(dstAndroid, name));
  }
}

/* --------------------------------------------------------------------
   اجرا
   -------------------------------------------------------------------- */
if (NEEDS_MIRROR) {
  console.log("مسیرِ پروژه غیرِ ASCII است، پس از آینه ساخته می‌شود.");
  console.log("آینهٔ ساخت: " + MIRROR);
  syncMirror();
  console.log("همگام شد. اجرای Gradle (" + GRADLE_TASK + ")…\n");
} else {
  console.log("ساخت در خودِ پروژه (مسیر ASCII است، آینه لازم نیست).");
  console.log("اجرای Gradle (" + GRADLE_TASK + ")…\n");
}

/* Gradle روی ویندوز یک فایلِ .bat است و آن را فقط cmd.exe می‌تواند اجرا
   کند. عمداً از shell:true استفاده نمی‌کنیم: اگر این اسکریپت از داخلِ
   Git Bash صدا زده شود، Node شلِ sh را برمی‌دارد و sh فایلِ .bat را
   نمی‌شناسد — نتیجه‌اش کدِ ۱۲۷ و پیامی گمراه‌کننده است. */
const isWin = process.platform === "win32";
const cmd = isWin ? (process.env.ComSpec || "cmd.exe") : GRADLE_BIN;
const cmdArgs = isWin
  ? ["/c", GRADLE_BIN, GRADLE_TASK, "--console=plain"]
  : [GRADLE_TASK, "--console=plain"];

const res = spawnSync(cmd, cmdArgs, {
  cwd: path.join(BUILD_ROOT, "android"),
  stdio: "inherit",
  env: Object.assign({}, process.env, {
    JAVA_HOME: JAVA_HOME,
    ANDROID_HOME: process.env.ANDROID_HOME ||
      path.join(process.env.LOCALAPPDATA || "", "Android", "Sdk")
  })
});

if (res.status !== 0) fail("Gradle با کد " + res.status + " شکست خورد (بالا را ببینید).");

/* --------------------------------------------------------------------
   برگرداندنِ APK
   -------------------------------------------------------------------- */
const outDir = path.join(BUILD_ROOT, "android", "app", "build", "outputs", "apk", VARIANT);
if (!fs.existsSync(outDir)) fail("پوشهٔ خروجی ساخته نشد: " + outDir);
const apk = fs.readdirSync(outDir).filter(f => f.endsWith(".apk"))[0];
if (!apk) fail("در " + outDir + " هیچ APK نبود.");

/* نسخهٔ روزمره همان «Spectra.apk» است — همان نامی که کاربر خودش
   دستی گذاشته بود. فقط نسخهٔ انتشار برچسب می‌خورد، چون آن یکی است
   که نباید با نصبیِ روزمره اشتباه شود. */
const dest = path.join(ROOT, "Spectra" + (RELEASE ? "-release" : "") + ".apk");
fs.copyFileSync(path.join(outDir, apk), dest);

const mb = (fs.statSync(dest).size / (1024 * 1024)).toFixed(2);
console.log("\nساخته شد: " + path.basename(dest) + "  (" + mb + " مگابایت)");
console.log("  مسیر: " + dest);
if (!RELEASE) {
  console.log("  با کلیدِ debug امضا شده — روی گوشی نصب می‌شود، برای کافه‌بازار/گوگل‌پلی نه.");
}
