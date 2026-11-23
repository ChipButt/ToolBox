/* Escape Door. An arched stone slab retracts into the surrounding masonry. */
(()=>{
  'use strict';
  const W=420,H=594,cx=210,cy=208,inside=151,outside=199,sill=569;
  const textureURL=new URL('../stone-dial/art/surround-limestone.jpg',document.currentScript.src);
  const passageURL=new URL('passage.jpg',document.currentScript.src);
  const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
  const canvas=(w=W,h=H)=>Object.assign(document.createElement('canvas'),{width:w,height:h});
  const make=(tag,cls)=>Object.assign(document.createElement(tag),{className:cls});
  const style=document.createElement('style');
  style.textContent=`
  .ed-door{display:block;position:relative;width:100%;aspect-ratio:420/594;padding:0;border:0;background:transparent;isolation:isolate;perspective:1600px;cursor:pointer;filter:drop-shadow(2px 4px 3px #100d0b88)}
  .ed-door canvas{display:block;position:absolute;top:0;height:100%;pointer-events:none}
  .ed-door .ed-full{left:0;width:100%}
  .ed-door:not(.ed-ready){cursor:default}.ed-door:focus-visible{outline:2px solid #e7ceb2;outline-offset:3px}

  `;document.head.append(style);
  let surfaces;
  async function bake(){
    const img=new Image();img.src=textureURL;
    const corridor=new Image();corridor.src=passageURL;await Promise.all([img.decode(),corridor.decode()]);
    const stock=canvas(512,768),sg=stock.getContext('2d',{willReadFrequently:true});sg.drawImage(img,0,0,512,768);
    const grain=sg.getImageData(0,0,512,768).data;
    function surface(kind){
      const image=canvas(),ctx=image.getContext('2d'),pixels=ctx.createImageData(W,H),dst=pixels.data;
      for(let y=0;y<H;y++)for(let x=0;x<W;x++){
        const dx=x-cx,dy=Math.min(0,y-cy),r=Math.hypot(dx,dy),ang=Math.atan2(dy,dx),j=(y*W+x)*4;
        let edge,light,seed,tone;
        const wear=.95*Math.sin(x*.081+y*.17)+.52*Math.sin(y*.53-x*.41);
        if(kind==='frame'){
          const threshold=y>=sill&&y<H-6&&Math.abs(dx)<outside+2;
          if(threshold){edge=Math.min(y-sill,H-6-y,outside+2-Math.abs(dx));seed=4;light=.78+.32*Math.exp(-Math.abs(y-sill-3)/2)}
          else{
            edge=Math.min(r-inside,outside-r,sill-y)+wear;
            if(edge<=0)continue;
            let joint;
            if(y<cy){
              const angle=(ang+Math.PI)/Math.PI*11;
              seed=Math.floor(angle);joint=Math.abs(angle-Math.round(angle))*Math.PI*r/11;
            }else{
              const course=(y-cy)/60;seed=Math.floor(course)+(dx<0?12:22);joint=Math.abs(course-Math.round(course))*60;
            }
            edge=Math.min(edge,joint-.65+wear*.4);
            const lip=Math.exp(-Math.abs(r-inside-8)/1.55);
            light=.99+(.30*Math.cos(ang+2.2)-.13)*Math.exp(-Math.max(edge,0)/5)-lip*.22;
          }
          tone=[1.02,.99,.94];
        }else{
          edge=Math.min(inside+2-r,sill-y)-.35+wear*.22;if(edge<0)continue;
          seed=33;
          // A bead-and-reel band follows the crown and continues down both jambs.
          const margin=Math.min(inside-r,sill-y)+wear*.42;
          const groove=d=>Math.exp(-Math.abs(d)/1.45);
          light=.84+.14*(1-x/W);
          for(const rail of [9,15,36,41]){
            light+=.13*groove(margin-rail-2.2)-.27*groove(margin-rail);
          }
          const arcLength=y<cy?(ang+Math.PI/2)*126:Math.sign(dx)*(Math.PI*63+y-cy);
          const along=y>sill-36&&Math.abs(dx)<inside-36?dx:arcLength;
          const bead=Math.hypot(Math.sin(along*Math.PI/24)*10,(margin-25)/.85);
          light+=.15*groove(bead-5.8)-.28*groove(bead-7.7);
          tone=[.97,.94,.91];
        }
        if(edge < -1&&kind==='frame'&&(r<inside-1||r>outside+1||y>=sill))continue;
        const k=4*((Math.floor(x*.95+seed*73)%512)+512*(Math.floor(y*.95+seed*97)%768));
        light*=.52+.48*(1-Math.exp(-Math.max(0,edge)/2.4));
        for(let i=0;i<3;i++)dst[j+i]=grain[k+i]*light*tone[i];
        dst[j+3]=kind==='frame'&&r>=inside+2&&r<=outside-2&&y<sill?255:255*clamp(edge+1,0,1);
      }
      ctx.putImageData(pixels,0,0);return image;
    }
    function arch(g,x,y,r,bottom){g.beginPath();g.moveTo(x-r,bottom);g.lineTo(x-r,y);g.arc(x,y,r,Math.PI,2*Math.PI);g.lineTo(x+r,bottom);g.closePath()}
    const hall=canvas(),g=hall.getContext('2d');
    arch(g,cx,cy,inside+3,sill+2);g.clip();g.fillStyle='#181713';g.fillRect(0,0,W,H);
    const dw=2*(inside+3),dh=sill-(cy-inside)+4;
    const scale=Math.max(dw/corridor.naturalWidth,dh/corridor.naturalHeight);
    g.drawImage(corridor,cx-corridor.naturalWidth*scale/2,cy-inside-2,corridor.naturalWidth*scale,corridor.naturalHeight*scale);
    const shade=g.createLinearGradient(cx-inside,0,cx+inside,0);
    shade.addColorStop(0,'rgba(18,14,11,.6)');shade.addColorStop(.18,'rgba(18,14,11,.1)');shade.addColorStop(.75,'rgba(18,14,11,.06)');shade.addColorStop(1,'rgba(18,14,11,.64)');
    g.fillStyle=shade;g.fillRect(0,0,W,H);
    const stone=surface('stone');
    const edge=canvas(),eg=edge.getContext('2d');
    eg.drawImage(stone,0,0);eg.globalCompositeOperation='source-atop';
    eg.fillStyle='rgba(34,24,16,.55)';eg.fillRect(0,0,W,H);
    return {hall,stone,edge,frame:surface('frame')};
  }
  const symbols=()=>window.FaceSets?.get('Traitors dungeon talismans')||[];
  async function engrave(art,design){
    if(!design.upper&&!design.lower)return art;
    const stone=canvas(),g=stone.getContext('2d');
    g.drawImage(art.stone,0,0);
    const options=symbols();
    for(const [name,y] of [[design.upper,236],[design.lower,415]]){
      const symbol=options.find(face=>face.text===name);
      if(!symbol)continue;
      const img=new Image();img.src=symbol.mask;await img.decode();
      const size=112,scale=size/Math.max(img.width,img.height);
      const mask=canvas(size,size),m=mask.getContext('2d');
      m.drawImage(img,(size-img.width*scale)/2,(size-img.height*scale)/2,img.width*scale,img.height*scale);
      const alpha=m.getImageData(0,0,size,size).data;
      const x=cx-size/2,top=y-size/2,patch=g.getImageData(x,top,size,size);
      const coverage=(i,j)=>i<0||j<0||i>=size||j>=size?0:alpha[(j*size+i)*4+3]/255;
      for(let j=0;j<size;j++)for(let i=0;i<size;i++){
        const depth=coverage(i,j),bevel=coverage(i-2,j-2)-coverage(i+2,j+2);
        const shade=1-.36*depth+.26*bevel,index=4*(j*size+i);
        for(let channel=0;channel<3;channel++)patch.data[index+channel]*=shade;
      }
      g.putImageData(patch,x,top);
    }
    return {...art,stone};
  }
  function renderDoor(ctx,art,progress,direction){
    ctx.clearRect(0,0,W,H);ctx.drawImage(art.hall,0,0);
    ctx.save();ctx.beginPath();ctx.moveTo(cx-inside-2,sill+1);
    ctx.lineTo(cx-inside-2,cy);ctx.arc(cx,cy,inside+2,Math.PI,2*Math.PI);
    ctx.lineTo(cx+inside+2,sill+1);ctx.closePath();ctx.clip();
    const t=clamp((progress-.12)/.88,0,1),travel=t*t*(3-2*t);
    const lift=direction==='up',sign=direction==='left'?-1:1;
    const shake=Math.min(progress*18,1)*(1-progress);
    const x=(lift?0:sign*(2*inside+24)*travel)+Math.sin(progress*83)*1.8*shake;
    const y=(lift?-(sill-cy+inside+24)*travel:0)+Math.sin(progress*109)*1.3*shake;
    for(let depth=10;depth>0;depth-=2){
      ctx.drawImage(art.edge,x-(lift?0:sign*depth),y+(lift?depth:0));
    }
    ctx.drawImage(art.stone,x,y);ctx.restore();ctx.drawImage(art.frame,0,0);
  }
  function mount(target,p,onSolved,editing){
    const door=make('button','ed-door');door.type='button';target.append(door);
    const c=canvas();c.className='ed-full';door.append(c);const ctx=c.getContext('2d');
    let ready=false,opened=false,disposed=false,raf,art,progress=0;
    const artworkReady=(surfaces??=bake()).then(result=>engrave(result,p.design)).then(result=>{if(!disposed){art=result;renderDoor(ctx,art,progress,p.design.direction)}})
      .catch(()=>{surfaces=null;door.textContent=p.name;return false});
    function open(){
      if(editing||!ready||opened||disposed)return;opened=true;door.classList.add('ed-open');door.setAttribute('aria-label',p.name+' open');
      const start=performance.now(),duration=matchMedia('(prefers-reduced-motion: reduce)').matches?0:2450;
      function step(now){
        if(disposed)return;
        progress=duration?clamp((now-start)/duration,0,1):1;
        if(art)renderDoor(ctx,art,progress,p.design.direction);
        if(progress<1)raf=requestAnimationFrame(step);else onSolved();
      }
      raf=requestAnimationFrame(step);
    }
    door.onclick=open;door.setAttribute('aria-label',p.name);
    return {artworkReady,setUnlocked(value){
      const unlockedNow=value&&!ready;ready=value;door.classList.toggle('ed-ready',value);
      if(opened)return;door.setAttribute('aria-disabled',String(!value));door.setAttribute('aria-label',p.name+(ready?' — open':' — locked'));
      if(unlockedNow&&p.requires&&p.design.opening==='auto')open();
    },close(){},destroy(){disposed=true;cancelAnimationFrame(raf);door.remove()}};
  }
  registerPuzzleType({id:'escape-door',label:'Escape Door',
    create(){const previous=room.puzzles.filter(q=>q.type!=='escape-door').at(-1);
      return {id:crypto.randomUUID(),type:'escape-door',name:'Escape Door',x:50,y:50,size:21,requires:previous?.id||'',message:'You escaped.',finish:true,design:{version:1,opening:'auto',direction:'right'}}},
    ratio:()=>H/W,mount,
    validate(p){if(p.design?.version!==1||!['auto','tap'].includes(p.design.opening))throw Error('Invalid escape door design')},
    inspect(p){field('When the linked puzzle is solved',list([['auto','Open automatically'],['tap','Unlock for the player to open']],p.design.opening,v=>p.design.opening=v));
      field('Slide direction',list([['left','Left'],['right','Right'],['up','Up']],p.design.direction||'right',v=>p.design.direction=v));
      const options=[['','None'],...symbols().map(face=>[face.text,face.text])];
      for(const [key,label] of [['upper','Upper engraving'],['lower','Lower engraving']]){
        field(label,list(options,p.design[key]||'',value=>{p.design[key]=value;render()}));
      }
      if(!p.requires)inspector.append(element('p','Choose a puzzle below to lock this door. An unlinked door opens when tapped.'))}
  });
})();
