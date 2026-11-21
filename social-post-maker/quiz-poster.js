// Static quiz and event promotion posters. All images stay in this browser.
const q=id=>document.getElementById(id);
const canvas=q('posterCanvas'),g=canvas.getContext('2d',{alpha:false});
const fields=['posterFormat','posterLayout','posterVenue','posterHeadline','posterExtra','posterDay','posterTime','posterWhen','posterEntry','posterPrize','posterHost','posterBg','posterInk','posterAccent','posterTextMode','posterPhotoShade','posterPhotoPosition','posterLogoSize','posterPubChoice','posterHostChoice'];
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
function imageLogo(image,x,y,maxW,maxH,backing){
  if(!image)return false;
  const s=Math.min(maxW/image.naturalWidth,maxH/image.naturalHeight);
  if(backing)rect(x-image.naturalWidth*s/2-10,y-image.naturalHeight*s/2-6,image.naturalWidth*s+20,image.naturalHeight*s+12,backing,8);
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
  classic:  {family:'Georgia, serif', align:'center'},
  bigtime:  {family:'Impact, "Arial Black", sans-serif', align:'left'},
  chalk:    {family:'Georgia, serif', align:'center'},
  ticket:   {family:'Georgia, serif', align:'center'},
  photo:    {family:'Georgia, serif', align:'left'},
  minimal:  {family:'Arial, sans-serif', align:'left'},
  question: {family:'Georgia, serif', align:'center'},
  calendar: {family:'Arial, sans-serif', align:'left'}
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
// Flat, two-colour print marks drawn at the final export resolution.
function printMark(style,x,y,size,accent,bg){
  g.save();g.translate(x,y);g.scale(size/160,size/160);
  g.strokeStyle=accent;g.fillStyle=accent;g.lineWidth=8;g.lineCap='round';g.lineJoin='round';
  function path(points,fill=false){
    g.beginPath();points.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));if(fill){g.closePath();g.fill()}else g.stroke();
  }
  function circle(x,y,r){g.beginPath();g.arc(x,y,r,0,Math.PI*2);g.stroke()}
  if(style==='classic'){
    // Two overlapping team answer cards.
    g.rotate(-.14);rect(-62,-47,92,86,accent,8);g.rotate(.24);
    rect(-28,-28,100,84,bg,8);g.strokeRect(-28,-28,100,84);
    path([[-9,1],[5,15],[31,-8]]);path([[-7,34],[49,34]]);
  }else if(style==='bigtime'){
    circle(0,0,52);path([[0,-33],[0,0],[26,15]]);
  }else if(style==='chalk'){
    path([[-43,-43],[32,-43],[23,53],[-32,53],[-43,-43]]);
    g.beginPath();g.arc(33,-6,21,-Math.PI/2,Math.PI/2);g.stroke();
    path([[-40,-23],[30,-23]]);path([[-17,-4],[-13,30]]);
  }else if(style==='ticket'){
    path([[-33,-42],[33,-42],[26,8],[0,28],[-26,8],[-33,-42]]);
    path([[-35,-30],[-54,-30],[-48,-4],[-23,8]]);path([[35,-30],[54,-30],[48,-4],[23,8]]);
    path([[0,28],[0,49]]);path([[-23,51],[23,51]]);
  }else if(style==='question'){
    g.textAlign='center';g.textBaseline='middle';g.font='bold 152px Georgia, serif';g.fillText('?',0,14);
  }else if(style==='calendar'){
    g.strokeRect(-49,-41,98,95);path([[-49,-16],[49,-16]]);
    path([[-25,-54],[-25,-31]]);path([[25,-54],[25,-31]]);path([[-17,17],[-4,29],[20,4]]);
  }else if(style==='minimal'){
    path([[-55,40],[-40,0],[29,-64],[54,-39],[-15,26]],true);
  }
  g.restore();
}
function draw(){
  const W=1080,H=sizes[val('posterFormat')]||1350;
  if(canvas.width!==W||canvas.height!==H){canvas.width=W;canvas.height=H}
  const style=val('posterLayout'),theme=plates[style];
  const {bg,accent,ink}=palette();
  rect(0,0,W,H,bg);
  q('posterSize').textContent=W+' × '+H+' px';
  const margin=76,inner=W-margin*2,align=theme.align;
  const title=val('posterHeadline')||'QUIZ NIGHT',when=eventWhen();
  const isPhoto=style==='photo';
  if(isPhoto||state.photo){
    const image=plateImage(style);
    if(!image)return false;
    const height=isPhoto?H*.36:H;
    g.save();g.beginPath();g.rect(0,0,W,height);g.clip();
    coverImage(image,W,height,Number(val('posterPhotoPosition'))/100);
    if(state.photo)rect(0,0,W,height,rgba(bg,Number(val('posterPhotoShade'))/100));
    g.restore();
  }
  const start=isPhoto?H*.57:H*.52;
  if(isPhoto){
    lettering(title,margin,H*.36,inner,H*.20,160,ink,theme.family,align,800);
  }else{
    if(style==='chalk'){
      g.strokeStyle=accent;g.lineWidth=3;g.strokeRect(28,28,W-56,H-56);
    }
    const markY=H*.13,markSize=Math.min(176,H*.14);
    const markX=align==='left'?margin+markSize*.4:W/2;
    printMark(style,markX,markY,markSize,accent,bg);
    if(style==='bigtime' && when){
      lettering(title,margin,H*.21,inner,H*.10,78,ink,theme.family,align,700);
      const [day,time]=when.split(' · ');
      lettering(day,margin,H*.31,inner,H*(time ? .105 : .19),142,ink,theme.family,align,800);
      if(time)lettering(time,margin,H*.412,inner,H*.093,112,ink,theme.family,align,800);
    }else{
      lettering(title,margin,H*.23,inner,H*.26,194,ink,theme.family,align,800);
    }
  }
  const footH=Math.round(H*.12),end=H-footH-18;
  if(style==='ticket'){
    g.save();g.setLineDash([10,13]);g.strokeStyle=accent;g.lineWidth=4;
    g.beginPath();g.moveTo(margin,start+4);g.lineTo(W-margin,start+4);g.stroke();g.restore();
  }else rect(margin,start+2,align==='left'?106:inner,4,accent);
  const rows=[];
  const venue=val('posterVenue'),extra=val('posterExtra');
  if(when && style!=='bigtime')rows.push([when,style==='bigtime'?96:56,1.1]);
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
  const pubLogo=selectedLogo('pubLogo'),hostLogo=selectedLogo('hostLogo');
  if(pubLogo===false || hostLogo===false)return false;
  const logoY=H-footH/2,scale=Number(val('posterLogoSize'))/100;
  if(pubLogo)imageLogo(pubLogo,margin+125,logoY,230*scale,Math.min(footH-10,82*scale),val('posterPubChoice')==='chip' && !light(bg)?'#fff9ec':null);
  if(hostLogo)imageLogo(hostLogo,W-margin-125,logoY,230*scale,Math.min(footH-10,82*scale),val('posterHostChoice')==='chip' && !light(bg)?'#fff9ec':null);
  else{
    const x=pubLogo?margin+275:margin;
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
const logoChoices={pubLogo:'posterPubChoice',hostLogo:'posterHostChoice'};
const logoPaths={chip:'../chip_in_logo.png',quiz:'logos/quiz-in.png'};
const logoCache=new Map();
function selectedLogo(key){
  const choice=val(logoChoices[key]);
  if(choice==='upload')return state[key];
  if(!logoPaths[choice])return null;
  if(!logoCache.has(choice)){
    const img=new Image();logoCache.set(choice,img);
    img.onload=safeDraw;
    img.onerror=()=>{
      logoCache.delete(choice);
      if(Object.values(logoChoices).some(id=>val(id)===choice))q('posterStatus').textContent='Logo could not load. Select it again to retry.';
    };
    img.src=new URL(logoPaths[choice],import.meta.url);
  }
  const img=logoCache.get(choice);
  return img.complete && img.naturalWidth?img:false;
}
function fileUpload(fileId,key,clearId){
  const field=q(fileId),choiceId=logoChoices[key];
  let version=0;
  if(choiceId)q(choiceId).addEventListener('change',()=>{version++});
  q('posterReset').addEventListener('click',()=>{version++});
  field.addEventListener('change',async()=>{
    const file=field.files?.[0];if(!file)return;
    if(!file.type.startsWith('image/')){q('posterStatus').textContent='Please select an image file.';return}
    const current=++version,url=URL.createObjectURL(file),img=new Image();
    try{
      img.src=url;await img.decode();if(current!==version)return;state[key]=img;
      if(choiceId){q(choiceId).querySelector('[value=upload]').disabled=false;q(choiceId).value='upload'}
      q(clearId).hidden=false;safeDraw();
    }catch{q('posterStatus').textContent='The image could not be read.'}
    finally{URL.revokeObjectURL(url);field.value=''}
  });
  q(clearId).addEventListener('click',()=>{version++;state[key]=null;if(choiceId){q(choiceId).querySelector('[value=upload]').disabled=true;if(val(choiceId)==='upload')q(choiceId).value='none'};q(clearId).hidden=true;safeDraw()});
}
fileUpload('posterPhoto','photo','posterClearPhoto');
fileUpload('posterPubLogo','pubLogo','posterClearPubLogo');
fileUpload('posterHostLogo','hostLogo','posterClearHostLogo');
q('posterSave').onclick=()=>{
  const values=Object.fromEntries(fields.map(id=>[id,q(id).value]));
  for(const id of Object.values(logoChoices))if(values[id]==='upload')values[id]='none';
  try{localStorage.setItem('chipin.quizposter.settings.v1',JSON.stringify(values));q('posterStatus').textContent='Your text and design settings are saved on this device. Uploaded images are not stored.'}
  catch{q('posterStatus').textContent='Browser storage is unavailable; your current poster is still ready.'}
};
q('posterReset').onclick=()=>{
  for(const id of fields){const field=q(id);field.value=field.dataset.original??field.value}
  previousLayout=val('posterLayout');
  for(const k of Object.keys(state))state[k]=null;
  for(const id of Object.values(logoChoices))q(id).querySelector('[value=upload]').disabled=true;
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
