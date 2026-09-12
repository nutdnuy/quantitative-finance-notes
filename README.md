# Quantitative Finance Notes

สมุดบันทึกการเงินเชิงปริมาณภาษาไทย พร้อมสมการ กราฟที่ปรับค่าได้ และ Python Notebook

[อ่านเว็บไซต์](https://nutdnuy.github.io/quantitative-finance-notes/) · [Welcome](https://nutdnuy.github.io/quantitative-finance-notes/intro.html) · [คู่มือแก้ไข](EDITING.md)

หน้าแรกเป็น **Welcome** และใช้สารบัญแบบไม่แสดงเลขบท ไฟล์เนื้อหาและการตั้งค่าแยกกันเพื่อแก้เองได้ ดูคู่มือ [EDITING.md](EDITING.md)

โฟลเดอร์งานในเครื่องคือ `QuantConnet Content/quantitative-finance-notes` ใช้สำหรับทำเว็บซีรีส์นี้ต่อทั้งชุด ชื่อเดิม `wilmott-ch03-thai-lab` เป็นทางลัดมาที่โฟลเดอร์เดียวกัน กติกาสำหรับ AI ที่มาทำงานต่ออยู่ใน [AGENTS.md](AGENTS.md)

## โครงสร้างที่แก้ได้

```text
intro.md                       หน้า Welcome
random-assets.md               บทเรียนเรื่องความสุ่มของสินทรัพย์
binomial-model.md              บทเรียน Binomial Model และการคิดราคา Option ย้อนกลับ
glossary.md                    อภิธานศัพท์ร่วมของซีรีส์
AGENTS.md                      แนวทางทำงานสำหรับ AI ในโปรเจกต์นี้
_config.yml                    ชื่อเว็บ ผู้เขียน รูป และลิงก์ repository
_toc.yml                       สารบัญและลำดับหน้า
templates/new-topic.md         แม่แบบเพิ่มหัวข้อ
notebooks/random-assets.ipynb  Python Notebook
notebooks/binomial-model.ipynb  Python Notebook ของบท Binomial Model
assets/images/                 รูปและคำสั่งที่ใช้สร้างภาพ
book.css                       หน้าตา Welcome และสารบัญ
style.css                      หน้าตาบทเรียนและกราฟ
src/                           กราฟและปุ่มทดลอง
```

รูปแบบการแยกไฟล์ได้รับแรงบันดาลใจจาก [Understanding Quantitative Finance](https://github.com/quantgirluk/Understanding-Quantitative-Finance/tree/main/UQF) ของ Dialid Santiago ตัวสร้างในโปรเจกต์นี้เป็น Node.js แบบเฉพาะเพื่อรองรับกราฟเดิม จึงไม่ใช่ Jupyter Book และไม่รองรับตัวเลือกของ Jupyter Book ทุกตัว

## แก้บน GitHub

เปิดไฟล์ [intro.md](intro.md) หรือ [random-assets.md](random-assets.md) กดปุ่มดินสอ แก้ข้อความ แล้วกด **Commit changes** ลง `main` เว็บจะสร้างและเผยแพร่อัตโนมัติ ดูสถานะที่ [Actions](https://github.com/nutdnuy/quantitative-finance-notes/actions)

เพิ่มหัวข้อผ่าน `_toc.yml` และแก้ชื่อเว็บหรือรูปผ่าน `_config.yml` รายละเอียดการเชื่อมโดเมน QuantCorner อยู่ใน [DEPLOYMENT.md](DEPLOYMENT.md)

## เปิดและแก้ไข

บน Mac เปิด `Preview.command` หรือใช้ Node.js 22 ขึ้นไป:

```sh
npm install
npm run dev
```

เปิด `http://127.0.0.1:8763/` เมื่อบันทึก Markdown, YAML, CSS หรือโค้ดกราฟ เว็บจะสร้างใหม่และโหลดหน้าใหม่ให้

สร้างไฟล์สำหรับส่งต่อ:

```sh
npm run build
```

ผู้อ่านเปิด `index.html` ได้โดยไม่ต้องติดตั้ง dependencies เก็บไฟล์เว็บและ `assets/` ไว้ด้วยกัน รองรับการค้นหา การสลับธีม และกราฟแบบ offline

ไฟล์ HTML ไม่อยู่ใน Git; รัน build ก่อนเปิดไฟล์ในเครื่อง หรือใช้ `npm run build:pages` เพื่อสร้างโฟลเดอร์ `_site/` สำหรับโฮสต์เว็บโดยเฉพาะ ระบบจะตรวจลิงก์ รูป และฟอนต์ภายในก่อนเผยแพร่

## เนื้อหาและแหล่งที่มา

บท **Binomial Model** ต่อจากบทความสุ่ม ครอบคลุมพอร์ตเลียนแบบ ดอกเบี้ย risk-neutral probability ต้นไม้หลายช่วงเวลา และ backward induction อ้างอิงเอกสาร *Binomial Model* ของหลักสูตร Certificate in Quantitative Finance ที่ผู้ใช้ให้มา พร้อมตัวอย่างสองก้าวและห้องทดลอง Call/Put ที่คำนวณขึ้นใหม่ ดูขอบเขตแหล่งที่มาในท้ายบทและ `data/binomial-provenance.json` ไม่รวม PDF ต้นฉบับไว้ใน repository

สร้างและรัน Notebook บทนี้ด้วย `python3 scripts/make_binomial_notebook.py` ใช้เฉพาะ Python standard library; ตรวจห้องทดลองด้วย `node qa/binomial-browser.cjs` ขณะเปิด preview ที่พอร์ต 8763

เนื้อหาเรื่องความสุ่มของสินทรัพย์มีส่วนที่แปลและเรียบเรียงจาก *Paul Wilmott on Quantitative Finance*, second edition (2006), chapter 3, printed pp. 55–70 จาก PDF ที่ผู้ใช้ให้มา ฉบับนี้เปิดด้วยแนวคิดของ Bachelier (1900) เพิ่มพื้นฐาน Option และตัวอย่างใหม่ก่อน Jensen’s inequality และตัดส่วนทดลองบนสเปรดชีตออก แหล่งอ้างอิงอยู่ท้ายบทเรียน ข้อมูลประวัติศาสตร์และตัวอย่างที่ยังใช้จากหนังสือคงตัวเลขเดิม ส่วน exact GBM เป็นภาคทดลองเพิ่มเติม

ตาราง Perez Companc มีราคา 34 จุดและผลตอบแทนคำนวณกลับ 33 ค่า แยกจากสถิติที่หนังสือรายงานสำหรับอนุกรมเต็ม รายละเอียดใน `data/provenance.json`

ภาพปก `assets/images/welcome-paths.png` สร้างด้วย Image Generator โดยใช้แนวคิดจากภาพเส้นทางสุ่มที่ผู้ใช้แนบ เป็นงานภาพเชิงแนวคิด ไม่ใช่ผลจำลองหรือข้อมูลที่ใช้เป็นหลักฐานในบทเรียน กราฟภายในบทเรียนยังคำนวณจากข้อมูลและสูตร

Notebook ใช้ Python 3, NumPy และ Jupyter/IPython ถ้ารัน `make_notebook.py` จะสร้าง Notebook ใหม่จากเนื้อหาเว็บ รันเซลล์โค้ด และรายงานจำนวนเซลล์กับกราฟที่สร้างได้ คำสั่งนี้เขียนทับไฟล์ Notebook ที่สร้างไว้

ดูที่มาและใบอนุญาตแยกตามส่วนใน [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) แหล่งอ้างอิงและผลงานของบุคคลที่สามยังอยู่ภายใต้สิทธิ์เดิมของเจ้าของ ไม่มีการให้ใบอนุญาตใหม่ครอบคลุมทั้ง repository
