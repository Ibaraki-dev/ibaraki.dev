import test from 'node:test';
import assert from 'node:assert/strict';
import {bindSceneLifecycle} from '../src/scripts/scene-lifecycle.ts';
function transition(target,type,persisted){const e=new Event(type);Object.defineProperty(e,'persisted',{value:persisted});target.dispatchEvent(e);}
test('back/forward cache keeps the scene alive and resumes on repeated returns',()=>{
 const target=new EventTarget(),calls=[];
 bindSceneLifecycle(target,{pause:()=>calls.push('pause'),resume:()=>calls.push('resume'),dispose:()=>calls.push('dispose')});
 transition(target,'pageshow',false);
 for(let i=0;i<3;i++){transition(target,'pagehide',true);transition(target,'pageshow',true);}
 assert.deepEqual(calls,['pause','resume','pause','resume','pause','resume']);
});
test('real unload disposes and removed listeners cannot restart the scene',()=>{
 const target=new EventTarget(),calls=[];
 const unbind=bindSceneLifecycle(target,{pause:()=>calls.push('pause'),resume:()=>calls.push('resume'),dispose:()=>calls.push('dispose')});
 transition(target,'pagehide',false);unbind();transition(target,'pageshow',true);transition(target,'pagehide',true);
 assert.deepEqual(calls,['dispose']);
});
