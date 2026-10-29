"""Isolated browser acceptance of collaboration, runway, experiments and business flows."""
import argparse
import json
from pathlib import Path
from playwright.sync_api import sync_playwright


def run(url):
    checks = []
    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width': 1440, 'height': 1000}, accept_downloads=True)
        page = context.new_page()
        errors = []
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.on('dialog', lambda d: d.accept())

        def nav(project):
            page.goto(f'{url}/#/project/{project}')
            page.locator('#project-app form').first.wait_for()
            return page.locator('#project-app')

        def state(project):
            return page.evaluate("id=>JSON.parse(localStorage.getItem('weichen-career-lab:v1')).projects[id].data", project)

        def fill(form, values):
            for key, value in values.items():
                form.locator(f'[name="{key}"]').fill(str(value))

        def save(form):
            form.locator('button[type="submit"]').click()

        app = nav('26')
        form = app.locator('[data-form="person"]')
        fill(form, {'name': 'QA合作对象', 'expertise': '测试资料核对'})
        save(form)
        form = app.locator('[data-form="event"]')
        fill(form, {'project': 'QA联合演示', 'mine': '整理输入与来源', 'theirs': '核对演示结果', 'outcome': '记录两条待修问题', 'evidence': '隔离测试记录', 'reason': '愿意继续共同核对事实'})
        save(form)
        form = app.locator('[data-form="promise"]')
        fill(form, {'task': 'QA给出修订后的清单', 'due': '2030-01-01'})
        save(form)
        form = app.locator('[data-form="promise"]')
        target = next(x for x in state('26')['people'] if x['name'] == 'QA合作对象')
        task = next(x for x in state('26')['promises'] if x['person'] == target['id'])
        app.locator(f'[data-action="promise:{task["id"]}"]').first.click()
        form = app.locator('[data-form="promise"]')
        form.locator('[name="status"]').select_option('已兑现')
        save(form)
        assert '依据' in page.locator('#toast').inner_text()
        form.locator('[name="evidence"]').fill('已交付并核对，测试记录')
        save(form)
        with page.expect_download() as ev:
            app.locator('[data-action="export-person"]').click()
        text = Path(ev.value.path()).read_text(encoding='utf-8')
        assert '我的贡献' in text and 'QA给出修订后的清单' in text
        app.locator('[data-action="delete-person"]').click()
        data = state('26')
        assert not any(p['id'] == target['id'] for p in data['people'])
        assert not any(e['person'] == target['id'] for e in data['events'])
        assert not any(p['person'] == target['id'] for p in data['promises'])
        checks.append('26: evidence-backed cooperation, own promise gate, per-person export and complete deletion')

        app = nav('27')
        form = app.locator('[data-form="charter"]')
        fill(form, {'goal': '完成一次可核对的演示', 'b': 'QA伙伴', 'roleA': '整理资料', 'roleB': '检查结果', 'start': '2030-01-01', 'end': '2030-01-10', 'hours': 10, 'budget': 100, 'ownership': '仅共同演示使用；费用事先协商', 'exit': '随时说明退出，交接已完成资料', 'continueWhen': '双方认可交付与沟通'})
        form.locator('[name="consentA"]').select_option('yes')
        form.locator('[name="consentB"]').select_option('yes')
        save(form)
        form = app.locator('[data-form="task"]')
        fill(form, {'title': 'QA首个交付', 'due': '2030-01-05', 'acceptance': '能够核对到输入'})
        form.locator('[name="status"]').select_option('已共同核对')
        save(form)
        assert 'evidence' in page.locator('#toast').inner_text() or '交付依据' in page.locator('#toast').inner_text()
        fill(form, {'evidence': 'QA共同检查记录', 'reviewer': '甲乙双方'})
        save(form)
        form = app.locator('[data-form="issue"]')
        fill(form, {'issue': 'QA范围分歧', 'positionA': '先做一个场景', 'positionB': '希望兼顾第二场景'})
        save(form)
        for who in ['A', 'B']:
            form = app.locator(f'[data-form="review"][data-who="{who}"]')
            fill(form, {'contribution': f'{who}完成自己的职责', 'learned': '先写清验收范围', 'concern': '第二场景仍需讨论'})
            form.locator('[name="decision"]').select_option('调整分工')
            save(form)
        data = state('27')
        assert data['tasks'][0]['status'] == '已共同核对'
        assert data['disagreements'][0]['status'] == '未解决'
        assert data['reviews']['A']['decision'] == '调整分工'
        assert '尚未解决的分歧' in app.inner_text()
        checks.append('27: mutual charter, delivery-evidence gate, two-sided disagreement and independent reviews')

        app = nav('28')
        assert '尚未填写个人现金' in app.inner_text()
        form = app.locator('[data-form="cash"]')
        fill(form, {'cash': 20000, 'protectedCash': 2000, 'living': 2000, 'family': 500, 'debt': 500, 'income': 4000, 'recoverMonth': 3, 'projectInitial': 1000, 'projectMonthly': 100, 'bufferMonths': 3, 'horizon': 6, 'source': 'QA虚构手算输入，不是用户财产'})
        save(form)
        assert '¥18,000' in app.inner_text() and '第6个月' in app.inner_text()
        form = app.locator('[data-form="oneoff"]')
        fill(form, {'name': 'QA一次性学费', 'amount': 1000, 'month': 2})
        save(form)
        assert '0 — ¥8,000' in app.inner_text()
        with page.expect_download() as ev:
            app.locator('[data-action="csv"]').click()
        text = Path(ev.value.path()).read_text(encoding='utf-8-sig')
        assert '全程无收入' in text and '4100' in text
        checks.append('28: starts without personal figures, excludes protected money, monthly/one-off separation and zero-income CSV')

        app = nav('29')
        form = app.locator('[data-form="experiment"]')
        fill(form, {'name': 'QA课程资料实验', 'problem': '同类资料出现错版', 'hypothesis': '有相同问题的用户愿意试用', 'solution': '人工检查一次材料', 'segment': '课程筹备者', 'end': '2030-01-10', 'capCash': 200, 'capHours': 10, 'minUsers': 1, 'minPaying': 1, 'stopRule': '截止未使用则停止，承诺仅为资料核对'})
        form.locator('[name="kind"]').select_option('演示')
        save(form)
        for kind, amount in [('付费意向', 0), ('实际使用', 0), ('实际付款', 100), ('实际付款', 20)]:
            form = app.locator('[data-form="observation"]')
            fill(form, {'customer': 'QA-A', 'quote': f'测试：{kind}', 'frequency': '每周', 'alternative': '现有文档', 'evidence': '隔离自动化测试', 'amount': amount})
            form.locator('[name="type"]').select_option(kind)
            save(form)
        form = app.locator('[data-form="review"]')
        form.locator('[name="reason"]').fill('达到本次计数目标，仍需小样本复核')
        save(form)
        form = app.locator('[data-form="observation"]')
        fill(form, {'customer': 'QA-A', 'quote': '测试：要求退款', 'frequency': '一次', 'evidence': '退款记录测试', 'amount': 120, 'reason': '问题范围不适合'})
        form.locator('[name="type"]').select_option('退款')
        save(form)
        data = state('29')['experiments'][0]
        assert len(data['reviews']) == 1 and len(data['observations']) == 5
        assert '上次复盘后出现新证据' in app.inner_text()
        assert '问题范围不适合' in app.inner_text()
        checks.append('29: preregistered experiment, intention/use/payment separation, repeat payments, preserved review and later refund evidence')

        app = nav('30')
        assert '¥5,000' in app.locator('.stat').filter(has_text='本期新订单金额').inner_text()
        assert '¥3,000' in app.locator('.stat').filter(has_text='本期净确认收入').inner_text()
        form = app.locator('[data-form="event"]')
        form.locator('[name="type"]').select_option('退还款项')
        fill(form, {'amount': 300, 'evidence': 'QA实际退款演练'})
        save(form)
        form = app.locator('[data-form="event"]')
        form.locator('[name="type"]').select_option('坏账情景')
        fill(form, {'amount': 500, 'evidence': 'QA回款风险演练'})
        save(form)
        assert '¥1,800' in app.locator('.stat').filter(has_text='期末应收').inner_text()
        assert '¥1,600' in app.locator('.stat').filter(has_text='现金净流入').inner_text()
        with page.expect_download() as ev:
            app.locator('[data-action="csv"]').click()
        text = Path(ev.value.path()).read_text(encoding='utf-8-sig')
        assert '坏账情景' in text and '500' in text
        checks.append('30: traceable order/revenue/cash distinction, refund, separate bad-debt scenario and CSV reconciliation')

        page.set_viewport_size({'width': 390, 'height': 844})
        for project in ['26', '27', '28', '29', '30']:
            nav(project)
            assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth + 1'), f'{project} overflow'
        assert not errors, errors
        checks.append('26-30: mobile 390px has no document overflow; no JavaScript errors')
        browser.close()
    return {'status': 'PASS', 'checks': checks, 'scope': 'Isolated headless Chromium; all financial/customer values in this test are fictional.'}


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--url', default='http://127.0.0.1:8040')
    print(json.dumps(run(parser.parse_args().url), ensure_ascii=False, indent=2))
