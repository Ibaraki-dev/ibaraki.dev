import {test} from 'node:test';
import assert from 'node:assert/strict';
import {downloadImage,imageSource,storeEventImage,imageKeyPattern} from '../scripts/event-images.mjs';
import {renderEventCard} from '../scripts/event-card.mjs';
const png=new Uint8Array([137,80,78,71,13,10,26,10,0]);
const url='https://media.connpass.com/thumbs/test.png';
test('image ingestion restricts origins and rejects active content',async()=>{
 for(const value of ['http://media.connpass.com/a','https://media.connpass.com.evil.test/a','https://user:pass@media.connpass.com/a','https://127.0.0.1/a'])assert.equal(imageSource(value),null);
 await assert.rejects(downloadImage(url,async()=>new Response('<svg onload="alert(1)"/>')),/image_format/);
 await assert.rejects(downloadImage(url,async()=>new Response('x',{headers:{'content-length':'6000000'}})),/image_size/);
 let redirected;await downloadImage(url,async(_,options)=>{redirected=options.redirect;return new Response(png);});assert.equal(redirected,'manual');
});
test('images are content addressed, deduplicated, and reused until source changes',async()=>{
 const objects=new Map();let downloads=0,puts=0;
 const bucket={head:async k=>objects.get(k),put:async(k,v)=>{objects.set(k,v);puts++;}};
 const fetcher=async()=>{downloads++;return new Response(png);};
 const first=await storeEventImage(bucket,url,{},'v1',fetcher);assert.ok(imageKeyPattern.test(first.thumbnailKey));
 assert.deepEqual(await storeEventImage(bucket,url+'?expires=new',first,'v1',fetcher),first);assert.equal(downloads,1);
 await storeEventImage(bucket,url,first,'v2',fetcher);assert.equal(downloads,2);assert.equal(puts,1);
});
test('cards escape source text, keep unknown counts distinct from zero, and display cancellations',()=>{
 const e={id:1,title:'A <script>',url:'https://connpass.com/event/1/',place:'Room "A"',startsAt:'2026-11-28T04:10:00Z',endsAt:'2026-11-28T09:00:00Z',tags:[],registrationCount:null,capacity:null,status:'cancelled',thumbnailKey:'../../secret'};
 let html=renderEventCard(e);assert.ok(!html.includes('<script>'));assert.match(html,/A &lt;script&gt;/);assert.match(html,/src="\/logo.svg"/);assert.match(html,/中止/);assert.match(html,/connpassで確認/);
 html=renderEventCard({...e,registrationCount:0,capacity:12});assert.match(html,/<strong>0<\/strong>/);assert.match(html,/13:10–18:00/);
});
test('redirect responses are rejected without following another host',async()=>{
 await assert.rejects(()=>downloadImage('https://media.connpass.com/test.png',async(_url,options)=>{assert.equal(options.redirect,'manual');return new Response(null,{status:302,headers:{Location:'https://example.com/private'}});}),/image_response/);
});
