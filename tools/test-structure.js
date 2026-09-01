/* =====================================================================
   tools/test-structure.js — آزمونِ رگرسیونِ پارسر SMILES و موتورِ تقارن
   ---------------------------------------------------------------------
   چرا این فایل وجود دارد:
     js/structure.js تنها جایی است که پاسخِ خودِ دانشجو سنجیده می‌شود
     (prCheck در js/practice.js) و تنها جایی که «شمارش محیط‌ها» از آن
     می‌آید (runEnvCount در js/app.js). اگر این ماژول اشتباه بشمارد،
     برنامه به پاسخِ درست می‌گوید غلط — بدترین خطای ممکن برای یک ابزار
     آموزشی. با این حال تا امروز هیچ آزمونی نداشت.

   مقادیرِ مرجعِ این جدول با RDKit تولید شده‌اند (نسخهٔ ۲۰۲۶.۰۳.۵) و
   سپس در همین‌جا ثابت شده‌اند؛ پس اجرای آزمون هیچ وابستگی‌ای به
   پایتون یا RDKit ندارد و برنامه آفلاین و بدون‌وابستگی می‌ماند.
     - carbons / protons: شمارِ کلاس‌های هم‌ارزیِ توپولوژیک، از
       Chem.CanonicalRankAtoms(breakTies=False, includeChirality=False)
     - formula / totalH / dbe: از خودِ مولکولِ سنجیده‌شدهٔ RDKit

   دو خانوادهٔ خطایی که این جدول برای جلوگیری از بازگشتشان ساخته شد:
     ۱) فرمِ کِکوله تقارن را می‌شکست. تولوئنِ «CC1=CC=CC=C1» هفت محیط
        ¹³C می‌داد به‌جای پنج، نفتالین پنج به‌جای سه، پیریدین پنج به‌جای
        سه. ابزارهای رسمِ ساختار معمولاً همین فرم را می‌دهند، پس پاسخِ
        درستِ دانشجو رد می‌شد. (۳۱۶ مورد از ۱۲۷۴ بازنویسیِ تصادفی خطا
        داشت؛ اکنون صفر.)
     ۲) نویسهٔ «.» نادیده گرفته می‌شد، پس «CCO.CCO» یک زنجیرِ چهارکربنه
        خوانده می‌شد نه دو اتانول — فرمول و DBE و شمارِ محیط‌ها همه غلط.

   هر سطرِ جدول یک باگِ واقعی است که نباید برگردد.

   اجرا:  node tools/test-structure.js
          node tools/test-structure.js --verbose   (فهرستِ همهٔ سطرها)
   کدِ خروج ۱ اگر چیزی بشکند، پس در زنجیرهٔ ساخت جا می‌گیرد:
       derive-signatures → validate-database → test-inference →
       test-structure → build
   ===================================================================== */
"use strict";
const path = require("path");
const Structure = require(path.join(__dirname, "..", "js", "structure.js"));

const VERBOSE = process.argv.includes("--verbose");

/* [SMILES, نام, فرمول, C کل, H کل, DBE, محیط‌های ¹³C, محیط‌های ¹H] */
const CASES = [
  ["CC", "ethane", "C2H6", 2, 6, 0, 1, 1],
  ["CCC", "propane", "C3H8", 3, 8, 0, 2, 2],
  ["CCCC", "n-butane", "C4H10", 4, 10, 0, 2, 2],
  ["CC(C)C", "isobutane", "C4H10", 4, 10, 0, 2, 2],
  ["CC(C)(C)C", "neopentane", "C5H12", 5, 12, 0, 2, 1],
  ["CCCCCC", "n-hexane", "C6H14", 6, 14, 0, 3, 3],
  ["C1CCCCC1", "cyclohexane", "C6H12", 6, 12, 1, 1, 1],
  ["C1CCC1", "cyclobutane", "C4H8", 4, 8, 1, 1, 1],
  ["CO", "methanol", "CH4O", 1, 4, 0, 1, 2],
  ["CCO", "ethanol", "C2H6O", 2, 6, 0, 2, 3],
  ["CC(C)O", "isopropanol", "C3H8O", 3, 8, 0, 2, 3],
  ["CC(C)(C)O", "tert-butanol", "C4H10O", 4, 10, 0, 2, 2],
  ["OCCO", "ethylene glycol", "C2H6O2", 2, 6, 0, 1, 2],
  ["CCCCO", "n-butanol", "C4H10O", 4, 10, 0, 4, 5],
  ["CC(O)CC", "2-butanol", "C4H10O", 4, 10, 0, 4, 5],
  ["COC", "dimethyl ether", "C2H6O", 2, 6, 0, 1, 1],
  ["CCOCC", "diethyl ether", "C4H10O", 4, 10, 0, 2, 2],
  ["C1CCOC1", "THF", "C4H8O", 4, 8, 1, 2, 2],
  ["C1COCCO1", "1,4-dioxane", "C4H8O2", 4, 8, 1, 1, 1],
  ["C=O", "formaldehyde", "CH2O", 1, 2, 1, 1, 1],
  ["CC=O", "acetaldehyde", "C2H4O", 2, 4, 1, 2, 2],
  ["CCC=O", "propanal", "C3H6O", 3, 6, 1, 3, 3],
  ["CC(C)=O", "acetone", "C3H6O", 3, 6, 1, 2, 1],
  ["CCC(C)=O", "2-butanone", "C4H8O", 4, 8, 1, 4, 3],
  ["O=C1CCCCC1", "cyclohexanone", "C6H10O", 6, 10, 2, 4, 3],
  ["OC=O", "formic acid", "CH2O2", 1, 2, 1, 1, 2],
  ["CC(O)=O", "acetic acid", "C2H4O2", 2, 4, 1, 2, 2],
  ["CCC(O)=O", "propanoic acid", "C3H6O2", 3, 6, 1, 3, 3],
  ["OC(=O)C(O)=O", "oxalic acid", "C2H2O4", 2, 2, 2, 1, 1],
  ["COC(C)=O", "methyl acetate", "C3H6O2", 3, 6, 1, 3, 2],
  ["CCOC(C)=O", "ethyl acetate", "C4H8O2", 4, 8, 1, 4, 3],
  ["CC(N)=O", "acetamide", "C2H5NO", 2, 5, 1, 2, 2],
  ["CC(=O)Cl", "acetyl chloride", "C2H3ClO", 2, 3, 1, 2, 1],
  ["CC(=O)OC(C)=O", "acetic anhydride", "C4H6O3", 4, 6, 2, 2, 1],
  ["CN", "methylamine", "CH5N", 1, 5, 0, 1, 2],
  ["CCN", "ethylamine", "C2H7N", 2, 7, 0, 2, 3],
  ["CNC", "dimethylamine", "C2H7N", 2, 7, 0, 1, 2],
  ["CN(C)C", "trimethylamine", "C3H9N", 3, 9, 0, 1, 1],
  ["NCCN", "ethylenediamine", "C2H8N2", 2, 8, 0, 1, 2],
  ["CC#N", "acetonitrile", "C2H3N", 2, 3, 2, 2, 1],
  ["C#N", "hydrogen cyanide", "CHN", 1, 1, 2, 1, 1],
  ["CC[N+](=O)[O-]", "1-nitropropane", "C2H5NO2", 2, 5, 1, 2, 2],
  ["C[N+](=O)[O-]", "nitromethane", "CH3NO2", 1, 3, 1, 1, 1],
  ["CCl", "chloromethane", "CH3Cl", 1, 3, 0, 1, 1],
  ["ClCCl", "dichloromethane", "CH2Cl2", 1, 2, 0, 1, 1],
  ["ClC(Cl)Cl", "chloroform", "CHCl3", 1, 1, 0, 1, 1],
  ["ClC(Cl)(Cl)Cl", "carbon tetrachloride", "CCl4", 1, 0, 0, 1, 0],
  ["CCBr", "bromoethane", "C2H5Br", 2, 5, 0, 2, 2],
  ["BrCCBr", "1,2-dibromoethane", "C2H4Br2", 2, 4, 0, 1, 1],
  ["CC(Cl)Br", "1-bromo-1-chloroethane", "C2H4BrCl", 2, 4, 0, 2, 2],
  ["c1ccccc1", "benzene (aromatic form)", "C6H6", 6, 6, 4, 1, 1],
  ["C1=CC=CC=C1", "benzene (Kekule form)", "C6H6", 6, 6, 4, 1, 1],
  ["Cc1ccccc1", "toluene (aromatic)", "C7H8", 7, 8, 4, 5, 4],
  ["CC1=CC=CC=C1", "toluene (Kekule)", "C7H8", 7, 8, 4, 5, 4],
  ["Cc1ccccc1C", "o-xylene (aromatic)", "C8H10", 8, 10, 4, 4, 3],
  ["CC1=CC=CC=C1C", "o-xylene (Kekule)", "C8H10", 8, 10, 4, 4, 3],
  ["Cc1cccc(C)c1", "m-xylene (aromatic)", "C8H10", 8, 10, 4, 5, 4],
  ["CC1=CC(C)=CC=C1", "m-xylene (Kekule)", "C8H10", 8, 10, 4, 5, 4],
  ["Cc1ccc(C)cc1", "p-xylene (aromatic)", "C8H10", 8, 10, 4, 3, 2],
  ["CC1=CC=C(C)C=C1", "p-xylene (Kekule)", "C8H10", 8, 10, 4, 3, 2],
  ["Cc1cc(C)cc(C)c1", "mesitylene (aromatic)", "C9H12", 9, 12, 4, 3, 2],
  ["CC1=CC(C)=CC(C)=C1", "mesitylene (Kekule)", "C9H12", 9, 12, 4, 3, 2],
  ["CC(C)c1ccccc1", "cumene", "C9H12", 9, 12, 4, 6, 5],
  ["C=Cc1ccccc1", "styrene", "C8H8", 8, 8, 5, 6, 5],
  ["c1ccc2ccccc2c1", "naphthalene (aromatic)", "C10H8", 10, 8, 7, 3, 2],
  ["C1=CC2=CC=CC=C2C=C1", "naphthalene (Kekule)", "C10H8", 10, 8, 7, 3, 2],
  ["Oc1ccccc1", "phenol", "C6H6O", 6, 6, 4, 4, 4],
  ["COc1ccccc1", "anisole", "C7H8O", 7, 8, 4, 5, 4],
  ["Nc1ccccc1", "aniline", "C6H7N", 6, 7, 4, 4, 4],
  ["O=Cc1ccccc1", "benzaldehyde", "C7H6O", 7, 6, 5, 5, 4],
  ["CC(=O)c1ccccc1", "acetophenone", "C8H8O", 8, 8, 5, 6, 4],
  ["OC(=O)c1ccccc1", "benzoic acid", "C7H6O2", 7, 6, 5, 5, 4],
  ["Clc1ccccc1", "chlorobenzene", "C6H5Cl", 6, 5, 4, 4, 3],
  ["OCc1ccccc1", "benzyl alcohol", "C7H8O", 7, 8, 4, 5, 5],
  ["OCCc1ccccc1", "2-phenylethanol", "C8H10O", 8, 10, 4, 6, 6],
  ["N#Cc1ccccc1", "benzonitrile", "C7H5N", 7, 5, 6, 5, 3],
  ["[O-][N+](=O)c1ccccc1", "nitrobenzene (charged nitro)", "C6H5NO2", 6, 5, 5, 4, 3],
  ["O=[N+]([O-])c1ccc([N+](=O)[O-])cc1", "1,4-dinitrobenzene", "C6H4N2O4", 6, 4, 6, 2, 1],
  ["Oc1ccc(O)cc1", "hydroquinone", "C6H6O2", 6, 6, 4, 2, 2],
  ["Oc1ccccc1O", "catechol", "C6H6O2", 6, 6, 4, 3, 3],
  ["Cc1ccc(O)cc1", "p-cresol", "C7H8O", 7, 8, 4, 5, 4],
  ["O=C(c1ccccc1)c1ccccc1", "benzophenone", "C13H10O", 13, 10, 9, 5, 3],
  ["O=Cc1ccc(OC)cc1", "p-anisaldehyde", "C8H8O2", 8, 8, 5, 6, 4],
  ["Cc1ccc(C(C)C)cc1", "p-cymene", "C10H14", 10, 14, 4, 7, 5],
  ["CC(C)c1ccc(C)cc1O", "thymol-like", "C10H14O", 10, 14, 4, 9, 7],
  ["c1ccncc1", "pyridine (aromatic)", "C5H5N", 5, 5, 4, 3, 3],
  ["C1=CC=NC=C1", "pyridine (Kekule)", "C5H5N", 5, 5, 4, 3, 3],
  ["c1ccoc1", "furan", "C4H4O", 4, 4, 3, 2, 2],
  ["c1ccsc1", "thiophene", "C4H4S", 4, 4, 3, 2, 2],
  ["c1cc[nH]c1", "pyrrole", "C4H5N", 4, 5, 3, 2, 3],
  ["c1cnc[nH]1", "imidazole", "C3H4N2", 3, 4, 3, 3, 4],
  ["c1ccc2[nH]ccc2c1", "indole", "C8H7N", 8, 7, 6, 8, 7],
  ["c1ccc2ncccc2c1", "quinoline", "C9H7N", 9, 7, 7, 9, 7],
  ["CC(=O)[O-].[Na+]", "sodium acetate (2 components)", "C2H3NaO2", 2, 3, 1.5, 2, 1],
  ["[NH4+].[Cl-]", "ammonium chloride (2 components)", "H4ClN", 0, 4, -1, 0, 1],
  ["CCO.CCO", "two ethanols (duplicate components)", "C4H12O2", 4, 12, -1, 2, 3],
  ["CC(=O)[O-]", "acetate anion", "C2H3O2", 2, 3, 1.5, 2, 1],
  ["C[NH3+]", "methylammonium", "CH6N", 1, 6, -0.5, 1, 2],
  ["C[N+](C)(C)C", "tetramethylammonium", "C4H12N", 4, 12, -0.5, 1, 1],
  ["C/C=C/C", "trans-2-butene", "C4H8", 4, 8, 1, 2, 2],
  ["C/C=C\\C", "cis-2-butene", "C4H8", 4, 8, 1, 2, 2],
  ["CC=CC", "2-butene (no stereo)", "C4H8", 4, 8, 1, 2, 2],
  ["C=C", "ethene", "C2H4", 2, 4, 1, 1, 1],
  ["C#C", "ethyne", "C2H2", 2, 2, 2, 1, 1],
  ["CC#CC", "2-butyne", "C4H6", 4, 6, 2, 2, 1],
  ["C[C@H](O)CC", "(S)-2-butanol", "C4H10O", 4, 10, 0, 4, 5],
  ["C[C@@H](O)CC", "(R)-2-butanol", "C4H10O", 4, 10, 0, 4, 5],
  ["[CH3][CH2][OH]", "ethanol (all bracket atoms)", "C2H6O", 2, 6, 0, 2, 3],
  ["C%10CCCCC%10", "cyclohexane (%10 ring closure)", "C6H12", 6, 12, 1, 1, 1],
  ["OC(=O)CC(O)(CC(O)=O)C(O)=O", "citric acid", "C6H8O7", 6, 8, 3, 4, 4],
  ["NCC(O)=O", "glycine", "C2H5NO2", 2, 5, 1, 2, 3],
  ["CC(N)C(O)=O", "alanine", "C3H7NO2", 3, 7, 1, 3, 4],
  ["OC1C(O)C(O)C(O)C(O)C1O", "inositol-like hexol", "C6H12O6", 6, 12, 1, 1, 2],
  ["CC(=O)Nc1ccc(O)cc1", "paracetamol", "C8H9NO2", 8, 9, 5, 6, 5],
  ["CC(=O)Oc1ccccc1C(O)=O", "aspirin", "C9H8O4", 9, 8, 6, 9, 6],
  ["CN1C=NC2=C1C(=O)N(C)C(=O)N2C", "caffeine (Kekule)", "C8H10N4O2", 8, 10, 6, 8, 4],
  ["Cn1cnc2c1c(=O)n(C)c(=O)n2C", "caffeine (aromatic)", "C8H10N4O2", 8, 10, 6, 8, 4],
  ["CCc1ccccc1", "ethylbenzene (aromatic)", "C8H10", 8, 10, 4, 6, 5],
  ["CCC1=CC=CC=C1", "ethylbenzene (Kekule)", "C8H10", 8, 10, 4, 6, 5],
  ["CC(C)(C)c1ccccc1", "tert-butylbenzene (aromatic)", "C10H14", 10, 14, 4, 6, 4],
  ["CC(C)(C)C1=CC=CC=C1", "tert-butylbenzene (Kekule)", "C10H14", 10, 14, 4, 6, 4],
  ["Cc1c(C)c(C)c(C)cc1", "durene-like (aromatic)", "C10H14", 10, 14, 4, 5, 3],
  ["CC1=CC=C(C)C(C)=C1C", "durene-like (Kekule)", "C10H14", 10, 14, 4, 5, 3],
  ["c1ccc(-c2ccccc2)cc1", "biphenyl (aromatic)", "C12H10", 12, 10, 8, 4, 3],
  ["C1=CC=C(C=C1)C1=CC=CC=C1", "biphenyl (Kekule)", "C12H10", 12, 10, 8, 4, 3],
  ["c1ccc2cc3ccccc3cc2c1", "anthracene (aromatic)", "C14H10", 14, 10, 10, 4, 3],
  ["C1=CC2=CC3=CC=CC=C3C=C2C=C1", "anthracene (Kekule)", "C14H10", 14, 10, 10, 4, 3],
  ["OC1=CC=C(O)C=C1", "hydroquinone (Kekule)", "C6H6O2", 6, 6, 4, 2, 2],
  ["Nc1ccc(N)cc1", "p-phenylenediamine (aromatic)", "C6H8N2", 6, 8, 4, 2, 2],
  ["NC1=CC=C(N)C=C1", "p-phenylenediamine (Kekule)", "C6H8N2", 6, 8, 4, 2, 2],
  ["C1=CC=CO1", "furan (Kekule)", "C4H4O", 4, 4, 3, 2, 2],
  ["C1=CC=CS1", "thiophene (Kekule)", "C4H4S", 4, 4, 3, 2, 2],
  ["C1=CC=CN1", "pyrrole (Kekule)", "C4H5N", 4, 5, 3, 2, 3],
  ["O=C1C=CC=CN1", "2-pyridone (Kekule)", "C5H5NO", 5, 5, 4, 5, 5],
  ["O=c1cccc[nH]1", "2-pyridone (aromatic)", "C5H5NO", 5, 5, 4, 5, 5],
  ["O=C1C=CC(=O)C=C1", "1,4-benzoquinone", "C6H4O2", 6, 4, 5, 2, 1],
  ["c1ccc2c(c1)OCO2", "benzodioxole (aromatic)", "C7H6O2", 7, 6, 5, 4, 3],
  ["N#Cc1ccc(C#N)cc1", "terephthalonitrile (aromatic)", "C8H4N2", 8, 4, 8, 3, 1],
  ["N#CC1=CC=C(C#N)C=C1", "terephthalonitrile (Kekule)", "C8H4N2", 8, 4, 8, 3, 1],
  ["OC(=O)c1ccc(C(O)=O)cc1", "terephthalic acid (aromatic)", "C8H6O4", 8, 6, 6, 3, 2],
  ["OC(=O)C1=CC=C(C(O)=O)C=C1", "terephthalic acid (Kekule)", "C8H6O4", 8, 6, 6, 3, 2],
  ["Clc1ccc(Cl)cc1", "p-dichlorobenzene (aromatic)", "C6H4Cl2", 6, 4, 4, 2, 1],
  ["ClC1=CC=C(Cl)C=C1", "p-dichlorobenzene (Kekule)", "C6H4Cl2", 6, 4, 4, 2, 1],
  ["Cc1ccccn1", "2-picoline (aromatic)", "C6H7N", 6, 7, 4, 6, 5],
  ["CC1=CC=CC=N1", "2-picoline (Kekule)", "C6H7N", 6, 7, 4, 6, 5],
  ["c1ccc2[nH]c3ccccc3c2c1", "carbazole (aromatic)", "C12H9N", 12, 9, 9, 6, 5],
  ["CCO.O", "ethanol + water", "C2H8O2", 2, 8, -1, 2, 4],
  ["CC(=O)O.CC(=O)O", "two acetic acids", "C4H8O4", 4, 8, 1, 2, 2],
  ["c1ccccc1.c1ccccc1", "two benzenes", "C12H12", 12, 12, 7, 1, 1],
  ["CC(=O)[O-].[NH4+]", "ammonium acetate", "C2H7NO2", 2, 7, 0, 2, 2],
  ["[Na+].[Cl-]", "sodium chloride", "ClNa", 0, 0, 0.5, 0, 0],
  ["C1CC1C1CC1", "bicyclopropyl", "C6H10", 6, 10, 2, 2, 2],
  ["C1=CC=C2C(=C1)C=CC=C2", "naphthalene (alt Kekule)", "C10H8", 10, 8, 7, 3, 2],
  ["CC1=C(C)C(C)=C(C)C(C)=C1C", "hexamethylbenzene (Kekule)", "C12H18", 12, 18, 4, 2, 1],
  ["Cc1c(C)c(C)c(C)c(C)c1C", "hexamethylbenzene (aromatic)", "C12H18", 12, 18, 4, 2, 1],
  ["C1=CC=CC=C1C", "cyclohexadiene-check bad", "C7H8", 7, 8, 4, 5, 4],
  ["C1=CCCCC1", "cyclohexene", "C6H10", 6, 10, 2, 3, 3],
  ["C1=CCC=CC1", "1,4-cyclohexadiene", "C6H8", 6, 8, 3, 2, 2],
  ["C1=CC=CCC1", "1,3-cyclohexadiene", "C6H8", 6, 8, 3, 3, 3],
  ["C1=CC=CC=CC=C1", "cyclooctatetraene", "C8H8", 8, 8, 5, 1, 1],
  ["C=C1C=CC=C1", "fulvene", "C6H6", 6, 6, 4, 4, 3],
  ["O=C1C=CC=CC=C1", "tropone", "C7H6O", 7, 6, 5, 4, 3],
  ["O=C1C=CC=CC1=O", "1,2-benzoquinone", "C6H4O2", 6, 4, 5, 3, 2],
  ["C1=CCC2CCCCC2C1", "octahydronaphthalene-ene", "C10H16", 10, 16, 3, 5, 5],
  ["c1ccc2c(c1)CCCC2", "tetralin", "C10H12", 10, 12, 5, 5, 4],
  ["C1=CC=C2CCCCC2=C1", "tetralin (Kekule)", "C10H12", 10, 12, 5, 5, 4],
  ["C1COCCN1", "morpholine", "C4H9NO", 4, 9, 1, 2, 3],
  ["C1CNCCN1", "piperazine", "C4H10N2", 4, 10, 1, 1, 2],
  ["C1=COC=CO1", "1,4-dioxine", "C4H4O2", 4, 4, 3, 1, 1],
  ["c1cnc2[nH]cnc2c1", "purine-like", "C6H5N3", 6, 5, 6, 6, 5],
  ["C1=CC2=CC=C3C=CC=C4C=CC(=C1)C2=C34", "pyrene (Kekule)", "C16H10", 16, 10, 12, 5, 3],
  ["c1cc2ccc3cccc4ccc(c1)c2c34", "pyrene (aromatic)", "C16H10", 16, 10, 12, 5, 3],
];

const FIELDS = [
  ["formula", 2], ["totalC", 3], ["totalH", 4],
  ["dbe", 5], ["carbons", 6], ["protons", 7]
];

let failed = 0, passed = 0;
const failures = [];

for (const row of CASES) {
  const [smi, name] = row;
  let got;
  try { got = Structure.countEnvironments(smi); }
  catch (e) { got = { error: "استثنا: " + e.message }; }

  const diffs = [];
  if (got.error) diffs.push(got.error);
  else for (const [field, idx] of FIELDS) {
    const mine = field === "dbe" ? Number(got[field]) : got[field];
    if (String(mine) !== String(row[idx]))
      diffs.push(`${field}: ${mine} ≠ ${row[idx]}`);
  }

  if (diffs.length) { failed++; failures.push({ smi, name, diffs }); }
  else { passed++; if (VERBOSE) console.log(`  ✓ ${name}  ${smi}`); }
}

console.log(`\nپارسر SMILES و تقارن: ${passed}/${CASES.length} سطر گذشت`);
for (const f of failures) {
  console.log(`  ✗ ${f.name}\n     ${f.smi}`);
  f.diffs.forEach(d => console.log(`       - ${d}`));
}

/* ---------------------------------------------------------------------
   ناوردایی نسبت به نگارش: هر ترکیبی که هم به فرمِ آروماتیک و هم به فرمِ
   کِکوله در جدول آمده، باید دقیقاً یک پاسخ بدهد. این بررسی مستقل از
   مقادیرِ مرجع است — حتی اگر جدول روزی اشتباه به‌روزرسانی شود، شکستنِ
   این ناوردایی همان باگِ اصلی را دوباره لو می‌دهد.
   --------------------------------------------------------------------- */
const byBase = new Map();
for (const row of CASES) {
  const base = String(row[1]).replace(/\s*\((aromatic|Kekule)[^)]*\)\s*$/i, "").trim();
  if (base === row[1]) continue;              // بدونِ پرانتزِ فرم
  if (!byBase.has(base)) byBase.set(base, []);
  byBase.get(base).push(row);
}
let pairs = 0, pairFail = 0;
for (const [base, rows] of byBase) {
  if (rows.length < 2) continue;
  pairs++;
  const key = r => {
    const g = Structure.countEnvironments(r[0]);
    return g.error ? g.error : `${g.formula}|${g.carbons}|${g.protons}|${g.dbe}`;
  };
  const keys = rows.map(key);
  if (new Set(keys).size !== 1) {
    pairFail++;
    console.log(`  ✗ ناوردایی نگارش شکست: ${base}`);
    rows.forEach((r, i) => console.log(`       ${r[0]}  →  ${keys[i]}`));
  }
}
console.log(`ناوردایی آروماتیک/کِکوله: ${pairs - pairFail}/${pairs} ترکیب یکسان خوانده شد`);

/* ---------------------------------------------------------------------
   جزءهای جدا: «.» باید پیوند نزند.
   --------------------------------------------------------------------- */
let sepFail = 0;
const SEP = [
  ["CCO.CCO", "دو اتانول", 2],
  ["c1ccccc1.c1ccccc1", "دو بنزن", 1],
  ["CC(=O)O.CC(=O)O", "دو استیک اسید", 2]
];
for (const [smi, fa, expectedCarbonEnvs] of SEP) {
  const g = Structure.countEnvironments(smi);
  const single = Structure.countEnvironments(smi.split(".")[0]);
  if (g.error || g.carbons !== expectedCarbonEnvs || g.totalH !== single.totalH * 2) {
    sepFail++;
    console.log(`  ✗ جزءهای جدا: ${fa} (${smi}) → carbons=${g.carbons}, H=${g.totalH}`);
  }
}
console.log(`جداکنندهٔ «.»: ${SEP.length - sepFail}/${SEP.length} گذشت`);

console.log("\n" + "═".repeat(46));
if (failed || pairFail || sepFail) {
  console.log((failed + pairFail + sepFail) + " مورد شکست خورد.");
  process.exit(1);
}
console.log("همهٔ آزمون‌ها گذشت ✓");
