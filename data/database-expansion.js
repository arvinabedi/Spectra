/* =====================================================================
   database-expansion.js — تکمیل پوششِ شیمیاییِ پایگاه (فاز ۴)
   ---------------------------------------------------------------------
   چرا این فایل لازم شد — نتیجهٔ ممیزیِ پوشش:
     در ۲۶۲ ترکیبِ پیشین، شمارشِ عنصرها این بود: S=۱، F=۲، I=۳. یعنی
     گوگرد و ید عملاً وجود نداشتند، در حالی که هم در atomicMass بودند،
     هم تستِ لاسِنِ گوگرد/ید و چک‌باکسِ ms_127 در UI فعال بود.
     همچنین این گروه‌های عاملی هیچ ترکیبی در بانک نداشتند:
       • آمید (بلوکش وجود داشت و در هیچ زنجیره‌ای استفاده نشده بود)
       • آمین نوع دوم و سوم (با آنکه تستِ هینزبرگ ۲°/۳° در پایگاه بود)
       • انیدرید و کلریدِ اسید (با آنکه چک‌باکسِ IRشان وجود داشت)
       • تیول، تیواتر، سولفوکسید، سولفونامید، تسیلات
       • اپوکسید، استالِ حلقوی، آلکینِ درونی، حلقهٔ جوش‌خورده
       • بنزنِ اورتو/متا-دواستخلافی (فقط مونو و پارا پوشش داشت)

   قاعدهٔ عدم‌تخریب: هیچ دادهٔ موجودی بازنویسی نمی‌شود؛ همهٔ افزوده‌ها با
   گاردِ دِدآپ (بر پایهٔ id یا نام انگلیسی) وارد می‌شوند.

   دربارهٔ اعداد: داده‌های طیفی این فایل مقادیرِ مرجعِ استانداردِ کتاب‌های
   طیف‌سنجی آلی‌اند (Pretsch/Silverstein/Field). ارقام در منبع لاتین نوشته
   شده‌اند و هنگام بارگذاری با faNum() به رقم فارسی تبدیل می‌شوند تا با
   بقیهٔ رابط هم‌شکل باشند — دستی تایپ‌کردنِ رقم فارسی خطاخیز بود.
   ===================================================================== */
(function (root) {
  "use strict";
  var DB = root.DB;
  if (!DB) {
    if (typeof console !== "undefined") console.warn("database-expansion.js: window.DB بارگذاری نشده — ترتیب <script> را بررسی کنید.");
    return;
  }

  /* تبدیل رقم لاتین به فارسی، فقط برای نمایش */
  var FA = "۰۱۲۳۴۵۶۷۸۹";
  function faNum(s) {
    return String(s).replace(/[0-9]/g, function (d) { return FA[+d]; });
  }

  /* ==================================================================
     ۱) بلوک‌های سازندهٔ جدید
     ================================================================== */
  var NEW_BLOCKS = [
    // --- بنزنِ متا-دواستخلافی: تنها الگوی استخلافی که بلوک نداشت ---
    { id: "phenylene_m", fa: "متا-فنیلن", en: "-C₆H₄- (meta)", atoms: { C: 6, H: 4 },
      slots: 2, ihd: 4, kind: "linker", display: "mC₆H₄", evidence: ["ir_aromatic", "h_ar_meta", "h_ar"] },

    // --- آمین نوع سوم: تستِ هینزبرگ ۳° در پایگاه بود ولی بلوکی نداشت ---
    { id: "amine3_dimethyl", fa: "دی‌متیل‌آمینو (آمین ۳°)", en: "-N(CH₃)₂", atoms: { C: 2, H: 6, N: 1 },
      slots: 1, ihd: 0, kind: "terminal", display: "NMe₂", evidence: ["wet_hinsberg_3", "h_hetero"] },

    // --- گوگرد: هیچ بلوکی نداشت ---
    { id: "thiol", fa: "تیول", en: "-SH", atoms: { S: 1, H: 1 },
      slots: 1, ihd: 0, kind: "terminal", display: "SH", evidence: ["ir_sh", "wet_elem_s", "wet_nitroprusside_pos"] },
    { id: "thioether", fa: "تیواتر (پل سولفیدی)", en: "-S-", atoms: { S: 1 },
      slots: 2, ihd: 0, kind: "linker", display: "S", evidence: ["wet_elem_s"] },
    { id: "sulfoxide", fa: "سولفوکسید", en: "-S(=O)-", atoms: { S: 1, O: 1 },
      slots: 2, ihd: 0, kind: "linker", display: "S=O", evidence: ["ir_so_sulfoxide", "wet_elem_s"] },
    { id: "sulfonamide", fa: "سولفونامید", en: "-SO₂NH₂", atoms: { S: 1, O: 2, N: 1, H: 2 },
      slots: 1, ihd: 0, kind: "terminal", display: "SO₂NH₂", evidence: ["ir_so2", "ir_nh", "wet_elem_s", "wet_elem_n"] },
    { id: "sulfonate", fa: "سولفونات (تسیلات)", en: "-SO₂O-", atoms: { S: 1, O: 3 },
      slots: 2, ihd: 0, kind: "linker", display: "SO₂O", evidence: ["ir_so2", "wet_elem_s"] },

    // --- غیراشباع و حلقوی ---
    { id: "alkyne_internal", fa: "آلکین درونی", en: "-C≡C-", atoms: { C: 2 },
      slots: 2, ihd: 2, kind: "linker", display: "C≡C", evidence: ["c_alkyne"] },
    { id: "epoxide", fa: "اپوکسید", en: "-CH(O)CH₂ (حلقهٔ سه‌عضوی)", atoms: { C: 2, H: 3, O: 1 },
      slots: 1, ihd: 1, kind: "terminal", display: "epox", evidence: ["ir_co_single", "h_hetero"] },
    { id: "methylenedioxy", fa: "متیلن‌دی‌اکسی", en: "-OCH₂O-", atoms: { C: 1, H: 2, O: 2 },
      slots: 2, ihd: 0, kind: "linker", display: "OCH₂O", evidence: ["ir_co_single", "h_hetero", "h_acetal"] },
    { id: "naphthyl", fa: "نفتیل", en: "-C₁₀H₇", atoms: { C: 10, H: 7 },
      slots: 1, ihd: 7, kind: "terminal", display: "Np", evidence: ["ir_aromatic", "h_ar", "c_sp2"] },
    // --- فرمات: اتیل‌فرمات با زنجیرهٔ ["aldehyde","ester_co","ethyl"] ثبت شده
    // بود که کربنِ کربونیل را دو بار می‌شمرد و مجموعِ C4H6O3 می‌داد، در حالی
    // که فرمولِ ترکیب C3H6O2 است. گروهِ فرمات یک واحد است: H-C(=O)-O- ---
    // --- نیتروژنِ آمینِ نوع سوم، بدونِ هیچ کربن. بلوکِ amine3_dimethyl دو
    // کربنِ خودش را می‌آورد، پس برای تری‌اتیل‌آمین (که سه اتیلِ جدا دارد)
    // زنجیره را دو کربن بیش‌شمار می‌کرد ---
    /* --- حلقه‌های بنزنِ چنداستخلافی. واژگانِ بلوک تا اینجا فقط تک‌استخلافی
       (phenyl، C₆H₅) و دواستخلافی (phenylene_*، C₆H₄) داشت، پس مزیتیلن و
       تری/تتراـمتیل‌بنزن‌ها ناچار با phenyl نوشته می‌شدند و هیدروژنِ حلقه
       یکی‌دو واحد بیشتر از فرمول می‌شد. هر استخلافِ اضافه یک H کم می‌کند. --- */
    /* الگویِ استخلاف اطلاعاتِ تشخیصیِ واقعی است — همان چیزی که دانشجو از
       الگویِ پروتونِ آروماتیک تعیین می‌کند — پس گونهٔ بی‌الگو تنها زمانی
       به‌کار می‌رود که نامِ ترکیب الگو را نگوید. با گونهٔ عمومیِ تنها،
       ۱،۲،۳- و ۱،۲،۴-تری‌متیل‌بنزن یکسان می‌شدند و موتور از تفکیکشان
       ناتوان می‌ماند. شمارِ محیطِ کربنی هر الگو هم متفاوت است. */
    { id: "benzene_tri", fa: "بنزنِ سه‌استخلافی (الگو نامعلوم)", en: "-C₆H₃<", atoms: { C: 6, H: 3 },
      slots: 3, ihd: 4, kind: "branch", display: "C₆H₃", evidence: ["ir_aromatic", "h_ar", "c_sp2"] },
    { id: "benzene_123", fa: "بنزنِ ۱،۲،۳-سه‌استخلافی (وی‌سینال)", en: "-C₆H₃< (1,2,3)", atoms: { C: 6, H: 3 },
      slots: 3, ihd: 4, kind: "branch", display: "1,2,3", evidence: ["ir_aromatic", "h_ar", "c_sp2", "ir_ortho"] },
    { id: "benzene_124", fa: "بنزنِ ۱،۲،۴-سه‌استخلافی (نامتقارن)", en: "-C₆H₃< (1,2,4)", atoms: { C: 6, H: 3 },
      slots: 3, ihd: 4, kind: "branch", display: "1,2,4", evidence: ["ir_aromatic", "h_ar", "c_sp2", "h_ar_meta"] },
    { id: "benzene_135", fa: "بنزنِ ۱،۳،۵-سه‌استخلافی (متقارن)", en: "-C₆H₃< (1,3,5)", atoms: { C: 6, H: 3 },
      slots: 3, ihd: 4, kind: "branch", display: "1,3,5", evidence: ["ir_aromatic", "h_ar", "c_sp2", "h_ar_meta"] },
    { id: "benzene_tetra", fa: "بنزنِ چهاراستخلافی (الگو نامعلوم)", en: "-C₆H₂<", atoms: { C: 6, H: 2 },
      slots: 4, ihd: 4, kind: "branch", display: "C₆H₂", evidence: ["ir_aromatic", "h_ar", "c_sp2"] },
    { id: "benzene_1234", fa: "بنزنِ ۱،۲،۳،۴-چهاراستخلافی", en: "-C₆H₂< (1,2,3,4)", atoms: { C: 6, H: 2 },
      slots: 4, ihd: 4, kind: "branch", display: "1,2,3,4", evidence: ["ir_aromatic", "h_ar", "c_sp2", "ir_ortho"] },
    { id: "benzene_1235", fa: "بنزنِ ۱،۲،۳،۵-چهاراستخلافی", en: "-C₆H₂< (1,2,3,5)", atoms: { C: 6, H: 2 },
      slots: 4, ihd: 4, kind: "branch", display: "1,2,3,5", evidence: ["ir_aromatic", "h_ar", "c_sp2"] },
    { id: "benzene_1245", fa: "بنزنِ ۱،۲،۴،۵-چهاراستخلافی (پارا-دوگانه)", en: "-C₆H₂< (1,2,4,5)", atoms: { C: 6, H: 2 },
      slots: 4, ihd: 4, kind: "branch", display: "1,2,4,5", evidence: ["ir_aromatic", "h_ar", "c_sp2"] },
    { id: "benzene_penta", fa: "بنزنِ پنج‌استخلافی", en: "-C₆H<", atoms: { C: 6, H: 1 },
      slots: 5, ihd: 4, kind: "branch", display: "C₆H", evidence: ["ir_aromatic", "h_ar", "c_sp2"] },
    { id: "benzene_hexa", fa: "بنزنِ شش‌استخلافی", en: "-C₆<", atoms: { C: 6 },
      slots: 6, ihd: 4, kind: "branch", display: "C₆", evidence: ["ir_aromatic", "c_sp2"] },
    // --- کربنِ چهاراتصالی. بلوکِ ch سه ظرفیت دارد و برای مرکزهایی مثل
    // بنزیلیک اسید (دو فنیل + OH + COOH روی یک کربن) کافی نبود؛ آن ساختار
    // تا کنون قابلِ بیان نبود و زنجیره‌اش ناچار تقریبی می‌ماند. ---
    { id: "cq", fa: "کربن چهاراتصالی (کواترنر)", en: ">C<", atoms: { C: 1 },
      slots: 4, ihd: 0, kind: "branch", display: "C", evidence: [] },
    { id: "amine3", fa: "آمین نوع سوم (نیتروژنِ سه‌شاخه)", en: "-N<", atoms: { N: 1 },
      slots: 3, ihd: 0, kind: "branch", display: "N", evidence: ["wet_hinsberg_3"] },
    // --- کینولین: حلقهٔ جوش‌خوردهٔ بنزن+پیریدین. با ترکیبِ دو بلوکِ جدا
    // یازده کربن می‌شد در حالی که کینولین نُه کربن دارد ---
    { id: "quinolinyl", fa: "کینولینیل", en: "-C₉H₆N", atoms: { C: 9, H: 6, N: 1 },
      slots: 1, ihd: 7, kind: "terminal", display: "Quin", evidence: ["ir_aromatic", "h_ar", "c_sp2", "ir_cn_ring"] },
    { id: "formate", fa: "فرمات (استرِ فرمیک)", en: "-OC(=O)H", atoms: { C: 1, H: 1, O: 2 },
      slots: 1, ihd: 1, kind: "terminal", display: "OCHO", evidence: ["ir_co_ester", "c_ester", "h_ald"] },
    { id: "fluorenyl_co", fa: "کربونیل فلوئورنونی", en: "فلوئورن-۹-اون", atoms: { C: 1, O: 1 },
      slots: 2, ihd: 1, kind: "linker", display: "C=O", evidence: ["ir_co_conj", "c_ketone"] }
  ];
  NEW_BLOCKS.forEach(function (b) { if (!DB.blocks.some(function (x) { return x.id === b.id; })) DB.blocks.push(b); });

  /* شمارش محیط‌های NMR برای بلوک‌های تازه (ماژول تقارن به آن نیاز دارد) */
  var ENV_C = {
    phenylene_m: 4, amine3_dimethyl: 1, thiol: 0, thioether: 0, sulfoxide: 0,
    sulfonamide: 0, sulfonate: 0, alkyne_internal: 2, epoxide: 2,
    methylenedioxy: 1, naphthyl: 7, fluorenyl_co: 1
  };
  var ENV_H = {
    phenylene_m: 3, amine3_dimethyl: 1, thiol: 1, thioether: 0, sulfoxide: 0,
    sulfonamide: 1, sulfonate: 0, alkyne_internal: 0, epoxide: 3,
    methylenedioxy: 1, naphthyl: 4, fluorenyl_co: 0
  };
  Object.keys(ENV_C).forEach(function (k) {
    if (DB.blockCarbonEnvCount && DB.blockCarbonEnvCount[k] === undefined) DB.blockCarbonEnvCount[k] = ENV_C[k];
    if (DB.blockProtonEnvCount && DB.blockProtonEnvCount[k] === undefined) DB.blockProtonEnvCount[k] = ENV_H[k];
  });

  /* شواهد ضمنی بلوک‌های تازه (فاز ۲ پایگاه) */
  var IMPLIED = {
    phenylene_m:     ["h_ar", "c_sp2", "ir_aromatic"],
    amine3_dimethyl: ["h_hetero", "c_hetero"],
    thiol:           ["wet_elem_s"],
    thioether:       ["wet_elem_s", "c_alkyl"],
    sulfoxide:       ["wet_elem_s", "ir_so_sulfoxide"],
    sulfonamide:     ["wet_elem_s", "wet_elem_n", "ir_so2", "ir_nh"],
    sulfonate:       ["wet_elem_s", "ir_so2"],
    alkyne_internal: ["c_alkyne"],
    epoxide:         ["c_hetero", "h_hetero", "ir_co_single"],
    methylenedioxy:  ["c_hetero", "h_hetero", "ir_co_single"],
    naphthyl:        ["h_ar", "c_sp2", "ir_aromatic"],
    fluorenyl_co:    ["c_ketone"],
    formate:         ["c_ester", "ir_co_ester", "ir_co_single", "h_ald"],
    amine3:          ["wet_hinsberg_3", "wet_sol_b"],
    cq:              ["c_alkyl"],
    benzene_tri:     ["h_ar", "c_sp2", "ir_aromatic"],
    benzene_123:     ["h_ar", "c_sp2", "ir_aromatic", "ir_ortho"],
    benzene_124:     ["h_ar", "c_sp2", "ir_aromatic", "h_ar_meta"],
    benzene_135:     ["h_ar", "c_sp2", "ir_aromatic", "h_ar_meta"],
    benzene_tetra:   ["h_ar", "c_sp2", "ir_aromatic"],
    benzene_1234:    ["h_ar", "c_sp2", "ir_aromatic", "ir_ortho"],
    benzene_1235:    ["h_ar", "c_sp2", "ir_aromatic"],
    benzene_1245:    ["h_ar", "c_sp2", "ir_aromatic"],
    benzene_penta:   ["h_ar", "c_sp2", "ir_aromatic", "wet_lerosen_pos"],
    benzene_hexa:    ["c_sp2", "ir_aromatic", "wet_lerosen_pos"],
    quinolinyl:      ["h_ar", "c_sp2", "ir_aromatic", "ir_cn_ring", "wet_elem_n"],
    // بلوک‌هایی که در فایل‌های قبلی اضافه شده بودند و جدولِ شواهد ضمنی نداشتند
    anhydride:       ["c_ester", "ir_anhydride"],
    acidchloride:    ["c_ester", "ir_acidcl"],
    isocyanate:      ["ir_isocyanate"],
    amine2:          ["ir_nh"],
    alkyne_terminal: ["c_alkyne", "ir_alkyne_h", "ir_triple_cc"],
    iodo:            ["c_heavy_i", "wet_elem_i"],
    butyl:           ["c_alkyl", "h_alkyl"],
    propanoyl:       ["c_ketone", "c_alkyl", "h_alkyl"],
    pyridyl:         ["h_ar", "c_sp2", "ir_aromatic"]
  };
  if (DB.blockImpliedEvidence) {
    Object.keys(IMPLIED).forEach(function (k) {
      if (DB.blockImpliedEvidence[k] === undefined) DB.blockImpliedEvidence[k] = IMPLIED[k];
    });
  }
  // گوگرد به فهرست شواهدِ برخاسته از فرمول اضافه شد (تستِ لاسِن)
  if (DB.formulaImpliedEvidence && !DB.formulaImpliedEvidence.S) {
    DB.formulaImpliedEvidence.S = ["wet_elem_s", "wet_elem_s2"];
  }
  // بلوک‌های تازه‌ای که «آلفای کربونیل» می‌سازند
  if (DB.alphaCapableBlocks && DB.alphaCapableBlocks.indexOf("butyl") < 0) DB.alphaCapableBlocks.push("butyl");
  if (DB.carbonylBlocks) {
    ["anhydride", "acidchloride", "propanoyl", "fluorenyl_co"].forEach(function (b) {
      if (DB.carbonylBlocks.indexOf(b) < 0) DB.carbonylBlocks.push(b);
    });
  }

  /* ==================================================================
     ۱-ب) شواهدِ ضمنیِ تست‌های کلاسیک
     مشکلی که این جدول حل می‌کند: امضای ترکیب‌ها از متنِ طیف استخراج شده و
     متنِ طیف هیچ‌وقت از تستِ شیمیِ تر حرفی نمی‌زند. نتیجه این بود که فازِ
     «آنالیز کلاسیک» با ده‌ها چک‌باکس، تنها روی حدود بیست ترکیبی امتیاز
     می‌داد که دست‌نویس تستشان را ذکر کرده بودند.
     اینجا از خودِ ساختار نتیجه گرفته می‌شود: هر گروهِ عاملی، نتیجهٔ
     تست‌های کلاسیکِ خودش را قطعی می‌کند.
     ================================================================== */
  /* فهرستِ یگانهٔ بلوک‌های حلقهٔ آروماتیک.
     پیش‌تر این فهرست در پنج‌شش جا تکرار شده بود و افزودنِ حلقهٔ تازه یعنی
     یادآوردنِ همهٔ آن‌ها. یک‌بار که یادم رفت، تیمول (فنول) با حلقهٔ تازهٔ
     benzene_tri دیگر «فنول» شناخته نشد و لوکاسِ نادرست گرفت. حالا همهٔ
     قواعد و موتور و ابزارِ ممیزی از همین یک فهرست می‌خوانند. */
  DB.aromaticRingBlocks = [
    "phenyl", "phenylene_p", "phenylene_o", "phenylene_m", "tolyl_p",
    "benzene_tri", "benzene_123", "benzene_124", "benzene_135",
    "benzene_tetra", "benzene_1234", "benzene_1235", "benzene_1245",
    "benzene_penta", "benzene_hexa",
    "naphthyl", "quinolinyl", "pyridin_3yl", "furan_2yl"
  ];
  var AROM = DB.aromaticRingBlocks;
  // زیرمجموعهٔ «حلقهٔ هیدروکربنی» برای تست‌هایی که به هترو-حلقه تعمیم ندارند
  var AROM_CX = AROM.filter(function (x) { return x !== "pyridin_3yl" && x !== "furan_2yl" && x !== "quinolinyl"; });

  var TEST_IMPLIED = {
    cooh:            ["wet_bicarb_pos", "wet_sol_a1"],
    // تست‌های کربونیلِ aldehyde/ketone/acyl/propanoyl این‌جا نیستند:
    // به همسایه بستگی دارند (پایین، contextualEvidenceRules).
    ester_co:        ["wet_hydroxamic_pos"],
    acetoxy:         ["wet_hydroxamic_pos"],
    amide:           ["wet_amide_hydrolysis_pos", "ir_amide_ii"],
    amine1:          ["wet_hinsberg_1", "wet_sol_b", "wet_hno2_1"],
    amine2:          ["wet_hinsberg_2", "wet_sol_b"],
    amine3_dimethyl: ["wet_hinsberg_3", "wet_sol_b"],
    methoxy:         ["wet_zeisel_pos"],
    ether_o:         ["wet_zeisel_pos"],
    methylenedioxy:  ["wet_zeisel_pos"],
    chloro:          ["wet_beilstein_pos"],
    bromo:           ["wet_beilstein_pos"],
    iodo:            ["wet_beilstein_pos", "ir_ci"],
    vinyl:           ["wet_baeyer_pos", "wet_br2_pos"],
    alkyne_terminal: ["wet_baeyer_pos", "wet_br2_pos"],
    alkyne_internal: ["wet_baeyer_pos", "wet_br2_pos"],
    thiol:           ["wet_nitroprusside_pos"],
    anhydride:       ["wet_hydroxamic_pos"],
    acidchloride:    ["wet_beilstein_pos"]
  };
  // تستِ لِروزِن (فرمالدهید/H₂SO₄) رنگِ هر حلقهٔ آروماتیک را می‌دهد —
  // از فهرستِ یگانه، تا حلقهٔ تازه‌ای جا نیفتد
  AROM.concat(["benzyl"]).forEach(function (id) {
    TEST_IMPLIED[id] = (TEST_IMPLIED[id] || []).concat(["wet_lerosen_pos"]);
  });
  if (DB.blockImpliedEvidence) {
    Object.keys(TEST_IMPLIED).forEach(function (k) {
      var cur = DB.blockImpliedEvidence[k] || [];
      TEST_IMPLIED[k].forEach(function (t) { if (cur.indexOf(t) < 0) cur.push(t); });
      DB.blockImpliedEvidence[k] = cur;
    });
  }

  /* شواهدی که به «همسایه در زنجیره» بستگی دارند و از بلوکِ تنها درنمی‌آیند.
     نمونهٔ کلاسیک: هیدروکسیل. اگر روی حلقهٔ آروماتیک باشد فنول است (FeCl₃
     بنفش، محلول در NaOH نه NaHCO₃)، و اگر روی زنجیرهٔ آلیفاتیک باشد الکل
     است (تستِ لوکاس، سِریک آمونیوم نیترات). یک بلوکِ hydroxyl نمی‌تواند
     هر دو را بگوید، پس قاعده روی مجاورت نوشته می‌شود.
     moved: بلوکی که باید حاضر باشد | near: مجموعهٔ همسایه‌های مجاز
     نتیجه: اگر مجاور بود tags، وگرنه elseTags. */
  DB.contextualEvidenceRules = (DB.contextualEvidenceRules || []).concat([
    /* هیدروکسیل سه سرنوشتِ شیمیاییِ متفاوت دارد و بلوکِ تنها نمی‌تواند
       تفکیکشان کند؛ همسایه در زنجیره تعیین‌کننده است. ترتیبِ بررسی مهم است:
         ۱) روی حلقهٔ آروماتیک  → فنول: FeCl₃ بنفش، محلول در NaOH (کلاس A2)
         ۲) مجاورِ کربونیل      → انول: FeCl₃ مثبت می‌دهد ولی لوکاس بی‌معناست
         ۳) روی زنجیرهٔ sp³      → الکل: لوکاس و سِریک آمونیوم نیترات
       اگر هیچ‌کدام، چیزی ادعا نمی‌شود. (پیش‌تر این قاعده دوحالته بود و
       ۲-هیدروکسی‌سیکلوهگزن-۱-اونِ انولی «لوکاس» می‌گرفت که غلط است.) */
    { block: "hydroxyl",
      cases: [
        { near: AROM, tags: ["wet_fecl3_pos", "wet_sol_a2"] },
        { near: ["ketone", "aldehyde", "acyl", "propanoyl"],
          tags: ["wet_fecl3_pos"] },
        // benzyl (–CH₂C₆H₅) هم کربنِ sp³ است: الکلِ بنزیلی، نه فنول.
        // جاافتادنش باعث می‌شد الکلِ بنزیلی هیچ تستی نگیرد.
        { near: ["methyl", "ethyl", "npropyl", "butyl", "isopropyl", "tbutyl",
                 "ch2", "ch", "cq", "hydroxyl", "ether_o", "vinyl", "benzyl"],
          tags: ["wet_lucas_any", "wet_can_pos"] }
      ],
      fa: "فنول (روی حلقه) / انول (مجاور کربونیل) / الکل (روی زنجیره) — سه نتیجهٔ تستِ متفاوت از یک بلوک" },

    /* کربونیلی که به نیتروژن یا اکسیژنِ اتری چسبیده، آمید یا استر است، نه
       کتون/آلدهید — و هیچ‌کدام از تست‌های کربونیل رویش مثبت نمی‌شود
       (رزونانسِ هترواتم کربونیل را غیرفعال می‌کند). پایگاه آمید و استر را
       با همین مجاورت رمزگذاری می‌کند: استانیلید = phenyl+amine2+acyl و
       اگزالاتِ دی‌اتیل = ...+ketone+ether_o.
       دقت: مجاورتِ hydroxyl این معنا را ندارد — در سالیسیل‌آلدهید و
       ۴′-هیدروکسی‌والروفنون، OH یک استخلافِ جداست و کربونیل واقعاً
       آلدهید/کتون است، پس تست‌ها باید مثبت بمانند. */
    { block: "aldehyde",
      cases: [{ near: ["amine1", "amine2", "amine3", "amine3_dimethyl", "ether_o"], tags: [] }],
      elseTags: ["wet_dnp_pos", "wet_tollens_pos", "wet_schiff_pos", "wet_semicarb_pos"],
      fa: "آلدهیدِ آزاد تست‌های کربونیل را مثبت می‌کند؛ چسبیده به N/O دیگر آلدهید نیست" },
    { block: "ketone",
      cases: [{ near: ["amine1", "amine2", "amine3", "amine3_dimethyl", "ether_o"], tags: [] }],
      elseTags: ["wet_dnp_pos", "wet_semicarb_pos"],
      fa: "کتونِ آزاد در برابر آمید/اورهٔ هم‌شکل" },
    { block: "acyl",
      cases: [{ near: ["amine1", "amine2", "amine3", "amine3_dimethyl", "ether_o"], tags: [] }],
      elseTags: ["wet_dnp_pos", "wet_semicarb_pos", "wet_iodoform_pos"],
      fa: "استیلِ کتونی در برابر N-استیل (آمید) — یدوفرم فقط برای متیل‌کتون" },
    { block: "propanoyl",
      cases: [{ near: ["amine1", "amine2", "amine3", "amine3_dimethyl", "ether_o"], tags: [] }],
      elseTags: ["wet_dnp_pos", "wet_semicarb_pos"],
      fa: "پروپیونیلِ کتونی در برابر پروپیونات (استر)" },

    { block: "ketone", near: ["methyl", "acyl"],
      tags: ["wet_iodoform_pos"], elseTags: [],
      fa: "کتونی که یک سرش متیل است، متیل‌کتون است و تستِ یدوفرم مثبت می‌دهد" },
    /* نیتراتِ نقرهٔ الکلی، فعالیتِ هالید را می‌سنجد نه فقط حضورش:
       هالیدِ روی حلقهٔ آروماتیک حتی با گرم‌کردن رسوب نمی‌دهد (پیوندِ C–X با
       خصلتِ دوگانه)، در حالی که هالیدِ بنزیلی/آلیلی/۳° فوری رسوب می‌دهد. */
    { block: "bromo", near: AROM_CX,
      tags: ["wet_agno3_1"], elseTags: ["wet_agno3_3"],
      fa: "برمِ روی حلقه = هالیدِ آریلی (بدونِ رسوب)؛ برمِ روی زنجیره = هالیدِ فعال (رسوبِ سریع)" },
    { block: "chloro", near: AROM_CX,
      tags: ["wet_agno3_1"], elseTags: ["wet_agno3_3"],
      fa: "همان قاعده برای کلر" },
    { block: "iodo", near: AROM_CX,
      tags: ["wet_agno3_1"], elseTags: ["wet_agno3_3"],
      fa: "همان قاعده برای ید" },

    /* بیوره پیوندِ پپتیدی را می‌سنجد: کربونیلِ آمیدی که در یک سرش نیتروژن
       و در زنجیره یک گروهِ کربوکسیل/آمینِ دیگر هم باشد (یعنی دی‌پپتید یا
       بالاتر). برای آمیدِ تنها منفی است. */
    { block: "amide", near: ["ch2", "ch"],
      tags: ["wet_biuret_pos"], elseTags: [],
      fa: "کربونیلِ آمیدی درونِ زنجیرهٔ اسید آمینه = پیوندِ پپتیدی؛ بیوره مثبت" },

    { block: "amine1",
      near: AROM_CX,
      tags: ["wet_hno2_1ar"], elseTags: ["wet_hno2_1al"],
      fa: "آمینِ نوع اولِ آروماتیک با HNO₂ نمکِ دیازونیومِ پایدار می‌دهد؛ آلیفاتیک حبابِ N₂ آزاد می‌کند" }
  ]);

  /* ==================================================================
     ۲) نواحی IR تازه — گوگرد، ید، آمید II، الگوی اورتو/متا
     این‌ها به DB.ir.regions می‌روند، چون UI چک‌باکس‌های فاز IR را از همین
     آرایه می‌سازد؛ نبودشان یعنی کاربر نمی‌توانست نوار S=O یا S–H را ثبت کند.
     ================================================================== */
  var NEW_IR_REGIONS = [
    { id: "ir_sh",           range: "2550–2600", fa: "S–H کششی (ضعیف — برخلاف O–H باریک و کم‌شدت)", implies: "تیول (مرکاپتان)" },
    { id: "ir_so2",          range: "1150,1350", fa: "دو نوار قویِ SO₂ (نامتقارن ~۱۳۵۰ و متقارن ~۱۱۶۰)", implies: "سولفونامید، سولفونات (تسیلات)، سولفون" },
    { id: "ir_so_sulfoxide", range: "1030–1070", fa: "S=O سولفوکسید (یک نوار قوی، پایین‌تر از SO₂)", implies: "سولفوکسید (مثل DMSO)" },
    { id: "ir_amide_ii",     range: "1510–1570", fa: "خمشِ N–H آمید (نوار آمید II — فقط در آمید ۱° و ۲°)", implies: "آمید نوع اول یا دوم (در آمید ۳° غایب است)" },
    { id: "ir_meta",         range: "690,780",   fa: "دو نوار خمش OOP (یکی ~۶۹۰ و یکی ~۷۸۰)", implies: "بنزن متا-دواستخلافی" },
    { id: "ir_ci",           range: "500–600",   fa: "C–I کششی (پایین‌ترین هالوژن — اغلب لبهٔ طیف)", implies: "یدید آلکیل یا آریل" }
  ];
  if (DB.ir && DB.ir.regions) {
    NEW_IR_REGIONS.forEach(function (r) {
      if (!DB.ir.regions.some(function (x) { return x.id === r.id; })) DB.ir.regions.push(r);
    });
  }

  /* مهم: چک‌باکس‌های «یابندهٔ IR» از DB.irSmartZones ساخته می‌شوند، نه از
     DB.ir.regions (که هیچ مصرف‌کنندهٔ UI ندارد). پس نوارهای تازه باید در
     همان جدول هم ثبت شوند، وگرنه دادهٔ IR وارد می‌شود ولی کاربر هیچ راهی
     برای تیک‌زدنش ندارد و امضاهای وابسته هرگز کامل نمی‌شوند. */
  var NEW_IR_ZONES = [
    { min: 2550, max: 2600, tag: "ir_sh", fa: "S–H تیول",
      logic: "برخلاف O–H، گوگرد پیوندِ هیدروژنیِ قوی نمی‌سازد؛ پس نوار باریک و ضعیف است و به‌راحتی نادیده می‌ماند. جفت‌کردنش با M+2 چهاردرصدی، گوگرد را قطعی می‌کند." },
    { min: 1330, max: 1370, tag: "ir_so2", fa: "SO₂ نامتقارن (سولفونامید/تسیلات)",
      logic: "همیشه با جفتِ متقارنِ ~۱۱۶۰ می‌آید. با دو نوارِ نیترو (۱۳۵۰/۱۵۲۰) اشتباه نشود: نیترو نوارِ بالاییِ ۱۵۲۰ دارد، سولفونیل نوارِ پایینیِ ۱۱۶۰." },
    { min: 1140, max: 1180, tag: "ir_so2", fa: "SO₂ متقارن (سولفونامید/تسیلات)",
      logic: "مکملِ نوارِ ۱۳۵۰؛ دیدنِ هر دو با هم، گروهِ سولفونیل را اثبات می‌کند." },
    { min: 1030, max: 1070, tag: "ir_so_sulfoxide", fa: "S=O سولفوکسید",
      logic: "یک نوارِ قوی، پایین‌تر از SO₂ چون فقط یک اکسیژن روی گوگرد است. در همان محدودهٔ کششِ C–O می‌افتد، پس تفکیک با غیبتِ پروتونِ ۳.۰–۴.۵ انجام می‌شود." },
    { min: 1510, max: 1570, tag: "ir_amide_ii", fa: "خمشِ N–H (نوارِ آمید II)",
      logic: "فقط در آمیدِ نوع اول و دوم ظاهر می‌شود؛ در آمیدِ نوع سوم (بدونِ N–H) غایب است — راهِ سریعِ تعیینِ نوعِ آمید." },
    { min: 740,  max: 775,  tag: "ir_ortho", fa: "خمشِ OOP اورتو-دواستخلافی",
      logic: "چهار پروتونِ مجاورِ حلقه با هم خارج از صفحه خم می‌شوند و یک نوارِ قوی می‌دهند. الگوی خمشِ OOP تنها راهِ تفکیکِ ایزومرهای اورتو/متا/پارا در IR است." },
    { min: 680,  max: 700,  tag: "ir_meta", fa: "خمشِ OOP متا-دواستخلافی",
      logic: "متا دو نوار می‌دهد (~۶۹۰ و ~۷۸۰) چون دو دستهٔ پروتونِ جدا دارد: یک پروتونِ تنها و یک سه‌گانهٔ مجاور." },
    { min: 500,  max: 600,  tag: "ir_ci", fa: "C–I کششی",
      logic: "سنگین‌ترین هالوژن، پایین‌ترین فرکانس؛ اغلب بیرون از بازهٔ دستگاه‌های معمول می‌افتد. اثبات ید بهتر است از پیکِ ۱۲۷ و شیفتِ ¹³C بیاید." }
  ];
  if (DB.irSmartZones) {
    NEW_IR_ZONES.forEach(function (z) {
      if (!DB.irSmartZones.some(function (x) { return x.tag === z.tag && x.min === z.min; })) DB.irSmartZones.push(z);
    });
  }

  /* همین‌طور «الگوهای طلاییِ ¹H»: چک‌باکس‌هایشان در index.html ثابت‌اند، پس
     الگوهای تازه (اورتو ABCD و متا) به h1SmartZones اضافه می‌شوند تا در
     یابندهٔ ¹H قابلِ تیک باشند. */
  var NEW_H1_ZONES = [
    { min: 6.9, max: 7.6, tag: "h_abcd", fa: "سیستمِ ABCD چهارپروتونیِ نامتقارن (بنزنِ اورتو-دواستخلافی)",
      logic: "چهار پروتونِ حلقه هیچ‌کدام هم‌ارز نیستند، پس یک مولتی‌پلتِ درهمِ چهارپروتونی می‌دهند — نه دو دوتاییِ متقارنِ پارا." },
    { min: 6.8, max: 7.7, tag: "h_ar_meta", fa: "الگوی ۱+۲+۱ با J متایِ کوچک (بنزنِ متا-دواستخلافی)",
      logic: "پروتونِ بینِ دو استخلاف تقریباً سینگلت است (فقط J متایِ ~۲Hz)، و بقیه الگوی اورتو با J~۸Hz می‌دهند." }
  ];
  /* تفکیکِ E/Z در ترپن‌های آلیلی.
     نرول و ژرانیول ایزومرِ هندسیِ همدیگرند و در همهٔ سنجه‌های موجودِ
     برنامه یکسان می‌افتند (یک فرمول، یک مجموعه گروهِ عاملی، یک الگوی
     جرمی) — پس موتور هیچ‌وقت نمی‌توانست جدایشان کند.
     سنجهٔ استانداردِ تعیینِ هندسه در این خانواده، شیفتِ ¹³C متیلِ آلیلیِ
     روی کربنِ سه‌استخلافی است: در ایزومرِ E حدود ۱۶ و در Z حدود ۲۳ ppm.
     علتش اثرِ فضاییِ γ (gauche) است که در حالتِ سیس متیل را دی‌شیلد
     می‌کند. دو ناحیهٔ باریک با همین برچسبِ زمینه‌مند اضافه می‌شود تا
     کاربر تنها در همین موقعیت تیکشان بزند. */
  var GEOM_C13 = [
    { min: 15, max: 17.5, tag: "c_allylic_me_e", fa: "متیلِ آلیلی روی آلکنِ سه‌استخلافی — هندسهٔ E (ترانس)",
      logic: "در ایزومرِ E متیل و زنجیره ترانس‌اند و اثرِ فضاییِ γ ندارند، پس متیل نزدیکِ ۱۶ می‌ماند. جفتِ تشخیصیِ این عدد، ~۲۳ در ایزومرِ Z است." },
    { min: 22, max: 24.5, tag: "c_allylic_me_z", fa: "متیلِ آلیلی روی آلکنِ سه‌استخلافی — هندسهٔ Z (سیس)",
      logic: "در ایزومرِ Z متیل و زنجیره سیس‌اند؛ برهم‌کنشِ فضاییِ γ متیل را ~۷ppm دی‌شیلد می‌کند. تنها راهِ تفکیکِ نرول از ژرانیول با ¹³C." }
  ];
  if (DB.c13SmartZones) {
    GEOM_C13.forEach(function (z) {
      if (!DB.c13SmartZones.some(function (x) { return x.tag === z.tag; })) DB.c13SmartZones.push(z);
    });
  }

  if (DB.h1SmartZones) {
    NEW_H1_ZONES.forEach(function (z) {
      if (!DB.h1SmartZones.some(function (x) { return x.tag === z.tag; })) DB.h1SmartZones.push(z);
    });
  }

  /* سطرهای تازهٔ جدول جامع فرکانس (بخش ۱۶) */
  var NEW_IR_CHAR = [
    { lo: 2550, hi: 2600, group: "S–H تیول",                  intensity: "ضعیف",   shape: "باریک — به‌راحتی از دست می‌رود" },
    { lo: 1330, hi: 1370, group: "S=O سولفونیل (نامتقارن)",   intensity: "قوی",    shape: "نوار قوی، جفتِ ~۱۱۶۰" },
    { lo: 1140, hi: 1180, group: "S=O سولفونیل (متقارن)",     intensity: "قوی",    shape: "مکملِ نوار ۱۳۵۰" },
    { lo: 1030, hi: 1070, group: "S=O سولفوکسید",             intensity: "قوی",    shape: "یک نوار" },
    { lo: 1510, hi: 1570, group: "خمش N–H (آمید II)",         intensity: "متوسط",  shape: "فقط آمید ۱°/۲°" },
    { lo: 1590, hi: 1650, group: "خمش N–H₂ (قیچی‌ای آمین ۱°)", intensity: "متوسط",  shape: "پهن" },
    { lo: 1000, hi: 1400, group: "C–F کششی",                  intensity: "بسیار قوی", shape: "چند نوار شدید (CF₃ دوگانه)" },
    { lo: 740,  hi: 775,  group: "C–H خمش اورتو-دواستخلافی",  intensity: "قوی",    shape: "یک نوار" },
    { lo: 680,  hi: 700,  group: "C–H خمش متا-دواستخلافی",     intensity: "قوی",    shape: "دو نوار (~۶۹۰ و ~۷۸۰)" },
    { lo: 500,  hi: 600,  group: "C–I کششی",                  intensity: "قوی",    shape: "باریک، لبهٔ طیف" }
  ];
  if (DB.irCharacteristic) {
    NEW_IR_CHAR.forEach(function (r) {
      if (!DB.irCharacteristic.some(function (x) { return x.group === r.group; })) DB.irCharacteristic.push(r);
    });
  }

  /* الگوی ایزوتوپیِ گوگرد و ید به جدول ایزوتوپ‌ها */
  if (DB.ms && DB.ms.isotopes && !DB.ms.isotopes.I) {
    DB.ms.isotopes.I = { ratio: "تک‌ایزوتوپی", fa: "ید تنها یک ایزوتوپ دارد (۱۲۷)؛ نشانه‌اش پیک ۱۲۷ و افتِ −۱۲۷ است، نه الگوی M+2" };
  }

  /* ==================================================================
     ۳) قطعات جرمی تازه — یون‌های شاخصِ گروه‌های نویافته
     ================================================================== */
  var NEW_FRAGS = {
    "47":  { id: "ms_47",  ion: "CH₂SH⁺ / CH₃S⁺",            implies: "تیول یا تیواتر متیلی (شکست آلفا کنار گوگرد)", block: "thiol" },
    "48":  { id: "ms_48",  ion: "CH₃SH⁺·",                    implies: "متان‌تیول — افتِ خنثی از تیواترها", block: null },
    "61":  { id: "ms_61",  ion: "C₂H₅S⁺",                     implies: "اتیل‌تیو (تیواتر/تیول اتیلی)", block: "thioether" },
    "64":  { id: "ms_64",  ion: "SO₂⁺· / C₅H₄⁺",              implies: "سولفون/سولفونات (خروج SO₂) یا قطعهٔ حلقوی", block: null },
    "110": { id: "ms_110", ion: "C₆H₆S⁺· تیوفنول",            implies: "تیوفنول یا آریل‌تیول", block: null },
    "155": { id: "ms_155", ion: "CH₃C₆H₄SO₂⁺ تسیل",           implies: "تسیلات یا تولوئن‌سولفونامید (کاتیونِ تسیل)", block: "sulfonate" },
    "172": { id: "ms_172", ion: "CH₃C₆H₄SO₂OH⁺· تولوئن‌سولفونیک اسید", implies: "تسیلات با بازآراییِ هیدروژن", block: null },
    "204": { id: "ms_204", ion: "C₆H₅I⁺· یدوبنزن",            implies: "یدید آروماتیک (M؛ افتِ −۱۲۷ به ۷۷)", block: "iodo" },
    "121b": { id: "ms_121b", ion: "C₈H₁₁N⁺· دی‌متیل‌آنیلین",  implies: "آمین آروماتیک نوع سوم", block: "amine3_dimethyl" },
    "120b": { id: "ms_120b", ion: "C₈H₁₀N⁺ (M−H دی‌متیل‌آمینو)", implies: "شکستِ آلفا کنار نیتروژنِ آمین ۳°", block: null },
    "148": { id: "ms_148", ion: "C₈H₄O₃⁺· انیدرید فتالیک",    implies: "انیدرید حلقوی آروماتیک (M؛ سپس −CO به ۱۰۴)", block: "anhydride" },
    "178": { id: "ms_178", ion: "C₁₄H₁₀⁺· دی‌فنیل‌استیلن",     implies: "آلکینِ درونیِ دی‌آریل (C≡C در IR نامرئی است)", block: "alkyne_internal" },
    "128": { id: "ms_128", ion: "C₁₀H₈⁺· نفتالین",            implies: "حلقهٔ جوش‌خوردهٔ ده‌کربنه", block: "naphthyl" },
    "180": { id: "ms_180", ion: "C₁₃H₈O⁺· فلوئورنون",         implies: "کتونِ آریلیِ حلقوی جوش‌خورده (افتِ −CO به ۱۵۲)", block: null },
    "152": { id: "ms_152", ion: "C₁₂H₈⁺· بی‌فنیلن",            implies: "باقیماندهٔ فلوئورنون پس از خروج CO", block: null }
  };
  if (DB.ms && DB.ms.fragments) {
    Object.keys(NEW_FRAGS).forEach(function (k) {
      // کلیدهای دارای پسوند حرفی با شمارهٔ عددیِ همان جرم ادغام می‌شوند
      // (کاربر در کادر m/z فقط عدد تایپ می‌کند؛ کلیدِ حرفی هرگز دیده نمی‌شد)
      var num = k.replace(/[^0-9]/g, "");
      var alt = k !== num;
      if (!alt) {
        if (!DB.ms.fragments[k]) DB.ms.fragments[k] = NEW_FRAGS[k];
        return;
      }
      var host = DB.ms.fragments[num];
      var entry = NEW_FRAGS[k];
      if (!host) { DB.ms.fragments[num] = entry; return; }
      host.alts = host.alts || [];
      if (!host.alts.some(function (a) { return a.id === entry.id; })) {
        host.alts.push({ id: entry.id, ion: entry.ion, implies: entry.implies });
      }
    });
  }

  /* افت‌های خنثای تازه */
  var NEW_LOSSES = [
    { loss: 47,  frag: "•SCH₃",        implies: "تیواتر متیلی (شکست آلفا کنار گوگرد)" },
    { loss: 48,  frag: "CH₃SH",        implies: "تیواتر/تیولِ متیلی با بازآراییِ هیدروژن" },
    { loss: 64,  frag: "SO₂",          implies: "سولفون یا سولفونات (خروج دی‌اکسید گوگرد)" },
    { loss: 65,  frag: "•SO₂H",        implies: "سولفونیک اسید یا سولفونات" },
    { loss: 128, frag: "HI",           implies: "یدید آلکیل" },
    { loss: 43,  frag: "•CH₃CO / C₃H₇•", implies: "استیل (متیل‌کتون/استامیدو) یا پروپیل" }
  ];
  if (DB.msNeutralLosses) {
    NEW_LOSSES.forEach(function (l) {
      if (!DB.msNeutralLosses.some(function (x) { return x.loss === l.loss && x.frag === l.frag; })) DB.msNeutralLosses.push(l);
    });
  }

  /* ==================================================================
     ۴) تست‌های کلاسیکِ تازه — پوشش گروه‌هایی که تست شناساییِ ثبت‌شده نداشتند
     ================================================================== */
  var NEW_TESTS = [
    { id: "iodoform", fa: "یدوفرم (هالوفرم)", reagent: "I₂ + NaOH",
      posTag: "wet_iodoform_pos", target: "متیل‌کتون یا الکلِ CH₃-CH(OH)-",
      positive: "رسوب زردِ یدوفرم CHI₃ با بوی مشخص",
      note: "فقط گروهِ استیل (CH₃-CO-) یا الکلی که به آن اکسید شود مثبت می‌دهد؛ کتون‌های بزرگ‌تر منفی‌اند. مکملِ عالیِ پیک ۴۳ در طیف جرمی." },
    { id: "bicarbonate", fa: "بی‌کربنات سدیم", reagent: "NaHCO₃ ۵٪ آبی",
      posTag: "wet_bicarb_pos", target: "کربوکسیلیک اسید",
      positive: "کف کردن و خروج حباب CO₂",
      note: "فنول‌ها منفی‌اند (اسیدیتهٔ کافی ندارند) — همین، تفکیکِ قطعیِ اسید از فنول است. معادلِ عملیِ کلاسِ حلالیتِ A1." },
    { id: "beilstein", fa: "بایلشتاین", reagent: "سیم مسِ تمیز در شعله",
      posTag: "wet_beilstein_pos", target: "هالوژن (Cl/Br/I)",
      positive: "شعلهٔ سبز یا آبی-سبز",
      note: "تستِ سریعِ حضورِ هالوژن، اما نوعِ هالوژن را نمی‌گوید و فلوئور را نمی‌گیرد؛ برای تفکیک، AgNO₃ یا الگوی ایزوتوپیِ جرمی لازم است." },
    { id: "agno3_halide", fa: "نیترات نقره (الکلی)", reagent: "AgNO₃ در اتانول",
      posTag: "wet_agno3_pos", target: "هالیدِ فعال (۳°، آلیلی، بنزیلی)",
      positive: "رسوبِ فوریِ هالید نقره",
      classify: { "3": "رسوب فوری در دمای اتاق = هالید ۳°/آلیلی/بنزیلی (SN1)", "2": "رسوب با گرم‌کردن = هالید ۲°", "1": "بدون رسوب یا بسیار کند = هالید ۱° یا آریلی/وینیلی" },
      note: "هالیدِ آریلی و وینیلی حتی با گرم‌کردن هم رسوب نمی‌دهند (پیوندِ C–X با خصلتِ دوگانه) — تلهٔ رایج." },
    { id: "baeyer", fa: "بایر (پرمنگنات سرد)", reagent: "KMnO₄ رقیقِ سرد",
      posTag: "wet_baeyer_pos", target: "آلکن یا آلکین",
      positive: "محوشدنِ رنگ بنفش و رسوبِ قهوه‌ایِ MnO₂",
      note: "آلدهیدها و فنول‌ها هم مثبتِ کاذب می‌دهند (اکسیدپذیرند)؛ برای تأیید پیوندِ دوگانه باید با آبِ برم و IR ترکیب شود." },
    { id: "bromine_water", fa: "آبِ برم", reagent: "Br₂ در آب/CCl₄",
      posTag: "wet_br2_pos", target: "آلکن، آلکین، فنول، آنیلین",
      positive: "محوشدنِ رنگِ نارنجی (افزایش) یا رسوبِ سفید (جانشینیِ فنول)",
      note: "تفکیکِ سازوکار: محوشدنِ رنگ بدونِ رسوب = افزایش به آلکن؛ رسوبِ سفیدِ تری‌برمو = جانشینیِ آروماتیکِ فعال‌شده (فنول/آنیلین)." },
    { id: "nitroprusside", fa: "نیتروپروسایدِ سدیم", reagent: "Na₂[Fe(CN)₅NO] در محیطِ قلیایی",
      posTag: "wet_nitroprusside_pos", target: "تیول (–SH)",
      positive: "رنگِ سرخِ ارغوانیِ پررنگ",
      note: "تفکیکِ تیول از تیواتر: تیواتر (–S–) پروتونِ گوگردی ندارد و منفی است، در حالی که هر دو در تستِ لاسِن گوگرد نشان می‌دهند." },
    { id: "schiff", fa: "معرفِ شیف", reagent: "فوکسینِ رنگ‌بری‌شده با SO₂",
      posTag: "wet_schiff_pos", target: "آلدهید",
      positive: "بازگشتِ رنگِ سرخِ ارغوانی",
      note: "کتون‌ها منفی‌اند. مکملِ تولنس با این مزیت که آلدهیدهای آروماتیک را هم می‌گیرد (جایی که فهلینگ منفیِ کاذب می‌دهد)." },
    { id: "zeisel", fa: "زایزل", reagent: "HI غلیظِ داغ، سپس AgNO₃",
      posTag: "wet_zeisel_pos", target: "اتر یا استرِ متوکسی/اتوکسی",
      positive: "رسوبِ زردِ AgI",
      note: "اترها گروهِ عاملیِ «خنثی»اند و تستِ رنگیِ دیگری ندارند؛ زایزل تنها راهِ کلاسیکِ اثباتِ اتر است. با سینگلتِ ~۳.۸ppm و کششِ C–O در ۱۰۰۰–۱۳۰۰ سه‌گانه می‌شود." },
    { id: "hydrolysis_amide", fa: "هیدرولیزِ قلیاییِ آمید", reagent: "NaOH آبی، جوشاندن",
      posTag: "wet_amide_hydrolysis_pos", target: "آمید",
      positive: "بویِ آمونیاک (آمید ۱°) یا آمینِ فرار (آمید ۲°) و اسیدشدنِ محلول",
      note: "آمید در برابرِ همهٔ تست‌های کربونیل (۲،۴-DNP، تولنس، هیدروکسامیک) منفی است — رزونانسِ نیتروژن، کربونیل را غیرفعال می‌کند. هیدرولیز، تستِ اختصاصیِ آن است." }
  ];
  // جدولِ تست‌های عاملی، همان آرایه‌ای است که UI از آن چک‌باکس می‌سازد
  var host = DB.functionalTests || DB.classicalTests || DB.wetTests;
  if (!host) {
    // نامِ کلید را از روی وجودِ posTag پیدا می‌کنیم تا به ساختارِ فعلی وابسته نباشیم
    Object.keys(DB).forEach(function (k) {
      if (host) return;
      var v = DB[k];
      if (Array.isArray(v) && v.length && v[0] && v[0].posTag && v[0].reagent) host = v;
    });
  }
  if (host) {
    NEW_TESTS.forEach(function (t) {
      if (!host.some(function (x) { return x.id === t.id; })) host.push(t);
    });
  } else if (typeof console !== "undefined") {
    console.warn("database-expansion: جدولِ تست‌های عاملی پیدا نشد — تست‌های تازه اضافه نشدند.");
  }

  /* مشتق‌سازی‌های تازه */
  if (DB.derivatization) {
    [
      { group: "کربوکسیلیک اسید", reagent: "p-تولوئیدین یا آنیلین", product: "آنیلید/تولوئیدید (آمیدِ جامد با نقطه ذوبِ تیز)" },
      { group: "فنول", reagent: "فنیل‌ایزوسیانات", product: "فنیل‌کاربامات (اورتان)" },
      { group: "آمین ۳°", reagent: "متیل یدید", product: "نمکِ کواترنریِ آمونیوم (متیودید)" },
      { group: "تیول", reagent: "۲،۴-دی‌نیتروکلروبنزن", product: "۲،۴-دی‌نیتروفنیل تیواتر" },
      { group: "الکل", reagent: "فنیل‌ایزوسیانات", product: "کاربانیلات" }
    ].forEach(function (d) {
      if (!DB.derivatization.some(function (x) { return x.group === d.group && x.reagent === d.reagent; })) DB.derivatization.push(d);
    });
  }

  /* ==================================================================
     ۵) ترکیب‌های تازه — پوشش‌دهیِ گروه‌های عاملیِ غایب
     در قالبِ fieldProblems نوشته می‌شوند تا ابزارِ derive-signatures.js
     خودش امضا و زنجیرهٔ ماشین‌خوانشان را بسازد.
     ================================================================== */
  var NEW_COMPOUNDS = [
    /* ---------------- گوگرد ---------------- */
    { field: "پوشش S", name: "اتان‌تیول", en: "Ethanethiol", formula: "C2H6S", ihd: 0, cls: "sulfur",
      blocks: ["اتیل", "تیول"],
      ir: "2570 (S-H کششی، ضعیف و باریک — نه پهن مثل O-H)، 2960 (C-H)، 655 (C-S)",
      ms: "M=62، 47 (CH2SH+، شکست آلفا)، 34 (H2S)، 29 (C2H5+)؛ M+2 حدود 4.4% (ایزوتوپ 34S)",
      c13: "19.9 (CH3)، 19.4 (CH2) — گوگرد برخلاف اکسیژن شیفت کمی می‌دهد",
      h1: "2.52 (q, 2H)، 1.33 (t, 3H)، 1.31 (t, 1H، SH — با D2O تبادل می‌شود)",
      trap: "تلهٔ کلاسیک: S-H در 2570 آن‌قدر ضعیف است که به‌راحتی نادیده می‌ماند و ترکیب «آلکان» تشخیص داده می‌شود. دو نشانهٔ نجات‌دهنده: M+2 با شدت 4.4% (نه 33% کلر) و اینکه CH2 مجاور گوگرد در 13C فقط تا ~19 می‌رود، در حالی که مجاور اکسیژن به ~60 می‌رفت." },

    { field: "پوشش S", name: "تیوفنول", en: "Thiophenol", formula: "C6H6S", ihd: 4, cls: "sulfur",
      blocks: ["فنیل", "تیول"],
      ir: "2570 (S-H)، 1580 و 1475 (C=C آروماتیک)، 740 و 690 (تک‌استخلافی، دو نوار)",
      ms: "M=110، 109 (M-H)، 77 (فنیل)، 66، 65، 51",
      c13: "130.9، 129.5، 129.1، 125.7 (چهار محیط آروماتیک)",
      h1: "7.20-7.35 (m, 5H)، 3.45 (s, 1H، SH)",
      trap: "پروتونِ SH در ~3.4ppm می‌افتد، یعنی همان‌جایی که پروتونِ متصل به کربنِ اکسیژن‌دار انتظار می‌رود؛ تفکیک با D2O (تبادل) و با اینکه هیچ کربنی در 13C بالای 60 نیست." },

    { field: "پوشش S", name: "دی‌اتیل سولفید", en: "Diethyl sulfide", formula: "C4H10S", ihd: 0, cls: "sulfur",
      blocks: ["اتیل", "تیواتر", "اتیل"],
      ir: "2960 و 2870 (C-H)، بدونِ هیچ نوار در 2550-2600 (کلیدِ تفکیک از تیول)، 690 (C-S)",
      ms: "M=90، 75 (M-CH3)، 62، 61 (C2H5S+)، 47، 29",
      c13: "25.5 (CH2)، 14.8 (CH3) — تنها دو محیط (تقارن)",
      h1: "2.52 (q, 4H)، 1.25 (t, 6H) — تنها دو سیگنال",
      trap: "تستِ لاسِن گوگرد را مثبت نشان می‌دهد اما نیتروپروساید منفی است: تیواتر پروتونِ گوگردی ندارد. IR هم با غیبتِ نوارِ 2570 همین را تأیید می‌کند." },

    { field: "پوشش S", name: "دی‌متیل سولفوکسید", en: "Dimethyl sulfoxide", formula: "C2H6OS", ihd: 0, cls: "sulfur",
      blocks: ["متیل", "سولفوکسید", "متیل"],
      ir: "1050 (S=O قوی — پایین‌تر از SO2 و بالاتر از C-O)، 2995 (C-H)",
      ms: "M=78، 63 (M-CH3)، 61، 45، 15",
      c13: "40.5 (تک‌سیگنال — تقارن کامل)",
      h1: "2.62 (s, 6H) — تک‌سینگلت",
      trap: "نوارِ 1050 را نباید با کششِ C-O اشتباه گرفت: در فرمول اکسیژن هست ولی هیچ پروتونی در 3.0-4.5 دیده نمی‌شود، پس اکسیژن به کربن وصل نیست. IHD=0 با یک اکسیژن و یک گوگرد، فقط با S=O جور می‌شود." },

    { field: "پوشش S", name: "پارا-تولوئن‌سولفونامید", en: "p-Toluenesulfonamide", formula: "C7H9NO2S", ihd: 4, cls: "sulfur",
      blocks: ["حلقهٔ پارا-متیل", "سولفونامید"],
      ir: "3350 و 3250 (N-H دو نوار، آمینِ سولفونامیدیِ نوع اول)، 1330 و 1160 (دو نوار قویِ SO2)، 1595 (آروماتیک)، 815 (پارا)",
      ms: "M=171، 155 (تسیل، CH3C6H4SO2+)، 107، 91 (تروپیلیوم)، 65",
      c13: "143.5، 141.0، 129.7، 126.2، 21.5 (CH3)",
      h1: "7.78 (d, 2H)، 7.30 (d, 2H) — الگوی AA'BB'، 7.25 (s, 2H، NH2)، 2.35 (s, 3H)",
      trap: "دو نوارِ قویِ 1330/1160 را نباید «دو نوارِ نیترو» خواند: نیترو در 1350/1520 است و SO2 در 1350/1160. اختلافِ جرمی هم قطعی است — گوگرد M+2 با 4.4% می‌دهد که نیتروژن نمی‌دهد." },

    /* ---------------- ید ---------------- */
    { field: "پوشش I", name: "یدواتان", en: "Iodoethane", formula: "C2H5I", ihd: 0, cls: "halide",
      blocks: ["اتیل", "ید"],
      ir: "2970 (C-H)، 1200، 500 (C-I، لبهٔ طیف)",
      ms: "M=156، 127 (I+)، 29 (C2H5+)، 27",
      c13: "20.5 (CH3)، -0.2 (CH2-I — اثرِ اتمِ سنگین، شیفتِ منفی!)",
      h1: "3.20 (q, 2H)، 1.83 (t, 3H)",
      trap: "اثرِ اتمِ سنگین: کربنِ متصل به ید در 13C به حدود صفر یا منفی می‌رود، درست خلافِ انتظار از یک هالوژنِ الکترون‌کشنده. علتش پوششِ دیامغناطیسیِ ابرِ الکترونیِ بزرگِ ید است، نه اثرِ القایی." },

    { field: "پوشش I", name: "یدوبنزن", en: "Iodobenzene", formula: "C6H5I", ihd: 4, cls: "halide",
      blocks: ["فنیل", "ید"],
      ir: "3060 (C-H آروماتیک)، 1575 و 1470 (آروماتیک)، 735 و 685 (تک‌استخلافی)، 500 (C-I)",
      ms: "M=204، 127 (I+)، 77 (فنیل)، 51",
      c13: "137.5، 130.3، 130.1، 94.4 (C-I — اثرِ اتمِ سنگین)",
      h1: "7.68 (d, 2H)، 7.30 (t, 1H)، 7.10 (t, 2H)",
      trap: "M=204 با یک پیکِ تنها و بدونِ هیچ M+2 قابل‌توجه — ید تک‌ایزوتوپی است. غیبتِ الگویِ M+2 در حضورِ جرمِ مولکولیِ بزرگ، خودش امضای ید است (کلر و برم همیشه M+2 می‌دهند)." },

    /* ---------------- آمید ---------------- */
    { field: "پوشش آمید", name: "استامید", en: "Acetamide", formula: "C2H5NO", ihd: 1, cls: "amide",
      blocks: ["کربونیل آمیدی", "متیل"],
      ir: "3350 و 3180 (N-H آمیدِ نوع اول، دو نوار)، 1660 (C=O آمید I — بسیار پایین)، 1620 (خمشِ N-H آمید II)",
      ms: "M=59، 44 (CONH2+)، 43 (استیل)، 15",
      c13: "172.7 (کربونیلِ آمیدی)، 22.3 (CH3)",
      h1: "2.00 (s, 3H)، 6.0 و 6.5 (br, 2H، NH2 — پهن و تبادلی با D2O)",
      trap: "کربونیل در 1660 آن‌قدر پایین است که به‌راحتی «آلکن C=C» خوانده می‌شود. تفکیک قطعی: 13C در 172.7 (هیچ آلکنی این‌جا نیست) و مثبت‌نشدنِ 2،4-DNP — رزونانسِ نیتروژن، کربونیل را غیرفعال کرده است." },

    { field: "پوشش آمید", name: "بنزامید", en: "Benzamide", formula: "C7H7NO", ihd: 5, cls: "amide",
      blocks: ["فنیل", "کربونیل آمیدی"],
      ir: "3360 و 3170 (N-H دو نوار)، 1655 (C=O آمید)، 1620 (آمید II)، 1575 (آروماتیک)، 705 (تک‌استخلافی)",
      ms: "M=121، 105 (بنزویل)، 77 (فنیل)، 51",
      c13: "169.7، 133.4، 131.7، 128.5، 127.3",
      h1: "7.85 (d, 2H)، 7.40-7.55 (m, 3H)، 6.0-7.9 (br, 2H، NH2)",
      trap: "آبشارِ 121→105→77 دقیقاً همان آبشارِ بنزوئیکِ اسید و متیلِ بنزوات است؛ آنچه آمید را جدا می‌کند دو نوارِ N-H و نبودِ پروتونِ اسیدیِ 10-13 است." },

    { field: "پوشش آمید", name: "استانیلید", en: "Acetanilide", formula: "C8H9NO", ihd: 5, cls: "amide",
      blocks: ["فنیل", "آمین ثانویه", "استیل"],
      ir: "3300 (N-H تنها یک نوار — آمیدِ نوع دوم)، 1665 (C=O)، 1600 (آروماتیک)، 1550 (آمید II)، 755 و 692 (تک‌استخلافی)",
      ms: "M=135، 93 (آنیلین، خروجِ کتن)، 43 (استیل)، 65",
      c13: "168.5، 138.0، 129.0، 124.2، 120.0، 24.5",
      h1: "7.50 (d, 2H)، 7.30 (t, 2H)، 7.10 (t, 1H)، 7.90 (br, 1H، NH)، 2.15 (s, 3H)",
      trap: "شمارشِ نوارِ N-H تعیین‌کننده است: یک نوار = آمیدِ نوع دوم، دو نوار = نوع اول. افتِ 135→93 هم افتِ 42 (کتن CH2=C=O) است، امضای گروهِ استیلِ متصل به نیتروژن یا اکسیژن." },

    /* ---------------- آمین ۲° و ۳° ---------------- */
    { field: "پوشش آمین", name: "دی‌اتیل‌آمین", en: "Diethylamine", formula: "C4H11N", ihd: 0, cls: "amine",
      blocks: ["اتیل", "آمین ثانویه", "اتیل"],
      ir: "3300 (N-H تنها یک نوارِ ضعیف — آمینِ نوع دوم)، 2970 (C-H)، 1130 (C-N)",
      ms: "M=73 (فرد — قاعدهٔ نیتروژن)، 58 (M-CH3)، 44، 30",
      c13: "44.1 (CH2-N)، 15.3 (CH3) — دو محیط (تقارن)",
      h1: "2.60 (q, 4H)، 1.08 (t, 6H)، 0.90 (br, 1H، NH)",
      trap: "جرمِ مولکولیِ فردِ 73 قاعدهٔ نیتروژن را فریاد می‌زند، اما تعدادِ نوارِ N-H است که نوعِ آمین را می‌گوید: یک نوار = ۲°. تستِ هینزبرگ تأیید می‌کند: رسوبِ نامحلول در باز." },

    { field: "پوشش آمین", name: "تری‌اتیل‌آمین", en: "Triethylamine", formula: "C6H15N", ihd: 0, cls: "amine",
      blocks: ["اتیل", "اتیل", "اتیل", "آمین نوع سوم دی‌متیل"],
      ir: "2970 و 2800 (C-H)، بدونِ هیچ نوارِ N-H (کلیدِ آمینِ نوع سوم)، 1210 (C-N)",
      ms: "M=101 (فرد)، 86 (M-CH3)، 72 (شکستِ آلفا)، 58، 30",
      c13: "46.8 (CH2-N)، 11.9 (CH3)",
      h1: "2.53 (q, 6H)، 1.03 (t, 9H) — تنها دو سیگنال",
      trap: "غیبتِ کاملِ نوارِ N-H در IR به‌سادگی «هیچ نیتروژنی نیست» تفسیر می‌شود؛ اما M=101 فرد است. آمینِ نوع سوم تنها گروهِ نیتروژن‌داری است که در IR ساکت می‌ماند — هینزبرگ (عدمِ واکنش، حل در اسید) قطعی‌اش می‌کند." },

    { field: "پوشش آمین", name: "N-متیل‌آنیلین", en: "N-Methylaniline", formula: "C7H9N", ihd: 4, cls: "amine",
      blocks: ["فنیل", "آمین ثانویه", "متیل"],
      ir: "3420 (N-H یک نوار)، 1600 و 1505 (آروماتیک)، 1320 (C-N آریلی)، 745 و 690 (تک‌استخلافی)",
      ms: "M=107 (فرد)، 106 (M-H، پایه)، 77، 51",
      c13: "149.5 (C-N)، 129.3، 117.3، 112.4، 30.7 (N-CH3)",
      h1: "7.20 (t, 2H)، 6.70 (m, 3H)، 3.60 (br, 1H، NH)، 2.83 (s, 3H)",
      trap: "سینگلتِ 3H در 2.83 پایین‌تر از متوکسیِ آروماتیک (~3.8) است — نیتروژن الکترونگاتیوتر از اکسیژن نیست، پس N-CH3 همیشه بالادست‌تر از O-CH3 ظاهر می‌شود. این تفکیکِ عملیِ آنیزول از N-متیل‌آنیلین است." },

    { field: "پوشش آمین", name: "N,N-دی‌متیل‌آنیلین", en: "N,N-Dimethylaniline", formula: "C8H11N", ihd: 4, cls: "amine",
      blocks: ["فنیل", "دی‌متیل‌آمینو"],
      ir: "بدونِ نوارِ N-H، 1600 و 1505 (آروماتیک)، 1345 (C-N)، 750 و 690 (تک‌استخلافی)",
      ms: "M=121 (فرد)، 120 (M-H، پایه)، 105، 77، 51",
      c13: "150.7 (C-N)، 129.2، 116.7، 112.7، 40.6 (N(CH3)2)",
      h1: "7.25 (t, 2H)، 6.70 (m, 3H)، 2.94 (s, 6H)",
      trap: "سینگلتِ 6H در 2.94 با شش‌پروتونیِ متقارن. پیکِ پایهٔ M-1 (120) نه M-15: شکست، هیدروژنِ روی کربنِ مجاورِ نیتروژن را می‌برد و کاتیونِ ایمینیومِ پایدار می‌سازد." },

    /* ---------------- انیدرید و کلریدِ اسید ---------------- */
    { field: "پوشش مشتقاتِ اسید", name: "استیک انیدرید", en: "Acetic anhydride", formula: "C4H6O3", ihd: 2, cls: "anhydride",
      blocks: ["استیل", "انیدرید", "استیل"],
      ir: "1825 و 1755 (دو نوارِ C=O انیدرید — جفتِ ارتعاشیِ متقارن/نامتقارن)، 1125 (C-O)",
      ms: "M=102، 43 (استیل، پایه)، 15",
      c13: "166.3 (کربونیل)، 21.8 (CH3) — دو محیط",
      h1: "2.20 (s, 6H) — تک‌سینگلت",
      trap: "دو نوارِ کربونیل در یک ترکیب، معنایش دو گروهِ کربونیلِ جدا نیست: انیدرید یک جفتِ ارتعاشیِ کوپل‌شده دارد. اگر دو نوارِ کربونیل دیدید و 13C فقط یک سیگنالِ کربونیلی داد، انیدریدِ متقارن است." },

    { field: "پوشش مشتقاتِ اسید", name: "بنزوئیل کلراید", en: "Benzoyl chloride", formula: "C7H5ClO", ihd: 5, cls: "acidchloride",
      blocks: ["فنیل", "اسیدکلراید"],
      ir: "1775 (C=O کلریدِ اسید — بالاترین کربونیلِ معمول)، 1730 (اورتونِ ضعیف)، 1595 (آروماتیک)، 875",
      ms: "M=140/142 با نسبتِ 3:1 (یک کلر)، 105 (بنزویل، پایه)، 77، 51",
      c13: "168.0، 135.0، 133.5، 131.4، 128.7",
      h1: "8.00 (d, 2H)، 7.60 (t, 1H)، 7.50 (t, 2H)",
      trap: "کربونیل در 1775 بالاتر از استر (1735) است — کلر با اثرِ القاییِ شدید و بدونِ رزونانسِ مؤثر، خصلتِ دوگانه را زیاد می‌کند. نسبتِ 3:1 روی M، کلر را قطعی می‌کند." },

    { field: "پوشش مشتقاتِ اسید", name: "انیدرید فتالیک", en: "Phthalic anhydride", formula: "C8H4O3", ihd: 7, cls: "anhydride",
      blocks: ["فنیلن (اورتو)", "انیدرید"],
      ir: "1850 و 1775 (دو نوارِ انیدریدِ حلقوی)، 1600 (آروماتیک)، 900، 720",
      ms: "M=148، 104 (خروجِ CO2)، 76 (بنزین)، 50",
      c13: "163.0 (کربونیل)، 136.2، 131.0، 125.5",
      h1: "8.00 (m, 4H) — سیستمِ ABCD اورتو-دواستخلافی",
      trap: "IHD=7 برای C8H4O3: چهار از حلقهٔ بنزن، دو از دو کربونیل، و یک از حلقهٔ پنج‌عضویِ انیدرید. جا افتادنِ IHD حلقهٔ انیدرید، خطای رایجِ شمارش است." },

    /* ---------------- اورتو و متا ---------------- */
    { field: "پوشش استخلاف", name: "اورتو-زایلن", en: "o-Xylene", formula: "C8H10", ihd: 4, cls: "aromatic",
      blocks: ["حلقهٔ بنزن (اورتو-دی‌متیل)"],
      ir: "3020 (C-H آروماتیک)، 1495 و 1465 (آروماتیک)، 742 (یک نوارِ قویِ اورتو)",
      ms: "M=106، 105 (M-H)، 91 (تروپیلیوم)، 77",
      c13: "136.4، 130.0، 125.8، 19.8 (CH3) — چهار محیط",
      h1: "7.10 (m, 4H)، 2.25 (s, 6H)",
      trap: "الگوی خمشِ OOP تنها راهِ تفکیکِ سه ایزومرِ زایلن است: اورتو یک نوار در ~742، متا دو نوار (~690 و ~780)، پارا یک نوار در ~800-840. طیفِ 1H هر سه تقریباً یکسان است." },

    { field: "پوشش استخلاف", name: "متا-زایلن", en: "m-Xylene", formula: "C8H10", ihd: 4, cls: "aromatic",
      blocks: ["فنیلن (متا)", "متیل", "متیل"],
      ir: "3020، 1610 و 1490 (آروماتیک)، 768 و 690 (دو نوارِ متا)",
      ms: "M=106، 105، 91 (تروپیلیوم)، 77",
      c13: "137.6، 130.0، 128.3، 126.3، 21.3 — پنج محیط",
      h1: "6.95-7.15 (m, 4H با J متایِ کوچکِ ~2 Hz)، 2.30 (s, 6H)",
      trap: "شمارشِ محیط‌های 13C، اورتو را از متا جدا می‌کند: اورتو-زایلن چهار محیط دارد و متا-زایلن پنج. تقارنِ متا یک کربنِ منحصربه‌فرد بین دو استخلاف (C2) می‌سازد." },

    { field: "پوشش استخلاف", name: "سالیسیل‌آلدهید", en: "Salicylaldehyde", formula: "C7H6O2", ihd: 5, cls: "aromatic",
      blocks: ["فنیلن (اورتو)", "هیدروکسیل", "آلدهید"],
      ir: "3200 (O-H بسیار پهن و پایین — پیوندِ هیدروژنیِ درون‌مولکولیِ کِلاته)، 2850 و 2750 (دو شاخکِ فرمی آلدهید)، 1665 (C=O پایین‌آمده)، 1620، 757 (اورتو)",
      ms: "M=122، 121 (M-H)، 104 (خروجِ آب)، 93، 76، 65",
      c13: "196.6 (کربونیل)، 161.5 (C-OH)، 137.0، 133.6، 120.7، 119.8، 117.5",
      h1: "11.00 (s, 1H، OH کِلاته — به‌شدت پایین‌رفته)، 9.90 (s, 1H، CHO)، 7.50 (m, 2H)، 7.00 (m, 2H)",
      trap: "کلاسیک‌ترین «اثرِ اورتو»: پیوندِ هیدروژنیِ درون‌مولکولی هم O-H را تا 3200 پایین می‌آورد و هم کربونیل را تا 1665، و پروتونِ OH را به 11ppm می‌برد — جایی که معمولاً پروتونِ کربوکسیلیک اسید انتظار می‌رود. اما 13C در 196.6 است، نه 170: این آلدهید است نه اسید." },

    /* ---------------- اپوکسید، آلکینِ درونی، حلقهٔ جوش‌خورده ---------------- */
    { field: "پوشش ساختار", name: "استایرن اکسید", en: "Styrene oxide", formula: "C8H8O", ihd: 5, cls: "ether",
      blocks: ["فنیل", "اپوکسید"],
      ir: "3060 و 3035 (C-H حلقهٔ سه‌عضوی — بالای 3000 بدونِ آلکن!)، 1250 (نامتقارنِ حلقه)، 875 و 760",
      ms: "M=120، 119، 91 (تروپیلیوم)، 89، 65",
      c13: "137.6، 128.5، 128.2، 125.5، 52.4 (CH2)، 51.2 (CH)",
      h1: "7.30 (m, 5H)، 3.85 (dd, 1H)، 3.15 (dd, 1H)، 2.80 (dd, 1H)",
      trap: "دو پروتونِ CH2 حلقه دیاسترئوتوپیک‌اند: دو dd جداگانه با Jgem تنها 5-6 Hz (در حلقهٔ سه‌عضوی کاهش‌یافته)، نه یک dd دوپروتونی. کششِ C-H بالای 3000 بدونِ هیچ آلکن یا پروتونِ وینیلی، امضای حلقهٔ سه‌عضوی است." },

    { field: "پوشش ساختار", name: "دی‌فنیل‌استیلن", en: "Diphenylacetylene", formula: "C14H10", ihd: 10, cls: "alkyne",
      blocks: ["فنیل", "آلکین درونی", "فنیل"],
      ir: "3060 (C-H آروماتیک)، 1600 و 1500 (آروماتیک)، 756 و 690 (تک‌استخلافی)، بدونِ هیچ نوار در 2100-2260",
      ms: "M=178، 176، 152، 89، 76",
      c13: "131.6، 128.4، 128.3، 123.3، 89.4 (کربنِ آلکینی)",
      h1: "7.55 (m, 4H)، 7.35 (m, 6H)",
      trap: "تلهٔ «آلکینِ نامرئی»: پیوندِ سه‌گانهٔ کاملاً متقارن هیچ تغییرِ دوقطبی ندارد، پس در IR غایب است. اثبات از راهِ 13C در 89.4 (ناحیهٔ 65-90 که هیچ کربنِ اکسیژن‌داری آن‌جا نیست چون اکسیژنی در فرمول نیست) و IHD=10 که با دو حلقهٔ بنزن (8) و یک سه‌گانه (2) کامل می‌شود." },

    /* ---------------- جفتِ سیس/ترانس و پیوندِ پپتیدی ----------------
       دو نوارِ خمشِ OOP آلکن (ir_oop_cis / ir_oop_trans) و تستِ بیوره در
       پایگاه بودند اما هیچ ترکیبی آن‌ها را فعال نمی‌کرد. مالئیک/فوماریک
       دقیقاً همان جفتی است که تفکیکِ هندسی را آموزش می‌دهد: یک فرمول،
       دو ایزومر، و تفاوت در IR و تقارن. */
    { field: "پوشش هندسه", name: "مالئیک اسید (سیس)", en: "Maleic acid", formula: "C4H4O4", ihd: 3, cls: "acid",
      blocks: ["کربوکسیلیک اسید", "وینیل", "کربوکسیلیک اسید"],
      ir: "3400-2500 (O-H اسیدِ بسیار پهن)، 1710 (C=O)، 1630 (C=C)، 1430، 870، 700 (خمشِ OOP سیس)",
      ms: "M=116، 98 (خروجِ آب)، 72 (خروجِ CO2)، 54، 44، 26",
      c13: "170.2 (دو کربونیلِ هم‌ارز)، 130.5 (دو کربنِ آلکنیِ هم‌ارز) — تنها دو محیط",
      h1: "6.30 (s, 2H، J سیس حدود 12 Hz در حالتِ نامتقارن)، 12.50 (br, 2H، دو COOH)",
      trap: "با فوماریکِ ترانس هم‌فرمول است (C4H4O4) و طیفِ 13C هر دو تنها دو سیگنال می‌دهد. تفکیک از دو راه: خمشِ OOP در 700 (سیس) به‌جای 980 (ترانس)، و پیوندِ هیدروژنیِ درون‌مولکولیِ سیس که یکی از دو کربونیل را پایین‌تر می‌آورد و ترکیب را در آب حل‌پذیرتر می‌کند." },

    { field: "پوشش هندسه", name: "فوماریک اسید (ترانس)", en: "Fumaric acid", formula: "C4H4O4", ihd: 3, cls: "acid",
      blocks: ["کربوکسیلیک اسید", "وینیل", "کربوکسیلیک اسید"],
      ir: "3300-2500 (O-H اسیدِ پهن)، 1680 (C=O)، 1640 (C=C ضعیف)، 1420، 980 (خمشِ OOP ترانس)",
      ms: "M=116، 99، 72 (خروجِ CO2)، 45، 27، 26",
      c13: "168.5 (دو کربونیلِ هم‌ارز)، 134.0 (دو کربنِ آلکنیِ هم‌ارز)",
      h1: "6.65 (s, 2H)، 13.00 (br, 2H، دو COOH)",
      trap: "ایزومرِ ترانسِ مالئیک اسید. نوارِ 980 (خمشِ OOP ترانس) امضای هندسه است؛ همچنین C=C ترانسِ کاملاً متقارن تغییرِ دوقطبیِ ناچیزی دارد و نوارش بسیار ضعیف می‌شود — همان دلیلی که آلکینِ متقارن را در IR نامرئی می‌کند." },

    { field: "پوشش پپتید", name: "گلیسیل‌گلیسین (دی‌پپتید)", en: "Glycylglycine", formula: "C4H8N2O3", ihd: 2, cls: "aminoacid",
      blocks: ["آمین نوع اول", "متیلن", "کربونیل آمیدی", "متیلن", "کربوکسیلیک اسید"],
      ir: "3300 (N-H)، 1650 (C=O آمید I)، 1600 (کربوکسیلاتِ نامتقارن)، 1560 (آمید II)، 1410 (کربوکسیلاتِ متقارن)",
      ms: "M=132، 114 (خروجِ آب)، 87، 76، 30 (ایمینیوم)",
      c13: "171.5 (کربوکسیلات)، 168.0 (کربونیلِ آمیدی)، 44.0 و 41.5 (دو متیلنِ نامعادل)",
      h1: "در D2O: 3.95 (s, 2H)، 3.85 (s, 2H) — دو سینگلتِ جدا، بدونِ کوپلاژ",
      trap: "تستِ بیوره تنها تستی است که پیوندِ پپتیدی را نشان می‌دهد و برای یک اسید آمینهٔ تنها منفی است — پس بیورهٔ مثبت با نین‌هیدرینِ مثبت با هم، «دو یا چند اسید آمینهٔ به‌هم‌پیوسته» را اثبات می‌کند. زویتریون است، پس نقطهٔ ذوبِ بالا و انحلال در آب دارد ولی در اتر نامحلول است (کلاسِ حلالیتِ S2)." },

    { field: "پوشش ساختار", name: "نفتالین", en: "Naphthalene", formula: "C10H8", ihd: 7, cls: "aromatic",
      blocks: ["نفتیل"],
      ir: "3050 (C-H آروماتیک)، 1600 و 1510 (آروماتیک)، 780 و 620 (خمشِ OOP حلقهٔ جوش‌خورده)",
      ms: "M=128، 127 (M-H)، 102، 64، 51",
      c13: "133.5 (کربنِ جوش‌خورده)، 127.9 (آلفا)، 125.8 (بتا) — تنها سه محیط",
      h1: "7.85 (m, 4H، موقعیت‌های آلفا 1،4،5،8)، 7.48 (m, 4H، موقعیت‌های بتا 2،3،6،7)",
      trap: "هشت پروتونِ آروماتیک ولی فقط سه محیطِ 13C — تقارنِ بالای حلقهٔ جوش‌خورده. IHD=7 (نه 8): دو حلقهٔ شش‌عضویِ جوش‌خورده پنج پیوندِ دوگانه و دو حلقه دارند." }
  ];

  /* ==================================================================
     ۶) تکمیلِ ترکیب‌هایی که فقط «یادداشتِ توصیفی» داشتند
     این ۲۴ مرجع در بانک با name/formula/ihd/note ثبت شده بودند و هیچ
     دادهٔ طیفی نداشتند، پس موتور نمی‌توانست پیدایشان کند. اینجا به رکوردِ
     کاملِ طیفی ارتقا می‌یابند.
     ================================================================== */
  var COMPLETED_STUBS = [
    { field: "فیلد 154", name: "2,6-دی‌بروموآنیلین", en: "2,6-Dibromoaniline", formula: "C6H5Br2N", ihd: 4, cls: "aromatic",
      blocks: ["فنیلن (اورتو)", "برم", "برم", "آمین نوع اول"],
      ir: "3480 و 3380 (N-H دو نوار، آمینِ نوع اول)، 1615 (خمشِ NH2)، 1560 و 1440 (آروماتیک)، 770، 660 (C-Br)",
      ms: "M=249/251/253 با نسبتِ 1:2:1 (دو برم)، 170/172 (M-Br)، 91، 63",
      c13: "142.5 (C-N)، 131.5، 122.0، 109.5 (C-Br، اثرِ اتمِ سنگین)",
      h1: "7.35 (d, 2H)، 6.60 (t, 1H)، 4.60 (br, 2H، NH2)",
      trap: "خوشهٔ 1:2:1 روی جرمِ مولکولی دو برم را قطعی می‌کند. الگوی 2H+1H (نه چهار پروتون) نشان می‌دهد دو استخلافِ برم متقارن نسبت به آمین نشسته‌اند؛ آرایشِ 2,6 تنها حالتی است که این تقارن را می‌دهد." },

    { field: "فیلد 155", name: "پیپرونال", en: "Piperonal", formula: "C8H6O3", ihd: 6, cls: "carbonyl",
      blocks: ["فنیلن (اورتو)", "متیلن‌دی‌اکسی", "آلدهید"],
      ir: "2780 و 2730 (دو شاخکِ فرمی آلدهید)، 1675 (C=O مزدوج)، 1600 و 1500 (آروماتیک)، 1255 و 1035 (C-O متیلن‌دی‌اکسی)، 930",
      ms: "M=150، 149 (M-H)، 121 (خروجِ CO)، 91، 65، 63",
      c13: "190.2 (کربونیل)، 153.2 و 148.5 (دو C-O آروماتیک)، 131.8، 128.5، 108.2، 106.7، 102.1 (OCH2O)",
      h1: "9.80 (s, 1H، CHO)، 7.40 (d, 1H)، 7.32 (s, 1H)، 6.92 (d, 1H)، 6.08 (s, 2H، OCH2O)",
      trap: "سینگلتِ 2H در 6.08 در ناحیهٔ وینیلی می‌افتد اما وینیل نیست: کربنش در 13C روی 102 است، یعنی کربنِ sp3 که به دو اکسیژن وصل است (استالِ حلقوی). دو اکسیژن روی یک کربنِ sp3، شیفت را از ~60 به بالای 100 می‌برد." },

    { field: "فیلد 161", name: "3-نیترو-اورتو-زایلن", en: "3-Nitro-o-xylene", formula: "C8H9NO2", ihd: 4, cls: "aromatic",
      blocks: ["حلقهٔ ۱،۲،۴-تری‌استخلافی", "متیل", "متیل", "نیترو"],
      ir: "3020، 1530 و 1355 (دو نوارِ نیترو)، 1610 و 1470 (آروماتیک)، 790، 730",
      ms: "M=151، 134 (M-OH)، 105، 91، 77، 65",
      c13: "151.0 (C-NO2)، 140.5، 133.5، 127.0، 126.5، 122.5، 20.3، 14.2 (دو متیلِ نامعادل)",
      h1: "7.45 (d, 1H)، 7.30 (d, 1H)، 7.15 (t, 1H)، 2.35 (s, 3H)، 2.28 (s, 3H)",
      trap: "دو سینگلتِ متیلِ جدا (2.35 و 2.28) و دو کربنِ متیلِ جدا (20.3 و 14.2) ثابت می‌کند دو متیل هم‌ارز نیستند. متیلِ مجاورِ نیترو به‌خاطرِ ممانعتِ فضایی و پیچشِ گروهِ نیترو از صفحه، بالادست‌تر می‌آید." },

    { field: "فیلد 162", name: "2,4,5-تری‌کلروتولوئن", en: "2,4,5-Trichlorotoluene", formula: "C7H5Cl3", ihd: 4, cls: "halide",
      blocks: ["حلقهٔ ۱،۲،۴،۵-تتراستخلافی", "متیل", "کلر", "کلر", "کلر"],
      ir: "3060، 1580 و 1470 (آروماتیک)، 1380 (متیل)، 1100، 870، 700 (C-Cl)",
      ms: "M=194/196/198/200 با نسبتِ 27:27:9:1 (سه کلر)، 159/161 (M-Cl)، 123، 89",
      c13: "136.5، 134.0، 132.5، 131.5، 130.0، 128.5، 19.5 (CH3)",
      h1: "7.40 (s, 1H)، 7.25 (s, 1H)، 2.35 (s, 3H)",
      trap: "خوشهٔ چهارپیکیِ 27:27:9:1 امضای سه کلر است (نه دو). دو سینگلتِ تک‌پروتونی بدونِ هیچ کوپلاژِ اورتو یعنی هیچ دو پروتونِ آروماتیکی مجاور نیستند — آرایشِ 1,2,4,5 تنها حالتی است که این را می‌دهد." },

    { field: "فیلد 163", name: "2,4,5-تری‌کلروآنیلین", en: "2,4,5-Trichloroaniline", formula: "C6H4NCl3", ihd: 4, cls: "aromatic",
      blocks: ["حلقهٔ ۱،۲،۴،۵-تتراستخلافی", "آمین نوع اول", "کلر", "کلر", "کلر"],
      ir: "3470 و 3375 (N-H دو نوار)، 1620 (خمشِ NH2)، 1580 و 1480 (آروماتیک)، 1090، 865، 700 (C-Cl)",
      ms: "M=195/197/199/201 با نسبتِ 27:27:9:1 (سه کلر)، 160/162 (M-Cl)، 125، 90، 63",
      c13: "143.5 (C-N)، 133.0، 130.5، 121.0، 118.5، 115.0",
      h1: "7.30 (s, 1H)، 6.85 (s, 1H)، 4.10 (br, 2H، NH2)",
      trap: "همان اسکلتِ تری‌کلرو، اما جرمِ مولکولیِ فرد (195) نیتروژن را لو می‌دهد. دو سینگلتِ تک‌پروتونی الگوی 1,2,4,5 را تکرار می‌کند؛ تفاوت با تری‌کلروتولوئن، دو نوارِ N-H به‌جای سینگلتِ متیل است." },

    { field: "فیلد 164", name: "4,6-دی‌یدو-1,3-دی‌متوکسی‌بنزن", en: "4,6-Diiodo-1,3-dimethoxybenzene", formula: "C8H8O2I2", ihd: 4, cls: "aromatic",
      blocks: ["حلقهٔ ۱،۲،۴،۵-تتراستخلافی", "دو متوکسی هم‌ارز", "ید", "ید"],
      ir: "3000، 1580 و 1460 (آروماتیک)، 1200 و 1030 (C-O متوکسی)، 800، 510 (C-I)",
      ms: "M=390، 263 (M-I)، 136، 127 (I+)، 121، 93",
      c13: "158.5 (C-OMe)، 141.0، 97.5، 75.0 (C-I، اثرِ اتمِ سنگینِ شدید)، 56.5 (OCH3)",
      h1: "7.85 (s, 1H)، 6.40 (s, 1H)، 3.88 (s, 6H، دو متوکسیِ هم‌ارز)",
      trap: "کربنِ C-I روی 75 می‌افتد، درست در ناحیه‌ای که معمولاً کربنِ اکسیژن‌دارِ sp3 انتظار می‌رود؛ اما پروتونی روی آن نیست و اکسیژن‌ها همه صرفِ دو متوکسی شده‌اند. سینگلتِ 6H اثباتِ تقارنِ دو متوکسی است." },

    { field: "فیلد 168", name: "2-سیکلوهگزن-1-اون", en: "2-Cyclohexen-1-one", formula: "C6H8O", ihd: 3, cls: "carbonyl",
      blocks: ["کربونیل مزدوج (انون)", "وینیل", "حلقهٔ پنج‌ضلعی"],
      ir: "3030، 1675 (C=O انونِ مزدوج — پایین‌آمده)، 1620 (C=C مزدوج)، 1390، 890",
      ms: "M=96، 68 (خروجِ CO)، 55، 42، 39",
      c13: "199.8 (کربونیلِ انونی)، 150.5 (C-beta)، 129.8 (C-alpha)، 38.2، 25.7، 22.8",
      h1: "6.98 (m, 1H، H-beta)، 6.00 (d, 1H، H-alpha)، 2.35 (m, 4H)، 2.00 (m, 2H)",
      uv: "225 nm (پیِ به پیِ ستارهٔ مزدوج) و 320 nm (n به پیِ ستاره) — جذبِ شاخصِ انون",
      trap: "پروتونِ بتا در 6.98 پایین‌تر از پروتونِ آلفا در 6.00 است، خلافِ انتظار از فاصله تا کربونیل. علتش رزونانسِ انونی است: بارِ مثبتِ جزئی روی کربنِ بتا می‌نشیند، نه آلفا. همین قاعده، جهتِ افزایشِ مایکل را هم توضیح می‌دهد." },

    { field: "فیلد 169", name: "2-هیدروکسی‌سیکلوهگز-2-ان-1-اون", en: "2-Hydroxycyclohex-2-en-1-one", formula: "C6H8O2", ihd: 3, cls: "carbonyl",
      blocks: ["کربونیل مزدوج (انون)", "هیدروکسیل آلیلیک", "وینیل", "حلقهٔ پنج‌ضلعی"],
      ir: "3350 (O-H پهن)، 1670 (C=O انونی)، 1640 (C=C)، 1400، 1050",
      ms: "M=112، 84 (خروجِ CO)، 69، 55، 41",
      c13: "195.5 (کربونیل)، 148.0 (C-OH وینیلی)، 120.5، 36.5، 25.0، 22.5",
      h1: "6.55 (t, 1H، وینیلی)، 6.10 (br, 1H، OH)، 2.50 (m, 2H)، 2.40 (m, 2H)، 1.95 (m, 2H)",
      trap: "این یک آلفا-دی‌کتونِ انولی‌شده است: FeCl3 مثبت می‌دهد (انول) در حالی که هیچ حلقهٔ فنولی وجود ندارد. تستِ FeCl3 «فنول» نمی‌گوید، «انول» می‌گوید — تفکیکش با غیبتِ چهار پیوندِ دوگانهٔ آروماتیک در IHD است (IHD=3 نه 5)." },

    { field: "فیلد 170", name: "1-استیل‌سیکلوهگزن", en: "1-Acetylcyclohexene", formula: "C8H12O", ihd: 3, cls: "carbonyl",
      blocks: ["کربونیل مزدوج (انون)", "متیل", "وینیل", "حلقهٔ شش‌ضلعی"],
      ir: "2930، 1670 (C=O مزدوج)، 1630 (C=C)، 1360، 1250",
      ms: "M=124، 109 (M-CH3)، 81، 53، 43 (استیل)",
      c13: "199.0 (کربونیل)، 140.5 (C کواترنرِ وینیلی)، 137.5، 25.8، 24.0، 22.2، 21.5، 21.0",
      h1: "6.85 (m, 1H، وینیلی)، 2.28 (s, 3H)، 2.20 (m, 4H)، 1.60 (m, 4H)",
      uv: "232 nm — با قاعدهٔ وودوارد-فایزر: پایهٔ 215 برای انونِ حلقهٔ شش‌عضوی به‌اضافهٔ دو باقیماندهٔ حلقه",
      trap: "پیکِ 43 و سینگلتِ 3H در 2.28، گروهِ استیل را قطعی می‌کند؛ اما کربونیل در 1670 (نه 1715) است، پس استیل به یک سیستمِ مزدوج وصل است. تنها یک پروتونِ وینیلی یعنی پیوندِ دوگانه سه‌استخلافی است." },

    { field: "فیلد 171", name: "مزیتیل اکساید", en: "Mesityl oxide", formula: "C6H10O", ihd: 2, cls: "carbonyl",
      blocks: ["استیل", "وینیل", "دو متیل هم‌ارز"],
      ir: "2960، 1690 (C=O مزدوج)، 1620 (C=C)، 1360، 1250",
      ms: "M=98، 83 (M-CH3، پایه)، 55، 43 (استیل)، 39",
      c13: "198.5 (کربونیل)، 155.0 (C-beta کواترنر)، 124.2 (C-alpha)، 32.0، 27.5، 20.6",
      h1: "6.08 (s, 1H، وینیلی)، 2.12 (s, 3H، استیل)، 1.88 (s, 3H)، 1.87 (s, 3H)",
      uv: "236 nm — انونِ آسیکلیک: پایهٔ 215 به‌اضافهٔ دو استخلافِ آلکیل روی بتا",
      trap: "سه سینگلتِ متیلِ نزدیک به هم که به‌راحتی «شش‌پروتونیِ هم‌ارز به‌اضافهٔ یک متیل» خوانده می‌شوند؛ اما دو متیلِ روی کربنِ بتا هم‌ارز نیستند (یکی سیس و یکی ترانس نسبت به کربونیل) و در 13C دو سیگنالِ جدا می‌دهند." },

    { field: "فیلد 172", name: "ایندان", en: "Indane", formula: "C9H10", ihd: 5, cls: "aromatic",
      blocks: ["فنیلن (اورتو)", "حلقهٔ پنج‌ضلعی"],
      ir: "3020، 1600 و 1480 (آروماتیک)، 1470، 745 (اورتو-دواستخلافی)",
      ms: "M=118، 117 (M-H، پایه)، 115، 91، 65",
      c13: "144.0 (کربنِ جوش‌خورده)، 126.0، 124.5، 33.0 (CH2 بنزیلی)، 25.5 (CH2 مرکزی)",
      h1: "7.15 (m, 4H)، 2.88 (t, 4H)، 2.05 (quintet, 2H)",
      trap: "کوینتتِ 2H در 2.05 امضای CH2 مرکزیِ حلقهٔ پنج‌عضوی است: با چهار پروتونِ همسایه کوپل می‌شود. IHD=5 (چهار از بنزن، یک از حلقهٔ پنج‌عضویِ سیرشده) بدونِ هیچ کربنی بالای 145 در 13C، حلقهٔ جوش‌خوردهٔ سیرشده را اثبات می‌کند." },

    { field: "فیلد 173", name: "3,3-دی‌متیل‌ایندان-1-اون", en: "3,3-Dimethylindan-1-one", formula: "C11H12O", ihd: 6, cls: "carbonyl",
      blocks: ["فنیلن (اورتو)", "کربونیل حلقوی پنج‌ضلعی", "کربن چهارتایی (gem-دی‌متیل)"],
      ir: "2960، 1710 (C=O حلقهٔ پنج‌عضویِ آریلی)، 1600 (آروماتیک)، 1365 (جم-دی‌متیل، دوقلو)، 760",
      ms: "M=160، 145 (M-CH3، پایه)، 131، 117، 91",
      c13: "205.5 (کربونیل)، 162.5، 136.0، 134.5، 127.5، 123.0، 122.5، 53.5 (CH2)، 38.5 (C کواترنر)، 30.0 (دو متیل)",
      h1: "7.70 (d, 1H)، 7.55 (t, 1H)، 7.40 (t, 1H)، 7.35 (d, 1H)، 2.65 (s, 2H)، 1.42 (s, 6H)",
      trap: "کربونیل در 1710 با آنکه به حلقهٔ بنزن مزدوج است، چون کششِ حلقهٔ پنج‌عضوی آن را بالا می‌برد و مزدوج‌شدگی پایین — دو اثرِ متضاد که تقریباً هم را خنثی می‌کنند. سینگلتِ 6H و نوارِ 1365 هر دو جم-دی‌متیل را می‌گویند." },

    { field: "فیلد 174", name: "1-ایندانون", en: "1-Indanone", formula: "C9H8O", ihd: 6, cls: "carbonyl",
      blocks: ["فنیلن (اورتو)", "کربونیل حلقوی پنج‌ضلعی", "متیلن", "متیلن"],
      ir: "3060، 1710 (C=O)، 1600 و 1590 (آروماتیک)، 1280، 760",
      ms: "M=132، 131 (M-H)، 104 (خروجِ CO)، 78، 51",
      c13: "207.0 (کربونیل)، 155.2، 137.0، 134.5، 127.2، 126.5، 123.6، 36.2، 25.7",
      h1: "7.75 (d, 1H)، 7.58 (t, 1H)، 7.45 (d, 1H)، 7.36 (t, 1H)، 3.15 (t, 2H)، 2.68 (t, 2H)",
      trap: "کربونیل در 207 برای 13C — بالاتر از استوفنونِ آریلی (198) با آنکه هر دو آریل‌کتون‌اند. کششِ حلقهٔ پنج‌عضوی، کربنِ کربونیل را پایین‌تر (میدانِ ضعیف‌تر) می‌برد. جفتِ تریپلتِ 3.15/2.68 دو CH2 مجاور را نشان می‌دهد." },

    { field: "فیلد 175", name: "2-ایندانون", en: "2-Indanone", formula: "C9H8O", ihd: 6, cls: "carbonyl",
      blocks: ["فنیلن (اورتو)", "متیلن", "کربونیل حلقوی پنج‌ضلعی", "متیلن"],
      ir: "3030، 1750 (C=O حلقهٔ پنج‌عضویِ غیرمزدوج — بالا)، 1590 (آروماتیک)، 1410، 745",
      ms: "M=132، 104 (خروجِ CO)، 103، 78، 51",
      c13: "216.5 (کربونیل — بسیار بالا)، 135.5، 127.3، 124.5، 44.0 (دو CH2 هم‌ارز)",
      h1: "7.25 (m, 4H)، 3.55 (s, 4H)",
      trap: "ایزومرِ 1-ایندانون است با همان فرمول، اما سینگلتِ 4H (نه دو تریپلت) و تنها چهار محیطِ 13C، تقارنِ آینه‌ای را ثابت می‌کند: کربونیل وسطِ حلقه است، نه کنارِ بنزن. کربونیلِ غیرمزدوجِ حلقهٔ پنج‌عضوی به 1750 و 216.5 می‌رود." },

    { field: "فیلد 176", name: "آلفا-تترالون", en: "alpha-Tetralone", formula: "C10H10O", ihd: 6, cls: "carbonyl",
      blocks: ["فنیلن (اورتو)", "کربونیل مزدوج", "حلقهٔ پنج‌ضلعی"],
      ir: "3020، 1685 (C=O آریل‌کتونِ حلقهٔ شش‌عضوی)، 1600 (آروماتیک)، 1285، 740",
      ms: "M=146، 118 (خروجِ CO)، 117، 90، 89",
      c13: "198.2 (کربونیل)، 144.4، 133.3، 132.5، 128.7، 127.1، 126.5، 39.1، 29.6، 23.2",
      h1: "8.02 (d, 1H)، 7.45 (t, 1H)، 7.30 (t, 1H)، 7.22 (d, 1H)، 2.95 (t, 2H)، 2.63 (t, 2H)، 2.12 (quintet, 2H)",
      trap: "کربونیلِ 1685 و 198.2 — هر دو «مزدوجِ آریلی». همین جفت‌عدد، آلفا-تترالون را از 1-ایندانون (1710 و 207) جدا می‌کند: در حلقهٔ شش‌عضویِ بی‌کشش، مزدوج‌شدگی بی‌رقیب عمل می‌کند. پروتونِ اورتوی کربونیل در 8.02 پایین‌ترین است." },

    { field: "فیلد 177", name: "بتا-تترالون", en: "beta-Tetralone", formula: "C10H10O", ihd: 6, cls: "carbonyl",
      blocks: ["فنیلن (اورتو)", "متیلن", "کربونیل حلقوی پنج‌ضلعی", "متیلن", "متیلن"],
      ir: "3020، 1715 (C=O غیرمزدوج)، 1590 (آروماتیک)، 1350، 745",
      ms: "M=146، 118 (خروجِ CO)، 117، 104، 91",
      c13: "210.5 (کربونیل)، 135.5، 133.8، 128.5، 127.0، 126.8، 44.5، 38.5، 28.5",
      h1: "7.15 (m, 4H)، 3.55 (s, 2H)، 3.00 (t, 2H)، 2.52 (t, 2H)",
      trap: "ایزومرِ آلفا-تترالون با همان فرمول: کربونیل به 1715 و 210.5 می‌رود چون از حلقهٔ بنزن یک کربن فاصله گرفته و مزدوج نیست. سینگلتِ 2H در 3.55 (CH2 بین بنزن و کربونیل) امضای موقعیتِ بتا است." },

    { field: "فیلد 178", name: "9-متیل‌فلوئورن", en: "9-Methylfluorene", formula: "C14H12", ihd: 10, cls: "aromatic",
      blocks: ["دو حلقهٔ بنزن جوش‌خورده", "متین", "متیل"],
      ir: "3060، 1600 و 1480 (آروماتیک)، 1450، 740 (اورتو-دواستخلافی)",
      ms: "M=180، 179، 165 (فلوئورنیل، پایه)، 152، 89",
      c13: "148.5، 140.5، 127.0، 126.5، 124.5، 120.0، 43.5 (CH)، 18.5 (CH3)",
      h1: "7.75 (d, 2H)، 7.50 (d, 2H)، 7.35 (t, 2H)، 7.28 (t, 2H)، 3.95 (q, 1H)، 1.50 (d, 3H)",
      trap: "کوارتتِ 1H در 3.95 و دوتاییِ 3H در 1.50 یک واحدِ CH-CH3 می‌سازند، اما CH در 3.95 است — یعنی روی کربنی نشسته که به دو حلقهٔ آروماتیک وصل است (بنزیلیکِ دوگانه)، نه به اکسیژن. 13C در 43.5 (نه بالای 60) این را قطعی می‌کند." },

    { field: "فیلد 179", name: "فلوئورنون", en: "Fluorenone", formula: "C13H8O", ihd: 10, cls: "carbonyl",
      blocks: ["دو حلقهٔ بنزن جوش‌خورده", "کربونیل فلوئورنونی"],
      ir: "3060، 1715 (C=O حلقهٔ پنج‌عضویِ آریلی — دو اثرِ متضاد)، 1600 (آروماتیک)، 1450، 735",
      ms: "M=180، 152 (خروجِ CO)، 151، 126، 76",
      c13: "193.9 (کربونیل)، 144.4، 134.6، 134.1، 129.0، 124.2، 120.3",
      h1: "7.65 (d, 2H)، 7.50 (m, 4H)، 7.30 (t, 2H)",
      uv: "جذبِ گستردهٔ 250 و 380 nm — رنگِ زردِ ترکیب از همین باندِ 380 است",
      trap: "افتِ M-28 (خروجِ CO) در یک ترکیبِ کاملاً آروماتیک، کربونیلِ حلقوی را لو می‌دهد. تنها هفت محیطِ 13C برای سیزده کربن، تقارنِ C2 مولکول را نشان می‌دهد: دو حلقهٔ بنزن هم‌ارزند." },

    { field: "فیلد 180", name: "فنیل‌استالدهید اتیلن‌گلیکول استال", en: "Phenylacetaldehyde ethylene glycol acetal", formula: "C10H12O2", ihd: 5, cls: "ether",
      blocks: ["فنیل", "متیلن", "متین استالی (CH(OMe)₂)", "حلقهٔ استالی شش‌ضلعی (دو اکسیژن ۱،۳)"],
      ir: "3030، 1600 و 1495 (آروماتیک)، 1135 و 1040 (دو نوارِ قویِ C-O استال)، بدونِ هیچ کربونیل، 740 و 700",
      ms: "M=164، 163، 133، 91 (تروپیلیوم)، 73 (استالِ حلقوی)، 65",
      c13: "137.0، 129.5، 128.3، 126.4، 104.0 (CH استالی)، 65.0 (دو OCH2)، 40.0 (CH2 بنزیلی)",
      h1: "7.25 (m, 5H)، 4.95 (t, 1H، CH استالی)، 3.85 (m, 4H)، 2.90 (d, 2H)",
      trap: "IHD=5 با دو اکسیژن و هیچ نوارِ کربونیل در IR: تلهٔ استال. پروتونِ استالی در 4.95 و کربنش در 104 — دو اکسیژن روی یک کربنِ sp3، شیفتِ کربن را از ~70 به بالای 100 می‌برد، همان جایی که معمولاً کربنِ آروماتیک انتظار می‌رود." },

    { field: "فیلد 181", name: "تترااتیلن گلیکول دی‌تسیلات", en: "Tetraethylene glycol ditosylate", formula: "C22H30O9S2", ihd: 8, cls: "sulfur",
      blocks: ["حلقهٔ پارا-متیل", "سولفونات (تسیلات)", "–OCH₂CH₂O– ×۲", "سولفونات (تسیلات)", "حلقهٔ پارا-متیل"],
      ir: "2870، 1600 (آروماتیک)، 1355 و 1175 (دو نوارِ قویِ SO2)، 1095 (C-O اتری)، 815 (پارا)، 665",
      ms: "M=502، 347، 172، 155 (تسیل، پایه)، 91 (تروپیلیوم)، 65",
      c13: "145.0، 133.0، 129.9، 128.0، 70.7 و 69.2 و 68.7 (کربن‌های اتریِ زنجیره)، 21.6 (CH3)",
      h1: "7.78 (d, 4H)، 7.34 (d, 4H)، 4.15 (t, 4H)، 3.65 (m, 4H)، 3.55 (m, 8H)، 2.44 (s, 6H)",
      trap: "همهٔ شدت‌ها زوج‌اند (4H، 4H، 6H...) چون مولکول کاملاً متقارن است — دو سرِ یکسان. دو نوارِ 1355/1175 سولفونات را می‌گوید، و اینکه پروتون‌های 4.15 پایین‌تر از بقیهٔ زنجیرهٔ اتری‌اند، نشان می‌دهد آن دو CH2 به اکسیژنِ سولفوناتی وصل‌اند نه اترِ ساده." },

    { field: "فیلد 182", name: "اتیل 4-پیپریدون-1-کربوکسیلات", en: "Ethyl 4-piperidone-1-carboxylate", formula: "C8H13NO3", ihd: 2, cls: "ester",
      blocks: ["اتوکسی‌کربونیل", "آمین ثانویه", "حلقهٔ پنج‌ضلعی", "کربونیل"],
      ir: "2970، 1715 (C=O کتونِ حلقهٔ شش‌عضوی)، 1695 (C=O کارباماتی)، 1230 و 1120 (C-O و C-N)",
      ms: "M=171، 126 (خروجِ OEt)، 98، 56، 29",
      c13: "207.5 (کتون)، 155.3 (کربونیلِ کارباماتی)، 61.6 (OCH2)، 43.0 (دو N-CH2)، 40.8 (دو CH2 آلفا)، 14.6 (CH3)",
      h1: "4.15 (q, 2H)، 3.72 (t, 4H)، 2.45 (t, 4H)، 1.27 (t, 3H)",
      trap: "دو کربونیلِ نزدیک هم در IR که راحت یکی خوانده می‌شوند؛ 13C دو سیگنالِ 207.5 و 155.3 را جدا نشان می‌دهد — فاصلهٔ 50ppm یعنی یکی کتونِ ساده و دیگری کربونیلِ رزونانسی (کارباماتی). تقارنِ حلقه، هشت پروتونِ CH2 را به دو تریپلتِ 4H فرو می‌کاهد." },

    { field: "فیلد 183", name: "N-استیل-2-آمینو-4-فنیل-(E)-بوت-2-انوئیک اسید", en: "N-Acetyl-2-amino-4-phenyl-(E)-but-2-enoic acid", formula: "C12H13NO3", ihd: 7, cls: "acid",
      blocks: ["فنیل", "متیلن", "پیوند دوگانه C=C", "کربوکسیلیک اسید", "آمین ثانویه", "استیل"],
      ir: "3280 (N-H)، 3000-2500 (O-H اسیدِ پهن)، 1700 (C=O اسید)، 1660 (C=O آمید)، 1630 (C=C)، 1540 (آمید II)، 700",
      ms: "M=219، 177 (خروجِ کتن)، 160، 131، 91 (تروپیلیوم)، 43 (استیل)",
      c13: "170.5 (اسید)، 168.8 (آمید)، 136.5، 132.0، 129.0، 128.5، 126.8، 126.0، 34.5 (CH2)، 23.0 (CH3)",
      h1: "12.30 (br, 1H، COOH)، 9.35 (br, 1H، NH)، 7.25 (m, 5H)، 6.55 (t, 1H، وینیلی)، 3.50 (d, 2H)، 2.02 (s, 3H)",
      trap: "سه کربونیل‌مانند در IR (1700، 1660، 1630) اما 13C فقط دو کربنِ کربونیلی می‌دهد: نوارِ 1630 پیوندِ دوگانهٔ C=C است نه کربونیل. تریپلتِ وینیلی در 6.55 که با دوتاییِ 3.50 کوپل است، جایگاهِ آلکن را در زنجیره قطعی می‌کند." },

    { field: "فیلد 184", name: "دی‌اتیل دی‌اتیل‌مالونات", en: "Diethyl diethylmalonate", formula: "C11H20O4", ihd: 2, cls: "ester",
      blocks: ["دو استرِ اتیلی", "کربن چهارتاییِ مرکزی", "دو اتیل (روی Cq)"],
      ir: "2970، 1730 (C=O دو استرِ هم‌ارز)، 1250 و 1180 (C-O)، 1030",
      ms: "M=216، 171 (خروجِ OEt)، 143، 115، 88، 29",
      c13: "171.5 (دو کربونیلِ هم‌ارز)، 61.0 (دو OCH2)، 57.5 (C کواترنر)، 25.0 (دو CH2)، 14.0 و 8.5 (دو نوع CH3)",
      h1: "4.18 (q, 4H)، 1.90 (q, 4H)، 1.25 (t, 6H)، 0.82 (t, 6H)",
      trap: "دو کوارتتِ جدا (4.18 و 1.90) و دو تریپلتِ جدا (1.25 و 0.82) — یعنی دو نوعِ گروهِ اتیلِ متفاوت، نه چهار اتیلِ هم‌ارز. اتیل‌های استری (روی اکسیژن) در 4.18 و اتیل‌های کربنی (روی کربنِ کواترنر) در 1.90. یازده کربن با فقط شش محیطِ 13C." },

    { field: "فیلد 185", name: "1-نیترونفتالین", en: "1-Nitronaphthalene", formula: "C10H7NO2", ihd: 7, cls: "aromatic",
      blocks: ["نفتیل", "نیترو"],
      ir: "3060، 1520 و 1340 (دو نوارِ نیترو)، 1600 و 1510 (آروماتیک)، 860، 790، 750",
      ms: "M=173، 127 (خروجِ NO2 — نفتیل)، 115، 101، 77، 51",
      c13: "146.8 (C-NO2)، 134.4، 134.2، 128.9، 128.5، 127.3، 124.5، 124.2، 123.8، 122.0",
      h1: "8.55 (d, 1H)، 8.25 (d, 1H)، 8.10 (d, 1H)، 7.90 (d, 1H)، 7.60-7.70 (m, 3H)",
      trap: "هفت پروتونِ آروماتیک با ده محیطِ 13C — یعنی هیچ تقارنی وجود ندارد؛ استخلاف روی موقعیتِ آلفا (1) نشسته است، نه بتا. افتِ M-46 (خروجِ NO2) در جرمی، نیترو را قطعی می‌کند و 127 که می‌ماند، جرمِ کاتیونِ نفتیل است." }
  ];

  /* ورودِ ترکیب‌ها به بانک با گاردِ دِدآپ، و ارتقای stubهای موجود */
  var SPECTRA_KEYS = ["ir", "ms", "c13", "h1", "uv", "trap"];
  function localize(rec) {
    var out = {};
    Object.keys(rec).forEach(function (k) {
      out[k] = (SPECTRA_KEYS.indexOf(k) >= 0 && typeof rec[k] === "string") ? faNum(rec[k]) : rec[k];
    });
    return out;
  }

  var addedFP = 0, upgraded = 0;
  DB.fieldProblems = DB.fieldProblems || [];
  NEW_COMPOUNDS.concat(COMPLETED_STUBS).forEach(function (raw) {
    var rec = localize(raw);
    var dup = DB.fieldProblems.some(function (x) { return x.en === rec.en || x.name === rec.name; });
    if (!dup) { DB.fieldProblems.push(rec); addedFP++; }
    // مرجعِ هم‌نامی که فقط note داشت، همان‌جا با دادهٔ طیفی کامل می‌شود
    (DB.reference || []).forEach(function (r) {
      if (r.en !== rec.en || r.ir) return;
      SPECTRA_KEYS.forEach(function (k) { if (rec[k] && !r[k]) r[k] = rec[k]; });
      if (!r.blocks && rec.blocks) r.blocks = rec.blocks;
      if (!r.cls && rec.cls) r.cls = rec.cls;
      upgraded++;
    });
  });

  if (typeof console !== "undefined") {
    console.info("database-expansion: " + NEW_BLOCKS.length + " بلوک، " + NEW_TESTS.length +
      " تستِ کلاسیک، " + NEW_IR_REGIONS.length + " ناحیهٔ IR، " + Object.keys(NEW_FRAGS).length +
      " قطعهٔ جرمی، " + addedFP + " ترکیبِ تازه و " + upgraded + " مرجعِ تکمیل‌شده اضافه شد.");
  }
})(typeof window !== "undefined" ? window : globalThis);
