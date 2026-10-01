(() => {
'use strict';

const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const canvas=$('#worldCanvas'),ctx=canvas.getContext('2d'),scroller=$('#canvasScroller'),sizer=$('#canvasSizer');
const mapList=$('#mapList'),assetList=$('#assetList'),assetSearch=$('#assetSearch');
const categoryList=$('#categoryList'),bulkCategoryBar=$('#bulkCategoryBar'),bulkCategorySelect=$('#bulkCategorySelect'),assetSelectionCount=$('#assetSelectionCount');
const mapInspector=$('#mapInspector'),selectionInspector=$('#selectionInspector'),selectionTitle=$('#selectionTitle'),deleteSelected=$('#deleteSelected');
const modeStatus=$('#modeStatus'),cursorStatus=$('#cursorStatus'),zoomSelect=$('#zoomSelect'),gridSizeInput=$('#gridSize'),snapToggle=$('#snapToggle');
const brushWidthInput=$('#brushWidth'),brushHeightInput=$('#brushHeight');
const playHud=$('#playHud'),playMapName=$('#playMapName');
const dialogOverlay=$('#dialogOverlay'),dialogSpeaker=$('#dialogSpeaker'),dialogHeading=$('#dialogHeading'),dialogBody=$('#dialogBody'),dialogContinue=$('#dialogContinue');
const puzzleOverlay=$('#puzzleOverlay'),puzzleHeading=$('#puzzleHeading'),puzzlePrompt=$('#puzzlePrompt'),puzzleSequence=$('#puzzleSequence'),puzzlePad=$('#puzzlePad');

const STORE='chipin-world-builder-v1';
const RECOVERY_STORE='chipin-world-builder-recovery-v1';
const HISTORY_STORE='chipin-world-builder-history-v1';
const SCHEMA_VERSION=2;

const VIRTUAL_ASSETS={
  'couch-horizontal':{label:'Couch — Horizontal',source:'couch.png',sx:0,sy:0,sw:32,sh:16},
  'couch-vertical':{label:'Couch — Vertical',source:'couch.png',sx:32,sy:0,sw:16,sh:32},
  'fence-horizontal':{label:'Fence — Horizontal',source:'fence.png',sx:0,sy:0,sw:32,sh:16},
  'fence-vertical':{label:'Fence — Vertical',source:'fence.png',sx:32,sy:0,sw:16,sh:32},
  'fence-shadow-horizontal':{label:'Fence Shadow — Horizontal',source:'fence-shadow.png',sx:0,sy:0,sw:32,sh:16},
  'fence-shadow-vertical':{label:'Fence Shadow — Vertical',source:'fence-shadow.png',sx:32,sy:0,sw:16,sh:32}
};
const HIDDEN_COMBINED_ASSETS=new Set(['couch.png','fence.png','fence-shadow.png']);
const virtualCanvasCache=new Map();

let assets=null, extraAssets=null, project=null, mode='select', selected=null, selectedAssetName=null, snap=true, zoom=1;
let drag=null, draftRect=null, pathEditing=false, pointerDown=false, lastStampKey='';
let organiseMode=false,categoryFilter='all';
const organisedSelection=new Set();
let play=null, editorMapBeforePlay=null, lastTime=performance.now();
let dialogState=null, puzzleState=null;
const keys=new Set();

const uid=(prefix='id')=>prefix+'-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,7);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const grid=()=>Math.max(1,Number(gridSizeInput.value)||16);
const snapV=v=>snap?Math.round(v/grid())*grid():Math.round(v);
const brushCols=()=>clamp(Number(brushWidthInput?.value)||1,1,32);
const brushRows=()=>clamp(Number(brushHeightInput?.value)||1,1,32);

function catalogNames(){
  const names=[
    ...assets.names.filter(n=>!HIDDEN_COMBINED_ASSETS.has(n)),
    ...(extraAssets?.names||[]),
    ...Object.keys(VIRTUAL_ASSETS)
  ];
  return [...new Set(names)].sort((a,b)=>assetLabel(a).localeCompare(assetLabel(b)));
}
function assetLabel(name){return VIRTUAL_ASSETS[name]?.label||String(name).replace('.png','')}
function assetProvider(name){
  if(VIRTUAL_ASSETS[name])return assets;
  if(assets?.names?.includes(name))return assets;
  if(extraAssets?.names?.includes(name))return extraAssets;
  throw new Error('Unknown builder asset: '+name);
}
function assetMeta(name){
  const v=VIRTUAL_ASSETS[name];
  if(v)return {width:v.sw,height:v.sh,cell:null,virtual:true,source:v.source,crop:{x:v.sx,y:v.sy,w:v.sw,h:v.sh}};
  return assetProvider(name).metadata(name);
}
function virtualCanvas(name){
  if(virtualCanvasCache.has(name))return virtualCanvasCache.get(name);
  const v=VIRTUAL_ASSETS[name];if(!v)return null;
  const src=assets.canvas(v.source),c=document.createElement('canvas');c.width=v.sw;c.height=v.sh;
  const x=c.getContext('2d');x.imageSmoothingEnabled=false;x.drawImage(src,v.sx,v.sy,v.sw,v.sh,0,0,v.sw,v.sh);
  virtualCanvasCache.set(name,c);return c;
}
function assetPreview(name){
  if(VIRTUAL_ASSETS[name])return virtualCanvas(name);
  const provider=assetProvider(name),meta=provider.metadata(name);
  return meta.cell?provider.frame(name,0):provider.canvas(name);
}
function drawAsset(target,name,x,y,options={}){
  const v=VIRTUAL_ASSETS[name];
  if(!v){assetProvider(name).draw(target,name,x,y,options);return}
  const src=virtualCanvas(name),w=options.width??src.width,h=options.height??src.height;
  target.save();target.imageSmoothingEnabled=false;target.globalAlpha=options.alpha??1;
  if(options.flipX||options.flipY){
    target.translate(x+(options.flipX?w:0),y+(options.flipY?h:0));
    target.scale(options.flipX?-1:1,options.flipY?-1:1);target.drawImage(src,0,0,w,h);
  }else target.drawImage(src,x,y,w,h);
  target.restore();
}
function freshEditor(){
  return {categories:[],assetCategoryByAsset:{},brush:{w:1,h:1},activeCategory:'all'};
}

function freshMap(name='New Map'){
  return {id:uid('map'),name,width:640,height:480,bg:'#edf0e6',spawn:{x:80,y:80},assets:[],transitions:[],npcs:[],questTargets:[]};
}
function freshProject(){
  const map=freshMap('Player House - Bedroom');
  return {version:SCHEMA_VERSION,name:'Christmas World',activeMapId:map.id,maps:[map],editor:freshEditor()};
}
function normaliseProject(p){
  if(!p||!Array.isArray(p.maps)||!p.maps.length)throw new Error('No maps found in project.');
  p.version=SCHEMA_VERSION;p.name=p.name||'Christmas World';
  p.editor=p.editor&&typeof p.editor==='object'?p.editor:freshEditor();
  p.editor.categories=Array.isArray(p.editor.categories)?p.editor.categories:[];
  p.editor.assetCategoryByAsset=p.editor.assetCategoryByAsset&&typeof p.editor.assetCategoryByAsset==='object'?p.editor.assetCategoryByAsset:{};
  p.editor.brush=p.editor.brush&&typeof p.editor.brush==='object'?p.editor.brush:{w:1,h:1};
  p.editor.brush.w=clamp(Number(p.editor.brush.w)||1,1,32);p.editor.brush.h=clamp(Number(p.editor.brush.h)||1,1,32);
  p.editor.activeCategory='all';
  for(const c of p.editor.categories){c.id=c.id||uid('cat');c.name=c.name||'Category'}
  for(const m of p.maps){
    m.id=m.id||uid('map');m.name=m.name||'Map';m.width=Math.max(160,Number(m.width)||640);m.height=Math.max(120,Number(m.height)||480);m.bg=m.bg||'#edf0e6';
    m.spawn=m.spawn||{x:80,y:80};m.assets=Array.isArray(m.assets)?m.assets:[];m.transitions=Array.isArray(m.transitions)?m.transitions:[];m.npcs=Array.isArray(m.npcs)?m.npcs:[];m.questTargets=Array.isArray(m.questTargets)?m.questTargets:[];
    for(const a of m.assets){a.id=a.id||uid('asset');a.layer=Number(a.layer)||0;a.solid=!!a.solid;a.flipX=!!a.flipX;a.flipY=!!a.flipY}
    for(const t of m.transitions){t.id=t.id||uid('link');t.label=t.label||'Map Link'}
    for(const n of m.npcs){n.id=n.id||uid('npc');n.name=n.name||'Elf';n.dialogue=n.dialogue||'Hello!';n.path=Array.isArray(n.path)?n.path:[];n.speed=Number(n.speed)||24;n.quest=n.quest||{enabled:false,title:'',description:'',itemName:'',reward:'Christmas Present',completeText:'Thank you!'}}
    for(const q of m.questTargets){q.id=q.id||uid('quest');q.label=q.label||'Quest Item';q.itemName=q.itemName||'Quest Item';q.puzzle=q.puzzle||{enabled:false,prompt:'Repeat the sequence.',sequence:[1,2,3,4]}}
  }
  if(!p.maps.some(m=>m.id===p.activeMapId))p.activeMapId=p.maps[0].id;
  return p;
}
function recordHistory(raw){
  try{
    const list=JSON.parse(localStorage.getItem(HISTORY_STORE)||'[]');
    list.unshift({savedAt:new Date().toISOString(),raw});
    localStorage.setItem(HISTORY_STORE,JSON.stringify(list.slice(0,4)));
  }catch(_){}
}
function saveLocal(show=true){
  if(!project)return;
  project.version=SCHEMA_VERSION;project.updatedAt=new Date().toISOString();
  const next=JSON.stringify(project),previous=localStorage.getItem(STORE);
  if(previous&&previous!==next)localStorage.setItem(RECOVERY_STORE,previous);
  localStorage.setItem(STORE,next);
  if(show){recordHistory(next);flashStatus('Saved. This project will reopen after a hard refresh.')}
}
function loadLocal(){
  const candidates=[localStorage.getItem(STORE),localStorage.getItem(RECOVERY_STORE)];
  try{for(const h of JSON.parse(localStorage.getItem(HISTORY_STORE)||'[]'))candidates.push(h.raw)}catch(_){}
  for(const raw of candidates){if(!raw)continue;try{return normaliseProject(JSON.parse(raw))}catch(e){console.warn('World Builder save could not be loaded:',e)}}
  return freshProject()
}
function activeMap(){
  const id=play?play.mapId:project.activeMapId;
  return project.maps.find(m=>m.id===id)||project.maps[0];
}
function mapById(id){return project.maps.find(m=>m.id===id)}
function setActiveMap(id){
  if(play)return;
  if(!mapById(id))return;
  project.activeMapId=id;selected=null;pathEditing=false;resizeCanvas();renderAllPanels();draw();
}
function flashStatus(text){modeStatus.textContent=text;clearTimeout(flashStatus.t);flashStatus.t=setTimeout(updateModeStatus,1800)}
function updateModeStatus(){
  const labels={select:'Select and drag objects. Use the inspector for exact values.',place:selectedAssetName?'Stamp '+assetLabel(selectedAssetName)+' · brush '+brushCols()+'×'+brushRows()+'.':'Choose an asset from the palette.',transition:'Drag a rectangle where walking should load another map.',npc:'Click to place an NPC, then edit dialogue, movement and quest settings.',quest:'Click to place a quest item / puzzle point.',play:'Playtest is live. Walk through links and interact with NPCs.'};
  modeStatus.textContent=pathEditing?'NPC PATH: click map points in walking order.':labels[mode];
}
function setMode(next){
  if(play&&next!=='play')stopPlaytest();
  mode=next;pathEditing=false;drag=null;draftRect=null;lastStampKey='';
  $$('.modeBtn[data-mode]').forEach(b=>b.classList.toggle('active',b.dataset.mode===mode));
  canvas.style.cursor=mode==='select'?'default':mode==='transition'?'crosshair':'cell';
  updateModeStatus();draw();
}

function resizeCanvas(){
  const m=activeMap();canvas.width=m.width;canvas.height=m.height;
  zoom=Number(zoomSelect.value)||1;
  canvas.style.width=Math.round(m.width*zoom)+'px';canvas.style.height=Math.round(m.height*zoom)+'px';
  sizer.style.width=Math.round(m.width*zoom)+'px';sizer.style.height=Math.round(m.height*zoom)+'px';
}
function pointerWorld(e){
  const r=canvas.getBoundingClientRect();
  return {x:clamp((e.clientX-r.left)*canvas.width/r.width,0,canvas.width),y:clamp((e.clientY-r.top)*canvas.height/r.height,0,canvas.height)};
}
function hitRect(p,o){return p.x>=o.x&&p.x<=o.x+o.w&&p.y>=o.y&&p.y<=o.y+o.h}
function frameCount(name){
  const meta=assetMeta(name);if(!meta.cell)return 1;
  return Math.max(1,Math.floor(meta.width/meta.cell.width)*Math.floor(meta.height/meta.cell.height));
}
function defaultAssetSize(name){
  const meta=assetMeta(name);
  return meta.cell?{w:meta.cell.width,h:meta.cell.height,frame:0}:{w:meta.width,h:meta.height,frame:null};
}
function getSelected(){
  if(!selected)return null;
  const m=activeMap(), list=selected.type==='asset'?m.assets:selected.type==='transition'?m.transitions:selected.type==='npc'?m.npcs:m.questTargets;
  return list.find(o=>o.id===selected.id)||null;
}
function selectObject(type,id){selected={type,id};renderSelectionInspector();draw()}
function hitTest(p){
  const m=activeMap();
  for(let i=m.npcs.length-1;i>=0;i--){const n=m.npcs[i];if(Math.hypot(p.x-n.x,p.y-n.y)<=14)return {type:'npc',id:n.id}}
  for(let i=m.questTargets.length-1;i>=0;i--){const q=m.questTargets[i];if(hitRect(p,{x:q.x-10,y:q.y-10,w:20,h:20}))return {type:'quest',id:q.id}}
  for(let i=m.transitions.length-1;i>=0;i--){const t=m.transitions[i];if(hitRect(p,t))return {type:'transition',id:t.id}}
  const arr=[...m.assets].sort((a,b)=>(b.layer||0)-(a.layer||0));
  for(const a of arr)if(hitRect(p,a))return {type:'asset',id:a.id};
  return null;
}
function addAssetAt(x,y){
  if(!selectedAssetName)return;
  const m=activeMap(),d=defaultAssetSize(selectedAssetName),gx=snapV(x),gy=snapV(y),cols=brushCols(),rows=brushRows();
  const key=selectedAssetName+'|'+gx+'|'+gy+'|'+cols+'x'+rows;if(key===lastStampKey)return;lastStampKey=key;
  let last=null;
  for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){
    const a={id:uid('asset'),asset:selectedAssetName,x:gx+col*d.w,y:gy+row*d.h,w:d.w,h:d.h,frame:d.frame,layer:0,flipX:false,flipY:false,solid:false};
    const v=VIRTUAL_ASSETS[selectedAssetName];
    if(v){a.sourceAsset=v.source;a.crop={x:v.sx,y:v.sy,w:v.sw,h:v.sh}}
    m.assets.push(a);last=a;
  }
  if(last){selected={type:'asset',id:last.id};renderSelectionInspector()}
  saveLocal(false);renderMaps();draw();
}
function addNpcAt(x,y){
  const n={id:uid('npc'),name:'Elf',x:snapV(x),y:snapV(y),speed:24,dialogue:'Hello!\nIt is lovely to see you.',path:[],quest:{enabled:false,title:'A Little Favour',description:'Could you fetch something for me?',itemName:'Quest Item',reward:'Christmas Present',completeText:'You found it! Thank you so much.'}};
  activeMap().npcs.push(n);selectObject('npc',n.id);setMode('select');saveLocal(false)
}
function addQuestAt(x,y){
  const q={id:uid('quest'),label:'Quest Item',x:snapV(x),y:snapV(y),itemName:'Quest Item',asset:'present1.png',collectedText:'You found the quest item!',puzzle:{enabled:false,prompt:'Repeat the sequence to collect the item.',sequence:[1,2,3,4]}};
  activeMap().questTargets.push(q);selectObject('quest',q.id);setMode('select');saveLocal(false)
}
function finishTransition(){
  if(!draftRect)return;
  let {x,y,w,h}=draftRect;if(w<0){x+=w;w=-w}if(h<0){y+=h;h=-h}
  if(w<4||h<4){draftRect=null;draw();return}
  const other=project.maps.find(m=>m.id!==activeMap().id)||activeMap();
  const t={id:uid('link'),label:'Map Link',x:snapV(x),y:snapV(y),w:Math.max(grid(),snapV(w)),h:Math.max(grid(),snapV(h)),targetMapId:other.id,targetX:other.spawn.x,targetY:other.spawn.y};
  activeMap().transitions.push(t);draftRect=null;selectObject('transition',t.id);setMode('select');saveLocal(false)
}

canvas.addEventListener('pointerdown',e=>{
  if(play)return;
  const p=pointerWorld(e);pointerDown=true;
  if(pathEditing&&selected?.type==='npc'){
    const n=getSelected();n.path.push({x:snapV(p.x),y:snapV(p.y)});saveLocal(false);renderSelectionInspector();draw();return;
  }
  if(mode==='place'){addAssetAt(p.x,p.y);return}
  if(mode==='npc'){addNpcAt(p.x,p.y);return}
  if(mode==='quest'){addQuestAt(p.x,p.y);return}
  if(mode==='transition'){draftRect={x:p.x,y:p.y,w:0,h:0};canvas.setPointerCapture(e.pointerId);return}
  if(mode==='select'){
    const hit=hitTest(p);
    if(!hit){selected=null;renderSelectionInspector();draw();return}
    selected=hit;const o=getSelected();renderSelectionInspector();
    if(hit.type==='asset'||hit.type==='transition'){drag={type:hit.type,id:hit.id,ox:p.x-o.x,oy:p.y-o.y}}
    else if(hit.type==='npc'||hit.type==='quest'){drag={type:hit.type,id:hit.id,ox:p.x-o.x,oy:p.y-o.y}}
    canvas.setPointerCapture(e.pointerId);draw();
  }
});
canvas.addEventListener('pointermove',e=>{
  const p=pointerWorld(e);cursorStatus.textContent='X '+Math.round(p.x)+' · Y '+Math.round(p.y);
  if(play)return;
  if(mode==='place'&&pointerDown&&(e.buttons&1)){addAssetAt(p.x,p.y);return}
  if(mode==='transition'&&draftRect&&(e.buttons&1)){draftRect.w=p.x-draftRect.x;draftRect.h=p.y-draftRect.y;draw();return}
  if(drag&&(e.buttons&1)){
    const o=getSelected();if(!o)return;
    o.x=snapV(p.x-drag.ox);o.y=snapV(p.y-drag.oy);
    if(o.x==null)return;renderSelectionInspector(false);draw();
  }
});
canvas.addEventListener('pointerup',()=>{pointerDown=false;lastStampKey='';if(mode==='transition')finishTransition();if(drag){drag=null;saveLocal(false)}});
canvas.addEventListener('pointercancel',()=>{pointerDown=false;drag=null;draftRect=null;lastStampKey=''});
canvas.addEventListener('contextmenu',e=>e.preventDefault());

function drawGrid(m){
  const g=grid();ctx.save();ctx.strokeStyle='rgba(24,49,77,.10)';ctx.lineWidth=1;
  ctx.beginPath();for(let x=0;x<=m.width;x+=g){ctx.moveTo(x+.5,0);ctx.lineTo(x+.5,m.height)}for(let y=0;y<=m.height;y+=g){ctx.moveTo(0,y+.5);ctx.lineTo(m.width,y+.5)}ctx.stroke();ctx.restore();
}
function drawPlacedAsset(a){
  const opt={width:a.w,height:a.h,flipX:a.flipX,flipY:a.flipY};if(a.frame!=null)opt.frame=a.frame;
  drawAsset(ctx,a.asset,a.x,a.y,opt);
  if(selected?.type==='asset'&&selected.id===a.id&&!play){ctx.save();ctx.strokeStyle='#f7bd18';ctx.lineWidth=2;ctx.strokeRect(a.x-1,a.y-1,a.w+2,a.h+2);ctx.restore()}
}
function drawTransition(t){
  if(play)return;
  ctx.save();ctx.fillStyle=selected?.type==='transition'&&selected.id===t.id?'rgba(247,189,24,.28)':'rgba(51,120,205,.18)';ctx.strokeStyle=selected?.type==='transition'&&selected.id===t.id?'#f7bd18':'#3378cd';ctx.lineWidth=2;ctx.fillRect(t.x,t.y,t.w,t.h);ctx.strokeRect(t.x,t.y,t.w,t.h);
  ctx.fillStyle='#0b477e';ctx.font='bold 8px monospace';ctx.fillText(t.label||'MAP LINK',t.x+4,t.y+11);ctx.restore();
}
function drawQuestTarget(q){
  if(play&&play.collected.has(q.id))return;
  const name=q.asset&&catalogNames().includes(q.asset)?q.asset:null;
  if(name){const meta=assetMeta(name),cw=meta.cell?.width||meta.width,ch=meta.cell?.height||meta.height;drawAsset(ctx,name,q.x-cw/2,q.y-ch/2,{frame:meta.cell?0:null,width:cw,height:ch})}
  else{ctx.fillStyle='#f7bd18';ctx.fillRect(q.x-6,q.y-6,12,12)}
  if(!play){ctx.save();ctx.strokeStyle=selected?.type==='quest'&&selected.id===q.id?'#f7bd18':'#c75b20';ctx.lineWidth=2;ctx.strokeRect(q.x-9,q.y-9,18,18);ctx.restore()}
}
function npcFrame(step=0,dir='down'){const base={down:0,up:4,left:8,right:12}[dir]||0;return assets.frame('character.png',base+(step%4),16,16)}
function drawNpcAt(n,x=n.x,y=n.y,step=0,dir='down',selectedNpc=false){
  const f=npcFrame(step,dir);ctx.imageSmoothingEnabled=false;ctx.drawImage(f,Math.round(x-12),Math.round(y-20),24,24);
  if(selectedNpc&&!play){ctx.strokeStyle='#f7bd18';ctx.lineWidth=2;ctx.strokeRect(x-13,y-21,26,26)}
}
function drawNpc(n){
  if(!play&&n.path?.length){ctx.save();ctx.strokeStyle='rgba(44,128,106,.65)';ctx.lineWidth=2;ctx.setLineDash([5,4]);ctx.beginPath();ctx.moveTo(n.x,n.y);for(const p of n.path)ctx.lineTo(p.x,p.y);ctx.stroke();ctx.setLineDash([]);for(const p of n.path){ctx.fillStyle='#2c806a';ctx.fillRect(p.x-3,p.y-3,6,6)}ctx.restore()}
  const run=play?.npcs[n.id];drawNpcAt(n,run?.x??n.x,run?.y??n.y,run?.step??0,run?.dir??'down',selected?.type==='npc'&&selected.id===n.id);
}
function drawSpawn(m){
  if(play)return;ctx.save();ctx.fillStyle='rgba(44,128,106,.25)';ctx.strokeStyle='#2c806a';ctx.lineWidth=2;ctx.beginPath();ctx.arc(m.spawn.x,m.spawn.y,9,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.fillStyle='#185948';ctx.font='bold 8px monospace';ctx.fillText('SPAWN',m.spawn.x+12,m.spawn.y+3);ctx.restore()
}
function drawDraft(){
  if(!draftRect)return;ctx.save();ctx.fillStyle='rgba(51,120,205,.18)';ctx.strokeStyle='#3378cd';ctx.lineWidth=2;ctx.fillRect(draftRect.x,draftRect.y,draftRect.w,draftRect.h);ctx.strokeRect(draftRect.x,draftRect.y,draftRect.w,draftRect.h);ctx.restore()
}
function drawPlayer(now){
  if(!play)return;const moving=play.moving,step=moving?Math.floor((now-play.animStart)/150)%4:0;const f=npcFrame(step,play.dir);ctx.imageSmoothingEnabled=false;ctx.fillStyle='rgba(16,36,29,.25)';ctx.beginPath();ctx.ellipse(play.x,play.y+2,8,3,0,0,Math.PI*2);ctx.fill();ctx.drawImage(f,Math.round(play.x-12),Math.round(play.y-20),24,24);
}
function draw(now=performance.now()){
  if(!assets||!project)return;const m=activeMap();if(canvas.width!==m.width||canvas.height!==m.height)resizeCanvas();
  ctx.clearRect(0,0,m.width,m.height);ctx.fillStyle=m.bg;ctx.fillRect(0,0,m.width,m.height);
  const placed=[...m.assets].sort((a,b)=>(a.layer||0)-(b.layer||0));for(const a of placed)drawPlacedAsset(a);
  if(!play)drawGrid(m);
  for(const t of m.transitions)drawTransition(t);
  for(const q of m.questTargets)drawQuestTarget(q);
  for(const n of m.npcs)drawNpc(n);
  drawSpawn(m);drawDraft();drawPlayer(now);
}
function loop(now){
  const dt=Math.min(.05,(now-lastTime)/1000);lastTime=now;if(play)updatePlay(dt,now);draw(now);requestAnimationFrame(loop)
}

function renderMaps(){
  mapList.innerHTML='';
  for(const m of project.maps){
    const b=document.createElement('button');b.className='mapItem'+(m.id===activeMap().id?' active':'');b.type='button';b.innerHTML='<span><strong>'+esc(m.name)+'</strong><small>'+m.width+'×'+m.height+' · '+m.assets.length+' assets</small></span><span>›</span>';
    b.onclick=()=>{if(play)return;setActiveMap(m.id)};mapList.appendChild(b)
  }
}
function categoryName(id){return project.editor.categories.find(c=>c.id===id)?.name||''}
function assignedCategory(name){return project.editor.assetCategoryByAsset[name]||''}
function setAssetCategory(names,categoryId){
  if(!names.length){
    assetList.innerHTML='<div class="inspectorEmpty" style="grid-column:1/-1">No assets match this category/search. Choose <strong>All</strong> or clear the search box.</div>';
    return;
  }
  for(const name of names){if(categoryId)project.editor.assetCategoryByAsset[name]=categoryId;else delete project.editor.assetCategoryByAsset[name]}
  saveLocal(false);renderCategories();renderAssets(assetSearch.value)
}
function renderCategories(){
  categoryList.innerHTML='';
  const names=catalogNames();
  const specs=[
    {id:'all',baseName:'All',count:names.length,system:true},
    {id:'uncategorised',baseName:'Uncategorised',count:names.filter(name=>!assignedCategory(name)).length,system:true},
    ...project.editor.categories.map(cat=>({
      id:cat.id,
      baseName:cat.name,
      count:names.filter(name=>assignedCategory(name)===cat.id).length,
      source:cat,
      system:false
    }))
  ];
  for(const spec of specs){
    const b=document.createElement('button');
    b.type='button';
    b.className='categoryChip'+(categoryFilter===spec.id?' active':'');
    b.textContent=spec.baseName+' ('+spec.count+')';
    b.dataset.category=spec.id;
    b.onclick=()=>{categoryFilter=spec.id;renderCategories();renderAssets(assetSearch.value)};
    b.ondragover=e=>{if(spec.id==='all')return;e.preventDefault();b.classList.add('dragOver')};
    b.ondragleave=()=>b.classList.remove('dragOver');
    b.ondrop=e=>{
      if(spec.id==='all')return;
      e.preventDefault();b.classList.remove('dragOver');
      const name=e.dataTransfer.getData('text/asset-name');
      if(name)setAssetCategory([name],spec.id==='uncategorised'?'':spec.id)
    };
    if(!spec.system){
      b.title='Click to filter · double-click to rename · right-click to delete';
      b.ondblclick=e=>{
        e.preventDefault();
        const next=prompt('Rename category',spec.source.name);
        if(next?.trim()){
          spec.source.name=next.trim();
          saveLocal(false);renderCategories();renderAssets(assetSearch.value)
        }
      };
      b.oncontextmenu=e=>{
        e.preventDefault();
        if(!confirm('Delete category "'+spec.source.name+'"? Assets will become uncategorised.'))return;
        project.editor.categories=project.editor.categories.filter(x=>x.id!==spec.id);
        for(const [name,id] of Object.entries(project.editor.assetCategoryByAsset))if(id===spec.id)delete project.editor.assetCategoryByAsset[name];
        if(categoryFilter===spec.id)categoryFilter='all';
        saveLocal(false);renderCategories();renderAssets(assetSearch.value)
      }
    }
    categoryList.appendChild(b)
  }
  bulkCategorySelect.innerHTML='<option value="">Uncategorised</option>'+project.editor.categories.map(c=>'<option value="'+c.id+'">'+esc(c.name)+'</option>').join('');
  updateBulkCategoryBar()
}
function updateBulkCategoryBar(){
  bulkCategoryBar.hidden=!organiseMode;assetSelectionCount.textContent=organisedSelection.size+' selected';
  assetList.classList.toggle('organising',organiseMode);$('#organiseAssets').classList.toggle('active',organiseMode)
}
function assetMatchesCategory(name){
  const assigned=assignedCategory(name);
  if(categoryFilter==='all')return true;
  if(categoryFilter==='uncategorised')return !assigned;
  return assigned===categoryFilter
}
function renderAssets(filter=''){
  assetList.innerHTML='';
  const q=filter.trim().toLowerCase();
  const names=catalogNames().filter(n=>(!q||assetLabel(n).toLowerCase().includes(q)||n.toLowerCase().includes(q))&&assetMatchesCategory(n));

  if(!names.length){
    assetList.innerHTML='<div class="inspectorEmpty" style="grid-column:1/-1">No assets match this category/search. Choose <strong>All</strong> or clear the search box.</div>';
    return;
  }

  let rendered=0;
  for(const name of names){
    try{
      const b=document.createElement('button');
      b.type='button';b.draggable=true;
      b.className='assetCard'+(name===selectedAssetName?' active':'')+(organisedSelection.has(name)?' multiSelected':'');

      const thumb=document.createElement('span');thumb.className='assetThumb';
      const c=document.createElement('canvas'),src=assetPreview(name);
      c.width=src.width;c.height=src.height;c.getContext('2d').drawImage(src,0,0);thumb.appendChild(c);

      const check=document.createElement('i');check.className='assetCheck';check.textContent=organisedSelection.has(name)?'✓':'';
      const label=document.createElement('span');label.textContent=assetLabel(name);
      const category=categoryName(assignedCategory(name));
      if(category){const badge=document.createElement('span');badge.className='assetCategoryLabel';badge.textContent=category;b.appendChild(badge)}

      b.append(thumb,label,check);
      b.ondragstart=e=>{e.dataTransfer.setData('text/asset-name',name);e.dataTransfer.effectAllowed='move';b.classList.add('dragging')};
      b.ondragend=()=>b.classList.remove('dragging');
      b.onclick=()=>{
        if(organiseMode){
          organisedSelection.has(name)?organisedSelection.delete(name):organisedSelection.add(name);
          renderAssets(assetSearch.value);updateBulkCategoryBar();return
        }
        selectedAssetName=name;renderAssets(assetSearch.value);setMode('place')
      };
      assetList.appendChild(b);rendered++;
    }catch(error){
      console.error('World Builder preview failed for',name,error);
      const b=document.createElement('button');b.type='button';b.className='assetCard assetPreviewError';
      b.innerHTML='<span class="assetThumb">!</span><span>'+esc(assetLabel(name))+'</span>';
      b.title='Preview failed, but the rest of the palette remains available.';
      assetList.appendChild(b);
    }
  }
  if(!rendered&&assetList.children.length===0){
    assetList.innerHTML='<div class="inspectorEmpty" style="grid-column:1/-1">Assets failed to render. Reload the builder.</div>';
  }
}
function input(label,id,value,type='text',extra=''){return '<label'+(extra.includes('full')?' class="full"':'')+'><span>'+label+'</span><input id="'+id+'" type="'+type+'" value="'+esc(value)+'"></label>'}
function renderMapInspector(){
  const m=activeMap();$('#mapInspectorTitle').textContent=m.name;
  mapInspector.innerHTML=
   input('Name','mapName',m.name,'text','full')+
   input('Width','mapWidth',m.width,'number')+input('Height','mapHeight',m.height,'number')+
   input('Background','mapBg',m.bg,'color')+input('Spawn X','spawnX',m.spawn.x,'number')+
   input('Spawn Y','spawnY',m.spawn.y,'number')+
   '<div class="inspectorActions"><button id="duplicateMap" type="button">DUPLICATE MAP</button><button id="deleteMap" type="button">DELETE MAP</button></div>';
  $('#mapName').onchange=e=>{m.name=e.target.value||'Map';saveLocal(false);renderMaps();renderMapInspector();draw()};
  $('#mapWidth').onchange=e=>{m.width=Math.max(160,Number(e.target.value)||640);m.spawn.x=clamp(m.spawn.x,0,m.width);saveLocal(false);resizeCanvas();renderMaps();draw()};
  $('#mapHeight').onchange=e=>{m.height=Math.max(120,Number(e.target.value)||480);m.spawn.y=clamp(m.spawn.y,0,m.height);saveLocal(false);resizeCanvas();renderMaps();draw()};
  $('#mapBg').oninput=e=>{m.bg=e.target.value;saveLocal(false);draw()};
  $('#spawnX').onchange=e=>{m.spawn.x=snapV(Number(e.target.value)||0);saveLocal(false);draw()};
  $('#spawnY').onchange=e=>{m.spawn.y=snapV(Number(e.target.value)||0);saveLocal(false);draw()};
  $('#duplicateMap').onclick=duplicateMap;$('#deleteMap').onclick=deleteMap;
}
function mapOptions(selectedId){return project.maps.map(m=>'<option value="'+m.id+'" '+(m.id===selectedId?'selected':'')+'>'+esc(m.name)+'</option>').join('')}
function assetOptions(selectedName){return '<option value="">Marker only</option>'+catalogNames().map(n=>'<option value="'+n+'" '+(n===selectedName?'selected':'')+'>'+esc(assetLabel(n))+'</option>').join('')}
function bindNumber(id,obj,key,after=draw){const el=$('#'+id);if(el)el.onchange=e=>{obj[key]=Number(e.target.value)||0;saveLocal(false);after()}}
function renderSelectionInspector(updateTitle=true){
  const o=getSelected();deleteSelected.disabled=!o;
  if(!o){if(updateTitle)selectionTitle.textContent='Nothing selected';selectionInspector.className='inspectorEmpty';selectionInspector.innerHTML='Select an asset, map link, NPC or quest item.';return}
  selectionInspector.className='inspectorForm';
  if(selected.type==='asset'){
    if(updateTitle)selectionTitle.textContent=assetLabel(o.asset);
    const count=frameCount(o.asset);
    selectionInspector.innerHTML=
      input('X','selX',o.x,'number')+input('Y','selY',o.y,'number')+input('Width','selW',o.w,'number')+input('Height','selH',o.h,'number')+
      (count>1?input('Frame','selFrame',o.frame??0,'number'):'')+input('Layer','selLayer',o.layer||0,'number')+
      '<div class="inlineChecks"><label><input id="selFlipX" type="checkbox" '+(o.flipX?'checked':'')+'> Flip X</label><label><input id="selFlipY" type="checkbox" '+(o.flipY?'checked':'')+'> Flip Y</label><label><input id="selSolid" type="checkbox" '+(o.solid?'checked':'')+'> Solid collision</label></div>'+
      '<div class="inspectorActions"><button id="dupSelected" type="button">DUPLICATE</button><button id="layerUp" type="button">LAYER +</button><button id="layerDown" type="button">LAYER −</button></div>';
    bindNumber('selX',o,'x');bindNumber('selY',o,'y');bindNumber('selW',o,'w');bindNumber('selH',o,'h');if($('#selFrame'))$('#selFrame').onchange=e=>{o.frame=clamp(Number(e.target.value)||0,0,count-1);saveLocal(false);draw()};bindNumber('selLayer',o,'layer');
    $('#selFlipX').onchange=e=>{o.flipX=e.target.checked;saveLocal(false);draw()};$('#selFlipY').onchange=e=>{o.flipY=e.target.checked;saveLocal(false);draw()};$('#selSolid').onchange=e=>{o.solid=e.target.checked;saveLocal(false);draw()};
    $('#dupSelected').onclick=duplicateSelected;$('#layerUp').onclick=()=>{o.layer=(o.layer||0)+1;saveLocal(false);renderSelectionInspector();draw()};$('#layerDown').onclick=()=>{o.layer=(o.layer||0)-1;saveLocal(false);renderSelectionInspector();draw()};
  } else if(selected.type==='transition'){
    if(updateTitle)selectionTitle.textContent=o.label||'Map Link';
    selectionInspector.innerHTML=
      input('Label','linkLabel',o.label||'Map Link','text','full')+input('X','selX',o.x,'number')+input('Y','selY',o.y,'number')+input('Width','selW',o.w,'number')+input('Height','selH',o.h,'number')+
      '<label class="full"><span>Loads map</span><select id="linkTarget">'+mapOptions(o.targetMapId)+'</select></label>'+input('Arrival X','linkTargetX',o.targetX,'number')+input('Arrival Y','linkTargetY',o.targetY,'number');
    $('#linkLabel').onchange=e=>{o.label=e.target.value;saveLocal(false);renderSelectionInspector();draw()};bindNumber('selX',o,'x');bindNumber('selY',o,'y');bindNumber('selW',o,'w');bindNumber('selH',o,'h');
    $('#linkTarget').onchange=e=>{o.targetMapId=e.target.value;const m=mapById(o.targetMapId);o.targetX=m.spawn.x;o.targetY=m.spawn.y;saveLocal(false);renderSelectionInspector();draw()};bindNumber('linkTargetX',o,'targetX');bindNumber('linkTargetY',o,'targetY');
  } else if(selected.type==='npc'){
    if(updateTitle)selectionTitle.textContent=o.name;
    const q=o.quest||{};
    selectionInspector.innerHTML=
      input('Name','npcName',o.name,'text','full')+input('X','selX',o.x,'number')+input('Y','selY',o.y,'number')+input('Walk speed','npcSpeed',o.speed||24,'number')+
      '<label class="full"><span>Interaction text (each line becomes a dialogue step)</span><textarea id="npcDialogue">'+esc(o.dialogue||'')+'</textarea></label>'+
      '<div class="inspectorActions"><button id="editPath" type="button" class="'+(pathEditing?'active':'')+'">'+(pathEditing?'FINISH PATH':'EDIT PATH')+'</button><button id="clearPath" type="button">CLEAR PATH ('+(o.path?.length||0)+')</button></div>'+
      '<div class="inlineChecks"><label><input id="questEnabled" type="checkbox" '+(q.enabled?'checked':'')+'> Gives a fetch quest</label></div>'+
      '<label class="full"><span>Quest title</span><input id="questTitle" value="'+esc(q.title||'')+'"></label>'+
      '<label class="full"><span>Quest description</span><textarea id="questDescription">'+esc(q.description||'')+'</textarea></label>'+
      input('Required item name','questItem',q.itemName||'','text','full')+input('Reward','questReward',q.reward||'Christmas Present','text','full')+
      '<label class="full"><span>Completion dialogue</span><textarea id="questComplete">'+esc(q.completeText||'')+'</textarea></label>';
    $('#npcName').onchange=e=>{o.name=e.target.value||'Elf';saveLocal(false);renderSelectionInspector();draw()};bindNumber('selX',o,'x');bindNumber('selY',o,'y');bindNumber('npcSpeed',o,'speed');
    $('#npcDialogue').onchange=e=>{o.dialogue=e.target.value;saveLocal(false)};$('#editPath').onclick=()=>{const wasEditing=pathEditing;setMode('select');pathEditing=!wasEditing;renderSelectionInspector();updateModeStatus();draw()};$('#clearPath').onclick=()=>{o.path=[];saveLocal(false);renderSelectionInspector();draw()};
    $('#questEnabled').onchange=e=>{o.quest.enabled=e.target.checked;saveLocal(false)};$('#questTitle').onchange=e=>{o.quest.title=e.target.value;saveLocal(false)};$('#questDescription').onchange=e=>{o.quest.description=e.target.value;saveLocal(false)};$('#questItem').onchange=e=>{o.quest.itemName=e.target.value;saveLocal(false)};$('#questReward').onchange=e=>{o.quest.reward=e.target.value;saveLocal(false)};$('#questComplete').onchange=e=>{o.quest.completeText=e.target.value;saveLocal(false)};
  } else {
    if(updateTitle)selectionTitle.textContent=o.label||'Quest Item';
    const seq=(o.puzzle?.sequence||[1,2,3,4]).join(',');
    selectionInspector.innerHTML=
      input('Label','questLabel',o.label,'text','full')+input('X','selX',o.x,'number')+input('Y','selY',o.y,'number')+
      input('Item name','targetItem',o.itemName,'text','full')+
      '<label class="full"><span>Visual asset</span><select id="targetAsset">'+assetOptions(o.asset)+'</select></label>'+
      '<label class="full"><span>Collected text</span><textarea id="targetCollected">'+esc(o.collectedText||'')+'</textarea></label>'+
      '<div class="inlineChecks"><label><input id="puzzleEnabled" type="checkbox" '+(o.puzzle?.enabled?'checked':'')+'> Requires simple sequence puzzle</label></div>'+
      '<label class="full"><span>Puzzle prompt</span><textarea id="targetPuzzlePrompt">'+esc(o.puzzle?.prompt||'')+'</textarea></label>'+
      input('Sequence e.g. 2,4,1,3','targetSequence',seq,'text','full');
    $('#questLabel').onchange=e=>{o.label=e.target.value;saveLocal(false);renderSelectionInspector();draw()};bindNumber('selX',o,'x');bindNumber('selY',o,'y');$('#targetItem').onchange=e=>{o.itemName=e.target.value;saveLocal(false)};$('#targetAsset').onchange=e=>{o.asset=e.target.value||null;saveLocal(false);draw()};$('#targetCollected').onchange=e=>{o.collectedText=e.target.value;saveLocal(false)};
    $('#puzzleEnabled').onchange=e=>{o.puzzle.enabled=e.target.checked;saveLocal(false)};$('#targetPuzzlePrompt').onchange=e=>{o.puzzle.prompt=e.target.value;saveLocal(false)};$('#targetSequence').onchange=e=>{o.puzzle.sequence=e.target.value.split(',').map(v=>clamp(Number(v.trim())||1,1,4)).filter(Boolean);saveLocal(false)};
  }
}
function renderAllPanels(){renderMaps();renderMapInspector();renderSelectionInspector();}

function duplicateSelected(){
  const o=getSelected();if(!o)return;const copy=JSON.parse(JSON.stringify(o));copy.id=uid(selected.type);copy.x+=grid();copy.y+=grid();
  const m=activeMap(),arr=selected.type==='asset'?m.assets:selected.type==='transition'?m.transitions:selected.type==='npc'?m.npcs:m.questTargets;arr.push(copy);selectObject(selected.type,copy.id);saveLocal(false)
}
function deleteSelection(){
  if(!selected)return;const m=activeMap(),key=selected.type==='asset'?'assets':selected.type==='transition'?'transitions':selected.type==='npc'?'npcs':'questTargets';m[key]=m[key].filter(o=>o.id!==selected.id);selected=null;pathEditing=false;saveLocal(false);renderSelectionInspector();renderMaps();draw()
}
deleteSelected.onclick=deleteSelection;
function duplicateMap(){
  const source=activeMap(),copy=JSON.parse(JSON.stringify(source));copy.id=uid('map');copy.name=source.name+' Copy';
  for(const key of ['assets','transitions','npcs','questTargets'])for(const o of copy[key])o.id=uid(key.slice(0,-1));
  project.maps.push(copy);project.activeMapId=copy.id;selected=null;saveLocal(false);resizeCanvas();renderAllPanels();draw()
}
function deleteMap(){
  if(project.maps.length<=1){flashStatus('A project needs at least one map.');return}
  const id=activeMap().id;if(!confirm('Delete "'+activeMap().name+'" and everything placed on it?'))return;
  project.maps=project.maps.filter(m=>m.id!==id);project.activeMapId=project.maps[0].id;
  for(const m of project.maps)for(const t of m.transitions)if(t.targetMapId===id){t.targetMapId=project.maps[0].id;t.targetX=project.maps[0].spawn.x;t.targetY=project.maps[0].spawn.y}
  selected=null;saveLocal(false);resizeCanvas();renderAllPanels();draw()
}
$('#addMap').onclick=()=>{const m=freshMap('Map '+(project.maps.length+1));project.maps.push(m);project.activeMapId=m.id;selected=null;saveLocal(false);resizeCanvas();renderAllPanels();draw()};

assetSearch.oninput=e=>renderAssets(e.target.value);
zoomSelect.onchange=()=>{resizeCanvas();draw()};
gridSizeInput.onchange=()=>draw();
brushWidthInput.onchange=()=>{project.editor.brush.w=brushCols();brushWidthInput.value=project.editor.brush.w;saveLocal(false);updateModeStatus()};
brushHeightInput.onchange=()=>{project.editor.brush.h=brushRows();brushHeightInput.value=project.editor.brush.h;saveLocal(false);updateModeStatus()};
snapToggle.onclick=()=>{snap=!snap;snapToggle.classList.toggle('active',snap);snapToggle.textContent=snap?'SNAP':'FREE'};
$('#addCategory').onclick=()=>{const name=prompt('Category name');if(!name?.trim())return;const c={id:uid('cat'),name:name.trim()};project.editor.categories.push(c);categoryFilter=c.id;project.editor.activeCategory=c.id;saveLocal(false);renderCategories();renderAssets(assetSearch.value)};
$('#organiseAssets').onclick=()=>{organiseMode=!organiseMode;if(!organiseMode)organisedSelection.clear();updateBulkCategoryBar();renderAssets(assetSearch.value)};
$('#assignCategory').onclick=()=>{if(!organisedSelection.size){flashStatus('Select one or more assets first.');return}setAssetCategory([...organisedSelection],bulkCategorySelect.value);organisedSelection.clear();renderAssets(assetSearch.value);updateBulkCategoryBar()};
$('#clearAssetSelection').onclick=()=>{organisedSelection.clear();renderAssets(assetSearch.value);updateBulkCategoryBar()};
$('.modeBtn[data-mode]').forEach(b=>b.onclick=()=>setMode(b.dataset.mode));

function download(name,text,type='text/javascript'){
  const blob=new Blob([text],{type}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),500)
}
$('#saveProject').onclick=()=>saveLocal(true);
$('#backupProject').onclick=()=>{
  saveLocal(true);
  const filename=(project.name||'world-project').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')+'.world-backup.json';
  download(filename,JSON.stringify(project,null,2),'application/json');flashStatus('Downloaded editable backup: '+filename)
};
$('#exportProject').onclick=()=>{
  saveLocal(false);
  const payload=JSON.parse(JSON.stringify(project));
  payload.assetAliases=Object.fromEntries(Object.entries(VIRTUAL_ASSETS).map(([id,v])=>[id,{source:v.source,crop:{x:v.sx,y:v.sy,w:v.sw,h:v.sh},label:v.label}]));
  const clean=JSON.stringify(payload,null,2);
  const code='/* Chip In World Builder export\n   Give this file to ChatGPT to turn the layout into the finished interactive game. */\nwindow.CHIPIN_WORLD_PROJECT = '+clean+';\n';
  const filename=(project.name||'world-project').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')+'.world.js';
  download(filename,code);flashStatus('Exported '+filename);
};
$('#importProject').onclick=()=>$('#importFile').click();
$('#importFile').onchange=async e=>{
  const file=e.target.files?.[0];if(!file)return;
  try{const text=await file.text();let raw=text.trim();if(!raw.startsWith('{')){const a=raw.indexOf('{'),b=raw.lastIndexOf('}');if(a<0||b<a)throw new Error('No project object found.');raw=raw.slice(a,b+1)}
    project=normaliseProject(JSON.parse(raw));selected=null;play=null;organisedSelection.clear();categoryFilter='all';brushWidthInput.value=project.editor.brush.w;brushHeightInput.value=project.editor.brush.h;saveLocal(false);resizeCanvas();renderCategories();renderAssets(assetSearch.value);renderAllPanels();draw();flashStatus('Imported '+file.name)
  }catch(err){alert('Could not import project: '+err.message)}finally{e.target.value=''}
};

function collisionAt(m,x,y,r=7){
  if(x<r||y<r||x>m.width-r||y>m.height-r)return true;
  for(const a of m.assets){if(!a.solid)continue;if(x+r>a.x&&x-r<a.x+a.w&&y+r>a.y&&y-r<a.y+a.h)return true}
  return false;
}
function setupPlayNpcs(){
  play.npcs={};
  for(const m of project.maps)for(const n of m.npcs)play.npcs[n.id]={x:n.x,y:n.y,dir:'down',step:0,pathIndex:0,forward:true};
}
function startPlaytest(){
  editorMapBeforePlay=project.activeMapId;selected=null;pathEditing=false;const m=activeMap();
  play={mapId:m.id,x:m.spawn.x,y:m.spawn.y,dir:'down',moving:false,animStart:performance.now(),inventory:[],quests:{},collected:new Set(),npcs:{},transitionCooldown:0,rewards:[]};setupPlayNpcs();
  mode='play';playHud.hidden=false;$('#playtestBtn').classList.add('active');playMapName.textContent=m.name;resizeCanvas();renderMaps();renderSelectionInspector();updateModeStatus();centerPlayView();draw()
}
function stopPlaytest(){
  if(!play)return;play=null;project.activeMapId=editorMapBeforePlay||project.maps[0].id;editorMapBeforePlay=null;mode='select';playHud.hidden=true;$('#playtestBtn').classList.remove('active');$$('.modeBtn[data-mode]').forEach(b=>b.classList.toggle('active',b.dataset.mode==='select'));resizeCanvas();renderAllPanels();updateModeStatus();draw()
}
$('#playtestBtn').onclick=()=>play?stopPlaytest():startPlaytest();$('#stopPlaytest').onclick=stopPlaytest;

function switchPlayMap(t){
  const target=mapById(t.targetMapId);if(!target)return;
  play.mapId=target.id;play.x=Number(t.targetX)||target.spawn.x;play.y=Number(t.targetY)||target.spawn.y;play.transitionCooldown=.55;playMapName.textContent=target.name;resizeCanvas();renderMaps();centerPlayView();flashStatus('Loaded '+target.name)
}
function centerPlayView(){
  if(!play)return;const px=play.x*zoom,py=play.y*zoom;scroller.scrollLeft=Math.max(0,px-scroller.clientWidth/2);scroller.scrollTop=Math.max(0,py-scroller.clientHeight/2)
}
function updatePlayNpc(n,dt,now){
  const r=play.npcs[n.id];if(!r||!n.path.length)return;
  const target=n.path[r.pathIndex]||n.path[0],dx=target.x-r.x,dy=target.y-r.y,d=Math.hypot(dx,dy);
  if(d<2){if(n.path.length===1)return;if(r.forward){if(r.pathIndex>=n.path.length-1){r.forward=false;r.pathIndex--}else r.pathIndex++}else{if(r.pathIndex<=0){r.forward=true;r.pathIndex++}else r.pathIndex--}return}
  const sp=(Number(n.speed)||24)*dt;r.x+=dx/d*sp;r.y+=dy/d*sp;r.dir=Math.abs(dx)>Math.abs(dy)?(dx<0?'left':'right'):(dy<0?'up':'down');r.step=Math.floor(now/180)%4;
}
function updatePlay(dt,now){
  if(dialogState||puzzleState)return;
  const m=activeMap();let dx=0,dy=0;
  if(keys.has('arrowleft')||keys.has('a'))dx--;if(keys.has('arrowright')||keys.has('d'))dx++;if(keys.has('arrowup')||keys.has('w'))dy--;if(keys.has('arrowdown')||keys.has('s'))dy++;
  const mag=Math.hypot(dx,dy);if(mag>.1){dx/=mag;dy/=mag;const sp=72;const nx=play.x+dx*sp*dt,ny=play.y+dy*sp*dt;if(!collisionAt(m,nx,play.y))play.x=nx;if(!collisionAt(m,play.x,ny))play.y=ny;const dir=Math.abs(dx)>Math.abs(dy)?(dx<0?'left':'right'):(dy<0?'up':'down');if(!play.moving||dir!==play.dir){play.dir=dir;play.animStart=now}play.moving=true}else{if(play.moving)play.animStart=now;play.moving=false}
  for(const n of m.npcs)updatePlayNpc(n,dt,now);
  if(play.transitionCooldown>0)play.transitionCooldown-=dt;
  if(play.transitionCooldown<=0){for(const t of m.transitions)if(play.x>=t.x&&play.x<=t.x+t.w&&play.y>=t.y&&play.y<=t.y+t.h){switchPlayMap(t);break}}
  centerPlayView();
  const interaction=nearestInteraction();
  if(interaction){
    modeStatus.textContent=interaction.type==='npc'?'SPACE / ENTER: talk to '+interaction.obj.name:'SPACE / ENTER: '+(interaction.obj.label||'collect item');
  }else{
    updateModeStatus();
  }
}
function nearestInteraction(){
  if(!play)return null;const m=activeMap();let best=null,bd=Infinity;
  for(const n of m.npcs){const r=play.npcs[n.id],d=Math.hypot(play.x-(r?.x??n.x),play.y-(r?.y??n.y));if(d<30&&d<bd){best={type:'npc',obj:n};bd=d}}
  for(const q of m.questTargets){if(play.collected.has(q.id))continue;const d=Math.hypot(play.x-q.x,play.y-q.y);if(d<25&&d<bd){best={type:'quest',obj:q};bd=d}}
  return best
}
function interactPlay(){const hit=nearestInteraction();if(!hit){flashStatus('Nothing nearby to interact with.');return}hit.type==='npc'?playTalk(hit.obj):playCollect(hit.obj)}
function lines(text){return String(text||'').split(/\n+/).map(s=>s.trim()).filter(Boolean)}
function openDialog(speaker,heading,steps,onDone=null){
  dialogState={speaker,heading,steps:[...steps],onDone};dialogOverlay.hidden=false;dialogSpeaker.textContent=speaker;dialogHeading.textContent=heading;advanceDialog()
}
function advanceDialog(){
  if(!dialogState)return;
  if(dialogState.steps.length){dialogBody.textContent=dialogState.steps.shift();dialogContinue.textContent=dialogState.steps.length?'CONTINUE':'CLOSE'}
  else{const done=dialogState.onDone;dialogState=null;dialogOverlay.hidden=true;if(done)done()}
}
dialogContinue.onclick=advanceDialog;
function playTalk(n){
  const q=n.quest||{},status=play.quests[n.id]||'none',base=lines(n.dialogue);
  if(!q.enabled){openDialog(n.name,n.name,base.length?base:['Hello!']);return}
  if(status==='none'){
    const steps=[...base];if(q.description)steps.push(q.description);steps.push('Quest: '+(q.title||'A Little Favour'));
    openDialog(n.name,q.title||n.name,steps,()=>{play.quests[n.id]='active';flashStatus('Quest accepted: '+(q.title||'Quest'))});return
  }
  if(status==='active'&&play.inventory.includes(q.itemName)){
    const steps=lines(q.completeText);if(q.reward)steps.push('Reward: '+q.reward);
    openDialog(n.name,q.title||n.name,steps.length?steps:['Thank you!'],()=>{play.inventory=play.inventory.filter(x=>x!==q.itemName);play.quests[n.id]='complete';if(q.reward)play.rewards.push(q.reward);flashStatus('Quest complete: '+(q.title||'Quest'))});return
  }
  if(status==='active'){openDialog(n.name,q.title||n.name,[q.description||('Please bring me '+q.itemName+'.')]);return}
  openDialog(n.name,n.name,['Thanks again for your help!'])
}
function questNeedsItem(item){return activeMap().npcs.some(n=>n.quest?.enabled&&n.quest.itemName===item&&play.quests[n.id]==='active')||project.maps.some(m=>m.npcs.some(n=>n.quest?.enabled&&n.quest.itemName===item&&play.quests[n.id]==='active'))}
function collectTarget(q){if(!play.inventory.includes(q.itemName))play.inventory.push(q.itemName);play.collected.add(q.id);flashStatus(q.collectedText||('Collected '+q.itemName));draw()}
function playCollect(q){
  if(!questNeedsItem(q.itemName)){openDialog('World Builder',q.label||'Quest Item',['This item is here, but no active quest currently asks for "'+q.itemName+'".']);return}
  if(q.puzzle?.enabled){openPuzzle(q,()=>collectTarget(q))}else collectTarget(q)
}
function openPuzzle(q,onSolve){
  const seq=(q.puzzle.sequence?.length?q.puzzle.sequence:[1,2,3,4]).map(n=>clamp(Number(n)||1,1,4));
  puzzleState={sequence:seq,index:0,onSolve};puzzleOverlay.hidden=false;puzzleHeading.textContent=q.label||'Puzzle';puzzlePrompt.textContent=q.puzzle.prompt||'Repeat the sequence.';renderPuzzle();
  puzzlePad.innerHTML='';for(let i=1;i<=4;i++){const b=document.createElement('button');b.textContent=i;b.onclick=()=>pressPuzzle(i);puzzlePad.appendChild(b)}
}
function renderPuzzle(){puzzleSequence.textContent=puzzleState.sequence.map((n,i)=>i<puzzleState.index?'✓':n).join(' · ')}
function pressPuzzle(n){
  if(!puzzleState)return;if(n===puzzleState.sequence[puzzleState.index]){puzzleState.index++;renderPuzzle();if(puzzleState.index>=puzzleState.sequence.length){const done=puzzleState.onSolve;puzzleState=null;puzzleOverlay.hidden=true;done()}}else{puzzleState.index=0;renderPuzzle();flashStatus('Wrong sequence — try again.')}
}
$('#puzzleClose').onclick=()=>{puzzleState=null;puzzleOverlay.hidden=true};

addEventListener('keydown',e=>{
  const tag=e.target?.tagName?.toLowerCase();if(['input','textarea','select'].includes(tag))return;
  const k=e.key.toLowerCase();
  if(play){
    if(['arrowup','arrowdown','arrowleft','arrowright',' ','enter'].includes(k))e.preventDefault();keys.add(k);
    if((k===' '||k==='enter')&&!dialogState&&!puzzleState)interactPlay();if(k==='escape')stopPlaytest();return
  }
  if(k==='delete'||k==='backspace'){if(selected){e.preventDefault();deleteSelection()}}
  if((e.metaKey||e.ctrlKey)&&k==='d'){if(selected){e.preventDefault();duplicateSelected()}}
  if(selected&&['arrowup','arrowdown','arrowleft','arrowright'].includes(k)){
    e.preventDefault();const o=getSelected(),d=e.shiftKey?grid():1;if(k==='arrowleft')o.x-=d;if(k==='arrowright')o.x+=d;if(k==='arrowup')o.y-=d;if(k==='arrowdown')o.y+=d;saveLocal(false);renderSelectionInspector(false);draw()
  }
});
addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));

addEventListener('beforeunload',()=>{if(project)saveLocal(false)});

Promise.allSettled([
  VillagePixelAssets.ready,
  window.WorldBuilderExtraAssets?.ready || Promise.resolve(null)
]).then(results=>{
  if(results[0].status!=='fulfilled')throw results[0].reason;
  assets=results[0].value;
  extraAssets=results[1].status==='fulfilled'?results[1].value:null;
  if(results[1].status==='rejected')console.error('Time Fantasy asset pack failed to load:',results[1].reason);

  project=loadLocal();categoryFilter='all';
  brushWidthInput.value=project.editor.brush.w;brushHeightInput.value=project.editor.brush.h;
  resizeCanvas();renderCategories();renderAssets();renderAllPanels();updateModeStatus();
  flashStatus('Loaded '+catalogNames().length+' assets.');
  requestAnimationFrame(loop)
}).catch(err=>{
  console.error(err);
  modeStatus.textContent='Could not load the World Builder asset palette: '+err.message
});
})();