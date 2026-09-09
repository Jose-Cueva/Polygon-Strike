window.GW = window.GW || {};

GW.Bots = (function(){
  const COLOR_SETS = {
    neutral: [0x5a5240,0x3a4a35,0x4a3a3a,0x39424a,0x4a4530],
    ally:    [0x2a4a6a,0x1f3a5a,0x30506e,0x274462],
    enemy:   [0x6a2a2a,0x5a1f1f,0x6e3030,0x622424]
  };

  const DIFFICULTY = {
    facil:   { healthMul:0.75, speedMul:0.85, accuracyMul:0.55, reactionMs:1400, dmgMul:0.7,  fovMul:0.85 },
    normal:  { healthMul:1.0,  speedMul:1.0,  accuracyMul:0.85, reactionMs:1000, dmgMul:1.0,  fovMul:1.0  },
    dificil: { healthMul:1.3,  speedMul:1.15, accuracyMul:1.15, reactionMs:650,  dmgMul:1.3,  fovMul:1.2  }
  };

  const gunMat = new THREE.MeshStandardMaterial({color:0x1c1e1a, roughness:0.4, metalness:0.7});
  const FOV_ANGLE_BASE = Math.PI*0.32;
  const DETECT_RANGE = 30;
  const ATTACK_RANGE = 22;

  function spawnPoint(list){
    const s = list[Math.floor(Math.random()*list.length)];
    return new THREE.Vector3(s[0]+(Math.random()*4-2), 0, s[1]+(Math.random()*4-2));
  }

  function create(team, difficultyKey, spawnList){
    const E = GW.engine;
    const diff = DIFFICULTY[difficultyKey] || DIFFICULTY.normal;
    const colorSet = COLOR_SETS[team==='A' ? 'ally' : (team==='B' ? 'enemy' : 'neutral')];
    const bodyColor = colorSet[Math.floor(Math.random()*colorSet.length)];
    const bodyMat = new THREE.MeshStandardMaterial({color:bodyColor, roughness:0.7, metalness:0.1});
    bodyMat.userData.base = bodyColor;
    const headMat = new THREE.MeshStandardMaterial({color:0xc79a72, roughness:0.8});

    const group = new THREE.Group();
    const torsoPivot = new THREE.Group(); torsoPivot.position.y=1.15; group.add(torsoPivot);
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.5,0.7,0.3), bodyMat);
    torso.castShadow=true; torsoPivot.add(torso);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.28,0.3,0.28), headMat);
    head.position.y=0.53; head.castShadow=true; torsoPivot.add(head);

    const capMat = new THREE.MeshStandardMaterial({color: team==='A'?0x274462:(team==='B'?0x622424:0x33352a), roughness:0.6});
    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.3,0.08,0.3), capMat);
    cap.position.y = 0.53+0.19; torsoPivot.add(cap);

    const legL = new THREE.Group(); legL.position.set(-0.14,0.8,0);
    const legLMesh = new THREE.Mesh(new THREE.BoxGeometry(0.2,0.8,0.2), bodyMat); legLMesh.position.y=-0.4; legLMesh.castShadow=true;
    legL.add(legLMesh); group.add(legL);
    const legR = new THREE.Group(); legR.position.set(0.14,0.8,0);
    const legRMesh = legLMesh.clone(); legRMesh.position.y=-0.4;
    legR.add(legRMesh); group.add(legR);

    const armL = new THREE.Group(); armL.position.set(-0.36,1.45,0);
    const armLMesh = new THREE.Mesh(new THREE.BoxGeometry(0.16,0.6,0.16), bodyMat); armLMesh.position.y=-0.3; armLMesh.castShadow=true;
    armL.add(armLMesh); group.add(armL);
    const armR = new THREE.Group(); armR.position.set(0.36,1.45,0);
    const armRMesh = armLMesh.clone(); armRMesh.position.y=-0.3;
    armR.add(armRMesh); group.add(armR);

    const gun = new THREE.Mesh(new THREE.BoxGeometry(0.08,0.08,0.55), gunMat);
    gun.position.set(0,-0.55,-0.22);
    armR.add(gun);

    E.scene.add(group);
    const scale = 0.95 + Math.random()*0.14;
    group.scale.set(scale,scale,scale);

    const spawn = spawnPoint(spawnList);
    group.position.set(spawn.x,0,spawn.z);

    const bot = {
      group, torsoPivot, torso, head, gun, bodyMat, headMat, legL, legR, armL, armR,
      team, difficulty: diff,
      pos: spawn.clone(),
      state:'patrol', health:100*diff.healthMul, maxHealth:100*diff.healthMul, alive:true,
      waypoints:[], wpIndex:0,
      lastShotTime:0, deathTimer:0,
      speed:2.2*diff.speedMul, runSpeed:3.7*diff.speedMul,
      facing:0, hitFlash:0, walkCycle:Math.random()*10,
      targetScanTimer:Math.random()*0.3, currentTarget:null,
      spawnList,
    };
    bot.waypoints = [
      spawn.clone(),
      new THREE.Vector3(spawn.x + (Math.random()*10-5), 0, spawn.z + (Math.random()*10-5)),
      new THREE.Vector3(spawn.x + (Math.random()*10-5), 0, spawn.z + (Math.random()*10-5)),
    ];
    bot.allMeshes = [torso,head,legLMesh,legRMesh,armLMesh,armRMesh,gun];
    bot.allMeshes.forEach(m=>{ m.userData.bot = bot; });
    return bot;
  }

  function respawn(bot){
    const spawn = spawnPoint(bot.spawnList);
    bot.pos.copy(spawn);
    bot.health = bot.maxHealth;
    bot.alive = true;
    bot.state = 'patrol';
    bot.currentTarget = null;
    bot.group.visible = true;
    bot.group.rotation.set(0,0,0);
    bot.group.position.set(spawn.x,0,spawn.z);
    bot.torsoPivot.rotation.set(0,0,0);
    bot.torsoPivot.position.y = 1.15;
    bot.waypoints = [
      spawn.clone(),
      new THREE.Vector3(spawn.x + (Math.random()*10-5), 0, spawn.z + (Math.random()*10-5)),
      new THREE.Vector3(spawn.x + (Math.random()*10-5), 0, spawn.z + (Math.random()*10-5)),
    ];
    bot.wpIndex = 0;
  }

  function hostile(teamA, teamB){ return teamA !== teamB; }

  function pickTarget(bot){
    const E = GW.engine;
    const eyePos = new THREE.Vector3();
    bot.head.getWorldPosition(eyePos);
    const candidates = [];

    if(E.player.alive && hostile(bot.team, E.player.team)){
      candidates.push({kind:'player', ref:null, pos:E.getPlayerPosition()});
    }
    E.bots.forEach(other=>{
      if(other===bot || !other.alive) return;
      if(!hostile(bot.team, other.team)) return;
      const p = new THREE.Vector3();
      other.head.getWorldPosition(p);
      candidates.push({kind:'bot', ref:other, pos:p});
    });

    let best = null, bestDist = Infinity;
    const forward = new THREE.Vector3(Math.sin(bot.facing),0,Math.cos(bot.facing));
    candidates.forEach(c=>{
      const toC = new THREE.Vector3().subVectors(c.pos, eyePos);
      const dist = toC.length();
      if(dist > DETECT_RANGE || dist >= bestDist) return;
      const flat = new THREE.Vector3(toC.x,0,toC.z).normalize();
      const angle = forward.angleTo(flat);
      if(angle > FOV_ANGLE_BASE*bot.difficulty.fovMul) return;
      if(!E.hasLOS(eyePos, c.pos)) return;
      best = c; bestDist = dist;
    });
    return best;
  }

  function update(bot, dt){
    const E = GW.engine;
    if(!bot.alive){
      bot.deathTimer += dt;
      if(bot.deathTimer < 0.6){
        const t = bot.deathTimer/0.6;
        bot.group.rotation.z = -Math.PI/2 * t;
        bot.group.position.y = -0.3*t;
      } else if(bot.deathTimer > 2.2 && bot.group.visible){
        bot.group.visible = false;
      } else if(E.allowRespawn && bot.deathTimer > 3.4){
        respawn(bot);
      }
      return;
    }

    if(bot.hitFlash>0){
      bot.hitFlash -= dt;
      bot.bodyMat.color.set(bot.hitFlash>0 ? 0xff4433 : bot.bodyMat.userData.base);
    }

    bot.targetScanTimer -= dt;
    if(bot.targetScanTimer <= 0){
      bot.currentTarget = pickTarget(bot);
      bot.targetScanTimer = 0.22 + Math.random()*0.16;
    } else if(bot.currentTarget){
      if(bot.currentTarget.kind==='bot' && !bot.currentTarget.ref.alive){ bot.currentTarget = null; }
      else if(bot.currentTarget.kind==='player' && !E.player.alive){ bot.currentTarget = null; }
      else if(bot.currentTarget){
        bot.currentTarget.pos = bot.currentTarget.kind==='player' ? E.getPlayerPosition() : (function(){ const p=new THREE.Vector3(); bot.currentTarget.ref.head.getWorldPosition(p); return p; })();
      }
    }

    const target = bot.currentTarget;
    let dist = Infinity;
    if(target){
      const eyePos = new THREE.Vector3(); bot.head.getWorldPosition(eyePos);
      dist = eyePos.distanceTo(target.pos);
      bot.state = (dist < ATTACK_RANGE) ? 'attack' : 'chase';
    } else if(bot.state==='attack' || bot.state==='chase'){
      bot.state = 'patrol';
    }

    const moveTarget = new THREE.Vector3();
    let speed = bot.speed;
    let moving = false;

    if(bot.state==='patrol'){
      const wp = bot.waypoints[bot.wpIndex];
      moveTarget.copy(wp);
      if(bot.group.position.distanceTo(wp) < 1){
        bot.wpIndex = (bot.wpIndex+1)%bot.waypoints.length;
      }
    } else if(bot.state==='chase'){
      moveTarget.copy(target.pos); moveTarget.y=0;
      speed = bot.runSpeed;
    } else if(bot.state==='attack'){
      moveTarget.copy(bot.group.position);
      const toTarget = new THREE.Vector3().subVectors(target.pos, bot.group.position);
      bot.facing = Math.atan2(toTarget.x, toTarget.z);
      bot.armR.rotation.x = THREE.MathUtils.lerp(bot.armR.rotation.x, -1.15, Math.min(1,dt*8));
      bot.armL.rotation.x = THREE.MathUtils.lerp(bot.armL.rotation.x, -0.9, Math.min(1,dt*8));
      const now = performance.now();
      const cooldown = Math.max(420, 1100 - (1-bot.difficulty.accuracyMul)*300);
      if(now - bot.lastShotTime > cooldown){
        bot.lastShotTime = now;
        const hitChance = Math.max(0.12, (0.72 - dist*0.018) * bot.difficulty.accuracyMul);
        const eyePos = new THREE.Vector3(); bot.head.getWorldPosition(eyePos);
        E.botMuzzleFlash(eyePos);
        GW.Audio.playShot(0.2, 1.4);
        if(Math.random() < hitChance){
          const dmg = (6 + Math.random()*10) * bot.difficulty.dmgMul;
          if(target.kind==='player') E.damagePlayer(dmg, bot.group.position.clone());
          else E.damageBot(target.ref, dmg, bot);
        }
      }
    }

    if(bot.state==='patrol' || bot.state==='chase'){
      const dir = new THREE.Vector3().subVectors(moveTarget, bot.group.position);
      dir.y=0;
      if(dir.length()>0.2){
        dir.normalize();
        bot.facing = Math.atan2(dir.x, dir.z);
        bot.group.position.x += dir.x*speed*dt;
        bot.group.position.z += dir.z*speed*dt;
        moving = true;
      }
      bot.armR.rotation.x = THREE.MathUtils.lerp(bot.armR.rotation.x, 0, Math.min(1,dt*6));
      bot.armL.rotation.x = THREE.MathUtils.lerp(bot.armL.rotation.x, 0, Math.min(1,dt*6));
    }

    if(moving){
      bot.walkCycle += dt * (bot.state==='chase' ? 10 : 6);
      const swing = Math.sin(bot.walkCycle)*0.55;
      bot.legL.rotation.x = swing; bot.legR.rotation.x = -swing;
      if(bot.state!=='attack'){
        bot.armL.rotation.x = -swing*0.7; bot.armR.rotation.x = swing*0.7;
      }
      bot.torsoPivot.position.y = 1.15 + Math.abs(Math.sin(bot.walkCycle))*0.03;
    } else {
      bot.legL.rotation.x = THREE.MathUtils.lerp(bot.legL.rotation.x,0,Math.min(1,dt*6));
      bot.legR.rotation.x = THREE.MathUtils.lerp(bot.legR.rotation.x,0,Math.min(1,dt*6));
      bot.torsoPivot.position.y = THREE.MathUtils.lerp(bot.torsoPivot.position.y,1.15,Math.min(1,dt*6));
    }

    bot.group.position.y = E.raycastGroundY(bot.group.position.x, bot.group.position.z);
    bot.group.rotation.y = bot.facing;
    bot.pos.copy(bot.group.position);
  }

  function damage(bot, dmg){
    bot.health -= dmg;
    bot.hitFlash = 0.12;
    return bot.health <= 0 && bot.alive;
  }

  function kill(bot){
    bot.alive = false;
    bot.state = 'dead';
    bot.deathTimer = 0;
    bot.currentTarget = null;
  }

  return { create, respawn, update, damage, kill, hostile, DIFFICULTY };
})();
