export const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const uid = () => globalThis.crypto?.randomUUID?.() || `r-${Date.now()}-${Math.random().toString(36).slice(2)}`;
export const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
export function number(v,{min=-Infinity,max=Infinity,label='数值'}={}) {
  if(!['string','number'].includes(typeof v) || String(v).trim()==='' || !Number.isFinite(Number(v))) throw new Error(`${label}请填写有效数字`);
  const n=Number(v); if(n<min || n>max) throw new Error(`${label}须在 ${min} 至 ${max} 之间`); return n;
}
export const formatNumber = (v,digits=2) => Number.isFinite(Number(v)) ? Number(v).toLocaleString('zh-CN',{maximumFractionDigits:digits}) : '待填写';
export function safeUrl(value) { try { const u = new URL(String(value)); return ['https:','http:'].includes(u.protocol) ? u.href : ''; } catch { return ''; } }
let fieldSequence=0;
export function field(name,label,value='',o={}) {
  const id=`f-${name}-${++fieldSequence}`, attrs=`id="${esc(id)}" name="${esc(name)}" ${o.required?'required':''} ${o.min!==undefined?`min="${esc(o.min)}"`:''} ${o.max!==undefined?`max="${esc(o.max)}"`:''} ${o.step!==undefined?`step="${esc(o.step)}"`:''} ${o.placeholder?`placeholder="${esc(o.placeholder)}"`:''} ${o.help?`aria-describedby="${esc(id)}-help"`:''}`;
  let control;
  if(o.type==='textarea') control=`<textarea ${attrs} rows="${o.rows||3}">${esc(value)}</textarea>`;
  else if(o.type==='select') control=`<select ${attrs}>${(o.options||[]).map(x=>{const v=typeof x==='object'?x.value:x,l=typeof x==='object'?x.label:x;return `<option value="${esc(v)}" ${String(v)===String(value)?'selected':''}>${esc(l)}</option>`;}).join('')}</select>`;
  else control=`<input type="${esc(o.type||'text')}" ${attrs} value="${esc(value)}" ${o.type==='number'&&o.step===undefined?'step="any"':''}>`;
  return `<div class="field${o.wide?' wide':''}"><label for="${esc(id)}">${esc(label)}${o.required?' <span aria-hidden="true">*</span>':''}</label>${control}${o.help?`<small id="${esc(id)}-help">${esc(o.help)}</small>`:''}</div>`;
}
export const formValues = form => Object.fromEntries(new FormData(form));
export const button = (text,action,kind='primary') => `<button type="button" class="button ${esc(kind)}" data-action="${esc(action)}">${esc(text)}</button>`;
export const empty = text => `<div class="empty"><span aria-hidden="true">◇</span><p>${esc(text)}</p></div>`;
export const stat = (label,value,note='') => `<div class="stat"><span>${esc(label)}</span><strong>${esc(value)}</strong>${note?`<small>${esc(note)}</small>`:''}</div>`;
export const badge = (text,kind='') => `<span class="badge ${esc(kind)}">${esc(text)}</span>`;
export const table = (headers,rows) => `<div class="table-wrap" tabindex="0" role="region" aria-label="可横向滚动的数据表"><table><thead><tr>${headers.map(h=>`<th scope="col">${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map(c=>`<td>${c??''}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
export function csv(rows) { return '\uFEFF'+rows.map(row=>row.map(value=>{let s=String(value??'');if(/^[\s]*[=+\-@\t\r]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';}).join(',')).join('\r\n'); }
export function download(filename,text,mime='text/plain;charset=utf-8') { const url=URL.createObjectURL(new Blob([text],{type:mime}));const a=document.createElement('a');a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000); }
export function toMarkdown(title,sections) { return `# ${title}\n\n${Object.entries(sections).map(([k,v])=>`## ${k}\n\n${Array.isArray(v)?v.map(x=>`- ${x}`).join('\n'):v}`).join('\n\n')}\n`; }

export function assertData(data) {
  if(!data || Array.isArray(data) || Object.getPrototypeOf(data)!==Object.prototype) throw new Error('项目资料必须是JSON对象');
  let nodes=0;
  const visit=(v,depth=0)=>{ if(++nodes>80000 || depth>20)throw new Error('资料结构过大或层级过深'); if(typeof v==='number'&&!Number.isFinite(v))throw new Error('资料包含无效数字'); if(typeof v==='string'&&v.length>200000)throw new Error('单个文本过长'); if(v&&typeof v==='object'){if(!Array.isArray(v)&&Object.getPrototypeOf(v)!==Object.prototype)throw new Error('资料包含不支持的对象'); for(const [k,x] of Object.entries(v)){if(['__proto__','prototype','constructor'].includes(k))throw new Error('资料含不安全字段');visit(x,depth+1);}}else if(!['string','number','boolean','undefined'].includes(typeof v)&&v!==null)throw new Error('资料含非JSON值');};
  visit(data); if(JSON.stringify(data).length>1500000)throw new Error('单个项目资料超过1.5MB，请拆分或先归档'); return true;
}
const KEY='weichen-career-lab:v1', RECOVERY='weichen-career-lab:recovery:v1';
export function readVault(storage=globalThis.localStorage) {
  const raw=storage.getItem(KEY); if(!raw)return {schemaVersion:1,projects:{}};
  let v;try{v=JSON.parse(raw);}catch{throw new Error('浏览器资料损坏，已停止写入。请先导出原始资料再恢复备份。');}
  if(v?.schemaVersion!==1 || !v.projects || Array.isArray(v.projects) || typeof v.projects!=='object')throw new Error('浏览器资料版本不兼容，未覆盖现有资料');
  for(const [id,p] of Object.entries(v.projects)){if(!/^(0[1-9]|[1-3]\d|40)$/.test(id)||!Number.isSafeInteger(p?.revision)||p.revision<1)throw new Error('浏览器项目记录无效，未覆盖现有资料');assertData(p.data);}
  return v;
}
export function createStore(id,validate=()=>{},storage=globalThis.localStorage) {
  if(!/^(0[1-9]|[1-3]\d|40)$/.test(id))throw new Error('未知项目');
  let vault=readVault(storage), cached=vault.projects[id], revision=cached?.revision||0;
  if(cached)validate(cached.data);
  return {
    get:()=>structuredClone(cached?.data||{}),
    revision:()=>revision,
    save(data){assertData(data);validate(data);vault=readVault(storage);if((vault.projects[id]?.revision||0)!==revision)throw new Error('另一窗口已更新此项目。请先导出当前草稿，刷新页面后再修改。');const next={data:structuredClone(data),revision:revision+1,updatedAt:new Date().toISOString()};vault.projects[id]=next;const encoded=JSON.stringify(vault);if(encoded.length>4000000)throw new Error('浏览器资料接近容量上限，请先导出归档');try{storage.setItem(KEY,encoded);}catch{throw new Error('浏览器未能保存，请检查存储空间或隐私模式，并导出当前资料');}cached=next;revision=next.revision;return revision;},
    reset(){return this.save({});},
    backup(){const payload={app:'weichen-career-lab',schemaVersion:1,projectId:id,exportedAt:new Date().toISOString(),data:this.get()};return payload;},
    restore(payload){if(payload?.app!=='weichen-career-lab'||payload.schemaVersion!==1||payload.projectId!==id)throw new Error('备份不属于当前项目或版本不兼容');assertData(payload.data);validate(payload.data);try{storage.setItem(RECOVERY,JSON.stringify(this.backup()));}catch{throw new Error('无法保存恢复前备份，已取消替换');}return this.save(payload.data);}
  };
}
export function readRecovery(storage=globalThis.localStorage){const raw=storage.getItem(RECOVERY);return raw?JSON.parse(raw):null;}
export const storageKey = KEY;
