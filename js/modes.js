window.GW = window.GW || {};
GW.menuHooks = GW.menuHooks || { onMatchEnd(){}, onRoundEnd(){} };

GW.MODE_META = [
  { id:'ffa', name:'TODOS CONTRA TODOS', short:'FFA', teams:false,
    desc:'Cada bot va por su cuenta. El primero en llegar al límite de bajas (o quien más sume cuando se acabe el tiempo) gana.' },
  { id:'tdm', name:'DUELO POR EQUIPOS', short:'TDM', teams:true,
    desc:'Tu equipo de bots aliados contra el equipo enemigo. Gana el primer equipo en llegar al límite de bajas.' },
  { id:'snd', name:'BÚSQUEDA Y DESTRUCCIÓN', short:'S&D', teams:true,
    desc:'Rondas a vida única. Los atacantes deben plantar y detonar el explosivo; los defensores deben impedirlo o desactivarlo.' },
  { id:'gungame', name:'MODO ARSENAL', short:'ARSENAL', teams:false,
    desc:'Cada baja te asciende a la siguiente arma. Completa la escalera de armas antes que se acabe el tiempo.' },
  { id:'horde', name:'MODO HORDA', short:'HORDA', teams:false,
    desc:'Oleadas de enemigos cada vez más numerosas y letales. Sobrevive y suma el mayor número de bajas posible.' }
];

GW.MODE_FACTORIES = {};

(function(){

function baseController(){
  return {
    state:{},
    init(){},
    update(dt){},
    onCombatantKilled(victimKind, victimRef, killerKind, killerRef){},
    onPlayerRespawnPoint(){ return null; },
    allowRespawn:true,
  };
}

/* ---------------------------- FFA ---------------------------- */
GW.MODE_FACTORIES.ffa = function(){
  const c = baseController();
  c.allowRespawn = true;
  c.init = function(){
    const E = GW.engine;
    E.player.team = 'A';
    E.bots.forEach(b=>b.team='B');
    c.state = { scoreLimit: 12 + E.config.botCount, timeLeft: (E.config.timeLimitMin||8)*60, botKills:{} };
    E.setModeHud();
  };
  c.update = function(dt){
    const E = GW.engine;
    c.state.timeLeft -= dt;
    E.setModeHud(`<div class="mh-row"><span>BAJAS</span><b>${E.player.kills} / ${c.state.scoreLimit}</b></div>
      <div class="mh-bar"><i style="width:${Math.min(100,E.player.kills/c.state.scoreLimit*100)}%"></i></div>
      <div class="mh-time">${formatTime(c.state.timeLeft)}</div>`);
    if(E.player.kills >= c.state.scoreLimit){
      GW.menuHooks.onMatchEnd({title:'VICTORIA', sub:`Llegaste a ${E.player.kills} bajas`, kills:E.player.kills, deaths:E.player.deaths});
      E.freeze();
    } else if(c.state.timeLeft<=0){
      GW.menuHooks.onMatchEnd({title:'TIEMPO AGOTADO', sub:`Terminaste con ${E.player.kills} bajas`, kills:E.player.kills, deaths:E.player.deaths});
      E.freeze();
    }
  };
  c.onCombatantKilled = function(victimKind, victimRef, killerKind){};
  return c;
};

/* ---------------------------- TDM ---------------------------- */
GW.MODE_FACTORIES.tdm = function(){
  const c = baseController();
  c.allowRespawn = true;
  c.init = function(){
    const E = GW.engine;
    E.player.team = 'A';
    const half = Math.floor(E.bots.length/2);
    E.bots.forEach((b,i)=>{ b.team = i<half ? 'A' : 'B'; });
    c.state = { scoreA:1, scoreB:0, scoreLimit: 10 + E.config.botCount, timeLeft: (E.config.timeLimitMin||8)*60 };
    E.setModeHud();
  };
  c.update = function(dt){
    const E = GW.engine;
    c.state.timeLeft -= dt;
    E.setModeHud(`<div class="mh-row team-a"><span>ALIADOS</span><b>${c.state.scoreA}</b></div>
      <div class="mh-row team-b"><span>ENEMIGOS</span><b>${c.state.scoreB}</b></div>
      <div class="mh-bar split"><i class="a" style="width:${c.state.scoreA/c.state.scoreLimit*100}%"></i><i class="b" style="width:${c.state.scoreB/c.state.scoreLimit*100}%"></i></div>
      <div class="mh-time">${formatTime(c.state.timeLeft)}</div>`);
    if(c.state.scoreA >= c.state.scoreLimit || c.state.scoreB >= c.state.scoreLimit || c.state.timeLeft<=0){
      const win = c.state.scoreA>c.state.scoreB ? 'ALIADOS' : (c.state.scoreB>c.state.scoreA ? 'ENEMIGOS' : 'EMPATE');
      GW.menuHooks.onMatchEnd({title: win==='ALIADOS'?'VICTORIA':(win==='EMPATE'?'EMPATE':'DERROTA'), sub:`${c.state.scoreA} - ${c.state.scoreB}`, kills:E.player.kills, deaths:E.player.deaths});
      E.freeze();
    }
  };
  c.onCombatantKilled = function(victimKind, victimRef, killerKind, killerRef){
    const killerTeam = killerKind==='player' ? GW.engine.player.team : (killerRef ? killerRef.team : null);
    if(killerTeam==='A') c.state.scoreA++;
    else if(killerTeam==='B') c.state.scoreB++;
  };
  return c;
};

/* --------------------- SEARCH & DESTROY --------------------- */
GW.MODE_FACTORIES.snd = function(){
  const c = baseController();
  c.allowRespawn = false;
  c.init = function(){
    const E = GW.engine;
    E.player.team = 'A';
    const half = Math.floor(E.bots.length/2);
    E.bots.forEach((b,i)=>{ b.team = i<half ? 'A' : 'B'; });
    c.state = {
      round:1, maxRounds:5, winsA:0, winsB:0, targetWins:3,
      attackTeam:'A', phase:'intro', roundTimer:0, ROUND_TIME:110,
      bombPlanted:false, bombTimer:0, BOMB_TIME:35,
      plantProgress:0, defuseProgress:0, bombSite:E.mapData.bombSite,
    };
    startRound();
  };

  function startRound(){
    const E = GW.engine;
    c.state.attackTeam = c.state.round<=2 ? 'A' : 'B';
    c.state.phase = 'live';
    c.state.roundTimer = c.state.ROUND_TIME;
    c.state.bombPlanted = false; c.state.bombTimer = 0;
    c.state.plantProgress = 0; c.state.defuseProgress = 0;
    E.respawnAllForRound();
    E.clearInteractPrompt();
    if(E.isPointerLocked()) E.frozen = false; // do not un-pause if the player paused during the round transition
    const atkLabel = c.state.attackTeam==='A' ? 'ATACAS' : 'DEFIENDES';
    E.showBanner(`RONDA ${c.state.round}`, atkLabel, 2000);
  }

  function endRound(winnerTeam){
    const E = GW.engine;
    const myMatchId = E.matchId;
    c.state.phase = 'roundEnd';
    if(winnerTeam==='A') c.state.winsA++; else c.state.winsB++;
    E.clearInteractPrompt();
    E.frozen = true; // freeze combat between rounds without exiting pointer lock / opening the pause menu
    const winLabel = winnerTeam===E.player.team ? 'RONDA GANADA' : 'RONDA PERDIDA';
    E.showBanner(winLabel, `${c.state.winsA} - ${c.state.winsB}`, 2300);
    GW.menuHooks.onRoundEnd({winnerTeam, winsA:c.state.winsA, winsB:c.state.winsB});
    setTimeout(()=>{
      if(E.matchId !== myMatchId) return;
      if(c.state.winsA>=c.state.targetWins || c.state.winsB>=c.state.targetWins || c.state.round>=c.state.maxRounds){
        const win = c.state.winsA>c.state.winsB ? 'A' : (c.state.winsB>c.state.winsA?'B':'EMPATE');
        const playerWon = win===E.player.team;
        GW.menuHooks.onMatchEnd({title: playerWon?'VICTORIA':(win==='EMPATE'?'EMPATE':'DERROTA'), sub:`${c.state.winsA} - ${c.state.winsB}`, kills:E.player.kills, deaths:E.player.deaths});
        E.freeze();
      } else {
        c.state.round++;
        startRound();
      }
    }, 2400);
  }
  c._endRound = endRound;

  c.update = function(dt){
    const E = GW.engine;
    const st = c.state;
    if(st.phase==='live'){
      st.roundTimer -= dt;
      const attackers = E.bots.filter(b=>b.team===st.attackTeam);
      const defenders = E.bots.filter(b=>b.team!==st.attackTeam);
      const playerIsAttacker = E.player.team===st.attackTeam;
      const attackersAlive = attackers.some(b=>b.alive) || (playerIsAttacker && E.player.alive);
      const defendersAlive = defenders.some(b=>b.alive) || (!playerIsAttacker && E.player.alive);

      if(!attackersAlive){ endRound(st.attackTeam==='A'?'B':'A'); return; }
      if(!defendersAlive){ endRound(st.attackTeam); return; }
      if(st.roundTimer<=0){ endRound(st.attackTeam==='A'?'B':'A'); return; }

      const pPos = E.getPlayerPosition();
      const distToSite = Math.hypot(pPos.x-st.bombSite.x, pPos.z-st.bombSite.z);
      let present = attackers.some(b=>b.alive && Math.hypot(b.pos.x-st.bombSite.x, b.pos.z-st.bombSite.z) < st.bombSite.r);
      if(playerIsAttacker && E.player.alive && distToSite<st.bombSite.r && E.keys['KeyE']) present = true;

      if(present){
        st.plantProgress += dt;
        if(playerIsAttacker && distToSite<st.bombSite.r) E.setInteractPrompt('MANTÉN [E] PARA PLANTAR', st.plantProgress/3.0);
        if(st.plantProgress>=3.0){
          st.phase='bombPlanted'; st.bombTimer=st.BOMB_TIME; st.plantProgress=0;
          E.clearInteractPrompt();
          E.showBanner('BOMBA PLANTADA','', 1500);
          GW.Audio.playBeep(700,0.2);
        }
      } else {
        st.plantProgress = Math.max(0, st.plantProgress-dt*2);
        if(playerIsAttacker && distToSite<st.bombSite.r) E.setInteractPrompt('MANTÉN [E] PARA PLANTAR', 0);
        else E.clearInteractPrompt();
      }
    } else if(st.phase==='bombPlanted'){
      st.bombTimer -= dt;
      if(Math.floor(st.bombTimer*2)%2===0) GW.Audio.playBeep(900,0.06);
      if(st.bombTimer<=0){ endRound(st.attackTeam); return; }

      const defenders = E.bots.filter(b=>b.team!==st.attackTeam);
      const playerIsDefender = E.player.team!==st.attackTeam;
      const pPos = E.getPlayerPosition();
      const distToSite = Math.hypot(pPos.x-st.bombSite.x, pPos.z-st.bombSite.z);
      let present = defenders.some(b=>b.alive && Math.hypot(b.pos.x-st.bombSite.x, b.pos.z-st.bombSite.z) < st.bombSite.r);
      if(playerIsDefender && E.player.alive && distToSite<st.bombSite.r && E.keys['KeyE']) present = true;

      if(present){
        st.defuseProgress += dt;
        if(playerIsDefender && distToSite<st.bombSite.r) E.setInteractPrompt('MANTÉN [E] PARA DESACTIVAR', st.defuseProgress/4.0);
        if(st.defuseProgress>=4.0){ endRound(st.attackTeam==='A'?'B':'A'); return; }
      } else {
        st.defuseProgress = Math.max(0, st.defuseProgress-dt*2);
        if(playerIsDefender && distToSite<st.bombSite.r) E.setInteractPrompt('MANTÉN [E] PARA DESACTIVAR', 0);
        else E.clearInteractPrompt();
      }
    }

    E.setModeHud(`<div class="mh-row"><span>RONDA ${st.round}</span><b>${st.winsA} - ${st.winsB}</b></div>
      <div class="mh-time">${st.phase==='bombPlanted' ? '💣 '+formatTime(st.bombTimer) : formatTime(Math.max(0,st.roundTimer))}</div>`);
  };

  c.onCombatantKilled = function(){};
  return c;
};

/* ---------------------------- GUN GAME ---------------------------- */
GW.MODE_FACTORIES.gungame = function(){
  const c = baseController();
  c.allowRespawn = true;
  const LADDER = ['pistol','smg','shotgun','rifle','dmr','sniper'];
  c.init = function(){
    const E = GW.engine;
    E.player.team = 'A';
    E.bots.forEach(b=>b.team='B');
    c.state = { tier:0, timeLeft:(E.config.timeLimitMin||8)*60 };
    E.setForcedWeapon(LADDER[0]);
    E.setModeHud();
  };
  c.update = function(dt){
    const E = GW.engine;
    c.state.timeLeft -= dt;
    E.setModeHud(`<div class="mh-row"><span>ARMA</span><b>${GW.getWeaponDef(LADDER[c.state.tier]).name}</b></div>
      <div class="mh-ladder">${LADDER.map((w,i)=>`<i class="${i<c.state.tier?'done':(i===c.state.tier?'cur':'')}"></i>`).join('')}</div>
      <div class="mh-time">${formatTime(c.state.timeLeft)}</div>`);
    if(c.state.timeLeft<=0){
      GW.menuHooks.onMatchEnd({title:'TIEMPO AGOTADO', sub:`Llegaste a: ${GW.getWeaponDef(LADDER[c.state.tier]).name}`, kills:E.player.kills, deaths:E.player.deaths});
      E.freeze();
    }
  };
  c.onCombatantKilled = function(victimKind, victimRef, killerKind){
    const E = GW.engine;
    if(killerKind==='player'){
      c.state.tier++;
      if(c.state.tier>=LADDER.length){
        GW.menuHooks.onMatchEnd({title:'VICTORIA', sub:'Completaste la escalera de armas', kills:E.player.kills, deaths:E.player.deaths});
        E.freeze();
      } else {
        E.setForcedWeapon(LADDER[c.state.tier]);
        E.showBanner('¡ASCENSO!', GW.getWeaponDef(LADDER[c.state.tier]).name, 1400);
      }
    }
  };
  return c;
};

/* ---------------------------- HORDE / SURVIVAL ---------------------------- */
GW.MODE_FACTORIES.horde = function(){
  const c = baseController();
  c.allowRespawn = true;
  c.allowBotRespawn = false; // wave logic manages bot lifecycle explicitly, not per-bot auto-respawn
  const MAX_BOTS = 20;

  c.init = function(){
    const E = GW.engine;
    E.player.team = 'A';
    E.bots.forEach(b=>b.team='B');
    c.state = { wave:0, waveTransition:false, timeLeft:(E.config.timeLimitMin||8)*60 };
    E.setModeHud();
    startWave();
  };

  function startWave(){
    const E = GW.engine;
    const st = c.state;
    st.wave++;
    st.waveTransition = false;
    const targetCount = Math.min(MAX_BOTS, E.config.botCount + (st.wave-1)*2);
    E.bots.forEach(b=>GW.Bots.respawn(b));
    while(E.bots.length < targetCount){
      const b = GW.Bots.create('B', E.config.difficulty, E.mapData.spawnsFFA);
      E.bots.push(b);
    }
    const healthMul = Math.min(2.2, 1 + (st.wave-1)*0.09);
    const speedMul = Math.min(1.5, 1 + (st.wave-1)*0.045);
    E.bots.forEach(b=>{
      b.maxHealth = 100*b.difficulty.healthMul*healthMul;
      b.health = b.maxHealth;
      b.speed = 2.2*b.difficulty.speedMul*speedMul;
      b.runSpeed = 3.7*b.difficulty.speedMul*speedMul;
    });
    E.showBanner('OLEADA '+st.wave, `${E.bots.length} enemigos`, 2200);
    GW.Audio.playChord(true);
  }

  c.update = function(dt){
    const E = GW.engine;
    const st = c.state;
    st.timeLeft -= dt;

    if(!st.waveTransition && E.bots.length>0 && E.bots.every(b=>!b.alive)){
      st.waveTransition = true;
      const myMatchId = E.matchId;
      setTimeout(()=>{
        if(E.matchId !== myMatchId) return;
        startWave();
      }, 2000);
    }

    E.setModeHud(`<div class="mh-row"><span>OLEADA</span><b>${st.wave}</b></div>
      <div class="mh-row"><span>BAJAS</span><b>${E.player.kills}</b></div>
      <div class="mh-time">${formatTime(Math.max(0,st.timeLeft))}</div>`);

    if(st.timeLeft<=0){
      GW.menuHooks.onMatchEnd({title:'FIN DE LA HORDA', sub:`Sobreviviste ${st.wave} oleadas · ${E.player.kills} bajas`, kills:E.player.kills, deaths:E.player.deaths});
      E.freeze();
    }
  };

  c.onCombatantKilled = function(){};
  return c;
};

function formatTime(s){
  s = Math.max(0,Math.floor(s));
  const m = Math.floor(s/60), sec = s%60;
  return m+':'+(sec<10?'0':'')+sec;
}

})();
