import {verifiedTier} from './cutouts.js';
import {loadImage,loadArt,visibleBounds,draw,FPS,FRAMES} from './render.js';
import {serviceSuggestion,merchSuggestion,typeTitle,priceFor,selectImage} from './suggestions.js?v=3';
import {encode} from './export.js';
const $=id=>document.getElementById(id),ctx=$('screen').getContext('2d',{alpha:false});
const scenes=Array.from({length:3},()=>({title:'',price:'',images:[null,null,null]}));
const audio=new Audio('art/swipes.m4a');
let templates=[],template=null,art=null,scene=0,view=0,frame=24,playing=false,raf,loadId=0,exporting=false,loadingImage=false;
let catalogPromise,downloadURL,scenePlans,types=[],building=false;
const status=message=>$('status').textContent=message;
function button(label,action){const b=document.createElement('button');b.textContent=label;b.onclick=action;return b}
function thumb(src,label){const im=new Image();im.loading='lazy';im.src=src;im.alt=label;return im}
function paint(i=frame){if(template&&art)draw(ctx,template,art,scenes,i)}
function seek(i){frame=Math.min(FRAMES-1,Math.max(0,i));$('seek').value=frame;$('clock').value=(frame/FPS).toFixed(2)+' s';paint()}
function stop(){playing=false;cancelAnimationFrame(raf);audio.pause();$('play').textContent='Play'}
function ready(){return template&&art&&!building&&!loadingImage&&!exporting&&scenes.every(s=>s.images[0])}
function refresh(){
  $('export').disabled=!ready();$('play').disabled=!art||exporting||building;$('seek').disabled=!art||exporting||building;
  $('cover').hidden=!!art;$('screen').hidden=!art;
  $('sceneEditor').hidden=!art;$('title').value=scenes[scene].title;$('price').value=scenes[scene].price;
  $('scenes').replaceChildren(...scenes.map((s,i)=>{const b=button('Scene '+(i+1),()=>{stop();scene=i;view=0;seek(i*84+24);refresh()});b.setAttribute('aria-pressed',scene===i);return b}));
  $('sceneHeading').textContent='Images for scene '+(scene+1);
  $('views').replaceChildren(...scenes[scene].images.map((im,i)=>{const b=button('View '+(i+1),()=>{stop();view=i;seek(scene*84+[24,42,66][i]);refresh()});b.setAttribute('aria-pressed',view===i);if(im)b.prepend(thumb(im.src,''));if(!scenePlans)return b;
    const card=document.createElement('div');card.className='view-card';card.append(b);
    if(im&&scenePlans[scene].pool.some(item=>item.url!==im.src)){const swap=button('Swap',()=>swapImage(i));swap.className='swap';swap.setAttribute('aria-label','Swap image '+(i+1));card.append(swap)}return card}));
  $('clear').hidden=!scenes[scene].images[view];paint();
}
function invalidate(){if(downloadURL){URL.revokeObjectURL(downloadURL);downloadURL=null;$('save').hidden=true}}
async function choose(id){
  stop();invalidate();const current=++loadId;template=templates.find(t=>t.id===id);art=null;$('template').value=id;refresh();
  ctx.clearRect(0,0,960,1200);if(!template){status('Choose an animation to begin.');return}
  status('Loading '+template.name+'…');
  try{const assets=await loadArt(template);if(current!==loadId)return;art=assets;seek(scene*84+[24,42,66][view]);refresh();status('Choose an image for each scene.')}
  catch{if(current===loadId){$('template').value='';status('Animation artwork could not load. Choose the animation again to retry.')}}
}
$('template').onchange=e=>choose(e.target.value);
$('browse').onclick=()=>{
  $('dialogTitle').textContent='Choose an animation';$('filters').replaceChildren();
  $('gallery').replaceChildren(...templates.map(t=>{const b=button(t.name,()=>{$('library').close();choose(t.id)});b.prepend(thumb('art/'+t.id+'-preview.jpg',''));return b}));$('library').showModal();
};
$('cover').onclick=()=>$('browse').click();
$('close').onclick=()=>$('library').close();
$('play').onclick=async()=>{
  if(playing){stop();return}
  if(frame===FRAMES-1)seek(0);
  playing=true;$('play').textContent='Pause';const first=frame,start=performance.now();audio.currentTime=first/FPS;audio.play().catch(()=>{});
  function tick(now){if(!playing)return;const i=first+Math.floor((now-start)*FPS/1000);seek(i);if(i>=FRAMES-1)stop();else raf=requestAnimationFrame(tick)}raf=requestAnimationFrame(tick);
};
$('seek').oninput=e=>{stop();seek(+e.target.value)};
for(const key of ['title','price'])$(key).oninput=e=>{invalidate();scenes[scene][key]=e.target.value;if(key==='price')scenes[scene].customPrice=true;paint()};
$('upload').onclick=()=>$('file').click();
async function assign(src,isFile){
  const dest=scenes[scene],slot=view;loadingImage=true;$('editing').disabled=true;stop();refresh();
  try{const image=await loadImage(src),previous=dest.images[slot];image.artBounds=visibleBounds(image);dest.images[slot]=image;if(previous?.src.startsWith('blob:'))URL.revokeObjectURL(previous.src);
    invalidate();status('Image added to scene '+(scene+1)+'.');return true
  }catch{if(isFile)URL.revokeObjectURL(src);status('That image could not be opened. Choose another image.');return false}
  finally{loadingImage=false;$('editing').disabled=false;refresh()}
}
$('file').onchange=async e=>{const file=e.target.files[0];e.target.value='';if(file)await assign(URL.createObjectURL(file),true)};
$('clear').onclick=()=>{const previous=scenes[scene].images[view];if(previous?.src.startsWith('blob:'))URL.revokeObjectURL(previous.src);scenes[scene].images[view]=null;invalidate();refresh()};
const shop='https://shop.chipinworks.co.uk';
async function fetchCatalog(){
  async function get(file){const r=await fetch(shop+'/data/'+file);if(!r.ok)throw Error();return r.json()}
  const [catalog,index]=await Promise.all([get('catalog.json'),get('product-first-v2.json')]);
  const products=new Map(catalog.products.filter(p=>p.active&&!p.hidden&&!p.testOnly&&p.printfulSyncProductId&&p.variants?.some(v=>v.active&&v.printfulSyncVariantId)).map(p=>[p.id,p]));
  return index.types.map(t=>({...t,designs:t.designs.filter(d=>products.has(d.shopProductId)).map(d=>({...d,product:products.get(d.shopProductId)}))})).filter(t=>t.designs.length);
}
function dropdown(label,rows,action){
  const wrapper=document.createElement('label'),select=document.createElement('select');select.setAttribute('aria-label',label);wrapper.append(label+' ',select);
  select.add(new Option('Choose…',''));rows.forEach((r,i)=>select.add(new Option(r.label,i)));select.onchange=()=>action(select.value===''?null:rows[+select.value]);return wrapper;
}
function gallery(product){
  const images=new Map();
  function add(url,label){if(typeof url!=='string'||!url)return;const link=new URL(url,shop);if(link.protocol==='https:'&&!images.has(link.href))images.set(link.href,label)}
  add(product.image,'Main image');product.gallery?.forEach((url,i)=>add(url,'Gallery '+(i+1)));
  for(const [colour,urls] of Object.entries(product.colourAngleGalleries||{}))if(Array.isArray(urls))urls.forEach((url,i)=>add(url,colour+' · '+(i+1)));
  for(const v of product.variants||[]){add(v.image,v.colour);for(const key of ['gallery','angleGallery'])if(Array.isArray(v[key]))v[key].forEach((url,i)=>add(url,v.colour+' · '+(i+1)))}
  return [...images];
}
$('merch').onclick=async()=>{
  stop();const dialog=$('library'),filters=$('filters'),grid=$('gallery');$('dialogTitle').textContent='Choose a merch mock-up';filters.replaceChildren();grid.textContent='Loading the shop catalogue…';dialog.showModal();
  try{catalogPromise??=fetchCatalog();const types=await catalogPromise;if(!dialog.open)return;
    grid.replaceChildren();const selectType=dropdown('Product type',types,type=>{
      filters.replaceChildren(selectType);grid.replaceChildren();if(!type)return;
      filters.append(dropdown('Design',type.designs,design=>{grid.replaceChildren();if(!design)return;
        grid.replaceChildren(...gallery(design.product).map(([url,label])=>{const b=button(label,async()=>{if(loadingImage)return;grid.inert=true;try{if(await assign(url,false)){
          if(view===0){
            const selected=scenes[scene];
            if(!selected.title)selected.title=design.label;
            if(!selected.price&&Number.isFinite(design.fromPricePence))selected.price='From '+new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP'}).format(design.fromPricePence/100);
            refresh()
          }
          dialog.close()
        }else $('dialogTitle').textContent='Image unavailable · choose another mock-up'}finally{grid.inert=false}});b.prepend(thumb(url,''));return b}))
      }));
    });filters.append(selectType)
  }catch{catalogPromise=null;grid.textContent='The shop catalogue could not load. Close and reopen to retry.'}
};
$('export').onclick=async()=>{
  if(!ready())return;stop();invalidate();exporting=true;$('editing').disabled=true;refresh();status('Preparing video…');
  try{const blob=await encode($('screen'),paint,p=>status('Exporting '+Math.round(p*100)+'%…'));
    const ext=blob.type.startsWith('video/mp4')?'mp4':'webm';downloadURL=URL.createObjectURL(blob);const a=$('save');a.href=downloadURL;a.download='chip-in-'+template.id+'.'+ext;a.textContent='Download '+ext.toUpperCase();a.hidden=false;a.click();status('Video ready. You can download it again below.')
  }catch(e){status('Export failed. '+e.message)}finally{exporting=false;$('editing').disabled=false;refresh();seek(frame)}
};
try{const r=await fetch('templates.json');if(!r.ok)throw Error();templates=await r.json();$('purpose').disabled=false;for(const t of templates)$('template').add(new Option(t.name,t.id));refresh()}catch{status('Could not load animations. Refresh to try again.')}

function setBuilding(value){
  building=value;$('editing').disabled=value;$('cover').disabled=value;
  if(value)stop();
  refresh();
}
function release(image){if(image?.src.startsWith('blob:'))URL.revokeObjectURL(image.src)}
function fillOptions(select,first,items){
  select.replaceChildren(new Option(first,''));
  items.forEach(([value,label])=>select.add(new Option(label,value)));
}
async function readSuggestion(item){
  const image=await loadImage(item.url);
  image.artBounds=visibleBounds(image);image.suggestion=item;return image;
}
function usedItems(){return scenes.flatMap(s=>s.images).filter(Boolean).map(image=>image.suggestion||{url:image.src})}
async function nextAvailable(plan,used,excluded,{swapping=false,first,prepared}={}){
  let pick=first;
  const unavailable=new Set(excluded);let errors=0;
  for(const [url,until] of plan.failedUntil){
    if(until>Date.now())unavailable.add(url);else plan.failedUntil.delete(url);
  }
  if(pick&&unavailable.has(pick.url)){pick=null;prepared=null}
  while(true){
    pick=pick||selectImage(plan.pool,used,unavailable,swapping);
    if(!pick)throw Error('No other available image could be loaded.');
    let image;
    try{image=prepared?await prepared:await readSuggestion(pick)}
    catch{plan.failedUntil.set(pick.url,Date.now()+60000);if(++errors>=5)throw Error('The shop images could not load. Please retry.');unavailable.add(pick.url);pick=null;prepared=null;continue}
    prepared=null;
    if(plan.preferPeople){
      const actual=verifiedTier(image,pick.productType),previous=pick.tier;
      pick.tier=actual;
      // A supplier may change the photo at an existing catalogue URL.
      if(actual>previous){
        const next=selectImage(plan.pool,used,unavailable,swapping);
        if(next&&next.tier<actual){pick=next;continue}
      }
    }
    return image;
  }
}
async function swapImage(slot){
  if(building||!scenePlans)return;
  const suggestion=scenePlans[scene];
  const dest=scenes[scene],old=dest.images[slot];setBuilding(true);
  try{
    status('Choosing a different image…');
    const history=scenes[scene].history[slot];
    if(old)history.add(old.src);
    const exhausted=suggestion.pool.every(item=>history.has(item.url)||suggestion.failedUntil.get(item.url)>Date.now());
    const excluded=exhausted?new Set([old?.src]):new Set(history);
    const image=await nextAvailable(suggestion,usedItems(),excluded,{swapping:true});
    if(exhausted)history.clear();
    history.add(image.src);
    dest.images[slot]=image;release(old);view=slot;
    if(!dest.customPrice)dest.price=suggestion.price||priceFor(dest.images.map(i=>i?.suggestion));
    invalidate();seek(scene*84+[24,42,66][slot]);status('Image swapped.');
  }catch(e){status(e.message)}finally{setBuilding(false)}
}
const MIX_PRODUCTS='mix-products';
function selectedTypes(){
  const id=$('productType').value;
  return id===MIX_PRODUCTS?types:types.filter(type=>type.id===id);
}
function buildScenePlans(purpose,eligible){
  if(purpose!=='merch')return Array(3).fill(serviceSuggestion(purpose));
  const slug=$('designChoice').value;
  const candidates=eligible.filter(t=>!slug||t.designs.some(d=>d.slug===slug));
  if(!candidates.length)throw Error('No products are available for this design.');
  // Shuffle product types themselves so products with larger galleries get equal odds.
  for(let i=candidates.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [candidates[i],candidates[j]]=[candidates[j],candidates[i]];
  }
  const plans=candidates.slice(0,3).map(t=>merchSuggestion(t,slug,Number($('viewCount').value),gallery,$('mockupPreference').value==='people'));
  return Array.from({length:3},(_,i)=>plans[i%plans.length]);
}
async function populate(){
  const purpose=$('purpose').value;if(!purpose||building)return;
  const eligible=selectedTypes();
  if(purpose==='merch'&&!eligible.length)return;
  $('retrySuggestion').hidden=true;setBuilding(true);
  try{
    const plans=buildScenePlans(purpose,eligible);
    if(!art){await choose('blackboard_gold');if(!art)throw Error('Could not load the animation. Please retry.')}
    status('Building your post…');
    for(const plan of new Set(plans))plan.failedUntil=new Map();
    const draft=Array.from({length:3},()=>[null,null,null]),selected=[];
    for(let v=0;v<plans[0].views;v++){
      const reservations=[...selected],batch=[];
      for(let i=0;i<3;i++){
        const pick=selectImage(plans[i].pool,reservations,new Set());
        if(!pick)throw Error('No mock-ups are available for this selection.');
        reservations.push(pick);batch.push(pick);
      }
      const loaded=await Promise.allSettled(batch.map(readSuggestion));
      for(let i=0;i<3;i++){
        const plan=plans[i],remaining=[...selected,...batch.slice(i+1)];
        const taken=selected.some(item=>item.url===batch[i].url);
        const excluded=new Set();
        let first=batch[i],prepared;
        if(loaded[i].status==='rejected'){if(plan.pool.length>1)excluded.add(first.url);first=null}
        else if(taken&&plan.pool.some(item=>!remaining.some(other=>other.url===item.url))){first=null}
        else prepared=loaded[i].value;
        const image=await nextAvailable(plan,remaining,excluded,{first,prepared});
        draft[i][v]=image;selected.push(image.suggestion);
      }
    }
    for(const [i,images] of draft.entries()){
      const plan=plans[i],history=images.map(image=>new Set(image?[image.src]:[]));
      scenes[i].images.forEach(release);
      Object.assign(scenes[i],{images,history,title:plan.title,price:plan.price||priceFor(images.map(im=>im?.suggestion)),customPrice:false});
    }
    scenePlans=plans;invalidate();scene=0;view=0;seek(24);status('Your suggestion is ready. Swap an image or edit any scene.');
  }catch(e){status(e.message);$('retrySuggestion').hidden=false}finally{setBuilding(false)}
}
function selectType(){
  const eligible=selectedTypes();
  $('merchOptions').hidden=!eligible.length;
  if(!eligible.length)return;
  const designs=new Map(eligible.flatMap(t=>t.designs.map(d=>[d.slug,d.label])));
  const previous=$('designChoice').value;
  fillOptions($('designChoice'),'Mix of Designs',[...designs]);
  if(designs.has(previous))$('designChoice').value=previous;
  populate();
}
async function selectPurpose(){
  const purpose=$('purpose').value;
  $('merchSetup').hidden=purpose!=='merch';$('merchOptions').hidden=true;
  $('retrySuggestion').hidden=true;
  if(!purpose){scenePlans=null;refresh();status('Choose or edit your images manually.');return}
  if(purpose!=='merch'){await populate();return}
  setBuilding(true);status('Loading product types…');fillOptions($('productType'),'Choose a product type…',[]);
  try{catalogPromise??=fetchCatalog();types=await catalogPromise;
    fillOptions($('productType'),'Choose a product type…',[[MIX_PRODUCTS,'Mix of Products'],...types.map(t=>[t.id,typeTitle(t)])]);
    status('Choose a product type to fill all three scenes.')
  }catch{catalogPromise=null;$('retrySuggestion').hidden=false;status('Could not load the shop catalogue. Please retry.')}
  finally{setBuilding(false)}
}
$('purpose').onchange=selectPurpose;$('productType').onchange=selectType;
$('designChoice').onchange=populate;$('viewCount').onchange=populate;
$('retrySuggestion').onclick=()=>$('purpose').value==='merch'&&!$('productType').value?selectPurpose():populate();

try{$('mockupPreference').value=localStorage.getItem('chipin-mockup-preference')==='mixed'?'mixed':'people'}catch{}
$('mockupPreference').onchange=()=>{try{localStorage.setItem('chipin-mockup-preference',$('mockupPreference').value)}catch{}populate()};
