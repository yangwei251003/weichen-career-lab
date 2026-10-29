import {esc,field,button,stat,badge,empty,table,formValues,uid,formatNumber,csv,safeUrl} from '../../core.js';
export {esc,field,button,stat,badge,empty,table,formValues,uid,formatNumber,csv,safeUrl};
export const area=(name,label,value='',required=false)=>field(name,label,value,{type:'textarea',wide:true,required});
export const select=(name,label,value,options)=>field(name,label,value,{type:'select',options});
export const submit=(label='保存记录')=>`<button type="submit" class="button">${esc(label)}</button>`;
export const action=(label,name,id='',kind='secondary')=>`<button type="button" class="button ${esc(kind)}" data-action="${esc(name)}" data-id="${esc(id)}">${esc(label)}</button>`;
export function setup(root,ctx,seed,validate){let state=ctx.store.get();if(!Object.keys(state).length)state=structuredClone(seed);validate(state);const handlers=[];return {get:()=>state,save(next){validate(next);ctx.store.save(next);state=structuredClone(next);ctx.notify('已保存到此浏览器');},on(type,fn){const handler=async e=>{try{await fn(e);}catch(err){ctx.notify(err.message,'error');}};root.addEventListener(type,handler);handlers.push(()=>root.removeEventListener(type,handler));},close:()=>handlers.forEach(fn=>fn())};}
export const upsert=(list,row)=>list.some(x=>x.id===row.id)?list.map(x=>x.id===row.id?row:x):[row,...list];
export function link(url){return safeUrl(url)?`<a href="${esc(safeUrl(url))}" target="_blank" rel="noopener noreferrer">查看原始资料 ↗</a>`:esc(url);}
export const report=(ctx,name,text)=>ctx.download(name+'.md',text,'text/markdown;charset=utf-8');
