/* Stone Dial V1 editor; standalone and isolated from builder.js */
"use strict";
const el=id=>document.getElementById(id),num=(a,b)=>Array.from({length:b-a+1},(_,i)=>[i+a,i+a]),copy=x=>JSON.parse(JSON.stringify(x));
let design=StoneDial.defaultDesign(),selectedRing=0,selectedFace=0,selectedPreset="",dial;
function status(s=""){el("status").textContent=s}
function choose(id,options,value){const n=el(id);n.replaceChildren();for(const [v,label] of options)n.add(new Option(label,v));n.value=String(value);return n}
function rings(){return design.rings.map((r,i)=>[i,r.name])}
function faces(i){return design.rings[i].faces.map((f,j)=>[j,"Face "+(j+1)+": "+(f.text||"Symbol")])}
function widget(){
 if(dial)dial.destroy();
 try{dial=StoneDial.mount(el("dial"),{design,onSolved:()=>status("")});status("");redraw()}
 catch(e){status(e.message)}
}
function redraw(){
 el("name").value=design.name;choose("mode",[["sequence","Safe combination"],["alignment","Symbol alignment"],["both","Both"]],design.mode);
 choose("rings",num(1,6),design.rings.length);el("rim").value=design.rim.style;el("rimcount").value=design.rim.count;
 choose("ring",rings(),selectedRing);const r=design.rings[selectedRing];el("ringname").value=r.name;
 choose("facecount",num(2,16),r.faces.length);choose("start",faces(selectedRing),r.start);
 const current=design.alignment.find(x=>x.ring===selectedRing);
 choose("target",[[-1,"Not required"],...faces(selectedRing)],current?current.face:-1);
 const sets=window.FaceSets?.names||[];choose("preset",[["","Choose engraving set"],...sets.map(x=>[x,x])],selectedPreset);
 el("text").value=r.faces[selectedFace].mask?"":r.faces[selectedFace].text;
 const grid=el("faces");grid.replaceChildren();
 r.faces.forEach((f,i)=>{
  const b=document.createElement("button");b.className=i===selectedFace?"chosen":"";b.type="button";
  if(f.mask){const im=document.createElement("img");im.src=f.mask;im.alt="";b.append(im)}
  else{const s=document.createElement("strong");s.textContent=f.text||"—";b.append(s)}
  const c=document.createElement("small");c.textContent="Face "+(i+1);b.append(c);
  b.onclick=()=>{selectedFace=i;redraw()};grid.append(b);
 });
 redrawSteps();redrawPairs();
}
function select(parent,opts,val,change,label){const n=document.createElement("select");n.setAttribute("aria-label",label);for(const [v,l]of opts)n.add(new Option(l,v));n.value=String(val);n.onchange=()=>change(n.value);parent.append(n)}
function number(parent,value,change,label){const n=document.createElement("input");n.type="number";n.min=0;n.max=10;n.value=value;n.setAttribute("aria-label",label);n.onchange=()=>change(Math.max(0,Math.min(10,Number(n.value)||0)));parent.append(n)}
function remove(parent,fn){const b=document.createElement("button");b.type="button";b.textContent="×";b.setAttribute("aria-label","Remove");b.onclick=fn;parent.append(b)}
function redrawSteps(){
 const parent=el("steps");parent.replaceChildren();
 design.sequence.forEach((s,i)=>{
  const row=document.createElement("div");row.className="line";
  select(row,rings(),s.ring,v=>{s.ring=+v;s.face=Math.min(s.face,design.rings[s.ring].faces.length-1);widget()},"Ring for step "+(i+1));
  select(row,[["cw","Clockwise"],["ccw","Anticlockwise"]],s.direction,v=>{s.direction=v;widget()},"Direction");
  number(row,s.revolutions,v=>{s.revolutions=v;widget()},"Full revolutions");
  select(row,faces(s.ring),s.face,v=>{s.face=+v;widget()},"Stopping face");
  remove(row,()=>{if(design.sequence.length>1){design.sequence.splice(i,1);widget()}});
  parent.append(row);
 })
}
function redrawPairs(){
 const root=el("pairs");root.replaceChildren();
 design.alignmentPairs.forEach((p,i)=>{
  const row=document.createElement("div");row.className="line pair";
  select(row,rings(),p.aRing,v=>{p.aRing=+v;if(p.aRing===p.bRing)p.bRing=(p.aRing+1)%design.rings.length;p.aFace=Math.min(p.aFace,design.rings[p.aRing].faces.length-1);widget()},"First ring");
  select(row,faces(p.aRing),p.aFace,v=>{p.aFace=+v;widget()},"First symbol");
  select(row,rings(),p.bRing,v=>{p.bRing=+v;if(p.aRing===p.bRing)p.aRing=(p.bRing+1)%design.rings.length;p.bFace=Math.min(p.bFace,design.rings[p.bRing].faces.length-1);widget()},"Second ring");
  select(row,faces(p.bRing),p.bFace,v=>{p.bFace=+v;widget()},"Second symbol");
  remove(row,()=>{design.alignmentPairs.splice(i,1);widget()});root.append(row)
 })
}
el("name").onchange=e=>{design.name=e.target.value||"Stone Dial";widget()};
el("mode").onchange=e=>{design.mode=e.target.value;widget()};
el("rim").onchange=e=>{design.rim.style=e.target.value;widget()};
el("rimcount").onchange=e=>{design.rim.count=Math.max(8,Math.min(96,Math.round(+e.target.value)||48));widget()};
el("rings").onchange=e=>{
 const n=+e.target.value;
 while(design.rings.length<n)design.rings.push({name:"Ring "+(design.rings.length+1),start:0,faces:copy(design.rings[0].faces)});
 design.rings.length=n;design.sequence=design.sequence.filter(s=>s.ring<n);
 design.alignment=design.alignment.filter(a=>a.ring<n);design.alignmentPairs=design.alignmentPairs.filter(p=>p.aRing<n&&p.bRing<n);
 if(!design.sequence.length)design.sequence=[{ring:0,direction:"cw",revolutions:1,face:0}];
 if(!design.alignment.length&&!design.alignmentPairs.length)design.alignment=[{ring:0,face:0}];
 selectedRing=Math.min(selectedRing,n-1);selectedFace=0;widget();
};
el("ring").onchange=e=>{selectedRing=+e.target.value;selectedFace=0;redraw()};
el("ringname").onchange=e=>{design.rings[selectedRing].name=e.target.value||"Stone Ring";widget()};
el("facecount").onchange=e=>{
 const r=design.rings[selectedRing],n=+e.target.value;
 while(r.faces.length<n)r.faces.push({text:String(r.faces.length+1)});
 r.faces.length=n;r.start=Math.min(r.start,n-1);selectedFace=Math.min(selectedFace,n-1);
 design.sequence.forEach(s=>{if(s.ring===selectedRing)s.face=Math.min(s.face,n-1)});
 design.alignment.forEach(a=>{if(a.ring===selectedRing)a.face=Math.min(a.face,n-1)});
 design.alignmentPairs.forEach(p=>{if(p.aRing===selectedRing)p.aFace=Math.min(p.aFace,n-1);if(p.bRing===selectedRing)p.bFace=Math.min(p.bFace,n-1)});
 widget();
};
el("start").onchange=e=>{design.rings[selectedRing].start=+e.target.value;widget()};
el("target").onchange=e=>{design.alignment=design.alignment.filter(a=>a.ring!==selectedRing);if(+e.target.value>=0)design.alignment.push({ring:selectedRing,face:+e.target.value});widget()};
el("text").onchange=e=>{design.rings[selectedRing].faces[selectedFace]={text:e.target.value};widget()};
el("preset").onchange=e=>selectedPreset=e.target.value;
el("one").onclick=()=>{if(!selectedPreset)return status("Choose an engraving set.");const f=FaceSets.get(selectedPreset);if(!f.length)return;design.rings[selectedRing].faces[selectedFace]=copy(f[selectedFace%f.length]);widget()};
el("whole").onclick=()=>{
 if(!selectedPreset)return status("Choose an engraving set.");
 const r=design.rings[selectedRing],f=FaceSets.get(selectedPreset);r.faces=copy(f.slice(0,16));r.start=Math.min(r.start,r.faces.length-1);
 selectedFace=0;design.sequence.forEach(s=>{if(s.ring===selectedRing)s.face=Math.min(s.face,r.faces.length-1)});
 design.alignment.forEach(a=>{if(a.ring===selectedRing)a.face=Math.min(a.face,r.faces.length-1)});widget();
};
el("png").onchange=async e=>{
 const file=e.target.files?.[0];e.target.value="";if(!file)return;if(file.type!=="image/png")return status("Please use PNG.");
 const ring=selectedRing,face=selectedFace;
 try{
  const bitmap=await createImageBitmap(file),scale=Math.min(1,260/Math.max(bitmap.width,bitmap.height)),can=document.createElement("canvas");can.width=Math.max(1,Math.round(bitmap.width*scale));can.height=Math.max(1,Math.round(bitmap.height*scale));
  const g=can.getContext("2d");g.drawImage(bitmap,0,0,can.width,can.height);bitmap.close();
  const img=g.getImageData(0,0,can.width,can.height),a=img.data;let alpha=false;
  for(let k=3;k<a.length;k+=4)if(a[k]<200){alpha=true;break}
  let lx=can.width,ly=can.height,rx=-1,ry=-1;
  for(let k=0;k<a.length;k+=4){const light=.2126*a[k]+.7152*a[k+1]+.0722*a[k+2];if(!alpha)a[k+3]=Math.round(255-light);a[k]=a[k+1]=a[k+2]=18;
   if(a[k+3]>12){const x=(k/4)%can.width,y=Math.floor(k/4/can.width);lx=Math.min(lx,x);ly=Math.min(ly,y);rx=Math.max(rx,x);ry=Math.max(ry,y)}
  }
  if(rx<0)throw Error("No visible silhouette");
  g.putImageData(img,0,0);const cropped=document.createElement("canvas");cropped.width=rx-lx+1;cropped.height=ry-ly+1;cropped.getContext("2d").drawImage(can,-lx,-ly);
  design.rings[ring].faces[face]={text:file.name.replace(/\.png$/i,""),mask:cropped.toDataURL("image/png")};widget();
 }catch(err){status("PNG error: "+err.message)}
};
el("addstep").onclick=()=>{if(design.sequence.length>=20)return;design.sequence.push({ring:selectedRing,direction:design.sequence.length%2?"ccw":"cw",revolutions:1,face:0});widget()};
el("addpair").onclick=()=>{if(design.rings.length<2)return status("Add another ring first.");design.alignmentPairs.push({aRing:0,aFace:0,bRing:1,bFace:0});widget()};
el("reset").onclick=()=>{dial.reset();status("Dial reset.")};
el("save").onclick=()=>{try{
 StoneDial.validate(design);const url=URL.createObjectURL(new Blob([JSON.stringify(design,null,2)],{type:"application/json"})),link=document.createElement("a");
 link.href=url;link.download=(design.name||"Stone_Dial").replace(/[^a-z0-9_-]+/gi,"_")+"_V1.json";link.click();setTimeout(()=>URL.revokeObjectURL(url),2000);status("Design saved.")
 }catch(e){status(e.message)}
};
el("load").onchange=async e=>{try{const f=e.target.files?.[0];if(!f)return;design=StoneDial.validate(JSON.parse(await f.text()));selectedRing=0;selectedFace=0;selectedPreset="";widget();status("Design loaded.")}catch(err){status(err.message)}e.target.value=""};
widget();