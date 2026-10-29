"""Exercise persistence through the actual shell controls, not a mock store."""
from playwright.sync_api import sync_playwright
import pathlib,json,sys,datetime
ROOT=pathlib.Path(__file__).resolve().parents[1];OUT=ROOT/'test-results'/'backups';OUT.mkdir(parents=True,exist_ok=True)
BASE=sys.argv[1] if len(sys.argv)>1 else 'http://127.0.0.1:8040/'
with sync_playwright() as p:
    b=p.chromium.launch(headless=True);c=b.new_context(accept_downloads=True);a=c.new_page();a.goto(BASE+'#/project/01')
    a.locator('#project-app [data-edit]').first.click();form=a.locator('form[data-form="evidence"]');form.locator('[name="boundary"]').fill('备份集成测试：真实贡献边界，不上传联系方式');form.locator('[type="submit"]').click()
    with a.expect_download() as dl:a.locator('.project-tools [data-action="export"]').click()
    backup=OUT/'01-backup.json';dl.value.save_as(str(backup));original=json.loads(backup.read_text(encoding='utf-8'))
    second=c.new_page();second.goto(BASE+'#/project/01');second.locator('#project-app [data-edit]').first.click();second.locator('form[data-form="evidence"] [name="boundary"]').fill('另一个窗口未保存的输入')
    a.locator('#project-app [data-edit]').first.click();a.locator('form[data-form="evidence"] [name="boundary"]').fill('新版本已保存');a.locator('form[data-form="evidence"] [type="submit"]').click()
    second.locator('form[data-form="evidence"] [type="submit"]').click();assert '另一窗口已更新' in second.locator('#toast').inner_text();assert second.locator('form[data-form="evidence"] [name="boundary"]').input_value()=='另一个窗口未保存的输入'
    before=a.evaluate("localStorage.getItem('weichen-career-lab:v1')")
    bad=OUT/'wrong-project.json';bad.write_text(json.dumps({**original,'projectId':'02'},ensure_ascii=False),encoding='utf-8');a.locator('#import-file').set_input_files(str(bad));assert '不匹配' in a.locator('#toast').inner_text();assert a.evaluate("localStorage.getItem('weichen-career-lab:v1')")==before
    a.locator('#import-file').set_input_files(str(backup));a.locator('#import-dialog').wait_for(state='visible');assert a.evaluate("localStorage.getItem('weichen-career-lab:v1')")==before
    a.locator('[data-action="apply-import"]').click();assert a.get_by_text('备份集成测试：真实贡献边界，不上传联系方式',exact=False).count()
    after=json.loads(a.evaluate("localStorage.getItem('weichen-career-lab:v1')"));assert after['projects']['01']['data']==original['data'];assert after['projects']['01']['revision']>json.loads(before)['projects']['01']['revision']
    a.goto(BASE+'#/data')
    with a.expect_download() as dl:a.locator('[data-action="recovery"]').click()
    previous=OUT/'previous.json';dl.value.save_as(str(previous));assert '新版本已保存' in previous.read_text(encoding='utf-8')
    with a.expect_download() as dl:a.locator('[data-action="all-backup"]').click()
    all_file=OUT/'all.json';dl.value.save_as(str(all_file));a.locator('#vault-file').set_input_files(str(all_file));a.locator('[data-action="extract-01"]').wait_for()
    with a.expect_download() as dl:a.locator('[data-action="extract-01"]').click()
    extracted=OUT/'extracted.json';dl.value.save_as(str(extracted));assert json.loads(extracted.read_text(encoding='utf-8'))['data']==original['data']
    c.close();b.close()
result={'result':'PASS','at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'checks':['saved record export','two-window stale save rejected with draft retained','wrong-project import rejected without change','preview does not mutate','confirmed restore reproduces original data and advances revision','pre-restore snapshot downloadable','full archive extraction roundtrip']}
(OUT/'report.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps(result,ensure_ascii=False))
