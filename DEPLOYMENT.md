# GitHub Pages และโดเมน QuantCorner

Repository: <https://github.com/nutdnuy/quantitative-finance-notes>

ที่อยู่เริ่มต้นของ GitHub Pages: <https://nutdnuy.github.io/quantitative-finance-notes/>
หน้า Welcome เปิดผ่าน `intro.html` ได้ด้วย

## แก้แล้วเผยแพร่อัตโนมัติ

1. แก้ `intro.md`, `random-assets.md`, `_toc.yml` หรือ `_config.yml` บน GitHub
2. กด **Commit changes** ลง branch `main`
3. เปิดแท็บ **Actions → Publish book** เพื่อดูสถานะ
4. เมื่อขั้นตอน build และ deploy สำเร็จ ให้โหลดหน้าเว็บใหม่

Workflow ใช้ Node.js 22 ติดตั้งจาก `package-lock.json` ตรวจสูตร สร้างหน้าเว็บ
และตรวจลิงก์ไฟล์ก่อนเผยแพร่ เฉพาะไฟล์ที่ส่งออกไปยัง `_site/` เท่านั้นที่เป็นเว็บไซต์
Pull request จะตรวจและสร้างเว็บให้ แต่ยังไม่เปลี่ยนเว็บจริง

สำหรับการเปิด Pages ครั้งแรก ให้ตั้ง **Settings → Pages → Source → GitHub Actions**
ไฟล์ HTML และ JavaScript ที่สร้างอัตโนมัติไม่ต้อง commit; workflow สร้างใหม่จากต้นทาง

## เชื่อม subdomain

เลือกชื่อเต็มก่อน เช่น `notes.example.com` โดยแทน `example.com` ด้วยโดเมน
QuantCorner ที่เป็นเจ้าของจริง การตั้งค่านี้ต้องทำทั้งฝั่ง GitHub และผู้ให้บริการ DNS

1. ยืนยันโดเมนใน **Account Settings → Pages** ตาม TXT record ที่ GitHub แสดง
2. ใน repository เปิด **Settings → Pages → Custom domain** ใส่ชื่อ subdomain แล้วบันทึก
3. เพิ่ม DNS record ที่ผู้ให้บริการโดเมน:

| Type | Name | Target |
|---|---|---|
| CNAME | ชื่อ subdomain เช่น `notes` | `nutdnuy.github.io` |

Target ไม่มี `https://` และไม่มีชื่อ repository ต่อท้าย หากมี record ของชื่อเดียวกัน
ต้องตรวจบริการที่ใช้ชื่อนั้นก่อนเปลี่ยน

4. รอ DNS และใบรับรองพร้อม จากนั้นเปิด **Enforce HTTPS** ใน Pages

Workflow นี้ใช้ GitHub Actions จึงตั้งโดเมนใน Pages settings โดยตรง;
GitHub ไม่ใช้ไฟล์ `CNAME` ใน artifact สำหรับวิธีเผยแพร่นี้

หากต้องการ URL แบบ `example.com/learn/` จะต้องตั้งการส่งต่อหรือ proxy ที่เว็บหลัก
เพราะ DNS กำหนดเส้นทาง `/learn/` ไม่ได้ ไฟล์เว็บใช้ลิงก์ relative และรองรับการวาง
ใต้ path อยู่แล้ว แต่การเชื่อมต่อขึ้นกับบริการที่โฮสต์เว็บ QuantCorner

ชื่อโดเมน QuantCorner และการตั้งค่า DNS ยังรอเจ้าของระบุ จึงยังไม่มีการเปลี่ยน DNS

เอกสารอ้างอิง:
- [GitHub Pages custom workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)
- [จัดการ custom domain](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site)
- [ยืนยันสิทธิ์โดเมน](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/verifying-your-custom-domain-for-github-pages)
