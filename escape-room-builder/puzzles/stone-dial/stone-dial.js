/* Stone Dial V1 — standalone stone-ring plugin; no changes to Stone Lock. */
(function(global){
"use strict";
const TWO=Math.PI*2, mod=(v,n)=>((v%n)+n)%n, copy=x=>JSON.parse(JSON.stringify(x));
const instances=new Set();
const stoneTexture=new Image();
const textureUrl=new URL("art/surround-limestone.jpg",document.currentScript?.src||document.baseURI).href;
stoneTexture.onload=()=>{for(const instance of instances)instance.invalidate()};
stoneTexture.onerror=()=>{for(const instance of instances)instance.invalidate()};
stoneTexture.src=textureUrl;
let sharedTalismans;
function talismans(){
 if(!sharedTalismans){try{sharedTalismans=global.FaceSets?.get("Traitors dungeon talismans")||[]}catch{sharedTalismans=[]}}
 return sharedTalismans;
}
function symbolMask(face){
 if(face.mask)return face.mask;
 const name=face.text?.toLowerCase().trim();
 const match=talismans().find(f=>f.text?.toLowerCase().trim()===name);
 return match?.mask||"";
}
function defaultDesign(){
 const names=["Sun","Moon","Raven","Serpent","Dagger","Crown","Star","Key"];
 const icons=talismans();
 const standard=icons.length>=5?icons.map(f=>({text:f.text,mask:f.mask})):names.slice(0,5).map(text=>({text}));
 const rings=[0,1,2].map(i=>({name:"Ring "+(i+1),start:0,faces:copy(standard)}));
 return {version:1,name:"Stone Dial",mode:"both",rim:{style:"notches",count:48},rings,
 alignment:[{ring:0,face:2},{ring:1,face:3},{ring:2,face:1}],alignmentPairs:[],
 sequence:[{ring:0,direction:"cw",revolutions:1,face:2},{ring:1,direction:"ccw",revolutions:1,face:3},{ring:2,direction:"cw",revolutions:1,face:1}]};
}
function validate(raw){
 const d=copy(raw);
 if(!d||d.version!==1||!Array.isArray(d.rings)||d.rings.length<1||d.rings.length>6)throw Error("Use one to six rings.");
 for(let i=0;i<d.rings.length;i++){
  const r=d.rings[i];
  if(!Array.isArray(r.faces)||r.faces.length<2||r.faces.length>16||!Number.isInteger(r.start)||r.start<0||r.start>=r.faces.length)throw Error("Invalid ring "+(i+1));
  if(typeof r.name!=="string")r.name="Ring "+(i+1);
  for(const f of r.faces)if(!f||typeof f.text!=="string"||f.text.length>80||f.mask&&(!/^data:image\/png;base64,[\w+/=]+$/.test(f.mask)))throw Error("Invalid engraving.");
 }
 if(!["sequence","alignment","both"].includes(d.mode))throw Error("Invalid solve mode.");
 if(!d.rim||!["notches","dots","runes","none"].includes(d.rim.style)||!Number.isInteger(d.rim.count)||d.rim.count<8||d.rim.count>96)throw Error("Invalid rim.");
 const faceOK=(r,f)=>Number.isInteger(r)&&r>=0&&r<d.rings.length&&Number.isInteger(f)&&f>=0&&f<d.rings[r].faces.length;
 if(!Array.isArray(d.sequence)||!d.sequence.every(s=>faceOK(s.ring,s.face)&&["cw","ccw"].includes(s.direction)&&Number.isInteger(s.revolutions)&&s.revolutions>=0&&s.revolutions<=10))throw Error("Invalid combination.");
 if(!Array.isArray(d.alignment)||!d.alignment.every(a=>faceOK(a.ring,a.face)))throw Error("Invalid symbol target.");
 if(!Array.isArray(d.alignmentPairs)||!d.alignmentPairs.every(a=>faceOK(a.aRing,a.aFace)&&faceOK(a.bRing,a.bFace)&&a.aRing!==a.bRing))throw Error("Invalid symbol pairing.");
 if(d.mode!=="alignment"&&!d.sequence.length)throw Error("Configure a combination step.");
 if(d.mode!=="sequence"&&!d.alignment.length&&!d.alignmentPairs.length)throw Error("Configure an alignment.");
 return d;
}
const pinRadius=14, ringRadius=420, seam=4;
function geom(count,index){
 const pitch=(ringRadius-pinRadius)/count;
 const outer=ringRadius-pitch*index,inner=outer-pitch+seam;
 return {outer,inner,center:(outer+inner)/2};
}
function ringPath(g,o,i){g.beginPath();g.arc(500,500,o,0,TWO);g.arc(500,500,i,0,TWO,true);g.closePath()}
function circ(g,x,y,r){g.beginPath();g.arc(x,y,r,0,TWO)}
// Albedo rotates with the carvings. A separate relief pass stays in room light.
function stone(g,o,i,seed){
 g.save();ringPath(g,o,i);g.clip();g.fillStyle="#b6a084";g.fillRect(0,0,1000,1000);
 if(stoneTexture.naturalWidth){
  const side=stoneTexture.naturalWidth,available=Math.max(1,stoneTexture.naturalHeight-side);
  const offset=(seed*211)%available;
  // Preserve the grain scale across the concentric bands.
  g.drawImage(stoneTexture,0,offset,side,side,0,0,1000,1000)
 }
 g.restore()
}
const reliefCache=new Map();
function relief(o,i){
 const key=o+":"+i;if(reliefCache.has(key))return reliefCache.get(key);
 const c=document.createElement("canvas");c.width=c.height=1000;
 const ctx=c.getContext("2d"),px=ctx.createImageData(1000,1000),data=px.data;
 const bevel=Math.min(i===0?24:18,(o-i)*.24),bound=Math.ceil(o);
 for(let y=500-bound;y<500+bound;y++)for(let x=500-bound;x<500+bound;x++){
  const dx=x+.5-500,dy=y+.5-500,r=Math.hypot(dx,dy);if(r>=o||r<i)continue;
  const ux=dx/(r||1),uy=dy/(r||1),outside=o-r,inside=i>0?r-i:Infinity;
  const outerSide=outside<=inside,dist=Math.min(outside,inside);
  // Small variations in the shoulder width suggest a worn chisel edge.
  const wear=1+.10*Math.sin(ux*36+uy*19+i)+.06*Math.sin(uy*62-ux*47+o);
  const flank=Math.max(0,1-dist/(bevel*wear));
  const slope=(outerSide?1:-1)*flank;
  const crown=i>0?.10*Math.sin(Math.PI*((r-i)/(o-i)-.5)):.24*r/o;
  const radial=Math.min(.995,Math.max(-.995,slope+crown*(1-flank)));
  const normalZ=Math.sqrt(1-radial*radial);
  const sun=(-.48*ux-.61*uy)*radial+.63*normalZ;
  const occlusion=1-.36*Math.exp(-dist/3.6);
  const light=(.41+.98*Math.max(0,sun)+.095*(-ux-uy))*occlusion;
  const j=(y*1000+x)*4;
  const bright=light>1;
  data[j]=bright?255:36;data[j+1]=bright?233:27;data[j+2]=bright?189:20;
  data[j+3]=Math.round(255*Math.min(.83,bright?(light-1)*.85:(1-light)*1.16))
 }
 ctx.putImageData(px,0,0);reliefCache.set(key,c);return c
}
function crownPointer(g){
 g.save();g.beginPath();g.moveTo(481,24);g.quadraticCurveTo(500,19,519,25);g.lineTo(514,43);g.lineTo(500,73);g.lineTo(486,45);g.closePath();
 g.shadowColor="rgba(24,16,10,.72)";g.shadowOffsetY=4;g.shadowBlur=5;g.fillStyle="#655541";g.fill();g.shadowBlur=g.shadowOffsetY=0;g.clip();
 if(stoneTexture.naturalWidth)g.drawImage(stoneTexture,22,64,55,84,479,20,42,57);
 g.beginPath();g.moveTo(481,24);g.lineTo(500,29);g.lineTo(500,72);g.closePath();g.fillStyle="rgba(255,228,174,.42)";g.fill();
 g.beginPath();g.moveTo(519,24);g.lineTo(500,29);g.lineTo(500,72);g.closePath();g.fillStyle="rgba(35,25,16,.39)";g.fill();g.restore()
}
function engrave(g,mask,depthGain=.75){
 const soft=document.createElement("canvas");soft.width=soft.height=1000;
 const sg=soft.getContext("2d",{willReadFrequently:true});sg.filter="blur(1.6px)";sg.drawImage(mask,0,0);
 const alpha=sg.getImageData(0,0,1000,1000).data;
 const surface=g.getImageData(0,0,1000,1000),data=surface.data;
 for(let y=39;y<961;y++)for(let x=39;x<961;x++){
  const j=(y*1000+x)*4,depth=alpha[j+3]/255;
  if(depth<.012||data[j+3]===0)continue;
  const nx=(alpha[j+11]-alpha[j-5])/255;
  const ny=(alpha[j+8003]-alpha[j-7997])/255;
  /* Dark cut floors retain the grain. A directional lip catches the room light. */
  const k=Math.max(.12,Math.min(1.58,1-depthGain*depth-1.55*nx-1.9*ny));
  for(let c=0;c<3;c++)data[j+c]*=k;
 }
 g.putImageData(surface,0,0);
}
function outer(g,d){
 g.save();g.shadowColor="#050a07";g.shadowBlur=32;g.shadowOffsetY=16;circ(g,500,500,475);g.fillStyle="#40352a";g.fill();g.restore();
 stone(g,476,423,70);
 const marks=document.createElement("canvas");marks.width=marks.height=1000;const base=g;g=marks.getContext("2d");
 for(let j=0;j<d.rim.count&&d.rim.style!=="none";j++){
  const a=j*TWO/d.rim.count-Math.PI/2,x=Math.cos(a),y=Math.sin(a);
  if(d.rim.style==="dots"){circ(g,500+454*x,500+454*y,3);g.fillStyle="#28342b";g.fill();continue;}
  if(d.rim.style==="runes"){g.save();g.translate(500+450*x,500+450*y);g.rotate(a+Math.PI/2);g.strokeStyle="#2a332d";g.lineWidth=3;g.beginPath();g.moveTo(-5,4);g.lineTo(0,-5);g.lineTo(5,4);g.stroke();g.restore();continue;}
  g.beginPath();g.moveTo(500+x*(j%5===0?438:446),500+y*(j%5===0?438:446));g.lineTo(500+x*464,500+y*464);g.strokeStyle="#26312a";g.lineWidth=j%5===0?4:2;g.stroke();
 }
 engrave(base,marks,.50);base.drawImage(relief(476,423),0,0);
}
class Dial{
 constructor(target,opts={}){
  if(typeof target==="string")target=document.querySelector(target);
  if(!target||!target.append)throw Error("Missing dial mount element.");
  this.host=target;this.options=opts;this.design=validate(opts.design||defaultDesign());
  this.turns=this.design.rings.map(r=>-r.start);this.stepIndex=0;this.travel=0;this.reverse=0;this.solved=false;this.opened=false;this.ring=0;this.images=new Map();this.art=[];this.rimArt=null;this.bossArt=null;
  this.wrap=document.createElement("div");this.wrap.className="sd-mount";
  this.button=document.createElement("button");this.button.className="sd-preview";this.button.type="button";this.button.setAttribute("aria-label","Open carved stone dial");this.button.disabled=!!opts.editable;
  this.preview=document.createElement("canvas");this.preview.width=this.preview.height=1000;this.button.append(this.preview);this.wrap.append(this.button);target.append(this.wrap);instances.add(this);
  this.click=()=>this.open();this.button.addEventListener("click",this.click);this.render();this.emit("stone-dial-ready");
 }
 emit(name,extra={}){this.host.dispatchEvent(new CustomEvent(name,{bubbles:true,detail:{values:this.getValues(),stepIndex:this.stepIndex,solved:this.solved,...extra}}))}
 async whenArtworkReady(){
  await Promise.all([stoneTexture,...this.images.values()].map(image=>image.decode()));
  this.invalidate();
 }
 getValues(){return this.turns.map((t,i)=>mod(Math.round(-t),this.design.rings[i].faces.length))}
 getState(){return {values:this.getValues(),turns:[...this.turns],stepIndex:this.stepIndex,solved:this.solved}}
 invalidate(){this.art=[];this.rimArt=null;this.bossArt=null;this.render()}
 engraving(maskCtx,f,x,y,size){
  const src=symbolMask(f);
  if(src){
   let img=this.images.get(src);
   if(!img){
    img=new Image();this.images.set(src,img);
    img.onload=()=>this.invalidate();img.src=src;
   }
   if(img.complete&&img.naturalWidth){
    const factor=Math.min(size/img.naturalWidth,size/img.naturalHeight);
    maskCtx.drawImage(img,x-img.naturalWidth*factor/2,y-img.naturalHeight*factor/2,img.naturalWidth*factor,img.naturalHeight*factor);
   }
   return;
  }
  maskCtx.save();maskCtx.fillStyle="#fff";maskCtx.textAlign="center";maskCtx.textBaseline="middle";
  maskCtx.font="bold "+Math.min(53,size*.6)+"px Georgia,serif";
  maskCtx.fillText(f.text,x,y,size*1.55);maskCtx.restore();
 }
 ringArt(i){
  const c=document.createElement("canvas");c.width=c.height=1000;
  const g=c.getContext("2d",{willReadFrequently:true}),r=this.design.rings[i],d=geom(this.design.rings.length,i);
  stone(g,d.outer,d.inner,35+i*33);
  const engravingMask=document.createElement("canvas");engravingMask.width=engravingMask.height=1000;
  const mg=engravingMask.getContext("2d");
  const n=r.faces.length,slot=TWO/n,band=d.outer-d.inner;
  const size=Math.min(130,band*.84,2*d.center*Math.sin(slot/2)*.78);
  for(let j=0;j<n;j++){
   const a=j*slot-Math.PI/2,x=500+Math.cos(a)*d.center,y=500+Math.sin(a)*d.center;
   this.engraving(mg,r.faces[j],x,y,size);
   const p=a-slot/2;
   
   mg.beginPath();mg.moveTo(500+Math.cos(p)*(d.inner+band*.20),500+Math.sin(p)*(d.inner+band*.20));mg.lineTo(500+Math.cos(p)*(d.outer-band*.20),500+Math.sin(p)*(d.outer-band*.20));mg.lineWidth=2.8;mg.stroke();
  }
  engrave(g,engravingMask);
  return c;
 }
 renderTo(c){
  const g=c.getContext("2d");g.clearRect(0,0,1000,1000);
  if(!this.rimArt){this.rimArt=document.createElement("canvas");this.rimArt.width=this.rimArt.height=1000;outer(this.rimArt.getContext("2d"),this.design);}
  g.drawImage(this.rimArt,0,0);
  for(let i=0;i<this.design.rings.length;i++){
   if(!this.art[i])this.art[i]=this.ringArt(i);
   g.save();g.translate(500,500);g.rotate(this.turns[i]*TWO/this.design.rings[i].faces.length);g.translate(-500,-500);g.drawImage(this.art[i],0,0);g.restore();
   const band=geom(this.design.rings.length,i);g.drawImage(relief(band.outer,band.inner),0,0);
   if(this.opened&&this.ring===i){circ(g,500,500,geom(this.design.rings.length,i).outer);g.strokeStyle="rgba(219,193,139,.5)";g.lineWidth=3;g.stroke();}
  }
  if(!this.bossArt){
   this.bossArt=document.createElement("canvas");this.bossArt.width=this.bossArt.height=1000;
   const bossG=this.bossArt.getContext("2d",{willReadFrequently:true});
   stone(bossG,pinRadius,0,89);bossG.drawImage(relief(pinRadius,0),0,0);
  }
  g.drawImage(this.bossArt,0,0);
  crownPointer(g);
  if(this.solved){circ(g,500,500,473);g.strokeStyle="rgba(230,200,122,.65)";g.lineWidth=6;g.stroke();}
 }
 render(){this.renderTo(this.preview);if(this.stage)this.renderTo(this.stage)}
 ringAt(x,y){const r=Math.hypot(x-500,y-500);for(let i=0;i<this.design.rings.length;i++){const d=geom(this.design.rings.length,i);if(r>=d.inner&&r<=d.outer)return i}return -1}
 setRing(i){this.ring=i;if(this.label)this.label.textContent=this.design.rings[i].name;this.render()}
 move(i,steps){
  if(this.solved||!Number.isFinite(steps)||!steps)return;
  this.turns[i]+=steps;
  if(this.design.mode!=="alignment"&&this.stepIndex<this.design.sequence.length){
   const s=this.design.sequence[this.stepIndex],sign=s.direction==="cw"?1:-1;
   if(s.ring===i){if(steps*sign>0){this.travel+=Math.abs(steps);this.reverse=0}
     else{this.travel=Math.max(0,this.travel-Math.abs(steps));this.reverse+=Math.abs(steps);if(this.reverse>.45){this.travel=0;this.reverse=0}}}
   else if(Math.abs(steps)>.6)this.travel=0;
  }
  this.render();this.emit("stone-dial-change",{ring:i});
 }
 alignmentOK(){
  const val=this.getValues();
  if(!this.design.alignment.every(a=>val[a.ring]===a.face))return false;
  const angle=(ring,face)=>-Math.PI/2+TWO*(face+this.turns[ring])/this.design.rings[ring].faces.length;
  return this.design.alignmentPairs.every(a=>Math.abs(Math.atan2(Math.sin(angle(a.aRing,a.aFace)-angle(a.bRing,a.bFace)),Math.cos(angle(a.aRing,a.aFace)-angle(a.bRing,a.bFace))))<.1);
 }
 settle(i){
  if(this.solved)return;
  this.turns[i]=Math.round(this.turns[i]);
  const s=this.design.sequence[this.stepIndex];
  if(s&&s.ring===i&&this.getValues()[i]===s.face&&this.travel>=s.revolutions*this.design.rings[i].faces.length-.05){this.stepIndex++;this.travel=0;this.reverse=0;this.emit("stone-dial-step",{completedStep:this.stepIndex})}
  const seq=this.design.mode==="alignment"||this.stepIndex===this.design.sequence.length;
  const align=this.design.mode==="sequence"||this.alignmentOK();
  if(seq&&align){this.solved=true;this.emit("stone-dial-solved");if(this.options.onSolved)this.options.onSolved(this.getValues())}
  this.render();
 }
 open(){
  if(this.opened)return;this.opened=true;
  const overlay=document.createElement("div");overlay.className="sd-overlay";overlay.setAttribute("role","dialog");overlay.setAttribute("aria-modal","true");overlay.setAttribute("aria-label","Stone Wheel close-up");
  const back=document.createElement("button");back.type="button";back.className="sd-back-fixed";back.textContent="‹ Back to room";overlay.append(back);
  const stage=document.createElement("canvas");stage.className="sd-stage";stage.width=stage.height=1000;stage.tabIndex=0;stage.style.touchAction="none";stage.setAttribute("aria-label","Drag a stone ring to rotate");
  const bar=document.createElement("div");bar.className="sd-bar";
  const left=document.createElement("button");left.textContent="↶";left.title="Counterclockwise";
  const right=document.createElement("button");right.textContent="↷";right.title="Clockwise";
  const lbl=document.createElement("span");lbl.className="sd-label";lbl.textContent=this.design.rings[0].name;
  const close=document.createElement("button");close.textContent="Back to room";close.className="sd-close";
  bar.append(left,lbl,right,close);overlay.append(stage,bar);document.body.append(overlay);
  back.onclick=()=>this.close();
  overlay.addEventListener("pointerdown",e=>{if(e.target===overlay)this.close()});
  this.overlay=overlay;this.stage=stage;this.label=lbl;this.focus=document.activeElement;
  const coords=e=>{const b=stage.getBoundingClientRect();return {x:(e.clientX-b.left)*1000/b.width,y:(e.clientY-b.top)*1000/b.height}};
  stage.addEventListener("pointerdown",e=>{const p=coords(e),r=this.ringAt(p.x,p.y);if(r<0)return;this.setRing(r);this.drag={id:e.pointerId,ring:r,angle:Math.atan2(p.y-500,p.x-500)};stage.setPointerCapture(e.pointerId);e.preventDefault()});
  stage.addEventListener("pointermove",e=>{if(!this.drag||this.drag.id!==e.pointerId)return;const p=coords(e),a=Math.atan2(p.y-500,p.x-500);const dif=Math.atan2(Math.sin(a-this.drag.angle),Math.cos(a-this.drag.angle));this.drag.angle=a;this.move(this.drag.ring,dif*this.design.rings[this.drag.ring].faces.length/TWO);e.preventDefault()});
  const end=e=>{if(!this.drag||this.drag.id!==e.pointerId)return;const r=this.drag.ring;this.drag=null;this.settle(r)};
  stage.addEventListener("pointerup",end);stage.addEventListener("pointercancel",end);
  stage.addEventListener("wheel",e=>{e.preventDefault();this.move(this.ring,e.deltaY>0?1:-1);this.settle(this.ring)},{passive:false});
  stage.addEventListener("keydown",e=>{if(["ArrowLeft","ArrowRight","ArrowUp","ArrowDown"].includes(e.key)){e.preventDefault();this.move(this.ring,(e.key==="ArrowLeft"||e.key==="ArrowDown"?-1:1)*(e.shiftKey?5:1));this.settle(this.ring)}});
  left.onclick=()=>{this.move(this.ring,-1);this.settle(this.ring)};
  right.onclick=()=>{this.move(this.ring,1);this.settle(this.ring)};
  close.onclick=()=>this.close();this.escape=e=>{if(e.key==="Escape")this.close()};document.addEventListener("keydown",this.escape);
  stage.focus();this.render();this.emit("stone-dial-open");
 }
 close(){
  if(!this.opened)return;this.opened=false;this.drag=null;document.removeEventListener("keydown",this.escape);this.overlay.remove();this.stage=null;this.overlay=null;this.label=null;this.render();if(this.focus&&this.focus.focus)this.focus.focus();this.emit("stone-dial-close");
 }
 reset(){this.turns=this.design.rings.map(r=>-r.start);this.stepIndex=0;this.travel=0;this.reverse=0;this.solved=false;this.render();this.emit("stone-dial-reset")}
 destroy(){this.close();this.button.removeEventListener("click",this.click);this.wrap.remove();this.images.clear();instances.delete(this)}
}
global.StoneDial=Object.freeze({mount:(el,options)=>new Dial(el,options),validate,defaultDesign});
})(window);
