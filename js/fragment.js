/* =====================================================================
   fragment.js — شکستِ جرمی روی گرافِ واقعیِ مولکول
   ---------------------------------------------------------------------
   تا پیش از این، مسیرِ شکست فقط متن بود: رکورد می‌نوشت «مک‌لافرتی» و هیچ
   چیز آن ادعا را نمی‌سنجید. حالا که هر ترکیب گرافِ اتصال دارد، شکست
   محاسبه‌شدنی است — کدام پیوند پاره می‌شود، چه چیزی می‌رود، و چه m/z
   می‌ماند.

   نمونه‌ای که ارزشش را نشان می‌دهد: مک‌لافرتی به γ-هیدروژن نیاز دارد،
   یعنی هیدروژنی روی اتمِ سه‌پیوند دورتر از کربنِ کربونیل، تا حلقهٔ
   شش‌عضویِ حالتِ گذار بسته شود. این یک پرس‌وجوی ساده روی گراف است و
   پیش از داشتنِ گراف اصلاً ممکن نبود. پروپیونیک اسید سه کربن دارد و
   γ-هیدروژن ندارد، پس هر ادعای مک‌لافرتی رویش غلط است — خطایی که یک‌بار
   با چشم پیدا شد و حالا خودکار پیدا می‌شود.

   قاعدهٔ صحت: هر مسیر فقط وقتی اعلام می‌شود که *پیش‌شرطش روی گراف*
   برقرار باشد. هیچ قطعه‌ای از روی شباهت یا حدس ساخته نمی‌شود.
   ===================================================================== */
(function (root) {
  "use strict";

  const NOMINAL = { C: 12, H: 1, N: 14, O: 16, F: 19, Cl: 35, Br: 79, I: 127, S: 32, P: 31 };

  function adjacency(mol) {
    const adj = mol.atoms.map(() => []);
    mol.bonds.forEach((b, k) => {
      adj[b.a].push({ to: b.b, order: b.order, bond: k });
      adj[b.b].push({ to: b.a, order: b.order, bond: k });
    });
    return adj;
  }

  function massOf(mol, idxSet) {
    let m = 0;
    for (const i of idxSet) {
      const a = mol.atoms[i];
      if (!(a.el in NOMINAL)) return null;
      m += NOMINAL[a.el] + (a.H || 0);
    }
    return m;
  }
  function molecularIon(mol) { return massOf(mol, mol.atoms.map((_, i) => i)); }

  /* اتم‌هایی که پس از برداشتنِ یک پیوند، سمتِ `from` می‌مانند.
     اگر پیوند داخلِ حلقه باشد هر دو سر به هم می‌رسند و null برمی‌گردد:
     پاره‌کردنِ یک پیوندِ حلقوی مولکول را دو تکه نمی‌کند. */
  function sideAfterCut(mol, adj, cutBond, from) {
    const seen = new Set([from]), st = [from];
    while (st.length) {
      const v = st.pop();
      for (const e of adj[v]) {
        if (e.bond === cutBond) continue;
        if (seen.has(e.to)) continue;
        seen.add(e.to); st.push(e.to);
      }
    }
    return seen;
  }

  const isCarbonyl = (mol, adj, i) => mol.atoms[i].el === "C" &&
    adj[i].some(e => e.order === 2 && mol.atoms[e.to].el === "O");
  const isHetero = (mol, i) => ["O", "N", "S"].indexOf(mol.atoms[i].el) >= 0;
  const isAromatic = (mol, i) => !!mol.atoms[i].arom;

  /* ---------- ۱) شکستِ آلفا و بنزیلی ----------
     هر پیوندِ یگانهٔ غیرحلقوی بررسی می‌شود. بار روی قطعه‌ای می‌ماند که
     بتواند پایدارش کند — همان قاعدهٔ استیونسون که پایگاه هم داردش. */
  function simpleCleavages(mol, adj, M) {
    const out = [];
    mol.bonds.forEach((b, k) => {
      if (b.order !== 1) return;
      const left = sideAfterCut(mol, adj, k, b.a);
      if (left.has(b.b)) return;                 // پیوندِ حلقوی: دو تکه نمی‌شود
      const right = sideAfterCut(mol, adj, k, b.b);
      [[b.a, left, b.b], [b.b, right, b.a]].forEach(t => {
        const root = t[0], keep = t[1], gone = t[2];
        if (keep.size < 2) return;               // قطعهٔ تک‌اتمی گزارش نمی‌شود
        const mz = massOf(mol, keep);
        if (mz == null || mz >= M) return;
        let type = null, fa = null;
        if (isCarbonyl(mol, adj, root)) {
          type = "acylium"; fa = "شکستِ آلفا — یونِ آسیلیوم";
        } else if (isHetero(mol, root) || adj[root].some(e => keep.has(e.to) && isHetero(mol, e.to))) {
          type = "alpha_hetero"; fa = "شکستِ آلفا کنارِ هترواتم";
        } else if (adj[root].some(e => keep.has(e.to) && isAromatic(mol, e.to)) &&
                   mol.atoms[root].el === "C" && !mol.atoms[root].arom) {
          type = "benzylic"; fa = "شکستِ بنزیلی (تروپیلیوم اگر C₇H₇)";
        }
        if (!type) return;
        out.push({ type, fa, mz, lost: M - mz, cutBond: k, keep: [...keep] });
      });
    });
    return out;
  }

  /* ---------- ۲) مک‌لافرتی ----------
     شرطِ لازم: کربونیل، و هیدروژنی روی اتمِ گاما (سه پیوند دورتر) که از
     مسیرِ کربنیِ غیرآروماتیک برسد. حلقهٔ آروماتیک صُلب است و نمی‌تواند
     حالتِ گذارِ شش‌عضوی را ببندد، پس مسیرِ آروماتیک رد می‌شود — بدونِ این
     شرط، استوفنون به‌غلط مک‌لافرتی می‌گیرد.
     قطعهٔ باقی‌مانده = سمتِ کربونیل + همان هیدروژنِ منتقل‌شده. */
  function mclafferty(mol, adj, M) {
    const out = [];
    mol.atoms.forEach((a, c) => {
      if (!isCarbonyl(mol, adj, c)) return;
      for (const e1 of adj[c]) {                                   // آلفا
        const al = e1.to;
        if (mol.atoms[al].el !== "C" || mol.atoms[al].arom) continue;
        for (const e2 of adj[al]) {                                // بتا
          const be = e2.to;
          if (be === c || mol.atoms[be].el !== "C" || mol.atoms[be].arom) continue;
          for (const e3 of adj[be]) {                              // گاما
            const ga = e3.to;
            if (ga === al || mol.atoms[ga].arom) continue;
            if (!(mol.atoms[ga].H > 0)) continue;
            // پیوندِ آلفا–بتا پاره می‌شود و سمتِ کربونیل می‌ماند
            const bondIdx = mol.bonds.findIndex(b =>
              (b.a === al && b.b === be) || (b.a === be && b.b === al));
            if (bondIdx < 0) continue;
            const keep = sideAfterCut(mol, adj, bondIdx, al);
            if (keep.has(be)) continue;                            // درونِ حلقه
            const mz = massOf(mol, keep);
            if (mz == null) continue;
            const withH = mz + 1;                                  // هیدروژنِ γ منتقل می‌شود
            if (withH >= M) continue;
            if (out.some(x => x.mz === withH)) continue;
            out.push({
              type: "mclafferty",
              fa: "بازآراییِ مک‌لافرتی (انتقالِ γ-هیدروژن)",
              mz: withH, lost: M - withH, cutBond: bondIdx, keep: [...keep],
              gamma: ga
            });
          }
        }
      }
    });
    return out;
  }

  /* ---------- ۳) خروجِ خنثیِ کوچک ----------
     فقط وقتی اعلام می‌شود که گروهِ لازم واقعاً در مولکول باشد. */
  function neutralLosses(mol, adj, M) {
    const out = [];
    const add = (mass, fa, cond) => {
      if (!cond) return;
      if (M - mass <= 0) return;
      out.push({ type: "loss", fa, mz: M - mass, lost: mass, cutBond: -1, keep: [] });
    };
    const hasOH = mol.atoms.some((a, i) => a.el === "O" && a.H > 0 &&
      adj[i].some(e => mol.atoms[e.to].el === "C"));
    const hasCO = mol.atoms.some((a, i) => isCarbonyl(mol, adj, i));
    const hasCN = mol.bonds.some(b => b.order === 3 &&
      ((mol.atoms[b.a].el === "C" && mol.atoms[b.b].el === "N") ||
       (mol.atoms[b.b].el === "C" && mol.atoms[b.a].el === "N")));
    const hasNO2 = mol.atoms.some((a, i) => a.el === "N" &&
      adj[i].filter(e => mol.atoms[e.to].el === "O").length >= 2);
    add(18, "خروجِ آب (M−۱۸)", hasOH);
    add(28, "خروجِ CO (M−۲۸)", hasCO);
    add(27, "خروجِ HCN (M−۲۷)", hasCN);
    add(30, "خروجِ NO (M−۳۰)", hasNO2);
    add(46, "خروجِ NO₂ (M−۴۶)", hasNO2);
    ["Cl", "Br", "I"].forEach(x => add(NOMINAL[x], "خروجِ رادیکالِ " + x + " (M−" + NOMINAL[x] + ")",
      mol.atoms.some(a => a.el === x)));
    return out;
  }

  function predict(mol) {
    if (!mol || !mol.atoms || !mol.atoms.length) return null;
    const adj = adjacency(mol);
    const M = molecularIon(mol);
    if (M == null) return null;
    let list = [].concat(simpleCleavages(mol, adj, M), mclafferty(mol, adj, M), neutralLosses(mol, adj, M));
    // یک m/z، یک ردیف: مسیرِ نام‌دارتر می‌ماند
    const rank = { mclafferty: 4, acylium: 3, benzylic: 3, alpha_hetero: 2, loss: 1 };
    const best = new Map();
    list.forEach(f => {
      const cur = best.get(f.mz);
      if (!cur || (rank[f.type] || 0) > (rank[cur.type] || 0)) best.set(f.mz, f);
    });
    return {
      M,
      fragments: [...best.values()].sort((a, b) => b.mz - a.mz),
      hasGammaH: list.some(f => f.type === "mclafferty")
    };
  }

  root.Fragment = { predict, molecularIon };
  if (typeof module !== "undefined" && module.exports) module.exports = root.Fragment;
})(typeof window !== "undefined" ? window : globalThis);
