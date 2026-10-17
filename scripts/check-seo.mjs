import {readFileSync,existsSync} from 'node:fs';
import assert from 'node:assert/strict';
const origin=(process.env.SITE_URL || 'https://ibaraki-dev-website.ba068082.workers.dev').replace(/\/$/,'');
const paths=['/','/events/','/organizers/','/guidelines/','/anti-harassment/','/privacy/'];
const descriptions=new Set();
for(const path of paths){
 const html=readFileSync(`dist${path}index.html`,'utf8');
 const meta=key=>html.match(new RegExp(`<meta (?:name|property)="${key}" content="([^"]*)"`))?.[1];
 assert.equal(meta('og:url'),origin+path);
 assert.ok(html.includes(`<link rel="canonical" href="${origin+path}"`));
 assert.equal(meta('twitter:card'),'summary_large_image');
 assert.equal(meta('og:image'),`${origin}/og/ibaraki-dev-v1.png`);
 assert.equal(meta('twitter:image'),meta('og:image'));
 assert.equal(meta('og:image:width'),'1200');assert.equal(meta('og:image:height'),'630');
 assert.ok(meta('og:image:alt'));assert.ok(meta('description'));descriptions.add(meta('description'));
 assert.ok(!meta('robots').includes('noindex'));
}
assert.equal(descriptions.size,paths.length,'Each page needs a distinct description');
const home=readFileSync('dist/index.html','utf8');
const schema=JSON.parse(home.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
assert.deepEqual(schema['@graph'].map(x=>x['@type']),['WebSite','Organization']);
assert.ok(readFileSync('dist/404.html','utf8').includes('noindex, follow'));
assert.ok(!existsSync('dist/og-preview'),'Artwork source must not be published');
const png=readFileSync('dist/og/ibaraki-dev-v1.png');
assert.equal(png.subarray(1,4).toString(),'PNG');assert.equal(png.readUInt32BE(16),1200);assert.equal(png.readUInt32BE(20),630);assert.ok(png.length<5_000_000);
const sitemap=readFileSync('dist/sitemap.xml','utf8');for(const path of paths)assert.ok(sitemap.includes(`<loc>${origin+path}</loc>`));
assert.ok(readFileSync('dist/robots.txt','utf8').includes(`Sitemap: ${origin}/sitemap.xml`));
console.log(`SEO checks passed: ${paths.length} pages, JSON-LD, sitemap, 404, PNG 1200×630 (${Math.round(png.length/1024)} KB)`);
