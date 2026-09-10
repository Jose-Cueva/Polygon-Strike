window.GW = window.GW || {};

(function(){
"use strict";

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 500);
let BASE_FOV = 75;
const renderer = new THREE.WebGLRenderer({antialias:true});
renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.domElement.style.position = 'fixed';
renderer.domElement.style.inset = '0';
renderer.domElement.style.zIndex = '0';
document.body.appendChild(renderer.domElement);

/* ============================= POST-PROCESSING ============================= */
/* Real EffectComposer pipeline: scene render -> UnrealBloomPass -> a custom
   GLSL pass combining chromatic aberration, vignette and film grain. Every
   addon is feature-detected — if any failed to load, we silently fall back
   to a plain renderer.render() so the game never depends on this to run. */
const GW_POST_SHADER = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uVignetteStrength: { value: 0.0 },
    uAberration: { value: 0.0 },
    uGrain: { value: 0.0 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main(){
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float uTime, uVignetteStrength, uAberration, uGrain;
    varying vec2 vUv;
    float hash(vec2 p){ return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453); }
    void main(){
      vec2 centered = vUv - 0.5;
      float dist = length(centered);
      vec2 dir = dist > 0.0001 ? centered/dist : vec2(0.0);
      float shift = uAberration * dist;
      float r = texture2D(tDiffuse, vUv - dir*shift).r;
      float g = texture2D(tDiffuse, vUv).g;
      float b = texture2D(tDiffuse, vUv + dir*shift).b;
      vec3 col = vec3(r,g,b);
      float vig = smoothstep(0.35, 0.88, dist);
      col *= 1.0 - vig*uVignetteStrength;
      float grain = (hash(vUv*vec2(873.0,1321.0) + uTime) - 0.5) * uGrain;
      col += grain;
      // The composer bypasses renderer.outputEncoding, so convert to sRGB here
      // or the whole frame renders noticeably darker than the plain path.
      gl_FragColor = LinearTosRGB(vec4(col, 1.0));
    }
  `
};

let composer=null, bloomPass=null, postPass=null, postFXLevel=2;
function setupPostProcessing(){
  if(!THREE.EffectComposer || !THREE.RenderPass) return;
  try{
    composer = new THREE.EffectComposer(renderer);
    composer.setSize(window.innerWidth, window.innerHeight);
    composer.addPass(new THREE.RenderPass(scene, camera));
    if(THREE.UnrealBloomPass){
      bloomPass = new THREE.UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.5, 0.45, 0.72);
      composer.addPass(bloomPass);
    }
    if(THREE.ShaderPass){
      postPass = new THREE.ShaderPass(GW_POST_SHADER);
      postPass.renderToScreen = true;
      composer.addPass(postPass);
    }
  } catch(err){
    composer = null; // any addon mismatch: fall back to plain rendering, never crash the game over this
  }
}
setupPostProcessing();

function renderFrame(){
  if(composer && postFXLevel>0){
    if(postPass){
      postPass.uniforms.uTime.value = performance.now()*0.0006;
      const full = postFXLevel>=2;
      postPass.uniforms.uVignetteStrength.value = full ? 0.3 : 0.0;
      postPass.uniforms.uAberration.value = full ? 0.0018 : 0.0;
      postPass.uniforms.uGrain.value = full ? 0.022 : 0.0;
    }
    composer.render();
  } else {
    renderer.render(scene, camera);
  }
}

window.addEventListener('resize', ()=>{
  camera.aspect = window.innerWidth/window.innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  if(composer) composer.setSize(window.innerWidth, window.innerHeight);
});

const GRAPHICS_TIERS = {
  baja:   { pixelRatio:1,   shadows:false, shadowSize:512,  postFX:0 },
  media:  { pixelRatio:1.5, shadows:true,  shadowSize:1024, postFX:1 },
  alta:   { pixelRatio:2,   shadows:true,  shadowSize:2048, postFX:2 },
};
let shadowMapSize = 2048;
function applyGraphicsQuality(quality){
  const t = GRAPHICS_TIERS[quality] || GRAPHICS_TIERS.alta;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, t.pixelRatio));
  renderer.shadowMap.enabled = t.shadows;
  shadowMapSize = t.shadowSize;
  postFXLevel = t.postFX;
  if(composer){
    composer.setPixelRatio(renderer.getPixelRatio());
    composer.setSize(window.innerWidth, window.innerHeight);
  }
}

const E = {
  scene, camera, renderer,
  obstacles:[], floors:[], raycastTargets:[], dynamicObjects:[], mapObjects:[], ammoCrates:[],
  bots:[], mapData:null, mapDef:null, config:null, mode:null, allowRespawn:true, allowBotRespawn:true,
  frozen:true, matchActive:false, matchId:0, _freezeExitsLock:false,
  keys:{}, weaponStates:{}, loadout:['rifle','pistol'], currentSlot:0, switchLocked:false,
  player:{ team:'A', health:100, maxHealth:100, kills:0, deaths:0, alive:true, lastDamageTime:-99999, shots:0, hits:0 },
  inputLocked:false, weaponLowered:false, objectiveMarker:null,
};
GW.engine = E;

/* ============================= TEXTURES / MATERIALS ============================= */
function makeGroundTexture(baseHex){
  const c = document.createElement('canvas'); c.width=512; c.height=512;
  const ctx = c.getContext('2d');
  ctx.fillStyle = baseHex; ctx.fillRect(0,0,512,512);
  for(let i=0;i<3000;i++){
    const v = Math.random()*18-9;
    ctx.fillStyle = `rgba(${Math.max(0,20+v)},${Math.max(0,25+v)},${Math.max(0,18+v)},0.25)`;
    ctx.fillRect(Math.random()*512, Math.random()*512, 2, 2);
  }
  ctx.strokeStyle = 'rgba(20,24,16,0.5)'; ctx.lineWidth=2;
  for(let i=0;i<=8;i++){
    ctx.beginPath(); ctx.moveTo(i*64,0); ctx.lineTo(i*64,512); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0,i*64); ctx.lineTo(512,i*64); ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(24,24);
  return tex;
}
function makePanelTexture(base){
  const c = document.createElement('canvas'); c.width=256; c.height=256;
  const ctx = c.getContext('2d');
  ctx.fillStyle = base; ctx.fillRect(0,0,256,256);
  ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth=4;
  ctx.strokeRect(4,4,248,248);
  ctx.beginPath(); ctx.moveTo(0,86); ctx.lineTo(256,86); ctx.moveTo(0,170); ctx.lineTo(256,170); ctx.stroke();
  for(let i=0;i<400;i++){
    ctx.fillStyle = `rgba(0,0,0,${Math.random()*0.08})`;
    ctx.fillRect(Math.random()*256, Math.random()*256, 3,3);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}
function makeWindowTexture(base){
  const c = document.createElement('canvas'); c.width=256; c.height=256;
  const ctx = c.getContext('2d');
  ctx.fillStyle = base; ctx.fillRect(0,0,256,256);
  for(let y=0;y<4;y++) for(let x=0;x<3;x++){
    ctx.fillStyle = Math.random()>0.35 ? 'rgba(160,200,210,0.75)' : 'rgba(30,34,26,0.85)';
    ctx.fillRect(18+x*78, 14+y*62, 46, 38);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}
function makeRockTexture(base, dark){
  const c = document.createElement('canvas'); c.width=128; c.height=128;
  const ctx = c.getContext('2d');
  ctx.fillStyle = base||'#8a7f6e'; ctx.fillRect(0,0,128,128);
  for(let i=0;i<600;i++){
    ctx.fillStyle = `rgba(${60+Math.random()*40},${55+Math.random()*35},${45+Math.random()*30},0.4)`;
    ctx.fillRect(Math.random()*128,Math.random()*128,3,3);
  }
  if(dark){
    // strata bands so tall canyon walls read as layered stone instead of flat blocks
    for(let y=0;y<128;y+=14+Math.random()*10){
      ctx.fillStyle = `rgba(20,14,8,${0.18+Math.random()*0.2})`;
      ctx.fillRect(0,y,128,2+Math.random()*3);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}
function makeCrateTexture(){
  const c = document.createElement('canvas'); c.width=128; c.height=128;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#5a5024'; ctx.fillRect(0,0,128,128);
  ctx.strokeStyle='rgba(0,0,0,0.4)'; ctx.lineWidth=5; ctx.strokeRect(3,3,122,122);
  ctx.fillStyle = '#d8c840';
  ctx.fillRect(54,20,20,88); ctx.fillRect(20,54,88,20);
  return new THREE.CanvasTexture(c);
}
function makeSandbagTexture(){
  const c = document.createElement('canvas'); c.width=256; c.height=128;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#8e7d55'; ctx.fillRect(0,0,256,128);
  for(let row=0;row<4;row++){
    const off = row%2 ? 32 : 0;
    for(let i=-1;i<5;i++){
      const x = i*64+off, y = row*32;
      const g = ctx.createLinearGradient(x,y,x,y+32);
      g.addColorStop(0,'#a8955f'); g.addColorStop(0.5,'#8c7a4e'); g.addColorStop(1,'#5e5133');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.ellipse(x+32,y+16,31,14,0,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle='rgba(30,24,12,0.55)'; ctx.lineWidth=2; ctx.stroke();
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}
function makeSteelTexture(){
  const c = document.createElement('canvas'); c.width=128; c.height=128;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#4b5258'; ctx.fillRect(0,0,128,128);
  ctx.strokeStyle = 'rgba(15,18,20,0.7)'; ctx.lineWidth=3; ctx.strokeRect(2,2,124,124);
  ctx.beginPath(); ctx.moveTo(64,0); ctx.lineTo(64,128); ctx.stroke();
  ctx.fillStyle = 'rgba(200,210,215,0.35)';
  [[10,10],[54,10],[74,10],[118,10],[10,118],[54,118],[74,118],[118,118],[10,64],[118,64]].forEach(p=>{ ctx.beginPath(); ctx.arc(p[0],p[1],3,0,Math.PI*2); ctx.fill(); });
  for(let i=0;i<220;i++){ ctx.fillStyle = `rgba(0,0,0,${Math.random()*0.12})`; ctx.fillRect(Math.random()*128,Math.random()*128,2,2); }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}
function makeHazardTexture(){
  const c = document.createElement('canvas'); c.width=128; c.height=32;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#d8b21a'; ctx.fillRect(0,0,128,32);
  ctx.fillStyle = '#151513';
  for(let i=-1;i<5;i++){ ctx.beginPath(); ctx.moveTo(i*32,0); ctx.lineTo(i*32+16,0); ctx.lineTo(i*32+48,32); ctx.lineTo(i*32+32,32); ctx.closePath(); ctx.fill(); }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4,1);
  return tex;
}
function makeWoodTexture(){
  const c = document.createElement('canvas'); c.width=128; c.height=128;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#6d4d2b'; ctx.fillRect(0,0,128,128);
  for(let p=0;p<4;p++){
    ctx.fillStyle = p%2 ? '#75542f' : '#634426';
    ctx.fillRect(0,p*32,128,30);
    ctx.strokeStyle='rgba(20,12,4,0.6)'; ctx.lineWidth=2; ctx.strokeRect(0,p*32,128,30);
    for(let i=0;i<40;i++){ ctx.fillStyle = `rgba(30,18,6,${Math.random()*0.25})`; ctx.fillRect(Math.random()*128, p*32+Math.random()*30, 6, 1); }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

const mat = {
  orange: new THREE.MeshStandardMaterial({map:makePanelTexture('#b5551d'), roughness:0.55, metalness:0.5}),
  blue: new THREE.MeshStandardMaterial({map:makePanelTexture('#3a5f72'), roughness:0.55, metalness:0.5}),
  green: new THREE.MeshStandardMaterial({map:makePanelTexture('#4a5d3a'), roughness:0.6, metalness:0.4}),
  concrete: new THREE.MeshStandardMaterial({color:0x777066, roughness:0.9, metalness:0.05}),
  dark: new THREE.MeshStandardMaterial({color:0x2a2f28, roughness:0.7, metalness:0.3}),
  building1: new THREE.MeshStandardMaterial({map:makeWindowTexture('#6b6355'), roughness:0.85, metalness:0.1}),
  building2: new THREE.MeshStandardMaterial({map:makeWindowTexture('#5a5e63'), roughness:0.85, metalness:0.1}),
  barrel: new THREE.MeshStandardMaterial({color:0xd68b1a, roughness:0.5, metalness:0.6}),
  rock: new THREE.MeshStandardMaterial({map:makeRockTexture(), roughness:0.95, metalness:0.02}),
  sand: new THREE.MeshStandardMaterial({color:0xc7a86a, roughness:0.95, metalness:0.02}),
  tent: new THREE.MeshStandardMaterial({color:0x8a6a3a, roughness:0.8, metalness:0.05}),
  sandstone: new THREE.MeshStandardMaterial({map:makeWindowTexture('#b89568'), roughness:0.85, metalness:0.05}),
  crate: new THREE.MeshStandardMaterial({map:makeCrateTexture(), roughness:0.7, metalness:0.15}),
  sandbag: new THREE.MeshStandardMaterial({map:makeSandbagTexture(), roughness:0.95, metalness:0.0}),
  steel: new THREE.MeshStandardMaterial({map:makeSteelTexture(), roughness:0.45, metalness:0.7}),
  hazard: new THREE.MeshStandardMaterial({map:makeHazardTexture(), roughness:0.6, metalness:0.2}),
  wood: new THREE.MeshStandardMaterial({map:makeWoodTexture(), roughness:0.85, metalness:0.05}),
  rust: new THREE.MeshStandardMaterial({color:0x6b3f22, roughness:0.85, metalness:0.35}),
  olive: new THREE.MeshStandardMaterial({color:0x4f5a3a, roughness:0.8, metalness:0.2}),
  cliff: new THREE.MeshStandardMaterial({map:makeRockTexture('#6e5f4d', true), roughness:0.95, metalness:0.02}),
  canvas: new THREE.MeshStandardMaterial({color:0x7c6d45, roughness:0.9, metalness:0.02}),
};
E.mat = mat;
Object.values(mat).forEach(m=>{ if(m.map) m.map.encoding = THREE.sRGBEncoding; });

/* ============================= MAP HELPERS ============================= */
function trackedAdd(mesh){ scene.add(mesh); E.mapObjects.push(mesh); return mesh; }

function addBox(w,h,d,x,y,z,matKey,opts){
  opts = opts||{};
  const geo = new THREE.BoxGeometry(w,h,d);
  const mesh = new THREE.Mesh(geo, mat[matKey]||mat.concrete);
  mesh.position.set(x,y,z);
  if(opts.rotY) mesh.rotation.y = opts.rotY;
  if(opts.rotX) mesh.rotation.x = opts.rotX;
  mesh.castShadow = true; mesh.receiveShadow = true;
  trackedAdd(mesh);
  mesh.updateMatrixWorld(true);
  if(opts.isFloor !== false) E.floors.push(mesh);
  if(opts.isWall !== false){
    const box3 = new THREE.Box3().setFromObject(mesh);
    E.obstacles.push({box3});
    E.raycastTargets.push(mesh);
  }
  return mesh;
}

function addBarrel(x,z){
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.45,0.45,1,12), mat.barrel);
  mesh.position.set(x,0.5,z);
  mesh.castShadow = true; mesh.receiveShadow = true;
  trackedAdd(mesh); mesh.updateMatrixWorld(true);
  E.floors.push(mesh);
  const box3 = new THREE.Box3().setFromObject(mesh);
  E.obstacles.push({box3});
  E.raycastTargets.push(mesh);
  return mesh;
}

function addRamp(opts){
  const {x,z,width,length,height,rotY} = opts;
  const angle = Math.atan2(height, length);
  const boxLen = length/Math.cos(angle);
  const geo = new THREE.BoxGeometry(width, 0.5, boxLen);
  const mesh = new THREE.Mesh(geo, mat.concrete);
  mesh.rotation.y = rotY||0;
  mesh.rotation.x = -angle;
  const localOffset = new THREE.Vector3(0,0,boxLen/2*Math.cos(angle)).applyAxisAngle(new THREE.Vector3(0,1,0), rotY||0);
  mesh.position.set(x+localOffset.x, height/2, z+localOffset.z);
  mesh.castShadow = true; mesh.receiveShadow = true;
  trackedAdd(mesh); mesh.updateMatrixWorld(true);
  E.floors.push(mesh);
  return mesh;
}

function addElevator(x,z,w,d,base,amp,speed){
  const mesh = addBox(w,0.4,d,x,base,z,'dark',{isWall:false});
  E.dynamicObjects.push({type:'elevator', obj:mesh, base, amp, speed, phase:Math.random()*6});
  return mesh;
}

function addTower(x,z){
  addBox(2,8,2,x,4,z,'dark');
  const dishArm = new THREE.Group(); dishArm.position.set(x,8.3,z); trackedAdd(dishArm);
  const dish = new THREE.Mesh(new THREE.CylinderGeometry(0.05,1.3,0.14,16,1,true), mat.green);
  dish.rotation.x = Math.PI/2.15; dish.position.set(0,0,0.5); dish.material = mat.green.clone(); dish.material.side = THREE.DoubleSide;
  dishArm.add(dish);
  E.dynamicObjects.push({type:'rotate', obj:dishArm, speed:0.7});

  const beaconMat = new THREE.MeshBasicMaterial({color:0xff2200});
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.15,8,8), beaconMat);
  beacon.position.set(x,8.5,z);
  trackedAdd(beacon);
  const beaconLight = new THREE.PointLight(0xff2200,0,9);
  beaconLight.position.copy(beacon.position);
  trackedAdd(beaconLight);
  E.dynamicObjects.push({type:'blink', mat:beaconMat, light:beaconLight});
}

function addFlag(x,z){
  addBox(0.15,6,0.15,x,3,z,'dark',{isFloor:false});
  const flagMat = mat.orange.clone(); flagMat.side = THREE.DoubleSide;
  const flag = new THREE.Mesh(new THREE.PlaneGeometry(2.2,1.3,4,1), flagMat);
  flag.position.set(x+1.15,5.2,z);
  trackedAdd(flag);
  E.dynamicObjects.push({type:'flag', obj:flag});
}

function addBuilding(w,h,d,x,z,rotY,texKey){
  addBox(w,h,d,x,h/2,z,texKey,{rotY});
}

const engineHelpers = { addBox, addBarrel, addRamp, addElevator, addTower, addFlag, addBuilding, mat };

/* ============================= SKY / LIGHTING ============================= */
let sunLight=null, hemi=null, ambient=null, skyMesh=null, groundMesh=null;
function makeSkyTexture(colors){
  const c = document.createElement('canvas'); c.width=2; c.height=512;
  const ctx = c.getContext('2d');
  const grad = ctx.createLinearGradient(0,0,0,512);
  grad.addColorStop(0,colors[0]); grad.addColorStop(0.45,colors[1]);
  grad.addColorStop(0.62,colors[2]); grad.addColorStop(1,colors[3]);
  ctx.fillStyle = grad; ctx.fillRect(0,0,2,512);
  return new THREE.CanvasTexture(c);
}

function setupWorldBase(mapDef){
  if(skyMesh) scene.remove(skyMesh);
  if(groundMesh) scene.remove(groundMesh);
  if(sunLight){ scene.remove(sunLight); scene.remove(sunLight.target); }
  if(hemi) scene.remove(hemi);
  if(ambient) scene.remove(ambient);

  scene.fog = new THREE.FogExp2(mapDef.fogColor, mapDef.fogDensity);

  const skyTex = makeSkyTexture(mapDef.skyColors); skyTex.encoding = THREE.sRGBEncoding;
  skyMesh = new THREE.Mesh(new THREE.SphereGeometry(mapDef.size*3,16,16), new THREE.MeshBasicMaterial({map:skyTex, side:THREE.BackSide, fog:false}));
  scene.add(skyMesh);

  hemi = new THREE.HemisphereLight(0xaebfa0, 0x30301f, mapDef.hemiIntensity||0.7); scene.add(hemi);
  ambient = new THREE.AmbientLight(0x404030, mapDef.ambientIntensity||0.35); scene.add(ambient);
  sunLight = new THREE.DirectionalLight(0xfff3d6, mapDef.sunIntensity||1.15);
  sunLight.position.set(60,90,30);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(shadowMapSize,shadowMapSize);
  const s = mapDef.size;
  sunLight.shadow.camera.left=-s; sunLight.shadow.camera.right=s; sunLight.shadow.camera.top=s; sunLight.shadow.camera.bottom=-s;
  sunLight.shadow.camera.near=1; sunLight.shadow.camera.far=300;
  sunLight.shadow.bias=-0.0005;
  scene.add(sunLight); scene.add(sunLight.target);

  const groundGeo = new THREE.PlaneGeometry(mapDef.size*2.6, mapDef.size*2.6);
  const groundTex = makeGroundTexture(mapDef.groundColor); groundTex.encoding = THREE.sRGBEncoding;
  const groundMat = new THREE.MeshStandardMaterial({map:groundTex, roughness:0.95, metalness:0.02});
  groundMesh = new THREE.Mesh(groundGeo, groundMat);
  groundMesh.rotation.x = -Math.PI/2;
  groundMesh.receiveShadow = true;
  scene.add(groundMesh);
  E.floors.push(groundMesh);

  const s2 = mapDef.size;
  addBox(2,4,s2*1.34, s2,2,0,'concrete');
  addBox(2,4,s2*1.34,-s2,2,0,'concrete');
  addBox(s2*1.34,4,2,0,2, s2,'concrete');
  addBox(s2*1.34,4,2,0,2,-s2,'concrete');
}

const DUST_COUNT = 300;
let dustPoints=null, dustGeo=null;
function setupDust(){
  if(dustPoints) return;
  dustGeo = new THREE.BufferGeometry();
  const pos = new Float32Array(DUST_COUNT*3);
  for(let i=0;i<DUST_COUNT;i++){
    pos[i*3]=(Math.random()*2-1)*70; pos[i*3+1]=Math.random()*10+0.2; pos[i*3+2]=(Math.random()*2-1)*70;
  }
  dustGeo.setAttribute('position', new THREE.BufferAttribute(pos,3));
  const dustMat = new THREE.PointsMaterial({color:0xd8cfa0, size:0.07, transparent:true, opacity:0.3, depthWrite:false});
  dustPoints = new THREE.Points(dustGeo, dustMat);
  scene.add(dustPoints);
}

/* ============================= MAP LOAD / TEARDOWN ============================= */
function teardownMap(){
  E.mapObjects.forEach(o=>{ scene.remove(o); if(o.geometry) o.geometry.dispose(); });
  E.mapObjects.length = 0;
  E.obstacles.length = 0; E.floors.length = 0; E.raycastTargets.length = 0; E.dynamicObjects.length = 0;
  E.bots.forEach(b=>{
    scene.remove(b.group);
    b.group.traverse(o=>{ if(o.isMesh) o.geometry.dispose(); });
  });
  E.bots.length = 0;
  E.ammoCrates.forEach(c=>{ scene.remove(c.mesh); c.mesh.geometry.dispose(); });
  E.ammoCrates.length = 0;
}

function loadMap(mapDef){
  teardownMap();
  setupWorldBase(mapDef);
  setupDust();
  const data = mapDef.build(engineHelpers);
  E.mapData = data;
  E.mapDef = mapDef;
  scene.updateMatrixWorld(true);
  buildAmmoCrates(data.ammoCrates||[]);
}

function buildAmmoCrates(list){
  list.forEach(p=>{
    const geo = new THREE.BoxGeometry(0.9,0.7,0.9);
    const mesh = new THREE.Mesh(geo, mat.crate.clone());
    mesh.position.set(p[0],0.35,p[1]);
    mesh.castShadow = true; mesh.receiveShadow = true;
    scene.add(mesh);
    E.ammoCrates.push({mesh, x:p[0], z:p[1], cooldown:0});
  });
}

/* ============================= PLAYER RIG ============================= */
const playerRig = new THREE.Object3D();
scene.add(playerRig);
const pitchObj = new THREE.Object3D();
playerRig.add(pitchObj);
pitchObj.add(camera);
camera.position.set(0,0,0);
E.playerRig = playerRig;

const STAND_HEIGHT=1.7, CROUCH_HEIGHT=1.0, PLAYER_RADIUS=0.45;
let currentEyeHeight = STAND_HEIGHT;
let feetY=0, verticalVelocity=0, grounded=true, jumpRequested=false;
const DODGE_COOLDOWN = 0.9, DODGE_DURATION = 0.22, DODGE_SPEED = 11.5;
let dodgeCooldown = 0, dodgeTimer = 0;
const dodgeDir = new THREE.Vector3();
let yaw=0, pitch=0, recoilPitch=0;

// fromY: cast from just above the walker's head instead of the sky so decks,
// beams and bridges overhead are not mistaken for the ground beneath them.
function raycastGroundY(x,z,fromY){
  const startY = fromY===undefined ? 25 : fromY;
  const ray = new THREE.Raycaster(new THREE.Vector3(x,startY,z), new THREE.Vector3(0,-1,0), 0, 60);
  const hits = ray.intersectObjects(E.floors, false);
  return hits.length>0 ? hits[0].point.y : 0;
}
E.raycastGroundY = raycastGroundY;

E.setPlayerPosition = function(x,z,yawRad){
  playerRig.position.set(x,0,z);
  feetY = raycastGroundY(x,z);
  playerRig.position.y = feetY;
  if(yawRad!==undefined){ yaw = yawRad; playerRig.rotation.y = yaw; }
};

function resolveHorizontalCollision(pos, feet, radius, height){
  radius = radius===undefined ? PLAYER_RADIUS : radius;
  height = height===undefined ? 1.9 : height;
  // Two passes: a single sweep can push the player/bot out of one obstacle
  // and slightly into a second one (e.g. two walls meeting in a corner) —
  // a second pass catches that instead of leaving a tiny snag/jitter there.
  for(let pass=0;pass<2;pass++){
  for(let i=0;i<E.obstacles.length;i++){
    const box3 = E.obstacles[i].box3;
    if(feet >= box3.max.y - 0.05) continue;
    if(box3.min.y >= feet + height) continue;
    const cx = Math.max(box3.min.x, Math.min(pos.x, box3.max.x));
    const cz = Math.max(box3.min.z, Math.min(pos.z, box3.max.z));
    const dx = pos.x-cx, dz = pos.z-cz;
    const distSq = dx*dx+dz*dz;
    if(distSq < radius*radius){
      const dist = Math.sqrt(distSq) || 0.0001;
      const overlap = radius-dist;
      pos.x += (dx/dist)*overlap; pos.z += (dz/dist)*overlap;
    }
  }
  }
}
E.resolveHorizontalCollision = resolveHorizontalCollision;

const raycaster = new THREE.Raycaster();
function isValidPlayerTarget(bot){
  if(!bot.alive) return false;
  if(E.config && E.config.friendlyFire) return true;
  return GW.Bots.hostile(E.player.team, bot.team);
}
E.hasLOS = function(fromPos, toPos){
  const dir = new THREE.Vector3().subVectors(toPos, fromPos);
  const dist = dir.length(); dir.normalize();
  raycaster.set(fromPos, dir); raycaster.far = dist;
  return raycaster.intersectObjects(E.raycastTargets, false).length === 0;
};
E.getPlayerPosition = function(){ const v = new THREE.Vector3(); camera.getWorldPosition(v); return v; };

/* ============================= WEAPON SYSTEM ============================= */
const weaponMount = new THREE.Group(); camera.add(weaponMount);
let weaponModel = new THREE.Group(); weaponMount.add(weaponModel);
const flashLight = new THREE.PointLight(0xffcc66,0,6,2);
const flashGeo = new THREE.ConeGeometry(0.08,0.22,8);
const flashMat = new THREE.MeshBasicMaterial({color:0xffdd88, transparent:true, opacity:0});
const flashMesh = new THREE.Mesh(flashGeo, flashMat);
flashMesh.rotation.x = -Math.PI/2;
weaponMount.add(flashLight, flashMesh);
let flashTimer=0, weaponKick=0, lastShotAt=-9999;

/* Melee (knife) */
const knifeModel = (function(){
  const g = new THREE.Group();
  const handleMat = new THREE.MeshStandardMaterial({color:0x2a2018, roughness:0.7, metalness:0.1});
  const bladeMat = new THREE.MeshStandardMaterial({color:0xc9d0d4, roughness:0.25, metalness:0.9});
  const guardMat = new THREE.MeshStandardMaterial({color:0x333333, roughness:0.4, metalness:0.7});
  const handle = new THREE.Mesh(new THREE.BoxGeometry(0.035,0.035,0.16), handleMat); handle.position.set(0,0,0.08);
  const guard = new THREE.Mesh(new THREE.BoxGeometry(0.09,0.02,0.02), guardMat); guard.position.set(0,0,-0.01);
  const blade = new THREE.Mesh(new THREE.BoxGeometry(0.018,0.006,0.22), bladeMat); blade.position.set(0,0,-0.13);
  const bladeTip = new THREE.Mesh(new THREE.ConeGeometry(0.013,0.05,4), bladeMat);
  bladeTip.rotation.x = -Math.PI/2; bladeTip.rotation.z = Math.PI/4; bladeTip.position.set(0,0,-0.245);
  g.add(handle,guard,blade,bladeTip);
  g.visible = false;
  return g;
})();
weaponMount.add(knifeModel);
const MELEE_RANGE = 2.3, MELEE_COOLDOWN = 0.65, MELEE_DURATION = 0.32;
let meleeCooldown=0, meleeActive=false, meleeTimer=0, meleeRequested=false;

function performMelee(){
  if(!E.player.alive || meleeCooldown>0 || meleeActive) return;
  meleeCooldown = MELEE_COOLDOWN;
  meleeActive = true; meleeTimer = 0;
  weaponModel.visible = false;
  knifeModel.visible = true;
  knifeModel.position.set(0.16,-0.14,-0.28);
  knifeModel.rotation.set(0,0,0.4);

  const origin = new THREE.Vector3(); camera.getWorldPosition(origin);
  const dir = new THREE.Vector3(); camera.getWorldDirection(dir);
  const targets = [];
  E.bots.forEach(b=>{ if(isValidPlayerTarget(b)) targets.push(...b.allMeshes); });
  raycaster.set(origin, dir); raycaster.far = MELEE_RANGE;
  const hits = raycaster.intersectObjects(targets.concat(E.raycastTargets), false);
  setTimeout(()=>{
    if(!E.matchActive) return;
    GW.Audio.playMelee();
    if(hits.length>0){
      const bot = hits[0].object.userData.bot;
      if(bot && bot.alive){
        GW.Audio.playHitmarker();
        if(GW.Effects) GW.Effects.spawnMeleeSlash(hits[0].point);
        const died = GW.Bots.damage(bot, 9999);
        if(died) killBot(bot, 'player', null, true);
      }
    }
  }, 120);
}

function updateMelee(dt){
  if(!meleeActive) return;
  meleeTimer += dt;
  const t = meleeTimer/MELEE_DURATION;
  if(t>=1){
    meleeActive=false;
    knifeModel.visible=false;
    weaponModel.visible=true;
    return;
  }
  const swing = Math.sin(Math.min(1,t)*Math.PI);
  knifeModel.position.set(0.16-swing*0.28, -0.14+swing*0.05, -0.28-swing*0.18);
  knifeModel.rotation.set(swing*0.5, -swing*0.6, 0.4-swing*0.9);
}

const REST_POS = new THREE.Vector3(), ADS_POS = new THREE.Vector3();
const weaponState = { reloading:false, reloadTimer:0, isADS:false, adsAmount:0, fireCooldown:0 };
E.weaponState = weaponState;

function curKey(){ return E.loadout[E.currentSlot]; }
function curDef(){ return GW.getWeaponDef(curKey()); }
function curState(){ return E.weaponStates[curKey()]; }

function rebuildWeaponModel(){
  weaponMount.remove(weaponModel);
  weaponModel.traverse(o=>{ if(o.isMesh) o.geometry.dispose(); });
  weaponModel = curDef().build();
  weaponModel.traverse(o=>{ if(o.isMesh){ o.castShadow=false; o.receiveShadow=false; } });
  weaponMount.add(weaponModel);
  const m = curDef().muzzle;
  flashLight.position.set(m[0],m[1],m[2]);
  flashMesh.position.set(m[0],m[1],m[2]-0.02);
}

let switching=false, switchTimer=0, switchDuration=0.3, switchSwapped=false, loweredAmount=0;
function selectSlot(slot){
  if(E.frozen || E.switchLocked || slot===E.currentSlot || switching || meleeActive) return;
  switching=true; switchTimer=0; switchSwapped=false;
  E._pendingSlot = slot;
  weaponState.reloading=false;
  weaponState.isADS=false; weaponState.adsAmount=0;
  const ind = document.getElementById('reloadIndicator'); if(ind) ind.style.opacity='0';
  GW.Audio.playSwitch();
}

E.setForcedWeapon = function(key){
  E.loadout = [key, key];
  E.currentSlot = 0;
  E.switchLocked = true;
  const d = GW.getWeaponDef(key);
  E.weaponStates[key] = {mag:d.mag, reserve:d.reserve};
  rebuildWeaponModel();
};

/* Tracers */
const TRACER_COUNT=16, tracerPool=[];
for(let i=0;i<TRACER_COUNT;i++){
  const geo = new THREE.CylinderGeometry(0.008,0.008,1,4); geo.translate(0,0.5,0);
  const m = new THREE.MeshBasicMaterial({color:0xfff4c2, transparent:true, opacity:0, fog:false});
  const mesh = new THREE.Mesh(geo,m); mesh.visible=false;
  scene.add(mesh);
  tracerPool.push({mesh, life:0});
}
let tracerCursor=0;
function spawnTracer(start,end){
  const t = tracerPool[tracerCursor]; tracerCursor=(tracerCursor+1)%tracerPool.length;
  const dir = new THREE.Vector3().subVectors(end,start);
  const len = Math.max(0.001, dir.length());
  t.mesh.position.copy(start); t.mesh.scale.set(1,len,1);
  t.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0), dir.normalize());
  t.mesh.visible=true; t.mesh.material.opacity=0.85; t.life=0.07;
}

/* ============================= COMBAT ============================= */
let hitmarkerTimer=0, vignetteFlash=0;

function startReload(){
  if(weaponState.reloading || switching || E.frozen || meleeActive) return;
  const st = curState(), def = curDef();
  if(st.mag>=def.mag || st.reserve<=0) return;
  weaponState.reloading = true; weaponState.reloadTimer=0;
  const ind = document.getElementById('reloadIndicator'); if(ind) ind.style.opacity='1';
  GW.Audio.playReloadClick(0.05); GW.Audio.playReloadClick(def.reloadTime-0.15);
}
function finishReload(){
  const def = curDef(), st = curState();
  const need = def.mag - st.mag;
  const take = Math.min(need, st.reserve);
  st.mag += take; st.reserve -= take;
  weaponState.reloading = false;
  const ind = document.getElementById('reloadIndicator'); if(ind) ind.style.opacity='0';
}

function fireWeapon(){
  if(!E.player.alive || E.frozen || meleeActive) return;
  const def = curDef(), st = curState();
  if(weaponState.reloading || weaponState.fireCooldown>0 || st.mag<=0 || switching) return;
  st.mag--; weaponState.fireCooldown = def.fireRate;
  lastShotAt = performance.now();
  E.player.shots++;

  recoilPitch = Math.min(0.34, recoilPitch + (weaponState.isADS ? def.recoilADS : def.recoil));
  weaponKick = 1; flashTimer=0.05;
  if(def.boom) GW.Audio.playBoom(weaponState.isADS?0.3:0.4); else GW.Audio.playShot(weaponState.isADS?0.4:0.55, def.pitchMul);

  const origin = new THREE.Vector3(); camera.getWorldPosition(origin);
  const muzzleWorld = new THREE.Vector3(); flashMesh.getWorldPosition(muzzleWorld);
  const baseDir = new THREE.Vector3(); camera.getWorldDirection(baseDir);
  if(GW.Effects) GW.Effects.spawnMuzzleFlash(muzzleWorld, baseDir);

  const targets = [];
  E.bots.forEach(b=>{ if(isValidPlayerTarget(b)) targets.push(...b.allMeshes); });
  const allTargets = targets.concat(E.raycastTargets);
  const spreadBase = weaponState.isADS ? def.spreadADS : (E.keys['ShiftLeft']||E.keys['ShiftRight'] ? def.spreadMove : def.spread);

  let anyHit=false;
  for(let p=0;p<def.pellets;p++){
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    dir.x += (Math.random()*2-1)*spreadBase;
    dir.y += (Math.random()*2-1)*spreadBase;
    dir.z += (Math.random()*2-1)*spreadBase;
    dir.normalize();
    raycaster.set(origin, dir); raycaster.far = def.range;
    const hits = raycaster.intersectObjects(allTargets, false);
    let endPoint = origin.clone().addScaledVector(dir, Math.min(40,def.range));
    if(hits.length>0){
      endPoint = hits[0].point;
      const bot = hits[0].object.userData.bot;
      const isBotHit = !!(bot && bot.alive);
      if(isBotHit){
        const dmg = hits[0].object===bot.head ? def.dmgHead : def.dmgBody;
        const died = GW.Bots.damage(bot, dmg);
        anyHit = true;
        if(died) killBot(bot, 'player', null);
      }
      if(GW.Effects){
        const worldNormal = hits[0].face ? hits[0].face.normal.clone().transformDirection(hits[0].object.matrixWorld) : null;
        GW.Effects.spawnBulletImpact(endPoint, worldNormal, isBotHit);
      }
    }
    if(p<4) spawnTracer(muzzleWorld, endPoint);
  }
  if(anyHit){ hitmarkerTimer=0.18; GW.Audio.playHitmarker(); E.player.hits++; }
}

function killBot(bot, killerKind, killerRef, isMelee){
  GW.Bots.kill(bot);
  if(GW.Effects) GW.Effects.spawnBloodPool(bot.group.position.clone());
  if(isMelee) addFeed('¡CUCHILLADO!');
  else addFeed(killerKind==='player' ? '+1 BAJA' : `${killerRef?killerRef.team==='A'?'ALIADO':'ENEMIGO':''} ELIMINÓ A UN OBJETIVO`);
  if(killerKind==='player'){
    E.player.kills++;
    if(GW.Effects) GW.Effects.spawnKillFlash();
    onPlayerStreakKill();
  }
  if(E.mode) E.mode.onCombatantKilled('bot', bot, killerKind, killerRef);
}

E.damageBot = function(bot, amount, attacker){
  const died = GW.Bots.damage(bot, amount);
  if(died){
    const isPlayer = attacker==='player';
    killBot(bot, isPlayer?'player':'bot', isPlayer?null:attacker);
  }
};
E.botMuzzleFlash = function(pos){
  botFlashLight.position.copy(pos); botFlashLight.intensity=2.2;
  setTimeout(()=>{botFlashLight.intensity=0;},60);
  if(GW.Effects) GW.Effects.spawnMuzzleFlash(pos, null);
};
const botFlashLight = new THREE.PointLight(0xffaa55,0,5,2);
scene.add(botFlashLight);

/* ============================= KILLSTREAKS ============================= */
const UAV_THRESHOLD = 3, AIRSTRIKE_THRESHOLD = 6, UAV_DURATION = 25;
const EXPLOSION_RADIUS = 9, EXPLOSION_MAX_DMG = 140;
E.streaks = { count:0, uavReady:false, airstrikeReady:false, uavTimeLeft:0 };
E.killstreaksEnabled = false;
let streakRequested = false, shakeAmount = 0;
const explosionLight = new THREE.PointLight(0xff8822,0,18,2);
scene.add(explosionLight);

function resetStreak(){
  E.streaks.count = 0; E.streaks.uavReady = false; E.streaks.airstrikeReady = false;
}
function onPlayerStreakKill(){
  E.streaks.count++;
  if(E.streaks.count>=UAV_THRESHOLD) E.streaks.uavReady = true;
  if(E.streaks.count>=AIRSTRIKE_THRESHOLD) E.streaks.airstrikeReady = true;
}

function activateUAV(){
  E.streaks.uavTimeLeft = UAV_DURATION;
  E.showBanner('UAV ACTIVADO', 'Enemigos revelados en el radar', 2000);
  GW.Audio.playBeep(650,0.22);
}

function buildPlaneMesh(){
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({color:0x3a4048, roughness:0.4, metalness:0.6});
  const fuselage = new THREE.Mesh(new THREE.BoxGeometry(1.0,0.9,6.5), bodyMat);
  const wing = new THREE.Mesh(new THREE.BoxGeometry(9,0.25,1.6), bodyMat);
  wing.position.z = 0.3;
  const tailWing = new THREE.Mesh(new THREE.BoxGeometry(3.2,0.2,1), bodyMat);
  tailWing.position.set(0,0.2,-2.9);
  const tailFin = new THREE.Mesh(new THREE.BoxGeometry(0.2,1.1,1.1), bodyMat);
  tailFin.position.set(0,0.7,-2.9);
  g.add(fuselage,wing,tailWing,tailFin);
  g.traverse(o=>{ if(o.isMesh){ o.castShadow=false; o.receiveShadow=false; } });
  return g;
}

const activeStrikes = [], activeBombs = [];
function spawnAirstrikePlane(targetX, targetZ){
  const dir = new THREE.Vector3(Math.random()*2-1, 0, Math.random()*2-1).normalize();
  const altitude = 34, half = 75, duration = 6.0;
  const start = new THREE.Vector3(targetX - dir.x*half, altitude, targetZ - dir.z*half);
  const end = new THREE.Vector3(targetX + dir.x*half, altitude, targetZ + dir.z*half);
  const plane = buildPlaneMesh();
  plane.position.copy(start);
  plane.lookAt(end);
  scene.add(plane);
  const bombs = [0.42,0.48,0.54,0.6].map(f=>({
    t: duration*f, x: targetX+(Math.random()*10-5), z: targetZ+(Math.random()*10-5), dropped:false
  }));
  activeStrikes.push({ plane, start, end, duration, elapsed:0, bombs });
}

function spawnBomb(x,z,startY){
  const geo = new THREE.CylinderGeometry(0.1,0.14,0.55,8);
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({color:0x1c1c1c, roughness:0.5, metalness:0.4}));
  mesh.rotation.x = Math.PI/2;
  mesh.position.set(x, startY, z);
  scene.add(mesh);
  const groundY = raycastGroundY(x,z);
  activeBombs.push({ mesh, x, z, startY, groundY, fallTime:0.7, elapsed:0 });
}

function explodeAt(x,z){
  const groundY = raycastGroundY(x,z);
  const pos = new THREE.Vector3(x, groundY+0.5, z);
  if(GW.Effects) GW.Effects.spawnExplosion(pos);
  GW.Audio.playBoom(0.6);

  explosionLight.position.set(x, groundY+2, z);
  explosionLight.intensity = 9;
  setTimeout(()=>{ explosionLight.intensity=0; }, 160);

  const distToPlayer = playerRig.position.distanceTo(pos);
  if(distToPlayer < 40) shakeAmount = Math.max(shakeAmount, (1-distToPlayer/40)*0.07);

  E.bots.forEach(b=>{
    if(!b.alive) return;
    const d = Math.hypot(b.group.position.x-x, b.group.position.z-z);
    if(d < EXPLOSION_RADIUS){
      const dmg = EXPLOSION_MAX_DMG * (1-d/EXPLOSION_RADIUS);
      const died = GW.Bots.damage(b, dmg);
      if(died) killBot(b, 'player', null);
    }
  });
  if(E.player.alive){
    const pd = Math.hypot(playerRig.position.x-x, playerRig.position.z-z);
    if(pd < EXPLOSION_RADIUS) E.damagePlayer(EXPLOSION_MAX_DMG*0.55*(1-pd/EXPLOSION_RADIUS), pos);
  }
}

function updateAirstrikes(dt){
  for(let i=activeStrikes.length-1;i>=0;i--){
    const s = activeStrikes[i];
    s.elapsed += dt;
    const t = Math.min(1, s.elapsed/s.duration);
    s.plane.position.lerpVectors(s.start, s.end, t);
    s.bombs.forEach(b=>{
      if(!b.dropped && s.elapsed>=b.t){ b.dropped=true; spawnBomb(b.x,b.z,s.plane.position.y); }
    });
    if(t>=1){
      scene.remove(s.plane);
      s.plane.traverse(o=>{ if(o.isMesh) o.geometry.dispose(); });
      activeStrikes.splice(i,1);
    }
  }
  for(let i=activeBombs.length-1;i>=0;i--){
    const b = activeBombs[i];
    b.elapsed += dt;
    const t = Math.min(1, b.elapsed/b.fallTime);
    b.mesh.position.y = THREE.MathUtils.lerp(b.startY, b.groundY+0.2, t*t);
    if(t>=1){
      scene.remove(b.mesh); b.mesh.geometry.dispose();
      activeBombs.splice(i,1);
      explodeAt(b.x, b.z);
    }
  }
}

function triggerAirstrike(){
  E.showBanner('ATAQUE AÉREO', 'Incoming...', 1800);
  GW.Audio.playBoom(0.25);
  const aliveEnemies = E.bots.filter(b=>b.alive && GW.Bots.hostile(E.player.team,b.team));
  let cx=0, cz=0;
  if(aliveEnemies.length>0){
    aliveEnemies.forEach(b=>{ cx+=b.group.position.x; cz+=b.group.position.z; });
    cx/=aliveEnemies.length; cz/=aliveEnemies.length;
  } else {
    const dir = new THREE.Vector3(); camera.getWorldDirection(dir);
    cx = playerRig.position.x + dir.x*15; cz = playerRig.position.z + dir.z*15;
  }
  spawnAirstrikePlane(cx, cz);
}

function tryUseStreak(){
  if(!E.killstreaksEnabled || !E.player.alive || E.frozen) return;
  if(E.streaks.airstrikeReady){ E.streaks.airstrikeReady=false; triggerAirstrike(); }
  else if(E.streaks.uavReady){ E.streaks.uavReady=false; activateUAV(); }
}

function updateStreakHud(){
  const el = document.getElementById('streakHud');
  if(!el || !E.killstreaksEnabled) { if(el) el.style.display='none'; return; }
  el.style.display = 'block';
  let label, pct;
  if(E.streaks.airstrikeReady){ label='[Q] ATAQUE AÉREO LISTO'; pct=100; }
  else if(E.streaks.uavReady){ label='[Q] UAV LISTO'; pct=Math.min(100, E.streaks.count/AIRSTRIKE_THRESHOLD*100); }
  else { label = `RACHA ${E.streaks.count}/${UAV_THRESHOLD}`; pct = Math.min(100, E.streaks.count/UAV_THRESHOLD*100); }
  el.innerHTML = `<div class="streak-label">${label}</div><div class="streak-bar"><i style="width:${pct}%"></i></div>`;
}

let hitDirTimeout=null;
function showHitDirection(attackerPos){
  const toAttacker = new THREE.Vector3().subVectors(attackerPos, playerRig.position); toAttacker.y=0;
  if(toAttacker.lengthSq()<0.0001) return;
  toAttacker.normalize();
  const forward = new THREE.Vector3(-Math.sin(yaw),0,-Math.cos(yaw));
  const right = new THREE.Vector3(Math.cos(yaw),0,-Math.sin(yaw));
  const angleDeg = Math.atan2(toAttacker.dot(right), toAttacker.dot(forward)) * 180/Math.PI;
  const hitDir = document.getElementById('hitDir');
  hitDir.style.transform = `translate(-50%,-50%) rotate(${angleDeg}deg)`;
  hitDir.style.opacity='1';
  clearTimeout(hitDirTimeout);
  hitDirTimeout = setTimeout(()=>{ hitDir.style.opacity='0'; }, 900);
}

E.damagePlayer = function(amount, attackerPos){
  if(!E.player.alive || E.frozen) return;
  if(performance.now() < (E.player.invulnUntil||0)) return; // brief spawn protection
  E.player.health -= amount;
  E.player.lastDamageTime = performance.now();
  vignetteFlash = 1.0;
  GW.Audio.playDamage();
  if(attackerPos) showHitDirection(attackerPos);
  if(E.player.health <= 0){
    E.player.health = 0;
    E.player.alive = false;
    E.player.deaths++;
    resetStreak();
    showCenterMsg('ELIMINADO', E.allowRespawn ? 'Reapareciendo...' : 'Esperando fin de la ronda');
    if(E.mode) E.mode.onCombatantKilled('player', null, 'bot', null);
    if(E.allowRespawn){ const myMatchId = E.matchId; setTimeout(()=>{ if(E.matchId===myMatchId) respawnPlayer(); }, 2200); }
  }
};

function respawnPlayer(){
  if(!E.matchActive) return;
  E.player.health = E.player.maxHealth;
  E.player.alive = true;
  E.player.invulnUntil = performance.now() + 1500;
  adsToggleState = false;
  weaponState.reloading = false; weaponState.isADS = false; weaponState.adsAmount = 0;
  const list = E.player.team==='A' ? (E.mapData.spawnsA||E.mapData.spawnsFFA) : (E.mapData.spawnsB||E.mapData.spawnsFFA);
  const sp = list[Math.floor(Math.random()*list.length)];
  playerRig.position.set(sp[0],0,sp[1]);
  feetY = raycastGroundY(sp[0],sp[1]);
  hideCenterMsg();
}
E.respawnAllForRound = function(){
  E.bots.forEach(b=>GW.Bots.respawn(b));
  E.player.health = E.player.maxHealth; E.player.alive = true;
  adsToggleState = false;
  weaponState.reloading = false; weaponState.isADS = false; weaponState.adsAmount = 0;
  const list = E.player.team==='A' ? E.mapData.spawnsA : E.mapData.spawnsB;
  const sp = list[Math.floor(Math.random()*list.length)];
  playerRig.position.set(sp[0],0,sp[1]);
  feetY = raycastGroundY(sp[0],sp[1]);
  Object.keys(E.weaponStates).forEach(k=>{
    const d = GW.getWeaponDef(k);
    E.weaponStates[k].mag = d.mag; E.weaponStates[k].reserve = d.reserve;
  });
  hideCenterMsg();
};

function showCenterMsg(text, sub){
  const el = document.getElementById('centerMsg');
  el.firstChild.textContent = text;
  document.getElementById('centerMsgSub').textContent = sub||'';
  el.style.opacity='1';
}
function hideCenterMsg(){ document.getElementById('centerMsg').style.opacity='0'; }

E.showBanner = function(text, sub, duration){
  const el = document.getElementById('banner');
  el.querySelector('.b-main').textContent = text;
  el.querySelector('.b-sub').textContent = sub||'';
  el.style.opacity='1'; el.style.transform='translate(-50%,-50%) scale(1.06)';
  setTimeout(()=>{ el.style.transform='translate(-50%,-50%) scale(1)'; },80);
  setTimeout(()=>{ el.style.opacity='0'; }, duration||2000);
};

function addFeed(text){
  const feed = document.getElementById('killFeed');
  const el = document.createElement('div');
  el.className='feedItem'; el.textContent=text;
  feed.appendChild(el);
  while(feed.children.length>5) feed.removeChild(feed.firstChild);
  setTimeout(()=>{ el.style.opacity='0'; setTimeout(()=>{ if(el.parentNode) el.parentNode.removeChild(el); },550); }, 2400);
}
E.addFeed = addFeed;

E.setModeHud = function(html){
  const el = document.getElementById('modeHud');
  if(el) el.innerHTML = html||'';
};
E.setInteractPrompt = function(label, progress01){
  const el = document.getElementById('interactPrompt');
  if(!el) return;
  el.style.opacity='1';
  el.querySelector('.ip-label').textContent = label;
  el.querySelector('.ip-fill').style.width = Math.max(0,Math.min(1,progress01))*100+'%';
};
E.clearInteractPrompt = function(){
  const el = document.getElementById('interactPrompt');
  if(el) el.style.opacity='0';
};

/* ============================= AMMO CRATES ============================= */
function updateAmmoCrates(dt){
  E.ammoCrates.forEach(c=>{
    if(c.cooldown>0){
      c.cooldown -= dt;
      c.mesh.material.emissive = new THREE.Color(0,0,0);
      c.mesh.scale.set(1,1,1);
      if(c.cooldown<=0) c.mesh.material.emissive = new THREE.Color(0x332b00);
      return;
    }
    c.mesh.rotation.y += dt*0.6;
    c.mesh.position.y = 0.35 + Math.sin(performance.now()*0.002)*0.05;
    c.mesh.material.emissive = new THREE.Color(0x332b00);
    if(!E.player.alive) return;
    const p = playerRig.position;
    const dist = Math.hypot(p.x-c.x, p.z-c.z);
    if(dist < 1.7){
      let refilled=false;
      E.loadout.forEach(k=>{
        const d = GW.getWeaponDef(k), st = E.weaponStates[k];
        if(st && st.reserve < d.reserve){ st.reserve = d.reserve; refilled=true; }
      });
      if(refilled){
        c.cooldown = 20;
        GW.Audio.playPickup();
        addFeed('MUNICIÓN REPUESTA');
      }
    }
  });
}

/* ============================= INPUT ============================= */
/* Dodge: double-tap a movement key within a short window for a quick burst of momentum. */
const DOUBLE_TAP_WINDOW = 280; // ms
const lastTapTime = {KeyW:-9999, KeyA:-9999, KeyS:-9999, KeyD:-9999};
const DODGE_KEYS = {KeyW:1, KeyA:1, KeyS:1, KeyD:1};
let dodgeRequestCode = null;

document.addEventListener('keydown',(e)=>{
  E.keys[e.code]=true;
  if(!E.matchActive || E.frozen) return;
  if(e.code==='Space'){ e.preventDefault(); jumpRequested=true; }
  if(e.code==='KeyR') startReload();
  if(e.code==='KeyV') meleeRequested = true;
  if(e.code==='KeyQ' && !e.repeat) streakRequested = true;
  if(!e.repeat && DODGE_KEYS[e.code]){
    const now = performance.now();
    if(now - lastTapTime[e.code] < DOUBLE_TAP_WINDOW) dodgeRequestCode = e.code;
    lastTapTime[e.code] = now;
  }
  if(!E.switchLocked){
    if(e.code==='Digit1') selectSlot(0);
    if(e.code==='Digit2') selectSlot(1);
  }
});
document.addEventListener('keyup',(e)=>{ E.keys[e.code]=false; });
window.addEventListener('wheel',(e)=>{
  if(!E.matchActive || E.frozen || switching || E.switchLocked) return;
  selectSlot(E.currentSlot===0?1:0);
});

let mouseLeftDown=false, mouseRightDown=false, firePressedEdge=false, rightPressedEdge=false, adsToggleState=false;
renderer.domElement.addEventListener('mousedown',(e)=>{
  if(!E.matchActive || E.frozen) return;
  if(e.button===0){ mouseLeftDown=true; firePressedEdge=true; }
  if(e.button===2){ mouseRightDown=true; rightPressedEdge=true; }
});
document.addEventListener('mouseup',(e)=>{
  if(e.button===0) mouseLeftDown=false;
  if(e.button===2) mouseRightDown=false;
});
document.addEventListener('contextmenu',(e)=>e.preventDefault());

let pointerJustLocked = false;
document.addEventListener('pointerlockchange', ()=>{
  if(document.pointerLockElement === renderer.domElement){
    E.frozen = false;
    pointerJustLocked = true;
    if(GW.menuHooks.onPointerLocked) GW.menuHooks.onPointerLocked();
  } else {
    mouseLeftDown=false; mouseRightDown=false;
    if(E.matchActive && !E._freezeExitsLock){
      E.frozen = true;
      if(GW.menuHooks.onPointerUnlocked) GW.menuHooks.onPointerUnlocked();
    }
    E._freezeExitsLock = false;
  }
});

const SENS = 0.0022;
const MAX_MOUSE_DELTA = 120;
document.addEventListener('mousemove',(e)=>{
  if(E.frozen || !E.matchActive) return;
  if(pointerJustLocked){
    // Chromium can report a huge spurious movementX/Y on the very first
    // sample right after pointer lock is acquired, snapping the camera.
    pointerJustLocked = false;
    return;
  }
  const dx = Math.max(-MAX_MOUSE_DELTA, Math.min(MAX_MOUSE_DELTA, e.movementX));
  const dy = Math.max(-MAX_MOUSE_DELTA, Math.min(MAX_MOUSE_DELTA, e.movementY));
  const fovRatio = camera.fov / BASE_FOV;
  const sensMul = weaponState.isADS ? Math.max(0.12, fovRatio) : 1.0;
  const userSens = (E.config && typeof E.config.sensitivity==='number') ? E.config.sensitivity : 1.0;
  const invert = (E.config && E.config.invertY) ? -1 : 1;
  yaw -= dx * SENS * sensMul * userSens;
  pitch -= dy * SENS * sensMul * userSens * invert;
  pitch = Math.max(-1.45, Math.min(1.45, pitch));
});

E.requestPointerLock = function(){
  GW.Audio.ensure();
  renderer.domElement.requestPointerLock = renderer.domElement.requestPointerLock || renderer.domElement.mozRequestPointerLock;
  renderer.domElement.requestPointerLock();
};
E.isPointerLocked = function(){
  return document.pointerLockElement === renderer.domElement;
};

/* ============================= HUD ============================= */
function updateHUD(dt){
  const hf = document.getElementById('healthBarFill');
  const hn = document.getElementById('healthNum');
  hf.style.width = E.player.health+'%';
  hn.textContent = Math.ceil(E.player.health);
  const hpRatio = E.player.health/100;
  hf.style.background = hpRatio>0.5 ? 'linear-gradient(90deg,#4a8f2e,#8fd94a)' : (hpRatio>0.25?'linear-gradient(90deg,#a08a2e,#e0c23f)':'linear-gradient(90deg,#8f2e2e,#e0453f)');

  const def = curDef(), st = curState();
  document.getElementById('weaponName').textContent = def.name;
  const magEl = document.getElementById('ammoMag'), resEl = document.getElementById('ammoReserve');
  magEl.textContent = st.mag; resEl.textContent = '/ '+st.reserve;
  magEl.style.color = st.mag===0 ? '#ff5c4d' : '#eafbd8';

  const w0 = document.getElementById('wslot0'), w1 = document.getElementById('wslot1');
  if(w0 && w1){
    w0.textContent = '1 '+GW.getWeaponDef(E.loadout[0]).name;
    w1.textContent = '2 '+GW.getWeaponDef(E.loadout[1]).name;
    w0.classList.toggle('active', E.currentSlot===0);
    w1.classList.toggle('active', E.currentSlot===1);
    w1.style.display = E.switchLocked ? 'none' : '';
  }

  vignetteFlash = Math.max(0, vignetteFlash - dt*1.8);
  const lowGlow = (1-hpRatio)*0.5;
  const totalGlow = Math.min(1, vignetteFlash*0.6 + lowGlow);
  document.getElementById('vignette').style.boxShadow = `inset 0 0 ${180+totalGlow*120}px ${40+totalGlow*60}px rgba(180,0,0,${totalGlow*0.65})`;

  const hm = document.getElementById('hitmarker');
  if(hitmarkerTimer>0){ hitmarkerTimer -= dt; hm.style.opacity = Math.min(1,hitmarkerTimer*6); } else hm.style.opacity=0;

  const scoped = def.sight==='scope';
  const dotSight = def.sight==='dot';
  const scopeOverlayEl = document.getElementById('scopeOverlay');
  scopeOverlayEl.style.opacity = scoped ? weaponState.adsAmount : 0;
  if(scoped){
    const size = (def.scopeSize||340)+'px';
    const circle = document.getElementById('scopeCircle'), crossV = document.getElementById('scopeCross'), crossH = document.getElementById('scopeCrossH');
    circle.style.width = size; circle.style.height = size;
    crossV.style.height = size; crossH.style.width = size;
  }
  const sightDotEl = document.getElementById('sightDot');
  if(sightDotEl) sightDotEl.style.opacity = dotSight ? Math.min(1, weaponState.adsAmount*1.6) : 0;
  document.getElementById('crosshair').style.opacity = (scoped||dotSight) ? Math.max(0,1-weaponState.adsAmount*3) : (1-weaponState.adsAmount*0.9);

  const gapPx = 6 + ((E.keys['ShiftLeft']||E.keys['ShiftRight'])&&!weaponState.isADS?18:0) + (weaponState.isADS?-4:8) + ((E.keys['ControlLeft']||E.keys['ControlRight'])?-2:0);
  const g = Math.max(2,gapPx);
  document.getElementById('ch-top').style.transform = `translateY(${-g}px)`;
  document.getElementById('ch-bottom').style.transform = `translateY(${g}px)`;
  document.getElementById('ch-left').style.transform = `translateX(${-g}px)`;
  document.getElementById('ch-right').style.transform = `translateX(${g}px)`;

  drawMinimap();
}

const mmCanvas = document.getElementById('minimap');
const mmCtx = mmCanvas ? mmCanvas.getContext('2d') : null;
const MM_BASE_RANGE = 55, MM_UAV_RANGE = 140;
function drawMinimap(){
  if(!mmCtx) return;
  const uavActive = E.streaks.uavTimeLeft>0;
  const mmRange = uavActive ? MM_UAV_RANGE : MM_BASE_RANGE;
  mmCtx.clearRect(0,0,170,170);
  mmCtx.fillStyle = 'rgba(20,26,16,0.5)'; mmCtx.fillRect(0,0,170,170);
  mmCtx.strokeStyle = 'rgba(120,150,100,0.15)';
  for(let i=1;i<4;i++){
    mmCtx.beginPath(); mmCtx.moveTo(i*170/4,0); mmCtx.lineTo(i*170/4,170); mmCtx.stroke();
    mmCtx.beginPath(); mmCtx.moveTo(0,i*170/4); mmCtx.lineTo(170,i*170/4); mmCtx.stroke();
  }
  const px = playerRig.position.x, pz = playerRig.position.z;
  const cos = Math.cos(-yaw), sin = Math.sin(-yaw);

  if(uavActive){
    const sweepAngle = (performance.now()*0.0018) % (Math.PI*2);
    mmCtx.save();
    mmCtx.translate(85,85);
    mmCtx.rotate(sweepAngle);
    mmCtx.fillStyle = 'rgba(59,160,255,0.22)';
    mmCtx.beginPath(); mmCtx.moveTo(0,0); mmCtx.arc(0,0,82,-0.35,0); mmCtx.closePath(); mmCtx.fill();
    mmCtx.restore();
  }

  E.bots.forEach(b=>{
    if(!b.alive) return;
    const dx = b.group.position.x-px, dz = b.group.position.z-pz;
    const d = Math.sqrt(dx*dx+dz*dz);
    if(d>mmRange) return;
    const rx = dx*cos-dz*sin, rz = dx*sin+dz*cos;
    const mx = 85+(rx/mmRange)*80, my = 85+(rz/mmRange)*80;
    const isAlly = !GW.Bots.hostile(E.player.team, b.team);
    mmCtx.fillStyle = isAlly ? '#3ba0ff' : (b.state==='attack'?'#ff3b30':(b.state==='chase'?'#ff9a30':(b.state==='search'?'#ffd23b':'#c96b3a')));
    mmCtx.beginPath(); mmCtx.arc(mx,my,4,0,Math.PI*2); mmCtx.fill();
  });

  if(E.mapData && E.mapData.bombSite){
    const s = E.mapData.bombSite;
    const dx = s.x-px, dz = s.z-pz;
    const d = Math.sqrt(dx*dx+dz*dz);
    if(d<mmRange){
      const rx = dx*cos-dz*sin, rz = dx*sin+dz*cos;
      const mx = 85+(rx/mmRange)*80, my = 85+(rz/mmRange)*80;
      mmCtx.fillStyle = '#ffd23b';
      mmCtx.save(); mmCtx.translate(mx,my); mmCtx.rotate(Math.PI/4); mmCtx.fillRect(-4,-4,8,8); mmCtx.restore();
    }
  }

  if(E.objectiveMarker){
    const o = E.objectiveMarker;
    const dx = o.x-px, dz = o.z-pz;
    const d = Math.sqrt(dx*dx+dz*dz) || 0.0001;
    const rx = dx*cos-dz*sin, rz = dx*sin+dz*cos;
    const pulse = 0.75 + Math.sin(performance.now()*0.006)*0.25;
    mmCtx.fillStyle = `rgba(255,176,32,${pulse})`;
    if(d<mmRange){
      const mx = 85+(rx/mmRange)*80, my = 85+(rz/mmRange)*80;
      mmCtx.save(); mmCtx.translate(mx,my); mmCtx.rotate(Math.PI/4); mmCtx.fillRect(-5,-5,10,10); mmCtx.restore();
    } else {
      // clamp to the ring edge as an arrow pointing toward the objective
      const ang = Math.atan2(rz, rx);
      const mx = 85+Math.cos(ang)*76, my = 85+Math.sin(ang)*76;
      mmCtx.save(); mmCtx.translate(mx,my); mmCtx.rotate(ang);
      mmCtx.beginPath(); mmCtx.moveTo(7,0); mmCtx.lineTo(-5,-5); mmCtx.lineTo(-5,5); mmCtx.closePath(); mmCtx.fill();
      mmCtx.restore();
    }
  }

  mmCtx.save(); mmCtx.translate(85,85); mmCtx.fillStyle = '#d2ffbe';
  mmCtx.beginPath(); mmCtx.moveTo(0,-8); mmCtx.lineTo(6,7); mmCtx.lineTo(-6,7); mmCtx.closePath(); mmCtx.fill();
  mmCtx.restore();
  mmCtx.strokeStyle = uavActive ? 'rgba(59,160,255,0.6)' : 'rgba(140,180,120,0.4)';
  mmCtx.beginPath(); mmCtx.arc(85,85,82,0,Math.PI*2); mmCtx.stroke();
}

/* ============================= DYNAMIC OBJECTS ============================= */
function updateDynamicObjects(dt){
  const now = performance.now();
  E.dynamicObjects.forEach(d=>{
    if(d.type==='rotate') d.obj.rotation.y += d.speed*dt;
    else if(d.type==='blink'){
      const on = Math.sin(now*0.006) > 0.5;
      d.mat.color.setHex(on?0xff2200:0x330000);
      d.light.intensity = on?1.6:0;
    } else if(d.type==='flag'){
      d.obj.rotation.y = Math.sin(now*0.003)*0.28;
      d.obj.rotation.z = Math.sin(now*0.005+1)*0.06;
    } else if(d.type==='elevator'){
      d.phase += dt*d.speed;
      d.obj.position.y = d.base + (Math.sin(d.phase)*0.5+0.5)*d.amp;
      d.obj.updateMatrixWorld(true);
    }
  });
  if(dustGeo){
    const posAttr = dustGeo.attributes.position;
    for(let i=0;i<DUST_COUNT;i++){
      let y = posAttr.array[i*3+1] + dt*0.15;
      if(y>10.2) y=0.2;
      posAttr.array[i*3+1]=y;
      posAttr.array[i*3] += Math.sin(now*0.0003+i)*0.002;
    }
    posAttr.needsUpdate = true;
  }
}

/* ============================= MAIN LOOP ============================= */
const clock = new THREE.Clock();
let footstepTimer=0, footstepBobTimer=0, currentSpeedFactor=0;

function animate(){
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  E.frameId = (E.frameId||0) + 1;
  if(!E.matchActive){ renderFrame(); return; }

  updateDynamicObjects(dt);
  updateAmmoCrates(dt);

  if(!E.frozen){
    updatePlayer(dt);
    E.bots.forEach(b=>GW.Bots.update(b,dt));
    if(E.mode) E.mode.update(dt);
  }

  const def = curDef(), st = curState();
  if(weaponState.fireCooldown>0) weaponState.fireCooldown -= dt;
  if(meleeCooldown>0) meleeCooldown -= dt;

  if(switching){
    switchTimer += dt;
    const t = Math.min(1, switchTimer/switchDuration);
    if(t>=0.5 && !switchSwapped){
      E.currentSlot = E._pendingSlot;
      rebuildWeaponModel();
      switchSwapped = true;
    }
    if(t>=1) switching=false;
  }

  if(weaponState.reloading){
    weaponState.reloadTimer += dt;
    if(weaponState.reloadTimer >= curDef().reloadTime) finishReload();
  }

  const adsModeToggle = E.config && E.config.adsMode==='toggle';
  if(rightPressedEdge && !E.frozen){
    if(adsModeToggle) adsToggleState = !adsToggleState;
  }
  rightPressedEdge = false;
  const wantsADS = adsModeToggle ? adsToggleState : mouseRightDown;
  weaponState.isADS = wantsADS && !weaponState.reloading && !switching && !E.frozen && !meleeActive;
  const adsTarget = weaponState.isADS ? 1 : 0;
  weaponState.adsAmount += (adsTarget-weaponState.adsAmount)*Math.min(1,dt*9);
  camera.fov = THREE.MathUtils.lerp(BASE_FOV, def.adsFov, weaponState.adsAmount);
  camera.updateProjectionMatrix();

  if(!E.frozen && !switching && !meleeActive && !E.inputLocked){
    const sprinting = E.keys['ShiftLeft']||E.keys['ShiftRight'];
    if(sprinting && mouseLeftDown){ E.keys['ShiftLeft']=false; E.keys['ShiftRight']=false; }
    if(def.auto && mouseLeftDown) fireWeapon();
    else if(!def.auto && firePressedEdge) fireWeapon();
    if(meleeRequested) performMelee();
    if(streakRequested) tryUseStreak();
  }
  firePressedEdge=false; meleeRequested=false; streakRequested=false;

  updateMelee(dt);
  if(!E.frozen) updateAirstrikes(dt);
  if(E.streaks.uavTimeLeft>0) E.streaks.uavTimeLeft = Math.max(0, E.streaks.uavTimeLeft-dt);
  updateStreakHud();
  shakeAmount *= Math.max(0, 1-dt*4.5);
  camera.rotation.z = (Math.random()*2-1)*shakeAmount*0.6;

  REST_POS.set(...def.rest); ADS_POS.set(...def.ads);
  const switchDip = switching ? Math.sin(Math.PI*Math.min(1,switchTimer/switchDuration))*0.42 : 0;
  const reloadT = weaponState.reloading ? Math.min(1, weaponState.reloadTimer/def.reloadTime) : 0;
  const reloadDip = Math.sin(Math.PI*reloadT)*0.14;
  const reloadTilt = Math.sin(Math.PI*reloadT)*0.55;
  const targetPos = new THREE.Vector3().lerpVectors(REST_POS, ADS_POS, weaponState.adsAmount);
  loweredAmount += ((E.weaponLowered?1:0)-loweredAmount)*Math.min(1,dt*5);
  targetPos.y -= loweredAmount*0.32; targetPos.z += loweredAmount*0.08; targetPos.x += loweredAmount*0.06;
  if(!meleeActive) weaponMount.position.lerp(targetPos, Math.min(1,dt*10));
  weaponMount.position.y -= switchDip + reloadDip;
  weaponMount.rotation.x = -loweredAmount*0.75;

  weaponKick += (0-weaponKick)*Math.min(1,dt*9);
  const idleT = performance.now()*0.0012;
  // Weapon sway/bob synced to the same footstep phase driving the camera bob,
  // scaled by movement intensity and damped while aiming down sights.
  const swaySuppress = 1 - weaponState.adsAmount;
  const walkIntensity = Math.min(1.3, currentSpeedFactor) * swaySuppress;
  const walkBobX = Math.sin(footstepBobTimer)*0.014*walkIntensity;
  const walkBobY = Math.abs(Math.sin(footstepBobTimer))*0.01*walkIntensity;
  const walkSwayZ = Math.sin(footstepBobTimer*0.5)*0.018*walkIntensity;
  if(!meleeActive){
    weaponModel.position.set(
      Math.sin(idleT)*0.004*swaySuppress + walkBobX,
      Math.sin(idleT*1.3)*0.0035*swaySuppress + walkBobY - weaponKick*0.02,
      -weaponKick*0.12
    );
    weaponModel.rotation.x = -weaponKick*0.16 + reloadTilt;
    weaponModel.rotation.z = Math.sin(idleT*0.7)*0.01*swaySuppress + walkSwayZ;
  }

  const sinceShot = performance.now() - lastShotAt;
  if(sinceShot > 220){ recoilPitch += (0-recoilPitch)*Math.min(1,dt*3.2); }

  if(flashTimer>0){ flashTimer -= dt; flashLight.intensity=3.2*(flashTimer/0.05); flashMat.opacity=flashTimer/0.05; }
  else { flashLight.intensity=0; flashMat.opacity=0; }

  tracerPool.forEach(t=>{
    if(t.life>0){ t.life -= dt; t.mesh.material.opacity=Math.max(0,t.life/0.07)*0.85; if(t.life<=0) t.mesh.visible=false; }
  });
  if(GW.Effects) GW.Effects.update(dt);

  if(E.player.alive && E.player.health<E.player.maxHealth && performance.now()-E.player.lastDamageTime>4000){
    E.player.health = Math.min(E.player.maxHealth, E.player.health + dt*12);
  }

  pitchObj.rotation.x = pitch + recoilPitch + (Math.random()*2-1)*shakeAmount*0.4;

  updateHUD(dt);
  renderFrame();
}

function updatePlayer(dt){
  const wantHeight = (E.keys['ControlLeft']||E.keys['ControlRight']) ? CROUCH_HEIGHT : STAND_HEIGHT;
  currentEyeHeight += (wantHeight-currentEyeHeight)*Math.min(1,dt*10);

  const def = curDef();
  const crouching = (E.keys['ControlLeft']||E.keys['ControlRight']);
  const sprintKey = E.keys['ShiftLeft']||E.keys['ShiftRight'];
  const isMoving = E.keys['KeyW']||E.keys['KeyA']||E.keys['KeyS']||E.keys['KeyD'];
  const canSprint = sprintKey && E.keys['KeyW'] && !crouching && !weaponState.isADS;
  let speed = crouching ? 2.6 : (canSprint ? 8.0 : 4.6);
  if(weaponState.isADS) speed *= def.adsMoveMul;

  // Straferunning: a speed bonus for combining forward/back with strafe input,
  // rewarding the classic diagonal-movement technique instead of penalizing it.
  const strafing = (E.keys['KeyA']||E.keys['KeyD']) && (E.keys['KeyW']||E.keys['KeyS']);
  if(strafing && !crouching) speed *= 1.15;

  const moveDir = new THREE.Vector3();
  if(E.keys['KeyW']) moveDir.z -= 1;
  if(E.keys['KeyS']) moveDir.z += 1;
  if(E.keys['KeyA']) moveDir.x -= 1;
  if(E.keys['KeyD']) moveDir.x += 1;
  if(moveDir.lengthSq()>0) moveDir.normalize();

  const sinY = Math.sin(yaw), cosY = Math.cos(yaw);
  const worldMove = new THREE.Vector3(
    moveDir.x*cosY + moveDir.z*sinY,
    0,
    -moveDir.x*sinY + moveDir.z*cosY
  );

  // Dodge: a double-tapped movement key fires a short decaying burst of
  // momentum in that direction (grounded, not crouching/ADS, cooldown-gated).
  if(dodgeCooldown>0) dodgeCooldown -= dt;
  if(dodgeRequestCode){
    const code = dodgeRequestCode; dodgeRequestCode = null;
    if(dodgeCooldown<=0 && grounded && !crouching && !weaponState.isADS){
      let lx=0, lz=0;
      if(code==='KeyA') lx=-1; else if(code==='KeyD') lx=1;
      else if(code==='KeyS') lz=1; else if(code==='KeyW') lz=-1;
      dodgeDir.set(lx*cosY+lz*sinY, 0, -lx*sinY+lz*cosY).normalize();
      dodgeTimer = DODGE_DURATION;
      dodgeCooldown = DODGE_COOLDOWN;
      GW.Audio.playSwitch();
    }
  }
  let dodgeMoveX=0, dodgeMoveZ=0;
  if(dodgeTimer>0){
    const dodgeSpeed = DODGE_SPEED * (dodgeTimer/DODGE_DURATION);
    dodgeMoveX = dodgeDir.x*dodgeSpeed*dt;
    dodgeMoveZ = dodgeDir.z*dodgeSpeed*dt;
    dodgeTimer -= dt;
  }

  const posObj = {
    x: playerRig.position.x+worldMove.x*speed*dt+dodgeMoveX,
    z: playerRig.position.z+worldMove.z*speed*dt+dodgeMoveZ
  };
  resolveHorizontalCollision(posObj, feetY, PLAYER_RADIUS, currentEyeHeight+0.15);
  playerRig.position.x = posObj.x; playerRig.position.z = posObj.z;

  const groundY = raycastGroundY(playerRig.position.x, playerRig.position.z, feetY+currentEyeHeight-0.1);
  if(grounded){
    if(groundY <= feetY+0.65){ feetY = groundY; verticalVelocity=0; } else { grounded=false; }
    if(jumpRequested){ verticalVelocity=6.0; grounded=false; }
  }
  if(!grounded){
    verticalVelocity -= 16.5*dt;
    feetY += verticalVelocity*dt;
    if(feetY<=groundY){ feetY=groundY; verticalVelocity=0; grounded=true; }
  }
  jumpRequested=false;

  playerRig.position.y = feetY;
  pitchObj.position.y = currentEyeHeight;

  const speedFactor = isMoving && grounded ? (canSprint?1.6:(crouching?0.6:1.0)) : 0;
  currentSpeedFactor = speedFactor;
  footstepBobTimer += dt*speedFactor*8;
  const bobY = speedFactor>0 ? Math.abs(Math.sin(footstepBobTimer))*0.045 : 0;
  const bobX = speedFactor>0 ? Math.sin(footstepBobTimer*0.5)*0.03 : 0;
  camera.position.set(bobX, bobY, 0);

  playerRig.rotation.y = yaw;

  if(speedFactor>0){
    footstepTimer -= dt;
    if(footstepTimer<=0){ GW.Audio.playFootstep(); footstepTimer = canSprint?0.28:(crouching?0.5:0.38); }
  } else footstepTimer=0;
}

/* ============================= MATCH LIFECYCLE ============================= */
E.freeze = function(){
  E.frozen = true;
  E._freezeExitsLock = true;
  if(document.exitPointerLock) document.exitPointerLock();
};

E.applyCrosshairSettings = function(config){
  const color = (config && config.crosshairColor) || '#d2ffbe';
  const scale = (config && config.crosshairSize) || 1.0;
  const style = (config && config.crosshairStyle) || 'crossdot';
  ['hud','crosshairPreview'].forEach(id=>{
    const n = document.getElementById(id);
    if(!n) return;
    n.style.setProperty('--ch-color', color);
    n.style.setProperty('--ch-scale', scale);
  });
  document.querySelectorAll('.ch-root').forEach(root=>{
    root.classList.remove('ch-style-cross','ch-style-dot','ch-style-circle');
    if(style==='cross'||style==='dot'||style==='circle') root.classList.add('ch-style-'+style);
  });
};

E.startMatch = function(config){
  E.matchId++;
  E.config = config;
  applyGraphicsQuality(config.graphicsQuality);
  E.applyCrosshairSettings(config);
  BASE_FOV = config.fov || 75;
  camera.fov = BASE_FOV;
  camera.updateProjectionMatrix();
  if(GW.Effects) GW.Effects.setGoreEnabled(config.gore !== false);
  const minimapEl = document.getElementById('minimapWrap');
  if(minimapEl) minimapEl.style.display = config.showMinimap===false ? 'none' : '';
  adsToggleState = false;
  E.killstreaksEnabled = config.modeId !== 'snd';
  resetStreak();
  E.streaks.uavTimeLeft = 0;
  activeStrikes.forEach(s=>{ scene.remove(s.plane); s.plane.traverse(o=>{ if(o.isMesh) o.geometry.dispose(); }); });
  activeBombs.forEach(b=>{ scene.remove(b.mesh); b.mesh.geometry.dispose(); });
  activeStrikes.length = 0; activeBombs.length = 0;
  const mapDef = GW.getMap(config.mapId);
  loadMap(mapDef);

  E.player.health = E.player.maxHealth = 100;
  E.player.kills = 0; E.player.deaths = 0; E.player.alive = true; E.player.team = 'A';
  E.player.lastDamageTime = -99999;
  E.player.shots = 0; E.player.hits = 0; E.player.invulnUntil = 0;
  E.inputLocked = false; E.weaponLowered = false; E.objectiveMarker = null;
  const hudEl = document.getElementById('hud'); if(hudEl) hudEl.classList.remove('talking');

  E.loadout = [config.primaryWeapon, 'pistol'];
  E.currentSlot = 0; E.switchLocked = false;
  E.weaponStates = {};
  E.loadout.forEach(k=>{ const d=GW.getWeaponDef(k); E.weaponStates[k] = {mag:d.mag, reserve:d.reserve}; });
  rebuildWeaponModel();
  weaponMount.position.set(...curDef().rest);

  const modeMeta = GW.MODE_META.find(m=>m.id===config.modeId);
  const teamsMode = modeMeta.teams;
  const spawnsFFA = E.mapData.spawnsFFA;
  const spawnsA = E.mapData.spawnsA || spawnsFFA;
  const spawnsB = E.mapData.spawnsB || spawnsFFA;

  if(config.modeId !== 'campaign'){
    // Campaign scripts its own wave-by-wave bot roster (see js/campaign.js);
    // it must start with zero pre-spawned enemies.
    for(let i=0;i<config.botCount;i++){
      let team;
      if(teamsMode){ team = i < Math.floor(config.botCount/2) ? 'A' : 'B'; }
      else team = 'B';
      const list = team==='A' ? spawnsA : spawnsB;
      E.bots.push(GW.Bots.create(team, config.difficulty, teamsMode ? list : spawnsFFA));
    }
  }

  const sp = spawnsA[Math.floor(Math.random()*spawnsA.length)];
  playerRig.position.set(sp[0],0,sp[1]);
  feetY = raycastGroundY(sp[0],sp[1]);
  yaw = 0; pitch = 0; recoilPitch = 0;

  E.mode = GW.MODE_FACTORIES[config.modeId]();
  E.allowRespawn = E.mode.allowRespawn;
  E.allowBotRespawn = E.mode.allowBotRespawn !== undefined ? E.mode.allowBotRespawn : E.mode.allowRespawn;
  E.mode.init();

  hideCenterMsg();
  E.clearInteractPrompt();
  E.matchActive = true;
  E.frozen = true;
  clock.getDelta();
};

E.quitMatch = function(){
  E.matchActive = false;
  E.frozen = true;
  E.matchId++;
  activeStrikes.forEach(s=>{ scene.remove(s.plane); s.plane.traverse(o=>{ if(o.isMesh) o.geometry.dispose(); }); });
  activeBombs.forEach(b=>{ scene.remove(b.mesh); b.mesh.geometry.dispose(); });
  activeStrikes.length = 0; activeBombs.length = 0;
  teardownMap();
};

animate();
})();
