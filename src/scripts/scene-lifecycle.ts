/** Keep GPU resources when a document enters the browser's back/forward cache. */
export function bindSceneLifecycle(target:EventTarget, actions:{pause:()=>void;resume:()=>void;dispose:()=>void}) {
 const hide=(event:Event)=>{if((event as PageTransitionEvent).persisted)actions.pause();else actions.dispose();};
 const show=(event:Event)=>{if((event as PageTransitionEvent).persisted)actions.resume();};
 target.addEventListener('pagehide',hide);
 target.addEventListener('pageshow',show);
 return ()=>{target.removeEventListener('pagehide',hide);target.removeEventListener('pageshow',show);};
}
