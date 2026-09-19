---
title: Martingale Pricing — Black–Scholes อีกมุมหนึ่ง
description: จาก self-financing และการเปลี่ยนมาตรวัด P เป็น Q สู่ Girsanov, numeraire, Feynman–Kac และสูตรราคาที่รวมปันผล พารามิเตอร์ตามเวลา และ Options on Futures
notebook: notebooks/martingale-pricing.ipynb
visual_route: no-image-generator
inline_math: true
---

<h1 id="martingale-pricing-title">Martingale Pricing — Black–Scholes อีกมุมหนึ่ง</h1>

<p class="lead">ทำไมราคา Option จึงคำนวณจากค่าเฉลี่ยได้ และต้องเฉลี่ยภายใต้ความน่าจะเป็นแบบไหน?</p>

ในบท [Black–Scholes Model](black-scholes-model.html) เราใช้ Delta hedge ตัดความเสี่ยงจากการขยับของหุ้น แล้วใช้ no-arbitrage สร้างสมการราคา บทนี้จะเดินเข้าหาผลลัพธ์เดียวกันผ่าน **ความน่าจะเป็น** โดยอธิบายว่าทำไมการคิดลด payoff คาดหมายจึงให้ราคาที่สอดคล้องกับพอร์ตเลียนแบบ

หัวใจคือการเลือกทั้ง **หน่วยที่ใช้วัดมูลค่า** และ **มาตรวัดความน่าจะเป็น** ให้สอดคล้องกัน เมื่อใช้บัญชีเงินสดเป็นหน่วยวัดและใช้มาตรวัด Q ที่เหมาะสม มูลค่าพอร์ตเลียนแบบจะเป็น martingale เราจึงถอยจาก payoff วันหมดอายุกลับมาหาราคาวันนี้ได้

อ่านโดยมีพื้นฐาน [Itô’s lemma](applied-stochastic-calculus.html#ito-lemma) และ [พอร์ต self-financing](glossary.html#self-financing) หากยังไม่คุ้นกับสัญลักษณ์ความน่าจะเป็น ให้เริ่มจากตัวอย่างสองสถานะและห้องทดลอง แล้วค่อยกลับมาอ่าน Girsanov ทุกตัวเลขในบทเป็นตัวอย่างสมมติ ไม่ใช่ราคาตลาดจริง

<section id="pricing-question">

## ค่าเฉลี่ยเดียวกัน แต่ใช้คนละน้ำหนัก

ทบทวนตัวอย่างหุ้น 100 ที่อีกหนึ่งวันเป็น 101 หรือ 99, Call มี strike 100 และดอกเบี้ย 0% ถ้าเชื่อว่าราคาขึ้นด้วยความน่าจะเป็นจริง p=0.6 จะได้ payoff คาดหมาย 0.6 แต่พอร์ตหุ้นครึ่งหน่วยกับเงินกู้ 49.5 เลียนแบบ payoff 1/0 ได้ด้วยต้นทุน **0.5**

$$
V_0=0.5(100)-49.5=0.5,\qquad
V_T=0.5S_T-49.5\in\{1,0\}.
$$

น้ำหนักสำหรับตั้งราคาจึงเป็น q=0.5 ซึ่งทำให้ราคาหุ้นคาดหมายเท่ากับ 100 และ payoff คาดหมายเท่ากับ 0.5 การเปลี่ยน p ไม่ได้เปลี่ยนต้นทุนพอร์ตที่ให้ผลลัพธ์เดียวกันทุกสถานะ ดูขั้นตอนใน [Binomial Model](binomial-model.html)

ในเวลาต่อเนื่อง เราเรียกมาตรวัดที่อธิบายความน่าจะเป็นจริงว่า **P** และมาตรวัดสำหรับตั้งราคาที่ใช้บัญชีเงินสดเป็นหน่วยวัดว่า **Q** ส่วน q ตัวเล็กยังหมายถึงน้ำหนักขึ้นในต้นไม้ Binomial ตามเดิม

| สิ่งที่ถาม | มาตรวัดที่ใช้ | สิ่งที่ได้ |
|---|---|---|
| ภายใต้แบบจำลองจริง หุ้นหรือ P&L มีโอกาสเป็นอย่างไร? | P | การคาดการณ์ การประเมินความเสี่ยง |
| payoff ที่เลียนแบบได้ควรมีราคาเท่าไร? | Q ที่สอดคล้องกับ numeraire | มูลค่าที่สอดคล้องกับ no-arbitrage |

Q ไม่ได้แปลว่าผู้ลงทุนทุกคนไม่กลัวความเสี่ยง และไม่ได้บอกให้แก้สมมติฐานผลตอบแทนจริงของหุ้นเป็น r

</section>

<section id="market-and-information">

## ตลาดเล็ก ๆ และข้อมูลที่รู้ ณ เวลา t

ให้ \(\mathcal F_t\) เป็นข้อมูลที่ทราบถึงเวลา t เช่น เส้นทางราคาที่เกิดขึ้นแล้ว ลำดับของชุดข้อมูลนี้เรียกว่า [filtration](glossary.html#filtration) กลยุทธ์ซื้อขายต้องใช้ข้อมูลที่มีอยู่ขณะตัดสินใจ ไม่ใช้ราคาที่จะเกิดในอนาคต

เริ่มด้วยหุ้นไม่มีปันผลและบัญชีเงินสด:

$$
dB_t=rB_t\,dt,\quad B_0=1,\quad B_t=e^{rt},
$$

$$
dS_t=\mu S_t\,dt+\sigma S_t\,dW_t^{P}.
$$

S คือราคาหุ้นต่อหน่วย, B คือมูลค่าบัญชีเงินสดเริ่มต้นหนึ่งหน่วย, r คือดอกเบี้ยทบต้นต่อเนื่องต่อปี, μ คืออัตราผลตอบแทนคาดหมายของหุ้นต่อปี และ σ คือ volatility ต่อรากปี เราวัดเวลาเป็นปี โดย \(\tau=T-t\) เป็นเวลาที่เหลือจน Option หมดอายุ

สมมติให้ r, μ, σ คงที่, σ>0, ซื้อขายได้ต่อเนื่องและเป็นเศษหน่วยได้, short และกู้ยืมได้, ไม่มีค่าธรรมเนียมหรือข้อจำกัดสภาพคล่อง และตลาดไม่มี arbitrage ใช้ filtration ที่สร้างจาก Brownian motion แหล่งเดียว สำหรับส่วนขยายท้ายบทจะเปลี่ยนสมมติฐานบางข้ออย่างชัดเจน

สัญญา European จ่าย \(H=G(S_T)\) ที่เวลา T เช่น Call จ่าย \((S_T-K)^+\) โดย \(x^+=\max(x,0)\) ค่า H เป็น **payoff** ยังไม่ได้หัก premium หรือดอกเบี้ยของเงินที่ใช้ซื้อ Option

</section>

<section id="self-financing-pricing">

## Self-financing: เปลี่ยนจำนวนหุ้นได้ แต่เงินต้องมาจากในพอร์ต

ให้พอร์ตถือหุ้น \(\Delta_t\) หน่วย และบัญชีเงินสด \(\beta_t\) หน่วย:

$$
V_t=\Delta_t S_t+\beta_t B_t.
$$

เงื่อนไข self-financing คือ

$$
dV_t=\Delta_t\,dS_t+\beta_t\,dB_t.
$$

กำไรขาดทุนมาจากสินทรัพย์ที่ถืออยู่ เมื่อเพิ่มจำนวนหุ้น ต้องจ่ายด้วยเงินสดในพอร์ตหรือกู้เพิ่มในบัญชีเดียวกัน ตัวอย่างหุ้นราคา 100 เปลี่ยนจาก 0.50 เป็น 0.60 หน่วย ต้องนำเงินสด 10 ไปซื้อหุ้น มูลค่ารวม ณ ราคานั้นจึงไม่เพิ่มขึ้นเพราะการสับเปลี่ยน holdings

สมการนี้เป็น **เงื่อนไขของกลยุทธ์** ไม่ใช่การหาอนุพันธ์ของ \(\Delta_tS_t\) แล้วละทิ้งพจน์ \(d\Delta_t\) โดยไม่มีเหตุผล ทดลองการปรับหุ้นกับเงินสดได้ใน [ห้องทดลอง Delta hedge](black-scholes-model.html#discrete-hedging)

Arbitrage ในกรอบนี้คือกลยุทธ์ที่เริ่มด้วย V₀=0, ปลายทางไม่ขาดทุนด้วยความน่าจะเป็นหนึ่ง และมีโอกาสบวกที่จะได้กำไร เราจำกัดกลยุทธ์ให้เป็น **admissible** เช่น มูลค่าหลังคิดลดมีขอบเขตล่างตามเกณฑ์ที่กำหนด เพื่อไม่เปิดทางให้กลยุทธ์ทบเงินเดิมพันจนเป็นหนี้ได้ไม่จำกัด

</section>

<section id="discounted-martingale">

## ทำไมต้องหารราคาด้วยบัญชีเงินสด

ราคาหุ้น 100 วันนี้กับ 100 ปีหน้าไม่ใช่มูลค่า ณ เวลาเดียวกัน เราจึงเปลี่ยนหน่วยวัดเป็นจำนวนหน่วยบัญชีเงินสด:

$$
\widetilde S_t=\frac{S_t}{B_t}=e^{-rt}S_t.
$$

ใช้ product rule โดย B ไม่มีส่วน Brownian จะได้

$$
d\widetilde S_t=(\mu-r)\widetilde S_t\,dt+
\sigma\widetilde S_t\,dW_t^{P}.
$$

การ discount ลบส่วนเติบโต r ออก แต่ยังเหลือ drift μ−r จึงไม่ได้ทำให้หุ้นเป็น martingale ภายใต้ P โดยอัตโนมัติ

[Martingale](glossary.html#martingale) คือกระบวนการที่มีค่าคาดหมายสัมบูรณ์จำกัด และค่าคาดหมายในอนาคตเมื่อใช้ข้อมูลปัจจุบันเท่ากับค่าปัจจุบัน:

$$
\mathbb E^{Q}[M_u\mid\mathcal F_t]=M_t,\qquad u\ge t.
$$

เส้นทางของ M ยังขึ้นลงได้มาก เงื่อนไขนี้พูดถึง **ค่าเฉลี่ยแบบมีเงื่อนไข** ภายใต้มาตรวัดที่ระบุ ไม่ได้หมายความว่าราคาแต่ละเส้นทางคงที่

ถ้า S₀=100, μ=12%, r=5% และเวลา 1 ปี:

$$
\mathbb E^{P}[e^{-rT}S_T]=100e^{0.07}\approx107.2508.
$$

เราจะหามาตรวัด Q ที่ทำให้ค่าเฉลี่ยหลังคิดลดเท่ากับ 100 ซึ่งเข้ากับการวัดด้วยบัญชีเงินสด

</section>

<section id="girsanov">

## Girsanov: เปลี่ยนน้ำหนักของเส้นทาง

กำหนด [market price of risk](glossary.html#market-price-of-risk) ในกรณีไม่มีปันผลเป็น

$$
\theta=\frac{\mu-r}{\sigma}.
$$

สำหรับค่าคงที่นี้ ให้ density process

$$
Z_t=\exp\left(-\theta W_t^{P}-\frac12\theta^2t\right),\qquad
\left.\frac{dQ}{dP}\right|_{\mathcal F_t}=Z_t.
$$

Z คือ [Radon–Nikodym density](glossary.html#radon-nikodym-density) ที่ใช้ถ่วงน้ำหนักผลลัพธ์เดิม สำหรับตัวแปรสุ่ม X ที่เหมาะสม ณ เวลา T:

$$
\mathbb E^{Q}[X]=\mathbb E^{P}[Z_TX].
$$

Z เป็นบวกและมีค่าเฉลี่ยหนึ่ง เหตุการณ์ที่มีโอกาสศูนย์จึงยังมีโอกาสศูนย์เหมือนกันทั้งสองมาตรวัด เราเรียก P กับ Q ว่า **equivalent** แต่น้ำหนักของเหตุการณ์ที่เป็นไปได้เปลี่ยนได้

ทฤษฎีบท Girsanov บอกว่า

$$
W_t^{Q}=W_t^{P}+\theta t
$$

เป็น Brownian motion **ภายใต้ Q** แทน \(dW_t^{P}=dW_t^{Q}-\theta dt\) ในสมการหุ้น:

$$
dS_t=(\mu-\sigma\theta)S_t\,dt+\sigma S_t\,dW_t^{Q}
=rS_t\,dt+\sigma S_t\,dW_t^{Q}.
$$

ดังนั้น \(d\widetilde S_t=\sigma\widetilde S_t\,dW_t^{Q}\) และ discounted GBM นี้เป็น Q-martingale เส้นทางที่อธิบายยังเป็นตัวแปรสุ่ม S เดิม เราเปลี่ยนมาตรวัดที่ใช้เฉลี่ย ไม่ได้ทำให้ผลตอบแทนจริงของหุ้นเปลี่ยนจาก μ เป็น r

### ระวังเครื่องหมายและเงื่อนไข

ในบทนี้ Z ใช้เครื่องหมายลบหน้า θW ส่วน Wᴽ ใช้เครื่องหมายบวกหน้า θt ถ้าเปลี่ยนนิยาม θ เป็น (r−μ)/σ ต้องเปลี่ยนเครื่องหมายทั้งคู่ให้สอดคล้องกัน

ถ้า θ เปลี่ยนตามเวลาและสถานะ จะใช้

$$
Z_t=\exp\left(-\int_0^t\theta_u\,dW_u^{P}
-\frac12\int_0^t\theta_u^2\,du\right).
$$

เงื่อนไข Novikov

$$
\mathbb E^{P}\left[\exp\left(\frac12\int_0^T\theta_u^2\,du\right)\right]<\infty
$$

เป็นเงื่อนไข **เพียงพอ** ให้ Z เป็น true martingale สำหรับ θ คงที่และ T จำกัด ตรวจได้ทันที แต่ Novikov ไม่ใช่เงื่อนไขจำเป็นในทุกกรณี และการเห็นว่า SDE ไม่มี drift เพียงอย่างเดียวยังไม่รับประกัน true martingale ของกระบวนการทั่วไป

</section>

<section id="fundamental-pricing">

## จากพอร์ตเลียนแบบสู่ Fundamental Asset Pricing Formula

ให้ \(\widetilde V_t=V_t/B_t\) สำหรับพอร์ต self-financing เมื่อไม่มีปันผล:

$$
d\widetilde V_t=\Delta_t\,d\widetilde S_t
=\Delta_t\sigma\widetilde S_t\,dW_t^{Q}.
$$

สำหรับพอร์ตเลียนแบบที่ stochastic integral นี้เป็น true martingale เช่น มีเงื่อนไข square-integrability ที่เหมาะสม เราใช้ค่าคาดหมายแบบมีเงื่อนไขได้ ถ้าพอร์ตจ่าย H ที่เวลา T จะได้

$$
\frac{V_t}{B_t}=\mathbb E^{Q}\left[\frac{H}{B_T}\mid\mathcal F_t\right],
\qquad
\boxed{V_t=e^{-r(T-t)}\mathbb E^{Q}[H\mid\mathcal F_t]}.
$$

นี่คือราคาพอร์ตที่เลียนแบบ payoff ได้ ถ้า Option ราคาไม่เท่ากับพอร์ต เราซื้อด้านที่ถูกและขายด้านที่แพง ผลตอบแทนปลายทางหักล้างกัน เหลือส่วนต่างที่ขัดกับ no-arbitrage ภายใต้สมมติฐานตลาดที่ใช้

### ทำไมราคานี้มีเพียงค่าเดียวใน Black–Scholes

ในแบบจำลองนี้ Brownian motion มีแหล่งเดียวและหุ้นมี σ≠0 ภายใต้ Brownian filtration และเงื่อนไข integrability ที่เหมาะสม martingale representation ทำให้แปลง discounted payoff เป็นการถือหุ้นกับเงินสดได้ ตลาดจึง [complete](glossary.html#complete-market) สำหรับกลุ่ม claims ที่พิจารณา และ Q ของ numeraire นี้มีเพียงมาตรวัดเดียว

ตลาดที่มีแหล่งเสี่ยงซึ่งซื้อขายเพื่อ hedge ไม่ได้อาจมีหลาย Q ที่สอดคล้องกับ no-arbitrage ความไม่มี arbitrage เพียงอย่างเดียวจึงไม่ได้ให้ราคาเดียวสำหรับทุกสัญญาในทุกแบบจำลอง

</section>

<section id="measure-experiment">

## ลองเฉลี่ยภายใต้ P, Q และ P ที่ถ่วงน้ำหนัก

ห้องทดลองใช้หุ้นไม่มีปันผล S₀=K=100 และจำลองราคาปลายงวด GBM แบบ exact วิธีแรกเฉลี่ย payoff ภายใต้ P แล้ว discount ด้วย r; วิธีที่สองจำลองภายใต้ Q โดยตรง; วิธีที่สามใช้เส้นทาง P แล้วคูณ Z ก่อนเฉลี่ย

$$
\widehat V_{P\to Q}=\frac1n\sum_{i=1}^{n}
e^{-rT}Z_T^{(i)}(S_T^{P,(i)}-K)^+.
$$

ตัวประมาณนี้หารด้วย n ไม่ใช่ผลรวมน้ำหนัก เพราะ Z มี normalization ตามทฤษฎีอยู่แล้ว ในตัวอย่างจำกัด ค่าเฉลี่ย Z อาจไม่เท่ากับหนึ่งพอดี

<div id="measure-change-lab"></div>

ลองเปลี่ยน μ โดยคง r, σ และ T ไว้ **ราคา analytic ภายใต้ Q ต้องไม่เปลี่ยน** แต่ payoff คาดหมายภายใต้ P และน้ำหนัก Z เปลี่ยนได้ จากนั้นปรับ σ และดูว่าราคา Option เปลี่ยนอย่างไร

Standard error (SE) ที่แสดงวัดความคลาดเคลื่อนจากจำนวนตัวอย่าง ค่า Monte Carlo สองวิธีไม่จำเป็นต้องตรงกันพอดี และการเปลี่ยน μ อาจทำให้วิธีถ่วงน้ำหนักมีความแปรปรวนสูงขึ้น แม้คำตอบเชิงทฤษฎีเท่าเดิม การเพิ่มจำนวนตัวอย่างไม่ช่วยแก้ model error

</section>

<section id="call-expectation">

## กลับมาถึงสูตร Call ผ่าน Lognormal

ภายใต้ Q และเมื่อทราบ Sₜ ราคาปลายงวดเขียนเป็น

$$
S_T=S_t\exp\left[\left(r-\frac12\sigma^2\right)\tau
+\sigma\sqrt\tau\,\xi\right],\qquad \xi\sim N(0,1).
$$

กำหนด \(\Phi\) เป็น CDF ของ Standard Normal และ \(\varphi\) เป็น density ตั้ง

$$
d_2=\frac{\log(S_t/K)+(r-\tfrac12\sigma^2)\tau}{\sigma\sqrt\tau},
\qquad d_1=d_2+\sigma\sqrt\tau.
$$

Call มี payoff เมื่อ ξ>−d₂ เราจึงแยกค่าเฉลี่ยได้เป็น

$$
C_t=e^{-r\tau}\mathbb E^Q[S_T\mathbf1_{\{S_T>K\}}\mid\mathcal F_t]
-Ke^{-r\tau}Q(S_T>K\mid\mathcal F_t).
$$

พจน์ที่สองให้ \(Ke^{-r\tau}\Phi(d_2)\) ส่วนพจน์แรกใช้การ complete the square:

$$
e^{-\sigma^2\tau/2+\sigma\sqrt\tau z}\varphi(z)
=\varphi(z-\sigma\sqrt\tau).
$$

เมื่อเลื่อนขอบเขตอินทิกรัลจาก −d₂ ไปเป็น −d₁ จะได้

$$
\boxed{C_t=S_t\Phi(d_1)-Ke^{-r\tau}\Phi(d_2)}.
$$

Put ได้จาก put–call parity:

$$
P_t=Ke^{-r\tau}\Phi(-d_2)-S_t\Phi(-d_1),\qquad
C_t-P_t=S_t-Ke^{-r\tau}.
$$

สำหรับ S=K=100, r=5%, σ=20% และ τ=1 ปี ได้ d₁=0.35, d₂=0.15, Call≈10.4506 และ Put≈5.5735 ต่อหนึ่งหน่วยหุ้น สอดคล้องกับบท Black–Scholes เดิม

</section>

<section id="numeraire">

## ทำไม Φ(d₁) กับ Φ(d₂) จึงเป็นคนละความน่าจะเป็น

จากนิยามข้างต้น \(\Phi(d_2)=Q(S_T>K\mid\mathcal F_t)\) แต่ \(\Phi(d_1)\) ไม่ใช่ความน่าจะเป็นเดียวกันภายใต้ Q

เลือกหุ้นไม่มีปันผลเป็น [numeraire](glossary.html#numeraire) แทนบัญชีเงินสด เราจะได้มาตรวัด \(Q^S\) ที่มี density เทียบกับ Q:

$$
\left.\frac{dQ^S}{dQ}\right|_{\mathcal F_t}
=\frac{S_t/B_t}{S_0/B_0}.
$$

เส้นทางที่หุ้นมีมูลค่าสูงได้รับน้ำหนักมากขึ้นภายใต้มาตรวัดนี้ และ

$$
Q^S(S_T>K\mid\mathcal F_t)=\Phi(d_1).
$$

Call จึงเขียนได้เป็น \(S_t Q^S(S_T>K\mid\mathcal F_t)-Ke^{-r\tau}Q(S_T>K\mid\mathcal F_t)\) สองพจน์ใช้น้ำหนักคนละมาตรวัด แต่รวมกันเป็นราคาในหน่วยเงินเดียวกัน

| สัญญา | Payoff | ราคาวันนี้ เมื่อไม่มีปันผล |
|---|---|---|
| Cash-or-nothing Call จ่ายเงิน 1 | \(\mathbf1_{\{S_T>K\}}\) | \(e^{-r\tau}\Phi(d_2)\) |
| Asset-or-nothing Call จ่ายหุ้น 1 หน่วย | \(S_T\mathbf1_{\{S_T>K\}}\) | \(S_t\Phi(d_1)\) |
| Vanilla Call | \((S_T-K)^+\) | Asset binary − K × Cash binary |

ตัวอย่างเดิมให้ Φ(d₂)≈0.5596 และ Φ(d₁)≈0.6368 ราคา asset binary≈63.6831 ส่วน K เท่าของ cash binary≈53.2325 ผลต่างคือ Call≈10.4506 การนำ Φ(d₁) ไปเรียกว่าโอกาสใช้สิทธิภายใต้ Q หรือ P โดยไม่ระบุมาตรวัดจึงคลาดเคลื่อน

สูตรทั่วไปสำหรับ numeraire N คือ

$$
V_t=N_t\mathbb E^{Q^N}\left[\frac{H}{N_T}\mid\mathcal F_t\right].
$$

N ต้องเป็นสินทรัพย์หรือพอร์ต self-financing ที่ซื้อขายได้และเป็นบวกอย่างเคร่งครัด พร้อมเงื่อนไขให้การเปลี่ยนมาตรวัดถูกต้อง ไม่ใช่เลือกกระบวนการบวกใด ๆ มาหารราคาแล้วอ้างสูตรนี้ได้ทันที

</section>

<section id="feynman-kac">

## Feynman–Kac เชื่อมค่าเฉลี่ยกับ PDE

ให้ X ภายใต้ **มาตรวัดเดียวกับที่ใช้คาดหมาย** มี dynamics \(dX_u=a(u,X_u)du+b(u,X_u)dW_u\) ภายใต้เงื่อนไขความเรียบ การเติบโต และ integrability ที่เหมาะสม ฟังก์ชัน

$$
v(t,x)=\mathbb E\left[
e^{-\int_t^T c(u,X_u)du}g(X_T)\mid X_t=x\right]
$$

สัมพันธ์กับสมการ

$$
v_t+a(t,x)v_x+\frac12b(t,x)^2v_{xx}-c(t,x)v=0,
\qquad v(T,x)=g(x).
$$

ใน Black–Scholes ภายใต้ Q ใช้ a=rS, b=σS, c=r จึงได้

$$
V_t+rSV_S+\frac12\sigma^2S^2V_{SS}-rV=0,
\qquad V(T,S)=G(S).
$$

สมการตรงกับที่ได้จาก Delta hedge แต่ **Feynman–Kac ไม่ได้เลือก Q ให้เรา** ถ้าใส่ drift μ ภายใต้ P จะได้สมการสำหรับค่าคาดหมายภายใต้ P การได้ pricing measure ต้องมาจากเงื่อนไขตลาดและ no-arbitrage ก่อน

วิธีความน่าจะเป็นยังให้ข้อมูล hedge ได้ เมื่อหาฟังก์ชัน V แล้วใช้ Itô เปรียบเทียบส่วน Brownian จะได้ \(\Delta=V_S\) เหมือนเดิม วิธี PDE, Monte Carlo และสูตร analytic จึงเป็นเครื่องมือคำนวณที่เชื่อมกันภายใต้แบบจำลองเดียวกัน

</section>

<section id="dividends">

## หุ้นจ่ายปันผล: ต้องนับผลตอบแทนรวม

ให้ D เป็น **continuous dividend yield ต่อปี** ไม่ใช่เงินปันผลก้อนคงที่ และใช้ D แทน q เพื่อไม่ให้สับสนกับน้ำหนัก Binomial ในส่วนนี้กำหนด μ เป็น expected **total return** ภายใต้ P:

$$
dS_t=(\mu-D)S_t\,dt+\sigma S_t\,dW_t^P,
\qquad d\text{Gain}_t=dS_t+DS_t\,dt.
$$

ภายใต้ Q drift ของราคาหุ้นที่ไม่รวมปันผลเป็น r−D:

$$
dS_t=(r-D)S_t\,dt+\sigma S_t\,dW_t^Q.
$$

ตอนนี้ S/B เพียงอย่างเดียวไม่ใช่ Q-martingale เมื่อ D≠0 สิ่งที่เป็น martingale คือ discounted gains ซึ่งรวมปันผล:

$$
\frac{S_t}{B_t}+\int_0^t\frac{DS_u}{B_u}\,du.
$$

หรือใช้มูลค่าพอร์ตที่นำปันผลกลับไปลงทุนในหุ้น \(S_t^{\mathrm{TR}}=e^{Dt}S_t\) แล้วหารด้วย Bₜ เมื่อ D คงที่ จึงต้องระวังว่ากำลังใช้ ex-dividend price หรือ total-return asset เป็น numeraire

สูตรราคากลายเป็น

$$
C_t=S_te^{-D\tau}\Phi(d_1)-Ke^{-r\tau}\Phi(d_2),
$$

$$
d_1=\frac{\log(S_t/K)+(r-D+\tfrac12\sigma^2)\tau}{\sigma\sqrt\tau},
\qquad d_2=d_1-\sigma\sqrt\tau.
$$

ตัวอย่างเดิมเพิ่ม D=2% ได้ Call≈9.2270 และ Put≈6.3301 โดย \(C-P=Se^{-D\tau}-Ke^{-r\tau}\) สมมติฐาน continuous yield นี้ไม่ใช่แบบจำลองปันผลเงินสดก้อนที่จ่ายตามวัน ex-dividend

</section>

<section id="time-dependent-parameters">

## พารามิเตอร์เปลี่ยนตามเวลา: รวม variance ก่อนถอดราก

ถ้า r(u), D(u), σ(u) เป็นฟังก์ชันเวลา **ที่ทราบแน่นอน** ให้

$$
R=\int_t^T r(u)\,du,\qquad
Y=\int_t^T D(u)\,du,\qquad
A=\int_t^T\sigma(u)^2\,du.
$$

Y คือ yield สะสม ส่วน A คือความแปรปรวนสะสมของ log return ไม่ใช่ volatility เฉลี่ย ภายใต้ Q:

$$
\log(S_T/S_t)\sim N\left(R-Y-\frac12A,\ A\right).
$$

จึงได้

$$
C_t=S_te^{-Y}\Phi(d_1)-Ke^{-R}\Phi(d_2),
\qquad d_1=\frac{\log(S_t/K)+R-Y+A/2}{\sqrt A},
\quad d_2=d_1-\sqrt A.
$$

สูตรนี้เขียนสำหรับ A>0 ถ้า A=0 payoff ไม่สุ่มภายใต้ Q และราคา Call คือ \(\max(S_te^{-Y}-Ke^{-R},0)\)

ตัวอย่างครึ่งปีแรก r=4%, D=1%, σ=10% และครึ่งปีหลัง r=6%, D=3%, σ=30%:

$$
R=0.05,\qquad Y=0.02,\qquad
A=0.5(0.10)^2+0.5(0.30)^2=0.05.
$$

Volatility เทียบเท่าหนึ่งปีคือ \(\sqrt{A/1}\approx22.3607\%\) ไม่ใช่ค่าเฉลี่ยเลขคณิต 20% เพราะสิ่งที่บวกข้ามเวลาคือ variance ตัวอย่างนี้คำนวณราคาและตรวจ parity ได้ใน Notebook

ถ้า σ หรือ r เป็นตัวแปรสุ่ม สูตรที่แทนด้วยอินทิกรัล deterministic นี้ใช้ไม่ได้โดยอัตโนมัติ โดยเฉพาะดอกเบี้ยสุ่ม ตัว discount factor ต้องอยู่ในค่าคาดหมายตามกรอบที่ใช้

</section>

<section id="black-76">

## Black–76: Option บนราคา Futures

แยกเวลาสองตัวให้ชัด: T คือวันหมดอายุ **Option** และ U≥T คือวันครบกำหนด **Futures** ที่ Option อ้างอิง ให้ \(F_t=F(t,U)\) เป็นราคา Futures ณ เวลา t สัญญา European Call จ่าย \((F_T-K)^+\) ณ เวลา T

ในแบบจำลองอัตราดอกเบี้ย deterministic และหุ้นที่ใช้ cost-of-carry ได้ ราคา forward กับ futures ตรงกัน ถ้าไม่มีปันผลและ r คงที่จะได้ \(F(t,U)=S_te^{r(U-t)}\) หากมีปันผลต่อเนื่องคงที่ ใช้ r−D แทน r

ภายใต้ Q สมมติ Futures เป็น lognormal:

$$
dF_t=\sigma_F F_t\,dW_t^Q.
$$

Futures price ไม่มี drift rF ในสมการนี้ **F เป็นราคาอ้างอิง ไม่ใช่มูลค่าทั้งก้อนที่จ่ายเพื่อซื้อสัญญา Futures** กำไรขาดทุนจาก Futures เข้าบัญชีผ่าน settlement การตั้งพอร์ตต้องรวมเงินสดและ margin cash flows อย่างถูกต้อง

สำหรับสูตรถัดไปให้ r และ σF คงที่ พิจารณา European Option แบบชำระ premium ล่วงหน้าและจ่าย payoff ที่ T:

$$
C_t=e^{-r\tau}\left[F_t\Phi(d_1)-K\Phi(d_2)\right],
$$

$$
P_t=e^{-r\tau}\left[K\Phi(-d_2)-F_t\Phi(-d_1)\right],
$$

$$
d_1=\frac{\log(F_t/K)+\tfrac12\sigma_F^2\tau}{\sigma_F\sqrt\tau},
\qquad d_2=d_1-\sigma_F\sqrt\tau.
$$

เรียกว่า **Black–76** เวลาในสูตรคือ τ=T−t ส่วน U มีผลต่อราคา Futures และ volatility ของสัญญาที่เลือก ไม่ได้นำ U−t มาแทนเวลาหมดอายุ Option

ถ้า F=K=100, r=5%, σF=20%, τ=1 ราคา Call และ Put เท่ากันประมาณ **7.5771** และ parity คือ \(C-P=e^{-r\tau}(F-K)\) สมมติฐานนี้ไม่ครอบคลุม Futures ราคาติดลบหรือรูปแบบ Option ที่ settle ต่างออกไป ส่วนดอกเบี้ยสุ่มอาจทำให้ราคา futures ต่างจาก forward

<div id="pricing-extensions-lab"></div>

ลองสลับจาก Spot เป็น Futures โดยคงราคาอ้างอิง 100, strike 100 และพารามิเตอร์อื่นไว้ ค่า 100 ในสองโหมดเป็นคนละปริมาณ จึงไม่ควรคาดว่าราคาจะเท่ากัน ถ้าต้องการตรวจความเทียบเท่ากรณีส่งมอบที่วันหมดอายุ Option ให้ตั้ง \(F=Se^{(r-D)\tau}\) แล้วเทียบสูตรภายใต้สมมติฐานเดียวกัน

</section>

<section id="check-understanding">

## ลองตรวจความเข้าใจ

1. ถ้าเพิ่ม μ จาก 8% เป็น 12% โดยคง S, K, r, σ และ T ไว้ ราคา Black–Scholes เปลี่ยนหรือไม่? แล้ว payoff คาดหมายภายใต้ P ล่ะ?
2. S/B เป็น martingale ภายใต้ Q เมื่อหุ้นจ่าย continuous yield D=2% หรือไม่? ต้องเพิ่มอะไรเข้าไป?
3. Φ(d₁) และ Φ(d₂) ต่างกันเพราะอะไร? ทั้งสองเป็นโอกาสที่หุ้นขึ้นภายใต้ P หรือไม่?
4. σ เท่ากับ 10% ครึ่งปีและ 30% อีกครึ่งปี ให้ volatility หนึ่งปีเท่าไร?
5. Option หมดอายุใน 3 เดือน อ้างอิง Futures ครบกำหนดใน 9 เดือน ใช้ τ เท่าไรใน Black–76?

<details><summary>เปิดแนวคำตอบ</summary>

1. ราคา Q ไม่เปลี่ยน ส่วน payoff คาดหมายของ Call ภายใต้ P เพิ่มใน GBM นี้เมื่อ μ เพิ่ม
2. ไม่ใช่ ต้องใช้ discounted total gains หรือพอร์ตที่นำปันผลกลับมาลงทุนแล้ว discount
3. Φ(d₂) เป็นโอกาสจบ in-the-money ภายใต้ cash-account measure Q ส่วน Φ(d₁) ใช้ stock measure Qˢ ในกรณีไม่มีปันผล ทั้งคู่ไม่ใช่ความน่าจะเป็นจริง P โดยทั่วไป
4. \(\sqrt{0.5(0.1)^2+0.5(0.3)^2}=0.223607\) หรือประมาณ 22.3607% ต่อรากปี
5. τ=0.25 ปี ใช้ราคา Futures ของสัญญาอายุ 9 เดือนเป็น F ปัจจุบัน ส่วน volatility ต้องตรงกับ Futures นั้นและช่วง 3 เดือนของ Option

</details>

</section>

<section id="sources-and-notebook">

## ทดลองต่อและแหล่งอ่านประกอบ

[ดาวน์โหลด Python Notebook](notebooks/martingale-pricing.ipynb) เพื่อรันการเปลี่ยนมาตรวัด, Monte Carlo สองวิธี, cash/asset binary, พารามิเตอร์สองช่วง และ Black–76 ตัวอย่างใช้ seed ที่ระบุไว้และ Python standard library ผลสุ่มของ Python กับ JavaScript ไม่จำเป็นต้องตรงกัน แต่ต้องสอดคล้องกับสูตรและขอบเขต sampling error

บทนี้เรียบเรียงใหม่จากเอกสารประกอบการเรียน *Martingales Theory: Application to Option Pricing — Black-Scholes All Over Again* ของ CQF ที่ผู้ใช้ให้มา พร้อมตรวจสมการและคำนวณตัวอย่างใหม่ รายละเอียดแหล่งที่มา ขอบเขตหน้า และจุดที่ปรับแก้เก็บใน [บันทึกที่มา](data/martingale-pricing-provenance.json) โดยไม่เผยแพร่ PDF หรือภาพหน้าต้นฉบับ

อ่านกรอบ risk-neutral valuation และปันผลเพิ่มใน [Martin Haugh — The Black-Scholes Model](https://www.columbia.edu/~mh2078/FoundationsFE/BlackScholes.pdf) และศึกษาทฤษฎีการเปลี่ยนมาตรวัดใน [Gregory F. Lawler — Stochastic Calculus: An Introduction with Applications](https://www.math.uchicago.edu/~lawler/finbook.pdf) หัวข้อ Girsanov’s Theorem สูตรในบทขึ้นกับสมมติฐานการเลียนแบบและแบบจำลอง ไม่ใช่ข้อยืนยันว่าความเสี่ยงทุกชนิดในตลาดจริงป้องกันได้หมด

</section>
