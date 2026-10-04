(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const core = () => window.PixelStudioCore;
  const snapper = () => window.ToolBoxPixelSnapper;

  let sourceImage = null;
  let sourceName = '';
  let sourceJson = null;
  let snappedResult = null;
  let animationMap = {};
  let mapPreviewTimer = null;
  let mapPreviewKey = null;
  let overlaySeq = 1;
  let activeOverlayId = null;
  let paletteBaseFrames = null;
  const overlays = [];

  function status(message){ core()?.setStatus(message); if($('assetStatus')) $('assetStatus').textContent=message; }
  function hex(r,g,b){ return '#'+[r,g,b].map(v=>v.toString(16).padStart(2,'0')).join(''); }
  function hexRgb(c){const n=parseInt(String(c).slice(1),16);return[(n>>16)&255,(n>>8)&255,n&255]}
  function mixHex(a,b,t){const x=hexRgb(a),y=hexRgb(b);return hex(...x.map((v,i)=>Math.max(0,Math.min(255,Math.round(v+(y[i]-v)*t)))))}
  function safeLabel(v){return String(v||'').trim().replace(/\s+/g,' ')}
  function normalizeName(v){return safeLabel(v).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'animation'}
  function uniquePalette(frames){
    const count=new Map();
    for(const frame of frames)for(const c of frame)if(c)count.set(c,(count.get(c)||0)+1);
    return [...count.entries()].sort((a,b)=>b[1]-a[1]);
  }
  function currentPalette(max=256){return uniquePalette(core().getFrames()).slice(0,max).map(([c])=>c)}

  async function fileToCanvas(file){
    const url=URL.createObjectURL(file);
    try{
      const img=await new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=reject;im.src=url});
      const c=document.createElement('canvas');c.width=img.naturalWidth;c.height=img.naturalHeight;
      const x=c.getContext('2d',{willReadFrequently:true});x.imageSmoothingEnabled=false;x.drawImage(img,0,0);
      return c;
    } finally {URL.revokeObjectURL(url)}
  }

  function imageDataToFrame(imageData,alphaThreshold=8){
    const out=new Array(imageData.width*imageData.height).fill(null),d=imageData.data;
    for(let i=0,p=0;i<d.length;i+=4,p++)if(d[i+3]>=alphaThreshold)out[p]=hex(d[i],d[i+1],d[i+2]);
    return out;
  }

  function canvasToFrame(canvas,x=0,y=0,w=canvas.width,h=canvas.height){
    const ctx=canvas.getContext('2d',{willReadFrequently:true});
    return imageDataToFrame(ctx.getImageData(x,y,w,h));
  }

  function drawPixelPreview(canvas,imageData,fit=true){
    if(!canvas||!imageData)return;
    const temp=document.createElement('canvas');temp.width=imageData.width;temp.height=imageData.height;
    temp.getContext('2d').putImageData(imageData,0,0);
    const maxW=canvas.clientWidth||220,maxH=canvas.clientHeight||160;
    const scale=fit?Math.max(1,Math.floor(Math.min(maxW/imageData.width,maxH/imageData.height))):1;
    canvas.width=imageData.width*scale;canvas.height=imageData.height*scale;
    const ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;ctx.clearRect(0,0,canvas.width,canvas.height);ctx.drawImage(temp,0,0,canvas.width,canvas.height);
  }

  async function onImageFile(file){
    if(!file)return;
    sourceImage=await fileToCanvas(file);sourceName=file.name.replace(/\.[^.]+$/,'');snappedResult=null;
    $('sheetW').textContent=sourceImage.width;$('sheetH').textContent=sourceImage.height;
    const data=sourceImage.getContext('2d').getImageData(0,0,sourceImage.width,sourceImage.height);
    drawPixelPreview($('snapPreview'),data);
    status('Loaded '+file.name+' ('+sourceImage.width+'×'+sourceImage.height+').');
  }

  async function onJsonFile(file){
    if(!file)return;
    sourceJson=JSON.parse(await file.text());
    const sheet=sourceJson?.spritesheet,cell=sheet?.cell_size||sourceJson?.character?.size;
    if(cell?.width)$('cellW').value=cell.width;
    if(cell?.height)$('cellH').value=cell.height;
    if(sheet?.columns)$('sheetCols').value=sheet.columns;
    if(sourceJson?.character?.name) core().setPrompt(sourceJson.character.name);
    status('Loaded sprite metadata '+file.name+'. Cell size and animation rows detected.');
  }

  function sourceImageData(){
    if(!sourceImage)throw new Error('Choose an image first.');
    return sourceImage.getContext('2d',{willReadFrequently:true}).getImageData(0,0,sourceImage.width,sourceImage.height);
  }

  function runSnap(){
    if(!snapper())throw new Error('Pixel Snapper engine is not loaded.');
    const colors=Math.max(1,Math.min(256,Number($('snapColors').value)||16));
    const px=$('snapPixelSize').value.trim()===''?null:Number($('snapPixelSize').value);
    const palette=$('snapUsePalette').checked?currentPalette():null;
    status('Running Pixel Snapper locally…');
    snappedResult=snapper().process(sourceImageData(),{colors,pixelSize:px,palette});
    drawPixelPreview($('snapPreview'),snappedResult.imageData);
    $('snapResultInfo').textContent='Detected ≈ '+snappedResult.pixelSize.toFixed(2)+' px · output '+snappedResult.imageData.width+'×'+snappedResult.imageData.height;
    status('Pixel Snapper complete. The result is a true regular pixel grid.');
  }

  function openSnapped(){
    if(!snappedResult)runSnap();
    const img=snappedResult.imageData;
    core().replaceDocument({width:img.width,height:img.height,frames:[imageDataToFrame(img)]});
    paletteBaseFrames=null;
    core().setPrompt(sourceName||'snapped-pixel-art');
    clearAnimationMap();
    clearOverlays();
    status('Opened snapped image as an editable Pixel Studio frame.');
  }

  function mappingFromJson(meta,columns){
    const map={};
    const rows=meta?.spritesheet?.rows;
    if(!Array.isArray(rows))return map;
    for(const row of rows){
      const rowIndex=Number(row.row)||0,base=rowIndex*columns,count=Math.max(1,Number(row.frame_count)||columns);
      if(row.type==='rotations'&&Array.isArray(row.directions)){
        const action='Rotations';map[action]=map[action]||{};
        row.directions.slice(0,count).forEach((dir,i)=>{map[action][dir]=[base+i]});
      }else{
        const action=safeLabel(row.animation||row.name||'Animation'),dir=safeLabel(row.direction||'default');
        map[action]=map[action]||{};map[action][dir]=Array.from({length:count},(_,i)=>base+i);
      }
    }
    return map;
  }

  function importSheet(){
    if(!sourceImage)throw new Error('Choose a sprite-sheet PNG first.');
    const cw=Math.max(1,Number($('cellW').value)||32),ch=Math.max(1,Number($('cellH').value)||32);
    const cols=Math.max(1,Number($('sheetCols').value)||Math.floor(sourceImage.width/cw));
    const rows=Math.floor(sourceImage.height/ch),maxFrames=cols*rows,frames=[];
    for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){
      if(c*cw+cw>sourceImage.width||r*ch+ch>sourceImage.height)continue;
      frames.push(canvasToFrame(sourceImage,c*cw,r*ch,cw,ch));
    }
    if(!frames.length)throw new Error('No complete cells fit the selected frame size.');
    core().replaceDocument({width:cw,height:ch,frames});
    paletteBaseFrames=null;
    core().setPrompt(sourceJson?.character?.name||sourceName||'imported-sprite');
    clearOverlays();
    animationMap=sourceJson?mappingFromJson(sourceJson,cols):{};
    renderAnimationMap();
    $('frameCountImported').textContent=frames.length+' frames';
    status('Imported '+frames.length+' editable frames from '+cols+' columns × '+rows+' rows.'+(Object.keys(animationMap).length?' Animation mapping loaded from JSON.':''));
  }

  function clearAnimationMap(){animationMap={};renderAnimationMap()}
  function addAnimationMapping(){
    const action=safeLabel($('mapAction').value),dir=safeLabel($('mapDirection').value||'default');
    const start=Math.max(1,Number($('mapStart').value)||1)-1,count=Math.max(1,Number($('mapCount').value)||1);
    const state=core().getState(),indices=[];
    for(let i=0;i<count&&start+i<state.frameCount;i++)indices.push(start+i);
    if(!action||!indices.length)return;
    animationMap[action]=animationMap[action]||{};animationMap[action][dir]=indices;renderAnimationMap();
    status('Mapped '+action+' / '+dir+' to '+indices.length+' frame'+(indices.length===1?'':'s')+'.');
  }
  function removeMap(action,dir){if(animationMap[action]){delete animationMap[action][dir];if(!Object.keys(animationMap[action]).length)delete animationMap[action]}renderAnimationMap()}
  function mappingEntries(){const out=[];for(const [action,dirs] of Object.entries(animationMap))for(const [dir,indices] of Object.entries(dirs))out.push({action,dir,indices});return out}
  function renderAnimationMap(){
    const host=$('animationMapList');if(!host)return;host.innerHTML='';
    const entries=mappingEntries();
    if(!entries.length){host.innerHTML='<div class="labEmpty">No mappings yet. Import compatible JSON or add one manually.</div>';stopMapPreview();return}
    for(const item of entries){
      const row=document.createElement('div');row.className='mapRow';
      const info=document.createElement('button');info.className='mapInfo';info.type='button';info.innerHTML='<strong>'+item.action+'</strong><span>'+item.dir+' · '+item.indices.map(i=>i+1).join(', ')+'</span>';
      info.onclick=()=>playMapPreview(item);
      const del=document.createElement('button');del.className='miniDanger';del.type='button';del.textContent='×';del.onclick=()=>removeMap(item.action,item.dir);
      row.append(info,del);host.appendChild(row);
    }
  }
  function stopMapPreview(){clearInterval(mapPreviewTimer);mapPreviewTimer=null;mapPreviewKey=null}
  function playMapPreview(item){
    stopMapPreview();mapPreviewKey=item.action+'|'+item.dir;let n=0;
    const canvas=$('mapPreview'),ctx=canvas.getContext('2d');
    const draw=()=>{
      const index=item.indices[n%item.indices.length],src=core().frameCanvas(core().getFrame(index),index);
      canvas.width=Math.max(64,src.width*3);canvas.height=Math.max(64,src.height*3);ctx.imageSmoothingEnabled=false;ctx.clearRect(0,0,canvas.width,canvas.height);
      const scale=Math.max(1,Math.floor(Math.min(canvas.width/src.width,canvas.height/src.height))),w=src.width*scale,h=src.height*scale;
      ctx.drawImage(src,Math.floor((canvas.width-w)/2),Math.floor((canvas.height-h)/2),w,h);n++;
      $('mapPreviewLabel').textContent=item.action+' · '+item.dir;
    };
    draw();mapPreviewTimer=setInterval(draw,1000/Math.max(1,core().getFps()));
  }

  function renderPaletteMapper(){
    const host=$('paletteMapList');host.innerHTML='';
    const entries=uniquePalette(paletteBaseFrames||core().getFrames()).slice(0,96);
    if(!entries.length){host.innerHTML='<div class="labEmpty">No colours in the current artwork.</div>';return}
    for(const [source,count] of entries){
      const row=document.createElement('div');row.className='paletteMapRow';row.dataset.source=source;
      row.innerHTML='<span class="sourceSwatch" style="background:'+source+'" title="'+source+'"></span>'+
        '<code>'+source+'</code><span class="colourCount">'+count+'</span>'+
        '<input class="paletteSlotName" type="text" placeholder="group e.g. jacket">'+
        '<input class="paletteTarget" type="color" value="'+source+'">';
      host.appendChild(row);
    }
    status('Found '+entries.length+' visible colours. Name important colour slots if you want reusable variants.');
  }

  function currentPaletteMapping(){
    const map={};
    document.querySelectorAll('.paletteMapRow').forEach(row=>{
      const source=row.dataset.source,target=row.querySelector('.paletteTarget').value.toLowerCase(),name=safeLabel(row.querySelector('.paletteSlotName').value);
      map[source.toLowerCase()]={target,name};
    });
    return map;
  }

  function capturePaletteBase(){paletteBaseFrames=core().getFrames();renderPaletteMapper();status('Captured the current artwork as the base for reusable character variants.')}
  function colourDistance(a,b){const x=hexRgb(a),y=hexRgb(b),dr=x[0]-y[0],dg=x[1]-y[1],db=x[2]-y[2];return Math.sqrt(dr*dr+dg*dg+db*db)}
  function remapColour(c,mapping){
    if(!c)return c;
    const key=c.toLowerCase(),exact=mapping[key];
    if(exact&&exact.target.toLowerCase()!==key)return exact.target;
    if(!$('paletteShadeFamily')?.checked)return exact?.target||c;
    const tolerance=Math.max(0,Number($('paletteTolerance')?.value)||0);
    if(!tolerance)return exact?.target||c;
    let best=null,bestD=Infinity,bestSource=null;
    for(const [source,entry] of Object.entries(mapping)){
      if(!entry?.target||entry.target.toLowerCase()===source.toLowerCase())continue;
      const d=colourDistance(key,source);
      if(d<=tolerance&&d<bestD){bestD=d;best=entry;bestSource=source}
    }
    if(!best)return exact?.target||c;
    const src=hexRgb(bestSource),tar=hexRgb(best.target),cur=hexRgb(key);
    return hex(
      Math.max(0,Math.min(255,Math.round(tar[0]+(cur[0]-src[0])*.72))),
      Math.max(0,Math.min(255,Math.round(tar[1]+(cur[1]-src[1])*.72))),
      Math.max(0,Math.min(255,Math.round(tar[2]+(cur[2]-src[2])*.72)))
    );
  }
  function applyPaletteMapping(mapping=currentPaletteMapping()){
    const base=paletteBaseFrames||core().getFrames();
    const next=base.map(frame=>frame.map(c=>remapColour(c,mapping)));
    core().replaceFrames(next);
    if(window.PixelStudioOverlays?.remap)window.PixelStudioOverlays.remap(mapping);
    renderPaletteMapper();status('Applied palette remap across every animation frame and overlay, including related shades.');
  }

  function variantsStore(){try{return JSON.parse(localStorage.getItem('pixelStudioVariants')||'{}')}catch(_){return{}}}
  function saveVariant(){
    const name=safeLabel($('variantName').value);if(!name)return status('Give the palette variant a name first.');
    const all=variantsStore();all[name]={mapping:currentPaletteMapping(),shadeFamily:$('paletteShadeFamily').checked,tolerance:Number($('paletteTolerance').value)||0};
    localStorage.setItem('pixelStudioVariants',JSON.stringify(all));renderVariantSelect(name);status('Saved palette variant "'+name+'" on this device.');
  }
  function renderVariantSelect(selectName){
    const sel=$('variantSelect'),all=variantsStore();sel.innerHTML='<option value="">Saved variants…</option>';
    Object.keys(all).sort().forEach(name=>{const o=document.createElement('option');o.value=name;o.textContent=name;sel.appendChild(o)});
    if(selectName)sel.value=selectName;
  }
  function loadVariant(){
    const name=$('variantSelect').value,all=variantsStore(),record=all[name];if(!record)return;
    const map=record.mapping||record;
    if(record.mapping){$('paletteShadeFamily').checked=record.shadeFamily!==false;$('paletteTolerance').value=record.tolerance??48}
    document.querySelectorAll('.paletteMapRow').forEach(row=>{
      const saved=map[row.dataset.source.toLowerCase()];if(saved){row.querySelector('.paletteTarget').value=saved.target;row.querySelector('.paletteSlotName').value=saved.name||''}
    });status('Loaded variant "'+name+'". Press Apply palette to commit it.');
  }

  function overlayById(id){return overlays.find(l=>l.id===id)||null}
  function normalizeTransforms(layer){
    const count=core().getState().frameCount;
    while(layer.transforms.length<count)layer.transforms.push({...layer.transforms[layer.transforms.length-1]||{x:0,y:0,flipH:false,flipV:false,tint:null,tintAmount:0}});
    if(layer.transforms.length>count)layer.transforms.length=count;
  }
  function createOverlay(name,type,w,h,pixels,x=0,y=0){
    const layer={id:'overlay-'+overlaySeq++,name:name||('Overlay '+overlaySeq),type:type||'accessory',visible:true,w,h,pixels:pixels.slice(),transforms:[]};
    layer.transforms=Array.from({length:core().getState().frameCount},()=>({x,y,flipH:false,flipV:false,tint:null,tintAmount:0}));
    overlays.push(layer);activeOverlayId=layer.id;renderOverlays();core().renderAll();return layer;
  }
  function overlayTypeName(){const t=$('overlayType').value;return t.charAt(0).toUpperCase()+t.slice(1)}
  function selectionOverlay(lift=false){
    const sel=core().getSelectionData();if(!sel)return status('Use Select to mark pixels first.');
    const layer=createOverlay(overlayTypeName(),$('overlayType').value,sel.w,sel.h,sel.data,sel.x,sel.y);
    if(lift&&core().removeSelection)core().removeSelection();
    status((lift?'Lifted':'Copied')+' selected pixels into a non-destructive '+layer.type+' overlay.');
  }
  async function importOverlay(file){
    if(!file)return;const c=await fileToCanvas(file),pixels=canvasToFrame(c),state=core().getState();
    createOverlay(file.name.replace(/\.[^.]+$/,''),'accessory',c.width,c.height,pixels,Math.round((state.width-c.width)/2),Math.round((state.height-c.height)/2));
    status('Imported '+file.name+' as an overlay layer.');
  }
  function transformFor(layer,frameIndex){normalizeTransforms(layer);return layer.transforms[Math.max(0,Math.min(layer.transforms.length-1,frameIndex))]}
  function tinted(c,t,amount){return !t||!amount?c:mixHex(c,t,amount)}
  function compose(base,frameIndex,w,h){
    const out=base.slice();
    for(const layer of overlays){
      if(!layer.visible)continue;
      const tr=transformFor(layer,frameIndex);
      for(let sy=0;sy<layer.h;sy++)for(let sx=0;sx<layer.w;sx++){
        const srcX=tr.flipH?layer.w-1-sx:sx,srcY=tr.flipV?layer.h-1-sy:sy,c=layer.pixels[srcY*layer.w+srcX];
        if(!c)continue;const x=tr.x+sx,y=tr.y+sy;if(x<0||y<0||x>=w||y>=h)continue;
        out[y*w+x]=tinted(c,tr.tint,tr.tintAmount);
      }
    }
    return out;
  }
  function renderOverlays(){
    const host=$('overlayList');host.innerHTML='';
    if(!overlays.length){host.innerHTML='<div class="labEmpty">No overlays. Select pixels or import a transparent PNG.</div>';activeOverlayId=null;syncOverlayControls();return}
    for(const layer of overlays){
      normalizeTransforms(layer);
      const row=document.createElement('button');row.type='button';row.className='overlayRow'+(layer.id===activeOverlayId?' active':'');
      row.innerHTML='<span class="eye">'+(layer.visible?'●':'○')+'</span><span><strong>'+layer.name+'</strong><small>'+layer.type+' · '+layer.w+'×'+layer.h+'</small></span>';
      row.onclick=()=>{activeOverlayId=layer.id;renderOverlays()};host.appendChild(row);
    }
    syncOverlayControls();
  }
  function syncOverlayControls(){
    const layer=overlayById(activeOverlayId),disabled=!layer;
    ['overlayX','overlayY','overlayVisible','overlayTint','overlayTintAmount','overlayFlipH','overlayFlipV','overlayDelete','overlayAllFrames'].forEach(id=>{if($(id))$(id).disabled=disabled});
    if(!layer)return;
    const tr=transformFor(layer,core().getState().current);
    $('overlayX').value=tr.x;$('overlayY').value=tr.y;$('overlayVisible').checked=layer.visible;$('overlayTint').value=tr.tint||'#ffffff';$('overlayTintAmount').value=Math.round((tr.tintAmount||0)*100);
    $('overlayFlipH').classList.toggle('active',!!tr.flipH);$('overlayFlipV').classList.toggle('active',!!tr.flipV);
  }
  function updateOverlayTransform(){
    const layer=overlayById(activeOverlayId);if(!layer)return;const tr=transformFor(layer,core().getState().current);
    tr.x=Number($('overlayX').value)||0;tr.y=Number($('overlayY').value)||0;layer.visible=$('overlayVisible').checked;
    const amt=Math.max(0,Math.min(100,Number($('overlayTintAmount').value)||0))/100;tr.tintAmount=amt;tr.tint=amt?$('overlayTint').value:null;
    core().renderAll();
  }
  function flipOverlay(axis){
    const layer=overlayById(activeOverlayId);if(!layer)return;const tr=transformFor(layer,core().getState().current);tr[axis]=!tr[axis];renderOverlays();core().renderAll();
  }
  function nudgeOverlay(dx,dy){
    const layer=overlayById(activeOverlayId);if(!layer)return;const tr=transformFor(layer,core().getState().current);tr.x+=dx;tr.y+=dy;renderOverlays();core().renderAll();
  }
  function overlayAllFrames(){
    const layer=overlayById(activeOverlayId);if(!layer)return;const current={...transformFor(layer,core().getState().current)};
    layer.transforms=Array.from({length:core().getState().frameCount},()=>({...current}));renderOverlays();core().renderAll();status('Copied this overlay position/style to every frame.');
  }
  function deleteOverlay(){const i=overlays.findIndex(l=>l.id===activeOverlayId);if(i<0)return;overlays.splice(i,1);activeOverlayId=overlays[0]?.id||null;renderOverlays();core().renderAll()}
  function clearOverlays(){overlays.splice(0);activeOverlayId=null;renderOverlays();core()?.renderAll()}
  function bakeOverlays(){
    if(!overlays.length)return;const st=core().getState(),next=core().getFrames().map((f,i)=>compose(f,i,st.width,st.height));
    clearOverlays();core().replaceFrames(next);status('Baked all overlays into the editable animation frames.');
  }
  function remapOverlays(mapping){
    for(const layer of overlays)layer.pixels=layer.pixels.map(c=>remapColour(c,mapping));
    core().renderAll();
  }

  function refreshAdvanced(){
    renderAnimationMap();renderVariantSelect();renderOverlays();
  }

  window.PixelStudioOverlays={compose,remap:remapOverlays,clear:clearOverlays};
  window.PixelStudioAdvanced={getAnimationMap:()=>animationMap,setAnimationMap:v=>{animationMap=v||{};renderAnimationMap()},refresh:refreshAdvanced};

  function bind(){
    $('assetImage').addEventListener('change',e=>onImageFile(e.target.files[0]).catch(err=>status(err.message)));
    $('assetJson').addEventListener('change',e=>onJsonFile(e.target.files[0]).catch(err=>status(err.message)));
    $('snapRun').onclick=()=>{try{runSnap()}catch(err){status(err.message)}};
    $('snapOpen').onclick=()=>{try{openSnapped()}catch(err){status(err.message)}};
    $('sheetImport').onclick=()=>{try{importSheet()}catch(err){status(err.message)}};
    $('mapAdd').onclick=addAnimationMapping;$('mapClear').onclick=clearAnimationMap;
    $('paletteScan').onclick=capturePaletteBase;$('paletteApply').onclick=()=>applyPaletteMapping();$('variantSave').onclick=saveVariant;$('variantSelect').onchange=loadVariant;
    $('overlayCopy').onclick=()=>selectionOverlay(false);$('overlayLift').onclick=()=>selectionOverlay(true);$('overlayImportBtn').onclick=()=>$('overlayImport').click();
    $('overlayImport').addEventListener('change',e=>importOverlay(e.target.files[0]).catch(err=>status(err.message)));
    ['overlayX','overlayY','overlayTint','overlayTintAmount'].forEach(id=>$(id).addEventListener('input',updateOverlayTransform));
    $('overlayVisible').onchange=updateOverlayTransform;$('overlayFlipH').onclick=()=>flipOverlay('flipH');$('overlayFlipV').onclick=()=>flipOverlay('flipV');
    $('overlayLeft').onclick=()=>nudgeOverlay(-1,0);$('overlayRight').onclick=()=>nudgeOverlay(1,0);$('overlayUp').onclick=()=>nudgeOverlay(0,-1);$('overlayDown').onclick=()=>nudgeOverlay(0,1);
    $('overlayAllFrames').onclick=overlayAllFrames;$('overlayDelete').onclick=deleteOverlay;$('overlayBake').onclick=bakeOverlays;
    renderVariantSelect();renderPaletteMapper();refreshAdvanced();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind);else bind();
})();
