"""Generate the Return lesson notebook and execute its source code examples."""
import contextlib
import hashlib
import io
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
source = (ROOT / 'returns.md').read_text()
body = re.sub(r'\A---\n.*?\n---\n', '', source, flags=re.S)
body = re.sub(r'<[^>]+>', '', body)
body = body.replace('\\(', '$').replace('\\)', '$')
body = re.sub(r'\]\(([^:)\s]+\.html(?:#[^)]*)?)\)',
              r'](https://nutdnuy.github.io/quantitative-finance-notes/\1)', body)
body = body.replace('](notebooks/returns.ipynb)', '](returns.ipynb)')
cells, namespace = [], {}
parts = re.split(r'```python\n(.*?)```', body, flags=re.S)
for i, part in enumerate(parts):
    if not part.strip():
        continue
    if i % 2 == 0:
        cells.append(dict(cell_type='markdown', metadata={}, source=part.strip() + '\n'))
    else:
        output = io.StringIO()
        with contextlib.redirect_stdout(output):
            exec(compile(part, 'returns.md', 'exec'), namespace)
        cells.append(dict(cell_type='code', metadata={}, source=part,
                          execution_count=sum(c['cell_type'] == 'code' for c in cells) + 1,
                          outputs=[dict(output_type='stream', name='stdout', text=output.getvalue())]))
notebook = dict(cells=cells, nbformat=4, nbformat_minor=5, metadata={
    'kernelspec': {'display_name': 'Python 3', 'language': 'python', 'name': 'python3'},
    'language_info': {'name': 'python', 'version': '3'},
    'source_sha256': hashlib.sha256(source.encode()).hexdigest(),
})
for i, cell in enumerate(cells):
    cell['id'] = f'returns-{i:03d}'
(ROOT / 'notebooks/returns.ipynb').write_text(json.dumps(notebook, ensure_ascii=False, indent=2) + '\n')
print(f'Generated notebook: {len(cells)} cells; all code executed successfully.')
print(output.getvalue())
