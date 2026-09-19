"""Build and execute the two foundation notebooks from canonical Markdown."""
import hashlib,json,re,sys
from pathlib import Path
import make_portfolio_optimization_notebook as nb
from return_foundations_snippets import PRICE_SNIPPETS,PROCESS_SNIPPETS
ROOT=Path(__file__).resolve().parents[1]

def build(slug,snippets):
    source=(ROOT/(slug+'.md')).read_text()
    body=re.sub(r'\A---\n.*?\n---\n','',source,flags=re.S)
    body=re.sub(r'<div id="[^"]+-lab"></div>','',body)
    nb.cells,nb.namespace=[],{}
    nb.markdown(body.split('<section id="',1)[0])
    helper=(ROOT/'scripts/stylized_facts_math.py').read_text()+'\n'+(ROOT/'scripts/return_foundations_math.py').read_text().replace('from stylized_facts_math import normal_generator, moments','')
    nb.code(helper+'\n\ndef close(a,b,tol=1e-10):\n    assert math.isclose(a,b,rel_tol=tol,abs_tol=tol),(a,b)\nprint("Self-contained standard-library examples. All numerical series are hypothetical.")')
    for name,content in re.findall(r'<section id="([^"]+)">(.*?)</section>',body,re.S):
        nb.markdown(content)
        if name in snippets:nb.code(snippets[name])
    for i,cell in enumerate(nb.cells):cell['id']=slug+f'-{i:02d}'
    notebook={'nbformat':4,'nbformat_minor':5,'cells':nb.cells,'metadata':{'kernelspec':{'display_name':'Python 3','language':'python','name':'python3'},'language_info':{'name':'python','version':sys.version.split()[0]},'source':{'path':slug+'.md','sha256':hashlib.sha256(source.encode()).hexdigest()},'execution':{'method':'Every code cell executed in a fresh shared namespace; stdout captured','generator':'scripts/make_return_foundations_notebooks.py'}}}
    (ROOT/'notebooks'/(slug+'.ipynb')).write_text(json.dumps(notebook,ensure_ascii=False,indent=1)+'\n')
    print(slug,len(nb.cells),'cells;',sum(c['cell_type']=='code' for c in nb.cells),'executed code cells')

if __name__=='__main__':
    build('prices-and-returns',PRICE_SNIPPETS)
    build('stochastic-processes',PROCESS_SNIPPETS)
