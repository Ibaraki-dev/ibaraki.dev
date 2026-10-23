import {syncEvents} from './data';
import {renderEventCard} from '../scripts/event-card.mjs';
import {imageKeyPattern} from '../scripts/event-images.mjs';
import {events,runScheduled,type Event} from './data.ts';
import {escapeHtml as h,type Report} from './report.ts';
import {selectFeatured} from '../scripts/events.mjs';
const routes=['/','/events/','/reports/','/organizers/','/guidelines/','/anti-harassment/','/privacy/'];
const date=(value:string)=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Tokyo'}).format(new Date(value));
const time=(value:string)=>new Intl.DateTimeFormat('ja-JP',{timeZone:'Asia/Tokyo',hour:'2-digit',minute:'2-digit'}).format(new Date(value));
const icon=(paths:string)=>`<svg class="icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
const arrow=icon('<path d="M7 17 17 7M7 7h10v10"/>');
const clock=icon('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>');
const pin=icon('<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>');
type Published={event_id:number;body:string;published_at:string;updated_at:string};
const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin','X-Frame-Options':'DENY','Permissions-Policy':'camera=(), microphone=(), geolocation=()'};
function featured(event:Event){const ended=Date.now()>=Date.parse(event.endsAt);const today=date(event.startsAt)===date(new Date().toISOString());return `<section class="featured wrap" id="next" data-event-start="${h(event.startsAt)}" data-event-end="${h(event.endsAt)}"><div class="date-block"><p id="event-status">${ended?'直近の開催':today?'本日の開催':'次回の開催'}</p><div><time datetime="${h(event.startsAt)}">${date(event.startsAt).slice(5).replace('-','.')}</time><span>${new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Tokyo',weekday:'short'}).format(new Date(event.startsAt)).toUpperCase()}</span></div></div><div class="event-info"><h2><span>#${h(event.number)}</span> ${h(event.title.replace(/^ibaraki\.dev\s*#[^\s]+\s*/i,''))}</h2><p class="event-meta"><span>${clock}${time(event.startsAt)}–${time(event.endsAt)}</span><span>${pin}${h(event.place)}</span></p></div><a class="button" id="event-link" href="${h(event.url)}"><span>${ended?'開催ページを見る':'connpass で参加'}</span>${arrow}</a></section>`;}
function detail(event:Event,published:Published){const body:Report=JSON.parse(published.body);const list=(items:string[])=>`<ul class="report-items">${items.map(item=>`<li>${h(item)}</li>`).join('')}</ul>`;return `<article class="report-detail"><p class="breadcrumbs"><a href="/reports/">開催レポート</a> / #${h(event.number)}</p><p class="eyebrow">MEETUP NOTES · ${date(event.startsAt).replaceAll('-','.')}</p><h1>${h(event.title)}</h1><p class="report-venue">${h(event.place)}</p>${body.results.length?`<section><h2>やったこと</h2>${list(body.results)}</section>`:'<p class="report-empty">やったことの記録は、まだありません。</p>'}${body.plans.length?`<section><h2>やること</h2>${list(body.plans)}</section>`:''}${body.materials.length?`<section><h2>公開資料</h2><ul class="report-items">${body.materials.map(m=>`<li><a href="${h(m.url)}" rel="noopener noreferrer">${h(m.title)} ${arrow}</a></li>`).join('')}</ul></section>`:''}<div class="report-footnote"><p>参加者の「やること・やったこと」をもとに自動で要約しています。</p><p>更新：<time datetime="${h(published.updated_at)}">${date(published.updated_at)} ${time(published.updated_at)}</time> · <a href="/privacy/#corrections">訂正・削除のご相談</a></p></div><a class="text-link" href="${h(event.url)}">connpass の開催ページ ${arrow}</a></article>`;}
async function render(request:Request,env:Env):Promise<Response>{
  const url=new URL(request.url);const path=url.pathname;
  if(request.method!=='GET'&&request.method!=='HEAD')return new Response('Method not allowed',{status:405,headers:{...headers,Allow:'GET, HEAD'}});
  if(path.startsWith('/media/events/')){
    const key=path.slice('/media/'.length);
    if(!imageKeyPattern.test(key))return new Response('Not found',{status:404,headers});
    const object=await env.EVENT_IMAGES.get(key);
    if(!object)return new Response('Not found',{status:404,headers});
    const imageHeaders=new Headers({'Content-Type':object.httpMetadata?.contentType||'application/octet-stream','Cache-Control':'public, max-age=31536000, immutable','ETag':object.httpEtag,'X-Content-Type-Options':'nosniff'});
    if(request.headers.get('if-none-match')===object.httpEtag)return new Response(null,{status:304,headers:imageHeaders});
    return new Response(request.method==='HEAD'?null:object.body,{headers:imageHeaders});
  }
  if(['/reports','/events'].includes(path)||/^\/reports\/\d+$/.test(path)){url.pathname+='/';return Response.redirect(url.href,308);}
  if(!['/','/events/','/reports/','/sitemap.xml','/api/events'].includes(path)&&!path.startsWith('/reports/'))return env.ASSETS.fetch(request);
  const all=await events(env.REPORT_DB);
  const published=(await env.REPORT_DB.prepare("SELECT event_id,body,published_at,updated_at FROM reports WHERE status='published' ORDER BY event_id DESC LIMIT 1000").all<Published>()).results;
  const ids=new Set(published.map(r=>r.event_id));
  if(path==='/api/events')return Response.json({events:all,reportEventIds:[...ids]},{headers});
  if(path==='/sitemap.xml'){
    const urls=[...routes,...published.map(r=>`/reports/${r.event_id}/`)];
    return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map(p=>`<url><loc>${h(new URL(p,env.SITE_URL).href)}</loc></url>`).join('')}</urlset>`,{headers:{...headers,'Content-Type':'application/xml'}});
  }
  let title='開催レポート | ibaraki.dev';let description='ibaraki.dev の開催レポート。もくもく会で取り組んだことと公開資料を紹介します。';
  const rewriter=new HTMLRewriter();
  let shell=path;
  if(path.startsWith('/reports/')){
    shell='/reports/';
    let content='';
    if(path==='/reports/'){
      const reported=all.filter(e=>ids.has(e.id));
      content=`<div class="page-intro"><p class="eyebrow">MEETUP NOTES</p><h1>開催レポート</h1></div>${reported.length?`<div class="report-list">${reported.map(e=>`<a class="report-card" href="/reports/${e.id}/"><time datetime="${h(e.startsAt)}">${date(e.startsAt).replaceAll('-','.')}</time><h2>${h(e.title)}</h2><span class="report-card-link">レポートを読む →</span></a>`).join('')}</div>`:'<div class="report-empty"><p>開催レポートは、会の終了後に掲載します。</p><a class="text-link" href="/events/">開催情報を見る →</a></div>'}`;
    }else{
      const id=path.match(/^\/reports\/([1-9]\d*)\/$/)?.[1];
      const event=all.find(e=>e.id===Number(id));const report=published.find(r=>r.event_id===Number(id));
      if(!event||!report){const response=await env.ASSETS.fetch(new Request(new URL('/__report-not-found/',url),request));return new Response(response.body,{status:404,headers:{...headers,'Content-Type':'text/html; charset=utf-8','X-Robots-Tag':'noindex'}});}
      content=detail(event,report);title=`${event.title} 開催レポート | ibaraki.dev`;description=`${date(event.startsAt)} に開催した ${event.title} の活動記録。取り組んだことと公開資料を紹介します。`;
    }
    rewriter.on('#reports-content',{element(e){e.setInnerContent(content,{html:true});}})
      .on('title',{element(e){e.setInnerContent(title);}})
      .on('meta[name="description"],meta[property="og:description"],meta[name="twitter:description"]',{element(e){e.setAttribute('content',description);}})
      .on('meta[property="og:title"],meta[name="twitter:title"]',{element(e){e.setAttribute('content',title);}})
      .on('link[rel="canonical"]',{element(e){e.setAttribute('href',new URL(path,env.SITE_URL).href);}})
      .on('meta[property="og:url"]',{element(e){e.setAttribute('content',new URL(path,env.SITE_URL).href);}});
  } else if(path==='/events/'){
    rewriter.on('#event-list',{element(e){e.setInnerContent(all.map(event=>renderEventCard(event,ids.has(event.id))).join(''),{html:true});}})
      .on('#result-count',{element(e){e.setInnerContent(`${all.length}件の開催情報`);}})
      .on('#year',{element(e){e.setInnerContent('<option value="all">すべての年</option>'+[...new Set(all.map(event=>date(event.startsAt).slice(0,4)))].map(y=>`<option value="${y}">${y}年</option>`).join(''),{html:true});}});
  } else if(path==='/'){
    const event=selectFeatured(all) as Event;
    rewriter.on('#next',{element(e){e.replace(featured(event),{html:true});}})
      .on('.recent-list',{element(e){e.setInnerContent(all.filter(item=>item.status!=='cancelled'&&item.id!==event.id&&Date.parse(item.endsAt)<Date.now()).slice(0,3).map(item=>`<a href="${ids.has(item.id)?`/reports/${item.id}/`:h(item.url)}"><span>${h(item.title)}</span><time datetime="${h(item.startsAt)}">${date(item.startsAt).replaceAll('-','.')}</time>${ids.has(item.id)?'→':arrow}</a>`).join(''),{html:true});}});
  }
  const assetHeaders=new Headers(request.headers);
  for(const key of ['if-none-match','if-modified-since','range'])assetHeaders.delete(key);
  const response=await env.ASSETS.fetch(new Request(new URL(shell,url),{method:request.method,headers:assetHeaders}));
  const outputHeaders=new Headers(response.headers);
  for(const key of ['etag','last-modified','content-length'])outputHeaders.delete(key);
  for(const [key,value] of Object.entries(headers))outputHeaders.set(key,value);
  return rewriter.transform(new Response(response.body,{status:response.status,headers:outputHeaders}));
}
export default {
  async fetch(request,env){
    try{return await render(request,env);}catch{console.error(JSON.stringify({job:'render',error:'data_unavailable'}));return new Response('ただいま読み込めません。少し待ってから再度お試しください。',{status:503,headers:{...headers,'Content-Type':'text/plain; charset=utf-8','Retry-After':'60'}});}
  },
  async scheduled(controller,env){if(controller.cron==='15 0 * * *')await syncEvents(env,Date.now());else await runScheduled(env);}
} satisfies ExportedHandler<Env & {CONNPASS_API_KEY?:string}>;
