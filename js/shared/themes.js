// What a video is ABOUT, read from its title + tags. Shared by the daily robot (scripts/) and the pages (js/).
// A video can have several themes. Words are chosen so a short Thai word does not hit inside longer words
// (e.g. "ลูก" alone would also match "ลูกอม" = candy, so only clear family forms are listed).
// `fit` = how well the theme fits Win's two pages (couple life "วันๆ One One" and the AI page): 0-3.

export const THEMES = [
  { id: "couple", name: "คู่รัก / แฟน", icon: "💑", fit: 3,
    re: /แฟน|คู่รัก|เมีย|ผัว|สามี|ภรรยา|เดท|คุณแฟน|บ่าว|สาวลาว|couple|boyfriend|girlfriend|husband|wife|ແຟນ|ຜົວ|ເມຍ/i },
  { id: "food", name: "กิน / อาหาร", icon: "🍜", fit: 3,
    re: /กิน|อาหาร|ทำอาหาร|เมนู|อร่อย|ส้มตำ|หมูกระทะ|ก๋วยเตี๋ยว|ขนม|ข้าว|ปิ้ง|หมูย่าง|ไก่ย่าง|ของทอด|ไก่ทอด|หมูทอด|ต้มยำ|แกง|ชาบู|บุฟเฟ่ต์|มาม่า|food|mukbang|cooking|recipe|asmr eating|ກິນ|ອາຫານ|ແຊບ/i },
  { id: "funny", name: "ตลก / แกล้ง", icon: "😂", fit: 3,
    re: /ตลก|ฮาๆ|ฮามาก|ฮาแตก|คลิปฮา|ขำ|555|มุก|แกล้ง|ป่วน|โบ๊ะบ๊ะ|funny|comedy|prank|haha|meme|ຕະຫລົກ|ມ່ວນ|ຂຳ/i },
  { id: "family", name: "ครอบครัว / แม่ลูก", icon: "👨‍👩‍👧", fit: 2,
    re: /แม่ลูก|พ่อลูก|ลูกสาว|ลูกชาย|ลูกน้อย|ลูกๆ|ครอบครัว|คุณแม่|คุณพ่อ|คุณยาย|หลาน|เบบี๋|family|baby|mom|dad|ຄອບຄົວ|ແມ່/i },
  { id: "daily", name: "ชีวิตประจำวัน / vlog", icon: "🏠", fit: 3,
    re: /vlog|ชีวิต|วันๆ|กิจวัตร|ตื่นนอน|daily|routine|a day in|หนึ่งวัน|1 วัน|ทำงาน|ห้องพัก|ที่บ้าน|ຊີວິດ|ມື້ນີ້/i },
  { id: "animal", name: "สัตว์เลี้ยง", icon: "🐱", fit: 2,
    re: /แมว|(?<!เ)หมา(?![ยะ])|สุนัข|สัตว์|น้องหมา|น้องแมว|cat|dog|kitten|puppy|pet|ໝາ|ແມວ/i },
  { id: "challenge", name: "ท้าทาย / แข่ง", icon: "🔥", fit: 2,
    re: /ท้าทาย|ท้าแข่ง|คำท้า|โดนท้า|ชาเลนจ์|แข่ง|ใครจะ|challenge|vs\b|1 ชั่วโมง|24 ชั่วโมง/i },
  { id: "ghost", name: "ผี / เรื่องเล่า", icon: "👻", fit: 2,
    re: /ผี|หลอน|ลึกลับ|สยอง|เรื่องเล่า|เล่าเรื่อง|horror|ghost|scary|ຜີ/i },
  { id: "drama", name: "ละครสั้น / ดราม่า", icon: "🎭", fit: 2,
    re: /ละครสั้น|หนังสั้น|ดราม่า|ซีรีส์|ตอนที่|ep\.?\s?\d|short film|drama|story/i },
  { id: "travel", name: "เที่ยว / คาเฟ่", icon: "🧳", fit: 2,
    re: /เที่ยว|ทริป|ทะเล|ภูเขา|คาเฟ่|ที่พัก|ตลาดนัด|travel|trip|ທ່ຽວ/i },
  { id: "review", name: "รีวิว / ของใช้", icon: "🛍️", fit: 1,
    re: /รีวิว|แกะกล่อง|ของถูก|ของดี|ซื้อ|review|unbox|haul|shopee|lazada/i },
  { id: "howto", name: "สอน / ความรู้ / DIY", icon: "💡", fit: 1,
    re: /สอน|วิธี|ทริค|เคล็ดลับ|ความรู้|รู้หรือไม่|diy|how to|tutorial|hack/i },
  { id: "ai", name: "AI", icon: "🤖", fit: 3,
    re: /(^|[^a-z])ai([^a-z]|$)|เอไอ|chatgpt|gemini|veo|midjourney|ปัญญาประดิษฐ์/i },
  { id: "game", name: "เกม", icon: "🎮", fit: 0,
    re: /เกม|game|gaming|roblox|minecraft|rov|free ?fire|ฟีฟาย|pubg/i },
  { id: "sport", name: "กีฬา", icon: "⚽", fit: 0,
    re: /ฟุตบอล|บอลไทย|มวย|วอลเลย์|กีฬา|football|boxing|volleyball|muay/i },
  { id: "music", name: "เพลง / ร้องเพลง", icon: "🎵", fit: 0,
    re: /เพลง|ร้องเพลง|cover|คาราโอเกะ|mv\b|official mv|lyric|ເພງ/i },
];

export const THEME_BY_ID = Object.fromEntries(THEMES.map((t) => [t.id, t]));

// themesOf("แฟนแกล้งกินส้มตำ #funny") -> ["couple", "food", "funny"]
export function themesOf(text) {
  const s = String(text || "");
  return THEMES.filter((t) => t.re.test(s)).map((t) => t.id);
}

// YouTube's category numbers (Thai names as YouTube returns them for regionCode=TH, hl=th)
export const CATEGORY = {
  1: "ภาพยนตร์และแอนิเมชัน", 2: "ยานยนต์", 10: "เพลง", 15: "สัตว์เลี้ยงและสัตว์", 17: "กีฬา", 18: "ภาพยนตร์สั้น",
  19: "ท่องเที่ยว", 20: "เกม", 21: "วิดีโอบล็อก", 22: "บุคคลและบล็อก", 23: "ตลก", 24: "บันเทิง", 25: "ข่าวและการเมือง",
  26: "ฮาวทูและสไตล์", 27: "การศึกษา", 28: "วิทยาศาสตร์และเทคโนโลยี", 29: "องค์กรไม่แสวงกำไร", 30: "ภาพยนตร์", 43: "รายการ", 44: "ตัวอย่างหนัง",
};

// Win is a creator, not a singer or a reporter: the "creator view" leaves out these categories ...
export const NOT_CREATOR_CATEGORIES = new Set([10, 25, 30, 43, 44]);
// ... and channels of TV stations, record labels and news companies (names only used to filter, never shown as jokes)
export const MEDIA_CHANNEL = /official|ทีวี|\btv\b|ช่อง ?\d|\bhd ?\d|news|ข่าว|records|เรคคอร์ด|music|มิวสิค|workpoint|one31|ch3|ch ?7|gmm|amarin|thairath|ไทยรัฐ|pptv|mono29|true4u|nation|อมรินทร์|ເພງ|vevo|topic$/i;

export function isCreatorVideo(v) {
  if (NOT_CREATOR_CATEGORIES.has(Number(v.cat))) return false;
  if (MEDIA_CHANNEL.test(v.cn || "")) return false;
  return true;
}

// Shorts are up to 3 minutes since 15 Oct 2024 (YouTube Help, answer 12779649)
export const SHORT_MAX_SECONDS = 180;
export const isShort = (v) => Number(v.d) > 0 && Number(v.d) <= SHORT_MAX_SECONDS;

export const THAI = /[฀-๿]/;
export const LAO = /[຀-໿]/;
