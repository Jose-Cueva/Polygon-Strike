window.GW = window.GW || {};
GW.MODE_META = GW.MODE_META || [];

GW.MODE_META.push({
  id:'campaign', name:'CAMPAÑA', short:'CAMPAÑA', teams:false,
  desc:'Misión larga para un jugador en un mapa dedicado: despeja el valle, habla con tu escuadra y llega a la torre de extracción.'
});

(function(){

/* ============================= NPC model ============================= */
function buildNpcMesh(accentColor){
  const skinMat = new THREE.MeshStandardMaterial({color:0xc79a6b, roughness:0.75});
  const uniformMat = new THREE.MeshStandardMaterial({color:0x4d5540, roughness:0.85});
  const accentMat = new THREE.MeshStandardMaterial({color:accentColor, roughness:0.5, metalness:0.2});

  const g = new THREE.Group();
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.5,0.7,0.3), uniformMat); torso.position.y=1.2;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.17,10,8), skinMat); head.position.y=1.72;
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.185,10,8,0,Math.PI*2,0,Math.PI*0.52), accentMat); cap.position.y=1.78;
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.18,0.7,0.2), uniformMat); legL.position.set(-0.13,0.55,0);
  const legR = legL.clone(); legR.position.x = 0.13;
  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.15,0.6,0.15), uniformMat); armL.position.set(-0.35,1.25,0);
  const armR = armL.clone(); armR.position.x = 0.35;
  const chest = new THREE.Mesh(new THREE.BoxGeometry(0.52,0.14,0.32), accentMat); chest.position.y=1.4;
  g.add(torso,head,cap,legL,legR,armL,armR,chest);
  g.traverse(o=>{ if(o.isMesh){ o.castShadow=true; o.receiveShadow=false; } });
  return g;
}

/* ============================= Dialogue data ============================= */
const VEGA_LINES = [
  'Soldado, bienvenido al Valle Trueno Rojo.',
  'El enemigo controla el puesto de control, el patio de contenedores y el complejo amurallado al norte.',
  'Despeja cada zona y abre paso hasta la torre de extracción.',
  'Cuando asegures terreno, informa por radio. Buena suerte.'
];
const RUIZ_LINES = [
  'Buen trabajo limpiando el puesto de control.',
  'El patio de contenedores está fuertemente custodiado — mantente en movimiento.',
  'Detrás del patio hay un complejo amurallado. Ahí vi a su oficial al mando.',
  'Acaba con él y el resto se rendirá o huirá. Ve con cuidado.'
];
const RADIO_LINES = [
  'Aquí Base, te tenemos en pantalla. Gran trabajo allá abajo.',
  'El valle está asegurado — la extracción viene en camino a la torre.',
  'Fue un honor, soldado. Misión cumplida.'
];

/* ============================= Wave layouts ============================= */
const WAVE1 = [[-8,-27],[8,-27],[-4,-20],[4,-20]];
const WAVE2 = [[-10,2],[10,2],[-6,-4],[6,-4],[-10,8],[10,8]];
const WAVE3 = [[-8,18],[8,18],[-4,24],[4,24],[-8,28],[8,28]];
const WAVE3_ELITE = [0,20];
const WAVE4 = [[-12,42],[12,42],[-8,48],[8,48],[-12,52],[12,52],[0,40],[0,52]];

/* ============================= Controller ============================= */
let npcs = [];
let prevE = false;

function makeNpc(name, pos, accent, activeStage, lines){
  const E = GW.engine;
  const group = buildNpcMesh(accent);
  group.position.set(pos[0], 0, pos[1]);
  group.visible = (activeStage===0);
  E.scene.add(group);
  E.mapObjects.push(group);
  return { name, pos, accent, activeStage, lines, group, talked:false, phase:Math.random()*10, onDone:null };
}

function spawnWave(coords){
  const E = GW.engine;
  coords.forEach(p=>{ E.bots.push(GW.Bots.create('B', E.config.difficulty, [p])); });
}
function spawnEliteWave(coords, elitePos){
  const E = GW.engine;
  spawnWave(coords);
  const elite = GW.Bots.create('B', E.config.difficulty, [elitePos]);
  elite.maxHealth *= 2.4; elite.health = elite.maxHealth;
  elite.group.scale.multiplyScalar(1.3);
  elite.bodyMat.color.set(0x4a1414);
  elite.bodyMat.userData.base = 0x4a1414; // bots.js resets bodyMat.color to userData.base after each hit-flash
  elite.headMat.color.set(0x3a1010);
  E.bots.push(elite);
}

const STAGE_LABELS = {
  0:()=>'Habla con el Capitán Vega',
  1:(n)=>`Despeja el puesto de control · ${n} enemigos`,
  2:()=>'Busca al Sargento Ruiz',
  3:(n)=>`Asegura el patio de contenedores · ${n} enemigos`,
  4:(n)=>`Elimina al comandante enemigo · ${n} enemigos`,
  5:(n)=>`Resiste en la posición final · ${n} enemigos`,
  6:()=>'Contacta a la Base por radio',
  7:()=>'Misión cumplida'
};

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

  function showDialogueLine(npc, idx){
    document.getElementById('dialogueSpeaker').textContent = npc.name;
    document.getElementById('dialogueText').textContent = npc.lines[idx];
  }
  function openDialogue(npc){
    const E = GW.engine;
    c.state.dialogueOpen = true;
    c.state.dialogueNpc = npc;
    c.state.dialogueLine = 0;
    E.clearInteractPrompt();
    showDialogueLine(npc, 0);
    document.getElementById('dialoguePanel').style.display = 'block';
    GW.Audio.playUIClick();
  }
  function closeDialogue(){
    c.state.dialogueOpen = false;
    c.state.dialogueNpc = null;
    document.getElementById('dialoguePanel').style.display = 'none';
  }

  function advanceStage(){
    const E = GW.engine;
    const st = c.state;
    st.waveTransition = false;
    if(st.stage===1){
      st.stage = 2;
      E.mapData.spawnsA = [[0,-16]];
      E.showBanner('PUESTO DESPEJADO','Busca al Sargento Ruiz', 2200);
    } else if(st.stage===3){
      st.stage = 4;
      E.mapData.spawnsA = [[0,10]];
      spawnEliteWave(WAVE3, WAVE3_ELITE);
      E.showBanner('PATIO ASEGURADO','El comandante enemigo está cerca', 2200);
    } else if(st.stage===4){
      st.stage = 5;
      E.mapData.spawnsA = [[0,36]];
      spawnWave(WAVE4);
      E.showBanner('COMANDANTE ELIMINADO','Última posición al norte', 2200);
    } else if(st.stage===5){
      st.stage = 6;
      E.mapData.spawnsA = [[0,50]];
      E.showBanner('ZONA ASEGURADA','Contacta a la Base por radio', 2200);
    }
  }

  c.init = function(){
    const E = GW.engine;
    E.player.team = 'A';
    npcs.forEach(n=>{ E.scene.remove(n.group); });
    npcs.length = 0;
    prevE = false;

    const vega = makeNpc('CAPITÁN VEGA', [3,-50], 0xffb020, 0, VEGA_LINES);
    const ruiz = makeNpc('SARGENTO RUIZ', [0,-14], 0x30e3ff, 2, RUIZ_LINES);
    const radio = makeNpc('OPERADOR DE RADIO', [0,58], 0xff5c30, 6, RADIO_LINES);

    vega.onDone = ()=>{
      c.state.stage = 1;
      E.mapData.spawnsA = [[0,-40]];
      spawnWave(WAVE1);
      E.showBanner('DESPEJA EL PUESTO','4 enemigos detectados', 2200);
    };
    ruiz.onDone = ()=>{
      c.state.stage = 3;
      E.mapData.spawnsA = [[0,-16]];
      spawnWave(WAVE2);
      E.showBanner('ASEGURA EL PATIO','6 enemigos detectados', 2200);
    };
    radio.onDone = ()=>{
      c.state.stage = 7;
      GW.menuHooks.onMatchEnd({title:'MISIÓN CUMPLIDA', sub:'Valle Trueno Rojo asegurado', kills:E.player.kills, deaths:E.player.deaths});
      E.freeze();
    };
    npcs.push(vega, ruiz, radio);

    c.state = { stage:0, waveTransition:false, dialogueOpen:false, dialogueNpc:null, dialogueLine:0 };
    E.mapData.spawnsA = [[0,-56]];
    document.getElementById('dialoguePanel').style.display = 'none';
    E.clearInteractPrompt();
    E.setModeHud('');
    E.showBanner('VALLE TRUENO ROJO','Habla con el Capitán Vega', 2600);
  };

  c.update = function(dt){
    const E = GW.engine;
    const st = c.state;

    const eDown = !!E.keys['KeyE'];
    const eEdge = eDown && !prevE;
    prevE = eDown;

    const t = performance.now()*0.002;
    npcs.forEach(n=>{ n.group.position.y = Math.sin(t+n.phase)*0.02; n.group.visible = (n.activeStage===st.stage && !n.talked); });

    if(st.dialogueOpen){
      if(eEdge){
        st.dialogueLine++;
        const npc = st.dialogueNpc;
        if(st.dialogueLine >= npc.lines.length){
          closeDialogue();
          npc.talked = true;
          npc.group.visible = false;
          if(npc.onDone) npc.onDone();
        } else {
          showDialogueLine(npc, st.dialogueLine);
        }
      }
    } else {
      const pPos = E.getPlayerPosition();
      const activeNpc = npcs.find(n=>n.activeStage===st.stage && !n.talked);
      if(activeNpc){
        const dist = Math.hypot(pPos.x-activeNpc.pos[0], pPos.z-activeNpc.pos[1]);
        if(dist < 2.4){
          E.setInteractPrompt('[E] HABLAR CON '+activeNpc.name, 0);
          if(eEdge) openDialogue(activeNpc);
        } else {
          E.clearInteractPrompt();
        }
      } else {
        E.clearInteractPrompt();
      }

      if((st.stage===1||st.stage===3||st.stage===4||st.stage===5) && !st.waveTransition && E.bots.length>0 && E.bots.every(b=>!b.alive)){
        st.waveTransition = true;
        const myMatchId = E.matchId;
        setTimeout(()=>{ if(E.matchId!==myMatchId) return; advanceStage(); }, 1800);
      }
    }

    const remaining = E.bots.filter(b=>b.alive).length;
    const label = (STAGE_LABELS[st.stage]||(()=>''))(remaining);
    E.setModeHud(`<div class="mh-row"><span>MISIÓN</span></div><div class="mh-objective">${label}</div>`);
  };

  return c;
};

})();
