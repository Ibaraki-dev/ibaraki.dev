import assert from 'node:assert/strict';
const origin=process.argv[2]||'http://localhost:8787';
const canonical='https://ibaraki-dev-website.ba068082.workers.dev';
for(const path of ['/','/events/','/reports/','/privacy/']){
 const response=await fetch(origin+path);assert.equal(response.status,200,path);const html=await response.text();assert.ok(html.includes('<html lang="ja"'),path);assert.ok(html.includes(`href="${canonical+path}"`),path);
}
const events=await(await fetch(origin+'/api/events')).json();assert.ok(events.events.length>=9);assert.ok(Array.isArray(events.reportEventIds));
const sitemap=await(await fetch(origin+'/sitemap.xml')).text();assert.ok(sitemap.includes(canonical+'/reports/'));
for(const id of events.reportEventIds){
 const response=await fetch(`${origin}/reports/${id}/`,{headers:{'If-None-Match':'"stale-asset"'}});assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store');const html=await response.text();
 assert.match(html,/<h2>やったこと<\/h2>|やったことの記録は、まだありません/);assert.ok(html.includes(`href="${canonical}/reports/${id}/"`));assert.ok(sitemap.includes(`/reports/${id}/`));
}
const missing=await fetch(origin+'/reports/999999999/');assert.equal(missing.status,404);assert.match(await missing.text(),/ページ|見つかり/);
const nonget=await fetch(origin+'/reports/',{method:'POST'});assert.equal(nonget.status,405);
console.log(`Worker HTTP checks passed: pages, metadata, ${events.events.length} events, ${events.reportEventIds.length} reports, sitemap, 404, method restrictions`);
