"""Build and execute a source-aligned, standard-library martingale-pricing notebook."""
import contextlib
import hashlib
import io
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SLUG = "martingale-pricing"
BASE = "https://nutdnuy.github.io/quantitative-finance-notes/"

LABS = [
    (
        "## 1. เตรียมตัวคำนวณและหน่วย\n\n"
        "ทุกตัวเลขต่อไปนี้เป็นตัวอย่างสมมติ ราคามีหน่วยเงินต่อสินทรัพย์หนึ่งหน่วย "
        "เวลาเป็นปี อัตราดอกเบี้ยและ dividend yield เป็นอัตราทบต้นต่อเนื่องต่อปี "
        "ส่วน volatility เป็นค่าต่อรากปี โค้ดใช้ Python standard library เท่านั้น\n\n"
        "ฟังก์ชันหลักรับค่าที่สะสมตลอดอายุ Option: \\(R=\\int r(u)du\\), "
        "\\(Y=\\int D(u)du\\) และ \\(A=\\int\\sigma(u)^2du\\) "
        "ใช้ `Y` สำหรับ dividend yield สะสมตามสัญลักษณ์ในบท "
        "และใช้ `dividend` สำหรับ dividend yield ต่อปีในฟังก์ชันค่าคงที่",
        '''import math
import random
import statistics

def close(actual, expected, tolerance=1e-10):
    assert math.isclose(actual, expected, rel_tol=tolerance, abs_tol=tolerance), (actual, expected)

def normal_cdf(x):
    return 0.5 * math.erfc(-x / math.sqrt(2.0))

def normal_pdf(x):
    return math.exp(-0.5 * x * x) / math.sqrt(2.0 * math.pi)

def generalized_bs(S, K, R, Y, A):
    """European prices for deterministic rates, dividend yield and volatility.

    R and Y are integrated rates; A is integrated variance, not volatility.
    """
    if not all(math.isfinite(x) for x in (S, K, R, Y, A)):
        raise ValueError("Inputs must be finite")
    if S <= 0 or K <= 0 or A < 0:
        raise ValueError("Require S,K > 0 and integrated variance A >= 0")
    stock_pv, strike_pv = S * math.exp(-Y), K * math.exp(-R)
    if A == 0:
        return dict(call=max(stock_pv-strike_pv, 0.0),
                    put=max(strike_pv-stock_pv, 0.0), d1=None, d2=None)
    d1 = (math.log(S/K) + R - Y + 0.5*A) / math.sqrt(A)
    d2 = d1 - math.sqrt(A)
    return dict(call=stock_pv*normal_cdf(d1)-strike_pv*normal_cdf(d2),
                put=strike_pv*normal_cdf(-d2)-stock_pv*normal_cdf(-d1),
                d1=d1, d2=d2)

def black_scholes(S, K, r, dividend, sigma, tau):
    if sigma < 0 or tau < 0:
        raise ValueError("Require sigma,tau >= 0")
    return generalized_bs(S, K, r*tau, dividend*tau, sigma*sigma*tau)

def estimate(values):
    if len(values) < 2:
        raise ValueError("At least two samples are required for sample standard error")
    return statistics.fmean(values), statistics.stdev(values) / math.sqrt(len(values))

def report(label, values, target):
    mean, se = estimate(values)
    print(f"{label}: estimate={mean:.6f}, SE={se:.6f}, target={target:.6f}")
    print(f"  Approximate 95% sampling interval [{mean-1.96*se:.6f}, {mean+1.96*se:.6f}]")
    return mean, se

S0, K, mu, r, sigma, T = 100.0, 100.0, 0.12, 0.05, 0.20, 1.0
benchmark = black_scholes(S0, K, r, 0.0, sigma, T)
close(benchmark["call"], 10.450583572185565)
close(benchmark["put"], 5.573526022256971)
close(benchmark["call"]-benchmark["put"], S0-K*math.exp(-r*T))
close(black_scholes(100, 90, .05, 0, .2, 0)["call"], 10)
close(black_scholes(100, 100, .05, 0, 0, 1)["call"], 100-100*math.exp(-.05))
print(f"Analytical benchmark: Call={benchmark['call']:.9f}; Put={benchmark['put']:.9f}")
print("All examples are hypothetical; the notebook has no data downloads or third-party package requirements.")''',
    ),
    (
        "## 2. เปลี่ยนจาก P เป็น Q ด้วยน้ำหนัก Radon–Nikodym\n\n"
        "เริ่มด้วยหุ้นไม่มีปันผล \\(dS_t=\\mu S_tdt+\\sigma S_tdW_t^P\\) "
        "กำหนด \\(\\theta=(\\mu-r)/\\sigma\\) และ "
        "\\(Z_T=\\exp(-\\theta W_T^P-\\tfrac12\\theta^2T)\\) "
        "โดย \\(dQ/dP=Z_T\\) การคิดค่าเฉลี่ยภายใต้ P แล้วคูณน้ำหนักนี้ให้ "
        "\\(E_P[Z_TX]=E_Q[X]\\)\n\n"
        "ตรวจทั้ง \\(E_P[Z_T]=1\\), \\(E_P[Z_Te^{-rT}S_T]=S_0\\) และราคา Call "
        "แล้วเทียบกับการสุ่ม GBM ภายใต้ Q โดยตรง ตัวอย่างใช้สอง seed แยกกัน "
        "และใช้ค่าเฉลี่ย `sum(Z * discounted_payoff) / n` โดยไม่หารด้วยผลรวมของ `Z` "
        "การหารด้วยผลรวมของน้ำหนักจะเปลี่ยนเป็นอีก estimator หนึ่ง\n\n"
        "ช่วงที่รายงานเป็น normal approximation ของ sampling uncertainty ภายใต้โมเดล "
        "ไม่ได้ครอบคลุม model error และไม่ได้บังคับว่าทุกรอบต้องครอบคลุมราคาสูตร",
        '''theta = (mu-r) / sigma
paths, seed_p, seed_q = 100000, 2026091901, 2026091902
discount = math.exp(-r*T)
rng_p, rng_q = random.Random(seed_p), random.Random(seed_q)
weights, weighted_stock, weighted_call, naive_p_call = [], [], [], []
q_terminal, direct_q_call = [], []
max_pathwise_residual = 0.0
for _ in range(paths):
    Wp = math.sqrt(T) * rng_p.gauss(0.0, 1.0)
    Sp = S0 * math.exp((mu-0.5*sigma*sigma)*T + sigma*Wp)
    Z = math.exp(-theta*Wp - 0.5*theta*theta*T)
    weights.append(Z)
    weighted_stock.append(Z*discount*Sp)
    weighted_call.append(Z*discount*max(Sp-K, 0.0))
    naive_p_call.append(discount*max(Sp-K, 0.0))
    # This identity holds on every sampled P path, not only in expectation.
    rhs = S0*math.exp((sigma-theta)*Wp - 0.5*(sigma-theta)**2*T)
    max_pathwise_residual = max(max_pathwise_residual, abs(Z*discount*Sp-rhs))
    Wq = math.sqrt(T) * rng_q.gauss(0.0, 1.0)
    Sq = S0 * math.exp((r-0.5*sigma*sigma)*T + sigma*Wq)
    q_terminal.append(Sq)
    direct_q_call.append(discount*max(Sq-K, 0.0))

# Gaussian exponential moments establish these identities analytically.
close(math.exp(-0.5*theta*theta*T)*math.exp(0.5*theta*theta*T), 1.0)
close(S0*math.exp((mu-r-0.5*sigma*sigma-0.5*theta*theta)*T
                 +0.5*(sigma-theta)**2*T), S0)
assert max_pathwise_residual < 1e-10
assert all(z > 0 and math.isfinite(z) for z in weights)
print(f"theta={theta:.6f}; paths={paths:,}; P seed={seed_p}; Q seed={seed_q}; dividend yield=0")
report("E_P[Z_T]", weights, 1.0)
report("E_P[Z_T exp(-rT) S_T]", weighted_stock, S0)
p_price, p_se = report("Call via weighted P", weighted_call, benchmark["call"])
q_price, q_se = report("Call via direct Q", direct_q_call, benchmark["call"])
naive_mean, naive_se = estimate(naive_p_call)
print(f"Discounted physical expected payoff without Z: {naive_mean:.6f}, SE={naive_se:.6f}")
print("The last estimate is a physical expectation, not this model's no-arbitrage call premium.")
print(f"Weighted-P minus direct-Q={p_price-q_price:+.6f}; independent-draw SE={math.hypot(p_se,q_se):.6f}")
print(f"Maximum pathwise identity residual={max_pathwise_residual:.3e}")
print("Changing measure changes scenario weights; it does not remove volatility or make risky cash flows certain.")''',
    ),
    (
        "## 3. แยก Call เป็นขาสินทรัพย์กับขาเงินสด\n\n"
        "สมการ payoff คือ \\((S_T-K)^+=S_T1_{S_T>K}-K1_{S_T>K}\\) "
        "ดังนั้นราคา Call เท่ากับราคา asset-or-nothing ลบ \\(K\\) เท่าของราคา "
        "cash-or-nothing ที่จ่ายเงินหนึ่งหน่วย\n\n"
        "ในตัวอย่างไม่มีปันผล \\(N(d_2)=Q(S_T>K)\\) แต่ "
        "\\(N(d_1)=Q^S(S_T>K)\\) เมื่อเปลี่ยน numeraire จากบัญชีเงินสดมาเป็นหุ้น "
        "โดย \\(dQ^S/dQ=e^{-rT}S_T/S_0\\) สองค่านี้ใช้เหตุการณ์ exercise เดียวกัน "
        "แต่คนละ measure; ทั้งคู่ไม่ได้เป็นความน่าจะเป็นจริงภายใต้ P โดยอัตโนมัติ",
        '''d1, d2 = benchmark["d1"], benchmark["d2"]
q_exercise, stock_measure_exercise = normal_cdf(d2), normal_cdf(d1)
cash_binary = discount*q_exercise  # Pays one currency unit on exercise.
asset_binary = S0*stock_measure_exercise  # Pays one stock unit on exercise.
close(asset_binary-K*cash_binary, benchmark["call"])
stock_measure_density = [discount*s/S0 for s in q_terminal]
q_indicators = [float(s > K) for s in q_terminal]
stock_weighted_indicators = [z*event for z, event in zip(stock_measure_density, q_indicators)]
print(f"d1={d1:.6f}; d2={d2:.6f}")
print(f"Q exercise probability N(d2)={q_exercise:.9f}")
print(f"Stock-numeraire exercise probability N(d1)={stock_measure_exercise:.9f}")
print(f"One-unit cash binary={cash_binary:.9f}; asset binary={asset_binary:.9f}")
print(f"Call = {asset_binary:.9f} - {K:.0f} * {cash_binary:.9f} = {benchmark['call']:.9f}")
report("E_Q[dQ^S/dQ]", stock_measure_density, 1.0)
report("Q exercise probability", q_indicators, q_exercise)
report("Q^S exercise probability via weighted Q", stock_weighted_indicators, stock_measure_exercise)
print("No sample weight normalization is used; weighted sample estimates need not lie in [0,1] in every finite sample.")
print("With dividends, use the reinvested total-return stock as numeraire, not the ex-dividend stock alone.")''',
    ),
    (
        "## 4. Feynman–Kac: ตรวจความคาดหมายกับ PDE\n\n"
        "สูตรราคาที่ได้จาก discounted expectation ภายใต้ Q ต้องสอดคล้องกับ "
        "Black–Scholes PDE ภายใต้สมมติฐานเดียวกัน เซลล์นี้ใช้ central differences "
        "ตรวจอนุพันธ์อย่างอิสระจากสูตร Greeks โดยใช้ \\(V_t=-V_\\tau\\) "
        "เพราะเวลาคงเหลือ \\(\\tau=T-t\\) ลดลงเมื่อเวลาปฏิทินเดินหน้า\n\n"
        "Feynman–Kac เชื่อม PDE กับ expectation; การเลือก Q สำหรับราคาเกิดจาก "
        "เงื่อนไข no-arbitrage และการซื้อขายเลียนแบบ payoff ไม่ใช่จากทฤษฎีนี้เพียงอย่างเดียว",
        '''dividend = 0.02
def call_value(stock=S0, tau=T):
    return black_scholes(stock, K, r, dividend, sigma, tau)["call"]

h_s, h_t = 0.01, 1e-4
value = call_value()
delta_fd = (call_value(S0+h_s)-call_value(S0-h_s))/(2*h_s)
gamma_fd = (call_value(S0+h_s)-2*value+call_value(S0-h_s))/(h_s*h_s)
calendar_theta_fd = -(call_value(tau=T+h_t)-call_value(tau=T-h_t))/(2*h_t)
pde_residual = (calendar_theta_fd + 0.5*sigma*sigma*S0*S0*gamma_fd
                + (r-dividend)*S0*delta_fd - r*value)
assert abs(pde_residual) < 2e-6, pde_residual
print(f"With dividend yield={dividend:.2%}: Call={value:.9f}")
print(f"Finite-difference Delta={delta_fd:.9f}; Gamma={gamma_fd:.9f}; Theta/year={calendar_theta_fd:.9f}")
print(f"PDE residual={pde_residual:.3e}; tolerance=2e-6 currency units per year.")
print("This numerical residual checks formula consistency; it is not a proof of the theorem or a market-model validation.")''',
    ),
    (
        "## 5. ดอกเบี้ย ปันผล และ volatility ที่เปลี่ยนตามเวลา\n\n"
        "แบ่งปีเป็นสองช่วง ช่วงละ 0.5 ปี ใช้ \\((r,D,\\sigma)\\) เท่ากับ "
        "\\((4\\%,1\\%,10\\%)\\) และ \\((6\\%,3\\%,30\\%)\\) ตามลำดับ "
        "ค่าทั้งหมดเป็น deterministic จึงได้ \\(R=0.05\\), \\(Y=0.02\\), "
        "\\(A=0.05\\) และ effective volatility \\(\\sqrt{A/T}\\approx22.36\\%\\) "
        "ต้องเฉลี่ย **variance** ตามเวลา ไม่ใช่เฉลี่ย volatility แล้วนำไปยกกำลังสอง\n\n"
        "ตรวจสูตรด้วยการอินทิเกรต payoff บนความหนาแน่น Normal โดยตรง "
        "วิธี Simpson นี้ไม่ได้เรียก CDF ของสูตรราคา จึงช่วยตรวจการใช้ discount "
        "และ drift อีกทางหนึ่ง รวมทั้งตรวจ put–call parity และการลดรูปเมื่อค่าคงที่",
        '''# Tuple fields: duration in years, short rate, dividend yield, volatility.
segments = [(0.5, 0.04, 0.01, 0.10), (0.5, 0.06, 0.03, 0.30)]
term_T = math.fsum(dt for dt, _, _, _ in segments)
R = math.fsum(dt*rate for dt, rate, _, _ in segments)
Y = math.fsum(dt*yield_ for dt, _, yield_, _ in segments)
A = math.fsum(dt*vol*vol for dt, _, _, vol in segments)
close(R, .05)
close(Y, .02)
close(A, .05)
term_price = generalized_bs(S0, K, R, Y, A)
close(term_price["call"]-term_price["put"], S0*math.exp(-Y)-K*math.exp(-R))
effective = black_scholes(S0, K, R/term_T, Y/term_T, math.sqrt(A/term_T), term_T)
close(effective["call"], term_price["call"])
close(effective["put"], term_price["put"])
constant = generalized_bs(S0, K, r*T, 0.0, sigma*sigma*T)
close(constant["call"], benchmark["call"])

def simpson(function, left, right, panels=12000):
    if panels <= 0 or panels % 2 or right < left:
        raise ValueError("Require even positive panels and ordered integration bounds")
    if left == right:
        return 0.0
    h = (right-left)/panels
    total = function(left)+function(right)
    total += 4*math.fsum(function(left+i*h) for i in range(1, panels, 2))
    total += 2*math.fsum(function(left+i*h) for i in range(2, panels, 2))
    return h*total/3

def payoff_quadrature(S, strike, rate_integral, dividend_integral, variance_integral):
    if variance_integral <= 0:
        raise ValueError("This quadrature example requires strictly positive integrated variance")
    root_A = math.sqrt(variance_integral)
    cutoff = (math.log(strike/S)-rate_integral+dividend_integral+0.5*variance_integral)/root_A
    bound = 12.0
    split = min(bound, max(-bound, cutoff))
    def terminal(z):
        return S*math.exp(rate_integral-dividend_integral-0.5*variance_integral+root_A*z)
    call_integral = simpson(lambda z: max(terminal(z)-strike, 0.0)*normal_pdf(z), split, bound)
    put_integral = simpson(lambda z: max(strike-terminal(z), 0.0)*normal_pdf(z), -bound, split)
    return math.exp(-rate_integral)*call_integral, math.exp(-rate_integral)*put_integral

quad_call, quad_put = payoff_quadrature(S0, K, R, Y, A)
close(quad_call, term_price["call"], 1e-8)
close(quad_put, term_price["put"], 1e-8)
average_vol = math.fsum(dt*vol for dt, _, _, vol in segments)/term_T
wrong_variance_price = generalized_bs(S0, K, R, Y, average_vol**2*term_T)["call"]
print(f"R={R:.6f}; Y={Y:.6f}; integrated variance A={A:.6f}")
print(f"Effective volatility sqrt(A/T)={math.sqrt(A/term_T):.6%}; arithmetic average volatility={average_vol:.6%}")
print(f"Generalized formula: Call={term_price['call']:.9f}; Put={term_price['put']:.9f}")
print(f"Independent quadrature: Call={quad_call:.9f}; Put={quad_put:.9f}")
print(f"Formula-minus-quadrature errors: {term_price['call']-quad_call:+.3e}, {term_price['put']-quad_put:+.3e}")
print(f"Call using the incorrect arithmetic-volatility average: {wrong_variance_price:.9f}")
print("Quadrature truncates standard Normal shocks to [-12,12]; tails are negligible for these example parameters.")
print("These integrated-parameter formulas do not extend automatically to stochastic rates or stochastic volatility.")''',
    ),
    (
        "## 6. Black 76 และวันที่สองวัน\n\n"
        "กำหนดราคาอ้างอิง forward/futures ปัจจุบัน \\(F_0=100\\), strike 100, "
        "ดอกเบี้ย 5%, volatility ของราคาอ้างอิง 20%, Option หมดอายุใน "
        "\\(T=1\\) ปี และสัญญาอ้างอิงส่งมอบใน \\(U=1.5\\) ปี\n\n"
        "ตัวอย่างนี้ระบุชัดว่า **จ่าย premium วันนี้ และชำระ payoff "
        "\\((F(T,U)-K)^+\\) เป็นเงินสดที่ T** จึงคิด variance ถึง T และ discount "
        "ถึงวันที่จ่าย T เมื่อให้อัตราดอกเบี้ย deterministic ราคา forward กับ futures "
        "ที่ส่งมอบวันเดียวกันจึงสอดคล้องกันภายใต้สมมติฐานมาตรฐาน "
        "แต่ราคานี้ไม่ใช่มูลค่าของการซื้อสินทรัพย์ที่จ่าย \\(F_0\\) วันนี้\n\n"
        "สำหรับ Option ที่ใช้สิทธิแล้วได้ forward ซึ่งชำระที่ U "
        "หรือสัญญาแบบ futures-style margining ต้องกำหนดกระแสเงินสดและการชำระราคาใหม่ "
        "ก่อนเลือก discount factor ไม่ควรนำสูตรตัวอย่างนี้ไปใช้โดยเปลี่ยนชื่อสัญญาอย่างเดียว",
        '''def black76(F, strike, discount_factor, variance_to_expiry):
    if not all(math.isfinite(x) for x in (F, strike, discount_factor, variance_to_expiry)):
        raise ValueError("Inputs must be finite")
    if F <= 0 or strike <= 0 or discount_factor <= 0 or variance_to_expiry < 0:
        raise ValueError("Require positive prices/discount and nonnegative variance")
    if variance_to_expiry == 0:
        return dict(call=discount_factor*max(F-strike, 0.0),
                    put=discount_factor*max(strike-F, 0.0))
    root_v = math.sqrt(variance_to_expiry)
    b1 = (math.log(F/strike)+0.5*variance_to_expiry)/root_v
    b2 = b1-root_v
    return dict(call=discount_factor*(F*normal_cdf(b1)-strike*normal_cdf(b2)),
                put=discount_factor*(strike*normal_cdf(-b2)-F*normal_cdf(-b1)),
                d1=b1, d2=b2)

F0, futures_K, futures_r, futures_vol = 100.0, 100.0, .05, .20
option_expiry, contract_delivery = 1.0, 1.5
assert option_expiry <= contract_delivery
payment_discount = math.exp(-futures_r*option_expiry)
expiry_variance = futures_vol*futures_vol*option_expiry
black = black76(F0, futures_K, payment_discount, expiry_variance)
close(black["call"]-black["put"], payment_discount*(F0-futures_K))
close(black76(F0, futures_K, payment_discount, 0.0)["call"], 0.0)
close(black76(105.0, futures_K, payment_discount, 0.0)["call"], payment_discount*5.0)
# A lognormal forward under its expiry-forward measure has zero drift.
# With deterministic rates it is also driftless under the money-market Q measure.
quad_f_call, quad_f_put = payoff_quadrature(F0, futures_K, 0.0, 0.0, expiry_variance)
close(black["call"], payment_discount*quad_f_call, 1e-8)
close(black["put"], payment_discount*quad_f_put, 1e-8)
close(F0*math.exp(-0.5*expiry_variance)*math.exp(0.5*expiry_variance), F0)
incorrect_clock = black76(F0, futures_K, math.exp(-futures_r*contract_delivery),
                         futures_vol*futures_vol*contract_delivery)
print(f"Option expiry/payment T={option_expiry:.2f} years; underlying contract delivery U={contract_delivery:.2f} years")
print(f"Discount to T={payment_discount:.9f}; variance through T={expiry_variance:.9f}")
print(f"Black76 Call={black['call']:.9f}; Put={black['put']:.9f}")
print(f"Parity Call-Put={black['call']-black['put']:.9f}")
print(f"Incorrectly using U for both clocks gives Call={incorrect_clock['call']:.9f}")
print("Under the deterministic-rate model E_Q[F(T,U)]=F(0,U); F itself, not exp(-rT)*F, is the martingale here.")
print("Underlying delivery U affects the quoted F(0,U) and its volatility; it is not automatically the option's life.")''',
    ),
    (
        "## 7. สิ่งที่ตรวจผ่าน และขอบเขตของผล\n\n"
        "การรันตรวจ benchmark, payoff decomposition, put–call parity, "
        "Radon–Nikodym identity แบบรายเส้นทาง, PDE ด้วย finite differences, "
        "สูตร deterministic term structure และ Black 76 เทียบกับ quadrature "
        "ส่วนผล Monte Carlo รายงาน estimate กับ standard error แยกกัน "
        "เพื่อไม่ให้ความคลาดเคลื่อนจากการสุ่มปะปนกับความคลาดเคลื่อนของโมเดล\n\n"
        "ทุกผลอาศัยสมมติฐานที่ระบุในบทและข้อมูลจำลอง ไม่มีการสอบเทียบกับตลาดจริง "
        "ราคา Option คือ premium วันนี้ ไม่ใช่ payoff หรือกำไรสุทธิของผู้ซื้อ",
        '''# A small deterministic grid exercises calls, puts and negative-rate cases.
checked = 0
for stock in [70.0, 100.0, 140.0]:
    for integrated_rate in [-0.01, 0.04]:
        for integrated_dividend in [0.0, 0.03]:
            for integrated_variance in [0.0, 0.01, 0.09]:
                result = generalized_bs(stock, 100.0, integrated_rate,
                                        integrated_dividend, integrated_variance)
                stock_pv = stock*math.exp(-integrated_dividend)
                strike_pv = 100.0*math.exp(-integrated_rate)
                close(result["call"]-result["put"], stock_pv-strike_pv)
                assert -1e-10 <= result["call"] <= stock_pv+1e-10
                assert -1e-10 <= result["put"] <= strike_pv+1e-10
                assert result["call"] >= max(stock_pv-strike_pv, 0.0)-1e-10
                assert result["put"] >= max(strike_pv-stock_pv, 0.0)-1e-10
                checked += 1
print(f"Passed deterministic parity and price-bound checks for {checked} parameter combinations.")
print("All notebook code cells executed in order, with fixed simulation seeds.")''',
    ),
]


def markdown_cell(text):
    """Retain lesson prose and anchors; remove browser-only mounts and adapt links."""
    text = re.sub(r"<noscript>.*?</noscript>", "", text, flags=re.S)
    text = re.sub(r'<div\b[^>]*\bid="[^\"]+"[^>]*>\s*</div>', "", text)
    text = re.sub(r'<section\b[^>]*\bid="([^\"]+)"[^>]*>', r'<a id="\1"></a>', text)
    text = re.sub(r"^ดาวน์โหลด \[Notebook[^\n]+$", "", text, flags=re.M)
    text = re.sub(r" · <a [^>]*download>.*?</a>", "", text)
    text = re.sub(r"<summary>(.*?)</summary>", r"**\1**", text, flags=re.S)
    text = re.sub(r'</?(?:p|div|section|details)\b[^>]*>', "\n", text)
    text = re.sub(r'<a[^>]+href="([^\"]+)"[^>]*>(.*?)</a>', r'[\2](\1)', text, flags=re.S)
    text = text.replace("<strong>", "**").replace("</strong>", "**")
    text = re.sub(r'(?<=\]\()([\w-]+\.html(?:#[^)]*)?)(?=\))', lambda m: BASE+m[1], text)
    text = re.sub(r'(?<=\]\()(notebooks/[^)]+\.ipynb)(?=\))', lambda m: BASE+m[1], text)
    text = re.sub(r'(?<=\]\()(data/[^)]+)(?=\))', lambda m: BASE+m[1], text)
    cell = {"cell_type": "markdown", "metadata": {},
            "source": re.sub(r"\n{3,}", "\n\n", text).strip()}
    # Keep any future local SVG figures portable when the source is extended.
    for asset in re.findall(r'!\[[^\]]*\]\((assets/[^)]+\.svg)\)', cell["source"]):
        name = Path(asset).name
        cell.setdefault("attachments", {})[name] = {"image/svg+xml": (ROOT/asset).read_text()}
        cell["source"] = cell["source"].replace(f"]({asset})", f"](attachment:{name})")
    return cell


def laboratory_cells():
    """Execute the self-contained examples in a new namespace and capture output."""
    cells, namespace = [], {}
    for count, (explanation, program) in enumerate(LABS, 1):
        cells.append(markdown_cell(explanation))
        stream = io.StringIO()
        with contextlib.redirect_stdout(stream):
            exec(compile(program, f"{SLUG}_cell_{count}", "exec"), namespace)
        outputs = ([{"output_type": "stream", "name": "stdout", "text": stream.getvalue()}]
                   if stream.getvalue() else [])
        cells.append({"cell_type": "code", "metadata": {}, "source": program,
                      "execution_count": count, "outputs": outputs})
    return cells


def build_notebook(source):
    body = re.sub(r"\A---\n.*?\n---\n", "", source, flags=re.S)
    cells = [markdown_cell(
        "# Python lab: Martingale Pricing\n\n"
        "ใช้ Python 3 แล้วเลือก **Run All** ไม่ต้องติดตั้งแพ็กเกจเพิ่ม "
        "ส่วนแรกเก็บข้อความและสมการจากบทเรียนฉบับเดียวกับเว็บไซต์ "
        "ส่วนท้ายเป็นการทดลองที่รันได้ครบในไฟล์นี้ ข้อมูลทั้งหมดเป็นตัวอย่างสมมติ "
        "การสุ่มระบุ seed ของ Python จึงไม่จำเป็นต้องได้ตัวเลขรายเส้นทางตรงกับเว็บไซต์\n\n"
        f"[เปิดบทเรียน]({BASE}{SLUG}.html)"
    )]
    # Splitting immediately before each section retains intervening and trailing prose.
    for chunk in re.split(r'(?=<section\b[^>]*\bid=")', body):
        if chunk.strip():
            cells.append(markdown_cell(chunk))
    cells.extend(laboratory_cells())
    for index, cell in enumerate(cells):
        cell["id"] = f"martingale-pricing-{index:02d}"
    return {"nbformat": 4, "nbformat_minor": 5, "cells": cells, "metadata": {
        "kernelspec": {"display_name": "Python 3", "language": "python", "name": "python3"},
        "language_info": {"name": "python", "version": sys.version.split()[0], "file_extension": ".py"},
        "source": {"path": f"{SLUG}.md", "sha256": hashlib.sha256(source.encode()).hexdigest()},
        "execution": {"method": "Executed every code cell in a fresh shared namespace; captured stdout",
                      "generator": "scripts/make_martingale_pricing_notebook.py"},
        "examples": {"data": "Hypothetical parameters and seeded simulation only",
                     "p_seed": 2026091901, "q_seed": 2026091902, "paths_per_measure": 100000},
    }}


if __name__ == "__main__":
    source = (ROOT/f"{SLUG}.md").read_text()
    notebook = build_notebook(source)
    output = ROOT/f"notebooks/{SLUG}.ipynb"
    output.write_text(json.dumps(notebook, ensure_ascii=False, indent=1)+"\n")
    print(f"Wrote {output.name}: {len(notebook['cells'])} cells; "
          f"{sum(c['cell_type'] == 'code' for c in notebook['cells'])} executed code cells.")
