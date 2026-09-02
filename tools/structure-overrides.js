/* =====================================================================
   tools/structure-overrides.js — اسکلتِ دستی برای ترکیب‌هایی که شمارش
   خودش حل نمی‌کند
   ---------------------------------------------------------------------
   tools/derive-bonds.js دو جا از حل‌کردن بازمی‌ماند و هر دو این‌جا حل
   می‌شوند:

     ۱) «مبهم» — دنبالهٔ درجه بیش از یک مولکولِ ممکن می‌دهد و تفاوتشان
        شیمی است نه شمارش:

            [methyl, ketone, ether_o, ethyl]
              methyl–CO–O–ethyl  =  اتیل استات
              methyl–O–CO–ethyl  =  متیل پروپانوات

        هر دو C4H8O2 و هر دو گرافِ معتبر. فقط نامِ خودِ ترکیب می‌گوید
        کدام است. این‌جا فقط bonds لازم است.

     ۲) «ناممکن» — هیچ گرافِ معتبری وجود ندارد، یعنی خودِ زنجیره غلط یا
        ناقص است. نمونه‌ها: زنجیرهٔ ۱،۴-دی‌کلروبوتان فقط دو CH₂ داشت
        (C2H4Cl2 به‌جای C4H8Cl2)، و زنجیرهٔ یدواتان بلوکِ chloro داشت.
        این‌جا chain هم نوشته می‌شود.

   چرا این‌جا و نه در خودِ data/*.js؟ بخشی از این زنجیره‌ها را
   derive-signatures.js تولید کرده است؛ اگر همان‌جا دستکاری می‌شدند، با
   اجرای دوبارهٔ آن ابزار پاک می‌شدند. یک‌جا بودنِ همهٔ اصلاح‌های اسکلتی
   بازبینی را هم ساده می‌کند.

   قالب:
     "English name": {
       chain: ["...", ...],      اختیاری — فقط وقتی زنجیرهٔ ثبت‌شده غلط است
       bonds: [[i, j], ...],     اندیس روی chain (همین‌جا اگر داده شده)
       why:   "چرا این و نه آن یکی"
     }

   هیچ ورودی‌ای بی‌بررسی پذیرفته نمی‌شود. derive-bonds.js هر کدام را
   می‌سنجد و اگر درجهٔ بلوکی با تعدادِ یال‌هایش نخواند، گراف تکه‌تکه باشد،
   یا فرمولِ مولکولِ سرِهم‌شده با فرمولِ خودِ رکورد فرق کند، با خطا
   می‌ایستد. پس اشتباهِ تایپی این‌جا بی‌صدا وارد پایگاه نمی‌شود.

   وقتی chain نوشته می‌شود، *همهٔ* رکوردهای هم‌نام همان زنجیره را
   می‌گیرند — چند ترکیب در پایگاه دو رکورد با دو زنجیرهٔ متفاوت دارند.
   ===================================================================== */
"use strict";

module.exports = {

  /* ==================================================================
     الف) زنجیره درست بود، فقط اتصال مبهم بود
     ================================================================== */

  /* هر سهٔ این‌ها دو رکورد با دو زنجیرهٔ متفاوت دارند؛ زنجیرهٔ کوتاه‌ترِ
     مرجع گروهِ عاملی را درست‌تر نام می‌برد (ester_co / acyl به‌جای
     ketone+ether_o) و برای هر دو رکورد نوشته می‌شود. */
  "Ethyl acetate": {
    chain: ["methyl", "ester_co", "ethyl"],
    bonds: [[0, 1], [1, 2]],
    slots: { 1: [0, 2] },
    why: "متیل روی کربنِ کربونیل و اتیل روی اکسیژنِ استری. اگر برعکس " +
         "بنشینند متیل پروپانوات درمی‌آید — همان C4H8O2 ولی ترکیبِ دیگری. " +
         "این را فقط slots حل می‌کند، چون یالِ bonds بینِ بلوک‌هاست نه اتم‌ها"
  },
  "Phenylacetone": {
    chain: ["benzyl", "ketone", "methyl"],
    bonds: [[0, 1], [1, 2]],
    why: "PhCH₂–CO–CH₃. با زنجیرهٔ [phenyl, ch2, ketone, methyl] سیم‌کشیِ " +
         "رقیب Ph–CO–CH₂CH₃ یعنی پروپیوفنون بود؛ بلوکِ benzyl ابهام را می‌بندد"
  },
  "4-t-Butylacetophenone": {
    chain: ["tbutyl", "phenylene_p", "acyl"],
    bonds: [[0, 1], [1, 2]],
    why: "tBu–C₆H₄–CO–CH₃: بلوکِ acyl خودش استیلِ کامل است، پس جای " +
         "کربونیل و متیل دیگر قابلِ جابه‌جایی نیست"
  },
  "Diethyl carbonate": {
    bonds: [[0, 1], [1, 2], [2, 3]],
    slots: { 1: [2, 0] },
    why: "EtO–CO–OEt: کربنِ کربونیل به اکسیژنِ اتری می‌رود و اکسیژنِ خودِ " +
         "استر به اتیل. برعکسش استرِ ساده می‌ساخت نه کربنات"
  },
  "2,6-Dibromoaniline": {
    bonds: [[0, 1], [0, 2], [0, 3]],
    slots: { 0: [2, 1, 3] },
    why: "آمین باید *وسطِ* الگوی ۱،۲،۳ بنشیند (دو برم دو طرفش)؛ کنارنشستنش " +
         "۲،۳-دی‌برومو می‌ساخت و شمارِ محیط‌ها را از چهار به شش می‌برد"
  },
  "3-Nitro-o-xylene": {
    bonds: [[0, 1], [1, 2], [1, 3]],
    slots: { 1: [0, 2, 3] },
    why: "دو متیل مجاورِ هم (۱ و ۲) و نیترو در موقعیتِ ۳"
  },
  "4,6-Diiodo-1,3-dimethoxybenzene": {
    bonds: [[0, 1], [0, 2], [0, 3], [0, 4]],
    slots: { 0: [3, 1, 2, 4] },
    why: "الگوی ۱،۲،۴،۵: هر متوکسی بینِ دو ید می‌نشیند، پس مولکول دو محورِ " +
         "تقارن دارد و ¹³C فقط چهار سیگنال می‌دهد"
  },
  "Tetraethylene glycol ditosylate": {
    bonds: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8],
            [8, 9], [9, 10], [10, 11], [11, 12], [12, 13], [13, 14]],
    slots: { 1: [0, 2], 13: [14, 12] },
    why: "گوگردِ هر تسیلات به حلقهٔ تولیل می‌چسبد و اکسیژنِ سولفوناتش به " +
         "زنجیرهٔ گلیکول — برعکسش تولیل را به اکسیژن وصل می‌کرد"
  },
  /* استرهایی که فقط جهتِ ester_co را کم داشتند. نقطه‌های اتصالِ این بلوک
     هم‌ارز نیستند — یکی کربنِ کربونیل است و دیگری اکسیژنِ استری — پس بدونِ
     میخِ اسلات هر کدام دو ساختارِ ممکن داشتند: استرِ وارونه ترکیبِ دیگری با
     همان فرمول است. شمارشِ ¹³C این را نمی‌گرفت، چون هر دو حالت به یک عدد
     می‌رسیدند؛ فقط آزمونِ ایزومورفیسم گرفتش. */
  "Methyl benzoate": {
    bonds: [[0, 1], [1, 2]], slots: { 1: [0, 2] },
    why: "PhCO–OMe، نه PhO–COMe"
  },
  "Methyl propanoate": {
    bonds: [[0, 1], [1, 2]], slots: { 1: [0, 2] },
    why: "EtCO–OMe؛ حالتِ وارونه اتیل استات می‌شد"
  },
  "Methyl propionate": {
    bonds: [[0, 1], [0, 2]], slots: { 0: [2, 1] },
    why: "همان متیل پروپانوات با ترتیبِ زنجیرهٔ دیگر"
  },
  "Ethyl nicotinate": {
    bonds: [[0, 1], [1, 2]], slots: { 1: [0, 2] },
    why: "پیریدین-۳-کربوکسیلاتِ اتیل: کربونیل روی حلقه"
  },
  "Methyl p-toluate": {
    bonds: [[0, 1], [1, 2]], slots: { 1: [0, 2] },
    why: "p-CH₃C₆H₄–CO–OMe"
  },
  "Butyl butyrate": {
    bonds: [[0, 1], [1, 2]], slots: { 1: [0, 2] },
    why: "PrCO–O–Bu: پروپیل روی کربونیل و بوتیل روی اکسیژن"
  },
  "Benzyl benzoate": {
    bonds: [[0, 1], [1, 2], [2, 3]], slots: { 1: [0, 2] },
    why: "PhCO–O–CH₂Ph: کربونیل روی حلقهٔ اول، متیلنِ بنزیلی روی اکسیژن"
  },
  "Diethyl malonate": {
    // دو رکورد با دو ترتیبِ متفاوت دارد؛ زنجیره صریح نوشته می‌شود تا
    // اندیس‌های bonds/slots برای هر دو یک معنی بدهند.
    chain: ["ethyl", "ester_co", "ch2", "ester_co", "ethyl"],
    bonds: [[0, 1], [1, 2], [2, 3], [3, 4]],
    slots: { 1: [2, 0], 3: [2, 4] },
    why: "EtO₂C–CH₂–CO₂Et: متیلنِ وسط بینِ دو استر. کربنِ کربونیلِ هر استر " +
         "به متیلن می‌رود و اکسیژنش به اتیل — برعکسش دی‌اتر می‌ساخت"
  },
  "t-Butyl acetoacetate": {
    bonds: [[0, 1], [1, 2], [2, 3], [3, 4]],
    slots: { 3: [2, 4] },
    why: "CH₃–CO–CH₂–CO–O–tBu: کتون و استر با یک متیلن فاصله"
  },
  "1-Indanone": {
    bonds: [[0, 1], [1, 2], [2, 3], [3, 0]],
    why: "کربونیل مستقیم روی حلقهٔ آروماتیک است (۱-ایندانون، نه ۲-)"
  },
  "2-Indanone": {
    bonds: [[0, 1], [1, 2], [2, 3], [3, 0]],
    why: "کربونیل وسطِ پلِ سه‌کربنه است، دو متیلن دو طرفش"
  },
  "alpha-Tetralone": {
    bonds: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 0]],
    why: "کربونیل مجاورِ حلقهٔ آروماتیک (موقعیت α)"
  },
  "beta-Tetralone": {
    bonds: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 0]],
    why: "یک متیلن بینِ حلقه و کربونیل (موقعیت β)"
  },
  "4'-Hydroxyvalerophenone": {
    bonds: [[0, 1], [0, 2], [2, 3]],
    why: "OH و زنجیرهٔ آسیل پارا نسبت به هم روی حلقه"
  },
  "2,5-Hexanedione": {
    bonds: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5]],
    why: "دو کتون با دو متیلن فاصله — دی‌کتونِ ۱،۴ (نه ۱،۲)"
  },
  "Diethyl oxalate": {
    bonds: [[0, 1], [0, 2], [2, 3], [3, 4], [4, 5]],
    why: "EtO–CO–CO–OEt: دو کربونیل مستقیم به هم چسبیده‌اند"
  },
  "Dimethyl succinate": {
    bonds: [[0, 1], [0, 2], [2, 3], [3, 4], [4, 5]],
    slots: { 0: [2, 1], 4: [3, 5] },
    why: "MeO₂C–CH₂CH₂–CO₂Me: کربنِ کربونیل رو به متیلن، اکسیژن رو به متیل"
  },
  "Methyl acetyllactate": {
    bonds: [[0, 1], [1, 2], [1, 3], [2, 4]],
    slots: { 2: [1, 4] },
    why: "CH₃CO–O–CH(CH₃)–CO–OCH₃: متینِ مرکزی حاملِ استوکسی، متیل و استر"
  },
  "Diethyl succinate": {
    bonds: [[0, 1], [0, 2], [2, 3], [3, 4], [4, 5]],
    slots: { 0: [2, 1], 4: [3, 5] },
    why: "EtO₂C–CH₂CH₂–CO₂Et. بدونِ میخِ اسلات از اتیلن‌گلیکول " +
         "دی‌پروپیونات تفکیک‌ناپذیر بود — همان C8H14O4"
  },
  "Ethylene glycol dipropionate": {
    chain: ["propanoyl", "ether_o", "ch2", "ch2", "ether_o", "propanoyl"],
    bonds: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5]],
    why: "EtCO–O–CH₂CH₂–O–COEt. با ester_co نوشته شده بود و آن‌وقت از " +
         "دی‌اتیل سوکسینات تفکیک‌ناپذیر می‌شد؛ propanoyl جهت‌دار است و ابهام را می‌بندد"
  },
  "Ethyl glycolate": {
    bonds: [[0, 1], [0, 2], [2, 3]],
    slots: { 0: [2, 1] },
    why: "HO–CH₂–CO–O–Et: هیدروکسیل روی کربنِ α نه روی استر"
  },
  "Ethyl cyanoacetate": {
    bonds: [[0, 1], [0, 2], [2, 3]],
    slots: { 0: [2, 1] },
    why: "NC–CH₂–CO–O–Et"
  },
  "4,4-Dimethoxy-2-butanone": {
    bonds: [[0, 1], [1, 2], [2, 3], [3, 4], [3, 5]],
    why: "CH₃CO–CH₂–CH(OMe)₂: هر دو متوکسی روی یک متین (استال)"
  },
  "4-(n-Butyl)benzyl chloride": {
    bonds: [[0, 1], [1, 2], [0, 3]],
    why: "کلر روی متیلنِ بنزیلی است نه روی حلقه"
  },
  "p-Methoxybenzyl alcohol (anisyl alcohol)": {
    bonds: [[0, 1], [0, 2], [2, 3]],
    why: "MeO–C₆H₄–CH₂–OH: الکلِ بنزیلی، متوکسی مستقیم روی حلقه"
  },
  "Ethyl p-aminobenzoate": {
    bonds: [[0, 1], [1, 2], [2, 3]],
    slots: { 2: [1, 3] },
    why: "H₂N–C₆H₄–CO–O–Et (بنزوکائین)"
  },
  "N-Isopropylbenzylamine": {
    bonds: [[0, 1], [1, 2], [2, 3]],
    why: "Ph–CH₂–NH–iPr: نیتروژن بینِ متیلنِ بنزیلی و ایزوپروپیل"
  },
  "Ethyl cyclobutanecarboxylate": {
    bonds: [[0, 1], [0, 2], [2, 3], [3, 4], [4, 5], [5, 2]],
    slots: { 0: [2, 1] },
    why: "حلقهٔ چهارعضوی بسته روی متین؛ استر بیرونِ حلقه"
  },
  "Ethyl p-ethoxybenzoate": {
    bonds: [[0, 1], [0, 2], [2, 3], [3, 4]],
    slots: { 3: [2, 4] },
    why: "EtO–C₆H₄–CO–O–Et: اترِ اتوکسی و استرِ اتیل، پارا"
  },
  "Dimethyl phthalate": {
    bonds: [[0, 1], [1, 2], [0, 3], [3, 4]],
    slots: { 1: [0, 2], 3: [0, 4] },
    why: "دو استر روی دو کربنِ مجاورِ حلقه (اورتو)؛ کربنِ کربونیل روی حلقه و اکسیژنِ استری روی گروهِ آلکیل"
  },
  "4-tert-Butylcyclohexanone": {
    bonds: [[0, 1], [1, 2], [2, 3], [3, 6], [6, 4], [4, 5], [5, 1]],
    why: "حلقهٔ شش‌عضوی؛ کربونیل و متینِ حاملِ ترت‌بوتیل در موقعیت ۱ و ۴"
  },
  "p-Anisyl tert-butyl ketone": {
    bonds: [[0, 1], [1, 2], [2, 3]],
    why: "MeO–C₆H₄–CO–tBu"
  },
  "4-(Methoxymethyl)phenol": {
    bonds: [[0, 1], [1, 2], [2, 3]],
    why: "HO–C₆H₄–CH₂–OMe: فنول روی حلقه، اترِ متیلی روی متیلن"
  },
  "Diethyl phthalate": {
    bonds: [[0, 1], [1, 2], [0, 3], [3, 4]],
    slots: { 1: [0, 2], 3: [0, 4] },
    why: "دو استر اورتو؛ کربنِ کربونیل روی حلقه و اکسیژنِ استری روی گروهِ آلکیل"
  },
  "Diethyl terephthalate": {
    bonds: [[0, 1], [1, 2], [0, 3], [3, 4]],
    slots: { 1: [0, 2], 3: [0, 4] },
    why: "دو استر پارا؛ کربنِ کربونیل روی حلقه و اکسیژنِ استری روی گروهِ آلکیل"
  },
  "Diethyl isophthalate": {
    bonds: [[0, 1], [1, 2], [0, 3], [3, 4]],
    slots: { 1: [0, 2], 3: [0, 4] },
    why: "دو استر متا؛ کربنِ کربونیل روی حلقه و اکسیژنِ استری روی گروهِ آلکیل"
  },
  "4-(n-Butyl)-α-chlorotoluene": {
    bonds: [[0, 1], [1, 2], [0, 3]],
    why: "همان ۴-(n-بوتیل)بنزیل کلرید: کلر روی متیلنِ α"
  },
  "4-Methyl-4-phenyl-2-pentanone": {
    bonds: [[0, 1], [1, 2], [1, 3], [1, 4], [4, 5]],
    why: "Ph–C(CH₃)₂–CH₂–CO–CH₃: کربنِ کواترنر حاملِ فنیل و دو متیل"
  },
  "p-Anisyl t-butyl ketone": {
    bonds: [[0, 1], [0, 2], [2, 3]],
    why: "همان ترکیبِ بالا با ترتیبِ زنجیرهٔ دیگر"
  },
  "3-Octanone": {
    bonds: [[0, 1], [1, 3], [3, 2]],
    why: "C₂H₅–CO–CH₂–C₄H₉: کربونیل در موقعیت ۳"
  },
  "Diethyleneglycol ethyl ether acetate": {
    bonds: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7]],
    why: "AcO–CH₂CH₂–O–CH₂CH₂–O–Et: زنجیرهٔ خطیِ استات/اتر/اتر"
  },

  /* ==================================================================
     ب) زنجیره پیوندِ دوگانه را گم کرده بود
     ------------------------------------------------------------------
     تنها بلوکِ آلکنیِ پایگاه «vinyl» بود که یک نقطهٔ اتصال دارد، یعنی
     فقط –CH=CH₂ انتهایی. هر آلکنِ درونی ناچار با ch/ch₂ نوشته می‌شد:
     فرمول درست درمی‌آمد ولی اسکلت اشباع می‌شد و مولکول فرق می‌کرد.
     بلوک‌های alkene_* برای همین اضافه شدند.
     ================================================================== */

  "2-Cyclohexen-1-one": {
    chain: ["ketone", "alkene_ch_ch", "ch2", "ch2", "ch2"],
    bonds: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 0]],
    why: "انونِ حلقوی: C=C مزدوج با کربونیل، نه دو متینِ اشباع"
  },
  "2-Cyclopentenone": {
    chain: ["ketone", "alkene_ch_ch", "ch2", "ch2"],
    bonds: [[0, 1], [1, 2], [2, 3], [3, 0]],
    why: "همان انونِ مزدوج در حلقهٔ پنج‌عضوی"
  },
  "2-Hydroxycyclohex-2-en-1-one": {
    chain: ["ketone", "alkene_c_ch", "hydroxyl", "ch2", "ch2", "ch2"],
    bonds: [[0, 1], [1, 2], [1, 3], [3, 4], [4, 5], [5, 0]],
    slots: { 1: [0, 2, 3] },
    why: "OH روی کربنِ سه‌استخلافیِ آلکن می‌نشیند (انولِ پایدارِ مزدوج)"
  },
  "1-Acetylcyclohexene": {
    chain: ["alkene_c_ch", "acyl", "ch2", "ch2", "ch2", "ch2"],
    bonds: [[0, 1], [0, 2], [2, 3], [3, 4], [4, 5], [5, 0]],
    slots: { 0: [1, 2, 5] },
    why: "استیل روی کربنِ سه‌استخلافیِ حلقهٔ سیکلوهگزن؛ کربنِ CH فقط یک " +
         "متیلنِ حلقه می‌گیرد"
  },
  "Cinnamaldehyde": {
    chain: ["phenyl", "alkene_ch_ch", "aldehyde"],
    bonds: [[0, 1], [1, 2]],
    why: "Ph–CH=CH–CHO: آلکنِ درونیِ مزدوج بینِ حلقه و آلدهید"
  },
  "Ethyl sorbate": {
    chain: ["ethyl", "ester_co", "alkene_ch_ch", "alkene_ch_ch", "methyl"],
    bonds: [[0, 1], [1, 2], [2, 3], [3, 4]],
    slots: { 1: [2, 0] },
    why: "دی‌انِ مزدوج: CH₃–CH=CH–CH=CH–CO₂Et"
  },
  "Mesityl oxide": {
    chain: ["alkene_c_ch", "methyl", "methyl", "acyl"],
    bonds: [[0, 1], [0, 2], [0, 3]],
    slots: { 0: [1, 2, 3] },
    why: "(CH₃)₂C=CH–CO–CH₃: دو متیل روی کربنِ استخلاف‌دارِ آلکن و استیل " +
         "روی کربنِ CH — جابه‌جایی‌شان ایزومرِ دیگری می‌سازد"
  },
  "Cycloheptatriene": {
    chain: ["alkene_ch_ch", "alkene_ch_ch", "alkene_ch_ch", "ch2"],
    bonds: [[0, 1], [1, 2], [2, 3], [3, 0]],
    why: "سه پیوندِ دوگانه و یک CH₂ اشباع در حلقهٔ هفت‌عضوی"
  },
  "Pentamethylcyclopentadiene": {
    chain: ["alkene_c_c", "alkene_c_c", "ch", "methyl", "methyl",
            "methyl", "methyl", "methyl"],
    bonds: [[0, 1], [0, 2], [1, 2], [0, 3], [0, 4], [1, 5], [1, 6], [2, 7]],
    slots: { 0: [2, 3, 1, 4], 1: [0, 5, 2, 6] },
    why: "دو آلکنِ چهاراستخلافی و یک متینِ sp³؛ پنج متیل روی پنج کربنِ حلقه. " +
         "میخِ اسلات می‌گوید کدام سرِ هر آلکن به حلقه و کدام به متیل می‌رود"
  },
  "2,3-Dichloropropene": {
    chain: ["alkene_c_ch2", "chloro", "ch2", "chloro"],
    bonds: [[0, 1], [0, 2], [2, 3]],
    why: "CH₂=C(Cl)–CH₂Cl: آلکنِ انتهایی، کلرِ وینیلی و کلرِ آلیلی"
  },
  "(2E,6Z)-Nonadienal": {
    chain: ["aldehyde", "alkene_ch_ch", "ch2", "ch2", "alkene_ch_ch", "ethyl"],
    bonds: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5]],
    why: "دو آلکنِ درونیِ جدا از هم (۲ و ۶)، نه مزدوج"
  },
  "Maleic acid": {
    chain: ["cooh", "alkene_ch_ch", "cooh"],
    bonds: [[0, 1], [1, 2]],
    why: "HOOC–CH=CH–COOH (ایزومرِ Z؛ گراف E/Z را تفکیک نمی‌کند)"
  },
  "Fumaric acid": {
    chain: ["cooh", "alkene_ch_ch", "cooh"],
    bonds: [[0, 1], [1, 2]],
    why: "همان اسکلت با هندسهٔ E — تفاوت فضایی است و در گراف دیده نمی‌شود"
  },
  "Nerol": {
    chain: ["alkene_c_ch", "methyl", "methyl", "ch2", "ch2",
            "alkene_c_ch", "methyl", "ch2", "hydroxyl"],
    bonds: [[0, 1], [0, 2], [0, 3], [3, 4], [4, 5], [5, 6], [5, 7], [7, 8]],
    slots: { 0: [1, 2, 3], 5: [4, 6, 7] },
    why: "مونوترپنِ خطی؛ تفاوتِ نرول و ژرانیول فقط هندسهٔ Z/E است"
  },
  "Geraniol": {
    chain: ["alkene_c_ch", "methyl", "methyl", "ch2", "ch2",
            "alkene_c_ch", "methyl", "ch2", "hydroxyl"],
    bonds: [[0, 1], [0, 2], [0, 3], [3, 4], [4, 5], [5, 6], [5, 7], [7, 8]],
    slots: { 0: [1, 2, 3], 5: [4, 6, 7] },
    why: "همان اسکلتِ نرول با هندسهٔ E روی پیوندِ دوگانهٔ ۲"
  },
  "But-3-yn-1-ol": {
    chain: ["alkyne_terminal", "ch2", "ch2", "hydroxyl"],
    bonds: [[0, 1], [1, 2], [2, 3]],
    why: "HC≡C–CH₂CH₂–OH: آلکینِ انتهایی، نه وینیل"
  },
  "3-Butyn-1-ol": {
    chain: ["alkyne_terminal", "ch2", "ch2", "hydroxyl"],
    bonds: [[0, 1], [1, 2], [2, 3]],
    why: "همان ترکیب با نامِ دیگر"
  },
  "5-Amino-1-pentyne": {
    chain: ["alkyne_terminal", "ch2", "ch2", "ch2", "amine1"],
    bonds: [[0, 1], [1, 2], [2, 3], [3, 4]],
    why: "HC≡C–CH₂CH₂CH₂–NH₂: سه متیلن، نه یکی"
  },

  /* ==================================================================
     پ) زنجیره اتم کم داشت یا بلوکِ غلط داشت
     ================================================================== */

  "Cyclopentanone": {
    chain: ["ketone", "ch2", "ch2", "ch2", "ch2"],
    bonds: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 0]],
    why: "حلقهٔ پنج‌عضوی؛ زنجیرهٔ قبلی فقط بلوکِ کربونیل را داشت"
  },
  "1,4-Cyclohexanedione": {
    chain: ["ketone", "ch2", "ch2", "ketone", "ch2", "ch2"],
    bonds: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 0]],
    why: "دو کربونیل در موقعیتِ ۱ و ۴ حلقهٔ شش‌عضوی"
  },
  "2-Phenylethanol": {
    chain: ["phenyl", "ch2", "ch2", "hydroxyl"],
    bonds: [[0, 1], [1, 2], [2, 3]],
    why: "پلِ دو متیلنی؛ «ethyl» انتهایی بود و وسط نمی‌نشست"
  },
  "Pinacol": {
    chain: ["cq", "cq", "methyl", "methyl", "methyl", "methyl",
            "hydroxyl", "hydroxyl"],
    bonds: [[0, 1], [0, 2], [0, 3], [0, 6], [1, 4], [1, 5], [1, 7]],
    why: "(CH₃)₂C(OH)–C(OH)(CH₃)₂: زنجیرهٔ قبلی فقط دو هیدروکسیل بود"
  },
  "1,1-Dichloroethane": {
    chain: ["methyl", "ch", "chloro", "chloro"],
    bonds: [[0, 1], [1, 2], [1, 3]],
    why: "هر دو کلر روی یک کربن (جمینال) — متین لازم است"
  },
  "1,4-Dichlorobutane": {
    chain: ["chloro", "ch2", "ch2", "ch2", "ch2", "chloro"],
    bonds: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5]],
    why: "چهار متیلن؛ زنجیرهٔ قبلی دو تا داشت و C2H4Cl2 می‌ساخت"
  },
  "1,3-Dibromopropane": {
    chain: ["bromo", "ch2", "ch2", "ch2", "bromo"],
    bonds: [[0, 1], [1, 2], [2, 3], [3, 4]],
    why: "سه متیلن بینِ دو برم"
  },
  "1-Bromo-3-chloropropane": {
    chain: ["bromo", "ch2", "ch2", "ch2", "chloro"],
    bonds: [[0, 1], [1, 2], [2, 3], [3, 4]],
    why: "سه متیلن؛ هالوژن‌های متفاوت روی دو سر"
  },
  "Alanine": {
    chain: ["methyl", "ch", "amine1", "cooh"],
    bonds: [[0, 1], [1, 2], [1, 3]],
    why: "کربنِ α حاملِ متیل، آمین و کربوکسیل — کربوکسیل جا افتاده بود"
  },
  "Threonine": {
    chain: ["methyl", "ch", "hydroxyl", "ch", "amine1", "cooh"],
    bonds: [[0, 1], [1, 2], [1, 3], [3, 4], [3, 5]],
    why: "دو متینِ پشتِ هم: یکی حاملِ OH، دیگری حاملِ NH₂ و COOH"
  },
  "2-Phenylpropanal": {
    chain: ["phenyl", "ch", "methyl", "aldehyde"],
    bonds: [[0, 1], [1, 2], [1, 3]],
    why: "متینِ α حاملِ فنیل، متیل و آلدهید"
  },
  "Acetylsalicylic acid": {
    chain: ["phenylene_o", "cooh", "acetoxy"],
    bonds: [[0, 1], [0, 2]],
    why: "کربوکسیل و استوکسی روی دو کربنِ مجاورِ حلقه"
  },
  "Aspirin": {
    chain: ["phenylene_o", "cooh", "acetoxy"],
    bonds: [[0, 1], [0, 2]],
    why: "همان استیل‌سالیسیلیک اسید"
  },
  "2-Phenoxyethanol": {
    chain: ["phenyl", "ether_o", "ch2", "ch2", "hydroxyl"],
    bonds: [[0, 1], [1, 2], [2, 3], [3, 4]],
    why: "Ph–O–CH₂CH₂–OH: دو متیلن بینِ اتر و الکل"
  },
  "4-Bromobutanenitrile": {
    chain: ["nitrile", "ch2", "ch2", "ch2", "bromo"],
    bonds: [[0, 1], [1, 2], [2, 3], [3, 4]],
    why: "سه متیلن بینِ نیتریل و برم"
  },
  "4-Bromobutyronitrile": {
    chain: ["bromo", "ch2", "ch2", "ch2", "nitrile"],
    bonds: [[0, 1], [1, 2], [2, 3], [3, 4]],
    why: "همان ترکیب با نامِ دیگر"
  },
  "1-Bromoethylbenzene": {
    chain: ["phenyl", "ch", "methyl", "bromo"],
    bonds: [[0, 1], [1, 2], [1, 3]],
    why: "Ph–CHBr–CH₃: برم روی کربنِ بنزیلی"
  },
  "2-Methyltetrahydrofuran": {
    chain: ["ether_o", "ch", "methyl", "ch2", "ch2", "ch2"],
    bonds: [[0, 1], [1, 2], [1, 3], [3, 4], [4, 5], [5, 0]],
    why: "حلقهٔ پنج‌عضویِ اکسیژن‌دار؛ متیل روی کربنِ مجاورِ اکسیژن"
  },
  "1-(4-Hydroxyphenyl)pentan-1-one": {
    chain: ["hydroxyl", "phenylene_p", "ketone", "butyl"],
    bonds: [[0, 1], [1, 2], [2, 3]],
    why: "زنجیرهٔ بوتیلِ کربونیل جا افتاده بود (پنتان-۱-اون)"
  },
  "o-Anisic acid (2-Methoxybenzoic acid)": {
    chain: ["methoxy", "phenylene_o", "cooh"],
    bonds: [[0, 1], [1, 2]],
    why: "متوکسی و کربوکسیل اورتو؛ حلقه دواستخلافی است نه تک‌استخلافی"
  },
  "Butyl ethyl ether": {
    chain: ["ethyl", "ether_o", "butyl"],
    bonds: [[0, 1], [1, 2]],
    why: "بوتیل بود نه پروپیل — C6H14O"
  },
  "Iodoethane": {
    chain: ["ethyl", "iodo"],
    bonds: [[0, 1]],
    why: "زنجیرهٔ ثبت‌شده بلوکِ chloro داشت در حالی که ترکیب یدید است"
  },
  "TMEDA": {
    chain: ["amine3_dimethyl", "ch2", "ch2", "amine3_dimethyl"],
    bonds: [[0, 1], [1, 2], [2, 3]],
    why: "هر دو نیتروژن سه‌شاخه و دی‌متیل‌اند؛ amine1 چهار متیل را گم می‌کرد"
  },
  "GABA": {
    chain: ["amine1", "ch2", "ch2", "ch2", "cooh"],
    bonds: [[0, 1], [1, 2], [2, 3], [3, 4]],
    why: "γ-آمینوبوتیریک اسید: سه متیلن، نه دو"
  },
  "Dibenzylamine": {
    chain: ["benzyl", "amine2", "benzyl"],
    bonds: [[0, 1], [1, 2]],
    why: "آمینِ ثانویه بینِ دو بنزیل — amine1 فقط یک اتصال دارد"
  },
  "Benzyl phenylacetate": {
    chain: ["phenyl", "ch2", "ester_co", "ch2", "phenyl"],
    bonds: [[0, 1], [1, 2], [2, 3], [3, 4]],
    why: "PhCH₂–CO–O–CH₂Ph: هر دو طرف یک متیلنِ بنزیلی دارد"
  },
  "Piperonal": {
    chain: ["benzene_124", "aldehyde", "ether_o", "ether_o", "ch2"],
    bonds: [[0, 1], [0, 2], [0, 3], [2, 4], [3, 4]],
    slots: { 0: [2, 3, 1] },
    why: "حلقهٔ دی‌اکسولِ جوش‌خورده. بلوکِ methylenedioxy دو یالِ موازی به " +
         "همان حلقهٔ بنزن می‌خواست که در گرافِ ساده ممکن نیست؛ با دو " +
         "ether_o و یک ch2 همان حلقه از اجزای جدا بسته می‌شود"
  },
  "3,3-Dimethylindan-1-one": {
    chain: ["phenylene_o", "ketone", "ch2", "cq", "methyl", "methyl"],
    bonds: [[0, 1], [1, 2], [2, 3], [3, 4], [3, 5], [3, 0]],
    why: "حلقهٔ پنج‌عضوی: Ar–CO–CH₂–C(CH₃)₂–Ar؛ متیلن جا افتاده بود"
  },
  "3,3-Dimethylindanone": {
    chain: ["phenylene_o", "ketone", "ch2", "cq", "methyl", "methyl"],
    bonds: [[0, 1], [1, 2], [2, 3], [3, 4], [3, 5], [3, 0]],
    why: "همان ترکیب؛ کربنِ کواترنر جا افتاده بود"
  },
  "Phenylacetaldehyde ethylene glycol acetal": {
    chain: ["phenyl", "ch2", "ch", "ether_o", "ch2", "ch2", "ether_o"],
    bonds: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 2]],
    why: "حلقهٔ ۱،۳-دی‌اکسولان بسته روی متینِ استالی"
  },
  "Phenylacetaldehyde dimethyl acetal": {
    chain: ["phenyl", "ch2", "ch", "methoxy", "methoxy"],
    bonds: [[0, 1], [1, 2], [2, 3], [2, 4]],
    why: "PhCH₂–CH(OMe)₂: متیلنِ بنزیلی جا افتاده بود"
  },
  "Ethyl 4-piperidone-1-carboxylate": {
    chain: ["ester_co", "ethyl", "amine3", "ch2", "ch2", "ketone", "ch2", "ch2"],
    bonds: [[0, 1], [0, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 2]],
    slots: { 0: [2, 1] },
    why: "حلقهٔ پیپریدین با نیتروژنِ سه‌شاخه؛ کربونیل در موقعیتِ ۴ (پارا به N)"
  },
  "Diethyl diethylmalonate": {
    chain: ["cq", "ethyl", "ethyl", "ester_co", "ethyl", "ester_co", "ethyl"],
    bonds: [[0, 1], [0, 2], [0, 3], [0, 5], [3, 4], [5, 6]],
    slots: { 3: [0, 4], 5: [0, 6] },
    why: "کربنِ مرکزی کواترنر است (دو اتیل و دو استر)، نه متین"
  },
  "1,4-Phenylene dipropionate": {
    chain: ["phenylene_p", "ether_o", "propanoyl", "ether_o", "propanoyl"],
    bonds: [[0, 1], [1, 2], [0, 3], [3, 4]],
    why: "دو استرِ پروپیونات روی دو اکسیژنِ فنولیِ پارا"
  },
  "Bromocyclopentane": {
    chain: ["ch", "ch2", "ch2", "ch2", "ch2", "bromo"],
    bonds: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 0], [0, 5]],
    why: "حلقهٔ پنج‌عضوی؛ برم روی متینِ حلقه"
  },
  "Dimethyl methylmalonate": {
    chain: ["ch", "methyl", "ester_co", "methyl", "ester_co", "methyl"],
    bonds: [[0, 1], [0, 2], [0, 4], [2, 3], [4, 5]],
    slots: { 2: [0, 3], 4: [0, 5] },
    why: "متینِ مرکزی حاملِ یک متیل و دو استر"
  },
  "Catechol": {
    chain: ["phenylene_o", "hydroxyl", "hydroxyl"],
    bonds: [[0, 1], [0, 2]],
    why: "دو هیدروکسیل روی کربن‌های مجاور — حلقه دواستخلافی است"
  },
  "Acetoin (3-hydroxybutan-2-one)": {
    chain: ["methyl", "ketone", "ch", "hydroxyl", "methyl"],
    bonds: [[0, 1], [1, 2], [2, 3], [2, 4]],
    why: "CH₃–CO–CH(OH)–CH₃: هیدروکسیل روی متینِ مجاورِ کربونیل"
  },
  "4-Hydroxy-4-methyl-2-pentanone (diacetone alcohol)": {
    chain: ["methyl", "ketone", "ch2", "cq", "hydroxyl", "methyl", "methyl"],
    bonds: [[0, 1], [1, 2], [2, 3], [3, 4], [3, 5], [3, 6]],
    why: "کربنِ حاملِ OH کواترنر است (دو متیل و متیلن)، نه متین"
  },
  "Diacetone alcohol": {
    chain: ["methyl", "ketone", "ch2", "cq", "hydroxyl", "methyl", "methyl"],
    bonds: [[0, 1], [1, 2], [2, 3], [3, 4], [3, 5], [3, 6]],
    why: "همان ترکیب؛ کربنِ کواترنر جا افتاده بود"
  },
  "Hexylamine": {
    chain: ["butyl", "ch2", "ch2", "amine1"],
    bonds: [[0, 1], [1, 2], [2, 3]],
    why: "شش کربن لازم است؛ زنجیرهٔ قبلی فقط یک متیلن داشت"
  },
  "tert-Amyl alcohol (2-methyl-2-butanol)": {
    chain: ["ethyl", "cq", "hydroxyl", "methyl", "methyl"],
    bonds: [[0, 1], [1, 2], [1, 3], [1, 4]],
    why: "الکلِ سوم: کربنِ حاملِ OH کواترنر است نه متین"
  },
  "Ethyl 2-bromopropionate": {
    chain: ["ester_co", "ethyl", "ch", "methyl", "bromo"],
    bonds: [[0, 1], [0, 2], [2, 3], [2, 4]],
    slots: { 0: [2, 1] },
    why: "برم روی کربنِ α؛ در زنجیرهٔ قبلی اصلاً نبود"
  },
  "1,3-Dioxane": {
    chain: ["ether_o", "ch2", "ether_o", "ch2", "ch2", "ch2"],
    bonds: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 0]],
    why: "دو اکسیژن با یک متیلن فاصله (موقعیتِ ۱ و ۳)"
  },
  "1,4-Dioxane": {
    chain: ["ether_o", "ch2", "ch2", "ether_o", "ch2", "ch2"],
    bonds: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 0]],
    why: "دو اکسیژن روبه‌روی هم (موقعیتِ ۱ و ۴) — تک‌سیگنالِ ¹³C از همین است"
  },
  "4-Chlorobutyl acetate": {
    chain: ["acetoxy", "ch2", "ch2", "ch2", "ch2", "chloro"],
    bonds: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5]],
    why: "چهار متیلن بینِ استات و کلر"
  },
  "4-Bromo-N,N-dimethylaniline": {
    chain: ["phenylene_p", "bromo", "amine3_dimethyl"],
    bonds: [[0, 1], [0, 2]],
    why: "نیتروژنِ دی‌متیله یک نقطهٔ اتصال دارد؛ amine3 سه‌تا می‌خواست"
  },
  "4-(Dimethylamino)benzonitrile": {
    chain: ["amine3_dimethyl", "phenylene_p", "nitrile"],
    bonds: [[0, 1], [1, 2]],
    why: "دی‌متیل‌آمینو و نیتریل پارا نسبت به هم"
  },
  "Methyl 2-methoxy-2-phenylacetate": {
    chain: ["phenyl", "ch", "methoxy", "ester_co", "methyl"],
    bonds: [[0, 1], [1, 2], [1, 3], [3, 4]],
    slots: { 3: [1, 4] },
    why: "متینِ α حاملِ فنیل، متوکسی و استر"
  },
  "N-Methylacetamide": {
    chain: ["methyl", "amide_n", "methyl"],
    bonds: [[0, 1], [1, 2]],
    why: "آمیدِ ثانویه: یک متیل روی کربونیل و یکی روی نیتروژن"
  },
  "Glycylglycine": {
    chain: ["amine1", "ch2", "amide_n", "ch2", "cooh"],
    bonds: [[0, 1], [1, 2], [2, 3], [3, 4]],
    slots: { 2: [1, 3] },
    why: "پیوندِ پپتیدی بینِ دو واحدِ گلیسین"
  },
  "Methyl 2,3-dibromo-3-(p-nitrophenyl)propionate": {
    chain: ["phenylene_p", "nitro", "ch", "ch", "ester_co", "methyl",
            "bromo", "bromo"],
    bonds: [[0, 1], [0, 2], [2, 3], [2, 6], [3, 4], [3, 7], [4, 5]],
    slots: { 4: [3, 5] },
    why: "دو برم روی دو کربنِ مجاور (۲ و ۳)؛ در زنجیرهٔ قبلی هیچ‌کدام نبودند"
  },
  "Quinoline": {
    chain: ["quinolinyl", "h"],
    bonds: [[0, 1]],
    why: "خودِ ترکیب یک بلوک است؛ نقطهٔ اتصالش با هیدروژن بسته می‌شود"
  },
  "Naphthalene": {
    chain: ["naphthyl", "h"],
    bonds: [[0, 1]],
    why: "همان حالت: نفتالنِ بی‌استخلاف"
  },
  "Phthalic anhydride": {
    chain: ["phenylene_o", "anhydride_co", "ether_o", "anhydride_co"],
    bonds: [[0, 1], [1, 2], [2, 3], [3, 0]],
    why: "انیدریدِ حلقوی: Ar–CO–O–CO–Ar. بلوکِ anhydride کل واحد را یک‌جا " +
         "می‌گیرد و دو یالِ موازی می‌خواهد؛ با دو نیمهٔ anhydride_co حلقه " +
         "بسته می‌شود و شاهدِ IR انیدرید هم می‌ماند"
  },

  /* ==================================================================
     ت) الگوی استخلافِ حلقه معلوم بود ولی benzene_tri نوشته شده بود
     ------------------------------------------------------------------
     benzene_tri یعنی «سه‌استخلافی با الگوی نامعلوم» و قالبِ اتمی ندارد،
     پس ماژولِ تقارن برایش سکوت می‌کند. در هر چهار مورد الگو از خودِ دادهٔ
     رکورد پیداست.
     ================================================================== */

  "4-Aminoacetophenone": {
    chain: ["amine1", "phenylene_p", "acyl"],
    bonds: [[0, 1], [1, 2]],
    why: "H₂N–C₆H₄–CO–CH₃. زنجیرهٔ چهاربلوکیِ بانکِ سوال بینِ این و " +
         "ایزومرِ دیگری مردد می‌ماند؛ acyl استیل را یک‌جا می‌گیرد. " +
         "(فرمولِ همین رکورد هم C8H9NO2 بود و به C8H9NO اصلاح شد)"
  },
  "Thymol": {
    chain: ["benzene_124", "hydroxyl", "isopropyl", "methyl"],
    bonds: [[0, 1], [0, 2], [0, 3]],
    slots: { 0: [2, 1, 3] },
    why: "خودِ رکورد نوارِ IR «۸۰۰ (OOP ۱،۲،۴)» را دارد — الگو معلوم است"
  },
  "Thymol/Carvacrol": {
    chain: ["benzene_124", "hydroxyl", "isopropyl", "methyl"],
    bonds: [[0, 1], [0, 2], [0, 3]],
    slots: { 0: [2, 1, 3] },
    why: "هر دو ایزومر الگوی ۱،۲،۴ دارند؛ تفاوتشان جای OH نسبت به iPr است"
  },
  "Phenacetin": {
    chain: ["phenylene_p", "ether_o", "ethyl", "amide_n", "methyl"],
    bonds: [[0, 1], [1, 2], [0, 3], [3, 4]],
    slots: { 3: [4, 0] },
    why: "حلقه دواستخلافیِ پاراست نه سه‌استخلافی (¹H: دو دوتاییِ ۲H)"
  },
  "N-Acetyl-2-amino-4-phenyl-(E)-but-2-enoic acid": {
    chain: ["phenyl", "ch2", "alkene_c_ch", "cooh", "amine2", "acyl"],
    bonds: [[0, 1], [1, 2], [2, 3], [2, 4], [4, 5]],
    slots: { 2: [3, 4, 1] },
    why: "¹H مولتی‌پلتِ ۵H دارد، یعنی حلقه تک‌استخلافی است؛ آلکنِ درونی " +
         "حاملِ COOH و NHAc است"
  }
};
