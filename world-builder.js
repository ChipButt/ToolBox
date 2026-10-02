(() => {
'use strict';

const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const canvas=$('#worldCanvas'),ctx=canvas.getContext('2d'),scroller=$('#canvasScroller'),sizer=$('#canvasSizer');
const mapList=$('#mapList'),assetList=$('#assetList'),assetSearch=$('#assetSearch');
const categoryList=$('#categoryList'),bulkCategoryBar=$('#bulkCategoryBar'),bulkCategorySelect=$('#bulkCategorySelect'),assetSelectionCount=$('#assetSelectionCount');
const mapInspector=$('#mapInspector'),selectionInspector=$('#selectionInspector'),selectionTitle=$('#selectionTitle'),deleteSelected=$('#deleteSelected');
const modeStatus=$('#modeStatus'),cursorStatus=$('#cursorStatus'),zoomSelect=$('#zoomSelect'),gridSizeInput=$('#gridSize'),snapToggle=$('#snapToggle');
const brushWidthInput=$('#brushWidth'),brushHeightInput=$('#brushHeight');
const undoProjectBtn=$('#undoProject'),redoProjectBtn=$('#redoProject');
const playHud=$('#playHud'),playMapName=$('#playMapName'),mobilePlayControls=$('#mobilePlayControls'),mobileInteract=$('#mobileInteract');
const dialogOverlay=$('#dialogOverlay'),dialogSpeaker=$('#dialogSpeaker'),dialogHeading=$('#dialogHeading'),dialogBody=$('#dialogBody'),dialogContinue=$('#dialogContinue');
const puzzleOverlay=$('#puzzleOverlay'),puzzleHeading=$('#puzzleHeading'),puzzlePrompt=$('#puzzlePrompt'),puzzleSequence=$('#puzzleSequence'),puzzlePad=$('#puzzlePad');

const STORE='chipin-world-builder-v1';
const RECOVERY_STORE='chipin-world-builder-recovery-v1';
const HISTORY_STORE='chipin-world-builder-history-v1';
const SCHEMA_VERSION=6;

const VIRTUAL_ASSETS={
  'couch-horizontal':{label:'Couch — Horizontal',source:'couch.png',sx:0,sy:0,sw:32,sh:16},
  'couch-vertical':{label:'Couch — Vertical',source:'couch.png',sx:32,sy:0,sw:16,sh:32},
  'fence-horizontal':{label:'Fence — Horizontal',source:'fence.png',sx:0,sy:0,sw:32,sh:16},
  'fence-vertical':{label:'Fence — Vertical',source:'fence.png',sx:32,sy:0,sw:16,sh:32},
  'fence-shadow-horizontal':{label:'Fence Shadow — Horizontal',source:'fence-shadow.png',sx:0,sy:0,sw:32,sh:16},
  'fence-shadow-vertical':{label:'Fence Shadow — Vertical',source:'fence-shadow.png',sx:32,sy:0,sw:16,sh:32}
};
const HIDDEN_COMBINED_ASSETS=new Set(['couch.png','fence.png','fence-shadow.png']);

const BASE_ASSET_NAMES=[
  'bench.png','chair.png','character.png','christmas-lights.png',
  'couch-horizontal','couch-vertical','exit.png',
  'fence-horizontal','fence-vertical','fence-shadow-horizontal','fence-shadow-vertical',
  'fireplace.png','floor-tile.png','floor-tileset.png','hot-chocolate.png',
  'house1.png','house2.png','lamp-post.png','main-tree.png','old-christmas-palette.png',
  'parchment-menu.png','path-tilemap.png','present1.png','present2.png','present3.png','present4.png',
  'rug.png','sign-popup-background.png','sign-post.png','small-tree.png','snowman1.png',
  'snow-tilemap.png','stocking.png','street-sign-post.png','table.png','wall-tileset.png','wreath.png'
];
const EXTRA_ASSET_NAMES=[
  'TF Igloo Tiles.png','TF Christmas Presents.png','TF Christmas Trees & Gifts.png','TF Christmas Decorations.png',
  'TF Gnome A.png','TF Gnome B.png','TF Reindeer.png','TF Reindeer Child.png','TF Reindeer B.png',
  'TF Rudolph Adult.png','TF Rudolph Adult B.png','TF Rudolph Child.png','TF Jesus.png','TF Mrs Claus.png',
  'TF Santa.png','TF Elf A.png','TF Elf B.png','TF Polar Bear.png','TF Polar Bear Cub.png',
  'TF Snowmen Tiles.png','TF Toy Tiles.png'
];
const DEFAULT_NPC_ASSETS=[
  'character.png','TF Gnome A.png','TF Gnome B.png','TF Reindeer.png','TF Reindeer Child.png','TF Reindeer B.png',
  'TF Rudolph Adult.png','TF Rudolph Adult B.png','TF Rudolph Child.png','TF Jesus.png','TF Mrs Claus.png',
  'TF Santa.png','TF Elf A.png','TF Elf B.png','TF Polar Bear.png','TF Polar Bear Cub.png'
];
const DEFAULT_ASSET_CATEGORIES=[
  'Floors & Ground','Walls & Structure','Roofs','Doors & Windows','Paths & Fences',
  'Furniture','Decorations','Nature','Props & Items','Characters & NPCs','Tilesets'
];
const STATIC_META={
  'bench.png':[16,16],'chair.png':[16,16],'character.png':[256,16,16,16],'christmas-lights.png':[128,16,16,16],
  'couch-horizontal':[32,16],'couch-vertical':[16,32],'exit.png':[16,16],
  'fence-horizontal':[32,16],'fence-vertical':[16,32],'fence-shadow-horizontal':[32,16],'fence-shadow-vertical':[16,32],
  'fireplace.png':[64,16,16,16],'floor-tile.png':[16,16],'floor-tileset.png':[48,32,16,16],
  'hot-chocolate.png':[32,8,8,8],'house1.png':[560,64,80,64],'house2.png':[80,48],
  'lamp-post.png':[16,32],'main-tree.png':[48,64],'old-christmas-palette.png':[16,2],
  'parchment-menu.png':[240,160],'path-tilemap.png':[64,64,16,16],
  'present1.png':[10,10],'present2.png':[8,8],'present3.png':[8,8],'present4.png':[8,8],
  'rug.png':[48,32],'sign-popup-background.png':[112,48],'sign-post.png':[16,16],
  'small-tree.png':[16,32],'snowman1.png':[16,16],'snow-tilemap.png':[16,16],
  'stocking.png':[8,8],'street-sign-post.png':[16,32],'table.png':[16,16],'wall-tileset.png':[48,48,16,16],'wreath.png':[8,8],
  'TF Igloo Tiles.png':[144,96,16,16],'TF Christmas Presents.png':[192,256,16,16],
  'TF Christmas Trees & Gifts.png':[80,112,16,16],'TF Christmas Decorations.png':[64,48,16,16],
  'TF Gnome A.png':[78,144,26,36],'TF Gnome B.png':[78,144,26,36],
  'TF Reindeer.png':[156,212,52,53],'TF Reindeer Child.png':[156,212,52,53],'TF Reindeer B.png':[156,212,52,53],
  'TF Rudolph Adult.png':[156,212,52,53],'TF Rudolph Adult B.png':[156,212,52,53],'TF Rudolph Child.png':[156,212,52,53],
  'TF Jesus.png':[78,144,26,36],'TF Mrs Claus.png':[78,144,26,36],'TF Santa.png':[78,144,26,36],
  'TF Elf A.png':[78,144,26,36],'TF Elf B.png':[78,144,26,36],
  'TF Polar Bear.png':[126,144,42,36],'TF Polar Bear Cub.png':[126,144,42,36],
  'TF Snowmen Tiles.png':[112,96,16,16],'TF Toy Tiles.png':[112,112,16,16]
};
const virtualCanvasCache=new Map();

let assets=null, extraAssets=null, sheetAssets=null, project=null, mode='select', selected=null, selectedAssetName=null, snap=true, zoom=1;
let drag=null, draftRect=null, pathEditing=false, pointerDown=false, lastStampKey='';
let organiseMode=false,categoryFilter='all';
const organisedSelection=new Set();
const mapSelection=new Set();
let marquee=null;
let play=null, editorMapBeforePlay=null, lastTime=performance.now();
let dialogState=null, puzzleState=null;
const keys=new Set();
const undoStack=[],redoStack=[];
const MAX_UNDO_STEPS=100;
let historyState=null,applyingHistory=false;

const uid=(prefix='id')=>prefix+'-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,7);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const grid=()=>Math.max(1,Number(gridSizeInput.value)||16);
const snapV=v=>snap?Math.round(v/grid())*grid():Math.round(v);
const brushCols=()=>clamp(Number(brushWidthInput?.value)||1,1,32);
const brushRows=()=>clamp(Number(brushHeightInput?.value)||1,1,32);

function allAssetNames(){
  return [...new Set([...BASE_ASSET_NAMES,...EXTRA_ASSET_NAMES,...(sheetAssets?.names||[])])];
}
function isAssetDeleted(name){return !!project?.editor?.hiddenAssets?.includes(name)}
function catalogNames(){
  return allAssetNames().filter(name=>!isAssetDeleted(name))
    .sort((a,b)=>assetLabel(a).localeCompare(assetLabel(b)));
}
function assetLabel(name){
  return project?.editor?.assetNameOverrides?.[name]||VIRTUAL_ASSETS[name]?.label||String(name).replace('.png','')
}
function renameAssetId(name,newLabel){
  const label=String(newLabel||'').trim();if(!label)return;
  project.editor.assetNameOverrides[name]=label;
  saveLocal(false);renderCategories();renderAssets(assetSearch.value);renderSelectionInspector()
}
function deleteAssetIds(names){
  const hidden=new Set(project.editor.hiddenAssets||[]);
  for(const name of names)hidden.add(name);
  project.editor.hiddenAssets=[...hidden];
  if(names.includes(selectedAssetName)){selectedAssetName=null;if(mode==='place')setMode('select')}
  organisedSelection.clear();saveLocal(false);renderCategories();renderAssets(assetSearch.value);updateBulkCategoryBar()
}
function restoreAssetIds(names){
  const restore=new Set(names);
  project.editor.hiddenAssets=(project.editor.hiddenAssets||[]).filter(name=>!restore.has(name));
  organisedSelection.clear();saveLocal(false);renderCategories();renderAssets(assetSearch.value);updateBulkCategoryBar()
}
function npcAssetNames(){
  const list=project?.editor?.npcAssets||DEFAULT_NPC_ASSETS;
  return list.filter(name=>catalogNames().includes(name));
}
function isNpcAsset(name){return npcAssetNames().includes(name)}
function setNpcClassification(names,enabled){
  const set=new Set(project.editor.npcAssets||[]);
  for(const name of names){enabled?set.add(name):set.delete(name)}
  project.editor.npcAssets=[...set];
  if(!set.has(project.editor.lastNpcAsset))project.editor.lastNpcAsset=project.editor.npcAssets[0]||'character.png';
  saveLocal(false);renderCategories();renderAssets(assetSearch.value)
}
function selectedMapAssets(){const ids=mapSelection;return activeMap().assets.filter(a=>ids.has(a.id))}
function clearMapSelection(){mapSelection.clear();marquee=null}
function rectIntersects(a,b){return a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y}
function assetProvider(name){
  if(VIRTUAL_ASSETS[name]){
    if(assets)return assets;
    throw new Error('Base asset pack is still loading.');
  }
  if(assets?.names?.includes(name))return assets;
  if(extraAssets?.names?.includes(name))return extraAssets;
  if(sheetAssets?.names?.includes(name))return sheetAssets;
  throw new Error('Asset data is still loading: '+name);
}
function staticMeta(name){
  const m=STATIC_META[name];
  if(!m)return null;
  return {width:m[0],height:m[1],cell:m[2]?{width:m[2],height:m[3]}:null};
}
function assetMeta(name){
  const v=VIRTUAL_ASSETS[name];
  if(v)return {width:v.sw,height:v.sh,cell:null,virtual:true,source:v.source,crop:{x:v.sx,y:v.sy,w:v.sw,h:v.sh}};
  try{return assetProvider(name).metadata(name)}catch(_){return staticMeta(name)||{width:16,height:16,cell:null}}
}
function virtualCanvas(name){
  if(virtualCanvasCache.has(name))return virtualCanvasCache.get(name);
  const v=VIRTUAL_ASSETS[name];if(!v)return null;
  const src=assets.canvas(v.source),c=document.createElement('canvas');c.width=v.sw;c.height=v.sh;
  const x=c.getContext('2d');x.imageSmoothingEnabled=false;x.drawImage(src,v.sx,v.sy,v.sw,v.sh,0,0,v.sw,v.sh);
  virtualCanvasCache.set(name,c);return c;
}
function placeholderPreview(name){
  const meta=assetMeta(name),cell=meta.cell,w=Math.min(64,cell?.width||meta.width||16),h=Math.min(52,cell?.height||meta.height||16);
  const c=document.createElement('canvas');c.width=Math.max(16,w);c.height=Math.max(16,h);
  const x=c.getContext('2d');x.imageSmoothingEnabled=false;
  x.fillStyle='#e4ece8';x.fillRect(0,0,c.width,c.height);
  x.fillStyle='#c5d7d0';for(let yy=0;yy<c.height;yy+=8)for(let xx=0;xx<c.width;xx+=8)if((xx+yy)/8%2===0)x.fillRect(xx,yy,8,8);
  x.fillStyle='#2c806a';x.font='bold 8px monospace';x.textAlign='center';x.textBaseline='middle';
  x.fillText('...',c.width/2,c.height/2);
  return c;
}
function assetPreview(name){
  try{
    if(VIRTUAL_ASSETS[name])return virtualCanvas(name);
    const provider=assetProvider(name),meta=provider.metadata(name);
    return meta.cell?provider.frame(name,0):provider.canvas(name);
  }catch(_){
    return placeholderPreview(name);
  }
}
function drawAsset(target,name,x,y,options={}){
  const v=VIRTUAL_ASSETS[name],provider=v?null:assetProvider(name);
  const src=v?virtualCanvas(name):(options.frame==null?provider.canvas(name):provider.frame(name,options.frame,options.cellWidth,options.cellHeight));
  const w=options.width??src.width,h=options.height??src.height;
  const rotation=((Math.round((Number(options.rotation)||0)/90)*90)%360+360)%360;
  const drawW=rotation%180===0?w:h,drawH=rotation%180===0?h:w;
  target.save();target.imageSmoothingEnabled=false;target.globalAlpha=options.alpha??1;
  target.translate(x+w/2,y+h/2);
  if(rotation)target.rotate(rotation*Math.PI/180);
  target.scale(options.flipX?-1:1,options.flipY?-1:1);
  target.drawImage(src,-drawW/2,-drawH/2,drawW,drawH);
  target.restore();
}
function freshEditor(){
  return {categories:[],assetCategoryByAsset:{},assetNameOverrides:{},hiddenAssets:[],npcAssets:[...DEFAULT_NPC_ASSETS],lastNpcAsset:'character.png',brush:{w:1,h:1},activeCategory:'all'};
}
function categoryGuess(name){
  if(sheetAssets?.names?.includes(name)){
    try{return sheetAssets.metadata(name).category||'Props & Items'}catch(_){}
  }
  const n=String(name).toLowerCase();
  if(DEFAULT_NPC_ASSETS.includes(name)||/(santa|mrs claus|misses|elf|gnome|reindeer|rudolph|jesus|polar bear|character)/i.test(name))return 'Characters & NPCs';
  if(/floor|snow-tilemap|igloo tiles/.test(n))return 'Floors & Ground';
  if(/wall|house/.test(n))return 'Walls & Structure';
  if(/roof/.test(n))return 'Roofs';
  if(/door|window|exit/.test(n))return 'Doors & Windows';
  if(/path|fence|street-sign|sign-post|lamp-post/.test(n))return 'Paths & Fences';
  if(/chair|couch|bench|table|rug|fireplace/.test(n))return 'Furniture';
  if(/christmas-lights|wreath|stocking|snowman|decorations/.test(n))return 'Decorations';
  if(/tree/.test(n))return 'Nature';
  if(/present|hot-chocolate|toy|palette/.test(n))return 'Props & Items';
  if(/tileset|tilemap|tiles|christmas presents|christmas trees/.test(n))return 'Tilesets';
  return 'Props & Items'
}
function ensureDefaultCategories(p){
  const byName=new Map((p.editor.categories||[]).map(c=>[c.name,c]));
  for(const name of DEFAULT_ASSET_CATEGORIES){
    if(!byName.has(name)){const c={id:uid('cat'),name};p.editor.categories.push(c);byName.set(name,c)}
  }
  for(const asset of allAssetNames()){
    if(!p.editor.assetCategoryByAsset[asset]){
      const guessed=categoryGuess(asset),cat=byName.get(guessed);
      if(cat)p.editor.assetCategoryByAsset[asset]=cat.id
    }
  }
}
function applyDynamicCategorySuggestions(){
  if(!project)return;
  ensureDefaultCategories(project);
  saveLocal(false);
  renderCategories();
  renderAssets(assetSearch.value)
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
  p.editor.assetNameOverrides=p.editor.assetNameOverrides&&typeof p.editor.assetNameOverrides==='object'?p.editor.assetNameOverrides:{};
  p.editor.hiddenAssets=Array.isArray(p.editor.hiddenAssets)?p.editor.hiddenAssets:[];
  p.editor.npcAssets=Array.isArray(p.editor.npcAssets)?p.editor.npcAssets:[...DEFAULT_NPC_ASSETS];
  p.editor.lastNpcAsset=p.editor.lastNpcAsset||p.editor.npcAssets[0]||'character.png';
  p.editor.brush=p.editor.brush&&typeof p.editor.brush==='object'?p.editor.brush:{w:1,h:1};
  p.editor.brush.w=clamp(Number(p.editor.brush.w)||1,1,32);p.editor.brush.h=clamp(Number(p.editor.brush.h)||1,1,32);
  p.editor.activeCategory='all';
  for(const c of p.editor.categories){c.id=c.id||uid('cat');c.name=c.name||'Category'}
  ensureDefaultCategories(p);
  for(const m of p.maps){
    m.id=m.id||uid('map');m.name=m.name||'Map';m.width=Math.max(160,Number(m.width)||640);m.height=Math.max(120,Number(m.height)||480);m.bg=m.bg||'#edf0e6';
    m.spawn=m.spawn||{x:80,y:80};m.assets=Array.isArray(m.assets)?m.assets:[];m.transitions=Array.isArray(m.transitions)?m.transitions:[];m.npcs=Array.isArray(m.npcs)?m.npcs:[];m.questTargets=Array.isArray(m.questTargets)?m.questTargets:[];
    for(const a of m.assets){
      a.id=a.id||uid('asset');a.layer=Number(a.layer)||0;a.solid=!!a.solid;a.flipX=!!a.flipX;a.flipY=!!a.flipY;
      a.rotation=((Math.round((Number(a.rotation)||0)/90)*90)%360+360)%360;
      if(typeof a.aboveCharacters!=='boolean')a.aboveCharacters=false;
      if(typeof a.animated!=='boolean')a.animated=a.asset==='fireplace.png';
      a.animationFps=clamp(Number(a.animationFps)||6,1,30)
    }
    for(const t of m.transitions){t.id=t.id||uid('link');t.label=t.label||'Map Link'}
    for(const n of m.npcs){n.id=n.id||uid('npc');n.name=n.name||'Elf';n.characterAsset=n.characterAsset||'character.png';n.dialogue=n.dialogue||'Hello!';n.path=Array.isArray(n.path)?n.path:[];n.speed=Number(n.speed)||24;n.quest=n.quest||{enabled:false,title:'',description:'',itemName:'',reward:'Christmas Present',completeText:'Thank you!'}}
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
function snapshotProject(){
  const copy=JSON.parse(JSON.stringify(project));
  delete copy.updatedAt;
  delete copy.activeMapId;
  return JSON.stringify(copy)
}
function updateHistoryButtons(){
  if(undoProjectBtn)undoProjectBtn.disabled=!undoStack.length;
  if(redoProjectBtn)redoProjectBtn.disabled=!redoStack.length
}
function initialiseUndoHistory(){
  undoStack.length=0;redoStack.length=0;
  historyState=project?snapshotProject():null;
  updateHistoryButtons()
}
function saveLocal(show=true){
  if(!project)return;
  project.version=SCHEMA_VERSION;
  const snapshot=snapshotProject();
  if(!applyingHistory){
    if(historyState!==null&&snapshot!==historyState){
      undoStack.push(historyState);
      if(undoStack.length>MAX_UNDO_STEPS)undoStack.shift();
      redoStack.length=0
    }
    historyState=snapshot;
    updateHistoryButtons()
  }
  project.updatedAt=new Date().toISOString();
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
function refreshAfterHistory(label){
  selected=null;clearMapSelection();pathEditing=false;drag=null;draftRect=null;marquee=null;
  categoryFilter='all';
  brushWidthInput.value=project.editor.brush.w;brushHeightInput.value=project.editor.brush.h;
  resizeCanvas();renderCategories();renderAssets(assetSearch.value);renderAllPanels();draw();updateHistoryButtons();
  flashStatus(label)
}
function undoProject(){
  if(play){flashStatus('Stop Playtest before undoing edits.');return}
  if(!undoStack.length)return;
  const current=snapshotProject(),previous=undoStack.pop(),keepMap=project.activeMapId;
  redoStack.push(current);
  applyingHistory=true;
  try{
    project=normaliseProject(JSON.parse(previous));
    if(project.maps.some(m=>m.id===keepMap))project.activeMapId=keepMap;
    historyState=previous;saveLocal(false)
  }finally{applyingHistory=false}
  refreshAfterHistory('Undo')
}
function redoProject(){
  if(play){flashStatus('Stop Playtest before redoing edits.');return}
  if(!redoStack.length)return;
  const current=snapshotProject(),next=redoStack.pop(),keepMap=project.activeMapId;
  undoStack.push(current);
  if(undoStack.length>MAX_UNDO_STEPS)undoStack.shift();
  applyingHistory=true;
  try{
    project=normaliseProject(JSON.parse(next));
    if(project.maps.some(m=>m.id===keepMap))project.activeMapId=keepMap;
    historyState=next;saveLocal(false)
  }finally{applyingHistory=false}
  refreshAfterHistory('Redo')
}
function activeMap(){
  const id=play?play.mapId:project.activeMapId;
  return project.maps.find(m=>m.id===id)||project.maps[0];
}
function mapById(id){return project.maps.find(m=>m.id===id)}
function setActiveMap(id){
  if(play)return;
  if(!mapById(id))return;
  project.activeMapId=id;selected=null;mapSelection.clear();marquee=null;pathEditing=false;resizeCanvas();renderAllPanels();draw();
}
function flashStatus(text){modeStatus.textContent=text;clearTimeout(flashStatus.t);flashStatus.t=setTimeout(updateModeStatus,1800)}
function updateModeStatus(){
  const labels={select:'Select and drag objects. Shift-click assets to add/remove them from a group.',multi:'Click assets or drag a box to select multiple placed tiles.',place:selectedAssetName?'Stamp '+assetLabel(selectedAssetName)+' · brush '+brushCols()+'×'+brushRows()+'.':'Choose an asset from the palette.',transition:'Drag a rectangle where walking should load another map.',npc:'Click to place an NPC, then choose its animated character, path, dialogue and quest.',quest:'Click to place a quest item / puzzle point.',spawn:'Click exactly where the player should spawn on this map.',play:'Playtest is live. Walk through links and interact with NPCs.'};
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
  zoom=play?2:(Number(zoomSelect.value)||1);
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
    const a={id:uid('asset'),asset:selectedAssetName,x:gx+col*d.w,y:gy+row*d.h,w:d.w,h:d.h,frame:d.frame,layer:0,rotation:0,flipX:false,flipY:false,solid:false,aboveCharacters:false,animated:selectedAssetName==='fireplace.png',animationFps:6};
    const v=VIRTUAL_ASSETS[selectedAssetName];
    if(v){a.sourceAsset=v.source;a.crop={x:v.sx,y:v.sy,w:v.sw,h:v.sh}}
    m.assets.push(a);last=a;
  }
  if(last){selected={type:'asset',id:last.id};renderSelectionInspector()}
  saveLocal(false);renderMaps();draw();
}
function addNpcAt(x,y){
  const choices=npcAssetNames(),characterAsset=(choices.includes(project.editor.lastNpcAsset)?project.editor.lastNpcAsset:choices[0])||'character.png';
  const n={id:uid('npc'),name:'Elf',characterAsset,x:snapV(x),y:snapV(y),speed:24,dialogue:'Hello!\nIt is lovely to see you.',path:[],quest:{enabled:false,title:'A Little Favour',description:'Could you fetch something for me?',itemName:'Quest Item',reward:'Christmas Present',completeText:'You found it! Thank you so much.'}};
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
  if(mode==='spawn'){
    const m=activeMap();m.spawn.x=snapV(p.x);m.spawn.y=snapV(p.y);saveLocal(false);renderMapInspector();setMode('select');flashStatus('Spawn point set.');draw();return
  }
  if(mode==='place'){addAssetAt(p.x,p.y);return}
  if(mode==='npc'){addNpcAt(p.x,p.y);return}
  if(mode==='quest'){addQuestAt(p.x,p.y);return}
  if(mode==='transition'){draftRect={x:p.x,y:p.y,w:0,h:0};canvas.setPointerCapture(e.pointerId);return}
  if(mode==='multi'){
    const hit=hitTest(p);
    if(hit?.type==='asset'){
      mapSelection.has(hit.id)?mapSelection.delete(hit.id):mapSelection.add(hit.id);
      selected=null;renderSelectionInspector();draw();return
    }
    marquee={x:p.x,y:p.y,w:0,h:0};canvas.setPointerCapture(e.pointerId);draw();return
  }
  if(mode==='select'){
    const hit=hitTest(p);
    if(e.shiftKey&&hit?.type==='asset'){
      mapSelection.has(hit.id)?mapSelection.delete(hit.id):mapSelection.add(hit.id);
      selected=null;renderSelectionInspector();draw();return
    }
    clearMapSelection();
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
  if(mode==='multi'&&marquee&&(e.buttons&1)){marquee.w=p.x-marquee.x;marquee.h=p.y-marquee.y;draw();return}
  if(mode==='transition'&&draftRect&&(e.buttons&1)){draftRect.w=p.x-draftRect.x;draftRect.h=p.y-draftRect.y;draw();return}
  if(drag&&(e.buttons&1)){
    const o=getSelected();if(!o)return;
    o.x=snapV(p.x-drag.ox);o.y=snapV(p.y-drag.oy);
    if(o.x==null)return;renderSelectionInspector(false);draw();
  }
});
canvas.addEventListener('pointerup',()=>{pointerDown=false;lastStampKey='';
  if(mode==='transition')finishTransition();
  if(mode==='multi'&&marquee){
    let {x,y,w,h}=marquee;if(w<0){x+=w;w=-w}if(h<0){y+=h;h=-h}
    if(w>3&&h>3){const box={x,y,w,h};for(const a of activeMap().assets)if(rectIntersects(a,box))mapSelection.add(a.id)}
    marquee=null;selected=null;renderSelectionInspector();draw()
  }
  if(drag){drag=null;saveLocal(false)}
});
canvas.addEventListener('pointercancel',()=>{pointerDown=false;drag=null;draftRect=null;marquee=null;lastStampKey=''});
canvas.addEventListener('contextmenu',e=>e.preventDefault());

function drawGrid(m){
  const g=grid();ctx.save();ctx.strokeStyle='rgba(24,49,77,.10)';ctx.lineWidth=1;
  ctx.beginPath();for(let x=0;x<=m.width;x+=g){ctx.moveTo(x+.5,0);ctx.lineTo(x+.5,m.height)}for(let y=0;y<=m.height;y+=g){ctx.moveTo(0,y+.5);ctx.lineTo(m.width,y+.5)}ctx.stroke();ctx.restore();
}
function drawPlacedAsset(a){
  const opt={width:a.w,height:a.h,rotation:a.rotation||0,flipX:a.flipX,flipY:a.flipY};
  const count=frameCount(a.asset);
  if(a.animated&&count>1){
    const fps=clamp(Number(a.animationFps)||6,1,30),start=Number(a.frame)||0;
    opt.frame=(start+Math.floor(performance.now()/1000*fps))%count
  }else if(a.frame!=null)opt.frame=a.frame;
  try{drawAsset(ctx,a.asset,a.x,a.y,opt)}catch(_){
    ctx.save();ctx.fillStyle='rgba(44,128,106,.18)';ctx.fillRect(a.x,a.y,a.w,a.h);ctx.restore()
  }
  if(!play&&(selected?.type==='asset'&&selected.id===a.id||mapSelection.has(a.id))){ctx.save();ctx.strokeStyle=mapSelection.has(a.id)?'#2c806a':'#f7bd18';ctx.lineWidth=2;ctx.strokeRect(a.x-1,a.y-1,a.w+2,a.h+2);ctx.restore()}
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
function npcFrameForAsset(name,step=0,dir='down'){
  const meta=assetMeta(name),cell=meta.cell;if(!cell)return null;
  const cols=Math.max(1,Math.floor(meta.width/cell.width)),rows=Math.max(1,Math.floor(meta.height/cell.height));
  let index=0;
  if(name==='character.png'&&cols>=16){const base={down:0,up:4,left:8,right:12}[dir]||0;index=base+(step%4)}
  else if(rows>=4){const row={down:0,left:1,right:2,up:3}[dir]??0;index=row*cols+(step%cols)}
  else index=step%(cols*rows);
  try{return assetProvider(name).frame(name,index,cell.width,cell.height)}catch(_){return null}
}
function drawNpcAt(n,x=n.x,y=n.y,step=0,dir='down',selectedNpc=false){
  const name=n.characterAsset||'character.png',meta=assetMeta(name),cell=meta.cell||{width:16,height:16};
  const f=npcFrameForAsset(name,step,dir),drawH=Math.min(36,Math.max(24,cell.height)),drawW=Math.max(16,cell.width*(drawH/cell.height));
  if(f){ctx.imageSmoothingEnabled=false;ctx.drawImage(f,Math.round(x-drawW/2),Math.round(y-drawH+4),Math.round(drawW),Math.round(drawH))}
  else{ctx.fillStyle='#2c806a';ctx.fillRect(Math.round(x-6),Math.round(y-16),12,16)}
  if(selectedNpc&&!play){ctx.strokeStyle='#f7bd18';ctx.lineWidth=2;ctx.strokeRect(Math.round(x-drawW/2-1),Math.round(y-drawH+3),Math.round(drawW+2),Math.round(drawH+2))}
}
function drawNpc(n){
  if(!play&&n.path?.length){ctx.save();ctx.strokeStyle='rgba(44,128,106,.65)';ctx.lineWidth=2;ctx.setLineDash([5,4]);ctx.beginPath();ctx.moveTo(n.x,n.y);for(const p of n.path)ctx.lineTo(p.x,p.y);ctx.stroke();ctx.setLineDash([]);for(const p of n.path){ctx.fillStyle='#2c806a';ctx.fillRect(p.x-3,p.y-3,6,6)}ctx.restore()}
  const run=play?.npcs[n.id];drawNpcAt(n,run?.x??n.x,run?.y??n.y,run?.step??0,run?.dir??'down',selected?.type==='npc'&&selected.id===n.id);
}
function drawSpawn(m){
  if(play)return;ctx.save();ctx.fillStyle='rgba(44,128,106,.25)';ctx.strokeStyle='#2c806a';ctx.lineWidth=2;ctx.beginPath();ctx.arc(m.spawn.x,m.spawn.y,9,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.fillStyle='#185948';ctx.font='bold 8px monospace';ctx.fillText('SPAWN',m.spawn.x+12,m.spawn.y+3);ctx.restore()
}
function drawDraft(){
  if(draftRect){ctx.save();ctx.fillStyle='rgba(51,120,205,.18)';ctx.strokeStyle='#3378cd';ctx.lineWidth=2;ctx.fillRect(draftRect.x,draftRect.y,draftRect.w,draftRect.h);ctx.strokeRect(draftRect.x,draftRect.y,draftRect.w,draftRect.h);ctx.restore()}
  if(marquee){ctx.save();ctx.fillStyle='rgba(44,128,106,.16)';ctx.strokeStyle='#2c806a';ctx.setLineDash([5,3]);ctx.lineWidth=2;ctx.fillRect(marquee.x,marquee.y,marquee.w,marquee.h);ctx.strokeRect(marquee.x,marquee.y,marquee.w,marquee.h);ctx.restore()}
}
function drawPlayer(now){
  if(!play)return;const moving=play.moving,step=moving?Math.floor((now-play.animStart)/150)%4:0;const f=npcFrameForAsset('character.png',step,play.dir);ctx.imageSmoothingEnabled=false;ctx.fillStyle='rgba(16,36,29,.25)';ctx.beginPath();ctx.ellipse(play.x,play.y+2,8,3,0,0,Math.PI*2);ctx.fill();if(f)ctx.drawImage(f,Math.round(play.x-12),Math.round(play.y-20),24,24);
}
function draw(now=performance.now()){
  if(!assets||!project)return;const m=activeMap();if(canvas.width!==m.width||canvas.height!==m.height)resizeCanvas();
  ctx.clearRect(0,0,m.width,m.height);ctx.fillStyle=m.bg;ctx.fillRect(0,0,m.width,m.height);
  const placed=[...m.assets].sort((a,b)=>(a.layer||0)-(b.layer||0));
  for(const a of placed)if(!a.aboveCharacters)drawPlacedAsset(a);
  if(!play)drawGrid(m);
  for(const t of m.transitions)drawTransition(t);
  for(const q of m.questTargets)drawQuestTarget(q);
  for(const n of m.npcs)drawNpc(n);
  drawPlayer(now);
  for(const a of placed)if(a.aboveCharacters)drawPlacedAsset(a);
  drawSpawn(m);drawDraft();
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
  const names=catalogNames(),deleted=allAssetNames().filter(name=>isAssetDeleted(name));
  const specs=[
    {id:'all',baseName:'All',count:names.length,system:true},
    {id:'npcs',baseName:'NPCs',count:names.filter(name=>isNpcAsset(name)).length,system:true},
    {id:'uncategorised',baseName:'Uncategorised',count:names.filter(name=>!assignedCategory(name)).length,system:true},
    {id:'deleted',baseName:'Deleted',count:deleted.length,system:true},
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
    b.ondragover=e=>{if(spec.id==='all'||spec.id==='deleted')return;e.preventDefault();b.classList.add('dragOver')};
    b.ondragleave=()=>b.classList.remove('dragOver');
    b.ondrop=e=>{
      if(spec.id==='all'||spec.id==='deleted')return;
      e.preventDefault();b.classList.remove('dragOver');
      const name=e.dataTransfer.getData('text/asset-name');
      if(name){if(spec.id==='npcs')setNpcClassification([name],true);else setAssetCategory([name],spec.id==='uncategorised'?'':spec.id)}
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
  assetList.classList.toggle('organising',organiseMode);$('#organiseAssets').classList.toggle('active',organiseMode);
  const one=organisedSelection.size===1,any=organisedSelection.size>0,inDeleted=categoryFilter==='deleted';
  $('#renameAsset').disabled=!one;
  $('#deleteAssets').disabled=!any||inDeleted;
  $('#restoreAssets').disabled=!any||!inDeleted;
  $('#assignCategory').disabled=!any||inDeleted;
  $('#markNpcAssets').disabled=!any||inDeleted;
  $('#unmarkNpcAssets').disabled=!any||inDeleted
}
function assetMatchesCategory(name){
  const assigned=assignedCategory(name);
  if(categoryFilter==='deleted')return isAssetDeleted(name);
  if(isAssetDeleted(name))return false;
  if(categoryFilter==='all')return true;
  if(categoryFilter==='npcs')return isNpcAsset(name);
  if(categoryFilter==='uncategorised')return !assigned;
  return assigned===categoryFilter
}
function renderAssets(filter=''){
  assetList.innerHTML='';
  const q=filter.trim().toLowerCase();
  const sourceNames=categoryFilter==='deleted'?allAssetNames():catalogNames();
  const names=sourceNames.filter(n=>(!q||assetLabel(n).toLowerCase().includes(q)||n.toLowerCase().includes(q))&&assetMatchesCategory(n));

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
      if(isNpcAsset(name)){const npcBadge=document.createElement('span');npcBadge.className='assetNpcBadge';npcBadge.textContent='NPC';b.appendChild(npcBadge)}
      if(isAssetDeleted(name)){const delBadge=document.createElement('span');delBadge.className='assetDeletedBadge';delBadge.textContent='DELETED';b.appendChild(delBadge)}

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
   '<div class="inspectorActions"><button id="setSpawnTool" type="button">SET SPAWN ON MAP</button><button id="clearMap" type="button">CLEAR MAP</button></div>'+
   '<div class="inspectorActions"><button id="duplicateMap" type="button">DUPLICATE MAP</button><button id="deleteMap" type="button">DELETE MAP</button></div>';
  $('#mapName').onchange=e=>{m.name=e.target.value||'Map';saveLocal(false);renderMaps();renderMapInspector();draw()};
  $('#mapWidth').onchange=e=>{m.width=Math.max(160,Number(e.target.value)||640);m.spawn.x=clamp(m.spawn.x,0,m.width);saveLocal(false);resizeCanvas();renderMaps();draw()};
  $('#mapHeight').onchange=e=>{m.height=Math.max(120,Number(e.target.value)||480);m.spawn.y=clamp(m.spawn.y,0,m.height);saveLocal(false);resizeCanvas();renderMaps();draw()};
  $('#mapBg').oninput=e=>{m.bg=e.target.value;saveLocal(false);draw()};
  $('#spawnX').onchange=e=>{m.spawn.x=snapV(Number(e.target.value)||0);saveLocal(false);draw()};
  $('#spawnY').onchange=e=>{m.spawn.y=snapV(Number(e.target.value)||0);saveLocal(false);draw()};
  $('#setSpawnTool').onclick=()=>setMode('spawn');
  $('#clearMap').onclick=()=>{if(!confirm('Clear every placed asset, map link, NPC and quest item from "'+m.name+'"? The map itself and spawn point will stay.'))return;m.assets=[];m.transitions=[];m.npcs=[];m.questTargets=[];selected=null;clearMapSelection();saveLocal(false);renderMaps();renderSelectionInspector();draw();flashStatus('Map cleared.')};
  $('#duplicateMap').onclick=duplicateMap;$('#deleteMap').onclick=deleteMap;
}
function mapOptions(selectedId){return project.maps.map(m=>'<option value="'+m.id+'" '+(m.id===selectedId?'selected':'')+'>'+esc(m.name)+'</option>').join('')}
function assetOptions(selectedName){return '<option value="">Marker only</option>'+catalogNames().map(n=>'<option value="'+n+'" '+(n===selectedName?'selected':'')+'>'+esc(assetLabel(n))+'</option>').join('')}
function bindNumber(id,obj,key,after=draw){const el=$('#'+id);if(el)el.onchange=e=>{obj[key]=Number(e.target.value)||0;saveLocal(false);after()}}
function renderSelectionInspector(updateTitle=true){
  const multi=selectedMapAssets(),o=getSelected();deleteSelected.disabled=!(o||multi.length);
  if(multi.length&&!o){
    if(updateTitle)selectionTitle.textContent=multi.length+' assets selected';
    selectionInspector.className='inspectorForm';
    selectionInspector.innerHTML='<div class="multiSelectionBox" style="grid-column:1/-1"><strong>'+multi.length+' placed assets selected</strong>Use arrow keys to move them together, Delete to remove them, or duplicate the whole group.</div><div class="inspectorActions"><button id="dupMulti" type="button">DUPLICATE GROUP</button><button id="clearMulti" type="button">CLEAR SELECTION</button></div>';
    $('#dupMulti').onclick=duplicateSelected;$('#clearMulti').onclick=()=>{clearMapSelection();renderSelectionInspector();draw()};return
  }
  if(!o){if(updateTitle)selectionTitle.textContent='Nothing selected';selectionInspector.className='inspectorEmpty';selectionInspector.innerHTML='Select an asset, map link, NPC or quest item.';return}
  selectionInspector.className='inspectorForm';
  if(selected.type==='asset'){
    if(updateTitle)selectionTitle.textContent=assetLabel(o.asset);
    const count=frameCount(o.asset);
    selectionInspector.innerHTML=
      input('X','selX',o.x,'number')+input('Y','selY',o.y,'number')+input('Width','selW',o.w,'number')+input('Height','selH',o.h,'number')+
      (count>1?input(o.animated?'Start frame':'Frame','selFrame',o.frame??0,'number')+input('Animation FPS','selAnimFps',o.animationFps||6,'number'):'')+input('Layer','selLayer',o.layer||0,'number')+
      '<div class="inlineChecks">'+(count>1?'<label><input id="selAnimated" type="checkbox" '+(o.animated?'checked':'')+'> Animated</label>':'')+'<label><input id="selFlipX" type="checkbox" '+(o.flipX?'checked':'')+'> Flip X</label><label><input id="selFlipY" type="checkbox" '+(o.flipY?'checked':'')+'> Flip Y</label><label><input id="selSolid" type="checkbox" '+(o.solid?'checked':'')+'> Solid collision</label><label><input id="selAboveCharacters" type="checkbox" '+(o.aboveCharacters?'checked':'')+'> Draw above characters</label></div>'+
      '<div class="inspectorActions"><button id="rotateLeft" type="button">↶ 90°</button><button id="rotateRight" type="button">↷ 90°</button><span class="rotationReadout">'+(o.rotation||0)+'°</span></div>'+
      '<div class="inspectorActions"><button id="dupSelected" type="button">DUPLICATE</button><button id="layerUp" type="button">LAYER +</button><button id="layerDown" type="button">LAYER −</button></div>';
    bindNumber('selX',o,'x');bindNumber('selY',o,'y');bindNumber('selW',o,'w');bindNumber('selH',o,'h');
    if($('#selFrame'))$('#selFrame').onchange=e=>{o.frame=clamp(Number(e.target.value)||0,0,count-1);saveLocal(false);draw()};
    if($('#selAnimFps'))$('#selAnimFps').onchange=e=>{o.animationFps=clamp(Number(e.target.value)||6,1,30);e.target.value=o.animationFps;saveLocal(false);draw()};
    if($('#selAnimated'))$('#selAnimated').onchange=e=>{o.animated=e.target.checked;saveLocal(false);renderSelectionInspector();draw()};
    bindNumber('selLayer',o,'layer');
    $('#selFlipX').onchange=e=>{o.flipX=e.target.checked;saveLocal(false);draw()};$('#selFlipY').onchange=e=>{o.flipY=e.target.checked;saveLocal(false);draw()};$('#selSolid').onchange=e=>{o.solid=e.target.checked;saveLocal(false);draw()};$('#selAboveCharacters').onchange=e=>{o.aboveCharacters=e.target.checked;saveLocal(false);draw()};
    const rotateAsset=delta=>{o.rotation=((o.rotation||0)+delta+360)%360;[o.w,o.h]=[o.h,o.w];saveLocal(false);renderSelectionInspector();draw()};
    $('#rotateLeft').onclick=()=>rotateAsset(-90);$('#rotateRight').onclick=()=>rotateAsset(90);
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
    const npcChoices=npcAssetNames(),npcOptions=(npcChoices.includes(o.characterAsset)?npcChoices:[o.characterAsset,...npcChoices]).filter(Boolean).map(name=>'<option value="'+esc(name)+'" '+(name===o.characterAsset?'selected':'')+'>'+esc(assetLabel(name))+'</option>').join('');
    selectionInspector.innerHTML=
      input('Name','npcName',o.name,'text','full')+'<label class="full"><span>Character</span><select id="npcCharacter">'+npcOptions+'</select></label>'+input('X','selX',o.x,'number')+input('Y','selY',o.y,'number')+input('Walk speed','npcSpeed',o.speed||24,'number')+
      '<label class="full"><span>Interaction text (each line becomes a dialogue step)</span><textarea id="npcDialogue">'+esc(o.dialogue||'')+'</textarea></label>'+
      '<div class="inspectorActions"><button id="editPath" type="button" class="'+(pathEditing?'active':'')+'">'+(pathEditing?'FINISH PATH':'EDIT PATH')+'</button><button id="clearPath" type="button">CLEAR PATH ('+(o.path?.length||0)+')</button></div>'+
      '<div class="inlineChecks"><label><input id="questEnabled" type="checkbox" '+(q.enabled?'checked':'')+'> Gives a fetch quest</label></div>'+
      '<label class="full"><span>Quest title</span><input id="questTitle" value="'+esc(q.title||'')+'"></label>'+
      '<label class="full"><span>Quest description</span><textarea id="questDescription">'+esc(q.description||'')+'</textarea></label>'+
      input('Required item name','questItem',q.itemName||'','text','full')+input('Reward','questReward',q.reward||'Christmas Present','text','full')+
      '<label class="full"><span>Completion dialogue</span><textarea id="questComplete">'+esc(q.completeText||'')+'</textarea></label>';
    $('#npcName').onchange=e=>{o.name=e.target.value||'Elf';saveLocal(false);renderSelectionInspector();draw()};$('#npcCharacter').onchange=e=>{o.characterAsset=e.target.value;project.editor.lastNpcAsset=e.target.value;saveLocal(false);draw()};bindNumber('selX',o,'x');bindNumber('selY',o,'y');bindNumber('npcSpeed',o,'speed');
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
  const multi=selectedMapAssets(),m=activeMap();
  if(multi.length&&!selected){
    const newIds=[];for(const o of multi){const copy=JSON.parse(JSON.stringify(o));copy.id=uid('asset');copy.x+=grid();copy.y+=grid();m.assets.push(copy);newIds.push(copy.id)}
    mapSelection.clear();for(const id of newIds)mapSelection.add(id);saveLocal(false);renderMaps();renderSelectionInspector();draw();return
  }
  const o=getSelected();if(!o)return;const copy=JSON.parse(JSON.stringify(o));copy.id=uid(selected.type);copy.x+=grid();copy.y+=grid();
  const arr=selected.type==='asset'?m.assets:selected.type==='transition'?m.transitions:selected.type==='npc'?m.npcs:m.questTargets;arr.push(copy);selectObject(selected.type,copy.id);saveLocal(false)
}
function deleteSelection(){
  const m=activeMap();
  if(mapSelection.size&&!selected){m.assets=m.assets.filter(o=>!mapSelection.has(o.id));clearMapSelection();saveLocal(false);renderSelectionInspector();renderMaps();draw();return}
  if(!selected)return;const key=selected.type==='asset'?'assets':selected.type==='transition'?'transitions':selected.type==='npc'?'npcs':'questTargets';m[key]=m[key].filter(o=>o.id!==selected.id);selected=null;pathEditing=false;saveLocal(false);renderSelectionInspector();renderMaps();draw()
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
$('#renameAsset').onclick=()=>{if(organisedSelection.size!==1){flashStatus('Select exactly one asset to rename.');return}const name=[...organisedSelection][0],next=prompt('Rename asset',assetLabel(name));if(next?.trim())renameAssetId(name,next.trim())};
$('#deleteAssets').onclick=()=>{if(!organisedSelection.size)return;const names=[...organisedSelection],placed=project.maps.reduce((n,m)=>n+m.assets.filter(a=>names.includes(a.asset)).length,0),msg='Delete '+names.length+' asset'+(names.length===1?'':'s')+' from the palette?'+(placed?' '+placed+' placed map asset'+(placed===1?' will':'s will')+' remain on your maps.':'');if(confirm(msg))deleteAssetIds(names)};
$('#restoreAssets').onclick=()=>{if(!organisedSelection.size)return;restoreAssetIds([...organisedSelection])};
$('#markNpcAssets').onclick=()=>{if(!organisedSelection.size){flashStatus('Select one or more animated character assets first.');return}setNpcClassification([...organisedSelection],true);organisedSelection.clear();renderAssets(assetSearch.value);updateBulkCategoryBar()};
$('#unmarkNpcAssets').onclick=()=>{if(!organisedSelection.size){flashStatus('Select one or more assets first.');return}setNpcClassification([...organisedSelection],false);organisedSelection.clear();renderAssets(assetSearch.value);updateBulkCategoryBar()};
$('#clearAssetSelection').onclick=()=>{organisedSelection.clear();renderAssets(assetSearch.value);updateBulkCategoryBar()};
$$('.modeBtn[data-mode]').forEach(b=>b.onclick=()=>setMode(b.dataset.mode));

function download(name,text,type='text/javascript'){
  const blob=new Blob([text],{type}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),500)
}
undoProjectBtn.onclick=undoProject;
redoProjectBtn.onclick=redoProject;
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
  editorMapBeforePlay=project.activeMapId;selected=null;clearMapSelection();pathEditing=false;const m=activeMap();
  play={mapId:m.id,x:m.spawn.x,y:m.spawn.y,dir:'down',moving:false,animStart:performance.now(),inventory:[],quests:{},collected:new Set(),npcs:{},transitionCooldown:0,rewards:[]};setupPlayNpcs();
  mode='play';
  document.body.classList.add('mobilePlaytest');
  playHud.hidden=false;
  mobilePlayControls.hidden=false;
  $('#playtestBtn').classList.add('active');
  playMapName.textContent=m.name;
  resizeCanvas();renderMaps();renderSelectionInspector();updateModeStatus();
  requestAnimationFrame(()=>{centerPlayView();draw()})
}
function stopPlaytest(){
  if(!play)return;
  keys.clear();
  play=null;project.activeMapId=editorMapBeforePlay||project.maps[0].id;editorMapBeforePlay=null;mode='select';
  document.body.classList.remove('mobilePlaytest');
  playHud.hidden=true;mobilePlayControls.hidden=true;
  $('#playtestBtn').classList.remove('active');$$('.modeBtn[data-mode]').forEach(b=>b.classList.toggle('active',b.dataset.mode==='select'));
  resizeCanvas();renderAllPanels();updateModeStatus();draw()
}
$('#playtestBtn').onclick=()=>play?stopPlaytest():startPlaytest();$('#stopPlaytest').onclick=stopPlaytest;

$$('.touchMove').forEach(button=>{
  const key=button.dataset.key;
  const press=e=>{e.preventDefault();if(play)keys.add(key)};
  const release=e=>{e.preventDefault();keys.delete(key)};
  button.addEventListener('pointerdown',press);
  button.addEventListener('pointerup',release);
  button.addEventListener('pointercancel',release);
  button.addEventListener('pointerleave',release);
});
mobileInteract.addEventListener('pointerdown',e=>{
  e.preventDefault();
  if(play&&!dialogState&&!puzzleState)interactPlay()
});

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
  if((e.metaKey||e.ctrlKey)&&k==='z'){e.preventDefault();e.shiftKey?redoProject():undoProject();return}
  if(e.ctrlKey&&!e.metaKey&&k==='y'){e.preventDefault();redoProject();return}
  if(play){
    if(['arrowup','arrowdown','arrowleft','arrowright',' ','enter'].includes(k))e.preventDefault();keys.add(k);
    if((k===' '||k==='enter')&&!dialogState&&!puzzleState)interactPlay();if(k==='escape')stopPlaytest();return
  }
  if(k==='delete'||k==='backspace'){if(selected||mapSelection.size){e.preventDefault();deleteSelection()}}
  if((e.metaKey||e.ctrlKey)&&k==='d'){if(selected||mapSelection.size){e.preventDefault();duplicateSelected()}}
  if(mapSelection.size&&!selected&&['arrowup','arrowdown','arrowleft','arrowright'].includes(k)){
    e.preventDefault();const d=e.shiftKey?grid():1;for(const o of selectedMapAssets()){if(k==='arrowleft')o.x-=d;if(k==='arrowright')o.x+=d;if(k==='arrowup')o.y-=d;if(k==='arrowdown')o.y+=d}saveLocal(false);draw();return
  }
  if(selected&&['arrowup','arrowdown','arrowleft','arrowright'].includes(k)){
    e.preventDefault();const o=getSelected(),d=e.shiftKey?grid():1;if(k==='arrowleft')o.x-=d;if(k==='arrowright')o.x+=d;if(k==='arrowup')o.y-=d;if(k==='arrowdown')o.y+=d;saveLocal(false);renderSelectionInspector(false);draw()
  }
});
addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
addEventListener('resize',()=>{if(play)requestAnimationFrame(centerPlayView)});

addEventListener('beforeunload',()=>{if(project)saveLocal(false)});

sheetAssets=window.WorldBuilderSheetAssets||null;
project=loadLocal();
initialiseUndoHistory();
categoryFilter='all';
brushWidthInput.value=project.editor.brush.w;
brushHeightInput.value=project.editor.brush.h;
resizeCanvas();
renderCategories();
renderAssets();
renderAllPanels();
updateModeStatus();
flashStatus(catalogNames().length+' assets registered. Loading artwork…');
requestAnimationFrame(loop);

VillagePixelAssets.ready.then(api=>{
  assets=api;
  renderCategories();
  renderAssets(assetSearch.value);
  renderAllPanels();
  flashStatus('Original Christmas assets loaded.');
}).catch(err=>{
  console.error('Original asset pack failed to load:',err);
  modeStatus.textContent='Original asset artwork failed to decode, but the palette remains available.';
});

if(window.WorldBuilderExtraAssets?.ready){
  window.WorldBuilderExtraAssets.ready.then(api=>{
    extraAssets=api;
    renderCategories();
    renderAssets(assetSearch.value);
    flashStatus('Core Christmas assets loaded.');
  }).catch(err=>{
    console.error('New Christmas asset pack failed to load:',err);
    modeStatus.textContent='New Christmas artwork failed to decode, but the core palette remains available.';
  });
}

if(window.WorldBuilderSheetAssets?.ready){
  const tileApi=window.WorldBuilderSheetAssets;
  sheetAssets=tileApi;

  const redrawUploadedTiles=()=>{
    renderAssets(assetSearch.value);
    renderCategories();
  };

  const retryTimer=setInterval(()=>{
    if(tileApi.loaded){
      clearInterval(retryTimer);
      redrawUploadedTiles();
      flashStatus('All '+catalogNames().length+' assets loaded, including 312 uploaded tiles.');
    }else if(tileApi.loadError){
      clearInterval(retryTimer);
      console.error('Uploaded tile decoder failed:',tileApi.loadError);
      modeStatus.textContent='Uploaded tile artwork failed to decode: '+(tileApi.loadError.message||tileApi.loadError);
    }
  },250);

  tileApi.ready.then(api=>{
    sheetAssets=api;
    redrawUploadedTiles();
    flashStatus('Uploaded tile artwork decoded. Refreshing thumbnails…');
    try{
      applyDynamicCategorySuggestions();
      renderAllPanels();
    }catch(err){
      console.error('Uploaded tile post-load setup failed:',err);
      redrawUploadedTiles();
    }
    redrawUploadedTiles();
    flashStatus('All '+catalogNames().length+' assets loaded, including 312 uploaded tiles.');
  }).catch(err=>{
    console.error('Uploaded tile sheets failed to decode:',err);
    modeStatus.textContent='Uploaded tile artwork failed to decode: '+(err.message||err);
  });
}
})();