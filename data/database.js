/* =====================================================================
   پایگاه دانش جامع طیف‌سنجی — CASE Knowledge Base
   این فایل به‌صورت یک شیء سراسری (window.DB) بارگذاری می‌شود تا بدون
   نیاز به سرور محلی (fetch) هم مستقیم از فایل کار کند.
   ===================================================================== */
(function (root) {
const DB = {

  /* ------------------------------------------------------------------
     ۱. جرم اتم‌ها و ظرفیت (برای موتور استوکیومتری و اعتبارسنجی ظرفیت)
     ------------------------------------------------------------------ */
  atomicMass: { C: 12, H: 1, N: 14, O: 16, F: 19, Cl: 35, Br: 79, I: 127, S: 32, P: 31 },
  valence:    { C: 4, H: 1, N: 3, O: 2, F: 1, Cl: 1, Br: 1, I: 1, S: 2, P: 3 },

  /* ------------------------------------------------------------------
     ۲. بلوک‌های سازنده (Building Blocks) — قلب موتور مونتاژ ساختار
     هر بلوک:
       id          شناسه
       fa / en     نام فارسی و فرمول انگلیسی
       atoms       سهم اتمی این قطعه از فرمول مولکولی
       slots       تعداد نقاط اتصال آزاد به بقیه مولکول
       ihd         سهم درجه غیراشباعی
       kind        terminal(۱ اتصال) | linker(۲ اتصال) | core
       display     نماد فشرده برای رسم شماتیک
       evidence    کلید سیگنال‌های طیفی که این قطعه را اثبات می‌کنند
     ------------------------------------------------------------------ */
  blocks: [
    // --- گروه‌های آلکیل انتهایی ---
    { id: "methyl",    fa: "متیل",        en: "-CH₃",        atoms:{C:1,H:3},      slots:1, ihd:0, kind:"terminal", display:"CH₃",  evidence:["h_methyl"] },
    { id: "ethyl",     fa: "اتیل",        en: "-CH₂CH₃",     atoms:{C:2,H:5},      slots:1, ihd:0, kind:"terminal", display:"C₂H₅", evidence:["h_ethyl"] },
    { id: "isopropyl", fa: "ایزوپروپیل",  en: "-CH(CH₃)₂",   atoms:{C:3,H:7},      slots:1, ihd:0, kind:"terminal", display:"iPr",  evidence:["h_iso"] },
    { id: "tbutyl",    fa: "ترت-بوتیل",   en: "-C(CH₃)₃",    atoms:{C:4,H:9},      slots:1, ihd:0, kind:"terminal", display:"tBu",  evidence:["h_tbu"] },
    { id: "npropyl",   fa: "نرمال-پروپیل", en:"-CH₂CH₂CH₃",  atoms:{C:3,H:7},      slots:1, ihd:0, kind:"terminal", display:"nPr",  evidence:[] },

    // --- قطعات آروماتیک ---
    { id: "phenyl",    fa: "فنیل (تک‌استخلافی)", en:"-C₆H₅", atoms:{C:6,H:5},     slots:1, ihd:4, kind:"terminal", display:"C₆H₅", evidence:["h_ar_mono","ms_77"] },
    { id: "benzyl",    fa: "بنزیل",       en: "-CH₂C₆H₅",    atoms:{C:7,H:7},      slots:1, ihd:4, kind:"terminal", display:"Bn",   evidence:["ms_91"] },
    { id: "phenylene_p", fa:"پارا-فنیلن", en:"-C₆H₄- (para)",atoms:{C:6,H:4},     slots:2, ihd:4, kind:"linker",   display:"pC₆H₄",evidence:["h_para","ir_para"] },
    { id: "tolyl_p",   fa: "پارا-تولیل", en:"-C₆H₄-CH₃ (p)",atoms:{C:7,H:7},      slots:1, ihd:4, kind:"terminal", display:"pTol", evidence:["h_para"] },

    // --- هسته‌های کربونیل و مشتقات اسید ---
    { id: "ketone",    fa: "کتون",        en: "-CO-",        atoms:{C:1,O:1},      slots:2, ihd:1, kind:"linker",   display:"C=O",  evidence:["ir_co_ketone","c_ketone","wet_dnp_pos","wet_semicarb_pos"] },
    { id: "aldehyde",  fa: "آلدهید",      en: "-CHO",        atoms:{C:1,H:1,O:1},  slots:1, ihd:1, kind:"terminal", display:"CHO",  evidence:["ir_aldehyde","h_ald","c_ketone","wet_tollens_pos","wet_dnp_pos","wet_fehling_pos"] },
    { id: "cooh",      fa: "کربوکسیلیک اسید", en:"-COOH",    atoms:{C:1,H:1,O:2},  slots:1, ihd:1, kind:"terminal", display:"COOH", evidence:["ir_oh_acid","h_acid","c_ester","wet_sol_a1"] },
    { id: "ester_co",  fa: "استر (کربونیل)", en:"-C(=O)O-",  atoms:{C:1,O:2},      slots:2, ihd:1, kind:"linker",   display:"COO",  evidence:["ir_co_ester","c_ester","wet_hydroxamic_pos"] },
    { id: "amide",     fa: "آمید",        en: "-C(=O)NH₂",   atoms:{C:1,H:2,N:1,O:1},slots:1,ihd:1, kind:"terminal", display:"CONH₂",evidence:["ir_co_amide","ir_nh","c_ester"] },
    /* آمیدِ ثانویه، یعنی همان پیوندِ پپتیدی. بلوکِ amide فقط یک نقطهٔ
       اتصال دارد و نیتروژنش آزاد است، پس N-متیل‌استامید و گلیسیل‌گلیسین
       و فناستین با آن نوشتنی نبودند و ناچار با ketone نوشته می‌شدند —
       که شاهدِ IR را هم جابه‌جا می‌کرد (۱۷۱۵ کتونی به‌جای ۱۶۵۰ آمیدی). */
    { id: "amide_n",   fa: "آمید ثانویه (پل)", en: "-C(=O)NH-", atoms:{C:1,H:1,N:1,O:1}, slots:2, ihd:1, kind:"linker", display:"CONH", evidence:["ir_co_amide","ir_nh","c_ester"] },
    { id: "acyl",      fa: "استیل/آسیل",  en: "-COCH₃",      atoms:{C:2,H:3,O:1},  slots:1, ihd:1, kind:"terminal", display:"COCH₃",evidence:["ms_43","ir_co_ketone"] },

    // --- هترواتم‌دار ---
    { id: "hydroxyl",  fa: "هیدروکسیل",   en: "-OH",         atoms:{O:1,H:1},      slots:1, ihd:0, kind:"terminal", display:"OH",   evidence:["ir_oh_alc","h_d2o","wet_lucas_any","wet_fecl3_pos","wet_sol_a2","wet_can_pos"] },
    { id: "methoxy",   fa: "متوکسی",      en: "-OCH₃",       atoms:{C:1,H:3,O:1},  slots:1, ihd:0, kind:"terminal", display:"OCH₃", evidence:["h_methoxy"] },
    { id: "ether_o",   fa: "اتری",        en: "-O-",         atoms:{O:1},          slots:2, ihd:0, kind:"linker",   display:"O",    evidence:[] },
    { id: "amine1",    fa: "آمین نوع اول",en: "-NH₂",        atoms:{N:1,H:2},      slots:1, ihd:0, kind:"terminal", display:"NH₂",  evidence:["ir_nh","ms_30","h_d2o","wet_hinsberg_1","wet_sol_b","wet_hno2_1"] },
    { id: "nitrile",   fa: "نیتریل",      en: "-C≡N",        atoms:{C:1,N:1},      slots:1, ihd:2, kind:"terminal", display:"CN",   evidence:["ir_triple_cn"] },
    { id: "nitro",     fa: "نیترو",       en: "-NO₂",        atoms:{N:1,O:2},      slots:1, ihd:1, kind:"terminal", display:"NO₂",  evidence:["ir_nitro"] },

    // --- هالوژن‌ها ---
    { id: "chloro",    fa: "کلر",         en: "-Cl",         atoms:{Cl:1},         slots:1, ihd:0, kind:"terminal", display:"Cl",   evidence:["ms_cl","ms_cl2"] },
    { id: "bromo",     fa: "برم",         en: "-Br",         atoms:{Br:1},         slots:1, ihd:0, kind:"terminal", display:"Br",   evidence:["ms_br","ms_br2"] },

    // --- لینکرهای آلیفاتیک برای پرکردن اسکلت ---
    { id: "ch2",       fa: "متیلن",       en: "-CH₂-",       atoms:{C:1,H:2},      slots:2, ihd:0, kind:"linker",   display:"CH₂",  evidence:["dept_ch2"] },
    { id: "ch",        fa: "متین",        en: ">CH-",        atoms:{C:1,H:1},      slots:3, ihd:0, kind:"branch",   display:"CH",   evidence:["dept_ch"] },
    { id: "vinyl",     fa: "وینیل",       en: "-CH=CH₂",     atoms:{C:2,H:3},      slots:1, ihd:1, kind:"terminal", display:"CH=CH₂",evidence:["h_vinyl"] },

    /* پیوندِ دوگانهٔ *درونی*. تا پیش از این تنها بلوکِ آلکنی «vinyl» بود
       که فقط یک نقطهٔ اتصال دارد، یعنی صرفاً –CH=CH₂ انتهایی. هر آلکنِ
       درونی — سینامالدهید، مزیتیل اکسید، سیکلوهگزنون، مالئیک/فوماریک —
       ناچار با ch/ch₂ نوشته می‌شد و اسکلتِ سرِهم‌شده اشباع درمی‌آمد: فرمول
       درست، ساختار غلط. این چهار بلوک همان شکافند، به تفکیکِ درجهٔ استخلاف. */
    { id: "alkene_ch_ch", fa: "آلکن درونی (۱،۲-دواستخلافی)", en: "-CH=CH-", atoms:{C:2,H:2}, slots:2, ihd:1, kind:"linker", display:"CH=CH", evidence:["h_vinyl"] },
    { id: "alkene_c_ch",  fa: "آلکن سه‌استخلافی", en: ">C=CH-",  atoms:{C:2,H:1}, slots:3, ihd:1, kind:"branch", display:"C=CH",  evidence:["h_vinyl"] },
    { id: "alkene_c_c",   fa: "آلکن چهاراستخلافی", en: ">C=C<",  atoms:{C:2},     slots:4, ihd:1, kind:"branch", display:"C=C",   evidence:[] },
    { id: "alkene_c_ch2", fa: "آلکن انتهایی دواستخلافی", en: ">C=CH₂", atoms:{C:2,H:2}, slots:2, ihd:1, kind:"branch", display:"C=CH₂", evidence:["h_vinyl"] },

    /* پایانهٔ هیدروژن. بعضی ترکیب‌ها *خودشان* یک بلوک‌اند — نفتالن، کینولین —
       و زنجیرهٔ تک‌بلوکی‌شان نقطهٔ اتصالِ پُرنشده داشت، پس هیچ گرافِ معتبری
       نداشت و ماژولِ تقارن ساکت می‌ماند. این بلوک همان نقطه را می‌بندد. */
    { id: "h",         fa: "هیدروژن (پایانه)", en: "-H",     atoms:{H:1},     slots:1, ihd:0, kind:"terminal", display:"H",     evidence:[] },

    // --- افزوده‌های نسخه ۳: فلوئور، استوکسی، هترو-آروماتیک ---
    { id: "cf3",       fa: "تری‌فلوئورومتیل", en: "-CF₃",     atoms:{C:1,F:3},      slots:1, ihd:0, kind:"terminal", display:"CF₃",  evidence:["ir_cf"] },
    { id: "acetoxy",   fa: "استوکسی (استر روی آروماتیک)", en:"-OCOCH₃", atoms:{C:2,H:3,O:2}, slots:1, ihd:1, kind:"terminal", display:"OAc", evidence:["ir_co_ester","wet_hydroxamic_pos"] },
    { id: "pyridin_3yl", fa:"پیریدین-۳-ایل (بتا)", en:"-C₅H₄N", atoms:{C:5,H:4,N:1}, slots:1, ihd:4, kind:"terminal",
      display:"Py", evidence:["h_heteroarom_alpha","ir_cn_ring"] },
    { id: "furan_2yl", fa: "فوران-۲-ایل", en: "-C₄H₃O",       atoms:{C:4,H:3,O:1},  slots:1, ihd:3, kind:"terminal", display:"Fur",  evidence:[] }
  ],

  /* ------------------------------------------------------------------
     ۲۲. جداول پیش‌بینی محیط‌های NMR بر پایهٔ بلوک — برای ماژول تقارن
     هر بلوک، تعداد محیط شیمیایی داخلیِ خودش را (وقتی در دو انتهای زنجیره
     غیرمتقارن قرار گیرد) گزارش می‌کند. این پیش‌بینی بر پایهٔ «شمارش
     محیط داخلی بلوک»، نه گراف اتمی کامل مولکول است — برای بلوک‌های
     استاندارد (فنیل، اتیل، ترت-بوتیل...) در برابر طیف واقعی صحت‌سنجی
     شده (اتیل‌بنزن=۶، ۳-پنتانون=۳، دی‌اتیل مالونات=۴، ۱و۲-دی‌برمواتان=۱)
     اما برای بلوک‌های ترکیبی جدید (پیریدین، فوران) تخمینی است.
     ------------------------------------------------------------------ */
  blockCarbonEnvCount: {
    methyl:1, ethyl:2, isopropyl:2, tbutyl:2, npropyl:3,
    phenyl:4, benzyl:5, phenylene_p:4, tolyl_p:5,
    pyridin_3yl:5, furan_2yl:4, cf3:1, acetoxy:2,
    // متا-فنیلن با دو استخلافِ متفاوت شش کربنِ متمایز دارد نه چهار،
    // و نفتیلِ تک‌استخلافی ده تا نه هفت. هر دو با شمارشِ گرافِ اتمیِ
    // همین بلوک‌ها سنجیده شده‌اند (بررسیِ خودکار در validate-database).
    phenylene_m:6, naphthyl:10,
    ketone:1, aldehyde:1, cooh:1, ester_co:1, amide:1, acyl:2,
    hydroxyl:0, methoxy:1, ether_o:0, amine1:0,
    nitrile:1, nitro:0, chloro:0, bromo:0, ch2:1, ch:1, vinyl:2
  },
  // تعداد «سیگنال قابل‌مشاهدهٔ» پروتون (نه لزوماً تعداد محیط شیمیایی دقیق؛
  // مثلاً فنیل تک‌استخلافی معمولاً یک مولتی‌پلت ۵H گزارش می‌شود، نه ۳ جدا)
  blockProtonEnvCount: {
    methyl:1, ethyl:2, isopropyl:2, tbutyl:1, npropyl:3,
    phenyl:1, benzyl:2, phenylene_p:2, tolyl_p:2,
    pyridin_3yl:4, furan_2yl:3, cf3:0, acetoxy:1,
    ketone:0, aldehyde:1, cooh:1, ester_co:0, amide:1, acyl:1,
    hydroxyl:1, methoxy:1, ether_o:0, amine1:1,
    nitrile:0, nitro:0, chloro:0, bromo:0, ch2:1, ch:1, vinyl:2
  },

  /* ------------------------------------------------------------------
     ۲۲-الف-۲. ساختارِ اتمیِ هر بلوک — Block → Atom-level template
     ------------------------------------------------------------------
     چرا این جدول اضافه شد: دو جدولِ بالا «تعدادِ محیط» را بلوک‌به‌بلوک
     می‌شمارند و جمع می‌زنند. این کار ذاتاً نمی‌تواند درست باشد، چون
     تقارن خاصیتِ کلِ مولکول است، نه جمعِ خاصیتِ قطعه‌ها: دو متیلِ
     پارا-زایلن با هم یک محیط‌اند ولی در اورتو-زایلن هم — و هیچ جمعِ
     بلوکی این را نمی‌بیند. سنجشِ عددی هم همین را گفت: predictSymmetry
     فقط ۳۶٪ دقیق بود و در ۶۳ ترکیب از ۱۶۴ کم‌تر از واقعیت می‌گفت.

     پس هر بلوک ساختارِ اتمیِ خودش را اعلام می‌کند و موتور مولکول را
     واقعاً سرِهم می‌کند، بعد تقارن را روی گرافِ اتمی می‌شمارد
     (Structure.refineClasses — همان موتوری که با RDKit راستی‌آزمایی
     شده و در tools/test-structure.js قفل است).

       smiles   ساختارِ خودِ قطعه، به SMILES
       attach   اندیسِ اتمی که هر «اسلات» از آن‌جا به بقیهٔ مولکول
                وصل می‌شود — به ترتیبِ اسلات‌ها. اندیس‌ها به ترتیبِ
                ظاهرشدنِ اتم‌ها در همان SMILES است.

     نکته‌ها:
       • طولِ attach باید دقیقاً برابرِ slots همان بلوک باشد؛
         validate-database.js همین را می‌سنجد.
       • ترتیبِ attach معنا دارد. در ester_co اسلاتِ اول کربنِ
         کربونیل است و اسلاتِ دوم اکسیژنِ استری، پس زنجیرهٔ
         [phenyl, ester_co, ethyl] «اتیل بنزوات» خوانده می‌شود نه
         «فنیل پروپانوات» — همان قراردادی که chain با آن نوشته شده.
       • benzene_tri و benzene_tetra عمداً قالب ندارند: الگوی
         استخلافشان اعلام‌نشده است و حدس‌زدنش تقارن را عوض می‌کند.
         نبودِ قالب یعنی موتور پیش‌بینی نمی‌کند — که بهتر از
         پیش‌بینیِ غلط است. برای همین نسخه‌های موقعیت‌دار
         (benzene_123/124/135/…) وجود دارند.
     ------------------------------------------------------------------ */
  blockStructures: {
    // --- آلکیل ---
    methyl:     { smiles: "C",            attach: [0] },
    ethyl:      { smiles: "CC",           attach: [0] },
    isopropyl:  { smiles: "C(C)C",        attach: [0] },
    tbutyl:     { smiles: "C(C)(C)C",     attach: [0] },
    npropyl:    { smiles: "CCC",          attach: [0] },
    ch2:        { smiles: "C",            attach: [0, 0] },
    ch:         { smiles: "C",            attach: [0, 0, 0] },
    cq:         { smiles: "C",            attach: [0, 0, 0, 0] },
    vinyl:      { smiles: "C=C",          attach: [0] },
    // هر چهار آلکنِ درونی یک SMILES دارند و فقط شمارِ نقطه‌های اتصال روی
    // دو کربنِ sp² فرق می‌کند — همان الگویی که حلقهٔ بنزن دارد.
    alkene_ch_ch:  { smiles: "C=C",       attach: [0, 1] },
    alkene_c_ch:   { smiles: "C=C",       attach: [0, 0, 1] },
    alkene_c_c:    { smiles: "C=C",       attach: [0, 0, 1, 1] },
    alkene_c_ch2:  { smiles: "C=C",       attach: [0, 0] },
    h:          { smiles: "[H]",          attach: [0] },
    alkyne_internal: { smiles: "C#C",     attach: [0, 1] },
    cf3:        { smiles: "C(F)(F)F",     attach: [0] },

    // --- آروماتیک ---
    // حلقهٔ بنزن همیشه "c1ccccc1" است و فقط جای اتصال‌ها فرق می‌کند:
    // ۰ و ۱ اورتو، ۰ و ۲ متا، ۰ و ۳ پارا.
    phenyl:        { smiles: "c1ccccc1",  attach: [0] },
    phenylene_p:   { smiles: "c1ccccc1",  attach: [0, 3] },
    phenylene_m:   { smiles: "c1ccccc1",  attach: [0, 2] },
    benzene_123:   { smiles: "c1ccccc1",  attach: [0, 1, 2] },
    benzene_124:   { smiles: "c1ccccc1",  attach: [0, 1, 3] },
    benzene_135:   { smiles: "c1ccccc1",  attach: [0, 2, 4] },
    benzene_1234:  { smiles: "c1ccccc1",  attach: [0, 1, 2, 3] },
    benzene_1235:  { smiles: "c1ccccc1",  attach: [0, 1, 2, 4] },
    benzene_1245:  { smiles: "c1ccccc1",  attach: [0, 1, 3, 4] },
    benzene_penta: { smiles: "c1ccccc1",  attach: [0, 1, 2, 3, 4] },
    benzene_hexa:  { smiles: "c1ccccc1",  attach: [0, 1, 2, 3, 4, 5] },
    benzyl:        { smiles: "Cc1ccccc1", attach: [0] },
    tolyl_p:       { smiles: "Cc1ccccc1", attach: [4] },   // پارا نسبت به متیل
    naphthyl:      { smiles: "c1ccc2ccccc2c1",   attach: [0] },
    quinolinyl:    { smiles: "c1ccc2ncccc2c1",   attach: [0] },
    pyridin_3yl:   { smiles: "c1ccncc1",  attach: [1] },   // متا نسبت به نیتروژن
    furan_2yl:     { smiles: "c1ccoc1",   attach: [4] },   // مجاورِ اکسیژن

    // --- کربونیل و مشتقات ---
    ketone:       { smiles: "C=O",        attach: [0, 0] },
    fluorenyl_co: { smiles: "C=O",        attach: [0, 0] },
    aldehyde:     { smiles: "C=O",        attach: [0] },
    cooh:         { smiles: "C(=O)O",     attach: [0] },
    ester_co:     { smiles: "C(=O)O",     attach: [0, 2] },  // کربونیل، سپس اکسیژن
    amide:        { smiles: "C(=O)N",     attach: [0] },
    amide_n:      { smiles: "C(=O)N",     attach: [0, 2] },
    acyl:         { smiles: "C(=O)C",     attach: [0] },
    acetoxy:      { smiles: "OC(=O)C",    attach: [0] },
    formate:      { smiles: "OC=O",       attach: [0] },

    // --- اکسیژن‌دار و نیتروژن‌دار ---
    hydroxyl:        { smiles: "O",       attach: [0] },
    methoxy:         { smiles: "OC",      attach: [0] },
    ether_o:         { smiles: "O",       attach: [0, 0] },
    methylenedioxy:  { smiles: "OCO",     attach: [0, 2] },
    epoxide:         { smiles: "C1CO1",   attach: [0] },
    amine1:          { smiles: "N",       attach: [0] },
    amine3:          { smiles: "N",       attach: [0, 0, 0] },
    amine3_dimethyl: { smiles: "N(C)C",   attach: [0] },
    nitrile:         { smiles: "C#N",     attach: [0] },
    nitro:           { smiles: "[N+](=O)[O-]", attach: [0] },

    // --- گوگردی ---
    thiol:       { smiles: "S",           attach: [0] },
    thioether:   { smiles: "S",           attach: [0, 0] },
    sulfoxide:   { smiles: "S=O",         attach: [0, 0] },
    sulfonamide: { smiles: "S(=O)(=O)N",  attach: [0] },
    sulfonate:   { smiles: "S(=O)(=O)O",  attach: [0, 3] },

    // --- هالوژن ---
    chloro: { smiles: "Cl", attach: [0] },
    bromo:  { smiles: "Br", attach: [0] }
  },

  /* ------------------------------------------------------------------
     ۲۲-ب. شواهد ضمنیِ هر بلوک — Block → Implied Evidence
     مشکلی که این جدول حل می‌کند: امضای مراجع فقط تیک‌های «تشخیصی» را
     فهرست می‌کرد (ms_91، ir_co_ester، …) و هیچ‌کدام به ناحیه‌های پایهٔ
     ¹H/¹³C اشاره نمی‌کرد. نتیجه این بود که دانشجو بدیهی‌ترین تیک‌های صفحه
     («پروتون آروماتیک ۶.۵–۸.۵»، «کربن آلیفاتیک ۰–۵۰») را می‌زد و موتور
     هیچ امتیازی نمی‌داد — ۵۰ تگ در UI عملاً بی‌اثر بود.
     اینجا برای هر بلوک تنها تگ‌هایی فهرست شده که «مستقل از همسایه‌ها»
     درست‌اند (نه تگ‌هایی که به موقعیت بستگی دارند)؛ h_alpha جداگانه و
     بر پایهٔ مجاورت در زنجیره استنتاج می‌شود.
     این شواهد امتیاز «تشویقی» می‌گیرند و مخرجِ امضا را بزرگ نمی‌کنند،
     وگرنه نزدنِ یک تیک بدیهی امتیاز مرجع درست را پایین می‌آورد.
     ------------------------------------------------------------------ */
  blockImpliedEvidence: {
    // آلکیل: کربن ۰–۵۰ همیشه؛ پروتون ۰.۹–۱.۵ فقط برای بلوک‌هایی که
    // دست‌کم یک متیل/متیلن دورافتاده از گروه کشنده دارند
    methyl:      ["c_alkyl", "h_alkyl"],
    ethyl:       ["c_alkyl", "h_alkyl"],
    npropyl:     ["c_alkyl", "h_alkyl"],
    isopropyl:   ["c_alkyl", "h_alkyl"],
    tbutyl:      ["c_alkyl", "h_alkyl", "ir_gem_dimethyl"],
    ch2:         ["c_alkyl"],
    ch:          ["c_alkyl"],
    acyl:        ["c_alkyl", "c_ketone", "ir_co_ketone"],

    // آروماتیک و هترو-آروماتیک: حلقه همیشه پروتون ۶.۵–۸.۵، کربن sp²
    // و اسکلت «پاهای فیل» ۱۴۵۰–۱۶۰۰ می‌دهد
    phenyl:      ["h_ar", "c_sp2", "ir_aromatic"],
    benzyl:      ["h_ar", "c_sp2", "ir_aromatic", "c_alkyl"],
    phenylene_p: ["h_ar", "c_sp2", "ir_aromatic"],
    phenylene_o: ["h_ar", "c_sp2", "ir_aromatic"],
    phenylene_m: ["h_ar", "c_sp2", "ir_aromatic"],
    tolyl_p:     ["h_ar", "c_sp2", "ir_aromatic", "c_alkyl", "h_alkyl"],
    pyridin_3yl: ["h_ar", "c_sp2", "ir_aromatic"],
    furan_2yl:   ["h_ar", "c_sp2", "ir_aromatic"],

    // کربونیل‌ها: تفکیک ۱۹۰–۲۲۰ (بدون رزونانس هترواتم) از ۱۵۰–۱۸۵ (رزونانسی)
    ketone:      ["c_ketone"],
    aldehyde:    ["c_ketone"],
    cooh:        ["c_ester"],
    ester_co:    ["c_ester", "ir_co_single"],
    amide:       ["c_ester"],
    amide_n:     ["c_ester"],
    acetoxy:     ["c_ester", "ir_co_single", "c_alkyl"],

    // هترواتم‌دار: کششِ C–O در ۱۰۰۰–۱۳۰۰ برای هر اتصال اکسیژن قطعی است
    hydroxyl:    ["ir_co_single"],
    methoxy:     ["ir_co_single", "h_hetero", "c_hetero"],
    ether_o:     ["ir_co_single", "c_hetero"],
    amine1:      [],
    // کربن نیتریل ۱۱۰–۱۲۵ در بازهٔ c_sp2 (۱۰۰–۱۵۰) می‌افتد
    nitrile:     ["c_sp2"],
    nitro:       [],
    cf3:         ["c_cf_quartet"],

    // غیراشباع
    vinyl:       ["h_vinyl", "c_sp2"],

    halide_placeholder: []
  },

  /* شواهد ضمنیِ برخاسته از فرمول مولکولی (نه از بلوک):
     تست ذوب سدیم (لاسِن) یک تست عنصری مستقیم است، پس حضور هر عنصر در
     فرمول، نتیجهٔ مثبت آن تست را قطعی می‌کند. اثر اتم سنگین روی شیفت ¹³C
     هم برای ید همیشه قابل مشاهده است. */
  formulaImpliedEvidence: {
    N:  ["wet_elem_n"],
    S:  ["wet_elem_s", "wet_elem_s2"],
    Cl: ["wet_elem_cl"],
    Br: ["wet_elem_br"],
    I:  ["wet_elem_i", "c_heavy_i"]
  },

  /* بلوک‌هایی که «آلفای کربونیل» می‌سازند: اگر یکی از این‌ها در زنجیره
     مجاور یک بلوک کربونیل باشد، پروتون ۱.۵–۲.۵ (h_alpha) قطعی است. */
  alphaCapableBlocks: ["methyl", "ethyl", "npropyl", "isopropyl", "ch2", "ch", "benzyl"],
  carbonylBlocks: ["ketone", "aldehyde", "cooh", "ester_co", "amide", "acyl", "acetoxy"],

  /* ------------------------------------------------------------------
     ۳. پایگاه IR — کربونیل با اصلاح‌گرها + گروه‌های عاملی + تله‌ها
     ------------------------------------------------------------------ */
  ir: {
    carbonylBase: {
      ketone:    { freq:1715, fa:"کتون آلیفاتیک" },
      aldehyde:  { freq:1725, fa:"آلدهید آلیفاتیک" },
      ester:     { freq:1735, fa:"استر آلیفاتیک" },
      acid:      { freq:1710, fa:"کربوکسیلیک اسید" },
      amide:     { freq:1650, fa:"آمید" },
      acidchlor: { freq:1800, fa:"کلرید اسید" },
      anhydride: { freq:1810, fa:"انیدرید (پیک بالا)" }
    },
    // اصلاح‌گرهای فرکانس کربونیل (cm⁻¹)
    modifiers: {
      conjugation: { delta:-30, fa:"مزدوج‌شدگی با C=C یا حلقه بنزن (رزونانس، کاهش خصلت دوگانه)" },
      hbond:       { delta:-20, fa:"پیوند هیدروژنی قوی (کشیدگی و تضعیف پیوند C=O)" },
      ring5:       { delta:+30, fa:"فشار حلقه ۵ عضوی (افزایش خصلت s خارج حلقه)" },
      ring4:       { delta:+65, fa:"فشار حلقه ۴ عضوی (کشش زاویه‌ای شدید)" }
    },
    regions: [
      { id:"ir_oh_acid",  range:"2500–3300", fa:"O–H اسید (هیولای پهن که C–H را می‌بلعد)", implies:"کربوکسیلیک اسید (دیمر)" },
      { id:"ir_oh_alc",   range:"3200–3600", fa:"O–H الکل/فنول (پهن و زنگوله‌ای)",       implies:"الکل یا فنول" },
      { id:"ir_nh",       range:"3300–3500", fa:"N–H (۱ دندانه=۲°، ۲ دندانه=۱°)",        implies:"آمین یا آمید" },
      { id:"ir_alkyne_h", range:"~3300",     fa:"≡C–H تیز و خنجری",                       implies:"آلکین انتهایی" },
      { id:"ir_aldehyde", range:"2720,2820", fa:"دو شاخک فرمیل (رزونانس فرمی)",           implies:"آلدهید (قطعی)" },
      { id:"ir_triple_cn",range:"~2250",     fa:"C≡N تیز و قوی",                          implies:"نیتریل" },
      { id:"ir_triple_cc",range:"~2150",     fa:"C≡C ضعیف (در آلکین متقارن نامرئی)",      implies:"آلکین" },
      { id:"ir_nitro",    range:"1350,1550", fa:"دو پیک قوی نامتقارن/متقارن",             implies:"گروه نیترو" },
      { id:"ir_aromatic", range:"1450,1600", fa:"پاهای فیل (اسکلت C=C آروماتیک)",          implies:"حلقه بنزن" },
      { id:"ir_oop_trans",range:"~960",      fa:"خمش OOP",                                implies:"آلکن ترانس" },
      { id:"ir_oop_cis",  range:"675–730",   fa:"خمش OOP",                                implies:"آلکن سیس" },
      { id:"ir_mono",     range:"690,730-770",fa:"دو پیک خمش OOP",                        implies:"بنزن تک‌استخلافی" },
      { id:"ir_para",     range:"800–840",   fa:"یک پیک قوی خمش OOP",                     implies:"بنزن پارا-دواستخلافی" },
      { id:"ir_co_single",range:"1000–1300", fa:"C–O کششی قوی",                          implies:"استر/اتر/الکل" }
    ]
  },

  /* ------------------------------------------------------------------
     ۴. پایگاه ¹³C — نواحی شیفت و قواعد DEPT
     ------------------------------------------------------------------ */
  c13: {
    regions: [
      { id:"c_ketone", range:"190–220", fa:"کربونیل کتون/آلدهید (بدون رزونانس هترواتم)" },
      { id:"c_ester",  range:"150–185", fa:"کربونیل استر/اسید/آمید/انیدرید (رزونانسی)" },
      { id:"c_sp2",    range:"100–150", fa:"کربن‌های sp² آروماتیک/آلکنی — و کربن نیتریل (۱۱۰–۱۲۵)" },
      { id:"c_alkyne", range:"65–90",   fa:"کربن‌های sp آلکینی (شیفت به راست به‌خاطر آنیزوتروپی)" },
      { id:"c_hetero", range:"50–90",   fa:"کربن sp³ متصل به O/N/X" },
      { id:"c_alkyl",  range:"0–50",    fa:"کربن‌های آلیفاتیک ساده" }
    ],
    deptRules: {
      "DEPT-135": "CH و CH₃ رو به بالا (+)، CH₂ رو به پایین (−)، Cq محو",
      "DEPT-90":  "فقط CH ظاهر می‌شود",
      normal:     "همه به‌صورت سینگلت (واجفت‌شده از پروتون)"
    }
  },

  /* ------------------------------------------------------------------
     ۵. پایگاه ¹H — نواحی شیفت، ثابت کوپلاژ، الگوهای طلایی
     ------------------------------------------------------------------ */
  h1: {
    regions: [
      { id:"h_acid",   range:"10–13",   fa:"کربوکسیلیک اسید یا انول کلاته (پهن)" },
      { id:"h_ald",    range:"9–10",    fa:"پروتون آلدهیدی (تیز)" },
      { id:"h_ar",     range:"6.5–8.5", fa:"پروتون آروماتیک" },
      { id:"h_vinyl",  range:"4.5–6.5", fa:"پروتون وینیلی" },
      { id:"h_hetero", range:"3.0–4.5", fa:"متصل به کربنِ حاملِ O/N/X (متوکسی ~3.8)" },
      { id:"h_alpha",  range:"1.5–2.5", fa:"آلفای کربونیل/آلیلی/بنزیلی" },
      { id:"h_alkyl",  range:"0.9–1.5", fa:"آلیفاتیک ساده" }
    ],
    coupling: {
      trans:   { j:"12–18 Hz", fa:"آلکن ترانس" },
      cis:     { j:"6–12 Hz",  fa:"آلکن سیس" },
      geminal: { j:"0–3 Hz",   fa:"ژمینال (روی یک کربن)" },
      ortho:   { j:"~8 Hz",    fa:"آروماتیک ارتو" },
      meta:    { j:"~2 Hz",    fa:"آروماتیک متا" }
    },
    goldenPatterns: [
      { id:"h_tbu",     fa:"سینگلت 9H در 0.9–1.2", block:"tbutyl" },
      { id:"h_iso",     fa:"دوتایی 6H + هفت‌تایی 1H", block:"isopropyl" },
      { id:"h_ethyl",   fa:"سه‌تایی 3H + چهارتایی 2H", block:"ethyl" },
      { id:"h_methyl",  fa:"سینگلت 3H", block:"methyl" },
      { id:"h_methoxy", fa:"سینگلت تیز 3H در ~3.8", block:"methoxy" },
      { id:"h_para",    fa:"دو دوتایی متقارن AA'BB' با اثر شیروانی", block:"phenylene_p" },
      { id:"h_ar_mono", fa:"مولتی‌پلت درهم 5H در ~7.2", block:"phenyl" },
      { id:"h_abcd",    fa:"سیستم ABCD چهارپروتونی نامتقارن (بنزن اورتو-دواستخلافی)", block:"phenylene_o" },
      { id:"h_ar_meta", fa:"الگوی ۱+۲+۱ با J متا کوچک (~2 Hz) — بنزن متا-دواستخلافی", block:"phenylene_m" },
      { id:"h_vinyl",   fa:"سیستم AMX سه‌گانه وینیلی", block:"vinyl" }
    ]
  },

  /* ------------------------------------------------------------------
     ۶. پایگاه طیف جرمی — ایزوتوپ‌ها، قطعات یونی، افت خنثی
     ------------------------------------------------------------------ */
  ms: {
    isotopes: {
      Cl: { ratio:"3:1",  fa:"یک اتم کلر (³⁷Cl)" },
      Br: { ratio:"1:1",  fa:"یک اتم برم (⁸¹Br)" },
      S:  { ratio:"~4.4%",fa:"گوگرد (³⁴S)" },
      C:  { ratio:"1.1%/C",fa:"هر اتم کربن ۱.۱٪ به M+1 اضافه می‌کند" }
    },
    fragments: {
      "91":  { id:"ms_91", ion:"C₇H₇⁺ تروپیلیوم", implies:"گروه بنزیل (PhCH₂–)", block:"benzyl" },
      "77":  { id:"ms_77", ion:"C₆H₅⁺ فنیل",       implies:"حلقه بنزن مستقیم",     block:"phenyl" },
      "105": { id:"ms_105",ion:"C₆H₅CO⁺ بنزویل",   implies:"آریل‌کتون/بنزوات",     block:null,
               alts:[{ id:"ms_105b", ion:"C₈H₉⁺ (M−CH₃ بنزیلی نوع دوم)", implies:"کربن بنزیلی با استخلاف اتیل/متیل مجاور — هم‌جرم با بنزویل، با IR و ¹³C تفکیک می‌شود" }] },
      "43":  { id:"ms_43", ion:"CH₃CO⁺ آسیلیوم",   implies:"متیل‌کتون یا ایزوپروپیل", block:"acyl" },
      "30":  { id:"ms_30", ion:"CH₂=NH₂⁺ ایمینیوم",implies:"آمین نوع اول آلیفاتیک", block:"amine1" },
      "31":  { id:"ms_31", ion:"CH₂=OH⁺",           implies:"الکل نوع اول",         block:"hydroxyl" },
      "60":  { id:"ms_60", ion:"انول مک‌لافرتی",    implies:"کربوکسیلیک اسید خطی",  block:null },
      "74":  { id:"ms_74", ion:"انول مک‌لافرتی",    implies:"متیل استر",           block:null },
      "57":  { id:"ms_57", ion:"C₄H₉⁺ بوتیل یا C₂H₅CO⁺ پروپیونیل", implies:"قطعه آلیفاتیک ۴ کربنه یا آسیلیوم ثانویه", block:null },
      "127": { id:"ms_127",ion:"I⁺",                implies:"حضور اتم ید در ساختار",  block:null },
      "29":  { id:"ms_29", ion:"CHO⁺ یا C₂H₅⁺",     implies:"آلدهید (فرمیل) یا قطعه اتیل", block:null },
      "45":  { id:"ms_45", ion:"COOH⁺ / CH₃CHOH⁺ / C₂H₅O⁺", implies:"کربوکسیلیک اسید، الکل نوع دوم، یا اتر", block:null },
      "59":  { id:"ms_59", ion:"(CH₃)₂COH⁺ / C₃H₇O⁺", implies:"الکل ۲°/۳° (مثل ایزوپروپانول/پیناکول) یا استر متیلی", block:null },
      "56":  { id:"ms_56", ion:"C₃H₄O⁺· / C₄H₈⁺·",  implies:"خروج CO از حلقه یا کاتیون‌رادیکال آلکن", block:null },
      "92":  { id:"ms_92", ion:"C₇H₈⁺· (تولوئن) / آلکیل‌بنزن", implies:"حلقه بنزن با یک کربن جانبی اضافه", block:null },
      "104": { id:"ms_104",ion:"C₈H₈⁺· استایرن",    implies:"فنیل‌اتیل (خروج آب/HX از ۲-فنیل‌اتانول یا استایرن‌ساز)", block:null },
      "79":  { id:"ms_79", ion:"⁷⁹Br⁺ / C₆H₇⁺",     implies:"اتم برم یا قطعه حلقوی هیدروژنه", block:null },
      "107": { id:"ms_107",ion:"C₇H₇O⁺ (M−15 بنزیلیک)", implies:"الکل بنزیلی که متیل/H از دست داده", block:null },
      "40":  { id:"ms_40", ion:"C₃H₄⁺· / CH₂CN",     implies:"قطعه پروپارژیل یا نیتریل کوچک", block:null },
      "44":  { id:"ms_44", ion:"CO₂⁺· / C₂H₆N⁺ / CH₂CHO⁺", implies:"دکربوکسیلاسیون اسید، آمین، یا استالدهید (اسید آمینه)", block:null },
      "53":  { id:"ms_53", ion:"C₄H₅⁺ / C₃HN",        implies:"قطعه دی‌ان یا نیتریل غیراشباع (سوکسینونیتریل)", block:null },
      "55":  { id:"ms_55", ion:"C₄H₇⁺ / C₃H₃O⁺",      implies:"کاتیون آلیل‌کربینیل یا آسیلیوم غیراشباع", block:null,
               alts:[{ id:"ms_55b", ion:"آکریلوئیل کاتیون CH₂=CHCO⁺", implies:"آلدهید/کتون α,β-غیراشباع" }] },
      "58":  { id:"ms_58", ion:"C₃H₆O⁺· (انول استون)", implies:"مک‌لافرتی متیل‌کتون یا استون", block:null },
      "68":  { id:"ms_68", ion:"C₄H₄O⁺· / C₃H₂N₂",    implies:"قطعه حلقوی اکسیژن‌دار یا نیتریل", block:null,
               alts:[{ id:"ms_68b", ion:"C₃H₆Br⁺ حلقوی یا C₄H₄N⁺", implies:"باقیمانده پس از خروج Br از بروموبوتیرونیتریل" }] },
      "78":  { id:"ms_78", ion:"C₆H₆⁺· بنزن",         implies:"حلقه بنزن (اغلب از فنول/آنیزول با خروج CO)", block:null },
      "93":  { id:"ms_93", ion:"C₆H₅O⁺ / C₆H₇N⁺",     implies:"فنوکسی یا آنیلینیوم", block:null },
      /* --- افزوده‌های نسخه ۳: قطعات ویژه ترکیبات فلوئوردار/هترو-آروماتیک/مزدوج --- */
      "41":  { id:"ms_41",  ion:"C₃H₅⁺ کاتیون آلیلی / CH₂CN⁺", implies:"شکست آلیلیک یا زنجیرهٔ پروپیل/بوتیل (توالی ۲۷/۲۹/۴۱/۴۳)؛ در نیتریل‌های زنجیره‌دار و ترپن‌ها فراوان", block:null },
      "54":  { id:"ms_54",  ion:"CH₂=CH-CN⁺· آکریلونیتریل رادیکال‌کاتیون", implies:"دی‌نیتریل یا نیتریل زنجیره‌دار با γ-هیدروژن که مک‌لافرتی‌مانند حذف می‌کند", block:null },
      "73":  { id:"ms_73b", ion:"C₄H₉O⁺ (M−C₂H₅ اتری)", implies:"شکست آلفای اتر با خروج اتیل؛ در اترهای حلقوی (۲-متیل‌تتراهیدروفوران) و اترهای خطی بوتیل/اتیل", block:null },
      "81":  { id:"ms_81",  ion:"C₅H₅O⁺ / C₆H₉⁺", implies:"خروج بوتیل یا قطعهٔ دی‌ان‌آلدهیدی", block:null },
      "94":  { id:"ms_94",  ion:"C₆H₆O⁺· (فنول)", implies:"بازآرایی فنوکسی‌آلکیل با خروج اتیلن؛ نشان‌دهندهٔ Ar-O-CH₂CH₂-X نه Ar-CH₂-O-", block:null },
      "95":  { id:"ms_95",  ion:"C₅H₇O₂⁺ (M−OEt)", implies:"خروج اتوکسی از استر مزدوج دی‌ان", block:null },
      "106": { id:"ms_106", ion:"C₅H₄NO₂⁺ (M−OEt پیریدینی)", implies:"استر اتیلی حلقهٔ پیریدین", block:null },
      "119": { id:"ms_119", ion:"C₉H₁₁⁺ (M−CH₃ از ترت-بوتیل بنزیلی)", implies:"کربن بنزیلی نوع سوم (ترت-بوتیل روی حلقه)", block:null },
      "121": { id:"ms_121", ion:"C₇H₅O₃⁺ (M−CH₂=C=O آسپیرینی)", implies:"استر فنولی که کتن حذف کرده (مثل آسپیرین)", block:null },
      "131": { id:"ms_131", ion:"C₉H₇O⁺ (سینامویل، M−H)", implies:"آلدهید α,β-غیراشباع آروماتیک (سینامالدهید)", block:null },
      "133": { id:"ms_133", ion:"C₈H₉O⁺ (M−CH₃ آنیزوئیک)", implies:"آنیزیک اسید یا مشابه با خروج متیل از OMe", block:null },
      "135": { id:"ms_135", ion:"C₉H₇O⁺ (M−OH آنیزآلدهیدی)", implies:"آلدهید آروماتیک متوکسی‌دار با خروج OH", block:null },
      "138": { id:"ms_138", ion:"M−CH₂=C=O (خروج کتن)", implies:"استر فنولی (آریل‌استر) با شکست کتن، رایج در آسپرین‌مانندها", block:null }
    },
    losses: {
      "15": "خروج CH₃• (متیل — انشعاب)",
      "18": "خروج H₂O (الکل)",
      "28": "خروج CO یا C₂H₄ (مک‌لافرتی/RDA)",
      "29": "خروج CHO• یا C₂H₅•",
      "31": "خروج OCH₃• (متیل استر/اتر)",
      "42": "خروج کتن CH₂=C=O",
      "45": "خروج COOH•/OC₂H₅•"
    }
  },

  /* ------------------------------------------------------------------
     ۷. مولکول‌های مرجع — برای تطبیق الگو و نام‌گذاری نهایی
     هر مولکول: امضای طیفی (کلیدهای evidence) + ساختار برای رسم
     structure: نمایش خطی برای رندر شماتیک بلوکی
     ------------------------------------------------------------------ */
  reference: [
    { name:"اتیل استات",       en:"Ethyl acetate",     formula:"C4H8O2",  ihd:1,
      signature:["ir_co_ester","c_ester","h_ethyl","h_hetero"],
      chain:["methyl","ester_co","ethyl"], note:"کوارتت اتیل دی‌شیلد در ~4.1 ppm" },
    { name:"استوفنون",         en:"Acetophenone",      formula:"C8H8O",   ihd:5,
      signature:["ir_co_ketone","c_ketone","ms_105","ms_77","ms_43","h_ar_mono","wet_dnp_pos"],
      chain:["phenyl","ketone","methyl"], note:"کربونیل مزدوج ~1685؛ پیک 105 و 77؛ ۲،۴-DNP مثبت، تولنس منفی (کتون)" },
    { name:"بنزآلدهید",        en:"Benzaldehyde",      formula:"C7H6O",   ihd:5,
      signature:["ir_aldehyde","h_ald","ms_77","h_ar_mono","c_ketone","wet_tollens_pos","wet_dnp_pos"],
      chain:["phenyl","aldehyde"], note:"H آلدهیدی ~9.9؛ پیک 105→77؛ تولنس مثبت (آینه نقره) اما فهلینگ منفی (آروماتیک)" },
    { name:"بنزوئیک اسید",     en:"Benzoic acid",      formula:"C7H6O2",  ihd:5,
      signature:["ir_oh_acid","h_acid","ms_77","h_ar_mono","c_ester","wet_sol_a1"],
      chain:["phenyl","cooh"], note:"O–H هیولا؛ پیک 122→105→77؛ محلول در NaHCO₃ (کلاس A1)" },
    { name:"تولوئن",           en:"Toluene",           formula:"C7H8",    ihd:4,
      signature:["ms_91","h_ar_mono","ir_mono"],
      chain:["phenyl","methyl"], note:"پیک پایه 91 (تروپیلیوم)" },
    { name:"بنزیل کلراید",     en:"Benzyl chloride",   formula:"C7H7Cl",  ihd:4,
      signature:["ms_91","ms_cl","h_ar_mono"],
      chain:["benzyl","chloro"], note:"91 + الگوی ایزوتوپی 3:1" },
    { name:"پارا-نیتروتولوئن", en:"p-Nitrotoluene",    formula:"C7H7NO2", ihd:5,
      signature:["ir_nitro","ir_para","h_para","ms_91"],
      chain:["tolyl_p","nitro"], note:"AA'BB' + دو پیک نیترو" },
    { name:"اتانول",           en:"Ethanol",           formula:"C2H6O",   ihd:0,
      signature:["ir_oh_alc","h_d2o","h_ethyl","ms_31","wet_lucas_any"],
      chain:["ethyl","hydroxyl"], note:"OH تبادلی با D₂O؛ پیک 31؛ لوکاس کند (الکل نوع اول)" },
    { name:"استون",            en:"Acetone",           formula:"C3H6O",   ihd:1,
      signature:["ir_co_ketone","c_ketone","ms_43","h_methyl","wet_dnp_pos"],
      chain:["methyl","ketone","methyl"], note:"کتون ساده؛ پیک 43؛ ۲،۴-DNP مثبت، تولنس منفی" },
    { name:"4-نیتروآنیزول",    en:"4-Nitroanisole",    formula:"C7H7NO3", ihd:5,
      signature:["ir_nitro","ir_para","h_para","h_methoxy"],
      chain:["methoxy","phenylene_p","nitro"], note:"متوکسی سینگلت 3H + AA'BB'" },
    { name:"استالدهید",        en:"Acetaldehyde",      formula:"C2H4O",   ihd:1,
      signature:["ir_aldehyde","h_ald","c_ketone","h_methyl"],
      chain:["methyl","aldehyde"], note:"H آلدهیدی چهارتایی با J کوچک" },
    { name:"بنزونیتریل",       en:"Benzonitrile",      formula:"C7H5N",   ihd:6,
      signature:["ir_triple_cn","h_ar_mono","ms_77"],
      chain:["phenyl","nitrile"], note:"C≡N تیز ~2230؛ M فرد (قاعده نیتروژن)" },
    { name:"متیل بنزوات",      en:"Methyl benzoate",   formula:"C8H8O2",  ihd:5,
      signature:["ir_co_ester","c_ester","ms_105","ms_77","h_methoxy"],
      chain:["phenyl","ester_co","methyl"], note:"متوکسی سینگلت + پیک 105/77" },
    { name:"فنول",             en:"Phenol",            formula:"C6H6O",   ihd:4,
      signature:["ir_oh_alc","h_d2o","h_ar_mono","wet_fecl3_pos","wet_sol_a2"],
      chain:["phenyl","hydroxyl"], note:"O–H فنولی؛ FeCl₃ بنفش (کلاس A2، محلول در NaOH نه NaHCO₃)" },
    { name:"آنیلین",           en:"Aniline",           formula:"C6H7N",   ihd:4,
      signature:["ir_nh","h_ar_mono","wet_sol_b","wet_hinsberg_1","wet_hno2_1"],
      chain:["phenyl","amine1"], note:"آمین آروماتیک نوع اول؛ محلول در HCl (کلاس B)؛ هینزبرگ نوع اول؛ با HNO₂ نمک دیازونیوم پایدار" },

    /* --- افزوده‌های نسخه ۲: پوشش مسائل تمرینی طیف‌سنجی --- */
    { name:"بوتان-۲-اون (متیل‌اتیل‌کتون)", en:"Butan-2-one (MEK)", formula:"C4H8O", ihd:1,
      signature:["ir_co_ketone","c_ketone","ms_43","ms_29","wet_dnp_pos"],
      chain:["methyl","ketone","ethyl"], note:"کتون آلیفاتیک؛ IR ~۱۷۱۸؛ پیک ۴۳ (استیل) پایه؛ کوارتت/تریپلت اتیل" },
    { name:"پروپانوئیک اسید",   en:"Propanoic acid",    formula:"C3H6O2",  ihd:1,
      signature:["ir_oh_acid","h_acid","ms_45","ms_29","wet_sol_a1"],
      chain:["ethyl","cooh"], note:"IR ۳۵۰۰–۲۵۰۰ + ۱۷۱۵؛ H اسیدی ~۱۱ (تبادل D₂O)؛ پیک ۴۵ (COOH)" },
    { name:"متیل پروپانوات",    en:"Methyl propanoate", formula:"C4H8O2",  ihd:1,
      signature:["ir_co_ester","c_ester","ms_57","ms_29","wet_hydroxamic_pos"],
      chain:["ethyl","ester_co","methyl"], note:"استر؛ IR ~۱۷۴۴؛ پیک ۵۷ (پروپیونیل C₂H₅CO⁺)" },
    { name:"سیکلوپنتانون",      en:"Cyclopentanone",    formula:"C5H8O",   ihd:2,
      signature:["ir_co_ketone","c_ketone","wet_dnp_pos"],
      chain:["ketone"], note:"کتون حلقه ۵ عضوی؛ IR بالا ~۱۷۴۰ (کشش حلقه)؛ ¹³C کربونیل ~۲۲۰. ساختار حلقوی است و مونتاژ خطی آن را کامل نشان نمی‌دهد" },
    { name:"ایزوپروپانول",      en:"Propan-2-ol",       formula:"C3H8O",   ihd:0,
      signature:["ir_oh_alc","h_d2o","ms_45","wet_lucas_any","h_iso"],
      chain:["isopropyl","hydroxyl"], note:"الکل نوع دوم؛ IR ~۳۳۵۴؛ پیک ۴۵ (CH₃CHOH⁺)؛ سپتت CH + دوتایی ۶H" },
    { name:"۲-برموپروپان",      en:"2-Bromopropane",    formula:"C3H7Br",  ihd:0,
      signature:["ms_43","ms_br","h_iso"],
      chain:["isopropyl","bromo"], note:"هالید ثانویه؛ M ۱۲۲/۱۲۴؛ پیک ۴۳ (C₃H₇⁺)؛ سپتت CHBr ~۴.۳" },
    { name:"آنیزول",            en:"Anisole",           formula:"C7H8O",   ihd:4,
      signature:["h_methoxy","h_ar_mono","ir_co_single"],
      chain:["methoxy","phenyl"], note:"اتر آروماتیک؛ OCH₃ سینگلت ~۳.۸؛ ¹³C متوکسی ~۵۵؛ بدون OH" },
    { name:"الکل بنزیلیک",      en:"Benzyl alcohol",    formula:"C7H8O",   ihd:4,
      signature:["ir_oh_alc","h_d2o","ms_91","ms_79","ms_107","h_ar_mono"],
      chain:["benzyl","hydroxyl"], note:"CH₂OH بنزیلی ~۴.۶؛ پیک‌های ۱۰۸→۱۰۷→۷۹؛ ساختار ریز آروماتیک UV" },
    { name:"بنزیل برمید",       en:"Benzyl bromide",    formula:"C7H7Br",  ihd:4,
      signature:["ms_91","ms_br","h_ar_mono"],
      chain:["benzyl","bromo"], note:"پیک پایه ۹۱ (تروپیلیوم)؛ M ۱۷۰/۱۷۲؛ CH₂ ~۴.۴" },
    { name:"فنیل‌استونیتریل",   en:"Phenylacetonitrile",formula:"C8H7N",   ihd:6,
      signature:["ir_triple_cn","ms_91","ms_77","h_ar_mono"],
      chain:["benzyl","nitrile"], note:"C≡N ~۲۲۵۱؛ پیک ۹۱/۷۷؛ CH₂ ~۳.۷" },
    { name:"بنزیل‌آمین",        en:"Benzylamine",       formula:"C7H9N",   ihd:4,
      signature:["ir_nh","ms_91","h_ar_mono","wet_sol_b"],
      chain:["benzyl","amine1"], note:"NH₂ دو نوار (۳۳۷۳/۳۲۹۰)؛ پیک ۹۱/۱۰۶؛ CH₂ ~۳.۸؛ محلول در HCl" },
    { name:"فنیل‌استون",        en:"Phenylacetone",     formula:"C9H10O",  ihd:5,
      signature:["ir_co_ketone","c_ketone","ms_43","ms_91","wet_dnp_pos"],
      chain:["benzyl","ketone","methyl"], note:"IR ~۱۷۱۵؛ پیک ۴۳ (استیل) و ۹۱ (بنزیل)؛ CH₂ ~۳.۶، CH₃ ~۲.۱" },
    { name:"پروپیوفنون",        en:"Propiophenone",     formula:"C9H10O",  ihd:5,
      signature:["ir_co_ketone","c_ketone","ms_105","ms_77","h_ar_mono","wet_dnp_pos"],
      chain:["phenyl","ketone","ethyl"], note:"آریل‌کتون مزدوج IR ~۱۶۹۰؛ پیک ۱۰۵ (بنزوئیل)→۷۷؛ کوارتت/تریپلت اتیل" },
    { name:"۱-فنیل‌اتانول",     en:"1-Phenylethanol",   formula:"C8H10O",  ihd:4,
      signature:["ir_oh_alc","h_d2o","ms_107","ms_77","h_ar_mono","wet_lucas_any"],
      // کربنِ بنزیلی (ch) باید در زنجیره باشد: بدونِ آن، هیدروکسیل مجاورِ
      // حلقه می‌افتد و قاعدهٔ همسایگی این الکل را «فنول» می‌خواند (و
      // FeCl₃ مثبتِ نادرست می‌دهد). مجموعِ اتم‌ها هم با ch درست است: C8H10O.
      chain:["phenyl","ch","hydroxyl","methyl"], note:"الکل بنزیلی ثانویه؛ M−15=۱۰۷؛ کوارتت CHOH ~۴.۸ + دوتایی CH₃ ~۱.۴" },
    { name:"۲-فنیل‌اتانول",     en:"2-Phenylethanol",   formula:"C8H10O",  ihd:4,
      signature:["ir_oh_alc","h_d2o","ms_91","ms_104","h_ar_mono"],
      chain:["phenyl","ethyl","hydroxyl"], note:"PhCH₂CH₂OH؛ پیک ۹۱/۱۰۴؛ دو تریپلت ~۲.۸ و ~۳.۸" },

    /* --- خانواده دی‌عاملی / متقارن / حلقوی (شناسایی از راه تطبیق مرجع) --- */
    { name:"بیاستیل (۲،۳-بوتان‌دی‌اون)", en:"Biacetyl", formula:"C4H6O2", ihd:2,
      signature:["ir_co_ketone","c_ketone","ms_43","h_methyl"],
      chain:["methyl","ketone","ketone","methyl"], note:"دی‌کتون مجاور؛ IR ~۱۷۱۶؛ UV ۲۸۹nm (n→π* دی‌کربونیل)؛ تک‌سینگلت CH₃ ~۲.۳" },
    { name:"سوکسینونیتریل",     en:"Succinonitrile",    formula:"C4H4N2",  ihd:4,
      signature:["ir_triple_cn"],
      chain:["nitrile","ch2","ch2","nitrile"], note:"دی‌نیتریل؛ C≡N ~۲۲۵۰؛ تک‌سینگلت CH₂ ~۲.۷؛ M فرد نیست (۲ نیتروژن، قاعده زوج)" },
    { name:"۱،۴-سیکلوهگزان‌دی‌اون", en:"1,4-Cyclohexanedione", formula:"C6H8O2", ihd:3,
      signature:["ir_co_ketone","c_ketone"],
      chain:["ketone"], note:"دی‌کتون حلقوی؛ IR ~۱۷۱۵–۱۷۲۰؛ تک‌سینگلت CH₂ ~۲.۷؛ ساختار حلقوی است" },
    { name:"پیناکول",           en:"Pinacol",           formula:"C6H14O2", ihd:0,
      signature:["ir_oh_alc","h_d2o","ms_59"],
      chain:["hydroxyl","hydroxyl"], note:"دی‌ال سه‌سه‌ای (CH₃)₂C(OH)C(OH)(CH₃)₂؛ پیک پایه ۵۹؛ تک‌سینگلت CH₃؛ تقارن بالا (۲ کربن ¹³C)" },
    { name:"۲،۲،۳،۳-تترامتیل‌بوتان", en:"2,2,3,3-Tetramethylbutane", formula:"C8H18", ihd:0,
      signature:["ms_57","ms_alkyl_series"],
      chain:["tbutyl","tbutyl"], note:"آلکان بسیار متقارن؛ پیک پایه ۵۷ (tBu)؛ تک‌سینگلت ~۰.۹؛ فقط ۲ کربن ¹³C" },
    { name:"۱،۱-دی‌کلرواتان",    en:"1,1-Dichloroethane", formula:"C2H4Cl2", ihd:0,
      signature:["ms_cl2","ms_63"],
      chain:["methyl","chloro","chloro"], note:"M ۹۸/۱۰۰/۱۰۲ (الگوی ۲ کلر ۹:۶:۱)؛ CH کوارتت ~۵.۹، CH₃ دوتایی ~۲.۰" },
    { name:"۱،۲-دی‌برمواتان",    en:"1,2-Dibromoethane", formula:"C2H4Br2", ihd:0,
      signature:["ms_br2","ms_27"],
      chain:["bromo","ch2","ch2","bromo"], note:"M ۱۸۶/۱۸۸/۱۹۰ (۲ برم ۱:۲:۱)؛ پیک ۱۰۷/۱۰۹ (CH₂CH₂Br)؛ تک‌سینگلت ~۳.۷ (تقارن)" },
    { name:"۱،۴-دی‌کلروبوتان",   en:"1,4-Dichlorobutane", formula:"C4H8Cl2", ihd:0,
      signature:["ms_cl2","ms_55"],
      chain:["chloro","ch2","ch2","chloro"], note:"M ۱۲۶/۱۲۸/۱۳۰؛ متقارن (۲ کربن ¹³C)؛ دو مولتی‌پلت ~۳.۶ و ~۲.۰" },
    { name:"۱،۳-دی‌برموپروپان",  en:"1,3-Dibromopropane", formula:"C3H6Br2", ihd:0,
      signature:["ms_br2","ms_41"],
      chain:["bromo","ch2","ch2","bromo"], note:"M ۲۰۰/۲۰۲/۲۰۴؛ پیک ۱۲۱/۱۲۳؛ تریپلت ~۳.۵ + کوینتت ~۲.۳" },
    { name:"۱-برمو-۳-کلروپروپان", en:"1-Bromo-3-chloropropane", formula:"C3H6BrCl", ihd:0,
      signature:["ms_br","ms_cl","ms_41"],
      chain:["bromo","ch2","ch2","chloro"], note:"M ۱۵۶/۱۵۸/۱۶۰ (Br+Cl)؛ دو تریپلت ~۳.۶ + کوینتت ~۲.۳" },
    { name:"آلانین",            en:"Alanine",           formula:"C3H7NO2", ihd:1,
      signature:["wet_elem_n","ms_44","h_d2o","ir_co_amide","wet_ninhydrin_pos"],
      chain:["methyl","ch","amine1"], note:"اسید آمینه؛ زوییتریون در D₂O؛ سه پروتون تبادلی؛ پیک ۴۴ (خروج COOH از α)؛ دوتایی CH₃ + کوارتت CH" },
    { name:"پارا-کرزول",        en:"p-Cresol",          formula:"C7H8O",   ihd:4,
      signature:["ir_oh_alc","h_d2o","wet_fecl3_pos","h_para","ms_107"],
      chain:["tolyl_p","hydroxyl"], note:"متیل‌فنول پارا؛ FeCl₃ مثبت (فنول)؛ CH₃ سینگلت ~۲.۳؛ AA'BB' آروماتیک" },
    { name:"۲-فنیل‌پروپانال",    en:"2-Phenylpropanal",  formula:"C9H10O",  ihd:5,
      signature:["ir_aldehyde","h_ald","ms_105","h_ar_mono","wet_tollens_pos"],
      chain:["phenyl","aldehyde"], note:"PhCH(CH₃)CHO؛ CHO ~۹.۷؛ M−۲۹؛ کوارتت CH ~۳.۶ + دوتایی CH₃ ~۱.۴" },

    /* --- افزوده‌های نسخه ۳: پوشش سؤالات تمرینی فاز ۱–۲–۳ (طیف‌سنجی فیلد) ---
       برخی ساختارها (آسپیرین، دی‌اتیل مالونات، مالکول‌های حلقوی) بزرگ‌تر یا
       شاخه‌دارتر از آن هستند که موتور assemble() فعلی خطی بسازد؛ اینجا فقط
       به‌عنوان مرجع ثابت برای matchReferences ثبت می‌شوند (یادداشت هرکدام
       محدودیت را روشن می‌کند). */
    { name:"آسپیرین (استیل‌سالیسیلیک اسید)", en:"Acetylsalicylic acid", formula:"C9H8O4", ihd:6,
      signature:["ir_oh_acid","ir_co_ester","wet_sol_a1","ms_121"],
      chain:["phenyl","cooh"], note:"⚠ ساختار واقعی ارتو-دواستخلافی با استوکسی روی حلقه؛ مونتاژ خطی کامل نیست. IR ۱۷۶۶ (استر فنولی، بالاتر از استر معمولی)+۱۶۸۵ (اسید)؛ MS: M−CH₃COO=۱۲۱ سپس خروج کتن به ۱۳۸؛ الگوی ABCD اورتو در ¹H." },
    { name:"بنزوتری‌فلوئورید", en:"(Trifluoromethyl)benzene", formula:"C7H5F3", ihd:4,
      signature:["ir_cf","h_ar_mono"],
      chain:["phenyl","cf3"], note:"CF₃ باند قوی ~۱۳۲۰؛ MS: M=146، base=127 (M−F)، سپس ۷۷ (فنیل)؛ ¹³C: کربن ipso و CF₃ هر دو به‌صورت کوارتت با J بزرگ از کوپلاژ ¹⁹F–¹³C که DEPT آن را نشان نمی‌دهد (تله رایج)." },
    { name:"پارا-آنیس‌آلدهید", en:"4-Methoxybenzaldehyde (p-anisaldehyde)", formula:"C8H8O2", ihd:5,
      signature:["ir_aldehyde","h_ald","h_methoxy","h_para","ms_135"],
      chain:["methoxy","phenylene_p","aldehyde"], note:"کربونیل مزدوج ۱۶۸۵ (پایین‌تر از آلدهید ساده)؛ رزونانس فرمی ۲۷۲۰/۲۸۲۰؛ AA'BB' با J=8Hz؛ MS: M=136، M−1=135 (آسیلیوم پایدار)، ۱۰۷ (M−CHO)." },
    { name:"ترت-بوتیل‌بنزن", en:"tert-Butylbenzene", formula:"C10H14", ihd:4,
      signature:["h_tbu","h_ar_mono","ms_119","ir_mono"],
      chain:["phenyl","tbutyl"], note:"تلهٔ بنزیلی: پیک پایه ۱۱۹ (M−CH₃، کاتیون بنزیلی نوع سوم پایدار) نه ۹۱ (تروپیلیوم) — تمایز از ایزوبوتیل‌بنزن که ۹۱ می‌دهد." },
    { name:"اتیل نیکوتینات", en:"Ethyl nicotinate", formula:"C8H9NO2", ihd:5,
      signature:["ir_co_ester","ms_106","h_heteroarom_alpha"],
      chain:["pyridin_3yl","ester_co","ethyl"], note:"تلهٔ شیفت هترو-آروماتیک: پروتون α به نیتروژن پیریدین در ۹.۲ppm (شبیه آلدهید اما نیست!)؛ IR ۱۷۴۰ استر + ۱۶۳۷ حلقه؛ MS پایه ۱۰۶ (M−OEt)." },
    { name:"۲-فنوکسی‌اتانول", en:"2-Phenoxyethanol", formula:"C8H10O2", ihd:4,
      signature:["ir_oh_alc","h_d2o","h_ar_mono","ms_94"],
      chain:["phenyl","ether_o","hydroxyl"], note:"⚠ ساختار واقعی PhO-CH₂CH₂-OH (سه‌بلوکی تقریبی). تلهٔ فنوکسی/بنزیلی: پیک پایهٔ MS=۹۴ (فنول، از بازآرایی با خروج اتیلن) ثابت می‌کند پیوند Ph–O سالم مانده، نه Ph–CH₂–O (که ۹۱ می‌داد)." },
    { name:"۴-بروموبوتیرونیتریل", en:"4-Bromobutanenitrile", formula:"C4H6NBr", ihd:2,
      signature:["ir_triple_cn","ms_br"],
      chain:["nitrile","ch2","ch2","bromo"], note:"⚠ تناقض بین منابع آموزشی: یک منبع پیک پایه ۶۸ (خروج Br) و دیگری ۴۱ (کاتیون آلیلی) گزارش کرده؛ با طیف واقعی راستی‌آزمایی شود. نکتهٔ ثابت: CH₂-Br (~3.5ppm) با وجود الکترون‌کشندگی ضعیف‌تر از نیتریل، دی‌شیلدتر از CH₂-CN (~2.5-2.6ppm) است — اثر آنیزوتروپی نیتریل بر انکسار القایی غالب می‌آید." },
    { name:"۱-برمو-۱-فنیل‌اتان", en:"1-Bromoethylbenzene", formula:"C8H9Br", ihd:4,
      signature:["ms_br","h_ar_mono","ms_105b"],
      chain:["phenyl","methyl"], note:"⚠ ساختار واقعی PhCH(Br)CH₃ نیازمند بلوک انشعابی (`ch`) است که هنوز در assemble() فعال نیست. تلهٔ وینیلی کاذب: پروتون CH-Br در ۵.۲ppm (کوارتت) در ناحیهٔ معمولاً وینیلی می‌افتد، به‌علت هم‌افزایی دی‌شیلدینگ حلقهٔ بنزن و برم روی یک کربن." },
    { name:"۲-متیل‌تتراهیدروفوران", en:"2-Methyltetrahydrofuran", formula:"C5H10O", ihd:1,
      signature:["ir_co_single","ms_73b"],
      chain:["ether_o"], note:"⚠ ساختار حلقوی؛ مونتاژ خطی این مرجع کامل نیست. تلهٔ اتر حلقوی: IHD=1 بدون هیچ C=O یا C=C! دو کربن با شیفت >۶۰ppm در ¹³C (۷۴.۷ و ۶۷.۶) ثابت می‌کند دو کربن مجزا به همان یک اکسیژن حلقوی متصل‌اند (نه یک اتر خطی ساده)." },
    { name:"۱-(۴-هیدروکسی‌فنیل)پنتان-۱-اون", en:"1-(4-Hydroxyphenyl)pentan-1-one", formula:"C11H14O2", ihd:5,
      signature:["ir_oh_alc","h_para","ms_105"],
      chain:["hydroxyl","phenylene_p","ketone"], note:"⚠ زنجیرهٔ بوتیل انتهایی در این مرجع لحاظ نشده (نیازمند زنجیرهٔ ۴بلوکی). تلهٔ کربونیل پایین: ۱۶۵۰ (نه ۱۷۱۵) به‌علت رزونانس قوی OH پارا با کربونیل؛ خروج رادیکال بوتیل (M−C₄H₉) به ۱۲۱." },
    { name:"اسید اورتو-آنیسیک", en:"o-Anisic acid (2-Methoxybenzoic acid)", formula:"C8H8O3", ihd:5,
      signature:["ir_oh_acid","h_acid","h_methoxy","wet_sol_a1"],
      chain:["methoxy","phenyl","cooh"], note:"الگوی ABCD اورتو (چهار دوبلت‌مانند dd/td) پیچیده‌تر از پارا؛ MS: M=152، M−17 (خروج OH) به ۱۳۵." },
    { name:"بوتیل اتیل اتر", en:"Butyl ethyl ether", formula:"C6H14O", ihd:0,
      signature:["ir_co_single"],
      chain:["ethyl","ether_o","npropyl"], note:"⚠ npropyl+CH₂ به‌عنوان تقریب بوتیل استفاده شده. تلهٔ هم‌پوشانی: هر دو CH₂ متصل به اکسیژن در ~۳.۳-۳.۵ppm هم‌پوشان می‌شوند؛ نیاز به COSY برای ردیابی اتصال به تریپلت انتهایی." },
    { name:"تیمول/کارواکرول (ایزومر)", en:"Thymol/Carvacrol", formula:"C10H14O", ihd:4,
      signature:["ir_oh_alc","h_d2o","h_iso","ms_105"],
      chain:["isopropyl","benzene_tri","hydroxyl","methyl"], note:"⚠ ساختار سه‌استخلافی حلقوی؛ مونتاژ خطی تقریبی است. تلهٔ ایزومر موقعیتی: تفکیک تیمول از کارواکرول فقط با کوپلاژ متای ظریف (J=1-3Hz) و NOE بین OH و ایزوپروپیل ممکن است، نه با فرمول یا IR." },
    { name:"بوت-۳-این-۱-ال", en:"But-3-yn-1-ol", formula:"C4H6O", ihd:2,
      signature:["ir_alkyne_h","ir_oh_alc","ir_triple_cc"],
      chain:["hydroxyl","vinyl"], note:"⚠ آلکین انتهایی بلوک اختصاصی ندارد؛ chain تقریبی. تلهٔ هم‌پوشانی IR: پیک تیز آلکین ~۳۳۰۰ دقیقاً روی شکم پهن OH سوار می‌شود؛ کوپلاژ دوربرد ⁴J=2.5Hz بین H آلکینی و CH₂ مجاور (الگوی td)." },
    { name:"سینام‌آلدهید", en:"Cinnamaldehyde", formula:"C9H8O", ihd:6,
      signature:["ir_aldehyde","h_ald","ms_131","h_ar_mono"],
      chain:["phenyl","vinyl","aldehyde"], note:"تلهٔ تداخل وینیلی-آروماتیک: پروتون بتا-وینیلی (مزدوج با هم آلدهید و هم بنزن) در ۷.۴ppm دقیقاً وسط سیگنال‌های آروماتیک مخفی می‌شود؛ J ترانس=۱۶Hz بین دو وینیلی." },
    { name:"اتیل سوربات", en:"Ethyl sorbate", formula:"C8H12O2", ihd:3,
      signature:["ir_co_ester","ms_95"],
      chain:["ethyl","ester_co","vinyl","methyl"], note:"تلهٔ توهم آروماتیک: پروتون اولفینی سوم (بتا نسبت به استر، در دی‌ان مزدوج) در ۷.۲ppm به داخل ناحیهٔ آروماتیک رانده شده؛ اگر IHD=3 چک نشود، اشتباهاً بنزن تصور می‌شود." },
    { name:"دی‌اتیل مالونات", en:"Diethyl malonate", formula:"C7H12O4", ihd:2,
      signature:["ir_co_ester"],
      chain:["ethyl","ester_co","ch2","ester_co","ethyl"], note:"تلهٔ تقارن شدید: ۷ کربن فقط ۴ پیک ¹³C می‌دهند (پیش‌بینی ماژول تقارن هم همین را می‌گوید)؛ CH₂ بین دو کربونیل (سینگلت ۳.۳ppm) با وجود همسایگی دو گروه الکترون‌کش کاملاً بی‌شکاف است چون همسایه‌ای با H ندارد." },
    { name:"۴-اتیل‌بنزآلدهید", en:"4-Ethylbenzaldehyde", formula:"C9H10O", ihd:5,
      signature:["ir_aldehyde","h_ald","h_para","ms_105b"],
      chain:["ethyl","phenylene_p","aldehyde"], note:"کربونیل مزدوج افت‌کرده به ۱۶۹۰ (از ۱۷۲۵ پایه)؛ الگوی AA'BB' با J=8Hz کلاسیک پارا؛ MS پایه ۱۰۵ (M−CH₃ از اتیل، نه بنزیلی معمول)." }
  ],

  /* ------------------------------------------------------------------
     ۸. تفسیرگر هوشمند داده خام — Smart Raw-Data Interpreter
     برخلاف بخش‌های بالا که برای «نمایش/چک‌باکس» طراحی شده‌اند، جداول این
     بخش عمداً با min/max عددی ساخته شده‌اند تا مستقیماً توسط calculators.js
     پیمایش برنامه‌ای شوند: کاربر عدد خام طیف را می‌دهد، اینجا بازه منطبق
     پیدا می‌شود و tag آن — در صورت وجود — همان کلید evidence‌ای است که در
     بلوک‌ها/چک‌باکس‌های بالا هم استفاده شده، تا موتور استنتاج بدون هیچ
     مسیر جدیدی مستقیماً از این ورودی‌ها هم تغذیه شود.
     ------------------------------------------------------------------ */

  // فروسرخ: بازه‌های عمومی تشخیص گروه از روی عدد خام پیک (cm⁻¹)
  irSmartZones: [
    { min: 3650, max: 4000, tag: null,          fa: "ناحیه خالی/نویز دستگاه",                 logic: "بالاتر از ۳۶۵۰ معمولاً سیگنال معناداری در ترکیبات آلی معمول نیست." },
    { min: 3200, max: 3600, tag: "ir_oh_alc",   fa: "O–H الکل/فنول",                          logic: "پیوند هیدروژنی بین‌مولکولی نوار را پهن و زنگوله‌ای می‌کند؛ بدون پیوند H، تیز و باریک است." },
    { min: 2500, max: 3300, tag: "ir_oh_acid",  fa: "O–H کربوکسیلیک اسید",                    logic: "دیمرشدن قوی از طریق دو پیوند هیدروژنی، نواری بسیار پهن ایجاد می‌کند که روی C–H سوار می‌شود." },
    { min: 3300, max: 3500, tag: "ir_nh",       fa: "N–H آمین/آمید",                          logic: "آمین نوع اول دو شاخک (کشش متقارن/نامتقارن) و نوع دوم/آمید یک شاخک می‌دهد." },
    { min: 3250, max: 3330, tag: "ir_alkyne_h", fa: "≡C–H آلکین انتهایی",                     logic: "کربن sp با خصلت s بالا، پیوند C–H را محکم‌تر و فرکانس را بالاتر از سایر C–H‌ها می‌برد." },
    { min: 3000, max: 3150, tag: null,          fa: "=C–H آلکن یا آروماتیک (sp²)",             logic: "کربن sp² خصلت s بیشتری نسبت به sp³ دارد؛ پیک بالای ۳۰۰۰ نشانه هیبریداسیون sp² است." },
    { min: 2850, max: 3000, tag: null,          fa: "-C–H آلکان (sp³)",                        logic: "پایین‌ترین خصلت s در میان کربن‌ها؛ ضعیف‌ترین و پایین‌ترین فرکانس کششی C–H." },
    { min: 2700, max: 2740, tag: "ir_aldehyde", fa: "C–H آلدهیدی (شاخک اول رزونانس فرمی)",     logic: "جفت‌پیک فرمی حاصل کوپلاژ بین ارتعاش کششی C–H و اورتون خمشی آلدهید؛ تقریباً تشخیصی." },
    { min: 2800, max: 2830, tag: "ir_aldehyde", fa: "C–H آلدهیدی (شاخک دوم رزونانس فرمی)",     logic: "شاخک دوم همان زوج رزونانس فرمی؛ همراه با شاخک اول باید هر دو دیده شوند." },
    { min: 2210, max: 2260, tag: "ir_triple_cn",fa: "C≡N نیتریل",                             logic: "پیوند سه‌گانه قطبی C≡N؛ باریک، متوسط تا قوی، در ناحیه خلوت طیف." },
    { min: 2100, max: 2160, tag: "ir_triple_cc",fa: "C≡C آلکین داخلی/انتهایی",                 logic: "در آلکین‌های متقارن ممکن است به دلیل عدم تغییر دوقطبی خیلی ضعیف یا محو شود." },
    { min: 1800, max: 1830, tag: null,          fa: "C=O انیدرید یا کلرید اسید",               logic: "اثر القایی شدید هالوژن یا اکسیژن دوم، فرکانس کربونیل را به‌شدت بالا می‌برد؛ انیدریدها دو پیک می‌دهند." },
    { min: 1730, max: 1750, tag: "ir_co_ester", fa: "C=O استر آلیفاتیک",                       logic: "اثر القایی اکسیژن استری (−I) فرکانس را نسبت به کتون بالاتر می‌برد." },
    { min: 1705, max: 1730, tag: "ir_co_ketone",fa: "C=O کتون/آلدهید آلیفاتیک",                logic: "ناحیه پایه کربونیل بدون مزدوج‌شدگی یا هترواتم اضافه؛ مرجع مقایسه سایر کربونیل‌هاست (آلدهید آلیفاتیک ۱۷۲۵–۱۷۳۰). کران بالا از ۱۷۲۵ به ۱۷۳۰ آمد: پیش‌تر بازهٔ ۱۷۲۶–۱۷۳۴ در هیچ زونی نبود و عدد پرکاربرد ۱۷۳۰ هیچ تطابقی نمی‌داد." },
    { min: 1680, max: 1700, tag: "ir_co_amide", fa: "C=O مزدوج‌شده (آریل‌کتون) یا آمید",        logic: "مزدوج‌شدگی با حلقه آروماتیک/آمید خصلت دوگانه پیوند C=O را کم می‌کند و فرکانس را ۲۰–۳۰ واحد پایین می‌آورد." },
    { min: 1620, max: 1680, tag: null,          fa: "C=C آلکن",                                logic: "پیوند دوگانه غیرقطبی؛ نسبت به کربونیل بسیار ضعیف‌تر ظاهر می‌شود." },
    { min: 1450, max: 1600, tag: "ir_aromatic", fa: "C=C آروماتیک («پاهای فیل»)",              logic: "دو تا سه پیک تیز ناشی از کشش حلقه معطر؛ همراه غالباً با پیک‌های >۳۰۰۰ (sp²-H)." },
    { min: 1500, max: 1560, tag: "ir_nitro",    fa: "N=O نیترو (کشش نامتقارن)",                logic: "گروه نیترو دو حالت رزونانسی دارد که دو کشش مجزا (نامتقارن/متقارن) ایجاد می‌کند." },
    { min: 1300, max: 1360, tag: "ir_nitro",    fa: "N=O نیترو (کشش متقارن)",                  logic: "پیک دوم و مکمل نیترو؛ حضور هم‌زمان با ناحیه ۱۵۰۰–۱۵۶۰ تأییدکننده قطعی گروه نیترو است." },
    { min: 1000, max: 1300, tag: "ir_co_single", fa: "C–O تک‌پیوندی (اتر/استر/الکل)",          logic: "ناحیه اثر انگشت؛ به‌تنهایی تشخیصی نیست ولی همراه کربونیل، استر را از کتون متمایز می‌کند." },
    { min: 800,  max: 840,  tag: "ir_para",     fa: "خمش OOP — بنزن پارا-دواستخلافی",          logic: "تنها یک نوع «همسایه هیدروژن» در حلقه پارا باقی می‌ماند، پس فقط یک پیک خمشی قوی ظاهر می‌شود." },
    { min: 950,  max: 980,  tag: "ir_oop_trans", fa: "خمش OOP — آلکن ترانس (=CH خارج صفحه)",    logic: "باند ~۹۶۵ قوی و تیز، شاخص‌ترین اثبات هندسهٔ E (ترانس) در IR — مکمل ³J≈۱۵ Hz در NMR. پیش‌تر این تگ فقط در جدول مرجع بود و تحلیل‌گر هوشمند آن را نمی‌شناخت." },
    { min: 675,  max: 730,  tag: "ir_oop_cis",   fa: "خمش OOP — آلکن سیس (=CH خارج صفحه)",      logic: "باند سیس پهن‌تر و ضعیف‌تر از ترانس و در فرکانس پایین‌تر؛ با ناحیهٔ خمش آروماتیک همپوشانی دارد، پس تنها شاهد قابل‌اتکا نیست." },
    { min: 1360, max: 1390, tag: "ir_gem_dimethyl", fa: "دوقلوی جم-دی‌متیل (ایزوپروپیل/ترت‌بوتیل)", logic: "شکافت باند خمشی متقارن CH₃ به دو پیک (~۱۳۶۵ و ~۱۳۸۵) وقتی دو متیل روی یک کربن سوارند؛ تأییدیهٔ IR برای دوتایی ۶H یا سینگلت ۹H در ¹H." },
    { min: 690,  max: 770,  tag: "ir_mono",     fa: "خمش OOP — بنزن تک‌استخلافی",               logic: "الگوی دوپیکی مشخصه حلقه تک‌استخلافی (نزدیک ۶۹۰ و ۷۳۰–۷۷۰)." },
    { min: 1000, max: 1350, tag: "ir_cf",       fa: "C–F کششی (تری‌فلوئورومتیل/فلوئوروآروماتیک)",
      logic: "پیوند C–F بسیار قطبی است و باندهای قوی و متعدد در این ناحیه می‌دهد؛ در CF₃ معمولاً باند مضاعف نزدیک ۱۳۲۰ و ۱۱۲۰ دیده می‌شود؛ می‌تواند با C–O اشتباه شود مگر با فقدان OH/کربونیل تأیید شود." },
    { min: 500, max: 800, tag: "ir_cx",         fa: "C–X کششی (کلر/برم/ید)",
      logic: "این بازه با خمش خارج‌صفحهٔ تک‌استخلافی (۶۹۰–۷۷۰) و پارا (۸۰۰–۸۴۰) هم‌پوشانی دارد؛ تفکیک قطعی فقط با وجود هالوژن در فرمول مولکولی ممکن است — در غیر این صورت تفسیر آروماتیک ارجح است (نکته: C–Cl معمولاً ~۷۰۰–۸۰۰، C–Br ~۵۰۰–۶۰۰)." }
  ],

  // اثر کشش حلقه بر فرکانس کربونیل — برای تفسیر اعداد خارج از بازه معمول کتون/استر خطی
  irRingStrainZones: [
    { type: "ketone/aldehyde", ring: 6, min: 1705, max: 1725, fa: "کتون/آلدهید خطی یا حلقه ۶ عضوی (مرجع استاندارد)" },
    { type: "ketone",          ring: 5, min: 1740, max: 1750, fa: "سیکلوپنتانون — افزایش خصلت s پیوند C=O در اثر کشش حلقه" },
    { type: "ketone",          ring: 4, min: 1770, max: 1800, fa: "سیکلوبوتانون — کشش زاویه‌ای شدید، بیشترین جابه‌جایی" },
    { type: "lactone",         ring: 6, min: 1735, max: 1750, fa: "دلتا-لاکتون (استر حلقه ۶ عضوی، معادل استر خطی)" },
    { type: "lactone",         ring: 5, min: 1760, max: 1780, fa: "گاما-لاکتون — کشش حلقه فرکانس استر را نیز بالا می‌برد" }
  ],

  // ¹H: بازه‌های عددی شیفت به همراه منطق فیزیکی — مکمل Calc.protonZone
  h1SmartZones: [
    { min: 0,    max: 1.2,  tag: "h_alkyl",  fa: "آلکیل انتهایی (−CH₃)",                 logic: "دورترین حالت از گروه‌های الکترون‌کشنده؛ بیشترین پوشش الکترونی (Shielding)." },
    { min: 1.2,  max: 1.8,  tag: "h_alkyl",  fa: "متیلن زنجیره‌ای (−CH₂−)",              logic: "مشابه متیل ولی به‌دلیل اتصال به دو کربن، اندکی دی‌شیلدتر." },
    { min: 1.8,  max: 2.7,  tag: "h_alpha",  fa: "آلفای کربونیل/آلیلی/بنزیلی",           logic: "آنیزوتروپی مغناطیسی پیوند π مجاور (C=O یا حلقه/آلکن) پوشش الکترونی را کم می‌کند." },
    { min: 3.0,  max: 4.5,  tag: "h_hetero", fa: "متصل به O/N/X",                        logic: "الکترونگاتیوی هترواتم تراکم الکترونی اطراف پروتون را می‌کشد و آن را دی‌شیلد می‌کند." },
    { min: 4.5,  max: 6.5,  tag: "h_vinyl",  fa: "وینیلی (C=C−H)",                       logic: "پروتون در مخروط دی‌شیلدینگ میدان القایی پیوند دوگانه قرار می‌گیرد." },
    { min: 6.5,  max: 8.5,  tag: "h_ar",     fa: "آروماتیک (Ar−H)",                      logic: "جریان حلقه (Ring Current) الکترون‌های π میدان مغناطیسی القایی قوی تولید می‌کند." },
    { min: 9.0,  max: 10.5, tag: "h_ald",    fa: "آلدهیدی (−CHO)",                       logic: "ترکیب اثر کشندگی اکسیژن کربونیل و آنیزوتروپی شدید C=O." },
    { min: 10.5, max: 13.0, tag: "h_acid",   fa: "کربوکسیلیک اسید (−COOH)",              logic: "پیوند هیدروژنی بین‌مولکولی بسیار قوی، بیشترین دی‌شیلدینگ در طیف پروتون معمول را ایجاد می‌کند." },
    { min: 8.5,  max: 9.3,  tag: "h_heteroarom_alpha", fa: "پروتون α حلقهٔ هترو-آروماتیک (پیریدین/کینولین)",
      logic: "پروتون مجاور نیتروژن حلقه به‌شدت دی‌شیلد است اما آلدهید نیست؛ تلهٔ رایج: نبود دو شاخک ۲۷۲۰/۲۸۲۰ در IR و نبود کربن ۱۹۰–۲۰۵ در ¹³C آن را قطعاً از آلدهید جدا می‌کند." }
  ],

  // تعدد پیک (n+1) — کلیدهای چندحرفی برای رفع ابهام s(سینگلت/سکستت/سپتت) و q(کوارتت/کوینتت)
  splittingRules: {
    s:    { neighbors: 0,    fa: "سینگلت", logic: "بدون پروتون همسایه در فاصله ۳ پیوندی." },
    d:    { neighbors: 1,    fa: "دوبلت",  logic: "یک پروتون همسایه (قاعده n+1)." },
    t:    { neighbors: 2,    fa: "تریپلت", logic: "دو پروتون همسایه — امضای مجاورت با یک −CH₂−." },
    q:    { neighbors: 3,    fa: "کوارتت", logic: "سه پروتون همسایه — امضای مجاورت با یک −CH₃ (مثل کوارتت اتیل)." },
    p:    { neighbors: 4,    fa: "کوینتت (پنتت)", logic: "چهار پروتون همسایهٔ معادل — مثلاً −CH₂− وسط که بین دو −CH₂− یکسان است." },
    sext: { neighbors: 5,    fa: "سکستت", logic: "پنج پروتون همسایه — مثلاً −CH₂− میانی نرمال‌پروپیل (مجاور یک CH₃ و یک CH₂)." },
    sept: { neighbors: 6,    fa: "سپتت (هپتت)", logic: "شش پروتون همسایهٔ معادل — امضای قطعی متین ایزوپروپیل، CH بین دو CH₃." },
    m:    { neighbors: null, fa: "مولتی‌پلت", logic: "همسایه‌های متعدد/نامعادل یا همپوشانی (مثل حلقهٔ آروماتیک)." },
    dd:   { neighbors: null, fa: "دو-دوتایی (dd)", logic: "کوپلاژ با دو پروتون نامعادل با دو ثابت J متفاوت — رایج در وینیل و آروماتیک استخلاف‌دار." },
    ddd:  { neighbors: null, fa: "دو-دو-دوتایی (ddd)", logic: "کوپلاژ با سه پروتون نامعادل با سه J متفاوت." },
    dt:   { neighbors: null, fa: "دوتایی از تریپلت (dt)", logic: "کوپلاژ هم‌زمان با یک پروتون و یک جفت پروتون معادل." },
    td:   { neighbors: null, fa: "تریپلت از دوتایی (td)", logic: "کوپلاژ هم‌زمان با یک جفت معادل و یک پروتون مجزا." },
    br:   { neighbors: null, fa: "پهن (broad)", logic: "تبادل سریع (OH/NH) یا کوپلاژ کوادروپلی؛ اغلب با افزودن D₂O محو می‌شود." }
  },

  // ثابت کوپلاژ (J, Hz) — تفکیک هندسه فضایی و الگوی استخلاف حلقه
  /* ------------------------------------------------------------------
     بازه‌های ثابت کوپلاژ J
     ------------------------------------------------------------------
     بازنویسی‌شده. نسخهٔ قبلی سه خطای تشخیصی داشت:
       ۱) «ویسینال با چرخش آزاد» (۶–۸ Hz) — رایج‌ترین کوپلاژ کل ¹H NMR
          (اتیل، ایزوپروپیل، پروپیل) — کلاً در جدول نبود، پس J=۷ به‌اشتباه
          «آلکن سیس» گزارش می‌شد.
       ۲) «ژمینال» روی بازهٔ ۱–۳ برچسب خورده بود. ²J ژمینال فقط برای
          =CH₂ آلکنی ۰–۳ است؛ برای CH₂ با کربن sp³ قدرمطلقش ۱۰–۱۸ است
          (علامت منفی). پس J=۱۲ یک CH₂ دیاستروتوپیک «آلکن ترانس» خوانده
          می‌شد.
       ۳) کوپلاژ محوری–محوری/محوری–استوایی سیکلوهگزان نبود، پس J=۹ در
          یک حلقهٔ شش‌عضوی «آلکن سیس» تفسیر می‌شد.
     همپوشانی بازه‌ها عمدی است: ابزار همهٔ تفسیرهای ممکن را فهرست می‌کند
     و کاربر با شیفت/انتگرال بین‌شان انتخاب می‌کند.
     ------------------------------------------------------------------ */
  jCouplingZones: [
    // --- ²J ژمینال ---
    { min: 10, max: 18, kind: "²J", fa: "ژمینال sp³ (H–C–H روی یک کربن اشباع)",
      logic: "قدرمطلق ²J در CH₂ آزاد ۱۰–۱۴ و در حلقه‌های کوچک تا ۱۸؛ علامت واقعی منفی است. فقط وقتی دیده می‌شود که دو پروتون CH₂ نامعادل باشند (دیاستروتوپیک، مجاور مرکز کایرال یا در حلقهٔ صلب)." },
    { min: 0,  max: 3,  kind: "²J", fa: "ژمینال آلکنی (=CH₂ انتهایی)",
      logic: "دو پروتون روی یک کربن sp²؛ کوپلاژ بسیار کوچک — همین تفاوت آن را از ژمینال sp³ جدا می‌کند." },
    // --- ³J ویسینال آزاد ---
    { min: 6,  max: 8,  kind: "³J", fa: "ویسینال با چرخش آزاد (اتیل/پروپیل/ایزوپروپیل)",
      logic: "میانگین چرخشی زوایای دی‌هدرال در زنجیرهٔ باز؛ ~۷ Hz رایج‌ترین عدد کل طیف ¹H. سه‌تایی+چهارتایی اتیل و دوتایی+هفت‌تایی ایزوپروپیل همین J را دارند." },
    // --- ³J حلقهٔ شش‌عضوی (کارپلاس) ---
    { min: 8,  max: 12, kind: "³J", fa: "سیکلوهگزان محوری–محوری (ax–ax، دی‌هدرال ~۱۸۰°)",
      logic: "بزرگ‌ترین ³J حلقه؛ اثبات‌کنندهٔ آرایش تراکسیال و در قندها ابزار تعیین آنومر (β گلوکوز J₁,₂≈۸)." },
    { min: 2,  max: 5,  kind: "³J", fa: "سیکلوهگزان محوری–استوایی یا استوایی–استوایی (~۶۰°)",
      logic: "زاویهٔ دی‌هدرال نزدیک ۶۰° کوپلاژ را کوچک می‌کند؛ تقابل این عدد با ax–ax استریوشیمی حلقه را قطعی می‌کند." },
    // --- ³J آلکن ---
    { min: 6,  max: 12, kind: "³J", fa: "آلکن سیس (Cis)",
      logic: "زاویهٔ دی‌هدرال ۰°؛ کوچک‌تر از ترانس. برای تفکیک قطعی، همیشه با جفت ترانس مقایسه شود." },
    { min: 12, max: 18, kind: "³J", fa: "آلکن ترانس (Trans)",
      logic: "زاویهٔ دی‌هدرال ۱۸۰°؛ همپوشانی مؤثرتر اوربیتال‌ها بزرگ‌ترین ³J آلکنی را می‌دهد." },
    // --- آروماتیک ---
    { min: 6,  max: 10, kind: "³J", fa: "آروماتیک ارتو (Ortho)",
      logic: "پروتون‌های مجاور روی حلقهٔ بنزن؛ الگوی دو-دوتایی AA′BB′ پارا از همین کوپلاژ می‌آید." },
    { min: 1,  max: 3,  kind: "⁴J", fa: "آروماتیک متا (Meta)",
      logic: "کوپلاژ چهارپیوندی با هندسهٔ زیگزاگ W؛ در استخلاف متا یک دوتایی باریک روی پروتون منزوی می‌سازد." },
    { min: 0,  max: 1,  kind: "⁵J", fa: "آروماتیک پارا (Para)",
      logic: "پنج پیوند فاصله؛ معمولاً فقط پهن‌شدگی خط، نه شکافت قابل‌اندازه‌گیری." },
    // --- دوربرد ---
    { min: 0,  max: 3,  kind: "⁴J", fa: "آلیلی دوربرد (H–C=C–C–H)",
      logic: "از طریق سیستم π؛ باعث پهن‌شدگی سینگلت متیل آلیلی می‌شود." },
    { min: 2,  max: 3,  kind: "⁴J", fa: "پروپارژیلی (H–C≡C–C–H)",
      logic: "کوپلاژ دوربرد غیرعادی‌قوی از طریق پیوند سه‌گانه؛ پروتون آلکین انتهایی را به تریپلت ظریف می‌شکند." },
    { min: 1,  max: 3,  kind: "³J", fa: "آلدهیدی (O=C–H با Hα)",
      logic: "کوپلاژ کوچک CHO با پروتون α؛ دوتایی/تریپلت باریک روی پیک ۹–۱۰ ppm." },
    // --- ناجورهسته (از جدول jCouplingBenzeneAndHetero) ---
    { min: 40, max: 60, kind: "²J", fa: "H–F ژمینال (روی یک کربن)",
      logic: "فلوئور (I=½) دکوپل نمی‌شود؛ ²J(H–F) بسیار بزرگ است و می‌تواند با شکافت پروتونی اشتباه شود." },
    { min: 15, max: 30, kind: "³J", fa: "H–F ویسینال",
      logic: "³J(H–F) در فلوئوروآلکان‌ها؛ بزرگ‌تر از هر کوپلاژ H–H ویسینال." },
    { min: 180, max: 200, kind: "¹J", fa: "H–P یک‌پیوندی",
      logic: "فسفین/فسفیت‌ها؛ دو خط بسیار دور از هم که به‌راحتی با دو سیگنال مستقل اشتباه می‌شود." }
  ],

  /* توجه: این جدول قدیمی است و هیچ‌جا مصرف نمی‌شود — منبع معتبر
     karplusHaasnoot (پایین‌تر) است که karplusAngle از آن می‌خواند.
     مقادیر قبلی این‌جا نادرست بودند (J در ۹۰° را ۴٫۵ Hz می‌داد، حال آن‌که
     باید ~۰–۲ باشد). برای جلوگیری از استفادهٔ اشتباه، هم‌راستا با
     karplusHaasnoot.aliphatic اصلاح شد. */
  karplus: { A: 7.76, B: 1.1, C: 1.4 },

  // ¹³C: بازه‌های عددی با منطق فیزیکی — مکمل c13.regions
  c13SmartZones: [
    { min: 0,   max: 40,  tag: "c_alkyl",  fa: "کربن آلیفاتیک اشباع (sp³)",                 logic: "دورترین از هترواتم یا π؛ کمترین دی‌شیلدینگ." },
    { min: 40,  max: 90,  tag: "c_hetero", fa: "کربن متصل به O/N/X",                        logic: "اثر القایی هترواتم کربن مجاور را دی‌شیلد می‌کند." },
    { min: 35,  max: 75,  tag: "c_ccl",    fa: "C–Cl",                                     logic: "اثر القایی کلر: −CH₂Cl حدود ۴۰–۴۵، CHCl₂ حدود ۷۰ (مثل ۱،۱-دی‌کلرواتان ۶۹٫۵). بازهٔ قبلی ۳۵–۵۵ بود و کربن‌های دی‌کلرو را از دست می‌داد. توجه: CCl₃ تا ~۹۶ می‌رود و با ناحیهٔ استال همپوشانی دارد." },
    { min: 20,  max: 40,  tag: "c_cbr",    fa: "C–Br",                                     logic: "اثر القایی برم ضعیف‌تر از کلر ولی اثر اتم سنگین باعث شیلد نسبی می‌شود؛ −CH₂Br معمولاً ۲۸–۳۴." },
    { min: 65,  max: 90,  tag: "c_alkyne", fa: "کربن آلکینی (sp)",                          logic: "آنیزوتروپی پیوند سه‌گانه، شیفت را نسبت به آلکن پایین‌تر می‌آورد." },
    { min: 100, max: 150, tag: "c_sp2",    fa: "کربن آلکنی/آروماتیک (sp²)",                 logic: "تراکم الکترونی پیوند π دی‌شیلدینگ شدید ایجاد می‌کند." },
    { min: 150, max: 185, tag: "c_ester",  fa: "C=O رزونانسی (اسید/استر/آمید/انیدرید)",     logic: "مشارکت هترواتم مجاور در رزونانس تا حدی الکترون به کربونیل پس می‌دهد؛ پوشیده‌تر از کتون." },
    { min: 90,  max: 105, tag: "c_acetal", fa: "کربن استال/کتال/آنومری (روی دو اکسیژن)",     logic: "دو اکسیژن روی یک کربن، آن را تا مرز ناحیهٔ sp² می‌برند اما هیچ C=O در IR نیست — همین جفت‌شاهد، استال را از کربونیل جدا می‌کند. کربن آنومری قندها هم همین‌جاست. پیش‌تر بازهٔ ۹۱–۹۹ در هیچ زونی نبود و تحلیل‌گر برای δ=۹۵ چیزی برنمی‌گرداند." },
    { min: 185, max: 220, tag: "c_ketone", fa: "C=O بدون رزونانس هترواتم (کتون/آلدهید)",    logic: "بیشترین دی‌شیلدینگ طیف ¹³C؛ قطبیت بالای C=O بدون شریک رزونانسی. کران پایین از ۱۹۰ به ۱۸۵ آمد تا آلدهیدهای آریلی مزدوج و کینون‌ها (۱۸۵–۱۹۲) هم پوشش بگیرند." }
  ],

  /* ------------------------------------------------------------------
     قیدهای اتصال از قطعات جرمی — msConnectivityRules
     ------------------------------------------------------------------
     یک قطعهٔ جرمی صرفاً «وجود» یک گروه را ثابت نمی‌کند؛ می‌گوید کدام
     گروه به کدام گروه *چسبیده* است. موتور مونتاژ پیش‌تر همهٔ قطعات را
     شاهد بی‌جهت می‌گرفت، پس نمی‌توانست ایزومرهای هم‌بلوک را از هم جدا
     کند: «اتیل بنزوات» (Ph–CO–O–Et) و «فنیل پروپانوات» (Et–CO–O–Ph)
     دقیقاً یک مجموعه بلوک دارند و امتیاز یکسان می‌گرفتند — با آن‌که
     m/z=۱۰۵ (آسیلیوم بنزویل) فقط از اولی می‌آید.

     معناشناسی:
       adjacent: [A,B]  → A و B باید همسایهٔ مستقیم باشند (لینکر متقارن)
       precedes: [A,B]  → A باید بلافاصله *قبل* از B باشد. برای لینکرهای
                          نامتقارن مهم است: در ester_co سمت ورودی (چپ)
                          کربنِ کربونیل و سمت خروجی اکسیژن استری است،
                          پس precedes:["phenyl","ester_co"] یعنی فنیل روی
                          کربونیل نشسته (Ph–CO–O–) = بنزوات.
       present:  [A]     → فقط حضور بلوک کافی است.
     bonus وقتی قید برآورده شود اضافه می‌شود. penalty فقط وقتی کم می‌شود
     که همهٔ بلوک‌های لازم در کاندید *باشند* ولی آرایششان تولید آن قطعه
     را ناممکن کند (یعنی شاهد قطعاً با این ساختار نمی‌خواند). اگر بلوک‌ها
     غایب باشند هیچ تغییری نمی‌دهیم، چون قطعه ممکن است از جای دیگری بیاید.
     ------------------------------------------------------------------ */
  msConnectivityRules: [
    { tag: "ms_105", fa: "آسیلیوم بنزویل (Ph–C≡O⁺)", bonus: 6, penalty: 6,
      satisfy: [ { adjacent: ["phenyl", "ketone"] }, { precedes: ["phenyl", "ester_co"] } ],
      involves: ["phenyl", "ketone", "ester_co"],
      note: "۱۰۵ فقط وقتی از بنزویل می‌آید که حلقه روی کربنِ کربونیل باشد؛ در استر معکوس (Et–CO–O–Ph) به‌جای آن ۵۷ و ۹۴ دیده می‌شود." },
    { tag: "ms_91", fa: "تروپیلیوم (C₇H₇⁺)", bonus: 5, penalty: 4,
      satisfy: [ { present: ["benzyl"] }, { adjacent: ["phenyl", "ch2"] } ],
      involves: ["benzyl", "phenyl", "ch2"],
      note: "۹۱ نیاز به یک CH₂ بنزیلی دارد؛ آریل‌اتر (Ph–O–R) این پیک را نمی‌دهد بلکه ۹۴ می‌دهد." },
    { tag: "ms_94", fa: "فنول (C₆H₆O⁺·) از آریل‌اتر", bonus: 5, penalty: 4,
      satisfy: [ { adjacent: ["phenyl", "ether_o"] }, { adjacent: ["phenyl", "methoxy"] },
                 { adjacent: ["phenyl", "hydroxyl"] } ],
      involves: ["phenyl", "ether_o", "methoxy", "hydroxyl", "benzyl"],
      note: "۹۴ یعنی پیوند O–آلکیل شکسته و Ph–O سالم مانده (آریل‌اتر)؛ اگر بنزیل‌اتر بود ۹۱ غالب می‌شد." },
    { tag: "ms_43", fa: "آسیلیوم استیل (CH₃–C≡O⁺)", bonus: 4, penalty: 0,
      satisfy: [ { present: ["acyl"] }, { present: ["acetoxy"] },
                 { adjacent: ["methyl", "ketone"] }, { precedes: ["methyl", "ester_co"] } ],
      involves: ["acyl", "acetoxy", "methyl", "ketone", "ester_co"],
      note: "۴۳ هم می‌تواند C₃H₇⁺ (پروپیل/ایزوپروپیل) باشد، پس فقط پاداش می‌دهد و جریمه نمی‌کند." },
    { tag: "ms_57", fa: "پروپیونیل (C₂H₅CO⁺) یا ترت‌بوتیل (C₄H₉⁺)", bonus: 4, penalty: 0,
      satisfy: [ { present: ["tbutyl"] }, { present: ["propanoyl"] },
                 { adjacent: ["ethyl", "ketone"] }, { precedes: ["ethyl", "ester_co"] } ],
      involves: ["tbutyl", "propanoyl", "ethyl", "ketone", "ester_co"],
      note: "دو منشأ کاملاً متفاوت دارد (کربونیل اتیلی یا کاتیون ترت‌بوتیل)، پس جریمه‌ای اعمال نمی‌شود." },
    { tag: "ms_31", fa: "CH₂=OH⁺ — الکل نوع اول", bonus: 4, penalty: 3,
      satisfy: [ { adjacent: ["hydroxyl", "ch2"] } ],
      involves: ["hydroxyl", "ch2"],
      // حضور خودِ هیدروکسیل برای جریمه کافی است: اگر OH هست ولی روی CH₂
      // ننشسته، الکل ۲°/۳° است و اصلاً نمی‌تواند ۳۱ بدهد (۴۵/۵۹ می‌دهد).
      penalizeIf: ["hydroxyl"],
      note: "۳۱ شاهد شکست آلفای الکل نوع اول است؛ الکل ۲°/۳° به‌جای آن ۴۵/۵۹ می‌دهد." },
    { tag: "ms_30", fa: "CH₂=NH₂⁺ — آمین نوع اول", bonus: 4, penalty: 3,
      satisfy: [ { adjacent: ["amine1", "ch2"] } ],
      involves: ["amine1", "ch2"],
      penalizeIf: ["amine1"],
      note: "۳۰ از شکست آلفای آمین نوع اول می‌آید (ایمینیوم)." }
  ],

  // ایزوتوپ‌های هالوژن/گوگرد از روی نسبت شدت M به M+2
  isotopePatternZones: [
    { ratioMin: 2.5, ratioMax: 3.5,  el: "Cl", fa: "کلر (Cl)",  logic: "فراوانی طبیعی ³⁵Cl:³⁷Cl تقریباً ۳:۱ است." },
    { ratioMin: 0.8, ratioMax: 1.2,  el: "Br", fa: "برم (Br)",  logic: "فراوانی طبیعی ⁷⁹Br:⁸¹Br تقریباً ۱:۱ است." },
    { ratioMin: 20,  ratioMax: 30,   el: "S",  fa: "گوگرد (S)", logic: "³⁴S حدود ۴٪ فراوانی نسبی دارد؛ M+2 کوچک اما مشهود." }
  ],

  // مکانیسم‌های پیشرفته شکست جرمی که فقط با شرط ساختاری خاص رخ می‌دهند
  msAdvancedMechanisms: [
    { loss: 28, mechanism: "بازآرایی مک‌لافرتی (McLafferty)", fragment: "خروج اتیلن از کربونیل با H گاما", condition: "کربونیل (کتون/اسید/استر/آمید) با هیدروژن در موقعیت γ نسبت به C=O لازم است." },
    { loss: 32, mechanism: "اثر ارتو (Ortho Effect)",          fragment: "خروج متانول CH₃OH",              condition: "استر متیلی و یک گروه هیدروژن‌دار (OH/NH₂) در موقعیت ارتوی حلقه بنزن نسبت به هم." },
    { loss: 46, mechanism: "خروج اتانول یا آب+اتیلن",          fragment: "خروج EtOH یا H₂O+C₂H₄",           condition: "استرهای اتیلی یا الکل‌های نوع دوم/سوم با مسیر بازآرایی رقیب." },
    { loss: 54, mechanism: "رترو دیلز-آلدر (Retro-Diels-Alder)", fragment: "خروج دی‌ان یا دی‌نوفیل سبک",    condition: "حلقه سیکلوهگزن غیراشباع؛ شکست هم‌زمان دو پیوند سیگما برای رهایی کشش حلقه." }
  ],

  // تله‌های رایج تست‌های کیفی آزمایشگاهی (مثبت/منفی کاذب)
  qualitativeTraps: [
    { test: "تولنس (Tollens)",     target: "آلدهید",              trap: "آلفا-هیدروکسی‌کتون‌ها (مثل بنزوئین) مثبت کاذب می‌دهند.",
      reason: "توتومری‌شدن به فرم ان‌دیول در محیط بازی معرف، که سپس به آلدهید تبدیل می‌شود." },
    { test: "بندیکت / فهلینگ",     target: "آلدهید آلیفاتیک",     trap: "آلدهیدهای آروماتیک (مثل بنزآلدهید) معمولاً منفی کاذب می‌دهند.",
      reason: "رزونانس حلقه بنزن کربونیل را پایدار می‌کند و اکسایش توسط مس(II) دشوارتر می‌شود." },
    { test: "لوکاس (Lucas)",       target: "تمایز الکل ۱°/۲°/۳°",  trap: "الکل‌های بنزیلی/آلیلی سریع‌تر از حد انتظار برای درجه‌شان واکنش می‌دهند.",
      reason: "پایداری کاتیون حدواسط با رزونانس آروماتیک یا آلیلی مسیر Sₙ1 را تسریع می‌کند." }
  ],

  // ردیاب تغییرات طیفی (Δ) در واکنش‌های سنتزی چندمرحله‌ای رایج
  reactionTracking: [
    { id: "benzoin_to_benzil", reaction: "اکسایش بنزوئین به بنزیل",
      changes: [
        "ناپدید شدن O–H الکل ثانویه (۳۲۰۰–۳۶۰۰) در اثر اکسایش گروه هیدروکسیل",
        "شیفت جزئی کربونیل به‌سمت ~۱۶۸۰ با تشکیل سیستم دی‌کتون مجاور (دافعه دوقطبی)",
        "ناپدید شدن پروتون CH–OH متصل به کربن کایرال در ¹H-NMR (~۵.۹ ppm)"
      ] },
    { id: "benzil_to_benzilic_acid", reaction: "نوآرایی بنزیلیک اسید",
      changes: [
        "ظهور O–H کربوکسیلیک اسید پهن (۲۵۰۰–۳۳۰۰)",
        "شیفت کربونیل از ~۱۶۸۰ (دی‌کتون مزدوج) به ~۱۷۱۵ (اسید کربوکسیلیک)",
        "ظهور کربن سوم متصل به OH با هیبریداسیون sp³ در ¹³C (~۸۰ ppm)، ناشی از حمله نوکلئوفیلی هیدروکسید"
      ] },
    { id: "beckmann_rearrangement", reaction: "نوآرایی بکمن (استوفنون اکسیم ← استانیلید)",
      changes: [
        "مرحله اکسیم: نوار پهن ۳۲۰۰–۳۳۰۰ (N–OH) و پیک ضعیف ~۱۶۳۰ (C=N)",
        "مرحله آمید: شیفت C=N به ~۱۶۶۰ (C=O آمیدی) و ظهور N–H تیز ~۳۳۰۰",
        "مکانیسم: مهاجرت گروه آنتی‌پریپلانار به گروه خروجی، هم‌پوشان با σ*‏ پیوند C–N⁺ در حال شکست"
      ] }
  ],

  // امضای طیف دوبعدی برای کربن‌های نوع چهارم/فاقد پروتون مستقیم
  hetero2DPatterns: [
    { type: "کربن کربونیل نوع چهارم", cShift: "165–220 ppm", method: "HMBC", note: "در HSQC هیچ سیگنالی ندارد (پروتون مستقیم ندارد)؛ فقط از طریق کوپلاژ دوربرد (²J/³J) با پروتون‌های α/β در HMBC دیده و مکان‌یابی می‌شود." },
    { type: "کربن آروماتیک استخلاف‌دار", cShift: "130–160 ppm", method: "HMBC", note: "کربن حلقه که مستقیماً استخلاف (مثل O یا کربونیل) دارد، در HSQC غایب است ولی همبستگی HMBC محل استخلاف را مشخص می‌کند." }
  ],

  /* ==================================================================
     ۹. آنالیز کلاسیک و شیمی تر (فاز ۶) — Wet-Chemistry / Classical
     این لایه تأییدی است: نتیجه یک تست آزمایشگاهی قطعی، وزن استنتاجی
     بسیار بالاتری از یک پیک ضعیف دستگاهی دارد و بسیاری از تناقض‌های
     طیفی را حل می‌کند. tag هر مورد کلید evidence‌ای است که موتور
     استنتاج (با وزن بالا) از آن تغذیه می‌شود.
     ================================================================== */

  // تست ذوب سدیم (لاسِن) — شناسایی عنصری. tag فقط قید حضور عنصر است.
  lassaigne: [
    { tag:"wet_elem_n",  el:"N",  fa:"نیتروژن",  reagent:"عصاره + FeSO₄ تازه، سپس FeCl₃ و اسیدی‌کردن با HCl", positive:"رسوب/رنگ آبی پروس (Prussian Blue)" },
    { tag:"wet_elem_s",  el:"S",  fa:"گوگرد",    reagent:"سدیم نیتروپروساید روی عصاره", positive:"رنگ بنفش/ارغوانی پررنگ" },
    { tag:"wet_elem_s2", el:"S",  fa:"گوگرد (تأیید دوم)", reagent:"استات سرب + استیک اسید", positive:"رسوب سیاه PbS" },
    { tag:"wet_elem_cl", el:"Cl", fa:"کلر",       reagent:"اسیدی‌کردن با HNO₃، سپس AgNO₃", positive:"رسوب سفید، محلول در NH₄OH" },
    { tag:"wet_elem_br", el:"Br", fa:"برم",       reagent:"اسیدی‌کردن با HNO₃، سپس AgNO₃", positive:"رسوب زرد کم‌رنگ، نیمه‌محلول در NH₄OH" },
    { tag:"wet_elem_i",  el:"I",  fa:"ید",        reagent:"اسیدی‌کردن با HNO₃، سپس AgNO₃", positive:"رسوب زرد، نامحلول در NH₄OH" }
  ],

  // کلاس‌های حلالیت (شرینر) — انتخاب کلاس، گروه عاملی محتمل را قید می‌کند.
  solubilityClasses: [
    { id:"S1", tag:"wet_sol_s1", fa:"محلول در آب و اتر", implies:"ترکیب تک‌عاملی قطبی سبک (≤۵ کربن): الکل، آلدهید، کتون، استر، اسید، آمین کوچک." },
    { id:"S2", tag:"wet_sol_s2", fa:"محلول در آب، نامحلول در اتر", implies:"نمک اسید آلی، هیدروکلراید آمین، اسید آمینه، پلی‌ال (قند)، اسید چندظرفیتی." },
    { id:"A1", tag:"wet_sol_a1", fa:"محلول در NaOH ۵٪ و NaHCO₃ ۵٪", implies:"اسید قوی: کربوکسیلیک اسید (>۶ کربن)، یا فنول با استخلاف الکترون‌کشنده در ارتو/پارا." },
    { id:"A2", tag:"wet_sol_a2", fa:"محلول در NaOH، نامحلول در NaHCO₃", implies:"اسید ضعیف: فنول، انول، اکسیم، ایمید، تیوفنول، سولفونامید." },
    { id:"B",  tag:"wet_sol_b",  fa:"محلول در HCl ۵٪", implies:"باز آلی: آمین آلیفاتیک (>۸ کربن)، آنیلین‌ها." },
    { id:"MN", tag:"wet_sol_n",  fa:"خنثی، محلول در H₂SO₄ غلیظ", implies:"ترکیب خنثی با هترواتم (الکل/کتون/استر/آلکن سنگین >۵ کربن)." },
    { id:"I",  tag:"wet_sol_i",  fa:"نامحلول در همه", implies:"هیدروکربن اشباع، هالید آروماتیک، دی‌آریل اتر (بی‌اثر)." }
  ],

  // تست‌های طبقه‌بندی گروه عاملی — قلب فاز ۶
  functionalTests: [
    { id:"tollens",   fa:"تولنس (آینه نقره)",        reagent:"نیترات نقره آمونیاکی [Ag(NH₃)₂]⁺",
      posTag:"wet_tollens_pos", target:"آلدهید", positive:"آینه نقره‌ای یا رسوب سیاه Ag روی دیواره لوله",
      note:"آلفا-هیدروکسی‌کتون‌ها (بنزوئین) مثبت کاذب می‌دهند." },
    { id:"fehling",   fa:"فهلینگ / بندیکت",          reagent:"محلول قلیایی Cu(II) تارتارات",
      posTag:"wet_fehling_pos", target:"آلدهید آلیفاتیک", positive:"رسوب قرمز آجری Cu₂O",
      note:"آلدهیدهای آروماتیک معمولاً منفی کاذب می‌دهند (پایداری رزونانسی)." },
    { id:"dnp",       fa:"۲،۴-دی‌نیتروفنیل‌هیدرازین", reagent:"2,4-DNPH",
      posTag:"wet_dnp_pos", target:"آلدهید یا کتون", positive:"رسوب زرد تا قرمز (هیدرازون)",
      note:"مثبت برای هر کربونیل C=O؛ برای تمایز آلدهید از کتون باید با تولنس ترکیب شود." },
    { id:"semicarbazone", fa:"سمی‌کاربازید",           reagent:"سمی‌کاربازید هیدروکلراید + استات سدیم",
      posTag:"wet_semicarb_pos", target:"آلدهید یا کتون", positive:"رسوب سفید بلوری سمی‌کاربازون با نقطه ذوب تیز",
      note:"مکمل ۲،۴-DNP: هر دو کربونیل را می‌گیرند، اما سمی‌کاربازون به‌خاطر نقطه ذوب تیز و تکرارپذیر، ابزار اصلی «تأیید نهایی با مشتق‌سازی» است. کربونیل‌های به‌شدت ممانعت‌شده (مثل کتون‌های دی-ترت-بوتیل) کند یا منفی‌اند." },
    { id:"hydroxamic",fa:"اسید هیدروکسامیک",          reagent:"هیدروکسیل‌آمین + FeCl₃",
      posTag:"wet_hydroxamic_pos", target:"استر", positive:"رنگ قرمز تیره/بنفش (کمپلکس فریک هیدروکسامات)",
      note:"روش کلیدی تأیید استر مستقل از IR." },
    { id:"fecl3",     fa:"کلرید فریک",               reagent:"FeCl₃ آبی",
      posTag:"wet_fecl3_pos", target:"فنول/انول", positive:"رنگ بنفش، سبز یا آبی",
      note:"الکل‌های معمولی و اسیدهای کربوکسیلیک منفی‌اند." },
    { id:"lucas",     fa:"لوکاس",                    reagent:"HCl غلیظ + ZnCl₂",
      posTag:"wet_lucas_any", target:"تمایز الکل ۱°/۲°/۳°", positive:"کدر شدن/دو فاز شدن",
      classify:{ "3":"واکنش فوری = الکل نوع سوم", "2":"کدر شدن پس از چند دقیقه = نوع دوم", "1":"بدون واکنش در دمای اتاق = نوع اول" },
      note:"الکل‌های بنزیلی/آلیلی سریع‌تر از انتظار واکنش می‌دهند (پایداری کاتیون)." },
    { id:"hinsberg",  fa:"هینزبرگ",                  reagent:"بنزن‌سولفونیل کلراید + باز",
      posTag:"wet_hinsberg_1", target:"تمایز آمین ۱°/۲°/۳°", positive:"وابسته به نوع",
      classify:{ "1":"محصول محلول در باز = آمین نوع اول", "2":"رسوب نامحلول در باز = نوع دوم", "3":"عدم واکنش (حل در اسید) = نوع سوم" },
      note:"" },
    { id:"hno2",      fa:"نیترو اسید (HNO₂)",         reagent:"NaNO₂ + HCl",
      posTag:"wet_hno2_1", target:"تمایز آمین", positive:"وابسته به نوع",
      classify:{ "1al":"خروج حباب N₂ = آمین آلیفاتیک نوع اول", "1ar":"نمک دیازونیوم پایدار (جفت‌شدن آزو) = آمین آروماتیک نوع اول", "2":"روغن زرد نیتروزآمین = نوع دوم" },
      note:"" }
  ],

  // مشتق‌سازی برای تأیید نهایی با نقطه ذوب
  derivatization: [
    { group:"آلدهید/کتون", reagent:"۲،۴-دی‌نیتروفنیل‌هیدرازین", product:"۲،۴-دی‌نیتروفنیل‌هیدرازون (رسوب زرد/قرمز با نقطه ذوب تیز)" },
    { group:"آلدهید/کتون", reagent:"سمی‌کاربازید هیدروکلراید",  product:"سمی‌کاربازون" },
    { group:"الکل",         reagent:"۳،۵-دی‌نیتروبنزوئیل کلراید", product:"۳،۵-دی‌نیتروبنزوات (استر جامد با نقطه ذوب تیز)" },
    { group:"آمین ۱°/۲°",   reagent:"استیک انیدرید یا بنزوئیل کلراید", product:"استامید یا بنزامید متناظر" }
  ],

  /* ==================================================================
     ۱۰. پروفایل جرمی اسکلت‌های هیدروکربنی — سری‌های همولوگ
     برای زمانی که گروه عاملی قوی وجود ندارد و تنها راهنما، الگوی توزیع
     قطعات هیدروکربنی است. (بر پایه مانده‌ی پیمانه‌ی ۱۴)
     ================================================================== */
  hydrocarbonMS: [
    { id:"alkyl_series", residue:1,  klass:"آلکیل اشباع (زنجیره/شاخه‌دار)", tag:"ms_alkyl_series",
      ions:"29, 43, 57, 71, 85 …", fa:"کاتیون‌های CₙH₂ₙ₊₁ (سری ۱۴n+۱)",
      logic:"شکست هومولیتیک تصادفی پیوند C–C؛ توزیع نرم و پیوسته با مینیمم در M−15 (خروج متیل انتهایی)." },
    { id:"alkenyl_series", residue:13, klass:"آلکنیل/سیکلوآلکیل (حلقه یا غیراشباع)", tag:"ms_ring_series",
      ions:"27, 41, 55, 69 …", fa:"کاتیون‌های CₙH₂ₙ₋₁ (سری ۱۴n−۱)",
      logic:"حضور حلقه یا پیوند دوگانه؛ کاتیون آلیلی/سیکلوآلکیل پایدار. اغلب معادل حداقل یک درجه غیراشباعی." },
    { id:"even_series", residue:0, klass:"خروج مولکول خنثی (نوآرایی)", tag:null,
      ions:"28, 42, 56 …", fa:"کاتیون‌رادیکال CₙH₂ₙ (سری ۱۴n)",
      logic:"قطعات زوج معمولاً از نوآرایی (مک‌لافرتی/RDA) با خروج مولکول خنثی می‌آیند." }
  ],

  /* ==================================================================
     ۱۱. بسط وودوارد-فایزر برای کربونیل‌های آروماتیک (قواعد اسکات)
     Ar–CO–G ؛ پایه بر اساس G و افزایش بر اساس استخلاف و موقعیت.
     ================================================================== */
  uvAromatic: {
    bases: {
      ketone:  { nm:246, fa:"آریل‌کتون (Ar–CO–R)" },
      aldehyde:{ nm:250, fa:"آریل‌آلدهید (Ar–CHO)" },
      acid:    { nm:230, fa:"آریل‌اسید/استر (Ar–COOH یا Ar–COOR)" }
    },
    // افزایش طول موج (nm) بر حسب استخلاف و موقعیت روی حلقه
    substituents: [
      { id:"alkyl",  fa:"آلکیل یا باقیمانده حلقه", o:3,  m:3,  p:10 },
      { id:"oh_or",  fa:"OH یا OR (متوکسی)",       o:7,  m:7,  p:25 },
      { id:"o_minus",fa:"O⁻ (فنولات)",             o:11, m:20, p:78 },
      { id:"cl",     fa:"Cl",                       o:0,  m:0,  p:10 },
      { id:"br",     fa:"Br",                       o:2,  m:2,  p:15 },
      { id:"nh2",    fa:"NH₂",                      o:13, m:13, p:58 },
      { id:"nhac",   fa:"NHCOCH₃",                  o:20, m:20, p:45 },
      { id:"nr2",    fa:"NR₂",                      o:20, m:20, p:85 }
    ]
  },

  /* ==================================================================
     ۱۳. جدول معکوس UV — از λmax (و ε) به کروموفور محتمل
     برای وقتی که صورت مسئله فقط λmax می‌دهد. ε بالا = مجاز (π→π*)،
     ε پایین = ممنوعه (n→π*).
     ================================================================== */
  uvChromophores: [
    { min:0,   max:200, fa:"σ→σ* / n→σ* — ترکیب اشباع بدون کروموفور مزدوج", epsHint:"—",
      note:"جذب زیر ۲۰۰nm خارج محدودهٔ دستگاه معمول است؛ عبارت «بدون جذب مهم بالای ۲۲۰nm» یعنی فاقد مزدوج‌شدگی گسترده." },
    { min:200, max:220, fa:"C=C یا C≡C ایزوله (π→π*)", epsHint:"~۱۰⁴ (قوی)",
      note:"پیوند دوگانه/سه‌گانهٔ منفرد و غیرمزدوج." },
    { min:210, max:255, fa:"سیستم مزدوج ان‌اون یا دی‌ان (نوار K)", epsHint:"۱۰⁴–۱۰⁵ (قوی)",
      note:"برای عدد دقیق از قواعد وودوارد-فایزر (کارت بالا) استفاده کنید." },
    { min:250, max:290, fa:"حلقهٔ بنزن (نوار B، انتقال‌های ظریف)", epsHint:"~۲۰۰–۲۰۰۰ (متوسط/ضعیف)",
      note:"چندقلگی ظریف ارتعاشی (مثلاً ۲۵۵nm با شانه‌ها) مشخصهٔ بنزن تک‌حلقه است." },
    { min:270, max:300, fa:"n→π* کربونیل ایزوله", epsHint:"~۱۰–۱۰۰ (بسیار ضعیف)",
      note:"ε کوچک به‌دلیل ممنوعیت تقارن؛ نشانهٔ C=O بدون مزدوج‌شدگی گسترده (مثل استون ~۲۷۹nm)." },
    { min:280, max:350, fa:"کربونیل مزدوج/آروماتیک یا دی‌کربونیل", epsHint:"متغیر",
      note:"بنزوئیل، یا دی‌کتون مجاور مثل بیاستیل (۲۸۹nm)، یا پلی‌ان کوتاه." },
    { min:350, max:800, fa:"مزدوج‌شدگی گسترده / ترکیب رنگی", epsHint:"بالا",
      note:"پلی‌ان‌های بلند و سیستم‌های جذب‌کننده در ناحیهٔ مرئی." }
  ],

  /* ==================================================================
     ۱۲. ضرایب کارپلاس هاسنوت (تصحیح‌شده با الکترونگاتیوی)
     J(φ) = A·cos²φ − B·cosφ + C   — انتخاب مجموعه بر پایه محیط شیمیایی.
     ================================================================== */
  karplusHaasnoot: {
    aliphatic:  { A:7.76, B:1.1, C:1.4, fa:"سیستم آلیفاتیک ساده (H–C–C–H بدون هترواتم مجاور)" },
    heteroatom: { A:9.7,  B:1.8, C:0.7, fa:"سیستم صلب دارای هترواتم مجاور (قند/پپتید — مقادیر DFT هاسنوت)" }
  },

  /* ==================================================================
     ۱۴. جدول تفصیلی شیفت ¹³C — زیرناحیه‌های دقیق (بر پایه Pretsch/Silverstein)
     ================================================================== */
  c13Detailed: [
    { min:-5,  max:5,   fa:"C–I (اثر اتم سنگین)", ex:"CH₃I ~−۲۴ تا ۰؛ −CH₂I ~۰–۱۰" },
    { min:8,   max:25,  fa:"CH₃ آلیفاتیک انتهایی", ex:"CH₃ در آلکان‌ها ~۸–۱۴؛ CH₃CO ~۳۰" },
    { min:15,  max:45,  fa:"CH₂ زنجیره‌ای (sp³)", ex:"−CH₂− ~۲۰–۴۰" },
    { min:20,  max:40,  fa:"C–Br", ex:"−CH₂Br ~۲۸–۳۴؛ CHBr ~۴۵" },
    { min:25,  max:55,  fa:"CH متین یا Cq آلیفاتیک", ex:">CH− ~۲۵–۵۰؛ C(CH₃)₃ ~۳۰–۳۵" },
    { min:25,  max:50,  fa:"C–N آمین/آمید (sp³)", ex:"−CH₂−NH₂ ~۴۰–۴۵" },
    { min:35,  max:55,  fa:"C–Cl", ex:"−CH₂Cl ~۴۰–۴۵؛ CHCl₂ ~۷۰" },
    { min:50,  max:70,  fa:"C–O الکل/اتر نوع اول", ex:"−CH₂OH ~۶۰–۶۵؛ −OCH₃ ~۵۵–۵۸" },
    { min:65,  max:85,  fa:"C–O نوع دوم/سوم یا کربن آلکینی", ex:"CH–OH ~۶۵–۷۵؛ −C≡C− ~۷۰–۸۵" },
    { min:110, max:125, fa:"نیتریل C≡N", ex:"~۱۱۵–۱۲۰ (شدت ضعیف)" },
    { min:100, max:150, fa:"آلکن/آروماتیک CH (sp²)", ex:"C=C و CH حلقه ~۱۲۰–۱۳۵" },
    { min:125, max:150, fa:"C آروماتیک استخلاف‌دار (ایپسو، بدون H)", ex:"~۱۳۰–۱۴۵" },
    { min:150, max:165, fa:"C آروماتیک متصل به O/N (فنول/آنیلین ایپسو)", ex:"C–OH فنول ~۱۵۵–۱۶۰" },
    { min:155, max:175, fa:"C=O اسید کربوکسیلیک/استر", ex:"~۱۶۵–۱۷۵" },
    { min:160, max:178, fa:"C=O آمید", ex:"~۱۶۵–۱۷۵" },
    { min:185, max:205, fa:"C=O آلدهید", ex:"~۱۹۰–۲۰۵" },
    { min:195, max:220, fa:"C=O کتون", ex:"کتون خطی ~۲۰۵–۲۱۵؛ حلقه ۵ عضوی ~۲۲۰" }
  ],

  /* ==================================================================
     ۱۵. پیش‌بینی افزایشی شیفت ¹H — قواعد شولری (Shoolery)
     δ(CH₂)=۱٫۲۵+Σσ ؛ δ(CH)=۱٫۵۰+Σσ
     ================================================================== */
  h1Shoolery: {
    // پایهٔ CH₃ = ۰٫۸۷ بخشی از خودِ روش شولری است و قبلاً غایب بود؛
    // با آن می‌توان متیل استخلاف‌دار (مثل CH₃Cl، CH₃NO₂) را هم تخمین زد.
    base: { ch3: 0.87, ch2: 1.25, ch: 1.50 },
    constants: [
      { id:"alkyl", fa:"آلکیل (−R)",            sigma:0.0 },
      { id:"cc",    fa:"C=C (آلکن مجاور)",       sigma:0.8 },
      { id:"ccc",   fa:"C≡C (آلکین مجاور)",      sigma:0.9 },
      { id:"ph",    fa:"فنیل (−C₆H₅)",           sigma:1.3 },
      { id:"cor",   fa:"−C(=O)R (کتون/آلدهید)",  sigma:1.2 },
      { id:"cooh",  fa:"−COOH / −COOR",          sigma:0.8 },
      { id:"cn",    fa:"−C≡N (نیتریل)",          sigma:1.2 },
      { id:"nh2",   fa:"−NH₂ (آمین)",            sigma:1.0 },
      { id:"nhcor", fa:"−NHC(=O)R (آمید)",       sigma:2.1 },
      { id:"oh",    fa:"−OH (الکل)",             sigma:1.7 },
      { id:"or",    fa:"−OR (اتر)",              sigma:1.5 },
      { id:"ocor",  fa:"−OC(=O)R (استر)",        sigma:2.7 },
      { id:"cl",    fa:"−Cl",                     sigma:2.0 },
      { id:"br",    fa:"−Br",                     sigma:1.9 },
      { id:"i",     fa:"−I",                      sigma:1.4 },
      { id:"no2",   fa:"−NO₂ (نیترو)",           sigma:3.0 }
    ]
  },

  /* ==================================================================
     ۱۶. جدول جامع فرکانس‌های شاخص IR — با شدت و شکل نوار
     ================================================================== */
  irCharacteristic: [
    { lo:3584, hi:3700, group:"O–H آزاد (محلول رقیق)",        intensity:"متغیر",     shape:"تیز و باریک" },
    { lo:3200, hi:3550, group:"O–H پیوندهیدروژنی (الکل/فنول)", intensity:"قوی",       shape:"پهن و زنگوله‌ای" },
    { lo:2500, hi:3300, group:"O–H کربوکسیلیک اسید",          intensity:"قوی",       shape:"بسیار پهن، روی C–H سوار" },
    { lo:3300, hi:3500, group:"N–H آمین/آمید",                intensity:"متوسط",     shape:"۱°: دو نوار؛ ۲°: یک نوار" },
    { lo:3267, hi:3333, group:"≡C–H آلکین انتهایی",           intensity:"قوی",       shape:"تیز و خنجری" },
    { lo:3000, hi:3100, group:"=C–H آلکن/آروماتیک (sp²)",     intensity:"متوسط",     shape:"باریک، بالای ۳۰۰۰" },
    { lo:2850, hi:3000, group:"C–H آلکان (sp³)",              intensity:"قوی",       shape:"چند نوار زیر ۳۰۰۰" },
    { lo:2695, hi:2830, group:"C–H آلدهیدی (زوج فرمی)",       intensity:"متوسط",     shape:"دو شاخک تشخیصی" },
    { lo:2240, hi:2260, group:"C≡N نیتریل",                   intensity:"متوسط-قوی", shape:"باریک، ناحیه خلوت" },
    { lo:2100, hi:2260, group:"C≡C / X=C=Y",                  intensity:"ضعیف-متوسط",shape:"باریک" },
    { lo:1800, hi:1850, group:"C=O انیدرید/کلرید اسید",       intensity:"قوی",       shape:"انیدرید دوتایی" },
    { lo:1730, hi:1750, group:"C=O استر",                     intensity:"قوی",       shape:"تیز" },
    { lo:1705, hi:1725, group:"C=O کتون/آلدهید (مرجع)",        intensity:"قوی",       shape:"تیز" },
    { lo:1665, hi:1700, group:"C=O مزدوج / آمید / اسید",       intensity:"قوی",       shape:"پایین‌تر (رزونانس)" },
    { lo:1620, hi:1680, group:"C=C آلکن / C=N",               intensity:"ضعیف-متوسط",shape:"باریک" },
    { lo:1500, hi:1600, group:"C=C آروماتیک (پاهای فیل)",     intensity:"متغیر",     shape:"۲–۳ نوار تیز" },
    { lo:1500, hi:1570, group:"N=O نیترو (نامتقارن)",         intensity:"قوی",       shape:"نوار قوی" },
    { lo:1300, hi:1370, group:"N=O نیترو (متقارن)",           intensity:"قوی",       shape:"مکمل نامتقارن" },
    { lo:1000, hi:1300, group:"C–O / C–N کششی",              intensity:"قوی",       shape:"چند نوار (اثر انگشت)" },
    { lo:900,  hi:1000, group:"=C–H خمش OOP آلکن",            intensity:"قوی",       shape:"ترانس ~۹۶۰، وینیل ~۹۱۰+۹۹۰" },
    { lo:800,  hi:840,  group:"C–H خمش پارا-دواستخلافی",      intensity:"قوی",       shape:"یک نوار" },
    { lo:690,  hi:770,  group:"C–H خمش تک‌استخلافی",          intensity:"قوی",       shape:"دو نوار (~۶۹۰ و ~۷۴۰)" },
    { lo:500,  hi:800,  group:"C–X (C–Cl ~۷۰۰، C–Br ~۵۵۰)",  intensity:"قوی",       shape:"باریک" }
  ],

  /* ==================================================================
     ۱۷. کتابخانه جامع افت‌های خنثی طیف جرمی (Neutral Losses)
     ================================================================== */
  msNeutralLosses: [
    { loss:15,  frag:"CH₃•",              implies:"متیل انتهایی یا انشعاب (M−15 رایج)" },
    { loss:16,  frag:"O• / NH₂•",         implies:"نیترو، N-اکسید، یا آمید" },
    { loss:17,  frag:"OH• / NH₃",         implies:"کربوکسیلیک اسید/الکل یا آمین" },
    { loss:18,  frag:"H₂O",               implies:"الکل، آلدهید، برخی حلقه‌ها" },
    { loss:19,  frag:"F•",                implies:"فلوئوردار" },
    { loss:20,  frag:"HF",                implies:"فلوئوردار" },
    { loss:26,  frag:"C₂H₂ / CN•",        implies:"آروماتیک یا نیتریل" },
    { loss:27,  frag:"HCN",               implies:"نیتریل/آمین آروماتیک یا حلقه نیتروژن‌دار" },
    { loss:28,  frag:"CO / C₂H₄ / N₂",    implies:"فنول‌کینون (CO)، مک‌لافرتی/RDA (C₂H₄)" },
    { loss:29,  frag:"CHO• / C₂H₅•",      implies:"آلدهید (فرمیل) یا اتیل" },
    { loss:30,  frag:"CH₂O / NO•",        implies:"اتر آروماتیک (CH₂O) یا نیترو (NO)" },
    { loss:31,  frag:"OCH₃• / •CH₂OH",    implies:"متیل استر/اتر یا الکل نوع اول" },
    { loss:32,  frag:"CH₃OH / S",         implies:"متیل استر (اثر ارتو)" },
    { loss:33,  frag:"SH• / CH₃+H₂O",     implies:"تیول" },
    { loss:34,  frag:"H₂S",               implies:"تیول" },
    { loss:35,  frag:"Cl•",               implies:"کلردار" },
    { loss:36,  frag:"HCl",               implies:"کلرید آلکیل" },
    { loss:41,  frag:"C₃H₅• / CH₂CN•",    implies:"آلیل یا استونیتریل" },
    { loss:42,  frag:"کتن CH₂=C=O / C₃H₆ / NCO", implies:"استات، متیل‌کتون، پروپیل، ایزوسیانات" },
    { loss:43,  frag:"C₃H₇• / CH₃CO•",    implies:"پروپیل یا استیل (متیل‌کتون)" },
    { loss:44,  frag:"CO₂ / C₂H₄O / CONH₂", implies:"اسید (دکربوکسیلاسیون)، آلدهید، یا آمید" },
    { loss:45,  frag:"COOH• / •OC₂H₅",    implies:"کربوکسیلیک اسید یا اتیل استر" },
    { loss:46,  frag:"NO₂• / C₂H₅OH",     implies:"نیترو یا اتیل استر" },
    { loss:57,  frag:"C₄H₉• / C₂H₅CO•",   implies:"بوتیل یا پروپیونیل" },
    { loss:60,  frag:"CH₃COOH",           implies:"استات (اسید استیک)" },
    { loss:79,  frag:"Br•",               implies:"برم‌دار" },
    { loss:127, frag:"I•",                implies:"یددار" }
  ],

  /* ==================================================================
     ۱۸. تست‌های کمپلکس/تغییر رنگ کلاسیک — شناسایی با تشکیل رنگ
     پاسخ مستقیم به: «روش شناسایی الکل، فنول، نیتریل، هیدروکربن آروماتیک
     و اسید آمینه که با تشکیل کمپلکس رنگی همراه باشد».
     ================================================================== */
  colorComplexTests: [
    { target:"الکل‌ها", cls:"alcohol", reagent:"نیترات سریک آمونیوم (CAN)  (NH₄)₂Ce(NO₃)₆",
      before:"نارنجی", after:"قرمز/کهربایی", complex:"کمپلکس Ce(IV)–الکسید",
      posTag:"wet_can_pos", colorChange:true,
      logic:"جفت ناپیوندی اکسیژن الکل به سریم(IV) کئوردینه شده و کمپلکس انتقال‌بار قرمز می‌دهد؛ محدودیت: تا ~۱۰ کربن؛ فنول‌ها قهوه‌ای/سبز می‌دهند (تمایز)." },
    { target:"فنول‌ها", cls:"phenol", reagent:"کلرید فریک FeCl₃ (خنثی)",
      before:"زرد کم‌رنگ", after:"بنفش، آبی، سبز یا قرمز", complex:"کمپلکس اکتاهدرال [Fe(OAr)₆]³⁻",
      posTag:"wet_fecl3_pos", colorChange:true,
      logic:"شش یون فنولات به Fe(III) کئوردینه شده و کمپلکس رنگی می‌دهند. تغییر رنگِ همراه (زرد→بنفش) نشانه قطعی فنول/انول است؛ الکل و اسید معمولی منفی‌اند." },
    { target:"نیتریل‌ها/استرها", cls:"nitrile", reagent:"آزمون اسید هیدروکسامیک: NH₂OH سپس FeCl₃",
      before:"—", after:"قرمز شرابی/بنفش", complex:"کمپلکس فریک-هیدروکسامات [Fe(RC(=O)NHO)]",
      posTag:"wet_hydroxamic_pos", colorChange:true,
      logic:"نیتریل (یا استر/آمید/انیدرید) با هیدروکسیل‌آمین به اسید هیدروکسامیک تبدیل می‌شود؛ سپس با Fe(III) کمپلکس قرمز شرابی می‌دهد. نیتریل‌ها معمولاً نیاز به گرمادهی بازی دارند." },
    { target:"هیدروکربن‌های آروماتیک", cls:"aromatic", reagent:"آزمون لِ‌روزن: CHCl₃ + AlCl₃ بدون آب",
      before:"بی‌رنگ", after:"رنگ وابسته به تعداد حلقه", complex:"کمپلکس σ آرنیوم/انتقال‌بار با AlCl₃",
      posTag:"wet_lerosen_pos", colorChange:true,
      logic:"بنزن نارنجی/قرمز، نفتالن آبی، آنتراسن سبز، فنانترن ارغوانی. رنگ با گستردگی سیستم مزدوج آروماتیک تغییر می‌کند و اثر انگشت شناسایی حلقه است." },
    { target:"اسیدهای آمینه", cls:"aminoacid", reagent:"نین‌هیدرین (گرمادهی)",
      before:"بی‌رنگ", after:"بنفش (ارغوانی رومان) — پرولین: زرد", complex:"رنگینه دی‌کتوهیدرین‌دیل‌آمین (Ruhemann's Purple)",
      posTag:"wet_ninhydrin_pos", colorChange:true,
      logic:"گروه α-آمین آزاد با دو مولکول نین‌هیدرین متراکم شده و رنگینه بنفش می‌دهد؛ آمین نوع دوم پرولین به‌جای بنفش، زرد می‌دهد (تمایز). تغییر رنگ قطعی وجود α-آمینو اسید است." },
    { target:"پپتید/پروتئین", cls:"peptide", reagent:"آزمون بیوره: CuSO₄ در محیط بازی",
      before:"آبی", after:"بنفش/ارغوانی", complex:"کمپلکس Cu(II) با پیوندهای پپتیدی",
      posTag:"wet_biuret_pos", colorChange:true,
      logic:"حداقل دو پیوند پپتیدی با Cu(II) کمپلکس بنفش می‌دهند؛ برای تشخیص پپتید از اسید آمینه آزاد مفید است." }
  ],

  /* ==================================================================
     ۱۹. تست هینزبرگ — تفکیک آمین ۱°/۲°/۳° (پاسخ تفصیلی)
     ================================================================== */
  hinsbergDetail: {
    reagent:"بنزن‌سولفونیل کلرید (PhSO₂Cl) در حضور KOH/NaOH اضافی",
    principle:"سولفونیل کلرید با N–H واکنش می‌دهد و سولفونامید می‌سازد؛ سرنوشت محصول در محیط بازی، نوع آمین را لو می‌دهد.",
    types:[
      { type:"آمین نوع اول (1°)", posTag:"wet_hinsberg_1",
        reaction:"R–NH₂ → R–NH–SO₂Ph (سولفونامید با یک N–H اسیدی)",
        inBase:"محصول در باز محلول است (نمک سدیم می‌دهد، شفاف)",
        onAcid:"با اسیدی‌کردن، سولفونامید نامحلول رسوب می‌کند",
        result:"محلول شفاف در باز ← رسوب با افزودن اسید = آمین نوع اول" },
      { type:"آمین نوع دوم (2°)", posTag:"wet_hinsberg_2",
        reaction:"R₂NH → R₂N–SO₂Ph (سولفونامید بدون N–H)",
        inBase:"محصول در باز نامحلول است (N–H اسیدی ندارد)",
        onAcid:"بدون تغییر (همان رسوب باقی می‌ماند)",
        result:"رسوب نامحلول در باز که با اسید حل نمی‌شود = آمین نوع دوم" },
      { type:"آمین نوع سوم (3°)", posTag:"wet_hinsberg_3",
        reaction:"R₃N فاقد N–H است و سولفونامید نمی‌سازد",
        inBase:"واکنشی رخ نمی‌دهد؛ آمین نوع سوم در باز نامحلول می‌ماند",
        onAcid:"با اسیدی‌کردن، آمین به‌صورت نمک آمونیوم حل می‌شود",
        result:"عدم واکنش اولیه ← حل‌شدن با اسید = آمین نوع سوم" }
    ],
    trap:"اگر باز کافی نباشد یا زنجیره آبگریز بلند باشد، سولفونامید نوع اول ممکن است رسوب کند و با نوع دوم اشتباه شود؛ همیشه با اسیدی‌کردن راستی‌آزمایی کنید."
  },

  /* ==================================================================
     ۲۰. تست لوکاس — تمام جوانب (پاسخ جامع)
     ================================================================== */
  lucasDetail: {
    reagent:"معرف لوکاس = HCl غلیظ + ZnCl₂ بی‌آب (اسید لوئیس)",
    scope:"تمایز الکل‌های نوع اول، دوم و سوم آبدوست (محلول، معمولاً ≤۶ کربن).",
    mechanism:"واکنش جانشینی SN1: ZnCl₂ گروه OH را فعال می‌کند، آب خارج شده و کربوکاتیون تشکیل می‌شود؛ سپس Cl⁻ حمله می‌کند. کلرید آلکیل حاصل در آب نامحلول است و به‌صورت کدری/دو فاز دیده می‌شود. سرعت تشکیل کربوکاتیون تعیین‌کننده است.",
    outcomes:[
      { type:"الکل نوع سوم (3°)", tag:"wet_lucas_3", rate:"فوری (کمتر از ۱ دقیقه)",
        why:"کربوکاتیون نوع سوم پایدارترین است (فوق‌مزدوج + القایی)، پس SN1 بسیار سریع." },
      { type:"الکل نوع دوم (2°)", tag:"wet_lucas_2", rate:"۵ تا ۱۰ دقیقه (کدری تدریجی)",
        why:"کربوکاتیون نوع دوم پایداری متوسط دارد؛ واکنش کندتر." },
      { type:"الکل نوع اول (1°)", tag:"wet_lucas_1", rate:"در دمای اتاق واکنش نمی‌دهد",
        why:"کربوکاتیون نوع اول ناپایدار است؛ SN1 عملاً رخ نمی‌دهد (نیاز به گرمای شدید)." }
    ],
    exceptions:[
      "الکل‌های آلیلی و بنزیلی نوع اول با وجود ۱° بودن، سریع واکنش می‌دهند چون کربوکاتیونشان با رزونانس پایدار است (نتیجه مثبت کاذب برای «نوع سوم»).",
      "الکل‌های با بیش از ۶ کربن در آب/معرف نامحلول‌اند؛ کدری اولیه به‌خاطر انحلال‌ناپذیری است نه واکنش (منفی/مثبت کاذب).",
      "الکل‌های نئوپنتیلی به‌دلیل بازآرایی ممکن است رفتار غیرمنتظره نشان دهند."
    ],
    limitation:"تست لوکاس فقط برای الکل‌های محلول در معرف کاربرد دارد و مکانیسم SN1 است، پس هر عاملی که کربوکاتیون را پایدار/ناپایدار کند نتیجه را جابه‌جا می‌کند."
  },

  /* ==================================================================
     ۲۱. سیستم‌های اسپینی و تحلیل مرتبه‌اول NMR (فصل ۹.۴ فیلد)
     ================================================================== */
  spinSystems: [
    { label:"AX",   desc:"دو پروتون با اختلاف شیفت زیاد و یک کوپلاژ؛ دو دوتایی ساده." },
    { label:"AB",   desc:"دو پروتون با اختلاف شیفت کم (Δν/J کوچک)؛ اثر شیروانی، مرتبه دوم." },
    { label:"AX₃",  desc:"مثل اتیل ناقص؛ A یک کوارتت (کوپلاژ با ۳H) و X₃ یک دوتایی." },
    { label:"A₂X₃", desc:"گروه اتیل کلاسیک؛ A₂ کوارتت و X₃ تریپلت." },
    { label:"AMX",  desc:"سه پروتون نامعادل با سه ثابت کوپلاژ متفاوت؛ هر کدام دو-دوتایی (dd). رایج در وینیل و آروماتیک سه‌اسپینی." },
    { label:"AMX₂", desc:"چهار اسپین؛ X₂ معادل، A و M نامعادل با کوپلاژ به X₂." },
    { label:"AM₂X", desc:"چهار اسپین با M₂ معادل." },
    { label:"A₂MX", desc:"چهار اسپین با A₂ معادل." },
    { label:"ADMX₃",desc:"پنج اسپین؛ نمونه پیچیده مثل کروتونات (وینیل + متیل + …)." }
  ],

  // شمارش محیط‌های ¹H/¹³C بر پایه تقارن (نمونه‌های آموزشی مسئله ۳۱۰ فیلد)
  nmrEnvironmentExamples: [
    { name:"CH₃–CO–CH₂CH₂CH₃ (۲-پنتانون)", h:4, c:5 },
    { name:"CH₃CH₂–CO–CH₂CH₃ (۳-پنتانون)", h:2, c:3, note:"تقارن آینه‌ای دو اتیل را معادل می‌کند." },
    { name:"بنزن C₆H₆", h:1, c:1, note:"تقارن کامل؛ همه پروتون‌ها و کربن‌ها معادل." },
    { name:"کلروبنزن", h:3, c:4, note:"ارتو/متا/پارا سه محیط H و چهار محیط C (شامل ایپسو)." },
    { name:"۱،۴-دی‌برموبنزن", h:1, c:2, note:"تقارن بالا؛ یک محیط H، دو محیط C." },
    { name:"۱،۲-دی‌برموبنزن", h:2, c:3 },
    { name:"۱-برمو-۴-کلروبنزن", h:2, c:4 },
    { name:"cis-۲-بوتن", h:2, c:2, note:"دو متیل معادل، دو =CH معادل." },
    { name:"سیکلوهگزان (تبادل سریع صندلی)", h:1, c:1, note:"در دمای اتاق میانگین‌گیری تبادلی." },
    { name:"سیکلوهگزان صلب (دمای پایین)", h:2, c:1, note:"محوری و استوایی جدا می‌شوند." }
  ],

  /* ==================================================================
     ۲۳. قاعدهٔ استیونسون (Stevenson's Rule) — تعیین محل استقرار بار در شکست جرمی
     ================================================================== */
  stevensonRule: {
    statement:"وقتی یک پیوند در یون-رادیکال مولکولی می‌شکند و دو قطعهٔ رادیکالی/کاتیونی محتمل تولید می‌شود، بار مثبت ترجیحاً روی قطعه‌ای می‌ماند که انرژی یونش (IE) کمتری دارد — یعنی قطعه‌ای که کاتیون پایدارتری می‌سازد.",
    examples:[
      "در بوتیروفنون (Ph–CO–CH₂CH₂CH₃)، شکست آلفا می‌تواند رادیکال فنیل یا رادیکال پروپیل را خارج کند؛ چون رادیکال پروپیل بزرگ‌تر و از نظر ترمودینامیکی مطلوب‌تر برای خروج است، کاتیون بنزویل (Ph–C≡O⁺) پایدار باقی می‌ماند و پیک پایه را می‌سازد.",
      "بین کاتیون بنزیلی/تروپیلیومی (رزونانس‌دار) و یک کاتیون آلکیل ساده، همیشه کاتیون آروماتیک/رزونانس‌دار پیک غالب را می‌سازد."
    ]
  },

  /* ==================================================================
     ۲۴. کتابخانهٔ تله‌های امتحانی — Exam Traps Library
     هر تله حاصل تحلیل دقیق مسائل حل‌شده است: یک الگوی مشاهداتی، برداشت
     اشتباه رایج دانشجویان، و استدلال درست برای رفع ابهام. این آرایه در
     app.js برای نمایش نکات آموزشی و در inference.js برای هشدار خودکار
     در تحلیل نهایی استفاده می‌شود.
     ================================================================== */
  examTraps: [
    { id:"trap_105_77", title:"تلهٔ یون m/z=۱۰۵ و ۷۷ (بنزویل در برابر بنزیلیک)",
      pattern:"هر دو یون ۱۰۵ و ۷۷ در طیف جرمی دیده می‌شوند.",
      wrong:"فوری نتیجه‌گیری «حتماً گروه بنزویل (Ph-CO-) داریم» فقط بر اساس عدد ۱۰۵.",
      correct:"جرم ۱۰۵ هم می‌تواند کاتیون آسیلیومی بنزویل (Ph–C≡O⁺، از آریل‌کتون) باشد و هم یک کاتیون بنزیلیکِ استخلاف‌دار (مثل Ph–CH⁺–CH₃، از آلدهید/الکل با استخلاف بنزیلی). تفکیک فقط با IR ممکن است: اگر فرکانس کربونیل >۱۷۱۵ (غیرمزدوج) باشد یا اصلاً کربونیلی وجود نداشته باشد، بنزویل رد می‌شود و باید به‌دنبال کاتیون بنزیلیک بود؛ اگر فرکانس ۱۶۸۰–۱۷۰۰ (مزدوج با آریل) باشد، بنزویل تأیید می‌شود.",
      relatedTags:["ms_105","ms_77"] },
    { id:"trap_conjugation_freq", title:"تلهٔ فرکانس کربونیل در برابر فنیل موجود در فرمول",
      pattern:"فرمول حاوی حلقهٔ آروماتیک است اما فرکانس کربونیل بالای ۱۷۱۵ cm⁻¹ گزارش شده.",
      wrong:"چون فرمول «فنیل» دارد، فرض کنیم کربونیل مستقیماً به حلقه چسبیده (آریل‌کتون/آلدهید مزدوج).",
      correct:"اگر کربونیل واقعاً به حلقه متصل بود، رزونانس فرکانس را ۲۰–۳۰ واحد پایین می‌آورد (به ۱۶۸۰–۱۷۰۰). فرکانس بالای ۱۷۱۵ ثابت می‌کند حداقل یک کربن sp³ حائل بین کربونیل و حلقه وجود دارد (مثل Ph-CH(CH₃)-CHO در برابر Ph-CO-CH₂CH₂CH₃).",
      relatedTags:["ir_co_ketone","h_ar_mono"] },
    { id:"trap_c2h4x2_singlet", title:"تلهٔ الگوی شکافتگی در اتان‌های دواستخلافی (C₂H₄X₂)",
      pattern:"فرمول از نوع C₂H₄X₂ (دو هالوژن/گروه یکسان روی یک اسکلت دوکربنه) است.",
      wrong:"فرض پیش‌فرض این‌که ساختار حتماً ۱،۲-دواستخلافی (X-CH₂-CH₂-X) است.",
      correct:"اگر ¹H-NMR یک سینگلت تنها داد ← هر دو استخلاف روی کربن‌های مجزا (۱،۲-دواستخلافی، متقارن). اگر الگوی دوبلت (۳H)+کوارتت (۱H) با شیفت پایین‌میدان (~۵.۸-۶.۰ppm برای CH) دیده شد ← هر دو استخلاف روی یک کربن سوار شده‌اند (۱،۱-دواستخلافی، CH₃-CHX₂)، چون این CH بین دو هترواتم دی‌شیلد شدیدی می‌بیند.",
      relatedTags:["ms_cl","ms_br","ms_cl2","ms_br2"] },
    { id:"trap_isotope_cluster", title:"تلهٔ خوشهٔ ایزوتوپی چند-هالوژنه",
      pattern:"در ناحیهٔ یون مولکولی بیش از دو پیک متوالی با فاصلهٔ ۲ واحد دیده می‌شود.",
      wrong:"تصور این‌که هر خوشهٔ چندپیکی لزوماً یعنی مخلوط نمونه یا خطای دستگاه.",
      correct:"با ۱ کلر: نسبت ۳:۱ (دو پیک). با ۱ برم: نسبت ۱:۱ (دو پیک). با ۲ کلر: سه پیک با نسبت تقریبی ۹:۶:۱. با ۲ برم: سه پیک با نسبت ۱:۲:۱. با ۱ کلر + ۱ برم: چهار جزء همپوشان با نسبت تقریبی ۳:۴:۱ (تقریبی، بسته به دستگاه). این الگوها مستقیماً تعداد و نوع هالوژن را بدون نیاز به تجزیهٔ عنصری می‌گویند.",
      relatedTags:["ms_cl","ms_br","ms_cl2","ms_br2"] },
    { id:"trap_diastereotopic", title:"شاه‌تلهٔ پروتون‌های دیاستریوتوپیک",
      pattern:"یک گروه CH₂ در مجاورت مرکز کایرال یا در یک حلقهٔ صلب (اپوکسید، نوربورنان) قرار دارد.",
      wrong:"فرض این‌که دو پروتون CH₂ همیشه هم‌ارز و یک سینگلت/دوبلت ساده می‌دهند.",
      correct:"دو پروتون CH₂ مجاور مرکز کایرال دیگر هم‌ارز نیستند (دیاستریوتوپیک)؛ با هم کوپلاژ ژمینال قوی (Jgem≈12-15Hz) می‌دهند و به‌صورت دو دوبلت درهم (AB quartet) یا دو دوبلت-دوبلت (dd) ظاهر می‌شوند، نه یک پیک ساده.",
      relatedTags:["dept_ch2"] },
    { id:"trap_magnetic_vs_chemical", title:"تلهٔ هم‌ارزی شیمیایی در برابر مغناطیسی (سیستم AA'BB')",
      pattern:"بنزن پارا-دواستخلافیِ نامتقارن (دو استخلاف متفاوت) در ¹H-NMR.",
      wrong:"انتظار دو دوبلت تمیز و ساده مثل یک سیستم AX معمولی.",
      correct:"پروتون‌های روبه‌رو از نظر شیمیایی هم‌ارزند اما چون فاصلهٔ کوپلاژی‌شان تا سایر پروتون‌ها متفاوت است، از نظر مغناطیسی هم‌ارز نیستند (سیستم AA'BB'، نه AB واقعی). نتیجه: دو جفت قله با اثر شیروانی (سقف‌دار) و خطوط کمکی ریز، نه دو دوبلت تمیز.",
      relatedTags:["h_para","ir_para"] },
    { id:"trap_heavy_atom", title:"اثر اتم سنگین (ید) روی شیفت ¹³C",
      pattern:"اتم ید مستقیماً به کربن متصل است.",
      wrong:"تصور این‌که ید به‌عنوان الکترونگاتیوترین هالوژن، بیشترین دی‌شیلدینگ را ایجاد می‌کند (مثل کلر/فلوئور).",
      correct:"برخلاف انتظار الکترونگاتیوی، اثر اتم سنگین (Heavy Atom Effect) ید باعث شیلد شدید کربن مجاور می‌شود؛ شیفت آن می‌تواند حتی منفی شود (مثلاً CH₃I در حدود −۲۰ تا ۰ ppm)، برخلاف روند منظم F>Cl>Br که با الکترونگاتیوی پیش می‌رود.",
      relatedTags:["ms_127"] },
    { id:"trap_cf3_quartet", title:"تلهٔ کوارتت CF₃ در ¹³C (کوپلاژ ناهم‌هسته C–F)",
      pattern:"گروه CF₃ در ساختار وجود دارد و طیف ¹³C دیکوپله‌شدهٔ معمولی گرفته شده.",
      wrong:"دیدن ۴ پیک نزدیک به هم و نتیجه‌گیری که ۴ کربن مجزا داریم.",
      correct:"دستگاه ¹³C معمولاً کوپلاژ با ¹H را حذف می‌کند اما کوپلاژ با ¹⁹F (که I=1/2 دارد و اسپین آن دیکوپله نمی‌شود) باقی می‌ماند. یک CF₃ در طیف کربن به‌صورت یک کوارتت با ¹J(C-F)≈۲۵۰Hz دیده می‌شود که فقط از ۱ کربن ناشی شده، نه ۴.",
      relatedTags:["ir_cf"] },
    { id:"trap_dilution_hbond", title:"آزمون رقت برای تشخیص پیوند هیدروژنی درون/بین‌مولکولی",
      pattern:"نوار OH پهن در IR دیده می‌شود و باید مشخص شود پیوند هیدروژنی درون‌مولکولی است یا بین‌مولکولی.",
      wrong:"تصور این‌که همهٔ نوارهای پهن OH به یک شکل و بدون آزمایش بیشتر قابل تفسیرند.",
      correct:"طیف را در حلال غیرقطبی رقیق (مثل CCl₄) در غلظت‌های مختلف بگیرید. اگر با رقیق‌شدن، نوار تیز شده و به فرکانس بالاتر برود ← پیوند هیدروژنی بین‌مولکولی بوده (با فاصلهٔ مولکول‌ها می‌شکند). اگر با رقیق‌شدن هیچ تغییری نکند ← پیوند هیدروژنی درون‌مولکولی است (مثل ارتو-نیتروفنول) و به غلظت وابسته نیست.",
      relatedTags:["ir_oh_alc","ir_oh_acid"] },
    { id:"trap_steric_uv", title:"ممانعت فضایی و قطع مزدوج‌شدگی در UV (بی‌فنیل‌های اورتو-استخلافی)",
      pattern:"سیستم مزدوج انتظار می‌رود اما λmax و ε مشاهده‌شده کمتر از پیش‌بینی وودوارد-فایزر است.",
      wrong:"نتیجه‌گیری که فرمول ساختاری اشتباه است چون عدد UV با محاسبات جدول نمی‌خواند.",
      correct:"برای مزدوج‌شدگی مؤثر، سیستم π باید مسطح (Planar) باشد. استخلاف‌های حجیم در موقعیت ارتوی حلقه‌های بای‌آریل باعث چرخش حلقه‌ها از حالت هم‌صفحه خارج می‌شوند؛ این ممانعت فضایی هم‌پوشانی اوربیتال‌های π را کاهش داده و λmax را به سمت آبی (کوتاه‌تر) شیفت می‌دهد و شدت جذب (ε) را هم می‌کاهد.",
      relatedTags:[] },
    { id:"trap_aldehyde_split", title:"تلهٔ شکافتگی غیرمنتظرهٔ پروتون آلدهیدی",
      pattern:"پیک آلدهیدی (۹–۱۰ppm) به‌صورت دوبلت یا تریپلت دیده می‌شود، نه سینگلت.",
      wrong:"فرض پیش‌فرض که همهٔ آلدهیدها سینگلت آلدهیدی می‌دهند.",
      correct:"اگر گروه CHO مستقیماً به کربنی با حداقل یک هیدروژن متصل باشد (مثل R-CH(R')-CHO)، طبق قاعدهٔ n+1 پروتون آلدهیدی با آن هیدروژن(ها) کوپلاژ می‌کند (J کوچک ۱–۳Hz) و به دوبلت/تریپلت شکافته می‌شود؛ این شکافتگی خودش مدرک وجود یک CH مجاور کربونیل است.",
      relatedTags:["h_ald","ir_aldehyde"] },
    { id:"trap_mclafferty_prereq", title:"پیش‌شرط فراموش‌شدهٔ نوآرایی مک‌لافرتی",
      pattern:"افت جرمی ۲۸ (یا مضربی معادل خروج اتیلن) در طیف جرمی دیده می‌شود.",
      wrong:"اعمال بی‌قیدوشرط مک‌لافرتی روی هر کربونیلی که افت ۲۸ دارد.",
      correct:"مک‌لافرتی فقط وقتی رخ می‌دهد که (۱) یک گروه غیراشباع (C=O، C=N، C=C) وجود داشته باشد و (۲) حداقل یک هیدروژن در موقعیت γ نسبت به آن گروه در دسترس باشد تا حالت گذار حلقوی ۶عضوی شکل بگیرد. نبود H گاما (مثلاً در کربونیل‌های به‌شدت شاخه‌دار یا حلقوی کوچک) این مسیر را مسدود می‌کند و باید به دنبال توضیح دیگری برای افت ۲۸ (مثل خروج مستقیم CO) بود.",
      relatedTags:[] },
    { id:"trap_solvent_peak", title:"تلهٔ پیک حلال CDCl₃ در ¹³C",
      pattern:"سه‌تایی ضعیف با نسبت ۱:۱:۱ دقیقاً در ~۷۷ppm در طیف ¹³C دیده می‌شود.",
      wrong:"شمردن این سه‌تایی به‌عنوان سه کربن واقعی مولکول (مثلاً سه کربن متصل به اکسیژن).",
      correct:"این امضای حلال CDCl₃ است: هستهٔ دوتریم (²H) اسپین I=1 دارد و طبق فرمول 2nI+1 کربن حلال را به یک سه‌تایی با شدت مساوی می‌شکافد. این سه‌تایی را از شمارش کربن‌های واقعی مولکول کنار بگذارید.",
      relatedTags:[] }
  ],

  /* ==================================================================
     ۲۵. الگوریتم پیشنهادی حل مسئله — پنج گام استاندارد (مرجع UI فاز ۵)
     ================================================================== */
  solvingAlgorithm: [
    { step:1, title:"استخراج اطلاعات از فرمول", detail:"IHD را حساب کنید، اتم‌های هترو (O, N, هالوژن) را لیست کنید و قاعدهٔ نیتروژن را چک کنید." },
    { step:2, title:"اسکن IR برای لنگرگاه‌ها", detail:"مستقیماً به ناحیهٔ ۱۷۰۰ (کربونیل) و ۳۳۰۰ (OH/NH) نگاه کنید؛ وضعیت بنزن (OOP) و فرکانس دقیق کربونیل را برای تشخیص مزدوج‌شدگی بررسی کنید." },
    { step:3, title:"چک کردن تقارن با ¹³C", detail:"تعداد پیک‌های کربن را با تعداد کربن‌های فرمول مقایسه کنید؛ اگر پیک‌ها کمتر بود، مولکول تقارن آینه‌ای یا مرکزی دارد (از ماژول تقارن استفاده کنید)." },
    { step:4, title:"مونتاژ قطعات با ¹H-NMR", detail:"هیدروژن‌ها را بشمارید، همسایگی‌ها را از روی قانون n+1 پیدا کنید و قطعاتی مثل اتیل/ایزوپروپیل/ترت-بوتیل را کنار هم بگذارید." },
    { step:5, title:"تأیید نهایی با Mass", detail:"جرم مولکولی و شکست‌های آلفا/مک‌لافرتی را چک کنید و ببینید آیا با ساختار پیشنهادی همخوانی دارند؛ در صورت ابهام (مثل یون ۱۰۵)، حتماً با IR تقاطع دهید." }
  ]
};

  root.DB = DB;
  if (typeof module !== "undefined" && module.exports) module.exports = DB;
})(typeof window !== "undefined" ? window : globalThis);
/* database-extended.js
   مرحلهٔ ۱ ارتقا — افزودن جداول مرجع جدیدی که در گزارش تحلیلی (PDF) درخواست شده بود.
   همهٔ مقادیر این فایل صرفاً «داده» هستند و هیچ منطق موجود در inference.js / structure.js /
   calculators.js / renderer.js را تغییر نمی‌دهند — بنابراین افزودن این فایل کاملاً بی‌خطر است
   و می‌تواند به‌عنوان زیرساخت دادهٔ فازهای بعدی (بازنویسی assemble گراف‌محور، آگاهی
   استریوشیمیایی refineClasses، موتور مکانیسمی MS) استفاده شود.
   ترتیب بارگذاری: بعد از database.js و قبل از field-data.js */
(function () {
  if (typeof DB === "undefined") { console.warn("database-extended: DB not found"); return; }

  /* ============================================================
     ۱) الگوهای خمش خارج از صفحه (IR OOP) — بخش ۲.۱ گزارش
     دقیق‌تر و کامل‌تر از قبل: شامل شدت نسبی و تعداد H مجاور،
     برای موتور تشخیص الگوی استخلافی حلقهٔ بنزن.
     ============================================================ */
  DB.irOOPZones = [
    { pattern: "mono",        sig: "ir_mono",       fa: "تک‌استخلافی (Monosubstituted)",
      bands: [[690,710],[730,770]], intensity: "هر دو باند بسیار قوی",
      adjacentH: 5, note: "باند ۶۹۰–۷۱۰ به‌شدت تشخیصی و ناشی از تغییر شکل کل حلقه است." },
    { pattern: "ortho",       sig: "ir_ortho",      fa: "اورتو-دواستخلافی (۱،۲-)",
      bands: [[735,770]], intensity: "یک باند قوی",
      adjacentH: 4, note: "ارتعاش هم‌زمان چهار هیدروژن مجاور حلقه." },
    { pattern: "meta",        sig: "ir_meta",       fa: "متا-دواستخلافی (۱،۳-)",
      bands: [[860,900],[750,810],[690,710]], intensity: "قوی/قوی/متوسط",
      adjacentH: 3, isolatedH: 1, note: "باند ۸۶۰–۹۰۰ مربوط به هیدروژن منزوی بین دو استخلاف؛ معمولاً تیز اما ضعیف." },
    { pattern: "para",        sig: "ir_para",       fa: "پارا-دواستخلافی (۱،۴-)",
      bands: [[800,860]], intensity: "یک باند بسیار قوی",
      adjacentH: 2, note: "نمایانگر دو جفت هیدروژن مجاور که به‌طور متقارن ارتعاش می‌کنند." },
    { pattern: "1,2,3-tri",   sig: "ir_tri123",     fa: "۱،۲،۳-سه‌استخلافی",
      bands: [[760,780],[705,745]], intensity: "دو باند مشخص",
      adjacentH: 3, note: "ارتعاش کوپله‌شدهٔ سه هیدروژن مجاور." },
    { pattern: "1,2,4-tri",   sig: "ir_tri124",     fa: "۱،۲،۴-سه‌استخلافی",
      bands: [[805,825],[870,885]], intensity: "دو باند",
      adjacentH: 2, isolatedH: 1, note: "یک جفت هیدروژن مجاور به‌همراه یک هیدروژن منزوی." },
    { pattern: "1,3,5-tri",   sig: "ir_tri135",     fa: "۱،۳،۵-سه‌استخلافی",
      bands: [[810,865],[675,730]], intensity: "دو باند، ناشی از تقارن بالا",
      isolatedH: 3, note: "هر سه هیدروژن کاملاً منزوی و هم‌ارز (تقارن C₃v)." }
  ];

  // تبصرهٔ الگوریتمی صریح از گزارش: کاهش وزن تشخیصی OOP در حضور نیترو یا گروه‌های قطبی O–N
  DB.irOOPCaveats = [
    { tag: "nitro_interference", fa: "تداخل نیترو با OOP",
      note: "در حضور گروه‌های قطبی حاوی پیوند O–N (مثل نیترو)، الگوهای OOP ممکن است با فرکانس‌های خمشی O–N هم‌پوشانی پیدا کنند؛ در این حالت وزن تشخیصی OOP باید کاهش یابد و به الگوی اورتون استناد شود." }
  ];

  // نوارهای ترکیبی/اورتون ۱۶۶۵–۲۰۰۰ — تأییدیهٔ ثانویهٔ الگوی استخلافی
  DB.irOvertonePatterns = [
    { pattern: "mono", fa: "تک‌استخلافی", shape: "۴ پیک ضعیف پلکانی با شدت کاهشی از فرکانس بالا به پایین" },
    { pattern: "ortho", fa: "اورتو", shape: "۳ پیک؛ پیک دوم و سوم نزدیک‌به‌هم و هم‌پوشان" },
    { pattern: "meta", fa: "متا", shape: "۳ پیک؛ پیک اول و دوم مجزا، پیک سوم به‌شکل شانه (shoulder) روی پیک دوم" },
    { pattern: "para", fa: "پارا", shape: "۲ پیک متقارن، ساده و کاملاً قابل‌تفکیک" }
  ];

  /* ============================================================
     ۲) شیفت‌های پایهٔ هسته‌های هترو-آروماتیک (¹H و ¹³C) — بخش ۳.۱ و ۴
     نقطهٔ صفر محاسباتی؛ استخلاف‌ها روی این پایه‌ها مقدار افزایشی اعمال می‌کنند.
     ============================================================ */
  DB.heteroaromaticBaseShifts = {
    h1: [
      { ring: "benzene", fa: "بنزن (مرجع)", alpha: 7.27, beta: 7.27, gamma: 7.27 },
      { ring: "pyridine", fa: "پیریدین", alpha: 8.55, beta: 7.25, gamma: 7.65,
        note: "نیتروژن به‌روش القایی چگالی الکترون آلفا را می‌کشد (رزونانس در ۸.۵)؛ اثر رزونانسی گاما را نیز کمی دی‌شیلد می‌کند (۷.۵)." },
      { ring: "pyrrole", fa: "پیرول", alpha: 6.68, beta: 6.22, nh: "۸.۰ تا ۱۰.۰ (پهن، وابسته به غلظت)",
        note: "اهدای جفت‌الکترون N به حلقه برای تکمیل ۶‌الکترون پی هوکل، هر دو موقعیت را نسبت به بنزن شیلد می‌کند." },
      { ring: "furan", fa: "فوران", alpha: 7.40, beta: 6.30 },
      { ring: "thiophene", fa: "تیوفن", alpha: 7.30, beta: 7.10 },
      { ring: "2-pyridone", fa: "۲-پیریدون (در DMSO-d6)", h6: "۷.۳–۷.۵", h3_5: "۶.۲–۶.۵", h4: "۷.۳–۷.۵", nh: "~۱۱.۵" }
    ],
    c13: [
      { ring: "benzene", fa: "بنزن (مرجع)", alpha: 128.5, beta: 128.5, gamma: 128.5 },
      { ring: "pyridine", fa: "پیریدین", alpha: 150.0, beta: 124.0, gamma: 136.0 },
      { ring: "pyridinium", fa: "یون پیریدینیوم (پروتونه)", alpha: 143.0, beta: 129.0, gamma: 146.0,
        note: "پروتوناسیون کربن‌های ۲/۶ را ~۷ ppm بالا (شیلد) و کربن ۴ را ~۱۰ ppm پایین (دی‌شیلد) می‌برد — شاخص تشخیصی وابستگی به pH." }
    ],
    protonationEffect: {
      note: "در فرم پروتونه‌شده (pH پایین)، کربن‌های گاما (موقعیت ۴) و بتا (۳ و ۵) حدود ۰.۵ تا ۱.۰ ppm به سمت میدان پایین جابه‌جا می‌شوند؛ کربن‌های آلفا (۲ و ۶) رفتار پیچیده‌تری (ترکیب ناهمسانگردی + القایی) نشان می‌دهند."
    }
  };

  /* ============================================================
     ۳) ماتریس دقیق ثابت‌های کوپلاژ هترو-آروماتیک (⁵ عضوی) — بخش ۳.۲/۳.۳
     نکتهٔ کلیدی تشخیصی: در فوران/پیرول J(2,3) < J(3,4)، اما در تیوفن برعکس است.
     ============================================================ */
  DB.jCouplingHeterocyclic = [
    { ring: "furan", fa: "فوران", j23: 1.8, j34: 3.5, j24: 0.8, j25: 1.5, ref: "۲-نیتروفوران" },
    { ring: "pyrrole", fa: "پیرول", j23: 2.6, j34: 3.4, j24: 1.5, j25: 2.0, ref: "پیرول-۲-کربوکس‌آلدهید" },
    { ring: "thiophene", fa: "تیوفن", j23: 5.0, j34: 3.5, j24: 1.0, j25: 2.8, ref: "تیوفن-۲-کربوکسیلیک اسید",
      note: "برخلاف فوران/پیرول، در تیوفن J(2,3) > J(3,4) — به‌خاطر شعاع بزرگ‌تر گوگرد و زاویهٔ پیوندی متفاوت؛ این وارونگی برای افتراق خودکار تیوفن از فوران/پیرول در طیف مجهول به‌کار می‌رود." }
  ];

  // کوپلاژهای هموسیکلی بنزنی + هترونهسته‌ای (تکمیل jCouplingZones موجود)
  DB.jCouplingBenzeneAndHetero = {
    orthoBenzene: { min: 6.0, max: 10.0, typical: 8.0, fa: "اورتو (۳ پیوند)" },
    metaBenzene:  { min: 1.0, max: 3.0,  typical: 2.0, fa: "متا (۴ پیوند، هندسهٔ زیگزاگ W)" },
    paraBenzene:  { min: 0.0, max: 1.0,  fa: "پارا (۵ پیوند)؛ اغلب فقط پهن‌شدگی خط، نه شکافت واضح" },
    hf_geminal:   { min: 40, max: 60,  fa: "H–F ژمینال (²J)" },
    hf_vicinal:   { min: 2,  max: 15, fa: "H–F ویسینال (³J)", ref: "فلوئورواتان (سیستم AMX)" },
    hp_1bond:     { min: 180, max: 200, fa: "H–P یک‌پیوندی (¹J)" },
    hp_2bond:     { typical: 0.5, fa: "H–C–P دوپیوندی (²J)", ref: "تری‌فنیل‌فسفین یا دی‌متیل‌فسفیت" },
    ch_aliphatic: { min: 125, max: 135, fa: "¹J(C–H) آلیفاتیک" },
    ch_aromatic_vinyl: { min: 155, max: 170, fa: "¹J(C–H) آروماتیک/وینیلی (خصلت s بیشتر sp²)" },
    cf: { typical: 160, fa: "¹J(C–F)" }
  };

  /* ============================================================
     ۴) مقادیر Z افزایشی کربن-۱۳ برای استخلاف‌های بنزنی — بخش ۴.۱
     δCk = 128.5 + Σ Z(ipso,ortho,meta,para)
     ============================================================ */
  DB.c13BenzeneIncrements = [
    { sub: "CH3",        fa: "متیل",              ipso: 9.3,  ortho: 0.7,  meta: -0.1, para: -2.9, effect: "اهداکنندهٔ ضعیف از طریق هایپرکونژوگاسیون" },
    { sub: "OH",         fa: "هیدروکسیل",         ipso: 26.9, ortho: -12.7, meta: 1.4, para: -7.3, effect: "دهندهٔ رزونانسی قوی (+M)؛ ایپسو با اثر القایی O دی‌شیلد می‌شود" },
    { sub: "OCH3",       fa: "متوکسی",             ipso: 31.4, ortho: -14.4, meta: 1.0, para: -7.7, effect: "مشابه هیدروکسیل، دهندهٔ رزونانسی قوی‌تر در ایپسو" },
    { sub: "NH2",        fa: "آمینو",              ipso: 18.0, ortho: -13.3, meta: 0.9, para: -9.8, effect: "دهندهٔ رزونانسی بسیار قوی (+M)" },
    { sub: "N(CH3)2",    fa: "دی‌متیل‌آمینو",      ipso: 22.6, ortho: -15.6, meta: 1.0, para: -11.5, effect: "دهندهٔ رزونانسی حتی قوی‌تر از NH₂ آزاد" },
    { sub: "NHCOCH3",    fa: "استامیدو (آنیلید)",  ipso: 11.1, ortho: -9.9, meta: 0.2, para: -5.6, effect: "دهندگی رزونانسی تضعیف‌شده به‌خاطر مصرف زوج الکترون N در کربونیل مجاور" },
    { sub: "NO2",        fa: "نیترو",              ipso: 20.0, ortho: -4.8, meta: 0.9, para: 5.8, effect: "پذیرندهٔ شدید الکترون پی؛ ایپسو و پارا را از پوشش خارج می‌کند" },
    { sub: "F",          fa: "فلوئور",             ipso: 34.8, ortho: -12.9, meta: 1.4, para: -4.5, effect: "کشش القایی قوی در ایپسو، اهدای رزونانسی pπ در اورتو/پارا" },
    { sub: "Cl",         fa: "کلر",                ipso: 6.2,  ortho: 0.4,  meta: 1.3, para: -1.9, effect: "تعادل ضعیف‌تر اثرات القایی/رزونانسی (هم‌پوشانی 3p ضعیف‌تر)" },
    { sub: "Br",         fa: "برم",                ipso: -5.5, ortho: 3.4,  meta: 1.7, para: -1.6, effect: "اثر اتم سنگین: پوشش دیامغناطیسی غیرمنتظره در ایپسو" },
    { sub: "I",          fa: "ید",                 ipso: -32.2, ortho: 9.9, meta: 2.6, para: -1.1, effect: "اثر اتم سنگین در بیشینهٔ خود؛ شیلدینگ شدید ایپسو" },
    { sub: "CHO",        fa: "آلدهید",             ipso: 8.6,  ortho: 1.3,  meta: 0.6, para: 5.5, effect: "پذیرندهٔ رزونانسی (−M)" },
    { sub: "CN",         fa: "نیتریل",             ipso: -15.4, ortho: 3.6, meta: 0.6, para: 3.9, effect: "هیبریداسیون sp و آنیزوتروپی خاص، پوشش استثنایی ایپسو" },
    { sub: "COOH",       fa: "کربوکسیلیک اسید",   ipso: 2.1,  ortho: 1.5,  meta: 0.0, para: 5.1, effect: "پذیرندهٔ رزونانسی (−M)" },
    { sub: "COOR",       fa: "استر (کربواتوکسی)", ipso: 2.0,  ortho: 1.2,  meta: -0.1, para: 4.3, effect: "پذیرندهٔ رزونانسی (−M)، ضعیف‌تر از اسید آزاد" }
  ];

  /* ضریب تصحیح ممانعت فضایی: وقتی دو استخلاف غیر-H/F روی موقعیت‌های مجاور (اورتو) باشند،
     اثرات رزونانسی (Z اورتو و Z پارا) باید در ۰.۸۵ تا ۰.۹۰ ضرب شوند
     (چرخش گروه از صفحهٔ حلقه خارج و هم‌پوشانی pπ کاهش می‌یابد). */
  DB.stericHindranceFactor = {
    min: 0.85, max: 0.90,
    appliesWhen: "دو استخلاف غیر از H و F در موقعیت‌های مجاور (۱و۲) حلقهٔ بنزن",
    appliesTo: ["Z_ortho", "Z_para"],
    example: {
      molecule: "۲،۶-دی‌متیل‌آنیزول",
      note: "دو متیل در اورتوی متوکسی باعث چرخش گروه OMe از صفحهٔ حلقه می‌شود. بدون تصحیح: δC-para(انیزول) = 128.5 − 7.7 = 120.8. با تصحیح ۰.۸۵: افزایشی به −6.5 تغییر کرده و δ ≈ 122.0 ppm پیش‌بینی می‌شود که به واقعیت نزدیک‌تر است."
    }
  };

  /* ============================================================
     ۵) قوانین مکانیسمی طیف جرمی: استیونسون، مک‌لافرتی، RDA — بخش ۵/۶
     این مقادیر برای Calc.runFragment/runSmartMass به‌عنوان مرجع قطعی قابل استفاده‌اند.
     ============================================================ */
  DB.msStevensonRule = {
    statement: "در شکست آلفای همولیتیک، بار مثبت روی قطعه‌ای می‌ماند که انرژی یونیزاسیون کمتری دارد؛ عملاً یعنی «بزرگ‌ترین گروه آلکیل همواره به‌صورت رادیکال خنثی دفع می‌شود» چون رادیکال بزرگ‌تر پایدارتر است.",
    examples: [
      { molecule: "۲-بوتانول", major: "دفع رادیکال اتیل (−M29) → یون اکسونیومی m/z=45 (غالب)", minor: "دفع متیل (−M15) → m/z=59 (ضعیف)" },
      { molecule: "متیل پروپیل اتر", major: "شکست آلفا با ترجیح دفع پروپیل → m/z=45" },
      { molecule: "اتیل متیل آمین", major: "دفع اتیل (−M29) → ایمینیوم m/z=30 (غالب)", minor: "دفع متیل از سمت اتیل → m/z=44" }
    ]
  };

  DB.msMcLaffertyReference = {
    mechanism: "انتقال H از کربن گاما به اکسیژن کربونیل باردار از طریق حالت گذار حلقوی ۶ عضوی، به‌همراه شکست هماهنگ پیوند آلفا-بتا؛ محصول یک آلکن خنثی (نامرئی) و یک رادیکال-کاتیون انولی (پیک مشاهده‌شده).",
    requiredMotif: "O=C–Cα–Cβ–Cγ(H)  — زنجیره باید حداقل به کربن گاما با یک H برسد",
    examplesByClass: [
      { cls: "کتون خطی (۲-پنتانون)", note: "دفع اتیلن (−۲۸) → m/z=58" },
      { cls: "کتون خطی (۳-پنتانون)", note: "با وجود تقارن، دفع اتیلن به m/z=58 نمی‌رسد؛ یون حاصل m/z=72 است — تمایز کلیدی بین دو ایزومر" },
      { cls: "استر متیلی خطی", note: "پیک شاخص و بسیار قوی ثابت در m/z=74" },
      { cls: "اسید کربوکسیلیک خطی", note: "پیک شاخص m/z=60" },
      { cls: "آمید نوع اول", note: "پیک شاخص m/z=59" }
    ]
  };

  DB.msRDAReference = {
    mechanism: "رادیکال-کاتیون متمرکز روی پیوند دوگانهٔ حلقهٔ سیکلوهگزنی، دو پیوند آلیلی روبه‌رو را به‌طور هم‌زمان (شبه پریسیکلیک) می‌شکند و به یک دی‌ان (معمولاً حامل بار) و یک دی‌نوفیل خنثی تجزیه می‌شود.",
    examples: [
      { molecule: "سیکلوهگزن", from: "m/z=82", note: "دفع اتیلن (جرم ۲۸) → کاتیون بوتادی‌ان m/z=54" },
      { molecule: "لیمونن", from: "M⁺=136", note: "شکست حلقه → کاتیون رادیکال ایزوپرن m/z=68 (پیک پایه)" },
      { molecule: "آلفا-پینن", note: "پل دوکربنی باعث بازآرایی‌های ثانویهٔ پیچیده‌تر می‌شود؛ شناسایی هستهٔ سیکلوهگزنی قدم اول تحلیل است" }
    ]
  };

  /* ============================================================
     ۶) مولکول‌های مرجع برای کالیبراسیون گره‌های انشعابی (CH/Cq) — بخش ۱.۴
     برای استفادهٔ آیندهٔ موتور assemble گراف‌محور (فاز ۲) و آزمون refineClasses.
     ============================================================ */
  DB.branchingReferenceMolecules = [
    { id: 1,  fa: "ایزوبوتیل‌بنزن", note: "گرهٔ CH با یک اتصال به بنزن و دو متیل هم‌ارز — آزمون ناهمسانگردی روی انشعاب." },
    { id: 2,  fa: "نئوپنتیل برماید", note: "گرهٔ Cq مجاور کربن هالوژنه — کالیبراسیون اثر اتم سنگین بر گره‌های مجاور." },
    { id: 3,  fa: "نئوپنتیل الکل", note: "گرهٔ Cq — ارزیابی ممانعت فضایی در تشکیل پیوند هیدروژنی." },
    { id: 4,  fa: "۲،۲،۴-تری‌متیل‌پنتان", note: "ترکیب گره‌های Cq و CH متوالی — کالیبراسیون رزولوشن سیگنال‌های هم‌پوشان." },
    { id: 5,  fa: "۳-اتیل‌هگزان", note: "گرهٔ CH متصل به سه زنجیرهٔ آلیفاتیک نامتقارن." },
    { id: 6,  fa: "ایزوپروپیل‌بنزن (کومن)", note: "گرهٔ CH مستقیم به حلقه — بررسی سپتت در ¹H NMR." },
    { id: 7,  fa: "ترت-بوتیل‌بنزن", note: "گرهٔ Cq متصل به حلقه — ممانعت فضایی روی استخلاف‌های حلقه." },
    { id: 8,  fa: "۲،۳-دی‌متیل‌بوتان", note: "دو گرهٔ CH مجاور هم — کالیبراسیون شکافت مرتبهٔ بالاتر." },
    { id: 9,  fa: "ایزووالرآلدهید", note: "گرهٔ CH مجاور سیستم کربونیل — اثرات قطبش القایی روی انشعاب." },
    { id: 10, fa: "۲-متیل‌بوتیریک اسید", note: "مرکز کایرال در گرهٔ CH — زمینهٔ بررسی پروتون‌های دیاسترئوتوپیک زنجیرهٔ جانبی." },
    { id: 11, fa: "ایزوبوتیرونیتریل", note: "گرهٔ CH مجاور گروه سیانو — اثر کشندگی الکترون بر شیفت متین." },
    { id: 12, fa: "ترت-بوتیل آمین", note: "گرهٔ Cq مجاور گروه آمین." },
    { id: 13, fa: "۳-متیل-۲-بوتانول", note: "ترکیب مرکز کایرال و گرهٔ انشعابی — کالیبراسیون سیستم دیاسترئوتوپیک پیچیده." },
    { id: 14, fa: "۲،۴-دی‌متیل‌پنتان", note: "دو گرهٔ CH جدا‌شده با یک متیلن." },
    { id: 15, fa: "سک-بوتیل‌آمین", note: "گرهٔ CH کایرال مجاور هترواتم." }
  ];

  /* ============================================================
     ۷) کالیبراسیون هسته‌های حلقوی متراکم (Fused Rings) — بخش ۱.۳
     فرمول، IHD، و شیفت‌های پایه برای استفادهٔ فاز ۲ (مدل‌سازی هستهٔ چندحلقه‌ای)
     ============================================================ */
  DB.fusedRingCores = [
    { id: "naphthalene", fa: "نفتالین", formula: "C10H8", ihd: 7,
      positions: "آلفا: ۱،۴،۵،۸ — بتا: ۲،۳،۶،۷",
      h1: { alpha: 7.8, beta: 7.4 } },
    { id: "indole", fa: "ایندول", formula: "C8H7N", ihd: 6,
      ir: "کشش N–H در ~۳۴۰۰", h1: "سیگنال‌های حلقه بین ۶.۵ تا ۷.۶ ppm" },
    { id: "quinoline", fa: "کینولین", formula: "C9H7N", ihd: 7,
      h1: "طیف گسترده و پیچیده بین ۷.۳ تا ۸.۸ ppm" },
    { id: "coumarin", fa: "کومارین", formula: "C9H6O2", ihd: 7,
      h1: "H-4 در ~۸.۵ ppm (سینگلت/دابلت با J کوچک)، به‌شدت دی‌شیلد به‌خاطر مجاورت کربونیل و حلقهٔ آروماتیک" },
    { id: "pyridine_core", fa: "پیریدین", formula: "C5H5N", ihd: 4,
      ir: "خمش اسکلتی حلقه در ۷۵۳ و ۷۰۷ (شباهت زیاد به الگوی تک‌استخلافی بنزن)" }
  ];

  /* ============================================================
     ۸) بسط قواعد وودوارد-فیزر و افزودن فیزر-کون برای پلی‌ان‌های بلند — بخش ۷
     ============================================================ */
  DB.uvExtendedRules = {
    baseValues: [
      { chromophore: "دی‌ان هتروآرنوالر (ترانسوئید)", nm: 214 },
      { chromophore: "دی‌ان هوموآرنوالر (سیسوئید در یک حلقه)", nm: 253 },
      { chromophore: "کتون α,β-غیراشباع (آسیکلیک یا حلقهٔ ۶ عضوی)", nm: 215 },
      { chromophore: "کتون α,β-غیراشباع (حلقهٔ ۵ عضوی)", nm: 202 }
    ],
    increments: [
      { tag: "extended_conjugation", fa: "بسط مزدوج‌شدگی (هر پیوند دوگانهٔ اضافی)", nm: 30 },
      { tag: "ring_residue_alkyl",   fa: "باقیماندهٔ حلقه یا استخلاف آلکیل (هرکدام)", nm: 5 },
      { tag: "exocyclic_double_bond", fa: "پیوند دوگانهٔ اگزوسیکلیک", nm: 5, note: "اگر برای دو حلقه هم‌زمان اگزوسیکلیک باشد، دوبرابر (۱۰+) محاسبه می‌شود." },
      { tag: "polar_OR",  fa: "گروه قطبی اتری (−OR)", nm: 6 },
      { tag: "polar_SR",  fa: "گروه قطبی تیواتری (−SR)", nm: 30 },
      { tag: "halogen_ClBr", fa: "هالوژن (Cl یا Br)", nm: 5 },
      { tag: "amine_2nd", fa: "آمین نوع دوم (−NR₂)", nm: 60 }
    ],
    // معادلهٔ فیزر-کون برای سیستم‌های پلی‌انی با بیش از ۴ پیوند دوگانهٔ مزدوج
    fieserKuhn: {
      condition: "تعداد پیوندهای دوگانهٔ مزدوج (n) > 4",
      formula: "λmax = 114 + 5·M − 16.5·r_endo − 10·r_exo",
      variables: {
        n: "تعداد کل پیوندهای دوگانه در سیستم مزدوج",
        M: "مجموع تعداد استخلاف‌های آلکیل/باقیماندهٔ حلقه متصل به کل سیستم مزدوج",
        r_endo: "تعداد حلقه‌هایی با پیوند دوگانهٔ اندوسیکلیک درون سیستم مزدوج",
        r_exo: "تعداد پیوندهای دوگانهٔ اگزوسیکلیک"
      },
      note: "برای پلی‌ان‌های بلند (کاروتنوئیدها و مشابه)، جمع‌پذیری خطی وودوارد-فیزر معمولی خطای فاحش می‌دهد؛ موتور predictUV باید فراتر از n=4 به این معادله سوئیچ کند."
    }
  };

  /* ============================================================
     ۹) پرچم عددی ریسک دیاسترئوتوپیک (مقدمهٔ فاز ۲ برای structure.js) — بخش ۶
     تا زمانی که refineClasses به‌طور کامل بازنویسی شود، این جدول به‌عنوان
     مرجع کالیبراسیونی Δδ و Jgem برای گزارش‌دهی دستی/نیمه‌خودکار استفاده می‌شود.
     ============================================================ */
  DB.diastereotopicCalibration = [
    { molecule: "۲-بوتانول", group: "C3-H2 مجاور C2 کایرال", deltaPpm: "۰.۱ تا ۰.۳", jgem: "−۱۰ تا −۱۵ Hz" },
    { molecule: "استایرن اکسید", group: "CH₂ حلقهٔ اپوکسید", deltaPpm: "تا ۰.۵", jgem: "۵ تا ۶ Hz (کاهش‌یافته در حلقهٔ سه‌عضوی)" }
  ];

  if (typeof console !== "undefined") {
    console.info("database-extended: جداول مرحلهٔ ۱ (IR-OOP، شیفت پایهٔ هتروآروماتیک، J هتروسیکلی، Z-افزایشی کربن-۱۳، قوانین MS، UV گسترده) بارگذاری شد.");
  }
})();