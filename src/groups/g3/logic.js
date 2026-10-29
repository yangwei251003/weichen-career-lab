// Domain rules for teaching, equipment, publication facts, delivery, and handoff.
export const norm = v => String(v ?? '').normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase();
const fail = message => { throw new Error(message); };
export function text(value, label, required = true) {
  if (typeof value !== 'string' || value.length > 20000 || (required && !value.trim())) fail(`${label}需要有效文字`);
  return value.trim();
}
export function validDate(value, required = true) {
  if (!value && !required) return true;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + 'T12:00:00Z');
  return Number.isFinite(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}
export function date(value, label, required = true) { if (!validDate(value, required)) fail(`${label}不是有效日期`); }
function object(v, label) { if (!v || typeof v !== 'object' || Array.isArray(v)) fail(`${label}必须是对象`); }
function list(v, label, max = 3000) { if (!Array.isArray(v) || v.length > max) fail(`${label}需要数组（最多${max}条）`); }
function strings(v, label) { list(v, label, 300); v.forEach(s => text(s, label)); }
function enumValue(v, choices, label) { if (!choices.includes(v)) fail(`${label}无效`); }
function finite(v, label, min = 0, max = 1e12) { if (typeof v !== 'number' || !Number.isFinite(v) || v < min || v > max) fail(`${label}数值超出范围`); }
function bool(v,label) { if(typeof v !== 'boolean') fail(`${label}需要布尔值`); }
function collection(rows, label) { list(rows,label); const ids=new Set(); for(const row of rows){object(row,label);text(row.id,'记录编号');if(ids.has(row.id))fail('记录编号不能重复');ids.add(row.id);} }
function base(s, keys) { object(s,'项目数据'); if(!Object.keys(s).length)return false; if(s.version!==1)fail('不支持的数据版本');for(const key of keys)if(!(key in s))fail(`缺少数据字段：${key}`);return true; }
export const tokens = v => String(v ?? '').split(/[,，、\n]/).map(x => x.trim()).filter(Boolean);

export function validateEvent(e) {
  ['id','title','owner','venue','start','end'].forEach(k=>text(e[k],k));
  const localTime=/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d$/;
  if(!localTime.test(e.start)||!localTime.test(e.end)||!validDate(e.start.slice(0,10))||!validDate(e.end.slice(0,10))||!Number.isFinite(Date.parse(e.start))||!Number.isFinite(Date.parse(e.end))||e.start>=e.end)fail('活动开始、结束时间无效或顺序错误');
  strings(e.resources,'资源'); enumValue(e.kind,['sample','personal'],'数据类型');
  collection(e.tasks,'准备项');for(const t of e.tasks){['title','owner'].forEach(k=>text(t[k],k)); bool(t.critical,'关键项');bool(t.done,'完成状态');text(t.confirmedBy,'确认人',false);if(t.done&&!t.confirmedBy.trim())fail('完成的准备项必须有确认人');}
  collection(e.incidents,'现场与复盘');for(const r of e.incidents){['issue','action','owner'].forEach(k=>text(r[k],k));text(r.result,'结果',false);}
  text(e.feedback,'活动反馈',false);
}
export function resourceConflicts(events) {
  const pairs=[];
  for(let i=0;i<events.length;i++)for(let j=i+1;j<events.length;j++){
    const a=events[i],b=events[j];if(a.start>=b.end||b.start>=a.end)continue;
    const shared=a.resources.filter(r=>b.resources.some(s=>norm(r)===norm(s)));
    if(norm(a.venue)===norm(b.venue))shared.unshift(`场地：${a.venue}`);
    if(shared.length)pairs.push({a:a.id,b:b.id,resources:[...new Set(shared)]});
  }return pairs;
}
export function eventReadiness(e) { const missing=e.tasks.filter(t=>t.critical&&(!t.done||!t.confirmedBy.trim()));return {missing,completed:e.tasks.filter(t=>t.done).length,total:e.tasks.length,ready:missing.length===0&&e.tasks.length>0}; }
export function validate11(s){if(!base(s,['events']))return true;collection(s.events,'活动');s.events.forEach(validateEvent);return true;}

export const assetStates={available:'可借',loaned:'借出',maintenance:'待检修',retired:'停用'};
export function assetTransition(asset,action,payload,at) {
  const next=structuredClone(asset);date(at,'操作日期');text(payload.operator,'操作人');text(payload.note,'检查/操作依据');text(payload.id,'操作记录编号');if(asset.history.some(h=>h.date>at))fail('操作日期不能早于已有流水');
  if(action==='checkout'){
    if(asset.status!=='available')fail('只有可借器材才能借出');text(payload.borrower,'借用人');date(payload.due,'预计归还日');if(payload.due<at)fail('预计归还日不能早于借出日');
    next.status='loaned';next.borrower=payload.borrower.trim();next.due=payload.due;
  }else if(action==='return'){
    if(asset.status!=='loaned')fail('只有借出器材可以归还');enumValue(payload.condition,['ok','damaged','missing'],'归还检查');next.status=payload.condition==='ok'?'available':'maintenance';next.borrower='';next.due='';
  }else if(action==='maintenance'){
    if(asset.status!=='available')fail('请先归还器材，再登记检修');next.status='maintenance';
  }else if(action==='service'){
    if(asset.status!=='maintenance')fail('只有待检修器材才能登记维修完成');date(payload.nextService,'下次保养日');if(payload.nextService<at)fail('下次保养日不能早于操作日');next.status='available';next.nextService=payload.nextService;
  }else if(action==='retire'){
    if(!['available','maintenance'].includes(asset.status))fail('借出器材需先归还；已停用器材不能重复停用');next.status='retired';
  }else fail('不支持的器材操作');
  next.history.push({id:payload.id,action,date:at,operator:payload.operator.trim(),note:payload.note.trim(),borrower:asset.borrower||payload.borrower||'',condition:payload.condition||'',due:payload.due||'',attachment:payload.attachment||''});return next;
}
export function assetAlerts(a,at){return {overdue:a.status==='loaned'&&a.due<at,serviceDue:!['retired','maintenance'].includes(a.status)&&!!a.nextService&&a.nextService<=at};}
export function validate12(s){if(!base(s,['assets']))return true;collection(s.assets,'器材');const codes=new Set();for(const a of s.assets){['code','model','owner'].forEach(k=>text(a[k],k));if(codes.has(norm(a.code)))fail('器材编号重复');codes.add(norm(a.code));enumValue(a.status,Object.keys(assetStates),'器材状态');enumValue(a.kind,['sample','personal'],'数据类型');text(a.borrower,'借用人',false);date(a.due,'归还日',false);date(a.nextService,'保养日',false);if(a.status==='loaned'&&(!a.borrower||!a.due))fail('借出器材缺借用人或归还日');collection(a.history,'借还记录');for(const h of a.history){enumValue(h.action,['checkout','return','maintenance','service','retire'],'操作');date(h.date,'操作日期');['operator','note'].forEach(k=>text(h[k],k));['borrower','condition','due','attachment'].forEach(k=>text(h[k],k,false));}}return true;}

export function canonicalNumber(value) {
  const s=norm(value);if(!/^[+-]?\d+(\.\d+)?$/.test(s))return s;
  const negative=s.startsWith('-');const [whole,fraction='']=s.replace(/^[+-]/,'').split('.');const a=whole.replace(/^0+(?=\d)/,'');const b=fraction.replace(/0+$/,'');return (negative&&(a!=='0'||b)?'-':'')+a+(b?'.'+b:'');
}
export function factKey(f){return [f.subject,f.field,f.scope].map(norm).join('\u001f');}
export function factValue(f){return `${canonicalNumber(f.value)}\u001f${norm(f.unit)}`;}
export function validateFact(f,at){['id','subject','field','scope','value'].forEach(k=>text(f[k],k));['unit','source','reviewer','note'].forEach(k=>text(f[k],k,false));enumValue(f.status,['pending','confirmed','retired'],'事实状态');enumValue(f.kind,['sample','personal'],'数据类型');['sourceDate','confirmedAt','validUntil'].forEach(k=>date(f[k],k,false));if(f.status==='confirmed'){['source','reviewer'].forEach(k=>text(f[k],k));['sourceDate','confirmedAt','validUntil'].forEach(k=>date(f[k],k));if(f.sourceDate>f.confirmedAt||f.confirmedAt>f.validUntil)fail('来源、确认、有效期的日期顺序错误');if(at&&f.confirmedAt>at)fail('确认日期不能是未来日期');}if(f.status==='retired'&&!f.note.trim())fail('停用事实请保留原因');}
export function deriveFacts(facts,at){
  const groups=new Map();for(const f of facts){if(f.status==='retired'||(f.validUntil&&f.validUntil<at))continue;const k=factKey(f);if(!groups.has(k))groups.set(k,[]);groups.get(k).push(f);}
  const conflicts=[...groups.values()].filter(fs=>new Set(fs.map(factValue)).size>1);const conflictIds=new Set(conflicts.flat().map(f=>f.id));
  const rows=facts.map(f=>{const flags=[];if(f.status==='retired')flags.push('已停用');if(f.validUntil&&f.validUntil<at)flags.push('已过期');if(conflictIds.has(f.id))flags.push('值有冲突');if(f.status==='pending')flags.push('待确认');const missing=['source','sourceDate','reviewer','confirmedAt','validUntil'].filter(k=>!f[k]);if(missing.length)flags.push('核验资料不完整');if(f.confirmedAt>at)flags.push('确认日期在未来');const ready=f.status==='confirmed'&&!flags.length;return {...f,flags,ready};});return {rows,conflicts,ready:rows.filter(f=>f.ready)};
}
export function factPublication(facts,at){const rows=deriveFacts(facts,at).ready;if(!rows.length)fail('当前没有有效、已确认且无冲突的事实');return `# 课程与宣传事实底稿\n\n生成日期：${at}。仅供人工复核；示例记录不得对外引用。\n\n`+rows.map(f=>`## ${f.subject} · ${f.field}\n- 范围：${f.scope}\n- 值：${f.value} ${f.unit}\n- 类型：${f.kind==='sample'?'模拟示例':'本人录入'}\n- 来源：${f.source}（${f.sourceDate}）\n- 确认：${f.reviewer} / ${f.confirmedAt}\n- 有效至：${f.validUntil}`).join('\n\n');}
export function validate13(s){if(!base(s,['facts','history']))return true;collection(s.facts,'事实');s.facts.forEach(f=>validateFact(f));collection(s.history,'变更历史');for(const h of s.history){text(h.at,'变更时间');text(h.action,'变更动作');if(h.before!==null){object(h.before,'历史事实');validateFact(h.before);}if(h.after!==null){object(h.after,'历史事实');validateFact(h.after);}}return true;}

export function materialMetrics(file,requirements){
  const {widthMm,heightMm,scale,minPpi}=requirements;[widthMm,heightMm,scale,minPpi].forEach(v=>finite(v,'目标尺寸/比例/PPI',0.0001,1e7));
  // Dimensions are the artwork's stated millimetres. Scale 10 means 1:10 artwork.
  const finalWidth=widthMm*scale,finalHeight=heightMm*scale;
  const readable=file.width>0&&file.height>0;const ppiX=readable?file.width/(finalWidth/25.4):null;const ppiY=readable?file.height/(finalHeight/25.4):null;
  const ratioError=readable?Math.abs(file.width/file.height-finalWidth/finalHeight)/(finalWidth/finalHeight):null;
  return {finalWidth,finalHeight,ppiX,ppiY,minPpi:readable?Math.min(ppiX,ppiY):null,ratioError,resolution:!readable?'待人工':Math.min(ppiX,ppiY)<minPpi?'不足':'达到设定门槛',ratio:!readable?'待人工':ratioError>0.01?'比例不符':'比例匹配'};
}
export function parseVersion(name){const m=name.match(/(?:^|[_\-\s])v(\d+(?:\.\d+)*)(?=[_.\-\s]|$)/i);return m?m[1]:'';}
export function materialIssues(files,requirements){
  const required=String(requirements.requiredNames||'').split(/\r?\n/).map(x=>x.trim()).filter(Boolean);const missing=required.filter(n=>!files.some(f=>norm(f.name)===norm(n)));const groups=new Map();for(const f of files){const key=norm(f.name).replace(/([_\-\s])v\d+(?:\.\d+)*(?=[_.\-\s]|$)/,'$1VERSION');if(!groups.has(key))groups.set(key,[]);groups.get(key).push(f);}
  const versions=[...groups.values()].filter(fs=>new Set(fs.map(f=>parseVersion(f.name))).size>1);
  return {missing,versions,rows:files.map(f=>({...f,metrics:materialMetrics(f,f.spec||requirements),wrongVersion:!!requirements.version&&parseVersion(f.name)!==requirements.version}))};
}
export function validate14(s){if(!base(s,['files','requirements']))return true;object(s.requirements,'检查要求');['widthMm','heightMm','scale','minPpi'].forEach(k=>finite(s.requirements[k],k,0.0001,1e7));['requiredNames','version','printerNotes'].forEach(k=>text(s.requirements[k],k,false));collection(s.files,'文件');for(const f of s.files){['name','type','hash','note','readError'].forEach(k=>text(f[k],k,false));text(f.name,'文件名');['size','width','height'].forEach(k=>finite(f[k],k));finite(f.modified,'修改时间',0,9e15);enumValue(f.kind,['sample','personal'],'数据类型');enumValue(f.alpha,['有透明像素','不含透明像素','未读取'],'透明状态');object(f.manual,'人工检查');for(const k of ['visual','prepress','proof'])enumValue(f.manual[k],['pending','pass','fail'],'人工状态');if(Object.values(f.manual).includes('pass')&&!f.note.trim())fail('人工通过状态需要检查依据');object(f.spec,'文件尺寸设定');['widthMm','heightMm','scale','minPpi'].forEach(k=>finite(f.spec[k],k,0.0001,1e7));}return true;}

export function taskBlockers(task,tasks){return task.deps.map(id=>tasks.find(t=>t.id===id)).filter(t=>!t||t.status!=='done').map(t=>t?.title||'缺失的前置任务');}
export function validateTaskGraph(tasks){
  const byId=new Map(tasks.map(t=>[t.id,t]));const visiting=new Set(),visited=new Set();
  function visit(t){if(visiting.has(t.id))fail('任务依赖存在循环');if(visited.has(t.id))return;visiting.add(t.id);for(const id of t.deps){if(!byId.has(id))fail('依赖任务不存在');visit(byId.get(id));}visiting.delete(t.id);visited.add(t.id);}tasks.forEach(visit);
  const owners=new Map();for(const t of tasks){const key=norm(t.deliverable);if(owners.has(key)&&owners.get(key)!==norm(t.owner))fail('同一交付物只能有一位主负责人，请统一负责人或细分交付物');owners.set(key,norm(t.owner));if(['ready','done'].includes(t.status)&&taskBlockers(t,tasks).length)fail('前置任务未完成，后置不能提交或完成');if(['ready','done'].includes(t.status)&&!t.evidence.trim())fail('提交验收前必须填写交付证据');if(t.status==='done'&&(!t.receiver.trim()||!t.receipt.trim()))fail('完成任务必须有接收人与验收结论');}
  return true;
}
export function validate15(s){if(!base(s,['tasks','project']))return true;text(s.project,'项目名称');collection(s.tasks,'任务');for(const t of s.tasks){['title','owner','scope','deliverable','acceptance'].forEach(k=>text(t[k],k));['evidence','blocker','handoff','receiver','receipt'].forEach(k=>text(t[k],k,false));date(t.due,'截止日期');strings(t.deps,'依赖');enumValue(t.status,['todo','doing','blocked','ready','done'],'任务状态');enumValue(t.kind,['sample','personal'],'数据类型');}validateTaskGraph(s.tasks);return true;}
export function handoffMarkdown(s,at){validate15(s);return `# ${s.project} · 交接包\n\n生成日期：${at}。本地记录，不代表接收人已在线签署。\n\n`+s.tasks.map(t=>`## ${t.title}\n- 唯一负责人：${t.owner}\n- 截止：${t.due}\n- 范围：${t.scope}\n- 交付物：${t.deliverable}\n- 验收：${t.acceptance}\n- 状态：${t.status}\n- 依赖：${t.deps.map(id=>s.tasks.find(x=>x.id===id)?.title||id).join('、')||'无'}\n- 证据：${t.evidence||'待补'}\n- 阻塞：${t.blocker||'无记录'}\n- 接续说明：${t.handoff||'待补'}\n- 接收：${t.receiver||'未指定'} / ${t.receipt||'未验收'}\n- 数据：${t.kind==='sample'?'模拟示例':'本人录入'}`).join('\n\n');}
