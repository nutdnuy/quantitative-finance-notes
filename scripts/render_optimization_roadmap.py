"""Render the editable Black–Litterman Excalidraw scene as a local SVG.

Only text, rectangles and connectors are used; render exactly those source
coordinates so the website and the editable file share the same composition.
"""
from html import escape
from base64 import b64encode
import json
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
SCENE = ROOT / 'assets/diagrams/optimization-black-litterman-roadmap.excalidraw'
OUTPUT = ROOT / 'assets/images/optimization-black-litterman-roadmap.svg'

def main():
    source = json.loads(SCENE.read_text())
    items = ['<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="740" viewBox="0 0 1080 740" role="img" aria-labelledby="roadmap-title roadmap-desc">',
             '<title id="roadmap-title">Black–Litterman separates beliefs from allocation</title>',
             '<desc id="roadmap-desc">Market inputs yield a reverse-optimized prior. Prior and investor views feed posterior expected excess returns. A separate optimization converts posterior returns to portfolio weights.</desc>',
             '<rect width="1080" height="740" fill="#FFFFFF"/>',
             '<defs><marker id="arrow-purple" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10" fill="none" stroke="#6200EE" stroke-width="1.5"/></marker><marker id="arrow-teal" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10" fill="none" stroke="#007F73" stroke-width="1.5"/></marker></defs>',
             '<g font-family="Roboto,Arial,sans-serif">']
    font = b64encode((ROOT / 'assets/fonts/roboto-latin-400-normal.woff2').read_bytes()).decode()
    items.append(f"<style>@font-face{{font-family:Roboto;src:url(data:font/woff2;base64,{font}) format('woff2');font-weight:400}}</style>")
    for e in source['elements']:
        if e.get('isDeleted'): continue
        x,y,w,h = [e[k] for k in ('x','y','width','height')]
        color=e['strokeColor']
        if e['type']=='rectangle':
            items.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="6" fill="{e["backgroundColor"]}" stroke="{color}" stroke-width="{e["strokeWidth"]}"/>')
        elif e['type']=='text':
            items.append(f'<text x="{x}" y="{y+e["fontSize"]}" font-size="{e["fontSize"]}" fill="{color}">{escape(e["text"])}</text>')
        elif e['type']=='arrow':
            points=' '.join(f'{x+px},{y+py}' for px,py in e['points'])
            marker='arrow-teal' if color=='#007F73' else 'arrow-purple'
            items.append(f'<polyline points="{points}" fill="none" stroke="{color}" stroke-width="{e["strokeWidth"]}" marker-end="url(#{marker})"/>')
        else:
            raise ValueError(f'Unsupported scene type: {e["type"]}')
    items.append('</g></svg>\n')
    OUTPUT.write_text(''.join(items))
    print(f'Rendered {OUTPUT.relative_to(ROOT)} from {len(source["elements"])} editable elements.')

if __name__ == '__main__':
    main()
