// Static quiz and event promotion posters. All images stay in this browser.
const q=id=>document.getElementById(id);
const canvas=q('posterCanvas'),g=canvas.getContext('2d',{alpha:false});
const fields=['posterFormat','posterLayout','posterVenue','posterHeadline','posterExtra','posterDay','posterTime','posterWhen','posterEntry','posterPrizeCount','posterPrize','posterPrize2','posterPrize3','posterPrize4','posterPrize5','posterHost','posterBg','posterInk','posterAccent','posterTextMode','posterPhotoShade','posterPhotoPosition','posterLogoSize','posterPubChoice','posterHostChoice'];
const state={photo:null,pubLogo:null,hostLogo:null};
const illustratedLayouts=['classic','question','ticket','chalk','photo'];
const prizeIds=['posterPrize','posterPrize2','posterPrize3','posterPrize4','posterPrize5'];
const ranks=['1st','2nd','3rd','4th','5th'];
function prizeCount(){return Math.max(0,Math.min(5,Number(val('posterPrizeCount'))||0))}
function syncPosterControls(){
  const n=prizeCount();
  q('posterPrizeFields').hidden=n===0;
  for(const label of q('posterPrizeFields').querySelectorAll('[data-prize-place]'))label.hidden=Number(label.dataset.prizePlace)>n;
}

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
    img.src=new URL((style==='photo'?'poster-art/':'gig-art/')+style+'.webp',import.meta.url);
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
  if(pendingImages.size)return false;
  const W=1080,H=sizes[val('posterFormat')]||1350;
  if(canvas.width!==W||canvas.height!==H){canvas.width=W;canvas.height=H}
  const style=val('posterLayout'),{bg,ink,accent}=palette();
  const face='Arial, sans-serif',serif='Georgia, serif',mono='"Courier New", monospace';
  const onAccent=light(accent)?'#142327':'#fff9ee';
  const title=val('posterHeadline')||'QUIZ NIGHT',when=eventWhen();
  const venue=val('posterVenue'),extra=val('posterExtra');
  const artwork=illustratedLayouts.includes(style);
  const img=artwork||state.photo?plateImage(style):null;
  q('posterSize').textContent=W+' × '+H+' px';
  if((artwork||state.photo)&&!img)return false;
  rect(0,0,W,H,bg);
  function picture(x,y,w,h){
    g.save();g.translate(x,H*y);g.beginPath();g.rect(0,0,w,H*h);g.clip();
    if(!state.photo && (style==='ticket'||style==='question')){
      rect(0,0,w,H*h,style==='ticket'?'#8a332a':'#15283e');
      imageLogo(img,w/2,H*h/2,w,H*h);
    }else coverImage(img,w,H*h,state.photo?Number(val('posterPhotoPosition'))/100:0);
    if(state.photo)rect(0,0,w,H*h,rgba(bg,Number(val('posterPhotoShade'))/100));
    g.restore();
  }
  if(state.photo&&!artwork)picture(0,0,W,1);
  function line(value,x,y,w,h,size,color=ink,family=face,align='left',weight=700){
    lettering(value,x,H*y,w,H*h,size,color,family,align,weight);
  }
  function band(value,x,y,w,h,fill,color,family=mono){
    if(!value)return;
    rect(x,H*y,w,H*h,fill);
    line(value,x+22,y,w-44,h,58,color,family,'center');
  }
  const words=title.split(/\s+/);
  function stacked(x,y,w,h,color,family,align='left'){
    if(words.length!==2){line(title,x,y,w,h,245,color,family,align,900);return}
    words.forEach((v,i)=>line(v,x,y+i*h/2,w,h/2,Math.min(250,h*H*.55),color,family,align,900));
  }
  let body=.65,bodyAlign='left';
  if(style==='classic'){
    picture(0,0,W,.42);
    rect(0,H*.417,W,8,accent);
    line(title,52,.436,976,.134,156,ink,serif,'center',900);
    band(when,110,.586,860,.063,accent,onAccent);
    body=.667;bodyAlign='center';
  }else if(style==='bigtime'){
    // Dial indexes bleed off the page like an oversized station clock.
    g.save();g.translate(W*.86,H*.19);g.strokeStyle=rgba(accent,.52);
    for(let i=0;i<60;i++){g.rotate(Math.PI/30);g.lineWidth=i%5===0?10:3;g.beginPath();g.moveTo(263,0);g.lineTo(i%5===0?323:290,0);g.stroke()}
    g.restore();
    line(title,58,.055,705,.14,130,ink,face,'left',900);
    const [day,time]=when.split(' · ');
    if(when){
      if(time)line(day,58,.245,964,.115,119,ink,mono);
      rect(0,H*.382,W,H*.223,accent);
      line(time||day,42,.382,W-84,.223,230,onAccent,face,'center',900);
    }
    body=when ? .63 : .40;
  }else if(style==='chalk'){
    picture(0,0,W,.38);
    g.save();g.translate(W/2,H*.468);g.rotate(-.055);
    lettering(title,-483,-H*.088,966,H*.176,163,ink,serif,'center',900);
    rect(-270,H*.080,540,4,accent);g.restore();
    line(when,62,.575,956,.078,64,ink,mono,'center');
    body=.66;bodyAlign='center';
  }else if(style==='ticket'){
    const edge=36,stub=355;
    rect(edge,H*.042,W-2*edge,H*.56,accent,20);
    picture(edge+16,.061,stub,.508);
    stacked(438,.092,530,.292,onAccent,serif);
    const [day,time]=when.split(' · ');
    line(day,438,.404,525,.067,62,onAccent,mono);
    line(time,438,.471,525,.070,65,onAccent,mono);
    g.save();g.strokeStyle=onAccent;g.lineWidth=3;g.setLineDash([10,11]);
    g.beginPath();g.moveTo(414,H*.062);g.lineTo(414,H*.581);g.stroke();g.restore();
    for(let n=0;n<9;n++){
      const y=H*(.072+n*.062);
      for(const x of [edge,W-edge]){g.beginPath();g.arc(x,y,10,0,Math.PI*2);g.fillStyle=bg;g.fill()}
    }
    body=.635;
  }else if(style==='photo'){
    picture(0,0,W,.60);
    const shade=g.createLinearGradient(0,H*.19,0,H*.60);
    shade.addColorStop(0,'rgba(0,0,0,0)');shade.addColorStop(1,'rgba(0,0,0,.9)');
    rect(0,H*.19,W,H*.41,shade);
    line(title,54,.37,968,.199,182,'#fffaf0',serif,'left',900);
    band(when,0,.60,W,.070,accent,onAccent);
    body=.69;
  }else if(style==='minimal'){
    // A single broad diagonal pencil crosses the top-right corner.
    g.save();g.translate(907,H*.219);g.rotate(-.94);
    rect(-171,-53,580,106,accent);rect(-171,-53,580,15,rgba(ink,.25));
    g.fillStyle=ink;g.beginPath();g.moveTo(-263,0);g.lineTo(-171,-53);g.lineTo(-171,53);g.fill();g.restore();
    stacked(58,.075,615,.374,ink,face);
    rect(62,H*.49,956,8,accent);
    line(when,62,.515,956,.093,76,ink,mono);body=.62;
  }else if(style==='question'){
    picture(516,0,564,.55);
    stacked(48,.09,452,.365,ink,serif);
    band(when,0,.55,W,.085,accent,onAccent);
    body=.662;
  }else{
    const [day,time]=when.split(' · ');
    rect(42,H*.055,996,H*.48,accent,28);
    for(let n=0;n<9;n++)rect(106+n*106,H*.035,15,H*.057,ink,7);
    line(when?day:title,82,.106,916,.147,154,onAccent,face,'center',900);
    rect(83,H*.278,914,3,rgba(onAccent,.55));
    line(time||(!when?'':title),82,.29,916,.208,185,onAccent,serif,'center',900);
    if(time)line(title,62,.548,956,.107,112,ink,face,'left',900);
    body=time ? .663 : .567;
  }
  const footH=Math.round(H*.105),end=H-footH-10,margin=62;
  const rows=[
    [venue,88,1.35,serif,700],
    [extra,46,.88,face,500],
    [val('posterEntry'),42,.77,face,600]
  ].filter(row=>row[0]);
  const count=prizeCount(),prizes=prizeIds.slice(0,count).map(val);
  const detailed=prizes.some(Boolean);
  const gridRows=detailed?Math.ceil(count/2):count?1:0;
  // Give the prize section extra space rather than squeezing five prize lines
  // into the standard footer. Every output size shares this same canvas path.
  const prizeUnits=count?(detailed?gridRows*1.22:1.02):0;
  let y=body*H;
  const available=end-y,units=rows.reduce((n,r)=>n+r[2],0)+prizeUnits;
  rows.forEach(([value,size,weight,family,bold])=>{
    const h=available*weight/units;
    lettering(value,margin,y,W-margin*2,h,size,ink,family,bodyAlign,bold);
    y+=h;
  });
  if(count){
    const height=available*prizeUnits/units;
    if(!detailed){
      const label=count===1?'PRIZE FOR THE WINNING TEAM':'PRIZES FOR THE TOP '+count+' TEAMS';
      const gap=Math.min(8,height*.1);
      rect(margin,y+gap,W-2*margin,height-2*gap,accent,8);
      lettering(label,margin+14,y+gap,W-2*margin-28,height-2*gap,42,onAccent,face,'center',800);
    }else{
      const gap=8,cellH=height/gridRows;
      for(let i=0;i<count;i++){
        const row=Math.floor(i/2),single=(count===1)||(count%2===1&&i===count-1);
        const cellW=single?W-2*margin:(W-2*margin-gap)/2;
        const x=margin+(single?0:(i%2)*(cellW+gap)),top=y+row*cellH;
        const inset=Math.min(4,cellH*.065),h=cellH-2*inset;
        rect(x,top+inset,cellW,h,rgba(accent,.13),7);
        const badgeW=Math.min(110,cellW*.23);
        rect(x,top+inset,badgeW,h,accent,7);
        lettering(ranks[i].toUpperCase(),x+4,top+inset,badgeW-8,h,30,onAccent,face,'center',800);
        lettering(prizes[i]||'Prize',x+badgeW+12,top+inset,cellW-badgeW-24,h,36,ink,face,'left',700);
      }
    }
  }
  const align=bodyAlign;
  rect(margin,end,W-2*margin,2,rgba(ink,.35));
  const pubLogo=selectedLogo('pubLogo'),hostLogo=selectedLogo('hostLogo');
  if(pubLogo===false || hostLogo===false)return false;
  const logoY=H-footH/2,scale=Number(val('posterLogoSize'))/100;
  if(pubLogo)imageLogo(pubLogo,margin+125,logoY,230*scale,Math.min(footH-10,82*scale));
  if(hostLogo)imageLogo(hostLogo,W-margin-125,logoY,230*scale,Math.min(footH-10,82*scale));
  else{
    const x=pubLogo?margin+275:margin;
    lettering(val('posterHost'),x,H-footH,W-margin-x,footH,34,ink,'Arial, sans-serif',align,600);
  }
  return true;
}
function safeDraw(){
  try{syncPosterControls();const ready=draw();q('posterDownload').disabled=!ready;q('posterStatus').textContent=ready?'Ready to download as a high-resolution PNG.':'Loading poster artwork…'}
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
const pendingImages=new Set();
function fileUpload(fileId,key,clearId){
  const field=q(fileId),choiceId=logoChoices[key];
  const select=choiceId?q(choiceId):null;
  let version=0,activeChoice=select?.value;
  function cancelLoad(){
    version++;
    pendingImages.delete(key);
  }
  function forgetUpload(){
    select?.querySelector('option[value="upload"]')?.remove();
  }
  if(select)select.addEventListener('change',()=>{
    cancelLoad();
    if(select.value==='pick'){
      select.value=activeChoice;
      field.click();
    }else activeChoice=select.value;
    safeDraw();
  });
  q('posterReset').addEventListener('click',()=>{
    cancelLoad();forgetUpload();activeChoice='none';
  },true);
  field.addEventListener('change',async()=>{
    const file=field.files?.[0];
    if(!file)return;
    field.value='';
    const current=++version;
    pendingImages.add(key);
    safeDraw();
    const url=URL.createObjectURL(file),img=new Image();
    try{
      await new Promise((resolve,reject)=>{
        img.onload=resolve;img.onerror=reject;img.src=url;
      });
      if(current!==version)return;
      if(!img.naturalWidth||!img.naturalHeight)throw Error('Empty image');
      state[key]=img;
      if(select){
        forgetUpload();
        select.add(new Option('Uploaded · '+file.name,'upload'));
        activeChoice=select.value='upload';
      }
      q(clearId).hidden=false;
      pendingImages.delete(key);
      safeDraw();
    }catch{
      if(current===version){
        pendingImages.delete(key);safeDraw();
        q('posterStatus').textContent='Could not open '+file.name+'. Try a PNG, JPEG, WebP or SVG image.';
      }
    }finally{URL.revokeObjectURL(url)}
  });
  q(clearId).addEventListener('click',()=>{
    cancelLoad();state[key]=null;
    if(select){
      if(activeChoice==='upload')activeChoice=select.value='none';
      forgetUpload();
    }
    q(clearId).hidden=true;safeDraw();
  });
}
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
  if(saved&&typeof saved==='object'){
    // V5.4 stored just a single prize. Retain it and advertise first place.
    if(typeof saved.posterPrizeCount!=='string'&&typeof saved.posterPrize==='string'&&saved.posterPrize.trim())saved.posterPrizeCount='1';
    for(const id of fields){
    if(typeof saved[id]!=='string')continue;
    const el=q(id);
    if(el.tagName==='SELECT' && !Array.from(el.options).some(o=>o.value===saved[id]))continue;
    el.value=saved[id];
    }
  }
}catch{}
fileUpload('posterPhoto','photo','posterClearPhoto');
fileUpload('posterPubLogo','pubLogo','posterClearPubLogo');
fileUpload('posterHostLogo','hostLogo','posterClearHostLogo');
previousLayout=val('posterLayout');
safeDraw();
