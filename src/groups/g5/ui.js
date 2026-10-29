import {esc,field,button,empty,stat,badge,table,formValues,csv,uid,formatNumber,safeUrl} from '../../core.js';
export {esc,button,empty,stat,badge,table,formValues,csv,uid,formatNumber};
export const f=(name,label,value='',options={})=>field(name,label,value,options);
export const txt=(name,label,value='',required=false)=>f(name,label,value,{type:'textarea',wide:true,required});
export const sel=(name,label,value,options)=>f(name,label,value,{type:'select',options});
export const submit=(label='保存')=>`<button type="submit" class="button">${esc(label)}</button>`;
export const edit=id=>`<button type="button" class="button secondary" data-edit="${esc(id)}">编辑</button>`;
export const del=id=>`<button type="button" class="button danger" data-delete="${esc(id)}">删除</button>`;
export const link=url=>safeUrl(url)?`<a href="${esc(safeUrl(url))}" target="_blank" rel="noopener noreferrer">核对原始来源 ↗</a>`:`<span class="muted">${esc(url||'来源待补')}</span>`;
export function store(root,ctx,seed,validate){const raw=ctx.store.get();validate(raw);let state=Object.keys(raw).length?raw:structuredClone(seed);return{get:()=>state,save(next,msg='已保存'){validate(next);ctx.store.save(next);state=next;ctx.notify(msg);},on(type,handler){const fn=async e=>{try{await handler(e);}catch(err){ctx.notify(err.message||'操作失败','error');}};root.addEventListener(type,fn);return()=>root.removeEventListener(type,fn);}};}
export const upsert=(rows,r)=>rows.some(x=>x.id===r.id)?rows.map(x=>x.id===r.id?r:x):[...rows,r];
