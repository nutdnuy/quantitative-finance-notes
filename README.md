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
transition-density-functions.md  ความหนาแน่นการเปลี่ยนสถานะและสมการ Kolmogorov
applied-stochastic-calculus.md  Itô’s lemma การแปลงแบบจำลองและการจำลอง SDE
black-scholes-model.md         Delta hedge, สูตรราคาและ Greeks ของ Black–Scholes
martingale-pricing.md          การเปลี่ยนมาตรวัด, Girsanov, numeraire, Feynman–Kac และ Black–76
portfolio-theory.md            การจัดพอร์ต Mean–Variance, Sharpe ratio, CAPM และ factor models
portfolio-optimization.md      Optimization, OLS/GLS, Lagrange, KKT และ active portfolio
black-litterman.md             Prior, views, posterior และห้องทดลอง Black–Litterman
numerical-methods.md           Monte Carlo, explicit finite difference และเสถียรภาพของกริด
glossary.md                    อภิธานศัพท์ร่วมของซีรีส์
AGENTS.md                      แนวทางทำงานสำหรับ AI ในโปรเจกต์นี้
_config.yml                    ชื่อเว็บ ผู้เขียน รูป และลิงก์ repository
_toc.yml                       สารบัญและลำดับหน้า
templates/new-topic.md         แม่แบบเพิ่มหัวข้อ
notebooks/random-assets.ipynb  Python Notebook
notebooks/binomial-model.ipynb  Python Notebook ของบท Binomial Model
notebooks/transition-density-functions.ipynb  Python Notebook ของบท Transition Density Functions
notebooks/applied-stochastic-calculus.ipynb  Python Notebook ของบท Applied Stochastic Calculus
notebooks/black-scholes-model.ipynb  Python Notebook ของบท Black-Scholes Model
notebooks/portfolio-optimization.ipynb  Python Notebook ของบท Optimization Problem
notebooks/black-litterman.ipynb  Python Notebook ของบท Black–Litterman Portfolio
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

บท **Martingale Pricing** ต่อจาก Black–Scholes ใช้เอกสาร *Martingales Theory: Application to Option Pricing — Black-Scholes All Over Again* ที่ผู้ใช้ให้มา อธิบาย self-financing, P/Q, Girsanov, numeraire และ Feynman–Kac ก่อนขยายไป continuous dividends, deterministic term structures และ Black–76 พร้อมห้องทดลองสองส่วนและตัวอย่างสมมติที่คำนวณใหม่ รายละเอียดและการแก้สมการต้นฉบับอยู่ใน `data/martingale-pricing-provenance.json` ไม่เผยแพร่ PDF ต้นฉบับ

สร้างและรัน Notebook ด้วย `python3 scripts/make_martingale_pricing_notebook.py` ใช้ Python standard library; ตรวจตัวเลขด้วย `npm test` และตรวจ responsive, interactions, glossary, accessibility และ offline ด้วย `node qa/martingale-pricing-page-checks.cjs` ขณะเปิด preview พอร์ต 8763

บท **Introduction to Numerical Methods** ใช้เอกสารชื่อเดียวกันใน *JA253.4 Notes.pdf* ที่ผู้ใช้ให้มา เชื่อม risk-neutral Monte Carlo กับ explicit finite difference มีห้องทดลอง 2 ส่วน กราฟ SVG ที่คำนวณใหม่ 3 ภาพ และ Notebook ที่รันได้ด้วย Python standard library ตัวเลขทั้งหมดเป็นสมมติฐาน ไม่เผยแพร่ PDF ต้นฉบับ ดู `data/numerical-methods-provenance.json`

สร้างภาพด้วย `python3 scripts/make_numerical_methods_figures.py` และ Notebook ด้วย `python3 scripts/make_numerical_methods_notebook.py` ตรวจสูตรผ่าน `npm test` และหน้าเว็บด้วย `node qa/numerical-methods-page-checks.cjs` ขณะเปิด preview ที่พอร์ต 8763

บท **Optimization Problem และ Black–Litterman** ต่อจาก Portfolio Theory ใช้เอกสาร *Fundamentals of Optimization and Application to Portfolio Selection* ที่ผู้ใช้ให้มาเป็นเส้นเรื่อง ตั้งแต่ objective, gradient/Hessian, OLS/GLS และ Lagrange ไปจนถึง Black–Litterman, KKT และ active portfolio สูตรและตัวเลขที่พิมพ์คลาดในเอกสารต้นทางได้รับการคำนวณใหม่ ตัวอย่างสี่สินทรัพย์เป็นข้อมูลสมมติ ไม่มีชื่อสินทรัพย์หรือช่วงตลาดจริง รายละเอียดอยู่ใน `data/portfolio-optimization-provenance.json`

สร้างภาพ SVG เชิงคำนวณ 13 ภาพด้วย `python3 scripts/make_portfolio_optimization_figures.py` และสร้าง Black–Litterman roadmap อีก 1 ภาพจากไฟล์ Excalidraw ที่แก้ไขต่อได้ สร้างและรัน Notebook ด้วย `python3 scripts/make_portfolio_optimization_notebook.py` ตรวจตัวเลขด้วย `npm test` และตรวจหน้าเว็บด้วย `node qa/portfolio-optimization-browser.cjs` กับ `node qa/portfolio-optimization-page-checks.cjs` ขณะเปิด preview ที่พอร์ต 8763

บท **Portfolio Theory** ต่อจาก Black–Scholes ใช้เอกสาร *An Introduction to Portfolio Theory* ที่ผู้ใช้ให้มา อธิบายผลตอบแทนและความเสี่ยงร่วมกันของพอร์ต พร้อมภาพ SVG ที่คำนวณใหม่ 4 ภาพและห้องทดลองพอร์ตสองสินทรัพย์ ตัวเลขทั้งหมดเป็นสมมติฐาน รายละเอียดแหล่งที่มาและข้อจำกัดอยู่ใน `data/portfolio-provenance.json` โดยไม่มีไฟล์ PDF ต้นฉบับใน repository

สร้างภาพด้วย `python3 scripts/make_portfolio_figures.py` และสร้างพร้อมรัน Notebook ด้วย `python3 scripts/make_portfolio_notebook.py` ใช้ Python standard library ตรวจห้องทดลองด้วย `node qa/portfolio-browser.cjs` ขณะเปิด preview ที่พอร์ต 8763 ไฟล์ HTML คือ `portfolio-theory.html` หลัง build

บท **Black-Scholes Model** ต่อจาก Applied Stochastic Calculus เชื่อม Delta hedge และ self-financing กับ PDE, heat equation, risk-neutral valuation, สูตร Call/Put, Greeks และ American early exercise ใช้เอกสาร *The Black–Scholes Model* ที่ผู้ใช้ให้เป็นเส้นเรื่อง และเพิ่มตัวอย่างสมมติที่ตรวจคำนวณใหม่ ห้องทดลองแยกเป็นราคาและ Delta กับการปรับ hedge บนเส้นทาง GBM ร่วมกัน รายละเอียดอยู่ใน `data/black-scholes-provenance.json` ไม่เผยแพร่ PDF ต้นฉบับ

สร้างและรัน Notebook ด้วย `python3 scripts/make_black_scholes_notebook.py` ใช้ Python standard library; ตรวจตัวเลขด้วย `npm test` และหน้าเว็บด้วย `node qa/black-scholes-browser.cjs` ขณะเปิด preview ที่พอร์ต 8763

บท **Applied Stochastic Calculus** ใช้เส้นเรื่องจากเอกสาร CQF Module 1 Lecture 4 และ Lecture 5 ที่ผู้ใช้ให้ใน `JA251.4 Notes.pdf` และ `JA251.5 Notes.pdf` เชื่อม quadratic variation, Itô’s lemma, GBM/OU, สมการ Kolmogorov และการจำลอง SDE มีห้องทดลอง 3 ส่วน: quadratic variation กับ Itô integral, Euler เทียบ exact GBM บน Brownian path เดียวกัน และ correlated Gaussian increments รายละเอียดสมมติฐานและแหล่งที่มาอยู่ท้ายบทและ `data/stochastic-calculus-provenance.json`

สร้างและรัน Notebook ด้วย `python3 scripts/make_stochastic_calculus_notebook.py` ใช้ Python standard library; ตรวจหน้าเว็บด้วย `node qa/stochastic-calculus-browser.cjs` ขณะเปิด preview ที่พอร์ต 8763

บท **Transition Density Functions** ต่อจาก Binomial Model อ้างอิงเอกสารชื่อเดียวกันที่ผู้ใช้ให้ใน `JU241.3 Notes.pdf` อธิบายการเดินสุ่มสามทาง ความหนาแน่นแบบมีเงื่อนไข Forward/Backward Kolmogorov และ Gaussian พร้อมห้องทดลองพื้นที่ใต้โค้งและการย่อ step ที่คงความแปรปรวน ดูขอบเขตและแหล่งที่มาในท้ายบทและ `data/transition-density-provenance.json`

สร้างและรัน Notebook ด้วย `python3 scripts/make_transition_density_notebook.py` ใช้ Python standard library; ตรวจหน้าเว็บด้วย `node qa/transition-density-browser.cjs` ขณะเปิด preview ที่พอร์ต 8763

บท **Binomial Model** ต่อจากบทความสุ่ม ครอบคลุมพอร์ตเลียนแบบ ดอกเบี้ย risk-neutral probability ต้นไม้หลายช่วงเวลา และ backward induction อ้างอิงเอกสาร *Binomial Model* ของหลักสูตร Certificate in Quantitative Finance ที่ผู้ใช้ให้มา พร้อมตัวอย่างสอง step และห้องทดลอง Call/Put ที่คำนวณขึ้นใหม่ ดูขอบเขตแหล่งที่มาในท้ายบทและ `data/binomial-provenance.json` ไม่รวม PDF ต้นฉบับไว้ใน repository

สร้างและรัน Notebook บทนี้ด้วย `python3 scripts/make_binomial_notebook.py` ใช้เฉพาะ Python standard library; ตรวจห้องทดลองด้วย `node qa/binomial-browser.cjs` ขณะเปิด preview ที่พอร์ต 8763

เนื้อหาเรื่องความสุ่มของสินทรัพย์มีส่วนที่แปลและเรียบเรียงจาก *Paul Wilmott on Quantitative Finance*, second edition (2006), chapter 3, printed pp. 55–70 จาก PDF ที่ผู้ใช้ให้มา ฉบับนี้เปิดด้วยแนวคิดของ Bachelier (1900) เพิ่มพื้นฐาน Option และตัวอย่างใหม่ก่อน Jensen’s inequality และตัดส่วนทดลองบนสเปรดชีตออก แหล่งอ้างอิงอยู่ท้ายบทเรียน ข้อมูลประวัติศาสตร์และตัวอย่างที่ยังใช้จากหนังสือคงตัวเลขเดิม ส่วน exact GBM เป็นภาคทดลองเพิ่มเติม

ตาราง Perez Companc มีราคา 34 จุดและผลตอบแทนคำนวณกลับ 33 ค่า แยกจากสถิติที่หนังสือรายงานสำหรับอนุกรมเต็ม รายละเอียดใน `data/provenance.json`

ภาพปกใช้โลโก้ QuantCorner และ Quantsera ต้นฉบับบนพื้นหลังสีดำ จัดวางด้วย HTML/CSS และเก็บไฟล์โลโก้แยกกันใน `assets/images/` รายละเอียดไฟล์และ SHA-256 อยู่ใน `data/brand-cover-provenance.json` ภาพเส้นทางสุ่มเดิม `welcome-paths.png` เป็นงานภาพเชิงแนวคิดที่สร้างด้วย Image Generator และไม่ได้ใช้เป็นภาพปกปัจจุบัน

Notebook ใช้ Python 3, NumPy และ Jupyter/IPython ถ้ารัน `make_notebook.py` จะสร้าง Notebook ใหม่จากเนื้อหาเว็บ รันเซลล์โค้ด และรายงานจำนวนเซลล์กับกราฟที่สร้างได้ คำสั่งนี้เขียนทับไฟล์ Notebook ที่สร้างไว้

ดูที่มาและใบอนุญาตแยกตามส่วนใน [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) แหล่งอ้างอิงและผลงานของบุคคลที่สามยังอยู่ภายใต้สิทธิ์เดิมของเจ้าของ ไม่มีการให้ใบอนุญาตใหม่ครอบคลุมทั้ง repository

## หน้า Black–Litterman ที่แยกออกมา

`portfolio-optimization.md` ครอบคลุมเครื่องมือ optimization ส่วน `black-litterman.md` ครอบคลุม prior, views, posterior และห้องทดลองที่ mount ด้วย `black-litterman-lab` สารบัญและ glossary เชื่อมสองหน้าแยกกัน

ภาพทั้ง 14 ภาพออกแบบใหม่จาก inputs เดิม: รัน `python3 scripts/make_portfolio_optimization_figures.py` สำหรับ 13 ภาพเชิงคำนวณ และ `python3 scripts/render_optimization_roadmap.py` สำหรับ roadmap จาก Excalidraw จากนั้น `python3 scripts/make_portfolio_optimization_notebook.py` จะสร้างและรัน Notebook ทั้งสองเล่มแยก namespace กัน

## Value at Risk and Expected Shortfall

`value-at-risk-expected-shortfall.md` ต่อจาก Black–Litterman โดยอธิบาย quantile ของขาดทุน, coherent risk, Normal VaR/ES, historical simulation, Monte Carlo, time scaling, Q–Q diagnostics, พอร์ตสามสินทรัพย์ และ backtesting มีตัวทดลองสามชุดกับกราฟ SVG สามภาพที่คำนวณขึ้นใหม่ ใช้ข้อมูลสมมติทั้งหมด

รัน `python3 scripts/make_tail_risk_figures.py` และ `python3 scripts/make_tail_risk_notebook.py` เพื่อสร้างภาพและ Notebook พร้อมผลรัน Python standard library ตรวจเว็บด้วย `node qa/tail-risk-page-checks.cjs` รายละเอียดแหล่งที่มาและข้อแก้ไขจากเอกสารอ้างอิงอยู่ใน `data/tail-risk-provenance.json` ไม่มีการเผยแพร่ PDF หรือ workbook ต้นฉบับ

## Asset Returns — Empirical Stylized Facts

`asset-returns-stylized-facts.md` ต่อจาก VaR/ES โดยตรวจสมมติฐานของผลตอบแทนผ่าน volatility clustering, ACF, fat tails, variance mixtures, intraday seasonality และ realized variance มีตัวทดลองสามชุด ภาพ SVG สามภาพ และ Notebook ที่รันได้ด้วย Python standard library กราฟและตัวทดลอง clustering ใช้ราคาปิด S&P 500 จริงช่วง 1999–2018 จาก Yahoo Finance ผ่าน arch 8.0.0 ส่วน mixture และข้อมูลระหว่างวันยังเป็นตัวอย่างสมมติที่ระบุ seed

สร้างภาพด้วย `python3 scripts/make_stylized_facts_figures.py` และสร้างพร้อมรัน Notebook ด้วย `python3 scripts/make_stylized_facts_notebook.py` ตรวจตัวเลขด้วย `npm test` (ใช้ Node.js และ Python 3 เพื่อตรวจผลข้ามภาษา) และหน้าเว็บด้วย `node qa/stylized-facts-page-checks.cjs` ขณะเปิด preview ที่พอร์ต 8763 แหล่งที่มาอยู่ใน `data/stylized-facts-provenance.json`

## Regulation and Basel III / IV

บท `regulation-basel.md` เชื่อมงบดุลและเหตุผลกำกับกับเงินกองทุน RWA, leverage, output floor, LCR/NSFR และแบบจำลองเครดิต ASRF/IRB ใช้เอกสาร *Regulation and Basel III / IV* ของ Jon Gregory (4 มีนาคม 2025) เป็นเส้นเรื่อง พร้อมตรวจนิยามกับมาตรฐาน BIS และคำนวณตัวอย่างใหม่ ข้อมูลธนาคารทั้งหมดเป็นสมมติ รายละเอียดอยู่ใน `data/basel-provenance.json` ไม่มี PDF ต้นฉบับใน repository

สร้างกราฟด้วย `python3 scripts/make_basel_figures.py` และสร้างพร้อมรัน Notebook ด้วย `python3 scripts/make_basel_notebook.py` ใช้ Python standard library ตัวทดลองสามส่วนอยู่ใน `src/basel.jsx` และสูตรอยู่ใน `src/basel.mjs` ตรวจด้วย `npm test`, `npm run build:pages` และ `node qa/basel-page-checks.cjs` ขณะเปิด preview ที่พอร์ต 8763


## Exotic Options

บท `exotic-options.md` เรียบเรียงจาก *Exotic Options* ในเอกสารที่ผู้ใช้ให้มา เชื่อมเงื่อนไขสัญญา Asian/Barrier/Lookback กับ Monte Carlo, integral-state PDE และกฎอัปเดตในวัน fixing มีห้องทดลองสองส่วน กราฟคำนวณสามภาพ และ Notebook ที่รันแล้ว ตัวเลขทั้งหมดเป็นข้อมูลสมมติ ไม่มี PDF ต้นฉบับใน repository รายละเอียดอยู่ใน `data/exotic-options-provenance.json`

สร้างภาพด้วย `python3 scripts/make_exotic_options_figures.py` และ Notebook ด้วย `python3 scripts/make_exotic_options_notebook.py` ตรวจสูตรด้วย `npm test` และหน้าเว็บด้วย `node qa/exotic-options-page-checks.cjs` ขณะเปิด preview ที่พอร์ต 8763


## Know Your Weapon — Option Greeks

`option-greeks.md` ต่อยอด Black–Scholes ด้วย generalized carry, Greek units, Delta/strike conventions, higher Greeks, numerical derivatives, probability และ smile risk โดยเรียบเรียงจากเอกสาร *Know Your Weapon* ของ Espen Haug ที่ผู้ใช้ให้ ตัวเลขและกราฟทั้งหมดคำนวณใหม่จากสมมติฐาน รายละเอียดการตรวจแก้สูตรต้นทางอยู่ใน `data/option-greeks-provenance.json` ไม่เผยแพร่ PDF ต้นฉบับ

ใช้ `python3 scripts/make_option_greeks_figures.py` สร้าง SVG 3 ภาพ และ `python3 scripts/make_option_greeks_notebook.py` สร้างพร้อมรัน Notebook แบบ self-contained ตรวจสูตรด้วย `node qa/option-greeks-checks.mjs` และหน้าเว็บด้วย `node qa/option-greeks-page-checks.cjs` ขณะเปิด preview พอร์ต 8763

## Prices and Returns / Stochastic Processes / Stylized Facts

`prices-and-returns.md`, `stochastic-processes.md` และ `asset-returns-stylized-facts.md` ครอบคลุม 31 หัวข้อของสารบัญ Taylor บท 2–4 โดยเรียบเรียงใหม่ ใช้ตัวอย่างสมมติร่วมกับข้อมูล S&P 500 จริงในส่วน clustering และเก็บตารางจับคู่ใน `data/return-foundations-provenance.json`

สูตรและห้องทดลองใหม่อยู่ใน `src/return-foundations.mjs` และ `src/return-foundations.jsx` สร้างภาพด้วย `python3 scripts/make_return_foundations_figures.py` สร้างและรัน Notebook ด้วย `python3 scripts/make_return_foundations_notebooks.py` และ `python3 scripts/make_stylized_facts_notebook.py` ตรวจด้วย `npm test`, `npm run build:pages`, `node qa/return-foundations-page-checks.cjs` และ `node qa/stylized-facts-page-checks.cjs` ขณะเปิด preview พอร์ต 8763
