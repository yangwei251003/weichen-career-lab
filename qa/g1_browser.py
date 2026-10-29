"""Repeatable isolated browser acceptance for projects 01–05.

Uses the shared test harness from g5_browser, never a real user profile.
Run: python qa/g1_browser.py
"""
import argparse
import json
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
from g5_browser import start_server, MOUNT


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
            page.evaluate(MOUNT, {'group': 'g1', 'id': id})

        mount('01')
        assert page.locator('.record-card').count() == 11
        page.locator('[data-form=filter] [name=query]').fill('能策')
        page.locator('[data-form=filter] button[type=submit]').click()
        assert page.locator('.record-card').count() == 1
        page.locator('[data-pick]').check()
        with page.expect_download() as downloaded:
            page.locator('[data-action=export-selected]').click()
        assert '未连接真实设备' in Path(downloaded.value.path()).read_text(encoding='utf-8')
        page.locator('[data-edit]').click()
        page.locator('[data-form=evidence] [name=boundary]').fill('测试边界，保留原始证据')
        page.locator('[data-form=evidence] button[type=submit]').click()
        mount('01')
        assert '测试边界' in page.locator('#qa-root').inner_text()
        checks.append('01: search, selected evidence export, edit and reload')

        mount('02')
        assert page.locator('.record-card').count() == 8
        page.locator('[data-edit]').first.click()
        page.locator('[data-form=job] [name=cohort]').fill('2026届')
        page.locator('[data-form=job] button[type=submit]').click()
        assert '与2028届不同' in page.locator('#qa-root').inner_text()
        checks.append('02: cohort eligibility gate')

        mount('03')
        assert '78,000' in page.locator('#qa-root').inner_text()
        page.locator('[data-form=profile] [name=budget]').fill('30000')
        page.locator('[data-form=profile] button[type=submit]').click()
        assert '48,000' in page.locator('#qa-root').inner_text()
        assert '仅推免，不能作为统考候选' in page.locator('#qa-root').inner_text()
        checks.append('03: budget sensitivity and recommendation-only gate')

        mount('04')
        page.locator('[data-form=attempt] [name=response]').fill('独立回答内容')
        page.locator('[data-action=answer]').click()
        assert page.locator('[data-form=attempt] [name=response]').input_value() == '独立回答内容'
        page.locator('[data-action=record]').click()
        expect(page.locator('#record-status')).to_contain_text('正在录音', timeout=15000)
        page.wait_for_timeout(600)
        page.locator('[data-action=record-stop]').click()
        expect(page.locator('#record-status')).to_contain_text('录音已停止')
        with page.expect_download() as downloaded:
            page.locator('[data-action=record-download]').click()
        assert Path(downloaded.value.path()).stat().st_size > 0
        page.locator('[data-form=attempt] [name=evidence]').fill('synthetic-recording.webm')
        page.locator('[data-form=attempt] [name=result]').select_option('未完成')
        page.locator('[data-form=attempt] button[type=submit]').click()
        mount('04')
        assert '需辅助或失败1次' in page.locator('#qa-root').inner_text()
        checks.append('04: retained draft, synthetic recording, failed attempt and retest history')

        mount('05')
        form = page.locator('[data-form=update]')
        form.locator('[name=evidence]').fill('新获得的职责清单')
        form.locator('[name=conclusion]').fill('继续比较')
        form.locator('[name=reason]').fill('还需带教证据')
        form.locator('[name=nextReview]').fill('2099-12-01')
        form.locator('button[type=submit]').click()
        assert '新获得的职责清单' in page.locator('#qa-root').inner_text()
        assert '以稳定收入和完整业务经验为底线' in page.locator('#qa-root').inner_text()
        checks.append('05: new evidence does not overwrite original judgment')

        for id in ['01', '02', '03', '04', '05']:
            mount(id)
            page.set_viewport_size({'width': 390, 'height': 844})
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), id
        assert not errors, errors
        page.evaluate('window.qaCleanup?.()')
        browser.close()
    return {'passed': True, 'checks': checks, 'mobileApps': 5, 'pageErrors': errors}


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
