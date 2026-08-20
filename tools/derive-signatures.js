/* =====================================================================
   tools/derive-signatures.js — استخراج «امضای ماشین‌خوان» از بانک سوالات
   ---------------------------------------------------------------------
   مسئله‌ای که این ابزار حل می‌کند:
     بانک DB.fieldProblems (۱۵۰+ ترکیب) و بخشی از DB.reference فقط متن
     فارسی طیف داشتند و هیچ آرایهٔ signature/chain نداشتند. یعنی موتور
     استنتاج آن‌ها را نمی‌دید: تنها جست‌وجوی «فرمول دقیق» پیدایشان می‌کرد.
     این ابزار اعداد و کلیدواژه‌های همان متن‌ها را قطعی (deterministic)
     تجزیه می‌کند و به تگ‌های موجودِ پایگاه نگاشت می‌دهد.

   قاعدهٔ صحت: هیچ تگی «حدس» زده نمی‌شود. اگر عدد یا کلیدواژهٔ صریح در
   متن نباشد، تگ صادر نمی‌شود و ترکیب در گزارش «کم‌پوشش» فهرست می‌شود.
   اصلاح دستی از طریق جدول OVERRIDES پایین همین فایل انجام می‌شود تا با
   اجرای دوبارهٔ ابزار پاک نشود.

   اجرا:  node tools/derive-signatures.js
   خروجی: data/database-signatures.js  (تولیدی — دستی ویرایش نکنید)
   ===================================================================== */
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.join(__dirname, "..");

/* ---------- ۱) بارگذاری پایگاه با همان ترتیب index.html ---------- */
function loadDB() {
  const sandbox = { console: { info() {}, warn() {}, log() {}, error() {} } };
  sandbox.window = sandbox; sandbox.self = sandbox;
  const ctx = vm.createContext(sandbox);
  for (const f of ["data/database.js", "data/field-data.js", "data/field-osfs-table.js", "data/database-expansion.js"]) {
    vm.runInContext(fs.readFileSync(path.join(ROOT, f), "utf8"), ctx, { filename: f });
  }
  const DB = sandbox.DB;
  if (DB.dedupeFieldProblems) DB.dedupeFieldProblems();
  return DB;
}

/* ---------- ۲) نرمال‌سازی رقم‌های فارسی/عربی ---------- */
const FA_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const AR_DIGITS = "٠١٢٣٤٥٦٧٨٩";
function toLatinDigits(str) {
  let out = "";
  for (const ch of String(str)) {
    const fi = FA_DIGITS.indexOf(ch), ai = AR_DIGITS.indexOf(ch);
    if (fi >= 0) out += String(fi);
    else if (ai >= 0) out += String(ai);
    else if (ch === "٫") out += ".";      // جداکنندهٔ اعشار عربی
    else out += ch;
  }
  return out;
}
/* «۱۲H» یک شمارشِ پروتون است نه شیفتِ ۱۲ppm، و «۸ Hz» ثابتِ کوپلاژ است نه
   شیفت. بدون پاک‌کردنِ این‌ها، پیناکول با «سینگلت ۱۲H» تگِ h_acid (۹.۸+)
   می‌گرفت — یعنی پروتونِ کربوکسیلیک اسیدی که وجود ندارد. */
function stripCounts(text) {
  return toLatinDigits(text)
    .replace(/\d+(?:\.\d+)?\s*Hz/gi, " ")      // ثابتِ کوپلاژ
    .replace(/\d+\s*H(?![a-z])/g, " ")          // شمارشِ پروتون (4H، 12H)
    .replace(/[×xX]\s*\d+/g, " ")               // ضریبِ تکرار (×۳)
    .replace(/[A-Za-zء-ۿ]-\d+/g, " ");      // شمارهٔ موقعیت (C-4، H-2)
}
function numbersIn(text, lo, hi) {
  return (stripCounts(text).match(/\d+(?:\.\d+)?/g) || [])
    .map(Number)
    .filter(n => Number.isFinite(n) && n >= lo && n <= hi);
}
/* برای m/z و IR، شمارشِ پروتون مزاحم نیست ولی Hz و شمارهٔ موقعیت هستند */
function massNumbersIn(text, lo, hi) {
  return (toLatinDigits(text).replace(/\d+(?:\.\d+)?\s*Hz/gi, " ").match(/\d+(?:\.\d+)?/g) || [])
    .map(Number)
    .filter(n => Number.isFinite(n) && n >= lo && n <= hi);
}

/* ---------- ۳) نگاشت IR: بازهٔ فرکانسی + کلیدواژهٔ الزامی ---------- */
/* هر قاعده تنها وقتی تگ می‌دهد که هم عددی در بازه باشد و هم کلیدواژه در متن.
   الزام کلیدواژه جلوی خطای رایج را می‌گیرد: عدد ۱۷۱۰ هم می‌تواند کتون باشد
   هم اسید، و بدون واژهٔ تعیین‌کننده نباید هیچ‌کدام صادر شود. */
const IR_RULES = [
  { tag: "ir_oh_acid",    lo: 2400, hi: 3300, need: /اسید|COOH|کربوکسیل/ },
  { tag: "ir_oh_alc",     lo: 3150, hi: 3650, need: /O–H|O-H|OH|الکل|فنول|هیدروکسیل/ },
  { tag: "ir_nh",         lo: 3150, hi: 3520, need: /N–H|N-H|NH|آمین|آمید|آمینو/ },
  { tag: "ir_alkyne_h",   lo: 3260, hi: 3340, need: /≡C–H|≡C-H|≡CH|آلکین/ },
  { tag: "ir_aldehyde",   lo: 2680, hi: 2850, need: /فرمی|آلدهید|فرمیل|شاخک/ },
  { tag: "ir_isocyanate", lo: 2250, hi: 2290, need: /ایزوسیانات|N=C=O/ },
  { tag: "ir_triple_cn",  lo: 2200, hi: 2270, need: /C≡N|نیتریل|سیانو/ },
  { tag: "ir_triple_cc",  lo: 2080, hi: 2270, need: /C≡C|آلکین/ },
  { tag: "ir_anhydride",  lo: 1780, hi: 1880, need: /انیدرید/ },
  { tag: "ir_acidcl",     lo: 1770, hi: 1830, need: /کلرید اسید|اسیدکلراید|کلراید اسید|آسیل کلراید|COCl/ },
  { tag: "ir_ester_aryl", lo: 1750, hi: 1790, need: /استر فنولی|آریل‌استر|استر آریلی/ },
  { tag: "ir_co_ester",   lo: 1725, hi: 1780, need: /استر|لاکتون|استات|کربونات|OAc|استوکسی/ },
  { tag: "ir_co_ketone",  lo: 1695, hi: 1760, need: /کتون|آلدهید|C=O|کربونیل/ },
  { tag: "ir_co_conj",    lo: 1655, hi: 1700, need: /مزدوج|آریل|انون/ },
  { tag: "ir_co_amide",   lo: 1630, hi: 1700, need: /آمید|اوره|لاکتام/ },
  { tag: "ir_urea",       lo: 1620, hi: 1680, need: /اوره/ },
  { tag: "ir_cn_ring",    lo: 1600, hi: 1660, need: /پیریدین|C=N حلقه/ },
  { tag: "ir_nitro",      lo: 1490, hi: 1580, need: /نیترو|NO₂|NO2/ },
  { tag: "ir_nitro",      lo: 1300, hi: 1390, need: /نیترو|NO₂|NO2/ },
  { tag: "ir_aromatic",   lo: 1430, hi: 1620, need: /آروماتیک|بنزن|حلقه|C=C/ },
  { tag: "ir_gem_dimethyl", lo: 1355, hi: 1395, need: /جم|gem|ترت|ایزوپروپیل|دوقلو/ },
  { tag: "ir_cf",         lo: 1000, hi: 1350, need: /C–F|C-F|فلوئور|CF₃|CF3/ },
  { tag: "ir_co_single",  lo: 1000, hi: 1310, need: /C–O|C-O|C–N|C-N|اتر|استر|الکل|فنول/ },
  { tag: "ir_oop_trans",  lo: 950,  hi: 985,  need: /ترانس|trans|OOP/ },
  { tag: "ir_para",       lo: 795,  hi: 850,  need: /پارا|para|AA/ },
  { tag: "ir_ortho",      lo: 730,  hi: 790,  need: /اورتو|ortho/ },
  { tag: "ir_mono",       lo: 680,  hi: 780,  need: /تک‌استخلاف|مونو|mono|دو نوار|دو پیک/ },
  { tag: "ir_oop_cis",    lo: 665,  hi: 740,  need: /سیس|cis/ }
];

function deriveIR(text) {
  if (!text) return [];
  const nums = massNumbersIn(text, 400, 4000);
  const out = new Set();
  for (const r of IR_RULES) {
    if (!r.need.test(text)) continue;
    if (nums.some(n => n >= r.lo && n <= r.hi)) out.add(r.tag);
  }
  return [...out];
}

/* ---------- ۴) نگاشت MS: الگوی ایزوتوپی + قطعاتی که پایگاه می‌شناسد ---------- */
function deriveMS(text, DB) {
  if (!text) return [];
  const out = new Set();
  const t = toLatinDigits(text);
  if (/\b3\s*:\s*1\b/.test(t) || /یک کلر/.test(text)) out.add("ms_cl");
  if (/\b1\s*:\s*1\b/.test(t) || /یک برم/.test(text)) out.add("ms_br");
  if (/\b9\s*:\s*6\s*:\s*1\b/.test(t) || /دو کلر|۲ کلر/.test(text)) out.add("ms_cl2");
  if (/\b1\s*:\s*2\s*:\s*1\b/.test(t) || /دو برم|۲ برم/.test(text)) out.add("ms_br2");
  for (const key of new Set(massNumbersIn(text, 12, 400).map(String))) {
    const fr = DB.ms.fragments[key];
    if (!fr) continue;
    out.add(fr.id);
    (fr.alts || []).forEach(a => out.add(a.id));
  }
  return [...out];
}

/* ---------- ۵) نگاشت ¹³C و ¹H از روی شیفت‌ها ---------- */
function deriveC13(text) {
  if (!text) return [];
  const out = new Set();
  const isAlkyne = /آلکین|≡/.test(text);
  for (const n of numbersIn(text, 0, 230)) {
    if (n >= 186) out.add("c_ketone");
    else if (n >= 150) out.add("c_ester");
    else if (n >= 100) out.add("c_sp2");
    else if (n >= 65) out.add(isAlkyne && n < 92 ? "c_alkyne" : "c_hetero");
    else if (n >= 50) out.add("c_hetero");
    else out.add("c_alkyl");
  }
  if (/کوارتت[^.]{0,30}(فلوئور|F\b)|C–F|C-F/.test(text)) out.add("c_cf_quartet");
  if (/اتم سنگین|اثر ید/.test(text)) out.add("c_heavy_i");
  return [...out];
}

const H_PATTERNS = [
  { tag: "h_tbu",       re: /۹H|9H/ },
  { tag: "h_iso",       re: /سپتت|هفت‌تایی|هپتت/ },
  { tag: "h_ethyl",     re: /(تریپلت|سه‌تایی)[^.]{0,45}(کوارتت|چهارتایی)|(کوارتت|چهارتایی)[^.]{0,45}(تریپلت|سه‌تایی)/ },
  { tag: "h_para",      re: /AA['′]BB|شیروانی|دو دوتایی متقارن/ },
  { tag: "h_abcd",      re: /ABCD|اورتو-دواستخلاف/ },
  { tag: "h_ar_mono",   re: /۵H|5H|تک‌استخلافی/ },
  { tag: "h_d2o",       re: /D₂O|D2O|تبادل/ },
  { tag: "h_quintet",   re: /کوینتت|پنج‌تایی/ },
  { tag: "h_sextet",    re: /سکستت|شش‌تایی/ },
  { tag: "h_acetal",    re: /استال/ },
  { tag: "h_ch_alkyne", re: /≡C–H|≡CH|آلکین انتهایی/ }
];

function deriveH1(text) {
  if (!text) return [];
  const out = new Set();
  const nums = numbersIn(text, 0, 14);
  for (const n of nums) {
    if (n >= 9.8) out.add("h_acid");
    else if (n >= 8.9) out.add("h_ald");
    else if (n >= 6.4) out.add("h_ar");
    else if (n >= 4.5) out.add("h_vinyl");
    else if (n >= 2.9) out.add("h_hetero");
    else if (n >= 1.5) out.add("h_alpha");
    else if (n >= 0.5) out.add("h_alkyl");
  }
  for (const p of H_PATTERNS) if (p.re.test(text)) out.add(p.tag);
  // متوکسی: سینگلت ۳H در ۳.۶–۴.۰۵
  if (/۳H|3H/.test(text) && nums.some(n => n >= 3.6 && n <= 4.05)) out.add("h_methoxy");
  // عدد ۹–۱۰ بدون کلیدواژهٔ آلدهید می‌تواند پروتون آروماتیکِ به‌شدت دی‌شیلد باشد
  if (!/آلدهید|فرمیل|CHO/.test(text)) out.delete("h_ald");
  return [...out];
}

/* ---------- ۶) نگاشت نام فارسی بلوک‌ها → شناسهٔ بلوک ---------- */
/* بانک سوالات، بلوک‌ها را با «نام نمایشی» فارسی ثبت کرده بود (نه شناسه)، پس
   موتور مونتاژ نمی‌توانست از آن استفاده کند. یک نام می‌تواند به چند بلوک
   بسط یابد (مثلاً «اتوکسی‌کربونیل» = ester_co + ethyl). */
const BLOCK_ALIASES = {
  // --- نامِ نمایشیِ بلوک‌های افزودهٔ فاز ۴ (database-expansion.js) ---
  "تیول": ["thiol"], "تیواتر": ["thioether"], "سولفوکسید": ["sulfoxide"],
  "سولفونامید": ["sulfonamide"], "سولفونات (تسیلات)": ["sulfonate"],
  "اپوکسید": ["epoxide"], "آلکین درونی": ["alkyne_internal"],
  "متیلن‌دی‌اکسی": ["methylenedioxy"], "نفتیل": ["naphthyl"],
  "کربونیل فلوئورنونی": ["fluorenyl_co"], "متا-فنیلن": ["phenylene_m"],
  "دی‌متیل‌آمینو (آمین ۳°)": ["amine3_dimethyl"],

  "متیلن": ["ch2"], "زنجیر متیلنی": ["ch2"], "متیلن sp³": ["ch2"], "اتیلن": ["ch2", "ch2"],
  "اتان-۱،۲-دی‌ایل": ["ch2", "ch2"], "پروپان-۱،۳-دی‌ایل": ["ch2", "ch2", "ch2"],
  "متین": ["ch"], "متین بنزیلیک": ["ch"], "متین (CH-CH₃)": ["ch"], "متین(متیل)": ["ch"],
  "متین (CH-OH)": ["ch"], "متین-Br": ["ch"], "متین آلفا-برم": ["ch"],
  "متین آلفا (CH-NH₂)": ["ch"], "متین (متوکسی)": ["ch"],
  "متین استالی (CH(OMe)₂)": ["ch"], "دی‌کلرومتین": ["ch", "chloro", "chloro"],
  "متیل": ["methyl"], "متیل ×۳": ["methyl", "methyl", "methyl"],
  "متیل ×۴": ["methyl", "methyl", "methyl", "methyl"],
  "متیل ×۶": ["methyl", "methyl", "methyl", "methyl", "methyl", "methyl"],
  "دو متیل هم‌ارز": ["methyl", "methyl"], "سه متیل مجاور هم": ["methyl", "methyl", "methyl"],
  "چهار متیل پیوسته نامتقارن": ["methyl", "methyl", "methyl", "methyl"],
  "چهار متیل وینیلی": ["methyl", "methyl", "methyl", "methyl"],
  // در ورودی‌های بانک، حلقه خودش متیل‌ها را ذکر کرده، پس این بازتوصیف است
  "دو Ar–CH₃": [],
  "یک متیل sp³ روی CH": ["methyl"],
  "gem-دی‌متیل": ["methyl", "methyl"],
  "کربن چهارتایی (gem-دی‌متیل)": ["ch", "methyl", "methyl"],
  "اتیل": ["ethyl"], "دو اتیل (روی Cq)": ["ethyl", "ethyl"],
  "ترت‌بوتیل": ["tbutyl"], "ترت-بوتیل": ["tbutyl"],
  "ایزوپروپیل": ["isopropyl"], "ایزوپرنیل×2": ["isopropyl", "isopropyl"],
  "نرمال‌پروپیل": ["npropyl"], "n-پروپیل": ["npropyl"], "پروپیل": ["npropyl"],
  "بوتیل": ["butyl"], "n-بوتیل": ["butyl"], "زنجیر نرمال‌بوتیل": ["butyl"],
  "n-بوتیل (اسیدی)": ["butyl"], "n-بوتیل (الکلی)": ["butyl"],
  "ایزوبوتیل": ["isopropyl", "ch2"], "n-پنتیل": ["butyl", "ch2"],
  "زنجیر آلکیل مستقیم": ["ch2"],
  "کربن چهارتایی": ["ch"], "کربن چهارتاییِ مرکزی": ["ch"],
  "کربن چهارتایی (C-OH)": ["ch", "hydroxyl"], "هیدروکسیل کوارترنر": ["hydroxyl"],

  "فنیل": ["phenyl"], "فنیل (متقارن)": ["phenyl"], "حلقهٔ بنزن": ["phenyl"],
  "حلقهٔ آروماتیک": ["phenyl"], "حلقهٔ آروماتیک متقارن": ["phenyl"], "بنزیل": ["benzyl"],
  "پارا-فنیلن": ["phenylene_p"], "فنیلن (پارا)": ["phenylene_p"],
  "حلقهٔ پارا-استخلاف": ["phenylene_p"], "حلقهٔ پارا-متیل": ["tolyl_p"],
  "حلقهٔ پارا-نیترو": ["phenylene_p", "nitro"], "حلقهٔ پارا-برم": ["phenylene_p", "bromo"],
  "حلقهٔ آروماتیک پارا-برم": ["phenylene_p", "bromo"],
  "حلقهٔ آروماتیک پارا-برم (متقارن)": ["phenylene_p", "bromo"],
  "حلقهٔ پارا-متوکسی": ["phenylene_p", "methoxy"],
  "فنیلن (اورتو)": ["phenylene_o"], "اورتو-فنیلن": ["phenylene_o"],
  "حلقهٔ بنزن (اورتو-دی‌متیل)": ["phenylene_o", "methyl", "methyl"],
  "فنیلن (متا)": ["phenylene_m"],
  "پیریدین": ["pyridin_3yl"], "حلقهٔ پیریدین جوش‌خورده": ["pyridin_3yl"],
  "حلقهٔ بنزن جوش‌خورده": ["phenylene_o"],
  "دو حلقهٔ بنزن جوش‌خورده": ["phenylene_o", "phenylene_o"],
  "پیوند بی‌فنیلی": [],                 // پیوند است، نه حلقه — حلقه‌ها جداگانه فهرست شده‌اند

  "کربونیل": ["ketone"], "کتون": ["ketone"], "کربونیل حلقوی پنج‌ضلعی": ["ketone"],
  "کربونیل مزدوج": ["ketone"], "کربونیل مزدوج (انون)": ["ketone"],
  "کتون مزدوج α,β-غیراشباع": ["ketone"], "سیستم انونی": [],                    // بازتوصیفِ همان کربونیلِ مزدوجِ فهرست‌شده
  "دو کربونیل متقارن در ۱ و ۴": ["ketone", "ketone"],
  "کربونیل (استیل)": ["acyl"], "استیل": ["acyl"],
  "آلدهید": ["aldehyde"], "فرمیل": ["aldehyde"],
  "فرمات (استرِ فرمیک)": ["formate"],
  "کربوکسیلیک اسید": ["cooh"], "کربوکسیل": ["cooh"], "کربوکسیلات": ["cooh"],
  "استر": ["ester_co"], "کربونیل استری": ["ester_co"], "استری‌کربونیل": ["ester_co"],
  "استر حلقوی (C=O)": ["ester_co"], "حلقهٔ لاکتون شش‌ضلعی": ["ester_co"],
  "اکسیژن استری": ["ether_o"], "استر متیلی": ["ester_co", "methyl"],
  "متوکسی‌کربونیل": ["ester_co", "methyl"],
  "متوکسی‌کربونیل (متقارن)": ["ester_co", "methyl"],
  "متوکسی‌کربونیل آروماتیک": ["ester_co", "methyl"],
  "اتوکسی‌کربونیل": ["ester_co", "ethyl"],
  "اتوکسی‌کربونیل (متقارن)": ["ester_co", "ethyl"],
  "کربواتوکسی": ["ester_co", "ethyl"], "کربواتوکسی (دی‌استر)": ["ester_co", "ethyl"],
  "دو استرِ اتیلی": ["ester_co", "ethyl", "ester_co", "ethyl"],
  "استوکسی": ["acetoxy"], "استوکسی (استات)": ["acetoxy"], "استوکسی (متقارن)": ["acetoxy"],
  "استر (استوکسی)": ["acetoxy"], "استر فنولی": ["acetoxy"],
  "پروپیونیل": ["propanoyl"], "پروپیونیل ×۲ (متقارن)": ["propanoyl", "propanoyl"],
  "پروپیونیل‌اکسی": ["ester_co", "ethyl"],
  "پروپیونیل‌اکسی (متقارن)": ["ester_co", "ethyl"],
  "کربونات": ["ester_co", "ether_o"],
  "کربونیل اوره‌ای": ["amide"], "کربونیل آمیدی": ["amide"], "آمید": ["amide"],
  "استامیدو (N–COCH₃)": ["amide", "methyl"],
  "انیدرید": ["anhydride"], "اکسیژن انیدرید": ["anhydride"],
  "اسیدکلراید": ["acidchloride"], "ایزوسیانات": ["isocyanate"],

  "هیدروکسیل": ["hydroxyl"], "هیدروکسیل مجاور": ["hydroxyl"],
  "هیدروکسیل آلیلیک": ["hydroxyl"],
  "متیلن هیدروکسیل بنزیلیک": ["ch2", "hydroxyl"], "اتانول": ["ch2", "hydroxyl"],
  "متوکسی": ["methoxy"], "متوکسی (نامتقارن)": ["methoxy"],
  "دو متوکسی هم‌ارز": ["methoxy", "methoxy"], "دی‌متوکسی (استال)": ["methoxy", "methoxy"],
  "متوکسی‌متیل": ["ch2", "methoxy"],
  "اتوکسی": ["ether_o", "ethyl"], "اتوکسی (اتر)": ["ether_o", "ethyl"],
  "اتوکسی (متقارن)": ["ether_o", "ethyl"],
  "ایزوبوتوکسی": ["ether_o", "isopropyl", "ch2"],
  "اتر": ["ether_o"], "اکسیژن اتری": ["ether_o"], "اکسیژن": ["ether_o"],
  "–O–CH₂–": ["ether_o", "ch2"],
  "–OCH₂CH₂O– ×۲": ["ether_o", "ch2", "ch2", "ether_o"],
  "حلقهٔ THF": ["ether_o"],
  "حلقهٔ استالی شش‌ضلعی (دو اکسیژن ۱،۳)": ["ether_o", "ether_o"],
  "حلقهٔ شش‌ضلعی متقارن (دو اکسیژن ۱،۴)": ["ether_o", "ether_o"],

  "آمین": ["amine1"], "آمین نوع اول": ["amine1"], "آمین نوع اول انتهایی": ["amine1"],
  "آمینو (NH₂)": ["amine1"], "آمونیوم (زویتریون)": ["amine1"],
  "آمین ثانویه": ["amine2"], "دی‌متیل‌آمین": ["amine2", "methyl"],
  "دی‌متیل‌آمینو": ["amine3_dimethyl"], "N,N-دی‌متیل‌آمینو": ["amine3_dimethyl"],
  "دو گروه دی‌متیل‌آمینو": ["amine3_dimethyl", "amine3_dimethyl"],
  "آمین نوع سوم دی‌متیل": ["amine3"],    // نیتروژنِ تنها؛ متیل/اتیل‌ها جداگانه فهرست شده‌اند

  "نیتریل": ["nitrile"], "نیترو": ["nitro"], "نیترو (NO₂)": ["nitro"],
  "کلر": ["chloro"], "کلر (متقارن)": ["chloro"], "برم": ["bromo"],
  "برم (متقارن)": ["bromo"], "برم روی کربن حلقه": ["bromo"], "ید": ["iodo"],
  "متیلن کلردار": ["ch2", "chloro"], "متیلن کلردار بنزیلیک": ["ch2", "chloro"],
  "کلرومتیل (بنزیلیک)": ["ch2", "chloro"], "متیلن برم‌دار": ["ch2", "bromo"],
  "وینیل کلردار": ["vinyl", "chloro"], "تری‌فلوئورومتیل": ["cf3"],

  "وینیل": ["vinyl"], "پیوند دوگانه C=C": ["vinyl"], "آلکن (ترانس)": ["vinyl"],
  "بوتادی‌ان": ["vinyl", "vinyl"],
  "سه پیوند دوگانهٔ مزدوج": [],          // غیراشباعیتِ درونِ حلقه، نه سه گروهِ وینیل
  "دو C=C سه‌استخلافی (Z)": ["vinyl", "vinyl"],
  "دو C=C سه‌استخلافی (E)": ["vinyl", "vinyl"],
  "حلقهٔ سیکلوپنتادی‌ان": ["vinyl", "vinyl"],
  "آلکین انتهایی": ["alkyne_terminal"],
  "سه گروه اتینیل هم‌ارز": ["alkyne_terminal", "alkyne_terminal", "alkyne_terminal"],

  "حلقهٔ پنج‌ضلعی": ["ch2", "ch2", "ch2"], "حلقهٔ ۵ عضوی": ["ch2", "ch2", "ch2"],
  "حلقهٔ پنج‌ضلعی متقارن (CH₂)₅": ["ch2", "ch2", "ch2", "ch2", "ch2"],
  "حلقهٔ شش‌ضلعی": ["ch2", "ch2", "ch2", "ch2"],
  "حلقهٔ شش‌عضوی": ["ch2", "ch2", "ch2", "ch2"],
  "حلقهٔ هفت‌ضلعی": ["ch2", "ch2", "ch2", "ch2", "ch2"],
  "سیکلوبوتیل": ["ch", "ch2", "ch2", "ch2"],
  "سیکلوهگزیل": ["ch", "ch2", "ch2", "ch2", "ch2", "ch2"],
  "حلقهٔ ۱،۳،۵-تری‌استخلافی": ["phenyl"], "حلقهٔ شش‌استخلافی": ["phenyl"],
  "حلقهٔ ۱،۲،۴-تری‌استخلافی": ["phenylene_o"],
  "حلقهٔ ۱،۲،۴،۵-تتراستخلافی": ["phenylene_p"],
  "حلقهٔ ۱،۲،۳،۵-تتراستخلافی": ["phenylene_o"]
};

/* نگهبانِ زنجیره: مجموعِ اتم‌های زنجیره هرگز نباید از فرمول بیشتر شود.
   بیشتربودن یعنی یک اتم دو بار شمرده شده — مثلاً نامِ توصیفیِ «استیل»
   (که خودش کربونیل دارد) در کنارِ «انیدرید» (که هر دو کربونیل را دارد).
   زنجیرهٔ بیش‌شمار از نبودِ زنجیره بدتر است، چون رساننده ساختارِ غلط رسم
   می‌کند؛ پس در این حالت زنجیره صادر نمی‌شود و در گزارش می‌آید. */
function chainOvercounts(chain, formula, blockById) {
  if (!formula || !chain.length) return false;
  const want = parseFormula(formula);
  const sum = {};
  for (const id of chain) {
    const at = (blockById.get(id) || {}).atoms || {};
    for (const [e, n] of Object.entries(at)) sum[e] = (sum[e] || 0) + n;
  }
  return ["C", "N", "O", "S", "Cl", "Br", "I", "F"].some(e => (sum[e] || 0) > (want[e] || 0));
}

/* groupStart[i] = اندیسِ نخستین بلوکی که نامِ i-امِ blocks تولید کرده.
   لازم است چون یک نام می‌تواند به چند بلوک بسط یابد («اتوکسی‌کربونیل» =
   ester_co + ethyl)، و آن‌وقت اندیس‌های bonds که به آرایهٔ blocks اشاره
   می‌کنند با اندیس‌های chain یکی نیستند. بدونِ این نگاشت، اعلانِ اتصال
   بی‌صدا به بلوکِ اشتباه وصل می‌شد. */
function mapBlocks(names, validIds, unmapped) {
  const chain = [];
  const groupStart = [];
  (names || []).forEach(raw => {
    const key = String(raw).trim();
    const mapped = BLOCK_ALIASES[key];
    groupStart.push(chain.length);            // حتی اگر نگاشت نشود، جا نگه می‌داریم
    if (!mapped) { unmapped.set(key, (unmapped.get(key) || 0) + 1); return; }
    for (const id of mapped) {
      if (validIds.has(id)) chain.push(id);
      else unmapped.set("[بلوکِ ناموجود: " + id + "]  از  " + key, 1);
    }
  });
  return { chain, groupStart };
}

/* استنتاجِ خودکارِ توپولوژیِ «ستاره».
   وقتی زنجیره دقیقاً یک حلقه دارد و همهٔ بلوک‌های دیگرش انتهایی‌اند
   (slots=1)، تنها یک اتصالِ ممکن وجود دارد: حلقه در مرکز و هر استخلاف
   روی آن. همین حالت اکثریتِ ترکیب‌های چنداستخلافیِ بانک است، و خواندنِ
   خطی در آن‌ها استخلاف را به استخلافِ بعدی می‌چسباند — منشأِ باگِ
   «۲-متیل-۴-نیتروفنول که الکل خوانده شد».
   عمداً محافظه‌کار است: اگر بلوکِ غیرانتهایی (پل، انشعاب، حلقهٔ دوم) در
   کار باشد، توپولوژی مبهم است و چیزی حدس زده نمی‌شود. */
const RING_BLOCKS = ["phenyl", "phenylene_p", "phenylene_o", "phenylene_m", "tolyl_p",
                     "naphthyl", "quinolinyl", "pyridin_3yl", "furan_2yl", "benzyl"];
function inferStarBonds(chain, blockById) {
  if (chain.length < 4) return null;                 // خطی و سه‌تایی ابهامی ندارد
  const ringAt = [];
  chain.forEach((id, i) => { if (RING_BLOCKS.includes(id)) ringAt.push(i); });
  if (ringAt.length !== 1) return null;              // بی‌حلقه یا چندحلقه‌ای
  const hub = ringAt[0];
  const others = chain.map((id, i) => i).filter(i => i !== hub);
  const allTerminal = others.every(i => {
    const b = blockById.get(chain[i]);
    return b && b.kind === "terminal" && (b.slots === 1 || b.slots == null);
  });
  if (!allTerminal) return null;                     // پل/انشعاب هست → مبهم
  return others.map(i => [hub, i]);
}

/* اندیس‌های bonds از فضایِ blocks به فضایِ chain برده می‌شوند */
function remapBonds(bonds, groupStart, chainLen) {
  if (!Array.isArray(bonds)) return null;
  const out = [];
  bonds.forEach(pair => {
    if (!Array.isArray(pair) || pair.length < 2) return;
    const a = groupStart[pair[0]], b = groupStart[pair[1]];
    if (a == null || b == null || a === b) return;
    if (a < 0 || b < 0 || a >= chainLen || b >= chainLen) return;
    out.push([a, b]);
  });
  return out.length ? out : null;
}

/* ---------- ۶-ب) نگهبانِ فرمول ---------- */
/* تجزیهٔ متن نمی‌تواند بفهمد عددِ ۱۲۷ در «M=۱۲۸، ۱۲۷ (M−H)» یونِ ید نیست.
   نفتالین به همین دلیل تگِ ms_127 گرفت، و ۲،۶-دی‌بروموآنیلین از عبارتِ
   «اثرِ اتمِ سنگین» تگِ c_heavy_i (که مخصوصِ ید است). نگهبان، هر تگی را که
   فرمولِ مولکولی پشتیبانی نمی‌کند حذف می‌کند — همان قاعده‌ای که
   tools/validate-database.js هم با آن ممیزی می‌کند. */
function parseFormula(str) {
  const atoms = {};
  const re = /([A-Z][a-z]?)(\d*)/g;
  let m;
  while ((m = re.exec(String(str))) !== null) {
    if (!m[1]) continue;
    atoms[m[1]] = (atoms[m[1]] || 0) + (m[2] ? parseInt(m[2], 10) : 1);
  }
  return atoms;
}
const FORMULA_GUARD = [
  { tag: "ms_cl",  ok: a => a.Cl === 1 },
  { tag: "ms_br",  ok: a => a.Br === 1 },
  { tag: "ms_cl2", ok: a => a.Cl >= 2 },
  { tag: "ms_br2", ok: a => a.Br >= 2 },
  { tag: "ms_127", ok: a => !!a.I },
  { tag: "ms_204", ok: a => !!a.I },
  { tag: "c_heavy_i", ok: a => !!a.I },
  { tag: "c_cf_quartet", ok: a => !!a.F },
  { tag: "ir_cf",   ok: a => !!a.F },
  { tag: "ir_nh",   ok: a => !!a.N },
  { tag: "ir_triple_cn", ok: a => !!a.N },
  { tag: "ir_nitro", ok: a => a.N && a.O >= 2 },
  { tag: "ir_cn_ring", ok: a => !!a.N },
  { tag: "ir_isocyanate", ok: a => a.N && a.O },
  { tag: "ir_urea", ok: a => a.N && a.O },
  { tag: "ir_co_amide", ok: a => a.N && a.O },
  { tag: "ir_sh",   ok: a => !!a.S },
  { tag: "ir_so2",  ok: a => a.S && a.O >= 2 },
  { tag: "ir_so_sulfoxide", ok: a => a.S && a.O },
  { tag: "ir_co_ketone", ok: a => !!a.O },
  { tag: "ir_aldehyde",  ok: a => !!a.O },
  { tag: "ir_oh_alc",    ok: a => !!a.O },
  { tag: "ir_co_single", ok: a => a.O || a.N },
  { tag: "ir_co_ester",  ok: a => a.O >= 2 },
  { tag: "ir_oh_acid",   ok: a => a.O >= 2 },
  { tag: "ir_anhydride", ok: a => a.O >= 3 },
  { tag: "ir_acidcl",    ok: a => a.O && a.Cl },
  { tag: "c_ketone", ok: a => !!a.O },
  { tag: "c_ester",  ok: a => a.O || a.N },
  { tag: "wet_elem_n", ok: a => !!a.N },
  { tag: "wet_elem_s", ok: a => !!a.S },
  { tag: "wet_elem_cl", ok: a => !!a.Cl },
  { tag: "wet_elem_br", ok: a => !!a.Br },
  { tag: "wet_elem_i",  ok: a => !!a.I }
];
function applyFormulaGuard(sig, formula, dropped) {
  if (!formula) return sig;
  const atoms = parseFormula(formula);
  FORMULA_GUARD.forEach(g => {
    if (sig.has(g.tag) && !g.ok(atoms)) { sig.delete(g.tag); dropped.push(g.tag); }
  });
  // تگ‌های ایزوتوپیِ ناسازگار: اگر دو هالوژن قطعی است، تگِ «یک هالوژن» بی‌معناست
  if (sig.has("ms_cl2")) sig.delete("ms_cl");
  if (sig.has("ms_br2")) sig.delete("ms_br");
  return sig;
}

/* ---------- ۷) اصلاح‌های دستی (با اجرای دوباره پاک نمی‌شوند) ---------- */
const OVERRIDES = {
  // "English name": { signature: [...اضافه], drop: [...حذف], chain: [...جایگزین کامل] }

  // «فرمیل + اکسیژن استری» در بانک، کربنِ کربونیل را دو بار می‌شمارد و
  // مجموعش C4H6O3 می‌شود؛ فرمولِ ترکیب C3H6O2 است. گروهِ فرمات یک واحد است.
  "Ethyl formate": { chain: ["ethyl", "formate"] },

  /* نرول و ژرانیول: ایزومرِ E/Z با امضای یکسان. متنِ ¹³C بانک هر دو را
     یک‌شکل توصیف می‌کند، پس تگِ هندسه دستی افزوده می‌شود — همان سنجهٔ
     استاندارد: متیلِ آلیلی ~۱۶ در E و ~۲۳ در Z. */
  "Geraniol": { signature: ["c_allylic_me_e"] },
  "Nerol":    { signature: ["c_allylic_me_z"] },

  /* نامِ بلوکِ «–OCH₂CH₂O– ×۲» در بانک، زنجیره را کم‌شمار می‌کرد:
     تترااتیلن‌گلیکول هشت CH₂ و سه اکسیژنِ اتری دارد، نه دو واحد.
     C: ۷+۷ (دو توسیل) + ۸ = ۲۲ ✓  O: ۶ (دو سولفونات) + ۳ = ۹ ✓ */
  "Tetraethylene glycol ditosylate": { chain: [
    "tolyl_p", "sulfonate", "ch2", "ch2", "ether_o", "ch2", "ch2", "ether_o",
    "ch2", "ch2", "ether_o", "ch2", "ch2", "sulfonate", "tolyl_p"] },

  /* ترکیب‌های زیر در بانک با نام‌های «توصیفی و هم‌پوشان» ثبت شده‌اند — مثلاً
     «حلقهٔ شش‌عضوی» و «کتون مزدوج» و «سیستم انونی» هر سه یک مولکول را از سه
     زاویه توصیف می‌کنند، نه سه قطعهٔ جدا. جمع‌زدنشان اتم‌ها را چند بار
     می‌شمارد، پس زنجیرهٔ اتمیِ درست اینجا دستی نوشته شده و با فرمول کنترل
     می‌شود (نگهبانِ chainOvercounts همچنان همه را می‌سنجد). */
  "Acetic anhydride":     { chain: ["methyl", "anhydride", "methyl"] },
  "Propionic anhydride":  { chain: ["ethyl", "anhydride", "ethyl"] },
  "Butyric anhydride":    { chain: ["npropyl", "anhydride", "npropyl"] },
  "Diethyl carbonate":    { chain: ["ethyl", "ester_co", "ether_o", "ethyl"] },
  "4,4'-Dibromobiphenyl": { chain: ["bromo", "phenylene_p", "phenylene_p", "bromo"] },
  "Acetamide":            { chain: ["methyl", "amide"] },
  "Isobutyl acetate":     { chain: ["acetoxy", "ch2", "isopropyl"] },
  "Tetramethylurea":      { chain: ["amine3_dimethyl", "ketone", "amine3_dimethyl"] },
  "2,3-Butanedione (Diacetyl)": { chain: ["methyl", "ketone", "ketone", "methyl"] },
  "4-tert-Butylcyclohexanone":  { chain: ["tbutyl", "ch", "ch2", "ch2", "ch2", "ch2", "ketone"] },
  "Cycloheptatriene":     { chain: ["ch", "ch", "ch", "ch", "ch", "ch", "ch2"] },
  "2-Cyclohexen-1-one":   { chain: ["ketone", "ch", "ch", "ch2", "ch2", "ch2"] },
  "2-Cyclopentenone":     { chain: ["ketone", "ch", "ch", "ch2", "ch2"] },
  "3-Nitro-o-xylene":     { chain: ["methyl", "phenylene_o", "methyl", "nitro"] },
  "δ-Valerolactone":      { chain: ["ester_co", "ch2", "ch2", "ch2", "ch2"] },
  "Butyl butyrate":       { chain: ["npropyl", "ester_co", "butyl"] },
  "Butyl valerate":       { chain: ["butyl", "ester_co", "butyl"] },
  "Quinoline":            { chain: ["quinolinyl"] },
  "Triethylamine":        { chain: ["ethyl", "ethyl", "ethyl", "amine3"] },
  "Diethyleneglycol ethyl ether acetate": {
    chain: ["acetoxy", "ch2", "ch2", "ether_o", "ch2", "ch2", "ether_o", "ethyl"] }
};

/* ---------- ۸) اجرا ---------- */
function main() {
  const DB = loadDB();
  const validIds = new Set(DB.blocks.map(b => b.id));
  const unmapped = new Map();
  const guardLog = [];
  const overcount = [];
  const blockById = new Map((DB.blocks || []).map(b => [b.id, b]));
  const out = [];

  const targets = []
    .concat((DB.fieldProblems || []).map(p => ({ p, src: "fieldProblem" })))
    .concat((DB.reference || [])
      .filter(r => !(r.signature && r.signature.length) && !(r.chain && r.chain.length))
      .map(p => ({ p, src: "reference" })));

  for (const { p, src } of targets) {
    const sig = new Set();
    deriveIR(p.ir).forEach(t => sig.add(t));
    deriveMS(p.ms, DB).forEach(t => sig.add(t));
    deriveC13(p.c13).forEach(t => sig.add(t));
    deriveH1(p.h1).forEach(t => sig.add(t));
    const mapped = mapBlocks(p.blocks, validIds, unmapped);
    const chain = mapped.chain;
    let bonds = remapBonds(p.bonds, mapped.groupStart, chain.length);
    let bondsInferred = false;
    if (!bonds) {
      const star = inferStarBonds(chain, blockById);
      if (star) { bonds = star; bondsInferred = true; }
    }

    const dropped = [];
    applyFormulaGuard(sig, p.formula, dropped);
    if (dropped.length) guardLog.push("  " + (p.en || p.name) + " (" + p.formula + "): " + dropped.join("، "));

    const ov = OVERRIDES[p.en] || {};
    (ov.signature || []).forEach(t => sig.add(t));
    (ov.drop || []).forEach(t => sig.delete(t));

    let finalChain = ov.chain || chain;
    if (!ov.chain && chainOvercounts(finalChain, p.formula, blockById)) {
      overcount.push("  " + (p.en || p.name) + " (" + p.formula + "): " + finalChain.join("+"));
      finalChain = [];
    }
    out.push({ en: p.en, src, signature: [...sig].sort(), chain: finalChain,
               bonds: (ov.chain ? null : bonds), bondsInferred });
  }

  const inferredCount = out.filter(r => r.bondsInferred).length;
  const declaredCount = out.filter(r => r.bonds && !r.bondsInferred).length;
  const thin = out.filter(r => r.signature.length < 3 || !r.chain.length);
  console.log("ترکیب‌های پردازش‌شده: " + out.length);
  console.log("میانگین طول امضا: " + (out.reduce((s, r) => s + r.signature.length, 0) / out.length).toFixed(1));
  console.log("بدون زنجیره: " + out.filter(r => !r.chain.length).length);
  console.log("توپولوژی: " + declaredCount + " اعلانِ دستی، " + inferredCount + " استنتاجِ ستاره");
  console.log("امضای کم‌پوشش (<۳ تگ): " + out.filter(r => r.signature.length < 3).length);
  if (unmapped.size) {
    console.log("\n--- نام‌های بلوکِ نگاشت‌نشده (" + unmapped.size + ") ---");
    [...unmapped.entries()].sort((a, b) => b[1] - a[1])
      .forEach(([k, v]) => console.log("  " + String(v).padStart(3) + "  " + k));
  }
  if (guardLog.length) {
    console.log("\n--- تگ‌هایی که نگهبانِ فرمول حذف کرد (" + guardLog.length + " ترکیب) ---");
    guardLog.forEach(l => console.log(l));
  }
  if (overcount.length) {
    console.log("\n--- زنجیره‌های بیش‌شمار که صادر نشدند (" + overcount.length + ") ---");
    overcount.forEach(l => console.log(l));
  }
  if (thin.length) {
    console.log("\n--- کم‌پوشش‌ها (نیازمند بازبینی دستی) ---");
    thin.forEach(r => console.log("  sig=" + r.signature.length + " chain=" + r.chain.length + "  " + r.en));
  }

  if (process.argv.includes("--report-only")) return;

  const body = JSON.stringify(out.map(r => [r.en, r.signature, r.chain, r.bonds || 0]));
  const file = [
    "/* =====================================================================",
    "   database-signatures.js — تولیدی؛ دستی ویرایش نکنید",
    "   با  node tools/derive-signatures.js  ساخته می‌شود.",
    "   امضای طیفی ماشین‌خوان و زنجیرهٔ بلوک را به ورودی‌های بانک سوالات و به",
    "   مراجعی که فقط توصیف متنی داشتند می‌چسباند، تا موتور استنتاج آن‌ها را",
    "   هم ببیند (پیش‌تر فقط جست‌وجوی فرمول دقیق پیدایشان می‌کرد).",
    "   ===================================================================== */",
    "(function (root) {",
    '  "use strict";',
    "  var DB = root.DB;",
    '  if (!DB) { if (typeof console !== "undefined") console.warn("database-signatures: DB یافت نشد"); return; }',
    "  var DERIVED = " + body + ";",
    "  // یک ترکیب می‌تواند هم در DB.reference و هم در DB.fieldProblems باشد.",
    "  // امضا باید به *هر دو* بچسبد: استخرِ جست‌وجو در inference.js بر پایهٔ نام",
    "  // دِدآپ می‌کند و اول reference را می‌بیند، پس اگر فقط نسخهٔ بانکِ سوال",
    "  // امضا می‌گرفت، نسخهٔ بی‌امضای reference جلویش را می‌گرفت و ترکیب",
    "  // عملاً از دیدِ موتور پنهان می‌ماند.",
    "  var byEn = {};",
    "  var index = function (rec) {",
    "    if (!rec.en) return;",
    "    (byEn[rec.en] = byEn[rec.en] || []).push(rec);",
    "  };",
    "  (DB.fieldProblems || []).forEach(index);",
    "  (DB.reference || []).forEach(index);",
    "  var applied = 0;",
    "  DERIVED.forEach(function (row) {",
    "    var targets = byEn[row[0]];",
    "    if (!targets) return;",
    "    targets.forEach(function (t) {",
    "      // قاعدهٔ عدم‌تخریب: امضای دست‌نویس هرگز بازنویسی نمی‌شود",
    "      if (!t.signature || !t.signature.length) { t.signature = row[1]; t.derivedSignature = true; }",
    "      if (!t.chain || !t.chain.length) {",
    "        t.chain = row[2]; t.derivedChain = true;",
    "        // اتصال‌ها در همان فضایِ chain بازنویسی شده‌اند؛ اندیس‌های خامِ",
    "        // روی blocks اگر نامی به چند بلوک بسط یافته باشد غلط‌اند.",
    "        if (row[3]) t.bonds = row[3]; else if (t.bonds) delete t.bonds;",
    "      }",
    "      applied++;",
    "    });",
    "  });",
    '  if (typeof console !== "undefined") {',
    '    console.info("database-signatures: امضا/زنجیره برای " + applied + " ترکیب اعمال شد.");',
    "  }",
    '})(typeof window !== "undefined" ? window : globalThis);',
    ""
  ].join("\n");
  fs.writeFileSync(path.join(ROOT, "data/database-signatures.js"), file, "utf8");
  console.log("\nنوشته شد: data/database-signatures.js  (" + file.length + " بایت)");
}
main();
