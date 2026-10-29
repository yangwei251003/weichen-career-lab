"""Isolated real-browser integration checks; no user browser profile is used."""
import json, pathlib, sys, subprocess, datetime
from urllib.parse import urlsplit
from playwright.sync_api import sync_playwright

ROOT=pathlib.Path(__file__).resolve().parents[1]
BASE=sys.argv[1] if len(sys.argv)>1 else 'http://127.0.0.1:8040/'
OUT=ROOT/'test-results'/'integration'
OUT.mkdir(parents=True,exist_ok=True)
ids=json.loads(subprocess.check_output(['node','--input-type=module','-e',"import {applications} from './src/registry.js'; console.log(JSON.stringify(Object.keys(applications)))"],cwd=ROOT,text=True))
report={'base':BASE,'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'projects':[],'checks':[],'errors':[],'externalRequests':[]}
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,args=['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream'])
    context=browser.new_context(viewport={'width':1440,'height':1000},accept_downloads=True)
    page=context.new_page()
    page.on('request',lambda request:report['externalRequests'].append(request.url) if request.url.startswith(('http://','https://')) and urlsplit(request.url).netloc!=urlsplit(BASE).netloc else None)
    page.on('pageerror',lambda error:report['errors'].append(str(error)))
    page.on('console',lambda msg:report['errors'].append(msg.text) if msg.type=='error' else None)
    page.goto(BASE)
    page.locator('[data-project="40"]').wait_for()
    assert page.locator('[data-project]').count()==40
    page.locator('#search').fill('英语')
    assert 0<page.locator('[data-project]').count()<40
    page.locator('#search').fill('不存在的关键词99999')
    assert page.locator('[data-project]').count()==0
    page.locator('#search').fill('')
    page.screenshot(path=str(OUT/'home-desktop.png'))
    report['checks'].append('40-project navigation, search and empty state')
    for id in ids:
        page.goto(BASE+f'#/project/{id}')
        page.locator('#project-app').wait_for()
        page.wait_for_timeout(150)
        assert page.locator('#project-app').inner_text().strip(),id
        assert not page.get_by_text('现有资料未覆盖。先到备份页导出资料，再排查问题。').count(),id
        dup=page.evaluate("""() => { const a=[...document.querySelectorAll('[id]')].map(x=>x.id); return a.filter((x,i)=>a.indexOf(x)!==i); }""")
        assert not dup,(id,'duplicate ids',dup)
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),(id,'desktop overflow')
        if id in ['01','07','13','18','21','28','34','36']:
            page.screenshot(path=str(OUT/f'{id}-desktop.png'))
        with page.expect_download() as dl:
            page.locator('.project-tools [data-action="export"]').click()
        backup=dl.value
        target=OUT/f'{id}-backup.json';backup.save_as(str(target))
        data=json.loads(target.read_text(encoding='utf-8'))
        assert data['projectId']==id
        page.locator('#import-file').set_input_files(str(target))
        page.locator('#import-dialog').wait_for(state='visible')
        before=page.evaluate("localStorage.getItem('weichen-career-lab:v1')")
        page.locator('[data-action="cancel-import"]').click()
        assert page.evaluate("localStorage.getItem('weichen-career-lab:v1')")==before
        page.set_viewport_size({'width':390,'height':844})
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),(id,'mobile overflow')
        page.screenshot(path=str(OUT/f'{id}-mobile.png'))
        page.set_viewport_size({'width':1440,'height':1000})
        report['projects'].append({'id':id,'result':'PASS','scope':['render','unique label targets','desktop/mobile overflow','JSON export','preview cancel does not mutate']})
    page.goto(BASE+'#/data')
    assert page.get_by_role('heading',name='把资料带到下一站。').count()==1
    with page.expect_download() as dl: page.locator('[data-action="all-backup"]').click()
    dest=OUT/'all-backup.json';dl.value.save_as(str(dest));page.locator('#vault-file').set_input_files(str(dest))
    assert '档案已读取' in page.locator('#vault-preview').inner_text()
    report['checks'].append('all-project archive export and nonmutating preview')
    assert not report['errors'],report['errors']
    assert not report['externalRequests'],report['externalRequests']
    context.close();browser.close()
report['result']='PASS'
(OUT/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'result':report['result'],'projects':len(ids),'sharedChecks':len(report['checks'])},ensure_ascii=False))
