// Loads the game in real headless Chrome and reports console errors/warnings + page errors.
// Usage: node smoke.js [--keep] [--ms 6000]
const puppeteer = require('puppeteer-core');
const path = require('path');
const CHROME = process.env.CHROME_PATH || ['C:/Program Files/Google/Chrome/Application/chrome.exe','/Applications/Google Chrome.app/Contents/MacOS/Google Chrome','/usr/bin/google-chrome'].find(p=>{ try{ return require('fs').existsSync(p); }catch(e){ return false; } });
const INDEX = 'file:///' + path.resolve(__dirname, '..', '..', 'index.html').replace(/\\/g,'/');


(async () => {
  const waitMs = Number((process.argv.find(a=>a.startsWith('--ms='))||'--ms=6000').split('=')[1]);
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--autoplay-policy=no-user-gesture-required','--window-size=1280,800','--allow-file-access-from-files'],
  });
  const page = await browser.newPage();
  await page.setViewport({width:1280,height:800});
  const logs = [];
  page.on('console', m => { const t = m.type(); if(t==='error'||t==='warning'||t==='warn') logs.push(`[console.${t}] ${m.text()}`); });
  page.on('pageerror', e => logs.push(`[pageerror] ${e.message}`));
  page.on('requestfailed', r => logs.push(`[requestfailed] ${r.url()} ${r.failure() && r.failure().errorText}`));
  await page.goto(INDEX, {waitUntil:'load', timeout: 60000});
  await new Promise(r=>setTimeout(r, waitMs));
  const state = await page.evaluate(() => ({
    three: typeof THREE, composer: !!(window.GW && GW.engine && GW.engine.renderer),
    modes: (window.GW && GW.MODE_META||[]).map(m=>m.id), maps: (window.GW && GW.MAPS||[]).map(m=>m.id),
    webgl: (()=>{ try{ const c=document.createElement('canvas'); return !!(c.getContext('webgl')||c.getContext('experimental-webgl')); }catch(e){ return 'err:'+e.message; } })(),
  }));
  console.log('STATE', JSON.stringify(state));
  console.log('LOGS', logs.length);
  logs.forEach(l=>console.log(l));
  await browser.close();
})().catch(e => { console.error('HARNESS FAILURE', e); process.exit(1); });
