import {esc,field,button,empty,stat,badge,table,formValues,csv,uid,formatNumber} from '../../core.js';
export {esc,field,button,empty,stat,badge,table,formValues,csv,uid,formatNumber};
export const f=(name,label,value='',options={})=>field(name,label,value,options);
export const txt=(name,label,value='',required=false)=>f(name,label,value,{type:'textarea',wide:true,required});
export const sel=(name,label,value,options)=>f(name,label,value,{type:'select',options});
export const submit=(text='保存记录')=>`<button class="button" type="submit">${esc(text)}</button>`;
export const editBtn=id=>`<button type="button" class="button secondary" data-edit="${esc(id)}">编辑</button>`;
export const delBtn=id=>`<button type="button" class="button danger" data-delete="${esc(id)}">删除</button>`;
export const pick=(value,options)=>options.includes(value)?value:options[0];
export function start(root,ctx,seed,validate){
  const saved=ctx.store.get();validate(saved);let state=Object.keys(saved).length?saved:structuredClone(seed);
  function save(next,message='已保存到当前浏览器'){validate(next);ctx.store.save(next);state=next;if(message)ctx.notify(message);}
  function listen(type,fn){const listener=async e=>{try{await fn(e);}catch(error){ctx.notify(error.message||'操作失败','error');}};root.addEventListener(type,listener);return()=>root.removeEventListener(type,listener);}
  return {get:()=>state,save,listen};
}
export function upsert(list,record){const i=list.findIndex(x=>x.id===record.id);return i<0?[record,...list]:list.map((x,n)=>n===i?record:x);}
export function downloadCSV(ctx,name,headers,records){ctx.download(`${name}.csv`,csv([headers,...records]),'text/csv;charset=utf-8');}
export const pills=values=>values.map(v=>badge(v)).join(' ');
export function sourceLink(source){if(/^https?:\/\//i.test(source)){try{const u=new URL(source);return `<a href="${esc(u.href)}" target="_blank" rel="noopener noreferrer">查看来源 ↗</a>`;}catch{/* text below */}}return `<span class="small muted">${esc(source||'来源待补')}</span>`;}
