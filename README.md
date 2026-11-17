# รวมเคส (CaseHub) — เว็บเทียบราคาเคสมือถือ + บอทดึงราคา Shopee

Final project: เว็บเทียบราคาเคสมือถือบน Shopee ที่คำนวณ **ราคาหลังใช้โค้ดร้าน** ให้ เลือกเฉพาะเคสที่ใส่รุ่นของเราได้ และ "ลองทาบเคส" บนภาพเครื่องก่อนซื้อ
ข้อมูลสินค้ามาจากบอท (Python + Playwright) ที่รันในเครื่องของคุณเอง

> repo นี้มี **แค่โค้ด** — ไม่มีข้อมูลสินค้า ลิงก์ affiliate คุกกี้ หรือบัญชีของเจ้าของ
> ไฟล์ข้อมูลใน `assets/` เป็นไฟล์ว่าง เว็บจะขึ้นว่า "ยังไม่มีเคส" จนกว่าคุณจะรันบอทของคุณเอง

## มีอะไรบ้าง

| โฟลเดอร์ | คืออะไร |
|---|---|
| `index.html`, `pages/` | หน้าเว็บ (HTML + JS ล้วน ไม่ต้อง build): หน้าแรก, เคสตามรุ่น, อันดับเคส, ไถดูเคส, ลองทาบเคส, โค้ดส่วนลด, อุปกรณ์เสริม, ที่เก็บไว้ |
| `assets/` | `site.js` สคริปต์หลัก · `tryon.js` วาดเครื่อง+เคส (SVG) · `phones.js` ขนาด/สีเครื่อง · `live.js` `options.js` ฯลฯ = ข้อมูลที่บอทเขียนให้ (ตอนนี้ว่าง) |
| `bot/` | บอทดึงราคา + โค้ดร้านจาก Shopee TH → `bot/data/products.json` → publish เป็น `assets/live.js` |
| `setup/` | สคริปต์ PowerShell เปิดเว็บในเครื่อง (localhost:5190) และ (ถ้าต้องการ) ต่อออกเน็ตผ่าน Cloudflare Tunnel |
| `tools/site-qa/` | สคริปต์ตรวจเว็บ (contrast, มือถือ, ลิงก์) |

## เปิดเว็บ

- ง่ายสุด: ดับเบิลคลิก `index.html`
- หรือเปิดเป็นเว็บเซิร์ฟเวอร์ในเครื่อง:
  ```
  powershell -ExecutionPolicy Bypass -File setup\serve.ps1
  ```
  แล้วเข้า http://localhost:5190

## รันบอท (Windows)

ต้องมี Windows 10/11, [Python 3.9+](https://www.python.org/downloads/) (ติ๊ก Add to PATH), Google Chrome และ [Node.js](https://nodejs.org/) (ใช้ตอน publish)

1. `bot/1_setup/1_install.bat` — ติดตั้ง environment + Playwright
2. `bot/1_setup/2_login.bat` — เปิด Chrome ของบอท ล็อกอิน Shopee **ด้วยบัญชีผู้ซื้อแยกของคุณเอง** แล้วกด Enter
   (คุกกี้จะเก็บใน `bot/chrome_profile/` ในเครื่องคุณเท่านั้น — ไฟล์นี้อยู่ใน `.gitignore` อย่า commit)
3. แก้ `bot/config.json` — คำค้น, รุ่น, ช่วงราคา, ความเร็ว
4. `bot/2_run/3_run_bot.bat` — ดึง 1 รอบ แล้ว publish เข้าเว็บให้อัตโนมัติ
5. (ถ้าต้องการ) `bot/3_schedule/4_schedule_daily.bat` — ตั้งให้รันทุกวัน

รายละเอียดทั้งหมดอยู่ใน [bot/README.md](bot/README.md)

**สำคัญ:** ในไฟล์ `config.json` ค่า `publish_only_with_affiliate_link` เป็น `true` — เว็บจะโชว์เฉพาะสินค้าที่ใส่ลิงก์ใน `bot/affiliate_links.csv` แล้ว
ถ้าแค่อยากลองดูผล ให้เปลี่ยนเป็น `false`

## ตั้งค่าโดเมนของคุณเอง

โค้ดใช้ `example.com` เป็นที่ว่างไว้ ถ้าจะเปิดเว็บจริงให้ค้นแทนที่ `example.com` ด้วยโดเมนของคุณ (`bot/scripts/build_static_pages.js`, `robots.txt`, `setup/*.ps1`, `<meta og:image>` ในหน้า HTML)

## ข้อควรรู้

- บอทอ่านหน้าเว็บ Shopee ซึ่ง **ผิดเงื่อนไขการใช้งานของ Shopee** เสี่ยงโดนจำกัด/แบนบัญชีที่ล็อกอิน ใช้บัญชีแยก อย่าลดความเร็ว (`delay_seconds`) และไม่ควรรันถี่
- ถ้า Shopee ขอยืนยันตัวตน บอทจะหยุดรอให้คุณกดเองในหน้าต่าง Chrome ไม่กดแทน
- ราคาเป็นราคา ณ เวลาที่บอทเช็ก คิดเฉพาะโค้ดร้าน ไม่รวมโค้ดแพลตฟอร์ม/Coins
- ห้ามแชร์โฟลเดอร์ `bot/chrome_profile/` ให้ใคร — มีคุกกี้ล็อกอินของคุณ
