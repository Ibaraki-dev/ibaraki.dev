import {readFile,writeFile,rename} from 'node:fs/promises';
import {setTimeout as sleep} from 'node:timers/promises';
import {normalizeEvent,mergeEvents,SUBDOMAIN} from './events.mjs';
const key=process.env.CONNPASS_API_KEY;
if(!key) throw new Error('CONNPASS_API_KEY is required. Apply at https://help.connpass.com/api/');
const file=new URL('../src/data/events.json',import.meta.url);
const current=JSON.parse(await readFile(file,'utf8'));
let collected=[];let start=1;let total=Infinity;
while(start<=total){
 if(start>1)await sleep(1100);
 const url=new URL('https://connpass.com/api/v2/events/');
 url.search=new URLSearchParams({subdomain:SUBDOMAIN,count:'100',start:String(start),order:'2'}).toString();
 let response;
 for(let attempt=0;attempt<3;attempt++){
  response=await fetch(url,{headers:{'X-API-Key':key},signal:AbortSignal.timeout(20000)});
  if(response.status!==429&&response.status<500)break;
  if(attempt<2)await sleep(Math.min(30000,Math.max(2000,Number(response.headers.get('Retry-After')||2)*1000)));
 }
 if(!response.ok)throw new Error(`connpass HTTP ${response.status}; previous data retained`);
 const body=await response.json();
 if(!Array.isArray(body.events)||!Number.isSafeInteger(body.results_available)||body.results_available<0)throw new Error('Invalid API response; previous data retained');
 total=body.results_available;
 if(total===0||body.events.length===0)throw new Error('Unexpected empty result; previous data retained');
 collected.push(...body.events.map(normalizeEvent));start+=body.events.length;
 if(start>10001)throw new Error('Pagination safety limit reached; previous data retained');
}
const events=mergeEvents(current.events,collected);
const next={updatedAt:new Date().toISOString(),source:'connpass API v2（公開イベント情報）',events};
const tmp=new URL('../src/data/events.json.tmp',import.meta.url);
await writeFile(tmp,JSON.stringify(next,null,2)+'\n');await rename(tmp,file);
console.log(`Validated ${collected.length} events; saved ${events.length} total. No private attendee data stored.`);
