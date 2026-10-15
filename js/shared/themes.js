// What a video is ABOUT, read from its title (its tags only when the title says nothing). Shared by the daily
// robot (scripts/) and the pages (js/). A video can have several themes.
// Thai has no spaces between words, so a short Thai word also sits inside longer words: "กิน" is inside "เกิน"
// (too much), "เดท" inside "อัปเดท" (update), "แฟน" inside "แฟนคลับ" (fan club), "ทะเล" inside "ทะเลาะ" (quarrel),
// "ผี" inside "ผีเสื้อ" (butterfly), "ย่าง" inside "อย่าง" (like), "ทอด" inside "ถ่ายทอด" (broadcast),
// "ท้า" inside "เท้า" (foot), "กิน" inside "สกินชิพ", "ความรู้" inside "ความรู้สึก" (feeling), "ข้าว" inside
// "เข้าวัด" (go to the temple). Each such word carries its own "not before / not after" rule below.
// A Latin word must stand alone: "cat" is not inside "category", "trip" not inside "tripod".
// tests/themes-cases.mjs holds real titles with the right answer; tests/all.mjs runs them.
// `fit` = how well the theme fits Win's two pages (couple life "วันๆ One One" and the AI page): 0-3.

// Thai / Lao word sources are regex pieces (may carry lookarounds); Latin words get letter boundaries
const lat = (...w) => w.map((x) => `(?<![a-z0-9])${x}(?![a-z0-9])`);
const re = (...parts) => new RegExp(parts.flat().join("|"), "i");

export const THEMES = [
  { id: "couple", name: "คู่รัก / แฟน", icon: "💑", fit: 3,
    re: re("แฟน(?!คลับ|บอล|ลูกยาง|นางงาม|ๆ|ซีรี|มีต|เพจ|ด้อม|เพลง|ละคร|หนัง|คลิป|ช่อง|การ์ตูน|เกม|อนิ)", "คู่รัก", "ชีวิตคู่", "หย่า", "เมีย", "ผัว(?!ะ)", "สามี", "ภรรยา",
      "(?<!อัป|อัพ)เด[ทต](?!ล)", "บ่าวสาว", "ແຟນ", "ຜົວ", "ເມຍ", lat("couple", "boyfriend", "girlfriend", "husband", "wife")) },
  { id: "food", name: "กิน / อาหาร", icon: "🍜", fit: 3,
    re: re("(?<![เส])กิน", "อาหาร", "เมนู", "อร่อย", "ส้มตำ", "หมูกระทะ", "ก๋วยเตี๋ยว", "ขนม", "(?<!เ)ข้าว(?!ของ)", "ปิ้ง", "(?<!อ)ย่าง", "(?<!ถ่าย)ทอด(?!ทิ้ง|ผ้า|กฐิน)", "ต้มยำ",
      "แกง(?!ค์)", "ชาบู", "บุฟเฟ่ต์", "มาม่า", "หม่าล่า", "ກິນ", "ອາຫານ", "ແຊບ", lat("food", "mukbang", "cooking", "recipe", "asmr eating")) },
  { id: "funny", name: "ตลก / แกล้ง", icon: "😂", fit: 3,
    re: re("ตลก", "ฮาๆ", "ฮามาก", "ฮาแตก", "คลิปฮา", "ขำ", "555", "มุก(?!ดา)", "แกล้ง", "ป่วน", "โบ๊ะบ๊ะ", "สายฮา", "ຕະຫລົກ", "ມ່ວນ", "ຂຳ",
      lat("funny", "comedy", "prank", "haha", "memes?")) },
  { id: "family", name: "ครอบครัว / แม่ลูก", icon: "👨‍👩‍👧", fit: 2,
    re: re("แม่ลูก", "พ่อลูก", "ลูกสาว", "ลูกชาย", "ลูกน้อย", "ลูกๆ", "ครอบครัว", "คุณแม่", "คุณพ่อ", "คุณยาย", "คุณย่า", "หลาน", "เบบี๋",
      "ຄອບຄົວ", "ແມ່(?!ນ)", lat("family", "baby", "mom", "dad")) },
  { id: "daily", name: "ชีวิตประจำวัน / vlog", icon: "🏠", fit: 3,
    // not "ชีวิต" alone: it is in drama titles ("เปลี่ยนชีวิต", "ล่าชีวิต") far more than in daily-life clips
    re: re("ชีวิตประจำวัน", "วิถีชีวิต", "ใช้ชีวิต", "ชีวิตจริง", "วันๆ", "กิจวัตร", "ตื่นนอน", "หนึ่งวัน", "1 วันกับ", "ไปทำงาน", "อยู่บ้าน", "ຊີວິດປະຈຳວັນ",
      lat("vlog", "daily", "routine", "a day in", "day in my life")) },
  { id: "animal", name: "สัตว์เลี้ยง", icon: "🐱", fit: 2,
    re: re("แมว", "(?<!เ)หมา(?![ยะ]|ก(?:รุก|ฝรั่ง|พลู))", "สุนัข", "สัตว์(?!ประหลาด)", "ໝາ", "ແມວ", lat("cats?", "dogs?", "kitten", "puppy", "pets?")) },
  { id: "challenge", name: "ท้าทาย / แข่ง", icon: "🔥", fit: 2,
    re: re("(?<!เ)ท้า(?![ยว])", "ชาเลนจ์", "แข่ง", "24 ชั่วโมง", lat("challenge", "vs", "24 hours")) },
  { id: "ghost", name: "ผี / เรื่องเล่า", icon: "👻", fit: 2,
    re: re("ผี(?!เสื้อ)", "อาถรรพ์", "วิญญาณ", "เปรต", "หลอน", "ลึกลับ", "สยอง", "เรื่องเล่าสยอง", "ຜີ", lat("horror", "ghost", "scary")) },
  { id: "drama", name: "ละครสั้น / ดราม่า", icon: "🎭", fit: 2,
    re: re("ละครสั้น", "หนังสั้น", "ดราม่า", "ซีรีส์", lat("short film", "drama")) }, // not "EP.3": vlog and game series number their episodes too
  { id: "travel", name: "เที่ยว / คาเฟ่", icon: "🧳", fit: 2,
    re: re("เที่ยว", "ทริป", "ทะเล(?!าะ)", "ภูเขา", "คาเฟ่", "ที่พัก", "ตลาดนัด", "ທ່ຽວ", lat("travel", "trip")) },
  { id: "review", name: "รีวิว / ของใช้", icon: "🛍️", fit: 1,
    re: re("รีวิว", "แกะกล่อง", "ของถูก", "ของดี", "ซื้อ", lat("review", "unbox(ing)?", "haul", "shopee", "lazada")) },
  { id: "howto", name: "สอน / ความรู้ / DIY", icon: "💡", fit: 1,
    re: re("(?<!คำ)สอน(?!ใจ)", "วิธี", "ทริค", "เคล็ดลับ", "ความรู้(?!สึก)", "รู้หรือไม่", lat("diy", "how to", "tutorial", "(life)?hacks?")) },
  { id: "ai", name: "AI", icon: "🤖", fit: 3,
    re: re("เอไอ", "ปัญญาประดิษฐ์", lat("ai", "chatgpt", "gemini", "veo ?\\d?", "midjourney", "sora", "kling")) },
  { id: "game", name: "เกม", icon: "🎮", fit: 0,
    re: re("เกม", "ฟีฟาย", "(?<![a-z])free ?fire", lat("games?", "gaming", "roblox", "minecraft", "rov", "pubg")) },
  { id: "sport", name: "กีฬา", icon: "⚽", fit: 0,
    re: re("ฟุตบอล", "บอลไทย", "ลูกยาง", "มวย", "วอลเลย์", "กีฬา", lat("football", "boxing", "volleyball", "muay")) },
  { id: "music", name: "เพลง / ร้องเพลง", icon: "🎵", fit: 0,
    re: re("เพลง", "คาราโอเกะ", "ເພງ", lat("cover", "mv", "lyrics?")) },
];

export const THEME_BY_ID = Object.fromEntries(THEMES.map((t) => [t.id, t]));

// themesOf("แฟนแกล้งกินส้มตำ #funny") -> ["couple", "food", "funny"]; the second text (tags) is read only when
// the first (title, with its hashtags) gives no theme - tags are often copied from channel to channel
export function themesOf(title, tags = "") {
  const of = (s) => THEMES.filter((t) => t.re.test(String(s || ""))).map((t) => t.id);
  const a = of(title);
  return a.length ? a : of(tags);
}

// YouTube's category numbers (Thai names as YouTube returns them for regionCode=TH, hl=th)
export const CATEGORY = {
  1: "ภาพยนตร์และแอนิเมชัน", 2: "ยานยนต์", 10: "เพลง", 15: "สัตว์เลี้ยงและสัตว์", 17: "กีฬา", 18: "ภาพยนตร์สั้น",
  19: "ท่องเที่ยว", 20: "เกม", 21: "วิดีโอบล็อก", 22: "บุคคลและบล็อก", 23: "ตลก", 24: "บันเทิง", 25: "ข่าวและการเมือง",
  26: "ฮาวทูและสไตล์", 27: "การศึกษา", 28: "วิทยาศาสตร์และเทคโนโลยี", 29: "องค์กรไม่แสวงกำไร", 30: "ภาพยนตร์", 43: "รายการ", 44: "ตัวอย่างหนัง",
};

// Win is a creator, not a singer or a reporter: the "creator view" leaves out these categories ...
export const NOT_CREATOR_CATEGORIES = new Set([10, 25, 30, 43, 44]);
// ... and channels of TV stations, record labels and news companies - ONE list, used by the robot and the pages
// (names only used to filter, never shown as jokes)
export const MEDIA_CHANNEL = new RegExp([
  "official", "ทีวี", "ช่อง ?\\d", "ข่าว", "เรคคอร์ด", "มิวสิค", "อมรินทร์", "ไทยรัฐ", "มติชน", "เดลินิวส์", "ลุงโน้ต", "ເພງ", "ຂ່າວ",
  ...lat("tv", "hd ?\\d", "news", "records", "music", "workpoint", "one31", "ch ?\\d+", "gmm\\w*", "amarin\\w*", "thairath", "pptv\\w*",
    "mono ?29", "true4u", "nation\\w*", "3plus", "sanook(\\.com)?", "thai ?pbs", "tnn\\w*", "mcot", "lungnote\\w*", "matichon", "khaosod",
    "dailynews", "spring ?news", "nbt\\w*", "bright ?tv", "top ?news", "kapook", "vevo"),
  "topic$",
].join("|"), "i");

// Not original work: dubbed / spoiler / re-uploaded clips and mass-made short dramas. YouTube does not pay for
// "reused" or template-made content, so the book shows these apart, marked "อย่าเลียนแบบ" (do not copy).
// Read from the title AND the channel name. Channels that hide it can be listed by hand in config/channels.json.
// Not "ละครสั้น" alone: many Thai creators film their own comedy skits under #ละครสั้น; only AI-made ones go here.
export const COPY_WORDS = /สปอย|พากย์|สรุปเนื้อเรื่อง|สรุปหนัง|เล่าหนัง|ละครสั้น ?ai|(?<![a-z])ai ?ละคร|ซีรีส์จีน|ซีรี่ส์จีน|หนังจีน|รีอัพ|รีอัป|(?<![a-z])re-?up(?![a-z])|short ?drama|[【】]|[぀-ヿ一-鿿가-힯]/i;
export const isCopyText = (title, channel) => COPY_WORDS.test(String(title || "")) || COPY_WORDS.test(String(channel || ""));

// News and politics are outside Win's rules (no politics) - kept out of the Lao creator view and Mr Idea's proof
export const SENSITIVE = /ข่าว|การเมือง|นายก(?!ฯ? ?สมาคม)|รัฐมนตรี|รัฐบาล|ส\.ส\.|เลือกตั้ง|พรรค|จับกุม|คอร์รัปชัน|ทุจริต|ຂ່າວ|ນາຍົກ|ລັດຖະມົນຕີ|ລັດຖະບານ|ສະພາ|ກອງປະຊຸມ|ຈັບກຸມ|ສໍ້ລາດ|ลงนาม|ລົງນາມ|กระทรวง|ກະຊວງ|สหรัฐ|(?<![a-z])news(?![a-z])/i;

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
