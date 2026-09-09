window.GW = window.GW || {};

(function(){

function industrial(E){
  const c = [
    [12,1.25,-9,0,'orange'],[12,1.25,-2,0,'orange'],
    [-16,1.25,7, Math.PI/2, 'blue'],[-16,1.25,11.7, Math.PI/2, 'blue'],
    [4,1.25,20, 0.4, 'green'],
    [-7,1.25,-20, -0.3, 'orange'],
    [25,1.25,11, Math.PI/2, 'blue'],
    [-27,1.25,-11, 0, 'green'],
    [0,1.25,-34, Math.PI/2, 'orange'],
    [34,1.25,-27, 0.6, 'blue'],
    [-4,1.25,32, 0.9, 'green']
  ];
  c.forEach(p=>E.addBox(6,2.5,2.4,p[0],p[1],p[2],p[4],{rotY:p[3]}));

  const crates = [[7,4],[9,-16],[-11,-4],[18,-18],[-20,18],[2,-9],[-4,22],[29,-2],[-32,4],[16,30]];
  crates.forEach(p=>E.addBox(1.4,1,1.4,p[0],0.5,p[1],'concrete'));

  [[10,2],[10.8,3.2],[-9,-18],[21,9],[-18,16],[-30,-24]].forEach(p=>E.addBarrel(p[0],p[1]));

  E.addBox(1,4,18,-22,2,-27,'dark');
  E.addBox(18,4,1,-22,2,-18,'dark');
  E.addBox(1,4,22,38,2,22,'dark');

  E.addBuilding(11,7,8,44,42,0.15,'building1');
  E.addBuilding(9,10,7,-44,40,-0.1,'building2');

  E.addBox(17,0.6,15,-33,3,29,'concrete');
  E.addBox(17,1,0.4,-33,3.9,36.5,'dark',{isFloor:false});
  E.addBox(17,1,0.4,-33,3.9,21.5,'dark',{isFloor:false});
  E.addRamp({x:-33, z:16, width:6, length:12, height:3.3, rotY:0});

  E.addBox(6,3,6,22,1.5,-33,'concrete');
  E.addRamp({x:22, z:-24.5, width:4, length:8, height:3, rotY:Math.PI});

  E.addElevator(-11,11,4,4,0,3.4,0.5);
  E.addTower(42,-44);
  E.addFlag(-44,-2);

  return {
    spawnsFFA:[[18,-5],[-18,5],[10,22],[-10,-22],[28,-22],[-28,20],[0,33],[-33,-33],[38,20],[-40,-40]],
    spawnsA:[[-33,-33],[-28,20],[-18,5],[0,33],[-40,-40]],
    spawnsB:[[18,-5],[10,22],[28,-22],[38,20],[42,-44]],
    bombSite:{x:-33,z:29,r:6},
    ammoCrates:[[0,0],[20,15],[-20,-15],[10,-30]]
  };
}

function desert(E){
  const rocks = [[10,4,-6],[13,3.4,-8],[-9,3.8,10],[16,4.6,16],[-18,3,-14],[22,3.2,-24],[-24,3.6,20],[0,4.2,26],[-6,3.4,-30],[30,3.8,4]];
  rocks.forEach(p=>{
    E.addBox(p[1]*1.3,p[1],p[1]*1.1,p[0],p[1]/2,p[2],'rock',{rotY:Math.random()*Math.PI});
  });

  const dunes = [[6,1.2,4],[-8,1,-6],[14,1.4,-16],[-16,1.1,14],[24,1.3,-4],[-26,1.2,-20]];
  dunes.forEach(p=>E.addBox(3,p[1],3,p[0],p[1]/2,p[2],'sand'));

  const tents = [[18,1.8,20,0.3],[-20,1.8,-22,-0.4],[30,1.8,-30,0.9]];
  tents.forEach(p=>E.addBox(5,p[1],5,p[0],p[1]/2,p[2],'tent',{rotY:p[3]}));

  [[8,6],[-12,-10],[20,-2],[-6,18]].forEach(p=>E.addBarrel(p[0],p[1]));

  E.addBox(9,6,9,42,3,40,'sandstone',{rotY:0.2});
  E.addBox(8,8,8,-42,4,-38,'sandstone',{rotY:-0.15});

  E.addBox(15,0.6,13,28,3,30,'sandstone');
  E.addRamp({x:28, z:19, width:6, length:12, height:3.3, rotY:0});

  E.addElevator(-10,-2,4,4,0,3.4,0.45);
  E.addTower(-40,40);
  E.addFlag(38,-38);

  return {
    spawnsFFA:[[20,20],[-20,-20],[30,-30],[-30,30],[0,35],[35,0],[-35,0],[0,-35],[15,-25],[-15,25]],
    spawnsA:[[-20,-20],[-30,30],[-35,0],[-15,25],[-40,40]],
    spawnsB:[[20,20],[30,-30],[35,0],[15,-25],[42,40]],
    bombSite:{x:28,z:30,r:6},
    ammoCrates:[[0,0],[22,-6],[-22,6],[0,-25]]
  };
}

function urban(E){
  const blocks = [
    [10,9,12,-18,-18,0,'building1'],
    [10,10,10,18,-18,0.05,'building2'],
    [10,8,12,-18,18,-0.05,'building2'],
    [12,11,10,18,18,0,'building1'],
    [8,6,8,0,-30,0.1,'building1'],
    [8,7,8,0,30,-0.1,'building2']
  ];
  blocks.forEach(b=>E.addBuilding(b[0],b[1],b[2],b[3],b[4],b[5],b[6]));

  const crates = [[6,0],[0,10],[-6,0],[0,-10],[10,10],[-10,-10],[10,-10],[-10,10]];
  crates.forEach(p=>E.addBox(1.4,1,1.4,p[0],0.5,p[1],'concrete'));

  [[4,4],[-4,-4],[4,-4],[-4,4]].forEach(p=>E.addBarrel(p[0],p[1]));

  E.addBox(2,3,10,-9,1.5,0,'dark');
  E.addBox(2,3,10,9,1.5,0,'dark');
  E.addBox(10,3,2,0,1.5,-9,'dark');
  E.addBox(10,3,2,0,1.5,9,'dark');

  E.addBox(13,0.6,11,18,3,-18,'concrete');
  E.addRamp({x:18, z:-11.5, width:5, length:9, height:3.3, rotY:0});

  E.addElevator(0,0,4,4,0,3.6,0.4);
  E.addTower(-36,-36);
  E.addFlag(36,36);

  return {
    spawnsFFA:[[22,22],[-22,-22],[22,-22],[-22,22],[30,0],[-30,0],[0,30],[0,-30],[14,0],[-14,0]],
    spawnsA:[[-22,-22],[-30,0],[0,-30],[-14,0],[-36,-36]],
    spawnsB:[[22,22],[30,0],[0,30],[14,0],[36,36]],
    bombSite:{x:18,z:-18,r:6},
    ammoCrates:[[0,0],[20,20],[-20,-20],[24,-6]]
  };
}

GW.MAPS = [
  { id:'industrial', name:'DISTRITO INDUSTRIAL', desc:'Contenedores, rampas y una torre de radar en un patio industrial abierto.',
    size:100, groundColor:'#5c6650', fogColor:0x93a186, fogDensity:0.011,
    skyColors:['#4d6f96','#8fa8a0','#c9c9a0','#8a7a5c'], build:industrial },
  { id:'desert', name:'ZONA DESÉRTICA', desc:'Rocas, dunas y campamentos bajo el sol — largas líneas de tiro para francotiradores.',
    size:100, groundColor:'#a9895c', fogColor:0xcbb383, fogDensity:0.009,
    skyColors:['#7f9fc4','#cfc79a','#e2c98f','#b98f57'], build:desert },
  { id:'urban', name:'COMPLEJO URBANO', desc:'Bloques de edificios y callejones estrechos — combate cerrado, ideal para escopeta.',
    size:95, groundColor:'#6a6a62', fogColor:0x8b8b83, fogDensity:0.014,
    skyColors:['#42566e','#6f7a78','#a3a294','#6f6455'], build:urban }
];

GW.getMap = function(id){ return GW.MAPS.find(m=>m.id===id) || GW.MAPS[0]; };
})();
