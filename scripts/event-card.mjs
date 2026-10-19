import {imageKeyPattern} from './event-images.mjs';
const h=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const icon=paths=>`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
const pin=icon('<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>');
const users=icon('<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m20 0v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/><circle cx="9" cy="7" r="4"/>');
const clock=icon('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>');
const arrow=icon('<path d="M7 17 17 7M7 7h10v10"/>');
const day=v=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Tokyo'}).format(new Date(v));
const time=v=>new Intl.DateTimeFormat('ja-JP',{timeZone:'Asia/Tokyo',hour:'2-digit',minute:'2-digit'}).format(new Date(v));
export function renderEventCard(e,reported=false,now=Date.now()){
  const date=day(e.startsAt),cancelled=e.status==='cancelled',upcoming=!cancelled&&Date.parse(e.endsAt)>now;
  const status=cancelled?'中止':upcoming?'開催予定':'終了';
  const image=imageKeyPattern.test(e.thumbnailKey||'')?`/media/${e.thumbnailKey}`:'/logo.svg';
  const count=Number.isSafeInteger(e.registrationCount)&&e.registrationCount>=0?`<strong>${e.registrationCount}</strong>${Number.isSafeInteger(e.capacity)&&e.capacity>0?`<span> / ${e.capacity}</span>`:''}<span>人</span>`:'<span>connpassで確認</span>';
  const checked=Number.isFinite(Date.parse(e.attendanceCheckedAt))?`<time datetime="${h(e.attendanceCheckedAt)}">${day(e.attendanceCheckedAt).replaceAll('-','.')} 確認</time>`:'';
  return `<article class="event-card${upcoming?' is-upcoming':''}" data-year="${date.slice(0,4)}" data-search="${h(`${e.title} ${e.place} ${e.address||''} ${e.tags.join(' ')}`)}"><a class="event-card-image" href="${h(e.url)}" tabindex="-1" aria-hidden="true"><img data-event-thumbnail src="${h(image)}" alt="" width="162" height="110" loading="lazy" decoding="async"/></a><div class="event-card-body"><div class="event-card-top"><time datetime="${h(e.startsAt)}">${date.replaceAll('-','.')} <span>${new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Tokyo',weekday:'short'}).format(new Date(e.startsAt)).toUpperCase()}</span></time><span class="event-card-status${cancelled?' is-cancelled':''}">${status}</span></div><h2><a href="${h(e.url)}">${h(e.title)}</a></h2><p class="event-card-meta">${clock}<span>${time(e.startsAt)}–${time(e.endsAt)}</span></p><p class="event-card-meta">${pin}<span>${h(e.place)}</span></p></div><div class="event-card-footer"><div class="event-card-attendance"><div>${users}<span class="attendance-label">申込</span> ${count}</div><small>${checked}</small></div><div class="event-card-actions">${reported?`<a href="/reports/${e.id}/">開催レポート →</a>`:''}<a href="${h(e.url)}" aria-label="${h(e.title)}のconnpassページ">connpass ${arrow}</a></div></div></article>`;
}
