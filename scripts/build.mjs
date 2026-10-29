import {cp,mkdir,writeFile,readFile,readdir} from 'node:fs/promises';import path from 'node:path';import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');const out=path.join(root,'dist');await mkdir(out,{recursive:true});
await cp(path.join(root,'src'),path.join(out,'src'),{recursive:true});await cp(path.join(root,'index.html'),path.join(out,'index.html'));await writeFile(path.join(out,'.nojekyll'),'');
let count=0,bytes=0;async function walk(p){for(const e of await readdir(p,{withFileTypes:true})){const f=path.join(p,e.name);if(e.isDirectory())await walk(f);else{count++;bytes+=(await readFile(f)).length;}}}await walk(out);console.log(`Static build: ${count} files, ${bytes} bytes`);
