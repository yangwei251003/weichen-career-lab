import { esc, field, button, badge, table, stat, empty, formValues, uid, today, csv, formatNumber } from '../../core.js';
import { fresh } from './logic.js';
export { esc, field, button, badge, table, stat, empty, formValues, uid, today, csv, formatNumber };
export const submit = (label='保存') => `<button class="button" type="submit">${esc(label)}</button>`;
export const num = (name,label,value,opts={}) => field(name,label,value,{type:'number',min:0,step:'any',required:true,...opts});
export const select = (name,label,value,options) => field(name,label,value,{type:'select',options,required:true});
export const sourceLink = url => /^https?:\/\//i.test(url) ? `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">查看原始来源 ↗</a>` : '<span class="muted">未登记网页</span>';
export function controller(root,ctx,seed,validate) {
  let state=ctx.store.get(); if(!state || !Object.keys(state).length)state=fresh(seed);validate(state);
  root.classList.add('g2');
  const link=document.createElement('link');link.rel='stylesheet';link.href=new URL('./style.css',import.meta.url).href;document.head.append(link);
  const cleanups=[()=>link.remove(),()=>root.classList.remove('g2')];
  const api={get:()=>state,save(next){validate(next);ctx.store.save(next);state=fresh(next);},change(fn){const next=fresh(state);fn(next);api.save(next);},notify:m=>ctx.notify(m),render:()=>{}};
  const guard=fn=>async event=>{try{await fn(event);}catch(e){ctx.notify(e.message||'操作失败，请检查输入','error');}};
  api.on=(event,fn)=>{const handler=guard(fn);root.addEventListener(event,handler);cleanups.push(()=>root.removeEventListener(event,handler));};
  api.cleanup=fn=>cleanups.push(fn);
  api.done=()=>()=>cleanups.reverse().forEach(fn=>fn());
  return api;
}
export function requireForm(root,name){const form=root.querySelector(`form[data-form="${name}"]`);if(!form.reportValidity())throw new Error('请先补齐表单必填项');return formValues(form);}
export function reportDownload(ctx,name,body){ctx.download(`${name}.md`,body,'text/markdown;charset=utf-8');}
export function recordActions(edit,remove){return `<div class="toolbar">${button('编辑',edit,'secondary')}${button('删除',remove,'danger')}</div>`;}
