"""Verify complete wording/formula preservation in built pages and notebook."""
import json
from pathlib import Path
import nbformat
from bs4 import BeautifulSoup

root = Path(__file__).resolve().parents[1]
source = json.loads((root/'data/magnificent-jump-source.json').read_text())
slugs = ['magnificent-jump-intro', 'magnificent-jump-random-clock', 'magnificent-jump-variance-gamma']


def canonical(fragment):
    soup = BeautifulSoup(fragment, 'html.parser')
    for added in soup.select('[data-layout-only]'):
        added.decompose()
    return soup.get_text(), [(x.name, x.get_text()) for x in soup.select('sub, sup, .frac')]


expected = [canonical(block) for block in source['blocks']]
for directory in [root, root/'_site']:
    actual = []
    indices = []
    for slug in slugs:
        soup = BeautifulSoup((directory/f'{slug}.html').read_text(), 'html.parser')
        blocks = soup.select('[data-source-block]')
        actual.extend(canonical(str(block)) for block in blocks)
        indices.extend(int(block['data-source-block']) for block in blocks)
        assert source['author'] in soup.select_one('.book-footer').get_text()
        assert not soup.select('.author-card'), 'Guest article must not use the owner byline'
        assert len(soup.select('.vg-chart img')) == 1
        assert soup.select_one('.book-sidebar-footer a')['href'] == 'notebooks/the-magnificent-jump.ipynb'
    assert indices == list(range(85)), indices
    assert actual == expected, f'Original text or formula markup changed in {directory}'

notebook = nbformat.read(root/'notebooks/the-magnificent-jump.ipynb', as_version=4)
nbformat.validate(notebook)
blocks = [cell for cell in notebook.cells if 'source_block' in cell.metadata]
assert [cell.metadata.source_block for cell in blocks] == list(range(85))
assert [canonical(cell.source) for cell in blocks] == expected
assert sum('<a id="part-' in cell.source for cell in notebook.cells) == 3
code = [cell for cell in notebook.cells if cell.cell_type == 'code']
assert [cell.execution_count for cell in code] == [1, 2, 3, 4]
assert sum('image/png' in output.get('data', {}) for cell in code for output in cell.outputs) == 3
assert not any(output.output_type == 'error' for cell in code for output in cell.outputs)
print('PASS: 85/85 source blocks and formula markup preserved in local pages, offline export and notebook; three parts, three figures, four executed cells, correct guest author.')
