import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import matter from 'gray-matter';
const load = async p => import('data:text/javascript;base64,' + Buffer.from(ts.transpileModule(fs.readFileSync(p,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText).toString('base64'));
const {makeTrials,epoch,analyze,times,dt}=await load('src/lib/bci/epochs.ts');
const {erpCards}=await load('src/data/erp-components.ts');
const {legacyChapters}=await load('src/data/legacy-chapters.ts');
const trials=makeTrials();assert.deepEqual(trials,makeTrials());assert.equal(trials.length,128);assert.equal(times.length,301);
assert.throws(()=>makeTrials(-1));assert.throws(()=>makeTrials(NaN));assert.throws(()=>analyze(trials,3,'stimulus',true,false));
for(const jitter of [0,40,100])for(const n of [1,8,32,64])for(const alignment of ['stimulus','response'])for(const baseline of [false,true])for(const reject of [false,true]) {
 const r=analyze(makeTrials(jitter),n,alignment,baseline,reject);
 assert.equal(r.b.length,n);assert.equal(r.a.length,n-(reject?Math.ceil(n/13):0));
 assert.ok([...r.avgA,...r.avgB,...r.difference,...r.a.flat(),...r.b.flat()].every(Number.isFinite));
 assert.deepEqual(r.difference,r.avgA.map((v,i)=>v-r.avgB[i]));
}
for(const t of trials){const a=epoch(t,'stimulus',true);assert.ok(Math.abs(a.slice(0,50).reduce((s,v)=>s+v,0)/50)<1e-12);const b=epoch(t,'response',false);assert.equal(b[50],t.values[(1000+t.rt)/dt]);}
const root='src/content/chapters/eeg';const active=fs.readdirSync(root).filter(n=>n.endsWith('.mdx')&&!legacyChapters['eeg/'+n.replace(/\.mdx$/,'')]);
const main=active.filter(n=>n!=='glossary.mdx').map(n=>({name:n,...matter(fs.readFileSync(path.join(root,n),'utf8'))}));
assert.equal(main.length,18);assert.deepEqual(main.map(x=>x.data.order).sort((a,b)=>a-b),Array.from({length:18},(_,i)=>i+1));
for(const ch of main.filter(c=>c.data.order>=4)){assert.ok(ch.content.length>1200, ch.name+' needs substantive text');assert.ok(ch.content.includes('SourceNote'),ch.name);assert.ok(ch.content.includes('TestYourself'),ch.name);}
assert.equal(Object.keys(legacyChapters).length,9);for(const target of Object.values(legacyChapters))assert.ok(fs.existsSync('src/content/chapters/'+target+'.mdx'));
assert.equal(erpCards.length,15);assert.equal(new Set(erpCards.map(c=>c.id)).size,15);for(const c of erpCards){for(const key of ['task','zero','contrast','region','timing','boundary','source'])assert.ok(c[key].length>5);assert.ok(new URL(c.url).protocol==='https:');}
fs.mkdirSync('test-artifacts',{recursive:true});fs.writeFileSync('test-artifacts/bci-math-content.json',JSON.stringify({pass:true,chapters:18,legacy:9,cards:15,trialConfigurations:3*4*2*2*2,syntheticOnly:true},null,2));
console.log('PASS: 192 synthetic configurations, baseline/re-alignment, 18 chapters, 9 legacy routes, 15 ERP cards.');
