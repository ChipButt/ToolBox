/* Standalone Stone Buttons editor and builder registration. */
'use strict';
function editStoneButtons(p){
 let d=structuredClone(p.design),choice=0,stage=0,record=false,palette='Traitors dungeon talismans',preview=null;
 const dlg=element('dialog');dlg.className='faceDialog sb-editor';dlg.style.width='min(780px,95vw)';document.body.append(dlg);
 const fieldIn=(title,node,part)=>field(title,node,part);
 const mkselect=(rows,value,change,part,title)=>fieldIn(title,list(rows,String(value),change),part);
 const mknum=(title,value,min,max,change,part)=>{
   const x=input(value,v=>change(Math.min(max,Math.max(min,Number(v)||0))),'number');x.min=min;x.max=max;return fieldIn(title,x,part);
 };
 const toggle=(title,value,change,part)=>{const c=element('input');c.type='checkbox';c.checked=value;c.onchange=()=>change(c.checked);return fieldIn(title,c,part)};
 const values=(arr)=>arr.map(v=>[String(v),String(v)]);
 function repair(){
   const ids=new Set(d.buttons.map(b=>b.id));
   d.sequence=d.sequence.filter(id=>ids.has(id));
   d.stages=d.stages.map(seq=>seq.filter(id=>ids.has(id)));
   if(!d.stages.length)d.stages=[[d.buttons[0].id]];
   d.counts=Object.fromEntries(d.buttons.map(b=>[b.id,d.counts[b.id]??0]));
   if(!Object.values(d.counts).some(v=>v>0))d.counts[d.buttons[0].id]=1;
   choice=Math.min(choice,d.buttons.length-1);stage=Math.min(stage,d.stages.length-1);
 }
 const change=fn=>{const scroll=dlg.scrollTop;fn();repair();draw();dlg.scrollTop=scroll};
 const set=(key,value)=>change(()=>d[key]=value);
 function face(b,parent,action,number){
   const n=element('button');n.type='button';n.className='sb-config-face';n.title=b.text||'Blank';
   if(b.mask){const img=element('img');img.src=b.mask;img.alt='';n.append(img)}
   else{const label=element('strong',b.text||'✦');n.append(label)}
   n.append(element('small',number||b.text||'Stone'));
   n.onclick=action;parent.append(n);return n;
 }
 function draw(){
   preview?.destroy();preview=null;dlg.replaceChildren(element('h2','Stone Buttons V1 · Carved Push-button Puzzle'));
   const appearance=element('fieldset');appearance.append(element('legend','Physical mechanism'));dlg.append(appearance);
   fieldIn('Puzzle name',input(d.name,v=>d.name=v||'Stone Buttons'),appearance);
   mkselect(values(Array.from({length:11},(_,i)=>i+2)),d.buttons.length,v=>change(()=>{
     const n=+v;while(d.buttons.length<n){const i=d.buttons.length;d.buttons.push({id:crypto.randomUUID(),text:'Button '+(i+1),mask:'',x:20+(i%4)*20,y:25+Math.floor(i/4)*20})}d.buttons.length=n;
   }),appearance,'Number of buttons');
   mkselect([['grid','Grid'],['row','Horizontal row'],['column','Vertical column'],['circle','Circle'],['custom','Custom positions']],d.layout,
     v=>change(()=>{d.layout=v;if(v==='custom')d.buttons.forEach((b,i)=>{b.x??=20+(i%4)*20;b.y??=25+Math.floor(i/4)*20})}),appearance,'Button arrangement');
   if(d.layout==='grid')mkselect(values([1,2,3,4,5,6]),d.columns,v=>set('columns',+v),appearance,'Grid columns');
   mkselect([['round','Round'],['square','Square']],d.shape,v=>set('shape',v),appearance,'Shape');
   const engrave=element('fieldset');engrave.append(element('legend','Carved inscriptions and silhouettes'));dlg.append(engrave);
   mkselect(d.buttons.map((b,i)=>[String(i),String(i+1)+' · '+b.text]),choice,v=>change(()=>choice=+v),engrave,'Edit button');
   const b=d.buttons[choice];
   fieldIn('Carved inscription (leave empty for blank)',input(b.text,v=>b.text=v.slice(0,42)),engrave);
   if(b.mask)button('Remove silhouette (use inscription)',()=>change(()=>b.mask=''),engrave);
   mkselect(FaceSets.names.map(x=>[x,x]),palette,v=>change(()=>palette=v),engrave,'Silhouette library');
   const gallery=element('div');gallery.className='sb-art-gallery';engrave.append(gallery);
   FaceSets.get(palette).slice(0,36).forEach(f=>face(f,gallery,()=>change(()=>{b.text=f.text.slice(0,42);b.mask=f.mask||''}),f.text));
   const upload=element('input');upload.type='file';upload.accept='image/png';fieldIn('Upload silhouette (true-alpha PNG)',upload,engrave);
   upload.onchange=async()=>{
     const file=upload.files?.[0];if(!file)return;
     try{
       if(file.type!=='image/png')throw Error('Use a PNG');
       const im=await createImageBitmap(file),scale=Math.min(1,320/Math.max(im.width,im.height)),c=element('canvas');
       c.width=Math.max(1,Math.round(im.width*scale));c.height=Math.max(1,Math.round(im.height*scale));const g=c.getContext('2d',{willReadFrequently:true});g.drawImage(im,0,0,c.width,c.height);im.close();
       const px=g.getImageData(0,0,c.width,c.height).data;let zero=false,visible=false;
       for(let i=3;i<px.length;i+=4){zero||=px[i]===0;visible||=px[i]>30}
       if(!zero||!visible)throw Error('The image requires real alpha-transparent pixels');
       change(()=>{b.text=file.name.replace(/\.png$/i,'').slice(0,42);b.mask=c.toDataURL('image/png')});
     }catch(e){upload.setCustomValidity(e.message);upload.reportValidity()}
   };
   if(d.layout==='custom'){
     mknum('Horizontal position (%)',b.x??50,8,92,v=>change(()=>b.x=v),engrave);
     mknum('Vertical position (%)',b.y??50,8,92,v=>change(()=>b.y=v),engrave);
   }
   const rules=element('fieldset');rules.append(element('legend','Gameplay and feedback'));dlg.append(rules);
   mkselect([['sequence','Exact sequence'],['counts','Press counts (any order)'],['stages','Multiple stages']],d.mode,v=>set('mode',v),rules,'Puzzle mode');
   mkselect([['reset-stage','Restart stage'],['reset-all','Restart whole combination'],['ignore','Ignore incorrect press']],d.failure,v=>set('failure',v),rules,'Wrong press');
   mkselect([['none','No progress display'],['marks','Carved progress marks'],['latch','Button stays recessed']],d.feedback,v=>set('feedback',v),rules,'Feedback');
   mkselect([['sink','Buttons sink into stone'],['seal','Seal glows subtly'],['none','No animation']],d.success,v=>set('success',v),rules,'Success style');
   toggle('Pressed buttons remain recessed',d.latch,v=>set('latch',v),rules);
   toggle('Allow player reset',d.allowReset,v=>set('allowReset',v),rules);
   toggle('Optional stone clicking sound',d.sound,v=>set('sound',v),rules);
   const timer=element('fieldset');timer.append(element('legend','Optional timing · 0 disables'));dlg.append(timer);
   for(const [key,label] of [['holdMs','Hold each button (ms)'],['maxGapMs','Maximum time between presses (ms)'],['totalMs','Maximum time for combination (ms)']])
     mknum(label,d.timing[key],0,120000,v=>change(()=>d.timing[key]=Math.round(v)),timer);
   const solve=element('fieldset');solve.append(element('legend','Record or edit the correct solution'));dlg.append(solve);
   if(d.mode==='counts'){
     for(const x of d.buttons)mknum(x.text+' required presses',d.counts[x.id],0,30,v=>change(()=>d.counts[x.id]=Math.round(v)),solve);
   }else{
     if(d.mode==='stages'){
       mkselect(d.stages.map((s,i)=>[String(i),'Stage '+(i+1)]),stage,v=>change(()=>stage=+v),solve,'Stage to edit');
       button('Add stage',()=>change(()=>{d.stages.push([d.buttons[0].id]);stage=d.stages.length-1}),solve);
       if(d.stages.length>1)button('Remove stage',()=>change(()=>{d.stages.splice(stage,1);stage=Math.max(0,stage-1)}),solve);
     }
     const steps=d.mode==='sequence'?d.sequence:d.stages[stage];
     const action=element('div');action.className='sb-rec-actions';solve.append(action);
     button(record?'Stop recording':'Record solution',()=>change(()=>record=!record),action);
     button('Clear sequence',()=>change(()=>{steps.splice(0);record=true}),action);
     button('Undo press',()=>change(()=>{if(steps.length)steps.pop()}),action);
     solve.append(element('p',record?'Recording: press the stones below in the exact intended order, including repeats.':'Press “Record solution”, then press the stones in the desired order.'));
     const keyboard=element('div');keyboard.className='sb-art-gallery';solve.append(keyboard);
     d.buttons.forEach((x,i)=>{const n=face(x,keyboard,()=>change(()=>steps.push(x.id)),String(i+1));n.disabled=!record});
     const order=element('div');order.className='sb-steps';solve.append(order);
     steps.forEach((id,i)=>{
       const row=element('div');row.className='sb-step';order.append(row);
       row.append(element('span',String(i+1)+'. '+(d.buttons.find(b=>b.id===id)?.text||id)));
       button('↑',()=>change(()=>{if(i)[steps[i-1],steps[i]]=[steps[i],steps[i-1]]}),row);
       button('↓',()=>change(()=>{if(i<steps.length-1)[steps[i+1],steps[i]]=[steps[i],steps[i+1]]}),row);
       if(steps.length>1)button('×',()=>change(()=>steps.splice(i,1)),row);
     });
   }
   let error='';try{StoneButtons.validate(d)}catch(e){error=e.message}
   const status=element('p',error?'Configuration needs attention: '+error:'Configuration valid. Test before applying.');dlg.append(status);
   if(!error){
     const area=element('fieldset');area.append(element('legend','Live mechanism test'));dlg.append(area);
     const host=element('div');host.className='sb-editor-preview';area.append(host);
     preview=StoneButtons.mount(host,{design:d,onSolved:()=>status.textContent='Test solved correctly.'});
     area.append(element('p','Tap the stone mechanism to open and test it. No player progress is saved to the configuration.'));
   }
   const footer=element('footer');dlg.append(footer);
   button('Cancel',()=>dlg.close(),footer);
   button('Apply to room',()=>{try{StoneButtons.validate(d);p.design=structuredClone(d);dlg.close();render()}catch(e){status.textContent=e.message}},footer).disabled=!!error;
 }
 dlg.onclose=()=>{preview?.destroy();dlg.remove()};draw();dlg.showModal();
}
function inspectStoneButtons(p){
 button('Edit Stone Buttons',()=>editStoneButtons(p));
 const file=element('input');file.type='file';file.accept='.json,application/json';field('Import Stone Buttons JSON',file);
 file.onchange=async()=>{try{const f=file.files?.[0];if(!f)return;p.design=StoneButtons.validate(JSON.parse(await f.text()));render();notify('Stone Buttons design imported.')}catch(e){notify('Invalid Stone Buttons JSON: '+e.message)}};
 button('Save Stone Buttons JSON',()=>{
   try{const d=StoneButtons.validate(p.design),url=URL.createObjectURL(new Blob([JSON.stringify(d,null,2)],{type:'application/json'}));
     const a=element('a');a.href=url;a.download='Stone_Buttons_V1.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
   }catch(e){notify(e.message)}
 });
}
registerPuzzleType({
 id:'stone-buttons',label:'Stone Buttons',
 create:()=>({id:crypto.randomUUID(),type:'stone-buttons',name:'Stone Buttons '+(room.puzzles.length+1),x:50,y:50,size:27,design:StoneButtons.defaultDesign(),requires:'',message:'',finish:false}),
 mount:(target,p,onSolved,editable)=>StoneButtons.mount(target,{design:p.design,onSolved,editable}),
 inspect:inspectStoneButtons,
 ratio:p=>p.design?.layout==='column'?1.25:p.design?.layout==='row'?.44:(1/1.36),
 validate:p=>{StoneButtons.validate(p.design)}
});
