// Static quiz and event promotion posters. All images stay in this browser.
const q=id=>document.getElementById(id);
const canvas=q('posterCanvas'),g=canvas.getContext('2d',{alpha:false});
const fields=['posterFormat','posterLayout','posterVenue','posterHeadline','posterExtra','posterDay','posterTime','posterWhen','posterEntry','posterPrizeCount','posterPrize','posterPrize2','posterPrize3','posterPrize4','posterPrize5','posterArtwork','posterHost','posterBg','posterInk','posterAccent','posterTextMode','posterPhotoShade','posterPhotoPosition','posterLogoSize','posterPubChoice','posterHostChoice'];
const state={photo:null,pubLogo:null,hostLogo:null};
const illustratedLayouts=['classic','question','ticket','chalk','photo'];
const artworkKeys=['quiz','trophy','music','bulb','pub','christmas','newyear','valentine','stpatrick','easter','summer','halloween'];
const prizeIds=['posterPrize','posterPrize2','posterPrize3','posterPrize4','posterPrize5'];
const ranks=['1st','2nd','3rd','4th','5th'];
function prizeCount(){return Math.max(0,Math.min(5,Number(val('posterPrizeCount'))||0))}
function syncPosterControls(){
  const n=prizeCount();
  q('posterPrizeFields').hidden=n===0;
  for(const label of q('posterPrizeFields').querySelectorAll('[data-prize-place]'))label.hidden=Number(label.dataset.prizePlace)>n;
  q('posterArtworkOptions').hidden=!illustratedLayouts.includes(val('posterLayout'));
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
// Original print-style illustration collection. Native canvas artwork is resolution independent.
function drawIllustration(key,w,h,style,bg,ink,accent){
  const themes={
    quiz:['#233b38','#e6c687','#f2e8ce'], trophy:['#233734','#e5bd6c','#f6e7bd'],
    music:['#253047','#e6aa74','#e9d5b6'],bulb:['#243d42','#eabf68','#f6e7c2'],
    pub:['#3d3030','#e4b879','#f3dcc2'],christmas:['#173a30','#d9b26e','#f6e5d2'],
    newyear:['#182b46','#edcc78','#f1e5c8'],valentine:['#49283a','#e6a6ac','#f8ded6'],
    stpatrick:['#214435','#e2c479','#d9e6ba'],easter:['#35444a','#e6b8b6','#dce9c4'],
    summer:['#254b55','#f4c472','#f6e7c9'],halloween:['#392b36','#f1a05d','#f4dbc0']
  };
  let [base,gold,cream]=themes[key]||themes.quiz;
  if(style==='chalk'){base='#202727';gold=accent;cream='#f2e9d6'}
  const gradient=g.createRadialGradient(w*.5,h*.42,0,w*.5,h*.5,Math.max(w,h)*.7);
  gradient.addColorStop(0,base);gradient.addColorStop(1,'#111c1e');
  rect(0,0,w,h,gradient);
  // Fixed-seed print grain, subtle border and decorative corner accents.
  let seed=139;
  const rnd=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
  g.save();g.globalAlpha=style==='chalk'?.14:.08;
  for(let i=0;i<Math.min(2000,Math.round(w*h/260));i++){g.fillStyle=i%3?cream:'#0c1516';g.fillRect(rnd()*w,rnd()*h,1+rnd()*2,1+rnd()*1.3)}
  g.restore();
  const inset=Math.min(w,h)*.045;
  g.strokeStyle=rgba(gold,.42);g.lineWidth=2;g.strokeRect(inset,inset,w-2*inset,h-2*inset);
  // All scenes have a central 360×260 plate, with surrounding marks in landscape.
  const s=Math.min(w/460,h/320),cx=w/2,cy=h/2;
  g.save();g.translate(cx,cy);g.scale(s,s);
  const chalk=style==='chalk';
  function path(d,fill=null,stroke=cream,lw=3.4){
    const p=new Path2D(d);g.lineCap='round';g.lineJoin='round';
    if(fill){g.fillStyle=chalk?rgba(fill,.21):fill;g.fill(p)}
    if(stroke){g.strokeStyle=stroke;g.lineWidth=lw;g.stroke(p)}
  }
  function circle(x,y,r,fill=null,stroke=cream,lw=3){
    g.beginPath();g.arc(x,y,r,0,Math.PI*2);
    if(fill){g.fillStyle=chalk?rgba(fill,.23):fill;g.fill()}
    if(stroke){g.strokeStyle=stroke;g.lineWidth=lw;g.stroke()}
  }
  function sparkle(x,y,r=9,col=gold){
    path('M '+(x-r)+' '+y+' L '+(x+r)+' '+y+' M '+x+' '+(y-r)+' L '+x+' '+(y+r),null,col,2.4);
  }
  function star(x,y,r,col=gold){
    let d='';for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,rr=i%2?r*.42:r;d+=(i?' L ':'M ')+(x+Math.cos(a)*rr)+' '+(y+Math.sin(a)*rr)}path(d+' Z',col,col,2);
  }
  function glyph(t,x,y,size=65,col=cream,font='Georgia'){
    g.fillStyle=col;g.font='900 '+size+'px '+font;g.textAlign='center';g.textBaseline='middle';g.fillText(t,x,y)
  }
  function card(x,y,a,mark){
    g.save();g.translate(x,y);g.rotate(a);
    path('M -48 -65 Q -48 -72 -40 -72 H 40 Q 48 -72 48 -65 V 65 Q 48 72 40 72 H -40 Q -48 72 -48 65 Z',base,cream,4);
    path('M -38 -62 H 38 V 62 H -38 Z',null,gold,1.6);glyph(mark,0,-3,68,gold);g.restore();
  }
  function pencil(x,y,a){
    g.save();g.translate(x,y);g.rotate(a);path('M -84 -12 H 67 L 86 0 L 67 12 H -84 Z',gold,cream,3);
    path('M -66 -12 V 12 M -60 0 H 67 M 67 -12 V 12 M 77 -5 L 86 0 L 77 5',null,cream,2);g.restore();
  }
  function leaf(x,y,a,col=gold){
    g.save();g.translate(x,y);g.rotate(a);path('M 0 0 Q -24 -23 0 -42 Q 24 -23 0 0 Z',col,col,2);path('M 0 -5 V -36',null,cream,1.5);g.restore()
  }
  function gift(x,y,scale=1){
    g.save();g.translate(x,y);g.scale(scale,scale);
    path('M -32 -17 H 32 V 33 H -32 Z',base,cream,3);path('M -36 -28 H 36 V -15 H -36 Z',gold,cream,3);
    path('M -5 -28 V 33 M 5 -28 V 33 M 0 -28 C -42 -34 -30 -59 -9 -45 L 0 -28 C 9 -49 35 -52 31 -36 Q 24 -27 0 -28',null,gold,4);g.restore()
  }
  function heart(x,y,s=1){
    g.save();g.translate(x,y);g.scale(s,s);path('M 0 32 C -16 16 -55 -5 -45 -29 C -35 -52 -9 -42 0 -25 C 9 -42 35 -52 45 -29 C 55 -5 16 16 0 32 Z',gold,cream,3);g.restore()
  }
  function egg(x,y,a,col){
    g.save();g.translate(x,y);g.rotate(a);
    path('M 0 -65 C -32 -65 -52 -10 -48 20 C -44 72 44 72 48 20 C 52 -10 32 -65 0 -65 Z',col,cream,3.5);
    path('M -43 -5 L -22 10 L 0 -5 L 22 10 L 43 -5 M -44 24 H 44',null,gold,4);
    for(let i=-2;i<=2;i++)circle(i*15,-22,2.8,cream,null);g.restore()
  }
  function shamrock(x,y,s){
    g.save();g.translate(x,y);g.scale(s,s);
    for(const [xx,yy] of [[0,-26],[-26,0],[26,0]])circle(xx,yy,23,gold,cream,3);
    path('M 0 8 Q 10 30 -7 48',null,cream,5);g.restore()
  }
  function firework(x,y,r,col){
    for(let i=0;i<12;i++){const a=i*Math.PI/6;const a2=a+.12;path('M '+(x+Math.cos(a)*r*.24)+' '+(y+Math.sin(a)*r*.24)+' Q '+(x+Math.cos(a2)*r*.65)+' '+(y+Math.sin(a2)*r*.65)+' '+(x+Math.cos(a)*r)+' '+(y+Math.sin(a)*r),null,col,i%2?2:4)}
    circle(x,y,4,col,null);
  }
  switch(key){
    case 'quiz':
      card(-100,4,-.21,'?');card(1,-21,.08,'?');card(99,5,.25,'!');pencil(-8,86,-.13);star(-153,-88,15);star(149,-76,13);break;
    case 'trophy':
      path('M -68 -83 H 68 V -48 Q 68 12 18 32 V 57 H 56 V 76 H -56 V 57 H -18 V 32 Q -68 12 -68 -48 Z',gold,cream,4);
      path('M -69 -65 H -105 Q -113 -12 -60 -6 M 69 -65 H 105 Q 113 -12 60 -6',null,gold,7);star(0,-30,25,cream);
      for(const side of [-1,1]){path('M '+(side*65)+' 83 Q '+(side*146)+' 53 '+(side*148)+' -41',null,gold,3);for(let n=0;n<4;n++)leaf(side*(99+n*15),65-n*25,side*(.75+n*.08))}
      break;
    case 'music':
      circle(-36,0,87,base,cream,4);circle(-36,0,69,null,gold,1.5);circle(-36,0,54,null,gold,1.5);circle(-36,0,29,gold,cream,3);circle(-36,0,6,base,cream,2);
      path('M 72 -70 V 26 Q 50 10 36 30 Q 24 48 49 52 Q 76 51 76 28 V -48 L 126 -58 V 10 Q 105 -6 91 15 Q 78 33 102 36 Q 130 34 130 12 V -83 Z',gold,cream,3);
      sparkle(-139,-86,13);sparkle(148,64,15);break;
    case 'bulb':
      path('M -52 42 Q -52 18 -73 -5 Q -109 -72 -44 -108 Q 0 -132 44 -108 Q 109 -72 73 -5 Q 52 18 52 42 Z',gold,cream,4);
      path('M -34 40 L -20 -21 L 0 1 L 20 -21 L 34 40 M -45 49 H 45 M -39 61 H 39 M -31 73 H 31 Q 0 100 -31 73',null,cream,4);
      for(let n=0;n<9;n++){const a=(n/8)*Math.PI+Math.PI;path('M '+Math.cos(a)*105+' '+Math.sin(a)*105+' L '+Math.cos(a)*132+' '+Math.sin(a)*132,null,gold,3)}
      break;
    case 'pub':
      path('M -144 -90 H -5 V -77 H -144 Z M -130 -77 V 97',gold,cream,4);
      path('M -100 -58 V -77 M -25 -58 V -77 M -115 -58 H -10 V 56 L -62 78 L -115 56 Z',base,cream,4);
      glyph('?',-62,5,75,gold);circle(79,5,70,base,cream,4);circle(79,5,49,null,gold,4);circle(79,5,28,null,cream,3);circle(79,5,8,gold,cream,2);
      path('M 79 5 L 143 -72 L 135 -84 L 153 -86 L 155 -68 L 143 -72',null,gold,4);break;
    case 'christmas':
      path('M 0 -117 L -49 -50 H -25 L -78 15 H -43 L -102 77 H 102 L 43 15 H 78 L 25 -50 H 49 Z','#47785b',cream,4);
      path('M -12 77 H 12 V 97 H -12 Z',gold,cream,3);star(0,-116,17);path('M -45 -35 Q 0 -3 45 -35 M -65 20 Q 0 52 65 20',null,gold,3);
      for(const [x,y] of [[-15,-58],[22,-15],[-37,5],[43,43],[-48,52],[0,58]])circle(x,y,6,gold,cream,2);
      gift(-121,66,.77);gift(120,74,.68);sparkle(-134,-61,12);sparkle(124,-44,10);break;
    case 'newyear':
      firework(-83,-32,72,gold);firework(85,-45,84,cream);firework(5,49,53,gold);
      for(const [x,y] of [[-151,77],[-123,-110],[136,69],[3,-109],[159,-5]])star(x,y,8);
      path('M -150 113 Q -70 89 0 113 Q 70 89 150 113',null,gold,3);break;
    case 'valentine':
      heart(0,-4,1.85);heart(-110,32,.77);heart(111,32,.77);
      path('M -151 -68 Q -96 -100 -52 -77 M 151 -68 Q 96 -100 52 -77',null,gold,3);
      sparkle(-132,-31,10);sparkle(132,-31,10);star(0,101,12);break;
    case 'stpatrick':
      shamrock(0,-20,1.65);shamrock(-106,48,.77);shamrock(106,48,.77);star(-124,-66,12);star(124,-66,12);
      path('M -153 103 Q 0 132 153 103',null,gold,3);break;
    case 'easter':
      egg(-92,12,-.24,'#9fae9d');egg(0,-19,.04,'#d9a8ae');egg(92,12,.24,'#a8b9c9');
      for(const side of [-1,1])for(let i=0;i<3;i++)leaf(side*(125+i*13),90,side*(.6+i*.25),'#a4b48b');
      sparkle(-133,-80,13);sparkle(135,-80,13);break;
    case 'summer':
      circle(0,-15,55,gold,cream,4);for(let i=0;i<12;i++){const a=i*Math.PI/6;path('M '+Math.cos(a)*70+' '+(-15+Math.sin(a)*70)+' L '+Math.cos(a)*96+' '+(-15+Math.sin(a)*96),null,gold,4)}
      path('M -163 56 Q 0 119 163 56',null,cream,3);
      for(let i=0;i<7;i++){let x=-151+i*43,y=61+30*Math.sin(i*Math.PI/6);path('M '+x+' '+y+' l 33 4 l -17 34 Z',i%2?gold:'#83a8ac',cream,2)}
      break;
    case 'halloween':
      for(const [x,y,r] of [[-111,36,.62],[111,36,.62],[0,9,1.12]]){
        g.save();g.translate(x,y);g.scale(r,r);path('M 0 -48 C -32 -72 -77 -38 -70 8 C -64 70 -23 73 0 58 C 23 73 64 70 70 8 C 77 -38 32 -72 0 -48 Z',gold,cream,3);
        path('M -4 -49 Q -14 -66 5 -81 L 17 -73 Q 3 -62 7 -49 M -23 -47 Q -50 0 -21 58 M 23 -47 Q 50 0 21 58',null,cream,3);
        path('M -45 -4 L -22 -30 L -7 -4 Z M 45 -4 L 22 -30 L 7 -4 Z M -38 22 L -18 33 L -8 23 L 8 34 L 18 23 L 38 17 Q 21 56 -17 48 Z',base,base,2);g.restore()
      }
      path('M -150 -71 Q -130 -96 -111 -72 Q -107 -84 -99 -83 Q -91 -84 -87 -72 Q -68 -96 -48 -71 Q -75 -78 -79 -57 Q -95 -67 -99 -55 Q -103 -67 -119 -57 Q -123 -78 -150 -71',base,cream,2);sparkle(134,-67,11);break;
  }
  // Fine hatching at the edges gives the illustration an engraved print feel.
  for(const side of [-1,1])for(let i=0;i<4;i++)path('M '+(side*(166+i*7))+' '+(-12+i*7)+' l '+(side*10)+' -10',null,rgba(gold,.58),1.5);
  g.restore();
  if(w/h>1.8){
    for(const side of [-1,1]){
      const x=w/2+side*Math.min(w*.36,h*.92);
      g.strokeStyle=rgba(gold,.52);g.lineWidth=2;g.beginPath();g.moveTo(x-22,h*.5);g.lineTo(x+22,h*.5);g.moveTo(x,h*.5-22);g.lineTo(x,h*.5+22);g.stroke();
      for(let i=0;i<3;i++){g.beginPath();g.arc(x,h*.5+(i-1)*47,2.6,0,Math.PI*2);g.fillStyle=gold;g.fill()}
    }
  }
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
  const choice=val('posterArtwork');
  const customArt=artwork&&!state.photo&&artworkKeys.includes(choice);
  const img=(artwork||state.photo)&&!customArt?plateImage(style):null;
  q('posterSize').textContent=W+' × '+H+' px';
  if((artwork||state.photo)&&!customArt&&!img)return false;
  rect(0,0,W,H,bg);
  function picture(x,y,w,h){
    g.save();g.translate(x,H*y);g.beginPath();g.rect(0,0,w,H*h);g.clip();
    if(customArt)drawIllustration(choice,w,H*h,style,bg,ink,accent);
    else if(!state.photo && (style==='ticket'||style==='question')){
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
    // A subtle frame and rule separate chalk artwork from the lettering.
    g.strokeStyle=rgba(accent,.55);g.lineWidth=3;g.strokeRect(18,18,W-36,H-36);
    rect(88,H*.386,W-176,3,rgba(accent,.5));
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
