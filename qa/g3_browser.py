"""Apps 11–15 reproducible business tests. Isolated Chromium; never uses a user profile.
Run: python qa/g3_browser.py [http://127.0.0.1:8040/]
"""
import datetime,functools,http.server,json,pathlib,struct,sys,threading,zlib
from playwright.sync_api import sync_playwright,expect
if hasattr(sys.stdout,'reconfigure'): sys.stdout.reconfigure(encoding='utf-8')
ROOT=pathlib.Path(__file__).resolve().parents[1]
OUT=ROOT/'test-results'/'g3';OUT.mkdir(parents=True,exist_ok=True)
class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*args):pass
server=None
if len(sys.argv)>1:BASE=sys.argv[1].rstrip('/')+'/'
else:
    server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(QuietHandler,directory=str(ROOT)))
    threading.Thread(target=server.serve_forever,daemon=True).start();BASE=f'http://127.0.0.1:{server.server_port}/'
report={'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'mode':'headless Chromium, isolated context, real registry','checks':[],'errors':[]}
with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True);context=browser.new_context(viewport={'width':1440,'height':1000},accept_downloads=True)
    page=context.new_page();page.set_default_timeout(10000)
    page.on('pageerror',lambda e:report['errors'].append(str(e)));page.on('dialog',lambda d:d.accept())
    def goto(id):page.goto(BASE+f'#/project/{id}');expect(page.locator('#project-app')).not_to_be_empty()
    def form(name):return page.locator(f'#project-app form[data-form="{name}"]')
    def fill(name,values):
        for key,value in values.items():
            el=form(name).locator(f'[name="{key}"]')
            if el.evaluate('(e)=>e.tagName')=='SELECT':el.select_option(str(value))
            else:el.fill(str(value))
    def submit(name):form(name).locator('button[type=submit]').click()
    def action(name,id=None):page.locator(f'#project-app [data-action="{name}"]'+(f'[data-id="{id}"]' if id is not None else '')).click()
    def saved(id):return page.evaluate('(id)=>JSON.parse(localStorage.getItem("weichen-career-lab:v1")).projects[id].data',id)
    def check(label):report['checks'].append({'name':label,'result':'PASS'})
    def export(name,file):
        with page.expect_download() as dl:action(name)
        path=OUT/file;dl.value.save_as(str(path));return path.read_text(encoding='utf-8-sig')

    goto('11');expect(page.get_by_text('需要协调资源',exact=True)).to_be_visible()
    action('edit','activity-demo-2');fill('event',{'start':'2027-01-09T12:00','end':'2027-01-09T14:00'});submit('event')
    expect(page.get_by_text('需要协调资源',exact=True)).to_have_count(0)
    action('select','activity-demo-1')
    for id in ['prep-demo-1','prep-demo-2']:
        action('confirm-task',id);fill('confirm',{'confirmer':'QA模拟确认人'});submit('confirm');expect(form('confirm')).to_have_count(0)
    expect(page.get_by_text('关键准备已确认',exact=True)).to_be_visible()
    fill('incident',{'issue':'QA线缆标识遗漏','action':'QA补充准备清单','owner':'QA测试负责人'});submit('incident')
    expect(form('incident').locator('[name=issue]')).to_have_value('')
    incident=saved('11')['events'][0]['incidents'][0]['id'];action('edit-incident',incident)
    fill('incident',{'result':'QA已补充并复查'});submit('incident')
    fill('feedback',{'feedback':'QA下次提前确认器材清单'});submit('feedback')
    assert 'QA已补充并复查' in export('export','11-report.md')
    action('clone','activity-demo-1');assert len(saved('11')['events'])==3
    assert all(not t['done'] for t in saved('11')['events'][-1]['tasks'])
    check('11：资源冲突消除、责任人确认、现场问题更新、反馈、导出和清单模板复用')

    goto('12');action('operation','checkout');fill('operation',{'borrower':'QA借用人','due':'2099-01-01','note':'QA借出前检查'});submit('operation')
    expect(form('operation')).to_have_count(0);assert saved('12')['assets'][0]['status']=='loaned'
    assert page.locator('#project-app [data-action=operation][data-id=checkout]').count()==0
    action('operation','return');fill('operation',{'condition':'damaged','note':'QA归还时发现损坏'});submit('operation')
    expect(form('operation')).to_have_count(0);assert saved('12')['assets'][0]['status']=='maintenance'
    action('operation','service');fill('operation',{'nextService':'2099-01-01','note':'QA专业维修确认的练习记录'});submit('operation')
    expect(form('operation')).to_have_count(0);assert saved('12')['assets'][0]['status']=='available'
    assert 'QA归还时发现损坏' in export('export','12-ledger.csv')
    check('12：借出→损坏归还→检修→完成维修、合法按钮和完整流水')

    goto('13');expect(page.get_by_text('发现 1 组冲突，相关事实不能进入可用底稿',exact=True)).to_be_visible()
    action('publish');expect(page.locator('#toast')).to_contain_text('当前没有有效')
    action('edit','fact-demo-1');fill('fact',{'status':'confirmed','source':'QA虚构来源A','sourceDate':'2026-10-01','reviewer':'QA核验人','confirmedAt':'2026-10-29','validUntil':'2099-01-01'});submit('fact')
    expect(form('fact')).to_have_count(0);action('publish');expect(page.locator('#toast')).to_contain_text('当前没有有效')
    action('retire','fact-demo-2');fill('fact',{'note':'QA仅测试停用；不代表真实课程确认'});submit('fact')
    expect(form('fact')).to_have_count(0);assert '96 学时' in export('publish','13-publish.md')
    action('edit','fact-demo-1');fill('fact',{'sourceDate':'2026-09-01','confirmedAt':'2026-09-02','validUntil':'2026-09-30'});submit('fact')
    expect(form('fact')).to_have_count(0);expect(page.get_by_text('已过期',exact=True)).to_be_visible()
    action('publish');expect(page.locator('#toast')).to_contain_text('当前没有有效')
    action('history');assert len(saved('13')['history'])==3
    check('13：96/112冲突、确认仍被冲突阻断、停用留痕后可用、过期阻断')

    goto('14')
    def chunk(name,data):return struct.pack('!I',len(data))+name+data+struct.pack('!I',zlib.crc32(name+data)&0xffffffff)
    png=b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('!2I5B',1536,1024,8,2,0,0,0))+chunk(b'IDAT',zlib.compress((b'\0'+b'\x44\x88\x66'*1536)*1024))+chunk(b'IEND',b'')
    page.locator('[name=materialFiles]').set_input_files({'name':'QA背景板_v2.png','mimeType':'image/png','buffer':png})
    expect(page.get_by_role('heading',name='QA背景板_v2.png',exact=True)).to_be_visible()
    s=saved('14');actual=next(x for x in s['files'] if x['name']=='QA背景板_v2.png')
    assert actual['width']==1536 and actual['height']==1024 and len(actual['hash'])==64
    expect(page.get_by_text('版本不符',exact=True)).to_be_visible()
    card=page.locator('article.panel').filter(has=page.get_by_role('heading',name='QA背景板_v2.png',exact=True))
    card.locator('summary').filter(has_text='此文件的尺寸').click()
    f=card.locator('form');f.locator('[name=scale]').fill('1');f.locator('[name=visual]').select_option('pass');f.locator('[name=note]').fill('QA实际读取文件的视觉练习检查，未做印前和实物验证');f.locator('button[type=submit]').click()
    expect(page.get_by_text('65.02',exact=True)).to_be_visible()
    assert 'QA背景板_v2.png' in export('export','14-checklist.csv')
    check('14：实际PNG读取、SHA-256、1536×1024像素、错版、逐文件缩放与65.02 PPI、检查清单')

    goto('15');action('edit','g3-t2');fill('task',{'status':'ready','evidence':'QA演示材料'});submit('task')
    expect(page.locator('#toast')).to_contain_text('前置任务未完成');action('cancel')
    action('edit','g3-t1');fill('task',{'status':'done','evidence':'QA教学目标单'});submit('task')
    expect(page.locator('#toast')).to_contain_text('接收人与验收结论')
    fill('task',{'receiver':'QA模拟接收人','receipt':'QA检查后接收','handoff':'QA后续准备演示'});submit('task')
    expect(form('task')).to_have_count(0);assert saved('15')['tasks'][0]['status']=='done'
    action('edit','g3-t2');fill('task',{'status':'ready','evidence':'QA演示材料'});submit('task')
    expect(form('task')).to_have_count(0);assert saved('15')['tasks'][1]['status']=='ready'
    assert 'QA模拟接收人' in export('export','15-handoff.md')
    check('15：依赖阻断、交付证据与接收门槛、前置接收后允许后置验收、交接导出')

    for id in ['11','12','13','14','15']:
        goto(id);assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),(id,'desktop')
        page.set_viewport_size({'width':390,'height':844})
        if not page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'):
            page.screenshot(path=str(OUT/f'{id}-overflow.png'));print(page.evaluate('Array.from(document.querySelectorAll("#project-app *")).filter(e=>e.getBoundingClientRect().right>390).slice(0,12).map(e=>({tag:e.tagName,cls:e.className,w:e.getBoundingClientRect().width}))'))
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),(id,'mobile')
        page.screenshot(path=str(OUT/f'{id}-mobile.png'));page.set_viewport_size({'width':1440,'height':1000})
    check('11—15：1440px和390px无整页横溢出')
    assert not report['errors'],report['errors'];report['result']='PASS';browser.close()
if server:server.shutdown()
(OUT/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(report,ensure_ascii=False,indent=2))
