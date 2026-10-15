// The spine of the book: 5 steps from zero to professional (research report, Oct 2026, section 3 - a [ข้อเสนอ]
// built from YouTube's own thresholds and studies of millions of channels). Progress is counted in FINISHED CLIPS,
// not lessons read: small channels gain subscribers very slowly (median ~0.5 a month under 100), so counting
// subscribers early makes people quit before clip 30.

export const STAGES = [
  { n: 0, name: "เตรียมตัว", when: "สัปดาห์ 1-2", from: 0, to: 3,
    skills: ["ตกลงเรื่องความยินยอมกับแฟน", "เปิดเพจ/ช่อง + ยืนยันตัวตน 2 ขั้นตอน", "ไมค์หนีบ + ขาตั้ง", "ถ่ายแนวตั้ง ตัดใน CapCut"],
    milestone: "โพสต์ 3 คลิปแรก", metric: "ยังไม่ต้องดูตัวเลข — แค่ทำให้เสร็จ",
    lessons: ["hb-start", "hb-rules", "hu-map", "hu-gear", "hu-plan", "hu-shoot", "hu-sound", "hu-edit", "hu-youtube", "hu-facebook", "hu-project"],
    now: "ส่งข้อความยินยอมให้แฟน แล้วถ่ายคลิปแรกตามบท \"โปรเจกต์ตัวอย่าง\"" },
  { n: 1, name: "ฝึกมือ", when: "เดือน 1-3", from: 3, to: 30,
    skills: ["ประโยคเปิดที่หยุดนิ้วใน 1-2 วินาที", "เรื่องเดียวที่มีตอนจบ", "ซับไทย + ตัวหนังสือลาว", "ทำเสร็จทุกสัปดาห์"],
    milestone: "โพสต์ตามแผนครบ 8 สัปดาห์", metric: "% ดูต่อ / ไม่ปัดทิ้ง เทียบกับค่ากลางของตัวเอง",
    lessons: ["hb-90", "hu-light", "hu-text", "hu-music", "hu-check", "hu-cover", "hu-measure", "hb-truth"],
    now: "ใส่ 3 ไอเดียในแผนสัปดาห์นี้ แล้วติ๊กทีละขั้นจนโพสต์" },
  { n: 2, name: "หาสูตร", when: "เดือน 3-9", from: 30, to: 100,
    skills: ["เลือกไอเดียจากคลิปที่ได้ ×N สูงใน Mr News", "สูตร \"คุ้นเคยแต่คาดไม่ถึง\"", "ภาพแรก + ตัวหนังสือบนจอ", "ซีรีส์ประจำ 3-4 ซีรีส์", "เริ่มเพจ AI ด้วยตัวละครประจำ"],
    milestone: "100 → 1,000 ผู้ติดตาม และมีซีรีส์ที่คนรอ", metric: "% ดูต่อ · % ที่ดูเฉลี่ย · ผู้ติดตามต่อคลิป",
    lessons: ["hb-facebook", "hb-other", "ai-map", "ai-tools", "ai-bible", "ai-script", "ai-prompt", "ai-image", "ai-video", "ai-voice", "ai-edit", "ai-label", "ai-project", "ai-best"],
    now: "เปิด Mr News เรียงตาม ×N เลือก 1 คลิปในหมวดของเรา จดว่าทำไมมันเกินปกติของช่อง" },
  { n: 3, name: "ตั้งระบบ", when: "เดือน 9-24", from: 100, to: 200,
    skills: ["คลิปยาว 3-8 นาที (รวมคลิปสัปดาห์แล้วเล่าเชื่อม)", "ให้คนดูต่อถึงนาทีที่ 3", "ทดสอบภาพปก (Test & Compare)", "ตอบคอมเมนต์", "ทำงานร่วมกับเพจคู่รักอื่น"],
    milestone: "1,000 → 10,000 ผู้ติดตาม · YouTube ระดับต้น (500) · TikTok Shop (1,000)", metric: "CTR · การดูต่อที่ 30 วินาที · คนดูประจำ",
    lessons: ["hb-youtube", "hb-calc", "hb-money"],
    now: "รวมคลิปสั้นทั้งสัปดาห์เป็นคลิปยาว 3-8 นาที 1 คลิป" },
  { n: 4, name: "มืออาชีพ", when: "ปีที่ 2 ขึ้นไป", from: 200, to: Infinity,
    skills: ["media kit 1 หน้า", "งานกับแบรนด์ + ป้ายโฆษณา", "affiliate / ตะกร้า", "ภาษีและบัญชี", "คนช่วยงาน"],
    milestone: "YPP ตามเกณฑ์ 2027 · สปอนเซอร์รายแรก", metric: "รายได้ต่อเดือน · ชั่วโมงดู",
    lessons: ["hb-money", "hb-rules", "hb-top"],
    now: "ทำ media kit 1 หน้า: ตัวเลขช่อง คนดูเป็นใคร ตัวอย่างงาน 3 คลิป" },
];
export const stageOf = (clips) => [...STAGES].reverse().find((s) => clips >= s.from) || STAGES[0];

// every step, every week: the habits that keep a part-time creator going
export const EVERY_STEP = [
  "ทบทวนวันอาทิตย์ 30 นาที: คลิปดีสุด/แย่สุด → สมมติฐาน 1 ข้อ → เปลี่ยนแค่ 1 อย่าง",
  "ถ่ายคลิปสำรอง 2-4 คลิปเก็บไว้ กันสัปดาห์ที่กะงานเปลี่ยน",
  "ดูตัวเลขเฉพาะวันทบทวน ไม่เปิดดูทุกชั่วโมง",
  "เพจ AI: ทุกตอนต้องมีบท เสียง และตัวละครที่ Win สร้างเอง",
];

// the evidence behind the ladder, shown once on the ladder page
export const EVIDENCE = [
  "**[ยืนยันแล้ว]** vidIQ ตามดูช่องเล็ก 32.9 ล้านช่อง 360 วัน: ช่องที่ลง 52 คลิปขึ้นไปในหนึ่งปี ถึง 1,000 ผู้ติดตาม **30.77%** ช่องที่ลง 1-11 คลิป ถึงแค่ **1.86%** (เกิดคู่กัน ไม่ได้พิสูจน์ว่าเป็นสาเหตุ)",
  "**[ยืนยันแล้ว]** ช่องที่มีไม่ถึง 100 ผู้ติดตามโตเฉลี่ย (ค่ากลาง) **ราว 0.5 คนต่อเดือน** — ขั้นแรกๆ จึงนับคลิปที่ทำเสร็จ ไม่ใช่ผู้ติดตาม",
  "**[ยืนยันแล้ว]** เกณฑ์ YouTube ใหม่ตั้งแต่ 1 ก.พ. 2027: 1,000 ผู้ติดตาม + 8,000 ชั่วโมง หรือ 20 ล้านวิว Shorts — ชั่วโมงของ Shorts ไม่นับ จึงต้องมีคลิปยาวในขั้น 3",
];
export const EVIDENCE_SRC = [["vidIQ Research: uploads vs 1,000 subs", "https://vidiq.com/research/youtube-uploads-1000-subscribers/"], ["vidIQ: subscriber growth", "https://vidiq.com/blog/post/youtube-subscriber-growth-statistics/"], ["YouTube Help: YPP 2027", "https://support.google.com/youtube/answer/12843009?hl=en"]];

// badges for milestones (like Meta's creator milestones) - earned from what Win DID, kept on this device
export const BADGES = [
  { id: "clip1", icon: "🎬", name: "คลิปแรก", how: "โพสต์คลิปแรก", test: (s) => s.clips >= 1 },
  { id: "clip3", icon: "🥉", name: "จบขั้นเตรียมตัว", how: "โพสต์ครบ 3 คลิป", test: (s) => s.clips >= 3 },
  { id: "week1", icon: "🗓️", name: "สัปดาห์แรกครบแผน", how: "โพสต์ครบทุกไอเดียในแผน 1 สัปดาห์", test: (s) => s.weeksDone >= 1 },
  { id: "review1", icon: "🧭", name: "ทบทวนครั้งแรก", how: "ทบทวนวันอาทิตย์ 1 ครั้ง", test: (s) => s.reviews >= 1 },
  { id: "quiz10", icon: "🧠", name: "จำได้ไม่ลืม", how: "ทวนคำถามครบ 1-3-7 วัน 10 ข้อ", test: (s) => s.quizDone >= 10 },
  { id: "week8", icon: "🔥", name: "8 สัปดาห์ตามแผน", how: "ทำแผนสัปดาห์ครบ 8 สัปดาห์", test: (s) => s.weeksDone >= 8 },
  { id: "clip30", icon: "🥈", name: "จบขั้นฝึกมือ", how: "โพสต์ครบ 30 คลิป", test: (s) => s.clips >= 30 },
  { id: "subs100", icon: "👥", name: "100 ผู้ติดตาม", how: "ผู้ติดตาม 100 คน (ตัวเลขในตัวคำนวณ YPP)", test: (s) => s.subs >= 100 },
  { id: "clip100", icon: "🥇", name: "100 คลิป", how: "โพสต์ครบ 100 คลิป", test: (s) => s.clips >= 100 },
  { id: "subs1000", icon: "🏆", name: "1,000 ผู้ติดตาม", how: "ผู้ติดตาม 1,000 คน", test: (s) => s.subs >= 1000 },
];
