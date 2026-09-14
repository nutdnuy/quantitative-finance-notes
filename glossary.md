---
title: อภิธานศัพท์
description: ศัพท์ที่ใช้ในบทเรียน Quant พร้อมความหมายภาษาไทยและตัวอย่างที่ย้อนกลับไปอ่านได้
---

# อภิธานศัพท์

หน้านี้รวมศัพท์ที่เราใช้ในบทเรียน **พฤติกรรมแบบสุ่มของสินทรัพย์**, **Binomial Model**, **Transition Density Functions** และ **Applied Stochastic Calculus** เอาไว้เปิดเทียบระหว่างอ่าน แต่ละคำมีลิงก์กลับไปดูตัวอย่างและการทดลองที่เกี่ยวข้อง

<div class="glossary-search" hidden>
<label for="glossary-query">ค้นหาคำศัพท์</label>
<input id="glossary-query" type="search" placeholder="เช่น ความผันผวน, payoff หรือ GBM" autocomplete="off" aria-describedby="glossary-status">
<p id="glossary-status" role="status" aria-live="polite"></p>
</div>

<section class="glossary-group" id="group-analysis">

## แนวทางการวิเคราะห์

<section class="glossary-term" id="quantitative-finance">

### Quantitative finance — การเงินเชิงปริมาณ

การใช้คณิตศาสตร์ สถิติ และข้อมูลเพื่อศึกษาโจทย์ทางการเงิน เช่น ประเมินราคาสัญญา อธิบายความเสี่ยง หรือจัดพอร์ต ในบทนี้เราเริ่มจากคำถามว่า เมื่อราคาในอนาคตไม่แน่นอน เราจะสร้างแบบจำลองและประเมินมูลค่าของ Option ได้อย่างไร

[ดูในบทเรียน](random-assets.html#introduction)

</section>
<section class="glossary-term" id="fundamental-analysis">

### Fundamental analysis — การวิเคราะห์ปัจจัยพื้นฐาน

การศึกษาธุรกิจและปัจจัยที่กำหนดมูลค่า เช่น รายได้ ต้นทุน หนี้ และความสามารถในการแข่งขัน เพื่อประเมินว่ากิจการควรมีมูลค่าเท่าไร มูลค่าที่ประเมินได้ขึ้นกับสมมติฐาน และไม่ได้บอกโดยตัวมันเองว่าราคาตลาดจะปรับเข้าหามูลค่านั้นเมื่อไร

[ดูในบทเรียน](random-assets.html#analysis)

</section>
<section class="glossary-term" id="technical-analysis">

### Technical analysis — การวิเคราะห์ทางเทคนิค

การวิเคราะห์ข้อมูลที่เกิดขึ้นในตลาด เช่น ราคา ปริมาณซื้อขาย แนวโน้ม และรูปแบบการเคลื่อนไหว เพื่อนำมาประกอบการตัดสินใจ หากจะใช้รูปแบบใดคาดการณ์ราคา เราต้องกำหนดกติกาให้ชัดและทดสอบกับข้อมูลที่เหมาะสมด้วย

[ดูในบทเรียน](random-assets.html#analysis)

</section>
<section class="glossary-term" id="quantitative-analysis">

### Quantitative analysis — การวิเคราะห์เชิงปริมาณ

การเปลี่ยนคำถามให้วัดและตรวจสอบได้ แล้วใช้ข้อมูลและแบบจำลองหาคำตอบ เช่น พอร์ตมีโอกาสขาดทุนเท่าไร หรือราคา Option ควรเปลี่ยนอย่างไรเมื่อความผันผวนเพิ่มขึ้น คำตอบจึงต้องอ่านคู่กับสมมติฐานของแบบจำลองเสมอ

[ดูในบทเรียน](random-assets.html#analysis)

</section>

</section>

<section class="glossary-group" id="group-options">

## Option และเงินที่สัญญาจ่าย

<section class="glossary-term" id="option">

### Option — ออปชัน

สัญญาที่ให้ผู้ถือมี **สิทธิ แต่ไม่มีข้อผูกมัดว่าต้องใช้สิทธิ** ในการซื้อหรือขายสินทรัพย์ตามราคาและเงื่อนไขที่ตกลงกัน ผู้ซื้อจ่าย premium เพื่อได้สิทธินี้ ส่วนผู้ขายมีหน้าที่ทำตามสัญญาเมื่อมีการใช้สิทธิ

[ดูในบทเรียน](random-assets.html#options)

</section>
<section class="glossary-term" id="call-option">

### Call option — สิทธิซื้อ

Option ที่ให้สิทธิซื้อสินทรัพย์ตามราคาใช้สิทธิ K ส่วน payoff เมื่อถึงวันหมดอายุต่อหนึ่งหน่วยของ Call เท่ากับ **max(S_T − K, 0)** เช่น หุ้นราคา 160 บาทและ K = 120 บาท สิทธินี้มี payoff 40 บาท

[ดูในบทเรียน](random-assets.html#options)

</section>
<section class="glossary-term" id="put-option">

### Put option — สิทธิขาย

Option ที่ให้สิทธิขายสินทรัพย์ตามราคาใช้สิทธิ K ส่วน payoff เมื่อถึงวันหมดอายุต่อหนึ่งหน่วยของ Put เท่ากับ **max(K − S_T, 0)** เช่น มีสิทธิขายที่ 120 บาทในวันที่หุ้นเหลือ 90 บาท สิทธินี้มี payoff 30 บาท

[ดูในบทเรียน](random-assets.html#options)

</section>
<section class="glossary-term" id="european-option">

### European option — ออปชันที่ใช้สิทธิได้เมื่อหมดอายุ

Option ที่กำหนดให้ใช้สิทธิได้เฉพาะวันหมดอายุ ชื่อ European บอกเงื่อนไขการใช้สิทธิของสัญญา ไม่ได้หมายถึงประเทศที่ซื้อขาย ตัวอย่าง Call ในบทนี้ใช้เงื่อนไขแบบนี้

[ดูในบทเรียน](random-assets.html#options)

</section>
<section class="glossary-term" id="strike-price">

### Strike price — ราคาใช้สิทธิ

ราคาที่ตกลงไว้ในสัญญาสำหรับซื้อหรือขายสินทรัพย์เมื่อใช้สิทธิ มักเขียนแทนด้วย K ตัวอย่างสิทธิซื้อหุ้นที่ 120 บาทมี K = 120 บาท ซึ่งเป็นคนละจำนวนกับ premium ที่จ่ายเพื่อซื้อ Option

[ดูในบทเรียน](random-assets.html#options)

</section>
<section class="glossary-term" id="maturity">

### Expiration / maturity — วันหมดอายุ

วันที่สัญญาสิ้นสุดตามเงื่อนไข มักใช้ T แทนเวลานี้ และ S_T แทนราคาสินทรัพย์ ณ วันนั้น ในตัวอย่างหนึ่งวัน เราประเมินราคา Call วันนี้จากสิ่งที่สัญญาจะจ่ายเมื่อหมดอายุพรุ่งนี้

[ดูในบทเรียน](random-assets.html#options)

</section>
<section class="glossary-term" id="premium">

### Premium — ราคาออปชัน

เงินที่ผู้ซื้อจ่ายเพื่อได้สิทธิใน Option เช่น 8 บาทในตัวอย่างสิทธิซื้อหุ้นที่ 120 บาท เงินนี้จ่ายไปแล้วแม้สุดท้ายจะไม่ใช้สิทธิ จึงต้องนำมาคิดด้วยเมื่อหากำไรหรือขาดทุน

[ดูในบทเรียน](random-assets.html#options)

</section>
<section class="glossary-term" id="payoff">

### Payoff — ผลลัพธ์ของสัญญา ณ วันสิ้นสุด

มูลค่าที่สัญญาให้ตามผลลัพธ์ ณ วันสิ้นสุด **ยังไม่ใช่กำไรสุทธิและไม่ใช่ราคา Option วันนี้** เช่น Call มี payoff 40 บาท แต่ซื้อมา 8 บาท กำไรก่อนค่าธรรมเนียมและก่อนคิดมูลค่าเงินตามเวลาคือ 32 บาท

[ดูในบทเรียน](random-assets.html#options)

</section>

</section>

<section class="glossary-group" id="group-pricing">

## ความน่าจะเป็นกับการกำหนดราคา

<section class="glossary-term" id="random-variable">

### Random variable — ตัวแปรสุ่ม

ปริมาณที่ค่าของมันขึ้นกับผลลัพธ์ที่ยังไม่แน่นอน เช่น ราคาหุ้นพรุ่งนี้หรือผลตอบแทนหนึ่งวัน เราบอกค่าที่จะเกิดขึ้นจริงล่วงหน้าไม่ได้แน่ ๆ แต่สามารถกำหนดหรือประมาณการแจกแจงความน่าจะเป็นของมันได้

[ดูในบทเรียน](random-assets.html#average)

</section>
<section class="glossary-term" id="expected-value">

### Expected value — ค่าคาดหมาย

ค่าเฉลี่ยที่ถ่วงน้ำหนักด้วยความน่าจะเป็น เช่น ราคา 150 ด้วยโอกาส 0.6 และราคา 50 ด้วยโอกาส 0.4 มีค่าคาดหมาย 110 จำนวนนี้ไม่จำเป็นต้องเป็นผลลัพธ์ที่เกิดขึ้นได้จริง และต้องระบุด้วยว่าใช้ความน่าจะเป็นแบบ p หรือ q

[ดูในบทเรียน](random-assets.html#average)

</section>
<section class="glossary-term" id="jensens-inequality">

### Jensen’s inequality — อสมการของเจนเซน

สำหรับฟังก์ชันนูน f เมื่อค่าคาดหมายที่ใช้มีอยู่ จะได้ **f(E[X]) ≤ E[f(X)]** การแทนราคาเฉลี่ยลงในสูตร payoff จึงอาจให้ค่าน้อยกว่าการคำนวณ payoff ทีละกรณีแล้วค่อยเฉลี่ย: ตัวอย่างในบทให้ 10 เทียบกับ 30 ดอลลาร์

[ดูในบทเรียน](random-assets.html#average)

</section>
<section class="glossary-term" id="hedging">

### Hedging — การป้องกันความเสี่ยง

การประกอบสถานะให้ความเสี่ยงของรายการหนึ่งหักล้างกับอีกรายการหนึ่ง ในตัวอย่าง Call หนึ่งหน่วยกับการชอร์ตหุ้นครึ่งหุ้นให้ภาระสุทธิ −49.5 เท่ากันทั้งสองกิ่ง ผลลัพธ์ที่แน่นอนนี้อาศัยสมมติฐานของแบบจำลอง ไม่ได้หมายความว่าการ hedge ทุกแบบขจัดความเสี่ยงได้ทั้งหมด

[ดูในบทเรียน](random-assets.html#hedging)

</section>
<section class="glossary-term" id="delta">

### Delta / hedge ratio — สัดส่วนหุ้นที่ใช้ป้องกันความเสี่ยง

ในแบบจำลองสองกิ่งของบทนี้ คำนวณได้จาก **ส่วนต่าง payoff ÷ ส่วนต่างราคาหุ้น** จึงได้ (1 − 0) ÷ (101 − 99) = 0.5 และชอร์ตหุ้นครึ่งหุ้นเพื่อ hedge Call ที่ถืออยู่หนึ่งหน่วย โดยทั่วไป Delta ใช้อธิบายความไวของราคา Option ต่อราคาสินทรัพย์อ้างอิง ค่านี้เปลี่ยนได้และไม่ได้เท่ากับ 0.5 เสมอไป

[ดูในบทเรียน](random-assets.html#hedging)

</section>
<section class="glossary-term" id="short-selling">

### Short selling — การขายชอร์ต

การยืมสินทรัพย์มาขายก่อน โดยมีภาระต้องซื้อกลับไปคืนภายหลัง เงินที่รับจากการขายวันนี้จึงไม่ใช่กำไรทั้งหมด ในพอร์ตตัวอย่าง การชอร์ตครึ่งหุ้นที่ราคา 100 รับเงิน 50 แต่ยังต้องนับภาระซื้อหุ้นคืนในวันพรุ่งนี้

[ดูในบทเรียน](random-assets.html#hedging)

</section>
<section class="glossary-term" id="replicating-portfolio">

### Replicating portfolio — พอร์ตเลียนแบบ

พอร์ตที่ให้ผลลัพธ์เหมือนสัญญาเป้าหมายในทุกกรณีที่แบบจำลองกำหนด เช่น ซื้อหุ้นครึ่งหุ้นแล้วกู้ 49.5 ที่ดอกเบี้ย 0% พรุ่งนี้จะเหลือ 1 ถ้าหุ้นเป็น 101 หรือ 0 ถ้าเป็น 99 เหมือน Call ในตัวอย่าง ต้นทุนพอร์ต 50 − 49.5 = 0.5 จึงใช้หาราคา Call แบบ no arbitrage ได้

[ดูในบทเรียน](random-assets.html#hedging)

</section>
<section class="glossary-term" id="arbitrage">

### Arbitrage — โอกาสทำกำไรจากความไม่สอดคล้องของราคา

การจัดรายการซื้อขายที่สร้างกำไรโดยไม่ต้องรับความเสี่ยงขาดทุนหรือใช้เงินลงทุนสุทธิ ตามสมมติฐานการซื้อขายที่กำหนด ตัวอย่างในบทคือเมื่อ Call ขาย 0.6 แต่พอร์ตเลียนแบบมีต้นทุน 0.5 เราสามารถรับส่วนต่าง 0.1 วันนี้และปิดภาระวันพรุ่งนี้ได้ครบทั้งสองกรณี

[ดูในบทเรียน](random-assets.html#hedging)

</section>
<section class="glossary-term" id="no-arbitrage">

### No arbitrage — หลักการไม่มีโอกาสอาร์บิทราจ

เงื่อนไขว่าราคาต้องไม่เปิดโอกาสให้จัดพอร์ตทำ arbitrage ได้ หากสองพอร์ตให้กระแสเงินสดเหมือนกันทุกกรณี และซื้อขายกลับด้านได้ตามสมมติฐาน ทั้งสองพอร์ตต้องมีราคาเท่ากันวันนี้ หลักนี้เป็นเหตุผลที่บังคับให้ Call ในตัวอย่างมีราคา 0.5

[ดูในบทเรียน](random-assets.html#hedging)

</section>
<section class="glossary-term" id="physical-probability">

### Physical probability (p) — ความน่าจะเป็นในโลกจริง

ความน่าจะเป็นที่ใช้อธิบายว่าเหตุการณ์จะเกิดขึ้นบ่อยเพียงใดในโลกจริง ในบทนี้เรา **สมมติ** โอกาสขึ้น p = 0.6 และโอกาสลง 0.4 จึงได้ payoff คาดหมายของ Call หนึ่งวันเป็น 0.6 จำนวนนี้ยังไม่ใช่ราคาที่สอดคล้องกับพอร์ตเลียนแบบ

[ดูในบทเรียน](random-assets.html#hedging)

</section>
<section class="glossary-term" id="risk-neutral-probability">

### Risk-neutral probability (q) — ความน่าจะเป็นสำหรับกำหนดราคา

น้ำหนักความน่าจะเป็น q ที่ทำให้ผลตอบแทนคาดหมายของหุ้นที่ไม่มีเงินปันผลในแบบจำลองสอดคล้องกับอัตราปลอดความเสี่ยง จากนั้นใช้เฉลี่ย payoff และคิดลดเพื่อหาราคา สำหรับหุ้น 100 → 101/99 ที่ดอกเบี้ย 0% เราได้ q = 0.5 ค่านี้ไม่ได้บอกว่าโอกาสขึ้นจริงเปลี่ยนเป็น 50% หรือว่าผู้ลงทุนทุกคนไม่กลัวความเสี่ยง

[ดูในบทเรียน](random-assets.html#hedging)

</section>
<section class="glossary-term" id="risk-aversion">

### Risk aversion — การไม่ชอบความเสี่ยง

ความชอบที่จะรับเงินแน่นอนมากกว่าเงินสุ่มที่มีค่าคาดหมายเท่ากัน เช่น ชอบเงินแน่นอน 100.2 มากกว่าผลลัพธ์ 101/99 ที่มีค่าเฉลี่ย 100.2 เท่ากัน นี่เป็นเรื่องความชอบของผู้ลงทุน ส่วน risk-neutral pricing เป็นวิธีกำหนดราคาในแบบจำลอง ทั้งสองเรื่องจึงไม่ขัดกัน

[ดูในบทเรียน](random-assets.html#hedging)

</section>
<section class="glossary-term" id="risk-free-rate">

### Risk-free rate — อัตราดอกเบี้ยปลอดความเสี่ยง

อัตราผลตอบแทนของเงินที่ไม่มีความไม่แน่นอนในช่วงเวลาที่แบบจำลองกำหนด ตัวอย่างหนึ่งวันใช้ r_d เป็นอัตรา **ตลอดหนึ่งวัน** เช่น r_d = 0.0001 หมายถึง 0.01% ต่อวัน จึงต้องอ่านหน่วยเวลาให้ตรงก่อนนำไปคำนวณ

[ดูในบทเรียน](random-assets.html#hedging)

</section>
<section class="glossary-term" id="discounting">

### Discounting — การคิดลด

การแปลงเงินในอนาคตให้เป็นมูลค่าวันนี้ เช่น ภาระ 49.5 ที่ต้องจ่ายพรุ่งนี้มีมูลค่าปัจจุบัน 49.5 ÷ (1 + r_d) ในตัวอย่างหนึ่งวัน หาก r_d = 0 เงินจำนวนเท่ากันวันนี้และพรุ่งนี้มีมูลค่าเท่ากันในแบบจำลอง

[ดูในบทเรียน](random-assets.html#hedging)

</section>

</section>

<section class="glossary-group" id="group-binomial">

## ต้นไม้ราคาและการปรับพอร์ต

<section class="glossary-term" id="binomial-model">

### Binomial Model — แบบจำลองทวินาม

แบบจำลองเวลาที่แบ่งเป็น step โดยราคาหุ้น ณ แต่ละจุดไปต่อได้สองค่า เช่น คูณด้วย u หรือ d การกำหนดราคา Option ใช้พอร์ตหุ้นร่วมกับเงินฝากหรือเงินกู้ที่เลียนแบบมูลค่าสัญญาในสองกิ่งได้ ภายใต้สมมติฐาน no arbitrage

[ดูในบทเรียน](binomial-model.html#one-step)

</section>

<section class="glossary-term" id="recombining-tree">

### Recombining tree — ต้นไม้ที่กิ่งกลับมารวมกัน

ต้นไม้ที่เส้นทางต่างกันมาถึงสถานะเดียวกันได้ เช่น ขึ้นแล้วลงกับลงแล้วขึ้นให้ราคา S₀ud เท่ากัน เมื่อใช้ตัวคูณ u และ d คงที่ จึงมีราคาปลายทาง N + 1 จุดหลัง N step การรวมกิ่งไม่จำเป็นต้องมี ud = 1

[ดูในบทเรียน](binomial-model.html#two-step)

</section>

<section class="glossary-term" id="backward-induction">

### Backward induction — การคำนวณย้อนกลับ

เริ่มจากมูลค่าที่รู้ ณ ปลายทาง แล้วใช้ค่านั้นหามูลค่าใน step ก่อนหน้า ทำซ้ำจนถึงวันนี้ สำหรับ European Option เริ่มจาก payoff วันหมดอายุ ใช้น้ำหนัก q และ 1 − q แล้วคิดลดทีละ step

[ดูในบทเรียน](binomial-model.html#two-step)

</section>

<section class="glossary-term" id="dynamic-hedging">

### Dynamic hedging — การปรับพอร์ตป้องกันความเสี่ยงตามเวลา

การเปลี่ยนสัดส่วนสินทรัพย์เมื่อเวลาและราคาหุ้นเปลี่ยนไป เช่น ในต้นไม้ Binomial ต้องคำนวณ Delta ใหม่ ณ แต่ละจุดเพื่อเลียนแบบมูลค่า Option ใน step ถัดไป สัดส่วนเดิมที่เลียนแบบได้หนึ่ง step ไม่จำเป็นต้องใช้ได้จนหมดอายุ

[ดูในบทเรียน](binomial-model.html#dynamic-hedging)

</section>

<section class="glossary-term" id="self-financing">

### Self-financing strategy — กลยุทธ์ที่ปรับพอร์ตด้วยเงินภายในพอร์ต

หลังตั้งพอร์ตเริ่มต้น การซื้อสินทรัพย์เพิ่มใช้เงินจากการขายสินทรัพย์อื่นหรือการกู้ภายในพอร์ต โดยไม่มีการเติมหรือถอนเงินจากภายนอก ไม่ได้แปลว่าไม่ใช้เงินเริ่มต้นหรือไม่กู้เงิน

[ดูในบทเรียน](binomial-model.html#dynamic-hedging)

</section>

</section>

<section class="glossary-group" id="group-black-scholes">

## Black–Scholes และความไวของราคา

<section class="glossary-term" id="black-scholes-pde">

### Black–Scholes PDE — สมการราคาของแบล็ก–โชลส์

สมการ Vₜ + ½σ²S²V_SS + rSV_S − rV = 0 สำหรับอนุพันธ์บนหุ้นไม่มีปันผลภายใต้สมมติฐาน Black–Scholes มาจากพอร์ตหุ้นและเงินสดที่เป็น self-financing และเลียนแบบสัญญาได้ ต้องมีเงื่อนไข payoff และขอบเขตเพื่อระบุคำตอบ

[ดูการสร้างสมการ](black-scholes-model.html#hedge-pde)

</section>

<section class="glossary-term" id="risk-neutral-measure">

### Risk-neutral measure — มาตรวัดความน่าจะเป็นสำหรับตั้งราคา

เขียนเป็น ℚ ภายใต้มาตรวัดนี้ราคาสินทรัพย์รวมผลตอบแทนที่ discount อย่างเหมาะสมเป็น martingale ในแบบจำลองมาตรฐาน หุ้นไม่มีปันผลมี drift r และราคา European เป็น e⁻ʳτEᑫ[payoff | ข้อมูลปัจจุบัน] ไม่ใช่การอ้างว่าผลตอบแทนคาดหมายจริงต้องเท่ากับ r

[ดูค่าเฉลี่ยสำหรับตั้งราคา](black-scholes-model.html#risk-neutral)

</section>

<section class="glossary-term" id="put-call-parity">

### Put–call parity — ความสัมพันธ์ระหว่างราคา Call กับ Put

European Call และ Put ที่มี strike และวันหมดอายุเดียวกัน บนหุ้นไม่มีปันผล ให้ C − P = S − Ke⁻ʳτ เมื่อ r ทบต้นต่อเนื่อง เพราะทั้งสองด้านเลียนแบบ payoff S_T − K เดียวกัน ความสัมพันธ์นี้ช่วยตรวจความสอดคล้องของราคา

[ดูเหตุผลจาก payoff](black-scholes-model.html#formula)

</section>

<section class="glossary-term" id="digital-option">

### Digital / Cash-or-nothing option — ออปชันที่จ่ายเงินตามเงื่อนไข

Cash-or-nothing Call จ่ายเงินคงที่ A เมื่อราคาปลายทางเกิน K และจ่ายศูนย์กรณีอื่น สำหรับหุ้นไม่มีปันผลภายใต้ Black–Scholes มีราคา Ae⁻ʳτΦ(d₂) โดย Φ(d₂) เป็นโอกาสของเหตุการณ์นั้นภายใต้ ℚ ต้องกำหนดกรณีราคาเท่ากับ K ตามสัญญา

[ดูการแยก payoff](black-scholes-model.html#formula)

</section>

<section class="glossary-term" id="gamma">

### Gamma — ความไวของ Delta ต่อราคาหุ้น

Γ = ∂²V/∂S² บอกว่า Delta เปลี่ยนเร็วเพียงใดเมื่อราคาหุ้นเปลี่ยน โดยตรึงเวลาและพารามิเตอร์อื่น หุ้นมี Gamma ศูนย์ จึงใช้หุ้นอย่างเดียวหักล้าง Gamma ของ Option ไม่ได้ การเป็น Delta-neutral ยังไม่ใช่ Gamma-neutral

[ดูสูตรและการ hedge](black-scholes-model.html#greeks)

</section>

<section class="glossary-term" id="theta">

### Theta — ความไวของราคาต่อเวลาปัจจุบัน

Θ = ∂V/∂t โดยตรึงวันหมดอายุ T จึงเท่ากับ −∂V/∂τ เมื่อ τ = T − t ถ้าเวลาในสูตรเป็นปี ค่า Theta เป็นต่อปี การรายงานต่อวันต้องระบุ day count และไม่ใช่ผลกำไรหรือขาดทุนที่รับประกันเมื่อเวลาผ่านไปหนึ่งวัน

[ดูสูตรและหน่วย](black-scholes-model.html#greeks)

</section>

<section class="glossary-term" id="vega">

### Vega — ความไวของราคาต่อ volatility

ν = ∂V/∂σ เป็นความไวต่อพารามิเตอร์ volatility โดยตรึงค่าอื่น สูตรที่ใช้ σ เป็นทศนิยมให้อนุพันธ์ต่อการเปลี่ยน σ เท่ากับ 1.00 ถ้ารายงานต่อ 1 percentage point เช่น 20% → 21% ต้องหารค่าจากสูตรด้วย 100

[ดูสูตรและหน่วย](black-scholes-model.html#greeks)

</section>

<section class="glossary-term" id="rho">

### Rho — ความไวของราคาต่อดอกเบี้ย

ρᵣ = ∂V/∂r โดยตรึงค่าอื่น สำหรับ European vanilla บนหุ้นไม่มีปันผล Call มี Rho บวกและ Put มี Rho ลบ ก่อนหมดอายุเมื่อ σ > 0 ค่าอนุพันธ์ต่อ r ที่เป็นทศนิยมต้องหาร 100 เพื่อรายงานต่อดอกเบี้ย 1 percentage point

[ดูสูตรและหน่วย](black-scholes-model.html#greeks)

</section>

<section class="glossary-term" id="american-option">

### American option — ออปชันที่ใช้สิทธิได้ก่อนหมดอายุ

สัญญาที่ใช้สิทธิได้ตลอดช่วงเวลาที่กำหนดจนถึงวันหมดอายุ จึงมีมูลค่าอย่างน้อยเท่ากับ European ที่มีเงื่อนไขอื่นเหมือนกัน ต้องเปรียบเทียบ payoff จากการใช้สิทธิทันทีกับมูลค่าของการถือต่อ ส่วน Bermudan ใช้สิทธิได้เฉพาะวันที่กำหนด

[ดูการตัดสินใจใช้สิทธิ](black-scholes-model.html#early-exercise)

</section>

<section class="glossary-term" id="exercise-boundary">

### Exercise boundary — ขอบเขตการใช้สิทธิ

เส้นแบ่งสถานะที่เหมาะจะใช้สิทธิทันทีออกจากสถานะที่ควรถือต่อในโจทย์ American option เป็นส่วนหนึ่งของคำตอบที่ต้องหา สำหรับ vanilla diffusion ที่มีขอบเขตเรียบ มูลค่าและความชันของ Option จะต่อกับ payoff ตามเงื่อนไข value matching และ smooth pasting

[ดู American Put](black-scholes-model.html#early-exercise)

</section>

<section class="glossary-term" id="implied-volatility">

### Implied volatility — ความผันผวนโดยนัยจากราคา Option

ค่า σ ที่ทำให้ราคาในแบบจำลองตรงกับราคา Option ที่สังเกต เมื่อกำหนด S,K,r,τ และสมมติฐานอื่นแล้ว เป็นการแก้สูตรย้อนกลับ ไม่ใช่ความผันผวนอนาคตที่รับประกัน หากได้ค่าต่างกันตาม strike หรือ maturity จะใช้ σ คงที่ค่าเดียวอธิบายราคาทั้งชุดไม่ได้

[ดูขอบเขตของแบบจำลอง](black-scholes-model.html#model-limits)

</section>

</section>

<section class="glossary-group" id="group-returns">

## ผลตอบแทนและการวัดความผันผวน

<section class="glossary-term" id="return">

### Return — ผลตอบแทน

การเปลี่ยนแปลงของมูลค่าสินทรัพย์รวมกับกระแสเงินสดที่ได้รับ เทียบกับมูลค่าเริ่มต้น เมื่อไม่มีเงินปันผล simple return เท่ากับ (ราคาปลายงวด − ราคาต้นงวด) ÷ ราคาต้นงวด หุ้น 100 ขึ้นเป็น 110 จึงให้ผลตอบแทน 10%

[ดูในบทเรียน](random-assets.html#returns)

</section>
<section class="glossary-term" id="log-return">

### Log return — ผลตอบแทนลอการิทึม

ผลต่างของลอการิทึมราคาปลายงวดกับต้นงวด หรือ **ln(S_ปลาย ÷ S_ต้น)** โดยราคาต้องเป็นบวก หาก simple return มีขนาดเล็ก ทั้งสองค่าจะใกล้กัน และ log return ของหลายช่วงที่ต่อกันสามารถนำมาบวกเป็น log return รวมได้

[ดูในบทเรียน](random-assets.html#volatility)

</section>
<section class="glossary-term" id="mean">

### Mean — ค่าเฉลี่ย

สำหรับข้อมูลตัวอย่าง ค่าเฉลี่ยคือผลรวมของข้อมูลหารด้วยจำนวนข้อมูล เช่น ค่าเฉลี่ยผลตอบแทนรายวันบอกศูนย์กลางของผลตอบแทนในชุดที่เราเก็บมา ส่วนค่าคาดหมายเป็นค่าเฉลี่ยตามกฎความน่าจะเป็น จึงไม่ควรถือว่าค่าเฉลี่ยจากข้อมูลที่มีอยู่เท่ากับค่าจริงที่ไม่รู้โดยอัตโนมัติ

[ดูในบทเรียน](random-assets.html#data)

</section>
<section class="glossary-term" id="variance">

### Variance — ความแปรปรวน

ค่าที่วัดการกระจายรอบค่าเฉลี่ยด้วยระยะห่างยกกำลังสอง หน่วยจึงเป็นกำลังสองของตัวแปรที่วัด ในส่วนสุ่มของแบบจำลอง ความแปรปรวนของ increments ที่เป็นอิสระรวมกันได้ นี่เป็นที่มาของการปรับส่วนเบี่ยงเบนมาตรฐานตามรากที่สองของเวลา

[ดูในบทเรียน](random-assets.html#scaling)

</section>
<section class="glossary-term" id="standard-deviation">

### Standard deviation — ส่วนเบี่ยงเบนมาตรฐาน

รากที่สองของความแปรปรวน จึงมีหน่วยเดียวกับข้อมูลและใช้บอกขนาดการกระจายรอบค่าเฉลี่ย สูตร sample SD ในบทใช้ตัวหาร M − 1 เมื่อมีผลตอบแทน M ค่า ส่วนการหารด้วย M เป็นอีกวิธีหนึ่งซึ่งให้ค่าต่างกัน โดยเฉพาะเมื่อมีข้อมูลน้อย

[ดูในบทเรียน](random-assets.html#data)

</section>
<section class="glossary-term" id="volatility">

### Volatility — ความผันผวน

ขนาดความไม่แน่นอนของผลตอบแทน ในแบบจำลองนี้ใช้พารามิเตอร์ σ กำหนดส่วนเบี่ยงเบนมาตรฐานของส่วนสุ่มในช่วงสั้นเป็น **σ√Δt** ยิ่ง σ มาก ผลลัพธ์ยิ่งกระจายกว้าง โดยต้องกำหนดหน่วยเวลาให้สอดคล้องกัน

[ดูในบทเรียน](random-assets.html#volatility)

</section>
<section class="glossary-term" id="drift">

### Drift — อัตราการเปลี่ยนแปลงเฉลี่ย

พารามิเตอร์ μ ที่กำหนดส่วนค่าเฉลี่ยของผลตอบแทนช่วงสั้นเป็น **μΔt** ในแบบจำลองราคา ส่วนนี้ไม่ได้บอกว่าราคาจะเพิ่มเท่านี้ทุกครั้ง เพราะยังมีส่วนสุ่มเข้ามารวมด้วย และการประมาณ μ จากข้อมูลสั้น ๆ อาจถูกความผันผวนบดบังได้มาก

[ดูในบทเรียน](random-assets.html#scaling)

</section>
<section class="glossary-term" id="annualization">

### Annualization — การปรับเป็นอัตราต่อปี

การแปลงค่าสถิติให้ใช้ปีเป็นหน่วยเวลา เช่น ในสมมติฐาน 252 วันซื้อขายต่อปี บทนี้ประมาณ drift ด้วยค่าเฉลี่ยรายวัน × 252 และ volatility ด้วย SD รายวัน × √252 กฎรากที่สองนี้อาศัยสมมติฐานของส่วนสุ่มและไม่ได้ใช้ได้กับข้อมูลทุกแบบ ส่วน drift ที่ปรับแล้วก็ไม่ใช่ CAGR

[ดูในบทเรียน](random-assets.html#scaling)

</section>
<section class="glossary-term" id="histogram">

### Histogram — ฮิสโตแกรม

กราฟที่แบ่งค่าข้อมูลเป็นช่วงแล้วแสดงความถี่ในแต่ละช่วง ช่วยให้เห็นว่าผลตอบแทนกระจุกตรงไหน กระจายกว้างเพียงใด และเบ้ไปด้านใด รูปร่างกราฟขึ้นกับการแบ่งช่วงด้วย การดูคล้าย Normal จึงยังไม่เพียงพอจะยืนยันว่าข้อมูลมีการแจกแจงแบบ Normal

[ดูในบทเรียน](random-assets.html#data)

</section>
<section class="glossary-term" id="rolling-window">

### Rolling window — หน้าต่างข้อมูลเลื่อน

การคำนวณจากข้อมูลย้อนหลังจำนวนคงที่ แล้วเลื่อนช่วงข้อมูลไปเมื่อมีวันใหม่ เช่น ใช้ผลตอบแทน 30 วันล่าสุดหาความผันผวน หากให้น้ำหนักเท่ากันทุกวัน ผลตอบแทนที่รุนแรงหนึ่งวันจะมีผลต่อค่าประมาณจนกว่าจะหลุดจากหน้าต่าง เกิดลักษณะค้างสูงแล้วลดลงที่เรียกว่า plateauing effect ได้

[ดูในบทเรียน](random-assets.html#volatility)

</section>

</section>

<section class="glossary-group" id="group-models">

## การแจกแจงและแบบจำลองราคา

<section class="glossary-term" id="normal-distribution">

### Normal distribution — การแจกแจงปกติ

การแจกแจงต่อเนื่องรูประฆังที่สมมาตรรอบค่าเฉลี่ย และกำหนดได้ด้วยค่าเฉลี่ยกับความแปรปรวน ส่วน standard Normal มีค่าเฉลี่ย 0 และ SD เท่ากับ 1 ในบทนี้ใช้เป็นสมมติฐานตั้งต้นสำหรับผลตอบแทนช่วงสั้น โดยไม่ได้อ้างว่าผลตอบแทนจริงต้องเป็น Normal เสมอ

[ดูในบทเรียน](random-assets.html#data)

</section>
<section class="glossary-term" id="lognormal-distribution">

### Lognormal distribution — การแจกแจงล็อกนอร์มอล

การแจกแจงของตัวแปรที่เป็นบวกและมีลอการิทึมแจกแจงแบบ Normal ใน GBM ที่ μ และ σ คงที่ ราคาที่เวลาอนาคตที่กำหนดมีการแจกแจงแบบ Lognormal ส่วน log return มีการแจกแจงแบบ Normal การสมมติให้ simple return เป็น Normal อย่างเดียวไม่ได้ทำให้ราคาเป็น Lognormal โดยอัตโนมัติ

[ดูในบทเรียน](random-assets.html#summary)

</section>
<section class="glossary-term" id="random-walk">

### Random walk — การเดินสุ่ม

แบบจำลองที่สถานะเปลี่ยนไปทีละ step ตามผลสุ่ม เช่น นำการเปลี่ยนแปลงสุ่มแต่ละช่วงมาสะสมเป็นเส้นทาง คำนี้ครอบคลุมแบบจำลองได้หลายแบบ จึงต้องดูว่ากติกาแต่ละ step คืออะไร ในบทนี้เราต่อยอดไปสู่ Wiener process และการจำลองราคาด้วย GBM

[ดูในบทเรียน](random-assets.html#wiener)

</section>
<section class="glossary-term" id="wiener-process">

### Wiener process — กระบวนการวีเนอร์

กระบวนการสุ่มต่อเนื่องมาตรฐานที่เริ่มจาก 0 และมี increments ในช่วงไม่ทับกันเป็นอิสระ โดย increment ช่วง Δt แจกแจงแบบ Normal ที่มีค่าเฉลี่ย 0 และความแปรปรวน Δt มักเขียนเป็น X_t หรือ W_t และเรียก standard Brownian motion เช่นกัน เป็นตัวแทนส่วนสุ่มที่ใช้ในแบบจำลองราคาของบทนี้

[ดูในบทเรียน](random-assets.html#wiener)

</section>
<section class="glossary-term" id="stochastic-calculus">

### Stochastic calculus — แคลคูลัสของกระบวนการสุ่ม

กรอบคณิตศาสตร์สำหรับคำนวณการเปลี่ยนแปลงและการสะสมของกระบวนการสุ่มในเวลาต่อเนื่อง เราต้องใช้กรอบนี้เพราะส่วนสุ่มอย่าง Wiener process มีคุณสมบัติต่างจากฟังก์ชันเรียบ จึงจัดการสัญลักษณ์ dX เหมือนอนุพันธ์ธรรมดาทุกอย่างไม่ได้

[ดูในบทเรียน](random-assets.html#wiener)

[ต่อด้วย Itô’s lemma](applied-stochastic-calculus.html#ito-lemma)

</section>
<section class="glossary-term" id="stochastic-differential-equation">

### Stochastic differential equation (SDE) — สมการเชิงอนุพันธ์สุ่ม

สมการที่บอกว่าตัวแปรเปลี่ยนตามเวลาอย่างไร โดยมีส่วนสุ่มรวมอยู่ด้วย มักย่อว่า SDE ตัวอย่าง **dS = μS dt + σS dX** แยกการเปลี่ยนแปลงราคาเป็นส่วนเฉลี่ย μS dt กับส่วนสุ่ม σS dX

[ดูในบทเรียน](random-assets.html#model)

[แปลงฟังก์ชันของ SDE](applied-stochastic-calculus.html#ito-lemma)

</section>
<section class="glossary-term" id="geometric-brownian-motion">

### Geometric Brownian motion (GBM) — การเคลื่อนที่บราวเนียนเชิงเรขาคณิต

แบบจำลองราคาที่เรียกสั้น ๆ ว่า **GBM** และเขียนเป็น dS = μS dt + σS dX เมื่อ μ และ σ คงที่และราคาเริ่มต้นเป็นบวก สูตรคำตอบของแบบจำลองคงราคาเป็นบวก โดยราคามีการแจกแจงแบบ Lognormal และ log return มีการแจกแจงแบบ Normal

[ดูในบทเรียน](random-assets.html#model)

[ดูที่มาของคำตอบ GBM](applied-stochastic-calculus.html#gbm)

</section>

</section>

<section class="glossary-group" id="group-transition">

## การเปลี่ยนสถานะและสมการการแพร่

<section class="glossary-term" id="trinomial-random-walk">

### Trinomial random walk — การเดินสุ่มสามทาง

การเดินสุ่มที่ในหนึ่ง step เลือกได้สามการเคลื่อนที่ บทนี้ใช้ขึ้น h อยู่นิ่ง หรือลง h ด้วยโอกาส α, 1 − 2α และ α ตามลำดับ แต่ละ step เป็นอิสระและใช้พารามิเตอร์คงที่ เป็นแบบจำลองตัวแปรบนเส้นจำนวน ไม่ใช่ต้นไม้สำหรับกำหนดราคา Option โดยอัตโนมัติ

[ดูในบทเรียน](transition-density-functions.html#walk)

</section>

<section class="glossary-term" id="probability-mass">

### Probability mass — มวลความน่าจะเป็น

ความน่าจะเป็นที่ตัวแปรไม่ต่อเนื่องมีค่าใดค่าหนึ่ง เช่น เดินสุ่มสอง step แล้วอยู่ที่ 0 มีโอกาส 0.44 มวลทุกค่ารวมกันเป็น 1 ต่างจากความหนาแน่นต่อเนื่องซึ่งต้องอินทิเกรตเหนือช่วงก่อนจึงได้ความน่าจะเป็น

[ดูในบทเรียน](transition-density-functions.html#density)

</section>

<section class="glossary-term" id="transition-density">

### Transition density — ความหนาแน่นของความน่าจะเป็นในการเปลี่ยนสถานะ

ความหนาแน่นของค่าปลายทางเมื่อกำหนดสถานะและเวลาเริ่มต้นแล้ว เขียนในบทนี้ว่า k(y,t;z,T) อินทิเกรตตาม z บนช่วงที่สนใจเพื่อหาโอกาสอยู่ในช่วงนั้น ความสูงของความหนาแน่นไม่ใช่ความน่าจะเป็นที่จุดเดียว และอาจมากกว่า 1 ได้

[ดูในบทเรียน](transition-density-functions.html#density)

</section>

<section class="glossary-term" id="markov-property">

### Markov property — สมบัติมาร์คอฟ

เมื่อรู้สถานะปัจจุบันแล้ว การแจกแจงแบบมีเงื่อนไขของอนาคตไม่ต้องอาศัยประวัติก่อนหน้านั้นเพิ่มเติม ภายใต้แบบจำลองที่กำหนด สมบัตินี้ทำให้แยกคำนวณตาม step ถัดไปได้ ไม่ใช่ข้ออ้างว่าข้อมูลอดีตไม่มีประโยชน์ในตลาดจริงทุกกรณี

[ดูในบทเรียน](transition-density-functions.html#backward)

</section>

<section class="glossary-term" id="diffusion-coefficient">

### Diffusion coefficient — สัมประสิทธิ์การแพร่

สัมประสิทธิ์หน้าอนุพันธ์อันดับสองในสมการการแพร่ บทนี้ใช้ c² = αh²/Δt ในลิมิต ทำให้ความแปรปรวนหลังเวลา τ เป็น 2c²τ หากเขียน SDE เป็น dY = σᵧ dW สัมประสิทธิ์การแพร่จะเป็น σᵧ²/2

[ดูในบทเรียน](transition-density-functions.html#scaling)

</section>

<section class="glossary-term" id="forward-kolmogorov">

### Forward Kolmogorov / Fokker–Planck equation — สมการโคลโมโกรอฟไปข้างหน้า

สมการที่อธิบายการเปลี่ยนการแจกแจงปลายทางตามเวลาเมื่อกำหนดจุดเริ่มต้นแล้ว ในกรณีไม่มี drift และ c คงที่ของบทนี้ คือ ∂k/∂T = c²∂²k/∂z² โดยอนุพันธ์ทำงานกับปลายทาง z,T

[ดูในบทเรียน](transition-density-functions.html#forward)

</section>

<section class="glossary-term" id="backward-kolmogorov">

### Backward Kolmogorov equation — สมการโคลโมโกรอฟย้อนกลับ

สมการที่หาโอกาสหรือค่าคาดหมายจากจุดเริ่มต้นต่าง ๆ เมื่อกำหนดเป้าหมายในอนาคตไว้ ในบทนี้คือ ∂k/∂t + c²∂²k/∂y² = 0 โดยอนุพันธ์ทำงานกับจุดเริ่มต้น y,t การคำนวณย้อนกลับไม่ใช่การย้อนเส้นทางสุ่มทางกายภาพ

[ดูในบทเรียน](transition-density-functions.html#backward)

</section>

<section class="glossary-term" id="taylor-expansion">

### Taylor expansion — การขยายเทย์เลอร์

การประมาณฟังก์ชันใกล้จุดหนึ่งด้วยค่าฟังก์ชันและอนุพันธ์ที่จุดนั้น เช่น เก็บพจน์อันดับหนึ่งของเวลาและอันดับสองของตำแหน่งเพื่อเชื่อมกฎการเดินสุ่มกับสมการการแพร่ การตัดพจน์ที่สูงกว่าทิ้งเป็นการประมาณ ต้องพิจารณาขนาด step และความเรียบของฟังก์ชัน

[ดูในบทเรียน](transition-density-functions.html#forward)

</section>

<section class="glossary-term" id="similarity-solution">

### Similarity solution — คำตอบที่คงรูปภายใต้การย่อขยาย

วิธีหาคำตอบโดยรวมตำแหน่งและเวลาเป็นตัวแปรเดียว ในตัวอย่าง Gaussian ใช้ (z − y)/√τ ทำให้ความกว้างโตตาม √τ และความสูงลดตาม 1/√τ ขณะที่พื้นที่ใต้ความหนาแน่นคงเป็น 1

[ดูในบทเรียน](transition-density-functions.html#similarity)

</section>

<section class="glossary-term" id="dirac-delta">

### Dirac delta — เดลตาของดิแรก

การแจกแจงเชิงคณิตศาสตร์ที่ใช้แทนมวลหนึ่งหน่วย ณ จุดเดียว นิยามผ่านผลของการอินทิเกรต ไม่ใช่ฟังก์ชันที่มีความสูงจำกัด ณ จุดนั้น ใช้ระบุว่าเริ่มจากค่า y แน่นอนก่อนความน่าจะเป็นจะแพร่ออก และห้ามแทนเวลาเป็นศูนย์ในสูตร Gaussian ที่มีไว้สำหรับเวลาบวก

[ดูในบทเรียน](transition-density-functions.html#dirac)

</section>

</section>

<section class="glossary-group" id="group-calculus">

## แคลคูลัสและการจำลองกระบวนการสุ่ม

<section class="glossary-term" id="quadratic-variation">

### Quadratic variation — ความแปรผันกำลังสอง

ลิมิตของผลรวมกำลังสองของ step เมื่อแบ่งช่วงเวลาละเอียดขึ้น สำหรับ standard Brownian motion บน [0,T] ค่านี้เท่ากับ T แต่ผลรวมบนตารางที่ยังมีจำนวน step จำกัดยังสุ่มได้ ไม่ใช่ความแปรปรวนของระดับค่าบนเส้นทางหนึ่ง

[ดูในบทเรียน](applied-stochastic-calculus.html#quadratic-variation)

</section>

<section class="glossary-term" id="mean-square-convergence">

### Mean-square convergence — การลู่เข้าแบบค่าเฉลี่ยกำลังสอง

Xₙ ลู่เข้า X แบบ mean square เมื่อ E[(Xₙ−X)²] เข้าใกล้ศูนย์ เป็นข้อความเกี่ยวกับค่าคาดหมายของความคลาดเคลื่อนยกกำลังสอง ไม่ได้บอกว่า error ของทุกตัวอย่างต้องลดลงทุกครั้ง

[ดูในบทเรียน](applied-stochastic-calculus.html#quadratic-variation)

</section>

<section class="glossary-term" id="ito-integral">

### Itô integral — ปริพันธ์อิโต

ปริพันธ์เชิงสุ่มที่สร้างจากน้ำหนักซึ่งไม่มองอนาคต โดยผลรวมแบบง่ายใช้ค่า integrand ที่ต้นช่วงคูณกับ Brownian increment ถัดไป เช่น ∫₀ᵀ Wₜ dWₜ = (W_T²−T)/2 เมื่อ W₀ = 0

[ดูในบทเรียน](applied-stochastic-calculus.html#ito-integral)

</section>

<section class="glossary-term" id="itos-lemma">

### Itô’s lemma — บทตั้งของอิโต

กฎแปลงฟังก์ชันที่เรียบของกระบวนการ Itô ถ้า dY = a dt + b dW จะมี dF = (Fₜ+aFᵧ+½b²Fᵧᵧ)dt+bFᵧdW พจน์อนุพันธ์อันดับสองเกิดจาก quadratic variation และต้องแยก (dY)² ออกจาก d(Y²)

[ดูในบทเรียน](applied-stochastic-calculus.html#ito-lemma)

</section>

<section class="glossary-term" id="ornstein-uhlenbeck">

### Ornstein–Uhlenbeck / Vasicek — กระบวนการออร์นสไตน์–อูเลนเบค

แบบจำลอง dr = κ(θ−r)dt+σᵣdW ที่มี κ &gt; 0 ดึง drift กลับเข้าหาระดับ θ เมื่อใช้จำลองอัตราดอกเบี้ยระยะสั้นเรียก Vasicek model คำตอบเป็น Gaussian และมีค่าติดลบได้

[ดูในบทเรียน](applied-stochastic-calculus.html#ou)

</section>

<section class="glossary-term" id="mean-reversion">

### Mean reversion — การกลับเข้าหาค่ากลาง

สมบัติที่ drift ดึงสถานะกลับเข้าหาระดับระยะยาว เช่น κ(θ−r) ใน OU แต่ละ step ยังอาจเดินออกห่างเพราะช็อก จึงไม่ใช่การรับประกันว่าเส้นทางหรือราคาจะกลับมาถึงค่ากลางในเวลาที่ระบุ

[ดูในบทเรียน](applied-stochastic-calculus.html#ou)

</section>

<section class="glossary-term" id="stationary-distribution">

### Stationary distribution — การแจกแจงคงตัว

การแจกแจงที่คงเดิมเมื่อให้กระบวนการวิวัฒน์ตามเวลา หากเริ่มจากการแจกแจงนั้น สำหรับ OU ที่ κ,σᵣ &gt; 0 คือ Normal(θ,σᵣ²/(2κ)) การเริ่มจากค่าคงที่ต้องแยกจากการเริ่มด้วย stationary distribution

[ดูในบทเรียน](applied-stochastic-calculus.html#ou)

</section>

<section class="glossary-term" id="euler-maruyama">

### Euler–Maruyama — วิธีออยเลอร์–มารุยามะ

วิธีประมาณ SDE ด้วย Yᵢ₊₁ = Yᵢ+a(Yᵢ,tᵢ)Δt+b(Yᵢ,tᵢ)√Δt Zᵢ โดย Zᵢ เป็น Standard Normal อิสระ ใช้สัมประสิทธิ์ที่ต้นช่วงและยังมี discretization error รวมถึงอาจไม่รักษาความเป็นบวกของแบบจำลองเดิม

[ดูในบทเรียน](applied-stochastic-calculus.html#simulation)

</section>

<section class="glossary-term" id="discretization-error">

### Discretization error — ความคลาดเคลื่อนจากการแบ่งช่วง

ความแตกต่างที่เกิดจากแทนสมการต่อเนื่องด้วย time step หรือตารางที่ยังมีขนาดจำกัด ต่างจาก sampling error ที่เกิดจากจำนวนตัวอย่าง และ model error ที่เกิดจากสมมติฐานของแบบจำลอง

[ดูในบทเรียน](applied-stochastic-calculus.html#simulation)

</section>

<section class="glossary-term" id="correlated-increments">

### Correlated increments — step สุ่มที่มีสหสัมพันธ์

step ของกระบวนการต่างตัวในช่วงเวลาเดียวกันซึ่งมี covariance ที่กำหนด เช่น Cov(ΔW₁,ΔW₂) = ρΔt สร้างได้จาก Normal อิสระด้วย φ₁=Z₁ และ φ₂=ρZ₁+√(1−ρ²)Z₂ ค่า ρ ของช็อกไม่ใช่ correlation ของระดับราคาตามเวลาโดยอัตโนมัติ

[ดูในบทเรียน](applied-stochastic-calculus.html#correlation)

</section>

</section>

<section class="glossary-group" id="group-simulation">

## การทดลองด้วยการจำลอง

<section class="glossary-term" id="monte-carlo">

### Monte Carlo (MC) — การประมาณคำตอบด้วยการสุ่มซ้ำ

การใช้กติกาของแบบจำลองสุ่มผลลัพธ์หลายครั้ง แล้วรวบรวมเป็นคำตอบ เช่น จำลองราคาหลายพันเส้นเพื่อหาราคาปลายปีเฉลี่ยหรือสัดส่วนที่จบต่ำกว่าราคาเริ่มต้น จำนวนรอบที่มากขึ้นช่วยลดความคลาดเคลื่อนจากการสุ่มคำนวณ แต่ไม่ได้ทำให้สมมติฐานของแบบจำลองถูกต้องขึ้นเอง

[ดูในบทเรียน](random-assets.html#model)

</section>
<section class="glossary-term" id="standard-error">

### Standard error — ความคลาดเคลื่อนมาตรฐานของค่าประมาณ

ค่าที่บอกว่าค่าประมาณอย่างค่าเฉลี่ยอาจแกว่งจากการสุ่มตัวอย่างมากเพียงใด สำหรับค่าเฉลี่ยจากการจำลองอิสระ N รอบที่มีความแปรปรวนจำกัด ประมาณได้ด้วย **SD ของผลลัพธ์ ÷ √N** จึงเป็นคนละอย่างกับความผันผวนของราคา และไม่ได้วัดความผิดพลาดของแบบจำลอง

[ดูในบทเรียน](random-assets.html#model)

</section>

</section>

---

ความหมายและตัวอย่างในหน้านี้ใช้ประกอบบทเรียน [พฤติกรรมแบบสุ่มของสินทรัพย์](random-assets.html) สามารถย้อนดู [แหล่งอ้างอิงของบทเรียน](random-assets.html#sources) ได้ที่ท้ายบท
