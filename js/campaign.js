window.GW = window.GW || {};
GW.MODE_META = GW.MODE_META || [];

GW.MODE_META.push({
  id:'campaign', name:'CAMPAÑA', short:'CAMPAÑA', teams:false, badge:'HISTORIA',
  desc:'Operación Trueno Rojo: misión larga de un jugador con oleadas guionizadas, personajes con diálogo, puntos de control, un comandante enemigo y extracción en helicóptero.'
});

(function(){

const STAGE = {
  BRIEFING:0, ADVANCE_TRENCH:1, CLEAR_TRENCH:2, FIND_RUIZ:3, ADVANCE_COURTYARD:4, CLEAR_COURTYARD:5,
  ADVANCE_COMPOUND:6, KILL_COMMANDER:7, ADVANCE_FINAL:8, HOLD:9, CALL_EXTRACTION:10, EXTRACTION:11, DONE:12
};
const OBJECTIVE_INDEX = {0:1,1:1,2:2,3:3,4:3,5:4,6:5,7:6,8:7,9:8,10:9,11:10,12:10};
const OBJECTIVE_TOTAL = 10;
const TALK_RANGE = 2.6;
const TYPE_CPS = 42;

/* ============================= NPC model ============================= */
function buildNpcMesh(accentColor){
  const skinMat = new THREE.MeshStandardMaterial({color:0xc79a6b, roughness:0.75});
  const uniformMat = new THREE.MeshStandardMaterial({color:0x4d5540, roughness:0.85});
  const darkMat = new THREE.MeshStandardMaterial({color:0x23261f, roughness:0.8});
  const accentMat = new THREE.MeshStandardMaterial({color:accentColor, roughness:0.5, metalness:0.2});

  const g = new THREE.Group();
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.5,0.7,0.3), uniformMat); torso.position.y=1.2;
  const vest = new THREE.Mesh(new THREE.BoxGeometry(0.54,0.42,0.34), darkMat); vest.position.y=1.28;
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.56,0.08,0.36), accentMat); stripe.position.y=1.42;
  const belt = new THREE.Mesh(new THREE.BoxGeometry(0.52,0.07,0.32), darkMat); belt.position.y=0.87;
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.3,0.32,0.3), skinMat); head.position.y=1.72;
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.19,0.2,0.1,12), accentMat); cap.position.y=1.91;
  const brim = new THREE.Mesh(new THREE.BoxGeometry(0.3,0.03,0.18), accentMat); brim.position.set(0,1.87,0.2);
  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.22,0.05,0.02), darkMat); visor.position.set(0,1.76,0.155);
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.18,0.7,0.2), uniformMat); legL.position.set(-0.13,0.55,0);
  const legR = legL.clone(); legR.position.x = 0.13;
  const bootL = new THREE.Mesh(new THREE.BoxGeometry(0.2,0.14,0.26), darkMat); bootL.position.set(-0.13,0.07,0.03);
  const bootR = bootL.clone(); bootR.position.x = 0.13;
  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.15,0.6,0.15), uniformMat); armL.position.set(-0.35,1.25,0);
  const armR = armL.clone(); armR.position.x = 0.35;
  const handL = new THREE.Mesh(new THREE.BoxGeometry(0.15,0.13,0.15), skinMat); handL.position.set(-0.35,0.9,0);
  const handR = handL.clone(); handR.position.x = 0.35;
  const pack = new THREE.Mesh(new THREE.BoxGeometry(0.4,0.5,0.18), darkMat); pack.position.set(0,1.22,-0.24);
  const antenna = new THREE.Mesh(new THREE.BoxGeometry(0.02,0.7,0.02), darkMat); antenna.position.set(0.15,1.75,-0.28);
  g.add(torso,vest,stripe,belt,head,cap,brim,visor,legL,legR,bootL,bootR,armL,armR,handL,handR,pack,antenna);
  g.traverse(o=>{ if(o.isMesh){ o.castShadow=true; o.receiveShadow=false; } });
  g.userData.torso = torso; g.userData.head = head;
  return g;
}

/* ============================= Helicopter ============================= */
function buildHeliMesh(){
  const bodyMat = new THREE.MeshStandardMaterial({color:0x3f4a3a, roughness:0.5, metalness:0.5});
  const glassMat = new THREE.MeshStandardMaterial({color:0x8fb8c8, roughness:0.2, metalness:0.7});
  const darkMat = new THREE.MeshStandardMaterial({color:0x1c1f1a, roughness:0.6, metalness:0.4});
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.2,1.8,5.2), bodyMat);
  const nose = new THREE.Mesh(new THREE.BoxGeometry(1.8,1.3,1.4), glassMat); nose.position.set(0,0.1,3.2);
  const boom = new THREE.Mesh(new THREE.BoxGeometry(0.6,0.6,5.5), bodyMat); boom.position.set(0,0.3,-5.0);
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.2,1.4,1.0), bodyMat); fin.position.set(0,1.0,-7.4);
  const mast = new THREE.Mesh(new THREE.BoxGeometry(0.3,0.6,0.3), darkMat); mast.position.set(0,1.2,0);
  const rotor = new THREE.Mesh(new THREE.BoxGeometry(11,0.08,0.5), darkMat); rotor.position.set(0,1.5,0);
  const tailRotor = new THREE.Mesh(new THREE.BoxGeometry(0.06,1.6,0.3), darkMat); tailRotor.position.set(0.35,0.9,-7.4);
  const skidL = new THREE.Mesh(new THREE.BoxGeometry(0.16,0.16,4.2), darkMat); skidL.position.set(-1.0,-1.25,0.3);
  const skidR = skidL.clone(); skidR.position.x = 1.0;
  const strutL = new THREE.Mesh(new THREE.BoxGeometry(0.12,0.5,0.12), darkMat); strutL.position.set(-1.0,-1.0,1.2);
  const strutL2 = strutL.clone(); strutL2.position.z = -0.8;
  const strutR = strutL.clone(); strutR.position.x = 1.0;
  const strutR2 = strutL2.clone(); strutR2.position.x = 1.0;
  g.add(body,nose,boom,fin,mast,rotor,tailRotor,skidL,skidR,strutL,strutL2,strutR,strutR2);
  g.traverse(o=>{ if(o.isMesh){ o.castShadow=true; o.receiveShadow=false; } });
  g.userData.rotor = rotor; g.userData.tailRotor = tailRotor;
  return g;
}

/* ============================= Dialogue data ============================= */
const VEGA = {
  name:'CAPITÁN VEGA', role:'MANDO DE COMPAÑÍA', initials:'CV', accent:0xffb020, css:'#ffb020', voice:170,
  lines:[
    'Por fin llegas. Soy el capitán Vega. Escucha bien, porque solo lo diré una vez.',
    'Trueno Rojo ha tomado todo el valle: el puesto de control, el patio de contenedores y el complejo del fondo.',
    'Su comandante, Korvin, dirige la operación desde el complejo. Sin él, el resto se desmorona.',
    'Abre paso hasta el helipuerto del norte. El sargento Ruiz te espera pasado el puesto de control con más detalles.',
    'Hay cajas de munición en cada zona. Úsalas. Y no mueras: el papeleo es horrible.'
  ]
};
const RUIZ = {
  name:'SARGENTO RUIZ', role:'EXPLORACIÓN', initials:'SR', accent:0x30e3ff, css:'#30e3ff', voice:230,
  lines:[
    '¡Eh! Por aquí, agáchate. Sargento Ruiz, exploración. Vi cómo limpiaste la trinchera. Nada mal.',
    'El patio está lleno de contenedores: buena cobertura para ti... y para ellos. Sube por la rampa del contenedor verde si quieres altura.',
    'Ojo con los flancos. Los he visto moverse por las rocas de los lados en cuanto hay ruido.',
    'Después del patio viene el complejo. Korvin se esconde detrás del edificio central con su guardia personal.',
    'Hay una brecha en el muro este del complejo. Si no quieres entrar por la puerta grande... ya sabes.'
  ]
};
const ORTEGA = {
  name:'OPERADOR ORTEGA', role:'CONTROL AÉREO', initials:'OR', accent:0xff5c30, css:'#ff5c30', voice:200,
  lines:[
    '¡Aquí Ortega, control aéreo! Menuda pelea. Te vi desde la torre.',
    'Con Korvin fuera de juego, el valle es nuestro. Voy a pedir el pájaro ahora mismo.',
    'Base, aquí Trueno Uno. Solicito extracción inmediata en el helipuerto. Zona caliente pero asegurada.',
    'Está en camino. Mantente cerca del helipuerto y disfruta de las vistas, soldado. Te lo has ganado.'
  ]
};
const RADIO_SPEAKER = { name:'RADIO', initials:'RX', css:'#8ea67c', voice:150 };

/* ============================= Controller ============================= */
let npcs = [];
let prevE = false;

function makeNpc(def, pos, activeFrom){
  const E = GW.engine;
  const group = buildNpcMesh(def.accent);
  group.position.set(pos[0], 0, pos[1]);
  group.visible = false;
  E.scene.add(group);
  E.mapObjects.push(group);
  return { def, name:def.name, pos, activeFrom, lines:def.lines, group, talked:false, phase:Math.random()*10, obstacle:null, onDone:null };
}

function setNpcVisible(npc, visible){
  const E = GW.engine;
  if(npc.group.visible === visible) return;
  npc.group.visible = visible;
  if(visible && !npc.obstacle){
    const box3 = new THREE.Box3(
      new THREE.Vector3(npc.pos[0]-0.35, 0, npc.pos[1]-0.35),
      new THREE.Vector3(npc.pos[0]+0.35, 1.9, npc.pos[1]+0.35)
    );
    npc.obstacle = {box3};
    E.obstacles.push(npc.obstacle);
  } else if(!visible && npc.obstacle){
    const i = E.obstacles.indexOf(npc.obstacle);
    if(i>=0) E.obstacles.splice(i,1);
    npc.obstacle = null;
  }
}

function el(id){ return document.getElementById(id); }

GW.MODE_FACTORIES.campaign = function(){
  const c = {
    state:{},
    init(){},
    update(dt){},
    onCombatantKilled(){},
    onPlayerRespawnPoint(){ return null; },
    allowRespawn:true,
    allowBotRespawn:false,
  };

  let L = null;               // level layout from the map (E.mapData.campaign)
  const pending = [];         // staggered enemy deployments
  let waveSerial = 0;
  let heli = null;
  let radioQueue = [];
  const dlg = { open:false, npc:null, line:0, shown:0, lastBlip:0, auto:false, autoTimer:0, speaker:null };

  /* ---------- difficulty scaling ---------- */
  function scaleList(list){
    const E = GW.engine;
    const d = E.config.difficulty;
    if(d==='facil') return list.slice(0, Math.max(3, list.length-1));
    if(d==='dificil') return list.concat(list.slice(0,2));
    return list.slice();
  }

  /* ---------- enemy deployment ---------- */
  function deploy(list, opts){
    opts = opts || {};
    const step = opts.step !== undefined ? opts.step : 0.28;
    const start = opts.delay || 0;
    const id = ++waveSerial;
    list.forEach((p,i)=>{
      pending.push({ at:start + i*step, pos:p, elite:!!opts.elite && i===list.length-1, waveId:id, healthMul:opts.healthMul||1 });
    });
    return id;
  }
  function spawnOne(entry){
    const E = GW.engine;
    const b = GW.Bots.create('B', E.config.difficulty, [entry.pos]);
    b.waveId = entry.waveId;
    if(entry.healthMul!==1){ b.maxHealth *= entry.healthMul; b.health = b.maxHealth; }
    if(entry.elite){
      b.isElite = true; b.eliteName = 'COMANDANTE KORVIN';
      b.maxHealth *= 2.6; b.health = b.maxHealth;
      b.speed *= 0.9; b.runSpeed *= 0.95;
      b.group.scale.multiplyScalar(1.28);
      b.bodyMat.color.set(0x4a1414);
      b.bodyMat.userData.base = 0x4a1414; // bots.js resets bodyMat.color to userData.base after each hit-flash
      b.headMat.color.set(0x3a1010);
    }
    E.bots.push(b);
    if(GW.Effects) GW.Effects.spawnDeployPuff(new THREE.Vector3(b.group.position.x, 0.6, b.group.position.z));
  }
  function updatePending(dt){
    for(let i=pending.length-1;i>=0;i--){
      pending[i].at -= dt;
      if(pending[i].at<=0){ spawnOne(pending[i]); pending.splice(i,1); }
    }
  }
  function enemiesAlive(){
    const E = GW.engine;
    return E.bots.filter(b=>b.alive).length + pending.length;
  }
  function eliteBot(){
    const E = GW.engine;
    return E.bots.find(b=>b.isElite);
  }

  /* ---------- objectives / checkpoints ---------- */
  function setObjective(text, waypoint, opts){
    const E = GW.engine;
    opts = opts || {};
    c.state.objectiveText = text;
    E.objectiveMarker = waypoint ? {x:waypoint[0], z:waypoint[1]} : null;
    if(!opts.silent) GW.Audio.playObjective();
    if(opts.banner) E.showBanner(opts.banner, text, opts.bannerMs||2400);
  }
  function checkpoint(key, silent){
    const E = GW.engine;
    const cp = L.checkpoints[key];
    E.mapData.spawnsA = [[cp[0], cp[1]]];
    if(silent) return;
    if(E.player.alive) E.player.health = E.player.maxHealth;
    E.addFeed('PUNTO DE CONTROL · SALUD RESTAURADA');
    GW.Audio.playPickup();
  }

  /* ---------- dialogue ---------- */
  function renderDialogue(){
    const text = dlg.lines[dlg.line];
    const n = Math.min(text.length, Math.floor(dlg.shown));
    el('dialogueText').textContent = text.slice(0, n);
    const done = n >= text.length;
    el('dialogueText').classList.toggle('typing', !done);
    const last = dlg.line >= dlg.lines.length-1;
    el('dialogueHint').textContent = dlg.auto ? '' : (done ? (last ? '[E] CERRAR' : '[E] SIGUIENTE') : '[E] SALTAR');
    el('dialogueProgress').textContent = dlg.auto ? 'TRANSMISIÓN' : `${dlg.line+1} / ${dlg.lines.length}`;
  }
  function openPanel(speaker, lines, auto){
    const E = GW.engine;
    dlg.open = true; dlg.lines = lines; dlg.line = 0; dlg.shown = 0; dlg.lastBlip = 0; dlg.auto = !!auto; dlg.autoTimer = 0;
    dlg.speaker = speaker;
    el('dialogueSpeaker').textContent = speaker.name;
    el('dialogueRole').textContent = speaker.role || '';
    el('dialoguePortrait').textContent = speaker.initials;
    el('dialoguePanel').style.setProperty('--portrait', speaker.css);
    el('dialoguePanel').classList.toggle('radio', !!auto);
    el('dialoguePanel').style.display = 'flex';
    renderDialogue();
    E.clearInteractPrompt();
    if(!auto){ E.inputLocked = true; E.weaponLowered = true; GW.Audio.playUIClick(); }
    else GW.Audio.playRadio();
  }
  function openDialogue(npc){
    dlg.npc = npc;
    openPanel(npc.def, npc.lines, false);
  }
  function closePanel(){
    const E = GW.engine;
    const wasNpc = dlg.npc;
    dlg.open = false; dlg.npc = null; dlg.speaker = null;
    el('dialoguePanel').style.display = 'none';
    E.inputLocked = false; E.weaponLowered = false;
    const hudEl = el('hud'); if(hudEl) hudEl.classList.remove('talking');
    if(wasNpc){
      wasNpc.talked = true;
      if(wasNpc.onDone) wasNpc.onDone();
    }
  }
  function radio(speaker, lines){
    radioQueue.push({speaker, lines});
  }
  // Returns true when it consumed this frame's E press, so the talk prompt
  // below does not re-open a conversation with the same key edge.
  function updateDialogue(dt, eEdge){
    const E = GW.engine;
    if(!dlg.open){
      if(radioQueue.length){
        const r = radioQueue.shift();
        openPanel(r.speaker, r.lines, true);
      }
      return false;
    }
    const text = dlg.lines[dlg.line];
    if(dlg.shown < text.length){
      dlg.shown += (dlg.auto ? TYPE_CPS*1.5 : TYPE_CPS)*dt;
      if(Math.floor(dlg.shown) - dlg.lastBlip >= 3){
        dlg.lastBlip = Math.floor(dlg.shown);
        const ch = text[Math.min(text.length-1, dlg.lastBlip)];
        if(ch && ch!==' ') GW.Audio.playBlip(dlg.speaker.voice * (0.9+Math.random()*0.25), dlg.auto?0.03:0.045);
      }
      renderDialogue();
    }
    if(dlg.auto){
      // A radio transmission never swallows the press: E dismisses it and the
      // same press may still open a conversation with an NPC in range.
      if(eEdge){ closePanel(); return false; }
      if(dlg.shown >= text.length){
        dlg.autoTimer += dt;
        if(dlg.autoTimer > 1.1 + text.length*0.01){
          if(dlg.line < dlg.lines.length-1){ dlg.line++; dlg.shown=0; dlg.lastBlip=0; dlg.autoTimer=0; renderDialogue(); }
          else closePanel();
        }
      }
      return false;
    }
    if(eEdge){
      if(dlg.shown < text.length){ dlg.shown = text.length; renderDialogue(); }
      else if(dlg.line < dlg.lines.length-1){ dlg.line++; dlg.shown=0; dlg.lastBlip=0; renderDialogue(); GW.Audio.playUIClick(); }
      else closePanel();
      return true;
    }
    return false;
  }

  /* ---------- chapter card ---------- */
  function showChapter(kicker, title, sub, ms){
    const card = el('chapterCard');
    el('chapterKicker').textContent = kicker;
    el('chapterTitle').textContent = title;
    el('chapterSub').textContent = sub||'';
    card.classList.add('show');
    const myMatchId = GW.engine.matchId;
    setTimeout(()=>{ if(GW.engine.matchId===myMatchId) card.classList.remove('show'); }, ms||4200);
  }

  /* ---------- waypoint HUD ---------- */
  const _wp = new THREE.Vector3();
  function updateWaypointHud(){
    const E = GW.engine;
    const node = el('waypoint');
    if(!node) return;
    const o = E.objectiveMarker;
    if(!o || (dlg.open && !dlg.auto)){ node.style.display='none'; return; }
    const pPos = E.getPlayerPosition();
    const dist = Math.hypot(pPos.x-o.x, pPos.z-o.z);
    if(dist < 2.2){ node.style.display='none'; return; }
    const groundY = E.raycastGroundY(o.x, o.z);
    _wp.set(o.x, groundY+1.7, o.z).project(E.camera);
    const w = window.innerWidth, h = window.innerHeight;
    const behind = _wp.z > 1;
    let sx = (_wp.x*0.5+0.5)*w, sy = (-_wp.y*0.5+0.5)*h;
    if(behind){ sx = w - sx; sy = h - sy; }
    const margin = 46;
    const inside = !behind && sx>margin && sx<w-margin && sy>margin && sy<h-margin;
    let angle = 0;
    if(!inside){
      const cx = w/2, cy = h/2;
      let dx = sx-cx, dy = sy-cy;
      if(behind){ dy = Math.abs(dy) || 1; }
      const len = Math.hypot(dx,dy) || 1;
      dx/=len; dy/=len;
      const rx = (w/2-margin), ry = (h/2-margin);
      const t = Math.min(rx/Math.abs(dx||1e-6), ry/Math.abs(dy||1e-6));
      sx = cx + dx*t; sy = cy + dy*t;
      angle = Math.atan2(dy,dx)*180/Math.PI;
    }
    node.style.display='block';
    node.style.left = sx+'px'; node.style.top = sy+'px';
    node.classList.toggle('edge', !inside);
    el('wpArrow').style.transform = `rotate(${angle}deg)`;
    el('wpDist').textContent = Math.round(dist)+' m';
  }

  /* ---------- HUD ---------- */
  function hud(){
    const E = GW.engine;
    const st = c.state;
    const idx = OBJECTIVE_INDEX[st.stage]||1;
    let extra = '';
    if(st.stage===STAGE.CLEAR_TRENCH || st.stage===STAGE.CLEAR_COURTYARD || st.stage===STAGE.KILL_COMMANDER){
      extra = `<div class="mh-sub">${enemiesAlive()} enemigos restantes</div>`;
    } else if(st.stage===STAGE.HOLD){
      const s = Math.max(0, Math.ceil(st.holdTimer));
      extra = `<div class="mh-time">${Math.floor(s/60)}:${(s%60<10?'0':'')+(s%60)}</div><div class="mh-sub">${enemiesAlive()} hostiles · ${st.holdTimer>0?'refuerzos en camino':'sin refuerzos'}</div>`;
    }
    E.setModeHud(`<div class="mh-row"><span>OBJETIVO</span><b>${idx} / ${OBJECTIVE_TOTAL}</b></div><div class="mh-objective">${st.objectiveText||''}</div>${extra}`);

    const boss = el('bossBar');
    if(boss){
      const e = eliteBot();
      const show = st.stage===STAGE.KILL_COMMANDER && e && e.alive;
      boss.style.display = show ? 'block' : 'none';
      if(show){
        el('bossName').textContent = e.eliteName;
        el('bossFill').style.width = Math.max(0, e.health/e.maxHealth*100)+'%';
      }
    }
  }

  /* ---------- stages ---------- */
  function startTrenchWave(){
    const E = GW.engine;
    c.state.stage = STAGE.CLEAR_TRENCH;
    checkpoint('trench', true);
    deploy(scaleList(L.waves.trench), {step:0.3});
    setObjective('Despeja el puesto de control', null, {banner:'¡CONTACTO!'});
    GW.Audio.playChord(true);
  }
  function startCourtyardWave(){
    c.state.stage = STAGE.CLEAR_COURTYARD;
    deploy(scaleList(L.waves.courtyard), {step:0.3});
    deploy(L.waves.courtyardFlank, {delay:3.2, step:0.5});
    setObjective('Asegura el patio de contenedores', null, {banner:'EMBOSCADA'});
    GW.Audio.playChord(true);
    radio(RADIO_SPEAKER, ['Ruiz: ¡Te están flanqueando por las rocas! Cubre los lados.']);
  }
  function startCompoundWave(){
    c.state.stage = STAGE.KILL_COMMANDER;
    deploy(scaleList(L.waves.compound), {step:0.3});
    deploy([L.waves.commander], {delay:1.2, elite:true});
    setObjective('Elimina al comandante Korvin', null, {banner:'COMANDANTE LOCALIZADO'});
    GW.Audio.playChord(true);
    radio(RADIO_SPEAKER, ['Vega: Ese grandullón de rojo es Korvin. Acaba con él y su guardia se vendrá abajo.']);
  }
  function startHold(){
    const E = GW.engine;
    const d = E.config.difficulty;
    c.state.stage = STAGE.HOLD;
    c.state.holdTimer = d==='facil' ? 60 : (d==='dificil' ? 90 : 75);
    c.state.holdInterval = d==='dificil' ? 9 : 12;
    c.state.holdNext = 0.8;
    c.state.holdBatch = 0;
    checkpoint('pad');
    setObjective('Resiste en el helipuerto hasta la extracción', null, {banner:'RESISTE'});
    GW.Audio.playChord(true);
    radio(RADIO_SPEAKER, ['Ortega: ¡Vienen por los barrancos y por la puerta trasera! Aguanta en el helipuerto, el pájaro está en camino.']);
  }
  function holdBatch(){
    const E = GW.engine;
    const gates = L.waves.finalGates;
    const n = c.state.holdBatch===0 ? 4 : (E.config.difficulty==='dificil' ? 4 : 3);
    const picks = [];
    for(let i=0;i<n;i++) picks.push(gates[(c.state.holdBatch*3 + i*2 + Math.floor(Math.random()*gates.length)) % gates.length]);
    deploy(picks, {step:0.35, healthMul: 1 + c.state.holdBatch*0.06});
    c.state.holdBatch++;
  }
  function startExtraction(){
    const E = GW.engine;
    c.state.stage = STAGE.EXTRACTION;
    setObjective('Espera al helicóptero en el helipuerto', L.waypoints.pad, {banner:'EXTRACCIÓN EN CAMINO'});
    heli = buildHeliMesh();
    heli.position.set(34, 46, -150);
    E.scene.add(heli);
    E.mapObjects.push(heli);
    c.state.heliT = 0;
    c.state.rotorSfx = 0;
  }
  function updateHeli(dt){
    const E = GW.engine;
    if(!heli) return;
    c.state.heliT += dt;
    const t = c.state.heliT;
    const approach = 8.0, descend = 3.0;
    const pad = new THREE.Vector3(L.waypoints.pad[0], 9, L.waypoints.pad[1]);
    const start = new THREE.Vector3(34, 46, -150);
    const yaw = Math.atan2(pad.x-start.x, pad.z-start.z); // model nose points down local +z
    if(t < approach){
      const k = t/approach, e = 1 - Math.pow(1-k, 3);
      heli.position.lerpVectors(start, pad, e);
      heli.position.y += Math.sin(t*1.7)*0.4;
      heli.rotation.set(-0.22*(1-e), yaw, Math.sin(t*1.3)*0.05);
    } else if(t < approach+descend){
      const k = (t-approach)/descend;
      heli.position.set(pad.x + Math.sin(t*2)*0.15, THREE.MathUtils.lerp(9, 1.45, k*k), pad.z);
      heli.rotation.set(0, yaw, Math.sin(t*2)*0.02);
    } else if(c.state.stage===STAGE.EXTRACTION){
      c.state.stage = STAGE.DONE;
      finishMission();
    }
    heli.userData.rotor.rotation.y += dt*28;
    heli.userData.tailRotor.rotation.x += dt*40;
    c.state.rotorSfx -= dt;
    if(c.state.rotorSfx<=0){ GW.Audio.playRotor(); c.state.rotorSfx = 0.72; }
  }
  function rankFor(time, deaths){
    if(deaths===0 && time < 540) return 'S';
    if(deaths<=1 && time < 720) return 'A';
    if(deaths<=3) return 'B';
    return 'C';
  }
  function finishMission(){
    const E = GW.engine;
    const time = Math.floor(c.state.missionTime);
    const acc = E.player.shots>0 ? Math.round(E.player.hits/E.player.shots*100) : 0;
    const rank = rankFor(c.state.missionTime, E.player.deaths);
    const mm = Math.floor(time/60), ss = time%60;
    setObjective('Misión cumplida', null, {silent:true});
    E.objectiveMarker = null;
    showChapter('OPERACIÓN TRUENO ROJO', 'MISIÓN CUMPLIDA', `Rango ${rank}`, 3200);
    GW.Audio.playChord(true);
    setTimeout(()=>{
      GW.menuHooks.onMatchEnd({
        title:'MISIÓN CUMPLIDA',
        sub:`Valle Trueno Rojo asegurado · Rango ${rank}`,
        stats:`Tiempo ${mm}:${ss<10?'0':''}${ss} · Bajas ${E.player.kills} · Muertes ${E.player.deaths} · Precisión ${acc}%`,
        kills:E.player.kills, deaths:E.player.deaths
      });
      E.freeze();
    }, 2600);
  }

  /* ---------- lifecycle ---------- */
  c.init = function(){
    const E = GW.engine;
    L = E.mapData.campaign;
    E.player.team = 'A';
    npcs.forEach(n=>{ E.scene.remove(n.group); });
    npcs.length = 0;
    pending.length = 0;
    radioQueue = [];
    heli = null;
    prevE = false;
    dlg.open = false; dlg.npc = null;
    E.inputLocked = false; E.weaponLowered = false;

    const vega = makeNpc(VEGA, L.npcs.vega, STAGE.BRIEFING);
    const ruiz = makeNpc(RUIZ, L.npcs.ruiz, STAGE.FIND_RUIZ);
    const ortega = makeNpc(ORTEGA, L.npcs.radio, STAGE.CALL_EXTRACTION);
    vega.onDone = ()=>{
      if(c.state.stage===STAGE.BRIEFING){
        c.state.stage = STAGE.ADVANCE_TRENCH;
        setObjective('Avanza hasta el puesto de control', L.waypoints.trench);
      }
    };
    ruiz.onDone = ()=>{
      if(c.state.stage===STAGE.FIND_RUIZ){
        c.state.stage = STAGE.ADVANCE_COURTYARD;
        setObjective('Avanza al patio de contenedores', L.waypoints.courtyard);
      }
    };
    ortega.onDone = ()=>{
      if(c.state.stage===STAGE.CALL_EXTRACTION) startExtraction();
    };
    npcs.push(vega, ruiz, ortega);
    setNpcVisible(vega, true);

    c.state = { stage:STAGE.BRIEFING, waveTransition:false, missionTime:0, objectiveText:'', holdTimer:0 };
    E.mapData.spawnsA = [[L.checkpoints.camp[0], L.checkpoints.camp[1]]];
    el('dialoguePanel').style.display = 'none';
    el('chapterCard').classList.remove('show');
    E.clearInteractPrompt();
    setObjective('Recibe el informe del capitán Vega', L.npcs.vega, {silent:true});
    hud();
    showChapter('OPERACIÓN TRUENO ROJO', 'CAPÍTULO 1 · EL VALLE', 'Recibe el informe del capitán Vega', 4600);
  };

  c.update = function(dt){
    const E = GW.engine;
    const st = c.state;
    if(st.stage < STAGE.DONE) st.missionTime += dt;

    const eDown = !!E.keys['KeyE'];
    const eEdge = eDown && !prevE;
    prevE = eDown;

    updatePending(dt);

    // NPC idle: breathing, subtle head sway, and turning to face a nearby player.
    const t = performance.now()*0.002;
    const pPos = E.getPlayerPosition();
    npcs.forEach(n=>{
      setNpcVisible(n, st.stage >= n.activeFrom);
      if(!n.group.visible) return;
      n.group.userData.torso.scale.y = 1 + Math.sin(t*1.6+n.phase)*0.015;
      n.group.userData.head.rotation.y = Math.sin(t*0.7+n.phase)*0.25;
      const dx = pPos.x-n.pos[0], dz = pPos.z-n.pos[1];
      const d = Math.hypot(dx,dz);
      if(d < 9){
        const want = Math.atan2(dx, dz);
        let diff = want - n.group.rotation.y;
        diff = Math.atan2(Math.sin(diff), Math.cos(diff));
        n.group.rotation.y += diff*Math.min(1, dt*4);
      }
    });

    const consumedE = updateDialogue(dt, eEdge);
    const hudEl = el('hud');
    if(hudEl) hudEl.classList.toggle('talking', dlg.open && !dlg.auto);

    if(!dlg.open || dlg.auto){
      let prompted = false;
      if(E.player.alive && st.stage < STAGE.EXTRACTION){
        let best = null, bestD = TALK_RANGE;
        npcs.forEach(n=>{
          if(!n.group.visible) return;
          const d = Math.hypot(pPos.x-n.pos[0], pPos.z-n.pos[1]);
          if(d < bestD){ best = n; bestD = d; }
        });
        if(best){
          E.setInteractPrompt(`[E] HABLAR CON ${best.name}`, 0);
          prompted = true;
          if(eEdge && !consumedE){ openDialogue(best); prompted = false; }
        }
      }
      if(!prompted) E.clearInteractPrompt();
    }

    const pz = pPos.z;
    if((st.stage===STAGE.BRIEFING || st.stage===STAGE.ADVANCE_TRENCH) && pz < L.triggers.trench){
      if(dlg.open && !dlg.auto) closePanel();
      startTrenchWave();
    } else if(st.stage===STAGE.CLEAR_TRENCH){
      if(enemiesAlive()===0 && !st.waveTransition){
        st.waveTransition = true;
        const id = E.matchId;
        setTimeout(()=>{
          if(E.matchId!==id) return;
          st.waveTransition = false;
          st.stage = STAGE.FIND_RUIZ;
          checkpoint('courtyard');
          setObjective('Busca al sargento Ruiz tras la barrera', L.npcs.ruiz, {banner:'PUESTO DESPEJADO'});
        }, 1500);
      }
    } else if((st.stage===STAGE.FIND_RUIZ || st.stage===STAGE.ADVANCE_COURTYARD) && pz < L.triggers.courtyard){
      if(dlg.open && !dlg.auto) closePanel();
      startCourtyardWave();
    } else if(st.stage===STAGE.CLEAR_COURTYARD){
      if(enemiesAlive()===0 && !st.waveTransition){
        st.waveTransition = true;
        const id = E.matchId;
        setTimeout(()=>{
          if(E.matchId!==id) return;
          st.waveTransition = false;
          st.stage = STAGE.ADVANCE_COMPOUND;
          checkpoint('compound');
          setObjective('Asalta el complejo amurallado', L.waypoints.compoundGate, {banner:'PATIO ASEGURADO'});
        }, 1500);
      }
    } else if(st.stage===STAGE.ADVANCE_COMPOUND && pz < L.triggers.compound){
      startCompoundWave();
    } else if(st.stage===STAGE.KILL_COMMANDER){
      if(enemiesAlive()===0 && !st.waveTransition){
        st.waveTransition = true;
        const id = E.matchId;
        setTimeout(()=>{
          if(E.matchId!==id) return;
          st.waveTransition = false;
          st.stage = STAGE.ADVANCE_FINAL;
          checkpoint('final');
          setObjective('Llega al helipuerto del norte', L.waypoints.pad, {banner:'KORVIN ELIMINADO'});
          radio(RADIO_SPEAKER, ['Vega: Korvin ha caído. Buen trabajo. Ortega te espera en la torre de radio para pedir la extracción.']);
        }, 1600);
      }
    } else if(st.stage===STAGE.ADVANCE_FINAL && pz < L.triggers.final){
      startHold();
    } else if(st.stage===STAGE.HOLD){
      st.holdTimer -= dt;
      st.holdNext -= dt;
      if(st.holdTimer > 0 && st.holdNext <= 0 && enemiesAlive() < 7){
        holdBatch();
        st.holdNext = st.holdInterval;
        if(st.holdBatch>1) E.addFeed('REFUERZOS ENEMIGOS');
      }
      if(st.holdTimer <= 0 && enemiesAlive()===0 && !st.waveTransition){
        st.waveTransition = true;
        const id = E.matchId;
        setTimeout(()=>{
          if(E.matchId!==id) return;
          st.waveTransition = false;
          st.stage = STAGE.CALL_EXTRACTION;
          checkpoint('pad');
          setObjective('Habla con el operador Ortega en la torre', L.npcs.radio, {banner:'ZONA ASEGURADA'});
        }, 1500);
      }
    } else if(st.stage===STAGE.EXTRACTION || st.stage===STAGE.DONE){
      updateHeli(dt);
    }

    updateWaypointHud();
    hud();
  };

  return c;
};

})();
