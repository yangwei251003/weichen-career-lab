"""Real isolated Chromium acceptance for projects 36–40; no real user profile/data.
Run: python qa/g8_browser.py [--url http://127.0.0.1:8040/]
Uses existing Python Playwright/Chromium and g5's isolated test server helper.
"""
import argparse
import json
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
from g5_browser import start_server, MOUNT


def run(url):
    checks=[]
    with sync_playwright() as p:
        browser=p.chromium.launch(headless=True)
        context=browser.new_context(accept_downloads=True, viewport={'width':1440,'height':1000})
        page=context.new_page()
        errors=[]
        page.on('pageerror',lambda e:errors.append(str(e)))
        page.goto(url,wait_until='networkidle')
        def mount(id): page.evaluate(MOUNT,{'group':'g8','id':id})
        def fill(form,name,value): page.locator(f'[data-form="{form}"] [name="{name}"]').fill(value)
        def select(form,name,value): page.locator(f'[data-form="{form}"] [name="{name}"]').select_option(value)
        def submit(form): page.locator(f'[data-form="{form}"] button[type=submit]').click()
        def body(): return page.locator('#qa-root').inner_text()
        def messages(): return page.evaluate('window.qaMessages')
        def open_form(form):
            target=page.locator(f'[data-form="{form}"]')
            expect(target).to_be_attached()
            detail=page.locator(f'details:has([data-form="{form}"])').first
            if detail.count() and detail.get_attribute('open') is None:
                detail.locator(':scope > summary').click()
            expect(target).to_be_visible()
        def downloaded(action):
            with page.expect_download() as dl: page.locator(f'[data-action="{action}"]').click()
            return Path(dl.value.path()).read_text(encoding='utf-8-sig')

        mount('36')
        select('start','pre','不确定'); submit('start')
        page.locator('[data-action=switch]').click()
        page.locator('[data-action=path]').click()
        assert '模拟已停止' in body()
        page.locator('[data-action=check]').click()
        assert '请让电流经过一只电阻' in body()
        page.locator('[data-action=path]').click();page.locator('[data-action=check]').click()
        page.locator('[data-action=count]').click();page.locator('[data-action=check]').click()
        fill('thrust','thrust','5');submit('thrust')
        page.locator('[data-action=step]').click()
        assert '保持悬停' in body()
        page.locator('[data-action=check]').click()
        select('finish','post','减小');fill('finish','explanation','闭合回路才通电；静止且合力为零才悬停。')
        submit('finish');mount('36')
        assert '闭合回路才通电' in body()
        open_form('teacher');fill('teacher','reviewer','模拟教学核查人');fill('teacher','notes','测试时观察前后解释，未开展真实课堂。');submit('teacher')
        assert '匿名' in body() and '闭合回路才通电' in downloaded('report')
        select('start','pre','没有电流');submit('start');assert '0.00 A' in body()
        checks.append('36: short-circuit feedback, 3 playable stages, hover condition, pre/post persistence, teaching export')

        mount('37');assert '2:56:31' in body() and '没有真实分段' in body()
        assert '不会合并统计' in body()
        page.locator('[name=filter]').select_option('示例');assert page.locator('svg').count()==1
        page.locator('[name=filter]').select_option('全部')
        open_form('run');fill('run','distance','6');fill('run','duration','36:00');fill('run','goal','测试：下课后能否完成');fill('run','outcome','测试：按时结束');submit('run')
        assert '测试：按时结束' in body()
        page.locator('details:has([data-file=runs]) > summary').click()
        # Hold the native file read until after change dispatch to reproduce CI latency.
        # This controls only the test fixture I/O; UI visibility is never forced.
        page.evaluate("""() => {
            window.qaOriginalFileText=File.prototype.text;
            const pending=new Promise(resolve=>{window.qaReleaseCsvRead=resolve;});
            File.prototype.text=async function(){
                if(this.name==='test.csv') await pending;
                return window.qaOriginalFileText.call(this);
            };
        }""")
        page.locator('[data-file=runs]').set_input_files({'name':'test.csv','mimeType':'text/csv','buffer':b'date,metres,seconds,type\n2026-10-30,1000,300,test'})
        expect(page.locator('[data-form=mapping]')).to_have_count(0)
        page.evaluate('window.qaReleaseCsvRead()')
        expect(page.locator('[data-form=mapping]')).to_be_visible()
        page.evaluate('() => { File.prototype.text=window.qaOriginalFileText; }')
        select('mapping','date','date');select('mapping','distance','metres');select('mapping','duration','seconds');select('mapping','type','type')
        select('mapping','distanceUnit','m');select('mapping','timeUnit','seconds');submit('mapping')
        expect(page.locator('[data-form=mapping]')).to_be_visible()
        expect(page.locator('[data-action=import]')).to_be_visible()
        assert '待导入1条' in body()
        page.locator('[data-action=import]').click()
        mount('37');assert '导入待核' in body()
        fill('split','label','0—5km示例');fill('split','distance','5');fill('split','duration','20:00');select('split','kind','示例分段');submit('split')
        assert '42.195 km' in body()
        fill('split','label','0—5km本人记录测试');fill('split','distance','5');fill('split','duration','20:00');select('split','kind','本人分段记录');submit('split')
        assert '37.195 km' in body()
        assert '分段配速' in page.locator('svg').last.get_attribute('aria-label')
        for chart in page.locator('svg').all():
            assert 'NaN' not in chart.evaluate('(node)=>node.outerHTML')
            expect(chart.locator('rect').first).to_have_attribute('height','145')
            expect(chart).to_contain_text('4.0')
        csv=downloaded('csv');assert '训练记录' not in csv or '日期' in csv
        assert '测试：下课后能否完成' in csv and '导入待核' in csv
        assert '2:56:31' in downloaded('report')
        checks.append('37: distinct real total/example training, personal log, gated asynchronous CSV import/visible preview, finite numeric split charts, exports')

        mount('38');page.locator('[data-edit=b]').click()
        before=page.locator('[data-form=point] [name=x]').input_value()
        page.locator('[data-action=position]').click()
        page.locator('[data-map=route]').click(position={'x':300,'y':150})
        assert page.locator('[data-form=point] [name=x]').input_value()!=before
        submit('point')
        page.locator('[data-move=c][data-delta="-1"]').click()
        page.locator('[data-edit=b]').click();select('point','status','暂停');submit('point')
        assert '暂停，不计入时程' in body()
        select('feedback','kind','模拟');select('feedback','completed','中途退出');fill('feedback','notes','测试：返回集合点');submit('feedback')
        assert any('原因' in m['message'] for m in messages())
        fill('feedback','reason','示例：场地临时关闭');submit('feedback');mount('38')
        assert '示例：场地临时关闭' in body()
        assert '暂停地点：电学模拟体验站' in downloaded('report')
        assert '<polyline' in downloaded('svg')
        checks.append('38: coordinate placement, route reordering, paused stop removed from timeline, dropout reason, itinerary/SVG')

        mount('39');fill('review','reviewer','模拟事实核查人');page.locator('[data-form=review] [name=confirmed]').check();submit('review')
        assert '当前版本已记录' in body()
        page.locator('[data-delete=c1]').click();assert any('仍被内容片段引用' in m['message'] for m in messages())
        page.locator('[data-section-edit=s1]').click();fill('section','text','模拟修改：先说明客户问题和测试条件。');submit('section')
        assert '当前版本待核' in body()
        assert '00:00:32,000 --> 00:00:52,000' in downloaded('srt')
        fill('feedback','retell','读者能复述测试条件');fill('feedback','confusion','不清楚负载指什么');fill('feedback','action','下一稿补具体负载示例');submit('feedback')
        page.locator('[data-action=preview]').click();expect(page.locator('[data-preview]')).to_be_visible()
        assert '草稿' in downloaded('report');mount('39');assert '下一稿补具体负载示例' in body()
        payload=page.evaluate("async()=>{const {seed13}=await import('./src/groups/g3/facts.js');return {app:'weichen-career-lab',schemaVersion:1,projectId:'13',data:seed13()};}")
        page.locator('details:has([data-source-file]) > summary').click()
        page.locator('[data-source-file]').set_input_files({'name':'facts.json','mimeType':'application/json','buffer':json.dumps(payload).encode()})
        page.locator('[data-form=source-import] [name=sourceItems]').first.check();submit('source-import')
        assert '课程A（模拟） / 总学时：96学时' in body()
        assert '示例假设' in body()
        checks.append('39: linked fact deletion gate, human review invalidation, timed SRT, reader feedback, original draft report')

        mount('40');assert '¥95' in body()
        fill('costs','quantity','2');submit('costs');assert '¥175' in body()
        page.locator('[data-delete=n1]').click();assert any('仍关联材料' in m['message'] for m in messages())
        fill('trial','task','模拟：尝试单手取纸');fill('trial','evidence','纸面讨论：开口过窄');select('trial','result','失败');submit('trial')
        assert any('失败和下一步' in m['message'] for m in messages())
        fill('trial','failure','模拟：边缘卡住');fill('trial','next','只改变开口宽度');submit('trial')
        select('trial','type','实体试用');fill('trial','task','模拟阻止未许可实体记录');fill('trial','evidence','测试验证');select('trial','result','完成');submit('trial')
        assert any('测试许可' in m['message'] for m in messages())
        mount('40');assert '模拟：边缘卡住' in body()
        select('decision','decision','进入正式设计评估');fill('decision','reason','测试：仍缺证据');submit('decision')
        assert any('补齐' in m['message'] for m in messages())
        select('decision','decision','停止本轮');fill('decision','reason','测试：现成替代方法已足够');submit('decision')
        report=downloaded('report');assert '原型预算' in report and '停止本轮' in report
        assert '纸板' in downloaded('csv')
        checks.append('40: quantity/cost sensitivity, requirement/BOM integrity, failed-task next step, real-trial gate, report/CSV')

        for id in ['36','37','38','39','40']:
            mount(id);page.set_viewport_size({'width':390,'height':844})
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), f'overflow {id}'
        assert not errors,errors
        page.evaluate('window.qaCleanup?.()');browser.close()
    return {'passed':True,'checks':checks+['5 mobile layouts; zero JavaScript page errors'],'boundary':'isolated browser business paths; no real class, route walk, running sync or physical hardware claim'}


if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--url');args=parser.parse_args();process=None
    try:
        if args.url:url=args.url.rstrip('/')+'/'
        else:process,url=start_server()
        print(json.dumps(run(url),ensure_ascii=False,indent=2))
    finally:
        if process is not None:process.terminate();process.wait(timeout=10)
