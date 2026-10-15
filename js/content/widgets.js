// Interactive pieces inside lessons: money calculator, YouTube Partner Program progress, Top 100 most followed,
// Thai channels, AI-credit reality, best AI videos. Numbers marked "ประมาณการ" come from the research report
// (Oct 2026) and are labelled on the page.
import { h, num, pct, dur, thDay, store, embed, seg, fill } from "../ui.js";
import { hbars } from "../charts.js";
import { tryJSON } from "../data.js";
import { MEDIA_CHANNEL, THEME_BY_ID } from "../shared/themes.js";

const field = (label, input, hint) => h("label", {}, label, input, hint ? h("span", { class: "note" }, hint) : null);
const numberInput = (key, def) => {
  const el = h("input", { type: "number", inputmode: "numeric", min: 0, value: store.get(key, def) });
  el.addEventListener("input", () => store.set(key, Number(el.value) || 0));
  return el;
};
const progress = (label, value, goal, unit) => {
  const p = Math.min(1, goal ? value / goal : 0);
  return h("div", { style: { margin: "6px 0" } },
    h("div", { class: "row", style: { justifyContent: "space-between" } }, h("span", {}, label), h("span", { class: "note" }, `${num(value, { compact: false })} / ${num(goal, { compact: false })} ${unit} (${pct(p)})`)),
    h("div", { class: "bar" }, h("i", { style: { width: `${p * 100}%`, background: p >= 1 ? "var(--s6)" : "var(--s1)" } })));
};

export const WIDGETS = {
  // ---------------- today's numbers inside a lesson (read live, never written into the text) ----------------
  "live-facts"(b) {
    const box = h("div", { class: "tip-box" }, "กำลังอ่านตัวเลขของวันนี้…");
    tryJSON("data/latest.json").then((l) => {
      const c = l?.creator;
      if (!c) return fill(box, "ยังอ่านข้อมูล Mr News ไม่ได้ — เปิดหน้า Mr News ดูตัวเลขล่าสุด");
      const shortShare = c.formats.short.v / (c.formats.short.v + c.formats.long.v || 1);
      const rank = b.theme ? c.themes.findIndex((t) => t.id === b.theme) : -1;
      const th = b.theme && THEME_BY_ID[b.theme];
      fill(box, ...[h("b", {}, `Mr News วันที่ ${thDay(l.day)}: `),
        `ในคลิปครีเอเตอร์ต้นฉบับที่ระบบเจอ Shorts ได้วิว ${pct(shortShare)} และคลิปที่ติด Top 50 ยาวกลางๆ ${dur(c.formats.medianTop50)} นาที`,
        th ? (rank >= 0 ? ` · หมวด ${th.icon} ${th.name} อยู่อันดับ ${rank + 1} (${pct(c.themes[rank].share)} ของวิว)` : ` · วันนี้หมวด ${th.name} ไม่ติดอันดับ`) : null,
        h("div", { class: "note" }, "ตัวเลขเปลี่ยนทุกวัน และมาจากคลิปที่ระบบค้นเจอ ไม่ใช่ทั้งประเทศ — ใช้ดูทิศทาง ไม่ใช่กฎตายตัว")].filter(Boolean));
    });
    return box;
  },

  // ---------------- YouTube Partner Program: how far is my channel ----------------
  ypp() {
    const subs = numberInput("mn_ypp_subs", 0), hours = numberInput("mn_ypp_hours", 0), shorts = numberInput("mn_ypp_shorts", 0), uploads = numberInput("mn_ypp_up", 0);
    const out = h("div");
    const calc = () => {
      const s = +subs.value || 0, hr = +hours.value || 0, sv = +shorts.value || 0, up = +uploads.value || 0;
      const after2027 = Date.now() >= Date.parse("2027-02-01");
      fill(out,
        h("h4", { style: { margin: "10px 0 2px" } }, "ระดับต้น (Super Thanks, สมาชิกช่อง — ยังไม่มีค่าโฆษณา)"),
        progress("ผู้ติดตาม", s, 500, "คน"), progress("คลิปสาธารณะใน 90 วัน", up, 3, "คลิป"),
        h("div", { class: "note" }, "และอย่างใดอย่างหนึ่ง:"), progress("ชั่วโมงดูคลิปยาว (12 เดือน)", hr, 3000, "ชม."), progress("วิว Shorts (90 วัน)", sv, 3e6, "วิว"),
        h("h4", { style: { margin: "14px 0 2px" } }, "ระดับเต็ม (ได้ส่วนแบ่งค่าโฆษณา)"),
        progress("ผู้ติดตาม", s, 1000, "คน"),
        h("div", { class: "note" }, after2027 ? "เกณฑ์ใหม่ (ตั้งแต่ 1 ก.พ. 2027) อย่างใดอย่างหนึ่ง:" : "วันนี้ อย่างใดอย่างหนึ่ง (ผู้สมัครใหม่ตั้งแต่ 1 ก.พ. 2027 ต้องเป็น 2 เท่า):"),
        progress("ชั่วโมงดูคลิปยาว (12 เดือน)", hr, after2027 ? 8000 : 4000, "ชม."), progress("วิว Shorts (90 วัน)", sv, after2027 ? 20e6 : 10e6, "วิว"),
        !after2027 ? h("div", { class: "warn", style: { marginTop: "8px" } }, "⚠️ ช่องที่เริ่ม ต.ค. 2026 แทบไม่มีทางถึงเกณฑ์เดิมก่อน 1 ก.พ. 2027 — วางแผนตามเกณฑ์ใหม่: 8,000 ชั่วโมง หรือ 20 ล้านวิว Shorts") : null);
    };
    for (const el of [subs, hours, shorts, uploads]) el.addEventListener("input", calc);
    calc();
    return h("div", { class: "card", style: { marginTop: "10px" } }, h("h3", {}, "🎯 ช่องของ Win ห่างจากเกณฑ์อีกเท่าไร"),
      h("p", { class: "note" }, "ใส่ตัวเลขจาก YouTube Studio → Earn (หาเงิน) ระบบจำไว้ในเครื่องนี้"),
      h("div", { class: "form" }, field("ผู้ติดตาม", subs), field("คลิปสาธารณะใน 90 วัน", uploads), field("ชั่วโมงดู 12 เดือน (คลิปยาว)", hours, "ชั่วโมงดูของ Shorts ไม่นับ"), field("วิว Shorts 90 วัน", shorts)), out);
  },

  // ---------------- money calculator ----------------
  money() {
    const views = numberInput("mn_money_views", 1000000);
    const fx = numberInput("mn_money_fx", 33);
    let kind = store.get("mn_money_kind", "long");
    const out = h("div");
    // [ประมาณการ] USD per 1,000 views for the creator. Long videos: 0.37 = Thai audience average (Dynamoi);
    // low / high = half and double of it, only to show a range. Shorts: 1-16 cents = Shopify's range (all countries);
    // middle 0.04 is our assumption. Shown on the page in the formula line.
    const RATE = { long: [0.185, 0.37, 0.74], short: [0.01, 0.04, 0.16] };
    const NOTE = {
      long: "กลาง 0.37 ดอลลาร์ = ค่าเฉลี่ยคนดูไทย (Dynamoi) · ต่ำ/สูง = ครึ่งเท่า/สองเท่า เพื่อดูช่วงเท่านั้น",
      short: "ต่ำ 0.01 / สูง 0.16 ดอลลาร์ = ช่วงของ Shorts ทั่วโลก (Shopify) · กลาง 0.04 = ค่าสมมติ",
    };
    const calc = () => {
      const v = +views.value || 0, f = +fx.value || 33;
      const [lo, mid, hi] = RATE[kind];
      const baht = (r) => (v / 1000) * r * f;
      fill(out,
        h("div", { class: "grid g3", style: { marginTop: "10px" } },
          h("div", { class: "tile" }, h("div", { class: "label" }, "ต่ำ"), h("div", { class: "value" }, num(baht(lo)) + " ฿")),
          h("div", { class: "tile", style: { borderColor: "var(--brand)" } }, h("div", { class: "label" }, "กลาง"), h("div", { class: "value" }, num(baht(mid)) + " ฿")),
          h("div", { class: "tile" }, h("div", { class: "label" }, "สูง"), h("div", { class: "value" }, num(baht(hi)) + " ฿"))),
        h("p", { class: "note", style: { marginTop: "8px" } }, `สูตร: วิว ÷ 1,000 × รายได้ต่อ 1,000 วิว (RPM) × ${f} บาท/ดอลลาร์ — ${NOTE[kind]}`));
    };
    const kindSeg = seg([["long", "คลิปยาว"], ["short", "Shorts"]], kind, (k) => { kind = k; store.set("mn_money_kind", k); calc(); }, "ชนิดคลิป");
    views.addEventListener("input", calc);
    fx.addEventListener("input", calc);
    calc();
    return h("div", { class: "card", style: { marginTop: "10px" } }, h("h3", {}, "🧮 เครื่องคิดเงินจากยอดวิว (YouTube)"),
      h("div", { class: "row", style: { marginBottom: "8px" } }, kindSeg),
      h("div", { class: "form" }, field("ยอดวิว (ที่หาเงินได้)", views), field("บาทต่อ 1 ดอลลาร์", fx)), out,
      h("div", { class: "warn", style: { marginTop: "8px" } }, "[ประมาณการ] RPM ของคนดูไทยราว 0.37 ดอลลาร์ต่อ 1,000 วิว (คลิปยาว) และ Shorts ได้แค่ราว 1-16 เซ็นต์ต่อ 1,000 วิว — เงินจริงขึ้นกับหมวด ช่วงเวลา และคนดูแต่ละช่อง"));
  },

  // ---------------- where Thai creators' money comes from (iCreator 2025) ----------------
  income() {
    return h("div", { class: "card", style: { marginTop: "10px" } }, h("h3", {}, "ครีเอเตอร์ไทยได้เงินจากไหน"), h("p", { class: "sub" }, "% ของครีเอเตอร์ที่ตอบว่ามีรายได้ทางนี้ (ตอบได้หลายข้อ) — iCreator Report 2025"),
      hbars([
        { label: "จากแพลตฟอร์ม (ค่าโฆษณา โบนัส)", value: 46.6, display: "46.6%" },
        { label: "สปอนเซอร์ / รีวิว", value: 37.8, display: "37.8%" },
        { label: "ตะกร้าสินค้า / ลิงก์ขาย", value: 25.6, display: "25.6%" },
      ], { head: ["ทางหาเงิน", "% ครีเอเตอร์"], max: 100, color: "var(--s3)" }),
      h("div", { class: "src" }, "ที่มา: ", h("a", { href: "https://www.brandbuffet.in.th/2025/11/icreator-reports-social-media-users-in-thailand-2025/", target: "_blank", rel: "noopener" }, "Brand Buffet: iCreator Report 2025")));
  },

  // ---------------- Top 100 most followed in the world ----------------
  famous() {
    const box = h("div", { class: "loading" }, "กำลังโหลด…");
    tryJSON("data/famous.json").then((f) => {
      if (!f) return box.replaceWith(h("div", { class: "empty" }, "ยังไม่มีข้อมูล"));
      let which = "youtube";
      const body = h("div");
      const draw = () => {
        const list = f[which] || [];
        const unit = which === "youtube" ? "ผู้ติดตาม (ล้าน)" : "ผู้ติดตาม (ล้าน)";
        fill(body,
          hbars(list.slice(0, 20).map((x, i) => ({ label: `${i + 1}. ${x.name}`, value: x.m, display: num(x.m * 1e6), tip: `${x.name}\n${num(x.m * 1e6)} ผู้ติดตาม${x.country ? "\n" + x.country : ""}${x.cat ? "\n" + x.cat : ""}${x.joined ? "\nเริ่มเมื่อ " + x.joined : ""}` })), { head: ["อันดับ", unit], color: which === "youtube" ? "var(--s8)" : which === "tiktok" ? "var(--s5)" : "var(--s1)" }),
          h("details", { class: "more" }, h("summary", {}, `ดูครบ ${list.length} อันดับ`), h("div", { class: "table-wrap" }, h("table", { class: "data" },
            h("thead", {}, h("tr", {}, h("th", {}, "#"), h("th", {}, "ชื่อ"), h("th", { class: "num" }, "ผู้ติดตาม"), h("th", {}, "ประเทศ"), h("th", {}, which === "youtube" ? "เริ่มเมื่อ" : "เกี่ยวกับ"))),
            h("tbody", {}, list.map((x, i) => h("tr", {}, h("td", {}, i + 1), h("td", {}, x.name), h("td", { class: "num" }, num(x.m * 1e6)), h("td", {}, x.country || ""), h("td", {}, which === "youtube" ? x.joined || "" : x.cat || ""))))))),
          which === "youtube" ? motivation(list) : null);
      };
      box.replaceWith(h("div", {},
        h("div", { class: "row", style: { marginBottom: "8px" } }, seg([["youtube", "YouTube 100"], ["tiktok", "TikTok 50"], ["facebook", "Facebook 50"]], which, (w) => { which = w; draw(); }, "แพลตฟอร์ม")),
        body,
        h("div", { class: "src" }, `ที่มา: Wikipedia (CC BY-SA) อ่านเมื่อ ${f.retrieved?.slice(0, 10)} · `, Object.entries(f.pages || {}).map(([k, u], i) => [i ? " · " : "", h("a", { href: u, target: "_blank", rel: "noopener" }, k)]))));
      draw();
    });
    return h("div", { class: "card", style: { marginTop: "10px" } }, h("h3", {}, "🌍 คนที่มีผู้ติดตามมากที่สุดในโลก"), box);
  },

  // ---------------- Thai channels the robot found ----------------
  "thai-top"() {
    const box = h("div", { class: "loading" }, "กำลังโหลด…");
    tryJSON("data/latest.json").then((l) => {
      const list = (l?.channels?.bySubs || []).filter((c) => !MEDIA_CHANNEL.test(c.t)).slice(0, 20);
      if (!list.length) return box.replaceWith(h("div", { class: "empty" }, "ยังไม่มีข้อมูล"));
      box.replaceWith(h("div", {}, hbars(list.map((c, i) => ({ label: `${i + 1}. ${c.t}`, value: c.subs, tip: `${c.t}\n${num(c.subs)} ผู้ติดตาม\n${num(c.vids, { compact: false })} คลิป` })), { head: ["ช่อง", "ผู้ติดตาม"], color: "var(--s2)" }),
        h("p", { class: "note" }, "ช่องครีเอเตอร์ไทย (ตัดช่องทีวี ข่าว ค่ายเพลงออก) จากช่องที่ Mr News เจอ — ยิ่งเก็บนานยิ่งครบ ดูทั้งหมดในหน้า Mr News")));
    });
    return h("div", { class: "card", style: { marginTop: "10px" } }, h("h3", {}, "🇹🇭 ครีเอเตอร์ไทยที่ใหญ่ที่สุด (ที่ระบบเจอ)"), box);
  },

  // ---------------- what an AI plan really buys ----------------
  credits() {
    return h("div", { class: "card", style: { marginTop: "10px" } }, h("h3", {}, "💳 เงินหลักร้อยซื้อวิดีโอ AI ได้กี่วินาทีต่อเดือน"), h("p", { class: "sub" }, "[ประมาณการ] วินาทีของวิดีโอที่สร้างเสร็จ ก่อนหักรอบที่ต้องสร้างใหม่"),
      hbars([
        { label: "Google AI Plus · Veo แบบเร็ว", value: 80, display: "~80 วิ", tip: "200 เครดิต ≈ วิดีโอแบบเร็ว ~10 คลิป × 8 วิ (reelticker)" },
        { label: "Google AI Plus · Veo คุณภาพสูง", value: 16, display: "~16 วิ", tip: "200 เครดิต ≈ คุณภาพสูง ~2 คลิป × 8 วิ (reelticker)" },
        { label: "Kling Standard ~290-330 ฿", value: 95, display: "80-110 วิ", tip: "660 เครดิต ÷ 6-8 เครดิต/วินาที (Kling)" },
        { label: "Runway Standard ~500 ฿", value: 52, display: "~52 วิ", tip: "625 เครดิต ≈ 52 วินาที (Creatify)" },
      ], { head: ["แผน", "วินาที/เดือน"], color: "var(--ai)" }),
      h("div", { class: "tip-box ai" }, "สรุป: งบหลักร้อยได้วิดีโอ AI จริงแค่ราว 1-2 นาทีต่อเดือน → ใช้ \"ภาพนิ่ง AI\" เป็นหลัก แล้วให้ขยับด้วยการตัดต่อ (ซูม เลื่อน) และใช้วิดีโอ AI จริงแค่ 1-2 ช็อตสำคัญต่อตอน"));
  },

  // ---------------- best AI videos (robot, weekly) ----------------
  "best-ai"() {
    const box = h("div", { class: "loading" }, "กำลังโหลด…");
    tryJSON("data/learn.json").then((l) => {
      const vids = l?.best_ai || [];
      box.replaceWith(vids.length ? h("div", {}, h("div", { class: "embeds" }, vids.slice(0, 4).map(embed)),
        vids.length > 4 ? h("details", { class: "more" }, h("summary", {}, `ดูอีก ${vids.length - 4} คลิป`), h("div", { class: "embeds" }, vids.slice(4).map(embed))) : null)
        : h("div", { class: "empty" }, "ระบบจะคัดให้ในรอบอัปเดตถัดไป"));
    });
    return h("div", { style: { marginTop: "10px" } }, box);
  },
};

function motivation(list) {
  const now = new Date().getFullYear();
  const years = list.map((x) => { const y = /(\d{4})/.exec(x.joined || ""); return y ? now - Number(y[1]) : null; }).filter((x) => x != null);
  if (!years.length) return null;
  const sorted = [...years].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  const top = list[0];
  const topYear = /(\d{4})/.exec(top.joined || "")?.[1];
  return h("div", { class: "hero", style: { marginTop: "12px" } },
    h("div", { class: "note" }, "💪 กำลังใจจากตัวเลขจริง"),
    h("div", { class: "big", style: { fontSize: "1.15rem" } }, `ช่องใน Top 100 ของโลก เปิดมาแล้วกลางๆ ${median} ปี`),
    h("p", { style: { margin: 0 } }, `${top.name} อันดับ 1 วันนี้ (${num(top.m * 1e6)} ผู้ติดตาม) เริ่มเปิดช่องเมื่อปี ${topYear || "-"} — ทุกช่องในรายการนี้เริ่มจาก 0 ผู้ติดตามเหมือนกัน ความต่างคือ "ทำต่อเนื่องเป็นปี" ไม่ใช่โชคในคลิปเดียว`));
}
