export const SUBDOMAIN = 'mito-web-engineer';
export function normalizeEvent(e) {
  if (!Number.isSafeInteger(e.id) || e.id < 1 || typeof e.title !== 'string' || !e.title.trim()) throw new Error('Invalid event identity');
  const url = new URL(e.url);
  if (url.username || url.password || url.port || url.protocol !== 'https:' || ![`${SUBDOMAIN}.connpass.com`, 'connpass.com'].includes(url.hostname) || !url.pathname.startsWith(`/event/${e.id}/`)) throw new Error('Invalid event URL');
  if (e.group?.subdomain !== SUBDOMAIN) throw new Error('Unexpected connpass group');
  if (!Number.isFinite(Date.parse(e.started_at)) || !Number.isFinite(Date.parse(e.ended_at)) || Date.parse(e.ended_at) <= Date.parse(e.started_at)) throw new Error('Invalid event dates');
  return { id:e.id, title:e.title, number:e.title.match(/#([^\s]+)/)?.[1] || String(e.id), startsAt:e.started_at, endsAt:e.ended_at, url:e.url, place:e.place || '開催ページをご確認ください', address:typeof e.address==='string'?e.address:'', tags:['もくもく会'], summary:'開催案内・公開資料は connpass をご覧ください。', registrationCount: Number.isSafeInteger(e.accepted)&&e.accepted>=0&&Number.isSafeInteger(e.waiting)&&e.waiting>=0 ? e.accepted+e.waiting : null, capacity: Number.isSafeInteger(e.limit)&&e.limit>0 ? e.limit : null, attendanceCheckedAt:new Date().toISOString(), status: e.open_status==='cancelled'?'cancelled':'scheduled' };
}
export function mergeEvents(existing, incoming) {
  const merged=new Map(existing.map(e=>[e.id,e]));
  for (const e of incoming) merged.set(e.id,{...merged.get(e.id),...e});
  return [...merged.values()].sort((a,b)=>Date.parse(b.startsAt)-Date.parse(a.startsAt));
}
export function selectFeatured(events, now=Date.now()) {
  const active=events.filter(e=>e.status!=='cancelled');
  const upcoming=active.filter(e=>Date.parse(e.endsAt)>now).sort((a,b)=>Date.parse(a.startsAt)-Date.parse(b.startsAt));
  return upcoming[0] || [...active].sort((a,b)=>Date.parse(b.startsAt)-Date.parse(a.startsAt))[0];
}
