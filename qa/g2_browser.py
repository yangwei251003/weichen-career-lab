"""Re-runnable, isolated browser checks for project workflows 06-10.
Run: python qa/g2_browser.py --url http://127.0.0.1:8040
No production browser profile or real customer data is read.
"""
import argparse
import json
import time
from pathlib import Path
from playwright.sync_api import sync_playwright


def run(url):
    checks = []
    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1440, "height": 1000}, accept_downloads=True)
        page = context.new_page()
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.on('dialog', lambda dialog: dialog.accept())

        def nav(project):
            page.goto(f'{url}/#/project/{project}')
            page.locator('#project-app form').first.wait_for()
            return page.locator('#project-app')

        def state(project):
            return page.evaluate("id => JSON.parse(localStorage.getItem('weichen-career-lab:v1')).projects[id].data", project)

        def fill(form, values):
            for key, value in values.items():
                form.locator(f'[name="{key}"]').fill(str(value))

        app = nav('06')
        assert app.locator('.comparison-cell').count() == 20
        assert '测试条件不同' in app.inner_text()
        app.locator('[data-action="snapshot"]').click()
        app.locator('[data-action="param:m4-0"]').click()
        form = app.locator('[data-form="param"]')
        form.locator('[name="value"]').fill('1220（测试修订）')
        form.locator('button[type="submit"]').click()
        assert '资料已变更，须重新比较' in app.inner_text()
        assert state('06')['reports'][0]['revision'] < state('06')['revision']
        with page.expect_download() as event:
            app.locator('[data-action="export"]').click()
        assert '1220（测试修订）' in Path(event.value.path()).read_text(encoding='utf-8')
        with page.expect_download() as event:
            app.locator('[data-action="source-pack"]').click()
        source_pack = Path(event.value.path()).read_bytes()
        checks.append('06: source-linked comparison, edit invalidates snapshot, Markdown and cross-app source export')

        app = nav('07')
        app.locator('[data-action="topic:推介"]').click()
        app.locator('[data-form="question"] button[type="submit"]').click()
        assert '你还没了解我们的流程' in app.locator('.transcript').inner_text()
        for topic in ['现状', '预算', '验收']:
            app.locator(f'[data-action="topic:{topic}"]').click()
            app.locator('[data-form="question"] button[type="submit"]').click()
        app.locator('[data-action="timer"]').click()
        time.sleep(1.2)
        app.locator('[data-action="timer"]').click()
        reflection = app.locator('[data-form="reflection"]')
        fill(reflection, {'observations': '测试：先理解教学流程再演示功能。', 'assumptions': '预算仍需负责人核对。', 'summary': '培训人员需要减少错版，先用一场课程验证。'})
        reflection.locator('button[type="submit"]').click()
        app.locator('[data-action="archive"]').click()
        page.reload()
        page.locator('#project-app form').first.wait_for()
        saved = state('07')
        assert len(saved['sessions']) == 1 and saved['sessions'][0]['elapsed'] >= 1
        assert len(saved['turns']) == 4 and '培训人员' in saved['summary']
        checks.append('07: early-pitch branch, three topics, real timer, reflection and archived persistence')

        app = nav('08')
        form = app.locator('[data-form="cost"]')
        fill(form, {'months': 2, 'quantity': 1, 'unitCost': 100, 'training': 10, 'delivery': 20, 'maintenance': 5, 'laborHours': 2, 'hourlyCost': 10, 'consumables': 3, 'downtime': 2, 'quote': 200, 'delay': 2, 'baselineMonthly': 200})
        form.locator('button[type="submit"]').click()
        assert '¥190' in app.locator('.stat').filter(has_text='期间总成本').inner_text()
        assert '¥160' in app.locator('.stat').filter(has_text='最大资金缺口').inner_text()
        app.locator('[data-action="snapshot"]').click()
        assert len(state('08')['saved']) == 1
        with page.expect_download() as event:
            app.locator('[data-action="timeline"]').click()
        assert '累计现金元' in Path(event.value.path()).read_text(encoding='utf-8-sig')
        checks.append('08: manually verified two-month cash flow, sensitivity table, snapshot and CSV export')

        app = nav('09')
        assert '数字无来源' in app.inner_text() and '来源过期' in app.inner_text()
        app.locator('[data-file="sources"]').set_input_files({'name': 'sources.json', 'mimeType': 'application/json', 'buffer': source_pack})
        page.wait_for_function("JSON.parse(localStorage.getItem('weichen-career-lab:v1')).projects['09'].data.sources.length === 4")
        form = app.locator('[data-form="draft"]')
        form.locator('[name="text"]').fill('客户场景的问题是资料错版。下一步请使用者试用，再验证效果。')
        form.locator('button[type="submit"]').click()
        app.locator('[data-action="timer"]').click()
        time.sleep(1.1)
        app.locator('[data-action="timer"]').click()
        release = app.locator('[data-form="release"]')
        release.locator('[name="reviewer"]').fill('自动化测试审阅者')
        release.locator('button[type="submit"]').click()
        assert len(state('09')['releases']) == 1
        assert state('09')['draft']['actualSeconds'] >= 1
        with page.expect_download() as event:
            app.locator('[data-action="report"]').click()
        assert '规则检查' in Path(event.value.path()).read_text(encoding='utf-8')
        checks.append('09: numeric/source-expiry checks, 06 source import, revision resets reviews, timing and review snapshot')

        app = nav('10')
        form = app.locator('[data-form="opportunity"]')
        fill(form, {'name': 'QA匿名试点', 'need': '验证带版本的交付资料', 'owner': '测试责任人', 'next': '核对验收范围', 'due': '2030-01-01'})
        form.locator('[name="kind"]').select_option('真实授权')
        form.locator('button[type="submit"]').click()
        assert '授权' in page.locator('#toast').inner_text()
        form.locator('[name="authorization"]').fill('隔离浏览器中的测试数据，不是真实业务。')
        form.locator('button[type="submit"]').click()
        assert len(state('10')['opportunities']) == 6
        interaction = app.locator('[data-form="interaction"]')
        fill(interaction, {'note': '测试：同意先核对来源与验收范围。', 'next': '准备一个演示样例'})
        interaction.locator('button[type="submit"]').click()
        quote = app.locator('[data-form="quote"]')
        fill(quote, {'amount': 1500, 'validUntil': '2030-02-01', 'scope': '测试草稿报价，包含一次演示与复核。'})
        quote.locator('button[type="submit"]').click()
        target = next(x for x in state('10')['opportunities'] if x['name'] == 'QA匿名试点')
        app.locator(f'[data-action="edit:{target["id"]}"]').click()
        form = app.locator('[data-form="opportunity"]')
        form.locator('[name="stage"]').select_option('已报价')
        form.locator('button[type="submit"]').click()
        quote = app.locator('[data-form="quote"]')
        fill(quote, {'amount': 1800, 'validUntil': '2030-03-01', 'scope': '测试第二版：增加一次修改。'})
        quote.locator('button[type="submit"]').click()
        target = next(x for x in state('10')['opportunities'] if x['name'] == 'QA匿名试点')
        assert target['stage'] == '已报价'
        assert len(target['interactions']) == 1
        assert [q['amount'] for q in target['quotes']] == [1500, 1800]
        assert [q['version'] for q in target['quotes']] == [1, 2]
        with page.expect_download() as event:
            app.locator('[data-action="csv"]').click()
        assert 'QA匿名试点' in Path(event.value.path()).read_text(encoding='utf-8-sig')
        checks.append('10: authorization gate, unique next step, interaction, quoted-stage gate, immutable quote versions and CSV')

        page.set_viewport_size({'width': 390, 'height': 844})
        for project in ['06', '07', '08', '09', '10']:
            nav(project)
            assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth + 1'), f'{project} horizontal overflow'
        assert not errors, errors
        checks.append('06-10: 390px mobile overflow checks, no JavaScript page errors')
        browser.close()
    return {'status': 'PASS', 'checks': checks, 'scope': 'Isolated headless Chromium; does not prove real customer adoption or outcomes.'}


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--url', default='http://127.0.0.1:8040')
    args = parser.parse_args()
    print(json.dumps(run(args.url), ensure_ascii=False, indent=2))
