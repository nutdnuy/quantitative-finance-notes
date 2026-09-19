---
title: Welcome
description: เรียนการเงินเชิงปริมาณภาษาไทย จากความสุ่มและ Option ไปจนถึง Optimization Problem ผ่านตัวอย่าง สมการ กราฟที่ปรับค่าได้ และ Python Notebook
---

# Welcome

<div class="welcome-hero">
<p class="welcome-kicker">QuantCorner 101 Notes </p>
<div class="welcome-lead">เริ่มเรียน Quant<br>ความสุ่มและราคา Option</div>
<p class="welcome-summary">ทำความเข้าใจการเงินผ่านคณิตศาสตร์และการทดลอง ตั้งแต่ความสุ่มของราคาสินทรัพย์ การคิดราคา Option ไปจนถึงการจัดพอร์ตด้วย Optimization</p>
<div class="welcome-actions"><a class="button primary" href="random-assets.html">เริ่มจากบทแรก <span aria-hidden="true">→</span></a><a class="welcome-text-link" href="#lessons">ดูบทเรียนทั้งหมด <span aria-hidden="true">↓</span></a></div>
<p class="welcome-format">ตัวอย่างและสมการ   Python Notebook</p>
</div>

## เริ่มจากความสุ่ม

ถัาคุณอยากเรียน Quant คุณมาถูกที่แล้วเราพยายาม สร้างองค์ความรู้ ทรัพยากรที่เกี่ยวกับ Quant ให้ทุกคนเข้าถึงได้ง่าย

ถ้าให้ผมนิยาม Quant มันคือศาตร์ที่สร้างแบบจำลองจากกความไม่แน่นอน   ถ้าราคาวันพรุ่งนี้ไม่แน่นอน เราจะใช้คณิตศาสตร์ทำความเข้าใจมันได้อย่างไร?

และนั้นแหละคือพื้นฐานของ Quant

<div class="welcome-preparation">
<h3>ก่อนเริ่ม ต้องรู้อะไรบ้าง?</h3>
<p> ถ้าคุณพอรู้เรื่อง คณิตศาสตร์ การเงิน มาบ้าง ก็คงเดินทางไปกับเราได้ง่ายขึ้น แต่ถ้าใคร ไม่ได้มีพื้นฐานพวกนั้นก็อย่ากังวลกับมันมากเราจะร่วมเดินทางไปด้วยกัน</p>
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
<article class="welcome-lesson">
<span class="welcome-lesson-number" aria-hidden="true">06</span>
<div><p class="welcome-lesson-label">คิดราคาผ่านความน่าจะเป็น</p>
<h3><a href="martingale-pricing.html">Martingale Pricing</a></h3>
<p>ทำไมค่าเฉลี่ยภายใต้ Q จึงให้ราคา Option และการเปลี่ยนมาตรวัดทำงานอย่างไร?</p>
<p class="welcome-topics">Girsanov · Numeraire · Feynman–Kac · Black–76</p>
<a class="welcome-text-link" href="martingale-pricing.html">เปิดบท Martingale Pricing →</a></div>
</article>
<article class="welcome-lesson">
<span class="welcome-lesson-number" aria-hidden="true">07</span>
<div><p class="welcome-lesson-label">จัดพอร์ตจากผลตอบแทนและความเสี่ยง</p>
<h3><a href="portfolio-theory.html">Portfolio Theory</a></h3>
<p>สัดส่วนลงทุนและ correlation เปลี่ยนความเสี่ยงของพอร์ตอย่างไร?</p>
<p class="welcome-topics">Diversification · Efficient frontier · Sharpe ratio · CAPM</p>
<a class="welcome-text-link" href="portfolio-theory.html">เปิดบท Portfolio Theory →</a></div>
</article>
<article class="welcome-lesson">
<span class="welcome-lesson-number" aria-hidden="true">08</span>
<div><p class="welcome-lesson-label">เปลี่ยนเกณฑ์ให้เป็นน้ำหนักพอร์ต</p>
<h3><a href="portfolio-optimization.html">Optimization Problem</a></h3>
<p>เราจะเขียน objective และ constraints อย่างไรให้ optimizer คำนวณพอร์ตได้?</p>
<p class="welcome-topics">Lagrange · OLS/GLS · KKT · Active weights</p>
<a class="welcome-text-link" href="portfolio-optimization.html">เปิดบท Optimization Problem →</a></div>
</article>
<article class="welcome-lesson">
<span class="welcome-lesson-number" aria-hidden="true">09</span>
<div><p class="welcome-lesson-label">ผสมพอร์ตตลาดกับมุมมองของเรา</p>
<h3><a href="black-litterman.html">Black–Litterman Portfolio</a></h3>
<p>จะรวม prior กับ views ที่มีความไม่แน่นอน แล้วนำไปจัดพอร์ตอย่างไร?</p>
<p class="welcome-topics">Reverse optimization · Prior · Views · Posterior</p>
<a class="welcome-text-link" href="black-litterman.html">เปิดบท Black–Litterman Portfolio →</a></div>
</article>
<article class="welcome-lesson">
<span class="welcome-lesson-number" aria-hidden="true">10</span>
<div><p class="welcome-lesson-label">วัดขาดทุนที่ปลายหาง</p>
<h3><a href="value-at-risk-expected-shortfall.html">Value at Risk and Expected Shortfall</a></h3>
<p>พอร์ตอาจขาดทุนเท่าไร และเมื่อขาดทุนเกินเกณฑ์ ความเสียหายเฉลี่ยเป็นเท่าไร?</p>
<p class="welcome-topics">VaR · ES · Historical simulation · Backtesting</p>
<a class="welcome-text-link" href="value-at-risk-expected-shortfall.html">เปิดบท VaR และ ES →</a></div>
</article>
<article class="welcome-lesson">
<span class="welcome-lesson-number" aria-hidden="true">11</span>
<div><p class="welcome-lesson-label">อ่านพฤติกรรมจากข้อมูลผลตอบแทน</p>
<h3><a href="asset-returns-stylized-facts.html">Asset Returns — Empirical Stylized Facts</a></h3>
<p>ทิศทางผลตอบแทนสัมพันธ์กันน้อย แล้วทำไมวันที่แกว่งแรงจึงมักอยู่ติดกัน?</p>
<p class="welcome-topics">Fat tails · Volatility clustering · ACF · Realized volatility</p>
<a class="welcome-text-link" href="asset-returns-stylized-facts.html">เปิดบท Asset Returns →</a></div>
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
