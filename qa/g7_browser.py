"""Real business flows for 31—35 in an isolated browser context."""
from playwright.sync_api import sync_playwright
import pathlib,datetime,json,sys
ROOT=pathlib.Path(__file__).resolve().parents[1]
BASE=sys.argv[1] if len(sys.argv)>1 else 'http://127.0.0.1:8040/'
OUT=ROOT/'test-results'/'g7';OUT.mkdir(parents=True,exist_ok=True)
results=[];errors=[]
with sync_playwright() as p:
    b=p.chromium.launch(headless=True);c=b.new_context(viewport={'width':1440,'height':1000},accept_downloads=True);page=c.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
    def go(id):
        page.goto(BASE+'#/project/'+id);page.locator('#project-app').wait_for();page.wait_for_timeout(100)
    go('31')
    assert page.locator('#project-app .record-card').count()==10
    form=page.locator('form[data-form="filter"]');form.locator('[name="topic"]').select_option('能源方案');form.locator('[type="submit"]').click()
    assert page.locator('#project-app .record-card').count()==5
    page.locator('[data-action="edit"][data-id="o2"]').click();form=page.locator('form[data-form="item"]');form.locator('[name="status"]').select_option('已行动');form.locator('[name="review"]').fill('已用公开示例复算一项费用，并记录口径缺口');form.locator('[type="submit"]').click();page.reload();assert page.get_by_text('已用公开示例复算一项费用，并记录口径缺口',exact=False).count()
    with page.expect_download() as dl:page.locator('#project-app [data-action="report"]').click()
    dl.value.save_as(str(OUT/'31.md'));results.append('31: theme filter, action review save/reload, actionable report export')
    go('32');form=page.locator('form[data-form="evidence"]');form.locator('[name="direction"]').select_option('反对');form.locator('[name="note"]').fill('模拟访谈反馈：共享表已足够，不愿重复录入');form.locator('[name="source"]').fill('隔离测试记录，非真实客户');form.locator('[type="submit"]').click();assert page.get_by_text('出现反证，需复审',exact=True).count();assert '新反证已出现' in page.locator('[name="conclusion"]').input_value();page.reload();assert page.get_by_text('模拟访谈反馈：共享表已足够，不愿重复录入',exact=True).count();results.append('32: opposing evidence persists and forces review')
    go('33');form=page.locator('form[data-form="new"]');form.locator('[name="question"]').fill('今天能否完成一次有保存记录的需求访谈练习');form.locator('[name="criterion"]').fill('在今天结束前保存1条练习答案并导出1份复盘文件');form.locator('[name="probability"]').fill('80');form.locator('[name="basis"]').fill('已有可运行练习台');form.locator('[name="counter"]').fill('可能被其他任务打断');form.locator('[type="submit"]').click();page.locator('#project-app [data-action="select"]').first.click();form=page.locator('form[data-form="revision"]');form.locator('[name="probability"]').fill('95');form.locator('[name="reason"]').fill('已完成练习，但仍需保存与导出');form.locator('[type="submit"]').click();form=page.locator('form[data-form="resolve"]');form.locator('[name="outcome"]').select_option('yes');form.locator('[name="evidence"]').fill('隔离测试成功保存导出，不是本人业务记录');form.locator('[name="lesson"]').fill('下次把执行行为与结果证据分开描述');form.locator('[type="submit"]').click();assert '0.04' in page.locator('#project-app').inner_text();assert '原始信心 80%' in page.locator('#project-app').inner_text();page.reload();assert '原始信心 80%' in page.locator('#project-app').inner_text();results.append('33: original 80% retained after 95% revision; resolved original Brier=0.04; reload')
    go('34');page.locator('[data-action="play"][data-id="steady"]').click();assert '19,100 元' in page.locator('#project-app').inner_text()
    for action in ['discount','steady','steady','hire']:page.locator(f'[data-action="play"][data-id="{action}"]').click()
    assert page.get_by_role('heading',name='本局结束，解释你的取舍').count();page.locator('[name="lesson"]').fill('账面收入与现金不同，最后一轮应收仍需等待回款');page.locator('form[data-form="lesson"] [type="submit"]').click();page.on('dialog',lambda d:d.accept());page.locator('[data-action="restart"]').click();assert page.get_by_role('heading',name='历史对局（含中止与负结果）').count();results.append('34: five actual rounds, exact first cash 19100, archived lesson and restart')
    go('35');form=page.locator('form[data-form="edge"]');form.locator('[name="from"]').select_option('n1');form.locator('[name="to"]').select_option('n2');form.locator('[name="type"]').select_option('依赖');form.locator('[type="submit"]').click();assert '循环' in page.locator('#toast').inner_text();assert page.locator('[data-action="delete-edge"]').count()==3
    form=page.locator('form[data-form="node"]');form.locator('[name="type"]').select_option('反例');form.locator('[name="claim"]').fill('一次成功交付不能证明高压力下表现');form.locator('[name="source"]').fill('待验证假设');form.locator('[name="condition"]').fill('比较任务压力和责任变化');form.locator('[name="experiment"]').fill('追加一次可承受的真实协作');form.locator('[type="submit"]').click();assert page.locator('#project-app svg g').count()==5
    with page.expect_download() as dl:page.locator('#project-app [data-action="report"]').click()
    dl.value.save_as(str(OUT/'35.md'));results.append('35: cycles blocked without mutation, counterexample node and map export')
    for id in ['31','32','33','34','35']:
        go(id);page.set_viewport_size({'width':390,'height':844});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),id;page.screenshot(path=str(OUT/f'{id}-mobile.png'));page.set_viewport_size({'width':1440,'height':1000})
    assert not errors,errors;c.close();b.close()
data={'result':'PASS','at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'checks':results,'errors':errors}
(OUT/'report.json').write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps(data,ensure_ascii=False))
