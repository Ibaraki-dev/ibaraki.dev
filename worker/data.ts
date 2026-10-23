import {CONNPASS_USER_AGENT} from '../scripts/connpass-client.mjs';
import seed from '../src/data/events.json' with {type:'json'};
import {storeEventImage} from '../scripts/event-images.mjs';
import {normalizeEvent,mergeEvents} from '../scripts/events.mjs';
import {eligible,prepareSource,publicMaterialCandidates,sourceHash,summarize} from './report.ts';
export type Event = typeof seed.events[number] & {thumbnailKey?:string;thumbnailFingerprint?:string};
export async function events(db:D1Database):Promise<Event[]> {
  const rows=await db.prepare('SELECT data FROM public_events ORDER BY id DESC LIMIT 1000').all<{data:string}>();
  return mergeEvents(seed.events,rows.results.map(row=>JSON.parse(row.data)));
}
async function boundedJson(response:Response) {
  if(!response.ok || !response.body) throw new Error('connpass_response');
  const reader=response.body.getReader();const chunks:Uint8Array[]=[];let length=0;
  try {for(;;){const {value,done}=await reader.read();if(done)break;length+=value.byteLength;if(length>4_000_000)throw new Error('connpass_size');chunks.push(value);}}
  finally {await reader.cancel();}
  const data=new Uint8Array(length);let offset=0;for(const chunk of chunks){data.set(chunk,offset);offset+=chunk.length;}
  return JSON.parse(new TextDecoder().decode(data));
}
export async function syncEvents(env:Env & {CONNPASS_API_KEY?:string}, now:number) {
  if(!env.CONNPASS_API_KEY) return;
  const token=crypto.randomUUID();
  const claim=await env.REPORT_DB.prepare("INSERT INTO jobs(name,lease_until,token) VALUES('connpass',?,?) ON CONFLICT(name) DO UPDATE SET lease_until=excluded.lease_until,token=excluded.token WHERE jobs.lease_until<=? RETURNING token").bind((Math.floor(now/86400000)+1)*86400000,token,now).first();
  if(!claim)return;
  try {
  let expected:number|undefined;
  const incoming:Event[]=[];
  const known=new Map((await events(env.REPORT_DB)).map(e=>[e.id,e]));
  const images=new Map<string,Promise<{thumbnailKey?:string;thumbnailFingerprint?:string}>>();
  for(let start=1;start<=1000;start+=100){
    const url=new URL('https://connpass.com/api/v2/events/');
    for(const [k,v] of Object.entries({subdomain:'mito-web-engineer',count:'100',start:String(start),order:'2'}))url.searchParams.set(k,v);
    const response=await fetch(url,{headers:{'X-API-Key':env.CONNPASS_API_KEY,'User-Agent':CONNPASS_USER_AGENT},signal:AbortSignal.timeout(20000),redirect:'manual'});
    const body=await boundedJson(response);
    if(!Array.isArray(body.events)||!Number.isSafeInteger(body.results_available)||!body.events.length||body.results_available<1||body.results_available>1000||body.events.length>100)throw new Error('connpass_shape');
    if(expected!==undefined&&expected!==body.results_available)throw new Error('connpass_changed');
    expected=body.results_available;
    for(const raw of body.events){
      const normalized=normalizeEvent(raw),previous=known.get(raw.id);
      let image={thumbnailKey:previous?.thumbnailKey,thumbnailFingerprint:previous?.thumbnailFingerprint};
      if(raw.image_url){
        try{
          const cacheKey=String(raw.image_url)+'|'+String(raw.updated_at||'');
          if(!images.has(cacheKey))images.set(cacheKey,storeEventImage(env.EVENT_IMAGES,raw.image_url,previous,raw.updated_at||''));
          image={...image,...await images.get(cacheKey)};
        }catch{console.warn(JSON.stringify({job:'event_image',eventId:raw.id,error:'image_unavailable'}));}
      }else image={thumbnailKey:undefined,thumbnailFingerprint:undefined};
      incoming.push({...normalized,...image} as Event);
    }
    if(incoming.length===expected)break;
    if(body.events.length!==100)throw new Error('connpass_incomplete');
    await new Promise(resolve=>setTimeout(resolve,1100));
  }
  if(incoming.length!==expected||new Set(incoming.map(e=>e.id)).size!==expected)throw new Error('connpass_incomplete');
  const timestamp=new Date(now).toISOString();
  // Complete validation before the atomic replacement of received rows. Never clear known events on an API failure.
  await env.REPORT_DB.batch([...incoming.map(event=>env.REPORT_DB.prepare('INSERT INTO public_events(id,data,updated_at) VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data,updated_at=excluded.updated_at').bind(event.id,JSON.stringify(event),timestamp)),env.REPORT_DB.prepare("INSERT INTO jobs(name,last_success) VALUES('connpass',?) ON CONFLICT(name) DO UPDATE SET last_success=excluded.last_success,last_error=NULL").bind(timestamp)]);
  }catch{
    await env.REPORT_DB.prepare("UPDATE jobs SET last_error='sync_failed' WHERE name='connpass' AND token=?").bind(token).run();
    throw new Error('connpass_sync_failed');
  }
}
export async function readSource(db:D1Database,event:Event, all:Event[]) {
  const date=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Tokyo'}).format(new Date(event.startsAt));
  if(all.filter(e=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Tokyo'}).format(new Date(e.startsAt))===date).length!==1)throw new Error('ambiguous_connpass_date');
  const matches=await db.prepare('SELECT id FROM events WHERE date=? LIMIT 2').bind(date).all<{id:number}>();
  if(!matches.results.length)return null;
  if(matches.results.length!==1)throw new Error('ambiguous_bot_date');
  const id=matches.results[0].id;
  // Explicit event membership, not just a calendar-date scan. No users/profile columns are selected.
  const plans=await db.prepare('SELECT c.todo FROM checkins c JOIN events_to_checkins ec ON ec.checkin_id=c.id WHERE ec.event_id=? ORDER BY c.id LIMIT 201').bind(id).all<{todo:string}>();
  const results=await db.prepare('SELECT content FROM checkouts co WHERE co.date=? AND EXISTS (SELECT 1 FROM checkins c JOIN events_to_checkins ec ON ec.checkin_id=c.id WHERE ec.event_id=? AND c.user_id=co.user_id) ORDER BY co.id LIMIT 201').bind(date,id).all<{content:string}>();
  const source=prepareSource(plans.results.map(r=>r.todo),results.results.map(r=>r.content));
  const attendance=await db.prepare('SELECT COUNT(DISTINCT c.user_id) AS count FROM checkins c JOIN events_to_checkins ec ON ec.checkin_id=c.id WHERE ec.event_id=?').bind(id).first<{count:number}>();
  source.participantCount=attendance?.count ?? 0;
  const candidates=publicMaterialCandidates([...plans.results.map(r=>r.todo),...results.results.map(r=>r.content)]);
  for(const material of candidates){
    // Only anonymous, direct HTTPS 200 responses on the fixed host allowlist. No redirects or credentials.
    try{const response=await fetch(material.url,{redirect:'manual',signal:AbortSignal.timeout(5000)});await response.body?.cancel();if(response.status===200)source.materials.push(material);}catch{/* inaccessible links remain private */}
  }
  return source;
}
export async function runScheduled(env:Env & {CONNPASS_API_KEY?:string},now=Date.now()) {
  const token=crypto.randomUUID();
  const lease=await env.REPORT_DB.prepare("INSERT INTO jobs(name,lease_until,token) VALUES('reports',?,?) ON CONFLICT(name) DO UPDATE SET lease_until=excluded.lease_until,token=excluded.token WHERE jobs.lease_until<? RETURNING token").bind(now+14*60*1000,token,now).first<{token:string}>();
  if(lease?.token!==token)return;
  let failures=0;
  try {
    const all=await events(env.REPORT_DB);
    const targets=all.filter(event=>event.status!=='cancelled'&&eligible(event.endsAt,now,env.REPORTS_START_DATE,event.startsAt));
    if(targets.length>100)throw new Error('event_limit');
    for(const event of targets){
      try{
        const existing=await env.REPORT_DB.prepare('SELECT status,source_hash FROM reports WHERE event_id=?').bind(event.id).first<{status:string;source_hash:string}>();
        if(existing?.status==='withdrawn')continue;
        const source=await readSource(env.BOT_DB,event,all);
        const hash=source ? await sourceHash(source):null;
        if(source && hash===existing?.source_hash && existing.status==='published')continue;
        const timestamp=new Date(now).toISOString();
        // Hide stale content before regenerating, including a deletion or newly private source.
        await env.REPORT_DB.prepare("UPDATE reports SET status='pending',body=NULL,updated_at=? WHERE event_id=? AND status!='withdrawn' AND EXISTS(SELECT 1 FROM jobs WHERE name='reports' AND token=?)").bind(timestamp,event.id,token).run();
        if(!source || (!source.plans.length&&!source.results.length))continue;
        const report={...await summarize(env.AI,source),participantCount:source.participantCount};
        // Source edits during generation and expired leases must never publish stale output.
        const refreshed=await readSource(env.BOT_DB,event,all);
        if(!refreshed || await sourceHash(refreshed)!==hash)throw new Error('source_changed');
        const owned=await env.REPORT_DB.prepare("SELECT token FROM jobs WHERE name='reports' AND lease_until>?").bind(Date.now()).first<{token:string}>();
        if(owned?.token!==token)throw new Error('lease_expired');
        await env.REPORT_DB.batch([
          env.REPORT_DB.prepare('INSERT OR IGNORE INTO public_events(id,data,updated_at) VALUES(?,?,?)').bind(event.id,JSON.stringify(event),timestamp),
          env.REPORT_DB.prepare("INSERT INTO reports(event_id,status,source_hash,body,published_at,updated_at) SELECT ?,'published',?,?,?,? WHERE EXISTS(SELECT 1 FROM jobs WHERE name='reports' AND token=? AND lease_until>?) ON CONFLICT(event_id) DO UPDATE SET status='published',source_hash=excluded.source_hash,body=excluded.body,published_at=COALESCE(reports.published_at,excluded.published_at),updated_at=excluded.updated_at WHERE reports.status!='withdrawn'").bind(event.id,hash,JSON.stringify(report),timestamp,timestamp,token,Date.now())
        ]);
        console.log(JSON.stringify({job:'reports',eventId:event.id,status:'published'}));
      }catch(error){failures++;const code=error instanceof Error&&/^[a-z_]{1,60}$/.test(error.message)?error.message:'generation_failed';console.error(JSON.stringify({job:'reports',eventId:event.id,error:code}));
        // Fail closed when mapping or validation becomes ambiguous.
        await env.REPORT_DB.prepare("UPDATE reports SET status='pending',body=NULL WHERE event_id=? AND status!='withdrawn' AND EXISTS(SELECT 1 FROM jobs WHERE name='reports' AND token=?)").bind(event.id,token).run();
      }
    }
    await env.REPORT_DB.prepare("UPDATE jobs SET last_success=CASE WHEN ?=0 THEN ? ELSE last_success END,last_error=? WHERE name='reports' AND token=?").bind(failures,new Date(now).toISOString(),failures?'partial_failure':null,token).run();
  }finally{await env.REPORT_DB.prepare("UPDATE jobs SET lease_until=0 WHERE name='reports' AND token=?").bind(token).run();}
  if(failures)throw new Error('scheduled_partial_failure');
}
