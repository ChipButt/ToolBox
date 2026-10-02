(function(){
'use strict';
const $=id=>document.getElementById(id);
const defs=[
 ['Idle','front',0,2],['Idle','rear',1,2],['Idle','right',2,2],['Idle','left',3,2],
 ['Walk','front',4,4],['Walk','rear',5,4],['Walk','right',6,4],['Walk','left',7,4],
 ['Jump','front',8,4],['Jump','rear',9,4],['Jump','right',10,4],['Jump','left',11,4],
 ['Death','front',12,4],['Death','rear',13,4],['Death','right',14,4],['Death','left',15,4],
 ['Chop','front-left',16,4],['Chop','front-right',17,4],['Chop','rear-right',18,4],['Chop','rear-left',19,4],['Chop','side-right',20,4],['Chop','side-left',21,4],
 ['Pickup','front',22,4],['Pickup','rear',23,4],['Pickup','right',24,4],['Pickup','left',25,4]
];
let baseFrames=null, masterIndex=0, semanticLayers=[], activeAnimation=0;
function core(){return window.PixelStudioCore}
function advanced(){return window.PixelStudioAdvanced}
function tell(s){core()?.setStatus?.(s);const e=$('characterBuilderStatus');if(e)e.textContent=s}
function hex2(n){return n.toString(16).padStart(2,'0')}
function rgbaHex(r,g,b,a){return a<20?null:'#'+hex2(r)+hex2(g)+hex2(b)}
function loadImage(src){return new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>reject(new Error('Could not load 16×16 character base.'));im.src=src})}
function frameFromCell(image,x,y){const c=document.createElement('canvas');c.width=16;c.height=16;const ctx=c.getContext('2d',{willReadFrequently:true});ctx.clearRect(0,0,16,16);ctx.drawImage(image,x,y,16,16,0,0,16,16);const d=ctx.getImageData(0,0,16,16).data,out=[];for(let i=0;i<d.length;i+=4)out.push(rgbaHex(d[i],d[i+1],d[i+2],d[i+3]));return out}
function buildMap(){const map={};let cursor=0;for(const [action,dir,row,count] of defs){map[action]=map[action]||{};map[action][dir]=Array.from({length:count},(_,i)=>cursor+i);cursor+=count}return map}
async function loadBase(){
 const image=await loadImage('character-base-16.png?v=1');const frames=[];
 for(const def of defs){const row=def[2],count=def[3];for(let col=0;col<count;col++)frames.push(frameFromCell(image,col*16,row*16))}
 core().replaceDocument({width:16,height:16,frames});core().setPrompt('16x16-character');core().setFps(6);advanced()?.setAnimationMap?.(buildMap());
 baseFrames=frames.map(f=>f.slice());masterIndex=0;semanticLayers=[];activeAnimation=0;renderLayers();syncAnimationSelect();core().setCurrent(0);tell('Loaded the complete 16×16 base character with '+frames.length+' animation frames. Edit the master, then propagate styling and tweak animations individually.');
}
function animationEntries(){const map=advanced()?.getAnimationMap?.()||{};const out=[];for(const [action,dirs] of Object.entries(map))for(const [dir,indices] of Object.entries(dirs))out.push({action,dir,indices});return out}
function syncAnimationSelect(){const s=$('characterAnimation');if(!s)return;const items=animationEntries();s.innerHTML='';items.forEach((a,i)=>{const o=document.createElement('option');o.value=i;o.textContent=a.action+' · '+a.dir+' ('+a.indices.length+' frames)';s.appendChild(o)});s.value=Math.min(activeAnimation,Math.max(0,items.length-1));updateAnimationLabel()}
function updateAnimationLabel(){const items=animationEntries(),a=items[Number($('characterAnimation')?.value)||0];if(!a)return;const cur=core().getState().current,step=Math.max(0,a.indices.indexOf(cur));if($('characterAnimationInfo'))$('characterAnimationInfo').textContent='Frames '+a.indices.map(i=>i+1).join(', ')+' · current '+(step+1)+'/'+a.indices.length}
function openAnimation(){const items=animationEntries(),i=Number($('characterAnimation').value)||0,a=items[i];if(!a)return;activeAnimation=i;core().setCurrent(a.indices[0]);updateAnimationLabel()}
function stepAnimation(delta){const items=animationEntries(),a=items[Number($('characterAnimation').value)||0];if(!a)return;const cur=core().getState().current,pos=a.indices.indexOf(cur),next=a.indices[(Math.max(0,pos)+delta+a.indices.length)%a.indices.length];core().setCurrent(next);updateAnimationLabel()}
function setMaster(){masterIndex=core().getState().current;if(!baseFrames)baseFrames=core().getFrames();$('masterFrameInfo').textContent='Master frame: '+(masterIndex+1);tell('Frame '+(masterIndex+1)+' is now the styling master.');}
function nearestSourcePixel(ref,x,y,source,radius=2){let best=-1,bestD=999;for(let yy=Math.max(0,y-radius);yy<=Math.min(15,y+radius);yy++)for(let xx=Math.max(0,x-radius);xx<=Math.min(15,x+radius);xx++){const i=yy*16+xx;if(ref[i]!==source)continue;const d=Math.abs(xx-x)+Math.abs(yy-y);if(d<bestD){best=i;bestD=d}}return best}
function applyMaster(){
 if(!baseFrames||baseFrames.length!==core().getState().frameCount)return tell('Load the 16×16 base character first.');
 const edited=core().getFrame(masterIndex),base=baseFrames[masterIndex],changes=[];for(let i=0;i<256;i++)if(edited[i]!==base[i])changes.push({i,x:i%16,y:Math.floor(i/16),from:base[i],to:edited[i]});
 if(!changes.length)return tell('No master-frame changes to propagate yet.');
 const next=core().getFrames();
 for(let fi=0;fi<next.length;fi++){
   if(fi===masterIndex)continue;const ref=baseFrames[fi],out=next[fi],used=new Set();
   for(const ch of changes){
     if(ch.from){const hit=nearestSourcePixel(ref,ch.x,ch.y,ch.from,2);if(hit>=0&&!used.has(hit)){out[hit]=ch.to;used.add(hit)}}
     else if(ch.to&&!ref[ch.i])out[ch.i]=ch.to;
   }
 }
 core().replaceFrames(next);tell('Applied '+changes.length+' master styling changes across all animations. Movement is preserved; now browse each animation and tweak any frame that needs hand correction.');
}
function selectionPixels(){const sel=core().getSelectionData?.();if(!sel)return null;const items=[];for(let y=0;y<sel.h;y++)for(let x=0;x<sel.w;x++){const c=sel.data[y*sel.w+x];if(c)items.push({x:sel.x+x,y:sel.y+y,index:(sel.y+y)*16+sel.x+x,color:c})}return{sel,items}}
function layerById(id){return semanticLayers.find(l=>l.id===id)}
function activeLayer(){return layerById($('semanticLayerSelect')?.value)}
function createLayer(){
 const name=($('semanticLayerName').value||'').trim(),pick=selectionPixels();if(!name)return tell('Name the layer first, for example Hair or Shirt.');if(!pick||!pick.items.length)return tell('Use the Select tool to select visible pixels first.');
 const current=core().getState().current,colors=[...new Set(pick.items.map(p=>p.color))],masks={};masks[current]=pick.items.map(p=>p.index);
 const frames=core().getFrames();for(let fi=0;fi<frames.length;fi++){if(fi===current)continue;const idxs=[];for(let y=pick.sel.y;y<pick.sel.y+pick.sel.h;y++)for(let x=pick.sel.x;x<pick.sel.x+pick.sel.w;x++){const i=y*16+x;if(colors.includes(frames[fi][i]))idxs.push(i)}masks[fi]=idxs}
 const layer={id:'part-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,6),name,sourceFrame:current,sourceColors:colors,selection:{x:pick.sel.x,y:pick.sel.y,w:pick.sel.w,h:pick.sel.h},masks};semanticLayers.push(layer);renderLayers(layer.id);tell('Created semantic layer “'+name+'” and propagated an initial mask across every frame. You can correct any animation frame with Update current frame mask.');
}
function updateLayerMask(){const layer=activeLayer(),pick=selectionPixels();if(!layer)return tell('Choose a semantic layer first.');if(!pick||!pick.items.length)return tell('Select the pixels that belong to this layer on the current frame.');const fi=core().getState().current;layer.masks[fi]=pick.items.map(p=>p.index);layer.sourceColors=[...new Set(layer.sourceColors.concat(pick.items.map(p=>p.color)))];renderLayers(layer.id);tell('Updated “'+layer.name+'” mask for frame '+(fi+1)+'.');}
function recolorLayer(){const layer=activeLayer();if(!layer)return tell('Choose a semantic layer first.');const color=$('semanticLayerColor').value,next=core().getFrames();for(const [fi,indices] of Object.entries(layer.masks))for(const idx of indices)if(next[Number(fi)]?.[idx])next[Number(fi)][idx]=color;core().replaceFrames(next);tell('Recoloured “'+layer.name+'” across every mapped animation frame.');}
function deleteLayer(){const layer=activeLayer();if(!layer)return;semanticLayers=semanticLayers.filter(l=>l.id!==layer.id);renderLayers();tell('Deleted semantic layer “'+layer.name+'”.');}
function renderLayers(selectId){const sel=$('semanticLayerSelect'),list=$('semanticLayerList');if(!sel||!list)return;sel.innerHTML='<option value="">Choose layer…</option>';for(const l of semanticLayers){const o=document.createElement('option');o.value=l.id;o.textContent=l.name;sel.appendChild(o)}if(selectId)sel.value=selectId;list.innerHTML=semanticLayers.length?semanticLayers.map(l=>'<div class="characterPartRow"><strong>'+escapeHtml(l.name)+'</strong><span>'+l.sourceColors.join(', ')+' · '+Object.values(l.masks).reduce((s,a)=>s+a.length,0)+' mapped pixels</span></div>').join(''):'<div class="labEmpty">No named artwork layers yet.</div>'}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function charName(){return (($('characterExportName')?.value||'character').trim().toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,''))||'character'}
async function exportCharacter(){
 const st=core().getState(),frames=core().getFrames(),cols=4,rows=Math.ceil(frames.length/cols),sheet=document.createElement('canvas');sheet.width=st.width*cols;sheet.height=st.height*rows;const ctx=sheet.getContext('2d');ctx.imageSmoothingEnabled=false;ctx.clearRect(0,0,sheet.width,sheet.height);
 frames.forEach((f,i)=>ctx.drawImage(core().frameCanvas(f,i),(i%cols)*st.width,Math.floor(i/cols)*st.height));
 const animations=advanced()?.getAnimationMap?.()||{},frameMeta=frames.map((_,i)=>({index:i,x:(i%cols)*st.width,y:Math.floor(i/cols)*st.height,w:st.width,h:st.height}));
 const parts=semanticLayers.map(l=>({name:l.name,sourceColors:l.sourceColors,selection:l.selection,frames:Object.fromEntries(Object.entries(l.masks).map(([k,v])=>[k,v.map(index=>({index,x:index%st.width,y:Math.floor(index/st.width)}))]))}));
 const meta={format:'ChipInCharacterSprite',version:1,name:charName(),frameWidth:st.width,frameHeight:st.height,columns:cols,rows,frameCount:frames.length,fps:core().getFps(),frames:frameMeta,animations,parts};
 core().downloadBlob(await core().canvasBlob(sheet),charName()+'-spritesheet.png');core().downloadBlob(new Blob([JSON.stringify(meta,null,2)],{type:'application/json'}),charName()+'-spritesheet.json');tell('Exported one transparent character spritesheet PNG plus JSON with animation mappings and '+parts.length+' semantic layer'+(parts.length===1?'':'s')+'.');
}
function inject(){
 const assetLab=document.querySelector('.assetLab');if(!assetLab||$('characterBuilder'))return;
 const style=document.createElement('style');style.textContent='.characterBuilder{padding:13px;margin-bottom:14px}.characterBuilderGrid{display:grid;grid-template-columns:1.05fr 1fr 1fr;gap:10px}.characterBuilderCard{border:1px solid var(--line);border-radius:12px;background:#101720;padding:11px;display:grid;gap:9px}.characterBuilderCard h3{margin:0;font-size:14px}.characterBuilderCard p{margin:0;color:var(--muted);font-size:11px;line-height:1.4}.characterPartRow{border:1px solid #273548;border-radius:8px;padding:7px 8px;background:#0b1118}.characterPartRow strong{display:block;font-size:11px}.characterPartRow span{display:block;color:var(--muted);font-size:9px;margin-top:2px}.characterPartList{display:grid;gap:5px;max-height:130px;overflow:auto}.charButtons{display:flex;gap:6px;flex-wrap:wrap}.charButtons .btn{padding:8px 10px;font-size:11px}@media(max-width:950px){.characterBuilderGrid{grid-template-columns:1fr}}';document.head.appendChild(style);
 const sec=document.createElement('section');sec.id='characterBuilder';sec.className='panel characterBuilder';sec.innerHTML='<div class="assetLabHead"><div><h2>16×16 Character Builder</h2><p>Start from the supplied complete animation base, style one master frame, refine each animation, name recolourable body parts, then export one game-ready sprite sheet + JSON.</p></div><div class="freeBadge">96 BASE FRAMES</div></div><div class="characterBuilderGrid">'+
 '<div class="characterBuilderCard"><h3>1 · Load & style the master</h3><p>The supplied base includes idle, walk, jump, death, chop and pickup animations in four directions where applicable.</p><button id="loadCharacterBase" class="btn primary">Load 16×16 base character</button><div class="charButtons"><button id="setCharacterMaster" class="btn">Set current as master</button><button id="applyCharacterMaster" class="btn good">Apply master styling to all animations</button></div><div id="masterFrameInfo" class="labNote">Master frame: 1</div></div>'+
 '<div class="characterBuilderCard"><h3>2 · Browse & tweak animations</h3><div class="field"><label>Animation</label><select id="characterAnimation"></select></div><div class="charButtons"><button id="characterPrevFrame" class="btn">← Frame</button><button id="characterOpenAnimation" class="btn primary">Open animation</button><button id="characterNextFrame" class="btn">Frame →</button></div><div id="characterAnimationInfo" class="labNote">Load the base character first.</div><p>Edits made after propagation affect only that frame, so you can hand-correct poses without destroying the rest of the character.</p></div>'+
 '<div class="characterBuilderCard"><h3>3 · Named artwork layers</h3><p>Select pixels with the normal Select tool, then save them as Hair, Skin, Shirt, Trousers, Shoes, etc. Colour and pixel membership are retained in JSON for game-time variants.</p><div class="field"><label>New layer name</label><input id="semanticLayerName" placeholder="Hair"></div><div class="charButtons"><button id="semanticLayerCreate" class="btn primary">Create from selection</button><button id="semanticLayerUpdate" class="btn">Update current frame mask</button></div><div class="field"><label>Existing layer</label><select id="semanticLayerSelect"><option value="">Choose layer…</option></select></div><div class="charButtons"><input id="semanticLayerColor" type="color" value="#7a4a2b"><button id="semanticLayerRecolor" class="btn good">Recolour layer on all frames</button><button id="semanticLayerDelete" class="btn danger">Delete</button></div><div id="semanticLayerList" class="characterPartList"><div class="labEmpty">No named artwork layers yet.</div></div></div>'+
 '</div><div class="characterBuilderCard" style="margin-top:10px"><h3>4 · Export finished character</h3><div class="labRow"><div class="field"><label>Character name</label><input id="characterExportName" value="character"></div><button id="exportCharacterPackage" class="btn primary">Export sprite sheet PNG + JSON</button></div><p>PNG contains every animation frame on a true-transparent 16×16 grid. JSON contains frame rectangles, animation groups/directions and named artwork-layer masks for recolouring in-game.</p><div id="characterBuilderStatus" class="labStatus">Ready.</div></div>';
 assetLab.parentNode.insertBefore(sec,assetLab);
 $('loadCharacterBase').onclick=()=>loadBase().catch(e=>tell(e.message));$('setCharacterMaster').onclick=setMaster;$('applyCharacterMaster').onclick=applyMaster;$('characterOpenAnimation').onclick=openAnimation;$('characterAnimation').onchange=openAnimation;$('characterPrevFrame').onclick=()=>stepAnimation(-1);$('characterNextFrame').onclick=()=>stepAnimation(1);$('semanticLayerCreate').onclick=createLayer;$('semanticLayerUpdate').onclick=updateLayerMask;$('semanticLayerRecolor').onclick=recolorLayer;$('semanticLayerDelete').onclick=deleteLayer;$('exportCharacterPackage').onclick=()=>exportCharacter().catch(e=>tell(e.message));renderLayers();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',inject);else inject();
})();