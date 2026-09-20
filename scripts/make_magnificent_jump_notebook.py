"""Build three source-faithful pages and execute their combined notebook.

Authoring dependencies: beautifulsoup4, nbformat, numpy, matplotlib, fonttools, brotli.
The delivered notebook needs only numpy, matplotlib and IPython.
"""
import base64
import contextlib
import hashlib
import io
import json
import os
from pathlib import Path

os.environ.setdefault('MPLCONFIGDIR', '/tmp/magnificent-jump-matplotlib')
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib import font_manager
from fontTools.ttLib import TTFont
import nbformat
from bs4 import BeautifulSoup

from magnificent_jump_viz import SETUP, CELLS, CAPTIONS

ROOT = Path(__file__).resolve().parents[1]
SLUGS = ['magnificent-jump-intro', 'magnificent-jump-random-clock', 'magnificent-jump-variance-gamma']
TITLES = ['Intro', 'นาฬิกาสุ่ม (random clock)', 'Variance Gamma Process']
RANGES = [(0, 13), (13, 40), (40, 85)]
FIGURES = ['magnificent-jump-distributions', 'magnificent-jump-clock', 'magnificent-jump-drift']
PAPER = 'https://engineering.nyu.edu/sites/default/files/2018-09/CarrEuropeanFinReview1998.pdf'


def text(html):
    return BeautifulSoup(html, 'html.parser').get_text()


def block(html, index, notebook=False):
    """Only layout/heading markup changes. Text, formula symbols and order stay intact."""
    soup = BeautifulSoup(html, 'html.parser')
    for heading in soup.find_all('h3'):
        heading.name = 'h2'
    for figure in soup.select('.equation'):
        figure['tabindex'] = '0'
        figure['role'] = 'group'
        figure['aria-label'] = 'สมการต้นฉบับ'
    if notebook:
        # Inline safe layout keeps fractions readable without a remote stylesheet.
        for figure in soup.select('.equation'):
            figure['style'] = 'display:block;overflow-x:auto;padding:16px;margin:20px 0;font-family:serif;line-height:1.8;text-align:center;'
        for fraction in soup.select('.frac'):
            fraction['style'] = 'display:inline-flex;flex-direction:column;text-align:center;vertical-align:middle;line-height:1.5;margin:0 4px;'
            for n, child in enumerate(fraction.find_all('span', recursive=False)):
                child['style'] = 'display:block;padding:2px 4px;white-space:nowrap;' + ('border-top:1px solid currentColor;' if n else '')
        for paren in soup.select('.paren'):
            # Parentheses on the website are CSS-generated; retain them visually here.
            before = soup.new_tag('span', **{'data-layout-only': 'true'})
            before.string = '('
            after = soup.new_tag('span', **{'data-layout-only': 'true'})
            after.string = ')'
            paren.insert(0, before)
            paren.append(after)
        for caption in soup.select('figcaption'):
            caption['style'] = 'display:block;text-align:left;font-size:0.8em;margin-bottom:8px;'
    result = str(soup)
    check = BeautifulSoup(result, 'html.parser')
    for extra in check.select('[data-layout-only]'):
        extra.decompose()
    assert check.get_text() == text(html), f'Text changed in block {index}'
    return f'<div class="vg-source-block" data-source-block="{index}">{result}</div>'


def nav(part):
    items = [f'<a href="{slug}.html"' + (' aria-current="page"' if i == part else '') + f'>ตอนที่ {i+1} · {title}</a>' for i, (slug, title) in enumerate(zip(SLUGS, TITLES))]
    return '<nav class="vg-series-nav" aria-label="The Magnificent Jump — สามตอน">' + ''.join(items) + '</nav>'


def main():
    # Convert the project's bundled approved font locally; SVGs embed glyph paths.
    font = TTFont(ROOT/'assets/fonts/roboto-latin-400-normal.woff2')
    font.flavor = None
    font_path = Path('/tmp/magnificent-jump-roboto.ttf')
    font.save(font_path)
    font_manager.fontManager.addfont(font_path)
    source_path = ROOT/'data/magnificent-jump-source.json'
    source = json.loads(source_path.read_text())
    original = source['blocks']
    assert len(original) == 85
    assert text(original[13]).startswith('การจะสร้าง jump model')
    assert text(original[40]).startswith('เราเรียก stochastic process')
    notebook = nbformat.v4.new_notebook(metadata={
        'kernelspec': {'display_name': 'Python 3', 'language': 'python', 'name': 'python3'},
        'language_info': {'name': 'python', 'version': '3'},
        'authors': [{'name': source['author']}],
        'source_url': source['url'],
        'source_sha256': hashlib.sha256(source_path.read_bytes()).hexdigest(),
    })
    notebook.cells.append(nbformat.v4.new_markdown_cell(
        '# The Magnificent Jump\n\n' + source['author'] + '\n\n'
        f'[ต้นฉบับ]({source["url"]}) · จัดเป็น 3 ตอน โดยคงถ้อยคำและสมการต้นฉบับ\n\n'
        'ส่วน Viz เพิ่มเติมใช้ข้อมูลสมมติ แสดงผลไว้แล้ว และรันซ้ำได้ด้วย Python 3, NumPy และ Matplotlib '
        'ใช้ Run All ตามลำดับเพื่อสร้างกราฟใหม่ การจัดเล่มนี้ไม่ได้ตรวจแก้เนื้อหาต้นฉบับ\n\n'
        '[ตอนที่ 1](#part-1) · [ตอนที่ 2](#part-2) · [ตอนที่ 3](#part-3)'))
    notebook.cells.append(nbformat.v4.new_code_cell(SETUP))
    namespace = {}
    execution = 0

    def execute(cell):
        nonlocal execution
        execution += 1
        capture = io.StringIO()
        outputs = []

        def show():
            for number in plt.get_fignums():
                figure = plt.figure(number)
                buffer = io.BytesIO()
                figure.savefig(buffer, format='png', dpi=150)
                outputs.append(nbformat.v4.new_output('display_data', data={
                    'image/png': base64.b64encode(buffer.getvalue()).decode(),
                    'text/plain': '<Matplotlib figure: hypothetical Variance Gamma visualization>',
                }))

        previous = plt.show
        plt.show = show
        try:
            with contextlib.redirect_stdout(capture):
                exec(compile(cell.source, '<notebook>', 'exec'), namespace)
        finally:
            plt.show = previous
        if capture.getvalue():
            outputs.append(nbformat.v4.new_output('stream', name='stdout', text=capture.getvalue()))
        cell.outputs = outputs
        cell.execution_count = execution

    execute(notebook.cells[-1])
    page_text = []
    for part, (start, stop) in enumerate(RANGES):
        title = f'The Magnificent Jump · ตอนที่ {part+1}'
        heading = f'<a id="part-{part+1}"></a>\n\n## ตอนที่ {part+1} · {TITLES[part]}'
        notebook.cells.append(nbformat.v4.new_markdown_cell(heading))
        website_blocks = []
        for index in range(start, stop):
            website_blocks.append(block(original[index], index))
            cell = nbformat.v4.new_markdown_cell(block(original[index], index, notebook=True))
            cell.metadata['source_block'] = index
            notebook.cells.append(cell)
        body = '\n\n'.join(website_blocks)
        notebook.cells.append(nbformat.v4.new_markdown_cell('### Viz เพิ่มเติม\n\n' + CAPTIONS[part] + f'\n\n[แบบจำลองอ้างอิงสำหรับ Viz: Madan, Carr & Chang (1998)]({PAPER})'))
        cell = nbformat.v4.new_code_cell(CELLS[part])
        notebook.cells.append(cell)
        execute(cell)
        assert len(plt.get_fignums()) == 1
        image_path = ROOT/'assets/images'/f'{FIGURES[part]}.svg'
        plt.gcf().savefig(image_path, format='svg', metadata={'Date': None})
        image_path.write_text('\n'.join(line.rstrip() for line in image_path.read_text().splitlines())+'\n')
        plt.close('all')
        page = f'''---
title: {title}
description: {TITLES[part]} — บทความต้นฉบับโดย สุรพัศ หอมชุ่ม · Math Nerd
notebook: notebooks/the-magnificent-jump.ipynb
author: สุรพัศ หอมชุ่ม · Math Nerd
author_profile: false
---

<link rel="stylesheet" href="assets/magnificent-jump.css">

# {title}

<p class="vg-byline">สุรพัศ หอมชุ่ม · Math Nerd · <a href="{source['url']}">อ่านต้นฉบับ</a></p>

{nav(part)}

<div class="vg-original">

{body}

</div>

<section class="vg-visual" aria-label="Viz เพิ่มเติม">

## Viz เพิ่มเติม

<div class="vg-chart" tabindex="0" role="group" aria-label="กราฟประกอบ เลื่อนแนวนอนได้">
<img src="assets/images/{FIGURES[part]}.svg" alt="{CAPTIONS[part]}" width="1000" height="480" loading="lazy">
</div>

{CAPTIONS[part]}

[แบบจำลองอ้างอิงสำหรับ Viz: Madan, Carr & Chang (1998)]({PAPER})

</section>

{nav(part)}

[ดาวน์โหลด Notebook รวม 3 ตอน](notebooks/the-magnificent-jump.ipynb)
'''
        (ROOT/f'{SLUGS[part]}.md').write_text(page)
        page_text.extend(text(item) for item in original[start:stop])
    assert ''.join(page_text) == ''.join(map(text, original))
    for index, cell in enumerate(notebook.cells):
        cell.id = f'magnificent-jump-{index:03d}'
    nbformat.validate(notebook)
    nbformat.write(notebook, ROOT/'notebooks/the-magnificent-jump.ipynb')
    record = {
        'source_url': source['url'], 'author': source['author'],
        'source_html_sha256': source['source_html_sha256'],
        'source_snapshot_sha256': hashlib.sha256(source_path.read_bytes()).hexdigest(),
        'preservation': 'All 85 article blocks retain their exact text and formula symbols, in order. Only layout, heading levels, three-part navigation and separately labelled visualizations are added. No copyediting or mathematical correction of the original article.',
        'parts': [{'file': slug+'.md', 'source_blocks': [start, stop-1]} for slug, (start, stop) in zip(SLUGS, RANGES)],
        'visual_route': 'no-image-generator', 'design_system': 'QuantCorner / QuantSeras, existing light book layout',
        'viz_reference': PAPER, 'visualizations': CAPTIONS,
        'notebook': {'file': 'notebooks/the-magnificent-jump.ipynb', 'cells': len(notebook.cells), 'executed_code_cells': execution},
    }
    (ROOT/'data/magnificent-jump-provenance.json').write_text(json.dumps(record, ensure_ascii=False, indent=2)+'\n')
    print(f'Preserved {len(original)} source blocks across 3 pages; executed {execution} code cells; generated 3 figures.')


if __name__ == '__main__':
    main()
