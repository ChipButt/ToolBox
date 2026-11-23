'use strict';
/* Stone Logic V3 – a physical socket-and-tablet mechanism.
   All loose pieces live in a stone storage rack attached to the board.
   Existing V1/V2 designs are read without mutation. */
StoneLogic.mount=function(target,{design:d,name='Stone Logic',onSolved=()=>{}}){
  const make=(tag,cls,text)=>{const n=document.createElement(tag);n.className=cls||'';if(text!==undefined&&text!==null)n.textContent=text;return n};
  const all=StoneLogic.items(d),tiles=new Map(all.map(t=>[t.id,t]));
  const fixed=StoneLogic.fixedPositions(d);
  const rows=d.solution.map((row,r)=>row.map((id,c)=>fixed[r][c]?id:null));
  const inscription=StoneLogic.story(d),placeName=StoneLogic.themes[d.set]?.place||'Chamber';
  const notes=new Set();
  let selected=null,marking=false,finished=false,dialog,grid,drag=null,justDragged=false;
  const preview=make('button','sl-preview');
  preview.type='button';preview.setAttribute('aria-label','Examine '+name);target.append(preview);
  const shelf=d.categories.flatMap((category,r)=>category.items.map(t=>({r,id:t.id,tilt:(Math.random()*8-4).toFixed(1)+'deg'})));
  for(let i=shelf.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));[shelf[i],shelf[j]]=[shelf[j],shelf[i]];
  }
  function place(r,c,id){
    if(finished||fixed[r][c]||!d.categories[r].items.some(t=>t.id===id))return false;
    const previous=rows[r].indexOf(id);
    if(previous===c)return false;
    if(previous>=0)rows[r][previous]=rows[r][c];
    rows[r][c]=id;selected=null;draw();check();return true;
  }
  function returnToRack(r,c){
    if(finished||fixed[r][c]||!rows[r][c])return false;
    rows[r][c]=null;selected=null;draw();return true;
  }
  function startPick(r,id,c=null){
    if(finished||marking)return;
    selected={r,id,c};draw();
  }
  function selectSocket(r,c){
    if(finished)return;
    const key=r+'/'+c;
    if(marking){notes.has(key)?notes.delete(key):notes.add(key);draw();return}
    if(fixed[r][c])return;
    if(rows[r][c]){startPick(r,rows[r][c],c);return}
    if(selected?.r===r)place(r,c,selected.id);
  }
  function piece(r,id,c,interactive){
    const t=tiles.get(id),locked=c!==null&&fixed[r][c];
    const n=make(interactive&&!locked?'button':'span','sl-piece'+(locked?' sl-fixed':' sl-movable'));
    if(n.tagName==='BUTTON')n.type='button';
    if(t.mask){
      const icon=make('i','sl-icon');
      icon.style.maskImage='url("'+t.mask+'")';n.append(icon);
    }else n.append(make('span','sl-engraving',t.name));
    n.title=t.name;
    if(locked){n.setAttribute('aria-label','Permanent carving: '+t.name);return n}
    if(interactive){
      n.setAttribute('aria-label',t.name+', pick up stone tablet');
      n.setAttribute('aria-pressed',String(selected?.id===id&&selected.r===r));
      n.dataset.tile=id;n.dataset.row=r;
      n.onclick=e=>{
        e.stopPropagation();if(justDragged)return;
        if(selected?.id===id&&selected.r===r){selected=null;draw()}
        else startPick(r,id,c);
      };
      n.onpointerdown=e=>{
        if(e.button!==0||!e.isPrimary||finished||marking||drag)return;
        drag={pointer:e.pointerId,r,c,id,x:e.clientX,y:e.clientY,ghost:null};
        try{n.setPointerCapture(e.pointerId)}catch{}
      };
      n.onpointermove=e=>{
        if(!drag||drag.pointer!==e.pointerId)return;
        if(!drag.ghost&&Math.hypot(e.clientX-drag.x,e.clientY-drag.y)>7){
          const ghost=n.cloneNode(true);ghost.classList.add('sl-dragging');
          ghost.style.width=n.getBoundingClientRect().width+'px';
          ghost.style.height=n.getBoundingClientRect().height+'px';
          const css=getComputedStyle(n);
          ghost.style.font=css.font;ghost.style.color=css.color;
          ghost.style.backgroundImage=css.backgroundImage;ghost.style.textShadow=css.textShadow;
          ghost.style.setProperty('--rock',css.getPropertyValue('--rock'));
          dialog.append(ghost);drag.ghost=ghost;n.classList.add('sl-lifted');
          function follow(){
            if(drag?.ghost!==ghost)return;
            const bounds=dialog.getBoundingClientRect();
            const y=drag.y;
            if(y<bounds.top+46)dialog.scrollTop-=9;
            else if(y>Math.min(innerHeight,bounds.bottom)-46)dialog.scrollTop+=9;
            requestAnimationFrame(follow);
          }
          requestAnimationFrame(follow);
        }
        if(drag.ghost){drag.y=e.clientY;drag.ghost.style.left=e.clientX+'px';drag.ghost.style.top=e.clientY+'px';e.preventDefault()}
      };
      const release=e=>{
        if(!drag||drag.pointer!==e.pointerId)return;
        const moved=!!drag.ghost,from=drag;drag=null;
        if(from.ghost)from.ghost.remove();n.classList.remove('sl-lifted');
        if(!moved)return;
        justDragged=true;
        setTimeout(()=>justDragged=false,0);
        const under=document.elementFromPoint(e.clientX,e.clientY);
        const socket=under?.closest('.sl-socket');
        const rack=under?.closest('.sl-storage');
        if(socket){
          const destR=Number(socket.dataset.row),destC=Number(socket.dataset.col);
          if(destR===from.r&&destC===from.c)return;
          if(destR===from.r&&!fixed[destR][destC])place(destR,destC,from.id);
        }else if(rack&&from.c!==null)returnToRack(from.r,from.c);
      };
      n.onpointerup=release;n.onpointercancel=n.onlostpointercapture=e=>{if(drag?.pointer===e.pointerId){drag.ghost?.remove();n.classList.remove('sl-lifted');drag=null}};
    }
    return n;
  }
  function plate(interactive){
    const board=make('div','sl-stone'),left=make('section','sl-left'),right=make('section','sl-tablet');
    board.append(left,right);
    const matrix=make('div','sl-grid');matrix.style.setProperty('--cols',d.n);left.append(matrix);
    matrix.append(make('span','sl-caption',placeName));
    for(let i=0;i<d.n;i++)matrix.append(make('span','sl-number',StoneLogic.location(d,i)));
    rows.forEach((row,r)=>{
      matrix.append(make('span','sl-category',d.categories[r].name));
      row.forEach((id,c)=>{
        const n=make('div','sl-socket'+(fixed[r][c]?' sl-locked':'')+(notes.has(r+'/'+c)?' sl-noted':'')+(selected?.r===r&&!id?' sl-available':''));
        n.dataset.row=r;n.dataset.col=c;
        if(id)n.append(piece(r,id,c,interactive));
        else if(interactive)n.append(make('span','sl-socket-depth',''));
        if(interactive){
          n.setAttribute('role','button');n.tabIndex=0;
          n.setAttribute('aria-label',d.categories[r].name+' in '+StoneLogic.location(d,c)+': '+(id?tiles.get(id).name:'empty socket')+(fixed[r][c]?', permanently fixed':''));
          n.onclick=()=>selectSocket(r,c);
          n.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();selectSocket(r,c)}};
        }
        matrix.append(n);
      });
    });
    const rack=make('section','sl-storage');
    rack.setAttribute('aria-label','Stone shelf');
    for(const {r,id,tilt} of shelf){
      if(rows[r].includes(id))continue;
      const tile=piece(r,id,null,interactive);tile.style.setProperty('--tilt',tilt);rack.append(tile);
    }
    if(interactive){
      rack.tabIndex=0;
      const putBack=()=>{if(selected?.c!=null)returnToRack(selected.r,selected.c)};
      rack.onclick=e=>{if(e.target===rack)putBack()};
      rack.onkeydown=e=>{if(e.target===rack&&(e.key===' '||e.key==='Enter')){e.preventDefault();putBack()}};
    }
    left.append(rack);
    right.append(make('h2','sl-title',inscription.title));
    for(const paragraph of inscription.paragraphs)right.append(make('p','sl-passage',paragraph));
    return board;
  }
  function draw(){if(grid)grid.replaceChildren(plate(true))}
  function refresh(){preview.replaceChildren(plate(false))}
  function check(){
    if(!finished&&StoneLogic.complete(d,rows)){
      finished=true;selected=null;
      if(grid){grid.classList.add('sl-complete');draw()}
      onSolved();
    }
  }
  function open(){
    if(dialog?.open)return;
    dialog=make('dialog','sl-dialog');dialog.setAttribute('aria-label',name);
    const back=make('button','sl-back','Back to Room');back.type='button';back.onclick=()=>dialog.close();
    grid=make('div','sl-stage');dialog.append(back,grid);
    if(d.markers){
      const mark=make('button','sl-mark','Mark empty sockets');mark.type='button';mark.setAttribute('aria-pressed',String(marking));
      mark.onclick=()=>{marking=!marking;selected=null;mark.setAttribute('aria-pressed',String(marking));draw()};dialog.append(mark);
    }
    document.body.append(dialog);
    const opened=dialog;
    dialog.onclose=()=>{drag?.ghost?.remove();drag=null;opened.remove();if(dialog===opened){selected=null;dialog=null;grid=null;refresh()}};
    draw();dialog.showModal();check();
  }
  function close(){if(dialog?.open)dialog.close()}
  refresh();preview.onclick=open;
  return {open,close,getState(){return {rows:structuredClone(rows),fixed:structuredClone(fixed),solved:finished}},destroy(){if(dialog){dialog.onclose=null;dialog.remove()}if(drag?.ghost)drag.ghost.remove();preview.remove()}};
};

