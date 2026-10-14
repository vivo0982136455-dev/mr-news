# ขั้นตอนเปิด Mr News บนเว็บ (Win ทำเอง ~10 นาที)

ทำไมต้องใช้ GitHub: เน็ตบริษัทบล็อก YouTube/TikTok และโน้ตบุ๊กไม่ได้เปิดตลอดเวลา → ให้ "หุ่นยนต์" บนเซิร์ฟเวอร์ GitHub (ฟรี)
เก็บข้อมูลทุก 6 ชั่วโมง แล้วเปิดดูเว็บได้ทั้งมือถือและคอม เหมือนเว็บ Lao Kip & Gold ที่มีอยู่แล้ว

## ขั้นที่ 0 (แนะนำ): สร้างกุญแจ YouTube ใหม่
กุญแจเดิมเคยถูกแนบเข้ามาในแชต จึงควรเปลี่ยนก่อนใช้จริง
1. เปิด console.cloud.google.com → เลือกโปรเจกต์ **Mr News** → เมนูซ้าย **APIs & Services → Credentials**
2. กดชื่อ **API key 1** → กดปุ่ม **Regenerate key** (หรือ Rotate key) → ยืนยัน
3. คัดลอกกุญแจใหม่ → เปิดไฟล์ `Desktop\MrNews\youtube_key.txt` ด้วย Notepad → ลบของเก่า วางของใหม่ → Save
4. อย่าวางกุญแจในแชต และอย่าใช้ @ ชื่อไฟล์กุญแจในแชต

## ขั้นที่ 1: สร้างที่เก็บ (repository)
1. เปิด **github.com** ล็อกอินบัญชี **vivo0982136455-dev** (บัญชีเดียวกับ Lao Kip)
2. มุมขวาบน กด **+** → **New repository**
3. Repository name: `mr-news` · เลือก **Public** · **ไม่ต้อง** ติ๊ก Add a README
4. กด **Create repository** → บอก Steep ว่า "สร้าง repo แล้ว"

## ขั้นที่ 2: ใส่กุญแจเป็นความลับ (Secret)
1. ในหน้า repo `mr-news` → **Settings** (แถบบน) → เมนูซ้าย **Secrets and variables → Actions**
2. กด **New repository secret**
3. Name: `YT_API_KEY` · Secret: วางกุญแจ YouTube → **Add secret**
4. GitHub จะไม่โชว์กุญแจให้ใครเห็นอีก (รวมถึง Steep)

## ขั้นที่ 3: Steep อัปโหลดโค้ด
Steep ส่งโค้ดขึ้น repo (อาจมีหน้าต่าง GitHub ขอให้ Win กดอนุญาต 1 ครั้ง)

## ขั้นที่ 4: เปิดเว็บ (GitHub Pages)
1. **Settings → Pages** → Source: **Deploy from a branch** → Branch: **main** / **(root)** → **Save**
2. รอ 1-2 นาที เว็บจะอยู่ที่ **https://vivo0982136455-dev.github.io/mr-news/**
3. บนมือถือ: เปิดลิงก์ใน Chrome → เมนู ⋮ → **เพิ่มลงในหน้าจอหลัก** (Add to Home screen)

## ขั้นที่ 5: เช็คว่าหุ่นยนต์ทำงาน
1. แถบ **Actions** → ถ้ามีปุ่มให้เปิดใช้ workflow ให้กดเปิด
2. เลือก **Fetch data** → **Run workflow** → รอ ~2 นาที → ต้องขึ้นเครื่องหมายถูกสีเขียว
3. หลังจากนั้นหุ่นยนต์ทำงานเองทุก 6 ชั่วโมง (GitHub อาจเริ่มช้ากว่าเวลาจริง 1-3 ชั่วโมง ไม่เป็นไร)

โน้ตในสมุดของ Win **ไม่ขึ้น GitHub** — เก็บในเบราว์เซอร์ของเครื่องที่จดเท่านั้น (สำรองเป็นไฟล์ได้ในหน้าสมุด)
