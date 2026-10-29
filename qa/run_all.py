"""Run every real-browser acceptance suite against one isolated local server or a supplied URL."""
import argparse,datetime,hashlib,json,os,pathlib,subprocess,sys
from g5_browser import start_server
ROOT=pathlib.Path(__file__).resolve().parents[1]
OUT=ROOT/'test-results'/'full-suite';OUT.mkdir(parents=True,exist_ok=True)

def fingerprint():
    h=hashlib.sha256()
    for f in sorted((ROOT/'src').rglob('*')):
        if f.is_file():h.update(str(f.relative_to(ROOT)).replace('\\','/').encode());h.update(f.read_bytes())
    h.update((ROOT/'index.html').read_bytes());return h.hexdigest()

parser=argparse.ArgumentParser();parser.add_argument('--url');args=parser.parse_args();server=None
result={'started':datetime.datetime.now(datetime.timezone.utc).isoformat(),'sourceSha256':fingerprint(),'suites':[],'result':'RUNNING'}
try:
    if args.url:url=args.url.rstrip('/')+'/'
    else:server,url=start_server()
    result['base']=url
    scripts=[(f'g{i}_browser.py','--url' if i in [1,2,5,6,8] else '') for i in range(1,9)]+[('shared_backup.py',''),('browser_acceptance.py','')]
    for name,flag in scripts:
        cmd=[sys.executable,str(ROOT/'qa'/name)]+([flag] if flag else [])+[url.rstrip('/') if flag else url]
        print(f'Running {name}',flush=True)
        run=subprocess.run(cmd,cwd=ROOT,env={**os.environ,'PYTHONIOENCODING':'utf-8'},capture_output=True,text=True,encoding='utf-8',timeout=180)
        (OUT/(name+'.log')).write_text(run.stdout+'\n'+run.stderr,encoding='utf-8')
        result['suites'].append({'script':name,'result':'PASS' if run.returncode==0 else 'FAIL','returncode':run.returncode})
        if run.returncode:print(run.stdout+run.stderr);raise RuntimeError(f'{name} failed')
        print(f'PASS {name}',flush=True)
    if fingerprint()!=result['sourceSha256']:raise RuntimeError('Application source changed while checks were running; repeat on stable source')
    result['result']='PASS'
finally:
    if server is not None:server.terminate();server.wait(timeout=10)
    if result['result']=='RUNNING':result['result']='FAIL'
    result['finished']=datetime.datetime.now(datetime.timezone.utc).isoformat()
    (OUT/'report.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(result,ensure_ascii=False,indent=2))
