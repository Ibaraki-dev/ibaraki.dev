import {spawnSync} from 'node:child_process';
import {mkdtempSync,writeFileSync,rmSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const [action,id,...flags]=process.argv.slice(2);
const mode=process.argv.includes('--remote')?'--remote':process.argv.includes('--local')?'--local':null;
if(!mode || !['withdraw','restore','status'].includes(action) || (action!=='status'&&!/^[1-9]\d{0,9}$/.test(id||''))){console.error('Usage: node scripts/report-admin.mjs status --remote | withdraw|restore EVENT_ID --remote (or --local)');process.exit(1);}
let sql;
if(action==='status')sql="SELECT name,last_success,last_error,lease_until FROM jobs; SELECT event_id,status,published_at,updated_at FROM reports ORDER BY event_id DESC;";
else{
 const seed=JSON.parse(readFileSync(new URL('../src/data/events.json',import.meta.url),'utf8')).events.find(e=>e.id===Number(id));
 const insert=seed?`INSERT OR IGNORE INTO public_events(id,data,updated_at) VALUES(${id},'${JSON.stringify(seed).replaceAll("'","''")}',datetime('now'));`:'';
 sql=insert+(action==='withdraw'?`INSERT INTO reports(event_id,status,updated_at) VALUES(${id},'withdrawn',datetime('now')) ON CONFLICT(event_id) DO UPDATE SET status='withdrawn',body=NULL,source_hash=NULL,updated_at=datetime('now');`:`UPDATE reports SET status='pending',source_hash=NULL,body=NULL,updated_at=datetime('now') WHERE event_id=${id};`)+`SELECT event_id,status FROM reports WHERE event_id=${id};`;
}
const directory=mkdtempSync(join(tmpdir(),'ibaraki-reports-'));
try{const file=join(directory,'operation.sql');writeFileSync(file,sql);const result=spawnSync(process.execPath,['node_modules/wrangler/bin/wrangler.js','d1','execute','ibaraki-dev-reports',mode,'--file',file],{stdio:'inherit'});process.exitCode=result.status??1;}finally{rmSync(directory,{recursive:true,force:true});}
