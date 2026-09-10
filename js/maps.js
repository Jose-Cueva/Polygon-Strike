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
  // Long linear single-player mission map: a fortified valley pushing north
  // from a rear camp, through a checkpoint trench and a container courtyard,
  // into a walled compound, and finally an open final-stand plateau near the
  // extraction radio tower. Built for GW.MODE_FACTORIES.campaign's scripted
  // waves and NPC checkpoints (see js/campaign.js for the exact coordinates).

  // --- Camp (z -58..-42): safe rear area, no enemies ---
  E.addBox(6,2.2,5,-8,1.1,-52,'tent',{rotY:-0.2});
  E.addBox(6,2.2,5, 8,1.1,-52,'tent',{rotY:0.2});
  [[-3,-48],[3,-48],[-5,-56],[5,-56]].forEach(p=>E.addBox(1.4,1,1.4,p[0],0.5,p[1],'crate'));
  [[-9,-45],[9,-45]].forEach(p=>E.addBarrel(p[0],p[1]));

  // --- Checkpoint trench (z -40..-18): zigzag low cover, wave 1 ---
  const trench = [
    [4,1.2,3,-8,0.6,-34,'dark',0],[4,1.2,3, 7,0.6,-30,'dark',0.15],
    [3,1.2,3,-5,0.6,-24,'concrete',0.1],[3,1.2,3, 6,0.6,-21,'concrete',-0.1],
    [4,1.4,3,-9,0.7,-27,'dark',0.3],[4,1.4,3, 9,0.7,-36,'dark',-0.2]
  ];
  trench.forEach(p=>E.addBox(p[0],p[1],p[2],p[3],p[4],p[5],p[6],{rotY:p[7]}));
  [[-2,-30],[2,-22],[-6,-19]].forEach(p=>E.addBarrel(p[0],p[1]));

  // --- Courtyard (z -14..8): container cluster, NPC checkpoint + wave 2 ---
  const containers = [
    [5,2.3,2.2,-9, 1.15,-2,'blue',   1.4],[5,2.3,2.2, 9, 1.15, 2,'orange', 1.4],
    [5,2.2,2.1,-6, 1.1,  6,'green', -0.2],[5,2.2,2.1, 6, 1.1, -6,'dark',   0.2],
    [4,2.1,2,   0, 1.05, 5,'orange',0.6]
  ];
  containers.forEach(p=>E.addBox(p[0],p[1],p[2],p[3],p[4],p[5],p[6],{rotY:p[7]}));
  [[-4,0],[4,-3],[0,-9]].forEach(p=>E.addBox(1.4,1,1.4,p[0],0.5,p[1],'crate'));

  // --- Compound (z 12..34): walled yard, elevated watch nest, wave 3 ---
  E.addBox(2,3.4,22,-16,1.7,23,'concrete');
  E.addBox(2,3.4,22, 16,1.7,23,'concrete');
  [[-7,16],[7,20],[-6,28],[6,30],[0,24]].forEach(p=>E.addBox(2.6,1.6,2.6,p[0],0.8,p[1],'dark',{rotY:0.3}));
  E.addBox(5,3,5,10,1.5,14,'concrete');
  E.addRamp({x:10, z:9, width:4, length:6, height:3, rotY:Math.PI});

  // --- Final stand (z 38..54): open plateau, extraction tower, wave 4 ---
  const bunkers = [
    [-8,44],[8,44],[-10,50],[10,50],[0,40]
  ];
  bunkers.forEach(p=>E.addBox(3,1.6,2.6,p[0],0.8,p[1],'concrete',{rotY:(p[0]*p[1])%2}));
  [[-4,47],[4,52]].forEach(p=>E.addBarrel(p[0],p[1]));
  E.addTower(0,60);

  return {
    spawnsFFA:[[0,-56]],
    spawnsA:[[0,-56]],
    ammoCrates:[[0,-27],[0,-1],[0,25],[0,46]]
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
  { id:'campaign', name:'VALLE TRUENO ROJO', desc:'Mapa largo de un solo jugador: avanza desde el campamento hasta la torre de extracción.',
    size:70, groundColor:'#565c48', fogColor:0x8f9584, fogDensity:0.016,
    skyColors:['#3d4f5e','#71766c','#a9a487','#7a6a52'], build:campaign }
];

GW.getMap = function(id){ return GW.MAPS.find(m=>m.id===id) || GW.MAPS[0]; };
})();
