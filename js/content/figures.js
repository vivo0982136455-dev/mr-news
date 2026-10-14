// Teaching pictures (inline SVG, 360 px wide so text stays readable on a phone). Colours are CSS tokens,
// so every picture follows light / dark mode. Text is ink; colour only marks areas.
const T = (x, y, s, opts = "") => `<text x="${x}" y="${y}" fill="var(--ink)" font-size="14.5" ${opts}>${s}</text>`;
const M = (x, y, s, opts = "") => `<text x="${x}" y="${y}" fill="var(--ink-2)" font-size="12.5" ${opts}>${s}</text>`;
const box = (x, y, w, hh, fill, r = 10) => `<rect x="${x}" y="${y}" width="${w}" height="${hh}" rx="${r}" fill="${fill}"/>`;
const svg = (h, body, label) => `<svg viewBox="0 0 360 ${h}" role="img" aria-label="${label}" style="max-width:560px;margin:0 auto">${body}</svg>`;

// a vertical flow of steps with arrows
function flow(steps, label, color = "var(--brand)") {
  const rowH = 52;
  let b = "";
  steps.forEach(([title, sub], i) => {
    const y = 6 + i * rowH;
    b += box(20, y, 320, 40, "var(--surface)") + `<rect x="20" y="${y}" width="320" height="40" rx="10" fill="none" stroke="var(--line-2)"/>`;
    b += `<circle cx="42" cy="${y + 20}" r="13" fill="${color}"/>` + `<text x="42" y="${y + 24.5}" text-anchor="middle" font-size="12.5" font-weight="700" fill="var(--surface)">${i + 1}</text>`;
    b += T(64, y + 17, title, 'font-weight="600"') + M(64, y + 33, sub);
    if (i < steps.length - 1) b += `<path d="M42 ${y + 41} v9" stroke="var(--line-2)" stroke-width="2"/><path d="M38 ${y + 46} l4 5 l4 -5" fill="none" stroke="var(--line-2)" stroke-width="2"/>`;
  });
  return svg(steps.length * rowH + 6, b, label);
}

export const FIGURES = {
  // ---------------- human video ----------------
  "hu-map": flow([
    ["ไอเดีย", "Mr News + Mr Idea + สมุดโน้ต"],
    ["วางแผน", "ฮุก 2 วิ → เรื่อง → หักมุม → มุกปิด"],
    ["ถ่าย", "แนวตั้ง 9:16 · แสงหน้าต่าง · ไมค์หนีบ"],
    ["ตัดต่อ", "CapCut: ตัดช่วงเงียบ ใส่ซับ ใส่เสียง"],
    ["ให้ AI ตรวจ", "อัปคลิปให้ Gemini วิจารณ์ (ฟรี ≤ 5 นาที)"],
    ["อัปโหลด", "YouTube Shorts + Facebook Reels"],
    ["วัดผล", "ดูต่อ vs ปัดทิ้ง · แชร์ · ผู้ติดตามใหม่"],
  ], "7 ขั้นของคลิปคนจริง"),

  "hu-plan": svg(150, `
    ${T(10, 20, "คลิป 30 วินาที แบ่งยังไง", 'font-weight="600"')}
    ${box(10, 32, 40, 40, "var(--s2)", 6)}${box(52, 32, 150, 40, "var(--s1)", 6)}${box(204, 32, 76, 40, "var(--s7)", 6)}${box(282, 32, 68, 40, "var(--s3)", 6)}
    <text x="30" y="57" text-anchor="middle" font-size="12" font-weight="700" fill="#fff">ฮุก</text>
    <text x="127" y="57" text-anchor="middle" font-size="12" font-weight="700" fill="#fff">ปูเรื่อง</text>
    <text x="242" y="57" text-anchor="middle" font-size="12" font-weight="700" fill="#fff">หักมุม</text>
    <text x="316" y="57" text-anchor="middle" font-size="12" font-weight="700" fill="#fff">มุกปิด</text>
    ${M(10, 90, "0-2 วิ")}${M(52, 90, "2-20 วิ")}${M(204, 90, "20-26 วิ")}${M(282, 90, "26-30 วิ")}
    ${M(10, 112, "ฮุก = ประโยคหรือภาพที่ทำให้นิ้วหยุดปัด")}
    ${M(10, 130, "มุกปิด = เหตุผลที่คนแชร์ + ชวนดูตอนต่อไป")}
  `, "โครงคลิป 30 วินาที"),

  "hu-frame": svg(344, `
    <rect x="110" y="8" width="150" height="302" rx="18" fill="var(--surface)" stroke="var(--line-2)" stroke-width="2"/>
    <rect x="110" y="8" width="150" height="40" rx="18" fill="var(--s8)" opacity="0.18"/>
    <rect x="228" y="120" width="32" height="150" fill="var(--s8)" opacity="0.18"/>
    <rect x="110" y="250" width="150" height="60" rx="18" fill="var(--s8)" opacity="0.18"/>
    <line x1="160" y1="48" x2="160" y2="250" stroke="var(--line-2)"/>
    <line x1="210" y1="48" x2="210" y2="250" stroke="var(--line-2)"/>
    <line x1="110" y1="115" x2="260" y2="115" stroke="var(--line-2)"/>
    <line x1="110" y1="182" x2="260" y2="182" stroke="var(--line-2)"/>
    <circle cx="163" cy="100" r="18" fill="var(--s1)"/><rect x="141" y="122" width="44" height="60" rx="14" fill="var(--s1)"/>
    <circle cx="205" cy="104" r="15" fill="var(--s2)"/><rect x="188" y="124" width="35" height="56" rx="13" fill="var(--s2)"/>
    <rect x="122" y="196" width="104" height="24" rx="6" fill="var(--ink)" opacity="0.85"/><text x="174" y="212" text-anchor="middle" font-size="11.5" fill="var(--surface)">ตัวหนังสือตรงนี้</text>
    ${M(266, 32, "ชื่อแอป/เวลา")}${M(266, 196, "ปุ่มไลก์/แชร์")}${M(266, 284, "แคปชัน/ชื่อเพจ")}
    ${M(4, 108, "เส้นแบ่ง 3 ส่วน")}${M(4, 126, "วางหน้าไว้")}${M(4, 144, "ที่จุดตัด")}
    ${T(4, 330, "สีแดง = โซนที่ปุ่มแอปบัง ห้ามวางของสำคัญ", 'font-size="13"')}
  `, "กรอบภาพแนวตั้งและโซนที่ปุ่มแอปบัง"),

  "hu-shots": svg(190, `
    ${[["ภาพไกล", "บอกว่าอยู่ที่ไหน", 0.45], ["ภาพกลาง", "เห็นท่าทางสองคน", 0.75], ["ภาพใกล้", "เห็นสีหน้า = มุก", 1.25]].map(([t, s, k], i) => {
      const x = 8 + i * 118;
      const cx = x + 51, r = 11 * k;
      return `<rect x="${x}" y="8" width="102" height="130" rx="10" fill="var(--surface)" stroke="var(--line-2)"/>
      <clipPath id="c${i}"><rect x="${x}" y="8" width="102" height="130" rx="10"/></clipPath>
      <g clip-path="url(#c${i})"><circle cx="${cx}" cy="${70 - 4 * k}" r="${r}" fill="var(--s1)"/><rect x="${cx - 16 * k}" y="${70 - 4 * k + r + 2}" width="${32 * k}" height="${60 * k}" rx="${8 * k}" fill="var(--s1)"/>
      ${i === 0 ? `<rect x="${x}" y="118" width="102" height="20" fill="var(--s3)" opacity="0.35"/>` : ""}</g>
      ${T(x + 51, 158, t, 'text-anchor="middle" font-weight="600"')}${M(x + 51, 176, s, 'text-anchor="middle"')}`;
    }).join("")}
  `, "ภาพไกล ภาพกลาง ภาพใกล้"),

  "hu-light": svg(220, `
    <rect x="20" y="20" width="320" height="180" rx="12" fill="var(--surface)" stroke="var(--line-2)"/>
    <rect x="20" y="70" width="10" height="80" fill="var(--s4)"/>${T(36, 62, "หน้าต่าง ☀️")}
    <path d="M32 80 L150 100 M32 140 L150 120" stroke="var(--s4)" stroke-width="2" stroke-dasharray="5 5"/>
    <circle cx="170" cy="110" r="20" fill="var(--s1)"/>${T(150, 150, "คนพูด")}${M(140, 166, "หันหน้าเข้าหาแสง")}
    <rect x="252" y="96" width="16" height="28" rx="4" fill="var(--ink)"/>${T(240, 150, "มือถือ")}${M(234, 166, "อยู่ฝั่งห้อง")}
    ${M(30, 190, "❌ หน้าต่างอยู่หลังคน = หน้ามืด")}
  `, "จัดแสงจากหน้าต่าง มุมมองจากด้านบน"),

  "hu-sound": svg(170, `
    <circle cx="55" cy="50" r="30" fill="var(--s1)"/><rect x="25" y="84" width="60" height="80" rx="18" fill="var(--s1)"/>
    <rect x="51" y="96" width="9" height="16" rx="3" fill="var(--ink)"/>
    <path d="M65 104 C 95 100, 115 70, 140 64" stroke="var(--line-2)" stroke-width="2" fill="none" stroke-dasharray="4 4"/>
    ${T(146, 60, "ไมค์หนีบปกเสื้อ")}${M(146, 80, "ห่างปาก ~1 คืบ (15-20 ซม.)")}
    ${M(146, 102, "สองคนคุยกัน ใส่คนละตัว")}
    ${M(146, 124, "ปิดพัดลม/แอร์ตอนอัด")}
    ${M(146, 146, "อัดทดสอบ 5 วิ ฟังก่อน")}
  `, "ตำแหน่งไมค์หนีบ"),

  "hu-edit": svg(210, `
    ${T(8, 20, "หน้าตาไทม์ไลน์ CapCut (ล่างจอ)", 'font-weight="600"')}
    ${M(8, 44, "วิดีโอ")}${box(60, 30, 70, 22, "var(--s1)", 4)}${box(132, 30, 48, 22, "var(--s1)", 4)}${box(182, 30, 90, 22, "var(--s1)", 4)}${box(274, 30, 76, 22, "var(--s1)", 4)}
    ${M(8, 78, "ตัวหนังสือ")}${box(60, 64, 60, 22, "var(--s4)", 4)}${box(190, 64, 70, 22, "var(--s4)", 4)}
    ${M(8, 112, "เพลง")}${box(60, 98, 290, 22, "var(--s3)", 4)}
    ${M(8, 146, "เสียงเอฟเฟกต์")}${box(126, 132, 18, 22, "var(--s5)", 4)}${box(270, 132, 18, 22, "var(--s5)", 4)}
    <line x1="160" y1="24" x2="160" y2="160" stroke="var(--s8)" stroke-width="2"/><path d="M154 22 h12 l-6 8z" fill="var(--s8)"/>
    ${M(8, 178, "เส้นแดง = ตำแหน่งที่จะตัด (แยก)")}
    ${M(8, 198, "ช่องว่าง = ช่วงเงียบที่ตัดทิ้ง → คลิปกระชับ")}
  `, "ไทม์ไลน์ตัดต่อ"),

  // ---------------- AI video ----------------
  "ai-map": flow([
    ["ไอเดีย + บท", "Gemini / Steep · Win เลือกมุกเอง"],
    ["คัมภีร์ตัวละคร (ครั้งเดียว)", "ชื่อ หน้าตา นิสัย คำติดปาก"],
    ["ภาพตัวละคร", "Nano Banana ใน Gemini / Flow"],
    ["ภาพเริ่มของแต่ละช็อต", "อ้างภาพตัวละคร → หน้าไม่เปลี่ยน"],
    ["วิดีโอเฉพาะช็อตสำคัญ", "Veo / Omni ใน Flow · Kling"],
    ["เสียง", "เสียง Win เอง หรือ Azure ไทย/ลาว"],
    ["ตัดต่อ + ซับ", "CapCut หรือ Steep (Remotion)"],
    ["โพสต์ + ติดป้าย AI", "YouTube / Facebook / TikTok"],
  ], "8 ขั้นของคลิป AI", "var(--ai)"),

  "ai-prompt": svg(300, `
    ${T(8, 20, "prompt ที่ดี = 7 ชิ้นต่อกัน (เขียนภาษาอังกฤษ)", 'font-weight="600"')}
    ${[["1 ใคร", "an orange cat in a red apron", "var(--s2)"], ["2 ทำอะไร", "pounding papaya salad, surprised", "var(--s1)"], ["3 ที่ไหน", "small village food stall, morning", "var(--s3)"],
      ["4 กล้อง", "vertical 9:16, medium shot, slow push-in", "var(--s7)"], ["5 แสง", "soft warm sunlight", "var(--s4)"], ["6 สไตล์", "3D cartoon, Pixar-like, bright colors", "var(--s5)"],
      ["7 เสียง", "sound of a wooden mortar, birds", "var(--s6)"]].map(([a, b, c], i) => {
      const y = 30 + i * 38;
      return `<rect x="8" y="${y}" width="6" height="30" rx="3" fill="${c}"/>${T(22, y + 13, a, 'font-weight="600"')}${M(22, y + 28, b)}`;
    }).join("")}
  `, "7 ส่วนของ prompt วิดีโอ"),

  "ai-sheet": svg(210, `
    ${T(8, 20, "ชุดภาพอ้างอิงตัวละคร (ทำครั้งเดียว ใช้ทุกตอน)", 'font-weight="600"')}
    ${[["หน้าตรง", 0], ["ด้านข้าง", 1], ["เต็มตัว", 2]].map(([t, i]) => {
      const x = 8 + i * 118;
      return `<rect x="${x}" y="28" width="104" height="110" rx="10" fill="var(--surface)" stroke="var(--line-2)"/>
      ${i === 2 ? `<circle cx="${x + 52}" cy="52" r="12" fill="var(--s2)"/><rect x="${x + 38}" y="66" width="28" height="56" rx="10" fill="var(--s2)"/>`
        : `<circle cx="${x + 52}" cy="80" r="${i ? 26 : 30}" fill="var(--s2)"/>${i ? `<circle cx="${x + 68}" cy="76" r="4" fill="var(--ink)"/>` : `<circle cx="${x + 42}" cy="76" r="4" fill="var(--ink)"/><circle cx="${x + 62}" cy="76" r="4" fill="var(--ink)"/>`}`}
      ${M(x + 52, 154, t, 'text-anchor="middle"')}`;
    }).join("")}
    ${M(8, 178, "+ สีหน้า 2-3 แบบ (ดีใจ ตกใจ งอน)")}
    ${M(8, 198, "เก็บไว้ในโฟลเดอร์เดียว แนบทุกครั้งที่สร้างภาพใหม่")}
  `, "ชุดภาพอ้างอิงตัวละคร"),
};
