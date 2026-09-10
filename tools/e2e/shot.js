// Quick visual probe: start a match at the given quality, teleport to a spot,
// aim, screenshot. Usage: node shot.js [--quality=alta] [--mode=campaign] [--map=campaign] [--x=0 --z=56 --yaw=0] [--out=shot.png]
const puppeteer = require('puppeteer-core');
const path = require('path');
const CHROME = process.env.CHROME_PATH || ['C:/Program Files/Google/Chrome/Application/chrome.exe','/Applications/Google Chrome.app/Contents/MacOS/Google Chrome','/usr/bin/google-chrome'].find(p=>{ try{ return require('fs').existsSync(p); }catch(e){ return false; } });
const INDEX = 'file:///' + path.resolve(__dirname, '..', '..', 'index.html').replace(/\\/g,'/');
const arg = (k, d) => { const a = process.argv.find(x=>x.startsWith('--'+k+'=')); return a ? a.split('=')[1] : d; };
const sleep = ms => new Promise(r=>setTimeout(r,ms));

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless:'new',
    args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--autoplay-policy=no-user-gesture-required','--allow-file-access-from-files'] });
  const page = await browser.newPage();
  await page.setViewport({width:1280,height:800});
  const logs = [];
  page.on('console', m => { const t=m.type(); if(t==='error'||t==='warning'||t==='warn') logs.push(`[console.${t}] ${m.text()}`); });
  page.on('pageerror', e => logs.push(`[pageerror] ${e.message}`));
  await page.goto(INDEX, {waitUntil:'load', timeout:60000});
  await sleep(2000);
  await page.evaluate((q, mode, map, x, z, yaw)=>{
    const cfg = { modeId:mode, mapId:map, botCount:8, difficulty:'normal', primaryWeapon:'rifle', sensitivity:1, masterVolume:0, timeLimitMin:8,
      friendlyFire:false, invertY:false, fov:75, graphicsQuality:q, gore:true, showMinimap:true, adsMode:'hold',
      crosshairStyle:'crossdot', crosshairColor:'#d2ffbe', crosshairSize:1 };
    document.getElementById('menuRoot').style.display='none'; document.getElementById('hud').style.display='block';
    GW.engine.startMatch(cfg); GW.engine.frozen=false;
    GW.engine.setPlayerPosition(x, z, yaw);
  }, arg('quality','alta'), arg('mode','campaign'), arg('map','campaign'), +arg('x',0), +arg('z',56), +arg('yaw',0));
  await sleep(2500);
  const out = arg('out', path.join(__dirname, 'shots', 'probe.png'));
  require('fs').mkdirSync(path.dirname(out), {recursive:true});
  await page.screenshot({path: out});
  console.log('saved', out, 'logs', logs.length); logs.forEach(l=>console.log(' ', l));
  await browser.close();
})().catch(e=>{ console.error('HARNESS FAILURE', e); process.exit(2); });
