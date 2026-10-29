import {controller,esc,field,button,badge,stat,empty,select,submit,formValues,uid,reportDownload} from './shared.js';
import {interviewSeed,validateInterview,roles,interviewTopics,interviewQuestions,interviewReply,interviewGaps,interviewReport,requireText} from './logic.js';
export function mountInterview(root,ctx){
  const c=controller(root,ctx,interviewSeed,validateInterview);let topic='现状',running=false,seconds=c.get().elapsed,timer;
  const timeText=()=>`${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;
  const stop=()=>{if(timer)clearInterval(timer);timer=null;running=false;};c.cleanup(stop);
  const capture=()=>{const form=root.querySelector('form[data-form="reflection"]');return form?formValues(form):{observations:c.get().observations,assumptions:c.get().assumptions,summary:c.get().summary};};
  c.render=()=>{const d=c.get(),gaps=interviewGaps(d.turns);root.innerHTML=`
    <div class="notice">这是固定分支的模拟客户，所有回应均为教学创作。它帮助你练习追问、倾听与复述；覆盖话题不等于掌握销售能力。</div>
    <div class="stats">${stat('练习角色',roles[d.role].name,'与你的无人机教学、能源方向相连')}${stat('已覆盖维度',`${6-gaps.length} / 6`,'现状 · 损失 · 流程 · 预算 · 决策人 · 验收')}${stat('练习轮次',d.turns.length,'原话与个人解释分别记录')}</div>
    <div class="grid-2"><section class="panel"><h2>选择一次真实问题的练习</h2><form data-form="role" class="form-grid">${select('role','客户角色',d.role,Object.entries(roles).map(([value,v])=>({value,label:v.name})))}${submit('切换角色并开始新练习')}</form><p>${esc(roles[d.role].context)}</p><p class="small muted">切换前会提示保存；可选择同一角色重新练习。不会联系客户或录音。</p>
    <div class="timer-controls"><output class="timer" aria-label="练习计时">${timeText()}</output>${button(running?'暂停计时':'开始计时','timer',running?'secondary':'primary')}${button('计时归零','timer-reset','secondary')}</div><p class="small muted">计时用于独立10分钟练习的自查；打开页面不自动计时。</p>
    <h3>围绕一个维度提问</h3><div class="topic-choices">${[...interviewTopics,'追问','推介'].map(t=>button(`${topic===t?'● ':''}${t}`,`topic:${t}`,topic===t?'primary':'secondary')).join('')}</div>
    <form data-form="question" class="form-grid">${field('question','你会怎样问？',interviewQuestions[topic]||(topic==='追问'?'你提到的这个问题，上一次具体是怎样发生的？':'我们有一个工具，想先介绍一下功能。'),{type:'textarea',required:true,wide:true})}${submit('向模拟角色提问')}</form>
    <p class="small muted">没有语言模型调用。你选择的维度决定分支；真实访谈需根据对方原话灵活追问。</p></section>
    <section class="panel"><h2>问答记录</h2><div class="transcript" aria-live="polite">${d.turns.length?d.turns.map((t,i)=>`<article class="chat-turn"><p class="small muted">第${i+1}轮 · ${esc(t.topic)}</p><p><strong>你的提问：</strong>${esc(t.question)}</p><blockquote><strong>模拟原话：</strong>${esc(t.answer)}</blockquote><p class="small muted">${esc(t.coach)}</p></article>`).join(''):empty('从“上一次发生了什么”开始。先问现状，再判断要不要介绍产品。')}</div>
    <h3>仍未覆盖的维度</h3><div class="toolbar">${gaps.length?gaps.map(g=>badge(g,'warn')).join(''):badge('六个维度均有记录，继续核实细节','good')}</div></section></div>
    <section class="panel"><div class="panel-head"><h2>从原话到需求摘要</h2>${button('下载当前练习报告','export','secondary')}</div><form data-form="reflection" class="form-grid">${field('observations','我的解释（不冒充客户原话）',d.observations,{type:'textarea',wide:true,placeholder:'例如：我推测对方更在意交付过程，但还未获得确认。'})}${field('assumptions','未确认假设与待核资料',d.assumptions,{type:'textarea',wide:true})}${field('summary','用自己的话复述需求',d.summary,{type:'textarea',wide:true,placeholder:'谁，在什么场景，遇到什么问题；现在怎么解决；下一步核实什么。'})}${submit('保存复盘草稿')}</form>
    <h3>下一次沟通的三个关键问题</h3><ol>${(gaps.length?gaps.slice(0,3).map(t=>interviewQuestions[t]):['能否提供最近一次具体记录？','可以找哪位实际使用者核对？','用什么基线衡量试点结果？']).map(x=>`<li>${esc(x)}</li>`).join('')}</ol>
    <label class="radio-line"><input type="checkbox" name="human-practice"> 我另与自愿参与者完成了真实角色扮演（本人记录，软件不验证）</label>
    <div class="toolbar">${button('归档这次练习','archive')}${button('清空当前练习','clear','danger')}</div></section>
    <section class="panel"><h2>我的练习档案</h2>${d.sessions.length?d.sessions.slice().reverse().map(s=>`<details class="snapshot"><summary>${esc(s.date)} · ${esc(roles[s.role].name)} · ${s.turns.length}轮 · ${Math.floor(s.elapsed/60)}分${s.elapsed%60}秒</summary><p>${esc(s.summary||'尚未整理摘要')}</p><p class="small muted">${s.humanPractice?'本人记录另完成真人角色扮演，效果待反馈。':'仅软件模拟练习。'}</p>${button('下载此记录',`session:${s.id}`,'secondary')}</details>`).join(''):empty('每次练习保留原话、解释与假设，之后能检查自己的追问有没有进步。')}</section>`;};
  c.on('submit',e=>{e.preventDefault();const f=e.target;if(!f.reportValidity())return;const x=formValues(f),kind=f.dataset.form;
    if(kind==='role'){if(c.get().turns.length&&!ctx.confirm('当前练习仍保留在页面；切换会清空当前问答。若需要留存，请取消并先归档。继续？'))return;stop();seconds=0;c.change(d=>{d.role=x.role;d.turns=[];d.observations='';d.assumptions='';d.summary='';d.elapsed=0;});topic='现状';}
    if(kind==='question'){const question=requireText(x.question,'你的提问'),reflection=capture();c.change(d=>{const reply=interviewReply(d.role,topic,d.turns,question);d.turns.push({topic,question,...reply});Object.assign(d,reflection,{elapsed:seconds});});}
    if(kind==='reflection')c.change(d=>Object.assign(d,x,{elapsed:seconds}));c.render();if(kind==='question'){const t=root.querySelector('.transcript');t.scrollTop=t.scrollHeight;}ctx.notify('练习已保存');
  });
  c.on('click',e=>{const act=e.target.closest('[data-action]')?.dataset.action;if(!act)return;const [action,id]=act.split(':');
    if(action==='topic'){const draft=capture();c.change(d=>Object.assign(d,draft,{elapsed:seconds}));topic=id;}
    if(action==='timer'){if(running){stop();c.change(d=>{d.elapsed=seconds;});}else{running=true;timer=setInterval(()=>{seconds++;const out=root.querySelector('.timer');if(out)out.textContent=timeText();if(seconds>=86400)stop();},1000);}}
    if(action==='timer-reset'){if(!ctx.confirm('将当前练习计时归零？已归档记录不变。'))return;stop();seconds=0;c.change(d=>{d.elapsed=0;});}
    if(action==='export'){const snapshot={...c.get(),...capture(),elapsed:seconds};return reportDownload(ctx,'需求访谈练习',interviewReport(snapshot));}
    if(action==='archive'){const d=c.get();if(!d.turns.length)throw new Error('先完成至少一轮问答再归档');const reflection=capture(),humanPractice=root.querySelector('[name="human-practice"]').checked;stop();c.change(s=>{Object.assign(s,reflection,{elapsed:seconds});s.sessions.push({id:uid(),date:new Date().toISOString(),role:s.role,turns:s.turns,observations:s.observations,assumptions:s.assumptions,summary:s.summary,elapsed:seconds,humanPractice});});ctx.notify('已归档；模拟记录与真人练习声明分别保留');}
    if(action==='session'){const s=c.get().sessions.find(x=>x.id===id);if(s)return reportDownload(ctx,'访谈档案',interviewReport(s));}
    if(action==='clear'){if(!ctx.confirm('清空当前问答和复盘草稿？已归档记录保留。'))return;stop();seconds=0;c.change(d=>{d.turns=[];d.elapsed=0;d.observations='';d.assumptions='';d.summary='';});}
    c.render();
  });c.render();return c.done();
}
