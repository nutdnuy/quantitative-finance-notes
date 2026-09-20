---
title: The Magnificent Jump · ตอนที่ 3
description: Variance Gamma Process — บทความต้นฉบับโดย สุรพัศ หอมชุ่ม · Math Nerd
notebook: notebooks/the-magnificent-jump.ipynb
author: สุรพัศ หอมชุ่ม · Math Nerd
author_profile: false
---

<link rel="stylesheet" href="assets/magnificent-jump.css">

# The Magnificent Jump · ตอนที่ 3

<p class="vg-byline">สุรพัศ หอมชุ่ม · Math Nerd · <a href="https://qc-variance-gamma-model.nutdnuy.chatgpt.site/">อ่านต้นฉบับ</a></p>

<nav class="vg-series-nav" aria-label="The Magnificent Jump — สามตอน"><a href="magnificent-jump-intro.html">ตอนที่ 1 · Intro</a><a href="magnificent-jump-random-clock.html">ตอนที่ 2 · นาฬิกาสุ่ม (random clock)</a><a href="magnificent-jump-variance-gamma.html" aria-current="page">ตอนที่ 3 · Variance Gamma Process</a></nav>

<div class="vg-original">

<div class="vg-source-block" data-source-block="40"><p>เราเรียก stochastic process ที่เกิดจากการยัดนาฬิกาสุ่ม gamma เข้าไปใน Brownian Motion ว่า ‘Variance Gamma Process’ โดยสิ่งสําคัญที่สุดก่อนที่จะไปสร้าง model คือเราต้องทําความรู้จักเจ้า Variance Gamma Process กันก่อน</p></div>

<div class="vg-source-block" data-source-block="41"><h2 id="variance-gamma">Variance Gamma Process</h2></div>

<div class="vg-source-block" data-source-block="42"><p>เราทราบกันแล้วว่าตัว Variance Gamma Process นั้นเกิดจาก stochastic processes ทั้งหมดสองอันคือ</p></div>

<div class="vg-source-block" data-source-block="43"><ol class="numbered detailed"><li><strong>Gamma Process</strong> — เป็น process ของเจ้านาฬิกาสุ่ม τ โดยมีการแจกแจงแบบ gamma distribution ตามเวลา ซึ่ง gamma process มี probability density function (PDF) ดังนี้<figure aria-label="สมการต้นฉบับ" class="equation" role="group" tabindex="0"><div>f<sub>t</sub>(τ) =<!-- --> <span class="frac"><span>(μ/ν)<sup>μ²t/ν</sup> · τ<sup>μ²t/ν − 1</sup> · exp(−μτ/ν)</span><span>Γ(μ²t/ν)</span></span>, τ &gt; 0</div></figure><p>โดย fₜ คือ PDF ของนาฬิกาสุ่ม τ</p></li><li><strong>Brownian Motion</strong> — เป็น process ดั้งเดิมที่เหล่า Quants ค้นพบว่าไม่เพียงพอในการทํา models โดยมีการแจกแจงแบบ normal distribution ตามเวลา ซึ่ง Brownian Motion โดยปกติจะมี PDF ดังนี้<figure aria-label="สมการต้นฉบับ" class="equation" role="group" tabindex="0"><div>N<sub>t</sub>(x) =<!-- --> <span class="frac"><span>1</span><span>σ√(2πt)</span></span> <!-- -->exp<span class="paren">−<span class="frac"><span>(x − θt)²</span><span>2σ²t</span></span></span>, x∈ℝ, t &gt; 0</div></figure><p>โดยที่ t เป็นเวลาปกติ ซึ่งพอเราปลี่ยน t เป็นเวลาสุ่ม τ จะได้ว่า</p><figure aria-label="สมการต้นฉบับ" class="equation" role="group" tabindex="0"><div>N<sub>τ</sub>(x) =<!-- --> <span class="frac"><span>1</span><span>σ√(2πτ)</span></span> <!-- -->exp<span class="paren">−<span class="frac"><span>(x − θτ)²</span><span>2σ²τ</span></span></span>, x∈ℝ, τ &gt; 0</div></figure></li></ol></div>

<div class="vg-source-block" data-source-block="44"><p>ใน research paper ที่ผมอ้างอิง เขากําหนดให้ μ = 1 *** ใน PDF ของ Gamma Process และ Brownian Motion ที่นํามาใช้จะเพิ่มตัวแปร drift θ และ ความผันผวน (Volatility) σ เข้าไปด้วย</p></div>

<div class="vg-source-block" data-source-block="45"><p>จากนั้นเราจะได้ว่า PDF ของ Variance Gamma Process ซึ่งเกิดจากการยัดนาฬิกาสุ่ม τ เข้าไปใน Brownian Motion with drift ดังนี้</p></div>

<div class="vg-source-block" data-source-block="46"><figure aria-label="สมการต้นฉบับ" class="equation" role="group" tabindex="0"><div>G<sub>t</sub>(x) = ∫<sub>0</sub><sup>∞</sup> <span class="paren"><span class="frac"><span>1</span><span>σ√(2πτ)</span></span> <!-- -->exp<span class="paren">−<span class="frac"><span>(x − θτ)²</span><span>2σ²τ</span></span></span></span><span class="paren"><span class="frac"><span>(1/ν)<sup>t/ν</sup> · τ<sup>t/ν − 1</sup> · exp(−τ/ν)</span><span>Γ(t/ν)</span></span></span> <!-- -->dτ, x∈ℝ, τ &gt; 0</div></figure></div>

<div class="vg-source-block" data-source-block="47"><p>โดยที่ Gₜ(x) คือ PDF ของ Variance Gamma Process เราจะเห็นว่า Gₜ(x) เกิดจากการอินทิเกรตตัวแปร τ ตั้งแต่ 0 ถึง ∞ ดังนั้นฟังก์ชัน Gₜ(x) จะเป็นฟังก์ชันของตัวแปร t (เวลาที่ไม่สุ่ม) กับ x (ในที่นี้จะแทน log-return ดังที่จะกล่าวต่อไปในไม่กี่อึดใจ)</p></div>

<div class="vg-source-block" data-source-block="48"><p>ถึงตอนนี้หลายท่านอาจจะงงว่าอะไรคือตัวแปร drift θ กับตัวแปร Volatility σ ผมต้องท้าวความก่อนว่าปกติ Brownian Motion ที่มี mean=0 และ variance= t เราจะเรียกว่า Standard Brownian Motion จะเขียนอยู่ในรูป B(t) แต่ในกรณีที่เราจะปรับตัว mean ให้ไม่เท่ากับศูนย์เราจะบวกตัวแปร ‘drift’ เข้าไปเรียกว่า Brownian Motion with drift และเพิ่มเติมจาก drift เราจะคูณตัวแปร Volatility σ (ในที่นี้คือค่า standard deviation ของ Normal Distribution) เข้าไปใน Brownian Motion เพื่อสะท้อนความเป็นจริงมากที่สุด ซึ่งจะเขียนในรูป</p></div>

<div class="vg-source-block" data-source-block="49"><figure aria-label="สมการต้นฉบับ" class="equation" role="group" tabindex="0"><div>θt + σB(t)</div></figure></div>

<div class="vg-source-block" data-source-block="50"><p>โดยที่ค่า mean ของ Brownian Motion with drift คือ E(θt+σB(t))=θt และค่า Variance คือ Var(θt+σB(t))=σ²t นั่นเอง และเวลายัดนาฬิกาสุ่ม gamma เข้าไปเพื่อสร้าง Variance Gamma Process เราก็ยัดนาฬิกาสุ่มเข้าไปในตัว drift ด้วยเป็น</p></div>

<div class="vg-source-block" data-source-block="51"><figure aria-label="สมการต้นฉบับ" class="equation" role="group" tabindex="0"><div>θτ + σB(τ)</div></figure></div>

<div class="vg-source-block" data-source-block="52"><aside class="note">Note : อีกหัวข้อหนึ่งที่เป็นหัวข้อสําคัญมากใน models ประเภท jump processes คือ ความรู้เรื่อง Levy Measure และ Characteristic Function แต่เพื่อไม่ให้โพสต์ยาวเกินไป ผมจะละเรื่องนี้เอาไว้</aside></div>

<div class="vg-source-block" data-source-block="53"><h2>การสร้าง Model จําลองราคาหุ้นโดยใช้ Variance Gamma Process</h2></div>

<div class="vg-source-block" data-source-block="54"><p>ในหัวข้อนี้เราจะมาสร้าง model จําลองราคาหุ้นโดยใช้ Variance Gamma Process กัน ซึ่งผมจะเปรียบเทียบตัว Variance Gamma Model กับ Geometric Brownian Motion Model (เป็นตัวอย่าง Model ที่ใช้ Brownian Motion และยังเป็น Model ที่ใช้ในการตั้งราคา option ใน formula ก้องโลกอย่าง Black-Schole Formula) เป็นระยะๆ เพื่อให้ผู้อ่านเห็นภาพความแตกต่างชัดเจนยิ่งขึ้น</p></div>

<div class="vg-source-block" data-source-block="55"><div class="equation-pair"><figure aria-label="สมการต้นฉบับ" class="equation" role="group" tabindex="0"><figcaption>Geometric Brownian Motion Model</figcaption><div>dS<sub>t</sub> = θS<sub>t</sub>dt + σS<sub>t</sub>dB(t)</div></figure><figure aria-label="สมการต้นฉบับ" class="equation" role="group" tabindex="0"><figcaption>Variance Gamma Model</figcaption><div>dS<sub>t</sub> = mS<sub>t</sub>dt + S<sub>t</sub>dX(τ; θ,σ)</div></figure></div></div>

<div class="vg-source-block" data-source-block="56"><p>ใน Variance Gamma Model</p></div>

<div class="vg-source-block" data-source-block="57"><dl class="parameters"><div><dt>m</dt><dd>คือ อัตราค่าเฉลี่ยของผลตอบแทนของหุ้นในหนึ่งหน่วยเวลา</dd></div><div><dt>Sₜ</dt><dd>คือ ราคาหุ้น ณ เวลา t ใดๆ</dd></div><div><dt>X(τ; θ,σ) หรือ Xₜ</dt><dd>คือ Variance Gamma Process ที่เกิดจากการยัดนาฬิกาสุ่ม Gamma τ เข้าไปใน Brownian Motion with drift ที่มี ตัวแปร drift คือ θ และตัวแปร volatility คือ σ</dd></div></dl></div>

<div class="vg-source-block" data-source-block="58"><p>ต่อไปผมจะเป็นค่า Mean, Variance, Skewness และ Kurtosis ของ Variance Gamma Process:</p></div>

<div class="vg-source-block" data-source-block="59"><div class="moments"><span>Variance Gamma Process, X(τ; θ,σ,μ = 1)</span><figure aria-label="สมการต้นฉบับ" class="equation" role="group" tabindex="0"><figcaption>Mean</figcaption><div>θt</div></figure><figure aria-label="สมการต้นฉบับ" class="equation" role="group" tabindex="0"><figcaption>Variance</figcaption><div>(θ²ν + σ²)t</div></figure><figure aria-label="สมการต้นฉบับ" class="equation" role="group" tabindex="0"><figcaption>Skewness</figcaption><div><span class="frac"><span>(2θ³ν² + 3σ²θν)t</span><span>((θ²ν + σ²)t)<sup>3/2</sup></span></span></div></figure><figure aria-label="สมการต้นฉบับ" class="equation" role="group" tabindex="0"><figcaption>Kurtosis</figcaption><div><span class="frac"><span>(3σ⁴ν + 12σ²θ²ν² + 6σ⁴ν³)t + (3σ⁴ + 6σ²θ²ν + 3σ⁴ν²)t²</span><span>((θ²ν + σ²)t)²</span></span></div></figure></div></div>

<div class="vg-source-block" data-source-block="60"><p>จะเห็นได้ชัดเจนว่า kurtosis และ skewness ถูกควบคุมโดยตัวแปร ν และ μ=1 เพิ่มเติมจากตัวแปร θ และ σ ใน Geometric Brownian Motion</p></div>

<div class="vg-source-block" data-source-block="61"><h2 id="option-pricing">การตั้งราคา Option โดยใช้ Variance Gamma Process</h2></div>

<div class="vg-source-block" data-source-block="62"><p>โดยปกติทุกคนอาจจะคุ้นเคยกับสูตร Black-Schole Formula ซึ่งเกิดจาก Geometric Brownian Motion กันเป็นอย่างดี คราวนี้เรามาดูกันว่าถ้าเปลี่ยนจาก Geometric Brownian Motion เป็น Variance Gamma Model ตัวสูตรจะหน้าตาเป็นอย่างไร ซึ่งผมจะบอกข่าวดีก็คือ</p></div>

<div class="vg-source-block" data-source-block="63"><ul class="dash-list"><li>จาก paper ที่ผมใช้อ้างอิง เราสามารถเขียน formula ของราคา option โดยใช้ Variance Gamma Model ได้หรือก็คือมันมี closed form นั่นเอง ซึ่งในหลายๆ models ที่ซับซ้อนเราไม่สามารถเขียนตัวสูตรของราคา option ได้</li><li>เราสามารถหาสูตรราคา options ของ Variance Gamma Model โดยใช้ Black-Schole formula เป็นตัวตั้งตอนเริ่มได้ ซึ่งจะช่วยได้เยอะ เราจะมาดูกันว่าทํายังไง</li></ul></div>

<div class="vg-source-block" data-source-block="64"><p>ผมต้องบอกก่อนว่า options ที่เราจะกําหนดราคานี้เป็น European call option ที่จ่าย pay-off ในวันหมดอายุของสัญญาเท่านั้น หลักการตั้งราคา option มีดังนี้</p></div>

<div class="vg-source-block" data-source-block="65"><ol class="numbered detailed"><li>เราต้องรู้ pay-off ของ option ก่อนซึ่งในที่นี้คือ<figure aria-label="สมการต้นฉบับ" class="equation" role="group" tabindex="0"><div>max(S<sub>T</sub> − K, 0)</div></figure><p>โดย T คือ เวลาที่สัญญาหมดอายุ K คือ ราคา strike ฟังก์ชัน max(∙) ใส่มาเพื่อระบุว่า ถ้าหากราคาหุ้น ณ เวลาหมดสัญญาตํ่ากว่าราคา Strike ตัว pay-off ของสัญญาจะถือว่ามีค่าเป็น 0</p></li><li>เราต้องการหาราคาของ European options ณ เวลา t ใดๆ ซึ่งถ้าเกิดเรารู้อนาคตว่าราคาหุ้น ณ วันหมดอายุสัญญา S<sub>T</sub>เป็นเท่าไรแล้วราคาของ Options ก็ควรจะเป็น pay-off ณ วันหมดอายุคูณกลับมาด้วยปริมาณดอกเบี้ยทบต้น<figure aria-label="สมการต้นฉบับ" class="equation" role="group" tabindex="0"><div>e<sup>−r(T−t)</sup>(S<sub>T</sub> − K); S<sub>T</sub> &gt; K</div></figure><p>แต่ปัญหาคือเนื่องจากราคาหุ้น S นั้นเป็น Stochastic Process ซึ่งไม่แน่นอน เราไม่สามารถรู้ได้ว่าาราคาหุ้น ณ เวลาหมดสัญญา S<sub>T</sub> นั้นจะมีค่าเท่าไรเพราะเราไม่รู้อนาคต สิ่งที่เราจะทําได้คือหาค่าเฉลี่ย (mean) หรือ Expected Value ดังนั้นราคา option ณ เวลา t ใดๆควรจะเป็น (แต่ยังไม่ใช่)</p><figure aria-label="สมการต้นฉบับ" class="equation" role="group" tabindex="0"><div>C<sub>t</sub> = e<sup>−r(T−t)</sup>E(S<sub>T</sub> − K | ℱ<sub>t</sub>); S<sub>T</sub> &gt; K</div></figure><p>C<sub>t</sub> คือ ราคาของ European Call Option ณ เวลา t ใดๆ สัญลักษณ์ ℱ<sub>t</sub> เป็นสัญลักษณ์ใน Measure Theory หมายถึงว่าตอนนี้เรามีข้อมูลอยู่ถึงแค่ ณ เวลา t</p></li><li>(ข้อนี้สําคัญที่สุด) ปัญหายังไม่ได้หมดแค่นี้เพราะในการกําหนดราคา Option เราต้องการที่จะหา ‘ราคาที่ป็นกลาง’ หรือก็ราคาที่ไม่ทําให้เกิด arbitrage จากการ trade ตัว Option และหุ้น ซึ่งเราจําเป็นที่จะต้องใช้หลัก Measure Theory เข้ามาช่วย โดยในที่นี้เราจะต้องเปลี่ยนจาก statistical measure เป็น risk neutral measure เพื่อทําให้<figure aria-label="สมการต้นฉบับ" class="equation" role="group" tabindex="0"><div>e<sup>−r(T−t)</sup>E(S<sub>T</sub> − K | ℱ<sub>t</sub>)</div></figure>มีสมบัติเป็น martingale *** ซึ่งผมจะละการเปลี่ยน measure เอาไว้ เพราะมันจะกินเนื้อที่เยอะเกินไปมาก โดยหลังจากเปลี่ยนเป็น risk-neutral measure แล้ว Variance Gamma model ของเราจะเปลี่ยนไปสักหน่อย จาก<figure aria-label="สมการต้นฉบับ" class="equation" role="group" tabindex="0"><div>dS<sub>t</sub> = mS<sub>t</sub>dt + S<sub>t</sub>dX(τ; θ,σ)</div></figure>เป็น<figure aria-label="สมการต้นฉบับ" class="equation" role="group" tabindex="0"><div>dS<sub>t</sub> = rS<sub>t</sub>dt + S<sub>t</sub>dX(τ; θ<sub>RN</sub>,σ<sub>RN</sub>)</div></figure><p>จะเห็นได้ว่หลังจากเปลี่ยน measure แล้ว อัตราผลตอบแทนของหุ้นในหนึ่งหน่วยเวลาถูกเปลี่ยนจาก m เป็นให้เท่ากับอัตราดอกเบี้ย r และ ตัว parameter ถูกเปลี่ยนจาก θ และ σ เป็น θ<sub>RN</sub> และ σ<sub>RN</sub> เพราะ ใน Variance Gamma Model ค่า parameters หลังจากเปลี่ยน measure แล้วจะมีค่าเปลี่ยนไป</p></li></ol></div>

<div class="vg-source-block" data-source-block="66"><aside class="note">*** Paper ของ Harrison and Kreps ชื่อ ‘Martingale and Arbitrage in Multiperiod Securities Markets’ ได้พิสูจน์แล้วว่า การที่เราจะตั้งตัวราคา Options ไม่ให้เกิด arbitrage ก็ต่อเมื่อตัว models ของราคาหุ้นต้องมีสมบัติเป็น martingale แต่ใน statistical measure ตัว model ของเราไม่ใช่ martingale เราจึงต้องใช้เทคนิคการเปลี่ยน measure เป็น risk-neutral measure หรือในภาพใหญ่กว่าคือ martingale measure (risk neutral measure คือ measure ที่ rate of return ของราคาหุ้นเท่ากับอัตราดอกเบี้ยซึ่งสอดคล้องกับหลักการ Efficient Market Hypothesis แต่ว่า risk neutral measure เป็นเพียงหนึ่งในบรรดา martingale measure เท่านั้น ในการที่จะตั้งราคา option ไม่ให้เกิด arbitrage ในโลกความจริงที่เป็น incomplete market เราต้องการเพียง martingale ไม่จําเป็นต้องเป็น risk neutral measure ก็ได้)</aside></div>

<div class="vg-source-block" data-source-block="67"><p>เพราะฉะนั้นสมการตั้งราคา จะเป็น</p></div>

<div class="vg-source-block" data-source-block="68"><figure aria-label="สมการต้นฉบับ" class="equation" role="group" tabindex="0"><div>C<sub>t</sub> = e<sup>−r(T−t)</sup>E<sup>Q</sup>(S<sub>T</sub> − K | ℱ<sub>t</sub>); S<sub>T</sub> &gt; K</div></figure></div>

<div class="vg-source-block" data-source-block="69"><p>โดย E<sup>Q</sup> หมายถึง expected value ที่คิดจาก risk neutral measure</p></div>

<div class="vg-source-block" data-source-block="70"><p>มาถึงคราวนี้เราจะหาตัว formula ของ C<sub>t</sub> กัน ดังจะเห็นได้จาก pdf ของ variance gamma process หาได้จากการอินทิเกรตของผลคูณระหว่าง pdf ของ Brownian Motion (ซึ่งก็คือ Normal Distribution) กับ pdf ของ Gamma Process ของนาฬิกาสุ่ม ข่าวดีคือในกรณีที่ข้างในอินทิเกรตมีแค่ Brownian Motion อย่างเดียวตัว Expected Value ของราคา Option ก็คือ Black-Schole Formula นั่นเอง เราจึงสามารถนํา Black-Schole Formula มาช่วยในการอินทิเกรตหา Formula ของ Variance Gamma option price ผ่านการเปลี่ยนรูปตัวแปรได้ดังนี้</p></div>

<div class="vg-source-block" data-source-block="71"><figure aria-label="สมการต้นฉบับ" class="equation" role="group" tabindex="0"><div>C<sub>t</sub> = e<sup>−r(T−t)</sup>E<sup>Q</sup>(S<sub>T</sub> − K | ℱ<sub>t</sub>); S<sub>T</sub> &gt; K<br/><span class="equals-line">= ∫<sub>0</sub><sup>∞</sup> c(g)<!-- --> <span class="frac"><span>g<sup>t/ν−1</sup> exp(−g/ν)</span><span>ν<sup>t/ν</sup> Γ(t/ν)</span></span> <!-- -->dg</span></div></figure></div>

<div class="vg-source-block" data-source-block="72"><p>โดยที่</p></div>

<div class="vg-source-block" data-source-block="73"><figure aria-label="สมการต้นฉบับ" class="equation" role="group" tabindex="0"><div>c(g) = S(0)(1 − c<sub>1</sub>)<sup>t/ν</sup> exp(c<sub>1</sub>g/ν) N<span class="paren"><span class="frac"><span>d</span><span>√g</span></span> <!-- -->+ (α+s)√g</span><br/><span class="equals-line">− K exp(−rt)(1 − c<sub>2</sub>)<sup>t/ν</sup> exp(c<sub>2</sub>g/ν) N<span class="paren"><span class="frac"><span>d</span><span>√g</span></span> <!-- -->+ α√g</span></span></div></figure></div>

<div class="vg-source-block" data-source-block="74"><p>ทั้งนี้ c<sub>1</sub> = ν(α+s)²/2, c<sub>2</sub> = να²/2 และ N() หมายถึง Cumulative Distribution Function (CDF) ของ Normal Distribution ซึ่ง c(g) เป็น Black-Schole Typed Formula (เกิดจากการดัดแปลงตัว Black-Schole formula)</p></div>

<div class="vg-source-block" data-source-block="75"><p>เมื่อเราอินทิเกรตต่อจะได้ว่า</p></div>

<div class="vg-source-block" data-source-block="76"><figure aria-label="สมการต้นฉบับ" class="equation" role="group" tabindex="0"><div>C<sub>t</sub> = S(0) Ψ<span class="paren"><span class="frac"><span>d√(1−c₁)</span><span>√ν</span></span>, (α+s)√<span class="frac"><span>ν</span><span>1−c₁</span></span>, t/ν</span><br/><span class="equals-line">− Ke<sup>−rt</sup> Ψ<span class="paren"><span class="frac"><span>d√(1−c₂)</span><span>√ν</span></span>, α√<span class="frac"><span>ν</span><span>1−c₂</span></span>, t/ν</span></span></div></figure></div>

<div class="vg-source-block" data-source-block="77"><p>โดยที่ d = (1/s)[ln(S(0)/K) + rt + (t/ν) ln((1−c₁)/(1−c₂))] และ</p></div>

<div class="vg-source-block" data-source-block="78"><p>Ψ() คือ modified Bessel’s function of the second kind (ฟังก์ชันนี้มีอยู่ใน library เช่น Python (Scipy) หรือมีเป็น built-in ใน Matlab และ C++)</p></div>

<div class="vg-source-block" data-source-block="79"><p>และในที่สุดเราก็ได้ closed-form formula ของ C<sub>t</sub>ดังที่ใจปราถนา</p></div>

<div class="vg-source-block" data-source-block="80"><h2 id="limitations">ข้อเสียของ Variance Gamma Model</h2></div>

<div class="vg-source-block" data-source-block="81"><blockquote class="compact-quote"><p>“All models are wrong but some are useful.”</p><cite>George E.P . Box</cite></blockquote></div>

<div class="vg-source-block" data-source-block="82"><p>ทุก models เป็นเพียงเครื่องมือที่ใช้จําลองโลกความจริง ซึ่งโลกความจริงนั้นซับซ้อนมาก ไม่มีทางเลยที่จะมี models ไหนไร้ที่ติ ตัว Variance Gamma Model ของเราก็เหมือนกัน ข้อเสียของ Variance Gamma Model มีหลักๆอยู่ 2 ประการดังนี้</p></div>

<div class="vg-source-block" data-source-block="83"><ol class="numbered detailed"><li><strong>Constant Volatility</strong> — เราจะเห็นได้ว่าในตัว Variance Gamma Model มี parameter ของ volatility เท่ากับ σ ซึ่งเป็นค่าคงที่ แต่ในความเป็นจริง volatility ในตลาดหุ้นมีสมบัติเป็น Stochastic Process เช่นเดียวกับตัวราคาหุ้นเลย เพราะฉะนั้นด้วยเหตุนี้ตัว Variance Gamma Model จึงอธิบายได้แค่การเปลี่ยนแปลงของราคาหุ้นแต่อธิบายการเปลี่ยนแปลงของ volatility ไม่ได้ ด้วยเหตุนี้ Variance Gamma Model (รวมถึง jump models ทุกประเภทที่มี volatility เป็นค่าคงที่) จึงเหมาะสําหรับใช้ในการตั้งราคา short-term option หรือ option ที่มีเวลาหมดอายุสัญญาไม่เกิน 3 เดือนเท่านั้น แต่ไม่เหมาะอย่างยิ่งในการตั้งราคา long-term option ที่ volatility จะมีผลมากๆ (ใน long-term ตัว models ที่มี volatility เป็น Stochastic process อาจจะเหมาะสมกว่า เช่น Heston model และ SVJ model เป็นต้น)</li><li><strong>Specific Jump Activity</strong> — การ jumps ในตลาดทุกครั้งมี ประเถท ของ jump activity อยู่ ซึ่งจะมีอยู่ด้วยกันหลักๆ คือ 4 ประเภท แต่ใน Variance Gamma Model อธิบายได้แค่ jump activity ประเภทเดียวคือประเภท infinite activity with finite variation ซึ่งในโลกความเป็นจริง jump activity อาจจะเป็นประเภทอื่น (ปัญหานี้สามารถแก้ได้ด้วยการใช้ CGMY model ที่เป็น general case ของ Variance Gamma Model)</li></ol></div>

<div class="vg-source-block" data-source-block="84"><div class="signature"><span>สุรพัศ หอมชุ่ม Math Nerd</span><small>ลูกสมุนของ นัท QC</small></div></div>

</div>

<section class="vg-visual" aria-label="Viz เพิ่มเติม">

## Viz เพิ่มเติม

<div class="vg-chart" tabindex="0" role="group" aria-label="กราฟประกอบ เลื่อนแนวนอนได้">
<img src="assets/images/magnificent-jump-drift.svg" alt="Viz เพิ่มเติม · จำลอง X(T) = θG + σ√G Z โดย G เป็น Gamma(shape = T/ν, scale = ν) และ Z เป็น Standard Normal ที่เป็นอิสระจาก G ใช้ T = 1, ν = 0.4, σ = 0.2, μ = 1 และ θ = −0.15, 0, 0.15 จำนวน 160,000 ตัวอย่างต่อค่า θ, seed = 2026092003 เป็น histogram จากข้อมูลจำลอง ไม่ใช่ผล fit ตลาดหรือการคำนวณราคา Option" width="1000" height="480" loading="lazy">
</div>

Viz เพิ่มเติม · จำลอง X(T) = θG + σ√G Z โดย G เป็น Gamma(shape = T/ν, scale = ν) และ Z เป็น Standard Normal ที่เป็นอิสระจาก G ใช้ T = 1, ν = 0.4, σ = 0.2, μ = 1 และ θ = −0.15, 0, 0.15 จำนวน 160,000 ตัวอย่างต่อค่า θ, seed = 2026092003 เป็น histogram จากข้อมูลจำลอง ไม่ใช่ผล fit ตลาดหรือการคำนวณราคา Option

[แบบจำลองอ้างอิงสำหรับ Viz: Madan, Carr & Chang (1998)](https://engineering.nyu.edu/sites/default/files/2018-09/CarrEuropeanFinReview1998.pdf)

</section>

<nav class="vg-series-nav" aria-label="The Magnificent Jump — สามตอน"><a href="magnificent-jump-intro.html">ตอนที่ 1 · Intro</a><a href="magnificent-jump-random-clock.html">ตอนที่ 2 · นาฬิกาสุ่ม (random clock)</a><a href="magnificent-jump-variance-gamma.html" aria-current="page">ตอนที่ 3 · Variance Gamma Process</a></nav>

[ดาวน์โหลด Notebook รวม 3 ตอน](notebooks/the-magnificent-jump.ipynb)
