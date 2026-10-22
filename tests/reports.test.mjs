import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {prepareSource,validateReport,sourceHash,eligible,publicMaterialCandidates,sanitize} from '../worker/report.ts';
import {readSource,runScheduled,syncEvents} from '../worker/data.ts';
// Execute production SQL against SQLite. Only the network and AI are stubbed.
class D1 {
 constructor(){this.db=new DatabaseSync(':memory:');}
 prepare(sql){const db=this.db;const make=(args=[])=>({bind(...values){return make(values);},async first(){return db.prepare(sql).get(...args)??null;},async all(){return {results:db.prepare(sql).all(...args)};},async run(){return {meta:db.prepare(sql).run(...args)};}});return make();}
 async batch(statements){this.db.exec('BEGIN');try{const results=[];for(const statement of statements)results.push(await statement.run());this.db.exec('COMMIT');return results;}catch(e){this.db.exec('ROLLBACK');throw e;}}
}
function fixture(){
 const BOT_DB=new D1();BOT_DB.db.exec('CREATE TABLE events(id INTEGER PRIMARY KEY,date TEXT);CREATE TABLE checkins(id INTEGER PRIMARY KEY,user_id INTEGER,todo TEXT,profile TEXT);CREATE TABLE events_to_checkins(event_id INTEGER,checkin_id INTEGER);CREATE TABLE checkouts(id INTEGER PRIMARY KEY,date TEXT,user_id INTEGER,content TEXT);');
 BOT_DB.db.exec("INSERT INTO events VALUES(23,'2026-10-17');INSERT INTO checkins VALUES(1,1,'TypeScriptの勉強','SECRET PROFILE'),(2,2,'非公開:仕事のプロジェクト','SECRET PROFILE');INSERT INTO events_to_checkins VALUES(23,1),(23,2);INSERT INTO checkouts VALUES(1,'2026-10-17',1,'型のテストを書いた'),(2,'2026-10-17',1,'型のテストを書いた'),(3,'2026-10-17',1,'ドキュメントを読んだ'),(4,'2026-10-17',99,'別の開催からの記録');");
 const REPORT_DB=new D1();REPORT_DB.db.exec(readFileSync(new URL('../migrations/0001_reports.sql',import.meta.url),'utf8'));
 const event={id:406885,title:'Ibaraki.dev #21 もくもく会',number:'21',startsAt:'2026-10-17T09:00:00+09:00',endsAt:'2026-10-17T10:00:00+09:00',url:'https://mito-web-engineer.connpass.com/event/406885/',place:'水戸',tags:['もくもく会'],summary:''};
 REPORT_DB.db.prepare('INSERT INTO public_events VALUES(?,?,?)').run(event.id,JSON.stringify(event),new Date().toISOString());
 let calls=0;
 const env={BOT_DB,REPORT_DB,REPORTS_START_DATE:'2026-10-17',AI:{async run(_model,{messages}){calls++;const source=JSON.parse(messages[1].content);assert.ok(!messages[1].content.includes('SECRET'));return {choices:[{finish_reason:"stop",message:{content:JSON.stringify(source)}}]};}}};
 return {env,event,calls:()=>calls,report:()=>REPORT_DB.db.prepare('SELECT * FROM reports WHERE event_id=406885').get()};
}
test('redacts metadata-like content; entire private records excluded',()=>{
 const source=prepareSource(['非公開:社内開発','TypeScript <@123456> test@example.com https://private.example/a','TypeScript <@123456> test@example.com https://private.example/a'],[]);
 assert.deepEqual(source.plans,['TypeScript']);assert.deepEqual(source.results,[]);
 assert.equal(sanitize('api_key=secret'), '');
});
test('does not turn plans into accomplishments or accept unsafe generated text',()=>{
 const source=prepareSource(['学習'],[]);
 assert.throws(()=>validateReport({plans:['学習'],results:['完成した']},source));
 assert.throws(()=>validateReport({plans:['<script>'],results:[]},source));
 assert.throws(()=>validateReport({plans:['email@example.com'],results:[]},source));
 assert.throws(()=>validateReport({plans:[],results:[]},source));
});
test('stable hashes deduplicate repeated content, change on deletion',async()=>{
 assert.equal(await sourceHash(prepareSource(['a','b','a'],[])),await sourceHash(prepareSource(['b','a'],[])));
 assert.notEqual(await sourceHash(prepareSource(['a'],[])),await sourceHash(prepareSource([],[])));
});
test('cutoff and 30 minute delay prevent early / historical publication',()=>{
 assert.equal(eligible('2026-10-17T18:00:00+09:00',Date.parse('2026-10-17T18:29:59+09:00'),'2026-10-17','2026-10-17T13:00:00+09:00'),false);
 assert.equal(eligible('2026-10-17T18:00:00+09:00',Date.parse('2026-10-17T18:30:00+09:00'),'2026-10-17','2026-10-17T13:00:00+09:00'),true);
 assert.equal(eligible('2026-10-16T18:00:00+09:00',Date.now(),'2026-10-17','2026-10-16T13:00:00+09:00'),false);
});
test('materials require explicit label and allowed public URLs',()=>{
 assert.deepEqual(publicMaterialCandidates(['https://github.com/a/b','公開資料: https://evil.com/a','公開資料: https://github.com/a/b?token=abc','非公開 公開資料: https://github.com/a/b']),[]);
 assert.equal(publicMaterialCandidates(['公開資料: https://speakerdeck.com/a/b'])[0].url,'https://speakerdeck.com/a/b');
});
test('only event participants, all distinct checkouts, no profiles are selected',async()=>{
 const {env,event}=fixture();const source=await readSource(env.BOT_DB,event,[event]);
 assert.deepEqual(source.plans,['TypeScriptの勉強']);assert.deepEqual(source.results,['ドキュメントを読んだ','型のテストを書いた']);
});
test('ambiguous bot or connpass dates block publishing',async()=>{
 const {env,event}=fixture();await assert.rejects(()=>readSource(env.BOT_DB,event,[event,{...event,id:999}]));
 env.BOT_DB.db.exec("INSERT INTO events VALUES(24,'2026-10-17')");await assert.rejects(()=>readSource(env.BOT_DB,event,[event]));
});
test('publishes automatically once; repeat run does not call AI',async()=>{
 const {env,calls,report}=fixture();await runScheduled(env);assert.equal(report().status,'published');await runScheduled(env);assert.equal(calls(),1);
});
test('edits regenerate, private/deleted source removes old public body',async()=>{
 const {env,calls,report}=fixture();await runScheduled(env);
 env.BOT_DB.db.exec("UPDATE checkouts SET content='SQLiteの調査' WHERE id=1");await runScheduled(env);assert.equal(calls(),2);assert.match(report().body,/SQLite/);
 env.BOT_DB.db.exec("UPDATE checkins SET todo='非公開';DELETE FROM checkouts");await runScheduled(env);assert.equal(report().status,'pending');assert.equal(report().body,null);
});
test('withdrawal survives future cron and source edits',async()=>{
 const {env,calls,report}=fixture();await runScheduled(env);env.REPORT_DB.db.exec("UPDATE reports SET status='withdrawn',body=NULL");await runScheduled(env);assert.equal(calls(),1);assert.equal(report().status,'withdrawn');assert.equal(report().body,null);
});
test('AI failure hides stale content, releases lease and retries next run',async()=>{
 const f=fixture();await runScheduled(f.env);f.env.BOT_DB.db.exec("UPDATE checkins SET todo='新しい作業' WHERE id=1");const ai=f.env.AI;f.env.AI={run:async()=>{throw new Error('unavailable');}};
 await assert.rejects(()=>runScheduled(f.env));assert.equal(f.report().body,null);assert.equal(f.env.REPORT_DB.db.prepare("SELECT lease_until FROM jobs WHERE name='reports'").get().lease_until,0);
 f.env.AI=ai;await runScheduled(f.env);assert.equal(f.report().status,'published');
});
test('source changing during generation does not publish old result',async()=>{
 const f=fixture();const original=f.env.AI.run;f.env.AI.run=async(...args)=>{const value=await original(...args);f.env.BOT_DB.db.exec("UPDATE checkins SET todo='changed' WHERE id=1");return value;};
 await assert.rejects(()=>runScheduled(f.env));assert.notEqual(f.report()?.status,'published');
});
test('a second concurrent job cannot run while lease is held',async()=>{
 const f=fixture();f.env.REPORT_DB.db.prepare("INSERT INTO jobs(name,lease_until,token) VALUES('reports',?,'other')").run(Date.now()+60000);await runScheduled(f.env);assert.equal(f.calls(),0);
});
test('connpass absent key leaves events intact',async()=>{
 const f=fixture();await syncEvents(f.env,Date.now());assert.equal(f.env.REPORT_DB.db.prepare('SELECT COUNT(*) AS n FROM public_events').get().n,1);
});
test('connpass rejects a wrong group atomically',async(t)=>{
 const f=fixture();f.env.CONNPASS_API_KEY='fixture-key';const before=f.env.REPORT_DB.db.prepare('SELECT data FROM public_events').get().data;
 t.mock.method(globalThis,'fetch',async()=>Response.json({results_available:1,events:[{id:999,title:'Other group',url:'https://connpass.com/event/999/',group:{subdomain:'other'},started_at:'2026-10-17T00:00:00Z',ended_at:'2026-10-17T01:00:00Z'}]}));
 await assert.rejects(()=>syncEvents(f.env,Date.now()));assert.equal(f.env.REPORT_DB.db.prepare('SELECT data FROM public_events').get().data,before);
});
test('connpass new event becomes visible without rebuild and skips redundant polling',async(t)=>{
 const f=fixture();f.env.CONNPASS_API_KEY='fixture-key';let calls=0;
 t.mock.method(globalThis,'fetch',async()=>{calls++;return Response.json({results_available:1,events:[{id:999,title:'Next event',url:'https://mito-web-engineer.connpass.com/event/999/',group:{subdomain:'mito-web-engineer'},started_at:'2026-11-01T13:00:00+09:00',ended_at:'2026-11-01T18:00:00+09:00',place:'水戸'}]});});
 await syncEvents(f.env,Date.now());await syncEvents(f.env,Date.now());assert.equal(calls,1);assert.equal(f.env.REPORT_DB.db.prepare('SELECT COUNT(*) AS n FROM public_events').get().n,2);
});
test('an expired worker cannot hide or overwrite a newer publication',async()=>{
 const f=fixture();const original=f.env.AI.run;
 f.env.AI.run=async(...args)=>{const result=await original(...args);f.env.REPORT_DB.db.exec("UPDATE jobs SET token='newer',lease_until=9999999999999 WHERE name='reports';INSERT INTO reports(event_id,status,body,updated_at) VALUES(406885,'published','{\"plans\":[\"newer\"],\"results\":[],\"materials\":[]}',datetime('now'))");return result;};
 await assert.rejects(()=>runScheduled(f.env));assert.equal(f.report().status,'published');assert.match(f.report().body,/newer/);
});

// The actual production handler is exercised with a browser that rejects before any DOM is available.
import {scrapeConnpass} from '../worker/connpass-browser.ts';
test('browser failure keeps public data and daily attempt cannot be repeated',async()=>{
 const {env}=fixture();env.CONNPASS_BROWSER_ENABLED='true';env.BROWSER={};let calls=0;
 const launch=async()=>{calls++;throw new Error('upstream failure with secret value');};
 const before=JSON.stringify(env.REPORT_DB.db.prepare('SELECT * FROM public_events').all());
 const now=Date.parse('2026-10-22T00:15:00Z');
 await scrapeConnpass(env,now,launch);await scrapeConnpass(env,now+10000,launch);assert.equal(calls,1);
 assert.equal(JSON.stringify(env.REPORT_DB.db.prepare('SELECT * FROM public_events').all()),before);
 assert.equal(env.REPORT_DB.db.prepare("SELECT last_error FROM jobs WHERE name='connpass-browser'").get().last_error,'scrape_unavailable');
 await scrapeConnpass(env,now+86400000,launch);assert.equal(calls,2);
});
test('disabled browser sync never launches browser',async()=>{const {env}=fixture();await scrapeConnpass(env,Date.now(),async()=>{throw new Error('must not launch');});assert.equal(env.REPORT_DB.db.prepare("SELECT * FROM jobs WHERE name='connpass-browser'").get(),undefined);});
test('WAF response stops before parsing and closes the browser',async()=>{
 const {env}=fixture();env.CONNPASS_BROWSER_ENABLED='true';env.BROWSER={};let closed=false,read=false;
 const browser={async close(){closed=true;},async newPage(){return {async setJavaScriptEnabled(){},async setRequestInterception(){},on(){},async goto(){return {status:()=>202,headers:()=>({'x-amzn-waf-action':'challenge'})};},async content(){read=true;return '';}};}};
 await scrapeConnpass(env,Date.now(),async()=>browser);assert.equal(closed,true);assert.equal(read,false);
 assert.equal(env.REPORT_DB.db.prepare('SELECT COUNT(*) AS n FROM public_events').get().n,1);
});
