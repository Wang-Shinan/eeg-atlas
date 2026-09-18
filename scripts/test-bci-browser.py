"""Smoke tests for curriculum navigation, real built demos, offline review and no-JS."""
from __future__ import annotations
import functools, http.server, json, threading
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'test-artifacts';OUT.mkdir(exist_ok=True)
class Handler(http.server.SimpleHTTPRequestHandler):
    def translate_path(self,path):
        if path.startswith('/eeg-atlas/'): path=path[len('/eeg-atlas'):]
        return super().translate_path(path)
    def log_message(self,*a): pass
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Handler,directory=str(ROOT/'dist-pages')))
threading.Thread(target=server.serve_forever,daemon=True).start()
base=f'http://127.0.0.1:{server.server_port}/eeg-atlas/'
errors=[]
try:
 with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,args=['--no-sandbox'])
    page=browser.new_page(viewport={'width':1440,'height':1000});page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto(base);expect(page.locator('.edition-label')).to_contain_text('18 章')
    links=page.locator('#eeg .course-group li a');assert links.count()==19
    hrefs=links.evaluate_all('(els)=>els.map(e=>e.getAttribute("href"))')
    assert not any('/neonatal/' in h or '/seizures/' in h for h in hrefs)
    for href in hrefs: assert page.request.get(base.rstrip('/')+href.removeprefix('/eeg-atlas')).ok,href
    page.screenshot(path=str(OUT/'bci-home.png'),full_page=True)
    for old in ['normal-awake','normal-asleep','artifacts','normal-variants','neonatal','pediatric','non-epileptiform-abnormalities','epileptiform-activity','seizures']:
        page.goto(base+'chapters/eeg/'+old+'/');expect(page.locator('.legacy-note')).to_be_visible();assert page.request.get(page.locator('.legacy-note a').get_attribute('href').replace('/eeg-atlas/',base)).ok
    page.goto(base+'chapters/eeg/terminology-and-waveforms/');expect(page.locator('.chapter-pagination')).to_contain_text('从连续记录到实验')
    page.goto(base+'chapters/eeg/experiments-and-epochs/');root=page.locator('[data-epoch-lab]');expect(root).to_have_attribute('data-ready','true')
    expect(root).to_have_attribute('data-n-a','64');root.locator('[data-reject]').check();expect(root).to_have_attribute('data-n-a','59')
    root.locator('[data-count]').select_option('1');expect(root).to_have_attribute('data-n-a','0');expect(root.locator('[data-epoch-status]')).to_contain_text('无有效 A')
    root.locator('[data-count]').select_option('64');root.locator('[data-align]').select_option('response');expect(root).to_have_attribute('data-alignment','response')
    root.locator('[data-jitter]').select_option('100');root.locator('[data-baseline]').uncheck();expect(root.locator('[data-epoch-status]')).to_contain_text('未校正')
    root.screenshot(path=str(OUT/'bci-epochs.png'));page.screenshot(path=str(OUT/'bci-chapter4.png'),full_page=True)
    page.goto(base+'chapters/eeg/erp-atlas/');atlas=page.locator('[data-erp-atlas]');expect(atlas).to_have_attribute('data-selected','sensory');assert atlas.locator('[data-erp-card]').count()==15
    for c in ['n170','mmn','n2pc','n2','p3a','p3b','n400','p600','cnv','lrp','ern','pe','feedback','lpp']:
        atlas.locator('select').select_option(c);expect(atlas).to_have_attribute('data-selected',c);expect(atlas.locator(f'[data-erp-card="{c}"]')).to_have_attribute('open','')
    atlas.locator('select').select_option('n2pc');atlas.screenshot(path=str(OUT/'bci-erp.png'));page.screenshot(path=str(OUT/'bci-chapter5.png'),full_page=True)
    page.goto(base+'chapters/eeg/online-collaboration/');expect(page.locator('.chapter-pagination')).to_contain_text('术语速查')
    page.set_viewport_size({'width':390,'height':844})
    for slug,shot in [('experiments-and-epochs','bci-epochs-mobile.png'),('erp-atlas','bci-erp-mobile.png')]:
        page.goto(base+'chapters/eeg/'+slug+'/');assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1');page.locator('.bci-lab').screenshot(path=str(OUT/shot))
    nojs=browser.new_context(java_script_enabled=False);nj=nojs.new_page();nj.goto(base+'chapters/eeg/erp-atlas/');assert nj.locator('[data-erp-card]').count()==15;expect(nj.locator('h1')).to_contain_text('ERP');nj.locator('[data-erp-card="n400"] summary').click();expect(nj.locator('[data-erp-card="n400"] dl')).to_be_visible();nojs.close()
    page.set_viewport_size({'width':1440,'height':1000})
    for filename,selector in [('chapters--eeg--experiments-and-epochs.html','[data-epoch-lab][data-ready="true"]'),('chapters--eeg--erp-atlas.html','[data-erp-atlas][data-selected="sensory"]')]:
        page.goto((OUT/'bci-first-edition'/filename).as_uri());expect(page.locator(selector)).to_be_visible()
    assert not errors,errors
    (OUT/'bci-browser.json').write_text(json.dumps({'pass':True,'mainChapters':18,'legacyRoutes':9,'erpCards':15,'mobileWidth':390,'noJavaScript':True,'offlinePreviews':True,'pageErrors':errors},indent=2))
    browser.close()
finally:server.shutdown()
