---
title: Asset Returns — Empirical Stylized Facts
description: พฤติกรรมที่พบซ้ำในผลตอบแทนสินทรัพย์ ตั้งแต่ volatility clustering, fat tails และ autocorrelation ไปถึงข้อมูลระหว่างวัน realized volatility และ microstructure noise
notebook: notebooks/asset-returns-stylized-facts.ipynb
visual_route: no-image-generator
inline_math: true
---

<h1 id="stylized-facts-title">Asset Returns — Empirical Stylized Facts</h1>

<p class="lead">ผลตอบแทนวันนี้ช่วยบอกความผันผวนวันพรุ่งนี้ได้แค่ไหน?</p>

<div class="chapter-quote">

> “การเปลี่ยนแปลงขนาดใหญ่มักตามด้วยการเปลี่ยนแปลงขนาดใหญ่ ไม่ว่าจะขึ้นหรือลง ส่วนการเปลี่ยนแปลงขนาดเล็กมักตามด้วยการเปลี่ยนแปลงขนาดเล็ก”
>
> <span lang="en">“…large changes tend to be followed by large changes—of either sign—and small changes tend to be followed by small changes…”</span>
>
> — **Benoit Mandelbrot** · [*The Variation of Certain Speculative Prices* (1963), น. 418](https://oftp.cyrax.hu/doc/mandelbrot.pdf#page=26) · ข้อความบางส่วน แปลไทยเพื่อประกอบบทเรียน

</div>

ในบท [VaR และ Expected Shortfall](value-at-risk-expected-shortfall.html) เราเริ่มคำนวณจากการแจกแจงที่กำหนดให้ การใช้ Normal กับ volatility คงที่ทำให้คำนวณสะดวก แต่ในข้อมูลตลาด วันที่ราคาแกว่งแรงมักเกิดติดกัน ค่า volatility ค่าเดียวจึงอาจอธิบายทั้งช่วงสงบและช่วงผันผวนได้ไม่ดี

**Stylized facts** คือรูปแบบเชิงสถิติที่พบซ้ำในข้อมูลหลายตลาดและหลายช่วงเวลา เช่น หางของการแจกแจงที่หนากว่า Normal หรือความสัมพันธ์ของขนาดผลตอบแทนระหว่างวัน เราใช้ข้อสังเกตเหล่านี้ตรวจและเลือกแบบจำลอง โดยต้องดูด้วยว่าพบในสินทรัพย์ ช่วงเวลา และความถี่ใด

เนื้อหาอ้างอิงงานของ Stephen Taylor เรื่อง *Asset Price Dynamics, Volatility, and Prediction* เริ่มจากผลตอบแทนรายวัน แล้วดูว่าราคาระหว่างวันให้ข้อมูลอะไรเพิ่ม กราฟและตัวทดลองทั้งหมดใช้ข้อมูลสมมติเพื่อแยกผลของแต่ละสมมติฐาน ไม่ใช่ราคาตลาดจริงหรือผลทดสอบกลยุทธ์ลงทุน

<section id="return-conventions">

## จากราคาไปเป็นผลตอบแทน

ให้ \(P_{t-1}\) เป็นราคาก่อนเริ่มช่วง \(P_t\) เป็นราคาปลายช่วง และ \(D_t\) เป็นเงินปันผลที่ได้รับเมื่อสิ้นช่วงต่อหนึ่งหน่วยสินทรัพย์ โดยยังไม่หักต้นทุนซื้อขาย

$$
R_t=\frac{P_t+D_t-P_{t-1}}{P_{t-1}},\qquad
r_t=\log(1+R_t)=\log\left(\frac{P_t+D_t}{P_{t-1}}\right).
$$

R คือ simple return ส่วน r คือ log return ตัวอย่างซื้อที่ 100 ขายที่ 99 และรับปันผล 2 จะได้ R=1% และ r≈0.9950% ถ้าใช้ราคาดิบแล้วละปันผล เราจะคำนวณ R เป็น −1% ทั้งที่ความมั่งคั่งรวมเพิ่มขึ้น

เมื่อ R ใกล้ศูนย์ ค่า r ใกล้ R แต่ความต่างเพิ่มตามขนาดการเปลี่ยนแปลง การขึ้น 20% แล้วลง 20% ให้ simple return สะสม −4% ส่วน log returns บวกกันได้ \(\log(1.2)+\log(0.8)=\log(0.96)\) ไม่ใช่ศูนย์

$$
R_{1:T}=\prod_{t=1}^{T}(1+R_t)-1,\qquad
r_{1:T}=\sum_{t=1}^{T}r_t=\log(1+R_{1:T}).
$$

เมื่อคำนวณผลตอบแทนหลายช่วงที่มีปันผล สูตรทบต้นนี้สมมติว่านำปันผลกลับไปลงทุน หากใช้ราคาที่ปรับปันผลและแตกหุ้นไว้แล้ว ให้ตรวจวิธีปรับราคาก่อน เพื่อไม่ให้นับปันผลซ้ำ

บทนี้ใช้ **log return** สำหรับอนุกรมเวลาและ realized variance เป็นหลัก ส่วนการรวมสินทรัพย์ด้วยน้ำหนักพอร์ต ณ ต้นช่วงยังใช้ simple returns: \(R_p=\sum_iw_iR_i\) การเฉลี่ย log returns ของสินทรัพย์ด้วยน้ำหนักเดียวกันไม่ได้ให้ log return ของพอร์ตตรง ๆ

</section>

<section id="daily-evidence">

## รูปแบบสามอย่างในผลตอบแทนรายวัน

Taylor จัดข้อสังเกตหลักของผลตอบแทนรายวันไว้สามข้อ

| สิ่งที่พบซ้ำ | ดูจากอะไร | สมมติฐานที่ต้องตรวจต่อ |
|---|---|---|
| การแจกแจงมีหางหนากว่า Normal | Histogram, Q–Q plot, tail probabilities และ kurtosis | Normal ที่ใช้ประมาณขาดทุนครอบคลุมหางหรือไม่ |
| ผลตอบแทนคนละวันมักมี linear correlation ต่ำ | Scatter plot และ ACF ของ r | Correlation ต่ำไม่ได้รับรอง independence |
| ขนาดผลตอบแทนมีความสัมพันธ์บวกข้ามวัน | ACF ของ \(|r|\) และ \(r^2\) | Volatility คงที่อาจไม่เหมาะกับข้อมูล |

ผลตอบแทนหุ้นยังอาจเบ้ด้านขาดทุน ขนาดความเบ้และความหนาของหางเปลี่ยนตามตลาดและช่วงตัวอย่าง ส่วนคำว่า correlation ต่ำไม่ได้หมายถึงเท่ากับศูนย์ทุก lag โดยเฉพาะสินทรัพย์ที่ซื้อขายบางหรือข้อมูลระยะสั้นมาก

ค่าเฉลี่ยรายวันมักมีขนาดเล็กเมื่อเทียบกับ SD เมื่อใช้ข้อมูลช่วงสั้นแล้วแปลงค่าเฉลี่ยเป็นรายปี ความคลาดเคลื่อนของค่าประมาณก็ขยายตามไปด้วย ส่วน SD ที่คำนวณจากช่วงวิกฤตย่อมต่างจากช่วงตลาดสงบ

Taylor ยังยกตัวอย่าง calendar effects เช่น ความต่างของผลตอบแทนตามวันในสัปดาห์ ต้นเดือน เดือนมกราคม และก่อนวันหยุด ผลที่พบอาจอ่อนลงเมื่อเปลี่ยนช่วงข้อมูล และการทดสอบหลายเงื่อนไขย้อนหลังอาจทำให้เราเลือกผลที่เด่นเพราะความบังเอิญ ก่อนนำไปใช้จึงต้องทดสอบกับข้อมูลนอกช่วงประมาณค่าและหักต้นทุนซื้อขายด้วย

</section>

<section id="volatility-clustering">

## วันที่แกว่งแรงมักอยู่ใกล้กัน

[Volatility clustering](glossary.html#volatility-clustering) หมายถึงช่วงที่ผลตอบแทนมีขนาดใหญ่เกิดติดกัน สลับกับช่วงที่ขนาดเล็ก คำว่า “ขนาดใหญ่” ครอบคลุมทั้งบวกและลบ หลังวันที่ลงแรง วันถัดไปอาจลงต่อหรือดีดกลับแรงก็ได้

แบบจำลองง่าย ๆ ที่แยกสองส่วนนี้คือ

$$
r_t=\mu_t+\sigma_tz_t,\qquad
\mathbb E[z_t\mid\mathcal F_{t-1}]=0,\qquad
\mathbb E[z_t^2\mid\mathcal F_{t-1}]=1.
$$

\(\mathcal F_{t-1}\) คือข้อมูลที่รู้ก่อนเริ่มช่วง t ส่วน \(\mu_t\) และ \(\sigma_t\) เป็นค่าที่กำหนดจากข้อมูลนั้นได้ เมื่อ \(\sigma_t\) สูง ขนาด \(|r_t-\mu_t|\) มีแนวโน้มสูงขึ้น แต่เครื่องหมายยังขึ้นกับช็อก \(z_t\) การคาดการณ์ volatility จึงไม่ได้ให้คำตอบทิศทางผลตอบแทนโดยอัตโนมัติ

<div class="portfolio-figure" tabindex="0" role="group" aria-label="ผลตอบแทนจำลองและ ACF ของผลตอบแทนกับขนาดผลตอบแทน เลื่อนแนวนอนเพื่อดูภาพเต็ม">

![ข้อมูลจำลอง 600 วันมีช่วง SD สูงและต่ำสลับกัน ACF ของขนาดผลตอบแทนสูงกว่า ACF ของผลตอบแทนดิบหลาย lag](assets/images/stylized-clustering.svg)

</div>
<p class="figure-caption">ข้อมูลจำลองใช้ Normal shocks อิสระ และกำหนดให้ SD สลับระหว่าง 0.5% กับ 2.5% ทุก 50 วัน เรากำหนดช่วงผันผวนขึ้นเอง ไม่ได้ประมาณ GARCH จากข้อมูลตลาด</p>

ถ้าเก็บผลตอบแทนทุกค่าไว้แล้วสับลำดับวัน ค่าเฉลี่ย SD และ histogram จะเหมือนเดิม แต่วันที่แกว่งแรงจะกระจายไปอยู่คนละตำแหน่ง Histogram จึงแยกข้อมูลสองลำดับนี้ไม่ได้

<div id="clustering-lab"></div>
<noscript><p>ตัวอย่างลำดับเดิมมี ACF lag 1 ของ r ประมาณ 0.052 และของ |r| ประมาณ 0.330 เมื่อสับลำดับด้วย seed 731 ACF ของ |r| เหลือประมาณ 0.074 ดาวน์โหลด Notebook เพื่อทำการทดลองนี้</p></noscript>

</section>

<section id="autocorrelation">

## วัดความสัมพันธ์ข้ามเวลาด้วย ACF

[Autocorrelation function หรือ ACF](glossary.html#autocorrelation) วัดความสัมพันธ์ระหว่างค่าที่ห่างกัน k ช่วงเวลา นิยาม sample ACF ที่ใช้ในบทนี้คือ

$$
\widehat\rho_k=
\frac{\sum_{t=k+1}^{n}(r_t-\bar r)(r_{t-k}-\bar r)}
{\sum_{t=1}^{n}(r_t-\bar r)^2},\qquad k=1,\ldots,m.
$$

เราใช้ค่าเฉลี่ยของชุดเต็มและตัวหารชุดเต็มทุก lag นิยามนี้อาจต่างเล็กน้อยจากการใช้ Pearson correlation กับสองช่วงที่ตัดแล้ว เช่นฟังก์ชัน CORREL ที่หา mean ของแต่ละช่วงใหม่ สำหรับข้อมูลคงที่ทุกค่า ตัวหารเป็นศูนย์และ ACF ไม่มีนิยาม

ถ้าค่าต่าง ๆ เป็น iid และมีเงื่อนไขโมเมนต์ที่เหมาะสม กรอบอ้างอิงราย lag สำหรับตัวอย่างขนาดใหญ่ประมาณได้ด้วย \(\pm1.96/\sqrt n\) เช่น n=600 ให้ประมาณ ±0.080 ดูวิธีสร้างกรอบใน [NIST, Autocorrelation Plot](https://www.itl.nist.gov/div898/handbook/eda/section3/eda331.htm)

กรอบนี้ใช้กับแต่ละ lag แยกกัน เมื่อดู 20 หรือ 30 lag พร้อมกัน โอกาสเห็นจุดหลุดกรอบโดยบังเอิญจะเพิ่มขึ้น ถ้า variance เปลี่ยนตามข้อมูลในอดีต หรือมี conditional heteroskedasticity การใช้กรอบ iid กับผลตอบแทนดิบก็อาจทำให้สรุปผลคลาดเคลื่อน ส่วนค่าที่อยู่ในกรอบยังไม่เพียงพอจะยืนยันว่าข้อมูลเป็นอิสระ

Box–Pierce และ Ljung–Box รวม ACF หลาย lag เป็นสถิติเดียว

$$
Q_{\rm BP}=n\sum_{k=1}^{m}\widehat\rho_k^2,\qquad
Q_{\rm LB}=n(n+2)\sum_{k=1}^{m}\frac{\widehat\rho_k^2}{n-k}.
$$

ภายใต้สมมติฐานหลักและเงื่อนไขที่เหมาะสมของ white-noise/iid benchmark ค่าสถิติมีการแจกแจงอ้างอิงโดยประมาณแบบ \(\chi_m^2\) หากทดสอบ residuals จากโมเดลที่ประมาณพารามิเตอร์แล้ว ต้องปรับองศาอิสระและเงื่อนไขตามโมเดล ผลทดสอบใช้ตัดสินสมมติฐานเรื่องความสัมพันธ์ที่ตั้งไว้ การจะสรุปว่าทำนายราคาได้ยังต้องทดสอบการพยากรณ์แยกต่างหาก

ลองคำนวณ ACF และ Q อีกครั้งหลังแทน r ด้วย \(|r|\) หรือ \(r^2\) ถ้า r เป็น iid ฟังก์ชันเหล่านี้ก็ควรเป็น iid เช่นกัน ความสัมพันธ์ในขนาดผลตอบแทนจึงเป็นหลักฐานที่ใช้โต้แย้งสมมติฐาน iid ของ r ได้ แม้ ACF ของ r เองจะต่ำ

</section>

<section id="fat-tails">

## หางหนาและ kurtosis

สำหรับ Standard Normal โอกาสอยู่ห่างค่าเฉลี่ยเกิน 3 SD ทั้งสองด้านรวมประมาณ 0.2700% และเกิน 4 SD ประมาณ 0.00633% ถ้าสุ่มอิสระวันละหนึ่งค่าตลอด 252 วัน จำนวนเหตุการณ์เกิน 3 SD คาดหมายอยู่ที่ประมาณ 0.68 ครั้งต่อปี ตัวเลขนี้มาจากแบบจำลอง ไม่ใช่อัตราที่ตลาดต้องเกิดจริง

การแจกแจงที่มี [fat tails](glossary.html#fat-tails) ให้โอกาสเหตุการณ์รุนแรงมากกว่า Normal ที่ใช้เทียบ หากตัดวันที่ร่วงแรงออกเพียงเพราะอยู่นอก 3 SD เราอาจเสียข้อมูลที่ต้องใช้ประเมินความเสี่ยงไปด้วย ก่อนตัดข้อมูล ให้แยกราคาที่ผิดหรือค้างจากครั้งก่อน และราคาที่ยังไม่ปรับการแตกหุ้น ออกจากราคาที่เคลื่อนไหวแรงจริง

Kurtosis แบบ population คือ

$$
\kappa=\frac{\mathbb E[(r-\mu)^4]}{\operatorname{Var}(r)^2}.
$$

Normal มี κ=3 และ excess kurtosis เท่ากับ κ−3 ในตัวทดลองใช้ moment estimator \(\widehat\kappa=m_4/m_2^2\) โดย \(m_j=n^{-1}\sum_t(r_t-\bar r)^j\) ส่วน SD ที่รายงานใช้ตัวหาร n−1 โปรแกรมที่ปรับ small-sample bias หรือรายงานเฉพาะ excess kurtosis จะให้ตัวเลขคนละนิยาม

Kurtosis ไวต่อข้อมูลปลายหางเพราะยกกำลังสี่ ตัวเลขสูงไม่ได้บอกความเบ้ และไม่ได้ระบุว่า distribution ต้องเป็น Student-t หรือมี variance อนันต์ การทดสอบ normality ด้วย \((\widehat\kappa-3)/\sqrt{24/n}\) อาศัย iid Normal null และการประมาณตัวอย่างใหญ่ จึงไม่ควรใช้ standard error นี้ตรง ๆ กับข้อมูลที่มี volatility clustering

</section>

<section id="variance-mixture">

## Normal หลายสเกลรวมกันให้หางหนาได้

สมมติว่าในแต่ละสภาวะผลตอบแทนมีค่าเฉลี่ยศูนย์ และ

$$
r\mid\sigma\sim N(0,\sigma^2).
$$

เมื่อรวมหลายสภาวะเข้าด้วยกัน \(\mathbb E[r^2]=\mathbb E[\sigma^2]\) และ \(\mathbb E[r^4]=3\mathbb E[\sigma^4]\) จึงได้

$$
\kappa=3\frac{\mathbb E[\sigma^4]}{\mathbb E[\sigma^2]^2}
=3\left(1+\frac{\operatorname{Var}(\sigma^2)}{\mathbb E[\sigma^2]^2}\right)\geq3.
$$

ค่า κ จะมากกว่า 3 เมื่อ variance ของแต่ละสภาวะต่างกันจริง โดยโมเมนต์ที่ใช้ต้องมีค่าจำกัด สูตรนี้ยังสมมติให้ทุกสภาวะมีค่าเฉลี่ยเดียวกัน หากค่าเฉลี่ยต่างกัน ต้องคำนวณโมเมนต์ของ mixture ใหม่

ตัวอย่างให้ 80% ของวันมี SD 0.5% และอีก 20% มี SD 2.5% จะได้ variance รวม \(0.8(0.005)^2+0.2(0.025)^2=0.000145\) หรือ SD ประมาณ 1.2042% ต่อวัน ส่วน kurtosis เท่ากับประมาณ 11.219 เทียบกับ 3 ของ Normal ที่มี SD เท่ากัน

<div id="variance-mixture-lab"></div>
<noscript><p>ค่าเริ่มต้น p=20% และอัตราส่วน SD=5 ให้ kurtosis 11.219 และโอกาสเกิน ±3 SD รวมประมาณ 2.969% เทียบกับ Normal 0.270% คำนวณได้ใน Notebook</p></noscript>

การสุ่มเลือกสภาวะใหม่อย่างอิสระทุกวันให้ mixture แบบนี้ได้ โดยไม่เกิด volatility clustering หากให้สภาวะเดิมอยู่นานหลายวัน ก็เกิด clustering ได้เช่นกัน สัดส่วนของแต่ละสภาวะกำหนดการแจกแจงรวม ส่วนการเรียงสภาวะตามเวลากำหนดความสัมพันธ์ข้ามวัน

การเปลี่ยน volatility เป็นกลไกหนึ่งที่สร้างหางหนาได้ ส่วน jumps ความเบ้ และหางของช็อก \(z_t\) อาจเพิ่มความผิดปกติจาก Normal อีก การหารด้วย volatility ที่ประมาณมาแล้วไม่ได้รับประกันว่าข้อมูลที่เหลือจะเป็น Normal

</section>

<section id="horizon-and-models">

## เมื่อรวมผลตอบแทนหลายวัน

เมื่อรวมผลตอบแทนหลายวัน รูปการแจกแจงอาจเข้าใกล้ Normal ภายใต้เงื่อนไข central limit theorem เช่น variance จำกัดและ dependence ที่ไม่รุนแรงเกินไป แต่จำนวนวันเท่าใดจึงใกล้พอขึ้นกับข้อมูล โดยเฉพาะความแม่นที่ต้องการตรงหาง การเห็น monthly kurtosis ใกล้ 3 ไม่ได้พิสูจน์ว่า daily returns เป็น Normal

GBM ที่มีพารามิเตอร์คงที่อย่างในบทก่อนอธิบาย volatility clustering ไม่ได้ เราอาจขยายแบบจำลอง continuous-time ให้ volatility เปลี่ยนตามเวลา หรือใช้แบบจำลอง discrete-time อย่าง ARCH/GARCH ที่ให้ conditional variance ตอบสนองต่อข้อมูลอดีต

สำหรับ VaR/ES การเปลี่ยนจาก unconditional SD หนึ่งค่าไปใช้ volatility ที่คาดการณ์ ณ วันนั้นจะเปลี่ยนความเสี่ยงที่รายงาน การเลือก distribution ของ standardized shocks ก็ยังมีผลต่อหาง ส่วนการปรับสูตรราคา Option ต้องพิจารณาความน่าจะเป็นสำหรับการตั้งราคาและ volatility risk premium เพิ่มเติม ไม่สามารถนำผลประมาณภายใต้ physical measure ไปแทน risk-neutral dynamics ทั้งชุดทันที

</section>

<section id="high-frequency">

## เมื่อหนึ่งวันมีราคาหลายพันค่า

ข้อมูลซื้อขายระหว่างวันมีทั้งราคา bid, ask และ transaction price ผู้ซื้ออาจซื้อที่ ask ผู้ขายอาจขายที่ bid และบางธุรกรรมเกิดระหว่างสองราคา ระยะห่างระหว่างรายการซื้อขายไม่คงที่ บางนาทีอาจไม่มี trade แต่มีการปรับ quote หลายครั้ง

การคำนวณผลตอบแทนจาก trade ทุกคู่จึงผสมการเคลื่อนของมูลค่ากับผลของ bid–ask spread ตัวอย่างมูลค่าแฝงอยู่ที่ 100 คงที่ แต่ราคา trade สลับ 99.99 กับ 100.01 จะให้ผลตอบแทนสลับบวกและลบ ทั้งที่ราคาแฝงไม่ได้เปลี่ยน การเห็น short-lag correlation ติดลบในข้อมูลแบบนี้ยังไม่ใช่กลยุทธ์กำไรหลังหัก spread

ก่อนคำนวณต้องเลือกว่าใช้ราคาซื้อขายจริง ราคากึ่งกลาง bid–ask หรือ quote ฝั่งใด แล้วจัดเขตเวลาและ daylight saving ให้ตรงกัน พร้อมทำเครื่องหมายราคาที่ค้างจากครั้งก่อนและแยกช่วงตลาดเปิดกับปิด การเติมราคาล่าสุดในนาทีที่ไม่มีการซื้อขายอาจเพิ่มผลตอบแทนศูนย์จำนวนมาก ส่วน tick size ทำให้ราคาขยับเป็นขั้น

Stylized facts ที่เห็นในรายวันยังพบในข้อมูลระหว่างวันได้ แต่ microstructure มีอิทธิพลมากขึ้นตามความถี่ การดู dependence ยังต้องคำนึงถึงเวลาในวัน เพราะนาทีใกล้เปิดตลาดกับนาทีกลางวันอาจมีสเกลความผันผวนต่างกันซ้ำทุกวัน

</section>

<section id="intraday-seasonality">

## จังหวะในวันและข่าวที่ออกตามเวลา

หลายตลาดมี volatility สูงใกล้เปิดหรือปิดตลาด และมีจุดสูงขึ้นรอบข่าวเศรษฐกิจบางรายการ รูปแบบขึ้นกับตลาด ตารางซื้อขาย และช่วงที่ศึกษา ตลาด FX ตลอดวันยังมีช่วงที่ผู้ค้าจากหลายภูมิภาคทำงานทับกัน จึงไม่ควรใช้รูป U หรือเวลาออกข่าวชุดเดียวกับทุกตลาด

ตัวอย่างในงานของ Taylor แยกผลของเวลาเปิดตลาด ข่าวเศรษฐกิจ และช่วงที่ตลาดต่างประเทศเปิดซ้อนกัน เวลาที่บันทึกในตัวอย่างเก่าเป็นข้อมูลของตลาดและช่วงศึกษานั้น การเปรียบเทียบข้ามประเทศต้องจัดการช่วงที่เปลี่ยน daylight saving คนละวันด้วย

ให้ \(v_j\) เป็น variance ของผลตอบแทนช่วง j ที่ประมาณจากหลายวัน สัดส่วน variance ภายในช่วงเปิดตลาดคือ

$$
a_j=\frac{v_j}{\sum_{k=1}^{M}v_k},\qquad \sum_{j=1}^{M}a_j=1.
$$

สมมติว่าผลตอบแทนแต่ละช่วงไม่มี covariance ต่อกัน และ variance รวมตลอดช่วงเปิดตลาดของวันเป้าหมายเท่ากับ h เราจะจัด variance ให้ช่วง j ตามสัดส่วนนี้ได้เป็น \(h a_j\) ส่วน SD เท่ากับ \(\sqrt h\sqrt{a_j}\)

หากผลตอบแทนระหว่างช่วงมี covariance ต้องบวกพจน์เหล่านั้นด้วย จึงจะได้ variance ของผลตอบแทนรวมตลอดช่วงเปิดตลาด

<div class="portfolio-figure" tabindex="0" role="group" aria-label="สัดส่วน variance สมมติใน 78 ช่วงระหว่างวัน เลื่อนแนวนอนเพื่อดูภาพเต็ม">

![สัดส่วน variance สมมติ 78 ช่วง ช่วงละห้านาที เปรียบเทียบ profile พื้นฐานกับ profile ที่เพิ่มน้ำหนักใกล้เวลาข่าว โดยแต่ละเส้นรวมเป็น 100%](assets/images/stylized-intraday-profile.svg)

</div>
<p class="figure-caption">สร้าง profile สมมติจากเส้นลดลงหลังเปิดตลาด เส้นเพิ่มขึ้นก่อนปิด และส่วนที่สูงขึ้นใกล้ช่วงที่ 31 แล้ว normalize ให้แต่ละชุดรวมเป็น 100% เส้นนี้แสดงการจัดสัดส่วนเท่านั้น ไม่ได้อ้างว่า variance รวมของวันข่าวเท่ากับวันอื่น และเวลาในภาพไม่ใช่ตารางประกาศข่าวจริง</p>

ความเคลื่อนไหวหลังข่าวขึ้นกับส่วนที่ต่างจากความคาดหวัง ไม่ใช่เพียงตัวเลขที่ประกาศหรือจำนวนพาดหัวข่าว หากจะศึกษาผลของข่าว ต้องเก็บ announcement time, ค่าที่ประกาศ และค่าคาดการณ์ที่มีอยู่ก่อนข่าวให้ตรงกัน ดูตัวอย่างการแยก news surprise ใน [Andersen, Bollerslev, Diebold และ Vega (2003)](https://public.econ.duke.edu/~boller/research.html)

</section>

<section id="realized-variance">

## วัดความผันผวนระหว่างวันด้วย realized variance

ให้ \(r_{t,j}\) เป็น log return ระหว่างสองราคาที่เก็บต่อกันในวัน t ใช้ N ช่วงย่อย เรานิยาม

$$
\operatorname{RV}_t=\sum_{j=1}^{N}r_{t,j}^2,\qquad
\operatorname{RVol}_t=\sqrt{\operatorname{RV}_t}.
$$

[Realized variance](glossary.html#realized-variance) มีหน่วยเป็นผลตอบแทนยกกำลังสอง ส่วน realized volatility หรือ realized SD มีหน่วยเดียวกับผลตอบแทน ชื่อ RV ในงานบางชิ้นใช้เรียกไม่เหมือนกัน จึงควรอ่านนิยามก่อนเทียบตัวเลข บทนี้สงวน RV ไว้สำหรับผลรวมกำลังสอง

ตัวอย่าง log returns ภายในวันเป็น 1%, −1%, 1%, −1% จะรวมได้ศูนย์ ราคาจึงกลับมาที่เดิม แต่ \(\operatorname{RV}=4(0.01)^2=0.0004\) และ \(\sqrt{\operatorname{RV}}=2\%\) การยกกำลังสองผลตอบแทนต้น–ปลายวันจะให้ศูนย์ เพราะไม่เห็นการแกว่งระหว่างทาง

<div class="portfolio-figure" tabindex="0" role="group" aria-label="ราคาสมมติสองเส้นจบที่เดิมแต่ realized volatility ต่างกัน เลื่อนแนวนอนเพื่อดูภาพเต็ม">

![ราคาสมมติเริ่มและจบที่ 100 ทั้งสองเส้น เส้นที่มี log returns สลับบวกลบ 1% ให้ realized volatility 2% ส่วนเส้นบวกลบ 0.2% ให้ 0.4%](assets/images/stylized-close-vs-rv.svg)

</div>
<p class="figure-caption">ทั้งสองเส้นมีผลตอบแทนย่อยสี่ช่วง และผลตอบแทนต้น–ปลายวันเป็นศูนย์เหมือนกัน คำนวณ √RV จากค่าทศนิยม แล้วจึงแปลงเป็นเปอร์เซ็นต์</p>

สำหรับ log price ที่เป็น continuous semimartingale และไม่มี measurement noise เมื่อเก็บถี่ขึ้น RV จะลู่เข้า quadratic variation ซึ่งเท่ากับ integrated variance \(\int\sigma_s^2ds\) ของช่วงนั้น หากมี jumps ขีดจำกัดจะรวมกำลังสองของขนาด jump ด้วย

$$
\operatorname{RV}_t\ \longrightarrow\
\int_t^{t+1}\sigma_s^2\,ds+\sum_{t<s\leq t+1}(\Delta\log P_s)^2.
$$

ความเชื่อมโยงกับ quadratic variation อธิบายไว้ในบท [Applied Stochastic Calculus](applied-stochastic-calculus.html) ส่วนการใช้ realized measures ประมาณและพยากรณ์ volatility พัฒนาต่อใน [Andersen, Bollerslev, Diebold และ Labys (2003)](https://econ.duke.edu/~boller/Published_Papers/ecta_03.pdf)

RV ที่คำนวณจากข้อมูลช่วงตลาดเปิดครอบคลุมเฉพาะช่วงนั้น หากคูณ \(\sqrt{252}\) เพื่อแปลงเป็นรายปี เช่น จาก 1% เป็นประมาณ 15.87% ก็ยังไม่รวมความเสี่ยงข้ามคืน การแปลงนี้อาศัยสมมติฐานเรื่องการปรับสเกลและจำนวนวันซื้อขาย

เราอาจบวก overnight return ยกกำลังสองเพื่อรวมการเปลี่ยนแปลงข้ามคืนได้บางส่วน แต่ยังขาดรายละเอียดการเคลื่อนไหวระหว่างทาง

</section>

<section id="microstructure-noise">

## ราคาถี่ขึ้นมีทั้งข้อมูลเพิ่มและ noise เพิ่ม

ให้ \(p_j^*\) เป็น log price แฝง และราคาที่สังเกตเป็น \(p_j=p_j^*+\epsilon_j\) โดย \(\epsilon_j\) แทน [microstructure noise](glossary.html#microstructure-noise) สมมติ noise มีค่าเฉลี่ยศูนย์ variance \(\eta^2\) เป็นอิสระข้ามเวลาและจากราคาแฝง จะได้ observed return

$$
r_j=\Delta p_j^*+\epsilon_j-\epsilon_{j-1}.
$$

ผลต่าง noise มี variance \(2\eta^2\) ดังนั้นบน sampling grid ที่มี N ช่วง

$$
\mathbb E[\operatorname{RV}_{\rm observed}]
=\mathbb E[\operatorname{RV}_{\rm latent}]+2N\eta^2.
$$

เมื่อเก็บราคาถี่ขึ้น N เพิ่ม ส่วน bias จาก noise จึงเพิ่มตามในแบบจำลองนี้ ถ้า latent returns ไม่มี serial covariance ส่วน noise ยังทำให้ covariance ของผลตอบแทนติดกันเท่ากับ \(-\eta^2\) ได้ งานเรื่องการเลือก sampling frequency จึงต้องพิจารณาทั้งความละเอียดและ microstructure noise ดู [Aït-Sahalia, Mykland และ Zhang, *How Often to Sample a Continuous-Time Process…*](https://www.nber.org/papers/w9611)

<div id="realized-volatility-lab"></div>
<noscript><p>ตัวทดลองใช้ราคาแฝงจำลอง 390 นาทีและ noise ±3 bps ที่แต่ละ log price เมื่อเก็บทุก 5 นาที มี 78 ผลตอบแทนและส่วนเพิ่มของ E[RV] จาก noise เท่ากับ 0.00001404 คำนวณเส้นทางเดิมได้ใน Notebook</p></noscript>

เมื่อ noise เป็นศูนย์ การเก็บถี่ขึ้นช่วยประมาณ integrated variance ภายใต้สมมติฐานของโมเดลได้ แต่ RV บนเส้นทางเดียวไม่จำเป็นต้องขยับเข้าหาค่าจริงทีละขั้นอย่างสม่ำเสมอ เมื่อ noise ไม่เป็นศูนย์ การเลือกข้อมูลถี่ที่สุดก็อาจเพิ่มความผิดพลาด ยังมีวิธีอย่าง subsampling, realized kernels และ pre-averaging สำหรับจัดการปัญหานี้ โดยแต่ละวิธีมีเงื่อนไขของตนเอง

</section>

<section id="standardized-returns">

## หารด้วย volatility แล้วเหลืออะไร

เมื่อรวมช่วง volatility สูงกับต่ำ ผลตอบแทนดิบอาจมีหางหนามาก การหารด้วย volatility ของแต่ละช่วงช่วยลดความต่างของสเกล ในข้อมูลที่ Taylor ยกมา realized volatility มีการแจกแจงเบ้ขวา ส่วน standardized returns ใกล้ Normal มากขึ้น ผลที่ได้ยังขึ้นกับสินทรัพย์ วิธีประมาณ และช่วงข้อมูล

ถ้าใช้ \(\sqrt{\operatorname{RV}_t}\) ซึ่งคำนวณจากราคาตลอดวัน t ตัวหารจะรู้ได้เมื่อจบวัน การดู \(r_t/\sqrt{\operatorname{RV}_t}\) จึงเป็นการวิเคราะห์ย้อนหลัง หากต้องการตั้ง VaR ก่อนวันเริ่ม ต้องใช้ \(\widehat\sigma_{t\mid t-1}\) ที่ประมาณได้จากข้อมูลก่อนหน้านั้น

$$
z_t^{\rm forecast}=\frac{r_t-\widehat\mu_{t\mid t-1}}{\widehat\sigma_{t\mid t-1}}.
$$

จากนั้นตรวจ distribution และ ACF ของทั้ง \(z_t\) กับ \(z_t^2\) เพื่อดูว่าโมเดลอธิบายความสัมพันธ์ที่ต้องการได้แค่ไหน นอกจากนี้ผลตอบแทนและ RV ต้องครอบคลุมช่วงเวลาเดียวกัน การหาร close-to-close return ด้วย open-to-close realized volatility จะมี overnight component อยู่ในตัวเศษเพียงด้านเดียว

ACF ของ volatility ที่ลดลงช้าเป็นลักษณะ persistence ที่ควรตรวจต่อ แต่กราฟ ACF เส้นเดียวแยก true long memory ออกจาก structural breaks หรือการผสมหลายสภาวะได้ไม่เด็ดขาด และการเห็น log volatility ดูใกล้ Normal ก็ยังไม่พิสูจน์ว่า volatility เป็น Lognormal ทุกช่วงเวลา

</section>

<section id="news-and-jumps">

## เหตุการณ์สั้น ๆ ที่ข้อมูลรายวันมองไม่เห็น

ใน Flash Crash วันที่ 6 พฤษภาคม 2010 ราคาสินทรัพย์สหรัฐฯ เคลื่อนลงและฟื้นกลับภายในวัน ราคาปิดจึงบอกได้เพียงส่วนหนึ่งของเหตุการณ์ รายงานร่วม [CFTC และ SEC (2010)](https://www.sec.gov/news/studies/2010/marketevents-report.pdf) ใช้ข้อมูลธุรกรรมและการทำงานของตลาดเพื่อศึกษาลำดับเหตุการณ์ระหว่างวัน

ข้อมูลความถี่สูงยังช่วยตรวจการเปลี่ยนแปลงรวดเร็วที่อาจเป็น price jump แต่จุดโดดในกราฟอาจมาจากข้อมูลผิด quote ที่ล้าสมัย หรือ spread ที่กว้างขึ้นด้วย การสรุปว่ามี jump ต้องอาศัยการตรวจข้อมูลและวิธีทดสอบที่คำนึงถึง noise กับ sampling frequency

ในแบบจำลองที่มี jumps RV จะนับกำลังสองของ jumps รวมอยู่ด้วย หากโจทย์ต้องการแยก continuous variation ออกจาก jump variation ต้องใช้ estimator เพิ่ม เช่น bipower variation ภายใต้เงื่อนไขของวิธีนั้น แทนการเรียก RV ทั้งก้อนว่า diffusion variance

เมื่อนำข้อมูลระหว่างวันไปพยากรณ์ความผันผวนวันถัดไป ให้ทดสอบกับข้อมูลนอกช่วงฝึก การเปรียบเทียบโมเดลต้องใช้ระยะเวลาพยากรณ์เดียวกัน และให้แต่ละโมเดลใช้ข้อมูลที่รู้ได้ ณ เวลาเดียวกัน

</section>

<section id="exercises">

## ทดลองและตรวจคำตอบ

1. ซื้อหุ้นที่ 100 ปลายช่วงราคา 99 และได้รับปันผล 2 คำนวณ simple return กับ log return แล้วอธิบายว่าทำไมใช้ price return อย่างเดียวจึงได้เครื่องหมายต่างกัน
2. ในตัวทดลอง clustering สับลำดับวันแล้วเทียบ mean, SD, kurtosis และ ACF ของ |r| สถิติใดเปลี่ยน และสถิติใดเก็บข้อมูลเกี่ยวกับลำดับเวลาไว้?
3. เลื่อนอัตราส่วน SD ของ mixture เป็น 1 แล้วคำนวณ kurtosis จากสูตร ลองอธิบายว่าถ้าสุ่มเลือกสภาวะใหม่ทุกวันอย่างอิสระ หางหนายังอยู่ได้โดยไม่มี clustering อย่างไร
4. คำนวณ RV และ √RV จาก log returns 1%, −1%, 1%, −1% แล้วเทียบกับการเก็บเฉพาะราคาต้น–ปลายวัน
5. เมื่อ noise ของ log price เป็น ±3 bps อย่างอิสระ จงหาส่วนเพิ่มของ E[RV] ถ้าใช้ 390 ผลตอบแทน เทียบกับ 78 ผลตอบแทน โดยไม่เปลี่ยนระยะเวลาของวัน

<details class="extension"><summary>เปิดแนวคำตอบ</summary>

ข้อ 1 simple return เท่ากับ 1% และ log return เท่ากับ \(\log(1.01)\approx0.9950\%\) ส่วนราคาดิบลด 1% เพราะยังไม่ได้รวมปันผล

ข้อ 2 mean, SD, kurtosis และ histogram เท่าเดิมทุกค่า การสับลำดับเปลี่ยนคู่ข้อมูลที่ใช้หา ACF จึงเปลี่ยนสถิติที่วัดความสัมพันธ์ข้ามเวลา

ข้อ 3 เมื่อ SD เท่ากัน variance ของ \(\sigma^2\) เป็นศูนย์ จึงได้ κ=3 ส่วนการสุ่มสภาวะแบบอิสระยังสร้าง mixture marginal ได้ แต่ไม่ได้สร้าง persistence ของสภาวะ

ข้อ 4 RV=0.0004 และ √RV=2% ส่วนผลตอบแทนต้น–ปลายวันเป็นศูนย์

ข้อ 5 \(\eta=0.0003\) ให้ \(2(390)\eta^2=0.0000702\) กับ \(2(78)\eta^2=0.00001404\) ในหน่วยทศนิยม² ต่างกันห้าเท่า ตัวเลขนี้เป็นส่วนเพิ่มของค่าคาดหมายภายใต้โมเดล noise ไม่ใช่ความต่างที่ต้องเกิดพอดีทุกเส้นทาง

</details>

[ดาวน์โหลด Python Notebook](notebooks/asset-returns-stylized-facts.ipynb) เพื่อคำนวณ returns, ACF, Box–Pierce/Ljung–Box, mixture kurtosis, intraday profile และ realized variance ใช้ seed และวิธีคำนวณเดียวกับตัวทดลอง พร้อมภาพที่ฝังไว้ในไฟล์ ใช้ Python standard library ได้โดยไม่ต้องดาวน์โหลดราคาตลาด

</section>

<section id="sources">

## อ่านเพิ่มเติม

- Stephen J. Taylor, *Asset Price Dynamics, Volatility, and Prediction* (2005), บท 2, 4 และ 12 · [บทนำจาก Princeton University Press](https://assets.press.princeton.edu/chapters/i8055.pdf)
- Benoit Mandelbrot, [*The Variation of Certain Speculative Prices* (1963)](https://oftp.cyrax.hu/doc/mandelbrot.pdf), โดยเฉพาะข้อสังเกตเรื่องการเกิดกลุ่มของความผันผวนในหน้า 418
- NIST, [*Autocorrelation Plot*](https://www.itl.nist.gov/div898/handbook/eda/section3/eda331.htm), นิยาม sample ACF และกรอบอ้างอิง
- Andersen, Bollerslev, Diebold และ Labys, [*Modeling and Forecasting Realized Volatility* (2003)](https://econ.duke.edu/~boller/Published_Papers/ecta_03.pdf)
- Aït-Sahalia, Mykland และ Zhang, [*How Often to Sample a Continuous-Time Process in the Presence of Market Microstructure Noise*](https://www.nber.org/papers/w9611), working paper 2003, ตีพิมพ์ในปี 2005
- CFTC และ SEC, [*Findings Regarding the Market Events of May 6, 2010*](https://www.sec.gov/news/studies/2010/marketevents-report.pdf), รายงานวันที่ 30 กันยายน 2010

</section>
