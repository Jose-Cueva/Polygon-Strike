window.GW = window.GW || {};
GW.menuHooks = GW.menuHooks || {};

(function(){

const cfg = {
  modeId:'ffa', mapId:'industrial', botCount:8, difficulty:'normal', primaryWeapon:'rifle',
  sensitivity:1.0, masterVolume:70, timeLimitMin:8, friendlyFire:false, invertY:false,
  fov:75, graphicsQuality:'alta', gore:true, showMinimap:true, adsMode:'hold'
};
let matchEndShown = false;

const el = id => document.getElementById(id);

function showScreen(name){
  ['main','setup'].forEach(n=>el('screen-'+n).classList.toggle('active', n===name));
}

function showTab(name){
  el('setupTabs').querySelectorAll('.tab-btn').forEach(b=>b.classList.toggle('active', b.dataset.tab===name));
  document.querySelectorAll('.tab-panel').forEach(p=>p.classList.toggle('active', p.dataset.tabPanel===name));
}
el('setupTabs').addEventListener('click', (e)=>{
  const btn = e.target.closest('.tab-btn'); if(!btn) return;
  GW.Audio.playUIClick();
  showTab(btn.dataset.tab);
});

/* ---------------- Setup screen: dynamic content ---------------- */
function renderModeList(){
  el('modeList').innerHTML = GW.MODE_META.map(m=>`
    <div class="card ${m.id===cfg.modeId?'active':''}" data-mode="${m.id}">
      <div class="card-title">${m.name}</div>
      <div class="card-desc">${m.desc}</div>
    </div>`).join('');
}
function renderMapList(){
  el('mapList').innerHTML = GW.MAPS.map(m=>`
    <div class="card ${m.id===cfg.mapId?'active':''}" data-map="${m.id}">
      <div class="map-swatch" style="background:linear-gradient(135deg, ${m.skyColors[0]}, ${m.groundColor})"></div>
      <div class="card-title">${m.name}</div>
      <div class="card-desc">${m.desc}</div>
    </div>`).join('');
}
function renderWeaponList(){
  const opts = GW.WEAPON_DEFS.filter(w=>w.key!=='pistol');
  const gunGame = cfg.modeId==='gungame';
  el('weaponList').innerHTML = opts.map(w=>`
    <div class="card ${w.key===cfg.primaryWeapon?'active':''} ${gunGame?'disabled':''}" data-weapon="${w.key}">
      <div class="card-title">${w.icon} ${w.name}</div>
      <div class="card-desc">${w.desc}</div>
    </div>`).join('');
  el('weaponNote').style.display = gunGame ? 'block' : 'none';
}
function renderDifficulty(){
  el('difficultyButtons').querySelectorAll('.dbtn').forEach(b=>{
    b.classList.toggle('active', b.dataset.diff===cfg.difficulty);
  });
}
function renderBotCount(){
  el('botCountRange').value = cfg.botCount;
  el('botCountVal').textContent = cfg.botCount;
}
function renderSensitivity(){
  el('sensitivityRange').value = cfg.sensitivity;
  el('sensitivityVal').textContent = cfg.sensitivity.toFixed(2)+'x';
}
function renderVolume(){
  el('volumeRange').value = cfg.masterVolume;
  el('volumeVal').textContent = cfg.masterVolume+'%';
}
function renderTimeLimit(){
  el('timeLimitRange').value = cfg.timeLimitMin;
  el('timeLimitVal').textContent = cfg.timeLimitMin+' min';
}
function renderFriendlyFire(){
  el('friendlyFireButtons').querySelectorAll('.dbtn').forEach(b=>{
    b.classList.toggle('active', (b.dataset.val==='on')===cfg.friendlyFire);
  });
}
function renderInvertY(){
  el('invertYButtons').querySelectorAll('.dbtn').forEach(b=>{
    b.classList.toggle('active', (b.dataset.val==='on')===cfg.invertY);
  });
}
function renderAdsMode(){
  el('adsModeButtons').querySelectorAll('.dbtn').forEach(b=>{
    b.classList.toggle('active', b.dataset.val===cfg.adsMode);
  });
}
function renderFov(){
  el('fovRange').value = cfg.fov;
  el('fovVal').textContent = cfg.fov+'°';
}
function renderGraphicsQuality(){
  el('graphicsQualityButtons').querySelectorAll('.dbtn').forEach(b=>{
    b.classList.toggle('active', b.dataset.val===cfg.graphicsQuality);
  });
}
function renderGore(){
  el('goreButtons').querySelectorAll('.dbtn').forEach(b=>{
    b.classList.toggle('active', (b.dataset.val==='on')===cfg.gore);
  });
}
function renderMinimap(){
  el('minimapButtons').querySelectorAll('.dbtn').forEach(b=>{
    b.classList.toggle('active', (b.dataset.val==='on')===cfg.showMinimap);
  });
}

function renderSetup(){
  renderModeList(); renderMapList(); renderWeaponList(); renderDifficulty(); renderBotCount();
  renderSensitivity(); renderVolume(); renderTimeLimit(); renderFriendlyFire(); renderInvertY();
  renderAdsMode(); renderFov(); renderGraphicsQuality(); renderGore(); renderMinimap();
  showTab('partida');
}

el('modeList').addEventListener('click', (e)=>{
  const card = e.target.closest('.card'); if(!card) return;
  cfg.modeId = card.dataset.mode;
  GW.Audio.playUIClick();
  renderModeList(); renderWeaponList();
});
el('mapList').addEventListener('click', (e)=>{
  const card = e.target.closest('.card'); if(!card) return;
  cfg.mapId = card.dataset.map;
  GW.Audio.playUIClick();
  renderMapList();
});
el('weaponList').addEventListener('click', (e)=>{
  const card = e.target.closest('.card'); if(!card || card.classList.contains('disabled')) return;
  cfg.primaryWeapon = card.dataset.weapon;
  GW.Audio.playUIClick();
  renderWeaponList();
});
el('difficultyButtons').addEventListener('click', (e)=>{
  const btn = e.target.closest('.dbtn'); if(!btn) return;
  cfg.difficulty = btn.dataset.diff;
  GW.Audio.playUIClick();
  renderDifficulty();
});
el('botCountRange').addEventListener('input', (e)=>{
  cfg.botCount = parseInt(e.target.value,10);
  el('botCountVal').textContent = cfg.botCount;
});
el('sensitivityRange').addEventListener('input', (e)=>{
  cfg.sensitivity = parseFloat(e.target.value);
  el('sensitivityVal').textContent = cfg.sensitivity.toFixed(2)+'x';
});
el('volumeRange').addEventListener('input', (e)=>{
  cfg.masterVolume = parseInt(e.target.value,10);
  el('volumeVal').textContent = cfg.masterVolume+'%';
  GW.Audio.setVolume(cfg.masterVolume/100);
});
el('timeLimitRange').addEventListener('input', (e)=>{
  cfg.timeLimitMin = parseInt(e.target.value,10);
  el('timeLimitVal').textContent = cfg.timeLimitMin+' min';
});
el('friendlyFireButtons').addEventListener('click', (e)=>{
  const btn = e.target.closest('.dbtn'); if(!btn) return;
  cfg.friendlyFire = btn.dataset.val==='on';
  GW.Audio.playUIClick();
  renderFriendlyFire();
});
el('invertYButtons').addEventListener('click', (e)=>{
  const btn = e.target.closest('.dbtn'); if(!btn) return;
  cfg.invertY = btn.dataset.val==='on';
  GW.Audio.playUIClick();
  renderInvertY();
});
el('adsModeButtons').addEventListener('click', (e)=>{
  const btn = e.target.closest('.dbtn'); if(!btn) return;
  cfg.adsMode = btn.dataset.val;
  GW.Audio.playUIClick();
  renderAdsMode();
});
el('fovRange').addEventListener('input', (e)=>{
  cfg.fov = parseInt(e.target.value,10);
  el('fovVal').textContent = cfg.fov+'°';
});
el('graphicsQualityButtons').addEventListener('click', (e)=>{
  const btn = e.target.closest('.dbtn'); if(!btn) return;
  cfg.graphicsQuality = btn.dataset.val;
  GW.Audio.playUIClick();
  renderGraphicsQuality();
});
el('goreButtons').addEventListener('click', (e)=>{
  const btn = e.target.closest('.dbtn'); if(!btn) return;
  cfg.gore = btn.dataset.val==='on';
  GW.Audio.playUIClick();
  renderGore();
});
el('minimapButtons').addEventListener('click', (e)=>{
  const btn = e.target.closest('.dbtn'); if(!btn) return;
  cfg.showMinimap = btn.dataset.val==='on';
  GW.Audio.playUIClick();
  renderMinimap();
});

/* ---------------- Navigation ---------------- */
el('btnPlay').addEventListener('click', ()=>{
  GW.Audio.ensure(); GW.Audio.playUIClick();
  renderSetup();
  showScreen('setup');
});
el('btnBack').addEventListener('click', ()=>{ GW.Audio.playUIClick(); showScreen('main'); });
el('btnStartMatch').addEventListener('click', startMatchFlow);

function setInMatchUI(active){
  el('menuRoot').style.display = active ? 'none' : 'flex';
  el('hud').style.display = active ? 'block' : 'none';
}

function startMatchFlow(){
  GW.Audio.playUIClick();
  matchEndShown = false;
  hidePauseMenu(); hideMatchEnd();
  setInMatchUI(true);
  GW.Audio.setVolume(cfg.masterVolume/100);
  GW.engine.startMatch(cfg);
  showPlayPrompt('HAZ CLIC PARA JUGAR');
}

/* ---------------- Play prompt (pointer lock gate) ---------------- */
function showPlayPrompt(title){
  el('playPromptTitle').textContent = title;
  el('playPrompt').style.display = 'flex';
}
function hidePlayPrompt(){ el('playPrompt').style.display = 'none'; }
el('playPromptBtn').addEventListener('click', ()=>{ GW.engine.requestPointerLock(); });

/* ---------------- Pause menu ---------------- */
function showPauseMenu(){
  el('pauseStats').textContent = `Bajas: ${GW.engine.player.kills}  ·  Muertes: ${GW.engine.player.deaths}`;
  el('pauseMenu').style.display = 'flex';
}
function hidePauseMenu(){ el('pauseMenu').style.display = 'none'; }

el('btnResume').addEventListener('click', ()=>{ GW.Audio.playUIClick(); hidePauseMenu(); GW.engine.requestPointerLock(); });
el('btnRestart').addEventListener('click', ()=>{
  GW.Audio.playUIClick();
  hidePauseMenu();
  GW.engine.startMatch(cfg);
  showPlayPrompt('HAZ CLIC PARA JUGAR');
});
el('btnChangeSetup').addEventListener('click', ()=>{
  GW.Audio.playUIClick();
  hidePauseMenu();
  GW.engine.quitMatch();
  setInMatchUI(false);
  renderSetup();
  showScreen('setup');
});
el('btnQuit').addEventListener('click', ()=>{
  GW.Audio.playUIClick();
  hidePauseMenu();
  GW.engine.quitMatch();
  setInMatchUI(false);
  showScreen('main');
});

/* ---------------- Match end ---------------- */
function showMatchEnd(result){
  matchEndShown = true;
  hidePauseMenu(); hidePlayPrompt();
  el('meTitle').textContent = result.title;
  el('meSub').textContent = result.sub||'';
  el('meStats').textContent = `Bajas: ${result.kills}  ·  Muertes: ${result.deaths}`;
  el('matchEndScreen').style.display = 'flex';
}
function hideMatchEnd(){ el('matchEndScreen').style.display = 'none'; }

el('btnPlayAgain').addEventListener('click', ()=>{
  GW.Audio.playUIClick();
  hideMatchEnd();
  GW.engine.startMatch(cfg);
  showPlayPrompt('HAZ CLIC PARA JUGAR');
});
el('btnMeSetup').addEventListener('click', ()=>{
  GW.Audio.playUIClick();
  hideMatchEnd();
  GW.engine.quitMatch();
  setInMatchUI(false);
  renderSetup();
  showScreen('setup');
});
el('btnMeMenu').addEventListener('click', ()=>{
  GW.Audio.playUIClick();
  hideMatchEnd();
  GW.engine.quitMatch();
  setInMatchUI(false);
  showScreen('main');
});

/* ---------------- Engine hooks ---------------- */
GW.menuHooks.onPointerLocked = function(){
  hidePlayPrompt(); hidePauseMenu();
};
GW.menuHooks.onPointerUnlocked = function(){
  if(!matchEndShown) showPauseMenu();
};
GW.menuHooks.onMatchEnd = function(result){
  showMatchEnd(result);
};
GW.menuHooks.onRoundEnd = function(){};

showScreen('main');
setInMatchUI(false);

})();
