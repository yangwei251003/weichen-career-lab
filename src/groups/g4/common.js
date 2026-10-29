import {esc} from '../../core.js';
export const fail=m=>{throw new Error(m);};
export function obj(v,label='数据'){if(!v||Array.isArray(v)||typeof v!=='object')fail(`${label}必须是对象`);}
export function str(v,label='文字',required=true){if(typeof v!=='string'||v.length>30000||(required&&!v.trim()))fail(`${label}需要有效文字`);}
export function num(v,label='数字',min=0,max=1e12){if(typeof v!=='number'||!Number.isFinite(v)||v<min||v>max)fail(`${label}数值无效`);}
export function en(v,values,label='选项'){if(!values.includes(v))fail(`${label}无效`);}
export function bool(v,label='状态'){if(typeof v!=='boolean')fail(`${label}需要布尔值`);}
export function date(v,label='日期',optional=false){if(optional&&v==='')return;str(v,label);if(!/^\d{4}-\d{2}-\d{2}$/.test(v)||!Number.isFinite(Date.parse(v+'T12:00:00Z'))||new Date(v+'T12:00:00Z').toISOString().slice(0,10)!==v)fail(`${label}不是有效日期`);}
export function arr(v,label='记录',max=3000){if(!Array.isArray(v)||v.length>max)fail(`${label}需要数组，最多${max}项`);}
export function rows(v,label='记录',max=3000){arr(v,label,max);const seen=new Set();for(const x of v){obj(x,label);str(x.id,'编号');if(seen.has(x.id))fail(`${label}编号重复`);seen.add(x.id);}}
export function base(s,keys){obj(s);if(!Object.keys(s).length)return false;if(s.version!==1)fail('数据版本不兼容');for(const k of keys)if(!(k in s))fail(`缺少${k}`);return true;}
export function strings(v,label='文字列表'){arr(v,label,1000);v.forEach(x=>str(x,label));}
export const kindTag=k=>`<span class="badge ${k==='sample'?'warn':''}">${({sample:'教学模拟',personal:'本人录入',public:'公开数据',authorized:'获授权匿名数据'})[k]||esc(k)}</span>`;
export const act=(label,name,id='',kind='secondary')=>`<button type="button" class="button ${kind}" data-action="${esc(name)}" data-id="${esc(id)}">${esc(label)}</button>`;
export const submit=label=>`<button class="button" type="submit">${esc(label)}</button>`;
export function initial(store,seed,validate){const s=store.get();validate(s);return Object.keys(s).length?s:seed();}
export function wire(root,ctx,click,submitHandler,change){const run=fn=>e=>Promise.resolve().then(()=>fn?.(e)).catch(x=>ctx.notify(x.message||'操作失败','error'));const c=run(e=>{const b=e.target.closest('[data-action]');if(b&&root.contains(b))return click?.(b.dataset.action,b.dataset.id,b,e);});const s=e=>{if(e.target.tagName==='FORM'){e.preventDefault();run(submitHandler)(e);}};const ch=run(change);root.addEventListener('click',c);root.addEventListener('submit',s);root.addEventListener('change',ch);return()=>{root.removeEventListener('click',c);root.removeEventListener('submit',s);root.removeEventListener('change',ch);};}
export const report=(ctx,name,value)=>{ctx.download(name,value,'text/markdown;charset=utf-8');ctx.notify('报告已导出');};
export function parseCsv(text){const out=[];let row=[],cell='',quoted=false;for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;}else if(c===','&&!quoted){row.push(cell);cell='';}else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cell);if(row.some(x=>x.trim()))out.push(row);row=[];cell='';}else cell+=c;}if(quoted)fail('CSV引号未闭合');row.push(cell);if(row.some(x=>x.trim()))out.push(row);if(out.length)out[0][0]=out[0][0].replace(/^\uFEFF/,'');return out;}
