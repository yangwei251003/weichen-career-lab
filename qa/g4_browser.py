"""Apps 16–20: isolated headless Chromium business acceptance through the real registry.

Run: python qa/g4_browser.py [http://127.0.0.1:8040/]
Without a URL, starts a temporary localhost server. All records are QA fixtures in
an ephemeral browser profile; no user profile, original project or real person is used.
"""
import datetime, functools, http.server, json, pathlib, sys, threading
from playwright.sync_api import sync_playwright, expect
if hasattr(sys.stdout,'reconfigure'): sys.stdout.reconfigure(encoding='utf-8')

ROOT=pathlib.Path(__file__).resolve().parents[1]
OUT=ROOT/'test-results'/'g4'; OUT.mkdir(parents=True,exist_ok=True)
class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*args): pass
server=None
if len(sys.argv)>1:
    BASE=sys.argv[1].rstrip('/')+'/'
else:
    server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(QuietHandler,directory=str(ROOT)))
    threading.Thread(target=server.serve_forever,daemon=True).start()
    BASE=f'http://127.0.0.1:{server.server_port}/'
report={'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'base':BASE,'mode':'headless Chromium, isolated context, real registry','checks':[],'errors':[]}

with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True)
    context=browser.new_context(viewport={'width':1440,'height':1000},accept_downloads=True)
    page=context.new_page(); page.set_default_timeout(10000)
    page.on('pageerror',lambda e:report['errors'].append(str(e)))
    page.on('dialog',lambda d:d.accept())
    def goto(id):
        page.goto(BASE+f'#/project/{id}'); expect(page.locator('#project-app')).not_to_be_empty()
        assert not page.get_by_text('现有资料未覆盖。先到备份页导出资料，再排查问题。').count()
    def form(name): return page.locator(f'#project-app form[data-form="{name}"]')
    def fill(name,values):
        f=form(name)
        for key,value in values.items():
            el=f.locator(f'[name="{key}"]')
            if el.evaluate('(e)=>e.tagName')=='SELECT': el.select_option(str(value))
            else: el.fill(str(value))
    def submit(name): form(name).locator('button[type=submit]').click()
    def action(name,id=None):
        sel=f'#project-app [data-action="{name}"]'
        if id is not None: sel+=f'[data-id="{id}"]'
        page.locator(sel).click()
    def saved(id): return page.evaluate('(id)=>JSON.parse(localStorage.getItem("weichen-career-lab:v1")).projects[id].data',id)
    def export_action(name,filename):
        with page.expect_download() as dl: action(name)
        path=OUT/filename; dl.value.save_as(str(path)); assert path.stat().st_size>0
        return path.read_text(encoding='utf-8-sig')
    def check(label): report['checks'].append({'name':label,'result':'PASS'})

    goto('16')
    for operation in ['verify','assign','resolve','recheckPass']:
        action('operation',operation)
        values={'actor':'QA模拟操作人','note':f'QA阶段{operation}','evidence':f'合成证据/{operation}'}
        if operation=='assign': values.update(owner='QA模拟处理人',due='2099-01-01')
        fill('transition',values); submit('transition')
        expect(form('transition')).to_have_count(0)
    assert saved('16')['cases'][0]['status']=='closed'
    assert len(saved('16')['cases'][0]['history'])==4
    action('select','inspection-2'); action('operation','reject')
    fill('transition',{'actor':'QA复核人','note':'模拟遮挡误报','evidence':'SYN-02复核'});submit('transition')
    expect(form('transition')).to_have_count(0)
    assert saved('16')['cases'][1]['status']=='rejected'
    report16=export_action('export','16-report.md'); assert 'SYN-01' in report16 and '复查通过并关闭' in report16
    check('16：四阶段闭环、误报驳回、原始证据与每阶段证据报告')

    goto('17'); fill('scope',{'targetModel':'不匹配的机型'});submit('scope')
    expect(page.get_by_text('机型或版本不同，已隐藏本案例的操作与检查建议。请查对应手册，不能直接套用。')).to_be_visible()
    assert not page.get_by_role('heading',name='有来源的检查与阅读').count()
    action('practice');fill('practice',{'answer':'QA：先记录准确报错，再核对版本和证据；未知项交专业人员。','selfRating':'4','feedback':'QA反馈：不要把猜测当确认。'})
    action('reveal'); assert form('practice').locator('[name=answer]').input_value().startswith('QA：')
    assert form('practice').locator('[name=selfRating]').input_value()=='4'
    submit('practice');expect(form('practice')).to_have_count(0)
    assert saved('17')['sessions'][0]['selfRating']==4
    check('17：机型范围隔离、解释练习、展开对照保留草稿、自评持久化')

    goto('18');action('snapshot')
    fill('params',{'batteryPct':'20'});submit('params')
    expect(page.get_by_text('电量不高于预留比例',exact=True)).to_be_visible()
    action('snapshot'); assert len(saved('18')['scenarios'])==2
    action('load',saved('18')['scenarios'][0]['id']); assert form('params').locator('[name=batteryPct]').input_value()=='90'
    action('mode','blocked');fill('coordinate',{'x':'1','y':'10'});submit('coordinate')
    expect(page.get_by_text('无法回到起点',exact=True)).to_be_visible()
    action('reset')
    slider=page.locator('[name=replay]');slider.fill('5');slider.dispatch_event('change')
    expect(page.get_by_text('路径回放：第 6 /',exact=False)).to_be_visible()
    page.screenshot(path=str(OUT/'18-desktop.png'))
    assert '不是飞行许可' in export_action('export','18-report.md')
    check('18：参数复算、电量阻断、禁入起点不可达、情景载入、路径回放与导出')

    goto('19');expect(page.get_by_text('5.74 元',exact=True)).to_be_visible()
    expect(page.get_by_text('0 / 3',exact=True)).to_be_visible()
    with page.expect_download() as dl: action('export-run')
    compact=OUT/'19-compact.json';dl.value.save_as(str(compact))
    payload=json.loads(compact.read_text(encoding='utf-8'));r=payload['run']
    raw={'schema_version':'3.0.0','run_id':'QA合成schema适配','summary':{'comparison_valid':False},'config':{'tariff':{'currency':'CNY','demand_per_kw':0},'battery':{'degradation_per_kwh':.02}},'dataset':{'time_axis':'source-local','original_observation_verified':False,'demand_eligible':False,'quality':{'unobserved':0}},'strategies':[{'id':'QA','name':'合成策略','energy_cost':5.7,'degradation_cost':.04,'demand_cost':0,'total_cost':5.74,'comparison_valid':False}],'assumptions':['QA完全合成输入'],'series':[{'timestamp':x['timestamp'],'interval_hours':x['intervalHours'],'price':x['price'],'strategies':{'QA':{'grid_kw':x['gridKw'],'charge_kw':x['chargeKw'],'discharge_kw':x['dischargeKw'],'energy_cost':x['reportedEnergy'],'degradation_cost':x['reportedProxy']}}} for x in r['rows']]}
    page.locator('[name=nengce-file]').set_input_files({'name':'qa-v3.json','mimeType':'application/json','buffer':json.dumps(raw).encode()})
    expect(form('import')).to_be_visible(); fill('import',{'source':'QA合成格式样例','license':'原创测试','contract':'QA示例计费'});submit('import')
    expect(form('import')).to_have_count(0); assert len(saved('19')['runs'])==2
    action('tab','sessions');fill('session',{'alias':'QA计划访谈','role':'测试角色','question':'是否理解证据来源'});submit('session')
    expect(page.get_by_text('0 / 3',exact=True)).to_be_visible()
    action('tab','improvements');fill('improvement',{'problem':'QA证据难找','change':'QA加证据索引','status':'selected'});submit('improvement')
    expect(page.locator('#toast')).to_contain_text('先完成3次真实访谈')
    assert not saved('19')['improvements']
    action('tab','sessions')
    for i in range(4):
        fill('session',{'type':'interview' if i<3 else 'observation','status':'completed','alias':f'QA独立浏览器模拟填写{i}','role':'QA测试占位（非真实访谈）','question':'QA核对证据索引','finding':'QA测试结论占位','negative':'QA保留失败反馈','consent':'QA隔离测试，不涉及真人','kind':'personal'})
        submit('session');expect(form('session').locator('[name=alias]')).to_have_value('')
    expect(page.get_by_text('3 / 3',exact=True)).to_be_visible();expect(page.get_by_text('1 / 1',exact=True)).to_be_visible()
    action('tab','improvements');fill('improvement',{'problem':'QA唯一改进','change':'QA证据索引','status':'selected'})
    form('improvement').locator('[name=evidenceIds]').nth(1).check();submit('improvement')
    expect(form('improvement').locator('[name=problem]')).to_have_value('')
    assert saved('19')['improvements'][0]['status']=='selected'
    assert 'QA保留失败反馈' in export_action('export-report','19-report.md')
    check('19：费用可复算、原schema合成JSON实际导入、未执行不计数、3+1门槛、负反馈和唯一改进')

    goto('20');expect(page.get_by_text('3（TN）',exact=True)).to_be_visible()
    fill('annotation',{'annotator':'QA另一位标注员','label':'defect','reason':'QA冲突意见'});submit('annotation')
    expect(form('resolve')).to_be_visible();assert saved('20')['samples'][0]['resolution'] is None
    fill('resolve',{'reviewer':'QA复核员','label':'normal','reason':'QA按合成标签规范复核'});submit('resolve')
    expect(form('resolve')).to_have_count(0);expect(page.get_by_text('3（TN）',exact=True)).to_be_visible()
    action('edit','sample-1');fill('sample',{'split':'train','group':'synthetic-pass-2'});submit('sample')
    expect(page.get_by_text('不能当作独立泛化评测结果',exact=True)).to_be_visible()
    assert '同采集组' in export_action('export','20-report.md')
    with page.expect_download() as dl: action('template')
    template=OUT/'20-template.csv';dl.value.save_as(str(template));before=saved('20')
    page.locator('[name=evaluation-csv]').set_input_files(str(template))
    expect(page.locator('#project-app [data-action=apply-import]')).to_be_visible();assert saved('20')==before
    action('apply-import');expect(page.locator('#project-app [data-action=apply-import]')).to_have_count(0)
    assert len(saved('20')['samples'])==1
    recovery=page.evaluate('JSON.parse(localStorage.getItem("weichen-career-lab:recovery:v1"))')
    assert len(recovery['data']['samples'])==8
    page.locator('[name=evaluation-csv]').set_input_files({'name':'bad.csv','mimeType':'text/csv','buffer':b'a,b\n1,2'})
    expect(page.locator('#toast')).to_contain_text('CSV缺少字段');assert len(saved('20')['samples'])==1
    check('20：75%矩阵、标签冲突排除与裁定、采集组泄漏、CSV预览与替换前恢复、畸形CSV拒绝')

    for id in ['16','17','18','19','20']:
        goto(id); assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),(id,'desktop overflow')
        page.set_viewport_size({'width':390,'height':844})
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),(id,'mobile overflow')
        page.screenshot(path=str(OUT/f'{id}-mobile.png'))
        page.set_viewport_size({'width':1440,'height':1000})
    check('16—20：真实registry，1440px及390px无整页横溢出')
    assert not report['errors'],report['errors']
    report['result']='PASS'; browser.close()
if server: server.shutdown()
(OUT/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(report,ensure_ascii=False,indent=2))
