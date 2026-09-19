# แก้เว็บด้วยตัวเอง

ไฟล์นี้เป็นคู่มือสำหรับเจ้าของเว็บ เนื้อหาที่ผู้อ่านเห็นอยู่ในไฟล์ Markdown แยกกัน จัดโครงสร้างคล้ายตัวอย่าง QuantGirl ที่ใช้ `intro.md`, `_config.yml`, `_toc.yml` และ Notebook

เว็บฉบับนี้ใช้ตัวสร้างใน `build.cjs` เพื่อคงกราฟที่ปรับค่าได้ ไม่ได้ใช้คำสั่ง Jupyter Book โดยตรง ไฟล์ตั้งค่าใช้ชื่อและรูปแบบส่วนต้นคล้ายกัน แต่ตัวเลือกที่รองรับมีเฉพาะที่อธิบายไว้ด้านล่าง

## ถ้าต้องการแก้สิ่งนี้ ให้เปิดไฟล์นี้

| สิ่งที่ต้องการแก้ | ไฟล์ |
|---|---|
| ข้อความหน้า Welcome | `intro.md` |
| เนื้อหาเรื่องพฤติกรรมแบบสุ่มของสินทรัพย์ | `random-assets.md` |
| เนื้อหา Binomial Model | `binomial-model.md` |
| เนื้อหา Transition Density Functions | `transition-density-functions.md` |
| เนื้อหา Applied Stochastic Calculus | `applied-stochastic-calculus.md` |
| เนื้อหา Black–Scholes Model | `black-scholes-model.md` |
| เนื้อหา Martingale Pricing | `martingale-pricing.md` |
| Notebook และห้องทดลอง Martingale Pricing | `notebooks/martingale-pricing.ipynb`, `src/martingale-pricing.jsx`, `src/martingale-pricing.mjs` |
| เนื้อหา Portfolio Theory | `portfolio-theory.md` |
| เนื้อหา Optimization Problem | `portfolio-optimization.md` |
| เนื้อหา Black–Litterman | `black-litterman.md` |
| เนื้อหา Value at Risk and Expected Shortfall | `value-at-risk-expected-shortfall.md` |
| Notebook และห้องทดลอง VaR/ES | `notebooks/value-at-risk-expected-shortfall.ipynb`, `src/tail-risk.jsx`, `src/tail-risk.mjs` |
| ความหมายและตัวอย่างคำศัพท์ | `glossary.md` |
| ชื่อเว็บ ชื่อผู้เขียน รูปด้านบน ลิงก์ GitHub | `_config.yml` |
| รายการและลำดับหัวข้อในสารบัญ | `_toc.yml` |
| รูปด้านบน | ไฟล์โลโก้ที่กำหนดใน `logo` และ `logo_secondary` ของ `_config.yml` |
| Notebook สำหรับทดลอง Python | `notebooks/random-assets.ipynb` |
| Notebook และห้องทดลอง Binomial | `notebooks/binomial-model.ipynb`, `src/binomial.jsx`, `src/binomial.mjs` |
| Notebook และห้องทดลอง Transition Density | `notebooks/transition-density-functions.ipynb`, `src/transition-density.jsx`, `src/transition-density.mjs` |
| Notebook และห้องทดลอง Stochastic Calculus | `notebooks/applied-stochastic-calculus.ipynb`, `src/stochastic-calculus.jsx`, `src/stochastic-calculus.mjs` |
| Notebook และห้องทดลอง Black–Scholes | `notebooks/black-scholes-model.ipynb`, `src/black-scholes.jsx`, `src/black-scholes.mjs` |
| Notebook และห้องทดลอง Optimization Problem | `notebooks/portfolio-optimization.ipynb`, `src/portfolio-optimization.jsx`, `src/portfolio-optimization.mjs` |
| สีและหน้าตาของหน้า Welcome/สารบัญ | `book.css` |
| หน้าตาบทเรียนและกราฟ | `style.css` |
| พฤติกรรมกราฟแบบปรับค่าได้ | `src/labs.jsx`, `src/source-labs.jsx`, `src/math.mjs` |

เปิด Markdown ด้วยโปรแกรมแก้ข้อความหรือ VS Code ได้ บรรทัดระหว่าง `---` ด้านบนเป็นชื่อและคำอธิบายหน้า ส่วนที่อยู่ถัดลงมาคือเนื้อหา

คำศัพท์ของซีรีส์: ใช้ **step** สำหรับแต่ละ step ของแบบจำลอง และ **time step** สำหรับช่วงเวลา Δt ให้ตรงกันทั้งบทเรียน ป้ายห้องทดลอง และ Notebook

## เปิดตัวอย่างและดูผลขณะแก้

1. เครื่องนี้ติดตั้ง Node.js ไว้แล้ว ถ้าย้ายไปเครื่องอื่น ให้ติดตั้ง Node.js 22 ขึ้นไปก่อน
2. ดับเบิลคลิก `Preview.command` บน Mac หรือเปิด Terminal ในโฟลเดอร์นี้แล้วใช้ `npm install` ตามด้วย `npm run dev`
3. เปิด `http://127.0.0.1:8763/`
4. แก้ Markdown, YAML หรือ CSS แล้วบันทึก เว็บจะสร้างใหม่และหน้าเว็บจะโหลดใหม่เองเมื่อสร้างสำเร็จ
5. จบการทำงานโดยกด Control+C ในหน้าต่าง Terminal

การติดตั้งครั้งแรกใช้เครือข่ายเพื่อดาวน์โหลด dependencies หลังจากนั้นตัวอย่างเว็บทำงานในเครื่อง หากมีเว็บนี้เปิดอยู่ที่พอร์ต 8763 แล้ว ให้ใช้หน้าต่างเดิมหรือปิดตัวอย่างเดิมก่อนเริ่มใหม่

## เพิ่มหัวข้อใหม่

1. คัดลอก `templates/new-topic.md` มาวางที่โฟลเดอร์หลัก เปลี่ยนชื่อ เช่น `brownian-motion.md` ใช้ตัวอังกฤษพิมพ์เล็ก ตัวเลข และขีดกลาง โดยไม่เว้นวรรค
2. แก้ชื่อและเนื้อหาในไฟล์
3. เพิ่มรายการใน `_toc.yml` ใต้ `chapters:` โดยเว้นวรรคตามตัวอย่าง:

```yaml
chapters:
  - file: random-assets
    title: พฤติกรรมแบบสุ่มของสินทรัพย์
  - file: brownian-motion
    title: Brownian motion
```

ไม่ต้องใส่ `.md` ต่อท้ายค่า `file` ชื่อไฟล์ต้องไม่ซ้ำกัน รายการใหม่จะปรากฏในสารบัญและระบบค้นหาหลังสร้างเว็บใหม่

ตัวสร้างนี้รองรับหน้าแรก `root`, รายการ `chapters` แบบหนึ่งระดับ และ `title` ของแต่ละหน้า ยังไม่รองรับโครงสร้างหลาย `parts` หรือการฝัง Notebook เป็นหน้าเว็บอัตโนมัติ เพิ่ม Notebook ในโฟลเดอร์ `notebooks/` แล้วลิงก์จาก Markdown ได้

หากบทมี Notebook ของตัวเอง ให้เพิ่ม `notebook: notebooks/ชื่อบท.ipynb` ใน YAML frontmatter ปุ่มดาวน์โหลด Notebook ใน sidebar ของหน้านั้นจะชี้ไฟล์นี้ หน้าที่ไม่ได้กำหนดยังคงใช้ค่า `notebook` จาก `_config.yml`

## เพิ่มหรือแก้คำในอภิธานศัพท์

แก้คำอธิบายได้ที่ `glossary.md` แต่ควรคง `id` ของคำเดิมไว้ เพราะลิงก์จากบทเรียนอ้างถึงค่านี้ เมื่อต้องการเพิ่มคำ ให้เพิ่มภายในหมวดที่เกี่ยวข้องตามรูปแบบนี้ (เว้นบรรทัดว่างรอบข้อความ):

```markdown
<section id="new-term" class="glossary-term">

### New term — ชื่อภาษาไทย

คำอธิบายสั้น ๆ และตัวอย่าง

[ดูในบทเรียน](random-assets.html#model)

</section>
```

เชื่อมคำใน `random-assets.md` ด้วย `[คำศัพท์](glossary.html#new-term)` เปลี่ยน `new-term` ให้ตรงกับ `id` ของคำนั้น ระบบจะรวมคำใหม่ในการค้นหาเมื่อสร้างเว็บครั้งถัดไป

## รูปและสมการ

ใส่รูปด้วย Markdown:

```markdown
![คำอธิบายรูป](assets/images/my-image.png)
```

สมการแบบแยกบรรทัดใช้ `$$`:

```text
$$
\mathbb{E}[X] = \sum_i p_i x_i
$$
```

KaTeX และฟอนต์อยู่ในโฟลเดอร์ `assets/` แล้ว ไม่ต้องเรียกบริการภายนอก

## สร้างไฟล์สำหรับส่งต่อ

ดับเบิลคลิก `Build.command` หรือใช้ `npm run build` แล้วส่งโฟลเดอร์นี้ได้โดยไม่ต้องส่ง `node_modules/`, `.git/` และ `revisions/` ผู้อ่านเปิด `index.html` ได้โดยไม่ต้องติดตั้ง Node.js กราฟ ค้นหา รูป และฟอนต์ใช้ไฟล์ภายในโฟลเดอร์เดียวกัน

`index.html`, `random-assets.html`, `app.js`, `site.js` และ `search-index.js` เป็นไฟล์ที่สร้างอัตโนมัติ **แก้ Markdown/YAML/CSS ต้นทาง** เพื่อให้การแก้ไขคงอยู่หลังสร้างใหม่

## แก้บน GitHub แล้วอัปเดตเว็บ

เปิด [repository](https://github.com/nutdnuy/quantitative-finance-notes) เลือกไฟล์ Markdown แล้วกดปุ่มดินสอ **Edit this file** เมื่อแก้เสร็จให้กด **Commit changes** ลง `main`

GitHub Actions จะตรวจและสร้างเว็บให้เอง เมื่อ [Publish book](https://github.com/nutdnuy/quantitative-finance-notes/actions) สำเร็จ หน้า [เว็บไซต์](https://nutdnuy.github.io/quantitative-finance-notes/) จะเป็นฉบับใหม่ ไม่ต้องแก้ HTML หรืออัปโหลดไฟล์ที่ build เอง

เพิ่มหน้าได้ผ่าน **Add file → Create new file** แล้วเพิ่มชื่อใน `_toc.yml` ตามตัวอย่างด้านบน เปลี่ยนรูปด้วยการอัปโหลดเข้า `assets/images/` แล้วแก้ค่า `logo` ใน `_config.yml`

ถ้าดาวน์โหลด source จาก GitHub ให้รัน `npm install` แล้ว `npm run build` ก่อนเปิด `index.html` เพราะไฟล์เว็บที่สร้างอัตโนมัติไม่ได้เก็บใน Git หากต้องการเฉพาะไฟล์สำหรับโฮสต์ ใช้ `npm run build:pages` แล้วนำโฟลเดอร์ `_site/` ไปใช้

รายละเอียดโดเมน QuantCorner และการเผยแพร่อยู่ใน [DEPLOYMENT.md](DEPLOYMENT.md)

## Notebook

เปิด `notebooks/random-assets.ipynb` ด้วย Jupyter หรือ VS Code แล้วแก้โค้ดได้โดยตรง หากต้องการสร้าง Notebook ใหม่จากเนื้อหาเว็บ ใช้ Python ที่มี NumPy รัน `make_notebook.py` คำสั่งนี้จะเขียนทับ Notebook ที่สร้างไว้ จึงควรเก็บสำเนาการทดลองของคุณในชื่อใหม่ก่อน

สำหรับ Binomial Model ใช้ `python3 scripts/make_binomial_notebook.py` เพื่อสร้าง `notebooks/binomial-model.ipynb` จาก `binomial-model.md` และรันเซลล์ตัวอย่างด้วย Python standard library หลังแก้เนื้อหาบทนี้ให้รันคำสั่งอีกครั้งเพื่อให้ข้อความ สมการ ภาพ และผลคำนวณตรงกัน คำสั่งเขียนทับเฉพาะ Notebook ชื่อนี้

สำหรับ Transition Density Functions ใช้ `python3 scripts/make_transition_density_notebook.py` เพื่อสร้าง `notebooks/transition-density-functions.ipynb` จาก Markdown ของบทนี้และรันโค้ดด้วย Python standard library คำสั่งเขียนทับเฉพาะ Notebook ชื่อนี้ ให้รันอีกครั้งหลังแก้บทหรือภาพประกอบ และเก็บการทดลองส่วนตัวไว้ในชื่อไฟล์อื่น

สำหรับ Applied Stochastic Calculus ใช้ `python3 scripts/make_stochastic_calculus_notebook.py` เพื่อสร้าง `notebooks/applied-stochastic-calculus.ipynb` จาก Markdown ของบทนี้และรันตัวอย่าง คำสั่งเขียนทับเฉพาะ Notebook ชื่อนี้ ให้รันอีกครั้งหลังแก้บทเรียนหรือสมการ ตัวสุ่ม Python และ JavaScript ระบุ seed และวิธีของตนเอง จึงไม่จำเป็นต้องให้เส้นทางเหมือนกันข้ามภาษา

## สร้าง Notebook ของ Black-Scholes Model

เมื่อแก้ `black-scholes-model.md` ให้รัน `python3 scripts/make_black_scholes_notebook.py` เพื่อสร้าง Notebook จากเนื้อหาปัจจุบันและรันเซลล์ด้วย Python standard library ตรวจราคา, Greeks, parity, risk-neutral Monte Carlo และ Delta hedge แบบ self-financing โค้ดใน Notebook ใช้ seed ของตนเองที่ระบุไว้ จึงไม่จำเป็นต้องได้เส้นทางเดียวกับห้องทดลอง JavaScript

ตรวจด้วย `npm run build:pages`, `npm test` และ `node qa/black-scholes-browser.cjs` ขณะเปิด preview ที่พอร์ต 8763 ห้องทดลองใช้หุ้นไม่มีปันผล European Call/Put และดอกเบี้ยทบต้นต่อเนื่อง หากเปลี่ยนขอบเขตนี้ต้องแก้ข้อความ สมการ และ Notebook ให้ตรงกันด้วย

## แก้บท Portfolio Theory

เนื้อหาอยู่ใน `portfolio-theory.md` ห้องทดลองอยู่ใน `src/portfolio.jsx` และสูตรอยู่ใน `src/portfolio.mjs` รูปกราฟทั้งสี่สร้างจาก `scripts/make_portfolio_figures.py` และเก็บเป็น SVG ใน `assets/images/` แก้สมมติฐานผ่านสคริปต์แล้วสร้างรูปใหม่ เพื่อให้เส้นกราฟและป้ายตัวเลขตรงกัน

หลังแก้บทนี้ รัน `python3 scripts/make_portfolio_notebook.py` เพื่อสร้างและรัน `notebooks/portfolio-theory.ipynb` จากเนื้อหาล่าสุด คำสั่งเขียนทับเฉพาะ Notebook ชื่อนี้ จากนั้นตรวจด้วย `npm run build:pages`, `npm test` และ `node qa/portfolio-browser.cjs` ขณะเปิด preview ที่พอร์ต 8763

เปิด `portfolio-theory.html` ในโฟลเดอร์หลักหรือผ่าน preview เพื่อดูงานในเครื่อง การ build ไม่ได้อัปโหลดเว็บ ต้อง commit และ push แยกต่างหากเมื่อพร้อมเผยแพร่

## แก้บท Optimization Problem และ Black–Litterman

เนื้อหาอยู่ใน `portfolio-optimization.md` และ `black-litterman.md` สูตรคำนวณและห้องทดลองอยู่ใน `src/portfolio-optimization.mjs` กับ `src/portfolio-optimization.jsx` ภาพเชิงคำนวณ 13 ภาพสร้างจาก `scripts/make_portfolio_optimization_figures.py` และเก็บ SVG ไว้ใน `assets/images/` ส่วน Black–Litterman roadmap เป็นภาพที่ 14 และมี source ที่แก้ไขต่อได้ใน `assets/diagrams/optimization-black-litterman-roadmap.excalidraw`

หลังแก้บทหรือสมการ รัน `python3 scripts/make_portfolio_optimization_figures.py` และ `python3 scripts/make_portfolio_optimization_notebook.py` เพื่อให้ภาพกับ Notebook ตรงกับหน้าเว็บ จากนั้นตรวจด้วย `npm run build:pages`, `npm test`, `node qa/portfolio-optimization-browser.cjs` และ `node qa/portfolio-optimization-page-checks.cjs` ขณะเปิด preview ที่พอร์ต 8763 ตัวเลขสี่สินทรัพย์และ views เป็นข้อมูลสมมติ ห้ามนำ PDF ต้นฉบับหรือภาพหน้าสไลด์เข้า repository

## หน้า Black–Litterman ที่แยกออกมา

`portfolio-optimization.md` ครอบคลุมเครื่องมือ optimization ส่วน `black-litterman.md` ครอบคลุม prior, views, posterior และห้องทดลองที่ mount ด้วย `black-litterman-lab` สารบัญและ glossary เชื่อมสองหน้าแยกกัน

ภาพทั้ง 14 ภาพออกแบบใหม่จาก inputs เดิม: รัน `python3 scripts/make_portfolio_optimization_figures.py` สำหรับ 13 ภาพเชิงคำนวณ และ `python3 scripts/render_optimization_roadmap.py` สำหรับ roadmap จาก Excalidraw จากนั้น `python3 scripts/make_portfolio_optimization_notebook.py` จะสร้างและรัน Notebook ทั้งสองเล่มแยก namespace กัน

สองหน้านี้ตั้ง `inline_math: true` ใน frontmatter เพื่อเรนเดอร์สมการในบรรทัดที่เขียนด้วย `\( ... \)` ผ่าน KaTeX เช่นเดียวกับสมการ display `$$ ... $$`

ห้องทดลองเสริมรอบ 2026-09-18 อยู่ใน `src/optimization-learning.jsx` (constraint geometry, target portfolio, estimation burden) และ `src/learning-charts.jsx` (กราฟน้ำหนักที่รองรับค่าติดลบ) ตัวคำนวณอยู่ใน `src/portfolio-optimization.mjs` ส่วน Black–Litterman ใน `src/portfolio-optimization.jsx` รองรับการเปิด/ปิด views, Q และ Ω แยกข้อ โดย λ ตลาดคงที่และ λ ผู้ลงทุนปรับได้

ชื่อแสดงผลของบทเดิมคือ **Optimization Problem** แต่ชื่อไฟล์และ URL `portfolio-optimization` คงเดิมเพื่อรักษาลิงก์ การตรวจเพิ่มเติมใช้ `node qa/portfolio-learning-browser.cjs` พร้อม preview port 8763 และ `node qa/portfolio-optimization-page-checks.cjs` สำหรับ offline pages ภาพบุคคลมีเครดิตใน `THIRD_PARTY_NOTICES.md` และ provenance ของแต่ละบท

สำหรับ VaR/ES ใช้ `python3 scripts/make_tail_risk_figures.py` สร้างกราฟ SVG และ `python3 scripts/make_tail_risk_notebook.py` สร้างพร้อมรัน Notebook จากต้นฉบับ Markdown ใช้ Python standard library ตรวจตัวทดลองและหน้าเว็บด้วย `node qa/tail-risk-page-checks.cjs` ขณะเปิด preview ที่พอร์ต 8763 สูตรตรวจรวมอยู่ใน `npm test`

## แก้บท Asset Returns — Empirical Stylized Facts

เนื้อหาอยู่ใน `asset-returns-stylized-facts.md` ตัวทดลองอยู่ใน `src/stylized-facts.jsx` และตัวคำนวณอยู่ใน `src/stylized-facts.mjs` ส่วน `scripts/stylized_facts_math.py` เป็นการคำนวณ Python ที่ใช้กับภาพและ Notebook โดยตรวจผลเทียบ JavaScript ใน `qa/stylized-facts-checks.mjs`

หลังแก้เนื้อหาหรือสูตร รัน `python3 scripts/make_stylized_facts_figures.py` แล้ว `python3 scripts/make_stylized_facts_notebook.py` เพื่อสร้าง Notebook จาก Markdown และฝังภาพล่าสุดพร้อมผลรัน จากนั้นใช้ `npm run build:pages`, `npm test` และ `node qa/stylized-facts-page-checks.cjs` ขณะเปิด preview ที่พอร์ต 8763 ต้องมี Python 3 สำหรับการตรวจผลข้ามภาษา ไม่ต้องติดตั้งแพ็กเกจ Python เพิ่ม กราฟทั้งหมดใช้ข้อมูลสมมติ ห้ามนำ PDF ต้นฉบับเข้า repository

## แก้บท Martingale Pricing

เนื้อหาอยู่ใน `martingale-pricing.md` ห้องทดลองสองส่วนอยู่ใน `src/martingale-pricing.jsx` และสูตรอยู่ใน `src/martingale-pricing.mjs` ใช้กราฟ SVG จากการคำนวณ ตัวอย่างทั้งหมดเป็นสมมติฐาน ห้องทดลอง P/Q ใช้ seed 2532 และ terminal GBM 20,000 ตัวอย่าง โดยวิธีถ่วงน้ำหนักใช้ค่าเฉลี่ย Z × discounted payoff ไม่หารด้วยผลรวมน้ำหนัก

เมื่อแก้บท รัน `python3 scripts/make_martingale_pricing_notebook.py` เพื่อสร้างและรัน Notebook ด้วย Python standard library จากนั้นรัน `npm test`, `npm run build:pages` และ `node qa/martingale-pricing-page-checks.cjs` ขณะเปิด preview พอร์ต 8763 รักษาความแตกต่างของ P/Q, dividend yield ต่อปีกับ yield สะสม, variance กับ volatility และวันหมดอายุ Option กับวันครบกำหนด Futures
