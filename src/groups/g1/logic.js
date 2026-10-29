export const EVIDENCE_STATUS = ['已记录','本人确认','研究演示','待补证据'];
export const JOB_STATUS = ['研究中','待核资格','已投递','面试中','已结束'];
export const clean = value => String(value ?? '').trim();
export const lines = value => [...new Set(clean(value).split(/[\n,，、；;]/).map(clean).filter(Boolean))];
export function finite(value, label, min=0, max=1e9) {
  if(!['string','number'].includes(typeof value) || clean(value)==='' || !Number.isFinite(Number(value)) || Number(value)<min || Number(value)>max) throw new Error(`${label}须为${min}—${max}之间的数字`);
  return Number(value);
}
export function isoDate(value, required=false) {
  if(!value && !required) return true;
  const date=new Date(`${value}T00:00:00Z`);
  if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value)||!Number.isFinite(date.getTime())||date.toISOString().slice(0,10)!==value) throw new Error('日期格式不正确');
  return true;
}
function obj(v) { if(!v || typeof v!=='object' || Array.isArray(v)) throw new Error('记录必须为对象'); }
function arr(v,label) { if(!Array.isArray(v)||v.length>5000) throw new Error(`${label}须为不超过5000项的列表`); }
function str(v,label,required=false) { if(typeof v!=='string'||v.length>30000||(required&&!v.trim())) throw new Error(`${label}需要有效文字`); }
function rows(data,key,fields) {
  obj(data); if(!Object.keys(data).length) return false;
  arr(data[key],key); const ids=new Set();
  for(const r of data[key]) { obj(r); str(r.id,'编号',true); if(ids.has(r.id))throw new Error('记录编号重复'); ids.add(r.id); fields.forEach(f=>str(r[f],f)); }
  return true;
}
export function validateEvidence(d) {
  if(!rows(d,'records',['title','contribution','boundary','source','date','status','tags','kind'])) return;
  for(const r of d.records) { if(!r.title||!r.contribution||!r.boundary)throw new Error('成果必须有名称、本人贡献和边界'); if(!EVIDENCE_STATUS.includes(r.status))throw new Error('证据状态无效'); if(!['个人事实','本人录入','演示'].includes(r.kind))throw new Error('来源类型无效');isoDate(r.date); }
}
export function filterEvidence(records,query='',role='',status='') {
  const terms=clean(query).toLowerCase().split(/\s+/).filter(Boolean);
  return records.filter(r=>(!role||lines(r.tags).includes(role))&&(!status||r.status===status)&&terms.every(t=>[r.title,r.contribution,r.boundary,r.source,r.tags].join(' ').toLowerCase().includes(t)));
}
export function evidenceReport(records,role='全部方向') {
  return `# 杨炜晨 · ${role}成果证据\n\n本摘要保留来源和贡献边界；不是向原颁发机构重新验真。\n\n`+records.map((r,i)=>`## ${i+1}. ${r.title}\n\n- 本人贡献：${r.contribution}\n- 边界：${r.boundary}\n- 状态：${r.status} / ${r.kind}\n- 日期：${r.date||'未精确记录'}\n- 标签：${r.tags}\n- 来源：${r.source||'待补'}\n`).join('\n');
}
export function validateJobs(d) {
  if(!rows(d,'jobs',['title','company','category','cohort','date','captured','location','source','duties','requirements','evidence','gaps','hard','status','next','kind']))return;
  for(const j of d.jobs){if(!j.title)throw new Error('岗位名称不能为空');if(!JOB_STATUS.includes(j.status))throw new Error('投递状态无效');if(!['待核实','符合','不符合'].includes(j.hard))throw new Error('资格状态无效');if(!['演示模板','历史样本','本人录入'].includes(j.kind))throw new Error('岗位来源类型无效');isoDate(j.date);isoDate(j.captured);}
}
export function jobEligibility(job,targetYear=2028){
  const blockers=[],unknown=[];
  if(job.kind==='演示模板')unknown.push('演示模板，尚无真实招聘证明');
  if(!job.source)unknown.push('缺官方来源');
  if(!job.date)unknown.push('发布日期待核');
  if(!job.cohort)unknown.push('适用届别待核');
  else if(/\d{4}/.test(job.cohort)&&!job.cohort.includes(String(targetYear))&&!/不限/.test(job.cohort))blockers.push(`记录届别为${job.cohort}，与${targetYear}届不同`);
  if(job.hard==='不符合')blockers.push('本人标记硬性资格不符');
  if(job.hard==='待核实')unknown.push('硬性资格待核');
  if(lines(job.evidence).length+lines(job.gaps).length<2)unknown.push('至少补充两项匹配证据或能力缺口');
  return {blockers,unknown,label:blockers.length?'暂不符合':unknown.length?'待核实':'已记录符合，投递前复核'};
}
export function gapCounts(jobs){
  const map=new Map();for(const j of jobs) for(const gap of lines(j.gaps))map.set(gap,(map.get(gap)||0)+1);
  return [...map].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0],'zh'));
}
export function validateCompare(d){
  if(!rows(d,'options',['title','kind','year','method','source','subjects','resources','next','qualification','example']))return;
  obj(d.profile);for(const k of ['year','workYears','budget','math','english','jobMonthly','livingMonthly'])finite(d.profile[k],k,0,k==='year'?2100:1e8);
  finite(d.profile.year,'目标年份',2026,2100);finite(d.profile.workYears,'工作年限',0,60);finite(d.profile.math,'数学诊断',0,150);finite(d.profile.english,'英语诊断',0,100);
  if(!Number.isInteger(Number(d.profile.year)))throw new Error('目标年份须为整数');
  for(const o of d.options){if(!['读研','就业'].includes(o.kind)||!['统考','仅推免','待核实','工作'].includes(o.method)||!['符合','不符合','待核实'].includes(o.qualification))throw new Error('候选类型或资格无效');for(const k of ['requiredYears','months','fee','stipend','mathTarget','englishTarget','seats'])finite(o[k],k,0,1e8);finite(o.year,'依据年份',2026,2100);finite(o.months,'比较月数',1,120);finite(o.mathTarget,'数学目标',0,150);finite(o.englishTarget,'英语目标',0,100);finite(o.requiredYears,'工作年限',0,60);if(!Number.isInteger(Number(o.seats))||!Number.isInteger(Number(o.months))||!Number.isInteger(Number(o.year)))throw new Error('名额、月数和年份须为整数');if(o.kind==='就业'&&o.method!=='工作')throw new Error('就业路径的入口应为工作');if(o.kind==='读研'&&o.method==='工作')throw new Error('读研路径请选择招生方式');}
}
export function compareOption(o,p){
  const blockers=[],unknown=[];
  if(o.qualification==='不符合')blockers.push('本人记录的报考/任职资格不符');
  if(o.qualification==='待核实')unknown.push('个人资格尚未确认');
  if(o.kind==='读研'&&o.method==='仅推免')blockers.push('仅推免，不能作为统考候选');
  if(o.kind==='读研'&&Number(o.requiredYears)>Number(p.workYears))blockers.push(`需毕业后工作${o.requiredYears}年，当前记录${p.workYears}年`);
  if(String(o.year)!==String(p.year))unknown.push(`依据年份${o.year||'未知'}与目标${p.year}不同，须查当年简章`);
  if(!o.source)unknown.push('缺官方简章或真实岗位证据');
  if(o.method==='待核实')unknown.push('招生方式待核');
  if(o.kind==='读研'&&Number(o.seats)===0)unknown.push('统考名额未确认或为0');
  const months=Number(o.months),living=Number(p.livingMonthly)*months;
  const netStudyCost=o.kind==='读研'?Number(o.fee)+living-Number(o.stipend):0;
  const outlay=Math.max(0,netStudyCost);
  const foregone=o.kind==='读研'?(Number(p.jobMonthly)-Number(p.livingMonthly))*months:0;
  const mathGap=o.kind==='读研'?Math.max(0,Number(o.mathTarget)-Number(p.math)):0;
  const englishGap=o.kind==='读研'?Math.max(0,Number(o.englishTarget)-Number(p.english)):0;
  return {blockers,unknown,outlay,netStudyCost,foregone,totalEconomicCost:netStudyCost+foregone,budgetGap:Math.max(0,outlay-Number(p.budget)),mathGap,englishGap,label:blockers.length?'暂不纳入':unknown.length?'待核实':'可继续比较'};
}
export function validatePractice(d){
  if(!rows(d,'cards',['title','category','prompt','answer','rubric','source']))return;
  arr(d.attempts,'练习记录');const cardIds=new Set(d.cards.map(x=>x.id));
  const attemptIds=new Set();
  for(const a of d.attempts){obj(a);for(const k of ['id','cardId','date','response','evidence','feedback','result','nextDate','errors'])str(a[k],k);if(attemptIds.has(a.id))throw new Error('练习记录编号重复');attemptIds.add(a.id);if(!a.response||!a.evidence)throw new Error('练习需要答案和原始证据说明');if(!cardIds.has(a.cardId))throw new Error('练习记录关联不存在的能力卡');if(!['独立完成','需辅助','未完成'].includes(a.result))throw new Error('练习结果无效');isoDate(a.date,true);isoDate(a.nextDate,true);if(a.nextDate<a.date)throw new Error('复测日期不能早于练习');}
}
export function nextReview(date,result){isoDate(date,true);const d=new Date(`${date}T12:00:00Z`);d.setUTCDate(d.getUTCDate()+({'独立完成':7,'需辅助':3,'未完成':1}[result]||1));return d.toISOString().slice(0,10);}
export function practiceSummary(card,attempts,today){const list=attempts.filter(a=>a.cardId===card.id).sort((a,b)=>a.date.localeCompare(b.date));const last=list.at(-1);return {count:list.length,last,status:last?.result||'待学习',due:!last||last.nextDate<=today,failures:list.filter(a=>a.result!=='独立完成').length};}
export function validateDecisions(d){
  if(!rows(d,'decisions',['title','choice','baseline','best','stress','redline','exit','experiment','changeWhen','reviewDate','evidence','counter','reversible','status','kind']))return;
  for(const r of d.decisions){if(!['开放','已选择','已撤回'].includes(r.status))throw new Error('决策状态无效');isoDate(r.reviewDate);arr(r.updates,'决策更新');const ids=new Set();for(const u of r.updates){obj(u);for(const k of ['id','date','evidence','conclusion','reason'])str(u[k],k,true);if(ids.has(u.id))throw new Error('复盘编号重复');ids.add(u.id);isoDate(u.date,true);if(u.nextReview){isoDate(u.nextReview,true);if(u.nextReview<u.date)throw new Error('复核日期不能早于复盘');}} }
}
export function decisionGaps(r){return [['redline','不可接受条件'],['exit','失败后的退路'],['experiment','下一步小实验'],['changeWhen','改变结论的条件'],['evidence','支持证据'],['counter','反对证据'],['reviewDate','复核日期']].filter(([k])=>!clean(r[k])).map(([,label])=>label);}
export function appendDecisionUpdate(record,update){if(!clean(update.evidence)||!clean(update.conclusion)||!clean(update.reason))throw new Error('新证据、当前结论和改变理由都需填写');isoDate(update.date,true);return {...record,updates:[...record.updates,{...update}]};}
