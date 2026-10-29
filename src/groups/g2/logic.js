const clone = x => JSON.parse(JSON.stringify(x));
const plain = x => !!x && typeof x === 'object' && !Array.isArray(x);
const assert = (ok, message) => { if (!ok) throw new Error(message); };
const text = (x, label, required = false) => {
  assert(typeof x === 'string' && x.length <= 30000, `${label}须为不超过30000字的文本`);
  assert(!required || !!x.trim(), `请填写${label}`);
};
const finite = (x, label, min = 0, max = 1e12) => assert(typeof x === 'number' && Number.isFinite(x) && x >= min && x <= max, `${label}不是有效范围内的数字`);
const iso = (x, label, required = false) => {
  text(x, label, required);
  if (x) assert(/^\d{4}-\d{2}-\d{2}$/.test(x) && new Date(`${x}T00:00:00Z`).toISOString().slice(0, 10) === x, `${label}须为真实日期`);
};
const arr = (x, label, max = 1000) => assert(Array.isArray(x) && x.length <= max, `${label}须为不超过${max}项的列表`);
const unique = (rows, label) => {
  rows.forEach(r => { assert(plain(r), `${label}记录格式错误`); text(r.id, '记录ID', true); assert(/^[\w-]{1,100}$/.test(r.id),'记录ID只能含字母、数字、下划线和短横线'); });
  assert(new Set(rows.map(r => r.id)).size === rows.length, `${label}存在重复ID`);
};
const enumOf = (x, values, label) => assert(values.includes(x), `${label}不在可选范围内`);
function base(d, keys) {
  assert(plain(d), '项目数据须为对象');
  if (!Object.keys(d).length) return false;
  assert(d.version === 1, '项目数据版本不受支持');
  assert(Object.keys(d).every(k => keys.includes(k)), '项目数据包含未知字段');
  return true;
}
export function parseNumber(value, label, min = 0, max = 1e12) {
  assert(['string','number'].includes(typeof value), `${label}须为数字或数字文本`);
  assert(String(value).trim() !== '', `请填写${label}`);
  const n = Number(value); finite(n, label, min, max); return n;
}
export function requireText(value, label) { text(value, label, true); return value.trim(); }
export function httpUrl(value) { try { const u = new URL(value); return ['http:', 'https:'].includes(u.protocol) ? u.href : ''; } catch { return ''; } }

// 06: preserve test conditions rather than creating an overall product ranking.
export const parameterNames = ['起飞重量', '最大起飞重量', '折叠尺寸', '最大上升速度', '最大下降速度', '最大水平速度', '最大飞行时间', '最大悬停时间', '最大抗风速度', '工作温度'];
const m4 = 'https://enterprise.dji.com/matrice-4-series/specs';
const m30 = 'https://enterprise.dji.com/matrice-30/specs';
export const productSeed = {
  version: 1, revision: 1,
  products: [
    { id: 'm4', name: 'DJI Matrice 4系列', model: '标准桨配置；具体机型另核', version: '官网规格页，2026-10-29查阅', published: '', checked: '2026-10-29', validUntil: '', source: m4, note: '公开资料摘录，用于比较方法练习；版本发布日期未注明，不代替现场勘察。' },
    { id: 'm30', name: 'DJI Matrice 30系列', model: 'M30系列，双电池', version: '官网规格页，2026-10-29查阅', published: '', checked: '2026-10-29', validUntil: '', source: m30, note: '公开资料摘录；系列内载荷配置差异需另核，参数不是作业许可。' }
  ],
  params: [
    ...[
      ['起飞重量','1219','g','含电池、标准桨、microSD；批次可能有差异'],
      ['最大起飞重量','1420','g','标准桨配置'],['折叠尺寸','260.6 × 113.7 × 138.4','mm','长×宽×高；不含桨'],
      ['最大上升速度','10','m/s','无附件；附件配置另有6 m/s限制'],['最大下降速度','8','m/s','无附件；附件配置另有6 m/s限制'],
      ['最大水平速度','21','m/s','海平面无风前飞；侧飞/后飞不同'],['最大飞行时间','49','min','无风、约9 m/s、无载荷、标准桨，测至0%电量'],
      ['最大悬停时间','42','min','海平面无风、标准桨，100%至0%电量'],['最大抗风速度','12','m/s','起飞/降落时'],['工作温度','-10 至 40','℃','工作环境温度；不能推定所有附件一致']
    ].map((p,i)=>({id:`m4-${i}`,productId:'m4',name:p[0],value:p[1],unit:p[2],condition:p[3],source:m4,reviewed:true})),
    ...[
      ['起飞重量','3770 ± 10','g','含两块电池'],['最大起飞重量','4069','g','欧盟C2认证配置另有3998 g限制'],
      ['折叠尺寸','365 × 215 × 195','mm','长×宽×高；官网折叠尺寸'],['最大上升速度','6','m/s','官网规格；测试环境在该字段未详述'],
      ['最大下降速度','5','m/s','垂直下降；倾斜下降另有7 m/s'],['最大水平速度','23','m/s','官网规格；测试环境在该字段未详述'],
      ['最大飞行时间','41','min','官网脚注[2]，须回原页复核测试条件'],['最大悬停时间','36','min','官网脚注[2]，须回原页复核测试条件'],
      ['最大抗风速度','12','m/s','官网最大抗风规格；未明确与起降限定一致'],['工作温度','-20 至 50','℃','官网工作环境范围']
    ].map((p,i)=>({id:`m30-${i}`,productId:'m30',name:p[0],value:p[1],unit:p[2],condition:p[3],source:m30,reviewed:true}))
  ], reports: [], scenario: '教学展示', constraints: '需要搬运、讲解与安全隔离；实际飞行另行确认场地和人员资质。'
};
export const scenarios = {
  '教学展示': '优先核对搬运重量、尺寸、教学目的、场地隔离和人员资质。不要为了展示最大参数安排飞行。',
  '能源场站巡检': '核对温度、载荷、实际续航、数据回传、维修与验收；最大续航不能直接用作作业时长。',
  '测绘方案讨论': '核对相机/快门、定位、精度口径、成果格式和地面控制；本表通用机体参数不足以决定测绘选型。'
};
export function validateProducts(d) {
  if (!base(d,['version','revision','products','params','reports','scenario','constraints'])) return;
  finite(d.revision,'资料修订',1,1e9); arr(d.products,'产品',50); arr(d.params,'参数',1000); arr(d.reports,'比较记录',200); unique(d.products,'产品'); unique(d.params,'参数');
  d.products.forEach(p=>{ ['name','model','version','source','note'].forEach(k=>text(p[k],`产品${k}`,['name','model','source'].includes(k))); assert(httpUrl(p.source),'产品来源须为http(s)网页'); ['published','checked','validUntil'].forEach(k=>iso(p[k],k)); });
  d.params.forEach(p=>{ assert(d.products.some(x=>x.id===p.productId),'参数引用了不存在的产品'); ['name','value','unit','condition','source'].forEach(k=>text(p[k],`参数${k}`,true)); assert(httpUrl(p.source),'参数来源须为http(s)网页'); assert(typeof p.reviewed==='boolean','参数复核状态错误'); });
  assert(new Set(d.params.map(p=>`${p.productId}|${p.name.trim()}`)).size===d.params.length,'同一产品不能有重复名称的参数');
  d.reports.forEach(r=>{ text(r.id,'比较ID',true); text(r.text,'比较内容',true); text(r.createdAt,'生成时间',true); finite(r.revision,'比较修订',1,1e9); });
  text(d.scenario,'场景',true); text(d.constraints,'约束');
}
const norm = s => String(s).normalize('NFKC').replace(/\s+/g,'').toLowerCase();
export function compareParameters(a,b) {
  if (!a || !b) return { comparable:false, reason:'缺少一方资料，不能补推' };
  if (!a.reviewed || !b.reviewed) return { comparable:false,reason:'有待人工复核记录' };
  if (!httpUrl(a.source) || !httpUrl(b.source)) return { comparable:false,reason:'缺少可追溯来源' };
  if (norm(a.unit)!==norm(b.unit)) return { comparable:false,reason:'单位不同，先统一定义与换算依据' };
  if (norm(a.condition)!==norm(b.condition)) return { comparable:false,reason:'测试条件不同或未证实一致，仅并列展示' };
  return { comparable:true,reason:'单位与记录的条件一致；仍不代表整体优劣' };
}
export function productReport(d) {
  validateProducts(d);
  const lines = ['# 产品参数比较草稿',`场景：${d.scenario}`,`客户约束：${d.constraints||'待补'}`,`资料修订：${d.revision}`,'没有总分或自动推荐。每个数值必须结合条件和机型理解。'];
  const names=[...new Set(d.params.map(p=>p.name))];
  for (const name of names) {
    lines.push(`\n## ${name}`);
    for(const p of d.products) {const v=d.params.find(x=>x.productId===p.id&&x.name===name);lines.push(v?`${p.name}：${v.value} ${v.unit}；条件：${v.condition}；来源：${v.source}；${v.reviewed?'人工摘录已复核':'待复核'}`:`${p.name}：资料缺失`);}
    if(d.products.length===2) lines.push(compareParameters(...d.products.map(p=>d.params.find(x=>x.productId===p.id&&x.name===name))).reason);
  }
  lines.push('\n## 场景适配待确认',scenarios[d.scenario]||d.constraints,'资料发布日期未填、有效期未知或官网变动时，正式沟通前重新核查。');
  return lines.join('\n\n');
}

// 07: an explicit, deterministic role-play, never a pretend live customer or AI score.
export const interviewTopics = ['现状','损失','流程','预算','决策人','验收'];
export const interviewQuestions = {
  '现状':'请描述上一次完成这项工作的过程。','损失':'上次出现问题后，具体影响了谁、多少时间？','流程':'现在从发现问题到处理结束，需要哪些步骤？',
  '预算':'这项问题目前花了多少成本，谁能确认预算范围？','决策人':'谁使用、谁采购、谁最终确认方案？','验收':'什么具体结果能让你们确认试点有用？'
};
export const roles = {
  training: {name:'培训负责人',context:'模拟：筹备无人机装调课程，想提升教学交付的一致性。',answers:{'现状':'上次开班前，讲师各自保存材料，现场才发现讲义版本不同。','损失':'演示准备被打断，助教临时核对资料；具体损失工时尚未记录。','流程':'教务定课程，讲师备课，助教准备器材，负责人确认宣传口径。','预算':'没有单独的软件预算，需要先证明减少返工，不能代表机构承诺采购。','决策人':'教务和讲师共同试用；是否采购由负责人决定，我不能独自决定。','验收':'先试一场课程：记录错版、遗漏、准备时间，并让讲师复盘。'},followup:'上次冲突集中在学时与课程前置条件；要先向实际负责人核对，不能由工具决定。'},
  maintenance: {name:'设备运维人员',context:'模拟：能源场站的巡检问题记录分散，希望少漏整改。',answers:{'现状':'上次巡检发现异常后，照片和任务分别留在几个地方，复检时难追溯。','损失':'复检要重新找照片和人员；没有统一统计漏项率，不能报改善百分比。','流程':'发现、人工判断、派单、处理、复检、关闭，现场负责人决定是否停机。','预算':'今年已有设备投入，新增工具要走审批；试点范围和预算都未确定。','决策人':'运维使用，信息化审核数据接口，安全与项目负责人参与验收。','验收':'每条问题都有原始证据、负责人和复检记录，抽样回查能定位到原始文件。'},followup:'一个问题可能跨两个班组；只把照片分类并不等于有人负责整改。'},
  solution: {name:'行业方案负责人',context:'模拟：已有供应商，希望判断新方案是否值得小范围比较。',answers:{'现状':'现有供应商能提供设备，跨系统资料整理仍需我们自己做。','损失':'售前解释和交付材料反复修改，但还没把工时按项目统计。','流程':'需求评审、技术对比、现场试验、商务谈判、合同、交付验收。','预算':'要先明确试验目的，不能为了一个演示从原项目预算直接划款。','决策人':'技术负责人评估接口与限制，采购负责条款，最终由项目负责人批准。','验收':'同一场景、相同数据下比较结果，解释失败项，不接受只展示最漂亮的案例。'},followup:'已有竞品也有稳定服务价值；请解释一个可验证的小差异，不需要贬低对方。'}
};
export function interviewReply(roleId,topic,history=[],question='') {
  const role=roles[roleId]; assert(role,'请选择有效角色');
  if(topic==='推介') return {answer: history.length<3?'你还没了解我们的流程。我先不看功能，能否从上次遇到的问题问起？':'这些功能需要对应到刚才的问题；请说明哪一个结果可以小范围验证。',coach:'过早推介容易跳过需求。记录这个反应，再追问事实。'};
  if(topic==='追问') return {answer:history.some(x=>interviewTopics.includes(x.topic))?role.followup:'先选一个具体话题，再围绕客户已经说过的内容追问。',coach:'追问应接住原话，而不是把自己的解释放到客户嘴里。'};
  assert(interviewTopics.includes(topic),'请选择访谈维度');
  const repeated=history.some(x=>x.topic===topic);
  return {answer:repeated?`这个问题前面提过。${role.followup}`:role.answers[topic],coach:/是不是|一定|保证|肯定/.test(question)?'这个问法可能带有预设；可以改成“上次具体发生了什么”。':'保存模拟原话；你的解释请放到独立观察栏。'};
}
export function interviewGaps(turns) { const covered=new Set(turns.map(t=>t.topic)); return interviewTopics.filter(t=>!covered.has(t)); }
export function validateInterview(d) {
  if(!base(d,['version','role','turns','observations','assumptions','summary','elapsed','sessions']))return;
  enumOf(d.role,Object.keys(roles),'角色');arr(d.turns,'访谈轮次',300);arr(d.sessions,'练习记录',100);finite(d.elapsed,'练习秒数',0,86400);
  ['observations','assumptions','summary'].forEach(k=>text(d[k],k));
  const checkTurns=turns=>{arr(turns,'记录轮次',300);turns.forEach(t=>{enumOf(t.topic,[...interviewTopics,'追问','推介'],'维度');['question','answer','coach'].forEach(k=>text(t[k],k,true));});};checkTurns(d.turns);
  d.sessions.forEach(s=>{text(s.id,'记录ID',true);text(s.date,'日期',true);enumOf(s.role,Object.keys(roles),'角色');checkTurns(s.turns);['observations','assumptions','summary'].forEach(k=>text(s[k],k));finite(s.elapsed,'练习秒数',0,86400);assert(typeof s.humanPractice==='boolean','真人练习标记错误');});
}
export const interviewSeed = {version:1,role:'training',turns:[],observations:'',assumptions:'',summary:'',elapsed:0,sessions:[]};
export function interviewReport(d) {
  const gaps=interviewGaps(d.turns);
  return ['# 客户需求访谈练习（模拟）',`角色：${roles[d.role].name}；记录时长：${Math.floor(d.elapsed/60)}分${d.elapsed%60}秒`,
    '## 模拟原话',...d.turns.map((t,i)=>`${i+1}. 我问：${t.question}\n模拟回应：${t.answer}\n练习提示：${t.coach}`),
    '## 我的解释（不是客户原话）',d.observations||'未填写','## 需求摘要（本人草稿）',d.summary||'未填写','## 未确认假设',d.assumptions||'未填写',
    '## 下一次的三个问题',...(gaps.length?gaps.slice(0,3).map(t=>interviewQuestions[t]):['能否提供最近一次具体记录？','可以找哪位实际使用者核对？','用什么基线衡量试点结果？']),
    '软件仅核对维度覆盖，不能评判真实访谈能力。独立完成10分钟真实角色扮演需本人和自愿参与者验证。'].join('\n\n');
}

// 08: bounded CNY/month model; no tax or discount-rate inference.
export const costSeed = {version:1,input:{name:'巡检设备交付示例',currency:'CNY',period:'month',months:12,quantity:2,unitCost:18000,training:3000,delivery:1500,maintenance:350,laborHours:8,hourlyCost:80,consumables:120,downtime:0,quote:58000,delay:3,baselineMonthly:5500,customerMonthly:1200,taxBasis:'统一按含税现金支出；不计算抵扣',source:'全部金额为虚构教学假设，需替换为经授权的成本与报价依据。'},saved:[]};
export const costKeys=['months','quantity','unitCost','training','delivery','maintenance','laborHours','hourlyCost','consumables','downtime','quote','delay','baselineMonthly','customerMonthly'];
export function validateCostInput(i) {
  assert(plain(i),'成本输入格式错误');['name','taxBasis','source'].forEach(k=>text(i[k],k,true));enumOf(i.currency,['CNY'],'币种');enumOf(i.period,['month'],'期间单位');
  costKeys.forEach(k=>finite(i[k],k,0,1e9));assert(Number.isInteger(i.months)&&i.months>=1&&i.months<=120,'观察期须为1—120个整数月');assert(Number.isInteger(i.quantity)&&i.quantity<=10000,'数量须为0—10000整数');assert(Number.isInteger(i.delay)&&i.delay<=144,'回款延迟须为0—144个整数月');
}
export function calculateCost(i,options={}) {
  validateCostInput(i);
  const factor=options.costFactor??1, revenueFactor=options.revenueFactor??1,delay=options.delay??i.delay;
  finite(factor,'成本倍率',0,10);finite(revenueFactor,'合同金额倍率',0,10);finite(delay,'收款月',0,144);assert(Number.isInteger(delay),'收款月必须为整数');
  const equipment=i.quantity*i.unitCost*factor, training=i.training*factor,delivery=i.delivery*factor;
  const monthly=(i.maintenance+i.laborHours*i.hourlyCost+i.consumables+i.downtime)*factor,initial=equipment+training+delivery;
  const contract=i.quote*revenueFactor,total=initial+monthly*i.months;
  let cumulative=0,minCash=0;
  const timeline=Array.from({length:i.months+1},(_,m)=>{const paid=m===0?initial:monthly,received=m===delay?contract:0; cumulative+=received-paid;minCash=Math.min(minCash,cumulative);return {month:m,paid,received,net:received-paid,cumulative};});
  return {equipment,training,delivery,monthly,initial,total,contract,receipts:delay<=i.months?contract:0,uncollected:delay>i.months?contract:0,contribution:contract-total,cashEnd:cumulative,fundingGap:Math.max(0,-minCash),customerBaseline:i.baselineMonthly*i.months,customerCost:contract+i.customerMonthly*i.months,customerDifference:i.baselineMonthly*i.months-contract-i.customerMonthly*i.months,timeline};
}
export function costScenarios(i) {return [
  {name:'成本较低',costFactor:.9,revenueFactor:1,delay:i.delay},
  {name:'基准输入',costFactor:1,revenueFactor:1,delay:i.delay},
  {name:'压力演练',costFactor:1.2,revenueFactor:.8,delay:Math.min(144,i.delay+3)}
].map(s=>({...s,...calculateCost(i,s)}));}
export function validateCost(d) {
  if(!base(d,['version','input','saved']))return;validateCostInput(d.input);arr(d.saved,'历史方案',100);d.saved.forEach(s=>{text(s.id,'方案ID',true);text(s.date,'记录时间',true);validateCostInput(s.input);});
}

// 09: explainable rules. Findings require human judgement, not automated compliance claims.
export const presentationSeed={version:1,draft:{title:'能策 Pilot 三分钟介绍（检查示例）',audience:'技术销售面试官',goal:'说明工作流、数据边界与下一步验证',minutes:3,speed:240,text:'我们的能策 Pilot 一定能让客户节费30%。\n工作台可对照输入、假设和输出，帮助复核方案。[S1]\n巡检设备续航49分钟。[S2]\n下一步：邀请从业者用同一份数据试用并记录问题。',forbidden:'保证,零风险,必然成功,稳赚',actualSeconds:0},sources:[{id:'S1',title:'公开演示说明（示例）',url:'https://example.com/demo',checked:'2026-10-29',validUntil:'2027-10-29',note:'占位示例，正式使用须换成可验证的真实资料。',verified:false},{id:'S2',title:'旧参数示例',url:'https://example.com/specs',checked:'2025-01-01',validUntil:'2025-12-31',note:'故意设置过期来源，用于检查演示。',verified:false}],reviews:{},releases:[]};
export function inspectPresentation(d,day) {
  const input=d.draft, findings=[];
  const lines=input.text.split(/\r?\n/).filter(x=>x.trim());
  const terms=[...new Set(['保证','一定','零风险','100%','稳赚',...input.forbidden.split(/[,，\n]/).map(x=>x.trim()).filter(Boolean)])];
  lines.forEach((line,index)=>{
    const ids=[...line.matchAll(/\[([A-Za-z][\w-]*)\]/g)].map(x=>x[1]);
    const numeric=/\d/.test(line.replace(/\[[^\]]+\]/g,''));
    if(numeric&&!ids.length)findings.push({id:`number-${index}`,kind:'数字无来源',line:index+1,text:line,detail:'包含数字但未标注[S1]等来源。'});
    for(const id of ids){const s=d.sources.find(x=>x.id===id);if(!s)findings.push({id:`missing-${index}-${id}`,kind:'来源缺失',line:index+1,text:line,detail:`未登记${id}`});else if(!s.validUntil||s.validUntil<day||!s.checked||s.checked>day||!s.verified)findings.push({id:`source-${index}-${id}`,kind:!s.validUntil?'来源有效期缺失':s.validUntil<day?'来源过期':!s.checked?'来源核对日期缺失':s.checked>day?'核对日期在未来':'来源未核实',line:index+1,text:line,detail:`${id}：${s.title}，核对${s.checked||'未填'}，截止${s.validUntil||'未填'}。`});}
    terms.filter(term=>line.includes(term)).forEach(term=>findings.push({id:`promise-${index}-${term}`,kind:'承诺需复核',line:index+1,text:line,detail:`发现“${term}”，需核对适用条件和表述依据。`}));
  });
  if(!/需求|问题|现状|痛点|场景/.test(input.text))findings.push({id:'structure-need',kind:'结构缺口',line:0,text:'全文',detail:'未检出需求/问题/场景词，请人工检查是否说明听众面对的问题。'});
  if(!/下一步|试点|试用|验证|建议/.test(input.text))findings.push({id:'structure-next',kind:'结构缺口',line:0,text:'全文',detail:'未检出下一步或验证安排。'});
  const characters=input.text.replace(/\s/g,'').length,estimatedSeconds=characters/input.speed*60;
  if(estimatedSeconds>input.minutes*60)findings.push({id:'duration-estimate',kind:'估算超时',line:0,text:'全文',detail:`按每分钟${input.speed}字约${Math.ceil(estimatedSeconds)}秒；须实际演练。`});
  if(input.actualSeconds>input.minutes*60)findings.push({id:'duration-actual',kind:'实测超时',line:0,text:'计时记录',detail:`实际${input.actualSeconds}秒，目标${input.minutes*60}秒。`});
  return {findings,characters,estimatedSeconds,unresolved:findings.filter(f=>!d.reviews[f.id]||!['已核实','已改写','不适用'].includes(d.reviews[f.id].status)),outline:[`开场：${input.audience}面对的具体问题`,`中段：以证据解释${input.goal}`,`边界：数据、条件、未验证事项`,`收尾：一个可执行的下一步`]};
}
export function validatePresentation(d) {
  if(!base(d,['version','draft','sources','reviews','releases']))return;assert(plain(d.draft),'演示文本格式错误');['title','audience','goal','text','forbidden'].forEach(k=>text(d.draft[k],k,['title','audience','goal'].includes(k)));finite(d.draft.minutes,'目标分钟',.1,120);finite(d.draft.speed,'每分钟字数',60,600);finite(d.draft.actualSeconds,'实测秒数',0,86400);
  arr(d.sources,'来源',1000);unique(d.sources,'来源');d.sources.forEach(s=>{text(s.title,'来源标题',true);assert(httpUrl(s.url),'来源地址须为http(s)网页');iso(s.checked,'核对日期');iso(s.validUntil,'有效期');text(s.note,'来源说明');assert(typeof s.verified==='boolean','来源核实状态错误');});
  assert(plain(d.reviews),'人工核查记录须为对象');assert(Object.keys(d.reviews).length<=2000,'人工核查记录过多');Object.values(d.reviews).forEach(r=>{assert(plain(r),'核查记录格式错误');enumOf(r.status,['未处理','已核实','已改写','不适用'],'处理状态');text(r.reason,'核查说明',r.status!=='未处理');text(r.reviewer,'核查人',r.status!=='未处理');});
  arr(d.releases,'发布记录',100);d.releases.forEach(r=>{text(r.id,'发布ID',true);text(r.date,'记录时间',true);text(r.reviewer,'审阅人',true);text(r.report,'报告内容',true);});
}
export function presentationReport(d,day) {const r=inspectPresentation(d,day);return [`# ${d.draft.title}`,`受众：${d.draft.audience}\n目标：${d.draft.goal}\n检查日期：${day}`,`目标${d.draft.minutes}分钟；估算${Math.ceil(r.estimatedSeconds)}秒；实际计时${d.draft.actualSeconds||'未完成'}秒`,`## 原稿\n${d.draft.text}`,'## 规则检查（不等于业务审核）',...r.findings.map(f=>`- ${f.kind}：${f.detail}\n  ${f.text}\n  人工记录：${d.reviews[f.id]?`${d.reviews[f.id].status}／${d.reviews[f.id].reviewer}／${d.reviews[f.id].reason}`:'待处理'}`),'## 短版提纲',...r.outline.map(x=>`- ${x}`),'## 来源',...d.sources.map(s=>`- [${s.id}] ${s.title} ${s.url}；核对${s.checked||'未填'}，有效至${s.validUntil||'未知'}；${s.verified?'人工标记已核实':'未核实'}；${s.note}`)].join('\n\n');}

// 10: no probability-weighted revenue; quotes and stage evidence are separate records.
export const stages=['线索','需求核对','方案讨论','已报价','已成交','已结束'];
export const crmSeed={version:1,opportunities:[
  {id:'demo-1',name:'模拟A · 校园装调课工具',kind:'演示',authorization:'',need:'整理讲义版本与器材准备',stage:'需求核对',owner:'本人（演示）',next:'约定一次讲师试用',due:'2026-11-06',closeEvidence:'',interactions:[],quotes:[]},
  {id:'demo-2',name:'模拟B · 场站问题闭环',kind:'演示',authorization:'',need:'让整改记录能回到原始照片',stage:'方案讨论',owner:'本人（演示）',next:'核对复检验收口径',due:'2026-11-10',closeEvidence:'',interactions:[],quotes:[]},
  {id:'demo-3',name:'模拟C · 经销商培训',kind:'演示',authorization:'',need:'双语产品入门培训',stage:'线索',owner:'本人（演示）',next:'确认产品与培训受众',due:'2026-11-12',closeEvidence:'',interactions:[],quotes:[]},
  {id:'demo-4',name:'模拟D · 交付资料检查',kind:'演示',authorization:'',need:'减少材料错版与遗漏',stage:'已报价',owner:'本人（演示）',next:'确认报价范围与有效期',due:'2026-11-15',closeEvidence:'',interactions:[],quotes:[{id:'q-demo',version:1,date:'2026-10-29',validUntil:'2026-11-30',amount:1800,currency:'CNY',scope:'虚构示例：一次资料检查；金额不代表真实报价。',status:'草稿'}]},
  {id:'demo-5',name:'模拟E · 无人机演示活动',kind:'演示',authorization:'',need:'活动交付清单',stage:'已结束',owner:'本人（演示）',next:'',due:'',closeEvidence:'模拟：活动取消，保存原因而不继续追单。',interactions:[],quotes:[]}
]};
export function validateOpportunity(o) {
  assert(plain(o),'机会格式错误');['id','name','owner','need'].forEach(k=>text(o[k],k,true));enumOf(o.kind,['演示','真实授权'],'数据类型');text(o.authorization,'授权说明',o.kind==='真实授权');enumOf(o.stage,stages,'阶段');text(o.next,'下一步',!['已成交','已结束'].includes(o.stage));iso(o.due,'下一步日期',!['已成交','已结束'].includes(o.stage));text(o.closeEvidence,'关闭依据',['已成交','已结束'].includes(o.stage));
  arr(o.interactions,'沟通记录',500);unique(o.interactions,'沟通记录');o.interactions.forEach(i=>{iso(i.date,'沟通日期',true);['channel','note','owner','next'].forEach(k=>text(i[k],k,k!=='next'));});
  arr(o.quotes,'报价版本',100);unique(o.quotes,'报价');const versions=new Set();o.quotes.forEach(q=>{finite(q.version,'版本',1,10000);assert(Number.isInteger(q.version)&&!versions.has(q.version),'报价版本重复或不是整数');versions.add(q.version);iso(q.date,'报价日期',true);iso(q.validUntil,'报价有效期',true);assert(q.validUntil>=q.date,'报价有效期早于报价日期');finite(q.amount,'报价金额');enumOf(q.currency,['CNY'],'币种');text(q.scope,'报价范围',true);enumOf(q.status,['草稿','已发送（手动记录）','客户已确认（手动记录）'],'报价状态');});
  assert(o.stage!=='已报价'||o.quotes.length>0,'进入已报价阶段前请先保存报价版本');
}
export function validateCRM(d) {if(!base(d,['version','opportunities']))return;arr(d.opportunities,'机会',1000);unique(d.opportunities,'机会');d.opportunities.forEach(validateOpportunity);}
export function crmSummary(rows,day) {return {open:rows.filter(x=>!['已成交','已结束'].includes(x.stage)).length,overdue:rows.filter(x=>!['已成交','已结束'].includes(x.stage)&&x.due<day).length,quoted:rows.reduce((s,x)=>s+(x.quotes.at(-1)?.amount||0),0),real:rows.filter(x=>x.kind==='真实授权').length,stages:stages.map(stage=>({stage,count:rows.filter(x=>x.stage===stage).length}))};}
export function crmReport(d,day) {return ['# 客户跟进与机会清单',`导出日期：${day}；报价总额不是收入；演示项目不计真实业务。`,...d.opportunities.map(o=>`## ${o.name}\n类型：${o.kind}；授权范围：${o.authorization||'演示，无真实客户'}\n阶段：${o.stage}；负责人：${o.owner}\n需求：${o.need}\n下一步：${o.next||'已关闭'}；日期：${o.due||'—'}\n关闭依据：${o.closeEvidence||'未关闭'}\n\n### 沟通\n${o.interactions.map(i=>`${i.date} ${i.channel} ${i.owner}：${i.note}；下一步${i.next}`).join('\n')||'暂无记录'}\n\n### 报价版本\n${o.quotes.map(q=>`V${q.version} ${q.amount} ${q.currency} ${q.status}；日期${q.date}，有效至${q.validUntil}；${q.scope}`).join('\n')||'暂无报价'}`)].join('\n\n');}

export const fresh = clone;
