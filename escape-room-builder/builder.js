'use strict';
const el=id=>document.getElementById(id);
const scene=el('scene'), inspector=el('inspector'), notify=msg=>el('status').textContent=msg;
let room={version:1,background:'',aspect:16/9,puzzles:[]},selection,playing=false;
let editingPortrait=false;
const portraitScreen=matchMedia('(orientation: portrait)');
const portraitMode=()=>playing?portraitScreen.matches:editingPortrait;
const alternate=()=>portraitMode()&&!!room.portrait;
const backgroundData=()=>alternate()?room.portrait:room;
function geometry(p){if(!alternate())return p;return p.portrait??=( {x:p.x,y:p.y,size:p.size} )}
const objects=new Map(), solved=new Set();
const freshWheel=()=>({faces:Array.from({length:10},(_,i)=>({text:String(i+1)})),pos:0});
function createLock(){return {id:crypto.randomUUID(),type:'stone-lock',name:'Stone Lock '+(room.puzzles.length+1),x:50,y:50,size:14,wheels:[freshWheel()],solution:[1],requires:'',message:'',finish:false}}
const puzzleKinds=new Map();
const puzzleType=p=>p.type||'stone-lock'; // Old V1 room JSON files had no type; they remain Stone Locks.
function registerPuzzleType(kind){
 if(!kind||!/^[a-z][a-z0-9-]*$/.test(kind.id)||!kind.label||!['create','mount','inspect','ratio','validate'].every(k=>typeof kind[k]==='function')||puzzleKinds.has(kind.id))throw Error('Invalid or duplicate puzzle type');
 puzzleKinds.set(kind.id,kind);
}
window.EscapeRoomPuzzleRegistry=Object.freeze({register:registerPuzzleType,list:()=>[...puzzleKinds.values()].map(k=>({id:k.id,label:k.label}))});
registerPuzzleType({
 id:'stone-lock',label:'Stone Lock',
 create:createLock,
 mount:(target,p,onSolved)=>StoneLock.mount(target,{design:{wheels:p.wheels},solution:p.solution,onSolved}),
 inspect:inspectStoneLock,ratio:p=>800/(348+212*p.wheels.length),
 validate:p=>{validateWheels(p.wheels);if(!Array.isArray(p.solution)||p.solution.length!==p.wheels.length||p.solution.some((v,i)=>!Number.isInteger(v)||v<0||v>=p.wheels[i].faces.length))throw Error('Invalid Stone Lock solution')}
});
registerPuzzleType({
 id:'stone-wheel',label:'Stone Wheel',
 create:()=>({id:crypto.randomUUID(),type:'stone-wheel',name:'Stone Wheel '+(room.puzzles.length+1),x:50,y:50,size:27,design:StoneDial.defaultDesign(),requires:'',message:'',finish:false}),
 mount:(target,p,onSolved,editable)=>StoneDial.mount(target,{design:p.design,onSolved,editable}),
 inspect:inspectStoneWheel,ratio:()=>1,
 validate:p=>{StoneDial.validate(p.design)}
});
function element(tag,text){const n=document.createElement(tag);if(text)n.textContent=text;return n}
function field(title,node,parent=inspector){const label=element('label',title);label.append(node);parent.append(label);return node}
function input(value,change,type='text'){const n=element('input');n.type=type;n.value=value;n.onchange=()=>change(n.value);return n}
function list(options,value,change){const n=element('select');for(const [key,label] of options)n.add(new Option(label,key));n.value=value;n.onchange=()=>change(n.value);return n}
function button(label,act,parent=inspector){const n=element('button',label);n.onclick=act;parent.append(n);return n}
function faceTile(face,caption,action,active=false){
 const b=element(action?'button':'span');b.className='tile';if(action)b.onclick=action;if(active)b.setAttribute('aria-pressed','true');
 const art=element(face.mask?'img':'strong');if(face.mask){art.src=face.mask;art.alt=''}else art.textContent=face.text||'—';
 b.append(art,element('small',caption));b.title=face.text||caption;return b
}
function editFaces(p,i,initialSlot=0,isDial=false){
 const original=isDial?p.design.rings[i]:p.wheels[i],draft=structuredClone(original.faces);let slot=initialSlot,set=FaceSets.names.includes(original.preset)?original.preset:FaceSets.names[0],preset=original.preset;
 const dlg=element('dialog');dlg.className='faceDialog';document.body.append(dlg);dlg.onclose=()=>dlg.remove();
 function draw(){
  dlg.replaceChildren(element('h2',(isDial?'Ring ':'Wheel ')+(i+1)+' · Edit faces'));
  field('Number of faces',list(Array.from({length:isDial?15:10},(_,k)=>[String(k+(isDial?2:1)),String(k+(isDial?2:1))]),String(draft.length),v=>{
   while(draft.length<Number(v))draft.push({text:String(draft.length+1)});draft.length=Number(v);slot=Math.min(slot,draft.length-1);preset='';draw()
  }),dlg);
  const slots=element('div');slots.className='grid';dlg.append(slots);draft.forEach((f,j)=>slots.append(faceTile(f,'Face '+(j+1),()=>{slot=j;draw()},j===slot)));
  dlg.append(element('h3','Artwork for Face '+(slot+1)));
  field('Browse face set',list(FaceSets.names.map(n=>[n,n]),set,v=>{set=v;draw()}),dlg);
  const gallery=element('div');gallery.className='grid';dlg.append(gallery);const choices=FaceSets.get(set);
  choices.forEach(f=>gallery.append(faceTile(f,f.text,()=>{draft[slot]=structuredClone(f);preset='';draw()})));
  button('Use whole set',()=>{draft.splice(0,draft.length,...choices);slot=0;preset=set;draw()},dlg);
  const typed=element('input');typed.type='text';typed.value=draft[slot].mask?'':draft[slot].text;field('Text or number for Face '+(slot+1),typed,dlg);
  typed.oninput=()=>{draft[slot]={text:typed.value};preset='';slots.children[slot].replaceWith(faceTile(draft[slot],'Face '+(slot+1),()=>draw(),true))};
  const upload=element('input');upload.type='file';upload.accept='image/png';field('Upload PNG silhouette for Face '+(slot+1),upload,dlg);
  upload.onchange=async()=>{const file=upload.files[0];if(!file)return;const target=slot,entry=draft[target];try{
   const im=await createImageBitmap(file);const scale=Math.min(1,512/Math.max(im.width,im.height)),c=element('canvas');c.width=Math.max(1,Math.round(im.width*scale));c.height=Math.max(1,Math.round(im.height*scale));const g=c.getContext('2d');g.drawImage(im,0,0,c.width,c.height);im.close();const px=g.getImageData(0,0,c.width,c.height),a=px.data;
   let clear=false;for(let k=3;k<a.length;k+=4)if(a[k]<32){clear=true;break}let left=c.width,top=c.height,right=-1,bottom=-1;
   for(let k=0;k<a.length;k+=4){if(!clear)a[k+3]=255-(a[k]*.2126+a[k+1]*.7152+a[k+2]*.0722);a[k]=a[k+1]=a[k+2]=0;if(a[k+3]>16){const x=k/4%c.width,y=Math.floor(k/4/c.width);left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y)}}
   if(right<0)throw Error();const out=element('canvas');out.width=right-left+1;out.height=bottom-top+1;g.putImageData(px,0,0);out.getContext('2d').drawImage(c,-left,-top);if(!dlg.open||draft[target]!==entry)return;draft[target]={text:file.name.replace(/\.png$/i,''),mask:out.toDataURL('image/png')};preset='';draw()
  }catch{upload.setCustomValidity('Choose a PNG containing a visible silhouette.');upload.reportValidity()}};
  const foot=element('footer');dlg.append(foot);button('Cancel',()=>dlg.close(),foot);button('Done',()=>{original.faces=draft;original.preset=preset;if(isDial){clampDialFaces(p.design,i)}else{original.pos=Math.min(original.pos,draft.length-1);p.solution[i]=Math.min(p.solution[i],draft.length-1)}dlg.close();render()},foot)
 }
 draw();dlg.showModal()
}


function clampDialFaces(d,i){
 const r=d.rings[i],last=r.faces.length-1;r.start=Math.min(r.start,last);
 for(const s of d.sequence)if(s.ring===i)s.face=Math.min(s.face,last);
 for(const x of d.alignment)if(x.ring===i)x.face=Math.min(x.face,last);
 for(const x of d.alignmentPairs){if(x.aRing===i)x.aFace=Math.min(x.aFace,last);if(x.bRing===i)x.bFace=Math.min(x.bFace,last)}
}
function normalizeDialDesign(d){
 d.sequence=d.sequence.filter(s=>s.ring>=0&&s.ring<d.rings.length);
 d.alignment=d.alignment.filter(s=>s.ring>=0&&s.ring<d.rings.length);
 d.alignmentPairs=d.alignmentPairs.filter(x=>x.aRing>=0&&x.bRing>=0&&x.aRing<d.rings.length&&x.bRing<d.rings.length&&x.aRing!==x.bRing);
 if(!d.sequence.length)d.sequence.push({ring:0,direction:'cw',revolutions:1,face:0});
 if(!d.alignment.length&&!d.alignmentPairs.length)d.alignment.push({ring:0,face:0});
 d.rings.forEach((r,i)=>clampDialFaces(d,i));
}
const dialFaces=(d,i)=>d.rings[i].faces.map((f,j)=>[String(j),f.text||'Symbol '+(j+1)]);
function inspectStoneLock(p){
 for(const [i,w] of p.wheels.entries()){
  const group=element('fieldset');group.append(element('legend','Wheel '+(i+1)));inspector.append(group);
  const strip=element('div');strip.className='faceStrip';group.append(strip);
  w.faces.forEach((f,j)=>strip.append(faceTile(f,String(j+1),()=>editFaces(p,i,j))));
  button('Edit faces',()=>editFaces(p,i),group);
  const options=w.faces.map((f,j)=>[String(j),f.text||'Symbol '+(j+1)]);
  field('Starting face',list(options,String(w.pos),v=>{w.pos=Number(v);render()}),group);
  field('Correct face',list(options,String(p.solution[i]),v=>{p.solution[i]=Number(v)}),group);
 }
 if(p.wheels.length<10)button('Add wheel',()=>{p.wheels.push(freshWheel());p.solution.push(1);render()});
 if(p.wheels.length>1)button('Remove last wheel',()=>{p.wheels.pop();p.solution.pop();render()});
 const file=element('input');file.type='file';file.accept='.json';field('Import Stone Lock design',file);
 file.onchange=async()=>{try{const data=JSON.parse(await file.files[0].text());validateWheels(data.wheels);p.wheels=data.wheels;p.solution=p.wheels.map(w=>(w.pos+1)%w.faces.length);render()}catch{notify('Choose a valid Stone Lock design JSON.')}};
}
let selectedDialRing=0;
function inspectStoneWheel(p){
 const d=p.design;
 field('Stone Wheel solution type',list([['sequence','Traditional safe combination'],['alignment','Matching symbols'],['both','Both mechanics']],d.mode,v=>{d.mode=v;normalizeDialDesign(d);render()}));
 field('Outer dial markings',list([['notches','Notches'],['dots','Stone dots'],['runes','Runic marks'],['none','Plain stone']],d.rim.style,v=>{d.rim.style=v;render()}));
 field('Number of outer marks',input(d.rim.count,v=>{d.rim.count=Math.max(8,Math.min(96,Math.round(+v)||48));render()},'number'));
 field('Concentric rings',list(Array.from({length:6},(_,i)=>[String(i+1),String(i+1)]),String(d.rings.length),v=>{
  const n=+v;while(d.rings.length<n)d.rings.push({name:'Ring '+(d.rings.length+1),start:0,faces:structuredClone(d.rings[0].faces)});
  d.rings.length=n;normalizeDialDesign(d);selectedDialRing=Math.min(selectedDialRing,n-1);render()
 }));
 selectedDialRing=Math.min(selectedDialRing,d.rings.length-1);
 field('Editing ring',list(d.rings.map((r,i)=>[String(i),r.name]),String(selectedDialRing),v=>{selectedDialRing=+v;inspect()}));
 const i=selectedDialRing,r=d.rings[i],group=element('fieldset');group.append(element('legend','Ring '+(i+1)));inspector.append(group);
 field('Ring name',input(r.name,v=>{r.name=v||'Ring '+(i+1);render()}),group);
 field('Number of faces',list(Array.from({length:15},(_,j)=>[String(j+2),String(j+2)]),String(r.faces.length),v=>{
  const n=+v;while(r.faces.length<n)r.faces.push({text:String(r.faces.length+1)});r.faces.length=n;clampDialFaces(d,i);render()
 }),group);
 const strip=element('div');strip.className='faceStrip';group.append(strip);
 r.faces.forEach((f,j)=>strip.append(faceTile(f,'Face '+(j+1),()=>editFaces(p,i,j,true))));
 button('Edit individual symbols and PNG artwork',()=>editFaces(p,i,0,true),group);
 field('Starting face',list(dialFaces(d,i),String(r.start),v=>{r.start=+v;render()}),group);
 const target=d.alignment.find(x=>x.ring===i);
 field('Top pointer target',list([['-1','Not required'],...dialFaces(d,i)],target?String(target.face):'-1',v=>{
  d.alignment=d.alignment.filter(x=>x.ring!==i);if(+v>=0)d.alignment.push({ring:i,face:+v});normalizeDialDesign(d);render()
 }),group);
 if(d.mode!=='alignment'){
  const seq=element('fieldset');seq.append(element('legend','Safe combination steps'));inspector.append(seq);
  seq.append(element('p','Turn in the stated direction, complete the revolutions, then stop on the face.'));
  d.sequence.forEach((step,j)=>{
   const part=element('fieldset');part.append(element('legend','Step '+(j+1)));seq.append(part);
   field('Ring',list(d.rings.map((r,k)=>[String(k),r.name]),String(step.ring),v=>{step.ring=+v;step.face=Math.min(step.face,d.rings[step.ring].faces.length-1);render()}),part);
   field('Direction',list([['cw','Clockwise'],['ccw','Anticlockwise']],step.direction,v=>{step.direction=v;render()}),part);
   field('Complete revolutions',list(Array.from({length:11},(_,k)=>[String(k),String(k)]),String(step.revolutions),v=>{step.revolutions=+v;render()}),part);
   field('Stop at',list(dialFaces(d,step.ring),String(step.face),v=>{step.face=+v;render()}),part);
   if(d.sequence.length>1)button('Remove step',()=>{d.sequence.splice(j,1);render()},part)
  });
  if(d.sequence.length<20)button('Add combination step',()=>{d.sequence.push({ring:0,direction:d.sequence.length%2?'ccw':'cw',revolutions:1,face:0});render()},seq);
 }
 if(d.mode!=='sequence'){
  const pairGroup=element('fieldset');pairGroup.append(element('legend','Matching ring symbols'));inspector.append(pairGroup);
  pairGroup.append(element('p','Line up specific engravings on different stone rings.'));
  d.alignmentPairs.forEach((pair,j)=>{
   const part=element('fieldset');part.append(element('legend','Symbol match '+(j+1)));pairGroup.append(part);
   field('First ring',list(d.rings.map((r,k)=>[String(k),r.name]),String(pair.aRing),v=>{
    pair.aRing=+v;if(pair.aRing===pair.bRing)pair.bRing=(pair.aRing+1)%d.rings.length;
    pair.aFace=Math.min(pair.aFace,d.rings[pair.aRing].faces.length-1);render()
   }),part);
   field('First symbol',list(dialFaces(d,pair.aRing),String(pair.aFace),v=>{pair.aFace=+v;render()}),part);
   field('Second ring',list(d.rings.map((r,k)=>[String(k),r.name]),String(pair.bRing),v=>{
    pair.bRing=+v;if(pair.aRing===pair.bRing)pair.aRing=(pair.bRing+1)%d.rings.length;
    pair.bFace=Math.min(pair.bFace,d.rings[pair.bRing].faces.length-1);render()
   }),part);
   field('Second symbol',list(dialFaces(d,pair.bRing),String(pair.bFace),v=>{pair.bFace=+v;render()}),part);
   button('Remove symbol match',()=>{d.alignmentPairs.splice(j,1);normalizeDialDesign(d);render()},part)
  });
  if(d.rings.length>1)button('Add matching pair',()=>{d.alignmentPairs.push({aRing:0,aFace:0,bRing:1,bFace:0});render()},pairGroup)
 }
 const file=element('input');file.type='file';file.accept='.json,application/json';field('Import Stone Wheel JSON design',file);
 file.onchange=async()=>{try{if(!file.files[0])return;p.design=StoneDial.validate(JSON.parse(await file.files[0].text()));selectedDialRing=0;render();notify('Stone Wheel design loaded.')}catch(e){notify('Invalid Stone Wheel JSON: '+e.message)}};
 button('Save Stone Wheel JSON design',()=>{
  try{StoneDial.validate(d);const url=URL.createObjectURL(new Blob([JSON.stringify(d,null,2)],{type:'application/json'})),a=element('a');a.href=url;a.download='Stone_Wheel_V1.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
  catch(e){notify('Could not save Stone Wheel design: '+e.message)}
 });
 const advanced=element('a','Open full Stone Wheel designer');advanced.href='puzzles/stone-dial/Stone_Dial_V1.html';advanced.target='_blank';advanced.rel='noopener';inspector.append(advanced);
 inspector.append(element('p','For the standalone designer, save the Stone Wheel design JSON first, then open that JSON in its designer.'));
}
function inspect(){
 inspector.replaceChildren();const p=room.puzzles.find(p=>p.id===selection);
 if(!p){inspector.textContent='Choose Add Puzzle to place an interactive puzzle in your room.';return}
 field('Selected puzzle',list(room.puzzles.map(q=>[q.id,q.name]),p.id,id=>{selection=id;render()}));
 field('Name',input(p.name,v=>{p.name=v.trim()||puzzleKinds.get(puzzleType(p)).label;inspect()}));
 const layout=geometry(p);const size=input(layout.size,v=>{layout.size=Number(v);render()},'range');size.min=3;size.max=75;field('Width on background (%)',size);
 const kind=puzzleKinds.get(puzzleType(p));if(kind)kind.inspect(p);
 field(p.type==='wall-safe'?'Puzzle that opens this safe':'Unlock this puzzle after',list([['',p.type==='wall-safe'?'Unlinked — stays locked':'Available at start'],...room.puzzles.filter(q=>q!==p&&!dependsOn(q,p.id)).map(q=>[q.id,q.name])],p.requires,v=>p.requires=v));
 field('Message when solved',input(p.message,v=>p.message=v));const finish=element('input');finish.type='checkbox';finish.checked=p.finish;finish.onchange=()=>p.finish=finish.checked;field('Finish room when solved ',finish);
 button('Remove puzzle',()=>{room.puzzles=room.puzzles.filter(q=>q!==p);for(const q of room.puzzles)if(q.requires===p.id)q.requires='';selection=room.puzzles[0]?.id;render()})
}
function dependsOn(q,id){const seen=new Set();while(q?.requires){if(q.requires===id||seen.has(q.requires))return true;seen.add(q.requires);q=room.puzzles.find(p=>p.id===q.requires)}return false}
function validateWheels(ws){if(!Array.isArray(ws)||!ws.length||ws.length>10||!ws.every(w=>Array.isArray(w.faces)&&w.faces.length&&w.faces.length<=10&&Number.isInteger(w.pos)&&w.pos>=0&&w.pos<w.faces.length&&w.faces.every(f=>typeof f.text==='string'&&(!f.mask||/^data:image\/png;base64,[\w+/=]+$/.test(f.mask)))))throw Error()}
function bounds(p,puzzleRatio){const height=p.size*backgroundData().aspect*puzzleRatio;const hy=Math.min(50,height/2);p.x=Math.max(p.size/2,Math.min(100-p.size/2,p.x));p.y=Math.max(hy,Math.min(100-hy,p.y))}
function place(p,node){const g=geometry(p);const kind=puzzleKinds.get(puzzleType(p));bounds(g,kind.ratio(p));Object.assign(node.style,{left:g.x+'%',top:g.y+'%',width:g.size+'%'})}
function paintLayout(){
 const bg=backgroundData();scene.style.aspectRatio=bg.aspect;scene.style.backgroundImage=bg.background?'url("'+bg.background+'")':'';
 scene.style.maxWidth='min(100%, calc(75svh * '+bg.aspect+'))';scene.style.marginInline='auto';
 el('empty').hidden=!!bg.background||!!room.puzzles.length;
 el('roomLayout').value=editingPortrait?'portrait':'base';el('portraitUpload').hidden=!editingPortrait;el('removePortrait').hidden=!editingPortrait||!room.portrait;
 el('layoutHint').textContent=editingPortrait?(room.portrait?'Drag puzzles to set their portrait positions.':'Using the main artwork and positions. Portrait artwork is optional.'):''
}
function syncPuzzleAccess(p) {
 const item=objects.get(p.id);
 if(!item)return;
 const ready=!p.requires||solved.has(p.requires);
 if(item.lock.setUnlocked){item.node.hidden=false;item.lock.setUnlocked(ready)}
 else item.node.hidden=!ready;
}
function render(){
 for(const o of objects.values())o.lock.destroy();objects.clear();scene.querySelectorAll('.item').forEach(e=>e.remove());
 paintLayout();

 for(const p of room.puzzles){
  const n=element('div');n.className='item';place(p,n);scene.append(n);
  const mount=element('div');n.append(mount);
  const kind=puzzleKinds.get(puzzleType(p));if(!kind){notify('Unsupported puzzle type: '+puzzleType(p));continue}
  const lock=kind.mount(mount,p,()=>{
   if(!playing)return;solved.add(p.id);lock.close();
   const message=(p.message||'').trim();
   // Only show author-written story feedback. Never show generic technical status to players.
   notify(/^(Lock (opened|solved)|Room complete)\.?$/i.test(message)?'':message);
   for(const q of room.puzzles)syncPuzzleAccess(q);
   const exitPending=room.puzzles.some(q=>q.type==='escape-door'&&q.finish&&!solved.has(q.id)&&dependsOn(q,p.id));
   if(p.finish&&!exitPending)for(const o of objects.values())o.node.inert=true
  },!playing);objects.set(p.id,{lock,node:n});
  if(playing){syncPuzzleAccess(p);continue}
  mount.inert=true;const h=element('button');h.className='handle'+(p.id===selection?' chosen':'');h.setAttribute('aria-label','Position '+p.name);n.append(h);
  h.onpointerdown=e=>{selection=p.id;inspect();scene.querySelectorAll('.chosen').forEach(el=>el.classList.remove('chosen'));h.classList.add('chosen');h.setPointerCapture(e.pointerId);const rect=scene.getBoundingClientRect(),g=geometry(p),x=g.x,y=g.y,sx=e.clientX,sy=e.clientY;h.onpointermove=v=>{g.x=x+100*(v.clientX-sx)/rect.width;g.y=y+100*(v.clientY-sy)/rect.height;place(p,n)}};
  h.onlostpointercapture=()=>h.onpointermove=null;h.onclick=()=>{selection=p.id;inspect()}
 }inspect()
}
function showAddPuzzle(){
 const dlg=el('addPuzzleDialog'),choices=el('puzzleOptions');choices.replaceChildren();
 for(const kind of puzzleKinds.values()){
  const btn=button('Add '+kind.label,()=>{const p=kind.create();room.puzzles.push(p);selection=p.id;dlg.close();render()},choices);
  btn.dataset.puzzleType=kind.id;
 }
 dlg.showModal();
}
el('add').onclick=showAddPuzzle;
el('cancelAddPuzzle').onclick=()=>el('addPuzzleDialog').close();
el('play').onclick=()=>{playing=!playing;solved.clear();document.body.classList.toggle('play',playing);el('play').textContent=playing?'Back to editor':'Playtest';notify('');render()};
async function setBackground(e,portrait){const file=e.target.files[0];if(!file)return;try{const bitmap=await createImageBitmap(file),c=element('canvas');c.width=bitmap.width;c.height=bitmap.height;c.getContext('2d').drawImage(bitmap,0,0);const data={background:c.toDataURL('image/png'),aspect:c.width/c.height};if(portrait)room.portrait=data;else Object.assign(room,data);bitmap.close();render()}catch{notify('Could not read the background image.')}e.target.value=''};
el('background').onchange=e=>setBackground(e,false);
el('portraitBg').onchange=e=>setBackground(e,true);
el('roomLayout').onchange=e=>{editingPortrait=e.target.value==='portrait';render()};
el('removePortrait').onclick=()=>{delete room.portrait;room.puzzles.forEach(p=>delete p.portrait);render()};
portraitScreen.addEventListener('change',()=>{if(playing){paintLayout();for(const p of room.puzzles)place(p,objects.get(p.id).node)}});
el('save').onclick=()=>{const a=element('a'),url=URL.createObjectURL(new Blob([JSON.stringify(room)],{type:'application/json'}));a.href=url;a.download='Escape_Room.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};
el('load').onchange=async e=>{try{const r=JSON.parse(await e.target.files[0].text());if(r.version!==1||!Number.isFinite(r.aspect)||r.aspect<=0||typeof r.background!=='string'||(r.background&&!/^data:image\/png;base64,[\w+/=]+$/.test(r.background))||!Array.isArray(r.puzzles))throw Error();
 if(r.portrait&&(!Number.isFinite(r.portrait.aspect)||r.portrait.aspect<=0||!/^data:image\/png;base64,[\w+/=]+$/.test(r.portrait.background)))throw Error();
 const ids=new Set();for(const p of r.puzzles){if(p.portrait&&(![p.portrait.x,p.portrait.y,p.portrait.size].every(Number.isFinite)||p.portrait.size<=0||p.portrait.size>100))throw Error();if(!p.id||ids.has(p.id)||![p.x,p.y,p.size].every(Number.isFinite)||p.size<=0||p.size>100||typeof p.name!=='string'||!puzzleKinds.has(puzzleType(p)))throw Error();
 puzzleKinds.get(puzzleType(p)).validate(p);ids.add(p.id)}
 const byId=new Map(r.puzzles.map(p=>[p.id,p]));for(const p of r.puzzles){const seen=new Set([p.id]);let link=p.requires;while(link){if(!byId.has(link)||seen.has(link))throw Error();seen.add(link);link=byId.get(link).requires}}
 room=r;selection=r.puzzles[0]?.id;render();notify('Room loaded.')}catch{notify('Choose a valid Escape Room V1 file.')}e.target.value=''};
render();
