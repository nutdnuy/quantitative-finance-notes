"""Build the source-aligned Thai notebook and execute its NumPy cells."""
import base64
import contextlib
import io
import json
import re
import sys
import types
from pathlib import Path

root = Path(__file__).resolve().parent
cells, namespace, active_outputs = [], {}, []
execution_count = 0
class SVG:
    def __init__(self, data): self.data = data

def display(value):
    active_outputs.append({"output_type":"display_data", "data":{"image/svg+xml":value.data,"text/plain":"<SVG chart>"},"metadata":{}})

ipython = types.ModuleType("IPython")
display_module = types.ModuleType("IPython.display")
display_module.display, display_module.SVG = display, SVG
sys.modules["IPython"], sys.modules["IPython.display"] = ipython, display_module

def md(source):
    attachments = {}
    image_path = root / 'assets/diagrams/call-probability-tree.svg'
    if '](assets/diagrams/call-probability-tree.svg)' in source:
        attachments['call-probability-tree.svg'] = {'image/svg+xml': base64.b64encode(image_path.read_bytes()).decode()}
        source = source.replace('](assets/diagrams/call-probability-tree.svg)', '](attachment:call-probability-tree.svg)')
    source = source.replace('](assets/diagrams/call-probability-tree.excalidraw)', '](https://nutdnuy.github.io/quantitative-finance-notes/assets/diagrams/call-probability-tree.excalidraw)')
    cells.append({"cell_type":"markdown","metadata":{},"source":source, **({'attachments':attachments} if attachments else {})})

def code(source):
    global active_outputs, execution_count
    active_outputs = []
    execution_count += 1
    captured = io.StringIO()
    with contextlib.redirect_stdout(captured):
        exec(compile(source, f"cell_{execution_count}", "exec"), namespace)
    if captured.getvalue():
        active_outputs.insert(0,{"output_type":"stream","name":"stdout","text":captured.getvalue()})
    cells.append({"cell_type":"code","metadata":{},"source":source,"execution_count":execution_count,"outputs":active_outputs})

def clean(source):
    source = re.sub(r'<div id="[^"]+" class="interactive-mount"></div>', '', source)
    source = re.sub(r'<div class="download-panel">[\s\S]*?</div>\s*</div>', '', source)
    source = re.sub(r'<a[^>]+href="([^"]+)"[^>]*>(.*?)</a>', r'[\2](\1)', source, flags=re.S)
    source = source.replace('<strong>', '**').replace('</strong>', '**')
    source = re.sub(r'<(?:p|div|br|summary|h1|h2|h3)\b[^>]*>', '\n\n', source)
    source = re.sub(r'</?(?:header|section|details|span|small|p|div|summary|h1|h2|h3)[^>]*>', '', source)
    return re.sub(r'\n{3,}', '\n\n', source).strip()

md('''# พฤติกรรมแบบสุ่มของสินทรัพย์

สมุดบันทึกประกอบบทเรียน เริ่มจากแนวคิดเรื่องความน่าจะเป็นของราคา พื้นฐาน Option และ payoff แล้วศึกษาผลตอบแทน ความผันผวน และ Wiener process แหล่งอ้างอิงอยู่ท้าย Notebook

ใช้ Python 3, NumPy และ Jupyter/IPython แล้วเลือก **Run All** ข้อมูล Perez Companc จากตารางรูป 3.3 ฝังอยู่ใน Notebook จึงไม่ต้องดาวน์โหลดข้อมูลตลาดหรือไฟล์ประกอบ ตัวเลขที่รายงานสำหรับอนุกรมเต็มในหนังสือแยกจากสถิติของตารางย่อย 34 ราคาอย่างชัดเจน

โค้ด SVG วาดภาพจากตัวเลขโดยตรง ป้ายกราฟใช้ภาษาอังกฤษเพื่อให้อ่านได้แม้เครื่องไม่มีฟอนต์ไทย หน้าเว็บและ NumPy ใช้ตัวสร้างเลขสุ่มต่างกัน จึงได้เส้นต่างกันแม้ใช้ seed เท่ากัน แต่รันซ้ำในแต่ละสภาพแวดล้อมได้''')
code('''import numpy as np
from html import escape
from IPython.display import display, SVG
print("NumPy", np.__version__)

def chart(series, title, x_label, y_label, y_limits=None):
    """Each series has x, y, label, color and optional bar_width."""
    W, H, L, R, T, B = 780, 400, 70, 25, 75, 55
    xmin = min(float(np.min(s["x"])) for s in series)
    xmax = max(float(np.max(s["x"])) + s.get("bar_width", 0) for s in series)
    finite = np.concatenate([np.asarray(s["y"])[np.isfinite(s["y"])] for s in series])
    if y_limits is None:
        lo, hi = min(0, float(finite.min())), max(0, float(finite.max()))
        margin = max((hi-lo)*.08, .001)
        lo, hi = lo-margin, hi+margin
    else:
        lo, hi = y_limits
    xx = lambda v: L+(v-xmin)/max(xmax-xmin, 1e-12)*(W-L-R)
    yy = lambda v: T+(hi-v)/(hi-lo)*(H-T-B)
    parts = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}" role="img"><title>{escape(title)}</title>', '<rect width="100%" height="100%" fill="white"/>', '<g font-family="sans-serif" font-size="12" fill="#414141">', f'<text x="{L}" y="23" font-size="16">{escape(title)}</text>', f'<text x="{L}" y="62">{escape(y_label)}</text>']
    legend = 0
    for s in series:
        if s.get("label"):
            parts.append(f'<text x="{L+legend*225}" y="42" fill="{s["color"]}">{escape(s["label"])}</text>')
            legend += 1
    for value in np.linspace(lo, hi, 5):
        parts += [f'<line x1="{L}" x2="{W-R}" y1="{yy(value)}" y2="{yy(value)}" stroke="#ddd"/>', f'<text x="{L-8}" y="{yy(value)+4}" text-anchor="end">{value:.3g}</text>']
    for value in np.linspace(xmin, xmax, 5):
        parts.append(f'<text x="{xx(value)}" y="{H-B+23}" text-anchor="middle">{value:.3g}</text>')
    for s in series:
        if "bar_width" in s:
            for x,y in zip(s["x"], s["y"]):
                parts.append(f'<rect x="{xx(x)}" y="{min(yy(0),yy(y))}" width="{xx(x+s["bar_width"])-xx(x)}" height="{abs(yy(y)-yy(0))}" fill="{s["color"]}" fill-opacity=".45" stroke="white"/>')
        else:
            points = ' '.join(f'{xx(x):.2f},{yy(y):.2f}' for x,y in zip(s["x"],s["y"]) if np.isfinite(y))
            parts.append(f'<polyline points="{points}" fill="none" stroke="{s["color"]}" stroke-width="{s.get("stroke",2)}"/>')
    parts += [f'<text x="{W-R}" y="{H-7}" text-anchor="end">{escape(x_label)}</text>', '</g></svg>']
    return SVG(''.join(parts))
''')

experiments = {}
experiments['average'] = '''# ตัวอย่างปรับใหม่: p ขาลง 0.4, ขาขึ้น 0.6; risk-neutral q เมื่อ r=0
future, p, K = np.array([50., 150.]), np.array([.4, .6]), 100.
payoff = np.maximum(future-K, 0)
expected_price, expected_payoff = p@future, p@payoff
payoff_at_mean = max(expected_price-K, 0)
print(f"E[S] = {expected_price:.2f}, E[f(S)] = {expected_payoff:.2f}, f(E[S]) = {payoff_at_mean:.2f} USD")
assert expected_payoff == 30 and payoff_at_mean == 10
q_up = (100-50)/(150-50)
call_price = q_up*payoff[1] + (1-q_up)*payoff[0]
delta = (payoff[1]-payoff[0])/(future[1]-future[0])
loan = delta*future[0]-payoff[0]
assert call_price == 25 and delta*100-loan == call_price
assert np.allclose(delta*future-loan, payoff)
print(f"q_up={q_up:.1f}, Call price={call_price:.2f}, replicate with {delta} shares and borrow {loan}")
x = np.linspace(0, 200, 201)
display(chart([dict(x=x,y=np.maximum(x-K,0),label="Call payoff, K=100",color="#6200ee"), dict(x=future,y=payoff,label="Secant: P-weighted point (110,30)",color="#00796b")], "3.3 Average the payoffs, not the prices", "Terminal price (USD)", "Payoff (USD)"))
'''
experiments['returns'] = '''# ตัวอย่าง A/B ตามต้นฉบับ: เพิ่มขึ้นหุ้นละ 10 ดอลลาร์เท่ากัน
for name, price in [("A",100), ("B",1000)]:
    shares = 1000/price
    print(f"{name}: return={10/price:.0%}, 1 share gain=10 USD, 1000 USD budget gain={shares*10:.0f} USD")
'''
perez = json.loads((root/'data/perez-companc-table-3-3.json').read_text())
experiments['data'] = '# ตารางรูป 3.3 หน้า 60: ราคาและผลตอบแทนที่หนังสือพิมพ์ไว้\nimport json\nsource_rows = json.loads(' + repr(json.dumps(perez, ensure_ascii=False)) + ')\n' + '''dates = [r["date"] for r in source_rows]
prices = np.array([r["printed_price"] for r in source_rows])
returns = prices[1:]/prices[:-1]-1
assert len(prices)==34 and len(returns)==33
print(f"ตารางย่อย {dates[0]} ถึง {dates[-1]}: {len(prices)} ราคา / {len(returns)} ผลตอบแทน")
print(f"ผลตอบแทนแรกคำนวณจากราคาปัดเศษ: {returns[0]:.6f}")
print(f"คอลัมน์เดิมในหนังสือ: {source_rows[1]['book_printed_return']:.6f}")
print(f"เฉพาะตารางย่อย: mean={returns.mean():.6f}, sample SD={returns.std(ddof=1):.6f}")
print("สถิติอนุกรมเต็มที่หนังสือรายงาน: mean=0.002916, SD=0.024521 (ไม่ได้คำนวณจาก 34 แถวนี้)")
display(chart([dict(x=np.arange(34),y=prices,label="34 printed prices",color="#6200ee")], "3.5 Perez Companc: the visible table excerpt", "Observation index (not calendar days)", "Price in printed table units"))
display(chart([dict(x=np.arange(1,34)-.4,y=returns*100,bar_width=.8,label="33 reconstructed returns",color="#6200ee")], "3.5 Same data, expressed as returns", "Interval ending at observation", "Return (%)"))
z = (returns-returns.mean())/returns.std(ddof=1)
counts, edges = np.histogram(z, bins=8, range=(-4,4))
width = edges[1]-edges[0]
density = counts/(len(z)*width)
x = np.linspace(-4,4,300)
assert np.isclose(np.sum(density*width),1)
assert np.isclose(z.mean(),0) and np.isclose(z.std(ddof=1),1)
display(chart([dict(x=edges[:-1],y=density,bar_width=width,label="33 standardized returns",color="#6200ee"),dict(x=x,y=np.exp(-x*x/2)/np.sqrt(2*np.pi),label="Standard Normal density",color="#00796b")], "3.5 A small-sample histogram, not a Normality test", "Standardized return z", "Density per unit z", (0,.6)))
'''
experiments['scaling'] = '''# Annualize สถิติอนุกรมเต็มที่หนังสือรายงาน
mu, sigma = 252*.002916, np.sqrt(252)*.024521
print(f"mu={mu:.6f} ({mu:.2%}), sigma={sigma:.6f} ({sigma:.2%})")
for days in [1,5,21,252]:
    dt = days/252
    print(f"{days:3} วัน: drift={mu*dt:.4%}, shock SD={sigma*np.sqrt(dt):.4%}")
t = np.linspace(0,1,253)
display(chart([dict(x=t,y=100*mu*t,label="Drift: mu * t",color="#6200ee"),dict(x=t,y=100*sigma*np.sqrt(t),label="Shock SD: sigma * sqrt(t)",color="#00796b")], "3.6 Time and the square root of time", "Years", "Short-step model component (%)"))
# ตัวเลขส่วนประกอบนี้ไม่ใช่ CAGR หรือขอบเขตผลตอบแทนรวม
'''
experiments['volatility'] = '''log_returns = np.diff(np.log(prices))
print(f"Sample volatility ของตารางย่อยจาก log returns: {log_returns.std(ddof=1)*np.sqrt(252):.2%}")
# จำลอง plateauing effect; ไม่ใช่ผลตอบแทน Perez Companc
window = 20
daily = np.array([-.003 if i%2==0 else .003 for i in range(100)])
daily[34] = -.10
rolling = np.full(100,np.nan)
for i in range(window-1,100):
    rolling[i] = daily[i-window+1:i+1].std(ddof=1)*np.sqrt(252)
exit_day = 35+window
print(f"ช็อกวันที่ 35 หลุดจากหน้าต่าง {window} วัน ในวันที่ {exit_day}")
assert rolling[exit_day-2] > rolling[exit_day-1]
display(chart([dict(x=np.arange(1,101),y=rolling*100,label="Rolling sample SD",color="#6200ee")], "3.7 Plateauing effect (synthetic returns)", "Day", "Annualized volatility (%)"))
'''
experiments['wiener'] = '''rng = np.random.default_rng(73)
fine = np.r_[0,np.cumsum(rng.standard_normal(1024)/np.sqrt(1024))]
series = [dict(x=np.linspace(0,1,1025),y=fine,label="1024 steps",color="#b0b0b0",stroke=1)]
for steps, color in [(4,"#00796b"),(64,"#6200ee")]:
    coarse = fine[::1024//steps]
    assert coarse[-1]==fine[-1]
    print(f"{steps:4} ก้าว: dt={1/steps:.6f}, SD ต่อก้าว={1/np.sqrt(steps):.6f}, ความแปรปรวนรวมทฤษฎี={steps*(1/steps):.0f}")
    series.append(dict(x=np.linspace(0,1,steps+1),y=coarse,label=f"{steps} steps",color=color))
display(chart(series,"3.9 One Wiener path, several observation grids","Years","X(t)"))
# ก้าวหยาบได้จากการรวม increments บนเส้นละเอียดเดียวกัน จุดร่วมจึงไม่เปลี่ยน
'''
thai_funds = json.loads((root / 'data/thai-funds-spiva-2025.json').read_text())
mc_code = '''# Monte Carlo GBM: adjust mu, sigma and count, then rerun
mu, sigma, count, seed = .10, .25, 1000, 73
rng = np.random.default_rng(seed)
shocks = rng.standard_normal((count,52))
paths = 100*np.exp(np.cumsum((mu-.5*sigma**2)/52+sigma/np.sqrt(52)*shocks,axis=1))
paths = np.column_stack([np.full(count,100.),paths])
terminal = paths[:,-1]
print(f"Mean={terminal.mean():.2f}, theoretical={100*np.exp(mu):.2f}, SE={terminal.std(ddof=1)/np.sqrt(count):.2f}")
print(f"Fraction below 100: {np.mean(terminal<100):.1%}; conditional on this model")
display(chart([dict(x=np.linspace(0,1,53),y=p,label="Sample path",color="#00796b") for p in paths[:20]],"Monte Carlo: 20 of all simulated paths","Years","Price"))
'''
experiments['model'] = "# SPIVA Asia Ex-Japan Year-End 2025, Report 1a, p. 9\nfund_data = " + repr(thai_funds) + "\n" + '''
print(f"{fund_data['category']} / {fund_data['benchmark']} / {fund_data['as_of']}")
for row in fund_data['rows']:
    below = row['underperforming_pct']
    other = 100-below
    assert np.isclose(below+other, 100)
    print(f"{row['years']} ปี: ต่ำกว่าดัชนี {below:.1f}% / ไม่ต่ำกว่าดัชนี {other:.1f}%")
print("สัดส่วนจำนวนกองทุน ไม่ใช่ผลตอบแทน; ส่วนไม่ต่ำกว่าคำนวณจาก 100 ลบส่วนที่ต่ำกว่า")
print("ดัชนีรวมเงินปันผล วัดเป็นเงินบาท; ไม่มีตัวเลขช่วง 10 ปีในรายงานนี้")
print(fund_data['source_url'])
'''
experiments['practice'] = '''# ส่วนต่อยอด: exact GBM
S0, mu, sigma, years, steps, seed = 100., .15, .25, 1., 252, 73
dt = years/steps
rng = np.random.default_rng(seed)
shocks = rng.standard_normal((20000,steps))
paths = S0*np.exp(np.cumsum((mu-.5*sigma**2)*dt+sigma*np.sqrt(dt)*shocks,axis=1))
paths = np.column_stack([np.full(20000,S0),paths])
terminal = paths[:,-1]
theory_mean = S0*np.exp(mu*years)
theory_median = S0*np.exp((mu-.5*sigma**2)*years)
se = terminal.std(ddof=1)/np.sqrt(len(terminal))
print(f"Mean: simulation={terminal.mean():.2f}, theory={theory_mean:.2f}")
print(f"Median: simulation={np.median(terminal):.2f}, theory={theory_median:.2f}")
print(f"Standard error of sample mean={se:.4f}")
assert np.all(paths>0) and abs(terminal.mean()-theory_mean)<4*se
t = np.linspace(0,years,steps+1)
series = [dict(x=t,y=p,color="#b9b9b9",stroke=1) for p in paths[:40]]
series += [dict(x=t,y=S0*np.exp(mu*t),label="Theoretical mean",color="#6200ee"),dict(x=t,y=S0*np.exp((mu-.5*sigma**2)*t),label="Theoretical median",color="#00796b")]
display(chart(series,"Extension: 40 of 20,000 exact GBM paths","Years","Simulated price"))
'''
source = (root/'random-assets.md').read_text()
opening = source.split('<section', 1)[0]
opening = re.sub(r'^---\n[\s\S]*?\n---\n', '', opening)
md(clean(opening))
sections = re.findall(r'<section id="([^"]+)"[^>]*>([\s\S]*?)</section>', source)
for section_id, body in sections:
    # Download links are web-only; data already embedded in this notebook.
    body = re.sub(r'<div class="download-panel">[\s\S]*$', '', body)
    md(clean(body))
    if section_id in experiments:
        code((mc_code + '\n' if section_id == 'model' else '') + experiments[section_id])
notebook = {"cells":cells,"metadata":{"kernelspec":{"display_name":"Python 3","language":"python","name":"python3"},"language_info":{"name":"python","version":"3.12"}},"nbformat":4,"nbformat_minor":4}
(root/'notebooks/random-assets.ipynb').write_text(json.dumps(notebook,ensure_ascii=False,indent=1))
summary = {"status":"passed","source_sections":len(sections),"cells":len(cells),"executed_code_cells":execution_count,"svg_outputs":sum(1 for c in cells for o in c.get('outputs',[]) if 'image/svg+xml' in o.get('data',{})),"data":{"printed_prices":len(perez),"reconstructed_returns":len(perez)-1},"execution":"Every code cell executed with NumPy. A lightweight IPython.display capture adapter collected SVG outputs; the full Jupyter UI was not tested."}
(root/'qa/notebook-checks.json').write_text(json.dumps(summary,indent=2))
print(json.dumps(summary,ensure_ascii=False))
