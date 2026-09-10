window.GW = window.GW || {};

/* =====================================================================
   GW.Effects — real-time GLSL-shader-driven combat visual effects.
   Pure THREE.js core (r128 global build): THREE.Points + THREE.ShaderMaterial
   for bullet impacts / melee slashes / muzzle flashes, plus a pooled DOM
   overlay pulse for kill confirmation (no postprocessing pipeline exists).

   Public surface:
     GW.Effects.init()
     GW.Effects.update(dt)
     GW.Effects.spawnBulletImpact(position, normalOrNull, isBot)
     GW.Effects.spawnMuzzleFlash(position, direction)
     GW.Effects.spawnKillFlash()
     GW.Effects.spawnMeleeSlash(position)

   Everything object-pooled at init time; steady-state calls only touch
   typed-array contents and uniform values, no per-frame allocation.
   ===================================================================== */

GW.Effects = (function(){
  "use strict";

  let inited = false;

  /* ---------------------------------------------------------------------
     Pool sizes / tuning
     --------------------------------------------------------------------- */
  const IMPACT_POOL_SIZE   = 24;   // pooled THREE.Points bursts (bullet impacts + melee slashes share this pool)
  const IMPACT_PARTICLES   = 16;   // particles per burst (within 12-20 budget)
  const MUZZLE_POOL_SIZE   = 6;    // pooled billboard planes
  const POOL_DECAL_SIZE    = 16;   // pooled ground blood-pool decals

  const BOT_HIT_COLOR   = 0x6b332f; // muted, desaturated blood red — not neon-saturated
  const WALL_HIT_COLOR  = 0xfff2b0; // yellow-white sparks
  const MELEE_COLOR     = 0x5c2a26; // slightly darker/muted red slash spray for the knife
  let goreEnabled = true;

  /* ---------------------------------------------------------------------
     Reusable scratch objects (never allocated inside hot paths)
     --------------------------------------------------------------------- */
  const UNIT_Z   = new THREE.Vector3(0,0,1);
  const WORLD_UP = new THREE.Vector3(0,1,0);
  const _axisV      = new THREE.Vector3();
  const _quatFromZ  = new THREE.Quaternion();
  const _dirV       = new THREE.Vector3();
  const _meleeDir    = new THREE.Vector3();
  const _meleeAxis   = new THREE.Vector3();

  /* =======================================================================
     PARTICLE BURST (bullet impacts + melee slash) — THREE.Points, real GLSL
     ======================================================================= */

  const IMPACT_VERT = `
    attribute vec3 aVelocity;
    attribute float aSeed;
    uniform float uElapsed;
    uniform float uLife;
    uniform float uSize;
    uniform float uGravity;
    varying float vProgress;
    void main(){
      float t = clamp(uElapsed / uLife, 0.0, 1.0);
      vec3 pos = position + aVelocity * uElapsed;
      pos.y -= 0.5 * uGravity * uElapsed * uElapsed;
      vProgress = t;
      vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
      float shrink = 1.0 - t;
      float sizePx = uSize * (0.55 + 0.45 * aSeed) * shrink;
      gl_PointSize = max(1.0, sizePx * (300.0 / max(0.001, -mvPosition.z)));
      gl_Position = projectionMatrix * mvPosition;
    }
  `;

  const IMPACT_FRAG = `
    precision mediump float;
    uniform vec3 uColor;
    uniform float uOpacityMul;
    varying float vProgress;
    void main(){
      vec2 c = gl_PointCoord - vec2(0.5);
      float d = length(c);
      if(d > 0.5) discard;
      float soft = smoothstep(0.5, 0.05, d);
      float fade = 1.0 - vProgress;
      float alpha = soft * fade * fade * uOpacityMul;
      gl_FragColor = vec4(uColor, alpha);
    }
  `;

  const impactPool = [];
  let impactCursor = 0;

  function buildImpactPool(scene){
    for(let i=0;i<IMPACT_POOL_SIZE;i++){
      const geo = new THREE.BufferGeometry();
      const positions  = new Float32Array(IMPACT_PARTICLES*3);
      const velocities  = new Float32Array(IMPACT_PARTICLES*3);
      const seeds  = new Float32Array(IMPACT_PARTICLES);
      geo.setAttribute('position', new THREE.BufferAttribute(positions,3));
      geo.setAttribute('aVelocity', new THREE.BufferAttribute(velocities,3));
      geo.setAttribute('aSeed', new THREE.BufferAttribute(seeds,1));

      const mat = new THREE.ShaderMaterial({
        uniforms:{
          uElapsed:{ value:0 },
          uLife:{ value:0.5 },
          uSize:{ value:46 },
          uGravity:{ value:2.4 },
          uColor:{ value:new THREE.Color(0xffffff) },
          uOpacityMul:{ value:1.0 }
        },
        vertexShader: IMPACT_VERT,
        fragmentShader: IMPACT_FRAG,
        transparent: true,
        depthWrite: false,
        depthTest: true,
        blending: THREE.AdditiveBlending
      });

      const pts = new THREE.Points(geo, mat);
      pts.frustumCulled = false;
      pts.visible = false;
      scene.add(pts);
      impactPool.push({ points:pts, geo:geo, mat:mat, elapsed:0, life:0.5, active:false });
    }
  }

  // Fills a burst slot's attributes and activates it. `axis` (optional
  // THREE.Vector3-like) biases particle directions outward around itself;
  // when omitted, particles scatter into the world-up hemisphere.
  function spawnBurst(position, axis, colorHex, opts){
    if(!inited) return;
    opts = opts || {};
    const speedMin  = opts.speedMin  !== undefined ? opts.speedMin  : 1.4;
    const speedMax  = opts.speedMax  !== undefined ? opts.speedMax  : 3.4;
    const life      = opts.life      !== undefined ? opts.life      : 0.45;
    const size      = opts.size      !== undefined ? opts.size      : 46;
    const gravity   = opts.gravity   !== undefined ? opts.gravity   : 2.4;
    const halfAngle = opts.halfAngle !== undefined ? opts.halfAngle : 1.15;
    const blending  = opts.blending  !== undefined ? opts.blending  : THREE.AdditiveBlending;
    const opacityMul = opts.opacityMul !== undefined ? opts.opacityMul : 1.0;

    const slot = impactPool[impactCursor];
    impactCursor = (impactCursor + 1) % impactPool.length;

    if(axis && (axis.x || axis.y || axis.z)){
      _axisV.copy(axis).normalize();
    } else {
      _axisV.copy(WORLD_UP);
    }
    _quatFromZ.setFromUnitVectors(UNIT_Z, _axisV);

    const posAttr = slot.geo.getAttribute('position');
    const velAttr = slot.geo.getAttribute('aVelocity');
    const seedAttr = slot.geo.getAttribute('aSeed');
    const cosHalf = Math.cos(halfAngle);

    for(let i=0;i<IMPACT_PARTICLES;i++){
      const z = cosHalf + Math.random()*(1-cosHalf);
      const theta = Math.acos(THREE.MathUtils.clamp(z,-1,1));
      const phi = Math.random()*Math.PI*2;
      const sinTheta = Math.sin(theta);
      _dirV.set(sinTheta*Math.cos(phi), sinTheta*Math.sin(phi), z);
      _dirV.applyQuaternion(_quatFromZ);

      const speed = speedMin + Math.random()*(speedMax-speedMin);
      const idx = i*3;
      velAttr.array[idx]   = _dirV.x * speed;
      velAttr.array[idx+1] = _dirV.y * speed;
      velAttr.array[idx+2] = _dirV.z * speed;
      posAttr.array[idx]   = 0;
      posAttr.array[idx+1] = 0;
      posAttr.array[idx+2] = 0;
      seedAttr.array[i] = Math.random();
    }
    posAttr.needsUpdate = true;
    velAttr.needsUpdate = true;
    seedAttr.needsUpdate = true;

    slot.points.position.copy(position);
    slot.points.visible = true;
    slot.active = true;
    slot.elapsed = 0;
    slot.life = life;
    slot.mat.uniforms.uElapsed.value = 0;
    slot.mat.uniforms.uLife.value = life;
    slot.mat.uniforms.uSize.value = size;
    slot.mat.uniforms.uGravity.value = gravity;
    slot.mat.uniforms.uColor.value.setHex(colorHex);
    slot.mat.uniforms.uOpacityMul.value = opacityMul;
    if(slot.mat.blending !== blending){ slot.mat.blending = blending; slot.mat.needsUpdate = true; }
  }

  function spawnBulletImpact(position, normalOrNull, isBot){
    ensureInit();
    if(!inited) return;
    if(isBot && goreEnabled){
      // Blood spatter: normal-blended (not glowing), muted/desaturated red,
      // heavier gravity so droplets arc and fall rather than hang like sparks.
      spawnBurst(position, normalOrNull, BOT_HIT_COLOR, {
        speedMin:1.7, speedMax:3.8, life:0.5, size:26, gravity:6.5, halfAngle:1.3,
        blending: THREE.NormalBlending, opacityMul:0.62
      });
      spawnBloodPool(position);
    } else if(isBot){
      // Gore disabled: neutral spark hit-confirm instead of blood.
      spawnBurst(position, normalOrNull, WALL_HIT_COLOR, {
        speedMin:1.8, speedMax:3.8, life:0.4, size:34, gravity:3.2, halfAngle:1.1,
        blending: THREE.AdditiveBlending, opacityMul:0.85
      });
    } else {
      spawnBurst(position, normalOrNull, WALL_HIT_COLOR, {
        speedMin:2.0, speedMax:4.6, life:0.38, size:40, gravity:3.6, halfAngle:1.0,
        blending: THREE.AdditiveBlending, opacityMul:1.0
      });
    }
  }

  function spawnMeleeSlash(position){
    ensureInit();
    if(!inited) return;
    if(!goreEnabled){
      spawnBurst(position, null, WALL_HIT_COLOR, {
        speedMin:2.2, speedMax:4.2, life:0.35, size:32, gravity:2.6, halfAngle:0.7,
        blending: THREE.AdditiveBlending, opacityMul:0.85
      });
      return;
    }
    let axis = null;
    const camera = GW.engine && GW.engine.camera;
    if(camera){
      camera.getWorldDirection(_meleeDir);
      _meleeAxis.crossVectors(_meleeDir, WORLD_UP);
      if(_meleeAxis.lengthSq() < 0.0001) _meleeAxis.set(1,0,0);
      _meleeAxis.normalize();
      axis = _meleeAxis;
    }
    spawnBurst(position, axis, MELEE_COLOR, {
      speedMin:2.4, speedMax:4.4, life:0.4, size:28, gravity:5.5, halfAngle:0.6,
      blending: THREE.NormalBlending, opacityMul:0.68
    });
    spawnBloodPool(position);
  }

  /* =======================================================================
     BLOOD POOL DECAL — a flat ground-level splat under the hit, so blood
     visibly stains the terrain rather than only spraying as particles.
     ======================================================================= */

  let bloodTex = null;
  function buildBloodTexture(){
    const c = document.createElement('canvas'); c.width = 128; c.height = 128;
    const ctx = c.getContext('2d');
    ctx.clearRect(0,0,128,128);
    const cx = 64, cy = 64;
    for(let i=0;i<7;i++){
      const ang = Math.random()*Math.PI*2;
      const dist = Math.random()*14;
      const rx = 20 + Math.random()*26;
      const ry = 20 + Math.random()*26;
      const grad = ctx.createRadialGradient(
        cx+Math.cos(ang)*dist, cy+Math.sin(ang)*dist, 0,
        cx+Math.cos(ang)*dist, cy+Math.sin(ang)*dist, Math.max(rx,ry)
      );
      grad.addColorStop(0, 'rgba(58,26,23,0.68)');
      grad.addColorStop(0.55, 'rgba(66,32,28,0.5)');
      grad.addColorStop(1, 'rgba(66,32,28,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(cx+Math.cos(ang)*dist, cy+Math.sin(ang)*dist, rx, ry, Math.random()*Math.PI, 0, Math.PI*2);
      ctx.fill();
    }
    const tex = new THREE.CanvasTexture(c);
    if(THREE.sRGBEncoding !== undefined) tex.encoding = THREE.sRGBEncoding;
    return tex;
  }

  const decalPool = [];
  let decalCursor = 0;

  function buildDecalPool(scene){
    bloodTex = buildBloodTexture();
    const geo = new THREE.PlaneGeometry(1,1);
    for(let i=0;i<POOL_DECAL_SIZE;i++){
      const mat = new THREE.MeshBasicMaterial({
        map: bloodTex, transparent:true, opacity:0, depthWrite:false, side:THREE.DoubleSide
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.rotation.x = -Math.PI/2;
      mesh.frustumCulled = false;
      mesh.visible = false;
      mesh.renderOrder = 1;
      scene.add(mesh);
      decalPool.push({ mesh:mesh, mat:mat, elapsed:0, fadeIn:0.15, targetOpacity:0.85, active:false });
    }
  }

  function spawnBloodPool(position){
    if(!inited || !goreEnabled) return;
    const E = GW.engine;
    let groundY = position.y;
    if(E && typeof E.raycastGroundY === 'function'){
      groundY = E.raycastGroundY(position.x, position.z);
    }
    const slot = decalPool[decalCursor];
    decalCursor = (decalCursor + 1) % decalPool.length;

    const scale = 0.7 + Math.random()*0.6;
    slot.mesh.position.set(position.x, groundY + 0.02, position.z);
    slot.mesh.rotation.z = Math.random()*Math.PI*2;
    slot.mesh.scale.set(scale, scale, 1);
    slot.mesh.visible = true;
    slot.active = true;
    slot.elapsed = 0;
    slot.targetOpacity = 0.42 + Math.random()*0.12;
    slot.mat.opacity = 0;
  }

  /* =======================================================================
     MUZZLE FLASH — camera-facing billboard plane, real GLSL radial glow
     ======================================================================= */

  const MUZZLE_VERT = `
    varying vec2 vUv;
    void main(){
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;

  const MUZZLE_FRAG = `
    precision mediump float;
    varying vec2 vUv;
    uniform float uElapsed;
    uniform float uLife;
    uniform float uSeed;
    float hash(float n){ return fract(sin(n)*43758.5453123); }
    void main(){
      vec2 c = (vUv - vec2(0.5)) * 2.0;
      float d = length(c);
      float t = clamp(uElapsed / uLife, 0.0, 1.0);
      float core = smoothstep(0.85, 0.0, d);
      float glow = smoothstep(1.0, 0.1, d);
      float flicker = 0.7 + 0.3 * fract(sin((uElapsed*90.0 + uSeed) * 12.9898) * 43758.5453);
      vec3 colCore = vec3(1.0, 0.97, 0.82);
      vec3 colEdge = vec3(1.0, 0.42, 0.06);
      vec3 col = mix(colEdge, colCore, core);
      float alpha = glow * flicker * (1.0 - t);
      if(alpha < 0.015) discard;
      gl_FragColor = vec4(col, alpha);
    }
  `;

  const muzzlePool = [];
  let muzzleCursor = 0;

  function buildMuzzlePool(scene){
    const geo = new THREE.PlaneGeometry(1,1);
    for(let i=0;i<MUZZLE_POOL_SIZE;i++){
      const mat = new THREE.ShaderMaterial({
        uniforms:{
          uElapsed:{ value:0 },
          uLife:{ value:0.08 },
          uSeed:{ value:0 }
        },
        vertexShader: MUZZLE_VERT,
        fragmentShader: MUZZLE_FRAG,
        transparent: true,
        depthWrite: false,
        depthTest: true,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.frustumCulled = false;
      mesh.visible = false;
      scene.add(mesh);
      muzzlePool.push({ mesh:mesh, mat:mat, elapsed:0, life:0.08, active:false });
    }
  }

  function spawnMuzzleFlash(position, direction){
    ensureInit();
    if(!inited) return;
    const slot = muzzlePool[muzzleCursor];
    muzzleCursor = (muzzleCursor + 1) % muzzlePool.length;

    const size = 0.15 + Math.random()*0.15; // 0.15 - 0.30
    slot.mesh.scale.set(size, size, 1);
    slot.mesh.position.copy(position);
    if(direction && (direction.x || direction.y || direction.z)){
      slot.mesh.position.addScaledVector(direction, size*0.2);
    }
    const camera = GW.engine && GW.engine.camera;
    if(camera) slot.mesh.quaternion.copy(camera.quaternion);

    slot.mesh.visible = true;
    slot.active = true;
    slot.elapsed = 0;
    slot.life = 0.06 + Math.random()*0.04; // 0.06 - 0.10
    slot.mat.uniforms.uElapsed.value = 0;
    slot.mat.uniforms.uLife.value = slot.life;
    slot.mat.uniforms.uSeed.value = Math.random()*100;
  }

  /* =======================================================================
     KILL FLASH — DOM/CSS screen pulse (no postprocessing pipeline available)
     ======================================================================= */

  const KILL_FLASH_ID = 'gwKillFlash';
  const KILL_FLASH_CLASS = 'gw-kill-flash-active';
  const KILL_FLASH_DURATION = 220; // ms — must match the CSS keyframes duration
  let killFlashTimer = null;

  function spawnKillFlash(){
    const el = document.getElementById(KILL_FLASH_ID);
    if(!el) return;
    if(killFlashTimer){ clearTimeout(killFlashTimer); killFlashTimer = null; }
    el.classList.remove(KILL_FLASH_CLASS);
    void el.offsetWidth; // force reflow so the animation restarts on rapid consecutive kills
    el.classList.add(KILL_FLASH_CLASS);
    killFlashTimer = setTimeout(function(){
      el.classList.remove(KILL_FLASH_CLASS);
      killFlashTimer = null;
    }, KILL_FLASH_DURATION);
  }

  /* =======================================================================
     INIT / UPDATE
     ======================================================================= */

  function ensureInit(){
    if(inited) return;
    if(!GW.engine || !GW.engine.scene) return;
    const scene = GW.engine.scene;
    buildImpactPool(scene);
    buildMuzzlePool(scene);
    buildDecalPool(scene);
    inited = true;
  }

  function init(){
    ensureInit();
  }

  function update(dt){
    if(!inited) return;

    for(let i=0;i<impactPool.length;i++){
      const slot = impactPool[i];
      if(!slot.active) continue;
      slot.elapsed += dt;
      if(slot.elapsed >= slot.life){
        slot.active = false;
        slot.points.visible = false;
        continue;
      }
      slot.mat.uniforms.uElapsed.value = slot.elapsed;
    }

    const camera = GW.engine && GW.engine.camera;
    for(let i=0;i<muzzlePool.length;i++){
      const slot = muzzlePool[i];
      if(!slot.active) continue;
      slot.elapsed += dt;
      if(slot.elapsed >= slot.life){
        slot.active = false;
        slot.mesh.visible = false;
        continue;
      }
      slot.mat.uniforms.uElapsed.value = slot.elapsed;
      if(camera) slot.mesh.quaternion.copy(camera.quaternion);
    }

    for(let i=0;i<decalPool.length;i++){
      const slot = decalPool[i];
      if(!slot.active) continue;
      slot.elapsed += dt;
      if(slot.elapsed < slot.fadeIn){
        slot.mat.opacity = (slot.elapsed/slot.fadeIn) * slot.targetOpacity;
      } else {
        slot.mat.opacity = slot.targetOpacity;
        slot.active = false; // fade-in finished; stays visible (recycled later by the cursor)
      }
    }
  }

  function spawnBloodPoolPublic(position){
    ensureInit();
    spawnBloodPool(position);
  }

  function setGoreEnabled(v){ goreEnabled = !!v; }

  // Big omnidirectional fiery burst for airstrike/explosion impacts — reuses
  // the same pooled particle-burst system as bullet impacts (two overlapping
  // bursts: a wide slow outer blast plus a brighter, faster inner flash).
  function spawnExplosion(position){
    ensureInit();
    if(!inited) return;
    spawnBurst(position, null, 0xffaa33, {
      speedMin:4.5, speedMax:9.5, life:0.7, size:70, gravity:4.0, halfAngle:Math.PI,
      blending: THREE.AdditiveBlending, opacityMul:1.0
    });
    spawnBurst(position, null, 0xfff2c0, {
      speedMin:2.0, speedMax:5.0, life:0.32, size:95, gravity:1.0, halfAngle:Math.PI,
      blending: THREE.AdditiveBlending, opacityMul:1.0
    });
  }

  return {
    init: init,
    update: update,
    spawnBulletImpact: spawnBulletImpact,
    spawnMuzzleFlash: spawnMuzzleFlash,
    spawnKillFlash: spawnKillFlash,
    spawnMeleeSlash: spawnMeleeSlash,
    spawnBloodPool: spawnBloodPoolPublic,
    setGoreEnabled: setGoreEnabled,
    spawnExplosion: spawnExplosion
  };

})();
