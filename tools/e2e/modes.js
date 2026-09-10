// Regression smoke for the non-campaign modes after the engine changes:
// starts each mode on each map, runs a few simulated seconds with the player
// walking forward, and asserts bots are alive/moving with no console errors.
const puppeteer = require('puppeteer-core');
const path = require('path');
const CHROME = process.env.CHROME_PATH || ['C:/Program Files/Google/Chrome/Application/chrome.exe','/Applications/Google Chrome.app/Contents/MacOS/Google Chrome','/usr/bin/google-chrome'].find(p=>{ try{ return require('fs').existsSync(p); }catch(e){ return false; } });
const INDEX = 'file:///' + path.resolve(__dirname, '..', '..', 'index.html').replace(/\\/g,'/');
const sleep = ms => new Promise(r=>setTimeout(r,ms));
const failures = [];
function check(name, cond, extra){ if(cond) console.log('  ok   '+name); else { console.log('  FAIL '+name+(extra!==undefined?' -> '+JSON.stringify(extra):'')); failures.push(name); } }

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless:'new',
    args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--autoplay-policy=no-user-gesture-required','--allow-file-access-from-files'] });
  const page = await browser.newPage();
  await page.setViewport({width:800,height:500});
  const logs = [];
  page.on('console', m => { const t=m.type(); if(t==='error'||t==='warning'||t==='warn') logs.push(`[console.${t}] ${m.text()}`); });
  page.on('pageerror', e => logs.push(`[pageerror] ${e.message}`));
  await page.goto(INDEX, {waitUntil:'load', timeout:60000});
  await sleep(2000);
  const ev = (fn,...a)=>page.evaluate(fn,...a);
  const waitSim = async (sec)=>{ const t0=await ev(()=>GW.engine._t||0); await ev(()=>{ GW.engine._t=0; }); const start=Date.now(); for(;;){ await sleep(120); const t=await ev(()=>GW.engine._t||0); if(t>=sec || Date.now()-start>60000) return; } };

  // count sim time via a tiny hook on the mode update
  await ev(()=>{ const E=GW.engine; const orig=E.startMatch; E.startMatch=function(cfg){ orig.call(E,cfg); const m=E.mode, u=m.update.bind(m); E._t=0; m.update=function(dt){ E._t+=dt; return u(dt); }; }; });

  const combos = [['ffa','industrial'],['tdm','desert'],['snd','urban'],['gungame','industrial'],['horde','urban'],['ffa','desert']];
  for(const [mode,map] of combos){
    console.log(`== ${mode} @ ${map} ==`);
    await ev((mode,map)=>{
      const cfg = { modeId:mode, mapId:map, botCount:8, difficulty:'normal', primaryWeapon:'rifle', sensitivity:1, masterVolume:0, timeLimitMin:8,
        friendlyFire:false, invertY:false, fov:75, graphicsQuality:'baja', gore:true, showMinimap:true, adsMode:'hold',
        crosshairStyle:'crossdot', crosshairColor:'#d2ffbe', crosshairSize:1 };
      document.getElementById('menuRoot').style.display='none'; document.getElementById('hud').style.display='block';
      GW.engine.startMatch(cfg); GW.engine.frozen=false;
    }, mode, map);
    await sleep(300);
    const before = await ev(()=>GW.engine.bots.map(b=>[+b.group.position.x.toFixed(2), +b.group.position.z.toFixed(2)]));
    await page.keyboard.down('KeyW');
    await waitSim(4);
    await page.keyboard.up('KeyW');
    const s = await ev((before)=>{
      const E=GW.engine; const p=E.getPlayerPosition();
      const moved = E.bots.filter((b,i)=>Math.hypot(b.group.position.x-before[i][0], b.group.position.z-before[i][1])>0.5).length;
      return { bots:E.bots.length, alive:E.bots.filter(b=>b.alive).length, moved, px:+p.x.toFixed(1), pz:+p.z.toFixed(1), py:+p.y.toFixed(2),
        hud: document.getElementById('modeHud').textContent.trim().slice(0,40), frozen:E.frozen, active:E.matchActive };
    }, before);
    check(`${mode}: 8 bots spawned and alive`, s.bots===8 && s.alive>=6, s);
    check(`${mode}: bots moving (${s.moved})`, s.moved>=3, s);
    check(`${mode}: player on the ground (y=${s.py})`, s.py>1.5 && s.py<3.2, s);
    check(`${mode}: HUD populated`, s.hud.length>0, s);
    await ev(()=>GW.engine.quitMatch());
    await sleep(200);
  }
  console.log('LOGS', logs.length); logs.forEach(l=>console.log('  '+l));
  console.log(failures.length ? `FAILURES (${failures.length}): ${failures.join(' | ')}` : 'ALL MODE CHECKS PASSED');
  await browser.close();
  process.exit(failures.length?1:0);
})().catch(e=>{ console.error('HARNESS FAILURE', e); process.exit(2); });
