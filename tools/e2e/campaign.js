// End-to-end campaign walkthrough in real headless Chrome.
// Drives the menu, starts the campaign, bypasses pointer lock, teleports the
// player between zones, talks to NPCs with real key events, kills waves, and
// asserts the mission state machine at every step. Saves screenshots.
// SwiftShader renders slowly and the game clamps dt to 50ms, so simulation
// time runs slower than wall time: every wait here is expressed in SIM seconds
// (mode.state.missionTime) or game frames (GW.engine.frameId).
const puppeteer = require('puppeteer-core');
const path = require('path');
const CHROME = process.env.CHROME_PATH || ['C:/Program Files/Google/Chrome/Application/chrome.exe','/Applications/Google Chrome.app/Contents/MacOS/Google Chrome','/usr/bin/google-chrome'].find(p=>{ try{ return require('fs').existsSync(p); }catch(e){ return false; } });
const INDEX = 'file:///' + path.resolve(__dirname, '..', '..', 'index.html').replace(/\\/g,'/');
const fs = require('fs');

const SHOTS = path.join(__dirname, 'shots');
fs.mkdirSync(SHOTS, {recursive:true});
const BIG = process.argv.includes('--big');

const sleep = ms => new Promise(r=>setTimeout(r,ms));
const failures = [];
function check(name, cond, extra){ if(cond) console.log('  ok   '+name); else { console.log('  FAIL '+name+(extra!==undefined?' -> '+JSON.stringify(extra):'')); failures.push(name); } }

let browser, page; const logs = [];
(async () => {
  browser = await puppeteer.launch({
    executablePath: CHROME, headless: 'new',
    args: ['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--autoplay-policy=no-user-gesture-required','--window-size=1280,800','--allow-file-access-from-files'],
  });
  page = await browser.newPage();
  await page.setViewport(BIG ? {width:1280,height:800} : {width:900,height:560});
  page.on('console', m => { const t = m.type(); if(t==='error'||t==='warning'||t==='warn') logs.push(`[console.${t}] ${m.text()}`); });
  page.on('pageerror', e => logs.push(`[pageerror] ${e.message}`));
  await page.goto(INDEX, {waitUntil:'load', timeout: 60000});
  await sleep(2500);

  const shot = async name => { await page.screenshot({path: path.join(SHOTS, name+'.png')}); console.log('  shot '+name); };
  const ev = (fn, ...args) => page.evaluate(fn, ...args);
  const state = () => ev(() => {
    const E = GW.engine; const st = E.mode && E.mode.state || {};
    const p = E.getPlayerPosition();
    return { stage: st.stage, objective: st.objectiveText, alive: E.bots.filter(b=>b.alive).length, total: E.bots.length,
      px: +p.x.toFixed(1), pz: +p.z.toFixed(1), hp: Math.round(E.player.health), deaths: E.player.deaths, kills: E.player.kills,
      spawnsA: E.mapData.spawnsA, marker: E.objectiveMarker, dlg: document.getElementById('dialoguePanel').style.display,
      prompt: document.getElementById('interactPrompt').style.opacity, boss: document.getElementById('bossBar').style.display,
      holdTimer: st.holdTimer, inputLocked: E.inputLocked, wp: document.getElementById('waypoint').style.display,
      elite: !!E.bots.find(b=>b.isElite && b.alive), frozen: E.frozen, sim: st.missionTime, frame: E.frameId,
      npcVisible: E.scene.children.filter(o=>o.userData && o.userData.torso && o.visible).length };
  });
  const frames = async (n) => { const f0 = await ev(()=>GW.engine.frameId||0); while((await ev(()=>GW.engine.frameId||0)) < f0+n) await sleep(30); };
  const waitSim = async (sec) => { const t0 = (await state()).sim||0; const start = Date.now(); while(((await state()).sim||0) < t0+sec){ await sleep(80); if(Date.now()-start > 90000) break; } };
  const teleport = (x,z) => ev((x,z)=>{ GW.engine.setPlayerPosition(x,z); }, x, z);
  const pressE = async () => { await page.keyboard.down('KeyE'); await frames(2); await page.keyboard.up('KeyE'); await frames(2); };
  const killAll = () => ev(()=>{ GW.engine.bots.filter(b=>b.alive).forEach(b=>GW.engine.damageBot(b, 99999, 'player')); });
  const talkThrough = async (max=16) => {
    for(let i=0;i<max;i++){ const s = await state(); if(s.dlg==='none') return i; await pressE(); }
    return -1;
  };
  const waitFor = async (pred, simSec=10) => { const t0 = (await state()).sim||0; const start=Date.now(); for(;;){ const s=await state(); if(pred(s)) return s; if((s.sim||0) > t0+simSec || Date.now()-start>120000) return s; await sleep(100);} };

  console.log('== menu ==');
  await shot('00_menu');
  await page.click('#btnCampaign'); await sleep(300);
  let ui = await ev(()=>({ active: document.querySelector('.screen.active').id, mode: document.querySelector('#modeList .card.active').dataset.mode,
    maps: [...document.querySelectorAll('#mapList .card')].map(c=>c.dataset.map), botRow: document.getElementById('botCountSection').style.display,
    brief: document.getElementById('campaignBrief').style.display }));
  check('campaign button opens setup with campaign mode', ui.active==='screen-setup' && ui.mode==='campaign', ui);
  check('only the campaign map is listed', ui.maps.length===1 && ui.maps[0]==='campaign', ui.maps);
  check('bot count hidden, brief shown', ui.botRow==='none' && ui.brief==='block', ui);
  await shot('01_setup_campaign');
  await page.click('.tab-btn[data-tab="ajustes"]'); await sleep(250);
  await page.click('#crosshairStyleButtons .dbtn[data-val="circle"]'); await sleep(100);
  await page.click('#crosshairColorButtons .ch-swatch[data-val="#30e3ff"]'); await sleep(100);
  const prev = await ev(()=>({ cls: document.getElementById('chPreview').className, color: getComputedStyle(document.getElementById('crosshairPreview')).getPropertyValue('--ch-color').trim() }));
  check('crosshair preview follows settings', prev.cls.includes('ch-style-circle') && prev.color==='#30e3ff', prev);
  await shot('02_settings_preview');
  if(!BIG) await page.click('#graphicsQualityButtons .dbtn[data-val="baja"]');
  await page.click('#crosshairStyleButtons .dbtn[data-val="crossdot"]');
  await page.click('#crosshairColorButtons .ch-swatch[data-val="#d2ffbe"]');
  await sleep(100);
  await page.click('.tab-btn[data-tab="partida"]'); await sleep(150);
  await page.click('#btnStartMatch'); await sleep(1500);
  await ev(()=>{ GW.engine.frozen=false; document.getElementById('playPrompt').style.display='none'; });
  await frames(3);
  const fps = await (async()=>{ const f0=(await state()).frame; const t0=Date.now(); await sleep(2000); const f1=(await state()).frame; return ((f1-f0)/((Date.now()-t0)/1000)).toFixed(1); })();
  console.log('  sim fps ~'+fps);

  console.log('== briefing ==');
  let s = await state();
  check('stage BRIEFING with zero enemies', s.stage===0 && s.total===0, s);
  check('player spawned at camp looking down the valley', s.pz>50, s);
  check('waypoint visible toward Vega', s.wp==='block' && s.marker && s.marker.z===49, s);
  await shot('10_camp');
  await teleport(2.5, 51.2); await frames(3);
  s = await state();
  check('talk prompt near Vega', s.prompt==='1', s);
  await pressE(); await frames(2);
  s = await state();
  check('dialogue opened, input locked', s.dlg==='flex' && s.inputLocked===true, s);
  await waitSim(1.2); await shot('11_dialogue_vega');
  const n = await talkThrough();
  s = await state();
  check('dialogue closed after lines', s.dlg==='none' && !s.inputLocked && s.stage===1, {presses:n, s});
  check('objective marker moved to trench', s.marker && s.marker.z===30, s.marker);

  console.log('== trench ==');
  await teleport(0, 31); s = await waitFor(x=>x.stage===2 && x.total>=5, 6);
  check('trench wave triggered (5 enemies)', s.stage===2 && s.total===5, s);
  check('checkpoint moved to trench', s.spawnsA[0][1]===38, s.spawnsA);
  await waitSim(0.8); await shot('20_trench');
  await ev(()=>GW.engine.damagePlayer(9999)); s = await waitFor(x=>x.hp>0 && x.deaths===1, 6);
  check('death -> respawn at trench checkpoint', s.deaths===1 && s.hp>=90 && Math.abs(s.pz-38)<0.5, s);
  await killAll(); s = await waitFor(x=>x.stage===3, 6);
  check('trench cleared -> FIND_RUIZ', s.stage===3 && s.hp>=90, s);
  await frames(3); s = await state();
  check('Vega + Ruiz visible', s.npcVisible===2, s.npcVisible);

  console.log('== ruiz + courtyard ==');
  await teleport(-4, 15.2); await frames(3);
  s = await state(); check('prompt near Ruiz', s.prompt==='1', s);
  await pressE(); await talkThrough();
  s = await state(); check('Ruiz dialogue -> ADVANCE_COURTYARD', s.stage===4 && s.dlg==='none', s);
  await teleport(0, 6); s = await waitFor(x=>x.stage===5, 4);
  check('courtyard wave triggered', s.stage===5, s);
  s = await waitFor(x=>x.alive>=9, 10);
  check('7 + 2 flankers deployed', s.alive===9, s);
  await shot('30_courtyard');
  await killAll(); s = await waitFor(x=>x.stage===6, 6);
  check('courtyard cleared -> ADVANCE_COMPOUND', s.stage===6 && s.spawnsA[0][1]===-4, s);

  console.log('== compound ==');
  await teleport(0, -10); s = await waitFor(x=>x.stage===7 && x.elite, 8);
  check('compound wave + commander deployed', s.stage===7 && s.elite && s.boss==='block', s);
  await waitSim(1.5); await shot('40_compound_boss');
  const eliteHp = await ev(()=>{ const e=GW.engine.bots.find(b=>b.isElite); return e ? {hp:e.health, max:e.maxHealth, scale:+e.group.scale.x.toFixed(2), base:e.bodyMat.userData.base} : null; });
  check('commander is tanky + tinted', eliteHp && eliteHp.max>250 && eliteHp.scale>1.2 && eliteHp.base===0x4a1414, eliteHp);
  s = await waitFor(x=>x.total>=21, 8);
  check('all 6 guards + commander deployed', s.total===21, s);
  await killAll(); s = await waitFor(x=>x.stage===8, 6);
  check('commander killed -> ADVANCE_FINAL', s.stage===8 && s.boss==='none' && s.spawnsA[0][1]===-40, s);
  s = await waitFor(x=>x.dlg==='flex', 4);
  check('radio transmission after Korvin', s.dlg==='flex' && !s.inputLocked, s);
  await pressE();

  console.log('== hold ==');
  await teleport(0, -46); s = await waitFor(x=>x.stage===9, 4);
  check('hold started on pad', s.stage===9 && s.holdTimer>50, s);
  s = await waitFor(x=>x.alive>=4, 8);
  check('first hold batch deployed', s.alive>=4, s);
  await shot('50_hold');
  await ev(()=>{ GW.engine.mode.state.holdTimer = 0.4; });
  for(let i=0;i<8;i++){ await waitSim(1.2); await killAll(); s = await state(); if(s.stage===10) break; }
  s = await waitFor(x=>x.stage===10, 6);
  check('hold complete -> CALL_EXTRACTION', s.stage===10 && s.alive===0, s);
  await frames(3); s = await state();
  check('Ortega visible', s.npcVisible===3, s.npcVisible);

  console.log('== extraction ==');
  await teleport(3.2, -52); await frames(3);
  s = await state(); check('prompt near Ortega', s.prompt==='1', s);
  for(let attempt=0; attempt<3; attempt++){
    await pressE();
    s = await state();
    const diag = await ev(()=>({ keyE: GW.engine.keys.KeyE, dlgOpen: document.getElementById('dialoguePanel').style.display, radioCls: document.getElementById('dialoguePanel').className, speaker: document.getElementById('dialogueSpeaker').textContent, text: document.getElementById('dialogueText').textContent.slice(0,40) }));
    console.log('  ortega press #'+(attempt+1)+' -> '+JSON.stringify(diag));
    if(s.dlg==='flex' && diag.radioCls.indexOf('radio')<0) break;
    await frames(3);
  }
  await talkThrough();
  s = await waitFor(x=>x.stage===11, 3);
  check('Ortega -> EXTRACTION', s.stage===11, s);
  await teleport(4, -38); await waitSim(5.5); await shot('60_heli_inbound');
  s = await waitFor(x=>x.stage===12, 14);
  check('helicopter landed -> DONE', s.stage===12, s);
  await shot('61_heli_landed');
  s = await waitFor(x=>x.frozen, 6);
  const endUi = await ev(()=>({ display: document.getElementById('matchEndScreen').style.display, title: document.getElementById('meTitle').textContent, sub: document.getElementById('meSub').textContent, stats: document.getElementById('meStats').textContent }));
  check('mission complete screen with stats', endUi.display==='flex' && endUi.title==='MISIÓN CUMPLIDA' && /Precisión/.test(endUi.stats), endUi);
  console.log('  end: '+endUi.sub+' | '+endUi.stats);
  await shot('70_end');

  console.log('== restart / cleanup ==');
  await page.click('#btnPlayAgain'); await sleep(1500);
  await ev(()=>{ GW.engine.frozen=false; document.getElementById('playPrompt').style.display='none'; });
  await frames(3);
  s = await state();
  const npcCount = await ev(()=>GW.engine.scene.children.filter(o=>o.userData && o.userData.torso).length);
  check('restart resets to BRIEFING with fresh NPCs (no leaks)', s.stage===0 && s.total===0 && npcCount===3, {s, npcCount});
})().catch(e => { console.error('HARNESS FAILURE', e); failures.push('harness crash'); })
.finally(async () => {
  console.log('== console ==');
  console.log('LOGS', logs.length); logs.forEach(l=>console.log('  '+l));
  console.log(failures.length ? `\nFAILURES (${failures.length}): ${failures.join(' | ')}` : '\nALL CHECKS PASSED');
  if(browser) await browser.close();
  process.exit(failures.length?1:0);
});
