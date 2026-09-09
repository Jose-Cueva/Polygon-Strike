window.GW = window.GW || {};

(function(){
  const gunMat = new THREE.MeshStandardMaterial({color:0x1c1e1a, roughness:0.4, metalness:0.7});
  const gunMatLight = new THREE.MeshStandardMaterial({color:0x33362f, roughness:0.5, metalness:0.5});
  const gunMatWood = new THREE.MeshStandardMaterial({color:0x5a3a20, roughness:0.6, metalness:0.1});
  const gunMatTan = new THREE.MeshStandardMaterial({color:0x8a7550, roughness:0.5, metalness:0.3});
  const gunMatSteel = new THREE.MeshStandardMaterial({color:0x555a5c, roughness:0.3, metalness:0.85});
  const scopeGlassMat = new THREE.MeshStandardMaterial({color:0x1a2a1a, roughness:0.2, metalness:0.8, emissive:0x0a1a0a});

  function buildRifleModel(){
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.09,0.12,0.55), gunMat); body.position.set(0,-0.02,-0.3);
    const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.04,0.04,0.35), gunMatLight); barrel.position.set(0,0.01,-0.68);
    const mag = new THREE.Mesh(new THREE.BoxGeometry(0.06,0.22,0.09), gunMat); mag.position.set(0,-0.17,-0.22); mag.rotation.x=0.25;
    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.07,0.09,0.22), gunMatLight); stock.position.set(0,-0.02,0.05);
    const sight = new THREE.Mesh(new THREE.BoxGeometry(0.03,0.06,0.08), gunMat); sight.position.set(0,0.08,-0.25);
    g.add(body,barrel,mag,stock,sight);
    return g;
  }

  function buildShotgunModel(){
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.1,0.13,0.4), gunMatWood); body.position.set(0,-0.03,-0.18);
    const barrelL = new THREE.Mesh(new THREE.CylinderGeometry(0.028,0.028,0.5,8), gunMatLight); barrelL.rotation.x=Math.PI/2; barrelL.position.set(-0.025,0.02,-0.5);
    const barrelR = barrelL.clone(); barrelR.position.x = 0.025;
    const pump = new THREE.Mesh(new THREE.BoxGeometry(0.075,0.075,0.16), gunMat); pump.position.set(0,-0.02,-0.42);
    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.08,0.11,0.26), gunMatWood); stock.position.set(0,-0.03,0.12);
    g.add(body,barrelL,barrelR,pump,stock);
    return g;
  }

  function buildSniperModel(){
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.075,0.1,0.62), gunMat); body.position.set(0,-0.03,-0.25);
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.02,0.02,0.55,8), gunMatLight); barrel.rotation.x=Math.PI/2; barrel.position.set(0,0,-0.78);
    const mag = new THREE.Mesh(new THREE.BoxGeometry(0.05,0.14,0.07), gunMat); mag.position.set(0,-0.13,-0.15); mag.rotation.x=0.2;
    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.06,0.1,0.3), gunMatTan); stock.position.set(0,-0.03,0.18);
    const scopeTube = new THREE.Mesh(new THREE.CylinderGeometry(0.032,0.032,0.34,10), scopeGlassMat); scopeTube.rotation.x=Math.PI/2; scopeTube.position.set(0,0.11,-0.3);
    const scopeLensFront = new THREE.Mesh(new THREE.CylinderGeometry(0.034,0.034,0.01,10), gunMatSteel); scopeLensFront.rotation.x=Math.PI/2; scopeLensFront.position.set(0,0.11,-0.465);
    const scopeMountA = new THREE.Mesh(new THREE.BoxGeometry(0.02,0.05,0.02), gunMat); scopeMountA.position.set(0,0.06,-0.4);
    const scopeMountB = scopeMountA.clone(); scopeMountB.position.z = -0.2;
    const bolt = new THREE.Mesh(new THREE.BoxGeometry(0.03,0.03,0.1), gunMatLight); bolt.position.set(0.06,-0.01,0.02); bolt.rotation.z=0.3;
    const bipod = new THREE.Mesh(new THREE.BoxGeometry(0.015,0.16,0.015), gunMatSteel); bipod.position.set(0,-0.11,-0.68); bipod.rotation.z=0.2;
    g.add(body,barrel,mag,stock,scopeTube,scopeLensFront,scopeMountA,scopeMountB,bolt,bipod);
    return g;
  }

  function buildPistolModel(){
    const g = new THREE.Group();
    const slide = new THREE.Mesh(new THREE.BoxGeometry(0.055,0.075,0.28), gunMatSteel); slide.position.set(0,0.02,-0.15);
    const barrelTip = new THREE.Mesh(new THREE.CylinderGeometry(0.014,0.014,0.06,8), gunMat); barrelTip.rotation.x=Math.PI/2; barrelTip.position.set(0,0.025,-0.31);
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.05,0.16,0.09), gunMat); grip.position.set(0,-0.08,0.02); grip.rotation.x=-0.12;
    const trigger = new THREE.Mesh(new THREE.BoxGeometry(0.015,0.03,0.02), gunMatLight); trigger.position.set(0,-0.02,-0.05);
    g.add(slide,barrelTip,grip,trigger);
    return g;
  }

  function buildSmgModel(){
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.08,0.11,0.34), gunMat); body.position.set(0,-0.02,-0.16);
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.02,0.02,0.16,8), gunMatLight); barrel.rotation.x=Math.PI/2; barrel.position.set(0,0.005,-0.4);
    const mag = new THREE.Mesh(new THREE.BoxGeometry(0.05,0.24,0.07), gunMat); mag.position.set(0,-0.19,-0.18); mag.rotation.x=0.12;
    const stockA = new THREE.Mesh(new THREE.BoxGeometry(0.02,0.05,0.2), gunMatSteel); stockA.position.set(0,0.005,0.16);
    const stockB = new THREE.Mesh(new THREE.BoxGeometry(0.02,0.08,0.02), gunMatSteel); stockB.position.set(0,-0.02,0.25);
    const sight = new THREE.Mesh(new THREE.BoxGeometry(0.025,0.045,0.05), gunMatLight); sight.position.set(0,0.065,-0.2);
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.04,0.1,0.05), gunMat); grip.position.set(0,-0.1,-0.32); grip.rotation.x=-0.2;
    g.add(body,barrel,mag,stockA,stockB,sight,grip);
    return g;
  }

  function buildDmrModel(){
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.08,0.1,0.56), gunMat); body.position.set(0,-0.02,-0.24);
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.018,0.018,0.4,8), gunMatLight); barrel.rotation.x=Math.PI/2; barrel.position.set(0,0.005,-0.7);
    const mag = new THREE.Mesh(new THREE.BoxGeometry(0.055,0.18,0.08), gunMat); mag.position.set(0,-0.15,-0.18); mag.rotation.x=0.18;
    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.065,0.09,0.26), gunMatTan); stock.position.set(0,-0.02,0.16);
    const scopeTube = new THREE.Mesh(new THREE.CylinderGeometry(0.026,0.026,0.24,10), scopeGlassMat); scopeTube.rotation.x=Math.PI/2; scopeTube.position.set(0,0.09,-0.28);
    const scopeMountA = new THREE.Mesh(new THREE.BoxGeometry(0.018,0.04,0.018), gunMat); scopeMountA.position.set(0,0.05,-0.35);
    const scopeMountB = scopeMountA.clone(); scopeMountB.position.z = -0.2;
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.04,0.11,0.05), gunMat); grip.position.set(0,-0.11,0.02); grip.rotation.x=-0.15;
    g.add(body,barrel,mag,stock,scopeTube,scopeMountA,scopeMountB,grip);
    return g;
  }

  GW.WEAPON_DEFS = [
    { key:'rifle', name:'RIFLE M4', icon:'🔫', mag:30, reserve:150, fireRate:0.1, auto:true,
      dmgBody:26, dmgHead:60, spread:0.012, spreadADS:0.003, spreadMove:0.03,
      recoil:0.024, recoilADS:0.014, adsFov:42, reloadTime:1.9, pellets:1, pitchMul:1, range:150,
      adsMoveMul:0.55, rest:[0.26,-0.24,-0.5], ads:[0,-0.09,-0.32], muzzle:[0,0.01,-0.9], boom:false,
      sight:'dot', build:buildRifleModel, desc:'Equilibrado, automático, versátil a media distancia.' },
    { key:'smg', name:'SUBFUSIL', icon:'⚡', mag:35, reserve:180, fireRate:0.07, auto:true,
      dmgBody:18, dmgHead:38, spread:0.016, spreadADS:0.005, spreadMove:0.032,
      recoil:0.016, recoilADS:0.009, adsFov:50, reloadTime:1.6, pellets:1, pitchMul:1.3, range:80,
      adsMoveMul:0.8, rest:[0.25,-0.23,-0.4], ads:[0,-0.09,-0.26], muzzle:[0,0.005,-0.58], boom:false,
      sight:'dot', build:buildSmgModel, desc:'Cadencia altísima y muy móvil — reina en corta distancia.' },
    { key:'shotgun', name:'ESCOPETA', icon:'💥', mag:6, reserve:36, fireRate:0.78, auto:false,
      dmgBody:15, dmgHead:24, spread:0.022, spreadADS:0.01, spreadMove:0.04,
      recoil:0.06, recoilADS:0.04, adsFov:60, reloadTime:2.1, pellets:8, pitchMul:0.65, range:60,
      adsMoveMul:0.7, rest:[0.28,-0.26,-0.45], ads:[0,-0.14,-0.3], muzzle:[0,0.02,-0.72], boom:true,
      sight:'dot', build:buildShotgunModel, desc:'Devastadora de cerca, 8 perdigones por disparo.' },
    { key:'dmr', name:'FUSIL DE PRECISIÓN', icon:'🎯', mag:20, reserve:100, fireRate:0.28, auto:false,
      dmgBody:42, dmgHead:95, spread:0.008, spreadADS:0.0015, spreadMove:0.018,
      recoil:0.032, recoilADS:0.016, adsFov:28, reloadTime:2.0, pellets:1, pitchMul:1.2, range:200,
      adsMoveMul:0.45, rest:[0.27,-0.25,-0.48], ads:[0,-0.06,-0.24], muzzle:[0,0.02,-0.92], boom:false,
      sight:'scope', scopeSize:480, build:buildDmrModel, desc:'Semiautomático de alta precisión — golpea fuerte a media-larga distancia.' },
    { key:'sniper', name:'FRANCOTIRADOR', icon:'🎯', mag:5, reserve:20, fireRate:1.35, auto:false,
      dmgBody:85, dmgHead:200, spread:0.006, spreadADS:0.0003, spreadMove:0.02,
      recoil:0.07, recoilADS:0.028, adsFov:13, reloadTime:2.4, pellets:1, pitchMul:1.5, range:260,
      adsMoveMul:0.35, rest:[0.27,-0.25,-0.55], ads:[0,-0.045,-0.2], muzzle:[0,0.03,-1.1], boom:true,
      sight:'scope', scopeSize:340, build:buildSniperModel, desc:'Daño letal a larga distancia, mira telescópica.' },
    { key:'pistol', name:'PISTOLA', icon:'🔹', mag:12, reserve:60, fireRate:0.16, auto:false,
      dmgBody:22, dmgHead:45, spread:0.015, spreadADS:0.005, spreadMove:0.028,
      recoil:0.02, recoilADS:0.012, adsFov:55, reloadTime:1.3, pellets:1, pitchMul:1.7, range:100,
      adsMoveMul:0.8, rest:[0.24,-0.22,-0.32], ads:[0,-0.08,-0.24], muzzle:[0,0.02,-0.36], boom:false,
      sight:'dot', build:buildPistolModel, desc:'Arma secundaria rápida de cambiar, siempre disponible.' }
  ];

  GW.getWeaponDef = function(key){ return GW.WEAPON_DEFS.find(w=>w.key===key); };
})();
