window.GW = window.GW || {};

GW.Audio = (function(){
  let actx = null;
  let masterGain = null;
  let pendingVolume = null;
  function ensure(){
    if(!actx){
      actx = new (window.AudioContext||window.webkitAudioContext)();
      masterGain = actx.createGain();
      masterGain.gain.value = pendingVolume!==null ? pendingVolume : 0.7;
      masterGain.connect(actx.destination);
      pendingVolume = null;
    }
  }
  function setVolume(v){
    v = Math.max(0, Math.min(1, v));
    if(masterGain){ masterGain.gain.value = v; }
    else { pendingVolume = v; }
  }
  function noiseBuffer(duration){
    const rate = actx.sampleRate;
    const buf = actx.createBuffer(1, Math.max(1,Math.floor(rate*duration)), rate);
    const data = buf.getChannelData(0);
    for(let i=0;i<data.length;i++) data[i] = Math.random()*2-1;
    return buf;
  }

  function playShot(volume, pitchMul){
    if(!actx) return;
    volume = volume===undefined?0.5:volume; pitchMul = pitchMul||1;
    const t = actx.currentTime;
    const src = actx.createBufferSource(); src.buffer = noiseBuffer(0.16);
    const bp = actx.createBiquadFilter(); bp.type='bandpass'; bp.frequency.value=1400*pitchMul; bp.Q.value=0.7;
    const g = actx.createGain(); g.gain.setValueAtTime(volume, t); g.gain.exponentialRampToValueAtTime(0.001, t+0.14);
    src.connect(bp); bp.connect(g); g.connect(masterGain); src.start(t); src.stop(t+0.16);

    const osc = actx.createOscillator(); osc.type='square'; osc.frequency.setValueAtTime(120*pitchMul,t);
    osc.frequency.exponentialRampToValueAtTime(40*pitchMul, t+0.08);
    const g2 = actx.createGain(); g2.gain.setValueAtTime(volume*0.6,t); g2.gain.exponentialRampToValueAtTime(0.001,t+0.09);
    osc.connect(g2); g2.connect(masterGain); osc.start(t); osc.stop(t+0.1);
  }

  function playBoom(volume){
    if(!actx) return;
    volume = volume===undefined?0.4:volume;
    const t = actx.currentTime;
    const src = actx.createBufferSource(); src.buffer = noiseBuffer(0.3);
    const lp = actx.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=900;
    const g = actx.createGain(); g.gain.setValueAtTime(volume, t); g.gain.exponentialRampToValueAtTime(0.001, t+0.3);
    src.connect(lp); lp.connect(g); g.connect(masterGain); src.start(t); src.stop(t+0.3);
    const osc = actx.createOscillator(); osc.type='sine'; osc.frequency.setValueAtTime(90,t);
    osc.frequency.exponentialRampToValueAtTime(30,t+0.25);
    const g2 = actx.createGain(); g2.gain.setValueAtTime(volume,t); g2.gain.exponentialRampToValueAtTime(0.001,t+0.28);
    osc.connect(g2); g2.connect(masterGain); osc.start(t); osc.stop(t+0.3);
  }

  function playHitmarker(){
    if(!actx) return;
    const t = actx.currentTime;
    const osc = actx.createOscillator(); osc.type='sine'; osc.frequency.setValueAtTime(1500,t);
    osc.frequency.exponentialRampToValueAtTime(2200,t+0.05);
    const g = actx.createGain(); g.gain.setValueAtTime(0.28,t); g.gain.exponentialRampToValueAtTime(0.001,t+0.09);
    osc.connect(g); g.connect(masterGain); osc.start(t); osc.stop(t+0.1);
  }

  function playReloadClick(delay){
    if(!actx) return;
    const t = actx.currentTime + Math.max(0,delay);
    const osc = actx.createOscillator(); osc.type='square'; osc.frequency.setValueAtTime(340,t);
    const g = actx.createGain(); g.gain.setValueAtTime(0.18,t); g.gain.exponentialRampToValueAtTime(0.001,t+0.05);
    osc.connect(g); g.connect(masterGain); osc.start(t); osc.stop(t+0.06);
  }

  function playSwitch(){
    if(!actx) return;
    const t = actx.currentTime;
    const osc = actx.createOscillator(); osc.type='square'; osc.frequency.setValueAtTime(220,t);
    osc.frequency.linearRampToValueAtTime(160,t+0.08);
    const g = actx.createGain(); g.gain.setValueAtTime(0.12,t); g.gain.exponentialRampToValueAtTime(0.001,t+0.09);
    osc.connect(g); g.connect(masterGain); osc.start(t); osc.stop(t+0.1);
  }

  function playFootstep(){
    if(!actx) return;
    const t = actx.currentTime;
    const src = actx.createBufferSource(); src.buffer = noiseBuffer(0.08);
    const bp = actx.createBiquadFilter(); bp.type='lowpass'; bp.frequency.value=300;
    const g = actx.createGain(); g.gain.setValueAtTime(0.12,t); g.gain.exponentialRampToValueAtTime(0.001,t+0.07);
    src.connect(bp); bp.connect(g); g.connect(masterGain); src.start(t); src.stop(t+0.08);
  }

  function playDamage(){
    if(!actx) return;
    const t = actx.currentTime;
    const osc = actx.createOscillator(); osc.type='sawtooth'; osc.frequency.setValueAtTime(180,t);
    osc.frequency.exponentialRampToValueAtTime(60,t+0.25);
    const g = actx.createGain(); g.gain.setValueAtTime(0.22,t); g.gain.exponentialRampToValueAtTime(0.001,t+0.28);
    osc.connect(g); g.connect(masterGain); osc.start(t); osc.stop(t+0.3);
  }

  function playPickup(){
    if(!actx) return;
    const t = actx.currentTime;
    [0,0.07].forEach((d,i)=>{
      const osc = actx.createOscillator(); osc.type='triangle';
      osc.frequency.setValueAtTime([700,980][i], t+d);
      const g = actx.createGain(); g.gain.setValueAtTime(0.18, t+d); g.gain.exponentialRampToValueAtTime(0.001, t+d+0.14);
      osc.connect(g); g.connect(masterGain); osc.start(t+d); osc.stop(t+d+0.15);
    });
  }

  function playBeep(freq, volume){
    if(!actx) return;
    const t = actx.currentTime;
    const osc = actx.createOscillator(); osc.type='square'; osc.frequency.setValueAtTime(freq||900,t);
    const g = actx.createGain(); g.gain.setValueAtTime(volume||0.15,t); g.gain.exponentialRampToValueAtTime(0.001,t+0.1);
    osc.connect(g); g.connect(masterGain); osc.start(t); osc.stop(t+0.11);
  }

  function playChord(up){
    if(!actx) return;
    const t = actx.currentTime;
    const freqs = up ? [440,554,659,880] : [440,392,330,220];
    freqs.forEach((f,i)=>{
      const d = i*0.09;
      const osc = actx.createOscillator(); osc.type='triangle'; osc.frequency.setValueAtTime(f,t+d);
      const g = actx.createGain(); g.gain.setValueAtTime(0.16,t+d); g.gain.exponentialRampToValueAtTime(0.001,t+d+0.3);
      osc.connect(g); g.connect(masterGain); osc.start(t+d); osc.stop(t+d+0.32);
    });
  }

  function playUIClick(){
    if(!actx) return;
    const t = actx.currentTime;
    const osc = actx.createOscillator(); osc.type='square'; osc.frequency.setValueAtTime(500,t);
    const g = actx.createGain(); g.gain.setValueAtTime(0.1,t); g.gain.exponentialRampToValueAtTime(0.001,t+0.04);
    osc.connect(g); g.connect(masterGain); osc.start(t); osc.stop(t+0.05);
  }

  function playMelee(){
    if(!actx) return;
    const t = actx.currentTime;
    const src = actx.createBufferSource(); src.buffer = noiseBuffer(0.18);
    const bp = actx.createBiquadFilter(); bp.type='bandpass'; bp.frequency.setValueAtTime(2200,t); bp.frequency.exponentialRampToValueAtTime(500,t+0.15); bp.Q.value=1.2;
    const g = actx.createGain(); g.gain.setValueAtTime(0.22,t); g.gain.exponentialRampToValueAtTime(0.001,t+0.16);
    src.connect(bp); bp.connect(g); g.connect(masterGain); src.start(t); src.stop(t+0.18);
  }

  return {
    ensure, playShot, playBoom, playHitmarker, playReloadClick, playSwitch,
    playFootstep, playDamage, playPickup, playBeep, playChord, playUIClick, playMelee,
    setVolume
  };
})();
