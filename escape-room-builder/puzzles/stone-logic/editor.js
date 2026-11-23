'use strict';
function editStoneLogic(p){
  let d=structuredClone(p.design);d.fixed=StoneLogic.fixedPositions(d); const dlg=element('dialog');dlg.className='faceDialog';document.body.append(dlg);
  let category=0,tile=0;
  const options=arr=>arr.map((v,i)=>[String(i),v]);
  const all=()=>StoneLogic.items(d).map(t=>[t.id,t.name+' · '+d.categories.find(c=>c.items.includes(t)).name]);
  function resize(n,count){
    d.n=n;
    while(d.categories.length<count)d.categories.push({name:'Category '+(d.categories.length+1),items:[]});
    d.categories.length=count;
    for(const [i,c] of d.categories.entries()){
      while(c.items.length<n)c.items.push({id:crypto.randomUUID(),name:StoneLogic.themes[d.set]?.groups[i][c.items.length+1]||'Tile '+(c.items.length+1)});
      c.items.length=n;const ids=c.items.map(t=>t.id);
      for(const grid of [d.start,d.solution]){
        const kept=(grid[i]||[]).filter(id=>ids.includes(id));
        for(const id of ids.filter(id=>!kept.includes(id)))kept.splice(Math.floor(Math.random()*(kept.length+1)),0,id);
        grid[i]=kept;grid.length=count;
      }
    }
    const ids=all().map(([id])=>id);
    if(d.set){
      d.locations.length=Math.min(n,d.locations.length);
      while(d.locations.length<n)d.locations.push(StoneLogic.themes[d.set].sites[d.locations.length]);
    }
    d.fixed=Array.from({length:count},(_,r)=>Array.from({length:n},(_,col)=>d.fixed?.[r]?.[col]===true));
    StoneLogic.generate(d);
    if(!ids.includes(d.target))d.target='';category=Math.min(category,count-1);tile=Math.min(tile,n-1);draw();
  }
  function draw(){
    dlg.replaceChildren(element('h2','Stone Logic V3 · Physical Tablets'));
    const sets=Object.keys(StoneLogic.themes).map(name=>[name,name]);
    if(!d.set)sets.unshift(['','Custom']);
    field('Story set',list(sets,d.set||'',v=>{d=StoneLogic.themed(v,d.n);category=tile=0;draw()}),dlg);
    const place=StoneLogic.themes[d.set]?.place||'Chamber';
    field('Number of '+place.toLowerCase()+'s',list([3,4,5,6].map(i=>[i,i]),d.n,v=>resize(+v,d.categories.length)),dlg);
    if(d.set){
      const sites=element('details');sites.append(element('summary',place+' names'));dlg.append(sites);
      d.locations.forEach((name,i)=>field(place+' '+(i+1),input(name,v=>{d.locations[i]=v.trim()||name;draw()}),sites));
    }else field('Categories',list([2,3,4,5,6,7].map(i=>[i,i]),d.categories.length,v=>resize(d.n,+v)),dlg);
    field('Edit category',list(options(d.categories.map(c=>c.name)),category,v=>{category=+v;tile=0;draw()}),dlg);
    const c=d.categories[category],t=c.items[tile];
    field('Category name',input(c.name,v=>{c.name=v.trim()||c.name;draw()}),dlg);
    field('Edit tile',list(options(c.items.map(t=>t.name)),tile,v=>{tile=+v;draw()}),dlg);
    field('Tile inscription or silhouette name',input(t.name,v=>{t.name=v.trim()||t.name;draw()}),dlg);
    if(t.mask){dlg.append(faceTile({text:t.name,mask:t.mask},t.name));button('Use inscription',()=>{delete t.mask;draw()},dlg)}
    const upload=element('input');upload.type='file';upload.accept='image/png';
    field('Upload PNG silhouette',upload,dlg);
    upload.onchange=async()=>{const file=upload.files[0];if(!file)return;try{
      if(file.type!=='image/png')throw Error();
      const im=await createImageBitmap(file),scale=Math.min(1,256/Math.max(im.width,im.height)),canvas=element('canvas');
      canvas.width=Math.max(1,Math.round(im.width*scale));canvas.height=Math.max(1,Math.round(im.height*scale));const ctx=canvas.getContext('2d');ctx.drawImage(im,0,0,canvas.width,canvas.height);im.close();
      const px=ctx.getImageData(0,0,canvas.width,canvas.height).data;
      let clear=false,ink=false;for(let i=3;i<px.length;i+=4){clear ||= px[i]===0;ink ||= px[i]>64}
      if(!clear||!ink)throw Error();t.mask=canvas.toDataURL('image/png');draw();
    }catch{upload.setCustomValidity('Choose a PNG with visible artwork and a transparent background.');upload.reportValidity()}};
    const group=element('fieldset');group.append(element('legend','Solved positions & permanent carvings · '+c.name));dlg.append(group);
    group.append(element('p','Non-fixed tablets start in the stone rack. Tick a chamber to carve its correct tablet into the wall permanently.'));
    const row=d.solution[category];
    row.forEach((id,i)=>{
      field('Correct tablet for '+StoneLogic.location(d,i),list(c.items.map(t=>[t.id,t.name]),id,v=>{
        const j=row.indexOf(v);[row[i],row[j]]=[row[j],row[i]];
        StoneLogic.generate(d);draw();
      }),group);
      const check=element('input');check.type='checkbox';check.checked=d.fixed[category][i];
      check.onchange=()=>{d.fixed[category][i]=check.checked;draw()};
      field('Permanent / immovable tablet at '+StoneLogic.location(d,i),check,group);
    });
    const fixedCount=d.fixed.flat().filter(Boolean).length;
    group.append(element('p',fixedCount+' fixed tablet'+(fixedCount===1?'':'s')+' across the complete board. The remaining tablets sit in the built-in rack.'));
    const inscription=StoneLogic.story(d),summary=element('details');summary.append(element('summary',inscription.title));dlg.append(summary);
    for(const text of inscription.paragraphs)summary.append(element('p',text));
    field('Required answer',list([['','Entire grid'],...all()],d.target,v=>{d.target=v;draw()}),dlg);
    const markers=element('input');markers.type='checkbox';markers.checked=d.markers;markers.onchange=()=>{d.markers=markers.checked};field('Allow chamber checkmarks',markers,dlg);
    const foot=element('footer'),status=element('span');status.setAttribute('role','status');dlg.append(foot);foot.append(status);
    let error;try{error=StoneLogic.validate(d)}catch(e){error=e.message}status.textContent=error||(d.target?'Unique target chamber.':'Exactly one solution.');
    button('Cancel',()=>dlg.close(),foot);
    button('Apply',()=>{p.design=d;dlg.close();render()},foot).disabled=!!error;
  }
  dlg.onclose=()=>dlg.remove();draw();dlg.showModal();
}
function inspectStoneLogic(p){
  button('Edit Stone Logic',()=>editStoneLogic(p));
  const upload=element('input');upload.type='file';upload.accept='.json';field('Import Stone Logic design',upload);
  upload.onchange=async()=>{try{const d=JSON.parse(await upload.files[0].text());const problem=StoneLogic.validate(d);if(problem)throw Error(problem);p.design=d;render()}catch(e){notify(e.message)}};
  button('Save Stone Logic design',()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(p.design,null,2)],{type:'application/json'}));const a=element('a');a.href=url;a.download='Stone_Logic_V3.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)});
}
registerPuzzleType({
  id:'stone-logic',label:'Stone Logic',
  create:()=>({id:crypto.randomUUID(),type:'stone-logic',name:'Stone Logic '+(room.puzzles.length+1),design:StoneLogic.sample(),x:50,y:50,size:38,requires:'',message:'',finish:false}),
  ratio:()=>.83,inspect:inspectStoneLogic,
  mount:(target,p,onSolved)=>StoneLogic.mount(target,{design:p.design,name:p.name,onSolved}),
  validate:p=>{const problem=StoneLogic.validate(p.design);if(problem)throw Error(problem)}
});
