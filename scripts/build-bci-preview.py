"""Bundle actual built pages and their resources for offline editorial review."""
from __future__ import annotations
import base64, json, re, shutil
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
DIST=ROOT/'dist-pages'
OUT=ROOT/'test-artifacts'/'bci-first-edition'
def data_url(mime, data): return 'data:'+mime+';base64,'+base64.b64encode(data).decode()
def build():
    OUT.mkdir(parents=True,exist_ok=True)
    pages=[DIST/'index.html',DIST/'sources/index.html',*sorted((DIST/'chapters').glob('*/*/index.html'))]
    routes={}
    for p in pages:
        rel=p.relative_to(DIST).as_posix()
        name='index.html' if rel=='index.html' else rel.removesuffix('/index.html').replace('/','--')+'.html'
        routes['/eeg-atlas/'+('' if rel=='index.html' else rel.removesuffix('index.html'))]=name
    imports={}
    for p in (DIST/'_astro').glob('*.js'):
        js=re.sub(r'([\"\'])\./([^\"\']+\.js)\1',lambda m:m[1]+'bci-assets/'+m[2]+m[1],p.read_text())
        imports['bci-assets/'+p.name]=data_url('text/javascript',js.encode())
    def asset(url):
        if not url.startswith('/eeg-atlas/'): return url
        p=DIST/url.removeprefix('/eeg-atlas/')
        if not p.is_file(): return url
        mime={'.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.json':'application/json','.ico':'image/x-icon','.txt':'text/plain'}.get(p.suffix)
        return data_url(mime,p.read_bytes()) if mime else url
    for p in pages:
        html=p.read_text()
        def link(m):
            tag=m[0];href=re.search(r'href="([^"]+)"',tag)
            if href and href[1].endswith('.css'): return '<style>'+(DIST/'_astro'/Path(href[1]).name).read_text()+'</style>'
            if href and 'rel="icon"' in tag:return tag.replace(href[1],asset(href[1]))
            return tag
        html=re.sub(r'<link\b[^>]*>',link,html)
        html=re.sub(r'<script([^>]*)src="[^"]*/_astro/([^"/]+\.js)"([^>]*)>\s*</script>',lambda m:'<script type="module">import "bci-assets/'+m[2]+'";</script>',html)
        html=re.sub(r'((?:src|data-src|data-atlas-src|data-reading-src|data-source|data-url)="|href=")(/eeg-atlas/[^"#]+)(")',lambda m:m[1]+asset(m[2])+m[3],html)
        for endpoint in ['reading/real-eeg.json','atlas/data/atlas.json']:
            html=html.replace('/eeg-atlas/'+endpoint,asset('/eeg-atlas/'+endpoint))
        def local(m):
            url=m[1];base,sep,anchor=url.partition('#')
            return 'href="'+routes.get(base,'https://wang-shinan.github.io'+base)+(sep+anchor if sep else '')+'"'
        html=re.sub(r'href="(/eeg-atlas/[^\"]*)"',local,html)
        html=html.replace('<head>','<head><script type="importmap">'+json.dumps({'imports':imports})+'</script>',1)
        rel=p.relative_to(DIST).as_posix();route='/eeg-atlas/'+('' if rel=='index.html' else rel.removesuffix('index.html'))
        (OUT/routes[route]).write_text(html)
    # Keep the complete template/surface license with the redistributed offline copy.
    shutil.copyfile(DIST/'atlas/THIRD_PARTY_NOTICES.txt',OUT/'THIRD_PARTY_NOTICES.txt')
    (OUT/'README.txt').write_text('从 index.html 打开整套离线预览，建议使用当前 Chrome / Edge。所有内容来自实际构建；不代表已经发布到线上。第四、五章为合成教学演示。文献外链仍需网络。正文无需 JavaScript，交互需要 JavaScript。模板及表面许可见 THIRD_PARTY_NOTICES.txt；教学图片的作者、来源与许可见 sources.html 对应的图源页面。\n')
    archive=shutil.make_archive(str(ROOT/'test-artifacts'/'bci-first-edition'),'zip',OUT)
    print(archive)
if __name__=='__main__':build()
