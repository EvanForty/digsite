const $=s=>document.querySelector(s);
const cards={pikachu:{name:'Pikachu',image:'pikachu-card.png',set:'Base Set · 58/102',depth:5},mewtwo:{name:'Mewtwo',image:'mewtwo.png',set:'Base Set · 10/102',depth:15},umbreon:{name:'Umbreon VMAX',image:'umbreon.png',set:'Evolving Skies · 215/203',depth:25},charizard:{name:'Charizard',image:'charizard.png',set:'Base Set · 4/102',depth:30}};
function read(key,fallback){try{return JSON.parse(localStorage.getItem(key))??fallback}catch{return fallback}}
function save(key,value){try{localStorage.setItem(key,JSON.stringify(value))}catch{message('Browser storage is unavailable. Your finds will last for this visit.')}}
let finds=read('digsite-finds',[]).filter(f=>cards[f.id]),layers=read('digsite-layers',{}),playerName=String(read('digsite-player','Explorer')).slice(0,20);
let running=false,ready=false,digging=false,autoTarget=null,nearest=null,audioContext=null,soundOn=false,lastMessage=0;
let verticalVelocity=0,grounded=true,nearestPokemon=null,nearestGold=null,activePokemon=null,night=false,sunLight,ambientLight;
let explored=read('digsite-exploration',{gold:[],landmarks:[]});
if(!Array.isArray(explored.gold)||!Array.isArray(explored.landmarks))explored={gold:[],landmarks:[]};
const keys=new Set(),plots=[],dust=[],animated=[],clickTargets=[],pokemons=[],goldPieces=[],surfaces=[];
const landmarks=[{id:'moonstone',name:'Moonstone Grove',x:-27,z:-21,color:'#b8d6c0',description:'A quiet forest with a secret beneath its roots.'},{id:'crystal',name:'Crystal Flats',x:30,z:21,color:'#d3b6f4',description:'Amethyst spires and a trail of scattered gold.'},{id:'ruins',name:'Sunken Ruins',x:27,z:-33,color:'#ffd479',description:'An ancient gateway to the Golden Chamber.'}];
const pokemonLines={Pikachu:'Pika pika! The sunlit shallows are a great place for your first find. Let’s explore!',Eevee:'Vee! I’ve been following the crystals around the quarry. There’s always something around the next bend.',Diglett:'Dig dig! I can feel treasure under the ground. Ask me for a clue, or I’ll dig along beside you.',Dugtrio:'Trio trio trio! Three heads are better than one. We know these tunnels from the shallows to the deepest chamber.'};
const dialogOpen=()=>!!document.querySelector('dialog[open]');
$('#explorer-name').value=playerName;$('#welcome').showModal();$('#enter-world').disabled=true;
$('#welcome').addEventListener('cancel',e=>e.preventDefault());$('#discovery').addEventListener('cancel',e=>e.preventDefault());
$('#enter-form').addEventListener('submit',e=>{e.preventDefault();if(!ready)return;playerName=$('#explorer-name').value.trim().slice(0,20)||'Explorer';save('digsite-player',playerName);$('#player-label').textContent=playerName.toUpperCase();$('#welcome').close();running=true;message('Welcome, '+playerName+'. Follow a glowing marker, or choose “Find a dig site”.',6500);updateProgress()});
function message(text,duration=4200){$('#game-message').textContent=text;$('#game-message').classList.add('visible');lastMessage=performance.now()+duration}
function tone(freq=500,length=.12){if(!soundOn)return;try{audioContext??=new AudioContext();audioContext.resume();const o=audioContext.createOscillator(),g=audioContext.createGain();o.type='sine';o.frequency.value=freq;g.gain.setValueAtTime(.045,audioContext.currentTime);g.gain.exponentialRampToValueAtTime(.001,audioContext.currentTime+length);o.connect(g);g.connect(audioContext.destination);o.start();o.stop(audioContext.currentTime+length)}catch{}}
$('#sound').addEventListener('click',()=>{soundOn=!soundOn;$('#sound').setAttribute('aria-pressed',soundOn);$('#sound').innerHTML='♫ <span>Sound '+(soundOn?'on':'off')+'</span>';tone()});
function updateProgress(){const count=finds.filter(f=>f.id!=='charizard').length;$('#mission-meter').style.width=(count/3*100)+'%';$('#mission-count').textContent=count+' / 3 FINDS';$('#bag-count').textContent=finds.length;const unlocked=count>=3;$('#chamber-status').textContent=unlocked?'Unlocked · find the golden arch':'Sealed · discover 3 treasures';$('#golden-unlock').classList.toggle('unlocked',unlocked);$('#mission-text').textContent=finds.some(f=>f.id==='charizard')?'Expedition complete. Every treasure has a new home.':unlocked?'The Golden Chamber is open. One legendary find remains.':'Uncover three treasures to open the Golden Chamber.';plots.forEach(p=>{if(p.id==='charizard'&&p.ring){p.ring.material.color.setHex(unlocked?0xffd05a:0x78634b);p.beam.visible=unlocked&&!finds.some(f=>f.id===p.id)}})}
function showBag(){$('#bag-grid').replaceChildren();if(!finds.length){$('#bag-grid').innerHTML='<div class="bag-empty">Your collection is waiting to be unearthed.<br><br>Find a glowing marker and start digging.</div>'}else finds.forEach(f=>{const c=cards[f.id],el=document.createElement('article');el.className='bag-item';el.innerHTML=`<img src="./${c.image}" alt="${c.name} Pokémon card"><h3>${c.name}</h3><small>${c.depth}m · DISCOVERED</small>`;$('#bag-grid').append(el)});$('#reset-confirm').hidden=true;$('#bag').showModal()}
$('#open-bag').addEventListener('click',showBag);$('#help').addEventListener('click',()=>$('#help-dialog').showModal());
document.querySelectorAll('.close-dialog').forEach(b=>b.addEventListener('click',()=>b.closest('dialog').close()));
document.querySelectorAll('dialog:not(#welcome):not(#discovery)').forEach(d=>d.addEventListener('click',e=>{if(e.target===d)d.close()}));
$('#save-find').addEventListener('click',()=>{$('#discovery').close();if(finds.length===3)message('The Golden Chamber has opened! Follow the gold marker beyond the arch.',6500);else if(finds.length===4)message('Expedition complete. All four treasures are yours in the collection!',7000);else message('Find saved. A deeper discovery is waiting.');updateProgress()});
$('#reset-progress').addEventListener('click',()=>$('#reset-confirm').hidden=false);$('#cancel-reset').addEventListener('click',()=>$('#reset-confirm').hidden=true);$('#confirm-reset').addEventListener('click',()=>{try{localStorage.removeItem('digsite-finds');localStorage.removeItem('digsite-layers');localStorage.removeItem('digsite-exploration')}catch{}location.reload()});
addEventListener('keydown',e=>{if(dialogOpen())return;const k=e.key.toLowerCase();if(['w','a','s','d','arrowup','arrowleft','arrowdown','arrowright',' ','e','i','f','m'].includes(k))e.preventDefault();keys.add(k);if(['w','a','s','d','arrowup','arrowleft','arrowdown','arrowright'].includes(k))autoTarget=null;if(k==='e'&&!e.repeat){if(nearestGold)collectGold();else dig()}if(k==='i'&&!e.repeat)showBag();if(k===' '&&!e.repeat)jump();if(k==='f'&&!e.repeat&&nearestPokemon)talkToPokemon(nearestPokemon);if(k==='m'&&!e.repeat)showMap()});
addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));addEventListener('blur',()=>keys.clear());document.addEventListener('visibilitychange',()=>keys.clear());
document.querySelectorAll('[data-move]').forEach(b=>{const clear=()=>keys.delete(b.dataset.move);b.addEventListener('pointerdown',e=>{e.preventDefault();keys.add(b.dataset.move);autoTarget=null;b.setPointerCapture(e.pointerId)});b.addEventListener('pointerup',clear);b.addEventListener('pointercancel',clear);b.addEventListener('lostpointercapture',clear)});
$('#dig').addEventListener('click',dig);$('#navigate').addEventListener('click',()=>{const p=plots.find(p=>!finds.some(f=>f.id===p.id)&&(p.id!=='charizard'||finds.length>=3));if(!p){message('All treasures discovered! Open My finds to revisit your collection.');return}autoTarget=p;message('Heading to '+p.name+'. Dig when you reach the marker.')});
let detailedPokemon={},createPokemonModel,cameraDistance=19,THREE,scene,camera,renderer,player,shovel,clock,particlePoints,raycaster,dragStart=null,dragged=false,yaw=.65,pitch=.68;
function cameraOffset(){const radius=cameraDistance*1.3,horizontal=Math.cos(pitch)*radius;return {x:Math.sin(yaw)*horizontal,y:Math.sin(pitch)*radius+1.8,z:Math.cos(yaw)*horizontal}}
function clearCameraDrag(){const previous=dragStart;dragStart=null;renderer.domElement.style.cursor='grab';if(previous&&renderer.domElement.hasPointerCapture(previous.id))renderer.domElement.releasePointerCapture(previous.id)}
function startCameraDrag(e){if(dialogOpen()||dragStart||e.button>2)return;e.preventDefault();dragged=false;dragStart={id:e.pointerId,button:e.button,startX:e.clientX,startY:e.clientY,x:e.clientX,y:e.clientY};renderer.domElement.setPointerCapture(e.pointerId);renderer.domElement.style.cursor='grabbing'}
function moveCameraDrag(e){if(!dragStart||e.pointerId!==dragStart.id)return;if(dialogOpen()){clearCameraDrag();return}const dx=e.clientX-dragStart.x,dy=e.clientY-dragStart.y;if(Math.hypot(e.clientX-dragStart.startX,e.clientY-dragStart.startY)>4)dragged=true;if(dragged){yaw-=dx*.006;pitch=THREE.MathUtils.clamp(pitch+dy*.004,.16,1.35)}dragStart.x=e.clientX;dragStart.y=e.clientY}
function finishCameraDrag(e){if(!dragStart||e.pointerId!==dragStart.id)return false;const clicked=!dragged&&dragStart.button===0&&Math.hypot(e.clientX-dragStart.startX,e.clientY-dragStart.startY)<=4;clearCameraDrag();return clicked&&!dialogOpen()}
function zoomCamera(e){if(dialogOpen())return;e.preventDefault();const delta=e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?renderer.domElement.clientHeight:1);cameraDistance=THREE.MathUtils.clamp(cameraDistance+delta*.015,7,28)}
function resetCamera(){yaw=.65;pitch=.68;cameraDistance=19;message('Camera centered on your explorer.')}

const materials={};function mat(color){return materials[color]??=new THREE.MeshStandardMaterial({color,roughness:.88,flatShading:true})}
function mesh(geometry,color,x,y,z,parent=scene){const m=new THREE.Mesh(geometry,typeof color==='object'?color:mat(color));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m}
function box(w,h,d,color,x,y,z,parent){return mesh(new THREE.BoxGeometry(w,h,d),color,x,y,z,parent)}
function rock(x,z,size=1,color=0x78604b){const m=mesh(new THREE.DodecahedronGeometry(size,0),color,x,size*.45,z);m.scale.set(1,.7,.9);m.rotation.set(Math.random(),Math.random(),Math.random());return m}
function label(text,color='#ffe7ab',w=4){const c=document.createElement('canvas');c.width=512;c.height=90;const ctx=c.getContext('2d');ctx.fillStyle='rgba(27,18,9,.83)';ctx.roundRect(0,0,512,90,15);ctx.fill();ctx.strokeStyle='rgba(230,191,102,.5)';ctx.lineWidth=2;ctx.stroke();ctx.fillStyle=color;ctx.font='600 25px monospace';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,256,46);const texture=new THREE.CanvasTexture(c),sp=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,depthTest:false}));sp.scale.set(w,w*90/512,1);scene.add(sp);return sp}
function crystal(x,y,z,color=0xffcc56,size=.5){const m=mesh(new THREE.ConeGeometry(size*.33,size*1.8,5),new THREE.MeshStandardMaterial({color,emissive:color,emissiveIntensity:.25,roughness:.23,metalness:.28}),x,y+size*.7,z);m.rotation.z=.15;return m}
function tree(x,z,size=1){box(.36*size,2.8*size,.36*size,0x4f341b,x,1.4*size,z);for(let i=0;i<3;i++)mesh(new THREE.ConeGeometry((1.5-i*.3)*size,2.2*size,5),i%2?0x75623b:0x5b5635,x,(3+i*.9)*size,z)}
function torch(x,z){box(.15,1.8,.15,0x463019,x,.9,z);const flame=mesh(new THREE.OctahedronGeometry(.26,0),new THREE.MeshBasicMaterial({color:0xffce57}),x,1.95,z);flame.scale.y=1.7;animated.push(flame);const l=new THREE.PointLight(0xffad3c,11,8,2);l.position.set(x,2.2,z);scene.add(l)}
function createPlot(id,name,x,z,total,color){const p={id,name,x,z,total,level:Math.min(total,Math.max(0,Number(layers[id])||0)),blocks:[],color};if(finds.some(f=>f.id===id))p.level=total;else if(p.level>=total)p.level=total-1;for(let i=0;i<total;i++){const shade=new THREE.Color(i>1?0x745033:0xb28046).multiplyScalar(1-i*.055);const b=box(2.85,.65,2.85,shade.getHex(),x,-i*.65-.325,z);b.visible=i>=p.level;b.userData.plot=p;p.blocks.push(b);clickTargets.push(b)}const ring=mesh(new THREE.TorusGeometry(1.65,.05,6,40),new THREE.MeshBasicMaterial({color}),x,.13,z);ring.rotation.x=Math.PI/2;p.ring=ring;ring.userData.plot=p;clickTargets.push(ring);const beam=mesh(new THREE.CylinderGeometry(.03,.5,4,8,1,true),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.12,side:THREE.DoubleSide,depthWrite:false}),x,2,z);p.beam=beam;beam.userData.plot=p;clickTargets.push(beam);const mark=mesh(new THREE.OctahedronGeometry(.27,0),new THREE.MeshStandardMaterial({color,emissive:color,emissiveIntensity:.65,metalness:.5,roughness:.2}),x,1.4,z);animated.push(mark);p.mark=mark;mark.userData.plot=p;clickTargets.push(mark);p.label=label(name.toUpperCase(),id==='mewtwo'?'#d8b5f4':'#f7d897',3.2);p.label.position.set(x,2.35,z);p.label.visible=!finds.some(f=>f.id===id);beam.visible=mark.visible=!finds.some(f=>f.id===id);plots.push(p);for(let i=0;i<3;i++)crystal(x-1.9+i*.25,0,z-1.5,color,.4+i*.1);return p}
function makePlayer(){const g=new THREE.Group();scene.add(g);box(.55,.7,.4,0xb78d3f,0,.92,0,g);box(.48,.5,.22,0x65431e,0,1,-.31,g);mesh(new THREE.SphereGeometry(.27,10,8),0xdbad70,0,1.54,0,g);const helmet=mesh(new THREE.SphereGeometry(.32,12,6,0,Math.PI*2,0,Math.PI/2),0xecc15a,0,1.62,0,g);box(.74,.07,.6,0xf2ce6b,0,1.63,0,g);box(.15,.11,.09,0xffe6a1,0,1.72,.28,g);g.legs=[box(.18,.5,.22,0x4a3f35,-.16,.28,0,g),box(.18,.5,.22,0x4a3f35,.16,.28,0,g)];g.arms=[box(.17,.6,.2,0xb78d3f,-.39,.94,0,g),box(.17,.6,.2,0xb78d3f,.39,.94,0,g)];const tool=new THREE.Group();g.add(tool);tool.position.set(.5,.7,.24);box(.075,1.1,.07,0x9c6632,0,0,0,tool);box(.3,.07,.08,0xe6b751,0,.57,0,tool);box(.32,.36,.1,0xe9bd55,0,-.67,0,tool);shovel=tool;g.position.set(0,0,7);return g}
function spawnPokemon(file,name,x,z,size){
 const model=detailedPokemon[name]||createPokemonModel(THREE,name);scene.add(model.root);model.root.position.set(x,0,z);
 const shadow=mesh(new THREE.CircleGeometry(size*.3,20),new THREE.MeshBasicMaterial({color:0x34210d,transparent:true,opacity:.25,depthWrite:false}),x,.035,z);shadow.rotation.x=-Math.PI/2;
 const nameplate=label(name.toUpperCase()+' · TALK','#f5dc9f',2.5);nameplate.position.set(x,model.height+.35,z);
 const p={model,shadow,nameplate,file,x,z,homeX:x,homeZ:z,size,name,targetX:x+2,targetZ:z+1,pause:Math.random()*2,following:false,celebrate:0};
 pokemons.push(p);model.root.traverse(part=>{if(part.isMesh)part.userData.pokemon=p});nameplate.userData.pokemon=p;clickTargets.push(model.root,nameplate);return p
}
function jump(){if(!running||dialogOpen()||!grounded)return;grounded=false;verticalVelocity=8.5;tone(280,.08)}
$('#jump').addEventListener('click',jump);
function talkToPokemon(p){if(!running||dialogOpen()||digging)return;activePokemon=p;keys.clear();autoTarget=null;$('#pokemon-name').textContent=p.name;$('#pokemon-portrait').src='./'+p.file;$('#pokemon-portrait').alt=p.name;$('#pokemon-speech').textContent=pokemonLines[p.name];$('#pokemon-follow').textContent=p.following?'Stay and explore here':'Come explore with me';$('#pokemon-dialog').showModal();tone(520,.1)}
$('#talk').addEventListener('click',()=>{if(nearestPokemon)talkToPokemon(nearestPokemon)});
$('#pokemon-clue').addEventListener('click',()=>{const next=plots.find(p=>!finds.some(f=>f.id===p.id)&&(p.id!=='charizard'||finds.length>=3));$('#pokemon-speech').textContent=next?'Try '+next.name+'. There are '+(next.total-next.level)+' layers left to dig. Look for its glowing marker on your map.':explored.gold.length<12?'You’ve found every card! There’s still gold scattered around the map. Look for floating golden crystals.':'Every card and gold crystal found! Let’s visit a landmark and enjoy the view.'});
$('#pokemon-follow').addEventListener('click',()=>{if(!activePokemon)return;const p=activePokemon,follow=!p.following;pokemons.forEach(other=>{other.following=false;other.homeX=other.x;other.homeZ=other.z;other.targetX=other.x;other.targetZ=other.z;other.pause=.5});p.following=follow;$('#pokemon-dialog').close();message(follow?p.name+' is coming with you! Talk again to let it roam.':p.name+' will explore this area.');});
$('#pokemon-pet').addEventListener('click',()=>{if(!activePokemon)return;const p=activePokemon;p.celebrate=p.model.greetingDuration||2;$('#pokemon-dialog').close();message(p.name==='Dugtrio'?'Three happy heads! Dugtrio is delighted to see you.':p.name+' looks happy!');tone(700,.16)});
function updateExploration(){$('#gold-count').textContent=explored.gold.length;$('#landmark-count').textContent=explored.landmarks.length;save('digsite-exploration',explored)}
function collectGold(){if(!running||dialogOpen()||!nearestGold)return;const g=nearestGold;if(explored.gold.includes(g.id))return;explored.gold.push(g.id);g.object.visible=false;g.halo.visible=false;nearestGold=null;$('#collect-gold').hidden=true;updateExploration();tone(880,.2);message(explored.gold.length===12?'Gold rush complete! You found all 12 gold crystals.':'Gold collected! '+explored.gold.length+' of 12 crystals found.')}
$('#collect-gold').addEventListener('click',collectGold);
function addGold(id,x,z){const object=mesh(new THREE.OctahedronGeometry(.35,0),new THREE.MeshStandardMaterial({color:0xffd05b,metalness:.7,roughness:.18,emissive:0xe59925,emissiveIntensity:.55}),x,.9,z);const halo=mesh(new THREE.TorusGeometry(.6,.025,5,24),new THREE.MeshBasicMaterial({color:0xffd05b,transparent:true,opacity:.6}),x,.07,z);halo.rotation.x=Math.PI/2;const g={id,x,z,object,halo};object.visible=halo.visible=!explored.gold.includes(id);goldPieces.push(g);object.userData.gold=g;clickTargets.push(object)}
function teleport(x,z){if(!running)return;player.position.set(x,0,z);verticalVelocity=0;grounded=true;autoTarget=null;keys.clear();pokemons.filter(p=>p.following).forEach(p=>{p.x=x-2;p.z=z+1});$('#map-dialog').close();message('Ready to explore.');}
function showMap(){if(!running||dialogOpen())return;keys.clear();$('#map-destinations').replaceChildren();landmarks.forEach(l=>{const b=document.createElement('button'),visited=explored.landmarks.includes(l.id);b.className='map-destination';b.disabled=!visited;b.textContent=(visited?'↗ ':'◇ ')+l.name+(visited?'':' · undiscovered');b.addEventListener('click',()=>teleport(l.x+4,l.z+5));$('#map-destinations').append(b)});$('#map-dialog').showModal();drawMap()}
$('#open-map').addEventListener('click',showMap);$('#return-camp').addEventListener('click',()=>teleport(0,7));
function drawMap(){const c=$('#world-map'),ctx=c.getContext('2d'),sx=x=>300+x*5,sz=z=>220+z*3.8;ctx.fillStyle='#1c160e';ctx.fillRect(0,0,600,440);ctx.strokeStyle='#c8a56716';ctx.lineWidth=1;for(let i=-45;i<=45;i+=9){ctx.beginPath();ctx.moveTo(sx(i),24);ctx.lineTo(sx(i),416);ctx.stroke();ctx.beginPath();ctx.moveTo(34,sz(i));ctx.lineTo(566,sz(i));ctx.stroke()}ctx.strokeStyle='#c7a76b38';ctx.strokeRect(54,32,492,376);ctx.font='12px monospace';ctx.textAlign='center';landmarks.forEach(l=>{ctx.fillStyle=l.color+'24';ctx.beginPath();ctx.arc(sx(l.x),sz(l.z),46,0,Math.PI*2);ctx.fill();ctx.fillStyle=l.color;ctx.fillText(l.name.toUpperCase(),sx(l.x),sz(l.z)-48);ctx.beginPath();ctx.arc(sx(l.x),sz(l.z),5,0,Math.PI*2);ctx.fill()});goldPieces.filter(g=>!explored.gold.includes(g.id)).forEach(g=>{ctx.fillStyle='#ffd265';ctx.fillRect(sx(g.x)-2,sz(g.z)-2,4,4)});plots.forEach(p=>{ctx.strokeStyle=finds.some(f=>f.id===p.id)?'#7b705c':'#ffd265';ctx.lineWidth=2;ctx.beginPath();ctx.arc(sx(p.x),sz(p.z),9,0,Math.PI*2);ctx.stroke()});ctx.fillStyle='#dcc8a0';ctx.fillText('BASE CAMP',sx(0),sz(7)+25);ctx.fillStyle='#fff8df';ctx.beginPath();ctx.arc(sx(player.position.x),sz(player.position.z),6,0,Math.PI*2);ctx.fill();ctx.fillText('YOU',sx(player.position.x),sz(player.position.z)-13);ctx.textAlign='left';ctx.font='10px monospace';ctx.fillStyle='#b9a587';ctx.fillText('○ DIG SITES    ▪ GOLD    ● YOU',25,427)}
$('#day-night').addEventListener('click',()=>{if(!ready)return;night=!night;scene.background.setHex(night?0x171e36:0x9b7242);scene.fog.color.copy(scene.background);sunLight.intensity=night?.65:4.5;ambientLight.intensity=night?1.35:2.3;sunLight.color.setHex(night?0xb5c8f1:0xffdc9b);$('#day-night').textContent=night?'☀':'☾';$('#day-night').setAttribute('aria-pressed',night);$('#day-night').setAttribute('aria-label',night?'Switch to daytime':'Switch to nighttime');message(night?'The quarry glows under the stars.':'Sunlight returns to the quarry.')});
function tickPokemon(dt,t){
 pokemons.forEach((p,i)=>{
  const oldX=p.x,oldZ=p.z;
  if(running&&!dialogOpen()){
   p.pause-=dt;
   if(p.following){p.targetX=player.position.x-2.1*Math.cos(yaw);p.targetZ=player.position.z+2.1*Math.sin(yaw);p.pause=0}
   else if(p.pause<=0&&Math.hypot(p.targetX-p.x,p.targetZ-p.z)<.2){p.targetX=Math.max(-46,Math.min(46,p.homeX+(Math.random()-.5)*7));p.targetZ=Math.max(-46,Math.min(46,p.homeZ+(Math.random()-.5)*7));p.pause=1+Math.random()*2}
   const dx=p.targetX-p.x,dz=p.targetZ-p.z,d=Math.hypot(dx,dz);
   if(d>.12&&p.pause<=0&&p.celebrate<=0){
    const step=Math.min(d,(p.following?Math.max(7.7,d*.9):p.name==='Dugtrio'?1.5:1.15)*dt);
    const nx=p.x+dx/d*step,nz=p.z+dz/d*step;
    if(!plots.some(plot=>Math.abs(plot.x-nx)<1.8&&Math.abs(plot.z-nz)<1.8)){p.x=nx;p.z=nz}
    else if(p.following){p.x=Math.max(-46,Math.min(46,p.x-dz/d*step));p.z=Math.max(-46,Math.min(46,p.z+dx/d*step))}
    else{p.targetX=p.homeX;p.targetZ=p.homeZ;p.pause=.4}
   }
  }
  const moved=Math.hypot(p.x-oldX,p.z-oldZ)>.001;
  let facing=null;
  if(moved)facing=Math.atan2(p.x-oldX,p.z-oldZ);
  else if(p.celebrate>0||(dialogOpen()&&activePokemon===p))facing=Math.atan2(player.position.x-p.x,player.position.z-p.z);
  if(facing!==null){const delta=Math.atan2(Math.sin(facing-p.model.root.rotation.y),Math.cos(facing-p.model.root.rotation.y));p.model.root.rotation.y+=delta*(1-Math.exp(-dt*8))}
  p.celebrate=Math.max(0,p.celebrate-dt);
  const floor=playerHeight(p.x,p.z);p.model.root.position.set(p.x,floor,p.z);
  p.model.update(dt,t,moved,p.celebrate,i,p.following);
  p.shadow.position.set(p.x,floor+.035,p.z);
  p.nameplate.position.set(p.x,floor+p.model.height+.4,p.z);
 });
}
function scanWorld(){nearestPokemon=pokemons.filter(p=>Math.hypot(p.x-player.position.x,p.z-player.position.z)<3.3).sort((a,b)=>Math.hypot(a.x-player.position.x,a.z-player.position.z)-Math.hypot(b.x-player.position.x,b.z-player.position.z))[0]||null;$('#talk').hidden=!nearestPokemon;if(nearestPokemon)$('#talk').innerHTML='Talk to '+nearestPokemon.name+' <kbd>F</kbd>';nearestGold=goldPieces.find(g=>!explored.gold.includes(g.id)&&Math.hypot(g.x-player.position.x,g.z-player.position.z)<1.8)||null;$('#collect-gold').hidden=!nearestGold;landmarks.forEach(l=>{if(!explored.landmarks.includes(l.id)&&Math.hypot(l.x-player.position.x,l.z-player.position.z)<7){explored.landmarks.push(l.id);updateExploration();tone(600,.25);message('Landmark discovered: '+l.name+'. Fast travel unlocked on your map.',5500)}})}
function advancePlayer(dt,dx,dz){const speed=keys.has('shift')?11:7.5,nx=THREE.MathUtils.clamp(player.position.x+dx*dt*speed,-47.5,47.5),nz=THREE.MathUtils.clamp(player.position.z+dz*dt*speed,-47.5,47.5);const currentFloor=playerHeight(player.position.x,player.position.z),nextFloor=playerHeight(nx,nz);if(nextFloor<=player.position.y+.55||currentFloor<0){player.position.x=nx;player.position.z=nz;if(currentFloor<0&&nextFloor===0&&grounded){player.position.y=0}}if(dx||dz)player.rotation.y=Math.atan2(dx,dz);const floor=playerHeight(player.position.x,player.position.z);if(grounded&&player.position.y>floor+.05){grounded=false;verticalVelocity=0}if(!grounded){verticalVelocity-=20*dt;player.position.y+=verticalVelocity*dt;if(player.position.y<=floor&&verticalVelocity<=0){player.position.y=floor;verticalVelocity=0;grounded=true}}else player.position.y=floor;}

async function init(){THREE=await import('./three.module.js');({createPokemonModel}=await import('./pokemon-models.js'));const {loadDetailedPokemon}=await import('./pokemon-assets.js');detailedPokemon=await loadDetailedPokemon(THREE);scene=new THREE.Scene();scene.background=new THREE.Color(0x9b7242);scene.fog=new THREE.FogExp2(0x9b7242,.013);camera=new THREE.PerspectiveCamera(48,innerWidth/innerHeight,.1,200);renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.3;$('#world').append(renderer.domElement);raycaster=new THREE.Raycaster();clock=new THREE.Clock();ambientLight=new THREE.HemisphereLight(0xffe2ad,0x614124,2.3);scene.add(ambientLight);const sun=new THREE.DirectionalLight(0xffdc9b,4.5);sunLight=sun;sun.position.set(-18,35,14);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-60;sun.shadow.camera.right=60;sun.shadow.camera.top=60;sun.shadow.camera.bottom=-60;sun.shadow.camera.far=140;sun.shadow.bias=-.001;sun.shadow.normalBias=.04;scene.add(sun);const fill=new THREE.DirectionalLight(0xffa538,1.1);fill.position.set(10,6,-20);scene.add(fill);
 const holeKeys=new Set(['-6,3','24,-9','-27,-21','27,-33']);
 const groundColors=[0x98703f,0x9f7747,0xad824b,0xa27742,0x957044,0xa87d48];
 const groundGeometry=new THREE.BoxGeometry(3,1,3),ground=new THREE.InstancedMesh(groundGeometry,new THREE.MeshStandardMaterial({roughness:1}),37*37-holeKeys.size),dummy=new THREE.Object3D();let tile=0;
 for(let i=-18;i<=18;i++)for(let j=-18;j<=18;j++){const x=i*3,z=j*3;if(holeKeys.has(x+','+z))continue;const edge=Math.max(Math.abs(i),Math.abs(j)),height=edge>=17?(edge-16)*1.8+Math.sin(i*4+j)*.7:0;dummy.position.set(x,(height-5)/2,z);dummy.scale.set(1,5+height,1);dummy.updateMatrix();ground.setMatrixAt(tile,dummy.matrix);let color=groundColors[Math.abs(i*13+j*7)%groundColors.length];if(x< -15&&z< -9)color=[0x6f7650,0x7b7e58,0x74714f][Math.abs(i+j)%3];if(x>18&&z>9)color=[0x8b746b,0x968075,0xa08778][Math.abs(i+j)%3];ground.setColorAt(tile++,new THREE.Color(color));}ground.receiveShadow=true;scene.add(ground);
 box(115,2,115,0x4b321e,0,-6,0);box(150,1,150,0x8e663b,0,-8,0);
 createPlot('pikachu','Sunlit shallows',-6,3,1,0xffd04d);createPlot('mewtwo','Violet hollow',24,-9,3,0xbe93ed);createPlot('umbreon','Moonstone trench',-27,-21,5,0xb1c7ed);createPlot('charizard','Golden chamber',27,-33,6,0xffc148);
 // Sandstone gate and the warm lights of the legendary chamber.
 for(const x of [24.2,29.8]){box(1.3,4.8,1.3,0x8d6639,x,2.4,-35);box(1.8,.45,1.7,0xc2985d,x,.22,-35);box(1.8,.45,1.7,0xc2985d,x,4.75,-35)}box(7.3,.9,1.5,0xbb8e4e,27,5.3,-35);box(6.2,.23,1.8,0xe2b85a,27,5.86,-35);const crest=mesh(new THREE.OctahedronGeometry(.6,0),0xffd15c,27,5.35,-34.15);crest.scale.z=.4;torch(23,-33);torch(31,-33);
 for(let i=0;i<38;i++){let x=Math.sin(i*31.71)*22,z=Math.cos(i*27.6)*21;if(plots.some(p=>Math.hypot(p.x-x,p.z-z)<4)||Math.hypot(x,z-7)<4)continue;const r=rock(x,z,.5+(i%4)*.35,i%2?0x765a3b:0xbd935a);if(i%5===0)crystal(x+.6,0,z,0xeac15f,.7)}
 // Camp tent, equipment, mine rail, and fencing make the quarry feel inhabited.
 const tent=mesh(new THREE.ConeGeometry(2.1,2.6,4),0x6f6541,-12,1.3,9);tent.rotation.y=Math.PI/4;box(1.2,1.5,.1,0x2e2518,-12,.75,10.5);box(2.8,.15,3,0x594124,-12,.08,10);torch(-9,9);box(1.2,1.1,1.2,0x725029,-9,.55,6);box(1,1,1,0x8d6433,-10.4,.5,6.4);for(let j=0;j<2;j++)box(.1,1.15,1.25,0xb18b51,-9+(j-.5)*.75,.55,6);
 for(let i=0;i<14;i++){box(2,.12,.25,0x594025,14,.07,14-i*1.25)}box(.12,.17,17,0x80796a,13.3,.17,5.9);box(.12,.17,17,0x80796a,14.7,.17,5.9);box(1.7,.9,2,0x594f3c,14,.85,8);box(1.4,.2,1.7,0x352e24,14,1.3,8);for(const x of [13.2,17.5])for(const z of [7.4,8.6]){const w=mesh(new THREE.CylinderGeometry(.3,.3,.14,10),0x34332c,x,.35,z);w.rotation.z=Math.PI/2}
 for(let i=0;i<8;i++){const x=-18+i*2;box(.15,1.25,.15,0x5d3f21,x,.62,14);if(i<7){box(2,.12,.12,0x917049,x+1,.9,14);box(2,.1,.1,0x917049,x+1,.45,14)}}
 const campLabel=label('BASE CAMP','#e7cb92',3.2);campLabel.position.set(-12,3.5,9);
 spawnPokemon('pikachu.png','Pikachu',-7,7,2.4);spawnPokemon('eevee.png','Eevee',7,5,2.4);spawnPokemon('diglett.png','Diglett',-5,-5,1.8);spawnPokemon('dugtrio.png','Dugtrio',10,1,2.7);

 // Distant regions reward exploration beyond the main excavation sites.
 for(let i=0;i<25;i++){const angle=i*2.399,r=8+(i%4)*2.1;tree(-27+Math.cos(angle)*r,-21+Math.sin(angle)*r,.8+(i%3)*.25)}
 for(let i=0;i<18;i++){const angle=i*2.399,r=4+(i%5)*1.7;crystal(30+Math.cos(angle)*r,0,21+Math.sin(angle)*r,i%2?0xc1a5ed:0x8da3d9,1.2+(i%4)*.5)}
 for(let i=0;i<7;i++){const x=18+i*2.6,z=-28-(i%2)*11;box(.8,2+i%3,.8,0x927b58,x,(2+i%3)/2,z);box(1.2,.25,1.2,0xb6a078,x,2+i%3,z)}
 for(let i=0;i<4;i++){const x=8+i*2.5,z=15,height=.45+i*.4;box(2.2,height,2.2,0xad8754,x,height/2,z);surfaces.push({x,z,width:2.2,depth:2.2,height})}
 for(const l of landmarks){const sign=label(l.name.toUpperCase(),l.color,4.5);sign.position.set(l.x,4.4,l.z+4);torch(l.x-3,l.z+3)}
 [[-2,10],[-12,-2],[14,3],[-18,-15],[-34,-24],[-23,-31],[22,16],[35,25],[29,30],[20,-30],[35,-34],[9,-21]].forEach(([x,z],i)=>addGold('gold-'+i,x,z));
 const platformSign=label('JUMP TRAIL · SPACE','#f5dc9f',3.2);platformSign.position.set(11,3,16);
 updateExploration();

 // Fine drifting gold dust.
 const particleGeo=new THREE.BufferGeometry(),positions=new Float32Array(180*3);for(let i=0;i<180;i++){positions[i*3]=(Math.random()-.5)*50;positions[i*3+1]=Math.random()*11;positions[i*3+2]=(Math.random()-.5)*50}particleGeo.setAttribute('position',new THREE.BufferAttribute(positions,3));particlePoints=new THREE.Points(particleGeo,new THREE.PointsMaterial({color:0xffdfa0,size:.07,transparent:true,opacity:.75}));scene.add(particlePoints);
 player=makePlayer();camera.position.set(17,17,24);camera.lookAt(0,0,3);updateProgress();
 renderer.domElement.style.cursor='grab';
 renderer.domElement.addEventListener('wheel',zoomCamera,{passive:false});
 renderer.domElement.addEventListener('pointerdown',startCameraDrag);
 renderer.domElement.addEventListener('pointermove',moveCameraDrag);
 renderer.domElement.addEventListener('pointerup',e=>{
  if(!finishCameraDrag(e))return;
  const rect=renderer.domElement.getBoundingClientRect(),point=new THREE.Vector2((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);
  raycaster.setFromCamera(point,camera);pokemons.forEach(p=>p.model.preparePick?.());
  const hit=raycaster.intersectObjects(clickTargets,true).find(h=>h.object.visible);
  if(!hit)return;
  if(hit.object.userData.pokemon){talkToPokemon(hit.object.userData.pokemon);return}
  if(hit.object.userData.gold){const g=hit.object.userData.gold;autoTarget={x:g.x,z:g.z,kind:'gold'};message('Follow the sparkle. Press E when the gold is within reach.');return}
  const p=hit.object.userData.plot;if(!p)return;
  if(p.id==='charizard'&&finds.length<3)message('The Golden Chamber is sealed. Find the other three treasures first.');else if(!finds.some(f=>f.id===p.id)){autoTarget=p;message('Heading to '+p.name+'.')}
 });
 renderer.domElement.addEventListener('pointercancel',clearCameraDrag);renderer.domElement.addEventListener('lostpointercapture',clearCameraDrag);
 renderer.domElement.addEventListener('contextmenu',e=>e.preventDefault());addEventListener('blur',clearCameraDrag);
 $('#home-camera').addEventListener('click',resetCamera);
 addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)});
 ready=true;$('#enter-world').disabled=false;$('#load-status').textContent='QUARRY READY · YOUR ADVENTURE AWAITS';animate();
}
function playerHeight(x,z){const p=plots.find(p=>Math.abs(p.x-x)<1.38&&Math.abs(p.z-z)<1.38);if(p)return -p.level*.65;const platform=surfaces.find(s=>Math.abs(s.x-x)<s.width/2&&Math.abs(s.z-z)<s.depth/2);return platform?platform.height:0}
function dig(){if(!running||dialogOpen()||digging||!grounded)return;if(!nearest){message('Move closer to a glowing dig marker, or use “Find a dig site”.');return}const p=nearest;if(finds.some(f=>f.id===p.id)){message('This site is fully excavated. Try another marker.');return}if(p.id==='charizard'&&finds.filter(f=>f.id!=='charizard').length<3){message('The Golden Chamber is sealed. Discover three treasures to unlock it.');return}digging=true;autoTarget=null;tone(130,.15);const block=p.blocks[p.level];if(block)block.visible=false;p.level++;layers[p.id]=p.level;save('digsite-layers',layers);for(let i=0;i<16;i++){const bit=mesh(new THREE.BoxGeometry(.13,.13,.13),i%3?0xc09251:0xffce58,p.x+(Math.random()-.5)*1.4,-(p.level-1)*.65+.3,p.z+(Math.random()-.5)*1.4);dust.push({mesh:bit,v:new THREE.Vector3((Math.random()-.5)*4,2+Math.random()*3,(Math.random()-.5)*4),life:1})}shovel.rotation.x=-1.2;setTimeout(()=>{shovel.rotation.x=0;digging=false},330);if(p.level>=p.total){p.mark.visible=p.beam.visible=p.label.visible=false;p.ring.material.color.setHex(0x6c5a3a);const c=cards[p.id];if(!finds.some(f=>f.id===p.id)){finds.push({id:p.id,player:playerName,time:new Date().toISOString()});save('digsite-finds',finds)}updateProgress();setTimeout(()=>{$('#discovery-image').src='./'+c.image;$('#discovery-image').alt=c.name+' Pokémon card';$('#discovery-name').textContent=c.name;$('#discovery-set').textContent=c.set;$('#discovery-depth').textContent=c.depth+'m BELOW THE SURFACE · DISCOVERY '+finds.length+' OF 4';$('#discovery').showModal();tone(650,.2);setTimeout(()=>tone(900,.3),140)},420)}else message('Layer '+p.level+' of '+p.total+' cleared. '+(p.total-p.level)+' more to the treasure.',2500)}
function animate(){
 requestAnimationFrame(animate);
 const dt=Math.min(clock.getDelta(),.05),t=clock.elapsedTime;
 let moving=false;
 if(running&&!dialogOpen()){
  let dx=0,dz=0;
  if(autoTarget){
   const targetX=autoTarget.x,targetZ=autoTarget.z+(autoTarget.kind==='gold'?0:1.85),len=Math.hypot(targetX-player.position.x,targetZ-player.position.z);
   if(len<.2){const gold=autoTarget.kind==='gold';autoTarget=null;message(gold?'Gold within reach. Press E to collect it.':'You found the marker. Press E or tap “Dig here”.')}
   else{dx=(targetX-player.position.x)/len;dz=(targetZ-player.position.z)/len}
  }else{
   const forward=(keys.has('w')||keys.has('arrowup')?1:0)-(keys.has('s')||keys.has('arrowdown')?1:0),side=(keys.has('d')||keys.has('arrowright')?1:0)-(keys.has('a')||keys.has('arrowleft')?1:0);
   dx=-Math.sin(yaw)*forward+Math.cos(yaw)*side;dz=-Math.cos(yaw)*forward-Math.sin(yaw)*side;
   const length=Math.hypot(dx,dz);if(length){dx/=length;dz/=length}
  }
  moving=!!(dx||dz);advancePlayer(dt,dx,dz);
  player.legs.forEach((l,i)=>l.rotation.x=!grounded?.45:moving?Math.sin(t*15+i*Math.PI)*.65:0);
  player.arms.forEach((a,i)=>a.rotation.x=!grounded?-.6:moving?Math.sin(t*15+i*Math.PI)*.4:0);
  nearest=plots.filter(p=>Math.hypot(p.x-player.position.x,p.z-player.position.z)<2.85).sort((a,b)=>Math.hypot(a.x-player.position.x,a.z-player.position.z)-Math.hypot(b.x-player.position.x,b.z-player.position.z))[0]||null;
  const region=landmarks.find(l=>Math.hypot(l.x-player.position.x,l.z-player.position.z)<16);
  $('#current-zone').textContent=nearest?nearest.name.toUpperCase():region?region.name.toUpperCase():'THE GOLDEN QUARRY';
  $('#depth').textContent=nearest?nearest.level*5:0;
  const completed=nearest&&finds.some(f=>f.id===nearest.id),locked=nearest?.id==='charizard'&&finds.length<3;
  $('#dig').disabled=!nearest||completed||locked||digging||!grounded;
  $('#dig-hint').textContent=completed?'Fully excavated · treasure saved':locked?'Find three treasures to unlock':nearest?'Layer '+(nearest.level+1)+' / '+nearest.total+' · '+(nearest.total-nearest.level)+' digs to discovery':'Move close to a glowing marker';
  scanWorld();
 }
 const target=new THREE.Vector3(player.position.x,Math.max(-1,player.position.y)+.7,player.position.z),offset=cameraOffset(),desired=new THREE.Vector3(target.x+offset.x,target.y+offset.y,target.z+offset.z);
 camera.position.lerp(desired,1-Math.exp(-dt*4));camera.lookAt(target);
 animated.forEach((m,i)=>{m.rotation.y=t*.65+i;if(m.geometry.type==='OctahedronGeometry')m.position.y=1.45+Math.sin(t*2+i)*.15});
 plots.forEach(p=>{p.ring.scale.setScalar(1+Math.sin(t*2)*.025);p.beam.material.opacity=.09+Math.sin(t*1.7)*.035});
 tickPokemon(dt,t);
 goldPieces.forEach((g,i)=>{g.object.rotation.y=t*.9+i;g.object.position.y=.9+Math.sin(t*2+i)*.15});
 for(let i=dust.length-1;i>=0;i--){const d=dust[i];d.life-=dt;d.v.y-=9*dt;d.mesh.position.addScaledVector(d.v,dt);d.mesh.rotation.x+=dt*4;d.mesh.rotation.z+=dt*3;if(d.life<=0){scene.remove(d.mesh);d.mesh.geometry.dispose();dust.splice(i,1)}}
 particlePoints.rotation.y=t*.004;
 if(lastMessage&&performance.now()>lastMessage){$('#game-message').classList.remove('visible');lastMessage=0}
 renderer.render(scene,camera);
}

init().catch(err=>{console.error('Unable to initialize quarry',err);$('#load-status').textContent='3D rendering is unavailable in this browser. Try a WebGL-enabled browser.';$('#enter-world').textContent='3D unavailable';$('#world').innerHTML='<div class="world-error"><h2>The quarry needs WebGL.</h2><p>Enable hardware acceleration or try a browser with WebGL 2 support to explore the 3D world.</p><a class="button" href="index.html">Return to DIGSITE ↗</a></div>'});
