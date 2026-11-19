import {loadImage,loadArt,visibleBounds,draw,FPS,FRAMES} from './render.js';
import {encode} from './export.js';
const $=id=>document.getElementById(id),ctx=$('screen').getContext('2d',{alpha:false});
const scenes=Array.from({length:3},()=>({title:'',price:'',images:[null,null,null]}));
const audio=new Audio('art/swipes.m4a');
let templates=[],template=null,art=null,scene=0,view=0,frame=24,playing=false,raf,loadId=0,exporting=false,loadingImage=false;
let catalogPromise,downloadURL;
const status=message=>$('status').textContent=message;
function button(label,action){const b=document.createElement('button');b.textContent=label;b.onclick=action;return b}
function thumb(src,label){const im=new Image();im.loading='lazy';im.src=src;im.alt=label;return im}
function paint(i=frame){if(template&&art)draw(ctx,template,art,scenes,i)}
function seek(i){frame=Math.min(FRAMES-1,Math.max(0,i));$('seek').value=frame;$('clock').value=(frame/FPS).toFixed(2)+' s';paint()}
function stop(){playing=false;cancelAnimationFrame(raf);audio.pause();$('play').textContent='Play'}
function ready(){return template&&art&&!loadingImage&&!exporting&&scenes.every(s=>s.images[0])}
function refresh(){
  $('export').disabled=!ready();$('play').disabled=!art||exporting;$('seek').disabled=!art||exporting;
  $('cover').hidden=!!art;$('screen').hidden=!art;
  $('sceneEditor').hidden=!art;$('title').value=scenes[scene].title;$('price').value=scenes[scene].price;
  $('scenes').replaceChildren(...scenes.map((s,i)=>{const b=button('Scene '+(i+1),()=>{stop();scene=i;view=0;seek(i*84+24);refresh()});b.setAttribute('aria-pressed',scene===i);return b}));
  $('sceneHeading').textContent='Images for scene '+(scene+1);
  $('views').replaceChildren(...scenes[scene].images.map((im,i)=>{const b=button('View '+(i+1),()=>{stop();view=i;seek(scene*84+[24,42,66][i]);refresh()});b.setAttribute('aria-pressed',view===i);if(im)b.prepend(thumb(im.src,''));return b}));
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
for(const key of ['title','price'])$(key).oninput=e=>{invalidate();scenes[scene][key]=e.target.value;paint()};
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
try{const r=await fetch('templates.json');if(!r.ok)throw Error();templates=await r.json();for(const t of templates)$('template').add(new Option(t.name,t.id));refresh()}catch{status('Could not load animations. Refresh to try again.')}
