"""Exercise the actual built Pages subpath, including failure/retry and offline preview."""
from __future__ import annotations
import functools
import json
import os
import tempfile
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from playwright.sync_api import expect, sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'test-artifacts'
OUT.mkdir(exist_ok=True)
PAGE = '/chapters/eeg/terminology-and-waveforms/'
assert (ROOT / 'dist-pages/index.html').is_file()

class Quiet(SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass

def number(root, name, value):
    control = root.locator(f'[data-{name}]')
    control.fill(str(value)); control.press('Tab')

with tempfile.TemporaryDirectory() as temporary:
    (Path(temporary) / 'eeg-atlas').symlink_to(ROOT / 'dist-pages', target_is_directory=True)
    (Path(temporary) / 'preview.html').symlink_to(OUT / 'chapter3-interactive-preview.html')
    server = ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Quiet, directory=temporary))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    origin = f'http://127.0.0.1:{server.server_port}'
    url = origin + '/eeg-atlas'
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(**({'executable_path': os.environ['CHROMIUM_EXECUTABLE']} if os.environ.get('CHROMIUM_EXECUTABLE') else {}))
            page = browser.new_page(viewport={'width':1440, 'height':1100}, device_scale_factor=1)
            errors = []; page.on('pageerror', lambda error: errors.append(str(error)))
            assert page.goto(url + PAGE).status == 200
            root = page.locator('[data-reading]')
            expect(root.locator('[data-workspace]')).to_be_hidden()
            root.locator('[data-load]').click()
            expect(root).to_have_attribute('data-loaded', 'true', timeout=30000)
            expect(root).to_have_attribute('data-sample', 'physionet-s001r02')
            expect(root).to_have_attribute('data-channel', 'O1')
            expect(root).to_have_attribute('data-selection', '0:1920')
            assert '310.00' in root.locator('[data-numbers]').inner_text()
            original_power = float(root.get_attribute('data-power'))
            root.locator('[data-gain]').select_option('100')
            assert float(root.get_attribute('data-power')) == original_power
            root.locator('[data-gain]').select_option('250')
            root.locator('[data-map-mode]').select_option('power')
            expect(root).to_have_attribute('data-map', 'power')
            number(root, 'cursor-a', 5)
            expect(root).to_have_attribute('data-cursor-a', '800')
            assert float(root.get_attribute('data-power')) == original_power
            number(root, 'start', 4); number(root, 'end', 6)
            expect(root).to_have_attribute('data-selection', '640:960')
            assert float(root.get_attribute('data-power')) != original_power
            root.locator('[data-spectrum-view]').select_option('tfr')
            expect(root).to_have_attribute('data-mode', 'tfr')
            assert '1 秒窗' in root.locator('[data-spectral-note]').inner_text()
            root.locator('[data-channel]').select_option('18')
            expect(root).to_have_attribute('data-channel', 'O2')
            number(root, 'start', 0); number(root, 'end', 12)
            root.locator('[data-channel]').select_option('17')
            root.locator('[data-spectrum-view]').select_option('psd')
            page.wait_for_timeout(250)
            root.screenshot(path=str(OUT / 'reading-desktop.png'), style='.site-header{visibility:hidden!important}')
            root.locator('[data-sample]').select_option('continuous')
            expect(root).to_have_attribute('data-sample', 'continuous')
            assert root.locator('[data-gain]').input_value() == '50'
            pa = float(root.get_attribute('data-power'))
            root.locator('[data-lock]').check(); page.wait_for_timeout(150)
            scale = root.get_attribute('data-map-scale')
            root.locator('[data-sample]').select_option('burst')
            expect(root).to_have_attribute('data-sample', 'burst')
            assert .8 < float(root.get_attribute('data-power')) / pa < 1.25
            assert root.get_attribute('data-map-scale') == scale
            root.locator('[data-spectrum-view]').select_option('tfr')
            expect(root).to_have_attribute('data-mode', 'tfr')
            page.wait_for_timeout(150)
            root.screenshot(path=str(OUT / 'reading-burst.png'), style='.site-header{visibility:hidden!important}')
            root.locator('[data-map-mode]').select_option('voltage'); expect(root.locator('[data-lock]')).not_to_be_checked()
            number(root, 'cursor-a', 4)
            wave = root.locator('[data-wave]'); wave.focus(); page.keyboard.press('ArrowRight')
            expect(root).to_have_attribute('data-cursor-a', '641')
            wave.scroll_into_view_if_needed(); box = wave.bounding_box()
            x0 = box['x'] + 48; span = box['width'] - 60
            page.mouse.move(x0 + span * 2/12, box['y'] + 65); page.mouse.down()
            page.mouse.move(x0 + span * 5/12, box['y'] + 65, steps=6); page.mouse.up()
            expect(root).to_have_attribute('data-selection', '320:800')
            root.locator('[data-zoom]').click(); page.wait_for_timeout(100)
            assert '视野 2.00–5.00' in root.locator('[data-selection-note]').inner_text()
            root.locator('[data-reset]').click()
            number(root, 'cursor-a', 0); number(root, 'cursor-b', 0)
            expect(root.locator('[data-measure]')).to_contain_text('未定义')
            number(root, 'end', 12); number(root, 'start', 11.99)
            expect(root).to_have_attribute('data-selection', '1760:1920')
            root.locator('[data-count]').select_option('19')
            page.wait_for_timeout(100); assert root.locator('[data-wave]').bounding_box()['height'] > 650
            root.locator('[data-count]').select_option('8')
            for sample in ['transient','background-low','background-high','real']:
                root.locator('[data-sample]').select_option(sample)
                expect(root).to_have_attribute('data-sample', 'physionet-s001r02' if sample == 'real' else sample)
            number(root, 'start', 0); number(root, 'end', 12)
            root.locator('[data-spectrum-view]').select_option('tfr'); root.locator('[data-map-mode]').select_option('power')
            page.set_viewport_size({'width':390,'height':844}); page.wait_for_timeout(200)
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), 'Mobile overflow'
            root.screenshot(path=str(OUT / 'reading-mobile.png'), style='.site-header{visibility:hidden!important}')
            page.set_viewport_size({'width':1440,'height':1100})
            page.screenshot(path=str(OUT / 'chapter-3.png'), full_page=True)
            plain = browser.new_context(java_script_enabled=False); plain_page = plain.new_page(); plain_page.goto(url + PAGE)
            assert '形状与组织方式' in plain_page.locator('main').inner_text()
            assert 'Gamma' in plain_page.locator('main').text_content(); plain.close()
            failed = browser.new_page(); failed.on('pageerror', lambda e: errors.append(str(e)))
            failed.route('**/reading/real-eeg.json', lambda route: route.fulfill(status=503, body='Unavailable'))
            failed.goto(url + PAGE); failed.locator('[data-load]').click()
            expect(failed.locator('[data-status]')).to_contain_text('503')
            expect(failed.locator('[data-workspace]')).to_be_hidden()
            failed.unroute('**/reading/real-eeg.json'); failed.locator('[data-load]').click()
            expect(failed.locator('[data-reading]')).to_have_attribute('data-loaded','true',timeout=30000)
            failed.close()
            preview = browser.new_page(); preview.on('pageerror',lambda e: errors.append(str(e)))
            external = []; preview.on('request', lambda r: external.append(r.url) if r.url.startswith('http') and not r.url.startswith(origin) else None)
            preview.goto(origin + '/preview.html'); preview.locator('[data-load]').click()
            expect(preview.locator('[data-reading]')).to_have_attribute('data-loaded','true',timeout=30000)
            assert not external, external
            assert not errors, errors
            (OUT / 'reading-browser.json').write_text(json.dumps({'status':'passed','checks':['actual Pages base path','real calibration','gain leaves numbers unchanged','selection/PSD/STFT/map linkage','cursor independence of band power','channel selection','all synthetic examples','locked colour scale','pointer drag and zoom','keyboard cursor','zero delta and boundary input','all channels','390px viewport','no-JS text','network error/retry','offline built-code preview'],'pageErrors':errors},ensure_ascii=False,indent=2))
            browser.close()
    finally:
        server.shutdown()
print('PASS: reading interactions, numeric state, desktop/mobile, no-JS, failure/retry and offline preview.')
