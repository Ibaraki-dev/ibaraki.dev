import {load} from 'cheerio';
import {normalizeEvent,SUBDOMAIN} from './events.mjs';
export const origin=`https://${SUBDOMAIN}.connpass.com`;
export function scopedUrl(value){
  const u=new URL(value,origin+'/event/');
  if(u.origin!==origin||u.username||u.password||u.hash||!/^\/event\/(?:[1-9]\d*\/)?$/.test(u.pathname)|| (u.search&&!/^\?page=[1-9]\d*$/.test(u.search)))throw new Error('scope');
  return u.href;
}
const clean=s=>s.replace(/\s+/g,' ').trim();
export function parseList(html){
  const $=load(html), heading=$('h3.title').text().match(/イベント[（(]([\d,]+)件/);
  if(!heading)throw new Error('layout');
  const total=Number(heading[1].replaceAll(',',''));
  if(total<1||total>200)throw new Error('count');
  const events=$('.group_event_list').toArray().map(el=>{
    const row=$(el),url=scopedUrl(row.find('.event_title a').attr('href'));
    const id=Number(new URL(url).pathname.match(/^\/event\/(\d+)\/$/)?.[1]);
    const amount=clean(row.find('.event_participants .amount').text()).match(/^(\d+)(?:\s*\/\s*(\d+))?$/);
    if(!amount)throw new Error('attendance');
    const status=clean(row.find('.label_status_event').text());
    if(!['開催前','終了','中止'].includes(status))throw new Error('status');
    return {...normalizeEvent({id,url,title:clean(row.find('.event_title a').text()),group:{subdomain:SUBDOMAIN},started_at:row.find('.dtstart .value-title').attr('title'),ended_at:row.find('.dtend .value-title').attr('title'),accepted:Number(amount[1]),waiting:0,limit:Number(amount[2]||0),open_status:status==='中止'?'cancelled':'open'}),address:clean(row.find('.event_place').text()),imageUrl:row.find('.thumb_area img').attr('src')};
  });
  if(!events.length||events.length>10)throw new Error('layout');
  const next=$('a').toArray().find(a=>clean($(a).text()).startsWith('次へ'));
  return {total,events,next:next?scopedUrl($(next).attr('href')):null};
}
export function parseDetail(html){
  const $=load(html),imageUrl=$('img.thumbnail').attr('src'),place=clean($('.place_name').first().text());
  if(!imageUrl||!place)throw new Error('detail_layout');
  return {imageUrl,place};
}
export function complete(events,total){
  if(events.length!==total||new Set(events.map(e=>e.id)).size!==total)throw new Error('incomplete');
}
