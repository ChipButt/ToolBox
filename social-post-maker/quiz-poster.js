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
function outline(x,y,w,h,color,line=4,r=0){
  g.strokeStyle=color;g.lineWidth=line;g.beginPath();
  if(r)g.roundRect(x,y,w,h,Math.min(r,w/2,h/2));else g.rect(x,y,w,h);
  g.stroke();
}
function type(size=50,weight=800){g.font=weight+' '+Math.round(size)+'px system-ui, Arial, sans-serif'}
function textLine(value,x,y,maxWidth,size,color,align='center',weight=800){
  if(!value)return;
  g.save();type(size,weight);
  while(g.measureText(value).width>maxWidth&&size>15){size-=2;type(size,weight)}
  g.fillStyle=color;g.textAlign=align;g.textBaseline='middle';g.fillText(value,x,y);g.restore();
}
function wrap(value,maxWidth,size,maxLines=3){
  const words=cap(value).split(/\s+/).filter(Boolean);
  let output=[],current='';
  g.save();type(size);
  for(const word of words){
    const next=current?current+' '+word:word;
    if(current&&g.measureText(next).width>maxWidth){output.push(current);current=word}else current=next;
  }
  if(current)output.push(current);
  g.restore();
  return output.length>maxLines?null:output;
}
function textBlock(value,x,y,maxWidth,size,color,align='center',maxLines=3,weight=850){
  if(!cap(value))return y;
  let lines;for(;size>=20;size-=3){lines=wrap(value,maxWidth,size,maxLines);if(lines)break}
  lines=lines||[cap(value)];
  const step=size*1.16;
  for(let i=0;i<lines.length;i++)textLine(lines[i],x,y+i*step,maxWidth,size,color,align,weight);
  return y+lines.length*step;
}
function capsule(value,x,y,w,accent,ink){
  if(!value)return;
  rect(x-w/2,y-39,w,78,accent,39);
  textLine(value,x,y,w-36,37,ink,'center',900);
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
function draw(){
  const W=1080,H=sizes[q('posterFormat').value]||1350;
  if(canvas.width!==W||canvas.height!==H){canvas.width=W;canvas.height=H}
  const P=palette(),style=q('posterLayout').value, A=P.accent,I=P.ink,B=P.bg;
  const venue=val('posterVenue')||'YOUR VENUE',headline=val('posterHeadline')||'QUIZ NIGHT',extra=val('posterExtra');
  const when=eventWhen(),entry=val('posterEntry'),prize=val('posterPrize'),host=val('posterHost');
  const darkInk=light(A)?'#132624':'#ffffff';
  const pad=75,mid=W/2;
  rect(0,0,W,H,B);
  if(state.photo){
    coverImage(state.photo,W,H,Number(q('posterPhotoPosition').value)/100);
    rect(0,0,W,H,rgba(B,Number(q('posterPhotoShade').value)/100));
    if(style!=='photo')rect(0,0,W,H,rgba(B,.18));
  }
  g.save();
  if(style==='classic'){
    g.strokeStyle=rgba(A,.28);g.lineWidth=7;
    [240,440,640].forEach((radius,i)=>{g.beginPath();g.arc(W+60,100,radius,0,Math.PI*2);g.stroke()});
    outline(35,35,W-70,H-70,rgba(A,.7),5,23);
    rect(70,78,220,12,A,6);
    textLine('THE BIG NIGHT OUT',mid,H*.13,900,38,I,'center',750);
    textBlock(headline,mid,H*.26,900,H===1080?112:130,I,'center',3);
    capsule(when,mid,H*.48,890,A,darkInk);
    textBlock(venue,mid,H*.59,940,78,I,'center',3);
  }else if(style==='bigtime'){
    rect(0,0,W,H*.15,A);
    textLine('GET YOUR TEAM TOGETHER',mid,H*.075,970,45,darkInk);
    textBlock(headline,mid,H*.24,950,120,I,'center',2);
    const big=when.split(' · '),main=big[0]||'QUIZ NIGHT';
    textLine(main,mid,H*.51,980,156,A);
    if(big[1])textLine(big.slice(1).join(' · '),mid,H*.62,900,112,I);
    g.strokeStyle=A;g.lineWidth=7;g.beginPath();g.moveTo(100,H*.71);g.lineTo(980,H*.71);g.stroke();
    textBlock(venue,mid,H*.78,920,76,I);
  }else if(style==='chalk'){
    if(!state.photo)rect(0,0,W,H,'#172a24');
    outline(37,37,W-74,H-74,'#b89c65',18,12);outline(61,61,W-122,H-122,rgba(A,.65),3,4);
    for(let i=0;i<33;i++){const x=(i*331)%W,y=(i*227)%H;rect(x,y,30+(i%3)*22,2,rgba('#ffffff',.055))}
    textLine('IT’S TIME FOR',mid,H*.165,900,52,A,'center',600);
    textBlock(headline,mid,H*.30,930,125,I,'center',3,950);
    textLine('✦  ✦  ✦',mid,H*.47,700,60,A);
    textBlock(venue,mid,H*.58,890,72,I);
    textLine(when,mid,H*.72,910,60,A);
  }else if(style==='ticket'){
    rect(35,35,W-70,H-70,A,33);
    rect(66,65,W-132,H-130,I,21);
    const inside=light(I)?'#172a29':'#ffffff',muted=rgba(B,.92);
    g.save();g.setLineDash([14,17]);outline(94,96,W-188,H-192,muted,5,10);g.restore();
    [H*.25,H*.75].forEach(y=>{rect(23,y-36,90,72,B,38);rect(W-112,y-36,90,72,B,38)});
    textLine('ADMIT ONE TEAM',mid,H*.16,850,45,inside);
    textBlock(headline,mid,H*.29,830,118,inside);
    rect(120,H*.47,840,5,A);
    textBlock(venue,mid,H*.56,820,65,inside);
    textLine(when,mid,H*.69,820,63,inside);
    g.save();g.fillStyle=inside;for(let j=0;j<28;j++)rect(150+j*29,H-145,11,55,inside);g.restore();
  }else if(style==='photo'){
    const gradient=g.createLinearGradient(0,0,0,H);
    gradient.addColorStop(0,'rgba(0,0,0,.58)');gradient.addColorStop(.43,'rgba(0,0,0,.12)');gradient.addColorStop(1,'rgba(0,0,0,.8)');
    rect(0,0,W,H,gradient);
    rect(64,75,350,14,A,4);
    textBlock(headline,80,H*.24,900,122,'#ffffff','left',3);
    rect(75,H*.53,930,3,A);
    textBlock(venue,80,H*.60,920,87,'#ffffff','left',3);
    textLine(when,80,H*.75,920,57,A,'left');
  }else if(style==='minimal'){
    rect(0,0,38,H,A);
    rect(75,85,150,16,A,6);
    textLine('YOUR NEXT GREAT NIGHT',83,H*.17,880,40,I,'left',700);
    textBlock(headline,80,H*.28,910,145,I,'left',3,900);
    rect(80,H*.49,270,13,A,6);
    textBlock(venue,85,H*.59,870,80,I,'left');
    textBlock(when,85,H*.76,860,60,A,'left');
  }else if(style==='question'){
    g.save();g.globalAlpha=.12;textLine('?',mid,H*.47,920,800,A);g.restore();
    capsule('GOT THE ANSWERS?',mid,H*.13,790,A,darkInk);
    textBlock(headline,mid,H*.33,940,125,I,'center',3);
    textBlock(venue,mid,H*.58,900,74,I);
    textLine(when,mid,H*.72,930,65,A);
  }else if(style==='calendar'){
    rect(55,70,970,H*.59,'#fff8ed',30);
    rect(55,70,970,145,A,30);
    rect(55,178,970,37,A);
    [220,860].forEach(x=>{rect(x,44,42,78,'#b8c9b9',17);outline(x,44,42,78,'#283f39',7,17)});
    textLine('MARK YOUR CALENDAR',mid,142,900,56,darkInk);
    const date=val('posterDay')||'QUIZ NIGHT';
    textBlock(date,mid,H*.31,880,110,'#152f2b');
    textLine(val('posterTime'),mid,H*.44,900,78,'#152f2b');
    textBlock(headline,mid,H*.58,940,99,I);
    textBlock(venue,mid,H*.76,920,72,I);
  }
  // Supporting copy stays away from the main headline and gives useful poster details.
  if(extra && ['classic','chalk','photo','minimal','question'].includes(style)){
    textBlock(extra,style==='photo'||style==='minimal'?80:mid,H*.83,style==='photo'||style==='minimal'?900:850,38,style==='photo'?'#ffffff':I,style==='photo'||style==='minimal'?'left':'center',2,600);
  }
  if(['bigtime','calendar','ticket'].includes(style)&&extra){
    textBlock(extra,mid,H*.86,850,37,style==='ticket'?(light(I)?'#172a29':'#ffffff'):I,'center',2,550);
  }
  const info=[entry,prize].filter(Boolean).join('  •  ');
  const footerY=H-118;
  if(style!=='ticket'){
    const strip=style==='photo'?'rgba(5,19,18,.70)':rgba(B,.96);
    rect(0,H-186,W,186,strip);
    rect(0,H-186,W,7,A);
    textLine(info||'BRING YOUR TEAM',mid,footerY,940,43,style==='photo'?'#ffffff':I);
  }else textLine(info,mid,H-210,835,39,light(I)?'#172a29':'#ffffff');
  const logoSize=Number(q('posterLogoSize').value)||100;
  const scale=logoSize/100,logoY=H-46;
  if(state.pubLogo)imageLogo(state.pubLogo,130,logoY,190*scale,68*scale);
  if(state.hostLogo)imageLogo(state.hostLogo,945,logoY,200*scale,68*scale);
  else if(host)textLine(host,style==='minimal'?790:mid,logoY,450,27,style==='photo'?'#ffffff':style==='ticket'?(light(I)?'#172a29':'#ffffff'):I,'center',700);
  g.restore();
  q('posterSize').textContent=W+' × '+H+' px';
}
function safeDraw(){
  try{draw();q('posterStatus').textContent='Ready to download as a high-resolution PNG.'}
  catch(error){q('posterStatus').textContent='Preview error: '+error.message}
}
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
  for(const k of Object.keys(state))state[k]=null;
  ['posterClearPhoto','posterClearPubLogo','posterClearHostLogo'].forEach(id=>q(id).hidden=true);
  try{localStorage.removeItem('chipin.quizposter.settings.v1')}catch{}
  safeDraw();
};
let serial=0;
q('posterDownload').onclick=()=>{
  try{draw()}catch(e){q('posterStatus').textContent='Could not render: '+e.message;return}
  canvas.toBlob(blob=>{
    if(!blob){q('posterStatus').textContent='Your browser could not create the PNG.';return}
    const url=URL.createObjectURL(blob),a=document.createElement('a');
    a.href=url;a.download='QuizPoster_'+(layouts[val('posterLayout')]||'Classic').replace(/[^A-Za-z]/g,'')+'_'+String(++serial).padStart(4,'0')+'.png';
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
safeDraw();
