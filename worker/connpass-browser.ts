import puppeteer from '@cloudflare/puppeteer';
import {parseList,parseDetail,scopedUrl,origin,complete} from '../scripts/connpass-html.mjs';
import {storeEventImage} from '../scripts/event-images.mjs';
import {events} from './data.ts';

// One attempt per UTC calendar day, including failures. No public HTTP trigger.
export async function scrapeConnpass(env:Env,now=Date.now(),launch=puppeteer.launch){
  if(String(env.CONNPASS_BROWSER_ENABLED)!=='true')return;
  const token=crypto.randomUUID();
  const claim=await env.REPORT_DB.prepare(`INSERT INTO jobs(name,lease_until,token) VALUES('connpass-browser',?,?) ON CONFLICT(name) DO UPDATE SET lease_until=excluded.lease_until,token=excluded.token WHERE jobs.lease_until<=? RETURNING token`).bind((Math.floor(now/86400000)+1)*86400000,token,now).first();
  if(!claim)return;
  let browser;
  try{
    browser=await launch(env.BROWSER);
    const page=await browser.newPage();
    await page.setJavaScriptEnabled(false);
    await page.setRequestInterception(true);
    page.on('request',request=>{
      // Only the expected top-level public document is needed; no analytics or subresources.
      try{scopedUrl(request.url());if(request.isNavigationRequest()&&request.frame()===page.mainFrame())void request.continue();else void request.abort();}catch{void request.abort();}
    });
    let visited=0;
    async function read(url:string){
      if(++visited>220||Date.now()-now>600000)throw new Error('budget');
      await new Promise(r=>setTimeout(r,2000));
      const response=await page.goto(scopedUrl(url),{waitUntil:'domcontentloaded',timeout:30000});
      if(response?.status()!==200||response.headers()['x-amzn-waf-action']||page.url()!==scopedUrl(url))throw new Error('unavailable');
      const html=await page.content();
      if(html.length>4000000)throw new Error('size');
      return html;
    }
    const incoming:any[]=[];const seen=new Set<string>();let url:string|null=origin+'/event/';let total:number|undefined;
    while(url){
      if(seen.has(url)||seen.size>=20)throw new Error('pagination');seen.add(url);
      const result=parseList(await read(url));
      if(total!==undefined&&total!==result.total)throw new Error('changed');total=result.total;
      incoming.push(...result.events);url=result.next;
    }
    complete(incoming,total);
    // Validate all pages before publishing any changes to D1.
    for(const event of incoming)Object.assign(event,parseDetail(await read(event.url)));
    const known=new Map((await events(env.REPORT_DB)).map(e=>[e.id,e]));
    const images=new Map<string,any>();
    for(const event of incoming){
      const previous=known.get(event.id);
      if(!images.has(event.imageUrl))images.set(event.imageUrl,await storeEventImage(env.EVENT_IMAGES,event.imageUrl,previous));
      Object.assign(event,images.get(event.imageUrl));delete event.imageUrl;
    }
    const stamp=new Date().toISOString();
    await env.REPORT_DB.batch([
      ...incoming.map(event=>env.REPORT_DB.prepare('INSERT INTO public_events(id,data,updated_at) VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data,updated_at=excluded.updated_at').bind(event.id,JSON.stringify(event),stamp)),
      env.REPORT_DB.prepare("UPDATE jobs SET last_success=?,last_error=NULL WHERE name='connpass-browser' AND token=?").bind(stamp,token)
    ]);
    console.log(JSON.stringify({job:'connpass-browser',count:incoming.length,status:'ok'}));
  }catch{
    await env.REPORT_DB.prepare("UPDATE jobs SET last_error='scrape_unavailable' WHERE name='connpass-browser' AND token=?").bind(token).run();
    console.error(JSON.stringify({job:'connpass-browser',error:'scrape_unavailable'}));
  }finally{await browser?.close();}
}
