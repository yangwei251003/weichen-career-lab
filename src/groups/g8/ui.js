import{esc,field,button,empty,stat,badge,table,formValues,csv,uid,formatNumber,safeUrl}from'../../core.js';
export{esc,button,empty,stat,badge,table,formValues,csv,uid,formatNumber};
export const f=(n,l,v='',o={})=>field(n,l,v,o),txt=(n,l,v='',required=false)=>f(n,l,v,{type:'textarea',wide:true,required}),sel=(n,l,v,o)=>f(n,l,v,{type:'select',options:o});
export const submit=(s='保存')=>`<button class="button" type="submit">${esc(s)}</button>`,edit=id=>`<button class="button secondary" type="button" data-edit="${esc(id)}">编辑</button>`,del=id=>`<button class="button danger" type="button" data-delete="${esc(id)}">删除</button>`;
export const link=v=>safeUrl(v)?`<a href="${esc(safeUrl(v))}" target="_blank" rel="noopener noreferrer">查看来源 ↗</a>`:esc(v||'来源待补');
export function setup(root,ctx,seed,validate){const raw=ctx.store.get();validate(raw);let state=Object.keys(raw).length?raw:structuredClone(seed);return{get:()=>state,save(next,msg='已保存'){validate(next);ctx.store.save(next);state=next;ctx.notify(msg);},on(type,handler){const fn=async e=>{try{await handler(e);}catch(err){ctx.notify(err.message||'操作失败','error');}};root.addEventListener(type,fn);return()=>root.removeEventListener(type,fn);}};}
export const upsert=(a,r)=>a.some(x=>x.id===r.id)?a.map(x=>x.id===r.id?r:x):[...a,r];
