import {esc,button} from '../../core.js';
export const kindBadge = kind => `<span class="badge ${kind==='sample'?'warn':''}">${kind==='sample'?'模拟示例':'本人录入'}</span>`;
export const action = (label,name,id='',kind='secondary') => `<button class="button ${kind}" type="button" data-action="${esc(name)}" data-id="${esc(id)}">${esc(label)}</button>`;
export const submit = label => `<button class="button" type="submit">${esc(label)}</button>`;
export const blankAction = () => button('清除本页模拟示例','clear-samples','secondary');
export const timeField=(name,label,value='')=>`<label class="field">${esc(label)}<input type="datetime-local" name="${esc(name)}" value="${esc(value)}" required></label>`;
export function initial(store,seed,validate){const data=store.get();validate(data);return Object.keys(data).length?data:seed();}
export function wire(root,ctx,click,submitHandler,change){
  const handle=(fn)=>(e)=>{Promise.resolve().then(()=>fn?.(e)).catch(err=>ctx.notify(err.message||'操作未完成','error'));};
  const c=handle(e=>{const target=e.target.closest('[data-action]');if(target&&root.contains(target))return click?.(target.dataset.action,target.dataset.id,target,e);});
  const s=e=>{if(e.target.tagName!=='FORM')return;e.preventDefault();handle(submitHandler)(e);};
  const ch=handle(change);root.addEventListener('click',c);root.addEventListener('submit',s);root.addEventListener('change',ch);
  return()=>{root.removeEventListener('click',c);root.removeEventListener('submit',s);root.removeEventListener('change',ch);};
}
export function downloadReport(ctx,name,text){ctx.download(name,text,'text/markdown;charset=utf-8');ctx.notify('报告已导出');}
