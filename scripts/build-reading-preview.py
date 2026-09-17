"""Package the actual Pages build and sample into an offline, review-only HTML page."""
from __future__ import annotations
import base64
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / 'dist-pages'
OUT = ROOT / 'test-artifacts'

def data_url(mime: str, data: bytes) -> str:
    return 'data:' + mime + ';base64,' + base64.b64encode(data).decode()

def build() -> Path:
    html = (DIST / 'chapters/eeg/terminology-and-waveforms/index.html').read_text()
    assets = DIST / '_astro'
    imports = {}
    for path in assets.glob('*.js'):
        code = path.read_text()
        code = re.sub(r'([\"\'])\./([^\"\']+\.js)\1', lambda m: m[1] + 'reading-assets/' + m[2] + m[1], code)
        imports['reading-assets/' + path.name] = data_url('text/javascript', code.encode())
    def css(match):
        tag = match[0]
        href = re.search(r'href="([^"]+)"', tag)
        if href and href[1].endswith('.css'):
            return '<style>' + (assets / Path(href[1]).name).read_text() + '</style>'
        if href and 'rel="icon"' in tag:
            return '<link rel="icon" type="image/svg+xml" href="' + data_url('image/svg+xml', (DIST / 'favicon.svg').read_bytes()) + '" />'
        return tag
    html = re.sub(r'<link\b[^>]*>', css, html)
    html = re.sub(r'<script([^>]*)src="[^"]*/_astro/([^"/]+\.js)"([^>]*)>\s*</script>',
                  lambda m: '<script type="module">import "reading-assets/' + m[2] + '";</script>', html)
    data = data_url('application/json', (DIST / 'reading/real-eeg.json').read_bytes())
    html = html.replace('/eeg-atlas/reading/real-eeg.json', data)
    html = re.sub(r'href="/eeg-atlas/([^\"]*)"', r'href="https://wang-shinan.github.io/eeg-atlas/\1"', html)
    html = html.replace('<head>', '<head><script type="importmap">' + json.dumps({'imports': imports}) + '</script>', 1)
    OUT.mkdir(exist_ok=True)
    output = OUT / 'chapter3-interactive-preview.html'
    output.write_text(html)
    assert 'src="/eeg-atlas/_astro/' not in html, 'Unbundled JS in offline preview'
    return output

if __name__ == '__main__':
    print(build())
