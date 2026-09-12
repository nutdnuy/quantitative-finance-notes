"""Build binomial-model.ipynb from canonical prose and execute stdlib-only cells."""
import contextlib
import hashlib
import io
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BASE = "https://nutdnuy.github.io/quantitative-finance-notes/"
source = (ROOT / "binomial-model.md").read_text()
body = re.sub(r"\A---\n.*?\n---\n", "", source, flags=re.S)
cells, namespace = [], {}
snippets = {
    "intro": '''import math
def close(actual, expected):
    assert math.isclose(actual, expected, rel_tol=1e-10, abs_tol=1e-10), (actual, expected)
print("Python standard library only; all prices below are hypothetical.")''',
    "one-step": '''delta, cash = 0.5, -49.5
for stock, payoff in [(101, 1), (99, 0)]:
    close(delta * stock + cash, payoff)
    print(f"Stock={stock}: replication={delta * stock + cash:.2f}, Call payoff={payoff}")
close(delta * 100 + cash, 0.5)
print(f"Call today = {delta * 100 + cash:.2f}; hedged terminal liability = {cash:.2f}")''',
    "replication": '''delta = (3 - 0) / (103 - 98)
cash = 0 - delta * 98
close(delta, 0.6); close(cash, -58.8)
close(delta * 103 + cash, 3); close(delta * 98 + cash, 0)
close(delta * 100 + cash, 1.2)
print(f"Asymmetric tree: Delta={delta:.2f}, cash={cash:.2f}, Call={delta * 100 + cash:.2f}")''',
    "pricing-rule": '''def replicate(S, Su, Sd, Vu, Vd, R=1.0):
    if not (0 < Sd < Su and Sd < R * S < Su):
        raise ValueError("Require 0 < d < R < u; both states are possible.")
    delta = (Vu - Vd) / (Su - Sd)
    cash = (Vd - delta * Sd) / R
    q = (R * S - Sd) / (Su - Sd)
    value = delta * S + cash
    close(delta * Su + cash * R, Vu)
    close(delta * Sd + cash * R, Vd)
    close(value, (q * Vu + (1 - q) * Vd) / R)
    return value, delta, cash, q
print("(value, Delta, cash, q):", tuple(round(x, 6) for x in replicate(100, 103, 98, 3, 0)))''',
    "interest": '''R = 1 + 0.10 / 252
call, delta, cash, q = replicate(100, 101, 99, 1, 0, R)
close(call, 0.5196350654502185); close(q, 0.5198412698412702)
close(delta, 0.5); close(cash * R, -49.5)
print(f"R={R:.12f}; discount={1 / R:.12f}; q={q:.12f}")
print(f"Delta={delta:.6f}; cash today={cash:.9f}; Call={call:.9f}")''',
    "two-step": '''S0, K, u, d, q = 100, 100, 1.1, 0.9, 0.5
stocks = [[S0 * u**j * d**(n-j) for j in range(n+1)] for n in range(3)]
calls = [[max(S-K, 0) for S in stocks[-1]]]
for n in (1, 0):
    calls.insert(0, [(1-q)*calls[0][j] + q*calls[0][j+1] for j in range(n+1)])
for n in range(3):
    print(f"n={n}, ascending j: S={[round(x, 4) for x in stocks[n]]}, V={[round(x, 4) for x in calls[n]]}")
close(calls[0][0], 5.25); close(calls[1][1], 10.5)
close(stocks[2][1], 99)''',
    "dynamic-hedging": '''root = replicate(100, 110, 90, 10.5, 0)
up = replicate(110, 121, 99, 21, 0)
down = replicate(90, 99, 81, 0, 0)
close(root[1], 0.525); close(root[2], -47.25)
close(up[1], 21/22); close(up[2], -94.5)
for label, stock, hedge, outcomes in [("U", 110, up, [(121, 21), (99, 0)]), ("D", 90, down, [(99, 0), (81, 0)])]:
    old_value = root[1] * stock + root[2]
    close(old_value, hedge[0])
    close((hedge[1] - root[1]) * stock + hedge[2] - root[2], 0)
    for terminal, payoff in outcomes:
        close(hedge[1] * terminal + hedge[2], payoff)
    print(f"After {label}: value={old_value:.4f}, new Delta={hedge[1]:.9f}, new cash={hedge[2]:.4f}; no external cash")''',
    "experiment": '''p = 0.6  # Change this physical probability; keep the price tree unchanged.
assert 0 < p < 1, "Both physical states must be possible."
q = 0.5
physical_payoff = p**2 * 21
pricing_payoff = q**2 * 21
close(pricing_payoff, 5.25)
if p == 0.6:
    close(physical_payoff, 7.56)
put = (1-q)**2 * 19 + 2*q*(1-q) * 1
close(put, 5.25); close(pricing_payoff - put, 100 - 100)
print(f"p={p:.2f}: physical expected Call payoff={physical_payoff:.4f}")
print(f"q={q:.2f}: Call price={pricing_payoff:.4f}; European Put price={put:.4f}")''',
    "many-steps": '''def price_tree(S, K, u, d, r, T, N, kind="call"):
    if not isinstance(N, int) or N < 1 or min(S, K, T) <= 0 or kind not in ("call", "put"):
        raise ValueError("Positive S, K, T; integer N >= 1; kind is call or put.")
    R = 1 + r*T/N
    if not 0 < d < R < u:
        raise ValueError("Require 0 < d < R < u.")
    q = (R-d)/(u-d)
    sign = 1 if kind == "call" else -1
    terminal = [max(sign*(S*u**j*d**(N-j)-K), 0) for j in range(N+1)]
    values = terminal[:]
    for n in range(N-1, -1, -1):
        values = [((1-q)*values[j]+q*values[j+1])/R for j in range(n+1)]
    terminal_sum = sum(math.comb(N,j)*q**j*(1-q)**(N-j)*terminal[j] for j in range(N+1))/R**N
    close(values[0], terminal_sum)
    return values[0], terminal_sum
cases = [(100,100,1.1,.9,0,1,2), (100,103,1.12,.92,.04,1,5), (90,100,1.08,.94,-.01,2,8)]
for args in cases:
    call, check = price_tree(*args)
    put, _ = price_tree(*args, kind="put")
    S, K, u, d, r, T, N = args
    close(call-put, S-K/(1+r*T/N)**N)
    print(f"N={N}, r={r:.2%}: Call={call:.9f}, terminal sum={check:.9f}, Put={put:.9f}; parity passed")
close(price_tree(*cases[0])[0], 5.25)''',
    "continuous-limit": '''S, mu, sigma = 100, 0.08, 0.20
print("dt       tree mean   exact GBM mean   tree variance   leading variance   discrepancy")
for dt in [0.25, 1/12, 1/252]:
    u, d = 1+sigma*math.sqrt(dt), 1-sigma*math.sqrt(dt)
    p = 0.5+mu*math.sqrt(dt)/(2*sigma)
    assert d > 0 and 0 < p < 1
    changes = [S*(u-1), S*(d-1)]
    mean = p*changes[0]+(1-p)*changes[1]
    variance = p*(changes[0]-mean)**2+(1-p)*(changes[1]-mean)**2
    leading = sigma**2*S**2*dt
    close(mean, mu*S*dt); close(variance, leading-mu**2*S**2*dt**2)
    close(leading-variance, mu**2*S**2*dt**2)
    print(f"{dt:.6f} {mean:11.7f} {S*math.expm1(mu*dt):16.7f} {variance:15.7f} {leading:18.7f} {leading-variance:13.7f}")
print("Matching the short-step mean and leading variance does not match the exact GBM distribution.")''',
    "practice": '''for R in [0.95, 1.05, 1.06]:
    try:
        replicate(100, 105, 95, 5, 0, R)
    except ValueError:
        print(f"Rejected R={R:.2f}: q={(R-.95)/(.1):.2f}, outside strict no-arbitrage region")
    else:
        raise AssertionError("Boundary/arbitrage parameters should be rejected")
print("All numerical assertions passed.")''',
}

def markdown(text):
    text = re.sub(r'<noscript>.*?</noscript>', '', text, flags=re.S)
    text = re.sub(r'<div id="[^"]+" class="interactive-mount"></div>', '', text)
    text = re.sub(r' · <a [^>]*download>.*?</a>', '', text)
    text = re.sub(r'^ดาวน์โหลด \[Notebook ของบทนี้\].*$', '', text, flags=re.M)
    text = re.sub(r'<a[^>]+href="([^"]+)"[^>]*>(.*?)</a>', r'[\2](\1)', text, flags=re.S)
    text = text.replace('<strong>', '**').replace('</strong>', '**')
    text = re.sub(r'<summary>(.*?)</summary>', r'**\1**', text)
    text = re.sub(r'</?(?:p|div|section|details)\b[^>]*>', '\n', text)
    text = re.sub(r'(?<=\]\()((?:[\w-]+\.html)(?:#[^)]*)?)(?=\))', lambda m: BASE+m[1], text)
    cell = {"cell_type": "markdown", "metadata": {}, "source": re.sub(r'\n{3,}', '\n\n', text).strip()}
    asset = "assets/diagrams/binomial-two-step.svg"
    if asset in cell["source"]:
        cell["attachments"] = {"binomial-two-step.svg": {"image/svg+xml": (ROOT/asset).read_text()}}
        cell["source"] = cell["source"].replace(f']({asset})', '](attachment:binomial-two-step.svg)')
    cells.append(cell)

def code(text):
    count = 1+sum(c["cell_type"] == "code" for c in cells)
    output = io.StringIO()
    with contextlib.redirect_stdout(output):
        exec(compile(text, f"binomial_cell_{count}", "exec"), namespace)
    cells.append({"cell_type": "code", "metadata": {}, "source": text, "execution_count": count,
                  "outputs": [{"output_type": "stream", "name": "stdout", "text": output.getvalue()}]})

markdown("# Notebook: Binomial Model\n\nใช้ Python 3 และ standard library แล้วเลือก **Run All** ได้ทันที ไม่ต้องติดตั้งแพ็กเกจหรือดาวน์โหลดข้อมูล ภาพต้นไม้ฝังอยู่ในไฟล์ คำอธิบายมาจาก `binomial-model.md` และมีโค้ดแทนห้องทดลองบนเว็บ ปรับตัวแปรแล้วรันเซลล์ตามลำดับ\n\n"+f"[เปิดบทเรียนและห้องทดลอง]({BASE}binomial-model.html#experiment)")
intro = body.split('<section id="', 1)[0]
markdown(intro)
code(snippets["intro"])
for match in re.finditer(r'<section id="([^"]+)"[^>]*>(.*?)</section>', body, flags=re.S):
    section_id, text = match.groups()
    markdown(text)
    if section_id in snippets:
        code(snippets[section_id])
for index, cell in enumerate(cells):
    cell["id"] = f"binomial-{index:02d}"
notebook = {"nbformat": 4, "nbformat_minor": 5, "cells": cells, "metadata": {
    "kernelspec": {"display_name": "Python 3", "language": "python", "name": "python3"},
    "language_info": {"name": "python", "version": sys.version.split()[0], "file_extension": ".py"},
    "source": {"path": "binomial-model.md", "sha256": hashlib.sha256(source.encode()).hexdigest()},
    "execution": {"method": "Python exec in a shared namespace; captured stdout", "generator": "scripts/make_binomial_notebook.py"}}}
output_path = ROOT / "notebooks/binomial-model.ipynb"
output_path.write_text(json.dumps(notebook, ensure_ascii=False, indent=1)+"\n")
print(f"Wrote {output_path.name}: {len(cells)} cells; {sum(c['cell_type']=='code' for c in cells)} executed code cells.")
