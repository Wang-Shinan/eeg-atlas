"""Smoke-test the built Pages site at its real base path; save review screenshots."""
import functools
import json
import tempfile
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from playwright.sync_api import expect, sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'test-artifacts'
OUT.mkdir(exist_ok=True)
assert (ROOT / 'dist-pages/index.html').is_file(), 'Run npm run build:pages first'

with tempfile.TemporaryDirectory() as temporary:
    (Path(temporary) / 'eeg-atlas').symlink_to(ROOT / 'dist-pages', target_is_directory=True)
    server = ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(SimpleHTTPRequestHandler, directory=temporary))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    url = f'http://127.0.0.1:{server.server_port}/eeg-atlas'
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
            page = browser.new_page(viewport={'width': 1440, 'height': 1100}, device_scale_factor=1)
            errors = []
            page.on('pageerror', lambda error: errors.append(str(error)))
            response = page.goto(url + '/chapters/eeg/basic-electrophysiology/')
            assert response and response.status == 200
            assert 'Gamma' in page.locator('main').inner_text()
            assert '切向' in page.locator('main').inner_text()
            page.screenshot(path=str(OUT / 'chapter-1.png'), full_page=True)
            response = page.request.get(url + '/atlas/data/atlas.json')
            assert response.ok
            data = response.json()
            assert data['units'] == 'm' and len(data['montages']) == 10
            assert {m['name'] for m in data['meshes']} == {'scalp', 'brain-left', 'brain-right'}
            counts = {m['id']: m['count'] for m in data['montages']}
            page.goto(url + '/chapters/eeg/montages-and-technical-components/')
            root = page.locator('[data-electrode-atlas]')
            root.locator('[data-atlas-load]').click()
            expect(root).to_have_attribute('data-loaded', 'true', timeout=30000)
            expect(root).to_have_attribute('data-renderer', 'webgl')
            expect(root).to_have_attribute('data-visible-count', str(counts['fsaverage_1020']))
            for family in ['10–10', 'BioSemi', 'HydroCel']:
                root.locator(f'input[data-family="{family}"]').check()
            expect(root).to_have_attribute('data-visible-count', str(21 + 70 + 64 + 129))
            root.locator('select[data-family="BioSemi"]').select_option('biosemi256')
            expect(root).to_have_attribute('data-visible-count', str(21 + 70 + 256 + 129))
            root.locator('[data-atlas-search]').fill('Cz')
            root.locator('[data-atlas-list] input').first.check()
            expect(root).to_have_attribute('data-selected-count', '1')
            assert 'mm' in root.locator('[data-atlas-details]').inner_text()
            canvas = root.locator('[data-atlas-canvas]')
            canvas.focus()
            page.keyboard.press('ArrowLeft')
            root.locator('[data-view="top"]').click()
            page.wait_for_timeout(300)
            # Hide sticky page chrome only while capturing the component for review.
            root.screenshot(path=str(OUT / 'atlas-desktop.png'), style='.site-header { visibility: hidden !important; }')
            root.locator('[data-atlas-clear]').click()
            expect(root).to_have_attribute('data-selected-count', '0')
            for family in ['10–20', '10–10', 'BioSemi', 'HydroCel']:
                root.locator(f'input[data-family="{family}"]').uncheck()
            expect(root).to_have_attribute('data-visible-count', '0')
            root.locator('[data-atlas-search]').fill('')
            root.locator('input[data-family="10–20"]').check()
            root.locator('input[data-family="HydroCel"]').check()
            root.locator('[data-view="reset"]').click()
            page.set_viewport_size({'width': 390, 'height': 844})
            page.wait_for_timeout(300)
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), 'Mobile horizontal overflow'
            root.screenshot(path=str(OUT / 'atlas-mobile.png'), style='.site-header { visibility: hidden !important; }')
            assert (page.request.get(url + '/atlas/THIRD_PARTY_NOTICES.txt')).ok
            plain = browser.new_context(java_script_enabled=False)
            plain_page = plain.new_page()
            plain_page.goto(url + '/chapters/eeg/terminology-and-waveforms/')
            assert 'Gamma' in plain_page.locator('main').inner_text()
            plain.close()
            assert not errors, errors
            (OUT / 'results.json').write_text(json.dumps({'status': 'passed', 'layouts': counts, 'surfaces': [m['name'] for m in data['meshes']], 'checks': ['Pages base path', 'shared gamma content', 'WebGL', 'layout overlay', 'variant switch', 'search/select', 'keyboard', 'empty selection', 'mobile', 'no-JS content'], 'pageErrors': errors}, ensure_ascii=False, indent=2))
            browser.close()
    finally:
        server.shutdown()
print('PASS: Pages assets, real atlas data, WebGL interactions, desktop/mobile and no-JS reading.')
