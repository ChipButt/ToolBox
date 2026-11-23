/* Stone Buttons V1 — independent, physical wall-mounted push-button puzzle. */
'use strict';
window.StoneButtons=(()=>{
 const clone=o=>structuredClone(o), enumSet=(x,v)=>x.includes(v);
 const minmax=(v,min,max)=>Math.min(max,Math.max(min,Math.round(Number(v)||0)));
 const stamp=()=>crypto.randomUUID();

 /* Stone Lock-style engraving: cut the symbol into the underlying limestone
    pixels. Neither silhouette nor type is layered on top as a CSS decoration. */
 const faceArtCache=new Map(),sourceMasks=new Map(),mountedRefreshes=new Set();
 const limestone=new Image();
 const rockURL=new URL('../stone-dial/art/surround-limestone.jpg',document.currentScript?.src||document.baseURI);
 limestone.onload=()=>invalidateEngravings();
 limestone.onerror=()=>invalidateEngravings();
 limestone.src=rockURL.href;
 function invalidateEngravings(){
   faceArtCache.clear();panelArtCache.clear();
   for(const repaint of [...mountedRefreshes])repaint();
 }
 function maskImage(src){
   if(!src)return null;
   if(!sourceMasks.has(src)){
     const img=new Image();
     sourceMasks.set(src,img);
     img.onload=()=>invalidateEngravings();
     img.onerror=()=>invalidateEngravings();
     img.src=src;
   }
   return sourceMasks.get(src);
 }
 function carveFace(b,shape='round'){
   const key=shape+':'+b.id+':'+(b.mask||('TEXT:'+b.text));
   if(faceArtCache.has(key))return faceArtCache.get(key);
   if(!limestone.naturalWidth)return null;
   const im=b.mask?maskImage(b.mask):null;
   if(b.mask&&(!im?.complete||!im.naturalWidth))return null;
   const N=384,rock=document.createElement('canvas');rock.width=rock.height=N;
   const g=rock.getContext('2d',{willReadFrequently:true});
   const w=limestone.naturalWidth,h=limestone.naturalHeight,crop=Math.min(w,h);
   g.drawImage(limestone,Math.round((w-crop)*.42),Math.round((h-crop)*.41),crop,crop,0,0,N,N);
   const sun=g.createLinearGradient(30,10,N-15,N);
   sun.addColorStop(0,'rgba(255,236,201,.16)');
   sun.addColorStop(.52,'rgba(92,72,48,.04)');
   sun.addColorStop(1,'rgba(32,22,16,.28)');
   g.fillStyle=sun;g.fillRect(0,0,N,N);
   const mask=document.createElement('canvas');mask.width=mask.height=N;
   const mg=mask.getContext('2d',{willReadFrequently:true});
   mg.fillStyle='#fff';
   if(im){
     const ratio=Math.min(N*.62/im.naturalWidth,N*.62/im.naturalHeight);
     const rw=im.naturalWidth*ratio,rh=im.naturalHeight*ratio;
     mg.drawImage(im,(N-rw)/2,(N-rh)/2,rw,rh);
   }else{
     mg.textAlign='center';mg.textBaseline='middle';
     const words=(b.text||'✦').trim()||'✦';
     let size=N*.18;mg.font='bold '+size+'px Georgia, serif';
     const extent=mg.measureText(words).width;
     if(extent>N*.69)size*=N*.69/extent;
     mg.font='bold '+Math.max(13,size)+'px Georgia, serif';
     mg.fillText(words,N/2,N/2,N*.70);
   }
   const soft=document.createElement('canvas');soft.width=soft.height=N;
   const sg=soft.getContext('2d',{willReadFrequently:true});
   sg.filter='blur(.8px)';sg.drawImage(mask,0,0);
   const a=sg.getImageData(0,0,N,N).data;
   const surface=g.getImageData(0,0,N,N),p=surface.data;
   for(let y=2;y<N-2;y++){
     for(let x=2;x<N-2;x++){
       const j=(y*N+x)*4,depth=a[j+3]/255;
       if(depth<.008)continue;
       const nx=(a[j+7]-a[j-1])/255;
       const ny=(a[j+N*4+3]-a[j-N*4+3])/255;
       /* A dark recessed floor retains photographic stone grain, while the
          directional lip produces a physical raised highlight / cut shadow. */
       const light=Math.max(.16,Math.min(1.42,1-.64*depth-1.35*nx-1.65*ny));
       p[j]*=light;p[j+1]*=light;p[j+2]*=light;
     }
   }
   /* Physically round over the photographic limestone before rasterising it.
      A shared hand-chipped perimeter from stoneEdgeProfile is used, so each
      bevel follows the exact same silhouette as the socket. This is painted
      into the stone texture, not clipped off as an exterior CSS shadow. */
   if(shape==='round'){
     const edge=stoneEdgeRadii(b.id,720);
     for(let y=0;y<N;y++)for(let x=0;x<N;x++){
       const dx=(x+.5-N/2)/(N/100),dy=(y+.5-N/2)/(N/100);
       const angle=Math.atan2(dy,dx);
       const pos=(angle<0?angle+Math.PI*2:angle)/Math.PI/2*edge.length;
       const n=Math.floor(pos),fraction=pos-n;
       const rim=edge[n]*(1-fraction)+edge[(n+1)%edge.length]*fraction;
       const inside=(rim-Math.hypot(dx,dy))*N/100;
       const j=(y*N+x)*4;
       if(inside<0){p[j+3]=0;continue}
       if(inside>=33)continue;
       const t=Math.max(0,inside/33),slope=(1-t);
       const side=Math.cos(angle+2.38);
       const rimFloor=.53+.47*(1-Math.pow(slope,2.8));
       const light=Math.max(.28,Math.min(1.38,rimFloor+.33*side*slope+.12*Math.sin(Math.PI*t)*slope));
       p[j]=Math.max(0,Math.min(255,p[j]*light));
       p[j+1]=Math.max(0,Math.min(255,p[j+1]*light));
       p[j+2]=Math.max(0,Math.min(255,p[j+2]*light));
     }
   }
   g.putImageData(surface,0,0);
   const encoded=rock.toDataURL('image/png');
   faceArtCache.set(key,encoded);
   return encoded;
 }


 /* A reproducible hand-chipped outline for each stone. Both the loose button
    and its socket use exactly the same outline, avoiding the old two-circle
    alignment issue. Noise is gently correlated, not a jagged star polygon. */
 function stoneEdgeRadii(key,count){
   let seed=2166136261;
   for(let i=0;i<key.length;i++)seed=Math.imul(seed^key.charCodeAt(i),16777619)>>>0;
   const phase=n=>((seed>>>(n%19))%997)/997*Math.PI*2;
   const p1=phase(1),p2=phase(7),p3=phase(13),p4=phase(17);
   const chips=[phase(3),phase(9),phase(15)];
   const radii=[];
   for(let i=0;i<count;i++){
     const a=i*Math.PI*2/count;
     let r=49.12+
       .47*Math.sin(a*6+p1)+
       .31*Math.sin(a*13+p2)+
       .17*Math.sin(a*27+p3)+
       .09*Math.sin(a*43+p4);
     for(const [idx,angle] of chips.entries()){
       const dist=Math.atan2(Math.sin(a-angle),Math.cos(a-angle));
       r-=(idx===0?.47:.27)*Math.exp(-.5*(dist/.048)**2);
     }
     radii.push(r);
   }
   return radii;
 }
 function stoneEdgeProfile(key){
   const radii=stoneEdgeRadii(key,144);
   const points=radii.map((r,i)=>{
     const a=i*Math.PI*2/144;
     return (50+r*Math.cos(a)).toFixed(3)+'% '+(50+r*Math.sin(a)).toFixed(3)+'%';
   });
   return 'polygon('+points.join(',')+')';
 }


 /* One continuous, hand-worked contour for the rectangular stone parts.
    Each panel uses a deterministic outline so opening/closing never shifts the
    edge. Rounded corners remain rounded; only the carved perimeter wanders. */
 function wornRectangle(key,rx=3,ry=6,roughness=.29){
   let seed=2166136261;
   for(const letter of key)seed=Math.imul(seed^letter.charCodeAt(0),16777619)>>>0;
   const angle=n=>((seed>>>(n%21))%10007)/10007*Math.PI*2;
   const points=[],a0=angle(3),a1=angle(8),a2=angle(16);
   const corners=(cx,cy,start,end,segments)=>{
     for(let i=0;i<=segments;i++){
       const a=start+(end-start)*i/segments;
       points.push([cx+rx*Math.cos(a),cy+ry*Math.sin(a),Math.cos(a),Math.sin(a)]);
     }
   };
   const line=(x0,y0,x1,y1,nx,ny,segments)=>{
     for(let i=0;i<=segments;i++){
       const u=i/segments;
       points.push([x0+(x1-x0)*u,y0+(y1-y0)*u,nx,ny]);
     }
   };
   line(rx,0,100-rx,0,0,-1,96);
   corners(100-rx,ry,-Math.PI/2,0,20);
   line(100,ry,100,100-ry,1,0,74);
   corners(100-rx,100-ry,0,Math.PI/2,20);
   line(100-rx,100,rx,100,0,1,96);
   corners(rx,100-ry,Math.PI/2,Math.PI,20);
   line(0,100-ry,0,ry,-1,0,74);
   corners(rx,ry,Math.PI,Math.PI*1.5,20);
   const size=points.length;
   const cuts=[angle(5)/(Math.PI*2),angle(12)/(Math.PI*2),angle(19)/(Math.PI*2)];
   const result=points.map(([x,y,nx,ny],i)=>{
     const t=i/size,theta=t*Math.PI*2;
     let d=roughness*(
       .56*Math.sin(17*theta+a0)+
       .29*Math.sin(39*theta+a1)+
       .15*Math.sin(83*theta+a2));
     for(let ci=0;ci<cuts.length;ci++){
       const gap=Math.abs(t-cuts[ci]),wrap=Math.min(gap,1-gap);
       d-=roughness*(ci===0?.8:.55)*Math.exp(-.5*(wrap/.005)**2);
     }
     return (Math.max(0,Math.min(100,x+nx*d))).toFixed(3)+'% '+
            (Math.max(0,Math.min(100,y+ny*d))).toFixed(3)+'%';
   });
   return 'polygon('+result.join(',')+')';
 }


 /* Stone Buttons V9: photographic height-field art.
    This is a canvas-rendered stone slab, carved central trough and real
    socket cavities. Both dimensions and positions come from the actual
    puzzle layout, so all 2–12-button formats inherit consistent materials.
    The silhouette buttons remain separate, accessible input elements. */
 const panelArtCache=new Map();
 const clamp01=v=>Math.max(0,Math.min(1,v));
 const ease=v=>{v=clamp01(v);return v*v*(3-2*v)};
 function inRoundedRect(x,y,b,r){
   const cx=b.x+b.w/2,cy=b.y+b.h/2;
   const qx=Math.abs(x-cx)-(b.w/2-r),qy=Math.abs(y-cy)-(b.h/2-r);
   return -(Math.hypot(Math.max(qx,0),Math.max(qy,0))+Math.min(Math.max(qx,qy),0)-r);
 }
 function panelImage(frame){
   if(!frame.isConnected||!limestone.naturalWidth)return;
   const art=frame.querySelector('.sb-panel-art');
   if(!art)return;
   const rect=frame.getBoundingClientRect();
   if(rect.width<40||rect.height<40)return;
   const sc=Math.min(1.3,1150/Math.max(rect.width,rect.height));
   const W=Math.max(120,Math.round(rect.width*sc)),H=Math.max(110,Math.round(rect.height*sc));
   const relative=node=>{
     const b=node.getBoundingClientRect();
     return {x:(b.left-rect.left)*sc,y:(b.top-rect.top)*sc,w:b.width*sc,h:b.height*sc};
   };
   const trough=relative(frame.querySelector('.sb-surround'));
   const bottom=relative(frame.querySelector('.sb-bed'));
   const sockets=[...frame.querySelectorAll('.sb-seat')].map((node,i)=>({id:dLayoutID(node,i),...relative(node),face:relative(node.querySelector('.sb-button'))}));
   const shape=frame.classList.contains('sb-round')?'round':'square';
   const key=JSON.stringify([W,H,trough,bottom,shape,sockets.map(b=>[b.id,Math.round(b.x),Math.round(b.y),Math.round(b.w),Math.round(b.h),Math.round(b.face.w*100)/100])]);
   art.width=W;art.height=H;
   const ctx=art.getContext('2d',{alpha:true,willReadFrequently:false});
   if(panelArtCache.has(key)){ctx.drawImage(panelArtCache.get(key),0,0);return}
   const painted=document.createElement('canvas');painted.width=W;painted.height=H;
   const pctx=painted.getContext('2d',{alpha:true,willReadFrequently:true});
   /* Natural photo is real stone, not synthetic procedural noise. The
      measured height-field below controls its directional carved relief. */
   const im=limestone;
   let sx=0,sy=0,sw=im.naturalWidth,sh=im.naturalHeight;
   const ratio=W/H,srcRatio=sw/sh;
   if(srcRatio>ratio){sw=sh*ratio;sx=(im.naturalWidth-sw)*.47}
   else{sh=sw/ratio;sy=(im.naturalHeight-sh)*.53}
   pctx.drawImage(im,sx,sy,sw,sh,0,0,W,H);
   let pixels=pctx.getImageData(0,0,W,H),rgba=pixels.data;
   const field=new Float32Array(W*H),outside=new Uint8Array(W*H);
   // Independently shaded 360-degree socket walls. Relief lighting alone
   // makes one side bright and previously erased the shadow elsewhere.
   const socketOcclusion=new Float32Array(W*H);
   const border={x:1.5,y:1.5,w:W-3,h:H-3},innerLine={x:W*.03,y:H*.04,w:W*.94,h:H*.92};
   const edge=Math.max(9,Math.min(W,H)*.042),seam=Math.max(1.3,W*.0025);
   const scaledHoles=sockets.map(b=>({
      // Match the actual visible button, not a larger imaginary hole based
      // on the full seat. A ~1px collar is enough for a fitted stone socket.
      cx:b.face.x+b.face.w/2,cy:b.face.y+b.face.h/2,
      r:Math.min(b.face.w,b.face.h)/2+Math.max(.75,Math.min(1.4,Math.min(b.face.w,b.face.h)*.011)),
      b:{x:b.face.x-.95,y:b.face.y-.95,w:b.face.w+1.9,h:b.face.h+1.9}}));
   const noiseX=new Float32Array(W),noiseY=new Float32Array(H);
   for(let x=0;x<W;x++)noiseX[x]=.52*Math.sin(x*.13+.7)+.21*Math.sin(x*.41+1.8);
   for(let y=0;y<H;y++)noiseY[y]=.43*Math.sin(y*.18+.6)+.18*Math.sin(y*.39+2.1);
   const rr0=Math.max(11,Math.min(W,H)*.052);
   const rr1=Math.max(11,Math.min(trough.w,trough.h)*.064);
   const rr2=Math.max(8,Math.min(bottom.w,bottom.h)*.061);
   for(let y=0;y<H;y++)for(let x=0;x<W;x++){
     const k=y*W+x,distNoise=(noiseX[x]+noiseY[y])*.91;
     const d=inRoundedRect(x,y,border,rr0)+distNoise;
     if(d<=0){outside[k]=1;continue}
     let h=42*ease(d/edge);
     const lining=inRoundedRect(x,y,innerLine,Math.max(9,rr0*.84));
     h-=3.5*Math.exp(-Math.pow((lining-1.5)/Math.max(1,seam),2));
     const dt=inRoundedRect(x,y,trough,rr1)+distNoise*.6;
     if(dt>0)h-=38*ease(dt/Math.max(10,edge*.78));
     const db=inRoundedRect(x,y,bottom,rr2)+distNoise*.39;
     if(db>0)h-=10*ease(db/Math.max(6,edge*.48));
     for(const hole of scaledHoles){
       const dx=x-hole.cx,dy=y-hole.cy;
       const near=hole.r-Math.hypot(dx,dy);
       if(near<-(edge*.36))continue;
       const rough=.45*Math.sin(Math.atan2(dy,dx)*17+x*.05)+.22*Math.cos(Math.atan2(dy,dx)*37+y*.07);
       let inside;
       if(shape==='round')inside=near+rough;
       else inside=inRoundedRect(x,y,hole.b,Math.min(hole.b.w,hole.b.h)*.20)+rough;
       if(inside>0)h-=24*ease(inside/Math.max(4,hole.r*.12));
       // A genuinely recessed collar needs ambient occlusion at EVERY
       // angle, irrespective of the directional highlight. Centre the
       // band on the rough hole perimeter; the raised button covers its
       // deepest section and leaves the outer collar visible.
       const rimWidth=Math.max(2,Math.min(4.1,hole.r*.058));
       const rimDistance=(inside-.4)/rimWidth;
       const continuousShadow=.47*Math.exp(-.5*rimDistance*rimDistance);
       const wallShadow=inside>0?.10*ease(inside/Math.max(2,hole.r*.075)):0;
       socketOcclusion[k]=Math.max(socketOcclusion[k],Math.min(.57,continuousShadow+wallShadow));
     }
     field[k]=h;
   }
   for(let y=0;y<H;y++)for(let x=0;x<W;x++){
     const k=y*W+x,j=k*4;
     if(outside[k]){rgba[j+3]=0;continue}
     const h=field[k],
       x0=Math.max(0,x-1),x1=Math.min(W-1,x+1),
       y0=Math.max(0,y-1),y1=Math.min(H-1,y+1),
       hx=field[y*W+x1]-field[y*W+x0],
       hy=field[y1*W+x]-field[y0*W+x],
       nx=-hx*.32,ny=-hy*.32,
       inv=1/Math.hypot(nx,ny,1),
       direction=(-.53*nx-.57*ny+.65)*inv,
       lighting=(.56+.70*Math.max(0,direction)),
       ambient=.53+.47*ease((h+20)/63),
       // Uniform socket-wall occlusion must not appear offset from the
       // centred button. Neutralise the directional relief only in the
       // narrow socket collar; keep directional highlights on the stone
       // face and all other parts of the photographed limestone panel.
       ringBlend=Math.min(.92,socketOcclusion[k]*1.95),
       socketLighting=lighting*(1-ringBlend)+1.015*ringBlend,
       lit=socketLighting*ambient*(1-socketOcclusion[k]);
     rgba[j]=Math.min(255,rgba[j]*lit*1.15+6);
     rgba[j+1]=Math.min(255,rgba[j+1]*lit*1.07+3);
     rgba[j+2]=Math.min(255,rgba[j+2]*lit*.95);
   }
   pctx.putImageData(pixels,0,0);
   /* Very subtle photographed highlights and age at the slab corners. */
   pctx.save();pctx.globalCompositeOperation='source-atop';
   const warmth=pctx.createLinearGradient(0,0,W,H);
   warmth.addColorStop(0,'rgba(255,235,191,.17)');
   warmth.addColorStop(.42,'rgba(255,235,193,0)');
   warmth.addColorStop(1,'rgba(31,19,8,.16)');
   pctx.fillStyle=warmth;pctx.fillRect(0,0,W,H);
   pctx.restore();
   ctx.drawImage(painted,0,0);
   if(panelArtCache.size>16)panelArtCache.clear();
   panelArtCache.set(key,painted);
 }
 function dLayoutID(node,index){return node.dataset.id||String(index)}

 function defaultDesign(){
   const icons=window.FaceSets?.get('Traitors dungeon talismans')||[];
   const names=['Raven','Sun','Moon','Dagger','Crown','Serpent'];
   const buttons=names.map((text,i)=>{const icon=icons.find(v=>v.text.toLowerCase()===text.toLowerCase());return {id:'b'+(i+1),text,mask:icon?.mask||''}});
   return {version:1,name:'Stone Buttons',layout:'grid',shape:'round',buttons,columns:3,
     mode:'sequence',sequence:[buttons[0].id,buttons[2].id,buttons[1].id,buttons[3].id],
     stages:[[buttons[0].id,buttons[2].id],[buttons[1].id,buttons[3].id]],
     counts:Object.fromEntries(buttons.map((b,i)=>[b.id,[2,1,3,1,0,2][i]])),
     timing:{holdMs:0,maxGapMs:0,totalMs:0},failure:'reset-stage',feedback:'marks',latch:false,sound:false,
     success:'sink',allowReset:true};
 }
 function validate(x){
   const d=clone(x);if(!d||d.version!==1)throw Error('Stone Buttons V1 design required.');
   if(!Array.isArray(d.buttons)||d.buttons.length<2||d.buttons.length>12)throw Error('Choose 2–12 buttons.');
   if(!enumSet(['row','column','grid','circle','custom'],d.layout)||!enumSet(['round','square'],d.shape))throw Error('Choose a valid button layout and shape.');
   if(!Number.isInteger(d.columns)||d.columns<1||d.columns>6)throw Error('Choose one to six columns.');
   const ids=new Set();
   for(const b of d.buttons){
     if(!b||typeof b.id!=='string'||!b.id||ids.has(b.id)||typeof b.text!=='string'||b.text.length>42)throw Error('Each button needs a unique ID and short inscription.');
     if(b.mask&&(!/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(b.mask)))throw Error('Button silhouettes must be PNG artwork.');
     if(d.layout==='custom'&&(!Number.isFinite(b.x)||b.x<8||b.x>92||!Number.isFinite(b.y)||b.y<8||b.y>92))throw Error('Custom button positions must be between 8% and 92%.');
     ids.add(b.id);
   }
   if(!enumSet(['sequence','counts','stages'],d.mode)||!enumSet(['reset-stage','reset-all','ignore'],d.failure))throw Error('Invalid solution mode or failure rule.');
   if(!enumSet(['none','marks','latch'],d.feedback)||!enumSet(['sink','seal','none'],d.success))throw Error('Invalid visual behaviour.');
   for(const prop of ['sound','allowReset','latch'])if(typeof d[prop]!=='boolean')throw Error('Invalid '+prop+' setting.');
   const seqOK=s=>Array.isArray(s)&&s.length>0&&s.length<=120&&s.every(id=>ids.has(id));
   if(!seqOK(d.sequence))throw Error('Record at least one valid sequence step.');
   if(!Array.isArray(d.stages)||!d.stages.length||d.stages.length>12||!d.stages.every(seqOK))throw Error('Every stage must contain valid steps.');
   if(!d.counts||typeof d.counts!=='object'||Object.keys(d.counts).some(id=>!ids.has(id))||
     [...ids].some(id=>!Number.isInteger(d.counts[id])||d.counts[id]<0||d.counts[id]>30))throw Error('Press counts must be 0–30 for every button.');
   if(d.mode==='counts'&&!Object.values(d.counts).some(n=>n>0))throw Error('At least one button needs a nonzero press count.');
   if(!d.timing||!['holdMs','maxGapMs','totalMs'].every(k=>Number.isInteger(d.timing[k])&&d.timing[k]>=0&&d.timing[k]<=120000))throw Error('Timing must be 0–120,000 ms.');
   if(d.timing.holdMs>0&&d.timing.holdMs<150)throw Error('Minimum hold time is 150 ms.');
   if(d.timing.maxGapMs>0&&d.timing.maxGapMs<250)throw Error('Minimum time between presses is 250 ms.');
   if(d.timing.totalMs>0&&d.timing.totalMs<500)throw Error('Minimum total time is 500 ms.');
   return d;
 }
 function buttonLabel(b){return b.text||'Unmarked stone'}
 function mount(host,opts={}){
   if(typeof host==='string')host=document.querySelector(host);
   const d=validate(opts.design||defaultDesign());
   const make=(t,c,txt)=>{const x=document.createElement(t);x.className=c||'';if(txt!==undefined)x.textContent=txt;return x};
   const shell=make('div','sb-mount'),preview=make('button','sb-preview');
   preview.type='button';preview.disabled=!!opts.editable;preview.setAttribute('aria-label','Examine Stone Buttons mechanism');
   shell.append(preview);host.append(shell);
   let popup=null,plate=null,solved=false,startTime=0,lastTime=0,stage=0,progress=0,pressFlash=null;
   let counts=Object.fromEntries(d.buttons.map(b=>[b.id,0])),pressedCount=0,history=[],audio=null,pressing=null;
   const sequence=()=>d.mode==='stages'?d.stages[stage]:d.sequence;
   function pressSound(){
     if(!d.sound)return;
     try{const A=window.AudioContext||window.webkitAudioContext;if(!A)return;audio ||=new A();
       const o=audio.createOscillator(),g=audio.createGain(),t=audio.currentTime;
       o.type='triangle';o.frequency.setValueAtTime(108,t);o.frequency.exponentialRampToValueAtTime(49,t+.08);
       g.gain.setValueAtTime(.04,t);g.gain.exponentialRampToValueAtTime(.0001,t+.09);
       o.connect(g);g.connect(audio.destination);o.start(t);o.stop(t+.10);
     }catch{}
   }
   function board(interactive){
     const frame=make('div','sb-stone sb-'+d.layout+' sb-'+d.shape);frame.dataset.success=d.success;frame.style.setProperty('--sb-count',d.buttons.length);
     frame.classList.add('sb-artwork-mode');
     const panelCanvas=make('canvas','sb-panel-art');
     panelCanvas.setAttribute('aria-hidden','true');frame.append(panelCanvas);
     frame.style.setProperty('--sb-outer-profile',wornRectangle('stone-panel-outer',3.7,5.2,.37));
     frame.style.setProperty('--sb-panel-line-profile',wornRectangle('stone-panel-inner-line',3.2,5.1,.32));
     frame.style.setProperty('--sb-surround-profile',wornRectangle('stone-panel-recess-rim',3.8,7.1,.40));
     frame.style.setProperty('--sb-bed-profile',wornRectangle('stone-panel-inner-bed',2.9,6.2,.38));
     frame.style.setProperty('--sb-cols',d.layout==='row'?d.buttons.length:d.layout==='column'?1:Math.min(d.columns,d.buttons.length));
     const surround=make('div','sb-surround'),well=make('div','sb-bed'),holes=make('div','sb-buttons');well.append(holes);surround.append(well);frame.append(surround);
     holes.style.setProperty('--sb-cols',d.layout==='row'?d.buttons.length:d.layout==='column'?1:Math.min(d.columns,d.buttons.length));
     d.buttons.forEach((b,i)=>{
       const seat=make('div','sb-seat'),face=make(interactive?'button':'div','sb-button');
       seat.dataset.id=b.id;face.dataset.id=b.id;face.dataset.index=i;
       if(d.shape==='round'){
         const matchedEdge=stoneEdgeProfile(b.id);
         seat.style.clipPath=matchedEdge;
         face.style.clipPath=matchedEdge;
       }
       if(interactive){face.type='button';face.setAttribute('aria-label','Press engraved '+buttonLabel(b)+' stone button');}
       const carved=carveFace(b,d.shape);
       if(carved){
         const engraving=make('img','sb-engraved-art');
         engraving.src=carved;engraving.alt='';engraving.draggable=false;engraving.setAttribute('aria-hidden','true');
         face.append(engraving);
       }
       // Until the photographic relief finishes loading, show plain stone,
       // never the old CSS silhouette floating above the face.
       if(pressFlash===b.id)face.classList.add('sb-pulse');
       if((d.feedback==='latch'||d.latch)&&history.includes(b.id))face.classList.add('sb-latched');
       seat.append(face);holes.append(seat);
       if(d.layout==='circle'){
         const angle=2*Math.PI*i/d.buttons.length-Math.PI/2;
         Object.assign(seat.style,{left:(50+34*Math.cos(angle))+'%',top:(50+34*Math.sin(angle))+'%',width:Math.min(21,175/d.buttons.length)+'%'});
       }
       if(d.layout==='custom')Object.assign(seat.style,{left:b.x+'%',top:b.y+'%'});
       if(interactive){
         const impulse=()=>{
           pressFlash=b.id;
           if(d.feedback==='latch'||d.latch)face.classList.toggle('sb-latched',true);
           pressSound();input(b.id);
         };
         if(d.timing.holdMs===0)face.onclick=impulse;
         else{
           face.onpointerdown=e=>{if(solved)return;pressing={id:b.id,pointerId:e.pointerId,at:performance.now(),face};face.classList.add('sb-held');try{face.setPointerCapture(e.pointerId)}catch{}};
           face.onpointerup=e=>{if(!pressing||pressing.id!==b.id||pressing.pointerId!==e.pointerId)return;const duration=performance.now()-pressing.at;pressing=null;face.classList.remove('sb-held');if(duration>=d.timing.holdMs)impulse();else failure();};
           face.onpointercancel=()=>{pressing=null;face.classList.remove('sb-held')};
           face.onkeydown=e=>{if((e.key==='Enter'||e.key===' ')&&!e.repeat){e.preventDefault();pressing={id:b.id,at:performance.now(),keyboard:true}}};
           face.onkeyup=e=>{if(pressing?.keyboard&&(e.key==='Enter'||e.key===' ')){e.preventDefault();const length=performance.now()-pressing.at;pressing=null;if(length>=d.timing.holdMs)impulse();else failure()}};
         }
       }
     });
     const seal=make('div','sb-centre-seal');seal.setAttribute('aria-hidden','true');surround.append(seal);
     if(d.feedback==='marks'){
       const stripe=make('div','sb-progress');stripe.setAttribute('aria-label','Stone progress markings');
       const total=d.mode==='counts'?d.buttons.reduce((s,b)=>s+d.counts[b.id],0):
         d.mode==='stages'?d.stages.length:Math.min(d.sequence.length,24);
       for(let i=0;i<Math.min(30,total);i++)stripe.append(make('span','sb-progress-mark'+(i<successSteps()?' sb-complete-mark':'')));
       frame.append(stripe);
     }
     if(interactive&&d.allowReset){
       const reset=make('button','sb-reset','Reset stones');reset.type='button';reset.onclick=()=>resetAll();frame.append(reset);
     }
     return frame;
   }
   function successSteps(){
     return d.mode==='counts'?pressedCount:d.mode==='stages'?stage:progress;
   }
   function refresh(){
     if(preview)preview.replaceChildren(board(false));
     if(plate)plate.replaceChildren(board(true));
     requestAnimationFrame(()=>{if(preview)for(const f of preview.querySelectorAll('.sb-stone'))panelImage(f);if(plate)for(const f of plate.querySelectorAll('.sb-stone'))panelImage(f)});
     if(solved){
       preview.classList.add('sb-solved');
       if(plate)plate.classList.add('sb-solved');
     }else{preview.classList.remove('sb-solved');if(plate)plate.classList.remove('sb-solved')}
   }
   function resetAll(){startTime=0;lastTime=0;stage=0;progress=0;pressedCount=0;history=[];pressFlash=null;counts=Object.fromEntries(d.buttons.map(b=>[b.id,0]));if(!solved)refresh()}
   function failure(){
     if(solved)return;
     if(d.failure==='ignore'){refresh();return;}
     if(d.failure==='reset-all'){resetAll();return}
     progress=0;lastTime=0;history=[];
     if(d.mode==='counts'){pressedCount=0;counts=Object.fromEntries(d.buttons.map(b=>[b.id,0]));startTime=0}
     if(d.mode==='sequence')startTime=0;
     refresh();
   }
   function checkSolved(){
     if(solved)return;solved=true;
     refresh();
     if(opts.onSolved)opts.onSolved();
   }
   function input(id){
     if(solved)return;
     const now=performance.now();
     if(d.timing.maxGapMs&&lastTime&&now-lastTime>d.timing.maxGapMs)failure();
     if(!startTime)startTime=now;
     if(d.timing.totalMs&&now-startTime>d.timing.totalMs){failure();startTime=now;}
     lastTime=now;
     history.push(id);
     if(d.mode==='counts'){
       if(counts[id]>=d.counts[id]){failure();return}
       counts[id]++;pressedCount++;
       if(d.buttons.every(b=>counts[b.id]===d.counts[b.id]))checkSolved();else refresh();
       return;
     }
     const seq=sequence(),expected=seq[progress];
     if(id!==expected){failure();return}
     progress++;
     if(progress===seq.length){
       if(d.mode==='stages'&&stage+1<d.stages.length){stage++;progress=0;lastTime=0;if(d.timing.totalMs)startTime=0;refresh()}
       else checkSolved();
     }else refresh();
   }
   function open(){
     if(popup?.open)return;
     popup=make('dialog','sb-dialog');popup.setAttribute('aria-label','Stone Buttons close-up');
     const back=make('button','sb-back','Back to Room');back.type='button';back.onclick=close;
     plate=make('div','sb-stage');popup.append(back,plate);document.body.append(popup);
     const current=popup;popup.onclose=()=>{if(popup===current){popup=null;plate=null;current.remove();refresh()}};
     refresh();popup.showModal();
   }
   function close(){if(popup?.open)popup.close()}
   mountedRefreshes.add(refresh);
   const resizePanels=()=>requestAnimationFrame(()=>{for(const f of shell.querySelectorAll('.sb-stone'))panelImage(f);if(plate)for(const f of plate.querySelectorAll('.sb-stone'))panelImage(f)});
   window.addEventListener('resize',resizePanels,{passive:true});
   preview.onclick=open;refresh();
   return {open,close,reset:resetAll,press:id=>input(id),getState:()=>({solved,stage,progress,counts:clone(counts),history:[...history]}),
     destroy(){mountedRefreshes.delete(refresh);window.removeEventListener('resize',resizePanels);if(popup){popup.onclose=null;popup.remove();popup=null;plate=null}preview.remove();shell.remove();if(audio)audio.close().catch(()=>{});}};
 }
 return Object.freeze({defaultDesign,validate,mount});
})();