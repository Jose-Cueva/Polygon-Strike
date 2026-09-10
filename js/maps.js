window.GW = window.GW || {};

(function(){

function industrial(E){
  // Dense container maze: 4 short lanes (N/S/E/W) converge on a central
  // contested courtyard (the bomb site). Team A holds the SW corner, Team B
  // the NE corner; the NW/SE corners are neutral flank quadrants that cross-
  // connect the lanes for chaotic close-range flanking, Shipment/Rust style.

  const containers = [
    // north lane flank (leads toward A corner)
    [6,2.5,2.4, -6,1.25,-11, 'orange', 0],
    [6,2.5,2.4, -4,1.25,-19, 'dark',   0.2],
    [5,2.4,2.2,  3,1.25,-13, 'blue',   1.5],
    [5,2.4,2.2,  4,1.25,-22, 'green',  1.3],
    // west lane flank (leads toward A corner)
    [6,2.5,2.4,-11,1.25, -6, 'blue',   1.57],
    [6,2.5,2.4,-19,1.25, -4, 'green',  1.35],
    [5,2.4,2.2,-13,1.25,  3, 'orange', 0.15],
    [5,2.4,2.2,-22,1.25,  4, 'dark',  -0.25],
    // south lane flank (leads toward B corner)
    [6,2.5,2.4,  6,1.25, 11, 'blue',   0],
    [6,2.5,2.4,  4,1.25, 19, 'orange', 0.2],
    [5,2.4,2.2, -3,1.25, 13, 'dark',   1.5],
    [5,2.4,2.2, -4,1.25, 22, 'green',  1.3],
    // east lane flank (leads toward B corner)
    [6,2.5,2.4, 11,1.25,  6, 'green',  1.57],
    [6,2.5,2.4, 19,1.25,  4, 'blue',   1.35],
    [5,2.4,2.2, 13,1.25, -3, 'orange', 0.15],
    [5,2.4,2.2, 22,1.25, -4, 'dark',  -0.25],
    // neutral quadrant connectors (chaotic cross-flank clusters)
    [5,2.3,2.2,-18,1.15, 18, 'orange', 0.6],
    [5,2.3,2.2,-27,1.15, 15, 'dark',  -0.3],
    [5,2.3,2.2,-15,1.15, 27, 'green',  0.9],
    [5,2.3,2.2, 18,1.15,-18, 'blue',   0.6],
    [5,2.3,2.2, 27,1.15,-15, 'green', -0.3],
    [5,2.3,2.2, 15,1.15,-27, 'orange', 0.9]
  ];
  containers.forEach(p=>E.addBox(p[0],p[1],p[2],p[3],p[4],p[5],p[6],{rotY:p[7]}));

  const crates = [
    [7,7],[-7,-7],[-7,7],[7,-7],
    [-24,-13],[24,13],[-13,-24],[13,24],
    [-30,-9],[30,9],[-9,-30],[9,30]
  ];
  crates.forEach(p=>E.addBox(1.4,1,1.4,p[0],0.5,p[1],'crate'));

  [[-3,-4],[3,4],[-17,-11],[17,11],[-11,-17],[11,17],[-23,20],[23,-20]]
    .forEach(p=>E.addBarrel(p[0],p[1]));

  // spawn-side warehouse cover, set well back behind the spawn points
  E.addBuilding(9,6,8,-44,-44,0.2,'building1');
  E.addBuilding(9,6,8, 44, 44,-0.2,'building2');

  // elevated vantage points, one per side, reachable only via ramp
  E.addBox(6,3.2,6,-20,1.6,-20,'concrete');
  E.addRamp({x:-27, z:-27, width:4, length:8, height:3.2, rotY:Math.PI/4});
  E.addBox(6,3.2,6, 20,1.6, 20,'concrete');
  E.addRamp({x:27, z:27, width:4, length:8, height:3.2, rotY:Math.PI*1.25});

  // neutral high-ground contest point
  E.addElevator(10,-10,4,4,0,3.2,0.45);

  E.addTower(-42,40);
  E.addFlag(42,-40);

  return {
    spawnsFFA:[[-34,-34],[34,34],[-34,34],[34,-34],[0,-32],[0,32],[-32,0],[32,0],[-22,-31],[22,31]],
    spawnsA:[[-33,-27],[-27,-33],[-33,-33],[-30,-22],[-22,-30]],
    spawnsB:[[33,27],[27,33],[33,33],[30,22],[22,30]],
    bombSite:{x:0,z:0,r:6},
    ammoCrates:[[14,14],[-14,-14],[0,-15],[0,15]]
  };
}

function desert(E){
  // Symmetric Nuketown-style layout: mirrored bases through the center
  // (x,z) <-> (-x,-z), open desert with rock/dune cover roughly every 8-10
  // units, a central compound approachable from two sides, one elevated
  // watch tower per side placed symmetrically.

  const rocks = [
    [6,3.4,-6,10,-2],[6,3.6,10,-16,4],[5.6,3.2,-16,16,-9],[6.2,3.8,20,4,7],
    [5.8,3.4,6,-10,2],[6,3.6,-10,16,-4],[5.6,3.2,16,-16,9],[6.2,3.8,-20,-4,-7],
    [5,3,-24,24,3],[5,3,24,-24,-3]
  ];
  rocks.forEach(p=>E.addBox(p[0],p[1],p[0]*0.9,p[3],p[1]/2,p[4],'rock',{rotY:(p[3]*13+p[4]*7)%3.1}));

  const dunes = [
    [4,1.3,6,4],[4,1.1,-6,-4],[3.4,1.4,14,-11],[3.4,1.2,-14,11],
    [3.6,1.3,22,-2],[3.6,1.3,-22,2],[3,1.1,2,18],[3,1.1,-2,-18]
  ];
  dunes.forEach(p=>E.addBox(p[0],p[1],p[0],p[2],p[1]/2,p[3],'sand'));

  [[9,5],[-9,-5],[5,-9],[-5,9],[13,-13],[-13,13],[0,-24],[0,24]].forEach(p=>E.addBarrel(p[0],p[1]));

  // mirrored team bases: symmetric small camps facing the compound
  E.addBuilding(7,4,6,-36,-36,0.25,'sandstone');
  E.addBuilding(7,4,6, 36, 36,0.25,'sandstone');
  E.addBox(5,1.8,5,-38,0.9,-26,'tent',{rotY:-0.35});
  E.addBox(5,1.8,5, 38,0.9, 26,'tent',{rotY:-0.35});
  E.addBox(5,1.8,5,-26,0.9,-38,'tent',{rotY:0.5});
  E.addBox(5,1.8,5, 26,0.9, 38,'tent',{rotY:0.5});

  // central compound (bomb site), approachable from two opposite angles
  E.addBox(15,0.6,13,0,3,0,'sandstone');
  E.addRamp({x:-14.5, z:0, width:6, length:7, height:3.3, rotY: Math.PI/2});
  E.addRamp({x: 14.5, z:0, width:6, length:7, height:3.3, rotY:-Math.PI/2});
  E.addBox(1,3.6,7,0,1.8,-9.5,'sandstone',{isFloor:false});
  E.addBox(1,3.6,7,0,1.8, 9.5,'sandstone',{isFloor:false});

  // symmetric elevated watch positions, one per side
  E.addBox(5,3,5,-20,1.5,10,'sandstone');
  E.addRamp({x:-20, z:16, width:4, length:6, height:3, rotY:Math.PI});
  E.addBox(5,3,5, 20,1.5,-10,'sandstone');
  E.addRamp({x: 20, z:-16, width:4, length:6, height:3, rotY:0});

  E.addTower(-38,38);
  E.addTower(38,-38);
  E.addFlag(38,38);

  return {
    spawnsFFA:[[-30,-24],[30,24],[-24,-30],[24,30],[-38,-14],[38,14],[-14,-38],[14,38],[0,-38],[0,38]],
    spawnsA:[[-22,-26],[-26,-22],[-28,-28],[-24,-32],[-32,-24]],
    spawnsB:[[22,26],[26,22],[28,28],[24,32],[32,24]],
    bombSite:{x:0,z:0,r:6},
    ammoCrates:[[13,10],[-13,-10],[10,-13],[-10,13]]
  };
}

function urban(E){
  // Three-lane vertical map: left alley, center plaza (bomb site), right
  // alley, connected by cross-alleys for flanking, one rooftop overlooking
  // the plaza reached by ramp. Team A holds the south block, Team B the
  // north block.

  // left lane buildings
  E.addBuilding(8,8,10,-22,-20,0.05,'building1');
  E.addBuilding(8,9,10,-22, 20,-0.05,'building2');
  // right lane buildings
  E.addBuilding(8,9,10, 22,-20,-0.05,'building2');
  E.addBuilding(8,8,10, 22, 20,0.05,'building1');
  // plaza-flanking mid buildings (define the center lane / bomb site square)
  E.addBuilding(7,7,7,-9,-24,0.1,'building1');
  E.addBuilding(7,7,7, 9,-24,-0.1,'building2');
  E.addBuilding(7,8,7,-9, 24,-0.1,'building2');
  E.addBuilding(7,8,7, 9, 24,0.1,'building1');

  // low walls / dumpsters defining alley cover and cross-alley chicanes
  const barriers = [
    [2,2.2,6,-22,1.1,-2,'dark',0],
    [2,2.2,6, 22,1.1, 2,'dark',0],
    [6,2.2,2,-2,1.1,-22,'dark',0],
    [6,2.2,2, 2,1.1, 22,'dark',0],
    [1.6,1.6,4,-13,0.8,-6,'concrete',0.3],
    [1.6,1.6,4, 13,0.8, 6,'concrete',0.3],
    [1.6,1.6,4,-6,0.8, 13,'concrete',-0.3],
    [1.6,1.6,4, 6,0.8,-13,'concrete',-0.3]
  ];
  barriers.forEach(p=>E.addBox(p[0],p[1],p[2],p[3],p[4],p[5],p[6],{rotY:p[7]}));

  const crates = [[5,5],[-5,-5],[5,-5],[-5,5],[-16,0],[16,0],[0,-16],[0,16]];
  crates.forEach(p=>E.addBox(1.4,1,1.4,p[0],0.5,p[1],'crate'));

  [[3,10],[-3,-10],[10,-3],[-10,3],[-22,0],[22,0]].forEach(p=>E.addBarrel(p[0],p[1]));

  // plaza center dressing (bomb site) - light cover, no sightline blockers
  E.addBox(1.4,1,1.4,3,0.5,3,'crate');
  E.addBox(1.4,1,1.4,-3,0.5,-3,'crate');
  E.addBarrel(-3,3);
  E.addBarrel(3,-3);

  // rooftop overlooking the plaza, reached by ramp from the left lane
  E.addBox(6,3.4,6,-9,1.7,-9,'concrete');
  E.addRamp({x:-13.5, z:-13.5, width:4, length:6.4, height:3.4, rotY:Math.PI/4});

  E.addElevator(13,13,4,4,0,3.2,0.4);
  E.addTower(-32,-32);
  E.addFlag(32,32);

  return {
    spawnsFFA:[[-22,-32],[22,32],[22,-32],[-22,32],[-32,-8],[32,8],[-32,8],[32,-8],[0,-34],[0,34]],
    spawnsA:[[-22,-32],[22,-32],[-32,-22],[32,-22],[0,-34]],
    spawnsB:[[-22,32],[22,32],[-32,22],[32,22],[0,34]],
    bombSite:{x:0,z:0,r:6},
    ammoCrates:[[-16,-16],[16,16],[16,-16],[-16,16]]
  };
}

function campaign(E){
  // Single-player mission valley. The player starts at the rear camp (+z) and
  // pushes toward the extraction pad (-z): camp -> checkpoint trench ->
  // container courtyard -> walled compound -> final-stand plateau. The map also
  // publishes every mission coordinate (NPCs, wave spawns, triggers, checkpoints)
  // under data.campaign so js/campaign.js never duplicates level numbers.

  // Rotate a local offset (lx,lz) by yaw (three.js convention) around (x,z).
  const rot = (x,z,lx,lz,a)=>[x + lx*Math.cos(a) + lz*Math.sin(a), z - lx*Math.sin(a) + lz*Math.cos(a)];
  const sandbag = (x,z,a)=>E.addBox(3,1.05,1.2,x,0.52,z,'sandbag',{rotY:a||0});
  const crate = (x,z,a)=>E.addBox(1.4,1,1.4,x,0.5,z,'crate',{rotY:a||0});
  // Two steel pillars with a hazard-striped beam overhead (walk-through gate).
  function gate(z, halfGap, beamY){
    E.addBox(0.8,beamY,0.8,-halfGap,beamY/2,z,'steel');
    E.addBox(0.8,beamY,0.8, halfGap,beamY/2,z,'steel');
    E.addBox(halfGap*2+0.8,0.5,0.7,0,beamY+0.15,z,'hazard',{isFloor:false});
    E.addBox(0.4,0.4,0.4,0,beamY+0.6,z,'rust',{isFloor:false,isWall:false});
  }
  // Field tent: olive base with a pitched canvas roof (axis-aligned).
  function tent(x,z,w,d,h){
    E.addBox(w,h,d,x,h/2,z,'olive');
    const rise = 0.9, half = d/2;
    const slope = Math.atan2(rise, half), len = Math.sqrt(half*half + rise*rise);
    E.addBox(w+0.5,0.14,len+0.2, x, h+rise/2, z+half/2, 'canvas', {rotX: slope, isWall:false, isFloor:false});
    E.addBox(w+0.5,0.14,len+0.2, x, h+rise/2, z-half/2, 'canvas', {rotX:-slope, isWall:false, isFloor:false});
    E.addBox(0.12,rise+0.2,0.12, x, h+rise/2, z, 'dark', {isWall:false, isFloor:false});
  }
  // Wrecked truck: rusted body, dark cabin, four wheel blocks.
  function wreck(x,z,a){
    const parts = [
      [2.2,1.3,4.6, 0,0.95,0.4,'rust'], [2.1,1.1,1.6, 0,1.85,-1.6,'dark'],
      [0.5,0.9,0.9,-1.2,0.45,1.6,'dark'],[0.5,0.9,0.9,1.2,0.45,1.6,'dark'],
      [0.5,0.9,0.9,-1.2,0.45,-1.4,'dark'],[0.5,0.9,0.9,1.2,0.45,-1.4,'dark']
    ];
    parts.forEach(p=>{ const w = rot(x,z,p[3],p[5],a); E.addBox(p[0],p[1],p[2],w[0],p[4],w[1],p[6],{rotY:a}); });
  }

  // --- Canyon walls: chunky rock blocks along both sides, with two ravine
  // gaps near the final plateau (z -52..-44) that enemies pour through. ---
  for(let i=0;i<=16;i++){
    const z = 64 - i*8;
    const v = ((i*7919)%13)/13, v2 = ((i*104729)%17)/17;
    if(z===-48) continue;
    const w = 6 + v*3, h = 5.5 + v2*3;
    [-1,1].forEach(side=>{
      const x = side*(24 + v*1.5);
      E.addBox(w,h,9.6,x,h/2,z,'cliff',{rotY:(v-0.5)*0.35*side});
      // a lower boulder shelf in front of every other block breaks the straight wall line
      if(i%2===0) E.addBox(3.2,2.2,4.5,x-side*(w/2+0.9),1.1,z+(v2-0.5)*4,'rock',{rotY:(v2-0.5)*0.9});
    });
  }

  // --- Camp (z +58..+40): safe rear area with HQ tent and a guarded gate ---
  tent(-9,50,8,6.5,2.3);
  tent(10,53,4.5,4.5,1.8);
  tent(11,45,4.5,4.5,1.8);
  E.addBox(2.4,1.5,1.5,-3,0.75,44,'olive');
  E.addBox(2.2,0.9,1.2,-13,0.45,44,'steel');
  [[-6,55],[5,57],[-4,46]].forEach(p=>crate(p[0],p[1],0.3));
  [[7,48],[-14,48]].forEach(p=>E.addBarrel(p[0],p[1]));
  wreck(15,47,0.55);
  E.addFlag(-14,56);
  [[-10,41,0.05],[-7,40.5,0.12],[-4.2,40.2,0.18],[4.2,40.2,-0.18],[7,40.5,-0.12],[10,41,-0.05]].forEach(p=>sandbag(p[0],p[1],p[2]));
  gate(40, 2.6, 4.0);

  // --- Checkpoint trench (z +36..+16): zigzag sandbags, two pillboxes, a
  // guard tower with a ramp, and a barrier line with one narrow flank gap ---
  [[-8,34,0],[-3,31,0.4],[6,30,0.1],[9,27,-0.3],[-7,24,0.2],[-1,22,-0.5],[7,20,0.15],[3,17.5,0.35],[-10,19,0]].forEach(p=>sandbag(p[0],p[1],p[2]));
  E.addBox(4,2.4,3,-12,1.2,27,'concrete');
  E.addBox(4,0.4,3,-12,2.6,27,'steel',{isFloor:false,isWall:false});
  E.addBox(4,2.4,3,12,1.2,22,'concrete');
  E.addBox(4,0.4,3,12,2.6,22,'steel',{isFloor:false,isWall:false});
  E.addBox(3,3.2,3,-16,1.6,31,'concrete');
  E.addRamp({x:-16, z:38.5, width:3, length:6, height:3.2, rotY:Math.PI});
  E.addBox(3.2,1.0,0.3,-16,3.7,29.4,'sandbag',{isFloor:false});
  wreck(5,26,-2.4);
  [[-3,29],[2,20]].forEach(p=>E.addBarrel(p[0],p[1]));
  crate(-5,35);
  // barrier line at z=16: gate in the middle, solid walls, a slim gap by the west cliff
  E.addBox(6,2.6,1,-6.5,1.3,16,'concrete');
  E.addBox(6,2.6,1, 6.5,1.3,16,'concrete');
  E.addBox(7,2.6,1,13,1.3,16,'concrete');
  E.addBox(4.5,2.6,1,-12.25,1.3,16,'concrete');
  E.addBox(0.6,2.6,1,-19.2,1.3,16,'concrete');
  gate(16, 3.0, 4.2);

  // --- Courtyard (z +12..-8): containers (one double stack, one with a ramp
  // for an overwatch perch), crates and a second wreck ---
  const containers = [
    [6,2.5,2.4,-9,1.25,8,'blue',0.1],[6,2.5,2.4,-9,3.75,8,'orange',0.1],
    [6,2.5,2.4,9,1.25,6,'green',-0.12],
    [6,2.5,2.4,-6,1.25,0,'orange',1.5],[6,2.5,2.4,7,1.25,-2,'dark',1.35],
    [5,2.4,2.2,0,1.2,3,'blue',0.05],[6,2.5,2.4,-12,1.25,-6,'green',0.4],[6,2.5,2.4,12,1.25,-7,'orange',-0.35]
  ];
  containers.forEach(p=>E.addBox(p[0],p[1],p[2],p[3],p[4],p[5],p[6],{rotY:p[7]}));
  E.addRamp({x:9, z:12.4, width:2.4, length:5.2, height:2.5, rotY:Math.PI});
  [[-3,12],[4,10],[-2,-4],[3,-6]].forEach((p,i)=>crate(p[0],p[1],i*0.4));
  [[0,-1],[-4,5],[13,1]].forEach(p=>E.addBarrel(p[0],p[1]));
  wreck(-15,3,0.9);

  // --- Compound (z -12..-36): walled yard with a gate front and back, an HQ
  // block splitting it into two lanes, an east-wall breach, and a watchtower ---
  E.addBox(7,3.6,1,-6.5,1.8,-12,'concrete');
  E.addBox(7,3.6,1, 6.5,1.8,-12,'concrete');
  E.addBox(11,3.6,1,-15.5,1.8,-12,'concrete');
  E.addBox(5,3.6,1,12.5,1.8,-12,'concrete');
  gate(-12, 3.2, 4.2);
  E.addBox(1,3.6,24,-16,1.8,-24,'concrete');
  E.addBox(1,3.6,10,16,1.8,-17,'concrete');
  E.addBox(1,3.6,8,16,1.8,-32,'concrete');
  E.addBox(7,3.6,1,-6.5,1.8,-36,'concrete');
  E.addBox(7,3.6,1, 6.5,1.8,-36,'concrete');
  E.addBox(11,3.6,1,-15.5,1.8,-36,'concrete');
  E.addBox(11,3.6,1, 15.5,1.8,-36,'concrete');
  gate(-36, 3.2, 4.2);
  E.addBuilding(8,5,6,0,-24,0,'building2');
  E.addBox(8.4,0.3,6.4,0,5.15,-24,'steel',{isFloor:false,isWall:false});
  E.addBox(3,3.4,3,-12,1.7,-31,'concrete');
  E.addRamp({x:-12, z:-23.5, width:3, length:6, height:3.4, rotY:Math.PI});
  E.addBox(3.2,1.0,0.3,-12,3.9,-32.6,'sandbag',{isFloor:false});
  [[-8,-16,0.1],[8,-16,-0.1],[-6,-30,0.3],[9,-29,-0.2],[12,-22,1.5]].forEach(p=>sandbag(p[0],p[1],p[2]));
  [[4,-19],[-5,-20],[11,-33]].forEach((p,i)=>crate(p[0],p[1],i*0.5));
  [[12,-19],[-12,-18],[-3,-33]].forEach(p=>E.addBarrel(p[0],p[1]));
  E.addBox(2.4,1.6,1.6,11,0.8,-33.5,'steel');
  E.addBox(2.2,1.2,1.4,-13,0.6,-14.5,'olive');

  // --- Final stand (z -40..-58): helipad, sandbag ring, corner bunkers, the
  // radio tower. Enemies come through the ravines, the north edge and the gate ---
  E.addBox(10,0.3,10,0,0.15,-48,'steel');
  [[0,-43.2],[0,-52.8]].forEach(p=>E.addBox(10,0.32,0.6,p[0],0.16,p[1],'hazard',{isWall:false}));
  [[-4.7,-48],[4.7,-48]].forEach(p=>E.addBox(0.6,0.32,10,p[0],0.16,p[1],'hazard',{isWall:false}));
  for(let k=0;k<8;k++){
    const a = k*Math.PI/4 + Math.PI/8;
    const x = Math.sin(a)*9.2, z = -48 + Math.cos(a)*9.2;
    E.addBox(3,1.05,1.2,x,0.52,z,'sandbag',{rotY:a});
  }
  [[-14,-43],[14,-43],[-14,-54],[14,-54]].forEach(p=>E.addBox(3,2.2,2.6,p[0],1.1,p[1],'concrete'));
  [[-7,-41],[8,-56]].forEach(p=>E.addBarrel(p[0],p[1]));
  crate(7,-40,0.4);
  E.addTower(0,-58);
  E.addBox(4.2,1.3,4.2,0,0.65,-58,'concrete');
  E.addBox(3.4,0.25,3.4,0,5.4,-58,'steel',{isFloor:false,isWall:false});
  [[-1.55,-56.45],[1.55,-56.45],[-1.55,-59.55],[1.55,-59.55]].forEach(p=>E.addBox(0.14,3.0,0.14,p[0],6.9,p[1],'steel',{isFloor:false,isWall:false}));
  E.addBox(0.12,4.5,0.12,0.7,10.4,-58.6,'steel',{isFloor:false,isWall:false});
  E.addBox(2.4,1.5,1.5,3.6,0.75,-56,'olive');
  E.addBox(1.2,0.9,0.9,4.4,0.45,-54.2,'steel');

  return {
    spawnsFFA:[[0,56]],
    spawnsA:[[0,56]],
    ammoCrates:[[-4,53],[0,33],[0,-6],[-12,-24],[-7,-46]],
    campaign:{
      npcs:{ vega:[2.5,49], ruiz:[-4,13], radio:[3.2,-54] },
      checkpoints:{ camp:[0,56], trench:[0,38], courtyard:[0,19], compound:[0,-4], final:[0,-40], pad:[0,-46] },
      triggers:{ trench:32, courtyard:8, compound:-9, final:-42 },
      waypoints:{ trench:[0,30], courtyard:[0,2], compoundGate:[0,-12], pad:[0,-48] },
      waves:{
        trench:[[-8,22],[6,20],[-3,18],[9,26],[-12,23]],
        courtyard:[[-8,-2],[8,-4],[0,-6],[-4,2],[6,4],[-10,5],[10,0]],
        courtyardFlank:[[-17,10],[17,10]],
        compound:[[-7,-17],[7,-17],[-9,-28],[9,-28],[12,-16],[-4,-33]],
        commander:[0,-31],
        finalGates:[[-26,-48],[26,-48],[-6,-64],[6,-64],[0,-38]]
      }
    }
  };
}

GW.MAPS = [
  { id:'industrial', name:'DISTRITO INDUSTRIAL', desc:'Laberinto denso de contenedores con lineas de combate cortas y una torre de radar.',
    size:100, groundColor:'#5c6650', fogColor:0x93a186, fogDensity:0.011,
    skyColors:['#4d6f96','#8fa8a0','#c9c9a0','#8a7a5c'], build:industrial },
  { id:'desert', name:'ZONA DESÉRTICA', desc:'Bases espejadas separadas por dunas y rocas, con un complejo central disputado.',
    size:100, groundColor:'#a9895c', fogColor:0xcbb383, fogDensity:0.009,
    skyColors:['#7f9fc4','#cfc79a','#e2c98f','#b98f57'], build:desert },
  { id:'urban', name:'COMPLEJO URBANO', desc:'Tres carriles verticales entre bloques de edificios convergen en una plaza central.',
    size:95, groundColor:'#6a6a62', fogColor:0x8b8b83, fogDensity:0.014,
    skyColors:['#42566e','#6f7a78','#a3a294','#6f6455'], build:urban },
  { id:'campaign', name:'VALLE TRUENO ROJO', desc:'Cañón fortificado de un solo jugador: campamento, trinchera, patio de contenedores, complejo amurallado y helipuerto de extracción.',
    size:72, groundColor:'#565c48', fogColor:0x9da397, fogDensity:0.013,
    sunIntensity:1.35, hemiIntensity:0.9, ambientIntensity:0.45,
    skyColors:['#6a8199','#9aa39a','#c8c0a0','#8c7c5c'], build:campaign }
];

GW.getMap = function(id){ return GW.MAPS.find(m=>m.id===id) || GW.MAPS[0]; };
})();
