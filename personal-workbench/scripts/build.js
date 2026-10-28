import { cp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const root=new URL('../',import.meta.url), dist=new URL('dist/',root);
await rm(dist,{recursive:true,force:true});
await mkdir(dist,{recursive:true});
const files=['index.html','css','js','icons','vendor','docs','manifest.webmanifest','sw.js','README.md','THIRD_PARTY_NOTICES.md','start-demo.py','open-demo.command'];
for(const file of files) await cp(new URL(file,root),new URL(file,dist),{recursive:true});
const { readdir }=await import('node:fs/promises');
async function sourceList(dir) {
  const result=[];
  for(const entry of await readdir(dir,{withFileTypes:true})) {
    const path=new URL(entry.name+(entry.isDirectory()?'/':''),dir);
    if(entry.isDirectory()) result.push(...await sourceList(path)); else result.push(path);
  }
  return result;
}
const hash=createHash('sha256');
for(const url of (await sourceList(dist)).sort((a,b)=>a.href.localeCompare(b.href))) hash.update(await readFile(url));
const workerUrl=new URL('sw.js',dist);
await writeFile(workerUrl,(await readFile(workerUrl,'utf8')).replace(/PREFIX \+ '[^']+'/,`PREFIX + '${hash.digest('hex').slice(0,12)}'`));
console.log('Static workbench built in dist/');
