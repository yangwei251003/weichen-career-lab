"""Isolated, repeatable browser acceptance for projects 21–25.

Run: python qa/g5_browser.py
Or: python qa/g5_browser.py --url http://127.0.0.1:8040/
Requires an existing Python Playwright installation and Chromium. Never uses a
real browser profile, real microphone, or the user's saved project data.
"""
import argparse
import json
import os
from pathlib import Path
import socket
import subprocess
import time
from urllib.request import urlopen
from playwright.sync_api import sync_playwright, expect


ROOT = Path(__file__).resolve().parents[1]


def start_server():
    with socket.socket() as sock:
        sock.bind(('127.0.0.1', 0))
        port = sock.getsockname()[1]
    env = {**os.environ, 'PORT': str(port)}
    flags = subprocess.CREATE_NO_WINDOW if os.name == 'nt' else 0
    process = subprocess.Popen(['node', 'scripts/serve.mjs'], cwd=ROOT, env=env,
                               stdout=subprocess.DEVNULL, stderr=subprocess.PIPE,
                               creationflags=flags)
    url = f'http://127.0.0.1:{port}/'
    for _ in range(100):
        if process.poll() is not None:
            raise RuntimeError(process.stderr.read().decode(errors='replace'))
        try:
            with urlopen(url, timeout=0.5) as response:
                if response.status == 200:
                    return process, url
        except OSError:
            time.sleep(0.1)
    process.terminate()
    process.wait(timeout=5)
    raise RuntimeError('Test server did not become ready')


MOUNT = """async ({group,id}) => {
 if(window.qaCleanup) window.qaCleanup();
 const {apps}=await import(`./src/groups/${group}/index.js`);
 const {createStore,download,today}=await import('./src/core.js');
 document.body.innerHTML='<main id="qa-root" class="stack"></main>';
 window.qaMessages=[];
 window.qaCleanup=apps[id].mount(document.getElementById('qa-root'),{
  id, store:createStore(id,apps[id].validate),
  notify:(message,kind)=>window.qaMessages.push({message,kind}),
  confirm:()=>true,download,today,onCleanup:()=>{}
 });
} """


def run(url):
    checks = []
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, args=[
            '--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'])
        context = browser.new_context(permissions=['microphone'], accept_downloads=True,
                                      viewport={'width': 1440, 'height': 1000})
        page = context.new_page()
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.goto(url, wait_until='networkidle')

        def mount(id):
            page.evaluate(MOUNT, {'group': 'g5', 'id': id})

        def fill(form, name, value):
            page.locator(f'[data-form="{form}"] [name="{name}"]').fill(value)

        def submit(form):
            page.locator(f'[data-form="{form}"] button[type="submit"]').click()

        def content():
            return page.locator('#qa-root').inner_text()

        mount('21')
        assert page.locator('[data-scene]').count() == 3
        fill('session', 'response', 'The maximum flight time depends on the payload.')
        page.locator('[data-action=guide]').click()
        assert page.locator('[data-form=session] [name=response]').input_value().startswith('The maximum')
        page.locator('[data-action=timer]').click()
        page.wait_for_timeout(1100)
        page.locator('[data-action=timer-stop]').click()
        assert page.locator('#english-clock').inner_text() != '00:00'
        page.locator('[data-action=record]').click()
        expect(page.locator('#english-record-status')).to_contain_text('正在录音', timeout=15000)
        page.wait_for_timeout(600)
        page.locator('[data-action=stop-record]').click()
        expect(page.locator('#english-record-status')).to_contain_text('录音已停止')
        with page.expect_download() as downloaded:
            page.locator('[data-action=audio]').click()
        assert Path(downloaded.value.path()).stat().st_size > 0
        fill('session', 'summary', '客户需要确认负载下的任务时间和报告交付')
        fill('session', 'unknown', '载荷与当地条件待查官方资料')
        fill('session', 'errors', '漏问验收方式，下一次补问')
        fill('session', 'recording', 'simulated-recording.webm')
        submit('session')
        mount('21')
        assert '漏问验收方式' in content()
        assert '第一次' in content() and '最近一次' in content()
        checks.append('21: 3 roles, draft retention, timer, fake recording/download, history')

        mount('22')
        assert page.locator('tbody tr').count() == 30
        assert '中英文版本不同' in content() and '55|min' in content()
        approval = page.locator('[data-form=approve][data-id=b1]')
        approval.locator('[name=reviewer]').fill('模拟审校者')
        approval.locator('button[type=submit]').click()
        assert any('规则差异' in m['message'] for m in page.evaluate('window.qaMessages'))
        page.locator('[data-edit=b1]').click()
        fill('doc', 'enVersion', 'v1.1')
        field = page.locator('[data-form=doc] [name=en]')
        field.fill(field.input_value().replace('50 minutes', '55 minutes'))
        submit('doc')
        approval = page.locator('[data-form=approve][data-id=b1]')
        approval.locator('[name=reviewer]').fill('模拟审校者')
        approval.locator('button[type=submit]').click()
        assert '人工审校记录有效' in content()
        with page.expect_download() as downloaded:
            page.locator('[data-action=publish]').click()
        assert '55 minutes' in Path(downloaded.value.path()).read_text(encoding='utf-8')
        page.locator('[data-edit=b1]').click()
        fill('doc', 'zh', page.locator('[data-form=doc] [name=zh]').input_value().replace('55分钟', '56分钟'))
        submit('doc')
        assert '需要重审' in content()
        checks.append('22: 30 terms, version/numeric gate, human approval, export, invalidation')

        mount('23')
        assert page.locator('[data-task]').count() == 3
        fill('assessment', 'reviewer', '模拟观察者')
        fill('assessment', 'evidence', 'demo.webm')
        page.locator('[data-form=assessment] [name=result]').select_option('独立完成')
        submit('assessment')
        assert any('逐项满足' in m['message'] for m in page.evaluate('window.qaMessages'))
        for checkbox in page.locator('[data-form=assessment] input[type=checkbox]').all():
            checkbox.check()
        submit('assessment')
        assert '已记录独立完成' in content()
        with page.expect_download() as downloaded:
            page.locator('[data-action=pack-json]').click()
        package = json.loads(Path(downloaded.value.path()).read_text(encoding='utf-8'))
        assert len(package['course']['tasks']) == 3
        assert 'learners' not in package and 'assessments' not in package
        page.locator('#training-editor > summary').click()
        fill('course', 'version', '练习版1.1')
        submit('course')
        assert '旧版记录，需复测' in content()
        checks.append('23: practical checklist gate, evidence, clean reusable package, version expiry')

        mount('24')
        assert '新加坡' in content() and '目前不进入的理由' in content()
        page.locator('[data-form=evidence] [name=category]').select_option('已核采购')
        page.locator('[data-form=evidence] [name=status]').select_option('假设')
        fill('evidence', 'claim', '未核实的采购传闻')
        fill('evidence', 'counter', '尚无正式公告')
        fill('evidence', 'next', '查原始采购公告')
        submit('evidence')
        assert any('未核实采购' in m['message'] for m in page.evaluate('window.qaMessages'))
        page.locator('[data-form=evidence] [name=category]').select_option('需求假设')
        submit('evidence')
        mount('24')
        assert '未核实的采购传闻' in content()
        page.locator('[data-form=evidence] [name=category]').select_option('已核采购')
        page.locator('[data-form=evidence] [name=status]').select_option('已核实')
        fill('evidence', 'claim', '未来日期不得成为当前已核采购')
        fill('evidence', 'source', 'https://example.org/test-source')
        fill('evidence', 'checked', '2099-01-01')
        fill('evidence', 'counter', '这是隔离测试，无真实采购')
        fill('evidence', 'next', '等待真实日期和原始证据')
        submit('evidence')
        assert any('未来' in m['message'] for m in page.evaluate('window.qaMessages'))
        fill('evidence', 'checked', '2026-10-29')
        fill('evidence', 'published', '2099-01-01')
        submit('evidence')
        assert any('发布日期' in m['message'] for m in page.evaluate('window.qaMessages'))
        checks.append('24: region-specific source, non-entry reasons, hypothesis/procurement separation, future dates blocked')

        mount('25')
        assert '8,000' in content() and '10,000' in content()
        page.locator('[data-scenario=stress]').click()
        assert '第90天' in content()
        page.locator('details:has([data-form=deal]) > summary').click()
        fill('deal', 'initialCash', '20000')
        submit('deal')
        assert '当前假设无日末缺口' in content()
        with page.expect_download() as downloaded:
            page.locator('[data-action=csv]').click()
        assert '压力假设' in Path(downloaded.value.path()).read_text(encoding='utf-8-sig')
        mount('25')
        assert '当前假设无日末缺口' in content()
        checks.append('25: reproducible cash gap, stress delay, funding sensitivity, CSV, persistence')

        for id in ['21', '22', '23', '24', '25']:
            mount(id)
            page.set_viewport_size({'width': 390, 'height': 844})
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), id
        assert not errors, errors
        checks.append('5 mobile layouts have no page overflow; zero JavaScript page errors')
        page.evaluate('window.qaCleanup?.()')
        browser.close()
    return {'passed': True, 'checks': checks, 'microphone': 'synthetic Chromium device; no human audio quality claim'}


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--url')
    args = parser.parse_args()
    process = None
    try:
        if args.url:
            url = args.url.rstrip('/') + '/'
        else:
            process, url = start_server()
        print(json.dumps(run(url), ensure_ascii=False, indent=2))
    finally:
        if process is not None:
            process.terminate()
            process.wait(timeout=10)
