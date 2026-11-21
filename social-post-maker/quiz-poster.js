// Static quiz and event promotion posters. All images stay in this browser.
const q=id=>document.getElementById(id);
const canvas=q('posterCanvas'),g=canvas.getContext('2d',{alpha:false});
const fields=['posterFormat','posterLayout','posterVenue','posterHeadline','posterExtra','posterDay','posterTime','posterWhen','posterEntry','posterPrize','posterHost','posterBg','posterInk','posterAccent','posterTextMode','posterPhotoShade','posterPhotoPosition','posterLogoSize'];
const state={photo:null,pubLogo:null,hostLogo:null};
const sizes={square:1080,tall:1350,story:1920};
const layouts={classic:'Classic',bigtime:'Big Time',chalk:'Chalkboard',ticket:'Ticket',photo:'Photo',minimal:'Minimal',question:'Question Mark',calendar:'Calendar'};
const cap=v=>String(v||'').trim(), val=id=>cap(q(id).value);
const rgba=(hex,alpha)=>{
  const v=(hex||'#152e28').replace('#','');
  const h=v.length===3?v.split('').map(x=>x+x).join(''):v;
  return 'rgba('+parseInt(h.slice(0,2),16)+','+parseInt(h.slice(2,4),16)+','+parseInt(h.slice(4,6),16)+','+alpha+')';
};
function light(hex){
  const s=hex.replace('#',''),v=s.length===3?s.split('').map(x=>x+x).join(''):s;
  const c=[0,2,4].map(i=>parseInt(v.slice(i,i+2),16)/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4);
  return .2126*c[0]+.7152*c[1]+.0722*c[2]>.37;
}
function palette(){
  const bg=q('posterBg').value,accent=q('posterAccent').value;
  const auto=q('posterTextMode').value==='auto';
  return {bg,accent,ink:auto?(light(bg)?'#132b29':'#fff9ec'):q('posterInk').value};
}
function rect(x,y,w,h,fill,r=0){
  g.fillStyle=fill;
  g.beginPath();
  if(r)g.roundRect(x,y,w,h,Math.min(r,w/2,h/2));else g.rect(x,y,w,h);
  g.fill();
}
function coverImage(img,W,H,amount=0){
  const ratio=Math.max(W/img.naturalWidth,H/img.naturalHeight),w=img.naturalWidth*ratio,h=img.naturalHeight*ratio;
  const limit=(w-W)/2,shift=limit*amount;
  g.drawImage(img,(W-w)/2+shift,(H-h)/2,w,h);
}
function imageLogo(image,x,y,maxW,maxH){
  if(!image)return false;
  const s=Math.min(maxW/image.naturalWidth,maxH/image.naturalHeight);
  g.drawImage(image,x-image.naturalWidth*s/2,y-image.naturalHeight*s/2,image.naturalWidth*s,image.naturalHeight*s);
  return true;
}
function eventWhen(){
  const mode=val('posterWhen'),time=val('posterTime');
  if(mode==='hide')return '';
  if(mode==='tonight')return 'TONIGHT'+(time?' · '+time:'');
  if(mode==='tomorrow')return 'TOMORROW'+(time?' · '+time:'');
  const day=val('posterDay');
  return [day,time].filter(Boolean).join(' · ').toUpperCase();
}
const plates = {
  classic:  {family:'Georgia, serif', inset:36, align:'center', imageFirst:false},
  bigtime:  {family:'Impact, "Arial Black", sans-serif', inset:0, align:'left', imageFirst:true},
  chalk:    {family:'Georgia, serif', inset:28, align:'center', imageFirst:true},
  ticket:   {family:'Georgia, serif', inset:44, align:'center', imageFirst:false},
  photo:    {family:'Georgia, serif', inset:0, align:'left', imageFirst:true},
  minimal:  {family:'Arial, sans-serif', inset:66, align:'left', imageFirst:false},
  question: {family:'Georgia, serif', inset:0, align:'center', imageFirst:false},
  calendar: {family:'Arial, sans-serif', inset:28, align:'left', imageFirst:true}
};
const artCache = new Map();
function plateImage(style) {
  if(state.photo)return state.photo;
  if(!artCache.has(style)){
    const img=new Image();
    artCache.set(style,img);
    img.onload=()=>{if(val('posterLayout')===style)safeDraw()};
    img.onerror=()=>{
      artCache.delete(style);
      if(val('posterLayout')===style && !state.photo){
        q('posterStatus').textContent='Artwork could not load. Select the layout again to retry.';
      }
    };
    img.src=new URL('poster-art/'+style+'.webp',import.meta.url);
  }
  const image=artCache.get(style);
  return image.complete && image.naturalWidth ? image : null;
}
// Find a balanced one- or two-line setting within an explicit type area.
function lettering(value,x,y,w,h,size,color,family,align='center',weight=700){
  if(!value)return;
  const words=value.split(/\s+/);
  let lines=[value];
  for(;size>=10;size-=2){
    g.font=weight+' '+size+'px '+family;
    const width=s=>g.measureText(s).width;
    if(width(value)<=w && size<=h){lines=[value];break}
    if(size*2.2>h)continue;
    let best=Infinity;
    for(let i=1;i<words.length;i++){
      const pair=[words.slice(0,i).join(' '),words.slice(i).join(' ')];
      const longest=Math.max(...pair.map(width));
      if(longest<=w && longest<best){lines=pair;best=longest}
    }
    if(best<Infinity)break;
  }
  g.fillStyle=color;g.textAlign=align;g.textBaseline='middle';
  const anchor=align==='left'?x:x+w/2;
  lines.forEach((line,i)=>g.fillText(line,anchor,y+h/2+(i-(lines.length-1)/2)*size*1.05,w));
}
function draw(){
  const W=1080,H=sizes[val('posterFormat')]||1350;
  if(canvas.width!==W||canvas.height!==H){canvas.width=W;canvas.height=H}
  const style=val('posterLayout'),theme=plates[style],image=plateImage(style);
  const {bg,accent,ink}=palette();
  rect(0,0,W,H,bg);
  q('posterSize').textContent=W+' × '+H+' px';
  if(!image)return false;
  const left=theme.inset, margin=Math.max(68,left+22),align=theme.align;
  const inner=W-2*margin,headH=Math.round(H*.19),artH=Math.round(H*.43);
  const top=left,artY=theme.imageFirst?top:headH,headY=theme.imageFirst?top+artH:0;
  g.save();g.translate(left,artY);
  const artW=W-left*2;
  g.beginPath();g.rect(0,0,artW,artH);g.clip();
  coverImage(image,artW,artH,state.photo?Number(val('posterPhotoPosition'))/100:0);
  if(state.photo)rect(0,0,artW,artH,rgba(bg,Number(val('posterPhotoShade'))/100));
  if(style==='calendar' && !state.photo){
    const scale=Math.max(artW/image.naturalWidth,artH/image.naturalHeight);
    const scaledH=image.naturalHeight*scale;
    const pageY=(artH-scaledH)/2+scaledH*.57;
    lettering(eventWhen(),artW*.28,pageY-scaledH*.07,artW*.28,scaledH*.14,46,'#422f25','Georgia, serif');
  }
  g.restore();
  const title=val('posterHeadline')||'QUIZ NIGHT';
  lettering(title,margin,headY+8,inner,headH-16,Math.min(154,headH*.72),ink,theme.family,align,800);
  const start=(theme.imageFirst?top:0)+headH+artH;
  const footH=Math.round(H*.105),end=H-footH-18;
  if(style==='ticket'){
    g.save();g.setLineDash([10,13]);g.strokeStyle=accent;g.lineWidth=4;
    g.beginPath();g.moveTo(left,start+4);g.lineTo(W-left,start+4);g.stroke();g.restore();
  }else rect(margin,start+2,align==='left'?106:inner,4,accent);
  const rows=[];
  const when=eventWhen(),venue=val('posterVenue'),extra=val('posterExtra');
  if(when && (style!=='calendar'||state.photo))rows.push([when,style==='bigtime'?96:56,1.1]);
  if(venue)rows.push([venue,80,1.25]);
  if(extra)rows.push([extra,42,.85]);
  const info=[val('posterEntry'),val('posterPrize')].filter(Boolean).join('   •   ');
  if(info)rows.push([info,39,.78]);
  const space=end-start-22,units=rows.reduce((sum,r)=>sum+r[2],0);
  let y=start+14;
  for(const [value,size,weight] of rows){
    const h=space*weight/units;
    lettering(value,margin,y,inner,h,size,ink,value===venue?theme.family:'Arial, sans-serif',align,value===venue?700:600);
    y+=h;
  }
  rect(margin,end+9,inner,2,rgba(ink,.45));
  const logoY=H-footH/2,scale=Number(val('posterLogoSize'))/100;
  if(state.pubLogo)imageLogo(state.pubLogo,margin+125,logoY,156*scale,Math.min(footH-10,64*scale));
  if(state.hostLogo)imageLogo(state.hostLogo,W-margin-125,logoY,156*scale,Math.min(footH-10,64*scale));
  else{
    const x=state.pubLogo?margin+275:margin;
    lettering(val('posterHost'),x,H-footH,W-margin-x,footH,34,ink,'Arial, sans-serif',align,600);
  }
  return true;
}
function safeDraw(){
  try{const ready=draw();q('posterDownload').disabled=!ready;q('posterStatus').textContent=ready?'Ready to download as a high-resolution PNG.':'Loading poster artwork…'}
  catch(error){q('posterStatus').textContent='Preview error: '+error.message}
}
// Carry a custom palette between layouts. Otherwise match the stock print.
const stockColours={
  classic:['#14352d','#ecc66e'], bigtime:['#461b18','#ffae4b'],
  chalk:['#202727','#d5ba89'], ticket:['#f4e2bd','#8a332a'],
  photo:['#271c18','#e5ac68'], minimal:['#f8edda','#bc3323'],
  question:['#15283e','#d8a855'], calendar:['#f4e6c8','#31584d']
};
let previousLayout;
function matchStockColours(){
  const previous=stockColours[previousLayout], next=stockColours[val('posterLayout')];
  if(previous && next && val('posterBg')===previous[0] && val('posterAccent')===previous[1] && val('posterTextMode')==='auto'){
    q('posterBg').value=next[0];q('posterAccent').value=next[1];
  }
  previousLayout=val('posterLayout');
}
q('posterLayout').addEventListener('input',matchStockColours);
q('posterLayout').addEventListener('change',matchStockColours);
for(const id of fields)q(id).addEventListener('input',safeDraw);
for(const id of fields)q(id).addEventListener('change',safeDraw);
function fileUpload(fileId,key,clearId){
  const field=q(fileId);
  field.addEventListener('change',async()=>{
    const file=field.files?.[0];if(!file)return;
    if(!file.type.startsWith('image/')){q('posterStatus').textContent='Please select an image file.';return}
    const url=URL.createObjectURL(file),img=new Image();
    try{
      img.src=url;await img.decode();state[key]=img;
      q(clearId).hidden=false;safeDraw();
    }catch{q('posterStatus').textContent='The image could not be read.'}
    finally{URL.revokeObjectURL(url);field.value=''}
  });
  q(clearId).addEventListener('click',()=>{state[key]=null;q(clearId).hidden=true;safeDraw()});
}
fileUpload('posterPhoto','photo','posterClearPhoto');
fileUpload('posterPubLogo','pubLogo','posterClearPubLogo');
fileUpload('posterHostLogo','hostLogo','posterClearHostLogo');
q('posterSave').onclick=()=>{
  const values=Object.fromEntries(fields.map(id=>[id,q(id).value]));
  try{localStorage.setItem('chipin.quizposter.settings.v1',JSON.stringify(values));q('posterStatus').textContent='Your text and design settings are saved on this device. Uploaded images are not stored.'}
  catch{q('posterStatus').textContent='Browser storage is unavailable; your current poster is still ready.'}
};
q('posterReset').onclick=()=>{
  for(const id of fields){const field=q(id);field.value=field.dataset.original??field.value}
  previousLayout=val('posterLayout');
  for(const k of Object.keys(state))state[k]=null;
  ['posterClearPhoto','posterClearPubLogo','posterClearHostLogo'].forEach(id=>q(id).hidden=true);
  try{localStorage.removeItem('chipin.quizposter.settings.v1')}catch{}
  safeDraw();
};
let serial=0;
try{serial=Math.max(0,Number(localStorage.getItem('chipin.quizposter.export-number'))||0)}catch{}
q('posterDownload').onclick=()=>{
  try{if(!draw())return}catch(e){q('posterStatus').textContent='Could not render: '+e.message;return}
  canvas.toBlob(blob=>{
    if(!blob){q('posterStatus').textContent='Your browser could not create the PNG.';return}
    const url=URL.createObjectURL(blob),a=document.createElement('a');
    serial++;
    try{localStorage.setItem('chipin.quizposter.export-number',String(serial))}catch{}
    a.href=url;a.download='QuizPoster_'+(layouts[val('posterLayout')]||'Classic').replace(/[^A-Za-z]/g,'')+'_'+String(serial).padStart(4,'0')+'.png';
    a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);
    q('posterStatus').textContent='PNG created at '+canvas.width+' × '+canvas.height+'.';
  },'image/png');
};
for(const id of fields)q(id).dataset.original=q(id).value;
try{
  const saved=JSON.parse(localStorage.getItem('chipin.quizposter.settings.v1')||'null');
  if(saved&&typeof saved==='object')for(const id of fields){
    if(typeof saved[id]!=='string')continue;
    const el=q(id);
    if(el.tagName==='SELECT' && !Array.from(el.options).some(o=>o.value===saved[id]))continue;
    el.value=saved[id];
  }
}catch{}
previousLayout=val('posterLayout');
safeDraw();
