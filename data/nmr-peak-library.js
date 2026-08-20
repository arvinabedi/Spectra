/* ============================================================================
   nmr-peak-library.js  —  ارتقای ماژول NMR (افزودنی، کاملاً غیرتخریبی)
   ----------------------------------------------------------------------------
   این فایل هیچ فایل کاری موجودی را تغییر نمی‌دهد. صرفاً:
     ۱) جدول‌های تفصیلیِ جدید به window.DB می‌افزاید (با گارد ضدتکرار، idempotent):
          DB.h1PeakLibrary   — کتابخانهٔ تفصیلی محیط‌های ¹H (به تفکیک گروه عاملی)
          DB.c13PeakLibrary  — کتابخانهٔ تفصیلی محیط‌های ¹³C (با نوع DEPT)
          DB.twoDReference   — نمونه‌های کارشدهٔ همبستگی دوبعدی (COSY/HSQC/HMBC/NOESY)
     ۲) چند زیرناحیهٔ جدید و صحیح به DB.c13Detailed می‌افزاید (این‌ها به‌صورت
        خودکار در «یابندهٔ ¹³C» موجود ظاهر می‌شوند — مصرف‌کننده: app.js).
     ۳) چند مثال تقارن جدید به DB.nmrEnvironmentExamples می‌افزاید.
     ۴) با الگوی خوداتکای field-ui.js سه کارت مرورگر جدید تزریق می‌کند:
          - کتابخانهٔ تفصیلی ¹H  → داخل فاز ۳ (سبز)
          - کتابخانهٔ تفصیلی ¹³C → داخل فاز ۲ (بنفش)
          - نمونه‌های دوبعدی     → داخل فاز ۴ (فیروزه‌ای)
   منابع دادها: قواعد شولری/گرانت-پاول، جداول سیلوراشتاین/پاویا/فیلد و گزارش
   تحلیلی پیوست‌شدهٔ کاربر. مقادیر شیفت بر حسب ppm و ثابت‌های کوپلاژ بر حسب Hz.
   ========================================================================== */
(function (root) {
  "use strict";
  var DB = root.DB;
  if (!DB) { console.warn("[nmr-peak-library] DB یافت نشد؛ ترتیب بارگذاری را بررسی کنید."); return; }

  /* ------------------------------------------------------------------ */
  /* ۱) کتابخانهٔ تفصیلی ¹H                                              */
  /* هر رکورد: {cat, group, fa, lo, hi, mult, integ, note}              */
  /* ------------------------------------------------------------------ */
  var H1 = [
    /* --- آلیفاتیک اشباع (دورترین از الکترون‌کشنده) --- */
    { cat:"aliphatic", group:"TMS", fa:"Si(CH₃)₄ (مرجع صفر)", lo:0.0, hi:0.0, mult:"s", integ:"۱۲H", note:"نقطهٔ صفر کالیبراسیون؛ ۱۲ پروتون معادل." },
    { cat:"aliphatic", group:"CH₃–C", fa:"متیل آلکانی انتهایی", lo:0.8, hi:1.0, mult:"t/d", integ:"۳H", note:"بیشترین پوشش الکترونی؛ تعدد از تعداد همسایه (n+1)." },
    { cat:"aliphatic", group:"–CH₂– زنجیره", fa:"متیلن زنجیره‌ای", lo:1.2, hi:1.5, mult:"m", integ:"۲H", note:"در زنجیره‌های بلند اغلب هم‌پوشان (envelope)؛ با COSY تفکیک می‌شود." },
    { cat:"aliphatic", group:">CH– متین", fa:"متین آلیفاتیک", lo:1.4, hi:1.7, mult:"m", integ:"۱H", note:"شاخهٔ سه‌گانه؛ در ایزوپروپیل هپتت (سپتت) با ۶ همسایه." },
    { cat:"aliphatic", group:"C(CH₃)₃", fa:"ترت-بوتیل", lo:0.9, hi:1.4, mult:"s", integ:"۹H", note:"سینگلت بسیار قوی ۹ پروتونی؛ روی حلقهٔ آروماتیک تا ~۱٫۳ دی‌شیلد." },
    { cat:"aliphatic", group:"سیکلوپروپان", fa:"CH₂/CH حلقهٔ سه‌عضوی", lo:0.0, hi:0.9, mult:"m", integ:"—", note:"شیلدینگ غیرعادی ناشی از جریان حلقهٔ سه‌عضوی؛ حتی بالای TMS." },

    /* --- α نسبت به غیراشباع/الکترون‌کشنده --- */
    { cat:"alpha", group:"CH₃–C=C", fa:"متیل آلیلی (روی آلکن)", lo:1.6, hi:1.9, mult:"s/br", integ:"۳H", note:"کوپلاژ آلیلی ⁴J کوچک (~۱ Hz) گاهی پهن‌شدگی می‌دهد." },
    { cat:"alpha", group:"CH₃–CO–", fa:"متیل کتونی/استیل", lo:2.0, hi:2.2, mult:"s", integ:"۳H", note:"سینگلت شاخص ~۲٫۱؛ در استامید ~۲٫۰، در استات ~۲٫۰." },
    { cat:"alpha", group:"–CH₂–CO–", fa:"متیلن α-کربونیل", lo:2.2, hi:2.6, mult:"m/t", integ:"۲H", note:"در کتون/اسید/استر؛ در McLafferty منبع H_گاما نیست بلکه α است." },
    { cat:"alpha", group:"CH₃–Ar", fa:"متیل روی حلقهٔ آروماتیک (تولوئیل)", lo:2.2, hi:2.5, mult:"s", integ:"۳H", note:"سینگلت ~۲٫۳؛ در متیل‌بنزن‌های چنداستخلافی چند سینگلت نزدیک." },
    { cat:"alpha", group:"Ar–CH₂– بنزیلی", fa:"متیلن بنزیلی", lo:2.6, hi:3.0, mult:"s/m", integ:"۲H", note:"در MS پیک تروپیلیوم ۹۱ می‌دهد؛ در NMR سینگلت اگر بدون همسایه." },
    { cat:"alpha", group:"≡C–H", fa:"آلکین انتهایی", lo:1.8, hi:3.1, mult:"s/t", integ:"۱H", note:"شیلدشده به‌دلیل ناهمسانگردی sp؛ IR ~۳۳۰۰ مکمل." },
    { cat:"alpha", group:"–CH₂–C≡N", fa:"متیلن α-نیتریل", lo:2.3, hi:2.6, mult:"m", integ:"۲H", note:"IR ~۲۲۵۰ و ¹³C نیتریل ~۱۱۸ مکمل تشخیص." },

    /* --- متصل به هترواتم (O/N/X) --- */
    { cat:"hetero", group:"CH₃–N", fa:"متیل روی نیتروژن (آمین/آمید)", lo:2.2, hi:3.0, mult:"s/d", integ:"۳H", note:"N(CH₃)₂ سینگلت ۶ پروتونی شاخص (~۲٫۹ روی آنیلین)." },
    { cat:"hetero", group:"–CH₂–N", fa:"متیلن روی نیتروژن", lo:2.5, hi:3.5, mult:"m", integ:"۲H", note:"در آمین‌ها ~۲٫۷؛ در آمیدها به‌سمت پایین." },
    { cat:"hetero", group:"CH₃–O", fa:"متوکسی (اتر/استر OMe)", lo:3.3, hi:3.9, mult:"s", integ:"۳H", note:"سینگلت تیز ~۳٫۸ در آنیزول/استر متیل؛ ¹³C ~۵۵." },
    { cat:"hetero", group:"–CH₂–OH", fa:"متیلن الکلی نوع اول", lo:3.4, hi:3.7, mult:"t/m", integ:"۲H", note:"در ۱-پروپانول δ۳٫۴۹؛ COSY با CH₂ میانی جفت." },
    { cat:"hetero", group:">CH–O", fa:"متین اکسیژن‌دار (الکل ۲°/اتر)", lo:3.5, hi:4.2, mult:"m", integ:"۱H", note:"در ۲-پروپانول سپتت ~۴٫۰." },
    { cat:"hetero", group:"–CH₂–O–CO–", fa:"متیلن استری (OCH₂ استر)", lo:4.0, hi:4.4, mult:"q/t", integ:"۲H", note:"در اتیل‌استرها کوارتت ~۴٫۱؛ شاخص قطعی OCH₂CH₃ استری." },
    { cat:"hetero", group:"–CH₂–Cl", fa:"متیلن کلردار", lo:3.4, hi:3.7, mult:"t/m", integ:"۲H", note:"¹³C ~۴۴؛ MS الگوی ایزوتوپی ۳:۱." },
    { cat:"hetero", group:"–CH₂–Br", fa:"متیلن برم‌دار", lo:3.3, hi:3.5, mult:"t/m", integ:"۲H", note:"¹³C ~۳۰ (اثر اتم سنگین)؛ MS ۱:۱." },
    { cat:"hetero", group:"–CH₂–I", fa:"متیلن یددار", lo:3.1, hi:3.3, mult:"t", integ:"۲H", note:"در ۱-یدوبوتان δ۳٫۲؛ ¹³C کربنِ C–I به‌شدت آپ‌فیلد (~۷!) — تلهٔ کلیدی." },
    { cat:"hetero", group:"–CH₂–NO₂", fa:"متیلن نیترودار", lo:4.3, hi:4.6, mult:"t", integ:"۲H", note:"دی‌شیلدینگ بسیار قوی نیترو؛ IR ۱۵۲۰/۱۳۵۰ مکمل." },
    { cat:"hetero", group:"O–CH–O / O–CH₂–O", fa:"استال/کتال (متین/متیلن دواکسیژنه)", lo:4.5, hi:5.9, mult:"s/t", integ:"۱–۲H", note:"دو اکسیژن مجاور؛ ¹³C ~۹۵–۱۰۵ شاخص؛ IR بدون C=O." },
    { cat:"hetero", group:"Ar–O–CH₂", fa:"بنزیل اتری/استری روی اکسیژن", lo:5.0, hi:5.5, mult:"s", integ:"۲H", note:"در بنزیل‌استرها سینگلت ~۵٫۴." },

    /* --- وینیلی --- */
    { cat:"vinyl", group:"C=CH₂ انتهایی", fa:"وینیل انتهایی", lo:4.6, hi:5.1, mult:"m", integ:"—", note:"دو پروتون ژمینال نامعادل (dd)؛ ²J کوچک ~۱–۳ Hz." },
    { cat:"vinyl", group:"–CH=CH– داخلی", fa:"وینیل داخلی", lo:5.0, hi:5.8, mult:"m", integ:"—", note:"³J: ترانس ۱۲–۱۸، سیس ۶–۱۲ — ابزار قطعی هندسه." },
    { cat:"vinyl", group:"Ar–CH=CH– مزدوج", fa:"وینیل مزدوج (استیریل/انون)", lo:6.0, hi:7.7, mult:"d/dd", integ:"—", note:"مزدوج‌شدگی به‌سمت پایین می‌راند؛ β-H انون تا ~۶٫۹–۷٫۵." },

    /* --- آروماتیک --- */
    { cat:"aromatic", group:"C₆H₆ بنزن", fa:"بنزن (مرجع)", lo:7.27, hi:7.27, mult:"s", integ:"—", note:"ناهمسانگردی جریان حلقه؛ همه معادل." },
    { cat:"aromatic", group:"Ar–H خنثی", fa:"آروماتیک استخلاف خنثی", lo:7.1, hi:7.4, mult:"m", integ:"—", note:"آلکیل‌بنزن‌ها؛ اغلب مالتیپلت درهم." },
    { cat:"aromatic", group:"Ar–H (ارتو به EWG)", fa:"آروماتیک مجاور گروه کشنده", lo:7.7, hi:8.3, mult:"d", integ:"—", note:"نیترو/کربونیل چگالی را می‌کشد؛ در نیتروبنزآلدهید ~۸٫۳." },
    { cat:"aromatic", group:"Ar–H (ارتو به EDG)", fa:"آروماتیک مجاور گروه دهنده", lo:6.5, hi:6.9, mult:"d", integ:"—", note:"OMe/NH₂ چگالی می‌دهد؛ در آنیزول/آنیلین ~۶٫۷." },
    { cat:"aromatic", group:"AA′BB′ پارا", fa:"دواستخلاف پارا (شبه‌دو دوتایی)", lo:6.6, hi:8.2, mult:"دو d ظاهری", integ:"۲H+۲H", note:"تقارن پارا الگوی متقارن دو دوتایی می‌دهد؛ J ارتو ~۸ Hz." },

    /* --- کربونیل-هیدروژن --- */
    { cat:"carbonylH", group:"R–CHO", fa:"آلدهید آلیفاتیک", lo:9.4, hi:9.9, mult:"t/d/s", integ:"۱H", note:"شاخص قطعی؛ رزونانس فرمی IR ۲۸۲۰/۲۷۲۰ مکمل." },
    { cat:"carbonylH", group:"Ar–CHO", fa:"آلدهید آروماتیک", lo:9.9, hi:10.2, mult:"s", integ:"۱H", note:"در نیتروبنزآلدهید ~۱۰٫۱." },
    { cat:"carbonylH", group:"H–COO–", fa:"فرمات (استر فرمیک)", lo:8.0, hi:8.2, mult:"s", integ:"۱H", note:"در اتیل فرمات ~۸٫۰." },

    /* --- تعویض‌پذیر (Exchangeable) --- */
    { cat:"exchange", group:"R–OH الکل", fa:"هیدروکسیل الکلی", lo:0.5, hi:5.0, mult:"br s", integ:"۱H", note:"شیفت وابسته به غلظت/دما/حلال؛ با D₂O ناپدید." },
    { cat:"exchange", group:"Ar–OH فنول", fa:"هیدروکسیل فنولی", lo:4.0, hi:8.0, mult:"br s", integ:"۱H", note:"پیوند هیدروژنی درون‌مولکولی می‌تواند تا ~۱۲ ببرد." },
    { cat:"exchange", group:"R–COOH اسید", fa:"کربوکسیلیک اسید", lo:10.0, hi:13.0, mult:"br s", integ:"۱H", note:"بسیار پهن؛ IR ۳۳۰۰–۲۵۰۰ مکمل قطعی." },
    { cat:"exchange", group:"R–NH₂ / R₂NH", fa:"آمین", lo:0.5, hi:3.0, mult:"br", integ:"۱–۲H", note:"IR دوشاخهٔ ۳۳۷۰/۳۲۹۰ (نوع اول) مکمل." },
    { cat:"exchange", group:"R–CO–NH–", fa:"آمید N–H", lo:5.5, hi:8.5, mult:"br", integ:"۱H", note:"در آمید نوع اول دو N–H؛ IR ۱۶۵۰ (آمید I) مکمل." },
    { cat:"exchange", group:"enol O–H", fa:"انول با پیوند H درون‌مولکولی", lo:11.0, hi:16.0, mult:"br s", integ:"۱H", note:"β-دی‌کتون/β-کتواستر انولی؛ به‌شدت دی‌شیلد." },

    /* --- هترو-آروماتیک (موقعیت‌محور) --- */
    { cat:"heteroaromatic", group:"پیریدین H2/6 (α)", fa:"پیریدین آلفا", lo:8.5, hi:8.6, mult:"m", integ:"—", note:"القای N چگالی α را می‌کشد؛ دی‌شیلدترین." },
    { cat:"heteroaromatic", group:"پیریدین H4 (γ)", fa:"پیریدین گاما", lo:7.5, hi:7.7, mult:"tt", integ:"—", note:"اثر رزونانسی نیز γ را کمی دی‌شیلد می‌کند." },
    { cat:"heteroaromatic", group:"پیریدین H3/5 (β)", fa:"پیریدین بتا", lo:7.1, hi:7.3, mult:"m", integ:"—", note:"در فرم‌های رزونانسی حامل بار مثبت نیست؛ کم‌ترین شیفت." },
    { cat:"heteroaromatic", group:"پیرول H2/5 (α)", fa:"پیرول آلفا", lo:6.6, hi:6.8, mult:"m", integ:"—", note:"اهدای جفت‌الکترون N باعث شیلدینگ نسبت به بنزن." },
    { cat:"heteroaromatic", group:"فوران H2/5 (α)", fa:"فوران آلفا", lo:7.3, hi:7.5, mult:"m", integ:"—", note:"مجاور اکسیژن الکترونگاتیو؛ دی‌شیلدتر از β." },
    { cat:"heteroaromatic", group:"تیوفن H2/5 (α)", fa:"تیوفن آلفا", lo:7.2, hi:7.4, mult:"dd", integ:"—", note:"J(2,3)>J(3,4) برخلاف فوران/پیرول — افتراق‌دهنده." }
  ];

  /* ------------------------------------------------------------------ */
  /* ۲) کتابخانهٔ تفصیلی ¹³C                                             */
  /* هر رکورد: {cat, group, fa, lo, hi, dept, note}                     */
  /* ------------------------------------------------------------------ */
  var C13 = [
    { cat:"sp3", group:"C–I (اثر اتم سنگین)", fa:"کربن متصل به ید", lo:-24, hi:10, dept:"CH/CH₂", note:"آپ‌فیلد غیرعادی؛ CH₃I ~−۲۴. تلهٔ کلاسیک: با متیل انتهاییِ شیلدشده اشتباه نشود." },
    { cat:"sp3", group:"CH₃ آلکانی", fa:"متیل انتهایی", lo:8, hi:22, dept:"CH₃", note:"CH₃CO ~۳۰؛ CH₃ روی آروماتیک ~۲۰." },
    { cat:"sp3", group:"–CH₂– زنجیره", fa:"متیلن sp³", lo:20, hi:40, dept:"CH₂", note:"مرکز زنجیره‌های بلند؛ گرانت-پاول α+۹٫۱ β+۹٫۴ γ−۲٫۵." },
    { cat:"sp3", group:">CH– / >C<", fa:"متین/کواترنری آلیفاتیک", lo:25, hi:50, dept:"CH/Cq", note:"C(CH₃)₃ کواترنری ~۳۰–۳۵ (بدون سیگنال DEPT)." },
    { cat:"sp3", group:"C–Br", fa:"کربن برم‌دار", lo:20, hi:40, dept:"CH₂/CH", note:"اثر اتم سنگین متوسط؛ CHBr ~۴۵." },
    { cat:"sp3", group:"C–N (sp³)", fa:"کربن آمین/آمید آلیفاتیک", lo:40, hi:60, dept:"CH₂/CH", note:"–CH₂–NH₂ ~۴۰–۴۵." },
    { cat:"sp3", group:"C–Cl", fa:"کربن کلردار", lo:40, hi:52, dept:"CH₂/CH", note:"CHCl₂ ~۷۰؛ CCl₃ بالاتر." },
    { cat:"sp3", group:"O–CH₃", fa:"متوکسی", lo:52, hi:58, dept:"CH₃", note:"شاخص قطعی OMe؛ در استر/اتر آروماتیک." },
    { cat:"sp3", group:"C–O نوع اول", fa:"الکل/اتر ۱°", lo:58, hi:68, dept:"CH₂", note:"–CH₂OH در ۱-پروپانول ~۶۴٫۱." },
    { cat:"sp3", group:"C–O نوع ۲°/۳°", fa:"الکل/اتر ثانویه", lo:65, hi:78, dept:"CH", note:"CH–OH ~۶۵–۷۵." },
    { cat:"sp3", group:"O–CH–O", fa:"استال/کتال", lo:88, hi:108, dept:"CH/CH₂", note:"دو اکسیژن مجاور؛ شاخص محافظت کربونیل." },
    { cat:"sp", group:"C≡C", fa:"کربن آلکینی", lo:65, hi:90, dept:"C/CH", note:"آلکین انتهایی: ≡CH ~۷۰، ≡C– ~۸۴." },
    { cat:"sp", group:"C≡N نیتریل", fa:"کربن نیتریل", lo:115, hi:120, dept:"Cq", note:"شدت ضعیف (Cq)؛ IR ۲۲۵۰ مکمل." },
    { cat:"sp2", group:"C=C وینیلی", fa:"کربن آلکنی", lo:110, hi:145, dept:"CH/Cq", note:"انون β-کربن دی‌شیلد (~۱۵۰) به‌دلیل مزدوج‌شدگی." },
    { cat:"sp2", group:"Ar–CH", fa:"آروماتیک پروتون‌دار", lo:120, hi:132, dept:"CH", note:"بنزن ۱۲۸٫۵؛ با Z-افزایشی‌ها به تفکیک محاسبه." },
    { cat:"sp2", group:"Ar–C (ایپسو)", fa:"آروماتیک استخلاف‌دار", lo:125, hi:150, dept:"Cq", note:"در HSQC غایب؛ محل استخلاف با HMBC." },
    { cat:"sp2", group:"Ar–C–N (آنیلین ایپسو)", fa:"کربن آروماتیک متصل به N", lo:143, hi:150, dept:"Cq", note:"NH₂ ایپسو +۱۸ نسبت به بنزن." },
    { cat:"sp2", group:"Ar–C–O (فنول/آنیزول ایپسو)", fa:"کربن آروماتیک متصل به O", lo:155, hi:162, dept:"Cq", note:"OH ایپسو +۲۶٫۹، OMe +۳۱٫۴." },
    { cat:"hetAr", group:"پیریدین C2/6 (α)", fa:"پیریدین آلفا", lo:149, hi:151, dept:"CH", note:"القای N؛ دی‌شیلدترین کربن حلقه." },
    { cat:"hetAr", group:"پیریدین C4 (γ)", fa:"پیریدین گاما", lo:135, hi:137, dept:"CH", note:"پروتوناسیون → پیریدینیوم، C4 ~۱۰ ppm پایین‌تر." },
    { cat:"hetAr", group:"پیریدین C3/5 (β)", fa:"پیریدین بتا", lo:123, hi:125, dept:"CH", note:"کم‌ترین دی‌شیلدینگ حلقه." },
    { cat:"carbonyl", group:"C=O استر/اسید", fa:"کربونیل رزونانسی", lo:165, hi:175, dept:"Cq", note:"هترواتم اکسیژن با رزونانس شیلد می‌کند؛ زیر ۱۸۰." },
    { cat:"carbonyl", group:"C=O آمید", fa:"کربونیل آمیدی", lo:165, hi:178, dept:"Cq", note:"رزونانس N شیلد می‌کند." },
    { cat:"carbonyl", group:"C=O انیدرید", fa:"کربونیل انیدریدی", lo:165, hi:172, dept:"Cq", note:"دو باند IR ۱۸۱۰/۱۷۵۰ مکمل قطعی." },
    { cat:"carbonyl", group:"C=O کتون آریل/مزدوج", fa:"کتون مزدوج", lo:196, hi:200, dept:"Cq", note:"مزدوج‌شدگی کمی پایین‌تر از کتون خطی؛ IR ~۱۶۸۵." },
    { cat:"carbonyl", group:"C=O کتون خطی", fa:"کتون آلیفاتیک", lo:205, hi:215, dept:"Cq", note:"مرز قطعی با استر (>۱۹۰ کتون، <۱۸۰ استر)." },
    { cat:"carbonyl", group:"C=O کتون حلقهٔ ۵-عضوی", fa:"کتون با کشش حلقوی", lo:215, hi:222, dept:"Cq", note:"سیکلوپنتانون ~۲۲۰؛ کشش حلقه بالا می‌برد." },
    { cat:"carbonyl", group:"C=O آلدهید", fa:"کربونیل آلدهیدی", lo:190, hi:205, dept:"CH", note:"تنها کربونیلِ CH در DEPT (پروتون مستقیم)." }
  ];

  /* ------------------------------------------------------------------ */
  /* ۳) نمونه‌های کارشدهٔ همبستگی دوبعدی (از گزارش پیوست)                 */
  /* هر رکورد: {mol, fa, formula, method, obs, insight}                 */
  /* ------------------------------------------------------------------ */
  var TWOD = [
    { mol:"1-Propanol", fa:"۱-پروپانول", formula:"C3H8O", method:"COSY",
      obs:"δ۳٫۴۹ (OCH₂) ↔ δ۱٫۵۰ (CH₂ میانی) ↔ δ۰٫۸۵ (CH₃).",
      insight:"زنجیرهٔ پیوستهٔ COSY، اسکلت سه‌کربنی خطی را قطعی می‌کند؛ الگوی پایهٔ کالیبراسیون ردیابی زنجیره." },
    { mol:"1-Iodobutane", fa:"۱-یدوبوتان", formula:"C4H9I", method:"HSQC",
      obs:"H در δ۳٫۲ به کربنِ C–I در δ~۶٫۷ (بسیار آپ‌فیلد) وصل می‌شود.",
      insight:"تلهٔ اثر اتم سنگین: کربن C–I را با متیلِ انتهاییِ شیلدشده اشتباه نگیرید — HSQC اتصال درست H/C را روشن می‌کند." },
    { mol:"δ-Valerolactone", fa:"δ-والرولاکتون", formula:"C5H8O2", method:"COSY",
      obs:"O–CH₂ (δ۳٫۷۱) با کربونیل جفت نمی‌شود؛ زنجیرهٔ COSY بسته نمی‌شود.",
      insight:"شکاف کوپلاژ بین OCH₂ و کربونیل، حضور هترواتم بین آن‌ها و ساختار حلقوی استری را افشا می‌کند." },
    { mol:"3-Octanone", fa:"۳-اکتانون", formula:"C8H16O", method:"COSY",
      obs:"دو مسیر مجزا: CH₃(۰٫۸۲)→…→CH₂(۱٫۹۴) و CH₃(۰٫۹۲)→CH₂(۱٫۹۲)؛ کربونیل ۲۰۹.",
      insight:"با ردیابی دو مسیر کوپلاژ، هم‌پوشانی شدید ~۱٫۹ حل و دو بازوی نامتقارن کتون بازسازی می‌شود." },
    { mol:"Quinoline", fa:"کینولین", formula:"C9H7N", method:"HMBC/NOESY",
      obs:"۷H، ۹C مجزا؛ دو کربن بدون‌H از HMBC ³J قوی؛ دو پروتون لبه در NOESY فقط یک همسایهٔ فضایی دارند.",
      insight:"HMBC محل اتصال دو حلقه (کربن‌های تلاقی) و NOESY پروتون‌های لبهٔ سیستم حلقوی را مشخص می‌کند." },
    { mol:"Diethyl ethylmalonate", fa:"دی‌اتیل اتیل‌مالونات", formula:"C9H16O4", method:"HMBC",
      obs:"همبستگی پروتون مرکزی مالونات با کربن‌های استریِ هر دو بازو.",
      insight:"تقارن دو اتیل استری سیگنال‌ها را نصف می‌کند؛ HMBC اتصال دو بازوی متقارن به هستهٔ مرکزی را اثبات می‌کند." },
    { mol:"4-Ethylacetophenone", fa:"۴-اتیل‌استوفنون", formula:"C10H12O", method:"HMBC",
      obs:"متیل فقط با کربنِ کربونیل همبستگی دارد؛ اتیل به حلقه وصل است؛ الگوی کربن پارا-دواستخلافی.",
      insight:"HMBC استیل را روی کربونیل و اتیل را روی حلقه مکان‌یابی می‌کند — افتراق قطعی از ایزومر ایندانونی." },
    { mol:"3,3-Dimethylindanone", fa:"۳،۳-دی‌متیل‌ایندانون", formula:"C11H12O", method:"HMBC",
      obs:"یک پروتون آروماتیک با کربنِ کربونیل ³J دارد.",
      insight:"این همبستگی اتصال مستقیم کربونیل به حلقهٔ آروماتیک را ثابت و سایر ایزومرهای ایندانون را حذف می‌کند." },
    { mol:"Thymol", fa:"تیمول", formula:"C10H14O", method:"HMBC",
      obs:"همبستگی قوی پروتون‌های یک متیلِ ایزوپروپیل با کربنِ متیلِ مجاور.",
      insight:"تلهٔ استثنایی: این سیگنالِ به‌ظاهر تک‌پیوندیِ قوی در واقع ³J درون ایزوپروپیل است؛ نباید تک‌پیوندی HSQC تفسیر شود." },
    { mol:"Nerol vs Geraniol", fa:"نرول در برابر ژرانیول (سیس/ترانس)", formula:"C10H18O", method:"NOESY",
      obs:"نرول (سیس): وینیل↔متیلِ همسایه و CH₂OH↔CH₂ مجاور. ژرانیول (ترانس): CH₂OH↔متیل.",
      insight:"NOESY تنها ابزار قطعی افتراق این دو ایزومر هندسی با طیف‌های یک‌بعدی تقریباً یکسان است." },
    { mol:"2-Bromo-2-butene", fa:"۲-برومو-۲-بوتن (E/Z)", formula:"C4H7Br", method:"NOESY",
      obs:"ایزومر E: دو متیلِ سیس به‌هم → پیک تقاطعی قوی متیل↔متیل. ایزومر Z: متیل↔وینیل.",
      insight:"شدت پیک‌های تقاطعی فضایی، پیکربندی E/Z را بدون ابهام برچسب‌گذاری می‌کند." },
    { mol:"1,5- vs other dichloronaphthalene", fa:"دی‌کلرونفتالین (تلهٔ ۱،۵)", formula:"C10H6Cl2", method:"J-analysis",
      obs:"در ۱،۵ همهٔ پروتون‌ها باید J ارتو >۷ Hz داشته باشند؛ اما یک پروتون منزوی فقط J متا ~۲٫۷ نشان می‌دهد.",
      insight:"عدم تطابق J، ایزومر ۱،۵ را رد و ساختاری با پروتون منزوی در نقطهٔ تلاقی را اثبات می‌کند." }
  ];

  /* ------------------------------------------------------------------ */
  /* ۳.۵) قواعد افزایشی گرانت-پاول برای ¹³C آلیفاتیک (نقص واقعی: پیش از  */
  /* این، فقط جدول Z آروماتیک (c13BenzeneIncrements) موجود بود).         */
  /* δC = −2.3 + Σ(n_k · A_k) + Σ اصلاح فضایی S.  پایه = متان (−۲٫۳).     */
  /* ------------------------------------------------------------------ */
  if (!DB.c13AliphaticIncrements) {
    DB.c13AliphaticIncrements = {
      base: -2.3,
      baseFa: "متان (نقطهٔ صفر گرانت-پاول)",
      positions: [
        { pos: "alpha", fa: "آلفا (کربن مستقیماً متصل)", A: 9.1, note: "دی‌شیلدینگ قوی؛ هر کربن α مقدار را +۹٫۱ می‌برد." },
        { pos: "beta", fa: "بتا (دو پیوند فاصله)", A: 9.4, note: "بیشترین اثر دی‌شیلد؛ +۹٫۴ به‌ازای هر کربن β." },
        { pos: "gamma", fa: "گاما (سه پیوند فاصله)", A: -2.5, note: "اثر پوششی γ-gauche (فشردگی فضایی) → کاهش فرکانس." },
        { pos: "delta", fa: "دلتا (چهار پیوند)", A: 0.3, note: "اثر کوچک مثبت." },
        { pos: "epsilon", fa: "اپسیلون (پنج پیوند)", A: 0.2, note: "اثر بسیار کوچک؛ اغلب صرف‌نظرپذیر." }
      ],
      stericCorrection: {
        fa: "اصلاح فضایی S (برای کربن‌های نوع سوم/چهارم)",
        note: "برای اسکلت‌های منشعب، ازدحام الکترونی روی کربن‌های ۳° و ۴° یک تصحیح منفی S اعمال می‌کند؛ غفلت از آن در هیدروکربن‌های پیچیده انحراف شدید می‌دهد."
      },
      ref: "گرانت-پاول (Grant–Paul)؛ مکمل مدل لیندمن-آدامز برای تفکیک کربن ۱°/۲°/۳°/۴°."
    };
    console.log("[nmr-peak-library] DB.c13AliphaticIncrements (گرانت-پاول) افزوده شد.");
  }

  /* ------------------------------------------------------------------ */
  /* ۴) افزودن به DB با گارد ضدتکرار (idempotent)                        */
  /* ------------------------------------------------------------------ */
  function attach(key, arr, keyer) {
    if (!Array.isArray(DB[key])) DB[key] = [];
    var seen = {};
    DB[key].forEach(function (x) { seen[keyer(x)] = true; });
    var added = 0;
    arr.forEach(function (x) {
      var k = keyer(x);
      if (!seen[k]) { DB[key].push(x); seen[k] = true; added++; }
    });
    return added;
  }
  var aH1 = attach("h1PeakLibrary", H1, function (x) { return (x.group || "") + "|" + x.lo + "|" + x.hi; });
  var aC13 = attach("c13PeakLibrary", C13, function (x) { return (x.group || "") + "|" + x.lo + "|" + x.hi; });
  var a2D = attach("twoDReference", TWOD, function (x) { return (x.mol || "") + "|" + (x.method || ""); });

  /* --- زیرناحیه‌های جدید و صحیح برای DB.c13Detailed (خودکار در یابندهٔ ¹³C ظاهر می‌شوند) --- */
  var C13_SUB = [
    { min: 88, max: 108, fa: "O–CH–O استال/کتال (دواکسیژنه)", ex: "بنزآلدهید دی‌متیل‌استال ~۱۰۳؛ ۱،۳-دی‌اکسان ~۹۴" },
    { min: 196, max: 200, fa: "C=O کتون آریل/مزدوج (پایین‌تر از کتون خطی)", ex: "استوفنون ~۱۹۸؛ پروپیوفنون ~۲۰۰" },
    { min: 149, max: 151, fa: "C آلفای پیریدین (C2/6)", ex: "پیریدین ~۱۵۰؛ کینولین C2 مشابه" }
  ];
  var aSub = attach("c13Detailed", C13_SUB, function (x) { return x.min + "|" + x.max + "|" + (x.fa || "").slice(0, 12); });

  /* --- مثال‌های تقارن جدید برای DB.nmrEnvironmentExamples --- */
  var ENV = [
    { name: "۱-پروپانول (C3H8O)", h: 3, c: 3, note: "زنجیرهٔ خطی نامتقارن؛ سه محیط H و سه محیط C." },
    { name: "کینولین (C9H7N)", h: 7, c: 9, note: "دو حلقهٔ جوش‌خورده؛ ۷ پروتون و ۹ کربن مجزا (بدون تقارن)." },
    { name: "دی‌اتیل اتیل‌مالونات (C9H16O4)", h: 4, c: 5, note: "تقارن دو اتیل استری؛ سیگنال‌ها نصف فرمول." },
    { name: "δ-والرولاکتون (C5H8O2)", h: 4, c: 5, note: "حلقهٔ استری؛ OCH₂ و کربونیل بدون کوپلاژ COSY." }
  ];
  var aEnv = attach("nmrEnvironmentExamples", ENV, function (x) { return x.name; });

  console.log("[nmr-peak-library] افزوده شد → h1PeakLibrary:+" + aH1 +
    " c13PeakLibrary:+" + aC13 + " twoDReference:+" + a2D +
    " c13Detailed:+" + aSub + " nmrEnvironmentExamples:+" + aEnv);

  /* ================================================================== */
  /* ۵) تزریق رابط کاربری (الگوی خوداتکای field-ui.js)                   */
  /* ================================================================== */
  var CAT_H1 = {
    aliphatic: "آلیفاتیک اشباع", alpha: "α به غیراشباع/کشنده", hetero: "متصل به O/N/X",
    vinyl: "وینیلی", aromatic: "آروماتیک", carbonylH: "کربونیل-H", exchange: "تعویض‌پذیر",
    heteroaromatic: "هترو-آروماتیک"
  };
  var CAT_C13 = {
    sp3: "sp³ (اشباع)", sp: "sp (آلکین/نیتریل)", sp2: "sp² (آلکن/آروماتیک)",
    hetAr: "هترو-آروماتیک", carbonyl: "کربونیل"
  };

  function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
  function rng(lo, hi) { return lo === hi ? ("" + lo) : (lo + "–" + hi); }

  function h1RowsHtml() {
    return H1.map(function (r) {
      return '<tr data-fa="' + esc((r.fa + " " + r.group + " " + (r.note || "")).toLowerCase()) + '">' +
        '<td><span class="en">δ ' + rng(r.lo, r.hi) + '</span></td>' +
        '<td>' + esc(r.fa) + '<br><span style="font-size:var(--fs-xs);color:var(--muted)">' + esc(r.group) + '</span></td>' +
        '<td class="en">' + esc(r.mult) + '</td>' +
        '<td class="en">' + esc(r.integ) + '</td>' +
        '<td style="font-size:var(--fs-xs);color:var(--muted)">' + esc(r.note) + '</td></tr>';
    }).join("");
  }
  function c13RowsHtml() {
    return C13.map(function (r) {
      return '<tr data-fa="' + esc((r.fa + " " + r.group + " " + (r.note || "")).toLowerCase()) + '">' +
        '<td><span class="en">δ ' + rng(r.lo, r.hi) + '</span></td>' +
        '<td>' + esc(r.fa) + '<br><span style="font-size:var(--fs-xs);color:var(--muted)">' + esc(r.group) + '</span></td>' +
        '<td class="en">' + esc(r.dept) + '</td>' +
        '<td style="font-size:var(--fs-xs);color:var(--muted)">' + esc(r.note) + '</td></tr>';
    }).join("");
  }
  function twoDRowsHtml() {
    return TWOD.map(function (r) {
      return '<tr data-fa="' + esc((r.fa + " " + r.mol + " " + r.method + " " + r.insight).toLowerCase()) + '">' +
        '<td>' + esc(r.fa) + '<br><span class="en" style="font-size:var(--fs-xs);color:var(--muted)">' + esc(r.formula) + '</span></td>' +
        '<td><span class="en">' + esc(r.method) + '</span></td>' +
        '<td style="font-size:var(--fs-sm)">' + esc(r.obs) + '</td>' +
        '<td style="font-size:var(--fs-xs);color:var(--muted)">' + esc(r.insight) + '</td></tr>';
    }).join("");
  }

  function buildCard(opts) {
    // opts: {id, color, title, icon, intro, filterId, tableHtml}
    var card = document.createElement("div");
    card.className = "card span-all";
    card.style.borderColor = "var(--" + opts.color + ")";
    card.innerHTML =
      '<h3>' + opts.title + ' <span class="ic">' + opts.icon + '</span></h3>' +
      '<div class="note blue">' + opts.intro + '</div>' +
      '<input id="' + opts.filterId + '" type="text" placeholder="جستجو در جدول (نام گروه، توضیح، تکنیک)…" ' +
      'style="width:100%;margin:6px 0;padding:8px;border-radius:8px;border:1px solid var(--muted);background:transparent;color:inherit">' +
      '<div style="overflow:auto;max-height:520px">' + opts.tableHtml + '</div>';
    return card;
  }

  function wireFilter(inputId, tableId) {
    var inp = document.getElementById(inputId);
    var tbl = document.getElementById(tableId);
    if (!inp || !tbl) return;
    inp.addEventListener("input", function () {
      var q = inp.value.trim().toLowerCase();
      tbl.querySelectorAll("tbody tr").forEach(function (tr) {
        var hay = tr.getAttribute("data-fa") || "";
        tr.style.display = (!q || hay.indexOf(q) !== -1) ? "" : "none";
      });
    });
  }

  function injectAfter(anchorId, card) {
    var anchor = document.getElementById(anchorId);
    if (!anchor) return false;
    // نزدیک‌ترین کارت والد را پیدا کن و کارت جدید را بعد از آن درج کن
    var host = anchor.closest ? anchor.closest(".card") : null;
    if (host && host.parentNode) { host.parentNode.insertBefore(card, host.nextSibling); return true; }
    // در غیر این‌صورت، به گرید فاز الحاق کن
    var grid = anchor.closest ? anchor.closest(".grid") : null;
    if (grid) { grid.appendChild(card); return true; }
    return false;
  }

  function initUI() {
    // جلوگیری از تزریق دوباره
    if (document.getElementById("nmr-h1-lib-table")) return;

    /* --- کارت ¹H در فاز ۳ (سبز) --- */
    var h1Card = buildCard({
      id: "nmr-h1-lib", color: "green", icon: "📖", filterId: "nmr-h1-lib-filter",
      title: "۷) کتابخانهٔ تفصیلی پیک‌های ¹H — به تفکیک گروه عاملی",
      intro: "بیش از ۵۰ محیط پروتونی با بازهٔ دقیق δ، تعدد نوعی، انتگرال و نکتهٔ تشخیصی. مکملِ «یابندهٔ محیط ¹H».",
      tableHtml: '<table id="nmr-h1-lib-table" style="width:100%;border-collapse:collapse">' +
        '<thead><tr><th>δ (ppm)</th><th>محیط</th><th>تعدد</th><th>انتگرال</th><th>نکتهٔ تشخیصی</th></tr></thead>' +
        '<tbody>' + h1RowsHtml() + '</tbody></table>'
    });
    if (injectAfter("h1-finder-list", h1Card)) wireFilter("nmr-h1-lib-filter", "nmr-h1-lib-table");

    /* --- کارت ¹³C در فاز ۲ (بنفش) --- */
    var c13Card = buildCard({
      id: "nmr-c13-lib", color: "purple", icon: "📖", filterId: "nmr-c13-lib-filter",
      title: "۷) کتابخانهٔ تفصیلی پیک‌های ¹³C — با نوع DEPT",
      intro: "محیط‌های کربنی با بازهٔ δ، طبقه‌بندی DEPT (CH₃/CH₂/CH/Cq) و نکتهٔ تشخیصی. مکملِ «یابندهٔ محیط ¹³C».",
      tableHtml: '<table id="nmr-c13-lib-table" style="width:100%;border-collapse:collapse">' +
        '<thead><tr><th>δ (ppm)</th><th>محیط</th><th>DEPT</th><th>نکتهٔ تشخیصی</th></tr></thead>' +
        '<tbody>' + c13RowsHtml() + '</tbody></table>'
    });
    if (injectAfter("c13-finder-list", c13Card)) wireFilter("nmr-c13-lib-filter", "nmr-c13-lib-table");

    /* --- کارت دوبعدی در فاز ۴ (فیروزه‌ای) --- */
    var twoDCard = buildCard({
      id: "nmr-2d-ref", color: "cyan", icon: "🔗", filterId: "nmr-2d-ref-filter",
      title: "نمونه‌های کارشدهٔ همبستگی دوبعدی (COSY/HSQC/HMBC/NOESY)",
      intro: "منطق استنتاجی مولکول‌های کلیدی از گزارش مرجع: چه همبستگی‌ای، چه نتیجه‌ای. برای آموزش تفسیر ۲D و افتراق ایزومرها.",
      tableHtml: '<table id="nmr-2d-ref-table" style="width:100%;border-collapse:collapse">' +
        '<thead><tr><th>مولکول</th><th>تکنیک</th><th>مشاهده</th><th>نتیجهٔ استنتاجی</th></tr></thead>' +
        '<tbody>' + twoDRowsHtml() + '</tbody></table>'
    });
    // لنگر فاز ۴: کارت‌های آن border --cyan/--purple دارند؛ به گرید فاز ۴ الحاق می‌کنیم
    var p4 = document.getElementById("phase4");
    if (p4) {
      var grid4 = p4.querySelector(".grid");
      if (grid4) { grid4.appendChild(twoDCard); wireFilter("nmr-2d-ref-filter", "nmr-2d-ref-table"); }
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initUI);
  } else {
    initUI();
  }

})(typeof window !== "undefined" ? window : globalThis);
