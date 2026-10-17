import logo from '../../public/logo.svg?raw';
const host=document.querySelector<HTMLElement>('.logo-scene');
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
if(host&&!reduced.matches) void init(host);
else window.dispatchEvent(new Event('logo-ready'));
async function init(host:HTMLElement){
try{
const THREE=await import('three');
const {SVGLoader}=await import('three/addons/loaders/SVGLoader.js');
const {Reflector}=await import('three/addons/objects/Reflector.js');
const [{EffectComposer},{RenderPass},{UnrealBloomPass},{OutputPass}]=await Promise.all([
 import('three/addons/postprocessing/EffectComposer.js'),import('three/addons/postprocessing/RenderPass.js'),import('three/addons/postprocessing/UnrealBloomPass.js'),import('three/addons/postprocessing/OutputPass.js')]);

if(reduced.matches){window.dispatchEvent(new Event('logo-ready'));return;}
const canvas=host.querySelector('canvas')!;
const renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,preserveDrawingBuffer:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));renderer.setClearColor(0,0);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.NoToneMapping;renderer.toneMappingExposure=1;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.VSMShadowMap;
const scene=new THREE.Scene();scene.background=new THREE.Color('#fdfdfc');const camera=new THREE.PerspectiveCamera(34,1,.1,100);camera.position.set(0,1.2,10.2);camera.lookAt(0,-.45,0);
const compositeTarget=new THREE.WebGLRenderTarget(1,1,{type:THREE.HalfFloatType,samples:4});
const composer=new EffectComposer(renderer,compositeTarget);
composer.addPass(new RenderPass(scene,camera));
const bloom=new UnrealBloomPass(new THREE.Vector2(512,512),.18,.35,1.1);composer.addPass(bloom);composer.addPass(new OutputPass());
const pmrem=new THREE.PMREMGenerator(renderer);
const studio=new THREE.Scene();studio.background=new THREE.Color('#252d3c');
const panels:InstanceType<typeof THREE.Mesh>[]=[];
function panel(width:number,height:number,x:number,y:number,z:number,intensity:number){const m=new THREE.Mesh(new THREE.PlaneGeometry(width,height),new THREE.MeshBasicMaterial({color:new THREE.Color(intensity,intensity,intensity),side:THREE.DoubleSide}));m.position.set(x,y,z);m.lookAt(0,0,0);studio.add(m);panels.push(m);}
panel(.16,8,-4,3,5,9);panel(.35,8,-3,.5,6,9);panel(.5,9,-4.7,-1,6,7);panel(.45,7,1,4,6,2);panel(7,.45,0,5,3,8);panel(.7,7,5,1,1,9);panel(6,4,0,-5,0,.7);panel(7,.2,0,5,-2,4);panel(.4,8,3,1,-5,2);
const env=pmrem.fromScene(studio,.025);scene.environment=env.texture;for(const p of panels){p.geometry.dispose();(p.material as InstanceType<typeof THREE.Material>).dispose();}pmrem.dispose();
scene.add(new THREE.HemisphereLight(0xffffff,0x9babc9,.12));
const light=new THREE.DirectionalLight(0xffffff,3);light.position.set(-3,7,5);light.castShadow=true;light.shadow.mapSize.set(1024,1024);Object.assign(light.shadow.camera,{left:-5,right:5,top:5,bottom:-5,near:.1,far:25});light.shadow.bias=-.0005;light.shadow.normalBias=.025;light.shadow.radius=8;light.shadow.blurSamples=16;scene.add(light);
const rim=new THREE.DirectionalLight(0xe4efff,2);rim.position.set(4,2,-3);scene.add(rim);
const floorGeometry=new THREE.PlaneGeometry(200,200);const floorMaterial=new THREE.ShadowMaterial({color:0x59616b,opacity:.12});const floor=new THREE.Mesh(floorGeometry,floorMaterial);floor.rotation.x=-Math.PI/2;floor.position.y=-2.275;floor.receiveShadow=true;scene.add(floor);
const mirrorGeometry=new THREE.PlaneGeometry(40,30);
const mirror=new Reflector(mirrorGeometry,{textureWidth:1024,textureHeight:1024,color:0xffffff,clipBias:.003});
const mirrorMaterial=mirror.material as InstanceType<typeof THREE.ShaderMaterial>;
mirror.rotation.x=-Math.PI/2;mirror.position.y=-2.28;mirrorMaterial.transparent=true;mirrorMaterial.depthWrite=false;
mirrorMaterial.vertexShader='varying float floorDistance;\n'+mirrorMaterial.vertexShader.replace('void main() {','void main() { floorDistance = position.y;');
mirrorMaterial.uniforms.groundColor={value:new THREE.Color('#101316')};
mirrorMaterial.fragmentShader='uniform vec3 groundColor; varying float floorDistance;\n'+mirrorMaterial.fragmentShader;
mirrorMaterial.fragmentShader=mirrorMaterial.fragmentShader.replace('vec4 base = texture2DProj( tDiffuse, vUv );', `
 vec2 uv = vUv.xy / vUv.w;
 uv.x += sin(floorDistance*160.0)*0.00025;
 float blur = 0.002 + min(abs(floorDistance), 4.0) * 0.009;
 vec4 base=vec4(0.0);float weight=0.0;
 for(int x=-2;x<=2;x++){for(int y=-2;y<=2;y++){
  vec2 offset=vec2(float(x),float(y));float w=exp(-dot(offset,offset)*.5);
  base += texture2D(tDiffuse,uv+offset*blur*.65)*w;weight+=w;
 }}base/=weight;
`);
mirrorMaterial.fragmentShader=mirrorMaterial.fragmentShader.replace('gl_FragColor = vec4( blendOverlay( base.rgb, color ), 1.0 );','gl_FragColor = vec4(min(max(base.rgb-vec3(min(min(base.r,base.g),base.b))*.94,vec3(0.0)),vec3(1.0)), 0.78 * exp(-abs(floorDistance)*0.48) * smoothstep(0.01,0.12,length(base.rgb-groundColor)));');
scene.add(mirror);
// Soft colored light transmitted onto the polished ground.
const pools:InstanceType<typeof THREE.Mesh>[]=[];
for(const [x,color] of [[-1.7,'#ffd326'],[-.6,'#087dff'],[.9,'#ff9d12'],[1.5,'#934dff'],[2,'#68d9ba']] as const){
 const mat=new THREE.ShaderMaterial({uniforms:{tint:{value:new THREE.Color(color)},strength:{value:.35}},transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
 vertexShader:'varying vec2 vPool; void main(){vPool=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
 fragmentShader:'varying vec2 vPool; uniform vec3 tint; uniform float strength; void main(){vec2 p=(vPool-.5)*2.;float a=exp(-p.x*p.x*5.-p.y*p.y*2.8)*strength;gl_FragColor=vec4(tint,a);}' });
 const pool=new THREE.Mesh(new THREE.PlaneGeometry(1.6,4.5),mat);pool.rotation.x=-Math.PI/2;pool.position.set(x,-2.265,1.25);pool.renderOrder=4;pool.userData.restX=x;scene.add(pool);pools.push(pool);
}
const group=new THREE.Group();scene.add(group);group.rotation.set(.10,.15,.025);
const meshes:{mesh:InstanceType<typeof THREE.Mesh>,x:number,y:number,z:number,rz:number}[]=[];
const paths=new SVGLoader().parse(logo).paths;
for(const path of paths){if(path.color.getHexString()==='ffffff')continue;for(const shape of path.toShapes()){
const geometry=new THREE.ExtrudeGeometry(shape,{depth:30,bevelEnabled:true,bevelSegments:10,steps:1,bevelSize:5,bevelThickness:5,curveSegments:16});
geometry.computeBoundingBox();const center=geometry.boundingBox!.getCenter(new THREE.Vector3());geometry.translate(-center.x,-center.y,-center.z);geometry.scale(.0096,-.0096,-.01);
const sourceColor=(path.userData!.node as SVGElement).getAttribute("fill") || '#2795ec';
const glassPalette:Record<string,string>={'#2795ec':'#168dff','#cc0603':'#fa1005','#6db33d':'#80c841','#be3530':'#d42a24','#355f80':'#39678d','#f92f24':'#ff3020','#02abd5':'#04bde9','#0178d6':'#0868ed','#7e51fd':'#843dff','#0c2e20':'#287c69','#fe9901':'#ffaa12','#fcc621':'#ffce20'};
const color=new THREE.Color(glassPalette[sourceColor] || sourceColor);
// Transparent optical shells let the rear contour remain visible through each face.
const material=new THREE.MeshPhysicalMaterial({color:0xffffff,metalness:0,roughness:.035,envMapIntensity:1.4,specularIntensity:1,specularColor:color,clearcoat:0,clearcoatRoughness:.025,transmission:.98,thickness:.3,ior:1.46,attenuationColor:color,attenuationDistance:.8,emissive:color,emissiveIntensity:.08});
material.onBeforeCompile=(shader)=>{
 shader.vertexShader='varying vec3 glassPosition;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nglassPosition=position;');
 shader.fragmentShader='varying vec3 glassPosition;\n'+shader.fragmentShader.replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\ntotalEmissiveRadiance *= .4 + 1.2 * pow(clamp(.5-glassPosition.y*.5,0.,1.),2.);');
};
const bevel=new THREE.MeshPhysicalMaterial({color:0xffffff,metalness:0,roughness:.055,envMapIntensity:1.8,specularIntensity:.6,specularColor:color.clone().lerp(new THREE.Color('white'),.25),clearcoat:.25,clearcoatRoughness:.02,transmission:.9,thickness:.24,ior:1.46,attenuationColor:color,attenuationDistance:.3,emissive:color,emissiveIntensity:.38});
const mesh=new THREE.Mesh(geometry,[material,bevel]);mesh.renderOrder=2;
// A low-intensity internal scattering layer supplies colored light to the refractive shell.
const coreGeometry=new THREE.ShapeGeometry(shape,24);
coreGeometry.translate(-center.x,-center.y,0);coreGeometry.scale(.0096,-.0096,1);
const coreMaterial=new THREE.MeshBasicMaterial({color:color.clone().multiplyScalar(.6),side:THREE.DoubleSide});
coreMaterial.onBeforeCompile=shader=>{
 shader.vertexShader='varying vec3 corePosition;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ncorePosition=position;');
 shader.fragmentShader=`varying vec3 corePosition;
 float glassNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);vec2 k=vec2(127.1,311.7);float a=fract(sin(dot(i,k))*43758.5453),b=fract(sin(dot(i+vec2(1.,0.),k))*43758.5453),c=fract(sin(dot(i+vec2(0.,1.),k))*43758.5453),d=fract(sin(dot(i+vec2(1.),k))*43758.5453);return mix(mix(a,b,f.x),mix(c,d,f.x),f.y);}
 `+shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
 float sweep=pow(clamp(.45-corePosition.y*.45+corePosition.x*.35,0.,1.),2.);
 float grain=fract(sin(dot(corePosition.xy,vec2(127.1,311.7)))*43758.5453);
 float haze=glassNoise(corePosition.xy*3.5)*.65+glassNoise(corePosition.xy*9.)*.35;
 diffuseColor.rgb *= .12 + sweep*1.7 + grain*.025 + haze*.25;`);
};
const core=new THREE.Mesh(coreGeometry,coreMaterial);core.position.z=-.13;mesh.add(core);
// Fine front/back contour reflections reveal the transparent block's thickness.
for(const z of [-.205,.205]){
 const points=shape.getPoints(24).map(p=>new THREE.Vector3((p.x-center.x)*.0096,(center.y-p.y)*.0096,z));
 const outline=new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineBasicMaterial({color:color.clone().lerp(new THREE.Color('white'),.025).multiplyScalar(5),transparent:true,opacity:z>0?.95:.32,depthWrite:false,depthTest:false,toneMapped:false}));
 outline.renderOrder=3;mesh.add(outline);
}
mesh.castShadow=false;mesh.receiveShadow=false;const x=(center.x-230)*.01,y=(230-center.y)*.01;const i=meshes.length;
meshes.push({mesh,x,y,z:((i%3)-1)*.08,rz:((i%3)-1)*.4});group.add(mesh);
}}
let frame=0,visible=true,disposed=false,pointerX=0,pointerY=0;
const flightDuration=2150,stagger=32,totalDuration=flightDuration+11*stagger;
// Distributed radial lanes: left/right, overhead, low diagonals, near and far.
// Fixed paths keep each entrance intentional and reproducible.
const launchLanes=[
 [-10,5,-7], [2,10,-9], [10,6,-5],
 [-12,1,-4], [5,7,-12], [12,-1,2],
 [-9,-3,3], [-5,9,-6], [9,3,-10],
 [8,-4,4], [-8,-4,2], [3,-6,4],
] as const;
let currentX=0,currentY=0,elapsed=-120,lastFrame=0,motionFrame=0,assembling=false;
const interaction=host.closest<HTMLElement>('.hero') ?? host;
function beginAssembly(){if(assembling||disposed)return;assembling=true;lastFrame=performance.now();request();}
window.addEventListener('logo-reveal',beginAssembly);
function render(now:number){
 frame=0;if(disposed||!visible||document.hidden){lastFrame=motionFrame=0;return;}
 const dt=motionFrame?Math.min((now-motionFrame)/1000,.064):1/60;motionFrame=now;
 const follow=1-Math.exp(-dt/0.16);
 currentX+=(pointerX-currentX)*follow;currentY+=(pointerY-currentY)*follow;
 if(assembling){if(lastFrame)elapsed+=Math.min(now-lastFrame,64);lastFrame=now;}
 const progress=Math.max(0,Math.min(1,elapsed/totalDuration));
 host.dataset.assembly=assembling?(progress>=1?'settled':'assembling'):'waiting';
 const lightArrival=Math.max(0,Math.min(1,(progress-.2)/.65));
 for(const pool of pools){(pool.material as InstanceType<typeof THREE.ShaderMaterial>).uniforms.strength.value=(document.documentElement.dataset.theme==='dark'?.24:.08)*lightArrival*lightArrival*(3-2*lightArrival);}
 // Floor reflection follows the real geometry; transmitted light drifts with its tilt.
 for(const pool of pools){
  pool.position.x=pool.userData.restX+currentX*.16;
  pool.position.z=1.25+currentY*.15;
  pool.rotation.z=-currentX*.055;
 }
 for(const [i,p] of meshes.entries()){
  const order=(i*5)%12;
  const t=Math.max(0,Math.min(1,(elapsed-order*stagger)/flightDuration));
  // A broader travel phase, followed by a quiet, exact landing.
  const eased=(1-(1+7*t)*Math.exp(-7*t))/(1-8*Math.exp(-7));
  const spread=1-eased,arc=Math.sin(Math.PI*eased)*spread;
  const [launchX,launchY,launchZ]=launchLanes[i%launchLanes.length];
  const bend=(i%2===0?1:-1);
  p.mesh.position.set(
   p.x+launchX*spread+bend*arc*1.5,
   p.y+launchY*spread+arc*(i%3===0?-1:1)*1.2,
   p.z+launchZ*spread+bend*arc*.8);
  p.mesh.rotation.set(
   spread*((i%2)?-1.15:1.4)+((i%3)-1)*.055,
   spread*bend*1.6+((i%3)-1)*.10,
   spread*bend*(.55+(i%3)*.35));
 }
 const response=lightArrival*lightArrival*(3-2*lightArrival);
 group.rotation.y=-.30+currentX*.19*response;
 group.rotation.x=-.24+currentY*.10*response;
 group.rotation.z=.015-currentX*.018*response;
 group.position.x=currentX*.065*response;group.position.y=-.07-currentY*.025*response;
 composer.render();
 if(host.dataset.ready!=='true'){
  host.dataset.ready='true';window.dispatchEvent(new Event('logo-ready'));
  // Also works if loading already ended via the bounded fallback.
  if(!document.documentElement.dataset.loading)beginAssembly();
 }
 if((assembling&&elapsed<totalDuration)||Math.abs(pointerX-currentX)+Math.abs(pointerY-currentY)>.001)request();
}
function updateTheme(){const dark=document.documentElement.dataset.theme==='dark';(scene.background as InstanceType<typeof THREE.Color>).set(dark?'#101316':'#fdfdfc');mirrorMaterial.uniforms.groundColor.value.copy(scene.background);floorMaterial.color.set(dark?0x000000:0x59616b);floorMaterial.opacity=.08;bloom.strength=dark?.09:.025;light.intensity=dark?2.2:2.5;rim.intensity=dark?4:3;for(const pool of pools){(pool.material as InstanceType<typeof THREE.ShaderMaterial>).uniforms.strength.value=dark?.24:.08;}request();}
window.addEventListener('themechange',updateTheme);updateTheme();
function request(){if(!frame&&!disposed)frame=requestAnimationFrame(render);}
const resize=new ResizeObserver(()=>{const {width,height}=host.getBoundingClientRect();if(!width||!height)return;const renderWidth=width*(interaction===host?1:1.8);renderer.setSize(renderWidth,height,false);composer.setSize(renderWidth,height);camera.aspect=renderWidth/height;camera.updateProjectionMatrix();request();});resize.observe(host);
const intersection=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;lastFrame=0;if(visible)request();});intersection.observe(host);
function move(e:PointerEvent){
 if(e.pointerType!=='mouse'||!visible)return;
 const box=interaction.getBoundingClientRect();
 pointerX=THREE.MathUtils.clamp(((e.clientX-box.left)/box.width-.5)*2,-1,1);
 pointerY=THREE.MathUtils.clamp(((e.clientY-box.top)/box.height-.5)*2,-1,1);request();
}
function leave(){pointerX=pointerY=0;request();}function visibility(){lastFrame=motionFrame=0;if(document.hidden){pointerX=pointerY=0;}else request();}
interaction.addEventListener('pointermove',move,{passive:true});interaction.addEventListener('pointerleave',leave);window.addEventListener('blur',leave);document.addEventListener('visibilitychange',visibility);
function dispose(){if(disposed)return;disposed=true;cancelAnimationFrame(frame);resize.disconnect();intersection.disconnect();interaction.removeEventListener('pointermove',move);interaction.removeEventListener('pointerleave',leave);window.removeEventListener('blur',leave);document.removeEventListener('visibilitychange',visibility);window.removeEventListener('themechange',updateTheme);window.removeEventListener('logo-reveal',beginAssembly);host.dataset.ready='false';for(const p of meshes){p.mesh.geometry.dispose();for(const child of p.mesh.children){const line=child as InstanceType<typeof THREE.LineLoop>;line.geometry.dispose();(line.material as InstanceType<typeof THREE.Material>).dispose();}for(const mat of p.mesh.material as InstanceType<typeof THREE.Material>[])mat.dispose();}for(const pool of pools){pool.geometry.dispose();(pool.material as InstanceType<typeof THREE.Material>).dispose();}mirror.dispose();mirrorGeometry.dispose();floorGeometry.dispose();floorMaterial.dispose();light.shadow.map?.dispose();env.dispose();for(const pass of composer.passes)pass.dispose();composer.dispose();renderer.dispose();}
canvas.addEventListener('webglcontextlost',(event)=>{event.preventDefault();dispose();},{once:true});window.addEventListener('pagehide',dispose,{once:true});reduced.addEventListener('change',()=>{if(reduced.matches)dispose();});request();
}catch(error){console.warn('Logo renderer unavailable',error);host.dataset.ready='false';window.dispatchEvent(new Event('logo-ready'));}
}
