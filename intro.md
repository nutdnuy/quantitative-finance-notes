---
title: Welcome
description: เรียนการเงินเชิงปริมาณภาษาไทย จากความสุ่มของสินทรัพย์ถึง Black–Scholes ผ่านตัวอย่าง สมการ กราฟที่ปรับค่าได้ และ Python Notebook
---

# Welcome

<div class="welcome-hero">
<p class="welcome-kicker">QuantCorner 101 Notes · ภาษาไทย</p>
<div class="welcome-lead">เริ่มเรียน Quant<br>ความสุ่มและราคา Option</div>
<p class="welcome-summary">ทำความเข้าใจการเงินผ่านคณิตศาสตร์และการทดลอง ตั้งแต่ความสุ่มของราคาสินทรัพย์ ไปจนถึงการคิดราคา Option ด้วยแบบจำลอง Black–Scholes</p>
<div class="welcome-actions"><a class="button primary" href="random-assets.html">เริ่มจากบทแรก <span aria-hidden="true">→</span></a><a class="welcome-text-link" href="#lessons">ดูบทเรียนทั้งหมด <span aria-hidden="true">↓</span></a></div>
<p class="welcome-format">ตัวอย่างและสมการ · กราฟที่ปรับค่าได้ · Python Notebook</p>
</div>

## เริ่มจากความสุ่ม

ถ้าให้ผมเลือกจุดเริ่มต้นของการเรียน Quant ผมอยากชวนเริ่มจากคำถามง่าย ๆ ว่า **ถ้าราคาวันพรุ่งนี้ไม่แน่นอน เราจะใช้คณิตศาสตร์ทำความเข้าใจมันได้อย่างไร?**

เราอาจไม่รู้ว่าราคาจะไปทางไหน แต่ยังตั้งคำถามเรื่องผลตอบแทน ความผันผวน และโอกาสของผลลัพธ์ต่าง ๆ ได้ สมุดบันทึกชุดนี้จะค่อย ๆ เชื่อมคำถามเหล่านั้นเข้ากับแบบจำลอง โดยดูทั้งวิธีคิด สมมติฐาน และสิ่งที่แบบจำลองอธิบายได้

<div class="welcome-preparation">
<h3>ก่อนเริ่ม ต้องรู้อะไรบ้าง?</h3>
<p>เริ่มด้วยพีชคณิตและความน่าจะเป็นพื้นฐาน ส่วนบทช่วงหลังจะใช้แคลคูลัสมากขึ้น อ่านคำอธิบายและลองปรับกราฟบนเว็บได้ทันที แล้วค่อยใช้ Python เมื่อต้องการทดลองต่อด้วยตัวเอง</p>
<a class="welcome-text-link" href="glossary.html">เปิดอภิธานศัพท์ประกอบการอ่าน <span aria-hidden="true">→</span></a>
</div>

<h2 id="lessons">เลือกบทเรียน</h2>

หากเพิ่งเริ่ม แนะนำให้อ่านตามลำดับด้านล่าง แต่ละบทต่อยอดแนวคิดจากบทก่อนหน้า หรือเลือกทบทวนหัวข้อที่สนใจได้เลย

<div class="welcome-lessons">
<article class="welcome-lesson">
<span class="welcome-lesson-number" aria-hidden="true">01</span>
<div><p class="welcome-lesson-label">ทำความเข้าใจความสุ่ม</p>
<h3><a href="random-assets.html">พฤติกรรมแบบสุ่มของสินทรัพย์</a></h3>
<p>เมื่อราคาไม่แน่นอน เราจะอธิบายผลตอบแทนและความผันผวนอย่างไร?</p>
<p class="welcome-topics">Returns · Volatility · Random walk · Brownian motion</p>
<a class="welcome-text-link" href="random-assets.html">เปิดบทเรียน →</a></div>
</article>
<article class="welcome-lesson">
<span class="welcome-lesson-number" aria-hidden="true">02</span>
<div><p class="welcome-lesson-label">เริ่มคิดราคา Option</p>
<h3><a href="binomial-model.html">Binomial Model</a></h3>
<p>ถ้าราคาขึ้นหรือลงได้สองทาง เราจะหามูลค่า Option วันนี้อย่างไร?</p>
<p class="welcome-topics">พอร์ตเลียนแบบ · Risk-neutral probability · Backward induction</p>
<a class="welcome-text-link" href="binomial-model.html">เปิดบท Binomial Model →</a></div>
</article>
<article class="welcome-lesson">
<span class="welcome-lesson-number" aria-hidden="true">03</span>
<div><p class="welcome-lesson-label">มองการกระจายของผลลัพธ์</p>
<h3><a href="transition-density-functions.html">Transition Density Functions</a></h3>
<p>จากราคาที่รู้ในวันนี้ โอกาสของราคาต่าง ๆ ในอนาคตเปลี่ยนไปอย่างไร?</p>
<p class="welcome-topics">ความหนาแน่นแบบมีเงื่อนไข · Kolmogorov · Gaussian</p>
<a class="welcome-text-link" href="transition-density-functions.html">เปิดบท Transition Density Functions →</a></div>
</article>
<article class="welcome-lesson">
<span class="welcome-lesson-number" aria-hidden="true">04</span>
<div><p class="welcome-lesson-label">ใช้แคลคูลัสกับความสุ่ม</p>
<h3><a href="applied-stochastic-calculus.html">Applied Stochastic Calculus</a></h3>
<p>เมื่อแบบจำลองมีความสุ่ม กฎการเปลี่ยนตัวแปรต้องเปลี่ยนไปอย่างไร?</p>
<p class="welcome-topics">Itô’s lemma · GBM · Mean reversion · การจำลอง SDE</p>
<a class="welcome-text-link" href="applied-stochastic-calculus.html">เปิดบท Applied Stochastic Calculus →</a></div>
</article>
<article class="welcome-lesson">
<span class="welcome-lesson-number" aria-hidden="true">05</span>
<div><p class="welcome-lesson-label">เชื่อมแบบจำลองกับการป้องกันความเสี่ยง</p>
<h3><a href="black-scholes-model.html">Black-Scholes Model</a></h3>
<p>การปรับพอร์ตเพื่อชดเชยความเสี่ยงเชื่อมไปสู่สูตรราคา Option ได้อย่างไร?</p>
<p class="welcome-topics">Delta hedge · สูตรราคา Call/Put · Greeks · Risk-neutral valuation</p>
<a class="welcome-text-link" href="black-scholes-model.html">เปิดบท Black-Scholes Model →</a></div>
</article>
</div>

## อ่านไป ลองไป

- **ดูความหมายก่อนแทนสูตร** — เริ่มจากตัวอย่างเล็ก ๆ แล้วอธิบายให้ได้ว่าแต่ละตัวแปรหมายถึงอะไร
- **ลองทายก่อนปรับกราฟ** — เปลี่ยนพารามิเตอร์ทีละตัว แล้วดูว่าผลที่ได้ตรงกับที่คิดหรือไม่
- **ทดลองต่อด้วย Python** — ใช้ Notebook ของแต่ละบท เปลี่ยนสมมติฐาน หรือเติมการทดลองของตัวเอง
- **ลองคิดเองก่อนถาม Generative AI** — ให้เวลากับโจทย์และลองเขียนวิธีคิดของตัวเองก่อน แล้วค่อยใช้ AI ช่วยอธิบายจุดที่ติด พร้อมตรวจคำตอบกลับกับสมการและการทดลอง

ไม่จำเป็นต้องเข้าใจทุกอย่างในการอ่านครั้งแรก กลับมาอ่านซ้ำ เปิดอภิธานศัพท์ หรือค้นหาคำที่สงสัย แล้วค่อย ๆ เชื่อมแนวคิดเข้าด้วยกัน

<div class="welcome-resources">
<h3>เริ่มทดลองด้วยตัวเอง</h3>
<p>Notebook บทแรกมีตัวอย่างให้ลองรันและปรับค่า ส่วน Notebook ของบทอื่นดาวน์โหลดได้จากหน้าบทเรียนนั้น</p>
<div class="welcome-download"><a href="notebooks/random-assets.ipynb" download>ดาวน์โหลด Notebook บทแรก</a><a href="random-assets.md" download>ดาวน์โหลด Markdown บทแรก</a></div>
</div>
