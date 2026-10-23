import {CONNPASS_USER_AGENT} from './connpass-client.mjs';
// Only public connpass raster images are eligible for ingestion; never follow redirects.
export const imageKeyPattern = /^events\/[a-f0-9]{64}\.(png|jpg|webp|gif)$/;
export function imageSource(value) {
  try { const u=new URL(value); return u.protocol==='https:' && u.hostname==='media.connpass.com' && !u.username && !u.password && !u.port ? u : null; } catch { return null; }
}
export async function digest(bytes) {
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(x=>x.toString(16).padStart(2,'0')).join('');
}
export async function downloadImage(url, fetcher=fetch) {
  if(!imageSource(url))throw new Error('image_source');
  const response=await fetcher(url,{headers:{'User-Agent':CONNPASS_USER_AGENT},redirect:'manual',signal:AbortSignal.timeout(15000)});
  if(!response.ok||!response.body)throw new Error('image_response');
  const max=5*1024*1024;
  if(Number(response.headers.get('content-length'))>max){await response.body.cancel();throw new Error('image_size');}
  const reader=response.body.getReader(),chunks=[];let length=0;
  try{for(;;){const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>max)throw new Error('image_size');chunks.push(value);}}finally{await reader.cancel();}
  const bytes=new Uint8Array(length);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
  let extension,type;
  if([137,80,78,71,13,10,26,10].every((x,i)=>bytes[i]===x)){extension='png';type='image/png';}
  else if(bytes[0]===255&&bytes[1]===216&&bytes[2]===255){extension='jpg';type='image/jpeg';}
  else if(new TextDecoder().decode(bytes.slice(0,6)).match(/^GIF8[79]a$/)){extension='gif';type='image/gif';}
  else if(new TextDecoder().decode(bytes.slice(0,4))==='RIFF'&&new TextDecoder().decode(bytes.slice(8,12))==='WEBP'){extension='webp';type='image/webp';}
  else throw new Error('image_format');
  return {bytes,type,key:`events/${await digest(bytes)}.${extension}`};
}
export async function storeEventImage(bucket, url, previous={}, version='', fetcher=fetch) {
  const source=imageSource(url);if(!source)return {};
  const fingerprint=await digest(new TextEncoder().encode(source.origin+source.pathname+'|'+version));
  if(previous.thumbnailFingerprint===fingerprint&&imageKeyPattern.test(previous.thumbnailKey||'')&&await bucket.head(previous.thumbnailKey))return {thumbnailKey:previous.thumbnailKey,thumbnailFingerprint:fingerprint};
  const image=await downloadImage(url,fetcher);
  if(!await bucket.head(image.key))await bucket.put(image.key,image.bytes,{httpMetadata:{contentType:image.type,cacheControl:'public, max-age=31536000, immutable'}});
  return {thumbnailKey:image.key,thumbnailFingerprint:fingerprint};
}
