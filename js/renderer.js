/* =====================================================================
   رندرکننده شماتیک مولکول — SVG Molecular Renderer
   ساختار کاندید را به‌صورت زنجیره‌ای از موتیف‌های اسکلتی رسم می‌کند:
   حلقه بنزن (شش‌ضلعی)، کربونیل C=O، گروه‌های عاملی و آلکیل.
   ===================================================================== */
(function (root) {
  const NS = "http://www.w3.org/2000/svg";
  /* رنگ‌ها از متغیرهای CSS می‌آیند تا با پوستهٔ روشن/تاریک بچرخند. این
     SVGها درون‌خطی‌اند، پس var() در صفتِ fill/stroke کار می‌کند. پیش‌تر
     مقادیر ثابتِ «روشن روی تاریک» بودند و روی بومِ روشن اتم‌ها ناپیدا
     می‌شدند. */
  const COL = {
    bond: "var(--plot-bond)", atom: "var(--plot-atom)", o: "var(--plot-o)",
    n: "var(--plot-n)", x: "var(--plot-x)", accent: "var(--plot-accent)",
    ring: "var(--plot-ring)"
  };
  const WELL = "var(--plot-well)";
  const BASE = 90;   // خط پایه عمودی
  const H = 180;     // ارتفاع بوم

  /* گریزِ متن برای مقدارِ attribute (نامِ دسترس‌پذیر) */
  function escAttr(v) {
    return String(v == null ? "" : v)
      .replace(/&/g, "&amp;").replace(/"/g, "&quot;")
      .replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  /* --- توابع پایه ترسیم --- */
  function line(x1, y1, x2, y2, w = 2, c = COL.bond) {
    return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="${w}" stroke-linecap="round"/>`;
  }
  function dbl(x1, y1, x2, y2, c = COL.bond) {
    // پیوند دوگانه: دو خط موازی
    const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy) || 1;
    const ox = -dy / len * 3, oy = dx / len * 3;
    return line(x1 + ox, y1 + oy, x2 + ox, y2 + oy, 2, c) +
           line(x1 - ox, y1 - oy, x2 - ox, y2 - oy, 2, c);
  }
  function triple(x1, y1, x2, y2, c = COL.bond) {
    const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy) || 1;
    const ox = -dy / len * 3.5, oy = dx / len * 3.5;
    return line(x1, y1, x2, y2, 2, c) +
           line(x1 + ox, y1 + oy, x2 + ox, y2 + oy, 2, c) +
           line(x1 - ox, y1 - oy, x2 - ox, y2 - oy, 2, c);
  }
  function label(x, y, txt, c = COL.atom, size = 15) {
    return `<text x="${x}" y="${y}" fill="${c}" font-size="${size}" font-family="Consolas,monospace" text-anchor="middle" dominant-baseline="central">${txt}</text>`;
  }
  function hexagon(cx, cy, r) {
    let pts = [];
    for (let i = 0; i < 6; i++) {
      const a = Math.PI / 180 * (60 * i);      // رأس در چپ/راست
      pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
    }
    let s = "";
    for (let i = 0; i < 6; i++) {
      const [x1, y1] = pts[i], [x2, y2] = pts[(i + 1) % 6];
      s += line(x1, y1, x2, y2, 2, COL.ring);
    }
    s += `<circle cx="${cx}" cy="${cy}" r="${r * 0.55}" fill="none" stroke="${COL.ring}" stroke-width="1.5"/>`;
    return { svg: s, left: [cx - r, cy], right: [cx + r, cy], top: [cx, cy - r], bottom: [cx, cy + r] };
  }

  /* --- حلقهٔ شش‌ضلعیِ هترو‌آروماتیک (پیریدین و مشابه) ---
     یک رأس با برچسبِ هترواتم (پیش‌فرض N) به‌جای رنگِ آروماتیک ساده،
     تا پیریدین/پیریمیدین/… قابل تشخیص از فنیل باشند. heteroPos یکی از
     0..5 (اندیس رأس در hexagon) — پیش‌فرض 0 (رأس چپ). */
  function heteroHexagon(cx, cy, r, heteroSym, heteroColor, heteroPos) {
    heteroPos = heteroPos || 0;
    let pts = [];
    for (let i = 0; i < 6; i++) {
      const a = Math.PI / 180 * (60 * i);
      pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
    }
    let s = "";
    for (let i = 0; i < 6; i++) {
      const [x1, y1] = pts[i], [x2, y2] = pts[(i + 1) % 6];
      s += line(x1, y1, x2, y2, 2, COL.ring);
    }
    // مسیر داخلیِ نیم‌دایره به‌جای دایرهٔ کامل، برای اشارهٔ بصری به عدم تقارن حلقهٔ هترو
    s += `<path d="M ${cx - r * 0.5} ${cy - r * 0.45} A ${r * 0.55} ${r * 0.55} 0 1 1 ${cx + r * 0.5} ${cy + r * 0.45}" fill="none" stroke="${COL.ring}" stroke-width="1.5"/>`;
    const [hx, hy] = pts[heteroPos];
    s += `<circle cx="${hx}" cy="${hy}" r="9" fill="${WELL}" stroke="${heteroColor}" stroke-width="1.5"/>`;
    s += label(hx, hy, heteroSym, heteroColor, 12);
    return { svg: s, left: [cx - r, cy], right: [cx + r, cy], top: [cx, cy - r], bottom: [cx, cy + r] };
  }

  /* --- حلقهٔ پنج‌ضلعیِ هترو‌آروماتیک (فوران/تیوفن/پیرول) ---
     رأس بالا (شمالی) محل هترواتم است؛ دو رأسِ پایین محل اتصال به بقیهٔ زنجیره
     (مشابه استخلاف در موضع ۲) هستند تا با blockGlyph سازگار بماند. */
  function pentagon(cx, cy, r, heteroSym, heteroColor, nH) {
    let pts = [];
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + Math.PI * 2 / 5 * i; // رأس اول رو به بالا
      pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
    }
    let s = "";
    for (let i = 0; i < 5; i++) {
      const [x1, y1] = pts[i], [x2, y2] = pts[(i + 1) % 5];
      s += line(x1, y1, x2, y2, 2, COL.ring);
    }
    // دو پیوند دوگانهٔ نمایشی برای حس آروماتیک‌بودن (بدون ادعای مکان دقیق π)
    s += dbl(pts[1][0], pts[1][1], pts[2][0], pts[2][1], COL.ring);
    s += dbl(pts[3][0], pts[3][1], pts[4][0], pts[4][1], COL.ring);
    const [nx, ny] = pts[0];
    s += `<circle cx="${nx}" cy="${ny}" r="9" fill="${WELL}" stroke="${heteroColor}" stroke-width="1.5"/>`;
    s += label(nx, ny, heteroSym + (nH ? "H" : ""), heteroColor, 11);
    // نقطهٔ اتصال به بقیهٔ زنجیره از رأس پایین‌راست حلقه (موضع ۲ نسبت به هترواتم)
    const exitPt = pts[2];
    return { svg: s, left: [cx - r, cy], right: [exitPt[0] + 4, exitPt[1]], top: [nx, ny] };
  }

  /* --- درایور هر بلوک: {svg, width} با نقطه ورود چپ و خروج راست ---
     pos: 'start' | 'mid' | 'end' | 'solo' — برای رسم درست پیوند داخلی */
  function blockGlyph(id, x, pos) {
    const y = BASE;
    switch (id) {
      case "phenyl": case "tolyl_p": {
        const g = hexagon(x + 30, y, 26);
        let extra = "";
        if (id === "tolyl_p") extra = line(g.right[0], y, g.right[0] + 18, y) + label(g.right[0] + 30, y, "CH₃");
        return { svg: g.svg + extra, width: id === "tolyl_p" ? 78 : 60, entry: g.left, exit: g.right };
      }
      case "phenylene_p": {
        const g = hexagon(x + 30, y, 26);
        return { svg: g.svg, width: 60, entry: g.left, exit: g.right };
      }
      /* حلقه‌های چنداستخلافی: شش‌ضلعی رسم می‌شوند مثل بقیهٔ حلقه‌ها (وگرنه
         به گلیفِ پیش‌فرضِ متنی می‌افتادند و «۱،۲،۴» به‌جای حلقه دیده می‌شد).
         الگویِ استخلاف به‌صورتِ برچسبِ کوچکِ زیرِ حلقه می‌آید، چون همان
         چیزی است که ایزومرها را از هم جدا می‌کند. */
      case "benzene_tri": case "benzene_123": case "benzene_124": case "benzene_135":
      case "benzene_tetra": case "benzene_1234": case "benzene_1235": case "benzene_1245":
      case "benzene_penta": case "benzene_hexa": {
        const g = hexagon(x + 30, y, 26);
        const PAT = {
          benzene_123: "1,2,3", benzene_124: "1,2,4", benzene_135: "1,3,5",
          benzene_1234: "1,2,3,4", benzene_1235: "1,2,3,5", benzene_1245: "1,2,4,5",
          benzene_tri: "tri", benzene_tetra: "tetra", benzene_penta: "penta", benzene_hexa: "hexa"
        };
        const tag = `<text x="${x + 30}" y="${y + 40}" fill="${COL.ring}" font-size="10" text-anchor="middle" font-family="Consolas,monospace">${PAT[id] || ""}</text>`;
        return { svg: g.svg + tag, width: 60, entry: g.left, exit: g.right };
      }
      case "benzyl": {
        const g = hexagon(x + 30, y, 26);
        const s = g.svg + line(g.right[0], y, g.right[0] + 20, y);
        return { svg: s, width: 76, entry: g.left, exit: [g.right[0] + 20, y] };
      }
      case "ketone": {
        const cx = x + 16;
        const s = line(x, y, cx, y) + dbl(cx, y, cx, y - 26, COL.o) +
                  label(cx, y - 36, "O", COL.o) + line(cx, y, cx + 16, y);
        return { svg: s, width: 32, entry: [x, y], exit: [cx + 16, y] };
      }
      case "aldehyde": {
        const cx = x + 16;
        const s = line(x, y, cx, y) + dbl(cx, y, cx + 18, y - 20, COL.o) +
                  label(cx + 26, y - 26, "O", COL.o) + label(cx, y + 16, "H", COL.atom, 13);
        return { svg: s, width: 40, entry: [x, y] };
      }
      case "cooh": {
        const cx = x + 16;
        const s = line(x, y, cx, y) + dbl(cx, y, cx, y - 24, COL.o) + label(cx, y - 34, "O", COL.o) +
                  line(cx, y, cx + 20, y + 14) + label(cx + 34, y + 18, "OH", COL.o);
        return { svg: s, width: 56, entry: [x, y] };
      }
      case "ester_co": {
        const cx = x + 16;
        const s = line(x, y, cx, y) + dbl(cx, y, cx, y - 24, COL.o) + label(cx, y - 34, "O", COL.o) +
                  line(cx, y, cx + 18, y + 12) + label(cx + 26, y + 16, "O", COL.o) +
                  line(cx + 32, y + 16, cx + 44, y);
        return { svg: s, width: 60, entry: [x, y], exit: [cx + 44, y] };
      }
      case "ether_o": {
        const s = line(x, y, x + 12, y) + label(x + 22, y, "O", COL.o) + line(x + 32, y, x + 44, y);
        return { svg: s, width: 44, entry: [x, y], exit: [x + 44, y] };
      }
      case "amide": {
        const cx = x + 16;
        const s = line(x, y, cx, y) + dbl(cx, y, cx, y - 24, COL.o) + label(cx, y - 34, "O", COL.o) +
                  line(cx, y, cx + 20, y + 14) + label(cx + 36, y + 18, "NH₂", COL.n);
        return { svg: s, width: 58, entry: [x, y] };
      }
      case "nitrile": {
        const s = line(x, y, x + 14, y) + triple(x + 14, y, x + 40, y, COL.n) + label(x + 50, y, "N", COL.n);
        return { svg: s, width: 60, entry: [x, y] };
      }
      case "vinyl": {
        const s = line(x, y, x + 14, y) + dbl(x + 14, y, x + 34, y - 14) + line(x + 34, y - 14, x + 50, y - 14);
        return { svg: s, width: 56, entry: [x, y] };
      }

      /* ---- حلقه‌های هتروآروماتیک ----
         نکته: شناسهٔ واقعی بلوک در database.js «pyridin_3yl» (بدون e) و در
         field-data.js «pyridyl» است. پیش‌تر این‌جا فقط «pyridine_*» پوشش
         داشت، پس هیچ‌کدام از بلوک‌های واقعیِ پیریدینی به این شاخه نمی‌رسید و
         در شماتیک به‌صورت متن خام شناسه («pyridin_3yl») رسم می‌شد. */
      case "pyridine_2yl": case "pyridine_3yl": case "pyridine_4yl":
      case "pyridin_2yl":  case "pyridin_3yl":  case "pyridin_4yl":
      case "pyridyl": {
        const posMap = {
          pyridine_2yl: 1, pyridine_3yl: 2, pyridine_4yl: 3,
          pyridin_2yl: 1,  pyridin_3yl: 2,  pyridin_4yl: 3,
          pyridyl: 2                                  // پیریدیل بانک فیلد = ۳-ایل (بتا)
        }; // فاصلهٔ رأس اتصال از N
        const g = heteroHexagon(x + 30, y, 26, "N", COL.n, posMap[id]);
        return { svg: g.svg, width: 60, entry: g.left, exit: g.right };
      }

      /* ---- اورتو-فنیلن: لینکر حلقه‌ای با دو اتصال مجاور (۱،۲-) ---- */
      case "phenylene_o": {
        const g = hexagon(x + 30, y, 26);
        // خروج از رأس بالا (مجاور رأس چپ) تا تفاوت اورتو با پارا دیده شود
        return { svg: g.svg, width: 62, entry: g.left, exit: g.top };
      }

      /* ---- انیدرید: دو کربونیل پل‌شده با اکسیژن ---- */
      case "anhydride": {
        const c1 = x + 14, c2 = x + 62;
        const s = line(x, y, c1, y) +
                  dbl(c1, y, c1, y - 24, COL.o) + label(c1, y - 34, "O", COL.o) +
                  line(c1, y, c1 + 12, y + 12) + label(x + 38, y + 16, "O", COL.o) +
                  line(x + 46, y + 12, c2, y) +
                  dbl(c2, y, c2, y - 24, COL.o) + label(c2, y - 34, "O", COL.o) +
                  line(c2, y, c2 + 16, y);
        return { svg: s, width: 78, entry: [x, y], exit: [c2 + 16, y] };
      }

      /* ---- کلرید اسید ---- */
      case "acidchloride": {
        const cx = x + 16;
        const s = line(x, y, cx, y) + dbl(cx, y, cx, y - 24, COL.o) + label(cx, y - 34, "O", COL.o) +
                  line(cx, y, cx + 18, y + 14) + label(cx + 32, y + 18, "Cl", COL.x);
        return { svg: s, width: 54, entry: [x, y] };
      }

      /* ---- ایزوسیانات: N=C=O (دو پیوند دوگانهٔ متوالی) ---- */
      case "isocyanate": {
        const s = line(x, y, x + 12, y) + label(x + 20, y, "N", COL.n) +
                  dbl(x + 28, y, x + 46, y) + label(x + 54, y, "C", COL.atom) +
                  dbl(x + 62, y, x + 80, y, COL.o) + label(x + 88, y, "O", COL.o);
        return { svg: s, width: 96, entry: [x, y] };
      }

      /* ---- آمین نوع دوم به‌عنوان پل ---- */
      case "amine2": {
        const s = line(x, y, x + 12, y) + label(x + 24, y, "NH", COL.n) + line(x + 38, y, x + 50, y);
        return { svg: s, width: 50, entry: [x, y], exit: [x + 50, y] };
      }

      /* ---- آلکین انتهایی ---- */
      case "alkyne_terminal": {
        const s = line(x, y, x + 12, y) + triple(x + 12, y, x + 44, y, COL.accent) +
                  label(x + 54, y, "H", COL.atom, 13);
        return { svg: s, width: 64, entry: [x, y] };
      }
      case "furan_2yl": {
        const g = pentagon(x + 26, y, 24, "O", COL.o, false);
        return { svg: g.svg, width: 54, entry: g.left, exit: g.right };
      }
      case "thiophene_2yl": {
        const g = pentagon(x + 26, y, 24, "S", COL.x, false);
        return { svg: g.svg, width: 54, entry: g.left, exit: g.right };
      }
      case "pyrrole_2yl_NH": {
        const g = pentagon(x + 26, y, 24, "N", COL.n, true);
        return { svg: g.svg, width: 54, entry: g.left, exit: g.right };
      }

      /* ---- گروه‌های گوگرددار اکسید‌شده — قبلاً کاملاً غایب بودند ---- */
      case "sulfoxide": {
        const cx = x + 16;
        const s = line(x, y, cx, y) + dbl(cx, y, cx, y - 24, COL.o) + label(cx, y - 34, "O", COL.o) +
                  label(cx + 4, y + 2, "S", "var(--plot-s)", 14) + line(cx, y, cx + 16, y);
        return { svg: s, width: 32, entry: [x, y], exit: [cx + 16, y] };
      }
      case "sulfone": {
        const cx = x + 18;
        const s = line(x, y, cx, y) +
                  dbl(cx, y, cx - 10, y - 22, COL.o) + label(cx - 14, y - 30, "O", COL.o) +
                  dbl(cx, y, cx + 10, y - 22, COL.o) + label(cx + 14, y - 30, "O", COL.o) +
                  label(cx, y + 2, "S", "var(--plot-s)", 14) + line(cx, y, cx + 18, y);
        return { svg: s, width: 36, entry: [x, y], exit: [cx + 18, y] };
      }
      case "sulfonamide": {
        const cx = x + 18;
        const s = line(x, y, cx, y) +
                  dbl(cx, y, cx - 10, y - 22, COL.o) + label(cx - 14, y - 30, "O", COL.o) +
                  dbl(cx, y, cx + 10, y - 22, COL.o) + label(cx + 14, y - 30, "O", COL.o) +
                  label(cx, y + 2, "S", "var(--plot-s)", 14) +
                  line(cx, y, cx + 18, y + 14) + label(cx + 34, y + 18, "NH₂", COL.n);
        return { svg: s, width: 44, entry: [x, y] };
      }
      // گروه‌های آلکیل و هترو ساده به‌صورت برچسب فشرده
      default: {
        const map = {
          methyl: ["CH₃", COL.atom], ethyl: ["C₂H₅", COL.atom], npropyl: ["C₃H₇", COL.atom],
          isopropyl: ["iPr", COL.atom], tbutyl: ["tBu", COL.accent], hydroxyl: ["OH", COL.o],
          methoxy: ["OCH₃", COL.o], amine1: ["NH₂", COL.n], nitro: ["NO₂", COL.n],
          chloro: ["Cl", COL.x], bromo: ["Br", COL.x], acyl: ["COCH₃", COL.o], ch2: ["CH₂", COL.atom],
          // بلوک‌هایی که تا پیش از این نه شاخهٔ اختصاصی داشتند و نه در این نگاشت
          // بودند، به‌جای نماد شیمیایی، شناسهٔ داخلی خود را داخل SVG چاپ می‌کردند
          // (مثلاً «cf3» یا «acetoxy» به‌شکل متن خام):
          cf3: ["CF₃", COL.x], acetoxy: ["OCOCH₃", COL.o], iodo: ["I", COL.x],
          butyl: ["C₄H₉", COL.atom], propanoyl: ["COC₂H₅", COL.o], ch: ["CH", COL.atom]
        };
        const [txt, c] = map[id] || [id, COL.atom];
        const w = txt.length * 9 + 20;
        const mid = x + w / 2;
        let s = "";
        // فقط در سمتی که به بقیه مولکول متصل است، خط پیوند بکش
        if (pos === "start" || pos === "mid") s += line(x + w - 12, y, x + w, y); // اتصال به راست
        if (pos === "end" || pos === "mid") s += line(x, y, x + 12, y);           // اتصال به چپ
        s += label(mid, y, txt, c);
        return { svg: s, width: w, entry: [x, y], exit: [x + w, y] };
      }
    }
  }

  /* --- اولویت نمایش: حلقه/آلکیل سمت چپ، گروه عاملیِ رسم‌شده سمت راست --- */
  function displayPriority(id) {
    if (["phenyl", "tolyl_p", "benzyl", "phenylene_p", "phenylene_o",
         "pyridine_2yl", "pyridine_3yl", "pyridine_4yl",
         "pyridin_2yl", "pyridin_3yl", "pyridin_4yl", "pyridyl",
         "furan_2yl", "thiophene_2yl", "pyrrole_2yl_NH"].includes(id)) return 3;
    if (["methyl", "ethyl", "npropyl", "isopropyl", "tbutyl", "butyl", "ch2", "ch"].includes(id)) return 2;
    if (["hydroxyl", "methoxy", "nitro", "chloro", "bromo", "iodo", "amine1",
         "acyl", "propanoyl", "cf3", "acetoxy"].includes(id)) return 1;
    return 0; // گروه‌های عاملیِ صریح (کربونیل، نیتریل و…) ترجیحاً سمت راست
  }
  function orderForDisplay(chain) {
    if (chain.length === 2) {
      return displayPriority(chain[0].id) >= displayPriority(chain[1].id) ? chain : [chain[1], chain[0]];
    }
    if (chain.length === 3) {
      const sym = ["ketone", "ether_o", "phenylene_p", "phenylene_o",
                   "amine2", "anhydride", "ch2"].includes(chain[1].id);
      if (sym && displayPriority(chain[2].id) > displayPriority(chain[0].id)) return [chain[2], chain[1], chain[0]];
    }
    return chain;
  }

  /* --- رندر یک زنجیره کاندید کامل --- */
  function renderChain(chainIn) {
    const chain = orderForDisplay(chainIn);
    let x = 24, parts = [], connectors = [], prevExit = null;
    chain.forEach((b, i) => {
      const pos = chain.length === 1 ? "solo" : i === 0 ? "start" : i === chain.length - 1 ? "end" : "mid";
      const g = blockGlyph(b.id, x, pos);
      const entry = g.entry || [x, BASE];
      if (prevExit) connectors.push(line(prevExit[0], prevExit[1], entry[0], entry[1]));
      parts.push(g.svg);
      prevExit = g.exit || [x + g.width, BASE];
      x += g.width + 16;
    });
    const width = Math.max(x + 12, 220);
    return `<svg direction="ltr" viewBox="0 0 ${width} ${H}" width="100%" style="max-width:${width}px" xmlns="${NS}">
      ${connectors.join("")}${parts.join("")}</svg>`;
  }

  /* --- چیپ‌های قطعات کشف‌شده --- */
  function renderFragmentChips(blocks) {
    return blocks.map(b =>
      `<span class="frag-chip"><b>${b.fa}</b><code>${b.en}</code></span>`
    ).join("");
  }

    /* ---------- درختِ شکافتِ متوالی + مولتی‌پلتِ حاصل ----------
     نسخهٔ قبلی فقط انشعاب را می‌کشید و همهٔ خطوط را هم‌ارتفاع می‌گرفت، پس
     دو چیزِ مهم را نشان نمی‌داد:
       • شدتِ نسبیِ خطوط (مثلث پاسکال). یک تریپلت ۱:۲:۱ است، نه سه خطِ
         مساوی — و همین نسبت است که در طیفِ واقعی دیده می‌شود.
       • هم‌افتادگی. وقتی دو J نزدیک باشند، خطوط روی هم می‌افتند و
         مولتی‌پلت ساده‌تر از (n+1)(m+1) خط دیده می‌شود؛ دلیلِ این‌که
         گاهی «کوارتت» می‌بینیم جایی که انتظار هشت خط داشتیم.
     حالا وزنِ هر خط با ضریبِ دوجمله‌ای ضرب می‌شود، خطوطِ هم‌محل جمع
     می‌شوند، و در پایین، مولتی‌پلتِ حاصل به‌صورتِ ردِ طیفیِ واقعی رسم
     می‌شود — یعنی همان شکلی که در طیف دیده خواهد شد. */
  function binomial(n, k) {
    let r = 1;
    for (let i = 0; i < k; i++) r = (r * (n - i)) / (i + 1);
    return r;
  }

  function splittingTree(couplings, opt) {
    opt = opt || {};
    const W = 620, rowH = 74, top = 46;
    const steps = (couplings || []).filter(c => c.j > 0);
    const traceH = 78;                       // جای مولتی‌پلتِ حاصل
    const H2 = top + rowH * (steps.length + 1) + traceH + 26;
    const cx = W / 2;
    const px = v => (Math.round(v * 10) / 10);
    const aria = "درختِ شکافتِ متوالی با " + steps.length + " کوپلاژ" +
      (steps.length ? ": " + steps.map((c, i) => "J" + (i + 1) + " برابر " + c.j + " هرتز با " + ((c.n || 1) + 1) + " خط").join("، ") : "");
    let s = `<svg direction="ltr" viewBox="0 0 ${W} ${H2}" xmlns="${NS}" font-family="Vazirmatn, Tahoma, sans-serif" role="img" aria-label="${escAttr(aria)}">`;
    s += `<text x="${cx}" y="22" fill="${COL.accent}" font-size="14" text-anchor="middle">درخت شکافت متوالی (n+1) و مولتی‌پلتِ حاصل</text>`;

    // سطح ۰: یک خطِ منفرد با وزن ۱
    let level = [{ x: cx, w: 1 }];
    const maxWOf = arr => Math.max(...arr.map(p => p.w));
    // ارتفاعِ هر خط متناسب با وزنش — «۱:۲:۱» با چشم دیده می‌شود
    const drawTicks = (arr, y) => {
      const mw = maxWOf(arr);
      return arr.map(p => {
        const h = 8 + 14 * (p.w / mw);
        return `<line x1="${px(p.x)}" y1="${px(y)}" x2="${px(p.x)}" y2="${px(y + h)}" stroke="${COL.atom}" stroke-width="2" stroke-linecap="round"/>`;
      }).join("");
    };
    s += drawTicks(level, top);
    s += `<text x="14" y="${top + 16}" fill="${COL.ring}" font-size="11">سیگنال پایه</text>`;

    const scale = 3.2;                       // پیکسل به ازای هر Hz
    steps.forEach((c, i) => {
      const y0 = top + rowH * i + 22;
      const y1 = top + rowH * (i + 1);
      const n = c.n || 1;                    // تعداد پروتونِ همسایه در این مرحله
      const lines = n + 1;
      const spread = c.j * scale;
      const raw = [];
      level.forEach(parent => {
        const start = parent.x - (spread * n) / 2;
        for (let k = 0; k < lines; k++) {
          const nx = start + k * spread;
          const w = parent.w * binomial(n, k);       // وزنِ پاسکال
          raw.push({ x: nx, w });
          s += `<line x1="${px(parent.x)}" y1="${px(y0)}" x2="${px(nx)}" y2="${px(y1)}" stroke="${COL.bond}" stroke-width="1.1" opacity="0.6"/>`;
        }
      });
      // ادغامِ خطوطِ هم‌محل (تحملِ نیم‌پیکسل) — منشأِ سادگیِ ظاهریِ مولتی‌پلت
      const merged = [];
      raw.sort((a, b) => a.x - b.x).forEach(p => {
        const last = merged[merged.length - 1];
        if (last && Math.abs(last.x - p.x) < 0.6) { last.w += p.w; last.x = (last.x + p.x) / 2; }
        else merged.push({ x: p.x, w: p.w });
      });
      const collapsed = raw.length - merged.length;
      s += drawTicks(merged, y1);
      s += `<text x="14" y="${px(y1 + 16)}" fill="${COL.ring}" font-size="11">J${i + 1} = ${c.j}Hz (شکافت به ${lines})</text>`;
      if (collapsed > 0) {
        s += `<text x="14" y="${px(y1 + 30)}" fill="${COL.ring}" font-size="9.5" opacity="0.8">${collapsed} خط هم‌افتاده</text>`;
      }
      level = merged;
    });

    /* --- مولتی‌پلتِ حاصل: ردِ طیفی با پهنای خطِ واقعی --- */
    const yBase = top + rowH * (steps.length + 1) + traceH - 6;
    const yTopT = yBase - (traceH - 22);
    s += `<line x1="40" y1="${px(yBase)}" x2="${W - 20}" y2="${px(yBase)}" stroke="${COL.ring}" stroke-width="1" stroke-opacity="0.55"/>`;
    s += `<text x="14" y="${px(yTopT + 10)}" fill="${COL.accent}" font-size="11">مولتی‌پلتِ حاصل</text>`;

    if (level.length) {
      const mw = maxWOf(level);
      const lw = 2.6;                        // نیم‌پهنای خط (پیکسل) — پهنای طبیعیِ خط
      const x0 = 40, x1 = W - 20, N = 420;
      const inten = x => {
        let sum = 0;
        for (const p of level) {
          const d = (x - p.x) / lw;
          sum += (p.w / mw) / (1 + d * d);   // لورنتسی
        }
        return sum;
      };
      let peak = 0;
      const vals = [];
      for (let i = 0; i <= N; i++) {
        const v = inten(x0 + ((x1 - x0) * i) / N);
        vals.push(v);
        if (v > peak) peak = v;
      }
      const k = peak > 0 ? (traceH - 26) / peak : 0;
      let d = "";
      for (let i = 0; i <= N; i++) {
        const x = x0 + ((x1 - x0) * i) / N;
        d += (i === 0 ? "M" : "L") + px(x) + " " + px(yBase - vals[i] * k);
      }
      s += `<path d="${d} L${px(x1)} ${px(yBase)} L${px(x0)} ${px(yBase)} Z" fill="${COL.accent}" fill-opacity="0.16"/>`;
      s += `<path d="${d}" fill="none" stroke="${COL.accent}" stroke-width="1.6" stroke-linejoin="round"/>`;

      // نسبتِ شدت‌ها به‌صورتِ عددِ صحیحِ ساده‌شده (۱:۲:۱ و مانندش)
      const minW = Math.min(...level.map(p => p.w));
      const ratios = level.map(p => Math.round((p.w / minW) * 10) / 10);
      const simple = ratios.every(r => Math.abs(r - Math.round(r)) < 0.06);
      if (simple && level.length <= 9) {
        s += `<text x="${W - 20}" y="${px(yTopT + 10)}" fill="${COL.ring}" font-size="10" text-anchor="end" font-family="Consolas,monospace">${ratios.map(Math.round).join(":")}</text>`;
      }
      s += `<text x="${W - 20}" y="${px(yBase + 14)}" fill="${COL.ring}" font-size="9.5" text-anchor="end" opacity="0.8">${level.length} خطِ قابلِ تفکیک</text>`;
    }

    s += `</svg>`;
    return s;
  }

    /* ---------- نقشهٔ همبستگیِ دوبعدی (COSY / HSQC / HMBC) ----------
     نسخهٔ قبلی یک کادرِ خالی با خط‌چین و دایره‌های تختِ هم‌اندازه بود. سه
     چیزی که نقشهٔ دوبعدیِ واقعی دارد و آن‌جا نبود:
       • تصویرِ یک‌بعدی روی هر دو لبه. در طیفِ واقعی همیشه طیفِ ۱D کنارِ
         محورها چاپ می‌شود، چون تنها راهِ فهمیدنِ این‌که هر لکه به کدام
         سیگنال مربوط است همان است.
       • قطرِ نقشه. لکه‌های روی قطر خودِ سیگنال‌اند و لکه‌های خارج از قطر
         همبستگی؛ بدونِ کشیدنِ قطر، این تمایزِ اصلی دیده نمی‌شود.
       • شکلِ کانتوریِ لکه. لکهٔ واقعی چند حلقهٔ تودرتوست، نه یک دایرهٔ تخت.
     رنگِ لکه هم معنا می‌گیرد: قطری خاکستری، خارج‌قطری با رنگِ تکنیک. */
  function renderCorrelationGrid(opt) {
    opt = opt || {};
    const W = 500, Hh = 500;
    // چیدمانِ حاشیهٔ چپ (از چپ به راست): عنوانِ چرخیده در x≈12،
    // نوارِ تصویرِ یک‌بعدی در [24,48]، و برچسب‌های ppm در [64,80].
    // پیش‌تر padL=62 بود و تصویرِ یک‌بعدی و برچسب‌ها هر دو در ۳۸..۵۸
    // می‌نشستند و روی هم می‌افتادند.
    const padL = 86, padT = 58, padR = 18, padB = 46;
    const proj = 26;                       // نوارِ تصویرِ یک‌بعدی
    const projGap = 38;                    // فاصلهٔ نوارِ چپ از لبهٔ کادر
    const gx0 = padL, gy0 = padT + proj;
    const gw = W - padL - padR, gh = Hh - gy0 - padB;
    const xr = opt.xRange || [0, 10];
    const yr = opt.yRange || [0, 10];
    const px = n => (Math.round(n * 10) / 10);
    // هر دو محور نزولی (قراردادِ NMR: ppm بالا در چپ/بالا)
    const X = ppm => gx0 + (1 - (ppm - xr[0]) / (xr[1] - xr[0])) * gw;
    const Y = ppm => gy0 + (1 - (ppm - yr[0]) / (yr[1] - yr[0])) * gh;
    const col = opt.color || COL.accent;

    const offDiag = (opt.cross || []).filter(c => Math.abs(c.x - c.y) > 1e-6);
    const aria = (opt.title || "نقشهٔ همبستگیِ دوبعدی") + "، " +
      (opt.xPeaks || []).length + " سیگنال روی هر محور و " + offDiag.length + " لکهٔ همبستگیِ خارج از قطر" +
      (offDiag.length ? ": " + offDiag.map(c => c.x + " با " + c.y).join("، ") : "");
    let s = `<svg direction="ltr" viewBox="0 0 ${W} ${Hh}" width="100%" xmlns="${NS}" font-family="Vazirmatn, Tahoma, sans-serif" role="img" aria-label="${escAttr(aria)}">`;
    if (opt.title) s += `<text x="${W / 2}" y="20" fill="${col}" font-size="13.5" text-anchor="middle">${opt.title}</text>`;

    s += `<rect x="${gx0}" y="${gy0}" width="${gw}" height="${gh}" fill="${WELL}" stroke="${COL.ring}" stroke-width="1" stroke-opacity="0.45"/>`;

    /* --- شبکه روی محلِ هر سیگنال --- */
    (opt.xPeaks || []).forEach(p => {
      const x = X(p.ppm);
      s += `<line x1="${px(x)}" y1="${gy0}" x2="${px(x)}" y2="${gy0 + gh}" stroke="${COL.ring}" stroke-width="0.5" stroke-opacity="0.18" stroke-dasharray="3 3"/>`;
      s += `<text x="${px(x)}" y="${gy0 + gh + 14}" fill="${COL.atom}" font-size="9.5" text-anchor="middle" font-family="Consolas,monospace">${p.label || p.ppm}</text>`;
    });
    (opt.yPeaks || []).forEach(p => {
      const y = Y(p.ppm);
      s += `<line x1="${gx0}" y1="${px(y)}" x2="${gx0 + gw}" y2="${px(y)}" stroke="${COL.ring}" stroke-width="0.5" stroke-opacity="0.18" stroke-dasharray="3 3"/>`;
      s += `<text x="${gx0 - 6}" y="${px(y + 3)}" fill="${COL.atom}" font-size="9.5" text-anchor="end" font-family="Consolas,monospace">${p.label || p.ppm}</text>`;
    });

    /* --- قطر: مرزِ «خودِ سیگنال» و «همبستگی» --- */
    if (opt.diagonal !== false) {
      const a = Math.max(xr[0], yr[0]), b = Math.min(xr[1], yr[1]);
      s += `<line x1="${px(X(a))}" y1="${px(Y(a))}" x2="${px(X(b))}" y2="${px(Y(b))}" stroke="${COL.ring}" stroke-width="0.9" stroke-opacity="0.4" stroke-dasharray="6 4"/>`;
    }

    /* --- تصویرِ یک‌بعدی روی دو لبه --- */
    const trace = (peaks, horiz) => {
      if (!peaks || !peaks.length) return "";
      const N = 260, lw = 0.035 * Math.abs(xr[1] - xr[0]);
      let dd = "", maxV = 0;
      const vals = [];
      for (let i = 0; i <= N; i++) {
        const t = i / N;
        const ppm = horiz ? xr[1] - t * (xr[1] - xr[0]) : yr[1] - t * (yr[1] - yr[0]);
        let v = 0;
        peaks.forEach(p => { const d = (ppm - p.ppm) / lw; v += 1 / (1 + d * d); });
        vals.push(v); if (v > maxV) maxV = v;
      }
      const k = maxV > 0 ? (proj - 6) / maxV : 0;
      for (let i = 0; i <= N; i++) {
        const t = i / N;
        if (horiz) {
          const x = gx0 + t * gw, y = padT + proj - 2 - vals[i] * k;
          dd += (i === 0 ? "M" : "L") + px(x) + " " + px(y);
        } else {
          const y = gy0 + t * gh, x = padL - projGap - vals[i] * k;
          dd += (i === 0 ? "M" : "L") + px(x) + " " + px(y);
        }
      }
      return `<path d="${dd}" fill="none" stroke="${col}" stroke-width="1.3" stroke-opacity="0.85"/>`;
    };
    s += trace(opt.xPeaks, true);
    s += trace(opt.yPeaks, false);

    /* --- لکه‌های همبستگی به‌صورتِ کانتور --- */
    (opt.cross || []).forEach(c => {
      const cxp = X(c.x), cyp = Y(c.y);
      const onDiag = Math.abs(c.x - c.y) < 1e-6;
      // قطری خاکستریِ روشن (خودِ سیگنال)، خارج‌قطری با رنگِ تکنیک (همبستگی)
      const cc = onDiag ? COL.bond : (c.color || col);
      const r0 = onDiag ? 5 : 7;
      // سه حلقهٔ تودرتو — ظاهرِ کانتورِ نقشهٔ واقعی
      [1, 0.66, 0.36].forEach((f, i) => {
        s += `<circle cx="${px(cxp)}" cy="${px(cyp)}" r="${px(r0 * f)}" fill="${cc}" fill-opacity="${0.13 + i * 0.14}" stroke="${cc}" stroke-width="${1.1 - i * 0.25}" stroke-opacity="${0.75 - i * 0.18}"/>`;
      });
      if (!onDiag && c.label) {
        s += `<text x="${px(cxp + 10)}" y="${px(cyp - 8)}" fill="${cc}" font-size="9" font-family="Consolas,monospace">${c.label}</text>`;
      }
    });

    /* --- برچسبِ محورها --- */
    s += `<text x="${gx0 + gw / 2}" y="${Hh - 8}" fill="${COL.ring}" font-size="11" text-anchor="middle">${opt.xLabel || "δ¹H (ppm)"}</text>`;
    s += `<text x="14" y="${px(gy0 + gh / 2)}" fill="${COL.ring}" font-size="11" text-anchor="middle" transform="rotate(-90 14 ${px(gy0 + gh / 2)})">${opt.yLabel || "δ (ppm)"}</text>`;
    s += `</svg>`;
    return s;
  }

  /* ---------- نمودار نوارِ نسبت مخلوط (مول٪ از انتگرال‌ها) ----------
     قبلاً هیچ رندری برای «آنالیز مخلوط» (فصل ۱۰.۲ کتاب مرجع) وجود
     نداشت. comps = [{label, molPercent, color?}] */
  function renderMixtureBars(comps) {
    comps = comps || [];
    const W = 420, rowH = 42, pad = 12;
    const Hh = pad * 2 + rowH * comps.length + 10;
    const barMaxW = W - 140;
    let s = `<svg direction="ltr" viewBox="0 0 ${W} ${Hh}" xmlns="${NS}" font-family="Vazirmatn, Tahoma, sans-serif">`;
    comps.forEach((c, i) => {
      const y = pad + i * rowH;
      const w = Math.max(2, (c.molPercent / 100) * barMaxW);
      const col = c.color || COL.accent;
      s += label(60, y + rowH / 2 - 6, c.label, COL.atom, 12);
      s += `<rect x="120" y="${y}" width="${barMaxW}" height="18" rx="3" fill="none" stroke="${COL.ring}" stroke-width="1"/>`;
      s += `<rect x="120" y="${y}" width="${w}" height="18" rx="3" fill="${col}" opacity="0.85"/>`;
      s += label(120 + barMaxW + 30, y + 9, (c.molPercent.toFixed ? c.molPercent.toFixed(1) : c.molPercent) + "%", COL.atom, 12);
    });
    s += `</svg>`;
    return s;
  }

    /* ---------- خوشهٔ ایزوتوپی به‌صورتِ طیفِ جرمیِ واقعی ----------
     پیش‌تر ستون‌های پهنِ هم‌فاصله رسم می‌شد؛ اما در طیفِ جرمی، فاصلهٔ افقی
     خودش داده است: خوشهٔ کلر M/M+2 دو واحد فاصله دارد و خوشهٔ برم هم، و
     همان فاصله است که «دو کلر» را از «یک برم» جدا می‌کند. حالا میله‌ها
     روی محورِ واقعیِ m/z می‌نشینند (نه در خانه‌های مساوی) و مثلِ طیفِ
     میله‌ایِ واقعی باریک‌اند، با محورِ شدتِ نسبی و نشانهٔ پیکِ پایه. */
  function renderIsotopePattern(clusters, baseMass) {
    clusters = clusters || [];
    const W = 440, padL = 34, padR = 16, padT = 18;
    const plotH = 122, axisH = 40;
    const Hh = padT + plotH + axisH;
    const inner = W - padL - padR;
    const yTop = padT, yBot = padT + plotH;
    const px = n => (Math.round(n * 10) / 10);

    const aria = clusters.length
      ? "خوشهٔ ایزوتوپیِ طیفِ جرمی با " + clusters.length + " پیک: " +
        clusters.map(c => (baseMass != null ? baseMass + c.massOffset : c.label) + " با شدتِ " + Math.round(c.relIntensity || 0) + " درصد").join("، ")
      : "خوشهٔ ایزوتوپی — هنوز الگویی انتخاب نشده";
    let s = `<svg direction="ltr" viewBox="0 0 ${W} ${Hh}" width="100%" xmlns="${NS}" font-family="Vazirmatn, Tahoma, sans-serif" role="img" aria-label="${escAttr(aria)}">`;
    s += `<rect x="${padL}" y="${yTop}" width="${inner}" height="${plotH}" rx="5" fill="${WELL}" stroke="${COL.ring}" stroke-width="1" stroke-opacity="0.35"/>`;

    if (!clusters.length) {
      s += `<line x1="${padL}" y1="${yBot - 2}" x2="${padL + inner}" y2="${yBot - 2}" stroke="${COL.ring}" stroke-width="1.4" stroke-opacity="0.5" stroke-dasharray="4 4"/>`;
      s += `<text x="${W / 2}" y="${yTop + plotH / 2}" fill="${COL.ring}" font-size="11" text-anchor="middle" opacity="0.7">الگوی ایزوتوپی را انتخاب کنید</text>`;
      s += `</svg>`;
      return s;
    }

    // محورِ افقی: m/z واقعی، با کمی حاشیه در دو طرف
    const masses = clusters.map(c => (baseMass != null ? baseMass + c.massOffset : c.massOffset));
    const lo = Math.min(...masses), hi = Math.max(...masses);
    const spanRaw = Math.max(4, hi - lo);
    const mLo = lo - spanRaw * 0.28, mHi = hi + spanRaw * 0.28;
    const X = m => padL + ((m - mLo) / (mHi - mLo)) * inner;

    // خط‌های راهنمای شدت
    [0, 25, 50, 75, 100].forEach(v => {
      const gy = yBot - 2 - (v / 100) * (plotH - 16);
      s += `<line x1="${padL}" y1="${px(gy)}" x2="${padL + inner}" y2="${px(gy)}" stroke="${COL.ring}" stroke-width="0.5" stroke-opacity="${v === 0 ? 0.5 : 0.14}"/>`;
      if (v % 50 === 0) s += `<text x="${padL - 5}" y="${px(gy + 3)}" fill="${COL.ring}" font-size="8.5" text-anchor="end" opacity="0.7" font-family="Consolas,monospace">${v}</text>`;
    });

    const maxRel = Math.max(...clusters.map(c => c.relIntensity || 0)) || 100;

    clusters.forEach(c => {
      const m = baseMass != null ? baseMass + c.massOffset : c.massOffset;
      const x = X(m);
      const rel = c.relIntensity || 0;
      const h = (rel / maxRel) * (plotH - 16);
      const isBase = rel >= maxRel - 0.001;
      const col = isBase ? COL.accent : COL.n;
      // میلهٔ باریک — امضای طیفِ جرمی؛ نه ستونِ نمودارِ آماری
      s += `<line x1="${px(x)}" y1="${px(yBot - 2)}" x2="${px(x)}" y2="${px(yBot - 2 - h)}" stroke="${col}" stroke-width="${isBase ? 3 : 2.4}" stroke-linecap="round"/>`;
      if (isBase) {
        s += `<circle cx="${px(x)}" cy="${px(yBot - 2 - h)}" r="2.6" fill="${col}"/>`;
      }
      // شدت بالای میله، m/z زیرِ محور
      s += `<text x="${px(x)}" y="${px(yBot - 2 - h - 6)}" fill="${col}" font-size="9.5" text-anchor="middle" font-family="Consolas,monospace">${Math.round(rel)}%</text>`;
      s += `<text x="${px(x)}" y="${px(yBot + 13)}" fill="${COL.atom}" font-size="10.5" text-anchor="middle" font-family="Consolas,monospace">${baseMass != null ? m : (c.label || m)}</text>`;
      if (c.massOffset === 0 && baseMass != null) {
        s += `<text x="${px(x)}" y="${px(yBot + 25)}" fill="${COL.ring}" font-size="8.5" text-anchor="middle" opacity="0.8">M</text>`;
      } else if (baseMass != null && c.massOffset) {
        s += `<text x="${px(x)}" y="${px(yBot + 25)}" fill="${COL.ring}" font-size="8.5" text-anchor="middle" opacity="0.8" font-family="Consolas,monospace">M+${c.massOffset}</text>`;
      }
    });

    // فاصلهٔ خوشه: همان چیزی که تعدادِ هالوژن را لو می‌دهد
    if (clusters.length > 1) {
      const m0 = baseMass != null ? baseMass + clusters[0].massOffset : clusters[0].massOffset;
      const m1 = baseMass != null ? baseMass + clusters[1].massOffset : clusters[1].massOffset;
      const gap = Math.abs(m1 - m0);
      const xa = X(m0), xb = X(m1), ym = yTop + 9;
      s += `<line x1="${px(xa)}" y1="${px(ym)}" x2="${px(xb)}" y2="${px(ym)}" stroke="${COL.ring}" stroke-width="0.9" stroke-opacity="0.6"/>`;
      s += `<line x1="${px(xa)}" y1="${px(ym - 3)}" x2="${px(xa)}" y2="${px(ym + 3)}" stroke="${COL.ring}" stroke-width="0.9" stroke-opacity="0.6"/>`;
      s += `<line x1="${px(xb)}" y1="${px(ym - 3)}" x2="${px(xb)}" y2="${px(ym + 3)}" stroke="${COL.ring}" stroke-width="0.9" stroke-opacity="0.6"/>`;
      s += `<text x="${px((xa + xb) / 2)}" y="${px(ym - 5)}" fill="${COL.ring}" font-size="8.5" text-anchor="middle" opacity="0.85" font-family="Consolas,monospace">Δ${gap}</text>`;
    }

    s += `<text x="10" y="${px(yTop + plotH / 2)}" fill="${COL.ring}" font-size="9.5" text-anchor="middle" opacity="0.85" transform="rotate(-90 10 ${px(yTop + plotH / 2)})">شدت نسبی %</text>`;
    s += `<text x="${padL + inner}" y="${Hh - 4}" fill="${COL.ring}" font-size="9.5" text-anchor="end" opacity="0.8" font-family="Consolas,monospace">m/z</text>`;
    s += `</svg>`;
    return s;
  }

  /* ---------- طیفِ شماتیکِ زنده (IR / ¹³C / ¹H) ----------
     ظرف‌های #ir-viz / #c13-viz / #h1-viz «نوار زنده» را نشان می‌دادند:
     مستطیل‌های رنگیِ تخت روی یک نوار. مشکلش این بود که هیچ شبیه طیفی که
     دانشجو در برگهٔ امتحان می‌بیند نبود — نه خط پایه‌ای، نه قله‌ای، نه
     محورِ شدت. حالا یک ردِ پیوستهٔ واقعی رسم می‌شود:

       IR   : محورِ عبور (%T)، خط پایه بالا، جذب‌ها به‌صورت فرورفتگیِ
              رو‌به‌پایین. پهنای فرورفتگی از پهنای بازهٔ باند می‌آید، پس
              O–H اسیدی (۲۵۰۰–۳۳۰۰) طبیعتاً یک تشتِ پهن می‌شود و
              C≡N (۲۲۴۰–۲۲۶۰) یک خنجرِ باریک — همان تفاوتی که در طیف
              واقعی کلیدِ تشخیص است.
       NMR  : خط پایه پایین، قله‌های تیزِ لورنتسی رو‌به‌بالا. برای ¹H هر
              ناحیه چند خطِ نزدیک می‌گیرد (شکلِ مولتی‌پلت) و پله‌ی
              انتگرال هم روی طیف می‌آید.

     محور همیشه نزولی از چپ به راست است (قراردادِ IR ۴۰۰۰→۴۰۰ و
     قراردادِ NMR ppm بالا در چپ) — مطابق renderCorrelationGrid.
     opt = { kind:"ir"|"nmr", min, max, unit, ticks:[..], integrate:bool,
             bands:[{ranges:[[lo,hi]], label, color, on}] } */

  /* جای‌گذاریِ قطعیِ خطوطِ یک مولتی‌پلت درونِ بازه.
     از هشِ برچسب استفاده می‌شود تا هر بار اجرا، همان شکل تولید شود
     (Math.random یعنی طیف با هر رندر می‌پرید). */
  function hashStr(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = (h * 16777619) >>> 0; }
    return h;
  }

  function spectrumTrace(opt) {
    opt = opt || {};
    const kind = opt.kind === "ir" ? "ir" : "nmr";
    const min = opt.min, max = opt.max, span = max - min;
    const W = 640, padL = 40, padR = 14, padT = 16;
    const plotH = 118, axisH = 26;
    const Hh = padT + plotH + axisH;
    const inner = W - padL - padR;
    const yTop = padT, yBot = padT + plotH;

    const bands = (opt.bands || []).map(b => Object.assign({}, b,
      { ranges: b.ranges || [[b.lo, b.hi]] }));
    const active = bands.filter(b => b.on);

    const X = v => padL + ((max - Math.max(min, Math.min(max, v))) / span) * inner;
    const px = n => (Math.round(n * 10) / 10);

    /* شمارِ نمونه‌های رد. ۱۰۰۰ به‌جای ۶۰۰: منحنی نرم‌تر است و هزینه‌اش
       ناچیز. (چفت‌کردنِ مرکزِ قله روی شبکهٔ نمونه هم آزموده شد؛ با
       پهنای باندهای واقعیِ برنامه تفاوتِ اندازه‌پذیری نداشت و در عوض
       فاصلهٔ خطوطِ مولتی‌پلت را کوانتیزه می‌کرد، پس کنار گذاشته شد.) */
    const N = 1000;

    /* --- ساختنِ فهرستِ «قله»ها از باندهای فعال --- */
    // هر قله: { c: مرکز, w: نیم‌پهنا (واحدِ داده), h: بلندی نسبی 0..1, band }
    const peaks = [];
    active.forEach((b, bi) => {
      const key = (b.label || "") + "|" + bi;
      b.ranges.forEach(([lo, hi], ri) => {
        const wide = Math.abs(hi - lo);
        const c0 = (lo + hi) / 2;
        if (kind === "ir") {
          // پهنای فرورفتگی از پهنای بازه: بازهٔ پهن = باندِ پهنِ واقعی
          const w = Math.max(span * 0.0045, wide * 0.40);
          peaks.push({ c: c0, w, h: 1, band: b, bi });
        } else {
          // NMR: چند خطِ تیز درونِ ناحیه — شکلِ یک مولتی‌پلت
          const w = Math.max(span * 0.0016, span * 0.0022);
          const n = wide > span * 0.12 ? 4 : wide > span * 0.04 ? 3 : 2;
          const rnd = hashStr(key + ri);
          for (let k = 0; k < n; k++) {
            // پراکندگیِ قطعی درونِ بازه، با حاشیه تا از لبه بیرون نزند
            const t = n === 1 ? 0.5 : (k + 0.5 + ((rnd >> (k * 3)) & 3) * 0.12) / n;
            const c = lo + (hi - lo) * Math.min(0.94, Math.max(0.06, t));
            const h = k === Math.floor(n / 2) ? 1 : 0.55 + ((rnd >> (k * 5)) & 3) * 0.12;
            peaks.push({ c, w, h, band: b, bi });
          }
        }
      });
    });

    /* نامِ دسترس‌پذیر: role="img" بدونِ نام، برای صفحه‌خوان یک تصویرِ
       بی‌توضیح است. خلاصه‌ای از آنچه دیده می‌شود ساخته می‌شود. */
    const aria = (kind === "ir" ? "طیفِ فروسرخ" : "طیفِ رزونانس مغناطیسی") +
      " از " + max + " تا " + min + " " + (opt.unit || "") +
      (active.length ? "، " + active.length + " باندِ فعال: " + active.map(b => b.label).join("، ")
                     : "، هنوز باندی ثبت نشده");
    let s = `<svg direction="ltr" viewBox="0 0 ${W} ${Hh}" width="100%" xmlns="${NS}" font-family="Vazirmatn, Tahoma, sans-serif" role="img" aria-label="${escAttr(aria)}">`;

    /* --- بسترِ نمودار + شبکه --- */
    s += `<rect x="${padL}" y="${yTop}" width="${inner}" height="${plotH}" rx="5" fill="${WELL}" stroke="${COL.ring}" stroke-width="1" stroke-opacity="0.35"/>`;
    for (let g = 1; g < 4; g++) {
      const gy = yTop + (plotH * g) / 4;
      s += `<line x1="${padL}" y1="${px(gy)}" x2="${padL + inner}" y2="${px(gy)}" stroke="${COL.ring}" stroke-width="0.5" stroke-opacity="0.16"/>`;
    }
    (opt.ticks || []).forEach(t => {
      const x = X(t);
      s += `<line x1="${px(x)}" y1="${yTop}" x2="${px(x)}" y2="${yBot}" stroke="${COL.ring}" stroke-width="0.5" stroke-opacity="0.13"/>`;
    });

    /* --- ناحیهٔ باندها در پس‌زمینه: غیرفعال بسیار محو، فعال رنگی --- */
    bands.filter(b => !b.on).forEach(b => b.ranges.forEach(([lo, hi]) => {
      const x1 = X(hi), x2 = X(lo);
      s += `<rect x="${px(Math.min(x1, x2))}" y="${yTop + 1}" width="${px(Math.max(1.5, Math.abs(x2 - x1)))}" height="${plotH - 2}" fill="${COL.ring}" fill-opacity="0.045"/>`;
    }));
    active.forEach(b => b.ranges.forEach(([lo, hi]) => {
      const x1 = X(hi), x2 = X(lo);
      const col = b.color || COL.accent;
      s += `<rect x="${px(Math.min(x1, x2))}" y="${yTop + 1}" width="${px(Math.max(2, Math.abs(x2 - x1)))}" height="${plotH - 2}" fill="${col}" fill-opacity="0.10"/>`;
    }));

    /* --- ردِ طیف --- */
    const shape = (v) => {           // شدتِ کلِ نرمال‌شده در نقطهٔ v
      let sum = 0;
      for (const p of peaks) {
        const d = (v - p.c) / p.w;
        sum += kind === "ir"
          ? p.h * Math.exp(-0.5 * d * d)          // گاوسیِ جذبِ IR
          : p.h / (1 + d * d);                    // لورنتسیِ خطِ NMR
      }
      return sum;
    };
    // بیشینه برای نرمال‌سازی، تا قله‌ها همیشه درونِ کادر بمانند
    let peakMax = 0;
    const samples = [];
    for (let i = 0; i <= N; i++) {
      const v = max - (span * i) / N;              // چپ = max
      const y = shape(v);
      samples.push(y);
      if (y > peakMax) peakMax = y;
    }
    const norm = peakMax > 0 ? 1 / peakMax : 0;
    const usable = plotH - 14;                      // حاشیه تا قله به لبه نچسبد

    let d = "";
    for (let i = 0; i <= N; i++) {
      const x = padL + (inner * i) / N;
      const a = samples[i] * norm;
      const y = kind === "ir"
        ? yTop + 5 + a * usable                     // خط پایه بالا، فرورفتگی به پایین
        : yBot - 3 - a * usable;                    // خط پایه پایین، قله به بالا
      d += (i === 0 ? "M" : "L") + px(x) + " " + px(y);
    }

    const traceCol = (active[0] && active[0].color) || COL.accent;
    if (peaks.length) {
      // پرِ محوِ زیرِ رد، برای این‌که «طیف» خوانده شود نه «نمودار خطی»
      const closeY = kind === "ir" ? yTop + 5 : yBot - 3;
      s += `<path d="${d} L${px(padL + inner)} ${px(closeY)} L${px(padL)} ${px(closeY)} Z" fill="${traceCol}" fill-opacity="0.13"/>`;
      s += `<path d="${d}" fill="none" stroke="${traceCol}" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"/>`;
    } else {
      // حالتِ خالی: خطِ پایهٔ صاف، تا کادر مرده به نظر نرسد
      const by = kind === "ir" ? yTop + 5 : yBot - 3;
      s += `<line x1="${padL}" y1="${px(by)}" x2="${padL + inner}" y2="${px(by)}" stroke="${COL.ring}" stroke-width="1.4" stroke-opacity="0.5" stroke-dasharray="4 4"/>`;
    }

    /* --- پله‌ی انتگرال (فقط ¹H) --- */
    if (opt.integrate && peaks.length && kind === "nmr") {
      let cum = 0;
      const total = samples.reduce((a, b) => a + b, 0) || 1;
      let di = "";
      for (let i = 0; i <= N; i++) {
        cum += samples[i];
        const x = padL + (inner * i) / N;
        const y = yBot - 3 - (cum / total) * (plotH - 26);
        di += (i === 0 ? "M" : "L") + px(x) + " " + px(y);
      }
      s += `<path d="${di}" fill="none" stroke="${COL.ring}" stroke-width="1.1" stroke-opacity="0.55" stroke-dasharray="3 3"/>`;
      s += `<text x="${padL + inner - 2}" y="${yTop + 11}" fill="${COL.ring}" font-size="9" text-anchor="end" opacity="0.75">پله‌ی انتگرال</text>`;
    }

    /* --- شمارهٔ باندها روی قلهٔ خودشان --- */
    const seen = new Set();
    peaks.forEach(p => {
      if (seen.has(p.bi)) return;
      seen.add(p.bi);
      const col = p.band.color || COL.accent;
      const x = X(p.c);
      const a = shape(p.c) * norm;
      const y = kind === "ir"
        ? Math.min(yBot - 8, yTop + 5 + a * usable + 11)
        : Math.max(yTop + 9, yBot - 3 - a * usable - 11);
      const n = active.indexOf(p.band) + 1;
      s += `<circle cx="${px(x)}" cy="${px(y)}" r="7.5" fill="${WELL}" stroke="${col}" stroke-width="1.3"/>`;
      s += `<text x="${px(x)}" y="${px(y)}" fill="${col}" font-size="10" font-weight="700" text-anchor="middle" dominant-baseline="central" font-family="Consolas,monospace">${n}</text>`;
    });

    /* --- محورها --- */
    s += `<line x1="${padL}" y1="${yBot}" x2="${padL + inner}" y2="${yBot}" stroke="${COL.ring}" stroke-width="1" stroke-opacity="0.6"/>`;
    (opt.ticks || []).forEach(t => {
      const x = X(t);
      s += `<line x1="${px(x)}" y1="${yBot}" x2="${px(x)}" y2="${yBot + 4}" stroke="${COL.ring}" stroke-width="1" stroke-opacity="0.7"/>`;
      s += `<text x="${px(x)}" y="${yBot + 15}" fill="${COL.ring}" font-size="9.5" text-anchor="middle" font-family="Consolas,monospace">${t}</text>`;
    });
    s += `<text x="${padL + inner}" y="${Hh - 2}" fill="${COL.ring}" font-size="9.5" text-anchor="end" opacity="0.8" font-family="Consolas,monospace">${opt.unit || ""}</text>`;

    // برچسبِ محورِ عمودی — همان چیزی که «طیف» را از «نوار» جدا می‌کند
    const yLabel = kind === "ir" ? "عبور %T" : "شدت";
    s += `<text x="10" y="${yTop + plotH / 2}" fill="${COL.ring}" font-size="9.5" text-anchor="middle" opacity="0.85" transform="rotate(-90 10 ${px(yTop + plotH / 2)})">${yLabel}</text>`;
    if (kind === "ir") {
      s += `<text x="${padL - 5}" y="${yTop + 9}" fill="${COL.ring}" font-size="9" text-anchor="end" opacity="0.7" font-family="Consolas,monospace">100</text>`;
      s += `<text x="${padL - 5}" y="${yBot - 2}" fill="${COL.ring}" font-size="9" text-anchor="end" opacity="0.7" font-family="Consolas,monospace">0</text>`;
    }

    s += `</svg>`;

    /* --- افسانهٔ HTML: خوانا در هر عرضی (متنِ SVG در کارتِ باریک ناخوانا می‌شد) --- */
    if (!active.length) {
      s += `<div class="empty-hint" style="font-size:var(--fs-sm);margin-top:4px">${opt.emptyHint || "هنوز شاهدی تیک نخورده — با تیک‌زدن، طیف این‌جا شکل می‌گیرد."}</div>`;
    } else {
      s += `<div style="display:flex;flex-wrap:wrap;gap:4px 14px;margin-top:6px">` +
        active.map((b, i) => {
          const col = b.color || COL.accent;
          const rng = b.ranges.map(([lo, hi]) => `${hi}–${lo}`).join(" · ");
          return `<span style="display:inline-flex;align-items:center;gap:5px;font-size:var(--fs-xs);color:var(--muted)">
            <b style="min-width:15px;height:15px;border-radius:4px;background:${col};color:var(--plot-badge-ink);font-size:var(--fs-2xs);display:inline-flex;align-items:center;justify-content:center;font-family:Consolas,monospace">${i + 1}</b>
            <span style="color:var(--ink-2)">${b.label}</span>
            <span class="en" style="font-size:var(--fs-2xs);opacity:.75">${rng}</span></span>`;
        }).join("") + `</div>`;
    }
    return s;
  }

  /* --- نمودار تقارن مولکولی: اتم‌های هم‌محیط با رنگ یکسان --- */
  /* دوازده رنگِ متمایز برای کلاس‌های تقارن — هر دو پوسته مقدارِ خودش را
     در --sym-1 … --sym-12 دارد. */
  const SYM_PALETTE = Array.from({ length: 12 }, function (_, i) {
    return "var(--sym-" + (i + 1) + ")";
  });
  function symmetrySVG(data) {
    if (!data || !data.atoms || !data.atoms.length) return "";
    const A = data.atoms, B = data.bonds;
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    A.forEach(a => { minX = Math.min(minX, a.x); maxX = Math.max(maxX, a.x); minY = Math.min(minY, a.y); maxY = Math.max(maxY, a.y); });
    const pad = 40, spanX = (maxX - minX) || 1, spanY = (maxY - minY) || 1;
    const W = 560, scale = Math.min((W - 2 * pad) / spanX, 320 / spanY);
    const Hh = spanY * scale + 2 * pad;
    const tx = x => pad + (x - minX) * scale;
    const ty = y => pad + (y - minY) * scale;
    let s = `<svg direction="ltr" viewBox="0 0 ${W} ${Hh.toFixed(0)}" xmlns="${NS}" font-family="Vazirmatn, Tahoma, sans-serif">`;
    // پیوندها
    B.forEach(b => {
      const x1 = tx(A[b.a].x), y1 = ty(A[b.a].y), x2 = tx(A[b.b].x), y2 = ty(A[b.b].y);
      if (b.order === 2) {
        const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy) || 1, ox = -dy / len * 3, oy = dx / len * 3;
        s += `<line x1="${(x1 + ox).toFixed(1)}" y1="${(y1 + oy).toFixed(1)}" x2="${(x2 + ox).toFixed(1)}" y2="${(y2 + oy).toFixed(1)}" stroke="${COL.bond}" stroke-width="1.6"/>`;
        s += `<line x1="${(x1 - ox).toFixed(1)}" y1="${(y1 - oy).toFixed(1)}" x2="${(x2 - ox).toFixed(1)}" y2="${(y2 - oy).toFixed(1)}" stroke="${COL.bond}" stroke-width="1.6"/>`;
      } else if (b.order === 3) {
        s += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${COL.bond}" stroke-width="4" opacity="0.4"/>`;
        s += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${COL.bond}" stroke-width="1.5"/>`;
      } else {
        s += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${COL.bond}" stroke-width="1.8" ${b.order === 1.5 ? 'stroke-dasharray="4 3"' : ""}/>`;
      }
    });
    // اتم‌ها (رنگ بر پایهٔ کلاس هم‌ارزی)
    A.forEach(a => {
      const col = SYM_PALETTE[a.classId % SYM_PALETTE.length];
      const x = tx(a.x), y = ty(a.y);
      const lbl = a.el + (a.H > 0 && a.el !== "C" ? "H" + (a.H > 1 ? a.H : "") : "");
      s += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="14" fill="${col}" fill-opacity="0.22" stroke="${col}" stroke-width="2.2"/>`;
      s += `<text x="${x.toFixed(1)}" y="${(y + 4).toFixed(1)}" fill="${col}" font-size="12" font-weight="700" text-anchor="middle">${lbl}</text>`;
    });
    s += `</svg>`;
    return { svg: s, palette: SYM_PALETTE };
  }

  /* =====================================================================
     moleculeSVG — ساختارِ اسکلتیِ واقعی
     ---------------------------------------------------------------------
     symmetrySVG هر اتم را یک دایرهٔ برچسب‌دار می‌کشد. برای «نقشهٔ تقارن»
     خوب است، ولی ساختارِ شیمیایی آن‌طور که در کتاب کشیده می‌شود نیست:
     کربن‌ها باید گره باشند نه حرف، حلقهٔ آروماتیک حلقهٔ داخلی می‌خواهد،
     و پیوندِ دوگانهٔ درونِ حلقه باید به سمتِ داخلِ حلقه بیفتد.

     ورودی خروجیِ Structure.depict است (که مختصاتش هندسی است نه فنری).
     opts.mode === "symmetry" اتم‌ها را به رنگِ کلاسِ هم‌ارزی می‌کشد، تا
     دانشجو ببیند چرا ¹³C فلان تعداد پیک دارد؛ حالتِ پیش‌فرض تک‌رنگ است.
     ===================================================================== */
  const HET_LABEL = { O: 1, N: 1, S: 1, P: 1, F: 1, Cl: 1, Br: 1, I: 1, B: 1 };
  const SUB = { 0: "₀", 1: "₁", 2: "₂", 3: "₃", 4: "₄", 5: "₅", 6: "₆", 7: "₇", 8: "₈", 9: "₉" };
  function subscript(n) { return String(n).split("").map(d => SUB[d] || d).join(""); }

  function moleculeSVG(data, opts) {
    if (!data || !data.atoms || !data.atoms.length) return "";
    opts = opts || {};
    const A = data.atoms, B = data.bonds || [];
    const symMode = opts.mode === "symmetry";
    const W = opts.width || 320, maxH = opts.height || 220;

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    A.forEach(a => {
      minX = Math.min(minX, a.x); maxX = Math.max(maxX, a.x);
      minY = Math.min(minY, a.y); maxY = Math.max(maxY, a.y);
    });
    const pad = 22, spanX = (maxX - minX) || 1, spanY = (maxY - minY) || 1;
    const scale = Math.min((W - 2 * pad) / spanX, (maxH - 2 * pad) / spanY, 1.5);
    const Hh = spanY * scale + 2 * pad;
    const tx = x => pad + (x - minX) * scale;
    const ty = y => pad + (y - minY) * scale;

    /* کدام اتم برچسب می‌گیرد: هترواتم‌ها همیشه، و کربن هرگز — مگر در
       حالتِ تقارن که همه باید رنگ و برچسب داشته باشند. */
    const labelled = A.map(a => symMode || !!HET_LABEL[a.el]);
    const labelOf = a => {
      if (a.el === "C" && !symMode) return "";
      let t = a.el;
      if (a.H > 0 && (a.el !== "C" || symMode)) t += "H" + (a.H > 1 ? subscript(a.H) : "");
      if (a.charge > 0) t += a.charge > 1 ? subscript(a.charge) + "+" : "+";
      if (a.charge < 0) t += a.charge < -1 ? subscript(-a.charge) + "−" : "−";
      return t;
    };
    const colOf = a => symMode ? SYM_PALETTE[a.classId % SYM_PALETTE.length] : COL.bond;

    /* خط را از مرکزِ اتمِ برچسب‌دار عقب می‌کشیم تا روی حروف نیفتد */
    const GAP = symMode ? 15 : 10;
    function trim(x1, y1, x2, y2, i, j) {
      const dx = x2 - x1, dy = y2 - y1, d = Math.hypot(dx, dy) || 1;
      const g1 = labelled[i] ? GAP : 0, g2 = labelled[j] ? GAP : 0;
      return [x1 + (dx / d) * g1, y1 + (dy / d) * g1,
              x2 - (dx / d) * g2, y2 - (dy / d) * g2];
    }

    /* مرکزِ هر حلقه، برای این‌که پیوندِ دوگانهٔ درونِ حلقه به سمتِ داخل
       بیفتد و حلقهٔ آروماتیک دایرهٔ داخلی بگیرد. */
    const rings = data.rings || [];
    const ringInfo = rings.map(r => {
      let cx = 0, cy = 0;
      r.forEach(k => { cx += A[k].x; cy += A[k].y; });
      return { atoms: new Set(r), cx: cx / r.length, cy: cy / r.length,
               arom: r.every(k => A[k].arom) };
    });
    const ringOf = (i, j) => ringInfo.find(r => r.atoms.has(i) && r.atoms.has(j));

    let s = `<svg direction="ltr" viewBox="0 0 ${W} ${Hh.toFixed(0)}" xmlns="${NS}" ` +
            `font-family="Vazirmatn, Tahoma, sans-serif" role="img"`;
    if (opts.title) s += ` aria-label="${escAttr(opts.title)}"`;
    s += `>`;

    const line = (x1, y1, x2, y2, w, c) =>
      `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" ` +
      `stroke="${c || COL.bond}" stroke-width="${w || 1.7}" stroke-linecap="round"/>`;

    B.forEach((b, bi) => {
      const [x1, y1, x2, y2] = trim(tx(A[b.a].x), ty(A[b.a].y), tx(A[b.b].x), ty(A[b.b].y), b.a, b.b);
      /* هر پیوند یک خطِ نامرئیِ روکش می‌گیرد تا شکستِ جرمی بتواند
         «این پیوند پاره می‌شود» را نشان بدهد. */
      if (opts.interactive) {
        s += `<line class="mol-bond" data-bond="${bi}" x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" ` +
             `x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="transparent" stroke-width="7"/>`;
      }
      const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy) || 1;
      const ox = (-dy / len) * 3.4, oy = (dx / len) * 3.4;
      const ring = ringOf(b.a, b.b);

      if (b.order === 2) {
        if (ring) {
          // خطِ دوم به سمتِ مرکزِ حلقه، کمی کوتاه‌تر — قراردادِ کتابی
          const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
          const toC = { x: tx(ring.cx) - mx, y: ty(ring.cy) - my };
          const sign = (toC.x * ox + toC.y * oy) >= 0 ? 1 : -1;
          s += line(x1, y1, x2, y2);
          s += line(x1 + sign * ox + dx * 0.14, y1 + sign * oy + dy * 0.14,
                    x2 + sign * ox - dx * 0.14, y2 + sign * oy - dy * 0.14, 1.5);
        } else {
          s += line(x1 + ox, y1 + oy, x2 + ox, y2 + oy, 1.6);
          s += line(x1 - ox, y1 - oy, x2 - ox, y2 - oy, 1.6);
        }
      } else if (b.order === 3) {
        s += line(x1, y1, x2, y2, 1.6);
        s += line(x1 + ox, y1 + oy, x2 + ox, y2 + oy, 1.4);
        s += line(x1 - ox, y1 - oy, x2 - ox, y2 - oy, 1.4);
      } else {
        // پیوندِ آروماتیک هم خطِ ساده است؛ حلقهٔ داخلی پایین‌تر کشیده می‌شود
        s += line(x1, y1, x2, y2);
      }
    });

    // حلقهٔ داخلیِ آروماتیک
    ringInfo.forEach(r => {
      if (!r.arom) return;
      let rad = Infinity;
      r.atoms.forEach(k => {
        rad = Math.min(rad, Math.hypot(tx(A[k].x) - tx(r.cx), ty(A[k].y) - ty(r.cy)));
      });
      s += `<circle cx="${tx(r.cx).toFixed(1)}" cy="${ty(r.cy).toFixed(1)}" r="${(rad * 0.62).toFixed(1)}" ` +
           `fill="none" stroke="${COL.bond}" stroke-width="1.4" opacity="0.75"/>`;
    });

    /* دایره‌های نامرئیِ نشانه‌گیری: در حالتِ اسکلتی کربن هیچ عنصرِ
       تصویری ندارد (گره است، نه حرف)، پس چیزی برای هاور یا کلیک وجود
       ندارد. این‌ها هدفِ اشاره‌گر و هم‌زمان محلِ برجسته‌سازی‌اند و با
       data-atom/data-cls به پیک‌های طیف وصل می‌شوند. */
    if (opts.interactive) {
      A.forEach((a, i) => {
        s += `<circle class="mol-atom" data-atom="${i}" data-cls="${a.classId}" ` +
             `cx="${tx(a.x).toFixed(1)}" cy="${ty(a.y).toFixed(1)}" r="12" ` +
             `fill="transparent" stroke="none" style="cursor:pointer"/>`;
      });
    }

    A.forEach((a, i) => {
      if (!labelled[i]) return;
      const x = tx(a.x), y = ty(a.y), col = colOf(a), lbl = labelOf(a);
      if (symMode) {
        s += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="13" fill="${col}" ` +
             `fill-opacity="0.20" stroke="${col}" stroke-width="2"/>`;
      } else {
        // ماسکِ هم‌رنگِ زمینه تا خط از پشتِ حرف رد نشود
        s += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(lbl.length > 2 ? 13 : 10)}" fill="${WELL}"/>`;
      }
      s += `<text x="${x.toFixed(1)}" y="${(y + 4.2).toFixed(1)}" fill="${symMode ? col : COL.atom}" ` +
           `font-size="12.5" font-weight="${symMode ? 700 : 600}" text-anchor="middle">${lbl}</text>`;
    });

    s += `</svg>`;
    return symMode ? { svg: s, palette: SYM_PALETTE } : s;
  }

  /* =====================================================================
     shiftStrip — نوارِ پیک‌های ¹³C که به اتم‌ها وصل است
     ---------------------------------------------------------------------
     هر پیک data-cls دارد، همان شناسه‌ای که دایره‌های نشانه‌گیریِ
     moleculeSVG دارند. پیوندِ «کدام پیک، کدام کربن» با همین یک صفت
     برقرار می‌شود و هیچ حالتِ اضافه‌ای لازم نیست.
     محورِ ۲۲۰→۰ از چپ به راست، همان قراردادِ spectrumTrace.
     ===================================================================== */
  function shiftStrip(peaks, opts) {
    opts = opts || {};
    if (!peaks || !peaks.length) return "";
    const W = opts.width || 300, H2 = 62, padX = 10, top = 10, base = 40;
    const lo = 0, hi = 220;
    const x = d => padX + (W - 2 * padX) * (1 - (Math.max(lo, Math.min(hi, d)) - lo) / (hi - lo));
    let s = `<svg direction="ltr" viewBox="0 0 ${W} ${H2}" xmlns="${NS}" ` +
            `font-family="Vazirmatn, Tahoma, sans-serif">`;
    s += `<line x1="${padX}" y1="${base}" x2="${W - padX}" y2="${base}" stroke="${COL.ring}" stroke-width="1"/>`;
    [200, 150, 100, 50, 0].forEach(t => {
      s += `<line x1="${x(t).toFixed(1)}" y1="${base}" x2="${x(t).toFixed(1)}" y2="${base + 3}" stroke="${COL.ring}" stroke-width="1"/>`;
      s += `<text x="${x(t).toFixed(1)}" y="${base + 15}" fill="${COL.ring}" font-size="9" text-anchor="middle">${t}</text>`;
    });
    peaks.forEach(p => {
      const col = SYM_PALETTE[p.classId % SYM_PALETTE.length];
      const px = x(p.delta);
      s += `<g class="c13-peak" data-cls="${p.classId}" style="cursor:pointer">`;
      // هدفِ کلیکِ پهن‌تر از خودِ خط، وگرنه گرفتنش سخت است
      s += `<rect x="${(px - 6).toFixed(1)}" y="${top - 4}" width="12" height="${base - top + 8}" fill="transparent"/>`;
      s += `<line x1="${px.toFixed(1)}" y1="${top}" x2="${px.toFixed(1)}" y2="${base}" stroke="${col}" stroke-width="2.2"/>`;
      s += `<title>${escAttr(p.delta.toFixed(1) + " ppm — " + (p.kind || ""))}</title>`;
      s += `</g>`;
    });
    s += `</svg>`;
    return s;
  }

  /* --- فلوچارت شماتیک شناسایی کلاسیک (طرح حلالیت شرینر) --- */
  function flowNode(x, y, w, txt, kind) {
    const col = kind === "q" ? COL.accent : kind === "res" ? "var(--plot-x)" : COL.ring;
    const h = 34;
    return `<g><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" fill="${col}" fill-opacity="0.12" stroke="${col}" stroke-width="1.6"/>` +
      `<text x="${x + w / 2}" y="${y + 22}" fill="${col === COL.ring ? COL.atom : col}" font-size="12" text-anchor="middle">${txt}</text></g>`;
  }
  function flowArrow(x1, y1, x2, y2, lbl) {
    let s = `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${COL.bond}" stroke-width="1.4" marker-end="url(#fa)"/>`;
    if (lbl) s += `<text x="${(x1 + x2) / 2 + 6}" y="${(y1 + y2) / 2}" fill="${COL.ring}" font-size="10">${lbl}</text>`;
    return s;
  }
  function solubilityFlowchart() {
    // viewBox باید کل گره‌ها را در بر بگیرد: گره‌های سمت چپِ پایین تا x=675
    // و y=446 می‌رسند. مقدار قبلی (۶۲۰×۴۳۰) باعث می‌شد کادرهای نتیجهٔ
    // «MN» و «I» از راست ۵۵px و از پایین ۱۶px بریده شوند.
    const W = 690, H2 = 462;
    let s = `<svg direction="ltr" viewBox="0 0 ${W} ${H2}" xmlns="${NS}" font-family="Vazirmatn, Tahoma, sans-serif">`;
    s += `<defs><marker id="fa" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="${COL.bond}"/></marker></defs>`;
    s += `<text x="${W / 2}" y="20" fill="${COL.accent}" font-size="13" text-anchor="middle">فلوچارت شناسایی بر پایهٔ حلالیت (شرینر)</text>`;
    // ستون راست→چپ (RTL منطق): نمونه بالا، شاخه‌ها پایین
    s += flowNode(240, 34, 140, "نمونهٔ مجهول", "q");
    s += flowArrow(310, 68, 310, 88);
    s += flowNode(210, 88, 200, "محلول در آب؟", "q");
    // بله → اتر
    s += flowArrow(210, 105, 120, 130, "بله");
    s += flowNode(30, 130, 180, "محلول در اتر؟", "q");
    s += flowArrow(80, 164, 60, 188, "بله"); s += flowNode(10, 188, 100, "S1", "res");
    s += flowArrow(160, 164, 175, 188, "خیر"); s += flowNode(120, 188, 100, "S2", "res");
    // خیر → NaOH
    s += flowArrow(410, 105, 470, 130, "خیر");
    s += flowNode(390, 130, 210, "محلول در NaOH ۵٪؟", "q");
    // بله → NaHCO3
    s += flowArrow(430, 164, 380, 190, "بله");
    s += flowNode(280, 190, 210, "محلول در NaHCO₃؟", "q");
    s += flowArrow(320, 224, 300, 250, "بله"); s += flowNode(250, 250, 110, "A1: اسید قوی", "res");
    s += flowArrow(450, 224, 470, 250, "خیر"); s += flowNode(370, 250, 150, "A2: فنول/اسید ضعیف", "res");
    // خیر → HCl
    s += flowArrow(560, 164, 560, 300, "خیر");
    s += flowNode(455, 300, 210, "محلول در HCl ۵٪؟", "q");
    s += flowArrow(490, 334, 470, 358, "بله"); s += flowNode(410, 358, 130, "B: آمین (باز)", "res");
    s += flowArrow(620, 334, 600, 360, "خیر");
    s += flowNode(470, 360, 200, "محلول در H₂SO₄ غلیظ؟", "q");
    s += flowArrow(520, 394, 500, 412, "بله"); s += flowNode(430, 412, 150, "MN: خنثی هترواتم‌دار", "res");
    s += flowArrow(640, 394, 640, 412, "خیر"); s += flowNode(585, 412, 90, "I: بی‌اثر", "res");
    s += `</svg>`;
    return s;
  }

  root.Renderer = {
    renderChain, renderFragmentChips, blockGlyph, splittingTree,
    renderCorrelationGrid, renderMixtureBars, renderIsotopePattern,
    symmetrySVG, moleculeSVG, shiftStrip, solubilityFlowchart, spectrumTrace
  };
  // نکته: نسخهٔ اصلی این خروجی CommonJS را نداشت (برخلاف structure.js) و
  // فقط در مرورگر (window.Renderer) قابل استفاده بود؛ برای یکدستی و
  // قابلیت تست/باندل، همان الگوی UMD موجود در structure.js اضافه شد.
  if (typeof module !== "undefined" && module.exports) module.exports = root.Renderer;
})(typeof window !== "undefined" ? window : globalThis);